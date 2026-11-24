"""
The work desk (backend/work) on a desk tree built in a temp dir: projects from desk.toml, the
newest brief, a thread that waits for Kundai, each project's status sections, commits from a
mocked Gitea, the forge token kept out of git's arguments and errors, and an offline laptop
keeping the last snapshot. Run: python -m pytest backend/tests/test_work.py
"""

import asyncio
import json

import httpx
import pytest

from backend.work import desk, service
from backend.work.service import LocalReader

TOML = '''
[[side]]
name = "kundai"
[[project]]
name = "scilang"
side = "kundai"
about = "A language for scientific workflows."
repo = "https://git.uni-greifswald.de/sachikonyk/scilang.git"
branch = "feature/x"
[[project]]
name = "raw2dcat"
side = "kundai"
about = "Mark's converter."
repo = "https://git.uni-greifswald.de/doerrm/raw2dcat-converter.git"
branch = "main"
'''

STATUS = """# scilang: status

Written up to `804a6fd` ([log](log/2026-11-10-804a6fd.md)).

## Witnessed

- **The scheduler is 8 % shorter** on Mark's protocol
  ([`results.md`](https://example.org/r)).

## Open

- Do all eleven notebooks pass? Where: `execute_all.py` in the clone.
- Which scheduler should the lab use? Where: Mark.

## Against the plan

- Scheduling plan: witnessed progress.
"""


def run(c):
    return asyncio.run(c)


@pytest.fixture()
def tree(tmp_path):
    d = tmp_path / "currentValue"
    files = {
        "desk.toml": TOML,
        "sides/kundai/brief/README.md": "# briefs",
        "sides/kundai/brief/2026-11-03.md": "# Brief, 2026-11-03\n\n## First\nold",
        "sides/kundai/brief/2026-11-10.md": "# Brief, 2026-11-10\n\n## First\n**1. The scheduler.**\n\n## Needs you\n- Which scheduler? [thread](x)\n\n## Later\n- coalition log\n",
        "sides/kundai/inbox/2026-11-12-talk.md": "# Talk with Mark on Thursday\n",
        "sides/kundai/develop/04-enzyme.md": "# Enzyme\n",
        "threads/2026-11-10-sched/001-kundai-ai.md": "---\ntitle: Which scheduler should the lab use?\nto: mark\nstatus: open\n---\nWe found …",
        "threads/2026-11-10-sched/002-mark-ai.md": "---\nstatus: needs-kundai\n---\nOnly Kundai can say whether the max-wait finding matters.",
        "threads/2026-11-01-done/001-mark-ai.md": "---\ntitle: Closed one\nto: kundai\nstatus: closed\n---\nx",
        "projects/scilang/status.md": STATUS,
        "projects/scilang/seen": "804a6fd39731e7625ef43145b62cf1035494aa02\n",
        "projects/scilang/log/2026-11-03-4f48157.md": "# scilang: first look\n",
        "projects/scilang/log/2026-11-10-804a6fd.md": "# scilang: measured noise and a compiler\n",
        "plan/scheduling-algorithms.md": "# Scheduling algorithms: a plan for `decisions`\n",
        "decisions/2026-10-30-scilang-on-gitea.md": "# scilang lives on the uni Gitea only\n",
    }
    for rel, text in files.items():
        (d / rel).parent.mkdir(parents=True, exist_ok=True)
        (d / rel).write_text(text, encoding="utf-8")
    return d


def test_the_desk_reads_projects_brief_threads_and_status(tree):
    snap = run(desk.read_desk(LocalReader(tree)))
    sc, raw = snap["projects"]
    assert [p["name"] for p in snap["projects"]] == ["scilang", "raw2dcat"] and sc["branch"] == "feature/x"
    assert sc["witnessed"] == ["The scheduler is 8 % shorter on Mark's protocol (`results.md`)."]
    assert len(sc["open"]) == 2 and sc["open"][1].startswith("Which scheduler") and sc["against_plan"]
    assert sc["seen"].startswith("804a6fd") and sc["log"][0]["title"] == "scilang: measured noise and a compiler"
    assert raw["open"] == [] and raw["log"] == []                          # a project the desk has not written up
    assert snap["brief"]["date"] == "2026-11-10" and snap["brief"]["first"].startswith("**1. The scheduler")
    assert snap["brief"]["needs_you"] == ["Which scheduler? thread"]
    waiting = snap["needs_you"]
    assert [t["title"] for t in waiting] == ["Which scheduler should the lab use?"]
    assert waiting[0]["asked_by"] == "kundai" and waiting[0]["posts"] == 2 and "max-wait" in waiting[0]["last"]
    assert next(t for t in snap["threads"] if t["status"] == "closed")["waits_for"] == ""
    assert snap["plan"][0]["title"].startswith("Scheduling algorithms") and snap["inbox"][0]["title"] == "Talk with Mark on Thursday"
    assert snap["documents"]["develop"] == [{"file": "sides/kundai/develop/04-enzyme.md", "title": "enzyme"}]


def test_seen_falls_back_to_the_status_line(tree):
    (tree / "projects" / "scilang" / "seen").unlink()
    sc = run(desk.read_desk(LocalReader(tree)))["projects"][0]
    assert sc["seen"] == "804a6fd"


def test_the_reader_stays_inside_the_desk(tree):
    with pytest.raises(ValueError):
        run(LocalReader(tree).read("../outside.md"))
    with pytest.raises(ValueError):
        service.LaptopReader().__class__(r"C:\desk")._path("../x")


def test_activity_counts_commits_not_yet_written_up():
    from backend import forges
    acct = forges.Account("uni", "gitea", "git.uni-greifswald.de", "sachikonyk", "TOKEN")
    asked = []

    def gitea(request: httpx.Request):
        asked.append((request.url.path, dict(request.url.params), request.headers.get("authorization")))
        shas = ["aaaaaaaaaa11", "bbbbbbbbbb22", "804a6fd397"]
        return httpx.Response(200, json=[{"sha": s, "commit": {"message": f"commit {s}\n\nbody",
                                                                "committer": {"date": "2026-11-20T10:00:00Z"}}} for s in shas])
    projects = [{"name": "scilang", "repo": "https://git.uni-greifswald.de/sachikonyk/scilang.git", "branch": "feature/x",
                 "seen": "804a6fd39731e7625ef43145b62cf1035494aa02"},
                {"name": "elsewhere", "repo": "https://github.com/x/y.git", "seen": ""}]
    with_client = httpx.AsyncClient(transport=httpx.MockTransport(gitea), headers=acct.headers)
    run(service.activity(projects, acct, client=with_client))
    assert asked[0][0] == "/api/v1/repos/sachikonyk/scilang/commits" and asked[0][1]["sha"] == "feature/x"
    assert asked[0][2] == "token TOKEN" and len(asked) == 1                # other forges are not asked
    assert projects[0]["unwritten"] == 2 and projects[0]["commits"][0]["subject"] == "commit aaaaaaaaaa11"
    assert "commits" not in projects[1]


def test_the_token_never_reaches_git_arguments_or_errors(monkeypatch, tmp_path):
    from backend import forges
    acct = forges.Account("uni", "gitea", "git.uni-greifswald.de", "sachikonyk", "s3cr3t-token")
    seen = {}

    def fake_run(args, **kw):
        seen["args"], seen["env"] = args, kw["env"]
        class R:
            returncode, stdout, stderr = 128, "", "fatal: Authentication failed for s3cr3t-token"
        return R()
    monkeypatch.setattr(service.subprocess, "run", fake_run)
    monkeypatch.setattr(service, "state_dir", lambda: tmp_path)
    with pytest.raises(RuntimeError) as e:
        service.sync_clone(acct)
    assert "s3cr3t-token" not in " ".join(seen["args"]) and "s3cr3t-token" not in str(e.value)
    assert seen["env"]["GIT_CONFIG_KEY_0"] == "http.extraHeader" and seen["env"]["GIT_TERMINAL_PROMPT"] == "0"


def test_an_offline_laptop_keeps_the_last_snapshot(monkeypatch, tmp_path):
    from backend import laptop
    monkeypatch.setattr(service, "state_dir", lambda: tmp_path)
    monkeypatch.setattr(service, "account", lambda env=None: None)          # no forge account: the laptop is next
    svc = service.WorkService()
    (tmp_path / "work").mkdir(exist_ok=True)
    svc.path().write_text(json.dumps({"source": "laptop", "as_of": "2026-11-20T10:00:00+00:00", "projects": [{"name": "scilang"}]}))

    async def offline(*a, **k):
        raise laptop.LaptopOffline("the laptop isn't answering")
    monkeypatch.setattr(laptop, "listing", offline)
    monkeypatch.setattr(laptop, "read", offline)
    snap = run(svc.run_pass())
    assert snap["stale"] and snap["projects"] == [{"name": "scilang"}] and any("kept the last" in n for n in snap["notes"])


def test_a_clone_is_read_as_the_desk(monkeypatch, tmp_path, tree):
    monkeypatch.setattr(service, "state_dir", lambda: tmp_path)
    monkeypatch.setattr(service, "account", lambda env=None: object())
    monkeypatch.setattr(service, "sync_clone", lambda acct: tree)
    monkeypatch.setattr(service, "desk_log", lambda d: [{"sha": "ff12f0f", "subject": "desk(kundai): notes"}])

    async def no_activity(projects, acct, client=None):
        return None
    monkeypatch.setattr(service, "activity", no_activity)
    svc = service.WorkService()
    snap = run(svc.run_pass())
    assert snap["source"] == "gitea" and snap["desk_log"][0]["sha"] == "ff12f0f" and len(snap["projects"]) == 2
    assert svc.snapshot()["brief"]["date"] == "2026-11-10"


def test_the_agent_tools_summarise_and_read(monkeypatch, tmp_path, tree):
    from backend.tasks import tools
    from backend.tasks.tools import Run
    monkeypatch.setattr(service, "state_dir", lambda: tmp_path)
    r = Run({"id": "t"}, tmp_path, cloud=False)
    assert "not been read yet" in run(tools.work_desk(r))[0]
    snap = run(desk.read_desk(LocalReader(tree)))
    snap.update(source="gitea", as_of="2026-11-24T04:00:00+00:00")
    (tmp_path / "work").mkdir(exist_ok=True)
    service.WORK.path().write_text(json.dumps(snap), encoding="utf-8")
    all_, g = run(tools.work_desk(r))
    assert all_["projects"][0] == {"name": "scilang", "about": "A language for scientific workflows.", "open_items": 2,
                                   "latest_write_up": "scilang: measured noise and a compiler", "newest_commit": None,
                                   "commits_not_written_up": None}
    assert all_["threads_waiting_for_kundai"][0]["title"].startswith("Which scheduler") and g[0]["node"]["id"] == "work"
    one, _ = run(tools.work_desk(r, "SCILANG"))
    assert len(one["open"]) == 2
    assert "no project" in run(tools.work_desk(r, "nope"))[0]
    monkeypatch.setattr(service, "_dir", lambda: tree.parent)               # the clone lives at <work>/currentValue
    (tree / ".git").mkdir()
    service.WORK.path().write_text(json.dumps(snap), encoding="utf-8")
    text, _ = run(tools.read_work_document(r, "projects/scilang/status.md"))
    assert text.startswith("# scilang: status")
    assert "only the desk" in run(tools.read_work_document(r, "projects/scilang/seen"))[0]
