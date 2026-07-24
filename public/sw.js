const CACHE = 'chispa-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.0.20/index.css',
  'https://cdn.jsdelivr.net/npm/@fontsource-variable/sora@5.0.20/index.css',
  'https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1d08f0a58-ea85-4e8b-b799-e65c81f037a6.png',
  'https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1e27c098e-3039-4f77-93e4-dff9f99b05da.png',
  'https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1a3cf945c-2608-437e-a635-b2a29db621a7.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
