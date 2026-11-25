"""
Trip estimation: walking and transit legs as time bands, tailored to the person's body
(segment-parameter prior), the weather at the time, and the ways they have walked.

GET  /trip/model                    the walking model, its inputs, and catalogue counts
PUT  /trip/settings                 {stature_m: [lo, hi], sex: female|male|unspecified}
POST /trip/estimate                 {legs, depart_at?, arrive_by?, weather?}
GET  /trip/journeys?from=&to=       DB journeys with every leg re-estimated
     [&departure=|&arrival=]        from/to: station id or "lat,lon"
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.trip import body
from backend.trip.bands import Band
from backend.trip.conditions import Weather
from backend.trip.estimate import context, estimate, load_edges, load_settings, save_settings

router = APIRouter()


def _when(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, f"not an ISO instant: {s}")
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


class Settings(BaseModel):
    stature_m: list[float] = Field(min_length=2, max_length=2)
    sex: str = "unspecified"


class WeatherIn(BaseModel):
    code: int | None = None
    temp_c: float | None = None
    wind_mps: float | None = None
    is_day: bool | None = None


class EstimateIn(BaseModel):
    legs: list[dict]
    depart_at: str | None = None
    arrive_by: str | None = None
    weather: WeatherIn | str | None = "auto"     # "auto" | "none" | explicit


@router.get("/model")
def model():
    s = load_settings()
    stature = Band(*s["stature_m"])
    v = body.walking_speed(stature, s["sex"])
    cat = load_edges()
    return {
        "settings": s,
        "leg_length_m": body.leg_length(stature, s["sex"]).json(),
        "froude": body.FROUDE.json(),
        "walking_speed_mps": v.json(),
        "pace_min_per_km": [round(1000 / v.hi / 60, 2), round(1000 / v.lo / 60, 2)],
        "sources": ["de Leva 1996 (Zatsiorsky–Seluyanov adjusted), Table 4",
                    "Winter 2009, ankle height", "Alexander 1989, Froude band",
                    "Tobler 1993, grade"],
        "walked_edges": cat.stats() if cat else None,
    }


@router.put("/settings")
def put_settings(s: Settings):
    if s.sex not in ("female", "male", "unspecified"):
        raise HTTPException(400, "sex: female, male or unspecified")
    lo, hi = sorted(s.stature_m)
    if not (1.0 <= lo <= hi <= 2.3):
        raise HTTPException(400, "stature in metres, between 1.0 and 2.3")
    return save_settings([lo, hi], s.sex)


def _first_point(legs: list[dict]):
    for l in legs:
        c = l.get("coords") or []
        if c:
            return tuple(c[0])
    return None


@router.post("/estimate")
def post_estimate(req: EstimateIn):
    depart, arrive = _when(req.depart_at), _when(req.arrive_by)
    at = depart or arrive or datetime.now(timezone.utc)
    if isinstance(req.weather, WeatherIn):
        ctx = context(weather=Weather(**req.weather.model_dump(), source="given"))
    elif req.weather == "none":
        ctx = context(weather=Weather())
    else:
        ctx = context(at_point=_first_point(req.legs), at=at)
    try:
        return estimate(req.legs, ctx, depart_at=depart, arrive_by=arrive)
    except (KeyError, ValueError) as e:
        raise HTTPException(400, f"bad leg: {e}")


@router.get("/journeys")
def journeys(frm: str = Query("", alias="from"), to: str = "", departure: str | None = None,
             arrival: str | None = None, results: int = Query(4, ge=1, le=6)):
    from backend.trip import db
    if not frm or not to:
        raise HTTPException(400, "from and to required")
    try:
        raw = db.fetch_journeys(frm, to, departure=departure, arrival=arrival, results=results)
    except Exception as e:
        raise HTTPException(502, f"DB journeys unavailable: {type(e).__name__}")
    out = []
    for j in raw:
        legs = db.to_legs(j)
        if not legs:
            continue
        p = db.first_point(j)
        at = _when(departure) or _when(arrival) or datetime.now(timezone.utc)
        ctx = context(at_point=p, at=at)
        out.append(estimate(legs, ctx, arrive_by=_when(arrival)))
    out.sort(key=lambda e: e["arrival"][1])
    return {"journeys": out}
