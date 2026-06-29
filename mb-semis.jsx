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

  // Los 8 equipos de QF: se derivan de los fixtures con stage === 'qf'
  function getQFTeams() {
    const FX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const qf = FX.filter((f) => f.stage === 'qf');
    const seen = new Set(), teams = [];
    qf.forEach((f) => {
      if (f.homeCode && !seen.has(f.homeCode)) { seen.add(f.homeCode); teams.push({ name: f.home, code: f.homeCode }); }
      if (f.awayCode && !seen.has(f.awayCode)) { seen.add(f.awayCode); teams.push({ name: f.away, code: f.awayCode }); }
    });
    return teams;
  }

  function isPickLocked() {
    const FX = (window.MB_WC && window.MB_WC.FIXTURES) || (window.MB && window.MB.WC_FIXTURES) || [];
    const qf = FX.filter((f) => f.stage === 'qf').sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1));
    return qf.length > 0 && new Date(qf[0].kickoff).getTime() <= Date.now();
  }

  // ── Modal picker ──────────────────────────────────────────
  function SemisModal({ myPick, onClose, onSave, locked }) {
    const [sel, setSel] = useState(myPick ? [...myPick] : []);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const teams = useMemo(getQFTeams, []);
    const noData = teams.length === 0;

    const toggle = (code) => {
      if (locked) return;
      setSel((prev) => {
        if (prev.includes(code)) return prev.filter((c) => c !== code);
        if (prev.length >= 4) { setErr('Solo puedes elegir 4 equipos'); return prev; }
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
        setErr('Error al guardar. Intenta de nuevo.');
      }
      setSaving(false);
    };

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.87)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
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

        {/* Lista equipos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
          {noData ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
              <div style={{ fontWeight: 700 }}>Los equipos de cuartos se confirmarán al terminar los octavos de final.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {teams.map((t) => {
                const picked = sel.includes(t.code);
                const myPrev = myPick && myPick.includes(t.code);
                return (
                  <button key={t.code} onClick={() => toggle(t.code)} disabled={!!locked}
                    className="mb-press"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 10px', borderRadius: 'var(--r-lg)', border: picked ? '2px solid #9B6DFF' : '1px solid var(--border)', background: picked ? 'rgba(155,109,255,0.15)' : 'rgba(255,255,255,0.035)', cursor: locked ? 'default' : 'pointer', position: 'relative' }}>
                    {picked && <div style={{ position: 'absolute', top: 7, right: 7, width: 18, height: 18, borderRadius: '50%', background: '#9B6DFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>}
                    <img src={`https://flagcdn.com/h40/${t.code}.png`} alt={t.name}
                      style={{ height: 32, width: 'auto', borderRadius: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.5)', filter: (locked && !picked) ? 'grayscale(0.6) opacity(0.6)' : 'none' }} />
                    <span style={{ fontWeight: 700, fontSize: 'var(--t-xs)', color: picked ? '#C4A0FF' : 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>{t.name}</span>
                  </button>
                );
              })}
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
    const teams = useMemo(getQFTeams, []);
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
          {open && React.createElement(SemisModal, { myPick, onClose: () => setOpen(false), onSave: handleSave, locked })}
        </div>
      );
    }

    // ── BANNER ──
    if (banner) {
      if (noData) return null;
      if (myPick || locked) return null;
      return (
        <div onClick={() => setOpen(true)} className="mb-press"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 'var(--r-lg)', background: 'linear-gradient(135deg, rgba(155,109,255,0.15), rgba(11,17,13,0.92))', border: '1.5px solid rgba(155,109,255,0.55)', cursor: 'pointer' }}>
          <span style={{ fontSize: 28 }}>🔮</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--t-sm)', color: '#C4A0FF' }}>¿Quiénes llegan a semifinales?</div>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2 }}>Elige 4 de los 8 clasificados · +{fmt(PTS_PER * 4)} pts máximo</div>
          </div>
          <span style={{ fontSize: 18, color: '#9B6DFF' }}>→</span>
          {open && React.createElement(SemisModal, { myPick, onClose: () => setOpen(false), onSave: handleSave, locked })}
        </div>
      );
    }

    return null;
  }

  window.MB_SemisPick = SemisPick;
})();
