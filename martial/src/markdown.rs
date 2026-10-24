//! Markdown reader: CommonMark blocks that matter for prose (headings, paragraphs, lists,
//! quotes, tables, fenced code) and the inline elements the checks read (code spans,
//! links, images, footnotes, Pandoc citations).

use crate::doc::{Builder, Cite, CodeBlock, CodeSpan, Kind, Link, Pos, Span};

/// An open code fence: its character, its length, the info-string language, the lines so far.
type Fence = (char, usize, String, Vec<(String, Pos)>);

pub fn read(b: &mut Builder, file: u16, text: &str) {
    let lines: Vec<&str> = text.split('\n').map(|l| l.trim_end_matches('\r')).collect();
    let mut i = 0;
    let pos = |line: usize, col: usize| Pos { file, line: line as u32 + 1, col: col as u32 + 1 };

    // Front matter: only `bibliography:` is read.
    if lines.first().map(|l| l.trim()) == Some("---") {
        if let Some(end) = lines.iter().skip(1).position(|l| matches!(l.trim(), "---" | "...")) {
            for l in &lines[1..=end] {
                if let Some(v) = l.trim().strip_prefix("bibliography:") {
                    for f in v.split(',') {
                        let f = f.trim().trim_matches(|c| c == '"' || c == '\'' || c == '[' || c == ']');
                        if !f.is_empty() {
                            b.doc.bib_files.push(f.to_string());
                        }
                    }
                }
            }
            i = end + 2;
        }
    }

    let mut fence: Option<Fence> = None;
    let mut in_comment = false;
    while i < lines.len() {
        let line = lines[i];
        let trimmed = line.trim_start();
        let indent = line.chars().count() - trimmed.chars().count();

        if let Some((fc, n, lang, mut body)) = fence.take() {
            let run = trimmed.chars().take_while(|&c| c == fc).count();
            if run >= n && trimmed[run * fc.len_utf8()..].trim().is_empty() {
                b.doc.code_blocks.push(CodeBlock { lang, lines: body, section: b.section() });
                b.brk();
            } else {
                body.push((line.to_string(), pos(i, 0)));
                fence = Some((fc, n, lang, body));
            }
            i += 1;
            continue;
        }
        if in_comment {
            if line.contains("-->") {
                in_comment = false;
            }
            i += 1;
            continue;
        }
        if trimmed.starts_with("<!--") && !trimmed.contains("-->") {
            in_comment = true;
            b.brk();
            i += 1;
            continue;
        }
        let fc = trimmed.chars().next().unwrap_or(' ');
        if (fc == '`' || fc == '~') && trimmed.chars().take_while(|&c| c == fc).count() >= 3 {
            let n = trimmed.chars().take_while(|&c| c == fc).count();
            let info = trimmed[n * fc.len_utf8()..].trim();
            let lang = info.split(|c: char| c.is_whitespace() || c == '{' || c == ',').next().unwrap_or("").to_lowercase();
            b.brk();
            fence = Some((fc, n, lang, vec![]));
            i += 1;
            continue;
        }
        if trimmed.is_empty() {
            b.set_kind(Kind::Prose);
            b.brk();
            i += 1;
            continue;
        }
        // ATX heading.
        let hashes = trimmed.chars().take_while(|&c| c == '#').count();
        if (1..=6).contains(&hashes) && trimmed[hashes..].starts_with([' ', '\t']) || (1..=6).contains(&hashes) && trimmed.len() == hashes {
            let body = trimmed[hashes..].trim().trim_end_matches('#').trim_end();
            let col = indent + hashes + (trimmed[hashes..].len() - trimmed[hashes..].trim_start().len());
            let mut title = String::new();
            inline(b, file, i, col, body, Emit::Into(&mut title));
            let start = pos(i, indent);
            let s =
                b.start_section(crate::doc::collapse(&title), hashes as u8, Span { start, end: pos(i, line.chars().count().max(1) - 1) });
            let slug = unique_slug(&b.doc.anchors, &slug(&title));
            b.doc.anchors.push((slug, s));
            b.set_kind(Kind::Prose);
            b.brk();
            i += 1;
            continue;
        }
        // Thematic break or setext underline.
        if trimmed.len() >= 3
            && (trimmed.chars().all(|c| c == '-' || c == ' ')
                || trimmed.chars().all(|c| c == '=' || c == ' ')
                || trimmed.chars().all(|c| c == '*' || c == ' '))
            && trimmed.chars().filter(|c| !c.is_whitespace()).count() >= 3
        {
            b.brk();
            i += 1;
            continue;
        }
        // Table row: inline elements count, prose does not.
        if trimmed.starts_with('|') {
            b.brk();
            inline(b, file, i, indent, trimmed, Emit::Quiet);
            b.brk();
            i += 1;
            continue;
        }
        // Link reference definition or footnote definition.
        if trimmed.starts_with('[') && indent < 4 {
            if let Some(close) = trimmed.find("]:") {
                let label = &trimmed[1..close];
                let rest = &trimmed[close + 2..];
                let rest_col = indent + close + 2;
                if let Some(key) = label.strip_prefix('^') {
                    b.doc.bib_items.push(format!("^{key}"));
                    b.brk();
                    b.set_kind(Kind::Prose);
                    inline(b, file, i, rest_col, rest, Emit::Text);
                    b.ch(' ', pos(i, line.chars().count()));
                    i += 1;
                    continue;
                }
                if !label.contains(']') {
                    let target = rest.split_whitespace().next().unwrap_or("").trim_matches(|c| c == '<' || c == '>');
                    if !target.is_empty() {
                        let start = pos(i, rest_col + (rest.len() - rest.trim_start().len()));
                        b.doc.links.push(Link { target: target.to_string(), span: Span::at(start), section: b.section() });
                    }
                    b.brk();
                    i += 1;
                    continue;
                }
            }
        }
        // HTML block line: links and images count, prose does not.
        if trimmed.starts_with('<') && trimmed[1..].starts_with(|c: char| c.is_ascii_alphabetic() || c == '/' || c == '!') {
            for attr in ["src=\"", "href=\""] {
                let mut from = 0;
                while let Some(k) = trimmed[from..].find(attr) {
                    let a = from + k + attr.len();
                    if let Some(e) = trimmed[a..].find('"') {
                        let col = indent + trimmed[..a].chars().count();
                        b.doc.links.push(Link { target: trimmed[a..a + e].to_string(), span: Span::at(pos(i, col)), section: b.section() });
                        from = a + e;
                    } else {
                        break;
                    }
                }
            }
            b.brk();
            i += 1;
            continue;
        }
        // List item.
        let (item, after) = list_marker(trimmed);
        if item {
            b.set_kind(Kind::Item);
            b.brk();
            let rest = &trimmed[after..];
            let rest =
                rest.strip_prefix("[ ] ").or_else(|| rest.strip_prefix("[x] ")).or_else(|| rest.strip_prefix("[X] ")).unwrap_or(rest);
            let col = indent + trimmed[..trimmed.len() - rest.len()].chars().count();
            inline(b, file, i, col, rest, Emit::Text);
            b.ch(' ', pos(i, line.chars().count()));
            i += 1;
            continue;
        }
        // Block quote markers are stripped; the text is prose.
        let mut body = trimmed;
        let mut col = indent;
        while let Some(r) = body.strip_prefix('>') {
            let r2 = r.trim_start();
            col += body.chars().count() - r2.chars().count();
            body = r2;
        }
        inline(b, file, i, col, body, Emit::Text);
        b.ch(' ', pos(i, line.chars().count()));
        i += 1;
    }
    if let Some((_, _, lang, body)) = fence {
        b.doc.code_blocks.push(CodeBlock { lang, lines: body, section: b.section() });
    }
}

fn list_marker(t: &str) -> (bool, usize) {
    let mut cs = t.char_indices();
    match cs.next() {
        Some((_, '-' | '*' | '+')) => {
            if t[1..].starts_with([' ', '\t']) {
                return (true, 1 + (t[1..].len() - t[1..].trim_start().len()));
            }
            (false, 0)
        }
        Some((_, c)) if c.is_ascii_digit() => {
            let n = t.chars().take_while(|c| c.is_ascii_digit()).count();
            if n <= 9 && t[n..].starts_with(['.', ')']) && t[n + 1..].starts_with([' ', '\t']) {
                return (true, n + 1 + (t[n + 1..].len() - t[n + 1..].trim_start().len()));
            }
            (false, 0)
        }
        _ => (false, 0),
    }
}

/// Where inline text goes: into the sentence stream, into a string (heading titles), or
/// nowhere (tables, where only links and code spans are kept).
pub enum Emit<'a> {
    Text,
    Into(&'a mut String),
    Quiet,
}

impl Emit<'_> {
    fn put(&mut self, b: &mut Builder, c: char, p: Pos) {
        match self {
            Emit::Text => b.ch(c, p),
            Emit::Into(s) => s.push(c),
            Emit::Quiet => {}
        }
    }
    fn reborrow(&mut self) -> Emit<'_> {
        match self {
            Emit::Text => Emit::Text,
            Emit::Into(s) => Emit::Into(s),
            Emit::Quiet => Emit::Quiet,
        }
    }
}

fn is_key_char(c: char) -> bool {
    c.is_alphanumeric() || "_:.#$%&-+?<>~/".contains(c)
}

/// Inline elements of `s`, which starts at character column `col0` (0-based) of `line`.
pub fn inline(b: &mut Builder, file: u16, line: usize, col0: usize, s: &str, mut emit: Emit) {
    let cs: Vec<char> = s.chars().collect();
    let pos = |k: usize| Pos { file, line: line as u32 + 1, col: (col0 + k) as u32 + 1 };
    let mut k = 0;
    while k < cs.len() {
        let c = cs[k];
        match c {
            '\\' if k + 1 < cs.len() && cs[k + 1].is_ascii_punctuation() => {
                emit.put(b, cs[k + 1], pos(k + 1));
                k += 2;
            }
            '`' => {
                let n = cs[k..].iter().take_while(|&&c| c == '`').count();
                let mut j = k + n;
                let mut close = None;
                while j < cs.len() {
                    if cs[j] == '`' {
                        let m = cs[j..].iter().take_while(|&&c| c == '`').count();
                        if m == n {
                            close = Some(j);
                            break;
                        }
                        j += m;
                    } else {
                        j += 1;
                    }
                }
                match close {
                    Some(j) => {
                        let code: String = cs[k + n..j].iter().collect();
                        let code = if code.starts_with(' ') && code.ends_with(' ') && !code.trim().is_empty() {
                            code[1..code.len() - 1].to_string()
                        } else {
                            code
                        };
                        b.doc.code_spans.push(CodeSpan {
                            text: code,
                            span: Span { start: pos(k), end: pos(j + n - 1) },
                            section: b.section(),
                        });
                        for (q, &ch) in cs.iter().enumerate().take(j + n).skip(k) {
                            emit.put(b, ch, pos(q));
                        }
                        k = j + n;
                    }
                    None => {
                        for q in k..k + n {
                            emit.put(b, '`', pos(q));
                        }
                        k += n;
                    }
                }
            }
            '!' if cs.get(k + 1) == Some(&'[') => {
                if let Some((end, _text, target)) = link_at(&cs, k + 1) {
                    if let Some(t) = target {
                        b.doc.links.push(Link { target: t, span: Span { start: pos(k), end: pos(end - 1) }, section: b.section() });
                    }
                    k = end;
                } else {
                    emit.put(b, c, pos(k));
                    k += 1;
                }
            }
            '[' => {
                // Footnote reference.
                if cs.get(k + 1) == Some(&'^') {
                    if let Some(e) = cs[k..].iter().position(|&c| c == ']') {
                        let key: String = cs[k + 1..k + e].iter().collect();
                        b.doc.cites.push(Cite { key, span: Span { start: pos(k), end: pos(k + e) }, section: b.section() });
                        emit.put(b, '†', pos(k));
                        k += e + 1;
                        continue;
                    }
                }
                if let Some((end, (ts, te), target)) = link_at(&cs, k) {
                    let inner: String = cs[ts..te].iter().collect();
                    // Pandoc citation: [@key; see @other, p. 3]
                    if target.is_none() && inner.contains('@') {
                        let mut found = false;
                        let mut q = ts;
                        while q < te {
                            if cs[q] == '@' && (q == ts || !cs[q - 1].is_alphanumeric()) {
                                let ks = q + 1;
                                let mut ke = ks;
                                while ke < te && is_key_char(cs[ke]) {
                                    ke += 1;
                                }
                                let key: String =
                                    cs[ks..ke].iter().collect::<String>().trim_end_matches(|c: char| ".:,;?".contains(c)).to_string();
                                if !key.is_empty() {
                                    b.doc.cites.push(Cite { key, span: Span { start: pos(q), end: pos(ke - 1) }, section: b.section() });
                                    found = true;
                                }
                                q = ke;
                            } else {
                                q += 1;
                            }
                        }
                        if found {
                            emit.put(b, '†', pos(k));
                            k = end;
                            continue;
                        }
                    }
                    if let Some(t) = target {
                        b.doc.links.push(Link { target: t, span: Span { start: pos(k), end: pos(end - 1) }, section: b.section() });
                    }
                    let sub: String = cs[ts..te].iter().collect();
                    inline(b, file, line, col0 + ts, &sub, emit.reborrow());
                    k = end;
                } else {
                    emit.put(b, c, pos(k));
                    k += 1;
                }
            }
            '<' => {
                let rest: String = cs[k..].iter().collect();
                if rest.starts_with("<!--") {
                    k += rest.find("-->").map(|e| rest[..e + 3].chars().count()).unwrap_or(cs.len() - k);
                } else if let Some(e) = rest.find('>') {
                    let inner = &rest[1..e];
                    if inner.contains("://") || inner.starts_with("mailto:") {
                        b.doc.links.push(Link { target: inner.to_string(), span: Span::at(pos(k)), section: b.section() });
                        for ch in inner.chars() {
                            emit.put(b, ch, pos(k));
                        }
                        k += rest[..e + 1].chars().count();
                    } else if inner.starts_with(|c: char| c.is_ascii_alphabetic() || c == '/') {
                        k += rest[..e + 1].chars().count();
                    } else {
                        emit.put(b, c, pos(k));
                        k += 1;
                    }
                } else {
                    emit.put(b, c, pos(k));
                    k += 1;
                }
            }
            '*' => k += 1,
            '_' if (k == 0 || !cs[k - 1].is_alphanumeric()) || (k + 1 >= cs.len() || !cs[k + 1].is_alphanumeric()) => k += 1,
            '~' if cs.get(k + 1) == Some(&'~') => k += 2,
            _ => {
                emit.put(b, c, pos(k));
                k += 1;
            }
        }
    }
}

/// A `[text](target)`, `[text][ref]` or `[text]` starting at `k`: (end, text range, target).
fn link_at(cs: &[char], k: usize) -> Option<(usize, (usize, usize), Option<String>)> {
    let mut depth = 0;
    let mut j = k;
    let mut close = None;
    while j < cs.len() {
        match cs[j] {
            '\\' => j += 1,
            '[' => depth += 1,
            ']' => {
                depth -= 1;
                if depth == 0 {
                    close = Some(j);
                    break;
                }
            }
            _ => {}
        }
        j += 1;
    }
    let close = close?;
    let text = (k + 1, close);
    if cs.get(close + 1) == Some(&'(') {
        let mut d = 0;
        let mut e = close + 1;
        while e < cs.len() {
            match cs[e] {
                '(' => d += 1,
                ')' => {
                    d -= 1;
                    if d == 0 {
                        break;
                    }
                }
                _ => {}
            }
            e += 1;
        }
        if e >= cs.len() {
            return None;
        }
        let inside: String = cs[close + 2..e].iter().collect();
        let target = inside.split_whitespace().next().unwrap_or("").trim_matches(|c| c == '<' || c == '>').to_string();
        return Some((e + 1, text, Some(target)));
    }
    if cs.get(close + 1) == Some(&'[') {
        if let Some(e) = cs[close + 1..].iter().position(|&c| c == ']') {
            return Some((close + 2 + e, text, None));
        }
    }
    Some((close + 1, text, None))
}

/// GitHub's heading anchor: lower case, punctuation dropped, spaces to hyphens.
pub fn slug(title: &str) -> String {
    let mut s = String::new();
    for c in title.trim().chars() {
        if c.is_alphanumeric() || c == '-' || c == '_' {
            s.extend(c.to_lowercase());
        } else if c == ' ' {
            s.push('-');
        }
    }
    s
}

fn unique_slug(existing: &[(String, usize)], base: &str) -> String {
    if !existing.iter().any(|(s, _)| s == base) {
        return base.to_string();
    }
    (1..).map(|n| format!("{base}-{n}")).find(|c| !existing.iter().any(|(s, _)| s == c)).unwrap()
}

/// The anchors of every ATX heading in a Markdown text (for links into other files).
pub fn anchors_of(text: &str) -> Vec<String> {
    let mut out: Vec<(String, usize)> = vec![];
    let mut in_fence = false;
    for line in text.lines() {
        let t = line.trim_start();
        if t.starts_with("```") || t.starts_with("~~~") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }
        let h = t.chars().take_while(|&c| c == '#').count();
        if (1..=6).contains(&h) && t[h..].starts_with(' ') {
            let title = t[h..].trim().trim_end_matches('#').trim();
            let plain: String = title.chars().filter(|&c| c != '`' && c != '*').collect();
            let plain = strip_links(&plain);
            let s = unique_slug(&out, &slug(&plain));
            out.push((s, 0));
        }
    }
    out.into_iter().map(|s| s.0).collect()
}

fn strip_links(s: &str) -> String {
    let cs: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut k = 0;
    while k < cs.len() {
        if cs[k] == '[' {
            if let Some((end, (a, b), _)) = link_at(&cs, k) {
                out.extend(&cs[a..b]);
                k = end;
                continue;
            }
        }
        out.push(cs[k]);
        k += 1;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::doc::Format;
    use std::path::PathBuf;

    fn doc(s: &str) -> crate::doc::Document {
        let mut b = Builder::new(Format::Markdown, PathBuf::from("."));
        let f = b.add_file("t.md".into(), PathBuf::from("t.md"), s);
        read(&mut b, f, s);
        b.finish()
    }

    #[test]
    fn headings_become_sections_with_slugs() {
        let d = doc("# Handing it a task\n\nText here.\n\n## The `check` op\n\nMore.\n");
        assert_eq!(d.sections.len(), 3);
        assert_eq!(d.sections[2].title, "The `check` op");
        let a: Vec<_> = d.anchors.iter().map(|a| a.0.as_str()).collect();
        assert_eq!(a, ["handing-it-a-task", "the-check-op"]);
        assert_eq!(d.sentences[1].section, 2);
    }

    #[test]
    fn code_links_and_citations_are_recorded_with_positions() {
        let d = doc("Run `cargo test` and read [the guide](docs/guide.md) [@smith2020; @lee].\n");
        assert_eq!(d.code_spans[0].text, "cargo test");
        assert_eq!((d.code_spans[0].span.start.line, d.code_spans[0].span.start.col), (1, 5));
        assert_eq!(d.links[0].target, "docs/guide.md");
        let keys: Vec<_> = d.cites.iter().map(|c| c.key.as_str()).collect();
        assert_eq!(keys, ["smith2020", "lee"]);
        assert_eq!(d.sentences.len(), 1);
        assert_eq!(d.sentences[0].cites, ["smith2020", "lee"]);
        assert!(d.sentences[0].text.contains("the guide"));
    }

    #[test]
    fn fences_tables_and_comments_are_not_prose() {
        let d = doc("Intro.\n\n```bash\nnpm run build\n```\n\n| a | `--flag` |\n|---|---|\n\n<!-- hidden. -->\nEnd.\n");
        let t: Vec<_> = d.sentences.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(t, ["Intro.", "End."]);
        assert_eq!(d.code_blocks[0].lang, "bash");
        assert_eq!(d.code_blocks[0].lines[0].0, "npm run build");
        assert_eq!(d.code_spans[0].text, "--flag");
    }

    #[test]
    fn footnotes_are_citations_with_local_definitions() {
        let d = doc("A claim.[^1]\n\n[^1]: Smith, 2020.\n");
        assert_eq!(d.cites[0].key, "^1");
        assert_eq!(d.bib_items, ["^1"]);
    }

    #[test]
    fn list_items_are_separate_sentences() {
        let d = doc("- first item\n- second item\n");
        let t: Vec<_> = d.sentences.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(t, ["first item", "second item"]);
    }

    #[test]
    fn anchors_of_other_files() {
        assert_eq!(anchors_of("# A b\n```\n# not\n```\n## A b\n"), ["a-b", "a-b-1"]);
    }
}
