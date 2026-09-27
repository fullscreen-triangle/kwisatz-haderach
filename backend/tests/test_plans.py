"""
Plans: shape-agnostic nodes -> planner tasks and timeline milestones.
Run: python -m pytest backend/tests/test_plans.py
"""

import copy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from backend.planner import settings as settings_mod
from backend.planner.solver import Inputs, solve
from backend.plans.model import PlanNode, blockers, effective, milestones, tasks
from backend.plans.store import PlansStore

TZ = ZoneInfo("Europe/Berlin")
NOW = datetime(2026, 9, 28, 8, 7, tzinfo=TZ)            # a Monday morning
UNTIL = NOW + timedelta(days=8)


def nodes(*ns):
    return {n.id: n for n in ns}


def S():
    s = copy.deepcopy(settings_mod.DEFAULTS)
    s["sleep"]["from_garmin"] = False
    s["horizon_days"] = 6
    return s


def test_habit_spreads_over_the_week_outside_the_workday():
    run = PlanNode(id="run", title="Run", every={"times": 3, "per": "week", "minutes": 45})
    ts = [t for t in tasks(nodes(run), NOW, NOW + timedelta(days=7), TZ) if t.id.startswith("plan:run:2026-W40")]
    assert len(ts) == 3
    assert all(not t.work and t.minutes == 45 for t in ts)
    # slots don't overlap and each is released at its start (the first at now)
    spans = sorted((t.release, t.due) for t in ts)
    assert spans[0][0] == NOW
    for (s1, e1), (s2, e2) in zip(spans, spans[1:]):
        assert e1 <= s2
    plan = solve(Inputs(now=NOW, settings=S(), tasks=ts))
    runs = sorted((b for b in plan.blocks if b.source.get("plan") == "run"), key=lambda b: b.start)
    assert len(runs) == 3
    assert len({b.start.date() for b in runs}) == 3                      # three different days
    for b, t in zip(runs, sorted(ts, key=lambda t: t.due)):
        assert t.release <= b.start and b.end <= t.due
        assert not (b.start.weekday() < 5 and 9 <= b.start.hour < 17)   # not inside the workday


def test_blocked_nodes_emit_nothing_until_their_requirement_is_done():
    card = PlanNode(id="card", title="Residence card", minutes=30, when={"date": "2026-10-05"})
    trip = PlanNode(id="trip", title="Visit friend", minutes=60, when={"date": "2026-10-03"},
                    requires=["card", "a valid entry route"])
    step = PlanNode(id="book", title="Book flights", minutes=30, when={"date": "2026-10-02"}, parent="trip")
    ns = nodes(card, trip, step)
    assert effective(trip, ns) == "blocked" and effective(step, ns) == "blocked"   # inherited
    assert "a valid entry route" in blockers(trip, ns)
    ids = {t.id for t in tasks(ns, NOW, UNTIL, TZ)}
    assert ids == {"plan:card"}
    card.status = "done"
    trip.requires = ["card"]
    assert {t.id for t in tasks(ns, NOW, UNTIL, TZ)} == {"plan:trip", "plan:book"}


def test_dated_effort_is_a_task_dated_without_effort_is_only_a_milestone():
    pay = PlanNode(id="pay", title="Pay rent", minutes=15, when={"date": "2026-10-02"})
    prob = PlanNode(id="prob", title="Probation ends", when={"date": "2027-03-14"})
    kite = PlanNode(id="kite", title="Bigger kite", cost={"amount": 600})
    ns = nodes(pay, prob, kite)
    ts = tasks(ns, NOW, UNTIL, TZ)
    assert [t.id for t in ts] == ["plan:pay"]
    assert ts[0].due == datetime(2026, 10, 2, 18, 0, tzinfo=TZ)
    ms = {m["id"] for m in milestones(ns, TZ)}
    assert ms == {"pay", "prob"}                                  # an undated purchase is not on the calendar


def test_store_subtree_delete_requires_cleanup_import_and_cycles(tmp_path):
    st = PlansStore(tmp_path)
    fired = []
    st.listeners.append(lambda: fired.append(1))
    sport = st.add(PlanNode(title="Get back into sports"))
    club = st.add(PlanNode(title="Join an athletics club", parent=sport.id))
    other = st.add(PlanNode(title="Race in spring", requires=[club.id]))
    with pytest.raises(ValueError):
        st.update(sport.id, {"parent": club.id})                       # would be its own ancestor
    assert st.delete(sport.id) == 2
    left = st.nodes()
    assert set(left) == {other.id} and left[other.id].requires == []
    seed = [{"id": "kite", "title": "Bigger kite", "cost": {"amount": 600}}, {"title": "no id"}]
    r1 = st.import_nodes(seed)
    r2 = st.import_nodes(seed)
    assert (r1["added"], r2["added"], r2["skipped"]) == (1, 0, 2)
    assert len(fired) >= 4
