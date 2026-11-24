"""
How long a task of the desk takes, and how many steps, forecast from what earlier tasks took.

A run is one go of the agent: from the start (or Continue) until it reports, stops at the turn
limit, or fails. Each run leaves a record on its task:

    task["runs"] = [{"at", "seconds", "steps", "status": done | stopped | failed, "first"}]

The forecast for a new task is read from the first runs of earlier tasks that ended (done or
stopped), by the `reference-class` algorithm of the decisions tool (backend/estimate.py): an
upper end that a new run stays under with at least the stated probability, whatever the
distribution. All tasks count as one kind, so it is rough by design. With fewer than four
records there is no forecast, and `needs` says how many more runs it takes; no number is put
in its place. Tasks from before this module have no records.

    forecast(tasks) -> {"records", "alpha", "seconds", "steps", "median", "needs", "sentence"}
    held(tasks)     -> how the forecasts that were made compare with what the runs took
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, List, Optional

try:
    from backend import estimate
except ImportError:      # a node that was not sent backend/estimate.py runs tasks without forecasts
    estimate = None

ALPHA = 0.2          # the forecast may miss with at most this probability; four records give one


def record(task: dict, seconds: float, steps: int, status: str, first: bool) -> dict:
    """Note what one run took on its task."""
    rec = {"at": datetime.now().astimezone().isoformat(timespec="seconds"),
           "seconds": max(0, round(seconds)), "steps": max(0, int(steps)), "status": status, "first": bool(first)}
    task.setdefault("runs", []).append(rec)
    return rec


def first_run(task: dict) -> Optional[dict]:
    """The first run of a task, if it ended by itself (a failed run was cut short)."""
    for r in task.get("runs") or []:
        if r.get("first"):
            return r if r.get("status") in ("done", "stopped") else None
    return None


def past(tasks: Iterable[dict]) -> List[dict]:
    return [r for r in (first_run(t) for t in tasks) if r]


def forecast(tasks: Iterable[dict], alpha: float = ALPHA) -> dict:
    """What a new task's first run will take, from the first runs of `tasks`."""
    recs = past(tasks)
    out = {"records": len(recs), "alpha": alpha, "seconds": None, "steps": None,
           "median": None, "needs": None, "sentence": None}
    if estimate is None:
        out["sentence"] = "backend/estimate.py is not on this node"
        return out
    try:
        secs = estimate.from_records([r["seconds"] for r in recs], alpha=alpha, sides="upper", unit="seconds")
        steps = estimate.from_records([r["steps"] for r in recs], alpha=alpha, sides="upper", unit="steps")
    except estimate.EstimateError as e:            # the tool is absent, old, or refused the records
        out["sentence"] = e.message
        return out
    out["seconds"], out["steps"] = secs.get("estimate"), steps.get("estimate")
    detail = secs.get("detail") or {}
    if recs:
        out["median"] = {"seconds": detail.get("median"), "steps": (steps.get("detail") or {}).get("median")}
    out["needs"] = (detail.get("needs") or {}).get("records")
    out["sentence"] = secs.get("sentence")
    return out


def held(tasks: Iterable[dict]) -> dict:
    """Of the tasks that were given a forecast and then ran: how many stayed within it.
    {"total", "within", "above", "below", "rate"}; `rate` is None when none can be judged."""
    outcomes = []
    for t in tasks:
        est, run = (t.get("estimate") or {}).get("seconds"), first_run(t)
        if est and run and est.get("high") is not None:
            outcomes.append({"low": est.get("low") or 0, "high": est["high"], "actual": run["seconds"]})
    if not outcomes or estimate is None:
        return {"total": 0, "within": 0, "above": 0, "below": 0, "rate": None}
    try:
        out = estimate.call("run", {"algorithm": "coverage-monitor", "input": {"outcomes": outcomes}})
    except estimate.EstimateError as e:
        return {"total": len(outcomes), "within": None, "above": None, "below": None, "rate": None, "sentence": e.message}
    return {k: out.get(k) for k in ("total", "within", "above", "below", "rate")}
