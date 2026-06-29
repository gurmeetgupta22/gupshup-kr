const CACHE_NAMES = {
  SHELL: 'gupshup-shell-v1',
  FONTS: 'gupshup-fonts-v1',
  STATIC: 'gupshup-static-v1',
  API: 'gupshup-api-v1',
  NAVIGATION: 'gupshup-nav-v1',
};

const PRECACHE_URLS = [
  '/',
  '/chat',
  '/login',
  '/offline',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.SHELL).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Precache failed for some URLs:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('gupshup-') && !Object.values(CACHE_NAMES).includes(key))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const origin = self.location.origin;

  // Always bypass cache for non-GET requests
  if (request.method !== 'GET') return;

  // Never cache Supabase realtime WebSocket upgrades
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // Never cache Supabase API calls (they contain auth tokens)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  // Google Fonts — Cache First
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_NAMES.FONTS));
    return;
  }

  // Static assets (Next.js JS/CSS chunks, images) — Cache First
  if (
    url.origin === origin &&
    (url.pathname.match(/\.(js|css|woff2?|ttf|eot|png|svg|ico|webp|jpg|jpeg)$/i) ||
     url.pathname.startsWith('/_next/static/'))
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.STATIC));
    return;
  }

  // Manifest, icons — Cache First (precached)
  if (url.origin === origin && url.pathname.match(/^\/(manifest\.json|icon-|icon\.svg)/)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.SHELL));
    return;
  }

  // Navigation requests (HTML pages) — Network First, fallback to cache then offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // API requests — Network First with cache fallback
  if (url.origin === origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE_NAMES.API));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'You are offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAMES.NAVIGATION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) return offlineResponse;
    return new Response('Offline', { status: 503 });
  }
}
