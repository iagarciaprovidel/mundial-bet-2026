/* ============================================================
   MundialBet Club 2026 — Service Worker de notificaciones (FCM)
   Maneja las notificaciones push cuando la app está en segundo plano
   o cerrada. Se registra desde la app al activar las notificaciones.
   ============================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
importScripts('firebase-config.js'); // define self.MB_FIREBASE_CONFIG

try {
  firebase.initializeApp(self.MB_FIREBASE_CONFIG);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(function (payload) {
    const n = (payload && payload.notification) || {};
    self.registration.showNotification(n.title || 'MundialBet Club', {
      body: n.body || '',
      icon: 'icon-192.png',
      // El "badge" (ícono chico que agrupa notificaciones en Android) DEBE ser
      // una silueta blanca sobre transparente — Android usa solo el canal
      // alfa para dibujarlo. icon-192.png es una foto a color 100% opaca, así
      // que Android no podía sacar ninguna silueta y mostraba un cuadro en
      // blanco vacío. icon-badge.png es un trofeo blanco simple con
      // transparencia real, hecho para este propósito.
      badge: 'icon-badge.png',
      data: (payload && payload.data) || {},
    });
  });
} catch (e) { /* sin config válida: no hace nada */ }

// Al tocar la notificación, enfoca/abre la app.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
