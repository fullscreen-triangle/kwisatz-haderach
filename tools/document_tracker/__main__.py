"""
Document renewal tracker — CLI entry point.

Usage (run from repo root):

  python -m tools.document_tracker status
  python -m tools.document_tracker set PASSPORT 2027-03-15
  python -m tools.document_tracker set PERMIT 2026-01-31
  python -m tools.document_tracker update PASSPORT --status in_progress --note "Applied 2025-05-10"
  python -m tools.document_tracker checklist PASSPORT
  python -m tools.document_tracker checklist PERMIT
"""

from __future__ import annotations

import argparse
import sys
from datetime import date

# Force UTF-8 so box-drawing and emoji characters print correctly on Windows.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from .documents import DOCUMENT_TYPES, DocumentRecord
from .storage import load, save

URGENCY_ICONS = {
    "ok":      "✅",
    "soon":    "🟡",
    "urgent":  "🔴",
    "overdue": "🚨",
    "expired": "💀",
    "unknown": "❓",
}

VALID_STATUSES = {"active", "in_progress", "submitted", "received", "expired"}


# ── display helpers ────────────────────────────────────────────────────────────

def _bar(days: int, max_days: int = 365, width: int = 20) -> str:
    filled = max(0, min(width, int(width * days / max(max_days, 1))))
    return "█" * filled + "░" * (width - filled)


def _fmt_days(n: int) -> str:
    if n < 0:
        return f"{abs(n)} days ago"
    if n == 0:
        return "today"
    if n == 1:
        return "1 day"
    return f"{n} days"


def cmd_status(args: argparse.Namespace) -> None:
    records = load()
    today = date.today()
    print()
    print(f"  Document Renewal Tracker — {today.isoformat()}")
    print("  " + "─" * 60)

    for tid, doc_type in DOCUMENT_TYPES.items():
        rec = records[tid]
        urgency = rec.urgency(doc_type)
        icon = URGENCY_ICONS[urgency]

        print()
        print(f"  {icon}  {doc_type.name}  [{rec.status}]")
        print(f"     Office: {doc_type.office_name}")

        if rec.expiry_date:
            dte = rec.days_until_expiry()
            dl = rec.renewal_deadline(doc_type)
            dtd = rec.days_until_renewal_deadline(doc_type)
            print(f"     Expires:          {rec.expiry_date.isoformat()}  ({_fmt_days(dte)} from today)")
            print(f"     Renewal deadline: {dl.isoformat()}  ({_fmt_days(dtd)} from today)  ← start by here")
            print(f"     Progress:         [{_bar(max(0, dte), 365)}] {dte}d remaining")

            if urgency == "overdue":
                print(f"     ⚠️   PAST RENEWAL DEADLINE — apply immediately")
            elif urgency == "urgent":
                print(f"     ⚠️   RENEWAL DUE WITHIN 30 DAYS — act now")
            elif urgency == "soon":
                print(f"     ℹ️   Renewal window opens soon — start preparing documents")
        else:
            print(f"     Expiry date not set — run:  python -m tools.document_tracker set {tid} YYYY-MM-DD")

        if rec.notes:
            print(f"     Note: {rec.notes}")

    print()
    print("  " + "─" * 60)
    print("  Commands:")
    print("    set <DOC> <YYYY-MM-DD>          — set expiry date")
    print("    update <DOC> [--status S] [--note N]  — update status/notes")
    print("    checklist <DOC>                 — show required documents")
    print()


def cmd_set(args: argparse.Namespace) -> None:
    tid = args.doc_type.upper()
    if tid not in DOCUMENT_TYPES:
        print(f"Unknown document type '{tid}'. Valid: {', '.join(DOCUMENT_TYPES)}", file=sys.stderr)
        sys.exit(1)
    try:
        expiry = date.fromisoformat(args.expiry_date)
    except ValueError:
        print(f"Invalid date '{args.expiry_date}'. Use ISO format: YYYY-MM-DD", file=sys.stderr)
        sys.exit(1)

    records = load()
    records[tid].expiry_date = expiry
    save(records)

    doc_type = DOCUMENT_TYPES[tid]
    dl = records[tid].renewal_deadline(doc_type)
    dte = records[tid].days_until_expiry()
    dtd = records[tid].days_until_renewal_deadline(doc_type)
    urgency = records[tid].urgency(doc_type)
    icon = URGENCY_ICONS[urgency]

    print(f"\n  {icon}  {doc_type.name}")
    print(f"     Expiry:           {expiry.isoformat()}  ({_fmt_days(dte)})")
    print(f"     Renewal deadline: {dl.isoformat()}  ({_fmt_days(dtd)})")
    print()


def cmd_update(args: argparse.Namespace) -> None:
    tid = args.doc_type.upper()
    if tid not in DOCUMENT_TYPES:
        print(f"Unknown document type '{tid}'. Valid: {', '.join(DOCUMENT_TYPES)}", file=sys.stderr)
        sys.exit(1)

    records = load()
    rec = records[tid]

    if args.status:
        if args.status not in VALID_STATUSES:
            print(f"Invalid status '{args.status}'. Valid: {', '.join(sorted(VALID_STATUSES))}", file=sys.stderr)
            sys.exit(1)
        rec.status = args.status
        if args.status == "in_progress" and rec.renewal_started is None:
            rec.renewal_started = date.today()
        if args.status == "submitted" and rec.submitted_date is None:
            rec.submitted_date = date.today()
        if args.status == "received" and rec.received_date is None:
            rec.received_date = date.today()

    if args.note:
        rec.notes = args.note

    save(records)
    print(f"  Updated {DOCUMENT_TYPES[tid].name}: status={rec.status}")
    if rec.notes:
        print(f"  Note: {rec.notes}")


def cmd_checklist(args: argparse.Namespace) -> None:
    tid = args.doc_type.upper()
    if tid not in DOCUMENT_TYPES:
        print(f"Unknown document type '{tid}'. Valid: {', '.join(DOCUMENT_TYPES)}", file=sys.stderr)
        sys.exit(1)

    doc_type = DOCUMENT_TYPES[tid]
    records = load()
    rec = records[tid]
    urgency = rec.urgency(doc_type)
    icon = URGENCY_ICONS[urgency]

    print()
    print(f"  {icon}  Renewal Checklist — {doc_type.name}")
    print(f"  {'─' * 60}")
    print(f"  Office:           {doc_type.office_name}")
    print(f"  Address:          {doc_type.office_address}")
    print(f"  Phone:            {doc_type.office_phone}")
    print(f"  Website:          {doc_type.office_url}")
    print(f"  Fee:              approx. €{doc_type.fee_eur:.0f}")
    print(f"  Lead time:        start {doc_type.lead_time_months} months before expiry")
    print(f"  Processing time:  {doc_type.processing_weeks} weeks (typical)")
    print()
    print("  Required documents:")
    for i, req in enumerate(doc_type.requirements, 1):
        print(f"  {'─'*2} {i}. {req.item}")
        if req.note:
            print(f"        ↳  {req.note}")
    if doc_type.warning_notes:
        print()
        for line in doc_type.warning_notes.split("\n"):
            print(f"  {line}")
    print()


# ── main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        prog="document_tracker",
        description="Track passport and residence permit renewal deadlines.",
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("status", help="Show status of all tracked documents")

    p_set = sub.add_parser("set", help="Set or update the expiry date for a document")
    p_set.add_argument("doc_type", metavar="DOC", help="PASSPORT or PERMIT")
    p_set.add_argument("expiry_date", metavar="YYYY-MM-DD", help="Expiry date in ISO format")

    p_update = sub.add_parser("update", help="Update status or notes for a document")
    p_update.add_argument("doc_type", metavar="DOC", help="PASSPORT or PERMIT")
    p_update.add_argument("--status", choices=sorted(VALID_STATUSES), help="New status")
    p_update.add_argument("--note", help="Freeform note (replaces existing note)")

    p_check = sub.add_parser("checklist", help="Show renewal requirements for a document")
    p_check.add_argument("doc_type", metavar="DOC", help="PASSPORT or PERMIT")

    args = parser.parse_args()

    if args.command == "status":
        cmd_status(args)
    elif args.command == "set":
        cmd_set(args)
    elif args.command == "update":
        cmd_update(args)
    elif args.command == "checklist":
        cmd_checklist(args)
    else:
        parser.print_help()

    return 0


if __name__ == "__main__":
    sys.exit(main())
