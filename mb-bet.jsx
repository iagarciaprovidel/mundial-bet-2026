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
  // (Re)crea las suscripciones a cuotas/apuestas/saldo. Las cuotas requieren
  // sesión (reglas), por eso hay que rehacerlas cuando la sesión esté lista.
  function resubscribe() {
    unsubs.forEach((u) => { try { if (typeof u === 'function') u(); } catch (e) {} });
    unsubs = [];
    const fb = FB();
    if (fb.subscribeOdds) unsubs.push(fb.subscribeOdds((o) => { store.odds = o || {}; store.ready = true; emit(); }));
    if (fb.subscribeMyBets) unsubs.push(fb.subscribeMyBets((list) => {
      const map = {}; (list || []).forEach((b) => { map[b.matchId] = b; }); store.bets = map; emit();
    }));
    if (fb.subscribeMe) unsubs.push(fb.subscribeMe((u) => {
      store.saldo = (u && typeof u.saldo === 'number') ? u.saldo : (u ? SALDO_INICIAL : null); emit();
    }));
  }
  function start() {
    if (started) return; started = true;
    const fb = FB();
    // Reconecta en CADA cambio de sesión (login / logout / restauración al cargar).
    // Así las cuotas se cargan cuando Firebase ya restauró la sesión, no antes.
    if (fb.onAuth) { fb.onAuth(function () { store.bets = {}; store.saldo = null; emit(); resubscribe(); }); }
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

    // Partido EN VIVO (casi en vivo): muestra el marcador mientras se juega.
    const live = odds && odds.live && !odds.finished;
    if (live) {
      const gh = (odds.gh != null) ? odds.gh : 0;
      const ga = (odds.ga != null) ? odds.ga : 0;
      return (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 'var(--r-md)', border: '1px solid rgba(220,80,80,0.5)', background: 'rgba(220,80,80,0.12)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#ff6b6b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5252', animation: 'mb-pulse-live 1s var(--ease-out) infinite' }} />EN VIVO{odds.minute != null ? ' · ' + odds.minute + "'" : ''}
            </span>
            <span className="num" style={{ fontSize: 'var(--t-lg)', fontWeight: 800, color: 'var(--text)' }}>{gh} <span style={{ color: 'var(--muted-2)' }}>–</span> {ga}</span>
          </div>
          {bet && bet.status === 'open' && (
            <div style={{ marginTop: 6, fontSize: 'var(--t-2xs)', color: 'var(--muted)', textAlign: 'center' }}>Tu apuesta: <span style={{ color: 'var(--info)', fontWeight: 700 }}>{PICK_LABEL(m, bet.pick)}</span> · {fmt(bet.stake)} @ {Number(bet.odd).toFixed(2)}</div>
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

  // ── Cuenta regresiva en vivo al próximo partido ──
  function NextMatchCountdown() {
    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
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

  // ── Botón para activar las notificaciones push ──
  const NERR = {
    'no-soportado': 'Tu navegador no soporta notificaciones.',
    'falta-vapid': 'Faltan configurar las notificaciones (clave VAPID).',
    'permiso-denegado': 'Diste permiso denegado. Actívalo en los ajustes del sitio.',
    'sin-token': 'No se pudo obtener el token de notificaciones.',
    'no-auth': 'Inicia sesión primero.',
  };
  function NotifButton() {
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const [perm, setPerm] = useState(() => (FB().notifPermission ? FB().notifPermission() : 'unsupported'));
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    if (!user || perm === 'unsupported') return null;
    if (perm === 'granted') {
      return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(46,160,67,0.45)', background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>🔔 Notificaciones activadas ✓</div>;
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
        <button onClick={enable} disabled={busy || perm === 'denied'} className="mb-press" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 'var(--r-pill)', cursor: perm === 'denied' ? 'not-allowed' : 'pointer', border: '1px solid rgba(74,144,226,0.5)', background: 'rgba(74,144,226,0.12)', color: 'var(--info)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', opacity: perm === 'denied' ? 0.6 : 1 }}>
          🔔 {busy ? 'Activando…' : 'Activar notificaciones'}
        </button>
        {(msg || perm === 'denied') && <div style={{ marginTop: 6, fontSize: 9, color: 'var(--muted-2)', textAlign: 'center' }}>{perm === 'denied' ? 'Están bloqueadas en el navegador; actívalas en los ajustes del sitio.' : msg}</div>}
      </div>
    );
  }
  window.MB_NotifButton = NotifButton;

  // ── Pronóstico del campeón del Mundial (gratis, cierra al primer partido) ──
  const CHAMPION_BONUS = 30000;
  function ChampionPick() {
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

    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    const firstKO = fx.length ? Math.min.apply(null, fx.map((m) => new Date(m.kickoff).getTime())) : Infinity;
    const closed = Date.now() >= firstKO;
    const pick = me && me.champion;
    const pickCode = me && me.championCode;

    const TEAMS = [];
    const G = (window.MB_WC && window.MB_WC.GROUPS) || {};
    Object.keys(G).forEach((k) => (G[k] || []).forEach((t) => TEAMS.push({ name: t[0], code: t[1] })));
    TEAMS.sort((a, b) => a.name.localeCompare(b.name));

    const choose = (t) => { setBusy(true); FB().setChampion(t.name, t.code).then(() => setOpen(false)).catch(() => {}).then(() => setBusy(false)); };

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
        <div style={{ marginTop: 8, fontSize: 9, color: 'var(--muted-2)', textAlign: 'center' }}>{closed ? 'El pronóstico del campeón está cerrado.' : 'Gratis · cierra al empezar el Mundial.'} Si aciertas, ganas +{fmt(CHAMPION_BONUS)} puntos al final.</div>

        {open && ReactDOM.createPortal(
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1150, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 18, width: 'min(460px, 96vw)', maxHeight: '88vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>🏆</span>
                <h2 className="display" style={{ margin: 0, flex: 1, fontSize: 'var(--t-xl)' }}>Elige al campeón</h2>
                <button onClick={() => setOpen(false)} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
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
          </div>, document.body)}
      </div>
    );
  }
  window.MB_ChampionPick = ChampionPick;

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
