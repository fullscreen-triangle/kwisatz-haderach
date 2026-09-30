//! Runners: where a task's process runs.
//!
//! A runner is this machine, or a prefix that carries a command somewhere
//! else — `ssh vingi --` for the laptop over Tailscale, `gh codespace ssh -c
//! NAME --` for a codespace. The stdio protocol passes through either way, so
//! a module does not know where it runs and the graph does not record it
//! beyond the dispatch act.
//!
//! A runner with a `probe` is used only while its probe succeeds; the result
//! is trusted for `probe_ttl_seconds`. Work that may only run on unreachable
//! runners waits, and is shown waiting.

use crate::config::{Config, ModuleCfg};
use std::process::Stdio;
use std::time::{Duration, Instant};
use tokio::process::Command;

#[derive(Clone, Debug)]
pub struct RunnerStatus {
    pub available: bool,
    pub checked_at: Option<Instant>,
    pub probing: bool,
    pub detail: String,
}

pub fn initial_status(cfg: &Config) -> std::collections::BTreeMap<String, RunnerStatus> {
    cfg.runners
        .iter()
        .map(|(name, r)| {
            let probed = !r.probe.is_empty();
            (
                name.clone(),
                RunnerStatus {
                    available: !probed,
                    checked_at: None,
                    probing: false,
                    detail: if probed { "not checked yet".into() } else { "always available".into() },
                },
            )
        })
        .collect()
}

pub fn needs_probe(cfg: &Config, name: &str, st: &RunnerStatus, now: Instant) -> bool {
    let Some(r) = cfg.runners.get(name) else { return false };
    if r.probe.is_empty() || st.probing {
        return false;
    }
    match st.checked_at {
        None => true,
        Some(t) => now.duration_since(t).as_secs_f64() >= cfg.engine.probe_ttl_seconds,
    }
}

/// Run a probe command. Success is exit status zero within 20 seconds.
pub async fn probe(argv: Vec<String>) -> (bool, String) {
    let Some((prog, args)) = argv.split_first() else { return (true, "no probe".into()) };
    let mut cmd = Command::new(prog);
    cmd.args(args).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).kill_on_drop(true);
    hide_window(&mut cmd);
    match tokio::time::timeout(Duration::from_secs(20), cmd.output()).await {
        Err(_) => (false, "probe timed out after 20 s".into()),
        Ok(Err(e)) => (false, format!("probe could not start: {e}")),
        Ok(Ok(out)) => {
            let text = String::from_utf8_lossy(if out.status.success() { &out.stdout } else { &out.stderr }).trim().to_string();
            let first = text.lines().next().unwrap_or("").chars().take(160).collect::<String>();
            if out.status.success() {
                (true, if first.is_empty() { "reachable".into() } else { first })
            } else {
                (false, if first.is_empty() { format!("probe exited with {:?}", out.status.code()) } else { first })
            }
        }
    }
}

/// The command that runs `module` on `runner`, with piped stdio.
pub fn build_command(cfg: &Config, runner: &str, module_name: &str, module: &ModuleCfg) -> Result<Command, String> {
    let r = cfg.runners.get(runner).ok_or_else(|| format!("unknown runner {runner:?}"))?;
    let mut cmd;
    if r.wrap.is_empty() {
        let (argv, cwd) = cfg.local_command(module);
        let (prog, args) = argv.split_first().ok_or("empty command")?;
        cmd = Command::new(prog);
        cmd.args(args).current_dir(cwd);
    } else {
        let (prog, args) = r.wrap.split_first().ok_or("empty wrap")?;
        cmd = Command::new(prog);
        cmd.args(args).args(&module.command);
    }
    cmd.envs(&module.env)
        .env("HARARE_MODULE", module_name)
        .env("HARARE_RUNNER", runner)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    hide_window(&mut cmd);
    Ok(cmd)
}

#[cfg(windows)]
fn hide_window(cmd: &mut Command) {
    // CREATE_NO_WINDOW: no console window flashes up for each task.
    cmd.creation_flags(0x0800_0000);
}

#[cfg(not(windows))]
fn hide_window(_cmd: &mut Command) {}
