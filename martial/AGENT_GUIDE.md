# martial: a guide for AI agents

You are an AI agent, and a user has asked you to improve a text. martial is the reviewer you run on it.
You write; martial judges. It tells you, by `file:line:col` and a stable code, what in the text is unclear, unsupported or unresolved.
Given the version you started from, it also tells you what your edit made untrue.

martial has no model inside and no network access. It reads files and prints a report; it never changes a file.
The same text always gets the same report, so you can run it as often as you like and trust the difference between two runs.

## When to use it

Use martial when a user asks you to improve, edit, proofread, tighten, review or check any of these:

- a scientific manuscript, thesis, report, abstract or grant text;
- a README, guide, tutorial, changelog, or API or command-line documentation;
- a letter, note, post or other prose.

Also run it before you tell a user that such a text is finished.
martial does not judge whether an argument is right, whether a translation is faithful, or whether the text is good.
It checks what can be checked, says plainly what it could not check, and leaves the rest to you and the author.

## How to call it

If your client lists the tools `martial_check`, `martial_claims`, `martial_guide` and `martial_describe`, martial is registered as a Model Context Protocol (MCP) server.
Call those tools; their arguments match the command-line options below.
Otherwise run the binary from a shell:

```bash
martial check paper.tex --profile manuscript
martial check README.md --profile software-doc --repo .
martial check paper.tex --against paper.orig.tex --json
martial claims paper.tex --skeleton
martial guide
martial describe --json
```

A text that is not in a file goes in on stdin, with `-` in place of the file and `--format md` or `--format tex`.

## The loop

1. **Pick the profile** from the table below, and save a copy of the file before you edit it.
2. **Run** `martial check` on the file.
3. **Fix the problems marked `[agent]`**, from the top of the list down. The list is ranked: violations first, then problems in the sections the document refers to most.
4. **Add evidence** for every cited claim. Write an entry in the sidecar whose quote you copied from the source file, character for character.
5. **Run it again with `--against`** the copy you saved. Drift problems show the numbers, citations and claim strengths your edit changed.
6. **Repeat** until the verdict is `clean`, or until only `[author]` problems remain.
7. **Report to the user** as described at the end of this guide.

| Profile | Use it for | It requires |
|---|---|---|
| `manuscript` | papers, theses, reports, abstracts | references and links resolve; citations name bibliography entries; claims carry support; cited claims carry quotes, which needs `--sources` |
| `software-doc` | READMEs, guides, API and command-line docs | references and links resolve; claims carry support; every path, identifier, flag and command it names exists in the repository, which needs `--repo` or a git root |
| `general` | letters, notes, posts | references and links resolve; clarity |

If you give no profile, martial takes the one in the sidecar, and otherwise picks one from the file type and says so in a note.
Pick the profile yourself, since it decides what is checked.

## Reading the report

Each problem looks like this:

```text
examples/manuscript/sections/results.tex:10:13 violated unknown_citation [agent]
  > \citet{smith2021}
  "smith2021" is not a key in the bibliography; did you mean "smith2020"?
```

- **Location**: `file:line:col`. Problems in the sidecar carry a JSON pointer instead, as in `paper.martial.json#/evidence/1/quote`.
- **Status**: `violated` means a check that can decide failed. `undecided` means a check fired but cannot decide; the message says what would decide it.
- **Who**: `[agent]` means you can resolve it from the text, the repository and the sources. `[author]` means only the author knows the answer.
- **Message**: what resolves it. With `--against`, a problem that the earlier version did not have is marked `new`.

The verdict is one of four:

| Verdict | Exit code | Meaning |
|---|---|---|
| `clean` | 0 | every required check ran and found nothing |
| `violated` | 1 | at least one problem is violated |
| `undecided` | 3 | nothing is violated, but undecided problems remain |
| `incomplete` | 3 | nothing was found, but a required check could not run |

Exit code 2 means martial could not read its input. With `--json`, the report carries the same fields in machine-readable form, and `stage` is the SHA-256 of the judged text.

## Rules you must not break

- **Never invent support.** Do not make up a citation, a bibliography entry, a number, a quote or an acronym expansion to clear a problem.
- **Never quote from memory.** An evidence quote has to be copied from the source file; martial searches the file for it, and a paraphrase fails.
- **Never strengthen a claim** to make it read better; drift checks report a stronger verb or a dropped hedge.
- **Never waive a problem to hide it.** Waive only a waivable code, and only for a reason the author would accept, such as a path the program creates at run time.
- **Never rewrite around an `[author]` problem.** Report it.
- **Never report `incomplete` as clean.** Say which check did not run and what it needs.
- **Do not read `clean` as "good".** It means that every required check ran and found nothing.

## What to do with each code

| Code | Status | By | Waivable | What resolves it |
|---|---|---|---|---|
| `dangling_ref` | violated | agent | no | Point the reference at an existing \label, or add the label where the target is. |
| `duplicate_label` | violated | agent | no | Rename one of the labels and update the references to it. |
| `dangling_link` | violated | agent | no | Fix the link target: the file or heading anchor does not exist. |
| `unknown_citation` | violated | author | no | Use a key from the bibliography. Never invent a bibliography entry; if no key fits, ask the author. by=agent when a near-identical key exists. |
| `sentence_too_long` | violated | agent | yes | Split the sentence at a clause boundary without changing what it claims. |
| `undefined_acronym` | violated | agent | yes | Expand it at first use, "Full Name (ABC)", only if the expansion is stated in the document or its sources; otherwise declare it in the sidecar terms or hand it to the author. |
| `hedge_stack` | violated | agent | yes | Keep one hedge; stacked hedges state the same uncertainty twice. |
| `reference_ambiguous` | violated | agent | yes | Name what "this" refers to, e.g. "This bound shows ...". |
| `obviousness_claim` | violated | agent | yes | Remove the assertion of obviousness, or give the step or citation it stands in for. |
| `significance_without_test` | undecided | agent | yes | State the test and its p-value, or replace "significant" with the measured difference if it means "large". |
| `repetition` | undecided | agent | yes | Merge the two sentences, or make one say something the other does not. |
| `claim_unsupported` | undecided | author | no | Add a citation or a reference to where the document shows it, or narrow the claim to what is shown. Do not invent the support: ask the author. |
| `abstract_claim_not_in_body` | undecided | agent | no | Make the body state the claim (with its support), or remove it from the abstract. |
| `claim_unverified` | undecided | agent | no | Add a sidecar evidence entry quoting, verbatim, the passage of the cited source that supports the sentence. |
| `quote_not_found` | violated | agent | no | The quote does not occur in the source. Copy the passage verbatim from the source file; do not paraphrase. |
| `source_missing` | undecided | author | no | No source text for this key in the sources directory. Ask the author for the source, or add its text as <key>.txt. |
| `evidence_orphan` | violated | agent | no | The evidence entry's claim text matches no sentence; update it to the current wording. |
| `evidence_ambiguous` | violated | agent | no | The claim text matches several sentences; quote more of the intended one. |
| `evidence_key_not_cited` | violated | agent | no | Cite the source in the sentence itself: a reader cannot see the sidecar. |
| `evidence_target_missing` | violated | agent | no | The "within" target is not a label or heading anchor of this document. |
| `declaration_refused` | violated | agent | no | A sentence that proves, demonstrates, establishes or guarantees is a claim; give it support instead of declaring it not a claim. |
| `path_missing` | violated | agent | yes | Fix the path, or waive it with a reason if the path is created at run time. |
| `identifier_not_in_code` | violated | agent | yes | Fix the name to one the code defines, or waive it with a reason if it is external (a dependency or another program). |
| `command_target_missing` | violated | agent | yes | Fix the command to a script, package, example, binary, target or file that exists. |
| `number_introduced` | violated | agent | no | Revert the number, or support it with an evidence quote that contains it. An edit must not invent a quantity. |
| `number_removed` | undecided | author | no | A quantity was removed. Restore it unless the author asked for its removal. |
| `citation_introduced` | violated | agent | no | A new citation needs a verified evidence quote from that source; add one or remove the citation. |
| `claim_strengthened` | violated | agent | no | Restore the original strength. An edit for clarity must not make a claim stronger than its evidence. |
| `claim_removed` | undecided | author | no | A claim no longer appears. Restore it unless the author asked for its removal. |
| `sidecar_invalid` | violated | agent | no | Fix the sidecar value at the given JSON pointer. |
| `waiver_not_allowed` | violated | agent | no | This code cannot be waived; resolve the problem instead. |
| `waiver_unused` | violated | agent | no | The waiver matches no problem; remove it so it cannot hide a later one. |

Status and who-resolves are fixed per code, except for `unknown_citation`, which becomes `[agent]` when a near-identical key exists.

## The sidecar

The sidecar is the one place where you state support, and martial checks every entry in it.
It sits beside the document as `<stem>.martial.json`, so `paper.martial.json` belongs to `paper.tex`. `--sidecar` names another file.

```json
{
  "version": "martial/v0",
  "profile": "manuscript",
  "sources": "sources",
  "repo": ".",
  "terms": { "WAL": "write-ahead log; the readers run databases" },
  "evidence": [
    { "claim": "Caching was shown to reduce read latency", "source": "smith2020",
      "quote": "caching reduced the median read latency by 30 percent" },
    { "claim": "the bound is tight", "within": "sec:results" },
    { "claim": "to keep the example short", "not_a_claim": "a purpose clause" }
  ],
  "waivers": [
    { "code": "path_missing", "text": "data/wal/", "reason": "created on first run" }
  ]
}
```

- `sources` is a directory holding one plain-text file per cited source, named after its citation key, as in `sources/smith2020.txt`. Paths are relative to the sidecar.
- `claim` is a piece of the sentence, as written in the document, that occurs in exactly one sentence.
- A `quote` entry must quote the source verbatim, with at least 20 characters, and the sentence must cite that key, because a reader never sees the sidecar.
- A `within` entry points to a label or heading anchor in the document that shows the claim.
- A `not_a_claim` entry tells martial that a sentence asserts nothing that needs support. It is refused for a sentence that uses a closing verb such as `proves`, `demonstrates`, `establishes` or `guarantees`.
- `terms` lists acronyms that the audience knows without an expansion.
- A waiver stays visible in the report, and becomes a problem itself once nothing matches it.

`martial claims FILE --skeleton` prints a starting sidecar with one evidence entry per cited claim and an empty quote. martial rejects the empty quotes until you fill them in.

## Words that are mentioned, not used

Words in inline code are mentioned, not used, so martial does not read them as claims, acronyms or hedges.
When a sentence talks about a word, put the word in inline code instead of waiving the problem.

## Using it in CI

`--annotate github` prints GitHub Actions annotations instead of the report, so problems appear on the lines they concern.
The repository also provides an action:

```yaml
- uses: fullscreen-triangle/kwisatz-haderach/martial@main
  with:
    files: README.md docs/guide.md
    profile: software-doc
    fail-on: violated
```

It builds martial, annotates every problem, writes the reports to the job summary, and fails when a file reaches the `fail-on` verdict.
`fail-on: undecided` also fails on `undecided` and `incomplete`.

## Reporting to the user

When you finish, tell the user:

1. the final verdict and what you fixed, by code;
2. every `[author]` problem, with its location and message, as a question for them;
3. any check that did not run, and what it needs;
4. any waiver or `not_a_claim` entry you added, with its reason.

For example:

```text
martial: violated -> undecided. Fixed 6 problems (2 dangling_ref, 3 sentence_too_long, 1 hedge_stack).
Needs you: paper.tex:14 "The method outperforms every baseline." has no support (claim_unsupported). Which result or citation shows it?
Not checked: none. Waivers added: none.
```

`martial describe --json` gives the same contract in machine-readable form, including the sidecar schema and every word list the checks use.
