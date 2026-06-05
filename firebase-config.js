/* ============================================================
   MundialBet Club 2026 — Configuración de Firebase
   Proyecto: mundialbet-club
   NOTA: estos valores NO son secretos; es seguro tenerlos en el
   front. La seguridad real la dan las reglas de Firestore.
   ============================================================ */
window.MB_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBGRFQvrO14CrTmDRI2bRHLS-UcaXxZa-Q",
  authDomain: "mundialbet-club.firebaseapp.com",
  projectId: "mundialbet-club",
  storageBucket: "mundialbet-club.firebasestorage.app",
  messagingSenderId: "133773637375",
  appId: "1:133773637375:web:8c017f7e4866393077feca",
  measurementId: "G-X8244TLKS3",
};

// Correos con acceso de ADMIN (panel de grupos). Solo estos pueden crear/editar
// grupos y ver el panel. Agrega o cambia los que necesites (en minúsculas).
window.MB_ADMIN_EMAILS = [
  "ia.garcia.providel@gmail.com",
];
