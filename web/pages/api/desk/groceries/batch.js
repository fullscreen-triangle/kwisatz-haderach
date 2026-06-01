import { exec } from 'child_process';
import path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..');

const FIXED_ITEMS = [
  { key: 'eggs',      query: 'Eier 10 Stück',        label: 'Eggs' },
  { key: 'chicken',   query: 'Hähnchenschenkel',      label: 'Chicken Thighs' },
  { key: 'baguette',  query: 'Baguette',               label: 'Baguette' },
  { key: 'potatoes',  query: 'Kartoffeln 1kg',         label: 'Potatoes 1kg' },
  { key: 'doener',    query: 'Döner',                  label: 'Döner' },
  { key: 'magnesium', query: 'Magnesium 500mg',        label: 'Magnesium 500mg' },
  { key: 'vitamind',  query: 'Vitamin D3 1000 IE',     label: 'Vitamin D3' },
  { key: 'hairvit',   query: 'Haar Vitamine',          label: 'Hair Vitamins' },
  { key: 'probiotic', query: 'Darmflora Probiotika',   label: 'Probiotics' },
];

function searchOne(query) {
  return new Promise((resolve) => {
    const cmd = `python -m tools.grocery_tracker.price_lookup --query "${query.replace(/"/g, '')}" --stores rewe,kaufland,penny --limit 3`;
    exec(cmd, { cwd: REPO_ROOT, timeout: 25_000 }, (err, stdout) => {
      try {
        const data = JSON.parse(stdout);
        // Extract the single cheapest result across all stores
        const all = Object.values(data.results || {}).flat().filter(r => !r.error && r.price != null);
        if (!all.length) return resolve(null);
        all.sort((a, b) => (a.unit_price ?? a.price) - (b.unit_price ?? b.price));
        resolve(all[0]);
      } catch {
        resolve(null);
      }
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const results = await Promise.all(
    FIXED_ITEMS.map(async item => ({
      ...item,
      result: await searchOne(item.query),
    }))
  );

  return res.json({ items: results, ts: Date.now() });
}
