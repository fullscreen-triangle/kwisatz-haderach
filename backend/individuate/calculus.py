# Vendored from greifswald/conspirator/experiments/okgg/calculus.py (working copy, 2026-09-27;
# the okgg directory was not yet committed there). Unchanged except this header.
# Manuscript: docs/ontological-knowledge-graph-generator (Sachikonye, "An Ontological
# Knowledge Graph Generator").
"""The calculus of the generator: facets, pair statuses, the recursive value.

Every definition here is the executable form of a numbered definition in the
manuscript. Nothing is approximated: statuses are computed exactly from value
sets, and value sets are held as bit masks (bit v set = value v carried).

Notation (manuscript Sec. 3-6)
  S_F(x)          value set of entity x on facet F; 0 means undetermined
  certified       some facet on which both sets are non-empty and differ
  open            not certified, some facet on which the sets differ
                  (so one of them is empty: an undetermined triple value)
  indiscernible   every facet gives equal sets
"""
from __future__ import annotations

from dataclasses import dataclass, field
from itertools import combinations

import numpy as np


# ---------------------------------------------------------------------------
# Facets and statuses
# ---------------------------------------------------------------------------

@dataclass
class Facet:
    """A facet: a finite value alphabet and a value set (bit mask) per entity."""
    name: str
    values: list[str]
    S: np.ndarray                      # int64 bit masks, one per entity
    cues: dict[str, list[str]] = field(default_factory=dict)
    block: tuple[int, ...] | None = None   # context the facet was proposed for
    origin: str = ""

    def chi(self, v: int) -> np.ndarray:
        """Three-valued distinction of value v: +1 carried, -1 witnessed lacking, 0 undetermined."""
        bit = np.int64(1) << np.int64(v)
        has = (self.S & bit) != 0
        det = self.S != 0
        return np.where(has, 1, np.where(det, -1, 0))


def pair_matrices(facets: list[Facet], n: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (cert, diff): cert[x,y] certified; diff[x,y] some facet differs."""
    cert = np.zeros((n, n), dtype=bool)
    diff = np.zeros((n, n), dtype=bool)
    for F in facets:
        S = F.S
        det = S != 0
        d = S[:, None] != S[None, :]
        diff |= d
        cert |= d & det[:, None] & det[None, :]
    return cert, diff


def statuses(facets: list[Facet], n: int) -> dict:
    cert, diff = pair_matrices(facets, n)
    iu = np.triu_indices(n, 1)
    c, d = cert[iu], diff[iu]
    return {
        "cert": cert,
        "open": diff & ~cert,
        "indisc": ~diff,
        "n_cert": int(c.sum()),
        "n_open": int((d & ~c).sum()),
        "n_indisc": int((~d).sum()),
        "N": n * (n - 1) // 2,
    }


def status_by_distinctions(facets: list[Facet], x: int, y: int) -> str:
    """Pair status read off the value distinctions (Lemma 4.2), for cross-checking."""
    plus_minus = False
    differ = False
    for F in facets:
        for v in range(len(F.values)):
            a, b = F.chi(v)[x], F.chi(v)[y]
            if {a, b} == {1, -1}:
                plus_minus = True
            if a != b:
                differ = True
    if plus_minus:
        return "C"
    return "O" if differ else "I"


def status_by_sets(facets: list[Facet], x: int, y: int) -> str:
    """Pair status read off the value sets (Definition 4.1)."""
    cert = any(F.S[x] and F.S[y] and F.S[x] != F.S[y] for F in facets)
    if cert:
        return "C"
    return "O" if any(F.S[x] != F.S[y] for F in facets) else "I"


def classes(facets: list[Facet], n: int, members: list[int] | None = None) -> list[list[int]]:
    """Cells of the indiscernibility partition (equal value vectors), in first-seen order."""
    members = list(range(n)) if members is None else members
    buckets: dict[tuple, list[int]] = {}
    for x in members:
        key = tuple(int(F.S[x]) for F in facets)
        buckets.setdefault(key, []).append(x)
    return list(buckets.values())


def degrees(st: dict) -> tuple[np.ndarray, np.ndarray]:
    """Per-entity open degree omega(x) and indiscernibility degree iota(x)."""
    o = st["open"].copy()
    np.fill_diagonal(o, False)
    i = st["indisc"].copy()
    np.fill_diagonal(i, False)
    return o.sum(1), i.sum(1)


def value(st: dict) -> float:
    return st["n_cert"] / st["N"] if st["N"] else 1.0


# ---------------------------------------------------------------------------
# Inertness (Theorem 7.4)
# ---------------------------------------------------------------------------

def is_inert(F: Facet, st: dict) -> bool:
    """F changes neither the certified set nor the partition (the exact characterisation)."""
    S = F.S
    n = len(S)
    eq = S[:, None] == S[None, :]
    both = (S != 0)[:, None] & (S != 0)[None, :]
    I = st["indisc"].copy()
    O = st["open"]
    np.fill_diagonal(I, False)
    ok_I = np.all(eq[I])
    ok_O = np.all((eq | ~both)[O])
    return bool(ok_I and ok_O)


def changes(facets: list[Facet], F: Facet, n: int) -> bool:
    """Direct test: does adding F change certified pairs or cells?"""
    a = statuses(facets, n)
    b = statuses(facets + [F], n)
    return not (np.array_equal(a["cert"], b["cert"]) and np.array_equal(a["indisc"], b["indisc"]))


# ---------------------------------------------------------------------------
# The descent tree and the recursive value (Theorems 6.2, 6.3)
# ---------------------------------------------------------------------------

@dataclass
class Node:
    members: list[int]
    level: int                    # number of facets whose partition first splits it
    children: list["Node"] = field(default_factory=list)
    depth: int = 0
    cross_cert: int = 0           # certified pairs between different children
    cross_open: int = 0           # uncertified pairs between different children
    target: float | None = None
    regime: str = ""

    @property
    def N(self) -> int:
        k = len(self.members)
        return k * (k - 1) // 2


def descent_tree(facets: list[Facet], n: int, cert: np.ndarray) -> Node:
    """Compressed tree of the refinement chain P_0 >= P_1 >= ... in facet order."""
    # value vectors restricted to the first j facets
    def split(members: list[int], j0: int) -> tuple[int, list[list[int]]]:
        for j in range(j0 + 1, len(facets) + 1):
            buckets: dict[tuple, list[int]] = {}
            for x in members:
                buckets.setdefault(tuple(int(facets[i].S[x]) for i in range(j)), []).append(x)
            if len(buckets) > 1:
                return j, list(buckets.values())
        return -1, []

    def build(members: list[int], j0: int, depth: int) -> Node:
        node = Node(members=members, level=j0, depth=depth)
        if len(members) < 2:
            return node
        j, parts = split(members, j0)
        if j < 0:
            return node
        node.level = j
        for a, b in combinations(range(len(parts)), 2):
            sub = cert[np.ix_(parts[a], parts[b])]
            node.cross_cert += int(sub.sum())
            node.cross_open += int(sub.size - sub.sum())
        node.children = [build(p, j, depth + 1) for p in parts]
        return node

    return build(list(range(n)), 0, 0)


def node_value(node: Node, cert: np.ndarray) -> float:
    m = node.members
    if node.N == 0:
        return 1.0
    sub = cert[np.ix_(m, m)]
    return int(np.triu(sub, 1).sum()) / node.N


def walk(node: Node):
    yield node
    for c in node.children:
        yield from walk(c)


def propagate_targets(node: Node, theta: float, cert: np.ndarray) -> None:
    """Uniform top-down targets: theta_child = (theta_B - a_B) / w_B (Theorem 6.3)."""
    node.target = theta
    if not node.children or node.N == 0:
        node.regime = "leaf"
        return
    a = node.cross_cert / node.N
    w = sum(c.N for c in node.children) / node.N
    if theta <= a + 1e-12:
        node.regime = "satisfied"
        child = 0.0
    elif w > 0 and theta <= a + w + 1e-12:
        node.regime = "feasible"
        child = (theta - a) / w
    else:
        node.regime = "infeasible"
        child = 1.0 if w > 0 else 0.0
    for c in node.children:
        propagate_targets(c, child, cert)


# ---------------------------------------------------------------------------
# Cross-demand between a claimed and a witnessed carving (Section 8)
# ---------------------------------------------------------------------------

def certified_in(facets: list[Facet], block: list[int]) -> set[tuple[int, int]]:
    out = set()
    for a, b in combinations(sorted(block), 2):
        for F in facets:
            if F.S[a] and F.S[b] and F.S[a] != F.S[b]:
                out.add((a, b))
                break
    return out


def demand(claimed: list[Facet], witnessed: list[Facet], block: list[int]) -> tuple[int, int]:
    m = certified_in(claimed, block)
    k = certified_in(witnessed, block)
    return len(m - k), len(k - m)


def relabel(F: Facet, perm: list[int]) -> Facet:
    """Permute the value alphabet of F (a pure relabelling)."""
    S = np.zeros_like(F.S)
    for v, pv in enumerate(perm):
        bit = np.int64(1) << np.int64(v)
        S |= np.where((F.S & bit) != 0, np.int64(1) << np.int64(pv), 0)
    return Facet(name=F.name + "'", values=[F.values[perm.index(i)] for i in range(len(perm))], S=S)
