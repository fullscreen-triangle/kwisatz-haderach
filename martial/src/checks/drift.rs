//! `drift` (with `--against OLD`): what an edit must not do. It must not introduce a
//! number or a citation without a verified quote, must not make a claim stronger, and
//! must not silently remove a number or a claim. No word of the edit is judged against
//! any other word; only these distinctions are compared.

use std::collections::{BTreeSet, HashMap, HashSet};

use super::evidence::{is_claim, strength, Index};
use super::{problem, Ctx, Out};
use crate::doc::Document;
use crate::lexicon::{MODERATE, STRONG, WEAK};
use crate::text::{content_words, jaccard, normalize, numbers, words};

const SAME_SENTENCE: f64 = 0.5;

fn sentence_numbers(doc: &Document) -> Vec<Vec<String>> {
    doc.sentences.iter().map(|s| numbers(&s.text).into_iter().map(|n| n.value).chain(s.math_numbers.iter().cloned()).collect()).collect()
}

pub fn drift(ctx: &Ctx, old: &Document, ix: &Index, out: &mut Out) {
    let doc = ctx.doc;
    out.ran("drift");
    let old_texts: HashSet<String> = old.sentences.iter().map(|s| normalize(&s.text)).collect();
    let new_texts: HashSet<String> = doc.sentences.iter().map(|s| normalize(&s.text)).collect();

    // Numbers, compared as multisets.
    let new_nums = sentence_numbers(doc);
    let old_nums = sentence_numbers(old);
    let count = |nums: &[Vec<String>]| {
        let mut m: HashMap<String, usize> = HashMap::new();
        for v in nums.iter().flatten() {
            *m.entry(v.clone()).or_default() += 1;
        }
        m
    };
    let (nc, oc) = (count(&new_nums), count(&old_nums));
    let mut values: Vec<&String> = nc.keys().chain(oc.keys()).collect::<BTreeSet<_>>().into_iter().collect();
    values.sort();
    for v in values {
        let (n, o) = (nc.get(v).copied().unwrap_or(0), oc.get(v).copied().unwrap_or(0));
        if n > o {
            let mut occ: Vec<usize> =
                (0..doc.sentences.len()).flat_map(|i| new_nums[i].iter().filter(|x| *x == v).map(move |_| i)).collect();
            // Occurrences in changed sentences are the introduced ones.
            occ.sort_by_key(|&i| old_texts.contains(&normalize(&doc.sentences[i].text)));
            for &i in occ.iter().take(n - o) {
                let s = &doc.sentences[i];
                let quoted = ix.quotes[i].iter().any(|q| q.2 == Some(true) && q.1.contains(&v.to_lowercase()));
                if !quoted {
                    out.problems.push(problem(
                        doc,
                        "number_introduced",
                        s.span,
                        s.section,
                        format!(
                            "\"{v}\" does not occur {}in the version this was edited from",
                            if o > 0 { format!("this often ({o}×) ") } else { String::new() }
                        ),
                        format!("{v}\u{0}{}", s.text),
                    ));
                }
            }
        } else if o > n {
            let mut occ: Vec<usize> =
                (0..old.sentences.len()).flat_map(|i| old_nums[i].iter().filter(|x| *x == v).map(move |_| i)).collect();
            occ.sort_by_key(|&i| new_texts.contains(&normalize(&old.sentences[i].text)));
            for &i in occ.iter().take(o - n) {
                let s = &old.sentences[i];
                out.problems.push(in_old(problem(
                    old,
                    "number_removed",
                    s.span,
                    s.section,
                    format!("\"{v}\" was in the version edited from and is gone from this one"),
                    format!("{v}\u{0}{}", s.text),
                )));
            }
        }
    }

    // Citations.
    let old_keys: HashSet<&str> = old.cites.iter().map(|c| c.key.as_str()).collect();
    let mut seen = HashSet::new();
    for c in &doc.cites {
        if old_keys.contains(c.key.as_str()) || !seen.insert(c.key.as_str()) {
            continue;
        }
        let si = doc.sentences.iter().position(|s| s.span.contains(c.span.start));
        if si.is_some_and(|i| ix.verified(i, &c.key)) {
            continue;
        }
        let why = if ctx.sources.is_some() {
            "and no verified evidence quote from it supports the sentence"
        } else {
            "and without --sources its evidence quote cannot be verified"
        };
        out.problems.push(problem(
            doc,
            "citation_introduced",
            c.span,
            c.section,
            format!("\"{}\" was not cited in the version edited from, {why}", c.key),
            c.key.clone(),
        ));
    }

    // Claims: matched to the most similar old sentence.
    let old_sets: Vec<BTreeSet<String>> = old.sentences.iter().map(|s| content_words(&s.text)).collect();
    let new_sets: Vec<BTreeSet<String>> = doc.sentences.iter().map(|s| content_words(&s.text)).collect();
    let best = |a: &BTreeSet<String>, sets: &[BTreeSet<String>]| -> Option<(usize, f64)> {
        sets.iter()
            .enumerate()
            .map(|(i, b)| (i, jaccard(a, b)))
            .filter(|x| x.1 >= SAME_SENTENCE)
            .max_by(|x, y| x.1.partial_cmp(&y.1).unwrap().then(y.0.cmp(&x.0)))
    };
    for (i, s) in doc.sentences.iter().enumerate() {
        let Some((j, _)) = best(&new_sets[i], &old_sets) else { continue };
        let o = &old.sentences[j];
        if normalize(&o.text) == normalize(&s.text) || !(is_claim(s, ctx.profile) || is_claim(o, ctx.profile)) {
            continue;
        }
        let (sn, so) = (strength(&s.text), strength(&o.text));
        if sn > so {
            out.problems.push(problem(
                doc,
                "claim_strengthened",
                s.span,
                s.section,
                format!("stronger than {}: {} (strength {so} → {sn})", old.at(o.span.start), modal_diff(&o.text, &s.text)),
                s.text.clone(),
            ));
        }
    }
    for (j, o) in old.sentences.iter().enumerate() {
        if is_claim(o, ctx.profile) && best(&old_sets[j], &new_sets).is_none() {
            out.problems.push(in_old(problem(
                old,
                "claim_removed",
                o.span,
                o.section,
                "this claim has no counterpart in the edited version".into(),
                o.text.clone(),
            )));
        }
    }
}

/// Problems located in the old version sort after those in the document.
fn in_old(mut p: super::Problem) -> super::Problem {
    p.order.0 = u32::MAX - 2;
    p.section = usize::MAX;
    p
}

/// "removed may; added proves" — the modal words that changed.
fn modal_diff(old: &str, new: &str) -> String {
    let modal = |t: &str| -> Vec<String> {
        words(t)
            .into_iter()
            .filter(|w| STRONG.contains(&w.as_str()) || MODERATE.contains(&w.as_str()) || WEAK.contains(&w.as_str()))
            .collect()
    };
    let (o, n) = (modal(old), modal(new));
    let mut on = n.clone();
    let mut removed = vec![];
    for w in &o {
        if let Some(k) = on.iter().position(|x| x == w) {
            on.remove(k);
        } else {
            removed.push(w.clone());
        }
    }
    let mut parts = vec![];
    if !removed.is_empty() {
        parts.push(format!("removed {}", removed.join(", ")));
    }
    if !on.is_empty() {
        parts.push(format!("added {}", on.join(", ")));
    }
    if parts.is_empty() {
        "modal strength rose".into()
    } else {
        parts.join("; ")
    }
}
