"""The picture and the plan: net position, debt payoff, and what a purchase costs in time.

Debt payoff follows the avalanche rule: every debt gets its minimum payment, and
everything else goes to the debt with the highest interest rate, which minimises the
interest paid. Rates are effective annual rates; the monthly rate is
``(1 + annual) ** (1/12) - 1``. Interest accrues on the balance at the start of each
month, then payments are made.

A debt's minimum is either fixed (``{"kind": "fixed", "amount": 150}``) or a percentage
of the balance with a floor (``{"kind": "percent", "percent": 3, "floor": 25}``), the usual
form for German credit cards.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from .store import fmt, money

CENT = Decimal("0.01")
MAX_MONTHS = 600
DAYS_PER_MONTH = Decimal("30.44")


def _monthly_rate(annual: Any) -> Decimal:
    a = float(annual)
    return Decimal(str((1.0 + a) ** (1.0 / 12.0) - 1.0))


def _add_months(d: date, n: int) -> date:
    y, m = divmod(d.month - 1 + n, 12)
    return date(d.year + y, m + 1, 1)


def _month(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _minimum(debt: dict, balance: Decimal) -> Decimal:
    rule = debt.get("minimum") or {"kind": "fixed", "amount": 0}
    if rule.get("kind") == "percent":
        pct = money(rule.get("percent", 0)) / 100
        floor = money(rule.get("floor", 0))
        due = max((balance * pct).quantize(CENT, ROUND_HALF_UP), floor)
    else:
        due = money(rule.get("amount", 0))
    return min(due, balance)


@dataclass
class DebtState:
    id: str
    name: str
    balance: Decimal
    rate: Decimal  # monthly
    annual: Decimal
    spec: dict
    interest: Decimal = Decimal(0)
    paid_off: str | None = None


@dataclass
class Plan:
    start: str
    monthly_to_debt: Decimal | None
    debt_free: str | None
    months: int | None
    total_interest: Decimal
    debts: list[DebtState]
    schedule: list[dict] = field(default_factory=list)
    never: bool = False

    def as_json(self) -> dict:
        return {
            "start": self.start,
            "monthly_to_debt": fmt(self.monthly_to_debt) if self.monthly_to_debt is not None else None,
            "debt_free": self.debt_free,
            "months": self.months,
            "never": self.never,
            "total_interest": fmt(self.total_interest),
            "debts": [
                {"id": d.id, "name": d.name, "annual_rate": str(d.annual),
                 "paid_off": d.paid_off, "interest": fmt(d.interest)}
                for d in self.debts
            ],
            "schedule": self.schedule,
        }


def payoff(position: dict, *, monthly_to_debt: Any = None, lump_sums: dict[str, Any] | None = None,
           start: date | None = None, schedule_months: int = 24) -> Plan:
    """Simulate paying off every debt.

    ``monthly_to_debt`` is the total paid towards debts each month. Below the sum of the
    minimums it is raised to that sum; ``None`` means minimums only. ``lump_sums`` maps
    ``YYYY-MM`` to an extra one-off payment (for example wages arriving) made that month;
    a negative lump sum is money taken away from repayment that month (a purchase).
    """
    start = (start or date.today()).replace(day=1)
    budget = money(monthly_to_debt) if monthly_to_debt is not None else None
    lumps = {k: money(v) for k, v in (lump_sums or {}).items()}
    states = [
        DebtState(d["id"], d.get("name", d["id"]), money(d["balance"]),
                  _monthly_rate(d.get("annual_rate", 0)), money(d.get("annual_rate", 0)), d)
        for d in position.get("debts", []) if money(d["balance"]) > 0
    ]
    total_interest = Decimal(0)
    schedule: list[dict] = []
    carry = Decimal(0)  # a negative lump sum not yet absorbed
    for i in range(MAX_MONTHS):
        open_debts = [s for s in states if s.balance > 0]
        if not open_debts:
            return Plan(_month(start), budget, _month(_add_months(start, i - 1)) if i else _month(start),
                        i, total_interest, states, schedule)
        month = _add_months(start, i)
        key = _month(month)
        paid = Decimal(0)
        interest_this = Decimal(0)
        for s in open_debts:
            charge = (s.balance * s.rate).quantize(CENT, ROUND_HALF_UP)
            s.balance += charge
            s.interest += charge
            interest_this += charge
        total_interest += interest_this
        minimums = {s.id: _minimum(s.spec, s.balance) for s in open_debts}
        for s in open_debts:
            pay = minimums[s.id]
            s.balance -= pay
            paid += pay
        extra = Decimal(0)
        if budget is not None:
            extra = max(budget - sum(minimums.values()), Decimal(0))
        extra += lumps.get(key, Decimal(0)) + carry
        carry = min(extra, Decimal(0))
        extra = max(extra, Decimal(0))
        for s in sorted(open_debts, key=lambda d: d.annual, reverse=True):
            if extra <= 0:
                break
            pay = min(extra, s.balance)
            s.balance -= pay
            extra -= pay
            paid += pay
        for s in open_debts:
            if s.balance <= 0 and s.paid_off is None:
                s.balance = Decimal(0)
                s.paid_off = key
        if i < schedule_months:
            schedule.append({"month": key, "paid": fmt(paid), "interest": fmt(interest_this),
                             "remaining": fmt(sum((s.balance for s in states), Decimal(0)))})
        if i == 11 and paid <= interest_this and sum(s.balance for s in states) > 0:
            # payments do not even cover the interest: the debt never ends
            return Plan(_month(start), budget, None, None, total_interest, states, schedule, never=True)
    return Plan(_month(start), budget, None, None, total_interest, states, schedule, never=True)


def afford(position: dict, price: Any, *, monthly_to_debt: Any = None, start: date | None = None) -> dict:
    """What spending ``price`` now costs: the extra interest, and how much later the
    last debt is paid off. Without a monthly amount for debt only the interest is known
    in money terms; the delay is then stated in months at the minimum payments."""
    price = money(price)
    start = (start or date.today()).replace(day=1)
    budget = monthly_to_debt if monthly_to_debt is not None else position.get("settings", {}).get("monthly_to_debt")
    base = payoff(position, monthly_to_debt=budget, start=start)
    spent = payoff(position, monthly_to_debt=budget, start=start, lump_sums={_month(start): -price})
    out: dict[str, Any] = {
        "price": fmt(price),
        "monthly_to_debt": base.as_json()["monthly_to_debt"],
        "debt_free_without": base.debt_free,
        "debt_free_with": spent.debt_free,
        "extra_interest": fmt(spent.total_interest - base.total_interest),
    }
    if budget is not None and money(budget) > 0:
        cost = price + (spent.total_interest - base.total_interest)
        out["delay_days"] = int((cost / money(budget) * DAYS_PER_MONTH).to_integral_value(ROUND_HALF_UP))
    else:
        out["delay_days"] = None
        out["note"] = "set settings.monthly_to_debt to see the delay in days"
    return out


def overview(position: dict, *, today: date | None = None, warn_days: int = 60) -> dict:
    """Net position and what needs attention."""
    today = today or date.today()
    debts = sum((money(d["balance"]) for d in position.get("debts", [])), Decimal(0))
    owed = Decimal(0)
    alerts: list[dict] = []
    receivables = []
    for r in position.get("receivables", []):
        outstanding = money(r["amount"]) - money(r.get("received", 0))
        if r.get("status") in ("paid", "written-off") or outstanding <= 0:
            continue
        owed += outstanding
        item = {"id": r["id"], "debtor": r.get("debtor", ""), "what": r.get("what", ""),
                "outstanding": fmt(outstanding), "due": r.get("due"), "claim_deadline": r.get("claim_deadline")}
        if r.get("due") and date.fromisoformat(r["due"]) < today:
            item["overdue_days"] = (today - date.fromisoformat(r["due"])).days
        last = (r.get("log") or [])[-1:] or [None]
        item["last_action"] = last[0]
        dl = r.get("claim_deadline")
        if dl:
            days = (date.fromisoformat(dl) - today).days
            item["days_to_deadline"] = days
            claimed = any(e.get("action") == "claimed-in-writing" for e in r.get("log") or [])
            if not claimed and days <= warn_days:
                alerts.append({"level": "urgent" if days <= 14 else "warning", "receivable": r["id"],
                               "text": f"claim {r.get('what', r['id'])} in writing before {dl} ({days} days)"})
            elif not claimed:
                alerts.append({"level": "info", "receivable": r["id"],
                               "text": f"not yet claimed in writing; deadline {dl}"})
        receivables.append(item)
    invested = sum((money(i["value"]) for i in position.get("investments", [])), Decimal(0))
    for d in position.get("debts", []):
        if d.get("rate_basis") == "assumed":
            alerts.append({"level": "info", "debt": d["id"],
                           "text": f"rate for {d.get('name', d['id'])} is assumed ({d.get('annual_rate')}); replace it from the contract"})
    income = position.get("income", {})
    fixed = sum((money(f["amount"]) for f in income.get("fixed", [])), Decimal(0))
    minimums = sum((_minimum(d, money(d["balance"])) for d in position.get("debts", [])), Decimal(0))
    monthly = {
        "net_income": fmt(money(income["monthly_net"])) if income.get("monthly_net") is not None else None,
        "fixed_costs": fmt(fixed),
        "debt_minimums": fmt(minimums),
    }
    if income.get("monthly_net") is not None:
        monthly["left_after_fixed_and_minimums"] = fmt(money(income["monthly_net"]) - fixed - minimums)
    return {
        "as_of": today.isoformat(),
        "currency": position.get("currency", "EUR"),
        "owed_to_you": fmt(owed),
        "invested": fmt(invested),
        "you_owe": fmt(debts),
        "net": fmt(owed + invested - debts),
        "monthly": monthly,
        "receivables": receivables,
        "debts": [{"id": d["id"], "name": d.get("name", d["id"]), "balance": fmt(money(d["balance"])),
                   "annual_rate": d.get("annual_rate"), "rate_basis": d.get("rate_basis", "contract"),
                   "minimum": fmt(_minimum(d, money(d["balance"])))} for d in position.get("debts", [])],
        "investments": position.get("investments", []),
        "alerts": sorted(alerts, key=lambda a: {"urgent": 0, "warning": 1, "info": 2}[a["level"]]),
    }
