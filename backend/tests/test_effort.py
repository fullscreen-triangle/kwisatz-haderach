"""
backend/tasks/effort.py: what a desk task is forecast to take, from what earlier ones took,
and the agent's `estimate` tool.

The first half fakes the decisions tool, so it runs anywhere. The second half asks the real
binary and is skipped unless one with the `estimate` operation is found (DECISIONS_BIN).

Run: python -m pytest backend/tests/test_effort.py
"""

import asyncio
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend import estimate  # noqa: E402
from backend.tasks import effort, tools  # noqa: E402
from backend.tasks.tools import Run  # noqa: E402
from backend.tests.test_tasks import FakeProviders  # noqa: E402


def task(seconds=None, steps=3, status="done", first=True, est_high=None):
    t = {"id": "t", "steps": []}
    if seconds is not None:
        effort.record(t, seconds, steps, status, first)
    if est_high is not None:
        t["estimate"] = {"seconds": {"low": 0, "high": est_high}}
    return t


@pytest.fixture
def fake_records(monkeypatch):
    """estimate.from_records as the tool answers it: the largest past value with four or more."""
    asked = []

    def from_records(past, alpha=0.2, sides="upper", budget=None, unit=None):
        asked.append((list(past), alpha, sides, unit))
        if len(past) < 4:
            needs = {"records": {"have": len(past), "need": 4, "more": 4 - len(past)}}
            return {"estimate": None, "sentence": f"needs {4 - len(past)} more", "detail": {"needs": needs, "median": None}}
        est = {"low": 0.0, "high": float(max(past)), "basis": "forecast", "coverage": len(past) / (len(past) + 1)}
        return {"estimate": est, "sentence": None, "detail": {"median": sorted(past)[len(past) // 2]}}
    monkeypatch.setattr(estimate, "from_records", from_records)
    return asked


# ---------------------------------------------------------------- the forecast, tool faked


def test_only_first_runs_that_ended_by_themselves_are_records(fake_records):
    tasks = [task(60, 5), task(90, 7, status="stopped"), task(30, 2, status="failed"),
             task(40, 4, first=False), task(), task(120, 9), task(75, 6)]
    out = effort.forecast(tasks)
    assert fake_records[0] == ([60, 90, 120, 75], 0.2, "upper", "seconds")
    assert fake_records[1][0] == [5, 7, 9, 6] and fake_records[1][3] == "steps"
    assert out["records"] == 4 and out["seconds"]["high"] == 120 and out["steps"]["high"] == 9
    assert out["needs"] is None and out["sentence"] is None


def test_too_few_records_give_no_number_and_say_how_many_more(fake_records):
    out = effort.forecast([task(60), task(80)])
    assert out["seconds"] is None and out["steps"] is None
    assert out["needs"] == {"have": 2, "need": 4, "more": 2} and "2 more" in out["sentence"]


def test_a_missing_tool_gives_no_forecast_and_no_error(monkeypatch):
    def gone(*a, **k):
        raise estimate.EstimateError("not_installed", "the decisions tool is not installed", 501)
    monkeypatch.setattr(estimate, "from_records", gone)
    out = effort.forecast([task(60)] * 5)
    assert out["seconds"] is None and out["sentence"] == "the decisions tool is not installed"


def test_held_compares_only_tasks_that_had_a_forecast(monkeypatch):
    sent = {}

    def call(op, payload=None, timeout=10):
        sent.update(op=op, payload=payload)
        return {"total": 2, "within": 1, "above": 1, "below": 0, "rate": 0.5, "hits": ["within", "above"]}
    monkeypatch.setattr(estimate, "call", call)
    out = effort.held([task(50, est_high=100), task(140, est_high=100), task(70), task(est_high=100)])
    assert sent["op"] == "run" and sent["payload"]["algorithm"] == "coverage-monitor"
    assert sent["payload"]["input"]["outcomes"] == [{"low": 0, "high": 100, "actual": 50}, {"low": 0, "high": 100, "actual": 140}]
    assert out == {"total": 2, "within": 1, "above": 1, "below": 0, "rate": 0.5}
    assert effort.held([task(70)])["rate"] is None            # nothing to judge: the tool is not asked


# ---------------------------------------------------------------- the service


def test_a_task_gets_a_forecast_and_leaves_a_record_and_continue_is_not_a_first_run(tmp_path, fake_records):
    from backend.tasks.service import TaskService
    prov = FakeProviders([{"role": "assistant", "content": "one"}, {"role": "assistant", "content": "more"},
                          {"role": "assistant", "content": "two"}])

    async def finish(svc, t):
        while svc.get(t["id"])["status"] == "running":
            await asyncio.sleep(0.01)

    async def go():
        svc = TaskService(prov, root=tmp_path)
        for i in range(4):                                   # four earlier tasks, as if they had run
            old = task(100 + i, 5 + i)
            old.update(id=f"old{i}", created="2026-01-01T00:00:00+00:00")
            svc.tasks[old["id"]] = old
        a = svc.start("first", model="openai/gpt-5.5")
        await finish(svc, a)
        svc.resume(a["id"], "go on")
        await finish(svc, a)
        b = svc.start("second", model="openai/gpt-5.5")
        await finish(svc, b)
        return svc, svc.get(a["id"]), svc.get(b["id"])
    svc, a, b = asyncio.run(go())
    assert a["estimate"]["records"] == 4 and a["estimate"]["seconds"]["high"] == 103
    assert [(r["first"], r["status"], r["steps"]) for r in a["runs"]] == [(True, "done", 0), (False, "done", 0)]
    assert a["run_started"]
    assert b["estimate"]["records"] == 5                       # the first task's first run now counts
    saved = json.loads((tmp_path / b["id"] / "task.json").read_text(encoding="utf-8"))
    assert saved["runs"][0]["first"] and saved["estimate"]["seconds"]["high"] == 103


def test_a_failed_run_is_recorded_but_is_not_a_record(tmp_path, fake_records):
    from backend.tasks.service import TaskService

    async def go():
        svc = TaskService(FakeProviders([]), root=tmp_path)      # no answer scripted: the run fails
        t = svc.start("x", model="openai/gpt-5.5")
        while svc.get(t["id"])["status"] == "running":
            await asyncio.sleep(0.01)
        return svc.get(t["id"])
    t = asyncio.run(go())
    assert t["status"] == "failed" and t["runs"][0]["status"] == "failed"
    assert effort.past([t]) == []


# ---------------------------------------------------------------- the agent's tool


def test_the_estimate_tool_passes_the_request_and_never_invents_a_number(tmp_path, monkeypatch):
    seen = []

    def ask(algorithm, input=None, budget=None, unit=None, timeout=10):
        seen.append((algorithm, input, budget, unit))
        if algorithm == "reference-class":
            raise estimate.EstimateError("invalid", "alpha must be between 0 and 1", 400)
        return {"algorithm": algorithm, "unit": unit, "sentence": None, "fit": {"fit": "fits"},
                "estimate": {"low": 20.0, "high": 70.0, "basis": "declared"}, "detail": {"expected": 35.0}}
    monkeypatch.setattr(estimate, "ask", ask)
    r = Run({"steps": []}, tmp_path, cloud=True)
    out, g = asyncio.run(tools.estimate_effort(r, "three-point", '{"optimistic": 20, "likely": 30, "pessimistic": 70}', 90, "minutes"))
    assert seen[0] == ("three-point", {"optimistic": 20, "likely": 30, "pessimistic": 70}, 90, "minutes")
    assert out["estimate"]["high"] == 70.0 and out["expected"] == 35.0 and out["fit"] == {"fit": "fits"}
    assert g[0]["node"]["label"] == "20–70 minutes"
    out, g = asyncio.run(tools.estimate_effort(r, "reference-class", '{"past": [1], "alpha": 7}'))
    assert out.startswith("no estimate (invalid)") and g == []
    out, _ = asyncio.run(tools.estimate_effort(r, "three-point", "{not json"))
    assert out.startswith("input is not JSON") and len(seen) == 2
    spec = tools.TOOLS["estimate"][1]["function"]
    assert spec["parameters"]["required"] == ["algorithm", "input"]


# ---------------------------------------------------------------- the real tool

def _real():
    try:
        return estimate.status().get("estimates")
    except Exception:
        return False


needs_tool = pytest.mark.skipif(not _real(), reason="no decisions binary with the estimate operation (set DECISIONS_BIN)")


@needs_tool
def test_the_real_tool_gives_the_largest_of_five_and_nothing_for_three():
    five = [task(s, n) for s, n in ((60, 5), (240, 12), (95, 7), (130, 9), (75, 6))]
    out = effort.forecast(five)
    assert out["seconds"]["high"] == 240 and out["seconds"]["low"] == 0 and out["steps"]["high"] == 12
    assert out["seconds"]["basis"] == "forecast" and out["seconds"]["coverage"] >= 0.8
    few = effort.forecast(five[:3])
    assert few["seconds"] is None and few["needs"] == {"have": 3, "need": 4, "more": 1}
    none = effort.forecast([])
    assert none["seconds"] is None and none["records"] == 0


@needs_tool
def test_the_real_tool_counts_how_forecasts_held():
    out = effort.held([task(50, est_high=100), task(140, est_high=100), task(100, est_high=100)])
    assert (out["total"], out["within"], out["above"]) == (3, 2, 1)


@needs_tool
def test_the_real_tool_answers_the_agent(tmp_path):
    r = Run({"steps": []}, tmp_path, cloud=True)
    out, g = asyncio.run(tools.estimate_effort(r, "three-point", '{"optimistic": 20, "likely": 30, "pessimistic": 70}', 60, "minutes"))
    assert out["estimate"]["low"] == 20 and out["estimate"]["high"] == 70 and out["fit"]["fit"] != "fits"
    out, _ = asyncio.run(tools.estimate_effort(r, "reference-class", '{"past": [34, 51], "alpha": 0.2, "sides": "upper"}', unit="minutes"))
    assert out["estimate"] is None and out["needs"]["records"]["more"] == 2
