//! Profiles: the closed set of tasks. A profile decides which checks are required (a
//! required check that cannot run makes the verdict `incomplete`, never `clean`) and
//! which run only when their input is given.

use serde::Serialize;

pub const ALL_CHECKS: &[&str] =
    &["structure", "citations", "clarity", "evidence.support", "evidence.quotes", "code.identifiers", "code.commands", "drift", "sidecar"];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Profile {
    Manuscript,
    SoftwareDoc,
    General,
}

impl Profile {
    pub const ALL: [Profile; 3] = [Profile::Manuscript, Profile::SoftwareDoc, Profile::General];

    pub fn parse(s: &str) -> Option<Profile> {
        match s {
            "manuscript" | "paper" => Some(Profile::Manuscript),
            "software-doc" | "readme" | "docs" => Some(Profile::SoftwareDoc),
            "general" | "prose" => Some(Profile::General),
            _ => None,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Profile::Manuscript => "manuscript",
            Profile::SoftwareDoc => "software-doc",
            Profile::General => "general",
        }
    }

    pub fn use_for(self) -> &'static str {
        match self {
            Profile::Manuscript => "Scientific papers, theses, reports and abstracts: claims need citations or internal references, citations need bibliography entries, and with --sources every cited claim needs a verbatim supporting quote.",
            Profile::SoftwareDoc => "READMEs, guides, API and CLI documentation: every path, identifier, flag and command the text names must exist in the repository, and performance or guarantee claims need support.",
            Profile::General => "Letters, notes, posts and any other prose: clarity and structure only.",
        }
    }

    /// The most words a sentence may have.
    pub fn max_words(self) -> usize {
        match self {
            Profile::Manuscript => 40,
            Profile::SoftwareDoc | Profile::General => 35,
        }
    }

    pub fn required(self) -> &'static [&'static str] {
        match self {
            Profile::Manuscript => &["structure", "citations", "clarity", "evidence.support", "evidence.quotes"],
            Profile::SoftwareDoc => &["structure", "clarity", "evidence.support", "code.identifiers", "code.commands"],
            Profile::General => &["structure", "clarity"],
        }
    }

    pub fn optional(self) -> &'static [&'static str] {
        match self {
            Profile::Manuscript => &["code.identifiers", "code.commands"],
            Profile::SoftwareDoc => &["citations", "evidence.quotes"],
            Profile::General => &["citations"],
        }
    }

    pub fn runs(self, check: &str) -> bool {
        self.required().contains(&check) || self.optional().contains(&check)
    }
}
