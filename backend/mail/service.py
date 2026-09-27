"""
Mail service — three loops inside the backend process (started from main.py lifespan):

  poll     every POLL s, each account: fetch new mail -> store (dedup) -> wake extract
  extract  one message at a time, newest first: triage or model -> store -> md mirror
           -> tell listeners (the planner) something changed
  sidecar  every minute: push unsynced records to chigutiro; rebuild the spraypaint
           index when new mail arrived and the last build is > REINDEX s old

Every change bumps `version`; /mail/stream (SSE) waits on it, so the inbox page updates
the moment a message is fetched or extracted. Account status is value-free.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Callable, Dict, List, Mapping, Optional

import httpx

from backend import google_oauth
from backend.keeper.service import state_dir
from backend.mail import accounts as accts
from backend.mail import extract, gmail, imap, memory, search
from backend.mail.store import MailStore

log = logging.getLogger("mail")

POLL = 60
REINDEX = 300


def _iso(ts: Optional[float]) -> Optional[str]:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="seconds") if ts else None


class MailService:
    def __init__(self, store: MailStore, env: Optional[Mapping[str, str]] = None):
        self.store = store
        self.env = env if env is not None else os.environ
        self.version = 0
        self._cond = asyncio.Condition()
        self._wake_poll = asyncio.Event()
        self._wake_extract = asyncio.Event()
        self.status: Dict[str, dict] = {}
        self.listeners: List[Callable[[], None]] = []
        self._gmail_addr: Optional[str] = None
        self._index_dirty = False
        self._last_index = 0.0
        self.extracting: Optional[str] = None
        self.backoff_until = 0.0

    # ------------------------------------------------------------- notify

    async def bump(self) -> None:
        async with self._cond:
            self.version += 1
            self._cond.notify_all()

    async def wait_change(self, seen: int, timeout: float) -> None:
        async with self._cond:
            try:
                await asyncio.wait_for(self._cond.wait_for(lambda: self.version != seen), timeout)
            except asyncio.TimeoutError:
                pass

    def _notify_listeners(self) -> None:
        for fn in self.listeners:
            try:
                fn()
            except Exception:
                log.exception("mail: listener failed")

    def sync_now(self) -> None:
        self._wake_poll.set()

    # ------------------------------------------------------------- poll

    def _owner_addrs(self, accounts: List[accts.Account]) -> set:
        own = accts.owner_addresses(accounts)
        if self._gmail_addr:
            own.add(self._gmail_addr)
        return own

    async def _poll_account(self, client: httpx.AsyncClient, acct: accts.Account, own: set) -> None:
        st = self.status.setdefault(acct.id, {"id": acct.id, "label": acct.label, "kind": acct.kind})
        st["last_poll"] = _iso(time.time())
        backfill = int(self.env.get("MAIL_BACKFILL_DAYS") or 14)
        try:
            if acct.kind == "gmail":
                if not self._gmail_addr:
                    self._gmail_addr = await gmail.own_address(client, self.env)
                    own.add(self._gmail_addr)
                first = not self.store.sync_states("gmail")
                msgs = await gmail.fetch_new(client, self.env, window_days=backfill if first else 3,
                                             seen=lambda uid: self.store.seen_uid("gmail", uid), owner_addrs=own)
                self.store.save_sync_states("gmail", {"all": {"polled": st["last_poll"]}})
            else:
                states = self.store.sync_states(acct.id)
                msgs, new_states = await asyncio.to_thread(imap.fetch_new, acct, states, backfill, own)
                self.store.save_sync_states(acct.id, new_states)
        except (google_oauth.GoogleAuthError, imap.ImapError) as e:
            st.update(ok=False, error=e.detail, error_kind=e.kind)
            return
        except httpx.HTTPError as e:
            st.update(ok=False, error=f"{type(e).__name__} talking to Gmail", error_kind="transient")
            return
        added = self.store.add(msgs)
        st.update(ok=True, error="", last_ok=_iso(time.time()), new=len(added))
        if added:
            self._index_dirty = True
            self._wake_extract.set()
            await self.bump()

    async def poll_loop(self, client: httpx.AsyncClient) -> None:
        while True:
            accounts = accts.discover(self.env)
            known = {a.id for a in accounts}
            for gone in set(self.status) - known:
                self.status.pop(gone, None)
            own = self._owner_addrs(accounts)
            for acct in accounts:
                try:
                    await self._poll_account(client, acct, own)
                except Exception:
                    log.exception("mail: poll %s crashed", acct.id)
            try:
                await asyncio.wait_for(self._wake_poll.wait(), timeout=POLL)
            except asyncio.TimeoutError:
                pass
            self._wake_poll.clear()

    # ------------------------------------------------------------- extract

    async def extract_one(self, client: httpx.AsyncClient) -> bool:
        m = self.store.next_pending()
        if m is None:
            return False
        self.extracting = m.key
        tri = extract.triage(m)
        if tri:
            label, data = tri
            self.store.save_extraction(m.key, "skipped", triage=label, data=data)
        else:
            try:
                data, model = await extract.extract(client, self.env, m)
                self.store.save_extraction(m.key, "done", triage="model", data=data, model=model)
            except extract.ExtractionFailed as e:
                self.store.retry_later(m.key, str(e))
                data = None
                self.backoff_until = time.time() + 120   # model down or confused: don't spin
        self.extracting = None
        if data is not None:
            self.store.write_md(m, data)
            self._index_dirty = True
            self._notify_listeners()
        await self.bump()
        return True

    async def extract_loop(self, client: httpx.AsyncClient) -> None:
        while True:
            try:
                did = await self.extract_one(client)
            except Exception:
                log.exception("mail: extraction crashed")
                did = False
            if time.time() < self.backoff_until:
                await asyncio.sleep(self.backoff_until - time.time())
            elif not did:
                try:
                    await asyncio.wait_for(self._wake_extract.wait(), timeout=30)
                except asyncio.TimeoutError:
                    pass
                self._wake_extract.clear()

    # ------------------------------------------------------------- sidecar

    async def sync_memory(self, client: httpx.AsyncClient) -> int:
        if not memory.configured(self.env):
            return 0
        keys = self.store.unsynced_memory()
        if not keys:
            return 0
        records = []
        for k in keys:
            m, ex = self.store.get_message(k), self.store.extraction(k)
            if m and ex:
                records += memory.records_for(m, ex["data"], ex.get("triage") or "")
        await memory.ingest(client, self.env, records)
        self.store.mark_memory_synced(keys)
        return len(keys)

    async def side_loop(self, client: httpx.AsyncClient) -> None:
        while True:
            try:
                while await self.sync_memory(client):
                    pass
            except httpx.HTTPError as e:
                log.info("mail: chigutiro unreachable (%s); will retry", type(e).__name__)
            except Exception:
                log.exception("mail: memory sync failed")
            if self._index_dirty and time.time() - self._last_index > REINDEX:
                self._index_dirty = False
                self._last_index = time.time()
                try:
                    await asyncio.to_thread(search.reindex, self.store.md_root)
                except Exception:
                    log.exception("mail: spraypaint index failed")
            await asyncio.sleep(60)

    async def run(self) -> None:
        async with httpx.AsyncClient(timeout=60, headers={"User-Agent": "agent-smith-mail/1.0"}) as client:
            await asyncio.gather(self.poll_loop(client), self.extract_loop(client), self.side_loop(client))

    # ------------------------------------------------------------- output

    def snapshot(self) -> dict:
        return {"version": self.version, "extracting": self.extracting,
                "accounts": list(self.status.values()), "counts": self.store.counts()}


MAIL = MailService(MailStore(state_dir() / "mail"))


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("MAIL_SCHEDULER", "1") == "0":
        return None
    return asyncio.create_task(MAIL.run(), name="mail")
