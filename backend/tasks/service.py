"""
Tasks on the node.

  <state>/tasks/<id>/task.json   the task, its steps, graph, forms, files and report (atomic rewrite)
  <state>/tasks/<id>/files/      what the agent saved: attachments, downloaded PDFs

A task runs in the background and is saved after every tool call, so the console can draw
it as it grows. One found `running` at startup was cut off by a restart: it is marked
`interrupted` and its forms and files stay.
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
from backend.tasks.agent import run_agent
from backend.tasks.tools import Run

log = logging.getLogger("tasks")


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


class TaskService:
    def __init__(self, providers=None, root: Optional[Path] = None):
        self._providers = providers
        self._root = root
        self.version = 0
        self._cond = asyncio.Condition()
        self.tasks: Dict[str, dict] = {}
        self._load()

    @property
    def providers(self):
        if self._providers is None:
            from backend.primitive.service import service as primitive
            self._providers = primitive().providers
        return self._providers

    @property
    def root(self) -> Path:
        d = self._root or state_dir() / "tasks"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _load(self) -> None:
        for p in sorted(self.root.glob("*/task.json"))[-200:]:
            try:
                t = json.loads(p.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if t.get("status") == "running":
                t["status"], t["note"] = "interrupted", "the node restarted while this task ran"
                self._save(t)
            self.tasks[t["id"]] = t

    def _save(self, t: dict) -> None:
        d = self.root / t["id"]
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

    def start(self, text: str, model: Optional[str] = None) -> dict:
        tid = datetime.now().strftime("%Y%m%d-%H%M%S-") + secrets.token_hex(3)
        t = {"id": tid, "text": text, "model": model, "status": "running", "created": _now(), "updated": _now(),
             "note": "", "steps": [], "graph": {"nodes": [], "links": []}, "forms": [], "files": [], "answer": ""}
        self.tasks[tid] = t
        self._save(t)
        asyncio.get_running_loop().create_task(self._run(t))
        return t

    def _messages_path(self, tid: str) -> Path:
        return self.root / tid / "messages.json"         # kept apart: the console never needs it

    async def _run(self, t: dict, messages: Optional[list] = None) -> None:
        run = Run(task=t, dir=self.root / t["id"], cloud=True)
        run.restore_files()
        try:
            messages = await run_agent(t, run, self.providers, lambda: self._changed(t), messages=messages)
            t["status"] = "done"
            tmp = self.root / t["id"] / ".messages.json.tmp"
            tmp.write_text(json.dumps(messages, ensure_ascii=False), encoding="utf-8")
            tmp.replace(self._messages_path(t["id"]))
        except Exception as e:
            log.warning("task %s failed: %s", t["id"], e)
            t["status"], t["note"] = "failed", str(e)[:500]
        await self._changed(t)

    def resume(self, tid: str, text: str = "") -> dict:
        """Go on with a task from its conversation so far, with an optional new instruction."""
        t = self.tasks.get(tid)
        if t is None:
            raise KeyError(tid)
        if t["status"] == "running":
            return t
        try:
            messages = json.loads(self._messages_path(tid).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            messages = None                              # an older task: start over, files kept
        hint = text.strip() or "Continue the task from where you stopped; do not repeat what is done."
        if messages is not None:
            messages.append({"role": "user", "content": hint})
        else:
            t["text"] = f"{t['text']}\n\n{hint}"
        t.update(status="running", note="", answer="", stopped=False)
        self._save(t)
        asyncio.get_running_loop().create_task(self._run(t, messages))
        return t

    def get(self, tid: str) -> Optional[dict]:
        return self.tasks.get(tid)

    def recent(self, limit: int = 30) -> List[dict]:
        ts = sorted(self.tasks.values(), key=lambda t: t["created"], reverse=True)[:limit]
        return [{k: t.get(k) for k in ("id", "text", "status", "created", "updated", "ran_on")}
                | {"forms": len(t.get("forms") or []), "steps": len(t.get("steps") or [])} for t in ts]


_SERVICE: Optional[TaskService] = None


def service() -> TaskService:
    global _SERVICE
    if _SERVICE is None:
        _SERVICE = TaskService()
    return _SERVICE
