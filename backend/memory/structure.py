"""
The propagation structure: nodes, observations, rules, and what is published.

Everything here is deterministic: ties break by a fixed candidate order, nothing is drawn
at random, and `key()` is the SHA-256 of the canonical inputs, so equal inputs give an
equal structure (prop:key).
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import asdict, dataclass, field
from typing import Callable, Dict, Iterable, List, Optional, Tuple

BOT = "⊥"
STATUSES = ("solved", "declined", "undecided", "assumed")


def node_id(record: str, slot: str) -> str:
    return f"{record}␟{slot}"           # a separator no record or slot contains


@dataclass
class Node:
    record: str
    slot: str
    candidates: List[str]                   # V_n; ⊥ is implicit and always present
    classes: Dict[str, str] = field(default_factory=dict)    # candidate -> class (default: itself)
    completion: Optional[str] = None        # the assumed value; never published
    label: str = ""                         # how a person names the slot

    @property
    def id(self) -> str:
        return node_id(self.record, self.slot)

    def all_candidates(self) -> List[str]:
        return list(self.candidates) + [BOT]

    def cls(self, c: str) -> str:
        return BOT if c == BOT else self.classes.get(c, c)


@dataclass
class Observation:
    node: str                               # node id
    loglik: Dict[str, float]                # candidate -> log ℓ (every candidate incl. ⊥)
    source: str                             # where it was read: a document digest, "person", a rule id
    channel: str                            # what kind of reading: person, document, rule:<id>
    cue: str = ""                           # the words that witnessed it (a verbatim quote)
    seq: int = 0
    derived: bool = False

    def l(self, c: str) -> float:
        return self.loglik.get(c, self.loglik.get(BOT, 0.0))


@dataclass
class Rule:
    id: str
    premises: List[str]                     # node ids
    conclusion: str                         # node id
    # premise values -> likelihoods over the conclusion's candidates (None: no observation)
    fn: Callable[[List[str]], Optional[Dict[str, float]]] = field(repr=False, compare=False)


@dataclass
class Verdict:
    node: str
    status: str
    leader: Optional[str]                   # a class
    runner_up: Optional[str]
    margin: float
    witnesses: int                          # observations, direct and derived
    depth: Optional[int]                    # None = infinite
    value: Optional[str] = None             # the published value (a candidate of the leading class)
    basis: Optional[str] = None             # "stated" (a direct observation) | "derived" (rules only)
    digest: str = ""                        # of the comparison: candidates, classes


def catalogue_threshold(alternatives: int, alpha: float) -> float:
    """θ* = log(A/α): the probability that any node is ever published wrongly is ≤ α
    (cor:catalogue), for a catalogue that does not grow."""
    return math.log(max(alternatives, 1) / alpha)


def spending_threshold(alternatives_n: int, i: int, alpha: float) -> float:
    """θ for the i-th node of a growing catalogue (cor:growing): it spends α·6/(π²i²)."""
    return math.log(max(alternatives_n, 1) * math.pi ** 2 * i * i / (6 * alpha))


def leader(logL: Dict[str, float], order: List[str]) -> Tuple[str, Optional[str], float]:
    """(leader, runner-up, margin) over classes; ties break by `order`, with margin 0."""
    ranked = sorted(logL.items(), key=lambda kv: (-kv[1], order.index(kv[0]) if kv[0] in order else len(order)))
    if len(ranked) < 2:
        return ranked[0][0], None, math.inf
    (v1, l1), (v2, l2) = ranked[0], ranked[1]
    return v1, v2, l1 - l2


class Structure:
    def __init__(self, alpha: float = 0.05, theta: Optional[float] = None):
        self.alpha = alpha
        self._theta = theta                 # fixed θ, else the catalogue threshold
        self.nodes: Dict[str, Node] = {}
        self.observations: List[Observation] = []
        self.rules: Dict[str, Rule] = {}
        self.proposals: List[dict] = []     # the virtual graph: what a proposer suggested
        self._fired: set = set()            # (rule id, premise values) already fired

    # ------------------------------------------------------------- building

    def add_node(self, record: str, slot: str, candidates: Iterable[str] = (), *, label: str = "",
                 completion: Optional[str] = None) -> Node:
        nid = node_id(record, slot)
        n = self.nodes.get(nid)
        if n is None:
            n = self.nodes[nid] = Node(record, slot, [], label=label or slot, completion=completion)
        for c in candidates:
            self.add_candidate(nid, c)
        if completion is not None:
            n.completion = completion
        return n

    def add_candidate(self, nid: str, value: str, cls: Optional[str] = None) -> None:
        n = self.nodes[nid]
        value = value.strip()
        if value and value != BOT and value not in n.candidates:
            n.candidates.append(value)
        if cls:
            n.classes[value] = cls

    def propose(self, nid: str, value: str, by: str, why: str = "") -> None:
        """A proposer's suggestion: it becomes a candidate and is kept in `virtual`. It moves
        no margin — only observations do (sec:witness)."""
        self.add_candidate(nid, value)
        self.proposals.append({"node": nid, "value": value.strip(), "by": by, "why": why})

    def observe(self, obs: Observation) -> Observation:
        if obs.node not in self.nodes:
            raise KeyError(f"no node {obs.node!r}")
        obs.seq = len(self.observations)
        self.observations.append(obs)
        return obs

    def add_rule(self, rule: Rule) -> None:
        self.rules[rule.id] = rule

    # ------------------------------------------------------------- computing

    @property
    def alternatives(self) -> int:
        return sum(len(n.all_candidates()) - 1 for n in self.nodes.values())

    @property
    def theta(self) -> float:
        return self._theta if self._theta is not None else catalogue_threshold(self.alternatives, self.alpha)

    def depths(self) -> Dict[str, Optional[int]]:
        """Least height of a derivation tree (prop:fixpoint), iterated to the fixed point."""
        evidence = {o.node for o in self.observations if not o.derived}
        d: Dict[str, float] = {nid: (0 if nid in evidence else math.inf) for nid in self.nodes}
        for _ in range(len(self.nodes) + 1):
            changed = False
            for r in self.rules.values():
                if r.conclusion in d and all(p in d for p in r.premises):
                    via = 1 + max((d[p] for p in r.premises), default=math.inf)
                    if via < d[r.conclusion]:
                        d[r.conclusion], changed = via, True
            if not changed:
                break
        return {k: (None if v == math.inf else int(v)) for k, v in d.items()}

    def _verdict(self, n: Node, theta: float, depth: Optional[int]) -> Verdict:
        obs = [o for o in self.observations if o.node == n.id]
        order = n.all_candidates()
        cand_l = {c: sum(o.l(c) for o in obs) for c in order}
        classes: Dict[str, float] = {}
        best_in: Dict[str, str] = {}
        for c in order:                                  # a class scores as its best candidate
            k = n.cls(c)
            if k not in classes or cand_l[c] > classes[k]:
                classes[k], best_in[k] = cand_l[c], c
        digest = hashlib.sha256(json.dumps([order, n.classes], sort_keys=True).encode()).hexdigest()[:16]
        if not obs:
            return Verdict(n.id, "assumed", None, None, 0.0, 0, depth, digest=digest)
        class_order = list(dict.fromkeys(n.cls(c) for c in order))
        top, runner, margin = leader(classes, class_order)
        if margin >= theta:
            if top == BOT:
                return Verdict(n.id, "declined", top, runner, margin, len(obs), depth, digest=digest)
            value = best_in[top]
            stated = any(not o.derived and max(order, key=lambda c: (o.l(c), -order.index(c))) == value for o in obs)
            return Verdict(n.id, "solved", top, runner, margin, len(obs), depth, value,
                           "stated" if stated else "derived", digest)
        return Verdict(n.id, "undecided", top, runner, margin, len(obs), depth, digest=digest)

    def compute(self) -> Dict[str, Verdict]:
        """Statuses, firing rules on published premises until nothing new fires (keep
        semantics: derived observations are never withdrawn)."""
        for _ in range(len(self.rules) * 4 + 2):
            theta, depth = self.theta, self.depths()
            verdicts = {nid: self._verdict(n, theta, depth[nid]) for nid, n in self.nodes.items()}
            fired = False
            for r in self.rules.values():
                vals = [verdicts[p].value if p in verdicts and verdicts[p].status == "solved" else None
                        for p in r.premises]
                if any(v is None for v in vals) or (r.id, tuple(vals)) in self._fired:
                    continue
                self._fired.add((r.id, tuple(vals)))
                lik = r.fn(vals)
                if lik:
                    self.observe(Observation(r.conclusion, lik, r.id, f"rule:{r.id}", derived=True))
                    fired = True
            if not fired:
                return verdicts
        return verdicts

    # ------------------------------------------------------------- what answers

    def graphs(self) -> Dict[str, dict]:
        """The named graphs of a stage (tab:graphs). Only `stated` and `derived` are published."""
        v = self.compute()
        out = {g: {} for g in ("stated", "derived", "held", "assumed", "status", "virtual", "witnessed")}
        for nid, n in self.nodes.items():
            s = v[nid]
            out["status"][nid] = asdict(s)
            if s.status == "solved":
                out[s.basis][nid] = s.value
            stated_values = [c for o in self.observations if o.node == nid and not o.derived
                             for c in [max(n.all_candidates(), key=lambda c, o=o: o.l(c))] if c != BOT]
            held = [x for x in dict.fromkeys(stated_values) if not (s.status == "solved" and x == s.value)]
            if held:
                out["held"][nid] = held
            if s.status in ("assumed", "undecided") and n.completion is not None:
                out["assumed"][nid] = n.completion
        out["virtual"] = list(self.proposals)
        out["witnessed"] = [{"node": o.node, "source": o.source, "channel": o.channel, "cue": o.cue, "seq": o.seq}
                            for o in self.observations if o.cue]
        return out

    def published(self) -> Dict[str, str]:
        """The merge of `stated` and `derived`: the only values a query — or a prompt — gets
        (prop:conservative)."""
        g = self.graphs()
        return {**g["stated"], **g["derived"]}

    def key(self, documents: Iterable[str] = ()) -> str:
        """SHA-256 over the canonical inputs: document digests, nodes, observations, rule ids, α/θ."""
        payload = {
            "documents": sorted(documents),
            "nodes": sorted([n.id, n.candidates, sorted(n.classes.items())] for n in self.nodes.values()),
            "observations": [[o.node, sorted(o.loglik.items()), o.source, o.channel, o.cue, o.derived]
                             for o in self.observations],
            "rules": sorted(self.rules),
            "alpha": self.alpha, "theta": self._theta,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
