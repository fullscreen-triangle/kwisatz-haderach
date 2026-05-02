# tools/

Assistant infrastructure that runs against the kwisatz-haderach corpus. Each tool is a self-contained Python package runnable via `python -m tools.<name>` from the repo root.

## Tools

### [`github_manager/`](github_manager/README.md)

Inventories your GitHub repos and computes pairwise synergies using a framework-aware concept vocabulary (47 concepts across 10 domains: foundation, information, biology, instruments, astronomy, software, neuroscience, driving, finance, philosophy). Each pair gets an IDF-weighted shared-concept score with a 1.5× cross-domain bonus, surfacing convergence patterns across the corpus.

Solves: the **inventory problem** (you've lost track of which repos exist where) and the **synergy detection problem** (which repos can share infrastructure or validate each other).

```bash
export GITHUB_TOKEN=ghp_...
python -m tools.github_manager --user fullscreen-triangle
```

Outputs land in `tools/github_manager/output/synergy_report.md`.

### [`staging_assistant/`](staging_assistant/README.md)

Walks `docs/`, extracts paper metadata, and produces audience-tuned submission packages plus job-application drafts. Uses a static audience-profile database (10 audiences: sports science, sensory substitution, biocomputing, computational imaging, mass-spec methods, ML architecture, quant finance, philosophy of mind / religion / physics).

Each pitch package contains: a one-paragraph hook in the audience's idiom, a foreground-this list, a do-not-mention list, recommended bundle, do-not-bundle list (this is the staging principle made concrete), suggested venues and reviewer profiles, and an audience-tuned abstract skeleton + cover-letter snippet.

Solves: the **discoverability problem** (over-supply of preparation that doesn't reach demand, the Audi-F1 case) and the **bundling problem** (which corpus papers to send alongside which, never bundling philosophy-of-religion with sensory-substitution).

```bash
python -m tools.staging_assistant inventory      # one-time: walks docs/
python -m tools.staging_assistant list           # show inventory + audiences
python -m tools.staging_assistant pitch \
    --paper variance-minimisation-during-performance \
    --audience sports_science                    # tailored pitch package
python -m tools.staging_assistant job \
    --job-file ./job.txt                         # cover-letter draft
```

Outputs land in `tools/staging_assistant/output/`.

## Why these are rule-based, not LLM-driven

Both tools use explicit, auditable rules — concept vocabularies, audience profiles, bundling tables. When a submission gets rejected or a pull request gets ignored, you want to be able to look at the package and see exactly which rule produced the wrong framing or the wrong bundle, then update it. LLM-generated output would be fluent but opaque; you couldn't debug a rejection.

The trade-off is that the output is skeletal — abstract drafts have `[INSERT QUANTITATIVE RESULT]` markers, cover letters have `[ROLE]` and `[COMPANY]` placeholders. That's intentional. The tools save you the cognitive cost of re-deriving the staging principle for every submission; the paper-specific content is yours.

## Roadmap

Buildable in the same shape:

- `submission_log/` — track which papers have been sent to which venues, with response timestamps and outcomes; close the loop between staging and reception. Updates to audience profiles based on observed reception data become principled rather than guessed.
- `instrument_validator/` — given an instrument paper, identify the cheapest falsification experiment that would produce a domain-legible result (e.g., the Maxwell-Boltzmann χ² test on inter-transaction times for the DTI paper).
- `cross_corpus_dependency_map/` — extract citation graph across the corpus to identify what someone needs to read first to evaluate any given paper. Drives staging more rigorously than domain-default heuristics.
- `convergence_navigator/` — tracks the 18-derivation convergence pattern explicitly, lets you query "show me which corpus artefacts derive the architectural-entity feature" and produces a synthesis suitable for submission to philosophy-of-religion or philosophy-of-physics audiences.

Each is the same shape as the existing tools: explicit data, rule-based templating, audit-friendly output.
