"""
Keeper probes and state machine against mocked providers (httpx.MockTransport) — no
network, no real credentials. Run: python -m pytest backend/tests/test_keeper.py
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest

from backend.keeper import github_app, probes
from backend.keeper.probes import ProbeContext, ProbeResult
from backend.keeper.registry import Credential
from backend.keeper.service import Keeper


def run(coro):
    return asyncio.run(coro)


def ctx_with(handler, env, tmp_path):
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return ProbeContext(client=client, env=env, state_dir=tmp_path)


# ---------------------------------------------------------------- Gmail

@pytest.fixture
def gmail_env(tmp_path):
    (tmp_path / "c.json").write_text(json.dumps({"installed": {"client_id": "cid", "client_secret": "cs"}}))
    (tmp_path / "t.json").write_text(json.dumps({"refresh_token": "rt", "access_token": "old"}))
    return {"GMAIL_CREDENTIALS_PATH": str(tmp_path / "c.json"), "GMAIL_TOKEN_PATH": str(tmp_path / "t.json")}


def test_gmail_refresh_writes_token(gmail_env, tmp_path):
    def handler(req):
        assert b"grant_type=refresh_token" in req.content
        return httpx.Response(200, json={"access_token": "new", "expires_in": 3599})
    r = run(probes.probe_gmail(ctx_with(handler, gmail_env, tmp_path)))
    assert r.ok and r.renewed and r.expires_at is None and r.auto_expires_at
    saved = json.loads((tmp_path / "t.json").read_text())
    assert saved["access_token"] == "new" and saved["refresh_token"] == "rt" and saved["expiry_date"] > 0


def test_gmail_testing_mode_reports_root_expiry(gmail_env, tmp_path):
    handler = lambda req: httpx.Response(200, json={"access_token": "a", "expires_in": 3599,
                                                    "refresh_token_expires_in": 6 * 86400})
    r = run(probes.probe_gmail(ctx_with(handler, gmail_env, tmp_path)))
    assert r.ok and r.expires_at and "Testing" in r.detail


def test_gmail_invalid_grant_is_dead(gmail_env, tmp_path):
    handler = lambda req: httpx.Response(400, json={"error": "invalid_grant"})
    r = run(probes.probe_gmail(ctx_with(handler, gmail_env, tmp_path)))
    assert r.ok is False and "In production" in r.detail


def test_gmail_5xx_is_transient(gmail_env, tmp_path):
    r = run(probes.probe_gmail(ctx_with(lambda req: httpx.Response(503), gmail_env, tmp_path)))
    assert r.ok is None and not r.missing


def test_gmail_missing_files(tmp_path):
    env = {"GMAIL_CREDENTIALS_PATH": str(tmp_path / "no.json"), "GMAIL_TOKEN_PATH": str(tmp_path / "no2.json")}
    r = run(probes.probe_gmail(ctx_with(lambda req: httpx.Response(500), env, tmp_path)))
    assert r.missing


# ---------------------------------------------------------------- Anthropic

@pytest.mark.parametrize("code,ok", [(200, True), (401, False), (529, None)])
def test_anthropic(code, ok, tmp_path):
    r = run(probes.probe_anthropic(ctx_with(lambda req: httpx.Response(code, json={}),
                                            {"ANTHROPIC_API_KEY": "k"}, tmp_path)))
    assert r.ok is ok


# ---------------------------------------------------------------- GitHub

@pytest.fixture
def app_env(tmp_path):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL,
                            serialization.NoEncryption())
    (tmp_path / "k.pem").write_bytes(pem)
    return {"GITHUB_APP_ID": "1", "GITHUB_APP_INSTALLATION_ID": "2",
            "GITHUB_APP_PRIVATE_KEY_PATH": str(tmp_path / "k.pem")}


def test_github_app_mints_then_reuses(app_env, tmp_path):
    calls = {"mint": 0}
    exp = (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

    def handler(req):
        if req.url.path == "/app/installations/2/access_tokens":
            assert req.headers["authorization"].startswith("Bearer ey")  # a JWT
            calls["mint"] += 1
            return httpx.Response(201, json={"token": f"ghs_{calls['mint']}", "expires_at": exp})
        assert req.url.path == "/installation/repositories"
        return httpx.Response(200, json={"repositories": []})

    r1 = run(probes.probe_github(ctx_with(handler, app_env, tmp_path)))
    r2 = run(probes.probe_github(ctx_with(handler, app_env, tmp_path)))
    assert r1.ok and r1.renewed and r1.mode == "app"
    assert r2.ok and not r2.renewed and calls["mint"] == 1
    token, expires = github_app.read_minted(tmp_path)
    assert token == "ghs_1" and expires > datetime.now(timezone.utc)
    assert (tmp_path / "minted" / "GITHUB_TOKEN").stat().st_size > 0


def test_github_app_refused_is_dead(app_env, tmp_path):
    r = run(probes.probe_github(ctx_with(lambda req: httpx.Response(401, json={}), app_env, tmp_path)))
    assert r.ok is False and "App ID" in r.detail


def test_github_pat_expiry_header(tmp_path):
    handler = lambda req: httpx.Response(200, json={}, headers={
        "github-authentication-token-expiration": "2027-09-06 12:00:00 UTC"})
    r = run(probes.probe_github(ctx_with(handler, {"GITHUB_TOKEN": "ghp_x"}, tmp_path)))
    assert r.ok and r.mode == "pat" and r.expires_at == datetime(2027, 9, 6, 12, tzinfo=timezone.utc)


def test_github_pat_fine_grained_bug_ignored(tmp_path):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    handler = lambda req: httpx.Response(200, json={}, headers={"github-authentication-token-expiration": now})
    r = run(probes.probe_github(ctx_with(handler, {"GITHUB_TOKEN": "github_pat_x"}, tmp_path)))
    assert r.ok and r.expires_at is None and "set Expires" in r.detail


# ---------------------------------------------------------------- Amazon

def test_amazon_partial_is_dead(tmp_path):
    r = run(probes.probe_amazon(ctx_with(None, {"AMAZON_ACCESS_KEY": "a"}, tmp_path)))
    assert r.ok is False and "AMAZON_SECRET_KEY" in r.detail


# ---------------------------------------------------------------- service state machine

def make_keeper(tmp_path, results):
    """A Keeper over fake probes whose answers the test controls via `results[id]`."""
    def probe_for(cid):
        async def probe(ctx):
            return results[cid]
        return probe
    reg = [Credential(cid, cid.title(), "p", "static", 60, probe_for(cid), "https://x", "tests")
           for cid in results]
    return Keeper(reg, tmp_path, env={})


def test_tick_classifies_and_bumps_version(tmp_path):
    results = {"a": ProbeResult(ok=True), "b": ProbeResult(ok=False, detail="nope"),
               "c": ProbeResult(ok=None, missing=True)}
    k = make_keeper(tmp_path, results)

    async def go():
        async with httpx.AsyncClient() as c:
            await k.tick(c)
    run(go())
    states = {r["id"]: r["state"] for r in k.snapshot()["credentials"]}
    assert states == {"a": "ok", "b": "dead", "c": "missing"}
    assert k.version == 1 and k.snapshot()["worst"] == "dead"
    assert (tmp_path / "keeper-state.json").exists()


def test_declared_expiry_from_manifest(tmp_path):
    soon = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    (tmp_path / "manifest.json").write_text(json.dumps(
        {"credentials": {"a": {"expires_at": soon}, "b": {"expires_at": past}}}))
    k = make_keeper(tmp_path, {"a": ProbeResult(ok=True), "b": ProbeResult(ok=True)})

    async def go():
        async with httpx.AsyncClient() as c:
            await k.tick(c)
    run(go())
    rows = {r["id"]: r for r in k.snapshot()["credentials"]}
    assert rows["a"]["state"] == "soon" and rows["a"]["days_left"] in (4, 5)
    assert rows["b"]["state"] == "expired"


def test_transient_keeps_previous_verdict(tmp_path):
    results = {"a": ProbeResult(ok=True)}
    k = make_keeper(tmp_path, results)

    async def go():
        async with httpx.AsyncClient() as c:
            await k.tick(c)
            results["a"] = ProbeResult(ok=None, detail="Google answered HTTP 503")
            k.check_now()
            await k.tick(c)
    run(go())
    row = k.snapshot()["credentials"][0]
    assert row["state"] == "ok" and "503" in row["detail"]


def test_snapshot_is_value_free(tmp_path):
    k = make_keeper(tmp_path, {"a": ProbeResult(ok=True, detail="fine")})
    allowed = {"id", "title", "provider", "strategy", "used_by", "renew_url", "mode", "state", "verified",
               "detail", "expires_at", "days_left", "auto_expires_at", "last_checked", "last_ok",
               "last_renewed", "next_check"}
    assert set(k.snapshot()["credentials"][0]) == allowed
