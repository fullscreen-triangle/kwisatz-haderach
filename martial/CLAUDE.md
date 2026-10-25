# martial: notes for agents working on it

martial is a deterministic reviewer for prose that other agents edit. The README is the contract with callers; `martial describe` prints the same contract from the code's own tables.

## Layout

- `src/doc.rs`: the document model. Readers emit characters tagged with source positions; `Builder::finish` cuts sentences and attaches citations, references, links and math to them.
- `src/markdown.rs`, `src/latex.rs`: the readers. The LaTeX reader follows `\input` and keeps each file's own line numbers.
- `src/checks/`: one module per check family. `structure`, `clarity`, `evidence`, `code` and `drift` append problems and record whether they ran.
- `src/codes.rs`: the closed set of problem codes. A released code never changes meaning, because agents branch on it. Add a code; never repurpose one.
- `src/lexicon.rs`: every word list. `describe --json` prints them, so a caller can see why a word triggered a code.
- `src/sidecar.rs`: the agent's declarations, validated by JSON pointer and reported all at once.
- `src/lib.rs`: `check` and `claims`, the profile and input resolution, waivers, weights and ranking.
- `src/mcp.rs`: the Model Context Protocol (MCP) server on stdio. `src/main.rs`: the command line.
- `examples/`: the contract examples. `tests/examples.rs` asserts their exact problem lists, in order.
- `AGENT_GUIDE.md`: the guide for calling agents, compiled into the binary (`martial guide`). Its code table must match `src/codes.rs` row for row; `tests/guide.rs` enforces it. Change both together.
- `action.yml`: the GitHub Action other repositories use. The `action` job in CI runs it on passing and failing inputs.
- `integrations/`: the Claude Code skill and an MCP client config.

## Rules

- No model, no network, no randomness: the same input gives the same report. `reports_are_deterministic` checks it.
- A check that cannot run is reported in `not_checked`. It never passes silently, and a required check that did not run makes the verdict `incomplete`.
- Judge rule changes on real documents, not only on the examples. A rule that fires on a sound sentence costs a caller more than a missed problem: tighten its lexicon or its context before adding the rule.
- `by=author` is for problems no tool or text can settle. Do not move a code to `agent` to make an example look solved.

## Checks before calling something done

`cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, and `martial check` on README.md, CLAUDE.md and AGENT_GUIDE.md, whose verdicts must be clean.
CI (`../.github/workflows/martial.yml`, at the repository root) runs them on Linux, macOS and Windows.
