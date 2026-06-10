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
      badge: 'icon-192.png',
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
