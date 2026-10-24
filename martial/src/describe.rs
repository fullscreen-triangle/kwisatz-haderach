//! `martial describe`: everything an agent needs to use martial, from the binary itself.
//! The tables are the code's own tables, so the description cannot drift from behaviour.

use serde_json::{json, Value};

use crate::codes::CODES;
use crate::lexicon;
use crate::profile::{Profile, ALL_CHECKS};

pub const PURPOSE: &str = "martial reviews prose that you (an AI agent) are asked to improve. You write; martial judges. It reads a manuscript or a software document and reports, by file:line:col and stable code, what is unclear, unsupported, unresolved, or no longer true after your edit. It has no model inside: the same text always gets the same report.";

pub const WORKFLOW: &[&str] = &[
    "1. Pick the profile for the task: manuscript, software-doc or general (see profiles).",
    "2. Run `martial check FILE --profile P` (add --repo, --sources as the profile needs). Keep a copy of FILE before editing.",
    "3. Fix the problems with by=agent, most load-bearing first (the list is ranked). Never invent a citation, a number or an expansion to make a problem go away.",
    "4. For each cited claim, add a sidecar evidence entry whose quote is copied verbatim from the source (`martial claims FILE --skeleton` starts the sidecar).",
    "5. Run `martial check FILE --against COPY`: drift problems catch numbers, citations and claim strength your edit changed.",
    "6. Repeat until the verdict is clean, or only by=author problems remain. Report those to your user verbatim; do not rewrite around them.",
    "7. A clean verdict means every required check ran and found nothing. It is not a judgement that the text is good, and an incomplete verdict is not clean.",
];

fn checks() -> Value {
    let what = |c: &str| {
        match c {
        "structure" => "every \\ref, \\label and link resolves",
        "citations" => "every citation names a bibliography entry",
        "clarity" => "sentence length, stacked hedges, unnamed referents, asserted obviousness, undefined acronyms, repetition, significance without a test",
        "evidence.support" => "every claim carries a citation, a link or a reference into the document",
        "evidence.quotes" => "every cited claim has a sidecar quote that occurs verbatim in the cited source (needs --sources)",
        "code.identifiers" => "every path, identifier and flag in inline code exists in the repository (needs a repository)",
        "code.commands" => "every npm script, Cargo package/binary/example, make target and script file in a shell command exists",
        "drift" => "with --against: no new number or citation without a verified quote, no claim made stronger, no number or claim silently removed",
        "sidecar" => "every sidecar entry is valid and matches the document",
        _ => "",
    }
    };
    Value::Array(ALL_CHECKS.iter().map(|c| json!({"check": c, "checks": what(c)})).collect())
}

pub fn json() -> Value {
    json!({
        "martial": crate::VERSION,
        "purpose": PURPOSE,
        "workflow": WORKFLOW,
        "commands": {
            "check": "martial check FILE|- [--profile P] [--format md|tex] [--sidecar F] [--no-sidecar] [--sources DIR] [--repo DIR] [--against OLD] [--json]",
            "claims": "martial claims FILE|- [--profile P] [--format md|tex] [--skeleton] [--json]",
            "describe": "martial describe [--json]",
            "mcp": "martial mcp   (Model Context Protocol server on stdin/stdout: tools martial_check, martial_claims, martial_describe)",
        },
        "exit_codes": {"0": "clean", "1": "violated", "2": "usage or input error", "3": "undecided or incomplete — not a pass"},
        "statuses": {"violated": "a decidable check failed", "undecided": "the check fired but cannot decide; the message says what would decide it"},
        "by": {"agent": "you can resolve it from the text, the repository and the sources", "author": "only the author knows; report it to your user"},
        "verdicts": {"clean": "every required check ran; nothing violated or undecided", "violated": "at least one violated problem", "undecided": "only undecided problems", "incomplete": "nothing found but a required check did not run"},
        "profiles": Profile::ALL.iter().map(|p| json!({
            "profile": p.name(), "use_for": p.use_for(), "required": p.required(), "optional": p.optional(), "max_words": p.max_words(),
        })).collect::<Vec<_>>(),
        "checks": checks(),
        "codes": CODES,
        "sidecar": {
            "file": "FILE's stem + .martial.json beside it (paper.tex -> paper.martial.json), or --sidecar",
            "version": crate::sidecar::VERSION,
            "keys": {
                "profile": "manuscript | software-doc | general",
                "sources": "directory of source texts, one <citation-key>.txt (or .md/.tex) per cited source; relative to the sidecar",
                "repo": "repository root for software-doc checks; relative to the sidecar",
                "terms": "{\"ABC\": \"why the audience needs no expansion\"} — acronyms that need no expansion",
                "evidence": "[{\"claim\": \"text of the sentence\", \"source\": \"key\", \"quote\": \"verbatim passage, >= 20 characters\"} | {\"claim\": ..., \"within\": \"label or #anchor\"} | {\"claim\": ..., \"not_a_claim\": \"reason\"}]",
                "waivers": "[{\"code\": \"<waivable code>\", \"text\": \"sentence fragment or token\", \"reason\": \"why\"}] — waived problems stay visible in the report",
            },
        },
        "lexicon": {
            "hedges": lexicon::HEDGES,
            "obviousness": lexicon::OBVIOUS,
            "claim_verbs_manuscript": lexicon::CLAIM_VERBS_MANUSCRIPT,
            "claim_verbs_software_doc": lexicon::CLAIM_VERBS_SOFTWARE,
            "claim_phrases": lexicon::CLAIM_PHRASES,
            "comparatives": lexicon::COMPARATIVES,
            "change_words": lexicon::CHANGE_WORDS,
            "strength_plus2": lexicon::STRONG,
            "strength_plus1": lexicon::MODERATE,
            "strength_minus1": lexicon::WEAK,
            "common_acronyms": lexicon::COMMON_ACRONYMS,
        },
    })
}

pub fn text() -> String {
    let mut o = format!("martial {}\n\n{PURPOSE}\n\nWorkflow\n", crate::VERSION);
    for w in WORKFLOW {
        o.push_str(&format!("  {w}\n"));
    }
    o.push_str("\nCommands\n");
    o.push_str("  martial check FILE|- [--profile P] [--format md|tex] [--sidecar F] [--no-sidecar] [--sources DIR] [--repo DIR] [--against OLD] [--json]\n");
    o.push_str("  martial claims FILE|- [--profile P] [--format md|tex] [--skeleton] [--json]\n");
    o.push_str("  martial describe [--json]      (--json adds the sidecar schema and every word list)\n");
    o.push_str("  martial mcp                    (MCP server on stdio: martial_check, martial_claims, martial_describe)\n");
    o.push_str("\nExit codes: 0 clean · 1 violated · 2 usage/input error · 3 undecided or incomplete (not a pass)\n");
    o.push_str("\nProfiles\n");
    for p in Profile::ALL {
        o.push_str(&format!(
            "  {:<13} {}\n                required: {}; optional: {}\n",
            p.name(),
            p.use_for(),
            p.required().join(", "),
            p.optional().join(", ")
        ));
    }
    o.push_str("\nCodes (status, by, waivable)\n");
    for c in CODES {
        let status = match c.status {
            crate::codes::Status::Violated => "violated",
            crate::codes::Status::Undecided => "undecided",
        };
        let by = match c.by {
            crate::codes::By::Agent => "agent",
            crate::codes::By::Author => "author",
        };
        o.push_str(&format!("  {:<27} {:<9} {:<6} {:<3} {}\n", c.code, status, by, if c.waivable { "yes" } else { "no" }, c.resolve));
    }
    o.push_str("\nSidecar: FILE-stem.martial.json beside the file; `martial describe --json` gives its schema.\n");
    o
}
