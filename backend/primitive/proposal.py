"""
The proposer seam: what an agent is shown, what it may answer, and reading the answer.

A proposal is a suggestion, never a commitment. The engine admits it only by rules that
need no model, and a node's value comes from running what was admitted.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from backend.primitive.trie import ROLE_NAME, Address, Foreclosure, clip, normalise

TEXT = "text"           # the one chunk kind here: a model's own answer


@dataclass
class Chunk:
    body: str
    dsl: str = TEXT
    by: Optional[str] = None          # the model that wrote it


@dataclass
class Input:
    """The outcome of an earlier sibling (or of an ancestor's earlier sibling)."""
    addr: Address
    role: str
    instruction: str
    value: str
    by: List[str] = field(default_factory=list)


@dataclass
class Context:
    """An agent's whole view: its instruction, the path to it, what it may read, and what
    is ruled out in its region. Not sibling regions, not the rest of the trie."""
    addr: Address
    role: Optional[str]
    task: str
    path: List[Tuple[str, str]]
    instruction: str
    inputs: List[Input]
    foreclosed: List[Foreclosure]
    depth: int
    max_depth: int

    def must_realise(self) -> bool:
        return self.depth >= self.max_depth or self.role == "e"


@dataclass
class Proposal:
    kind: str                                    # "split" | "realise"
    know: str = ""
    do: str = ""
    check: str = ""
    chunks: List[Chunk] = field(default_factory=list)

    @staticmethod
    def split(know: str, do: str, check: str) -> "Proposal":
        return Proposal("split", know=know, do=do, check=check)

    @staticmethod
    def text(body: str, by: Optional[str] = None) -> "Proposal":
        return Proposal("realise", chunks=[Chunk(body, by=by)])

    @staticmethod
    def verdict(holds: bool, reason: str, by: Optional[str] = None) -> "Proposal":
        return Proposal.text(json.dumps({"holds": holds, "reason": reason}), by)

    def key(self) -> str:
        if self.kind == "split":
            return f"split|{normalise(self.know)}|{normalise(self.do)}|{normalise(self.check)}"
        return "realise|" + "|".join(sorted(f"{c.dsl}:{normalise(c.body)}" for c in self.chunks))

    def describe(self) -> str:
        if self.kind == "split":
            return f"split — know: {self.know} / do: {self.do} / check: {self.check}"
        first = self.chunks[0].body if self.chunks else ""
        return f"realise ({len(self.chunks)} chunk(s)) — {clip(first, 160)}"


# --------------------------------------------------------------------------- prompts

SYSTEM = """\
You are one agent in a trie of agents working on a task together. Each agent \
holds one instruction. For your instruction you either REALISE it (do it \
yourself, now) or SPLIT it into exactly three parts:

  know  — what must be found out or gathered first
  do    — the work itself, using what `know` finds
  check — how to verify that the result of `do` actually satisfies the instruction

Split only when the instruction is genuinely too large to do well in one \
answer; prefer realising. A split's three parts must differ from each other \
and from your instruction. Never repeat anything listed under RULED OUT.

Reply with ONE JSON object and nothing else:
  {"kind":"split","know":"...","do":"...","check":"..."}
  {"kind":"realise","answer":"..."}
If your role is CHECK you always realise, and you give a verdict on the work \
you were given instead of an answer:
  {"kind":"realise","holds":true|false,"reason":"..."}
A check must be honest and specific: holds=false when the work does not \
satisfy what it was meant to do, or contains an error you can name."""


def render(ctx: Context) -> str:
    s = f"OVERALL TASK:\n{ctx.task}\n\n"
    if ctx.path:
        s += "YOU ARE INSIDE:\n" + "".join(f"  - [{ROLE_NAME[r]}] {ins}\n" for r, ins in ctx.path) + "\n"
    role = ROLE_NAME[ctx.role].upper() if ctx.role else "TASK"
    s += f"YOUR ROLE: {role}\nYOUR INSTRUCTION:\n{ctx.instruction}\n\n"
    if ctx.inputs:
        s += "WHAT EARLIER AGENTS PRODUCED (read these; do not redo them):\n"
        s += "".join(f"  - [{ROLE_NAME[i.role]}] {i.instruction}\n    result: {i.value}\n" for i in ctx.inputs) + "\n"
    if ctx.foreclosed:
        s += "RULED OUT (already tried here or above you; do not propose these again):\n"
        s += "".join(f"  - {f.what} — {f.why}\n" for f in ctx.foreclosed) + "\n"
    if ctx.role == "e":
        s += "You are a CHECK: realise with a verdict on the [do] result above.\n"
    elif ctx.must_realise():
        s += "You are at the depth limit: you MUST realise, not split.\n"
    else:
        s += f"Depth {ctx.depth} of at most {ctx.max_depth}.\n"
    return s


# --------------------------------------------------------------------------- reading replies

def strip_thinking(s: str) -> str:
    """Drop <think>…</think> blocks; braces inside them must not be read as the reply."""
    out, rest = [], s
    while "<think>" in rest:
        i = rest.index("<think>")
        out.append(rest[:i])
        j = rest.find("</think>", i)
        if j < 0:
            return "".join(out)                  # unterminated: the rest is thinking
        rest = rest[j + len("</think>"):]
    out.append(rest)
    return "".join(out)


def extract_json(s: str) -> Optional[dict]:
    """The first balanced top-level JSON object in `s` that parses."""
    start = 0
    while True:
        open_ = s.find("{", start)
        if open_ < 0:
            return None
        depth, in_str, esc = 0, False, False
        for i in range(open_, len(s)):
            ch = s[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        v = json.loads(s[open_:i + 1])
                        if isinstance(v, dict):
                            return v
                    except ValueError:
                        pass
                    break
        start = open_ + 1


class ReplyError(ValueError):
    pass


def parse_reply(reply: str, role: Optional[str]) -> Proposal:
    reply = strip_thinking(reply)
    v = extract_json(reply)
    if v is None:
        raise ReplyError(f"no JSON object in reply: {clip(reply, 200)}")

    def field_(k: str) -> str:
        x = v.get(k)
        return x.strip() if isinstance(x, str) else ""

    kind = field_("kind").lower()
    if kind == "split":
        k, t, e = field_("know"), field_("do"), field_("check")
        if not (k and t and e):
            raise ReplyError("split is missing one of know/do/check")
        return Proposal.split(k, t, e)
    if kind in ("realise", "realize"):
        if role == "e":
            holds = v.get("holds")
            if not isinstance(holds, bool):
                raise ReplyError("a check must realise with a boolean `holds`")
            return Proposal.verdict(holds, field_("reason"))
        answer = v.get("answer")
        if not isinstance(answer, str):
            answer = "" if answer is None else json.dumps(answer, ensure_ascii=False)
        if not answer.strip():
            raise ReplyError("realise has an empty answer")
        return Proposal.text(answer)
    raise ReplyError(f"unknown kind {kind!r}")


def read_verdict(payload: str) -> Tuple[str, str]:
    """('holds'|'fails'|'unclear', reason) from a check's JSON or a HOLDS/FAILS line."""
    v = extract_json(payload)
    if v is not None and isinstance(v.get("holds"), bool):
        reason = v.get("reason") if isinstance(v.get("reason"), str) else ""
        return ("holds" if v["holds"] else "fails"), reason
    t = payload.lstrip()
    if t.upper().startswith("HOLDS"):
        return "holds", t[5:].strip()
    if t.upper().startswith("FAILS"):
        return "fails", t[5:].strip()
    return "unclear", ""
