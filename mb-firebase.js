/* ============================================================
   MundialBet Club 2026 — Capa Firebase (auth + predicciones)
   Usa el SDK "compat" cargado por <script> (window.firebase).
   Expone window.MBFirebase con helpers; window.MB_FB_READY indica
   si está configurado.
   ============================================================ */
(function () {
  const cfg = window.MB_FIREBASE_CONFIG;
  const configured = cfg && cfg.apiKey && cfg.apiKey !== 'PEGAR_AQUI';

  if (!configured || typeof firebase === 'undefined') {
    window.MB_FB_READY = false;
    // Stub para que la UI no rompa si aún no hay config
    window.MBFirebase = {
      ready: false,
      onAuth(cb) { cb(null); return () => {}; },
      signInGoogle() { alert('Falta configurar Firebase (firebase-config.js).'); return Promise.reject('no-config'); },
      signOut() { return Promise.resolve(); },
      currentUser() { return null; },
      savePrediction() { return Promise.reject('no-config'); },
      getMyPrediction() { return Promise.resolve(null); },
      subscribePredictions() { return () => {}; },
    };
    if (!configured) console.warn('[MundialBet] Firebase no configurado: edita firebase-config.js');
    return;
  }

  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();
  window.MB_FB_READY = true;

  // Crea/actualiza el perfil del usuario al iniciar sesión
  async function ensureProfile(user) {
    if (!user) return;
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        nombre: user.displayName || 'Jugador',
        email: user.email || null,
        foto: user.photoURL || null,
        creado: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  window.MBFirebase = {
    ready: true,
    onAuth(cb) {
      return auth.onAuthStateChanged(async (u) => { if (u) await ensureProfile(u); cb(u); });
    },
    signInGoogle() {
      return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    },
    signOut() { return auth.signOut(); },
    currentUser() { return auth.currentUser; },

    // Guarda la predicción de marcador (las reglas validan dueño + antes del kickoff)
    savePrediction(matchId, golesLocal, golesVisita) {
      const u = auth.currentUser;
      if (!u) return Promise.reject('no-auth');
      const id = u.uid + '_' + matchId;
      return db.collection('predictions').doc(id).set({
        uid: u.uid,
        matchId: matchId,
        golesLocal: Number(golesLocal),
        golesVisita: Number(golesVisita),
        ts: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    },

    async getMyPrediction(matchId) {
      const u = auth.currentUser;
      if (!u) return null;
      const doc = await db.collection('predictions').doc(u.uid + '_' + matchId).get();
      return doc.exists ? doc.data() : null;
    },

    // Suscripción en vivo a las predicciones de un partido (para el ranking/anonimato)
    subscribePredictions(matchId, cb) {
      return db.collection('predictions').where('matchId', '==', matchId)
        .onSnapshot(s => cb(s.docs.map(d => d.data())));
    },
  };
})();
