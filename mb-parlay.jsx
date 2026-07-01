/* ============================================================
   MundialBet Club 2026 — Apuesta combinada (parlay)
   Modo aparte de la apuesta simple: el jugador junta picks de 2-6
   partidos distintos en un "ticket" único; la cuota se multiplica
   (combinedOdd) y solo paga si TODOS los picks aciertan.
   El draft (legs en construcción) vive solo en memoria del cliente;
   se persiste en Firestore (`parlays`) recién al confirmar.
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  const KO_STAGES = new Set(['r32', 'r16', 'qf', 'sf', 'final']);
  const isKO = (m) => KO_STAGES.has(m && m.stage);
  const DRAW_LABEL = (m) => isKO(m) ? 'Prórr./Pen.' : 'Empate';

  const PARLAY_ERR = {
    'combinada-minima': 'Necesitas al menos 2 partidos en la combinada.',
    'combinada-maxima': 'Máximo 6 partidos por combinada.',
    'min-1000': 'La apuesta mínima es 1.000.',
    'saldo-insuficiente': 'No tienes saldo suficiente.',
    'no-auth': 'Inicia sesión para apostar.',
    'partido-repetido': 'No puedes repetir el mismo partido.',
    'cerrado': 'Uno de los partidos de la combinada ya comenzó.',
    'sin-cuota': 'Una de las cuotas ya no está disponible.',
  };

  // ── Draft de la combinada: store en memoria, compartido entre componentes ──
  const slip = { on: false, legs: [], listeners: new Set() };
  function emit() { slip.listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }
  function setMode(on) { slip.on = on; emit(); }
  function togglePick(m, pick, odd) {
    const i = slip.legs.findIndex((l) => l.matchId === m.id);
    if (i !== -1 && slip.legs[i].pick === pick) { slip.legs = slip.legs.filter((l) => l.matchId !== m.id); emit(); return; }
    const leg = { matchId: m.id, pick: pick, home: m.home, away: m.away, kickoff: m.kickoff, odd: odd };
    if (i !== -1) { slip.legs = slip.legs.slice(); slip.legs[i] = leg; } else { slip.legs = slip.legs.concat([leg]); }
    emit();
  }
  function removeLeg(matchId) { slip.legs = slip.legs.filter((l) => l.matchId !== matchId); emit(); }
  function clearSlip() { slip.legs = []; emit(); }

  function useParlaySlip() {
    const [, force] = useState(0);
    useEffect(() => {
      const fn = () => force((x) => x + 1);
      slip.listeners.add(fn);
      return () => { slip.listeners.delete(fn); };
    }, []);
    return slip;
  }
  window.MB_useParlaySlip = useParlaySlip;

  // ── Chip para entrar/salir del modo combinada ──
  // El tooltip resume el concepto en una línea para que el usuario entienda antes de activarlo.
  function ParlayModeToggle() {
    const s = useParlaySlip();
    return (
      <button onClick={() => setMode(!s.on)} className="mb-press" title="Junta 2-6 partidos en una sola apuesta — las cuotas se multiplican, pero debes acertar TODOS" style={{
        flexShrink: 0, padding: '7px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
        background: s.on ? 'linear-gradient(135deg, #61DAFB, #4A90E2)' : 'var(--surface-2)',
        border: s.on ? '1.5px solid #61DAFB' : '1px solid var(--border-2)',
        color: s.on ? '#06141f' : 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap',
      }}>
        🎰 Combinada{s.legs.length > 0 ? ' · ' + s.legs.length : ''}
      </button>
    );
  }
  window.MB_ParlayModeToggle = ParlayModeToggle;

  // ── Tira de picks para un partido, en modo combinada (reemplaza al BetBox normal) ──
  function ParlayPickStrip({ m }) {
    const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const odds = (store && store.odds && store.odds[m.id]) || null;
    const s = useParlaySlip();
    const closed = new Date(m.kickoff).getTime() + 5 * 60 * 1000 <= Date.now();
    if (closed) return <div style={{ marginTop: 10, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center' }}>🔒 Cerrado para combinada</div>;
    if (!odds || (!odds.home && !odds.draw && !odds.away)) return <div style={{ marginTop: 10, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center', fontStyle: 'italic' }}>💱 Cuotas próximamente…</div>;
    const leg = s.legs.find((l) => l.matchId === m.id);
    const picks = [
      { k: 'home', label: m.home, odd: odds.home },
      { k: 'draw', label: DRAW_LABEL(m), odd: odds.draw },
      { k: 'away', label: m.away, odd: odds.away },
    ];
    return (
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: '#61DAFB', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎰 Agregar a combinada</span>
          <span style={{ fontSize: 8, color: 'var(--muted-2)' }}>elige 1 resultado por partido</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {picks.map((p) => {
            const active = leg && leg.pick === p.k;
            const has = p.odd != null;
            return (
              <button key={p.k} disabled={!has} onClick={() => has && togglePick(m, p.k, Number(p.odd))} className="mb-press" style={{
                flex: 1, minWidth: 0, padding: '6px 4px', cursor: has ? 'pointer' : 'default', borderRadius: 'var(--r-md)',
                background: active ? 'rgba(97,218,251,0.18)' : 'var(--surface-2)', border: active ? '1.5px solid #61DAFB' : '1px solid var(--border-2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: has ? 1 : 0.4,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: active ? '#61DAFB' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.k === 'draw' ? DRAW_LABEL(m) : (p.k === 'home' ? '🏠 ' : '✈ ') + p.label}</span>
                <span className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: active ? '#61DAFB' : 'var(--text)' }}>{has ? Number(p.odd).toFixed(2) : '—'}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  window.MB_ParlayPickStrip = ParlayPickStrip;

  const stepBtnP = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1 };

  // ── Ticket flotante + modal para armar/confirmar la combinada ──
  function ParlaySlip() {
    const s = useParlaySlip();
    const [open, setOpen] = useState(false);
    const [stake, setStake] = useState(1000);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');
    const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const saldo = (store && typeof store.saldo === 'number') ? store.saldo : 90000;

    if (!s.on) return null;
    const legs = s.legs;
    const combinedOdd = legs.reduce((p, l) => p * (l.odd || 1), 1);
    const win = legs.length ? Math.round(stake * combinedOdd) : 0;

    const confirm = () => {
      if (legs.length < 2) { setErr('Necesitas al menos 2 partidos.'); return; }
      setErr(''); setOk(''); setBusy(true);
      FB().placeParlay(legs.map((l) => ({ matchId: l.matchId, pick: l.pick, home: l.home, away: l.away, kickoff: l.kickoff })), stake)
        .then(() => { setOk('¡Combinada registrada!'); clearSlip(); setTimeout(() => setOpen(false), 900); })
        .catch((e) => { const code = (e && e.code) || e; setErr(PARLAY_ERR[code] || ('No se pudo: ' + ((e && e.message) || code))); })
        .then(() => setBusy(false));
    };

    return (
      <>
        {legs.length > 0 && !open && (
          <div onClick={() => setOpen(true)} className="mb-press" style={{
            position: 'sticky', bottom: 10, marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-pill)',
            background: 'linear-gradient(135deg, #61DAFB, #4A90E2)', color: '#06141f',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
            boxShadow: 'var(--sh-3)', fontWeight: 800, fontSize: 'var(--t-2xs)', zIndex: 6,
          }}>
            <span>🎰 {legs.length} partido{legs.length === 1 ? '' : 's'} en tu combinada</span>
            <span className="num">×{combinedOdd.toFixed(2)} ›</span>
          </div>
        )}
        {open && (
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1150, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '85vh', overflow: 'auto', background: 'var(--bg)', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, border: '1px solid var(--border-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)' }}>🎰 Combinada</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {legs.length > 0 && <button onClick={clearSlip} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 'var(--t-2xs)', fontWeight: 700, cursor: 'pointer' }}>Vaciar</button>}
                  <button onClick={() => setOpen(false)} className="mb-press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
              {/* Explicación visual de qué es una combinada */}
              <div style={{ marginBottom: 14, padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'rgba(97,218,251,0.07)', border: '1px solid rgba(97,218,251,0.2)' }}>
                <div style={{ fontSize: 'var(--t-2xs)', color: '#61DAFB', fontWeight: 800, marginBottom: 6 }}>¿Qué es una apuesta combinada?</div>
                <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>
                  Juntas el resultado de <strong style={{ color: 'var(--text)' }}>2 a 6 partidos</strong> en un solo ticket. Las cuotas <strong style={{ color: '#61DAFB' }}>se multiplican entre sí</strong>, así el premio puede ser mucho mayor que apostando partido por partido. La trampa: si <strong style={{ color: '#e98b8b' }}>fallas aunque sea uno</strong>, pierdes toda la apuesta.
                </div>
                {/* Ejemplo visual */}
                <div style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Ejemplo</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {[['Argentina gana', '×1.80'], ['Francia gana', '×2.10'], ['España gana', '×1.95']].map(([label, odd], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>
                      <span>⚽ {label}</span>
                      <span style={{ color: 'var(--gold-light)', fontWeight: 800 }}>{odd}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(97,218,251,0.15)', marginTop: 2, paddingTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-2xs)', fontWeight: 800 }}>
                    <span style={{ color: '#61DAFB' }}>Cuota combinada</span>
                    <span style={{ color: '#61DAFB' }}>×7.37</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-2xs)', fontWeight: 800 }}>
                    <span style={{ color: 'var(--muted)' }}>Apostando 5.000 pts → ganás</span>
                    <span style={{ color: 'var(--success)' }}>36.850 pts</span>
                  </div>
                </div>
                <div style={{ fontSize: 8, color: '#e98b8b', lineHeight: 1.5 }}>⚠ Si España empata, pierdes los 5.000 aunque Argentina y Francia hayan ganado.</div>
              </div>
              {legs.length === 0 ? (
                <div style={{ padding: '10px 0 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>¿Cómo armo mi combinada?</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', lineHeight: 1.5 }}>1. Cierra este panel<br />2. Elige el resultado de cada partido (Local · Empate · Visita)<br />3. Vuelve aquí para confirmar y apostar</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
                  {legs.map((l) => (
                    <div key={l.matchId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--t-2xs)', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.home} vs {l.away}</div>
                        <div style={{ fontSize: 8, color: '#61DAFB', fontWeight: 700 }}>{l.pick === 'home' ? l.home : l.pick === 'away' ? l.away : 'Empate/Pen.'} @ {Number(l.odd).toFixed(2)}</div>
                      </div>
                      <button onClick={() => removeLeg(l.matchId)} className="mb-press" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {legs.length === 1 && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', textAlign: 'center', padding: '4px 0 14px' }}>Agrega al menos 1 partido más.</div>}
              {legs.length >= 2 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                    <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Monto a apostar</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setStake((a) => Math.max(1000, a - 1000))} className="mb-press" style={stepBtnP}>−</button>
                      <span className="num" style={{ minWidth: 64, textAlign: 'center', fontWeight: 800, color: 'var(--gold-light)' }}>{fmt(stake)}</span>
                      <button onClick={() => setStake((a) => a + 1000)} className="mb-press" style={stepBtnP}>+</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(97,218,251,0.10)', borderRadius: 'var(--r-md)', marginBottom: 6 }}>
                    <span style={{ fontSize: 'var(--t-2xs)', color: '#61DAFB' }}>Cuota combinada</span>
                    <span className="num" style={{ fontWeight: 800, color: '#61DAFB' }}>×{combinedOdd.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)', marginBottom: 12 }}>
                    <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)' }}>Ganancia si aciertas TODO</span>
                    <span className="num" style={{ fontWeight: 800, color: 'var(--success)' }}>{fmt(win)}</span>
                  </div>
                  <button onClick={confirm} disabled={busy || stake < 1000 || stake > saldo} className="mb-press" style={{
                    width: '100%', padding: '11px', borderRadius: 'var(--r-pill)', cursor: 'pointer', border: 'none',
                    fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', color: '#06141f',
                    background: (busy || stake < 1000 || stake > saldo) ? 'var(--surface-2)' : 'linear-gradient(180deg, #61DAFB, #4A90E2)',
                    opacity: (busy || stake < 1000 || stake > saldo) ? 0.55 : 1,
                  }}>{busy ? 'Registrando…' : 'Confirmar combinada'}</button>
                </>
              )}
              {err && <div style={{ marginTop: 10, fontSize: 'var(--t-2xs)', color: '#e98b8b', fontWeight: 700 }}>⚠ {err}</div>}
              {ok && <div style={{ marginTop: 10, fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 700 }}>✓ {ok}</div>}
            </div>
          </div>
        )}
      </>
    );
  }
  window.MB_ParlaySlip = ParlaySlip;

  // ── Tarjeta de combinada ya registrada (abierta o liquidada) ──
  function ParlayCard({ p }) {
    const [busy, setBusy] = useState(false);
    const legs = p.legs || [];
    const started = legs.some((l) => new Date(l.kickoff).getTime() + 5 * 60 * 1000 <= Date.now());
    const cancel = () => { setBusy(true); FB().cancelParlay(p.id).catch(() => {}).then(() => setBusy(false)); };
    const won = p.status === 'won';
    const settled = p.status === 'won' || p.status === 'lost';
    return (
      <div style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'rgba(13,20,15,0.92)', border: '1px solid ' + (settled ? (won ? 'rgba(46,160,67,0.5)' : 'rgba(220,80,80,0.4)') : 'rgba(97,218,251,0.4)') }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: settled ? (won ? 'var(--success)' : '#e98b8b') : '#61DAFB' }}>
            🎰 Combinada · {legs.length} partidos {settled ? (won ? '· ✓ Ganaste' : '· ✕ Perdiste') : ''}
          </span>
          <span className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: settled ? (won ? 'var(--success)' : '#e98b8b') : '#61DAFB' }}>×{Number(p.combinedOdd || 0).toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
          {legs.map((l, i) => (
            <div key={i} style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{l.home} vs {l.away}</span>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>{l.pick === 'home' ? l.home : l.pick === 'away' ? l.away : 'Empate/Pen.'}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Apostado: <span className="num" style={{ color: 'var(--gold-light)', fontWeight: 700 }}>{fmt(p.stake)}</span></span>
          <span className="num" style={{ fontSize: 'var(--t-2xs)', fontWeight: 800, color: settled ? (won ? 'var(--success)' : '#e98b8b') : 'var(--success)' }}>
            {settled ? (won ? '+' + fmt(p.payout) : '−' + fmt(p.stake)) : '↑ ' + fmt(Math.round((p.stake || 0) * (p.combinedOdd || 0)))}
          </span>
        </div>
        {!settled && !started && (
          <button onClick={cancel} disabled={busy} className="mb-press" style={{ marginTop: 8, width: '100%', padding: '7px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)', cursor: 'pointer' }}>Cancelar</button>
        )}
        {!settled && started && <div style={{ marginTop: 6, fontSize: 9, color: 'var(--muted-2)', textAlign: 'center' }}>Cerrada · esperando resultados</div>}
      </div>
    );
  }
  window.MB_ParlayCard = ParlayCard;

  // ── Componente que envuelve BetBox + modo combinada en uno solo ──
  // Usar esto en lugar de llamar useParlaySlip dentro de un IIFE en las tarjetas.
  function BetBoxOrParlay({ m }) {
    const s = useParlaySlip();
    if (s.on) return <ParlayPickStrip m={m} />;
    return window.MB_BetBox ? <window.MB_BetBox m={m} /> : null;
  }
  window.MB_BetBoxOrParlay = BetBoxOrParlay;
})();
