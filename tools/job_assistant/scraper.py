"""Fetch job posting text from a URL.

Strategy:
  1. Try a plain HTTP GET with a browser-like User-Agent.
  2. Strip HTML tags, collapse whitespace.
  3. If the result is too short (< 300 chars) or the request fails, return None
     so the caller can fall back to paste mode.

No headless browser dependency — if the site requires JavaScript rendering
(LinkedIn, Glassdoor) this will gracefully return None.
"""

from __future__ import annotations

import re
import sys
from typing import Optional

_MIN_CONTENT_CHARS = 300

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def fetch_job_text(url: str, verbose: bool = True) -> Optional[str]:
    """Return plain text of a job posting, or None if fetch/parse failed."""
    try:
        import requests
    except ImportError:
        if verbose:
            print("  ⚠  'requests' not installed — pip install requests", file=sys.stderr)
        return None

    if verbose:
        print(f"  → Fetching {url} ...", file=sys.stderr)

    try:
        resp = requests.get(url, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as exc:
        if verbose:
            print(f"  ✗  HTTP error: {exc}", file=sys.stderr)
        return None

    raw_html = resp.text
    text = _strip_html(raw_html)

    if len(text) < _MIN_CONTENT_CHARS:
        if verbose:
            print(
                f"  ⚠  Fetched only {len(text)} chars — site may require JavaScript or login.",
                file=sys.stderr,
            )
        return None

    if verbose:
        print(f"  ✓  {len(text)} chars extracted", file=sys.stderr)
    return text


def _strip_html(html: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        # Remove script/style blocks
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ")
    except ImportError:
        # Fallback: crude regex strip
        text = re.sub(r"<[^>]+>", " ", html)

    # Collapse whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def paste_job_text() -> str:
    """Prompt user to paste job description text interactively."""
    print()
    print("  Paste the job description below.")
    print("  When done, enter a line with just END and press Enter:")
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
    return "\n".join(lines)
