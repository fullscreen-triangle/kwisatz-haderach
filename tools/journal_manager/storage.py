"""JSON persistence for journal entries."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import date
from pathlib import Path
from typing import Optional

_DATA_DIR = Path(__file__).parent / "data"
_DATA_FILE = _DATA_DIR / "journals.json"


@dataclass
class JournalEntry:
    id: str
    date_received: str                  # ISO date string
    category: str                       # spam | offer | reviewer | editor
    journal_name: str
    publisher: str
    domain: str                         # research domain/subject
    status: str                         # pending | accepted | declined | expired | submitted
    role: str                           # "" | reviewer | associate_editor | editor | board_member
    email_snippet: str                  # first 600 chars of email
    is_doaj_listed: Optional[bool] = None
    doaj_subjects: list[str] = field(default_factory=list)
    free_publication_offered: bool = False
    deadline: str = ""                  # ISO date or ""
    notes: str = ""
    response_sent: bool = False


def _entry_id(journal_name: str, received_date: str) -> str:
    import re
    slug = re.sub(r"[^\w]+", "_", journal_name.lower())[:40].strip("_")
    day = received_date[:10].replace("-", "")
    return f"{day}_{slug}"


def load() -> list[JournalEntry]:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not _DATA_FILE.exists():
        return []
    raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    entries = []
    for item in raw:
        entries.append(JournalEntry(**item))
    return entries


def save(entries: list[JournalEntry]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _DATA_FILE.write_text(
        json.dumps([asdict(e) for e in entries], indent=2),
        encoding="utf-8",
    )


def add(entry: JournalEntry) -> None:
    entries = load()
    # Deduplicate by id
    entries = [e for e in entries if e.id != entry.id]
    entries.insert(0, entry)
    save(entries)


def get(entry_id: str) -> Optional[JournalEntry]:
    for e in load():
        if e.id == entry_id:
            return e
    return None


def update_status(entry_id: str, status: str, notes: str = "") -> bool:
    entries = load()
    for e in entries:
        if e.id == entry_id:
            e.status = status
            if notes:
                e.notes = notes
            save(entries)
            return True
    return False


def make_entry(
    category: str,
    journal_name: str,
    publisher: str,
    domain: str,
    email_text: str,
    is_doaj: Optional[bool] = None,
    doaj_subjects: Optional[list[str]] = None,
    free_pub: bool = False,
    role: str = "",
) -> JournalEntry:
    today = date.today().isoformat()
    eid = _entry_id(journal_name or "unknown", today)
    return JournalEntry(
        id=eid,
        date_received=today,
        category=category,
        journal_name=journal_name,
        publisher=publisher,
        domain=domain,
        status="pending",
        role=role,
        email_snippet=email_text[:600],
        is_doaj_listed=is_doaj,
        doaj_subjects=doaj_subjects or [],
        free_publication_offered=free_pub,
    )
