"""
python -m tools.keeper <command>

  setup                ONE interactive pass: create/open the vault, import existing keys,
                       add Uni Greifswald (+ optional webmail) mail, chigutiro, then push
  init                 create the vault (.kdbx) if you haven't made one in KeePassXC
  import               one-time: move web/.env.local + the Gmail OAuth files into the vault
  add-github-app       add the GitHub App entry (App ID, installation ID, private key .pem)
  add-imap             add a mail account read over IMAP (password asked, never an argument)
  add-chigutiro        generate the memory service's key + token into the vault
  add-laptop           put this laptop's node (Tailscale URL + token) in the vault, then push
  save-console-login   copy the desk website's login (made on the server) into the vault
  status               value-free table of the vault's Agent Smith entries
  push [--host H]      send them to the server, restart, print the keeper's live verdict
  audit [--repo DIR]   fail if any vault value is in a git-tracked file
  selftest             exercise render/vault/audit against a throwaway vault

Options for every command: --vault PATH (default %USERPROFILE%\\Documents\\vault.kdbx or
$KEEPER_VAULT), --keyfile PATH ($KEEPER_KEYFILE). Nothing ever prints a credential value.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from getpass import getpass
from pathlib import Path

from tools.keeper import render, vault

REPO = Path(__file__).resolve().parent.parent.parent

STATE_MARK = {"ok": "ok ", "soon": "SOON", "expired": "EXPIRED", "dead": "REJECTED",
              "missing": "not set", "unknown": "checking"}


def _days(dt):
    return None if dt is None else (dt - datetime.now(timezone.utc)).days


def cmd_init(a):
    path = Path(a.vault)
    if path.exists():
        raise SystemExit(f"{path} already exists — nothing to do.")
    pw = getpass("New master password: ")
    if pw != getpass("Repeat it: "):
        raise SystemExit("Passwords differ.")
    if len(pw) < 12:
        raise SystemExit("Use at least 12 characters (a diceware phrase: keepassxc-cli diceware).")
    kp = vault.create_vault(path, pw)
    vault.group(kp, create=True)
    kp.save()
    print(f"Created {path} with an empty '{render.GROUP}' group. Open it in KeePassXC as usual.")


def import_into(kp):
    """web/.env.local + the Gmail OAuth files -> vault entries. Idempotent."""
    env_path = REPO / "web" / ".env.local"
    env = render.parse_env_text(env_path.read_text(encoding="utf-8")) if env_path.exists() else {}
    added, skipped = [], []
    for spec in render.plan_import(env):
        if vault.find_entry(kp, spec["title"]):
            skipped.append(spec["title"])
            continue
        vault.add_entry(kp, spec["title"], keeper_id=spec["id"], strategy=spec["strategy"],
                        env_spec=spec["env_spec"], fields=spec["fields"])
        added.append(spec["title"])

    gmail = {name: (REPO / "web" / src).read_bytes()
             for name, src in (("credentials.json", "credentials.json"), ("gmail_token.json", ".gmail_token.json"))
             if (REPO / "web" / src).exists()}
    if gmail and not vault.find_entry(kp, "Gmail OAuth"):
        vault.add_entry(kp, "Gmail OAuth", keeper_id="gmail", strategy="refresh", env_spec="",
                        fields={}, files=gmail)
        added.append("Gmail OAuth")
    return added, skipped


def cmd_import(a):
    kp = vault.open_vault(Path(a.vault), keyfile=a.keyfile)
    added, skipped = import_into(kp)
    kp.save()
    print(f"Added {len(added)} entries to '{render.GROUP}': {', '.join(added) or '—'}")
    if skipped:
        print(f"Already there (left untouched): {', '.join(skipped)}")
    print("Next: python -m tools.keeper audit, then python -m tools.keeper push")


def cmd_add_github_app(a):
    pem = Path(a.key).read_bytes()
    if b"PRIVATE KEY" not in pem:
        raise SystemExit(f"{a.key} doesn't look like a PEM private key.")
    kp = vault.open_vault(Path(a.vault), keyfile=a.keyfile)
    if vault.find_entry(kp, "GitHub App"):
        raise SystemExit("A 'GitHub App' entry already exists — edit it in KeePassXC instead.")
    vault.add_entry(kp, "GitHub App", keeper_id="github", strategy="mint",
                    env_spec="APP_ID=GITHUB_APP_ID; INSTALLATION_ID=GITHUB_APP_INSTALLATION_ID",
                    fields={"APP_ID": str(a.app_id), "INSTALLATION_ID": str(a.installation_id)},
                    files={"private-key.pem": pem}, renew_url="https://github.com/settings/apps")
    kp.save()
    print("Added 'GitHub App'. Once a push shows GitHub as ok, delete the "
          "'GitHub personal token (legacy)' entry and revoke that token on GitHub.")


def imap_login_ok(host: str, port: int, security: str, user: str, pw: str) -> str:
    """Try the login from this machine before anything is saved. '' = ok, else why not."""
    import imaplib
    import ssl
    ctx = ssl.create_default_context()
    try:
        if security == "ssl":
            conn = imaplib.IMAP4_SSL(host, port, ssl_context=ctx, timeout=20)
        else:
            conn = imaplib.IMAP4(host, port, timeout=20)
            conn.starttls(ssl_context=ctx)
    except OSError as e:
        return f"could not reach {host}:{port} ({type(e).__name__})"
    try:
        conn.login(user, pw)
        conn.logout()
        return ""
    except imaplib.IMAP4.error:
        return "the server refused that login/password"


def add_imap_entry(kp, *, acct: str, host: str, user: str, pw: str, security: str = "ssl",
                   port: int = 0, address: str = "", label: str = "") -> str:
    acct = acct.lower()
    if not acct.isalnum():
        raise SystemExit("the account id must be letters/digits only (it becomes MAIL_<ID>_* on the server)")
    up = acct.upper()
    title = f"Mail · {label or acct}"
    if vault.find_entry(kp, title):
        raise SystemExit(f"'{title}' already exists — edit it in KeePassXC instead.")
    port = port or (143 if security == "starttls" else 993)
    vault.add_entry(kp, title, keeper_id=f"mail-{acct}", strategy="static",
                    env_spec=(f"UserName=MAIL_{up}_USER; Password=MAIL_{up}_PASSWORD; HOST=MAIL_{up}_HOST; "
                              f"PORT=MAIL_{up}_PORT; SECURITY=MAIL_{up}_SECURITY; ADDRESS=MAIL_{up}_ADDRESS; "
                              f"LABEL=MAIL_{up}_LABEL"),
                    fields={"UserName": user, "Password": pw, "HOST": host, "PORT": str(port),
                            "SECURITY": security, "ADDRESS": address or (user if "@" in user else ""),
                            "LABEL": label or acct.title()})
    return title


def cmd_add_imap(a):
    """A mail account read over IMAP (Uni Greifswald, webmail, …). The password is asked
    for here, never taken from the command line."""
    pw = getpass(f"IMAP password for {a.user}@{a.host}: ")
    if not pw:
        raise SystemExit("No password given.")
    kp = vault.open_vault(Path(a.vault), keyfile=a.keyfile)
    title = add_imap_entry(kp, acct=a.id, host=a.host, user=a.user, pw=pw, security=a.security,
                           port=a.port, address=a.address, label=a.label)
    kp.save()
    print(f"Added '{title}'. Push to start reading it: python -m tools.keeper push")


def add_chigutiro_entry(kp) -> None:
    import secrets
    vault.add_entry(kp, "Chigutiro", keeper_id="chigutiro", strategy="static",
                    env_spec="Password=CHIGUTIRO_KEY; TOKEN=CHIGUTIRO_TOKEN",
                    fields={"Password": secrets.token_hex(32), "TOKEN": secrets.token_hex(32)})


def cmd_add_chigutiro(a):
    """Generate chigutiro's log key + API token (what `chigutiro keygen` prints) straight
    into the vault. Losing the key loses the memory log — the vault is where it lives."""
    kp = vault.open_vault(Path(a.vault), keyfile=a.keyfile)
    if vault.find_entry(kp, "Chigutiro"):
        raise SystemExit("A 'Chigutiro' entry already exists — rotating the KEY would make the log unreadable.")
    add_chigutiro_entry(kp)
    kp.save()
    print("Added 'Chigutiro' (key + token generated, not shown). Push to start the memory service.")


def cmd_add_laptop(a):
    """The laptop node's address on the tailnet and its token (made by
    `python -m tools.laptop_node install`) into the vault, then push — so server-2 can
    reach the laptop's files. Re-run after re-installing the node; it replaces the entry."""
    import subprocess
    from tools.laptop_node import config as node
    token = node.token()
    if not token:
        raise SystemExit("No laptop-node token yet — run first: python -m tools.laptop_node install")
    r = subprocess.run([str(node.TAILSCALE), "ip", "-4"], capture_output=True, text=True)
    ip = (r.stdout or "").strip().splitlines()[0] if r.returncode == 0 and r.stdout.strip() else ""
    if not ip.startswith("100."):
        raise SystemExit("This laptop has no Tailscale address — open Tailscale and log in first.")
    kp = vault.open_vault(Path(a.vault), keyfile=a.keyfile)
    old = vault.find_entry(kp, "Laptop node")
    if old:
        kp.delete_entry(old)
    vault.add_entry(kp, "Laptop node", keeper_id="laptop", strategy="static",
                    env_spec="URL=LAPTOP_NODE_URL; Password=LAPTOP_NODE_TOKEN",
                    fields={"URL": f"http://{ip}:{node.settings()['port']}", "Password": token,
                            "Notes": "tools/laptop_node on this laptop; reached by server-2 over Tailscale"})
    kp.save()
    print(f"{'Replaced' if old else 'Added'} 'Laptop node' (http://{ip}:{node.settings()['port']}, token not shown).")
    if not a.no_push:
        push_items(vault.read_items(kp), a.host)


def cmd_save_console_login(a):
    """The console's browser login (basic auth) was generated on the server at deploy time and
    lives only in /root/agent-smith.credentials. Copy it into the vault — group "Websites",
    not the pushed "Agent Smith" group — so KeePassXC fills it in. Never printed."""
    import subprocess
    r = subprocess.run(["ssh", a.host, "cat /root/agent-smith.credentials"], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"could not read the login from {a.host}: {r.stderr.strip()[:200]}")
    fields = {}
    for line in r.stdout.splitlines():
        k, sep, v = line.partition(":")
        if sep:
            fields[k.strip().lower()] = v.strip()
    url = next((v for k, v in fields.items() if k.endswith("https")), "")
    url = ("https:" + url) if url.startswith("//") else (url or "https://smith-91-98-157-147.sslip.io")
    user, pw = fields.get("user", ""), fields.get("password", "")
    if not user or not pw:
        raise SystemExit("the server's credentials file has no user/password lines")
    kp = vault.open_vault(Path(a.vault), keyfile=a.keyfile)
    g = kp.find_groups(name="Websites", first=True) or kp.add_group(kp.root_group, "Websites")
    old = kp.find_entries(title="Agent Smith console", group=g, first=True)
    if old:
        kp.delete_entry(old)
    kp.add_entry(g, "Agent Smith console", user, pw, url=url.rstrip("/") + "/desk/console",
                 notes="Desk website login (Caddy basic auth). One login per browser; the cookie lasts a year.")
    kp.save()
    print(f"Saved 'Agent Smith console' in the Websites group (user {user}, password not shown).")
    print("Open KeePassXC, select it, Ctrl+C copies the password — or use KeePassXC-Browser to fill it in.")


def cmd_status(a):
    items = vault.read_items(vault.open_vault(Path(a.vault), keyfile=a.keyfile))
    if not items:
        print(f"No entries in '{render.GROUP}' yet — run: python -m tools.keeper import")
        return
    print(f"{'entry':34} {'id':10} {'strategy':8} {'expires':12} env vars / files")
    for it in sorted(items, key=lambda i: i.title.lower()):
        d = _days(it.expires_at)
        exp = "never" if d is None else ("EXPIRED" if d < 0 else f"{d} days")
        spec = it.fields.get("Env", "")
        names = ("(all attributes)" if spec.strip() == "*" else
                 ", ".join(v for _, v in render.parse_pairs(spec)))
        files = ", ".join(n for n, _ in render.parse_pairs(it.fields.get("Files", "")))
        print(f"{it.title[:34]:34} {it.keeper_id or '-':10} {it.fields.get('Strategy', '-'):8} "
              f"{exp:12} {names}{' | ' + files if files else ''}")


def cmd_push(a):
    push_items(vault.read_items(vault.open_vault(Path(a.vault), keyfile=a.keyfile)), a.host)


def push_items(items, host) -> None:
    from tools.keeper import push
    if not items:
        raise SystemExit(f"Nothing in '{render.GROUP}' to push.")
    bundle = render.build(items)
    for w in bundle.warnings:
        print(f"  note: {w}")
    print(f"Pushing {len(bundle.env)} env vars and {len(bundle.files)} files to {host} …")
    status = push.push(bundle, host)
    if status.get("error"):
        raise SystemExit(f"Server: {status['error']}")
    print(f"\nKeeper on {host} (live):")
    for c in status.get("credentials", []):
        mark = STATE_MARK.get(c["state"], c["state"])
        print(f"  {mark:9} {c['title']:18} {c['detail']}")
    print("\nDashboard: https://smith-91-98-157-147.sslip.io/desk/keys")


def cmd_audit(a):
    from tools.keeper import audit
    items = vault.read_items(vault.open_vault(Path(a.vault), keyfile=a.keyfile))
    findings = audit.audit(items, Path(a.repo))
    if not findings:
        print(f"Clean: no vault value appears in any git-tracked file of {a.repo}.")
        return
    print(f"{len(findings)} leak(s) — rotate these credentials, then remove the files from git history:")
    for f in findings:
        print(f"  {f}")
    sys.exit(1)


UNI = {"acct": "uni", "host": "imap.uni-greifswald.de", "port": 993, "security": "ssl",
       "label": "Uni Greifswald", "domain": "uni-greifswald.de"}


def _ask(prompt: str, default: str = "") -> str:
    got = input(f"{prompt}{f' [{default}]' if default else ''}: ").strip()
    return got or default


def _mail_account(kp, *, acct, host, port, security, label, domain="") -> None:
    title = f"Mail · {label}"
    existing = vault.find_entry(kp, title)
    if existing:
        if _ask(f"  '{title}' is already in the vault (login {existing.username}). Replace it? y/N", "n").lower() != "y":
            print("  keeping it.")
            return
        kp.delete_entry(existing)
    user = _ask(f"  {label} login (the username you use on its webmail)")
    if not user:
        print("  skipped.")
        return
    address = _ask(f"  your {label} email address" + (f" (...@{domain})" if domain else ""),
                   user if "@" in user else "")
    for attempt in range(3):
        pw = getpass(f"  {label} password (not shown): ")
        why = imap_login_ok(host, port, security, user, pw)
        if not why:
            add_imap_entry(kp, acct=acct, host=host, user=user, pw=pw, security=security, port=port,
                           address=address, label=label)
            print(f"  login works — saved '{title}'.")
            return
        print(f"  {why}." + (" Try again." if attempt < 2 else ""))
    print(f"  giving up on {label} for now; re-run setup to try again.")


def cmd_setup(a):
    """Everything that needs a human, in one sitting. Asks for each secret once, at a
    hidden prompt; checks mail logins live before saving; pushes at the end."""
    path = Path(a.vault)
    print("Agent Smith setup — nothing typed here is shown or stored anywhere but the vault.\n")
    if path.exists():
        print(f"1/5  Opening your vault ({path})")
        kp = vault.open_vault(path, keyfile=a.keyfile)
    else:
        print(f"1/5  Creating your vault at {path} (KeePassXC can open it afterwards)")
        while True:
            pw = getpass("  new master password (12+ characters, not shown): ")
            if len(pw) < 12:
                print("  too short.")
            elif pw != getpass("  repeat it: "):
                print("  they differ.")
            else:
                break
        kp = vault.create_vault(path, pw)
        vault.group(kp, create=True)

    print("2/5  Importing the keys this repo already has (web/.env.local, Gmail files)")
    added, _ = import_into(kp)
    print(f"  {len(added)} new entries" + (f": {', '.join(added)}" if added else " (all there already)"))

    print("3/5  Uni Greifswald mail (imap.uni-greifswald.de — same login as groupware.uni-greifswald.de)")
    _mail_account(kp, acct=UNI["acct"], host=UNI["host"], port=UNI["port"], security=UNI["security"],
                  label=UNI["label"], domain=UNI["domain"])

    print("4/5  Another mailbox? (e.g. your webmail — press Enter to skip)")
    host = _ask("  its IMAP server (see 'IMAP' in the provider's help, e.g. imap.web.de)")
    if host:
        sec = _ask("  encryption: ssl (port 993) or starttls (port 143)", "ssl").lower()
        label = _ask("  a name for it", "Webmail")
        _mail_account(kp, acct="".join(ch for ch in label.lower() if ch.isalnum()) or "webmail",
                      host=host, port=143 if sec == "starttls" else 993, security=sec, label=label)

    if not vault.find_entry(kp, "Chigutiro"):
        add_chigutiro_entry(kp)
        print("     memory service key + token generated into the vault")
    kp.save()

    print("5/5  Sending the vault's Agent Smith entries to the server")
    push_items(vault.read_items(kp), a.host)
    print("\nInbox: https://smith-91-98-157-147.sslip.io/desk/inbox — mail appears within a minute,"
          " and each message is read in about 50 s, newest first.")


def cmd_selftest(a):
    from tools.keeper import selftest
    selftest.run()


def main(argv=None):
    try:                                   # Windows consoles default to a legacy code page
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    p = argparse.ArgumentParser(prog="python -m tools.keeper", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--vault", default=str(vault.DEFAULT_VAULT))
    p.add_argument("--keyfile", default=None)
    sub = p.add_subparsers(dest="cmd", required=True)
    from tools.keeper.push import DEFAULT_HOST
    su = sub.add_parser("setup")
    su.add_argument("--host", default=DEFAULT_HOST)
    su.set_defaults(fn=cmd_setup)
    sub.add_parser("init").set_defaults(fn=cmd_init)
    sub.add_parser("import").set_defaults(fn=cmd_import)
    g = sub.add_parser("add-github-app")
    g.add_argument("--app-id", required=True)
    g.add_argument("--installation-id", required=True)
    g.add_argument("--key", required=True, help="the .pem GitHub gave you")
    g.set_defaults(fn=cmd_add_github_app)
    im = sub.add_parser("add-imap")
    im.add_argument("--id", required=True, help="short name, e.g. uni or webmail")
    im.add_argument("--host", required=True)
    im.add_argument("--user", required=True)
    im.add_argument("--security", choices=["starttls", "ssl"], default="ssl")
    im.add_argument("--port", type=int, default=0)
    im.add_argument("--address", default="", help="the address you send from, if the login isn't it")
    im.add_argument("--label", default="")
    im.set_defaults(fn=cmd_add_imap)
    sub.add_parser("add-chigutiro").set_defaults(fn=cmd_add_chigutiro)
    sc = sub.add_parser("save-console-login")
    sc.add_argument("--host", default=DEFAULT_HOST)
    sc.set_defaults(fn=cmd_save_console_login)
    la = sub.add_parser("add-laptop")
    la.add_argument("--host", default=DEFAULT_HOST)
    la.add_argument("--no-push", action="store_true")
    la.set_defaults(fn=cmd_add_laptop)
    sub.add_parser("status").set_defaults(fn=cmd_status)
    ps = sub.add_parser("push")
    ps.add_argument("--host", default=DEFAULT_HOST)
    ps.set_defaults(fn=cmd_push)
    au = sub.add_parser("audit")
    au.add_argument("--repo", default=str(REPO))
    au.set_defaults(fn=cmd_audit)
    sub.add_parser("selftest").set_defaults(fn=cmd_selftest)
    a = p.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    main()
