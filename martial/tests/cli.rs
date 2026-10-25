//! The binary's contract: exit codes, JSON output, stdin, and the MCP server.

use std::io::Write;
use std::process::{Command, Stdio};

fn martial() -> Command {
    let mut c = Command::new(env!("CARGO_BIN_EXE_martial"));
    c.current_dir(env!("CARGO_MANIFEST_DIR"));
    c
}

fn code(args: &[&str]) -> i32 {
    martial().args(args).output().unwrap().status.code().unwrap()
}

#[test]
fn exit_codes() {
    assert_eq!(code(&["check", "examples/clean/note.md", "--profile", "general"]), 0);
    assert_eq!(code(&["check", "examples/manuscript/paper.tex"]), 1);
    assert_eq!(code(&["check", "examples/manuscript/paper.tex", "--no-sidecar", "--profile", "manuscript"]), 1);
    assert_eq!(code(&["check", "no/such/file.md"]), 2);
    assert_eq!(code(&["check", "examples/clean/note.md", "--profile", "nope"]), 2);
    assert_eq!(code(&["frobnicate"]), 2);
    assert_eq!(code(&["describe"]), 0);
}

#[test]
fn incomplete_is_exit_3() {
    // Clean prose, but a manuscript with a cited claim and no sources cannot be verified.
    let dir = std::env::temp_dir().join(format!("martial-cli-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(dir.join("refs.bib"), "@article{k1, title={T}}\n").unwrap();
    std::fs::write(dir.join("p.tex"), "Prior work showed the effect~\\cite{k1}.\n\\bibliography{refs}\n").unwrap();
    let out = martial().args(["check", dir.join("p.tex").to_str().unwrap(), "--json"]).output().unwrap();
    assert_eq!(out.status.code(), Some(3));
    let v: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(v["verdict"], "incomplete");
    assert_eq!(v["not_checked"][0]["check"], "evidence.quotes");
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn json_and_stdin() {
    let mut child = martial()
        .args(["check", "-", "--format", "md", "--profile", "general", "--json"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    child.stdin.take().unwrap().write_all(b"This is obviously true.\n").unwrap();
    let out = child.wait_with_output().unwrap();
    assert_eq!(out.status.code(), Some(1));
    let v: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(v["file"], "<stdin>");
    assert_eq!(v["problems"][0]["at"], "<stdin>:1:1");
    assert_eq!(v["stage"].as_str().unwrap().len(), 64);
}

#[test]
fn github_annotations() {
    let out = martial().args(["check", "examples/manuscript/paper.tex", "--annotate", "github"]).output().unwrap();
    assert_eq!(out.status.code(), Some(1), "annotations keep the verdict's exit code");
    let text = String::from_utf8(out.stdout).unwrap();
    let lines: Vec<&str> = text.lines().collect();
    assert_eq!(lines.iter().filter(|l| l.starts_with("::error ")).count(), 9);
    assert_eq!(lines.iter().filter(|l| l.starts_with("::warning ")).count(), 5);
    assert!(lines.contains(
        &"::error file=examples/manuscript/sections/results.tex,line=10,col=13,endLine=10,title=martial unknown_citation [agent]::\"smith2021\" is not a key in the bibliography; did you mean \"smith2020\"?"
    ));
    // A sidecar problem has no line; its pointer goes into the message.
    assert!(lines.iter().any(|l| l.starts_with("::error file=examples/manuscript/paper.martial.json,title=martial quote_not_found [agent]::examples/manuscript/paper.martial.json#/evidence/1/quote: ")));
    assert!(lines.last().unwrap().starts_with("martial ") && lines.last().unwrap().contains(" violated (9 violated, 5 undecided"));
    assert_eq!(code(&["check", "examples/clean/note.md", "--json", "--annotate", "github"]), 2);
    assert_eq!(code(&["check", "examples/clean/note.md", "--annotate", "sarif"]), 2);
}

#[test]
fn describe_json_lists_every_code() {
    let out = martial().args(["describe", "--json"]).output().unwrap();
    let v: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(v["codes"].as_array().unwrap().len(), martial::codes::CODES.len());
    assert_eq!(v["profiles"].as_array().unwrap().len(), 3);
}

#[test]
fn mcp_server_over_stdio() {
    let mut child = martial().arg("mcp").stdin(Stdio::piped()).stdout(Stdio::piped()).spawn().unwrap();
    let mut stdin = child.stdin.take().unwrap();
    writeln!(stdin, r#"{{"jsonrpc":"2.0","id":1,"method":"initialize","params":{{"protocolVersion":"2025-06-18"}}}}"#).unwrap();
    writeln!(stdin, r#"{{"jsonrpc":"2.0","method":"notifications/initialized"}}"#).unwrap();
    writeln!(stdin, r#"{{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{{"name":"martial_check","arguments":{{"path":"examples/clean/note.md","profile":"general"}}}}}}"#).unwrap();
    drop(stdin);
    let out = child.wait_with_output().unwrap();
    let lines: Vec<serde_json::Value> = String::from_utf8(out.stdout).unwrap().lines().map(|l| serde_json::from_str(l).unwrap()).collect();
    assert_eq!(lines.len(), 2, "a notification gets no reply");
    assert_eq!(lines[0]["id"], 1);
    assert_eq!(lines[1]["result"]["structuredContent"]["verdict"], "clean");
}
