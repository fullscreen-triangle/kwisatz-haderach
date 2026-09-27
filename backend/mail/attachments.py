"""
Mail attachments: kept on disk, their text extracted, summarised on demand.

  <state>/mail/attachments/<account>/<id>/meta.json     [{name, type, size, chars}]
  <state>/mail/attachments/<account>/<id>/<n>.bin        the file as received
  <state>/mail/attachments/<account>/<id>/<n>.txt        extracted text (PDF, DOCX, text, HTML)
  <state>/mail/attachments/<account>/<id>/<n>.summary.md cached summary (made by an agent)

New mail: `save(key, raw)` is called by the pollers with the raw RFC 822 bytes they
already hold. Older mail (fetched before attachments were kept): `ensure(key)` fetches
that one message again — read-only (EXAMINE + BODY.PEEK) for IMAP, format=raw for Gmail.
Images and other binaries are listed but have no text; there is no OCR.
"""

from __future__ import annotations

import email
import email.policy
import io
import json
import re
from pathlib import Path
from typing import List, Optional

from backend.keeper.service import state_dir
from backend.text_extract import MAX_TEXT, text_of  # noqa: F401  (re-exported)

MAX_FILE = 25 * 1024 * 1024


def _dir(key: str) -> Path:
    account, _, mid = key.partition(":")
    return state_dir() / "mail" / "attachments" / re.sub(r"[^a-z0-9]", "", account) / re.sub(r"[^a-f0-9]", "", mid)


def _safe_name(name: str) -> str:
    return re.sub(r"[^\w.\- ()]+", "_", name).strip() or "attachment"


def save(key: str, raw: bytes) -> List[dict]:
    """Store every attachment of a raw message; returns the metadata (empty if none)."""
    msg = email.message_from_bytes(raw, policy=email.policy.default)
    found = []
    for part in msg.iter_attachments():
        name = part.get_filename() or ""
        ctype = part.get_content_type()
        if not name and ctype.startswith("text/"):
            continue                       # an inline alternative body, not a file
        try:
            data = part.get_payload(decode=True) or b""
        except Exception:
            continue
        if not data or len(data) > MAX_FILE:
            continue
        found.append((_safe_name(name or f"part.{ctype.split('/')[-1]}"), ctype, data))
    if not found:
        return []
    d = _dir(key)
    d.mkdir(parents=True, exist_ok=True)
    meta = []
    for i, (name, ctype, data) in enumerate(found):
        (d / f"{i}.bin").write_bytes(data)
        text = text_of(data, ctype, name)
        (d / f"{i}.txt").write_text(text, encoding="utf-8")
        meta.append({"n": i, "name": name, "type": ctype, "size": len(data), "chars": len(text)})
    (d / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    return meta


def listing(key: str) -> Optional[List[dict]]:
    """Metadata if we have looked at this message's attachments, else None."""
    p = _dir(key) / "meta.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except ValueError:
        return None


def text(key: str, n: int) -> str:
    p = _dir(key) / f"{n}.txt"
    return p.read_text(encoding="utf-8") if p.exists() else ""


def raw(key: str, n: int) -> Optional[bytes]:
    """The file as received — for forwarding it as an attachment of a new draft."""
    p = _dir(key) / f"{n}.bin"
    return p.read_bytes() if p.exists() else None


def summary(key: str, n: int) -> Optional[str]:
    p = _dir(key) / f"{n}.summary.md"
    return p.read_text(encoding="utf-8") if p.exists() else None


def save_summary(key: str, n: int, md: str) -> None:
    (_dir(key) / f"{n}.summary.md").write_text(md, encoding="utf-8")


def excerpt_for_md(key: str, per_file: int = 4000) -> str:
    """What the markdown mirror appends so search and the RAG see attachment text."""
    meta = listing(key) or []
    parts = []
    for a in meta:
        t = text(key, a["n"]).strip()
        parts.append(f"## Attachment: {a['name']}\n\n{t[:per_file] if t else '(no text)'}")
    return "\n\n".join(parts)


def _imap_raw(acct, folder: str, uid: str) -> Optional[bytes]:
    from backend.mail import imap
    conn = imap.connect(acct)
    try:
        typ, _ = conn.select(imap._quote(folder), readonly=True)       # EXAMINE: flags untouched
        if typ != "OK":
            return None
        typ, data = conn.uid("FETCH", uid, "(BODY.PEEK[])")
        for item in data or []:
            if isinstance(item, tuple) and item[1]:
                return item[1]
        return None
    finally:
        imap._close(conn)


async def _raw_again(key: str) -> Optional[bytes]:
    """Fetch one stored message's raw bytes again (read-only)."""
    import asyncio
    import base64
    import httpx
    from backend import google_oauth
    from backend.mail import accounts
    from backend.mail.service import MAIL
    m = MAIL.store.get_message(key)
    if m is None:
        return None
    folder, _, uid = m.uid.rpartition("/")
    if m.account == "gmail":
        async with httpx.AsyncClient(timeout=60) as c:
            token = await google_oauth.access_token(c, MAIL.env)
            r = await c.get(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{uid}",
                            params={"format": "raw"}, headers={"Authorization": f"Bearer {token}"})
            r.raise_for_status()
            return base64.urlsafe_b64decode(r.json()["raw"] + "===")
    acct = next((a for a in accounts.discover(MAIL.env) if a.id == m.account), None)
    return await asyncio.to_thread(_imap_raw, acct, folder, uid) if acct else None


async def ensure(key: str) -> List[dict]:
    """Attachments of a message, fetching the message again if it predates this module."""
    got = listing(key)
    if got is not None:
        return got
    raw = await _raw_again(key)
    if raw is None:
        return []
    meta = save(key, raw)
    if not meta:                            # remember "none" so we don't refetch every time
        d = _dir(key)
        d.mkdir(parents=True, exist_ok=True)
        (d / "meta.json").write_text("[]", encoding="utf-8")
    return meta
