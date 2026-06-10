/* ============================================================
   MundialBet Club 2026 — Configuración de Firebase
   Proyecto: mundialbet-club
   NOTA: estos valores NO son secretos; es seguro tenerlos en el
   front. La seguridad real la dan las reglas de Firestore.
   Se usa `self` (no `window`) para que también funcione dentro del
   service worker de notificaciones (firebase-messaging-sw.js).
   ============================================================ */
self.MB_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBGRFQvrO14CrTmDRI2bRHLS-UcaXxZa-Q",
  authDomain: "mundialbet-club.firebaseapp.com",
  projectId: "mundialbet-club",
  storageBucket: "mundialbet-club.firebasestorage.app",
  messagingSenderId: "133773637375",
  appId: "1:133773637375:web:8c017f7e4866393077feca",
  measurementId: "G-X8244TLKS3",
};

// Clave pública de Web Push (VAPID) para las notificaciones. Sácala en
// Firebase Console → ⚙️ Configuración del proyecto → Cloud Messaging →
// "Certificados push web" → Generar par de claves → copia la clave pública.
self.MB_VAPID_KEY = "BEMengRL7fgeicmCg3wYtBKehaLWMiUIkMF1URIgL2_vXzQRJP5KVIdPlcQnJm1ZMzr-RRDV1SMV7MEB-6tXTDQ";

// Correos con acceso de ADMIN (panel de grupos). Solo estos pueden crear/editar
// grupos y ver el panel. Agrega o cambia los que necesites (en minúsculas).
self.MB_ADMIN_EMAILS = [
  "ia.garcia.providel@gmail.com",
  "sgarciao@gmail.com",
];
