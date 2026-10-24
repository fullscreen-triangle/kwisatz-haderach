//! The checks. Each reads the document (and, when given, the repository, the sources and
//! the sidecar) and appends problems; each also says whether it ran, so a report can
//! distinguish "nothing found" from "not looked at".

pub mod clarity;
pub mod code;
pub mod drift;
pub mod evidence;
pub mod structure;

use std::path::Path;

use serde::Serialize;

use crate::codes::{self, By, Status};
use crate::doc::{Document, Span};
use crate::profile::Profile;
use crate::repo::Repo;
use crate::sidecar::Sidecar;

pub use evidence::Sources;

pub struct Ctx<'a> {
    pub doc: &'a Document,
    pub profile: Profile,
    pub sidecar: &'a Sidecar,
    pub sources: Option<&'a Sources>,
    pub repo: Option<&'a Repo>,
    pub doc_dir: &'a Path,
}

#[derive(Clone, Debug, Serialize)]
pub struct Problem {
    pub at: String,
    pub file: String,
    pub line: u32,
    pub col: u32,
    pub end_line: u32,
    pub end_col: u32,
    pub code: &'static str,
    pub status: Status,
    pub by: By,
    pub message: String,
    pub excerpt: String,
    /// 1 + the number of references into the section the problem is in: problems in
    /// load-bearing sections rank first.
    pub weight: u32,
    /// With `--against`: whether the problem is absent from the version edited from.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new: Option<bool>,
    /// What the problem is about (the sentence, token or target), for waivers and drift.
    #[serde(skip)]
    pub key: String,
    #[serde(skip)]
    pub section: usize,
    /// Sort position: (file rank, line, col).
    #[serde(skip)]
    pub order: (u32, u32, u32),
}

#[derive(Clone, Debug, Serialize)]
pub struct NotChecked {
    pub check: &'static str,
    pub reason: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Declared {
    pub at: String,
    pub sentence: String,
    pub reason: String,
}

#[derive(Default)]
pub struct Out {
    pub problems: Vec<Problem>,
    pub checked: Vec<&'static str>,
    pub not_checked: Vec<NotChecked>,
    pub declared: Vec<Declared>,
}

impl Out {
    pub fn ran(&mut self, check: &'static str) {
        if !self.checked.contains(&check) {
            self.checked.push(check);
        }
    }
    pub fn skipped(&mut self, check: &'static str, reason: String) {
        if !self.not_checked.iter().any(|n| n.check == check) {
            self.not_checked.push(NotChecked { check, reason });
        }
    }
}

const EXCERPT: usize = 160;

/// A problem at a span of the document.
pub fn problem(doc: &Document, code: &'static str, span: Span, section: usize, message: String, key: String) -> Problem {
    let info = codes::info(code);
    Problem {
        at: doc.at(span.start),
        file: doc.name(span.start).to_string(),
        line: span.start.line,
        col: span.start.col,
        end_line: span.end.line,
        end_col: span.end.col,
        code,
        status: info.status,
        by: info.by,
        message,
        excerpt: doc.excerpt(span, EXCERPT),
        weight: 1,
        new: None,
        key,
        section,
        order: (span.start.file as u32, span.start.line, span.start.col),
    }
}

/// A problem in the sidecar, located by JSON pointer.
pub fn sidecar_problem(sidecar: &Sidecar, code: &'static str, pointer: &str, message: String, excerpt: String) -> Problem {
    let info = codes::info(code);
    let file = if sidecar.name.is_empty() { "sidecar".to_string() } else { sidecar.name.clone() };
    Problem {
        at: format!("{file}#{pointer}"),
        file,
        line: 0,
        col: 0,
        end_line: 0,
        end_col: 0,
        code,
        status: info.status,
        by: info.by,
        message,
        excerpt: crate::doc::truncate(&excerpt, EXCERPT),
        weight: 1,
        new: None,
        key: pointer.to_string(),
        section: 0,
        order: (u32::MAX - 1, 0, 0),
    }
}
