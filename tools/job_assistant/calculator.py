"""German net salary and cost-of-living calculations.

Tax model: 2024/2025 German income tax, Steuerklasse I (single, no church tax).
Social contributions: standard employee-side rates for 2024.

All figures are approximations — not a Steuerberater's output.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


# ── social contribution rates (employee side, 2024) ───────────────────────────
_KV_RATE = 0.073 + 0.0085     # statutory KV 7.3% + half of avg Zusatzbeitrag
_PV_RATE = 0.0195             # Pflegeversicherung (childless surcharge included)
_RV_RATE = 0.093              # Rentenversicherung
_AV_RATE = 0.013              # Arbeitslosenversicherung

# Contribution assessment ceilings (Beitragsbemessungsgrenzen) 2024
_KV_PV_CEILING = 62_100       # annual
_RV_AV_CEILING = 90_600       # annual (West Germany)


def social_contributions(gross: float) -> float:
    kv_pv_base = min(gross, _KV_PV_CEILING)
    rv_av_base = min(gross, _RV_AV_CEILING)
    kv = kv_pv_base * _KV_RATE
    pv = kv_pv_base * _PV_RATE
    rv = rv_av_base * _RV_RATE
    av = rv_av_base * _AV_RATE
    return kv + pv + rv + av


def income_tax(gross: float, werbungskosten: float = 1_230) -> float:
    """2024/2025 German income tax formula (Steuerklasse I, no Soli for most earners)."""
    zve = max(0.0, gross - werbungskosten)

    if zve <= 11_784:
        tax = 0.0
    elif zve <= 17_005:
        y = (zve - 11_784) / 10_000
        tax = (979.18 * y + 1_400) * y
    elif zve <= 66_760:
        y = (zve - 17_005) / 10_000
        tax = (192.59 * y + 2_397) * y + 966.53
    elif zve <= 277_825:
        tax = 0.42 * zve - 9_972.98
    else:
        tax = 0.45 * zve - 18_307.73

    # Solidaritätszuschlag: effectively abolished for Steuerklasse I below ~96k gross
    if tax > 18_130:
        soli = (tax - 18_130) * 0.055
        tax += soli

    return max(0.0, tax)


def net_salary(gross: float) -> float:
    return gross - social_contributions(gross) - income_tax(gross)


# ── city rent data (2024 market, 1BR / 1-Zimmer warm) ────────────────────────
# Ranges are (low, mid, high) Kaltmiete + typical Nebenkosten ~€200-300.
# "mid" is used for calculations; user sees full range.

_CITY_DATA: dict[str, dict] = {
    "Munich":     {"de": "München",    "low": 1_600, "mid": 2_000, "high": 2_600, "quality": "high"},
    "Berlin":     {"de": "Berlin",     "low": 1_100, "mid": 1_450, "high": 1_900, "quality": "high"},
    "Hamburg":    {"de": "Hamburg",    "low": 1_200, "mid": 1_550, "high": 2_000, "quality": "high"},
    "Frankfurt":  {"de": "Frankfurt",  "low": 1_300, "mid": 1_650, "high": 2_100, "quality": "high"},
    "Stuttgart":  {"de": "Stuttgart",  "low": 1_100, "mid": 1_400, "high": 1_800, "quality": "medium"},
    "Cologne":    {"de": "Köln",       "low":   900, "mid": 1_200, "high": 1_600, "quality": "medium"},
    "Düsseldorf": {"de": "Düsseldorf", "low": 1_000, "mid": 1_300, "high": 1_700, "quality": "medium"},
    "Nuremberg":  {"de": "Nürnberg",   "low":   800, "mid": 1_050, "high": 1_400, "quality": "medium"},
    "Leipzig":    {"de": "Leipzig",    "low":   650, "mid":   850, "high": 1_150, "quality": "medium"},
    "Dresden":    {"de": "Dresden",    "low":   650, "mid":   800, "high": 1_100, "quality": "medium"},
    "Remote-DE":  {"de": "Remote (DE)","low":   650, "mid":   900, "high": 1_500, "quality": "varies — choose your city"},
    # DACH neighbours
    "Zurich":     {"de": "Zürich",     "low": 2_200, "mid": 2_800, "high": 3_600, "quality": "very high", "currency": "CHF"},
    "Vienna":     {"de": "Wien",       "low":   900, "mid": 1_200, "high": 1_600, "quality": "high", "currency": "EUR"},
    "Bern":       {"de": "Bern",       "low": 1_600, "mid": 2_000, "high": 2_600, "quality": "very high", "currency": "CHF"},
}

# Misc monthly living costs beyond rent (food, transport, misc) — rough estimates
_OTHER_EXPENSES: dict[str, int] = {
    "Munich": 1_200, "Berlin": 950, "Hamburg": 1_000, "Frankfurt": 1_050,
    "Stuttgart": 950, "Cologne": 900, "Düsseldorf": 920, "Nuremberg": 850,
    "Leipzig": 750, "Dresden": 750, "Remote-DE": 850,
    "Zurich": 1_800, "Vienna": 900, "Bern": 1_600,
}


@dataclass
class SalaryBreakdown:
    gross_annual: float
    social_contributions: float
    income_tax: float
    net_annual: float
    net_monthly: float

    def display_lines(self) -> list[str]:
        return [
            f"  Gross:                 €{self.gross_annual:>10,.0f} / year  "
            f"(€{self.gross_annual/12:,.0f}/mo)",
            f"  Social contributions:  €{self.social_contributions:>10,.0f} / year"
            f"  (KV+PV+RV+AV, employee side)",
            f"  Income tax:            €{self.income_tax:>10,.0f} / year"
            f"  (Steuerklasse I, no church tax)",
            f"  ─────────────────────────────────────────────────",
            f"  Net income:            €{self.net_annual:>10,.0f} / year  "
            f"(€{self.net_monthly:,.0f}/mo)",
        ]


@dataclass
class CityReport:
    city: str
    rent_low: int
    rent_mid: int
    rent_high: int
    other_expenses: int
    net_monthly: float
    quality: str
    currency: str = "EUR"

    @property
    def disposable_mid(self) -> float:
        return self.net_monthly - self.rent_mid - self.other_expenses

    @property
    def comfort_label(self) -> str:
        d = self.disposable_mid
        if d > 1_200:
            return "comfortable"
        if d > 600:
            return "manageable"
        if d > 0:
            return "tight"
        return "deficit"

    @property
    def comfort_icon(self) -> str:
        return {"comfortable": "✅", "manageable": "🟡", "tight": "⚠️ ", "deficit": "🔴"}[self.comfort_label]


def analyse_city(city: str, net_monthly: float) -> Optional[CityReport]:
    data = _CITY_DATA.get(city)
    if data is None:
        return None
    return CityReport(
        city=city,
        rent_low=data["low"],
        rent_mid=data["mid"],
        rent_high=data["high"],
        other_expenses=_OTHER_EXPENSES.get(city, 900),
        net_monthly=net_monthly,
        quality=data["quality"],
        currency=data.get("currency", "EUR"),
    )


def full_breakdown(gross_annual: float) -> tuple[SalaryBreakdown, list[CityReport]]:
    sc = social_contributions(gross_annual)
    it = income_tax(gross_annual)
    net_ann = gross_annual - sc - it
    net_mon = net_ann / 12

    breakdown = SalaryBreakdown(
        gross_annual=gross_annual,
        social_contributions=sc,
        income_tax=it,
        net_annual=net_ann,
        net_monthly=net_mon,
    )

    cities = ["Munich", "Berlin", "Hamburg", "Frankfurt", "Leipzig", "Remote-DE"]
    city_reports = [r for c in cities if (r := analyse_city(c, net_mon)) is not None]

    return breakdown, city_reports


def estimate_gross_from_text(text: str) -> Optional[float]:
    """Return mid-point of parsed salary range, or a market estimate for senior dev roles."""
    import re
    nums = re.findall(r"\b(\d{2,3})[kK]\b|\b(\d{2,3}[.,]\d{3})\b", text)
    values = []
    for k, full in nums:
        if k:
            values.append(int(k) * 1_000)
        elif full:
            try:
                values.append(int(full.replace(",", "").replace(".", "")))
            except ValueError:
                pass
    valid = [v for v in values if 25_000 < v < 200_000]
    if len(valid) >= 2:
        return sum(sorted(valid)[:2]) / 2
    if valid:
        return float(valid[0])
    return None   # caller will use a market default


MARKET_DEFAULT_GROSS = 75_000   # reasonable senior dev rate Germany 2024
