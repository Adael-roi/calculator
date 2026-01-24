const CACHE_NAME = 'calc-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/src/main.js',
  '/src/ui.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Fallback to network first for API/worker, cache-first for shell
  if (url.pathname.startsWith('/src/worker') || url.pathname.endsWith('.json')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).then(fetchResp => {
      return caches.open(CACHE_NAME).then(cache => {
        // Optionally cache new resources
        if (event.request.method === 'GET' && fetchResp.ok) cache.put(event.request, fetchResp.clone());
        return fetchResp;
      });
    })).catch(() => caches.match('/index.html'))
  );
});
