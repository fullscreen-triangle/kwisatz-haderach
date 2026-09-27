// The planner's API: forwards /api/desk/plan/<path> to the node's /planner/<path>
// (backend/routes/planner.py). `stream` is Server-Sent Events; everything else is JSON.
import { proxyJSON, proxySSE } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

const ALLOWED = new Set(['now', 'stream', 'pin', 'unpin', 'done', 'settings', 'replan']);

export default async function handler(req, res) {
  const path = [].concat(req.query.path || []).join('/');
  if (!ALLOWED.has(path)) return res.status(404).json({ error: 'unknown planner route' });
  if (path === 'stream') {
    const qs = new URLSearchParams({ start: req.query.start || '', end: req.query.end || '' });
    return proxySSE(req, res, `/planner/stream?${qs}`);
  }
  // "now" is the plain snapshot (GET /planner); the rest map 1:1.
  return proxyJSON(req, res, path === 'now' ? '/planner' : `/planner/${path}`);
}
