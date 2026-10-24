//! martial: a deterministic reviewer for prose that AI agents edit.
//!
//! The calling agent writes; martial judges. It reads a manuscript or a software document
//! and returns, by location and stable code, what is unclear, unsupported, unresolved,
//! or — against the version an edit started from — no longer true. It has no model
//! inside: the same text always gets the same report, so an agent can tell whether its
//! edits made progress, and two agents reviewing one text agree.

pub mod bib;
pub mod checks;
pub mod codes;
pub mod describe;
pub mod doc;
pub mod latex;
pub mod lexicon;
pub mod markdown;
pub mod mcp;
pub mod profile;
pub mod repo;
pub mod report;
pub mod sha256;
pub mod sidecar;
pub mod text;

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::Serialize;

use checks::{evidence, Ctx, Out, Problem, Sources};
use codes::Status;
use doc::{Builder, Document, Format};
use profile::Profile;
use report::{DriftSummary, Inputs, Report, Summary, Verdict, Waived};
use sidecar::Sidecar;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// What to check. Either `path` or `text` is given.
#[derive(Clone, Debug, Default)]
pub struct Request {
    pub path: Option<PathBuf>,
    pub text: Option<String>,
    /// Display name for `text` input.
    pub name: Option<String>,
    pub format: Option<Format>,
    pub profile: Option<Profile>,
    pub sidecar: Option<PathBuf>,
    pub no_sidecar: bool,
    pub sources: Option<PathBuf>,
    pub repo: Option<PathBuf>,
    pub against: Option<PathBuf>,
}

/// A path as the user would type it: relative to the working directory when it is
/// inside it, with forward slashes.
pub fn display_path(p: &Path) -> String {
    let cwd = std::env::current_dir().ok();
    let abs = if p.is_absolute() { p.to_path_buf() } else { cwd.as_ref().map(|c| c.join(p)).unwrap_or_else(|| p.to_path_buf()) };
    let shown = match cwd.as_ref().and_then(|c| abs.strip_prefix(c).ok()) {
        Some(r) if !r.as_os_str().is_empty() => r.to_path_buf(),
        Some(_) => PathBuf::from("."),
        None => p.to_path_buf(),
    };
    let s = shown.to_string_lossy().replace('\\', "/");
    s.strip_prefix("./").map(String::from).unwrap_or(s)
}

/// Reads a document from a file or from text.
pub fn read_document(
    path: Option<&Path>,
    text: Option<&str>,
    name: Option<&str>,
    format: Option<Format>,
) -> Result<(Document, String), String> {
    let (body, name, base, file_path) = match (path, text) {
        (_, Some(t)) => {
            let base = path.and_then(Path::parent).map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."));
            let name = name.map(String::from).or_else(|| path.map(display_path)).unwrap_or_else(|| "<text>".into());
            let file = path.map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from(&name));
            (t.to_string(), name, base, file)
        }
        (Some(p), None) => {
            let body = std::fs::read_to_string(p).map_err(|e| format!("cannot read {}: {e}", display_path(p)))?;
            let base = p.parent().map(Path::to_path_buf).filter(|b| !b.as_os_str().is_empty()).unwrap_or_else(|| PathBuf::from("."));
            (body, display_path(p), base, p.to_path_buf())
        }
        (None, None) => return Err("give a file path or text".into()),
    };
    let format = format.unwrap_or_else(|| Format::from_path(&file_path));
    let mut b = Builder::new(format, base);
    match format {
        Format::Markdown => {
            let f = b.add_file(name, file_path, &body);
            markdown::read(&mut b, f, &body);
        }
        Format::Latex => latex::read(&mut b, &file_path, name, &body),
    }
    Ok((b.finish(), body))
}

/// The git root above `dir`, if any.
pub fn git_root(dir: &Path) -> Option<PathBuf> {
    let start = if dir.is_absolute() { dir.to_path_buf() } else { std::env::current_dir().ok()?.join(dir) };
    let mut d = start.as_path();
    loop {
        if d.join(".git").exists() {
            return Some(d.to_path_buf());
        }
        d = d.parent()?;
    }
}

fn identity(p: &Problem) -> String {
    format!("{}|{}", p.code, text::normalize(&p.key))
}

/// Runs every check the profile selects except drift.
fn run_checks(ctx: &Ctx, ix: &evidence::Index, out: &mut Out) {
    checks::structure::structure(ctx, out);
    if ctx.profile.runs("citations") {
        checks::structure::citations(ctx, out);
    }
    checks::clarity::clarity(ctx, out);
    if ctx.profile.runs("evidence.support") || ctx.profile.runs("evidence.quotes") {
        checks::evidence::evidence(ctx, ix, out);
    }
    for check in ["code.identifiers", "code.commands"] {
        if !ctx.profile.runs(check) {
            continue;
        }
        if ctx.repo.is_none() {
            if ctx.profile.required().contains(&check) {
                out.skipped(check, "no repository: pass --repo DIR (the default, the git root above the document, was not found)".into());
            }
            continue;
        }
        if check == "code.identifiers" {
            checks::code::identifiers(ctx, out);
        } else {
            checks::code::commands(ctx, out);
        }
    }
}

pub fn check(req: &Request) -> Result<Report, String> {
    let (doc, body) = read_document(req.path.as_deref(), req.text.as_deref(), req.name.as_deref(), req.format)?;
    let doc_dir = doc.base_dir.clone();

    let sidecar_path = req.sidecar.clone().or_else(|| {
        if req.no_sidecar {
            None
        } else {
            req.path.as_deref().map(sidecar::default_path).filter(|p| p.exists())
        }
    });
    let sidecar = match &sidecar_path {
        Some(p) => sidecar::load(p),
        None => Sidecar::default(),
    };

    let (profile, profile_from) = match (req.profile, sidecar.profile) {
        (Some(p), _) => (p, "argument"),
        (None, Some(p)) => (p, "sidecar"),
        (None, None) => (if doc.format == Format::Latex { Profile::Manuscript } else { Profile::SoftwareDoc }, "default"),
    };
    let mut notes = doc.notes.clone();
    if profile_from == "default" {
        notes.push(format!("profile defaulted to {} from the file type; pass --profile manuscript|software-doc|general", profile.name()));
    }

    let sources_dir = req.sources.clone().or_else(|| sidecar.sources.clone());
    let sources = match &sources_dir {
        Some(d) => Some(Sources::open(d)?),
        None => None,
    };

    let wants_repo = profile.required().iter().chain(profile.optional()).any(|c| c.starts_with("code."));
    let (repo_dir, repo_from) = match (&req.repo, &sidecar.repo) {
        (Some(r), _) => (Some(r.clone()), Some("argument")),
        (None, Some(r)) => (Some(r.clone()), Some("sidecar")),
        (None, None) if profile.required().iter().any(|c| c.starts_with("code.")) => (git_root(&doc_dir), Some("git root")),
        _ => (None, None),
    };
    if let Some(r) = &repo_dir {
        if !r.is_dir() {
            return Err(format!("repository {} is not a directory", display_path(r)));
        }
    }
    let repo = repo_dir.as_deref().filter(|_| wants_repo).map(repo::Repo::scan);
    if repo.as_ref().is_some_and(|r| r.truncated) {
        notes.push("the repository has more than 50000 files; only the first were read".into());
    }

    let ctx = Ctx { doc: &doc, profile, sidecar: &sidecar, sources: sources.as_ref(), repo: repo.as_ref(), doc_dir: &doc_dir };
    let mut out = Out::default();

    if sidecar_path.is_some() {
        out.ran("sidecar");
        for p in &sidecar.problems {
            out.problems.push(checks::sidecar_problem(&sidecar, p.code, &p.pointer, p.message.clone(), String::new()));
        }
    }
    let ix = evidence::index(&ctx, &mut out);
    run_checks(&ctx, &ix, &mut out);

    let mut drift = None;
    if let Some(old_path) = &req.against {
        let (old, _) = read_document(Some(old_path), None, None, Some(doc.format))?;
        let old_sidecar = Sidecar { evidence: vec![], waivers: vec![], problems: vec![], ..sidecar.clone() };
        let old_dir = old.base_dir.clone();
        let octx = Ctx { doc: &old, profile, sidecar: &old_sidecar, sources: sources.as_ref(), repo: repo.as_ref(), doc_dir: &old_dir };
        let mut oout = Out::default();
        let oix = evidence::index(&octx, &mut oout);
        run_checks(&octx, &oix, &mut oout);
        let old_keys: HashSet<String> = oout.problems.iter().map(identity).collect();
        let mut new_keys = HashSet::new();
        let mut new = 0;
        for p in out.problems.iter_mut().filter(|p| p.order.0 < u32::MAX - 2) {
            let id = identity(p);
            let is_new = !old_keys.contains(&id);
            new += usize::from(is_new);
            p.new = Some(is_new);
            new_keys.insert(id);
        }
        let fixed = old_keys.difference(&new_keys).count();
        let before = out.problems.len();
        checks::drift::drift(&ctx, &old, &ix, &mut out);
        for p in &mut out.problems[before..] {
            p.new = Some(true);
            new += 1;
        }
        drift = Some(DriftSummary { against: display_path(old_path), new, fixed });
    }

    // Waivers set aside waivable problems, visibly; a waiver that matches nothing is itself a problem.
    let mut used = vec![false; sidecar.waivers.len()];
    let mut waived = vec![];
    let mut kept = vec![];
    for p in out.problems.drain(..) {
        let w = codes::info(p.code).waivable.then(|| {
            sidecar.waivers.iter().position(|w| {
                let t = text::normalize(&w.text);
                w.code == p.code && (text::normalize(&p.key).contains(&t) || text::normalize(&p.excerpt).contains(&t))
            })
        });
        match w.flatten() {
            Some(k) => {
                used[k] = true;
                let w = &sidecar.waivers[k];
                waived.push(Waived {
                    at: p.at.clone(),
                    code: p.code,
                    excerpt: p.excerpt.clone(),
                    reason: w.reason.clone(),
                    waiver: format!("/waivers/{}", w.index),
                });
            }
            None => kept.push(p),
        }
    }
    for (k, w) in sidecar.waivers.iter().enumerate() {
        if !used[k] {
            kept.push(checks::sidecar_problem(
                &sidecar,
                "waiver_unused",
                &format!("/waivers/{}", w.index),
                format!("no {} problem matches \"{}\"", w.code, w.text),
                w.text.clone(),
            ));
        }
    }

    // Weight: 1 + references into the problem's section.
    let mut weight = vec![1u32; doc.sections.len()];
    for l in &doc.labels {
        let n = doc.refs.iter().filter(|r| r.target == l.name).count() as u32;
        if let Some(w) = weight.get_mut(l.section) {
            *w += n;
        }
    }
    for (a, s) in &doc.anchors {
        let n = doc.links.iter().filter(|l| l.target.strip_prefix('#') == Some(a.as_str())).count() as u32;
        if let Some(w) = weight.get_mut(*s) {
            *w += n;
        }
    }
    for p in &mut kept {
        if p.order.0 < u32::MAX - 2 {
            p.weight = weight.get(p.section).copied().unwrap_or(1);
        }
    }
    kept.sort_by(|a, b| {
        let rank = |p: &Problem| u8::from(p.status != Status::Violated);
        rank(a).cmp(&rank(b)).then(b.weight.cmp(&a.weight)).then(a.order.cmp(&b.order)).then(a.code.cmp(b.code))
    });

    let mut report = Report {
        martial: VERSION,
        file: doc.names.first().cloned().unwrap_or_default(),
        format: doc.format.name(),
        stage: sha256::hex(body.as_bytes()),
        profile,
        profile_from,
        verdict: Verdict::Clean,
        summary: Summary::default(),
        problems: kept,
        waived,
        declared: out.declared,
        checked: out.checked,
        not_checked: out.not_checked,
        drift,
        inputs: Inputs {
            sidecar: sidecar_path.as_deref().map(display_path),
            sources: sources_dir.as_deref().map(display_path),
            repo: repo.as_ref().map(|r| display_path(&r.root)),
            repo_from: repo.as_ref().and(repo_from),
        },
        notes,
    };
    report.decide();
    Ok(report)
}

#[derive(Clone, Debug, Serialize)]
pub struct ClaimRow {
    pub at: String,
    pub sentence: String,
    pub cites: Vec<String>,
    pub refs: Vec<String>,
    /// "cited", "internal", "link", "abstract" or "none".
    pub support: &'static str,
    pub strength: i32,
}

#[derive(Clone, Debug, Serialize)]
pub struct Claims {
    pub martial: &'static str,
    pub file: String,
    pub profile: Profile,
    pub claims: Vec<ClaimRow>,
    /// A sidecar to start from: one evidence entry per cited claim, quotes left empty.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skeleton: Option<serde_json::Value>,
}

/// Lists the sentences martial treats as claims, and how each is supported.
pub fn claims(req: &Request, skeleton: bool) -> Result<Claims, String> {
    let (doc, _) = read_document(req.path.as_deref(), req.text.as_deref(), req.name.as_deref(), req.format)?;
    let profile = req.profile.unwrap_or(if doc.format == Format::Latex { Profile::Manuscript } else { Profile::SoftwareDoc });
    let mut rows = vec![];
    let mut entries = vec![];
    for s in &doc.sentences {
        if !evidence::is_claim(s, profile) {
            continue;
        }
        let support = if s.env == doc::EnvClass::Abstract {
            "abstract"
        } else if !s.cites.is_empty() {
            "cited"
        } else if evidence::internal(s) {
            "internal"
        } else if !s.links.is_empty() {
            "link"
        } else {
            "none"
        };
        if support == "cited" {
            let claim: String = s.raw.chars().take(60).collect();
            let claim = match claim.rfind(' ') {
                Some(k) if s.raw.chars().count() > 60 && k > 20 => claim[..k].to_string(),
                _ => claim,
            };
            entries.push(serde_json::json!({"claim": claim, "source": s.cites[0], "quote": ""}));
        }
        rows.push(ClaimRow {
            at: doc.at(s.span.start),
            sentence: doc::truncate(&s.text, 200),
            cites: s.cites.clone(),
            refs: s.refs.clone(),
            support,
            strength: evidence::strength(&s.text),
        });
    }
    Ok(Claims {
        martial: VERSION,
        file: doc.names.first().cloned().unwrap_or_default(),
        profile,
        claims: rows,
        skeleton: skeleton.then(|| serde_json::json!({"version": sidecar::VERSION, "profile": profile.name(), "evidence": entries})),
    })
}
