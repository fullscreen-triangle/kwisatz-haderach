"""
Forge tokens and repositories, with no network: the keeper takes tracker's tokens from the
Git group (never an api-key entry), the server discovers accounts from FORGE_* and probes
each token (GitLab's own expiry is read), and listing groups copies across forges.
Run: python -m pytest backend/tests/test_forges.py
"""

import asyncio
from datetime import datetime, timezone

import httpx
import pytest

pytest.importorskip("pykeepass")

from backend import forges
from backend.keeper.probes import ProbeContext
from tools.keeper import forges as forge_tokens
from tools.keeper import render, vault

ACCTS = {"github": {"kind": "github", "host": "github.com", "user": "fullscreen-triangle"},
         "uni": {"kind": "gitea", "host": "git.uni-greifswald.de", "user": "sachikonyk"},
         "gitlab": {"kind": "gitlab", "host": "gitlab.com", "user": "k.sachikonye"}}


def run(c):
    return asyncio.run(c)


def test_tokens_come_from_the_git_group_and_api_keys_never_do(tmp_path):
    kp = vault.create_vault(tmp_path / "v.kdbx", "correct horse battery staple")
    git = kp.add_group(kp.root_group, "Git")
    kp.add_entry(git, "github", "fullscreen-triangle", "ghp_x", url="https://github.com")
    kp.add_entry(git, "uni", "sachikonyk", "gitea_x", url="git.uni-greifswald.de")
    kp.add_entry(git, "claude", "api-key", "sk-ant-x", url="https://api.anthropic.com")
    items = forge_tokens.items(kp, ACCTS)
    assert sorted(i.keeper_id for i in items) == ["forge-github", "forge-uni"]      # gitlab has no entry
    env = render.build(items).env
    assert env["FORGE_UNI_TOKEN"] == "gitea_x" and env["FORGE_UNI_KIND"] == "gitea"
    assert env["FORGE_GITHUB_URL"] == "https://github.com" and "sk-ant-x" not in env.values()


ENV = {"FORGE_GITHUB_KIND": "github", "FORGE_GITHUB_URL": "https://github.com", "FORGE_GITHUB_TOKEN": "g",
       "FORGE_GITHUB_USER": "fullscreen-triangle",
       "FORGE_GITLAB_KIND": "gitlab", "FORGE_GITLAB_URL": "https://gitlab.com", "FORGE_GITLAB_TOKEN": "l",
       "FORGE_UNI_KIND": "gitea", "FORGE_UNI_URL": "https://git.uni-greifswald.de", "FORGE_UNI_TOKEN": "u"}


def test_discover_and_probe(tmp_path):
    assert [a.id for a in forges.discover(ENV)] == ["github", "gitlab", "uni"]

    def handler(req):
        if req.url.host == "gitlab.com":
            assert req.headers["private-token"] == "l"
            return httpx.Response(200, json={"expires_at": "2027-01-31", "active": True})
        if req.url.host == "git.uni-greifswald.de":
            return httpx.Response(401, json={})
        return httpx.Response(200, json={}, headers={"github-authentication-token-expiration": "2026-12-01 10:00:00 UTC"})

    ctx = ProbeContext(client=httpx.AsyncClient(transport=httpx.MockTransport(handler)), env=ENV, state_dir=tmp_path)
    gl = run(forges.probe_for("gitlab")(ctx))
    assert gl.ok and gl.expires_at == datetime(2027, 1, 31, tzinfo=timezone.utc)
    gh = run(forges.probe_for("github")(ctx))
    assert gh.ok and gh.expires_at == datetime(2026, 12, 1, 10, tzinfo=timezone.utc)
    uni = run(forges.probe_for("uni")(ctx))
    assert uni.ok is False and "tracker tokens set uni" in uni.detail


def test_listing_groups_copies_and_reports_a_failing_account():
    def handler(req):
        if req.url.host == "api.github.com":
            return httpx.Response(200, json=[{"name": "bloodhound", "full_name": "fullscreen-triangle/bloodhound",
                                              "private": False, "html_url": "https://github.com/x", "pushed_at": "2026-10-01T00:00:00Z"}])
        if req.url.host == "gitlab.com":
            return httpx.Response(200, json=[{"path": "bloodhound", "path_with_namespace": "k/bloodhound",
                                              "visibility": "private", "web_url": "https://gitlab.com/x",
                                              "last_activity_at": "2026-10-20T00:00:00Z"}])
        return httpx.Response(401, json={})

    d = run(forges.listing(ENV, refresh=True, client=httpx.AsyncClient(transport=httpx.MockTransport(handler))))
    assert d["count"] == 2 and len(d["groups"]) == 1
    g = d["groups"][0]
    assert g["name"] == "bloodhound" and {c["kind"] for c in g["copies"]} == {"github", "gitlab"}
    assert g["updated"].startswith("2026-10-20")
    uni = next(a for a in d["accounts"] if a["id"] == "uni")
    assert uni["error"] == "HTTP 401" and uni["count"] == 0
