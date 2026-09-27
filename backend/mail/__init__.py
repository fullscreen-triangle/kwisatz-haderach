"""
mail — every inbox Kundai has, read on the node, each message turned into structured facts.

  accounts.py  which accounts exist (discovered from the env the vault push writes)
  parse.py     raw RFC 822 bytes -> one normalized Message (same path for IMAP and Gmail)
  imap.py      IMAP reader: read-only EXAMINE + BODY.PEEK, so read/unread never changes
  gmail.py     Gmail REST reader (format=raw, so it shares parse.py with IMAP)
  store.py     SQLite (messages, extractions, sync state) + the markdown mirror that
               spraypaint and individuate search
  extract.py   triage (no model) then Ollama extraction to a validated schema
  memory.py    fan-out to chigutiro (prose + contact + event records)
  search.py    spraypaint over the markdown mirror
  service.py   the poll loop and the extraction queue

The planner (backend/planner) reads extractions straight from the store; mail only
tells it "something changed".
"""
