// The snapshot the engine serves at GET /api/runs/{id} (engine/src/engine.rs).

export interface Origin {
  module: string;
  task?: number;
}

export interface Value {
  seq: number;
  tau: string;
  kind: string;
  data: unknown;
  by: Origin;
  read?: number[];
}

export interface Chunk {
  id: number;
  tau: string;
  module: string;
  body: unknown;
  priority?: number;
  demand?: Record<string, number>;
  runners?: string[];
  by: Origin;
  dispatched: boolean;
  deferred: boolean;
}

export interface Task {
  id: number;
  module: string;
  tau: string;
  chunk?: number;
  reading?: number[];
  runner: string;
  priority: number;
  state: "running" | "ended";
  end?: { how: "exited" | "failed" | "cancelled" | "lost"; code?: number | null; reason?: string };
  grant?: Record<string, number>;
  progress?: { note: string; fraction?: number };
  emitted: number;
  raised: number;
  started_t: number;
  ended_t?: number;
}

export interface ModuleInfo {
  name: string;
  mode: string;
  color?: string | null;
  description?: string | null;
  reads: boolean;
  priority: number;
  runners: string[];
}

export interface RunnerInfo {
  name: string;
  label?: string | null;
  slots: number;
  remote: boolean;
  busy?: number;
  available?: boolean;
  probing?: boolean;
  probed?: boolean;
  detail?: string;
}

export interface ResourceInfo {
  name: string;
  kind: "slots" | "rate";
  label?: string | null;
  unit?: string | null;
  capacity: number;
  in_use?: number;
  demand?: number;
  level?: number | null;
}

export interface PendingInfo {
  key: string;
  module: string;
  tau: string;
  chunk?: number | null;
  reading: number[];
  priority: number;
  effective_priority: number;
  waited: number;
  runners: string[];
  reserved: boolean;
  reason: string;
}

export interface Snapshot {
  run: string;
  label?: string | null;
  m: number;
  quiescent: boolean;
  live: boolean;
  opened_t: number;
  last_t: number;
  fingerprint: string;
  modules: ModuleInfo[];
  nodes: { tau: string; first_m: number; chunks: number[]; values: number[] }[];
  chunks: Chunk[];
  values: Value[];
  edges: { from: string; to: string; by: string; reads: number }[];
  raises: { from: string; to: string; by: string; chunk: number; task: number }[];
  tasks: Task[];
  deferred: { module: string; tau: string; chunk?: number; reading: number[]; reason: string }[];
  runners: RunnerInfo[];
  resources: ResourceInfo[];
  pending: PendingInfo[];
}
