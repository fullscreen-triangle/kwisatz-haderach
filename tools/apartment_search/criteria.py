"""
Search criteria and budget model for the Greifswald apartment search.

Single source of truth for scoring and affordability. Edit this file as the
search narrows — everything else reads from it.
"""

from __future__ import annotations

# ── Budget ───────────────────────────────────────────────────────────────────
# Warmmiete ceiling is the number that actually decides whether a flat is takeable.
BUDGET: dict = {
    "warm_max": 750.0,        # hard ceiling, EUR/month, all-in
    "warm_comfortable": 620.0,  # below this = comfortable
    "kaution_max": 2400.0,    # up to 3 Kaltmieten is the legal max; this is cash on hand
    "genossenschaft_anteile_max": 1500.0,  # co-op share purchase, refundable on exit
}

# ── Flat requirements ────────────────────────────────────────────────────────
REQUIREMENTS: dict = {
    "rooms_min": 2.0,
    "size_min_sqm": 45.0,
    "size_ideal_sqm": 65.0,
    "wbs_required_is_blocker": True,   # no Wohnberechtigungsschein -> cannot apply
    "needs_kitchen": True,             # EBK fitted, or budget for one
}

# ── Greifswald geography ─────────────────────────────────────────────────────
# Commute anchor: the university / NFDI4Cat workplace.
WORKPLACE = {
    "name": "Universität Greifswald",
    "address": "Domstraße 11, 17489 Greifswald",
}

# Districts scored by how well they serve a cycle commute to the university.
# Greifswald is small and flat — nearly everything is cyclable; this ranks
# convenience, not feasibility.
DISTRICTS: dict = {
    "innenstadt":        {"bike_min": 5,  "score": 10, "note": "walkable to Uni, priciest"},
    "fleischervorstadt": {"bike_min": 7,  "score": 10, "note": "student quarter, well liked"},
    "steinbeckervorstadt": {"bike_min": 8, "score": 9, "note": "central, quieter"},
    "südstadt":          {"bike_min": 12, "score": 7,  "note": "Plattenbau, cheaper, good value"},
    "schönwalde":        {"bike_min": 15, "score": 6,  "note": "Schönwalde I/II, cheapest, WBS common"},
    "ostseeviertel":     {"bike_min": 14, "score": 6,  "note": "Ryckseite, quiet"},
    "eldena":            {"bike_min": 20, "score": 5,  "note": "near the beach, far from Uni"},
    "wieck":             {"bike_min": 22, "score": 4,  "note": "harbour village, scenic, far"},
    "riems":             {"bike_min": 30, "score": 2,  "note": "island, effectively car/bus only"},
}

# ── Where to look ────────────────────────────────────────────────────────────
# Greifswald's market is dominated by two big landlords and the co-ops; the
# portals carry the private remainder. Direct-landlord listings beat portals.
PORTALS: list = [
    {"name": "WVG Greifswald", "kind": "landlord",
     "url": "https://www.wvg-greifswald.de/wohnungsangebote",
     "note": "Municipal. Largest single stock in the city. Check first."},
    {"name": "WGG eG", "kind": "genossenschaft",
     "url": "https://www.wgg-greifswald.de",
     "note": "Co-op — requires buying Anteile, refundable when you leave."},
    {"name": "PWG 1903 eG", "kind": "genossenschaft",
     "url": "https://www.pwg1903.de",
     "note": "Co-op, older stock, central."},
    {"name": "ImmobilienScout24", "kind": "portal",
     "url": "https://www.immobilienscout24.de/Suche/de/mecklenburg-vorpommern/greifswald/wohnung-mieten",
     "note": "Largest portal; most private listings."},
    {"name": "Immowelt", "kind": "portal",
     "url": "https://www.immowelt.de/liste/greifswald/wohnungen/mieten",
     "note": "Second portal, partial overlap with IS24."},
    {"name": "WG-Gesucht", "kind": "portal",
     "url": "https://www.wg-gesucht.de/wohnungen-in-Greifswald.51.2.1.0.html",
     "note": "Shared flats and small flats; strong in a university town."},
    {"name": "Studentenwerk Greifswald", "kind": "landlord",
     "url": "https://www.stw-greifswald.de/wohnen/",
     "note": "Student housing — eligibility depends on enrolment status."},
]

# ── Bewerbermappe: the German landlord application packet ────────────────────
# What a Greifswald landlord will ask for at or right after the viewing.
DOSSIER_ITEMS: list = [
    {"id": "selbstauskunft",   "name": "Mieterselbstauskunft",
     "note": "Landlord's own form usually; a generic one works as a fallback.",
     "generatable": True},
    {"id": "schufa",           "name": "SCHUFA-BonitätsAuskunft",
     "note": "Order the 'BonitätsAuskunft' (the one for landlords), not the free Datenkopie. ~30 EUR, takes days — order EARLY.",
     "generatable": False},
    {"id": "einkommensnachweis", "name": "Einkommensnachweise (last 3)",
     "note": "Payslips, or the signed employment contract if the job has not started yet.",
     "generatable": False},
    {"id": "arbeitsvertrag",   "name": "Arbeitsvertrag / Zusage",
     "note": "For a not-yet-started position this substitutes for payslips.",
     "generatable": False},
    {"id": "mietschuldenfreiheit", "name": "Mietschuldenfreiheitsbescheinigung",
     "note": "From the current landlord. Ask early — they are slow.",
     "generatable": False},
    {"id": "ausweis",          "name": "Ausweis / Aufenthaltstitel (Kopie)",
     "note": "Passport plus residence permit.",
     "generatable": False},
    {"id": "anschreiben",      "name": "Anschreiben",
     "note": "Short cover note. Generated.",
     "generatable": True},
]
