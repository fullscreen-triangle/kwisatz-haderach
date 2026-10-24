//! The closed set of problem codes. A code's meaning never changes once released: agents
//! branch on it. Each code names the check that emits it, the status it carries, who can
//! resolve it, whether a sidecar waiver may set it aside, and what resolves it.

use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    /// A decidable check failed.
    Violated,
    /// The check fired but cannot decide; the message says what would decide it.
    Undecided,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum By {
    /// The calling agent can resolve it from the text, the repository and the sources.
    Agent,
    /// Only the author knows the answer; the agent reports it instead of rewriting around it.
    Author,
}

#[derive(Debug, Serialize)]
pub struct CodeInfo {
    pub code: &'static str,
    pub check: &'static str,
    pub status: Status,
    pub by: By,
    pub waivable: bool,
    pub resolve: &'static str,
}

use By::*;
use Status::*;

const fn c(code: &'static str, check: &'static str, status: Status, by: By, waivable: bool, resolve: &'static str) -> CodeInfo {
    CodeInfo { code, check, status, by, waivable, resolve }
}

pub const CODES: &[CodeInfo] = &[
    c("dangling_ref", "structure", Violated, Agent, false, "Point the reference at an existing \\label, or add the label where the target is."),
    c("duplicate_label", "structure", Violated, Agent, false, "Rename one of the labels and update the references to it."),
    c("dangling_link", "structure", Violated, Agent, false, "Fix the link target: the file or heading anchor does not exist."),
    c("unknown_citation", "citations", Violated, Author, false, "Use a key from the bibliography. Never invent a bibliography entry; if no key fits, ask the author. by=agent when a near-identical key exists."),
    c("sentence_too_long", "clarity", Violated, Agent, true, "Split the sentence at a clause boundary without changing what it claims."),
    c("undefined_acronym", "clarity", Violated, Agent, true, "Expand it at first use, \"Full Name (ABC)\", only if the expansion is stated in the document or its sources; otherwise declare it in the sidecar terms or hand it to the author."),
    c("hedge_stack", "clarity", Violated, Agent, true, "Keep one hedge; stacked hedges state the same uncertainty twice."),
    c("reference_ambiguous", "clarity", Violated, Agent, true, "Name what \"this\" refers to, e.g. \"This bound shows ...\"."),
    c("obviousness_claim", "clarity", Violated, Agent, true, "Remove the assertion of obviousness, or give the step or citation it stands in for."),
    c("significance_without_test", "clarity", Undecided, Agent, true, "State the test and its p-value, or replace \"significant\" with the measured difference if it means \"large\"."),
    c("repetition", "clarity", Undecided, Agent, true, "Merge the two sentences, or make one say something the other does not."),
    c("claim_unsupported", "evidence.support", Undecided, Author, false, "Add a citation or a reference to where the document shows it, or narrow the claim to what is shown. Do not invent the support: ask the author."),
    c("abstract_claim_not_in_body", "evidence.support", Undecided, Agent, false, "Make the body state the claim (with its support), or remove it from the abstract."),
    c("claim_unverified", "evidence.quotes", Undecided, Agent, false, "Add a sidecar evidence entry quoting, verbatim, the passage of the cited source that supports the sentence."),
    c("quote_not_found", "evidence.quotes", Violated, Agent, false, "The quote does not occur in the source. Copy the passage verbatim from the source file; do not paraphrase."),
    c("source_missing", "evidence.quotes", Undecided, Author, false, "No source text for this key in the sources directory. Ask the author for the source, or add its text as <key>.txt."),
    c("evidence_orphan", "sidecar", Violated, Agent, false, "The evidence entry's claim text matches no sentence; update it to the current wording."),
    c("evidence_ambiguous", "sidecar", Violated, Agent, false, "The claim text matches several sentences; quote more of the intended one."),
    c("evidence_key_not_cited", "evidence.quotes", Violated, Agent, false, "Cite the source in the sentence itself: a reader cannot see the sidecar."),
    c("evidence_target_missing", "sidecar", Violated, Agent, false, "The \"within\" target is not a label or heading anchor of this document."),
    c("declaration_refused", "sidecar", Violated, Agent, false, "A sentence that proves, demonstrates, establishes or guarantees is a claim; give it support instead of declaring it not a claim."),
    c("path_missing", "code.identifiers", Violated, Agent, true, "Fix the path, or waive it with a reason if the path is created at run time."),
    c("identifier_not_in_code", "code.identifiers", Violated, Agent, true, "Fix the name to one the code defines, or waive it with a reason if it is external (a dependency or another program)."),
    c("command_target_missing", "code.commands", Violated, Agent, true, "Fix the command to a script, package, example, binary, target or file that exists."),
    c("number_introduced", "drift", Violated, Agent, false, "Revert the number, or support it with an evidence quote that contains it. An edit must not invent a quantity."),
    c("number_removed", "drift", Undecided, Author, false, "A quantity was removed. Restore it unless the author asked for its removal."),
    c("citation_introduced", "drift", Violated, Agent, false, "A new citation needs a verified evidence quote from that source; add one or remove the citation."),
    c("claim_strengthened", "drift", Violated, Agent, false, "Restore the original strength. An edit for clarity must not make a claim stronger than its evidence."),
    c("claim_removed", "drift", Undecided, Author, false, "A claim no longer appears. Restore it unless the author asked for its removal."),
    c("sidecar_invalid", "sidecar", Violated, Agent, false, "Fix the sidecar value at the given JSON pointer."),
    c("waiver_not_allowed", "sidecar", Violated, Agent, false, "This code cannot be waived; resolve the problem instead."),
    c("waiver_unused", "sidecar", Violated, Agent, false, "The waiver matches no problem; remove it so it cannot hide a later one."),
];

pub fn info(code: &str) -> &'static CodeInfo {
    CODES.iter().find(|c| c.code == code).unwrap_or_else(|| panic!("unregistered code {code}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_are_unique() {
        let mut seen = std::collections::HashSet::new();
        for c in CODES {
            assert!(seen.insert(c.code), "duplicate {}", c.code);
            assert!(crate::profile::ALL_CHECKS.contains(&c.check), "unknown check {}", c.check);
        }
    }
}
