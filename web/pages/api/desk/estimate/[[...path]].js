// Estimates: forwards /api/desk/estimate/<path> to the node's /estimate/<path>
// (backend/routes/estimate.py), which asks the `decisions` tool. Only the routes listed
// here pass; everything is JSON. An estimate is an interval {low, high, low_basis,
// high_basis, basis, coverage}; `estimate: null` with a `sentence` means the tool gave none.
import { proxyJSON } from '../../../../lib/sse-proxy';

const GET = new Set(['health', 'algorithms']);
const POST = new Set(['', 'travel']);

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  const path = seg.join('/');
  const ok = (req.method === 'GET' && GET.has(path)) || (req.method === 'POST' && POST.has(path));
  if (!ok) return res.status(404).json({ error: 'unknown estimate route' });
  return proxyJSON(req, res, `/estimate${path ? `/${encodeURIComponent(path)}` : ''}`, { timeoutMs: 15_000 });
}
