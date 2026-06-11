/* ============================================================
   Genera figuritas-2026.json a partir de wc2026.js (48 equipos en
   orden de grupos) y players.js (planteles reales). Mismo patrón que
   agent/gen-fixtures.js: datos derivados, sin duplicar a mano.

   Estructura del álbum (numeración compatible con el oficial ~980):
     · Especiales 00–19 (20)
     · 48 selecciones × 20 (escudo + plantel + 18 jugadores), grupos A→L
   Cada selección ocupa un bloque fijo de 20 números (20–39, 40–59, …).
   ============================================================ */
const fs = require('fs');
const path = require('path');

// — Cargar wc2026.js y players.js con un `window` falso (son IIFE de navegador) —
const window = { MB: {} };
new Function('window', fs.readFileSync(path.join(__dirname, 'wc2026.js'), 'utf8'))(window);
new Function('window', fs.readFileSync(path.join(__dirname, 'players.js'), 'utf8'))(window);

const GROUPS = window.MB_WC && window.MB_WC.GROUPS;
const PLAYERS = window.MB && window.MB.PLAYERS;
const STADIUM = (window.MB_WC && window.MB_WC.STADIUM) || {};
if (!GROUPS || !PLAYERS) { console.error('No se cargaron GROUPS/PLAYERS'); process.exit(1); }

const pad = (n) => String(n).padStart(2, '0');

// — Especiales 00–19 (estructura oficial; contenido es elección nuestra) —
const sedes = Object.values(STADIUM).slice(0, 11); // 11 sedes para "Historia"
const ESPECIALES = [
  { seccion: 'FWC - Especiales',     nombre: 'Emblema Mundial 2026',      tipo: 'especial' },
  { seccion: 'FWC - Especiales',     nombre: 'Trofeo de la Copa del Mundo', tipo: 'especial' },
  { seccion: 'FWC - Especiales',     nombre: 'Zayu · mascota',            tipo: 'mascota', code: 'mx' },
  { seccion: 'FWC - Especiales',     nombre: 'Maple · mascota',           tipo: 'mascota', code: 'ca' },
  { seccion: 'FWC - Especiales',     nombre: 'Clutch · mascota',          tipo: 'mascota', code: 'us' },
  { seccion: 'FWC - Balón y Países', nombre: 'Balón oficial',             tipo: 'especial' },
  { seccion: 'FWC - Balón y Países', nombre: 'Estados Unidos · anfitrión', tipo: 'pais', code: 'us' },
  { seccion: 'FWC - Balón y Países', nombre: 'México · anfitrión',         tipo: 'pais', code: 'mx' },
  { seccion: 'FWC - Balón y Países', nombre: 'Canadá · anfitrión',         tipo: 'pais', code: 'ca' },
];
sedes.forEach((s) => ESPECIALES.push({ seccion: 'FWC - Historia', nombre: s, tipo: 'sede' }));
// Asignar números 00–19
const especiales = ESPECIALES.slice(0, 20).map((e, i) => Object.assign({ n: i, num: pad(i) }, e));

// — Elegir 18 jugadores por equipo: cuota 2 POR · 6 DEF · 5 MED · 5 DEL —
function pick18(squad) {
  const quota = { POR: 2, DEF: 6, MED: 5, DEL: 5 };
  const byPos = { POR: [], DEF: [], MED: [], DEL: [] };
  squad.forEach((p) => { (byPos[p.pos] || (byPos[p.pos] = [])).push(p); });
  let chosen = [];
  ['POR', 'DEF', 'MED', 'DEL'].forEach((pos) => { chosen = chosen.concat((byPos[pos] || []).slice(0, quota[pos])); });
  if (chosen.length < 18) { // completar por orden de plantilla
    const set = new Set(chosen);
    for (const p of squad) { if (chosen.length >= 18) break; if (!set.has(p)) { chosen.push(p); set.add(p); } }
  }
  while (chosen.length < 18) chosen.push({ name: '—', pos: '', n: null }); // relleno si faltan
  return chosen.slice(0, 18);
}

// — Orden de equipos: grupos A→L —
const order = [];
Object.keys(GROUPS).sort().forEach((g) => GROUPS[g].forEach(([name, code]) => order.push({ name, code, grupo: g })));

const warnings = [];
const selecciones = order.map((t, ti) => {
  const start = 20 + ti * 20;
  const squad = PLAYERS[t.name];
  if (!squad) warnings.push('SIN PLANTEL: ' + t.name);
  const players = pick18(squad || []);
  const items = [
    { n: start,     num: String(start),     tipo: 'escudo', nombre: t.name },
    { n: start + 1, num: String(start + 1), tipo: 'equipo', nombre: 'Plantel de ' + t.name },
  ];
  players.forEach((p, i) => items.push({
    n: start + 2 + i, num: String(start + 2 + i), tipo: 'jugador',
    nombre: p.name, pos: p.pos || null, dorsal: (p.n != null ? p.n : null),
  }));
  return { equipo: t.name, code: t.code, grupo: t.grupo, desde: start, hasta: start + 19, items };
});

const total = especiales.length + selecciones.reduce((s, x) => s + x.items.length, 0);
const out = {
  torneo: 'FIFA World Cup 2026',
  total,
  generado: new Date().toISOString().slice(0, 10),
  especiales,
  selecciones,
};

fs.writeFileSync(path.join(__dirname, 'figuritas-2026.json'), JSON.stringify(out, null, 2));
// También un .js que expone window.MB_FIGURITAS (lo carga la app por <script>, sin fetch).
const js = '/* Generado por gen-figuritas.js — NO editar a mano. */\n' +
  '(function(){ var d=' + JSON.stringify(out) + ';\n' +
  '  if (typeof window!=="undefined") window.MB_FIGURITAS=d;\n' +
  '  if (typeof self!=="undefined") self.MB_FIGURITAS=d; })();\n';
fs.writeFileSync(path.join(__dirname, 'figuritas-2026.js'), js);
console.log('figuritas-2026.json + .js generados:', total, 'figuritas ·', selecciones.length, 'selecciones');
if (warnings.length) console.log('AVISOS:\n  ' + warnings.join('\n  '));
