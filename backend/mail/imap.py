"""
IMAP reader (stdlib imaplib; run it in a thread). Two guarantees:

  * it never changes anything on the server — folders are opened with EXAMINE
    (select readonly=True) and bodies fetched with BODY.PEEK[], so read/unread flags
    in Thunderbird, the webmail and the phone stay exactly as they were;
  * it is incremental — per folder it remembers UIDVALIDITY and the highest UID seen.
    A changed UIDVALIDITY (the server renumbered the folder) means start over from
    the backfill window; the store's dedup on Message-ID absorbs the repeats.
"""

from __future__ import annotations

import imaplib
import re
import ssl
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, List, Optional, Tuple

from backend.mail.accounts import Account
from backend.mail import attachments
from backend.mail.parse import Message, parse_bytes

BATCH = 25
SENT_NAMES = ("sent", "sent items", "sent messages", "gesendet", "gesendete objekte",
              "gesendete elemente", "gesendete nachrichten", "inbox.sent", "inbox/sent")
_LIST = re.compile(rb'\((?P<flags>[^)]*)\) (?P<delim>"[^"]*"|NIL) (?P<name>.+)$')


class ImapError(Exception):
    """kind: 'auth' (credentials refused) or 'transient' (network, server trouble)."""

    def __init__(self, kind: str, detail: str):
        super().__init__(detail)
        self.kind, self.detail = kind, detail


def connect(acct: Account, timeout: float = 30) -> imaplib.IMAP4:
    ctx = ssl.create_default_context()
    try:
        if acct.security == "ssl":
            conn = imaplib.IMAP4_SSL(acct.host, acct.port, ssl_context=ctx, timeout=timeout)
        else:
            conn = imaplib.IMAP4(acct.host, acct.port, timeout=timeout)
            conn.starttls(ssl_context=ctx)
    except (OSError, imaplib.IMAP4.error) as e:
        raise ImapError("transient", f"could not reach {acct.host}:{acct.port} ({type(e).__name__})")
    try:
        conn.login(acct.user, acct.password)
    except imaplib.IMAP4.error:
        _close(conn)
        raise ImapError("auth", f"{acct.host} refused the login for {acct.user}")
    return conn


def _close(conn) -> None:
    try:
        conn.logout()
    except Exception:
        pass


def _unquote(name: bytes) -> str:
    name = name.strip()
    if name.startswith(b'"') and name.endswith(b'"'):
        name = name[1:-1].replace(b'\\"', b'"')
    return name.decode("utf-8", errors="replace")


def folders(conn) -> List[str]:
    """INBOX plus the Sent folder (RFC 6154 \\Sent flag first, then common names).
    Sent matters: commitments Kundai made ("I'll send it by Friday") are tasks too."""
    typ, data = conn.list()
    if typ != "OK":
        return ["INBOX"]
    sent_flagged, sent_named = None, None
    for line in data or []:
        m = _LIST.match(line or b"")
        if not m:
            continue
        name = _unquote(m.group("name"))
        if b"\\Sent" in m.group("flags"):
            sent_flagged = sent_flagged or name
        elif name.lower() in SENT_NAMES:
            sent_named = sent_named or name
    sent = sent_flagged or sent_named
    return ["INBOX"] + ([sent] if sent else [])


def _quote(name: str) -> str:
    return '"' + name.replace("\\", "\\\\").replace('"', '\\"') + '"'


def fetch_folder(conn, folder: str, state: Optional[dict], backfill_days: int,
                 parse: Callable[[bytes, str, str], Message]) -> Tuple[List[Message], dict]:
    """Return (new messages, new state) for one folder. `state` = {uidvalidity, last_uid}."""
    typ, _ = conn.select(_quote(folder), readonly=True)          # EXAMINE: flags untouched
    if typ != "OK":
        return [], state or {}
    uv_raw = (conn.response("UIDVALIDITY")[1] or [b"0"])[0]
    uidvalidity = int(uv_raw) if uv_raw else 0

    if state and state.get("uidvalidity") == uidvalidity:
        last = int(state.get("last_uid", 0))
        typ, data = conn.uid("SEARCH", None, f"UID {last + 1}:*")
    else:
        last = 0
        since = (datetime.now(timezone.utc) - timedelta(days=backfill_days)).strftime("%d-%b-%Y")
        typ, data = conn.uid("SEARCH", None, "SINCE", since)
    uids = [int(u) for u in (data[0].split() if typ == "OK" and data and data[0] else [])]
    uids = sorted(u for u in uids if u > last)       # "N:*" always returns the last UID
    if not uids:
        return [], {"uidvalidity": uidvalidity, "last_uid": last}

    out: List[Message] = []
    for i in range(0, len(uids), BATCH):
        batch = uids[i:i + BATCH]
        typ, data = conn.uid("FETCH", ",".join(map(str, batch)), "(UID BODY.PEEK[])")
        if typ != "OK":
            continue
        for item in data or []:
            if not isinstance(item, tuple):
                continue
            head, raw = item
            m = re.search(rb"UID (\d+)", head)
            if m and raw:
                out.append(parse(raw, folder, m.group(1).decode()))
    return out, {"uidvalidity": uidvalidity, "last_uid": max(uids)}


def fetch_new(acct: Account, states: Dict[str, dict], backfill_days: int,
              owner_addrs) -> Tuple[List[Message], Dict[str, dict]]:
    """One polling pass over INBOX + Sent. Raises ImapError."""
    conn = connect(acct)
    try:
        new_states: Dict[str, dict] = {}
        messages: List[Message] = []

        def parse(raw: bytes, folder: str, uid: str) -> Message:
            m = parse_bytes(raw, account=acct.id, folder="Sent" if folder != "INBOX" else "INBOX",
                            uid=f"{folder}/{uid}", owner_addrs=owner_addrs)
            attachments.save(m.key, raw)          # the raw bytes are in hand only now
            return m

        for folder in folders(conn):
            got, new_states[folder] = fetch_folder(conn, folder, states.get(folder), backfill_days, parse)
            messages.extend(got)
        return messages, new_states
    except (OSError, imaplib.IMAP4.error, imaplib.IMAP4.abort) as e:
        raise ImapError("transient", f"{acct.host}: {type(e).__name__}")
    finally:
        _close(conn)


def check_login(acct: Account) -> None:
    """Keeper probe: log in, NOOP, log out. Raises ImapError."""
    conn = connect(acct)
    try:
        conn.noop()
    finally:
        _close(conn)
