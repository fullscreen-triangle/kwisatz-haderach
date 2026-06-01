import https from 'https';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), '..', 'tools', 'document_tracker', 'data', 'weather_cache.json');
const CACHE_TTL  = 3600_000; // 1 hour

export const WMO_LABEL = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Sleet',
  80: 'Showers', 81: 'Heavy showers', 82: 'Violent showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm+hail', 99: 'Thunderstorm+hail',
};

export const WMO_COLOR = {
  0: '#fbbf24', 1: '#fbbf24', 2: '#94a3b8', 3: '#64748b',
  45: '#9ca3af', 48: '#9ca3af',
  51: '#60a5fa', 53: '#60a5fa', 55: '#3b82f6',
  61: '#60a5fa', 63: '#3b82f6', 65: '#1d4ed8',
  71: '#e2e8f0', 73: '#e2e8f0', 75: '#f8fafc', 77: '#e2e8f0',
  80: '#60a5fa', 81: '#3b82f6', 82: '#1d4ed8',
  85: '#e2e8f0', 86: '#f8fafc',
  95: '#f87171', 96: '#f87171', 99: '#ef4444',
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function loadCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (Date.now() - raw._ts < CACHE_TTL) return raw;
  } catch {}
  return null;
}

function saveCache(data) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const cached = loadCache();
  if (cached) return res.json(cached);

  const lat  = process.env.HOME_LATITUDE  || '48.1351';
  const lon  = process.env.HOME_LONGITUDE || '11.5820';
  const city = process.env.HOME_CITY      || 'Munich';
  const tz   = process.env.HOME_TZ        || 'Europe/Berlin';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relative_humidity_2m,precipitation`
    + `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,sunrise,sunset`
    + `&timezone=${encodeURIComponent(tz)}&forecast_days=5`;

  try {
    const raw = await httpsGet(url);
    const c   = raw.current;
    const d   = raw.daily;

    const data = {
      _ts:  Date.now(),
      city,
      current: {
        temp:       Math.round(c.temperature_2m),
        feels_like: Math.round(c.apparent_temperature),
        code:       c.weathercode,
        label:      WMO_LABEL[c.weathercode] || 'Unknown',
        color:      WMO_COLOR[c.weathercode] || '#aaa',
        wind:       Math.round(c.windspeed_10m),
        humidity:   c.relative_humidity_2m,
      },
      forecast: (d.time || []).slice(0, 5).map((date, i) => ({
        date,
        max:    Math.round(d.temperature_2m_max[i]),
        min:    Math.round(d.temperature_2m_min[i]),
        code:   d.weathercode[i],
        label:  WMO_LABEL[d.weathercode[i]] || '',
        color:  WMO_COLOR[d.weathercode[i]] || '#aaa',
        precip: d.precipitation_probability_max[i],
      })),
    };

    saveCache(data);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
