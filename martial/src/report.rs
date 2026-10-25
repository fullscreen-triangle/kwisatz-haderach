//! The report an agent receives. The verdict is decided by the problems and by which
//! required checks ran — never by the agent, and never by a score.

use serde::Serialize;

use crate::checks::{Declared, NotChecked, Problem};
use crate::codes::{By, Status};
use crate::profile::Profile;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Verdict {
    /// Every required check ran and nothing is violated or undecided.
    Clean,
    Violated,
    /// Nothing is violated, but something the checks cannot decide remains.
    Undecided,
    /// Nothing was found, but a required check could not run. Not a pass.
    Incomplete,
}

impl Verdict {
    pub fn exit_code(self) -> i32 {
        match self {
            Verdict::Clean => 0,
            Verdict::Violated => 1,
            Verdict::Undecided | Verdict::Incomplete => 3,
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Verdict::Clean => "clean",
            Verdict::Violated => "violated",
            Verdict::Undecided => "undecided",
            Verdict::Incomplete => "incomplete",
        }
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct Waived {
    pub at: String,
    pub code: &'static str,
    pub excerpt: String,
    pub reason: String,
    pub waiver: String,
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct Summary {
    pub violated: usize,
    pub undecided: usize,
    pub for_author: usize,
    pub waived: usize,
}

#[derive(Clone, Debug, Serialize)]
pub struct DriftSummary {
    pub against: String,
    /// Problems absent from the version edited from.
    pub new: usize,
    /// Problems of the version edited from that are gone.
    pub fixed: usize,
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct Inputs {
    pub sidecar: Option<String>,
    pub sources: Option<String>,
    pub repo: Option<String>,
    /// "argument", "sidecar" or "git root".
    pub repo_from: Option<&'static str>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Report {
    pub martial: &'static str,
    pub file: String,
    pub format: &'static str,
    /// SHA-256 of the document's text: the exact stage judged.
    pub stage: String,
    pub profile: Profile,
    /// "argument", "sidecar" or "default".
    pub profile_from: &'static str,
    pub verdict: Verdict,
    pub summary: Summary,
    pub problems: Vec<Problem>,
    pub waived: Vec<Waived>,
    pub declared: Vec<Declared>,
    pub checked: Vec<&'static str>,
    pub not_checked: Vec<NotChecked>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drift: Option<DriftSummary>,
    pub inputs: Inputs,
    pub notes: Vec<String>,
}

impl Report {
    pub fn decide(&mut self) {
        let violated = self.problems.iter().filter(|p| p.status == Status::Violated).count();
        let undecided = self.problems.len() - violated;
        self.summary = Summary {
            violated,
            undecided,
            for_author: self.problems.iter().filter(|p| p.by == By::Author).count(),
            waived: self.waived.len(),
        };
        self.verdict = if violated > 0 {
            Verdict::Violated
        } else if undecided > 0 {
            Verdict::Undecided
        } else if !self.not_checked.is_empty() {
            Verdict::Incomplete
        } else {
            Verdict::Clean
        };
    }

    pub fn text(&self) -> String {
        let mut o = String::new();
        let stage: String = self.stage.chars().take(12).collect();
        o.push_str(&format!("martial {} · {} · {} · stage {}\n", self.martial, self.file, self.profile.name(), stage));
        let s = &self.summary;
        let mut counts = vec![format!("{} violated", s.violated), format!("{} undecided", s.undecided)];
        if s.for_author > 0 {
            counts.push(format!("{} for the author", s.for_author));
        }
        if s.waived > 0 {
            counts.push(format!("{} waived", s.waived));
        }
        o.push_str(&format!("verdict {}: {}\n", self.verdict.name(), counts.join(", ")));
        if let Some(d) = &self.drift {
            o.push_str(&format!("against {}: {} new, {} fixed\n", d.against, d.new, d.fixed));
        }
        for n in &self.not_checked {
            o.push_str(&format!("not checked: {}: {}\n", n.check, n.reason));
        }
        for n in &self.notes {
            o.push_str(&format!("note: {n}\n"));
        }
        for p in &self.problems {
            let by = match p.by {
                By::Agent => "agent",
                By::Author => "author",
            };
            let status = match p.status {
                Status::Violated => "violated",
                Status::Undecided => "undecided",
            };
            let new = match p.new {
                Some(true) => " new",
                _ => "",
            };
            o.push_str(&format!("\n{} {status} {} [{by}]{new}\n", p.at, p.code));
            if !p.excerpt.is_empty() {
                o.push_str(&format!("  > {}\n", p.excerpt));
            }
            o.push_str(&format!("  {}\n", p.message));
        }
        if !self.waived.is_empty() {
            o.push('\n');
            for w in &self.waived {
                o.push_str(&format!("waived {} {} ({}): {}\n", w.at, w.code, w.waiver, w.reason));
            }
        }
        if !self.declared.is_empty() {
            o.push('\n');
            for d in &self.declared {
                o.push_str(&format!("declared not a claim {}: {}\n", d.at, d.reason));
            }
        }
        o.push('\n');
        o.push_str(match self.verdict {
            Verdict::Clean => "Every required check ran and found nothing. That is not a judgement that the text is good: `martial describe` lists what is checked.\n",
            Verdict::Incomplete => "Nothing found, but a required check did not run. Do not report this as clean.\n",
            _ => "Fix what is yours (by=agent) and run martial again on the edited file with --against the previous version.\n",
        });
        if s.for_author > 0 {
            o.push_str(&format!(
                "{} problem(s) only the author can resolve: report them to your user; do not rewrite around them.\n",
                s.for_author
            ));
        }
        o
    }

    /// GitHub Actions workflow commands: violated problems as errors, undecided ones and
    /// checks that did not run as warnings, each on its file and line, then a summary.
    pub fn github(&self) -> String {
        let mut o = String::new();
        for p in &self.problems {
            let level = if p.status == Status::Violated { "error" } else { "warning" };
            let by = if p.by == By::Agent { "agent" } else { "author" };
            let mut props = vec![format!("file={}", prop(&p.file))];
            if p.line > 0 {
                props.push(format!("line={}", p.line));
                props.push(format!("col={}", p.col));
                if p.end_line >= p.line {
                    props.push(format!("endLine={}", p.end_line));
                }
            }
            props.push(format!("title={}", prop(&format!("martial {} [{by}]", p.code))));
            let msg = if p.line == 0 { format!("{}: {}", p.at, p.message) } else { p.message.clone() };
            o.push_str(&format!("::{level} {}::{}\n", props.join(","), data(&msg)));
        }
        for n in &self.not_checked {
            o.push_str(&format!(
                "::warning file={},title={}::{}\n",
                prop(&self.file),
                prop(&format!("martial: {} not checked", n.check)),
                data(&n.reason)
            ));
        }
        let s = &self.summary;
        o.push_str(&format!(
            "martial {}: {} {} ({} violated, {} undecided, {} for the author, {} waived)\n",
            self.martial,
            self.file,
            self.verdict.name(),
            s.violated,
            s.undecided,
            s.for_author,
            s.waived
        ));
        o
    }
}

/// Escaping for a workflow command's message.
fn data(s: &str) -> String {
    s.replace('%', "%25").replace('\r', "%0D").replace('\n', "%0A")
}

/// Escaping for a workflow command's property value.
fn prop(s: &str) -> String {
    data(s).replace(':', "%3A").replace(',', "%2C")
}
