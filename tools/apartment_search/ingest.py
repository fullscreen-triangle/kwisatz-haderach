"""
stdin -> stdout JSON bridge for the Next API route.

Reads {"url": ..., "text": ..., "address": ...} on stdin, fetches when only a URL
was given, parses, scores, stores, and prints the stored entry as JSON. Keeps all
parsing and scoring in Python so the web layer never re-implements it.

Everything diagnostic goes to stderr — stdout must stay pure JSON.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# German listings are full of umlauts, and on Windows stdio defaults to the console
# codepage (cp1252), which corrupts them into bytes the Node bridge cannot JSON-parse.
# Force UTF-8 on both ends before any I/O happens.
for _stream in (sys.stdin, sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.apartment_search import store
from tools.apartment_search.parser import parse_listing
from tools.apartment_search.scorer import score_listing


def _fetch(url: str) -> str | None:
    try:
        from tools.job_assistant.scraper import fetch_job_text
        return fetch_job_text(url, verbose=False)
    except ImportError:
        return None


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print(json.dumps({"error": "Malformed request."}))
        return 1

    url = (payload.get("url") or "").strip()
    text = payload.get("text") or ""

    if not text and url:
        text = _fetch(url) or ""

    if not text:
        print(json.dumps({"error":
            "Could not read the listing. The portal likely requires JavaScript or blocks "
            "automated requests — copy the listing text and paste it instead of the URL."}))
        return 1

    listing = parse_listing(text)
    listing["url"] = url
    if payload.get("address"):
        listing["address"] = payload["address"]

    assessment = score_listing(listing)
    entry = store.add_listing({
        **listing,
        "score": assessment["score"],
        "recommendation": assessment["recommendation"],
        "assessment": assessment,
    })

    print(json.dumps({"ok": True, "listing": entry}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
