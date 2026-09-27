"""
Vault entries -> the files the server needs. Pure functions over plain data, so the whole
transformation is testable without a .kdbx or a network.

An `Item` is one vault entry already read out of KeePassXC (vault.py builds them). The
output `Bundle` is:
  env       — KEY -> value, rendered to a systemd EnvironmentFile by env_file()
  files     — server-relative path -> bytes (attachments, e.g. the GitHub App key)
  manifest  — value-free: which credentials exist and their declared expiry
"""

from __future__ import annotations

import io
import json
import re
import tarfile
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional

GROUP = "Agent Smith"
RESERVED = {"KeeperId", "Strategy", "Env", "Files", "RenewURL"}
STANDARD_FIELDS = ("Title", "UserName", "Password", "URL", "Notes")

# Where things live on server-2 — layout, not secrets. The backend and web services read
# these from the same EnvironmentFile as the credentials.
SERVER_STATE = "/var/lib/agent-smith"
SERVER_ENV = {
    "AGENT_SMITH_STATE": SERVER_STATE,
    "GMAIL_CREDENTIALS_PATH": f"{SERVER_STATE}/gmail/credentials.json",
    "GMAIL_TOKEN_PATH": f"{SERVER_STATE}/gmail/token.json",
    "GARMINTOKENS": f"{SERVER_STATE}/garmin",
    "GITHUB_APP_PRIVATE_KEY_PATH": f"{SERVER_STATE}/github/private-key.pem",
    "NEXT_PUBLIC_BACKEND_URL": "http://127.0.0.1:8000",
    "OLLAMA_URL": "http://127.0.0.1:11434",
}


@dataclass
class Item:
    title: str
    fields: Dict[str, str]                       # standard fields + custom attributes
    attachments: Dict[str, bytes] = field(default_factory=dict)
    expires_at: Optional[datetime] = None

    @property
    def keeper_id(self) -> str:
        return self.fields.get("KeeperId", "").strip()


@dataclass
class Bundle:
    env: Dict[str, str]
    files: Dict[str, bytes]
    manifest: dict
    warnings: List[str]


def parse_pairs(spec: str) -> List[tuple]:
    """'A=B; C=D' -> [('A','B'), ('C','D')]. Whitespace and empty parts ignored."""
    pairs = []
    for part in re.split(r"[;\n]", spec or ""):
        if "=" in part:
            left, _, right = part.partition("=")
            if left.strip() and right.strip():
                pairs.append((left.strip(), right.strip()))
    return pairs


def build(items: List[Item]) -> Bundle:
    env: Dict[str, str] = {}
    source: Dict[str, str] = {}                  # env var -> entry title, to report clashes
    files: Dict[str, bytes] = {}
    declared: Dict[str, dict] = {}
    warnings: List[str] = []

    def put(var: str, value: str, title: str) -> None:
        if var in source and source[var] != title:
            raise ValueError(f"{var} is mapped by both '{source[var]}' and '{title}'")
        if "\n" in value or "\r" in value:
            raise ValueError(f"{var} (from '{title}') contains a newline — an env file can't hold it; "
                             "store it as an attachment instead")
        env[var], source[var] = value, title

    for it in items:
        spec = it.fields.get("Env", "").strip()
        if spec == "*":
            for name, value in it.fields.items():
                if name not in RESERVED and name not in STANDARD_FIELDS and value:
                    put(name, value, it.title)
        else:
            for fld, var in parse_pairs(spec):
                value = it.fields.get(fld, "")
                if value:
                    put(var, value, it.title)
                else:
                    warnings.append(f"'{it.title}': field {fld} is empty, so {var} is not set")

        for name, dest in parse_pairs(it.fields.get("Files", "")):
            if name not in it.attachments:
                warnings.append(f"'{it.title}': attachment {name} not found")
                continue
            if dest.startswith("/") or ".." in dest.split("/"):
                raise ValueError(f"'{it.title}': file target {dest} must be a relative path inside the state dir")
            files[dest] = it.attachments[name]

        if it.keeper_id:
            prev = declared.get(it.keeper_id, {}).get("expires_at")
            exp = it.expires_at.isoformat() if it.expires_at else None
            # Two entries for one credential (e.g. an old PAT beside the new App): the earlier
            # declared expiry wins, so nothing is hidden.
            declared[it.keeper_id] = {"expires_at": min(filter(None, [prev, exp]), default=None)}

    for var, value in SERVER_ENV.items():
        if var in env:
            warnings.append(f"{var} from '{source[var]}' is overridden by the server layout")
        env[var] = value

    manifest = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "credentials": declared}
    return Bundle(env=env, files=files, manifest=manifest, warnings=warnings)


def quote(value: str) -> str:
    """Quote for a systemd EnvironmentFile. Single quotes are literal — no escapes and no
    $-expansion — so passwords with $, !, \\ or " survive. Only a value containing a single
    quote needs double quotes, with \\, ", $ and ` escaped."""
    if "'" not in value:
        return f"'{value}'"
    return '"' + re.sub(r'([\\"$`])', r"\\\1", value) + '"'


def env_file(env: Dict[str, str]) -> str:
    lines = ["# Agent Smith — written by `python -m tools.keeper push` from the KeePassXC vault.",
             "# Do not edit on the server: the next push replaces this file.", ""]
    lines += [f"{k}={quote(v)}" for k, v in sorted(env.items())]
    return "\n".join(lines) + "\n"


def tarball(bundle: Bundle) -> bytes:
    """Everything the server gets, as one in-memory tar: files 0600, dirs 0700."""
    buf = io.BytesIO()
    now = time.time()
    members = {"env": env_file(bundle.env).encode(),
               "manifest.json": json.dumps(bundle.manifest, indent=2).encode(),
               **bundle.files}
    dirs = sorted({"/".join(p.split("/")[:i]) for p in members for i in range(1, p.count("/") + 1)})
    with tarfile.open(fileobj=buf, mode="w") as tar:
        for d in dirs:
            info = tarfile.TarInfo(d)
            info.type, info.mode, info.mtime = tarfile.DIRTYPE, 0o700, now
            tar.addfile(info)
        for path, data in members.items():
            info = tarfile.TarInfo(path)
            info.size, info.mode, info.mtime = len(data), 0o600, now
            tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


# ------------------------------------------------------------------ one-time import

def parse_env_text(text: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "'\"":
            val = val[1:-1]
        if key.strip():
            out[key.strip()] = val
    return out


# Known credentials in web/.env.local -> vault entries. Anything else that looks secret
# gets its own static entry; anything else is a plain setting.
IMPORT_MAP = [
    {"id": "anthropic", "title": "Anthropic API", "strategy": "static",
     "fields": {"Password": "ANTHROPIC_API_KEY"}},
    {"id": "garmin", "title": "Garmin Connect", "strategy": "refresh",
     "fields": {"UserName": "GARMIN_EMAIL", "Password": "GARMIN_PASSWORD"}},
    {"id": "amazon", "title": "Amazon PA API", "strategy": "static",
     "fields": {"UserName": "AMAZON_ACCESS_KEY", "Password": "AMAZON_SECRET_KEY",
                "AMAZON_PARTNER_TAG": "AMAZON_PARTNER_TAG"}},
    {"id": "github", "title": "GitHub personal token (legacy)", "strategy": "static",
     "fields": {"Password": "GITHUB_TOKEN"}},
]
SKIP_ON_IMPORT = set(SERVER_ENV)
SECRETISH = re.compile(r"SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY|CLIENT_ID", re.I)


def plan_import(env: Dict[str, str]) -> List[dict]:
    """Turn a .env.local dict into entry specs: {title, id, strategy, fields, env_spec}."""
    specs, used = [], set()
    for m in IMPORT_MAP:
        present = {fld: env[var] for fld, var in m["fields"].items() if env.get(var)}
        if not present:
            continue
        used.update(m["fields"].values())
        specs.append({"title": m["title"], "id": m["id"], "strategy": m["strategy"],
                      "fields": present,
                      "env_spec": "; ".join(f"{f}={v}" for f, v in m["fields"].items() if f in present)})
    settings = {}
    for var, val in sorted(env.items()):
        if var in used or var in SKIP_ON_IMPORT or not val:
            continue
        if SECRETISH.search(var):
            specs.append({"title": f"Imported · {var}", "id": "", "strategy": "static",
                          "fields": {"Password": val}, "env_spec": f"Password={var}"})
        else:
            settings[var] = val
    if settings:
        specs.append({"title": "Desk settings", "id": "", "strategy": "static",
                      "fields": settings, "env_spec": "*"})
    return specs
