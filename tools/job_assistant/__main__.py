"""
Job Application Assistant — CLI entry point.

Usage (run from repo root):

  # Analyse a job posting from a URL (falls back to paste if URL is blocked):
  python -m tools.job_assistant apply --url "https://..."

  # Paste mode (most reliable):
  python -m tools.job_assistant apply --paste

  # Skip LLM generation (analysis only, no API key needed):
  python -m tools.job_assistant apply --url "https://..." --no-generate

  # List saved applications:
  python -m tools.job_assistant list

  # Show a saved application:
  python -m tools.job_assistant show 2025-05-11_softwarepiloten

  # Update status of an application:
  python -m tools.job_assistant update 2025-05-11_softwarepiloten --status interview
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date

# Force UTF-8 so box-drawing and emoji characters print correctly on Windows.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
from pathlib import Path
from typing import Optional

from .scraper import fetch_job_text, paste_job_text
from .parser import parse, JobPosting
from .assessor import assess, EligibilityReport
from .calculator import (
    full_breakdown, estimate_gross_from_text, MARKET_DEFAULT_GROSS
)
from .generator import (
    generate_resume, generate_cover_letter, generate_assessment_narrative,
    generate_latex_resume, generate_latex_cover_letter,
)

_OUTPUT_DIR = Path(__file__).parent / "output"
_INDEX_FILE = _OUTPUT_DIR / "index.json"

_VALID_STATUSES = {
    "saved", "applied", "interview", "offer", "rejected", "withdrawn"
}


# ── display ────────────────────────────────────────────────────────────────────

def _hr(char: str = "─", width: int = 64) -> str:
    return "  " + char * width


def _print_job_summary(posting: JobPosting) -> None:
    print()
    print(_hr("━"))
    print(f"  JOB: {posting.title}")
    print(f"  Company:  {posting.company}")
    print(f"  Location: {posting.location}{'  (remote)' if posting.remote else ''}")
    print(f"  Salary:   {posting.salary_display}")
    print(f"  Type:     {posting.contract_type}")
    print(f"  Language: {'German' if posting.language == 'de' else 'English'}")
    if posting.tech_stack:
        stack_str = ", ".join(posting.tech_stack[:12])
        if len(posting.tech_stack) > 12:
            stack_str += f" ... +{len(posting.tech_stack)-12}"
        print(f"  Stack:    {stack_str}")
    print(_hr("━"))


def _print_assessment(report: EligibilityReport) -> None:
    print()
    print(f"  {report.recommendation_icon}  ELIGIBILITY: {report.total}/100 — {report.grade}")
    print(_hr())
    print(f"  Stack match:       {report.stack_score:2d}/40")
    print(f"  Experience:        {report.experience_score:2d}/25")
    print(f"  Work auth:         {report.auth_score:2d}/10")
    print(f"  Domain fit:        {report.domain_score:2d}/15")
    print(f"  Gap risk:          {report.gap_score:2d}/10")
    print()

    # Top skill matches
    sorted_matches = sorted(report.skill_matches, key=lambda m: -m.score)
    if sorted_matches:
        print("  Skill breakdown (job requirements vs. profile):")
        for m in sorted_matches[:10]:
            icon = "✅" if m.score >= 7 else ("🟡" if m.score >= 4 else "🔴")
            print(f"    {icon} {m.keyword:<18} {m.bar}  {m.score}/10")

    print()
    print("  Assessment notes:")
    for note in report.notes:
        print(f"    · {note}")
    print()
    print(f"  Recommendation: {report.recommendation_icon}  {report.recommendation.replace('_', ' ').upper()}")


def _print_financials(posting: JobPosting) -> None:
    print()
    print("  FINANCIAL ANALYSIS")
    print(_hr())

    gross = estimate_gross_from_text(posting.raw_text)
    source = "from job posting"
    if gross is None:
        gross = MARKET_DEFAULT_GROSS
        source = "market estimate for senior DE developer"

    print(f"  Gross salary: €{gross:,.0f}/year  ({source})")
    print()

    breakdown, city_reports = full_breakdown(gross)
    for line in breakdown.display_lines():
        print(line)

    print()
    print("  Rent + living cost estimates (1BR apartment, warm):")
    print(f"  {'City':<16} {'Rent range':>22}  {'Other':>7}  {'Disposable':>12}  Comfort")
    print("  " + "─" * 72)
    for r in city_reports:
        rent_range = f"€{r.rent_low:,}–€{r.rent_high:,}"
        disposable = f"€{r.disposable_mid:,.0f}/mo"
        print(
            f"  {r.city:<16} {rent_range:>22}  "
            f"~€{r.other_expenses:,}/mo  {disposable:>12}  "
            f"{r.comfort_icon} {r.comfort_label}"
        )


# ── application storage ────────────────────────────────────────────────────────

def _app_id(posting: JobPosting) -> str:
    today = date.today().isoformat()
    slug = re.sub(r"[^\w]+", "_", posting.company.lower())[:30].strip("_")
    return f"{today}_{slug}"


def _save_application(
    app_id: str,
    posting: JobPosting,
    report: EligibilityReport,
    resume_md: Optional[str],
    cover_letter_md: Optional[str],
    assessment_narrative: Optional[str],
) -> Path:
    app_dir = _OUTPUT_DIR / app_id
    app_dir.mkdir(parents=True, exist_ok=True)

    gross = estimate_gross_from_text(posting.raw_text) or MARKET_DEFAULT_GROSS
    breakdown, city_reports = full_breakdown(gross)

    # Job metadata
    (app_dir / "job.json").write_text(
        json.dumps(
            {
                "title": posting.title,
                "company": posting.company,
                "location": posting.location,
                "remote": posting.remote,
                "salary_raw": posting.salary_raw,
                "salary_min": posting.salary_min,
                "salary_max": posting.salary_max,
                "contract_type": posting.contract_type,
                "tech_stack": posting.tech_stack,
                "language": posting.language,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # Assessment
    (app_dir / "assessment.json").write_text(
        json.dumps(
            {
                "total": report.total,
                "grade": report.grade,
                "recommendation": report.recommendation,
                "stack_score": report.stack_score,
                "experience_score": report.experience_score,
                "auth_score": report.auth_score,
                "domain_score": report.domain_score,
                "gap_score": report.gap_score,
                "notes": report.notes,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # Financial analysis
    (app_dir / "financials.json").write_text(
        json.dumps(
            {
                "gross_annual": gross,
                "net_annual": breakdown.net_annual,
                "net_monthly": breakdown.net_monthly,
                "cities": [
                    {
                        "city": r.city,
                        "rent_mid": r.rent_mid,
                        "disposable_mid": r.disposable_mid,
                        "comfort": r.comfort_label,
                    }
                    for r in city_reports
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    if resume_md:
        (app_dir / "resume.md").write_text(resume_md, encoding="utf-8")
    if cover_letter_md:
        (app_dir / "cover_letter.md").write_text(cover_letter_md, encoding="utf-8")
    if assessment_narrative:
        (app_dir / "narrative.txt").write_text(assessment_narrative, encoding="utf-8")

    # LaTeX versions
    resume_tex = generate_latex_resume(posting, report)
    if resume_tex:
        (app_dir / "resume.tex").write_text(resume_tex, encoding="utf-8")
    cover_letter_tex = generate_latex_cover_letter(posting, report)
    if cover_letter_tex:
        (app_dir / "cover_letter.tex").write_text(cover_letter_tex, encoding="utf-8")

    # Update index
    _update_index(app_id, posting, report)

    return app_dir


def _update_index(app_id: str, posting: JobPosting, report: EligibilityReport) -> None:
    _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    index = []
    if _INDEX_FILE.exists():
        try:
            index = json.loads(_INDEX_FILE.read_text(encoding="utf-8"))
        except Exception:
            index = []

    # Remove existing entry for this app_id if present
    index = [e for e in index if e.get("id") != app_id]
    index.insert(0, {
        "id": app_id,
        "date": date.today().isoformat(),
        "title": posting.title,
        "company": posting.company,
        "score": report.total,
        "recommendation": report.recommendation,
        "status": "saved",
    })
    _INDEX_FILE.write_text(json.dumps(index, indent=2), encoding="utf-8")


# ── commands ───────────────────────────────────────────────────────────────────

def cmd_apply(args: argparse.Namespace) -> None:
    # 1. Get job text
    if args.paste:
        text = paste_job_text()
    else:
        text = fetch_job_text(args.url, verbose=True)
        if text is None:
            print()
            print("  URL fetch failed or returned too little content.")
            print("  Falling back to paste mode.")
            text = paste_job_text()

    if not text or not text.strip():
        print("  No job text provided — aborting.", file=sys.stderr)
        sys.exit(1)

    # 2. Parse
    posting = parse(text)
    _print_job_summary(posting)

    # 3. Assess
    report = assess(posting)
    _print_assessment(report)

    # 4. Financials
    _print_financials(posting)

    # 5. Generate (optional, requires API key)
    resume_md: Optional[str] = None
    cover_letter_md: Optional[str] = None
    narrative: Optional[str] = None

    if not args.no_generate:
        print()
        print("  Generating documents via Claude API ...")
        print()

        resume_md = generate_resume(posting, report)
        if resume_md:
            print("  ✅  Resume generated")

        cover_letter_md = generate_cover_letter(posting, report)
        if cover_letter_md:
            print("  ✅  Cover letter generated")

        narrative = generate_assessment_narrative(posting, report)
        if narrative:
            print()
            print("  HONEST ASSESSMENT (5 sentences):")
            print(_hr())
            for sentence in narrative.strip().split(". "):
                if sentence.strip():
                    print(f"  {sentence.strip()}.")
            print()

    # 6. Save
    app_id = _app_id(posting)
    app_dir = _save_application(app_id, posting, report, resume_md, cover_letter_md, narrative)

    print()
    print(_hr("═"))
    print(f"  Saved: {app_dir}")
    print(f"  ID:    {app_id}")
    if resume_md:
        print(f"  Resume:       {app_dir / 'resume.md'}")
    if cover_letter_md:
        print(f"  Cover letter: {app_dir / 'cover_letter.md'}")
    print()
    print(f"  Update status:  python -m tools.job_assistant update {app_id} --status applied")
    print()


def cmd_list(args: argparse.Namespace) -> None:
    if not _INDEX_FILE.exists():
        print("  No applications saved yet.")
        return

    index = json.loads(_INDEX_FILE.read_text(encoding="utf-8"))
    if not index:
        print("  No applications saved yet.")
        return

    print()
    print(f"  {'ID':<40} {'Score':>6}  {'Rec.':<20}  Status")
    print("  " + "─" * 80)
    for entry in index:
        print(
            f"  {entry['id']:<40} {entry['score']:>5}/100"
            f"  {entry['recommendation']:<20}  {entry.get('status','saved')}"
        )
    print()


def cmd_show(args: argparse.Namespace) -> None:
    app_dir = _OUTPUT_DIR / args.app_id
    if not app_dir.exists():
        print(f"  Application '{args.app_id}' not found.", file=sys.stderr)
        sys.exit(1)

    job_f = app_dir / "job.json"
    assess_f = app_dir / "assessment.json"
    fin_f = app_dir / "financials.json"

    if job_f.exists():
        job = json.loads(job_f.read_text(encoding="utf-8"))
        print()
        print(f"  {job['title']} @ {job['company']}")
        print(f"  Location: {job['location']}  |  Salary: {job.get('salary_raw') or 'N/A'}")
        print(f"  Stack: {', '.join(job['tech_stack'][:10])}")

    if assess_f.exists():
        a = json.loads(assess_f.read_text(encoding="utf-8"))
        print()
        print(f"  Score: {a['total']}/100  ({a['grade']})  →  {a['recommendation'].upper()}")

    if fin_f.exists():
        fin = json.loads(fin_f.read_text(encoding="utf-8"))
        print(f"  Net monthly: €{fin['net_monthly']:,.0f}")

    print()
    generated = [f.name for f in app_dir.iterdir() if f.suffix in {".md", ".txt"}]
    if generated:
        print(f"  Generated files: {', '.join(generated)}")
        print(f"  Location: {app_dir}")
    print()


def cmd_update(args: argparse.Namespace) -> None:
    if args.status not in _VALID_STATUSES:
        print(
            f"  Invalid status '{args.status}'. Valid: {', '.join(sorted(_VALID_STATUSES))}",
            file=sys.stderr,
        )
        sys.exit(1)

    if not _INDEX_FILE.exists():
        print("  No applications index found.", file=sys.stderr)
        sys.exit(1)

    index = json.loads(_INDEX_FILE.read_text(encoding="utf-8"))
    found = False
    for entry in index:
        if entry["id"] == args.app_id:
            entry["status"] = args.status
            found = True
            break

    if not found:
        print(f"  Application '{args.app_id}' not found in index.", file=sys.stderr)
        sys.exit(1)

    _INDEX_FILE.write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"  Updated {args.app_id} → {args.status}")


# ── main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        prog="job_assistant",
        description="Job application assistant — analyse, assess, generate, track.",
    )
    sub = parser.add_subparsers(dest="command")

    # apply
    p_apply = sub.add_parser("apply", help="Analyse a job posting and generate documents")
    src = p_apply.add_mutually_exclusive_group(required=True)
    src.add_argument("--url", help="URL of the job posting")
    src.add_argument("--paste", action="store_true", help="Paste job description interactively")
    p_apply.add_argument(
        "--no-generate",
        action="store_true",
        help="Skip LLM generation (analysis only — no API key needed)",
    )

    # list
    sub.add_parser("list", help="List all saved applications")

    # show
    p_show = sub.add_parser("show", help="Show details of a saved application")
    p_show.add_argument("app_id", metavar="APP_ID")

    # update
    p_update = sub.add_parser("update", help="Update status of an application")
    p_update.add_argument("app_id", metavar="APP_ID")
    p_update.add_argument("--status", required=True, choices=sorted(_VALID_STATUSES))

    args = parser.parse_args()

    if args.command == "apply":
        cmd_apply(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "show":
        cmd_show(args)
    elif args.command == "update":
        cmd_update(args)
    else:
        parser.print_help()

    return 0


if __name__ == "__main__":
    sys.exit(main())
