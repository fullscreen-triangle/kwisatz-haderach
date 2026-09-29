"""
A reading task's graph, rebuilt from okgg's report.json — no model involved.

  tree      facets[].sets (commit order) -> calculus.Facet -> the descent tree with recursive
            targets (individuate/tree.py, the same JSON the dial uses), each node annotated
            with how many of its sections have been read
  ideas     okgg's induced concepts (a value's extension; synonyms share one), each with its
            sections and read share
  section   the text of one entity from the workspace okgg read (the snapshot the triples
            are about), with every triple's cue located to its line, a GitHub permalink at
            the commit the graph was made from, and whether the file changed since it was read

"Where each idea is" = repo / path / line of the cue that witnessed it.
"""

from __future__ import annotations

import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from backend.individuate.calculus import Facet, statuses
from backend.individuate.tree import tree_json
from backend.reading import locate, runner, store

MAX_LINES = 600                  # a section longer than this is shown in part, with its full span


def split_key(key: str) -> Tuple[str, str, str]:
    """'<repo>/<path>#<slug>' -> (repo, path, slug)."""
    path, _, slug = key.partition("#")
    repo, _, rel = path.partition("/")
    return repo, rel, slug


@lru_cache(maxsize=4096)
def _file_sections(file: str, mtime: float) -> Tuple[List[str], Dict[str, locate.Span]]:
    p = Path(file)
    text = p.read_bytes().decode("utf-8", errors="replace")
    rel = p.name
    spans = {s.key.split("#", 1)[1] if "#" in s.key else "": s for s in locate.sections(rel, text)}
    return text.splitlines(), spans


def span_of(tid: str, key: str) -> Tuple[List[str], Optional[locate.Span]]:
    repo, rel, slug = split_key(key)
    f = store.task_dir(tid) / "ws" / repo / rel
    try:
        lines, spans = _file_sections(str(f), f.stat().st_mtime)
    except OSError:
        return [], None
    return lines, spans.get(slug) if slug else spans.get("") or next(iter(spans.values()), None)


class Index:
    """Everything derivable from one report; cached per task until the report changes."""

    def __init__(self, tid: str, report: dict):
        self.tid = tid
        self.report = report
        self.keys: List[str] = [e["key"] for e in report.get("entities", [])]
        self.pos = {k: i for i, k in enumerate(self.keys)}
        self.facets = [Facet(name=f.get("property") or "property", values=[v["name"] for v in f["values"]],
                             S=np.array(f["sets"], dtype=np.int64)) for f in report.get("facets", [])]
        self.cert = statuses(self.facets, len(self.keys))["cert"]
        self.triples: Dict[str, List[dict]] = {}
        for t in report.get("triples", []):
            self.triples.setdefault(t["entity"], []).append(t)
        self.cells = [c for c in report.get("cells", []) if len(c) > 1]

    def tree(self, theta: float, read: set) -> Tuple[Dict[str, dict], Optional[str]]:
        keys = self.keys
        annotate = lambda members: {"read": sum(1 for x in members if keys[x] in read)}
        return tree_json(self.facets, keys, self.cert, theta, "Everything to read", annotate)

    def ideas(self, read: set) -> List[dict]:
        out = []
        for c in self.report.get("concepts", []):
            ext = c.get("extension", [])
            out.append({"id": c["id"], "names": c.get("names", []), "broader": c.get("broader", []),
                        "size": len(ext), "read": sum(1 for k in ext if k in read), "sections": ext})
        out.sort(key=lambda c: (-c["size"], c["id"]))
        return out


_CACHE: Dict[str, Tuple[float, Index]] = {}


def index(tid: str) -> Optional[Index]:
    f = store.task_dir(tid) / "okgg" / "report.json"
    try:
        m = f.stat().st_mtime
    except OSError:
        return None
    hit = _CACHE.get(tid)
    if hit and hit[0] == m:
        return hit[1]
    rep = store.report(tid)
    if not rep:
        return None
    ix = Index(tid, rep)
    _CACHE[tid] = (m, ix)
    return ix


# ------------------------------------------------------------------ progress + drift

def changed_since_read(tid: str, progress: Dict[str, dict]) -> set:
    """Read sections whose file changed in its repo between the commit it was read at and now."""
    by_head: Dict[Tuple[str, str], List[str]] = {}
    for key, rec in progress.items():
        repo, rel, _ = split_key(key)
        if rec.get("head"):
            by_head.setdefault((repo, rec["head"]), []).append(key)
    out = set()
    for (repo, old), keys in by_head.items():
        now = runner.head_of(repo)
        if not now or now == old:
            continue
        r = subprocess.run(["git", "diff", "--name-only", old, now], cwd=runner.clone_of(repo),
                           capture_output=True, text=True, timeout=60)
        touched = set(r.stdout.split())
        out |= {k for k in keys if split_key(k)[1] in touched}
    return out


def full_name(repo: str) -> str:
    from backend.repos import service as rs
    for r in rs.inventory():
        if r.get("name") == repo and r.get("full_name"):
            return r["full_name"]
    return f"{rs.settings()['owner']}/{repo}"


# ------------------------------------------------------------------ views

def node_view(tid: str, node_id: str = "") -> Optional[dict]:
    t, ix = store.get(tid), index(tid)
    if t is None:
        return None
    base = {"task": t, "node": None, "children": [], "sections": [], "breadcrumb": []}
    if ix is None:
        return base
    prog = store.progress(tid)
    read = set(prog)
    nodes, root = ix.tree(float(t.get("theta", 0.9)), read)
    nid = node_id or root
    if nid not in nodes:
        return None
    nd = nodes[nid]
    crumbs, cur = [], nd
    while cur.get("parent"):
        cur = nodes[cur["parent"]]
        crumbs.append({"id": cur["id"], "label": cur["label"]})
    changed = changed_since_read(tid, prog)
    slim = lambda n: {k: v for k, v in n.items() if k != "members"}
    sections = []
    for k in nd["members"]:
        repo, rel, slug = split_key(k)
        _, sp = span_of(tid, k)
        sections.append({"key": k, "repo": repo, "path": rel, "heading": sp.heading if sp else "",
                         "lines": [sp.start, sp.end] if sp else None, "read": k in read, "changed": k in changed,
                         "triples": len(ix.triples.get(k, []))})
    sections.sort(key=lambda s: (s["read"], s["repo"], s["path"], s["lines"][0] if s["lines"] else 0))
    return {**base, "node": slim(nd), "breadcrumb": list(reversed(crumbs)),
            "children": [slim(nodes[c]) for c in nd["children"]], "sections": sections,
            "summary": {"V": ix.report.get("value"), "entities": len(ix.keys), "read": len(read & set(ix.keys)),
                        "changed": len(changed), "facets": len(ix.facets), "stop": ix.report.get("stop")}}


def section_view(tid: str, key: str, node_id: str = "") -> Optional[dict]:
    t, ix = store.get(tid), index(tid)
    if t is None or ix is None or key not in ix.pos:
        return None
    lines, sp = span_of(tid, key)
    repo, rel, _ = split_key(key)
    head = (t.get("run") or {}).get("heads", {}).get(repo, "")
    start, end = (sp.start, sp.end) if sp else (1, len(lines))
    shown_end = min(end, start + MAX_LINES - 1)
    cues = []
    for tr in ix.triples.get(key, []):
        cues.append({**tr, "line": locate.cue_line(lines, start, end, tr["cue"]) if lines else None})
    prog = store.progress(tid)
    read = set(prog)
    nxt = None
    if node_id:
        nodes, _ = ix.tree(float(t.get("theta", 0.9)), read)
        members = (nodes.get(node_id) or {}).get("members", [])
        after = members[members.index(key) + 1:] + members[:members.index(key)] if key in members else members
        nxt = next((k for k in after if k not in read and k != key), None)
    mates = next((c for c in ix.cells if key in c), [])
    link = f"https://github.com/{full_name(repo)}/blob/{head or 'HEAD'}/{rel}#L{start}-L{end}"
    return {"key": key, "repo": repo, "path": rel, "heading": sp.heading if sp else "",
            "lines": [start, end], "shown": [start, shown_end],
            "text": lines[start - 1:shown_end], "cues": cues, "permalink": link,
            "read": key in read, "read_at": (prog.get(key) or {}).get("read_at"),
            "changed": key in changed_since_read(tid, {key: prog[key]}) if key in prog else False,
            "cell_mates": [k for k in mates if k != key], "next": nxt}
