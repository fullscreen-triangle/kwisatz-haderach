"""
The descent tree as JSON — shared by the depth dial (service.graph) and reading tasks.

Given committed facets (calculus.Facet, in commitment order), the entity keys they are
aligned with, the certified-pair matrix and a target θ, this builds the manuscript's descent
tree with recursive targets (calculus.descent_tree / propagate_targets) and serialises every
node: a stable id (hash of its members' keys), its label (the value(s) of the facet that
split it off its parent), children, parent, value, a/o/w, target and regime. `annotate`
adds per-node fields the caller needs (due dates for the dial, reading progress for tasks).
"""

from __future__ import annotations

import hashlib
from typing import Callable, Dict, List, Optional, Tuple

import numpy as np

from backend.individuate.calculus import Facet, descent_tree, node_value, propagate_targets, walk


def label(F: Facet, mask: int) -> str:
    if mask == 0:
        return f"{F.name}: not determined"
    return f"{F.name}: " + " & ".join(F.values[v] for v in range(len(F.values)) if mask >> v & 1)


def tree_json(facets: List[Facet], keys: List[str], cert: np.ndarray, theta: float,
              root_label: str = "Everything",
              annotate: Optional[Callable[[List[int]], dict]] = None) -> Tuple[Dict[str, dict], Optional[str]]:
    n = len(keys)
    if n == 0:
        return {}, None
    root = descent_tree(facets, n, cert)
    propagate_targets(root, theta, cert)

    def nid(members) -> str:
        return hashlib.sha1(",".join(sorted(keys[x] for x in members)).encode()).hexdigest()[:10]

    parent_of: Dict[int, object] = {}
    for node in walk(root):
        for c in node.children:
            parent_of[id(c)] = node
    nodes: Dict[str, dict] = {}
    for node in walk(root):
        i = nid(node.members)
        par = parent_of.get(id(node))
        lab = root_label
        if par is not None:
            F = facets[par.level - 1]
            lab = label(F, int(F.S[node.members[0]]))
        N = node.N
        nodes[i] = {
            "id": i, "depth": node.depth, "size": len(node.members), "label": lab,
            "split_by": facets[node.level - 1].name if node.children else None,
            "children": [nid(c.members) for c in node.children],
            "parent": nid(par.members) if par is not None else None,
            "value": round(node_value(node, cert), 4),
            "a": round(node.cross_cert / N, 4) if N and node.children else 0.0,
            "o": round(node.cross_open / N, 4) if N and node.children else 0.0,
            "w": round(sum(c.N for c in node.children) / N, 4) if N and node.children else 0.0,
            "target": round(node.target or 0.0, 4), "regime": node.regime,
            "members": [keys[x] for x in node.members],
            **(annotate(node.members) if annotate else {}),
        }
    return nodes, nid(root.members)
