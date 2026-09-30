//! harare.toml — the modules the engine may run, the machines it may run them
//! on, and the resources they share.
//!
//! Only modules declared here can ever be started. A chunk names a module and
//! carries a body of data; it can never carry a command line. That is what
//! makes it safe to let other programs raise chunks.

use crate::address::Address;
use crate::graph::{ChunkDraft, Value};
use serde::Deserialize;
use serde_json::Value as Json;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    #[serde(default)]
    pub engine: EngineCfg,
    #[serde(default)]
    pub resources: BTreeMap<String, ResourceCfg>,
    #[serde(default)]
    pub runners: BTreeMap<String, RunnerCfg>,
    #[serde(default)]
    pub modules: BTreeMap<String, ModuleCfg>,
    /// Directory holding harare.toml; relative paths resolve against it.
    #[serde(skip)]
    pub dir: PathBuf,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct EngineCfg {
    /// Seconds of waiting that double a task's priority.
    pub aging_seconds: f64,
    /// After this long blocked, a task stops smaller ones from overtaking it.
    pub reserve_after_seconds: f64,
    /// Tasks a single run may start. Reads beyond it are recorded as deferred.
    pub max_tasks: u64,
    /// How long a runner probe result is trusted.
    pub probe_ttl_seconds: f64,
    /// Time between `cancel` and killing the process.
    pub cancel_grace_seconds: f64,
    /// At most one progress act per task per this many milliseconds.
    pub progress_interval_ms: u64,
}

impl Default for EngineCfg {
    fn default() -> Self {
        EngineCfg {
            aging_seconds: 60.0,
            reserve_after_seconds: 300.0,
            max_tasks: 512,
            probe_ttl_seconds: 60.0,
            cancel_grace_seconds: 5.0,
            progress_interval_ms: 1000,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceKind {
    /// Whole units held while a task runs.
    Slots,
    /// Divisible capacity shared by water-filling among running tasks.
    Rate,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResourceCfg {
    pub kind: ResourceKind,
    pub capacity: f64,
    #[serde(default)]
    pub unit: Option<String>,
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RunnerCfg {
    /// Tasks this runner may hold at once.
    #[serde(default = "default_runner_slots")]
    pub slots: f64,
    /// Prefix that carries a module's command to the machine, e.g.
    /// `["ssh", "vingi", "--"]`. Empty means: run here.
    #[serde(default)]
    pub wrap: Vec<String>,
    /// Command whose success means the runner is reachable. Empty means it
    /// always is.
    #[serde(default)]
    pub probe: Vec<String>,
    #[serde(default)]
    pub label: Option<String>,
}

fn default_runner_slots() -> f64 {
    4.0
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModuleCfg {
    /// argv of the module process. Items starting with `./` or `../` resolve
    /// against the config directory when run locally.
    pub command: Vec<String>,
    /// Form of transport on the map (a short tag such as U, S, T, RE).
    #[serde(default = "default_mode")]
    pub mode: String,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default = "default_priority")]
    pub priority: f64,
    /// Resources each task holds (slots) or would use if unconstrained (rates).
    #[serde(default)]
    pub demand: BTreeMap<String, f64>,
    /// Runners it may use, most preferred first.
    #[serde(default = "default_runners")]
    pub runners: Vec<String>,
    /// Values this module reads. Empty: it only runs its own chunks.
    #[serde(default)]
    pub wants: Vec<Want>,
    /// Passed verbatim to the module in every task message.
    #[serde(default)]
    pub config: Json,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
    /// Working directory for local runs (default: the config directory).
    #[serde(default)]
    pub cwd: Option<String>,
}

fn default_mode() -> String {
    "U".into()
}
fn default_priority() -> f64 {
    1.0
}
fn default_runners() -> Vec<String> {
    vec!["local".into()]
}

/// A condition on values. A module is handed each value that matches any of
/// its wants, once.
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Want {
    /// Value kinds; empty matches any kind.
    #[serde(default)]
    pub kinds: Vec<String>,
    /// Emitting modules; empty matches any module.
    #[serde(default)]
    pub from: Vec<String>,
    /// Only values on nodes under this address.
    #[serde(default)]
    pub prefix: Option<Address>,
    /// Also values the module emitted itself (off by default, so a module
    /// does not feed on its own output).
    #[serde(default)]
    pub own: bool,
}

impl Want {
    pub fn matches(&self, reader: &str, v: &Value) -> bool {
        (self.own || v.by.module != reader)
            && (self.kinds.is_empty() || self.kinds.iter().any(|k| k == &v.kind))
            && (self.from.is_empty() || self.from.iter().any(|f| f == &v.by.module))
            && self.prefix.as_ref().is_none_or(|p| p.is_prefix_of(&v.tau))
    }
}

/// A chunk's scheduling, after module defaults are applied.
#[derive(Clone, Debug, PartialEq)]
pub struct Sched {
    pub priority: f64,
    pub slots: BTreeMap<String, f64>,
    pub rates: BTreeMap<String, f64>,
    pub runners: Vec<String>,
}

const RESERVED: [&str; 2] = ["harare", "api"];

/// On Windows `canonicalize` returns verbatim paths (`\\?\C:\...`), which
/// Node and many other programs cannot open. Drop the prefix for drive paths;
/// keep it for the rare path that needs it (`\\?\UNC\...`).
pub fn plain_path(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with("UNC\\") => PathBuf::from(rest),
        _ => p,
    }
}

impl Config {
    pub fn load(path: &Path) -> Result<Config, String> {
        let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
        let mut cfg: Config = toml::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
        let abs = plain_path(std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf()));
        cfg.dir = abs.parent().map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."));
        cfg.validate()?;
        Ok(cfg)
    }

    pub fn from_str_in(text: &str, dir: &Path) -> Result<Config, String> {
        let mut cfg: Config = toml::from_str(text).map_err(|e| e.to_string())?;
        cfg.dir = dir.to_path_buf();
        cfg.validate()?;
        Ok(cfg)
    }

    fn validate(&mut self) -> Result<(), String> {
        self.runners.entry("local".into()).or_insert(RunnerCfg { slots: default_runner_slots(), wrap: vec![], probe: vec![], label: Some("this machine".into()) });
        for (name, r) in &self.resources {
            if !(r.capacity.is_finite() && r.capacity >= 0.0) {
                return Err(format!("resource {name}: capacity must be a non-negative number"));
            }
        }
        for (name, r) in &self.runners {
            if !(r.slots.is_finite() && r.slots >= 1.0) {
                return Err(format!("runner {name}: slots must be at least 1"));
            }
        }
        for (name, m) in &self.modules {
            if RESERVED.contains(&name.as_str()) {
                return Err(format!("module name {name:?} is reserved"));
            }
            if m.command.is_empty() {
                return Err(format!("module {name}: command is empty"));
            }
            self.check_sched(&format!("module {name}"), m.priority, &m.demand, &m.runners)?;
        }
        Ok(())
    }

    fn check_sched(&self, what: &str, priority: f64, demand: &BTreeMap<String, f64>, runners: &[String]) -> Result<(), String> {
        if !(priority.is_finite() && priority > 0.0) {
            return Err(format!("{what}: priority must be a positive number"));
        }
        if runners.is_empty() {
            return Err(format!("{what}: needs at least one runner"));
        }
        for r in runners {
            if !self.runners.contains_key(r) {
                return Err(format!("{what}: unknown runner {r:?}"));
            }
        }
        for (res, amount) in demand {
            let Some(rc) = self.resources.get(res) else {
                return Err(format!("{what}: demands undeclared resource {res:?}"));
            };
            if !(amount.is_finite() && *amount >= 0.0) {
                return Err(format!("{what}: demand for {res} must be a non-negative number"));
            }
            if rc.kind == ResourceKind::Slots && *amount > rc.capacity {
                return Err(format!("{what}: demands {amount} {res} but only {} exist, so it could never start", rc.capacity));
            }
        }
        Ok(())
    }

    /// Scheduling for a chunk: the chunk's own fields over its module's.
    pub fn sched_for(&self, draft: &ChunkDraft) -> Result<Sched, String> {
        let m = self.modules.get(&draft.module).ok_or_else(|| format!("no module named {:?} in harare.toml", draft.module))?;
        let priority = draft.priority.unwrap_or(m.priority);
        let mut demand = m.demand.clone();
        for (k, v) in &draft.demand {
            demand.insert(k.clone(), *v);
        }
        let runners = if draft.runners.is_empty() { m.runners.clone() } else { draft.runners.clone() };
        self.check_sched(&format!("chunk for {} on {}", draft.module, draft.tau), priority, &demand, &runners)?;
        Ok(self.split(priority, demand, runners))
    }

    /// Scheduling for a module reading values: its own defaults.
    pub fn sched_for_module(&self, module: &str) -> Option<Sched> {
        let m = self.modules.get(module)?;
        Some(self.split(m.priority, m.demand.clone(), m.runners.clone()))
    }

    fn split(&self, priority: f64, demand: BTreeMap<String, f64>, runners: Vec<String>) -> Sched {
        let mut slots = BTreeMap::new();
        let mut rates = BTreeMap::new();
        for (k, v) in demand {
            match self.resources.get(&k).map(|r| r.kind) {
                Some(ResourceKind::Rate) => {
                    rates.insert(k, v);
                }
                _ => {
                    slots.insert(k, v);
                }
            }
        }
        Sched { priority, slots, rates, runners }
    }

    /// argv and working directory for running `module` on this machine.
    pub fn local_command(&self, module: &ModuleCfg) -> (Vec<String>, PathBuf) {
        let argv = module
            .command
            .iter()
            .map(|a| if a.starts_with("./") || a.starts_with("../") { self.dir.join(a).to_string_lossy().into_owned() } else { a.clone() })
            .collect();
        let cwd = module.cwd.as_ref().map(|c| self.dir.join(c)).unwrap_or_else(|| self.dir.clone());
        (argv, cwd)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::Origin;
    use serde_json::json;

    const CFG: &str = r#"
        [resources.claude]
        kind = "slots"
        capacity = 2
        [resources.net]
        kind = "rate"
        capacity = 100
        [runners.vingi]
        wrap = ["ssh", "vingi", "--"]
        slots = 2
        [modules.search]
        command = ["./search.mjs"]
        demand = { net = 10 }
        [[modules.search.wants]]
        kinds = ["query"]
        prefix = "greifswald"
        [modules.agent]
        command = ["node", "agent.js"]
        mode = "RE"
        priority = 3
        demand = { claude = 1 }
        runners = ["vingi", "local"]
    "#;

    fn cfg() -> Config {
        Config::from_str_in(CFG, Path::new("/cfg")).unwrap()
    }

    #[test]
    fn local_runner_is_implicit() {
        assert!(cfg().runners.contains_key("local"));
    }

    #[test]
    fn chunk_fields_override_module_defaults() {
        let c = cfg();
        let draft = ChunkDraft {
            tau: Address::parse("x").unwrap(),
            module: "agent".into(),
            body: json!({}),
            priority: Some(9.0),
            demand: BTreeMap::new(),
            runners: vec![],
        };
        let s = c.sched_for(&draft).unwrap();
        assert_eq!(s.priority, 9.0);
        assert_eq!(s.slots["claude"], 1.0);
        assert_eq!(s.runners, vec!["vingi", "local"]);
        let net = c.sched_for_module("search").unwrap();
        assert_eq!(net.rates["net"], 10.0);
        assert!(net.slots.is_empty());
    }

    #[test]
    fn impossible_demands_are_refused() {
        let c = cfg();
        let mut d = BTreeMap::new();
        d.insert("claude".to_string(), 3.0);
        let draft = ChunkDraft { tau: Address::parse("x").unwrap(), module: "agent".into(), body: Json::Null, priority: None, demand: d, runners: vec![] };
        assert!(c.sched_for(&draft).unwrap_err().contains("could never start"));
        let unknown = ChunkDraft { tau: Address::parse("x").unwrap(), module: "nope".into(), body: Json::Null, priority: None, demand: BTreeMap::new(), runners: vec![] };
        assert!(c.sched_for(&unknown).is_err());
    }

    #[test]
    fn bad_configs_fail_to_load() {
        assert!(Config::from_str_in("[modules.harare]\ncommand=[\"x\"]", Path::new(".")).is_err());
        assert!(Config::from_str_in("[modules.a]\ncommand=[\"x\"]\nrunners=[\"mars\"]", Path::new(".")).is_err());
        assert!(Config::from_str_in("[modules.a]\ncommand=[\"x\"]\ndemand={gpu=1}", Path::new(".")).is_err());
        assert!(Config::from_str_in("[modules.a]\ncommand=[\"x\"]\ntypo=1", Path::new(".")).is_err());
    }

    #[test]
    fn wants_match_kind_origin_prefix_and_skip_own_output() {
        let c = cfg();
        let w = &c.modules["search"].wants[0];
        let v = |tau: &str, kind: &str, by: &str| Value {
            seq: 1,
            tau: Address::parse(tau).unwrap(),
            kind: kind.into(),
            data: Json::Null,
            by: Origin::task(by, 1),
            read: vec![],
        };
        assert!(w.matches("search", &v("greifswald/dentist", "query", "api")));
        assert!(!w.matches("search", &v("berlin/dentist", "query", "api")));
        assert!(!w.matches("search", &v("greifswald/dentist", "answer", "api")));
        assert!(!w.matches("search", &v("greifswald/dentist", "query", "search")));
    }

    #[test]
    fn verbatim_prefixes_are_dropped_for_drive_paths() {
        assert_eq!(plain_path(PathBuf::from(r"\\?\C:\a\b")), PathBuf::from(r"C:\a\b"));
        assert_eq!(plain_path(PathBuf::from(r"\\?\UNC\srv\share")), PathBuf::from(r"\\?\UNC\srv\share"));
        assert_eq!(plain_path(PathBuf::from("/cfg")), PathBuf::from("/cfg"));
    }

    #[test]
    fn relative_commands_resolve_against_config_dir() {
        let c = cfg();
        let (argv, cwd) = c.local_command(&c.modules["search"]);
        assert!(argv[0].ends_with("search.mjs") && argv[0].len() > "./search.mjs".len());
        assert_eq!(cwd, PathBuf::from("/cfg"));
    }
}
