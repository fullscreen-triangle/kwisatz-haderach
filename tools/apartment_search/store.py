"""
JSON store for the apartment search. One file, human-editable.

Mirrors tools/jobcenter_tracker: no database, no migration, and the file stays
readable so a bad row can be fixed by hand.
"""

from __future__ import annotations

import json
import uuid
from datetime import date
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
STORE_FILE = DATA_DIR / "search.json"

STATUSES = ("saved", "contacted", "viewing", "applied", "offered", "rejected", "withdrawn", "signed")
ACTIVE_STATUSES = ("saved", "contacted", "viewing", "applied", "offered")


def _empty() -> dict:
    return {"listings": [], "viewings": [], "deadlines": [], "dossier": {}, "notes": []}


def load() -> dict:
    if not STORE_FILE.exists():
        return _empty()
    data = json.loads(STORE_FILE.read_text(encoding="utf-8"))
    for key, default in _empty().items():
        data.setdefault(key, default)
    return data


def save(data: dict) -> None:
    STORE_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def new_id() -> str:
    return uuid.uuid4().hex[:10]


def add_listing(entry: dict) -> dict:
    data = load()
    entry.setdefault("id", new_id())
    entry.setdefault("status", "saved")
    entry.setdefault("added", date.today().isoformat())
    # Same URL twice is a re-check, not a second flat.
    if entry.get("url"):
        for existing in data["listings"]:
            if existing.get("url") == entry["url"]:
                existing.update({k: v for k, v in entry.items() if k not in ("id", "status", "added")})
                save(data)
                return existing
    data["listings"].append(entry)
    save(data)
    return entry


def update_listing(listing_id: str, **fields) -> dict | None:
    data = load()
    for entry in data["listings"]:
        if entry["id"] == listing_id:
            entry.update(fields)
            save(data)
            return entry
    return None


def delete_listing(listing_id: str) -> bool:
    data = load()
    before = len(data["listings"])
    data["listings"] = [e for e in data["listings"] if e["id"] != listing_id]
    data["viewings"] = [v for v in data["viewings"] if v.get("listing_id") != listing_id]
    save(data)
    return len(data["listings"]) < before
