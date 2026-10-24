//! The sidecar: what the agent declares about a document. It is the only place an agent
//! states support (a verbatim quote, or a pointer into the document), terms the audience
//! knows, and problems it sets aside with a reason. Everything in it is checked; nothing
//! in it is taken on trust. Invalid values are reported by JSON pointer, all at once.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::codes;
use crate::profile::Profile;

pub const VERSION: &str = "martial/v0";
const KEYS: &[&str] = &["$schema", "version", "profile", "sources", "repo", "terms", "evidence", "waivers"];
const MIN_QUOTE: usize = 20;

#[derive(Clone, Debug)]
pub enum Support {
    Quote { source: String, quote: String },
    Within(String),
    NotAClaim(String),
}

#[derive(Clone, Debug)]
pub struct Evidence {
    pub index: usize,
    pub claim: String,
    pub support: Support,
}

#[derive(Clone, Debug)]
pub struct Waiver {
    pub index: usize,
    pub code: String,
    pub text: String,
    pub reason: String,
}

#[derive(Clone, Debug)]
pub struct SidecarProblem {
    pub code: &'static str,
    pub pointer: String,
    pub message: String,
}

#[derive(Clone, Debug, Default)]
pub struct Sidecar {
    pub path: Option<PathBuf>,
    pub name: String,
    pub profile: Option<Profile>,
    pub sources: Option<PathBuf>,
    pub repo: Option<PathBuf>,
    pub terms: BTreeMap<String, String>,
    pub evidence: Vec<Evidence>,
    pub waivers: Vec<Waiver>,
    pub problems: Vec<SidecarProblem>,
}

/// `paper.tex` → `paper.martial.json` beside it.
pub fn default_path(doc: &Path) -> PathBuf {
    let stem = doc.file_stem().and_then(|s| s.to_str()).unwrap_or("doc");
    doc.with_file_name(format!("{stem}.martial.json"))
}

pub fn load(path: &Path) -> Sidecar {
    let name = crate::display_path(path);
    let base = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let mut s = match std::fs::read_to_string(path) {
        Ok(t) => parse(&t, &base),
        Err(e) => {
            let mut s = Sidecar::default();
            s.problems.push(SidecarProblem {
                code: "sidecar_invalid",
                pointer: String::new(),
                message: format!("cannot read the sidecar: {e}"),
            });
            s
        }
    };
    s.path = Some(path.to_path_buf());
    s.name = name;
    s
}

pub fn parse(text: &str, base: &Path) -> Sidecar {
    let mut s = Sidecar::default();
    let bad =
        |s: &mut Sidecar, pointer: String, message: String| s.problems.push(SidecarProblem { code: "sidecar_invalid", pointer, message });
    let v: Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(e) => {
            bad(&mut s, String::new(), format!("not valid JSON: {e}"));
            return s;
        }
    };
    let Some(obj) = v.as_object() else {
        bad(&mut s, String::new(), "a sidecar must be a JSON object".into());
        return s;
    };
    for k in obj.keys() {
        if !KEYS.contains(&k.as_str()) {
            bad(&mut s, format!("/{k}"), format!("unknown key; one of {}", KEYS.join(", ")));
        }
    }
    if let Some(v) = obj.get("version") {
        if v.as_str() != Some(VERSION) {
            bad(&mut s, "/version".into(), format!("unsupported version {v}; this build reads \"{VERSION}\""));
        }
    }
    if let Some(v) = obj.get("profile") {
        match v.as_str().and_then(Profile::parse) {
            Some(p) => s.profile = Some(p),
            None => bad(&mut s, "/profile".into(), format!("one of {}", Profile::ALL.map(|p| p.name()).join(", "))),
        }
    }
    for key in ["sources", "repo"] {
        if let Some(v) = obj.get(key) {
            match v.as_str() {
                Some(p) if !p.trim().is_empty() => {
                    let path = base.join(p);
                    if key == "sources" {
                        s.sources = Some(path);
                    } else {
                        s.repo = Some(path);
                    }
                }
                _ => bad(&mut s, format!("/{key}"), "must be a directory path, relative to the sidecar".into()),
            }
        }
    }
    if let Some(v) = obj.get("terms") {
        match v.as_object() {
            Some(t) => {
                for (k, v) in t {
                    match v.as_str() {
                        Some(r) if !r.trim().is_empty() => {
                            s.terms.insert(k.clone(), r.to_string());
                        }
                        _ => bad(
                            &mut s,
                            format!("/terms/{}", escape(k)),
                            "must be a non-empty string saying what the term is and why it needs no expansion".into(),
                        ),
                    }
                }
            }
            None => bad(&mut s, "/terms".into(), "must be an object of term to explanation".into()),
        }
    }
    if let Some(v) = obj.get("evidence") {
        match v.as_array() {
            Some(items) => {
                for (i, item) in items.iter().enumerate() {
                    let at = format!("/evidence/{i}");
                    let Some(e) = item.as_object() else {
                        bad(&mut s, at, "must be an object".into());
                        continue;
                    };
                    for k in e.keys() {
                        if !["claim", "source", "quote", "within", "not_a_claim"].contains(&k.as_str()) {
                            bad(&mut s, format!("{at}/{k}"), "unknown key; one of claim, source, quote, within, not_a_claim".into());
                        }
                    }
                    let claim = match e.get("claim").and_then(Value::as_str) {
                        Some(c) if c.trim().chars().count() >= 8 => c.to_string(),
                        _ => {
                            bad(
                                &mut s,
                                format!("{at}/claim"),
                                "required: at least 8 characters of the sentence this supports, as written in the document".into(),
                            );
                            continue;
                        }
                    };
                    let kinds: Vec<&str> = ["quote", "within", "not_a_claim"].into_iter().filter(|k| e.contains_key(*k)).collect();
                    if kinds.len() != 1 {
                        bad(
                            &mut s,
                            at.clone(),
                            format!(
                                "give exactly one of quote (with source), within, not_a_claim (got {})",
                                if kinds.is_empty() { "none".to_string() } else { kinds.join(", ") }
                            ),
                        );
                        continue;
                    }
                    let support = match kinds[0] {
                        "quote" => {
                            let source = e.get("source").and_then(Value::as_str).unwrap_or("").trim().to_string();
                            let quote = e.get("quote").and_then(Value::as_str).unwrap_or("").to_string();
                            if source.is_empty() {
                                bad(&mut s, format!("{at}/source"), "required with quote: the citation key of the source".into());
                                continue;
                            }
                            if quote.trim().chars().count() < MIN_QUOTE {
                                bad(&mut s, format!("{at}/quote"), format!("must be at least {MIN_QUOTE} characters copied verbatim from the source; a fragment that short proves nothing"));
                                continue;
                            }
                            Support::Quote { source, quote }
                        }
                        "within" => match e.get("within").and_then(Value::as_str) {
                            Some(w) if !w.trim().is_empty() => Support::Within(w.trim().to_string()),
                            _ => {
                                bad(&mut s, format!("{at}/within"), "must be a \\label name or a #heading-anchor of this document".into());
                                continue;
                            }
                        },
                        _ => match e.get("not_a_claim").and_then(Value::as_str) {
                            Some(r) if !r.trim().is_empty() => Support::NotAClaim(r.to_string()),
                            _ => {
                                bad(&mut s, format!("{at}/not_a_claim"), "must be a non-empty reason".into());
                                continue;
                            }
                        },
                    };
                    if !matches!(support, Support::Quote { .. }) && e.contains_key("source") {
                        bad(&mut s, format!("{at}/source"), "source goes only with quote".into());
                        continue;
                    }
                    s.evidence.push(Evidence { index: i, claim, support });
                }
            }
            None => bad(&mut s, "/evidence".into(), "must be an array of evidence entries".into()),
        }
    }
    if let Some(v) = obj.get("waivers") {
        match v.as_array() {
            Some(items) => {
                for (i, item) in items.iter().enumerate() {
                    let at = format!("/waivers/{i}");
                    let Some(w) = item.as_object() else {
                        bad(&mut s, at, "must be an object".into());
                        continue;
                    };
                    let field = |k: &str| w.get(k).and_then(Value::as_str).map(str::trim).filter(|t| !t.is_empty()).map(String::from);
                    let (Some(code), Some(text), Some(reason)) = (field("code"), field("text"), field("reason")) else {
                        bad(&mut s, at, "required: code, text (the sentence fragment or token it applies to) and reason".into());
                        continue;
                    };
                    match codes::CODES.iter().find(|c| c.code == code) {
                        None => bad(&mut s, format!("{at}/code"), "not a martial code; see `martial describe`".into()),
                        Some(c) if !c.waivable => s.problems.push(SidecarProblem {
                            code: "waiver_not_allowed",
                            pointer: format!("{at}/code"),
                            message: format!("{code} cannot be waived; {}", c.resolve),
                        }),
                        Some(_) => s.waivers.push(Waiver { index: i, code, text, reason }),
                    }
                }
            }
            None => bad(&mut s, "/waivers".into(), "must be an array of waivers".into()),
        }
    }
    s
}

fn escape(k: &str) -> String {
    k.replace('~', "~0").replace('/', "~1")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pointers(t: &str) -> Vec<String> {
        parse(t, Path::new(".")).problems.into_iter().map(|p| format!("{} {}", p.code, p.pointer)).collect()
    }

    #[test]
    fn accepts_a_complete_sidecar() {
        let s = parse(
            r#"{"version":"martial/v0","profile":"manuscript","sources":"src","terms":{"BM25":"standard ranking function"},
               "evidence":[{"claim":"the bound is tight","source":"smith2020","quote":"we prove that the bound is tight for all n"},
                           {"claim":"as shown below","within":"sec:results"},
                           {"claim":"to improve readability","not_a_claim":"purpose clause"}],
               "waivers":[{"code":"sentence_too_long","text":"In summary","reason":"a list the author wants kept"}]}"#,
            Path::new("."),
        );
        assert!(s.problems.is_empty(), "{:?}", s.problems);
        assert_eq!(s.profile, Some(Profile::Manuscript));
        assert_eq!(s.evidence.len(), 3);
        assert_eq!(s.waivers.len(), 1);
        assert!(s.terms.contains_key("BM25"));
    }

    #[test]
    fn points_at_each_problem() {
        let p = pointers(
            r#"{"version":"martial/v9","profil":"x","evidence":[{"claim":"short"},{"claim":"long enough claim","quote":"too short","source":"k"},
                {"claim":"long enough claim","within":"a","quote":"x"}],
                "waivers":[{"code":"claim_unsupported","text":"x","reason":"y"},{"code":"nope","text":"x","reason":"y"},{"code":"repetition"}]}"#,
        );
        assert_eq!(
            p,
            [
                "sidecar_invalid /profil",
                "sidecar_invalid /version",
                "sidecar_invalid /evidence/0/claim",
                "sidecar_invalid /evidence/1/quote",
                "sidecar_invalid /evidence/2",
                "waiver_not_allowed /waivers/0/code",
                "sidecar_invalid /waivers/1/code",
                "sidecar_invalid /waivers/2",
            ]
        );
    }

    #[test]
    fn rejects_non_objects_without_panicking() {
        assert_eq!(pointers("[]"), ["sidecar_invalid "]);
        assert_eq!(pointers("{"), ["sidecar_invalid "]);
    }
}
