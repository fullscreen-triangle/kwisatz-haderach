//! HTTP: a JSON API over runs, a live act stream (SSE), and the metro viewer.
//!
//! The server starts processes, so it binds loopback unless told otherwise.
//! Requests can only name modules declared in harare.toml and pass them data.

use crate::act::{now_ms, read_log};
use crate::config::Config;
use crate::engine::{self, RunHandle};
use crate::graph::{ChunkDraft, TaskId};
use crate::report;
use crate::state::RunState;
use axum::extract::{Path as AxPath, Query, State};
use axum::http::StatusCode;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use futures::StreamExt;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::convert::Infallible;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_stream::wrappers::BroadcastStream;

pub struct App {
    pub cfg: Arc<Config>,
    pub state_dir: PathBuf,
    runs: Mutex<BTreeMap<String, Option<RunHandle>>>,
}

type ApiError = (StatusCode, Json<Value>);

fn err(code: StatusCode, msg: impl Into<String>) -> ApiError {
    (code, Json(json!({ "error": msg.into() })))
}

fn runs_dir(state_dir: &Path) -> PathBuf {
    state_dir.join("runs")
}

fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 80 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// `YYYYMMDD-HHMMSS` in UTC, from Unix milliseconds.
pub fn utc_stamp(ms: u64) -> String {
    let secs = ms / 1000;
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    // Civil date from days since 1970-01-01 (H. Hinnant's algorithm).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + if m <= 2 { 1 } else { 0 };
    format!("{y:04}{m:02}{d:02}-{:02}{:02}{:02}", rem / 3600, (rem % 3600) / 60, rem % 60)
}

/// A fresh run id, unique within `state_dir`.
pub fn new_run_id(state_dir: &Path) -> String {
    let base = format!("run-{}", utc_stamp(now_ms()));
    let mut id = base.clone();
    let mut n = 1;
    while runs_dir(state_dir).join(&id).exists() {
        n += 1;
        id = format!("{base}-{n}");
    }
    id
}

impl App {
    pub fn new(cfg: Arc<Config>, state_dir: PathBuf) -> Arc<App> {
        let mut runs = BTreeMap::new();
        if let Ok(rd) = std::fs::read_dir(runs_dir(&state_dir)) {
            for e in rd.flatten() {
                let name = e.file_name().to_string_lossy().into_owned();
                if valid_id(&name) && engine::log_path(&e.path()).exists() {
                    runs.insert(name, None);
                }
            }
        }
        Arc::new(App { cfg, state_dir, runs: Mutex::new(runs) })
    }

    fn dir(&self, id: &str) -> PathBuf {
        runs_dir(&self.state_dir).join(id)
    }

    pub async fn create(&self, label: Option<String>, chunks: Vec<ChunkDraft>) -> Result<RunHandle, String> {
        let mut runs = self.runs.lock().await;
        let id = new_run_id(&self.state_dir);
        let handle = engine::start(self.cfg.clone(), self.dir(&id), id.clone(), label, chunks)?;
        runs.insert(id, Some(handle.clone()));
        Ok(handle)
    }

    /// The live handle for a run, resuming a stored run if needed.
    async fn live(&self, id: &str) -> Result<RunHandle, ApiError> {
        let mut runs = self.runs.lock().await;
        match runs.get(id) {
            None => Err(err(StatusCode::NOT_FOUND, format!("no run {id}"))),
            Some(Some(h)) => Ok(h.clone()),
            Some(None) => {
                let h = engine::resume(self.cfg.clone(), self.dir(id)).map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e))?;
                runs.insert(id.to_string(), Some(h.clone()));
                Ok(h)
            }
        }
    }

    async fn slot(&self, id: &str) -> Result<Option<RunHandle>, ApiError> {
        if !valid_id(id) {
            return Err(err(StatusCode::BAD_REQUEST, "bad run id"));
        }
        self.runs.lock().await.get(id).cloned().ok_or_else(|| err(StatusCode::NOT_FOUND, format!("no run {id}")))
    }

    fn stored(&self, id: &str) -> Result<RunState, ApiError> {
        let entries = read_log(&engine::log_path(&self.dir(id))).map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        RunState::from_entries(&entries).map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e))
    }
}

pub fn router(app: Arc<App>, metro: Option<PathBuf>) -> Router {
    let api = Router::new()
        .route("/api/health", get(health))
        .route("/api/config", get(config_view))
        .route("/api/runs", get(list_runs).post(create_run))
        .route("/api/runs/{id}", get(get_run))
        .route("/api/runs/{id}/report", get(get_report))
        .route("/api/runs/{id}/events", get(events))
        .route("/api/runs/{id}/raise", post(raise))
        .route("/api/runs/{id}/resume", post(resume))
        .route("/api/runs/{id}/tasks/{task}/cancel", post(cancel))
        .with_state(app);
    match metro {
        Some(dir) => api.fallback_service(tower_http::services::ServeDir::new(dir).append_index_html_on_directories(true)),
        None => api,
    }
}

async fn health() -> Json<Value> {
    Json(json!({ "ok": true, "harare": env!("CARGO_PKG_VERSION"), "protocol": crate::protocol::PROTOCOL_VERSION }))
}

async fn config_view(State(app): State<Arc<App>>) -> Json<Value> {
    let c = &app.cfg;
    Json(json!({
        "modules": c.modules.iter().map(|(n, m)| json!({ "name": n, "mode": m.mode, "color": m.color, "description": m.description, "reads": !m.wants.is_empty(), "runners": m.runners, "priority": m.priority })).collect::<Vec<_>>(),
        "runners": c.runners.iter().map(|(n, r)| json!({ "name": n, "label": r.label, "slots": r.slots, "remote": !r.wrap.is_empty() })).collect::<Vec<_>>(),
        "resources": c.resources.iter().map(|(n, r)| json!({ "name": n, "kind": r.kind_name(), "capacity": r.capacity, "unit": r.unit, "label": r.label })).collect::<Vec<_>>(),
    }))
}

async fn list_runs(State(app): State<Arc<App>>) -> Json<Value> {
    let slots: Vec<(String, Option<RunHandle>)> = app.runs.lock().await.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
    let mut out = Vec::new();
    for (id, slot) in slots.into_iter().rev() {
        let summary = match slot {
            Some(h) => h.snapshot().await.ok().map(|s| summarize(&s, true)),
            None => app.stored(&id).ok().map(|st| summarize(&engine::base_snapshot(&st, &app.cfg), false)),
        };
        out.push(summary.unwrap_or_else(|| json!({ "run": id, "unreadable": true })));
    }
    Json(json!({ "runs": out }))
}

fn summarize(s: &Value, live: bool) -> Value {
    let running = s["tasks"].as_array().map(|t| t.iter().filter(|x| x["state"] == "running").count()).unwrap_or(0);
    json!({
        "run": s["run"],
        "label": s["label"],
        "m": s["m"],
        "quiescent": s["quiescent"],
        "live": live,
        "nodes": s["nodes"].as_array().map(|a| a.len()).unwrap_or(0),
        "values": s["values"].as_array().map(|a| a.len()).unwrap_or(0),
        "running": running,
        "last_t": s["last_t"],
    })
}

#[derive(Deserialize)]
struct NewRun {
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    chunks: Vec<ChunkDraft>,
}

async fn create_run(State(app): State<Arc<App>>, Json(body): Json<NewRun>) -> Result<Json<Value>, ApiError> {
    let h = app.create(body.label, body.chunks).await.map_err(|e| err(StatusCode::BAD_REQUEST, e))?;
    Ok(Json(json!({ "run": h.id })))
}

async fn get_run(State(app): State<Arc<App>>, AxPath(id): AxPath<String>) -> Result<Json<Value>, ApiError> {
    match app.slot(&id).await? {
        Some(h) => h.snapshot().await.map(Json).map_err(|e| err(StatusCode::GONE, e)),
        None => Ok(Json(engine::base_snapshot(&app.stored(&id)?, &app.cfg))),
    }
}

#[derive(Deserialize)]
struct ReportQuery {
    #[serde(default)]
    format: Option<String>,
}

async fn get_report(State(app): State<Arc<App>>, AxPath(id): AxPath<String>, Query(q): Query<ReportQuery>) -> Result<Response, ApiError> {
    let rep = match app.slot(&id).await? {
        Some(h) => h.report().await.map_err(|e| err(StatusCode::GONE, e))?,
        None => report::build(&app.stored(&id)?),
    };
    if q.format.as_deref() == Some("text") {
        Ok(([(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")], report::render_text(&rep)).into_response())
    } else {
        Ok(Json(rep).into_response())
    }
}

async fn events(State(app): State<Arc<App>>, AxPath(id): AxPath<String>) -> Result<Response, ApiError> {
    let Some(h) = app.slot(&id).await? else {
        return Err(err(StatusCode::CONFLICT, "this run is stored, not live; POST /resume or raise into it to continue it"));
    };
    let stream = BroadcastStream::new(h.subscribe()).filter_map(|r| async move { r.ok().map(|line| Ok::<Event, Infallible>(Event::default().event("act").data(line.to_string()))) });
    Ok(Sse::new(stream).keep_alive(KeepAlive::default()).into_response())
}

#[derive(Deserialize)]
#[serde(untagged)]
enum RaiseBody {
    Many { chunks: Vec<ChunkDraft> },
    One(ChunkDraft),
}

async fn raise(State(app): State<Arc<App>>, AxPath(id): AxPath<String>, Json(body): Json<RaiseBody>) -> Result<Json<Value>, ApiError> {
    app.slot(&id).await?;
    let h = app.live(&id).await?;
    let chunks = match body {
        RaiseBody::Many { chunks } => chunks,
        RaiseBody::One(c) => vec![c],
    };
    let ids = h.raise(chunks).await.map_err(|e| err(StatusCode::BAD_REQUEST, e))?;
    Ok(Json(json!({ "run": id, "chunks": ids })))
}

async fn resume(State(app): State<Arc<App>>, AxPath(id): AxPath<String>) -> Result<Json<Value>, ApiError> {
    app.slot(&id).await?;
    let h = app.live(&id).await?;
    Ok(Json(json!({ "run": h.id, "live": true })))
}

async fn cancel(State(app): State<Arc<App>>, AxPath((id, task)): AxPath<(String, TaskId)>) -> Result<Json<Value>, ApiError> {
    let Some(h) = app.slot(&id).await? else {
        return Err(err(StatusCode::CONFLICT, "this run is not live"));
    };
    h.cancel(task).await.map_err(|e| err(StatusCode::BAD_REQUEST, e))?;
    Ok(Json(json!({ "run": id, "task": task, "cancelling": true })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stamps_are_utc_calendar_times() {
        assert_eq!(utc_stamp(0), "19700101-000000");
        // 2026-09-30T12:34:56Z
        assert_eq!(utc_stamp(1_790_771_696_000), "20260930-123456");
        // leap day 2024-02-29T23:59:59Z
        assert_eq!(utc_stamp(1_709_251_199_000), "20240229-235959");
    }

    #[test]
    fn run_ids_cannot_escape_the_state_dir() {
        assert!(valid_id("run-20260930-123456"));
        assert!(!valid_id("../etc"));
        assert!(!valid_id("a/b"));
        assert!(!valid_id(""));
    }
}
