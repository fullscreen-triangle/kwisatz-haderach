"""
Addresses in the trie, and the record.

An address is the path of roles from the root: () is the task, ("t", "e") the check under
the root's do. Roles order know < do < check, and a tuple of their indices sorts every
node after its ancestors and before its later siblings, so iterating the live nodes in
key order is depth-first.

The record keeps two things and both only grow. ACTS: every act deposits one entry, and
nothing removes or rewrites one. FORECLOSURES: what was rejected or failed its check at an
address, never to be proposed there again. An agent sees the foreclosures at its address
and at every prefix of it — its region and the regions it sits inside — nothing else.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

ROLES = ("k", "t", "e")                      # know, do, check
ROLE_NAME = {"k": "know", "t": "do", "e": "check"}


class Address(tuple):
    """A tuple of role letters; sorts depth-first (see the module docstring)."""

    def __new__(cls, roles=()):
        return super().__new__(cls, tuple(roles))

    def sort_key(self) -> Tuple[int, ...]:
        return tuple(ROLES.index(r) for r in self)

    @property
    def role(self) -> Optional[str]:
        return self[-1] if self else None

    @property
    def depth(self) -> int:
        return len(self)

    def child(self, role: str) -> "Address":
        return Address(self + (role,))

    def parent(self) -> Optional["Address"]:
        return Address(self[:-1]) if self else None

    def children(self) -> List["Address"]:
        return [self.child(r) for r in ROLES]

    def earlier_siblings(self) -> List["Address"]:
        if not self:
            return []
        return [self.parent().child(r) for r in ROLES[:ROLES.index(self[-1])]]

    def is_prefix_of(self, other: "Address") -> bool:
        return other[:len(self)] == tuple(self)

    def __str__(self) -> str:
        return "".join(self) or "root"


ROOT = Address()


def normalise(s: str) -> str:
    """Case-folded, whitespace collapsed, trailing punctuation dropped: two phrasings that
    differ only in these respects are the same attempt."""
    return " ".join(s.split()).lower().rstrip(".!?;:,")


def clip(s: str, n: int) -> str:
    flat = " ".join(str(s).split())
    return flat if len(flat) <= n else flat[:n] + "…"


@dataclass(frozen=True)
class Foreclosure:
    addr: str
    key: str            # normalised identity of what was ruled out
    what: str           # human-readable form
    why: str


class Record:
    """The append-only record, mirrored line for line to a JSONL file when given one."""

    def __init__(self, path: Optional[Path] = None):
        self.acts: List[dict] = []
        self._foreclosed: Dict[Address, Set[Foreclosure]] = {}
        self._path = path

    def deposit(self, addr: Address, kind: str, detail: dict) -> int:
        act = {"seq": len(self.acts), "addr": str(addr), "kind": kind, "detail": detail}
        if self._path is not None:
            try:
                with self._path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(act, ensure_ascii=False) + "\n")
            except OSError:
                pass        # the in-memory record is authoritative for this process
        self.acts.append(act)
        return act["seq"]

    def foreclose(self, addr: Address, key: str, what: str, why: str) -> bool:
        f = Foreclosure(str(addr), key, what, why)
        bucket = self._foreclosed.setdefault(addr, set())
        if f in bucket:
            return False
        bucket.add(f)
        self.deposit(addr, "foreclose", {"what": what, "why": why})
        return True

    def is_foreclosed(self, addr: Address, key: str) -> bool:
        return any(f.key == key for f in self._foreclosed.get(addr, ()))

    def projection(self, addr: Address) -> List[Foreclosure]:
        out = []
        for a in sorted(self._foreclosed, key=Address.sort_key):
            if a.is_prefix_of(addr):
                out.extend(sorted(self._foreclosed[a], key=lambda f: (f.key, f.why)))
        return out

    def foreclosures(self) -> List[Foreclosure]:
        return [f for a in sorted(self._foreclosed, key=Address.sort_key)
                for f in sorted(self._foreclosed[a], key=lambda f: (f.key, f.why))]

    def __len__(self) -> int:
        return len(self.acts)
