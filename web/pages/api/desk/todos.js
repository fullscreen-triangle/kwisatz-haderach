import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), '..', 'tools', 'document_tracker', 'data', 'todos.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
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
    // Create new todo
    const { text, priority = 'normal', due = null, category = 'general' } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });
    const todos = load();
    const todo = {
      id:       Date.now().toString(),
      text:     text.trim(),
      priority,       // 'high' | 'normal' | 'low'
      due,            // ISO date string or null
      category,       // 'general' | 'research' | 'health' | 'admin'
      done:     false,
      created:  new Date().toISOString(),
    };
    todos.unshift(todo);
    save(todos);
    return res.json(todo);
  }

  if (req.method === 'PATCH') {
    const { id, done, text, priority, due, category } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const todos = load();
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    if (done     !== undefined) todos[idx].done     = done;
    if (text     !== undefined) todos[idx].text     = text;
    if (priority !== undefined) todos[idx].priority = priority;
    if (due      !== undefined) todos[idx].due      = due;
    if (category !== undefined) todos[idx].category = category;
    save(todos);
    return res.json(todos[idx]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const todos = load().filter(t => t.id !== id);
    save(todos);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
