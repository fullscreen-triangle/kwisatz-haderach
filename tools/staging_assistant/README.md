# Staging Assistant

Solves the discoverability problem: given the corpus of papers in `docs/`, this tool produces audience-tuned submission packages and job-application drafts that respect the staging principle (substrate to substrate audiences first; philosophy to philosophy audiences only after substrate has landed; never bundle the wrong things together).

## What it does

- **Walks `docs/`** and extracts a structured inventory from every `.tex` and `.pdf` file (title, abstract, keywords, sections).
- **Maintains a static audience profile database** — each profile names the venues, the idiom, what to lead with, what to omit, what to bundle, and what to never bundle for a specific kind of reader (sports-science researchers, sensory-substitution labs, biocomputing reviewers, ML-architecture conferences, philosophy-of-religion journals, etc.).
- **Generates a pitch package** for any (paper, audience) pair: a one-paragraph hook in the audience's idiom, the recommended bundle, the do-not-bundle list, suggested venues and reviewer profiles, an audience-tuned 200-word abstract skeleton, and a cover-letter snippet.
- **Drafts cover letters** from a job description: ranks the corpus against the job text, infers the most-likely-relevant audience, drafts the letter using the top paper as the lead artefact, and lists corpus papers that should NOT be mentioned in any communication with this employer.

It is rule-based templating, not LLM generation. The output is meant to be edited.

## Setup

```bash
python -m pip install requests   # paper_inventory itself has no extra deps
```

PDFs are read via `pdftotext` (Poppler), which is already available in the project's environment via MiKTeX / Git for Windows.

## Usage

From the repo root (`kwisatz-haderach/`):

```bash
# 1. Build the paper inventory (one-time, then re-run after adding papers)
python -m tools.staging_assistant inventory

# 2. Inspect: list all papers and all known audiences
python -m tools.staging_assistant list

# 3. Pitch a paper to a specific audience
python -m tools.staging_assistant pitch \
    --paper variance-minimisation-during-performance \
    --audience sports_science

# 4. Pitch a paper across all valid audiences (compare options)
python -m tools.staging_assistant pitch-all \
    --paper biological-membrane-computing-interface

# 5. Draft a cover letter for a job
echo "Senior ML Engineer at Anthropic — research on attention mechanisms..." > job.txt
python -m tools.staging_assistant job --job-file job.txt
```

Outputs land in `tools/staging_assistant/output/` (gitignored).

## Audience profiles

The profiles in `audience_profiles.py` are the substantive piece. Each profile encodes:

- **`domains`** — which corpus domains the audience can evaluate
- **`venues`** — concrete journals/conferences/labs
- **`idiom`** — the framing the audience expects (e.g., for sports science: "single-subject self-experiment with quantitative prediction")
- **`lead_with`** — what to foreground (e.g., "the variance-minimisation 400m run paper")
- **`omit`** — what to NOT mention (e.g., "consciousness sufficiency theorem", "membrane substrate")
- **`bundle_with`** — paper-id keywords to include alongside
- **`avoid_bundling`** — paper-id keywords to NEVER include
- **`reviewer_profile`** — types of reviewers to seek

Currently included audience profiles:

| Audience id | Name |
|-------------|------|
| `sports_science` | Sports science / applied physiology |
| `sensory_substitution` | Sensory substitution / haptics / BCI |
| `biocomputing` | Biological / molecular computing |
| `computational_imaging` | Computational imaging / astronomy software |
| `mass_spec_methods` | Mass spectrometry methods / instrumentation |
| `ml_architecture` | ML architecture (transformer / attention research) |
| `quant_finance` | Quantitative finance / portfolio research |
| `philosophy_of_mind` | Philosophy of mind / consciousness studies |
| `philosophy_of_religion` | Philosophy of religion / analytical theology |
| `philosophy_of_physics` | Philosophy of physics / foundations |

Edit `audience_profiles.py` to add new audiences or refine existing ones based on actual reception.

## Why this is rule-based, not LLM-generated

The staging principle is fundamentally about *what NOT to send to a given audience*. That requires explicit, auditable rules — when one of your papers gets dismissed by a reviewer, you want to be able to look at the package and see exactly which framing or which bundled paper triggered the wrong pattern-match, then update the rule. An LLM-generated package would be persuasive but opaque; you couldn't debug a rejection.

The trade-off is that the output is skeletal — the abstract draft has bracketed `[INSERT QUANTITATIVE RESULT]` sections, not finished prose. That's intentional. The skeletal output saves you the cognitive cost of re-deriving the staging principle for every submission, but the actual paper-specific content is yours.

## What this does NOT do (yet)

- **Multi-audience optimisation**: doesn't yet pick the *best* audience for a given paper across all profiles; you specify the audience or accept the domain default.
- **Reviewer suggestion by name**: profiles list reviewer *types* (e.g., "exercise physiologists with quantitative-modelling background"), not specific people. That's an editorial decision for you; encoding specific reviewer names in a public-facing tool would be inappropriate.
- **Submission tracking**: no record of which papers have been sent where, or what the responses were. That's the natural next stone — a submission log that closes the loop between staging and reception.
- **Cross-audience consistency check**: doesn't yet flag when a paper's "lead with" content for audience A would be on the "omit" list for audience B (which would matter if you submit similar papers to overlapping audiences).
