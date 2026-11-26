"""
Renewing credentials on the desk (backend/keeper/desk.py), with fake providers: a value is
kept only when its probe accepts it, every alias is set, nothing is ever returned, the file
round-trips any character, and a push afterwards neither loses a desk renewal nor overrides a
newer vault value. Gmail: client upload, sign-in link, the pasted 127.0.0.1 address.
Run: python -m pytest backend/tests/test_keeper_desk.py
"""

import asyncio
import json
from types import SimpleNamespace

import pytest

from backend.keeper import desk as deskmod
from backend.keeper.desk import DeskKeys, fp, quote, unquote

TRICKY = "pa$$ 'word\"!`\\x"


def run(c):
    return asyncio.run(c)


def test_values_round_trip_any_character(tmp_path):
    for v in ("plain", TRICKY, "a b", "ünïcode"):
        assert unquote(quote(v)) == v
    d = DeskKeys(tmp_path, env={})
    d.put({"X": TRICKY}, by="t")
    assert DeskKeys(tmp_path, env={}).values() == {"X": TRICKY}
    assert TRICKY not in (tmp_path / "overrides.json").read_text() and TRICKY not in (tmp_path / "log.jsonl").read_text()


def test_a_push_keeps_desk_renewals_until_the_vault_catches_up(tmp_path):
    env = {"KEY": "old"}
    DeskKeys(tmp_path, env=env).put({"KEY": "new"}, by="anthropic")
    assert env["KEY"] == "new"
    DeskKeys(tmp_path, env=env).put({"KEY": "newer"}, by="anthropic")      # renewed twice: still replaces "old"
    assert DeskKeys(tmp_path, env={}).meta()["KEY"]["replaced"] == fp("old")

    after_old_push = {"KEY": "old"}                     # the vault was not updated: the desk value wins
    assert DeskKeys(tmp_path, env=after_old_push).reconcile() == {"KEY": "applied"} and after_old_push["KEY"] == "newer"

    caught_up = {"KEY": "newer"}                        # keeper pull brought it over: the desk copy goes
    assert DeskKeys(tmp_path, env=caught_up).reconcile() == {"KEY": "the vault has it now"}
    assert DeskKeys(tmp_path, env={}).values() == {}

    DeskKeys(tmp_path, env={"KEY": "old"}).put({"KEY": "desk"}, by="t")
    renewed_in_vault = {"KEY": "vault-2"}               # renewed on the laptop since: the vault wins
    assert DeskKeys(tmp_path, env=renewed_in_vault).reconcile() == {"KEY": "the vault holds a newer value"}
    assert renewed_in_vault["KEY"] == "vault-2" and DeskKeys(tmp_path, env={}).values() == {}


def test_fields_per_kind():
    assert DeskKeys.fields("anthropic")[0]["name"] == "ANTHROPIC_API_KEY"
    assert DeskKeys.fields("forge-uni") == [{"name": "FORGE_UNI_TOKEN", "label": "New access token", "secret": True}]
    assert DeskKeys.fields("mail-webmail")[0]["name"] == "MAIL_WEBMAIL_PASSWORD"
    assert len(DeskKeys.fields("amazon")) == 3 and DeskKeys.fields("garmin") == [] and DeskKeys.fields("gmail") == []


@pytest.fixture()
def keeper(monkeypatch, tmp_path):
    """A keeper whose credentials accept only the value 'good'."""
    from backend.keeper import probes, service

    async def probe(ctx):
        names = [n for n in ("ANTHROPIC_API_KEY", "FORGE_UNI_TOKEN") if n in ctx.env]
        v = ctx.env.get(names[0] if names else "", "")
        return probes.ProbeResult(ok=v == "good" or None if v == "flaky" else v == "good", detail="key accepted" if v == "good" else "rejected")
    rows = {cid: SimpleNamespace(cred=SimpleNamespace(id=cid, probe=probe)) for cid in ("anthropic", "forge-uni")}
    checks = []
    monkeypatch.setattr(service.KEEPER, "rows", rows)
    monkeypatch.setattr(service.KEEPER, "check_now", lambda: checks.append(1))
    return checks


def test_a_value_is_kept_only_when_the_provider_accepts_it(tmp_path, keeper):
    env = {"ANTHROPIC_API_KEY": "dead"}
    d = DeskKeys(tmp_path, env=env)
    no = run(d.renew("anthropic", {"ANTHROPIC_API_KEY": "wrong"}))
    assert no["ok"] is False and "nothing was stored" in no["detail"] and env["ANTHROPIC_API_KEY"] == "dead"
    assert d.values() == {} and keeper == []
    yes = run(d.renew("anthropic", {"ANTHROPIC_API_KEY": "good", "OTHER": "ignored"}))
    assert yes == {"ok": True, "detail": "key accepted"} and env["ANTHROPIC_API_KEY"] == "good" and keeper == [1]
    from backend.keeper import apikeys
    assert set(d.values()) == set(apikeys.BY_ID["anthropic"].env)          # every name the key goes by
    assert "good" not in json.dumps(yes)
    with pytest.raises(ValueError):
        run(d.renew("anthropic", {}))
    with pytest.raises(ValueError):
        run(d.renew("gmail", {"X": "y"}))


def test_settings_are_checked(tmp_path):
    d = DeskKeys(tmp_path, env={})
    st = d.set_setting("HOME_CITY", "Greifswald")
    assert st["settings"]["HOME_CITY"]["value"] == "Greifswald"
    d.set_setting("HOME_LATITUDE", "54.0865")
    with pytest.raises(ValueError):
        d.set_setting("HOME_LATITUDE", "north")
    with pytest.raises(ValueError):
        d.set_setting("ANTHROPIC_API_KEY", "x")


DESKTOP = json.dumps({"installed": {"client_id": "cid.apps.googleusercontent.com", "client_secret": "S",
                                    "project_id": "p", "redirect_uris": ["http://localhost"]}})


def test_gmail_with_a_desktop_client_finishes_from_the_pasted_address(tmp_path, monkeypatch, keeper):
    from tools.keeper import gmail
    env = {}
    d = DeskKeys(tmp_path, env=env)
    with pytest.raises(ValueError):
        d.google_start()                                    # no client yet
    info = d.google_client(DESKTOP)
    assert info == {"kind": "installed", "project": "p", "redirect_ok": False}
    assert env["GMAIL_CREDENTIALS_PATH"].endswith("gmail-credentials.json")
    start = d.google_start()
    assert start["mode"] == "paste" and "redirect_uri=http%3A%2F%2F127.0.0.1%3A8765" in start["url"]
    state = start["url"].split("state=")[1].split("&")[0]

    seen = {}
    monkeypatch.setattr(gmail, "exchange", lambda c, cfg, code, redirect, verifier: seen.update(code=code, redirect=redirect) or {
        "access_token": "ya29", "refresh_token": "1//r", "expires_in": 3599, "scope": " ".join(gmail.SCOPES),
        "token_type": "Bearer", "refresh_token_expires_in": 604799})
    monkeypatch.setattr(gmail, "mailbox", lambda c, token: "me@example.org")
    with pytest.raises(ValueError):
        run(d.google_finish(pasted="http://127.0.0.1:8765/?state=forged&code=x"))
    out = run(DeskKeys(tmp_path, env=env).google_finish(pasted=f"http://127.0.0.1:8765/?state={state}&code=THE-CODE&scope=x"))
    assert out["ok"] and out["mailbox"] == "me@example.org" and out["calendar"] and out["testing_until"]
    assert seen == {"code": "THE-CODE", "redirect": "http://127.0.0.1:8765"}
    assert json.loads((tmp_path / "gmail-token.json").read_text())["refresh_token"] == "1//r"
    assert env["GMAIL_TOKEN_PATH"].endswith("gmail-token.json")
    with pytest.raises(ValueError):                         # a state is used once
        run(d.google_finish(pasted=f"http://127.0.0.1:8765/?state={state}&code=THE-CODE"))


def test_gmail_with_a_web_client_returns_to_the_desk(tmp_path):
    d = DeskKeys(tmp_path, env={"AGENT_SMITH_URL": "https://desk.example"})
    web = json.dumps({"web": {"client_id": "c", "client_secret": "s", "project_id": "p",
                              "redirect_uris": ["https://desk.example/api/desk/keeper/google/callback"]}})
    assert d.google_client(web)["redirect_ok"] is True
    start = d.google_start()
    assert start["mode"] == "redirect" and start["redirect_uri"] == "https://desk.example/api/desk/keeper/google/callback"


# ------------------------------------------------------------- forge tokens the desk makes

def fake_forge(monkeypatch, handler):
    """Every httpx.AsyncClient desk.py opens talks to `handler` instead of the network."""
    import httpx
    real = httpx.AsyncClient
    monkeypatch.setattr(deskmod.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))


UNI = {"FORGE_UNI_KIND": "gitea", "FORGE_UNI_URL": "https://git.uni.example", "FORGE_UNI_USER": "me", "FORGE_UNI_TOKEN": "dead"}
LAB = {"FORGE_GITLAB_KIND": "gitlab", "FORGE_GITLAB_URL": "https://gitlab.example", "FORGE_GITLAB_TOKEN": "old"}


def test_actions_per_forge_kind(tmp_path):
    d = DeskKeys(tmp_path, env={**UNI, **LAB})
    assert d.actions("forge-uni") == {"mint": {"user": "me", "host": "git.uni.example"}}
    assert d.actions("forge-gitlab") == {"rotate": {"host": "gitlab.example"}}
    assert d.actions("anthropic") == {}


def test_gitea_mints_a_token_from_the_password_and_keeps_only_the_token(tmp_path, monkeypatch, keeper):
    import base64
    seen = []

    def handler(req):
        seen.append(req)
        auth = base64.b64decode(req.headers["authorization"].split()[1]).decode()
        if auth != "me:pw":
            return __import__("httpx").Response(401)
        assert req.url.path == "/api/v1/users/me/tokens" and json.loads(req.content)["scopes"]
        return __import__("httpx").Response(201, json={"sha1": "good", "name": "x"})
    fake_forge(monkeypatch, handler)
    env = dict(UNI)
    d = DeskKeys(tmp_path, env=env)
    no = run(d.mint("forge-uni", "wrong"))
    assert no["ok"] is False and "did not accept" in no["detail"] and env["FORGE_UNI_TOKEN"] == "dead"
    yes = run(d.mint("forge-uni", "pw", otp="123456"))
    assert yes["ok"] and env["FORGE_UNI_TOKEN"] == "good" and seen[-1].headers["x-gitea-otp"] == "123456"
    stored = (tmp_path / "env").read_text() + (tmp_path / "log.jsonl").read_text() + (tmp_path / "overrides.json").read_text()
    assert "pw" not in stored.replace("pwd", "")                       # the password is kept nowhere
    with pytest.raises(ValueError):
        run(d.mint("forge-gitlab", "pw"))                               # not a Gitea account


def test_gitlab_rotates_with_itself_and_keeps_the_new_token_at_once(tmp_path, monkeypatch, keeper):
    import httpx

    def handler(req):
        if req.headers.get("private-token") != "old":
            return httpx.Response(401)
        assert req.url.path == "/api/v4/personal_access_tokens/self/rotate" and json.loads(req.content)["expires_at"]
        return httpx.Response(200, json={"token": "new", "expires_at": "2027-11-21"})
    fake_forge(monkeypatch, handler)
    env = dict(LAB)
    out = run(DeskKeys(tmp_path, env=env).rotate("forge-gitlab"))
    assert out == {"ok": True, "detail": "rotated; the new token runs until 2027-11-21"} and env["FORGE_GITLAB_TOKEN"] == "new"
    assert keeper == [1] and "new" not in json.dumps(out).replace("new token", "")
    again = run(DeskKeys(tmp_path, env=env).rotate("forge-gitlab"))  # "new" is not what the fake forge accepts
    assert again["ok"] is False and "cannot renew itself" in again["detail"]


def test_gmail_client_from_pasted_id_and_secret(tmp_path):
    d = DeskKeys(tmp_path, env={"AGENT_SMITH_URL": "https://desk.example"})
    with pytest.raises(ValueError):
        d.google_client_fields("not-a-client", "s")
    assert d.google_client_fields("c.apps.googleusercontent.com", "s")["redirect_ok"] is True
    assert d.google_start()["mode"] == "redirect"
    assert d.google_client_fields("c.apps.googleusercontent.com", "s", kind="installed")["kind"] == "installed"
    assert d.google_start()["mode"] == "paste"
