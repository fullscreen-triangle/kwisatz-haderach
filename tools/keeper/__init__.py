"""
keeper (laptop side) — KeePassXC is the single home for Agent Smith's credentials.

The vault (.kdbx) stays on this machine. `python -m tools.keeper push` unlocks it with
the master password, takes only the entries in the "Agent Smith" group, and streams them
over SSH into /var/lib/agent-smith on server-2, where backend/keeper/ tracks and renews
them. Nothing is written to this machine's disk on the way, and no command prints a value.

Vault convention (group "Agent Smith", one entry per credential):
  KeeperId  = id in backend/keeper/registry.py (gmail, garmin, github, anthropic, amazon)
  Strategy  = refresh | mint | static
  Env       = which entry fields become which env vars, e.g.
              "UserName=GARMIN_EMAIL; Password=GARMIN_PASSWORD"
              (a field is UserName/Password/URL/Notes or a custom attribute name;
               "*" exports every custom attribute under its own name — used for settings)
  Files     = attachment -> server path, e.g. "private-key.pem=github/private-key.pem"
  Expires   = KeePassXC's own expiry field: the date YOU must renew a static key by

  vault.py   — open/create the .kdbx, read and write entries in that convention
  render.py  — vault entries -> env file + files + value-free manifest (pure; tested)
  push.py    — stream the rendered bundle to the server over ssh, restart, report
  audit.py   — fail if any vault value sits in a git-tracked file
"""
