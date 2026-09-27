"""
Raw RFC 822 bytes -> one normalized Message. IMAP (BODY.PEEK[]) and Gmail (format=raw)
both hand us the same bytes, so there is exactly one parser.
"""

from __future__ import annotations

import email
import email.policy
import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import getaddresses, parseaddr, parsedate_to_datetime
from typing import Iterable, List, Optional

MAX_TEXT = 20_000


@dataclass
class Message:
    key: str                     # stable id: account + hash(Message-ID or folder/uid)
    account: str
    folder: str                  # "INBOX" | "Sent" | provider folder name
    uid: str
    message_id: str
    date: datetime
    from_name: str
    from_addr: str
    to: List[str] = field(default_factory=list)
    cc: List[str] = field(default_factory=list)
    subject: str = ""
    text: str = ""
    bulk: bool = False           # List-Unsubscribe / Precedence: bulk — newsletters, not people
    owner: bool = False          # written by Kundai (sender is one of his addresses)
    in_reply_to: str = ""


def message_key(account: str, message_id: str, folder: str, uid: str) -> str:
    basis = message_id or f"{folder}/{uid}"
    return f"{account}:{hashlib.sha1(basis.encode('utf-8', 'replace')).hexdigest()[:16]}"


def html_to_text(html: str) -> str:
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "head"]):
            tag.decompose()
        text = soup.get_text("\n")
    except Exception:
        text = re.sub(r"<[^>]+>", " ", html)
    return text


def _clean(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\xa0", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:MAX_TEXT]


def _body(msg) -> str:
    part = msg.get_body(preferencelist=("plain", "html"))
    if part is None:
        return ""
    try:
        content = part.get_content()
    except (LookupError, UnicodeError, AssertionError):
        raw = part.get_payload(decode=True) or b""
        content = raw.decode("utf-8", errors="replace")
    if part.get_content_type() == "text/html":
        content = html_to_text(content)
    return _clean(content)


def _date(msg) -> datetime:
    try:
        d = parsedate_to_datetime(msg["date"])
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError, IndexError):
        return datetime.now(timezone.utc)


def parse_bytes(raw: bytes, *, account: str, folder: str, uid: str,
                owner_addrs: Iterable[str] = ()) -> Message:
    msg = email.message_from_bytes(raw, policy=email.policy.default)
    from_name, from_addr = parseaddr(str(msg.get("from", "")))
    message_id = str(msg.get("message-id", "")).strip()
    owners = {a.lower() for a in owner_addrs}
    precedence = str(msg.get("precedence", "")).lower()
    return Message(
        key=message_key(account, message_id, folder, uid),
        account=account, folder=folder, uid=str(uid), message_id=message_id,
        date=_date(msg),
        from_name=from_name.strip(), from_addr=from_addr.strip().lower(),
        to=[a.lower() for _, a in getaddresses([str(v) for v in msg.get_all("to", [])]) if a],
        cc=[a.lower() for _, a in getaddresses([str(v) for v in msg.get_all("cc", [])]) if a],
        subject=str(msg.get("subject", "")).strip(),
        text=_body(msg),
        bulk=bool(msg.get("list-unsubscribe")) or precedence in ("bulk", "list", "junk"),
        owner=from_addr.strip().lower() in owners,
        in_reply_to=str(msg.get("in-reply-to", "")).strip(),
    )
