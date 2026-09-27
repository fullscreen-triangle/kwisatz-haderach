"""
Real drafts in a real mailbox — the one place this system writes to mail, and it still
never sends. A draft (body + attachments, optionally a reply with threading headers) is
APPENDed to the account's Drafts folder with the \\Draft flag, so it shows up in the
groupware, Outlook and the phone's mail app, ready for Kundai to check and send himself.

The Drafts folder is found by its RFC 6154 \\Drafts flag, else by its usual names (IMAP
names are modified UTF-7: "Entwürfe" is "Entw&APw-rfe").
"""

from __future__ import annotations

import imaplib
import time
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from typing import List, Optional, Tuple

from backend.mail import imap
from backend.mail.accounts import Account

DRAFT_NAMES = ("drafts", "entw&apw-rfe", "entwürfe", "inbox.drafts", "inbox/drafts", "draft")
MAX_TOTAL = 20 * 1024 * 1024


def build(acct: Account, to: List[str], subject: str, body: str,
          attachments: List[Tuple[str, str, bytes]] = (), in_reply_to: str = "",
          cc: List[str] = ()) -> EmailMessage:
    total = sum(len(a[2]) for a in attachments)
    if total > MAX_TOTAL:
        raise ValueError(f"attachments total {total // 1024 // 1024} MB — mail servers refuse above ~20 MB")
    msg = EmailMessage()
    msg["From"] = (acct.addresses[0] if acct.addresses else acct.user)
    if to:
        msg["To"] = ", ".join(to)
    if cc:
        msg["Cc"] = ", ".join(cc)
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=(msg["From"].split("@")[-1] or "localhost"))
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg.set_content(body or "")
    for name, ctype, data in attachments:
        maintype, _, subtype = (ctype or "application/octet-stream").partition("/")
        msg.add_attachment(data, maintype=maintype, subtype=subtype or "octet-stream", filename=name)
    return msg


def drafts_folder(conn) -> str:
    typ, data = conn.list()
    if typ != "OK":
        raise imap.ImapError("transient", "could not list the mailbox's folders")
    named = None
    for line in data or []:
        m = imap._LIST.match(line or b"")
        if not m:
            continue
        name = imap._unquote(m.group("name"))
        if b"\\Drafts" in m.group("flags"):
            return name
        if named is None and name.lower() in DRAFT_NAMES:
            named = name
    if named:
        return named
    raise imap.ImapError("transient", "this mailbox has no Drafts folder")


def append(acct: Account, msg: EmailMessage) -> str:
    """Put the draft in the account's Drafts folder (blocking; run in a thread). Returns the folder."""
    conn = imap.connect(acct)
    try:
        folder = drafts_folder(conn)
        typ, data = conn.append(imap._quote(folder), r"(\Draft \Seen)",
                                imaplib.Time2Internaldate(time.time()), msg.as_bytes())
        if typ != "OK":
            raise imap.ImapError("transient", f"the server refused the draft: {data}")
        return folder
    finally:
        imap._close(conn)


def pick_account(accounts: List[Account], want: str = "") -> Optional[Account]:
    """The named IMAP account, else the first one (the university mailbox)."""
    imaps = [a for a in accounts if a.kind == "imap"]
    want = want.strip().lower()
    return next((a for a in imaps if a.id == want), None) or (imaps[0] if imaps else None)
