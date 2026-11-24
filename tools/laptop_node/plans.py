"""
File plans on the laptop, through drogba (zangalewa/drogba): a plan is written as pseudocode
(`move files in "C:\\…\\Downloads" matching "*.pdf" to …`), previewed against the real disk
without changing anything, and run only as previewed — drogba refuses a run whose plan or
disk no longer gives the preview's digest.

The node runs drogba under ITS OWN configuration (<state>/drogba.toml, rewritten on every
call), never the person's: plans may change only the folders the node serves, deletes go to
the Recycle Bin whatever the person's own drogba says, and `.git` is never touched. On top
of drogba's checks, no step may touch a credential (config.denied) — drogba has no
name-based deny.

Running is OFF until the laptop's own settings say `"plans": true` (laptop-node.json): a
preview only reads, a run changes files, and that is the laptop owner's switch, not the
server's.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional

from tools.laptop_node import config

MAX_PLAN = 20_000
TIMEOUT = 600                       # a preview measures what it moves; big folders take a while


class PlanError(Exception):
    """drogba could not be run at all (missing, timed out, unreadable answer)."""


def drogba() -> Optional[str]:
    explicit = os.getenv("DROGBA_EXE")
    if explicit:
        return explicit if Path(explicit).is_file() else None
    found = shutil.which("drogba")
    if found:
        return found
    cargo = Path.home() / ".cargo" / "bin" / ("drogba.exe" if os.name == "nt" else "drogba")
    return str(cargo) if cargo.is_file() else None


def runs_allowed() -> bool:
    return config.settings().get("plans") is True


def _toml_str(s: str) -> str:
    return "'" + s + "'" if "'" not in s else json.dumps(s)      # literal string: backslashes kept


def node_config() -> Path:
    """The drogba configuration the node runs plans under."""
    roots = config.roots()
    lines = ["# written by the laptop node (tools/laptop_node/plans.py) on every plan; edits are lost",
             "allowed_roots = [" + ", ".join(_toml_str(str(r)) for r in roots) + "]",
             "denied = [" + ", ".join(_toml_str(str(r / d)) for r in roots for d in sorted(config.DENY_DIRS)) + "]",
             "deny_git_internals = true",
             'delete = "recycle-bin"', ""]
    p = config.state_dir() / "drogba.toml"
    p.write_text("\n".join(lines), encoding="utf-8")
    return p


def _plan_file(text: str) -> Path:
    d = config.state_dir() / "plans"
    d.mkdir(exist_ok=True)
    p = d / (hashlib.sha256(text.encode("utf-8")).hexdigest()[:16] + ".drogba")
    p.write_text(text, encoding="utf-8")
    return p


def _call(args: list) -> tuple:
    exe = drogba()
    if not exe:
        raise PlanError("drogba is not installed on the laptop (cargo install --path crates/drogba-cli in zangalewa/drogba)")
    try:
        r = subprocess.run([exe, *args, "--json", "--config", str(node_config())], capture_output=True,
                           text=True, encoding="utf-8", timeout=TIMEOUT,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except subprocess.TimeoutExpired:
        raise PlanError(f"drogba took longer than {TIMEOUT // 60} minutes")
    try:
        return r.returncode, json.loads(r.stdout)
    except ValueError:
        raise PlanError((r.stderr or r.stdout or f"drogba exited {r.returncode}").strip()[:500])


def _step_paths(step: dict):
    for k in ("path", "from", "to"):
        if step.get(k):
            yield step[k]


def _guard(plan: dict) -> dict:
    """Add a problem for every step that touches a credential; such a plan is not runnable."""
    for s in plan.get("steps") or []:
        for raw in _step_paths(s):
            if config.denied(Path(raw)):
                plan.setdefault("problems", []).append({
                    "severity": "error", "line": s.get("line"),
                    "message": f"{raw} is a credential or inside a credential folder; the laptop never lets a plan touch it"})
                plan["runnable"] = False
    return plan


def _check(text: str) -> None:
    if not text.strip():
        raise ValueError("the plan is empty")
    if len(text) > MAX_PLAN:
        raise ValueError(f"the plan is longer than {MAX_PLAN} characters")


def preview(text: str) -> dict:
    """Every step the plan would take, its problems, and its digest. Changes nothing."""
    _check(text)
    code, plan = _call(["preview", str(_plan_file(text))])
    if code not in (0, 1):
        raise PlanError(plan.get("error") or f"drogba exited {code}")
    plan = _guard(plan)
    plan["runs_allowed"] = runs_allowed()
    return plan


def run(text: str, digest: str) -> dict:
    """Run the plan exactly as previewed. Refused when runs are off, when a step touches a
    credential, or when the plan or the disk changed since the preview (drogba's digest)."""
    _check(text)
    if not runs_allowed():
        raise PermissionError('running file plans is off on this laptop; set "plans": true in laptop-node.json to allow it')
    if len(digest) < 16:
        raise ValueError("give the preview's digest")
    plan = preview(text)                       # the credential guard, against the disk as it is now
    if not plan.get("runnable"):
        return {"plan": plan, "error": "the plan has problems now; preview it again"}
    if not plan.get("digest", "").startswith(digest):
        return {"plan": plan, "error": "the plan or the disk changed since that preview (digest differs); preview again"}
    _, out = _call(["run", str(_plan_file(text)), "--yes", "--digest", digest])
    return out
