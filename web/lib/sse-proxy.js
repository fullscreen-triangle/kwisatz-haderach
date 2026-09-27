// Pipe a node Server-Sent Events stream (backend on 127.0.0.1:8000) to the browser.
//
// `no-transform` matters: Next compresses API responses, and a gzip stream buffers
// events until it fills a block — the page would look frozen. The `compression`
// middleware skips responses marked no-transform. Routes using this must export
// `config = { api: { responseLimit: false } }`.

export function backendUrl() {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
}

export async function proxySSE(req, res, backendPath) {
  const backend = backendUrl();
  if (!backend) return res.status(503).end();

  const upstream = new AbortController();
  req.on('close', () => upstream.abort());

  let resp;
  try {
    resp = await fetch(`${backend}${backendPath}`, { signal: upstream.signal });
  } catch {
    return res.status(502).end();
  }
  if (!resp.ok || !resp.body) return res.status(502).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const reader = resp.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } catch {
    // client went away (abort) or the node restarted — EventSource reconnects on its own
  } finally {
    res.end();
  }
}

// Forward one JSON request to the backend, preserving method, query and body.
export async function proxyJSON(req, res, backendPath, { timeoutMs = 30_000 } = {}) {
  const backend = backendUrl();
  if (!backend) return res.status(503).json({ error: 'Backend not configured (NEXT_PUBLIC_BACKEND_URL)' });
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k === 'path') continue; // the catch-all segment itself
    for (const one of [].concat(v)) qs.append(k, one);
  }
  const url = `${backend}${backendPath}${qs.toString() ? `?${qs}` : ''}`;
  try {
    const resp = await fetch(url, {
      method: req.method,
      headers: req.method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await resp.json().catch(() => ({ error: 'Node returned a non-JSON response' }));
    return res.status(resp.status).json(data);
  } catch (err) {
    const slow = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return res.status(slow ? 504 : 502).json({ error: slow ? 'The node took too long' : `Could not reach the node: ${err?.message}` });
  }
}
