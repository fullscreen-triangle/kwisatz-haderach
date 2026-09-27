"""Where the laptop node keeps its state, which folders it serves, and what it never serves."""

from __future__ import annotations

import fnmatch
import json
import os
import secrets
from pathlib import Path
from typing import List

HOME = Path.home()
PORT = 8765
TAILSCALE = Path(r"C:\Program Files\Tailscale\tailscale.exe")


def state_dir() -> Path:
    base = Path(os.getenv("LAPTOP_NODE_STATE") or Path(os.getenv("LOCALAPPDATA", HOME)) / "agent-smith")
    base.mkdir(parents=True, exist_ok=True)
    return base


def settings() -> dict:
    """<state>/laptop-node.json — edit `roots` to serve other folders."""
    p = state_dir() / "laptop-node.json"
    try:
        s = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        s = {}
    s.setdefault("roots", [str(HOME / d) for d in ("Documents", "Desktop", "Downloads", "OneDrive")])
    s.setdefault("port", PORT)
    return s


def roots() -> List[Path]:
    return [Path(r).resolve() for r in settings()["roots"] if Path(r).is_dir()]


# Folders the index skips because they are noise (dependencies, build output, caches,
# agent worktrees). Their files can still be read by exact path if a root contains them.
SKIP_DIRS = {"node_modules", "target", ".venv", "venv", "__pycache__", ".next", ".cache", ".gradle",
             ".idea", ".vs", "site-packages", ".mypy_cache", ".pytest_cache", ".tox", ".purpose",
             ".spraypaint", ".wt", ".cargo", ".cargo-home", ".rustup", ".npm", ".yarn", "$RECYCLE.BIN"}

# Never served, never indexed, whatever the request says: credentials and keys.
DENY_DIRS = {".ssh", ".gnupg", ".aws", ".azure", ".kube", ".docker", "AppData", ".claude", ".git",
             ".password-store", "keepass", "KeePassXC"}
DENY_NAMES = ("*.kdbx", "*.kdb", "*.keyx", "*.key", "*.pem", "*.p12", "*.pfx", "*.jks", "*.ovpn",
              "id_rsa*", "id_ed25519*", "id_ecdsa*", ".env", ".env.*", "*.env", ".netrc", ".npmrc",
              ".pypirc", "credentials*", "*credential*", "*secret*", "*token*", "settings.local.json",
              "garmin_tokens*", "*.gpg", "*.asc")


def denied(p: Path) -> bool:
    """A credential by name, or anything inside a credential folder. Folders are judged
    below the served root only — where the root itself sits is the owner's choice."""
    base = next((r for r in roots() if p == r or r in p.parents), None)
    inner = p.relative_to(base).parts[:-1] if base else p.parts[:-1]
    parts = {x.lower() for x in inner}
    if parts & {d.lower() for d in DENY_DIRS}:
        return True
    name = p.name.lower()
    return any(fnmatch.fnmatch(name, pat.lower()) for pat in DENY_NAMES)


def within_roots(p: Path) -> bool:
    return any(p == r or r in p.parents for r in roots())


def servable(raw: str) -> Path:
    """The resolved path if it may be served, else ValueError with the reason."""
    p = Path(raw).expanduser()
    try:
        p = p.resolve(strict=True)
    except (OSError, RuntimeError):
        raise ValueError("no such file or folder")
    if not within_roots(p):
        raise ValueError("outside the folders the laptop serves")
    if denied(p):
        raise ValueError("that file is never served (credentials/keys)")
    return p


def token_path() -> Path:
    return state_dir() / "laptop-node.token"


def token(create: bool = False) -> str:
    p = token_path()
    if p.exists():
        return p.read_text(encoding="utf-8").strip()
    if not create:
        return ""
    t = secrets.token_urlsafe(32)
    p.write_text(t, encoding="utf-8")
    return t
