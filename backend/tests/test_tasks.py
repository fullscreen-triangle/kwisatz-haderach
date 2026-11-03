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
