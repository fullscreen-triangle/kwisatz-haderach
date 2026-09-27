"""
Mail store: SQLite for structure, a markdown mirror for the search organs.

  <state>/mail/mail.db                        messages · extractions · sync_state
  <state>/mail/md/<account>/<yyyy-mm>/<key>.md one file per message (front-matter +
                                               summary + body), what spraypaint indexes
                                               (one scene per account) and individuate reads
  <state>/mail/md/.spraypaint/                 pins spraypaint's root to the mirror

A message is inserted once (dedup on key = account + Message-ID); its extraction row
moves pending -> done | skipped | failed. Nothing here talks to the network.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterator, List, Optional

from backend.mail.parse import Message

SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
  key TEXT PRIMARY KEY, account TEXT NOT NULL, folder TEXT NOT NULL, uid TEXT NOT NULL,
  message_id TEXT, date TEXT NOT NULL, from_name TEXT, from_addr TEXT, to_json TEXT,
  cc_json TEXT, subject TEXT, text TEXT, bulk INTEGER, owner INTEGER, in_reply_to TEXT,
  fetched_at TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS messages_date ON messages(date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS messages_uid ON messages(account, uid);
CREATE TABLE IF NOT EXISTS extractions (
  key TEXT PRIMARY KEY REFERENCES messages(key), status TEXT NOT NULL,
  triage TEXT, data TEXT, model TEXT, error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  memory_synced INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS extractions_status ON extractions(status);
CREATE TABLE IF NOT EXISTS sync_state (
  account TEXT NOT NULL, folder TEXT NOT NULL, state TEXT NOT NULL,
  PRIMARY KEY (account, folder)
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class MailStore:
    def __init__(self, directory: Path):
        self.dir = directory
        self.md_root = directory / "md"
        self.dir.mkdir(parents=True, exist_ok=True)
        (self.md_root / ".spraypaint").mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._db = sqlite3.connect(directory / "mail.db", check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.executescript(SCHEMA)
        self._db.commit()

    @contextmanager
    def _tx(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            try:
                yield self._db
                self._db.commit()
            except Exception:
                self._db.rollback()
                raise

    # ------------------------------------------------------------ messages

    def seen_uid(self, account: str, uid: str) -> bool:
        with self._lock:
            return self._db.execute("SELECT 1 FROM messages WHERE account=? AND uid=?",
                                    (account, uid)).fetchone() is not None

    def add(self, messages: List[Message]) -> List[str]:
        """Insert new messages, queue each for extraction. Returns the keys actually added."""
        added = []
        with self._tx() as db:
            for m in messages:
                cur = db.execute(
                    "INSERT OR IGNORE INTO messages (key, account, folder, uid, message_id, date, from_name,"
                    " from_addr, to_json, cc_json, subject, text, bulk, owner, in_reply_to, fetched_at)"
                    " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (m.key, m.account, m.folder, m.uid, m.message_id, m.date.isoformat(), m.from_name,
                     m.from_addr, json.dumps(m.to), json.dumps(m.cc), m.subject, m.text, int(m.bulk),
                     int(m.owner), m.in_reply_to, _now()))
                if cur.rowcount:
                    db.execute("INSERT OR IGNORE INTO extractions (key, status, updated_at) VALUES (?, 'pending', ?)",
                               (m.key, _now()))
                    added.append(m.key)
        for m in messages:
            if m.key in added:
                self.write_md(m, None)
        return added

    def get_message(self, key: str) -> Optional[Message]:
        with self._lock:
            row = self._db.execute("SELECT * FROM messages WHERE key=?", (key,)).fetchone()
        return _to_message(row) if row else None

    def set_done(self, key: str, done: bool) -> bool:
        with self._tx() as db:
            return db.execute("UPDATE messages SET done=? WHERE key=?", (int(done), key)).rowcount > 0

    # ------------------------------------------------------------ extractions

    def next_pending(self, max_attempts: int = 2) -> Optional[Message]:
        """Newest pending message first: today's mail matters more than the backfill."""
        with self._lock:
            row = self._db.execute(
                "SELECT m.* FROM messages m JOIN extractions e ON e.key=m.key "
                "WHERE e.status='pending' AND e.attempts < ? ORDER BY m.date DESC LIMIT 1",
                (max_attempts,)).fetchone()
        return _to_message(row) if row else None

    def save_extraction(self, key: str, status: str, *, triage: str = "", data: Optional[dict] = None,
                        model: str = "", error: str = "") -> None:
        with self._tx() as db:
            db.execute("UPDATE extractions SET status=?, triage=?, data=?, model=?, error=?,"
                       " attempts=attempts+1, updated_at=? WHERE key=?",
                       (status, triage, json.dumps(data) if data is not None else None, model, error,
                        _now(), key))

    def retry_later(self, key: str, error: str) -> None:
        with self._tx() as db:
            db.execute("UPDATE extractions SET attempts=attempts+1, error=?, updated_at=? WHERE key=?",
                       (error, _now(), key))
            db.execute("UPDATE extractions SET status='failed' WHERE key=? AND attempts>=2", (key,))

    def extraction(self, key: str) -> Optional[dict]:
        with self._lock:
            row = self._db.execute("SELECT * FROM extractions WHERE key=?", (key,)).fetchone()
        return _extraction_row(row) if row else None

    def unsynced_memory(self, limit: int = 50) -> List[str]:
        with self._lock:
            rows = self._db.execute("SELECT key FROM extractions WHERE status IN ('done','skipped')"
                                    " AND memory_synced=0 LIMIT ?", (limit,)).fetchall()
        return [r["key"] for r in rows]

    def mark_memory_synced(self, keys: List[str]) -> None:
        with self._tx() as db:
            db.executemany("UPDATE extractions SET memory_synced=1 WHERE key=?", [(k,) for k in keys])

    # ------------------------------------------------------------ listing

    def list(self, *, account: str = "", category: str = "", needs_action: bool = False,
             include_done: bool = True, limit: int = 200, since: str = "") -> List[dict]:
        q = ("SELECT m.key, m.account, m.folder, m.date, m.from_name, m.from_addr, m.subject, m.bulk, m.owner,"
             " m.done, substr(m.text, 1, 400) AS preview, e.status, e.triage, e.data, e.error"
             " FROM messages m LEFT JOIN extractions e ON e.key=m.key WHERE 1=1")
        args: list = []
        if account:
            q += " AND m.account=?"
            args.append(account)
        if since:
            q += " AND m.date>=?"
            args.append(since)
        if not include_done:
            q += " AND m.done=0"
        q += " ORDER BY m.date DESC LIMIT ?"
        args.append(limit * 3 if (category or needs_action) else limit)
        with self._lock:
            rows = self._db.execute(q, args).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            item["bulk"], item["owner"], item["done"] = bool(r["bulk"]), bool(r["owner"]), bool(r["done"])
            item["extraction"] = json.loads(r["data"]) if r["data"] else None
            del item["data"]
            ex = item["extraction"] or {}
            if category and ex.get("category") != category:
                continue
            if needs_action and not (ex.get("needs_reply") or ex.get("action_items") or ex.get("events")):
                continue
            out.append(item)
        return out[:limit]

    def extracted_since(self, since: str) -> List[dict]:
        """Every successful extraction for mail dated at/after `since` — the planner's input."""
        with self._lock:
            rows = self._db.execute(
                "SELECT m.key, m.account, m.date, m.from_name, m.from_addr, m.subject, m.owner, m.done, e.data"
                " FROM messages m JOIN extractions e ON e.key=m.key"
                " WHERE e.status='done' AND m.date>=? ORDER BY m.date", (since,)).fetchall()
        return [{**dict(r), "owner": bool(r["owner"]), "done": bool(r["done"]),
                 "extraction": json.loads(r["data"])} for r in rows]

    def bodies(self, keys: List[str], limit: int = 2000) -> Dict[str, str]:
        """Raw message text (head only) — the individuation witness reads observations,
        never a model's summary of them."""
        if not keys:
            return {}
        with self._lock:
            rows = self._db.execute(
                f"SELECT key, substr(coalesce(text,''), 1, ?) AS t FROM messages WHERE key IN ({','.join('?' * len(keys))})",
                (limit, *keys)).fetchall()
        return {r["key"]: r["t"] for r in rows}

    def counts(self) -> Dict[str, dict]:
        with self._lock:
            rows = self._db.execute(
                "SELECT m.account, e.status, count(*) AS n FROM messages m"
                " JOIN extractions e ON e.key=m.key GROUP BY m.account, e.status").fetchall()
        out: Dict[str, dict] = {}
        for r in rows:
            out.setdefault(r["account"], {})[r["status"]] = r["n"]
        return out

    # ------------------------------------------------------------ sync state

    def sync_states(self, account: str) -> Dict[str, dict]:
        with self._lock:
            rows = self._db.execute("SELECT folder, state FROM sync_state WHERE account=?", (account,)).fetchall()
        return {r["folder"]: json.loads(r["state"]) for r in rows}

    def save_sync_states(self, account: str, states: Dict[str, dict]) -> None:
        with self._tx() as db:
            db.executemany("INSERT OR REPLACE INTO sync_state (account, folder, state) VALUES (?,?,?)",
                           [(account, f, json.dumps(s)) for f, s in states.items()])

    # ------------------------------------------------------------ markdown mirror

    def md_path(self, m: Message) -> Path:
        return self.md_root / m.account / m.date.strftime("%Y-%m") / f"{m.key.split(':', 1)[1]}.md"

    def write_md(self, m: Message, extraction: Optional[dict]) -> None:
        ex = extraction or {}
        lines = ["---", f"key: {m.key}", f"account: {m.account}", f"folder: {m.folder}",
                 f"date: {m.date.isoformat()}", f"from: {m.from_name} <{m.from_addr}>",
                 f"subject: {m.subject}", "---", "", f"# {m.subject or '(no subject)'}", ""]
        if ex.get("summary"):
            lines += [f"Summary: {ex['summary']}", ""]
        for a in ex.get("action_items") or []:
            lines.append(f"- To do: {a.get('title')}" + (f" (due {a['due']})" if a.get("due") else ""))
        for ev in ex.get("events") or []:
            lines.append(f"- Event: {ev.get('title')} at {ev.get('start')}"
                         + (f", {ev['location']}" if ev.get("location") else ""))
        if ex:
            lines.append("")
        lines.append(m.text)
        from backend.mail import attachments         # attachment text is searchable too
        att = attachments.excerpt_for_md(m.key)
        if att:
            lines += ["", att]
        path = self.md_path(m)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _to_message(row: sqlite3.Row) -> Message:
    return Message(key=row["key"], account=row["account"], folder=row["folder"], uid=row["uid"],
                   message_id=row["message_id"] or "", date=datetime.fromisoformat(row["date"]),
                   from_name=row["from_name"] or "", from_addr=row["from_addr"] or "",
                   to=json.loads(row["to_json"] or "[]"), cc=json.loads(row["cc_json"] or "[]"),
                   subject=row["subject"] or "", text=row["text"] or "", bulk=bool(row["bulk"]),
                   owner=bool(row["owner"]), in_reply_to=row["in_reply_to"] or "")


def _extraction_row(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["data"] = json.loads(d["data"]) if d["data"] else None
    return d
