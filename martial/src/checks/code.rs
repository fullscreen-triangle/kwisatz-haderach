//! `code.identifiers`: every path, identifier and long flag the document names in inline
//! code exists in the repository. `code.commands`: every npm script, Cargo package,
//! binary or example, make target and script file a shell command names exists.

use std::collections::BTreeMap;

use super::{problem, Ctx, Out};
use crate::doc::{Pos, Span};
use crate::lexicon::{FILE_EXTENSIONS, SHELL_LANGS};
use crate::repo::Repo;
use crate::text::nearest;

#[derive(Debug, PartialEq, Eq)]
pub enum CodeRef {
    Path(String),
    Ident(Vec<String>),
    Flag(String),
    Command(String),
    Skip,
}

const COMMANDS: &[&str] = &[
    "npm",
    "npx",
    "pnpm",
    "yarn",
    "bun",
    "cargo",
    "python",
    "python3",
    "py",
    "node",
    "deno",
    "bash",
    "sh",
    "zsh",
    "pwsh",
    "powershell",
    "make",
    "ruby",
    "perl",
    "Rscript",
    "julia",
    "tsx",
    "ts-node",
];

fn is_ident(s: &str) -> bool {
    let mut cs = s.chars();
    matches!(cs.next(), Some(c) if c.is_ascii_alphabetic() || c == '_') && cs.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// What an inline code span names, if anything checkable. Plain words (`check`,
/// `Profile`) are not checked: nothing distinguishes them from English.
pub fn classify(text: &str, own_bins: &[&str]) -> CodeRef {
    let t = text.trim();
    if t.is_empty() {
        return CodeRef::Skip;
    }
    if t.split_whitespace().count() > 1 {
        let first = t.split_whitespace().next().unwrap_or("");
        let first = first.trim_start_matches("$");
        if COMMANDS.contains(&first) || first.starts_with("./") || own_bins.contains(&first) {
            return CodeRef::Command(t.trim_start_matches("$ ").to_string());
        }
        return CodeRef::Skip;
    }
    if t.contains("://")
        || t.starts_with('~')
        || t.contains("$(")
        || t.contains("...")
        || t.contains(['*', '?', '{', '}', '<', '>', '|', '=', '"', '\'', ','])
    {
        return CodeRef::Skip;
    }
    if let Some(v) = t.strip_prefix('$') {
        return if is_ident(v) { CodeRef::Ident(vec![v.to_string()]) } else { CodeRef::Skip };
    }
    let t = strip_line_suffix(t);
    if let Some(f) = t.strip_prefix("--") {
        return if f.chars().next().is_some_and(|c| c.is_ascii_alphanumeric())
            && f.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        {
            CodeRef::Flag(t.to_string())
        } else {
            CodeRef::Skip
        };
    }
    if t.starts_with('-')
        || t.starts_with('/')
        || t.starts_with('\\')
        || t.chars().nth(1) == Some(':') && t.chars().nth(2).is_some_and(|c| c == '\\' || c == '/')
    {
        return CodeRef::Skip;
    }
    if t.contains('/') || t.contains('\\') {
        let p = t.replace('\\', "/");
        return if p.chars().all(|c| c.is_alphanumeric() || "._-/@+".contains(c)) { CodeRef::Path(p) } else { CodeRef::Skip };
    }
    if let Some((stem, ext)) = t.rsplit_once('.') {
        if FILE_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str())
            && !stem.is_empty()
            && stem.chars().all(|c| c.is_alphanumeric() || "._-".contains(c))
        {
            return CodeRef::Path(t.to_string());
        }
    }
    // Identifiers: a::b, a.b(), a#b, f(), MACRO!, a_b, camelCase.
    let mut core = t.trim_start_matches(['&', '*']).trim_end_matches(';').to_string();
    let called = core.ends_with(')');
    if let Some(open) = core.find('(') {
        if !core.ends_with(')') {
            return CodeRef::Skip;
        }
        core.truncate(open);
    }
    let core = core.trim_end_matches('!');
    let segs: Vec<String> = core.split("::").flat_map(|s| s.split('.')).flat_map(|s| s.split('#')).map(String::from).collect();
    if segs.is_empty() || !segs.iter().all(|s| is_ident(s)) {
        return CodeRef::Skip;
    }
    let camel = |s: &str| {
        let cs: Vec<char> = s.chars().collect();
        cs.windows(2).any(|w| w[0].is_ascii_lowercase() && w[1].is_ascii_uppercase())
    };
    let signal = called || segs.len() > 1 || segs.iter().any(|s| s.trim_matches('_').contains('_') || camel(s));
    if signal {
        CodeRef::Ident(segs)
    } else {
        CodeRef::Skip
    }
}

fn strip_line_suffix(t: &str) -> &str {
    // path/to/file.rs:42 or :42:7
    let mut s = t;
    for _ in 0..2 {
        if let Some((a, b)) = s.rsplit_once(':') {
            if !b.is_empty() && b.chars().all(|c| c.is_ascii_digit()) {
                s = a;
            }
        }
    }
    s
}

pub fn identifiers(ctx: &Ctx, out: &mut Out) {
    let Some(repo) = ctx.repo else { return };
    let doc = ctx.doc;
    out.ran("code.identifiers");
    let bins: Vec<&str> = repo.cargo_bins.iter().map(String::as_str).collect();
    // Report each missing name once, at its first use, listing the others.
    let mut missing: BTreeMap<String, (usize, Vec<Pos>, String)> = BTreeMap::new();
    let mut order = 0;
    for cs in &doc.code_spans {
        let msg = match classify(&cs.text, &bins) {
            CodeRef::Path(p) => (!repo.path_exists(&p, ctx.doc_dir))
                .then(|| ("path_missing", format!("no file or directory \"{p}\" in the repository ({})", crate::display_path(&repo.root)))),
            CodeRef::Flag(f) => {
                (!repo.has_flag(&f)).then(|| ("identifier_not_in_code", format!("the flag {f} does not occur in the repository's code")))
            }
            CodeRef::Ident(segs) => {
                let absent: Vec<&String> = segs.iter().filter(|s| !repo.has_ident(s)).collect();
                (!absent.is_empty()).then(|| {
                    let names: Vec<&str> = absent.iter().map(|s| s.as_str()).collect();
                    let hint = if absent.len() == 1 {
                        nearest(absent[0], repo.idents.iter().map(String::as_str))
                            .map(|n| format!("; did you mean \"{n}\"?"))
                            .unwrap_or_default()
                    } else {
                        String::new()
                    };
                    (
                        "identifier_not_in_code",
                        format!(
                            "{} not defined or used anywhere in the repository's code{hint}",
                            names.iter().map(|n| format!("\"{n}\"")).collect::<Vec<_>>().join(", ")
                                + if absent.len() == 1 { " is" } else { " are" }
                        ),
                    )
                })
            }
            CodeRef::Command(c) => {
                command(ctx, repo, &c, cs.span, cs.section, out);
                None
            }
            CodeRef::Skip => None,
        };
        if let Some((code, message)) = msg {
            let key = format!("{code}\u{0}{}", cs.text);
            let e = missing.entry(key).or_insert_with(|| {
                order += 1;
                (order, vec![], String::new())
            });
            e.1.push(cs.span.start);
            if e.2.is_empty() {
                e.2 = message;
                let mut p = problem(doc, code, cs.span, cs.section, String::new(), cs.text.clone());
                p.message = e.2.clone();
                out.problems.push(p);
            }
        }
    }
    // Append "also at" to the problems that repeat.
    for (key, (_, at, _)) in missing {
        if at.len() < 2 {
            continue;
        }
        let text = key.split('\u{0}').nth(1).unwrap_or("");
        if let Some(p) = out.problems.iter_mut().find(|p| p.key == text && (p.code == "path_missing" || p.code == "identifier_not_in_code"))
        {
            let rest: Vec<String> = at[1..].iter().map(|q| format!("{}:{}", q.line, q.col)).collect();
            p.message.push_str(&format!(" (also at {})", rest.join(", ")));
        }
    }
}

pub fn commands(ctx: &Ctx, out: &mut Out) {
    let Some(repo) = ctx.repo else { return };
    let doc = ctx.doc;
    out.ran("code.commands");
    for b in &doc.code_blocks {
        let shell = SHELL_LANGS.contains(&b.lang.as_str());
        if !shell && !b.lang.is_empty() {
            continue;
        }
        for (line, pos) in &b.lines {
            let t = line.trim_start();
            let (t, prompted) = match t
                .strip_prefix("$ ")
                .or_else(|| t.strip_prefix("PS> "))
                .or_else(|| t.strip_prefix("> ").filter(|_| b.lang.contains("power") || b.lang == "ps1"))
            {
                Some(r) => (r, true),
                None => (t, false),
            };
            if !shell && !prompted {
                continue;
            }
            if t.starts_with('#') || t.is_empty() {
                continue;
            }
            let indent = line.chars().count() - line.trim_start().chars().count();
            let start = Pos { col: pos.col + indent as u32, ..*pos };
            let span = Span { start, end: Pos { col: pos.col + line.chars().count() as u32 - 1, ..*pos } };
            command(ctx, repo, t, span, b.section, out);
        }
    }
}

fn tokenize(seg: &str) -> Vec<String> {
    let mut out = vec![];
    let mut cur = String::new();
    let mut quote: Option<char> = None;
    for c in seg.chars() {
        match quote {
            Some(q) if c == q => quote = None,
            Some(_) => cur.push(c),
            None if c == '"' || c == '\'' => quote = Some(c),
            None if c.is_whitespace() => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
            }
            None => cur.push(c),
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

fn placeholder(a: &str) -> bool {
    a.contains(['<', '>', '{', '}', '$', '*', '[', ']']) || a.contains("...") || a.contains('…')
}

/// The value of `--name v`, `--name=v` or `-n v` in `args`.
fn option<'a>(args: &'a [String], names: &[&str]) -> Option<&'a str> {
    for (i, a) in args.iter().enumerate() {
        for n in names {
            if a == n {
                return args.get(i + 1).map(String::as_str);
            }
            if let Some(v) = a.strip_prefix(&format!("{n}=")) {
                return Some(v);
            }
        }
    }
    None
}

const YARN_BUILTINS: &[&str] = &[
    "add",
    "install",
    "remove",
    "init",
    "upgrade",
    "up",
    "workspace",
    "workspaces",
    "dlx",
    "why",
    "info",
    "config",
    "global",
    "cache",
    "set",
    "link",
    "unlink",
    "version",
    "publish",
    "pack",
    "login",
    "logout",
    "create",
    "exec",
    "node",
    "npm",
    "plugin",
    "import",
    "explain",
    "outdated",
    "audit",
    "list",
    "bin",
    "help",
];
const INTERPRETERS: &[&str] = &[
    "python",
    "python3",
    "py",
    "node",
    "deno",
    "bash",
    "sh",
    "zsh",
    "ruby",
    "perl",
    "Rscript",
    "julia",
    "pwsh",
    "powershell",
    "tsx",
    "ts-node",
];

fn command(ctx: &Ctx, repo: &Repo, line: &str, span: Span, section: usize, out: &mut Out) {
    let line = match line.find(" #") {
        Some(k) => &line[..k],
        None => line,
    };
    let mut segs = vec![line.to_string()];
    for sep in ["&&", "||", ";", "|"] {
        segs = segs.iter().flat_map(|s| s.split(sep).map(String::from).collect::<Vec<_>>()).collect();
    }
    for seg in segs {
        let mut toks = tokenize(&seg);
        while toks.first().is_some_and(|t| t.contains('=') && !t.starts_with('-') || t == "sudo" || t == "env" || t == "time") {
            toks.remove(0);
        }
        let Some(cmd) = toks.first().cloned() else { continue };
        let args = &toks[1..];
        for (what, ok, hint_from) in targets(repo, &cmd, args, ctx) {
            if !ok {
                let hint = hint_from
                    .and_then(|(name, set)| nearest(&name, set.iter().map(String::as_str)).map(|n| format!("; did you mean \"{n}\"?")))
                    .unwrap_or_default();
                out.problems.push(problem(
                    ctx.doc,
                    "command_target_missing",
                    span,
                    section,
                    format!("{what}{hint}"),
                    seg.trim().to_string(),
                ));
            }
        }
    }
}

type Target = (String, bool, Option<(String, Vec<String>)>);

fn targets(repo: &Repo, cmd: &str, args: &[String], ctx: &Ctx) -> Vec<Target> {
    let mut out: Vec<Target> = vec![];
    let names = |set: &std::collections::HashSet<String>| set.iter().cloned().collect::<Vec<_>>();
    match cmd {
        "npm" | "pnpm" | "bun" => {
            let a0 = args.iter().find(|a| !a.starts_with('-')).map(String::as_str);
            let script = match a0 {
                Some("run") | Some("run-script") => {
                    args.iter().skip_while(|a| !matches!(a.as_str(), "run" | "run-script")).nth(1).map(String::as_str)
                }
                Some("test") | Some("t") | Some("start") | Some("stop") | Some("restart") => a0,
                _ => None,
            };
            if let Some(s) = script.filter(|s| !placeholder(s) && !s.starts_with('-')) {
                let s = if s == "t" { "test" } else { s };
                out.push((
                    format!("no package.json script \"{s}\" in the repository"),
                    repo.npm_scripts.contains(s),
                    Some((s.to_string(), names(&repo.npm_scripts))),
                ));
            }
        }
        "yarn" => {
            let a0 = args.iter().find(|a| !a.starts_with('-')).map(String::as_str);
            let script = match a0 {
                Some("run") => args.iter().skip_while(|a| a.as_str() != "run").nth(1).map(String::as_str),
                Some(s) if !YARN_BUILTINS.contains(&s) => Some(s),
                _ => None,
            };
            if let Some(s) = script.filter(|s| !placeholder(s)) {
                out.push((
                    format!("no package.json script \"{s}\" in the repository"),
                    repo.npm_scripts.contains(s),
                    Some((s.to_string(), names(&repo.npm_scripts))),
                ));
            }
        }
        "cargo" => {
            if let Some(p) = option(args, &["-p", "--package"]).filter(|p| !placeholder(p)) {
                out.push((
                    format!("no Cargo package \"{p}\" in the repository"),
                    repo.cargo_packages.contains(p),
                    Some((p.to_string(), names(&repo.cargo_packages))),
                ));
            }
            if let Some(e) = option(args, &["--example"]).filter(|p| !placeholder(p)) {
                out.push((
                    format!("no Cargo example \"{e}\" in the repository"),
                    repo.cargo_examples.contains(e),
                    Some((e.to_string(), names(&repo.cargo_examples))),
                ));
            }
            if let Some(b) = option(args, &["--bin"]).filter(|p| !placeholder(p)) {
                out.push((
                    format!("no Cargo binary \"{b}\" in the repository"),
                    repo.cargo_bins.contains(b),
                    Some((b.to_string(), names(&repo.cargo_bins))),
                ));
            }
            if args.first().map(String::as_str) == Some("install") {
                if let Some(p) = option(args, &["--path"]).filter(|p| !placeholder(p)) {
                    out.push((format!("no directory \"{p}\" for cargo install --path"), repo.path_exists(p, ctx.doc_dir), None));
                }
            }
        }
        "make" => {
            for t in args.iter().filter(|a| !a.starts_with('-') && !a.contains('=') && !placeholder(a)) {
                if !repo.has_makefile {
                    out.push(("make is used but the repository has no Makefile".to_string(), false, None));
                    break;
                }
                out.push((
                    format!("no make target \"{t}\""),
                    repo.make_targets.contains(t.as_str()),
                    Some((t.clone(), names(&repo.make_targets))),
                ));
            }
        }
        c if INTERPRETERS.contains(&c) => {
            let mut i = 0;
            while i < args.len() {
                let a = &args[i];
                if a == "-m" {
                    if let Some(m) = args.get(i + 1).filter(|m| !placeholder(m)) {
                        let root = m.split('.').next().unwrap_or(m);
                        if repo.path_exists(root, ctx.doc_dir) {
                            let p = m.replace('.', "/");
                            let ok = [format!("{p}.py"), format!("{p}/__init__.py"), format!("{p}/__main__.py")]
                                .iter()
                                .any(|c| repo.path_exists(c, ctx.doc_dir));
                            out.push((format!("no Python module \"{m}\" in the repository"), ok, None));
                        }
                    }
                    break;
                }
                if a == "-c" || a == "-e" || a == "--eval" || a == "-Command" {
                    break;
                }
                if a.starts_with('-') || (c == "deno" && a == "run") {
                    i += 1;
                    continue;
                }
                if !placeholder(a)
                    && (a.contains('/') || a.contains('\\') || a.rsplit_once('.').is_some_and(|(_, e)| FILE_EXTENSIONS.contains(&e)))
                {
                    out.push((format!("no script \"{a}\" in the repository"), repo.path_exists(&a.replace('\\', "/"), ctx.doc_dir), None));
                }
                break;
            }
        }
        c if repo.cargo_bins.contains(c) => {
            // The repository's own program: its long flags must exist in its code.
            for a in args.iter().filter(|a| a.starts_with("--") && a.len() > 2 && !placeholder(a)) {
                let flag = a.split('=').next().unwrap_or(a);
                out.push((format!("{c} has no flag {flag} in the repository's code"), repo.has_flag(flag), None));
            }
        }
        c if (c.starts_with("./") || c.contains('/')) && !placeholder(c) => {
            out.push((format!("no executable \"{c}\" in the repository"), repo.path_exists(c, ctx.doc_dir), None));
        }
        _ => {}
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_code_spans() {
        let b = ["martial"];
        assert_eq!(classify("src/lib.rs:42", &b), CodeRef::Path("src/lib.rs".into()));
        assert_eq!(classify("Cargo.toml", &b), CodeRef::Path("Cargo.toml".into()));
        assert_eq!(classify("--max-words", &b), CodeRef::Flag("--max-words".into()));
        assert_eq!(classify("serde_json::Value", &b), CodeRef::Ident(vec!["serde_json".into(), "Value".into()]));
        assert_eq!(classify("check()", &b), CodeRef::Ident(vec!["check".into()]));
        assert_eq!(classify("fieldsUsed", &b), CodeRef::Ident(vec!["fieldsUsed".into()]));
        assert_eq!(classify("$HF_TOKEN", &b), CodeRef::Ident(vec!["HF_TOKEN".into()]));
        assert_eq!(classify("npm run build", &b), CodeRef::Command("npm run build".into()));
        assert_eq!(classify("martial check README.md", &b), CodeRef::Command("martial check README.md".into()));
        for skip in ["check", "Profile", "-v", "https://x.y/z", "a=b", "*.md", "<file>", "C:/x", "\"quoted\"", "v0.1.0"] {
            assert_eq!(classify(skip, &b), CodeRef::Skip, "{skip}");
        }
    }

    #[test]
    fn tokenizes_quotes() {
        assert_eq!(tokenize("npm run \"a b\" -w x"), ["npm", "run", "a b", "-w", "x"]);
    }
}
