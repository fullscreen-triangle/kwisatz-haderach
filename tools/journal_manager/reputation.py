"""
Journal reputation check via DOAJ public API.

DOAJ (Directory of Open Access Journals) lists journals that meet
basic quality and transparency criteria. A DOAJ listing is a necessary
but not sufficient quality indicator — it rules out the worst predatory
journals but not all low-quality ones.

API endpoint (no key required):
  https://doaj.org/api/v3/search/journals/{query}?pageSize=5

Returns None if the request fails (offline, timeout) — caller should
degrade gracefully.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from typing import Optional


_DOAJ_API = "https://doaj.org/api/v3/search/journals/{query}?pageSize=5"
_TIMEOUT = 8


@dataclass
class JournalReputation:
    journal_name: str
    in_doaj: bool
    publisher: str
    subjects: list[str]
    has_apc: Optional[bool]
    has_waiver: Optional[bool]
    issn_print: str
    issn_online: str
    source: str = "DOAJ"

    @property
    def reputation_label(self) -> str:
        if self.in_doaj:
            return "DOAJ-listed (meets basic quality criteria)"
        return "Not found in DOAJ"

    @property
    def reputation_icon(self) -> str:
        return "✅" if self.in_doaj else "❓"


def lookup(journal_name: str, verbose: bool = True) -> Optional[JournalReputation]:
    """Query DOAJ for a journal by name. Returns None on failure."""
    if not journal_name:
        return None
    try:
        import urllib.request
        import urllib.parse
    except ImportError:
        return None

    query = urllib.parse.quote(journal_name)
    url = _DOAJ_API.format(query=query)

    if verbose:
        print(f"  → Checking DOAJ for: {journal_name!r} ...", file=sys.stderr)

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "journal-manager/1.0 (personal research tool)"},
        )
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        if verbose:
            print(f"  ⚠  DOAJ lookup failed: {exc}", file=sys.stderr)
        return None

    results = data.get("results", [])
    if not results:
        if verbose:
            print("  ℹ  No results found in DOAJ.", file=sys.stderr)
        return None

    # Use the best match (first result)
    best = results[0]
    bib = best.get("bibjson", {})

    subjects = [
        s.get("term", "")
        for s in bib.get("subject", [])
        if s.get("term")
    ]

    apc_info = bib.get("apc", {})
    waiver_info = bib.get("waiver", {})

    identifiers = bib.get("identifier", [])
    issn_p = next((i["id"] for i in identifiers if i.get("type") == "pissn"), "")
    issn_e = next((i["id"] for i in identifiers if i.get("type") == "eissn"), "")

    rep = JournalReputation(
        journal_name=bib.get("title", journal_name),
        in_doaj=True,
        publisher=bib.get("publisher", {}).get("name", ""),
        subjects=subjects[:5],
        has_apc=apc_info.get("has_apc"),
        has_waiver=waiver_info.get("has_waiver"),
        issn_print=issn_p,
        issn_online=issn_e,
    )

    if verbose:
        print(f"  ✓  Found: {rep.journal_name} ({rep.publisher})", file=sys.stderr)

    return rep


def beall_check(publisher_or_journal: str) -> Optional[str]:
    """
    Check against a small hardcoded list of known predatory publishers.
    This is not exhaustive — it catches the most flagrant offenders only.
    For a full check, consult: https://beallslist.net
    """
    text = publisher_or_journal.lower()
    known_predatory = [
        "omics", "longdom", "imedpub", "hilaris", "sciforschenonline",
        "pulsus", "crimson", "gavin", "remedy", "herald", "edelweiss",
        "insight medical", "science publications", "american research",
        "world journal of", "global journal of",  # frequent pattern
        "scientific online", "online publishing",
        "science alert", "intech", "bentham science",
    ]
    for pred in known_predatory:
        if pred in text:
            return f"Publisher/journal name matches known predatory pattern: '{pred}'"
    return None
