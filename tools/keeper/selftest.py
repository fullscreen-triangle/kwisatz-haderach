"""
`python -m tools.keeper selftest` — builds a throwaway vault with fake credentials and
checks the whole laptop path: vault convention -> render -> env quoting -> tar layout ->
leak audit. Touches nothing outside a temp dir and never talks to the network.
"""

from __future__ import annotations

import io
import subprocess
import tarfile
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from tools.keeper import audit, render, vault

FAKE_KEY = "sk-ant-FAKE-0123456789abcdef"
FAKE_PW = "pa$$ 'word\"!`\\"          # every character that breaks naive quoting
FAKE_PEM = b"-----BEGIN RSA PRIVATE KEY-----\nMIIFAKE\n-----END RSA PRIVATE KEY-----\n"


def check(cond, what):
    if not cond:
        raise SystemExit(f"FAIL: {what}")
    print(f"  ok  {what}")


def run():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        kp = vault.create_vault(tmp / "t.kdbx", "correct horse battery staple")
        e = vault.add_entry(kp, "Anthropic API", keeper_id="anthropic", strategy="static",
                            env_spec="Password=ANTHROPIC_API_KEY", fields={"Password": FAKE_KEY})
        e.expires = True
        e.expiry_time = datetime.now(timezone.utc) + timedelta(days=10)
        vault.add_entry(kp, "Garmin Connect", keeper_id="garmin", strategy="refresh",
                        env_spec="UserName=GARMIN_EMAIL; Password=GARMIN_PASSWORD",
                        fields={"UserName": "me@example.org", "Password": FAKE_PW})
        vault.add_entry(kp, "GitHub App", keeper_id="github", strategy="mint",
                        env_spec="APP_ID=GITHUB_APP_ID; INSTALLATION_ID=GITHUB_APP_INSTALLATION_ID",
                        fields={"APP_ID": "123", "INSTALLATION_ID": "456"},
                        files={"private-key.pem": FAKE_PEM})
        vault.add_entry(kp, "Desk settings", keeper_id="", strategy="static", env_spec="*",
                        fields={"HOME_CITY": "Greifswald"})
        kp.save()

        items = vault.read_items(vault.open_vault(tmp / "t.kdbx", password="correct horse battery staple"))
        check(len(items) == 4, "vault round-trips 4 entries in the Agent Smith group")

        b = render.build(items)
        check(b.env["ANTHROPIC_API_KEY"] == FAKE_KEY, "static key mapped from Password")
        check(b.env["GARMIN_PASSWORD"] == FAKE_PW, "password with quotes/$/backslash kept verbatim")
        check(b.env["GITHUB_APP_ID"] == "123", "custom attribute mapped")
        check(b.env["HOME_CITY"] == "Greifswald", "Env=* exports settings")
        check(b.env["AGENT_SMITH_STATE"] == render.SERVER_STATE, "server layout vars added")
        check(b.files["github/private-key.pem"] == FAKE_PEM, "attachment routed to its server path")
        exp = b.manifest["credentials"]["anthropic"]["expires_at"]
        check(exp is not None and "garmin" in b.manifest["credentials"], "manifest carries declared expiry")
        check(FAKE_KEY not in str(b.manifest), "manifest is value-free")

        env_text = render.env_file(b.env)
        check(render.quote("a$b!c") == "'a$b!c'", "single quotes keep $ and ! literal")
        check("\\$" in env_text and '\\"' in env_text, "value with a single quote is double-quoted + escaped")
        # systemd's own parser is on the server; here, verify the escaping round-trips
        # through a POSIX shell reading the same line (same quoting rules for these chars).
        line = next(l for l in env_text.splitlines() if l.startswith("GARMIN_PASSWORD="))
        out = subprocess.run(["bash", "-c", f"{line}; printf %s \"$GARMIN_PASSWORD\""],
                             capture_output=True, text=True)
        check(out.stdout == FAKE_PW, "rendered line parses back to the exact password")

        with tarfile.open(fileobj=io.BytesIO(render.tarball(b))) as tar:
            names = {m.name: m for m in tar.getmembers()}
        check({"env", "manifest.json", "github/private-key.pem"} <= set(names), "tar holds env, manifest, key")
        check(all(m.mode == 0o600 for m in names.values() if m.isfile()), "every file is 0600")

        try:
            render.build(items + [render.Item("Dup", {"Password": "x" * 10, "Env": "Password=ANTHROPIC_API_KEY"})])
            check(False, "duplicate env var rejected")
        except ValueError:
            check(True, "duplicate env var rejected")

        repo = tmp / "repo"
        repo.mkdir()
        subprocess.run(["git", "init", "-q", str(repo)], check=True)
        (repo / "notes.md").write_text(f"line one\nkey: {FAKE_KEY}\n", encoding="utf-8")
        (repo / "city.md").write_text("I live in Greifswald\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        found = audit.audit(items, repo)
        check(len(found) == 1 and found[0].startswith("notes.md:2"), "audit finds the planted key at notes.md:2")
        check(FAKE_KEY not in found[0], "audit report does not echo the value")
        check(not any("city.md" in f for f in found), "settings values are not reported as leaks")

        gmail_reconnect(tmp)
        desk_pull(tmp)
    print("selftest passed")


def desk_pull(tmp: Path):
    """keeper pull: values renewed on the desk land in the entries that export them, the old
    value stays in history, and a name no entry exports is left on the desk."""
    import json
    from tools.keeper import gmail, pull
    kp = vault.create_vault(tmp / "p.kdbx", "correct horse battery staple")
    key = vault.add_entry(kp, "Anthropic API", keeper_id="anthropic", strategy="static",
                          env_spec="Password=ANTHROPIC_API_KEY", fields={"Password": "old-key"})
    vault.add_entry(kp, "Desk settings", keeper_id="", strategy="static", env_spec="*", fields={"HOME_CITY": "Munich"})
    vault.add_entry(kp, "Gmail OAuth", keeper_id="gmail", strategy="refresh", env_spec="", fields={},
                    files={"credentials.json": FAKE_CLIENT, "gmail_token.json": b'{"refresh_token": "1//old"}'})
    env_text = ("# renewed on the desk\nANTHROPIC_API_KEY='new-key'\nHOME_CITY='Greifswald'\n"
                f"GMAIL_TOKEN_PATH='/var/lib/agent-smith/desk-keys/gmail-token.json'\nSOMETHING_PASSWORD={FAKE_PW_QUOTED}\n")
    files = {"env": env_text.encode(), "gmail-token.json": json.dumps({"refresh_token": "1//desk", "scope": " ".join(gmail.SCOPES)}).encode()}
    values = pull.env_values(files)
    check(values["SOMETHING_PASSWORD"] == FAKE_PW, "desk env values unquote exactly")
    placed, left = pull.place(kp, values, files)
    kp.save()
    items = {i.title: i for i in vault.read_items(vault.open_vault(tmp / "p.kdbx", password="correct horse battery staple"), forges=False)}
    check(items["Anthropic API"].fields["Password"] == "new-key", "a desk key lands in the entry that exports it")
    check(len(key.history) == 1, "the old key stays in the entry's history")
    check(items["Desk settings"].fields["HOME_CITY"] == "Greifswald", "a desk setting lands in Desk settings")
    check(json.loads(items["Gmail OAuth"].attachments["gmail_token.json"])["refresh_token"] == "1//desk", "the desk's Gmail token replaces the vault's")
    check(sorted(placed) == ["ANTHROPIC_API_KEY", "GMAIL_TOKEN_PATH", "HOME_CITY"] and left == ["SOMETHING_PASSWORD"],
          "a name no entry exports stays on the desk")


FAKE_PW_QUOTED = '"pa\\$\\$ \'word\\"!\\`\\\\"'      # FAKE_PW as the desk writes it (double-quoted, escaped)
FAKE_CLIENT = b'{"installed": {"client_id": "cid.apps.googleusercontent.com", "client_secret": "FAKE-SECRET", "project_id": "agent-smith-test"}}'


def gmail_reconnect(tmp: Path):
    """reconnect-gmail end to end, offline: a fake browser follows the loopback redirect,
    Google's token and Gmail endpoints are mocked, the vault is a throwaway."""
    import json
    import urllib.parse
    import urllib.request

    import httpx

    from tools.keeper import gmail

    cfg = gmail.client_config(FAKE_CLIENT)
    seen = {}

    def browser(url):                      # what the person's browser does after "Allow"
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
        seen.update({k: v[0] for k, v in q.items()})
        back = f"{q['redirect_uri'][0]}/?state={q['state'][0]}&code=FAKE-CODE&scope=x"
        urllib.request.urlopen(back, timeout=5).read()

    code, redirect, verifier = gmail.consent(cfg, opener=browser, timeout=10, say=lambda _: None)
    check(code == "FAKE-CODE" and redirect.startswith("http://127.0.0.1:"), "loopback redirect caught the code")
    check(seen["access_type"] == "offline" and seen["prompt"] == "consent", "consent asks for a refresh token every time")
    check(seen["code_challenge_method"] == "S256" and len(verifier) >= 43, "PKCE S256 with a long verifier")
    check(set(seen["scope"].split()) == set(gmail.SCOPES), "asks for Gmail read + Calendar")

    def bad_state(url):
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
        urllib.request.urlopen(f"{q['redirect_uri'][0]}/?state=forged&code=X", timeout=5).read()
    try:
        gmail.consent(cfg, opener=bad_state, timeout=10, say=lambda _: None)
        check(False, "a forged state is refused")
    except SystemExit:
        check(True, "a forged state is refused")

    def google(request: httpx.Request):
        if request.url.host == "oauth2.googleapis.com":
            form = urllib.parse.parse_qs(request.content.decode())
            ok = form["code_verifier"][0] == verifier and form["redirect_uri"][0] == redirect
            return httpx.Response(200 if ok else 400, json={
                "access_token": "ya29.FAKE", "refresh_token": "1//FAKE-REFRESH", "expires_in": 3599,
                "scope": " ".join(gmail.SCOPES), "token_type": "Bearer",
                "refresh_token_expires_in": 604799} if ok else {"error": "invalid_grant"})
        return httpx.Response(200, json={"emailAddress": "me@example.org"})

    with httpx.Client(transport=httpx.MockTransport(google)) as client:
        body = gmail.exchange(client, cfg, code, redirect, verifier)
        grant = gmail.grant_from(body, datetime.now(timezone.utc))
        check(gmail.mailbox(client, grant.token) == "me@example.org", "new token checked against Gmail")
    check(set(grant.token) >= {"access_token", "refresh_token", "expiry_date", "scope"},
          "token file in web/lib/gmail.js format")
    check(grant.testing_until is not None and 6 <= (grant.testing_until - datetime.now(timezone.utc)).days <= 7,
          "Testing-mode refresh token diagnosed with its end date")
    check("project=agent-smith-test" in gmail.publish_url(cfg), "publish link names the Cloud project")

    kp = vault.create_vault(tmp / "g.kdbx", "correct horse battery staple")
    entry, created = gmail.store(kp, grant, FAKE_CLIENT)
    check(created and entry.expires, "first reconnect creates 'Gmail OAuth' with Google's end date")
    published = {k: v for k, v in body.items() if k != "refresh_token_expires_in"}  # app now "In production"
    later = gmail.grant_from({**published, "refresh_token": "1//NEW"}, datetime.now(timezone.utc))
    entry, created = gmail.store(kp, later, FAKE_CLIENT)
    kp.save()
    items = vault.read_items(vault.open_vault(tmp / "g.kdbx", password="correct horse battery staple"), forges=False)
    files = render.build(items).files
    token = json.loads(files["gmail/token.json"])
    check(not created and token["refresh_token"] == "1//NEW", "second reconnect replaces the token on the entry")
    check(files["gmail/credentials.json"] == FAKE_CLIENT, "OAuth client still pushed beside it")
    check([a.filename for a in entry.attachments].count("gmail_token.json") == 1, "exactly one token attached")
    check(len(entry.history) == 1, "previous token kept in the entry's history")
    check(not entry.expires, "a permanent token clears the vault expiry")
