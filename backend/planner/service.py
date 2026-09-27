"""
Planner service — keeps one current plan and re-derives it whenever anything changes.

Triggers: new mail extraction (mail service listener), a pin / unpin / done / settings
change, and a 15-minute cadence (which also rolls the horizon past midnight). Bursts are
debounced for a few seconds so ten extractions in a row cost one re-plan.

State in <state>/planner/:
  settings.json  knobs (settings.py)
  plan.json      the last plan (blocks, at-risk, per-day water-filling report)
  pins.json      blocks he placed or moved — the solver treats them as immovable
  done.json      {block_id: {task, minutes}} — work he marked done

"Missed" is not stored anywhere: a task block that ended without being marked done simply
doesn't count toward the task, so the next plan re-flows the remainder.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time as _time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx

from backend import google_oauth
from backend.keeper.service import state_dir
from backend.planner import gcal, settings as settings_mod, solver, sources
from backend.planner.model import Block
from backend.plans import model as plans_model
from backend.plans.store import PLANS

log = logging.getLogger("planner")

CADENCE = 15 * 60
DEBOUNCE = 4
GCAL_BUSY_TTL = 10 * 60
HISTORY_DAYS = 2


class PlannerService:
    def __init__(self, directory: Path, env=None):
        self.dir = directory
        self.dir.mkdir(parents=True, exist_ok=True)
        self.env = env if env is not None else os.environ
        self.version = 0
        self._cond = asyncio.Condition()
        self._wake = asyncio.Event()
        self.plan: dict = self._read("plan.json", {"blocks": [], "at_risk": [], "days": []})
        self.error = ""
        self.gcal_status: dict = {"enabled": False}
        self._busy: List[Block] = []
        self._busy_at = 0.0

    # ------------------------------------------------------------- files

    def _read(self, name: str, default):
        try:
            return json.loads((self.dir / name).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return default

    def _write(self, name: str, data) -> None:
        tmp = self.dir / f".{name}.tmp"
        tmp.write_text(json.dumps(data, indent=1), encoding="utf-8")
        os.replace(tmp, self.dir / name)

    @property
    def settings(self) -> dict:
        return settings_mod.load(self.dir / "settings.json")

    def save_settings(self, s: dict) -> dict:
        s = settings_mod.save(self.dir / "settings.json", s)
        self.request_replan()
        return s

    # ------------------------------------------------------------- notify

    def request_replan(self) -> None:
        self._wake.set()

    async def _bump(self) -> None:
        async with self._cond:
            self.version += 1
            self._cond.notify_all()

    async def wait_change(self, seen: int, timeout: float) -> None:
        async with self._cond:
            try:
                await asyncio.wait_for(self._cond.wait_for(lambda: self.version != seen), timeout)
            except asyncio.TimeoutError:
                pass

    # ------------------------------------------------------------- inputs

    async def _gcal_busy(self, client, start, end) -> List[Block]:
        if not gcal.enabled(self.env):
            self.gcal_status = {"enabled": False,
                                "detail": "no Calendar permission — re-consent with node web/scripts/gmail_auth.js"
                                if google_oauth.configured(self.env) else "Google account not connected"}
            return []
        if _time.time() - self._busy_at > GCAL_BUSY_TTL:
            try:
                own = self._read("gcal.json", {}).get("calendar_id")
                self._busy = await gcal.busy(client, self.env, start, end, own)
                self._busy_at = _time.time()
                self.gcal_status = {**self.gcal_status, "enabled": True, "busy_events": len(self._busy),
                                    "read_error": ""}
            except (httpx.HTTPError, google_oauth.GoogleAuthError) as e:
                self.gcal_status = {**self.gcal_status, "enabled": True,
                                    "read_error": getattr(e, "detail", type(e).__name__)}
        return self._busy

    def _pins(self, now: datetime) -> List[Block]:
        keep = [p for p in self._read("pins.json", []) if datetime.fromisoformat(p["end"]) > now - timedelta(days=HISTORY_DAYS)]
        return [Block.from_json({**p, "pinned": True}) for p in keep]

    # ------------------------------------------------------------- re-plan

    async def replan(self, client: httpx.AsyncClient) -> None:
        from backend.mail.service import MAIL      # late: mail imports nothing from planner

        S = self.settings
        tz = ZoneInfo(S["timezone"])
        now = datetime.now(tz)
        freeze = now + timedelta(minutes=S["freeze_minutes"])
        horizon = now + timedelta(days=S["horizon_days"] + 1)
        done: Dict[str, dict] = self._read("done.json", {})
        pins = self._pins(now)
        pin_ids = {p.id for p in pins}

        prev = [Block.from_json(b) for b in self.plan.get("blocks", [])]
        frozen = [b for b in prev if b.id not in pin_ids and b.source.get("type") != "gcal"
                  and b.start < freeze and b.end > now - timedelta(days=HISTORY_DAYS)]

        rows = MAIL.store.extracted_since((now - timedelta(days=30)).astimezone(timezone.utc).isoformat())
        tasks, mail_fixed = sources.mail_inputs(rows, now, S)
        tasks += sources.todo_tasks(now, tz)
        plan_nodes = PLANS.nodes()
        tasks += plans_model.tasks(plan_nodes, now, horizon, tz,
                                   habit_until=now + timedelta(days=S["horizon_days"]))
        busy = await self._gcal_busy(client, now - timedelta(hours=12), horizon)
        mail_fixed_ids = {b.id for b in mail_fixed}
        frozen = [b for b in frozen if b.id not in mail_fixed_ids]

        # What is already spoken for, per task: done work, and still-future frozen or pinned chunks.
        spent: Dict[str, int] = {}
        for rec in done.values():
            if rec.get("task"):
                spent[rec["task"]] = spent.get(rec["task"], 0) + int(rec.get("minutes", 0))
        for b in frozen + pins:
            t = b.source.get("task")
            if t and b.end > now and b.id not in done:
                spent[t] = spent.get(t, 0) + b.minutes
        for t in tasks:
            t.minutes = max(0, t.minutes - spent.get(t.id, 0))
        tasks = [t for t in tasks if t.minutes > 0]

        items = sources.pool_items()
        undated = plans_model.pool_items(plan_nodes)
        if undated:
            items["projects"] = items.get("projects", []) + undated
        plan = solver.solve(solver.Inputs(
            now=now, settings=S, fixed=mail_fixed + busy, pinned=pins, frozen=frozen, tasks=tasks,
            pool_items=items, sleep=sources.sleep_window(S)))
        for b in plan.blocks:
            b.done = b.id in done
            b.pinned = b.pinned or b.id in pin_ids
        self.plan = {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "freeze": plan.freeze.isoformat(), "horizon_end": plan.horizon_end.isoformat(),
            "blocks": [b.to_json() for b in plan.blocks], "at_risk": plan.at_risk, "days": plan.days,
            "inputs": {"tasks": len(tasks), "mail_events": len(mail_fixed), "calendar_events": len(busy),
                       "pins": len(pins)},
        }
        self._write("plan.json", self.plan)
        self.error = ""
        await self._bump()

    async def run(self) -> None:
        async with httpx.AsyncClient(timeout=60, headers={"User-Agent": "agent-smith-planner/1.0"}) as client:
            while True:
                try:
                    await self.replan(client)
                except Exception as e:
                    log.exception("planner: re-plan failed")
                    self.error = f"re-plan failed: {type(e).__name__}: {e}"
                    await self._bump()
                try:
                    await asyncio.wait_for(self._wake.wait(), timeout=CADENCE)
                    await asyncio.sleep(DEBOUNCE)          # let a burst of changes land first
                except asyncio.TimeoutError:
                    pass
                self._wake.clear()

    # ------------------------------------------------------------- edits

    def find(self, block_id: str) -> Optional[Block]:
        for b in self.plan.get("blocks", []):
            if b["id"] == block_id:
                return Block.from_json(b)
        return None

    def pin(self, *, block_id: Optional[str], start: datetime, end: datetime,
            title: Optional[str] = None, kind: Optional[str] = None) -> Block:
        """Move an existing block (it becomes a pin with the same source), or create one."""
        if end <= start:
            raise ValueError("end must be after start")
        pins = self._read("pins.json", [])
        base = self.find(block_id) if block_id else None
        if block_id and base is None:
            raise KeyError(block_id)
        if base and base.pinned:
            pins = [p for p in pins if p["id"] != base.id]
        pin = Block(id=base.id if base and base.pinned else f"pin-{uuid.uuid4().hex[:10]}",
                    start=start, end=end, kind=kind or (base.kind if base else "fixed"),
                    title=title or (base.title if base else "Pinned"),
                    source=base.source if base else {"type": "pin", "ref": "manual"}, pinned=True)
        pins.append(pin.to_json())
        self._write("pins.json", pins)
        self.request_replan()
        return pin

    def unpin(self, pin_id: str) -> bool:
        pins = self._read("pins.json", [])
        left = [p for p in pins if p["id"] != pin_id]
        self._write("pins.json", left)
        self.request_replan()
        return len(left) != len(pins)

    def mark_done(self, block_id: str, is_done: bool) -> bool:
        b = self.find(block_id)
        if b is None:
            return False
        done = self._read("done.json", {})
        if is_done:
            done[block_id] = {"task": b.source.get("task"), "minutes": b.minutes,
                              "at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
        else:
            done.pop(block_id, None)
        self._write("done.json", done)
        self.request_replan()
        return True

    # ------------------------------------------------------------- output

    def blocks_for_source(self, ref: str) -> List[dict]:
        return [{"id": b["id"], "start": b["start"], "end": b["end"], "title": b["title"], "kind": b["kind"]}
                for b in self.plan.get("blocks", []) if b.get("source", {}).get("ref") == ref]

    def snapshot(self, start: Optional[datetime] = None, end: Optional[datetime] = None) -> dict:
        now = datetime.now(timezone.utc)
        blocks = self.plan.get("blocks", [])
        if start or end:
            blocks = [b for b in blocks if (not end or datetime.fromisoformat(b["start"]) < end)
                      and (not start or datetime.fromisoformat(b["end"]) > start)]
        # Filling starts at the next grid line, so for up to one grid step nothing covers "now":
        # the block about to start is the current one.
        soon = now + timedelta(minutes=self.settings["grid_minutes"])
        current = next((b for b in self.plan.get("blocks", [])
                        if datetime.fromisoformat(b["start"]) <= now < datetime.fromisoformat(b["end"])), None)             or next((b for b in self.plan.get("blocks", [])
                     if now <= datetime.fromisoformat(b["start"]) <= soon), None)
        upcoming = [b for b in self.plan.get("blocks", [])
                    if datetime.fromisoformat(b["start"]) > now and b is not current]
        return {"version": self.version, "generated_at": self.plan.get("generated_at"),
                "freeze": self.plan.get("freeze"), "error": self.error, "gcal": self.gcal_status,
                "now": current, "next": upcoming[0] if upcoming else None,
                "at_risk": self.plan.get("at_risk", []), "days": self.plan.get("days", []),
                "inputs": self.plan.get("inputs", {}), "blocks": blocks}


PLANNER = PlannerService(state_dir() / "planner")


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("PLANNER_SCHEDULER", "1") == "0":
        return None
    from backend.mail.service import MAIL
    MAIL.listeners.append(PLANNER.request_replan)
    PLANS.listeners.append(PLANNER.request_replan)
    return asyncio.create_task(PLANNER.run(), name="planner")
