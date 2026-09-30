//! Writing a harare module in Rust.
//!
//! ```no_run
//! # use harare::module_sdk;
//! # use serde_json::json;
//! let task = module_sdk::start().expect("harare task on stdin");
//! let query = task.body["query"].as_str().unwrap_or_default().to_string();
//! task.progress("searching", None).ok();
//! task.emit("passages", json!({ "query": query, "hits": [] })).ok();
//! // exit 0; a panic or non-zero exit becomes an `error` value on the node
//! ```
//!
//! Depend on the crate with `default-features = false`: this module and the
//! wire types need only serde, no async runtime.

use crate::address::Address;
use crate::graph::{Seq, TaskId, Value};
use crate::protocol::{FromModule, ToModule, PROTOCOL_VERSION};
use serde_json::Value as Json;
use std::collections::BTreeMap;
use std::io::{self, BufRead, BufReader, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub struct Task {
    pub run: String,
    pub task: TaskId,
    pub module: String,
    pub tau: Address,
    pub body: Json,
    pub config: Json,
    pub reading: Vec<Value>,
    pub node: Vec<Value>,
    grant: Arc<Mutex<BTreeMap<String, f64>>>,
    cancelled: Arc<AtomicBool>,
    values: Mutex<Receiver<(Address, Vec<Value>)>>,
    out: Mutex<Box<dyn Write + Send>>,
}

/// Read the task from stdin and start listening for grants and cancellation.
pub fn start() -> io::Result<Task> {
    Task::from_io(BufReader::new(io::stdin()), Box::new(io::stdout()))
}

impl Task {
    /// Build a task from any line source and sink (tests use in-memory ones).
    pub fn from_io<R: BufRead + Send + 'static>(mut input: R, out: Box<dyn Write + Send>) -> io::Result<Task> {
        let mut first = String::new();
        input.read_line(&mut first)?;
        let msg: ToModule = serde_json::from_str(first.trim()).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("first line is not a harare task: {e}")))?;
        let ToModule::Task { harare, run, task, module, tau, body, config, reading, node, grant } = msg else {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "first line is not a task message"));
        };
        if harare > PROTOCOL_VERSION {
            return Err(io::Error::new(io::ErrorKind::InvalidData, format!("engine speaks protocol {harare}, this module knows {PROTOCOL_VERSION}")));
        }
        let grant = Arc::new(Mutex::new(grant));
        let cancelled = Arc::new(AtomicBool::new(false));
        let (tx, rx) = mpsc::channel();
        {
            let grant = grant.clone();
            let cancelled = cancelled.clone();
            std::thread::spawn(move || {
                for line in input.lines() {
                    let Ok(line) = line else { break };
                    match serde_json::from_str::<ToModule>(line.trim()) {
                        Ok(ToModule::Grant { grant: g }) => *grant.lock().unwrap() = g,
                        Ok(ToModule::Values { tau, values }) => {
                            if tx.send((tau, values)).is_err() {
                                break;
                            }
                        }
                        Ok(ToModule::Cancel {}) => cancelled.store(true, Ordering::SeqCst),
                        _ => {}
                    }
                }
            });
        }
        Ok(Task { run, task, module, tau, body, config, reading, node, grant, cancelled, values: Mutex::new(rx), out: Mutex::new(out) })
    }

    pub fn send(&self, msg: &FromModule) -> io::Result<()> {
        let mut line = serde_json::to_string(msg).map_err(io::Error::other)?;
        line.push('\n');
        let mut out = self.out.lock().unwrap();
        out.write_all(line.as_bytes())?;
        out.flush()
    }

    /// Emit a value on the task's node, recording that it read what the task
    /// was started to read.
    pub fn emit(&self, kind: &str, data: Json) -> io::Result<()> {
        self.send(&FromModule::Emit { kind: kind.into(), data, tau: None, read: None })
    }

    /// Emit on any node, naming exactly which values it was derived from.
    pub fn emit_at(&self, tau: &Address, kind: &str, data: Json, read: Vec<Seq>) -> io::Result<()> {
        self.send(&FromModule::Emit { kind: kind.into(), data, tau: Some(tau.clone()), read: Some(read) })
    }

    /// Attach a chunk for `module` on `tau` — a subtask of this one.
    pub fn raise(&self, tau: &Address, module: &str, body: Json) -> io::Result<()> {
        self.send(&FromModule::Raise { tau: tau.clone(), module: module.into(), body, priority: None, demand: None, runners: None })
    }

    pub fn progress(&self, note: &str, fraction: Option<f64>) -> io::Result<()> {
        self.send(&FromModule::Progress { note: note.into(), fraction })
    }

    /// The values currently on `tau`. Blocks until the engine answers.
    pub fn read(&self, tau: &Address) -> io::Result<Vec<Value>> {
        self.send(&FromModule::Read { tau: tau.clone() })?;
        let rx = self.values.lock().unwrap();
        loop {
            match rx.recv_timeout(Duration::from_secs(60)) {
                Ok((t, values)) if &t == tau => return Ok(values),
                Ok(_) => continue,
                Err(RecvTimeoutError::Timeout) => return Err(io::Error::new(io::ErrorKind::TimedOut, "no answer to read")),
                Err(RecvTimeoutError::Disconnected) => return Err(io::Error::new(io::ErrorKind::BrokenPipe, "engine closed stdin")),
            }
        }
    }

    /// This task's current share of each rate resource it demanded.
    pub fn grant(&self) -> BTreeMap<String, f64> {
        self.grant.lock().unwrap().clone()
    }

    /// True once the engine has asked the task to stop.
    pub fn cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[derive(Clone, Default)]
    struct Sink(Arc<Mutex<Vec<u8>>>);
    impl Write for Sink {
        fn write(&mut self, b: &[u8]) -> io::Result<usize> {
            self.0.lock().unwrap().extend_from_slice(b);
            Ok(b.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    #[test]
    fn reads_task_answers_reads_and_tracks_grants() {
        let input = concat!(
            r#"{"type":"task","harare":1,"run":"r","task":2,"module":"m","tau":"a/b","body":{"q":1},"grant":{"net":4.0}}"#,
            "\n",
            r#"{"type":"grant","grant":{"net":9.0}}"#,
            "\n",
            r#"{"type":"values","tau":"a","values":[]}"#,
            "\n",
            r#"{"type":"cancel"}"#,
            "\n"
        );
        let sink = Sink::default();
        let t = Task::from_io(Cursor::new(input.as_bytes().to_vec()), Box::new(sink.clone())).unwrap();
        assert_eq!(t.tau.to_string(), "a/b");
        assert_eq!(t.body["q"], 1);
        let vals = t.read(&Address::parse("a").unwrap()).unwrap();
        assert!(vals.is_empty());
        // By the time the values reply was consumed, the earlier grant has been seen.
        assert_eq!(t.grant()["net"], 9.0);
        t.emit("note", serde_json::json!("hi")).unwrap();
        std::thread::sleep(Duration::from_millis(50));
        assert!(t.cancelled());
        let written = String::from_utf8(sink.0.lock().unwrap().clone()).unwrap();
        assert!(written.contains(r#""type":"read""#));
        assert!(written.contains(r#""type":"emit""#));
    }
}
