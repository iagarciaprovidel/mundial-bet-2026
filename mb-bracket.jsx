/* MundialBet Club 2026 — Bracket eliminatorio visual + Sparkline + Banner racha
   Expone:
     window.MB_BracketScreen  — cuadro bracket con líneas conectoras
     window.MB_SaldoSparkline — gráfico SVG de evolución del saldo
     window.MB_TopTodayBanner — banner motivacional de racha
*/
(function () {
  'use strict';

  // ── Dimensiones del bracket ───────────────────────────────
  const CW   = 72;           // ancho de tarjeta de partido
  const CH   = 34;           // alto de tarjeta
  const CN   = 10;           // ancho del conector entre rondas
  const SH   = CH + 4;      // slot height (34 + 4 gap) = 38
  const CGAP = 14;           // gap antes/después de la Final

  // Posiciones X — mitad izquierda
  const R32X = 0;
  const R16X = CW + CN;              // 82
  const QFX  = R16X + CW + CN;      // 164
  const SFX  = QFX  + CW + CN;      // 246
  const FINX = SFX  + CW + CGAP;    // 332  ← tarjeta Final

  // Posiciones X — mitad derecha (espejo desde FINX+CW)
  const SFRX  = FINX + CW + CGAP;   // 418
  const QFRX  = SFRX + CW + CN;     // 500
  const R16RX = QFRX + CW + CN;     // 582
  const R32RX = R16RX + CW + CN;    // 664

  const TOTAL_W = R32RX + CW;       // 736
  const TOTAL_H = 8 * SH - 4;      // 300  (7 gaps + 8 cards)

  // Posición Y superior de cada tarjeta (por ronda e índice)
  const yr32 = (i) => i * SH;
  const yr16 = (i) => (2 * i + 1) * SH - CH / 2;   // 21 + 76i
  const yqf  = (i) => (4 * i + 2) * SH - CH / 2;   // 59 + 152i
  const ysf  = ()  => 4 * SH - CH / 2;              // 135
  const yfin = ()  => 4 * SH - CH / 2;              // 135

  // Centro Y de una tarjeta dado su top Y
  const cY = (y) => y + CH / 2;

  // ── Líneas conectoras (SVG paths) ─────────────────────────
  function buildConnectors() {
    const S = 'rgba(255,255,255,0.15)';
    const p = [];

    // Izquierda: R32 → R16
    for (let i = 0; i < 4; i++) {
      const ty = cY(yr32(2 * i)), by = cY(yr32(2 * i + 1)), my = (2 * i + 1) * SH;
      const bx = R32X + CW + CN / 2;
      p.push(`M${R32X + CW} ${ty} H${bx} V${my} H${R16X} M${R32X + CW} ${by} H${bx} V${my}`);
    }
    // Izquierda: R16 → QF
    for (let i = 0; i < 2; i++) {
      const ty = (4 * i + 1) * SH, by = (4 * i + 3) * SH, my = (4 * i + 2) * SH;
      const bx = R16X + CW + CN / 2;
      p.push(`M${R16X + CW} ${ty} H${bx} V${my} H${QFX} M${R16X + CW} ${by} H${bx} V${my}`);
    }
    // Izquierda: QF → SF
    {
      const bx = QFX + CW + CN / 2;
      p.push(`M${QFX + CW} ${2 * SH} H${bx} V${4 * SH} H${SFX} M${QFX + CW} ${6 * SH} H${bx} V${4 * SH}`);
    }
    // Izquierda: SF → Final
    p.push(`M${SFX + CW} ${4 * SH} H${FINX}`);

    // Derecha: R32 → R16
    for (let i = 0; i < 4; i++) {
      const ty = cY(yr32(2 * i)), by = cY(yr32(2 * i + 1)), my = (2 * i + 1) * SH;
      const bx = R16RX + CW + CN / 2;
      p.push(`M${R32RX} ${ty} H${bx} V${my} H${R16RX + CW} M${R32RX} ${by} H${bx} V${my}`);
    }
    // Derecha: R16 → QF
    for (let i = 0; i < 2; i++) {
      const ty = (4 * i + 1) * SH, by = (4 * i + 3) * SH, my = (4 * i + 2) * SH;
      const bx = QFRX + CW + CN / 2;
      p.push(`M${R16RX} ${ty} H${bx} V${my} H${QFRX + CW} M${R16RX} ${by} H${bx} V${my}`);
    }
    // Derecha: QF → SF
    {
      const bx = SFRX + CW + CN / 2;
      p.push(`M${QFRX} ${2 * SH} H${bx} V${4 * SH} H${SFRX + CW} M${QFRX} ${6 * SH} H${bx} V${4 * SH}`);
    }
    // Derecha: SF → Final
    p.push(`M${SFRX} ${4 * SH} H${FINX + CW}`);

    return p.map((d) => ({ d, stroke: S }));
  }

  const CONNECTORS = buildConnectors();

  // ── Etiquetas de ronda ────────────────────────────────────
  const ROUND_LABELS = [
    [R32X,  'R32'],
    [R16X,  'Octavos'],
    [QFX,   'Cuartos'],
    [SFX,   'Semis'],
    [FINX,  'Final'],
    [SFRX,  'Semis'],
    [QFRX,  'Cuartos'],
    [R16RX, 'Octavos'],
    [R32RX, 'R32'],
  ];

  // ── Tarjeta de partido ────────────────────────────────────
  function MatchCard({ m, x, y, champCode, od }) {
    if (!m) {
      return (
        <div style={{
          position: 'absolute', left: x, top: y, width: CW, height: CH,
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 4, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: 0.5 }}>TBD</span>
        </div>
      );
    }

    const finished = !!(od && od.finished);
    const homeWon  = finished && od.winner === 'home';
    const awayWon  = finished && od.winner === 'away';
    const hCode    = m.homeCode;
    const aCode    = m.awayCode;
    const isChamp  = champCode && (hCode === champCode || aCode === champCode);

    const openT = (name) => { if (name && window.MB_openTeam) window.MB_openTeam(name); };

    const Row = ({ name, code, won, score }) => {
      const gold = champCode && code === champCode;
      return (
        <div
          onClick={() => openT(name)}
          title={name}
          style={{
            display: 'flex', alignItems: 'center', gap: 3, height: 13,
            opacity: finished && !won ? 0.32 : 1,
            cursor: name ? 'pointer' : 'default',
          }}
        >
          {code
            ? <img src={`https://flagcdn.com/h20/${code}.png`} alt="" style={{ height: 10, width: 'auto', flexShrink: 0 }} />
            : <span style={{ width: 14, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />}
          <span style={{
            flex: 1, fontSize: 8, lineHeight: 1,
            fontWeight: gold ? 800 : won ? 700 : 500,
            color: gold ? 'var(--gold-light)' : won ? 'var(--success)' : name ? 'var(--text)' : 'var(--muted-2)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name || 'TBD'}
          </span>
          {finished && score != null && (
            <span style={{ fontSize: 9, fontWeight: 800, flexShrink: 0, color: won ? 'var(--success)' : 'var(--muted-2)' }}>
              {score}
            </span>
          )}
        </div>
      );
    };

    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: CW, height: CH,
        background: isChamp ? 'rgba(212,175,55,0.08)' : 'var(--surface-1)',
        border: isChamp ? '1.5px solid rgba(212,175,55,0.65)' : '1px solid var(--border)',
        borderRadius: 4, boxSizing: 'border-box',
        padding: '3px 5px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: isChamp ? '0 0 8px rgba(212,175,55,0.12)' : 'var(--sh-1)',
      }}>
        <Row name={m.home} code={hCode} won={homeWon} score={od && od.homeScore != null ? od.homeScore : null} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1px -5px' }} />
        <Row name={m.away} code={aCode} won={awayWon} score={od && od.awayScore != null ? od.awayScore : null} />
      </div>
    );
  }

  // ── Pantalla principal del bracket ────────────────────────
  function BracketScreen() {
    const store     = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const users     = (store && store.users) || [];
    const authUser  = store ? store.authUser : null;
    const meRec     = authUser ? (users.find(u => u.uid === authUser.uid) || null) : null;
    const champCode = meRec ? meRec.championCode : null;
    const champName = meRec ? meRec.champion    : null;
    const odds      = (store && store.odds) || {};

    const fx       = (window.MB && window.MB.WC_FIXTURES) || [];
    const r32all   = fx.filter(m => m.stage === 'r32');
    const leftR32  = r32all.slice(0, 8);
    const rightR32 = r32all.slice(8, 16);

    const r16all = fx.filter(m => m.stage === 'r16');
    const qfall  = fx.filter(m => m.stage === 'qf');
    const sfall  = fx.filter(m => m.stage === 'sf');
    const final  = fx.filter(m => m.stage === 'final');

    const leftR16  = r16all.slice(0, 4);
    const rightR16 = r16all.slice(4, 8);
    const leftQF   = qfall.slice(0, 2);
    const rightQF  = qfall.slice(2, 4);
    const leftSF   = sfall[0] || null;
    const rightSF  = sfall[1] || null;
    const finalM   = final[0] || null;

    const tbd = null;

    return (
      <div>
        {/* Leyenda campeón elegido */}
        {champCode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, fontSize: 'var(--t-xs)', color: 'var(--muted)' }}>
            <img src={`https://flagcdn.com/h20/${champCode}.png`} alt="" style={{ height: 13, borderRadius: 2 }} />
            <span>Tu campeón: <strong style={{ color: 'var(--gold-light)' }}>{champName}</strong> — borde dorado</span>
          </div>
        )}

        {/* Scroll horizontal */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 10 }}>
          <div style={{ position: 'relative', width: TOTAL_W, height: TOTAL_H + 20 }}>

            {/* SVG: líneas conectoras + trofeo */}
            <svg
              width={TOTAL_W} height={TOTAL_H}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
            >
              {CONNECTORS.map((c, i) => (
                <path key={i} d={c.d} fill="none" stroke={c.stroke} strokeWidth="1.5" strokeLinejoin="round" />
              ))}
              {/* Trofeo centrado sobre la Final */}
              <text
                x={FINX + CW / 2} y={yfin() - 10}
                textAnchor="middle" fontSize="18" dominantBaseline="middle"
              >🏆</text>
            </svg>

            {/* Etiquetas de ronda (abajo) */}
            {ROUND_LABELS.map(([rx, label], idx) => (
              <div key={idx} style={{
                position: 'absolute', left: rx, top: TOTAL_H + 4, width: CW,
                textAlign: 'center', fontSize: 7.5, fontWeight: 700,
                color: label === 'Final' ? 'var(--gold-light)' : 'rgba(255,255,255,0.28)',
                textTransform: 'uppercase', letterSpacing: 0.4,
              }}>{label}</div>
            ))}

            {/* ─── Mitad izquierda ─── */}
            {leftR32.map((m, i)  => <MatchCard key={m.id}         m={m}            x={R32X} y={yr32(i)} champCode={champCode} od={odds[m.id] || {}} />)}
            {Array.from({length: 4}, (_, i) => <MatchCard key={`l16-${i}`}  m={leftR16[i] || tbd}  x={R16X} y={yr16(i)} champCode={champCode} od={leftR16[i] ? (odds[leftR16[i].id] || {}) : {}} />)}
            {Array.from({length: 2}, (_, i) => <MatchCard key={`lqf-${i}`}  m={leftQF[i]  || tbd}  x={QFX}  y={yqf(i)}  champCode={champCode} od={leftQF[i]  ? (odds[leftQF[i].id]  || {}) : {}} />)}
            <MatchCard key="lsf"  m={leftSF  || tbd} x={SFX}  y={ysf()}  champCode={champCode} od={leftSF  ? (odds[leftSF.id]  || {}) : {}} />

            {/* ─── Final ─── */}
            <MatchCard key="fin"  m={finalM  || tbd} x={FINX} y={yfin()} champCode={champCode} od={finalM  ? (odds[finalM.id]  || {}) : {}} />

            {/* ─── Mitad derecha ─── */}
            <MatchCard key="rsf"  m={rightSF || tbd} x={SFRX} y={ysf()}  champCode={champCode} od={rightSF ? (odds[rightSF.id] || {}) : {}} />
            {Array.from({length: 2}, (_, i) => <MatchCard key={`rqf-${i}`}  m={rightQF[i] || tbd}  x={QFRX}  y={yqf(i)}  champCode={champCode} od={rightQF[i]  ? (odds[rightQF[i].id]  || {}) : {}} />)}
            {Array.from({length: 4}, (_, i) => <MatchCard key={`r16-${i}`}  m={rightR16[i] || tbd} x={R16RX} y={yr16(i)} champCode={champCode} od={rightR16[i] ? (odds[rightR16[i].id] || {}) : {}} />)}
            {rightR32.map((m, i) => <MatchCard key={m.id}         m={m}            x={R32RX} y={yr32(i)} champCode={champCode} od={odds[m.id] || {}} />)}
          </div>
        </div>

        <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center' }}>
          Desliza → para ver el cuadro completo · Los cruces de octavos se definen al terminar los grupos
        </div>
      </div>
    );
  }

  // ── Gráfico de evolución del saldo ────────────────────────
  function SaldoSparkline({ bets }) {
    const ms = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);

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
    const up    = last >= 90000;
    const color = up ? 'var(--success)' : 'var(--danger)';
    const fmt   = (n) => Number(n).toLocaleString('es-CL').replace(/,/g, '.');

    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 'var(--t-xs)', fontWeight: 700, color: 'var(--text)' }}>📈 Evolución del saldo</span>
          <span style={{ fontSize: 'var(--t-2xs)', fontWeight: 800, color }} className="num">
            {up ? '+' : ''}{fmt(last - 90000)} pts
          </span>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="mb-sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up ? '#00C85A' : '#E84040'} stopOpacity="0.35" />
              <stop offset="100%" stopColor={up ? '#00C85A' : '#E84040'} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line x1={pad} y1={y(90000).toFixed(1)} x2={W - pad} y2={y(90000).toFixed(1)} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,3" />
          <path d={area} fill="url(#mb-sg)" />
          <path d={path} fill="none" stroke={up ? '#00C85A' : '#E84040'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(points.length - 1).toFixed(1)} cy={y(last).toFixed(1)} r="3.5" fill={up ? '#00C85A' : '#E84040'} />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 4 }}>
          <span>Inicio: 90.000</span>
          <span>{settled.length} apuestas resueltas</span>
        </div>
      </div>
    );
  }

  // ── Banner de racha ───────────────────────────────────────
  function TopTodayBanner() {
    const store    = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const authUser = store ? store.authUser : null;
    const bets     = store ? Object.values(store.bets || {}) : [];
    const ms       = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);

    if (!authUser || bets.length === 0) return null;

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

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 'var(--r-md)',
        background: 'linear-gradient(135deg, rgba(0,200,90,0.15), rgba(0,100,50,0.1))',
        border: '1px solid rgba(0,200,90,0.4)', marginBottom: 8,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🔥</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: 'var(--success)' }}>{msgs[streak % msgs.length]}</div>
          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', marginTop: 1 }}>Cada acierto suma a tu bono de racha</div>
        </div>
      </div>
    );
  }

  window.MB_BracketScreen  = BracketScreen;
  window.MB_SaldoSparkline = SaldoSparkline;
  window.MB_TopTodayBanner = TopTodayBanner;
})();
