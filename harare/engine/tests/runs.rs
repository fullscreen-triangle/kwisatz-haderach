//! End-to-end runs through real module processes (Node scripts in
//! tests/fixtures that speak the raw protocol).

use harare::act::{now_ms, read_log, Act, End, Log};
use harare::config::Config;
use harare::engine::{self, RunHandle};
use harare::graph::{Chunk, ChunkDraft, Origin};
use harare::report;
use harare::state::RunState;
use harare::Address;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

fn fixture(name: &str) -> String {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests").join("fixtures").join(name).to_string_lossy().replace('\\', "/")
}

fn tmpdir(tag: &str) -> PathBuf {
    std::env::temp_dir().join(format!("harare-it-{tag}-{}-{}", std::process::id(), now_ms()))
}

/// A config with the three fixture modules plus `extra` TOML.
fn config(engine: &str, extra: &str) -> Arc<Config> {
    let text = format!(
        r#"
[engine]
progress_interval_ms = 0
{engine}

[modules.emit]
command = ["node", "{emit}"]

[modules.slow]
command = ["node", "{slow}"]

{extra}
"#,
        emit = fixture("emit.mjs"),
        slow = fixture("slow.mjs"),
    );
    Arc::new(Config::from_str_in(&text, &std::env::temp_dir()).unwrap_or_else(|e| panic!("config: {e}\n{text}")))
}

fn reader_module(name: &str, kinds: &[&str], out: &str) -> String {
    format!(
        "[modules.{name}]\ncommand = [\"node\", \"{}\"]\nconfig = {{ out = \"{out}\" }}\n[[modules.{name}.wants]]\nkinds = {kinds:?}\n",
        fixture("reader.mjs")
    )
}

fn chunk(tau: &str, module: &str, body: Value) -> ChunkDraft {
    ChunkDraft { tau: Address::parse(tau).unwrap(), module: module.into(), body, priority: None, demand: Default::default(), runners: vec![] }
}

async fn until_quiet(h: &RunHandle) {
    let mut q = h.quiet();
    tokio::time::timeout(Duration::from_secs(30), async {
        while !*q.borrow() {
            q.changed().await.unwrap();
        }
    })
    .await
    .expect("run did not reach quiescence within 30 s");
}

fn start(cfg: Arc<Config>, tag: &str, seeds: Vec<ChunkDraft>) -> (RunHandle, PathBuf) {
    let dir = tmpdir(tag);
    let h = engine::start(cfg, dir.clone(), format!("it-{tag}"), None, seeds).unwrap();
    (h, dir)
}

fn kinds(r: &report::Report) -> Vec<(String, String)> {
    r.nodes.iter().flat_map(|n| n.values.iter().map(|v| (v.tau.to_string(), v.kind.clone()))).collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_read_draws_the_only_edge() {
    let cfg = config("", &reader_module("reader", &["query"], "answer"));
    let (h, dir) = start(cfg, "edge", vec![chunk("a/q", "emit", json!({ "emit": "query", "data": "dentist" }))]);
    until_quiet(&h).await;
    let r = h.report().await.unwrap();
    assert!(r.quiescent);
    assert_eq!(r.edges.len(), 1, "{:?}", r.edges);
    let e = &r.edges[0];
    assert_eq!((e.from.to_string(), e.to.to_string(), e.by.as_str()), ("a/q".into(), "a/q/answer".into(), "reader"));
    let seen = r.nodes.iter().find(|n| n.tau.to_string() == "a/q/answer").unwrap();
    assert_eq!(seen.values[0].read, vec![1]);
    assert_eq!(seen.values[0].data["count"], 1);

    // The stored log replays to the same report.
    let replay = report::build(&RunState::from_entries(&read_log(&engine::log_path(&dir)).unwrap()).unwrap());
    assert_eq!(replay.protocol_fingerprint, r.protocol_fingerprint);
    assert_eq!(replay.m, r.m);
    assert_eq!(replay.edges, r.edges);
    assert_eq!(kinds(&replay), kinds(&r));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_crash_is_a_value_and_can_be_read() {
    let cfg = config("", &reader_module("medic", &["error"], "diagnosis"));
    let (h, _) = start(cfg, "crash", vec![chunk("a/x", "emit", json!({ "emit": "partial", "exit": 3 }))]);
    until_quiet(&h).await;
    let r = h.report().await.unwrap();
    assert!(r.quiescent, "a crash does not stop the run");
    assert_eq!(r.errors.len(), 1);
    let e = &r.errors[0];
    assert_eq!(e.by.module, "harare");
    assert_eq!(e.data["exit_code"], 3);
    assert!(e.data["stderr"].as_str().unwrap().contains("boom"));
    assert!(kinds(&r).contains(&("a/x".into(), "partial".into())), "what was emitted before the crash stays");
    assert!(kinds(&r).contains(&("a/x/diagnosis".into(), "seen".into())), "the error value was read like any other");
    assert_eq!(r.tasks.exited, 2);
}

#[tokio::test(flavor = "multi_thread")]
async fn raises_converge_and_refused_raises_become_errors() {
    let cfg = config("", "");
    let body = json!({
        "emit": "plan",
        "raise": [
            { "tau": "plan/a", "module": "emit", "body": { "emit": "done" } },
            { "tau": "plan/a", "module": "emit", "body": { "emit": "again" } },
            { "tau": "plan/b", "module": "nope" }
        ]
    });
    let (h, _) = start(cfg, "raise", vec![chunk("plan", "emit", body)]);
    until_quiet(&h).await;
    let r = h.report().await.unwrap();
    let a = r.nodes.iter().find(|n| n.tau.to_string() == "plan/a").unwrap();
    assert_eq!(a.chunks.len(), 2, "two raises on one address converge on one node");
    assert!(a.chunks.iter().all(|c| c.dispatched && c.by == "emit"));
    let mut ks: Vec<&str> = a.values.iter().map(|v| v.kind.as_str()).collect();
    ks.sort();
    assert_eq!(ks, vec!["again", "done"]);
    assert_eq!(r.errors.len(), 1);
    assert_eq!(r.errors[0].data["problem"], "raise refused");
    let snap = h.snapshot().await.unwrap();
    assert_eq!(snap["raises"].as_array().unwrap().len(), 2);
    assert_eq!(snap["raises"][0]["from"], "plan");
}

#[tokio::test(flavor = "multi_thread")]
async fn slots_go_to_the_highest_priority_first() {
    let cfg = config("aging_seconds = 0", "[resources.gpu]\nkind = \"slots\"\ncapacity = 1\n[modules.slow.demand]\ngpu = 1\n");
    let mut seeds = Vec::new();
    for (name, p) in [("p1", 1.0), ("p5", 5.0), ("p3", 3.0)] {
        let mut c = chunk(&format!("jobs/{name}"), "slow", json!({ "ms": 150, "name": name }));
        c.priority = Some(p);
        seeds.push(c);
    }
    let (h, dir) = start(cfg, "prio", seeds);
    until_quiet(&h).await;
    let order: Vec<String> = read_log(&engine::log_path(&dir))
        .unwrap()
        .into_iter()
        .filter_map(|e| match e.act {
            Act::Dispatch { tau, .. } => Some(tau.leaf().to_string()),
            _ => None,
        })
        .collect();
    assert_eq!(order, vec!["p5", "p3", "p1"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn bandwidth_is_water_filled_by_priority() {
    let cfg = config("", "[resources.net]\nkind = \"rate\"\ncapacity = 30\n[modules.slow.demand]\nnet = 100\n");
    let mut a = chunk("dl/a", "slow", json!({ "ms": 1200 }));
    a.priority = Some(1.0);
    let mut b = chunk("dl/b", "slow", json!({ "ms": 1200 }));
    b.priority = Some(2.0);
    let (h, _) = start(cfg, "rate", vec![a, b]);
    until_quiet(&h).await;
    let r = h.report().await.unwrap();
    let granted = |leaf: &str| -> f64 {
        let n = r.nodes.iter().find(|n| n.tau.leaf() == leaf).unwrap();
        n.values.iter().find(|v| v.kind == "granted").unwrap().data["net"].as_f64().unwrap()
    };
    assert!((granted("a") - 10.0).abs() < 1e-6, "a got {}", granted("a"));
    assert!((granted("b") - 20.0).abs() < 1e-6, "b got {}", granted("b"));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_budget_defers_instead_of_hanging() {
    let cfg = config("max_tasks = 2", "");
    let seeds = (0..3).map(|i| chunk(&format!("b/{i}"), "emit", json!({ "emit": "x" }))).collect();
    let (h, _) = start(cfg, "budget", seeds);
    until_quiet(&h).await;
    let r = h.report().await.unwrap();
    assert_eq!(r.tasks.total, 2);
    assert_eq!(r.deferred.len(), 1);
    assert!(r.deferred[0].reason.contains("budget"));
    assert!(r.undispatched.is_empty());
}

#[tokio::test(flavor = "multi_thread")]
async fn work_for_an_unreachable_runner_waits_visibly() {
    let cfg = config("", "[runners.mars]\nwrap = [\"ssh\", \"mars\", \"--\"]\nprobe = [\"node\", \"-e\", \"process.exit(1)\"]\n");
    let mut c = chunk("far/away", "emit", json!({ "emit": "x" }));
    c.runners = vec!["mars".into()];
    let (h, _) = start(cfg, "offline", vec![c]);
    tokio::time::sleep(Duration::from_millis(2500)).await;
    let snap = h.snapshot().await.unwrap();
    assert_eq!(snap["quiescent"], false);
    let p = &snap["pending"][0];
    assert!(p["reason"].as_str().unwrap().starts_with("no reachable runner"), "{p}");
    let mars = snap["runners"].as_array().unwrap().iter().find(|r| r["name"] == "mars").unwrap();
    assert_eq!(mars["available"], false);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_cancelled_task_ends_without_an_error() {
    let cfg = config("cancel_grace_seconds = 2", "");
    let (h, _) = start(cfg, "cancel", vec![chunk("long", "slow", json!({ "ms": 60000 }))]);
    tokio::time::timeout(Duration::from_secs(10), async {
        loop {
            let s = h.snapshot().await.unwrap();
            if s["values"].as_array().unwrap().iter().any(|v| v["kind"] == "started") {
                break;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    })
    .await
    .unwrap();
    h.cancel(1).await.unwrap();
    until_quiet(&h).await;
    let snap = h.snapshot().await.unwrap();
    assert_eq!(snap["tasks"][0]["end"]["how"], "cancelled");
    assert_eq!(h.report().await.unwrap().errors.len(), 0);
}

#[tokio::test(flavor = "multi_thread")]
async fn resume_records_lost_tasks_and_finishes_the_rest() {
    let cfg = config("", "");
    let dir = tmpdir("resume");
    {
        let (mut log, _) = Log::open(&engine::log_path(&dir)).unwrap();
        let mk = |id: u64, tau: &str| Chunk {
            id,
            tau: Address::parse(tau).unwrap(),
            module: "emit".into(),
            body: json!({ "emit": "done" }),
            priority: None,
            demand: Default::default(),
            runners: vec![],
            by: Origin::api(),
        };
        log.append(Act::Open { run: "it-resume".into(), label: None }).unwrap();
        log.append(Act::Raise { chunk: mk(1, "r/one") }).unwrap();
        log.append(Act::Raise { chunk: mk(2, "r/two") }).unwrap();
        log.append(Act::Dispatch { task: 1, module: "emit".into(), tau: Address::parse("r/one").unwrap(), chunk: Some(1), reading: vec![], runner: "local".into(), priority: 1.0 }).unwrap();
        // ...and the engine stopped here.
    }
    let h = engine::resume(cfg, dir.clone()).unwrap();
    until_quiet(&h).await;
    let r = h.report().await.unwrap();
    assert_eq!(r.tasks.lost, 1);
    assert_eq!(r.errors.len(), 1);
    assert_eq!(r.errors[0].tau.to_string(), "r/one");
    assert!(kinds(&r).contains(&("r/two".into(), "done".into())), "the undispatched chunk ran after resume");
    assert!(matches!(RunState::from_entries(&read_log(&engine::log_path(&dir)).unwrap()).unwrap().tasks[&1].state, harare::state::TaskState::Ended { end: End::Lost {} }));
}
