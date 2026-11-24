// Personal finance: forwards /api/desk/finance/<path> to the node's /finance/<path>
// (backend/routes/finance.py). Only the routes listed here pass; everything is JSON.
import { proxyJSON } from '../../../../lib/sse-proxy';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const GET = new Set(['overview', 'plan', 'afford', 'transactions', 'deliveries']);
const POST = new Set(['import', 'deliveries/scan']);

function allowed(method, seg) {
  const path = seg.join('/');
  if (method === 'GET') return GET.has(path);
  if (method !== 'POST') return false;
  if (POST.has(path)) return true;
  // receivables/<id>/log | receivables/<id>/payment
  return seg.length === 3 && seg[0] === 'receivables' && ['log', 'payment'].includes(seg[2]);
}

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  if (!allowed(req.method, seg)) return res.status(404).json({ error: 'unknown finance route' });
  const path = seg.map(encodeURIComponent).join('/');
  return proxyJSON(req, res, `/finance/${path}`, { timeoutMs: path === 'deliveries/scan' ? 90_000 : 30_000 });
}
