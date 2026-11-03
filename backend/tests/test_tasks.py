"""
The task agent (backend/tasks) with no model and no network: the loop calls tools until the
model answers, a refused account moves it to the next model, a failing tool is a result,
the graph grows from what tools found; opening links refuses private addresses and reads
PDFs and pages. Run: python -m pytest backend/tests/test_tasks.py
"""

import asyncio
import json

import httpx
import pytest

from backend.primitive.route import ChatError
from backend.tasks import agent, tools, web
from backend.tasks.tools import Run


def run(c):
    return asyncio.run(c)


class FakeProviders:
    def __init__(self, script, fail=None):
        self.script = list(script)         # assistant messages in order
        self.fail = fail or {}             # model -> ChatError
        self.seen = []
        self.refusals = {}

    def refused(self):
        return dict(self.refusals)

    def remember_refusals(self, b):
        self.refusals.update(b)

    def available(self, p):
        return True, ""

    async def chat_tools(self, model, messages, tools_):
        self.seen.append((model, [m["role"] for m in messages]))
        if model in self.fail:
            raise self.fail[model]
        return self.script.pop(0)


def call(name, args, cid="c1"):
    return {"role": "assistant", "content": "", "tool_calls": [
        {"id": cid, "type": "function", "function": {"name": name, "arguments": json.dumps(args)}}]}


def test_loop_calls_tools_until_the_model_answers_and_grows_the_graph(tmp_path, monkeypatch):
    async def fake_search(run_, sender="", words="", since_days=0, limit=15):
        return [{"key": "k1", "subject": "Unterlagen"}], [tools.node("mail:k1", "mail", "Unterlagen", ref="k1")]
    monkeypatch.setitem(tools.TOOLS, "search_mail", (fake_search, tools.TOOLS["search_mail"][1]))
    monkeypatch.setattr(agent, "TOOLS", tools.TOOLS)
    prov = FakeProviders([call("search_mail", {"sender": "Sadewasser"}),
                          {"role": "assistant", "content": "Found 1 mail."}],
                         fail={"openai/gpt-5.5": ChatError('HTTP 429: {"code":"insufficient_quota"}')})
    task = {"text": "find Mandy's forms", "model": None}

    async def nothing():
        return None
    run(agent.run_agent(task, Run(task, tmp_path, cloud=True), prov, nothing))
    assert task["answer"] == "Found 1 mail." and task["ran_on"] == "deepseek/deepseek-v4-pro"
    assert prov.refusals == {"openai": "the account refused the call (no credit?)"}
    assert task["steps"][0]["tool"] == "search_mail" and task["steps"][0]["args"] == {"sender": "Sadewasser"}
    ids = {n["id"] for n in task["graph"]["nodes"]}
    assert {"task", "call:1", "mail:k1", "answer"} <= ids
    assert {"source": "call:1", "target": "mail:k1", "kind": "produces"} in task["graph"]["links"]
    # the tool result went back to the model as a tool message
    assert prov.seen[-1][1] == ["system", "user", "assistant", "tool"]


def test_a_failing_tool_is_a_result_and_unknown_tools_are_named(tmp_path, monkeypatch):
    async def broken(run_, key):
        raise RuntimeError("imap down")
    monkeypatch.setitem(tools.TOOLS, "read_mail", (broken, tools.TOOLS["read_mail"][1]))
    prov = FakeProviders([call("read_mail", {"key": "k"}), call("fly", {}, "c2"), {"role": "assistant", "content": "done"}])
    task = {"text": "t", "model": "openai/gpt-5.5"}

    async def nothing():
        return None
    run(agent.run_agent(task, Run(task, tmp_path, cloud=True), prov, nothing))
    assert "read_mail failed: RuntimeError: imap down" in task["steps"][0]["result"]
    assert "there is no tool fly" in task["steps"][1]["result"]


def test_links_are_read_from_html_and_text():
    html = '<p>Bitte <a href="/formulare/steuer.pdf">Formular</a> und <a href="https://uni.de/x">Seite</a> <a href="mailto:a@b">m</a></p>'
    ls = web.links_in_html(html, "https://www.uni-greifswald.de/personal/")
    assert ls[0] == {"url": "https://www.uni-greifswald.de/formulare/steuer.pdf", "text": "Formular", "pdf": True}
    assert len(ls) == 2
    assert web.links_in_text("see https://a.de/f.pdf, and https://b.de.")[0]["pdf"] is True


@pytest.mark.parametrize("url", ["http://127.0.0.1:8000/secrets", "http://localhost/", "http://10.0.0.5/", "file:///etc/passwd"])
def test_private_addresses_are_refused(url):
    with pytest.raises(web.Refused):
        run(web.fetch(url))


def test_fetch_saves_pdfs_and_reads_pages(monkeypatch):
    async def public(host):
        return None
    monkeypatch.setattr(web, "_public", public)

    def handler(req):
        if req.url.path == "/go":
            return httpx.Response(302, headers={"location": "/form.pdf"})
        if req.url.path == "/form.pdf":
            return httpx.Response(200, content=b"%PDF-1.7 ...", headers={"content-type": "application/pdf"})
        if req.url.path == "/login":
            return httpx.Response(200, text='<html><title>SSO</title><input type="password" name="p"></html>',
                                  headers={"content-type": "text/html"})
        return httpx.Response(200, text='<html><title>Personal</title><a href="a.pdf">A</a></html>', headers={"content-type": "text/html"})

    c = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    f = run(web.fetch("https://uni.example/go", client=c))
    assert f.is_pdf and f.url.endswith("/form.pdf") and f.filename == "form.pdf"
    page = run(web.fetch("https://uni.example/personal", client=c))
    assert page.title == "Personal" and page.links[0]["pdf"]
    assert run(web.fetch("https://uni.example/login", client=c)).login


def test_old_tool_results_shrink_and_the_latest_stay_whole():
    msgs = [{"role": "system", "content": "s"}] + [{"role": "tool", "content": "x" * 5000} for _ in range(10)]
    agent.compact(msgs)
    lens = [len(m["content"]) for m in msgs[1:]]
    assert all(n < 800 for n in lens[:4]) and all(n == 5000 for n in lens[4:])


def test_a_task_resumes_from_its_conversation_with_its_files(tmp_path, monkeypatch):
    from backend.tasks.service import TaskService
    prov = FakeProviders([{"role": "assistant", "content": "first"}, {"role": "assistant", "content": "second"}])

    async def go():
        svc = TaskService(prov, root=tmp_path)
        t = svc.start("do it", model="openai/gpt-5.5")
        while svc.get(t["id"])["status"] == "running":
            await asyncio.sleep(0.01)
        (tmp_path / t["id"] / "files").mkdir(exist_ok=True)
        (tmp_path / t["id"] / "files" / "f1-form.pdf").write_bytes(b"%PDF-1.7")
        svc.get(t["id"])["files"] = [{"id": "f1", "name": "form.pdf"}]          # saved before paths were kept
        svc.resume(t["id"], "now fill the form")
        while svc.get(t["id"])["status"] == "running":
            await asyncio.sleep(0.01)
        return svc.get(t["id"])
    t = run(go())
    assert t["answer"] == "second"
    roles, last = prov.seen[-1]
    assert last == ["system", "user", "assistant", "user"]              # the earlier turn, then the hint
    r = Run(t, tmp_path / t["id"], cloud=True)
    r.restore_files()
    assert r.files["f1"]["path"].endswith("f1-form.pdf")


class FakeImap:
    """Enough of imaplib for search_all: two folders, one match in INBOX."""
    def __init__(self, raw):
        self.raw, self.sel, self.searched = raw, None, []

    def select(self, folder, readonly=False):
        assert readonly
        self.sel = folder.strip("\"")
        return "OK", [b"1"]

    def uid(self, cmd, *args):
        if cmd == "SEARCH":
            self.searched.append(args)
            return "OK", [b"7" if self.sel == "INBOX" else b""]
        return "OK", [(b"1 (UID 7 BODY[] {10}", self.raw)]


def test_search_all_reads_every_date_without_touching_flags(monkeypatch):
    from backend.mail import imap, attachments
    raw = b"From: LAF <laf@mv.de>\r\nSubject: Steuer-ID\r\nMessage-ID: <a@b>\r\nDate: Mon, 3 Mar 2025 10:00:00 +0000\r\n\r\nIhre Steuer-ID ist bekannt."
    fake = FakeImap(raw)
    monkeypatch.setattr(imap, "connect", lambda acct: fake)
    monkeypatch.setattr(imap, "folders", lambda conn: ["INBOX", "Sent"])
    monkeypatch.setattr(imap, "_close", lambda conn: None)
    monkeypatch.setattr(attachments, "save", lambda key, raw: [])
    acct = type("A", (), {"id": "uni"})()
    got = imap.search_all(acct, ["Steuer-ID"], sender="laf", limit=5)
    assert len(got) == 1 and got[0].subject == "Steuer-ID" and got[0].date.year == 2025
    assert fake.searched[0] == (None, "TEXT", '"Steuer-ID"', "FROM", '"laf"')


def test_draft_reply_attaches_filled_forms_and_never_sends(tmp_path, monkeypatch):
    import backend.mail.service as ms
    from backend.mail import accounts, drafts
    from backend.forms import service as fs
    msg = type("M", (), {"account": "uni", "from_addr": "mandy.sadewasser@uni-greifswald.de",
                         "subject": "fehlende Unterlagen", "message_id": "<m@uni>"})()
    monkeypatch.setattr(ms, "MAIL", type("X", (), {"store": type("S", (), {"get_message": lambda self, k: msg})(), "env": {}})())
    acct = type("A", (), {"id": "uni", "kind": "imap", "addresses": ["kundai@uni"], "user": "k"})()
    monkeypatch.setattr(accounts, "discover", lambda env: [acct])
    put = []
    monkeypatch.setattr(drafts, "append", lambda a, m: put.append(m) or "Drafts")
    monkeypatch.setattr(fs, "service", lambda: type("F", (), {"filled": lambda self, fid: (b"%PDF", "Personalfragebogen-filled.pdf", "application/pdf")})())
    task = {}
    res, g = run(tools.draft_reply(Run(task, tmp_path, cloud=True), "uni:x", "Anbei die Formulare.", ["f1"]))
    assert res["draft"] == "in uni/Drafts" and res["attachments"] == ["Personalfragebogen-filled.pdf"]
    m = put[0]
    assert m["To"] == "mandy.sadewasser@uni-greifswald.de" and m["Subject"] == "Re: fehlende Unterlagen"
    assert m["In-Reply-To"] == "<m@uni>" and task["drafts"][0]["mailbox"] == "uni"
