"""
Reading tasks: a witnessed knowledge graph (okgg, conspirator/okgg) over chosen repos, with
exact references (repo / path / line of every cue) and progress through the sections.

The repos are tracked by the repo pass (backend/repos: clone, pull, bloodhound `tracker
drift`); a task's graph is rebuilt when its repos have moved. See store.py, runner.py, index.py.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

log = logging.getLogger("reading")

CADENCE = 3600


async def _loop() -> None:
    from backend.reading import runner, store
    await asyncio.sleep(300)
    while True:
        for t in store.tasks():
            try:
                state = (t.get("run") or {}).get("state")
                if state in ("queued", "running"):
                    continue
                if state != "done":
                    continue
                await asyncio.to_thread(runner.ensure_tracked, t["repos"])     # pull + tracker drift
                if await asyncio.to_thread(runner.stale, t):
                    await asyncio.to_thread(runner.run, t["id"])
            except Exception:
                log.exception("reading: refresh of %s failed", t.get("id"))
        await asyncio.sleep(CADENCE)


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("READING_SCHEDULER", "1") == "0":
        return None
    return asyncio.create_task(_loop(), name="reading")
