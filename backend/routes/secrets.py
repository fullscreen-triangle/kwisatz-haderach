"""
secrets — Agent Smith's credential store + loader.

The problem this solves: the backend reads every credential with os.getenv(...)
(GARMIN_EMAIL, GITHUB_TOKEN, AMAZON_*, ...). On Render those come from render.yaml's
envVars. But on the Chromebook node there is no Render — nothing exports them into the
process — so os.getenv returns None and every desk integration silently looks "expired"
when in fact the value was never present. This module is the missing piece:

  1. STORE   — secrets live in backend/.agent_smith/secrets.env on the node, one KEY=value
               per line, chmod 600, gitignored. Written only via the CLI (manage-secrets.sh),
               never over HTTP.
  2. LOAD    — load_into_environ() reads that file into os.environ. main.py calls it at
               startup BEFORE the routers import, so the existing os.getenv(...) calls just
               work. Existing real env vars always win (never overwritten) — Render/shell
               export stays authoritative.
  3. INSPECT — status() reports, per known key, whether it is set and how long the value is.
               NEVER the value itself. That is all the phone/status endpoint ever sees.

OAuth credentials (Gmail) are deliberately NOT handled here: the thing that expires there
is an access/refresh token minted by a consent flow, not a paste-able string. That is a
separate module. This one is for static secrets you can set by value.
"""

import os
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter

router = APIRouter()

ROOT = Path(__file__).parent.parent.parent
_STATE_DIR = ROOT / "backend" / ".agent_smith"
_SECRETS_FILE = _STATE_DIR / "secrets.env"

# The credentials the desk expects. Registry so `list` / status can show what SHOULD be
# present and flag what's missing — turning "are my keys stale?" into one glance. Config
# knobs (OLLAMA_*, NAV_ROOTS, FACTS_REFRESH_DAYS) are intentionally excluded: not secrets.
KNOWN_KEYS: List[Dict[str, str]] = [
    {"key": "ANTHROPIC_API_KEY", "desc": "Anthropic API (web app / Claude calls)"},
    {"key": "GITHUB_TOKEN",      "desc": "GitHub API (repo inventory for facts)"},
    {"key": "GARMIN_EMAIL",      "desc": "Garmin Connect login (health route)"},
    {"key": "GARMIN_PASSWORD",   "desc": "Garmin Connect password (health route)"},
    {"key": "AMAZON_ACCESS_KEY", "desc": "Amazon PA API (grocery prices)"},
    {"key": "AMAZON_SECRET_KEY", "desc": "Amazon PA API secret"},
    {"key": "AMAZON_PARTNER_TAG","desc": "Amazon PA API partner tag"},
]
_KNOWN_SET = {k["key"] for k in KNOWN_KEYS}


# ----------------------------------------------------------------- file <-> dict

def _parse_env(text: str) -> Dict[str, str]:
    """Parse KEY=value lines. Ignores blanks and #comments; strips optional quotes."""
    out: Dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or \
           (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        if key:
            out[key] = val
    return out


def read_secrets_file() -> Dict[str, str]:
    """Return the stored secrets as a dict (empty if the file doesn't exist)."""
    try:
        return _parse_env(_SECRETS_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError):
        return {}


def write_secret(key: str, value: str) -> None:
    """Set (or replace) one secret in the file. Creates the file 0600 if needed.
    Rewrites the whole file so a replaced key doesn't leave a stale duplicate line."""
    key = key.strip()
    if not key:
        raise ValueError("empty key")
    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    current = read_secrets_file()
    current[key] = value
    lines = ["# Agent Smith secrets — managed by backend/manage-secrets.sh.",
             "# One KEY=value per line. Never commit this file.", ""]
    for k in sorted(current):
        lines.append(f"{k}={current[k]}")
    _SECRETS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        os.chmod(_SECRETS_FILE, 0o600)  # owner-only; no-op semantics on some platforms
    except OSError:
        pass


def delete_secret(key: str) -> bool:
    """Remove one secret. Returns True if it was present."""
    current = read_secrets_file()
    if key not in current:
        return False
    del current[key]
    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    lines = ["# Agent Smith secrets — managed by backend/manage-secrets.sh.",
             "# One KEY=value per line. Never commit this file.", ""]
    for k in sorted(current):
        lines.append(f"{k}={current[k]}")
    _SECRETS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        os.chmod(_SECRETS_FILE, 0o600)
    except OSError:
        pass
    return True


# ----------------------------------------------------------------- startup loader

def load_into_environ() -> int:
    """Load stored secrets into os.environ. A REAL existing env var always wins — we never
    clobber a value Render or the shell already exported. Returns how many keys we injected.
    Call this once at startup, before the routers import and read os.getenv."""
    injected = 0
    for key, val in read_secrets_file().items():
        if os.environ.get(key):        # already set for real — leave it authoritative
            continue
        os.environ[key] = val
        injected += 1
    return injected


# ----------------------------------------------------------------- inspection (no values)

def status() -> List[Dict[str, object]]:
    """Per-key presence report. NEVER returns a value — only whether it's set, its length,
    and where it came from (the stored file vs the live process env). Covers known keys plus
    any extra keys the file happens to hold."""
    stored = read_secrets_file()
    rows: List[Dict[str, object]] = []
    seen = set()
    for entry in KNOWN_KEYS:
        k = entry["key"]
        seen.add(k)
        env_val = os.environ.get(k)
        rows.append({
            "key": k,
            "desc": entry["desc"],
            "set": bool(env_val),
            "length": len(env_val) if env_val else 0,
            "in_file": k in stored,
            "known": True,
        })
    # extra keys present in the file but not in the registry
    for k in sorted(stored):
        if k in seen:
            continue
        env_val = os.environ.get(k) or stored.get(k)
        rows.append({
            "key": k, "desc": "(extra, not in registry)",
            "set": bool(env_val), "length": len(env_val) if env_val else 0,
            "in_file": True, "known": False,
        })
    return rows


@router.get("/status")
def secrets_status():
    """Presence/length of each credential — never the value. Safe for the phone to call."""
    rows = status()
    missing = [r["key"] for r in rows if r["known"] and not r["set"]]
    return {
        "keys": rows,
        "n_set": sum(1 for r in rows if r["set"]),
        "n_missing_known": len(missing),
        "missing": missing,
        "file_present": _SECRETS_FILE.exists(),
    }
