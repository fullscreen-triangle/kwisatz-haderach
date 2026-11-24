"""
Reading Kundai's work desk (currentValue, pomerania/currentValue): a git repository shared
with Mark Dörr in which two AIs keep the record of the work projects. The desk's own rules
(its AGENTS.md) say what lives where, so this reads those places and nothing else:

  desk.toml                        the projects (repo, branch, side, what each is about)
  sides/kundai/brief/<date>.md     the newest brief: what to read first, what needs him
  sides/kundai/inbox/              notes he left for his desk AI
  sides/kundai/{develop,present,updates}/   his working documents (titles)
  threads/<id>/<nnn>-<author>.md   questions between the two sides; the newest post's status
                                   says whom a thread waits for (needs-kundai = him)
  projects/<name>/status.md        Witnessed / Open / Against the plan
  projects/<name>/log/             one write-up per batch of commits; seen = commit reached
  plan/, decisions/                goals and decisions, written by people

Any source works that can list a folder and read a file (a clone on the node, or the laptop's
copy through the laptop node): `Reader`. Nothing is ever written to the desk.
"""

from __future__ import annotations

import re
import tomllib
from typing import Awaitable, Callable, Dict, List, Optional, Protocol

ME = "kundai"
FRONT = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?(.*)\Z", re.S)
MAX_FIRST = 4000


class Reader(Protocol):
    async def list(self, rel: str) -> List[str]: ...      # names in a folder ("" = root); [] if missing
    async def read(self, rel: str) -> Optional[str]: ...  # a file's text, None if missing


def front(text: str) -> tuple:
    """(front-matter fields, body) of a desk post or note."""
    m = FRONT.match(text or "")
    if not m:
        return {}, text or ""
    meta = {}
    for line in m.group(1).splitlines():
        k, sep, v = line.partition(":")
        if sep:
            meta[k.strip()] = v.strip().strip('"')
    return meta, m.group(2)


def heading(text: str, fallback: str = "") -> str:
    for line in (text or "").splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def title_of(name: str) -> str:
    """`04-enzyme.md` -> `enzyme`, `2026-11-10-de25eca.md` -> `2026-11-10-de25eca`."""
    stem = name.rsplit(".", 1)[0]
    return re.sub(r"^\d{2}-", "", stem).replace("-", " ") if re.match(r"^\d{2}-", stem) else stem


def sections(md: str) -> Dict[str, str]:
    """`## Heading` -> its text, for status.md and briefs."""
    out, cur, buf = {}, None, []
    for line in (md or "").splitlines():
        if line.startswith("## "):
            if cur is not None:
                out[cur] = "\n".join(buf).strip()
            cur, buf = line[3:].strip(), []
        elif cur is not None:
            buf.append(line)
    if cur is not None:
        out[cur] = "\n".join(buf).strip()
    return out


def bullets(text: str, limit: int = 40) -> List[str]:
    """Top-level bullets, each with its continuation lines folded in, links reduced to text."""
    items: List[str] = []
    for line in (text or "").splitlines():
        if line.startswith("- "):
            items.append(line[2:].strip())
        elif items and line.startswith("  ") and not line.lstrip().startswith("- "):
            items[-1] += " " + line.strip()
    clean = [re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", b).replace("**", "") for b in items]
    return [c[:400] for c in clean[:limit]]


def _md(names: List[str]) -> List[str]:
    return sorted(n for n in names if n.endswith(".md") and n.lower() != "readme.md")


def projects_of(toml_text: str) -> List[dict]:
    try:
        cfg = tomllib.loads(toml_text or "")
    except tomllib.TOMLDecodeError:
        return []
    keep = ("name", "side", "about", "repo", "branch")
    return [{k: p.get(k, "") for k in keep} for p in cfg.get("project", []) if p.get("name")]


async def thread(reader: Reader, tid: str) -> Optional[dict]:
    posts = sorted(n for n in await reader.list(f"threads/{tid}") if n.endswith(".md"))
    if not posts:
        return None
    first_meta, _ = front(await reader.read(f"threads/{tid}/{posts[0]}") or "")
    last_meta, last_body = front(await reader.read(f"threads/{tid}/{posts[-1]}") or "")
    status = last_meta.get("status", "open")
    asker = posts[0].rsplit(".", 1)[0].split("-", 1)[-1].removesuffix("-ai")
    to = first_meta.get("to", "")
    waits = {"open": to, "answered": asker}.get(status, status.removeprefix("needs-") if status.startswith("needs-") else "")
    return {"id": tid, "title": first_meta.get("title", tid), "about": first_meta.get("about", ""), "to": to,
            "asked_by": asker, "status": status, "posts": len(posts), "waits_for": waits,
            "needs_person": status.startswith("needs-"), "last": last_body.strip()[:600]}


async def read_desk(reader: Reader, on_progress: Optional[Callable[[], Awaitable[None]]] = None) -> dict:
    """Everything the desk records about Kundai's work, as one value-free-of-markup snapshot."""
    projects = projects_of(await reader.read("desk.toml") or "")
    briefs = [n for n in _md(await reader.list(f"sides/{ME}/brief")) if re.match(r"\d{4}-\d{2}-\d{2}", n)]
    brief = None
    if briefs:
        text = await reader.read(f"sides/{ME}/brief/{briefs[-1]}") or ""
        sec = sections(text)
        brief = {"file": f"sides/{ME}/brief/{briefs[-1]}", "date": briefs[-1][:10], "title": heading(text, briefs[-1]),
                 "first": (sec.get("First") or text)[:MAX_FIRST], "needs_you": bullets(sec.get("Needs you", "")),
                 "later": bullets(sec.get("Later", ""), 20)}

    threads = []
    for name in sorted(await reader.list("threads")):
        if "." not in name:                                  # a thread is a folder
            t = await thread(reader, name)
            if t:
                threads.append(t)

    for p in projects:
        base = f"projects/{p['name']}"
        status = await reader.read(f"{base}/status.md") or ""
        sec = sections(status)
        p["witnessed"] = bullets(sec.get("Witnessed", ""), 12)
        p["open"] = bullets(sec.get("Open", ""))
        p["against_plan"] = bullets(sec.get("Against the plan", ""))
        p["seen"] = ((await reader.read(f"{base}/seen")) or "").strip()[:40]
        if not p["seen"]:                                    # a reader that only reads documents
            m = re.search(r"Written up to `([0-9a-f]{7,40})`", status)
            p["seen"] = m.group(1) if m else ""
        logs = _md(await reader.list(f"{base}/log"))
        p["log"] = [{"file": f"{base}/log/{n}", "date": n[:10]} for n in logs[-5:]][::-1]
        if logs:
            p["log"][0]["title"] = heading(await reader.read(f"{base}/log/{logs[-1]}") or "", logs[-1])
        if on_progress:
            await on_progress()

    async def notes(folder: str, read_titles: bool) -> List[dict]:
        out = []
        for n in _md(await reader.list(folder)):
            item = {"file": f"{folder}/{n}", "title": title_of(n)}
            if read_titles:
                item["title"] = heading(await reader.read(f"{folder}/{n}") or "", item["title"])
            out.append(item)
        return out

    return {"projects": projects, "brief": brief, "threads": threads,
            "needs_you": [t for t in threads if t["waits_for"] == ME and t["needs_person"]],
            "plan": await notes("plan", True), "decisions": await notes("decisions", True),
            "inbox": await notes(f"sides/{ME}/inbox", True),
            "documents": {k: await notes(f"sides/{ME}/{k}", False) for k in ("develop", "present", "updates")}}
