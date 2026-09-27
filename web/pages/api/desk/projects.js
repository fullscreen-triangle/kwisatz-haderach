import fs from 'fs';
import path from 'path';

// Mirrors tools/project_manager/tracker.py's report computation in JS, since this
// Next.js API route reads tools/*/data/*.json directly rather than calling the FastAPI
// backend (same pattern as api/desk/documents.js). Keep the two in sync by hand if the
// report shape changes.

const DATA_FILE = path.join(process.cwd(), '..', 'tools', 'project_manager', 'data', 'projects.json');
const STATUSES = ['todo', 'in_progress', 'done', 'blocked'];

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { projects: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function projectReport(project) {
  const byLayer = {};
  for (const m of project.milestones) {
    const layer = m.layer || 'general';
    if (!byLayer[layer]) byLayer[layer] = { done: 0, in_progress: 0, blocked: 0, todo: 0, total: 0 };
    byLayer[layer][m.status] += 1;
    byLayer[layer].total += 1;
  }
  const total = project.milestones.length;
  const done = project.milestones.filter(m => m.status === 'done').length;
  const blocked = project.milestones.filter(m => m.status === 'blocked');
  const pct = total ? Math.round((100 * done) / total) : 0;

  const layerLines = Object.entries(byLayer).map(([layer, c]) => `${layer}: ${c.done}/${c.total} done`);
  let summary = `${project.name} — ${pct}% (${done}/${total} milestones done). ${layerLines.join('; ')}.`;
  if (blocked.length) summary += ` Blocked: ${blocked.map(m => m.title).join(', ')}.`;

  return {
    id: project.id,
    percent_done: pct,
    milestones_done: done,
    milestones_total: total,
    by_layer: byLayer,
    blocked: blocked.map(m => m.title),
    last_log: project.log.length ? project.log[project.log.length - 1] : null,
    summary,
  };
}

export default function handler(req, res) {
  const data = loadData();

  if (req.method === 'GET') {
    const projects = data.projects.map(p => ({ ...p, report: projectReport(p) }));
    return res.json({ projects });
  }

  if (req.method === 'POST') {
    // { action: 'log' | 'milestone' | 'subtool', projectId, ...fields }
    const { action, projectId } = req.body || {};
    const project = data.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: `No project '${projectId}'` });

    if (action === 'log') {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'text required' });
      project.log.push({ date: new Date().toISOString().split('T')[0], entry: text });
      saveData(data);
      return res.json({ ok: true });
    }

    if (action === 'milestone') {
      const { milestoneId, status, notes } = req.body;
      if (!STATUSES.includes(status)) return res.status(422).json({ error: `status must be one of ${STATUSES}` });
      const m = project.milestones.find(x => x.id === milestoneId);
      if (!m) return res.status(404).json({ error: `No milestone '${milestoneId}'` });
      m.status = status;
      if (notes !== undefined) m.notes = notes;
      saveData(data);
      return res.json({ ok: true });
    }

    if (action === 'subtool') {
      const { subtoolId, status } = req.body;
      if (![...STATUSES, 'available'].includes(status)) return res.status(422).json({ error: 'invalid status' });
      const st = project.subtools.find(x => x.id === subtoolId);
      if (!st) return res.status(404).json({ error: `No subtool '${subtoolId}'` });
      st.status = status;
      saveData(data);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  res.status(405).end();
}
