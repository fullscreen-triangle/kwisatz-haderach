"""
Observation models.

A STATEMENT is a channel saying "the value of this node is v". Its model is the channel's
reliability r: the probability it states the true value. If v is true it says v with
probability r; if v is false it says v with probability (1−r)/(k−1), the error spread over
the other k−1 candidates. So a statement adds log(r(k−1)/(1−r)) nats to v against every
other candidate — and a candidate added later scores as ⊥ did, i.e. as "not what was said".

The reliabilities are stated, not measured. They are the observation models the paper's
bound assumes correct; if a channel is less reliable than written here, the bound does
not hold for it (the paper's E2 measures exactly that failure).
"""

from __future__ import annotations

import math
from typing import Dict

from backend.memory.structure import BOT, Node, Observation

RELIABILITY: Dict[str, float] = {
    "person": 0.999,      # you typed or confirmed it
    "document": 0.9,      # a quote found verbatim in a document you supplied, containing the value
    "facts": 0.9,         # a quote from your published facts (themselves published by margin)
}


def statement(node: Node, value: str, channel: str, source: str, cue: str = "",
              reliability: float | None = None) -> Observation:
    r = reliability if reliability is not None else RELIABILITY[channel]
    cands = node.all_candidates()
    k = len(cands)
    value = value.strip() if value != BOT else BOT
    if value not in cands:
        raise ValueError(f"{value!r} is not a candidate of {node.id!r}; add it first")
    hit, miss = math.log(r), math.log((1 - r) / max(k - 1, 1))
    return Observation(node.id, {c: (hit if c == value else miss) for c in cands}, source, channel, cue)


def nats(channel: str, k: int) -> float:
    """What one statement on `channel` adds to its value's margin over each other candidate."""
    r = RELIABILITY[channel]
    return math.log(r * max(k - 1, 1) / (1 - r))
