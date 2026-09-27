// "Ask your mail" — four-sided-triangle's individuation (vendored in web/vendor/individuate).
//
// Each account's markdown mirror is its own source, and the desk's projects and todos are
// two more, so an answer can reach `grounded` only when three independent sources agree;
// otherwise it comes back single-/two-sourced, contested or declined — never a bare
// top-matching passage. The receiver graph persists per user across restarts.
import fs from 'fs';
import path from 'path';
import {
  createIndividuator, LocalFileSource, InMemorySource, JsonFilePersistAdapter,
} from '@four-sided-triangle/individuate';

const REPO = path.join(process.cwd(), '..');

function state() {
  return process.env.AGENT_SMITH_STATE || path.join(REPO, 'backend', '.agent_smith');
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return fallback; }
}

function sources() {
  const md = path.join(state(), 'mail', 'md');
  const out = [];
  let accounts = [];
  try {
    accounts = fs.readdirSync(md, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.')).map(d => d.name);
  } catch { /* no mail yet */ }
  for (const a of accounts) {
    const src = new LocalFileSource({ root: path.join(md, a), extensions: ['.md'] });
    // LocalFileSource names itself after its root; give each account a distinct, readable name.
    out.push({ name: `mail:${a}`, list: () => src.list() });
  }
  const projects = readJson(path.join(REPO, 'tools', 'project_manager', 'data', 'projects.json'), {});
  const pchunks = [];
  for (const p of projects.projects || []) {
    pchunks.push({ id: `project:${p.id}`, text: `${p.name}. ${p.context || ''}`, origin: `project ${p.name}` });
    for (const m of p.milestones || []) {
      pchunks.push({ id: `project:${p.id}:${m.id}`, text: `${p.name}: ${m.title} (${m.status}). ${m.notes || ''}`,
                     origin: `project ${p.name}` });
    }
  }
  if (pchunks.length) out.push(new InMemorySource('projects', pchunks));
  const plans = readJson(path.join(state(), 'plans', 'plans.json'), {}).nodes || [];
  const words = n => [n.title, n.notes,
    n.when?.date && `on ${n.when.date}`, n.when?.window && `between ${n.when.window.join(' and ')}`,
    n.every && `${n.every.times} times a ${n.every.per}`, n.cost && `costs ${n.cost.amount} ${n.cost.currency || 'EUR'}`,
    ...(n.requires || []).map(r => `requires ${r}`), n.status !== 'active' && `(${n.status})`].filter(Boolean).join('. ');
  if (plans.length) {
    out.push(new InMemorySource('plans', plans.filter(n => n.status !== 'dropped').map(n => ({
      id: `plan:${n.id}`, text: words(n), origin: 'plans' }))));
  }
  const todos = readJson(path.join(REPO, 'tools', 'document_tracker', 'data', 'todos.json'), []);
  const tlist = Array.isArray(todos) ? todos : todos.todos || [];
  if (tlist.length) {
    out.push(new InMemorySource('todos', tlist.filter(t => !t.done).map(t => ({
      id: `todo:${t.id}`, text: `${t.text}${t.due ? ` (due ${t.due})` : ''}`, origin: 'todos' }))));
  }
  return out;
}

// Chunk ids from a mail source are "<yyyy-mm>/<stem>.md#<n>"; the message key is "<account>:<stem>".
function messageKey(source, id) {
  if (!source.startsWith('mail:')) return null;
  const stem = id.split('#')[0].split('/').pop().replace(/\.md$/, '');
  return `${source.slice(5)}:${stem}`;
}

export default async function handler(req, res) {
  const q = String((req.method === 'POST' ? req.body?.q : req.query.q) || '').trim();
  if (!q) return res.status(422).json({ error: 'Ask something first.' });
  const srcs = sources();
  if (!srcs.length) return res.status(503).json({ error: 'Nothing to search yet — no mail has been mirrored.' });

  const individuator = createIndividuator({
    receiverId: 'kundai',
    sources: srcs,
    persist: new JsonFilePersistAdapter(path.join(state(), 'individuate', 'receiver.json')),
  });
  try {
    const answer = await individuator.ask(q);
    const support = (answer.support || []).map(c => ({ ...c, key: messageKey(c.source, c.id) }));
    return res.json({ ...answer, support, sources: srcs.map(s => s.name) });
  } catch (err) {
    return res.status(500).json({ error: `individuation failed: ${err?.message || err}` });
  }
}
