/* PixelLogic Mobile — Service Worker
 * Cache-first for app shell, network-first for data files.
 */
const VERSION = 'v0.8.0';
const SHELL_CACHE = `pl-shell-${VERSION}`;
const DATA_CACHE  = `pl-data-${VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/router.js',
  './js/state.js',
  './js/features/home.js',
  './js/features/projects.js',
  './js/features/power-calc.js',
  './js/features/aspect-ratio.js',
  './js/features/designer.js',
  './js/features/visualizer.js',
  './js/features/projector.js',
  './js/features/patching.js',
  './js/features/pdf.js',
  './js/features/more.js',
  './js/features/placeholder.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![SHELL_CACHE, DATA_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Network-first for JSON data, cache-first for everything else (app shell)
  if (url.pathname.endsWith('.json')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(DATA_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(SHELL_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      // SPA fallback
      if (req.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
