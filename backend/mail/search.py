"""
spraypaint (graffiti/spraypaint) over the markdown mirror of all mail.

The mirror root holds an empty `.spraypaint/` dir, which pins spraypaint's root there
(it otherwise walks up to the nearest .git). Each account directory is a scene by
default, so one busy inbox can't crowd the others out of a result list — that is
spraypaint's water-filling allocation across scenes.

`ask` commits one act to spraypaint's never-decreasing count; `dry_run` does not.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional


def binary() -> Optional[str]:
    found = shutil.which("spraypaint")
    if found:
        return found
    for cand in (Path.home() / ".local" / "bin" / "spraypaint", Path.home() / ".cargo" / "bin" / "spraypaint"):
        if cand.exists() and os.access(cand, os.X_OK):
            return str(cand)
    return None


def reindex(root: Path, timeout: int = 900) -> bool:
    b = binary()
    if not b:
        return False
    r = subprocess.run([b, "index"], cwd=root, capture_output=True, timeout=timeout)
    return r.returncode == 0


def ask(root: Path, query: str, k: int = 12, scenes: Optional[List[str]] = None,
        dry_run: bool = False) -> dict:
    b = binary()
    if not b:
        return {"error": "spraypaint is not installed on the node"}
    if not (root / ".spraypaint" / "index.json").exists():
        return {"error": "the mail index hasn't been built yet"}
    cmd = [b, "ask", query, "-k", str(k), "--json"]
    if scenes:
        cmd += ["--scenes", ",".join(scenes)]
    if dry_run:
        cmd.append("--dry-run")
    r = subprocess.run(cmd, cwd=root, capture_output=True, timeout=60)
    if r.returncode != 0:
        return {"error": (r.stderr.decode(errors="replace").strip() or f"exit {r.returncode}")[:300]}
    return json.loads(r.stdout.decode(errors="replace"))
