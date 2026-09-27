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
