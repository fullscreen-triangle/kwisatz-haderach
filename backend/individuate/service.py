"""
The depth dial — coarse-to-fine individuation of every open item (the okgg engine).

Two steps, kept apart:

  grow   (slow, needs the model) — the vendored Engine runs with the distinctions already
         committed preloaded, so the model is asked only where indiscernibility remains
         and the target θ still demands separation. What it keeps are *distinctions*
         (a property, values, cue words), never an assignment of items to values.
  graph  (instant, no model) — those distinctions are witnessed against every observation
         channel of the current corpus; inert or duplicate ones drop out in commitment
         order; the descent tree and its recursive targets are computed exactly
         (calculus.descent_tree / propagate_targets). This is what the phone walks.

So a new mail or a changed plan re-files itself at once under the existing distinctions,
and changing θ re-targets the tree immediately; the model only runs to draw new ones.

State in <state>/okgg/: proposals.json (committed distinctions, in order), settings.json
(θ), tree.json (the last graph), runs.json (what each grow proposed, kept and refused).
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time as _time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import numpy as np

from backend.keeper.service import state_dir
from backend.individuate import corpus as corpus_mod
from backend.individuate.calculus import (Facet, descent_tree, is_inert, node_value, propagate_targets,
                                          statuses, walk)
from backend.individuate.engine import Engine, Observations, Proposal
from backend.individuate.generator import LifeGenerator

log = logging.getLogger("individuate")

ROOT = Path(__file__).resolve().parent.parent.parent
CADENCE = 10 * 60
DEBOUNCE = 20
DEFAULT_THETA = 0.7
GROW_BUDGET = 24                # generation calls per grow — a 3B model on CPU is the scarce resource
GROW_MIN_INTERVAL = 2 * 3600    # mail changes the corpus constantly; re-filing is instant, drawing
                                # new distinctions waits (a θ change skips the wait)


def _proposal(d: dict) -> Proposal:
    return Proposal(prop=d["prop"], values=list(d["values"]), cues=[[tuple(c) for c in cs] for cs in d["cues"]],
                    claims={}, block=[], shown=[], call=int(d.get("call", 0)))


def _dump(p: Proposal, origin: str) -> dict:
    return {"prop": p.prop, "values": p.values, "cues": [[list(c) for c in cs] for cs in p.cues],
            "call": p.call, "origin": origin}


def witness_facets(obs: Observations, proposals: List[dict]) -> tuple:
    """Commit, in order, each distinction that still changes something on this corpus.
    -> (facets, kept proposals)."""
    n = obs.n
    facets: List[Facet] = []
    kept: List[dict] = []
    for d in proposals:
        S = obs.witness(_proposal(d))
        F = Facet(name=d["prop"] or "property", values=list(d["values"]), S=S)
        if not S.any() or any(np.array_equal(S, G.S) for G in facets) or is_inert(F, statuses(facets, n)):
            continue
        facets.append(F)
        kept.append(d)
    return facets, kept


def _label(F: Facet, mask: int) -> str:
    if mask == 0:
        return f"{F.name}: not determined"
    return f"{F.name}: " + " & ".join(F.values[v] for v in range(len(F.values)) if mask >> v & 1)


def graph(corpus: dict, meta: Dict[str, dict], proposals: List[dict], theta: float) -> dict:
    """The committed graph, deterministically — no model. Every observation channel is read."""
    obs = Observations(corpus)
    obs.read_all()
    n = obs.n
    keys = obs.keys
    facets, kept = witness_facets(obs, proposals)
    st = statuses(facets, n)
    out = {"theta": theta, "n": n, "V": (st["n_cert"] / st["N"]) if st["N"] else 1.0,
           "pairs": {"certified": st["n_cert"], "open": st["n_open"], "indiscernible": st["n_indisc"],
                     "total": st["N"]},
           "facets": [], "nodes": {}, "root": None, "meta": meta, "proposals": kept}
    for F in facets:
        carried = [int(((F.S >> v) & 1).sum()) for v in range(len(F.values))]
        out["facets"].append({"name": F.name, "values": F.values, "carriers": carried,
                              "undetermined": int((F.S == 0).sum())})
    if n == 0:
        return out
    root = descent_tree(facets, n, st["cert"])
    propagate_targets(root, theta, st["cert"])

    def nid(members) -> str:
        return hashlib.sha1(",".join(sorted(keys[x] for x in members)).encode()).hexdigest()[:10]

    def earliest(members) -> Optional[str]:
        dues = [meta.get(keys[x], {}).get("due") for x in members]
        dues = [str(d) for d in dues if d]
        return min(dues) if dues else None

    parent_of: Dict[int, object] = {}
    for node in walk(root):
        for c in node.children:
            parent_of[id(c)] = node
    for node in walk(root):
        i = nid(node.members)
        par = parent_of.get(id(node))
        label = "Everything open"
        if par is not None:
            F = facets[par.level - 1]
            label = _label(F, int(F.S[node.members[0]]))
        N = node.N
        kinds: Dict[str, int] = {}
        for x in node.members:
            k = meta.get(keys[x], {}).get("kind", "?")
            kinds[k] = kinds.get(k, 0) + 1
        out["nodes"][i] = {
            "id": i, "depth": node.depth, "size": len(node.members), "label": label,
            "split_by": facets[node.level - 1].name if node.children else None,
            "children": [nid(c.members) for c in node.children],
            "parent": nid(par.members) if par is not None else None,
            "value": round(node_value(node, st["cert"]), 4),
            "a": round(node.cross_cert / N, 4) if N and node.children else 0.0,
            "o": round(node.cross_open / N, 4) if N and node.children else 0.0,
            "w": round(sum(c.N for c in node.children) / N, 4) if N and node.children else 0.0,
            "target": round(node.target or 0.0, 4), "regime": node.regime,
            "due": earliest(node.members), "kinds": kinds,
            "members": [keys[x] for x in node.members],
        }
    out["root"] = nid(root.members)
    return out


def _ollama_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(url.rstrip("/") + "/api/tags", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


class IndividuationService:
    def __init__(self, directory: Path, env=None):
        self.dir = directory
        self.dir.mkdir(parents=True, exist_ok=True)
        self.env = env if env is not None else os.environ
        self.tree: dict = self._read("tree.json", {})
        self.version = 0
        self.growing = False
        self.error = ""
        self._grown_fp = self._read("settings.json", {}).get("grown_fp", "")
        self._wake = asyncio.Event()
        self._cond = asyncio.Condition()

    # ------------------------------------------------------------- files

    def _read(self, name: str, default):
        try:
            return json.loads((self.dir / name).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return default

    def _write(self, name: str, data) -> None:
        tmp = self.dir / f".{name}.tmp"
        tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, self.dir / name)

    @property
    def theta(self) -> float:
        return float(self._read("settings.json", {}).get("theta", DEFAULT_THETA))

    def set_theta(self, theta: float) -> float:
        if not 0 < theta <= 1:
            raise ValueError("θ is in (0, 1]")
        s = self._read("settings.json", {})
        s["theta"] = round(float(theta), 3)
        self._write("settings.json", s)
        self.request()
        return s["theta"]

    def request(self) -> None:
        self._wake.set()

    async def _bump(self) -> None:
        async with self._cond:
            self.version += 1
            self._cond.notify_all()

    # ------------------------------------------------------------- steps

    def _corpus(self):
        tz = ZoneInfo(os.getenv("TZ_NAME", "Europe/Berlin"))
        return corpus_mod.build(datetime.now(tz), tz, ROOT)

    def rebuild(self, corpus=None, meta=None, fp: str = "") -> dict:
        if corpus is None:
            corpus, meta, fp = self._corpus()
        t = graph(corpus, meta, self._read("proposals.json", []), self.theta)
        t["fingerprint"] = fp
        t["built_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        self.tree = t
        self._write("tree.json", t)
        return t

    def _grow_sync(self, corpus: dict, theta: float) -> dict:
        """Blocking: the engine loop (runs in a worker thread)."""
        url = self.env.get("OLLAMA_URL") or "http://127.0.0.1:11434"
        model = self.env.get("INDIVIDUATE_MODEL") or "llama3.2:3b"
        saved = self._read("proposals.json", [])
        gen = LifeGenerator(model=model, url=url, temperature=0.4)
        eng = Engine(corpus, gen, theta=theta, budget=GROW_BUDGET)
        eng.props = [_proposal(d) for d in saved]
        t0 = _time.time()
        eng.run()
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        fresh = [_dump(p, stamp) for p in eng.props[len(saved):]]
        obs = Observations(corpus)
        obs.read_all()
        _, kept = witness_facets(obs, saved + fresh)
        self._write("proposals.json", kept)
        acts = eng.record.acts
        run = {"at": stamp, "model": model, "theta": theta, "seconds": round(_time.time() - t0, 1),
               "calls": gen.calls, "commits": sum(a["kind"] == "commit" for a in acts),
               "inert": sum(a["kind"] == "inert" for a in acts),
               "malformed": sum(a["kind"] == "malformed" for a in acts),
               "probes": sum(a["kind"] == "probe" for a in acts),
               "stop": next((a.get("reason") for a in reversed(acts) if a["kind"] == "stop"), ""),
               "kept": len(kept), "virtual": eng.virtual[-GROW_BUDGET:]}
        runs = self._read("runs.json", [])[-19:] + [run]
        self._write("runs.json", runs)
        return run

    async def cycle(self) -> None:
        corpus, meta, fp = self._corpus()
        self.rebuild(corpus, meta, fp)                  # re-file under what's committed, now
        await self._bump()
        needs = [n for n in self.tree.get("nodes", {}).values()
                 if not n["children"] and n["size"] > 1 and n["target"] > 1e-9]
        key = f"{fp}:{self.theta}"
        url = self.env.get("OLLAMA_URL") or "http://127.0.0.1:11434"
        s = self._read("settings.json", {})
        theta_moved = self._grown_fp.rsplit(":", 1)[-1] != str(self.theta)
        rested = _time.time() - float(s.get("grown_at", 0)) >= GROW_MIN_INTERVAL
        if needs and key != self._grown_fp and (rested or theta_moved) and not self.growing and _ollama_ok(url):
            self.growing = True
            await self._bump()
            try:
                await asyncio.to_thread(self._grow_sync, corpus, self.theta)
                self._grown_fp = key
                s = self._read("settings.json", {})
                s["grown_fp"], s["grown_at"] = key, _time.time()
                self._write("settings.json", s)
                self.rebuild(corpus, meta, fp)
            finally:
                self.growing = False
                await self._bump()

    async def run(self) -> None:
        while True:
            try:
                await self.cycle()
                self.error = ""
            except Exception as e:
                log.exception("individuate: cycle failed")
                self.error = f"{type(e).__name__}: {e}"
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=CADENCE)
                await asyncio.sleep(DEBOUNCE)
            except asyncio.TimeoutError:
                pass
            self._wake.clear()

    # ------------------------------------------------------------- output

    def node(self, node_id: str = "") -> Optional[dict]:
        t = self.tree
        nodes = t.get("nodes", {})
        nid = node_id or t.get("root")
        if not nid or nid not in nodes:
            return None
        nd = nodes[nid]
        crumbs, cur = [], nd
        while cur.get("parent"):
            cur = nodes[cur["parent"]]
            crumbs.append({"id": cur["id"], "label": cur["label"]})
        meta = t.get("meta", {})
        slim = lambda c: {k: v for k, v in c.items() if k != "members"}
        return {"node": slim(nd), "breadcrumb": list(reversed(crumbs)),
                "children": sorted((slim(nodes[c]) for c in nd["children"]),
                                   key=lambda c: (c["due"] is None, c["due"] or "", -c["size"])),
                "items": sorted((dict(meta.get(k, {}), key=k) for k in nd["members"]),
                                key=lambda m: (m.get("due") is None, str(m.get("due") or ""))),
                "theta": t.get("theta"), "V": t.get("V"), "pairs": t.get("pairs"),
                "built_at": t.get("built_at"), "growing": self.growing, "error": self.error}

    def status(self) -> dict:
        t = self.tree
        return {"theta": self.theta, "V": t.get("V"), "pairs": t.get("pairs"), "facets": t.get("facets", []),
                "n": t.get("n"), "built_at": t.get("built_at"), "growing": self.growing, "error": self.error,
                "runs": [{k: v for k, v in r.items() if k != "virtual"} for r in self._read("runs.json", [])[-5:]]}


INDIVIDUATOR = IndividuationService(state_dir() / "okgg")


def start() -> Optional["asyncio.Task[None]"]:
    if os.getenv("INDIVIDUATE_SCHEDULER", "1") == "0":
        return None
    from backend.mail.service import MAIL
    from backend.plans.store import PLANS
    MAIL.listeners.append(INDIVIDUATOR.request)
    PLANS.listeners.append(INDIVIDUATOR.request)
    return asyncio.create_task(INDIVIDUATOR.run(), name="individuate")
