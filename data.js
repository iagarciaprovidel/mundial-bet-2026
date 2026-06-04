/* ============================================================
   MundialBet Club 2026 — Mock data (datos ficticios)
   Sin backend. Todo en window.MB para los componentes React.
   Datos exactos provistos en el brief.
   ============================================================ */
(function () {
  // — Mascotas oficiales —
  const MASCOTS = {
    zayu:   { id: 'zayu',   name: 'Zayu',   animal: 'Jaguar', country: 'México',  emoji: '🐆', color: '#00843D', light: '#00C85A', jersey: 9, role: 'Delantero de las victorias' },
    maple:  { id: 'maple',  name: 'Maple',  animal: 'Alce',   country: 'Canadá',  emoji: '🫎', color: '#D40020', light: '#E84040', jersey: 1, role: 'Portero del riesgo' },
    clutch: { id: 'clutch', name: 'Clutch', animal: 'Águila', country: 'EE.UU.',  emoji: '🦅', color: '#003DA5', light: '#4A90E2', jersey: 8, role: 'Volante del grupo' },
  };

  // — Usuarios (8 participantes) —
  const USERS = [
    { id: 'rodrigo',   name: 'Rodrigo M.',   initials: 'RM', mascot: 'zayu',   coins: 12750, roi: 24, pts: 187, rank: 1, hits: 74, preds: 41, paid: true,  paidDate: '15/06', streak: 6 },
    { id: 'camila',    name: 'Camila P.',    initials: 'CP', mascot: 'maple',  coins: 11200, roi: 18, pts: 164, rank: 2, hits: 70, preds: 39, paid: true,  paidDate: '14/06', streak: 4 },
    { id: 'jorge',     name: 'Jorge A.',     initials: 'JA', mascot: 'clutch', coins: 10800, roi: 15, pts: 151, rank: 3, hits: 66, preds: 40, paid: true,  paidDate: '15/06', streak: 2 },
    { id: 'sergio',    name: 'Sergio G.',    initials: 'SG', mascot: 'zayu',   coins: 9340,  roi: 12, pts: 142, rank: 4, hits: 68, preds: 38, paid: true,  paidDate: '15/06', streak: 3, me: true, admin: true },
    { id: 'beatriz',   name: 'Beatriz V.',   initials: 'BV', mascot: 'zayu',   coins: 8500,  roi: 8,  pts: 128, rank: 5, hits: 61, preds: 36, paid: true,  paidDate: '16/06', streak: 1 },
    { id: 'pedro',     name: 'Pedro A.',     initials: 'PA', mascot: 'maple',  coins: 7200,  roi: 3,  pts: 115, rank: 6, hits: 55, preds: 35, paid: true,  paidDate: '16/06', streak: 5 },
    { id: 'valentina', name: 'Valentina C.', initials: 'VC', mascot: 'clutch', coins: 6800,  roi: -2, pts: 98,  rank: 7, hits: 48, preds: 34, paid: true,  paidDate: '16/06', streak: 0 },
    { id: 'nicolas',   name: 'Nicolás R.',   initials: 'NR', mascot: 'maple',  coins: 5100,  roi: -8, pts: 82,  rank: 8, hits: 41, preds: 33, paid: true,  paidDate: '17/06', streak: 0 },
  ];
  const ME = USERS.find(u => u.me);

  // — Liga —
  const LEAGUE = {
    name: 'Los Cracks del Mundial 2026',
    code: 'CRAK2026',
    entry: 5000,
    pot: 40000,
    paidCount: 8,
    total: 8,
    treasurer: 'Sergio G.',
    treasurerMascot: 'zayu',
    bank: 'Banco Estado',
    rut: '12.345.678-9',
    subject: 'MundialBet [tu nombre]',
    deadline: '10 de junio de 2026',
    distribution: [
      { place: 1, pct: 60, amount: 24000, medal: '🥇', userId: 'rodrigo' },
      { place: 2, pct: 30, amount: 12000, medal: '🥈', userId: 'camila' },
      { place: 3, pct: 10, amount: 4000,  medal: '🥉', userId: 'jorge' },
    ],
  };

  // — Partidos jugados —
  const PLAYED = [
    { id: 'p1', home: 'Brasil',    flagH: '🇧🇷', away: 'Suiza',       flagA: '🇨🇭', sh: 2, sa: 0, group: 'Grupo A' },
    { id: 'p2', home: 'Argentina', flagH: '🇦🇷', away: 'Polonia',     flagA: '🇵🇱', sh: 1, sa: 1, group: 'Grupo A' },
    { id: 'p3', home: 'Francia',   flagH: '🇫🇷', away: 'Australia',   flagA: '🇦🇺', sh: 3, sa: 1, group: 'Grupo B' },
    { id: 'p4', home: 'España',    flagH: '🇪🇸', away: 'Costa Rica',  flagA: '🇨🇷', sh: 2, sa: 0, group: 'Grupo B' },
    { id: 'p5', home: 'México',    flagH: '🇲🇽', away: 'Polonia',     flagA: '🇵🇱', sh: 0, sa: 0, group: 'Grupo C' },
    { id: 'p6', home: 'Chile',     flagH: '🇨🇱', away: 'Perú',        flagA: '🇵🇪', sh: 1, sa: 2, group: 'Grupo C' },
  ];

  // — Partidos próximos (con estadios) —
  const UPCOMING = [
    // FASE DE GRUPOS
    { id: 'u1', home: 'México',    flagH: '🇲🇽', away: 'Canadá',   flagA: '🇨🇦', when: 'Hoy 21:00 CLT',  group: 'Grupo C', stadium: 'MetLife Stadium (Nueva Jersey)', live: false, kickoffInMin: 134, stage: 'Grupos',
      odds: { home: 2.10, draw: 3.20, away: 3.80, over: 1.85, under: 1.95 }, preds: 5, total: 8, next: true },
    { id: 'u2', home: 'Argentina', flagH: '🇦🇷', away: 'Brasil',   flagA: '🇧🇷', when: 'Mañana 18:00',    group: 'Grupo A', stadium: 'SoFi Stadium (Los Ángeles)', live: false, kickoffInMin: 1254, stage: 'Grupos',
      odds: { home: 2.40, draw: 3.00, away: 2.80, over: 1.90, under: 1.90 }, preds: 2, total: 8 },
    { id: 'u3', home: 'España',    flagH: '🇪🇸', away: 'Alemania', flagA: '🇩🇪', when: 'Mañana 21:00',    group: 'Grupo B', stadium: 'AT&T Stadium (Dallas)', live: false, kickoffInMin: 1434, stage: 'Grupos',
      odds: { home: 2.20, draw: 3.10, away: 2.90, over: 1.80, under: 2.00 }, preds: 1, total: 8 },
    
    // OCTAVOS DE FINAL
    { id: 'o1', when: '3 de julio 16:00', stadium: 'Lumen Field (Seattle)', stage: 'Octavos' },
    { id: 'o2', when: '3 de julio 19:00', stadium: 'NRG Stadium (Houston)', stage: 'Octavos' },
    { id: 'o3', when: '4 de julio 15:00', stadium: 'Lincoln Financial Field (Filadelfia)', stage: 'Octavos' },
    { id: 'o4', when: '4 de julio 18:00', stadium: 'Arrowhead Stadium (Kansas City)', stage: 'Octavos' },
    
    // CUARTOS DE FINAL
    { id: 'c1', when: '10 de julio 16:00', stadium: 'MetLife Stadium (Nueva Jersey)', stage: 'Cuartos' },
    { id: 'c2', when: '10 de julio 19:00', stadium: 'SoFi Stadium (Los Ángeles)', stage: 'Cuartos' },
    
    // SEMIFINALES
    { id: 's1', when: '15 de julio 19:00', stadium: 'MetLife Stadium (Nueva Jersey)', stage: 'Semifinal' },
    { id: 's2', when: '16 de julio 19:00', stadium: 'SoFi Stadium (Los Ángeles)', stage: 'Semifinal' },
    
    // FINAL
    { id: 'f1', when: '19 de julio 18:00', stadium: 'MetLife Stadium (Nueva Jersey)', stage: 'Final' },
  ];

  // — Pronósticos anónimos (México vs Canadá) — estado abierto —
  const ANON_OPEN = {
    matchId: 'u1', title: 'México 🇲🇽 vs 🇨🇦 Canadá',
    entries: [
      { mascot: 'zayu',   score: '2—1', coins: 500, me: false },
      { mascot: 'maple',  score: '1—0', coins: 200, me: false },
      { mascot: 'clutch', score: '1—1', coins: 350, me: true },
    ],
    missing: 3,
  };

  // — Pronósticos revelados (Brasil 2-0 Suiza) — estado bloqueado —
  const ANON_LOCKED = {
    matchId: 'p1', title: '🇧🇷 Brasil 2 — 0 Suiza 🇨🇭', result: '2 — 0',
    entries: [
      { userId: 'rodrigo', wasMascot: 'zayu',   score: '2—0', result: 'exact', pts: 3 },
      { userId: 'camila',  wasMascot: 'maple',  score: '1—0', result: 'wrong', pts: 0 },
      { userId: 'jorge',   wasMascot: 'clutch', score: '3—0', result: 'winner', pts: 1 },
      { userId: 'sergio',  wasMascot: 'zayu',   score: '2—0', result: 'exact', pts: 3 },
      { userId: 'beatriz', wasMascot: 'zayu',   score: '0—1', result: 'wrong', pts: 0 },
      { userId: 'pedro',   wasMascot: 'maple',  score: '2—1', result: 'winner', pts: 1 },
    ],
  };

  // — Mercados especiales del torneo —
  const SPECIALS = [
    { label: 'Campeón del Mundial', options: [
      { name: 'Argentina', flag: '🇦🇷', odd: 3.50 }, { name: 'Brasil', flag: '🇧🇷', odd: 4.00 },
      { name: 'Francia', flag: '🇫🇷', odd: 4.50 }, { name: 'México', flag: '🇲🇽', odd: 6.00 }, { name: 'Chile', flag: '🇨🇱', odd: 12.00 } ] },
    { label: 'Máximo goleador', options: [
      { name: 'Mbappé', flag: '🇫🇷', odd: 5.50 }, { name: 'L. Martínez', flag: '🇦🇷', odd: 6.50 }, { name: 'Vinícius', flag: '🇧🇷', odd: 7.00 } ] },
    { label: 'Balón de Oro', options: [
      { name: 'Messi', flag: '🇦🇷', odd: 4.00 }, { name: 'Mbappé', flag: '🇫🇷', odd: 4.50 }, { name: 'Bellingham', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', odd: 6.00 } ] },
  ];

  // — Feed social —
  const FEED = [
    { mascot: 'zayu',   text: '¡Rodrigo acertó el marcador exacto! Brasil 2—0 Suiza · +1.750 mon', emoji: '🔥', ago: '5min', reactions: { '🔥': 6, '🎯': 3 } },
    { mascot: 'clutch', text: 'Pedro lleva 5 aciertos seguidos', emoji: '⚡', ago: '12min', reactions: { '👍': 4, '🔥': 2 } },
    { mascot: 'maple',  text: 'México vs Canadá cierra en 2 horas. ¿Ya apostaste?', emoji: '🔒', ago: '20min', reactions: { '👍': 2 } },
    { mascot: 'zayu',   text: 'Beatriz desbloqueó el logro "Primer Acierto"', emoji: '🎯', ago: '1h', reactions: { '🎯': 5, '👍': 3 } },
    { mascot: 'clutch', text: '¡El bote del torneo ya es $40.000 CLP!', emoji: '💰', ago: '2h', reactions: { '🔥': 8, '👍': 4 } },
    { mascot: 'zayu',   text: 'Rodrigo sigue líder con 12.750 monedas', emoji: '👑', ago: '3h', reactions: { '👍': 5 } },
  ];

  // — Historial Sergio (perfil) —
  const MY_BETS = [
    { match: 'Brasil 2-0 Suiza',     bet: 'aposté 2-0', result: 'exact',  pts: 3, delta: 1750 },
    { match: 'Argentina 1-1 Pol.',   bet: 'aposté 0-1', result: 'wrong',  pts: 0, delta: -200 },
    { match: 'Francia 3-1 Aus.',     bet: 'aposté Fra', result: 'winner', pts: 1, delta: 350 },
    { match: 'España 2-0 CR',        bet: 'aposté 2-0', result: 'exact',  pts: 3, delta: 1200 },
    { match: 'Chile 1-2 Perú',       bet: 'aposté 2-0', result: 'wrong',  pts: 0, delta: -500 },
  ];

  // — Logros —
  const ACHIEVEMENTS = [
    { id: 'primer',   name: 'Primer Acierto',  mascot: 'zayu',   unlocked: true,  note: 'Tu primer marcador exacto' },
    { id: 'rey',      name: 'Rey de Cuotas',   mascot: 'zayu',   unlocked: true,  note: 'Brasil ×3.5' },
    { id: 'racha',    name: 'Racha de 10',     mascot: 'maple',  unlocked: false, note: 'Necesitas 7 más' },
    { id: 'campeon',  name: 'Campeón de Liga', mascot: 'clutch', unlocked: false, note: 'Termina #1 del torneo' },
    { id: 'profeta',  name: 'Profeta Mundial', mascot: 'all',    unlocked: false, note: 'El logro definitivo' },
  ];

  // — Evolución de monedas (perfil) —
  const COIN_HISTORY = [10000, 9800, 11550, 11350, 11700, 12900, 12400, 9340];

  // — Historial de transparencia (log inmutable) —
  const LOG = [
    { date: '17/06', text: 'Nicolás R. — Pago confirmado por Tesorero' },
    { date: '16/06', text: 'Valentina C. — Pago confirmado por Tesorero' },
    { date: '16/06', text: 'Pedro A. — Pago confirmado por Tesorero' },
    { date: '16/06', text: 'Beatriz V. — Pago confirmado por Tesorero' },
    { date: '15/06', text: 'Sergio G. — Pago confirmado por Tesorero' },
    { date: '15/06', text: 'Rodrigo M. — Pago confirmado por Tesorero' },
    { date: '14/06', text: 'Camila P. — Pago confirmado por Tesorero' },
    { date: '12/06', text: 'Reglamento aceptado por 8/8 miembros' },
    { date: '10/06', text: 'Liga creada · Entrada $5.000 CLP · 8 miembros' },
  ];

  // — Tabla de grupos con puntos —
  const GROUP_STANDINGS = {
    'A': [
      { pos: 1, flag: '🇧🇷', name: 'Brasil',    j: 3, g: 2, e: 1, p: 0, pts: 7, gf: 5, gc: 1 },
      { pos: 2, flag: '🇦🇷', name: 'Argentina', j: 3, g: 2, e: 0, p: 1, pts: 6, gf: 4, gc: 2 },
      { pos: 3, flag: '🇺🇾', name: 'Uruguay',   j: 3, g: 1, e: 1, p: 1, pts: 4, gf: 3, gc: 3 },
      { pos: 4, flag: '🇵🇦', name: 'Panamá',    j: 3, g: 0, e: 0, p: 3, pts: 0, gf: 1, gc: 7 },
    ],
    'B': [
      { pos: 1, flag: '🇫🇷', name: 'Francia',   j: 3, g: 2, e: 1, p: 0, pts: 7, gf: 6, gc: 2 },
      { pos: 2, flag: '🇪🇸', name: 'España',    j: 3, g: 2, e: 0, p: 1, pts: 6, gf: 5, gc: 3 },
      { pos: 3, flag: '🇩🇪', name: 'Alemania',  j: 3, g: 1, e: 1, p: 1, pts: 4, gf: 4, gc: 3 },
      { pos: 4, flag: '🇯🇵', name: 'Japón',     j: 3, g: 0, e: 0, p: 3, pts: 0, gf: 2, gc: 9 },
    ],
    'C': [
      { pos: 1, flag: '🇲🇽', name: 'México',    j: 2, g: 1, e: 1, p: 0, pts: 4, gf: 2, gc: 1 },
      { pos: 2, flag: '🇺🇸', name: 'EE.UU.',    j: 2, g: 1, e: 1, p: 0, pts: 4, gf: 2, gc: 1 },
      { pos: 3, flag: '🇨🇦', name: 'Canadá',    j: 2, g: 0, e: 0, p: 2, pts: 0, gf: 0, gc: 2 },
      { pos: 4, flag: '🇮🇸', name: 'Islandia',  j: 3, g: 0, e: 0, p: 3, pts: 0, gf: 1, gc: 5 },
    ],
    'D': [
      { pos: 1, flag: '🇬🇧', name: 'Inglaterra', j: 3, g: 2, e: 1, p: 0, pts: 7, gf: 5, gc: 1 },
      { pos: 2, flag: '🇳🇱', name: 'Países Bajos', j: 3, g: 2, e: 0, p: 1, pts: 6, gf: 4, gc: 2 },
      { pos: 3, flag: '🇧🇪', name: 'Bélgica',   j: 3, g: 1, e: 1, p: 1, pts: 4, gf: 3, gc: 3 },
      { pos: 4, flag: '🇸🇪', name: 'Suecia',    j: 3, g: 0, e: 0, p: 3, pts: 0, gf: 1, gc: 7 },
    ],
    'E': [
      { pos: 1, flag: '🇵🇹', name: 'Portugal',  j: 3, g: 2, e: 1, p: 0, pts: 7, gf: 5, gc: 1 },
      { pos: 2, flag: '🇮🇹', name: 'Italia',    j: 3, g: 2, e: 0, p: 1, pts: 6, gf: 4, gc: 2 },
      { pos: 3, flag: '🇨🇭', name: 'Suiza',     j: 3, g: 1, e: 1, p: 1, pts: 4, gf: 3, gc: 3 },
      { pos: 4, flag: '🇸🇦', name: 'Arabia Saudita', j: 3, g: 0, e: 0, p: 3, pts: 0, gf: 1, gc: 7 },
    ],
    'F': [
      { pos: 1, flag: '🇦🇺', name: 'Australia',  j: 3, g: 2, e: 1, p: 0, pts: 7, gf: 5, gc: 1 },
      { pos: 2, flag: '🇵🇪', name: 'Perú',      j: 3, g: 2, e: 0, p: 1, pts: 6, gf: 4, gc: 2 },
      { pos: 3, flag: '🇰🇷', name: 'Corea del Sur', j: 3, g: 1, e: 1, p: 1, pts: 4, gf: 3, gc: 3 },
      { pos: 4, flag: '🇲🇦', name: 'Marruecos',  j: 3, g: 0, e: 0, p: 3, pts: 0, gf: 1, gc: 7 },
    ],
  };

  // — Reglamento —
  const RULES = [
    'Entrada: $5.000 CLP por participante.',
    'Pago directo al Tesorero Sergio G. por transferencia bancaria.',
    'Plazo máximo de pago: 10 de junio de 2026.',
    'Sin pago confirmado, el usuario queda inactivo y no puede pronosticar.',
    'Sistema de puntos: Marcador exacto 3 pts · Ganador acertado 1 pt.',
    'Desempate: mayor cantidad de marcadores exactos.',
    'Distribución del premio: 60% · 30% · 10% (Top 3).',
    'El premio se entrega en máximo 3 días después de la final.',
    'El Tesorero realiza las transferencias manualmente, fuera de la app.',
  ];

  // — Helpers —
  const fmt = (n) => n.toLocaleString('es-CL').replace(/,/g, '.');
  const clp = (n) => '$' + fmt(n) + ' CLP';

  window.MB = {
    MASCOTS, USERS, ME, LEAGUE, PLAYED, UPCOMING, ANON_OPEN, ANON_LOCKED,
    SPECIALS, FEED, MY_BETS, ACHIEVEMENTS, COIN_HISTORY, LOG, RULES, GROUP_STANDINGS,
    fmt, clp,
    userById: (id) => USERS.find(u => u.id === id),
  };
})();
