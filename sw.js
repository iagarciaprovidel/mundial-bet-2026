/* MundialBet Club 2026 â€” Service Worker
   Estrategia: network-first para navegaciÃ³n y assets propios (siempre
   intenta traer la versiÃ³n mÃ¡s nueva), con fallback a cachÃ© para que la
   app funcione sin conexiÃ³n una vez visitada. */

const CACHE = 'mundialbet-v284';

// App shell (rutas relativas al scope /mundial-bet-2026/)
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './i18n.js',
  './install-banner.js',
  './data.js',
  './players.js',
  './wc2026.js',
  './figuritas-2026.js',
  './figuritas-codec.js',
  './app-web.jsx',
  './ios-frame.jsx',
  './tweaks-panel.jsx',
  './components.jsx',
  './mb-champion.jsx',
  './mb-semis.jsx',
  './mb-scorer.jsx',
  './mb-challenges.jsx',
  './mb-bet.jsx',
  './mb-parlay.jsx',
  './mb-auth-ui.jsx',
  './mb-team-modal.jsx',
  './screens-core.jsx',
  './screens-teams.jsx',
  './screens-bet.jsx',
  './screens-rank.jsx',
  './screens-special.jsx',
  './app.jsx',
  './mb-admin.jsx',
  './mb-team-select.jsx',
  './mb-groups-home.jsx',
  './mb-ranking.jsx',
  './mb-bracket.jsx',
  './mb-help.jsx',
  './mb-figuritas-qr.jsx',
  './mb-figuritas.jsx',
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
    ).then(() => self.clients.claim()).then(() => {
      // Notifica a todos los clientes abiertos para que recarguen y usen el nuevo SW
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', cache: CACHE }));
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // NO interceptar el flujo de autenticaciÃ³n de Firebase (/__/auth/handler e
  // /__/auth/iframe). Si el service worker los sirve/cachea, el login se rompe
  // (pantalla en blanco en la PWA). Lo maneja el navegador directamente.
  let url;
  try { url = new URL(request.url); } catch (e) {}
  if (url && url.origin === self.location.origin && url.pathname.startsWith('/__/')) return;

  // Para archivos PROPIOS pedimos a la red saltando el cachÃ© HTTP del navegador
  // (cache: 'reload'), asÃ­ siempre llega la Ãºltima versiÃ³n y no queda atrÃ¡s.
  let netRequest = request;
  if (url && url.origin === self.location.origin) netRequest = new Request(request, { cache: 'reload' });

  event.respondWith(
    fetch(netRequest)
      .then((response) => {
        // Cachea copias de respuestas vÃ¡lidas (incluye opacas de CDN)
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback para navegaciÃ³n: la app shell
          if (request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
