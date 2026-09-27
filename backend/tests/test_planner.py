"""
Solver guarantees, checked on real-shaped inputs. The headline one: from the freeze line
to the horizon end every minute is covered, and the solver's own blocks never overlap.
Run: python -m pytest backend/tests/test_planner.py
"""

import copy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from backend.planner import settings as settings_mod
from backend.planner.model import Block, Task
from backend.planner.solver import Inputs, apportion, merge, solve, subtract, waterfill

TZ = ZoneInfo("Europe/Berlin")
NOW = datetime(2026, 9, 28, 8, 7, tzinfo=TZ)     # a Monday morning


def S(**over):
    s = copy.deepcopy(settings_mod.DEFAULTS)
    s["sleep"]["from_garmin"] = False
    s["horizon_days"] = 3
    s.update(over)
    return s


def check_coverage(plan, given_ids=()):
    made = [b for b in plan.blocks if b.id not in given_ids]
    ordered = sorted(made, key=lambda b: b.start)
    for a, b in zip(ordered, ordered[1:]):
        assert a.end <= b.start, f"overlap: {a.title} {a.start}-{a.end} / {b.title} {b.start}"
    covered = merge([(b.start, b.end) for b in plan.blocks])
    gaps = subtract([(plan.start, plan.horizon_end)], covered)
    assert gaps == [], f"uncovered minutes: {gaps[:3]}"


def test_empty_week_is_fully_covered():
    plan = solve(Inputs(now=NOW, settings=S()))
    check_coverage(plan)
    kinds = {b.kind for b in plan.blocks}
    assert {"sleep", "meal", "work", "pool"} <= kinds
    # workday on Monday 09:00-17:00 is work (+ lunch), never pool time
    for b in plan.blocks:
        if b.kind == "pool" and b.start.date() == NOW.date():
            assert not (b.start.hour >= 9 and b.end.hour <= 16 and b.end.date() == NOW.date())


def test_fixed_and_pins_are_respected_and_not_overlapped():
    meet = Block(id="gcal-1", start=datetime(2026, 9, 28, 15, 0, tzinfo=TZ),
                 end=datetime(2026, 9, 28, 16, 30, tzinfo=TZ), kind="fixed", title="Group meeting")
    pin = Block(id="pin-1", start=datetime(2026, 9, 28, 20, 0, tzinfo=TZ),
                end=datetime(2026, 9, 28, 21, 0, tzinfo=TZ), kind="pool", title="Run", pinned=True)
    plan = solve(Inputs(now=NOW, settings=S(), fixed=[meet], pinned=[pin]))
    check_coverage(plan, given_ids={"gcal-1", "pin-1"})
    assert meet in plan.blocks and pin in plan.blocks
    for b in plan.blocks:
        if b.id not in ("gcal-1", "pin-1"):
            assert b.end <= meet.start or b.start >= meet.end or b.kind == "sleep"


def test_deadline_task_before_due_and_work_inside_workday():
    due = datetime(2026, 9, 28, 14, 0, tzinfo=TZ)
    t = Task(id="mail:uni:1:a0", title="Send slides", minutes=90, due=due, work=True,
             source={"type": "mail", "ref": "uni:1"})
    plan = solve(Inputs(now=NOW, settings=S(), tasks=[t]))
    chunks = [b for b in plan.blocks if b.source.get("task") == t.id]
    assert sum(b.minutes for b in chunks) == 90
    assert all(b.end <= due and b.start.hour >= 9 for b in chunks)
    assert plan.at_risk == []
    check_coverage(plan)


def test_impossible_deadline_is_at_risk_but_still_placed():
    due = NOW + timedelta(minutes=70)
    t = Task(id="t1", title="Too big", minutes=180, due=due)
    plan = solve(Inputs(now=NOW, settings=S(), tasks=[t]))
    assert plan.at_risk and plan.at_risk[0]["task"] == "t1"
    assert sum(b.minutes for b in plan.blocks if b.source.get("task") == "t1") == 180
    check_coverage(plan)


def test_personal_task_goes_outside_workday():
    t = Task(id="t2", title="Tax form", minutes=60, due=datetime(2026, 9, 29, 23, 0, tzinfo=TZ))
    plan = solve(Inputs(now=NOW, settings=S(), tasks=[t]))
    for b in plan.blocks:
        if b.source.get("task") == "t2":
            assert b.start.hour < 9 or b.start.hour >= 17


def test_waterfill_matches_closed_form():
    pools = [{"id": "a", "weight": 3.0, "tau": 60}, {"id": "b", "weight": 1.0, "tau": 30}]
    shares, p = waterfill(pools, 300)
    assert abs(sum(shares.values()) - 300) < 1e-6
    for pool in pools:                               # KKT: every funded pool has marginal gain p
        t = shares[pool["id"]]
        if t > 0:
            assert abs(pool["weight"] / (pool["tau"] + t) - p) < 1e-6
    shares, _ = waterfill(pools, 20)                 # little time: only the steep pool gets any
    assert shares["b"] == 0 and abs(shares["a"] - 20) < 1e-6


def test_apportion_sums_exactly():
    out = apportion({"a": 101.3, "b": 55.9, "c": 0.0}, 155, 5)
    assert sum(out.values()) == 155 and all(v % 5 == 0 for v in out.values())


def test_stable_ids_across_replans():
    a = solve(Inputs(now=NOW, settings=S()))
    b = solve(Inputs(now=NOW, settings=S()))
    assert [x.id for x in a.blocks] == [x.id for x in b.blocks]


def test_late_bedtime_after_midnight():
    s = S()
    s["sleep"] = {"start": "00:30", "end": "07:30", "from_garmin": False}
    plan = solve(Inputs(now=NOW, settings=s))
    check_coverage(plan)
    sleeps = [b for b in plan.blocks if b.kind == "sleep" and b.start > NOW]
    assert sleeps[0].start.hour == 0 and sleeps[0].start.minute == 30


def test_settings_validation():
    s = copy.deepcopy(settings_mod.DEFAULTS)
    s["pools"] = [{"id": "x", "title": "X"}, {"id": "x", "title": "Y"}]
    with pytest.raises(ValueError):
        settings_mod.validate(s)


def test_frozen_window_is_kept_and_rest_refilled():
    first = solve(Inputs(now=NOW, settings=S()))
    later = NOW + timedelta(minutes=20)
    freeze = later + timedelta(minutes=60)
    frozen = [b for b in first.blocks if b.start < freeze]
    second = solve(Inputs(now=later, settings=S(), frozen=frozen))
    kept = {b.id for b in frozen}
    assert kept <= {b.id for b in second.blocks}
    check_coverage(second, given_ids=kept)
