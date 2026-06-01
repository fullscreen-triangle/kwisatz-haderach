import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), '..', 'tools', 'document_tracker', 'data', 'grocery_list.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return []; }
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.json(load());
  }

  if (req.method === 'POST') {
    const {
      name,
      qty   = 1,
      unit  = '',
      prices = {},   // { "Rewe": 1.29, "Kaufland": 1.19, ... }
      note  = '',
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name required' });

    const items = load();
    const item  = {
      id:      Date.now().toString(),
      name:    name.trim(),
      qty:     Number(qty) || 1,
      unit,
      prices,
      note,
      created: new Date().toISOString(),
    };
    items.push(item);
    save(items);
    return res.json(item);
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const items = load();
    const idx   = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    items[idx] = { ...items[idx], ...updates };
    save(items);
    return res.json(items[idx]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    save(load().filter(i => i.id !== id));
    return res.json({ ok: true });
  }

  res.status(405).end();
}
