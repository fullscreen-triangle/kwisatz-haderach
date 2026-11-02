"""
Laptop side of the keeper against a throwaway KeePassXC vault: import adopts entries made
earlier, renew replaces a key only after the provider accepts it and keeps the old one in
history. The provider check is stubbed; no network.
Run: python -m pytest backend/tests/test_keeper_vault.py
"""

from datetime import datetime, timezone

import pytest

pytest.importorskip("pykeepass")

from backend.keeper import apikeys
from tools.keeper import __main__ as cli
from tools.keeper import render, vault

PW = "correct horse battery staple"


@pytest.fixture
def kp(tmp_path):
    k = vault.create_vault(tmp_path / "v.kdbx", PW)
    vault.group(k, create=True)
    k.save()
    return k


def test_plan_import_maps_aliases_to_catalogue_ids():
    env = {"CLAUDE_API_KEY": "c", "HUGGINGFACE_API_KEY": "h", "YOU_API_KEY": "y", "OPENAI_API_KEY": "o",
           "GEMINI_API_KEY": "g", "HOME_CITY": "Greifswald"}
    plan = render.plan_import(env)
    specs = {s["id"]: s for s in plan if s["id"]}
    assert set(specs) == {"anthropic", "huggingface", "you", "openai", "gemini"}
    assert specs["anthropic"]["env_spec"] == "Password=ANTHROPIC_API_KEY; Password=CLAUDE_API_KEY"
    assert not any(s["title"].startswith("Imported") for s in plan)


def test_build_exports_every_name():
    items = [render.Item("HF", {"Password": "h", "KeeperId": "huggingface",
                                "Env": apikeys.BY_ID["huggingface"].env_spec})]
    env = render.build(items).env
    assert env["HF_TOKEN"] == env["HUGGINGFACE_API_KEY"] == "h"


def test_import_adopts_an_earlier_entry_without_overwriting(kp, monkeypatch, tmp_path):
    vault.add_entry(kp, "Anthropic API", keeper_id="anthropic", strategy="static",
                    env_spec="Password=ANTHROPIC_API_KEY", fields={"Password": "old"})
    vault.add_entry(kp, "Imported · OPENAI_API_KEY", keeper_id="", strategy="static",
                    env_spec="Password=OPENAI_API_KEY", fields={"Password": "o"})
    (tmp_path / "web").mkdir()
    (tmp_path / "web" / ".env.local").write_text("CLAUDE_API_KEY=new\nOPENAI_API_KEY=o\nGEMINI_API_KEY=g\n")
    monkeypatch.setattr(cli, "REPO", tmp_path)
    added, skipped = cli.import_into(kp)
    assert added == ["Gemini API"]
    assert any("renew anthropic --from-env" in s for s in skipped)
    anth = vault.find_for(kp, "anthropic")
    assert anth.password == "old" and "CLAUDE_API_KEY" in anth.get_custom_property("Env")
    assert vault.find_for(kp, "openai").title == "Imported · OPENAI_API_KEY"
    render.build(vault.read_items(kp))                   # no env var mapped twice


def _renew(kp, tmp_path, monkeypatch, verdict, expires=None):
    env = tmp_path / ".env.local"
    env.write_text("CLAUDE_API_KEY=new\n")
    monkeypatch.setattr(cli, "ENV_LOCAL", env)
    monkeypatch.setattr(vault, "open_vault", lambda *a, **k: kp)
    monkeypatch.setattr(apikeys, "check", lambda spec, key, env={}: verdict)
    pushed = []
    monkeypatch.setattr(cli, "push_items", lambda items, host: pushed.append(items))
    a = type("A", (), dict(vault="x", keyfile=None, ids=["anthropic"], from_env=True, expires=expires, push_anyway=False,
                           no_browser=True, no_push=False, host="h"))()
    cli.cmd_renew(a)
    return pushed


def test_renew_replaces_after_acceptance_and_keeps_history(kp, tmp_path, monkeypatch):
    e = vault.add_entry(kp, "Anthropic API", keeper_id="anthropic", strategy="static",
                        env_spec="Password=ANTHROPIC_API_KEY", fields={"Password": "old"})
    e.expires, e.expiry_time = True, datetime(2026, 1, 1, tzinfo=timezone.utc)
    pushed = _renew(kp, tmp_path, monkeypatch, apikeys.Verdict(True, "key accepted"))
    e = vault.find_for(kp, "anthropic")
    assert e.password == "new" and [h.password for h in e.history] == ["old"]
    assert e.expires is False                            # the old key's end date went with it
    assert pushed and render.build(pushed[0]).env["ANTHROPIC_API_KEY"] == "new"


def test_renew_refuses_a_rejected_key(kp, tmp_path, monkeypatch):
    vault.add_entry(kp, "Anthropic API", keeper_id="anthropic", strategy="static",
                    env_spec="Password=ANTHROPIC_API_KEY", fields={"Password": "old"})
    pushed = _renew(kp, tmp_path, monkeypatch, apikeys.Verdict(False, "Anthropic rejected the key"))
    assert vault.find_for(kp, "anthropic").password == "old" and not pushed


def test_renew_creates_a_missing_entry_with_expiry(kp, tmp_path, monkeypatch):
    _renew(kp, tmp_path, monkeypatch, apikeys.Verdict(True, "key accepted"), expires="2027-03-01")
    e = vault.find_for(kp, "anthropic")
    assert e.password == "new" and e.expires and e.expiry_time.date().isoformat() == "2027-03-01"
    assert e.get_custom_property("RenewURL") == apikeys.BY_ID["anthropic"].renew_url
