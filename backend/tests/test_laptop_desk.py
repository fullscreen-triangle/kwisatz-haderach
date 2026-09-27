"""
The desk's side of the laptop: mailbox drafts (never sent), the email_draft and laptop
tools with the laptop and IMAP faked, and the reader. Run: python -m pytest backend/tests/test_laptop_desk.py
"""

import asyncio
import email
import email.policy
from types import SimpleNamespace

import pytest

from backend import laptop
from backend.agents import llm, tools
from backend.mail import drafts
from backend.mail.accounts import Account

ACCT = Account(id="uni", kind="imap", label="Uni Greifswald", host="imap.example", user="sachikonyk",
               password="x", addresses=("kundai.sachikonye@uni-greifswald.de",))


def test_draft_carries_attachment_and_reply_headers():
    msg = drafts.build(ACCT, ["mark@example.org"], "Re: Meetings", "Hallo Mark",
                       [("paper.pdf", "application/pdf", b"%PDF-1.4 x")], in_reply_to="<abc@uni>")
    parsed = email.message_from_bytes(msg.as_bytes(), policy=email.policy.default)
    assert parsed["From"] == "kundai.sachikonye@uni-greifswald.de" and parsed["In-Reply-To"] == "<abc@uni>"
    att = list(parsed.iter_attachments())
    assert [a.get_filename() for a in att] == ["paper.pdf"] and att[0].get_payload(decode=True) == b"%PDF-1.4 x"
    with pytest.raises(ValueError):
        drafts.build(ACCT, ["a@b.c"], "big", "", [("x.bin", "application/octet-stream", b"0" * (21 * 1024 * 1024))])


class FakeConn:
    def __init__(self, lines):
        self.lines = lines

    def list(self):
        return "OK", self.lines


def test_drafts_folder_by_flag_then_by_german_name():
    flagged = [b'(\\HasNoChildren) "/" "INBOX"', b'(\\HasNoChildren \\Drafts) "/" "Konzepte"']
    named = [b'(\\HasNoChildren) "/" "INBOX"', b'(\\HasNoChildren) "/" "Entw&APw-rfe"']
    assert drafts.drafts_folder(FakeConn(flagged)) == "Konzepte"
    assert drafts.drafts_folder(FakeConn(named)) == "Entw&APw-rfe"


@pytest.fixture
def desk(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENT_SMITH_STATE", str(tmp_path))
    appended, written = [], []
    original = SimpleNamespace(key="uni:m1", subject="Meetings", from_name="Mark Doerr", from_addr="mark@uni",
                               message_id="<m1@uni>", text="Can you send the paper?")
    store = SimpleNamespace(get_message=lambda k: original if k == "uni:m1" else None)
    monkeypatch.setattr(tools, "_mail", lambda: SimpleNamespace(store=store, env={}))
    from backend.mail import accounts
    monkeypatch.setattr(accounts, "discover", lambda env: [ACCT])
    monkeypatch.setattr(drafts, "append", lambda acct, msg: appended.append(msg) or "Entw&APw-rfe")
    monkeypatch.setattr(tools.notes, "write", lambda title, body, kind="note", ref="": written.append(
        (title, body, kind)) or {"id": "n1", "title": title})

    async def fetch(path, limit=laptop.MAX_ATTACH, env=None):
        if "offline" in path:
            raise laptop.LaptopOffline("the laptop isn't answering")
        return b"%PDF paper", "application/pdf", laptop.name_of(path)

    async def local_text(system, user):
        return "Hallo Mark,\n\nanbei das Paper.\n\nKundai"
    monkeypatch.setattr(laptop, "fetch", fetch)
    monkeypatch.setattr(llm, "local_text", local_text)
    return appended, written


def test_email_draft_reply_with_a_laptop_file_goes_to_drafts_not_out(desk):
    appended, written = desk
    r = asyncio.run(tools.email_draft(reply_to="uni:m1", body="send him the paper",
                                      attach=r"C:\Users\kunda\Documents\papers\refined-triples.pdf"))
    assert r.ok and "Entw&APw-rfe" in r.summary and "1 attached" in r.summary
    msg = email.message_from_bytes(appended[0].as_bytes(), policy=email.policy.default)
    assert msg["To"] == "mark@uni" and msg["Subject"] == "Re: Meetings" and msg["In-Reply-To"] == "<m1@uni>"
    assert [a.get_filename() for a in msg.iter_attachments()] == ["refined-triples.pdf"]
    assert "anbei das Paper" in msg.get_body(("plain",)).get_content()
    assert written[0][2] == "draft" and written[0][1].startswith("*In the Uni Greifswald mailbox")
    kinds = {s["kind"] for s in r.sources}
    assert {"note", "laptop", "mail"} <= kinds


def test_email_draft_needs_a_recipient_and_reports_an_offline_laptop(desk):
    appended, _ = desk
    assert not asyncio.run(tools.email_draft(body="hi")).ok
    r = asyncio.run(tools.email_draft(to="a@b.org", attach=r"C:\offline\x.pdf"))
    assert not r.ok and "isn't answering" in r.summary and not appended


def test_laptop_find_turns_hits_into_sources(monkeypatch):
    async def search(q, k=15, content=True, under="", env=None):
        return [{"path": r"C:\Users\kunda\Documents\applications\airbus\fragebogen.pdf", "name": "fragebogen.pdf",
                 "size": 2048, "mtime": 1790000000, "where": "name"}]
    monkeypatch.setattr(laptop, "search", search)
    r = asyncio.run(tools.laptop_find("airbus fragebogen"))
    assert r.sources[0] == {"kind": "laptop", "ref": r"C:\Users\kunda\Documents\applications\airbus\fragebogen.pdf",
                            "title": "fragebogen.pdf"}
    assert r"Documents\applications\airbus\fragebogen.pdf" in r.text


def test_reader_opens_a_laptop_file_and_links_quote_windows_paths(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENT_SMITH_STATE", str(tmp_path))
    from backend import feed
    path = r"C:\Users\kunda\Documents\my notes\plan.md"

    async def read(p, env=None):
        assert p == path
        return {"path": p, "name": "plan.md", "size": 4096, "mtime": 1790000000, "text": "# Plan\n\nship it"}
    monkeypatch.setattr(laptop, "read", read)
    link = feed.link("laptop", path)
    assert " " not in link and "\\" not in link
    ref = link.split("/", 1)[1]                              # what the console sends back
    doc = asyncio.run(feed.read("laptop", ref))
    assert doc["title"] == "plan.md" and "ship it" in doc["markdown"] and doc["actions"][0] == "open"
    assert r"Documents\my notes\plan.md" in doc["markdown"]


def test_unconfigured_laptop_is_offline_not_an_error(monkeypatch):
    monkeypatch.delenv("LAPTOP_NODE_URL", raising=False)
    with pytest.raises(laptop.LaptopOffline):
        asyncio.run(laptop.search("x", env={}))
