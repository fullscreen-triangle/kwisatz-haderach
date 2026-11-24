"""Command line: ``python -m tools.finance <command>``. Every command prints JSON.

    show                                   net position, monthly picture, alerts
    plan [--monthly A] [--lump YYYY-MM=A]  debt payoff plan
    afford PRICE [--monthly A]             what spending PRICE now costs
    debt ID [--name N] [--balance A] [--rate R] [--basis assumed|contract]
            [--min-fixed A | --min-percent P --min-floor A]
    owed ID [--debtor D] [--what W] [--amount A] [--due DATE] [--deadline DATE] [--status S]
    log ID ACTION [--note N] [--date DATE]   ACTION: note reminded claimed-in-writing promised escalated
    received ID AMOUNT [--date DATE] [--note N]
    invest ID [--name N] [--value A] [--as-of DATE] [--source S]
    income [--net A] [--fixed NAME=A ...]
    setting monthly_to_debt A
    import FILE ...                        Sparkasse or Revolut CSV
    transactions [--limit N]
    deliveries [--scan MAIL_DB] [--since DATE]

Data lives in $FINANCE_HOME or ~/.desk/finance, never in the repository. Exit code 1
on a refused input, with ``{"error": ...}`` on stdout.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Sequence

from . import banks, book, deliveries, plan
from .store import Store


def _kv(items: Sequence[str]) -> dict[str, str]:
    out = {}
    for item in items:
        if "=" not in item:
            raise ValueError(f"expected KEY=VALUE, got {item!r}")
        k, v = item.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="python -m tools.finance", description=__doc__.split("\n")[0])
    p.add_argument("--home", type=Path, help="data directory (default $FINANCE_HOME or ~/.desk/finance)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("show")
    s = sub.add_parser("plan")
    s.add_argument("--monthly")
    s.add_argument("--lump", action="append", default=[])
    s = sub.add_parser("afford")
    s.add_argument("price")
    s.add_argument("--monthly")
    s = sub.add_parser("debt")
    s.add_argument("id")
    s.add_argument("--name")
    s.add_argument("--creditor")
    s.add_argument("--balance")
    s.add_argument("--rate", help="annual effective rate as a fraction, e.g. 0.23")
    s.add_argument("--basis", choices=["assumed", "contract"])
    s.add_argument("--min-fixed")
    s.add_argument("--min-percent")
    s.add_argument("--min-floor", default="0")
    s = sub.add_parser("owed")
    s.add_argument("id")
    s.add_argument("--debtor")
    s.add_argument("--what")
    s.add_argument("--amount")
    s.add_argument("--due")
    s.add_argument("--deadline")
    s.add_argument("--status", choices=book.RECEIVABLE_STATUSES)
    s = sub.add_parser("log")
    s.add_argument("id")
    s.add_argument("action", choices=[a for a in book.LOG_ACTIONS if a != "payment"])
    s.add_argument("--note", default="")
    s.add_argument("--date")
    s = sub.add_parser("received")
    s.add_argument("id")
    s.add_argument("amount")
    s.add_argument("--date")
    s.add_argument("--note", default="")
    s = sub.add_parser("invest")
    s.add_argument("id")
    s.add_argument("--name")
    s.add_argument("--value")
    s.add_argument("--as-of")
    s.add_argument("--source")
    s = sub.add_parser("income")
    s.add_argument("--net")
    s.add_argument("--fixed", action="append", default=[])
    s = sub.add_parser("setting")
    s.add_argument("key")
    s.add_argument("value")
    s = sub.add_parser("import")
    s.add_argument("files", nargs="+", type=Path)
    s = sub.add_parser("transactions")
    s.add_argument("--limit", type=int, default=50)
    s = sub.add_parser("deliveries")
    s.add_argument("--scan", type=Path, metavar="MAIL_DB")
    s.add_argument("--since")
    return p


def run(argv: Sequence[str] | None = None) -> dict:
    args = _parser().parse_args(argv)
    store = Store(args.home)
    pos = store.position()
    if args.cmd == "show":
        return plan.overview(pos)
    if args.cmd == "plan":
        lumps = _kv(args.lump)
        monthly = args.monthly or pos.get("settings", {}).get("monthly_to_debt")
        return plan.payoff(pos, monthly_to_debt=monthly, lump_sums=lumps).as_json()
    if args.cmd == "afford":
        return plan.afford(pos, args.price, monthly_to_debt=args.monthly)
    if args.cmd == "import":
        rows = store.transactions()
        report = []
        for f in args.files:
            new = banks.import_file(f)
            rows, added = banks.merge(rows, new)
            report.append({"file": f.name, "rows": len(new), "added": added})
        store.save_transactions(rows)
        return {"imported": report, "total": len(rows), "by_month": banks.summary(rows)}
    if args.cmd == "transactions":
        rows = store.transactions()
        return {"total": len(rows), "by_month": banks.summary(rows), "latest": rows[-args.limit:][::-1]}
    if args.cmd == "deliveries":
        parcels = store.deliveries()
        result: dict = {}
        if args.scan:
            since = args.since or (date.today() - timedelta(days=60)).isoformat()
            result["scan"] = deliveries.scan_mail_db(args.scan, parcels, since=since)
            store.save_deliveries(parcels)
        result["parcels"] = deliveries.listing(parcels)
        return result

    # the rest change the position
    if args.cmd == "debt":
        minimum = None
        if args.min_percent is not None:
            minimum = {"kind": "percent", "percent": args.min_percent, "floor": args.min_floor}
        elif args.min_fixed is not None:
            minimum = {"kind": "fixed", "amount": args.min_fixed}
        changed = book.set_debt(pos, args.id, name=args.name, creditor=args.creditor, balance=args.balance,
                                annual_rate=args.rate, rate_basis=args.basis, minimum=minimum)
    elif args.cmd == "owed":
        changed = book.set_receivable(pos, args.id, debtor=args.debtor, what=args.what, amount=args.amount,
                                      due=args.due, claim_deadline=args.deadline, status=args.status)
    elif args.cmd == "log":
        changed = book.log_receivable(pos, args.id, args.action, args.note, args.date)
    elif args.cmd == "received":
        changed = book.receive(pos, args.id, args.amount, args.date, args.note)
    elif args.cmd == "invest":
        changed = book.set_investment(pos, args.id, name=args.name, value=args.value,
                                      as_of=args.as_of, source=args.source)
    elif args.cmd == "income":
        changed = book.set_income(pos, monthly_net=args.net, fixed=_kv(args.fixed))
    elif args.cmd == "setting":
        changed = book.set_setting(pos, args.key, args.value)
    else:  # pragma: no cover - argparse rejects unknown commands
        raise ValueError(args.cmd)
    store.save_position(pos)
    return {"saved": changed}


def main(argv: Sequence[str] | None = None) -> int:
    try:
        out = run(argv)
    except (ValueError, KeyError, banks.UnknownFormat) as exc:
        print(json.dumps({"error": str(exc).strip("'\"")}, ensure_ascii=False))
        return 1
    print(json.dumps(out, indent=2, ensure_ascii=False, default=str))
    return 0
