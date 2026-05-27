# Document Renewal Tracker

## What this tool does

Tracks expiry dates and renewal deadlines for immigration documents, calculates urgency, and provides exact renewal checklists with office contact details.

Currently tracks two documents:
- **Zimbabwean Passport** — renewed at the Embassy of Zimbabwe in Berlin (or Frankfurt Consulate-General)
- **German Aufenthaltserlaubnis** (residence permit) — renewed at the local Ausländerbehörde

The desk UI at `http://localhost:300x/desk` reads the same data file and shows urgency badges, progress bars, expiry countdowns, and the full checklist in a modal — no CLI needed for day-to-day monitoring.

---

## Current state (as of 2026-05-12)

### The actual situation

Both documents are in an emergency state:

| Document | Expiry | Status | Urgency |
|---|---|---|---|
| Zimbabwean Passport | **2026-04-01** (expired 41 days ago) | active | 💀 EXPIRED |
| Aufenthaltserlaubnis | Tied to passport validity — therefore also invalid | active | 🚨 |

**Additional complicating factors:**
- Not registered (angemeldet) until 2026-05-08 — was living in Czech Republic after divorce
- Ex-wife withheld Zimbabwean National ID and eVisa login credentials post-divorce
- Marriage was 2021–2025 (4 years) → qualifies for §31 AufenthG independent residence right (requires 3+ year marriage)
- Without the National ID, passport renewal requires paying additionally to renew the ID first

**Immediate legal position (§31 AufenthG):**
The 4-year marriage (2021–2025) qualifies for an independent right of residence under §31 AufenthG. This means the Aufenthaltserlaubnis is not automatically cancelled by divorce — it can be maintained independently. However, the Ausländerbehörde must be informed, and a Fiktionsbescheinigung must be obtained immediately (it proves renewal is pending and keeps work authorisation valid while waiting for the appointment).

### What is working
- Urgency calculation: `ok | soon | urgent | overdue | expired | unknown`
- Renewal deadline = expiry date minus lead time months (8 months for passport, 3 for permit)
- Progress bar calculation
- Full checklist display with office addresses, phone numbers, fees, requirements, and notes
- Desk UI integration — `/api/desk/documents` serves enriched document objects including all checklist data
- Alert banner — `expired` and `overdue` documents trigger red alerts at the top of the desk with specific action text (Zimbabwe Embassy phone number shown for passport)
- Data persisted in `tools/document_tracker/data/documents.json`

### What is not yet built
- **Multiple permits** — currently hardcoded for PASSPORT and PERMIT only; no support for adding custom document types without editing `documents.py`
- **Appointment booking integration** — checklist shows the URL but does not open or prefill booking forms
- **Reminder system** — no push notification or email alert when deadlines approach; urgency is only visible when you open the desk
- **Document upload** — no way to attach scan of current documents to the record

---

## Urgency logic

```
days_until_expiry < 0                    → expired
days_until_renewal_deadline < 0          → overdue  (past window, not yet expired)
days_until_renewal_deadline < 30         → urgent
days_until_renewal_deadline < 90         → soon
otherwise                                → ok
expiry_date not set                      → unknown
```

Renewal deadline = expiry_date − lead_time_months:
- Passport: 8 months lead (so for April 2026 expiry, renewal should have started August 2025)
- Permit: 3 months lead

---

## Passport renewal — what is actually required

**Office:** Embassy of Zimbabwe, Kommandantenstraße 80, 10117 Berlin — +49 30 206 2263

**Alternative:** Consulate-General Frankfurt, Kettenhofweg 16, 60325 Frankfurt — +49 69 971 9750

**Required documents:**
1. Form ZIM 91 — downloadable from zimberlin.de or collected at embassy
2. Current passport (original) — make certified copy before handing over
3. 2 passport photos (35 × 45 mm, white background, within 6 months)
4. Meldebescheinigung — proof of registration; get from Bürgeramt same day
5. Birth certificate (certified copy) — may need apostille if not on file
6. Fee ~€80–120 — confirm payment method (cash vs. bank transfer) before attending
7. Self-addressed registered return envelope (Einschreiben) if submitting by post

**Processing time: 10–16 weeks in practice** (official: 14 weeks). Apply at least 8 months before expiry.

**Without National ID:** The embassy will require additional identity verification. Pay to renew the National ID simultaneously. Contact the embassy by phone first to confirm the exact current requirements for an expired passport with missing ID — the process is non-standard and they may have specific guidance.

**If passport expires while waiting:** The Ausländerbehörde can issue a **Reiseausweisersatz** (substitute travel document) to keep you legally present in Germany. Request this proactively — do not wait.

---

## Permit renewal — what is actually required

**Office:** Depends on your registered city of residence.
- Munich: KVR, Poccistraße 4, 80336 München — termine.muenchen.de
- Berlin: LEA — service.berlin.de/dienstleistung/324856
- Other cities: search "[city] Ausländerbehörde Termin"

**Required documents:**
1. Valid passport (must cover full renewal period)
2. 1 biometric photo (35 × 45 mm, within 6 months)
3. Current Aufenthaltserlaubnis (original)
4. Proof of income or documented job applications
5. Current rental contract (Mietvertrag)
6. Health insurance certificate (Krankenversicherungsnachweis)
7. Fee ~€100

**§31 AufenthG path (post-divorce independent right):**
- Marriage must have existed for at least 3 years in Germany — yours was 4 years → qualifies
- Bring: divorce certificate (Scheidungsurteil), marriage certificate, proof of joint residence
- Request Fiktionsbescheinigung at the same appointment — it bridges the gap legally

**Critical:** Book the Ausländerbehörde appointment immediately. Slots in most cities book out weeks to months in advance. If the appointment is not available quickly, go in person during walk-in hours (Spontanvorsprache) and explain the emergency situation — expired passport + recent Anmeldung.

---

## CLI usage

Run all commands from the **repo root**:

```bash
# Show current status of all documents:
python -m tools.document_tracker status

# Set expiry dates (do this first — tracker shows ❓ until dates are set):
python -m tools.document_tracker set PASSPORT 2026-04-01
python -m tools.document_tracker set PERMIT 2026-04-01

# Update status when you take action:
python -m tools.document_tracker update PASSPORT --status in_progress --note "Applied at embassy 2026-05-15"
python -m tools.document_tracker update PERMIT --status in_progress --note "Fiktionsbescheinigung requested"

# Show full renewal checklist:
python -m tools.document_tracker checklist PASSPORT
python -m tools.document_tracker checklist PERMIT
```

**Document statuses:**
- `active` — current, no action taken
- `in_progress` — renewal process started
- `submitted` — application submitted, waiting
- `received` — new document received
- `expired` — past expiry, no renewal started

---

## Data file

```
tools/document_tracker/data/documents.json
```

Created automatically on first run with empty records. The desk API reads and writes this file directly — changes made in the UI are immediately reflected in CLI output and vice versa.

---

## What to build next

**Priority 1 — Appointment booking alert**
Add a `termin_booked` flag and `termin_date` field. If the document is `overdue` or `expired` and no termin is booked, the desk should show a second-level alert prompting to book. This is the most important missing feature for the actual emergency.

**Priority 2 — Progress tracking for in-flight applications**
When status is `in_progress` or `submitted`, show estimated completion date (submitted_date + processing_weeks) and days remaining. Currently the status is stored but not displayed in the desk.

**Priority 3 — Push notification / email alert**
Daily check that runs via scheduled task or cron, sends an email (using the existing email infrastructure in `tools/`) if any document transitions to `urgent`, `overdue`, or `expired`.

**Priority 4 — Add custom document types**
Currently PASSPORT and PERMIT are hardcoded in `documents.py`. Generalise so any document (e.g., Schengen visa, driving licence, health insurance renewal) can be added via CLI or desk UI without touching source code.
