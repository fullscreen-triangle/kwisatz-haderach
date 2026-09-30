// argv templates: `["spraypaint", "ask", "{body.query}", "--json"]`.
//
// A placeholder names a dotted path into the task: body, reading, node, tau,
// config, run, task. `{body.query|reading.0.data.query}` takes the first
// alternative that resolves, so one module can serve both as a chunk and as a
// reader. An item that is exactly one placeholder becomes one
// argument — or several, if the path holds an array of scalars. Placeholders
// inside a longer item are substituted in place. `{{` and `}}` are literal
// braces. A path that resolves to nothing is an error, never an empty
// argument: a missing query should fail loudly, not search for "".

export interface Scope {
  body: unknown;
  reading: unknown[];
  node: unknown[];
  tau: string;
  config: unknown;
  run: string;
  task: number;
}

/** Resolve `a.b.0.c`; `x|y` tries x, then y, and takes the first that resolves. */
export function lookup(scope: Scope, path: string): unknown {
  for (const alt of path.split("|")) {
    const v = lookupOne(scope, alt);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function lookupOne(scope: Scope, path: string): unknown {
  let cur: unknown = scope;
  for (const part of path.trim().split(".")) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(part)) return undefined;
      cur = cur[Number(part)];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function scalar(v: unknown, path: string): string {
  if (v === undefined || v === null) throw new Error(`argv placeholder {${path}} has no value`);
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

const WHOLE = /^\{([^{}]+)\}$/;
const PART = /\{\{|\}\}|\{([^{}]+)\}/g;

export function expand(argv: string[], scope: Scope): string[] {
  const out: string[] = [];
  for (const item of argv) {
    const whole = WHOLE.exec(item);
    if (whole) {
      const path = whole[1]!;
      const v = lookup(scope, path);
      if (Array.isArray(v) && v.every((x) => ["string", "number", "boolean"].includes(typeof x))) {
        if (v.length === 0) throw new Error(`argv placeholder {${path}} is an empty list`);
        out.push(...v.map(String));
      } else {
        out.push(scalar(v, path));
      }
      continue;
    }
    out.push(
      item.replace(PART, (m, path: string | undefined) => {
        if (m === "{{") return "{";
        if (m === "}}") return "}";
        return scalar(lookup(scope, path!), path!);
      }),
    );
  }
  return out;
}

/** Parse tool output: JSON if it is JSON (or JSON lines), else the text. */
export function parseOutput(text: string, mode: "auto" | "json" | "lines" | "text" = "auto"): unknown {
  const t = text.trim();
  if (mode === "text") return text;
  if (mode === "lines") return t ? t.split(/\r?\n/) : [];
  try {
    return JSON.parse(t);
  } catch {
    const lines = t.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length > 1) {
      try {
        return lines.map((l) => JSON.parse(l));
      } catch {
        // not JSON lines either
      }
    }
    if (mode === "json") throw new Error("output is not JSON");
    return text;
  }
}
