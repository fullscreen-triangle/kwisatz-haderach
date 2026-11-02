"""
Your forge accounts' tokens, from where tracker keeps them: KeePassXC's "Git" group.

tracker (bloodhound/thrust/tracker) holds one entry per forge account there — URL
https://<host>, the account's username, a personal access token as the password — and
lists the accounts, without secrets, in ~/.tracker/profile.toml. The keeper reads both and
sends each token to the server as FORGE_<ID>_{TOKEN,USER,URL,KIND}, so the desk can list
your repositories on every forge and probe each token. Entries tracker keeps for model API
keys (username `api-key`) are never sent.

Nothing is written to the Git group: tracker stays the one that sets and rotates these.
"""

from __future__ import annotations

import os
import tomllib
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

from tools.keeper.render import Item

GIT_GROUP = "Git"
PROFILE = Path(os.environ.get("TRACKER_PROFILE") or Path.home() / ".tracker" / "profile.toml")


def accounts(path: Path = PROFILE) -> Dict[str, dict]:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError):
        return {}
    return {aid: {"kind": a.get("kind", ""), "host": a.get("host", ""), "user": a.get("user", "")}
            for aid, a in (data.get("accounts") or {}).items() if a.get("host")}


def _host(url: str) -> str:
    url = (url or "").strip()
    return (urlparse(url if "://" in url else f"https://{url}").hostname or "").lower()


def items(kp, accts: Optional[Dict[str, dict]] = None) -> List[Item]:
    accts = accounts() if accts is None else accts
    g = kp.find_groups(name=GIT_GROUP, first=True)
    if g is None or not accts:
        return []
    entries = [e for e in (kp.find_entries(group=g, recursive=True) or []) if (e.username or "") != "api-key"]
    out = []
    for aid, a in sorted(accts.items()):
        host = a["host"].lower()
        same_host = [e for e in entries if _host(e.url) == host and e.password]
        e = next((e for e in same_host if (e.username or "") == a["user"]), None) or (same_host[0] if len(same_host) == 1 else None)
        if e is None:
            continue
        up = "".join(ch if ch.isalnum() else "_" for ch in aid).upper()
        expires_at = None
        if e.expires and e.expiry_time:
            from datetime import timezone
            t = e.expiry_time
            expires_at = t if t.tzinfo else t.replace(tzinfo=timezone.utc)
        out.append(Item(title=f"Forge · {aid}", expires_at=expires_at, fields={
            "Title": f"Forge · {aid}", "UserName": e.username or a["user"], "Password": e.password,
            "URL": f"https://{host}", "Notes": "", "Kind": a["kind"], "KeeperId": f"forge-{aid}",
            "Env": f"Password=FORGE_{up}_TOKEN; UserName=FORGE_{up}_USER; URL=FORGE_{up}_URL; Kind=FORGE_{up}_KIND"}))
    return out
