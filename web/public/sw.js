// Minimal service worker for Agent Smith — just enough to be installable.
// Cache-first for the app shell; network for everything else (intent calls
// must always hit the network — search-not-fetch means no cached answers).

const CACHE = 'agent-smith-v1';
const SHELL = ['/command', '/manifest.webmanifest', '/icons/agent-smith-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Never cache API traffic — the round-trip must be live every time (Inv 3).
  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith('/api/')) {
    return;
  }
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request))
  );
});
