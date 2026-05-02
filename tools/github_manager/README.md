# GitHub Manager

A small assistant tool that surveys a GitHub user's repos and produces a synergy report — which repos share framework concepts, which concept clusters dominate, and which cross-domain pairings are strongest.

It's framework-aware: the concept vocabulary at `framework_concepts.py` is built specifically from the corpus (bounded phase space, BMD, S-entropy, membrane substrate, partition coordinates, ξ, trajectory completion, etc.) so synergies are scored against your conceptual structure rather than against generic NLP keywords.

## What it does

1. **Inventory** — fetches all your non-fork repos via the GitHub REST API. For each repo it records description, topics, language breakdown, size, stars, last push, and the README content.
2. **Tag** — runs each repo's text (description + topics + README) against the framework vocabulary and records which concepts hit.
3. **Synergy scoring** — for every pair of repos that share at least one concept, computes a score using IDF-weighted shared-concept overlap with a 1.5× cross-domain bonus. Pairs that connect different primary domains (e.g., a software repo and a biology repo sharing `bmd`) score higher than within-domain pairs.
4. **Report** — writes both `output/synergy_report.json` (machine-readable) and `output/synergy_report.md` (human-readable, with inventory by domain, top synergy pairs, concept frequency, and orphan repos).

## One-time setup

You need a GitHub personal access token with read access to your repos.

1. Go to <https://github.com/settings/tokens?type=beta>.
2. Generate a fine-grained PAT with **Repository access: All repositories** (or pick the ones you want analysed) and **Repository permissions: Contents = Read-only, Metadata = Read-only**.
3. Set it in your shell:

```bash
# Git Bash / WSL
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

```powershell
# PowerShell
$env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
```

To make it persistent on Windows, set it in your user environment variables.

Install the one runtime dependency:

```bash
python -m pip install requests
```

## Usage

From the repo root (`kwisatz-haderach/`):

```bash
# Full pipeline: fetch + tag + report
python -m tools.github_manager --user fullscreen-triangle

# Just refresh the cached inventory (skip the report step)
python -m tools.github_manager --user fullscreen-triangle --inventory-only

# Re-render the report from cached inventory (no API calls)
python -m tools.github_manager --user fullscreen-triangle --report-only

# Skip archived repos and forks; show top 100 pairs in the markdown
python -m tools.github_manager --user fullscreen-triangle \
    --skip-archived --top-pairs 100
```

Outputs land in `tools/github_manager/output/`:

- `inventory.json` — the raw repo metadata (cached so re-runs don't re-fetch unless you delete it)
- `synergy_report.json` — tagged repos + ranked pairs
- `synergy_report.md` — human-readable report

The `output/` directory is gitignored, so reports stay local.

## Extending the framework vocabulary

Concepts live in `framework_concepts.py` as `Concept` instances grouped into clusters (`FOUNDATIONS`, `MEMBRANE`, `INSTRUMENTS`, `COSMOLOGY`, `SOFTWARE`, etc.). To add a new concept:

```python
Concept(
    "your_concept_name", "domain_tag",
    ("primary term", "synonym", "related phrase"),
    weight=2.0,   # 1.0 = common, 2.5 = rare and load-bearing
),
```

Append it to one of the cluster lists. Higher weight makes a hit more impactful in the synergy score, which is appropriate for rare/specific concepts (e.g., `psychon`, `xi_observation_boundary`) versus common ones (e.g., `mass_spec`).

Cross-domain pairings are scored higher because the corpus's strongest signal — convergence of one architectural feature across many domains — is exactly the kind of structure that should rank highest.

## What this is, and what it isn't

This is the first stone of the assistant. It solves the **inventory problem** (you've lost track of what's where) and the **synergy detection problem** (which repos can share infrastructure or validate each other). It does not yet solve the **staging problem** (which papers go to which reviewer in what form) — that's the next stone.

It's also dumb in some specific ways: substring matching, no semantic understanding of code, no commit-history analysis, no cross-repo dependency detection. The tagging is calibrated to the README + description + topics — which means a repo with a sparse README will under-tag relative to its real content. That's a fixable limitation, not a fundamental one.
