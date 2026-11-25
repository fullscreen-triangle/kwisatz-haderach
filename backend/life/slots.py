"""
The facts about Kundai the desk keeps current from mail: one slot per fact, grouped by topic.
A slot is a node of the facts structure (forms/memory/facts, record "me"), so the forms read
the same facts the documents page shows.

kind: "date" values are ISO (YYYY-MM-DD) and witnessed by a date in the quote in any common
form; "text" values must appear in the quote.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class Slot:
    id: str
    topic: str
    label: str
    kind: str          # "date" | "text"
    hint: str          # what counts, for the model


SLOTS: List[Slot] = [
    Slot("passport_number", "passport", "Passport number", "text", "number of his CURRENT passport"),
    Slot("passport_issued_on", "passport", "Passport issued on", "date", "issue date of his current passport"),
    Slot("passport_received_on", "passport", "Passport received on", "date", "the day he received his current passport"),
    Slot("passport_valid_until", "passport", "Passport valid until", "date", "expiry date of his CURRENT passport (not a former one)"),
    Slot("residence_document", "residence", "Current residence document", "text",
         "the residence document he HOLDS now, e.g. Fiktionsbescheinigung, Aufenthaltserlaubnis, Blaue Karte EU, Niederlassungserlaubnis"),
    Slot("residence_valid_until", "residence", "Residence document valid until", "date", "expiry of the residence document he holds now"),
    Slot("residence_applied_for", "residence", "Residence title applied for", "text", "the title he has applied for and is waiting on"),
    Slot("residence_applied_on", "residence", "Residence application date", "date", "when he applied for it"),
    Slot("residence_authority", "residence", "Responsible Ausländerbehörde", "text", "the immigration office now responsible for him"),
    Slot("residence_appointment", "residence", "Ausländerbehörde appointment", "date", "a booked appointment at the immigration office"),
    Slot("address_street", "address", "Street and number", "text", "his CURRENT home street and house number"),
    Slot("address_city", "address", "Postcode and city", "text", "postcode and city of his current home"),
    Slot("address_since", "address", "Living there since", "date", "since when he lives at the current address"),
    Slot("registered_on", "address", "Registered (Anmeldung) on", "date", "the day his address was registered at the Bürgeramt/Einwohnermeldeamt"),
    Slot("employer", "employment", "Employer", "text", "his current employer"),
    Slot("employment_unit", "employment", "Institute / department", "text", "his institute or department"),
    Slot("employment_start", "employment", "Employed since", "date", "start date of his current employment"),
    Slot("employment_end", "employment", "Contract ends", "date", "end date of his fixed-term contract"),
    Slot("pay_grade", "employment", "Pay grade", "text", "his pay grade, e.g. TV-L E13"),
    Slot("date_of_birth", "person", "Date of birth", "date", "his date of birth"),
    Slot("nationality", "person", "Nationality", "text", "his nationality"),
]

BY_ID: Dict[str, Slot] = {s.id: s for s in SLOTS}
TOPICS = ("passport", "residence", "address", "employment", "person")
