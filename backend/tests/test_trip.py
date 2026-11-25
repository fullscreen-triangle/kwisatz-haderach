"""
Trip estimation: body-segment prior, conditions, walked edges, transfers, DB mapping, routes.
Run: python -m pytest backend/tests/test_trip.py
"""

import json
import math
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.trip import body, db
from backend.trip.bands import ONE, Band
from backend.trip.conditions import Weather, grade_band, grade_factor, weather_factors
from backend.trip.edges import EdgeCatalogue, path_length
from backend.trip.estimate import Context, estimate, walk
from backend.trip.conditions import Conditions

LAT0, LON0 = 54.09, 13.38
K = math.cos(math.radians(LAT0)) * 111_320.0


def ll(x, y):
    """(lon, lat) of a point x m east, y m north of the origin."""
    return (LON0 + x / K, LAT0 + y / 111_320.0)


def catalogue(tmp_path, factor_a=(0.78, 0.82, 0.8), status_a="measured"):
    """Edge 10 along y=0 from x=0..500, edge 20 along x=500 from y=0..300."""
    edges = [
        {"osm_way": 10, "status": status_a, "traversals": 5,
         "factor": list(factor_a[:2]), "factor_median": factor_a[2],
         "coords": [[list(ll(x, 0)) for x in range(0, 501, 50)]]},
        {"osm_way": 20, "status": "measured", "traversals": 4,
         "factor": [0.98, 1.02], "factor_median": 1.0,
         "coords": [[list(ll(500, y)) for y in range(0, 301, 50)]]},
    ]
    p = tmp_path / "walked-edges.json"
    p.write_text(json.dumps({"osm": {"name": "test.osm", "licence": "ODbL-1.0"}, "edges": edges}))
    return EdgeCatalogue.load(p)


def ctx(edges=None, weather=None):
    w = weather or Weather()
    return Context(speed=Band(1.4, 1.4), conditions=weather_factors(w), weather=w,
                   edges=edges, settings={})


# ── body ────────────────────────────────────────────────────────────────────────────────

def test_leg_fraction_from_de_leva_segments():
    m, f = body.leg_fraction("male"), body.leg_fraction("female")
    assert m.lo == pytest.approx((422.2 + 434.0) / 1741 + 0.039)
    assert f.lo == pytest.approx((368.5 + 432.3) / 1735 + 0.039)
    u = body.leg_fraction("unspecified")
    assert u.lo == pytest.approx(f.lo) and u.hi == pytest.approx(m.hi)


def test_walking_speed_band_is_plausible_and_scales_with_stature():
    v = body.walking_speed(Band(1.80, 1.80), "male")
    assert 1.3 < v.lo < v.hi < 1.8
    # √L scaling: 4 % taller → 2 % faster.
    v2 = body.walking_speed(Band(1.80 * 1.04, 1.80 * 1.04), "male")
    assert v2.lo / v.lo == pytest.approx(math.sqrt(1.04))


# ── bands and conditions ────────────────────────────────────────────────────────────────

def test_band_arithmetic():
    assert (Band(1, 2) + Band(3, 4)) == Band(4, 6)
    assert (Band(1, 2) * Band(2, 3)) == Band(2, 6)
    assert Band(1.0, 2.0).divided_into(100) == Band(50, 100)
    assert Band(3, 1) == Band(1, 3)


def test_tobler_shape():
    assert grade_factor(0.0) == pytest.approx(1.0)
    assert grade_factor(0.10) < 1.0
    assert grade_factor(-0.05) == pytest.approx(max(grade_factor(s / 100) for s in range(-30, 30)))
    assert grade_band(0, 0, 1000) == ONE
    b = grade_band(50, 0, 1000)
    assert b.hi < 1.0 and b.lo < b.hi


def test_weather_factors_are_assumed_bands():
    c = weather_factors(Weather(code=63, temp_c=-1.0))
    assert [f.name for f in c.factors] == ["ice"]
    assert all(f.basis == "assumed" for f in c.factors)
    c = weather_factors(Weather(code=0, temp_c=12, wind_mps=3, is_day=False))
    assert [f.name for f in c.factors] == ["dark"]
    assert weather_factors(Weather()).band == ONE


# ── walked edges ────────────────────────────────────────────────────────────────────────

def test_cover_assigns_length_to_walked_edges(tmp_path):
    cat = catalogue(tmp_path)
    line = [ll(0, 3), ll(500, 3), ll(500, 300)]
    cov = cat.cover(line)
    on = {cat.edges[i].way: L for i, L in cov["on"].items()}
    assert on[10] == pytest.approx(500, abs=30)
    assert on[20] == pytest.approx(300, abs=30)
    assert cov["off"] < 20


def test_off_network_path_is_off(tmp_path):
    cat = catalogue(tmp_path)
    cov = cat.cover([ll(0, 400), ll(400, 400)])
    assert cov["on"] == {} and cov["off"] == pytest.approx(400, rel=0.01)


def test_edge_factor_slows_the_walk_on_that_way(tmp_path):
    cat = catalogue(tmp_path)
    line = [ll(0, 0), ll(250, 0), ll(500, 0)]
    with_edges = walk({"coords": line}, ctx(cat))
    without = walk({"coords": line}, ctx(None))
    assert with_edges["basis"] == "model+edges" and without["basis"] == "model"
    # Factor 0.8 on the whole path: 25 % longer.
    assert with_edges["minutes"][1] == pytest.approx(without["minutes"][1] / 0.78, rel=0.03)


def test_sparse_edge_factor_spans_to_one(tmp_path):
    cat = catalogue(tmp_path, factor_a=(0.8, 0.8, 0.8), status_a="sparse")
    f = next(e for e in cat.edges if e.way == 10).factor
    assert f == Band(0.8, 1.0)


def test_route_over_walked_ways_is_verified(tmp_path):
    cat = catalogue(tmp_path)
    leg = walk({"coords": [ll(5, -20), ll(495, 290)]}, ctx(cat))
    assert leg["verified_route"] is True
    assert leg["distance_m"][0] == pytest.approx(800, abs=60)
    # Ends far from the walked network: no route, straight line with a detour band.
    leg = walk({"coords": [ll(0, 2000), ll(800, 2000)]}, ctx(cat))
    assert leg["verified_route"] is False
    assert leg["distance_m"] == pytest.approx([960, 1200], abs=2)


# ── estimates and transfers ─────────────────────────────────────────────────────────────

T0 = datetime(2026, 11, 24, 7, 0, tzinfo=timezone.utc)


def transit(dep_min, arr_min, delay_s=None, line="RE 3"):
    return {"kind": "transit", "line": line,
            "planned_departure": (T0 + timedelta(minutes=dep_min)).isoformat(),
            "planned_arrival": (T0 + timedelta(minutes=arr_min)).isoformat(),
            "departure_delay_s": delay_s, "arrival_delay_s": delay_s}


def test_walk_only_with_arrive_by():
    r = estimate([{"distance_m": 1400}], ctx(), arrive_by=T0)
    # 1400 m at 1.4 m/s = 1000 s.
    assert r["leave_by"] == (T0 - timedelta(seconds=1000)).isoformat()
    assert r["on_time"] == "yes"


def test_leave_by_catches_the_first_train():
    r = estimate([{"distance_m": 840}, transit(30, 60, delay_s=0)], ctx())
    assert r["leave_by"] == (T0 + timedelta(minutes=30) - timedelta(seconds=600)).isoformat()
    assert r["transfers"][0]["state"] == "safe"


def test_transfer_states():
    # Arrive 07:30–07:32 (live), walk 420 m = 5 min → ready 07:35–07:37.
    legs = [transit(0, 30, 0), {"distance_m": 420}, transit(38, 80, 0, "S 1")]
    assert estimate(legs, ctx())["transfers"][1]["state"] == "safe"          # 07:38–07:40
    legs = [transit(0, 30, 0), {"distance_m": 420}, transit(36, 80, 0, "S 1")]
    assert estimate(legs, ctx())["transfers"][1]["state"] == "at risk"       # 07:36–07:38
    # Next train 07:36 but a 840 m walk (10 min) → ready 07:40–07:42 → missed.
    legs = [transit(0, 30, 0), {"distance_m": 840}, transit(36, 80, 0, "S 1")]
    assert estimate(legs, ctx())["transfers"][1]["state"] == "missed"
    # 7 min walk, train 07:37 with no live data (07:37–07:42) → at risk.
    legs = [transit(0, 30, 0), {"distance_m": 588}, transit(37, 80, None, "S 1")]
    assert estimate(legs, ctx())["transfers"][1]["state"] == "at risk"


def test_db_journey_keeps_walking_legs():
    j = {"legs": [
        {"walking": True, "distance": 650,
         "origin": {"type": "location", "latitude": 54.08, "longitude": 13.37},
         "destination": {"type": "stop", "name": "Greifswald",
                         "location": {"latitude": 54.0927, "longitude": 13.3730}},
         "plannedDeparture": "2026-11-24T07:50:00+01:00", "plannedArrival": "2026-11-24T07:58:00+01:00"},
        {"line": {"name": "RE 3"}, "origin": {"name": "Greifswald"}, "destination": {"name": "Stralsund Hbf"},
         "plannedDeparture": "2026-11-24T08:04:00+01:00", "plannedArrival": "2026-11-24T08:24:00+01:00",
         "departureDelay": 120, "arrivalDelay": 60},
    ]}
    legs = db.to_legs(j)
    assert legs[0] == {"kind": "walk", "planned_minutes": 8.0, "distance_m": 650,
                       "coords": [(13.37, 54.08), (13.373, 54.0927)]}
    assert legs[1]["departure_delay_s"] == 120 and legs[1]["line"] == "RE 3"
    r = estimate(legs, ctx())
    assert r["legs"][0]["planned_minutes"] == 8.0
    assert r["transfers"][0]["state"] in ("safe", "at risk", "missed")


def test_place_accepts_station_or_point():
    assert db._place("from", "8010139") == {"from": "8010139"}
    assert db._place("to", "54.09, 13.38") == {"to.latitude": "54.09", "to.longitude": "13.38",
                                                "to.address": "point"}


# ── routes ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENT_SMITH_STATE", str(tmp_path))
    monkeypatch.delenv("TRIP_EDGES", raising=False)
    from backend.routes import trip
    app = FastAPI()
    app.include_router(trip.router, prefix="/trip")
    return TestClient(app)


def test_model_route_defaults_are_assumed(client):
    r = client.get("/trip/model").json()
    assert r["settings"]["basis"] == "assumed"
    assert r["walked_edges"] is None
    lo, hi = r["walking_speed_mps"]
    assert 1.2 < lo < hi < 1.9


def test_settings_then_estimate(client):
    s = client.put("/trip/settings", json={"stature_m": [1.83, 1.85], "sex": "male"}).json()
    assert s["basis"] == "stated"
    r = client.post("/trip/estimate", json={"legs": [{"distance_m": 1000}], "weather": "none",
                                            "depart_at": "2026-11-24T08:00:00+01:00"}).json()
    lo, hi = r["legs"][0]["minutes"]
    assert 9 < lo < hi < 13
    assert client.put("/trip/settings", json={"stature_m": [0.4, 0.5]}).status_code == 400
    assert client.post("/trip/estimate", json={"legs": [{"kind": "walk"}], "weather": "none"}).status_code == 400
