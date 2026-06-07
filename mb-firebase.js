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
    const noFB = function () { alert('Falta configurar Firebase (firebase-config.js).'); return Promise.reject('no-config'); };
    window.MBFirebase = {
      ready: false,
      onAuth(cb) { cb(null); return () => {}; },
      signInGoogle: noFB,
      signOut() { return Promise.resolve(); },
      currentUser() { return null; },
      isAdmin() { return false; },
      sendEmailLink: noFB,
      isEmailLink() { return false; },
      completeEmailLink: noFB,
      getMyProfile() { return Promise.resolve(null); },
      createGroup: noFB, renameGroup: noFB, deleteGroup: noFB,
      joinGroupById: noFB, joinGroupByCode: noFB,
      subscribeGroups(cb) { cb([]); return () => {}; },
      subscribeGroupMembers(groupId, cb) { if (typeof cb === 'function') cb([]); return () => {}; },
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

  const FV = firebase.firestore.FieldValue;
  const ADMINS = (window.MB_ADMIN_EMAILS || []).map(function (e) { return String(e).toLowerCase(); });
  const isAdminEmail = (email) => !!email && ADMINS.indexOf(String(email).toLowerCase()) !== -1;

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
        creado: FV.serverTimestamp(),
      });
    }
  }

  // Código de invitación legible (sin caracteres ambiguos: sin O,0,I,1).
  function genCode() {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  window.MBFirebase = {
    ready: true,
    onAuth(cb) {
      return auth.onAuthStateChanged(async (u) => {
        if (u) {
          try { await ensureProfile(u); } catch (e) { console.warn('[MundialBet] perfil no guardado:', e && e.message); }
        }
        cb(u);
      });
    },
    signInGoogle() {
      return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    },
    signOut() { return auth.signOut(); },
    currentUser() { return auth.currentUser; },
    isAdmin(user) { const u = user || auth.currentUser; return !!u && isAdminEmail(u.email); },

    // ── Login por correo con confirmación (email link / passwordless) ──
    sendEmailLink(email) {
      const url = window.location.origin + window.location.pathname;
      const settings = { url: url, handleCodeInApp: true };
      return auth.sendSignInLinkToEmail(email, settings).then(function () {
        try { window.localStorage.setItem('mb_emailForSignIn', email); } catch (e) {}
      });
    },
    isEmailLink(href) { return auth.isSignInWithEmailLink(href || window.location.href); },
    completeEmailLink(email) {
      let mail = email;
      try { if (!mail) mail = window.localStorage.getItem('mb_emailForSignIn'); } catch (e) {}
      if (!mail) return Promise.reject('no-email');
      return auth.signInWithEmailLink(mail, window.location.href).then(function (res) {
        try { window.localStorage.removeItem('mb_emailForSignIn'); } catch (e) {}
        return res.user;
      });
    },

    // ── Mi perfil (incluye grupo asignado) ──
    async getMyProfile() {
      const u = auth.currentUser;
      if (!u) return null;
      const doc = await db.collection('users').doc(u.uid).get();
      return doc.exists ? doc.data() : null;
    },

    // ── Grupos (solo admin debería escribir; las reglas lo refuerzan) ──
    createGroup(name) {
      const u = auth.currentUser;
      return db.collection('groups').add({
        name: String(name || '').trim() || 'Equipo',
        code: genCode(),
        owner: u ? (u.email || null) : null,
        creado: FV.serverTimestamp(),
      });
    },
    renameGroup(id, name) { return db.collection('groups').doc(id).update({ name: String(name || '').trim() }); },
    deleteGroup(id) { return db.collection('groups').doc(id).delete(); },
    subscribeGroups(cb) {
      return db.collection('groups').onSnapshot(function (s) {
        const arr = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        arr.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
        cb(arr);
      }, function (e) { console.warn('[MundialBet] grupos:', e && e.message); cb([]); });
    },
    // Miembros de un equipo (solo el admin puede leer todos los users según reglas)
    subscribeGroupMembers(groupId, cb) {
      return db.collection('users').where('groupId', '==', groupId)
        .onSnapshot(function (s) { cb(s.docs.map(function (d) { return d.data(); })); }, function () { cb([]); });
    },
    // El usuario se autoasigna a UN equipo (por lista o por código).
    async joinGroupById(groupId) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const g = await db.collection('groups').doc(groupId).get();
      if (!g.exists) return Promise.reject('grupo-no-existe');
      await db.collection('users').doc(u.uid).set({ groupId: g.id, groupName: g.data().name }, { merge: true });
      return { id: g.id, name: g.data().name };
    },
    async joinGroupByCode(code) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const c = String(code || '').trim().toUpperCase();
      if (!c) return Promise.reject('codigo-vacio');
      const q = await db.collection('groups').where('code', '==', c).limit(1).get();
      if (q.empty) return Promise.reject('codigo-invalido');
      const g = q.docs[0];
      await db.collection('users').doc(u.uid).set({ groupId: g.id, groupName: g.data().name }, { merge: true });
      return { id: g.id, name: g.data().name };
    },

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

  // Si volvemos desde el enlace del correo, completa el ingreso automáticamente.
  try {
    if (auth.isSignInWithEmailLink(window.location.href)) {
      let stored = null;
      try { stored = window.localStorage.getItem('mb_emailForSignIn'); } catch (e) {}
      const finish = function (mail) {
        return auth.signInWithEmailLink(mail, window.location.href).then(function () {
          try { window.localStorage.removeItem('mb_emailForSignIn'); } catch (e) {}
          try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
        }).catch(function (e) { alert('No se pudo completar el ingreso: ' + ((e && e.message) || e)); });
      };
      if (stored) finish(stored);
      else { const mail = window.prompt('Confirma tu correo para completar el ingreso:'); if (mail) finish(mail); }
    }
  } catch (e) {}
})();
