// A file from the laptop, streamed to the phone: /api/desk/laptop/file?path=<full path>
// -> the node's /console/laptop/file -> the laptop node over the tailnet. Inline, so the
// phone opens PDFs and images in its own viewer; never cached.
import { backendUrl } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  const backend = backendUrl();
  const path = String(req.query.path || '');
  if (!backend) return res.status(503).json({ error: 'Backend not configured' });
  if (!path) return res.status(400).json({ error: 'path?' });
  let resp;
  try {
    resp = await fetch(`${backend}/console/laptop/file?path=${encodeURIComponent(path)}`,
                       { signal: AbortSignal.timeout(180_000) });
  } catch (err) {
    return res.status(504).json({ error: `Could not reach the node: ${err?.message}` });
  }
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    return res.status(resp.status).json({ error: data.detail || 'the laptop could not send that file' });
  }
  res.writeHead(200, {
    'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': resp.headers.get('content-disposition') || 'inline',
    'Cache-Control': 'private, no-store',
  });
  const reader = resp.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
