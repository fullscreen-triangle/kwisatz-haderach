//! LaTeX reader. It is not a TeX engine: it knows the commands and environments that
//! decide what is prose, what is a claim's support, and what is structure — sections,
//! labels, references, citations, floats, theorem-like environments, math, verbatim code
//! and `\input` — and treats every other command as markup around its arguments.

use std::path::{Path, PathBuf};

use crate::doc::{env_class, Builder, Cite, CodeBlock, CodeSpan, EnvClass, Kind, Label, Link, Pos, RefUse, Span};

const MAX_DEPTH: u32 = 16;

pub fn read(b: &mut Builder, path: &Path, name: String, text: &str) {
    let mut seen = vec![path.to_path_buf()];
    let file = b.add_file(name, path.to_path_buf(), text);
    let base = b.doc.base_dir.clone();
    read_file(b, file, text, &base, 0, &mut seen);
}

fn read_file(b: &mut Builder, file: u16, text: &str, base: &Path, depth: u32, seen: &mut Vec<PathBuf>) {
    let cs = preprocess(file, text);
    let mut start = 0;
    let mut end = cs.len();
    if let Some(s) = find(&cs, 0, "\\begin{document}") {
        start = s + "\\begin{document}".len();
        // Bibliography commands may sit in the preamble.
        let mut pre = Parser { b: &mut *b, cs: &cs, i: 0, base: base.to_path_buf(), depth, seen: &mut *seen, envs: vec![], preamble: true };
        pre.run(s);
    }
    if let Some(e) = find(&cs, start, "\\end{document}") {
        end = e;
    }
    let mut p = Parser { b, cs: &cs, i: start, base: base.to_path_buf(), depth, seen, envs: vec![], preamble: false };
    p.run(end);
}

/// Characters with positions, comments removed. A comment also removes its newline, as in TeX.
fn preprocess(file: u16, text: &str) -> Vec<(char, Pos)> {
    let mut out = vec![];
    for (li, line) in text.split('\n').enumerate() {
        let line = line.trim_end_matches('\r');
        let mut comment = false;
        let mut backslashes = 0;
        for (ci, c) in line.chars().enumerate() {
            if c == '%' && backslashes % 2 == 0 {
                comment = true;
                break;
            }
            backslashes = if c == '\\' { backslashes + 1 } else { 0 };
            out.push((c, Pos { file, line: li as u32 + 1, col: ci as u32 + 1 }));
        }
        if !comment {
            out.push(('\n', Pos { file, line: li as u32 + 1, col: line.chars().count() as u32 + 1 }));
        }
    }
    out
}

fn find(cs: &[(char, Pos)], from: usize, pat: &str) -> Option<usize> {
    let p: Vec<char> = pat.chars().collect();
    if p.is_empty() || cs.len() < p.len() {
        return None;
    }
    (from..=cs.len() - p.len()).find(|&i| p.iter().enumerate().all(|(k, &c)| cs[i + k].0 == c))
}

struct Parser<'a, 'c> {
    b: &'a mut Builder,
    cs: &'c [(char, Pos)],
    i: usize,
    base: PathBuf,
    depth: u32,
    seen: &'a mut Vec<PathBuf>,
    /// Open environments: (name, env class to restore, whether it made the stream quiet).
    envs: Vec<(String, EnvClass, bool)>,
    /// In the preamble only bibliography and acronym declarations are read.
    preamble: bool,
}

const SECTIONS: &[(&str, u8)] =
    &[("part", 0), ("chapter", 1), ("section", 2), ("subsection", 3), ("subsubsection", 4), ("paragraph", 5), ("subparagraph", 6)];
const REFS: &[&str] = &[
    "ref",
    "cref",
    "Cref",
    "autoref",
    "Autoref",
    "eqref",
    "pageref",
    "nameref",
    "vref",
    "Vref",
    "cpageref",
    "Cpageref",
    "labelcref",
    "subref",
    "crefrange",
    "Crefrange",
];
const CITES: &[&str] = &[
    "cite",
    "citep",
    "citet",
    "citealp",
    "citealt",
    "citeauthor",
    "citeyear",
    "citeyearpar",
    "citenum",
    "parencite",
    "Parencite",
    "textcite",
    "Textcite",
    "autocite",
    "Autocite",
    "footcite",
    "supercite",
    "smartcite",
    "Cite",
    "Citep",
    "Citet",
    "citetitle",
    "fullcite",
    "footfullcite",
];
const VERBATIM: &[&str] = &["verbatim", "Verbatim", "lstlisting", "minted", "comment", "alltt", "BVerbatim", "LVerbatim"];
const MATH: &[&str] =
    &["equation", "align", "gather", "multline", "eqnarray", "displaymath", "math", "flalign", "alignat", "split", "dmath", "subequations"];
const TABULAR: &[&str] = &["tabular", "tabularx", "longtable", "array", "tabu", "supertabular", "tabulary", "xtabular"];
const SKIP_ENVS: &[&str] = &["tikzpicture", "pgfpicture", "forest", "axis", "circuitikz", "tikzcd", "filecontents"];

/// Commands whose arguments are not prose: (optional args, mandatory args) to drop.
fn drop_spec(name: &str) -> Option<(u8, u8)> {
    Some(match name {
        "includegraphics" | "usepackage" | "RequirePackage" | "documentclass" => (1, 1),
        "title" | "author" | "date" | "thanks" | "affiliation" | "affil" | "address" | "email" | "institute" | "keywords" | "subtitle"
        | "shorttitle" | "orcid" | "shortauthors" | "subject" => (1, 1),
        "vspace" | "hspace" | "bibliographystyle" | "pagestyle" | "thispagestyle" | "pagenumbering" | "theoremstyle" | "graphicspath"
        | "hypersetup" | "color" | "geometry" | "selectlanguage" | "index" | "glossary" | "nocite" | "markright" | "cline" | "phantom"
        | "hphantom" | "vphantom" | "settowidth" | "captionsetup" | "lstset" | "setminted" | "pgfplotsset" | "tikzset"
        | "usetikzlibrary" | "usepgfplotslibrary" | "input@path" => (1, 1),
        "setlength"
        | "addtolength"
        | "setcounter"
        | "addtocounter"
        | "DeclareMathOperator"
        | "markboth"
        | "multicolumn"
        | "resizebox"
        | "newlength" => (0, 2),
        "definecolor" | "addcontentsline" | "crefname" | "Crefname" => (0, 3),
        "rule" => (1, 2),
        "multirow" => (1, 2),
        "raisebox" | "scalebox" | "textcolor" | "colorbox" | "rotatebox" => (1, 1),
        "printbibliography" | "cmidrule" => (1, 0),
        "ac" | "acs" | "acl" | "acf" | "acp" | "Ac" | "gls" | "Gls" | "glspl" | "Glspl" | "acrshort" | "acrlong" => (0, 1),
        _ => return None,
    })
}

const NO_TEXT: &[&str] = &[
    "maketitle",
    "tableofcontents",
    "listoffigures",
    "listoftables",
    "clearpage",
    "newpage",
    "cleardoublepage",
    "centering",
    "raggedright",
    "raggedleft",
    "noindent",
    "indent",
    "appendix",
    "frontmatter",
    "mainmatter",
    "backmatter",
    "small",
    "footnotesize",
    "scriptsize",
    "tiny",
    "large",
    "Large",
    "LARGE",
    "huge",
    "Huge",
    "normalsize",
    "bfseries",
    "itshape",
    "ttfamily",
    "rmfamily",
    "sffamily",
    "mdseries",
    "upshape",
    "scshape",
    "em",
    "bf",
    "it",
    "tt",
    "sf",
    "rm",
    "sc",
    "hline",
    "toprule",
    "midrule",
    "bottomrule",
    "hfill",
    "vfill",
    "smallskip",
    "medskip",
    "bigskip",
    "protect",
    "relax",
    "phantomsection",
    "nopagebreak",
    "pagebreak",
    "hfil",
    "vfil",
    "makeatletter",
    "makeatother",
    "displaystyle",
    "noalign",
    "null",
    "strut",
    "sloppy",
    "fussy",
    "onecolumn",
    "twocolumn",
    "printglossaries",
    "printacronyms",
    "selectfont",
    "normalfont",
    "leavevmode",
    "allowbreak",
];

impl Parser<'_, '_> {
    fn c(&self, i: usize) -> char {
        self.cs.get(i).map(|c| c.0).unwrap_or('\0')
    }
    fn p(&self, i: usize) -> Pos {
        self.cs.get(i).or_else(|| self.cs.last()).map(|c| c.1).unwrap_or_default()
    }
    fn emit(&mut self, c: char, p: Pos) {
        if !self.preamble {
            self.b.ch(c, p);
        }
    }
    fn brk(&mut self) {
        if !self.preamble {
            self.b.brk();
        }
    }

    fn run(&mut self, end: usize) {
        while self.i < end {
            let (c, p) = self.cs[self.i];
            if self.preamble {
                if c == '\\' {
                    self.command(end);
                } else {
                    self.i += 1;
                }
                continue;
            }
            match c {
                '\\' => self.command(end),
                '$' => self.dollar_math(end),
                '{' | '}' => self.i += 1,
                '~' | '&' => {
                    self.emit(' ', p);
                    self.i += 1;
                }
                '\n' => {
                    let mut j = self.i + 1;
                    while j < end && matches!(self.c(j), ' ' | '\t') {
                        j += 1;
                    }
                    if j < end && self.c(j) == '\n' {
                        self.brk();
                        self.i = j;
                    } else {
                        self.emit(' ', p);
                        self.i += 1;
                    }
                }
                '`' if self.c(self.i + 1) == '`' => {
                    self.emit('"', p);
                    self.i += 2;
                }
                '\'' if self.c(self.i + 1) == '\'' => {
                    self.emit('"', p);
                    self.i += 2;
                }
                _ => {
                    self.emit(c, p);
                    self.i += 1;
                }
            }
        }
        self.i = self.i.max(end);
    }

    fn run_range(&mut self, r: (usize, usize)) {
        let save = self.i;
        self.i = r.0;
        self.run(r.1);
        self.i = save;
    }

    fn skip_ws(&mut self) {
        let mut newlines = 0;
        while matches!(self.c(self.i), ' ' | '\t' | '\n') {
            if self.c(self.i) == '\n' {
                newlines += 1;
                if newlines > 1 {
                    break;
                }
            }
            self.i += 1;
        }
    }

    /// A `{...}` group after optional whitespace: its inner range, with `i` moved past it.
    fn group(&mut self) -> Option<(usize, usize)> {
        let save = self.i;
        self.skip_ws();
        if self.c(self.i) != '{' {
            self.i = save;
            return None;
        }
        let start = self.i + 1;
        let mut depth = 0;
        let mut j = self.i;
        while j < self.cs.len() {
            match self.c(j) {
                '\\' => j += 1,
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        self.i = j + 1;
                        return Some((start, j));
                    }
                }
                _ => {}
            }
            j += 1;
        }
        self.i = self.cs.len();
        Some((start, self.cs.len()))
    }

    /// An optional `[...]` argument.
    fn opt(&mut self) -> Option<(usize, usize)> {
        let save = self.i;
        self.skip_ws();
        if self.c(self.i) != '[' {
            self.i = save;
            return None;
        }
        let start = self.i + 1;
        let (mut brackets, mut braces) = (0, 0);
        let mut j = self.i;
        while j < self.cs.len() {
            match self.c(j) {
                '\\' => j += 1,
                '{' => braces += 1,
                '}' => braces -= 1,
                '[' if braces == 0 => brackets += 1,
                ']' if braces == 0 => {
                    brackets -= 1;
                    if brackets == 0 {
                        self.i = j + 1;
                        return Some((start, j));
                    }
                }
                _ => {}
            }
            j += 1;
        }
        self.i = save;
        None
    }

    fn raw(&self, r: (usize, usize)) -> String {
        self.cs[r.0..r.1.min(self.cs.len())].iter().map(|c| c.0).collect()
    }

    fn span(&self, a: usize, b: usize) -> Span {
        Span { start: self.p(a), end: self.p(b.saturating_sub(1).max(a)) }
    }

    fn command(&mut self, end: usize) {
        let start = self.i;
        let p = self.p(start);
        self.i += 1;
        let c = self.c(self.i);
        if !c.is_ascii_alphabetic() {
            self.i += 1;
            match c {
                '\\' => {
                    self.opt();
                    self.emit(' ', p);
                }
                '%' | '&' | '#' | '$' | '_' | '{' | '}' => self.emit(c, p),
                ',' | ';' | '!' | ' ' | '/' | '>' | ':' | '\n' => self.emit(' ', p),
                '[' => self.math_until(end, "\\]", true, p),
                '(' => self.math_until(end, "\\)", false, p),
                _ => {}
            }
            return;
        }
        let mut j = self.i;
        while self.c(j).is_ascii_alphabetic() || (self.c(j) == '@' && self.preamble) {
            j += 1;
        }
        let name: String = self.cs[self.i..j].iter().map(|c| c.0).collect();
        self.i = j;
        if self.c(self.i) == '*' {
            self.i += 1;
        }
        let name = name.as_str();

        if self.preamble {
            match name {
                "bibliography" | "addbibresource" => self.bibliography(),
                "newacronym" => self.newacronym(),
                _ => {}
            }
            return;
        }

        if let Some(&(_, level)) = SECTIONS.iter().find(|s| s.0 == name) {
            self.opt();
            if let Some(g) = self.group() {
                let title = strip_tex(&self.raw(g));
                let span = self.span(start, g.1 + 1);
                self.b.start_section(crate::doc::collapse(&title), level, span);
                // Labels and references inside a title still count.
                self.b.quiet += 1;
                self.run_range(g);
                self.b.quiet -= 1;
                self.b.brk();
            }
            return;
        }
        if REFS.contains(&name) {
            if let Some(g) = self.group() {
                for key in self.raw(g).split(',') {
                    let key = key.trim();
                    if !key.is_empty() {
                        self.b.doc.refs.push(RefUse {
                            target: key.to_string(),
                            span: self.span(start, g.1 + 1),
                            section: self.b.section(),
                        });
                    }
                }
                if name.starts_with("crefrange") || name.starts_with("Crefrange") {
                    if let Some(g2) = self.group() {
                        let key = self.raw(g2).trim().to_string();
                        self.b.doc.refs.push(RefUse { target: key, span: self.span(start, g2.1 + 1), section: self.b.section() });
                    }
                }
                self.emit('§', p);
            }
            return;
        }
        if CITES.contains(&name) {
            self.opt();
            self.opt();
            if let Some(g) = self.group() {
                for key in self.raw(g).split(',') {
                    let key = key.trim();
                    if !key.is_empty() {
                        self.b.doc.cites.push(Cite { key: key.to_string(), span: self.span(start, g.1 + 1), section: self.b.section() });
                    }
                }
                self.emit('†', p);
            }
            return;
        }
        match name {
            "label" => {
                if let Some(g) = self.group() {
                    let name = self.raw(g).trim().to_string();
                    self.b.doc.labels.push(Label { name, span: self.span(start, g.1 + 1), section: self.b.section() });
                }
            }
            "hyperref" => {
                if let Some(o) = self.opt() {
                    let key = self.raw(o).trim().to_string();
                    self.b.doc.refs.push(RefUse { target: key, span: self.span(start, o.1 + 1), section: self.b.section() });
                }
                if let Some(g) = self.group() {
                    self.run_range(g);
                }
            }
            "bibliography" | "addbibresource" => self.bibliography(),
            "newacronym" => self.newacronym(),
            "bibitem" => {
                self.opt();
                if let Some(g) = self.group() {
                    let key = self.raw(g).trim().to_string();
                    self.b.doc.bib_items.push(key);
                }
            }
            "input" | "include" | "subfile" | "includeonly" => {
                if let Some(g) = self.group() {
                    let rel = self.raw(g).trim().to_string();
                    self.include(&rel, p);
                }
            }
            "begin" => self.begin(end, start),
            "end" => {
                if let Some(g) = self.group() {
                    let env = self.raw(g).trim().to_string();
                    self.end_env(&env);
                }
            }
            "item" => {
                self.brk();
                if let Some(o) = self.opt() {
                    self.run_range(o);
                    self.emit(' ', p);
                }
            }
            "caption" | "subcaption" | "captionof" => {
                if name == "captionof" {
                    self.group();
                }
                self.opt();
                if let Some(g) = self.group() {
                    self.b.set_kind(Kind::Caption);
                    self.run_range(g);
                    self.b.set_kind(Kind::Prose);
                }
            }
            "footnote" | "footnotetext" | "marginpar" | "tablefootnote" => {
                self.opt();
                if let Some(g) = self.group() {
                    // A footnote's citations support the sentence it hangs on; its prose is not read.
                    self.b.quiet += 1;
                    self.run_range(g);
                    self.b.quiet -= 1;
                }
            }
            "url" | "path" => {
                if let Some(g) = self.group() {
                    let t = self.raw(g).trim().to_string();
                    self.b.doc.links.push(Link { target: t, span: self.span(start, g.1 + 1), section: self.b.section() });
                    self.emit('∗', p);
                }
            }
            "href" => {
                if let Some(g) = self.group() {
                    let t = self.raw(g).trim().to_string();
                    self.b.doc.links.push(Link { target: t, span: self.span(start, g.1 + 1), section: self.b.section() });
                }
                if let Some(g) = self.group() {
                    self.run_range(g);
                }
            }
            "texttt" | "code" | "lstinline" | "verb" | "mintinline" => self.inline_code(name, start, p),
            "newcommand" | "renewcommand" | "providecommand" | "DeclareRobustCommand" | "newenvironment" | "renewenvironment" => {
                if self.group().is_none() {
                    // \newcommand\foo
                    if self.c(self.i) == '\\' {
                        self.i += 1;
                        while self.c(self.i).is_ascii_alphabetic() {
                            self.i += 1;
                        }
                    }
                }
                self.opt();
                self.opt();
                self.group();
                if name.ends_with("environment") {
                    self.group();
                }
            }
            "def" | "gdef" | "edef" | "xdef" => {
                while self.i < end && self.c(self.i) != '{' {
                    self.i += 1;
                }
                self.group();
            }
            "newtheorem" => {
                self.group();
                self.opt();
                self.group();
                self.opt();
            }
            "par" => self.brk(),
            "newline" | "linebreak" | "quad" | "qquad" | "enspace" | "thinspace" => self.emit(' ', p),
            "ldots" | "dots" | "cdots" | "textellipsis" => self.emit('…', p),
            "LaTeX" | "TeX" | "BibTeX" | "LaTeXe" => self.text(name, p),
            "ie" => self.text("i.e.", p),
            "eg" => self.text("e.g.", p),
            "etal" => self.text("et al.", p),
            "textendash" => self.emit('–', p),
            "textemdash" => self.emit('—', p),
            "textasciitilde" => self.emit('~', p),
            "textbackslash" => self.emit('\\', p),
            "textdegree" => self.emit('°', p),
            "times" => self.emit('×', p),
            "S" => self.emit('§', p),
            "today" => self.text("today", p),
            _ if NO_TEXT.contains(&name) => {}
            _ => {
                if let Some((opts, groups)) = drop_spec(name) {
                    for _ in 0..opts {
                        self.opt();
                    }
                    for _ in 0..groups {
                        self.group();
                    }
                    if matches!(
                        name,
                        "ac" | "acs" | "acl" | "acf" | "acp" | "Ac" | "gls" | "Gls" | "glspl" | "Glspl" | "acrshort" | "acrlong"
                    ) {
                        self.emit('∗', p);
                    }
                } else {
                    // Unknown command: its arguments are text; a bare macro stands for a word.
                    let save = self.i;
                    self.skip_ws();
                    let next = self.c(self.i);
                    self.i = save;
                    if next != '{' && next != '[' {
                        self.emit('∗', p);
                    } else if next == '[' {
                        self.opt();
                    } else if let Some(g) = self.group() {
                        // `\macro{}` stands for a word; `\macro{text}` is markup around text.
                        if g.0 == g.1 {
                            self.emit('∗', p);
                        } else {
                            self.run_range(g);
                        }
                    }
                }
            }
        }
    }

    fn text(&mut self, s: &str, p: Pos) {
        if !self.preamble {
            self.b.text(s, p);
        }
    }

    fn bibliography(&mut self) {
        if let Some(g) = self.group() {
            for f in self.raw(g).split(',') {
                let f = f.trim();
                if f.is_empty() {
                    continue;
                }
                let f = if Path::new(f).extension().is_some() { f.to_string() } else { format!("{f}.bib") };
                self.b.doc.bib_files.push(f);
            }
        }
    }

    fn newacronym(&mut self) {
        self.opt();
        self.group();
        if let Some(short) = self.group() {
            let s = strip_tex(&self.raw(short)).trim().to_string();
            self.b.doc.acronyms.push(s);
        }
        self.group();
    }

    fn include(&mut self, rel: &str, p: Pos) {
        let mut path = self.base.join(rel);
        if path.extension().is_none() || !path.exists() {
            let with = self.base.join(format!("{rel}.tex"));
            if with.exists() {
                path = with;
            }
        }
        if self.depth >= MAX_DEPTH || self.seen.iter().any(|s| s == &path) {
            return;
        }
        let Ok(text) = std::fs::read_to_string(&path) else {
            self.b.doc.notes.push(format!("{}:{}: \\input{{{rel}}} not found; its text was not read", self.b.doc.name(p), p.line));
            return;
        };
        self.seen.push(path.clone());
        let name = crate::display_path(&path);
        let file = self.b.add_file(name, path.clone(), &text);
        let base = self.base.clone();
        self.b.brk();
        read_file(self.b, file, &text, &base, self.depth + 1, self.seen);
        self.b.brk();
    }

    fn inline_code(&mut self, name: &str, start: usize, p: Pos) {
        let range = match name {
            "verb" | "lstinline" | "mintinline" => {
                if name == "mintinline" {
                    self.group();
                }
                if name == "lstinline" {
                    self.opt();
                }
                let d = self.c(self.i);
                if d == '{' {
                    self.group()
                } else {
                    let s = self.i + 1;
                    let mut j = s;
                    while j < self.cs.len() && self.c(j) != d && self.c(j) != '\n' {
                        j += 1;
                    }
                    self.i = (j + 1).min(self.cs.len());
                    Some((s, j))
                }
            }
            _ => self.group(),
        };
        if let Some(r) = range {
            let text = if name == "texttt" || name == "code" { strip_tex(&self.raw(r)) } else { self.raw(r) };
            let text = text.trim().to_string();
            self.b.doc.code_spans.push(CodeSpan { text: text.clone(), span: self.span(start, r.1 + 1), section: self.b.section() });
            self.emit('`', p);
            for ch in text.chars() {
                self.emit(ch, p);
            }
            self.emit('`', p);
        }
    }

    fn math_until(&mut self, end: usize, close: &str, display: bool, p: Pos) {
        let s = self.i;
        let e = find(self.cs, s, close).filter(|&e| e < end.max(s)).unwrap_or(end);
        let content = self.raw((s, e));
        self.scan_labels(s, e);
        self.b.doc.math.push((p, content));
        self.emit('∗', p);
        let _ = display;
        self.i = (e + close.chars().count()).min(self.cs.len());
    }

    fn dollar_math(&mut self, end: usize) {
        let p = self.p(self.i);
        if self.c(self.i + 1) == '$' {
            self.i += 2;
            self.math_until(end, "$$", true, p);
            return;
        }
        self.i += 1;
        let s = self.i;
        let mut j = s;
        while j < end && !(self.c(j) == '$' && self.c(j.wrapping_sub(1)) != '\\') {
            j += 1;
        }
        let content = self.raw((s, j));
        self.b.doc.math.push((p, content));
        self.emit('∗', p);
        self.i = (j + 1).min(self.cs.len());
    }

    /// `\label`s inside math or a skipped environment still name targets.
    fn scan_labels(&mut self, s: usize, e: usize) {
        let mut k = s;
        while let Some(at) = find(&self.cs[..e.min(self.cs.len())], k, "\\label{") {
            let a = at + "\\label{".len();
            let mut b = a;
            while b < e && self.c(b) != '}' {
                b += 1;
            }
            let name = self.raw((a, b)).trim().to_string();
            self.b.doc.labels.push(Label { name, span: self.span(at, b + 1), section: self.b.section() });
            k = b;
        }
    }

    fn begin(&mut self, end: usize, start: usize) {
        let Some(g) = self.group() else { return };
        let env = self.raw(g).trim().to_string();
        let base = env.trim_end_matches('*');
        let p = self.p(start);
        if VERBATIM.contains(&base) {
            let mut lang = String::new();
            if base == "minted" {
                self.opt();
                if let Some(l) = self.group() {
                    lang = self.raw(l).trim().to_lowercase();
                }
            } else if let Some(r) = self.opt() {
                let o = self.raw(r);
                if let Some(l) = o.split(',').find_map(|kv| kv.trim().strip_prefix("language=")) {
                    lang = l.trim().to_lowercase();
                }
                // lstlisting names its label in the options: [caption={...},label=lst:x]
                if let Some(k) = o.find("label=") {
                    let name: String =
                        o[k + "label=".len()..].chars().take_while(|&c| c != ',' && c != ']' && !c.is_whitespace()).collect();
                    let name = name.trim_matches(|c| c == '{' || c == '}').to_string();
                    if !name.is_empty() {
                        self.b.doc.labels.push(Label { name, span: self.span(r.0, r.1), section: self.b.section() });
                    }
                }
            }
            let close = format!("\\end{{{env}}}");
            let e = find(self.cs, self.i, &close).unwrap_or(end);
            if base != "comment" {
                let mut lines: Vec<(String, Pos)> = vec![];
                let mut cur = String::new();
                let mut cur_pos = None;
                for k in self.i..e {
                    let (c, q) = self.cs[k];
                    if c == '\n' {
                        if let Some(cp) = cur_pos.take() {
                            lines.push((std::mem::take(&mut cur), cp));
                        }
                    } else {
                        if cur_pos.is_none() {
                            cur_pos = Some(q);
                        }
                        cur.push(c);
                    }
                }
                if let Some(cp) = cur_pos {
                    lines.push((cur, cp));
                }
                self.b.doc.code_blocks.push(CodeBlock { lang, lines, section: self.b.section() });
            }
            self.brk();
            self.i = (e + close.chars().count()).min(self.cs.len());
            return;
        }
        if MATH.contains(&base) {
            let close = format!("\\end{{{env}}}");
            let e = find(self.cs, self.i, &close).unwrap_or(end);
            self.scan_labels(self.i, e);
            let content = self.raw((self.i, e));
            self.b.doc.math.push((p, content));
            self.emit('∗', p);
            self.i = (e + close.chars().count()).min(self.cs.len());
            return;
        }
        if SKIP_ENVS.contains(&base) {
            let close = format!("\\end{{{env}}}");
            let e = find(self.cs, self.i, &close).unwrap_or(end);
            self.scan_labels(self.i, e);
            self.i = (e + close.chars().count()).min(self.cs.len());
            return;
        }
        if base == "thebibliography" {
            self.group();
            self.b.quiet += 1;
            self.envs.push((env, self.b.env(), true));
            return;
        }
        if TABULAR.contains(&base) {
            if base == "tabularx" || base == "tabulary" || env == "tabular*" {
                self.group();
            }
            self.opt();
            self.group();
            self.b.brk();
            self.b.quiet += 1;
            self.envs.push((env, self.b.env(), true));
            return;
        }
        if base == "document" {
            return;
        }
        if base == "minipage" || base == "wrapfigure" {
            self.opt();
            self.group();
            if base == "wrapfigure" {
                self.group();
            }
        }
        if matches!(base, "itemize" | "enumerate" | "description") {
            self.opt();
        }
        let class = env_class(&env);
        let prev = self.b.env();
        if class != EnvClass::None {
            self.opt();
            self.b.set_env(class);
        }
        self.b.brk();
        self.envs.push((env, prev, false));
    }

    fn end_env(&mut self, env: &str) {
        if let Some(k) = self.envs.iter().rposition(|e| e.0 == env) {
            while self.envs.len() > k {
                let (_, prev, quiet) = self.envs.pop().unwrap();
                if quiet {
                    self.b.quiet = self.b.quiet.saturating_sub(1);
                }
                self.b.set_env(prev);
            }
        }
        self.b.brk();
    }
}

/// Text of a short LaTeX fragment (a title or `\texttt` argument): commands dropped,
/// escapes resolved, braces removed.
pub fn strip_tex(s: &str) -> String {
    let cs: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut k = 0;
    while k < cs.len() {
        match cs[k] {
            '\\' => {
                k += 1;
                if k < cs.len() && !cs[k].is_ascii_alphabetic() {
                    if cs[k] != '\\' {
                        out.push(cs[k]);
                    } else {
                        out.push(' ');
                    }
                    k += 1;
                } else {
                    let st = k;
                    while k < cs.len() && cs[k].is_ascii_alphabetic() {
                        k += 1;
                    }
                    let name: String = cs[st..k].iter().collect();
                    if matches!(name.as_str(), "label" | "cite" | "ref" | "cref" | "footnote") {
                        // Skip the argument entirely.
                        if k < cs.len() && cs[k] == '{' {
                            let mut d = 0;
                            while k < cs.len() {
                                if cs[k] == '{' {
                                    d += 1;
                                } else if cs[k] == '}' {
                                    d -= 1;
                                    if d == 0 {
                                        k += 1;
                                        break;
                                    }
                                }
                                k += 1;
                            }
                        }
                    }
                }
            }
            '{' | '}' => k += 1,
            '~' => {
                out.push(' ');
                k += 1;
            }
            '$' => k += 1,
            c => {
                out.push(c);
                k += 1;
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::doc::{Document, Format};

    fn doc(s: &str) -> Document {
        let mut b = Builder::new(Format::Latex, PathBuf::from("."));
        read(&mut b, Path::new("t.tex"), "t.tex".into(), s);
        b.finish()
    }

    #[test]
    fn prose_sections_labels_refs_and_cites() {
        let d = doc("\\documentclass{article}\n\\begin{document}\n\\section{Method}\\label{sec:m}\nWe show in \\cref{sec:r} that it holds~\\cite{smith2020, lee}.\n\n\\section{Results}\\label{sec:r}\nIt holds.\n\\bibliography{refs}\n\\end{document}\n");
        assert_eq!(d.sections.iter().map(|s| s.title.as_str()).collect::<Vec<_>>(), ["", "Method", "Results"]);
        assert_eq!(d.labels.iter().map(|l| (l.name.as_str(), l.section)).collect::<Vec<_>>(), [("sec:m", 1), ("sec:r", 2)]);
        assert_eq!(d.sentences[0].text, "We show in § that it holds †.");
        assert_eq!(d.sentences[0].refs, ["sec:r"]);
        assert_eq!(d.sentences[0].cites, ["smith2020", "lee"]);
        assert_eq!(d.sentences[0].raw, "We show in \\cref{sec:r} that it holds~\\cite{smith2020, lee}.");
        assert_eq!(d.bib_files, ["refs.bib"]);
    }

    #[test]
    fn comments_math_and_verbatim_are_not_prose() {
        let d = doc("Text with $x = 3$ math% a comment\n and more.\n\\begin{equation}\\label{eq:a} y = 2 \\end{equation}\n\\begin{verbatim}\ncode here.\n\\end{verbatim}\nDone.\n");
        let t: Vec<_> = d.sentences.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(t, ["Text with ∗ math and more.", "Done."]);
        assert_eq!(d.labels[0].name, "eq:a");
        assert_eq!(d.code_blocks[0].lines[0].0, "code here.");
        assert_eq!(d.sentences[0].math_numbers, ["3"]);
    }

    #[test]
    fn environments_classify_sentences() {
        let d = doc("\\begin{abstract}We prove a bound.\\end{abstract}\n\\begin{theorem}[Main]\\label{thm:a}The bound holds.\\end{theorem}\n\\begin{proof}Clearly so.\\end{proof}\nAfter.\n");
        let e: Vec<_> = d.sentences.iter().map(|s| (s.text.as_str(), s.env)).collect();
        assert_eq!(
            e,
            [
                ("We prove a bound.", EnvClass::Abstract),
                ("The bound holds.", EnvClass::Statement),
                ("Clearly so.", EnvClass::Proof),
                ("After.", EnvClass::None)
            ]
        );
    }

    #[test]
    fn captions_footnotes_and_tables() {
        let d = doc("\\begin{figure}\\includegraphics[width=3cm]{a.png}\\caption{Speed of the solver.}\\label{fig:a}\\end{figure}\nA claim\\footnote{See \\cite{k}.} here.\n\\begin{tabular}{ll} a & 1.5 \\\\ \\end{tabular}\nEnd.\n");
        let t: Vec<_> = d.sentences.iter().map(|s| (s.text.as_str(), s.kind)).collect();
        assert_eq!(t, [("Speed of the solver.", Kind::Caption), ("A claim here.", Kind::Prose), ("End.", Kind::Prose)]);
        assert_eq!(d.sentences[1].cites, ["k"]);
    }

    #[test]
    fn inline_code_and_unknown_macros() {
        let d = doc("Call \\texttt{run\\_all} on \\ourtool{} now.\n");
        assert_eq!(d.code_spans[0].text, "run_all");
        assert_eq!(d.sentences[0].text, "Call `run_all` on ∗ now.");
    }

    #[test]
    fn strip_tex_titles() {
        assert_eq!(strip_tex("The \\emph{tight} bound\\label{x}"), "The tight bound");
    }
}
