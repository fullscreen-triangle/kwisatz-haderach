"""
Estimates of time and resources, asked of the `decisions` tool.

`decisions` is a Rust command (repository `decisions`, step 6): JSON in, JSON out. It reads
no clock, no network and no file, so nothing leaves this machine. This module is its client:
it finds the binary, runs one operation, and hands back the JSON.

    from backend import estimate

    out = estimate.travel({"lat": 54.0865, "lon": 13.3923}, {"lat": 52.52, "lon": 13.405},
                          mode="rail", budget=7200)
    out["estimate"]   # {"low", "high", "low_basis", "high_basis", "basis", "coverage"}, or None
    out["fit"]        # {"fit": "fits" | "over-budget" | "not-enough" | "unsupported", ...}, or None
    out["sentence"]   # why there is no estimate, when there is none

An estimate is always an interval, in the unit the caller names. Each end says what it rests on:

    bound      holds for every run that keeps the stated preconditions
    observed   read elsewhere and passed in (a timetable's journey time)
    forecast   calibrated on past records, with `coverage` where one can be stated
    declared   stated by hand

With too few records for the error budget asked for, `estimate` is None and `sentence` says
how many more are needed. No number is invented: a caller that needs one must choose an end
of the interval, or fall back to its own default and say so.

The binary is $DECISIONS_BIN, else `decisions` on PATH, else ~/.cargo/bin/decisions.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Optional

TIMEOUT = float(os.getenv("DECISIONS_TIMEOUT", "10"))   # seconds; an estimate is arithmetic


class EstimateError(Exception):
    """The tool could not be asked, or refused the request. `status` is the HTTP status a
    route answers with; `code` is the tool's own code where it gave one."""

    def __init__(self, code: str, message: str, status: int = 502):
        super().__init__(f"{code}: {message}")
        self.code, self.message, self.status = code, message, status


def decisions_bin() -> Optional[str]:
    """The path of the `decisions` binary, or None if it is not installed."""
    named = os.getenv("DECISIONS_BIN")
    if named:
        return named
    found = shutil.which("decisions")
    if found:
        return found
    cargo = Path.home() / ".cargo" / "bin" / "decisions"   # not on a service's PATH
    for candidate in (cargo, cargo.with_suffix(".exe")):
        if candidate.exists():
            return str(candidate)
    return None


def call(op: str, payload: Optional[dict] = None, timeout: float = TIMEOUT) -> dict:
    """Run one operation of the tool (`decisions call <op> -`) and return its JSON answer.

    Raises EstimateError: 501 when the tool is not installed, 504 when it does not answer in
    time, 400 when it refuses the input (its code and message are kept), 502 otherwise."""
    binary = decisions_bin()
    if not binary:
        raise EstimateError("not_installed", "the decisions tool is not installed "
                            "(set DECISIONS_BIN, or run deploy/server2-decisions.sh)", 501)
    try:
        proc = subprocess.run([binary, "call", op, "-", "--compact"],
                              input=json.dumps(payload or {}), capture_output=True,
                              text=True, encoding="utf-8", timeout=timeout)
    except subprocess.TimeoutExpired:
        raise EstimateError("timeout", f"decisions did not answer within {timeout:g} s", 504)
    except OSError as exc:
        raise EstimateError("failed_to_start", f"decisions could not be started: {exc}", 502)
    try:
        answer = json.loads(proc.stdout)
    except ValueError:
        detail = (proc.stderr or proc.stdout or "").strip()[:300]
        raise EstimateError("bad_output", f"decisions exited {proc.returncode} without JSON: {detail}", 502)
    if proc.returncode != 0 or (isinstance(answer, dict) and "error" in answer):
        err = answer.get("error", {}) if isinstance(answer, dict) else {}
        code = str(err.get("code") or "failed")
        message = str(err.get("message") or f"decisions exited {proc.returncode}")
        if code == "unknown_op":
            # A build from before step 6 has no `estimate` operation.
            raise EstimateError("old_tool", "the installed decisions tool has no "
                                f"`{op}` operation: rebuild it from the current source", 501)
        raise EstimateError(code, message, 400)
    return answer


def ask(algorithm: str, input: Optional[dict] = None, budget: Optional[float] = None,
        unit: Optional[str] = None, timeout: float = TIMEOUT) -> dict:
    """An estimate from one estimation algorithm, judged against `budget` if one is given.

    Returns {"algorithm", "unit", "estimate", "verdict", "sentence", "budget", "fit", "detail"}.
    `estimate` is None when the tool gives none; `verdict` is then "unsupported" and
    `sentence` says what is needed."""
    payload: dict[str, Any] = {"algorithm": algorithm, "input": input or {}}
    if budget is not None:
        payload["budget"] = budget
    if unit is not None:
        payload["unit"] = unit
    return call("estimate", payload, timeout=timeout)


def travel(origin: Optional[dict] = None, destination: Optional[dict] = None, mode: Any = None,
           distance: Optional[float] = None, observed: Any = None,
           budget: Optional[float] = None) -> dict:
    """The time to get from `origin` to `destination` ({"lat", "lon"} in degrees), in seconds.

    `mode` is walk, cycle, car-urban, car-road, transit or rail, or a dict that replaces
    values of one ({"name": "cycle", "speed_low": 2.5}). The low end is a bound: the straight
    line at the mode's top speed. The high end is a forecast from the tool's conventions.
    `observed` is a journey time read elsewhere (seconds, or {"low", "high"}), such as the
    Deutsche Bahn result the travel page already fetches; it stands in place of the computed
    interval. `distance` (metres) may be given in place of the two places."""
    body: dict[str, Any] = {}
    if origin is not None:
        body["from"] = {"lat": origin["lat"], "lon": origin["lon"]}
    if destination is not None:
        body["to"] = {"lat": destination["lat"], "lon": destination["lon"]}
    if distance is not None:
        body["distance"] = distance
    if mode is not None:
        body["mode"] = mode
    if observed is not None:
        body["observed"] = observed
    return ask("travel-time", body, budget=budget)


def from_records(past: list, alpha: float = 0.2, sides: str = "upper",
                 budget: Optional[float] = None, unit: Optional[str] = None) -> dict:
    """An interval for a new task from what past tasks of the same kind took.

    `alpha` is the error budget: the interval may miss with at most that probability.
    `sides` is "upper" (the low end is 0) or "both". With too few records there is no
    estimate: `needs` in `detail` gives the number that would do (4 for the defaults)."""
    return ask("reference-class", {"past": list(past), "alpha": alpha, "sides": sides},
               budget=budget, unit=unit)


def algorithms() -> list:
    """The estimation algorithms the installed tool has, each with what it decides and needs."""
    return call("list", {"class": "estimation"}).get("algorithms", [])


def status() -> dict:
    """Whether the tool is installed, and whether it is recent enough to estimate."""
    binary = decisions_bin()
    if not binary:
        return {"installed": False, "bin": None, "version": None, "estimates": False}
    try:
        version = subprocess.run([binary, "--version"], capture_output=True, text=True,
                                 encoding="utf-8", timeout=TIMEOUT).stdout.strip() or None
    except (OSError, subprocess.TimeoutExpired):
        return {"installed": False, "bin": binary, "version": None, "estimates": False}
    try:
        ops = [o.get("name") for o in call("describe").get("ops", [])]
    except EstimateError:
        ops = []
    return {"installed": True, "bin": binary, "version": version, "estimates": "estimate" in ops}
