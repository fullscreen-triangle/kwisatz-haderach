"""
The work desk on the node: a snapshot of currentValue (backend/work/desk.py) plus what each
work project's repository did lately, refreshed every PASS seconds and kept in
<state>/work/snapshot.json so a restart or an unreachable source still has an answer.

Where the desk is read from, first that answers:
  gitea   a clone in <state>/work/currentValue, pulled from the uni Gitea with the forge
          account the keeper pushes (FORGE_<ID>_* whose URL is git.uni-greifswald.de). The
          token goes to git as an environment-only http.extraHeader, never into .git/config.
          This is the desk as both sides pushed it.
  laptop  the laptop's own copy through the laptop node (WORK_DESK_LAPTOP_PATH), including
          what is not committed yet. Used when the forge refuses or the clone fails.

Project activity (newest commits on each project's branch, how many are not yet written up)
comes from the Gitea API with the same account; without one it is simply absent.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import List, Optional

import httpx

from backend.keeper.service import state_dir
from backend.work import desk

log = logging.getLogger("work")

PASS = int(os.getenv("WORK_DESK_PASS", str(30 * 60)))
REPO = os.getenv("WORK_DESK_REPO", "https://git.uni-greifswald.de/sachikonyk/currentValue.git")
LAPTOP_PATH = os.getenv("WORK_DESK_LAPTOP_PATH", r"C:\Users\kunda\Documents\portfolio\pomerania\currentValue")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _dir() -> Path:
    d = state_dir() / "work"
    d.mkdir(parents=True, exist_ok=True)
    return d


def host_of(url: str) -> str:
    return re.sub(r"^https?://", "", url).split("/", 1)[0].lower()


def account(env=None):
    """The forge account for the desk's host, from the keeper's FORGE_* variables."""
    from backend import forges
    host = host_of(REPO)
    return next((a for a in forges.discover(env if env is not None else os.environ) if a.host == host), None)


# --------------------------------------------------------------------------- readers

class LocalReader:
    def __init__(self, root: Path):
        self.root = root.resolve()

    def _path(self, rel: str) -> Path:
        p = (self.root / rel).resolve()
        if p != self.root and self.root not in p.parents:
            raise ValueError("outside the desk")
        return p

    async def list(self, rel: str) -> List[str]:
        p = self._path(rel)
        return sorted(c.name for c in p.iterdir()) if p.is_dir() else []

    async def read(self, rel: str) -> Optional[str]:
        p = self._path(rel)
        return p.read_text(encoding="utf-8", errors="replace") if p.is_file() else None


class LaptopReader:
    def __init__(self, root: str = LAPTOP_PATH):
        self.root = PureWindowsPath(root)

    def _path(self, rel: str) -> str:
        parts = PurePosixPath(rel).parts if rel else ()
        if ".." in parts:
            raise ValueError("outside the desk")
        return str(self.root.joinpath(*parts))

    async def list(self, rel: str) -> List[str]:
        from backend import laptop
        try:
            return sorted(e["name"] for e in (await laptop.listing(self._path(rel))).get("entries", []))
        except laptop.LaptopRefused:
            return []

    async def read(self, rel: str) -> Optional[str]:
        from backend import laptop
        try:
            return (await laptop.read(self._path(rel))).get("text")
        except laptop.LaptopRefused:
            return None


# --------------------------------------------------------------------------- the clone

def _git_env(acct) -> dict:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    if acct:
        basic = base64.b64encode(f"{acct.user or 'oauth2'}:{acct.token}".encode()).decode()
        env.update(GIT_CONFIG_COUNT="1", GIT_CONFIG_KEY_0="http.extraHeader",
                   GIT_CONFIG_VALUE_0=f"Authorization: Basic {basic}")
    return env


def _git(args: List[str], acct, cwd: Optional[Path] = None, timeout: int = 300) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=cwd, env=_git_env(acct), capture_output=True, text=True, timeout=timeout)


def _clean(err: str, acct) -> str:
    if acct and acct.token:
        err = err.replace(acct.token, "****")
    return " ".join(err.split())[:300]


def sync_clone(acct) -> Path:
    """Clone or fast-forward the desk; raises RuntimeError with git's reason (token masked)."""
    d = _dir() / "currentValue"
    if (d / ".git").is_dir():
        r = _git(["pull", "--ff-only", "--quiet"], acct, cwd=d)
    else:
        r = _git(["clone", "--quiet", "--depth", "50", REPO, str(d)], acct)
    if r.returncode != 0:
        raise RuntimeError(_clean(r.stderr or r.stdout, acct) or f"git exited {r.returncode}")
    return d


def desk_log(d: Path, n: int = 10) -> List[dict]:
    r = _git(["log", f"-{n}", "--format=%h%x09%cI%x09%an%x09%s"], None, cwd=d, timeout=30)
    out = []
    for line in r.stdout.splitlines():
        sha, when, who, subject = (line.split("\t") + ["", "", "", ""])[:4]
        out.append({"sha": sha, "date": when[:10], "by": who, "subject": subject})
    return out


# --------------------------------------------------------------------------- project activity

def _owner_repo(url: str) -> Optional[tuple]:
    m = re.match(r"^https?://[^/]+/([^/]+)/([^/]+?)(?:\.git)?/?$", url or "")
    return (m.group(1), m.group(2)) if m else None


async def activity(projects: List[dict], acct, client: Optional[httpx.AsyncClient] = None) -> None:
    """Add `commits` (newest first) and `unwritten` (commits after `seen`) to each project."""
    if not acct:
        return
    own = client is None
    client = client or httpx.AsyncClient(timeout=20, headers=acct.headers)
    anon = None                                  # Gitea refuses a dead token even on a public repo
    try:
        for p in projects:
            ore = _owner_repo(p.get("repo", ""))
            if not ore or host_of(p.get("repo", "")) != acct.host:
                continue
            url = f"{acct.api}/repos/{ore[0]}/{ore[1]}/commits"
            params = {"sha": p.get("branch") or "main", "limit": 10, "stat": "false", "verification": "false", "files": "false"}
            try:
                r = await client.get(url, params=params)
                if r.status_code == 401:
                    mock = getattr(client, "_transport", None)
                    anon = anon or httpx.AsyncClient(timeout=20, transport=mock if isinstance(mock, httpx.MockTransport) else None)
                    r = await anon.get(url, params=params)
                    p["activity_note"] = "the uni forge token was rejected; read as a public repository"
            except httpx.HTTPError as e:
                p["activity_error"] = type(e).__name__
                continue
            if r.status_code != 200:
                p["activity_error"] = ("a private repository, and the uni forge token was rejected: renew it "
                                       "(tracker tokens set uni, then python -m tools.keeper push)"
                                       if p.get("activity_note") and r.status_code == 404 else f"Gitea answered {r.status_code}")
                p.pop("activity_note", None)
                continue
            commits = [{"sha": c.get("sha", "")[:10], "date": (c.get("commit", {}).get("committer", {}).get("date") or "")[:10],
                        "subject": (c.get("commit", {}).get("message") or "").splitlines()[0][:160] if c.get("commit", {}).get("message") else ""}
                       for c in r.json()]
            p["commits"] = commits
            seen = p.get("seen") or ""
            idx = next((i for i, c in enumerate(commits) if seen and seen.startswith(c["sha"])), None)
            p["unwritten"] = idx if idx is not None else (None if not seen else f"more than {len(commits)}")
    finally:
        if own:
            await client.aclose()
        if anon is not None:
            await anon.aclose()


# --------------------------------------------------------------------------- the service

class WorkService:
    def __init__(self):
        self.version = 0
        self.running = False
        self._wake = asyncio.Event()

    def path(self) -> Path:
        return _dir() / "snapshot.json"

    def snapshot(self) -> dict:
        try:
            return json.loads(self.path().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {"source": None, "as_of": None, "note": "the work desk has not been read yet"}

    def _save(self, snap: dict) -> None:
        tmp = self.path().with_suffix(".tmp")
        tmp.write_text(json.dumps(snap, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path())
        self.version += 1

    def reader(self) -> tuple:
        """(reader, source, notes about sources that did not answer) — the clone, else the laptop."""
        acct, notes = account(), []
        if acct:
            try:
                d = sync_clone(acct)
                return LocalReader(d), "gitea", notes
            except (RuntimeError, OSError, subprocess.TimeoutExpired) as e:
                notes.append(f"uni Gitea: {e}")
                d = _dir() / "currentValue"
                if (d / ".git").is_dir():
                    notes.append("read the last clone instead; it may be behind")
                    return LocalReader(d), "gitea (last clone)", notes
        else:
            notes.append(f"no forge account for {host_of(REPO)} on the node (keeper push carries the vault's Git group)")
        return LaptopReader(), "laptop", notes

    async def run_pass(self) -> dict:
        self.running = True
        try:
            from backend import laptop
            reader, source, notes = await asyncio.to_thread(self.reader)
            try:
                snap = await desk.read_desk(reader)
            except laptop.LaptopOffline as e:
                old = self.snapshot()
                old.update(notes=notes + [f"laptop: {e}", "kept the last snapshot" if old.get("as_of") else "nothing read yet"],
                           stale=True)
                self._save(old)
                return old
            await activity(snap["projects"], account())
            if isinstance(reader, LocalReader):
                snap["desk_log"] = await asyncio.to_thread(desk_log, reader.root)
            snap.update(source=source, as_of=_now(), notes=notes, stale=False,
                        repo=REPO, laptop_path=LAPTOP_PATH)
            self._save(snap)
            return snap
        finally:
            self.running = False

    def refresh(self) -> None:
        self._wake.set()

    async def run(self) -> None:
        await asyncio.sleep(90)
        while True:
            try:
                await self.run_pass()
            except Exception:
                log.exception("work: pass failed")
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=PASS)
            except asyncio.TimeoutError:
                pass
            self._wake.clear()

    async def file(self, rel: str) -> Optional[str]:
        """One desk document's text, from the source the last pass used."""
        rel = rel.replace("\\", "/").lstrip("/")
        if not rel.endswith((".md", ".toml")):
            raise ValueError("only the desk's .md and .toml documents")
        source = (self.snapshot().get("source") or "")
        clone = _dir() / "currentValue"
        reader = LocalReader(clone) if source.startswith("gitea") and (clone / ".git").is_dir() else LaptopReader()
        return await reader.read(rel)


WORK = WorkService()


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("WORK_DESK_SCHEDULER", "1") == "0":
        return None
    return asyncio.create_task(WORK.run(), name="work")
