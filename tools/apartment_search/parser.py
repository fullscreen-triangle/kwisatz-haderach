"""
Extract structured fields from a German rental listing.

Deliberately regex-based over the stripped page text: the portals change their
markup constantly but the *labels* ("Kaltmiete", "Nebenkosten", "Wohnfläche")
are stable German real-estate vocabulary. A field we cannot find comes back as
None so the caller can ask for it rather than invent it.
"""

from __future__ import annotations

import re
from typing import Optional

# German number: 1.234,56 -> 1234.56
_NUM = r"(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)"


def _to_float(raw: str) -> Optional[float]:
    if raw is None:
        return None
    try:
        return float(raw.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def _find_money(text: str, *labels: str) -> Optional[float]:
    """Find `<label> ... 123,45 €` or `123,45 € <label>`, first hit wins."""
    for label in labels:
        m = re.search(rf"{label}[^0-9\n]{{0,40}}{_NUM}\s*(?:€|EUR)", text, re.I)
        if m:
            return _to_float(m.group(1))
        m = re.search(rf"{_NUM}\s*(?:€|EUR)[^0-9\n]{{0,25}}{label}", text, re.I)
        if m:
            return _to_float(m.group(1))
    return None


def parse_listing(text: str) -> dict:
    """Return whatever we can read off the listing. Unknown fields are None."""
    out: dict = {}

    out["kaltmiete"] = _find_money(text, r"Kaltmiete", r"Nettokaltmiete", r"Grundmiete")
    out["nebenkosten"] = _find_money(text, r"Nebenkosten", r"Betriebskosten")
    out["heizkosten"] = _find_money(text, r"Heizkosten")
    out["warmmiete"] = _find_money(text, r"Warmmiete", r"Gesamtmiete", r"Bruttomiete")
    out["kaution"] = _find_money(text, r"Kaution", r"Mietsicherheit")
    out["genossenschaftsanteile"] = _find_money(text, r"Genossenschaftsanteile", r"Geschäftsanteile", r"Anteile")

    # Fall back to a plain "… € " near the top if no labelled Kaltmiete exists.
    if out["kaltmiete"] is None and out["warmmiete"] is None:
        m = re.search(rf"{_NUM}\s*(?:€|EUR)", text)
        if m:
            out["kaltmiete"] = _to_float(m.group(1))

    # Derive whichever of the two rents is missing.
    if out["warmmiete"] is None and out["kaltmiete"] is not None:
        extras = (out["nebenkosten"] or 0.0) + (out["heizkosten"] or 0.0)
        if extras:
            out["warmmiete"] = round(out["kaltmiete"] + extras, 2)
    if out["kaltmiete"] is None and out["warmmiete"] is not None:
        extras = (out["nebenkosten"] or 0.0) + (out["heizkosten"] or 0.0)
        if extras:
            out["kaltmiete"] = round(out["warmmiete"] - extras, 2)

    m = re.search(rf"{_NUM}\s*(?:m²|m2|qm|Quadratmeter)", text, re.I)
    if not m:
        m = re.search(rf"Wohnfl[äa]che[^0-9\n]{{0,30}}{_NUM}", text, re.I)
    out["size_sqm"] = _to_float(m.group(1)) if m else None

    m = re.search(rf"{_NUM}\s*(?:Zimmer|Zi\.)", text, re.I)
    if not m:
        m = re.search(rf"Zimmer(?:anzahl)?[^0-9\n]{{0,20}}{_NUM}", text, re.I)
    out["rooms"] = _to_float(m.group(1)) if m else None

    m = re.search(r"(\d{1,3})\.?\s*(?:OG|Obergeschoss)", text, re.I)
    out["floor"] = int(m.group(1)) if m else None

    m = re.search(r"(?:Baujahr)[^0-9\n]{0,20}(\d{4})", text, re.I)
    out["baujahr"] = int(m.group(1)) if m else None

    # 17489 / 17491 / 17493 are the Greifswald PLZ.
    m = re.search(r"\b(17489|17491|17493)\b", text)
    out["plz"] = m.group(1) if m else None

    out["wbs_required"] = bool(re.search(r"Wohnberechtigungsschein|\bWBS\b", text, re.I))
    out["has_ebk"] = bool(re.search(r"Einbauküche|\bEBK\b", text, re.I))
    out["has_balcony"] = bool(re.search(r"Balkon|Terrasse|Loggia", text, re.I))
    out["is_moebliert"] = bool(re.search(r"möbliert|moebliert", text, re.I))
    out["is_tausch"] = bool(re.search(r"Tauschwohnung|Wohnungstausch", text, re.I))
    out["is_befristet"] = bool(re.search(r"befristet|Zwischenmiete", text, re.I))

    out["district"] = _find_district(text)
    out["title"] = _find_title(text)
    return out


_DISTRICT_PATTERNS = {
    "innenstadt": r"Innenstadt|Altstadt|Stadtmitte|Domstra|Markt",
    "fleischervorstadt": r"Fleischervorstadt",
    "steinbeckervorstadt": r"Steinbeckervorstadt|Steinbecker",
    "südstadt": r"Südstadt|Suedstadt",
    "schönwalde": r"Schönwalde|Schoenwalde",
    "ostseeviertel": r"Ostseeviertel|Ryckseite",
    "eldena": r"Eldena",
    "wieck": r"Wieck",
    "riems": r"Riems",
}


def _find_district(text: str) -> Optional[str]:
    for key, pat in _DISTRICT_PATTERNS.items():
        if re.search(pat, text, re.I):
            return key
    return None


def _find_title(text: str) -> Optional[str]:
    for line in text.split("\n"):
        line = line.strip()
        if 15 <= len(line) <= 120 and re.search(r"Wohnung|Zimmer|Apartment|Whg", line, re.I):
            return line
    return None
