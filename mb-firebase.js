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
      onAuth(cb) { cb(null); try { window.dispatchEvent(new Event('mb-auth-ready')); } catch (e) {} return () => {}; },
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
      ownsGroup() { return Promise.resolve(false); },
      addAdmin: noFB, removeAdmin: noFB,
      joinGroupById: noFB, chooseNoGroup: noFB,
      approveRequest: noFB, rejectRequest: noFB,
      placeBet: noFB, cancelBet: noFB, setOdds: noFB,
      placeParlay: noFB, cancelParlay: noFB, subscribeMyParlays(cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      subscribeFixtures(cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      subscribeOdds(cb) { if (typeof cb === 'function') cb({}); return () => {}; },
      subscribeMyBets(cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      subscribeMe(cb) { if (typeof cb === 'function') cb(null); return () => {}; },
      subscribeActivity(cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      notifPermission() { return 'unsupported'; }, enableNotifications: noFB, setChampion: noFB, claimGroupBonuses: noFB, claimStreakTier: noFB, watchMatch: noFB,
      subscribeTeamAlbum(gid, cb) { if (typeof cb === 'function') cb(null); return () => {}; },
      teamOwnerUid() { return Promise.resolve(null); }, albumMark: noFB, albumAddMany: noFB, setAlbumLock: noFB,
      subscribeGroups(cb) { cb([]); return () => {}; },
      subscribeUsers(cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      getUsersOnce() { return Promise.resolve([]); },
      subscribeGroupMembers(groupId, cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      subscribeJoinRequests(groupId, cb) { if (typeof cb === 'function') cb([]); return () => {}; },
      savePrediction() { return Promise.reject('no-config'); },
      getMyPrediction() { return Promise.resolve(null); },
      subscribePredictions() { return () => {}; },
      saveSemiPick: noFB, getSemiPick() { return Promise.resolve(null); },
      saveChallengePick: noFB, getChallengePicks() { return Promise.resolve(null); }, claimChallengeWin: noFB,
      placeScorerBet: noFB, getMyScorerBet() { return Promise.resolve(null); }, cancelScorerBet: noFB, claimScorerWin: noFB,
    };
    if (!configured) console.warn('[MundialBet] Firebase no configurado: edita firebase-config.js');
    return;
  }

  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  // Sesión persistente: sobrevive a recargas y al cierre del navegador.
  try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {}); } catch (e) {}
  const db = firebase.firestore();
  window.MB_FB_READY = true;

  const FV = firebase.firestore.FieldValue;
  const ADMINS = (window.MB_ADMIN_EMAILS || []).map(function (e) { return String(e).toLowerCase(); });
  const isAdminEmail = (email) => !!email && ADMINS.indexOf(String(email).toLowerCase()) !== -1;

  // Suscripción en vivo con reintentos: si la lectura falla (p. ej. la sesión
  // aún no propagó el token a Firestore al cargar), reintenta en vez de quedar
  // vacía para siempre. No borra los datos previos mientras reintenta.
  function liveCollection(makeRef, mapDocs, cb) {
    let stopped = false, unsub = null, tries = 0;
    function attach() {
      unsub = makeRef().onSnapshot(function (s) { tries = 0; cb(mapDocs(s)); }, function (e) {
        console.warn('[MundialBet] live retry:', e && e.message);
        if (!stopped && tries < 6) { tries++; setTimeout(function () { if (!stopped) attach(); }, 1200); }
        else cb([]);
      });
    }
    attach();
    return function () { stopped = true; if (typeof unsub === 'function') unsub(); };
  }

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
    } else {
      const d = snap.data();
      const patch = {};
      if (d.saldo === undefined) patch.saldo = SALDO_INICIAL;                 // backfill saldo
      if (d.apodoSet && !d.nombreLower && d.nombre) patch.nombreLower = String(d.nombre).toLowerCase(); // backfill para unicidad
      if (Object.keys(patch).length) await ref.set(patch, { merge: true });
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
      let firstFire = true;
      return auth.onAuthStateChanged(async (u) => {
        cb(u); // notifica inmediatamente sin esperar ensureProfile
        if (firstFire) {
          firstFire = false;
          try { window.dispatchEvent(new Event('mb-auth-ready')); } catch (e2) {}
        }
        if (u) {
          try { await ensureProfile(u); } catch (e) { console.warn('[MundialBet] perfil no guardado:', e && e.message); }
        }
      });
    },
    signInGoogle() {
      return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    },
    signInFacebook() {
      const prov = new firebase.auth.FacebookAuthProvider();
      prov.addScope('email');
      return auth.signInWithPopup(prov);
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
    // Reglas: máx 10 caracteres, único (no repetido), y NO se puede cambiar
    // una vez elegido (apodoSet). Rechaza con códigos para mensajes claros.
    async setDisplayName(nombre) {
      const u = auth.currentUser;
      if (!u) return Promise.reject('no-auth');
      const name = String(nombre || '').trim();
      if (!name) return Promise.reject('nombre-vacio');
      if (name.length < 3) return Promise.reject('apodo-corto');
      if (name.length > 20) return Promise.reject('apodo-largo');
      const ref = db.collection('users').doc(u.uid);
      const mine = await ref.get();
      if (mine.exists && mine.data().apodoSet) return Promise.reject('apodo-fijo');
      const lower = name.toLowerCase();
      const dup = await db.collection('users').where('nombreLower', '==', lower).limit(1).get();
      if (!dup.empty && dup.docs[0].id !== u.uid) return Promise.reject('apodo-tomado');
      await Promise.all([
        u.updateProfile({ displayName: name }).catch(function () {}),
        ref.set({ nombre: name, nombreLower: lower, apodoSet: true }, { merge: true }),
      ]);
      try { window.dispatchEvent(new Event('mb-auth-refresh')); } catch (e) {}
      return true;
    },

    // ── Equipos ──
    // Cualquiera puede crear un equipo: el creador queda como ADMIN y miembro.
    isGroupAdmin(group, user) {
      const u = user || auth.currentUser;
      if (!u || !group || !group.adminEmails) return false;
      return group.adminEmails.indexOf(String(u.email || '').toLowerCase()) !== -1;
    },
    // 1 equipo por persona: cada usuario puede crear como máximo uno (queda
    // como dueño/admin). Nombre mínimo 3 y único (sin distinguir mayúsculas).
    async createGroup(name, open) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const email = String(u.email || '').toLowerCase();
      const nm = String(name || '').trim();
      if (nm.length < 3) return Promise.reject('nombre-equipo-corto');
      const mine = await db.collection('groups').where('ownerUid', '==', u.uid).limit(1).get();
      if (!mine.empty) return Promise.reject('ya-tienes-equipo');
      const lower = nm.toLowerCase();
      const dup = await db.collection('groups').where('nameLower', '==', lower).limit(1).get();
      if (!dup.empty) return Promise.reject('nombre-equipo-tomado');
      const ref = await db.collection('groups').add({
        name: nm, nameLower: lower,
        open: open !== false,                 // por defecto ABIERTO
        adminEmails: [email],
        ownerUid: u.uid,
        ownerName: u.displayName || email || null,
        creado: FV.serverTimestamp(),
      });
      await db.collection('users').doc(u.uid).set({ groupId: ref.id, groupName: nm, noGroup: false }, { merge: true });
      return { id: ref.id, name: nm };
    },
    // ¿El usuario ya creó un equipo? (para mostrar/ocultar el botón de crear)
    async ownsGroup() {
      const u = auth.currentUser; if (!u) return false;
      const snap = await db.collection('groups').where('ownerUid', '==', u.uid).limit(1).get();
      return !snap.empty;
    },
    renameGroup(id, name) { return db.collection('groups').doc(id).update({ name: String(name || '').trim() }); },
    setGroupOpen(id, open) { return db.collection('groups').doc(id).update({ open: !!open }); },
    addAdmin(groupId, email) { return db.collection('groups').doc(groupId).update({ adminEmails: FV.arrayUnion(String(email || '').trim().toLowerCase()) }); },
    removeAdmin(groupId, email) { return db.collection('groups').doc(groupId).update({ adminEmails: FV.arrayRemove(String(email || '').trim().toLowerCase()) }); },
    deleteGroup(id) { return db.collection('groups').doc(id).delete(); },
    subscribeGroups(cb) {
      return liveCollection(
        function () { return db.collection('groups'); },
        function (s) {
          const arr = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
          arr.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
          return arr;
        }, cb);
    },
    // Todos los usuarios registrados (jugadores reales). Para el ranking.
    subscribeUsers(cb) {
      return liveCollection(
        function () { return db.collection('users'); },
        function (s) { return s.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); }); },
        cb);
    },
    // Lectura única (NO realtime) de todos los usuarios. Para vistas que solo
    // necesitan un dato aproximado (p. ej. el header de Inicio: mi saldo/posición)
    // sin pagar el costo de un listener de colección completa en cada pantalla
    // (eso multiplicaba lecturas de Firestore por cada apuesta × usuario conectado).
    async getUsersOnce() {
      const s = await db.collection('users').get();
      return s.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); });
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
    // Mi documento de usuario en vivo (para mostrar el saldo actualizado al apostar).
    subscribeMe(cb) {
      const u = auth.currentUser; if (!u) { cb(null); return function () {}; }
      return db.collection('users').doc(u.uid)
        .onSnapshot(function (d) { cb(d.exists ? Object.assign({ id: d.id }, d.data()) : null); }, function () { cb(null); });
    },
    // Últimas apuestas de cualquier jugador (ticker de actividad). Un solo doc
    // (meta/activity) que arma el agente; no lee la colección `bets` en el cliente.
    subscribeActivity(cb) {
      return db.collection('meta').doc('activity')
        .onSnapshot(function (d) { cb(d.exists ? (d.data().recent || []) : []); }, function () { cb([]); });
    },

    // ── Reclamo manual de premios de fase de grupos + bono campeón ──
    // El monto NO se recibe del cliente (antes `claimGroupBonuses(bd)` confiaba
    // ciegamente en bd.total — cualquiera podía llamarla desde la consola del
    // navegador con un total inventado y regalarse puntos). Ahora se recalcula
    // acá adentro, dentro de la transacción, a partir de datos reales
    // (apuestas propias + bestStreak, que mantiene el agente) usando la misma
    // fórmula que window.MB_bonusBreakdown (mb-bet.jsx).
    async claimGroupBonuses() {
      const u = auth.currentUser;
      if (!u) return Promise.reject('no-auth');
      const ref = db.collection('users').doc(u.uid);
      const betsQuery = db.collection('bets').where('uid', '==', u.uid);
      return db.runTransaction(async (tx) => {
        const [snap, betsSnap] = await Promise.all([tx.get(ref), tx.get(betsQuery)]);
        const data = snap.exists ? snap.data() : {};
        if (data.rewards && data.rewards.groupsClosed) throw 'ya-reclamado';
        const allBets = betsSnap.docs.map((d) => d.data());
        const settled = allBets.filter((b) => b.status === 'won' || b.status === 'lost');
        const wonN = settled.filter((b) => b.status === 'won').length;
        const acc = settled.length ? Math.round((wonN * 100) / settled.length) : 0;
        const bestStreak = typeof data.bestStreak === 'number' ? data.bestStreak : 0;
        const calc = window.MB_bonusBreakdown || function () { return { total: 0 }; };
        const bd = calc({ bets: allBets.length, settled: settled.length, accuracy: acc, bestStreak: bestStreak });
        if (!bd.total) throw 'sin-premios';
        const saldo = typeof data.saldo === 'number' ? data.saldo : SALDO_INICIAL;
        tx.set(ref, {
          saldo: saldo + bd.total,
          rewards: Object.assign({}, data.rewards || {}, {
            groupsClosed: true,
            recarga: bd.recarga || 0,
            precision: bd.precision || 0,
            streak: bd.streak || 0,
          }),
        }, { merge: true });
        return bd;
      });
    },

    // Igual que arriba: el monto NO viene del cliente, se recalcula acá con la
    // tabla real de tramos (STREAK_TIERS) contra bestStreak (server-maintained).
    // Antes `claimStreakTier(tier, amount)` confiaba en `amount` tal cual.
    async claimStreakTier(tier) {
      const u = auth.currentUser;
      if (!u) return Promise.reject('no-auth');
      const STREAK_TIERS = (window.MB_REBAL && window.MB_REBAL.STREAK_TIERS) || [[3, 2000], [5, 5000], [7, 10000]];
      const found = STREAK_TIERS.find((t) => t[0] === tier);
      if (!found) return Promise.reject('tier-invalido');
      const amount = found[1];
      const ref = db.collection('users').doc(u.uid);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : {};
        const claimedTiers = (data.rewards && data.rewards.streakTiers) || [];
        if (claimedTiers.includes(tier)) throw 'ya-reclamado';
        // bestStreak = máximo histórico; fallback a currentStreak para usuarios sin el campo aún.
        const bestStr = typeof data.bestStreak === 'number' ? data.bestStreak : (typeof data.currentStreak === 'number' ? data.currentStreak : 0);
        if (bestStr < tier) throw 'streak-insuficiente';
        const saldo = typeof data.saldo === 'number' ? data.saldo : SALDO_INICIAL;
        tx.set(ref, {
          saldo: saldo + amount,
          rewards: Object.assign({}, data.rewards || {}, { streakTiers: [...claimedTiers, tier] }),
        }, { merge: true });
      });
    },

    // ── Pronóstico del campeón (gratis, se guarda en el doc del usuario) ──
    async setChampion(name, code) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      await db.collection('users').doc(u.uid).set({ champion: name, championCode: code || null, championAt: FV.serverTimestamp() }, { merge: true });
      return true;
    },

    // ── Notificaciones push (FCM) ──
    notifPermission() { return (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported'; },
    async enableNotifications() {
      if (typeof Notification === 'undefined' || typeof firebase.messaging !== 'function') return Promise.reject('no-soportado');
      const vapid = self.MB_VAPID_KEY;
      if (!vapid || vapid === 'PEGAR_AQUI') return Promise.reject('falta-vapid');
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return Promise.reject('permiso-denegado');
      // Sub-scope propio para no reemplazar al service worker principal (PWA).
      const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js', { scope: './fcm-push/' });
      const token = await firebase.messaging().getToken({ vapidKey: vapid, serviceWorkerRegistration: reg });
      if (!token) return Promise.reject('sin-token');
      await db.collection('users').doc(u.uid).set({ fcmTokens: FV.arrayUnion(token), notifEnabled: true }, { merge: true });
      // Mostrar las notificaciones también cuando la app está en PRIMER PLANO
      // (FCM no las muestra solo; hay que dibujarlas a mano). Una sola vez.
      try {
        if (!window.__mbFcmFg) {
          window.__mbFcmFg = true;
          firebase.messaging().onMessage(function (payload) {
            const n = (payload && payload.notification) || {};
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try { reg.showNotification(n.title || 'MundialBet Club', { body: n.body || '', icon: 'icon-192.png', badge: 'icon-192.png' }); } catch (e) {}
            }
          });
        }
      } catch (e) {}
      return token;
    },
    // Seguir / dejar de seguir un partido (avisos de ese partido: empieza pronto,
    // apuestas cerradas, goles en vivo y resultado final). Guarda en watchMatches.
    async watchMatch(matchId, on) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      if (!matchId) return Promise.reject('sin-partido');
      await db.collection('users').doc(u.uid).set(
        { watchMatches: on ? FV.arrayUnion(matchId) : FV.arrayRemove(matchId) }, { merge: true });
      return on;
    },

    // ── Álbum de figuritas COMPARTIDO por equipo (figuritasAlbums/{groupId}) ──
    // Colección co-op: { col: { [n]: count }, locked: bool }. Separado de apuestas.
    subscribeTeamAlbum(groupId, cb) {
      if (!groupId || typeof cb !== 'function') { if (cb) cb(null); return () => {}; }
      return db.collection('figuritasAlbums').doc(groupId).onSnapshot(
        function (s) { cb(s.exists ? s.data() : { col: {}, locked: false }); },
        function () { cb({ col: {}, locked: false }); }
      );
    },
    // ownerUid del equipo (para saber quién puede poner/quitar el candado).
    async teamOwnerUid(groupId) {
      if (!groupId) return null;
      try { const g = await db.collection('groups').doc(groupId).get(); return g.exists ? (g.data().ownerUid || null) : null; } catch (e) { return null; }
    },
    // Marca (+1) o quita (−1) una figurita del álbum del equipo. Atómico (transacción).
    // delta: +1 (tap) | −1 (mantener). Falla si está bloqueado.
    async albumMark(groupId, n, delta) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      if (!groupId) return Promise.reject('sin-equipo');
      const ref = db.collection('figuritasAlbums').doc(groupId);
      return db.runTransaction(async function (tx) {
        const s = await tx.get(ref);
        const d = s.exists ? s.data() : null;
        if (d && d.locked) throw 'bloqueado';
        const col = Object.assign({}, (d && d.col) || {});
        const next = Math.max(0, (col[n] || 0) + (delta || 0));
        if (next === 0) delete col[n]; else col[n] = next;
        tx.set(ref, { col: col, groupId: groupId, actualizado: FV.serverTimestamp() }, { merge: true });
      });
    },
    // Marca como presentes (count>=1) varias figuritas en el álbum del equipo, de una
    // sola vez (sincronizar "Mi álbum" → equipo). No baja contadores ni toca repetidas.
    // Respeta el candado. Devuelve cuántas se agregaron nuevas.
    async albumAddMany(groupId, ns) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      if (!groupId) return Promise.reject('sin-equipo');
      if (!ns || !ns.length) return 0;
      const ref = db.collection('figuritasAlbums').doc(groupId);
      return db.runTransaction(async function (tx) {
        const s = await tx.get(ref);
        const d = s.exists ? s.data() : null;
        if (d && d.locked) throw 'bloqueado';
        const col = Object.assign({}, (d && d.col) || {});
        let added = 0;
        ns.forEach(function (n) { if ((col[n] || 0) < 1) { col[n] = 1; added++; } });
        tx.set(ref, { col: col, groupId: groupId, actualizado: FV.serverTimestamp() }, { merge: true });
        return added;
      });
    },
    // Bloquea/abre el álbum del equipo (solo el dueño, según las reglas de Firestore).
    async setAlbumLock(groupId, locked) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      if (!groupId) return Promise.reject('sin-equipo');
      await db.collection('figuritasAlbums').doc(groupId).set(
        { locked: !!locked, lockedBy: u.uid, lockedAt: FV.serverTimestamp() }, { merge: true });
      return !!locked;
    },
    // Apuesta al ganador. pick: 'home' | 'draw' | 'away'. stake en puntos (mín 1.000).
    // exactHome/exactAway opcionales: si se aciertan ×3. Si ya había apuesta abierta, la reemplaza.
    async placeBet(match, pick, stake, exactHome, exactAway, exactBet) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      stake = Math.floor(Number(stake) || 0);
      exactBet = Math.max(0, Math.floor(Number(exactBet) || 0));
      if (['home', 'draw', 'away'].indexOf(pick) === -1) return Promise.reject('pick-invalido');
      if (stake < 1000) return Promise.reject('min-1000');
      // Margen de 5 min tras el kickoff para cambiar/cancelar (igual que la UI, mb-bet.jsx).
      if (new Date(match.kickoff).getTime() + 5 * 60 * 1000 <= Date.now()) return Promise.reject('cerrado');
      const oddsSnap = await db.collection('odds').doc(match.id).get();
      const odds = oddsSnap.exists ? oddsSnap.data() : null;
      if (!odds || !odds[pick]) return Promise.reject('sin-cuota');
      const odd = Number(odds[pick]);
      const hasExact = exactHome != null && exactAway != null && !isNaN(exactHome) && !isNaN(exactAway);
      const totalCharge = stake + (hasExact && exactBet > 0 ? exactBet : 0);
      const userRef = db.collection('users').doc(u.uid);
      const betRef = db.collection('bets').doc(u.uid + '_' + match.id + '_' + Date.now());
      return db.runTransaction(async function (tx) {
        const us = await tx.get(userRef);
        const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
        const staked0 = (us.exists && typeof us.data().staked === 'number') ? us.data().staked : 0;
        if (saldo < totalCharge) throw 'saldo-insuficiente';
        tx.set(userRef, { saldo: saldo - totalCharge, staked: staked0 + totalCharge }, { merge: true });
        const betData = {
          uid: u.uid, nombre: u.displayName || 'Jugador', matchId: match.id, md: match.md || null, pick: pick, stake: stake, odd: odd,
          home: match.home, away: match.away, status: 'open', creado: FV.serverTimestamp(),
        };
        if (hasExact) {
          betData.exactHome = Number(exactHome);
          betData.exactAway = Number(exactAway);
          if (exactBet > 0) betData.exactBet = exactBet;
        }
        tx.set(betRef, betData);
      });
    },
    // Carga/actualiza las cuotas de un partido (lo hará el agente; también
    // sirve para sembrar cuotas de prueba). odds = { home, draw, away }.
    setOdds(matchId, odds) {
      return db.collection('odds').doc(String(matchId)).set({
        home: Number(odds.home) || null, draw: Number(odds.draw) || null, away: Number(odds.away) || null,
        actualizado: FV.serverTimestamp(),
      }, { merge: true });
    },
    // Cancela una apuesta abierta por su ID de documento Firestore.
    async cancelBet(betId) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const userRef = db.collection('users').doc(u.uid);
      const betRef = db.collection('bets').doc(betId);
      return db.runTransaction(async function (tx) {
        const bs = await tx.get(betRef);
        if (!bs.exists || bs.data().status !== 'open' || bs.data().uid !== u.uid) return;
        const us = await tx.get(userRef);
        const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
        const staked0 = (us.exists && typeof us.data().staked === 'number') ? us.data().staked : 0;
        const st = bs.data().stake || 0;
        tx.set(userRef, { saldo: saldo + st, staked: Math.max(0, staked0 - st) }, { merge: true });
        tx.delete(betRef);
      });
    },

    // ── Apuesta combinada (parlay): 2-6 picks de partidos distintos, cuota
    // combinada = producto de cada cuota. Gana solo si TODOS los picks aciertan.
    // legs: [{ matchId, pick, home, away, kickoff }] (sin odd: se relee fresca acá).
    async placeParlay(legs, stake) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      stake = Math.floor(Number(stake) || 0);
      if (!Array.isArray(legs) || legs.length < 2) return Promise.reject('combinada-minima');
      if (legs.length > 6) return Promise.reject('combinada-maxima');
      if (stake < 1000) return Promise.reject('min-1000');
      const ids = new Set(legs.map((l) => l.matchId));
      if (ids.size !== legs.length) return Promise.reject('partido-repetido');
      const fresh = [];
      for (const leg of legs) {
        if (new Date(leg.kickoff).getTime() + 5 * 60 * 1000 <= Date.now()) return Promise.reject('cerrado');
        const oddsSnap = await db.collection('odds').doc(leg.matchId).get();
        const odds = oddsSnap.exists ? oddsSnap.data() : null;
        if (!odds || !odds[leg.pick]) return Promise.reject('sin-cuota');
        fresh.push({ matchId: leg.matchId, pick: leg.pick, odd: Number(odds[leg.pick]), home: leg.home, away: leg.away, kickoff: leg.kickoff });
      }
      const combinedOdd = fresh.reduce((p, l) => p * l.odd, 1);
      const userRef = db.collection('users').doc(u.uid);
      const parlayRef = db.collection('parlays').doc();
      return db.runTransaction(async function (tx) {
        const us = await tx.get(userRef);
        const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
        const staked0 = (us.exists && typeof us.data().staked === 'number') ? us.data().staked : 0;
        if (saldo < stake) throw 'saldo-insuficiente';
        tx.set(userRef, { saldo: saldo - stake, staked: staked0 + stake }, { merge: true });
        tx.set(parlayRef, {
          uid: u.uid, nombre: u.displayName || 'Jugador', legs: fresh, stake: stake, combinedOdd: combinedOdd,
          status: 'open', creado: FV.serverTimestamp(),
        });
      });
    },
    subscribeMyParlays(cb) {
      const u = auth.currentUser; if (!u) { cb([]); return function () {}; }
      return db.collection('parlays').where('uid', '==', u.uid)
        .onSnapshot(function (s) { cb(s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })); }, function () { cb([]); });
    },
    subscribeFixtures(cb) {
      return db.collection('fixtures')
        .onSnapshot(function (s) { cb(s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })); }, function () { cb([]); });
    },
    // Cancela una combinada abierta (solo si NINGÚN partido de la combinada empezó).
    cancelParlay(id) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const userRef = db.collection('users').doc(u.uid);
      const parlayRef = db.collection('parlays').doc(id);
      return db.runTransaction(async function (tx) {
        const ps = await tx.get(parlayRef);
        if (!ps.exists || ps.data().status !== 'open' || ps.data().uid !== u.uid) return;
        const legs = ps.data().legs || [];
        const started = legs.some(function (l) { return new Date(l.kickoff).getTime() + 5 * 60 * 1000 <= Date.now(); });
        if (started) throw 'cerrado';
        const us = await tx.get(userRef);
        const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
        const staked0 = (us.exists && typeof us.data().staked === 'number') ? us.data().staked : 0;
        const st = ps.data().stake || 0;
        tx.set(userRef, { saldo: saldo + st, staked: Math.max(0, staked0 - st) }, { merge: true });
        tx.delete(parlayRef);
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

    // ── Pronóstico de semifinalistas ──
    // Guardado en users/{uid}.semiPick para evitar reglas de Firestore separadas
    async saveSemiPick(teams) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      if (!Array.isArray(teams) || teams.length !== 4) return Promise.reject('pick-invalido');
      await db.collection('users').doc(u.uid).set(
        { semiPick: { teams: teams, ts: FV.serverTimestamp() } },
        { merge: true }
      );
      return true;
    },
    async getSemiPick() {
      const u = auth.currentUser; if (!u) return null;
      const doc = await db.collection('users').doc(u.uid).get();
      return doc.exists ? ((doc.data().semiPick && doc.data().semiPick.teams) || null) : null;
    },

    // ── Apuesta al goleador del torneo (staked, ×20 si acierta) ──
    // Guardada en users/{uid}.scorerBet (mismo patrón que semiPick: sin colección
    // aparte). Reemplaza la apuesta anterior si la había (devuelve el stake previo).
    async placeScorerBet(playerName, teamName, teamCode, stake) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      stake = Math.floor(Number(stake) || 0);
      if (stake < 1000) return Promise.reject('min-1000');
      if (!playerName || !teamCode) return Promise.reject('pick-invalido');
      const userRef = db.collection('users').doc(u.uid);
      return db.runTransaction(async function (tx) {
        const us = await tx.get(userRef);
        const ud = us.exists ? us.data() : {};
        const saldo = (typeof ud.saldo === 'number') ? ud.saldo : SALDO_INICIAL;
        const staked0 = (typeof ud.staked === 'number') ? ud.staked : 0;
        const prevOpen = ud.scorerBet && ud.scorerBet.status === 'open' ? ud.scorerBet : null;
        const refund = prevOpen ? (prevOpen.stake || 0) : 0;
        const available = saldo + refund;
        if (available < stake) throw 'saldo-insuficiente';
        tx.set(userRef, {
          saldo: available - stake, staked: staked0 - refund + stake,
          scorerBet: { player: playerName, team: teamName, teamCode: teamCode, stake: stake, status: 'open', ts: FV.serverTimestamp() },
        }, { merge: true });
      });
    },
    async getMyScorerBet() {
      const u = auth.currentUser; if (!u) return null;
      const doc = await db.collection('users').doc(u.uid).get();
      return doc.exists ? (doc.data().scorerBet || null) : null;
    },
    async cancelScorerBet() {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const userRef = db.collection('users').doc(u.uid);
      return db.runTransaction(async function (tx) {
        const us = await tx.get(userRef);
        if (!us.exists) return;
        const ud = us.data();
        if (!ud.scorerBet || ud.scorerBet.status !== 'open') return;
        const saldo = (typeof ud.saldo === 'number') ? ud.saldo : SALDO_INICIAL;
        const staked0 = (typeof ud.staked === 'number') ? ud.staked : 0;
        const st = ud.scorerBet.stake || 0;
        tx.set(userRef, { saldo: saldo + st, staked: Math.max(0, staked0 - st), scorerBet: null }, { merge: true });
      });
    },

    // ── Desafíos por partido (challenge_picks) ──
    // Apuesta real: cuesta `stake` puntos al elegir. Si acierta, el agente paga
    // ×2 (stake de vuelta + la misma ganancia); si falla, el stake ya se perdió
    // (no se hace nada más al liquidar). Reemplazar una respuesta ya guardada
    // devuelve el stake anterior antes de cobrar el nuevo.
    // challenge_picks/{uid_matchId_qkey} → { uid, matchId, qkey, pick, stake, status, ts }
    async saveChallengePick(matchId, qkey, pick, stake) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      if (!matchId || !qkey || !pick) return Promise.reject('pick-invalido');
      stake = Math.floor(Number(stake) || 0);
      if (stake < 100) return Promise.reject('min-100');
      const id = u.uid + '_' + matchId + '_' + qkey;
      const pickRef = db.collection('challenge_picks').doc(id);
      const userRef = db.collection('users').doc(u.uid);
      return db.runTransaction(async function (tx) {
        const ps = await tx.get(pickRef);
        const us = await tx.get(userRef);
        const ud = us.exists ? us.data() : {};
        const saldo = (typeof ud.saldo === 'number') ? ud.saldo : SALDO_INICIAL;
        const staked0 = (typeof ud.staked === 'number') ? ud.staked : 0;
        const prevOpen = (ps.exists && ps.data().status === 'open') ? ps.data() : null;
        const refund = prevOpen ? (prevOpen.stake || 0) : 0;
        const available = saldo + refund;
        if (available < stake) throw 'saldo-insuficiente';
        tx.set(userRef, { saldo: available - stake, staked: staked0 - refund + stake }, { merge: true });
        tx.set(pickRef, {
          uid: u.uid, matchId: matchId, qkey: qkey, pick: pick, stake: stake, status: 'open', claimed: false, ts: FV.serverTimestamp(),
        });
      });
    },
    // Devuelve el doc completo por qkey (pick, stake, status, payout, claimed) —
    // no solo el pick, para poder mostrar el botón "Reclamar" cuando ganó.
    async getChallengePicks(matchId) {
      const u = auth.currentUser; if (!u) return null;
      const keys = ['q1', 'q2', 'q3', 'q4', 'q5'];
      const docs = await Promise.all(keys.map(k => db.collection('challenge_picks').doc(u.uid + '_' + matchId + '_' + k).get()));
      const out = {};
      let any = false;
      docs.forEach((d, i) => { if (d.exists) { out[keys[i]] = Object.assign({ id: d.id }, d.data()); any = true; } });
      return any ? out : null;
    },
    // El agente liquida (status:'won'/'lost' + payout) pero NO acredita el saldo
    // todavía — el usuario reclama el premio con este botón, igual que
    // ClaimBonusBanner. Evita el doble-reclamo con el flag `claimed`.
    async claimChallengeWin(pickId) {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      if (!pickId) return Promise.reject('pick-invalido');
      const pickRef = db.collection('challenge_picks').doc(pickId);
      const userRef = db.collection('users').doc(u.uid);
      return db.runTransaction(async function (tx) {
        const ps = await tx.get(pickRef);
        if (!ps.exists) throw 'no-existe';
        const d = ps.data();
        if (d.uid !== u.uid) throw 'no-autorizado';
        if (d.status !== 'won' || d.claimed) return;
        const us = await tx.get(userRef);
        const ud = us.exists ? us.data() : {};
        const saldo = (typeof ud.saldo === 'number') ? ud.saldo : SALDO_INICIAL;
        tx.set(userRef, { saldo: saldo + (d.payout || 0) }, { merge: true });
        tx.set(pickRef, { claimed: true, claimedAt: FV.serverTimestamp() }, { merge: true });
      });
    },
    // Igual que claimChallengeWin pero para la apuesta al goleador
    // (users/{uid}.scorerBet, liquidada por settleScorerBets en el agente).
    async claimScorerWin() {
      const u = auth.currentUser; if (!u) return Promise.reject('no-auth');
      const userRef = db.collection('users').doc(u.uid);
      return db.runTransaction(async function (tx) {
        const us = await tx.get(userRef);
        if (!us.exists) return;
        const ud = us.data();
        const bet = ud.scorerBet;
        if (!bet || bet.status !== 'won' || bet.claimed) return;
        const saldo = (typeof ud.saldo === 'number') ? ud.saldo : SALDO_INICIAL;
        tx.set(userRef, {
          saldo: saldo + (bet.payout || 0),
          scorerBet: Object.assign({}, bet, { claimed: true }),
        }, { merge: true });
      });
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
