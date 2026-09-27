# Project Manager

Kundai's own project manager: tracks work toward a goal (milestones grouped
by layer, sub-tool status, a running log) and reports. Same shape as
[`document_tracker`](../document_tracker/README.md) and
`jobcenter_tracker` — a JSON store you mutate through an API, not a live
probe of anything.

## Why it doesn't auto-probe the sub-tools

The first tracked project — the Greifswald group LLM — is built from four
sub-tools: a model-gen/acquisition tool, a RAG, and two already-shipped
tools, [Wind Tunnel](https://github.com/fullscreen-triangle/wind-tunnel)
(code testing) and [Bloodhound](https://github.com/fullscreen-triangle/bloodhound)
(repo analysis). All four are separate repos, normally run remotely via
GitHub Codespaces. This module has no way to see into them, so every status
here is **manually logged**, not measured. A milestone marked `done` means
Kundai said so, not that some check passed.

## Data model

`data/projects.json` — a list of projects, each with:
- `subtools[]` — id, name, role, repo link, status
- `milestones[]` — id, **layer**, title, status, notes
- `log[]` — append-only `{date, entry}`, oldest first

`layer` is free-form per project. The Greifswald project uses the
vocabulary of the two papers it instantiates:
- `acquisition` / `composition` / `verification` — the three layers of
  *Accountable Compilation* (`semantics/purpose/absicht/docs/research-domain-specific-models/`)
- `rag` — the *Federated Retrieval-Augmentation* requirements (federated
  contact graph, triangle-grounding, closure)

Status enum: `todo | in_progress | done | blocked` (subtools also accept
`available`, for a ready-made tool like Wind Tunnel that isn't itself being
built).

## Usage

```bash
python -m tools.project_manager.tracker   # smoke test: prints the report for greifswald-group-llm
```

Normal use is through `backend/routes/projects.py` (CRUD) and the
`web/pages/desk/projects.js` desk page, or by asking Agent Smith
("how's the Greifswald project going") via `backend/routes/pm.py`.

## Current state (2026-09-15)

One project tracked: `greifswald-group-llm`, just started, all six
milestones `todo`. The two ready-made sub-tools are marked `available`; the
two being built (model-gen, RAG) are `in_progress` with no finer-grained
status yet.

### What is built
- JSON store + report computation (`tracker.py`)
- CRUD route, desk page, `pm` intent routine (see the files above)

### What is not built
- No auto-refresh from the sub-tool repos — logging progress is manual
- No reminders/deadlines — this tracks status, not dates
- No support yet for a milestone depending on another (no blocking-graph,
  just a `blocked` status you set by hand)
