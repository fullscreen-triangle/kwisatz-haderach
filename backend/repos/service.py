"""The repo pass (see the package docstring) and its history."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

from backend.keeper.service import state_dir

log = logging.getLogger("repos")

ROOT = Path(__file__).resolve().parent.parent.parent
PASS = 6 * 3600
DEFAULTS = {"active_days": 90, "include": [], "exclude": [], "max_repos": 20, "owner": "fullscreen-triangle"}


def _dir() -> Path:
    d = state_dir() / "repos"
    d.mkdir(parents=True, exist_ok=True)
    return d


def clones_dir() -> Path:
    d = Path(os.getenv("REPOS_DIR") or _dir() / "clones")
    d.mkdir(parents=True, exist_ok=True)
    return d


def settings() -> dict:
    try:
        return {**DEFAULTS, **json.loads((_dir() / "settings.json").read_text(encoding="utf-8"))}
    except (OSError, ValueError):
        return dict(DEFAULTS)


def save_settings(s: dict) -> dict:
    s = {**DEFAULTS, **{k: v for k, v in s.items() if k in DEFAULTS}}
    (_dir() / "settings.json").write_text(json.dumps(s, indent=1), encoding="utf-8")
    return s


def inventory() -> List[dict]:
    """The repo list: the copy refreshed from GitHub each pass, else the github_manager export."""
    for p in (_dir() / "inventory.json", ROOT / "tools" / "github_manager" / "output" / "inventory.json"):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            if isinstance(data, list) and data:
                return data
        except (OSError, ValueError):
            continue
    return []


_KEEP = ("name", "full_name", "pushed_at", "description", "fork", "archived", "private", "language")


def refresh_inventory() -> int:
    """Re-list the owner's repos from GitHub (blocking). With the GitHub App token this is
    every repo the installation can see; without it, the owner's public repos. The export
    under tools/ goes stale; `pushed_at` is what picks the active subset, so fetch it live."""
    import httpx
    token, owner = _token(), settings()["owner"]
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        url, key = "https://api.github.com/installation/repositories", "repositories"
    else:
        url, key = f"https://api.github.com/users/{owner}/repos?type=owner&sort=pushed", None
    repos: List[dict] = []
    with httpx.Client(timeout=30, headers=headers) as client:
        for page in range(1, 11):
            r = client.get(url, params={"per_page": 100, "page": page})
            r.raise_for_status()
            batch = r.json()[key] if key else r.json()
            repos += [{k: x.get(k) for k in _KEEP} for x in batch]
            if len(batch) < 100:
                break
    if repos:
        (_dir() / "inventory.json").write_text(json.dumps(repos), encoding="utf-8")
    return len(repos)


def active_subset(now: Optional[datetime] = None) -> List[dict]:
    s = settings()
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=int(s["active_days"]))
    chosen = []
    for r in inventory():
        name = r.get("name") or ""
        if not name or name in s["exclude"]:
            continue
        pushed = r.get("pushed_at") or ""
        try:
            recent = datetime.fromisoformat(pushed.replace("Z", "+00:00")) >= cutoff
        except ValueError:
            recent = False
        if name in s["include"] or (recent and not r.get("fork") and not r.get("archived")):
            chosen.append({"name": name, "full_name": r.get("full_name") or f"{s['owner']}/{name}",
                           "pushed_at": pushed, "description": r.get("description") or ""})
    chosen.sort(key=lambda r: r["pushed_at"], reverse=True)
    return chosen[: int(s["max_repos"])]


def _git(args: List[str], cwd: Optional[Path] = None, timeout: int = 600) -> subprocess.CompletedProcess:
    cmd = ["git"]
    token = _token()
    if token:                                   # auth header per call; never stored in .git/config
        cmd += ["-c", f"http.https://github.com/.extraheader=AUTHORIZATION: bearer {token}"]
    return subprocess.run(cmd + args, cwd=cwd, capture_output=True, text=True, timeout=timeout,
                          env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})


def _token() -> str:
    try:
        from backend.keeper import github_app
        tok, _ = github_app.read_minted(state_dir())
        return tok or ""
    except Exception:
        return ""


def _tracker_bin() -> Optional[str]:
    return shutil.which("tracker")


def _federation() -> Path:
    d = _dir() / "federation"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _tracker(args: List[str], timeout: int = 900) -> subprocess.CompletedProcess:
    return subprocess.run([_tracker_bin(), *args], cwd=_federation(), capture_output=True, text=True, timeout=timeout)


def _federation_state() -> Dict[str, dict]:
    try:
        data = json.loads((_federation() / ".tracker" / "federation.json").read_text(encoding="utf-8"))
        return {r["name"]: r for r in data.get("repos", [])}
    except (OSError, ValueError, KeyError):
        return {}


def last_records() -> Dict[str, dict]:
    out: Dict[str, dict] = {}
    for rec in history():
        out[rec["repo"]] = rec
    return out


def history(repo: str = "", since: str = "") -> List[dict]:
    p = _dir() / "history.jsonl"
    if not p.exists():
        return []
    out = []
    for line in p.read_text(encoding="utf-8").splitlines():
        try:
            rec = json.loads(line)
        except ValueError:
            continue
        if (not repo or rec.get("repo") == repo) and (not since or rec.get("ts", "") >= since):
            out.append(rec)
    return out


def _shortstat(text: str) -> dict:
    nums = {k: 0 for k in ("files", "insertions", "deletions")}
    for n, what in re.findall(r"(\d+) (file|insertion|deletion)", text):
        nums[{"file": "files", "insertion": "insertions", "deletion": "deletions"}[what]] = int(n)
    return nums


def pass_one(repo: dict, prev: Optional[dict]) -> dict:
    """Pull one repo, measure it, return the history record (blocking; run in a thread)."""
    path = clones_dir() / repo["name"]
    rec = {"ts": datetime.now(timezone.utc).isoformat(timespec="seconds"), "repo": repo["name"],
           "full_name": repo["full_name"]}
    if not (path / ".git").exists():
        r = _git(["clone", "--quiet", f"https://github.com/{repo['full_name']}.git", str(path)])
        if r.returncode != 0:
            return {**rec, "error": f"clone failed: {r.stderr.strip()[:200]}"}
    else:
        r = _git(["pull", "--ff-only", "--quiet"], cwd=path)
        if r.returncode != 0:
            rec["pull_error"] = r.stderr.strip()[:200]
    head = _git(["rev-parse", "HEAD"], cwd=path).stdout.strip()
    rec["head"] = head
    last = (prev or {}).get("head")
    if last and last != head:
        rec["commits"] = int((_git(["rev-list", "--count", f"{last}..{head}"], cwd=path).stdout.strip() or 0))
        rec.update(_shortstat(_git(["diff", "--shortstat", last, head], cwd=path).stdout))
        rec["subjects"] = _git(["log", "--format=%s", f"{last}..{head}", "-n", "8"], cwd=path).stdout.splitlines()
    else:
        rec["commits"] = 0
    if _tracker_bin():
        if not (_federation() / ".tracker").exists():
            _tracker(["init"])                   # first pass on this node: create the federation
        fed = _federation_state()
        if repo["name"] not in fed:
            r = _tracker(["add", str(path), "--name", repo["name"],
                          "--remote", f"https://github.com/{repo['full_name']}"])
        elif last != head or prev is None:
            r = _tracker(["drift", repo["name"]])
        else:
            r = None                             # nothing changed: χ can't have moved
        if r is not None and r.returncode != 0:
            rec["tracker_error"] = (r.stderr or r.stdout).strip()[:200]
        f = _federation_state().get(repo["name"], {})
        rec["chi"], rec["m"] = f.get("chi"), f.get("committed")
        prev_chi = (prev or {}).get("chi")
        rec["chi_delta"] = (rec["chi"] - prev_chi) if (rec.get("chi") is not None and prev_chi is not None) else None
    else:
        rec["tracker_error"] = "tracker not installed on the node"
    return rec


class RepoService:
    def __init__(self):
        self.version = 0
        self.running = False
        self.last_pass: Optional[str] = None
        self._wake = asyncio.Event()

    def refresh(self) -> None:
        self._wake.set()

    async def run_pass(self) -> List[dict]:
        self.running = True
        prev = last_records()
        out = []
        try:
            try:
                await asyncio.to_thread(refresh_inventory)
            except Exception as e:                # keep the last list; the pass still runs
                log.warning("repos: inventory refresh failed (%s)", type(e).__name__)
            for repo in active_subset():
                try:
                    rec = await asyncio.to_thread(pass_one, repo, prev.get(repo["name"]))
                except subprocess.TimeoutExpired:
                    rec = {"ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                           "repo": repo["name"], "error": "timed out"}
                with open(_dir() / "history.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(rec) + "\n")
                out.append(rec)
                self.version += 1
        finally:
            self.running = False
            self.last_pass = datetime.now(timezone.utc).isoformat(timespec="seconds")
            self.version += 1
        return out

    async def run(self) -> None:
        await asyncio.sleep(120)                 # let the node settle after a restart
        while True:
            try:
                await self.run_pass()
            except Exception:
                log.exception("repos: pass failed")
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=PASS)
            except asyncio.TimeoutError:
                pass
            self._wake.clear()

    def snapshot(self) -> dict:
        latest = last_records()
        return {"version": self.version, "running": self.running, "last_pass": self.last_pass,
                "tracker": bool(_tracker_bin()), "settings": settings(),
                "repos": [{**r, **{k: latest.get(r["name"], {}).get(k) for k in
                                   ("chi", "m", "chi_delta", "commits", "head", "ts", "error", "tracker_error")}}
                          for r in active_subset()]}


REPOS = RepoService()


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("REPOS_SCHEDULER", "1") == "0":
        return None
    return asyncio.create_task(REPOS.run(), name="repos")
