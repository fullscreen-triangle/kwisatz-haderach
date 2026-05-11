"""
Journal email manager — CLI entry point.

Usage (run from repo root):

  # Paste an email and get a classification + reputation check:
  python -m tools.journal_manager scan

  # List all tracked journal entries:
  python -m tools.journal_manager list

  # Show full details of an entry:
  python -m tools.journal_manager show <entry-id>

  # Update status of an entry:
  python -m tools.journal_manager update <entry-id> --status accepted

  # Draft a response email (optionally uses Claude API):
  python -m tools.journal_manager respond <entry-id> --action accept_editor
  python -m tools.journal_manager respond <entry-id> --action decline_editor
  python -m tools.journal_manager respond <entry-id> --action accept_reviewer
  python -m tools.journal_manager respond <entry-id> --action decline_reviewer
  python -m tools.journal_manager respond <entry-id> --action acknowledge_offer
  python -m tools.journal_manager respond <entry-id> --action decline_offer

  # Show current roles (accepted editorial/reviewer positions):
  python -m tools.journal_manager roles
"""

from __future__ import annotations

import argparse
import sys

# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from .classifier import classify
from .reputation import lookup as doaj_lookup, beall_check
from .storage import (
    JournalEntry, load, save, add, get, update_status, make_entry
)
from .responder import draft_response

_VALID_STATUSES = {"pending", "accepted", "declined", "expired", "submitted"}
_VALID_ACTIONS = {
    "accept_editor", "decline_editor",
    "accept_reviewer", "decline_reviewer",
    "acknowledge_offer", "decline_offer",
}


# ── display ────────────────────────────────────────────────────────────────────

def _hr(char: str = "─", width: int = 64) -> str:
    return "  " + char * width


def _print_classification(result) -> None:
    print()
    print(_hr("━"))
    print(f"  {result.verdict_icon}  VERDICT: {result.verdict_label.upper()}")
    print(f"  Spam score: {result.raw_score}/100  "
          f"(0 = clearly legitimate, 100 = clear spam)")
    print(_hr("━"))

    if result.sender_domain:
        sender_note = ""
        if result.sender_is_reputable:
            sender_note = "  ✅ known reputable publisher domain"
        elif result.sender_is_suspicious:
            sender_note = "  🔴 free/personal email — strong spam signal"
        print(f"  Sender domain:  {result.sender_domain}{sender_note}")

    if result.journal_name:
        print(f"  Journal (detected): {result.journal_name}")

    print()

    # Legitimacy signals
    legit = result.legit_signals
    if legit:
        print("  Legitimacy signals:")
        for s in legit:
            print(f"    ✅  {s.label}")

    # Spam signals
    spam = result.spam_signals
    if spam:
        print()
        print("  Spam signals:")
        for s in spam:
            print(f"    ⚠️   {s.label}")

    # Domain match
    if result.domain_keywords:
        print()
        print(f"  Domain match: {result.domain_score}/10 — "
              f"keywords: {', '.join(result.domain_keywords[:5])}")
    else:
        print()
        print("  Domain match: 0/10 — no overlap with your research areas")

    print()
    print(f"  Recommendation: {result.recommendation.replace('_', ' ').upper()}")


def _print_entry(entry: JournalEntry, verbose: bool = False) -> None:
    icon = {
        "spam": "🗑️ ", "offer": "📬", "reviewer": "🔬",
        "editor": "✏️ ", "likely_spam": "⚠️ ", "uncertain": "❓"
    }.get(entry.category, "❓")
    status_icon = {"accepted": "✅", "declined": "❌", "pending": "🕐",
                   "expired": "💀", "submitted": "📤"}.get(entry.status, "❓")

    print(f"  {icon}  {entry.journal_name or 'Unknown journal'}")
    print(f"     ID:         {entry.id}")
    print(f"     Category:   {entry.category}  |  Status: {status_icon} {entry.status}")
    print(f"     Publisher:  {entry.publisher or 'unknown'}")
    print(f"     Domain:     {entry.domain or 'unknown'}")
    if entry.role:
        print(f"     Role:       {entry.role}")
    if entry.free_publication_offered:
        print(f"     💰  Free publication offered")
    if entry.deadline:
        print(f"     Deadline:   {entry.deadline}")
    if entry.notes:
        print(f"     Notes:      {entry.notes}")
    if entry.is_doaj_listed is not None:
        doaj_note = "✅ DOAJ-listed" if entry.is_doaj_listed else "❓ Not found in DOAJ"
        print(f"     DOAJ:       {doaj_note}")
    if verbose and entry.email_snippet:
        print()
        print("     Email preview:")
        for line in entry.email_snippet[:300].splitlines():
            print(f"       {line}")


# ── commands ───────────────────────────────────────────────────────────────────

def cmd_scan(args: argparse.Namespace) -> None:
    print()
    print("  Paste the email below. Enter END on its own line when done:")
    print()
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == "END":
            break
        lines.append(line)

    email_text = "\n".join(lines)
    if not email_text.strip():
        print("  No text provided.", file=sys.stderr)
        return

    # Classify
    result = classify(email_text)
    _print_classification(result)

    # DOAJ lookup for non-spam
    doaj_result = None
    beall_warning = None
    if result.category not in ("spam", "likely_spam") and result.journal_name:
        doaj_result = doaj_lookup(result.journal_name, verbose=True)
        beall_warning = beall_check(result.journal_name)

    if doaj_result:
        print()
        print(_hr())
        print(f"  {doaj_result.reputation_icon}  JOURNAL REPUTATION: {doaj_result.reputation_label}")
        print(f"  Full name:  {doaj_result.journal_name}")
        print(f"  Publisher:  {doaj_result.publisher}")
        if doaj_result.subjects:
            print(f"  Subjects:   {', '.join(doaj_result.subjects)}")
        if doaj_result.has_apc is not None:
            apc_note = "charges APC" if doaj_result.has_apc else "no APC"
            waiver_note = " (waivers available)" if doaj_result.has_waiver else ""
            print(f"  Fees:       {apc_note}{waiver_note}")

    if beall_warning:
        print()
        print(f"  🚨  BEALL WARNING: {beall_warning}")
        print("       Full Beall's list: https://beallslist.net")

    # Offer to track
    if result.category not in ("spam", "likely_spam"):
        print()
        print(_hr())
        print("  Track this entry? (y/n)")
        try:
            answer = input("  > ").strip().lower()
        except EOFError:
            answer = "n"

        if answer == "y":
            # Prompt for details
            print(f"  Journal name [{result.journal_name or ''}]: ", end="")
            try:
                jname = input().strip() or result.journal_name
            except EOFError:
                jname = result.journal_name

            print(f"  Role (leave blank if none — e.g. reviewer / associate_editor / board_member): ", end="")
            try:
                role = input().strip()
            except EOFError:
                role = ""

            free_pub = any(s.label == "Explicit fee waiver offered" for s in result.legit_signals)

            entry = make_entry(
                category=result.category,
                journal_name=jname,
                publisher=doaj_result.publisher if doaj_result else result.sender_domain,
                domain=", ".join(result.domain_keywords[:3]),
                email_text=email_text,
                is_doaj=doaj_result.in_doaj if doaj_result else None,
                doaj_subjects=doaj_result.subjects if doaj_result else [],
                free_pub=free_pub,
                role=role,
            )
            add(entry)
            print()
            print(f"  ✅  Saved as: {entry.id}")
            print(f"  Respond:  python -m tools.journal_manager respond {entry.id} --action <action>")
            print(f"  Update:   python -m tools.journal_manager update {entry.id} --status accepted")
        else:
            print("  Not tracked.")

    print()


def cmd_list(args: argparse.Namespace) -> None:
    entries = load()
    if not entries:
        print("  No journal entries tracked yet.")
        return

    # Filter
    if args.filter:
        entries = [e for e in entries if e.status == args.filter or e.category == args.filter]

    print()
    print(f"  {'ID':<45} {'Cat':<10} {'Status':<12} Notes")
    print("  " + "─" * 80)
    for e in entries:
        free_flag = " 💰" if e.free_publication_offered else ""
        role_flag = f" [{e.role}]" if e.role else ""
        print(
            f"  {e.id:<45} {e.category:<10} {e.status:<12}"
            f" {e.journal_name[:25]}{free_flag}{role_flag}"
        )
    print()
    print(f"  {len(entries)} entries total.")
    print()


def cmd_show(args: argparse.Namespace) -> None:
    entry = get(args.entry_id)
    if entry is None:
        print(f"  Entry '{args.entry_id}' not found.", file=sys.stderr)
        sys.exit(1)
    print()
    _print_entry(entry, verbose=True)
    print()


def cmd_update(args: argparse.Namespace) -> None:
    if args.status not in _VALID_STATUSES:
        print(f"  Invalid status. Valid: {', '.join(sorted(_VALID_STATUSES))}", file=sys.stderr)
        sys.exit(1)
    if update_status(args.entry_id, args.status, args.note or ""):
        print(f"  Updated {args.entry_id} → {args.status}")
    else:
        print(f"  Entry '{args.entry_id}' not found.", file=sys.stderr)
        sys.exit(1)


def cmd_respond(args: argparse.Namespace) -> None:
    if args.action not in _VALID_ACTIONS:
        print(
            f"  Invalid action. Valid: {', '.join(sorted(_VALID_ACTIONS))}",
            file=sys.stderr,
        )
        sys.exit(1)

    entry = get(args.entry_id)
    if entry is None:
        print(f"  Entry '{args.entry_id}' not found.", file=sys.stderr)
        sys.exit(1)

    print()
    print(f"  Drafting response: {args.action.replace('_', ' ')} — {entry.journal_name}")
    print(_hr())
    print()

    draft = draft_response(entry, args.action)
    print(draft)
    print()

    # Optionally save to file
    if not args.no_save:
        from pathlib import Path
        out_dir = Path(__file__).parent / "data" / "responses"
        out_dir.mkdir(parents=True, exist_ok=True)
        fname = out_dir / f"{entry.id}_{args.action}.txt"
        fname.write_text(draft, encoding="utf-8")
        print(f"  Saved to: {fname}")

    # Auto-update status on accept
    if args.action.startswith("accept"):
        update_status(entry.id, "accepted")
        print(f"  Status updated → accepted")
    elif args.action.startswith("decline"):
        update_status(entry.id, "declined")
        print(f"  Status updated → declined")


def cmd_roles(args: argparse.Namespace) -> None:
    entries = load()
    active = [
        e for e in entries
        if e.status == "accepted" and e.category in ("editor", "reviewer")
    ]
    offers = [
        e for e in entries
        if e.free_publication_offered and e.status == "pending"
    ]

    print()
    if active:
        print("  ACTIVE ROLES:")
        print(_hr())
        for e in active:
            print(f"  ✅  {e.role or e.category}  —  {e.journal_name}")
            print(f"      Domain: {e.domain}  |  Since: {e.date_received}")
            if e.notes:
                print(f"      Notes: {e.notes}")
        print()
    else:
        print("  No active roles.")

    if offers:
        print()
        print("  PENDING FREE PUBLICATION OFFERS:")
        print(_hr())
        for e in offers:
            print(f"  📬  {e.journal_name}")
            print(f"      Domain: {e.domain}  |  Received: {e.date_received}")
        print()
    else:
        print("  No pending free publication offers.")

    print()


# ── main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        prog="journal_manager",
        description="Classify, track, and respond to journal emails.",
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("scan", help="Paste an email and classify it")

    p_list = sub.add_parser("list", help="List tracked journal entries")
    p_list.add_argument(
        "--filter",
        help="Filter by status (pending/accepted/declined) or category (offer/reviewer/editor)",
    )

    p_show = sub.add_parser("show", help="Show full details of an entry")
    p_show.add_argument("entry_id", metavar="ENTRY_ID")

    p_update = sub.add_parser("update", help="Update entry status")
    p_update.add_argument("entry_id", metavar="ENTRY_ID")
    p_update.add_argument("--status", required=True, choices=sorted(_VALID_STATUSES))
    p_update.add_argument("--note", help="Freeform note")

    p_respond = sub.add_parser("respond", help="Draft a response email")
    p_respond.add_argument("entry_id", metavar="ENTRY_ID")
    p_respond.add_argument("--action", required=True, choices=sorted(_VALID_ACTIONS))
    p_respond.add_argument(
        "--no-save", action="store_true", help="Print only, don't save to file"
    )

    sub.add_parser("roles", help="Show active roles and pending free publication offers")

    args = parser.parse_args()

    if args.command == "scan":
        cmd_scan(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "show":
        cmd_show(args)
    elif args.command == "update":
        cmd_update(args)
    elif args.command == "respond":
        cmd_respond(args)
    elif args.command == "roles":
        cmd_roles(args)
    else:
        parser.print_help()

    return 0


if __name__ == "__main__":
    sys.exit(main())
