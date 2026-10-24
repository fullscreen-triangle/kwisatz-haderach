# martial

martial reviews prose that an AI agent has been asked to improve. The agent writes and martial judges.
It reads a manuscript or a software document and reports what is unclear, unsupported or unresolved, by `file:line:col` and a stable code.
With the version an edit started from, it also reports what the edit made untrue.
There is no model inside, so the same text always gets the same report.
An agent can therefore tell whether its edits helped, and two agents reviewing one text agree.

## Handing martial a task

```bash
martial check paper.tex --profile manuscript
martial check README.md --profile software-doc --repo .
martial check README.md --against README.orig.md --json
martial claims paper.tex --skeleton
martial describe
```

A user asks an agent to improve a text; the agent runs this loop:

1. Pick the profile for the task (table below) and keep a copy of the file.
2. Run `martial check`. Fix the problems marked `[agent]`, top of the list first.
3. For every cited claim, add an evidence entry to the sidecar whose quote is copied from the source file.
4. Run it again with `--against` the copy. Drift problems catch numbers, citations and claim strength the edit changed.
5. Stop when the verdict is `clean`, or when only `[author]` problems remain. Report those to the user as they are.

The agent never invents a citation, a number or an expansion to make a problem go away.
`martial describe` prints the whole contract: the loop, every code, the sidecar schema and every word list.

| Profile | Use for | Checks |
|---|---|---|
| `manuscript` | papers, theses, reports, abstracts | structure, citations, clarity, claim support, verbatim quotes from sources |
| `software-doc` | READMEs, guides, API and command-line docs | structure, clarity, claim support, and that every named path, identifier, flag and command exists in the repository |
| `general` | letters, notes, posts | structure and clarity |

## What comes back

Each problem has a location, a code, a status, who can resolve it, a message saying what resolves it, and an excerpt:

```text
examples/manuscript/sections/results.tex:10:13 violated unknown_citation [agent]
  > \citet{smith2021}
  "smith2021" is not a key in the bibliography; did you mean "smith2020"?
```

- `violated`: a decidable check failed. `undecided`: the check fired but cannot decide, and the message says what would.
- `[agent]`: the agent can resolve it from the text, the repository and the sources. `[author]`: only the author knows the answer.
- The list is ranked. Violations come first, then problems in sections the document refers to most.

The verdict is `clean`, `violated`, `undecided` or `incomplete`, with exit codes 0, 1, 3 and 3.
Exit code 2 means the input could not be read.
`incomplete` means a required check could not run, for example quote verification without a sources directory, and is never a pass.
`clean` means every required check ran and found nothing; it is not a judgement that the text is good.
With `--json` the report carries the same fields, plus the SHA-256 of the judged text as `stage`.

## The sidecar

The sidecar is where an agent states support, and martial checks every entry.
It sits beside the document as `<stem>.martial.json`; for example `paper.martial.json` sits beside `paper.tex`.

```json
{
  "version": "martial/v0",
  "profile": "manuscript",
  "sources": "sources",
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

- `quote` must occur in the source text `sources/<key>.txt`, and the sentence must cite that key, because a reader cannot see the sidecar.
- `within` must name a label or heading anchor of the document.
- `not_a_claim` is refused for a sentence that uses a closing verb such as `proves`, `demonstrates`, `establishes` or `guarantees`.
  Words in inline code are mentioned, not used, so martial does not read them as claims.
- A waiver applies only to codes marked waivable, stays visible in the report, and becomes a problem itself once nothing matches it.

## Calling it from an agent

The binary has no network access and opens no port.
`martial mcp` serves the Model Context Protocol (MCP) on stdin and stdout with three tools: `martial_check`, `martial_claims` and `martial_describe`.
Register it with an agent:

```bash
claude mcp add martial -- martial mcp
```

or in any client's server list:

```json
{ "mcpServers": { "martial": { "command": "martial", "args": ["mcp"] } } }
```

Agents without MCP call the command line with `--json`. A document can also arrive on stdin with `-` and `--format md` or `--format tex`.

## Install and develop

```bash
cargo install --path .
cargo test
cargo clippy --all-targets -- -D warnings
```

The only dependencies are `serde` and `serde_json`. Readers, checks, SHA-256 and the MCP server are written here.

The examples are part of the contract. Each one in [examples](examples) must produce exactly the problems that `tests/examples.rs` lists, in that order:

| Example | Shows |
|---|---|
| [software-doc](examples/software-doc/repo/README.md) | missing flags, scripts, examples and make targets; terms and a waiver |
| [manuscript](examples/manuscript/paper.tex) | `\input` files, bibliography keys, verified and failed quotes, abstract claims |
| [drift](examples/drift/after.md) | an edit that strengthened claims, changed numbers and added a citation |
| [clean](examples/clean/note.md) | a clean verdict |

CI runs the tests on Linux, macOS and Windows, and runs martial on this README.

## Status

Working:
- Markdown and LaTeX readers, including `\input`, theorem-like environments, floats, footnotes and code.
- The `manuscript`, `software-doc` and `general` profiles, with the sidecar, drift checks, the command line and the MCP server.

Not yet:
- reStructuredText and plain-text readers.
- Sources other than plain text, such as PDF.
- Calibrated thresholds for the word lists.
