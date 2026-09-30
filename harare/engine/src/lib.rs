//! Harare — a runtime-graph engine.
//!
//! A run is a graph whose nodes are subtask addresses (τ). Each node carries a
//! bag of chunks (calls to modules) and a growing collection of values. The
//! engine does four things and nothing else:
//!
//! 1. **identify** — the node for an address, created on first use; a second
//!    raise at the same address converges on the same node;
//! 2. **dispatch** — every chunk on every node runs, exactly once;
//! 3. **read** — a module that declared `wants` is handed each matching value
//!    once, and whatever it then emits records what it read;
//! 4. **emit** — values are appended, never replaced.
//!
//! There is no verb for "expected". A module that crashes produces an `error`
//! value on its node and the run carries on; a run ends at quiescence (nothing
//! left to dispatch and no module wanting a value it has not read), and its
//! output is a report of what was emitted. Edges are not declared: an edge
//! u → v exists only because a value emitted at v names a value at u that its
//! emitter read.
//!
//! Capacity is shared, not first-come: pending work is admitted by priority
//! (aged, so nothing starves) against slot resources and runner slots, and
//! divisible "rate" resources (bandwidth, tokens per minute) are split among
//! running tasks by weighted max-min water-filling.
//!
//! Modules link to the engine through one line-delimited JSON protocol over
//! stdio ([`protocol`]); [`module_sdk`] implements it for Rust modules, and the
//! TypeScript SDK in `harare/sdk-ts` for everything on Node.

pub mod act;
pub mod address;
pub mod fingerprint;
pub mod graph;
pub mod module_sdk;
pub mod protocol;
pub mod report;
pub mod sched;
pub mod state;

#[cfg(feature = "engine")]
pub mod config;
#[cfg(feature = "engine")]
pub mod engine;
#[cfg(feature = "engine")]
pub mod runner;
#[cfg(feature = "engine")]
pub mod server;

pub use address::Address;
pub use graph::{Chunk, ChunkId, Graph, Origin, Seq, TaskId, Value};
