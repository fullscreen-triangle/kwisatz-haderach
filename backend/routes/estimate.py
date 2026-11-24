"""
/estimate — time and resource estimates, from the `decisions` tool (backend/estimate.py).

  GET  /estimate/health        is the tool installed, and can it estimate
  GET  /estimate/algorithms    the estimation algorithms, each with what it decides and needs
  POST /estimate               {algorithm, input, budget?, unit?} — one estimate, judged
                               against the budget if one is given
  POST /estimate/travel        {origin: {lat, lon}, destination: {lat, lon}, mode,
                                distance?, observed?, budget?} — travel time in seconds

Every estimate is an interval {low, high, low_basis, high_basis, basis, coverage}. Where the
tool can give none, `estimate` is null and `sentence` says what is needed; this route does
not put a number in its place.

Nothing is fetched: the tool computes from what the request holds. Coordinates and a
timetable's journey time are the caller's to supply. Inside the backend the same client is
used directly: desk tasks forecast their own time and steps from past runs
(backend/tasks/effort.py), and the task agent has it as its `estimate` tool.

Errors: 501 the tool is not installed or predates the `estimate` operation, 400 the tool
refused the input (its code and message are the detail), 504 it did not answer in time.
"""

from typing import Any, Optional, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend import estimate

router = APIRouter()


class Ask(BaseModel):
    algorithm: str
    input: dict = Field(default_factory=dict)
    budget: Optional[float] = None
    unit: Optional[str] = None


class Place(BaseModel):
    lat: float
    lon: float


class Travel(BaseModel):
    origin: Optional[Place] = None
    destination: Optional[Place] = None
    distance: Optional[float] = None            # metres, in place of the two places
    mode: Optional[Union[str, dict]] = None     # a named mode, or one with values replaced
    observed: Optional[Union[float, dict]] = None   # seconds, or {low, high}
    budget: Optional[float] = None              # seconds


def _answer(fn, *args: Any, **kwargs: Any):
    try:
        return fn(*args, **kwargs)
    except estimate.EstimateError as exc:
        raise HTTPException(status_code=exc.status, detail=f"{exc.code}: {exc.message}")


@router.get("/health")
def health():
    return estimate.status()


@router.get("/algorithms")
def algorithms():
    return {"algorithms": _answer(estimate.algorithms)}


@router.post("")
@router.post("/", include_in_schema=False)
def ask(body: Ask):
    return _answer(estimate.ask, body.algorithm, body.input, budget=body.budget, unit=body.unit)


@router.post("/travel")
def travel(body: Travel):
    return _answer(
        estimate.travel,
        origin=body.origin.model_dump() if body.origin else None,
        destination=body.destination.model_dump() if body.destination else None,
        mode=body.mode, distance=body.distance, observed=body.observed, budget=body.budget,
    )
