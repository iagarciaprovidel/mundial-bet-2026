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

  // — Entrenadores por selección: [nombre, nacionalidad, códigoISO] —
  const COACHES = {
    'México': ['Javier Aguirre', 'México', 'mx'], 'Sudáfrica': ['Hugo Broos', 'Bélgica', 'be'], 'Corea del Sur': ['Hong Myung-bo', 'Corea del Sur', 'kr'], 'Chequia': ['Ivan Hašek', 'Chequia', 'cz'],
    'Canadá': ['Jesse Marsch', 'Estados Unidos', 'us'], 'Bosnia y Herzegovina': ['Sergej Barbarez', 'Bosnia y Herzegovina', 'ba'], 'Catar': ['Julen Lopetegui', 'España', 'es'], 'Suiza': ['Murat Yakin', 'Suiza', 'ch'],
    'Brasil': ['Carlo Ancelotti', 'Italia', 'it'], 'Marruecos': ['Mohamed Ouahbi', 'Marruecos', 'ma'], 'Haití': ['Sébastien Migné', 'Francia', 'fr'], 'Escocia': ['Steve Clarke', 'Escocia', 'gb-sct'],
    'Estados Unidos': ['Mauricio Pochettino', 'Argentina', 'ar'], 'Paraguay': ['Gustavo Alfaro', 'Argentina', 'ar'], 'Australia': ['Tony Popovic', 'Australia', 'au'], 'Türkiye': ['Vincenzo Montella', 'Italia', 'it'],
    'Alemania': ['Julian Nagelsmann', 'Alemania', 'de'], 'Curazao': ['Dick Advocaat', 'Países Bajos', 'nl'], 'Costa de Marfil': ['Emerse Faé', 'Costa de Marfil', 'ci'], 'Ecuador': ['Sebastián Beccacece', 'Argentina', 'ar'],
    'Países Bajos': ['Ronald Koeman', 'Países Bajos', 'nl'], 'Japón': ['Hajime Moriyasu', 'Japón', 'jp'], 'Suecia': ['Jon Dahl Tomasson', 'Dinamarca', 'dk'], 'Túnez': ['Sabri Lamouchi', 'Francia', 'fr'],
    'Bélgica': ['Rudi García', 'Francia', 'fr'], 'Egipto': ['Hossam Hassan', 'Egipto', 'eg'], 'Irán': ['Amir Ghalenoei', 'Irán', 'ir'], 'Nueva Zelanda': ['Darren Bazeley', 'Inglaterra', 'gb-eng'],
    'España': ['Luis de la Fuente', 'España', 'es'], 'Cabo Verde': ['Pedro "Bubista" Brito', 'Cabo Verde', 'cv'], 'Arabia Saudita': ['Georgios Donis', 'Grecia', 'gr'], 'Uruguay': ['Marcelo Bielsa', 'Argentina', 'ar'],
    'Francia': ['Didier Deschamps', 'Francia', 'fr'], 'Senegal': ['Pape Thiaw', 'Senegal', 'sn'], 'Irak': ['Graham Arnold', 'Australia', 'au'], 'Noruega': ['Ståle Solbakken', 'Noruega', 'no'],
    'Argentina': ['Lionel Scaloni', 'Argentina', 'ar'], 'Argelia': ['Vladimir Petković', 'Bosnia y Herzegovina', 'ba'], 'Austria': ['Ralf Rangnick', 'Alemania', 'de'], 'Jordania': ['Jamal Sellami', 'Marruecos', 'ma'],
    'Portugal': ['Roberto Martínez', 'España', 'es'], 'Congo RD': ['Sébastien Desabre', 'Francia', 'fr'], 'Uzbekistán': ['Timur Kapadze', 'Uzbekistán', 'uz'], 'Colombia': ['Néstor Lorenzo', 'Argentina', 'ar'],
    'Inglaterra': ['Thomas Tuchel', 'Alemania', 'de'], 'Croacia': ['Zlatko Dalić', 'Croacia', 'hr'], 'Ghana': ['Otto Addo', 'Ghana', 'gh'], 'Panamá': ['Thomas Christiansen', 'España', 'es'],
  };

  // — Árbitros designados (52) con nacionalidad —
  const R = (name, country, code, conf) => ({ name, country, code, conf });
  const REFEREES = [
    R('Espen Eskås', 'Noruega', 'no', 'UEFA'), R('Alejandro Hernández', 'España', 'es', 'UEFA'),
    R('István Kovács', 'Rumania', 'ro', 'UEFA'), R('François Letexier', 'Francia', 'fr', 'UEFA'),
    R('Danny Makkelie', 'Países Bajos', 'nl', 'UEFA'), R('Szymon Marciniak', 'Polonia', 'pl', 'UEFA'),
    R('Maurizio Mariani', 'Italia', 'it', 'UEFA'), R('Glenn Nyberg', 'Suecia', 'se', 'UEFA'),
    R('Michael Oliver', 'Inglaterra', 'gb-eng', 'UEFA'), R('João Pinheiro', 'Portugal', 'pt', 'UEFA'),
    R('Sandro Schärer', 'Suiza', 'ch', 'UEFA'), R('Anthony Taylor', 'Inglaterra', 'gb-eng', 'UEFA'),
    R('Clément Turpin', 'Francia', 'fr', 'UEFA'), R('Slavko Vinčić', 'Eslovenia', 'si', 'UEFA'),
    R('Felix Zwayer', 'Alemania', 'de', 'UEFA'),
    R('Ramon Abatti', 'Brasil', 'br', 'CONMEBOL'), R('Juan Benítez', 'Paraguay', 'py', 'CONMEBOL'),
    R('Raphael Claus', 'Brasil', 'br', 'CONMEBOL'), R('Yael Falcón Pérez', 'Argentina', 'ar', 'CONMEBOL'),
    R('Cristián Garay', 'Chile', 'cl', 'CONMEBOL'), R('Darío Herrera', 'Argentina', 'ar', 'CONMEBOL'),
    R('Kevin Ortega', 'Perú', 'pe', 'CONMEBOL'), R('Andrés Rojas', 'Colombia', 'co', 'CONMEBOL'),
    R('Wilton Sampaio', 'Brasil', 'br', 'CONMEBOL'), R('Gustavo Tejera', 'Uruguay', 'uy', 'CONMEBOL'),
    R('Facundo Tello', 'Argentina', 'ar', 'CONMEBOL'), R('Jesús Valenzuela', 'Venezuela', 've', 'CONMEBOL'),
    R('Iván Barton', 'El Salvador', 'sv', 'CONCACAF'), R('Juan Calderón', 'Costa Rica', 'cr', 'CONCACAF'),
    R('Ismail Elfath', 'Estados Unidos', 'us', 'CONCACAF'), R('Oshane Nation', 'Jamaica', 'jm', 'CONCACAF'),
    R('Drew Fischer', 'Canadá', 'ca', 'CONCACAF'), R('Katia Itzel García', 'México', 'mx', 'CONCACAF'),
    R('Saíd Martínez', 'Honduras', 'hn', 'CONCACAF'), R('Tori Penso', 'Estados Unidos', 'us', 'CONCACAF'),
    R('César Arturo Ramos', 'México', 'mx', 'CONCACAF'),
    R('Omar Artan', 'Somalia', 'so', 'CAF'), R('Pierre Atcho', 'Gabón', 'ga', 'CAF'),
    R('Dahane Beida', 'Mauritania', 'mr', 'CAF'), R('Mustapha Ghorbal', 'Argelia', 'dz', 'CAF'),
    R('Jalal Jayed', 'Marruecos', 'ma', 'CAF'), R('Amin Omar', 'Egipto', 'eg', 'CAF'),
    R('Abongile Tom', 'Sudáfrica', 'za', 'CAF'), R('Zakhele Siwela', 'Sudáfrica', 'za', 'CAF'),
    R('Omar Al Ali', 'Emiratos Árabes', 'ae', 'AFC'), R('Abdulrahman Al-Jassim', 'Catar', 'qa', 'AFC'),
    R('Khalid Al-Turais', 'Arabia Saudita', 'sa', 'AFC'), R('Alireza Faghani', 'Australia', 'au', 'AFC'),
    R('Ma Ning', 'China', 'cn', 'AFC'), R('Adham Makhadmeh', 'Jordania', 'jo', 'AFC'),
    R('Ilgiz Tantashev', 'Uzbekistán', 'uz', 'AFC'), R('Yusuke Araki', 'Japón', 'jp', 'AFC'),
    R('Campbell-Kirk Kawana-Waugh', 'Nueva Zelanda', 'nz', 'OFC'),
  ];

  // — Construye GROUP_STANDINGS real (0 stats; torneo no iniciado) y lo
  //   inyecta en window.MB para que TODA la app muestre los grupos reales —
  function codeToEmoji(code) {
    if (code === 'gb-sct') return '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}';
    if (code === 'gb-eng') return '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
    const A = 0x1F1E6;
    return String.fromCodePoint(A + code.charCodeAt(0) - 97, A + code.charCodeAt(1) - 97);
  }
  const STANDINGS = {};
  Object.keys(GROUPS).forEach(letter => {
    STANDINGS[letter] = GROUPS[letter].map(([name, code], i) => {
      const c = COACHES[name] || ['', '', ''];
      return {
        pos: i + 1, name, code, flag: codeToEmoji(code),
        coach: c[0], coachCountry: c[1], coachCode: c[2],
        j: 0, g: 0, e: 0, p: 0, pts: 0, gf: 0, gc: 0,
      };
    });
  });

  // Árbitro asignado a un partido (determinístico; excluye la nacionalidad de
  // ambos equipos por regla FIFA). Las designaciones oficiales salen ~2 días antes.
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function refForMatch(m) {
    if (!m) return null;
    const pool = REFEREES.filter(r => r.code !== m.homeCode && r.code !== m.awayCode);
    if (!pool.length) return null;
    return pool[hashStr(m.id) % pool.length];
  }

  window.MB_WC = { GROUPS, FIXTURES, KNOCKOUTS, STADIUM, COACHES, REFEREES, STANDINGS, refForMatch };

  // Inyección en el modelo de la app (reemplaza datos mock de grupos)
  if (window.MB) {
    window.MB.GROUP_STANDINGS = STANDINGS;
    window.MB.REFEREES = REFEREES;
    window.MB.COACHES = COACHES;
    window.MB.WC_FIXTURES = FIXTURES;
    window.MB.WC_KNOCKOUTS = KNOCKOUTS;
    window.MB.refForMatch = refForMatch;
  }
})();
