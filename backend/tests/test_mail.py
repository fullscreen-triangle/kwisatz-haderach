"""
Mail pipeline without a network: parsing real-shaped RFC 822 bytes, the IMAP reader
against a fake server object, extraction against a mocked Ollama, the store, and the
chigutiro record split. Run: python -m pytest backend/tests/test_mail.py
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

import httpx
import pytest

from backend.mail import extract, imap, memory
from backend.mail.accounts import Account, discover
from backend.mail.parse import parse_bytes
from backend.mail.store import MailStore


def eml(subject="Termin", body="Hallo", html=None, frm="Prof. Dörr <doerr@uni-greifswald.de>",
        to="kundai@uni-greifswald.de", msgid="<m1@x>", date="Mon, 28 Sep 2026 09:15:00 +0200",
        headers=None) -> bytes:
    m = EmailMessage()
    m["From"], m["To"], m["Subject"], m["Message-ID"], m["Date"] = frm, to, subject, msgid, date
    for k, v in (headers or {}).items():
        m[k] = v
    if html:
        m.set_content(body)
        m.add_alternative(html, subtype="html")
    else:
        m.set_content(body)
    return m.as_bytes()


# ---------------------------------------------------------------- parse

def test_parse_german_utf8_and_owner():
    raw = eml(subject="Besprechung Größe", body="Können wir Donnerstag reden?", frm="Kundai <kundai@uni-greifswald.de>")
    m = parse_bytes(raw, account="uni", folder="Sent", uid="Sent/7", owner_addrs=["kundai@uni-greifswald.de"])
    assert m.subject == "Besprechung Größe" and "Donnerstag" in m.text
    assert m.owner and m.from_addr == "kundai@uni-greifswald.de"
    assert m.date == datetime(2026, 9, 28, 7, 15, tzinfo=timezone.utc)
    assert m.key.startswith("uni:")


def test_parse_html_only_and_bulk():
    m = EmailMessage()
    m["From"], m["Subject"], m["List-Unsubscribe"] = "News <n@x.org>", "Weekly", "<mailto:u@x.org>"
    m.set_content("<html><body><p>Hello <b>world</b></p><script>x()</script></body></html>", subtype="html")
    msg = parse_bytes(m.as_bytes(), account="webmail", folder="INBOX", uid="INBOX/1")
    assert "Hello" in msg.text and "world" in msg.text and "x()" not in msg.text
    assert msg.bulk


def test_same_message_id_same_key_across_folders():
    a = parse_bytes(eml(), account="uni", folder="INBOX", uid="INBOX/1")
    b = parse_bytes(eml(), account="uni", folder="Sent", uid="Sent/9")
    assert a.key == b.key


def test_discover_accounts():
    env = {"MAIL_UNI_HOST": "imap.uni-greifswald.de", "MAIL_UNI_SECURITY": "starttls",
           "MAIL_UNI_USER": "ksach", "MAIL_UNI_PASSWORD": "pw", "MAIL_UNI_ADDRESS": "kundai@uni-greifswald.de",
           "MAIL_WEBMAIL_HOST": "imap.web.de", "MAIL_WEBMAIL_USER": "k@web.de", "MAIL_WEBMAIL_PASSWORD": "x",
           "GMAIL_CREDENTIALS_PATH": "/nonexistent", "GMAIL_TOKEN_PATH": "/nonexistent"}
    accts = {a.id: a for a in discover(env)}
    assert set(accts) == {"uni", "webmail"}
    assert accts["uni"].port == 143 and accts["webmail"].port == 993
    assert accts["webmail"].addresses == ("k@web.de",)
    assert "pw" not in repr(accts["uni"])          # passwords never in reprs/logs


# ---------------------------------------------------------------- IMAP

class FakeImap:
    """Just enough of imaplib.IMAP4 for fetch_folder: records whether anything could
    have changed flags on the server."""

    def __init__(self, uidvalidity, uids, raws):
        self.uidvalidity, self.uids, self.raws = uidvalidity, uids, raws
        self.readonly_selects, self.fetch_specs = [], []

    def select(self, name, readonly=False):
        self.readonly_selects.append(readonly)
        return "OK", [b"3"]

    def response(self, code):
        return code, [str(self.uidvalidity).encode()]

    def uid(self, cmd, *args):
        if cmd == "SEARCH":
            crit = " ".join(a for a in args if a)
            if crit.startswith("UID "):
                lo = int(crit.split()[1].split(":")[0])
                hits = [u for u in self.uids if u >= lo] or [max(self.uids)]   # N:* quirk
            else:
                hits = self.uids
            return "OK", [" ".join(map(str, hits)).encode()]
        if cmd == "FETCH":
            self.fetch_specs.append(args[1])
            wanted = [int(u) for u in args[0].split(",")]
            return "OK", [(f"{u} (UID {u} BODY[] {{10}}".encode(), self.raws[u]) for u in wanted] + [b")"]
        raise AssertionError(cmd)


def _parse(raw, folder, uid):
    return parse_bytes(raw, account="uni", folder=folder, uid=f"{folder}/{uid}")


def test_imap_backfill_then_incremental_readonly():
    raws = {1: eml(msgid="<a@x>"), 2: eml(msgid="<b@x>"), 3: eml(msgid="<c@x>")}
    srv = FakeImap(77, [1, 2], raws)
    got, st = imap.fetch_folder(srv, "INBOX", None, 14, _parse)
    assert len(got) == 2 and st == {"uidvalidity": 77, "last_uid": 2}
    got, st = imap.fetch_folder(srv, "INBOX", st, 14, _parse)       # nothing new: N:* quirk ignored
    assert got == [] and st["last_uid"] == 2
    srv.uids.append(3)
    got, st = imap.fetch_folder(srv, "INBOX", st, 14, _parse)
    assert [m.message_id for m in got] == ["<c@x>"] and st["last_uid"] == 3
    assert all(srv.readonly_selects) and all("BODY.PEEK[]" in s for s in srv.fetch_specs)


def test_imap_uidvalidity_change_restarts():
    srv = FakeImap(99, [5], {5: eml(msgid="<z@x>")})
    got, st = imap.fetch_folder(srv, "INBOX", {"uidvalidity": 77, "last_uid": 40}, 14, _parse)
    assert len(got) == 1 and st == {"uidvalidity": 99, "last_uid": 5}


# ---------------------------------------------------------------- extraction

def _ollama(content):
    return httpx.AsyncClient(transport=httpx.MockTransport(
        lambda req: httpx.Response(200, json={"message": {"content": content}})))


GOOD = json.dumps({
    "summary": "Prof. Dörr asks to meet Thursday.", "category": "work", "needs_reply": True, "reply_by": "",
    "action_items": [{"title": "Send the NFDI4Cat slides", "due": "2026-10-01T12:00:00", "estimated_minutes": 45,
                      "priority": "high"}],
    "events": [{"title": "Meeting with Prof. Dörr", "start": "2026-10-01T15:00:00+02:00", "end": "",
                "location": "Room 2.14", "confirmed": True},
               {"title": "no date", "start": "", "end": "", "location": "", "confirmed": False}],
    "people": [{"name": "Robert Dörr", "email": "DOERR@uni-greifswald.de", "role": "PI", "org": "NFDI4Cat"}],
    "key_facts": []})


def test_extract_valid_output_normalised():
    m = parse_bytes(eml(), account="uni", folder="INBOX", uid="INBOX/1")
    data, model = asyncio.run(extract.extract(_ollama(GOOD), {}, m))
    assert model == extract.DEFAULT_MODEL
    assert data["action_items"][0]["due"].startswith("2026-10-01T12:00:00+02:00")   # naive -> Berlin
    assert len(data["events"]) == 1 and data["events"][0]["end"] is None           # undated dropped
    assert data["reply_by"] is None and data["category"] == "work"


def test_extract_invalid_output_fails_after_retry():
    m = parse_bytes(eml(), account="uni", folder="INBOX", uid="INBOX/1")
    with pytest.raises(extract.ExtractionFailed):
        asyncio.run(extract.extract(_ollama("not json"), {}, m))


def test_triage_newsletter_skips_model():
    m = parse_bytes(eml(headers={"List-Unsubscribe": "<mailto:x@y>"}), account="gmail", folder="INBOX", uid="INBOX/1")
    label, data = extract.triage(m)
    assert label == "newsletter" and data["category"] == "newsletter"


# ---------------------------------------------------------------- store + memory

def test_store_dedup_pending_and_md(tmp_path):
    st = MailStore(tmp_path)
    m1 = parse_bytes(eml(msgid="<old@x>", date="Mon, 21 Sep 2026 09:00:00 +0200"), account="uni", folder="INBOX", uid="INBOX/1")
    m2 = parse_bytes(eml(msgid="<new@x>"), account="uni", folder="INBOX", uid="INBOX/2")
    assert len(st.add([m1, m2])) == 2 and st.add([m1]) == []
    assert st.next_pending().key == m2.key                          # newest first
    st.save_extraction(m2.key, "done", data={"summary": "s", "category": "work"})
    assert st.next_pending().key == m1.key
    assert (tmp_path / "md" / ".spraypaint").is_dir() and st.md_path(m2).exists()
    assert st.list(category="work")[0]["key"] == m2.key


def test_memory_records_split():
    m = parse_bytes(eml(), account="uni", folder="INBOX", uid="INBOX/1")
    ex = json.loads(GOOD)
    ex["events"] = [ex["events"][0]]
    recs = memory.records_for(m, ex)
    kinds = [r["kind"] for r in recs]
    assert kinds.count("prose") == 1 and kinds.count("event") == 1
    prose = recs[0]
    assert prose["subject"] == "doerr@uni-greifswald.de" and prose["authored_by_owner"] is False
    contacts = {r["id"]: r for r in recs if r["kind"] == "contact"}
    assert contacts["doerr@uni-greifswald.de"]["org"] == "NFDI4Cat"
    bulk = parse_bytes(eml(headers={"List-Unsubscribe": "<mailto:x@y>"}), account="uni", folder="INBOX", uid="INBOX/2")
    assert memory.records_for(bulk, None) == []


def test_sanity_drops_dates_before_the_mail():
    sent = datetime(2026, 9, 27, 9, 12, tzinfo=timezone.utc)
    data = {"reply_by": "2026-09-20T12:00:00+02:00",
            "action_items": [{"title": "slides", "due": "2026-09-26T12:00:00+02:00"},
                             {"title": "ok", "due": "2026-09-30T12:00:00+02:00"}],
            "events": [{"title": "past", "start": "2026-09-25T14:00:00+02:00", "end": None},
                       {"title": "next", "start": "2026-10-01T14:00:00+02:00", "end": None}]}
    out = extract.sanity(data, sent)
    assert out["reply_by"] is None
    assert [a["due"] for a in out["action_items"]] == [None, "2026-09-30T12:00:00+02:00"]
    assert [e["title"] for e in out["events"]] == ["next"]


def test_date_table_names_weekdays_in_both_languages():
    table = extract.date_table(datetime(2026, 9, 27, 9, 12, tzinfo=timezone.utc), days=4)
    assert "Thu / Donnerstag = 2026-10-01" in table and "(the day it was sent)" in table.splitlines()[0]


def test_named_weekday_beats_model_arithmetic():
    sent = datetime(2026, 9, 27, 9, 12, tzinfo=timezone.utc)            # a Sunday
    data = {"action_items": [{"title": "slides", "due": "2026-10-01T12:00:00+02:00", "due_weekday": "Mittwoch"}],
            "events": [{"title": "meet", "start": "2026-09-28T14:00:00+02:00", "end": "2026-09-28T15:00:00+02:00",
                        "start_weekday": "Donnerstag"},
                       {"title": "next week", "start": "2026-10-08T10:00:00+02:00", "end": None,
                        "start_weekday": "Donnerstag"}]}
    out = extract.sanity(data, sent)
    assert out["action_items"][0]["due"].startswith("2026-09-30T12:00")          # Wed, not Thu
    assert out["events"][0]["start"].startswith("2026-10-01T14:00") and out["events"][0]["end"].startswith("2026-10-01T15:00")
    assert out["events"][1]["start"].startswith("2026-10-08")                      # already a Thursday: kept
