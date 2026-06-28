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
const NOTIFY_NO_TEAM  = process.argv.includes('notify-no-team');
const NOTIFY_NO_CLAIM = process.argv.includes('notify-no-claim');
const SALDO_INICIAL = 90000;

// ── Esquema de premios que paga el motor de cierre de fase (espejo de
//    window.MB_REBAL / MB_bonusBreakdown en mb-bet.jsx — mantener en sync). ──
const BONUS = {
  recargaPer10: 2000,                              // +2.000 por cada 10 apuestas
  precisionMinBets: 8,                             // mín. apuestas liquidadas para optar a precisión
  precisionTiers: [[80, 25000], [65, 12000], [50, 5000]], // %acierto → bono (solo el mayor)
  streakTiers: [[3, 2000], [5, 5000], [7, 10000]], // racha de aciertos → bono (acumulable)
  champPassPhase: 5000,                            // campeón pasó a 2ª fase ("Pasa de fase" de CHAMP_LADDER)
  // Escalera del campeón por avance en eliminatorias (espejo de CHAMP_LADDER en mb-bet.jsx).
  // Clave = stage del partido (r32/r16/qf/sf/final), valor = puntos que gana quien eligió al equipo ganador.
  champRounds: { r32: 7000, r16: 10000, qf: 15000, sf: 20000, final: 30000 },
};
// SEGURIDAD: por defecto SIMULA (no escribe saldos). Para pagar de verdad,
// define la variable de entorno BONUS_DRY_RUN=0 en el workflow del agente.
const BONUS_DRY_RUN = process.env.BONUS_DRY_RUN !== '0';

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
  // Tarjetas (amarillas/rojas), si ESPN las incluye en el scoreboard.
  const cards = ((c.details || []).filter((x) => { const t = (x.type && x.type.text) || ''; return /card|tarjeta/i.test(t); })).map((x) => {
    const tid = x.team && x.team.id;
    const side = (tid && tid === hid) ? 'home' : (tid && tid === aid) ? 'away' : null;
    const ath = (x.athletesInvolved && x.athletesInvolved[0]) || null;
    const t = (x.type && x.type.text) || '';
    return { side: side, name: ath ? (ath.displayName || ath.shortName || '') : '', minute: (x.clock && x.clock.displayValue) || '', red: /red|roja|second yellow|segunda amarilla/i.test(t) };
  }).filter((g) => g.side && g.name);
  // Detectar prórroga/penales desde la descripción del estado (ESPN: "Final - AET", "Final - Pen", etc.)
  const statusDesc = st.shortDetail || st.description || '';
  const extraTime  = /AET|after extra|overtime|\bOT\b|prorrog/i.test(statusDesc);
  const penalties  = /pen|PKs|penalty|penalties/i.test(statusDesc);
  // Ganador final (útil para penales donde el marcador queda igualado)
  const espnWinner = home.winner === true ? 'home' : away.winner === true ? 'away' : null;
  return {
    status: status,
    minute: (e.status && (e.status.displayClock || e.status.period)) || null,
    score: { fullTime: { home: num(home.score), away: num(away.score) } },
    homeTeam: { name: (home.team && (home.team.displayName || home.team.name)) || '' },
    awayTeam: { name: (away.team && (away.team.displayName || away.team.name)) || '' },
    goals: goals,
    cards: cards,
    espnId: e.id, espnHomeId: hid, espnAwayId: aid,
    extraTime: extraTime || penalties, // fue a prórroga o penales
    penalties: penalties,              // fue específicamente a penales
    espnWinner: espnWinner,            // ganador según ESPN (sirve para penales)
  };
}

// Tarjetas (amarillas/rojas/expulsiones) desde el endpoint summary de ESPN, que es
// más completo que el scoreboard (este último a veces solo trae goles). Best-effort:
// si falla, devuelve [] y no rompe nada. Devuelve [{ homeAway, name, minute, red }].
async function espnCardsFromSummary(eventId, homeId, awayId) {
  if (!eventId) return [];
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const j = await res.json().catch(() => null);
    // Las tarjetas pueden venir en keyEvents (resumen) o en commentary (jugada a jugada).
    const kev = (j && (j.keyEvents || (j.commentary) || [])) || [];
    // Id de equipo desde {id} o desde {$ref: ".../teams/83?..."}.
    const teamId = (tm) => {
      if (!tm) return null;
      if (tm.id != null) return String(tm.id);
      const ref = tm.$ref || tm.href || '';
      const mt = String(ref).match(/teams\/(\d+)/);
      return mt ? mt[1] : null;
    };
    const out = [];
    kev.forEach((x) => {
      const t = (x.type && x.type.text) || x.text || '';
      const isRed = x.redCard === true || /red card|tarjeta roja|second yellow|segunda amarilla|sent off|expuls/i.test(t);
      const isYellow = x.yellowCard === true || /yellow card|tarjeta amarilla/i.test(t);
      if (!isRed && !isYellow) return;
      const tid = teamId(x.team);
      const homeAway = (tid && tid === String(homeId)) ? 'home' : (tid && tid === String(awayId)) ? 'away' : null;
      // Jugador: athletesInvolved[0] o participants[0].athlete (según el endpoint).
      let ath = (x.athletesInvolved && x.athletesInvolved[0]) || null;
      if (!ath && x.participants && x.participants[0]) ath = x.participants[0].athlete || x.participants[0];
      const name = ath ? (ath.displayName || ath.shortName || ath.fullName || '') : '';
      const minute = (x.clock && x.clock.displayValue) || (x.time && x.time.displayValue) || '';
      if (!homeAway || !name) return;
      out.push({ homeAway: homeAway, name: name, minute: minute, red: !!isRed });
    });
    return out;
  } catch (e) { return []; }
}
async function espnMatches() {
  const d = new Date();
  const ymd = (off) => new Date(d.getTime() + off * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const url = `${ESPN_URL}?dates=${ymd(-2)}-${ymd(1)}`; // ventana anteayer→mañana (UTC); -2 para rellenar tarjetas de partidos recién terminados
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
    if (!tokens.length) { console.log(`  notify ${String(uid).slice(0, 6)}…: SIN tokens (no activó notificaciones)`); return; }
    const res = await admin.messaging().sendEachForMulticast({ tokens: tokens, notification: { title: title, body: body } });
    console.log(`  notify ${String(uid).slice(0, 6)}…: ${res.successCount}/${tokens.length} enviada(s) — "${title}"`);
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

// ── Avisa a quienes APOSTARON (apuesta abierta) en un partido, sigan o no el
//    partido con la campanita. Así el apostador recibe avisos sin tener que
//    seguir cada partido a mano. ──
async function notifyOpenBettors(matchId, title, body) {
  try {
    const snap = await db.collection('bets').where('matchId', '==', matchId).where('status', '==', 'open').get();
    const uids = new Set();
    snap.forEach((d) => { const b = d.data(); if (b.uid) uids.add(b.uid); });
    let n = 0;
    for (const uid of uids) { await notify(uid, title, body); n++; }
    return n;
  } catch (e) { console.warn('  notifyOpenBettors:', e && e.message); return 0; }
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
    // Aviso a los que APOSTARON en este partido (aunque no lo sigan con la campanita).
    if (!nt.betSoon && minToKo > 0 && minToKo <= SOON_MIN) {
      const mins = Math.max(1, Math.round(minToKo));
      const c = await notifyOpenBettors(o.id, '⏰ Tu apuesta empieza pronto', `${o.home} vs ${o.away} comienza en ~${mins} min. Aún puedes cambiarla o cancelarla.`);
      nt.betSoon = true; await ref.set({ notified: nt }, { merge: true });
      if (c) { sent += c; console.log(`  AVISO apuesta-pronto ${o.id} → ${c} apostador(es)`); }
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
// extraTime: true si el partido fue a prórroga o penales (solo fase KO)
// penWinner: 'home'|'away'|null — ganador final en caso de penales
async function settle(our, ourResult, extraTime, penWinner) {
  const snap = await db.collection('bets').where('matchId', '==', our.id).where('status', '==', 'open').get();
  if (snap.empty) return 0;
  const isKO = our.stage && our.stage !== 'Grupos';

  // En fase KO: 'draw' gana si hubo prórroga; home/away según ganador final
  const evalWin = (pick) => {
    if (isKO) {
      if (pick === 'draw') return !!extraTime;
      // Para penales el marcador queda igualado; usamos penWinner (ganador ESPN)
      if (penWinner) return pick === penWinner;
    }
    return pick === ourResult;
  };

  let n = 0;
  for (const doc of snap.docs) {
    const bet0 = doc.data();
    const won = evalWin(bet0.pick);
    const payout = won ? Math.round((bet0.stake || 0) * (bet0.odd || 0)) : 0;
    await db.runTransaction(async (tx) => {
      const bs = await tx.get(doc.ref);
      if (!bs.exists || bs.data().status !== 'open') return;
      const bet = bs.data();
      const w = evalWin(bet.pick);
      const pay = w ? Math.round((bet.stake || 0) * (bet.odd || 0)) : 0;
      const userRef = db.collection('users').doc(bet.uid);
      const us = await tx.get(userRef);
      const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
      const staked0 = (us.exists && typeof us.data().staked === 'number') ? us.data().staked : 0;
      tx.set(userRef, { prevSaldo: saldo, saldo: saldo + pay, staked: Math.max(0, staked0 - (bet.stake || 0)) }, { merge: true });
      tx.set(doc.ref, { status: w ? 'won' : 'lost', result: ourResult, payout: pay, settledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await notify(bet0.uid, won ? '¡Ganaste! 🎉' : 'Apuesta perdida 😕',
      our.home + ' vs ' + our.away + ': ' + (won ? '+' + payout : '−' + (bet0.stake || 0)) + ' puntos');
    n++;
  }
  return n;
}

// ── Borra los equipos SIN integrantes (ningún usuario con ese groupId).
//    Margen de 10 min para no borrar uno recién creado (mientras se asigna el
//    creador). Limpia también sus solicitudes de ingreso huérfanas. ──
async function cleanupEmptyGroups() {
  const [groupsSnap, usersSnap] = await Promise.all([
    db.collection('groups').get(),
    db.collection('users').get(),
  ]);
  const used = {};
  usersSnap.forEach(function (d) { const g = d.data().groupId; if (g) used[g] = true; });
  const now = Date.now();
  let n = 0;
  for (const doc of groupsSnap.docs) {
    if (used[doc.id]) continue;
    const c = doc.data().creado;
    const ms = (c && typeof c.toMillis === 'function') ? c.toMillis() : (c && c.seconds ? c.seconds * 1000 : 0);
    if (ms && (now - ms) < 10 * 60 * 1000) continue; // recién creado: dale margen
    try {
      const reqs = await db.collection('joinRequests').where('groupId', '==', doc.id).get();
      for (const r of reqs.docs) await r.ref.delete();
    } catch (e) {}
    await doc.ref.delete();
    n++;
    console.log(`  Equipo vacío borrado: "${doc.data().name}" (${doc.id})`);
  }
  return n;
}

// ── Recalcula el monto apostado (apuestas abiertas) y el total de apuestas
//    (participación) de cada usuario. Escribe staked + betsCount. ──
async function recomputeStaked() {
  const bets = await db.collection('bets').get(); // todas las apuestas
  const stakeByUid = {}, countByUid = {};
  bets.forEach(function (d) {
    const b = d.data(); if (!b.uid) return;
    countByUid[b.uid] = (countByUid[b.uid] || 0) + 1;                 // participación (todas)
    if (b.status === 'open') stakeByUid[b.uid] = (stakeByUid[b.uid] || 0) + (b.stake || 0); // en juego (abiertas)
  });
  // Usuarios a tocar: los que tienen apuestas + los que tenían staked>0 (para resetear).
  const uids = {};
  Object.keys(countByUid).forEach(function (u) { uids[u] = true; });
  try {
    const withStaked = await db.collection('users').where('staked', '>', 0).get();
    withStaked.forEach(function (d) { uids[d.id] = true; });
  } catch (e) {}
  // Nota: la RECARGA por metas de apuestas (+2.000 c/10) se paga al CERRAR cada
  // fase, no aquí. Lo hará el motor de cierre de fase (junto con la escalera del
  // campeón). Aquí solo se actualiza staked + betsCount (participación).
  let n = 0;
  for (const uid of Object.keys(uids)) {
    await db.collection('users').doc(uid).set({ staked: stakeByUid[uid] || 0, betsCount: countByUid[uid] || 0 }, { merge: true });
    n++;
  }
  return n;
}

// ── Motor de cierre de la FASE DE GRUPOS (fin de la 3ª fecha) ──
//    Paga, UNA sola vez por jugador, los premios rebalanceados:
//      · Recarga por apuestas (+2.000 c/10) · Precisión · Racha
//      · Campeón "Pasa de fase" (+5.000) si su selección clasificó.
//    Clasifican los 2 primeros de cada grupo + los 8 mejores terceros
//    (formato 2026). Idempotente vía meta/bonuses.groupsClosed y
//    users/{uid}.rewards.groupsClosed. DRY_RUN simula sin escribir. ──
async function payGroupStageBonuses() {
  // ¿Ya se pagó? (evita releer users/bets en cada corrida posterior).
  if (!BONUS_DRY_RUN) {
    const metaDone = await db.collection('meta').doc('bonuses').get();
    if (metaDone.exists && metaDone.data().groupsClosed) return 0;
  }
  // Necesitamos los 72 partidos de grupos TERMINADOS (con marcador).
  const ids = OURS.map((f) => f.id);
  const oddsSnap = await db.collection('odds').get();
  const odds = {};
  oddsSnap.forEach((d) => { odds[d.id] = d.data(); });
  const done = ids.filter((id) => odds[id] && odds[id].finished && odds[id].gh != null && odds[id].ga != null);
  if (done.length < ids.length) {
    console.log(`  Cierre de grupos: ${done.length}/${ids.length} partidos terminados — aún no se paga.`);
    return 0;
  }

  // Tabla de cada grupo + clasificados (top 2 + 8 mejores terceros).
  // Desempate: puntos → diferencia de gol → goles a favor (simplificado).
  const byGroup = {};
  OURS.forEach((f) => {
    const o = odds[f.id], g = f.group;
    byGroup[g] = byGroup[g] || {};
    const H = byGroup[g][f.homeCode] = byGroup[g][f.homeCode] || { code: f.homeCode, name: f.home, pts: 0, gf: 0, gc: 0 };
    const A = byGroup[g][f.awayCode] = byGroup[g][f.awayCode] || { code: f.awayCode, name: f.away, pts: 0, gf: 0, gc: 0 };
    const gh = o.gh | 0, ga = o.ga | 0;
    H.gf += gh; H.gc += ga; A.gf += ga; A.gc += gh;
    if (gh > ga) H.pts += 3; else if (gh < ga) A.pts += 3; else { H.pts++; A.pts++; }
  });
  const cmp = (a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf;
  const qualified = new Set();
  const thirds = [];
  Object.keys(byGroup).forEach((g) => {
    const table = Object.keys(byGroup[g]).map((k) => byGroup[g][k]).sort(cmp);
    if (table[0]) qualified.add(table[0].code);
    if (table[1]) qualified.add(table[1].code);
    if (table[2]) thirds.push(table[2]);
  });
  thirds.sort(cmp).slice(0, 8).forEach((t) => qualified.add(t.code));

  // Apuestas por usuario + kickoff por partido (para la racha cronológica).
  const koOf = {};
  OURS.forEach((f) => { koOf[f.id] = new Date(f.kickoff).getTime(); });
  const betsSnap = await db.collection('bets').get();
  const byUid = {};
  betsSnap.forEach((d) => { const b = d.data(); if (!b.uid) return; (byUid[b.uid] = byUid[b.uid] || []).push(b); });

  // Iteramos sobre TODOS los usuarios (un campeón clasificado paga aunque no haya apostado).
  const usersSnap = await db.collection('users').get();
  let paid = 0, totalPts = 0;
  for (const ud of usersSnap.docs) {
    const u = ud.data() || {};
    if (u.rewards && u.rewards.groupsClosed) continue; // ya pagado a este jugador
    const list = byUid[ud.id] || [];
    const nbets = list.length;
    const settledList = list.filter((b) => b.status === 'won' || b.status === 'lost');
    const won = settledList.filter((b) => b.status === 'won').length;
    const acc = settledList.length ? Math.round((won / settledList.length) * 100) : 0;
    const chron = settledList.slice().sort((a, b) => (koOf[a.matchId] || 0) - (koOf[b.matchId] || 0));
    let best = 0, cur = 0;
    chron.forEach((b) => { if (b.status === 'won') { cur++; if (cur > best) best = cur; } else cur = 0; });

    const recarga = Math.floor(nbets / 10) * BONUS.recargaPer10;
    let precision = 0;
    if (settledList.length >= BONUS.precisionMinBets) for (const t of BONUS.precisionTiers) { if (acc >= t[0]) { precision = t[1]; break; } }
    let streak = 0;
    BONUS.streakTiers.forEach((t) => { if (best >= t[0]) streak += t[1]; });
    const champPass = (u.championCode && qualified.has(u.championCode)) ? BONUS.champPassPhase : 0;
    const sum = recarga + precision + streak + champPass;
    const detail = { recarga: recarga, precision: precision, streak: streak, champPass: champPass, total: sum };

    if (BONUS_DRY_RUN) {
      console.log(`  [DRY] ${u.nombre || ud.id}: recarga+${recarga} precisión+${precision} racha+${streak} campeón+${champPass} = +${sum} (apuestas ${nbets}, aciertos ${acc}%, mejor racha ${best})`);
    } else {
      await db.runTransaction(async (tx) => {
        const ref = db.collection('users').doc(ud.id);
        const cur2 = await tx.get(ref);
        const data = cur2.exists ? cur2.data() : {};
        if (data.rewards && data.rewards.groupsClosed) return; // doble chequeo anti-duplicado
        const saldo = (typeof data.saldo === 'number') ? data.saldo : SALDO_INICIAL;
        tx.set(ref, {
          prevSaldo: saldo, saldo: saldo + sum,
          rewards: Object.assign({}, data.rewards, { groupsClosed: true, groups: detail, at: admin.firestore.FieldValue.serverTimestamp() }),
        }, { merge: true });
      });
      if (sum > 0) await notify(ud.id, '🎁 Premios de la fase de grupos', `Recibiste +${sum} puntos por tu actividad y precisión. ¡Sigue jugando!`);
    }
    paid++; totalPts += sum;
  }
  if (!BONUS_DRY_RUN) {
    await db.collection('meta').doc('bonuses').set({ groupsClosed: true, at: admin.firestore.FieldValue.serverTimestamp(), qualified: Array.from(qualified) }, { merge: true });
  }
  console.log(`  Cierre de grupos: ${BONUS_DRY_RUN ? 'SIMULADO (DRY_RUN, no se escribió)' : 'PAGADO'} a ${paid} jugador(es), ${totalPts} pts. Clasificados: ${qualified.size} selecciones.`);
  return paid;
}

// ── Premios del campeón por avance en la fase eliminatoria (CHAMP_LADDER) ──
//    Después de cada ronda (r32/r16/qf/sf/final), paga el bonus a quienes
//    eligieron al equipo ganador. Se llama con los códigos ISO de los equipos
//    que avanzaron (ganaron su partido de esa ronda).
//    Idempotente vía meta/bonuses.champ_{stage} y users/{uid}.rewards.champ_{stage}.
//    DRY_RUN simula sin escribir. ──
async function payChampionRoundBonus(stage, winnerCodes) {
  const bonus = BONUS.champRounds[stage];
  if (!bonus || !winnerCodes || !winnerCodes.length) return 0;
  const metaKey = `champ_${stage}`;
  if (!BONUS_DRY_RUN) {
    const meta = await db.collection('meta').doc('bonuses').get();
    if (meta.exists && meta.data()[metaKey]) return 0;
  }
  const winners = new Set(winnerCodes);
  const usersSnap = await db.collection('users').get();
  let paid = 0;
  for (const ud of usersSnap.docs) {
    const u = ud.data() || {};
    if (!u.championCode || !winners.has(u.championCode)) continue;
    if (u.rewards && u.rewards[metaKey]) continue;
    if (BONUS_DRY_RUN) {
      console.log(`  [DRY] Campeón ${stage} ${u.nombre || ud.id} (${u.championCode}): +${bonus}`);
    } else {
      await db.runTransaction(async (tx) => {
        const ref = db.collection('users').doc(ud.id);
        const cur = await tx.get(ref); const data = cur.exists ? cur.data() : {};
        if (data.rewards && data.rewards[metaKey]) return;
        const saldo = (typeof data.saldo === 'number') ? data.saldo : SALDO_INICIAL;
        tx.set(ref, {
          prevSaldo: saldo, saldo: saldo + bonus,
          rewards: Object.assign({}, data.rewards, { [metaKey]: true }),
        }, { merge: true });
      });
      await notify(ud.id, '🏆 ¡Tu selección avanza!', `Tu campeón siguió adelante → +${bonus} puntos. ¡Sigue jugando!`);
    }
    paid++;
  }
  if (!BONUS_DRY_RUN && paid > 0) {
    await db.collection('meta').doc('bonuses').set({ [metaKey]: true, [`${metaKey}At`]: admin.firestore.FieldValue.serverTimestamp(), [`${metaKey}Winners`]: Array.from(winners) }, { merge: true });
  }
  console.log(`  Campeón ${stage}: ${BONUS_DRY_RUN ? 'SIMULADO' : 'PAGADO'} a ${paid} jugador(es), +${bonus} c/u. Ganadores: ${[...winners].join(',')}`);
  return paid;
}

// ── Notificación masiva: usuarios sin equipo ──
async function sendNotifyNoTeam() {
  const snap = await db.collection('users').get();
  let sent = 0, skipped = 0;
  for (const doc of snap.docs) {
    const u = doc.data();
    if (u.groupId || u.noGroup) { skipped++; continue; }
    await notify(doc.id, '👥 ¡Únete a un equipo!', 'Aún no perteneces a ningún equipo. Entra a MundialBet y elige uno para competir en grupo durante el Mundial.');
    sent++;
  }
  console.log(`Notificación "sin equipo": ${sent} enviada(s), ${skipped} omitida(s).`);
}

// ── Notificación masiva: usuarios con puntos sin reclamar ──
async function sendNotifyNoClaim() {
  const hasR32 = OURS.some((f) => f.stage === 'r32');
  if (!hasR32) {
    console.log('No hay fixtures r32: la fase de grupos aún no cerró. No se envía notificación.');
    return;
  }
  const snap = await db.collection('users').get();
  let sent = 0, skipped = 0;
  for (const doc of snap.docs) {
    const u = doc.data();
    if (u.rewards && u.rewards.groupsClosed) { skipped++; continue; }
    await notify(doc.id, '🎁 ¡Tienes puntos sin reclamar!', 'La fase de grupos terminó. Abre MundialBet → Perfil y reclama tus premios antes de que empiece la fase eliminatoria.');
    sent++;
  }
  console.log(`Notificación "sin reclamar": ${sent} enviada(s), ${skipped} omitida(s).`);
}

async function main() {
  if (NOTIFY_NO_TEAM || NOTIFY_NO_CLAIM) {
    console.log(`Agente MundialBet · notify · ${new Date().toISOString()}`);
    initFirebase();
    if (NOTIFY_NO_TEAM)  await sendNotifyNoTeam();
    if (NOTIFY_NO_CLAIM) await sendNotifyNoClaim();
    return;
  }

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

  // Tareas PESADAS (leen colecciones completas: users/bets/groups). El cron
  // corre cada 5 min; correrlas siempre agota la cuota diaria de Firestore
  // (plan gratuito). Solo 1 vez por hora (en la corrida del minuto :00).
  // El saldo "en juego" ya se mantiene al apostar/cancelar/liquidar, así que
  // recomputeStaked es solo reconciliación; los grupos vacíos pueden esperar.
  const hourly = new Date().getUTCMinutes() < 5;
  if (hourly) {
    const stkN = await recomputeStaked();
    if (stkN) console.log(`Montos apostados recalculados: ${stkN} usuario(s).`);
    const gone = await cleanupEmptyGroups();
    if (gone) console.log(`Equipos vacíos borrados: ${gone}.`);
    // Motor de cierre de fase de grupos: bonuses de precisión/racha/recarga/campeón.
    try { await payGroupStageBonuses(); } catch (e) { console.warn('Cierre de grupos falló:', (e && e.message) || e); }
    // Premio del campeón por avance: se delega a payChampionRoundBonus(stage, winnerCodes)
    // que se llama desde el bucle de partidos terminados (ver abajo, en el bloque ESPN).
  }

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
    // Goleadores en nuestra orientación: code = bandera del equipo del JUGADOR.
    // En autogol, ESPN atribuye el gol al equipo beneficiado, pero el jugador es
    // del equipo CONTRARIO → mostramos la bandera de su selección, no la rival.
    const scorers = (m.goals || []).map((g) => {
      const og = !!g.og;
      const goalSide = mm.sameOrient ? g.side : (g.side === 'home' ? 'away' : 'home'); // a quién le cuenta el gol
      const playerSide = og ? (goalSide === 'home' ? 'away' : 'home') : goalSide;       // de qué equipo es el jugador
      return { code: playerSide === 'home' ? mm.our.homeCode : mm.our.awayCode, name: g.name, minute: g.minute, og: og, pen: !!g.pen };
    });
    // Tarjetas en nuestra orientación: code = bandera del equipo del jugador.
    let cards = (m.cards || []).map((g) => {
      const side = mm.sameOrient ? g.side : (g.side === 'home' ? 'away' : 'home');
      return { code: side === 'home' ? mm.our.homeCode : mm.our.awayCode, name: g.name, minute: g.minute, red: !!g.red };
    });
    // Si el scoreboard no trajo tarjetas, las pedimos al endpoint summary (más completo).
    // Para partidos terminados solo si todavía no las teníamos guardadas (evita re-pedir).
    if (!cards.length && (isLive || isFinished)) {
      let need = isLive;
      if (isFinished) {
        const ex = await db.collection('odds').doc(mm.our.id).get();
        need = !(ex.exists && Array.isArray(ex.data().cards) && ex.data().cards.length);
      }
      if (need) {
        const sc = await espnCardsFromSummary(m.espnId, m.espnHomeId, m.espnAwayId);
        console.log(`  summary ${mm.our.id} (event ${m.espnId}): ${sc.length} tarjeta(s)`);
        if (sc.length) cards = sc.map((g) => {
          const side = mm.sameOrient ? g.homeAway : (g.homeAway === 'home' ? 'away' : 'home');
          return { code: side === 'home' ? mm.our.homeCode : mm.our.awayCode, name: g.name, minute: g.minute, red: !!g.red };
        });
      }
    }
    if (scorers.length) console.log(`  Goles ${mm.our.id}: ` + scorers.map((s) => `${s.code} ${s.name} ${s.minute}`).join(', '));
    if (cards.length) console.log(`  Tarjetas ${mm.our.id}: ` + cards.map((c) => `${c.red ? '🟥' : '🟨'} ${c.code} ${c.name} ${c.minute}`).join(', '));
    else console.log(`  (sin tarjetas para ${mm.our.id})`);

    if (isLive) {
      const odoc = await db.collection('odds').doc(mm.our.id).get();
      const prev = odoc.exists ? odoc.data() : {};
      const scoreKey = ghOur + '-' + gaOur;
      // Marcador casi en vivo (se refresca en cada corrida del agente).
      await db.collection('odds').doc(mm.our.id).set({
        live: true, gh: ghOur, ga: gaOur, minute: (m.minute != null ? m.minute : null),
        scorers: scorers, cards: cards, liveAt: admin.firestore.FieldValue.serverTimestamp(), notifiedScore: scoreKey,
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

    // Prórroga / penales: relevante para fase KO (la apuesta 'draw' se convierte en "Prórr./Pen.")
    const isKO = mm.our.stage && mm.our.stage !== 'Grupos';
    const extraTime = isKO && !!(m.extraTime);
    // Ganador final en caso de penales (marcador queda igualado; ESPN indica el ganador)
    let penWinner = null;
    if (isKO && extraTime && ourResult === 'draw' && m.espnWinner) {
      penWinner = mm.sameOrient ? m.espnWinner : (m.espnWinner === 'home' ? 'away' : 'home');
    }

    const odoc = await db.collection('odds').doc(mm.our.id).get();
    const wasFinished = odoc.exists && odoc.data().finished;
    await db.collection('odds').doc(mm.our.id).set(Object.assign(
      { finished: true, live: false, gh: ghOur, ga: gaOur, result: ourResult, scorers: scorers, cards: cards,
        ...(isKO && { extraTime: extraTime, penWinner: penWinner || null }) },
      wasFinished ? {} : { finishedAt: admin.firestore.FieldValue.serverTimestamp() }
    ), { merge: true });
    if (!wasFinished) results++;
    const nt = (odoc.exists && odoc.data().notified) || {};
    if (!nt.final) {
      const suffix = extraTime ? (penWinner ? ' (penales)' : ' (prórroga)') : '';
      const c = await notifyWatchers(mm.our.id, '🏁 Resultado final', `${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away}${suffix}`);
      nt.final = true; nt.closed = true; nt.soon = true;
      await db.collection('odds').doc(mm.our.id).set({ notified: nt }, { merge: true });
      if (c) console.log(`  AVISO final ${mm.our.id} → ${c} seguidor(es)`);
    }
    const n = await settle(mm.our, ourResult, extraTime, penWinner);
    if (n) { settled += n; console.log(`  Liquidado ${mm.our.id} (${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away} → ${ourResult}${extraTime ? ' ET' : ''}${penWinner ? '/Pen:'+penWinner : ''}): ${n} apuesta(s).`); }

    // Premio del campeón por avance: cuando terminan TODOS los partidos de una ronda knockout,
    // paga el bonus de CHAMP_LADDER a quienes eligieron al equipo ganador de ese enfrentamiento.
    if (mm.our.stage && mm.our.stage !== 'Grupos' && BONUS.champRounds[mm.our.stage]) {
      const stageFixtures = OURS.filter((f) => f.stage === mm.our.stage);
      if (stageFixtures.length) {
        const stageDocs = await Promise.all(stageFixtures.map((f) => db.collection('odds').doc(f.id).get()));
        const allFinished = stageDocs.every((d) => d.exists && d.data().finished && d.data().result);
        if (allFinished) {
          const winnerCodes = stageFixtures.map((f, i) => {
            const res = stageDocs[i].data().result;
            return res === 'home' ? f.homeCode : f.awayCode;
          });
          try { await payChampionRoundBonus(mm.our.stage, winnerCodes); } catch (e) { console.warn(`Campeón ${mm.our.stage} falló:`, (e && e.message) || e); }
        }
      }
    }
  }

  console.log(`\nResumen: ${oddsN} cuota(s), ${lives} en vivo, ${results} resultado(s), ${settled} apuesta(s) liquidada(s).`);
}

main().catch((e) => { console.error('ERROR:', (e && e.message) || e); process.exit(1); });
