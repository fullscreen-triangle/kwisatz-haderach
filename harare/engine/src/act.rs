//! The act log: everything a run did, in order, with a count `m` that only
//! grows.
//!
//! The log is the run. The in-memory state is rebuilt from it by
//! [`crate::state::RunState::apply`], both live (each new act is applied as it
//! is written) and on replay, so a report produced after a restart is the
//! report of the same run.

use crate::address::Address;
use crate::graph::{Chunk, ChunkId, Seq, TaskId, Value};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "act", rename_all = "snake_case")]
pub enum Act {
    /// First entry of every log.
    Open {
        run: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    /// A chunk attached to its node.
    Raise { chunk: Chunk },
    /// A task started: a chunk being dispatched, or a module reading values.
    Dispatch {
        task: TaskId,
        module: String,
        tau: Address,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        chunk: Option<ChunkId>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        reading: Vec<Seq>,
        runner: String,
        priority: f64,
    },
    /// A running task's share of rate resources changed.
    Grant { task: TaskId, grant: BTreeMap<String, f64> },
    Progress {
        task: TaskId,
        note: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        fraction: Option<f64>,
    },
    Emit { value: Value },
    /// A task's process ended. How it ended is recorded, not judged; a crash
    /// has already become an `error` value by the time this is written.
    Finish { task: TaskId, end: End },
    /// Work the run will not start: a chunk or a read beyond the task budget,
    /// or a chunk whose module is no longer configured. Recorded so the run
    /// can still reach quiescence, and so the report says what was left.
    Deferred {
        module: String,
        tau: Address,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        chunk: Option<ChunkId>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        reading: Vec<Seq>,
        reason: String,
    },
    /// Nothing is left to dispatch and no module wants an unread value.
    Quiescent {},
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "how", rename_all = "snake_case")]
pub enum End {
    /// The process exited. `code` is None when it was ended by a signal.
    Exited { code: Option<i32> },
    /// The process could not be started.
    Failed { reason: String },
    /// Stopped on request.
    Cancelled {},
    /// The engine stopped while the task was running.
    Lost {},
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Entry {
    pub m: u64,
    /// Wall-clock milliseconds since the Unix epoch. Informational only:
    /// order is `m`, never time.
    pub t: u64,
    #[serde(flatten)]
    pub act: Act,
}

pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// An append-only JSONL file. Each entry is flushed before `append` returns.
pub struct Log {
    path: PathBuf,
    file: File,
    next_m: u64,
}

impl Log {
    /// Open (or create) the log at `path`, continuing its count.
    pub fn open(path: &Path) -> std::io::Result<(Log, Vec<Entry>)> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        if path.exists() {
            // A crash can leave a final line without its newline. Cut it back
            // to the last complete entry so the next append starts clean.
            let bytes = std::fs::read(path)?;
            let keep = bytes.iter().rposition(|b| *b == b'\n').map(|i| i + 1).unwrap_or(0);
            if keep != bytes.len() {
                OpenOptions::new().write(true).open(path)?.set_len(keep as u64)?;
            }
        }
        let existing = if path.exists() { read_log(path)? } else { Vec::new() };
        let next_m = existing.last().map(|e| e.m + 1).unwrap_or(1);
        let file = OpenOptions::new().create(true).append(true).open(path)?;
        Ok((Log { path: path.to_path_buf(), file, next_m }, existing))
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn append(&mut self, act: Act) -> std::io::Result<Entry> {
        let entry = Entry { m: self.next_m, t: now_ms(), act };
        let mut line = serde_json::to_string(&entry).map_err(std::io::Error::other)?;
        line.push('\n');
        self.file.write_all(line.as_bytes())?;
        self.file.flush()?;
        self.next_m += 1;
        Ok(entry)
    }
}

/// Read a log. A final line cut short by a crash is ignored; any other
/// unreadable line is an error, because skipping it would change the run.
pub fn read_log(path: &Path) -> std::io::Result<Vec<Entry>> {
    let reader = BufReader::new(File::open(path)?);
    let lines: Vec<String> = reader.lines().collect::<Result<_, _>>()?;
    let mut out = Vec::with_capacity(lines.len());
    let last = lines.len().saturating_sub(1);
    for (i, line) in lines.iter().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<Entry>(line) {
            Ok(e) => out.push(e),
            Err(_) if i == last => break,
            Err(err) => {
                return Err(std::io::Error::other(format!("{}:{}: {err}", path.display(), i + 1)));
            }
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn count_continues_across_reopen_and_torn_tail_is_ignored() {
        let dir = std::env::temp_dir().join(format!("harare-act-{}", now_ms()));
        let path = dir.join("acts.jsonl");
        {
            let (mut log, prior) = Log::open(&path).unwrap();
            assert!(prior.is_empty());
            assert_eq!(log.append(Act::Open { run: "r".into(), label: None }).unwrap().m, 1);
            assert_eq!(log.append(Act::Quiescent {}).unwrap().m, 2);
        }
        std::fs::OpenOptions::new().append(true).open(&path).unwrap().write_all(b"{\"m\":3,\"t\":0,\"ac").unwrap();
        let (mut log, prior) = Log::open(&path).unwrap();
        assert_eq!(prior.len(), 2);
        assert_eq!(log.append(Act::Quiescent {}).unwrap().m, 3);
        assert_eq!(read_log(&path).unwrap().len(), 3, "the torn fragment is gone and the log reads cleanly");
        let _ = std::fs::remove_dir_all(dir);
    }
}
