//! The document model both readers produce: sentences with source spans, and the
//! structural facts (sections, labels, references, citations, links, code) the checks
//! read. Readers emit a stream of characters, each tagged with its source position, and
//! paragraph breaks; `Builder::finish` cuts the stream into sentences.

use std::path::{Path, PathBuf};

/// A source position. `line` and `col` are 1-based; `col` counts characters.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Pos {
    pub file: u16,
    pub line: u32,
    pub col: u32,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Span {
    pub start: Pos,
    pub end: Pos,
}

impl Span {
    pub fn at(p: Pos) -> Span {
        Span { start: p, end: p }
    }
    pub fn contains(&self, p: Pos) -> bool {
        self.start <= p && p <= self.end
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Format {
    Markdown,
    Latex,
}

impl Format {
    pub fn from_path(p: &Path) -> Format {
        match p.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()) {
            Some(e) if e == "tex" || e == "ltx" => Format::Latex,
            _ => Format::Markdown,
        }
    }
    pub fn parse(s: &str) -> Option<Format> {
        match s {
            "md" | "markdown" => Some(Format::Markdown),
            "tex" | "latex" => Some(Format::Latex),
            _ => None,
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Format::Markdown => "markdown",
            Format::Latex => "latex",
        }
    }
}

/// What kind of block a sentence came from.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Prose,
    Item,
    Caption,
}

/// The enclosing environment, reduced to the distinctions the checks draw.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnvClass {
    None,
    Abstract,
    /// theorem, lemma, proposition, corollary, ...: a statement whose support is its proof.
    Statement,
    Proof,
    Definition,
    /// Quoted text is someone else's prose.
    Quote,
    Example,
    Float,
}

pub fn env_class(name: &str) -> EnvClass {
    let n = name.trim_end_matches('*').to_ascii_lowercase();
    let starts = |p: &[&str]| p.iter().any(|s| n.starts_with(s));
    if n == "abstract" {
        EnvClass::Abstract
    } else if n == "proof" {
        EnvClass::Proof
    } else if starts(&["def"]) {
        EnvClass::Definition
    } else if starts(&["thm", "theor", "lem", "prop", "cor", "conj", "axiom", "postulate", "principle", "law"]) {
        EnvClass::Statement
    } else if starts(&["quot", "verse", "epigraph"]) {
        EnvClass::Quote
    } else if starts(&["example", "exmp", "ex"]) && n.len() <= 8 {
        EnvClass::Example
    } else if starts(&["figure", "table", "wrapfigure", "subfigure", "algorithm", "listing"]) {
        EnvClass::Float
    } else {
        EnvClass::None
    }
}

#[derive(Clone, Debug)]
pub struct Sentence {
    /// Cleaned text: markup removed, citations as `†`, references as `§`, math as `∗`.
    pub text: String,
    /// The source text the sentence spans, whitespace collapsed.
    pub raw: String,
    pub span: Span,
    pub section: usize,
    pub env: EnvClass,
    pub kind: Kind,
    pub cites: Vec<String>,
    pub refs: Vec<String>,
    pub links: Vec<String>,
    /// Numbers inside math the sentence contains (the cleaned text shows math as `∗`).
    pub math_numbers: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct Section {
    pub title: String,
    pub level: u8,
    pub span: Span,
}

#[derive(Clone, Debug)]
pub struct Label {
    pub name: String,
    pub span: Span,
    pub section: usize,
}

#[derive(Clone, Debug)]
pub struct RefUse {
    pub target: String,
    pub span: Span,
    pub section: usize,
}

#[derive(Clone, Debug)]
pub struct Cite {
    pub key: String,
    pub span: Span,
    pub section: usize,
}

#[derive(Clone, Debug)]
pub struct CodeSpan {
    pub text: String,
    pub span: Span,
    pub section: usize,
}

#[derive(Clone, Debug)]
pub struct CodeBlock {
    pub lang: String,
    pub lines: Vec<(String, Pos)>,
    pub section: usize,
}

#[derive(Clone, Debug)]
pub struct Link {
    pub target: String,
    pub span: Span,
    pub section: usize,
}

#[derive(Clone, Debug)]
pub struct Document {
    pub format: Format,
    /// Display name per file; file 0 is the document itself, others are `\input` files.
    pub names: Vec<String>,
    pub paths: Vec<PathBuf>,
    pub lines: Vec<Vec<String>>,
    /// Directory relative links and `\input` paths resolve against.
    pub base_dir: PathBuf,
    pub sentences: Vec<Sentence>,
    /// Section 0 is the text before the first heading.
    pub sections: Vec<Section>,
    pub labels: Vec<Label>,
    pub refs: Vec<RefUse>,
    pub cites: Vec<Cite>,
    pub code_spans: Vec<CodeSpan>,
    pub code_blocks: Vec<CodeBlock>,
    pub links: Vec<Link>,
    /// Markdown heading anchors (GitHub slugs), with the section each names.
    pub anchors: Vec<(String, usize)>,
    pub bib_files: Vec<String>,
    /// Keys defined in the document itself (`\bibitem`, Markdown footnote definitions).
    pub bib_items: Vec<String>,
    /// Acronyms the document defines through a glossary package (`\newacronym`).
    pub acronyms: Vec<String>,
    pub math: Vec<(Pos, String)>,
    pub notes: Vec<String>,
}

impl Document {
    pub fn name(&self, p: Pos) -> &str {
        self.names.get(p.file as usize).map(String::as_str).unwrap_or("?")
    }

    pub fn at(&self, p: Pos) -> String {
        format!("{}:{}:{}", self.name(p), p.line, p.col)
    }

    /// The source text between two positions of one file, whitespace collapsed.
    pub fn slice(&self, span: Span) -> String {
        slice_lines(&self.lines, span)
    }

    /// The source line a position is on, trimmed to at most `max` characters from its column.
    pub fn excerpt(&self, span: Span, max: usize) -> String {
        let s = self.slice(span);
        let s = if s.is_empty() {
            self.lines
                .get(span.start.file as usize)
                .and_then(|l| l.get(span.start.line as usize - 1))
                .map(|l| collapse(l))
                .unwrap_or_default()
        } else {
            s
        };
        truncate(&s, max)
    }

    /// The section a position falls in.
    pub fn section_at(&self, p: Pos) -> usize {
        self.sentences.iter().find(|s| s.span.contains(p)).map(|s| s.section).unwrap_or(0)
    }
}

pub fn collapse(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let mut t: String = s.chars().take(max.saturating_sub(1)).collect();
        t.push('…');
        t
    }
}

#[derive(Clone, Copy, Debug)]
enum Tok {
    Ch(char, Pos, u32),
    Break,
}

/// Collects what a reader emits and turns it into a `Document`.
pub struct Builder {
    pub doc: Document,
    toks: Vec<Tok>,
    ctxs: Vec<(usize, EnvClass, Kind)>,
    section: usize,
    env: EnvClass,
    kind: Kind,
    /// While positive, characters are dropped (tables, footnotes) but structure is kept.
    pub quiet: u32,
}

impl Builder {
    pub fn new(format: Format, base_dir: PathBuf) -> Builder {
        Builder {
            doc: Document {
                format,
                names: vec![],
                paths: vec![],
                lines: vec![],
                base_dir,
                sentences: vec![],
                sections: vec![Section { title: String::new(), level: 0, span: Span::default() }],
                labels: vec![],
                refs: vec![],
                cites: vec![],
                code_spans: vec![],
                code_blocks: vec![],
                links: vec![],
                anchors: vec![],
                bib_files: vec![],
                bib_items: vec![],
                acronyms: vec![],
                math: vec![],
                notes: vec![],
            },
            toks: vec![],
            ctxs: vec![(0, EnvClass::None, Kind::Prose)],
            section: 0,
            env: EnvClass::None,
            kind: Kind::Prose,
            quiet: 0,
        }
    }

    /// Registers a source file and returns its index.
    pub fn add_file(&mut self, name: String, path: PathBuf, text: &str) -> u16 {
        self.doc.names.push(name);
        self.doc.paths.push(path);
        self.doc.lines.push(text.split('\n').map(|l| l.trim_end_matches('\r').to_string()).collect());
        (self.doc.names.len() - 1) as u16
    }

    pub fn section(&self) -> usize {
        self.section
    }

    pub fn env(&self) -> EnvClass {
        self.env
    }

    pub fn ch(&mut self, c: char, p: Pos) {
        if self.quiet > 0 {
            return;
        }
        let want = (self.section, self.env, self.kind);
        if *self.ctxs.last().unwrap() != want {
            self.ctxs.push(want);
        }
        let ctx = (self.ctxs.len() - 1) as u32;
        self.toks.push(Tok::Ch(c, p, ctx));
    }

    pub fn text(&mut self, s: &str, p: Pos) {
        for c in s.chars() {
            self.ch(c, p);
        }
    }

    pub fn brk(&mut self) {
        if !matches!(self.toks.last(), Some(Tok::Break) | None) {
            self.toks.push(Tok::Break);
        }
    }

    pub fn start_section(&mut self, title: String, level: u8, span: Span) -> usize {
        self.brk();
        self.doc.sections.push(Section { title, level, span });
        self.section = self.doc.sections.len() - 1;
        self.section
    }

    pub fn set_env(&mut self, e: EnvClass) {
        if self.env != e {
            self.brk();
            self.env = e;
        }
    }

    pub fn set_kind(&mut self, k: Kind) {
        if self.kind != k {
            self.brk();
            self.kind = k;
        }
    }

    pub fn finish(mut self) -> Document {
        let toks = std::mem::take(&mut self.toks);
        let mut cur: Vec<(char, Pos, u32)> = vec![];
        let mut i = 0;
        while i < toks.len() {
            match toks[i] {
                Tok::Break => {
                    self.flush(&mut cur);
                    i += 1;
                }
                Tok::Ch(c, p, ctx) => {
                    if !cur.is_empty() && cur[0].2 != ctx {
                        self.flush(&mut cur);
                    }
                    cur.push((c, p, ctx));
                    i += 1;
                    if matches!(c, '.' | '!' | '?') {
                        // Closing quotes and brackets belong to the sentence they end.
                        while let Some(Tok::Ch(n, q, x)) = toks.get(i) {
                            if matches!(n, ')' | ']' | '"' | '\'' | '”' | '’') {
                                cur.push((*n, *q, *x));
                                i += 1;
                            } else {
                                break;
                            }
                        }
                        if boundary(&cur, &toks[i..], c) {
                            self.flush(&mut cur);
                        }
                    }
                }
            }
        }
        self.flush(&mut cur);
        self.attach();
        self.doc
    }

    fn flush(&mut self, cur: &mut Vec<(char, Pos, u32)>) {
        let chars = std::mem::take(cur);
        let Some(a) = chars.iter().position(|c| !c.0.is_whitespace()) else { return };
        let b = chars.iter().rposition(|c| !c.0.is_whitespace()).unwrap();
        let chars = &chars[a..=b];
        if !chars.iter().any(|c| c.0.is_alphanumeric()) {
            return;
        }
        let text: String = chars.iter().map(|c| c.0).collect();
        let (section, env, kind) = self.ctxs[chars[0].2 as usize];
        let span = Span { start: chars[0].1, end: chars[chars.len() - 1].1 };
        let span = if span.end < span.start || span.end.file != span.start.file { Span::at(span.start) } else { span };
        self.doc.sentences.push(Sentence {
            text: collapse(&text),
            raw: String::new(),
            span,
            section,
            env,
            kind,
            cites: vec![],
            refs: vec![],
            links: vec![],
            math_numbers: vec![],
        });
    }

    /// Gives each sentence its raw text, and the citations, references, links and math
    /// numbers that fall inside its span.
    fn attach(&mut self) {
        let doc = &mut self.doc;
        let raws: Vec<String> = doc.sentences.iter().map(|s| slice_lines(&doc.lines, s.span)).collect();
        for (s, raw) in doc.sentences.iter_mut().zip(raws) {
            s.raw = raw;
        }
        for c in &doc.cites {
            if let Some(s) = doc.sentences.iter_mut().find(|s| s.span.contains(c.span.start)) {
                s.cites.push(c.key.clone());
            }
        }
        for r in &doc.refs {
            if let Some(s) = doc.sentences.iter_mut().find(|s| s.span.contains(r.span.start)) {
                s.refs.push(r.target.clone());
            }
        }
        for l in &doc.links {
            if let Some(s) = doc.sentences.iter_mut().find(|s| s.span.contains(l.span.start)) {
                s.links.push(l.target.clone());
            }
        }
        for (p, m) in &doc.math {
            if let Some(s) = doc.sentences.iter_mut().find(|s| s.span.contains(*p)) {
                s.math_numbers.extend(crate::text::numbers(m).into_iter().map(|n| n.value));
            }
        }
    }
}

/// The source text between two positions of one file, whitespace collapsed.
pub fn slice_lines(lines: &[Vec<String>], span: Span) -> String {
    let Some(lines) = lines.get(span.start.file as usize) else { return String::new() };
    let (l0, l1) = (span.start.line as usize, span.end.line as usize);
    if span.end.file != span.start.file || l1 < l0 || l0 == 0 {
        return String::new();
    }
    let mut out = String::new();
    for l in l0..=l1 {
        let Some(line) = lines.get(l - 1) else { break };
        let chars: Vec<char> = line.chars().collect();
        let a = if l == l0 { (span.start.col as usize).saturating_sub(1) } else { 0 };
        let b = if l == l1 { (span.end.col as usize).min(chars.len()) } else { chars.len() };
        if a < b {
            out.extend(&chars[a..b]);
        }
        if l != l1 {
            out.push(' ');
        }
    }
    collapse(&out)
}

const ABBREV: &[&str] = &[
    "e.g", "i.e", "al", "cf", "vs", "fig", "figs", "eq", "eqs", "sec", "secs", "no", "nos", "vol", "pp", "p", "dr", "mr", "ms", "mrs",
    "prof", "approx", "ref", "refs", "ch", "chap", "app", "thm", "lem", "def", "resp", "viz", "ca", "st", "tab", "et", "eqn", "cor",
    "prop", "ex",
];

/// Whether the terminal punctuation just pushed ends the sentence, given what follows.
fn boundary(cur: &[(char, Pos, u32)], rest: &[Tok], term: char) -> bool {
    let mut saw_space = false;
    let mut next = None;
    for t in rest {
        match t {
            Tok::Break => break,
            Tok::Ch(c, _, _) if c.is_whitespace() => saw_space = true,
            Tok::Ch(c, _, _) => {
                next = Some(*c);
                break;
            }
        }
    }
    let Some(n) = next else { return true };
    if !saw_space {
        return false;
    }
    if !(n.is_uppercase() || n.is_ascii_digit() || "\"'“‘([`†§∗*".contains(n)) {
        return false;
    }
    if term == '.' {
        // The word before the dot: an abbreviation or an initial does not end a sentence.
        let dot = cur.iter().rposition(|c| c.0 == '.').unwrap_or(cur.len());
        let word: String = cur[..dot]
            .iter()
            .rev()
            .take_while(|c| !c.0.is_whitespace() && c.0 != '(' && c.0 != '[')
            .map(|c| c.0)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect();
        let w = word.trim_start_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
        if ABBREV.contains(&w.as_str()) {
            return false;
        }
        let mut cs = word.chars();
        if let (Some(c), None) = (cs.next(), cs.next()) {
            if c.is_uppercase() {
                return false;
            }
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build(s: &str) -> Document {
        let mut b = Builder::new(Format::Markdown, PathBuf::from("."));
        b.add_file("t.md".into(), PathBuf::from("t.md"), s);
        for (li, line) in s.split('\n').enumerate() {
            for (ci, c) in line.chars().enumerate() {
                b.ch(c, Pos { file: 0, line: li as u32 + 1, col: ci as u32 + 1 });
            }
            b.ch(' ', Pos { file: 0, line: li as u32 + 1, col: line.chars().count() as u32 + 1 });
        }
        b.finish()
    }

    #[test]
    fn splits_on_terminal_punctuation_before_a_capital() {
        let d = build("One claim here. Another one follows! A third?");
        let t: Vec<_> = d.sentences.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(t, ["One claim here.", "Another one follows!", "A third?"]);
    }

    #[test]
    fn keeps_abbreviations_initials_and_decimals_inside_a_sentence() {
        let d = build("See Fig. 3 and e.g. Smith et al. Work by J. Smith gave 3.14 here. Next.");
        let t: Vec<_> = d.sentences.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(t, ["See Fig. 3 and e.g. Smith et al. Work by J. Smith gave 3.14 here.", "Next."]);
    }

    #[test]
    fn spans_point_at_the_source() {
        let d = build("First.\nSecond sentence\ncontinues here.");
        assert_eq!(d.sentences.len(), 2);
        let s = &d.sentences[1];
        assert_eq!((s.span.start.line, s.span.start.col), (2, 1));
        assert_eq!((s.span.end.line, s.span.end.col), (3, 15));
        assert_eq!(s.raw, "Second sentence continues here.");
    }

    #[test]
    fn env_classes() {
        assert_eq!(env_class("theorem*"), EnvClass::Statement);
        assert_eq!(env_class("lemma"), EnvClass::Statement);
        assert_eq!(env_class("definition"), EnvClass::Definition);
        assert_eq!(env_class("proof"), EnvClass::Proof);
        assert_eq!(env_class("quote"), EnvClass::Quote);
        assert_eq!(env_class("figure*"), EnvClass::Float);
        assert_eq!(env_class("itemize"), EnvClass::None);
    }
}
