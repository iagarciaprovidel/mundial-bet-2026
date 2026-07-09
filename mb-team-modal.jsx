/* ============================================================
   MundialBet Club 2026 — Modal de detalle de selección (país)
   Compartido entre móvil y escritorio. En móvil, app-web.jsx (que
   originalmente definía esto) se elimina del DOM antes de que Babel
   lo compile (optimización de carga), así que window.MB_TeamModal y
   window.MB_ALL_TEAMS quedaban sin definir y el clic en una bandera
   no abría nada. Este archivo SIEMPRE se carga (móvil y escritorio).
   ============================================================ */
(function () {
  const Dw = window.MB;
  const { Chip, SectionHead } = window;

  const POS_TONE = {
    POR: ['var(--gold-light)', 'rgba(212,175,55,0.14)'],
    DEF: ['var(--info)', 'rgba(74,144,226,0.14)'],
    MED: ['var(--success)', 'rgba(0,200,90,0.14)'],
    DEL: ['var(--danger)', 'rgba(232,64,64,0.14)'],
  };

  // Convierte un emoji de bandera (2 indicadores regionales) a su código ISO ("br")
  function flagToCode(flag) {
    const cps = Array.from(flag).map(c => c.codePointAt(0));
    const A = 0x1F1E6;
    if (cps.length < 2) return null;
    const a = cps[0] - A, b = cps[1] - A;
    if (a < 0 || a > 25 || b < 0 || b > 25) return null;
    return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
  }
  // Código de bandera de un equipo (prefiere el ISO real)
  const teamCode = (t) => t.code || flagToCode(t.flag) || 'xx';

  function PlayerRow({ p, starter }) {
    const tone = POS_TONE[p.pos] || ['var(--muted)', 'rgba(255,255,255,0.06)'];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="num" style={{ width: 22, textAlign: 'center', color: starter ? 'var(--gold-light)' : 'var(--muted-2)', fontSize: 'var(--t-2xs)', flexShrink: 0 }}>{p.n}</span>
        <span style={{ flex: 1, fontSize: 'var(--t-sm)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: starter ? 700 : 400 }}>
          {starter && <span style={{ color: 'var(--gold)', marginRight: 4 }}>★</span>}{p.name}
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, color: tone[0], background: tone[1], padding: '2px 6px', borderRadius: 'var(--r-pill)', flexShrink: 0 }}>{p.pos}</span>
      </div>
    );
  }

  // Todos los equipos del Mundial con su grupo (para el modal de país)
  const ALL_TEAMS = (function () {
    // Usar datos reales wc2026.js (tienen código ISO y nombres correctos)
    if (window.MB_WC && window.MB_WC.GROUPS) {
      const out = [];
      Object.keys(window.MB_WC.GROUPS).forEach(g => {
        (window.MB_WC.GROUPS[g] || []).forEach(([name, code]) => {
          // Enriquecer con datos de GROUP_STANDINGS si el nombre coincide
          const std = Object.values(Dw.GROUP_STANDINGS).flat().find(t => t.name === name);
          out.push(Object.assign({ group: g, code }, std || { name, flag: '' }));
        });
      });
      return out;
    }
    // Fallback: datos de data.js (sin código ISO)
    const out = [];
    Object.keys(Dw.GROUP_STANDINGS).forEach(letter => {
      Dw.GROUP_STANDINGS[letter].forEach(t => out.push(Object.assign({}, t, { group: letter })));
    });
    return out;
  })();
  // Busca la ficha completa de una selección por nombre (para abrir el modal desde partidos)
  const teamByName = (name) => ALL_TEAMS.find(t => t.name === name) || null;

  function TeamModal({ team, onClose }) {
    const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
    if (!team) return null;
    const code = teamCode(team);
    const standings = (window.MB_standings ? window.MB_standings(store ? store.odds : {})[team.group]
                       : (window.MB.GROUP_STANDINGS && window.MB.GROUP_STANDINGS[team.group])) || [];
    const fmtKO = (iso) => new Date(iso).toLocaleString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const allFxM = (window.MB && window.MB.WC_FIXTURES) || [];
    const dynFxM = (store && store.dynFixtures) || [];
    const allFxCombined = [...allFxM, ...dynFxM.filter(d => !allFxM.some(s => s.id === d.id))];
    const teamFixtures = allFxCombined
      .filter(m => m.home === team.name || m.away === team.name || (code && (m.homeCode === code || m.awayCode === code)))
      .sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1));
    const squad = (window.MB.PLAYERS && window.MB.PLAYERS[team.name]) || [];
    const titulares = squad.filter(p => p.t);
    const suplentes = squad.filter(p => !p.t);
    const groupFxM = allFxM.filter(f => !f.stage || f.stage === 'Grupos');
    const lastKOM = groupFxM.length ? Math.max.apply(null, groupFxM.map(f => new Date(f.kickoff).getTime())) : Infinity;
    const r32CodesM = new Set(allFxCombined.filter(f => f.stage === 'r32').flatMap(f => [f.homeCode, f.awayCode]).filter(Boolean));
    const groupsClosedM = r32CodesM.size > 0 && isFinite(lastKOM) && Date.now() >= lastKOM + 2 * 60 * 60 * 1000;
    // Rastrear en qué fase KO fue eliminado el equipo
    const KO_STAGES = ['r32', 'r16', 'qf', 'sf', 'final'];
    const STAGE_NAME = { r32: 'Ronda de 32', r16: 'Octavos de final', qf: 'Cuartos de final', sf: 'Semifinal', final: 'Final' };
    const odds = (store && store.odds) || {};
    let koStatus = null; // null | { alive: true, inStage } | { alive: false, atStage }
    if (groupsClosedM) {
      if (!r32CodesM.has(code)) {
        koStatus = { alive: false, atStage: 'Grupos' };
      } else {
        for (var _si = 0; _si < KO_STAGES.length; _si++) {
          var _stage = KO_STAGES[_si];
          var _stageFx = allFxCombined.filter(function(f) { return f.stage === _stage && (f.homeCode === code || f.awayCode === code); });
          if (_stageFx.length === 0) { koStatus = { alive: true, inStage: KO_STAGES[_si - 1] || 'r32' }; break; }
          var _m = _stageFx[0];
          var _od = odds[_m.id];
          if (!_od || !_od.finished) { koStatus = { alive: true, inStage: _stage }; break; }
          var _isHome = _m.homeCode === code;
          var _won;
          if (_od.penWinner) { _won = (_isHome && _od.penWinner === 'home') || (!_isHome && _od.penWinner === 'away'); }
          else { _won = _isHome ? _od.gh > _od.ga : _od.ga > _od.gh; }
          if (!_won) { koStatus = { alive: false, atStage: _stage }; break; }
          if (_si === KO_STAGES.length - 1) koStatus = { alive: true, inStage: 'champion' };
        }
        if (!koStatus) koStatus = { alive: true, inStage: 'r32' };
      }
    }
    const isEliminated = koStatus && !koStatus.alive;
    const isQualified = koStatus && koStatus.alive;
    const eliminatedLabel = isEliminated ? (koStatus.atStage === 'Grupos' ? 'Fase de grupos' : (STAGE_NAME[koStatus.atStage] || koStatus.atStage)) : null;
    const activeLabel = isQualified ? (koStatus.inStage === 'champion' ? 'Campeón' : (STAGE_NAME[koStatus.inStage] || koStatus.inStage)) : null;
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,8,15,0.72)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'mb-fade-up var(--dur-base) var(--ease-out)',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)',
          padding: 24, width: 'min(480px, 92vw)', maxHeight: '88vh', overflow: 'auto',
          boxShadow: 'var(--sh-4)', animation: 'mb-pop var(--dur-slow) var(--ease-spring)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <img src={`https://flagcdn.com/h80/${code}.png`} alt={team.name}
              style={{ height: 50, width: 'auto', borderRadius: 5, boxShadow: 'var(--sh-2)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-2xl)' }}>{team.name}</h2>
              {team.coach && (
                <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>🎽 DT:</span>
                  {team.coachCode && <img src={`https://flagcdn.com/h20/${team.coachCode}.png`} alt="" title={team.coachCountry} style={{ height: 11, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />}
                  <strong>{team.coach}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Chip tone="blue">Grupo {team.group}</Chip>
                {isQualified && koStatus.inStage === 'champion' && <Chip tone="gold">🏆 Campeón</Chip>}
                {isQualified && koStatus.inStage !== 'champion' && <Chip tone="green">✅ Activo · {activeLabel}</Chip>}
                {isEliminated && <Chip tone="red">❌ Eliminado en {eliminatedLabel}</Chip>}
              </div>
            </div>
            <button onClick={onClose} className="mb-press" style={{
              width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)',
              background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, flexShrink: 0,
            }}>✕</button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <SectionHead title={`Tabla · Grupo ${team.group}`} />
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '10px 6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 22px 18px 18px 18px 30px 30px', gap: 5, alignItems: 'center', padding: '0 6px 7px', borderBottom: '1px solid var(--border)', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700 }}>
                <span style={{ textAlign: 'center' }}>#</span>
                <span>Equipo</span>
                <span style={{ textAlign: 'center' }}>PJ</span>
                <span style={{ textAlign: 'center' }}>G</span>
                <span style={{ textAlign: 'center' }}>E</span>
                <span style={{ textAlign: 'center' }}>P</span>
                <span style={{ textAlign: 'center' }}>DG</span>
                <span style={{ textAlign: 'center' }}>Pts</span>
              </div>
              {standings.map(r => {
                const isMe = r.name === team.name;
                const d = r.gf - r.gc;
                return (
                  <div key={r.name} style={{
                    display: 'grid', gridTemplateColumns: '18px 1fr 22px 18px 18px 18px 30px 30px', gap: 5, alignItems: 'center', padding: '7px 6px',
                    borderRadius: 'var(--r-sm)', marginTop: 2,
                    background: isMe ? 'rgba(212,175,55,0.16)' : 'transparent',
                    border: isMe ? '1px solid rgba(212,175,55,0.55)' : '1px solid transparent',
                  }}>
                    <span style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', fontWeight: 700, color: r.pos <= 2 ? 'var(--success)' : 'var(--muted-2)' }}>{r.pos}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <img src={`https://flagcdn.com/h20/${r.code || ''}.png`} alt="" style={{ height: 13, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--t-2xs)', fontWeight: isMe ? 800 : 600, color: isMe ? 'var(--gold-light)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}{r.live && <span title="En vivo" style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#ff5252', marginLeft: 4, verticalAlign: 'middle', animation: 'mb-pulse-live 1s var(--ease-out) infinite' }} />}</span>
                    </span>
                    <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.j}</span>
                    <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.g}</span>
                    <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.e}</span>
                    <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.p}</span>
                    <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: d >= 0 ? 'var(--success)' : 'var(--danger)' }}>{(d > 0 ? '+' : '') + d}</span>
                    <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-sm)', fontWeight: 800, color: 'var(--gold-light)' }}>{r.pts}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 6, paddingLeft: 2 }}>Los 2 primeros avanzan de fase.</div>
          </div>

          <SectionHead title="Partidos y resultados" />
          {teamFixtures.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>Sin partidos registrados.</div>
          )}
          {teamFixtures.map((m, i) => {
            const od = (store && store.odds) ? store.odds[m.id] : null;
            const isLive = !!(od && od.live && !od.finished);
            const isFin = !!(od && od.finished);
            const hasScore = (isLive || isFin) && od.gh != null && od.ga != null;
            const isHome = m.home === team.name;
            let res = null; // resultado desde la perspectiva del equipo seleccionado
            if (isFin && hasScore) {
              if (od.penWinner) {
                const won = (isHome && od.penWinner === 'home') || (!isHome && od.penWinner === 'away');
                res = won ? { t: '✓ Ganó (pen)', c: 'var(--success)', bg: 'var(--success-bg)' }
                          : { t: '✕ Perdió (pen)', c: 'var(--danger)', bg: 'rgba(232,64,64,0.12)' };
              } else {
                const my = isHome ? od.gh : od.ga, ot = isHome ? od.ga : od.gh;
                res = my > ot ? { t: '✓ Ganó', c: 'var(--success)', bg: 'var(--success-bg)' }
                    : my < ot ? { t: '✕ Perdió', c: 'var(--danger)', bg: 'rgba(232,64,64,0.12)' }
                    : { t: '= Empató', c: 'var(--muted)', bg: 'var(--surface-2)' };
              }
            }
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < teamFixtures.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <Chip tone="blue">J{m.md}</Chip>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--t-sm)', fontWeight: 700 }}>{m.home} vs {m.away}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {m.stadium}</div>
                  {(() => {
                    const r = window.MB.refForMatch && window.MB.refForMatch(m);
                    return r ? (
                      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <span>🧑‍⚖️</span>
                        <img src={`https://flagcdn.com/h20/${r.code}.png`} alt="" title={r.country} style={{ height: 8, width: 'auto', borderRadius: 1 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 64 }}>
                  {hasScore ? (
                    <React.Fragment>
                      <div className="num" style={{ fontSize: 'var(--t-lg)', fontWeight: 800, lineHeight: 1, color: isLive ? '#ff6b6b' : 'var(--text)' }}>{od.gh}<span style={{ color: 'var(--muted-2)', margin: '0 2px' }}>–</span>{od.ga}</div>
                      {od.penWinner && od.penScore && <div className="num" style={{ fontSize: 9, color: 'var(--gold-light)', fontWeight: 700, marginTop: 2 }}>Pen {od.penScore.home}-{od.penScore.away}</div>}
                      {isLive
                        ? <div style={{ fontSize: 9, color: '#ff6b6b', fontWeight: 800, marginTop: 3 }}>🔴 EN VIVO</div>
                        : (res && <span style={{ display: 'inline-block', marginTop: 4, fontSize: 9, fontWeight: 700, color: res.c, background: res.bg, padding: '2px 7px', borderRadius: 'var(--r-pill)' }}>{res.t}</span>)}
                    </React.Fragment>
                  ) : (
                    <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{fmtKO(m.kickoff)}</span>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 18 }}>
            <SectionHead title={`Jugadores convocados (${squad.length})`} />
          </div>
          {team.coach && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-2xs)', color: 'var(--muted)', margin: '-4px 0 10px' }}>
              <span>🎽 DT:</span>
              {team.coachCode && <img src={`https://flagcdn.com/h20/${team.coachCode}.png`} alt="" title={team.coachCountry} style={{ height: 11, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />}
              <strong>{team.coach}</strong>
            </div>
          )}
          {squad.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>Plantilla no disponible.</div>
          ) : (
            <div>
              <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '2px 0 4px' }}>★ Once titular ({titulares.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px', marginBottom: 12 }}>
                {titulares.map((p, i) => <PlayerRow key={'t' + i} p={p} starter />)}
              </div>
              <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '2px 0 4px' }}>Suplentes ({suplentes.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                {suplentes.map((p, i) => <PlayerRow key={'s' + i} p={p} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.MB_TeamModal = TeamModal;
  window.MB_ALL_TEAMS = ALL_TEAMS;
})();
