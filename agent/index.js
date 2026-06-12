/* ============================================================
   MundialBet Club 2026 — Agente automático (GRATIS)
   Fuente de RESULTADOS: football-data.org (plan gratis, incluye el
   Mundial — competición "WC"). Las CUOTAS 1·X·2 se GENERAN por nivel
   de cada selección (modelo tipo ranking), sin depender de nadie.

   Cada corrida:
     1) Genera cuotas (si faltan) de los próximos partidos → `odds`.
     2) Trae resultados de football-data.org y LIQUIDA las apuestas
        de los partidos terminados (paga monto×cuota, actualiza saldo
        y deja prevSaldo para las flechas ↑/↓).

   Variables de entorno:
     FOOTBALL_DATA_TOKEN        token gratis de football-data.org
     FIREBASE_SERVICE_ACCOUNT   JSON del service account (una línea)
   Opcionales: WC_COMP (def "WC"), MAX_ODDS, ODDS_WINDOW_H (def 120),
               ODDS_MARGIN (def 1.06).
   Modo descubrimiento (calibrar nombres):  node agent/index.js discover
   ============================================================ */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const COMP = process.env.WC_COMP || 'WC';                 // competición Mundial en football-data.org
const FD_BASE = 'https://api.football-data.org/v4';
const ODDS_WINDOW_H = parseInt(process.env.ODDS_WINDOW_H || '120', 10);
const ODDS_MARGIN = parseFloat(process.env.ODDS_MARGIN || '1.06'); // overround (~6%)
const DISCOVER = process.argv.includes('discover');
const DIAG = process.argv.includes('diag');
const SALDO_INICIAL = 90000;

// ── Nuestros partidos (generados desde wc2026.js) ──
const OURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'our-fixtures.json'), 'utf8'));

// ── ISO2 → alias en inglés (como los nombra football-data.org) ──
const ALIASES = {
  mx: ['mexico'], za: ['south africa'], kr: ['south korea', 'korea republic', 'korea'],
  cz: ['czech republic', 'czechia'], ca: ['canada'], ba: ['bosnia and herzegovina', 'bosnia herzegovina', 'bosnia'],
  qa: ['qatar'], ch: ['switzerland'], br: ['brazil'], ma: ['morocco'], ht: ['haiti'],
  'gb-sct': ['scotland'], us: ['usa', 'united states'], py: ['paraguay'], au: ['australia'],
  tr: ['turkey', 'turkiye'], de: ['germany'], cw: ['curacao'], ci: ['ivory coast', 'cote d ivoire', 'cote divoire'],
  ec: ['ecuador'], nl: ['netherlands', 'holland'], jp: ['japan'], se: ['sweden'], tn: ['tunisia'],
  be: ['belgium'], eg: ['egypt'], ir: ['iran', 'ir iran'], nz: ['new zealand'], es: ['spain'],
  cv: ['cape verde', 'cape verde islands', 'cabo verde'], sa: ['saudi arabia'], uy: ['uruguay'],
  fr: ['france'], sn: ['senegal'], iq: ['iraq'], no: ['norway'], ar: ['argentina'], dz: ['algeria'],
  at: ['austria'], jo: ['jordan'], pt: ['portugal'], cd: ['dr congo', 'congo dr', 'congo', 'democratic republic of congo'],
  // (ir 'ir iran' y otras variantes que usa ESPN se añaden abajo)
  uz: ['uzbekistan'], co: ['colombia'], 'gb-eng': ['england'], hr: ['croatia'], gh: ['ghana'], pa: ['panama'],
};
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const ALIAS_TO_ISO = {};
Object.keys(ALIASES).forEach((iso) => ALIASES[iso].forEach((a) => { ALIAS_TO_ISO[norm(a)] = iso; }));
const isoOf = (apiName) => ALIAS_TO_ISO[norm(apiName)] || null;

// ── Fuerza aproximada por selección (para generar cuotas). Default 1750. ──
const RATING = {
  ar: 2100, fr: 2080, es: 2060, br: 2020, 'gb-eng': 2010, pt: 2000, de: 1960, nl: 1980, be: 1950,
  uy: 1910, co: 1900, hr: 1900, ma: 1890, jp: 1880, sn: 1870, ch: 1870, us: 1850, mx: 1850, at: 1850,
  ec: 1840, no: 1830, cz: 1830, ir: 1820, kr: 1820, ci: 1810, eg: 1810, ca: 1810, dz: 1810, au: 1800,
  se: 1800, 'gb-sct': 1800, tr: 1800, py: 1780, tn: 1780, gh: 1780, ba: 1780, cd: 1780, sa: 1760, pa: 1760,
  uz: 1760, za: 1740, qa: 1740, iq: 1740, cv: 1720, jo: 1700, nz: 1680, ht: 1660, cw: 1640,
};
const ratingOf = (iso) => RATING[iso] || 1750;

// Genera cuotas 1·X·2 a partir de la fuerza de cada equipo (orientación nuestra).
function modelOdds(homeIso, awayIso) {
  const dr = ratingOf(homeIso) - ratingOf(awayIso);          // sin ventaja de local (sedes neutrales)
  const pHwin = 1 / (1 + Math.pow(10, -dr / 400));           // prob. de que el local sea mejor
  const evenness = 1 - Math.abs(2 * pHwin - 1);              // 1 si parejo, 0 si dispar
  const pD = 0.18 + 0.16 * evenness;                          // empate más probable si parejo
  const pH = (1 - pD) * pHwin;
  const pA = (1 - pD) * (1 - pHwin);
  const odd = (p) => Math.max(1.05, Math.min(15, Math.round((1 / (p * ODDS_MARGIN)) * 100) / 100));
  return { home: odd(pH), draw: odd(pD), away: odd(pA) };
}

// Encuentra NUESTRO partido para un partido de football-data (por par de ISO).
function matchOur(homeName, awayName) {
  const hi = isoOf(homeName), ai = isoOf(awayName);
  if (!hi || !ai) return null;
  const our = OURS.find((o) => { const s = new Set([o.homeCode, o.awayCode]); return s.has(hi) && s.has(ai); });
  if (!our) return null;
  return { our, sameOrient: our.homeCode === hi };
}

async function fdMatches() {
  const res = await fetch(`${FD_BASE}/competitions/${COMP}/matches`, { headers: { 'X-Auth-Token': TOKEN } });
  if (res.status === 403 || res.status === 429) {
    const t = await res.text().catch(() => '');
    throw new Error(`football-data.org respondió ${res.status}: ${t.slice(0, 160)}`);
  }
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.matches) ? json.matches : [];
}

// ── Marcadores desde ESPN (gratis, sin clave; SÍ trae goles en vivo y finales) ──
// football-data.org gratis NO entrega goles del Mundial; ESPN sí. Devuelve los
// partidos con el MISMO formato que football-data para reusar el bucle de abajo.
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
function espnToFd(e) {
  const c = e.competitions && e.competitions[0]; if (!c) return null;
  const comp = c.competitors || [];
  const home = comp.find((x) => x.homeAway === 'home') || comp[0];
  const away = comp.find((x) => x.homeAway === 'away') || comp[1];
  if (!home || !away) return null;
  const st = (e.status && e.status.type) || {};
  const state = st.state; // 'pre' | 'in' | 'post'
  const status = (state === 'post' && st.completed) ? 'FINISHED' : (state === 'in' ? 'IN_PLAY' : 'TIMED');
  const num = (v) => (v == null || v === '') ? null : parseInt(v, 10);
  // Goleadores (si ESPN los incluye en el scoreboard): lado home/away + nombre + minuto.
  const hid = home.team && home.team.id, aid = away.team && away.team.id;
  const goals = ((c.details || []).filter((x) => x.scoringPlay)).map((x) => {
    const tid = x.team && x.team.id;
    const side = (tid && tid === hid) ? 'home' : (tid && tid === aid) ? 'away' : null;
    const ath = (x.athletesInvolved && x.athletesInvolved[0]) || null;
    const txt = (x.type && x.type.text) || '';
    return { side: side, name: ath ? (ath.displayName || ath.shortName || '') : '', minute: (x.clock && x.clock.displayValue) || '', og: /own/i.test(txt), pen: /penal/i.test(txt) };
  }).filter((g) => g.side && g.name);
  return {
    status: status,
    minute: (e.status && (e.status.displayClock || e.status.period)) || null,
    score: { fullTime: { home: num(home.score), away: num(away.score) } },
    homeTeam: { name: (home.team && (home.team.displayName || home.team.name)) || '' },
    awayTeam: { name: (away.team && (away.team.displayName || away.team.name)) || '' },
    goals: goals,
  };
}
async function espnMatches() {
  const d = new Date();
  const ymd = (off) => new Date(d.getTime() + off * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const url = `${ESPN_URL}?dates=${ymd(-1)}-${ymd(1)}`; // ventana de ayer→mañana (UTC)
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('ESPN respondió ' + res.status);
  const j = await res.json().catch(() => ({}));
  return (j.events || []).map(espnToFd).filter(Boolean);
}

let db = null;
function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  db = admin.firestore();
}

// ── Genera y guarda cuotas faltantes de los próximos partidos (sin API externa) ──
async function ensureOdds() {
  const now = Date.now();
  let n = 0;
  for (const o of OURS) {
    const h = (new Date(o.kickoff).getTime() - now) / 3600000;
    if (!(h > 0 && h <= ODDS_WINDOW_H)) continue;
    const doc = await db.collection('odds').doc(o.id).get();
    const d = doc.exists ? doc.data() : null;
    // Respeta cuotas puestas a mano ('manual') y no re-genera las que ya son del modelo.
    // Las de prueba/sembradas (sin 'fuente') SÍ se reemplazan por las del modelo.
    if (d && d.home && (d.fuente === 'manual' || d.fuente === 'modelo')) continue;
    const od = modelOdds(o.homeCode, o.awayCode);
    await db.collection('odds').doc(o.id).set({
      home: od.home, draw: od.draw, away: od.away, fuente: 'modelo',
      actualizado: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    n++;
  }
  return n;
}

// ── Envía una notificación push a un usuario (si tiene tokens) ──
async function notify(uid, title, body) {
  try {
    const us = await db.collection('users').doc(uid).get();
    const tokens = (us.exists && us.data().fcmTokens) || [];
    if (!tokens.length) return;
    const res = await admin.messaging().sendEachForMulticast({ tokens: tokens, notification: { title: title, body: body } });
    const bad = [];
    res.responses.forEach((r, i) => { if (!r.success && r.error && /not-registered|invalid-argument|invalid-registration/i.test(r.error.code || r.error.message || '')) bad.push(tokens[i]); });
    if (bad.length) await db.collection('users').doc(uid).set({ fcmTokens: admin.firestore.FieldValue.arrayRemove.apply(null, bad) }, { merge: true });
  } catch (e) { console.warn('  notify:', e && e.message); }
}

// ── Avisa a quienes SIGUEN un partido (watchMatches array-contains matchId) ──
async function notifyWatchers(matchId, title, body) {
  try {
    const snap = await db.collection('users').where('watchMatches', 'array-contains', matchId).get();
    let n = 0;
    for (const d of snap.docs) { await notify(d.id, title, body); n++; }
    return n;
  } catch (e) { console.warn('  notifyWatchers:', e && e.message); return 0; }
}

// ── Avisos por tiempo (NO dependen de football-data): "empieza pronto" y
//    "apuestas cerradas". Usa los kickoff de nuestras fixtures. Anti-repetición
//    con el mapa odds/{id}.notified. ──
const SOON_MIN = 30;
async function matchAlerts() {
  const now = Date.now();
  let sent = 0;
  for (const o of OURS) {
    const minToKo = (new Date(o.kickoff).getTime() - now) / 60000;
    if (minToKo > 70 || minToKo < -200) continue; // solo partidos cercanos
    const ref = db.collection('odds').doc(o.id);
    const doc = await ref.get();
    const nt = (doc.exists && doc.data().notified) || {};
    if (!nt.soon && minToKo > 0 && minToKo <= SOON_MIN) {
      const mins = Math.max(1, Math.round(minToKo));
      const c = await notifyWatchers(o.id, '⏰ Empieza pronto', `${o.home} vs ${o.away} comienza en ~${mins} min. ¡Última oportunidad para apostar!`);
      nt.soon = true; await ref.set({ notified: nt }, { merge: true });
      if (c) { sent += c; console.log(`  AVISO empieza-pronto ${o.id} → ${c} seguidor(es)`); }
    }
    if (!nt.closed && minToKo <= 0) {
      const c = await notifyWatchers(o.id, '🔒 Apuestas cerradas', `${o.home} vs ${o.away} ya comenzó. ¡A seguir el partido!`);
      nt.closed = true; nt.soon = true; await ref.set({ notified: nt }, { merge: true });
      if (c) { sent += c; console.log(`  AVISO cierre ${o.id} → ${c} seguidor(es)`); }
    }
  }
  return sent;
}

// ── Liquida las apuestas abiertas de un partido terminado ──
async function settle(our, ourResult) {
  const snap = await db.collection('bets').where('matchId', '==', our.id).where('status', '==', 'open').get();
  if (snap.empty) return 0;
  let n = 0;
  for (const doc of snap.docs) {
    const bet0 = doc.data();
    const won = bet0.pick === ourResult;
    const payout = won ? Math.round((bet0.stake || 0) * (bet0.odd || 0)) : 0;
    await db.runTransaction(async (tx) => {
      const bs = await tx.get(doc.ref);
      if (!bs.exists || bs.data().status !== 'open') return;
      const bet = bs.data();
      const w = bet.pick === ourResult;
      const pay = w ? Math.round((bet.stake || 0) * (bet.odd || 0)) : 0;
      const userRef = db.collection('users').doc(bet.uid);
      const us = await tx.get(userRef);
      const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
      const staked0 = (us.exists && typeof us.data().staked === 'number') ? us.data().staked : 0;
      tx.set(userRef, { prevSaldo: saldo, saldo: saldo + pay, staked: Math.max(0, staked0 - (bet.stake || 0)) }, { merge: true });
      tx.set(doc.ref, { status: w ? 'won' : 'lost', result: ourResult, payout: pay, settledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    // Notifica el resultado al apostador.
    await notify(bet0.uid, won ? '¡Ganaste! 🎉' : 'Apuesta perdida 😕',
      our.home + ' vs ' + our.away + ': ' + (won ? '+' + payout : '−' + (bet0.stake || 0)) + ' puntos');
    n++;
  }
  return n;
}

// ── Recalcula el monto apostado (suma de apuestas abiertas) de cada usuario ──
async function recomputeStaked() {
  const bets = await db.collection('bets').where('status', '==', 'open').get();
  const byUid = {};
  bets.forEach(function (d) { const b = d.data(); byUid[b.uid] = (byUid[b.uid] || 0) + (b.stake || 0); });
  const toUpdate = {};
  Object.keys(byUid).forEach(function (uid) { toUpdate[uid] = byUid[uid]; });
  // resetea a 0 los usuarios que tenían monto pero ya no tienen apuestas abiertas
  try {
    const withStaked = await db.collection('users').where('staked', '>', 0).get();
    withStaked.forEach(function (d) { if (toUpdate[d.id] == null) toUpdate[d.id] = 0; });
  } catch (e) {}
  let n = 0;
  for (const uid of Object.keys(toUpdate)) {
    await db.collection('users').doc(uid).set({ staked: toUpdate[uid] }, { merge: true });
    n++;
  }
  return n;
}

async function main() {
  if (!TOKEN) throw new Error('Falta FOOTBALL_DATA_TOKEN');
  console.log(`Agente MundialBet (football-data.org · ${COMP}) · ${new Date().toISOString()}`);

  if (DISCOVER) {
    const matches = await fdMatches();
    console.log(`football-data.org devolvió ${matches.length} partidos.\n— MODO DESCUBRIMIENTO (no escribe nada) —`);
    let ok = 0, miss = 0;
    matches.forEach((m) => {
      const h = m.homeTeam && (m.homeTeam.name || ''); const a = m.awayTeam && (m.awayTeam.name || '');
      const mm = matchOur(h, a);
      if (mm) { ok++; } else { miss++; console.log(`  SIN MAPEAR: ${h || '?'} vs ${a || '?'} (${(m.utcDate || '').slice(0, 10)} · ${m.status})`); }
    });
    console.log(`\nMapeados: ${ok} · sin mapear: ${miss}. Si hay "SIN MAPEAR", pásamelos y ajusto ALIASES.`);
    return;
  }

  if (DIAG) {
    const matches = await fdMatches();
    console.log(`football-data.org devolvió ${matches.length} partidos. — MODO DIAG (no escribe) —`);
    const byStatus = {};
    matches.forEach((m) => { byStatus[m.status] = (byStatus[m.status] || 0) + 1; });
    console.log('Estados:', JSON.stringify(byStatus));
    const sorted = matches.slice().sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));
    sorted.slice(0, 12).forEach((m) => {
      const h = m.homeTeam && (m.homeTeam.name || '?'); const a = m.awayTeam && (m.awayTeam.name || '?');
      const ft = m.score && m.score.fullTime; const sc = ft ? `${ft.home}-${ft.away}` : '—';
      const mm = matchOur(h, a);
      console.log(`  ${(m.utcDate || '').slice(0, 16)} · ${m.status} · ${h} ${sc} ${a} · ${mm ? 'mapeado→' + mm.our.id : 'SIN MAPEAR'}`);
    });
    // Volcado CRUDO del/los partido(s) FINISHED (y los que tengan algún gol) para ver dónde está el marcador.
    const interesting = matches.filter((m) => m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED');
    console.log(`\n— CRUDO (${interesting.length} FINISHED/IN_PLAY) —`);
    interesting.slice(0, 3).forEach((m) => {
      console.log('RAW ' + JSON.stringify({ id: m.id, status: m.status, minute: m.minute, score: m.score, lastUpdated: m.lastUpdated }));
    });
    // Prueba fuentes ALTERNATIVAS de marcador (gratis, sin clave) desde el runner.
    for (const src of [
      ['ESPN', 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611'],
      ['TheSportsDB', 'https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=2026-06-11&s=Soccer'],
    ]) {
      try {
        const res = await fetch(src[1], { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const j = await res.json().catch(() => ({}));
        if (src[0] === 'ESPN') {
          const evs = j.events || [];
          console.log(`\n${src[0]} status=${res.status} eventos=${evs.length}`);
          evs.slice(0, 6).forEach((e) => {
            const c = e.competitions && e.competitions[0];
            const cs = ((c && c.competitors) || []).map((x) => `${x.team && x.team.displayName}=${x.score}`).join(' vs ');
            console.log(`  ESPN ${e.status && e.status.type && e.status.type.name} | ${cs}`);
          });
        } else {
          const evs = (j.events || []).filter((e) => /World Cup/i.test(e.strLeague || ''));
          console.log(`\n${src[0]} status=${res.status} eventosWC=${evs.length}`);
          evs.slice(0, 6).forEach((e) => console.log(`  TSDB ${e.strStatus} | ${e.strHomeTeam} ${e.intHomeScore}-${e.intAwayScore} ${e.strAwayTeam}`));
        }
      } catch (e) { console.log(`\n${src[0]} ERR ${e && e.message}`); }
    }
    return;
  }

  initFirebase();

  // Estas NO dependen de football-data → corren SIEMPRE (aunque la API falle):
  const oddsN = await ensureOdds();
  if (oddsN) console.log(`Cuotas generadas: ${oddsN}.`);
  const stkN = await recomputeStaked();
  if (stkN) console.log(`Montos apostados recalculados: ${stkN} usuario(s).`);
  const alertN = await matchAlerts();
  if (alertN) console.log(`Avisos de partido (pronto/cierre) enviados: ${alertN}.`);

  // Marcadores desde ESPN (puede fallar/caer; NO debe tumbar lo de arriba):
  let matches = [];
  try {
    matches = await espnMatches();
    console.log(`ESPN devolvió ${matches.length} partidos.`);
  } catch (e) {
    console.warn('ESPN no disponible esta vez:', (e && e.message) || e);
  }

  const LIVE = ['IN_PLAY', 'PAUSED', 'SUSPENDED'];
  let settled = 0, results = 0, lives = 0;
  for (const m of matches) {
    const status = m.status || '';
    const isFinished = status === 'FINISHED';
    const isLive = LIVE.indexOf(status) !== -1;
    if (!isFinished && !isLive) continue;
    const ft = m.score && m.score.fullTime;
    const mm = matchOur(m.homeTeam.name, m.awayTeam.name);
    if (!mm) { console.log(`  SIN MAPEAR (ESPN): ${m.homeTeam.name} vs ${m.awayTeam.name} [${status}]`); continue; }
    const gh = (ft && ft.home != null) ? ft.home : 0;
    const ga = (ft && ft.away != null) ? ft.away : 0;
    // Goles en NUESTRA orientación (local/visita como en la app).
    const ghOur = mm.sameOrient ? gh : ga;
    const gaOur = mm.sameOrient ? ga : gh;
    // Goleadores en nuestra orientación: code = bandera del equipo que marcó.
    const scorers = (m.goals || []).map((g) => {
      const ourSide = mm.sameOrient ? g.side : (g.side === 'home' ? 'away' : 'home');
      return { code: ourSide === 'home' ? mm.our.homeCode : mm.our.awayCode, name: g.name, minute: g.minute, og: !!g.og, pen: !!g.pen };
    });
    if (scorers.length) console.log(`  Goles ${mm.our.id}: ` + scorers.map((s) => `${s.code} ${s.name} ${s.minute}`).join(', '));

    if (isLive) {
      const odoc = await db.collection('odds').doc(mm.our.id).get();
      const prev = odoc.exists ? odoc.data() : {};
      const scoreKey = ghOur + '-' + gaOur;
      // Marcador casi en vivo (se refresca en cada corrida del agente).
      await db.collection('odds').doc(mm.our.id).set({
        live: true, gh: ghOur, ga: gaOur, minute: (m.minute != null ? m.minute : null),
        scorers: scorers, liveAt: admin.firestore.FieldValue.serverTimestamp(), notifiedScore: scoreKey,
      }, { merge: true });
      lives++;
      // Avisa GOL a los seguidores cuando cambia el marcador (y hay al menos un gol).
      if (prev.notifiedScore !== scoreKey && (ghOur + gaOur) > 0) {
        const min = (m.minute != null) ? ` (${m.minute}')` : '';
        const c = await notifyWatchers(mm.our.id, '⚽ ¡Gol!', `${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away}${min}`);
        if (c) console.log(`  AVISO gol ${mm.our.id} (${scoreKey}) → ${c} seguidor(es)`);
      }
      console.log(`  EN VIVO ${mm.our.id} (${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away})`);
      continue;
    }

    // Terminado: guarda resultado final + liquida.
    if (!ft || ft.home == null || ft.away == null) continue;
    let apiResult = gh > ga ? 'home' : (gh < ga ? 'away' : 'draw');
    let ourResult = apiResult;
    if (!mm.sameOrient && apiResult !== 'draw') ourResult = apiResult === 'home' ? 'away' : 'home';
    const odoc = await db.collection('odds').doc(mm.our.id).get();
    const wasFinished = odoc.exists && odoc.data().finished;
    // Siempre refresca resultado + goleadores (aunque ya estuviera marcado finished).
    await db.collection('odds').doc(mm.our.id).set(Object.assign(
      { finished: true, live: false, gh: ghOur, ga: gaOur, result: ourResult, scorers: scorers },
      wasFinished ? {} : { finishedAt: admin.firestore.FieldValue.serverTimestamp() }
    ), { merge: true });
    if (!wasFinished) results++;
    // Avisa el RESULTADO FINAL a los seguidores (una sola vez).
    const nt = (odoc.exists && odoc.data().notified) || {};
    if (!nt.final) {
      const c = await notifyWatchers(mm.our.id, '🏁 Resultado final', `${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away}`);
      nt.final = true; nt.closed = true; nt.soon = true;
      await db.collection('odds').doc(mm.our.id).set({ notified: nt }, { merge: true });
      if (c) console.log(`  AVISO final ${mm.our.id} → ${c} seguidor(es)`);
    }
    const n = await settle(mm.our, ourResult);
    if (n) { settled += n; console.log(`  Liquidado ${mm.our.id} (${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away} → ${ourResult}): ${n} apuesta(s).`); }
  }

  console.log(`\nResumen: ${oddsN} cuota(s), ${lives} en vivo, ${results} resultado(s), ${settled} apuesta(s) liquidada(s).`);
}

main().catch((e) => { console.error('ERROR:', (e && e.message) || e); process.exit(1); });
