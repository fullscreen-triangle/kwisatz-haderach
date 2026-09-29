"""
Running okgg over a reading task.

The task's repos are the repo pass's clones (backend/repos: <state>/repos/clones/<name>,
kept pulled and `tracker drift`-ed every 6 h because the task puts them in the pass's
`include`). okgg reads one tree and its walker does not follow symlinks, so each run gets a
fresh workspace of hard links — `cp -al <clone>/. ws/<repo>/` — real files at no extra disk.
It is rebuilt every run because `git pull` replaces files with new inodes. okgg skips `.git`
(hidden) and honours each repo's .gitignore, so entity keys come out `<repo>/<path>#<slug>`
and the corpus is individuated across the repos, not one at a time.

A task entry is a repo (`bloodhound`) or a path inside one (`bloodhound/thrust/tracker`):
whole repos run to thousands of sections, so a reading task usually names the parts to read.

One okgg run at a time on the node: it shares Ollama with mail extraction and the dial.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional

from backend.reading import store

log = logging.getLogger("reading")

MAX_ENTITIES = 3000              # okgg's own --max-entities default
_RUN_LOCK = threading.Lock()


def model() -> str:
    """The model already resident for mail extraction, unless told otherwise. The node has
    7.6 GB: loading a second model beside qwen2.5:7b got Ollama OOM-killed mid-run."""
    from backend.mail.extract import DEFAULT_MODEL
    return os.getenv("READING_MODEL") or os.getenv("MAIL_EXTRACT_MODEL") or DEFAULT_MODEL


def okgg_bin() -> Optional[str]:
    return os.getenv("OKGG_BIN") or shutil.which("okgg")


def clone_of(repo: str) -> Path:
    from backend.repos.service import clones_dir
    return clones_dir() / repo


def head_of(repo: str) -> str:
    p = clone_of(repo)
    if not (p / ".git").exists():
        return ""
    r = subprocess.run(["git", "rev-parse", "HEAD"], cwd=p, capture_output=True, text=True, timeout=30)
    return r.stdout.strip()


def repo_names(entries: List[str]) -> List[str]:
    """The repos a task's entries live in ('bloodhound/thrust/tracker' -> 'bloodhound')."""
    return sorted({e.strip("/").split("/", 1)[0] for e in entries if e.strip("/")})


def heads(entries: List[str]) -> Dict[str, str]:
    return {r: head_of(r) for r in repo_names(entries)}


def ensure_tracked(repos: List[str]) -> List[str]:
    """Bring the task's repos up to date and let the tracker see them: for each, the repo
    pass's own step (backend/repos pass_one — clone or pull, then bloodhound `tracker
    add/drift`), recorded in the pass's history.jsonl like any pass. The repos are also put
    in the pass's `include`, so wherever its 6-hourly loop runs it keeps them too.
    Returns what went wrong, per repo."""
    import json as _json
    from backend.repos import service as rs
    repos = repo_names(repos)
    s = rs.settings()
    missing = [r for r in repos if r not in s["include"]]
    if missing:
        rs.save_settings({**s, "include": sorted(set(s["include"]) | set(missing))})
    inv = {r.get("name"): r for r in rs.inventory()}
    prev = rs.last_records()
    problems = []
    for r in repos:
        full = (inv.get(r) or {}).get("full_name") or f"{rs.settings()['owner']}/{r}"
        rec = rs.pass_one({"name": r, "full_name": full}, prev.get(r))
        with open(rs._dir() / "history.jsonl", "a", encoding="utf-8") as f:
            f.write(_json.dumps(rec) + "\n")
        for k in ("error", "pull_error"):
            if rec.get(k):
                problems.append(f"{r}: {rec[k]}")
    return problems


def build_workspace(tid: str, entries: List[str]) -> Path:
    ws = store.task_dir(tid) / "ws"
    if ws.exists():
        shutil.rmtree(ws)
    ws.mkdir(parents=True)
    for e in entries:
        name, _, sub = e.strip("/").partition("/")
        src = clone_of(name) / sub if sub else clone_of(name)
        if not src.exists() or ".." in Path(sub).parts:
            continue
        dst = ws / name / sub if sub else ws / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        root_ignore = clone_of(name) / ".gitignore"          # a subtree still honours its repo's root ignores
        if sub and root_ignore.exists() and not (ws / name / ".gitignore").exists():
            shutil.copy2(root_ignore, ws / name / ".gitignore")
        if os.name == "nt":                               # dev laptops: no cp -al; copy text
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".git"), dirs_exist_ok=True)
        else:
            subprocess.run(["cp", "-al", f"{src}/.", str(dst)], check=True, timeout=600)
    return ws


def scan_count(ws: Path) -> int:
    r = subprocess.run([okgg_bin(), "scan", str(ws), "--unit", "section"], capture_output=True, text=True, timeout=600)
    m = re.search(r"(\d+)\s+entit", r.stdout + r.stderr)
    return int(m.group(1)) if m else -1


def run(tid: str, generator: str = "ollama") -> dict:
    """Blocking: workspace → okgg scan → okgg run. Updates the task's run record."""
    t = store.get(tid)
    if t is None:
        raise KeyError(tid)
    if not okgg_bin():
        return store.update(tid, {"run": {"state": "failed", "error": "okgg is not installed on this node"}})["run"]
    if not _RUN_LOCK.acquire(blocking=False):
        return store.update(tid, {"run": {"state": "queued"}})["run"]
    try:
        store.update(tid, {"run": {"state": "running", "started": time.time(), "error": ""}})
        problems = ensure_tracked(t["repos"])
        ws = build_workspace(tid, t["repos"])
        n = scan_count(ws)
        if n > MAX_ENTITIES:
            return store.update(tid, {"run": {"state": "failed", "entities": n, "error":
                                f"{n} sections is too many for one run (limit {MAX_ENTITIES}); name folders instead of whole repos, e.g. repo/docs"}})["run"]
        out = store.task_dir(tid) / "okgg"
        cmd = [okgg_bin(), "run", str(ws), "--unit", "section", "--generator", generator,
               "--budget", str(t["budget"]), "--theta", str(t["theta"]), "--out", str(out)]
        if generator == "ollama":
            cmd += ["--model", model(),
                    "--ollama-url", os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")]
        t0 = time.time()
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=6 * 3600)
        if r.returncode != 0:
            err = (r.stderr.strip().splitlines() or ["okgg failed"])[-1][:300]
            return store.update(tid, {"run": {"state": "failed", "error": err}})["run"]
        rep = store.report(tid) or {}
        return store.update(tid, {"run": {
            "state": "done", "at": store._now(), "seconds": round(time.time() - t0),
            "heads": heads(t["repos"]), "entities": rep.get("n"), "V": rep.get("value"),
            "stop": rep.get("stop"), "generator": generator, "problems": problems}})["run"]
    except Exception as e:                                      # the record says why; the node keeps running
        log.exception("reading: run failed")
        return store.update(tid, {"run": {"state": "failed", "error": f"{type(e).__name__}: {e}"[:300]}})["run"]
    finally:
        _RUN_LOCK.release()


def stale(t: dict) -> bool:
    """The repos moved since the graph was made (or it was never made)."""
    run = t.get("run") or {}
    if run.get("state") != "done":
        return run.get("state") in (None, "idle")
    now = heads(t["repos"])
    return any(h and h != run.get("heads", {}).get(r) for r, h in now.items())
