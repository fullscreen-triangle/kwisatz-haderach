"""The laptop node's boundary: token required, only served roots, never a credential."""

import json

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def node(tmp_path, monkeypatch):
    state, root, outside = tmp_path / "state", tmp_path / "Documents", tmp_path / "Elsewhere"
    for d in (state, root / "applications" / "airbus", root / ".ssh", outside):
        d.mkdir(parents=True)
    (state / "laptop-node.json").write_text(json.dumps({"roots": [str(root)]}), encoding="utf-8")
    (root / "applications" / "airbus" / "zusatz-fragebogen_Airbus.md").write_text("Fragebogen für Airbus", encoding="utf-8")
    (root / "applications" / "cover-letter.txt").write_text("Dear committee", encoding="utf-8")
    for job in ("bonn", "munich", "dresden", "kiel"):          # like the laptop: many cover letters
        (root / "applications" / job).mkdir()
        (root / "applications" / job / "cover-letter.pdf").write_bytes(b"%PDF-1.4")
    (root / "notes.log").write_text("build noise", encoding="utf-8")
    (root / ".env").write_text("API_KEY=nope", encoding="utf-8")
    (root / "vault.kdbx").write_bytes(b"\x03\xd9")
    (root / ".ssh" / "config").write_text("Host x", encoding="utf-8")
    (outside / "private.txt").write_text("not served", encoding="utf-8")
    monkeypatch.setenv("LAPTOP_NODE_STATE", str(state))
    from tools.laptop_node import config, index, server, winsearch
    monkeypatch.setattr(winsearch, "search", lambda q, k=20, timeout=20: [])   # no Windows Search in tests
    tok = config.token(create=True)
    index.rebuild()
    c = TestClient(server.app)
    c.headers["Authorization"] = f"Bearer {tok}"
    return c, root, outside


def test_every_route_but_health_needs_the_token(node):
    c, root, _ = node
    anon = TestClient(c.app)
    assert anon.get("/health").status_code == 200 and "roots" not in anon.get("/health").json()
    for url in ("/search?q=airbus", "/list", f"/read?path={root / 'applications' / 'cover-letter.txt'}"):
        assert anon.get(url).status_code == 401
        assert anon.get(url, headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_search_ranks_the_rare_term_and_skips_noise_and_secrets(node):
    c, _, _ = node
    names = [r["name"] for r in c.get("/search", params={"q": "airbus cover letter"}).json()["results"]]
    assert names[0] == "zusatz-fragebogen_Airbus.md"
    everything = [r["name"] for r in c.get("/search", params={"q": "env kdbx notes config vault"}).json()["results"]]
    assert not {".env", "vault.kdbx", "notes.log", "config"} & set(everything)


def test_read_and_file_serve_only_inside_roots_and_never_credentials(node):
    c, root, outside = node
    doc = root / "applications" / "airbus" / "zusatz-fragebogen_Airbus.md"
    r = c.get("/read", params={"path": str(doc)}).json()
    assert r["text"] == "Fragebogen für Airbus"
    assert c.get("/file", params={"path": str(doc)}).content == doc.read_bytes()
    assert c.get("/read", params={"path": str(outside / "private.txt")}).status_code == 403
    assert c.get("/read", params={"path": str(root / ".." / "Elsewhere" / "private.txt")}).status_code == 403
    for secret in (root / ".env", root / "vault.kdbx", root / ".ssh" / "config"):
        assert c.get("/file", params={"path": str(secret)}).status_code == 403
    assert c.get("/read", params={"path": str(root / "missing.pdf")}).status_code == 404


def test_listing_hides_credentials(node):
    c, root, _ = node
    names = {e["name"] for e in c.get("/list", params={"path": str(root)}).json()["entries"]}
    assert "applications" in names and not {".env", "vault.kdbx", ".ssh"} & names


def test_query_terms_fold_german(node):
    from tools.laptop_node import index
    assert index.terms("Dörr Fragebogen für mich") == [("dorr", "doerr"), ("fragebogen",), ("mich",)]


# --------------------------------------------------------------------------- file plans (drogba)

from tools.laptop_node import plans as _plans

needs_drogba = pytest.mark.skipif(_plans.drogba() is None, reason="drogba is not installed")


def _allow_runs(root, yes=True):
    from tools.laptop_node import config
    p = config.state_dir() / "laptop-node.json"
    p.write_text(json.dumps({"roots": [str(root)], "plans": yes}), encoding="utf-8")


def _sort_pdfs(root, per_job=True):
    apps = root / "applications"
    into = 'apps / "pdf" / name of d' if per_job else 'apps / "pdf"'
    return (f'task "pdfs together"\nlet apps = "{apps}"\nmake folder apps / "pdf"\n'
            f'for each d in folders in apps matching "{{bonn,kiel,kassel}}"\n'
            + (f'    make folder {into}\n' if per_job else '')
            + f'    move d / "cover-letter.pdf" to {into}\nend\n')


def test_plans_need_the_token(node):
    c, root, _ = node
    anon = TestClient(c.app)
    for url in ("/plan/preview", "/plan/run"):
        assert anon.post(url, json={"plan": "make folder \"C:\\x\"", "digest": "0" * 64}).status_code == 401


@needs_drogba
def test_preview_lists_every_step_and_changes_nothing(node):
    c, root, _ = node
    pv = c.post("/plan/preview", json={"plan": _sort_pdfs(root)}).json()
    assert pv["runnable"] and pv["task"] == "pdfs together" and len(pv["digest"]) == 64
    assert [s["op"] for s in pv["steps"]] == ["make_folder", "make_folder", "move", "make_folder", "move"]
    assert pv["runs_allowed"] is False                                  # off until the laptop says so
    assert not (root / "applications" / "pdf").exists()
    assert (root / "applications" / "bonn" / "cover-letter.pdf").exists()
    clash = c.post("/plan/preview", json={"plan": _sort_pdfs(root, per_job=False)}).json()   # both into one folder
    assert not clash["runnable"] and any("never overwrites" in p["message"] for p in clash["problems"])


@needs_drogba
def test_a_run_is_off_until_the_laptop_allows_it(node):
    c, root, _ = node
    pv = c.post("/plan/preview", json={"plan": _sort_pdfs(root)}).json()
    r = c.post("/plan/run", json={"plan": _sort_pdfs(root), "digest": pv["digest"]})
    assert r.status_code == 403 and "plans" in r.json()["detail"]
    assert not (root / "applications" / "pdf").exists()


@needs_drogba
def test_a_run_does_exactly_the_preview_and_refuses_a_changed_disk(node):
    c, root, _ = node
    _allow_runs(root)
    plan = _sort_pdfs(root)
    pv = c.post("/plan/preview", json={"plan": plan}).json()
    (root / "applications" / "kassel").mkdir()                          # same plan, a disk that gives more steps
    (root / "applications" / "kassel" / "cover-letter.pdf").write_bytes(b"%PDF-1.7 kassel")
    stale = c.post("/plan/run", json={"plan": plan, "digest": pv["digest"]}).json()
    assert "digest" in stale["error"] and not (root / "applications" / "pdf").exists()
    pv = c.post("/plan/preview", json={"plan": plan}).json()
    out = c.post("/plan/run", json={"plan": plan, "digest": pv["digest"]}).json()
    assert out["report"]["completed"] and out["report"]["executed"] == 7
    assert (root / "applications" / "pdf" / "kassel" / "cover-letter.pdf").read_bytes() == b"%PDF-1.7 kassel"
    assert not (root / "applications" / "bonn" / "cover-letter.pdf").exists()
    again = c.post("/plan/run", json={"plan": plan, "digest": pv["digest"]}).json()   # a second click
    assert again.get("error") and "report" not in again


@needs_drogba
def test_a_plan_never_touches_a_credential_or_leaves_the_roots(node):
    c, root, outside = node
    _allow_runs(root)
    secret = c.post("/plan/preview", json={"plan": f'move "{root / ".env"}" to "{root / "applications"}"'}).json()
    assert not secret["runnable"] and any("credential" in p["message"] for p in secret["problems"])
    away = c.post("/plan/preview", json={"plan": f'move "{outside / "private.txt"}" to "{root}"'}).json()
    assert not away["runnable"]
    r = c.post("/plan/run", json={"plan": f'move "{root / ".env"}" to "{root / "applications"}"', "digest": secret["digest"]})
    assert "problems" in r.json()["error"] and (root / ".env").exists()


def test_the_node_writes_its_own_drogba_config(node):
    c, root, _ = node
    text = _plans.node_config().read_text(encoding="utf-8")
    assert f"'{root.resolve()}'" in text and 'delete = "recycle-bin"' in text and "deny_git_internals = true" in text
