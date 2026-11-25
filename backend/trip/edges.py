"""
The walked-edges catalogue (geodcat-consumer `edges` → walked-edges.json) as the estimator
uses it: which parts of a path are ways this person has walked or run, how those ways
compare with the rest of an outing (the edge *factor*), and a route over walked ways only.

The catalogue holds places (it is the person's walked network), so it is read from the
node's state directory and nothing from it leaves this process except lengths and factors.
"""

from __future__ import annotations

import heapq
import json
import math
from dataclasses import dataclass
from pathlib import Path

from backend.trip.bands import ONE, Band

M_PER_DEG = 111_320.0
FACTOR_CLIP = (0.5, 1.5)


@dataclass
class WalkedEdge:
    way: int
    status: str                  # measured | sparse
    traversals: int
    factor: Band                 # applied to the model speed on this way
    lines: list[list[tuple[float, float]]]   # [(lon, lat), ...] per piece


def _factor(e: dict) -> Band:
    lo, hi = (e.get("factor") or [None, None])
    med = e.get("factor_median")
    if med is None or lo is None or hi is None or not all(map(math.isfinite, (lo, hi, med))):
        return ONE
    if e.get("status") == "measured":
        return Band(lo, hi).clip(*FACTOR_CLIP)
    # Sparse: one or two passes. Between what they showed and no information at all.
    return Band(med, med).hull(ONE).clip(*FACTOR_CLIP)


class EdgeCatalogue:
    def __init__(self, edges: list[WalkedEdge], source: dict | None = None):
        self.edges = edges
        self.source = source or {}
        pts = [p for e in edges for line in e.lines for p in line]
        if pts:
            self.lon0 = sum(p[0] for p in pts) / len(pts)
            self.lat0 = sum(p[1] for p in pts) / len(pts)
        else:
            self.lon0 = self.lat0 = 0.0
        self._k = math.cos(math.radians(self.lat0)) * M_PER_DEG
        self.cell = 25.0
        self._grid: dict[tuple[int, int], list[tuple[int, tuple, tuple]]] = {}
        self._graph: dict[tuple, list[tuple[tuple, float]]] = {}
        for i, e in enumerate(edges):
            for line in e.lines:
                xy = [self.xy(p) for p in line]
                for a, b, pa, pb in zip(xy, xy[1:], line, line[1:]):
                    self._index(i, a, b)
                    w = math.dist(a, b)
                    ka, kb = _key(pa), _key(pb)
                    self._graph.setdefault(ka, []).append((kb, w))
                    self._graph.setdefault(kb, []).append((ka, w))

    @classmethod
    def load(cls, path: Path) -> "EdgeCatalogue | None":
        try:
            raw = json.loads(Path(path).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        edges = [WalkedEdge(way=e["osm_way"], status=e.get("status", "sparse"),
                            traversals=e.get("traversals", 0), factor=_factor(e),
                            lines=[[(p[0], p[1]) for p in line] for line in e.get("coords", [])])
                 for e in raw.get("edges", [])]
        return cls(edges, raw.get("osm"))

    def xy(self, p: tuple[float, float]) -> tuple[float, float]:
        return ((p[0] - self.lon0) * self._k, (p[1] - self.lat0) * M_PER_DEG)

    def _index(self, i: int, a: tuple, b: tuple) -> None:
        n = max(1, math.ceil(math.dist(a, b) / (self.cell / 2)))
        seen = set()
        for k in range(n + 1):
            q = (a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)
            c = (math.floor(q[0] / self.cell), math.floor(q[1] / self.cell))
            if c not in seen:
                seen.add(c)
                self._grid.setdefault(c, []).append((i, a, b))

    def nearest(self, p: tuple[float, float], radius: float = 25.0) -> int | None:
        """Index of the walked edge nearest to (lon, lat) within `radius` m."""
        q = self.xy(p)
        cx, cy = math.floor(q[0] / self.cell), math.floor(q[1] / self.cell)
        best, best_d = None, radius
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-2, -1, 0, 1, 2):
                for i, a, b in self._grid.get((cx + dx, cy + dy), ()):
                    d = _seg_dist(q, a, b)
                    if d <= best_d:
                        best, best_d = i, d
        return best

    def cover(self, line: list[tuple[float, float]], step: float = 10.0) -> dict:
        """Length of a (lon, lat) path on each walked edge, and the rest. Sampled every
        `step` m; each sample's share of length goes to the edge nearest it."""
        on: dict[int, float] = {}
        off = 0.0
        for pa, pb in zip(line, line[1:]):
            a, b = self.xy(pa), self.xy(pb)
            L = math.dist(a, b)
            n = max(1, math.ceil(L / step))
            for k in range(n):
                t = (k + 0.5) / n
                lon = pa[0] + (pb[0] - pa[0]) * t
                lat = pa[1] + (pb[1] - pa[1]) * t
                i = self.nearest((lon, lat))
                if i is None:
                    off += L / n
                else:
                    on[i] = on.get(i, 0.0) + L / n
        return {"on": on, "off": off}

    def route(self, a: tuple[float, float], b: tuple[float, float],
              snap_m: float = 150.0) -> list[tuple[float, float]] | None:
        """Shortest path over walked ways only, between the graph nodes nearest to `a`
        and `b` (each within `snap_m`). None when the walked network does not join them."""
        if not self._graph:
            return None

        def snap(p):
            q = self.xy(p)
            k = min(self._graph, key=lambda n: math.dist(self.xy(n), q))
            return k if math.dist(self.xy(k), q) <= snap_m else None

        s, t = snap(a), snap(b)
        if s is None or t is None:
            return None
        dist, prev, heap = {s: 0.0}, {}, [(0.0, s)]
        while heap:
            d, u = heapq.heappop(heap)
            if u == t:
                break
            if d > dist.get(u, math.inf):
                continue
            for v, w in self._graph[u]:
                nd = d + w
                if nd < dist.get(v, math.inf):
                    dist[v], prev[v] = nd, u
                    heapq.heappush(heap, (nd, v))
        if t not in dist:
            return None
        path, u = [t], t
        while u != s:
            u = prev[u]
            path.append(u)
        return [a] + path[::-1] + [b]

    def stats(self) -> dict:
        return {
            "edges": len(self.edges),
            "measured": sum(e.status == "measured" for e in self.edges),
            "sparse": sum(e.status != "measured" for e in self.edges),
            "osm": {k: self.source.get(k) for k in ("name", "licence")},
        }


def _key(p: tuple[float, float]) -> tuple[float, float]:
    return (round(p[0], 7), round(p[1], 7))


def _seg_dist(p, a, b) -> float:
    ab = (b[0] - a[0], b[1] - a[1])
    l2 = ab[0] ** 2 + ab[1] ** 2
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2))
    return math.dist(p, (a[0] + t * ab[0], a[1] + t * ab[1]))


def path_length(line: list[tuple[float, float]]) -> float:
    if len(line) < 2:
        return 0.0
    lat0 = sum(p[1] for p in line) / len(line)
    k = math.cos(math.radians(lat0)) * M_PER_DEG
    return sum(math.hypot((b[0] - a[0]) * k, (b[1] - a[1]) * M_PER_DEG) for a, b in zip(line, line[1:]))
