/* ============================================================
   MundialBet Club 2026 — Pronóstico de Semifinalistas
   Expone: window.MB_SemisPick
   Reglas:
     · Elige exactamente 4 de los 8 equipos de cuartos de final.
     · Bloquea cuando el primer partido de QF inicia.
     · 500 pts por cada semifinalista acertado (máx 2000).
   Colección Firestore: semi_picks/{uid} → { teams:[code,...], ts }
   El agente resuelve al terminar todos los QF.
   ============================================================ */
(function () {
  'use strict';
  const { useState, useEffect, useMemo, useCallback } = React;
  const FB = () => window.MBFirebase || {};
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  const PTS_PER = 500;

  // Cruces de QF: retorna array de { home:{name,code}, away:{name,code} }
  function getQFMatchups() {
    const staticFX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const FX = [...staticFX, ...(window.MB_dynFixtures || []).filter(d => !staticFX.some(s => s.id === d.id))];
    return FX
      .filter((f) => f.stage === 'qf' && f.homeCode && f.awayCode)
      .sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1))
      .map((f) => ({ home: { name: f.home, code: f.homeCode }, away: { name: f.away, code: f.awayCode } }));
  }

  // Lista plana de equipos (para el banner compact)
  function getQFTeams() {
    const matchups = getQFMatchups();
    const seen = new Set(), teams = [];
    matchups.forEach((m) => {
      if (!seen.has(m.home.code)) { seen.add(m.home.code); teams.push(m.home); }
      if (!seen.has(m.away.code)) { seen.add(m.away.code); teams.push(m.away); }
    });
    return teams;
  }

  function isPickLocked() {
    const staticFX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const FX = [...staticFX, ...(window.MB_dynFixtures || []).filter(d => !staticFX.some(s => s.id === d.id))];
    const qf = FX.filter((f) => f.stage === 'qf').sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1));
    return qf.length > 0 && new Date(qf[0].kickoff).getTime() <= Date.now();
  }

  // ── Modal picker ──────────────────────────────────────────
  function SemisModal({ myPick, onClose, onSave, locked }) {
    const [sel, setSel] = useState(myPick ? [...myPick] : []);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const matchups = useMemo(getQFMatchups, []);
    const noData = matchups.length === 0;

    // Mapa rival: código → código del rival en el mismo cruce QF
    const rivalMap = useMemo(() => {
      const m = {};
      matchups.forEach((mu) => { m[mu.home.code] = mu.away.code; m[mu.away.code] = mu.home.code; });
      return m;
    }, [matchups]);

    const toggle = (code) => {
      if (locked) return;
      setSel((prev) => {
        if (prev.includes(code)) { setErr(''); return prev.filter((c) => c !== code); }
        const rival = rivalMap[code];
        if (rival && prev.includes(rival)) { setErr('No puedes elegir ambos equipos del mismo cruce'); return prev; }
        if (prev.length >= 4) { setErr('Solo puedes elegir 4 equipos (uno por cruce)'); return prev; }
        setErr('');
        return [...prev, code];
      });
    };

    const save = async () => {
      if (sel.length !== 4) { setErr('Debes elegir exactamente 4 equipos'); return; }
      setSaving(true);
      try {
        await FB().saveSemiPick(sel);
        onSave(sel);
      } catch (e) {
        console.error('[SemisPick] saveSemiPick error:', e);
        const code = (e && e.code) || e;
        setErr('Error al guardar' + (code && typeof code === 'string' && code !== '[object Object]' ? ' (' + code + ')' : '') + '. Intenta de nuevo.');
      }
      setSaving(false);
    };

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(13,20,15,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', flexDirection: 'column', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '52px 16px 14px', background: 'linear-gradient(180deg, #061209 80%, transparent)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--text)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 'var(--t-lg)', color: locked ? 'var(--muted)' : '#9B6DFF' }}>
              {locked ? '🔒 Cerrado' : '🔮 ¿Quiénes llegan a semis?'}
            </div>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2 }}>
              Elige 4 de los 8 equipos de cuartos · +{fmt(PTS_PER)} pts por acierto · máx +{fmt(PTS_PER * 4)} pts
            </div>
          </div>
        </div>

        {/* Progreso */}
        {!locked && (
          <div style={{ flexShrink: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: (sel.length / 4 * 100) + '%', height: '100%', background: '#9B6DFF', borderRadius: 99, transition: 'width 0.3s var(--ease-out)' }} />
            </div>
            <span style={{ fontSize: 'var(--t-xs)', color: '#9B6DFF', fontWeight: 800, flexShrink: 0 }}>{sel.length}/4</span>
          </div>
        )}

        {/* Lista equipos agrupados por cruce QF */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
          {noData ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
              <div style={{ fontWeight: 700 }}>Los equipos de cuartos se confirmarán al terminar los octavos de final.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matchups.map((mu, mi) => (
                <div key={mu.home.code + mu.away.code}>
                  <div style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Cruce {mi + 1}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
                    {(() => {
                      const TeamBtn = ({ t }) => {
                        const picked = sel.includes(t.code);
                        const rival = rivalMap[t.code];
                        const rivalPicked = rival && sel.includes(rival);
                        const disabled = locked || rivalPicked;
                        return (
                          <button onClick={() => toggle(t.code)} disabled={disabled}
                            className={disabled ? '' : 'mb-press'}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 8px', borderRadius: 'var(--r-lg)', border: picked ? '2px solid #9B6DFF' : rivalPicked ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)', background: picked ? 'rgba(155,109,255,0.15)' : rivalPicked ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.035)', cursor: disabled ? 'default' : 'pointer', position: 'relative', opacity: rivalPicked ? 0.35 : 1, width: '100%' }}>
                            {picked && <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#9B6DFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✓</div>}
                            <img src={`https://flagcdn.com/h40/${t.code}.png`} alt={t.name}
                              style={{ height: 30, width: 'auto', borderRadius: 3, boxShadow: '0 2px 5px rgba(0,0,0,0.5)', filter: rivalPicked ? 'grayscale(0.8)' : (locked && !picked) ? 'grayscale(0.6) opacity(0.6)' : 'none' }} />
                            <span style={{ fontWeight: 700, fontSize: 'var(--t-2xs)', color: picked ? '#C4A0FF' : rivalPicked ? 'var(--muted-2)' : 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>{t.name}</span>
                          </button>
                        );
                      };
                      return (
                        <React.Fragment>
                          <TeamBtn t={mu.home} />
                          <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: 'var(--muted-2)', padding: '0 2px' }}>vs</div>
                          <TeamBtn t={mu.away} />
                        </React.Fragment>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
          {err && <div style={{ textAlign: 'center', color: 'var(--danger)', fontSize: 'var(--t-xs)', fontWeight: 700, padding: '10px 0' }}>{err}</div>}
        </div>

        {/* Botón guardar */}
        {!locked && !noData && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 28px', background: 'linear-gradient(0deg, rgba(6,18,9,0.98) 60%, transparent)', backdropFilter: 'blur(8px)' }}>
            <button onClick={save} disabled={sel.length !== 4 || saving}
              style={{ width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: 'none', cursor: sel.length === 4 ? 'pointer' : 'default', background: sel.length === 4 ? 'linear-gradient(135deg, #9B6DFF, #7A4FE0)' : 'var(--surface-2)', color: sel.length === 4 ? '#fff' : 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-md)', transition: 'all 0.2s' }}>
              {saving ? 'Guardando…' : sel.length === 4 ? '✓ Guardar pronóstico' : `Faltan ${4 - sel.length} por elegir`}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Componente público: banner + compact ──────────────────
  function SemisPick({ compact, banner }) {
    const [open, setOpen] = useState(false);
    const [myPick, setMyPick] = useState(null); // array de codes o null
    const [loading, setLoading] = useState(true);
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const locked = isPickLocked();
    // Nada de useMemo con deps vacías: las fixtures de cuartos (dynFixtures) llegan
    // async después del montaje, y este componente se monta temprano en Inicio
    // (a diferencia de Apostar, que remonta ya con los datos listos). Un tick que
    // avanza con el evento mb-dynfx-updated fuerza a recalcular cuando llegan.
    const [dynTick, setDynTick] = useState(0);
    useEffect(() => {
      const on = () => setDynTick((t) => t + 1);
      window.addEventListener('mb-dynfx-updated', on);
      return () => window.removeEventListener('mb-dynfx-updated', on);
    }, []);
    const teams = useMemo(getQFTeams, [dynTick]);
    const noData = teams.length === 0;

    useEffect(() => {
      if (!user || !FB().getSemiPick) { setLoading(false); return; }
      FB().getSemiPick().then((p) => { setMyPick(p); setLoading(false); }).catch(() => setLoading(false));
    }, [user && user.uid]);

    const handleSave = useCallback((codes) => { setMyPick(codes); setOpen(false); }, []);

    if (!user || loading) return null;
    if (noData && !compact && !banner) return null;

    // ── COMPACT ──
    if (compact) {
      return (
        <React.Fragment>
          {open && <SemisModal myPick={myPick} onClose={() => setOpen(false)} onSave={handleSave} locked={locked} />}
          <div onClick={() => !locked && !noData && setOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--border)', cursor: (locked || noData) ? 'default' : 'pointer' }}>
            <span style={{ fontSize: 13 }}>🔮</span>
            <span style={{ flex: 1, fontSize: 'var(--t-xs)', color: 'var(--muted)', fontWeight: 700 }}>Semifinalistas</span>
            {noData ? (
              <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted-2)' }}>Pendiente octavos</span>
            ) : myPick ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {myPick.map((c) => <img key={c} src={`https://flagcdn.com/h20/${c}.png`} alt={c} style={{ height: 12, borderRadius: 2 }} />)}
              </span>
            ) : locked ? (
              <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted-2)' }}>No elegiste</span>
            ) : (
              <span style={{ fontSize: 'var(--t-xs)', color: '#9B6DFF', fontWeight: 800 }}>Elegir →</span>
            )}
          </div>
        </React.Fragment>
      );
    }

    // ── BANNER ──
    if (banner) {
      if (noData) return null;
      const canEdit = !locked;
      return (
        <React.Fragment>
          {open && <SemisModal myPick={myPick} onClose={() => setOpen(false)} onSave={handleSave} locked={locked} />}
          <div onClick={canEdit ? () => setOpen(true) : undefined} className={canEdit ? 'mb-press mb-card-hover' : ''}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 'var(--r-lg)', background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(155,109,255,0.5)', boxShadow: '0 0 0 1px rgba(155,109,255,0.12), var(--sh-1)', cursor: canEdit ? 'pointer' : 'default', marginBottom: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            {/* Badge NUEVO */}
            {!myPick && !locked && (
              <div style={{ position: 'absolute', top: -9, right: 12, background: 'linear-gradient(135deg,#9B6DFF,#7A4FE0)', color: '#fff', fontSize: 8.5, fontWeight: 900, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 'var(--r-pill)', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(155,109,255,0.5)' }}>✨ Nuevo</div>
            )}
            <span style={{ fontSize: 24 }}>{locked ? '🔒' : '🔮'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 'var(--t-sm)', color: locked ? 'var(--muted)' : '#C4A0FF' }}>
                {locked ? 'Pronóstico de semifinalistas cerrado' : myPick ? 'Tu pronóstico de semifinalistas' : '¿Quiénes llegan a semifinales?'}
              </div>
              {myPick ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                  {myPick.map((c) => <img key={c} src={`https://flagcdn.com/h40/${c}.png`} alt={c} style={{ height: 20, width: 'auto', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />)}
                  {canEdit && <span style={{ fontSize: 'var(--t-2xs)', color: '#9B6DFF', fontWeight: 700, marginLeft: 4 }}>· Cambiar</span>}
                </div>
              ) : (
                <div style={{ fontSize: 'var(--t-2xs)', color: 'rgba(155,109,255,0.7)', marginTop: 2 }}>Elige 4 de los 8 clasificados · +{fmt(PTS_PER * 4)} pts máximo</div>
              )}
            </div>
            {canEdit && !myPick && <span style={{ fontSize: 16, color: '#9B6DFF' }}>→</span>}
          </div>
        </React.Fragment>
      );
    }

    return null;
  }

  window.MB_SemisPick = SemisPick;
})();
