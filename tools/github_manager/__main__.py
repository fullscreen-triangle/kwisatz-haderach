"""
CLI entry point.

Run from the repo root:

    # full pipeline (fetch + tag + report):
    python -m tools.github_manager --user fullscreen-triangle

    # just refresh the inventory (e.g. after pushing new repos):
    python -m tools.github_manager --user fullscreen-triangle --inventory-only

    # report from cached inventory without re-fetching:
    python -m tools.github_manager --user fullscreen-triangle --report-only
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .inventory import build_inventory, load_inventory, get_token
from .synergy import (
    tag_inventory,
    compute_synergies,
    write_json_report,
    write_markdown_report,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="github_manager",
        description="Inventory and synergy analysis across a GitHub user's repos.",
    )
    parser.add_argument("--user", required=True,
                        help="GitHub username or org to scan.")
    parser.add_argument("--include-forks", action="store_true",
                        help="Include forked repos (default: skip forks).")
    parser.add_argument("--skip-archived", action="store_true",
                        help="Skip archived repos.")
    parser.add_argument("--inventory-only", action="store_true",
                        help="Fetch inventory only; skip synergy report.")
    parser.add_argument("--report-only", action="store_true",
                        help="Skip fetch; build report from cached inventory.")
    parser.add_argument("--output-dir", default=None,
                        help="Output directory (default: tools/github_manager/output).")
    parser.add_argument("--top-pairs", type=int, default=50,
                        help="Number of top synergy pairs in markdown report.")
    parser.add_argument("--min-shared", type=int, default=1,
                        help="Min shared concepts required to record a pair.")
    args = parser.parse_args()

    if args.output_dir:
        out_dir = Path(args.output_dir)
    else:
        out_dir = Path(__file__).parent / "output"
    out_dir.mkdir(parents=True, exist_ok=True)
    inventory_path = out_dir / "inventory.json"
    json_report_path = out_dir / "synergy_report.json"
    md_report_path = out_dir / "synergy_report.md"

    # Step 1: inventory
    if args.report_only:
        if not inventory_path.exists():
            print(f"No cached inventory at {inventory_path}; run without "
                  "--report-only first.", file=sys.stderr)
            return 2
        print(f"Loading cached inventory from {inventory_path}", file=sys.stderr)
        inventory = load_inventory(inventory_path)
    else:
        try:
            token = get_token()
        except RuntimeError as e:
            print(str(e), file=sys.stderr)
            return 2
        inventory = build_inventory(
            user=args.user,
            token=token,
            output_path=inventory_path,
            include_forks=args.include_forks,
            skip_archived=args.skip_archived,
        )

    if args.inventory_only:
        print(f"Inventory only: wrote {len(inventory)} repos to "
              f"{inventory_path}", file=sys.stderr)
        return 0

    # Step 2: tag + synergy
    print("Tagging repos against framework vocabulary...", file=sys.stderr)
    tagged = tag_inventory(inventory)

    print("Computing pairwise synergies...", file=sys.stderr)
    pairs = compute_synergies(tagged, min_shared=args.min_shared)

    print(f"Writing JSON report to {json_report_path}", file=sys.stderr)
    write_json_report(tagged, pairs, json_report_path)

    print(f"Writing Markdown report to {md_report_path}", file=sys.stderr)
    write_markdown_report(tagged, pairs, md_report_path, top_n_pairs=args.top_pairs)

    # Console summary
    n_with_concepts = sum(1 for t in tagged if t.concepts)
    n_cross = sum(1 for p in pairs if p.cross_domain)
    print("", file=sys.stderr)
    print(f"  repos tagged: {n_with_concepts}/{len(tagged)} have ≥1 concept hit",
          file=sys.stderr)
    print(f"  synergy pairs: {len(pairs)} ({n_cross} cross-domain)",
          file=sys.stderr)
    if pairs:
        top = pairs[0]
        print(f"  top pair: {top.a} ⇄ {top.b} (score {top.score:.3f}, "
              f"{len(top.shared_concepts)} shared concepts)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
