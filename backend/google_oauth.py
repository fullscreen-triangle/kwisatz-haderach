"""
The one Google OAuth token the node holds (Gmail read + Calendar), shared by the keeper
(liveness), the mail poller (Gmail REST) and the planner (Google Calendar sync).

The files come from the KeePassXC vault via `tools/keeper push`:
  GMAIL_CREDENTIALS_PATH — the OAuth client (installed/web JSON from Google Cloud)
  GMAIL_TOKEN_PATH       — {refresh_token, access_token, expiry_date(ms), scope, ...},
                           the same file web/lib/gmail.js reads
Refreshing rewrites the token file atomically (0600) so every reader sees a live token.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Mapping, Optional, Tuple

import httpx

ROOT = Path(__file__).resolve().parent.parent
TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar"


class GoogleAuthError(Exception):
    """kind: 'missing' (no files), 'rejected' (Google said no — a human must act),
    'transient' (network/5xx — try again later)."""

    def __init__(self, kind: str, detail: str):
        super().__init__(detail)
        self.kind, self.detail = kind, detail


def paths(env: Mapping[str, str]) -> Tuple[Path, Path]:
    return (Path(env.get("GMAIL_CREDENTIALS_PATH") or ROOT / "web" / "credentials.json"),
            Path(env.get("GMAIL_TOKEN_PATH") or ROOT / "web" / ".gmail_token.json"))


def configured(env: Mapping[str, str]) -> bool:
    cred, tok = paths(env)
    return cred.exists() and tok.exists()


def _read(env: Mapping[str, str]) -> Tuple[dict, dict, Path]:
    cred_path, tok_path = paths(env)
    if not cred_path.exists() or not tok_path.exists():
        raise GoogleAuthError("missing", "Gmail OAuth files not on the node — add them to the vault entry and push")
    try:
        creds = json.loads(cred_path.read_text(encoding="utf-8"))
        token = json.loads(tok_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise GoogleAuthError("rejected", f"Gmail OAuth files unreadable: {type(e).__name__}")
    return creds.get("installed") or creds.get("web") or {}, token, tok_path


def granted_scopes(env: Mapping[str, str]) -> set:
    try:
        _, token, _ = _read(env)
    except GoogleAuthError:
        return set()
    return set((token.get("scope") or "").split())


def _write_private(path: Path, data: dict) -> None:
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


async def refresh(client: httpx.AsyncClient, env: Mapping[str, str]) -> dict:
    """Trade the refresh token for a new access token and persist it. Returns
    {access_token, expires_at, root_expires_at} (root = the refresh token's own end,
    only known when Google time-limits it, i.e. a consent screen still in Testing)."""
    client_cfg, token, tok_path = _read(env)
    if not token.get("refresh_token"):
        raise GoogleAuthError("rejected", "token file has no refresh token — run "
                                          "node web/scripts/gmail_auth.js once to re-consent")
    resp = await client.post(TOKEN_URL, data={
        "client_id": client_cfg.get("client_id", ""),
        "client_secret": client_cfg.get("client_secret", ""),
        "refresh_token": token["refresh_token"],
        "grant_type": "refresh_token",
    })
    if resp.status_code in (400, 401):
        err = (resp.json() if resp.headers.get("content-type", "").startswith("application/json")
               else {}).get("error", "")
        if err == "invalid_grant":
            raise GoogleAuthError("rejected", (
                "Google refused the refresh token (invalid_grant). If the consent screen is in "
                "'Testing', tokens die every 7 days — set it to 'In production', then run "
                "node web/scripts/gmail_auth.js once"))
        if err in ("invalid_client", "unauthorized_client"):
            raise GoogleAuthError("rejected", (
                f"Google refused the OAuth client itself ({err}) — the client in credentials.json "
                "was deleted or its secret rotated. Download the current client JSON from Google "
                "Cloud → Credentials, attach it to the vault entry, re-consent, push"))
    if resp.status_code != 200:
        raise GoogleAuthError("transient", f"Google answered HTTP {resp.status_code}; will retry")

    body = resp.json()
    now = datetime.now(timezone.utc)
    expires_in = int(body.get("expires_in", 3600))
    token["access_token"] = body["access_token"]
    token["expiry_date"] = int((now.timestamp() + expires_in) * 1000)  # gmail.js format (ms)
    for k in ("scope", "token_type", "id_token"):
        if k in body:
            token[k] = body[k]
    _write_private(tok_path, token)
    root = (now + timedelta(seconds=int(body["refresh_token_expires_in"]))
            if "refresh_token_expires_in" in body else None)
    return {"access_token": token["access_token"], "expires_at": now + timedelta(seconds=expires_in),
            "root_expires_at": root}


async def access_token(client: httpx.AsyncClient, env: Mapping[str, str]) -> str:
    """A token valid for at least five more minutes, refreshing only when needed."""
    _, token, _ = _read(env)
    if token.get("access_token") and int(token.get("expiry_date") or 0) > (time.time() + 300) * 1000:
        return token["access_token"]
    return (await refresh(client, env))["access_token"]
