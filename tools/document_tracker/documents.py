"""Document type definitions and renewal requirements.

Hardcoded for:
  - Zimbabwean passport (renewable at Berlin embassy or Frankfurt consulate)
  - German Aufenthaltserlaubnis (renewable at local Ausländerbehörde)
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class Requirement:
    item: str
    note: str = ""


@dataclass
class DocumentType:
    type_id: str
    name: str
    lead_time_months: int      # start renewal this many months before expiry
    processing_weeks: int      # realistic processing time
    office_name: str
    office_address: str
    office_phone: str
    office_url: str
    requirements: list[Requirement]
    fee_eur: float
    warning_notes: str = ""


@dataclass
class DocumentRecord:
    type_id: str
    expiry_date: Optional[date] = None
    # active | in_progress | submitted | received | expired
    status: str = "active"
    renewal_started: Optional[date] = None
    submitted_date: Optional[date] = None
    received_date: Optional[date] = None
    notes: str = ""

    def days_until_expiry(self) -> Optional[int]:
        if self.expiry_date is None:
            return None
        return (self.expiry_date - date.today()).days

    def renewal_deadline(self, doc_type: DocumentType) -> Optional[date]:
        if self.expiry_date is None:
            return None
        return _subtract_months(self.expiry_date, doc_type.lead_time_months)

    def days_until_renewal_deadline(self, doc_type: DocumentType) -> Optional[int]:
        dl = self.renewal_deadline(doc_type)
        if dl is None:
            return None
        return (dl - date.today()).days

    def urgency(self, doc_type: DocumentType) -> str:
        """Returns: ok | soon | urgent | overdue | expired | unknown"""
        dte = self.days_until_expiry()
        if dte is None:
            return "unknown"
        if dte < 0:
            return "expired"
        dtd = self.days_until_renewal_deadline(doc_type)
        if dtd is None:
            return "ok"
        if dtd < 0:
            return "overdue"   # past renewal window but not yet expired
        if dtd < 30:
            return "urgent"
        if dtd < 90:
            return "soon"
        return "ok"


def _subtract_months(d: date, months: int) -> date:
    """Subtract `months` from a date without requiring dateutil."""
    total_months = d.year * 12 + d.month - 1 - months
    year, month = divmod(total_months, 12)
    month += 1
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(d.day, max_day))


DOCUMENT_TYPES: dict[str, DocumentType] = {
    "PASSPORT": DocumentType(
        type_id="PASSPORT",
        name="Zimbabwean Passport",
        lead_time_months=8,
        processing_weeks=14,
        office_name="Embassy of Zimbabwe, Berlin",
        office_address="Kommandantenstraße 80, 10117 Berlin",
        office_phone="+49 30 206 2263",
        office_url="https://www.zimberlin.de",
        requirements=[
            Requirement(
                "Completed application form ZIM 91",
                "Download from zimberlin.de or collect at the embassy",
            ),
            Requirement(
                "Current passport (original)",
                "Make a certified copy before handing it over",
            ),
            Requirement(
                "2 passport photos (35 × 45 mm)",
                "White background, taken within the last 6 months",
            ),
            Requirement(
                "Meldebescheinigung (proof of registration in Germany)",
                "Get from your local Bürgeramt — usually issued same day",
            ),
            Requirement(
                "Birth certificate (certified copy)",
                "May require an apostille if not previously on file with the embassy",
            ),
            Requirement(
                "Fee (approx. €80–120 — verify current amount on embassy website)",
                "Check whether cash or bank transfer is accepted before you go",
            ),
            Requirement(
                "Self-addressed registered return envelope (Einschreiben)",
                "Required if submitting by post; embassy returns passport via post",
            ),
        ],
        fee_eur=100.0,
        warning_notes=(
            "⚠  Processing is notoriously slow — 10–16 weeks in practice, sometimes longer.\n"
            "   Apply AT LEAST 8 months before expiry.\n"
            "   Alternative: Consulate-General Frankfurt — Kettenhofweg 16, 60325 Frankfurt, "
            "+49 69 971 9750.\n"
            "   If your passport expires while waiting, the Ausländerbehörde can issue a "
            "Reiseausweisersatz\n"
            "   (substitute travel document) to keep you legal — ask proactively."
        ),
    ),
    "PERMIT": DocumentType(
        type_id="PERMIT",
        name="German Aufenthaltserlaubnis",
        lead_time_months=3,
        processing_weeks=6,
        office_name="Ausländerbehörde (city-specific — see notes)",
        office_address="Depends on your registered city of residence",
        office_phone="Depends on city",
        office_url="https://www.bamf.de/EN/Themen/MigrationAufenthalt/migration-aufenthalt-node.html",
        requirements=[
            Requirement(
                "Valid passport",
                "Must be valid for the full renewal period you are requesting",
            ),
            Requirement(
                "1 biometric passport photo (35 × 45 mm)",
                "Taken within the last 6 months",
            ),
            Requirement("Current Aufenthaltserlaubnis (original)"),
            Requirement(
                "Proof of income or proof of active job search",
                "3 months of Gehaltsabrechnungen, or documented job applications if unemployed",
            ),
            Requirement(
                "Rental contract (Mietvertrag)",
                "Current contract signed by your landlord",
            ),
            Requirement(
                "Health insurance certificate (Krankenversicherungsnachweis)",
                "Current coverage confirmation letter from your insurer",
            ),
            Requirement(
                "Fee: ~€100",
                "Exact amount depends on permit type and duration requested",
            ),
        ],
        fee_eur=100.0,
        warning_notes=(
            "⚠  Book your Termin (appointment) online as early as possible —\n"
            "   slots in Munich, Berlin, and Frankfurt fill weeks to months in advance.\n"
            "   Munich: KVR Poccistraße 4, 80336 München — termine.muenchen.de\n"
            "   Berlin: LEA — service.berlin.de/dienstleistung/324856\n"
            "   If your permit expires before your appointment, request a\n"
            "   Fiktionsbescheinigung immediately — it proves your renewal is pending\n"
            "   and keeps you legally resident and authorized to work."
        ),
    ),
}
