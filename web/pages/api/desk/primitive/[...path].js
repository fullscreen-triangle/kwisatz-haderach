// Models inside the desk: forwards /api/desk/primitive/<path> to the node's /primitive/<path>
// (backend/routes/primitive.py). tasks/<id>/stream is Server-Sent Events.
import { proxyJSON, proxySSE } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  const ok = (seg.length === 1 && (seg[0] === 'models' || seg[0] === 'tasks'))
    || (seg.length === 2 && seg[0] === 'tasks')
    || (seg.length === 3 && seg[0] === 'tasks' && seg[2] === 'stream');
  if (!ok) return res.status(404).json({ error: 'unknown primitive route' });
  const path = seg.map(encodeURIComponent).join('/');
  if (seg[2] === 'stream') return proxySSE(req, res, `/primitive/${path}`);
  return proxyJSON(req, res, `/primitive/${path}`, { timeoutMs: 60_000 });
}
