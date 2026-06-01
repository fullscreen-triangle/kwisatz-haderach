"""
Grocery price lookup — queries German supermarket APIs and caches results.

Usage (from repo root):
  python -m tools.grocery_tracker.price_lookup --query "butter" --stores rewe,kaufland

Returns JSON to stdout.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

try:
    import requests
except ImportError:
    print(json.dumps({"error": "requests not installed — run: pip install requests"}))
    sys.exit(1)

CACHE_DIR = Path(__file__).parent / "data"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_TTL  = 6 * 3600  # 6 hours

HEADERS_BROWSER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept":     "application/json, text/plain, */*",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
}

HEADERS_REWE = {
    **HEADERS_BROWSER,
    "Referer":   "https://shop.rewe.de/",
    "Origin":    "https://shop.rewe.de",
    "rd-market-id": os.environ.get("REWE_MARKET_ID", ""),  # optional: set your local Rewe market ID
    "rd-service-types": "DELIVERY",
}


# ── Unit normalisation ────────────────────────────────────────────────────────

def parse_unit_price(name: str, price: float, quantity_str: str = "") -> Optional[float]:
    """Return price per 100g / 100ml / piece where possible."""
    text = (name + " " + quantity_str).lower()
    m = re.search(r'(\d+[\.,]?\d*)\s*(kg|g|ml|l|cl|piece|stück|stk)', text)
    if not m:
        return None
    val   = float(m.group(1).replace(',', '.'))
    unit  = m.group(2)
    if unit == 'kg':   return round(price / val / 10, 4)    # per 100g
    if unit == 'g':    return round(price / val * 100, 4)   # per 100g
    if unit == 'l':    return round(price / val / 10, 4)    # per 100ml
    if unit == 'cl':   return round(price / val * 10, 4)    # per 100ml
    if unit == 'ml':   return round(price / val * 100, 4)   # per 100ml
    return None


# ── Rewe ──────────────────────────────────────────────────────────────────────

def search_rewe(query: str, limit: int = 6) -> list[dict]:
    try:
        r = requests.get(
            "https://mobile-api.rewe.de/api/v3/products",
            params={"search": query, "paging.offset": 0, "paging.limit": limit},
            headers=HEADERS_REWE,
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()

        products = []
        for item in (data.get("products") or data.get("items") or []):
            pricing = item.get("pricing", {})
            price   = pricing.get("price") or pricing.get("currentRetailPrice")
            if price is None:
                continue
            price = price / 100 if price > 1000 else price  # sometimes in cents

            name  = item.get("name") or item.get("productName") or ""
            grammage = item.get("grammage") or item.get("quantityAndUnit") or ""
            products.append({
                "store":      "Rewe",
                "name":       name,
                "brand":      item.get("brand") or "",
                "price":      round(float(price), 2),
                "quantity":   grammage,
                "unit_price": parse_unit_price(name, float(price), grammage),
                "image":      (item.get("media") or [{}])[0].get("url") if item.get("media") else None,
                "url":        f"https://shop.rewe.de/p/{item.get('id','')}",
            })
        return products
    except Exception as e:
        return [{"store": "Rewe", "error": str(e)}]


# ── Kaufland ──────────────────────────────────────────────────────────────────

def search_kaufland(query: str, limit: int = 6) -> list[dict]:
    try:
        r = requests.get(
            "https://www.kaufland.de/api/v2/products",
            params={
                "page[number]": 1,
                "page[size]":   limit,
                "filter[term]": query,
                "include":      "items",
            },
            headers=HEADERS_BROWSER,
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()

        products = []
        for item in (data.get("data") or []):
            attrs  = item.get("attributes", {})
            price  = attrs.get("price")
            if price is None:
                continue
            name  = attrs.get("title") or attrs.get("name") or ""
            qty   = attrs.get("amount_with_unit") or attrs.get("amount") or ""
            products.append({
                "store":      "Kaufland",
                "name":       name,
                "brand":      attrs.get("brand") or "",
                "price":      round(float(price), 2),
                "quantity":   qty,
                "unit_price": parse_unit_price(name, float(price), qty),
                "image":      attrs.get("thumbnail") or None,
                "url":        f"https://www.kaufland.de{attrs.get('url', '')}",
            })
        return products
    except Exception as e:
        return [{"store": "Kaufland", "error": str(e)}]


# ── Penny (shares Rewe infrastructure) ───────────────────────────────────────

def search_penny(query: str, limit: int = 6) -> list[dict]:
    try:
        r = requests.get(
            "https://www.penny.de/api/products/search",
            params={"search": query, "limit": limit},
            headers={**HEADERS_BROWSER, "Referer": "https://www.penny.de/"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()

        products = []
        for item in (data.get("products") or data.get("results") or []):
            price = item.get("price") or item.get("currentPrice")
            if price is None:
                continue
            price = float(price) / 100 if float(price) > 100 else float(price)
            name  = item.get("name") or item.get("title") or ""
            qty   = item.get("grammage") or ""
            products.append({
                "store":      "Penny",
                "name":       name,
                "brand":      item.get("brand") or "",
                "price":      round(price, 2),
                "quantity":   qty,
                "unit_price": parse_unit_price(name, price, qty),
                "image":      item.get("image") or None,
                "url":        f"https://www.penny.de{item.get('url', '')}",
            })
        return products
    except Exception as e:
        return [{"store": "Penny", "error": str(e)}]


# ── Amazon.de (PA API) ────────────────────────────────────────────────────────

def search_amazon(query: str, limit: int = 5) -> list[dict]:
    """Requires AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG in env."""
    access = os.environ.get("AMAZON_ACCESS_KEY")
    secret = os.environ.get("AMAZON_SECRET_KEY")
    tag    = os.environ.get("AMAZON_PARTNER_TAG")

    if not (access and secret and tag):
        return [{"store": "Amazon", "error": "not_configured",
                 "hint": "Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG in .env.local — free Amazon Associates account required"}]

    try:
        # Use python-amazon-paapi if available
        import paapi5_python_sdk
        from paapi5_python_sdk.api.default_api import DefaultApi
        from paapi5_python_sdk.models.search_items_request import SearchItemsRequest
        from paapi5_python_sdk.models.partner_type import PartnerType
        from paapi5_python_sdk.models.resources import Resources

        config = paapi5_python_sdk.Configuration()
        config.access_key = access
        config.secret_key = secret

        client = paapi5_python_sdk.ApiClient(configuration=config)
        api    = DefaultApi(api_client=client)

        req = SearchItemsRequest(
            partner_tag=tag, partner_type=PartnerType.ASSOCIATES,
            marketplace="www.amazon.de", keywords=query,
            item_count=limit,
            resources=[Resources.ITEMINFO_TITLE, Resources.OFFERS_LISTINGS_PRICE, Resources.IMAGES_PRIMARY_SMALL],
        )
        resp   = api.search_items(req)
        result = []

        for item in (resp.search_result.items or []):
            price = None
            try:
                price = item.offers.listings[0].price.amount
            except (AttributeError, IndexError, TypeError):
                pass
            result.append({
                "store":      "Amazon",
                "name":       item.item_info.title.display_value if item.item_info else query,
                "brand":      "",
                "price":      round(float(price), 2) if price else None,
                "quantity":   "",
                "unit_price": None,
                "image":      item.images.primary.small.url if item.images else None,
                "url":        item.detail_page_url or "",
            })
        return result

    except ImportError:
        return [{"store": "Amazon", "error": "not_configured",
                 "hint": "pip install paapi5-python-sdk and set AMAZON_* keys in .env.local"}]
    except Exception as e:
        return [{"store": "Amazon", "error": str(e)}]


# ── Open Food Facts — product normalisation ───────────────────────────────────

def get_off_product(barcode: str) -> Optional[dict]:
    """Look up product details by barcode."""
    try:
        r = requests.get(
            f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json",
            headers={"User-Agent": "desk-grocery/1.0"},
            timeout=8,
        )
        d = r.json().get("product", {})
        return {
            "name":  d.get("product_name_de") or d.get("product_name") or "",
            "brand": d.get("brands") or "",
            "quantity": d.get("quantity") or "",
            "nutriscore": d.get("nutriscore_grade") or "",
        }
    except:
        return None


# ── Cache ─────────────────────────────────────────────────────────────────────

def cache_key(query: str, store: str) -> Path:
    safe = re.sub(r'[^\w]', '_', f"{store}_{query}").lower()
    return CACHE_DIR / f"price_{safe}.json"


def load_cached(query: str, store: str) -> Optional[list]:
    p = cache_key(query, store)
    if p.exists() and (time.time() - p.stat().st_mtime) < CACHE_TTL:
        return json.loads(p.read_text())
    return None


def save_cached(query: str, store: str, data: list) -> None:
    cache_key(query, store).write_text(json.dumps(data, indent=2))


# ── Main ──────────────────────────────────────────────────────────────────────

STORE_FN = {
    "rewe":     search_rewe,
    "kaufland": search_kaufland,
    "penny":    search_penny,
    "amazon":   search_amazon,
}


def search_all(query: str, stores: list[str] | None = None, limit: int = 5) -> dict:
    stores = stores or list(STORE_FN.keys())
    results: dict = {}

    for store in stores:
        fn  = STORE_FN.get(store)
        if not fn:
            continue
        cached = load_cached(query, store)
        if cached is not None:
            results[store] = cached
            continue
        items = fn(query, limit)
        if items and not (len(items) == 1 and "error" in items[0]):
            save_cached(query, store, items)
        results[store] = items

    return {"query": query, "results": results, "ts": time.time()}


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--query",  required=True)
    p.add_argument("--stores", default="rewe,kaufland,penny,amazon")
    p.add_argument("--limit",  type=int, default=5)
    args = p.parse_args()

    stores = [s.strip() for s in args.stores.split(",")]
    out    = search_all(args.query, stores, args.limit)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
