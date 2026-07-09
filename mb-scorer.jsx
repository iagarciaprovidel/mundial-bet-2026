/* ============================================================
   MundialBet Club 2026 — Apuesta al Goleador del Torneo
   Expone: window.MB_ScorerBet
   Reglas:
     · Apuesta con puntos (mín 1.000) a un jugador de los 8 equipos de
       cuartos de final (mismo cierre que Semifinalistas/Campeón).
     · Si el jugador termina con más goles que nadie en el torneo (o
       empatado en la cima), paga ×20 el monto apostado.
     · Bloquea cuando el primer partido de QF inicia.
   Colección Firestore: users/{uid}.scorerBet → { player, team, teamCode, stake, status, ts }
   El agente liquida al terminar la FINAL (settleScorerBets en agent/index.js).
   ============================================================ */
(function () {
  'use strict';
  const { useState, useEffect, useMemo, useCallback } = React;
  const FB = () => window.MBFirebase || {};
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  const MULT = 20;
  const MIN_STAKE = 1000;

  // Los mismos 8 equipos de cuartos que usa Semifinalistas (con su código de bandera)
  function getQFTeams() {
    const staticFX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const FX = [...staticFX, ...(window.MB_dynFixtures || []).filter(d => !staticFX.some(s => s.id === d.id))];
    const qf = FX.filter((f) => f.stage === 'qf' && f.homeCode && f.awayCode);
    const seen = new Set(), teams = [];
    qf.forEach((f) => {
      if (!seen.has(f.homeCode)) { seen.add(f.homeCode); teams.push({ name: f.home, code: f.homeCode }); }
      if (!seen.has(f.awayCode)) { seen.add(f.awayCode); teams.push({ name: f.away, code: f.awayCode }); }
    });
    return teams;
  }

  function isPickLocked() {
    const staticFX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const FX = [...staticFX, ...(window.MB_dynFixtures || []).filter(d => !staticFX.some(s => s.id === d.id))];
    const qf = FX.filter((f) => f.stage === 'qf').sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1));
    return qf.length > 0 && new Date(qf[0].kickoff).getTime() <= Date.now();
  }

  function playersOf(teamName) {
    const P = (window.MB && window.MB.PLAYERS) || {};
    return (P[teamName] || []).filter((p) => p.pos !== 'POR');
  }

  // El agente guarda los goleadores con el nombre tal cual lo entrega ESPN
  // (odds/{id}.scorers[].name), que no siempre coincide letra por letra con
  // el nombre de la plantilla (players.js) — p. ej. ESPN devuelve "Messi" y
  // acá está "Lionel Messi". Match tolerante: igual, uno contiene al otro, o
  // mismo último apellido (sin tildes). Se usa igual en agent/index.js.
  function normName(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
  function lastToken(s) {
    const parts = normName(s).split(/\s+/).filter(Boolean);
    return parts[parts.length - 1] || '';
  }
  function namesMatch(a, b) {
    const na = normName(a), nb = normName(b);
    if (!na || !nb) return false;
    if (na === nb || na.includes(nb) || nb.includes(na)) return true;
    const la = lastToken(a), lb = lastToken(b);
    return la.length > 2 && la === lb;
  }
  window.MB_scorerNamesMatch = namesMatch;

  // Goles reales del torneo para un jugador de la plantilla, sumando todos
  // los partidos ya jugados (odds/{id}.scorers, escrito por el agente).
  function goalsFor(playerName, odds) {
    let n = 0;
    Object.values(odds || {}).forEach((o) => {
      (o.scorers || []).forEach((s) => { if (s && s.name && !s.og && namesMatch(playerName, s.name)) n++; });
    });
    return n;
  }

  // Partidos jugados (terminados) por la selección del jugador — da contexto
  // al conteo de goles (ej. "4 goles en 5 PJ" vs "4 goles en 2 PJ").
  function playedCountFor(teamCode, fx, odds) {
    let n = 0;
    fx.forEach((f) => {
      if (f.homeCode !== teamCode && f.awayCode !== teamCode) return;
      const o = odds[f.id];
      if (o && o.finished) n++;
    });
    return n;
  }

  // Lista plana de jugadores elegibles: {name, pos, t, team, teamCode, goals, pj} —
  // sin agrupar por país primero, la selección se muestra al lado del nombre.
  // Ordenados por goles reales del torneo (los que van liderando, primero).
  function allEligiblePlayers(teams, fx, odds) {
    const pjByTeam = {};
    teams.forEach((t) => { pjByTeam[t.code] = playedCountFor(t.code, fx, odds); });
    const out = [];
    teams.forEach((t) => {
      playersOf(t.name).forEach((p) => out.push({ name: p.name, pos: p.pos, t: p.t, team: t.name, teamCode: t.code, goals: goalsFor(p.name, odds), pj: pjByTeam[t.code] }));
    });
    return out.sort((a, b) => (b.goals - a.goals) || (b.t - a.t) || a.name.localeCompare(b.name));
  }

  // ── Modal: elegir jugador (lista única, filtrable) + monto ──
  function ScorerModal({ myBet, saldo, onClose, onSave, locked }) {
    const teams = useMemo(getQFTeams, []);
    const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const odds = (store && store.odds) || {};
    const staticFX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const fx = useMemo(() => [...staticFX, ...(window.MB_dynFixtures || []).filter(d => !staticFX.some(s => s.id === d.id))], []);
    const players = useMemo(() => allEligiblePlayers(teams, fx, odds), [teams, fx, odds]);
    const topGoals = players.length ? players[0].goals : 0;
    const [q, setQ] = useState('');
    const [picked, setPicked] = useState(myBet ? { name: myBet.player, teamCode: myBet.teamCode, team: myBet.team } : null);
    const [stake, setStake] = useState(myBet ? myBet.stake : MIN_STAKE);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const noData = teams.length === 0;
    const qLower = q.trim().toLowerCase();
    const filtered = qLower
      ? players.filter((p) => p.name.toLowerCase().includes(qLower) || p.team.toLowerCase().includes(qLower))
      : players;

    const save = async () => {
      if (!picked) { setErr('Elige un jugador'); return; }
      if (stake < MIN_STAKE) { setErr(`El mínimo es ${fmt(MIN_STAKE)} pts`); return; }
      if (stake > saldo) { setErr('No tienes suficiente saldo'); return; }
      setSaving(true);
      try {
        await FB().placeScorerBet(picked.name, picked.team, picked.teamCode, stake);
        onSave({ player: picked.name, team: picked.team, teamCode: picked.teamCode, stake, status: 'open' });
      } catch (e) {
        console.error('[ScorerBet] placeScorerBet error:', e);
        const code = (e && e.code) || e;
        setErr('Error al guardar' + (code && typeof code === 'string' && code !== '[object Object]' ? ' (' + code + ')' : '') + '. Intenta de nuevo.');
      }
      setSaving(false);
    };

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(13,20,15,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', flexDirection: 'column', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }} onClick={e => e.stopPropagation()}>
        <div style={{ flexShrink: 0, padding: '52px 16px 14px', background: 'linear-gradient(180deg, #061209 80%, transparent)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--text)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 'var(--t-lg)', color: locked ? 'var(--muted)' : '#FF9D4D' }}>
              {locked ? '🔒 Cerrado' : '⚽ Goleador del Torneo'}
            </div>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2 }}>
              Elige un jugador de los 8 equipos de cuartos · si termina como máximo goleador, ×{MULT} tu apuesta
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 100px' }}>
          {noData ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
              <div style={{ fontWeight: 700 }}>Los equipos de cuartos se confirmarán al terminar los octavos de final.</div>
            </div>
          ) : (
            <>
              {!locked && (
                <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugador o selección…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 'var(--t-sm)', marginBottom: 12, boxSizing: 'border-box' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. Jugador</span>
                <span style={{ fontSize: 8, color: 'var(--muted-2)' }}>Por goles en el torneo</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, maxHeight: locked ? 'none' : 320, overflowY: locked ? 'visible' : 'auto' }}>
                {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--t-xs)', padding: '16px 0' }}>Sin resultados para "{q}"</div>}
                {filtered.map((p) => {
                  const active = picked && picked.name === p.name;
                  const isLeader = p.goals > 0 && p.goals === topGoals;
                  return (
                    <button key={p.teamCode + p.name} disabled={locked} onClick={() => { if (!locked) { setPicked(p); setErr(''); } }}
                      className={locked ? '' : 'mb-press'}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 'var(--r-md)', border: active ? '2px solid #FF9D4D' : '1px solid var(--border)', background: active ? 'rgba(255,157,77,0.14)' : 'rgba(255,255,255,0.03)', cursor: locked ? 'default' : 'pointer', textAlign: 'left' }}>
                      <img src={`https://flagcdn.com/h40/${p.teamCode}.png`} alt={p.team} style={{ height: 14, width: 'auto', borderRadius: 2, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 'var(--t-xs)', fontWeight: 700, color: active ? '#FFC08A' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        {isLeader && <span title="Líder de goleo" style={{ fontSize: 9, flexShrink: 0 }}>🔥</span>}
                        <span style={{ fontSize: 8, color: 'var(--muted-2)', flexShrink: 0 }}>· {p.team}</span>
                      </span>
                      {p.goals > 0 ? (
                        <span style={{ fontSize: 'var(--t-3xs)', fontWeight: 800, color: isLeader ? '#FFC08A' : 'var(--gold-light)', flexShrink: 0, whiteSpace: 'nowrap' }}>⚽{p.goals} · {p.pj}PJ</span>
                      ) : (
                        <span style={{ fontSize: 8, color: 'var(--muted-2)', flexShrink: 0, whiteSpace: 'nowrap' }}>{p.pj}PJ</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {picked && !locked && (
                <>
                  <div style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>2. Monto a apostar</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input type="number" min={MIN_STAKE} step={1000} value={stake}
                      onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 'var(--t-sm)', fontWeight: 700 }} />
                    <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>pts</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {[1000, 5000, 10000].map((v) => (
                      <button key={v} onClick={() => setStake(v)} className="mb-press" style={{ flex: 1, padding: '6px 4px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', color: 'var(--muted)', fontSize: 'var(--t-3xs)', fontWeight: 700, cursor: 'pointer' }}>{fmt(v)}</button>
                    ))}
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'rgba(255,157,77,0.08)', border: '1px solid rgba(255,157,77,0.3)', fontSize: 'var(--t-2xs)', color: '#FFC08A', fontWeight: 700 }}>
                    Si {picked.name} termina como máximo goleador del torneo, ganas {fmt(stake * MULT)} pts (×{MULT}).
                  </div>
                </>
              )}
            </>
          )}
          {err && <div style={{ textAlign: 'center', color: 'var(--danger)', fontSize: 'var(--t-xs)', fontWeight: 700, padding: '10px 0' }}>{err}</div>}
        </div>

        {!locked && !noData && picked && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 28px', background: 'linear-gradient(0deg, rgba(6,18,9,0.98) 60%, transparent)', backdropFilter: 'blur(8px)' }}>
            <button onClick={save} disabled={saving}
              style={{ width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #FF9D4D, #E0752B)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-md)', transition: 'all 0.2s' }}>
              {saving ? 'Guardando…' : `✓ Apostar ${fmt(stake)} pts`}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Componente público: banner ──────────────────────────
  function ScorerBet({ banner }) {
    const [open, setOpen] = useState(false);
    const [myBet, setMyBet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const saldo = window.MB_avail ? window.MB_avail(store) : 90000;
    const locked = isPickLocked();
    const [dynTick, setDynTick] = useState(0);
    useEffect(() => {
      const on = () => setDynTick((t) => t + 1);
      window.addEventListener('mb-dynfx-updated', on);
      return () => window.removeEventListener('mb-dynfx-updated', on);
    }, []);
    const teams = useMemo(getQFTeams, [dynTick]);
    const noData = teams.length === 0;

    useEffect(() => {
      if (!user || !FB().getMyScorerBet) { setLoading(false); return; }
      FB().getMyScorerBet().then((b) => { setMyBet(b); setLoading(false); }).catch(() => setLoading(false));
    }, [user && user.uid]);

    const handleSave = useCallback((bet) => { setMyBet(bet); setOpen(false); }, []);
    const claim = useCallback((ev) => {
      ev.stopPropagation();
      if (claiming || !FB().claimScorerWin) return;
      setClaiming(true);
      FB().claimScorerWin().then(() => setMyBet((b) => b ? Object.assign({}, b, { claimed: true }) : b)).catch(() => {}).finally(() => setClaiming(false));
    }, [claiming]);

    if (!user || loading) return null;
    if (!banner) return null;
    if (noData) return null;

    const canEdit = !locked;
    return (
      <React.Fragment>
        {open && <ScorerModal myBet={myBet} saldo={saldo} onClose={() => setOpen(false)} onSave={handleSave} locked={locked} />}
        <div onClick={canEdit ? () => setOpen(true) : undefined} className={canEdit ? 'mb-press mb-card-hover' : ''}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', borderRadius: 'var(--r-lg)', background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(255,157,77,0.5)', boxShadow: '0 0 0 1px rgba(255,157,77,0.12), var(--sh-1)', cursor: canEdit ? 'pointer' : 'default', marginBottom: 8, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          {!myBet && !locked && (
            <div style={{ position: 'absolute', top: -7, right: 10, background: 'linear-gradient(135deg,#FF9D4D,#E0752B)', color: '#fff', fontSize: 7.5, fontWeight: 900, letterSpacing: '0.1em', padding: '1.5px 7px', borderRadius: 'var(--r-pill)', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(255,157,77,0.5)' }}>✨ Nuevo</div>
          )}
          <span style={{ fontSize: 18 }}>{locked ? '🔒' : '⚽'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--t-2xs)', color: locked ? 'var(--muted)' : '#FFC08A' }}>
              {locked ? 'Apuesta a goleador cerrada' : myBet ? 'Tu apuesta al goleador' : '¿Quién será el goleador del torneo?'}
            </div>
            {myBet ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <img src={`https://flagcdn.com/h40/${myBet.teamCode}.png`} alt={myBet.team} style={{ height: 14, width: 'auto', borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />
                <span style={{ fontSize: 8.5, color: 'var(--text)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myBet.player}</span>
                <span style={{ fontSize: 8.5, color: 'var(--muted-2)', flexShrink: 0 }}>· {fmt(myBet.stake)}</span>
                {myBet.status === 'won' && myBet.claimed && <span style={{ fontSize: 8.5, color: 'var(--success)', fontWeight: 800, flexShrink: 0 }}>✓ +{fmt(myBet.payout)}</span>}
                {myBet.status === 'lost' && <span style={{ fontSize: 8.5, color: 'var(--muted-2)', fontWeight: 700, flexShrink: 0 }}>✗</span>}
                {canEdit && myBet.status === 'open' && <span style={{ fontSize: 8.5, color: '#FF9D4D', fontWeight: 700, flexShrink: 0 }}>· Cambiar</span>}
              </div>
            ) : (
              <div style={{ fontSize: 8.5, color: 'rgba(255,157,77,0.75)', marginTop: 1 }}>Apuesta puntos a un jugador de cuartos · ×{MULT} si acierta</div>
            )}
          </div>
          {canEdit && !myBet && <span style={{ fontSize: 14, color: '#FF9D4D', flexShrink: 0 }}>→</span>}
          {myBet && myBet.status === 'won' && !myBet.claimed && (
            <button onClick={claim} disabled={claiming} className="mb-press" style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', cursor: claiming ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 8.5, opacity: claiming ? 0.7 : 1 }}>
              {claiming ? '…' : `🎁 +${fmt(myBet.payout)}`}
            </button>
          )}
        </div>
      </React.Fragment>
    );
  }

  window.MB_ScorerBet = ScorerBet;
})();
