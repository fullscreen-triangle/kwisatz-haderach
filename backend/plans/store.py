"""
The plan store — <state>/plans/plans.json, one list of nodes, written atomically.

Every change bumps `version` and calls the listeners (the planner re-plans, the
individuation service re-reads its corpus). Deleting a node deletes its subtree and
removes it from other nodes' `requires`, so no dangling id silently blocks anything.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Dict, List

from backend.plans.model import PlanNode, new_id


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class PlansStore:
    def __init__(self, directory: Path):
        self.dir = directory
        self.path = directory / "plans.json"
        self.version = 0
        self.listeners: List[Callable[[], None]] = []

    # ------------------------------------------------------------- io

    def _load(self) -> List[dict]:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return []
        return data.get("nodes", []) if isinstance(data, dict) else []

    def _save(self, nodes: Dict[str, PlanNode]) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        tmp = self.dir / ".plans.json.tmp"
        tmp.write_text(json.dumps({"nodes": [n.model_dump(exclude_none=True) for n in nodes.values()]},
                                  indent=1, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, self.path)
        self.version += 1
        for f in list(self.listeners):
            f()

    def nodes(self) -> Dict[str, PlanNode]:
        out: Dict[str, PlanNode] = {}
        for d in self._load():
            try:
                n = PlanNode(**d)
            except ValueError:
                continue                     # a hand-edited bad node is skipped, not fatal
            out[n.id] = n
        return out

    # ------------------------------------------------------------- edits

    def add(self, node: PlanNode) -> PlanNode:
        nodes = self.nodes()
        if node.parent and node.parent not in nodes:
            raise KeyError(node.parent)
        node.id = node.id if node.id and node.id not in nodes else new_id(node.title, set(nodes))
        node.created = node.updated = _now()
        nodes[node.id] = node
        self._save(nodes)
        return node

    def update(self, nid: str, patch: dict) -> PlanNode:
        nodes = self.nodes()
        if nid not in nodes:
            raise KeyError(nid)
        patch = {k: v for k, v in patch.items() if k not in ("id", "created")}
        if patch.get("parent"):
            p = patch["parent"]
            if p not in nodes:
                raise KeyError(p)
            anc = p                         # refuse a cycle: nid may not become its own ancestor
            while anc:
                if anc == nid:
                    raise ValueError("a node cannot be moved under itself")
                anc = nodes[anc].parent if anc in nodes else None
        n = PlanNode(**{**nodes[nid].model_dump(), **patch, "updated": _now()})
        nodes[nid] = n
        self._save(nodes)
        return n

    def delete(self, nid: str) -> int:
        nodes = self.nodes()
        if nid not in nodes:
            raise KeyError(nid)
        gone = {nid}
        grew = True
        while grew:
            more = {k for k, n in nodes.items() if n.parent in gone} - gone
            gone |= more
            grew = bool(more)
        for k in gone:
            nodes.pop(k)
        for n in nodes.values():
            if any(r in gone for r in n.requires):
                n.requires = [r for r in n.requires if r not in gone]
        self._save(nodes)
        return len(gone)

    def import_nodes(self, items: List[dict]) -> dict:
        """Merge a seed: nodes are keyed by the id they carry; existing ids are left alone,
        so re-importing the same seed is a no-op and never overwrites his edits."""
        nodes = self.nodes()
        added, skipped, rejected = 0, 0, []
        for i, d in enumerate(items):
            try:
                n = PlanNode(**d)
            except ValueError as e:
                rejected.append({"index": i, "reason": str(e)[:200]})
                continue
            if not n.id or n.id in nodes:
                skipped += 1
                continue
            n.created = n.updated = _now()
            nodes[n.id] = n
            added += 1
        dangling = [n.id for n in nodes.values() if n.parent and n.parent not in nodes]
        for nid in dangling:
            nodes[nid].parent = None
        if added:
            self._save(nodes)
        return {"added": added, "skipped": skipped, "rejected": rejected, "orphaned": dangling}


def _store() -> PlansStore:
    from backend.keeper.service import state_dir
    return PlansStore(state_dir() / "plans")


PLANS = _store()
