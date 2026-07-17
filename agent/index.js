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
const NOTIFY_NO_TEAM     = process.argv.includes('notify-no-team');
const NOTIFY_NO_CLAIM    = process.argv.includes('notify-no-claim');
const NOTIFY_NO_CHAMPION = process.argv.includes('notify-no-champion');
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

// Cache de un solo pedido a football-data.org por corrida del agente (el
// proceso vive unos segundos y termina, así que no hace falta invalidarlo).
let _fdRunCache = null;
async function fdMatchesOnce() {
  if (_fdRunCache === null) { try { _fdRunCache = await fdMatches(); } catch (e) { _fdRunCache = []; } }
  return _fdRunCache;
}

// Ronda según football-data.org (formato v4: LAST_16/QUARTER_FINALS/etc.) →
// nuestras claves internas. Segunda fuente para no confiar ciegamente en
// ESPN al auto-registrar un fixture nuevo — esto es lo que hubiera evitado
// el fixture fantasma "Francia vs España" que ESPN publicó sin ronda.
const FD_STAGE_MAP = {
  LAST_32: 'r32', ROUND_OF_32: 'r32', ROUND_32: 'r32',
  LAST_16: 'r16', ROUND_OF_16: 'r16', ROUND_16: 'r16',
  QUARTER_FINALS: 'qf', QUARTERFINALS: 'qf', QF: 'qf',
  SEMI_FINALS: 'sf', SEMIFINALS: 'sf', SF: 'sf',
  FINAL: 'final',
};
function stageFromFd(fdStage) { return FD_STAGE_MAP[String(fdStage || '').toUpperCase().trim()] || null; }

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
  // Marcador de la tanda de penales (campo estándar de ESPN: shootoutScore por
  // equipo). Si no viene, intenta sacarlo del texto del estado ("Pen 4-2").
  const penScore = (home.shootoutScore != null && away.shootoutScore != null)
    ? { home: num(home.shootoutScore), away: num(away.shootoutScore) }
    : (() => {
        const mtch = penalties ? statusDesc.match(/(\d+)\s*-\s*(\d+)/) : null;
        return mtch ? { home: parseInt(mtch[1], 10), away: parseInt(mtch[2], 10) } : null;
      })();
  // Detalle pateador a pateador (quién anotó y quién falló), si ESPN lo incluye
  // entre los "details" del scoreboard. Best-effort: si no viene, queda [].
  const penKicks = ((c.details || []).filter((x) => {
    const t = (x.type && x.type.text) || '';
    return x.shootout === true || /shootout|tanda de penales/i.test(t);
  })).map((x) => {
    const tid = x.team && x.team.id;
    const side = (tid && tid === hid) ? 'home' : (tid && tid === aid) ? 'away' : null;
    const ath = (x.athletesInvolved && x.athletesInvolved[0]) || null;
    return { side: side, name: ath ? (ath.displayName || ath.shortName || '') : '', scored: x.scoringPlay !== false };
  }).filter((k) => k.side && k.name);
  return {
    status: status,
    minute: (e.status && (e.status.displayClock || e.status.period)) || null,
    score: { fullTime: { home: num(home.score), away: num(away.score) } },
    homeTeam: { name: (home.team && (home.team.displayName || home.team.name)) || '' },
    awayTeam: { name: (away.team && (away.team.displayName || away.team.name)) || '' },
    goals: goals,
    cards: cards,
    espnId: e.id, espnHomeId: hid, espnAwayId: aid,
    kickoff: e.date || (c && c.date) || null,
    espnRound: (c && c.notes && c.notes[0] && (c.notes[0].headline || c.notes[0].text)) || null,
    espnSeasonType: (e.season && e.season.type && (e.season.type.slug || e.season.type.name)) || null,
    extraTime: extraTime || penalties, // fue a prórroga o penales
    penalties: penalties,              // fue específicamente a penales
    espnWinner: espnWinner,            // ganador según ESPN (sirve para penales)
    penScore: penScore,                // { home, away } goles en la tanda (orientación ESPN)
    penKicks: penKicks,                // [{ side, name, scored }] pateador a pateador (orientación ESPN)
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
// Detalle completo de la tanda de penales (incluye los FALLADOS, que el
// scoreboard compacto omite — solo trae los convertidos). El detalle completo
// vive en el campo top-level "shootout" del endpoint summary (NO en
// keyEvents/commentary): un array por equipo con sus tiros en orden.
async function espnPenKicksFromSummary(eventId, homeId, awayId) {
  if (!eventId) return [];
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const j = await res.json().catch(() => null);
    const teams = (j && j.shootout) || [];
    const out = [];
    teams.forEach((t) => {
      const tid = (t.id != null) ? String(t.id) : null;
      const homeAway = (tid && tid === String(homeId)) ? 'home' : (tid && tid === String(awayId)) ? 'away' : null;
      if (!homeAway) return;
      (t.shots || []).slice().sort((a, b) => (a.shotNumber || 0) - (b.shotNumber || 0)).forEach((s) => {
        if (!s.player) return;
        out.push({ homeAway: homeAway, name: s.player, scored: !!s.didScore });
      });
    });
    return out;
  } catch (e) { return []; }
}
async function espnMatches() {
  const d = new Date();
  const ymd = (off) => new Date(d.getTime() + off * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const url = `${ESPN_URL}?dates=${ymd(-3)}-${ymd(4)}&limit=100`; // ventana 3 días atrás → 4 adelante para capturar toda la semana KO
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('ESPN respondió ' + res.status);
  const j = await res.json().catch(() => ({}));
  return (j.events || []).map(espnToFd).filter(Boolean);
}

// Detecta el stage eliminatorio desde el texto que devuelve ESPN
// Devuelve null si el texto de ESPN no calza con ninguna ronda conocida —
// ANTES devolvía 'r16' por defecto, y eso creó un fixture fantasma real:
// ESPN a veces publica un partido futuro (TIMED) con nombres de selección ya
// resueltos especulativamente (p. ej. una final proyectada antes de que se
// jueguen las semis) cuyo espnRound/espnSeasonType no matchea ningún patrón
// de arriba. Con el default 'r16' ese partido se auto-registraba como si
// fuera un octavo de final real, y como ESPN lo sigue devolviendo cada
// corrida, se recreaba solo cada 5 min aunque se borrara a mano. Ahora, si
// no se puede determinar la ronda con certeza, el llamador simplemente NO
// registra el fixture (mejor no tener el dato que tenerlo mal).
function stageFromEspn(roundText, seasonType) {
  const t = String(roundText || seasonType || '').toLowerCase().trim();
  if (/round of 16|octavo|\br16\b/i.test(t)) return 'r16';
  if (/^quarter|^cuarto|\bqf\b/i.test(t)) return 'qf';
  if (/^semi/i.test(t)) return 'sf';
  if (/^final$|\bfinal\b/i.test(t) && !/semi/i.test(t)) return 'final';
  if (/round of 32|dieciseis|\br32\b/i.test(t)) return 'r32';
  return null;
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

// ── Consenso de apuestas (% por pick) + actividad reciente, para la UI ──
// Una sola lectura de `bets` abiertas (no por partido) y se agrupa en memoria,
// para no multiplicar lecturas de Firestore. El cliente NUNCA lee `bets` de
// otros usuarios (las reglas se lo impiden); por eso esto se calcula acá, con
// el service account, y se publica en `odds` (que el cliente ya escucha).
async function updateBetConsensus() {
  const snap = await db.collection('bets').where('status', '==', 'open').get();
  const byMatch = {};
  const withTs = [];
  snap.docs.forEach((d) => {
    const b = d.data();
    if (!b.matchId || !b.pick) return;
    const g = byMatch[b.matchId] || (byMatch[b.matchId] = { home: 0, draw: 0, away: 0 });
    g[b.pick] = (g[b.pick] || 0) + 1;
    if (b.creado && typeof b.creado.toMillis === 'function') withTs.push(b);
  });
  let writes = 0;
  for (const matchId of Object.keys(byMatch)) {
    await db.collection('odds').doc(matchId).set({ consensus: byMatch[matchId] }, { merge: true });
    writes++;
  }
  // Desafíos del partido abiertos: se suman al MISMO ticker de actividad (antes
  // solo se leía `bets`, así que las apuestas bonus nunca aparecían en la
  // franja de "Apostar" aunque sí costaran puntos reales desde el v281).
  const chSnap = await db.collection('challenge_picks').where('status', '==', 'open').get();
  const CH_QLABEL = { q1: 'gol 1T', q2: 'penales', q3: '+3 amarillas', q4: 'primer gol', q5: 'gol 2T' };
  const fxById = {};
  OURS.forEach((f) => { fxById[f.id] = f; });
  const chWithTs = [];
  chSnap.docs.forEach((d) => {
    const c = d.data();
    if (!c.ts || typeof c.ts.toMillis !== 'function') return;
    const fx = fxById[c.matchId];
    chWithTs.push({
      nombre: c.nombre || 'Jugador', pick: CH_QLABEL[c.qkey] || c.qkey,
      home: fx ? fx.home : '', away: fx ? fx.away : '', stake: c.stake, ts: c.ts.toMillis(), bonus: true,
    });
  });

  // Últimas 8 apuestas (partido + desafíos, cualquier estado en el lote leído) para el ticker.
  const matchActivity = withTs.map((b) => ({ nombre: b.nombre || 'Jugador', pick: b.pick, home: b.home, away: b.away, stake: b.stake, ts: b.creado.toMillis() }));
  const recent = matchActivity.concat(chWithTs).sort((a, b) => b.ts - a.ts).slice(0, 8);
  if (recent.length) await db.collection('meta').doc('activity').set({ recent: recent }, { merge: true });
  return writes;
}

// ── Envía una notificación push a un usuario (si tiene tokens) ──
const ICON_URL = 'https://mundialbet-club.web.app/icon-192.png';
// El badge (ícono chico de Android que agrupa notificaciones) necesita una
// silueta blanca sobre transparente — icon-192.png es una foto a color 100%
// opaca, así que Android no podía sacar ninguna silueta y mostraba un
// cuadro vacío. icon-badge.png es un trofeo blanco simple hecho para esto.
const BADGE_URL = 'https://mundialbet-club.web.app/icon-badge.png';
async function notify(uid, title, body) {
  try {
    const us = await db.collection('users').doc(uid).get();
    const tokens = (us.exists && us.data().fcmTokens) || [];
    if (!tokens.length) { console.log(`  notify ${String(uid).slice(0, 6)}…: SIN tokens (no activó notificaciones)`); return; }
    const res = await admin.messaging().sendEachForMulticast({ tokens: tokens, notification: { title: title, body: body }, webpush: { notification: { icon: ICON_URL, badge: BADGE_URL } } });
    console.log(`  notify ${String(uid).slice(0, 6)}…: ${res.successCount}/${tokens.length} enviada(s) — "${title}"`);
    const bad = [];
    res.responses.forEach((r, i) => { if (!r.success && r.error && /not-registered|invalid-argument|invalid-registration/i.test(r.error.code || r.error.message || '')) bad.push(tokens[i]); });
    if (bad.length) await db.collection('users').doc(uid).set({ fcmTokens: admin.firestore.FieldValue.arrayRemove.apply(null, bad) }, { merge: true });
  } catch (e) { console.warn('  notify:', e && e.message); }
}

// ── Avisa a TODOS los usuarios con notificaciones activas ──
async function notifyAll(title, body, icon) {
  const snap = await db.collection('users').get();
  let n = 0;
  for (const d of snap.docs) {
    const u = d.data();
    const tokens = u.fcmTokens || [];
    if (!tokens.length) continue;
    try {
      const msg = { tokens, notification: { title, body } };
      if (icon) msg.webpush = { notification: { icon } };
      const res = await admin.messaging().sendEachForMulticast(msg);
      if (res.successCount) n++;
      const bad = [];
      res.responses.forEach((r, i) => { if (!r.success && r.error && /not-registered|invalid-argument/i.test(r.error.code || r.error.message || '')) bad.push(tokens[i]); });
      if (bad.length) await db.collection('users').doc(d.id).set({ fcmTokens: admin.firestore.FieldValue.arrayRemove.apply(null, bad) }, { merge: true });
    } catch (e) { /* no crítico */ }
  }
  return n;
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
    // KO: aviso a TODOS los usuarios 60 min antes para que apuesten
    const isKO = o.stage && o.stage !== 'Grupos';
    if (isKO && !nt.koAll && minToKo > 0 && minToKo <= 60) {
      const mins = Math.max(1, Math.round(minToKo));
      const c = await notifyAll('⚽ ¿Ya apostaste?', `${o.home} vs ${o.away} (${o.stage.toUpperCase()}) empieza en ~${mins} min. ¡Última oportunidad!`, '/icons/icon-192.png');
      nt.koAll = true; await ref.set({ notified: nt }, { merge: true });
      if (c) { sent += c; console.log(`  AVISO KO-todos ${o.id} → ${c} usuarios`); }
    }
  }
  return sent;
}

// ── Liquida las apuestas abiertas de un partido terminado ──
// extraTime: true si el partido fue a prórroga o penales (solo fase KO)
// penWinner: 'home'|'away'|null — ganador final en caso de penales
// ghOur/gaOur: marcador final en orientación nuestra (para exacto ×3)
// Calcular racha actual y mejor racha de un usuario dado sus apuestas liquidadas.
function computeStreaks(bets) {
  const settled = bets.filter((b) => (b.status === 'won' || b.status === 'lost') && b.settledAt && b.settledAt.seconds > 0);
  settled.sort((a, b) => b.settledAt.seconds - a.settledAt.seconds);
  let cur = 0; for (const b of settled) { if (b.status === 'won') cur++; else break; }
  let best = 0, run = 0;
  const asc = settled.slice().reverse();
  for (const b of asc) { if (b.status === 'won') { run++; if (run > best) best = run; } else run = 0; }
  return { cur, best: Math.max(best, cur) };
}

async function settle(our, ourResult, extraTime, penWinner, ghOur, gaOur) {
  const snap = await db.collection('bets').where('matchId', '==', our.id).where('status', '==', 'open').get();
  if (snap.empty) return 0;
  const isKO = our.stage && our.stage !== 'Grupos';

  // En fase KO: 'draw' gana si hubo prórroga; home/away según ganador final
  const evalWin = (pick) => {
    if (isKO) {
      if (pick === 'draw') return !!extraTime;
      if (penWinner) return pick === penWinner;
    }
    return pick === ourResult;
  };

  let n = 0;
  for (const doc of snap.docs) {
    const bet0 = doc.data();
    const won = evalWin(bet0.pick);
    // Marcador exacto: ×3 si acertó el ganador Y el marcador exacto
    const hasExact = typeof bet0.exactHome === 'number' && typeof bet0.exactAway === 'number';
    const exactCorrect = won && hasExact && ghOur != null && gaOur != null && bet0.exactHome === ghOur && bet0.exactAway === gaOur;
    const mult = exactCorrect ? 3 : 1;
    const payout = won ? Math.round((bet0.stake || 0) * (bet0.odd || 0) * mult) : 0;

    await db.runTransaction(async (tx) => {
      const bs = await tx.get(doc.ref);
      if (!bs.exists || bs.data().status !== 'open') return;
      const bet = bs.data();
      const w = evalWin(bet.pick);
      const hasEx = typeof bet.exactHome === 'number' && typeof bet.exactAway === 'number';
      const exOk = w && hasEx && ghOur != null && gaOur != null && bet.exactHome === ghOur && bet.exactAway === gaOur;
      const userRef = db.collection('users').doc(bet.uid);
      const us = await tx.get(userRef);
      const userData = us.exists ? us.data() : {};
      const saldo = (typeof userData.saldo === 'number') ? userData.saldo : SALDO_INICIAL;
      const staked0 = (typeof userData.staked === 'number') ? userData.staked : 0;
      // Multiplicador de racha: ×1.1 al 1er acierto seguido, hasta ×2.0 en racha 7+
      const streakNow = (typeof userData.currentStreak === 'number') ? userData.currentStreak : 0;
      const SMULT = (s) => s >= 7 ? 2.0 : s >= 5 ? 1.75 : s >= 4 ? 1.5 : s >= 3 ? 1.35 : s >= 2 ? 1.2 : s >= 1 ? 1.1 : 1.0;
      const sm = w ? SMULT(streakNow) : 1.0;
      // Exacto: si la apuesta tiene exactBet separado → ×10 sobre exactBet; si no → ×3 sobre stake (retrocompat)
      const hasExactBet = (bet.exactBet || 0) > 0;
      const exMult = exOk && !hasExactBet ? 3 : 1;
      const exactBetPay = exOk && hasExactBet ? Math.round((bet.exactBet || 0) * 10) : 0;
      const pay = w ? Math.round((bet.stake || 0) * (bet.odd || 0) * exMult * sm) + exactBetPay : 0;
      const totalStaked = (bet.stake || 0) + (bet.exactBet || 0);
      // Actualizar saldo y marcar la apuesta
      tx.set(userRef, { prevSaldo: saldo, saldo: saldo + pay, staked: Math.max(0, staked0 - totalStaked) }, { merge: true });
      tx.set(doc.ref, { status: w ? 'won' : 'lost', result: ourResult, payout: pay, exactCorrect: exOk, streakMult: sm, settledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });

    // Actualizar currentStreak y bestStreak en el usuario (para badge 🔥 y premios de racha)
    try {
      const allBets = await db.collection('bets').where('uid', '==', bet0.uid).get();
      const betsData = allBets.docs.map((d) => d.data());
      // Incluye la apuesta que acaba de liquidarse con timestamp real
      const nowSec = Math.floor(Date.now() / 1000);
      betsData.forEach((b) => { if (b.matchId === our.id && (!b.settledAt || !b.settledAt.seconds)) { b.status = won ? 'won' : 'lost'; b.settledAt = { seconds: nowSec }; } });
      const { cur, best } = computeStreaks(betsData);
      const prevBest = (typeof userData.bestStreak === 'number') ? userData.bestStreak : 0;
      await db.collection('users').doc(bet0.uid).set({ currentStreak: cur, bestStreak: Math.max(best, prevBest) }, { merge: true });
    } catch (e) { /* no crítico */ }

    const notifTitle = exactCorrect ? '🎯 ¡Marcador exacto! 🎉' : (won ? '¡Ganaste! 🎉' : 'Apuesta perdida 😕');
    await notify(bet0.uid, notifTitle,
      our.home + ' vs ' + our.away + ': ' + (won ? '+' + payout + (exactCorrect ? ' (¡exacto! ×3)' : '') + (payout > Math.round((bet0.stake || 0) * (bet0.odd || 0)) ? ' (🔥 racha bonus)' : '') : '−' + (bet0.stake || 0)) + ' puntos');
    n++;
  }
  return n;
}

// ── ¿Acertó este pick en este partido? null = el partido aún no terminó.
// Lee del doc `odds` (ya tiene finished/result/extraTime/penWinner), así
// no depende de la fixture estática ni de los parámetros de settle().
async function legWon(matchId, pick, cache) {
  if (!(matchId in cache)) {
    const s = await db.collection('odds').doc(matchId).get();
    cache[matchId] = s.exists ? s.data() : null;
  }
  const o = cache[matchId];
  if (!o || !o.finished) return null;
  if (o.extraTime) {
    if (pick === 'draw') return !!o.extraTime;
    if (o.penWinner) return pick === o.penWinner;
  }
  return pick === o.result;
}

// ── Liquida combinadas (parlay): gana solo si TODOS los picks acertaron.
// Solo se liquida cuando los partidos de TODAS las patas ya terminaron.
async function settleParlays() {
  const snap = await db.collection('parlays').where('status', '==', 'open').get();
  if (snap.empty) return 0;
  const oddsCache = {};
  let n = 0;
  for (const doc of snap.docs) {
    const p = doc.data();
    const legs = p.legs || [];
    if (!legs.length) continue;
    const results = [];
    let allResolved = true;
    for (const leg of legs) {
      const w = await legWon(leg.matchId, leg.pick, oddsCache);
      if (w == null) { allResolved = false; break; }
      results.push(w);
    }
    if (!allResolved) continue;
    const won = results.every(Boolean);
    const payout = won ? Math.round((p.stake || 0) * (p.combinedOdd || 0)) : 0;
    await db.runTransaction(async (tx) => {
      const ps = await tx.get(doc.ref);
      if (!ps.exists || ps.data().status !== 'open') return;
      const userRef = db.collection('users').doc(p.uid);
      const us = await tx.get(userRef);
      const userData = us.exists ? us.data() : {};
      const saldo = (typeof userData.saldo === 'number') ? userData.saldo : SALDO_INICIAL;
      const staked0 = (typeof userData.staked === 'number') ? userData.staked : 0;
      tx.set(userRef, { saldo: saldo + payout, staked: Math.max(0, staked0 - (p.stake || 0)) }, { merge: true });
      tx.set(doc.ref, { status: won ? 'won' : 'lost', payout: payout, settledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    try {
      await notify(p.uid, won ? '¡Ganaste tu combinada! 🎉' : 'Combinada perdida 😕',
        legs.length + ' partidos: ' + (won ? '+' + payout : '−' + (p.stake || 0)) + ' puntos');
    } catch (e) { /* no crítico */ }
    n++;
  }
  return n;
}

// ── Liquida los desafíos por partido (challenge_picks) ──────
// Q1: ¿Habrá gol en el primer tiempo? (bool) — solo KO
// Q2: ¿Irá a penales? (bool) — solo KO
// Q3: ¿Más de 3 tarjetas amarillas? (bool) — todos los partidos
// Q4: ¿Quién marca primero? (string: 'home'/'away'/'none') — todos los partidos
// POINTS KO: r32/r16→1500  qf/sf→2500  final→4000  | Group/extra: 500
const CHALLENGE_PTS = { r32: 1500, r16: 1500, qf: 2500, sf: 2500, final: 4000 };
const CHALLENGE_PTS_EXTRA = 500; // para q3/q4 en grupos; para KO es mitad del KO pts
async function settleChallengePicks(our, oddsData) {
  try {
    const isKOStage = ['r32', 'r16', 'qf', 'sf', 'final'].includes(our.stage);
    const ptsKO = CHALLENGE_PTS[our.stage] || 1500;
    const ptsExtra = isKOStage ? Math.round(ptsKO * 0.5) : CHALLENGE_PTS_EXTRA;
    // { qkey → { correct: bool|string, pts: number } }
    const results = {};
    if (isKOStage && typeof oddsData.htGoal === 'boolean') results.q1 = { correct: oddsData.htGoal, pts: ptsKO };
    if (isKOStage && typeof oddsData.penalties === 'boolean') results.q2 = { correct: oddsData.penalties, pts: ptsKO };
    if (typeof oddsData.yellowCardsOver3 === 'boolean') results.q3 = { correct: oddsData.yellowCardsOver3, pts: ptsExtra };
    if (typeof oddsData.firstGoalSide === 'string') results.q4 = { correct: oddsData.firstGoalSide, pts: ptsExtra };
    if (isKOStage && typeof oddsData.ftGoal === 'boolean') results.q5 = { correct: oddsData.ftGoal, pts: ptsKO };
    if (!Object.keys(results).length) return;

    for (const qkey of Object.keys(results)) {
      const { correct, pts } = results[qkey];
      const snap = await db.collection('challenge_picks')
        .where('matchId', '==', our.id).where('qkey', '==', qkey).where('status', '==', 'open').get();
      if (snap.empty) continue;
      for (const doc of snap.docs) {
        const pick = doc.data();
        // stake > 0: apuesta real (cobrada al elegir en mb-firebase.js saveChallengePick).
        // stake == 0/ausente: pick viejo de antes de v281, era gratis - se paga como antes.
        const stake = typeof pick.stake === 'number' ? pick.stake : 0;
        // bool questions: 'yes'/'no' vs bool; string questions: direct comparison
        const won = typeof correct === 'boolean' ? (pick.pick === 'yes') === correct : pick.pick === correct;
        const payout = won ? (stake > 0 ? stake * 2 : pts) : 0;
        const userRef = db.collection('users').doc(pick.uid);
        await db.runTransaction(async (tx) => {
          const cp = await tx.get(doc.ref);
          if (!cp.exists || cp.data().status !== 'open') return;
          const us = await tx.get(userRef);
          const ud = us.exists ? us.data() : {};
          const staked0 = (typeof ud.staked === 'number') ? ud.staked : 0;
          // El saldo NO se acredita acá: el desafío queda "ganado, por reclamar"
          // (claimed:false) y el usuario lo reclama con un botón en la app
          // (claimChallengeWin en mb-firebase.js) - mismo patrón que ClaimBonusBanner.
          // El stake sí sale de "en juego" apenas se liquida, gane o pierda.
          tx.set(userRef, { staked: Math.max(0, staked0 - stake) }, { merge: true });
          tx.set(doc.ref, { status: won ? 'won' : 'lost', payout: payout, claimed: false, settledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });
        if (won) await notify(pick.uid, '🎯 ¡Desafío acertado!', `${our.home} vs ${our.away}: +${payout} puntos por reclamar en la app.`);
      }
      console.log(`  Desafíos ${qkey} liquidados (${our.id}): ${snap.size}`);
    }
  } catch (e) { console.warn('  settleChallengePicks:', e && e.message); }
}

// ── Barrida de rescate de desafíos huérfanos ────────────────
// settleChallengePicks solo corre para partidos dentro de la ventana de ESPN
// (anteayer→mañana). Un pick cuyo partido terminó antes de eso —o antes de que
// existiera el código que calcula htGoal/ftGoal/etc.— quedaba 'open' PARA
// SIEMPRE: el usuario nunca veía si acertó ni podía reclamar. Esta barrida
// toma todos los picks abiertos, y si su partido ya terminó, reconstruye los
// campos que falten desde los datos guardados en odds (scorers/cards/gh/ga)
// y liquida. Barata: solo lee picks abiertos + un odds doc por partido.
async function sweepOpenChallengePicks() {
  try {
    // Diagnóstico: estado real de la colección (barato: pocos docs)
    const all = await db.collection('challenge_picks').get();
    const cnt = { open: 0, won: 0, lost: 0, otros: 0, porReclamar: 0 };
    all.docs.forEach((d) => {
      const p = d.data();
      if (p.status === 'open') cnt.open++;
      else if (p.status === 'won') { cnt.won++; if (!p.claimed) cnt.porReclamar++; }
      else if (p.status === 'lost') cnt.lost++;
      else cnt.otros++;
    });
    console.log(`Desafíos: ${all.size} pick(s) → open:${cnt.open} won:${cnt.won} (sin reclamar:${cnt.porReclamar}) lost:${cnt.lost} otros:${cnt.otros}`);
    const openIds = {};
    all.docs.forEach((d) => { const p = d.data(); if (p.status === 'open') openIds[p.matchId] = (openIds[p.matchId] || 0) + 1; });
    if (Object.keys(openIds).length) console.log('  Abiertos por partido: ' + Object.keys(openIds).map((k) => `${k}(${openIds[k]})`).join(' '));
    const snap = await db.collection('challenge_picks').where('status', '==', 'open').get();
    if (snap.empty) return;
    const matchIds = Array.from(new Set(snap.docs.map((d) => d.data().matchId).filter(Boolean)));
    for (const mid of matchIds) {
      const our = OURS.find((f) => f.id === mid);
      if (!our) continue;
      const odoc = await db.collection('odds').doc(mid).get();
      if (!odoc.exists) continue;
      const od = odoc.data();
      if (!od.finished) continue; // aún en juego o sin resultado: nada que hacer
      const gh = typeof od.gh === 'number' ? od.gh : null;
      const ga = typeof od.ga === 'number' ? od.ga : null;
      const scorers = Array.isArray(od.scorers) ? od.scorers : null;
      const cards = Array.isArray(od.cards) ? od.cards : null;
      const patch = {};
      const isKOMatch = our.stage && our.stage !== 'Grupos';
      const minBase = (s) => parseInt(String(s.minute || '').split(':')[0].split('+')[0], 10);
      if (isKOMatch && typeof od.penalties === 'undefined') patch.penalties = !!(od.extraTime && od.penWinner);
      if (isKOMatch && typeof od.htGoal === 'undefined' && gh != null && ga != null) {
        if (gh + ga === 0) patch.htGoal = false;
        else if (scorers && scorers.length) patch.htGoal = scorers.some((s) => { const b = minBase(s); return !isNaN(b) && b <= 45; });
      }
      if (isKOMatch && typeof od.ftGoal === 'undefined' && gh != null && ga != null) {
        if (gh + ga === 0) patch.ftGoal = false;
        else if (scorers && scorers.length) patch.ftGoal = scorers.some((s) => { const b = minBase(s); return !isNaN(b) && b > 45; });
      }
      if (typeof od.yellowCardsOver3 === 'undefined' && cards) {
        const yc = cards.filter((c) => !c.red).length;
        patch.yellowCardsOver3 = yc > 3; patch.yellowCardsTotal = yc;
      }
      if (typeof od.firstGoalSide === 'undefined' && gh != null && ga != null) {
        if (gh + ga === 0) patch.firstGoalSide = 'none';
        else if (scorers && scorers.length) patch.firstGoalSide = scorers[0].code === our.homeCode ? 'home' : 'away';
      }
      if (Object.keys(patch).length) {
        await db.collection('odds').doc(mid).set(patch, { merge: true });
        Object.assign(od, patch);
      }
      console.log(`  Barrida desafíos: liquidando picks huérfanos de ${mid} (${our.home} vs ${our.away})`);
      await settleChallengePicks(our, od);
    }
  } catch (e) { console.warn('sweepOpenChallengePicks:', e && e.message); }
}

// ── Notifica a usuarios sin pronóstico del campeón ──────────
async function sendNotifyNoChampion() {
  const snap = await db.collection('users').get();
  let sent = 0, skipped = 0;
  for (const doc of snap.docs) {
    const u = doc.data();
    if (u.championCode) { skipped++; continue; }
    await notify(doc.id, '🏆 ¿Quién será el Campeón?', 'Aún no has elegido tu selección campeona. Entra a MundialBet → Inicio y hazlo antes de que arranquen los cuartos de final.');
    sent++;
  }
  console.log(`Notificación "sin campeón": ${sent} enviada(s), ${skipped} ya eligieron.`);
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
  const parlays = await db.collection('parlays').get(); // todas las combinadas
  const stakeByUid = {}, countByUid = {};
  bets.forEach(function (d) {
    const b = d.data(); if (!b.uid) return;
    countByUid[b.uid] = (countByUid[b.uid] || 0) + 1;                 // participación (todas)
    if (b.status === 'open') stakeByUid[b.uid] = (stakeByUid[b.uid] || 0) + (b.stake || 0); // en juego (abiertas)
  });
  parlays.forEach(function (d) {
    const p = d.data(); if (!p.uid) return;
    countByUid[p.uid] = (countByUid[p.uid] || 0) + 1;
    if (p.status === 'open') stakeByUid[p.uid] = (stakeByUid[p.uid] || 0) + (p.stake || 0);
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
// IMPORTANTE: este bono ya NO se acredita solo. Deja el premio "por reclamar"
// en users/{uid}.champClaim_{stage} = { pts, claimed:false } — el jugador lo
// suma a su saldo con un botón en la app (claimChampBonus en mb-firebase.js),
// mismo patrón que los desafíos del partido. (Las rondas r32/r16 ya se habían
// pagado automáticamente antes de este cambio — quedan como estaban, ese
// dinero ya es real y no se revierte; desde qf en adelante se reclama.)
async function payChampionRoundBonus(stage, winnerCodes) {
  const bonus = BONUS.champRounds[stage];
  if (!bonus || !winnerCodes || !winnerCodes.length) return 0;
  const metaKey = `champ_${stage}`;
  const claimField = `champClaim_${stage}`;
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
      console.log(`  [DRY] Campeón ${stage} ${u.nombre || ud.id} (${u.championCode}): +${bonus} (por reclamar)`);
    } else {
      await db.collection('users').doc(ud.id).set({
        [claimField]: { pts: bonus, claimed: false, ts: admin.firestore.FieldValue.serverTimestamp() },
        rewards: Object.assign({}, u.rewards, { [metaKey]: true }),
      }, { merge: true });
      await notify(ud.id, '🏆 ¡Tu selección avanza!', `Tu campeón siguió adelante → +${bonus} puntos por reclamar en la app.`);
    }
    paid++;
  }
  if (!BONUS_DRY_RUN && paid > 0) {
    await db.collection('meta').doc('bonuses').set({ [metaKey]: true, [`${metaKey}At`]: admin.firestore.FieldValue.serverTimestamp(), [`${metaKey}Winners`]: Array.from(winners) }, { merge: true });
  }
  console.log(`  Campeón ${stage}: ${BONUS_DRY_RUN ? 'SIMULADO' : 'POR RECLAMAR'} a ${paid} jugador(es), +${bonus} c/u. Ganadores: ${[...winners].join(',')}`);
  return paid;
}

// ── Rescate del premio "campeón por ronda" para rondas ya cerradas ─────────
// payChampionRoundBonus() solo se llama desde el bucle live de ESPN, así que
// una ronda que terminó fuera de la ventana de ESPN (o antes de que el agente
// alcanzara a verla completa) se queda sin pagar para siempre. Esta barrida
// no depende de ESPN: recorre cada ronda knockout, mira los odds guardados en
// Firestore, y si TODOS sus partidos ya están 'finished' y el bono de esa
// ronda no se pagó (meta/bonuses.champ_{stage}), lo paga ahora.
async function sweepChampionRoundBonuses() {
  try {
    const stages = ['r32', 'r16', 'qf', 'sf', 'final'];
    const meta = await db.collection('meta').doc('bonuses').get();
    const metaData = meta.exists ? meta.data() : {};
    for (const stage of stages) {
      const stageFixtures = OURS.filter((f) => f.stage === stage);
      if (metaData[`champ_${stage}`]) { console.log(`  Barrida campeón ${stage}: ya pagado.`); continue; }
      if (!stageFixtures.length) { console.log(`  Barrida campeón ${stage}: sin fixtures cargados.`); continue; }
      const stageDocs = await Promise.all(stageFixtures.map((f) => db.collection('odds').doc(f.id).get()));
      const allFinished = stageDocs.every((d) => d.exists && d.data().finished && d.data().result);
      console.log(`  Barrida campeón ${stage}: ${stageFixtures.length} partido(s), finished=${stageDocs.filter((d) => d.exists && d.data().finished).length}, allFinished=${allFinished}`);
      if (!allFinished) continue;
      const winnerCodes = stageFixtures.map((f, i) => {
        const res = stageDocs[i].data().result;
        return res === 'home' ? f.homeCode : f.awayCode;
      }).filter(Boolean);
      console.log(`  Barrida campeón: ronda ${stage} completa y sin pagar → liquidando`);
      const paid = await payChampionRoundBonus(stage, winnerCodes);
      if (stage === 'qf' && paid >= 0) {
        try { await paySemiBonus(winnerCodes); } catch (e) { console.warn('Semi bonus (barrida):', e && e.message); }
      }
      if (stage === 'final' && paid >= 0) {
        try { await settleScorerBets(); } catch (e) { console.warn('Goleador bonus (barrida):', e && e.message); }
      }
    }
  } catch (e) { console.warn('sweepChampionRoundBonuses:', e && e.message); }
}

// ── Premio semifinalistas (+500 pts por cada uno que llegó a semis) ──
// Se llama cuando TODOS los QF terminaron (winnerCodes = 4 clasificados a semis).
async function paySemiBonus(winnerCodes) {
  if (!winnerCodes || winnerCodes.length !== 4) return 0;
  const metaKey = 'semi_picks_paid';
  const meta = await db.collection('meta').doc('bonuses').get();
  if (meta.exists && meta.data()[metaKey]) { console.log('  Semis: ya pagados anteriormente.'); return 0; }
  const winners = new Set(winnerCodes);
  const PTS = 500;
  // El cliente guarda el pick en users/{uid}.semiPick.teams (no en una colección
  // aparte — ver saveSemiPick en mb-firebase.js, cambiado en el v269 para evitar
  // permission-denied). Antes esta función leía semi_picks/ y nunca pagaba nada.
  const snap = await db.collection('users').where('semiPick.teams', '!=', null).get();
  let paid = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const teams = Array.isArray(d.semiPick && d.semiPick.teams) ? d.semiPick.teams : [];
    const correct = teams.filter((c) => winners.has(c)).length;
    if (!correct) continue;
    const bonus = correct * PTS;
    await db.runTransaction(async (tx) => {
      const uRef = db.collection('users').doc(doc.id);
      const us = await tx.get(uRef);
      const ud = us.exists ? us.data() : {};
      const saldo = (typeof ud.saldo === 'number') ? ud.saldo : SALDO_INICIAL;
      tx.set(uRef, { prevSaldo: saldo, saldo: saldo + bonus }, { merge: true });
    });
    await notify(doc.id, `🎯 ¡Acertaste ${correct} semifinalista${correct > 1 ? 's' : ''}!`, `+${bonus} puntos. Los 4 clasificados: ${[...winners].join(', ')}`);
    paid++;
  }
  await db.collection('meta').doc('bonuses').set({ [metaKey]: true, semiWinners: Array.from(winners), [`${metaKey}At`]: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  console.log(`  Semis: pagado a ${paid} usuarios (${PTS} pts × aciertos).`);
  return paid;
}

// ── Apuesta al goleador del torneo (staked, ver placeScorerBet en mb-firebase.js) ──
// Se liquida cuando TODOS los partidos de la FINAL terminan: suma goles de todo
// el torneo por jugador (odds/{id}.scorers, que ya escribe settleFixture arriba),
// determina el/los máximo(s) goleador(es) y paga ×20 el monto apostado a quienes
// eligieron a alguno de ellos. El pick vive en users/{uid}.scorerBet (mismo patrón
// que semiPick: un solo doc, sin colección aparte ni reglas nuevas).
// ESPN entrega el nombre del goleador (odds.scorers[].name) y a veces no
// coincide letra por letra con el de la plantilla (players.js) que el
// usuario eligió al apostar - p. ej. ESPN "Messi" vs plantilla "Lionel
// Messi". Match tolerante (igual una copia en mb-scorer.jsx para el cliente).
function normPlayerName(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function playerLastToken(s) {
  const parts = normPlayerName(s).split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || '';
}
function playerNamesMatch(a, b) {
  const na = normPlayerName(a), nb = normPlayerName(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const la = playerLastToken(a), lb = playerLastToken(b);
  return la.length > 2 && la === lb;
}

async function settleScorerBets() {
  const metaKey = 'scorer_bets_paid';
  const meta = await db.collection('meta').doc('bonuses').get();
  if (meta.exists && meta.data()[metaKey]) return 0;

  const finalFx = OURS.filter((f) => f.stage === 'final');
  if (!finalFx.length) return 0;
  const finalDocs = await Promise.all(finalFx.map((f) => db.collection('odds').doc(f.id).get()));
  const finalDone = finalDocs.every((d) => d.exists && d.data().finished);
  if (!finalDone) return 0;

  const MULT = 20;
  const oddsSnap = await db.collection('odds').get();
  const tally = {};
  oddsSnap.docs.forEach((d) => {
    (d.data().scorers || []).forEach((s) => {
      if (!s || !s.name || s.og) return; // los autogoles no cuentan para el goleador
      tally[s.name] = (tally[s.name] || 0) + 1;
    });
  });
  const maxGoals = Object.values(tally).reduce((a, b) => Math.max(a, b), 0);
  if (!maxGoals) { console.log('  Goleador: sin goles registrados, no se liquida.'); return 0; }
  const topScorers = Object.keys(tally).filter((n) => tally[n] === maxGoals);

  const usersSnap = await db.collection('users').where('scorerBet.status', '==', 'open').get();
  let paid = 0;
  for (const doc of usersSnap.docs) {
    const bet = doc.data().scorerBet;
    if (!bet) continue;
    const won = topScorers.some((n) => playerNamesMatch(bet.player, n));
    const payout = won ? (bet.stake || 0) * MULT : 0;
    await db.runTransaction(async (tx) => {
      const uRef = db.collection('users').doc(doc.id);
      const us = await tx.get(uRef);
      const ud = us.exists ? us.data() : {};
      const staked0 = (typeof ud.staked === 'number') ? ud.staked : 0;
      // Igual que en settleChallengePicks: el saldo no se acredita acá, queda
      // "por reclamar" (claimScorerWin en mb-firebase.js / botón en la app).
      tx.set(uRef, {
        staked: Math.max(0, staked0 - (bet.stake || 0)),
        scorerBet: Object.assign({}, bet, { status: won ? 'won' : 'lost', payout: payout, claimed: false, resultGoals: maxGoals }),
      }, { merge: true });
    });
    if (won) await notify(doc.id, `⚽ ¡${bet.player} fue el goleador del torneo!`, `Acertaste con ${maxGoals} goles → +${payout} puntos por reclamar en la app.`);
    paid++;
  }
  await db.collection('meta').doc('bonuses').set({ [metaKey]: true, scorerTop: Array.from(topScorers), scorerGoals: maxGoals, [`${metaKey}At`]: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  console.log(`  Goleador: liquidado a ${paid} apuesta(s). Top: ${[...topScorers].join(', ')} (${maxGoals} goles).`);
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
  if (NOTIFY_NO_TEAM || NOTIFY_NO_CLAIM || NOTIFY_NO_CHAMPION) {
    console.log(`Agente MundialBet · notify · ${new Date().toISOString()}`);
    initFirebase();
    if (NOTIFY_NO_TEAM)      await sendNotifyNoTeam();
    if (NOTIFY_NO_CLAIM)     await sendNotifyNoClaim();
    if (NOTIFY_NO_CHAMPION)  await sendNotifyNoChampion();
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

  // Migración: corregir fixtures con stage="qf" cuyo kickoff es anterior al 9-Jul-2026 (primer QF real)
  try {
    const QF_EARLIEST = new Date('2026-07-09T00:00:00Z').getTime();
    const wrongQF = await db.collection('fixtures').where('stage', '==', 'qf').get();
    const fixes = [];
    for (const doc of wrongQF.docs) {
      const f = doc.data();
      if (f.kickoff && new Date(f.kickoff).getTime() < QF_EARLIEST) {
        console.log(`Corrigiendo stage qf→r16: ${doc.id} (kickoff ${f.kickoff})`);
        fixes.push(db.collection('fixtures').doc(doc.id).update({ stage: 'r16' }));
      }
    }
    if (fixes.length) await Promise.all(fixes);
  } catch (e) { console.warn('migration stage fix:', e && e.message); }

  // Seed QF 2026 + corrección de kickoffs reales (horarios confirmados FIFA)
  try {
    const QF_SEED = [
      { id: 'dyn_fr_ma',     homeCode: 'fr',     awayCode: 'ma',     home: 'Francia',    away: 'Marruecos',  kickoff: '2026-07-09T20:00:00Z', stage: 'qf' },
      { id: 'dyn_be_es',     homeCode: 'be',     awayCode: 'es',     home: 'Bélgica',    away: 'España',     kickoff: '2026-07-10T19:00:00Z', stage: 'qf' },
      { id: 'dyn_gb-eng_no', homeCode: 'gb-eng', awayCode: 'no',     home: 'Inglaterra', away: 'Noruega',    kickoff: '2026-07-11T21:00:00Z', stage: 'qf' },
      { id: 'dyn_ar_ch',     homeCode: 'ar',     awayCode: 'ch',     home: 'Argentina',  away: 'Suiza',      kickoff: '2026-07-12T01:00:00Z', stage: 'qf' },
    ];
    for (const qf of QF_SEED) {
      const ref = db.collection('fixtures').doc(qf.id);
      const snap = await ref.get();
      if (!snap.exists) {
        console.log(`Seed QF: ${qf.id} (${qf.home} vs ${qf.away})`);
        await ref.set(qf);
        await db.collection('odds').doc(qf.id).set({ _home: qf.home, _away: qf.away, _homeCode: qf.homeCode, _awayCode: qf.awayCode, _kickoff: qf.kickoff, _stage: 'qf' }, { merge: true });
      } else {
        // Forzar stage=qf + kickoff correcto para fixtures QF que fueron auto-registrados con stage='r16'
        const d = snap.data();
        const needsFix = d.kickoff !== qf.kickoff || d.stage !== 'qf' || d.homeCode !== qf.homeCode;
        if (needsFix) {
          console.log(`Corrigiendo QF fixture: ${qf.id} stage=${d.stage}→qf kickoff=${d.kickoff}→${qf.kickoff}`);
          await ref.update({ kickoff: qf.kickoff, stage: 'qf', home: qf.home, away: qf.away, homeCode: qf.homeCode, awayCode: qf.awayCode });
          await db.collection('odds').doc(qf.id).set({ _kickoff: qf.kickoff, _stage: 'qf', _home: qf.home, _away: qf.away, _homeCode: qf.homeCode, _awayCode: qf.awayCode }, { merge: true });
        }
      }
    }
  } catch (e) { console.warn('seed QF:', e && e.message); }

  // Seed SF Francia-España (confirmado con fuentes externas: 14-jul, 15:00 ET,
  // Dallas — ver commit del fix del "fixture fantasma"). ESPN nunca reporta
  // espnRound/espnSeasonType para este partido específico (siempre llegan
  // null), así que el auto-registro normal (stageFromEspn + cruce con
  // football-data.org) nunca puede confirmarlo solo y lo descarta — quedaba
  // eternamente sin registrar aunque sea un partido real y ya confirmado (a
  // diferencia de cuando lo vimos por primera vez, antes de que Francia y
  // España ganaran sus cuartos, que ahí sí era una proyección especulativa).
  // La otra semifinal (Inglaterra/Noruega vs Argentina/Suiza) sí llega con
  // ronda reconocible desde ESPN, así que no necesita este seed manual.
  try {
    const SF_ID = 'dyn_es_fr';
    const SF_SEED = { id: SF_ID, homeCode: 'fr', awayCode: 'es', home: 'Francia', away: 'España', kickoff: '2026-07-14T19:00:00Z', stage: 'sf' };
    const ref = db.collection('fixtures').doc(SF_ID);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`Seed SF: ${SF_ID} (${SF_SEED.home} vs ${SF_SEED.away})`);
      await ref.set(SF_SEED);
      await db.collection('odds').doc(SF_ID).set({ _home: SF_SEED.home, _away: SF_SEED.away, _homeCode: SF_SEED.homeCode, _awayCode: SF_SEED.awayCode, _kickoff: SF_SEED.kickoff, _stage: 'sf' }, { merge: true });
    } else {
      const d = snap.data();
      if (d.stage !== 'sf' || d.kickoff !== SF_SEED.kickoff) {
        console.log(`Corrigiendo SF fixture: ${SF_ID} stage=${d.stage}→sf kickoff=${d.kickoff}→${SF_SEED.kickoff}`);
        await ref.update({ kickoff: SF_SEED.kickoff, stage: 'sf', home: SF_SEED.home, away: SF_SEED.away, homeCode: SF_SEED.homeCode, awayCode: SF_SEED.awayCode });
        await db.collection('odds').doc(SF_ID).set({ _kickoff: SF_SEED.kickoff, _stage: 'sf', _home: SF_SEED.home, _away: SF_SEED.away, _homeCode: SF_SEED.homeCode, _awayCode: SF_SEED.awayCode }, { merge: true });
      }
    }
  } catch (e) { console.warn('seed SF:', e && e.message); }

  // Corrige nombres en inglés que quedaron sin traducir en fixtures
  // auto-registrados directo desde ESPN (a diferencia de los sembrados a
  // mano como QF_SEED/SF_SEED, que ya usan nombres en español). Encontrado:
  // dyn_ar_gb-eng (semifinal Inglaterra vs Argentina) tenía home="England".
  const NAME_ES = { England: 'Inglaterra', Spain: 'España', France: 'Francia', Morocco: 'Marruecos', Belgium: 'Bélgica', Norway: 'Noruega', Switzerland: 'Suiza', Argentina: 'Argentina' };
  try {
    const sfFixtures = await db.collection('fixtures').where('stage', '==', 'sf').get();
    for (const d of sfFixtures.docs) {
      const f = d.data();
      const homeEs = NAME_ES[f.home], awayEs = NAME_ES[f.away];
      const patch = {};
      if (homeEs && homeEs !== f.home) patch.home = homeEs;
      if (awayEs && awayEs !== f.away) patch.away = awayEs;
      if (Object.keys(patch).length) {
        console.log(`  Corrigiendo nombres: ${d.id} ${JSON.stringify(patch)}`);
        await db.collection('fixtures').doc(d.id).update(patch);
        await db.collection('odds').doc(d.id).set({ _home: homeEs || f.home, _away: awayEs || f.away }, { merge: true });
      }
    }
  } catch (e) { console.warn('  fix nombres SF:', e && e.message); }

  // Diagnóstico: usuario reporta "España" repetido 3 veces en el cuadro de
  // semifinales. fixtures/{stage=sf} da 2 docs limpios (confirmado) — el
  // cliente arma su lista de dynFixtures desde ODDS (no desde fixtures),
  // así que reviso ahí por si quedó una metadata _stage='sf' huérfana.
  try {
    const allSfOdds = await db.collection('odds').where('_stage', '==', 'sf').get();
    console.log(`  DIAG odds con _stage=sf: ${allSfOdds.size} doc(s)`);
    allSfOdds.docs.forEach((d) => { const o = d.data(); console.log(`    ${d.id}: _home=${o._home} _away=${o._away} _homeCode=${o._homeCode} _awayCode=${o._awayCode} _kickoff=${o._kickoff}`); });
  } catch (e) { console.warn('  diag odds sf duplicado:', e && e.message); }

  // Carga fixtures dinámicos (r16+) registrados por corridas anteriores y los agrega a OURS.
  try {
    const dynSnap = await db.collection('fixtures').get();
    const oddsMetaWrites = [];
    dynSnap.docs.forEach((d) => {
      const f = d.data();
      if (f.homeCode && f.awayCode && f.kickoff) {
        if (!OURS.some((o) => o.id === f.id)) {
          OURS.push({ id: f.id, home: f.home || '', away: f.away || '', homeCode: f.homeCode, awayCode: f.awayCode, kickoff: f.kickoff, stage: f.stage || 'r16', group: null, md: null });
          ALIASES[f.homeCode] = ALIASES[f.homeCode] || [];
          ALIASES[f.awayCode] = ALIASES[f.awayCode] || [];
          if (f.home && isoOf(f.home) !== f.homeCode) ALIAS_TO_ISO[norm(f.home)] = f.homeCode;
          if (f.away && isoOf(f.away) !== f.awayCode) ALIAS_TO_ISO[norm(f.away)] = f.awayCode;
        }
        // Copia metadata de fixture en el doc de odds para que el cliente pueda leerla
        // (la colección `fixtures` no tiene regla de seguridad de lectura para clientes).
        oddsMetaWrites.push(db.collection('odds').doc(d.id).set({
          _home: f.home || '', _away: f.away || '',
          _homeCode: f.homeCode, _awayCode: f.awayCode,
          _kickoff: f.kickoff, _stage: f.stage || 'r16',
        }, { merge: true }));
      }
    });
    if (oddsMetaWrites.length) await Promise.all(oddsMetaWrites);
    if (dynSnap.size) console.log(`Fixtures dinámicos cargados: ${dynSnap.size}`);
    // DEBUG: mostrar stage de cada fixture QF para diagnóstico
    const QF_IDS = ['dyn_fr_ma','dyn_be_es','dyn_gb-eng_no','dyn_ar_ch'];
    dynSnap.docs.filter(d => QF_IDS.includes(d.id)).forEach(d => {
      const f = d.data();
      console.log(`  QF debug: ${d.id} stage=${f.stage} kickoff=${f.kickoff} homeCode=${f.homeCode}`);
    });
  } catch (e) { console.warn('loadDynamicFixtures:', e && e.message); }

  // Estas NO dependen de football-data → corren SIEMPRE (aunque la API falle):
  const oddsN = await ensureOdds();
  if (oddsN) console.log(`Cuotas generadas: ${oddsN}.`);

  try {
    const consN = await updateBetConsensus();
    if (consN) console.log(`Consenso de apuestas actualizado: ${consN} partido(s).`);
  } catch (e) { console.warn('updateBetConsensus falló:', (e && e.message) || e); }

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
    // recomputeAllStreaks: es solo reconciliación "self-healing" (currentStreak/
    // bestStreak ya se actualizan al vuelo en settle() para quien acaba de
    // liquidar) - no necesita correr cada 5 min. Antes corría SIN este gate,
    // escaneando TODAS las apuestas ganadas/perdidas 288 veces al día - el
    // mayor consumo evitable de lecturas de Firestore de todo el agente.
    try { await recomputeAllStreaks(); } catch (e) { console.warn('recomputeAllStreaks:', (e && e.message) || e); }
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
    const isTimed = status === 'TIMED';
    // Ignora partidos que no son del Mundial u otros estados irrelevantes
    if (!isFinished && !isLive && !isTimed) continue;
    const ft = m.score && m.score.fullTime;
    let mm = matchOur(m.homeTeam.name, m.awayTeam.name);
    if (!mm) {
      // Intenta auto-registrar como fixture dinámico (solo si ambos ISOs son conocidos)
      const hi = isoOf(m.homeTeam.name), ai = isoOf(m.awayTeam.name);
      if (hi && ai && m.kickoff) {
        const dynId = 'dyn_' + [hi, ai].sort().join('_');
        try {
          const existDoc = await db.collection('fixtures').doc(dynId).get();
          if (!existDoc.exists) {
            let stage = stageFromEspn(m.espnRound, m.espnSeasonType);
            // Cruce con una SEGUNDA fuente (football-data.org) antes de
            // confiar en la ronda que dice ESPN — así un fixture nuevo nunca
            // se registra basado en una sola fuente sin contraste. Si fd
            // conoce el mismo partido (mismos dos países) con una ronda
            // reconocible, esa manda (corrige a ESPN si discrepan, o completa
            // el dato si ESPN no lo supo determinar).
            try {
              const fdAll = await fdMatchesOnce();
              const fdMatch = fdAll.find((fm) => {
                const fhi = isoOf(fm.homeTeam && fm.homeTeam.name), fai = isoOf(fm.awayTeam && fm.awayTeam.name);
                if (!fhi || !fai) return false;
                const s = new Set([fhi, fai]);
                return s.has(hi) && s.has(ai);
              });
              if (fdMatch) {
                const fdStage = stageFromFd(fdMatch.stage);
                if (fdStage && fdStage !== stage) {
                  console.log(`  Cruce football-data.org: ESPN decía ronda="${stage || 'desconocida'}", fd dice "${fdMatch.stage}"→${fdStage} para ${m.homeTeam.name} vs ${m.awayTeam.name}. Se usa fd.`);
                  stage = fdStage;
                }
              }
            } catch (e) { /* fd no disponible: seguimos con lo que haya determinado ESPN (o nada) */ }
            if (!stage) {
              // Ronda no reconocible en ninguna de las dos fuentes: probablemente
              // un partido especulativo/proyectado que ESPN publica antes de
              // tiempo (ver comentario en stageFromEspn). Mejor no registrarlo
              // que registrarlo mal.
              console.log(`  Fixture con ronda no reconocida (ESPN ni football-data.org), ignorado: ${m.homeTeam.name} vs ${m.awayTeam.name} (espnRound="${m.espnRound}" espnSeasonType="${m.espnSeasonType}")`);
            } else {
            const dynFx = { id: dynId, home: m.homeTeam.name, away: m.awayTeam.name, homeCode: hi, awayCode: ai, kickoff: m.kickoff, stage: stage, espnId: m.espnId || null };
            await db.collection('fixtures').doc(dynId).set(dynFx);
            const od = modelOdds(hi, ai);
            await db.collection('odds').doc(dynId).set({ home: od.home, draw: od.draw, away: od.away, fuente: 'modelo', actualizado: admin.firestore.FieldValue.serverTimestamp(), _home: dynFx.home, _away: dynFx.away, _homeCode: hi, _awayCode: ai, _kickoff: dynFx.kickoff, _stage: stage }, { merge: true });
            OURS.push(Object.assign({}, dynFx, { group: null, md: null }));
            if (m.homeTeam.name && isoOf(m.homeTeam.name) !== hi) ALIAS_TO_ISO[norm(m.homeTeam.name)] = hi;
            if (m.awayTeam.name && isoOf(m.awayTeam.name) !== ai) ALIAS_TO_ISO[norm(m.awayTeam.name)] = ai;
            mm = matchOur(m.homeTeam.name, m.awayTeam.name);
            console.log(`  Auto-registrado fixture dinámico: ${m.homeTeam.name} vs ${m.awayTeam.name} → ${dynId}`);
            }
          } else {
            // Ya existe: asegura que está en OURS para esta corrida
            const f = existDoc.data();
            if (!OURS.some((o) => o.id === dynId)) {
              OURS.push({ id: f.id, home: f.home, away: f.away, homeCode: f.homeCode, awayCode: f.awayCode, kickoff: f.kickoff, stage: f.stage || 'r16', group: null, md: null });
              if (f.home) ALIAS_TO_ISO[norm(f.home)] = f.homeCode;
              if (f.away) ALIAS_TO_ISO[norm(f.away)] = f.awayCode;
            }
            mm = matchOur(m.homeTeam.name, m.awayTeam.name);
          }
        } catch (e) { console.warn('  auto-registro fixture:', e && e.message); }
      }
      if (!mm) { console.log(`  SIN MAPEAR (ESPN): ${m.homeTeam.name} vs ${m.awayTeam.name} [${status}]`); continue; }
    }
    // Partidos pre-partido (TIMED): ya registrados/con cuotas, no hay marcador que procesar
    if (!isFinished && !isLive) continue;
    // Si ESPN terminó el partido pero fullTime no tiene scores, derivar de los goles individuales
    const cntGoals = (side) => (m.goals || []).reduce((n, g) => {
      const eff = g.og ? (g.side === 'home' ? 'away' : 'home') : g.side;
      return n + (eff === side ? 1 : 0);
    }, 0);
    const ftH = (ft && ft.home != null) ? ft.home : (isFinished ? cntGoals('home') : null);
    const ftA = (ft && ft.away != null) ? ft.away : (isFinished ? cntGoals('away') : null);
    const gh = ftH != null ? ftH : 0;
    const ga = ftA != null ? ftA : 0;
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
    if (ftH == null || ftA == null) continue;
    let apiResult = gh > ga ? 'home' : (gh < ga ? 'away' : 'draw');
    let ourResult = apiResult;
    if (!mm.sameOrient && apiResult !== 'draw') ourResult = apiResult === 'home' ? 'away' : 'home';

    // Prórroga / penales: relevante para fase KO (la apuesta 'draw' se convierte en "Prórr./Pen.")
    const isKO = mm.our.stage && mm.our.stage !== 'Grupos';
    // m.extraTime se detecta por regex en statusDesc; también cuenta como ET si ESPN
    // reporta un ganador en un partido KO que quedó igualado (garantía de ET/PKs).
    const extraTime = isKO && (!!(m.extraTime) || (ourResult === 'draw' && !!m.espnWinner));
    // Ganador final en caso de penales (marcador queda igualado; ESPN indica el ganador)
    let penWinner = null;
    if (isKO && extraTime && ourResult === 'draw' && m.espnWinner) {
      penWinner = mm.sameOrient ? m.espnWinner : (m.espnWinner === 'home' ? 'away' : 'home');
    }
    // Marcador de la tanda + detalle pateador a pateador, en NUESTRA orientación.
    let penScore = null, penKicks = [];
    if (penWinner && m.penScore) {
      penScore = mm.sameOrient ? m.penScore : { home: m.penScore.away, away: m.penScore.home };
    }
    if (penWinner) {
      // El scoreboard compacto solo trae los penales CONVERTIDOS (omite los
      // fallados), así que el detalle completo se pide siempre al endpoint
      // summary; si no responde, se usa lo poco que trajo el scoreboard.
      let need = true;
      if (isFinished) {
        const ex = await db.collection('odds').doc(mm.our.id).get();
        need = !(ex.exists && Array.isArray(ex.data().penKicks) && ex.data().penKicks.some((k) => k.scored === false));
      }
      let kicksSrc = [];
      if (need) {
        const sk = await espnPenKicksFromSummary(m.espnId, m.espnHomeId, m.espnAwayId);
        console.log(`  summary ${mm.our.id} (event ${m.espnId}): ${sk.length} penal(es) en la tanda`);
        kicksSrc = sk.length ? sk.map((k) => ({ side: k.homeAway, name: k.name, scored: k.scored })) : (m.penKicks || []);
      } else {
        kicksSrc = m.penKicks || [];
      }
      penKicks = kicksSrc.map((k) => {
        const side = mm.sameOrient ? k.side : (k.side === 'home' ? 'away' : 'home');
        return { code: side === 'home' ? mm.our.homeCode : mm.our.awayCode, name: k.name, scored: !!k.scored };
      });
    }

    const odoc = await db.collection('odds').doc(mm.our.id).get();
    const wasFinished = odoc.exists && odoc.data().finished;
    await db.collection('odds').doc(mm.our.id).set(Object.assign(
      { finished: true, live: false, gh: ghOur, ga: gaOur, result: ourResult, scorers: scorers, cards: cards,
        ...(isKO && { extraTime: extraTime, penWinner: penWinner || null, penScore: penScore || null, penKicks: penKicks }) },
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
    const n = await settle(mm.our, ourResult, extraTime, penWinner, ghOur, gaOur);
    if (n) { settled += n; console.log(`  Liquidado ${mm.our.id} (${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away} → ${ourResult}${extraTime ? ' ET' : ''}${penWinner ? '/Pen:'+penWinner : ''}): ${n} apuesta(s).`); }

    // Liquidar desafíos del partido (Q1/Q2: solo KO; Q3/Q4: todos los partidos)
    {
      const oddsNow = await db.collection('odds').doc(mm.our.id).get();
      const od = oddsNow.exists ? oddsNow.data() : {};
      const isKOMatch = mm.our.stage && mm.our.stage !== 'Grupos';
      // Q1/Q2 solo para KO
      if (isKOMatch) {
        if (typeof od.penalties === 'undefined') {
          await db.collection('odds').doc(mm.our.id).set({ penalties: !!(extraTime && penWinner) }, { merge: true });
          od.penalties = !!(extraTime && penWinner);
        }
        if (typeof od.htGoal === 'undefined') {
          let htGoal;
          if (ghOur + gaOur === 0) {
            htGoal = false;
          } else if (scorers.length > 0) {
            htGoal = scorers.some(function(s) {
              const base = parseInt(String(s.minute || '').split(':')[0].split('+')[0], 10);
              return !isNaN(base) && base <= 45;
            });
          }
          if (typeof htGoal === 'boolean') {
            await db.collection('odds').doc(mm.our.id).set({ htGoal: htGoal }, { merge: true });
            od.htGoal = htGoal;
          }
        }
        // Q5: ¿Gol en el segundo tiempo? — espejo de Q1, mismo parseo de minuto.
        if (typeof od.ftGoal === 'undefined') {
          let ftGoal;
          if (ghOur + gaOur === 0) {
            ftGoal = false;
          } else if (scorers.length > 0) {
            ftGoal = scorers.some(function(s) {
              const base = parseInt(String(s.minute || '').split(':')[0].split('+')[0], 10);
              return !isNaN(base) && base > 45;
            });
          }
          if (typeof ftGoal === 'boolean') {
            await db.collection('odds').doc(mm.our.id).set({ ftGoal: ftGoal }, { merge: true });
            od.ftGoal = ftGoal;
          }
        }
      }
      // Q3: ¿Más de 3 tarjetas amarillas? — todos los partidos
      if (typeof od.yellowCardsOver3 === 'undefined') {
        const yellowCount = cards.filter(function(c) { return !c.red; }).length;
        const yellowCardsOver3 = yellowCount > 3;
        await db.collection('odds').doc(mm.our.id).set({ yellowCardsOver3: yellowCardsOver3, yellowCardsTotal: yellowCount }, { merge: true });
        od.yellowCardsOver3 = yellowCardsOver3;
      }
      // Q4: ¿Quién marca primero? — todos los partidos
      if (typeof od.firstGoalSide === 'undefined') {
        let firstGoalSide = 'none';
        if (scorers.length > 0) {
          const first = scorers[0];
          firstGoalSide = first.code === mm.our.homeCode ? 'home' : 'away';
        }
        await db.collection('odds').doc(mm.our.id).set({ firstGoalSide: firstGoalSide }, { merge: true });
        od.firstGoalSide = firstGoalSide;
      }
      await settleChallengePicks(mm.our, od);
    }

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
          // Semi_picks: pagar cuando terminan los QF
          if (mm.our.stage === 'qf') {
            try { await paySemiBonus(winnerCodes.filter(Boolean)); } catch (e) { console.warn('Semi bonus falló:', (e && e.message) || e); }
          }
          // Goleador del torneo: liquidar cuando termina la FINAL
          if (mm.our.stage === 'final') {
            try { await settleScorerBets(); } catch (e) { console.warn('Goleador bonus falló:', (e && e.message) || e); }
          }
        }
      }
    }
  }

  // Fallback: usa football-data.org para cualquier partido terminado que ESPN no devolvió.
  try {
    const fdFallbackN = await settleFdFallback();
    if (fdFallbackN) { settled += fdFallbackN; console.log(`FD fallback: ${fdFallbackN} apuesta(s) liquidada(s).`); }
  } catch (e) { console.warn('FD fallback:', (e && e.message) || e); }

  try {
    const drawFixed = await resettleDrawBets();
    if (drawFixed) console.log(`resettleDrawBets: ${drawFixed} apuesta(s) corregida(s).`);
  } catch (e) { console.warn('resettleDrawBets:', (e && e.message) || e); }

  let parlaysSettled = 0;
  try { parlaysSettled = await settleParlays(); if (parlaysSettled) console.log(`Combinadas liquidadas: ${parlaysSettled}.`); } catch (e) { console.warn('settleParlays:', (e && e.message) || e); }

  // NOTA: hasta v313 acá había una migración que BORRABA dyn_es_fr creyendo
  // que era un fixture fantasma (Francia vs España, mal etiquetado 'r16').
  // Resultó ser la semifinal REAL (14-jul, confirmado con fuentes externas)
  // — ESPN nunca le pone ronda a este partido específico, así que se veía
  // igual a una proyección especulativa. Esa migración corría DESPUÉS del
  // seed SF de más arriba y lo borraba en cada ciclo, deshaciendo la
  // siembra constantemente. Eliminada por completo (ver v313/v314).


  // Rescate de desafíos que quedaron abiertos en partidos ya terminados
  // (fuera de la ventana de ESPN). Corre en cada ciclo: solo lee picks 'open'.
  await sweepOpenChallengePicks();

  // Rescate de premios "campeón por ronda" (r32/r16/qf/sf/final): el pago solo
  // se dispara desde el bucle de ESPN, que solo ve partidos en la ventana
  // anteayer→mañana. Si una ronda completa (todas sus cuotas 'finished') salió
  // de esa ventana antes de que el agente llegara a revisarla, el bono queda
  // sin pagar PARA SIEMPRE. Esta barrida revisa cada ronda directamente contra
  // los fixtures/odds guardados, sin depender de que ESPN la devuelva hoy.
  await sweepChampionRoundBonuses();

  console.log(`\nResumen: ${oddsN} cuota(s), ${lives} en vivo, ${results} resultado(s), ${settled} apuesta(s) liquidada(s), ${parlaysSettled} combinada(s) liquidada(s).`);
}

// Recalcula currentStreak para TODOS los usuarios con apuestas liquidadas.
// Se ejecuta en cada corrida (self-healing): así se rellena para jugadores
// cuya racha nunca se tocó (p. ej. si su última apuesta liquidada fue antes
// de que existiera este campo) y no solo para quien acaba de liquidar ahora.
async function recomputeAllStreaks() {
  const betsSnap = await db.collection('bets').where('status', 'in', ['won', 'lost']).get();
  const byUid = {};
  betsSnap.docs.forEach((d) => {
    const b = d.data();
    if (!b.uid) return;
    (byUid[b.uid] = byUid[b.uid] || []).push(b);
  });
  const uids = Object.keys(byUid);
  let batch = db.batch(), ops = 0;
  for (const uid of uids) {
    const { cur, best } = computeStreaks(byUid[uid]);
    // Leer bestStreak previo para no retrocederlo (solo avanza)
    // (no leemos Firestore aquí para mantener el batch eficiente; el agente lo protege en el settle individual)
    batch.set(db.collection('users').doc(uid), { currentStreak: cur, bestStreak: best }, { merge: true });
    ops++;
    if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops) await batch.commit();
  console.log(`Rachas recalculadas para ${uids.length} usuario(s).`);
}

// Repara apuestas 'draw' (Prórr./Pen.) liquidadas incorrectamente como 'lost'
// en partidos KO que sí fueron a prórroga/penales.
// Problema conocido: race condition entre ESPN actualizando statusDesc con keywords
// ET/Pen y el agente liquidando. Si ESPN era lento, extraTime=false quedó en el doc
// odds aunque el partido sí fue a ET/PKs. ESPN tampoco sirve partidos viejos en el
// scoreboard, por lo que el doc odds nunca se repara con el path normal.
// Solución: usa football-data.org (retorna TODOS los partidos del torneo, con
// score.extraTime / score.penalties) como fuente de verdad para ET. Si FD confirma
// ET, repara el doc odds (extraTime=true) y paga la apuesta.
async function resettleDrawBets() {
  const snap = await db.collection('bets').where('pick', '==', 'draw').where('status', '==', 'lost').get();
  if (snap.empty) return 0;

  // Pre-fetch football-data para verificar ET en partidos donde odds.extraTime=false.
  // fdETMap: matchId → true si FD confirma que el partido terminó en ET/PKs.
  const fdETMap = {};
  try {
    const fdAll = await fdMatches();
    for (const m of fdAll) {
      if (m.status !== 'FINISHED') continue;
      const mm = matchOur((m.homeTeam && m.homeTeam.name) || '', (m.awayTeam && m.awayTeam.name) || '');
      if (!mm) continue;
      const ft = m.score && m.score.fullTime;
      if (!ft || ft.home == null || ft.away == null) continue;
      if (ft.home !== ft.away) continue; // sin empate en 90' → no aplica
      const etScore = m.score && m.score.extraTime;
      const pkScore = m.score && m.score.penalties;
      const hasET = (etScore && (etScore.home != null || etScore.away != null)) ||
                    (pkScore && (pkScore.home != null || pkScore.away != null));
      if (hasET) fdETMap[mm.our.id] = true;
    }
  } catch (e) { console.warn('resettleDrawBets: FD no disponible:', (e && e.message) || e); }

  let fixed = 0;
  for (const doc of snap.docs) {
    const bet = doc.data();
    const odDoc = await db.collection('odds').doc(bet.matchId).get();
    if (!odDoc.exists) continue;
    const od = odDoc.data();
    if (!od.finished || !od._stage || od._stage === 'Grupos') continue;

    // Verificar ET: del doc odds O de football-data (cubre race condition)
    const confirmedET = od.extraTime || fdETMap[bet.matchId];
    if (!confirmedET) continue;

    // Si el doc odds tenía extraTime=false incorrecto, repararlo ahora
    if (!od.extraTime && fdETMap[bet.matchId]) {
      await db.collection('odds').doc(bet.matchId).set({ extraTime: true }, { merge: true });
      console.log(`  resettleDrawBets: reparó odds.extraTime para ${bet.matchId}`);
    }

    const payout = Math.round((bet.stake || 0) * (bet.odd || 1));
    await db.runTransaction(async (tx) => {
      const bs = await tx.get(doc.ref);
      if (!bs.exists || bs.data().status !== 'lost') return;
      const userRef = db.collection('users').doc(bet.uid);
      const us = await tx.get(userRef);
      const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : 0;
      tx.set(doc.ref, { status: 'won', payout: payout, settledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      tx.set(userRef, { prevSaldo: saldo, saldo: saldo + payout }, { merge: true });
    });
    await notify(bet.uid, '✅ Apuesta corregida', `${od._home || ''} vs ${od._away || ''}: tu apuesta Prórr./Pen. era ganadora. +${payout} puntos.`);
    console.log(`  resettleDrawBets: ${bet.matchId} uid=${bet.uid} → won, payout=${payout}`);
    fixed++;
  }
  return fixed;
}

async function settleFdFallback() {
  let n = 0;
  const fdAll = await fdMatches();
  for (const m of fdAll) {
    if (m.status !== 'FINISHED') continue;
    const mm = matchOur((m.homeTeam && m.homeTeam.name) || '', (m.awayTeam && m.awayTeam.name) || '');
    if (!mm) continue;
    const odoc = await db.collection('odds').doc(mm.our.id).get();
    if (odoc.exists && odoc.data().finished) continue; // ya liquidado
    const ft = m.score && m.score.fullTime;
    if (!ft || ft.home == null || ft.away == null) continue;
    const gh = ft.home, ga = ft.away;
    const ghOur = mm.sameOrient ? gh : ga;
    const gaOur = mm.sameOrient ? ga : gh;
    const isKO = mm.our.stage && mm.our.stage !== 'Grupos';
    const etScore = m.score && m.score.extraTime;
    const pkScore = m.score && m.score.penalties;
    const hasET = etScore && (etScore.home != null || etScore.away != null);
    const hasPKs = pkScore && (pkScore.home != null || pkScore.away != null);
    const extraTime = isKO && (hasET || hasPKs);
    const fdWinner = m.score && m.score.winner; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
    let ourResult = ghOur > gaOur ? 'home' : ghOur < gaOur ? 'away' : 'draw';
    let penWinner = null;
    if (isKO && extraTime && ourResult === 'draw' && fdWinner && fdWinner !== 'DRAW') {
      penWinner = mm.sameOrient
        ? (fdWinner === 'HOME_TEAM' ? 'home' : 'away')
        : (fdWinner === 'HOME_TEAM' ? 'away' : 'home');
    }
    // Marcador de la tanda (football-data no trae detalle pateador a pateador).
    let penScore = null;
    if (penWinner && hasPKs) {
      penScore = mm.sameOrient ? { home: pkScore.home, away: pkScore.away } : { home: pkScore.away, away: pkScore.home };
    }
    console.log(`  FD fallback ${mm.our.id}: ${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away}${extraTime ? ' (ET/PKs)' : ''}`);
    await db.collection('odds').doc(mm.our.id).set({
      finished: true, live: false, gh: ghOur, ga: gaOur, result: ourResult, scorers: [], cards: [],
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(isKO && { extraTime: !!extraTime, penWinner: penWinner || null, penScore: penScore || null, penKicks: [] }),
    }, { merge: true });
    const nt = (odoc.exists && odoc.data().notified) || {};
    if (!nt.final) {
      const suffix = extraTime ? (penWinner ? ' (penales)' : ' (prórroga)') : '';
      await notifyWatchers(mm.our.id, '🏁 Resultado final', `${mm.our.home} ${ghOur}-${gaOur} ${mm.our.away}${suffix}`);
      nt.final = true; nt.closed = true; nt.soon = true;
      await db.collection('odds').doc(mm.our.id).set({ notified: nt }, { merge: true });
    }
    const count = await settle(mm.our, ourResult, !!extraTime, penWinner, ghOur, gaOur);
    if (count) n += count;
    {
      const od2 = (await db.collection('odds').doc(mm.our.id).get()).data() || {};
      if (isKO) {
        if (typeof od2.penalties === 'undefined') {
          await db.collection('odds').doc(mm.our.id).set({ penalties: !!(extraTime && penWinner) }, { merge: true });
          od2.penalties = !!(extraTime && penWinner);
        }
        if (typeof od2.htGoal === 'undefined') {
          const ht = m.score && m.score.halfTime;
          let htGoal;
          if (ghOur + gaOur === 0) {
            htGoal = false;
          } else if (ht && ht.home != null && ht.away != null) {
            htGoal = (ht.home + ht.away) > 0;
          }
          if (typeof htGoal === 'boolean') {
            await db.collection('odds').doc(mm.our.id).set({ htGoal: htGoal }, { merge: true });
            od2.htGoal = htGoal;
          }
        }
      }
      // Q3/Q4 para todos los partidos (FD fallback no trae tarjetas ni goles detallados)
      if (typeof od2.yellowCardsOver3 === 'undefined') {
        od2.yellowCardsOver3 = false; od2.yellowCardsTotal = 0;
        await db.collection('odds').doc(mm.our.id).set({ yellowCardsOver3: false, yellowCardsTotal: 0 }, { merge: true });
      }
      if (typeof od2.firstGoalSide === 'undefined') {
        const fgs = ghOur > 0 ? 'home' : gaOur > 0 ? 'away' : 'none';
        od2.firstGoalSide = fgs;
        await db.collection('odds').doc(mm.our.id).set({ firstGoalSide: fgs }, { merge: true });
      }
      await settleChallengePicks(mm.our, od2);
    }
  }
  return n;
}

main().catch((e) => {
  const msg = (e && e.message) || String(e);
  console.error('ERROR:', msg);
  // Cuota de Firestore agotada (plan gratuito): es transitorio y se repone solo
  // (cada ~24h). El cron corre cada 5 min; si esto se trata como fallo de build
  // se manda un correo de error cada 5 min hasta que se repone la cuota. Lo
  // registramos como advertencia y salimos en éxito para no inundar el correo.
  if (/RESOURCE_EXHAUSTED|Quota exceeded/i.test(msg)) {
    console.warn('Cuota de Firestore agotada por hoy; reintenta en la próxima corrida.');
    process.exit(0);
  }
  process.exit(1);
});
