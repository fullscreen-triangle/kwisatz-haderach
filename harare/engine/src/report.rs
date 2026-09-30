//! A run's output: what was emitted, where, by whom, and which reads joined
//! the nodes. Errors are listed as the values they are.

use crate::address::Address;
use crate::fingerprint::Fnv64;
use crate::graph::{ChunkId, Edge, Value};
use crate::state::{DeferredRec, RunState, TaskState};
use serde::Serialize;
use serde_json::Value as Json;

#[derive(Clone, Debug, Serialize)]
pub struct ChunkLine {
    pub id: ChunkId,
    pub module: String,
    pub body: Json,
    pub by: String,
    pub dispatched: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct NodeReport {
    pub tau: Address,
    pub chunks: Vec<ChunkLine>,
    pub values: Vec<Value>,
}

#[derive(Clone, Debug, Serialize)]
pub struct TaskCounts {
    pub total: usize,
    pub running: usize,
    pub exited: usize,
    pub failed_to_start: usize,
    pub cancelled: usize,
    pub lost: usize,
}

#[derive(Clone, Debug, Serialize)]
pub struct Report {
    pub run: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub m: u64,
    pub quiescent: bool,
    /// Hash of the protocol — node addresses, modules and chunk bodies, in
    /// raise order — and never of values. Two runs of one protocol share it
    /// however different their results.
    pub protocol_fingerprint: String,
    pub nodes: Vec<NodeReport>,
    pub edges: Vec<Edge>,
    pub tasks: TaskCounts,
    pub errors: Vec<Value>,
    pub deferred: Vec<DeferredRec>,
    pub undispatched: Vec<ChunkId>,
}

pub fn protocol_fingerprint(state: &RunState) -> String {
    let mut h = Fnv64::default();
    for c in state.graph.chunks() {
        h.field(&c.tau.to_string());
        h.field(&c.module);
        // serde_json's default map is ordered, so this is canonical.
        h.field(&serde_json::to_string(&c.body).unwrap_or_default());
    }
    h.hex()
}

pub fn build(state: &RunState) -> Report {
    let g = &state.graph;
    let nodes = g
        .nodes()
        .map(|n| NodeReport {
            tau: n.tau.clone(),
            chunks: n
                .chunks
                .iter()
                .filter_map(|id| g.chunk(*id))
                .map(|c| ChunkLine {
                    id: c.id,
                    module: c.module.clone(),
                    body: c.body.clone(),
                    by: c.by.module.clone(),
                    dispatched: state.dispatched_chunks.contains(&c.id),
                })
                .collect(),
            values: n.values.iter().filter_map(|s| g.value(*s)).cloned().collect(),
        })
        .collect();

    let mut counts = TaskCounts { total: state.tasks.len(), running: 0, exited: 0, failed_to_start: 0, cancelled: 0, lost: 0 };
    for t in state.tasks.values() {
        match &t.state {
            TaskState::Running => counts.running += 1,
            TaskState::Ended { end } => match end {
                crate::act::End::Exited { .. } => counts.exited += 1,
                crate::act::End::Failed { .. } => counts.failed_to_start += 1,
                crate::act::End::Cancelled {} => counts.cancelled += 1,
                crate::act::End::Lost {} => counts.lost += 1,
            },
        }
    }

    Report {
        run: state.run.clone(),
        label: state.label.clone(),
        m: state.m,
        quiescent: state.quiescent,
        protocol_fingerprint: protocol_fingerprint(state),
        nodes,
        edges: g.edges(),
        tasks: counts,
        errors: g.values().iter().filter(|v| v.kind == "error").cloned().collect(),
        deferred: state.deferred.clone(),
        undispatched: state.undispatched().map(|c| c.id).collect(),
    }
}

fn short(j: &Json, max: usize) -> String {
    let s = match j {
        Json::String(s) => s.clone(),
        Json::Null => String::new(),
        other => other.to_string(),
    };
    let s = s.replace('\n', " ");
    if s.chars().count() > max {
        format!("{}…", s.chars().take(max).collect::<String>())
    } else {
        s
    }
}

/// A plain-text rendering for terminals.
pub fn render_text(r: &Report) -> String {
    let mut out = String::new();
    let state = if r.quiescent { "quiescent" } else { "open" };
    out.push_str(&format!(
        "run {}{} — m={} — {} — protocol {}\n",
        r.run,
        r.label.as_deref().map(|l| format!(" ({l})")).unwrap_or_default(),
        r.m,
        state,
        r.protocol_fingerprint
    ));
    out.push_str(&format!(
        "tasks: {} total, {} running, {} exited, {} failed to start, {} cancelled, {} lost\n",
        r.tasks.total, r.tasks.running, r.tasks.exited, r.tasks.failed_to_start, r.tasks.cancelled, r.tasks.lost
    ));
    for n in &r.nodes {
        out.push_str(&format!("\n● {}\n", n.tau));
        for c in &n.chunks {
            let mark = if c.dispatched { "ran" } else { "waiting" };
            out.push_str(&format!("  chunk #{} {} [{}] {}\n", c.id, c.module, mark, short(&c.body, 80)));
        }
        for v in &n.values {
            let read = if v.read.is_empty() { String::new() } else { format!(" ← read {:?}", v.read) };
            out.push_str(&format!("  #{} {} by {}{}: {}\n", v.seq, v.kind, v.by.module, read, short(&v.data, 100)));
        }
    }
    if !r.edges.is_empty() {
        out.push_str("\nedges (each drawn by a read):\n");
        for e in &r.edges {
            out.push_str(&format!("  {} → {}  by {} ({} read{})\n", e.from, e.to, e.by, e.reads, if e.reads == 1 { "" } else { "s" }));
        }
    }
    if !r.deferred.is_empty() {
        out.push_str(&format!("\n{} read batch(es) deferred by the task budget\n", r.deferred.len()));
    }
    if !r.undispatched.is_empty() {
        out.push_str(&format!("\nchunks still waiting to run: {:?}\n", r.undispatched));
    }
    out
}
