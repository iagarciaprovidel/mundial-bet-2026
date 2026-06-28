/* MundialBet Club 2026 — Bracket eliminatorio visual + Sparkline + Banner
   Expone:
     window.MB_BracketScreen  — cuadro eliminatorio con fase actual + siguiente
     window.MB_SaldoSparkline — gráfico SVG de evolución del saldo
     window.MB_TopTodayBanner — banner motivacional de racha
*/
(function () {
  'use strict';

  // ── Dimensiones base ──────────────────────────────────────
  const CC   = 84;  // ancho tarjeta fase actual
  const NC   = 68;  // ancho tarjeta fase siguiente
  const CH_C = 52;  // alto tarjeta fase actual (con fecha/sede/live)
  const CH_N = 36;  // alto tarjeta fase siguiente
  const CN   = 10;  // conector entre columnas
  const TC   = 80;  // ancho columna trofeo
  const GAP  = 4;   // gap vertical entre tarjetas
  const SH   = CH_C + GAP; // slot height = 56

  // Posiciones X fijas
  const CC_LX  = 0;
  const NC_LX  = CC + CN;              // 94
  const TROPH  = NC_LX + NC;           // 162
  const NC_RX  = TROPH + TC;           // 242
  const CC_RX  = NC_RX + NC + CN;     // 320
  const TOTAL_W = CC_RX + CC;         // 404

  // Y de tarjeta en fase actual (dado índice i y tamaño de mitad N)
  const curY  = (i)    => i * SH;
  const curCY = (i)    => i * SH + CH_C / 2;                            // centro Y
  const nxtCY = (i)    => (curCY(2 * i) + curCY(2 * i + 1)) / 2;       // centro Y del slot siguiente
  const nxtY  = (i)    => nxtCY(i) - CH_N / 2;                         // top Y del slot siguiente

  // ── Utilidades ────────────────────────────────────────────
  const now = () => Date.now();

  const isLive = (m, od) => {
    const ko = new Date(m.kickoff).getTime();
    return !!(od && !od.finished && ko <= now() && ko > now() - 3 * 60 * 60 * 1000);
  };

  const getWinner = (m, od, allowProvisional) => {
    if (!m || !od) return null;
    if (od.finished) {
      if (od.result === 'home') return { name: m.home, code: m.homeCode };
      if (od.result === 'away') return { name: m.away, code: m.awayCode };
      return null;
    }
    if (allowProvisional && isLive(m, od) && od.gh != null && od.ga != null) {
      if (od.gh > od.ga) return { name: m.home, code: m.homeCode, prov: true };
      if (od.ga > od.gh) return { name: m.away, code: m.awayCode, prov: true };
    }
    return null;
  };

  const cityOf = (stadium) => {
    if (!stadium) return '';
    const p = stadium.split(', ');
    return p[p.length - 1];
  };

  const fmtDate = (kickoff) => {
    try {
      const d = new Date(kickoff);
      return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    } catch (_) { return ''; }
  };

  // ── SVG: líneas conectoras ────────────────────────────────
  function buildConnectors(half) {
    const S = 'rgba(255,255,255,0.14)';
    const p = [];
    const nbx_L  = CC_LX + CC + CN / 2;     // 89 — rama izq
    const nbx_R  = NC_RX + NC + CN / 2;     // 315 — rama der

    for (let i = 0; i < Math.floor(half / 2); i++) {
      const ty = curCY(2 * i), by = curCY(2 * i + 1), my = nxtCY(i);
      p.push({ d: `M${CC_LX + CC} ${ty} H${nbx_L} V${my} H${NC_LX} M${CC_LX + CC} ${by} H${nbx_L} V${my}`, stroke: S });
      p.push({ d: `M${CC_RX} ${ty} H${nbx_R} V${my} H${NC_RX + NC} M${CC_RX} ${by} H${nbx_R} V${my}`, stroke: S });
    }
    return p;
  }

  // ── Tarjeta: fase actual ──────────────────────────────────
  function CurCard({ m, x, y, champCode, od }) {
    if (!m) {
      return (
        <div style={{
          position: 'absolute', left: x, top: y, width: CC, height: CH_C,
          background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 5, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>TBD</span>
        </div>
      );
    }

    const live     = isLive(m, od);
    const finished = !!(od && od.finished);
    const homeWon  = finished && od.result === 'home';
    const awayWon  = finished && od.result === 'away';
    const hCode    = m.homeCode, aCode = m.awayCode;
    const isChamp  = champCode && (hCode === champCode || aCode === champCode);
    const hs  = od && od.gh  != null ? od.gh  : null;
    const as_ = od && od.ga  != null ? od.ga  : null;
    const openT = (n) => n && window.MB_openTeam && window.MB_openTeam(n);

    const Row = ({ name, code, won, score }) => {
      const gold = !!(champCode && code === champCode);
      return (
        <div onClick={() => openT(name)} title={name} style={{
          display: 'flex', alignItems: 'center', gap: 3, height: 15,
          opacity: finished && !won ? 0.3 : 1,
          cursor: name ? 'pointer' : 'default',
        }}>
          {code
            ? <img src={`https://flagcdn.com/h20/${code}.png`} alt="" style={{ height: 11, width: 'auto', flexShrink: 0 }} />
            : <span style={{ width: 15, height: 11, background: 'rgba(255,255,255,0.07)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />}
          <span style={{
            flex: 1, fontSize: 8.5, lineHeight: 1,
            fontWeight: gold ? 800 : won ? 700 : 500,
            color: gold ? 'var(--gold-light)' : won ? 'var(--success)' : name ? 'var(--text)' : 'var(--muted-2)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name || 'TBD'}{gold ? ' ⭐' : ''}
          </span>
          {(live || finished) && score != null && (
            <span style={{
              fontSize: 10, fontWeight: 900, flexShrink: 0, minWidth: 14, textAlign: 'right',
              color: won ? 'var(--success)' : live ? 'var(--text)' : 'var(--muted-2)',
            }}>{score}</span>
          )}
        </div>
      );
    };

    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: CC, height: CH_C,
        background: isChamp ? 'rgba(212,175,55,0.07)' : 'var(--surface-1)',
        border: isChamp ? '1.5px solid rgba(212,175,55,0.6)' : live ? '1.5px solid rgba(255,82,82,0.6)' : '1px solid var(--border)',
        borderRadius: 5, boxSizing: 'border-box',
        padding: '0 5px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: live ? '0 0 8px rgba(255,82,82,0.15)' : isChamp ? '0 0 8px rgba(212,175,55,0.12)' : 'none',
      }}>
        {/* Header: badge live/finalizado */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, height: 13, paddingTop: 3,
          fontSize: 7, fontWeight: 800, letterSpacing: 0.3,
          color: live ? '#ff5252' : finished ? 'var(--success)' : 'var(--muted-2)',
        }}>
          {live && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff5252', display: 'inline-block', flexShrink: 0, animation: 'mb-pulse-live 1s infinite' }} />
          )}
          {live
            ? 'EN VIVO'
            : finished
              ? <span>✓ <strong style={{ fontSize: 9.5, letterSpacing: 0.5 }}>{hs ?? '?'}–{as_ ?? '?'}</strong></span>
              : fmtDate(m.kickoff)}
        </div>

        {/* Equipos */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
          <Row name={m.home} code={hCode} won={homeWon} score={hs} />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1px -5px' }} />
          <Row name={m.away} code={aCode} won={awayWon} score={as_} />
        </div>

        {/* Footer: ciudad · hora (solo cuando no ha empezado) */}
        <div style={{
          fontSize: 7, color: 'var(--muted-2)', paddingBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }} title={m.stadium}>
          {cityOf(m.stadium)}{!live && !finished ? ` · ${fmtDate(m.kickoff)}` : ''}
        </div>
      </div>
    );
  }

  // ── Tarjeta: fase siguiente (slot de ganador) ─────────────
  function NxtCard({ x, y, team1, team2 }) {
    const TeamSlot = ({ t }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 13 }}>
        {t && t.code
          ? <img src={`https://flagcdn.com/h20/${t.code}.png`} alt="" style={{ height: 9, width: 'auto', flexShrink: 0, opacity: t.prov ? 0.65 : 1 }} />
          : <span style={{ width: 12, height: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />}
        <span style={{
          flex: 1, fontSize: 7.5, lineHeight: 1,
          fontWeight: t && !t.prov ? 700 : 500,
          color: t ? (t.prov ? 'rgba(255,255,255,0.45)' : 'var(--text)') : 'rgba(255,255,255,0.18)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {t ? t.name : '?'}
        </span>
        {t && t.prov && <span style={{ fontSize: 6, color: 'rgba(255,165,0,0.6)', flexShrink: 0 }}>~</span>}
      </div>
    );
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: NC, height: CH_N,
        background: 'rgba(255,255,255,0.03)',
        border: (team1 || team2) ? '1px solid rgba(255,255,255,0.12)' : '1px dashed rgba(255,255,255,0.08)',
        borderRadius: 4, boxSizing: 'border-box',
        padding: '3px 5px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <TeamSlot t={team1} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1px -5px' }} />
        <TeamSlot t={team2} />
      </div>
    );
  }

  // ── Columna trofeo (centro) ───────────────────────────────
  function TrophyColumn({ h }) {
    return (
      <div style={{
        position: 'absolute', left: TROPH, top: 0, width: TC, height: h,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(212,175,55,0.02) 0%, rgba(212,175,55,0.1) 50%, rgba(212,175,55,0.02) 100%)',
        borderLeft: '1px solid rgba(212,175,55,0.18)',
        borderRight: '1px solid rgba(212,175,55,0.18)',
      }}>
        {/* Copa con glow */}
        <div style={{
          fontSize: 44, lineHeight: 1,
          filter: 'drop-shadow(0 0 14px rgba(212,175,55,0.8)) drop-shadow(0 0 28px rgba(212,175,55,0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
          marginBottom: 8,
        }}>🏆</div>

        {/* FINAL label */}
        <div style={{
          fontSize: 9, fontWeight: 900, letterSpacing: 2,
          textTransform: 'uppercase',
          background: 'linear-gradient(135deg, #F5D76E, #C99B1F)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 3,
        }}>FINAL</div>

        {/* Línea dorada */}
        <div style={{ width: 28, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)', marginBottom: 5 }} />

        {/* Fecha y sede */}
        <div style={{ fontSize: 7, color: 'rgba(212,175,55,0.55)', textAlign: 'center', lineHeight: 1.5, fontWeight: 600 }}>
          19 jul · 2026
          <br />MetLife Stadium
          <br />Nueva Jersey
        </div>
      </div>
    );
  }

  // ── Pantalla principal ────────────────────────────────────
  function BracketScreen() {
    const store     = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const users     = (store && store.users) || [];
    const authUser  = store ? store.authUser : null;
    const meRec     = authUser ? (users.find(u => u.uid === authUser.uid) || null) : null;
    const champCode = meRec ? meRec.championCode : null;
    const champName = meRec ? meRec.champion    : null;
    const odds      = (store && store.odds) || {};

    const fx   = (window.MB && window.MB.WC_FIXTURES) || [];
    const byStage = {};
    ['r32','r16','qf','sf','final'].forEach(s => { byStage[s] = fx.filter(m => m.stage === s); });

    // Detectar fase activa: primera con partidos sin terminar o futuros
    const PHASES = ['r32','r16','qf','sf','final'];
    const NAMES  = { r32:'Dieciseisavos', r16:'Octavos de Final', qf:'Cuartos de Final', sf:'Semifinales', final:'Final' };

    let curPhase  = 'r32';
    let nextPhase = 'r16';
    for (let i = 0; i < PHASES.length; i++) {
      const ph = PHASES[i];
      const ms = byStage[ph];
      if (ms.length > 0 && ms.some(m => !(odds[m.id] || {}).finished)) {
        curPhase  = ph;
        nextPhase = PHASES[i + 1] || null;
        break;
      }
      if (ms.length > 0) { // esta fase está completa, la siguiente puede ser activa
        curPhase  = PHASES[i + 1] || ph;
        nextPhase = PHASES[i + 2] || null;
      }
    }

    const curMatches = byStage[curPhase] || [];
    const nxtMatches = nextPhase ? (byStage[nextPhase] || []) : [];

    const half = Math.ceil(curMatches.length / 2);
    const leftCur  = curMatches.slice(0, half);
    const rightCur = curMatches.slice(half);

    // Slots fase siguiente: usar fixtures reales si existen, si no calcular de ganadores
    const buildSlots = (matches) => {
      if (nxtMatches.length > 0) return null; // se manejan como fixtures reales
      const slots = [];
      for (let i = 0; i < matches.length; i += 2) {
        const m1 = matches[i], m2 = matches[i + 1];
        const od1 = m1 ? (odds[m1.id] || {}) : {};
        const od2 = m2 ? (odds[m2.id] || {}) : {};
        slots.push({
          team1: m1 ? getWinner(m1, od1, true) : null,
          team2: m2 ? getWinner(m2, od2, true) : null,
        });
      }
      return slots;
    };

    const leftNxtSlots  = buildSlots(leftCur);
    const rightNxtSlots = buildSlots(rightCur);
    const leftNxtFix    = nxtMatches.slice(0, Math.ceil(nxtMatches.length / 2));
    const rightNxtFix   = nxtMatches.slice(Math.ceil(nxtMatches.length / 2));

    const TOTAL_H   = half * SH - GAP;
    const connectors = buildConnectors(half);

    return (
      <div>
        {/* Encabezado de fase */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 'var(--t-xs)', fontWeight: 800, color: 'var(--text)' }}>
              {NAMES[curPhase]}
            </span>
            {nextPhase && (
              <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', marginLeft: 8 }}>
                → {NAMES[nextPhase]}
              </span>
            )}
          </div>
          {champCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>
              <img src={`https://flagcdn.com/h20/${champCode}.png`} alt="" style={{ height: 11, borderRadius: 1 }} />
              <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>{champName} ⭐</span>
            </div>
          )}
        </div>

        {/* Scroll horizontal */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
          <div style={{ position: 'relative', width: TOTAL_W, height: TOTAL_H + 4 }}>

            {/* SVG: líneas conectoras */}
            <svg width={TOTAL_W} height={TOTAL_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
              {connectors.map((c, i) => (
                <path key={i} d={c.d} fill="none" stroke={c.stroke} strokeWidth="1.5" strokeLinejoin="round" />
              ))}
            </svg>

            {/* ── Mitad izquierda: fase actual ── */}
            {leftCur.map((m, i) => (
              <CurCard key={m.id} m={m} x={CC_LX} y={curY(i)} champCode={champCode} od={odds[m.id] || {}} />
            ))}
            {/* relleno si hay menos de `half` en la izquierda */}
            {Array.from({ length: half - leftCur.length }, (_, i) => (
              <CurCard key={`lpad-${i}`} m={null} x={CC_LX} y={curY(leftCur.length + i)} champCode={null} od={{}} />
            ))}

            {/* ── Mitad izquierda: fase siguiente ── */}
            {leftNxtSlots && leftNxtSlots.map((slot, i) => (
              <NxtCard key={`lns-${i}`} x={NC_LX} y={nxtY(i)} team1={slot.team1} team2={slot.team2} />
            ))}
            {!leftNxtSlots && leftNxtFix.map((m, i) => (
              <NxtCard key={m.id} x={NC_LX} y={nxtY(i)}
                team1={m.home ? { name: m.home, code: m.homeCode, prov: false } : null}
                team2={m.away ? { name: m.away, code: m.awayCode, prov: false } : null}
              />
            ))}
            {/* TBD slots fase siguiente izquierda */}
            {Array.from({ length: Math.max(0, Math.floor(half / 2) - (leftNxtSlots ? leftNxtSlots.length : leftNxtFix.length)) }, (_, i) => (
              <NxtCard key={`lnt-${i}`} x={NC_LX} y={nxtY((leftNxtSlots || leftNxtFix).length + i)} team1={null} team2={null} />
            ))}

            {/* ── Trofeo central ── */}
            <TrophyColumn h={TOTAL_H} />

            {/* ── Mitad derecha: fase siguiente ── */}
            {rightNxtSlots && rightNxtSlots.map((slot, i) => (
              <NxtCard key={`rns-${i}`} x={NC_RX} y={nxtY(i)} team1={slot.team1} team2={slot.team2} />
            ))}
            {!rightNxtSlots && rightNxtFix.map((m, i) => (
              <NxtCard key={m.id} x={NC_RX} y={nxtY(i)}
                team1={m.home ? { name: m.home, code: m.homeCode, prov: false } : null}
                team2={m.away ? { name: m.away, code: m.awayCode, prov: false } : null}
              />
            ))}
            {Array.from({ length: Math.max(0, Math.floor(half / 2) - (rightNxtSlots ? rightNxtSlots.length : rightNxtFix.length)) }, (_, i) => (
              <NxtCard key={`rnt-${i}`} x={NC_RX} y={nxtY((rightNxtSlots || rightNxtFix).length + i)} team1={null} team2={null} />
            ))}

            {/* ── Mitad derecha: fase actual ── */}
            {rightCur.map((m, i) => (
              <CurCard key={m.id} m={m} x={CC_RX} y={curY(i)} champCode={champCode} od={odds[m.id] || {}} />
            ))}
            {Array.from({ length: half - rightCur.length }, (_, i) => (
              <CurCard key={`rpad-${i}`} m={null} x={CC_RX} y={curY(rightCur.length + i)} champCode={null} od={{}} />
            ))}
          </div>
        </div>

        <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 4 }}>
          ~ provisorio en vivo · ⭐ tu campeón elegido · Toca un equipo para ver su ficha
        </div>
      </div>
    );
  }

  // ── Gráfico evolución del saldo ───────────────────────────
  function SaldoSparkline({ bets }) {
    const ms = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);
    const settled = (bets || [])
      .filter(b => (b.status === 'won' || b.status === 'lost') && b.creado)
      .sort((a, b) => ms(a.creado) - ms(b.creado));
    if (settled.length < 2) return null;

    const points = [90000];
    settled.forEach(b => {
      const last = points[points.length - 1];
      const stake = Math.max(0, b.stake || 1000);
      points.push(b.status === 'won' ? last + stake : last - stake);
    });
    const minV = Math.min(...points), maxV = Math.max(...points);
    const rng = Math.max(maxV - minV, 1000);
    const W = 280, H = 54, pad = 4;
    const x = (i) => pad + (i / (points.length - 1)) * (W - 2 * pad);
    const y = (v) => pad + ((maxV - v) / rng) * (H - 2 * pad);
    const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${path} L${x(points.length - 1).toFixed(1)},${H} L${pad},${H} Z`;
    const last = points[points.length - 1], up = last >= 90000;
    const color = up ? 'var(--success)' : 'var(--danger)';
    const fmt = (n) => Number(n).toLocaleString('es-CL').replace(/,/g, '.');
    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 'var(--t-xs)', fontWeight: 700 }}>📈 Evolución del saldo</span>
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

  // ── Banner racha ──────────────────────────────────────────
  function TopTodayBanner() {
    const store    = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const authUser = store ? store.authUser : null;
    const bets     = store ? Object.values(store.bets || {}) : [];
    const ms       = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);
    if (!authUser || bets.length === 0) return null;
    const sorted = bets.filter(b => b.status === 'won' || b.status === 'lost').sort((a, b) => ms(a.creado) - ms(b.creado));
    let streak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) { if (sorted[i].status === 'won') streak++; else break; }
    if (streak < 2) return null;
    const msgs = [`¡Llevas ${streak} aciertos seguidos! 🔥 Sigue así`, `${streak} en racha — estás en modo campeón 🏆`, `¡${streak} correctas seguidas! 📈 No pares`];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg,rgba(0,200,90,.15),rgba(0,100,50,.1))', border: '1px solid rgba(0,200,90,.4)', marginBottom: 8 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🔥</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: 'var(--success)' }}>{msgs[streak % msgs.length]}</div>
          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', marginTop: 1 }}>Cada acierto suma a tu bono de racha</div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  BRACKET WEB — todas las rondas visibles, marcadores grandes
  // ══════════════════════════════════════════════════════════
  (function () {
    // Dimensiones web (más anchas, más altas)
    const W  = 104;   // card width
    const H  = 58;    // card height (con sede/live/scores)
    const CN = 18;    // conector
    const TW = 114;   // trofeo columna
    const G  = 4;     // gap vertical
    const SH = H + G; // slot = 62

    // X positions left half
    const X32 = 0;
    const X16 = W + CN;           // 122
    const XQF = X16 + W + CN;    // 244
    const XSF = XQF + W + CN;    // 366
    const XFIN = XSF + W + 14;   // 484  (gap de 14 antes del trofeo)
    const XFIN_END = XFIN + TW;  // 598

    // X positions right half (espejo)
    const XSF_R  = XFIN_END + 14; // 612
    const XQF_R  = XSF_R + W + CN; // 734
    const X16_R  = XQF_R + W + CN; // 856
    const X32_R  = X16_R + W + CN; // 978

    const WEB_W = X32_R + W;       // 1082
    const WEB_H = 8 * SH - G;     // 492

    // Centro Y por ronda (fórmulas exactas)
    const cY32 = (i) => i * SH + H / 2;
    const cY16 = (i) => (cY32(2 * i) + cY32(2 * i + 1)) / 2;
    const cYQF = (i) => (cY16(2 * i) + cY16(2 * i + 1)) / 2;
    const cYSF = ()  => (cYQF(0) + cYQF(1)) / 2;

    // Top Y por ronda
    const y32 = (i) => i * SH;
    const y16 = (i) => cY16(i) - H / 2;
    const yQF = (i) => cYQF(i) - H / 2;
    const ySF = ()  => cYSF() - H / 2;

    // Colores de conector según estado
    const connColor = (m, od) => {
      if (!m || !od) return 'rgba(255,255,255,0.1)';
      if (od.finished) return 'rgba(0,200,90,0.45)';
      if (isLive(m, od)) return 'rgba(255,82,82,0.45)';
      return 'rgba(255,255,255,0.1)';
    };

    // Tarjeta de partido web
    function WCard({ m, x, y, champCode, od }) {
      if (!m) {
        return (
          <div style={{ position: 'absolute', left: x, top: y, width: W, height: H, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 6, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>TBD</span>
          </div>
        );
      }

      const live     = isLive(m, od);
      const finished = !!(od && od.finished);
      const homeWon  = finished && od.result === 'home';
      const awayWon  = finished && od.result === 'away';
      const hs  = (od && od.gh  != null) ? od.gh  : null;
      const as_ = (od && od.ga  != null) ? od.ga  : null;
      const hCode = m.homeCode, aCode = m.awayCode;
      const isChamp = champCode && (hCode === champCode || aCode === champCode);
      const openT = (n) => n && window.MB_openTeam && window.MB_openTeam(n);

      // ¿quién pasa (para mostrar indicador "→ Pasa")?
      const winner = getWinner(m, od, true);

      const Row = ({ name, code, won, score, prov }) => {
        const gold = !!(champCode && code === champCode);
        const advancing = winner && winner.name === name;
        return (
          <div onClick={() => openT(name)} title={name} style={{
            display: 'flex', alignItems: 'center', gap: 4, height: 16,
            opacity: finished && !won ? 0.28 : 1,
            cursor: name ? 'pointer' : 'default',
          }}>
            {code
              ? <img src={`https://flagcdn.com/h20/${code}.png`} alt="" style={{ height: 12, width: 'auto', flexShrink: 0 }} />
              : <span style={{ width: 17, height: 12, background: 'rgba(255,255,255,0.07)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />}
            <span style={{
              flex: 1, fontSize: 9.5, lineHeight: 1,
              fontWeight: gold ? 800 : won ? 700 : 500,
              color: gold ? 'var(--gold-light)' : won ? 'var(--success)' : name ? 'var(--text)' : 'var(--muted-2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name || 'TBD'}{gold ? ' ⭐' : ''}
            </span>
            {/* Marcador */}
            {(live || finished) && score != null && (
              <span style={{ fontSize: 13, fontWeight: 900, flexShrink: 0, minWidth: 18, textAlign: 'right', color: won ? 'var(--success)' : live ? 'var(--text)' : 'var(--muted-2)' }}>
                {score}
              </span>
            )}
            {/* Pasa badge */}
            {advancing && !prov && (
              <span style={{ fontSize: 7, fontWeight: 800, color: 'var(--success)', background: 'rgba(0,200,90,0.15)', padding: '1px 3px', borderRadius: 3, flexShrink: 0, marginLeft: 1 }}>PASA</span>
            )}
            {advancing && prov && (
              <span style={{ fontSize: 7, fontWeight: 800, color: 'rgba(255,165,0,0.8)', background: 'rgba(255,165,0,0.1)', padding: '1px 3px', borderRadius: 3, flexShrink: 0, marginLeft: 1 }}>~</span>
            )}
          </div>
        );
      };

      const borderColor = isChamp ? 'rgba(212,175,55,0.7)' : live ? 'rgba(255,82,82,0.6)' : finished ? 'rgba(0,200,90,0.35)' : 'var(--border)';

      return (
        <div style={{
          position: 'absolute', left: x, top: y, width: W, height: H,
          background: isChamp ? 'rgba(212,175,55,0.07)' : 'var(--surface-1)',
          border: `1.5px solid ${borderColor}`,
          borderRadius: 6, boxSizing: 'border-box', padding: '0 6px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          boxShadow: live ? '0 0 10px rgba(255,82,82,0.12)' : isChamp ? '0 0 10px rgba(212,175,55,0.12)' : 'none',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 14, paddingTop: 3, fontSize: 7.5, fontWeight: 800, letterSpacing: 0.4 }}>
            {live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5252', display: 'inline-block', flexShrink: 0, animation: 'mb-pulse-live 1s infinite' }} />}
            <span style={{ color: live ? '#ff5252' : finished ? 'var(--success)' : 'var(--muted-2)' }}>
              {live
                ? 'EN VIVO'
                : finished
                  ? <span>✓ <strong style={{ fontSize: 11, letterSpacing: 0.5 }}>{hs ?? '?'}–{as_ ?? '?'}</strong></span>
                  : fmtDate(m.kickoff)}
            </span>
          </div>
          {/* Equipos */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <Row name={m.home} code={hCode} won={homeWon} score={hs} prov={winner && winner.prov} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '1px -6px' }} />
            <Row name={m.away} code={aCode} won={awayWon} score={as_} prov={winner && winner.prov} />
          </div>
          {/* Footer: ciudad · fecha (próximos) */}
          <div style={{ fontSize: 7.5, color: 'var(--muted-2)', paddingBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.stadium}>
            {cityOf(m.stadium)}{!live && !finished ? ` · ${fmtDate(m.kickoff)}` : ''}
          </div>
        </div>
      );
    }

    // Tarjeta de slot siguiente ronda (ganador provisional/confirmado o TBD)
    function WSlot({ m, x, y, champCode, od, label }) {
      const finished = !!(od && od.finished);
      const live_s   = m ? isLive(m, od) : false;
      const t1 = m ? { name: m.home, code: m.homeCode, won: finished && od.result === 'home' } : null;
      const t2 = m ? { name: m.away, code: m.awayCode, won: finished && od.result === 'away' } : null;

      const TeamRow = ({ t }) => {
        if (!t) return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 15 }}>
            <span style={{ width: 14, height: 11, background: 'rgba(255,255,255,0.06)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>Por definir</span>
          </div>
        );
        const gold = !!(champCode && t.code === champCode);
        return (
          <div onClick={() => t.name && window.MB_openTeam && window.MB_openTeam(t.name)} title={t.name} style={{
            display: 'flex', alignItems: 'center', gap: 4, height: 15,
            opacity: finished && !t.won ? 0.3 : 1, cursor: t.name ? 'pointer' : 'default',
          }}>
            {t.code
              ? <img src={`https://flagcdn.com/h20/${t.code}.png`} alt="" style={{ height: 11, width: 'auto', flexShrink: 0 }} />
              : <span style={{ width: 14, height: 11, background: 'rgba(255,255,255,0.06)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />}
            <span style={{ flex: 1, fontSize: 9, fontWeight: gold ? 800 : t.won ? 700 : 500, color: gold ? 'var(--gold-light)' : t.won ? 'var(--success)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.name || '?'}{gold ? ' ⭐' : ''}
            </span>
            {finished && t.won && <span style={{ fontSize: 7, color: 'var(--success)', fontWeight: 800 }}>✓</span>}
          </div>
        );
      };

      const borderClr = m ? (finished ? 'rgba(0,200,90,0.3)' : live_s ? 'rgba(255,82,82,0.4)' : 'rgba(255,255,255,0.12)') : 'rgba(255,255,255,0.07)';

      return (
        <div style={{
          position: 'absolute', left: x, top: y, width: W, height: H,
          background: m ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
          border: `1px ${m ? 'solid' : 'dashed'} ${borderClr}`,
          borderRadius: 6, boxSizing: 'border-box',
          padding: '4px 6px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {label && <div style={{ fontSize: 7, color: 'var(--muted-2)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
            <TeamRow t={t1} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '1px -6px' }} />
            <TeamRow t={t2} />
          </div>
        </div>
      );
    }

    // Slot que muestra ganadores de dos R32 (para R16 TBD)
    function WSlotFromWinners({ x, y, m1, od1, m2, od2, champCode, r16m, r16od }) {
      // Si hay fixture real para R16, usarlo
      if (r16m) return <WSlot m={r16m} x={x} y={y} champCode={champCode} od={r16od || {}} />;
      const w1 = m1 ? getWinner(m1, od1, true) : null;
      const w2 = m2 ? getWinner(m2, od2, true) : null;
      return (
        <div style={{ position: 'absolute', left: x, top: y, width: W, height: H, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 6, boxSizing: 'border-box', padding: '4px 6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          {[w1, w2].map((w, i) => (
            <React.Fragment key={i}>
              {i === 1 && <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '1px -6px' }} />}
              <div onClick={() => w && window.MB_openTeam && window.MB_openTeam(w.name)} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 15, opacity: w && w.prov ? 0.6 : 1, cursor: w ? 'pointer' : 'default' }}>
                {w && w.code
                  ? <img src={`https://flagcdn.com/h20/${w.code}.png`} alt="" style={{ height: 11, width: 'auto', flexShrink: 0 }} />
                  : <span style={{ width: 14, height: 11, background: 'rgba(255,255,255,0.06)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />}
                <span style={{ flex: 1, fontSize: 9, color: w ? (w.prov ? 'rgba(255,165,0,0.7)' : 'var(--text)') : 'rgba(255,255,255,0.18)', fontWeight: w && !w.prov ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w ? w.name : 'Por definir'}{w && w.prov ? ' ~' : ''}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      );
    }

    function BracketScreenWeb() {
      const store     = window.MB_useBetStore ? window.MB_useBetStore() : null;
      const users     = (store && store.users) || [];
      const authUser  = store ? store.authUser : null;
      const meRec     = authUser ? (users.find(u => u.uid === authUser.uid) || null) : null;
      const champCode = meRec ? meRec.championCode : null;
      const champName = meRec ? meRec.champion    : null;
      const odds      = (store && store.odds) || {};

      const fx = (window.MB && window.MB.WC_FIXTURES) || [];
      const byS = {};
      ['r32','r16','qf','sf','final'].forEach(s => { byS[s] = fx.filter(m => m.stage === s); });

      const r32 = byS.r32, r16 = byS.r16, qf = byS.qf, sf = byS.sf, fin = byS.final;
      // Tag index for connector color calculation
      r32.forEach((m, i) => { m._idx = i; });

      const L32 = r32.slice(0, 8), R32 = r32.slice(8, 16);
      const L16 = r16.slice(0, 4), R16 = r16.slice(4, 8);
      const LQF = qf.slice(0, 2),  RQF = qf.slice(2, 4);
      const LSF = sf[0] || null,    RSF = sf[1] || null;
      const FIN = fin[0] || null;

      // Construye segmentos de conector coloreados para cada par
      const segs = [];

      // LEFT: R32→R16
      for (let i = 0; i < 4; i++) {
        const m1 = L32[2*i], m2 = L32[2*i+1];
        const od1 = m1 ? (odds[m1.id]||{}) : {}, od2 = m2 ? (odds[m2.id]||{}) : {};
        const ty = m1 ? cY32(2*i) : 0, by = m2 ? cY32(2*i+1) : 0, my = cY16(i);
        const bx = X32 + W + CN/2;
        const c1 = connColor(m1,od1), c2 = connColor(m2,od2);
        const cm = (od1.finished && od2.finished) ? 'rgba(0,200,90,0.4)' : (isLive(m1,od1)||isLive(m2,od2)) ? 'rgba(255,82,82,0.35)' : 'rgba(255,255,255,0.1)';
        segs.push(
          { d: `M${X32+W} ${ty} H${bx}`, s: c1 },
          { d: `M${bx} ${ty} V${my}`, s: cm },
          { d: `M${X32+W} ${by} H${bx}`, s: c2 },
          { d: `M${bx} ${by} V${my}`, s: cm },
          { d: `M${bx} ${my} H${X16}`, s: cm },
        );
      }
      // LEFT: R16→QF
      for (let i = 0; i < 2; i++) {
        const m1 = L16[2*i], m2 = L16[2*i+1];
        const od1 = m1?(odds[m1.id]||{}):{}, od2 = m2?(odds[m2.id]||{}):{};
        const ty = cY16(2*i), by = cY16(2*i+1), my = cYQF(i);
        const bx = X16 + W + CN/2;
        const c1 = connColor(m1,od1), c2 = connColor(m2,od2);
        const cm = (od1.finished&&od2.finished)?'rgba(0,200,90,0.4)':(isLive(m1,od1)||isLive(m2,od2))?'rgba(255,82,82,0.35)':'rgba(255,255,255,0.1)';
        segs.push(
          { d: `M${X16+W} ${ty} H${bx}`, s: c1 }, { d: `M${bx} ${ty} V${my}`, s: cm },
          { d: `M${X16+W} ${by} H${bx}`, s: c2 }, { d: `M${bx} ${by} V${my}`, s: cm },
          { d: `M${bx} ${my} H${XQF}`, s: cm },
        );
      }
      // LEFT: QF→SF
      {
        const m1=LQF[0],m2=LQF[1];
        const od1=m1?(odds[m1.id]||{}):{}, od2=m2?(odds[m2.id]||{}):{};
        const ty=cYQF(0), by=cYQF(1), my=cYSF();
        const bx=XQF+W+CN/2;
        const c1=connColor(m1,od1),c2=connColor(m2,od2);
        const cm=(od1.finished&&od2.finished)?'rgba(0,200,90,0.4)':(isLive(m1,od1)||isLive(m2,od2))?'rgba(255,82,82,0.35)':'rgba(255,255,255,0.1)';
        segs.push(
          { d: `M${XQF+W} ${ty} H${bx}`, s: c1 }, { d: `M${bx} ${ty} V${my}`, s: cm },
          { d: `M${XQF+W} ${by} H${bx}`, s: c2 }, { d: `M${bx} ${by} V${my}`, s: cm },
          { d: `M${bx} ${my} H${XSF}`, s: cm },
        );
      }
      // LEFT: SF→Final
      { const od=LSF?(odds[LSF.id]||{}):{};
        const c=connColor(LSF,od);
        segs.push({ d:`M${XSF+W} ${cYSF()} H${XFIN}`, s: c }); }

      // RIGHT (mirror): R32→R16
      for (let i = 0; i < 4; i++) {
        const m1 = R32[2*i], m2 = R32[2*i+1];
        if (m1) m1._idx = 2*i; if (m2) m2._idx = 2*i+1;
        const od1 = m1?(odds[m1.id]||{}):{}, od2 = m2?(odds[m2.id]||{}):{};
        const ty = m1?cY32(2*i):0, by = m2?cY32(2*i+1):0, my = cY16(i);
        const bx = X16_R + W + CN/2;
        const c1=connColor(m1,od1),c2=connColor(m2,od2);
        const cm=(od1.finished&&od2.finished)?'rgba(0,200,90,0.4)':(isLive(m1,od1)||isLive(m2,od2))?'rgba(255,82,82,0.35)':'rgba(255,255,255,0.1)';
        segs.push(
          { d:`M${X32_R} ${ty} H${bx}`, s:c1 }, { d:`M${bx} ${ty} V${my}`, s:cm },
          { d:`M${X32_R} ${by} H${bx}`, s:c2 }, { d:`M${bx} ${by} V${my}`, s:cm },
          { d:`M${bx} ${my} H${X16_R+W}`, s:cm },
        );
      }
      // RIGHT: R16→QF
      for (let i = 0; i < 2; i++) {
        const m1=R16[2*i],m2=R16[2*i+1];
        const od1=m1?(odds[m1.id]||{}):{}, od2=m2?(odds[m2.id]||{}):{};
        const ty=cY16(2*i),by=cY16(2*i+1),my=cYQF(i);
        const bx=XQF_R+W+CN/2;
        const c1=connColor(m1,od1),c2=connColor(m2,od2);
        const cm=(od1.finished&&od2.finished)?'rgba(0,200,90,0.4)':(isLive(m1,od1)||isLive(m2,od2))?'rgba(255,82,82,0.35)':'rgba(255,255,255,0.1)';
        segs.push(
          { d:`M${X16_R} ${ty} H${bx}`, s:c1 }, { d:`M${bx} ${ty} V${my}`, s:cm },
          { d:`M${X16_R} ${by} H${bx}`, s:c2 }, { d:`M${bx} ${by} V${my}`, s:cm },
          { d:`M${bx} ${my} H${XQF_R+W}`, s:cm },
        );
      }
      // RIGHT: QF→SF
      { const m1=RQF[0],m2=RQF[1];
        const od1=m1?(odds[m1.id]||{}):{}, od2=m2?(odds[m2.id]||{}):{};
        const ty=cYQF(0),by=cYQF(1),my=cYSF();
        const bx=XSF_R+W+CN/2;
        const c1=connColor(m1,od1),c2=connColor(m2,od2);
        const cm=(od1.finished&&od2.finished)?'rgba(0,200,90,0.4)':(isLive(m1,od1)||isLive(m2,od2))?'rgba(255,82,82,0.35)':'rgba(255,255,255,0.1)';
        segs.push(
          { d:`M${XQF_R} ${ty} H${bx}`, s:c1 }, { d:`M${bx} ${ty} V${my}`, s:cm },
          { d:`M${XQF_R} ${by} H${bx}`, s:c2 }, { d:`M${bx} ${by} V${my}`, s:cm },
          { d:`M${bx} ${my} H${XSF_R+W}`, s:cm },
        );
      }
      // RIGHT: SF→Final
      { const od=RSF?(odds[RSF.id]||{}):{};
        const c=connColor(RSF,od);
        segs.push({ d:`M${XSF_R} ${cYSF()} H${XFIN_END}`, s: c }); }

      // Etiquetas de ronda
      const roundLabels = [
        [X32,'R32'], [X16,'Octavos'], [XQF,'Cuartos'], [XSF,'Semis'],
        [XFIN,'Final'], [XSF_R,'Semis'], [XQF_R,'Cuartos'], [X16_R,'Octavos'], [X32_R,'R32'],
      ];

      return (
        <div>
          {/* Leyenda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            {champCode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>
                <img src={`https://flagcdn.com/h20/${champCode}.png`} alt="" style={{ height: 14, borderRadius: 2 }} />
                <span>Tu campeón: <strong style={{ color: 'var(--gold-light)' }}>{champName}</strong> — borde dorado</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 20, height: 2, background: 'rgba(0,200,90,0.6)', display: 'inline-block' }} /> Avanza</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 20, height: 2, background: 'rgba(255,82,82,0.6)', display: 'inline-block' }} /> En vivo</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 20, height: 2, background: 'rgba(255,255,255,0.15)', display: 'inline-block' }} /> Pendiente</span>
              <span style={{ color: 'rgba(255,165,0,0.7)' }}>~ provisional</span>
            </div>
          </div>

          {/* Bracket */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 12 }}>
            <div style={{ position: 'relative', width: WEB_W, height: WEB_H + 24 }}>

              {/* SVG conectores */}
              <svg width={WEB_W} height={WEB_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
                {segs.map((s, i) => (
                  <path key={i} d={s.d} fill="none" stroke={s.s} strokeWidth="2" strokeLinejoin="round" />
                ))}
              </svg>

              {/* Etiquetas */}
              {roundLabels.map(([rx, lbl], idx) => (
                <div key={idx} style={{ position: 'absolute', left: rx, top: WEB_H + 6, width: W, textAlign: 'center', fontSize: 8.5, fontWeight: 700, color: lbl === 'Final' ? 'var(--gold-light)' : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'visible' }}>
                  {lbl}
                </div>
              ))}

              {/* ─── R32 LEFT ─── */}
              {L32.map((m, i) => <WCard key={m.id} m={m} x={X32} y={y32(i)} champCode={champCode} od={odds[m.id]||{}} />)}

              {/* ─── R16 LEFT ─── */}
              {Array.from({length:4},(_,i)=>(
                <WSlotFromWinners key={`l16-${i}`} x={X16} y={y16(i)} champCode={champCode}
                  m1={L32[2*i]} od1={odds[L32[2*i]?.id]||{}}
                  m2={L32[2*i+1]} od2={odds[L32[2*i+1]?.id]||{}}
                  r16m={L16[i]||null} r16od={L16[i]?odds[L16[i].id]||{}:{}} />
              ))}

              {/* ─── QF LEFT ─── */}
              {Array.from({length:2},(_,i)=>(
                <WSlot key={`lqf-${i}`} m={LQF[i]||null} x={XQF} y={yQF(i)} champCode={champCode} od={LQF[i]?(odds[LQF[i].id]||{}):{}} label="Cuartos" />
              ))}

              {/* ─── SF LEFT ─── */}
              <WSlot m={LSF} x={XSF} y={ySF()} champCode={champCode} od={LSF?(odds[LSF.id]||{}):{}} label="Semifinal" />

              {/* ─── TROFEO CENTRAL ─── */}
              <div style={{
                position: 'absolute', left: XFIN, top: 0, width: TW, height: WEB_H,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(180deg, rgba(212,175,55,0.02) 0%, rgba(212,175,55,0.12) 50%, rgba(212,175,55,0.02) 100%)',
                borderLeft: '1px solid rgba(212,175,55,0.2)', borderRight: '1px solid rgba(212,175,55,0.2)',
              }}>
                <div style={{ fontSize: 52, lineHeight: 1, filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.9)) drop-shadow(0 0 36px rgba(212,175,55,0.5)) drop-shadow(0 2px 6px rgba(0,0,0,0.7))', marginBottom: 10 }}>🏆</div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', background: 'linear-gradient(135deg,#F5D76E,#C99B1F)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>FINAL</div>
                <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent)', marginBottom: 6 }} />
                {FIN ? (
                  <div style={{ fontSize: 8, color: 'rgba(212,175,55,0.6)', textAlign: 'center', lineHeight: 1.6 }}>
                    {fmtDate(FIN.kickoff)}<br />{FIN.stadium}
                  </div>
                ) : (
                  <div style={{ fontSize: 8, color: 'rgba(212,175,55,0.5)', textAlign: 'center', lineHeight: 1.6 }}>
                    19 jul · 2026<br />MetLife Stadium<br />Nueva Jersey
                  </div>
                )}
              </div>

              {/* ─── SF RIGHT ─── */}
              <WSlot m={RSF} x={XSF_R} y={ySF()} champCode={champCode} od={RSF?(odds[RSF.id]||{}):{}} label="Semifinal" />

              {/* ─── QF RIGHT ─── */}
              {Array.from({length:2},(_,i)=>(
                <WSlot key={`rqf-${i}`} m={RQF[i]||null} x={XQF_R} y={yQF(i)} champCode={champCode} od={RQF[i]?(odds[RQF[i].id]||{}):{}} label="Cuartos" />
              ))}

              {/* ─── R16 RIGHT ─── */}
              {Array.from({length:4},(_,i)=>(
                <WSlotFromWinners key={`r16-${i}`} x={X16_R} y={y16(i)} champCode={champCode}
                  m1={R32[2*i]} od1={odds[R32[2*i]?.id]||{}}
                  m2={R32[2*i+1]} od2={odds[R32[2*i+1]?.id]||{}}
                  r16m={R16[i]||null} r16od={R16[i]?odds[R16[i].id]||{}:{}} />
              ))}

              {/* ─── R32 RIGHT ─── */}
              {R32.map((m, i) => <WCard key={m.id} m={m} x={X32_R} y={y32(i)} champCode={champCode} od={odds[m.id]||{}} />)}
            </div>
          </div>

          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 4 }}>
            ~ resultado provisional (partido en curso) · ⭐ tu campeón · Toca un equipo para ver su ficha
          </div>
        </div>
      );
    }

    window.MB_BracketScreenWeb = BracketScreenWeb;
  })();

  window.MB_BracketScreen  = BracketScreen;
  window.MB_SaldoSparkline = SaldoSparkline;
  window.MB_TopTodayBanner = TopTodayBanner;
})();
