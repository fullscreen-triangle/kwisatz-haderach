"""
Reading tasks and the progress through them — <state>/reading/.

  tasks.json               [{id, title, repos, theta, budget, created, run: {...}}]
  <task>/progress.json     {entity key: {read_at, head}} — what has been read, and at which commit
  <task>/okgg/report.json  the last okgg run over the task's workspace
  <task>/ws/               the workspace okgg reads (rebuilt per run; see runner.py)
"""

from __future__ import annotations

import json
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from backend.keeper.service import state_dir

_LOCK = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def root() -> Path:
    d = state_dir() / "reading"
    d.mkdir(parents=True, exist_ok=True)
    return d


def task_dir(tid: str) -> Path:
    d = root() / tid
    d.mkdir(parents=True, exist_ok=True)
    return d


def _write(path: Path, data) -> None:
    tmp = path.with_name(f".{path.name}.tmp")
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def _read(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def tasks() -> List[dict]:
    return _read(root() / "tasks.json", [])


def get(tid: str) -> Optional[dict]:
    return next((t for t in tasks() if t["id"] == tid), None)


def create(title: str, repos: List[str], theta: float = 0.9, budget: int = 20) -> dict:
    title = title.strip()
    if not title or not repos:
        raise ValueError("a reading task needs a title and at least one repo")
    with _LOCK:
        ts = tasks()
        base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:40] or "task"
        tid, n = base, 2
        while any(t["id"] == tid for t in ts):
            tid, n = f"{base}-{n}", n + 1
        t = {"id": tid, "title": title, "repos": sorted(set(repos)), "theta": float(theta), "budget": int(budget),
             "created": _now(), "run": {"state": "idle"}}
        _write(root() / "tasks.json", ts + [t])
    return t


def update(tid: str, patch: dict) -> dict:
    with _LOCK:
        ts = tasks()
        for t in ts:
            if t["id"] == tid:
                for k in ("title", "repos", "theta", "budget"):
                    if k in patch:
                        t[k] = sorted(set(patch[k])) if k == "repos" else patch[k]
                if "run" in patch:
                    t["run"] = {**t.get("run", {}), **patch["run"]}
                _write(root() / "tasks.json", ts)
                return t
    raise KeyError(tid)


def delete(tid: str) -> None:
    """The task, its progress, workspace and graph. The repos' clones stay (the repo pass owns them)."""
    import shutil
    with _LOCK:
        _write(root() / "tasks.json", [t for t in tasks() if t["id"] != tid])
        d = root() / tid
        if re.fullmatch(r"[a-z0-9-]+", tid) and d.is_dir():
            shutil.rmtree(d, ignore_errors=True)


def progress(tid: str) -> Dict[str, dict]:
    return _read(task_dir(tid) / "progress.json", {})


def mark(tid: str, key: str, read: bool, head: str = "") -> Dict[str, dict]:
    with _LOCK:
        p = progress(tid)
        if read:
            p[key] = {"read_at": _now(), "head": head}
        else:
            p.pop(key, None)
        _write(task_dir(tid) / "progress.json", p)
    return p


def report(tid: str) -> Optional[dict]:
    return _read(task_dir(tid) / "okgg" / "report.json", None)
