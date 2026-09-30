// The wire protocol between the engine and a module, mirrored from
// engine/src/protocol.rs. One JSON object per line in each direction.

export const PROTOCOL_VERSION = 1;

/** A node address such as "greifswald/dentist/candidates". */
export type Address = string;

export interface Origin {
  module: string;
  task?: number;
}

export interface Value {
  seq: number;
  tau: Address;
  kind: string;
  data: unknown;
  by: Origin;
  /** Values the emitter read before emitting this one. */
  read?: number[];
}

export type Grant = Record<string, number>;

export interface TaskMessage {
  type: "task";
  harare: number;
  run: string;
  task: number;
  module: string;
  tau: Address;
  /** The chunk body; null for a task started to read values. */
  body: unknown;
  /** The module's `config` table from harare.toml. */
  config: unknown;
  /** The values this task was started to read (read tasks). */
  reading: Value[];
  /** Every value on the task's node at dispatch time. */
  node: Value[];
  grant: Grant;
}

export type ToModule =
  | TaskMessage
  | { type: "grant"; grant: Grant }
  | { type: "values"; tau: Address; values: Value[] }
  | { type: "cancel" };

export interface RaiseOptions {
  priority?: number;
  /** Resource name → amount; overrides the module's default demand. */
  demand?: Record<string, number>;
  /** Runners, most preferred first. */
  runners?: string[];
}

export type FromModule =
  | { type: "emit"; kind: string; data?: unknown; tau?: Address; read?: number[] }
  | ({ type: "raise"; tau: Address; module: string; body?: unknown } & RaiseOptions)
  | { type: "progress"; note: string; fraction?: number }
  | { type: "read"; tau: Address };

/** A chunk as a caller asks for it (HTTP API, plan files). */
export interface ChunkDraft extends RaiseOptions {
  tau: Address;
  module: string;
  body?: unknown;
}
