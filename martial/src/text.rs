//! Text helpers shared by the checks: words, content words, numbers, normalisation.

use std::collections::BTreeSet;

use crate::lexicon::STOPWORDS;

/// Lower-cased alphanumeric words, split on everything else. Text inside backticks
/// (inline code) is dropped.
pub fn words(text: &str) -> Vec<String> {
    let mut out = vec![];
    let mut cur = String::new();
    let mut in_code = false;
    for c in text.chars() {
        if c == '`' {
            in_code = !in_code;
            if !cur.is_empty() {
                out.push(std::mem::take(&mut cur));
            }
            continue;
        }
        if in_code {
            continue;
        }
        if c.is_alphanumeric() {
            cur.extend(c.to_lowercase());
        } else if !cur.is_empty() {
            out.push(std::mem::take(&mut cur));
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

/// `words` joined with single spaces and padded, so `has_phrase` can match whole words.
pub fn spaced(text: &str) -> String {
    format!(" {} ", words(text).join(" "))
}

pub fn has_phrase(spaced: &str, phrase: &str) -> bool {
    spaced.contains(&format!(" {phrase} "))
}

/// The words that carry content: no stopwords, at least three letters, a crude plural
/// strip. Two sentences with the same content words say the same thing.
pub fn content_words(text: &str) -> BTreeSet<String> {
    words(text)
        .into_iter()
        .filter(|w| w.chars().count() >= 3 && !STOPWORDS.contains(&w.as_str()) && !w.chars().all(|c| c.is_ascii_digit()))
        .map(|w| if w.len() > 4 && w.ends_with('s') && !w.ends_with("ss") { w[..w.len() - 1].to_string() } else { w })
        .collect()
}

pub fn jaccard(a: &BTreeSet<String>, b: &BTreeSet<String>) -> f64 {
    if a.is_empty() && b.is_empty() {
        return 0.0;
    }
    let i = a.intersection(b).count() as f64;
    let u = a.union(b).count() as f64;
    i / u
}

/// Whitespace-separated tokens that contain a letter, digit or the math placeholder.
pub fn word_count(text: &str) -> usize {
    text.split_whitespace().filter(|t| t.chars().any(|c| c.is_alphanumeric() || c == '∗')).count()
}

/// Normalisation for verbatim matching: case, quotes, dashes, soft hyphens, line-break
/// hyphenation and whitespace are not distinctions a quote should fail on.
pub fn normalize(s: &str) -> String {
    let s = s.replace("-\r\n", "").replace("-\n", "");
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '\u{00ad}' => {}
            '‘' | '’' | '`' => out.push('\''),
            '“' | '”' => out.push('"'),
            '–' | '—' | '−' => out.push('-'),
            c => out.extend(c.to_lowercase()),
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Number {
    pub value: String,
    /// Character offset in the text.
    pub at: usize,
}

const REF_WORDS: &[&str] = &[
    "figure",
    "fig",
    "figs",
    "table",
    "tab",
    "section",
    "sec",
    "secs",
    "eq",
    "eqs",
    "equation",
    "equations",
    "theorem",
    "thm",
    "lemma",
    "proposition",
    "corollary",
    "definition",
    "step",
    "chapter",
    "appendix",
    "line",
    "lines",
    "page",
    "p",
    "pp",
    "version",
    "v",
    "stage",
    "phase",
    "part",
    "item",
    "case",
    "row",
    "column",
    "col",
    "ref",
    "refs",
    "algorithm",
    "listing",
    "example",
    "remark",
    "no",
    "number",
];

/// Numbers in prose: digits with internal `.`/`,` groups, an optional exponent and `%`.
/// Numbers glued to letters (`x2`, `sha256`), inside backticks, or naming a figure,
/// table, section, version and so on are not quantities and are skipped.
pub fn numbers(text: &str) -> Vec<Number> {
    let cs: Vec<char> = text.chars().collect();
    let mut out = vec![];
    let mut in_code = false;
    let mut i = 0;
    while i < cs.len() {
        let c = cs[i];
        if c == '`' {
            in_code = !in_code;
            i += 1;
            continue;
        }
        if in_code || !c.is_ascii_digit() {
            i += 1;
            continue;
        }
        if i > 0 && (cs[i - 1].is_alphabetic() || cs[i - 1] == '_') {
            while i < cs.len() && (cs[i].is_alphanumeric() || cs[i] == '_') {
                i += 1;
            }
            continue;
        }
        let start = i;
        while i < cs.len() && (cs[i].is_ascii_digit() || ((cs[i] == '.' || cs[i] == ',') && i + 1 < cs.len() && cs[i + 1].is_ascii_digit()))
        {
            i += 1;
        }
        if i + 1 < cs.len()
            && (cs[i] == 'e' || cs[i] == 'E')
            && (cs[i + 1].is_ascii_digit() || ((cs[i + 1] == '-' || cs[i + 1] == '+') && i + 2 < cs.len() && cs[i + 2].is_ascii_digit()))
        {
            i += 2;
            while i < cs.len() && cs[i].is_ascii_digit() {
                i += 1;
            }
        }
        let glued = i < cs.len() && (cs[i].is_alphabetic() || cs[i] == '_') && !matches!(cs[i], 'x' | '×');
        let mut value: String = cs[start..i].iter().collect();
        if i < cs.len() && cs[i] == '%' {
            value.push('%');
            i += 1;
        }
        if glued {
            continue;
        }
        let before: String = cs[..start].iter().collect();
        let prev = before
            .trim_end_matches(|c: char| c.is_whitespace() || c == '~' || c == '.' || c == '(')
            .rsplit(|c: char| !c.is_alphanumeric())
            .next()
            .unwrap_or("")
            .to_lowercase();
        if REF_WORDS.contains(&prev.as_str()) {
            continue;
        }
        out.push(Number { value, at: start });
    }
    out
}

/// Levenshtein distance, for "did you mean" suggestions.
pub fn edit_distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    for i in 1..=a.len() {
        let mut cur = vec![i; b.len() + 1];
        for j in 1..=b.len() {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            cur[j] = (prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + cost);
        }
        prev = cur;
    }
    prev[b.len()]
}

/// The closest candidate within two edits, if exactly one is closest.
pub fn nearest<'a>(word: &str, candidates: impl IntoIterator<Item = &'a str>) -> Option<&'a str> {
    let mut best: Option<(usize, &str)> = None;
    let mut tie = false;
    for c in candidates {
        let d = edit_distance(word, c);
        if d == 0 || d > 2 {
            continue;
        }
        match best {
            Some((bd, _)) if d > bd => {}
            Some((bd, _)) if d == bd => tie = true,
            _ => {
                best = Some((d, c));
                tie = false;
            }
        }
    }
    if tie {
        None
    } else {
        best.map(|b| b.1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn words_drop_inline_code() {
        assert_eq!(words("Run `cargo test` now, OK?"), ["run", "now", "ok"]);
    }

    #[test]
    fn numbers_skip_references_identifiers_and_code() {
        let n: Vec<_> = numbers("Table 2 shows 40% less memory, 3.5 s and 1e-3 error over sha256 and `v2 7`; see Fig. 4.")
            .into_iter()
            .map(|n| n.value)
            .collect();
        assert_eq!(n, ["40%", "3.5", "1e-3"]);
    }

    #[test]
    fn numbers_keep_multipliers() {
        let n: Vec<_> = numbers("about 10x faster and 3× smaller").into_iter().map(|n| n.value).collect();
        assert_eq!(n, ["10", "3"]);
    }

    #[test]
    fn normalize_ignores_layout() {
        assert_eq!(normalize("The  “bound”\nis tight — hyphen-\nated"), "the \"bound\" is tight - hyphenated");
    }

    #[test]
    fn content_words_and_jaccard() {
        let a = content_words("The method reduces the latency of queries.");
        let b = content_words("Queries see reduced latency with the method.");
        assert!(a.contains("method") && a.contains("querie"));
        assert!(jaccard(&a, &b) > 0.3);
    }

    #[test]
    fn nearest_is_unique_and_close() {
        assert_eq!(nearest("smith2020", ["smith2021", "jones1999"]), Some("smith2021"));
        assert_eq!(nearest("abc", ["abd", "abe"]), None);
        assert_eq!(nearest("abc", ["xyzzy"]), None);
    }
}
