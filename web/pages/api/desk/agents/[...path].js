// Agent runs: forwards /api/desk/agents/<path> to the node's /agents/<path>
// (backend/routes/console.py). runs/<id>/stream is Server-Sent Events.
import { proxyJSON, proxySSE } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  const ok = (seg.length === 1 && seg[0] === 'runs')
    || (seg.length === 2 && seg[0] === 'runs')
    || (seg.length === 3 && seg[0] === 'runs' && seg[2] === 'stream');
  if (!ok) return res.status(404).json({ error: 'unknown agents route' });
  const path = seg.map(encodeURIComponent).join('/');
  if (seg[2] === 'stream') return proxySSE(req, res, `/agents/${path}`);
  return proxyJSON(req, res, `/agents/${path}`);
}
