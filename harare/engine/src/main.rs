use anyhow::{anyhow, bail, Context, Result};
use clap::{Parser, Subcommand};
use harare::act::{read_log, Act, Entry};
use harare::config::Config;
use harare::engine;
use harare::graph::ChunkDraft;
use harare::report;
use harare::server::{self, App};
use harare::state::RunState;
use serde::Deserialize;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Parser)]
#[command(name = "harare", version, about = "Runtime-graph engine: dispatch every chunk, record every value, share capacity by priority and bandwidth.")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Serve the API and the metro map.
    Serve {
        /// harare.toml (default: $HARARE_CONFIG, then ./harare.toml)
        #[arg(long)]
        config: Option<PathBuf>,
        /// Where runs are kept (default: .harare next to harare.toml)
        #[arg(long)]
        state: Option<PathBuf>,
        #[arg(long, default_value = "127.0.0.1:7470")]
        addr: SocketAddr,
        /// Allow a non-loopback address. The server starts processes; put it
        /// behind something that authenticates (e.g. Tailscale Serve).
        #[arg(long)]
        allow_remote: bool,
        /// Directory of the built metro viewer (default: metro/ next to harare.toml)
        #[arg(long)]
        metro: Option<PathBuf>,
    },
    /// Run a plan to quiescence without a server and print its report.
    Run {
        /// A plan file (.toml or .json) with `label` and `[[chunk]]` entries.
        plan: PathBuf,
        #[arg(long)]
        config: Option<PathBuf>,
        #[arg(long)]
        state: Option<PathBuf>,
        #[arg(long)]
        label: Option<String>,
        /// Print the report as JSON.
        #[arg(long)]
        json: bool,
        /// Stop after this many seconds in which nothing runs and all pending
        /// work waits for unreachable runners.
        #[arg(long, default_value_t = 30.0)]
        wait: f64,
        /// Do not print acts as they happen.
        #[arg(long)]
        quiet: bool,
    },
    /// Print the report of a stored run (its directory or acts.jsonl).
    Report {
        run: PathBuf,
        #[arg(long)]
        json: bool,
    },
    /// Check harare.toml, and optionally probe its runners.
    Check {
        #[arg(long)]
        config: Option<PathBuf>,
        #[arg(long)]
        probe: bool,
    },
}

#[derive(Deserialize)]
struct Plan {
    #[serde(default)]
    label: Option<String>,
    #[serde(default, alias = "chunk")]
    chunks: Vec<ChunkDraft>,
}

fn find_config(explicit: Option<PathBuf>) -> Result<PathBuf> {
    if let Some(p) = explicit {
        return Ok(p);
    }
    if let Ok(p) = std::env::var("HARARE_CONFIG") {
        return Ok(PathBuf::from(p));
    }
    let local = PathBuf::from("harare.toml");
    if local.exists() {
        return Ok(local);
    }
    bail!("no harare.toml: pass --config, set HARARE_CONFIG, or run from a directory that has one")
}

fn load(explicit: Option<PathBuf>) -> Result<Arc<Config>> {
    let path = find_config(explicit)?;
    Ok(Arc::new(Config::load(&path).map_err(|e| anyhow!(e))?))
}

fn state_dir(cfg: &Config, explicit: Option<PathBuf>) -> PathBuf {
    explicit.unwrap_or_else(|| cfg.dir.join(".harare"))
}

fn load_plan(path: &Path) -> Result<Plan> {
    let text = std::fs::read_to_string(path).with_context(|| path.display().to_string())?;
    if path.extension().is_some_and(|e| e == "json") {
        Ok(serde_json::from_str(&text).with_context(|| path.display().to_string())?)
    } else {
        Ok(toml::from_str(&text).with_context(|| path.display().to_string())?)
    }
}

fn describe(e: &Entry) -> String {
    match &e.act {
        Act::Open { run, .. } => format!("open {run}"),
        Act::Raise { chunk } => format!("raise #{} {} @ {} (by {})", chunk.id, chunk.module, chunk.tau, chunk.by.module),
        Act::Dispatch { task, module, tau, chunk, reading, runner, .. } => match chunk {
            Some(c) => format!("dispatch task {task}: {module} runs chunk #{c} @ {tau} on {runner}"),
            None => format!("dispatch task {task}: {module} reads {:?} @ {tau} on {runner}", reading),
        },
        Act::Grant { task, grant } => format!("grant task {task}: {grant:?}"),
        Act::Progress { task, note, .. } => format!("task {task}: {note}"),
        Act::Emit { value } => format!("emit #{} {} @ {} by {}", value.seq, value.kind, value.tau, value.by.module),
        Act::Finish { task, end } => format!("finish task {task}: {}", serde_json::to_string(end).unwrap_or_default()),
        Act::Deferred { module, tau, reason, .. } => format!("deferred {module} @ {tau}: {reason}"),
        Act::Quiescent {} => "quiescent".into(),
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    match Cli::parse().cmd {
        Cmd::Serve { config, state, addr, allow_remote, metro } => {
            if !addr.ip().is_loopback() && !allow_remote {
                bail!("{addr} is not a loopback address; the server starts processes, so pass --allow-remote only behind an authenticating proxy");
            }
            let cfg = load(config)?;
            let state = state_dir(&cfg, state);
            let metro = metro.unwrap_or_else(|| cfg.dir.join("metro"));
            let metro = metro.join("index.html").exists().then_some(metro);
            let app = App::new(cfg.clone(), state.clone());
            let listener = tokio::net::TcpListener::bind(addr).await.with_context(|| format!("bind {addr}"))?;
            eprintln!("harare: {} module(s), {} runner(s); runs in {}", cfg.modules.len(), cfg.runners.len(), state.display());
            match &metro {
                Some(_) => eprintln!("harare: metro map at http://{addr}/"),
                None => eprintln!("harare: metro viewer not built (npm run build in harare/); API only"),
            }
            eprintln!("harare: API at http://{addr}/api/runs");
            axum::serve(listener, server::router(app, metro)).await?;
            Ok(())
        }
        Cmd::Run { plan, config, state, label, json, wait, quiet } => {
            let cfg = load(config)?;
            let plan = load_plan(&plan)?;
            let state = state_dir(&cfg, state);
            let id = server::new_run_id(&state);
            let dir = state.join("runs").join(&id);
            let handle = engine::start(cfg, dir.clone(), id.clone(), label.or(plan.label), plan.chunks).map_err(|e| anyhow!(e))?;
            eprintln!("harare: run {id} in {}", dir.display());
            let mut acts = handle.subscribe();
            let mut quiet_rx = handle.quiet();
            let mut stuck_since: Option<Instant> = None;
            let mut tick = tokio::time::interval(Duration::from_secs(1));
            let ctrl_c = tokio::signal::ctrl_c();
            tokio::pin!(ctrl_c);
            loop {
                if *quiet_rx.borrow() {
                    break;
                }
                tokio::select! {
                    act = acts.recv() => {
                        if let Ok(line) = act {
                            if !quiet {
                                if let Ok(e) = serde_json::from_str::<Entry>(&line) {
                                    eprintln!("  m={:<5} {}", e.m, describe(&e));
                                }
                            }
                        }
                    }
                    _ = quiet_rx.changed() => {}
                    _ = tick.tick() => {
                        let snap = handle.snapshot().await.map_err(|e| anyhow!(e))?;
                        let running = snap["tasks"].as_array().map(|t| t.iter().any(|x| x["state"] == "running")).unwrap_or(false);
                        let pending = snap["pending"].as_array().cloned().unwrap_or_default();
                        let all_unreachable = !pending.is_empty() && pending.iter().all(|p| p["reason"].as_str().is_some_and(|r| r.starts_with("no reachable runner")));
                        if !running && all_unreachable {
                            let t0 = *stuck_since.get_or_insert_with(Instant::now);
                            if t0.elapsed().as_secs_f64() >= wait {
                                eprintln!("harare: {} piece(s) of work wait for unreachable runners; stopping after {wait}s", pending.len());
                                break;
                            }
                        } else {
                            stuck_since = None;
                        }
                    }
                    _ = &mut ctrl_c => {
                        eprintln!("harare: interrupted");
                        break;
                    }
                }
            }
            let rep = handle.report().await.map_err(|e| anyhow!(e))?;
            if json {
                println!("{}", serde_json::to_string_pretty(&rep)?);
            } else {
                print!("{}", report::render_text(&rep));
            }
            Ok(())
        }
        Cmd::Report { run, json } => {
            let path = if run.is_dir() { engine::log_path(&run) } else { run };
            let entries = read_log(&path).with_context(|| path.display().to_string())?;
            let st = RunState::from_entries(&entries).map_err(|e| anyhow!(e))?;
            let rep = report::build(&st);
            if json {
                println!("{}", serde_json::to_string_pretty(&rep)?);
            } else {
                print!("{}", report::render_text(&rep));
            }
            Ok(())
        }
        Cmd::Check { config, probe } => {
            let cfg = load(config)?;
            println!("config: {}", cfg.dir.display());
            println!("resources:");
            for (n, r) in &cfg.resources {
                println!("  {n:<14} {:<6} capacity {}{}", r.kind_name(), r.capacity, r.unit.as_deref().map(|u| format!(" {u}")).unwrap_or_default());
            }
            println!("runners:");
            for (n, r) in &cfg.runners {
                let how = if r.wrap.is_empty() { "here".to_string() } else { r.wrap.join(" ") };
                let status = if probe && !r.probe.is_empty() {
                    let (ok, detail) = harare::runner::probe(r.probe.clone()).await;
                    format!("  [{}: {detail}]", if ok { "reachable" } else { "unreachable" })
                } else {
                    String::new()
                };
                println!("  {n:<14} {} slot(s), via {how}{status}", r.slots);
            }
            println!("modules:");
            for (n, m) in &cfg.modules {
                let reads = if m.wants.is_empty() { String::new() } else { format!(", reads {} want(s)", m.wants.len()) };
                println!("  {n:<14} [{}] priority {} on {}{reads}: {}", m.mode, m.priority, m.runners.join(" > "), m.command.join(" "));
            }
            Ok(())
        }
    }
}
