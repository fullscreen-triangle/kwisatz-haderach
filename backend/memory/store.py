"""
A memory on disk.

  <dir>/memory.json         nodes, proposals and settings (atomic rewrite)
  <dir>/observations.jsonl  every observation, appended, never rewritten

Observations only grow (keep semantics), so the count of witnesses of a node never falls.
Rules are code, not data: a caller re-registers them after loading.
"""

from __future__ import annotations

import json
from pathlib import Path

from backend.memory.structure import Node, Observation, Structure


def save(s: Structure, d: Path) -> None:
    d.mkdir(parents=True, exist_ok=True)
    meta = {"alpha": s.alpha, "theta": s._theta,
            "nodes": [{"record": n.record, "slot": n.slot, "candidates": n.candidates, "classes": n.classes,
                       "completion": n.completion, "label": n.label} for n in s.nodes.values()],
            "proposals": s.proposals,
            "fired": sorted([rid, list(vals)] for rid, vals in s._fired)}   # so a reload never re-fires
    tmp = d / ".memory.json.tmp"
    tmp.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    tmp.replace(d / "memory.json")
    path = d / "observations.jsonl"
    have = sum(1 for _ in path.open(encoding="utf-8")) if path.exists() else 0
    if have > len(s.observations):
        raise RuntimeError(f"{path} holds {have} observations but the memory only {len(s.observations)}: "
                           "observations are never removed")
    with path.open("a", encoding="utf-8") as f:
        for o in s.observations[have:]:
            f.write(json.dumps({"node": o.node, "loglik": o.loglik, "source": o.source, "channel": o.channel,
                                "cue": o.cue, "derived": o.derived}, ensure_ascii=False) + "\n")


def load(d: Path) -> Structure:
    meta_path = d / "memory.json"
    if not meta_path.exists():
        return Structure()
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    s = Structure(alpha=meta.get("alpha", 0.05), theta=meta.get("theta"))
    for n in meta.get("nodes", []):
        s.nodes[Node(n["record"], n["slot"], []).id] = Node(n["record"], n["slot"], list(n["candidates"]),
                                                             dict(n.get("classes") or {}), n.get("completion"),
                                                             n.get("label") or n["slot"])
    s.proposals = list(meta.get("proposals", []))
    s._fired = {(rid, tuple(vals)) for rid, vals in meta.get("fired", [])}
    path = d / "observations.jsonl"
    if path.exists():
        for line in path.open(encoding="utf-8"):
            o = json.loads(line)
            s.observe(Observation(o["node"], o["loglik"], o["source"], o["channel"], o.get("cue", ""),
                                  derived=o.get("derived", False)))
    return s
