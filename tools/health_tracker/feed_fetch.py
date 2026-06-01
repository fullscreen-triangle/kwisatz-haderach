"""
Research feed fetcher — pulls recent papers from arXiv, bioRxiv, PubMed RSS.

Usage (from repo root):
  python -m tools.health_tracker.feed_fetch

Outputs JSON to stdout. Cached for 2 hours.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from datetime import datetime

try:
    import feedparser
except ImportError:
    print(json.dumps({"error": "feedparser not installed — run: pip install feedparser"}))
    sys.exit(1)

CACHE_DIR = Path(__file__).parent / "data"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_FILE = CACHE_DIR / "feed_cache.json"
CACHE_TTL  = 7200  # 2 hours

FEEDS = [
    {
        "name":  "arXiv · cs.LG",
        "url":   "https://rss.arxiv.org/rss/cs.LG",
        "color": "#60a5fa",
    },
    {
        "name":  "arXiv · q-bio",
        "url":   "https://rss.arxiv.org/rss/q-bio",
        "color": "#4ade80",
    },
    {
        "name":  "bioRxiv · bioinformatics",
        "url":   "https://connect.biorxiv.org/biorxiv_xml.php?subject=bioinformatics",
        "color": "#fbbf24",
    },
    {
        "name":  "Nature · news",
        "url":   "https://www.nature.com/nature.rss",
        "color": "#a78bfa",
    },
    {
        "name":  "PubMed · lipidomics",
        "url":   "https://pubmed.ncbi.nlm.nih.gov/rss/search/1DsOWMlxEa6yWO4NqK9KnAZ2yrVGTtcfBpSYjsxX3WkCUkT_jf/?limit=15&utm_campaign=pubmed-2&fc=20240101000000",
        "color": "#fb923c",
    },
]


def _fetch_feed(feed: dict, limit: int = 8) -> list[dict]:
    try:
        parsed = feedparser.parse(feed["url"])
        items  = []
        for entry in parsed.entries[:limit]:
            published = entry.get("published", entry.get("updated", ""))
            items.append({
                "title":     entry.get("title", "").strip(),
                "link":      entry.get("link", ""),
                "published": published,
                "summary":   (entry.get("summary", "") or "")[:220].strip(),
                "source":    feed["name"],
                "color":     feed["color"],
            })
        return items
    except Exception as e:
        return [{"error": str(e), "source": feed["name"]}]


def main():
    # Serve cache if fresh
    if CACHE_FILE.exists():
        raw = json.loads(CACHE_FILE.read_text())
        if time.time() - raw.get("_ts", 0) < CACHE_TTL:
            print(json.dumps(raw["items"]))
            return

    all_items = []
    for feed in FEEDS:
        all_items.extend(_fetch_feed(feed))

    # Sort by recency if possible (leave in source order otherwise)
    output = {"_ts": time.time(), "items": all_items}
    CACHE_FILE.write_text(json.dumps(output, indent=2))
    print(json.dumps(all_items))


if __name__ == "__main__":
    main()
