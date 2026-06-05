/* ============================================================
   MundialBet Club 2026 — i18n automático (ES · PT · EN)
   Detecta el idioma del navegador y traduce TODA la UI
   interceptando React.createElement. No hay selector manual:
   - navegador en portugués (Brasil) → portugués
   - navegador en inglés (Australia / N. Zelanda / etc.) → inglés
   - cualquier otro → español (idioma base, sin traducir)
   Los nombres propios (jugadores, DT, estadios, mascotas) NO se
   tocan; los nombres de PAÍSES sí se localizan.
   Debe cargarse DESPUÉS de react/react-dom y ANTES de Babel.
   ============================================================ */
(function () {
  var nav = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  var LANG = nav.indexOf('pt') === 0 ? 'pt' : nav.indexOf('en') === 0 ? 'en' : 'es';
  // Override de prueba SOLO para esta visita: ?lang=en|pt|es. No se guarda,
  // así el idioma siempre vuelve a la detección automática del navegador.
  try {
    var q = (location.search.match(/[?&]lang=(en|pt|es)\b/) || [])[1];
    if (q) LANG = q;
    // Limpia cualquier preferencia guardada por versiones anteriores.
    try { localStorage.removeItem('mb_lang'); } catch (e) {}
  } catch (e) {}
  window.MB_LANG = LANG;
  try { document.documentElement.lang = LANG; } catch (e) {}

  // En español no traducimos nada: T = identidad.
  if (LANG === 'es' || typeof React === 'undefined' || !React.createElement) {
    window.MB_T = function (s) { return s; };
    return;
  }

  // ── Nombres de países (clave = español canónico) ──────────
  var COUNTRIES_EN = {
    'México': 'Mexico', 'Canadá': 'Canada', 'Estados Unidos': 'United States', 'EE.UU.': 'USA',
    'Sudáfrica': 'South Africa', 'Corea del Sur': 'South Korea', 'Chequia': 'Czechia',
    'Bosnia y Herzegovina': 'Bosnia & Herzegovina', 'Catar': 'Qatar', 'Suiza': 'Switzerland',
    'Brasil': 'Brazil', 'Marruecos': 'Morocco', 'Haití': 'Haiti', 'Escocia': 'Scotland',
    'Paraguay': 'Paraguay', 'Australia': 'Australia', 'Türkiye': 'Türkiye', 'Alemania': 'Germany',
    'Curazao': 'Curaçao', 'Costa de Marfil': 'Ivory Coast', 'Ecuador': 'Ecuador',
    'Países Bajos': 'Netherlands', 'Japón': 'Japan', 'Suecia': 'Sweden', 'Túnez': 'Tunisia',
    'Bélgica': 'Belgium', 'Egipto': 'Egypt', 'Irán': 'Iran', 'Nueva Zelanda': 'New Zealand',
    'España': 'Spain', 'Cabo Verde': 'Cape Verde', 'Arabia Saudita': 'Saudi Arabia', 'Uruguay': 'Uruguay',
    'Francia': 'France', 'Senegal': 'Senegal', 'Irak': 'Iraq', 'Noruega': 'Norway',
    'Argentina': 'Argentina', 'Argelia': 'Algeria', 'Austria': 'Austria', 'Jordania': 'Jordan',
    'Portugal': 'Portugal', 'Congo RD': 'DR Congo', 'Uzbekistán': 'Uzbekistan', 'Colombia': 'Colombia',
    'Inglaterra': 'England', 'Croacia': 'Croatia', 'Ghana': 'Ghana', 'Panamá': 'Panama',
    'Italia': 'Italy', 'Polonia': 'Poland', 'Costa Rica': 'Costa Rica', 'Islandia': 'Iceland',
    'Perú': 'Peru', 'Dinamarca': 'Denmark', 'Grecia': 'Greece', 'Rumania': 'Romania',
    'Eslovenia': 'Slovenia', 'China': 'China', 'Somalia': 'Somalia', 'Gabón': 'Gabon',
    'Mauritania': 'Mauritania', 'Emiratos Árabes': 'UAE', 'El Salvador': 'El Salvador',
    'Jamaica': 'Jamaica', 'Honduras': 'Honduras', 'Venezuela': 'Venezuela', 'Chile': 'Chile',
  };
  var COUNTRIES_PT = {
    'México': 'México', 'Canadá': 'Canadá', 'Estados Unidos': 'Estados Unidos', 'EE.UU.': 'EUA',
    'Sudáfrica': 'África do Sul', 'Corea del Sur': 'Coreia do Sul', 'Chequia': 'Tchéquia',
    'Bosnia y Herzegovina': 'Bósnia e Herzegovina', 'Catar': 'Catar', 'Suiza': 'Suíça',
    'Brasil': 'Brasil', 'Marruecos': 'Marrocos', 'Haití': 'Haiti', 'Escocia': 'Escócia',
    'Paraguay': 'Paraguai', 'Australia': 'Austrália', 'Türkiye': 'Türkiye', 'Alemania': 'Alemanha',
    'Curazao': 'Curaçao', 'Costa de Marfil': 'Costa do Marfim', 'Ecuador': 'Equador',
    'Países Bajos': 'Países Baixos', 'Japón': 'Japão', 'Suecia': 'Suécia', 'Túnez': 'Tunísia',
    'Bélgica': 'Bélgica', 'Egipto': 'Egito', 'Irán': 'Irã', 'Nueva Zelanda': 'Nova Zelândia',
    'España': 'Espanha', 'Cabo Verde': 'Cabo Verde', 'Arabia Saudita': 'Arábia Saudita', 'Uruguay': 'Uruguai',
    'Francia': 'França', 'Senegal': 'Senegal', 'Irak': 'Iraque', 'Noruega': 'Noruega',
    'Argentina': 'Argentina', 'Argelia': 'Argélia', 'Austria': 'Áustria', 'Jordania': 'Jordânia',
    'Portugal': 'Portugal', 'Congo RD': 'Congo RD', 'Uzbekistán': 'Uzbequistão', 'Colombia': 'Colômbia',
    'Inglaterra': 'Inglaterra', 'Croacia': 'Croácia', 'Ghana': 'Gana', 'Panamá': 'Panamá',
    'Italia': 'Itália', 'Polonia': 'Polônia', 'Costa Rica': 'Costa Rica', 'Islandia': 'Islândia',
    'Perú': 'Peru', 'Dinamarca': 'Dinamarca', 'Grecia': 'Grécia', 'Rumania': 'Romênia',
    'Eslovenia': 'Eslovênia', 'China': 'China', 'Somalia': 'Somália', 'Gabón': 'Gabão',
    'Mauritania': 'Mauritânia', 'Emiratos Árabes': 'Emirados Árabes', 'El Salvador': 'El Salvador',
    'Jamaica': 'Jamaica', 'Honduras': 'Honduras', 'Venezuela': 'Venezuela', 'Chile': 'Chile',
  };

  // ── Frases / fragmentos exactos (clave = español, trim) ───
  var DICT_EN = {
    // Navegación / chrome
    'Inicio': 'Home', 'Partidos': 'Matches', 'Equipos': 'Teams', 'Ranking': 'Ranking',
    'Liga': 'League', 'Perfil': 'Profile', 'Feed social': 'Social feed', 'Panel Admin': 'Admin panel',
    '← Volver al inicio': '← Back to home', '← Volver a la app': '← Back to the app',
    'Cargando partidos': 'Loading matches', 'Cargando ranking': 'Loading ranking',
    'Cargando quiniela': 'Loading pool', 'Cargando liga': 'Loading league',
    // Auth
    'Entrar': 'Sign in', 'Salir': 'Sign out', 'Iniciar sesión con Google': 'Sign in with Google',
    'Jugador': 'Player', 'Cerrar sesión': 'Sign out',
    // Tweaks (panel de desarrollo)
    'Tweaks': 'Tweaks', 'Marca': 'Brand', 'Color de acento': 'Accent color', 'Experiencia': 'Experience',
    'Animaciones': 'Animations', 'Sobrio': 'Subtle', 'Normal': 'Normal', 'Festivo': 'Festive',
    'Rol': 'Role', 'Admin / Tesorero': 'Admin / Treasurer', 'Pantallas especiales': 'Special screens',
    'Ver onboarding': 'View onboarding', 'Ver cierre del torneo': 'View tournament closing',
    // Onboarding
    '¡Bienvenido a MundialBet Club 2026!': 'Welcome to MundialBet Club 2026!',
    'Aquí vas a demostrar que sabes más de fútbol que todos tus amigos. 🔥': 'Here you’ll prove you know more about football than all your friends. 🔥',
    'El juego es justo': 'A fair game',
    'Todos ven los pronósticos pero nadie sabe quién apostó qué… hasta que el partido comienza. 🔒': 'Everyone sees the predictions but nobody knows who bet what… until the match begins. 🔒',
    'Elige tu mascota': 'Choose your mascot',
    'Ella definirá tu estilo y tu color en el grupo.': 'It defines your style and your color in the group.',
    'Continuar': 'Continue', '¡Empezar a jugar!': 'Start playing!', 'Saltar introducción': 'Skip intro',
    // Dashboard
    '¡Buenas noches,': 'Good evening,', '¡Buenos días,': 'Good morning,', '¡Buenas tardes,': 'Good afternoon,',
    'Faltan': 'In', 'días': 'days', 'aciertos seguidos ⚡': 'hit streak ⚡',
    'Llevas': 'You’re on a', 'Bote del torneo': 'Tournament pot',
    'Equipo': 'Team', '12 grupos': '12 groups',
    'del Mundial 2026 · 48 selecciones con su': 'of the 2026 World Cup · 48 teams with their',
    '. Toca una bandera (arriba) o cualquier selección para ver su ficha completa.': '. Tap a flag (top) or any team to see its full profile.',
    'pagaron · ¡Todos listos para jugar!': 'paid · Everyone ready to play!',
    'Mis monedas': 'My coins', 'Posición': 'Rank', 'Aciertos': 'Hit rate', 'ROI': 'ROI',
    'Racha': 'Streak', 'Pronósticos': 'Predictions',
    'Cierra en': 'Closes in', 'Cierra en': 'Closes in',
    'Próximos partidos': 'Upcoming matches', 'Próximo partido': 'Next match',
    'Ver todos': 'See all', 'Hacer pronóstico →': 'Make a prediction →',
    'Empate': 'Draw', '🌍 Ver Equipos y Grupos': '🌍 View Teams & Groups',
    'Top 3 del torneo': 'Tournament top 3', 'Ranking completo': 'Full ranking',
    'Actividad reciente': 'Recent activity', 'Ver feed': 'View feed',
    // Partidos
    'Jor. 1': 'MD 1', 'Jor. 2': 'MD 2', 'Jor. 3': 'MD 3', 'Elim.': 'KO',
    'Fase eliminatoria': 'Knockout stage', 'Fase de grupos': 'Group stage',
    'En vivo': 'Live', 'Abierto': 'Open', 'Finalizado': 'Finished',
    '+2.5 goles': '+2.5 goals', '-2.5 goles': '-2.5 goals',
    'Monedas a apostar': 'Coins to bet', 'Posible ganancia': 'Possible win',
    'Confirmar apuesta': 'Confirm bet', '¡Apuesta registrada! Zayu confía en ti 🔥': 'Bet placed! Zayu believes in you 🔥',
    'Grupos': 'Groups', 'Octavos': 'Round of 16', 'Cuartos': 'Quarter-finals',
    'Semifinal': 'Semi-final', 'Final': 'Final',
    'Dieciseisavos (R32)': 'Round of 32 (R32)', 'Octavos de final': 'Round of 16',
    'Cuartos de final': 'Quarter-finals', 'Semifinales': 'Semi-finals',
    'Tercer lugar': 'Third place', 'FINAL': 'FINAL',
    // Quiniela
    'Los nombres se revelan cuando el partido inicia. Todos ven todos los pronósticos —': 'Names are revealed when the match starts. Everyone sees all predictions —',
    'nadie sabe de quién': 'nobody knows whose',
    '🔓 Bloqueado · Nombres revelados': '🔓 Locked · Names revealed',
    'Abierto · cierra en 2h 14min': 'Open · closes in 2h 14min',
    '↺ Volver a estado anónimo': '↺ Back to anonymous state',
    '▶ Simular inicio del partido (revelar nombres)': '▶ Simulate match start (reveal names)',
    'Partido bloqueado': 'Locked match', 'pronóstico anónimo': 'anonymous prediction',
    // Ranking
    'Esta semana': 'This week', 'Este mes': 'This month', 'Torneo completo': 'Whole tournament',
    '· tú': '· you', 'pts': 'pts',
    '🔒 Los nombres solo son visibles en partidos ya jugados o en curso.': '🔒 Names are only visible for matches already played or in progress.',
    // Liga
    'Tu liga': 'Your league', 'Código:': 'Code:', '✓ Copiado': '✓ Copied', '📋 Copiar': '📋 Copy',
    'Bote y pagos': 'Pot & payments', 'Reglamento': 'Rules', 'Historial': 'History',
    'Distribución del premio': 'Prize distribution', 'Datos del Tesorero': 'Treasurer details',
    'Tesorero': 'Treasurer', 'Banco': 'Bank', 'RUT': 'Tax ID', 'Asunto': 'Reference',
    'Fecha límite': 'Deadline', 'Estado de pagos': 'Payment status', '8/8 confirmados': '8/8 confirmed',
    'Solo el Tesorero puede marcar pagos. Transparente y público para todos los miembros.': 'Only the Treasurer can mark payments. Transparent and public for all members.',
    'Reglamento de la liga': 'League rules',
    'Registro inmutable. Nadie puede editar ni eliminar estas acciones.': 'Immutable record. Nobody can edit or delete these actions.',
    'Verificado': 'Verified', 'Los Cracks del Mundial 2026': 'The 2026 World Cup Aces',
    'Banco Estado': 'Banco Estado', '10 de junio de 2026': 'June 10, 2026',
    'MundialBet [tu nombre]': 'MundialBet [your name]',
    'Reglamento aceptado por 8/8 miembros': 'Rules accepted by 8/8 members',
    // Reglamento (RULES)
    'Entrada: $5.000 CLP por participante.': 'Entry: $5,000 CLP per player.',
    'Pago directo al Tesorero Sergio G. por transferencia bancaria.': 'Direct payment to Treasurer Sergio G. via bank transfer.',
    'Plazo máximo de pago: 10 de junio de 2026.': 'Payment deadline: June 10, 2026.',
    'Sin pago confirmado, el usuario queda inactivo y no puede pronosticar.': 'Without a confirmed payment, the user stays inactive and cannot predict.',
    'Sistema de puntos: Marcador exacto 3 pts · Ganador acertado 1 pt.': 'Scoring: Exact score 3 pts · Correct winner 1 pt.',
    'Desempate: mayor cantidad de marcadores exactos.': 'Tiebreaker: highest number of exact scores.',
    'Distribución del premio: 60% · 30% · 10% (Top 3).': 'Prize distribution: 60% · 30% · 10% (Top 3).',
    'El premio se entrega en máximo 3 días después de la final.': 'The prize is paid within 3 days after the final.',
    'El Tesorero realiza las transferencias manualmente, fuera de la app.': 'The Treasurer makes the transfers manually, outside the app.',
    // Perfil
    'Monedas': 'Coins', 'Evolución de monedas': 'Coin evolution', 'Inicio:': 'Start:', 'Actual:': 'Current:',
    '🔥 Mejor apuesta': '🔥 Best bet', '🫎 Peor apuesta': '🫎 Worst bet',
    'Últimas apuestas': 'Recent bets', 'Logros': 'Achievements',
    'Exacto': 'Exact', 'Ganador': 'Winner', 'Incorrecto': 'Wrong',
    // Logros (data)
    'Primer Acierto': 'First Hit', 'Tu primer marcador exacto': 'Your first exact score',
    'Rey de Cuotas': 'Odds King', 'Racha de 10': 'Streak of 10', 'Necesitas 7 más': '7 more to go',
    'Campeón de Liga': 'League Champion', 'Termina #1 del torneo': 'Finish #1 in the tournament',
    'Profeta Mundial': 'World Prophet', 'El logro definitivo': 'The ultimate achievement',
    // Feed (data)
    'Pedro lleva 5 aciertos seguidos': 'Pedro is on a 5-win streak',
    'México vs Canadá cierra en 2 horas. ¿Ya apostaste?': 'Mexico vs Canada closes in 2 hours. Have you bet yet?',
    '¡El bote del torneo ya es $40.000 CLP!': 'The tournament pot is already $40,000 CLP!',
    'Rodrigo sigue líder con 12.750 monedas': 'Rodrigo is still leading with 12,750 coins',
    'Clutch mantiene al grupo conectado. Esto pasó hoy:': 'Clutch keeps the group connected. Here’s what happened today:',
    // Admin
    'Marca los pagos recibidos por transferencia.': 'Mark payments received via transfer.',
    'Todos al día': 'All settled', 'Confirmado': 'Confirmed', '✅ Confirmar pago': '✅ Confirm payment',
    '✓ Registrado en el historial': '✓ Logged in the history',
    'Gestión de partidos': 'Match management', '➕ Crear / editar partido': '➕ Create / edit match',
    '🔒 Bloquear partido manualmente': '🔒 Lock match manually', '🏁 Ingresar resultado final': '🏁 Enter final result',
    'Cierre del torneo': 'Tournament closing',
    'Calcula el ranking final y distribuye el premio entre el podio.': 'Computes the final ranking and splits the prize among the podium.',
    '🏆 Declarar ganadores del torneo': '🏆 Declare tournament winners',
    'Ajuste manual de cuotas': 'Manual odds adjustment',
    'Las cuotas se ajustan automáticamente por popularidad. Puedes sobrescribirlas.': 'Odds adjust automatically by popularity. You can override them.',
    'Pagos': 'Payments', 'Cuotas': 'Odds', 'Usuarios': 'Users',
    'Panel del': 'Panel of the', 'Tesorero / Admin': 'Treasurer / Admin',
    '— solo visible para Sergio G.': '— only visible to Sergio G.',
    // Cierre del torneo
    '¡MundialBet Club 2026 ha terminado!': 'MundialBet Club 2026 is over!',
    'Ranking final definitivo ·': 'Final ranking ·',
    '✅ Declarar ganadores oficiales': '✅ Declare official winners',
    'Solo visible para el Admin · Sergio G.': 'Only visible to the Admin · Sergio G.',
    // Mercados especiales (data)
    'Campeón del Mundial': 'World Cup Winner', 'Máximo goleador': 'Top scorer', 'Balón de Oro': 'Golden Ball',
    // Mascot reaction
    '¡Zayu lo sabía!': 'Zayu knew it!', '3 puntos para ti': '3 points for you',
    'Clutch te respalda': 'Clutch has your back', 'Eso también cuenta.': 'That counts too.',
    'Maple también falla a veces': 'Maple misses sometimes too', 'Será la próxima.': 'Next time.',
    'Entendido': 'Got it',
    // Equipos (web)
    'Equipo · DT': 'Team · Coach', 'Pts': 'Pts', 'J': 'P',
    'Sin partidos registrados.': 'No matches recorded.',
    'Plantilla no disponible.': 'Squad not available.',
    'Partidos en el grupo': 'Group matches', 'Clasifica': 'Qualifies', 'Eliminado': 'Eliminated',
    'PJ': 'MP', 'DG': 'GD', 'Los 2 primeros avanzan de fase.': 'Top 2 advance to the next round.',
    'Puntos': 'Points', 'Jugados': 'Played', 'Ganados': 'Won', 'Empates': 'Drawn',
    'Perdidos': 'Lost', 'G. favor': 'GF', 'G. contra': 'GA', 'Dif.': 'GD',
    'Los': 'The', 'grupos': 'groups',
    // Banner de instalación
    'Instala la app': 'Install the app',
    'Un toque, sin barra del navegador y sin avisos.': 'One tap — no browser bar, no warnings.',
    "Toca Compartir y elige 'Añadir a pantalla de inicio'.": "Tap Share and choose 'Add to Home Screen'.",
    '📲 Instalar': '📲 Install', 'Cerrar': 'Close', 'Descargar': 'Download',
    '¿Prefieres el APK de Android?': 'Prefer the Android APK?',
  };

  var DICT_PT = {
    'Inicio': 'Início', 'Partidos': 'Jogos', 'Equipos': 'Seleções', 'Ranking': 'Ranking',
    'Liga': 'Liga', 'Perfil': 'Perfil', 'Feed social': 'Feed social', 'Panel Admin': 'Painel Admin',
    '← Volver al inicio': '← Voltar ao início', '← Volver a la app': '← Voltar ao app',
    'Cargando partidos': 'Carregando jogos', 'Cargando ranking': 'Carregando ranking',
    'Cargando quiniela': 'Carregando bolão', 'Cargando liga': 'Carregando liga',
    'Entrar': 'Entrar', 'Salir': 'Sair', 'Iniciar sesión con Google': 'Entrar com Google',
    'Jugador': 'Jogador', 'Cerrar sesión': 'Sair',
    'Tweaks': 'Ajustes', 'Marca': 'Marca', 'Color de acento': 'Cor de destaque', 'Experiencia': 'Experiência',
    'Animaciones': 'Animações', 'Sobrio': 'Sóbrio', 'Normal': 'Normal', 'Festivo': 'Festivo',
    'Rol': 'Papel', 'Admin / Tesorero': 'Admin / Tesoureiro', 'Pantallas especiales': 'Telas especiais',
    'Ver onboarding': 'Ver onboarding', 'Ver cierre del torneo': 'Ver encerramento do torneio',
    '¡Bienvenido a MundialBet Club 2026!': 'Bem-vindo ao MundialBet Club 2026!',
    'Aquí vas a demostrar que sabes más de fútbol que todos tus amigos. 🔥': 'Aqui você vai provar que entende mais de futebol que todos os seus amigos. 🔥',
    'El juego es justo': 'O jogo é justo',
    'Todos ven los pronósticos pero nadie sabe quién apostó qué… hasta que el partido comienza. 🔒': 'Todos veem os palpites, mas ninguém sabe quem apostou o quê… até o jogo começar. 🔒',
    'Elige tu mascota': 'Escolha seu mascote',
    'Ella definirá tu estilo y tu color en el grupo.': 'Ele define seu estilo e sua cor no grupo.',
    'Continuar': 'Continuar', '¡Empezar a jugar!': 'Começar a jogar!', 'Saltar introducción': 'Pular introdução',
    '¡Buenas noches,': 'Boa noite,', '¡Buenos días,': 'Bom dia,', '¡Buenas tardes,': 'Boa tarde,',
    'Faltan': 'Faltam', 'días': 'dias', 'aciertos seguidos ⚡': 'acertos seguidos ⚡',
    'Llevas': 'Você está com', 'Bote del torneo': 'Prêmio do torneio',
    'Equipo': 'Time', '12 grupos': '12 grupos',
    'del Mundial 2026 · 48 selecciones con su': 'da Copa 2026 · 48 seleções com seu',
    '. Toca una bandera (arriba) o cualquier selección para ver su ficha completa.': '. Toque numa bandeira (acima) ou em qualquer seleção para ver sua ficha completa.',
    'pagaron · ¡Todos listos para jugar!': 'pagaram · Todos prontos para jogar!',
    'Mis monedas': 'Minhas moedas', 'Posición': 'Posição', 'Aciertos': 'Acertos', 'ROI': 'ROI',
    'Racha': 'Sequência', 'Pronósticos': 'Palpites',
    'Cierra en': 'Fecha em',
    'Próximos partidos': 'Próximos jogos', 'Próximo partido': 'Próximo jogo',
    'Ver todos': 'Ver todos', 'Hacer pronóstico →': 'Fazer palpite →',
    'Empate': 'Empate', '🌍 Ver Equipos y Grupos': '🌍 Ver Seleções e Grupos',
    'Top 3 del torneo': 'Top 3 do torneio', 'Ranking completo': 'Ranking completo',
    'Actividad reciente': 'Atividade recente', 'Ver feed': 'Ver feed',
    'Jor. 1': 'Rod. 1', 'Jor. 2': 'Rod. 2', 'Jor. 3': 'Rod. 3', 'Elim.': 'Elim.',
    'Fase eliminatoria': 'Fase eliminatória', 'Fase de grupos': 'Fase de grupos',
    'En vivo': 'Ao vivo', 'Abierto': 'Aberto', 'Finalizado': 'Encerrado',
    '+2.5 goles': '+2.5 gols', '-2.5 goles': '-2.5 gols',
    'Monedas a apostar': 'Moedas para apostar', 'Posible ganancia': 'Ganho possível',
    'Confirmar apuesta': 'Confirmar aposta', '¡Apuesta registrada! Zayu confía en ti 🔥': 'Aposta registrada! Zayu confia em você 🔥',
    'Grupos': 'Grupos', 'Octavos': 'Oitavas', 'Cuartos': 'Quartas',
    'Semifinal': 'Semifinal', 'Final': 'Final',
    'Dieciseisavos (R32)': '16-avos (R32)', 'Octavos de final': 'Oitavas de final',
    'Cuartos de final': 'Quartas de final', 'Semifinales': 'Semifinais',
    'Tercer lugar': 'Terceiro lugar', 'FINAL': 'FINAL',
    'Los nombres se revelan cuando el partido inicia. Todos ven todos los pronósticos —': 'Os nomes são revelados quando o jogo começa. Todos veem todos os palpites —',
    'nadie sabe de quién': 'ninguém sabe de quem',
    '🔓 Bloqueado · Nombres revelados': '🔓 Bloqueado · Nomes revelados',
    'Abierto · cierra en 2h 14min': 'Aberto · fecha em 2h 14min',
    '↺ Volver a estado anónimo': '↺ Voltar ao estado anônimo',
    '▶ Simular inicio del partido (revelar nombres)': '▶ Simular início do jogo (revelar nomes)',
    'Partido bloqueado': 'Jogo bloqueado', 'pronóstico anónimo': 'palpite anônimo',
    'Esta semana': 'Esta semana', 'Este mes': 'Este mês', 'Torneo completo': 'Torneio inteiro',
    '· tú': '· você', 'pts': 'pts',
    '🔒 Los nombres solo son visibles en partidos ya jugados o en curso.': '🔒 Os nomes só aparecem em jogos já disputados ou em andamento.',
    'Tu liga': 'Sua liga', 'Código:': 'Código:', '✓ Copiado': '✓ Copiado', '📋 Copiar': '📋 Copiar',
    'Bote y pagos': 'Prêmio e pagamentos', 'Reglamento': 'Regulamento', 'Historial': 'Histórico',
    'Distribución del premio': 'Distribuição do prêmio', 'Datos del Tesorero': 'Dados do Tesoureiro',
    'Tesorero': 'Tesoureiro', 'Banco': 'Banco', 'RUT': 'CPF/RUT', 'Asunto': 'Mensagem',
    'Fecha límite': 'Prazo final', 'Estado de pagos': 'Status dos pagamentos', '8/8 confirmados': '8/8 confirmados',
    'Solo el Tesorero puede marcar pagos. Transparente y público para todos los miembros.': 'Só o Tesoureiro pode marcar pagamentos. Transparente e público para todos os membros.',
    'Reglamento de la liga': 'Regulamento da liga',
    'Registro inmutable. Nadie puede editar ni eliminar estas acciones.': 'Registro imutável. Ninguém pode editar nem apagar estas ações.',
    'Verificado': 'Verificado', 'Los Cracks del Mundial 2026': 'Os Craques da Copa 2026',
    'Banco Estado': 'Banco Estado', '10 de junio de 2026': '10 de junho de 2026',
    'MundialBet [tu nombre]': 'MundialBet [seu nome]',
    'Reglamento aceptado por 8/8 miembros': 'Regulamento aceito por 8/8 membros',
    'Entrada: $5.000 CLP por participante.': 'Inscrição: $5.000 CLP por participante.',
    'Pago directo al Tesorero Sergio G. por transferencia bancaria.': 'Pagamento direto ao Tesoureiro Sergio G. por transferência bancária.',
    'Plazo máximo de pago: 10 de junio de 2026.': 'Prazo máximo de pagamento: 10 de junho de 2026.',
    'Sin pago confirmado, el usuario queda inactivo y no puede pronosticar.': 'Sem pagamento confirmado, o usuário fica inativo e não pode palpitar.',
    'Sistema de puntos: Marcador exacto 3 pts · Ganador acertado 1 pt.': 'Pontuação: Placar exato 3 pts · Vencedor certo 1 pt.',
    'Desempate: mayor cantidad de marcadores exactos.': 'Desempate: maior número de placares exatos.',
    'Distribución del premio: 60% · 30% · 10% (Top 3).': 'Distribuição do prêmio: 60% · 30% · 10% (Top 3).',
    'El premio se entrega en máximo 3 días después de la final.': 'O prêmio é pago em até 3 dias após a final.',
    'El Tesorero realiza las transferencias manualmente, fuera de la app.': 'O Tesoureiro faz as transferências manualmente, fora do app.',
    'Monedas': 'Moedas', 'Evolución de monedas': 'Evolução das moedas', 'Inicio:': 'Início:', 'Actual:': 'Atual:',
    '🔥 Mejor apuesta': '🔥 Melhor aposta', '🫎 Peor apuesta': '🫎 Pior aposta',
    'Últimas apuestas': 'Últimas apostas', 'Logros': 'Conquistas',
    'Exacto': 'Exato', 'Ganador': 'Vencedor', 'Incorrecto': 'Errado',
    'Primer Acierto': 'Primeiro Acerto', 'Tu primer marcador exacto': 'Seu primeiro placar exato',
    'Rey de Cuotas': 'Rei das Odds', 'Racha de 10': 'Sequência de 10', 'Necesitas 7 más': 'Faltam mais 7',
    'Campeón de Liga': 'Campeão da Liga', 'Termina #1 del torneo': 'Termine em #1 no torneio',
    'Profeta Mundial': 'Profeta da Copa', 'El logro definitivo': 'A conquista definitiva',
    'Pedro lleva 5 aciertos seguidos': 'Pedro está com 5 acertos seguidos',
    'México vs Canadá cierra en 2 horas. ¿Ya apostaste?': 'México vs Canadá fecha em 2 horas. Já apostou?',
    '¡El bote del torneo ya es $40.000 CLP!': 'O prêmio do torneio já é $40.000 CLP!',
    'Rodrigo sigue líder con 12.750 monedas': 'Rodrigo segue líder com 12.750 moedas',
    'Clutch mantiene al grupo conectado. Esto pasó hoy:': 'Clutch mantém o grupo conectado. Isto aconteceu hoje:',
    'Marca los pagos recibidos por transferencia.': 'Marque os pagamentos recebidos por transferência.',
    'Todos al día': 'Todos em dia', 'Confirmado': 'Confirmado', '✅ Confirmar pago': '✅ Confirmar pagamento',
    '✓ Registrado en el historial': '✓ Registrado no histórico',
    'Gestión de partidos': 'Gestão de jogos', '➕ Crear / editar partido': '➕ Criar / editar jogo',
    '🔒 Bloquear partido manualmente': '🔒 Bloquear jogo manualmente', '🏁 Ingresar resultado final': '🏁 Inserir resultado final',
    'Cierre del torneo': 'Encerramento do torneio',
    'Calcula el ranking final y distribuye el premio entre el podio.': 'Calcula o ranking final e distribui o prêmio entre o pódio.',
    '🏆 Declarar ganadores del torneo': '🏆 Declarar vencedores do torneio',
    'Ajuste manual de cuotas': 'Ajuste manual de odds',
    'Las cuotas se ajustan automáticamente por popularidad. Puedes sobrescribirlas.': 'As odds se ajustam automaticamente por popularidade. Você pode sobrescrevê-las.',
    'Pagos': 'Pagamentos', 'Cuotas': 'Odds', 'Usuarios': 'Usuários',
    'Panel del': 'Painel do', 'Tesorero / Admin': 'Tesoureiro / Admin',
    '— solo visible para Sergio G.': '— visível apenas para Sergio G.',
    '¡MundialBet Club 2026 ha terminado!': 'MundialBet Club 2026 chegou ao fim!',
    'Ranking final definitivo ·': 'Ranking final ·',
    '✅ Declarar ganadores oficiales': '✅ Declarar vencedores oficiais',
    'Solo visible para el Admin · Sergio G.': 'Visível apenas para o Admin · Sergio G.',
    'Campeón del Mundial': 'Campeão da Copa', 'Máximo goleador': 'Artilheiro', 'Balón de Oro': 'Bola de Ouro',
    '¡Zayu lo sabía!': 'Zayu já sabia!', '3 puntos para ti': '3 pontos para você',
    'Clutch te respalda': 'Clutch te apoia', 'Eso también cuenta.': 'Isso também conta.',
    'Maple también falla a veces': 'Maple também erra às vezes', 'Será la próxima.': 'Fica para a próxima.',
    'Entendido': 'Entendi',
    'Equipo · DT': 'Seleção · Téc.', 'Pts': 'Pts', 'J': 'J',
    'Sin partidos registrados.': 'Sem jogos registrados.',
    'Plantilla no disponible.': 'Elenco indisponível.',
    'Partidos en el grupo': 'Jogos no grupo', 'Clasifica': 'Classifica', 'Eliminado': 'Eliminado',
    'PJ': 'J', 'DG': 'SG', 'Los 2 primeros avanzan de fase.': 'Os 2 primeiros avançam de fase.',
    'Puntos': 'Pontos', 'Jugados': 'Jogos', 'Ganados': 'Vitórias', 'Empates': 'Empates',
    'Perdidos': 'Derrotas', 'G. favor': 'GP', 'G. contra': 'GC', 'Dif.': 'SG',
    'Los': 'Os', 'grupos': 'grupos',
    // Banner de instalación
    'Instala la app': 'Instale o app',
    'Un toque, sin barra del navegador y sin avisos.': 'Um toque — sem barra do navegador e sem avisos.',
    "Toca Compartir y elige 'Añadir a pantalla de inicio'.": "Toque em Compartilhar e escolha 'Adicionar à Tela de Início'.",
    '📲 Instalar': '📲 Instalar', 'Cerrar': 'Fechar', 'Descargar': 'Baixar',
    '¿Prefieres el APK de Android?': 'Prefere o APK de Android?',
  };

  // ── Reglas para frases dinámicas (orden importa) ──────────
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var RULES_EN = [
    [/Equipo (Zayu|Maple|Clutch)/g, 'Team $1'],
    [/🎽 DT:/g, '🎽 Coach:'],
    [/DT:/g, 'Coach:'],
    [/\bDT\b/g, 'Coach'],
    [/Ver ficha de /g, 'View profile of '],
    [/🌍 Ver Grupo /g, '🌍 View Group '],
    [/Ver Grupo /g, 'View Group '],
    [/👥 Ver jugadores/g, '👥 View players'],
    [/Fase de grupos · Jornada/g, 'Group stage · Matchday'],
    [/Árbitros designados/g, 'Appointed referees'],
    [/Árbitros/g, 'Referees'],
    [/Once titular/g, 'Starting XI'],
    [/Suplentes/g, 'Substitutes'],
    [/Jugadores convocados/g, 'Called-up players'],
    [/participantes sin pronosticar/g, 'players without a prediction'],
    [/Resultado /g, 'Result '],
    [/Bloqueado/g, 'Locked'],
    [/ pendientes/g, ' pending'],
    [/Exacto/g, 'Exact'], [/Ganador/g, 'Winner'], [/Incorrecto/g, 'Wrong'],
    [/aciertos/g, 'correct'],
    [/Varias sedes/g, 'Various venues'], [/ partidos/g, ' matches'], [/ partido\b/g, ' match'],
    [/Tabla/g, 'Table'],
    [/Gestión de usuarios/g, 'Manage users'], [/Gestión de liga/g, 'Manage league'],
    [/Gestión de /g, 'Manage '],
    [/próximamente en esta fase/g, 'coming soon in this phase'],
    [/— Pago confirmado por Tesorero/g, '— Payment confirmed by Treasurer'],
    [/Pago confirmado por Tesorero/g, 'Payment confirmed by Treasurer'],
    [/Pago confirmado ·/g, 'Payment confirmed ·'],
    [/Reglamento aceptado por (\d+\/\d+) miembros/g, 'Rules accepted by $1 members'],
    [/Liga creada · Entrada (.+?) · (\d+) miembros/g, 'League created · Entry $1 · $2 members'],
    [/miembros aceptaron el reglamento/g, 'members accepted the rules'],
    [/(\d+\/\d+) miembros/g, '$1 members'],
    [/Apostador /g, 'Bettor '],
    [/^Tú · /g, 'You · '],
    [/^era /g, 'was '],
    [/ · pronosticó /g, ' · predicted '],
    [/pronosticó /g, 'predicted '],
    [/aposté /g, 'bet '],
    [/Jornada/g, 'Matchday'],
    [/Grupo/g, 'Group'],
    [/es el Profeta del Mundial!/g, 'is the World Cup Prophet!'],
    [/El Tesorero (.+?) realizará las transferencias en los próximos 3 días\./g, 'Treasurer $1 will make the transfers within the next 3 days.'],
    [/lo estará vigilando/g, 'will be watching'],
    [/firma /g, 'signature '],
    [/los tres/g, 'all three'],
    // fechas: días y meses abreviados (es-CL). Días primero (mar=martes).
    [/\blun\b/g, 'Mon'], [/\bmar\b/g, 'Tue'], [/\bmié\b/g, 'Wed'], [/\bjue\b/g, 'Thu'],
    [/\bvie\b/g, 'Fri'], [/\bsáb\b/g, 'Sat'], [/\bdom\b/g, 'Sun'],
    [/\bene\b/g, 'Jan'], [/\bfeb\b/g, 'Feb'], [/\babr\b/g, 'Apr'], [/\bmay\b/g, 'May'],
    [/\bjun\b/g, 'Jun'], [/\bjul\b/g, 'Jul'], [/\bago\b/g, 'Aug'], [/\bsept?\b/g, 'Sep'],
    [/\boct\b/g, 'Oct'], [/\bnov\b/g, 'Nov'], [/\bdic\b/g, 'Dec'],
    [/\bjunio\b/g, 'June'], [/\bjulio\b/g, 'July'],
  ];
  var RULES_PT = [
    [/Equipo (Zayu|Maple|Clutch)/g, 'Time $1'],
    [/🎽 DT:/g, '🎽 Téc.:'],
    [/DT:/g, 'Téc.:'],
    [/\bDT\b/g, 'Téc.'],
    [/Ver ficha de /g, 'Ver ficha de '],
    [/🌍 Ver Grupo /g, '🌍 Ver Grupo '],
    [/Ver Grupo /g, 'Ver Grupo '],
    [/👥 Ver jugadores/g, '👥 Ver jogadores'],
    [/Fase de grupos · Jornada/g, 'Fase de grupos · Rodada'],
    [/Árbitros designados/g, 'Árbitros designados'],
    [/Árbitros/g, 'Árbitros'],
    [/Once titular/g, 'Time titular'],
    [/Suplentes/g, 'Reservas'],
    [/Jugadores convocados/g, 'Jogadores convocados'],
    [/participantes sin pronosticar/g, 'participantes sem palpite'],
    [/Resultado /g, 'Resultado '],
    [/Bloqueado/g, 'Bloqueado'],
    [/ pendientes/g, ' pendentes'],
    [/Exacto/g, 'Exato'], [/Ganador/g, 'Vencedor'], [/Incorrecto/g, 'Errado'],
    [/aciertos/g, 'acertos'],
    [/Varias sedes/g, 'Vários locais'], [/ partidos/g, ' jogos'], [/ partido\b/g, ' jogo'],
    [/Tabla/g, 'Tabela'],
    [/Gestión de usuarios/g, 'Gestão de usuários'], [/Gestión de liga/g, 'Gestão de liga'],
    [/Gestión de /g, 'Gestão de '],
    [/próximamente en esta fase/g, 'em breve nesta fase'],
    [/— Pago confirmado por Tesorero/g, '— Pagamento confirmado pelo Tesoureiro'],
    [/Pago confirmado por Tesorero/g, 'Pagamento confirmado pelo Tesoureiro'],
    [/Pago confirmado ·/g, 'Pagamento confirmado ·'],
    [/Reglamento aceptado por (\d+\/\d+) miembros/g, 'Regulamento aceito por $1 membros'],
    [/Liga creada · Entrada (.+?) · (\d+) miembros/g, 'Liga criada · Inscrição $1 · $2 membros'],
    [/miembros aceptaron el reglamento/g, 'membros aceitaram o regulamento'],
    [/(\d+\/\d+) miembros/g, '$1 membros'],
    [/Apostador /g, 'Apostador '],
    [/^Tú · /g, 'Você · '],
    [/^era /g, 'era '],
    [/ · pronosticó /g, ' · palpitou '],
    [/pronosticó /g, 'palpitou '],
    [/aposté /g, 'apostei '],
    [/Jornada/g, 'Rodada'],
    [/Grupo/g, 'Grupo'],
    [/es el Profeta del Mundial!/g, 'é o Profeta da Copa!'],
    [/El Tesorero (.+?) realizará las transferencias en los próximos 3 días\./g, 'O Tesoureiro $1 fará as transferências nos próximos 3 dias.'],
    [/lo estará vigilando/g, 'estará de olho'],
    [/firma /g, 'assinatura '],
    [/los tres/g, 'os três'],
    [/\blun\b/g, 'seg'], [/\bmar\b/g, 'ter'], [/\bmié\b/g, 'qua'], [/\bjue\b/g, 'qui'],
    [/\bvie\b/g, 'sex'], [/\bsáb\b/g, 'sáb'], [/\bdom\b/g, 'dom'],
    [/\bene\b/g, 'jan'], [/\bfeb\b/g, 'fev'], [/\babr\b/g, 'abr'], [/\bmay\b/g, 'mai'],
    [/\bjun\b/g, 'jun'], [/\bjul\b/g, 'jul'], [/\bago\b/g, 'ago'], [/\bsept?\b/g, 'set'],
    [/\boct\b/g, 'out'], [/\bnov\b/g, 'nov'], [/\bdic\b/g, 'dez'],
    [/\bjunio\b/g, 'junho'], [/\bjulio\b/g, 'julho'],
  ];

  var C = LANG === 'pt' ? COUNTRIES_PT : COUNTRIES_EN;
  var D = LANG === 'pt' ? DICT_PT : DICT_EN;
  var R = LANG === 'pt' ? RULES_PT : RULES_EN;

  // Regex combinado de países (más largos primero) para frases compuestas
  var cnames = Object.keys(C).sort(function (a, b) { return b.length - a.length; });
  var COUNTRY_RE = new RegExp('(' + cnames.map(esc).join('|') + ')', 'g');
  var hasLetter = /[A-Za-zÀ-ÿ]/;

  function pad(orig, val) {
    var lead = (orig.match(/^\s*/) || [''])[0];
    var trail = (orig.match(/\s*$/) || [''])[0];
    return lead + val + trail;
  }

  function T(s) {
    if (typeof s !== 'string' || !s || !hasLetter.test(s)) return s;
    var key = s.trim();
    if (!key) return s;
    if (D[key] != null) return pad(s, D[key]);          // frase/fragmento exacto
    if (C[key] != null) return pad(s, C[key]);          // país exacto
    var out = s;
    for (var i = 0; i < R.length; i++) out = out.replace(R[i][0], R[i][1]);  // reglas
    out = out.replace(COUNTRY_RE, function (m) { return C[m] || m; });        // países en compuestos
    return out;
  }
  window.MB_T = T;

  // ── Parche de React.createElement: traduce texto e ciertos
  //    atributos SOLO en elementos DOM (type string) para evitar
  //    doble traducción al pasar por componentes intermedios. ──
  var _ce = React.createElement;
  var ATTRS = ['title', 'placeholder', 'alt', 'aria-label'];
  React.createElement = function (type, props) {
    var args = arguments;
    if (typeof type === 'string') {
      var n = args.length;
      var newArgs = null;
      // atributos
      if (props && typeof props === 'object') {
        var np = null;
        for (var a = 0; a < ATTRS.length; a++) {
          var k = ATTRS[a];
          if (typeof props[k] === 'string' && hasLetter.test(props[k])) {
            if (!np) { np = {}; for (var key in props) np[key] = props[key]; }
            np[k] = T(props[k]);
          }
        }
        if (np) { newArgs = Array.prototype.slice.call(args); newArgs[1] = np; }
      }
      // hijos string
      for (var i = 2; i < n; i++) {
        if (typeof args[i] === 'string' && hasLetter.test(args[i])) {
          if (!newArgs) newArgs = Array.prototype.slice.call(args);
          newArgs[i] = T(args[i]);
        }
      }
      if (newArgs) return _ce.apply(React, newArgs);
    }
    return _ce.apply(React, args);
  };

  // Título del documento
  try {
    document.title = LANG === 'pt' ? 'MundialBet Club 2026 — Bolão da Copa'
      : 'MundialBet Club 2026 — World Cup pool';
  } catch (e) {}
})();
