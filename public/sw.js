const CACHE_NAME = 'areal-v2';
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Avoid caching framework bundles and API responses to prevent stale chunk crashes.
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_next/')) return;
    if (url.pathname.startsWith('/api/')) return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL) || Response.error())
    );
    return;
  }

  if (url.origin === self.location.origin) {
    if (request.destination === 'script' || request.destination === 'style') {
      return;
    }
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }
});
