"""
Conditions that move walking speed away from the level, good-weather prior.

Grade uses Tobler's hiking function (Tobler 1993), W = 6 exp(−3.5 |S + 0.05|) km/h,
taken relative to level ground so that only its shape is used, not its 5 km/h.

Weather factors are ASSUMED bands, not measurements: they widen the estimate where the
person has no recordings in those conditions. Each factor says so in its `basis`, and
walked edges (measured) replace the prior where they exist.

    Tobler W. (1993) Three presentations on geographical analysis and modeling.
        NCGIA Technical Report 93-1.
"""

from __future__ import annotations

import json
import math
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone

from backend.trip.bands import ONE, Band


def grade_factor(slope: float) -> float:
    """Tobler speed at `slope` (rise over run) relative to level ground."""
    return math.exp(-3.5 * (abs(slope + 0.05) - 0.05))


def grade_band(climb_m: float, descent_m: float, distance_m: float) -> Band:
    """Over a leg of known total climb and descent: the climbing part at the climbing
    slope, the rest at the descending slope, as a time-weighted factor. Without the
    profile's distribution the band spans spreading the climb evenly and concentrating it."""
    if distance_m <= 0 or (climb_m <= 0 and descent_m <= 0):
        return ONE
    up, down = max(climb_m, 0.0), max(descent_m, 0.0)
    d_up = distance_m * up / (up + down)
    d_down = distance_m - d_up

    def factor(segments: list[tuple[float, float]]) -> float:
        t = sum(d / grade_factor(s) for d, s in segments if d > 0)
        return distance_m / t

    # Even: the climb spread over the up-part, the descent over the down-part.
    even = factor([(d_up, up / d_up if d_up else 0.0),
                   (d_down, -down / d_down if d_down else 0.0)])
    # Concentrated: each over a quarter of its part at four times the slope, the rest level.
    steep = factor([(d_up / 4, 4 * up / d_up if d_up else 0.0), (3 * d_up / 4, 0.0),
                    (d_down / 4, -4 * down / d_down if d_down else 0.0), (3 * d_down / 4, 0.0)])
    return Band(min(even, steep), max(even, steep))


@dataclass
class Weather:
    code: int | None = None          # WMO weather code
    temp_c: float | None = None
    wind_mps: float | None = None
    is_day: bool | None = None
    source: str = "none"


@dataclass
class Factor:
    name: str
    band: Band
    basis: str = "assumed"


@dataclass
class Conditions:
    factors: list[Factor] = field(default_factory=list)

    @property
    def band(self) -> Band:
        b = ONE
        for f in self.factors:
            b = b * f.band
        return b

    def json(self) -> list[dict]:
        return [{"name": f.name, "factor": f.band.json(), "basis": f.basis} for f in self.factors]


RAIN = {51, 53, 55, 61, 63, 65, 80, 81, 82}
FREEZING = {56, 57, 66, 67}
SNOW = {71, 73, 75, 77, 85, 86}
STORM = {95, 96, 99}


def weather_factors(w: Weather) -> Conditions:
    c = Conditions()
    code = w.code
    if code in FREEZING or (code in RAIN and w.temp_c is not None and w.temp_c <= 0.5):
        c.factors.append(Factor("ice", Band(0.60, 0.90)))
    elif code in SNOW:
        c.factors.append(Factor("snow", Band(0.75, 0.95)))
    elif code in STORM:
        c.factors.append(Factor("thunderstorm", Band(0.85, 1.05)))
    elif code in RAIN:
        c.factors.append(Factor("rain", Band(0.93, 1.05)))
    if w.wind_mps is not None and w.wind_mps >= 10:
        c.factors.append(Factor("strong wind", Band(0.88, 1.0)))
    if w.temp_c is not None and w.temp_c >= 30:
        c.factors.append(Factor("heat", Band(0.88, 1.0)))
    if w.is_day is False:
        c.factors.append(Factor("dark", Band(0.95, 1.0)))
    return c


_CACHE: dict[tuple, tuple[float, dict]] = {}
_TTL = 1800.0


def forecast(lat: float, lon: float, at: datetime, timeout: float = 8.0) -> Weather:
    """Open-Meteo hourly forecast for the hour of `at`. Coordinates are rounded to 0.1°
    (about 10 km): enough for weather, too coarse to place a person."""
    la, lo = round(lat, 1), round(lon, 1)
    key = (la, lo)
    now = time.time()
    data = _CACHE.get(key)
    if not data or now - data[0] > _TTL:
        q = urllib.parse.urlencode({
            "latitude": la, "longitude": lo, "timezone": "UTC", "forecast_days": 4,
            "wind_speed_unit": "ms",
            "hourly": "temperature_2m,weather_code,wind_speed_10m,is_day",
        })
        req = urllib.request.Request(f"https://api.open-meteo.com/v1/forecast?{q}",
                                     headers={"User-Agent": "agent-smith-trip/1"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = (now, json.loads(r.read()))
        except Exception:
            return Weather(source="unavailable")
        _CACHE[key] = data
    h = data[1].get("hourly") or {}
    times = h.get("time") or []
    if not times:
        return Weather(source="unavailable")
    at_utc = at.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
    stamp = at_utc.strftime("%Y-%m-%dT%H:%M")
    i = times.index(stamp) if stamp in times else None
    if i is None:
        return Weather(source="outside forecast")
    pick = lambda k: (h.get(k) or [None] * len(times))[i]
    day = pick("is_day")
    return Weather(code=pick("weather_code"), temp_c=pick("temperature_2m"),
                   wind_mps=pick("wind_speed_10m"), is_day=None if day is None else bool(day),
                   source="open-meteo")
