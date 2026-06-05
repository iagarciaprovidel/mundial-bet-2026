/* ============================================================
   MundialBet Club 2026 — Datos REALES del Mundial 2026 (FIFA)
   Sorteo: 5 dic 2025. 48 equipos, 12 grupos (A–L), 104 partidos.
   Fase de grupos completa (72 partidos, jornadas 1–3) + eliminatorias.
   kickoff en UTC (ET de junio/julio = EDT = UTC-4).
   Expone window.MB_WC = { GROUPS, FIXTURES, KNOCKOUTS, STADIUM }.
   ============================================================ */
(function () {
  // — Equipos por grupo: [nombre, códigoISO (flagcdn)] —
  const GROUPS = {
    A: [['México', 'mx'], ['Sudáfrica', 'za'], ['Corea del Sur', 'kr'], ['Chequia', 'cz']],
    B: [['Canadá', 'ca'], ['Bosnia y Herzegovina', 'ba'], ['Catar', 'qa'], ['Suiza', 'ch']],
    C: [['Brasil', 'br'], ['Marruecos', 'ma'], ['Haití', 'ht'], ['Escocia', 'gb-sct']],
    D: [['Estados Unidos', 'us'], ['Paraguay', 'py'], ['Australia', 'au'], ['Türkiye', 'tr']],
    E: [['Alemania', 'de'], ['Curazao', 'cw'], ['Costa de Marfil', 'ci'], ['Ecuador', 'ec']],
    F: [['Países Bajos', 'nl'], ['Japón', 'jp'], ['Suecia', 'se'], ['Túnez', 'tn']],
    G: [['Bélgica', 'be'], ['Egipto', 'eg'], ['Irán', 'ir'], ['Nueva Zelanda', 'nz']],
    H: [['España', 'es'], ['Cabo Verde', 'cv'], ['Arabia Saudita', 'sa'], ['Uruguay', 'uy']],
    I: [['Francia', 'fr'], ['Senegal', 'sn'], ['Irak', 'iq'], ['Noruega', 'no']],
    J: [['Argentina', 'ar'], ['Argelia', 'dz'], ['Austria', 'at'], ['Jordania', 'jo']],
    K: [['Portugal', 'pt'], ['Congo RD', 'cd'], ['Uzbekistán', 'uz'], ['Colombia', 'co']],
    L: [['Inglaterra', 'gb-eng'], ['Croacia', 'hr'], ['Ghana', 'gh'], ['Panamá', 'pa']],
  };

  // — Código ISO por nombre (para banderas en fixtures) —
  const CODE = {};
  Object.values(GROUPS).forEach(g => g.forEach(([n, c]) => { CODE[n] = c; }));

  // — Estadios (ciudad → nombre, ciudad) —
  const STADIUM = {
    'Ciudad de México': 'Estadio Azteca, Ciudad de México',
    'Guadalajara': 'Estadio Akron, Guadalajara',
    'Monterrey': 'Estadio BBVA, Monterrey',
    'Los Ángeles': 'SoFi Stadium, Los Ángeles',
    'Santa Clara': "Levi's Stadium, Santa Clara",
    'Seattle': 'Lumen Field, Seattle',
    'Vancouver': 'BC Place, Vancouver',
    'Toronto': 'BMO Field, Toronto',
    'Houston': 'NRG Stadium, Houston',
    'Dallas': 'AT&T Stadium, Dallas',
    'Kansas City': 'Arrowhead Stadium, Kansas City',
    'Atlanta': 'Mercedes-Benz Stadium, Atlanta',
    'Miami': 'Hard Rock Stadium, Miami',
    'Filadelfia': 'Lincoln Financial Field, Filadelfia',
    'Boston': 'Gillette Stadium, Boston',
    'Nueva Jersey': 'MetLife Stadium, Nueva Jersey',
  };

  // F(id, jornada, grupo, local, visita, kickoffUTC, ciudad)
  const F = (id, md, group, home, away, kickoff, city) => ({
    id, md, group, stage: 'Grupos',
    home, homeCode: CODE[home], away, awayCode: CODE[away],
    kickoff, stadium: STADIUM[city] || city,
  });

  const FIXTURES = [
    // ── Jornada 1 ──
    F('m01', 1, 'A', 'México', 'Sudáfrica', '2026-06-11T19:00:00Z', 'Ciudad de México'),
    F('m02', 1, 'A', 'Corea del Sur', 'Chequia', '2026-06-12T02:00:00Z', 'Guadalajara'),
    F('m03', 1, 'B', 'Canadá', 'Bosnia y Herzegovina', '2026-06-12T19:00:00Z', 'Toronto'),
    F('m04', 1, 'D', 'Estados Unidos', 'Paraguay', '2026-06-13T01:00:00Z', 'Los Ángeles'),
    F('m05', 1, 'B', 'Catar', 'Suiza', '2026-06-13T19:00:00Z', 'Santa Clara'),
    F('m06', 1, 'C', 'Brasil', 'Marruecos', '2026-06-13T22:00:00Z', 'Nueva Jersey'),
    F('m07', 1, 'C', 'Haití', 'Escocia', '2026-06-14T01:00:00Z', 'Boston'),
    F('m08', 1, 'D', 'Australia', 'Türkiye', '2026-06-14T04:00:00Z', 'Vancouver'),
    F('m09', 1, 'E', 'Alemania', 'Curazao', '2026-06-14T17:00:00Z', 'Houston'),
    F('m10', 1, 'F', 'Países Bajos', 'Japón', '2026-06-14T20:00:00Z', 'Dallas'),
    F('m11', 1, 'E', 'Costa de Marfil', 'Ecuador', '2026-06-14T23:00:00Z', 'Filadelfia'),
    F('m12', 1, 'F', 'Suecia', 'Túnez', '2026-06-15T02:00:00Z', 'Monterrey'),
    F('m13', 1, 'H', 'España', 'Cabo Verde', '2026-06-15T17:00:00Z', 'Atlanta'),
    F('m14', 1, 'G', 'Bélgica', 'Egipto', '2026-06-15T22:00:00Z', 'Seattle'),
    F('m15', 1, 'H', 'Arabia Saudita', 'Uruguay', '2026-06-15T22:00:00Z', 'Miami'),
    F('m16', 1, 'G', 'Irán', 'Nueva Zelanda', '2026-06-16T04:00:00Z', 'Los Ángeles'),
    F('m17', 1, 'I', 'Francia', 'Senegal', '2026-06-16T19:00:00Z', 'Nueva Jersey'),
    F('m18', 1, 'I', 'Irak', 'Noruega', '2026-06-16T22:00:00Z', 'Boston'),
    F('m19', 1, 'J', 'Argentina', 'Argelia', '2026-06-17T01:00:00Z', 'Kansas City'),
    F('m20', 1, 'J', 'Austria', 'Jordania', '2026-06-17T04:00:00Z', 'Santa Clara'),
    F('m21', 1, 'K', 'Portugal', 'Congo RD', '2026-06-17T17:00:00Z', 'Houston'),
    F('m22', 1, 'K', 'Uzbekistán', 'Colombia', '2026-06-18T02:00:00Z', 'Ciudad de México'),
    F('m23', 1, 'L', 'Inglaterra', 'Croacia', '2026-06-17T20:00:00Z', 'Dallas'),
    F('m24', 1, 'L', 'Ghana', 'Panamá', '2026-06-17T23:00:00Z', 'Toronto'),

    // ── Jornada 2 ──
    F('m25', 2, 'A', 'Chequia', 'Sudáfrica', '2026-06-18T16:00:00Z', 'Atlanta'),
    F('m26', 2, 'B', 'Suiza', 'Bosnia y Herzegovina', '2026-06-18T19:00:00Z', 'Los Ángeles'),
    F('m27', 2, 'B', 'Canadá', 'Catar', '2026-06-18T22:00:00Z', 'Vancouver'),
    F('m28', 2, 'A', 'México', 'Corea del Sur', '2026-06-19T03:00:00Z', 'Guadalajara'),
    F('m29', 2, 'D', 'Estados Unidos', 'Australia', '2026-06-19T19:00:00Z', 'Seattle'),
    F('m30', 2, 'C', 'Escocia', 'Marruecos', '2026-06-19T22:00:00Z', 'Boston'),
    F('m31', 2, 'C', 'Brasil', 'Haití', '2026-06-20T01:00:00Z', 'Filadelfia'),
    F('m32', 2, 'D', 'Türkiye', 'Paraguay', '2026-06-20T04:00:00Z', 'Santa Clara'),
    F('m33', 2, 'F', 'Países Bajos', 'Suecia', '2026-06-20T17:00:00Z', 'Houston'),
    F('m34', 2, 'E', 'Alemania', 'Costa de Marfil', '2026-06-20T20:00:00Z', 'Toronto'),
    F('m35', 2, 'E', 'Ecuador', 'Curazao', '2026-06-21T00:00:00Z', 'Kansas City'),
    F('m36', 2, 'F', 'Túnez', 'Japón', '2026-06-21T04:00:00Z', 'Monterrey'),
    F('m37', 2, 'H', 'España', 'Arabia Saudita', '2026-06-21T16:00:00Z', 'Atlanta'),
    F('m38', 2, 'G', 'Bélgica', 'Irán', '2026-06-21T19:00:00Z', 'Los Ángeles'),
    F('m39', 2, 'H', 'Uruguay', 'Cabo Verde', '2026-06-21T22:00:00Z', 'Miami'),
    F('m40', 2, 'G', 'Nueva Zelanda', 'Egipto', '2026-06-22T01:00:00Z', 'Vancouver'),
    F('m41', 2, 'J', 'Argentina', 'Austria', '2026-06-22T17:00:00Z', 'Dallas'),
    F('m42', 2, 'I', 'Francia', 'Irak', '2026-06-22T21:00:00Z', 'Filadelfia'),
    F('m43', 2, 'I', 'Noruega', 'Senegal', '2026-06-23T00:00:00Z', 'Nueva Jersey'),
    F('m44', 2, 'J', 'Jordania', 'Argelia', '2026-06-23T03:00:00Z', 'Santa Clara'),
    F('m45', 2, 'K', 'Portugal', 'Uzbekistán', '2026-06-23T17:00:00Z', 'Houston'),
    F('m46', 2, 'L', 'Inglaterra', 'Ghana', '2026-06-23T20:00:00Z', 'Boston'),
    F('m47', 2, 'L', 'Panamá', 'Croacia', '2026-06-23T23:00:00Z', 'Toronto'),
    F('m48', 2, 'K', 'Colombia', 'Congo RD', '2026-06-24T02:00:00Z', 'Guadalajara'),

    // ── Jornada 3 ──
    F('m49', 3, 'B', 'Suiza', 'Canadá', '2026-06-24T19:00:00Z', 'Vancouver'),
    F('m50', 3, 'B', 'Bosnia y Herzegovina', 'Catar', '2026-06-24T19:00:00Z', 'Seattle'),
    F('m51', 3, 'C', 'Escocia', 'Brasil', '2026-06-24T22:00:00Z', 'Miami'),
    F('m52', 3, 'C', 'Marruecos', 'Haití', '2026-06-24T22:00:00Z', 'Atlanta'),
    F('m53', 3, 'A', 'Chequia', 'México', '2026-06-25T01:00:00Z', 'Ciudad de México'),
    F('m54', 3, 'A', 'Sudáfrica', 'Corea del Sur', '2026-06-25T01:00:00Z', 'Monterrey'),
    F('m55', 3, 'E', 'Ecuador', 'Alemania', '2026-06-25T20:00:00Z', 'Nueva Jersey'),
    F('m56', 3, 'E', 'Curazao', 'Costa de Marfil', '2026-06-25T20:00:00Z', 'Filadelfia'),
    F('m57', 3, 'F', 'Japón', 'Suecia', '2026-06-25T23:00:00Z', 'Dallas'),
    F('m58', 3, 'F', 'Túnez', 'Países Bajos', '2026-06-25T23:00:00Z', 'Kansas City'),
    F('m59', 3, 'D', 'Türkiye', 'Estados Unidos', '2026-06-26T02:00:00Z', 'Los Ángeles'),
    F('m60', 3, 'D', 'Paraguay', 'Australia', '2026-06-26T02:00:00Z', 'Santa Clara'),
    F('m61', 3, 'I', 'Noruega', 'Francia', '2026-06-26T19:00:00Z', 'Boston'),
    F('m62', 3, 'I', 'Senegal', 'Irak', '2026-06-26T19:00:00Z', 'Toronto'),
    F('m63', 3, 'H', 'Uruguay', 'España', '2026-06-27T00:00:00Z', 'Guadalajara'),
    F('m64', 3, 'H', 'Cabo Verde', 'Arabia Saudita', '2026-06-27T00:00:00Z', 'Houston'),
    F('m65', 3, 'G', 'Egipto', 'Irán', '2026-06-27T03:00:00Z', 'Seattle'),
    F('m66', 3, 'G', 'Nueva Zelanda', 'Bélgica', '2026-06-27T03:00:00Z', 'Vancouver'),
    F('m67', 3, 'L', 'Panamá', 'Inglaterra', '2026-06-27T21:00:00Z', 'Nueva Jersey'),
    F('m68', 3, 'L', 'Croacia', 'Ghana', '2026-06-27T21:00:00Z', 'Filadelfia'),
    F('m69', 3, 'K', 'Colombia', 'Portugal', '2026-06-27T23:30:00Z', 'Miami'),
    F('m70', 3, 'K', 'Congo RD', 'Uzbekistán', '2026-06-27T23:30:00Z', 'Atlanta'),
    F('m71', 3, 'J', 'Argelia', 'Austria', '2026-06-28T02:00:00Z', 'Kansas City'),
    F('m72', 3, 'J', 'Jordania', 'Argentina', '2026-06-28T02:00:00Z', 'Dallas'),
  ];

  // — Fase eliminatoria (equipos por definir; fechas/sedes/ronda fijos) —
  const KNOCKOUTS = [
    { stage: 'Dieciseisavos (R32)', fechas: '28 jun – 3 jul', partidos: 16, sedes: 'Varias sedes (USA · MEX · CAN)' },
    { stage: 'Octavos de final', fechas: '4 – 7 jul', partidos: 8, sedes: 'Houston, Filadelfia, NJ, CDMX, Dallas, Seattle, Atlanta, Vancouver' },
    { stage: 'Cuartos de final', fechas: '9 – 11 jul', partidos: 4, sedes: 'Boston, Los Ángeles, Miami, Kansas City' },
    { stage: 'Semifinales', fechas: '14 – 15 jul', partidos: 2, sedes: 'Dallas, Atlanta' },
    { stage: 'Tercer lugar', fechas: '18 jul', partidos: 1, sedes: 'Hard Rock Stadium, Miami' },
    { stage: 'FINAL', fechas: '19 jul', partidos: 1, sedes: 'MetLife Stadium, Nueva Jersey' },
  ];

  window.MB_WC = { GROUPS, FIXTURES, KNOCKOUTS, STADIUM };
})();
