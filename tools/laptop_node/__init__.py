"""
laptop_node — the laptop's files, reachable from the phone through the desk.

The phone talks to the desk on server-2; server-2 talks to this service over the tailnet.
The service runs on the laptop (Windows, at logon), listens ONLY on the laptop's Tailscale
address, and answers only requests carrying its bearer token (the same token sits in the
KeePassXC vault and reaches server-2 with `keeper push`).

  config.py     where things live, which folders are served, what is never served
  index.py      a filename index of the served folders (SQLite, rescanned every 15 min)
  winsearch.py  content hits from the Windows Search index (PDF/Word/text bodies)
  server.py     the HTTP API: health, search, list, read (text), file (bytes)
  __main__.py   serve | index | install | status | token-path

Read-only by construction: there is no endpoint that writes, moves or deletes a file.
"""
