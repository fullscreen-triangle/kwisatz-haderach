"""
laptop_node — the laptop's files, reachable from the phone through the desk.

The phone talks to the desk on server-2; server-2 talks to this service over the tailnet.
The service runs on the laptop (Windows, at logon), listens ONLY on the laptop's Tailscale
address, and answers only requests carrying its bearer token (the same token sits in the
KeePassXC vault and reaches server-2 with `keeper push`).

  config.py     where things live, which folders are served, what is never served
  index.py      a filename index of the served folders (SQLite, rescanned every 15 min)
  winsearch.py  content hits from the Windows Search index (PDF/Word/text bodies)
  server.py     the HTTP API: health, search, list, read (text), file (bytes), file plans
  plans.py      file plans through drogba: preview (reads only) and run-as-previewed
  __main__.py   serve | index | install | status | token-path

Read-only unless the laptop says otherwise: the only way anything changes is a drogba plan
(plans.py), previewed step by step, run only as previewed, only inside the served folders,
deletes to the Recycle Bin, never a credential — and only when laptop-node.json holds
`"plans": true`. Without that switch, /plan/run refuses and the node stays read-only.
"""
