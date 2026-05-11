"""JSON persistence for document records."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Optional

from .documents import DocumentRecord, DOCUMENT_TYPES

_DATA_DIR = Path(__file__).parent / "data"
_DATA_FILE = _DATA_DIR / "documents.json"


def _date_or_none(value: Optional[str]) -> Optional[date]:
    return date.fromisoformat(value) if value else None


def _date_str(d: Optional[date]) -> Optional[str]:
    return d.isoformat() if d else None


def load() -> dict[str, DocumentRecord]:
    """Load all records. Creates default records if file doesn't exist."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not _DATA_FILE.exists():
        records = {tid: DocumentRecord(type_id=tid) for tid in DOCUMENT_TYPES}
        save(records)
        return records

    with _DATA_FILE.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    records: dict[str, DocumentRecord] = {}
    for tid in DOCUMENT_TYPES:
        entry = raw.get(tid, {})
        records[tid] = DocumentRecord(
            type_id=tid,
            expiry_date=_date_or_none(entry.get("expiry_date")),
            status=entry.get("status", "active"),
            renewal_started=_date_or_none(entry.get("renewal_started")),
            submitted_date=_date_or_none(entry.get("submitted_date")),
            received_date=_date_or_none(entry.get("received_date")),
            notes=entry.get("notes", ""),
        )
    return records


def save(records: dict[str, DocumentRecord]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload = {}
    for tid, rec in records.items():
        payload[tid] = {
            "expiry_date": _date_str(rec.expiry_date),
            "status": rec.status,
            "renewal_started": _date_str(rec.renewal_started),
            "submitted_date": _date_str(rec.submitted_date),
            "received_date": _date_str(rec.received_date),
            "notes": rec.notes,
        }
    with _DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
