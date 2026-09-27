# Vendored from greifswald/conspirator/experiments/okgg/engine.py (working copy, 2026-09-27;
# the okgg directory was not yet committed there). Unchanged except this header and the
# package-relative import of calculus below
# (line endings normalised to LF). Manuscript: docs/ontological-knowledge-graph-
# generator (Sachikonye, "An Ontological Knowledge Graph Generator").
"""The generator: coarse-to-fine individuation by translation (manuscript Sec. 11).

Two strata are kept apart throughout.
  committed  facets whose value sets come from the witness alone
  virtual    everything the language model claims: its groupings of the
             members of a block, its labels, its revisions

Only the committed stratum enters the knowledge graph. The model supplies
distinctions (a property, its values, and cue words for each value); the
witness decides, entity by entity, which values the observations carry.

The loop always moves to the entity whose separation from the others is
least determined. If some of its open pairs could still be resolved by
reading, it reads the entity's next observation channel (a probe). If its
uncertainty is indiscernibility, the model is asked for a distinction for
the entity's cell, in the context of what the cell already shares.
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from itertools import combinations

import numpy as np

from .calculus import (Facet, statuses, classes, degrees, value, is_inert, descent_tree, walk,
                      propagate_targets, node_value, demand, certified_in)

CHANNELS = ("title", "context", "abstract")

STOP = set("""a an the of and or for to in on at by with from as is are be this that these those its it
into over under about between within without via using use based toward towards new study studies approach
approaches method methods paper papers work works analysis general""".split())


# ---------------------------------------------------------------------------
# Text and the witness
# ---------------------------------------------------------------------------

def stem(t: str) -> str:
    if len(t) > 4 and t.endswith("ies"):
        return t[:-3] + "y"
    if len(t) > 4 and t.endswith("sses"):
        return t[:-2]
    if len(t) > 3 and t.endswith("s") and not t.endswith("ss") and not t.endswith("us") and not t.endswith("is"):
        return t[:-1]
    return t


def tokens(text: str) -> list[str]:
    return [stem(w) for w in re.findall(r"[a-z0-9]+", text.lower())]


def cue_tokens(cue: str) -> tuple[str, ...]:
    return tuple(stem(w) for w in re.findall(r"[a-z0-9]+", cue.lower()))


def valid_cue(c: tuple[str, ...]) -> bool:
    return bool(c) and not all(w in STOP for w in c) and all(len(w) >= 3 or w.isdigit() for w in c)


def occurs(cue: tuple[str, ...], toks: list[str], tokset: set[str]) -> bool:
    if len(cue) == 1:
        return cue[0] in tokset
    k = len(cue)
    return any(tuple(toks[i:i + k]) == cue for i in range(len(toks) - k + 1))


@dataclass
class Proposal:
    """A distinction offered by the generator: a property, values, cues, claims."""
    prop: str
    values: list[str]
    cues: list[list[tuple[str, ...]]]
    claims: dict[int, int]                      # entity -> claimed value index (virtual)
    block: list[int]
    shown: list[int]
    call: int
    raw: str = ""


class Observations:
    """Channels per entity, read lazily; the witness sees only what has been read."""

    def __init__(self, corpus: dict):
        ents = corpus["entities"]
        self.keys = sorted(ents)
        self.n = len(self.keys)
        self.titles = [ents[k]["title"] for k in self.keys]
        texts = []
        for k in self.keys:
            e = ents[k]
            texts.append([e["title"], " ".join(e["context"]), e["abstract"]])
        self.text = texts
        self.toks = [[tokens(t) for t in row] for row in texts]
        self.sets = [[set(t) for t in row] for row in self.toks]
        # channels that exist (an empty abstract is not a channel)
        self.avail = [[c for c in range(3) if texts[x][c].strip()] for x in range(self.n)]
        self.read = [1] * self.n          # number of available channels read (title first)
        self.probes = 0

    def unread(self, x: int) -> bool:
        return self.read[x] < len(self.avail[x])

    def probe(self, x: int) -> int:
        c = self.avail[x][self.read[x]]
        self.read[x] += 1
        self.probes += 1
        return c

    def read_all(self) -> None:
        self.read = [len(a) for a in self.avail]

    def hit(self, x: int, cue: tuple[str, ...]) -> int | None:
        """First read channel in which the cue occurs, or None."""
        for c in self.avail[x][: self.read[x]]:
            if occurs(cue, self.toks[x][c], self.sets[x][c]):
                return c
        return None

    def witness(self, p: Proposal) -> np.ndarray:
        S = np.zeros(self.n, dtype=np.int64)
        for x in range(self.n):
            for v, cues in enumerate(p.cues):
                if any(self.hit(x, c) is not None for c in cues):
                    S[x] |= np.int64(1) << np.int64(v)
        return S


# ---------------------------------------------------------------------------
# The generator (a local language model; never on the commit path)
# ---------------------------------------------------------------------------

class Generator:
    def __init__(self, model="llama3.2", url="http://localhost:11434", seed=1, temperature=0.4):
        self.model, self.url, self.seed, self.temperature = model, url, seed, temperature
        self.calls = 0
        self.seconds = 0.0
        self.log: list[dict] = []

    def _ask(self, prompt: str, num_predict=700) -> str:
        self.calls += 1
        body = json.dumps({"model": self.model, "prompt": prompt, "format": "json", "stream": False,
                           "options": {"temperature": self.temperature, "seed": self.seed * 1000 + self.calls,
                                       "num_predict": num_predict, "num_ctx": 8192}}).encode()
        t = time.time()
        req = urllib.request.Request(self.url + "/api/generate", body, {"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=900) as r:
                out = json.loads(r.read())["response"]
        except Exception as e:                                     # the generator may fail; that is a malformed proposal
            out = f'{{"error": "{type(e).__name__}"}}'
        self.seconds += time.time() - t
        self.log.append({"call": self.calls, "prompt": prompt, "response": out})
        return out

    @staticmethod
    def _members(obs: Observations, shown: list[int], snippets: bool) -> str:
        lines = []
        for i, x in enumerate(shown, 1):
            s = f"P{i}: {obs.titles[x]}"
            if snippets:
                src = obs.text[x][2] or obs.text[x][1]
                words = src.split()[:28]
                if words:
                    s += " -- " + " ".join(words)
            lines.append(s)
        return "\n".join(lines)

    def propose(self, obs: Observations, block: list[int], address: str, rng: np.random.Generator,
                limit: int = 120) -> Proposal | None:
        shown = sorted(block) if len(block) <= limit else sorted(rng.choice(block, limit, replace=False).tolist())
        snippets = len(shown) <= 30
        ctx = f"All of them already share the following: {address}.\n" if address else ""
        prompt = (
            "You are organising a bibliography. Split the publications below into 2 to 4 groups by ONE property "
            "of their content: their subject, their method, or the kind of contribution they make.\n" + ctx +
            "Rules: every group must contain at least 2 publications. Group names are short general descriptions, "
            "never a title and never an author. For each group give 4 to 8 lowercase keywords that would occur in "
            "the text of a publication in that group.\n\nPublications:\n" +
            self._members(obs, shown, snippets) +
            '\n\nAnswer with JSON only: {"property": "...", "groups": [{"name": "...", "keywords": ["...", "..."]}], '
            '"assignment": {"P1": "<group name>", "P2": "<group name>"}}'
        )
        raw = self._ask(prompt, num_predict=min(2600, 450 + 16 * len(shown)))
        return self._parse(raw, obs, block, shown)

    def _parse(self, raw: str, obs: Observations, block: list[int], shown: list[int]) -> Proposal | None:
        try:
            d = json.loads(raw)
            groups = d["groups"]
            names, cues = [], []
            for gr in groups:
                nm = str(gr["name"]).strip()
                cs = [cue_tokens(str(c)) for c in gr.get("keywords", [])]
                cs = [c for c in dict.fromkeys(cs) if valid_cue(c)]
                if not nm or not cs or nm.lower() in (x.lower() for x in names):
                    continue
                names.append(nm)
                cues.append(cs)
            asg = d.get("assignment", {}) or {}
        except Exception:
            return None
        claims = {}
        low = [n.lower() for n in names]
        for i, x in enumerate(shown, 1):
            g = asg.get(f"P{i}")
            if isinstance(g, list):
                g = g[0] if g else None
            if isinstance(g, str) and g.strip().lower() in low:
                claims[x] = low.index(g.strip().lower())
        # the selector rule: a value that names a single member (by its title) individuates by name
        keep = []
        for v, nm in enumerate(names):
            members = [x for x, c in claims.items() if c == v]
            titled = any(SequenceMatcher(None, nm.lower(), obs.titles[x].lower()).ratio() > 0.8 for x in shown)
            if titled or (len(members) == 1 and all(
                    all(w in obs.sets[members[0]][0] for w in c) for c in cues[v])):
                continue
            keep.append(v)
        if len(keep) < 2:
            return None
        remap = {v: i for i, v in enumerate(keep)}
        claims = {x: remap[c] for x, c in claims.items() if c in remap}
        return Proposal(prop=str(d.get("property", "")).strip()[:120], values=[names[v] for v in keep],
                        cues=[cues[v] for v in keep], claims=claims, block=block, shown=shown,
                        call=self.calls, raw=raw)

    def revise(self, obs: Observations, p: Proposal, S: np.ndarray) -> dict[int, int]:
        lines = []
        for i, x in enumerate(p.shown, 1):
            found = [p.values[v] for v in range(len(p.values)) if S[x] >> v & 1]
            lines.append(f"P{i}: " + (("text supports: " + ", ".join(found)) if found else "text shows none of the groups"))
        prompt = (
            f'You grouped publications by "{p.prop}" into: ' + "; ".join(p.values) +
            ". Their texts were checked against your keywords:\n" + "\n".join(lines) +
            "\nRevise your assignment so that it agrees with the texts wherever they support a group. "
            'Answer with JSON only: {"assignment": {"P1": "<group name>", "P2": "<group name>"}}'
        )
        raw = self._ask(prompt, num_predict=min(2400, 300 + 14 * len(p.shown)))
        out = {}
        try:
            asg = json.loads(raw).get("assignment", {}) or {}
            low = [v.lower() for v in p.values]
            for i, x in enumerate(p.shown, 1):
                g = asg.get(f"P{i}")
                if isinstance(g, list):
                    g = g[0] if g else None
                if isinstance(g, str) and g.strip().lower() in low:
                    out[x] = low.index(g.strip().lower())
        except Exception:
            pass
        return out


# ---------------------------------------------------------------------------
# The engine
# ---------------------------------------------------------------------------

@dataclass
class Record:
    """Append-only record of acts. Nothing is ever removed; a retraction is an act."""
    acts: list[dict] = field(default_factory=list)

    def add(self, kind: str, **kw) -> None:
        self.acts.append({"n": len(self.acts) + 1, "kind": kind, **kw})


class Engine:
    def __init__(self, corpus: dict, gen: Generator, theta: float = 1.0, closure_r: int = 2,
                 budget: int = 60, seed: int = 1):
        self.obs = Observations(corpus)
        self.gen = gen
        self.theta = theta
        self.closure_r = closure_r
        self.budget = budget
        self.rng = np.random.default_rng(seed)
        self.props: list[Proposal] = []          # committed proposals (witnessed facets)
        self.virtual: list[dict] = []            # every proposal, with claims and outcomes
        self.record = Record()
        self.idle: dict[frozenset, int] = {}     # consecutive ineffective generations per cell
        self.trajectory: list[dict] = []

    # -- committed state -------------------------------------------------------
    def facets(self) -> list[Facet]:
        out = []
        for i, p in enumerate(self.props):
            out.append(Facet(name=p.prop, values=p.values, S=self.obs.witness(p), block=tuple(p.block),
                             origin=f"call{p.call}"))
        return out

    def address(self, block: list[int], facets: list[Facet]) -> str:
        parts = []
        for F in facets:
            vals = {int(F.S[x]) for x in block}
            if len(vals) == 1 and next(iter(vals)):
                m = next(iter(vals))
                parts.append(f'{F.name or "property"} = ' + " & ".join(F.values[v] for v in range(len(F.values)) if m >> v & 1))
        return "; ".join(parts)

    def snapshot(self, st: dict, event: str) -> None:
        self.trajectory.append({"event": event, "calls": self.gen.calls, "probes": self.obs.probes,
                                "facets": len(self.props), "V": value(st), "open": st["n_open"],
                                "indisc": st["n_indisc"], "cert": st["n_cert"]})

    # -- the loop ----------------------------------------------------------------
    def run(self) -> None:
        n = self.obs.n
        gens = 0
        while True:
            K = self.facets()
            st = statuses(K, n)
            self.snapshot(st, "state")
            om, io = degrees(st)
            cells = classes(K, n)
            cell_of = {x: c for c in cells for x in c}
            # recursive targets on the descent tree
            root = descent_tree(K, n, st["cert"]) if K else None
            need = {}
            if root is not None:
                propagate_targets(root, self.theta, st["cert"])
                for nd in walk(root):
                    if not nd.children:
                        need[frozenset(nd.members)] = (nd.target or 0.0) > 1e-9
            actionable = []
            for x in range(n):
                probe_ok = om[x] > 0 and self.obs.unread(x)
                c = frozenset(cell_of[x])
                gen_ok = (len(c) >= 2 and self.idle.get(c, 0) < self.closure_r
                          and need.get(c, True) and gens < self.budget)
                if probe_ok or gen_ok:
                    actionable.append((om[x] + io[x], -self.obs.read[x], -x, x, probe_ok))
            if not actionable:
                self.record.add("stop", reason="no actionable uncertainty" if gens < self.budget else "budget")
                break
            _, _, _, x, probe_ok = max(actionable)
            if probe_ok:
                c = self.obs.probe(x)
                self.record.add("probe", entity=self.obs.keys[x], channel=CHANNELS[c], reason="open pairs",
                                open_degree=int(om[x]))
                continue
            gens += 1
            self.generate(sorted(cell_of[x]), K, st)

    def generate(self, block: list[int], K: list[Facet], st: dict) -> None:
        cell = frozenset(block)
        addr = self.address(block, K)
        p = self.gen.propose(self.obs, block, addr, self.rng)
        if p is None:
            self.idle[cell] = self.idle.get(cell, 0) + 1
            self.record.add("malformed", block=len(block), call=self.gen.calls)
            self.virtual.append({"call": self.gen.calls, "block": len(block), "malformed": True})
            return
        rec = {"call": p.call, "block": len(block), "shown": len(p.shown), "property": p.prop,
               "values": p.values, "cues": [[" ".join(c) for c in cs] for cs in p.cues],
               "address": addr, "malformed": False, "demand": []}
        # -- translation: relax the model's claims against the witness on the block
        claims = dict(p.claims)
        retracted: set[int] = set()
        revised = False
        while True:
            S = self.obs.witness(p)
            Mx = np.zeros(self.obs.n, dtype=np.int64)
            for y, v in claims.items():
                if y not in retracted:
                    Mx[y] = np.int64(1) << np.int64(v)
            Mf = Facet("claimed", p.values, Mx)
            Kf = Facet("witnessed", p.values, S)
            dm, dk = demand([Mf], [Kf], p.shown)
            rec["demand"].append([dm, dk])
            if dm + dk == 0:
                rec["translation"] = "quiescent"
                break
            sm = certified_in([Mf], p.shown)
            sk = certified_in([Kf], p.shown)
            acted = False
            for (a, b) in sorted(sm - sk):                         # U1 probe, U2 retract
                for y in (a, b):
                    if S[y] == 0 and self.obs.unread(y):
                        ch = self.obs.probe(y)
                        self.record.add("probe", entity=self.obs.keys[y], channel=CHANNELS[ch],
                                        reason="translation demand", call=p.call)
                        acted = True
                        break
                    if S[y] == 0 and y not in retracted:
                        retracted.add(y)
                        self.record.add("retract", entity=self.obs.keys[y], call=p.call,
                                        claim=p.values[claims[y]], reason="unwitnessable at this receiver")
                        acted = True
                        break
                if acted:
                    break
            if acted:
                continue
            if not revised:                                       # U3 revise from the reverse image
                revised = True
                new = self.gen.revise(self.obs, p, S)
                self.record.add("revise", call=self.gen.calls, of=p.call, changed=sum(
                    1 for y in new if claims.get(y) != new[y]))
                claims.update(new)
                continue
            rec["translation"] = "contested"
            break
        # classify every claim against the witness (virtual stratum)
        S = self.obs.witness(p)
        cls = {"on-shell": 0, "unwitnessed": 0, "contradicted": 0}
        for y, v in p.claims.items():
            if S[y] >> v & 1:
                cls["on-shell"] += 1
            elif S[y] == 0:
                cls["unwitnessed"] += 1
            else:
                cls["contradicted"] += 1
        rec["claims"] = cls
        rec["claims_initial"] = {str(self.obs.keys[y]): p.values[v] for y, v in p.claims.items()}
        rec["claims_final"] = {str(self.obs.keys[y]): p.values[v] for y, v in claims.items() if y not in retracted}
        F = Facet(p.prop, p.values, S)
        st_now = statuses(self.facets(), self.obs.n)
        dup = any(np.array_equal(S, G.S) for G in self.facets())
        if S.any() and not dup and not is_inert(F, st_now):
            self.props.append(p)
            self.idle[frozenset(block)] = 0
            st2 = statuses(self.facets(), self.obs.n)
            rec["committed"] = True
            rec["gain"] = st2["n_cert"] - st_now["n_cert"]
            self.record.add("commit", call=p.call, property=p.prop, values=p.values,
                            certified_gain=rec["gain"], block=len(block))
        else:
            self.idle[frozenset(block)] = self.idle.get(frozenset(block), 0) + 1
            rec["committed"] = False
            self.record.add("inert", call=p.call, property=p.prop, block=len(block))
        self.virtual.append(rec)
