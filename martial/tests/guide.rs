//! The guide for AI agents is part of the contract: it must describe exactly the codes,
//! profiles and commands the binary has. A code added without a guide row fails here.

use martial::codes::{By, Status, CODES};
use martial::describe::GUIDE;
use martial::profile::Profile;

const SKILL: &str = include_str!("../integrations/claude-skill/SKILL.md");

#[test]
fn every_code_has_its_row() {
    for c in CODES {
        let status = if c.status == Status::Violated { "violated" } else { "undecided" };
        let by = if c.by == By::Agent { "agent" } else { "author" };
        let row = format!("| `{}` | {status} | {by} | {} | {} |", c.code, if c.waivable { "yes" } else { "no" }, c.resolve);
        assert!(GUIDE.lines().any(|l| l == row), "AGENT_GUIDE.md lacks or misstates the row for {}:\n{row}", c.code);
    }
    let rows = GUIDE.lines().filter(|l| l.starts_with("| `") && l.matches(" | ").count() == 4).count();
    assert_eq!(rows, CODES.len(), "the code table has rows for codes the binary does not have");
}

#[test]
fn every_profile_command_and_verdict_is_described() {
    for p in Profile::ALL {
        assert!(GUIDE.contains(&format!("| `{}` |", p.name())), "profile {}", p.name());
    }
    for cmd in [
        "martial check",
        "martial claims",
        "martial guide",
        "martial describe",
        "--against",
        "--sources",
        "--repo",
        "--annotate github",
        "--skeleton",
    ] {
        assert!(GUIDE.contains(cmd), "{cmd}");
    }
    for tool in ["martial_check", "martial_claims", "martial_guide", "martial_describe"] {
        assert!(GUIDE.contains(tool), "{tool}");
    }
    for (verdict, code) in [("clean", 0), ("violated", 1), ("undecided", 3), ("incomplete", 3)] {
        assert!(GUIDE.contains(&format!("| `{verdict}` | {code} |")), "{verdict}");
    }
}

#[test]
fn the_skill_points_at_the_guide() {
    let skill: String = SKILL.chars().filter(|&c| c != '\r').collect();
    assert!(skill.starts_with("---\nname: martial\ndescription: "), "skill front matter");
    let description = skill.lines().nth(2).unwrap();
    assert!(description.len() < 1024, "skill descriptions are read whole; keep it short");
    for word in ["improve", "manuscript", "README", "martial_guide", "--against"] {
        assert!(skill.contains(word), "{word}");
    }
}

#[test]
fn the_binary_prints_the_guide() {
    let out = std::process::Command::new(env!("CARGO_BIN_EXE_martial")).arg("guide").output().unwrap();
    assert!(out.status.success());
    assert_eq!(String::from_utf8(out.stdout).unwrap(), GUIDE);
}

#[test]
fn the_action_runs_what_the_guide_says() {
    let action = include_str!("../action.yml");
    for input in ["files:", "profile:", "args:", "fail-on:"] {
        assert!(action.contains(input), "{input}");
    }
    assert!(action.contains("--annotate github"));
    assert!(GUIDE.contains("fullscreen-triangle/kwisatz-haderach/martial@main"));
}
