"""
Bewerbermappe — the packet a German landlord expects at the viewing.

Tracks which items are in hand and generates the two writable ones
(Selbstauskunft cover sheet and Anschreiben). The rest are documents that must
be obtained; the tracker's job is to make the lead times visible early enough.
"""

from __future__ import annotations

from datetime import date

from .criteria import DOSSIER_ITEMS

# Items with real lead times — flagged so they get ordered before they block a viewing.
LEAD_TIMES_DAYS = {
    "schufa": 10,               # postal BonitätsAuskunft
    "mietschuldenfreiheit": 14, # depends on the current landlord answering
}


def dossier_status(held: dict) -> dict:
    """`held` maps item id -> {"have": bool, "note": str, "obtained": ISO date}."""
    items, missing, slow = [], [], []
    for spec in DOSSIER_ITEMS:
        state = held.get(spec["id"], {})
        have = bool(state.get("have"))
        row = {
            **spec,
            "have": have,
            "obtained": state.get("obtained"),
            "note_user": state.get("note", ""),
            "lead_time_days": LEAD_TIMES_DAYS.get(spec["id"]),
        }
        items.append(row)
        if not have:
            missing.append(row)
            if row["lead_time_days"]:
                slow.append(row)
    return {
        "items": items,
        "complete": not missing,
        "missing_count": len(missing),
        "order_now": slow,  # missing AND slow to obtain -> the real urgency
    }


def generate_anschreiben(listing: dict, applicant: dict) -> str:
    """Short German cover note. Plain text — pasted into a portal form or an email."""
    title = listing.get("title") or "Ihre Wohnungsanzeige"
    addr = listing.get("address") or listing.get("district") or "Greifswald"
    rooms = listing.get("rooms")
    sqm = listing.get("size_sqm")
    desc = []
    if rooms:
        desc.append(f"{rooms:g}-Zimmer-Wohnung")
    if sqm:
        desc.append(f"{sqm:g} m²")
    what = ", ".join(desc) if desc else "Wohnung"

    return f"""Betreff: Bewerbung um die {what} – {addr}

Sehr geehrte Damen und Herren,

mit großem Interesse habe ich Ihr Angebot „{title}" gelesen und bewerbe mich
hiermit um die Wohnung.

Ich bin {applicant.get('name', '')}, {applicant.get('role', '')}. Mein Einkommen
ist unbefristet gesichert, und ich verfüge über eine unbefristete
Aufenthaltserlaubnis für Deutschland. Rauchen und Haustiere sind für mich kein
Thema; die Wohnung würde ausschließlich von mir selbst bewohnt.

Alle üblichen Unterlagen – Mieterselbstauskunft, SCHUFA-BonitätsAuskunft,
Einkommensnachweise, Mietschuldenfreiheitsbescheinigung sowie eine Kopie meines
Ausweises und Aufenthaltstitels – halte ich vollständig bereit und bringe sie
gerne zum Besichtigungstermin mit.

Über eine Einladung zur Besichtigung würde ich mich sehr freuen.

Mit freundlichen Grüßen
{applicant.get('name', '')}
{applicant.get('phone', '')}
{applicant.get('email', '')}

Greifswald, den {date.today().strftime('%d.%m.%Y')}
"""
