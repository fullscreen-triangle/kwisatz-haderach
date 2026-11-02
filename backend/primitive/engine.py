"""
The engine: given a task, grow a trie of agents that completes it.

A node is Open (waiting for a proposal), Split (has know/do/check children), Realised (has
chunks to run) or Closed (has an outcome). The engine performs ACTS, one per unit of
budget, of two kinds only:

  propose — ask the proposer (the only model seam) what to do with an open node, then admit
            or reject the answer by rules that need no model;
  run     — run every chunk of a realised node and close it from the values they produce.

Closing a split node is not an act: between acts it reads its three children and takes the
`do` value if the `check` holds. A failed check forecloses that split at the node and
reopens it; after `max_attempts` the node DECLINES with every value tried — a decline is a
result, not an error. Budget decides how much is done now, never an outcome.

Readiness gives the order: `know` may act at once, `do` once `know` has closed, `check` once
`do` has. Each agent reads its earlier siblings' outcomes (and its ancestors' earlier
siblings') and nothing else.

Grades: `unconfirmed` (a model's own text) < `corroborated` (checkers of two or more
families other than the producer's all found it holds). Nothing is executed here, so the
harness's `checked`/`executed` grades never occur.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from backend.primitive.proposal import Chunk, Context, Input, Proposal, read_verdict
from backend.primitive.route import ChatError, family
from backend.primitive.trie import ROLE_NAME, ROLES, ROOT, Address, Record, clip, normalise

GRADES = ("unconfirmed", "corroborated")


@dataclass
class Outcome:
    kind: str                     # "convergent" | "contested"
    value: str = ""
    grade: str = "unconfirmed"
    classes: List[str] = field(default_factory=list)
    reason: str = ""

    def as_input(self) -> str:
        if self.kind == "convergent":
            return self.value
        if self.classes:
            return f"DECLINED ({self.reason}); candidates: {' | '.join(self.classes)}"
        return f"DECLINED ({self.reason})"

    def to_json(self) -> dict:
        if self.kind == "convergent":
            return {"kind": "convergent", "value": self.value, "grade": self.grade}
        return {"kind": "contested", "classes": self.classes, "reason": self.reason}


@dataclass
class Node:
    addr: Address
    instruction: str
    state: str = "open"           # open | split | realised | closed
    outcome: Optional[Outcome] = None
    attempts: int = 0
    failed: List[str] = field(default_factory=list)
    chunks: List[Chunk] = field(default_factory=list)
    by: List[str] = field(default_factory=list)
    split: Optional[Proposal] = None

    @property
    def closed(self) -> bool:
        return self.state == "closed"


class Engine:
    def __init__(self, task: str, proposer, *, max_depth: int = 2, max_attempts: int = 3,
                 record: Optional[Record] = None):
        self.task = task
        self.proposer = proposer
        self.max_depth = max_depth
        self.max_attempts = max_attempts
        self.record = record if record is not None else Record()     # an empty Record is falsy
        self.nodes: Dict[Address, Node] = {}
        self.archived: List[Node] = []
        self._raise(ROOT, task)

    # ------------------------------------------------------------- driving

    async def step(self, budget: int, on_act=None) -> dict:
        acts = 0
        self._settle()
        while acts < budget and not self.complete:
            act = self._next_act()
            if act is None:
                break
            kind, addr = act
            if kind == "propose":
                await self._propose(addr)
            else:
                self._run(addr)
            acts += 1
            self._settle()
            if on_act:
                await on_act()
        return {"completed": self.complete, "residue": self.residue, "acts": acts}

    @property
    def root(self) -> Node:
        return self.nodes[ROOT]

    @property
    def complete(self) -> bool:
        return self.root.closed

    @property
    def residue(self) -> int:
        return sum(1 for n in self.nodes.values() if not n.closed)

    def _ordered(self):
        return sorted(self.nodes.items(), key=lambda kv: kv[0].sort_key())

    def _next_act(self):
        for addr, n in self._ordered():
            if n.state == "realised":
                return "run", addr
            if n.state == "open" and all(self.nodes.get(s) and self.nodes[s].closed
                                         for s in addr.earlier_siblings()):
                return "propose", addr
        return None

    # ------------------------------------------------------------- acts

    async def _propose(self, addr: Address) -> None:
        ctx = self.context(addr)
        try:
            p = await self.proposer.propose(ctx)
        except ChatError as e:
            self.record.deposit(addr, "error", {"by": self.proposer.name(), "error": str(e)})
            self._spend_attempt(addr, f"the proposer failed: {e}")
            return
        self.record.deposit(addr, "propose", {"by": self.proposer.name(), "proposal": p.describe(), "key": p.key()})
        why = self._admit(ctx, p)
        if why:
            self.record.deposit(addr, "reject", {"why": why})
            self.record.foreclose(addr, p.key(), p.describe(), why)
            self._spend_attempt(addr, why)
            return
        self.record.deposit(addr, "admit", {"proposal": p.describe()})
        self._apply(addr, p)

    def _admit(self, ctx: Context, p: Proposal) -> Optional[str]:
        """The admission rules. None of them consults a model."""
        if self.record.is_foreclosed(ctx.addr, p.key()):
            return "repeats a proposal already ruled out here"
        if p.kind == "split":
            if ctx.role == "e":
                return "a check is realised directly, as a verdict"
            if ctx.must_realise():
                return f"depth limit {ctx.max_depth} reached: this node must be realised"
            parts = [normalise(p.know), normalise(p.do), normalise(p.check)]
            if any(not x for x in parts):
                return "a split needs all three of know, do and check"
            if len(set(parts)) < 3:
                return "the three parts of a split must differ"
            if normalise(ctx.instruction) in parts:
                return "a part restates the task it was meant to split"
            return None
        if not p.chunks or any(not c.body.strip() for c in p.chunks):
            return "a realisation needs at least one non-empty chunk"
        return None

    def _apply(self, addr: Address, p: Proposal) -> None:
        n = self.nodes[addr]
        if p.kind == "split":
            n.state, n.split = "split", p
            for role, ins in zip(ROLES, (p.know, p.do, p.check)):
                self._raise(addr.child(role), ins)
            return
        who = self.proposer.name()
        n.chunks = [Chunk(c.body, c.dsl, c.by or who) for c in p.chunks]
        n.state = "realised"

    def _run(self, addr: Address) -> None:
        """Run every chunk. A text chunk's value is its body: nothing is executed."""
        n = self.nodes[addr]
        ok = []
        for c in n.chunks:
            self.record.deposit(addr, "run", {"dsl": c.dsl, "grade": "unconfirmed", "value": clip(c.body, 400)})
            ok.append((c.body, "unconfirmed", c.by or ""))
        if addr.role == "e":
            return self._close_check(addr, ok)
        classes = {normalise(v) for v, _, _ in ok}
        if len(classes) == 1:
            n.by = [b for _, _, b in ok if b]
            grade = max((g for _, g, _ in ok), key=GRADES.index)
            self._close(addr, Outcome("convergent", ok[0][0], grade))
        else:
            seen, distinct = set(), []
            for v, _, _ in ok:
                if normalise(v) not in seen:
                    seen.add(normalise(v))
                    distinct.append(v)
            self._close(addr, Outcome("contested", classes=distinct, reason="the realisations disagree"))

    def _close_check(self, addr: Address, verdicts) -> None:
        """Checkers are not averaged: the check holds only if every checker holds, fails if
        any fails, is unclear otherwise. Its grade says how independent the agreement was."""
        readings = [read_verdict(v) for v, _, _ in verdicts]
        do = self.nodes.get(addr.parent().child("t"))
        producers = {family(b) for b in (do.by if do else [])}
        fails = [f"{by}: {why}" if by else why
                 for (kind, why), (_, _, by) in zip(readings, verdicts) if kind == "fails"]
        independent = {family(b) for _, _, b in verdicts if b} - producers
        grade = "corroborated" if len(independent) >= 2 else "unconfirmed"
        self.nodes[addr].by = [b for _, _, b in verdicts if b]
        if fails:
            value = json.dumps({"holds": False, "reason": " | ".join(fails)})
        elif all(kind == "holds" for kind, _ in readings):
            value = verdicts[0][0]
        else:
            value = "the checkers' verdicts could not all be read"
        self._close(addr, Outcome("convergent", value, grade))

    # ------------------------------------------------------------- closing

    def _settle(self) -> None:
        while True:
            ready = [a for a, n in reversed(self._ordered())
                     if n.state == "split" and all(self.nodes[c].closed for c in a.children())]
            if not ready:
                return
            for a in ready:
                if self.nodes[a].state == "split":
                    self._close_split(a)

    def _close_split(self, addr: Address) -> None:
        _, t, e = addr.children()
        done, check = self.nodes[t].outcome, self.nodes[e].outcome
        if done.kind == "contested":
            return self._close(addr, Outcome("contested", classes=done.classes, reason="the do step declined"))
        if check.kind == "contested":
            return self._close(addr, Outcome("contested", classes=[done.value], reason="the check declined"))
        kind, reason = read_verdict(check.value)
        if kind == "holds":
            # A model reading a model's text and saying "holds" is not independent support,
            # so only a corroborated check raises the grade.
            grade = "corroborated" if check.grade == "corroborated" else done.grade
            self.nodes[addr].by = list(self.nodes[t].by)
            return self._close(addr, Outcome("convergent", done.value, grade))
        if kind == "unclear":
            return self._close(addr, Outcome("contested", classes=[done.value],
                                             reason="the check's verdict could not be read"))
        split = self.nodes[addr].split
        why = f"its check failed the result: {clip(reason, 200)}"
        self.record.foreclose(addr, split.key(), split.describe(), why)
        self.nodes[addr].failed.append(done.value)
        self._reopen(addr)
        self._spend_attempt(addr, why)

    def _spend_attempt(self, addr: Address, why: str) -> None:
        n = self.nodes[addr]
        n.attempts += 1
        if n.attempts >= self.max_attempts:
            self._close(addr, Outcome("contested", classes=list(n.failed),
                                      reason=f"no proposal held after {n.attempts} attempts; last: {why}"))

    def _reopen(self, addr: Address) -> None:
        under = [a for a in self.nodes if a != addr and addr.is_prefix_of(a)]
        for a in under:
            self.archived.append(self.nodes.pop(a))
        self.record.deposit(addr, "reopen", {"archived": len(under)})
        n = self.nodes[addr]
        n.state, n.split, n.chunks = "open", None, []

    def _close(self, addr: Address, outcome: Outcome) -> None:
        self.record.deposit(addr, "close", outcome.to_json())
        n = self.nodes[addr]
        n.state, n.outcome = "closed", outcome

    # ------------------------------------------------------------- raising and reading

    def _raise(self, addr: Address, instruction: str) -> None:
        self.record.deposit(addr, "raise", {"instruction": instruction})
        self.nodes[addr] = Node(addr, instruction)

    def context(self, addr: Address) -> Context:
        path, inputs = [], []
        q = ROOT
        for r in addr:
            q = q.child(r)
            if q != addr:
                path.append((r, self.nodes[q].instruction))
            for s in q.earlier_siblings():
                sn = self.nodes.get(s)
                if sn and sn.outcome:
                    inputs.append(Input(s, s.role, sn.instruction, sn.outcome.as_input(), list(sn.by)))
        return Context(addr, addr.role, self.task, path, self.nodes[addr].instruction, inputs,
                       self.record.projection(addr), addr.depth, self.max_depth)

    # ------------------------------------------------------------- reports

    def render(self) -> str:
        lines = []
        for addr, n in self._ordered():
            role = ROLE_NAME.get(addr.role, "task")
            if n.outcome and n.outcome.kind == "convergent":
                status = f"= {clip(n.outcome.value, 100)} [{n.outcome.grade}]"
            elif n.outcome:
                status = f"DECLINED: {clip(n.outcome.reason, 100)}"
            else:
                status = f"({n.state})"
            lines.append(f"{'  ' * addr.depth}{addr} {role:<5} {clip(n.instruction, 70)}  {status}")
        return "\n".join(lines)

    def snapshot(self) -> dict:
        return {
            "task": self.task,
            "completed": self.complete,
            "outcome": self.root.outcome.to_json() if self.root.outcome else None,
            "nodes": [{"addr": str(a), "role": ROLE_NAME.get(a.role), "depth": a.depth,
                       "instruction": n.instruction, "state": n.state, "attempts": n.attempts,
                       "by": n.by, "outcome": n.outcome.to_json() if n.outcome else None}
                      for a, n in self._ordered()],
            "archived": len(self.archived),
            "acts": len(self.record),
            "foreclosures": [{"addr": f.addr, "what": f.what, "why": f.why} for f in self.record.foreclosures()],
        }
