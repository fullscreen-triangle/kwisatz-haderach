"""
GitHub App installation tokens — the reason GitHub needs no expiry tracking at all.

A personal access token cannot be renewed by software. A GitHub App can: its private key
(held in the vault, pushed to the node) signs a 9-minute JWT, which buys a 1-hour
installation token. We mint a fresh one whenever the current token is within
REMINT_BEFORE of expiry, so consumers always find a live token in the minted file.

The minted token is a leaf: it lives only on the node, at
  <state>/minted/GITHUB_TOKEN        (0600, the token itself)
  <state>/minted/GITHUB_TOKEN.json   (value-free: expires_at)
and consumers read it via web/lib/credentials.js::githubToken() or
tools/github_manager/inventory.py::get_token().
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Tuple

import httpx

GITHUB_API = "https://api.github.com"
REMINT_BEFORE = timedelta(minutes=10)
_HEADERS = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}


def minted_paths(state_dir: Path) -> Tuple[Path, Path]:
    d = state_dir / "minted"
    return d / "GITHUB_TOKEN", d / "GITHUB_TOKEN.json"


def read_minted(state_dir: Path) -> Tuple[Optional[str], Optional[datetime]]:
    """Return (token, expires_at) of the currently minted token, or (None, None)."""
    tok_path, meta_path = minted_paths(state_dir)
    try:
        token = tok_path.read_text(encoding="utf-8").strip()
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        return (token or None), _parse_iso(meta.get("expires_at"))
    except (OSError, ValueError):
        return None, None


def needs_remint(expires_at: Optional[datetime], now: Optional[datetime] = None) -> bool:
    now = now or datetime.now(timezone.utc)
    return expires_at is None or expires_at - now <= REMINT_BEFORE


def app_jwt(app_id: str, private_key_pem: str) -> str:
    """The short-lived JWT GitHub accepts from the App itself. iat is backdated 60 s to
    absorb clock drift; GitHub rejects exp more than 10 minutes out."""
    import jwt  # pyjwt[crypto]; imported lazily so the rest of keeper runs without it

    now = int(time.time())
    return jwt.encode({"iat": now - 60, "exp": now + 540, "iss": str(app_id)},
                      private_key_pem, algorithm="RS256")


async def mint(client: httpx.AsyncClient, app_id: str, installation_id: str,
               private_key_pem: str, state_dir: Path) -> datetime:
    """Mint an installation token, write it atomically (0600), return its expiry.
    Raises httpx.HTTPStatusError if GitHub refuses."""
    resp = await client.post(
        f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
        headers={**_HEADERS, "Authorization": f"Bearer {app_jwt(app_id, private_key_pem)}"},
    )
    resp.raise_for_status()
    body = resp.json()
    expires_at = _parse_iso(body["expires_at"])
    tok_path, meta_path = minted_paths(state_dir)
    _write_private(tok_path, body["token"])
    _write_private(meta_path, json.dumps({"expires_at": expires_at.isoformat()}))
    return expires_at


def _write_private(path: Path, text: str) -> None:
    """Write via a sibling temp file created 0600, then atomic replace — a reader never
    sees a half-written token and the file is never briefly world-readable."""
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        path.parent.chmod(0o700)
    except OSError:
        pass
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
