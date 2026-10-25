//! `martial mcp`: a Model Context Protocol server over stdio (newline-delimited
//! JSON-RPC 2.0). It reads no network and opens no port; its tools are the CLI's.

use std::io::{BufRead, Write};
use std::path::PathBuf;

use serde_json::{json, Value};

use crate::doc::Format;
use crate::profile::Profile;
use crate::Request;

const PROTOCOL: &str = "2025-06-18";

fn tools() -> Value {
    let doc_props = json!({
        "path": {"type": "string", "description": "Document to read (.md or .tex). Relative paths resolve against the server's working directory."},
        "text": {"type": "string", "description": "Document text, when there is no file. Give format too."},
        "format": {"type": "string", "enum": ["md", "tex"]},
        "profile": {"type": "string", "enum": ["manuscript", "software-doc", "general"], "description": "The task: manuscript (papers), software-doc (READMEs, guides), general (any prose)."},
    });
    let mut check_props = doc_props.clone();
    let m = check_props.as_object_mut().unwrap();
    m.insert("sidecar".into(), json!({"type": "string", "description": "Sidecar file (default: <stem>.martial.json beside path)."}));
    m.insert(
        "sources".into(),
        json!({"type": "string", "description": "Directory of source texts, one <citation-key>.txt per cited source."}),
    );
    m.insert(
        "repo".into(),
        json!({"type": "string", "description": "Repository root for software-doc checks (default: the git root above path)."}),
    );
    m.insert("against".into(), json!({"type": "string", "description": "The version the edit started from: enables drift checks."}));
    let mut claims_props = doc_props;
    claims_props.as_object_mut().unwrap().insert(
        "skeleton".into(),
        json!({"type": "boolean", "description": "Also return a starting sidecar with one evidence entry per cited claim."}),
    );
    json!([
        {
            "name": "martial_check",
            "title": "Review prose",
            "description": "Review a manuscript or software document you are improving. Returns a verdict (clean/violated/undecided/incomplete) and a ranked list of problems, each with file:line:col, a stable code, status, who can resolve it (agent or author) and what resolves it. Re-run after editing, with `against` set to the pre-edit copy, to catch drift. Report by=author problems to your user instead of rewriting around them.",
            "inputSchema": {"type": "object", "properties": check_props},
            "annotations": {"readOnlyHint": true, "openWorldHint": false},
        },
        {
            "name": "martial_claims",
            "title": "List claims",
            "description": "List the sentences martial treats as claims and how each is supported (cited, internal, link, abstract, none). With skeleton, also returns a starting sidecar.",
            "inputSchema": {"type": "object", "properties": claims_props},
            "annotations": {"readOnlyHint": true, "openWorldHint": false},
        },
        {
            "name": "martial_guide",
            "title": "Guide for AI agents",
            "description": "Read this first. When to use martial, the review loop, what to do with every problem code, the rules an agent must not break, and how to report the result to the user.",
            "inputSchema": {"type": "object", "properties": {}},
            "annotations": {"readOnlyHint": true, "openWorldHint": false},
        },
        {
            "name": "martial_describe",
            "title": "How to use martial",
            "description": "The workflow, profiles, every problem code, the sidecar schema and every word list martial uses.",
            "inputSchema": {"type": "object", "properties": {}},
            "annotations": {"readOnlyHint": true, "openWorldHint": false},
        },
    ])
}

fn request(args: &Value) -> Result<Request, String> {
    let s = |k: &str| args.get(k).and_then(Value::as_str).map(String::from);
    let format = match s("format") {
        Some(f) => Some(Format::parse(&f).ok_or(format!("unknown format {f:?}; md or tex"))?),
        None => None,
    };
    let profile = match s("profile") {
        Some(p) => Some(Profile::parse(&p).ok_or(format!("unknown profile {p:?}; manuscript, software-doc or general"))?),
        None => None,
    };
    if s("path").is_none() && s("text").is_none() {
        return Err("give path or text".into());
    }
    Ok(Request {
        path: s("path").map(PathBuf::from),
        text: s("text"),
        name: None,
        format,
        profile,
        sidecar: s("sidecar").map(PathBuf::from),
        no_sidecar: false,
        sources: s("sources").map(PathBuf::from),
        repo: s("repo").map(PathBuf::from),
        against: s("against").map(PathBuf::from),
    })
}

fn call(name: &str, args: &Value) -> Result<Value, String> {
    match name {
        "martial_check" => serde_json::to_value(crate::check(&request(args)?)?).map_err(|e| e.to_string()),
        "martial_claims" => {
            let skeleton = args.get("skeleton").and_then(Value::as_bool).unwrap_or(false);
            serde_json::to_value(crate::claims(&request(args)?, skeleton)?).map_err(|e| e.to_string())
        }
        "martial_describe" => Ok(crate::describe::json()),
        "martial_guide" => Ok(Value::String(crate::describe::GUIDE.to_string())),
        _ => Err(format!("unknown tool {name}")),
    }
}

/// Handles one JSON-RPC message; `None` for notifications.
pub fn handle(msg: &Value) -> Option<Value> {
    let id = msg.get("id").cloned();
    let method = msg.get("method").and_then(Value::as_str).unwrap_or("");
    let id = id?;
    let result = match method {
        "initialize" => {
            let version = msg.pointer("/params/protocolVersion").and_then(Value::as_str).unwrap_or(PROTOCOL);
            Ok(json!({
                "protocolVersion": version,
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "martial", "version": crate::VERSION},
                "instructions": format!("{}\n\n{}\n\nCall martial_guide for the full guide.", crate::describe::PURPOSE, crate::describe::WORKFLOW.join("\n")),
            }))
        }
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({"tools": tools()})),
        "tools/call" => {
            let name = msg.pointer("/params/name").and_then(Value::as_str).unwrap_or("");
            let args = msg.pointer("/params/arguments").cloned().unwrap_or(json!({}));
            Ok(match call(name, &args) {
                Ok(Value::String(t)) => json!({"content": [{"type": "text", "text": t}], "isError": false}),
                Ok(v) => json!({"content": [{"type": "text", "text": v.to_string()}], "structuredContent": v, "isError": false}),
                Err(e) => json!({"content": [{"type": "text", "text": e}], "isError": true}),
            })
        }
        _ => Err(json!({"code": -32601, "message": format!("method not found: {method}")})),
    };
    Some(match result {
        Ok(r) => json!({"jsonrpc": "2.0", "id": id, "result": r}),
        Err(e) => json!({"jsonrpc": "2.0", "id": id, "error": e}),
    })
}

pub fn serve() -> std::io::Result<()> {
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout().lock();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let reply = match serde_json::from_str::<Value>(&line) {
            Ok(msg) => handle(&msg),
            Err(e) => Some(json!({"jsonrpc": "2.0", "id": null, "error": {"code": -32700, "message": format!("parse error: {e}")}})),
        };
        if let Some(r) = reply {
            writeln!(stdout, "{r}")?;
            stdout.flush()?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initialize_list_and_call() {
        let init = handle(&json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26"}})).unwrap();
        assert_eq!(init["result"]["protocolVersion"], "2025-03-26");
        assert_eq!(init["result"]["serverInfo"]["name"], "martial");
        assert!(handle(&json!({"jsonrpc":"2.0","method":"notifications/initialized"})).is_none());
        let list = handle(&json!({"jsonrpc":"2.0","id":2,"method":"tools/list"})).unwrap();
        let names: Vec<&str> = list["result"]["tools"].as_array().unwrap().iter().map(|t| t["name"].as_str().unwrap()).collect();
        assert_eq!(names, ["martial_check", "martial_claims", "martial_guide", "martial_describe"]);
        let guide =
            handle(&json!({"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"martial_guide","arguments":{}}})).unwrap();
        assert_eq!(guide["result"]["content"][0]["text"], crate::describe::GUIDE);
        let call = handle(&json!({"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"martial_check","arguments":{"text":"This is clearly fine.","format":"md","profile":"general"}}})).unwrap();
        let r = &call["result"];
        assert_eq!(r["isError"], false);
        let codes: Vec<&str> = r["structuredContent"]["problems"].as_array().unwrap().iter().map(|p| p["code"].as_str().unwrap()).collect();
        assert_eq!(codes, ["obviousness_claim", "reference_ambiguous"]);
        let bad = handle(&json!({"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"martial_check","arguments":{}}})).unwrap();
        assert_eq!(bad["result"]["isError"], true);
        let unknown = handle(&json!({"jsonrpc":"2.0","id":5,"method":"nope"})).unwrap();
        assert_eq!(unknown["error"]["code"], -32601);
    }
}
