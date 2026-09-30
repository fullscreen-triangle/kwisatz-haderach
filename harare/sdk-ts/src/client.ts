// Driving harare from another program over its HTTP API: start runs, raise
// chunks into them, watch their acts, read their reports.

import type { ChunkDraft } from "./protocol.js";

export interface Act {
  m: number;
  t: number;
  act: string;
  [field: string]: unknown;
}

export class HarareError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class HarareClient {
  constructor(readonly base = process.env["HARARE_URL"] ?? "http://127.0.0.1:7470") {}

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(this.base + path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    const text = await res.text();
    if (!res.ok) {
      let message = text;
      try {
        message = (JSON.parse(text) as { error?: string }).error ?? text;
      } catch {
        // plain-text error
      }
      throw new HarareError(message, res.status);
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  runs() {
    return this.call<{ runs: any[] }>("/api/runs");
  }

  createRun(chunks: ChunkDraft[], label?: string) {
    return this.call<{ run: string }>("/api/runs", { method: "POST", body: JSON.stringify({ label, chunks }) });
  }

  snapshot(run: string) {
    return this.call<any>(`/api/runs/${encodeURIComponent(run)}`);
  }

  report(run: string) {
    return this.call<any>(`/api/runs/${encodeURIComponent(run)}/report`);
  }

  async reportText(run: string): Promise<string> {
    const res = await fetch(`${this.base}/api/runs/${encodeURIComponent(run)}/report?format=text`);
    if (!res.ok) throw new HarareError(await res.text(), res.status);
    return res.text();
  }

  raise(run: string, chunks: ChunkDraft[]) {
    return this.call<{ run: string; chunks: number[] }>(`/api/runs/${encodeURIComponent(run)}/raise`, {
      method: "POST",
      body: JSON.stringify({ chunks }),
    });
  }

  cancel(run: string, task: number) {
    return this.call<unknown>(`/api/runs/${encodeURIComponent(run)}/tasks/${task}/cancel`, { method: "POST" });
  }

  /** Call `onAct` for every act of a live run until the returned stop function is called. */
  watch(run: string, onAct: (act: Act) => void): () => void {
    const ctrl = new AbortController();
    void (async () => {
      const res = await fetch(`${this.base}/api/runs/${encodeURIComponent(run)}/events`, { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new HarareError(await res.text(), res.status);
      const decoder = new TextDecoder();
      let buf = "";
      for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
        buf += decoder.decode(chunk, { stream: true });
        let cut: number;
        while ((cut = buf.indexOf("\n\n")) >= 0) {
          const frame = buf.slice(0, cut);
          buf = buf.slice(cut + 2);
          const data = frame
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trimStart())
            .join("\n");
          if (data) onAct(JSON.parse(data) as Act);
        }
      }
    })().catch(() => {
      // stopped or disconnected
    });
    return () => ctrl.abort();
  }

  /** Resolve once the run is quiescent. */
  async untilQuiet(run: string, pollMs = 1000): Promise<any> {
    for (;;) {
      const s = await this.snapshot(run);
      if (s.quiescent) return s;
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
}
