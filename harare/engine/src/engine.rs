//! The run actor: one task per run owns the run's state and act log, starts
//! module processes, and turns their output into acts.
//!
//! After every event the actor takes one scheduling step:
//!
//! 1. find pending work — chunks not yet dispatched, and values some module
//!    wants and has not been handed;
//! 2. defer what the task budget no longer allows;
//! 3. probe runners that pending work could use;
//! 4. admit by aged priority against free slots and runner capacity;
//! 5. start the admitted tasks;
//! 6. re-split rate resources among running tasks and send changed grants;
//! 7. record quiescence when nothing is pending and nothing runs.
//!
//! Nothing in the step looks at what a value says.

use crate::act::{Act, End, Entry, Log};
use crate::address::Address;
use crate::config::{Config, ResourceKind, Sched};
use crate::graph::{Chunk, ChunkDraft, ChunkId, Origin, Seq, TaskId, Value};
use crate::protocol::{FromModule, ToModule, PROTOCOL_VERSION};
use crate::report::{self, Report};
use crate::runner::{self, RunnerStatus};
use crate::sched::{self, Candidate, Pool};
use crate::state::RunState;
use serde_json::{json, Value as Json};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::sync::{broadcast, mpsc, oneshot, watch};

const STDERR_TAIL: usize = 4000;
const NOTE_MAX: usize = 300;

pub enum Ev {
    Line { task: TaskId, line: String },
    Exit { task: TaskId, end: End, stderr: String },
    Raise { chunks: Vec<ChunkDraft>, by: Origin, reply: oneshot::Sender<Result<Vec<ChunkId>, String>> },
    Probe { runner: String, ok: bool, detail: String },
    Cancel { task: TaskId, reply: oneshot::Sender<Result<(), String>> },
    Snapshot { reply: oneshot::Sender<Json> },
    Report { reply: oneshot::Sender<Report> },
    Tick,
}

/// A handle on a live run. Cheap to clone.
#[derive(Clone)]
pub struct RunHandle {
    pub id: String,
    pub dir: PathBuf,
    tx: mpsc::UnboundedSender<Ev>,
    acts: broadcast::Sender<Arc<str>>,
    quiet: watch::Receiver<bool>,
}

fn stopped<T>(_: T) -> String {
    "the run has stopped".to_string()
}

impl RunHandle {
    pub async fn raise(&self, chunks: Vec<ChunkDraft>) -> Result<Vec<ChunkId>, String> {
        let (reply, rx) = oneshot::channel();
        self.tx.send(Ev::Raise { chunks, by: Origin::api(), reply }).map_err(stopped)?;
        rx.await.map_err(stopped)?
    }

    pub async fn cancel(&self, task: TaskId) -> Result<(), String> {
        let (reply, rx) = oneshot::channel();
        self.tx.send(Ev::Cancel { task, reply }).map_err(stopped)?;
        rx.await.map_err(stopped)?
    }

    pub async fn snapshot(&self) -> Result<Json, String> {
        let (reply, rx) = oneshot::channel();
        self.tx.send(Ev::Snapshot { reply }).map_err(stopped)?;
        rx.await.map_err(stopped)
    }

    pub async fn report(&self) -> Result<Report, String> {
        let (reply, rx) = oneshot::channel();
        self.tx.send(Ev::Report { reply }).map_err(stopped)?;
        rx.await.map_err(stopped)
    }

    /// Every act, as its JSON log line, from now on.
    pub fn subscribe(&self) -> broadcast::Receiver<Arc<str>> {
        self.acts.subscribe()
    }

    /// True while the run is quiescent.
    pub fn quiet(&self) -> watch::Receiver<bool> {
        self.quiet.clone()
    }
}

pub fn log_path(dir: &Path) -> PathBuf {
    dir.join("acts.jsonl")
}

/// Start a new run in `dir` with the given seed chunks.
pub fn start(cfg: Arc<Config>, dir: PathBuf, id: String, label: Option<String>, seeds: Vec<ChunkDraft>) -> Result<RunHandle, String> {
    for s in &seeds {
        cfg.sched_for(s)?;
    }
    let (log, prior) = Log::open(&log_path(&dir)).map_err(|e| e.to_string())?;
    if !prior.is_empty() {
        return Err(format!("{} already holds a run", dir.display()));
    }
    let mut eng = Engine::new(cfg, log, RunState::default(), dir);
    eng.record(Act::Open { run: id, label });
    for s in seeds {
        eng.raise_chunk(s, Origin::api())?;
    }
    Ok(eng.spawn())
}

/// Continue a run from its log. Tasks that were running when the engine
/// stopped are recorded as lost, each with an error value on its node;
/// undispatched chunks and unread wants are picked up again.
pub fn resume(cfg: Arc<Config>, dir: PathBuf) -> Result<RunHandle, String> {
    let (log, prior) = Log::open(&log_path(&dir)).map_err(|e| e.to_string())?;
    if prior.is_empty() {
        return Err(format!("no run in {}", dir.display()));
    }
    let state = RunState::from_entries(&prior)?;
    let mut eng = Engine::new(cfg, log, state, dir);
    let lost: Vec<(TaskId, String, Address)> = eng.state.running().map(|t| (t.id, t.module.clone(), t.tau.clone())).collect();
    for (task, module, tau) in lost {
        eng.record(Act::Finish { task, end: End::Lost {} });
        eng.engine_error(&tau, json!({ "problem": "the engine stopped while this task ran", "task": task, "module": module }));
    }
    Ok(eng.spawn())
}

/// Read-only snapshot of a stored run, without starting it.
pub fn stored_snapshot(cfg: &Config, dir: &Path) -> Result<Json, String> {
    let entries = crate::act::read_log(&log_path(dir)).map_err(|e| e.to_string())?;
    let state = RunState::from_entries(&entries)?;
    Ok(base_snapshot(&state, cfg))
}

pub fn stored_state(dir: &Path) -> Result<RunState, String> {
    let entries = crate::act::read_log(&log_path(dir)).map_err(|e| e.to_string())?;
    RunState::from_entries(&entries)
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum PendKey {
    Chunk(ChunkId),
    Read(String, Address),
}

impl PendKey {
    fn label(&self) -> String {
        match self {
            PendKey::Chunk(c) => format!("chunk:{c}"),
            PendKey::Read(m, t) => format!("read:{m}@{t}"),
        }
    }
}

struct Pending {
    key: PendKey,
    module: String,
    tau: Address,
    chunk: Option<ChunkId>,
    reading: Vec<Seq>,
    sched: Sched,
}

struct Running {
    module: String,
    tau: Address,
    reading: Vec<Seq>,
    sched: Sched,
    runner: String,
    stdin: mpsc::UnboundedSender<String>,
    kill: Option<oneshot::Sender<()>>,
    cancel_requested: bool,
    last_progress: Option<Instant>,
    held: Option<(String, Option<f64>)>,
}

struct Engine {
    cfg: Arc<Config>,
    dir: PathBuf,
    state: RunState,
    log: Log,
    tx: mpsc::UnboundedSender<Ev>,
    rx: Option<mpsc::UnboundedReceiver<Ev>>,
    acts: broadcast::Sender<Arc<str>>,
    quiet_tx: watch::Sender<bool>,
    quiet_rx: watch::Receiver<bool>,
    running: BTreeMap<TaskId, Running>,
    since: BTreeMap<PendKey, (Instant, u64)>,
    order: u64,
    runners: BTreeMap<String, RunnerStatus>,
    levels: BTreeMap<String, Option<f64>>,
    pending_view: Vec<Json>,
}

impl Engine {
    fn new(cfg: Arc<Config>, log: Log, state: RunState, dir: PathBuf) -> Engine {
        let (tx, rx) = mpsc::unbounded_channel();
        let (acts, _) = broadcast::channel(1024);
        let (quiet_tx, quiet_rx) = watch::channel(state.quiescent);
        let runners = runner::initial_status(&cfg);
        Engine {
            cfg,
            dir,
            state,
            log,
            tx,
            rx: Some(rx),
            acts,
            quiet_tx,
            quiet_rx,
            running: BTreeMap::new(),
            since: BTreeMap::new(),
            order: 0,
            runners,
            levels: BTreeMap::new(),
            pending_view: Vec::new(),
        }
    }

    fn spawn(mut self) -> RunHandle {
        let handle = RunHandle {
            id: self.state.run.clone(),
            dir: self.dir.clone(),
            tx: self.tx.clone(),
            acts: self.acts.clone(),
            quiet: self.quiet_rx.clone(),
        };
        let mut rx = self.rx.take().expect("spawned twice");
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_secs(1));
            tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            self.step();
            loop {
                tokio::select! {
                    ev = rx.recv() => match ev {
                        Some(ev) => self.handle(ev),
                        None => break,
                    },
                    _ = tick.tick() => self.handle(Ev::Tick),
                }
                while let Ok(ev) = rx.try_recv() {
                    self.handle(ev);
                }
                self.step();
            }
        });
        handle
    }

    // ---- recording ------------------------------------------------------

    fn record(&mut self, act: Act) -> Entry {
        let entry = self.log.append(act).unwrap_or_else(|e| panic!("harare: cannot write {}: {e}", self.log.path().display()));
        if let Err(e) = self.state.apply(&entry) {
            panic!("harare: act m={} does not apply: {e}", entry.m);
        }
        if let Ok(line) = serde_json::to_string(&entry) {
            let _ = self.acts.send(line.into());
        }
        entry
    }

    fn emit_value(&mut self, tau: Address, kind: String, data: Json, by: Origin, read: Vec<Seq>) -> Seq {
        let value = Value { seq: self.state.graph.next_seq(), tau, kind, data, by, read };
        let seq = value.seq;
        self.record(Act::Emit { value });
        seq
    }

    fn engine_error(&mut self, tau: &Address, data: Json) {
        self.emit_value(tau.clone(), "error".into(), data, Origin::engine(), vec![]);
    }

    fn raise_chunk(&mut self, d: ChunkDraft, by: Origin) -> Result<ChunkId, String> {
        self.cfg.sched_for(&d)?;
        let chunk = Chunk {
            id: self.state.graph.next_chunk_id(),
            tau: d.tau,
            module: d.module,
            body: d.body,
            priority: d.priority,
            demand: d.demand,
            runners: d.runners,
            by,
        };
        let id = chunk.id;
        self.record(Act::Raise { chunk });
        Ok(id)
    }

    fn send(&self, task: TaskId, msg: &ToModule) {
        if let (Some(r), Ok(line)) = (self.running.get(&task), serde_json::to_string(msg)) {
            let _ = r.stdin.send(line);
        }
    }

    // ---- events ---------------------------------------------------------

    fn handle(&mut self, ev: Ev) {
        match ev {
            Ev::Line { task, line } => self.on_line(task, line),
            Ev::Exit { task, end, stderr } => self.on_exit(task, end, stderr),
            Ev::Raise { chunks, by, reply } => {
                // All or nothing: check every chunk before raising any.
                let check: Result<(), String> = chunks.iter().try_for_each(|c| self.cfg.sched_for(c).map(|_| ()));
                let out = check.and_then(|_| chunks.into_iter().map(|c| self.raise_chunk(c, by.clone())).collect());
                let _ = reply.send(out);
            }
            Ev::Probe { runner, ok, detail } => {
                if let Some(st) = self.runners.get_mut(&runner) {
                    st.available = ok;
                    st.detail = detail;
                    st.probing = false;
                    st.checked_at = Some(Instant::now());
                }
            }
            Ev::Cancel { task, reply } => {
                let grace = Duration::from_secs_f64(self.cfg.engine.cancel_grace_seconds.max(0.0));
                let out = match self.running.get_mut(&task) {
                    None => Err(format!("task {task} is not running")),
                    Some(r) => {
                        r.cancel_requested = true;
                        if let Some(kill) = r.kill.take() {
                            tokio::spawn(async move {
                                tokio::time::sleep(grace).await;
                                let _ = kill.send(());
                            });
                        }
                        Ok(())
                    }
                };
                if out.is_ok() {
                    self.send(task, &ToModule::Cancel {});
                }
                let _ = reply.send(out);
            }
            Ev::Snapshot { reply } => {
                let _ = reply.send(self.snapshot());
            }
            Ev::Report { reply } => {
                let _ = reply.send(report::build(&self.state));
            }
            Ev::Tick => self.flush_progress(false),
        }
    }

    fn on_line(&mut self, task: TaskId, line: String) {
        let Some(r) = self.running.get(&task) else { return };
        let (module, tau, reading) = (r.module.clone(), r.tau.clone(), r.reading.clone());
        match FromModule::parse(&line) {
            Some(FromModule::Emit { kind, data, tau: at, read }) => {
                let kind = kind.trim().to_string();
                if kind.is_empty() {
                    self.engine_error(&tau, json!({ "problem": "emit without a kind", "task": task, "module": module, "data": data }));
                    return;
                }
                self.emit_value(at.unwrap_or(tau), kind, data, Origin::task(&module, task), read.unwrap_or(reading));
            }
            Some(FromModule::Raise { tau: at, module: target, body, priority, demand, runners }) => {
                let draft = ChunkDraft { tau: at, module: target, body, priority, demand: demand.unwrap_or_default(), runners: runners.unwrap_or_default() };
                if let Err(reason) = self.raise_chunk(draft.clone(), Origin::task(&module, task)) {
                    self.engine_error(&tau, json!({ "problem": "raise refused", "reason": reason, "task": task, "module": module, "raise": draft }));
                }
            }
            Some(FromModule::Progress { note, fraction }) => self.progress(task, clip(&note), fraction),
            Some(FromModule::Read { tau: at }) => {
                let values: Vec<Value> = self.state.graph.read(&at).into_iter().cloned().collect();
                self.send(task, &ToModule::Values { tau: at, values });
            }
            None => {
                let t = line.trim();
                if !t.is_empty() {
                    self.progress(task, clip(t), None);
                }
            }
        }
    }

    fn progress(&mut self, task: TaskId, note: String, fraction: Option<f64>) {
        let interval = Duration::from_millis(self.cfg.engine.progress_interval_ms);
        let now = Instant::now();
        let Some(r) = self.running.get_mut(&task) else { return };
        if r.last_progress.is_none_or(|t| now.duration_since(t) >= interval) {
            r.last_progress = Some(now);
            r.held = None;
            self.record(Act::Progress { task, note, fraction });
        } else {
            r.held = Some((note, fraction));
        }
    }

    fn flush_progress(&mut self, force_all: bool) {
        let interval = Duration::from_millis(self.cfg.engine.progress_interval_ms);
        let now = Instant::now();
        let due: Vec<(TaskId, String, Option<f64>)> = self
            .running
            .iter_mut()
            .filter(|(_, r)| r.held.is_some() && (force_all || r.last_progress.is_none_or(|t| now.duration_since(t) >= interval)))
            .map(|(t, r)| {
                r.last_progress = Some(now);
                let (n, f) = r.held.take().unwrap();
                (*t, n, f)
            })
            .collect();
        for (task, note, fraction) in due {
            self.record(Act::Progress { task, note, fraction });
        }
    }

    fn on_exit(&mut self, task: TaskId, end: End, stderr: String) {
        if let Some(r) = self.running.get_mut(&task) {
            if let Some((note, fraction)) = r.held.take() {
                self.record(Act::Progress { task, note, fraction });
            }
        }
        let Some(r) = self.running.remove(&task) else { return };
        let end = match end {
            End::Failed { .. } => end,
            _ if r.cancel_requested => End::Cancelled {},
            other => other,
        };
        self.record(Act::Finish { task, end: end.clone() });
        match end {
            End::Exited { code: Some(0) } | End::Cancelled {} | End::Lost {} => {}
            End::Exited { code } => self.engine_error(
                &r.tau,
                json!({ "problem": "the module exited abnormally", "task": task, "module": r.module, "exit_code": code, "stderr": stderr }),
            ),
            End::Failed { reason } => self.engine_error(
                &r.tau,
                json!({ "problem": "the module could not be started", "task": task, "module": r.module, "runner": r.runner, "reason": reason }),
            ),
        }
    }

    // ---- scheduling -----------------------------------------------------

    fn compute_pending(&mut self) -> Vec<Pending> {
        let mut out = Vec::new();
        let mut refused = Vec::new();
        for c in self.state.undispatched() {
            let draft = ChunkDraft {
                tau: c.tau.clone(),
                module: c.module.clone(),
                body: Json::Null,
                priority: c.priority,
                demand: c.demand.clone(),
                runners: c.runners.clone(),
            };
            match self.cfg.sched_for(&draft) {
                Ok(sched) => out.push(Pending { key: PendKey::Chunk(c.id), module: c.module.clone(), tau: c.tau.clone(), chunk: Some(c.id), reading: vec![], sched }),
                Err(reason) => refused.push((c.module.clone(), c.tau.clone(), c.id, reason)),
            }
        }
        for (name, m) in &self.cfg.modules {
            if m.wants.is_empty() {
                continue;
            }
            let mut batches: BTreeMap<Address, Vec<Seq>> = BTreeMap::new();
            for v in self.state.graph.values() {
                if !self.state.read_mark.contains(&(name.clone(), v.seq)) && m.wants.iter().any(|w| w.matches(name, v)) {
                    batches.entry(v.tau.clone()).or_default().push(v.seq);
                }
            }
            let sched = self.cfg.sched_for_module(name).expect("configured module");
            for (tau, reading) in batches {
                out.push(Pending { key: PendKey::Read(name.clone(), tau.clone()), module: name.clone(), tau, chunk: None, reading, sched: sched.clone() });
            }
        }
        for (module, tau, chunk, reason) in refused {
            self.record(Act::Deferred { module, tau, chunk: Some(chunk), reading: vec![], reason });
        }
        out
    }

    fn step(&mut self) {
        let mut pending = self.compute_pending();
        let now = Instant::now();

        // Budget: past it, pending work is recorded as deferred, not started.
        let budget_left = self.cfg.engine.max_tasks.saturating_sub(self.state.tasks.len() as u64) as usize;
        if budget_left == 0 && !pending.is_empty() {
            let reason = format!("the run's task budget of {} is used up", self.cfg.engine.max_tasks);
            for p in pending.drain(..) {
                self.record(Act::Deferred { module: p.module, tau: p.tau, chunk: p.chunk, reading: p.reading, reason: reason.clone() });
            }
        }

        // Waiting times survive between steps; forget work that is no longer pending.
        let keys: Vec<PendKey> = pending.iter().map(|p| p.key.clone()).collect();
        self.since.retain(|k, _| keys.contains(k));
        for k in &keys {
            if !self.since.contains_key(k) {
                self.order += 1;
                self.since.insert(k.clone(), (now, self.order));
            }
        }

        // Probe the runners pending work could use.
        let wanted: std::collections::BTreeSet<String> = pending.iter().flat_map(|p| p.sched.runners.iter().cloned()).collect();
        for name in wanted {
            let Some(st) = self.runners.get_mut(&name) else { continue };
            if runner::needs_probe(&self.cfg, &name, st, now) {
                st.probing = true;
                let argv = self.cfg.runners[&name].probe.clone();
                let tx = self.tx.clone();
                tokio::spawn(async move {
                    let (ok, detail) = runner::probe(argv).await;
                    let _ = tx.send(Ev::Probe { runner: name, ok, detail });
                });
            }
        }

        // Admission.
        let mut pool = Pool::default();
        for (name, rc) in &self.cfg.resources {
            if rc.kind == ResourceKind::Slots {
                let used: f64 = self.running.values().map(|r| r.sched.slots.get(name).copied().unwrap_or(0.0)).sum();
                pool.resources.insert(name.clone(), (rc.capacity - used).max(0.0));
            }
        }
        for (name, rc) in &self.cfg.runners {
            if self.runners.get(name).is_some_and(|s| s.available) {
                let busy = self.running.values().filter(|r| &r.runner == name).count() as f64;
                pool.runners.insert(name.clone(), (rc.slots - busy).max(0.0));
            }
        }
        let free_runners = pool.runners.clone();
        let cands: Vec<Candidate> = pending
            .iter()
            .enumerate()
            .map(|(i, p)| {
                let (t0, order) = self.since[&p.key];
                Candidate { key: i, priority: p.sched.priority, waited: now.duration_since(t0).as_secs_f64(), order, slots: p.sched.slots.clone(), runners: p.sched.runners.clone() }
            })
            .collect();
        let outcome = sched::admit(&cands, &mut pool, self.cfg.engine.aging_seconds, self.cfg.engine.reserve_after_seconds);
        let admitted: BTreeMap<usize, String> = outcome.admitted.iter().take(budget_left).map(|a| (a.key, a.runner.clone())).collect();

        // What is left waiting, and why — for the map.
        self.pending_view = pending
            .iter()
            .enumerate()
            .filter(|(i, _)| !admitted.contains_key(i))
            .map(|(i, p)| {
                let c = &cands[i];
                let reachable: Vec<&String> = p.sched.runners.iter().filter(|r| free_runners.contains_key(*r)).collect();
                let reason = if reachable.is_empty() {
                    format!("no reachable runner ({})", p.sched.runners.join(", "))
                } else if outcome.reserved_for.is_some_and(|k| k != i) {
                    "held back for a task that has waited too long".to_string()
                } else {
                    "waiting for capacity".to_string()
                };
                json!({
                    "key": p.key.label(),
                    "module": p.module,
                    "tau": p.tau,
                    "chunk": p.chunk,
                    "reading": p.reading,
                    "priority": p.sched.priority,
                    "effective_priority": sched::effective_priority(p.sched.priority, c.waited, self.cfg.engine.aging_seconds),
                    "waited": c.waited,
                    "runners": p.sched.runners,
                    "slots": p.sched.slots,
                    "reserved": outcome.reserved_for == Some(i),
                    "reason": reason,
                })
            })
            .collect();

        let mut started = Vec::new();
        for (i, p) in pending.into_iter().enumerate() {
            if let Some(runner) = admitted.get(&i) {
                started.push((p, runner.clone()));
            }
        }
        let any_pending = !self.pending_view.is_empty();
        for (p, runner) in started {
            self.dispatch(p, runner);
        }

        self.regrant();

        let quiet = !any_pending && self.running.is_empty();
        if quiet && !self.state.quiescent && self.state.m > 0 {
            self.record(Act::Quiescent {});
        }
        let q = self.state.quiescent;
        self.quiet_tx.send_if_modified(|v| std::mem::replace(v, q) != q);
    }

    fn regrant(&mut self) {
        let mut next: BTreeMap<TaskId, BTreeMap<String, f64>> = BTreeMap::new();
        for (name, rc) in &self.cfg.resources {
            if rc.kind != ResourceKind::Rate {
                continue;
            }
            let claimants: Vec<(TaskId, f64, f64)> = self.running.iter().filter_map(|(t, r)| r.sched.rates.get(name).map(|d| (*t, r.sched.priority, *d))).collect();
            let claims: Vec<(f64, f64)> = claimants.iter().map(|(_, w, d)| (*w, *d)).collect();
            let (grants, level) = sched::waterfill(rc.capacity, &claims);
            self.levels.insert(name.clone(), level);
            for ((task, _, _), g) in claimants.iter().zip(grants) {
                next.entry(*task).or_default().insert(name.clone(), g);
            }
        }
        for (task, grant) in next {
            let current = self.state.tasks.get(&task).map(|t| t.grant.clone()).unwrap_or_default();
            let same = current.len() == grant.len() && grant.iter().all(|(k, v)| current.get(k).is_some_and(|c| (c - v).abs() <= 1e-9 * v.abs().max(1.0)));
            if !same {
                self.record(Act::Grant { task, grant: grant.clone() });
                self.send(task, &ToModule::Grant { grant });
            }
        }
    }

    fn dispatch(&mut self, p: Pending, runner_name: String) {
        let task = self.state.next_task_id();
        let module_cfg = self.cfg.modules[&p.module].clone();
        self.record(Act::Dispatch {
            task,
            module: p.module.clone(),
            tau: p.tau.clone(),
            chunk: p.chunk,
            reading: p.reading.clone(),
            runner: runner_name.clone(),
            priority: p.sched.priority,
        });

        let body = p.chunk.and_then(|c| self.state.graph.chunk(c)).map(|c| c.body.clone()).unwrap_or(Json::Null);
        let msg = ToModule::Task {
            harare: PROTOCOL_VERSION,
            run: self.state.run.clone(),
            task,
            module: p.module.clone(),
            tau: p.tau.clone(),
            body,
            config: module_cfg.config.clone(),
            reading: p.reading.iter().filter_map(|s| self.state.graph.value(*s)).cloned().collect(),
            node: self.state.graph.read(&p.tau).into_iter().cloned().collect(),
            grant: BTreeMap::new(),
        };
        let first_line = serde_json::to_string(&msg).expect("task message serialises");

        let (stdin_tx, stdin_rx) = mpsc::unbounded_channel::<String>();
        let (kill_tx, kill_rx) = oneshot::channel::<()>();
        self.running.insert(
            task,
            Running {
                module: p.module.clone(),
                tau: p.tau.clone(),
                reading: p.reading,
                sched: p.sched,
                runner: runner_name.clone(),
                stdin: stdin_tx.clone(),
                kill: Some(kill_tx),
                cancel_requested: false,
                last_progress: None,
                held: None,
            },
        );
        let _ = stdin_tx.send(first_line);

        let child = runner::build_command(&self.cfg, &runner_name, &p.module, &module_cfg).and_then(|mut c| c.spawn().map_err(|e| e.to_string()));
        match child {
            Ok(child) => supervise(task, child, stdin_rx, kill_rx, self.tx.clone()),
            Err(reason) => {
                let _ = self.tx.send(Ev::Exit { task, end: End::Failed { reason }, stderr: String::new() });
            }
        }
    }

    // ---- views ----------------------------------------------------------

    fn snapshot(&self) -> Json {
        let mut snap = base_snapshot(&self.state, &self.cfg);
        let obj = snap.as_object_mut().unwrap();
        obj.insert("live".into(), json!(true));
        obj.insert(
            "runners".into(),
            Json::Array(
                self.cfg
                    .runners
                    .iter()
                    .map(|(name, rc)| {
                        let st = &self.runners[name];
                        let busy = self.running.values().filter(|r| &r.runner == name).count();
                        json!({
                            "name": name,
                            "label": rc.label,
                            "slots": rc.slots,
                            "busy": busy,
                            "remote": !rc.wrap.is_empty(),
                            "probed": !rc.probe.is_empty(),
                            "available": st.available,
                            "probing": st.probing,
                            "detail": st.detail,
                        })
                    })
                    .collect(),
            ),
        );
        obj.insert(
            "resources".into(),
            Json::Array(
                self.cfg
                    .resources
                    .iter()
                    .map(|(name, rc)| {
                        let in_use: f64 = match rc.kind {
                            ResourceKind::Slots => self.running.values().map(|r| r.sched.slots.get(name).copied().unwrap_or(0.0)).sum(),
                            ResourceKind::Rate => self.state.running().map(|t| t.grant.get(name).copied().unwrap_or(0.0)).sum(),
                        };
                        let demand: f64 = match rc.kind {
                            ResourceKind::Slots => in_use,
                            ResourceKind::Rate => self.running.values().map(|r| r.sched.rates.get(name).copied().unwrap_or(0.0)).sum(),
                        };
                        json!({
                            "name": name,
                            "kind": rc.kind_name(),
                            "label": rc.label,
                            "unit": rc.unit,
                            "capacity": rc.capacity,
                            "in_use": in_use,
                            "demand": demand,
                            "level": self.levels.get(name).cloned().flatten(),
                        })
                    })
                    .collect(),
            ),
        );
        obj.insert("pending".into(), Json::Array(self.pending_view.clone()));
        snap
    }
}

impl crate::config::ResourceCfg {
    pub fn kind_name(&self) -> &'static str {
        match self.kind {
            ResourceKind::Slots => "slots",
            ResourceKind::Rate => "rate",
        }
    }
}

fn clip(s: &str) -> String {
    if s.chars().count() > NOTE_MAX {
        format!("{}…", s.chars().take(NOTE_MAX).collect::<String>())
    } else {
        s.to_string()
    }
}

/// Wire a child's stdio to the run actor. The exit event is sent only after
/// stdout is drained, so every line a module wrote is handled before its
/// finish act.
fn supervise(task: TaskId, mut child: tokio::process::Child, mut stdin_rx: mpsc::UnboundedReceiver<String>, kill_rx: oneshot::Receiver<()>, tx: mpsc::UnboundedSender<Ev>) {
    if let Some(mut stdin) = child.stdin.take() {
        tokio::spawn(async move {
            while let Some(mut line) = stdin_rx.recv().await {
                line.push('\n');
                if stdin.write_all(line.as_bytes()).await.is_err() || stdin.flush().await.is_err() {
                    break;
                }
            }
        });
    }
    let reader = child.stdout.take().map(|out| {
        let tx = tx.clone();
        tokio::spawn(async move {
            let mut lines = BufReader::new(out).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if tx.send(Ev::Line { task, line }).is_err() {
                    break;
                }
            }
        })
    });
    let tail = Arc::new(Mutex::new(String::new()));
    let errs = child.stderr.take().map(|mut err| {
        let tail = tail.clone();
        tokio::spawn(async move {
            let mut buf = [0u8; 4096];
            loop {
                match err.read(&mut buf).await {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let mut t = tail.lock().unwrap();
                        t.push_str(&String::from_utf8_lossy(&buf[..n]));
                        let len = t.chars().count();
                        if len > STDERR_TAIL {
                            *t = t.chars().skip(len - STDERR_TAIL).collect();
                        }
                    }
                }
            }
        })
    });
    tokio::spawn(async move {
        // Only an explicit send kills; a dropped sender means "never".
        let killed = async {
            if kill_rx.await.is_err() {
                std::future::pending::<()>().await;
            }
        };
        let status = tokio::select! {
            s = child.wait() => s,
            _ = killed => {
                let _ = child.start_kill();
                child.wait().await
            }
        };
        // A grandchild can keep a pipe open after the module exits; do not
        // wait on it forever.
        if let Some(r) = reader {
            let _ = tokio::time::timeout(Duration::from_secs(5), r).await;
        }
        if let Some(e) = errs {
            let _ = tokio::time::timeout(Duration::from_secs(2), e).await;
        }
        let end = match status {
            Ok(s) => End::Exited { code: s.code() },
            Err(e) => End::Failed { reason: e.to_string() },
        };
        let stderr = tail.lock().unwrap().trim().to_string();
        let _ = tx.send(Ev::Exit { task, end, stderr });
    });
}

/// The run as the map needs it. Live runs add runners, resources and pending
/// work on top.
pub fn base_snapshot(state: &RunState, cfg: &Config) -> Json {
    let g = &state.graph;
    let chunks: Vec<Json> = g
        .chunks()
        .iter()
        .map(|c| {
            let mut j = serde_json::to_value(c).unwrap();
            let o = j.as_object_mut().unwrap();
            o.insert("dispatched".into(), json!(state.dispatched_chunks.contains(&c.id)));
            o.insert("deferred".into(), json!(state.deferred_chunks.contains(&c.id)));
            j
        })
        .collect();
    let raises: Vec<Json> = g
        .chunks()
        .iter()
        .filter_map(|c| {
            let t = state.tasks.get(&c.by.task?)?;
            Some(json!({ "from": t.tau, "to": c.tau, "by": c.by.module, "chunk": c.id, "task": t.id }))
        })
        .collect();
    json!({
        "run": state.run,
        "label": state.label,
        "m": state.m,
        "quiescent": state.quiescent,
        "opened_t": state.opened_t,
        "last_t": state.last_t,
        "fingerprint": report::protocol_fingerprint(state),
        "live": false,
        "modules": cfg.modules.iter().map(|(name, m)| json!({
            "name": name,
            "mode": m.mode,
            "color": m.color,
            "description": m.description,
            "reads": !m.wants.is_empty(),
            "priority": m.priority,
            "runners": m.runners,
        })).collect::<Vec<_>>(),
        "nodes": g.nodes().map(|n| json!({ "tau": n.tau, "first_m": n.first_m, "chunks": n.chunks, "values": n.values })).collect::<Vec<_>>(),
        "chunks": chunks,
        "values": g.values(),
        "edges": g.edges(),
        "raises": raises,
        "tasks": state.tasks.values().collect::<Vec<_>>(),
        "deferred": state.deferred,
        "runners": cfg.runners.iter().map(|(name, rc)| json!({ "name": name, "label": rc.label, "slots": rc.slots, "remote": !rc.wrap.is_empty() })).collect::<Vec<_>>(),
        "resources": cfg.resources.iter().map(|(name, rc)| json!({ "name": name, "kind": rc.kind_name(), "label": rc.label, "unit": rc.unit, "capacity": rc.capacity })).collect::<Vec<_>>(),
        "pending": [],
    })
}
