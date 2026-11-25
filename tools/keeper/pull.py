"""
`python -m tools.keeper pull` — bring what was renewed on the desk into the vault.

A key, token, password or setting renewed on the desk (backend/keeper/desk.py) lives on the
node in <state>/desk-keys/ until the vault has it. `pull` reads those files over SSH (as push
writes, nothing touches this machine's disk), writes each value into the vault entry that
exports it — the previous value stays in the entry's history — and then tells the node it may
drop its copies. `push` runs it first, so a push never sends an older vault value.

What it cannot place (no entry exports the name yet) stays on the desk and is reported.
"""

from __future__ import annotations

import base64
import json
import subprocess
from typing import Dict, List, Tuple

from tools.keeper import vault
from tools.keeper.render import parse_pairs
from tools.keeper.push import DEFAULT_HOST

STATE = "/var/lib/agent-smith"
FILES = ("env", "overrides.json", "gmail-token.json", "gmail-credentials.json")
READ = ("python3 -c \"import base64,json,pathlib;d=pathlib.Path('" + STATE + "/desk-keys');"
        "print(json.dumps({p.name: base64.b64encode(p.read_bytes()).decode() for p in d.glob('*') if p.name in "
        + repr(FILES).replace('"', "'") + "}))\"")


def unquote(raw: str) -> str:
    """The inverse of the desk's quoting (single quotes literal; double quotes with \\ escapes)."""
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] == "'":
        return raw[1:-1]
    if len(raw) >= 2 and raw[0] == raw[-1] == '"':
        out, i, body = [], 0, raw[1:-1]
        while i < len(body):
            if body[i] == "\\" and i + 1 < len(body):
                out.append(body[i + 1])
                i += 2
            else:
                out.append(body[i])
                i += 1
        return "".join(out)
    return raw


def fetch(host: str = DEFAULT_HOST) -> Dict[str, bytes]:
    r = subprocess.run(["ssh", "-o", "BatchMode=yes", host, READ], capture_output=True, timeout=60)
    if r.returncode != 0:
        raise SystemExit(f"pull: could not read the desk keys on {host} (ssh exit {r.returncode})")
    try:
        return {k: base64.b64decode(v) for k, v in json.loads(r.stdout.decode() or "{}").items()}
    except ValueError:
        raise SystemExit("pull: the node answered something that is not the desk keys")


def env_values(files: Dict[str, bytes]) -> Dict[str, str]:
    out = {}
    for line in files.get("env", b"").decode("utf-8").splitlines():
        name, sep, raw = line.partition("=")
        if sep and name.strip() and not name.startswith("#"):
            out[name.strip()] = unquote(raw)
    return out


def _set(e, field: str, value: str) -> None:
    if field == "Password":
        e.password = value
    elif field == "UserName":
        e.username = value
    elif field == "URL":
        e.url = value
    else:
        e.set_custom_property(field, value)


def place(kp, values: Dict[str, str], files: Dict[str, bytes]) -> Tuple[List[str], List[str]]:
    """Write desk values into the vault. -> (names placed, names left on the desk)."""
    from tools.keeper import forges, gmail
    placed, left = [], []
    g = vault.group(kp)
    entries = (kp.find_entries(group=g, recursive=True) or []) if g else []
    touched = set()

    if "GMAIL_TOKEN_PATH" in values and "gmail-token.json" in files:
        token = json.loads(files["gmail-token.json"])
        new_client = files.get("gmail-credentials.json") if "GMAIL_CREDENTIALS_PATH" in values else None
        client = new_client or gmail.client_from_vault(kp, None)[0]
        grant = gmail.Grant(token=token, scopes=set((token.get("scope") or "").split()), testing_until=None)
        gmail.store(kp, grant, client, replace_client=new_client is not None)
        placed += [n for n in ("GMAIL_TOKEN_PATH", "GMAIL_CREDENTIALS_PATH") if n in values]

    for name, value in values.items():
        if name.startswith("GMAIL_"):
            if name not in placed:
                left.append(name)
            continue
        target = None
        for e in entries:                                   # an entry that exports this name
            spec = e.get_custom_property("Env") or ""
            if spec.strip() == "*":
                if name in (e.custom_properties or {}):
                    target = (e, name)
            else:
                target = next(((e, fld) for fld, var in parse_pairs(spec) if var == name), target)
            if target:
                break
        if target is None and name.startswith("FORGE_") and name.endswith("_TOKEN"):
            aid = name[len("FORGE_"):-len("_TOKEN")].lower()
            fe = forges.entry(kp, aid)
            target = (fe, "Password") if fe is not None else None
        if target is None and not name.startswith(("FORGE_", "MAIL_")) and not name.endswith(("_KEY", "_TOKEN", "_PASSWORD")):
            settings = vault.find_entry(kp, "Desk settings")   # a plain setting: the Env=* entry
            target = (settings, name) if settings is not None else None
        if target is None:
            left.append(name)
            continue
        e, fld = target
        if e.uuid not in touched:
            e.save_history()
            touched.add(e.uuid)
        _set(e, fld, value)
        e.touch(modify=True)
        placed.append(name)
    return placed, left


def absorbed(names: List[str], host: str = DEFAULT_HOST) -> None:
    body = json.dumps({"values": {n: "" for n in names}})
    subprocess.run(["ssh", "-o", "BatchMode=yes", host,
                    f"curl -fsS -X POST -H 'Content-Type: application/json' -d '{body}' http://127.0.0.1:8000/keeper/desk/absorbed"],
                   capture_output=True, timeout=60)


def pull(kp, host: str = DEFAULT_HOST, say=print) -> List[str]:
    """Place the desk's values in the open vault and save it. -> the names placed (the caller
    tells the node with `absorbed` once the vault is pushed or saved)."""
    files = fetch(host)
    values = env_values(files)
    if not values:
        return []
    placed, left = place(kp, values, files)
    if placed:
        kp.save()
        say(f"Brought from the desk into the vault: {', '.join(sorted(placed))}")
    for n in left:
        say(f"  note: {n} was renewed on the desk, but no vault entry exports it — it stays on the desk")
    return placed
