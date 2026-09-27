"""
Mail accounts, discovered from the environment the vault push writes — no separate list
to keep in sync. Gmail exists when its OAuth files do; an IMAP account `<id>` exists when
MAIL_<ID>_HOST is set (e.g. MAIL_UNI_HOST, MAIL_WEBMAIL_HOST).

  MAIL_<ID>_HOST      imap.uni-greifswald.de
  MAIL_<ID>_PORT      143 (starttls) / 993 (ssl) — defaulted from SECURITY
  MAIL_<ID>_SECURITY  starttls | ssl
  MAIL_<ID>_USER      login name
  MAIL_<ID>_PASSWORD  password (only ever from the vault)
  MAIL_<ID>_ADDRESS   the address mail is sent from (defaults to USER if it has an @)
  MAIL_<ID>_LABEL     how the inbox names it (defaults to the id)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Mapping

from backend import google_oauth

_HOST = re.compile(r"^MAIL_([A-Z0-9]+)_HOST$")


@dataclass(frozen=True)
class Account:
    id: str
    kind: str                         # "gmail" | "imap"
    label: str
    host: str = ""
    port: int = 0
    security: str = "ssl"
    user: str = field(default="", repr=False)
    password: str = field(default="", repr=False)
    addresses: tuple = ()             # the owner's own addresses on this account


def discover(env: Mapping[str, str]) -> List[Account]:
    accounts: List[Account] = []
    if google_oauth.configured(env):
        own = tuple(a.strip().lower() for a in env.get("MAIL_GMAIL_ADDRESS", "").split(",") if a.strip())
        accounts.append(Account(id="gmail", kind="gmail", label=env.get("MAIL_GMAIL_LABEL", "Gmail"),
                                addresses=own))
    for key in sorted(env):
        m = _HOST.match(key)
        if not m or m.group(1) == "GMAIL":
            continue
        up = m.group(1)
        sec = (env.get(f"MAIL_{up}_SECURITY") or "ssl").lower()
        user = env.get(f"MAIL_{up}_USER", "")
        address = env.get(f"MAIL_{up}_ADDRESS") or (user if "@" in user else "")
        accounts.append(Account(
            id=up.lower(), kind="imap", label=env.get(f"MAIL_{up}_LABEL") or up.title(),
            host=env[key], port=int(env.get(f"MAIL_{up}_PORT") or (143 if sec == "starttls" else 993)),
            security=sec, user=user, password=env.get(f"MAIL_{up}_PASSWORD", ""),
            addresses=tuple(a.strip().lower() for a in address.split(",") if a.strip())))
    return accounts


def owner_addresses(accounts: List[Account]) -> set:
    return {a for acct in accounts for a in acct.addresses}
