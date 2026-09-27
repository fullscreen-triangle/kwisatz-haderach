"""
CLI: python -m tools.apartment_search <command>

  add --url <url>        fetch, parse, score, store a listing
  add --file <path>      same, from a saved/pasted listing text file
  list                   show the shortlist, ranked
  portals                where to look in Greifswald
  dossier                Bewerbermappe status
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.apartment_search import store
from tools.apartment_search.criteria import PORTALS
from tools.apartment_search.dossier import dossier_status
from tools.apartment_search.parser import parse_listing
from tools.apartment_search.scorer import score_listing


def _fetch(url: str) -> str | None:
    """Reuse the job assistant's fetcher — same problem, already solved."""
    try:
        from tools.job_assistant.scraper import fetch_job_text
        return fetch_job_text(url, verbose=True)
    except ImportError:
        return None


def cmd_add(args) -> int:
    if args.file:
        text = Path(args.file).read_text(encoding="utf-8", errors="replace")
        url = args.url or ""
    elif args.url:
        text = _fetch(args.url)
        url = args.url
        if not text:
            print("Could not fetch the page (JS-rendered or blocked). "
                  "Save the listing text to a file and use --file.", file=sys.stderr)
            return 2
    else:
        print("Need --url or --file", file=sys.stderr)
        return 2

    listing = parse_listing(text)
    listing["url"] = url
    if args.address:
        listing["address"] = args.address
    assessment = score_listing(listing)

    entry = store.add_listing({**listing, **{
        "score": assessment["score"],
        "recommendation": assessment["recommendation"],
        "assessment": assessment,
    }})
    print(json.dumps({"id": entry["id"], "score": entry["score"],
                      "recommendation": entry["recommendation"],
                      "blockers": assessment["blockers"]}, indent=2, ensure_ascii=False))
    return 0


def cmd_list(args) -> int:
    data = store.load()
    rows = sorted(data["listings"], key=lambda e: e.get("score", 0), reverse=True)
    if not rows:
        print("No listings yet.")
        return 0
    for e in rows:
        warm = (e.get("assessment", {}).get("affordability", {}) or {}).get("warmmiete")
        print(f"{e.get('score', 0):>3}  {e.get('status', '?'):<10} "
              f"{(str(warm) + ' EUR') if warm else '? EUR':<10} "
              f"{e.get('district') or '?':<20} {(e.get('title') or e.get('url') or '')[:60]}")
    return 0


def cmd_portals(args) -> int:
    for p in PORTALS:
        print(f"[{p['kind']:<14}] {p['name']}\n    {p['url']}\n    {p['note']}\n")
    return 0


def cmd_dossier(args) -> int:
    status = dossier_status(store.load().get("dossier", {}))
    for item in status["items"]:
        mark = "x" if item["have"] else " "
        lead = f"  (lead time ~{item['lead_time_days']}d)" if item.get("lead_time_days") else ""
        print(f"[{mark}] {item['name']}{lead}\n      {item['note']}")
    if status["order_now"]:
        print("\nOrder these first: " + ", ".join(i["name"] for i in status["order_now"]))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(prog="apartment_search")
    sub = ap.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("add"); a.set_defaults(fn=cmd_add)
    a.add_argument("--url"); a.add_argument("--file"); a.add_argument("--address")

    sub.add_parser("list").set_defaults(fn=cmd_list)
    sub.add_parser("portals").set_defaults(fn=cmd_portals)
    sub.add_parser("dossier").set_defaults(fn=cmd_dossier)

    args = ap.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    raise SystemExit(main())
