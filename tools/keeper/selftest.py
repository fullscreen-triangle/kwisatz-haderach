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
    print("selftest passed")
