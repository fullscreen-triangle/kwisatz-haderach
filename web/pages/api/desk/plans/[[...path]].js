// Plans: forwards /api/desk/plans[/<path>] to the node's /plans[/<path>] (backend/routes/plans.py).
// GET list · POST add · PATCH <id> · DELETE <id> · POST <id>/done · POST import · GET calendar
import { proxyJSON } from '../../../../lib/sse-proxy';

const SEG = /^[a-z0-9-]{1,64}$/;

export default async function handler(req, res) {
  const parts = [].concat(req.query.path || []);
  if (parts.length > 2 || !parts.every(p => SEG.test(p))) return res.status(404).json({ error: 'unknown plans route' });
  return proxyJSON(req, res, parts.length ? `/plans/${parts.join('/')}` : '/plans');
}
