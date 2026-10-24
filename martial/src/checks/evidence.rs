//! `evidence.support`: every claim points at its support — a citation, a link, or a
//! reference to where the document shows it. `evidence.quotes`: with a sources
//! directory, every cited claim carries a sidecar quote that occurs verbatim in the
//! cited source. A model's assertion that a source supports a sentence is never enough;
//! the quote has to be found.

use std::cell::RefCell;
use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};

use super::{problem, sidecar_problem, Ctx, Declared, Out};
use crate::doc::{EnvClass, Kind, Sentence};
use crate::lexicon::{
    CHANGE_WORDS, CLAIM_PHRASES, CLAIM_VERBS_MANUSCRIPT, CLAIM_VERBS_SOFTWARE, COMPARATIVES, MODERATE, NEGATIONS, STRONG, WEAK,
};
use crate::profile::Profile;
use crate::sidecar::Support;
use crate::text::{content_words, has_phrase, normalize, numbers, spaced, words};

/// Source texts, one file per citation key: `<key>.txt`, `.md`, `.tex` or `.text`.
pub struct Sources {
    pub dir: PathBuf,
    files: HashMap<String, PathBuf>,
    cache: RefCell<HashMap<String, Option<String>>>,
}

impl Sources {
    pub fn open(dir: &Path) -> Result<Sources, String> {
        let entries = std::fs::read_dir(dir).map_err(|e| format!("cannot read sources directory {}: {e}", crate::display_path(dir)))?;
        let mut files = HashMap::new();
        for e in entries.flatten() {
            let p = e.path();
            let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();
            if !matches!(ext.as_str(), "txt" | "md" | "tex" | "text") {
                continue;
            }
            if let Some(stem) = p.file_stem().and_then(|s| s.to_str()) {
                files.insert(stem.to_string(), p.clone());
            }
        }
        Ok(Sources { dir: dir.to_path_buf(), files, cache: RefCell::new(HashMap::new()) })
    }

    fn path(&self, key: &str) -> Option<&PathBuf> {
        self.files.get(key).or_else(|| self.files.get(&key.replace([':', '/', '\\'], "_")))
    }

    pub fn has(&self, key: &str) -> bool {
        self.path(key).is_some()
    }

    /// The normalised text of the source for `key`.
    pub fn text(&self, key: &str) -> Option<String> {
        if let Some(t) = self.cache.borrow().get(key) {
            return t.clone();
        }
        let t = self.path(key).and_then(|p| std::fs::read_to_string(p).ok()).map(|t| normalize(&t));
        self.cache.borrow_mut().insert(key.to_string(), t.clone());
        t
    }
}

/// Whether a sentence asserts something that needs support.
pub fn is_claim(s: &Sentence, profile: Profile) -> bool {
    if matches!(s.env, EnvClass::Statement | EnvClass::Proof | EnvClass::Definition | EnvClass::Quote | EnvClass::Example)
        || s.kind == Kind::Caption
    {
        return false;
    }
    if s.text.trim_end().ends_with('?') {
        return false;
    }
    let w = words(&s.text);
    if w.is_empty() {
        return false;
    }
    let verbs = if profile == Profile::SoftwareDoc { CLAIM_VERBS_SOFTWARE } else { CLAIM_VERBS_MANUSCRIPT };
    // A sentence that starts with the verb is an instruction ("Show the ..."), and a
    // negated verb is a denial ("is not established"); neither is a claim.
    let negated = |k: usize| (k.saturating_sub(2)..k).any(|j| NEGATIONS.contains(&w[j].as_str()));
    if (1..w.len()).any(|k| verbs.contains(&w[k].as_str()) && !negated(k)) {
        return true;
    }
    let sp = spaced(&s.text);
    if CLAIM_PHRASES.iter().any(|p| has_phrase(&sp, p)) {
        return true;
    }
    let nums = numbers(&s.text);
    if nums.is_empty() {
        return false;
    }
    COMPARATIVES.iter().any(|c| w.iter().any(|x| x == c))
        || multiplier(&s.text)
        || (nums.iter().any(|n| n.value.ends_with('%')) && CHANGE_WORDS.iter().any(|c| w.iter().any(|x| x == c)))
}

/// A `×` used as a multiplier ("3× faster"), not as a dimension ("256×256").
fn multiplier(text: &str) -> bool {
    let cs: Vec<char> = text.chars().collect();
    cs.iter().enumerate().any(|(k, &c)| c == '×' && !cs[k + 1..].iter().find(|c| !c.is_whitespace()).is_some_and(|n| n.is_ascii_digit()))
}

/// Modal strength: closing words +2, asserting words +1, hedges −1.
pub fn strength(text: &str) -> i32 {
    words(text)
        .iter()
        .map(|w| {
            let w = w.as_str();
            if STRONG.contains(&w) {
                2
            } else if MODERATE.contains(&w) {
                1
            } else if WEAK.contains(&w) {
                -1
            } else {
                0
            }
        })
        .sum()
}

fn strong_word(text: &str) -> Option<String> {
    words(text).into_iter().find(|w| STRONG.contains(&w.as_str()) && !matches!(w.as_str(), "always" | "never" | "must"))
}

const REF_NOUNS: &[&str] = &[
    "figure",
    "fig",
    "figs",
    "table",
    "tab",
    "section",
    "sec",
    "theorem",
    "thm",
    "lemma",
    "proposition",
    "corollary",
    "equation",
    "eq",
    "eqs",
    "appendix",
    "algorithm",
    "listing",
    "chapter",
];

/// Whether the sentence points into the document: a `\ref`, an internal link, or
/// "Figure 3", "Table 2", "Section 4", "Theorem 1", "Eq. (3)".
pub fn internal(s: &Sentence) -> bool {
    if !s.refs.is_empty() {
        return true;
    }
    let w = words(&s.text);
    w.windows(2).any(|p| {
        REF_NOUNS.contains(&p[0].as_str())
            && p[1].chars().next().is_some_and(|c| c.is_ascii_digit() || (p[1].len() == 1 && c.is_ascii_alphabetic()))
    })
}

/// Per sentence: the sidecar's quotes for it (source key, normalised quote, verified),
/// whether a `within` entry points it into the document, and a `not_a_claim` reason.
#[derive(Default)]
pub struct Index {
    pub quotes: Vec<Vec<(String, String, Option<bool>)>>,
    pub within: Vec<bool>,
    pub declared: Vec<Option<String>>,
}

impl Index {
    pub fn verified(&self, i: usize, key: &str) -> bool {
        self.quotes[i].iter().any(|q| q.0 == key && q.2 == Some(true))
    }
}

/// Matches sidecar evidence entries to sentences and verifies their quotes.
pub fn index(ctx: &Ctx, out: &mut Out) -> Index {
    let doc = ctx.doc;
    let n = doc.sentences.len();
    let mut ix = Index { quotes: vec![vec![]; n], within: vec![false; n], declared: vec![None; n] };
    if ctx.sidecar.evidence.is_empty() {
        return ix;
    }
    let raws: Vec<(String, String)> = doc.sentences.iter().map(|s| (normalize(&s.raw), normalize(&s.text))).collect();
    let labels: Vec<&str> = doc.labels.iter().map(|l| l.name.as_str()).chain(doc.anchors.iter().map(|a| a.0.as_str())).collect();
    for e in &ctx.sidecar.evidence {
        let at = format!("/evidence/{}", e.index);
        let want = normalize(&e.claim);
        let hits: Vec<usize> = (0..n).filter(|&i| raws[i].0.contains(&want) || raws[i].1.contains(&want)).collect();
        let i = match hits.as_slice() {
            [] => {
                out.problems.push(sidecar_problem(
                    ctx.sidecar,
                    "evidence_orphan",
                    &format!("{at}/claim"),
                    "no sentence contains this text".into(),
                    e.claim.clone(),
                ));
                continue;
            }
            [i] => *i,
            many => {
                let ats: Vec<String> = many.iter().take(4).map(|&i| doc.at(doc.sentences[i].span.start)).collect();
                out.problems.push(sidecar_problem(
                    ctx.sidecar,
                    "evidence_ambiguous",
                    &format!("{at}/claim"),
                    format!("{} sentences contain this text: {}", many.len(), ats.join(", ")),
                    e.claim.clone(),
                ));
                continue;
            }
        };
        let s = &doc.sentences[i];
        match &e.support {
            Support::Quote { source, quote } => {
                let q = normalize(quote);
                let verified = ctx.sources.map(|src| match src.text(source) {
                    Some(t) => t.contains(&q),
                    None => false,
                });
                if let Some(src) = ctx.sources {
                    if !src.has(source) {
                        out.problems.push(sidecar_problem(
                            ctx.sidecar,
                            "source_missing",
                            &format!("{at}/source"),
                            format!("no source text for \"{source}\" in {}", crate::display_path(&src.dir)),
                            source.clone(),
                        ));
                    } else if verified == Some(false) {
                        out.problems.push(sidecar_problem(
                            ctx.sidecar,
                            "quote_not_found",
                            &format!("{at}/quote"),
                            format!("the quote does not occur in the source text of \"{source}\""),
                            quote.clone(),
                        ));
                    }
                }
                if !s.cites.contains(source) && s.links.is_empty() {
                    out.problems.push(problem(
                        doc,
                        "evidence_key_not_cited",
                        s.span,
                        s.section,
                        format!("the sidecar supports this sentence with \"{source}\", which the sentence does not cite"),
                        s.text.clone(),
                    ));
                }
                ix.quotes[i].push((source.clone(), q, verified));
            }
            Support::Within(t) => {
                let t = t.trim_start_matches('#');
                if labels.contains(&t) {
                    ix.within[i] = true;
                } else {
                    out.problems.push(sidecar_problem(
                        ctx.sidecar,
                        "evidence_target_missing",
                        &format!("{at}/within"),
                        format!("\"{t}\" is not a label or heading anchor of the document"),
                        t.to_string(),
                    ));
                }
            }
            Support::NotAClaim(reason) => {
                if let Some(w) = strong_word(&s.text) {
                    out.problems.push(problem(
                        doc,
                        "declaration_refused",
                        s.span,
                        s.section,
                        format!("the sentence says \"{w}\"; it is a claim and needs support"),
                        s.text.clone(),
                    ));
                } else {
                    ix.declared[i] = Some(reason.clone());
                    out.declared.push(Declared {
                        at: doc.at(s.span.start),
                        sentence: crate::doc::truncate(&s.text, 160),
                        reason: reason.clone(),
                    });
                }
            }
        }
    }
    ix
}

pub fn evidence(ctx: &Ctx, ix: &Index, out: &mut Out) {
    let doc = ctx.doc;
    let support = ctx.profile.runs("evidence.support");
    let quotes_run = ctx.profile.runs("evidence.quotes");
    let quotes_required = ctx.profile.required().contains(&"evidence.quotes");
    if support {
        out.ran("evidence.support");
    }
    let mut cited_claims = 0;
    let body: Vec<(usize, BTreeSet<String>)> =
        doc.sentences.iter().enumerate().filter(|(_, s)| s.env != EnvClass::Abstract).map(|(i, s)| (i, content_words(&s.text))).collect();
    for (i, s) in doc.sentences.iter().enumerate() {
        if ix.declared[i].is_some() || !is_claim(s, ctx.profile) {
            continue;
        }
        if s.env == EnvClass::Abstract {
            if !support {
                continue;
            }
            let a = content_words(&s.text);
            let found = a.len() < 3 || body.iter().any(|(_, b)| a.intersection(b).count() * 2 >= a.len());
            if !found && s.cites.is_empty() {
                out.problems.push(problem(
                    doc,
                    "abstract_claim_not_in_body",
                    s.span,
                    s.section,
                    "no sentence of the body states this claim".into(),
                    s.text.clone(),
                ));
            }
            continue;
        }
        if !s.cites.is_empty() {
            cited_claims += 1;
            if quotes_run {
                if let Some(src) = ctx.sources {
                    if !s.cites.iter().any(|k| ix.verified(i, k)) {
                        let keys: Vec<&str> = s.cites.iter().filter(|k| !k.starts_with('^')).map(String::as_str).collect();
                        if keys.is_empty() {
                            continue;
                        }
                        if keys.iter().all(|k| !src.has(k)) {
                            out.problems.push(problem(
                                doc,
                                "source_missing",
                                s.span,
                                s.section,
                                format!("no source text for {} in {}", keys.join(", "), crate::display_path(&src.dir)),
                                s.text.clone(),
                            ));
                        } else if !ix.quotes[i].iter().any(|q| q.2 == Some(false)) {
                            out.problems.push(problem(
                                doc,
                                "claim_unverified",
                                s.span,
                                s.section,
                                format!("cites {} but the sidecar quotes no passage that supports it", keys.join(", ")),
                                s.text.clone(),
                            ));
                        }
                    }
                }
            }
            continue;
        }
        if !support {
            continue;
        }
        if internal(s) || ix.within[i] || !s.links.is_empty() || !ix.quotes[i].is_empty() {
            continue;
        }
        out.problems.push(problem(
            doc,
            "claim_unsupported",
            s.span,
            s.section,
            "a claim with no citation, link or reference to where it is shown".into(),
            s.text.clone(),
        ));
    }
    if quotes_run {
        let has_quotes = ix.quotes.iter().any(|q| !q.is_empty());
        if ctx.sources.is_some() {
            out.ran("evidence.quotes");
        } else if cited_claims == 0 && !has_quotes {
            if quotes_required {
                out.ran("evidence.quotes");
            }
        } else if quotes_required {
            out.skipped("evidence.quotes", format!("{cited_claims} cited claim(s) not verified: pass --sources DIR (one <key>.txt per cited source) or set \"sources\" in the sidecar"));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::doc::{Pos, Span};

    fn s(text: &str) -> Sentence {
        Sentence {
            text: text.into(),
            raw: text.into(),
            span: Span::at(Pos::default()),
            section: 0,
            env: EnvClass::None,
            kind: Kind::Prose,
            cites: vec![],
            refs: vec![],
            links: vec![],
            math_numbers: vec![],
        }
    }

    #[test]
    fn claims() {
        let m = Profile::Manuscript;
        assert!(is_claim(&s("We show that the bound is tight."), m));
        assert!(is_claim(&s("The cache is 3x faster than the baseline."), m));
        assert!(is_claim(&s("Latency drops by 40% with batching."), m));
        assert!(is_claim(&s("This approach is the state of the art."), m));
        assert!(!is_claim(&s("Show the status of the run."), m));
        assert!(!is_claim(&s("Does it hold?"), m));
        assert!(!is_claim(&s("The parser reads two files."), m));
        assert!(!is_claim(&s("Control of the rate might lower it; this is not established here."), m));
        assert!(!is_claim(&s("Recomputing it does not give this guarantee."), m));
        assert!(!is_claim(&s("Measured on a 256×256 grid with 10 rows:"), m));
        assert!(is_claim(&s("It is 3× faster than before."), m));
        let d = Profile::SoftwareDoc;
        assert!(!is_claim(&s("The command shows the status."), d));
        assert!(is_claim(&s("The store guarantees atomic writes."), d));
    }

    #[test]
    fn strength_orders_hedged_below_asserted_below_proved() {
        assert!(strength("The method may reduce latency.") < strength("The method reduces latency."));
        assert!(strength("We show the bound.") < strength("We prove the bound."));
    }

    #[test]
    fn internal_references() {
        assert!(internal(&s("As Table 2 shows, it holds.")));
        assert!(internal(&s("See Section 4 for the proof.")));
        assert!(!internal(&s("The table shows it.")));
    }
}
