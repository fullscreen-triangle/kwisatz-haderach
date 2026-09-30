// Reading Claude Code's `--output-format stream-json` events, and the
// subtask block a session may end with.

export interface SessionInfo {
  session_id?: string;
  model?: string;
}

export interface ResultInfo {
  subtype?: string;
  is_error?: boolean;
  result?: string;
  session_id?: string;
  num_turns?: number;
  duration_ms?: number;
  total_cost_usd?: number;
}

export interface Interpreted {
  session?: SessionInfo;
  notes: string[];
  result?: ResultInfo;
}

const clip = (s: string, n = 160) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n) + "…" : one;
};

function describeTool(name: string, input: any): string {
  if (!input || typeof input !== "object") return name;
  const target = input.command ?? input.file_path ?? input.path ?? input.pattern ?? input.url ?? input.query ?? input.description;
  return typeof target === "string" ? `${name}: ${clip(target, 120)}` : name;
}

/** One stream-json line → what to show and keep. Unknown lines yield nothing. */
export function interpret(line: string): Interpreted {
  const out: Interpreted = { notes: [] };
  let ev: any;
  try {
    ev = JSON.parse(line);
  } catch {
    return out;
  }
  if (!ev || typeof ev !== "object") return out;
  if (ev.type === "system" && ev.subtype === "init") {
    out.session = { session_id: ev.session_id, model: ev.model };
    out.notes.push(`session started${ev.model ? ` (${ev.model})` : ""}`);
  } else if (ev.type === "assistant" && Array.isArray(ev.message?.content)) {
    for (const part of ev.message.content) {
      if (part?.type === "text" && typeof part.text === "string" && part.text.trim()) out.notes.push(clip(part.text));
      else if (part?.type === "tool_use") out.notes.push(describeTool(String(part.name ?? "tool"), part.input));
    }
  } else if (ev.type === "result") {
    out.result = {
      subtype: ev.subtype,
      is_error: ev.is_error,
      result: typeof ev.result === "string" ? ev.result : undefined,
      session_id: ev.session_id,
      num_turns: ev.num_turns,
      duration_ms: ev.duration_ms,
      total_cost_usd: ev.total_cost_usd,
    };
  }
  return out;
}

export interface ProposedRaise {
  tau: string;
  module: string;
  body?: unknown;
  priority?: number;
}

/**
 * Subtasks a session proposes, from fenced blocks tagged `harare` in its final
 * message:
 *
 *     ```harare
 *     {"raise": [{"tau": "paper/figures", "module": "claude", "body": {"prompt": "..."}}]}
 *     ```
 *
 * Blocks that are not valid JSON or lack tau/module are skipped; the raw
 * result text stays on the graph either way.
 */
export function proposedRaises(text: string): ProposedRaise[] {
  const out: ProposedRaise[] = [];
  const fence = /```harare[^\n]*\n([\s\S]*?)```/g;
  for (const m of text.matchAll(fence)) {
    let parsed: any;
    try {
      parsed = JSON.parse(m[1]!);
    } catch {
      continue;
    }
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.raise) ? parsed.raise : [];
    for (const r of list) {
      if (r && typeof r.tau === "string" && typeof r.module === "string") {
        out.push({ tau: r.tau, module: r.module, body: r.body, ...(typeof r.priority === "number" ? { priority: r.priority } : {}) });
      }
    }
  }
  return out;
}
