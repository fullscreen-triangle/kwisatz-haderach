//! What a repository defines, as far as a document can name it: files, identifiers and
//! flags in source files, npm scripts, Cargo packages/binaries/examples and make targets.
//! Dependencies, build output and agent worktrees are not read (`lexicon::SKIP_DIRS`).

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::lexicon::{CODE_EXTENSIONS, SKIP_DIRS};

const MAX_FILES: usize = 50_000;
const MAX_BYTES: u64 = 1_000_000;

#[derive(Debug, Default)]
pub struct Repo {
    pub root: PathBuf,
    /// Relative paths with forward slashes, files and directories.
    pub paths: HashSet<String>,
    pub idents: HashSet<String>,
    /// Long flags without the leading `--`, and hyphenated words from string literals.
    pub flags: HashSet<String>,
    pub npm_scripts: HashSet<String>,
    pub cargo_packages: HashSet<String>,
    pub cargo_bins: HashSet<String>,
    pub cargo_examples: HashSet<String>,
    pub make_targets: HashSet<String>,
    pub has_makefile: bool,
    pub truncated: bool,
}

impl Repo {
    pub fn scan(root: &Path) -> Repo {
        let mut r = Repo { root: root.to_path_buf(), ..Repo::default() };
        let mut stack = vec![root.to_path_buf()];
        let mut files = 0usize;
        while let Some(dir) = stack.pop() {
            let Ok(entries) = std::fs::read_dir(&dir) else { continue };
            let mut entries: Vec<_> = entries.flatten().collect();
            entries.sort_by_key(|e| e.file_name());
            for e in entries {
                let path = e.path();
                let name = e.file_name().to_string_lossy().to_string();
                let Ok(ft) = e.file_type() else { continue };
                let rel = rel(root, &path);
                if ft.is_dir() {
                    if SKIP_DIRS.contains(&name.as_str()) {
                        continue;
                    }
                    r.paths.insert(rel);
                    stack.push(path);
                    continue;
                }
                if !ft.is_file() {
                    continue;
                }
                files += 1;
                if files > MAX_FILES {
                    r.truncated = true;
                    return r;
                }
                r.paths.insert(rel.clone());
                r.read_file(&path, &rel, &name);
            }
        }
        r
    }

    fn read_file(&mut self, path: &Path, rel: &str, name: &str) {
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();
        let special = matches!(name, "Makefile" | "makefile" | "GNUmakefile" | "Dockerfile" | "Justfile" | "justfile");
        if !(CODE_EXTENSIONS.contains(&ext.as_str()) || special) {
            return;
        }
        if std::fs::metadata(path).map(|m| m.len() > MAX_BYTES).unwrap_or(true) {
            return;
        }
        let Ok(text) = std::fs::read_to_string(path) else { return };
        tokens(&text, &mut self.idents, &mut self.flags);
        match name {
            "package.json" => {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(s) = v.get("scripts").and_then(|s| s.as_object()) {
                        self.npm_scripts.extend(s.keys().cloned());
                    }
                }
            }
            "Cargo.toml" => self.cargo(&text, path.parent().unwrap_or(Path::new("."))),
            "Makefile" | "makefile" | "GNUmakefile" => {
                self.has_makefile = true;
                for line in text.lines() {
                    if line.starts_with(['\t', ' ', '#', '.']) {
                        continue;
                    }
                    if let Some(colon) = line.find(':') {
                        if line[colon + 1..].starts_with('=') || line[..colon].contains('=') {
                            continue;
                        }
                        for t in line[..colon].split_whitespace() {
                            self.make_targets.insert(t.to_string());
                        }
                    }
                }
            }
            _ => {}
        }
        if ext == "rs" {
            // Cargo's implicit targets: examples/<x>.rs, src/bin/<x>.rs.
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if rel.contains("examples/") && !rel.contains("/src/") {
                    let parent = path.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()).unwrap_or("");
                    if parent == "examples" {
                        self.cargo_examples.insert(stem.to_string());
                    } else if stem == "main" {
                        self.cargo_examples.insert(parent.to_string());
                    }
                }
                if rel.contains("src/bin/") {
                    self.cargo_bins.insert(stem.to_string());
                }
            }
        }
    }

    fn cargo(&mut self, text: &str, dir: &Path) {
        let mut table = String::new();
        for line in text.lines() {
            let t = line.trim();
            if t.starts_with('[') {
                table = t.trim_matches(|c| c == '[' || c == ']').trim().to_string();
                continue;
            }
            let Some(v) = t.strip_prefix("name").map(str::trim_start).and_then(|r| r.strip_prefix('=')) else { continue };
            let v = v.trim().trim_matches('"').to_string();
            match table.as_str() {
                "package" => {
                    if dir.join("src/main.rs").exists() {
                        self.cargo_bins.insert(v.clone());
                    }
                    self.cargo_packages.insert(v);
                }
                "bin" => {
                    self.cargo_bins.insert(v);
                }
                "example" => {
                    self.cargo_examples.insert(v);
                }
                _ => {}
            }
        }
    }

    /// Whether a path named in a document exists: relative to the repository root, to the
    /// document's directory, or as the tail of a repository path.
    pub fn path_exists(&self, p: &str, doc_dir: &Path) -> bool {
        let p = p.trim_start_matches("./").trim_end_matches('/');
        if p.is_empty() {
            return true;
        }
        if self.root.join(p).exists() || doc_dir.join(p).exists() {
            return true;
        }
        let tail = format!("/{p}");
        self.paths.iter().any(|x| x == p || x.ends_with(&tail))
    }

    pub fn has_ident(&self, s: &str) -> bool {
        self.idents.contains(s)
    }

    pub fn has_flag(&self, flag: &str) -> bool {
        let f = flag.trim_start_matches('-');
        self.flags.contains(f) || self.idents.contains(&f.replace('-', "_"))
    }
}

fn rel(root: &Path, p: &Path) -> String {
    p.strip_prefix(root).unwrap_or(p).to_string_lossy().replace('\\', "/")
}

/// Identifiers (`[A-Za-z_][A-Za-z0-9_]*`), long flags (`--x-y`) and hyphenated words.
pub fn tokens(text: &str, idents: &mut HashSet<String>, flags: &mut HashSet<String>) {
    let cs: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < cs.len() {
        let c = cs[i];
        if c.is_ascii_alphabetic() || c == '_' {
            let s = i;
            while i < cs.len() && (cs[i].is_ascii_alphanumeric() || cs[i] == '_') {
                i += 1;
            }
            let word: String = cs[s..i].iter().collect();
            // A hyphenated run (`dry-run`) is also a flag name.
            let mut j = i;
            let mut hyph = word.clone();
            while j + 1 < cs.len() && cs[j] == '-' && cs[j + 1].is_ascii_alphanumeric() {
                let k0 = j + 1;
                let mut k = k0;
                while k < cs.len() && (cs[k].is_ascii_alphanumeric() || cs[k] == '_') {
                    k += 1;
                }
                hyph.push('-');
                hyph.extend(&cs[k0..k]);
                j = k;
            }
            if hyph.len() > word.len() {
                flags.insert(hyph);
            }
            idents.insert(word);
        } else if c == '-' && i + 2 < cs.len() && cs[i + 1] == '-' && cs[i + 2].is_ascii_alphanumeric() {
            let s = i + 2;
            i = s;
            while i < cs.len() && (cs[i].is_ascii_alphanumeric() || cs[i] == '-' || cs[i] == '_') {
                i += 1;
            }
            let f: String = cs[s..i].iter().collect();
            flags.insert(f.trim_end_matches('-').to_string());
        } else {
            i += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_find_identifiers_flags_and_hyphenated_names() {
        let (mut i, mut f) = (HashSet::new(), HashSet::new());
        tokens("fn run_all(dry_run: bool) { arg(\"--max-words\"); name = \"dry-run\" }", &mut i, &mut f);
        assert!(i.contains("run_all") && i.contains("dry_run"));
        assert!(f.contains("max-words") && f.contains("dry-run"));
    }
}
