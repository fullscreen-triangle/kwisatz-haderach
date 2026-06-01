"""
Shopping list optimizer.

Given a list of items with prices per store, calculates:
1. Cheapest per item (any store)
2. Cheapest single store (all items from one place)
3. Optimal split (minimize total cost, optionally penalizing extra store visits)

Usage:
  python -m tools.grocery_tracker.optimizer --list items.json --trip-cost 2.0
"""

from __future__ import annotations
import json
import sys
from itertools import combinations
from typing import Optional


def optimize(
    items: list[dict],
    trip_cost: float = 0.0,
) -> dict:
    """
    items: [{ "name": str, "qty": int, "prices": { "Rewe": 1.29, "Kaufland": 1.19, ... } }]
    trip_cost: extra cost (€) per additional store visit beyond the first
    """
    stores = set()
    for item in items:
        stores.update(item.get("prices", {}).keys())
    stores = sorted(stores)

    # 1. Global cheapest (ignore trip overhead)
    global_best = []
    total_any   = 0.0
    for item in items:
        prices = item.get("prices", {})
        if not prices:
            global_best.append({**item, "best_store": None, "best_price": None})
            continue
        best_store = min(prices, key=prices.__getitem__)
        best_price = prices[best_store]
        global_best.append({**item, "best_store": best_store, "best_price": round(best_price * item.get("qty", 1), 2)})
        total_any += best_price * item.get("qty", 1)

    # 2. Best single store
    single_store_totals = {}
    for store in stores:
        total = 0.0
        missing = 0
        for item in items:
            prices = item.get("prices", {})
            if store in prices:
                total += prices[store] * item.get("qty", 1)
            else:
                missing += 1
        single_store_totals[store] = {"total": round(total, 2), "missing": missing}

    best_single = min(
        ((s, d) for s, d in single_store_totals.items() if d["missing"] == 0),
        key=lambda x: x[1]["total"],
        default=(None, None),
    )
    if best_single[0] is None:  # some stores don't carry everything — pick fewest missing
        best_single = min(single_store_totals.items(), key=lambda x: (x[1]["missing"], x[1]["total"]))

    # 3. Optimal split with trip cost penalty
    # Enumerate 1..N store combinations, pick cheapest total + trip penalty
    best_split_cost  = float("inf")
    best_split_plan  = None
    best_split_stores = None

    for n_stores in range(1, len(stores) + 1):
        for combo in combinations(stores, n_stores):
            combo_set = set(combo)
            plan      = []
            total     = trip_cost * (n_stores - 1)  # first store free, extra stores cost trip_cost each
            feasible  = True

            for item in items:
                prices = {s: p for s, p in item.get("prices", {}).items() if s in combo_set}
                if not prices:
                    feasible = False
                    break
                best_s = min(prices, key=prices.__getitem__)
                best_p = prices[best_s]
                total += best_p * item.get("qty", 1)
                plan.append({"name": item["name"], "qty": item.get("qty", 1), "store": best_s, "price": round(best_p * item.get("qty", 1), 2)})

            if feasible and total < best_split_cost:
                best_split_cost   = total
                best_split_plan   = plan
                best_split_stores = list(combo)

    # Group the optimal plan by store
    store_lists: dict = {}
    if best_split_plan:
        for entry in best_split_plan:
            s = entry["store"]
            if s not in store_lists:
                store_lists[s] = {"items": [], "subtotal": 0.0}
            store_lists[s]["items"].append(entry)
            store_lists[s]["subtotal"] = round(store_lists[s]["subtotal"] + entry["price"], 2)

    savings_vs_single = round(single_store_totals.get(best_single[0], {}).get("total", 0) - best_split_cost, 2) if best_single[0] else 0

    return {
        "global_cheapest": {
            "items":  global_best,
            "total":  round(total_any, 2),
        },
        "best_single_store": {
            "store":   best_single[0],
            "total":   best_single[1]["total"] if best_single[1] else None,
            "missing": best_single[1]["missing"] if best_single[1] else None,
            "all":     single_store_totals,
        },
        "optimal_split": {
            "stores":       best_split_stores,
            "total":        round(best_split_cost, 2) if best_split_stores else None,
            "trip_cost":    trip_cost * (len(best_split_stores) - 1) if best_split_stores else 0,
            "grocery_cost": round(best_split_cost - trip_cost * (len(best_split_stores or []) - 1), 2),
            "by_store":     store_lists,
            "savings_vs_single": savings_vs_single,
        },
    }


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--list",      required=True, help="JSON file with items")
    p.add_argument("--trip-cost", type=float, default=2.0, help="Extra trip cost per additional store (€)")
    args = p.parse_args()
    items = json.loads(open(args.list).read())
    print(json.dumps(optimize(items, args.trip_cost), indent=2))
