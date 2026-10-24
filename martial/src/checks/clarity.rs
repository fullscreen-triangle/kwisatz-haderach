//! `clarity`: sentence-level rules an edit can satisfy without changing what is claimed.

use std::collections::{BTreeSet, HashMap, HashSet};

use super::{problem, Ctx, Out};
use crate::doc::{EnvClass, Sentence};
use crate::lexicon::{BARE_VERBS, COMMON_ACRONYMS, DEMONSTRATIVES, HEDGES, OBVIOUS, SIGNIFICANCE, STATISTICS};
use crate::profile::Profile;
use crate::text::{content_words, has_phrase, jaccard, spaced, word_count, words};

const HEDGE_WINDOW: usize = 3;
const REPEAT_MIN_WORDS: usize = 6;
const REPEAT_JACCARD: f64 = 0.75;

pub fn clarity(ctx: &Ctx, out: &mut Out) {
    let doc = ctx.doc;
    out.ran("clarity");
    let max = ctx.profile.max_words();
    for s in doc.sentences.iter().filter(|s| s.env != EnvClass::Quote) {
        let n = word_count(&s.text);
        if n > max {
            out.problems.push(problem(
                doc,
                "sentence_too_long",
                s.span,
                s.section,
                format!("{n} words; the {} profile allows {max}", ctx.profile.name()),
                s.text.clone(),
            ));
        }
        let w = words(&s.text);
        // Stacked hedges qualify the same word: "may possibly", "could potentially suggest".
        let hedges: Vec<usize> = (0..w.len()).filter(|&k| HEDGES.contains(&w[k].as_str())).collect();
        if let Some(pair) = hedges.windows(2).find(|p| p[1] - p[0] <= HEDGE_WINDOW && w[p[0]] != w[p[1]]) {
            let phrase = w[pair[0]..=pair[1]].join(" ");
            out.problems.push(problem(doc, "hedge_stack", s.span, s.section, format!("\"{phrase}\" hedges twice"), s.text.clone()));
        }
        if let (Some(a), Some(b)) = (w.first(), w.get(1)) {
            if DEMONSTRATIVES.contains(&a.as_str()) && BARE_VERBS.contains(&b.as_str()) && !(a == "that" && b == "is") {
                let first = s.text.split_whitespace().next().unwrap_or("This");
                out.problems.push(problem(
                    doc,
                    "reference_ambiguous",
                    s.span,
                    s.section,
                    format!("\"{first} {b}\": the sentence does not say what \"{}\" refers to", first.to_lowercase()),
                    s.text.clone(),
                ));
            }
        }
        let sp = spaced(&s.text);
        if let Some(o) = OBVIOUS.iter().find(|o| has_phrase(&sp, o)) {
            out.problems.push(problem(
                doc,
                "obviousness_claim",
                s.span,
                s.section,
                format!("\"{o}\" asks the reader to accept a step without giving it"),
                s.text.clone(),
            ));
        }
        if ctx.profile == Profile::Manuscript
            && w.iter().any(|x| SIGNIFICANCE.contains(&x.as_str()))
            && s.cites.is_empty()
            && s.refs.is_empty()
        {
            let raw = format!(" {} ", s.raw.to_lowercase());
            if !STATISTICS.iter().any(|t| raw.contains(t)) {
                out.problems.push(problem(
                    doc,
                    "significance_without_test",
                    s.span,
                    s.section,
                    "\"significant\" without a test, a p-value, or a reference to where they are given".into(),
                    s.text.clone(),
                ));
            }
        }
    }
    acronyms(ctx, out);
    repetition(ctx, out);
}

/// The acronym `t` names, if it is one: capitals and digits (an `s` plural allowed), at
/// least two capitals, not a Roman numeral. Hyphenated compounds (`DCAT-AP`, `SHA-256`)
/// are one name.
fn acronym(t: &str) -> Option<String> {
    let mut parts: Vec<&str> = t.split('-').collect();
    if parts.iter().any(|p| p.is_empty()) {
        return None;
    }
    // A numbered instance names its prefix: IC-12 and SHA-256 are IC and SHA.
    while parts.len() > 1 && parts[parts.len() - 1].chars().all(|c| c.is_ascii_digit()) {
        parts.pop();
    }
    let caps = |p: &str| p.chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit());
    let last = parts.len() - 1;
    let mut core = vec![];
    for (i, p) in parts.iter().enumerate() {
        let p = if i == last { p.strip_suffix('s').filter(|c| c.len() >= 2 && caps(c)).unwrap_or(p) } else { p };
        if !caps(p) {
            return None;
        }
        core.push(p);
    }
    let core = core.join("-");
    if !core.starts_with(|c: char| c.is_ascii_uppercase()) || core.chars().filter(|c| c.is_ascii_uppercase()).count() < 2 {
        return None;
    }
    if parts.len() == 1 && (core.chars().count() > 8 || roman(&core)) {
        return None;
    }
    Some(core)
}

/// A Roman numeral from II to XXXIX, as used for numbering (Part III, Type II).
fn roman(s: &str) -> bool {
    const TENS: [&str; 4] = ["", "X", "XX", "XXX"];
    const ONES: [&str; 10] = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
    (2..40).any(|n| format!("{}{}", TENS[n / 10], ONES[n % 10]) == s)
}

/// Tokens of the sentence outside inline code: runs of letters and digits, joined by
/// single hyphens.
fn raw_tokens(text: &str) -> Vec<String> {
    let cs: Vec<char> = text.chars().collect();
    let mut out = vec![];
    let mut cur = String::new();
    let mut in_code = false;
    for (k, &c) in cs.iter().enumerate() {
        if c == '`' {
            in_code = !in_code;
            if !cur.is_empty() {
                out.push(std::mem::take(&mut cur));
            }
            continue;
        }
        let joins = c == '-' && !cur.is_empty() && cs.get(k + 1).is_some_and(|n| n.is_alphanumeric());
        if !in_code && (c.is_alphanumeric() || joins) {
            cur.push(c);
        } else if !cur.is_empty() {
            out.push(std::mem::take(&mut cur));
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

fn shouting(s: &Sentence) -> bool {
    let toks: Vec<String> = raw_tokens(&s.text).into_iter().filter(|t| t.chars().any(|c| c.is_alphabetic())).collect();
    toks.len() >= 3 && toks.iter().filter(|t| t.chars().all(|c| !c.is_lowercase())).count() * 2 > toks.len()
}

fn acronyms(ctx: &Ctx, out: &mut Out) {
    let doc = ctx.doc;
    // Where each acronym is defined: "(ABC)" anywhere, or "ABC (" followed by its expansion.
    let mut defined: HashMap<String, usize> = HashMap::new();
    for (i, s) in doc.sentences.iter().enumerate() {
        for t in raw_tokens(&s.text) {
            let Some(a) = acronym(&t) else { continue };
            if s.text.contains(&format!("({t})")) || s.text.contains(&format!("({a})")) || s.text.contains(&format!("{t} (")) {
                defined.entry(a).or_insert(i);
            }
        }
    }
    let known: HashSet<&str> = COMMON_ACRONYMS
        .iter()
        .copied()
        .chain(doc.acronyms.iter().map(String::as_str))
        .chain(ctx.sidecar.terms.keys().map(String::as_str))
        .collect();
    // A compound is known when each of its named parts is known or already defined.
    let settled = |a: &str, i: usize| -> bool {
        let one = |p: &str| known.contains(p) || defined.get(p).is_some_and(|&d| d <= i);
        one(a) || (a.contains('-') && a.split('-').all(|p| p.chars().filter(|c| c.is_ascii_uppercase()).count() < 2 || one(p)))
    };
    let mut seen: HashSet<String> = HashSet::new();
    for (i, s) in doc.sentences.iter().enumerate() {
        if shouting(s) || s.env == EnvClass::Quote {
            continue;
        }
        for t in raw_tokens(&s.text) {
            let Some(a) = acronym(&t) else { continue };
            if known.contains(t.as_str()) || settled(&a, i) || !seen.insert(a.clone()) {
                continue;
            }
            match defined.get(&a) {
                Some(&d) => {
                    let at = doc.at(doc.sentences[d].span.start);
                    out.problems.push(problem(
                        doc,
                        "undefined_acronym",
                        s.span,
                        s.section,
                        format!("{a} is used here but expanded only later, at {at}; move the expansion to first use"),
                        a.clone(),
                    ));
                }
                None => {
                    out.problems.push(problem(doc, "undefined_acronym", s.span, s.section, format!("{a} is never expanded"), a.clone()))
                }
            }
        }
    }
}

fn repetition(ctx: &Ctx, out: &mut Out) {
    let doc = ctx.doc;
    let sets: Vec<BTreeSet<String>> = doc.sentences.iter().map(|s| content_words(&s.text)).collect();
    for j in 0..doc.sentences.len() {
        if sets[j].len() < REPEAT_MIN_WORDS {
            continue;
        }
        let sj = &doc.sentences[j];
        let earlier = (0..j).find(|&i| {
            let si = &doc.sentences[i];
            si.section == sj.section
                && si.env == sj.env
                && sets[i].len() >= REPEAT_MIN_WORDS
                && jaccard(&sets[i], &sets[j]) >= REPEAT_JACCARD
        });
        if let Some(i) = earlier {
            let at = doc.at(doc.sentences[i].span.start);
            out.problems.push(problem(
                doc,
                "repetition",
                sj.span,
                sj.section,
                format!("says what the sentence at {at} already says"),
                sj.text.clone(),
            ));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::acronym;

    #[test]
    fn acronym_shapes() {
        assert_eq!(acronym("MCP").as_deref(), Some("MCP"));
        assert_eq!(acronym("APIs").as_deref(), Some("API"));
        assert_eq!(acronym("SHA256").as_deref(), Some("SHA256"));
        assert_eq!(acronym("DCAT-AP").as_deref(), Some("DCAT-AP"));
        assert_eq!(acronym("SHA-256").as_deref(), Some("SHA"));
        assert_eq!(acronym("IC-12").as_deref(), Some("IC"));
        assert_eq!(acronym("StatDCAT-AP"), None);
        assert_eq!(acronym("III"), None);
        assert_eq!(acronym("A"), None);
        assert_eq!(acronym("GHz"), None);
        assert_eq!(acronym("Profile"), None);
    }
}
