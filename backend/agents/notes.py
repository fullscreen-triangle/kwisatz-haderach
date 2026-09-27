"""
Notes and reply drafts written by agents (or by Kundai through a command).

  <state>/notes/<id>.md   front-matter (title, kind: note|draft, created, ref) + body
  <state>/notes/.spraypaint/   pins spraypaint's root here so notes are searchable

A draft is only text: nothing here can send mail.
"""

from __future__ import annotations

import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from backend.keeper.service import state_dir

_lock = threading.Lock()


def notes_dir() -> Path:
    d = state_dir() / "notes"
    (d / ".spraypaint").mkdir(parents=True, exist_ok=True)
    return d


def _slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:48] or "note"


def write(title: str, body: str, kind: str = "note", ref: str = "") -> dict:
    now = datetime.now(timezone.utc)
    with _lock:
        d = notes_dir()
        nid = f"{now:%Y%m%d-%H%M%S}-{_slug(title)}"
        text = "\n".join(["---", f"title: {title}", f"kind: {kind}", f"created: {now.isoformat(timespec='seconds')}",
                          f"ref: {ref}", "---", "", f"# {title}", "", body.strip(), ""])
        (d / f"{nid}.md").write_text(text, encoding="utf-8")
    try:
        from backend.mail import search
        search.reindex(notes_dir(), timeout=120)
    except Exception:
        pass
    return {"id": nid, "title": title, "kind": kind, "created": now.isoformat(timespec="seconds"), "ref": ref}


def _parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    meta, body = {}, raw
    if raw.startswith("---"):
        head, _, body = raw[3:].partition("\n---")
        for line in head.strip().splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
    return {"id": path.stem, "title": meta.get("title", path.stem), "kind": meta.get("kind", "note"),
            "created": meta.get("created", ""), "ref": meta.get("ref", ""), "body": body.lstrip("\n")}


def list_notes(limit: int = 50) -> List[dict]:
    files = sorted(notes_dir().glob("*.md"), reverse=True)[:limit]
    return [{k: v for k, v in _parse(f).items() if k != "body"} for f in files]


def get(nid: str) -> Optional[dict]:
    if not re.fullmatch(r"[A-Za-z0-9._-]+", nid):
        return None
    p = notes_dir() / f"{nid}.md"
    return _parse(p) if p.exists() else None


def version() -> float:
    d = notes_dir()
    return max([p.stat().st_mtime for p in d.glob("*.md")] or [0.0])
