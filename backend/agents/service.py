"""
The run store and live version.

  <state>/agents/runs/<id>.json   one file per run (graph, answer, subtasks), rewritten as it moves

Finished runs are also sent to chigutiro as prose (source "agent-runs"), so the personal
memory holds what was asked and answered. A daily digest run ("what moved today") starts
itself in the evening — the holistic view across mail, plans and repos.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx

from backend.agents.runner import Run, execute
from backend.keeper.service import state_dir

log = logging.getLogger("agents")
TZ = ZoneInfo("Europe/Berlin")
DIGEST_HOUR = int(os.getenv("AGENT_DIGEST_HOUR", "20"))
DIGEST_TEXT = ("What moved today? Summarise, as one short briefing: the mail that arrived and what it asks of "
               "me, how my plan went and what is at risk, and what changed in my active repositories.")


class AgentService:
    def __init__(self):
        self.version = 0
        self._cond = asyncio.Condition()
        self.runs: Dict[str, Run] = {}
        self._load()

    @property
    def dir(self) -> Path:
        d = state_dir() / "agents" / "runs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _load(self) -> None:
        for p in sorted(self.dir.glob("*.json"))[-200:]:
            try:
                r = Run.from_json(json.loads(p.read_text(encoding="utf-8")))
                self.runs[r.id] = r
            except (OSError, ValueError, KeyError):
                continue

    def _save(self, run: Run) -> None:
        tmp = self.dir / f".{run.id}.tmp"
        tmp.write_text(json.dumps(run.to_json()), encoding="utf-8")
        tmp.replace(self.dir / f"{run.id}.json")

    def _changed(self, run: Run):
        def fn():
            run.updated = datetime.now().astimezone().isoformat(timespec="seconds")
            self._save(run)
            self.version += 1
            asyncio.get_running_loop().create_task(self._notify())
        return fn

    async def _notify(self) -> None:
        async with self._cond:
            self._cond.notify_all()

    async def wait_change(self, seen: int, timeout: float) -> None:
        async with self._cond:
            try:
                await asyncio.wait_for(self._cond.wait_for(lambda: self.version != seen), timeout)
            except asyncio.TimeoutError:
                pass

    def start(self, text: str, origin: str = "command", direct: Optional[dict] = None) -> Run:
        run = Run(text, origin, direct)
        self.runs[run.id] = run
        changed = self._changed(run)
        changed()

        async def go():
            await execute(run, changed)
            await self._remember(run)
        asyncio.get_running_loop().create_task(go())
        return run

    async def _remember(self, run: Run) -> None:
        """Finished runs join chigutiro's memory (what was asked, what came back)."""
        if run.status != "done" or not run.answer:
            return
        try:
            from backend.mail import memory
            from backend.mail.service import MAIL
            if not memory.configured(MAIL.env):
                return
            async with httpx.AsyncClient() as c:
                await memory.ingest(c, MAIL.env, [{
                    "kind": "prose", "id": run.id, "source": "agent-runs", "ts": run.created,
                    "title": run.text[:200], "text": f"{run.text}\n\n{run.answer}", "authored_by_owner": False,
                    "tags": ["agent-run", run.origin]}])
        except Exception as e:
            log.info("agents: memory ingest skipped (%s)", type(e).__name__)

    def recent(self, limit: int = 50) -> List[dict]:
        rs = sorted(self.runs.values(), key=lambda r: r.created, reverse=True)[:limit]
        return [r.to_json(full=False) for r in rs]

    def get(self, rid: str) -> Optional[Run]:
        return self.runs.get(rid)

    async def digest_loop(self) -> None:
        while True:
            now = datetime.now(TZ)
            done_today = any(r.origin == "digest" and datetime.fromisoformat(r.created).astimezone(TZ).date() == now.date()
                             for r in self.runs.values())
            if now.hour >= DIGEST_HOUR and not done_today:
                self.start(DIGEST_TEXT, origin="digest")
            await asyncio.sleep(600)


AGENTS = AgentService()


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("AGENTS_SCHEDULER", "1") == "0":
        return None
    return asyncio.create_task(AGENTS.digest_loop(), name="agents-digest")
