import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), '..', 'tools', 'journal_manager', 'data', 'journals.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function save(entries) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.json(load());
  }

  if (req.method === 'POST') {
    const { action, entryId, status, notes, entry } = req.body;

    const entries = load();

    if (action === 'add' && entry) {
      const existing = entries.findIndex(e => e.id === entry.id);
      if (existing >= 0) entries.splice(existing, 1);
      entries.unshift(entry);
      save(entries);
      return res.json({ ok: true, id: entry.id });
    }

    if (action === 'update' && entryId) {
      const idx = entries.findIndex(e => e.id === entryId);
      if (idx < 0) return res.status(404).json({ error: 'Not found' });
      if (status) entries[idx].status = status;
      if (notes)  entries[idx].notes = notes;
      save(entries);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  res.status(405).end();
}
