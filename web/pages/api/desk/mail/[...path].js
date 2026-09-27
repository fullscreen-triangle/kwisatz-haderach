// The unified inbox's API: forwards /api/desk/mail/<path> to the node's /mail/<path>
// (backend/routes/mail.py). `stream` is Server-Sent Events; everything else is JSON.
// `ask` is answered here in Next (four-sided-triangle), see ./ask.js.
import { proxyJSON, proxySSE } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

const SIMPLE = new Set(['messages', 'status', 'stream', 'sync', 'search', 'memory']);

function allowed(seg) {
  if (seg.length === 1) return SIMPLE.has(seg[0]);
  if (seg[0] !== 'messages') return false;
  return seg.length === 2 || (seg.length === 3 && seg[2] === 'done');
}

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  if (!allowed(seg)) return res.status(404).json({ error: 'unknown mail route' });
  const path = seg.map(encodeURIComponent).join('/');
  if (path === 'stream') return proxySSE(req, res, '/mail/stream');
  const slow = path === 'search' || path === 'memory';
  return proxyJSON(req, res, `/mail/${path}`, { timeoutMs: slow ? 90_000 : 30_000 });
}
