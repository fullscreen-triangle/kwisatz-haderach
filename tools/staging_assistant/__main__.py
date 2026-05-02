"""
CLI for the staging assistant.

Subcommands:
    inventory     Walk docs/ and write paper inventory JSON.
    list          List inventory + audiences.
    pitch         Generate a submission pitch for one paper + one audience.
    pitch-all     Generate pitches for one paper across all valid audiences.
    job           Match a job description against the corpus and draft cover letter.

Run from the repo root:

    python -m tools.staging_assistant inventory
    python -m tools.staging_assistant list
    python -m tools.staging_assistant pitch --paper variance-minimisation \
                                            --audience sports_science
    python -m tools.staging_assistant pitch-all --paper biological-membrane
    python -m tools.staging_assistant job --job-file ./job.txt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .paper_inventory import (
    walk_docs, write_inventory_json, load_inventory_json, Paper,
)
from .audience_profiles import (
    PROFILES, list_audiences, get_profile, domain_to_default_audience,
)
from .pitch_generator import render_pitch, render_all_audiences_for_paper
from .job_companion import match_job, render_cover_letter


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DOCS = REPO_ROOT / "docs"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "output"
DEFAULT_INVENTORY = DEFAULT_OUTPUT / "paper_inventory.json"


def _ensure_inventory(path: Path = DEFAULT_INVENTORY) -> list[Paper]:
    if not path.exists():
        print(f"No inventory at {path}. Run `inventory` subcommand first.",
              file=sys.stderr)
        sys.exit(2)
    return load_inventory_json(path)


def _find_paper(corpus: list[Paper], identifier: str) -> Paper:
    """Match by short_id (filename stem), substring of path, or full path."""
    ident = identifier.lower()
    # Exact short_id
    for p in corpus:
        if p.short_id().lower() == ident:
            return p
    # Substring of path
    matches = [p for p in corpus if ident in p.path.lower()]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        print(f"Ambiguous identifier '{identifier}'. Matches:", file=sys.stderr)
        for m in matches[:10]:
            print(f"  {m.path}", file=sys.stderr)
        sys.exit(2)
    print(f"No paper matching '{identifier}' in corpus.", file=sys.stderr)
    sys.exit(2)


def cmd_inventory(args: argparse.Namespace) -> int:
    docs_root = Path(args.docs).resolve() if args.docs else DEFAULT_DOCS
    output = Path(args.output).resolve() if args.output else DEFAULT_INVENTORY

    if not docs_root.exists():
        print(f"docs root does not exist: {docs_root}", file=sys.stderr)
        return 2

    print(f"Walking {docs_root}...", file=sys.stderr)
    papers = walk_docs(docs_root)
    write_inventory_json(papers, output)

    by_domain: dict[str, int] = {}
    for p in papers:
        by_domain[p.domain] = by_domain.get(p.domain, 0) + 1

    print(f"Wrote {len(papers)} papers to {output}", file=sys.stderr)
    print("Per-domain counts:", file=sys.stderr)
    for d, n in sorted(by_domain.items(), key=lambda kv: -kv[1]):
        print(f"  {d:20s} {n}", file=sys.stderr)
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    corpus = _ensure_inventory()
    print(f"# Inventory ({len(corpus)} papers)\n")
    by_domain: dict[str, list[Paper]] = {}
    for p in corpus:
        by_domain.setdefault(p.domain, []).append(p)
    for d in sorted(by_domain.keys()):
        papers = by_domain[d]
        print(f"## {d}  ({len(papers)})")
        for p in sorted(papers, key=lambda p: p.path):
            title = (p.title or p.short_id())[:90]
            print(f"  {p.short_id():40s}  {title}")
        print()

    print(f"# Audiences ({len(PROFILES)})\n")
    for aid in list_audiences():
        prof = get_profile(aid)
        print(f"  {aid:30s}  {prof.name}")
        print(f"    domains: {', '.join(prof.domains)}")
        print(f"    venues : {', '.join(prof.venues[:2])}")
        print()
    return 0


def cmd_pitch(args: argparse.Namespace) -> int:
    corpus = _ensure_inventory()
    paper = _find_paper(corpus, args.paper)
    if args.audience:
        audience = get_profile(args.audience)
    else:
        audience_id = domain_to_default_audience(paper.domain)
        audience = get_profile(audience_id)
        print(f"No audience specified; defaulting to '{audience_id}' "
              f"based on domain '{paper.domain}'.", file=sys.stderr)

    output_text = render_pitch(paper, audience, corpus)

    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(output_text, encoding="utf-8")
        print(f"Wrote pitch to {args.output}", file=sys.stderr)
    else:
        out = (DEFAULT_OUTPUT /
               f"pitch_{paper.short_id()}_{audience.audience_id}.md")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(output_text, encoding="utf-8")
        print(f"Wrote pitch to {out}", file=sys.stderr)
    return 0


def cmd_pitch_all(args: argparse.Namespace) -> int:
    corpus = _ensure_inventory()
    paper = _find_paper(corpus, args.paper)
    output_text = render_all_audiences_for_paper(paper, corpus)
    out = (DEFAULT_OUTPUT / f"pitch_all_{paper.short_id()}.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(output_text, encoding="utf-8")
    print(f"Wrote multi-audience pitch to {out}", file=sys.stderr)
    return 0


def cmd_job(args: argparse.Namespace) -> int:
    corpus = _ensure_inventory()
    if args.job_file:
        job_text = Path(args.job_file).read_text(encoding="utf-8")
    elif not sys.stdin.isatty():
        job_text = sys.stdin.read()
    else:
        print("Provide a job description via --job-file or stdin.",
              file=sys.stderr)
        return 2

    match = match_job(job_text, corpus)
    letter = render_cover_letter(job_text, match)

    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(letter, encoding="utf-8")
        print(f"Wrote cover-letter draft to {args.output}", file=sys.stderr)
    else:
        out = DEFAULT_OUTPUT / "cover_letter_draft.md"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(letter, encoding="utf-8")
        print(f"Wrote cover-letter draft to {out}", file=sys.stderr)
    print("", file=sys.stderr)
    print(f"Inferred domain: {match.domain_inferred}", file=sys.stderr)
    print(f"Audience: {match.audience_inferred.name}", file=sys.stderr)
    if match.ranked_papers:
        top = match.ranked_papers[0]
        print(f"Top match: {top[0].short_id()} (score {top[1]:.3f})",
              file=sys.stderr)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="staging_assistant",
        description=("Inventory the corpus, generate audience-tuned "
                     "submission packages, and draft job-application "
                     "cover letters."),
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_inv = sub.add_parser("inventory", help="Walk docs/ and write inventory JSON.")
    p_inv.add_argument("--docs", help="Path to docs root (default: ./docs).")
    p_inv.add_argument("--output", help="Path to inventory JSON output.")

    sub.add_parser("list", help="List inventory and available audiences.")

    p_pitch = sub.add_parser("pitch", help="Generate a per-audience pitch package.")
    p_pitch.add_argument("--paper", required=True,
                         help="Paper identifier (filename stem, or substring of path).")
    p_pitch.add_argument("--audience", choices=list_audiences(),
                         help="Audience profile to target. Default: domain heuristic.")
    p_pitch.add_argument("--output", help="Output path for pitch markdown.")

    p_all = sub.add_parser("pitch-all",
                           help="Generate pitches across all valid audiences.")
    p_all.add_argument("--paper", required=True,
                       help="Paper identifier.")

    p_job = sub.add_parser("job", help="Match job description; draft cover letter.")
    p_job.add_argument("--job-file", help="Path to a text file with the job description.")
    p_job.add_argument("--output", help="Cover-letter output path.")

    args = parser.parse_args()
    if args.cmd == "inventory":
        return cmd_inventory(args)
    if args.cmd == "list":
        return cmd_list(args)
    if args.cmd == "pitch":
        return cmd_pitch(args)
    if args.cmd == "pitch-all":
        return cmd_pitch_all(args)
    if args.cmd == "job":
        return cmd_job(args)
    parser.error(f"Unknown command: {args.cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
