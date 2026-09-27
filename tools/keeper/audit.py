"""
Leak audit: is any vault value sitting in a git-tracked file? Reports file:line and the
entry/field it matched — never the value. Settings entries (Env="*") and short values
are skipped: "Munich" appearing in a README is not a leak.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Iterable, List, Tuple

from tools.keeper.render import RESERVED, Item

MIN_LEN = 8
MAX_FILE = 5 * 1024 * 1024


def secrets_of(items: Iterable[Item]) -> List[Tuple[str, str, str]]:
    """(value, entry title, field) for every secret-bearing value in the vault group."""
    out = []
    for it in items:
        if it.fields.get("Env", "").strip() == "*":
            continue
        for fld, val in it.fields.items():
            if fld in RESERVED or fld in ("Title", "URL", "Notes"):
                continue
            if fld == "UserName" and "@" in val:
                continue  # a login email is personal, not secret (an access-key ID is)
            if len(val) >= MIN_LEN:
                out.append((val, it.title, fld))
        for name, data in it.attachments.items():
            if name.endswith(".json"):
                try:
                    for key, val in _json_strings(json.loads(data)):
                        if len(val) >= 16 and key not in ("token_uri", "auth_uri", "auth_provider_x509_cert_url",
                                                          "redirect_uris", "scope", "token_type", "project_id"):
                            out.append((val, it.title, f"{name}:{key}"))
                except ValueError:
                    pass
    return out


def _json_strings(obj, key=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _json_strings(v, k)
    elif isinstance(obj, list):
        for v in obj:
            yield from _json_strings(v, key)
    elif isinstance(obj, str):
        yield key, obj


def audit(items: List[Item], repo: Path) -> List[str]:
    tracked = subprocess.run(["git", "-C", str(repo), "ls-files", "-z"],
                             capture_output=True, check=True).stdout.decode().split("\0")
    needles = secrets_of(items)
    findings = []
    for rel in filter(None, tracked):
        path = repo / rel
        try:
            if path.stat().st_size > MAX_FILE:
                continue
            raw = path.read_bytes()
        except OSError:
            continue
        if b"\0" in raw[:8192]:
            continue  # binary
        text = raw.decode("utf-8", errors="ignore")
        for value, title, fld in needles:
            idx = text.find(value)
            if idx >= 0:
                line = text.count("\n", 0, idx) + 1
                findings.append(f"{rel}:{line}  holds '{title}' {fld}")
    return findings
