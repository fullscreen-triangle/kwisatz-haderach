"""Blocks (what the timeline shows) and tasks (work with a size and maybe a deadline)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Optional

# kind:
#   fixed   an appointment (mail event, Google Calendar) — immovable
#   task    a chunk of a Task
#   work    employed hours not claimed by a work task
#   pool    fill time from a pool (projects, research, …)
#   meal / break / sleep   health anchors and recovery
#   buffer  a leftover too short to be useful — transition time
KINDS = ("fixed", "task", "work", "pool", "meal", "break", "sleep", "buffer")


@dataclass
class Block:
    id: str
    start: datetime
    end: datetime
    kind: str
    title: str
    source: dict = field(default_factory=dict)   # {type, ref, account?, task?, pool?}
    pinned: bool = False
    done: bool = False
    tentative: bool = False

    @property
    def minutes(self) -> int:
        return int((self.end - self.start).total_seconds() // 60)

    def to_json(self) -> dict:
        d = asdict(self)
        d["start"], d["end"] = self.start.isoformat(), self.end.isoformat()
        d["minutes"] = self.minutes
        return d

    @staticmethod
    def from_json(d: dict) -> "Block":
        return Block(id=d["id"], start=datetime.fromisoformat(d["start"]), end=datetime.fromisoformat(d["end"]),
                     kind=d["kind"], title=d["title"], source=d.get("source") or {},
                     pinned=bool(d.get("pinned")), done=bool(d.get("done")), tentative=bool(d.get("tentative")))


PRIORITY = {"high": 0, "normal": 1, "low": 2}


@dataclass
class Task:
    id: str
    title: str
    minutes: int                       # still to do
    due: Optional[datetime] = None
    priority: str = "normal"
    work: bool = False                 # belongs inside the workday
    source: dict = field(default_factory=dict)
    release: Optional[datetime] = None  # not before this (a habit's slot start)

    def sort_key(self):
        return (self.due is None, self.due or datetime.max, PRIORITY.get(self.priority, 1), self.id)
