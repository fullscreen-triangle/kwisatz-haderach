//! A run's state, rebuilt by applying its act log entry by entry.
//!
//! Nothing here decides anything: `apply` only records. The engine decides
//! what to do next by looking at this state, writes an act, and applies it,
//! so a live run and a replayed run go through the same code.

use crate::act::{Act, End, Entry};
use crate::address::Address;
use crate::graph::{ChunkId, Graph, Seq, TaskId};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum TaskState {
    Running,
    Ended { end: End },
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Progress {
    pub note: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fraction: Option<f64>,
}

#[derive(Clone, Debug, Serialize)]
pub struct TaskRec {
    pub id: TaskId,
    pub module: String,
    pub tau: Address,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chunk: Option<ChunkId>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub reading: Vec<Seq>,
    pub runner: String,
    pub priority: f64,
    #[serde(flatten)]
    pub state: TaskState,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub grant: BTreeMap<String, f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub progress: Option<Progress>,
    pub emitted: u64,
    pub raised: u64,
    pub dispatched_m: u64,
    pub started_t: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_m: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_t: Option<u64>,
}

impl TaskRec {
    pub fn is_running(&self) -> bool {
        self.state == TaskState::Running
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct DeferredRec {
    pub module: String,
    pub tau: Address,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chunk: Option<ChunkId>,
    pub reading: Vec<Seq>,
    pub reason: String,
    pub m: u64,
}

#[derive(Clone, Debug, Default)]
pub struct RunState {
    pub run: String,
    pub label: Option<String>,
    pub graph: Graph,
    pub tasks: BTreeMap<TaskId, TaskRec>,
    pub dispatched_chunks: BTreeSet<ChunkId>,
    /// (module, value) pairs a module has been handed, or has been refused by
    /// the budget. A module is never handed the same value twice.
    pub read_mark: BTreeSet<(String, Seq)>,
    pub deferred: Vec<DeferredRec>,
    pub deferred_chunks: BTreeSet<ChunkId>,
    /// The count of the last applied act.
    pub m: u64,
    /// True after a `quiescent` act, false again after anything that adds
    /// work or values.
    pub quiescent: bool,
    pub opened_t: u64,
    pub last_t: u64,
}

impl RunState {
    pub fn from_entries(entries: &[Entry]) -> Result<RunState, String> {
        let mut s = RunState::default();
        for e in entries {
            s.apply(e)?;
        }
        Ok(s)
    }

    pub fn next_task_id(&self) -> TaskId {
        self.tasks.len() as TaskId + 1
    }

    pub fn running(&self) -> impl Iterator<Item = &TaskRec> {
        self.tasks.values().filter(|t| t.is_running())
    }

    /// Chunks attached, not dispatched and not deferred, oldest first.
    pub fn undispatched(&self) -> impl Iterator<Item = &crate::graph::Chunk> {
        self.graph.chunks().iter().filter(|c| !self.dispatched_chunks.contains(&c.id) && !self.deferred_chunks.contains(&c.id))
    }

    pub fn apply(&mut self, e: &Entry) -> Result<(), String> {
        if e.m != self.m + 1 {
            return Err(format!("act m={} does not follow m={}", e.m, self.m));
        }
        let m = e.m;
        match &e.act {
            Act::Open { run, label } => {
                if m != 1 {
                    return Err("open must be the first act".into());
                }
                self.run = run.clone();
                self.label = label.clone();
                self.opened_t = e.t;
            }
            Act::Raise { chunk } => {
                self.graph.attach(chunk.clone(), m)?;
                if let Some(t) = chunk.by.task.and_then(|t| self.tasks.get_mut(&t)) {
                    t.raised += 1;
                }
                self.quiescent = false;
            }
            Act::Dispatch { task, module, tau, chunk, reading, runner, priority } => {
                if *task != self.next_task_id() {
                    return Err(format!("task {task} out of order (expected {})", self.next_task_id()));
                }
                if let Some(c) = chunk {
                    if self.graph.chunk(*c).is_none() {
                        return Err(format!("dispatch of unknown chunk {c}"));
                    }
                    if !self.dispatched_chunks.insert(*c) {
                        return Err(format!("chunk {c} dispatched twice"));
                    }
                }
                for r in reading {
                    self.read_mark.insert((module.clone(), *r));
                }
                self.tasks.insert(
                    *task,
                    TaskRec {
                        id: *task,
                        module: module.clone(),
                        tau: tau.clone(),
                        chunk: *chunk,
                        reading: reading.clone(),
                        runner: runner.clone(),
                        priority: *priority,
                        state: TaskState::Running,
                        grant: BTreeMap::new(),
                        progress: None,
                        emitted: 0,
                        raised: 0,
                        dispatched_m: m,
                        started_t: e.t,
                        ended_m: None,
                        ended_t: None,
                    },
                );
                self.quiescent = false;
            }
            Act::Grant { task, grant } => {
                if let Some(t) = self.tasks.get_mut(task) {
                    t.grant = grant.clone();
                }
            }
            Act::Progress { task, note, fraction } => {
                if let Some(t) = self.tasks.get_mut(task) {
                    t.progress = Some(Progress { note: note.clone(), fraction: *fraction });
                }
            }
            Act::Emit { value } => {
                self.graph.emit(value.clone(), m)?;
                if let Some(t) = value.by.task.and_then(|t| self.tasks.get_mut(&t)) {
                    t.emitted += 1;
                }
                self.quiescent = false;
            }
            Act::Finish { task, end } => {
                let t = self.tasks.get_mut(task).ok_or_else(|| format!("finish of unknown task {task}"))?;
                t.state = TaskState::Ended { end: end.clone() };
                t.ended_m = Some(m);
                t.ended_t = Some(e.t);
            }
            Act::Deferred { module, tau, chunk, reading, reason } => {
                for r in reading {
                    self.read_mark.insert((module.clone(), *r));
                }
                if let Some(c) = chunk {
                    self.deferred_chunks.insert(*c);
                }
                self.deferred.push(DeferredRec {
                    module: module.clone(),
                    tau: tau.clone(),
                    chunk: *chunk,
                    reading: reading.clone(),
                    reason: reason.clone(),
                    m,
                });
            }
            Act::Quiescent {} => self.quiescent = true,
        }
        self.m = m;
        self.last_t = e.t;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{Chunk, Origin, Value};
    use serde_json::json;

    fn e(m: u64, act: Act) -> Entry {
        Entry { m, t: m * 10, act }
    }

    fn a(s: &str) -> Address {
        Address::parse(s).unwrap()
    }

    #[test]
    fn replay_rebuilds_tasks_values_and_marks() {
        let chunk = Chunk {
            id: 1,
            tau: a("q"),
            module: "search".into(),
            body: json!({"q": "x"}),
            priority: None,
            demand: Default::default(),
            runners: vec![],
            by: Origin::api(),
        };
        let log = vec![
            e(1, Act::Open { run: "r1".into(), label: None }),
            e(2, Act::Raise { chunk }),
            e(3, Act::Dispatch { task: 1, module: "search".into(), tau: a("q"), chunk: Some(1), reading: vec![], runner: "local".into(), priority: 1.0 }),
            e(4, Act::Emit { value: Value { seq: 1, tau: a("q"), kind: "declined".into(), data: json!({}), by: Origin::task("search", 1), read: vec![] } }),
            e(5, Act::Finish { task: 1, end: End::Exited { code: Some(0) } }),
            e(6, Act::Dispatch { task: 2, module: "web".into(), tau: a("q"), chunk: None, reading: vec![1], runner: "local".into(), priority: 1.0 }),
        ];
        let s = RunState::from_entries(&log).unwrap();
        assert_eq!(s.m, 6);
        assert_eq!(s.tasks[&1].emitted, 1);
        assert!(!s.tasks[&1].is_running());
        assert!(s.tasks[&2].is_running());
        assert!(s.read_mark.contains(&("web".to_string(), 1)));
        assert!(s.undispatched().next().is_none());
    }

    #[test]
    fn gaps_and_double_dispatch_are_refused() {
        let mut s = RunState::default();
        assert!(s.apply(&e(2, Act::Quiescent {})).is_err());
        s.apply(&e(1, Act::Open { run: "r".into(), label: None })).unwrap();
        assert!(s.apply(&e(2, Act::Dispatch { task: 1, module: "m".into(), tau: a("x"), chunk: Some(9), reading: vec![], runner: "local".into(), priority: 1.0 })).is_err());
    }
}
