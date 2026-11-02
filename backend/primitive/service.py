"""
Tasks on the node.

  <state>/primitive/tasks/<id>/task.json     settings, status and the trie snapshot (atomic rewrite)
  <state>/primitive/tasks/<id>/record.jsonl  every act, appended as it happens
  <state>/primitive/pool.json                optional: replace the pool per specialty

A task runs in the background, one act at a time, saving after each, so the console can
watch the trie grow over SSE. Its status, as the harness's exit codes:
answered (the root converged), declined (the root contested), out of budget, or failed
(setup). A task found `running` at startup was cut off by a restart and is marked
`interrupted`; nothing is resumed silently.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from backend.keeper.service import state_dir
from backend.primitive.engine import Engine
from backend.primitive.providers import Providers, load_override
from backend.primitive.route import Pool, RoutedProposer
from backend.primitive.trie import Record

log = logging.getLogger("primitive")

DEFAULTS = {"depth": 1, "attempts": 3, "budget": 40, "crowd": 2}
LIMITS = {"depth": (0, 3), "attempts": (1, 5), "budget": (1, 120), "crowd": (1, 4)}


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


class TaskService:
    def __init__(self, providers: Optional[Providers] = None, root: Optional[Path] = None):
        self.providers = providers or Providers()
        self._root = root
        self.version = 0
        self._cond = asyncio.Condition()
        self.tasks: Dict[str, dict] = {}
        self._load()

    @property
    def root(self) -> Path:
        d = self._root or state_dir() / "primitive"
        (d / "tasks").mkdir(parents=True, exist_ok=True)
        return d

    def _load(self) -> None:
        for p in sorted((self.root / "tasks").glob("*/task.json"))[-200:]:
            try:
                t = json.loads(p.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if t.get("status") == "running":
                t["status"], t["note"] = "interrupted", "the node restarted while this task ran"
                self._save(t)
            self.tasks[t["id"]] = t

    def _save(self, t: dict) -> None:
        d = self.root / "tasks" / t["id"]
        d.mkdir(parents=True, exist_ok=True)
        tmp = d / ".task.json.tmp"
        tmp.write_text(json.dumps(t, ensure_ascii=False), encoding="utf-8")
        tmp.replace(d / "task.json")

    async def _changed(self, t: dict) -> None:
        t["updated"] = _now()
        self._save(t)
        self.version += 1
        async with self._cond:
            self._cond.notify_all()

    async def wait_change(self, seen: int, timeout: float) -> None:
        async with self._cond:
            try:
                await asyncio.wait_for(self._cond.wait_for(lambda: self.version != seen), timeout)
            except asyncio.TimeoutError:
                pass

    # ----------------------------------------------------------------- models

    async def models(self) -> dict:
        pool, live, st, local = await self.providers.pool(load_override(self.root / "pool.json"))
        servable = (lambda m: live is None or m in live)
        return {
            "providers": {pid: {k: v for k, v in s.items() if k != "catalog"} for pid, s in st.items()},
            "pool": {s: [{"id": m, "served": servable(m)} for m in pool.list(s)]
                     for s in ("code", "reasoning", "general", "verify")},
            "local": local,
            "defaults": DEFAULTS,
        }

    # ----------------------------------------------------------------- tasks

    def start(self, text: str, *, model: Optional[str] = None, **opts) -> dict:
        settings = dict(DEFAULTS)
        for k, (lo, hi) in LIMITS.items():
            if opts.get(k) is not None:
                settings[k] = max(lo, min(hi, int(opts[k])))
        tid = datetime.now().strftime("%Y%m%d-%H%M%S-") + secrets.token_hex(3)
        t = {"id": tid, "task": text, "model": model, "settings": settings, "status": "running",
             "created": _now(), "updated": _now(), "note": "", "trie": None, "usage": [], "route": ""}
        self.tasks[tid] = t
        self._save(t)
        asyncio.get_running_loop().create_task(self._run(t))
        return t

    async def _run(self, t: dict) -> None:
        s = t["settings"]
        try:
            pool, live, st, local = await self.providers.pool(load_override(self.root / "pool.json"))
            if t["model"]:
                pool, live = Pool.single(t["model"]), None
            if not pool.models() and not local:
                raise RuntimeError("no provider is usable: " + "; ".join(
                    f"{pid} ({v['why']})" for pid, v in st.items() if not v["available"]))
            proposer = RoutedProposer(pool, self.providers, crowd=s["crowd"], live=live, local=local,
                                      blocked=self.providers.refused())
            record = Record(self.root / "tasks" / t["id"] / "record.jsonl")
            engine = Engine(t["task"], proposer, max_depth=s["depth"], max_attempts=s["attempts"], record=record)

            async def on_act():
                t["trie"], t["route"], t["usage"] = engine.snapshot(), proposer.name(), proposer.usage_lines()
                await self._changed(t)

            await on_act()
            try:
                await engine.step(s["budget"], on_act)
            finally:
                self.providers.remember_refusals(proposer.blocked)
            t["trie"], t["usage"] = engine.snapshot(), proposer.usage_lines()
            t["text"] = engine.render()
            o = engine.root.outcome
            t["status"] = ("out of budget" if o is None else "answered" if o.kind == "convergent" else "declined")
            if proposer.blocked:
                t["note"] = "; ".join(f"{p} refused the account: {why}" for p, why in proposer.blocked.items())
        except Exception as e:                       # setup errors end the task, never the node
            log.warning("primitive task %s failed: %s", t["id"], e)
            t["status"], t["note"] = "failed", str(e)[:400]
        await self._changed(t)

    def get(self, tid: str) -> Optional[dict]:
        return self.tasks.get(tid)

    def recent(self, limit: int = 50) -> List[dict]:
        ts = sorted(self.tasks.values(), key=lambda t: t["created"], reverse=True)[:limit]
        return [{k: t.get(k) for k in ("id", "task", "status", "created", "updated", "model")}
                | {"outcome": (t.get("trie") or {}).get("outcome")} for t in ts]


_SERVICE: Optional[TaskService] = None


def service() -> TaskService:
    global _SERVICE
    if _SERVICE is None:
        _SERVICE = TaskService()
    return _SERVICE
