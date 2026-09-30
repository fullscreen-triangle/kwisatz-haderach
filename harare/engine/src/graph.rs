//! The graph a run builds: nodes, the chunks attached to them, and the values
//! emitted onto them.
//!
//! The graph offers identify / attach / read / emit. It stores what was
//! emitted and never what should have been, so there is nothing here that
//! could compare a value with an expectation.

use crate::address::Address;
use serde::{Deserialize, Serialize};
use serde_json::Value as Json;
use std::collections::{BTreeMap, BTreeSet};

/// Position of a value in the run's value sequence (1-based, monotone).
pub type Seq = u64;
/// Position of a chunk in the run's chunk sequence (1-based, monotone).
pub type ChunkId = u64;
/// Position of a task (one execution of a module) in the run (1-based).
pub type TaskId = u64;

/// Who raised a chunk or emitted a value: a module (through one of its
/// tasks), the engine itself (`harare`), or a caller of the API (`api`).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Origin {
    pub module: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task: Option<TaskId>,
}

impl Origin {
    pub fn engine() -> Origin {
        Origin { module: "harare".into(), task: None }
    }
    pub fn api() -> Origin {
        Origin { module: "api".into(), task: None }
    }
    pub fn task(module: &str, task: TaskId) -> Origin {
        Origin { module: module.into(), task: Some(task) }
    }
}

/// A chunk as a caller asks for it: which module, on which node, with what
/// body, and how it wants to be scheduled. Unset scheduling fields fall back
/// to the module's defaults.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ChunkDraft {
    pub tau: Address,
    pub module: String,
    #[serde(default)]
    pub body: Json,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<f64>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub demand: BTreeMap<String, f64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub runners: Vec<String>,
}

/// A chunk attached to a node: one call to one module. Every chunk is
/// dispatched exactly once.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Chunk {
    pub id: ChunkId,
    pub tau: Address,
    pub module: String,
    #[serde(default)]
    pub body: Json,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<f64>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub demand: BTreeMap<String, f64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub runners: Vec<String>,
    pub by: Origin,
}

/// A value emitted onto a node. `read` lists the values its emitter read
/// before emitting it; those references are the only source of edges.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Value {
    pub seq: Seq,
    pub tau: Address,
    pub kind: String,
    #[serde(default)]
    pub data: Json,
    pub by: Origin,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub read: Vec<Seq>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Node {
    pub tau: Address,
    pub chunks: Vec<ChunkId>,
    pub values: Vec<Seq>,
    /// The act count at which this node was first identified.
    pub first_m: u64,
}

/// u → v, drawn by the module that read at u and then emitted at v.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Edge {
    pub from: Address,
    pub to: Address,
    pub by: String,
    /// How many (read value, emitted value) pairs produced this edge.
    pub reads: u64,
}

#[derive(Clone, Debug, Default)]
pub struct Graph {
    nodes: BTreeMap<Address, Node>,
    chunks: Vec<Chunk>,
    values: Vec<Value>,
}

impl Graph {
    pub fn new() -> Graph {
        Graph::default()
    }

    /// The node at `tau`. Identifying an address that already has a node
    /// returns that node: raises from independent callers converge.
    pub fn identify(&mut self, tau: &Address, m: u64) -> &mut Node {
        self.nodes.entry(tau.clone()).or_insert_with(|| Node {
            tau: tau.clone(),
            chunks: Vec::new(),
            values: Vec::new(),
            first_m: m,
        })
    }

    pub fn next_chunk_id(&self) -> ChunkId {
        self.chunks.len() as ChunkId + 1
    }

    pub fn next_seq(&self) -> Seq {
        self.values.len() as Seq + 1
    }

    /// Attach a chunk to its node. The chunk's id must be the next id; the
    /// act log records ids so that a replay can check it rebuilt the same run.
    pub fn attach(&mut self, chunk: Chunk, m: u64) -> Result<ChunkId, String> {
        if chunk.id != self.next_chunk_id() {
            return Err(format!("chunk id {} out of order (expected {})", chunk.id, self.next_chunk_id()));
        }
        let id = chunk.id;
        self.identify(&chunk.tau, m).chunks.push(id);
        self.chunks.push(chunk);
        Ok(id)
    }

    /// Append a value. References in `read` that do not name an earlier value
    /// are dropped (a value can only have read what already existed).
    pub fn emit(&mut self, mut value: Value, m: u64) -> Result<Seq, String> {
        if value.seq != self.next_seq() {
            return Err(format!("value seq {} out of order (expected {})", value.seq, self.next_seq()));
        }
        let mut seen = BTreeSet::new();
        value.read.retain(|r| *r >= 1 && *r < value.seq && seen.insert(*r));
        let seq = value.seq;
        self.identify(&value.tau, m).values.push(seq);
        self.values.push(value);
        Ok(seq)
    }

    /// The values currently on a node, oldest first.
    pub fn read(&self, tau: &Address) -> Vec<&Value> {
        match self.nodes.get(tau) {
            Some(n) => n.values.iter().filter_map(|s| self.value(*s)).collect(),
            None => Vec::new(),
        }
    }

    pub fn value(&self, seq: Seq) -> Option<&Value> {
        seq.checked_sub(1).and_then(|i| self.values.get(i as usize))
    }

    pub fn chunk(&self, id: ChunkId) -> Option<&Chunk> {
        id.checked_sub(1).and_then(|i| self.chunks.get(i as usize))
    }

    pub fn node(&self, tau: &Address) -> Option<&Node> {
        self.nodes.get(tau)
    }

    pub fn nodes(&self) -> impl Iterator<Item = &Node> {
        self.nodes.values()
    }

    pub fn chunks(&self) -> &[Chunk] {
        &self.chunks
    }

    pub fn values(&self) -> &[Value] {
        &self.values
    }

    /// Nodes whose address lies under `prefix`.
    pub fn region<'a>(&'a self, prefix: &'a Address) -> impl Iterator<Item = &'a Node> + 'a {
        self.nodes.range(prefix.clone()..).take_while(move |(a, _)| prefix.is_prefix_of(a)).map(|(_, n)| n)
    }

    /// The edges this run has produced so far, derived from read references.
    pub fn edges(&self) -> Vec<Edge> {
        let mut acc: BTreeMap<(Address, Address, String), u64> = BTreeMap::new();
        for v in &self.values {
            for r in &v.read {
                if let Some(src) = self.value(*r) {
                    *acc.entry((src.tau.clone(), v.tau.clone(), v.by.module.clone())).or_default() += 1;
                }
            }
        }
        acc.into_iter().map(|((from, to, by), reads)| Edge { from, to, by, reads }).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn a(s: &str) -> Address {
        Address::parse(s).unwrap()
    }

    fn chunk(g: &Graph, tau: &str, module: &str) -> Chunk {
        Chunk {
            id: g.next_chunk_id(),
            tau: a(tau),
            module: module.into(),
            body: json!({}),
            priority: None,
            demand: BTreeMap::new(),
            runners: vec![],
            by: Origin::api(),
        }
    }

    fn value(g: &Graph, tau: &str, by: &str, read: Vec<Seq>) -> Value {
        Value { seq: g.next_seq(), tau: a(tau), kind: "k".into(), data: json!(1), by: Origin::task(by, 1), read }
    }

    #[test]
    fn same_address_converges() {
        let mut g = Graph::new();
        let c1 = chunk(&g, "x/y", "m1");
        g.attach(c1, 1).unwrap();
        let c2 = chunk(&g, "x/y", "m2");
        g.attach(c2, 2).unwrap();
        assert_eq!(g.nodes().count(), 1);
        assert_eq!(g.node(&a("x/y")).unwrap().chunks, vec![1, 2]);
        assert_eq!(g.node(&a("x/y")).unwrap().first_m, 1);
    }

    #[test]
    fn edges_exist_only_through_reads() {
        let mut g = Graph::new();
        let v1 = value(&g, "u", "seed", vec![]);
        g.emit(v1, 1).unwrap();
        let v2 = value(&g, "v", "reader", vec![]);
        g.emit(v2, 2).unwrap();
        assert!(g.edges().is_empty(), "two values on two nodes are not an edge");
        let v3 = value(&g, "v", "reader", vec![1]);
        g.emit(v3, 3).unwrap();
        assert_eq!(g.edges(), vec![Edge { from: a("u"), to: a("v"), by: "reader".into(), reads: 1 }]);
    }

    #[test]
    fn read_references_must_point_backwards() {
        let mut g = Graph::new();
        let v1 = value(&g, "u", "m", vec![1, 5, 0]);
        g.emit(v1, 1).unwrap();
        assert!(g.value(1).unwrap().read.is_empty());
        let v2 = value(&g, "u", "m", vec![1, 1]);
        g.emit(v2, 2).unwrap();
        assert_eq!(g.value(2).unwrap().read, vec![1]);
    }

    #[test]
    fn out_of_order_ids_are_refused() {
        let mut g = Graph::new();
        let mut c = chunk(&g, "x", "m");
        c.id = 7;
        assert!(g.attach(c, 1).is_err());
    }

    #[test]
    fn region_is_a_prefix_range() {
        let mut g = Graph::new();
        for t in ["a", "a/b", "a/b/c", "ab", "b"] {
            let c = chunk(&g, t, "m");
            g.attach(c, 1).unwrap();
        }
        let got: Vec<String> = g.region(&a("a")).map(|n| n.tau.to_string()).collect();
        assert_eq!(got, vec!["a", "a/b", "a/b/c"]);
    }
}
