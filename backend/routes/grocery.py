import subprocess
import json
import asyncio
from pathlib import Path
from fastapi import APIRouter, Query, HTTPException
from typing import Optional

router = APIRouter()
ROOT = Path(__file__).parent.parent.parent

FIXED_ITEMS = [
    {"key": "eggs",      "query": "Eier 10 Stück",       "label": "Eggs"},
    {"key": "chicken",   "query": "Hähnchenschenkel",     "label": "Chicken Thighs"},
    {"key": "baguette",  "query": "Baguette",              "label": "Baguette"},
    {"key": "potatoes",  "query": "Kartoffeln 1kg",        "label": "Potatoes 1kg"},
    {"key": "doener",    "query": "Döner",                 "label": "Döner"},
    {"key": "magnesium", "query": "Magnesium 500mg",       "label": "Magnesium 500mg"},
    {"key": "vitamind",  "query": "Vitamin D3 1000 IE",    "label": "Vitamin D3"},
    {"key": "hairvit",   "query": "Haar Vitamine",         "label": "Hair Vitamins"},
    {"key": "probiotic", "query": "Darmflora Probiotika",  "label": "Probiotics"},
]


def _search_sync(query: str, stores: str = "rewe,kaufland,penny", limit: int = 3) -> dict:
    cmd = [
        "python", "-m", "tools.grocery_tracker.price_lookup",
        "--query", query,
        "--stores", stores,
        "--limit", str(limit),
    ]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=25)
    try:
        return json.loads(result.stdout)
    except Exception:
        return {"results": {}, "error": result.stderr[:200]}


@router.get("/search")
def search(
    q: str = Query(..., description="Search query"),
    stores: str = Query("rewe,kaufland,penny", description="Comma-separated store list"),
    limit: int = Query(5),
):
    return _search_sync(q, stores, limit)


@router.get("/batch")
async def batch_prices():
    """Fetch cheapest price for all fixed grocery items in parallel."""
    loop = asyncio.get_event_loop()

    async def search_one(item):
        data = await loop.run_in_executor(None, _search_sync, item["query"])
        all_results = []
        for store_results in (data.get("results") or {}).values():
            if isinstance(store_results, list):
                all_results.extend(r for r in store_results if r.get("price") is not None)
        if not all_results:
            return {**item, "result": None}
        all_results.sort(key=lambda r: r.get("unit_price") or r.get("price") or 999)
        return {**item, "result": all_results[0]}

    results = await asyncio.gather(*[search_one(item) for item in FIXED_ITEMS])
    return {"items": results}
