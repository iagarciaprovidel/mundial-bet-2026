/* MundialBet Club 2026 — Bracket eliminatorio + Sparkline de saldo + Apostador del día
   Expone:
     window.MB_BracketScreen  — cuadro eliminatorio con tabs por ronda
     window.MB_SaldoSparkline — gráfico SVG de evolución del saldo
     window.MB_TopTodayBanner — banner motivacional / apostador del día
*/
(function () {
  'use strict';
  const { useState, useEffect, useRef } = React;
  const { Card, Chip } = window;

  const STAGES = [
    { key: 'r32',   label: 'Dieciseisavos', short: 'R32',   cols: 2 },
    { key: 'r16',   label: 'Octavos',        short: 'Octavos', cols: 2 },
    { key: 'qf',    label: 'Cuartos',        short: 'Cuartos', cols: 2 },
    { key: 'sf',    label: 'Semifinales',    short: 'Semis',   cols: 1 },
    { key: 'final', label: 'Final',          short: '🏆 Final', cols: 1 },
  ];

  // ── Tarjeta de partido ────────────────────────────────────────
  function BracketMatch({ m, od, champCode }) {
    if (!m) return null;
    const finished  = !!(od && od.finished);
    const homeWon   = finished && od.winner === 'home';
    const awayWon   = finished && od.winner === 'away';
    const homeChamp = !!(champCode && m.homeCode === champCode);
    const awayChamp = !!(champCode && m.awayCode === champCode);
    const anyChamp  = homeChamp || awayChamp;
    const now       = Date.now();
    const ko        = new Date(m.kickoff).getTime();
    const live      = !finished && ko <= now && ko > now - 3 * 60 * 60 * 1000;

    const fmtDate = new Date(m.kickoff).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    const teamRow = (name, code, won, isChamp, score) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '5px 2px',
        opacity: finished && !won ? 0.38 : 1,
      }}>
        {code
          ? <img src={`https://flagcdn.com/h20/${code}.png`} alt="" style={{ height: 15, width: 'auto', borderRadius: 2, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
          : <span style={{ width: 22, height: 15, background: 'var(--border)', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />}
        <span style={{
          flex: 1, fontSize: 'var(--t-xs)', minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: won ? 800 : isChamp ? 700 : 500,
          color: isChamp ? 'var(--gold-light)' : won ? 'var(--success)' : name ? 'var(--text)' : 'var(--muted-2)',
        }}>
          {name || 'Por definir'}{isChamp ? ' ⭐' : ''}
        </span>
        {finished && score != null && (
          <span className="num" style={{ fontWeight: 800, fontSize: 'var(--t-sm)', color: won ? 'var(--success)' : 'var(--muted-2)', flexShrink: 0, minWidth: 18, textAlign: 'right' }}>
            {score}
          </span>
        )}
      </div>
    );

    return (
      <div style={{
        background: 'var(--surface-1)', borderRadius: 'var(--r-md)', overflow: 'hidden',
        border: anyChamp ? '1px solid rgba(212,175,55,0.8)' : '1px solid var(--border)',
        boxShadow: anyChamp ? '0 0 10px rgba(212,175,55,0.2)' : 'var(--sh-1)',
      }}>
        <div style={{ padding: '8px 10px' }}>
          {teamRow(m.home, m.homeCode, homeWon, homeChamp, od && od.homeScore != null ? od.homeScore : null)}
          <div style={{ borderTop: '1px solid var(--border)', margin: '1px 0' }} />
          {teamRow(m.away, m.awayCode, awayWon, awayChamp, od && od.awayScore != null ? od.awayScore : null)}
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.25)', padding: '4px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 'var(--t-3xs)', color: live ? '#ff5252' : 'var(--muted-2)',
        }}>
          <span>
            {live ? '🔴 En vivo' : finished ? '✅ Finalizado' : fmtDate}
          </span>
          {live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5252', display: 'inline-block', animation: 'mb-pulse-live 1s infinite' }} />}
        </div>
      </div>
    );
  }

  // ── Pantalla de bracket ───────────────────────────────────────
  function BracketScreen() {
    const store     = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const authUser  = store ? store.authUser : null;
    const users     = (store && store.users) || [];
    const meRec     = authUser ? (users.find(u => u.uid === authUser.uid) || null) : null;
    const champCode = meRec ? meRec.championCode : null;
    const champName = meRec ? meRec.champion    : null;
    const odds      = (store && store.odds) || {};
    const [stage, setStage] = useState('r32');

    const fx = (window.MB && window.MB.WC_FIXTURES) || [];
    const byStage = {};
    STAGES.forEach(s => { byStage[s.key] = fx.filter(m => m.stage === s.key); });

    // Auto-seleccionar la ronda activa más relevante
    useEffect(() => {
      const active = STAGES.find(s => {
        const matches = byStage[s.key];
        return matches.length > 0 && matches.some(m => !(odds[m.id] || {}).finished);
      });
      if (active) setStage(active.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const matches = byStage[stage] || [];
    const cols    = (STAGES.find(s => s.key === stage) || {}).cols || 2;
    const stageLabel = (STAGES.find(s => s.key === stage) || {}).label || '';

    return (
      <div>
        {champCode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 0 12px', fontSize: 'var(--t-xs)', color: 'var(--muted)', lineHeight: 1.4 }}>
            <img src={`https://flagcdn.com/h20/${champCode}.png`} alt="" style={{ height: 14, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
            <span>Sigues los partidos de <strong style={{ color: 'var(--gold-light)' }}>{champName}</strong> — borde dorado</span>
          </div>
        )}

        {/* Tabs de ronda */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {STAGES.map(s => {
            const cnt    = byStage[s.key].length;
            const active = stage === s.key;
            const done   = cnt > 0 && byStage[s.key].every(m => !!(odds[m.id] || {}).finished);
            return (
              <button key={s.key} onClick={() => setStage(s.key)} className="mb-press" style={{
                flexShrink: 0, padding: '6px 13px', borderRadius: 'var(--r-pill)',
                border: active ? '1px solid var(--info)' : '1px solid var(--border-2)',
                background: active ? 'rgba(74,144,226,0.18)' : 'var(--surface-2)',
                color: active ? 'var(--info)' : cnt > 0 ? 'var(--text)' : 'var(--muted-2)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontWeight: active ? 800 : 600, fontSize: 'var(--t-sm)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {done && <span style={{ color: 'var(--success)', fontSize: 10 }}>✓</span>}
                {s.short}
                {cnt === 0 && <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>TBD</span>}
              </button>
            );
          })}
        </div>

        {matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--surface-1)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔜</div>
            <div style={{ fontWeight: 800, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>{stageLabel}</div>
            <div style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              Los partidos se confirman tras cada ronda.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
            {matches.map(m => <BracketMatch key={m.id} m={m} od={odds[m.id] || {}} champCode={champCode} />)}
          </div>
        )}
      </div>
    );
  }

  // ── Sparkline de saldo ────────────────────────────────────────
  function SaldoSparkline({ bets }) {
    const ref = useRef(null);
    const ms  = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);

    const settled = (bets || [])
      .filter(b => (b.status === 'won' || b.status === 'lost') && b.creado)
      .sort((a, b) => ms(a.creado) - ms(b.creado));

    if (settled.length < 2) return null;

    const points = [90000];
    settled.forEach(b => {
      const last  = points[points.length - 1];
      const stake = Math.max(0, b.stake || 1000);
      points.push(b.status === 'won' ? last + stake : last - stake);
    });

    const minV = Math.min(...points);
    const maxV = Math.max(...points);
    const rng  = Math.max(maxV - minV, 1000);
    const W = 280, H = 54, pad = 4;
    const x = (i) => pad + (i / (points.length - 1)) * (W - 2 * pad);
    const y = (v) => pad + ((maxV - v) / rng) * (H - 2 * pad);
    const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${path} L${x(points.length - 1).toFixed(1)},${H} L${pad},${H} Z`;
    const last  = points[points.length - 1];
    const color = last >= 90000 ? 'var(--success)' : 'var(--danger)';
    const fmt   = (n) => Number(n).toLocaleString('es-CL').replace(/,/g, '.');

    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 'var(--t-xs)', fontWeight: 700, color: 'var(--text)' }}>📈 Evolución del saldo</span>
          <span style={{ fontSize: 'var(--t-2xs)', fontWeight: 800, color }} className="num">
            {last >= 90000 ? '+' : ''}{fmt(last - 90000)} pts
          </span>
        </div>
        <svg ref={ref} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="mb-sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={last >= 90000 ? '#00C85A' : '#E84040'} stopOpacity="0.35" />
              <stop offset="100%" stopColor={last >= 90000 ? '#00C85A' : '#E84040'} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line x1={pad} y1={y(90000).toFixed(1)} x2={W - pad} y2={y(90000).toFixed(1)} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,3" />
          <path d={area} fill="url(#mb-sg)" />
          <path d={path} fill="none" stroke={last >= 90000 ? '#00C85A' : '#E84040'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(points.length - 1).toFixed(1)} cy={y(last).toFixed(1)} r="3.5" fill={last >= 90000 ? '#00C85A' : '#E84040'} />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 4 }}>
          <span>Inicio: 90.000</span>
          <span>{settled.length} apuestas resueltas</span>
        </div>
      </div>
    );
  }

  // ── Banner apostador del día ──────────────────────────────────
  function TopTodayBanner() {
    const store    = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const authUser = store ? store.authUser : null;
    const bets     = store ? Object.values(store.bets || {}) : [];
    const ms       = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);

    if (!authUser || bets.length === 0) return null;

    // Racha actual del usuario
    const sorted = bets
      .filter(b => b.status === 'won' || b.status === 'lost')
      .sort((a, b) => ms(a.creado) - ms(b.creado));
    let streak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].status === 'won') streak++;
      else break;
    }

    if (streak < 2) return null;

    const msgs = [
      `¡Llevas ${streak} aciertos seguidos! 🔥 Sigue así`,
      `${streak} en racha — estás en modo campeón 🏆`,
      `¡${streak} correctas seguidas! 📈 No pares`,
    ];
    const msg = msgs[streak % msgs.length];

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 'var(--r-md)',
        background: 'linear-gradient(135deg, rgba(0,200,90,0.15), rgba(0,100,50,0.1))',
        border: '1px solid rgba(0,200,90,0.4)',
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🔥</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: 'var(--success)' }}>{msg}</div>
          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', marginTop: 1 }}>Cada acierto suma a tu bono de racha</div>
        </div>
      </div>
    );
  }

  window.MB_BracketScreen  = BracketScreen;
  window.MB_SaldoSparkline = SaldoSparkline;
  window.MB_TopTodayBanner = TopTodayBanner;
})();
