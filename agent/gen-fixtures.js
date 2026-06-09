/* ============================================================
   Genera agent/our-fixtures.json a partir de wc2026.js (la fuente
   única de los partidos), para que el agente conozca nuestros IDs
   sin duplicar datos. Se ejecuta en CI antes del agente, así siempre
   está sincronizado.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'wc2026.js'), 'utf8');
const window = { MB: {} };
// wc2026.js es un IIFE que sólo usa `window`; lo evaluamos con un window falso.
new Function('window', code)(window);

const FX = (window.MB_WC && window.MB_WC.FIXTURES) ||
           (window.MB && window.MB.WC_FIXTURES) || [];

// Sólo partidos con equipos definidos (fase de grupos). Las eliminatorias
// aún no tienen rivales, no se pueden mapear ni liquidar todavía.
const out = FX
  .filter(f => f.homeCode && f.awayCode)
  .map(f => ({
    id: f.id, home: f.home, away: f.away,
    homeCode: f.homeCode, awayCode: f.awayCode,
    kickoff: f.kickoff, md: f.md, group: f.group,
  }));

fs.writeFileSync(path.join(__dirname, 'our-fixtures.json'), JSON.stringify(out, null, 2));
console.log('our-fixtures.json generado:', out.length, 'partidos');
