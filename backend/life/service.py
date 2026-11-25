"""
The facts about Kundai, kept current from his mail.

Every PASS seconds the service walks the mail store (oldest first, so a first run reads the
whole history), triages each message (read.triage) and reads the ones about his passport,
residence, home or job. Each witnessed fact becomes an observation in the facts structure the
forms already use (<state>/memory/facts, record "me"):

  channel "mail-own"  he wrote it (his own address) — strong, but a model read it, so alone it
                      does not publish: a second mail that agrees, or his tap, does
  channel "mail"      someone else wrote it — like a document quote
Until then the fact is "to confirm": shown on the documents page, marked, with one tap to make it his.

A slot is "known" when the structure publishes it, "to confirm" when evidence points at a value
that has not reached the threshold (or two values compete — e.g. a newer document), and
"unknown" otherwise. What was read is kept in <state>/life/read.json, so a mail is read once.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import httpx

from backend.keeper.service import state_dir
from backend.life import read as reader
from backend.life.slots import BY_ID, SLOTS, TOPICS
from backend.memory import store
from backend.memory.observe import RELIABILITY, statement
from backend.memory.structure import BOT, Structure

log = logging.getLogger("life")

ME = "me"                                   # the forms' record for facts about Kundai
PASS = int(os.getenv("LIFE_PASS", str(15 * 60)))
PER_PASS = int(os.getenv("LIFE_PER_PASS", "40"))

RELIABILITY.setdefault("mail-own", 0.99)    # he wrote it (4.6 nats): with a second mail, or his tap, it publishes
RELIABILITY.setdefault("mail", 0.9)         # someone else's mail: as strong as a document quote


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class LifeService:
    def __init__(self, root: Optional[Path] = None, mail_store=None, env=None):
        self._root = root
        self._mail = mail_store
        self.env = env if env is not None else os.environ
        self.running = False
        self.version = 0
        self._failures: Dict[str, int] = {}
        self._wake = asyncio.Event()

    # ------------------------------------------------------------- where things live

    @property
    def root(self) -> Path:
        return self._root or state_dir()

    def facts_dir(self) -> Path:
        return self.root / "memory" / "facts"

    def facts(self) -> Structure:
        return store.load(self.facts_dir())

    def _read_path(self) -> Path:
        d = self.root / "life"
        d.mkdir(parents=True, exist_ok=True)
        return d / "read.json"

    def done(self) -> Dict[str, dict]:
        try:
            return json.loads(self._read_path().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}

    def _save_done(self, done: Dict[str, dict]) -> None:
        tmp = self._read_path().with_suffix(".tmp")
        tmp.write_text(json.dumps(done, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self._read_path())

    @property
    def mail(self):
        if self._mail is None:
            from backend.mail.service import MAIL
            self._mail = MAIL.store
        return self._mail

    # ------------------------------------------------------------- recording

    def record(self, facts: Structure, m, found: List[dict]) -> int:
        """Observe each witnessed fact; a mail adds to a slot once. Returns how many were new."""
        channel = "mail-own" if m.owner else "mail"
        source = f"mail:{m.key}"
        added = 0
        for f in found:
            slot = BY_ID[f["slot"]]
            n = facts.add_node(ME, slot.id, label=slot.label)
            if any(o.node == n.id and o.source == source for o in facts.observations):
                continue
            facts.add_candidate(n.id, f["value"])
            cue = f"{m.date.date().isoformat()} · {m.subject[:80]} · “{f['quote']}”"
            facts.observe(statement(n, f["value"], channel, source, cue=cue))
            added += 1
        return added

    def pending(self) -> List:
        """Messages not yet read, oldest first."""
        done = self.done()
        rows = self.mail._db.execute("SELECT key FROM messages ORDER BY date").fetchall()
        return [k for (k,) in rows if k not in done]

    async def run_pass(self, limit: int = PER_PASS) -> dict:
        self.running = True
        counts = {"triaged_out": 0, "read": 0, "facts": 0, "failed": 0}
        try:
            done = self.done()
            facts = self.facts()
            async with httpx.AsyncClient() as client:
                for key in self.pending():
                    m = self.mail.get_message(key)
                    if m is None:
                        continue
                    if not reader.triage(m):
                        done[key] = {"at": _now(), "triage": "not about papers, home or job"}
                        counts["triaged_out"] += 1
                        continue
                    if counts["read"] + counts["failed"] >= limit:
                        break
                    try:
                        found, model = await reader.read(client, self.env, m)
                    except reader.ReadFailed as e:
                        counts["failed"] += 1
                        log.warning("life: %s: %s", key, e)
                        self._failures[key] = self._failures.get(key, 0) + 1
                        if self._failures[key] >= 2:                          # second failure: give up
                            done[key] = {"at": _now(), "error": str(e), "subject": m.subject[:120]}
                        continue
                    added = self.record(facts, m, found)
                    done[key] = {"at": _now(), "model": model, "facts": found, "date": m.date.isoformat(),
                                 "subject": m.subject[:120], "own": m.owner}
                    counts["read"] += 1
                    counts["facts"] += added
                    store.save(facts, self.facts_dir())
                    self._save_done(done)
                    self.version += 1
            self._save_done(done)
        finally:
            self.running = False
        return counts

    # ------------------------------------------------------------- what you see

    @staticmethod
    def state_of(facts: Structure, nid: str) -> dict:
        """The documents page's rule, stricter than the structure's threshold (which is low while
        the store is small): a fact is known when he said so (his latest word wins), or when two
        different mails state the same value and no mail states another. Otherwise any evidence
        makes it "to confirm", led by the value most mails state."""
        n = facts.nodes[nid]
        said: Dict[str, set] = {}
        person = None
        for o in sorted((o for o in facts.observations if o.node == nid), key=lambda o: o.seq):
            v = max(n.all_candidates(), key=lambda c, o=o: o.l(c))
            if o.channel == "person":
                person = v
            elif v != BOT:
                said.setdefault(v, set()).add(o.source)
        candidates = [{"value": v, "sources": len(src)} for v, src in said.items()]
        if person is not None:
            return {"state": "not applicable" if person == BOT else "known",
                    "value": None if person == BOT else person, "leader": None if person == BOT else person,
                    "candidates": candidates}
        if not said:
            return {"state": "unknown", "value": None, "leader": None, "candidates": []}
        leader = max(said, key=lambda v: (len(said[v]), -n.candidates.index(v) if v in n.candidates else 0))
        known = len(said) == 1 and len(said[leader]) >= 2
        return {"state": "known" if known else "to confirm", "value": leader if known else None,
                "leader": leader, "candidates": candidates}

    def view(self) -> dict:
        facts = self.facts()
        g = facts.graphs() if facts.nodes else {"witnessed": []}
        reads = self.done()
        topics: Dict[str, List[dict]] = {t: [] for t in TOPICS}
        for slot in SLOTS:
            nid = f"{ME}␟{slot.id}"
            row = {"slot": slot.id, "label": slot.label, "kind": slot.kind}
            if nid not in facts.nodes:
                topics[slot.topic].append({**row, "state": "unknown", "value": None, "leader": None,
                                           "candidates": [], "evidence": []})
                continue
            evidence = [{"source": w["source"], "channel": w["channel"], "cue": w["cue"]}
                        for w in g["witnessed"] if w["node"] == nid]
            topics[slot.topic].append({**row, **self.state_of(facts, nid), "evidence": evidence[-4:]})
        read_n = sum(1 for r in reads.values() if "model" in r)
        return {"as_of": _now(), "topics": topics, "mails_seen": len(reads), "mails_read": read_n,
                "running": self.running}

    def value(self, slot: str) -> Optional[str]:
        facts = self.facts()
        nid = f"{ME}␟{slot}"
        return self.state_of(facts, nid)["value"] if nid in facts.nodes else None

    def confirm(self, slot: str, value: Optional[str]) -> dict:
        """Your word on a slot: a value (it is yours now), or None = this does not apply."""
        if slot not in BY_ID:
            raise KeyError(slot)
        facts = self.facts()
        s = BY_ID[slot]
        n = facts.add_node(ME, slot, label=s.label)
        if value is None:
            facts.observe(statement(n, BOT, "person", "you"))
        else:
            v = value.strip()
            if s.kind == "date":
                v = reader.iso_date(v) or ""
                if not v:
                    raise ValueError("a date, please (YYYY-MM-DD or 07.10.2036)")
            facts.add_candidate(n.id, v)
            facts.observe(statement(n, v, "person", "you", cue="confirmed on the desk"))
        store.save(facts, self.facts_dir())
        self.version += 1
        return self.view()

    # ------------------------------------------------------------- the loop

    def refresh(self) -> None:
        self._wake.set()

    async def run(self) -> None:
        await asyncio.sleep(180)                 # after the mail service has started
        while True:
            try:
                c = await self.run_pass()
                if c["read"] or c["failed"]:
                    log.info("life: %s", c)
                more = c["read"] + c["failed"] >= PER_PASS
            except Exception:
                log.exception("life: pass failed")
                more = False
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=5 if more else PASS)
            except asyncio.TimeoutError:
                pass
            self._wake.clear()


LIFE = LifeService()


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("LIFE_SCHEDULER", "1") == "0":
        return None
    return asyncio.create_task(LIFE.run(), name="life")
