/* ============================================================
   MundialBet Club 2026 — Códec de intercambio de figuritas (offline)
   Convierte la colección personal { [n]: count } ↔ el texto que va
   dentro del QR, y calcula qué puede dar/recibir cada uno.

   Por figurita se guardan 2 bits:
     bit 0 = la tengo        (count >= 1)
     bit 1 = tengo repetida  (count >= 2  → la puedo dar)
   Con TOTAL=980 son 1960 bits = 245 bytes → ~327 chars en base64.
   Cabe holgado en un QR. Todo el cálculo es local, sin nube.

   Formato del texto del QR:
     MBF2|<apodo url-encoded>|<base64 de los bits>
   ============================================================ */
(function () {
  const DATA = window.MB_FIGURITAS || { total: 0 };
  const TOTAL = DATA.total || 0;
  const HEAD = 'MBF2';

  // —— base64 de un array de bytes (binario seguro) ——
  function bytesToB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  // —— Colección { [n]: count } → texto del QR ——
  function encode(col, apodo) {
    col = col || {};
    const nbytes = Math.ceil((TOTAL * 2) / 8);
    const bytes = new Uint8Array(nbytes);
    for (let n = 0; n < TOTAL; n++) {
      const c = col[n] || 0;
      if (c < 1) continue;
      const bit = n * 2;                 // bit 0: la tengo
      bytes[bit >> 3] |= 1 << (bit & 7);
      if (c >= 2) {                      // bit 1: repetida (la puedo dar)
        const b2 = bit + 1;
        bytes[b2 >> 3] |= 1 << (b2 & 7);
      }
    }
    const nick = encodeURIComponent(String(apodo || 'Amigo').slice(0, 24));
    return HEAD + '|' + nick + '|' + bytesToB64(bytes);
  }

  // —— Texto del QR → { apodo, tengo:Set, repe:Set } (o null si no es válido) ——
  function decode(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.trim();
    const i1 = t.indexOf('|');
    const i2 = t.indexOf('|', i1 + 1);
    if (i1 < 0 || i2 < 0 || t.slice(0, i1) !== HEAD) return null;
    let apodo = 'Amigo';
    try { apodo = decodeURIComponent(t.slice(i1 + 1, i2)) || 'Amigo'; } catch (e) {}
    let bytes;
    try { bytes = b64ToBytes(t.slice(i2 + 1)); } catch (e) { return null; }
    const tengo = new Set();
    const repe = new Set();
    for (let n = 0; n < TOTAL; n++) {
      const bit = n * 2;
      const idx = bit >> 3;
      if (idx >= bytes.length) break;
      if (bytes[idx] & (1 << (bit & 7))) tengo.add(n);
      const b2 = bit + 1;
      if (bytes[b2 >> 3] & (1 << (b2 & 7))) repe.add(n);
    }
    return { apodo: apodo, tengo: tengo, repe: repe };
  }

  // —— Calcula el intercambio entre MI colección y el QR del otro ——
  // myCol: { [n]: count } (mío) · other: resultado de decode()
  // Devuelve listas de n: leDoy (mis repes que a él le faltan) /
  //                       meDa  (sus repes que a mí me faltan).
  function match(myCol, other) {
    myCol = myCol || {};
    if (!other) return { leDoy: [], meDa: [] };
    const leDoy = [];
    const meDa = [];
    for (let n = 0; n < TOTAL; n++) {
      const mio = myCol[n] || 0;
      // Yo le doy: yo tengo repetida (>=2) y él NO la tiene.
      if (mio >= 2 && !other.tengo.has(n)) leDoy.push(n);
      // Él me da: él tiene repetida y yo NO la tengo.
      if (mio < 1 && other.repe.has(n)) meDa.push(n);
    }
    return { leDoy: leDoy, meDa: meDa };
  }

  window.MB_FigCodec = {
    TOTAL: TOTAL,
    encode: encode,
    decode: decode,
    match: match,
  };
})();
