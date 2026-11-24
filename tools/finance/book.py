"""Changes to the position: debts, money owed to the user, investments, income, settings.

Every function takes the position dict, changes it and returns the changed entry; the
caller saves. Amounts are validated and stored as two-decimal strings, dates as ISO.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from .store import fmt, money, slug

RECEIVABLE_STATUSES = ("open", "partly-paid", "paid", "written-off")
LOG_ACTIONS = ("note", "reminded", "claimed-in-writing", "promised", "payment", "escalated")


def _iso(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return date.fromisoformat(str(value)).isoformat()


def _find(items: list[dict], ident: str, kind: str) -> dict:
    for item in items:
        if item["id"] == ident:
            return item
    raise KeyError(f"no {kind} with id {ident!r}")


def set_debt(position: dict, ident: str, *, name: str | None = None, creditor: str | None = None,
             balance: Any = None, annual_rate: Any = None, rate_basis: str | None = None,
             minimum: dict | None = None, as_of: Any = None) -> dict:
    """Create or update a debt. ``annual_rate`` is a fraction (0.23 for 23 %)."""
    debts = position.setdefault("debts", [])
    ident = slug(ident)
    try:
        d = _find(debts, ident, "debt")
    except KeyError:
        if balance is None or annual_rate is None:
            raise ValueError("a new debt needs a balance and an annual rate") from None
        d = {"id": ident, "name": name or ident, "rate_basis": "contract",
             "minimum": {"kind": "fixed", "amount": "0.00"}}
        debts.append(d)
    if name is not None:
        d["name"] = name
    if creditor is not None:
        d["creditor"] = creditor
    if balance is not None:
        if money(balance) < 0:
            raise ValueError("a balance cannot be negative")
        d["balance"] = fmt(money(balance))
    if annual_rate is not None:
        r = money(annual_rate)
        if not 0 <= r < 1:
            raise ValueError("give the annual rate as a fraction, e.g. 0.23 for 23 %")
        d["annual_rate"] = str(r)
    if rate_basis is not None:
        if rate_basis not in ("assumed", "contract"):
            raise ValueError("rate basis is 'assumed' or 'contract'")
        d["rate_basis"] = rate_basis
    if minimum is not None:
        if minimum.get("kind") == "percent":
            d["minimum"] = {"kind": "percent", "percent": str(money(minimum["percent"])),
                            "floor": fmt(money(minimum.get("floor", 0)))}
        else:
            d["minimum"] = {"kind": "fixed", "amount": fmt(money(minimum.get("amount", 0)))}
    d["as_of"] = _iso(as_of) or d.get("as_of") or date.today().isoformat()
    return d


def set_receivable(position: dict, ident: str, *, debtor: str | None = None, what: str | None = None,
                   amount: Any = None, due: Any = None, claim_deadline: Any = None,
                   status: str | None = None) -> dict:
    items = position.setdefault("receivables", [])
    ident = slug(ident)
    try:
        r = _find(items, ident, "receivable")
    except KeyError:
        if amount is None:
            raise ValueError("a new receivable needs an amount") from None
        r = {"id": ident, "debtor": "", "what": ident, "received": "0.00", "status": "open", "log": []}
        items.append(r)
    if debtor is not None:
        r["debtor"] = debtor
    if what is not None:
        r["what"] = what
    if amount is not None:
        r["amount"] = fmt(money(amount))
    if due is not None:
        r["due"] = _iso(due)
    if claim_deadline is not None:
        r["claim_deadline"] = _iso(claim_deadline)
    if status is not None:
        if status not in RECEIVABLE_STATUSES:
            raise ValueError(f"status is one of {RECEIVABLE_STATUSES}")
        r["status"] = status
    return r


def log_receivable(position: dict, ident: str, action: str, note: str = "", when: Any = None) -> dict:
    """Record something done about money owed: a reminder, a written claim, a promise."""
    if action not in LOG_ACTIONS:
        raise ValueError(f"action is one of {LOG_ACTIONS}")
    r = _find(position.get("receivables", []), slug(ident), "receivable")
    entry = {"date": _iso(when) or date.today().isoformat(), "action": action, "note": note}
    r.setdefault("log", []).append(entry)
    return r


def receive(position: dict, ident: str, amount: Any, when: Any = None, note: str = "") -> dict:
    """Money owed arrived, in full or in part."""
    r = _find(position.get("receivables", []), slug(ident), "receivable")
    got = money(amount)
    if got <= 0:
        raise ValueError("a payment must be positive")
    r["received"] = fmt(money(r.get("received", 0)) + got)
    outstanding = money(r["amount"]) - money(r["received"])
    r["status"] = "paid" if outstanding <= 0 else "partly-paid"
    r.setdefault("log", []).append({"date": _iso(when) or date.today().isoformat(), "action": "payment",
                                    "note": note or f"received {fmt(got)}"})
    return r


def set_investment(position: dict, ident: str, *, name: str | None = None, value: Any = None,
                   as_of: Any = None, source: str | None = None) -> dict:
    items = position.setdefault("investments", [])
    ident = slug(ident)
    try:
        i = _find(items, ident, "investment")
    except KeyError:
        if value is None:
            raise ValueError("a new investment needs a value") from None
        i = {"id": ident, "name": name or ident}
        items.append(i)
    if name is not None:
        i["name"] = name
    if value is not None:
        i["value"] = fmt(money(value))
    if source is not None:
        i["source"] = source
    i["as_of"] = _iso(as_of) or date.today().isoformat()
    return i


def set_income(position: dict, *, monthly_net: Any = None, fixed: dict[str, Any] | None = None) -> dict:
    income = position.setdefault("income", {"monthly_net": None, "fixed": []})
    if monthly_net is not None:
        income["monthly_net"] = fmt(money(monthly_net))
    for name, amount in (fixed or {}).items():
        income["fixed"] = [f for f in income.get("fixed", []) if f["name"] != name]
        if amount is not None:
            income["fixed"].append({"name": name, "amount": fmt(money(amount))})
    return income


def set_setting(position: dict, key: str, value: Any) -> dict:
    settings = position.setdefault("settings", {})
    if key == "monthly_to_debt":
        settings[key] = None if value in (None, "", "none") else fmt(money(value))
    else:
        raise KeyError(f"unknown setting {key!r}")
    return settings
