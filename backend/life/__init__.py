"""
life — the facts about Kundai (passport, residence, home, job) kept current from his mail.

  slots.py     the facts kept, by topic
  read.py      triage a mail; the model proposes facts; only quotes found verbatim count
  service.py   walks the mail store, records witnessed facts in the forms' facts structure,
               and lets him confirm or correct a fact in one tap
"""
