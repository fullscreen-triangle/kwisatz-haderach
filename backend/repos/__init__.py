"""
repos — how the active part of Kundai's GitHub is moving, over time.

Every PASS hours: clone or pull the active subset, run bloodhound's `tracker drift` on
each (its χ — the min-cut "sense" of the repo — and the never-decreasing count m), read
git's own numbers (commits and lines since the last pass), and append one record per repo
to <state>/repos/history.jsonl. The tracker keeps only the latest χ; the history — and so
"progress over time" — is kept here.

Active subset: repos pushed in the last `active_days` (from the GitHub inventory), not
forks or archived, plus settings `include`, minus `exclude`, at most `max_repos`.
"""
