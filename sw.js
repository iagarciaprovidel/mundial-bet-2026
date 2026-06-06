/* MundialBet Club 2026 — Service Worker
   Estrategia: network-first para navegación y assets propios (siempre
   intenta traer la versión más nueva), con fallback a caché para que la
   app funcione sin conexión una vez visitada. */

const CACHE = 'mundialbet-v10';

// App shell (rutas relativas al scope /mundial-bet-2026/)
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './i18n.js',
  './install-banner.js',
  './data.js',
  './wc2026.js',
  './app-web.jsx',
  './ios-frame.jsx',
  './tweaks-panel.jsx',
  './components.jsx',
  './screens-core.jsx',
  './screens-teams.jsx',
  './screens-bet.jsx',
  './screens-rank.jsx',
  './screens-special.jsx',
  './app.jsx',
  './mb-admin.jsx',
  './stadium.jpg',
  './icon-144.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll falla si un solo recurso falla; usamos add individual tolerante
      Promise.allSettled(SHELL.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Para archivos PROPIOS pedimos a la red saltando el caché HTTP del navegador
  // (cache: 'reload'), así siempre llega la última versión y no queda atrás.
  let netRequest = request;
  try {
    const url = new URL(request.url);
    if (url.origin === self.location.origin) netRequest = new Request(request, { cache: 'reload' });
  } catch (e) {}

  event.respondWith(
    fetch(netRequest)
      .then((response) => {
        // Cachea copias de respuestas válidas (incluye opacas de CDN)
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback para navegación: la app shell
          if (request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
