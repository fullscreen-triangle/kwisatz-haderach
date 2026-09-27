// The console's feed, reader and repos: forwards /api/desk/console/<path> to the node's
// /console/<path> (backend/routes/console.py). feed/stream is Server-Sent Events.
import { proxyJSON, proxySSE } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  const head = seg[0];
  if (head === 'feed' && seg[1] === 'stream') return proxySSE(req, res, '/console/feed/stream');
  const ok = (head === 'feed' && seg.length === 1)
    || (head === 'read' && seg.length >= 3)
    || (head === 'repos' && (seg.length === 1 || ['refresh', 'settings'].includes(seg[1])))
    || (head === 'laptop' && seg.length === 2 && ['search', 'status'].includes(seg[1]));
  if (!ok) return res.status(404).json({ error: 'unknown console route' });
  return proxyJSON(req, res, `/console/${seg.map(encodeURIComponent).join('/')}`, { timeoutMs: 90_000 });
}
