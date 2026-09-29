"""The runtime network: station states, the next stop, and interchanges only from real links."""

from datetime import datetime, timedelta, timezone

from backend import network
from backend.network import Line

NOW = datetime.now(timezone.utc)


def _line(lid, mode, name, *stations, sub=""):
    ln = Line(lid, mode, name, sub=sub)
    for st in stations:
        ln.station(*st[:3], **st[3] if len(st) > 3 else {})
    return ln


def test_states_next_stop_and_queue(monkeypatch):
    plan = _line("plan-move", "S", "Move to Am Ryck",
                 ("keys", "collect keys", NOW - timedelta(days=2), {"done": True}),
                 ("deposit", "pay deposit", NOW - timedelta(hours=5), {"due": True}),
                 ("van", "book van", NOW + timedelta(days=3)),
                 ("boxes", "buy boxes", None),
                 ("wifi", "internet contract", NOW + timedelta(days=5), {"blocked": "needs “sign lease”"}))
    for name in ("project_lines", "plan_lines", "mail_lines"):
        monkeypatch.setattr(network, name, lambda *a, **k: [])
    monkeypatch.setattr(network, "repo_lines", lambda now: [plan])
    monkeypatch.setattr(network, "_schedule", lambda: {"task": {}, "plan": {}, "pool": {}, "event": {}})
    d = network.build()
    st = {s["title"]: s for s in d["lines"][0]["stations"]}
    assert [s["title"] for s in d["lines"][0]["stations"]][-1] == "buy boxes"      # undated queues last
    assert st["collect keys"]["state"] == "past" and st["pay deposit"]["state"] == "late"
    assert st["book van"]["state"] == "future" and st["buy boxes"]["placed"] == "queued"
    assert st["internet contract"]["state"] == "blocked"
    assert d["lines"][0]["next"] == st["pay deposit"]["id"] and d["lines"][0]["code"] == "S1"
    assert d["lines"][0]["progress"] == [1, 5]


def test_interchanges_come_only_from_real_links():
    proj = _line("project-llm", "U", "Greifswald group LLM", ("m1", "contract", NOW + timedelta(days=1)),
                 sub="First project as staff scientist, NFDI4Cat/Dörr group")
    proj.subtools = [{"id": "bloodhound", "name": "Bloodhound"}]
    repo = _line("repo-bloodhound", "T", "bloodhound", ("d1", "3 commits", NOW - timedelta(days=1), {"done": True}))
    other = _line("repo-purpose", "T", "purpose", ("d1", "1 commit", NOW - timedelta(days=1), {"done": True}))
    mark = _line("mail-mark", "B", "Mark Doerr", ("a", "update TA2 agenda", NOW + timedelta(hours=3)),
                 ("b", "what is the purpose of this meeting", NOW + timedelta(days=2)))
    alex = _line("mail-alex", "B", "Sommer-Behr, Alexander", ("a", "join TA2", NOW + timedelta(hours=4)))
    mark.stations[0]["subject"] = "TA2 meeting heute"
    alex.stations[0]["subject"] = "RE: TA2 meeting heute"
    got = {t["why"] for t in network.transfers([proj, repo, other, mark, alex])}
    assert "subtool Bloodhound" in got
    assert "same thread: ta2 meeting heute" in got
    assert "Mark Doerr is part of Greifswald group LLM" in got
    assert not any("purpose" in w for w in got)          # an ordinary word is not a repo mention


def test_repo_mention_needs_repo_context():
    repo = _line("repo-hegel", "T", "hegel", ("d", "x", NOW, {"done": True}))
    yes = _line("mail-a", "B", "A", ("a", "push the fix to the hegel repo", NOW + timedelta(days=1)))
    no = _line("mail-b", "B", "B", ("a", "reading Hegel tonight", NOW + timedelta(days=1)))
    got = network.transfers([repo, yes, no])
    assert [t["a"].split(":")[0] for t in got] == ["mail-a"]
