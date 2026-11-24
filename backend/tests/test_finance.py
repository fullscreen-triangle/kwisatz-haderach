"""
tools/finance and /finance, with synthetic data only (never the user's own figures).
Run: python -m pytest backend/tests/test_finance.py
"""

import sqlite3
from datetime import date
from decimal import Decimal

import pytest

from tools.finance import banks, book, cli, deliveries, plan
from tools.finance.store import Store, money

START = date(2026, 1, 1)


def position(**debts):
    pos = {"debts": [], "receivables": [], "investments": [], "income": {"monthly_net": None, "fixed": []},
           "settings": {"monthly_to_debt": None}}
    for ident, (balance, rate, minimum) in debts.items():
        book.set_debt(pos, ident, balance=balance, annual_rate=rate, minimum=minimum)
    return pos


# ---------------------------------------------------------------- amounts


@pytest.mark.parametrize("raw,expected", [("1.234,56", "1234.56"), ("-12,50", "-12.50"), ("12.5", "12.5"),
                                          ("€ 3,00", "3.00"), (7, "7")])
def test_money_reads_german_and_plain_amounts(raw, expected):
    assert money(raw) == Decimal(expected)


def test_money_refuses_text():
    with pytest.raises(ValueError):
        money("abc")


# ---------------------------------------------------------------- payoff


def test_interest_free_debt_is_paid_in_balance_over_payment_months():
    pos = position(loan=("1000", "0", {"kind": "fixed", "amount": "100"}))
    p = plan.payoff(pos, start=START)
    assert p.months == 10
    assert p.debt_free == "2026-10"
    assert p.total_interest == 0


def test_avalanche_sends_extra_to_the_dearest_debt_first():
    pos = position(card=("1000", "0.23", {"kind": "fixed", "amount": "25"}),
                   loan=("1000", "0.05", {"kind": "fixed", "amount": "25"}))
    p = plan.payoff(pos, monthly_to_debt="300", start=START)
    paid = {d.id: d.paid_off for d in p.debts}
    assert paid["card"] < paid["loan"]


def test_avalanche_pays_less_interest_than_the_reverse_order():
    pos = position(card=("2000", "0.23", {"kind": "fixed", "amount": "25"}),
                   loan=("2000", "0.05", {"kind": "fixed", "amount": "25"}))
    good = plan.payoff(pos, monthly_to_debt="300", start=START).total_interest
    flipped = position(card=("2000", "0.05", {"kind": "fixed", "amount": "25"}),
                       loan=("2000", "0.23", {"kind": "fixed", "amount": "25"}))
    # same balances; whichever is dearer goes first, so interest equals the mirrored case
    assert good == plan.payoff(flipped, monthly_to_debt="300", start=START).total_interest
    minimums_only = plan.payoff(pos, start=START).total_interest
    assert good < minimums_only


def test_a_lump_sum_brings_the_end_forward():
    pos = position(card=("5000", "0.23", {"kind": "percent", "percent": "3", "floor": "25"}))
    base = plan.payoff(pos, monthly_to_debt="400", start=START)
    lump = plan.payoff(pos, monthly_to_debt="400", start=START, lump_sums={"2026-02": "3000"})
    assert lump.debt_free < base.debt_free
    assert lump.total_interest < base.total_interest


def test_payments_below_interest_never_end():
    pos = position(card=("10000", "0.23", {"kind": "fixed", "amount": "50"}))
    p = plan.payoff(pos, start=START)
    assert p.never and p.debt_free is None


def test_percent_minimum_has_a_floor():
    pos = position(card=("100", "0", {"kind": "percent", "percent": "3", "floor": "25"}))
    assert plan.payoff(pos, start=START).months == 4  # 25 a month, not 3


def test_afford_delay_is_price_plus_extra_interest_over_the_monthly_amount():
    pos = position(card=("3000", "0.23", {"kind": "fixed", "amount": "25"}))
    out = plan.afford(pos, "300", monthly_to_debt="300", start=START)
    extra = Decimal(out["extra_interest"])
    assert extra > 0
    assert out["delay_days"] == int(((Decimal(300) + extra) / 300 * Decimal("30.44")).to_integral_value())
    assert out["debt_free_with"] >= out["debt_free_without"]


def test_afford_without_a_monthly_amount_says_so():
    pos = position(card=("3000", "0.23", {"kind": "fixed", "amount": "100"}))
    out = plan.afford(pos, "50", start=START)
    assert out["delay_days"] is None and "monthly_to_debt" in out["note"]


# ---------------------------------------------------------------- overview and receivables


def test_overview_nets_owed_invested_and_debts_and_warns_before_a_claim_deadline():
    pos = position(card=("1000", "0.20", {"kind": "fixed", "amount": "50"}))
    book.set_receivable(pos, "wages", debtor="Employer", what="unpaid wages", amount="2000",
                        due="2026-01-31", claim_deadline="2026-03-01")
    book.set_investment(pos, "broker", value="500")
    pos["debts"][0]["rate_basis"] = "assumed"
    out = plan.overview(pos, today=date(2026, 2, 20))
    assert out["net"] == "1500.00"
    assert out["receivables"][0]["overdue_days"] == 20
    levels = [a["level"] for a in out["alerts"]]
    assert levels[0] == "urgent"  # 9 days left, not claimed
    assert any("assumed" in a["text"] for a in out["alerts"])
    book.log_receivable(pos, "wages", "claimed-in-writing", "email to HR", "2026-02-20")
    out = plan.overview(pos, today=date(2026, 2, 20))
    assert not any(a.get("receivable") == "wages" for a in out["alerts"])


def test_partial_and_full_payment_of_money_owed():
    pos = position()
    book.set_receivable(pos, "rent", amount="2500")
    book.receive(pos, "rent", "1000", "2026-03-01")
    assert pos["receivables"][0]["status"] == "partly-paid"
    book.receive(pos, "rent", "1500", "2026-04-01")
    assert pos["receivables"][0]["status"] == "paid"
    assert plan.overview(pos)["owed_to_you"] == "0.00"


def test_book_refuses_bad_input():
    pos = position()
    with pytest.raises(ValueError):
        book.set_debt(pos, "x", balance="100", annual_rate="23")  # a percentage, not a fraction
    with pytest.raises(ValueError):
        book.set_debt(pos, "y")  # new debt without balance and rate
    book.set_receivable(pos, "r", amount="10")
    with pytest.raises(ValueError):
        book.log_receivable(pos, "r", "shouted")
    with pytest.raises(KeyError):
        book.receive(pos, "missing", "5")


# ---------------------------------------------------------------- bank exports

SPARKASSE = (
    '"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";'
    '"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";'
    '"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";'
    '"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"\n'
    '"DE00TEST";"01.10.26";"01.10.26";"DAUERAUFTRAG";"Miete Oktober";"";"";"";"";"";"";"Vermieter Müller";'
    '"DE11";"BIC";"-447,00";"EUR";"Umsatz gebucht"\n'
    '"DE00TEST";"02.10.26";"02.10.26";"KARTENZAHLUNG";"Bäckerei";"";"";"";"";"";"";"Bäcker";"";"";"-3,50";'
    '"EUR";"Umsatz gebucht"\n'
    '"DE00TEST";"02.10.26";"02.10.26";"KARTENZAHLUNG";"Bäckerei";"";"";"";"";"";"";"Bäcker";"";"";"-3,50";'
    '"EUR";"Umsatz gebucht"\n'
).encode("cp1252")

REVOLUT = (
    "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n"
    "CARD_PAYMENT,Current,2026-10-03 10:00:00,2026-10-04 09:00:00,Shop,-20.00,0.50,EUR,COMPLETED,79.50\n"
    "TOPUP,Current,2026-10-01 08:00:00,2026-10-01 08:00:01,Top-up,100.00,0.00,EUR,COMPLETED,100.00\n"
    "CARD_PAYMENT,Current,2026-10-05 10:00:00,,Pending shop,-5.00,0.00,EUR,PENDING,\n"
).encode("utf-8")


def test_sparkasse_csv_camt_in_cp1252():
    rows = banks.parse(SPARKASSE)
    assert len(rows) == 3
    assert rows[0]["date"] == "2026-10-01" and rows[0]["amount"] == "-447.00"
    assert rows[0]["counterparty"] == "Vermieter Müller"
    assert rows[1]["id"] != rows[2]["id"]  # two real identical payments are both kept


def test_revolut_skips_pending_and_subtracts_fees():
    rows = banks.parse(REVOLUT)
    assert [r["amount"] for r in rows] == ["-20.50", "100.00"]
    assert rows[0]["date"] == "2026-10-04"


def test_reimporting_an_export_adds_nothing():
    rows, added = banks.merge([], banks.parse(SPARKASSE))
    assert added == 3
    rows, added = banks.merge(rows, banks.parse(SPARKASSE))
    assert added == 0 and len(rows) == 3


def test_unknown_export_is_refused():
    with pytest.raises(banks.UnknownFormat):
        banks.parse(b"a,b,c\n1,2,3\n")


def test_monthly_summary():
    rows, _ = banks.merge([], banks.parse(SPARKASSE) + banks.parse(REVOLUT))
    s = banks.summary(rows)
    assert s["2026-10"] == {"in": "100.00", "out": "474.50"}


# ---------------------------------------------------------------- deliveries


def test_tracking_numbers_from_links_labels_and_ups():
    text = ("Ihre Sendung ist unterwegs. Verfolgen: https://www.dhl.de/de/privatkunden/pakete-empfangen/"
            "verfolgen.html?piececode=00340434161234567890 . Bestellnummer 302-1234567-1234567. "
            "UPS 1Z999AA10123456784")
    found = {f["number"]: f["carrier"] for f in deliveries.extract(text, sender="Shop <shop@example.org>")}
    assert found == {"00340434161234567890": "dhl", "1Z999AA10123456784": "ups"}


def test_bare_digits_need_a_named_carrier_and_a_label_nearby():
    assert deliveries.extract("Ihre Bestellnummer 12345678901234 wurde bestätigt.") == []
    found = deliveries.extract("Ihr DPD Paket 01234567890123 kommt morgen.", sender="DPD")
    assert [(f["carrier"], f["number"]) for f in found] == [("dpd", "01234567890123")]


def test_status_moves_forward_and_sets_a_return_date():
    parcels: dict = {}
    base = {"from_name": "DHL", "from_addr": "noreply@dhl.de"}
    deliveries.apply(parcels, {**base, "key": "a", "date": "2026-10-01T09:00:00",
                               "subject": "Ihre Sendung ist unterwegs", "text": "Sendungsnummer: 00340434161234567890"})
    deliveries.apply(parcels, {**base, "key": "b", "date": "2026-10-03T12:00:00",
                               "subject": "Zugestellt", "text": "Ihre Sendung 00340434161234567890 wurde zugestellt."})
    deliveries.apply(parcels, {**base, "key": "c", "date": "2026-10-02T12:00:00",
                               "subject": "Unterwegs", "text": "Sendungsnummer: 00340434161234567890 ist unterwegs"})
    p = parcels["00340434161234567890"]
    assert p["status"] == "delivered" and p["delivered_on"] == "2026-10-03"
    assert p["return_by"] == "2026-10-17"
    assert p["sources"] == ["a", "b", "c"]
    listed = deliveries.listing(parcels, today=date(2026, 10, 10))
    assert listed[0]["return_days_left"] == 7


def test_scan_reads_the_mail_store_read_only(tmp_path):
    db = tmp_path / "mail.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE messages (key TEXT, date TEXT, from_name TEXT, from_addr TEXT, subject TEXT, text TEXT)")
    con.execute("INSERT INTO messages VALUES ('k1','2026-10-05T10:00:00','UPS','ups@example.org',"
                "'Your UPS shipment','Tracking number 1Z999AA10123456784 out for delivery')")
    con.execute("INSERT INTO messages VALUES ('k2','2026-10-06T10:00:00','Friend','f@example.org','Hi','no parcel')")
    con.commit()
    con.close()
    parcels: dict = {}
    report = deliveries.scan_mail_db(db, parcels, since="2026-10-01")
    assert report == {"messages_read": 1, "parcels_touched": 1}
    assert parcels["1Z999AA10123456784"]["status"] == "out-for-delivery"


# ---------------------------------------------------------------- command line and route


def test_cli_round_trip(tmp_path, capsys):
    home = ["--home", str(tmp_path)]
    assert cli.main([*home, "debt", "card", "--balance", "1000", "--rate", "0.2", "--min-fixed", "100"]) == 0
    assert cli.main([*home, "owed", "rent", "--amount", "500", "--deadline", "2030-01-01"]) == 0
    assert cli.main([*home, "log", "rent", "reminded", "--note", "sms"]) == 0
    capsys.readouterr()
    assert cli.main([*home, "show"]) == 0
    import json
    out = json.loads(capsys.readouterr().out)
    assert out["net"] == "-500.00"
    assert cli.main([*home, "debt", "card", "--rate", "5"]) == 1  # refused: not a fraction
    assert "error" in json.loads(capsys.readouterr().out)
    assert not list(tmp_path.glob(".*.tmp"))  # atomic writes leave nothing behind


def test_route(tmp_path, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from backend.routes import finance

    monkeypatch.setenv("FINANCE_HOME", str(tmp_path))
    app = FastAPI()
    app.include_router(finance.router, prefix="/finance")
    outsider = TestClient(app, client=("203.0.113.7", 50000))
    assert outsider.get("/finance/overview").status_code == 403  # the internet is refused
    tailnet = TestClient(app, client=("100.101.102.103", 50000))
    assert tailnet.get("/finance/overview").status_code == 200
    c = TestClient(app, client=("127.0.0.1", 50000))
    store = Store(tmp_path)
    pos = store.position()
    book.set_debt(pos, "card", balance="1000", annual_rate="0.2", minimum={"kind": "fixed", "amount": "100"})
    book.set_receivable(pos, "wages", amount="300")
    store.save_position(pos)
    assert c.get("/finance/overview").json()["net"] == "-700.00"
    assert c.get("/finance/plan", params={"monthly": "200"}).json()["debt_free"]
    assert c.get("/finance/afford", params={"price": "50", "monthly": "200"}).json()["delay_days"] > 0
    assert c.post("/finance/receivables/wages/log", json={"action": "claimed-in-writing"}).status_code == 200
    assert c.post("/finance/receivables/nope/log", json={"action": "note"}).status_code == 404
    assert c.post("/finance/receivables/wages/payment", json={"amount": "300"}).json()["status"] == "paid"
    r = c.post("/finance/import", json={"filename": "r.csv", "text": REVOLUT.decode()})
    assert r.json()["added"] == 2
    assert c.post("/finance/import", json={"filename": "x.csv", "text": "a,b\n1,2"}).status_code == 400
    assert c.get("/finance/deliveries").json() == {"parcels": []}
