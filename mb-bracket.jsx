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
      return od.winner === 'home'
        ? { name: m.home, code: m.homeCode }
        : { name: m.away, code: m.awayCode };
    }
    if (allowProvisional && isLive(m, od) && od.homeScore != null && od.awayScore != null) {
      if (od.homeScore > od.awayScore) return { name: m.home, code: m.homeCode, prov: true };
      if (od.awayScore > od.homeScore) return { name: m.away, code: m.awayCode, prov: true };
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
    const homeWon  = finished && od.winner === 'home';
    const awayWon  = finished && od.winner === 'away';
    const hCode    = m.homeCode, aCode = m.awayCode;
    const isChamp  = champCode && (hCode === champCode || aCode === champCode);
    const hs = od && od.homeScore != null ? od.homeScore : null;
    const as_ = od && od.awayScore != null ? od.awayScore : null;
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
          {live ? 'EN VIVO' : finished ? '✓ Finalizado' : fmtDate(m.kickoff)}
        </div>

        {/* Equipos */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
          <Row name={m.home} code={hCode} won={homeWon} score={hs} />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1px -5px' }} />
          <Row name={m.away} code={aCode} won={awayWon} score={as_} />
        </div>

        {/* Footer: estadio + ciudad */}
        <div style={{
          fontSize: 6.5, color: 'var(--muted-2)', paddingBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {!live && !finished && <span>{fmtDate(m.kickoff)} · </span>}
          <span>{cityOf(m.stadium)}</span>
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

  window.MB_BracketScreen  = BracketScreen;
  window.MB_SaldoSparkline = SaldoSparkline;
  window.MB_TopTodayBanner = TopTodayBanner;
})();
