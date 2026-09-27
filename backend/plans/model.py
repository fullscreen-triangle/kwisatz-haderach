"""
Plans — one node type for every shape of plan.

A plan's shape is whatever optional fields it has, never a declared type:

  when     {"date": "YYYY-MM-DD[THH:MM]"} or {"window": [from, to]}   a milestone, deadline or trip
  minutes  effort in minutes — only a node with effort becomes work in the planner;
           a dated node without it is a milestone (calendar only)
  every    {"times": 3, "per": "week", "minutes": 45}                a habit
  cost     {"amount": 60, "currency": "EUR"}                         a purchase / money goal
  requires [node id | free-text precondition]                        blockers

`parent` makes the tree. A free-text requirement stays unmet until it is removed or
replaced by a node id — the node is blocked for a stated reason, not silently scheduled.
"""

from __future__ import annotations

import re
from datetime import datetime, time, timedelta
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from backend.planner.model import Task

Status = Literal["idea", "active", "blocked", "done", "dropped"]
CLOSED = ("done", "dropped")


class When(BaseModel):
    date: Optional[str] = None                 # "2026-10-10" or "2026-10-10T18:00"
    window: Optional[List[str]] = None         # ["2027-03-15", "2027-06-30"]

    @field_validator("window")
    @classmethod
    def two_ends(cls, v):
        if v is not None and len(v) != 2:
            raise ValueError("window is [from, to]")
        return v


class Every(BaseModel):
    times: int = Field(ge=1, le=14)
    per: Literal["week"] = "week"
    minutes: int = Field(ge=5, le=480)


class Cost(BaseModel):
    amount: float
    currency: str = "EUR"


class PlanNode(BaseModel):
    id: str = ""
    title: str
    notes: str = ""
    parent: Optional[str] = None
    status: Status = "active"
    area: str = ""                             # a hint for people, never read by the dial
    when: Optional[When] = None
    minutes: Optional[int] = Field(None, ge=5, le=480)
    every: Optional[Every] = None
    cost: Optional[Cost] = None
    requires: List[str] = Field(default_factory=list)
    priority: Literal["high", "normal", "low"] = "normal"
    created: str = ""
    updated: str = ""


def new_id(title: str, taken: set) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:32] or "plan"
    nid, n = base, 2
    while nid in taken:
        nid, n = f"{base}-{n}", n + 1
    return nid


def parse_when(s: str, tz, default_time: time = time(18, 0)) -> datetime:
    """A date means that day at `default_time` local; a datetime is read as local if naive."""
    d = datetime.fromisoformat(s)
    if len(s) <= 10:
        d = datetime.combine(d.date(), default_time)
    return d if d.tzinfo else d.replace(tzinfo=tz)


def when_span(n: PlanNode, tz) -> Optional[tuple]:
    """(start, end) of a dated node: a point for `date`, the window for `window`."""
    if not n.when:
        return None
    if n.when.window:
        return (parse_when(n.when.window[0], tz, time(0, 0)),
                parse_when(n.when.window[1], tz, time(23, 59)))
    if n.when.date:
        d = parse_when(n.when.date, tz)
        return (d, d)
    return None


# ------------------------------------------------------------------ status

def blockers(n: PlanNode, nodes: Dict[str, PlanNode]) -> List[str]:
    """Why this node can't go ahead — its own blocked status, unmet requirements (its own and
    its ancestors'). Empty means it may be scheduled."""
    out: List[str] = []
    seen = set()
    cur: Optional[PlanNode] = n
    while cur is not None and cur.id not in seen:
        seen.add(cur.id)
        if cur.status == "blocked":
            out.append(f"{cur.title} is marked blocked")
        for r in cur.requires:
            dep = nodes.get(r)
            if dep is None:
                out.append(r)                                  # a free-text precondition
            elif dep.status != "done":
                out.append(f"needs “{dep.title}”")
        cur = nodes.get(cur.parent) if cur.parent else None
    return out


def effective(n: PlanNode, nodes: Dict[str, PlanNode]) -> str:
    if n.status in CLOSED or n.status == "idea":
        return n.status
    return "blocked" if blockers(n, nodes) else "active"


# ------------------------------------------------------------------ planner inputs

def _task(n: PlanNode, tid: str, title: str, minutes: int, due, release=None) -> Task:
    return Task(id=tid, title=title, minutes=minutes, due=due, priority=n.priority, work=False,
                release=release, source={"type": "plan", "ref": n.id, "plan": n.id})


def habit_slots(every: Every, now: datetime, until: datetime):
    """Each week (Monday 00:00 local) is cut into `times` equal slots; one session per slot.
    Yields (week_key, index, slot_start, slot_end) for slots that end after `now` and no later
    than `until` — a slot straddling the horizon waits for the horizon to roll over it, rather
    than being reported at risk for lack of room it will have tomorrow."""
    monday = datetime.combine(now.date() - timedelta(days=now.weekday()), time(0, 0), tzinfo=now.tzinfo)
    step = timedelta(days=7) / every.times
    week = monday
    while week < until:
        key = week.strftime("%G-W%V")
        for k in range(every.times):
            s, e = week + step * k, week + step * (k + 1)
            if now < e <= until:
                yield key, k, s, e
        week += timedelta(days=7)


def tasks(nodes: Dict[str, PlanNode], now: datetime, until: datetime, tz,
          habit_until: Optional[datetime] = None) -> List[Task]:
    """Plan nodes the planner should schedule inside [now, until). Habit slots must also end
    by `habit_until` (default `until`) — the solver's own horizon, which ends earlier.

    * a habit gives one task per slot, released at the slot's start and due at its end,
      so three runs a week spread over the week instead of piling into the first evening;
    * a node with effort (`minutes`) and a date gives one task due then — whenever the date
      is inside the horizon, or already past (overdue work stays visible, reported at risk);
    * a node with effort and no date is left to the pools (it's named in pool_items).
    Blocked, idea, done and dropped nodes give nothing.
    """
    out: List[Task] = []
    for n in nodes.values():
        if effective(n, nodes) != "active":
            continue
        if n.every:
            for week, k, s, e in habit_slots(n.every, now, habit_until or until):
                out.append(_task(n, f"plan:{n.id}:{week}:{k}", n.title, n.every.minutes,
                                 due=e, release=max(s, now)))
        elif n.minutes and n.when:
            s, e = when_span(n, tz)
            if s < until:
                out.append(_task(n, f"plan:{n.id}", n.title, n.minutes, due=e,
                                 release=s if n.when.window and s > now else None))
    return out


def pool_items(nodes: Dict[str, PlanNode]) -> List[str]:
    """Undated active work, named so a pool block says what it's for."""
    return [n.title for n in nodes.values()
            if effective(n, nodes) == "active" and n.minutes and not n.when and not n.every]


# ------------------------------------------------------------------ timeline

def milestones(nodes: Dict[str, PlanNode], tz) -> List[dict]:
    """Every dated node that isn't dropped, as a day span for the timeline's long range."""
    out = []
    for n in nodes.values():
        span = when_span(n, tz)
        if not span or n.status == "dropped":
            continue
        s, e = span
        state = effective(n, nodes)
        why = blockers(n, nodes) if state == "blocked" else []
        out.append({"uid": f"plan-{n.id}", "id": n.id, "title": n.title, "start": s.date(), "end": e.date(),
                    "status": state, "blocked_by": why, "notes": n.notes,
                    "cost": n.cost.model_dump() if n.cost else None})
    return out
