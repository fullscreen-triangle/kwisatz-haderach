"""
The KeePassXC database, through pykeepass (reads/writes KDBX 4 directly — no GUI, no
keepassxc-cli argument juggling). The master password comes from getpass or a caller;
it is never stored, logged, or passed on a command line.
"""

from __future__ import annotations

import os
from datetime import timezone
from getpass import getpass
from pathlib import Path
from typing import List, Optional

from tools.keeper.render import GROUP, STANDARD_FIELDS, Item

DEFAULT_VAULT = Path(os.environ.get("KEEPER_VAULT") or Path.home() / "Documents" / "vault.kdbx")


def _pykeepass():
    try:
        import pykeepass
    except ImportError:
        raise SystemExit("pykeepass is missing — run: python -m pip install -r tools/keeper/requirements.txt")
    return pykeepass


def open_vault(path: Path = DEFAULT_VAULT, password: Optional[str] = None,
               keyfile: Optional[str] = None):
    if not path.exists():
        raise SystemExit(f"No vault at {path}. Create it in KeePassXC (or: python -m tools.keeper init), "
                         "or point KEEPER_VAULT at yours.")
    pk = _pykeepass()
    if password is None:
        password = getpass(f"Master password for {path.name}: ")
    try:
        return pk.PyKeePass(str(path), password=password, keyfile=keyfile or os.environ.get("KEEPER_KEYFILE"))
    except pk.exceptions.CredentialsError:
        raise SystemExit("Wrong master password (or key file).")


def create_vault(path: Path, password: str):
    return _pykeepass().create_database(str(path), password=password)


def group(kp, create: bool = False):
    g = kp.find_groups(name=GROUP, first=True)
    if g is None and create:
        g = kp.add_group(kp.root_group, GROUP)
    return g


def read_items(kp) -> List[Item]:
    g = group(kp)
    if g is None:
        return []
    items = []
    for e in kp.find_entries(group=g, recursive=True) or []:
        fields = {"Title": e.title or "", "UserName": e.username or "", "Password": e.password or "",
                  "URL": e.url or "", "Notes": e.notes or ""}
        fields.update({k: v or "" for k, v in (e.custom_properties or {}).items()})
        attachments = {a.filename: a.data for a in e.attachments}
        expires_at = None
        if e.expires and e.expiry_time:
            t = e.expiry_time
            expires_at = t if t.tzinfo else t.replace(tzinfo=timezone.utc)
        items.append(Item(title=e.title or "(untitled)", fields=fields,
                          attachments=attachments, expires_at=expires_at))
    return items


def find_entry(kp, title: str):
    g = group(kp)
    return kp.find_entries(group=g, title=title, first=True) if g else None


def add_entry(kp, title: str, *, keeper_id: str, strategy: str, env_spec: str,
              fields: dict, files: Optional[dict] = None, renew_url: str = ""):
    """Create one convention-following entry. `fields` may hold standard fields
    (UserName/Password/URL/Notes) and custom attributes; custom ones are stored protected."""
    g = group(kp, create=True)
    e = kp.add_entry(g, title, fields.get("UserName", ""), fields.get("Password", ""),
                     url=fields.get("URL") or None, notes=fields.get("Notes") or None)
    for k, v in fields.items():
        if k not in STANDARD_FIELDS:
            e.set_custom_property(k, v, protect=True)
    for k, v in (("KeeperId", keeper_id), ("Strategy", strategy), ("Env", env_spec),
                 ("RenewURL", renew_url)):
        if v:
            e.set_custom_property(k, v)
    for name, data in (files or {}).items():
        e.add_attachment(kp.add_binary(data, compressed=True, protected=True), name)
    if files:
        e.set_custom_property("Files", "; ".join(f"{n}={d}" for n, d in _file_targets(files)))
    return e


def _file_targets(files: dict):
    """Attachment names are chosen by the caller as '<name>' and targeted by FILE_TARGETS."""
    for name in files:
        yield name, FILE_TARGETS.get(name, name)


FILE_TARGETS = {
    "credentials.json": "gmail/credentials.json",
    "gmail_token.json": "gmail/token.json",
    "private-key.pem": "github/private-key.pem",
}
