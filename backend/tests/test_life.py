"""
Facts about Kundai from mail (backend/life), with no model and no network: dates in every
common form, quoted replies cut off, triage, only verbatim quotes admitted, his own mail
publishing a fact on its own while someone else's waits for a second source or his tap.
All mails here are invented. Run: python -m pytest backend/tests/test_life.py
"""

import asyncio
import json
import sqlite3
from datetime import date, datetime, timezone

import pytest

from backend.life import read as reader
from backend.life.service import LifeService
from backend.mail.parse import Message


def msg(key, subject, text, *, owner=False, bulk=False, day=1, sender="Amt"):
    return Message(key=key, account="uni", folder="Sent" if owner else "INBOX", uid=key, message_id=key,
                   date=datetime(2026, 10, day, 9, 0, tzinfo=timezone.utc), from_name="Kundai" if owner else sender,
                   from_addr="me@uni.example" if owner else "amt@example.org", subject=subject, text=text,
                   bulk=bulk, owner=owner)


PASS_MAIL = msg("k1", "Terminanfrage Aufenthaltstitel", (
    "Sehr geehrte Damen und Herren,\n\nam 08.10.2026 habe ich meinen neuen Reisepass erhalten (gültig bis\n"
    "07.10.2036). Seit dem 20.10.26 wohne ich in Beispielweg 4, 17489 Greifswald.\n\n"
    "On Friday, 02-10-2026 at 8:18 Sachbearbeiterin wrote:\n> Ihr Pass ist gültig bis 31.03.2026\n"), owner=True, day=21)


def test_dates_in_every_common_form():
    t = "gültig bis 07.10.2036, ab 20.10.26, am 7. Oktober 2036, on October 7, 2036, 2036-10-07"
    assert set(reader.dates_in(t)) == {date(2036, 10, 7), date(2026, 10, 20)}
    assert reader.iso_date("07.10.2036") == "2036-10-07" and reader.iso_date("2036-13-01") is None


def test_quoted_replies_are_not_the_senders_words():
    own = reader.own_text(PASS_MAIL)
    assert "07.10.2036" in own and "31.03.2026" not in own


def test_triage_keeps_papers_and_drops_lists_and_newsletters():
    assert reader.triage(PASS_MAIL)
    assert not reader.triage(msg("k2", "[zentral_alle] Reisepass-Aktion", "Reisepass"))
    assert not reader.triage(msg("k3", "Newsletter", "Ihr Reisepass", bulk=True))
    assert not reader.triage(msg("k4", "Lunch?", "Shall we eat at noon?"))


def test_only_witnessed_facts_are_admitted():
    text = f"{PASS_MAIL.subject}\n{reader.own_text(PASS_MAIL)}"
    got = reader.admit([
        {"slot": "passport_valid_until", "value": "2036-10-07", "quote": "gültig bis\n07.10.2036"},
        {"slot": "address_street", "value": "Beispielweg 4", "quote": "wohne ich in Beispielweg 4"},
        {"slot": "passport_number", "value": "X123", "quote": "meinen neuen Reisepass erhalten"},   # value not in the quote
        {"slot": "employer", "value": "Uni", "quote": "I work at Uni"},                              # quote not in the mail
        {"slot": "shoe_size", "value": "44", "quote": "44"},                                          # no such slot
        {"slot": "passport_valid_until", "value": "2026-03-31", "quote": "gültig bis 31.03.2026"},    # from the cut-off reply
    ], text)
    assert got == [{"slot": "passport_valid_until", "value": "2036-10-07", "quote": "gültig bis 07.10.2036"},
                   {"slot": "address_street", "value": "Beispielweg 4", "quote": "wohne ich in Beispielweg 4"}]


class FakeMail:
    def __init__(self, messages):
        self.by_key = {m.key: m for m in messages}
        self._db = sqlite3.connect(":memory:")
        self._db.execute("CREATE TABLE messages (key TEXT, date TEXT)")
        self._db.executemany("INSERT INTO messages VALUES (?, ?)", [(m.key, m.date.isoformat()) for m in messages])

    def get_message(self, key):
        return self.by_key.get(key)


def test_own_mail_publishes_others_wait_for_a_tap(tmp_path, monkeypatch):
    other = msg("k5", "Ihr Termin", "Ihre Fiktionsbescheinigung ist gültig bis 20.04.2027.", day=25)
    noise = msg("k6", "Lunch?", "Shall we eat at noon?", day=26)
    answers = {"k1": [{"slot": "passport_valid_until", "value": "2036-10-07", "quote": "gültig bis 07.10.2036"}],
               "k5": [{"slot": "residence_valid_until", "value": "2027-04-20", "quote": "gültig bis 20.04.2027"}]}
    calls = []

    async def fake_read(client, env, m):
        calls.append(m.key)
        return reader.admit(answers[m.key], f"{m.subject}\n{reader.own_text(m)}"), "fake-model"
    monkeypatch.setattr(reader, "read", fake_read)
    svc = LifeService(root=tmp_path, mail_store=FakeMail([PASS_MAIL, other, noise]), env={})
    c = asyncio.run(svc.run_pass())
    assert c == {"triaged_out": 1, "read": 2, "facts": 2, "failed": 0} and calls == ["k1", "k5"]
    v = {f["slot"]: f for t in svc.view()["topics"].values() for f in t}
    assert v["passport_valid_until"]["state"] == "known" and v["passport_valid_until"]["value"] == "2036-10-07"
    assert v["residence_valid_until"]["state"] == "to confirm" and v["residence_valid_until"]["leader"] == "2027-04-20"
    assert "gültig bis 20.04.2027" in v["residence_valid_until"]["evidence"][0]["cue"]
    assert v["employer"]["state"] == "unknown"
    assert asyncio.run(svc.run_pass()) == {"triaged_out": 0, "read": 0, "facts": 0, "failed": 0}   # read once
    svc.confirm("residence_valid_until", "20.04.2027")
    v = {f["slot"]: f for t in svc.view()["topics"].values() for f in t}
    assert v["residence_valid_until"]["state"] == "known" and svc.value("residence_valid_until") == "2027-04-20"
    with pytest.raises(ValueError):
        svc.confirm("residence_valid_until", "soon")
    with pytest.raises(KeyError):
        svc.confirm("shoe_size", "44")


def test_a_failing_model_is_retried_once_then_recorded(tmp_path, monkeypatch):
    async def broken(client, env, m):
        raise reader.ReadFailed("model unreachable")
    monkeypatch.setattr(reader, "read", broken)
    svc = LifeService(root=tmp_path, mail_store=FakeMail([PASS_MAIL]), env={})
    asyncio.run(svc.run_pass())
    assert "k1" not in svc.done()
    asyncio.run(svc.run_pass())
    assert svc.done()["k1"]["error"] == "model unreachable"


def test_the_facts_are_the_forms_facts(tmp_path, monkeypatch):
    """The forms read the same structure: a fact from mail reaches their known facts."""
    from backend.forms.service import FormService
    async def fake_read(client, env, m):
        return reader.admit([{"slot": "passport_valid_until", "value": "2036-10-07", "quote": "gültig bis 07.10.2036"}],
                            f"{m.subject}\n{reader.own_text(m)}"), "fake"
    monkeypatch.setattr(reader, "read", fake_read)
    svc = LifeService(root=tmp_path, mail_store=FakeMail([PASS_MAIL]), env={})
    asyncio.run(svc.run_pass())
    pub = FormService(root=tmp_path).facts().published()
    assert pub == {"me␟passport_valid_until": "2036-10-07"}
    assert json.loads((tmp_path / "life" / "read.json").read_text(encoding="utf-8"))["k1"]["own"] is True
