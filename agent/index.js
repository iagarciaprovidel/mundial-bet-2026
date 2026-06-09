/* ============================================================
   MundialBet Club 2026 — Agente automático (API-Football)
   Cada ejecución:
     1) Trae los partidos del Mundial desde API-Football (1 request)
        y los mapea con NUESTROS partidos (our-fixtures.json) por
        códigos ISO (sin depender de los nombres exactos).
     2) Para los próximos partidos sin cuotas, pide la cuota real
        (1·X·2) y la escribe en la colección `odds`.
     3) Para los partidos terminados, LIQUIDA las apuestas abiertas:
        paga stake×cuota a los ganadores, actualiza saldo y deja
        prevSaldo para las flechas ↑/↓.
   Requiere variables de entorno:
     API_FOOTBALL_KEY           clave de api-sports.io
     FIREBASE_SERVICE_ACCOUNT   JSON del service account (una línea)
   Opcionales: WC_LEAGUE_ID (def 1), WC_SEASON (def 2026),
               ODDS_BOOKMAKER (id de casa preferida), MAX_ODDS (def 12).
   Modo descubrimiento (calibrar nombres):  node agent/index.js discover
   ============================================================ */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const API_KEY = process.env.API_FOOTBALL_KEY;
const LEAGUE = process.env.WC_LEAGUE_ID || '1';     // 1 = World Cup en API-Football
const SEASON = process.env.WC_SEASON || '2026';
const API_BASE = 'https://v3.football.api-sports.io';
const PREF_BOOKMAKER = process.env.ODDS_BOOKMAKER || ''; // opcional
const MAX_ODDS = parseInt(process.env.MAX_ODDS || '12', 10); // tope de requests de cuotas por corrida
const ODDS_WINDOW_H = parseInt(process.env.ODDS_WINDOW_H || '120', 10); // horas antes del kickoff para pedir cuotas
const DISCOVER = process.argv.includes('discover');
const SALDO_INICIAL = 90000;
const FINISHED = ['FT', 'AET', 'PEN'];

// ── Nuestros partidos (generados desde wc2026.js) ──
const OURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'our-fixtures.json'), 'utf8'));

// ── ISO2 → alias en inglés (como los puede nombrar API-Football) ──
const ALIASES = {
  mx: ['mexico'], za: ['south africa'], kr: ['south korea', 'korea republic', 'korea'],
  cz: ['czech republic', 'czechia'], ca: ['canada'], ba: ['bosnia and herzegovina', 'bosnia herzegovina', 'bosnia'],
  qa: ['qatar'], ch: ['switzerland'], br: ['brazil'], ma: ['morocco'], ht: ['haiti'],
  'gb-sct': ['scotland'], us: ['usa', 'united states'], py: ['paraguay'], au: ['australia'],
  tr: ['turkey', 'turkiye'], de: ['germany'], cw: ['curacao'], ci: ['ivory coast', 'cote d ivoire', 'cote divoire'],
  ec: ['ecuador'], nl: ['netherlands', 'holland'], jp: ['japan'], se: ['sweden'], tn: ['tunisia'],
  be: ['belgium'], eg: ['egypt'], ir: ['iran'], nz: ['new zealand'], es: ['spain'],
  cv: ['cape verde', 'cape verde islands', 'cabo verde'], sa: ['saudi arabia'], uy: ['uruguay'],
  fr: ['france'], sn: ['senegal'], iq: ['iraq'], no: ['norway'], ar: ['argentina'], dz: ['algeria'],
  at: ['austria'], jo: ['jordan'], pt: ['portugal'], cd: ['dr congo', 'congo dr', 'congo', 'democratic republic of congo'],
  uz: ['uzbekistan'], co: ['colombia'], 'gb-eng': ['england'], hr: ['croatia'], gh: ['ghana'], pa: ['panama'],
};
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const ALIAS_TO_ISO = {};
Object.keys(ALIASES).forEach((iso) => ALIASES[iso].forEach((a) => { ALIAS_TO_ISO[norm(a)] = iso; }));
const isoOf = (apiName) => ALIAS_TO_ISO[norm(apiName)] || null;

// Encuentra NUESTRO partido para un fixture de la API (por par de ISO).
function matchOur(homeName, awayName) {
  const hi = isoOf(homeName), ai = isoOf(awayName);
  if (!hi || !ai) return null;
  const our = OURS.find((o) => {
    const s = new Set([o.homeCode, o.awayCode]);
    return s.has(hi) && s.has(ai);
  });
  if (!our) return null;
  // orientación: ¿el local de la API es nuestro local?
  return { our, sameOrient: our.homeCode === hi };
}

async function api(pathq) {
  const res = await fetch(API_BASE + pathq, { headers: { 'x-apisports-key': API_KEY } });
  const json = await res.json().catch(() => ({}));
  if (json.errors && Object.keys(json.errors).length) console.warn('  API errors:', JSON.stringify(json.errors));
  return Array.isArray(json.response) ? json.response : [];
}

let db = null;
function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  const svc = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  db = admin.firestore();
}

// ── Liquida las apuestas abiertas de un partido terminado ──
async function settle(our, ourResult) { // ourResult: 'home'|'draw'|'away'
  const snap = await db.collection('bets').where('matchId', '==', our.id).where('status', '==', 'open').get();
  if (snap.empty) return 0;
  let n = 0;
  for (const doc of snap.docs) {
    await db.runTransaction(async (tx) => {
      const bs = await tx.get(doc.ref);
      if (!bs.exists || bs.data().status !== 'open') return;
      const bet = bs.data();
      const won = bet.pick === ourResult;
      const payout = won ? Math.round((bet.stake || 0) * (bet.odd || 0)) : 0;
      const userRef = db.collection('users').doc(bet.uid);
      const us = await tx.get(userRef);
      const saldo = (us.exists && typeof us.data().saldo === 'number') ? us.data().saldo : SALDO_INICIAL;
      tx.set(userRef, { prevSaldo: saldo, saldo: saldo + payout }, { merge: true });
      tx.set(doc.ref, {
        status: won ? 'won' : 'lost', result: ourResult, payout,
        settledAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    n++;
  }
  return n;
}

// ── Pide y guarda la cuota 1·X·2 real de un partido ──
async function fetchOdds(our, apiFixtureId, sameOrient) {
  const resp = await api(`/odds?fixture=${apiFixtureId}&bet=1`); // bet 1 = Match Winner
  if (!resp.length) return false;
  const books = resp[0].bookmakers || [];
  let book = PREF_BOOKMAKER ? books.find((b) => String(b.id) === String(PREF_BOOKMAKER)) : null;
  book = book || books[0];
  if (!book) return false;
  const bet = (book.bets || []).find((b) => b.id === 1 || /match winner/i.test(b.name));
  if (!bet) return false;
  const val = (name) => { const v = bet.values.find((x) => new RegExp('^' + name + '$', 'i').test(x.value)); return v ? Number(v.odd) : null; };
  let home = val('home'), draw = val('draw'), away = val('away');
  if (!sameOrient) { const t = home; home = away; away = t; } // alinear a nuestra orientación
  if (!home && !draw && !away) return false;
  await db.collection('odds').doc(our.id).set({
    home, draw, away, fuente: book.name || 'api-football',
    actualizado: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
}

async function main() {
  if (!API_KEY) throw new Error('Falta API_FOOTBALL_KEY');
  console.log(`Agente MundialBet · liga=${LEAGUE} temporada=${SEASON} · ${new Date().toISOString()}`);
  const now = Date.now();

  // Modo descubrimiento: lista los partidos de la API y su mapeo (no escribe, no toca Firebase).
  if (DISCOVER) {
    const fixtures = await api(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
    console.log(`API-Football devolvió ${fixtures.length} partidos.\n— MODO DESCUBRIMIENTO —`);
    let ok = 0, miss = 0;
    fixtures.forEach((f) => {
      const m = matchOur(f.teams.home.name, f.teams.away.name);
      if (m) { ok++; } else { miss++; console.log(`  SIN MAPEAR: ${f.teams.home.name} vs ${f.teams.away.name} (${(f.fixture.date || '').slice(0, 10)})`); }
    });
    console.log(`\nMapeados: ${ok} · sin mapear: ${miss}. Revisa los "SIN MAPEAR" y ajusta ALIASES.`);
    return;
  }

  initFirebase();

  // Ahorro de cuota: sólo llamamos a la API si hay un partido EN VIVO/recién
  // terminado, o si hay próximos partidos sin cuotas dentro de la ventana.
  const liveNow = OURS.some((o) => { const k = new Date(o.kickoff).getTime(); return now >= k - 10 * 60000 && now <= k + 3.5 * 3600000; });
  let oddsPending = false;
  if (!liveNow) {
    const soon = OURS.filter((o) => { const h = (new Date(o.kickoff).getTime() - now) / 3600000; return h > 0 && h <= ODDS_WINDOW_H; });
    for (const o of soon) { const d = await db.collection('odds').doc(o.id).get(); if (!(d.exists && d.data().home)) { oddsPending = true; break; } }
  }
  if (!liveNow && !oddsPending) {
    console.log('Nada que hacer ahora (sin partidos en vivo ni cuotas pendientes). Salgo sin gastar API.');
    return;
  }
  console.log(`Trabajo: ${liveNow ? 'partido(s) en vivo/recién terminados' : ''}${liveNow && oddsPending ? ' + ' : ''}${oddsPending ? 'cuotas pendientes' : ''}.`);

  const fixtures = await api(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
  console.log(`API-Football devolvió ${fixtures.length} partidos.`);

  let settled = 0, oddsDone = 0, oddsBudget = MAX_ODDS;

  for (const f of fixtures) {
    const m = matchOur(f.teams.home.name, f.teams.away.name);
    if (!m) continue;
    const status = (f.fixture.status && f.fixture.status.short) || '';
    const apiId = f.fixture.id;

    // 1) Liquidar si terminó
    if (FINISHED.includes(status) && f.goals && f.goals.home != null && f.goals.away != null) {
      const gh = f.goals.home, ga = f.goals.away;
      let apiResult = gh > ga ? 'home' : (gh < ga ? 'away' : 'draw');
      // alinear a nuestra orientación local/visita
      let ourResult = apiResult;
      if (!m.sameOrient && apiResult !== 'draw') ourResult = apiResult === 'home' ? 'away' : 'home';
      const n = await settle(m.our, ourResult);
      if (n) { settled += n; console.log(`  Liquidado ${m.our.id} (${m.our.home} ${gh}-${ga} ${m.our.away} → ${ourResult}): ${n} apuesta(s).`); }
      continue;
    }

    // 2) Pedir cuotas de los próximos partidos (sin cuota aún) dentro de la ventana
    if (status === 'NS' && oddsBudget > 0) {
      const koMs = new Date(m.our.kickoff).getTime();
      const horas = (koMs - now) / 3600000;
      if (horas > 0 && horas <= ODDS_WINDOW_H) {
        const oddsDoc = await db.collection('odds').doc(m.our.id).get();
        const has = oddsDoc.exists && oddsDoc.data().home;
        if (!has) {
          const ok = await fetchOdds(m.our, apiId, m.sameOrient);
          if (ok) { oddsDone++; oddsBudget--; console.log(`  Cuotas ${m.our.id} (${m.our.home} vs ${m.our.away}) cargadas.`); }
        }
      }
    }
  }

  console.log(`\nResumen: ${settled} apuesta(s) liquidada(s), ${oddsDone} cuota(s) cargada(s).`);
}

main().catch((e) => { console.error('ERROR:', e && e.message || e); process.exit(1); });
