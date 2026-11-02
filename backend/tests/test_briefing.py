"""
The brief (backend/briefing.py): paperwork first, at most three things in `first`, a source
that fails is named instead of blanking the brief, and nothing waiting means nothing said.
Run: python -m pytest backend/tests/test_briefing.py
"""

from backend import briefing


def fake(kind, n):
    return lambda: [briefing._item(kind, f"{kind} {i}", "why", "do", "/x", "src") for i in range(n)]


def boom():
    raise RuntimeError("down")


def test_order_limit_and_a_failing_source(monkeypatch):
    monkeypatch.setattr(briefing, "_forms", fake("form", 1))
    monkeypatch.setattr(briefing, "_mail_and_plan", lambda: fake("mail", 2)() + fake("plan", 1)())
    monkeypatch.setattr(briefing, "_keys", boom)
    monkeypatch.setattr(briefing, "_credit", fake("credit", 1))
    monkeypatch.setattr(briefing, "_tasks", fake("task", 0))
    monkeypatch.setattr(briefing, "_later", lambda: [])
    b = briefing.build()
    assert [i["kind"] for i in b["first"]] == ["form", "plan", "mail"]
    assert [i["kind"] for i in b["needs_you"]] == ["mail", "credit"]
    assert b["unread_sources"] == ["keys: RuntimeError"]


def test_nothing_waiting_says_nothing(monkeypatch):
    for part in ("_forms", "_mail_and_plan", "_keys", "_credit", "_tasks"):
        monkeypatch.setattr(briefing, part, fake("form", 0))
    monkeypatch.setattr(briefing, "_later", lambda: [{"title": "repo moved"}])
    b = briefing.build()
    assert b["first"] == [] and b["needs_you"] == [] and b["later"]
