"""
The planner's solver — a pure function from inputs to blocks. No I/O, deterministic.

Guarantee: every minute from now to the end of the horizon is covered by exactly one block the solver made or by a block it was given
(frozen, pinned, fixed; fixed events may overlap *each other* — a double booking is his,
not ours). Order of placement:

  1. given blocks (frozen history + near future, pins, fixed appointments) are occupied;
  2. sleep for every night and meals for every day are laid down around them;
  3. tasks go in earliest-deadline-first (ties: priority), work tasks preferring the
     workday and personal tasks preferring outside it; a task that can't finish before its
     deadline is still placed as early as possible and reported at-risk;
  4. whatever is left: inside the workday becomes work blocks; outside it is split across
     the pools by water-filling — the single shadow price p with t_i = max(0, w_i/p − τ_i),
     Σ t_i = free minutes — then packed into ≥ min_block chunks. Leftovers shorter than
     min_block become transition buffers, so nothing is unassigned.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional, Sequence, Tuple
from zoneinfo import ZoneInfo

from backend.planner.model import Block, Task

Interval = Tuple[datetime, datetime]


# ------------------------------------------------------------------ interval algebra

def merge(ivs: Sequence[Interval]) -> List[Interval]:
    out: List[Interval] = []
    for s, e in sorted(i for i in ivs if i[1] > i[0]):
        if out and s <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], e))
        else:
            out.append((s, e))
    return out


def subtract(ivs: Sequence[Interval], cuts: Sequence[Interval]) -> List[Interval]:
    cuts = merge(cuts)
    out: List[Interval] = []
    for s, e in merge(ivs):
        cur = s
        for cs, ce in cuts:
            if ce <= cur or cs >= e:
                continue
            if cs > cur:
                out.append((cur, cs))
            cur = max(cur, ce)
            if cur >= e:
                break
        if cur < e:
            out.append((cur, e))
    return out


def intersect(a: Sequence[Interval], b: Sequence[Interval]) -> List[Interval]:
    out = []
    for s1, e1 in merge(a):
        for s2, e2 in merge(b):
            s, e = max(s1, s2), min(e1, e2)
            if e > s:
                out.append((s, e))
    return merge(out)


def minutes(iv: Interval) -> int:
    return int((iv[1] - iv[0]).total_seconds() // 60)


# ------------------------------------------------------------------ water-filling

def waterfill(pools: List[dict], free: float) -> Tuple[Dict[str, float], Optional[float]]:
    """Split `free` minutes across pools with gain w·log(1+t/τ). KKT: every pool that
    gets time has marginal gain w/(τ+t) = p, one price for all. Returns (minutes, p)."""
    active = [p for p in pools if p["weight"] > 0]
    if free <= 0 or not active:
        return {p["id"]: 0.0 for p in pools}, None

    def total(price: float) -> float:
        return sum(max(0.0, p["weight"] / price - p["tau"]) for p in active)

    lo, hi = 1e-12, max(p["weight"] / p["tau"] for p in active)   # total(hi) = 0
    for _ in range(200):
        mid = (lo + hi) / 2
        if total(mid) > free:
            lo = mid
        else:
            hi = mid
    price = (lo + hi) / 2
    shares = {p["id"]: 0.0 for p in pools}
    for p in active:
        shares[p["id"]] = max(0.0, p["weight"] / price - p["tau"])
    return shares, price


def apportion(shares: Dict[str, float], total: int, grid: int) -> Dict[str, int]:
    """Round shares to multiples of `grid` summing to `total` (largest remainder)."""
    units = total // grid
    s = sum(shares.values()) or 1.0
    raw = {k: v / s * units for k, v in shares.items()}
    out = {k: int(math.floor(v)) for k, v in raw.items()}
    for k in sorted(raw, key=lambda k: (-(raw[k] - out[k]), k))[: units - sum(out.values())]:
        out[k] += 1
    return {k: v * grid for k, v in out.items()}


# ------------------------------------------------------------------ inputs / outputs

@dataclass
class Inputs:
    now: datetime
    settings: dict
    fixed: List[Block] = field(default_factory=list)
    pinned: List[Block] = field(default_factory=list)
    frozen: List[Block] = field(default_factory=list)
    tasks: List[Task] = field(default_factory=list)
    pool_items: Dict[str, List[str]] = field(default_factory=dict)
    sleep: Optional[Tuple[time, time]] = None      # (bedtime, wake) local; None = settings


@dataclass
class Plan:
    blocks: List[Block]
    at_risk: List[dict]
    days: List[dict]
    freeze: datetime
    horizon_end: datetime
    start: Optional[datetime] = None     # where filling began (≤ freeze)


def _hhmm(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


class _Ids:
    """Stable ids: the same thing on the same day keeps its id across re-plans, so the
    Google Calendar mirror updates events in place instead of recreating them."""

    def __init__(self, tz):
        self.tz, self.n = tz, {}

    def __call__(self, kind: str, ref: str, at: datetime) -> str:
        key = (kind, ref, at.astimezone(self.tz).date())
        self.n[key] = self.n.get(key, 0) + 1
        h = hashlib.sha1(f"{kind}|{ref}|{key[2]}|{self.n[key]}".encode()).hexdigest()[:12]
        return f"{kind}-{h}"


def solve(inp: Inputs) -> Plan:
    S = inp.settings
    tz = ZoneInfo(S["timezone"])
    grid = timedelta(minutes=S["grid_minutes"])
    min_block = timedelta(minutes=S["min_block"])
    max_block = timedelta(minutes=S["max_block"])
    brk = timedelta(minutes=S["break_minutes"])
    brk_after = timedelta(minutes=S["break_after"])
    ids = _Ids(tz)

    def ceil_grid(t: datetime) -> datetime:
        epoch = datetime(1970, 1, 1, tzinfo=t.tzinfo)
        g = grid.total_seconds()
        return epoch + timedelta(seconds=math.ceil((t - epoch).total_seconds() / g) * g)

    def at(d: date, hm: time) -> datetime:
        return datetime.combine(d, hm, tzinfo=tz)

    bed, wake = inp.sleep or (_hhmm(S["sleep"]["start"]), _hhmm(S["sleep"]["end"]))
    now = inp.now.astimezone(tz)
    freeze = ceil_grid(now + timedelta(minutes=S["freeze_minutes"]))
    today = now.date()
    days = [today + timedelta(days=i) for i in range(S["horizon_days"])]

    def bedtime(d: date) -> datetime:           # the bedtime that ends day d
        return at(d, bed) if bed > wake else at(d + timedelta(days=1), bed)

    def awake(d: date) -> Interval:
        return at(d, wake), bedtime(d)

    horizon_end = at(days[-1] + timedelta(days=1), wake)
    # Fill from now. The freeze line is honoured by the caller passing the previous plan's
    # blocks up to it as `frozen` (they occupy that window); on a first plan there are none,
    # so the next hour is planned too instead of left blank.
    start_line = ceil_grid(now)
    span = [(start_line, horizon_end)]

    blocks: List[Block] = []
    given = [b for b in inp.frozen + inp.pinned] + [b for b in inp.fixed if b.end > start_line and b.start < horizon_end]
    occupied = merge([(b.start, b.end) for b in given])

    def emit(kind, start, end, title, ref, source=None) -> Block:
        b = Block(id=ids(kind, ref, start), start=start, end=end, kind=kind, title=title,
                  source=source or {"type": kind, "ref": ref})
        blocks.append(b)
        occupied.append((start, end))
        return b

    # 2. sleep (every night touching the horizon, including the one we may be in now)
    for d in [today - timedelta(days=1)] + days:
        night = subtract(intersect([(bedtime(d), at(d + timedelta(days=1), wake))], span), occupied)
        for s, e in night:
            emit("sleep", s, e, "Sleep", "sleep", {"type": "health", "ref": "sleep"})
    occupied = merge(occupied)

    #    meals, where they fit untouched
    for d in days:
        for meal in S["meals"]:
            s = at(d, _hhmm(meal["at"]))
            e = s + timedelta(minutes=int(meal["minutes"]))
            if s >= start_line and e <= horizon_end and not intersect([(s, e)], occupied):
                emit("meal", s, e, meal["title"], f"meal:{meal['title']}", {"type": "health", "ref": "meal"})
    occupied = merge(occupied)

    wd = S["workday"]
    workday: List[Interval] = merge([(at(d, _hhmm(wd["start"])), at(d, _hhmm(wd["end"])))
                                     for d in days if wd.get("enabled") and d.weekday() in wd["days"]])

    def free() -> List[Interval]:
        return subtract(span, occupied)

    def place(interval: Interval, length: timedelta, kind: str, title: str, ref: str, source: dict,
              breaks: bool) -> datetime:
        """Emit one chunk at the start of `interval` (+ a break after it when due);
        returns where the next chunk may start."""
        s = interval[0]
        e = s + length
        emit(kind, s, e, title, ref, source)
        if breaks and length >= brk_after and interval[1] - e >= brk + min_block:
            emit("break", e, e + brk, "Break", "break", {"type": "health", "ref": "break"})
            e += brk
        return e

    # 3. tasks, earliest deadline first
    at_risk: List[dict] = []
    for task in sorted(inp.tasks, key=Task.sort_key):
        need = timedelta(minutes=math.ceil(task.minutes / S["grid_minutes"]) * S["grid_minutes"])
        if need <= timedelta(0):
            continue
        due = task.due.astimezone(tz) if task.due else None
        chunk_min = min(min_block, need)
        placed_late = False

        def regions() -> List[List[Interval]]:
            f = free()
            if task.release and task.release > start_line:
                f = intersect(f, [(task.release, horizon_end)])
            if not workday:
                return [f]
            inside, outside = intersect(f, workday), subtract(f, workday)
            return [inside, outside] if task.work else [outside, inside]

        for before_due in ([True, False] if due else [False]):
            for idx in range(2 if workday else 1):
                while need > timedelta(0):
                    region = regions()[idx]
                    if before_due:
                        region = intersect(region, [(start_line, due)]) if due > start_line else []
                    slot = next((iv for iv in region if iv[1] - iv[0] >= chunk_min), None)
                    if slot is None:
                        break
                    length = min(need, max_block, slot[1] - slot[0])
                    place(slot, length, "task", task.title, task.id,
                          {**task.source, "task": task.id}, breaks=True)
                    placed_late = placed_late or (not before_due and due is not None)
                    need -= length
                    chunk_min = min(min_block, need) if need > timedelta(0) else chunk_min
                if need <= timedelta(0):
                    break
            if need <= timedelta(0):
                break
        if need > timedelta(0) or placed_late:
            at_risk.append({"task": task.id, "title": task.title,
                            "due": due.isoformat() if due else None,
                            "unplaced_minutes": int(need.total_seconds() // 60),
                            "late": placed_late, "source": task.source})
        occupied[:] = merge(occupied)

    # 4. fill: workday -> work blocks; everything else -> pools by water-filling
    pools = S["pools"]
    pool_by_id = {p["id"]: p for p in pools}
    rr: Dict[str, int] = {}
    day_report = []

    def pool_title(pid: str) -> str:
        items = inp.pool_items.get(pid) or []
        if not items:
            return pool_by_id[pid]["title"]
        i = rr.get(pid, 0)
        rr[pid] = i + 1
        return f"{pool_by_id[pid]['title']}: {items[i % len(items)]}"

    for d in days:
        day_free = intersect(free(), [awake(d)])
        for s, e in intersect(day_free, workday):
            cur = s
            while e - cur >= min_block:
                length = min(max_block, e - cur)
                if e - cur - length < min_block:
                    length = e - cur
                cur = place((cur, e), length, "work", wd["title"], "workday", {"type": "work", "ref": "workday"},
                            breaks=True)
            if cur < e:
                emit("buffer", cur, e, "Transition", "buffer", {"type": "buffer", "ref": "buffer"})

        pool_free = subtract(day_free, workday)
        total = sum(minutes(iv) for iv in pool_free)
        shares, price = waterfill(pools, total)
        budget = apportion(shares, total, S["grid_minutes"])
        report = {"date": d.isoformat(), "free_minutes": total, "price": price, "allocation": dict(budget)}
        last = None
        for s, e in pool_free:
            cur = s
            while cur < e:
                rem = e - cur
                if rem < min_block:
                    emit("buffer", cur, e, "Transition", "buffer", {"type": "buffer", "ref": "buffer"})
                    break
                open_ = [pid for pid in budget if budget[pid] > 0 and pool_by_id[pid]["weight"] > 0]
                if not open_:
                    open_ = [max(pools, key=lambda p: p["weight"])["id"]]
                choices = [p for p in open_ if p != last] or open_
                pid = max(choices, key=lambda p: (budget[p], pool_by_id[p]["weight"]))
                length = min(max(timedelta(minutes=budget[pid]), min_block), max_block, rem)
                if rem - length < min_block:
                    length = rem                     # absorb the sliver rather than strand it
                cur = place((cur, e), length, "pool", pool_title(pid), pid, {"type": "pool", "ref": pid, "pool": pid},
                            breaks=pool_by_id[pid].get("work", True))
                budget[pid] -= int(length.total_seconds() // 60)
                last = pid
        day_report.append(report)

    all_blocks = sorted(given + blocks, key=lambda b: (b.start, b.end))
    return Plan(blocks=all_blocks, at_risk=at_risk, days=day_report, freeze=freeze, horizon_end=horizon_end,
                start=start_line)
