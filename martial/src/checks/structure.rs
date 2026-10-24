//! `structure`: every reference, label and link resolves. `citations`: every citation
//! names a bibliography entry.

use std::collections::{HashMap, HashSet};
use std::path::Path;

use super::{problem, Ctx, Out};
use crate::doc::Format;
use crate::text::nearest;

pub fn structure(ctx: &Ctx, out: &mut Out) {
    let doc = ctx.doc;
    out.ran("structure");

    let mut first: HashMap<&str, usize> = HashMap::new();
    for (i, l) in doc.labels.iter().enumerate() {
        if let Some(&j) = first.get(l.name.as_str()) {
            let prev = &doc.labels[j];
            out.problems.push(problem(
                doc,
                "duplicate_label",
                l.span,
                l.section,
                format!("label \"{}\" is also defined at {}", l.name, doc.at(prev.span.start)),
                l.name.clone(),
            ));
        } else {
            first.insert(&l.name, i);
        }
    }
    let labels: HashSet<&str> = doc.labels.iter().map(|l| l.name.as_str()).collect();
    for r in &doc.refs {
        if !labels.contains(r.target.as_str()) {
            let hint = nearest(&r.target, labels.iter().copied()).map(|n| format!("; did you mean \"{n}\"?")).unwrap_or_default();
            out.problems.push(problem(
                doc,
                "dangling_ref",
                r.span,
                r.section,
                format!("no \\label{{{}}} in the document{hint}", r.target),
                r.target.clone(),
            ));
        }
    }

    let anchors: HashSet<&str> = doc.anchors.iter().map(|a| a.0.as_str()).collect();
    let mut other: HashMap<std::path::PathBuf, Option<HashSet<String>>> = HashMap::new();
    for l in &doc.links {
        let t = l.target.trim();
        if t.is_empty() || is_external(t) {
            continue;
        }
        if let Some(a) = t.strip_prefix('#') {
            if doc.format == Format::Markdown && !anchors.contains(a.to_lowercase().as_str()) {
                let hint = nearest(a, anchors.iter().copied()).map(|n| format!("; did you mean \"#{n}\"?")).unwrap_or_default();
                out.problems.push(problem(
                    doc,
                    "dangling_link",
                    l.span,
                    l.section,
                    format!("no heading with anchor \"#{a}\" in this document{hint}"),
                    t.to_string(),
                ));
            }
            continue;
        }
        let (file, anchor) = match t.split_once('#') {
            Some((f, a)) => (f, Some(a)),
            None => (t, None),
        };
        let file = file.split('?').next().unwrap_or(file).replace("%20", " ");
        let path = if Path::new(&file).is_absolute() { Path::new(&file).to_path_buf() } else { ctx.doc_dir.join(&file) };
        if !path.exists() {
            out.problems.push(problem(
                doc,
                "dangling_link",
                l.span,
                l.section,
                format!("\"{file}\" does not exist (relative to {})", crate::display_path(ctx.doc_dir)),
                t.to_string(),
            ));
            continue;
        }
        if let Some(a) = anchor.filter(|a| !a.is_empty()) {
            if path.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("md")).unwrap_or(false) {
                let set = other
                    .entry(path.clone())
                    .or_insert_with(|| std::fs::read_to_string(&path).ok().map(|t| crate::markdown::anchors_of(&t).into_iter().collect()));
                if let Some(set) = set {
                    if !set.contains(&a.to_lowercase()) {
                        out.problems.push(problem(
                            doc,
                            "dangling_link",
                            l.span,
                            l.section,
                            format!("\"{file}\" has no heading with anchor \"#{a}\""),
                            t.to_string(),
                        ));
                    }
                }
            }
        }
    }
}

pub fn is_external(t: &str) -> bool {
    let l = t.to_ascii_lowercase();
    l.contains("://")
        || l.starts_with("mailto:")
        || l.starts_with("tel:")
        || l.starts_with("data:")
        || l.starts_with("//")
        || l.starts_with("doi:")
}

/// The bibliography: keys from the `.bib` files the document names (relative to the
/// document, then to the working directory) plus keys it defines itself.
pub fn bibliography(ctx: &Ctx) -> (Option<HashSet<String>>, Vec<String>) {
    let doc = ctx.doc;
    let mut keys: HashSet<String> = doc.bib_items.iter().cloned().collect();
    let mut missing = vec![];
    let mut found_file = false;
    for f in &doc.bib_files {
        let p = ctx.doc_dir.join(f);
        let p = if p.exists() { p } else { Path::new(f).to_path_buf() };
        match std::fs::read_to_string(&p) {
            Ok(t) => {
                found_file = true;
                keys.extend(crate::bib::keys(&t));
            }
            Err(_) => missing.push(f.clone()),
        }
    }
    let usable = found_file || (doc.bib_files.is_empty() && !doc.bib_items.is_empty()) || doc.cites.iter().all(|c| c.key.starts_with('^'));
    (if usable { Some(keys) } else { None }, missing)
}

pub fn citations(ctx: &Ctx, out: &mut Out) {
    let doc = ctx.doc;
    if doc.cites.is_empty() {
        out.ran("citations");
        return;
    }
    let (keys, missing) = bibliography(ctx);
    let Some(keys) = keys else {
        let reason = if missing.is_empty() {
            "the document cites but names no bibliography (\\bibliography{...}, \\addbibresource{...} or a bibliography: front-matter key)"
                .to_string()
        } else {
            format!("bibliography file(s) not found: {}", missing.join(", "))
        };
        // Footnote citations can still be checked against their definitions.
        for c in doc.cites.iter().filter(|c| c.key.starts_with('^')) {
            if !doc.bib_items.contains(&c.key) {
                out.problems.push(problem(
                    doc,
                    "unknown_citation",
                    c.span,
                    c.section,
                    format!("footnote [{}] has no definition", c.key),
                    c.key.clone(),
                ));
            }
        }
        if ctx.profile.required().contains(&"citations") {
            out.skipped("citations", reason);
        }
        return;
    };
    out.ran("citations");
    let mut reported = HashSet::new();
    for c in &doc.cites {
        if keys.contains(&c.key) || c.key == "*" {
            continue;
        }
        if !reported.insert(c.key.clone()) {
            continue;
        }
        let mut p = if c.key.starts_with('^') {
            let mut p =
                problem(doc, "unknown_citation", c.span, c.section, format!("footnote [{}] has no definition", c.key), c.key.clone());
            p.by = crate::codes::By::Agent;
            p
        } else {
            problem(doc, "unknown_citation", c.span, c.section, format!("\"{}\" is not a key in the bibliography", c.key), c.key.clone())
        };
        if let Some(n) = nearest(&c.key, keys.iter().map(String::as_str)) {
            p.message.push_str(&format!("; did you mean \"{n}\"?"));
            p.by = crate::codes::By::Agent;
        }
        if !missing.is_empty() {
            p.message.push_str(&format!(" (not found: {})", missing.join(", ")));
        }
        out.problems.push(p);
    }
}
