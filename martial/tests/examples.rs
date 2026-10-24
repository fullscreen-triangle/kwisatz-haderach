//! The shipped examples are part of the contract: each must produce exactly these
//! problems, in this order. Agents copy the examples; a change here is a change agents see.

use std::path::PathBuf;

use martial::profile::Profile;
use martial::report::Verdict;
use martial::{check, claims, Request};

fn ex(p: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("examples").join(p)
}

fn listed(r: &martial::report::Report) -> Vec<String> {
    r.problems
        .iter()
        .map(|p| {
            let file = p.file.rsplit('/').next().unwrap_or(&p.file);
            if p.line == 0 {
                let (f, pointer) = p.at.split_once('#').unwrap();
                format!("{} {}#{pointer}", p.code, f.rsplit('/').next().unwrap())
            } else {
                format!("{} {file}:{}", p.code, p.line)
            }
        })
        .collect()
}

#[test]
fn software_doc_example() {
    let r = check(&Request { path: Some(ex("software-doc/repo/README.md")), repo: Some(ex("software-doc/repo")), ..Default::default() })
        .unwrap();
    assert_eq!(r.profile, Profile::SoftwareDoc);
    assert_eq!(r.profile_from, "sidecar");
    assert_eq!(
        listed(&r),
        [
            "command_target_missing README.md:7",
            "identifier_not_in_code README.md:8",
            "command_target_missing README.md:12",
            "command_target_missing README.md:14",
            "command_target_missing README.md:17",
            "reference_ambiguous README.md:24",
            "hedge_stack README.md:28",
            "undefined_acronym README.md:29",
            "dangling_link README.md:30",
            "dangling_link README.md:30",
            "claim_unsupported README.md:22",
        ]
    );
    // The Usage section is linked to, so its problems weigh more and rank first.
    assert_eq!(r.problems[0].weight, 2);
    assert_eq!(r.waived.len(), 1);
    assert_eq!(r.waived[0].code, "path_missing");
    assert_eq!(r.verdict, Verdict::Violated);
    assert_eq!(r.checked, ["sidecar", "structure", "citations", "clarity", "evidence.support", "code.identifiers", "code.commands"]);
    assert!(r.not_checked.is_empty());
}

#[test]
fn manuscript_example() {
    let r = check(&Request { path: Some(ex("manuscript/paper.tex")), ..Default::default() }).unwrap();
    assert_eq!(
        listed(&r),
        [
            "dangling_ref results.tex:4",
            "dangling_ref results.tex:7",
            "reference_ambiguous results.tex:9",
            "hedge_stack results.tex:10",
            "unknown_citation results.tex:10",
            "evidence_key_not_cited paper.tex:11",
            "undefined_acronym paper.tex:11",
            "obviousness_claim paper.tex:12",
            "quote_not_found paper.martial.json#/evidence/1/quote",
            "significance_without_test results.tex:8",
            "source_missing results.tex:10",
            "abstract_claim_not_in_body paper.tex:6",
            "source_missing paper.tex:11",
            "claim_unsupported paper.tex:14",
        ]
    );
    // The suggestion makes an unknown key the agent's to fix.
    let unknown = r.problems.iter().find(|p| p.code == "unknown_citation").unwrap();
    assert!(unknown.message.contains("did you mean \"smith2020\""));
    assert_eq!(unknown.by, martial::codes::By::Agent);
    assert_eq!(r.summary.for_author, 3);
    assert!(r.checked.contains(&"evidence.quotes"));
}

#[test]
fn manuscript_without_sources_is_incomplete_not_clean() {
    let r = check(&Request { path: Some(ex("manuscript/paper.tex")), no_sidecar: true, ..Default::default() }).unwrap();
    assert_eq!(r.not_checked.len(), 1);
    assert_eq!(r.not_checked[0].check, "evidence.quotes");
}

#[test]
fn drift_example() {
    let r = check(&Request {
        path: Some(ex("drift/after.md")),
        profile: Some(Profile::General),
        against: Some(ex("drift/before.md")),
        ..Default::default()
    })
    .unwrap();
    assert_eq!(
        listed(&r),
        [
            "claim_strengthened after.md:3",
            "number_introduced after.md:3",
            "citation_introduced after.md:4",
            "claim_strengthened after.md:5",
            "number_removed before.md:3",
            "number_removed before.md:4",
        ]
    );
    let d = r.drift.as_ref().unwrap();
    assert_eq!((d.new, d.fixed), (6, 0));
    assert!(r.problems[0].message.contains("removed may"));
}

#[test]
fn an_unchanged_document_has_no_drift() {
    let r = check(&Request {
        path: Some(ex("drift/before.md")),
        profile: Some(Profile::General),
        against: Some(ex("drift/before.md")),
        ..Default::default()
    })
    .unwrap();
    assert!(r.problems.is_empty(), "{:?}", listed(&r));
    assert_eq!(r.verdict, Verdict::Clean);
}

#[test]
fn clean_example() {
    let r = check(&Request { path: Some(ex("clean/note.md")), profile: Some(Profile::General), ..Default::default() }).unwrap();
    assert_eq!(r.verdict, Verdict::Clean);
    assert_eq!(r.verdict.exit_code(), 0);
}

#[test]
fn reports_are_deterministic() {
    let req = Request { path: Some(ex("manuscript/paper.tex")), ..Default::default() };
    let a = serde_json::to_string(&check(&req).unwrap()).unwrap();
    let b = serde_json::to_string(&check(&req).unwrap()).unwrap();
    assert_eq!(a, b);
}

#[test]
fn claims_lists_support_and_builds_a_skeleton() {
    let c = claims(&Request { path: Some(ex("manuscript/paper.tex")), ..Default::default() }, true).unwrap();
    let support: Vec<&str> = c.claims.iter().map(|r| r.support).collect();
    assert_eq!(support, ["abstract", "abstract", "cited", "cited", "internal", "none", "cited"]);
    let sk = c.skeleton.unwrap();
    assert_eq!(sk["evidence"].as_array().unwrap().len(), 3);
    assert_eq!(sk["evidence"][0]["source"], "smith2020");
}

#[test]
fn text_input_needs_no_file() {
    let r = check(&Request {
        text: Some("This is clearly the case. It may possibly hold.".into()),
        format: Some(martial::doc::Format::Markdown),
        profile: Some(Profile::General),
        ..Default::default()
    })
    .unwrap();
    let codes: Vec<&str> = r.problems.iter().map(|p| p.code).collect();
    assert_eq!(codes, ["obviousness_claim", "reference_ambiguous", "hedge_stack"]);
    assert_eq!(r.file, "<text>");
}
