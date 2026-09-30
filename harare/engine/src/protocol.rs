//! The wire protocol between the engine and a module process.
//!
//! One JSON object per line in each direction. The engine starts the module,
//! writes one `task` line to its stdin, and may later write `grant`, `values`
//! and `cancel` lines. The module writes `emit`, `raise`, `progress` and
//! `read` lines to its stdout and exits when it is done.
//!
//! Exit status carries no verdict: a non-zero exit becomes an `error` value on
//! the task's node, written by the engine, and the run goes on. A stdout line
//! that is not a protocol message is kept as a progress note.

use crate::address::Address;
use crate::graph::{Seq, TaskId, Value};
use serde::{Deserialize, Serialize};
use serde_json::Value as Json;
use std::collections::BTreeMap;

/// Bumped when a message changes shape. Modules may refuse a version they do
/// not know.
pub const PROTOCOL_VERSION: u32 = 1;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ToModule {
    /// The first line a module receives: what to do and where.
    Task {
        harare: u32,
        run: String,
        task: TaskId,
        module: String,
        tau: Address,
        /// The chunk body, or null for a read task.
        #[serde(default)]
        body: Json,
        /// The module's `config` table from harare.toml.
        #[serde(default)]
        config: Json,
        /// Values this task was started to read (read tasks) — empty for a
        /// chunk dispatch.
        #[serde(default)]
        reading: Vec<Value>,
        /// Every value on the task's node at dispatch time.
        #[serde(default)]
        node: Vec<Value>,
        /// Current share of each rate resource this task demanded.
        #[serde(default)]
        grant: BTreeMap<String, f64>,
    },
    /// The task's share of rate resources changed. Modules that consume a
    /// rate resource are expected to keep within their grant.
    Grant { grant: BTreeMap<String, f64> },
    /// Reply to a `read` request.
    Values { tau: Address, values: Vec<Value> },
    /// Stop soon; the engine kills the process after a grace period.
    Cancel {},
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum FromModule {
    /// Append a value. `tau` defaults to the task's node; `read` defaults to
    /// the values the task was started to read.
    Emit {
        kind: String,
        #[serde(default)]
        data: Json,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        tau: Option<Address>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        read: Option<Vec<Seq>>,
    },
    /// Attach a chunk to a node (creating the node if the address is new).
    /// This is how an agent raises the subtasks of its own decomposition.
    Raise {
        tau: Address,
        module: String,
        #[serde(default)]
        body: Json,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        priority: Option<f64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        demand: Option<BTreeMap<String, f64>>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        runners: Option<Vec<String>>,
    },
    /// Something to show while the task runs. Not a value; not in the report.
    Progress {
        note: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        fraction: Option<f64>,
    },
    /// Ask for the values currently on a node; answered with `values`.
    Read { tau: Address },
}

impl FromModule {
    /// Parse one stdout line. `None` means the line is not a protocol message.
    pub fn parse(line: &str) -> Option<FromModule> {
        let t = line.trim();
        if !t.starts_with('{') {
            return None;
        }
        serde_json::from_str(t).ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn emit_defaults() {
        let m = FromModule::parse(r#"{"type":"emit","kind":"note"}"#).unwrap();
        assert_eq!(m, FromModule::Emit { kind: "note".into(), data: Json::Null, tau: None, read: None });
    }

    #[test]
    fn non_protocol_lines_are_not_messages() {
        assert!(FromModule::parse("compiling...").is_none());
        assert!(FromModule::parse(r#"{"type":"unknown"}"#).is_none());
        assert!(FromModule::parse(r#"{"type":"emit","kind":"x","tau":"a//b"}"#).is_none());
    }

    #[test]
    fn task_round_trips() {
        let t = ToModule::Task {
            harare: PROTOCOL_VERSION,
            run: "r".into(),
            task: 3,
            module: "m".into(),
            tau: Address::parse("a/b").unwrap(),
            body: json!({"q": "x"}),
            config: Json::Null,
            reading: vec![],
            node: vec![],
            grant: BTreeMap::new(),
        };
        let s = serde_json::to_string(&t).unwrap();
        assert!(s.contains(r#""type":"task""#));
        assert!(s.contains(r#""tau":"a/b""#));
        let back: ToModule = serde_json::from_str(&s).unwrap();
        assert_eq!(back, t);
    }
}
