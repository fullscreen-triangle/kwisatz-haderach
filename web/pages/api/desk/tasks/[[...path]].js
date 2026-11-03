// Tasks: forwards /api/desk/tasks/<path> to the node's /tasks/<path> (backend/routes/tasks.py).
// <id>/stream is Server-Sent Events.
import { proxyJSON, proxySSE } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  const ok = seg.length <= 1 || (seg.length === 2 && ['stream', 'continue'].includes(seg[1]));
  if (!ok) return res.status(404).json({ error: 'unknown tasks route' });
  const path = seg.map(encodeURIComponent).join('/');
  if (seg[1] === 'stream') return proxySSE(req, res, `/tasks/${path}`);
  return proxyJSON(req, res, `/tasks${path ? `/${path}` : ''}`);
}
