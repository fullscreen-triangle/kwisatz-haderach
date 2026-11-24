"""
backend/estimate.py and /estimate: the client of the `decisions` tool.

The first half fakes the tool's process, so it runs anywhere. The second half asks the real
binary and is skipped unless one that has the `estimate` operation is found (set
DECISIONS_BIN to a build of the decisions repository at step 6 or later).

Run: python -m pytest backend/tests/test_estimate.py
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend import estimate  # noqa: E402

GREIFSWALD = {"lat": 54.0865, "lon": 13.3923}
BERLIN = {"lat": 52.52, "lon": 13.405}


class FakeTool:
    """Stands in for subprocess.run: records the call, answers with a fixed result."""

    def __init__(self, stdout="{}", returncode=0, stderr="", raises=None):
        self.stdout, self.returncode, self.stderr, self.raises = stdout, returncode, stderr, raises
        self.argv, self.stdin = None, None

    def __call__(self, argv, **kwargs):
        self.argv, self.stdin = argv, kwargs.get("input")
        if self.raises:
            raise self.raises
        return subprocess.CompletedProcess(argv, self.returncode, self.stdout, self.stderr)


@pytest.fixture
def fake(monkeypatch):
    def install(**kwargs):
        tool = FakeTool(**kwargs)
        monkeypatch.setattr(estimate, "decisions_bin", lambda: "decisions-fake")
        monkeypatch.setattr(estimate.subprocess, "run", tool)
        return tool
    return install


# ---------------------------------------------------------------- the client, faked


def test_ask_sends_one_json_request_and_returns_the_answer(fake):
    answer = {"algorithm": "three-point", "estimate": {"low": 20.0, "high": 70.0, "basis": "declared"}}
    tool = fake(stdout=json.dumps(answer))
    out = estimate.ask("three-point", {"optimistic": 20, "likely": 30, "pessimistic": 70},
                       budget=60, unit="minutes")
    assert out == answer
    assert tool.argv == ["decisions-fake", "call", "estimate", "-", "--compact"]
    assert json.loads(tool.stdin) == {
        "algorithm": "three-point", "budget": 60, "unit": "minutes",
        "input": {"optimistic": 20, "likely": 30, "pessimistic": 70}}


def test_a_budget_and_unit_are_left_out_when_not_given(fake):
    tool = fake()
    estimate.ask("three-point", {})
    assert json.loads(tool.stdin) == {"algorithm": "three-point", "input": {}}


def test_travel_names_the_places_as_the_tool_expects(fake):
    tool = fake()
    estimate.travel(GREIFSWALD, BERLIN, mode="rail", observed=9840, budget=10800)
    sent = json.loads(tool.stdin)
    assert sent["algorithm"] == "travel-time" and sent["budget"] == 10800
    assert sent["input"] == {"from": GREIFSWALD, "to": BERLIN, "mode": "rail", "observed": 9840}
    estimate.travel(distance=3200, mode={"name": "cycle", "speed_low": 2.5})
    assert json.loads(tool.stdin)["input"] == {"distance": 3200, "mode": {"name": "cycle", "speed_low": 2.5}}


def test_a_refused_input_keeps_the_tools_code_and_message(fake):
    fake(stdout=json.dumps({"error": {"code": "invalid", "message": "unknown mode `teleport`"}}), returncode=2)
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.travel(distance=10, mode="teleport")
    assert (caught.value.code, caught.value.status) == ("invalid", 400)
    assert "teleport" in caught.value.message


def test_a_tool_without_the_operation_is_reported_as_too_old(fake):
    fake(stdout=json.dumps({"error": {"code": "unknown_op", "message": "unknown operation `estimate`"}}),
         returncode=2)
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.ask("travel-time", {})
    assert (caught.value.code, caught.value.status) == ("old_tool", 501)


def test_a_missing_tool_a_slow_tool_and_garbage_each_have_their_status(fake, monkeypatch):
    fake(raises=subprocess.TimeoutExpired("decisions", 10))
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.ask("travel-time", {})
    assert (caught.value.code, caught.value.status) == ("timeout", 504)

    fake(raises=FileNotFoundError("decisions-fake"))
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.ask("travel-time", {})
    assert (caught.value.code, caught.value.status) == ("failed_to_start", 502)

    fake(stdout="panicked", returncode=101)
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.ask("travel-time", {})
    assert (caught.value.code, caught.value.status) == ("bad_output", 502)

    monkeypatch.setattr(estimate, "decisions_bin", lambda: None)
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.ask("travel-time", {})
    assert (caught.value.code, caught.value.status) == ("not_installed", 501)
    assert estimate.status() == {"installed": False, "bin": None, "version": None, "estimates": False}


def test_the_binary_is_found_by_the_environment_first(monkeypatch):
    monkeypatch.setenv("DECISIONS_BIN", "/opt/tools/decisions")
    assert estimate.decisions_bin() == "/opt/tools/decisions"


# ---------------------------------------------------------------- the route, faked


def _client():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from backend.routes import estimate as routes
    app = FastAPI()
    app.include_router(routes.router, prefix="/estimate")
    return TestClient(app)


def test_the_route_passes_a_request_through_and_maps_errors(fake):
    pytest.importorskip("fastapi")
    client = _client()
    tool = fake(stdout=json.dumps({"estimate": None, "verdict": "unsupported",
                                   "sentence": "unsupported: plan; needs 3 more past totals"}))
    resp = client.post("/estimate", json={"algorithm": "reference-class", "unit": "minutes",
                                          "input": {"past": [30], "alpha": 0.2, "sides": "upper"}})
    assert resp.status_code == 200
    # No estimate is an answer, not an error, and the route puts no number in its place.
    assert resp.json()["estimate"] is None and resp.json()["verdict"] == "unsupported"
    assert json.loads(tool.stdin)["unit"] == "minutes"

    tool = fake()
    resp = client.post("/estimate/travel", json={"origin": GREIFSWALD, "destination": BERLIN,
                                                 "mode": "rail", "budget": 7200})
    assert resp.status_code == 200
    assert json.loads(tool.stdin) == {"algorithm": "travel-time", "budget": 7200,
                                      "input": {"from": GREIFSWALD, "to": BERLIN, "mode": "rail"}}

    fake(stdout=json.dumps({"error": {"code": "bad_input", "message": "missing field `alpha`"}}), returncode=2)
    resp = client.post("/estimate", json={"algorithm": "reference-class", "input": {"past": []}})
    assert resp.status_code == 400 and resp.json()["detail"].startswith("bad_input: ")

    fake(raises=subprocess.TimeoutExpired("decisions", 10))
    assert client.get("/estimate/algorithms").status_code == 504
    assert client.post("/estimate", json={"input": {}}).status_code == 422   # no algorithm named


# ---------------------------------------------------------------- the real tool


def _estimates() -> bool:
    try:
        return bool(estimate.status()["estimates"])
    except Exception:
        return False


real = pytest.mark.skipif(not _estimates(), reason="no decisions binary with the `estimate` operation")


@real
def test_a_travel_time_is_a_bound_below_and_a_forecast_above():
    out = estimate.travel(GREIFSWALD, BERLIN, mode="rail", budget=7200)
    e = out["estimate"]
    assert out["unit"] == "seconds"
    assert (e["low_basis"], e["high_basis"], e["basis"], e["coverage"]) == ("bound", "forecast", "forecast", None)
    # 174 km: no sooner than 34 minutes at the top speed, forecast up to about 6 hours.
    assert 2000 < e["low"] < 2100 and 21000 < e["high"] < 22000
    # Two hours lie inside the interval: neither fits nor certainly over.
    assert out["fit"]["fit"] == "not-enough"
    assert out["detail"]["computed"]["mode"]["name"] == "rail"
    # A budget below the bound is over for certain.
    assert estimate.travel(GREIFSWALD, BERLIN, mode="rail", budget=1800)["fit"] == {
        "fit": "over-budget", "label": None, "blocker": "budget", "sentence": None,
        "detail": {"certain": True, "excess": pytest.approx(e["low"] - 1800)}}


@real
def test_a_timetable_time_stands_in_place_of_the_computed_interval():
    out = estimate.travel(GREIFSWALD, BERLIN, mode="rail", observed=9840, budget=10800)
    assert out["estimate"]["basis"] == "observed"
    assert (out["estimate"]["low"], out["estimate"]["high"]) == (9840.0, 9840.0)
    assert out["fit"]["fit"] == "fits" and out["fit"]["detail"]["slack"] == 960.0
    assert out["detail"]["source"] == "observed"


@real
def test_too_few_records_give_no_number():
    out = estimate.from_records([30, 45, 25], unit="minutes", budget=60)
    assert out["estimate"] is None and out["fit"] is None
    assert out["verdict"] == "unsupported" and out["unit"] == "minutes"
    assert out["detail"]["needs"] == {"records": {"have": 3, "need": 4, "more": 1}}
    assert out["sentence"].startswith("unsupported: plan; needs 1 more past total of this kind of task")
    # With a fourth record the high end is the largest, at coverage 4 / 5.
    out = estimate.from_records([30, 45, 25, 40], unit="minutes", budget=60)
    e = out["estimate"]
    assert (e["low"], e["high"], e["low_basis"], e["high_basis"]) == (0.0, 45.0, "bound", "forecast")
    assert e["coverage"] == pytest.approx(0.8)
    assert out["fit"]["fit"] == "fits"


@real
def test_the_tool_lists_its_estimation_algorithms_and_refuses_a_bad_mode():
    names = [a["name"] for a in estimate.algorithms()]
    assert {"travel-time", "reference-class", "three-point", "count-times-cost"} <= set(names)
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.travel(distance=1000, mode="teleport")
    assert (caught.value.code, caught.value.status) == ("invalid", 400)
    with pytest.raises(estimate.EstimateError) as caught:
        estimate.ask("fifo", {})
    assert caught.value.status == 400


@real
def test_the_route_answers_from_the_real_tool():
    pytest.importorskip("fastapi")
    client = _client()
    health = client.get("/estimate/health").json()
    assert health["installed"] and health["estimates"] and health["version"].startswith("decisions ")
    resp = client.post("/estimate/travel", json={"distance": 3200, "mode": "walk", "budget": 3600})
    assert resp.status_code == 200
    body = resp.json()
    # 3.2 km on foot: no sooner than 1,592 s; forecast up to 4,800 s.
    assert body["estimate"]["low"] == pytest.approx(1592.0) and body["estimate"]["high"] == pytest.approx(4800.0)
    assert body["fit"]["fit"] == "not-enough"
    resp = client.post("/estimate", json={"algorithm": "three-point", "unit": "minutes", "budget": 90,
                                          "input": {"optimistic": 20, "likely": 30, "pessimistic": 70}})
    assert resp.json()["estimate"]["basis"] == "declared" and resp.json()["fit"]["fit"] == "fits"
    assert client.post("/estimate/travel", json={"distance": 3200, "mode": "teleport"}).status_code == 400
