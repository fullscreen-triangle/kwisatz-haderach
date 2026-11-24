"""
/finance — personal finance (tools/finance): position, debt plan, money owed, bank imports, parcels.

  GET  /finance/overview                       net position, monthly picture, alerts
  GET  /finance/plan?monthly=&lump=YYYY-MM=A    debt payoff plan (lump may repeat)
  GET  /finance/afford?price=&monthly=          what spending `price` now costs
  POST /finance/receivables/{id}/log            {action, note, date}
  POST /finance/receivables/{id}/payment        {amount, date, note}
  POST /finance/import                          {filename, text} — a Sparkasse or Revolut CSV
  GET  /finance/transactions?limit=
  GET  /finance/deliveries
  POST /finance/deliveries/scan                 {since} — read the desk's mail store

The data lives in $FINANCE_HOME or ~/.desk/finance, outside the repository. Nothing here
moves money or buys anything.

The desk's routes have no login. Because this one holds the user's money, it answers
only callers on this machine or on the tailnet (FINANCE_ALLOWED_NETS, comma-separated
CIDRs, overrides the default). On server-2 the web front end calls from loopback, so the
desk works; a node bound to 0.0.0.0 (deploy/vm-install.sh) refuses the internet with 403.
"""

import ipaddress
import os
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from tools.finance import banks, book, deliveries, plan
from tools.finance.store import Store

DEFAULT_NETS = "127.0.0.0/8,::1/128,100.64.0.0/10,fd7a:115c:a1e0::/48"  # loopback + Tailscale


def _allowed_nets():
    raw = os.getenv("FINANCE_ALLOWED_NETS", DEFAULT_NETS)
    return [ipaddress.ip_network(n.strip(), strict=False) for n in raw.split(",") if n.strip()]


def local_only(request: Request) -> None:
    """Refuse callers outside loopback and the tailnet (or FINANCE_ALLOWED_NETS)."""
    host = request.client.host if request.client else ""
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        raise HTTPException(status_code=403, detail="finance answers this machine and the tailnet only")
    if not any(ip in net for net in _allowed_nets()):
        raise HTTPException(status_code=403, detail="finance answers this machine and the tailnet only")


router = APIRouter(dependencies=[Depends(local_only)])


def _store() -> Store:
    return Store()  # re-reads FINANCE_HOME on every call, so tests and nodes can point it elsewhere


def _bad(exc: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc).strip("'\""))


class LogEntry(BaseModel):
    action: str
    note: str = ""
    date: Optional[str] = None


class Payment(BaseModel):
    amount: str
    date: Optional[str] = None
    note: str = ""


class Upload(BaseModel):
    filename: str
    text: str


class Scan(BaseModel):
    since: Optional[str] = None


@router.get("/overview")
def overview():
    return plan.overview(_store().position())


@router.get("/plan")
def payoff(monthly: Optional[str] = None, lump: List[str] = Query(default=[])):
    pos = _store().position()
    try:
        lumps = dict(item.split("=", 1) for item in lump)
        budget = monthly or pos.get("settings", {}).get("monthly_to_debt")
        return plan.payoff(pos, monthly_to_debt=budget, lump_sums=lumps).as_json()
    except ValueError as exc:
        raise _bad(exc)


@router.get("/afford")
def afford(price: str, monthly: Optional[str] = None):
    try:
        return plan.afford(_store().position(), price, monthly_to_debt=monthly)
    except ValueError as exc:
        raise _bad(exc)


@router.post("/receivables/{ident}/log")
def log(ident: str, entry: LogEntry):
    store = _store()
    pos = store.position()
    try:
        changed = book.log_receivable(pos, ident, entry.action, entry.note, entry.date)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc).strip("'\""))
    except ValueError as exc:
        raise _bad(exc)
    store.save_position(pos)
    return changed


@router.post("/receivables/{ident}/payment")
def payment(ident: str, p: Payment):
    store = _store()
    pos = store.position()
    try:
        changed = book.receive(pos, ident, p.amount, p.date, p.note)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc).strip("'\""))
    except ValueError as exc:
        raise _bad(exc)
    store.save_position(pos)
    return changed


@router.post("/import")
def import_export(u: Upload):
    if len(u.text) > 20_000_000:
        raise HTTPException(status_code=413, detail="export too large")
    try:
        new = banks.parse(u.text.encode("utf-8"))
    except (ValueError, banks.UnknownFormat) as exc:
        raise _bad(exc)
    store = _store()
    rows, added = banks.merge(store.transactions(), new)
    store.save_transactions(rows)
    return {"file": u.filename, "rows": len(new), "added": added, "total": len(rows),
            "by_month": banks.summary(rows)}


@router.get("/transactions")
def transactions(limit: int = 50):
    rows = _store().transactions()
    limit = max(1, min(limit, 1000))
    return {"total": len(rows), "by_month": banks.summary(rows), "latest": rows[-limit:][::-1]}


@router.get("/deliveries")
def parcels():
    return {"parcels": deliveries.listing(_store().deliveries())}


@router.post("/deliveries/scan")
def scan(s: Scan):
    from backend.keeper.service import state_dir  # the mail store lives in the node's state dir

    db = state_dir() / "mail" / "mail.db"
    if not db.exists():
        raise HTTPException(status_code=404, detail="no mail store on this node yet")
    since = s.since or (date.today() - timedelta(days=60)).isoformat()
    store = _store()
    current = store.deliveries()
    try:
        report = deliveries.scan_mail_db(db, current, since=since)
    except ValueError as exc:
        raise _bad(exc)
    store.save_deliveries(current)
    return {"scan": report, "parcels": deliveries.listing(current)}
