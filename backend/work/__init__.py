"""
work — what Kundai is doing at work, from his work desk (currentValue, shared with Mark Dörr).

  desk.py      reads a desk tree: projects, newest brief, threads that wait for him, each
               project's Witnessed / Open / Against the plan, plan, decisions, inbox, documents
  service.py   where the desk is read from (uni Gitea clone, else the laptop's copy), each
               project's newest commits from Gitea, a snapshot kept in <state>/work

Read only: nothing here writes to the desk or to any project.
"""
