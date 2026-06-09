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
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');

  // ── Store compartido: una sola suscripción a cuotas + mis apuestas + mi saldo ──
  const store = { odds: {}, bets: {}, saldo: null, ready: false, listeners: new Set() };
  function emit() { store.listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }
  let started = false, unsubs = [];
  function start() {
    if (started) return; started = true;
    const fb = FB();
    if (fb.subscribeOdds) unsubs.push(fb.subscribeOdds((o) => { store.odds = o || {}; store.ready = true; emit(); }));
    if (fb.subscribeMyBets) unsubs.push(fb.subscribeMyBets((list) => {
      const map = {}; (list || []).forEach((b) => { map[b.matchId] = b; }); store.bets = map; emit();
    }));
    if (fb.subscribeMe) unsubs.push(fb.subscribeMe((u) => {
      store.saldo = (u && typeof u.saldo === 'number') ? u.saldo : (u ? SALDO_INICIAL : null); emit();
    }));
  }
  // Reinicia las suscripciones cuando cambia la sesión (login/logout).
  window.addEventListener('mb-auth-refresh', () => {
    unsubs.forEach((u) => { try { if (typeof u === 'function') u(); } catch (e) {} });
    unsubs = []; started = false; store.bets = {}; store.saldo = null; emit(); start();
  });

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

  const ERRORS = {
    'min-1000': 'La apuesta mínima es 1.000.',
    'cerrado': 'El partido ya comenzó.',
    'sin-cuota': 'Aún no hay cuotas para este partido.',
    'saldo-insuficiente': 'No tienes saldo suficiente.',
    'no-auth': 'Inicia sesión para apostar.',
    'pick-invalido': 'Selección inválida.',
  };

  const PICK_LABEL = (m, k) => (k === 'home' ? m.home : k === 'away' ? m.away : 'Empate');

  // ── Caja de apuesta (1·X·2) ──
  function BetBox({ m, compact }) {
    const s = useBetStore();
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const odds = s.odds[m.id] || null;
    const bet = s.bets[m.id] || null;
    const saldo = s.saldo;
    const closed = new Date(m.kickoff).getTime() <= Date.now();

    const [sel, setSel] = useState(null);
    const [stake, setStake] = useState(MIN_BET);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');

    if (!user) return null; // solo apostadores logueados ven la caja

    // Partido TERMINADO: muestra el marcador final (y el resultado de tu apuesta si jugaste).
    const finished = odds && odds.finished;
    if (finished) {
      const gh = (odds.gh != null) ? odds.gh : '–';
      const ga = (odds.ga != null) ? odds.ga : '–';
      const settledBet = bet && (bet.status === 'won' || bet.status === 'lost');
      const won = bet && bet.status === 'won';
      return (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)' }}>
            <span style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏁 Final</span>
            <span className="num" style={{ fontSize: 'var(--t-lg)', fontWeight: 800, color: 'var(--text)' }}>{gh} <span style={{ color: 'var(--muted-2)' }}>–</span> {ga}</span>
          </div>
          {settledBet && (
            <div style={{ marginTop: 6, padding: '7px 11px', borderRadius: 'var(--r-md)', border: '1px solid ' + (won ? 'rgba(46,160,67,0.5)' : 'rgba(220,80,80,0.4)'), background: won ? 'var(--success-bg)' : 'rgba(220,80,80,0.10)', fontSize: 'var(--t-2xs)', fontWeight: 700, color: won ? 'var(--success)' : '#e98b8b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>{won ? '✓ Ganaste' : '✕ Perdiste'} · {PICK_LABEL(m, bet.pick)} @ {Number(bet.odd).toFixed(2)}</span>
              <span className="num">{won ? '+' + fmt(Math.round(bet.stake * bet.odd)) : '−' + fmt(bet.stake)}</span>
            </div>
          )}
        </div>
      );
    }

    // Resultado ya liquidado (por si el marcador aún no llegó pero la apuesta sí)
    if (bet && bet.status && bet.status !== 'open') {
      const won = bet.status === 'won';
      return (
        <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 'var(--r-md)', border: '1px solid ' + (won ? 'rgba(46,160,67,0.5)' : 'rgba(220,80,80,0.4)'), background: won ? 'var(--success-bg)' : 'rgba(220,80,80,0.10)', fontSize: 'var(--t-2xs)', fontWeight: 700, color: won ? 'var(--success)' : '#e98b8b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>{won ? '✓ Ganaste' : '✕ Perdiste'} · {PICK_LABEL(m, bet.pick)} @ {Number(bet.odd).toFixed(2)}</span>
          <span className="num">{won ? '+' + fmt(Math.round(bet.stake * bet.odd)) : '−' + fmt(bet.stake)}</span>
        </div>
      );
    }

    const place = (pick) => {
      setErr(''); setOk(''); setBusy(true);
      FB().placeBet(m, pick, stake)
        .then(() => { setOk('¡Apuesta registrada!'); setSel(null); })
        .catch((e) => {
          const code = (e && e.code) || e;
          setErr(ERRORS[code] || ('No se pudo: ' + ((e && e.message) || code)));
          console.error('[MundialBet] placeBet falló:', e);
        })
        .then(() => setBusy(false));
    };
    const cancel = () => {
      setErr(''); setOk(''); setBusy(true);
      FB().cancelBet(m.id).catch(() => {}).then(() => setBusy(false));
    };

    // Apuesta abierta existente
    if (bet && !sel) {
      return (
        <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 'var(--r-md)', border: '1px solid rgba(74,144,226,0.4)', background: 'rgba(74,144,226,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 'var(--t-2xs)', fontWeight: 700, color: 'var(--text)' }}>
              Tu apuesta: <span style={{ color: 'var(--info)' }}>{PICK_LABEL(m, bet.pick)}</span> · {fmt(bet.stake)} @ {Number(bet.odd).toFixed(2)}
            </div>
            <span className="num" style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 800 }}>↑ {fmt(Math.round(bet.stake * bet.odd))}</span>
          </div>
          {!closed && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => { setSel(bet.pick); setStake(bet.stake); }} disabled={busy} className="mb-press" style={miniBtn('rgba(74,144,226,0.5)', 'var(--info)')}>Cambiar</button>
              <button onClick={cancel} disabled={busy} className="mb-press" style={miniBtn('var(--border-2)', 'var(--muted)')}>Cancelar</button>
            </div>
          )}
          {closed && <div style={{ marginTop: 6, fontSize: 9, color: 'var(--muted-2)' }}>Cerrada · esperando resultado</div>}
        </div>
      );
    }

    if (closed) {
      return <div style={{ marginTop: 10, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center' }}>🔒 Apuestas cerradas</div>;
    }
    if (!odds || (!odds.home && !odds.draw && !odds.away)) {
      return <div style={{ marginTop: 10, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center', fontStyle: 'italic' }}>💱 Cuotas próximamente…</div>;
    }

    const picks = [
      { k: 'home', label: m.home, odd: odds.home },
      { k: 'draw', label: 'Empate', odd: odds.draw },
      { k: 'away', label: m.away, odd: odds.away },
    ];
    const selOdd = sel ? Number((picks.find((p) => p.k === sel) || {}).odd || 0) : 0;
    const win = selOdd ? Math.round(stake * selOdd) : 0;
    const maxSaldo = (typeof saldo === 'number' ? saldo : SALDO_INICIAL) + ((bet && bet.status === 'open') ? (bet.stake || 0) : 0);

    return (
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 9, color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Apuesta al ganador</span>
          {typeof saldo === 'number' && <span className="num" style={{ fontSize: 9, color: 'var(--muted)' }}>Saldo: <span style={{ color: 'var(--gold-light)' }}>{fmt(saldo)}</span></span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {picks.map((p) => {
            const active = sel === p.k;
            const has = p.odd != null;
            return (
              <button key={p.k} disabled={!has || busy} onClick={() => { setSel(active ? null : p.k); setErr(''); setOk(''); }} className="mb-press" style={{
                flex: 1, minWidth: 0, padding: '8px 4px', cursor: has ? 'pointer' : 'default', borderRadius: 'var(--r-md)',
                background: active ? 'var(--coin-bg)' : 'var(--surface-2)', border: active ? '1.5px solid var(--gold)' : '1px solid var(--border-2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: has ? 1 : 0.4,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: active ? 'var(--gold-light)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.k === 'draw' ? 'Empate' : (p.k === 'home' ? '🏠 ' : '✈ ') + p.label}</span>
                <span className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: active ? 'var(--gold-light)' : 'var(--text)' }}>{has ? Number(p.odd).toFixed(2) : '—'}</span>
              </button>
            );
          })}
        </div>

        {sel && (
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
            <div style={{ display: 'flex', gap: 5, marginBottom: 9 }}>
              {[1000, 5000, 10000].map((v) => (
                <button key={v} onClick={() => setStake(v)} className="mb-press" style={chipBtn(stake === v)}>{fmt(v)}</button>
              ))}
              <button onClick={() => setStake(Math.max(MIN_BET, Math.floor(maxSaldo)))} className="mb-press" style={chipBtn(false)}>Todo</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 11px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)', marginBottom: 9 }}>
              <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)' }}>Ganancia si aciertas</span>
              <span className="num" style={{ fontSize: 'var(--t-md)', fontWeight: 800, color: 'var(--success)' }}>{fmt(win)}</span>
            </div>
            <button onClick={() => place(sel)} disabled={busy || stake < MIN_BET || stake > maxSaldo} className="mb-press" style={{
              width: '100%', padding: '10px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)',
              border: 'none', color: '#1a1206',
              background: (busy || stake < MIN_BET || stake > maxSaldo) ? 'var(--surface-2)' : 'linear-gradient(180deg, var(--gold-light), var(--gold))',
              opacity: (busy || stake < MIN_BET || stake > maxSaldo) ? 0.55 : 1,
            }}>{busy ? 'Registrando…' : (bet ? 'Cambiar apuesta' : 'Apostar') + ' · ' + PICK_LABEL(m, sel)}</button>
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

  // Partidos del "día foco": el del próximo partido por jugar (o el último si ya
  // terminó todo). Ordena: por jugar primero (apostables), terminados al final.
  // oddsMap (del store) sirve para saber cuáles ya terminaron (finished).
  window.MB_dayFixtures = function (oddsMap) {
    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    if (!fx.length) return { list: [], today: false };
    const now = Date.now();
    const dstr = (ms) => new Date(ms).toLocaleDateString('sv'); // YYYY-MM-DD local
    const rows = fx.map((m) => { const ko = new Date(m.kickoff).getTime(); const od = (oddsMap && oddsMap[m.id]) || {}; return { m, ko, finished: !!od.finished }; });
    rows.sort((a, b) => a.ko - b.ko);
    const nextUp = rows.find((x) => !x.finished && x.ko > now) || rows.find((x) => !x.finished) || rows[rows.length - 1];
    if (!nextUp) return { list: [], today: false };
    const focus = dstr(nextUp.ko);
    const day = rows.filter((x) => dstr(x.ko) === focus);
    day.sort((a, b) => (a.finished ? 1 : 0) - (b.finished ? 1 : 0) || a.ko - b.ko);
    return { list: day.map((x) => x.m), today: focus === dstr(now) };
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
