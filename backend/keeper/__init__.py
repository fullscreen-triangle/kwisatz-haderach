"""
keeper — credential expiry tracking + automatic renewal for the Agent Smith node.

The split it enforces: the KeePassXC vault on Kundai's laptop holds ROOT credentials
(passwords, refresh tokens, the GitHub App private key, static API keys) and pushes them
here with `python -m tools.keeper push`. This package renews the LEAF tokens derived from
them (Gmail access tokens, the Garmin session, GitHub installation tokens) on the node,
and never writes anything back to the vault.

Every probe talks to the real provider, so the dashboard reports what the provider says
right now — not a date someone typed. Nothing here ever returns a credential value:
`service.Keeper.snapshot()` is value-free by construction and is all the routes expose.

  registry.py    — which credentials exist, how each is checked, how often
  probes.py      — one live check (+ renewal where the provider allows it) per credential
  github_app.py  — GitHub App JWT -> hourly installation token
  service.py     — state, the scheduler loop, change notification for the SSE stream
"""
