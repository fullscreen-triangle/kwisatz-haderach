"""
Keeper service — per-credential state, the scheduler loop, and change notification.

One Keeper runs inside the backend process (started from main.py's lifespan). Every
TICK seconds it runs the probes that are due, folds each ProbeResult together with the
vault's declared expiry (manifest.json, written by `tools/keeper push`) into a row, and
bumps `version` when anything a human would see changed. The SSE route waits on that
version, so the dashboard updates the moment a state flips — no client polling.

Rows are value-free: ids, states, timestamps, prose. The snapshot is persisted to
keeper-state.json so a restart shows the last known picture instead of a blank page.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Mapping, Optional

import httpx

from backend.keeper.probes import ProbeContext, ProbeResult
from backend.keeper.registry import Credential, build as build_registry

log = logging.getLogger("keeper")

TICK = 30                        # seconds between scheduler passes
SOON = timedelta(days=14)        # a human-renewed credential turns amber this far out
RETRY_TRANSIENT = 5 * 60         # re-check sooner after a network/5xx failure
STATES = ("ok", "soon", "expired", "dead", "missing", "unknown")


def state_dir() -> Path:
    """Where the node keeps vault-pushed files and keeper's own state. On server-2 this is
    /var/lib/agent-smith (outside the repo tree, so nav/spraypaint can't reach it)."""
    raw = os.getenv("AGENT_SMITH_STATE")
    return Path(raw) if raw else Path(__file__).resolve().parent.parent / ".agent_smith"


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat(timespec="seconds") if dt else None


def _parse(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@dataclass
class Row:
    cred: Credential
    state: str = "unknown"
    detail: str = "not checked yet"
    mode: str = ""
    verified: bool = True
    probe_expires_at: Optional[datetime] = None
    declared_expires_at: Optional[datetime] = None
    auto_expires_at: Optional[datetime] = None
    last_checked: Optional[datetime] = None
    last_ok: Optional[datetime] = None
    last_renewed: Optional[datetime] = None
    next_check: datetime = field(default_factory=lambda: datetime.min.replace(tzinfo=timezone.utc))

    @property
    def expires_at(self) -> Optional[datetime]:
        """The expiry a human must act on: the earlier of what the provider reported and
        what the vault entry declares."""
        known = [d for d in (self.probe_expires_at, self.declared_expires_at) if d]
        return min(known) if known else None

    def public(self, now: datetime) -> dict:
        exp = self.expires_at
        return {
            "id": self.cred.id,
            "title": self.cred.title,
            "provider": self.cred.provider,
            "strategy": self.cred.strategy,
            "used_by": self.cred.used_by,
            "renew_url": self.cred.renew_url,
            "mode": self.mode,
            "state": self.state,
            "verified": self.verified,
            "detail": self.detail,
            "expires_at": _iso(exp),
            "days_left": (exp - now).days if exp else None,
            "auto_expires_at": _iso(self.auto_expires_at),
            "last_checked": _iso(self.last_checked),
            "last_ok": _iso(self.last_ok),
            "last_renewed": _iso(self.last_renewed),
            "next_check": _iso(self.next_check),
        }

    def visible(self) -> tuple:
        """What a human would see change. next_check/last_checked tick every probe and
        would otherwise wake every SSE client on every pass."""
        return (self.state, self.detail, self.mode, self.verified, _iso(self.expires_at),
                _iso(self.auto_expires_at), _iso(self.last_renewed))


def classify(result: ProbeResult, row: Row, now: datetime) -> str:
    if result.missing:
        return "missing"
    if result.ok is False:
        return "dead"
    if result.ok is None:
        # Couldn't tell. Keep a previous verdict rather than flapping to red.
        return row.state if row.state in ("ok", "soon", "expired", "dead") else "unknown"
    exp = row.expires_at
    if exp and exp <= now:
        return "expired"
    if exp and exp - now <= SOON:
        return "soon"
    return "ok"


class Keeper:
    def __init__(self, registry: List[Credential], directory: Path,
                 env: Optional[Mapping[str, str]] = None):
        self.dir = directory
        self.env = env if env is not None else os.environ
        self.rows: Dict[str, Row] = {c.id: Row(c) for c in registry}
        self.version = 0
        self._cond = asyncio.Condition()
        self._wake = asyncio.Event()
        self._load_state()

    # ------------------------------------------------------------- persistence

    @property
    def _state_file(self) -> Path:
        return self.dir / "keeper-state.json"

    def _load_state(self) -> None:
        try:
            saved = json.loads(self._state_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        for item in saved.get("credentials", []):
            row = self.rows.get(item.get("id"))
            if not row:
                continue
            row.state = item.get("state", "unknown")
            row.detail = item.get("detail", "") + " (from before the last restart)"
            row.mode = item.get("mode", "")
            row.auto_expires_at = _parse(item.get("auto_expires_at"))
            row.last_checked = _parse(item.get("last_checked"))
            row.last_ok = _parse(item.get("last_ok"))
            row.last_renewed = _parse(item.get("last_renewed"))

    def _save_state(self) -> None:
        try:
            self.dir.mkdir(parents=True, exist_ok=True)
            tmp = self._state_file.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.snapshot(), indent=2), encoding="utf-8")
            os.replace(tmp, self._state_file)
        except OSError as e:
            log.warning("keeper: could not persist state: %s", e)

    def _load_manifest(self) -> None:
        """Declared expiries from the vault (KeePassXC's Expires field), written by push."""
        try:
            manifest = json.loads((self.dir / "manifest.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            manifest = {}
        declared = manifest.get("credentials", {})
        for cid, row in self.rows.items():
            row.declared_expires_at = _parse((declared.get(cid) or {}).get("expires_at"))

    # ------------------------------------------------------------- probing

    async def _run_one(self, row: Row, client: httpx.AsyncClient, now: datetime) -> None:
        ctx = ProbeContext(client=client, env=self.env, state_dir=self.dir)
        try:
            result = await asyncio.wait_for(row.cred.probe(ctx), timeout=90)
        except Exception as e:  # a probe bug or hang must never take the scheduler down
            log.exception("keeper: probe %s crashed", row.cred.id)
            result = ProbeResult(ok=None, detail=f"check failed ({type(e).__name__}); will retry")

        if result.ok is not None or result.missing:   # a transient failure says nothing new
            row.probe_expires_at = result.expires_at
            row.auto_expires_at = result.auto_expires_at
        row.mode = result.mode or row.mode
        row.verified = result.verified
        row.detail = result.detail
        row.state = classify(result, row, now)
        row.last_checked = now
        if result.ok:
            row.last_ok = now
        if result.renewed:
            row.last_renewed = now
        wait = RETRY_TRANSIENT if result.ok is None and not result.missing else row.cred.interval
        row.next_check = now + timedelta(seconds=min(wait, row.cred.interval))

    async def tick(self, client: httpx.AsyncClient) -> None:
        self._load_manifest()
        now = datetime.now(timezone.utc)
        before = {cid: r.visible() for cid, r in self.rows.items()}
        due = [r for r in self.rows.values() if r.next_check <= now]
        await asyncio.gather(*(self._run_one(r, client, now) for r in due))
        # Declared expiries can cross a threshold with no probe due — re-classify from time.
        for r in self.rows.values():
            if r not in due and r.state in ("ok", "soon", "expired"):
                exp = r.expires_at
                r.state = ("expired" if exp and exp <= now else
                           "soon" if exp and exp - now <= SOON else "ok")
        if due:
            self._save_state()
        if any(before[cid] != r.visible() for cid, r in self.rows.items()):
            await self._bump()

    async def run(self) -> None:
        async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "agent-smith-keeper/1.0"}) as client:
            while True:
                try:
                    await self.tick(client)
                except Exception:
                    log.exception("keeper: tick failed")
                try:
                    await asyncio.wait_for(self._wake.wait(), timeout=TICK)
                except asyncio.TimeoutError:
                    pass
                self._wake.clear()

    def check_now(self) -> None:
        """Make every probe due and wake the loop (the dashboard's 'check now' button)."""
        epoch = datetime.min.replace(tzinfo=timezone.utc)
        for r in self.rows.values():
            r.next_check = epoch
        self._wake.set()

    # ------------------------------------------------------------- change notification

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

    # ------------------------------------------------------------- output

    def snapshot(self) -> dict:
        now = datetime.now(timezone.utc)
        rows = [r.public(now) for r in self.rows.values()]
        counts = {s: sum(1 for r in rows if r["state"] == s) for s in STATES}
        worst = next((s for s in ("dead", "expired", "missing", "soon", "unknown", "ok") if counts[s]), "ok")
        return {"generated_at": _iso(now), "version": self.version,
                "worst": worst, "counts": counts, "credentials": rows}


KEEPER = Keeper(build_registry(os.environ), state_dir())


def start() -> Optional["asyncio.Task[None]"]:
    """Start the scheduler unless KEEPER_SCHEDULER=0 (tests, a second worker)."""
    if os.getenv("KEEPER_SCHEDULER", "1") == "0":
        return None
    return asyncio.create_task(KEEPER.run(), name="keeper")
