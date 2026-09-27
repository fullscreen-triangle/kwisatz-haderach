"""
Agent runtime without models or network: plan validation, dependency-ordered execution,
the run graph, argument references, escalation behaviour, the fast path, attachments,
and the repo history. Run: python -m pytest backend/tests/test_agents.py
"""

import asyncio
import json
from email.message import EmailMessage

import pytest

from backend.agents import llm, runner
from backend.agents.runner import Plan, Run, execute
from backend.agents.tools import REGISTRY, Tool, ToolResult


@pytest.fixture
def fake_tools(monkeypatch):
    calls = []

    async def find(about: str = "") -> ToolResult:
        calls.append(("find", about))
        return ToolResult(summary="2 emails", text="[uni:aa] slides due Wed",
                          sources=[{"kind": "mail", "ref": "uni:aa", "title": "Folien"}])

    async def read(key: str) -> ToolResult:
        calls.append(("read", key))
        return ToolResult(summary="read it", text="full text", sources=[{"kind": "mail", "ref": key, "title": "Folien"}])

    saved = dict(REGISTRY)
    REGISTRY.clear()
    REGISTRY["find_mail"] = Tool("find_mail", "find", {"about": "words"}, find)
    REGISTRY["read_mail"] = Tool("read_mail", "read", {"key": "key"}, read)
    yield calls
    REGISTRY.clear()
    REGISTRY.update(saved)


def plan(*subtasks):
    return {"subtasks": [dict(id=i, goal=g, tool=t, args=a, needs=n) for i, g, t, a, n in subtasks]}


def test_plan_rejects_unknown_tool_cycles_and_dangling(fake_tools):
    with pytest.raises(ValueError):
        Plan.model_validate(plan(("s1", "x", "nope", [], []))).check()
    with pytest.raises(ValueError):
        Plan.model_validate(plan(("s1", "a", "find_mail", [], ["s2"]), ("s2", "b", "find_mail", [], ["s1"]))).check()
    with pytest.raises(ValueError):
        Plan.model_validate(plan(("s1", "a", "find_mail", [], ["s9"]))).check()
    with pytest.raises(ValueError):                                      # more than MAX_SUBTASKS
        Plan.model_validate({"subtasks": [dict(id=f"s{i}", goal="g", tool="find_mail", args=[], needs=[])
                                          for i in range(1, 11)]}).check()


def test_run_orders_by_needs_fills_refs_and_builds_graph(fake_tools, monkeypatch):
    async def local_json(system, user, schema):
        assert "find_mail" in schema["properties"]["subtasks"]["items"]["properties"]["tool"]["enum"]
        return plan(("s1", "find the mail", "find_mail", [{"name": "about", "value": "Folien"}], []),
                    ("s2", "read it", "read_mail", [{"name": "key", "value": "{{s1}}"}], ["s1"]))

    async def local_text(system, user):
        assert "[1] Folien" in user
        return "Slides are due Wednesday [1]."

    monkeypatch.setattr(llm, "local_json", local_json)
    monkeypatch.setattr(llm, "local_text", local_text)
    run, ticks = Run("summarise the Folien mail"), []
    asyncio.run(execute(run, lambda: ticks.append(run.status)))
    assert run.status == "done" and run.brain == "local" and run.answer.startswith("Slides")
    assert fake_tools == [("find", "Folien"), ("read", "uni:aa")]           # s2 got s1's first source
    kinds = {n["kind"] for n in run.nodes.values() if "kind" in n}
    assert {"command", "subtask", "agent", "mail", "result"} <= kinds
    assert {"source": "s1", "target": "s2", "kind": "needs"} in run.links
    assert len(run.sources) == 1 and len(ticks) >= 4


def test_bad_local_plans_escalate_or_fail_honestly(fake_tools, monkeypatch):
    async def bad(system, user, schema):
        return {"subtasks": [{"id": "s1", "goal": "x", "tool": "not-a-tool", "args": [], "needs": []}]}

    monkeypatch.setattr(llm, "local_json", bad)
    monkeypatch.setattr(llm, "claude_available", lambda: False)
    run = Run("do something complicated")
    asyncio.run(execute(run, lambda: None))
    assert run.status == "failed" and "Claude escalation unavailable" in run.error

    async def good(system, user, schema):
        return plan(("s1", "find", "find_mail", [], []))

    async def text(system, user):
        return "ok"
    monkeypatch.setattr(llm, "claude_available", lambda: True)
    monkeypatch.setattr(llm, "claude_json", good)
    monkeypatch.setattr(llm, "claude_text", text)
    run = Run("do something complicated")
    asyncio.run(execute(run, lambda: None))
    assert run.status == "done" and run.brain == "claude" and "local model's plans failed" in run.note


def test_deep_prefix_goes_straight_to_claude(fake_tools, monkeypatch):
    seen = []

    async def local_json(*a):
        seen.append("local")
        return {}

    async def claude_json(system, user, schema):
        seen.append(("claude", user))
        return plan(("s1", "find", "find_mail", [], []))

    async def claude_text(system, user):
        return "answer"
    monkeypatch.setattr(llm, "local_json", local_json)
    monkeypatch.setattr(llm, "claude_available", lambda: True)
    monkeypatch.setattr(llm, "claude_json", claude_json)
    monkeypatch.setattr(llm, "claude_text", claude_text)
    run = Run("deep: plan my week around the NFDI4Cat deadlines")
    asyncio.run(execute(run, lambda: None))
    assert seen == [("claude", "plan my week around the NFDI4Cat deadlines")] and run.status == "done"


def test_deep_without_a_key_runs_locally_and_says_so(fake_tools, monkeypatch):
    async def local_json(*a):
        return plan(("s1", "find", "find_mail", [], []))

    async def local_text(system, user):
        return "answer"
    monkeypatch.setattr(llm, "local_json", local_json)
    monkeypatch.setattr(llm, "local_text", local_text)
    monkeypatch.setattr(llm, "claude_available", lambda: False)
    run = Run("deep: plan my week")
    asyncio.run(execute(run, lambda: None))
    assert run.status == "done" and run.brain == "local" and "no live Anthropic key" in run.note


def test_fast_path_uses_intent_rule_without_a_model(monkeypatch):
    from backend.routes import intent

    async def dispatch(choice, want_summary):
        return {"kind": "facts", "answer": f"routed {choice.tool}"}

    async def no_model(*a, **k):
        raise AssertionError("fast path must not call a model")
    monkeypatch.setattr(intent, "_dispatch", dispatch)
    monkeypatch.setattr(llm, "local_json", no_model)
    run = Run("how many github repositories do I have")
    asyncio.run(execute(run, lambda: None))
    assert run.brain == "rule" and run.answer == "routed facts" and run.status == "done"


# ----------------------------------------------------------------- attachments

def tiny_pdf(text: str) -> bytes:
    """A minimal but well-formed one-page PDF (with a real xref table) showing `text`."""
    nl = b"\n"
    stream = f"BT /F1 18 Tf 20 60 Td ({text}) Tj ET".encode()
    objs = [b"<</Type/Catalog/Pages 2 0 R>>", b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
            b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
            b"<</Length %d>>stream" % len(stream) + nl + stream + nl + b"endstream",
            b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>"]
    out, offsets = bytearray(b"%PDF-1.4" + nl), []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += b"%d 0 obj" % i + nl + body + nl + b"endobj" + nl
    xref = len(out)
    out += b"xref" + nl + b"0 %d" % (len(objs) + 1) + nl + b"0000000000 65535 f " + nl
    out += b"".join(b"%010d 00000 n " % o + nl for o in offsets)
    out += b"trailer<</Size %d/Root 1 0 R>>" % (len(objs) + 1) + nl + b"startxref" + nl + b"%d" % xref + nl + b"%%EOF"
    return bytes(out)


def test_attachments_saved_and_extracted(tmp_path, monkeypatch):
    import io
    import docx
    from backend.mail import attachments
    monkeypatch.setattr(attachments, "state_dir", lambda: tmp_path)
    d = docx.Document()
    d.add_paragraph("Antrag bis Freitag einreichen")
    buf = io.BytesIO()
    d.save(buf)
    m = EmailMessage()
    m["From"], m["Subject"], m["Message-ID"] = "a@b.de", "Unterlagen", "<x@y>"
    m.set_content("siehe Anhang")
    m.add_attachment(tiny_pdf("Frist 30.09."), maintype="application", subtype="pdf", filename="frist.pdf")
    m.add_attachment(buf.getvalue(), maintype="application",
                     subtype="vnd.openxmlformats-officedocument.wordprocessingml.document", filename="antrag.docx")
    meta = attachments.save("uni:0123abcd", m.as_bytes())
    assert [a["name"] for a in meta] == ["frist.pdf", "antrag.docx"]
    assert "Frist 30.09." in attachments.text("uni:0123abcd", 0)
    assert "Antrag bis Freitag" in attachments.text("uni:0123abcd", 1)
    assert "## Attachment: antrag.docx" in attachments.excerpt_for_md("uni:0123abcd")


# ----------------------------------------------------------------- repos

def test_repo_history_and_active_subset(tmp_path, monkeypatch):
    from datetime import datetime, timezone
    from backend.repos import service as rs
    monkeypatch.setattr(rs, "state_dir", lambda: tmp_path)
    monkeypatch.setattr(rs, "inventory", lambda: [
        {"name": "fresh", "full_name": "o/fresh", "pushed_at": "2026-09-20T10:00:00Z"},
        {"name": "old", "full_name": "o/old", "pushed_at": "2025-01-01T00:00:00Z"},
        {"name": "forked", "full_name": "o/forked", "pushed_at": "2026-09-21T00:00:00Z", "fork": True}])
    subset = [r["name"] for r in rs.active_subset(datetime(2026, 9, 27, tzinfo=timezone.utc))]
    assert subset == ["fresh"]
    rs.save_settings({"include": ["old"]})
    assert [r["name"] for r in rs.active_subset(datetime(2026, 9, 27, tzinfo=timezone.utc))] == ["fresh", "old"]
    (tmp_path / "repos").mkdir(exist_ok=True)
    with open(tmp_path / "repos" / "history.jsonl", "w") as f:
        f.write(json.dumps({"ts": "2026-09-26T10:00:00+00:00", "repo": "fresh", "chi": 2.0, "commits": 0}) + "\n")
        f.write(json.dumps({"ts": "2026-09-27T10:00:00+00:00", "repo": "fresh", "chi": 3.0, "commits": 4}) + "\n")
    assert rs.last_records()["fresh"]["chi"] == 3.0
    assert len(rs.history(since="2026-09-27")) == 1
    assert rs._shortstat(" 3 files changed, 40 insertions(+), 2 deletions(-)") == {"files": 3, "insertions": 40, "deletions": 2}


def test_direct_button_run_skips_planning(fake_tools, monkeypatch):
    async def no_model(*a, **k):
        raise AssertionError("a button run must not plan")
    monkeypatch.setattr(llm, "local_json", no_model)
    monkeypatch.setattr(llm, "local_text", no_model)
    run = Run("Read this email", "button", {"tool": "read_mail", "args": {"key": "uni:bb"}})
    asyncio.run(execute(run, lambda: None))
    assert run.status == "done" and run.brain == "direct" and run.answer == "full text"
    assert fake_tools == [("read", "uni:bb")]
