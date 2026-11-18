const CACHE_NAME = 'melanie-binder-images-v1';
const APP_CACHE  = 'melanie-binder-app-v1';

const IMAGE_HOSTS = [
  'images.pokemontcg.io',
  'assets.tcgdex.net',
  'raw.githubusercontent.com',
  'img.cardmarket.com',
];

const APP_SHELL = [
  './',
  './melanies-binder.html',
];

// Install: pre-cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP_CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== APP_CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Card images: cache-first, network fallback, then store in cache
  if (IMAGE_HOSTS.some(h => url.hostname.includes(h))) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const fresh = await fetch(e.request);
          if (fresh.ok) cache.put(e.request, fresh.clone());
          return fresh;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // App shell (the binder HTML): network-first, cache fallback
  if (url.pathname.endsWith('melanies-binder.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(APP_CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
});
