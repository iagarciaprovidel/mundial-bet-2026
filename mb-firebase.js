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
      setDisplayName: noFB,
      isGroupAdmin() { return false; },
      createGroup: noFB, renameGroup: noFB, deleteGroup: noFB, setGroupOpen: noFB,
      addAdmin: noFB, removeAdmin: noFB,
      joinGroupById: noFB, chooseNoGroup: noFB,
      approveRequest: noFB, rejectRequest: noFB,
      placeBet: noFB, cancelBet: noFB,
      subscribeOdds(cb) { if (typeof cb === 'function') cb({}); return () => {}; },
      subscribeMyBets(cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      subscribeGroups(cb) { cb([]); return () => {}; },
      subscribeUsers(cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      subscribeGroupMembers(groupId, cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      subscribeJoinRequests(groupId, cb) { if (typeof cb === 'function') cb([]); return () => {}; },
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

  const SALDO_INICIAL = 90000; // puntos virtuales con los que parte cada jugador

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
        saldo: SALDO_INICIAL,
      });
    } else if (snap.data().saldo === undefined) {
      // backfill: usuarios antiguos sin saldo
      await ref.set({ saldo: SALDO_INICIAL }, { merge: true });
    }
  }

  // Une al usuario a un equipo. Abierto → entra directo. Cerrado → crea
  // solicitud pendiente que algún admin del equipo debe aprobar.
  async function joinGroupDoc(g) {
    const u = auth.currentUser;
    const data = g.data() || {};
    if (data.open === false) {
      await db.collection('joinRequests').doc(u.uid + '_' + g.id).set({
        uid: u.uid, email: u.email || null, nombre: u.displayName || u.email || 'Jugador',
        groupId: g.id, groupName: data.name, ts: FV.serverTimestamp(),
      });
      return { pending: true, name: data.name };
    }
    await db.collection('users').doc(u.uid).set({ groupId: g.id, groupName: data.name, noGroup: false }, { merge: true });
    return { id: g.id, name: data.name };
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

    // Nombre/apodo elegido por la persona (actualiza Auth + Firestore).
    setDisplayName(nombre) {
      const u = auth.currentUser;
      if (!u) return Promise.reject('no-auth');
      const name = String(nombre || '').trim();
      if (!name) return Promise.reject('nombre-vacio');
      return Promise.all([
        u.updateProfile({ displayName: name }).catch(function () {}),
        db.collection('users').doc(u.uid).set({ nombre: name, apodoSet: true }, { merge: true }),
      ]).then(function (r) { try { window.dispatchEvent(new Event('mb-auth-refresh')); } catch (e) {} return r; });
    },

    // ── Equipos ──
    // Cualquiera puede crear un equipo: el creador queda como ADMIN y miembro.
    isGroupAdmin(group, user) {
      const u = user || auth.currentUser;
      if (!u || !group || !group.adminEmails) return false;
      return group.adminEmails.indexOf(String(u.email || '').toLowerCase()) !== -1;
    },
    async createGroup(name, open) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const email = String(u.email || '').toLowerCase();
      const nm = String(name || '').trim() || 'Equipo';
      const ref = await db.collection('groups').add({
        name: nm,
        open: open !== false,                 // por defecto ABIERTO
        adminEmails: [email],
        ownerName: u.displayName || email || null,
        creado: FV.serverTimestamp(),
      });
      await db.collection('users').doc(u.uid).set({ groupId: ref.id, groupName: nm, noGroup: false }, { merge: true });
      return { id: ref.id, name: nm };
    },
    renameGroup(id, name) { return db.collection('groups').doc(id).update({ name: String(name || '').trim() }); },
    setGroupOpen(id, open) { return db.collection('groups').doc(id).update({ open: !!open }); },
    addAdmin(groupId, email) { return db.collection('groups').doc(groupId).update({ adminEmails: FV.arrayUnion(String(email || '').trim().toLowerCase()) }); },
    removeAdmin(groupId, email) { return db.collection('groups').doc(groupId).update({ adminEmails: FV.arrayRemove(String(email || '').trim().toLowerCase()) }); },
    deleteGroup(id) { return db.collection('groups').doc(id).delete(); },
    subscribeGroups(cb) {
      return db.collection('groups').onSnapshot(function (s) {
        const arr = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        arr.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
        cb(arr);
      }, function (e) { console.warn('[MundialBet] grupos:', e && e.message); cb([]); });
    },
    // Todos los usuarios registrados (jugadores reales). Para el ranking.
    subscribeUsers(cb) {
      return db.collection('users').onSnapshot(function (s) {
        cb(s.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); }));
      }, function () { cb([]); });
    },
    // Miembros de un equipo (solo el admin puede leer todos los users según reglas)
    subscribeGroupMembers(groupId, cb) {
      return db.collection('users').where('groupId', '==', groupId)
        .onSnapshot(function (s) { cb(s.docs.map(function (d) { return d.data(); })); }, function () { cb([]); });
    },
    // El usuario se une a UN equipo (por lista o por código). Abierto → directo;
    // cerrado → queda como solicitud pendiente (devuelve { pending:true }).
    async joinGroupById(groupId) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const g = await db.collection('groups').doc(groupId).get();
      if (!g.exists) return Promise.reject('grupo-no-existe');
      return joinGroupDoc(g);
    },
    // El usuario decide NO pertenecer a ningún equipo (juega individual).
    chooseNoGroup() {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      return db.collection('users').doc(u.uid).set({ noGroup: true, groupId: null, groupName: null }, { merge: true });
    },

    // ── Apuestas (ganador del partido: home/draw/away) ──
    // Cuotas por partido (las carga el agente en la colección `odds`, id = matchId).
    subscribeOdds(cb) {
      return db.collection('odds').onSnapshot(function (s) {
        const map = {}; s.docs.forEach(function (d) { map[d.id] = d.data(); });
        cb(map);
      }, function () { cb({}); });
    },
    subscribeMyBets(cb) {
      const u = auth.currentUser; if (!u) { cb([]); return function () {}; }
      return db.collection('bets').where('uid', '==', u.uid)
        .onSnapshot(function (s) { cb(s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })); }, function () { cb([]); });
    },
    // Apuesta al ganador. pick: 'home' | 'draw' | 'away'. stake en puntos (mín 1.000).
    // Si ya había apuesta abierta en ese partido, la reemplaza (devuelve lo anterior).
    async placeBet(match, pick, stake) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      stake = Math.floor(Number(stake) || 0);
      if (['home', 'draw', 'away'].indexOf(pick) === -1) return Promise.reject('pick-invalido');
      if (stake < 1000) return Promise.reject('min-1000');
      if (new Date(match.kickoff).getTime() <= Date.now()) return Promise.reject('cerrado');
      const oddsSnap = await db.collection('odds').doc(match.id).get();
      const odds = oddsSnap.exists ? oddsSnap.data() : null;
      if (!odds || !odds[pick]) return Promise.reject('sin-cuota');
      const odd = Number(odds[pick]);
      const userRef = db.collection('users').doc(u.uid);
      const betRef = db.collection('bets').doc(u.uid + '_' + match.id);
      return db.runTransaction(async function (tx) {
        const us = await tx.get(userRef);
        const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
        const prev = await tx.get(betRef);
        const refund = (prev.exists && prev.data().status === 'open') ? (prev.data().stake || 0) : 0;
        if (saldo + refund < stake) throw 'saldo-insuficiente';
        tx.set(userRef, { saldo: saldo + refund - stake }, { merge: true });
        tx.set(betRef, {
          uid: u.uid, matchId: match.id, md: match.md || null, pick: pick, stake: stake, odd: odd,
          home: match.home, away: match.away, status: 'open', creado: FV.serverTimestamp(),
        });
      });
    },
    // Cancela la apuesta abierta de un partido (antes del kickoff) y devuelve el saldo.
    async cancelBet(matchId) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const userRef = db.collection('users').doc(u.uid);
      const betRef = db.collection('bets').doc(u.uid + '_' + matchId);
      return db.runTransaction(async function (tx) {
        const bs = await tx.get(betRef);
        if (!bs.exists || bs.data().status !== 'open') return;
        const us = await tx.get(userRef);
        const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
        tx.set(userRef, { saldo: saldo + (bs.data().stake || 0) }, { merge: true });
        tx.delete(betRef);
      });
    },

    // ── Solicitudes de ingreso (equipos cerrados) ──
    subscribeJoinRequests(groupId, cb) {
      return db.collection('joinRequests').where('groupId', '==', groupId)
        .onSnapshot(function (s) { cb(s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })); }, function () { cb([]); });
    },
    async approveRequest(req) {
      await db.collection('users').doc(req.uid).set({ groupId: req.groupId, groupName: req.groupName, noGroup: false }, { merge: true });
      await db.collection('joinRequests').doc(req.id).delete();
    },
    rejectRequest(reqId) { return db.collection('joinRequests').doc(reqId).delete(); },

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
