/* ============================================================
   MundialBet Club 2026 — Apuesta al ganador del partido (1·X·2)
   Componente reutilizable window.MB_BetBox({ m }) que se inserta
   tanto en la card de partido móvil como en la de escritorio.
   Lee cuotas reales de la colección `odds` y registra la apuesta
   con MBFirebase.placeBet / cancelBet (saldo en puntos virtuales).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};
  const MIN_BET = 1000;
  const SALDO_INICIAL = 90000;
  const BET_GRACE_MS = 5 * 60 * 1000; // margen: se puede cambiar/cancelar hasta 5 min después del kickoff
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  // Marcador exacto opcional guardado en la apuesta (si lo llenaste al apostar).
  const exactLabel = (bet) => (bet && typeof bet.exactHome === 'number' && typeof bet.exactAway === 'number')
    ? (' · 🎯 ' + bet.exactHome + '-' + bet.exactAway) : '';

  // ── Puntaje del jugador para rankings ──────────────────────────────────────
  // PATRIMONIO = saldo disponible + puntos EN JUEGO (apuestas abiertas todavía
  // sin resolver). Los puntos apostados siguen siendo tuyos hasta que el partido
  // se liquide, así que el ranking debe contarlos: de lo contrario, el que más
  // apuesta parece "perder" aunque acierte. El agente devuelve `staked` al liquidar
  // (agent/index.js), así que no hay doble conteo. Helpers globales para toda la app:
  window.MB_avail = (u) => (u && typeof u.saldo === 'number') ? u.saldo : SALDO_INICIAL;   // disponible (para apostar)
  window.MB_staked = (u) => (u && typeof u.staked === 'number' && u.staked > 0) ? u.staked : 0; // en juego
  window.MB_worth = (u) => window.MB_avail(u) + window.MB_staked(u);                        // patrimonio (ranking)

  // ── Store compartido: una sola suscripción a cuotas + mis apuestas + mi saldo ──
  const STREAK_MULT = (s) => s >= 7 ? 2.0 : s >= 5 ? 1.75 : s >= 4 ? 1.5 : s >= 3 ? 1.35 : s >= 2 ? 1.2 : s >= 1 ? 1.1 : 1.0;
  window.MB_streakMult = STREAK_MULT;

  const store = { odds: {}, bets: {}, parlays: [], dynFixtures: [], saldo: null, streak: 0, watch: [], notif: false, ready: false, listeners: new Set() };
  function emit() { store.listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }
  let started = false, unsubs = [];
  // (Re)crea las suscripciones a cuotas/apuestas/saldo. Las cuotas requieren
  // sesión (reglas), por eso hay que rehacerlas cuando la sesión esté lista.
  function resubscribe() {
    unsubs.forEach((u) => { try { if (typeof u === 'function') u(); } catch (e) {} });
    unsubs = [];
    const fb = FB();
    if (fb.subscribeOdds) unsubs.push(fb.subscribeOdds((o) => {
      store.odds = o || {};
      store.ready = true;
      // Deriva dynFixtures de los docs de odds que tienen metadata de fixture dinámica.
      // El agente escribe _homeCode/_awayCode/_kickoff en odds al cargar fixtures de la
      // colección `fixtures`, que no tiene regla de lectura para clientes.
      const derived = Object.entries(o || {})
        .filter(([, d]) => d._homeCode && d._awayCode && d._kickoff)
        .map(([id, d]) => ({ id, home: d._home || '', away: d._away || '', homeCode: d._homeCode, awayCode: d._awayCode, kickoff: d._kickoff, stage: d._stage || 'r16' }));
      if (derived.length > 0) { store.dynFixtures = derived; window.MB_dynFixtures = derived; }
      emit();
    }));
    if (fb.subscribeMyBets) unsubs.push(fb.subscribeMyBets((list) => {
      const map = {}, all = {};
      (list || []).forEach((b) => {
        if (!map[b.matchId]) map[b.matchId] = b;
        if (!all[b.matchId]) all[b.matchId] = [];
        all[b.matchId].push(b);
      });
      store.bets = map; store.allBets = all; emit();
    }));
    if (fb.subscribeMyParlays) unsubs.push(fb.subscribeMyParlays((list) => { store.parlays = list || []; emit(); }));
    if (fb.subscribeMe) unsubs.push(fb.subscribeMe((u) => {
      store.saldo = (u && typeof u.saldo === 'number') ? u.saldo : (u ? SALDO_INICIAL : null);
      store.streak = (u && typeof u.currentStreak === 'number') ? u.currentStreak : 0;
      store.watch = (u && Array.isArray(u.watchMatches)) ? u.watchMatches : [];
      store.notif = !!(u && u.notifEnabled); emit();
    }));
  }
  function start() {
    if (started) return; started = true;
    const fb = FB();
    // Reconecta en CADA cambio de sesión (login / logout / restauración al cargar).
    // Así las cuotas se cargan cuando Firebase ya restauró la sesión, no antes.
    if (fb.onAuth) { fb.onAuth(function () { store.bets = {}; store.allBets = {}; store.parlays = []; store.saldo = null; store.watch = []; emit(); resubscribe(); }); }
    else { resubscribe(); }
  }
  // Si cambia el apodo, refrescamos también.
  window.addEventListener('mb-auth-refresh', function () { resubscribe(); });

  function useBetStore() {
    const [, force] = useState(0);
    useEffect(() => {
      start();
      const fn = () => force((x) => x + 1);
      store.listeners.add(fn);
      return () => { store.listeners.delete(fn); };
    }, []);
    return store;
  }
  window.MB_useBetStore = useBetStore;

  // Tabla de posiciones por grupo, calculada desde los partidos TERMINADOS (odds).
  // Devuelve { A: [filas...], B: [...] } con j/g/e/p/gf/gc/dg/pts y posición ordenada.
  window.MB_standings = function (odds) {
    odds = odds || {};
    const GS = (window.MB && window.MB.GROUP_STANDINGS) || {};
    const FX = (window.MB && window.MB.WC_FIXTURES) || (window.MB_WC && window.MB_WC.FIXTURES) || [];
    const out = {};
    Object.keys(GS).forEach(function (letter) {
      const stat = {};
      GS[letter].forEach(function (t) { stat[t.name] = Object.assign({}, t, { j: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }); });
      FX.forEach(function (f) {
        if (f.group !== letter) return;
        const o = odds[f.id];
        if (!o || o.gh == null || o.ga == null) return;
        const isLive = !!o.live && !o.finished;
        if (!o.finished && !isLive) return; // cuenta terminados y EN VIVO (provisional)
        const H = stat[f.home], A = stat[f.away];
        if (!H || !A) return;
        const gh = o.gh, ga = o.ga;
        H.j++; A.j++; H.gf += gh; H.gc += ga; A.gf += ga; A.gc += gh;
        if (gh > ga) { H.g++; A.p++; H.pts += 3; }
        else if (gh < ga) { A.g++; H.p++; A.pts += 3; }
        else { H.e++; A.e++; H.pts += 1; A.pts += 1; }
        if (isLive) { H.live = true; A.live = true; }
      });
      const rows = Object.keys(stat).map(function (k) { const r = stat[k]; r.dg = r.gf - r.gc; return r; });
      rows.sort(function (a, b) { return (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf) || String(a.name).localeCompare(b.name); });
      rows.forEach(function (r, i) { r.pos = i + 1; });
      out[letter] = rows;
    });
    return out;
  };

  const ERRORS = {
    'min-1000': 'La apuesta mínima es 1.000.',
    'cerrado': 'El partido ya comenzó.',
    'sin-cuota': 'Aún no hay cuotas para este partido.',
    'saldo-insuficiente': 'No tienes saldo suficiente.',
    'no-auth': 'Inicia sesión para apostar.',
    'pick-invalido': 'Selección inválida.',
  };

  const KO_STAGES = new Set(['r32', 'r16', 'qf', 'sf', 'final']);
  const isKO = (m) => KO_STAGES.has(m && m.stage);
  const DRAW_LABEL = (m) => isKO(m) ? 'Prórr./Pen.' : 'Empate';
  const PICK_LABEL = (m, k) => (k === 'home' ? m.home : k === 'away' ? m.away : DRAW_LABEL(m));

  // Lista de goleadores (bandera + nombre + minuto). odds.scorers viene del agente (ESPN).
  const scorersEl = (list) => {
    if (!list || !list.length) return null;
    return (
      <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {list.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-2xs)' }}>
            <span style={{ fontSize: 10, flexShrink: 0 }}>⚽</span>
            {g.code && <img src={'https://flagcdn.com/h20/' + g.code + '.png'} alt="" style={{ height: 11, width: 'auto', borderRadius: 1, flexShrink: 0 }} />}
            <span style={{ color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}{g.og ? ' (e.c.)' : ''}{g.pen ? ' (pen)' : ''}</span>
            <span className="num" style={{ color: 'var(--muted-2)', marginLeft: 'auto', flexShrink: 0 }}>{g.minute}</span>
          </div>
        ))}
      </div>
    );
  };

  // Lista de tarjetas amarillas/rojas (rectángulo de color + bandera + nombre + minuto).
  // odds.cards viene del agente (ESPN), si el feed las incluye.
  const cardsEl = (list) => {
    if (!list || !list.length) return null;
    return (
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {list.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-2xs)' }}>
            <span style={{ width: 9, height: 12, borderRadius: 1.5, background: c.red ? '#e5484d' : '#f2c94c', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
            {c.code && <img src={'https://flagcdn.com/h20/' + c.code + '.png'} alt="" style={{ height: 11, width: 'auto', borderRadius: 1, flexShrink: 0 }} />}
            <span style={{ color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}{c.red ? ' 🟥' : ''}</span>
            <span className="num" style={{ color: 'var(--muted-2)', marginLeft: 'auto', flexShrink: 0 }}>{c.minute}</span>
          </div>
        ))}
      </div>
    );
  };

  // Detalle pateador a pateador de la tanda de penales (✓/✗ + bandera + nombre).
  // odds.penKicks viene del agente (ESPN), si el feed lo incluye; si no, se omite.
  const penKicksEl = (list) => {
    if (!list || !list.length) return null;
    return (
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {list.map((k, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-2xs)' }}>
            <span style={{ fontSize: 10, flexShrink: 0 }}>{k.scored ? '✅' : '❌'}</span>
            {k.code && <img src={'https://flagcdn.com/h20/' + k.code + '.png'} alt="" style={{ height: 11, width: 'auto', borderRadius: 1, flexShrink: 0 }} />}
            <span style={{ color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.name}</span>
            <span style={{ color: k.scored ? 'var(--success)' : '#e98b8b', fontWeight: 700, marginLeft: 'auto', flexShrink: 0 }}>{k.scored ? 'Gol' : 'Falló'}</span>
          </div>
        ))}
      </div>
    );
  };

  // ── Caja de apuesta (1·X·2) ──
  function BetBox({ m, compact }) {
    const s = useBetStore();
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const odds = s.odds[m.id] || null;
    const myBets = (s.allBets && s.allBets[m.id]) || (s.bets[m.id] ? [s.bets[m.id]] : []);
    const bet = myBets.find(b => b && b.status === 'open') || myBets[0] || null;
    const saldo = s.saldo;
    const closed = new Date(m.kickoff).getTime() + BET_GRACE_MS <= Date.now();

    const [sel, setSel] = useState(null);
    const [stake, setStake] = useState(MIN_BET);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');
    const [exactH, setExactH] = useState('');
    const [exactA, setExactA] = useState('');
    const [exactBet, setExactBet] = useState(MIN_BET); // stake separado para la apuesta del marcador exacto
    const [allInArm, setAllInArm] = useState(false); // primer toque activa, segundo dispara

    // Al elegir un resultado, pre-rellena un monto SUGERIDO (~25% de tu saldo,
    // redondeado), si el monto actual era el mínimo por defecto o no alcanza.
    useEffect(() => {
      if (!sel) return;
      const maxS = typeof saldo === 'number' ? saldo : SALDO_INICIAL;
      if (maxS < MIN_BET) return;
      const sugg = Math.min(Math.floor(maxS), Math.max(MIN_BET, Math.round((maxS * 0.25) / 1000) * 1000));
      setStake((cur) => (cur === MIN_BET || cur > maxS) ? sugg : cur);
    }, [sel]);

    if (!user) return null; // solo apostadores logueados ven la caja

    // Partido TERMINADO: muestra el marcador final (y el resultado de tu apuesta si jugaste).
    const finished = odds && odds.finished;
    if (finished) {
      const gh = (odds.gh != null) ? odds.gh : '–';
      const ga = (odds.ga != null) ? odds.ga : '–';
      const onPens = !!odds.penWinner;
      const wentET = !onPens && !!odds.extraTime;
      const advances = onPens ? (odds.penWinner === 'home' ? m.home : m.away) : null;
      return (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)' }}>
            <span style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏁 Final{onPens ? ' · Penales' : wentET ? ' · Prórroga' : ''}</span>
            <span className="num" style={{ fontSize: 'var(--t-lg)', fontWeight: 800, color: 'var(--text)' }}>{gh} <span style={{ color: 'var(--muted-2)' }}>–</span> {ga}</span>
          </div>
          {onPens && (
            <div style={{ marginTop: 6, padding: '6px 11px', borderRadius: 'var(--r-md)', border: '1px solid rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 'var(--t-2xs)', fontWeight: 700, color: 'var(--gold-light)' }}>⚽ {advances} avanza por penales</span>
                {odds.penScore && <span className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: 'var(--gold-light)', flexShrink: 0 }}>{odds.penScore.home}–{odds.penScore.away}</span>}
              </div>
              {penKicksEl(odds.penKicks)}
            </div>
          )}
          {scorersEl(odds.scorers)}
          {cardsEl(odds.cards)}
          {myBets.filter(b => b && (b.status === 'won' || b.status === 'lost')).map((b, i) => {
            const bWon = b.status === 'won';
            return (
              <div key={b.id || i} style={{ marginTop: 6, padding: '7px 11px', borderRadius: 'var(--r-md)', border: '1px solid ' + (bWon ? 'rgba(46,160,67,0.5)' : 'rgba(220,80,80,0.4)'), background: bWon ? 'var(--success-bg)' : 'rgba(220,80,80,0.10)', fontSize: 'var(--t-2xs)', fontWeight: 700, color: bWon ? 'var(--success)' : '#e98b8b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>{bWon ? '✓ Ganaste' : '✕ Perdiste'} · {PICK_LABEL(m, b.pick)} @ {Number(b.odd).toFixed(2)}{exactLabel(b)}{bWon && b.streakMult > 1 ? ' 🔥×' + Number(b.streakMult).toFixed(2) : ''}</span>
                <span className="num">{bWon ? '+' + fmt(b.payout || Math.round(b.stake * b.odd)) : '−' + fmt(b.stake)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Partido EN VIVO: el agente lo marcó live, o ya pasó el kickoff por reloj
    // (ventana de ~2.5h) y aún no está terminado. Así aparece apenas empieza.
    const _ko = new Date(m.kickoff).getTime();
    const clockLive = Date.now() >= _ko + BET_GRACE_MS && Date.now() < _ko + MATCH_MS; // tras cerrar apuestas
    const live = (odds && odds.live) || clockLive;
    if (live) {
      const gh = (odds && odds.gh != null) ? odds.gh : 0;
      const ga = (odds && odds.ga != null) ? odds.ga : 0;
      const minute = odds && odds.minute;
      return (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 'var(--r-md)', border: '1px solid rgba(220,80,80,0.5)', background: 'rgba(220,80,80,0.12)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#ff6b6b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5252', animation: 'mb-pulse-live 1s var(--ease-out) infinite' }} />EN VIVO{minute != null ? ' · ' + (typeof minute === 'number' ? minute + "'" : String(minute)) : ''}
            </span>
            <span className="num" style={{ fontSize: 'var(--t-lg)', fontWeight: 800, color: 'var(--text)' }}>{gh} <span style={{ color: 'var(--muted-2)' }}>–</span> {ga}</span>
          </div>
          {scorersEl(odds && odds.scorers)}
          {cardsEl(odds && odds.cards)}
          {myBets.filter(b => b && b.status === 'open').map((b, i) => (
            <div key={b.id || i} style={{ marginTop: 6, fontSize: 'var(--t-2xs)', color: 'var(--muted)', textAlign: 'center' }}>Tu apuesta: <span style={{ color: 'var(--info)', fontWeight: 700 }}>{PICK_LABEL(m, b.pick)}</span> · {fmt(b.stake)} @ {Number(b.odd).toFixed(2)}{exactLabel(b)}</div>
          ))}
        </div>
      );
    }

    // Resultado ya liquidado (por si el marcador aún no llegó pero la apuesta sí)
    if (bet && bet.status && bet.status !== 'open') {
      return (
        <div style={{ marginTop: 10 }}>
          {myBets.filter(b => b && b.status !== 'open').map((b, i) => {
            const bWon = b.status === 'won';
            return (
              <div key={b.id || i} style={{ marginTop: i > 0 ? 4 : 0, padding: '9px 11px', borderRadius: 'var(--r-md)', border: '1px solid ' + (bWon ? 'rgba(46,160,67,0.5)' : 'rgba(220,80,80,0.4)'), background: bWon ? 'var(--success-bg)' : 'rgba(220,80,80,0.10)', fontSize: 'var(--t-2xs)', fontWeight: 700, color: bWon ? 'var(--success)' : '#e98b8b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>{bWon ? '✓ Ganaste' : '✕ Perdiste'} · {PICK_LABEL(m, b.pick)} @ {Number(b.odd).toFixed(2)}</span>
                <span className="num">{bWon ? '+' + fmt(Math.round(b.stake * b.odd)) : '−' + fmt(b.stake)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // ¿El marcador exacto que escribiste es compatible con el pick (home/draw/away)?
    // Ej.: si apostaste a que gana Noruega (away), un marcador con más goles locales
    // no puede pasar nunca (sería ganar Costa de Marfil), así que no dejamos enviarlo.
    const exactContradicts = (pick, eh, ea) => {
      if (eh == null || ea == null || isNaN(eh) || isNaN(ea) || !pick) return false;
      if (pick === 'home') return eh <= ea;
      if (pick === 'away') return eh >= ea;
      return eh !== ea; // 'draw' (empate o, en eliminatoria, definición por prórroga/penales)
    };

    const place = (pick) => {
      const eh = (exactH !== '' && exactH != null) ? parseInt(exactH, 10) : null;
      const ea = (exactA !== '' && exactA != null) ? parseInt(exactA, 10) : null;
      const hasExact = eh != null && ea != null && !isNaN(eh) && !isNaN(ea);
      if (hasExact && exactContradicts(pick, eh, ea)) {
        setErr('Ese marcador exacto no es compatible con tu apuesta a ' + PICK_LABEL(m, pick) + '.');
        return;
      }
      setErr(''); setOk(''); setBusy(true); setAllInArm(false);
      FB().placeBet(m, pick, stake, hasExact ? eh : null, hasExact ? ea : null, hasExact ? exactBet : 0)
        .then(() => { setOk('¡Apuesta registrada!'); setSel(null); setExactH(''); setExactA(''); setExactBet(MIN_BET); })
        .catch((e) => {
          const code = (e && e.code) || e;
          setErr(ERRORS[code] || ('No se pudo: ' + ((e && e.message) || code)));
          console.error('[MundialBet] placeBet falló:', e);
        })
        .then(() => setBusy(false));
    };
    const cancel = (betId) => {
      setErr(''); setOk(''); setBusy(true);
      FB().cancelBet(betId).catch(() => {}).then(() => setBusy(false));
    };

    const openBets_m = myBets.filter(b => b && b.status === 'open');

    if (closed) {
      if (openBets_m.length === 0) return <div style={{ marginTop: 10, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center' }}>🔒 Apuestas cerradas</div>;
      return (
        <div style={{ marginTop: 10 }}>
          {openBets_m.map((b) => (
            <div key={b.id || b.pick} style={{ padding: '8px 11px', borderRadius: 'var(--r-md)', border: '1px solid rgba(74,144,226,0.4)', background: 'rgba(74,144,226,0.10)', marginBottom: 4, fontSize: 'var(--t-2xs)', fontWeight: 700, color: 'var(--text)' }}>
              Tu apuesta: <span style={{ color: 'var(--info)' }}>{PICK_LABEL(m, b.pick)}</span> · {fmt(b.stake)} @ {Number(b.odd).toFixed(2)}{exactLabel(b)}
              <div style={{ fontSize: 9, color: 'var(--muted-2)', marginTop: 3 }}>Cerrada · esperando resultado</div>
            </div>
          ))}
        </div>
      );
    }
    if (!odds || (!odds.home && !odds.draw && !odds.away)) {
      return <div style={{ marginTop: 10, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center', fontStyle: 'italic' }}>💱 Cuotas próximamente…</div>;
    }

    const picks = [
      { k: 'home', label: m.home, odd: odds.home },
      { k: 'draw', label: DRAW_LABEL(m), odd: odds.draw },
      { k: 'away', label: m.away, odd: odds.away },
    ];
    const selOdd = sel ? Number((picks.find((p) => p.k === sel) || {}).odd || 0) : 0;
    const win = selOdd ? Math.round(stake * selOdd) : 0;
    const maxSaldo = (typeof saldo === 'number' ? saldo : SALDO_INICIAL);
    const exactHNum = exactH !== '' ? parseInt(exactH, 10) : null;
    const exactANum = exactA !== '' ? parseInt(exactA, 10) : null;
    const hasExactInput = exactHNum != null && exactANum != null && !isNaN(exactHNum) && !isNaN(exactANum);
    const exactBad = hasExactInput && exactContradicts(sel, exactHNum, exactANum);

    return (
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        {openBets_m.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {openBets_m.map((b) => (
              <div key={b.id || b.pick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 9px', borderRadius: 'var(--r-md)', border: '1px solid rgba(74,144,226,0.4)', background: 'rgba(74,144,226,0.08)', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--text)', fontWeight: 700 }}>
                  <span style={{ color: 'var(--info)' }}>{PICK_LABEL(m, b.pick)}</span> · {fmt(b.stake)} @ {Number(b.odd).toFixed(2)}{exactLabel(b)}
                  <span style={{ color: 'var(--success)', marginLeft: 6 }}>↑ {fmt(Math.round(b.stake * b.odd))}</span>
                </span>
                <button onClick={() => cancel(b.id || (b.uid + '_' + m.id))} disabled={busy} className="mb-press" style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✕</button>
              </div>
            ))}
            <div style={{ fontSize: 8.5, color: 'var(--muted-2)', marginBottom: 6, textAlign: 'center', fontStyle: 'italic' }}>+ Agregar otra apuesta al mismo partido</div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Apuesta al ganador</span>
          {typeof saldo === 'number' && <span className="num" style={{ fontSize: 9, color: 'var(--muted)' }}>Saldo: <span style={{ color: 'var(--gold-light)' }}>{fmt(saldo)}</span></span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {picks.map((p) => {
            const active = sel === p.k;
            const has = p.odd != null;
            return (
              <button key={p.k} disabled={!has || busy} onClick={() => { setSel(active ? null : p.k); setErr(''); setOk(''); }} className="mb-press" style={{
                flex: 1, minWidth: 0, padding: '6px 4px', cursor: has ? 'pointer' : 'default', borderRadius: 'var(--r-md)',
                background: active ? 'var(--coin-bg)' : 'var(--surface-2)', border: active ? '1.5px solid var(--gold)' : '1px solid var(--border-2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: has ? 1 : 0.4,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: active ? 'var(--gold-light)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.k === 'draw' ? DRAW_LABEL(m) : (p.k === 'home' ? '🏠 ' : '✈ ') + p.label}</span>
                <span className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: active ? 'var(--gold-light)' : 'var(--text)' }}>{has ? Number(p.odd).toFixed(2) : '—'}</span>
              </button>
            );
          })}
        </div>

        {/* ── Consenso: % de apostadores en cada pick (calculado por el agente) ── */}
        {(() => {
          const c = odds && odds.consensus;
          const total = c ? (c.home || 0) + (c.draw || 0) + (c.away || 0) : 0;
          if (total < 3) return null; // muestra muy chica: no vale la pena mostrarlo
          const pct = (n) => Math.round(((n || 0) / total) * 100);
          return (
            <div style={{ marginTop: 7 }}>
              <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', background: 'var(--surface-2)' }}>
                <div style={{ width: pct(c.home) + '%', background: 'var(--info)' }} />
                <div style={{ width: pct(c.draw) + '%', background: 'var(--muted-2)' }} />
                <div style={{ width: pct(c.away) + '%', background: 'var(--gold)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 7.5, color: 'var(--muted-2)', fontWeight: 700 }}>
                <span>{pct(c.home)}% {m.home}</span>
                <span>👥 {total}</span>
                <span>{pct(c.away)}% {m.away}</span>
              </div>
            </div>
          );
        })()}

        {isKO(m) && (
          <div style={{ marginTop: 6, fontSize: 8.5, color: 'var(--muted-2)', lineHeight: 1.5, padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)' }}>
            <strong style={{ color: 'var(--muted)' }}>Fase eliminatoria:</strong> no hay empates · «Prórr./Pen.» gana si el partido no se decide en los 90 min
          </div>
        )}

        {sel && maxSaldo < MIN_BET && (
          <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 'var(--r-md)', background: 'rgba(220,80,80,0.10)', border: '1px solid rgba(220,80,80,0.4)', fontSize: 'var(--t-2xs)', color: '#e98b8b', fontWeight: 700, lineHeight: 1.4 }}>
            Te quedan <span className="num">{fmt(Math.floor(maxSaldo))}</span> disponibles y el mínimo para apostar es <span className="num">{fmt(MIN_BET)}</span>. Espera a que se resuelvan tus apuestas en juego para recuperar saldo.
          </div>
        )}
        {sel && maxSaldo >= MIN_BET && (
          <div style={{ marginTop: 10, animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Monto a apostar</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setStake((a) => Math.max(MIN_BET, a - 1000))} className="mb-press" style={stepBtn}>−</button>
                <input type="number" value={stake} min={MIN_BET} step={1000}
                  onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  style={{ width: 78, textAlign: 'center', fontWeight: 800, color: 'var(--gold-light)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '5px 4px', fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--t-sm)' }} />
                <button onClick={() => setStake((a) => a + 1000)} className="mb-press" style={stepBtn}>+</button>
              </div>
            </div>
            {(() => {
              // Montos sugeridos adaptados a TU saldo disponible (10% / 25% / 50%),
              // redondeados a 1.000, válidos (≥ mínimo y ≤ saldo). El ~25% va marcado 💡.
              const affordable = Math.floor(maxSaldo);
              const round1k = (v) => Math.round(v / 1000) * 1000;
              const cands = affordable >= MIN_BET
                ? Array.from(new Set([0.1, 0.25, 0.5].map((p) => Math.min(affordable, Math.max(MIN_BET, round1k(affordable * p)))))).filter((v) => v >= MIN_BET && v <= affordable).sort((a, b) => a - b)
                : [];
              const suggested = cands.length ? cands[Math.min(1, cands.length - 1)] : null;
              if (!cands.length) return null;
              return (
                <div style={{ display: 'flex', gap: 5, marginBottom: 9, flexWrap: 'wrap' }}>
                  {cands.map((v) => (
                    <button key={v} onClick={() => setStake(v)} className="mb-press" title={v === suggested ? 'Te sugerimos este monto' : undefined} style={chipBtn(stake === v)}>{v === suggested ? '💡 ' : ''}{fmt(v)}</button>
                  ))}
                  <button onClick={() => setStake(affordable)} className="mb-press" style={chipBtn(stake === affordable)}>Todo</button>
                </div>
              );
            })()}
            {s.streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 9px', background: 'rgba(255,120,0,0.10)', border: '1px solid rgba(255,120,0,0.3)', borderRadius: 'var(--r-md)', marginBottom: 6 }}>
                <span style={{ fontSize: 8.5, color: '#ff9e57', fontWeight: 800 }}>🔥 Racha {s.streak} · ×{STREAK_MULT(s.streak).toFixed(2)}</span>
                {sel && <span className="num" style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 800 }}>+{fmt(Math.round(win * STREAK_MULT(s.streak)))}</span>}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 11px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)', marginBottom: 9 }}>
              <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)' }}>Ganancia base si aciertas</span>
              <span className="num" style={{ fontSize: 'var(--t-md)', fontWeight: 800, color: 'var(--success)' }}>{fmt(win)}</span>
            </div>

            {/* ── Marcador exacto: apuesta separada con cobro adicional (×10 si acierta) ── */}
            <div style={{ marginBottom: 9, padding: '9px 11px', background: 'rgba(97,218,251,0.04)', borderRadius: 'var(--r-md)', border: '1px dashed rgba(97,218,251,0.22)' }}>
              <div style={{ fontSize: 8.5, color: 'rgba(97,218,251,0.65)', fontWeight: 800, marginBottom: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>🎯 Marcador exacto (opcional)</span>
                <span style={{ color: 'var(--gold)', fontWeight: 800 }}>×10 si aciertas exacto</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <input type="number" min="0" max="20" value={exactH} onChange={(e) => setExactH(e.target.value)} placeholder="—"
                  style={{ width: 46, textAlign: 'center', fontWeight: 800, color: exactBad ? '#e98b8b' : '#61DAFB', background: 'var(--surface-2)', border: '1px solid ' + (exactBad ? 'rgba(220,80,80,0.5)' : 'rgba(97,218,251,0.35)'), borderRadius: 8, padding: '6px 4px', fontFamily: 'var(--font-mono,monospace)', fontSize: 'var(--t-md)', outline: 'none' }} />
                <span style={{ fontWeight: 800, color: 'var(--muted-2)', fontSize: 'var(--t-sm)' }}>–</span>
                <input type="number" min="0" max="20" value={exactA} onChange={(e) => setExactA(e.target.value)} placeholder="—"
                  style={{ width: 46, textAlign: 'center', fontWeight: 800, color: exactBad ? '#e98b8b' : '#61DAFB', background: 'var(--surface-2)', border: '1px solid ' + (exactBad ? 'rgba(220,80,80,0.5)' : 'rgba(97,218,251,0.35)'), borderRadius: 8, padding: '6px 4px', fontFamily: 'var(--font-mono,monospace)', fontSize: 'var(--t-md)', outline: 'none' }} />
              </div>
              {hasExactInput && exactBad && (
                <div style={{ fontSize: 8, color: '#e98b8b', fontWeight: 700, textAlign: 'center', marginTop: 5 }}>⚠ Ese marcador no es compatible con tu apuesta a {PICK_LABEL(m, sel)}. Ajústalo o bórralo.</div>
              )}
              {hasExactInput && !exactBad && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 8.5, color: 'rgba(97,218,251,0.65)', fontWeight: 700 }}>Apuesta al marcador exacto</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button onClick={() => setExactBet((v) => Math.max(MIN_BET, v - 1000))} className="mb-press" style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>−</button>
                      <span className="num" style={{ fontSize: 'var(--t-xs)', fontWeight: 800, color: '#61DAFB', minWidth: 52, textAlign: 'center' }}>{fmt(exactBet)}</span>
                      <button onClick={() => setExactBet((v) => Math.min(maxSaldo - stake, v + 1000))} className="mb-press" style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>+</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 9px', background: 'rgba(97,218,251,0.07)', borderRadius: 'var(--r-md)', fontSize: 8.5 }}>
                    <span style={{ color: 'var(--muted)' }}>Si sale {exactH}–{exactA} exacto:</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 800 }}>+{fmt(exactBet * 10)} pts adicionales</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 9px', fontSize: 8, color: 'var(--muted-2)' }}>
                    <span>Total a cobrar:</span>
                    <span className="num" style={{ fontWeight: 700 }}>{fmt(stake + exactBet)} pts</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── All-in especial para la Final ── */}
            {m.stage === 'final' && (
              <button onClick={() => {
                if (!allInArm) { setStake(maxSaldo); setAllInArm(true); return; }
                place(sel);
              }} disabled={busy || exactBad} className="mb-press"
                style={{ width: '100%', padding: '11px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', border: 'none', marginBottom: 7, background: allInArm ? 'linear-gradient(135deg,#e53935,#b71c1c)' : 'rgba(229,57,53,0.15)', color: allInArm ? '#fff' : '#ef9a9a', borderColor: 'rgba(229,57,53,0.5)' }}>
                {allInArm ? `🔥 ¡CONFIRMAR TODO (${fmt(maxSaldo)} pts)!` : '🔥 ALL IN — Apostar todo'}
              </button>
            )}

            <button onClick={() => place(sel)} disabled={busy || stake < MIN_BET || stake + (hasExactInput && !exactBad ? exactBet : 0) > maxSaldo || exactBad} className="mb-press" style={{
              width: '100%', padding: '10px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)',
              border: 'none', color: '#1a1206',
              background: (busy || stake < MIN_BET || stake + (hasExactInput && !exactBad ? exactBet : 0) > maxSaldo || exactBad) ? 'var(--surface-2)' : 'linear-gradient(180deg, var(--gold-light), var(--gold))',
              opacity: (busy || stake < MIN_BET || stake + (hasExactInput && !exactBad ? exactBet : 0) > maxSaldo || exactBad) ? 0.55 : 1,
            }}>{busy ? 'Registrando…' : 'Apostar · ' + PICK_LABEL(m, sel)}</button>
          </div>
        )}

        {err && <div style={{ marginTop: 8, fontSize: 'var(--t-2xs)', color: '#e98b8b', fontWeight: 700 }}>⚠ {err}</div>}
        {ok && <div style={{ marginTop: 8, fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 700 }}>✓ {ok}</div>}
      </div>
    );
  }

  const stepBtn = { width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 17, fontWeight: 700, cursor: 'pointer', lineHeight: 1, flexShrink: 0 };
  const chipBtn = (active) => ({ flex: 1, padding: '5px 2px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 9, border: active ? '1px solid var(--gold)' : '1px solid var(--border-2)', background: active ? 'var(--coin-bg)' : 'var(--surface-2)', color: active ? 'var(--gold-light)' : 'var(--muted)' });
  const miniBtn = (bd, col) => ({ flex: 1, padding: '6px 4px', borderRadius: 'var(--r-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)', border: '1px solid ' + bd, background: 'transparent', color: col });

  window.MB_BetBox = BetBox;

  // ── Campanita "seguir partido": avisos de ese partido (empieza pronto, apuestas
  // cerradas, goles en vivo y resultado final). Guarda el partido en watchMatches. ──
  function WatchBell({ matchId, compact }) {
    const s = useBetStore();
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const [busy, setBusy] = useState(false);
    if (!user || !matchId) return null;
    const odds = s.odds[matchId] || null;
    if (odds && odds.finished) return null; // no tiene sentido seguir un partido terminado
    const following = (s.watch || []).indexOf(matchId) !== -1;
    const toggle = () => {
      if (busy) return;
      setBusy(true);
      const ensure = (!following && FB().notifPermission && FB().notifPermission() !== 'granted')
        ? FB().enableNotifications().catch(() => {}) // si lo deniega, lo sigue igual (avisa al activar en Perfil)
        : Promise.resolve();
      ensure.then(() => FB().watchMatch(matchId, !following)).catch(() => {}).then(() => setBusy(false));
    };
    return (
      <button onClick={toggle} disabled={busy} className="mb-press"
        title={following ? 'Dejar de seguir este partido' : 'Avisarme de este partido (inicio, goles y resultado)'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--r-pill)',
          cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 9, lineHeight: 1, flexShrink: 0,
          border: '1px solid ' + (following ? 'var(--gold)' : 'var(--border-2)'),
          background: following ? 'var(--coin-bg)' : 'var(--surface-2)',
          color: following ? 'var(--gold-light)' : 'var(--muted)', opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap',
        }}>
        <span style={{ fontSize: 11 }}>{following ? '🔔' : '🔕'}</span>
        {!compact && <span>{following ? 'Siguiendo' : 'Avisarme'}</span>}
      </button>
    );
  }
  window.MB_WatchBell = WatchBell;

  // Badge de saldo real para la barra superior (móvil y web). Lee el saldo
  // en vivo del store; se oculta si no hay sesión.
  function SaldoBadge() {
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const s = useBetStore();
    if (!user) return null;
    const saldo = (typeof s.saldo === 'number') ? s.saldo : SALDO_INICIAL;
    return window.CoinBadge ? React.createElement(window.CoinBadge, { amount: saldo }) : <span className="num" style={{ color: 'var(--gold-light)', fontWeight: 800 }}>{fmt(saldo)}</span>;
  }
  window.MB_SaldoBadge = SaldoBadge;

  // ── Cuenta regresiva al próximo partido (se oculta si hay alguno EN VIVO) ──
  function NextMatchCountdown() {
    const bs = useBetStore();
    const staticFxNC = (window.MB && window.MB.WC_FIXTURES) || [];
    const dynFxNC = (window.MB_dynFixtures || []).filter(function(d) { return !staticFxNC.some(function(s) { return s.id === d.id; }); });
    const fx = staticFxNC.concat(dynFxNC);
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    // Si hay un partido en curso (live o por reloj), manda el bloque "EN VIVO": ocultamos la cuenta regresiva.
    const anyLive = (window.MB_liveMatches ? window.MB_liveMatches(bs.odds) : []).length > 0;
    if (anyLive) return null;
    const next = fx.filter((m) => new Date(m.kickoff).getTime() > now).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
    if (!next) return null;
    const diff = Math.max(0, new Date(next.kickoff).getTime() - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const mi = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const p2 = (n) => String(n).padStart(2, '0');
    const fecha = new Date(next.kickoff).toLocaleString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const Box = (props) => (
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 'var(--r-md)', padding: '8px 4px', textAlign: 'center' }}>
        <div className="num" style={{ fontSize: 'var(--t-2xl)', fontWeight: 800, color: 'var(--gold-light)', lineHeight: 1 }}>{props.v}</div>
        <div style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{props.l}</div>
      </div>
    );
    return (
      <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--sh-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 9, color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>⏱ Empieza en</span>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'capitalize' }}>{fecha}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.home}</span>
            <img src={`https://flagcdn.com/h40/${next.homeCode}.png`} alt="" style={{ height: 22, width: 'auto', borderRadius: 3, flexShrink: 0 }} />
          </div>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', fontWeight: 700, flexShrink: 0 }}>vs</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <img src={`https://flagcdn.com/h40/${next.awayCode}.png`} alt="" style={{ height: 22, width: 'auto', borderRadius: 3, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.away}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Box v={d} l="días" /><Box v={p2(h)} l="hrs" /><Box v={p2(mi)} l="min" /><Box v={p2(s)} l="seg" />
        </div>
      </div>
    );
  }
  window.MB_NextMatchCountdown = NextMatchCountdown;

  // Partidos EN CURSO: o el agente ya lo marcó live, o por RELOJ ya pasó el
  // kickoff y está dentro de la ventana de un partido (~2.5h) sin estar terminado.
  // Así el bloque "EN VIVO" aparece apenas empieza, sin esperar al agente/ESPN.
  const MATCH_MS = 150 * 60 * 1000;
  window.MB_liveMatches = function (oddsMap) {
    oddsMap = oddsMap || {};
    const staticFx = (window.MB && window.MB.WC_FIXTURES) || [];
    const dyn = (window.MB_dynFixtures || []).filter(function (d) { return !staticFx.some(function (s) { return s.id === d.id; }); });
    const fx = staticFx.concat(dyn);
    const now = Date.now();
    return fx.map((m) => ({ m: m, o: oddsMap[m.id] || {} })).filter(function (x) {
      if (x.o.finished) return false;
      if (x.o.live) return true;
      const ko = new Date(x.m.kickoff).getTime();
      return now >= ko + BET_GRACE_MS && now < ko + MATCH_MS;
    });
  };

  // ── Partidos EN VIVO ahora (para el Inicio, debajo de la cuenta regresiva) ──
  function LiveNow() {
    const s = useBetStore();
    const live = window.MB_liveMatches ? window.MB_liveMatches(s.odds) : [];
    if (!live.length) return null;
    const go = () => { if (window.__mbNav) window.__mbNav('partidos'); };
    const openTeam = (e, name, code) => { if (e) e.stopPropagation(); if (code && window.MB_openTeamByCode) { window.MB_openTeamByCode(code); return; } if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(name); };
    const minTxt = (o) => o.minute == null ? 'EN VIVO' : (typeof o.minute === 'number' ? o.minute + "'" : String(o.minute));
    return (
      <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(220,80,80,0.5)', borderRadius: 'var(--r-lg)', padding: '13px 16px', boxShadow: 'var(--sh-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5252', animation: 'mb-pulse-live 1s var(--ease-out) infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: '#ff6b6b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>En vivo ahora</span>
          <span className="num" style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginLeft: 'auto' }}>{live.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {live.map(({ m, o }) => (
            <div key={m.id} onClick={go} className="mb-press" title="Ver el partido" style={{ padding: '9px 11px', borderRadius: 'var(--r-md)', background: 'rgba(220,80,80,0.10)', border: '1px solid rgba(220,80,80,0.28)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div onClick={(e) => openTeam(e, m.home, m.homeCode)} title={'Ver ' + m.home} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.home}</span>
                  <img src={'https://flagcdn.com/h40/' + m.homeCode + '.png'} alt="" style={{ height: 18, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 52 }}>
                  <div className="num" style={{ fontSize: 'var(--t-lg)', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{o.gh != null ? o.gh : 0} <span style={{ color: 'var(--muted-2)' }}>-</span> {o.ga != null ? o.ga : 0}</div>
                  <div style={{ fontSize: 8.5, color: '#ff6b6b', fontWeight: 800, marginTop: 2, whiteSpace: 'nowrap' }}>🔴 {minTxt(o)}</div>
                </div>
                <div onClick={(e) => openTeam(e, m.away, m.awayCode)} title={'Ver ' + m.away} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <img src={'https://flagcdn.com/h40/' + m.awayCode + '.png'} alt="" style={{ height: 18, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.away}</span>
                </div>
              </div>
              {((o.scorers && o.scorers.length) || (o.cards && o.cards.length)) ? (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(220,80,80,0.20)' }}>
                  {scorersEl(o.scorers)}
                  {cardsEl(o.cards)}
                </div>
              ) : null}
              {(() => {
                const allM = (s.allBets && s.allBets[m.id]) || (s.bets[m.id] ? [s.bets[m.id]] : []);
                const openM = allM.filter(b => b && b.status === 'open');
                if (!openM.length) return null;
                return openM.map((bet, i) => (
                  <div key={bet.id || i} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(220,80,80,0.20)', fontSize: 'var(--t-2xs)', color: 'var(--muted)', textAlign: 'center' }}>
                    Tu apuesta: <span style={{ color: 'var(--info)', fontWeight: 700 }}>{PICK_LABEL(m, bet.pick)}</span> · {fmt(bet.stake)} @ {Number(bet.odd).toFixed(2)}
                  </div>
                ));
              })()}
            </div>
          ))}
        </div>
      </div>
    );
  }
  window.MB_LiveNow = LiveNow;

  // ── Frase mundialera para el saludo del Inicio ──────────────────────────────
  // Devuelve una frase con onda según haya un partido EN VIVO o el próximo que
  // viene. Si no hay nada cerca, devuelve null (el Inicio usa su texto por defecto).
  // Estable por partido (no parpadea entre renders) gracias al hash del id.
  window.MB_homeVibe = function (oddsMap) {
    oddsMap = oddsMap || {};
    const staticFx = (window.MB && window.MB.WC_FIXTURES) || [];
    const dyn = (window.MB_dynFixtures || []).filter(function (d) { return !staticFx.some(function (s) { return s.id === d.id; }); });
    const fx = staticFx.concat(dyn);
    if (!fx.length) return null;
    const now = Date.now();
    const hash = (s) => { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
    const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
    const live = fx.find((m) => { const o = oddsMap[m.id]; return o && o.live && !o.finished; });
    if (live) {
      const o = oddsMap[live.id] || {};
      const sc = (o.gh != null ? o.gh : 0) + '–' + (o.ga != null ? o.ga : 0);
      const P = [
        '🔥 ¡' + live.home + ' vs ' + live.away + ' EN VIVO! A morderse las uñas',
        '📣 Rueda la pelota: ' + live.home + ' ' + sc + ' ' + live.away,
        '🍿 Pausa todo, se juega ' + live.home + ' vs ' + live.away,
        '⚽ ' + live.home + ' vs ' + live.away + ' en cancha… ¿quién la rompe?',
        '😱 ' + live.home + ' ' + sc + ' ' + live.away + ' ¡y todavía falta!',
      ];
      return pick(P, hash(live.id) + (o.gh || 0) * 7 + (o.ga || 0) * 13);
    }
    const next = fx.filter((m) => new Date(m.kickoff).getTime() > now).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
    if (next) {
      const hrs = (new Date(next.kickoff).getTime() - now) / 3600000;
      const soon = hrs <= 14;
      const Psoon = [
        '🍿 Hoy juega ' + next.home + ' vs ' + next.away + ', prepara los nervios',
        '⏳ Se viene ' + next.home + ' vs ' + next.away + '… ¿ya hiciste tu apuesta?',
        '🎯 ' + next.home + ' vs ' + next.away + ' a la vuelta de la esquina',
        '👀 Ojo que se acerca ' + next.home + ' vs ' + next.away,
      ];
      const Pfar = [
        '⚽ Lo próximo en el radar: ' + next.home + ' vs ' + next.away,
        '🔮 Calentando motores para ' + next.home + ' vs ' + next.away,
        '🧠 Ve pensando tu apuesta para ' + next.home + ' vs ' + next.away,
      ];
      return pick(soon ? Psoon : Pfar, hash(next.id));
    }
    return null;
  };

  // ── Botón para activar las notificaciones push ──
  const NERR = {
    'no-soportado': 'Tu navegador no soporta notificaciones.',
    'falta-vapid': 'Faltan configurar las notificaciones (clave VAPID).',
    'permiso-denegado': 'Diste permiso denegado. Actívalo en los ajustes del sitio.',
    'sin-token': 'No se pudo obtener el token de notificaciones.',
    'no-auth': 'Inicia sesión primero.',
  };
  function BellIcon({ variant, size }) {
    size = size || 18;
    var s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } };
    if (variant === 'granted') return (
      React.createElement('svg', Object.assign({}, s, { stroke: 'var(--success)' }),
        React.createElement('path', { d: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' }),
        React.createElement('path', { d: 'M13.73 21a2 2 0 01-3.46 0' }),
        React.createElement('circle', { cx: '17', cy: '7', r: '4', fill: 'var(--success)', stroke: 'none' }),
        React.createElement('polyline', { points: '15 7 16.5 8.5 19.5 5.5', stroke: '#fff', strokeWidth: '1.5' })
      )
    );
    if (variant === 'denied') return (
      React.createElement('svg', Object.assign({}, s, { stroke: 'var(--muted)' }),
        React.createElement('path', { d: 'M13.73 21a2 2 0 01-3.46 0' }),
        React.createElement('path', { d: 'M18.63 13A17.89 17.89 0 0118 8' }),
        React.createElement('path', { d: 'M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14' }),
        React.createElement('path', { d: 'M18 8a6 6 0 00-9.33-4.98' }),
        React.createElement('line', { x1: '1', y1: '1', x2: '23', y2: '23' })
      )
    );
    if (variant === 'busy') return (
      React.createElement('svg', Object.assign({}, s, { stroke: 'currentColor', style: { flexShrink: 0, animation: 'mb-spin 1s linear infinite' } }),
        React.createElement('circle', { cx: '12', cy: '12', r: '9', strokeDasharray: '40', strokeDashoffset: '12' })
      )
    );
    return (
      React.createElement('svg', Object.assign({}, s, { stroke: 'currentColor' }),
        React.createElement('path', { d: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' }),
        React.createElement('path', { d: 'M13.73 21a2 2 0 01-3.46 0' })
      )
    );
  }

  function NotifButton() {
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const [perm, setPerm] = useState(() => (FB().notifPermission ? FB().notifPermission() : 'unsupported'));
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    if (!user || perm === 'unsupported') return null;
    if (perm === 'granted') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(46,160,67,0.45)', background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 800, fontSize: 'var(--t-sm)' }}>
          <BellIcon variant="granted" size={17} />
          Notificaciones activadas
        </div>
      );
    }
    const enable = () => {
      setBusy(true); setMsg('');
      FB().enableNotifications()
        .then(() => { setPerm('granted'); })
        .catch((e) => { const c = (e && e.message) || e; setMsg(NERR[c] || ('No se pudo: ' + c)); setPerm(FB().notifPermission ? FB().notifPermission() : 'default'); })
        .then(() => setBusy(false));
    };
    return (
      <div>
        <button onClick={enable} disabled={busy || perm === 'denied'} className="mb-press" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 'var(--r-pill)', cursor: perm === 'denied' ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: perm === 'denied' ? 'var(--muted)' : 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', opacity: perm === 'denied' ? 0.55 : 1 }}>
          <BellIcon variant={busy ? 'busy' : perm === 'denied' ? 'denied' : 'default'} size={17} />
          {busy ? 'Activando…' : perm === 'denied' ? 'Notificaciones bloqueadas' : 'Activar notificaciones'}
        </button>
        {(msg || perm === 'denied') && <div style={{ marginTop: 6, fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{perm === 'denied' ? 'Bloqueadas en el navegador — actívalas en los ajustes del sitio.' : msg}</div>}
      </div>
    );
  }
  window.MB_NotifButton = NotifButton;

  // ── Pronóstico del campeón del Mundial (gratis, cierra al primer partido) ──
  const CHAMPION_BONUS = 30000;
  // Premio progresivo del campeón: ganas a medida que tu selección avanza (acumulativo).
  const CHAMP_LADDER = [
    ['Pasa de fase', 5000], ['Octavos', 7000], ['Cuartos', 10000],
    ['Semifinal', 15000], ['Final', 20000], ['🏆 Campeón', CHAMPION_BONUS],
  ];
  const CHAMP_TOTAL = CHAMP_LADDER.reduce((s, x) => s + x[1], 0); // 87.000
  function ChampionPick(props) {
    const compact = !!(props && props.compact); // modo compacto: una línea, sin tarjeta propia
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const [me, setMe] = useState(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      if (!user || !FB().subscribeMe) { setMe(null); return undefined; }
      const un = FB().subscribeMe(setMe);
      return () => { if (typeof un === 'function') un(); };
    }, [user]);
    if (!user) return null;

    // El pronóstico del campeón se puede elegir/cambiar hasta que TERMINA la fase
    // de grupos. Filtramos solo partidos de grupos (stage 'Grupos' o sin stage) para
    // que los fixtures de eliminatorias no desplacen el deadline.
    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    const groupFx = fx.filter((m) => !m.stage || m.stage === 'Grupos');
    const lastGroupKO = groupFx.length ? Math.max.apply(null, groupFx.map((m) => new Date(m.kickoff).getTime())) : Infinity;
    const closed = Date.now() >= (lastGroupKO + 2 * 60 * 60 * 1000); // ~fin del último partido de grupos
    const deadlineStr = isFinite(lastGroupKO) ? new Date(lastGroupKO).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : null;
    const pick = me && me.champion;
    const pickCode = me && me.championCode;

    const TEAMS = [];
    const G = (window.MB_WC && window.MB_WC.GROUPS) || {};
    Object.keys(G).forEach((k) => (G[k] || []).forEach((t) => TEAMS.push({ name: t[0], code: t[1] })));
    TEAMS.sort((a, b) => a.name.localeCompare(b.name));

    const choose = (t) => { setBusy(true); FB().setChampion(t.name, t.code).then(() => setOpen(false)).catch(() => {}).then(() => setBusy(false)); };

    const modalEl = open && ReactDOM.createPortal(
      <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1150, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 18, width: 'min(460px, 96vw)', maxHeight: '88vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <h2 className="display" style={{ margin: 0, flex: 1, fontSize: 'var(--t-xl)' }}>Elige al campeón</h2>
            <button onClick={() => setOpen(false)} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>
          {/* Escalera de premios: motiva a elegir mostrando que ganas a medida que avanza */}
          <div style={{ marginBottom: 14, padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, rgba(212,175,55,0.16), rgba(201,155,31,0.05))', border: '1px solid var(--gold)' }}>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>Ganas a medida que tu selección avanza:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
              {CHAMP_LADDER.map((x, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--t-3xs)' }}>
                  <span style={{ color: 'var(--muted)' }}>{x[0]}</span>
                  <span className="num" style={{ color: 'var(--gold-light)', fontWeight: 800 }}>+{fmt(x[1])}</span>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted-2)', marginTop: 8 }}>Hasta <strong style={{ color: 'var(--gold-light)' }}>+{fmt(CHAMP_TOTAL)}</strong> si tu selección sale campeona. Gratis · sin riesgo para tu saldo.</div>
          </div>
          {deadlineStr && (
            <div style={{ marginBottom: 12, padding: '9px 12px', borderRadius: 'var(--r-md)', background: 'var(--info-bg)', border: '1px solid rgba(74,144,226,0.3)', fontSize: 'var(--t-3xs)', color: 'var(--text)', lineHeight: 1.45 }}>
              🔁 Puedes <strong>cambiar tu campeón las veces que quieras hasta el {deadlineStr}</strong> (fin de la fase de grupos). Después queda fijo para el resto del Mundial.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {TEAMS.map((t) => {
              const active = t.name === pick;
              return (
                <button key={t.code} onClick={() => choose(t)} disabled={busy} className="mb-press" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 'var(--r-md)', cursor: 'pointer', background: active ? 'var(--coin-bg)' : 'var(--surface-2)', border: active ? '1.5px solid var(--gold)' : '1px solid var(--border-2)' }}>
                  <img src={`https://flagcdn.com/h40/${t.code}.png`} alt="" style={{ height: 22, width: 'auto', borderRadius: 3 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: active ? 'var(--gold-light)' : 'var(--muted)', textAlign: 'center', lineHeight: 1.1 }}>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>, document.body);

    // —— Modo banner: aviso llamativo que aparece SOLO si aún no elige campeón
    //    (y el plazo sigue abierto). Desaparece en cuanto elige o al cerrar. ——
    if (props && props.banner) {
      if (pick || closed) return null;
      return (
        <React.Fragment>
          <button onClick={() => setOpen(true)} className="mb-press" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderRadius: 'var(--r-lg)', border: '1px solid var(--gold)', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(201,155,31,0.07))', textAlign: 'left', boxShadow: 'var(--glow-gold)', fontFamily: 'var(--font-body)' }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>🏆</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 'var(--t-sm)', color: 'var(--text)' }}>¡Aún no eliges tu campeón!</span>
              <span style={{ display: 'block', fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 1 }}>Gratis. Ganas hasta <strong style={{ color: 'var(--gold-light)' }}>+{fmt(CHAMP_TOTAL)}</strong> a medida que tu selección avanza.</span>
            </span>
            <span style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>Elegir</span>
          </button>
          {modalEl}
        </React.Fragment>
      );
    }

    // —— Modo compacto: una sola línea (para meterlo dentro de la tarjeta de métricas) ——
    if (compact) {
      return (
        <div style={{ borderTop: '1px solid var(--border)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>🏆</span>
          {pick ? (
            <React.Fragment>
              {pickCode && <img src={`https://flagcdn.com/h20/${pickCode}.png`} alt="" style={{ height: 13, width: 'auto', borderRadius: 2, flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ color: 'var(--muted-2)' }}>Mi campeón: </span><span style={{ color: 'var(--gold-light)', fontWeight: 800 }}>{pick}</span></span>
              {!closed && <button onClick={() => setOpen(true)} title={deadlineStr ? 'Puedes cambiar tu campeón hasta el ' + deadlineStr : 'Cambiar campeón'} className="mb-press" style={{ padding: '5px 11px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--info)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-3xs)', flexShrink: 0 }}>Cambiar</button>}
            </React.Fragment>
          ) : closed ? (
            <span style={{ flex: 1, fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>El pronóstico del campeón cerró.</span>
          ) : (
            <button onClick={() => setOpen(true)} className="mb-press" style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>🏆 Elegir mi campeón · gana hasta +{fmt(CHAMP_TOTAL)}</button>
          )}
          {modalEl}
        </div>
      );
    }

    return (
      <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--sh-1)' }}>
        <h3 className="display" style={{ margin: '0 0 10px', fontSize: 'var(--t-lg)', color: 'var(--text)' }}>🏆 ¿Quién será el campeón?</h3>
        {pick
          ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {pickCode && <img src={`https://flagcdn.com/h40/${pickCode}.png`} alt="" style={{ height: 24, width: 'auto', borderRadius: 3, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>Tu pronóstico</div>
                <div style={{ fontWeight: 800, fontSize: 'var(--t-md)', color: 'var(--gold-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick}</div>
              </div>
              {!closed && <button onClick={() => setOpen(true)} className="mb-press" style={{ padding: '7px 13px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--info)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>Cambiar</button>}
            </div>
          )
          : closed
            ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '8px 0' }}>El pronóstico del campeón ya cerró.</div>
            : <button onClick={() => setOpen(true)} className="mb-press" style={{ width: '100%', padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)' }}>🏆 Elegir mi campeón</button>}
        <div style={{ marginTop: 8, fontSize: 9, color: 'var(--muted-2)', textAlign: 'center' }}>{closed ? 'El pronóstico del campeón está cerrado.' : 'Gratis · puedes elegir o cambiar hasta que termine la fase de grupos.'} Ganas premios a medida que tu selección avanza, hasta +{fmt(CHAMP_TOTAL)} si es campeona.</div>
        {modalEl}
      </div>
    );
  }
  window.MB_ChampionPick = ChampionPick;

  // ── Esquema de premios (rebalanceado). Se pagan AL CERRAR LA FASE DE GRUPOS
  //    (fin de la 3ª fecha). Respeta lo ya definido y suma premios por habilidad:
  //      1) Campeón (azar): escalera CHAMP_LADDER — si tu selección pasó a 2ª fase
  //         y más a medida que avanza (hasta 87.000 si es campeona).
  //      2) Recarga por apuestas (actividad): +2.000 por cada 10 apuestas.
  //      3) Precisión (habilidad): bono por % de aciertos (mín. 8 apuestas).
  //      4) Racha (habilidad): bono acumulable por aciertos seguidos.
  //    El motor de cierre en agent/index.js paga estos montos (usa MB_bonusBreakdown). ──
  const BET_RECARGA_PER10 = 2000;                                 // +2.000 por cada 10 apuestas
  const PRECISION_MIN_BETS = 8;                                   // mín. apuestas liquidadas para optar
  const PRECISION_TIERS = [[80, 25000], [65, 12000], [50, 5000]]; // %acierto → bono (solo el mayor)
  const STREAK_TIERS = [[3, 2000], [5, 5000], [7, 10000]];        // racha de aciertos → bono (acumulable)

  // Desglose de premios de un jugador (sin contar el campeón, que depende del torneo).
  // stats: { bets, settled, accuracy, bestStreak }. Misma lógica que paga el agente.
  function bonusBreakdown(stats) {
    const s = stats || {};
    const bets = Math.max(0, s.bets | 0);
    const settled = Math.max(0, s.settled | 0);
    const acc = Math.max(0, Math.min(100, s.accuracy | 0));
    const streak = Math.max(0, s.bestStreak | 0);
    const recarga = Math.floor(bets / 10) * BET_RECARGA_PER10;
    let precision = 0;
    if (settled >= PRECISION_MIN_BETS) {
      for (let i = 0; i < PRECISION_TIERS.length; i++) { if (acc >= PRECISION_TIERS[i][0]) { precision = PRECISION_TIERS[i][1]; break; } }
    }
    let streakBonus = 0;
    STREAK_TIERS.forEach((t) => { if (streak >= t[0]) streakBonus += t[1]; });
    return { recarga: recarga, precision: precision, streak: streakBonus, total: recarga + precision + streakBonus };
  }
  window.MB_REBAL = { BET_RECARGA_PER10: BET_RECARGA_PER10, PRECISION_MIN_BETS: PRECISION_MIN_BETS, PRECISION_TIERS: PRECISION_TIERS, STREAK_TIERS: STREAK_TIERS, CHAMP_LADDER: CHAMP_LADDER, CHAMP_TOTAL: CHAMP_TOTAL };
  window.MB_bonusBreakdown = bonusBreakdown;

  function ChampLadder(props) {
    const stats = (props && props.stats) || {};
    const bd = bonusBreakdown(stats);
    const bets = Math.max(0, stats.bets | 0);
    const settled = Math.max(0, stats.settled | 0);
    const acc = Math.max(0, Math.min(100, stats.accuracy | 0));
    const streak = Math.max(0, stats.bestStreak | 0);
    const nextRecargaAt = (Math.floor(bets / 10) + 1) * 10; // próxima apuesta que suma +2.000
    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    const groupFx2 = fx.filter((m) => !m.stage || m.stage === 'Grupos');
    const lastGroupKO = groupFx2.length ? Math.max.apply(null, groupFx2.map((m) => new Date(m.kickoff).getTime())) : Infinity;
    const groupsClosed = isFinite(lastGroupKO) && Date.now() >= (lastGroupKO + 2 * 60 * 60 * 1000);
    const deadlineStr = isFinite(lastGroupKO) ? new Date(lastGroupKO).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : null;
    const gold = { color: 'var(--gold-light)', fontWeight: 800 };
    const me = (props && props.me) || null;
    const alreadyClaimed = !!(me && me.rewards && me.rewards.groupsClosed);
    const [claiming, setClaiming] = useState(false);
    const [claimDone, setClaimDone] = useState(false);
    const [claimErr, setClaimErr] = useState('');
    const [histOpen, setHistOpen] = useState(false);
    // ── Premios de racha reclamables independientemente ──
    // Se usan contra bestStreak (máximo histórico) para que no se pierdan al romper la racha.
    const bestStreakMe = (me && typeof me.bestStreak === 'number') ? me.bestStreak : ((me && typeof me.currentStreak === 'number') ? me.currentStreak : 0);
    const claimedStreakTiers = (me && me.rewards && Array.isArray(me.rewards.streakTiers)) ? me.rewards.streakTiers : [];
    const [claimedStreakLocal, setClaimedStreakLocal] = useState([]);
    const [claimingStreakTier, setClaimingStreakTier] = useState(null);
    const doClaimStreak = (tier, amount) => {
      const fb = window.MBFirebase;
      if (!fb || !fb.claimStreakTier) return;
      setClaimingStreakTier(tier);
      fb.claimStreakTier(tier, amount)
        .then(() => { setClaimedStreakLocal((prev) => [...prev, tier]); setClaimingStreakTier(null); })
        .catch(() => { setClaimingStreakTier(null); });
    };
    const claimableStreaks = STREAK_TIERS.filter((t) =>
      bestStreakMe >= t[0] && !claimedStreakTiers.includes(t[0]) && !claimedStreakLocal.includes(t[0])
    );
    const doClaim = () => {
      const fb = window.MBFirebase;
      if (!fb || !fb.claimGroupBonuses) return;
      setClaiming(true); setClaimErr('');
      fb.claimGroupBonuses({ ...bd, champBonus: champEarnedTotal, total: securedTotal })
        .then(() => { setClaimDone(true); setClaiming(false); })
        .catch((e) => { if (e === 'ya-reclamado') { setClaimDone(true); } else { setClaimErr('Error al reclamar. Intenta de nuevo.'); } setClaiming(false); });
    };

    // ── Avance del campeón elegido ──
    const champCode = me ? me.championCode : null;
    const codesOf = (stage) => new Set(fx.filter(f => f.stage === stage).flatMap(f => [f.homeCode, f.awayCode]).filter(Boolean));
    const r32Set = codesOf('r32');
    const r16Set = codesOf('r16');
    const qfSet  = codesOf('qf');
    const sfSet  = codesOf('sf');
    const finalSet = codesOf('final');
    // Índices de CHAMP_LADDER: 0=Pasa de fase, 1=Octavos, 2=Cuartos, 3=Semifinal, 4=Final, 5=Campeón
    const champEarned = []; // índices ya ganados
    if (groupsClosed && champCode && r32Set.has(champCode))  champEarned.push(0);
    if (champCode && r16Set.has(champCode))  champEarned.push(1);
    if (champCode && qfSet.has(champCode))   champEarned.push(2);
    if (champCode && sfSet.has(champCode))   champEarned.push(3);
    if (champCode && finalSet.has(champCode)) champEarned.push(4);
    // Campeón (índice 5): cuando finalSet tiene solo 1 equipo y es el campeón, ya no hay más partidos
    const champEarnedTotal = champEarned.reduce((s, idx) => s + CHAMP_LADDER[idx][1], 0);

    // ── Desglose: lo ASEGURADO (ya bloqueado) y lo PENDIENTE (aún sumable) ──
    const secured = [];
    if (bd.recarga > 0) secured.push(['🎟️', 'Recarga · ' + bets + ' apuestas', bd.recarga]);
    if (bd.precision > 0) secured.push(['🎯', 'Precisión · ' + acc + '% de aciertos', bd.precision]);
    if (bd.streak > 0) secured.push(['🔥', 'Racha · ' + streak + ' seguidas', bd.streak]);
    // Bonos del campeón ya ganados
    champEarned.forEach((idx) => secured.push(['🏆', CHAMP_LADDER[idx][0] + (me && me.champion ? ' · ' + me.champion : ''), CHAMP_LADDER[idx][1]]));

    const securedTotal = bd.total + champEarnedTotal;

    const pending = [];
    // Recarga: siempre hay un próximo escalón de +2.000.
    pending.push(['🎟️', 'Llega a ' + nextRecargaAt + ' apuestas', BET_RECARGA_PER10]);
    // Precisión: subir de tramo (solo cuenta el mayor → se muestra la diferencia).
    const precAsc = PRECISION_TIERS.slice().sort((a, b) => a[0] - b[0]); // [50,5k] [65,12k] [80,25k]
    if (settled < PRECISION_MIN_BETS) {
      pending.push(['🎯', 'Resuelve ' + PRECISION_MIN_BETS + ' apuestas con ≥50%', precAsc[0][1]]);
    } else {
      for (let i = 0; i < precAsc.length; i++) { if (acc < precAsc[i][0]) { pending.push(['🎯', 'Sube a ≥' + precAsc[i][0] + '% de aciertos', precAsc[i][1] - bd.precision]); break; } }
    }
    // Racha: próximos tramos no alcanzados (son acumulables).
    STREAK_TIERS.forEach((t) => { if (streak < t[0]) pending.push(['🔥', t[0] + ' aciertos seguidos', t[1]]); });
    // Campeón: mostrar antes de que cierren grupos, o las rondas aún no alcanzadas
    if (!groupsClosed) {
      pending.push(['🏆', 'Que tu selección pase de fase', CHAMP_LADDER[0][1], 'hasta +' + fmt(CHAMP_TOTAL) + ' si es campeona']);
    }

    const line = (it, i, tone) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', minWidth: 0 }}>{it[0]} {it[1]}{it[3] ? <span style={{ fontSize: 9, color: 'var(--muted-2)' }}> · {it[3]}</span> : null}</span>
        <span className="num" style={{ fontSize: 'var(--t-2xs)', color: tone, fontWeight: 800, flexShrink: 0 }}>+{fmt(it[2])}</span>
      </div>
    );

    // Premios del campeón pendientes: solo los no ganados aún
    const champPending = groupsClosed
      ? CHAMP_LADDER.filter((_, idx) => !champEarned.includes(idx) && idx <= 5).map((x) => ['🏆', x[0], x[1]])
      : [];

    return (
      <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid var(--gold)', borderRadius: 'var(--r-lg)', padding: '13px 15px', boxShadow: 'var(--sh-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 18 }}>🎁</span>
          <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-md)', color: 'var(--text)' }}>
            {groupsClosed ? 'Premios de eliminatorias' : 'Premios al terminar la 3ª fecha'}
          </h3>
        </div>
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', lineHeight: 1.4, marginBottom: 11 }}>
          {groupsClosed
            ? <>Los premios de la fase de grupos ya se <strong style={gold}>pagaron</strong>. Ahora suma a medida que tu selección avanza en la eliminatoria.</>
            : <>Se reparten al <strong style={gold}>terminar la fase de grupos{deadlineStr ? ' (3ª fecha · ' + deadlineStr + ')' : ' (3ª fecha)'}</strong>, gratis y sin riesgo para tu saldo.</>}
        </div>

        {/* ✅ Asegurado */}
        <div style={{ padding: '9px 11px', borderRadius: 'var(--r-md)', background: 'var(--coin-bg)', border: '1px solid rgba(212,175,55,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--text)', fontWeight: 800 }}>✅ {groupsClosed ? 'Llevas asegurado' : 'Llevas asegurado'}</span>
            <span className="num" style={{ fontSize: 'var(--t-lg)', color: 'var(--gold-light)', fontWeight: 800 }}>+{fmt(securedTotal)}</span>
          </div>
          {secured.length
            ? <div style={{ marginTop: 4 }}>{secured.map((it, i) => line(it, i, 'var(--gold-light)'))}</div>
            : <div style={{ fontSize: 9, color: 'var(--muted-2)', marginTop: 4 }}>{groupsClosed ? 'Apuesta más y sube tu precisión para ganar bonos.' : 'Aún no aseguras puntos. Apuesta para empezar a sumar.'}</div>}
        </div>

        {/* 🎁 Botón reclamar (solo si la fase cerró y hay algo que cobrar) */}
        {groupsClosed && securedTotal > 0 && (
          <div style={{ marginTop: 9 }}>
            {(alreadyClaimed || claimDone) ? (
              <div style={{ padding: '10px 11px', borderRadius: 'var(--r-md)', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 800 }}>
                ✅ Premios reclamados
              </div>
            ) : (
              <>
                <button onClick={doClaim} disabled={claiming} className="mb-press" style={{ width: '100%', padding: '12px 0', borderRadius: 'var(--r-md)', border: 'none', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', cursor: claiming ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', opacity: claiming ? 0.7 : 1, transition: 'opacity var(--dur-base)' }}>
                  {claiming ? 'Reclamando…' : `🎁 Reclamar +${fmt(securedTotal)} pts`}
                </button>
                {claimErr ? <div style={{ fontSize: 'var(--t-3xs)', color: '#f87171', marginTop: 5, textAlign: 'center' }}>{claimErr}</div> : null}
              </>
            )}
          </div>
        )}

        {/* 🔥 Premios por racha (independientes del bono de grupos) */}
        {claimableStreaks.length > 0 && (
          <div style={{ marginTop: 9, padding: '9px 11px', borderRadius: 'var(--r-md)', background: 'rgba(255,120,0,0.08)', border: '1px solid rgba(255,120,0,0.35)' }}>
            <div style={{ fontSize: 'var(--t-2xs)', color: '#ff9e57', fontWeight: 800, marginBottom: 6 }}>🔥 Premios por racha desbloqueados</div>
            {claimableStreaks.map((t) => {
              const isBusy = claimingStreakTier === t[0];
              return (
                <div key={t[0]} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderTop: '1px solid rgba(255,120,0,0.15)' }}>
                  <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--text)' }}>{t[0]} victorias seguidas</span>
                  <button onClick={() => doClaimStreak(t[0], t[1])} disabled={isBusy || claimingStreakTier !== null} className="mb-press" style={{ padding: '5px 12px', borderRadius: 'var(--r-sm)', border: 'none', background: isBusy ? 'rgba(255,120,0,0.4)' : 'linear-gradient(135deg,#ff9e57,#e06a10)', color: '#1A0A00', fontWeight: 800, fontSize: 'var(--t-3xs)', cursor: isBusy ? 'not-allowed' : 'pointer', opacity: (claimingStreakTier !== null && !isBusy) ? 0.5 : 1, transition: 'opacity var(--dur-base)', fontFamily: 'var(--font-body)' }}>
                    {isBusy ? '…' : `+${fmt(t[1])} pts`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {/* 📋 Historial de premios cobrados */}
        {(() => {
          const r = me && me.rewards;
          const rows = [];
          // Bono de grupos
          if (r && r.groupsClosed) {
            if (r.recarga)    rows.push(['🎟️', 'Recarga de apuestas',     r.recarga]);
            if (r.precision)  rows.push(['🎯', 'Precisión de aciertos',  r.precision]);
            if (r.streak)     rows.push(['🔥', 'Bono de racha (grupos)', r.streak]);
            if (r.champBonus) rows.push(['🏆', 'Bono campeón',           r.champBonus]);
          }
          // Rachas individuales (Firestore + las reclamadas en esta sesión)
          const allClaimedTiers = [...new Set([...claimedStreakTiers, ...claimedStreakLocal])];
          allClaimedTiers.forEach((tier) => {
            const t = STREAK_TIERS.find((x) => x[0] === tier);
            if (t) rows.push(['🔥', `Premio racha ${t[0]} victorias`, t[1]]);
          });
          if (!rows.length) return null;
          const total = rows.reduce((s, r) => s + r[2], 0);
          return (
            <div style={{ marginTop: 9, borderRadius: 'var(--r-md)', border: '1px solid rgba(34,197,94,0.25)', overflow: 'hidden' }}>
              <button onClick={() => setHistOpen((o) => !o)} className="mb-press" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', background: 'rgba(34,197,94,0.08)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 800 }}>✅ Premios cobrados · +{fmt(total)} pts</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: histOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              {histOpen && (
                <div style={{ padding: '4px 11px 8px' }}>
                  {rows.map((it, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>{it[0]} {it[1]}</span>
                      <span className="num" style={{ fontSize: 'var(--t-3xs)', color: 'var(--success)', fontWeight: 800 }}>+{fmt(it[2])}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ⏳ Por asegurar */}
        <div style={{ marginTop: 9, padding: '9px 11px', borderRadius: 'var(--r-md)', background: 'rgba(0,0,0,0.22)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--text)', fontWeight: 800, marginBottom: 2 }}>⏳ {groupsClosed ? 'Premios que aún puedes ganar' : 'Por asegurar'}</div>
          {groupsClosed
            ? champPending.map((it, i) => line(it, i, 'var(--muted)'))
            : pending.map((it, i) => line(it, i, 'var(--muted)'))}
          <div style={{ fontSize: 9, color: 'var(--muted-2)', marginTop: 6, lineHeight: 1.4 }}>El campeón suma a medida que avanza tu selección (Octavos, Cuartos…) hasta <strong style={gold}>+{fmt(CHAMP_TOTAL)}</strong>.</div>
        </div>
      </div>
    );
  }
  window.MB_ChampLadder = ChampLadder;

  // Banner de inicio: "Elige tu campeón" + "Reclamar premios"
  // Aparece en la pantalla Inicio si el usuario tiene pendientes alguna de las dos acciones.
  function ClaimBonusBanner() {
    const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
    const bs = useBetStore();
    const store = bs || {};
    const [meRaw, setMeRaw] = useState(null);
    useEffect(() => {
      if (!authUser || !FB().subscribeMe) { setMeRaw(null); return undefined; }
      const un = FB().subscribeMe((u) => setMeRaw(u || null));
      return () => { if (typeof un === 'function') un(); };
    }, [authUser]);
    const me = meRaw;
    const bets = store.allBets ? Object.values(store.allBets).flat() : (store.bets ? Object.values(store.bets) : []);
    const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
    const wonN = settled.filter(b => b.status === 'won').length;
    const acc = settled.length ? Math.round(wonN * 100 / settled.length) : 0;
    let cur2 = 0, best2 = 0;
    bets.slice().sort((a, b) => (a.creado && b.creado) ? (a.creado.seconds || 0) - (b.creado.seconds || 0) : 0)
      .forEach(b => { if (b.status === 'won') { cur2++; if (cur2 > best2) best2 = cur2; } else { cur2 = 0; } });
    const bd2 = bonusBreakdown({ bets: bets.length, settled: settled.length, accuracy: acc, bestStreak: best2 });
    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    const groupFx = fx.filter(m => !m.stage || m.stage === 'Grupos');
    const lastKO = groupFx.length ? Math.max.apply(null, groupFx.map(m => new Date(m.kickoff).getTime())) : Infinity;
    const groupsClosed = isFinite(lastKO) && Date.now() >= lastKO + 2 * 60 * 60 * 1000;
    const alreadyClaimed = !!(me && me.rewards && me.rewards.groupsClosed);
    const canClaim = groupsClosed && bd2.total > 0 && !alreadyClaimed;
    const [claiming, setClaiming] = useState(false);
    const [done, setDone] = useState(false);
    if (!authUser || (!canClaim && !(groupsClosed && !alreadyClaimed && bd2.total === 0))) return null;
    if (!canClaim) return null;
    const doClaim = () => {
      const fb = window.MBFirebase;
      if (!fb || !fb.claimGroupBonuses || claiming) return;
      setClaiming(true);
      fb.claimGroupBonuses(bd2).then(() => setDone(true)).catch(() => setClaiming(false));
    };
    if (done) return (
      <div style={{ padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', textAlign: 'center', fontSize: 'var(--t-sm)', color: 'var(--success)', fontWeight: 800 }}>
        ✅ ¡Premios reclamados! +{fmt(bd2.total)} pts sumados a tu saldo.
      </div>
    );
    return (
      <div style={{ padding: '13px 14px', borderRadius: 'var(--r-lg)', background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(199,155,31,0.08))', border: '1px solid rgba(212,175,55,0.55)', boxShadow: 'var(--sh-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>🎁</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--t-sm)', color: 'var(--text)' }}>Tienes <span className="num" style={{ color: 'var(--gold-light)' }}>+{fmt(bd2.total)} pts</span> por reclamar</div>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>Premios de la fase de grupos · ya terminaron todos los partidos</div>
          </div>
        </div>
        <button onClick={doClaim} disabled={claiming} className="mb-press" style={{ width: '100%', padding: '11px 0', borderRadius: 'var(--r-md)', border: 'none', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', cursor: claiming ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', opacity: claiming ? 0.7 : 1 }}>
          {claiming ? 'Reclamando…' : '🎁 Reclamar mis puntos ahora'}
        </button>
      </div>
    );
  }
  window.MB_ClaimBonusBanner = ClaimBonusBanner;

  // Banderita del campeón elegido por un jugador (para mostrar junto a su nombre).
  window.MB_champFlag = function (code, name, h) {
    if (!code) return null;
    return React.createElement('img', {
      src: 'https://flagcdn.com/h20/' + code + '.png', alt: '', title: 'Campeón: ' + (name || ''),
      style: { height: h || 11, width: 'auto', borderRadius: 2, marginLeft: 5, verticalAlign: 'middle', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' },
    });
  };
  // Avatar de jugador: la bandera del campeón que eligió (circular) o, si no
  // eligió, sus iniciales. Reemplaza el círculo con la inicial del nombre.
  function avatarInitials(name) { const p = String(name || '').trim().split(/\s+/); return (((p[0] || '')[0] || '?') + ((p[1] || '')[0] || '')).toUpperCase(); }
  window.MB_champAvatar = function (code, champName, nombre, size) {
    const s = size || 30;
    if (code) {
      return React.createElement('span', { title: 'Campeón: ' + (champName || ''), style: { width: s, height: s, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-2)', display: 'inline-flex', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' } },
        React.createElement('img', { src: 'https://flagcdn.com/h60/' + code + '.png', alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } }));
    }
    return React.createElement('span', { style: { width: s, height: s, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: s >= 40 ? 'var(--t-md)' : 'var(--t-3xs)', color: 'var(--gold-light)', flexShrink: 0 } }, avatarInitials(nombre));
  };

  // Partidos del "día foco" para el Inicio: si hoy hay partidos, los de hoy
  // (en orden cronológico, igual que en la pantalla "Partidos" — los que ya
  // terminaron aparecen en su horario real, no al final); si hoy no hay,
  // los de mañana; si tampoco hay mañana (día de descanso largo en
  // eliminatorias), el próximo día con partidos.
  // oddsMap (del store) sirve para saber cuáles ya terminaron (finished).
  window.MB_dayFixtures = function (oddsMap) {
    const staticFx = (window.MB && window.MB.WC_FIXTURES) || [];
    const dyn = (window.MB_dynFixtures || []).filter(function (d) { return !staticFx.some(function (s) { return s.id === d.id; }); });
    const fx = staticFx.concat(dyn);
    if (!fx.length) return { list: [], today: false };
    const now = Date.now();
    const dstr = (ms) => new Date(ms).toLocaleDateString('sv'); // YYYY-MM-DD local
    const rows = fx.map((m) => { const ko = new Date(m.kickoff).getTime(); const od = (oddsMap && oddsMap[m.id]) || {}; return { m, ko, finished: !!od.finished }; });
    rows.sort((a, b) => a.ko - b.ko);
    const todayStr = dstr(now);
    const todayRows = rows.filter((x) => dstr(x.ko) === todayStr);
    if (todayRows.length) return { list: todayRows.map((x) => x.m), today: true };
    const tomorrowStr = dstr(now + 86400000);
    const tomorrowRows = rows.filter((x) => dstr(x.ko) === tomorrowStr);
    if (tomorrowRows.length) return { list: tomorrowRows.map((x) => x.m), today: false };
    const nextUp = rows.find((x) => !x.finished && x.ko > now) || rows.find((x) => !x.finished) || rows[rows.length - 1];
    if (!nextUp) return { list: [], today: false };
    const focus = dstr(nextUp.ko);
    const day = rows.filter((x) => dstr(x.ko) === focus);
    return { list: day.map((x) => x.m), today: focus === todayStr };
  };

  // Partidos de MAÑANA (calendario), en orden cronológico. Independiente de si
  // hoy hay partidos o no — se usa para mostrar "Próximos partidos" debajo de
  // "Partidos de hoy" cuando ambos días tienen juegos.
  window.MB_tomorrowFixtures = function () {
    const staticFx = (window.MB && window.MB.WC_FIXTURES) || [];
    const dyn = (window.MB_dynFixtures || []).filter(function (d) { return !staticFx.some(function (s) { return s.id === d.id; }); });
    const fx = staticFx.concat(dyn);
    if (!fx.length) return [];
    const now = Date.now();
    const dstr = (ms) => new Date(ms).toLocaleDateString('sv');
    const tomorrowStr = dstr(now + 86400000);
    return fx.filter((m) => dstr(new Date(m.kickoff).getTime()) === tomorrowStr)
      .slice().sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  };

  // ── Sembrar cuotas de PRUEBA (solo para ver la UI antes del agente real) ──
  // Uso: abrir consola del navegador estando logueado y ejecutar  MB_seedOdds()
  // Genera cuotas estables (deterministas por equipos) para todos los fixtures.
  window.MB_seedOdds = function () {
    const fb = FB();
    if (!fb.setOdds) { console.warn('Firebase no configurado.'); return; }
    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
    let n = 0;
    fx.forEach((m) => {
      const r = hash(m.home + '|' + m.away);
      const home = +(1.6 + (r % 220) / 100).toFixed(2);        // 1.60 – 3.80
      const away = +(1.7 + ((r >> 8) % 230) / 100).toFixed(2); // 1.70 – 4.00
      const draw = +(3.1 + ((r >> 16) % 70) / 100).toFixed(2); // 3.10 – 3.80
      fb.setOdds(m.id, { home, draw, away }); n++;
    });
    console.log('[MundialBet] Cuotas de prueba sembradas para ' + n + ' partidos.');
  };
})();
