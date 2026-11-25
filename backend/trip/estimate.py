"""
Trip estimates as bands: walking legs from the body-segment prior, conditions and the
walked-edges catalogue; transit legs from the timetable and live delays; transfers judged
by whether the bands overlap.

A leg reports its `basis`: `model` (prior only), `model+edges` (part of it on ways this
person has walked, whose factors replaced the prior there), and for a route found over
walked ways only, `verified_route: true`.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.trip import body
from backend.trip.bands import Band
from backend.trip.conditions import Conditions, Weather, forecast, grade_band, weather_factors
from backend.trip.edges import EdgeCatalogue, path_length

DEFAULT_SETTINGS = {"stature_m": [1.70, 1.90], "sex": "unspecified"}
# Transit spreads, minutes: with a live delay the train is near it; without, it may be late.
SPREAD_LIVE = Band(0.0, 2.0)
SPREAD_NONE = Band(0.0, 5.0)
STRAIGHT_DETOUR = Band(1.2, 1.5)   # street distance over straight line, when only ends are known


def state_dir() -> Path:
    raw = os.getenv("AGENT_SMITH_STATE")
    return Path(raw) if raw else Path.home() / ".agent-smith"


def settings_path() -> Path:
    return state_dir() / "trip" / "settings.json"


def load_settings() -> dict:
    try:
        s = json.loads(settings_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        s = {}
    out = {**DEFAULT_SETTINGS, **{k: s[k] for k in DEFAULT_SETTINGS if k in s}}
    out["basis"] = "stated" if "stature_m" in s else "assumed"
    return out


def save_settings(stature_m: list[float], sex: str) -> dict:
    p = settings_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"stature_m": stature_m, "sex": sex}), encoding="utf-8")
    return load_settings()


_EDGES: tuple[float, EdgeCatalogue | None] | None = None


def edges_path() -> Path:
    raw = os.getenv("TRIP_EDGES")
    return Path(raw) if raw else state_dir() / "edges" / "walked-edges.json"


def load_edges() -> EdgeCatalogue | None:
    global _EDGES
    p = edges_path()
    try:
        m = p.stat().st_mtime
    except OSError:
        return None
    if _EDGES is None or _EDGES[0] != m:
        _EDGES = (m, EdgeCatalogue.load(p))
    return _EDGES[1]


@dataclass
class Context:
    speed: Band                      # level walking speed, m/s
    conditions: Conditions
    weather: Weather
    edges: EdgeCatalogue | None
    settings: dict


def context(weather: Weather | None = None, at_point: tuple[float, float] | None = None,
            at: datetime | None = None, edges: EdgeCatalogue | None | bool = True) -> Context:
    s = load_settings()
    speed = body.walking_speed(Band(*s["stature_m"]), s["sex"])
    if weather is None and at_point is not None:
        weather = forecast(at_point[1], at_point[0], at or datetime.now(timezone.utc))
    weather = weather or Weather()
    cat = load_edges() if edges is True else (edges or None)
    return Context(speed, weather_factors(weather), weather, cat, s)


def _minutes(b: Band) -> list[float]:
    return [round(b.lo / 60, 1), round(b.hi / 60, 1)]


def walk(leg: dict, ctx: Context) -> dict:
    """A walking leg: `coords` ([lon, lat] path), or `from`/`to` points, or `distance_m`."""
    coords = [tuple(p) for p in leg.get("coords") or []]
    verified = False
    if len(coords) == 2 and ctx.edges is not None:
        r = ctx.edges.route(coords[0], coords[1])
        if r is not None and path_length(r) <= 1.6 * path_length(coords) + 200:
            coords, verified = r, True
    speed = ctx.speed * ctx.conditions.band
    climb, descent = float(leg.get("climb_m") or 0), float(leg.get("descent_m") or 0)
    if len(coords) >= 2 and (verified or len(coords) > 2):
        dist = path_length(coords)
        grade = grade_band(climb, descent, dist)
        v = speed * grade
        on_m, used, t = 0.0, 0, Band(0.0, 0.0)
        if ctx.edges is not None:
            cov = ctx.edges.cover(coords)
            for i, L in cov["on"].items():
                t = t + (v * ctx.edges.edges[i].factor).divided_into(L)
                on_m += L
                used += 1
            t = t + v.divided_into(cov["off"])
        else:
            t = v.divided_into(dist)
        dist_band = Band(dist, dist)
    else:
        if leg.get("distance_m") is not None:
            dist_band = Band(float(leg["distance_m"]), float(leg["distance_m"]))
        elif len(coords) == 2:
            dist_band = STRAIGHT_DETOUR * path_length(coords)
        else:
            raise ValueError("walking leg needs coords or distance_m")
        grade = grade_band(climb, descent, dist_band.mid)
        v = speed * grade
        t = Band(dist_band.lo / v.hi, dist_band.hi / v.lo)
        on_m, used = 0.0, 0
    out = {
        "kind": "walk",
        "distance_m": dist_band.json(0),
        "minutes": _minutes(t),
        "basis": "model+edges" if used else "model",
        "on_walked_m": round(on_m),
        "walked_edges": used,
        "verified_route": verified,
        "_seconds": t,
    }
    if leg.get("planned_minutes") is not None:
        out["planned_minutes"] = leg["planned_minutes"]
    return out


def _at(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def transit(leg: dict) -> dict:
    dep, arr = _at(leg["planned_departure"]), _at(leg["planned_arrival"])
    dd, ad = leg.get("departure_delay_s"), leg.get("arrival_delay_s")
    dep_spread = SPREAD_LIVE if dd is not None else SPREAD_NONE
    arr_spread = SPREAD_LIVE if ad is not None else SPREAD_NONE
    dep0 = dep + timedelta(seconds=dd or 0)
    arr0 = arr + timedelta(seconds=ad or 0)
    return {
        "kind": "transit",
        "line": leg.get("line"),
        "from": leg.get("from"),
        "to": leg.get("to"),
        "departure": [dep0.isoformat(), (dep0 + timedelta(minutes=dep_spread.hi)).isoformat()],
        "arrival": [arr0.isoformat(), (arr0 + timedelta(minutes=arr_spread.hi)).isoformat()],
        "live": dd is not None or ad is not None,
        "_dep": (dep0, dep0 + timedelta(minutes=dep_spread.hi)),
        "_arr": (arr0, arr0 + timedelta(minutes=arr_spread.hi)),
    }


def estimate(legs: list[dict], ctx: Context, depart_at: datetime | None = None,
             arrive_by: datetime | None = None) -> dict:
    """Chains the legs. Transit legs fix the clock; walks between them are judged as
    transfers (`safe`: the late end of the walk still beats the earliest departure;
    `at risk`: the bands overlap; `missed`: even the early end is too late)."""
    out = [walk(l, ctx) if l.get("kind", "walk") == "walk" else transit(l) for l in legs]
    first_transit = next((i for i, l in enumerate(out) if l["kind"] == "transit"), None)

    walk_before = Band(0.0, 0.0)
    for l in out[: first_transit if first_transit is not None else len(out)]:
        walk_before = walk_before + l["_seconds"]

    if first_transit is not None:
        dep_lo = out[first_transit]["_dep"][0]
        leave_by = dep_lo - timedelta(seconds=walk_before.hi)
        start = depart_at or leave_by
        clock = (start, start)
    else:
        if arrive_by is not None:
            leave_by = arrive_by - timedelta(seconds=walk_before.hi)
            start = depart_at or leave_by
        else:
            start = depart_at or datetime.now(timezone.utc)
            leave_by = None
        clock = (start, start)

    transfers = []
    pending = Band(0.0, 0.0)
    for l in out:
        if l["kind"] == "walk":
            pending = pending + l["_seconds"]
            continue
        ready = (clock[0] + timedelta(seconds=pending.lo), clock[1] + timedelta(seconds=pending.hi))
        dep = l["_dep"]
        if ready[1] <= dep[0]:
            state = "safe"
        elif ready[0] <= dep[1]:
            state = "at risk"
        else:
            state = "missed"
        transfers.append({"to": l.get("line"), "state": state,
                          "slack_min": [round((dep[0] - ready[1]).total_seconds() / 60, 1),
                                        round((dep[1] - ready[0]).total_seconds() / 60, 1)]})
        clock = l["_arr"]
        pending = Band(0.0, 0.0)
    arrival = (clock[0] + timedelta(seconds=pending.lo), clock[1] + timedelta(seconds=pending.hi))

    for l in out:
        for k in ("_seconds", "_dep", "_arr"):
            l.pop(k, None)
    result = {
        "legs": out,
        "transfers": transfers,
        "start": start.isoformat(),
        "arrival": [arrival[0].isoformat(), arrival[1].isoformat()],
        "leave_by": leave_by.isoformat() if leave_by else None,
        "walking_speed_mps": (ctx.speed * ctx.conditions.band).json(),
        "conditions": ctx.conditions.json(),
        "weather": {"code": ctx.weather.code, "temp_c": ctx.weather.temp_c,
                    "wind_mps": ctx.weather.wind_mps, "is_day": ctx.weather.is_day,
                    "source": ctx.weather.source},
    }
    if arrive_by is not None:
        late = (arrival[1] - arrive_by).total_seconds() / 60
        result["arrive_by"] = arrive_by.isoformat()
        result["on_time"] = "yes" if late <= 0 else ("maybe" if arrival[0] <= arrive_by else "no")
    return result
