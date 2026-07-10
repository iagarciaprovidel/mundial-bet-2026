/* ============================================================
   MundialBet Club 2026 — Pronóstico del Campeón
   Expone:
     window.MB_ChampionPick   — inline compact + banner CTA
     window.MB_champFlag(code,name,size) — helper banderita
   Escalera de bonos espejo del agente (CHAMP_LADDER):
     r32:7k · r16:10k · qf:15k · sf:20k · final:30k (+5k pase de fase)
   Bloqueo: cuando el primer partido de qf ya inició.
   ============================================================ */
(function () {
  'use strict';
  const { useState, useEffect, useMemo, useCallback } = React;
  const FB = () => window.MBFirebase || {};

  const LADDER = { r32: 7000, r16: 10000, qf: 15000, sf: 20000, final: 30000 };
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');

  // Banderita helper — usada en el saludo del Dashboard
  window.MB_champFlag = function (code, name, size) {
    if (!code) return null;
    const sz = size || 16;
    return React.createElement('img', {
      src: 'https://flagcdn.com/h20/' + code + '.png',
      title: name || code,
      alt: name || code,
      style: { height: sz, width: 'auto', borderRadius: 2, marginLeft: 5, verticalAlign: 'middle', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' },
    });
  };

  // Detecta si el cierre ya ocurrió: cuando el primer QF tiene kickoff <= now
  function isPickLocked() {
    const staticFX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const FX = [...staticFX, ...(window.MB_dynFixtures || []).filter(d => !staticFX.some(s => s.id === d.id))];
    const qf = FX.filter((f) => f.stage === 'qf');
    if (!qf.length) return false;
    const first = qf.slice().sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1))[0];
    return first && new Date(first.kickoff).getTime() <= Date.now();
  }

  // Todos los equipos del Mundial ordenados por grupo
  function allTeams() {
    const G = (window.MB_WC && window.MB_WC.GROUPS) || {};
    const list = [];
    Object.keys(G).sort().forEach((g) => {
      (G[g] || []).forEach(([name, code]) => list.push({ name, code, group: g }));
    });
    return list;
  }

  // Calcula qué códigos de equipos están eliminados revisando resultados KO
  function computeEliminatedCodes(allFx, odds) {
    const eliminated = new Set();
    const groupFx = allFx.filter(f => !f.stage || f.stage === 'Grupos');
    const lastGroup = groupFx.length ? Math.max.apply(null, groupFx.map(f => new Date(f.kickoff).getTime())) : Infinity;
    const r32Fx = allFx.filter(f => f.stage === 'r32');
    const r32Codes = new Set(r32Fx.flatMap(f => [f.homeCode, f.awayCode]).filter(Boolean));
    const groupsClosed = r32Codes.size > 0 && isFinite(lastGroup) && Date.now() >= lastGroup + 2 * 60 * 60 * 1000;
    if (!groupsClosed) return eliminated;
    // Equipos que no pasaron grupos
    const allGroupCodes = new Set(groupFx.flatMap(f => [f.homeCode, f.awayCode]).filter(Boolean));
    allGroupCodes.forEach(c => { if (!r32Codes.has(c)) eliminated.add(c); });
    // KO stages: ver quién perdió en cada partido terminado
    ['r32', 'r16', 'qf', 'sf', 'final'].forEach(stage => {
      allFx.filter(f => f.stage === stage).forEach(m => {
        const od = odds && odds[m.id];
        if (!od || !od.finished || od.gh == null || od.ga == null) return;
        let loserCode;
        if (od.penWinner) {
          loserCode = od.penWinner === 'home' ? m.awayCode : m.homeCode;
        } else {
          loserCode = od.gh > od.ga ? m.awayCode : od.ga > od.gh ? m.homeCode : null;
        }
        if (loserCode) eliminated.add(loserCode);
      });
    });
    return eliminated;
  }

  // ── Picker full-screen ────────────────────────────────────
  function ChampionModal({ myCode, onClose, onPick, locked, dist, total }) {
    const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
    const teams = useMemo(allTeams, []);
    const [q, setQ] = useState('');
    const [saving, setSaving] = useState(null); // code being saved

    const allFxComb = useMemo(() => {
      const st = (window.MB && window.MB.WC_FIXTURES) || [];
      const dy = (store && store.dynFixtures) || [];
      return [...st, ...dy.filter(d => !st.some(s => s.id === d.id))];
    }, [store && store.dynFixtures]);

    const eliminatedCodes = useMemo(
      () => computeEliminatedCodes(allFxComb, (store && store.odds) || {}),
      [allFxComb, store && store.odds]
    );

    const filtered = q
      ? teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
      : teams;

    // Agrupar por grupo
    const byGroup = {};
    filtered.forEach((t) => { (byGroup[t.group] = byGroup[t.group] || []).push(t); });

    const pick = async (name, code) => {
      if (locked || saving) return;
      setSaving(code);
      try { await FB().setChampion(name, code); onPick({ name, code }); } catch (e) {}
      setSaving(null);
    };

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '52px 16px 12px', background: 'linear-gradient(180deg, #061209 80%, transparent)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--text)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 'var(--t-lg)', color: locked ? 'var(--muted)' : 'var(--gold-light)' }}>
              {locked ? '🔒 Pronóstico cerrado' : '🏆 ¿Quién será Campeón?'}
            </div>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2 }}>
              {locked ? 'Los cuartos de final ya comenzaron.' : `Acumulas puntos cada ronda que avance tu selección · ${total} jugadores eligieron`}
            </div>
          </div>
        </div>

        {/* Bonus ladder */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 6, padding: '10px 14px', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
          {[['Octavos', 'r32', 'r32'], ['1/8', 'r16', 'r16'], ['Cuartos', 'qf', 'qf'], ['Semis', 'sf', 'sf'], ['Final', 'final', 'final']].map(([label, key]) => (
            <div key={key} style={{ flexShrink: 0, textAlign: 'center', padding: '5px 10px', borderRadius: 'var(--r-md)', background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div className="num" style={{ fontSize: 'var(--t-sm)', color: 'var(--gold-light)', fontWeight: 800 }}>+{fmt(LADDER[key])}</div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        {!locked && (
          <div style={{ flexShrink: 0, padding: '8px 14px' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar selección…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 'var(--t-sm)', outline: 'none' }} />
          </div>
        )}

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 24px' }}>
          {Object.keys(byGroup).sort().map((g) => (
            <div key={g}>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 6px' }}>Grupo {g}</div>
              {byGroup[g].map((t) => {
                const isMine = t.code === myCode;
                const isElim = eliminatedCodes.has(t.code);
                const pct = total > 0 ? Math.round(((dist[t.code] || 0) / total) * 100) : 0;
                const cnt = dist[t.code] || 0;
                return (
                  <button key={t.code} onClick={() => !isElim && pick(t.name, t.code)} disabled={!!locked || isElim}
                    className={isElim ? '' : 'mb-press'}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 4, borderRadius: 'var(--r-md)', border: isMine ? '2px solid var(--gold)' : isElim ? '1px solid rgba(232,64,64,0.2)' : '1px solid var(--border)', background: isMine ? 'rgba(212,175,55,0.12)' : isElim ? 'rgba(232,64,64,0.04)' : 'rgba(255,255,255,0.035)', cursor: (locked || isElim) ? 'default' : 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', opacity: isElim ? 0.45 : 1 }}>
                    {pct > 0 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', background: isMine ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)', transition: 'width 0.6s var(--ease-out)', pointerEvents: 'none' }} />}
                    <img src={`https://flagcdn.com/h40/${t.code}.png`} alt={t.name}
                      style={{ height: 26, width: 'auto', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.5)', flexShrink: 0, filter: isElim ? 'grayscale(0.7)' : 'none' }} />
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--t-sm)', color: isMine ? 'var(--gold-light)' : isElim ? 'var(--muted-2)' : 'var(--text)' }}>{t.name}</span>
                    {isElim && <span style={{ fontSize: 8, fontWeight: 800, color: 'rgba(232,64,64,0.7)', background: 'rgba(232,64,64,0.12)', padding: '2px 6px', borderRadius: 'var(--r-pill)' }}>ELIMINADO</span>}
                    {cnt > 0 && !isElim && <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>{cnt > 1 ? cnt + ' votos' : '1 voto'}</span>}
                    {isMine && <span style={{ fontSize: 14 }}>✓</span>}
                    {saving === t.code && <span style={{ fontSize: 11, color: 'var(--gold)' }}>…</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Componente principal: compact + banner + modal ────────
  function ChampionPick({ compact, banner }) {
    const [open, setOpen] = useState(false);
    const [myChamp, setMyChamp] = useState(null); // { name, code }
    const users = window.MB_useUsers ? window.MB_useUsers() : [];
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const locked = isPickLocked();

    // Obtener mi campeón desde subscribeMe
    useEffect(() => {
      if (!user || !FB().subscribeMe) return;
      const un = FB().subscribeMe((u) => {
        if (u && u.championCode) setMyChamp({ name: u.champion, code: u.championCode });
        else setMyChamp(null);
      });
      return () => { if (typeof un === 'function') un(); };
    }, [user && user.uid]);

    const dist = useMemo(() => {
      const c = {};
      users.forEach((u) => { if (u.championCode) c[u.championCode] = (c[u.championCode] || 0) + 1; });
      return c;
    }, [users]);

    const total = useMemo(() => users.filter((u) => u.championCode).length, [users]);

    const handlePick = useCallback(({ name, code }) => { setMyChamp({ name, code }); setOpen(false); }, []);

    if (!user) return null;

    // ── COMPACT: fila dentro de la card de métricas ──
    if (compact) {
      const openDetail = (e) => {
        if (myChamp && myChamp.code) {
          e.stopPropagation();
          if (window.__mbOpenTeamByCode) window.__mbOpenTeamByCode(myChamp.code);
          else if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(myChamp.name);
        }
      };
      return (
        <div onClick={() => !locked && setOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--border)', cursor: locked ? 'default' : 'pointer' }}>
          <span style={{ fontSize: 13 }}>🏆</span>
          <span style={{ flex: 1, fontSize: 'var(--t-xs)', color: 'var(--muted)', fontWeight: 700 }}>Mi campeón</span>
          {myChamp ? (
            <span onClick={openDetail} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-xs)', fontWeight: 800, color: 'var(--gold-light)', cursor: 'pointer' }} title={'Ver ficha de ' + myChamp.name}>
              <img src={`https://flagcdn.com/h20/${myChamp.code}.png`} alt={myChamp.name} style={{ height: 18, borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />
              {myChamp.name}
              {!locked && <span style={{ fontSize: 9, color: 'var(--muted-2)', marginLeft: 2 }}>✏️</span>}
            </span>
          ) : locked ? (
            <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted-2)', fontWeight: 600 }}>No elegiste</span>
          ) : (
            <span style={{ fontSize: 'var(--t-xs)', color: 'var(--gold)', fontWeight: 800 }}>Elegir →</span>
          )}
          {open && React.createElement(ChampionModal, { myCode: myChamp && myChamp.code, onClose: () => setOpen(false), onPick: handlePick, locked, dist, total })}
        </div>
      );
    }

    // ── BANNER: solo aparece si no eligió y el plazo sigue abierto ──
    if (banner) {
      if (myChamp || locked) return null;
      return (
        <div onClick={() => setOpen(true)} className="mb-press"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 'var(--r-lg)', background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(11,17,13,0.92))', border: '1.5px solid rgba(212,175,55,0.6)', cursor: 'pointer', animation: 'mb-glow-breathe 3s var(--ease-out) infinite' }}>
          <span style={{ fontSize: 28 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--t-sm)', color: 'var(--gold-light)' }}>¿Quién será el Campeón del Mundial?</div>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2 }}>Acumula hasta <span style={{ color: 'var(--gold)', fontWeight: 800 }}>+{fmt(Object.values(LADDER).reduce((a, b) => a + b, 0))}</span> pts si aciertas · Cierra en cuartos</div>
          </div>
          <span style={{ fontSize: 18, color: 'var(--gold)' }}>→</span>
          {open && React.createElement(ChampionModal, { myCode: null, onClose: () => setOpen(false), onPick: handlePick, locked, dist, total })}
        </div>
      );
    }

    return null;
  }

  window.MB_ChampionPick = ChampionPick;
})();
