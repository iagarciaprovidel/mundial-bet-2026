/* ============================================================
   MundialBet Club 2026 — Álbum de figuritas (Fase 1, offline)
   Se abre desde el Perfil con window.MB_openFiguritas().
   Marca: tap = la tengo (+1) · tap de nuevo = repetida · mantener = quitar (−1).
   Guarda la colección en localStorage (mb_figuritas_2026): { [n]: count }.
   Datos: window.MB_FIGURITAS (figuritas-2026.js).
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const DATA = window.MB_FIGURITAS || { total: 0, especiales: [], selecciones: [] };
  const LS_KEY = 'mb_figuritas_2026';
  const TOTAL = DATA.total || 0;

  const loadCol = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } };
  const saveCol = (c) => { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch (e) {} };

  // —— Secciones: 3 grupos de especiales + 1 por selección ——
  const SECTIONS = useMemoBuild();
  function useMemoBuild() {
    const secs = [];
    const order = []; const map = {};
    (DATA.especiales || []).forEach((e) => { if (!map[e.seccion]) { map[e.seccion] = []; order.push(e.seccion); } map[e.seccion].push(e); });
    order.forEach((name) => secs.push({ key: 'esp:' + name, title: name, flag: null, items: map[name] }));
    (DATA.selecciones || []).forEach((s) => secs.push({ key: 'sel:' + s.code, title: s.equipo, flag: s.code, grupo: s.grupo, items: s.items }));
    return secs;
  }

  const TABS = [
    { id: 'todas', label: 'Todas' },
    { id: 'faltan', label: 'Me faltan' },
    { id: 'tengo', label: 'Tengo' },
    { id: 'repe', label: 'Repetidas' },
  ];
  const passes = (tab, count) => tab === 'todas' ? true : tab === 'faltan' ? count === 0 : tab === 'tengo' ? count >= 1 : count >= 2;

  // —— Una figurita (círculo). Memo: sólo se re-dibuja la que cambia ——
  const Circle = React.memo(function Circle({ item, count, onTap, onHold }) {
    const tmr = useRef(null); const held = useRef(false);
    const has = count >= 1; const dupes = count >= 2 ? count - 1 : 0;
    const down = () => { held.current = false; tmr.current = setTimeout(() => { held.current = true; onHold(item.n); if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} } }, 420); };
    const up = () => { if (tmr.current) { clearTimeout(tmr.current); tmr.current = null; } if (!held.current) onTap(item.n); };
    const cancel = () => { if (tmr.current) { clearTimeout(tmr.current); tmr.current = null; } held.current = true; };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 58 }}>
        <div onPointerDown={down} onPointerUp={up} onPointerLeave={cancel} onContextMenu={(e) => e.preventDefault()}
          className="mb-press" style={{
            position: 'relative', width: 46, height: 46, borderRadius: '50%', cursor: 'pointer', userSelect: 'none',
            WebkitUserSelect: 'none', touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--t-sm)',
            color: has ? '#1A1206' : 'var(--muted-2)',
            background: has ? 'linear-gradient(135deg,#E6C04A,#C99B1F)' : 'var(--surface-2)',
            border: has ? '1px solid var(--gold)' : '1px dashed var(--border-2)',
            boxShadow: has ? '0 1px 5px rgba(212,175,55,0.35)' : 'none',
          }}>
          <span className="num">{item.num}</span>
          {dupes > 0 && (
            <span className="num" style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: 'var(--info)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--surface-1)' }}>{dupes}</span>
          )}
        </div>
        <span style={{ fontSize: 8.5, lineHeight: 1.1, color: has ? 'var(--text)' : 'var(--muted-2)', textAlign: 'center', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: has ? 700 : 500 }}>{item.nombre}</span>
      </div>
    );
  });

  const FB = () => window.MBFirebase || {};

  function Album({ onBack }) {
    const user = window.MB_useAuth ? window.MB_useAuth() : (FB().currentUser && FB().currentUser());
    const [pcol, setPcol] = useState(loadCol);        // álbum personal (localStorage)
    const [me, setMe] = useState(null);               // mi usuario (groupId/groupName)
    const [team, setTeam] = useState(null);           // álbum del equipo { col, locked }
    const [source, setSource] = useState('personal'); // 'personal' | 'team'
    const [tab, setTab] = useState('todas');
    const [q, setQ] = useState('');
    const [collapsed, setCollapsed] = useState({});
    const [toast, setToast] = useState('');
    const [trading, setTrading] = useState(false); // pantalla de intercambio QR

    // Mi usuario (para saber si tengo equipo).
    useEffect(() => {
      if (!user || !FB().subscribeMe) { setMe(null); return undefined; }
      const un = FB().subscribeMe(setMe);
      return () => { if (typeof un === 'function') un(); };
    }, [user]);
    const groupId = me && me.groupId;
    const groupName = me && me.groupName;

    // Álbum del equipo + dueño (solo cuando hay equipo).
    useEffect(() => {
      if (!groupId || !FB().subscribeTeamAlbum) { setTeam(null); return undefined; }
      const un = FB().subscribeTeamAlbum(groupId, setTeam);
      return () => { if (typeof un === 'function') un(); };
    }, [groupId]);
    useEffect(() => { if (!groupId && source === 'team') setSource('personal'); }, [groupId, source]);

    const isTeam = source === 'team' && !!groupId;
    const locked = isTeam && !!(team && team.locked);
    const isLocker = locked && !!(team && user && team.lockedBy === user.uid); // yo puse el candado
    const canEdit = isTeam ? !locked : true; // bloqueado = nadie edita; solo quien lo puso lo quita
    const col = isTeam ? ((team && team.col) || {}) : pcol;

    const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1600); };
    const tap = useCallback((n) => {
      if (source === 'team') {
        if (locked) { flash('🔒 Quita el candado para editar'); return; }
        FB().albumMark(groupId, n, 1).catch((e) => flash(e === 'bloqueado' ? '🔒 Bloqueado' : 'No se pudo'));
      } else { setPcol((c) => { const nc = Object.assign({}, c); nc[n] = (nc[n] || 0) + 1; saveCol(nc); return nc; }); }
    }, [source, groupId, locked]);
    const hold = useCallback((n) => {
      if (source === 'team') {
        if (locked) { flash('🔒 Quita el candado para editar'); return; }
        FB().albumMark(groupId, n, -1).catch((e) => flash(e === 'bloqueado' ? '🔒 Bloqueado' : 'No se pudo'));
      } else { setPcol((c) => { const nc = Object.assign({}, c); const v = (nc[n] || 0) - 1; if (v <= 0) delete nc[n]; else nc[n] = v; saveCol(nc); return nc; }); }
    }, [source, groupId, locked]);
    const toggleLock = () => {
      if (!groupId) return;
      if (locked && !isLocker) { flash('🔒 Solo quien lo bloqueó puede quitarlo'); return; }
      FB().setAlbumLock(groupId, !locked).catch(() => {});
    };

    const tengo = useMemo(() => Object.keys(col).filter((k) => col[k] >= 1).length, [col]);
    const repetidas = useMemo(() => Object.keys(col).reduce((s, k) => s + Math.max(0, col[k] - 1), 0), [col]);
    const pct = TOTAL ? Math.round((tengo / TOTAL) * 100) : 0;
    const query = q.trim().toLowerCase();

    const visibleSections = useMemo(() => SECTIONS.map((sec) => {
      const items = sec.items.filter((it) => {
        if (!passes(tab, col[it.n] || 0)) return false;
        if (query) return (it.nombre || '').toLowerCase().indexOf(query) !== -1 || String(it.num).indexOf(query) !== -1 || (sec.title || '').toLowerCase().indexOf(query) !== -1;
        return true;
      });
      return { sec, items };
    }).filter((x) => x.items.length), [tab, query, col]);

    const forceOpen = tab !== 'todas' || !!query;

    // Pantalla de intercambio QR (solo álbum personal).
    const apodo = (me && me.nombre) || (user && user.displayName) || 'Amigo';
    if (trading && window.MB_FigTrade) {
      return React.createElement(window.MB_FigTrade, {
        col: pcol,
        apodo: apodo,
        onApply: (nc) => { setPcol(nc); saveCol(nc); },
        onClose: () => setTrading(false),
      });
    }

    const modal = (
      <div style={{ position: 'relative', background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--sh-1)', display: 'flex', flexDirection: 'column', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
        {/* Cabecera */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <button onClick={onBack} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontSize: 17, flexShrink: 0 }}>←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🎴 {isTeam ? ('Álbum de ' + (groupName || 'equipo')) : 'Mi álbum 2026'}</h2>
              <div style={{ fontSize: 'var(--t-3xs)', color: canEdit ? 'var(--muted-2)' : 'var(--gold-light)' }}>{canEdit ? 'Tocar = la tengo · tocar otra vez = repetida · mantener = quitar' : (isLocker ? '🔒 Bloqueado por ti · toca para quitarlo' : '🔒 Bloqueado · solo quien lo puso puede quitarlo')}</div>
            </div>
            {isTeam && (
              <button onClick={toggleLock} disabled={locked && !isLocker} className="mb-press" title={locked ? (isLocker ? 'Quitar tu candado' : 'Bloqueado por otra persona') : 'Poner candado (solo lectura)'}
                style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, fontSize: 15, cursor: (locked && !isLocker) ? 'default' : 'pointer', border: '1px solid ' + (locked ? 'var(--gold)' : 'var(--border-2)'), background: locked ? 'var(--coin-bg)' : 'var(--surface-2)', color: locked ? 'var(--gold-light)' : 'var(--muted)', opacity: (locked && !isLocker) ? 0.7 : 1 }}>{locked ? '🔒' : '🔓'}</button>
            )}
          </div>

          {/* Selector: mi álbum / álbum del equipo (solo si tengo equipo) */}
          {groupId && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[['personal', '🙋 Mi álbum'], ['team', '👥 ' + (groupName || 'Equipo')]].map((o) => {
                const active = source === o[0];
                return (
                  <button key={o[0]} onClick={() => setSource(o[0])} className="mb-press" style={{
                    flex: 1, padding: '7px 6px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontWeight: 800, fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    border: active ? '1px solid var(--gold)' : '1px solid var(--border-2)',
                    background: active ? 'var(--coin-bg)' : 'transparent', color: active ? 'var(--gold-light)' : 'var(--muted)',
                  }}>{o[1]}</button>
                );
              })}
            </div>
          )}

          {/* Progreso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg,#E6C04A,#C99B1F)', transition: 'width var(--dur-base) var(--ease-out)' }} />
            </div>
            <span className="num" style={{ fontSize: 'var(--t-2xs)', fontWeight: 800, color: 'var(--gold-light)', whiteSpace: 'nowrap' }}>{tengo}/{TOTAL} · {pct}%</span>
          </div>

          {/* Intercambiar (solo en mi álbum personal) */}
          {!isTeam && window.MB_FigTrade && (
            <button onClick={() => setTrading(true)} className="mb-press" style={{
              width: '100%', marginTop: 10, padding: '9px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)',
              border: '1px solid var(--gold)', background: 'var(--coin-bg)', color: 'var(--gold-light)',
            }}>🔄 Intercambiar figuritas</button>
          )}
        </div>

        {/* Tabs + buscador */}
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.map((t) => {
              const active = tab === t.id;
              const n = t.id === 'repe' ? repetidas : t.id === 'tengo' ? tengo : t.id === 'faltan' ? (TOTAL - tengo) : TOTAL;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="mb-press" style={{
                  flex: 1, padding: '7px 4px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontWeight: 800, fontSize: 'var(--t-3xs)', whiteSpace: 'nowrap',
                  border: active ? '1px solid var(--gold)' : '1px solid var(--border-2)',
                  background: active ? 'var(--coin-bg)' : 'transparent', color: active ? 'var(--gold-light)' : 'var(--muted)',
                }}>{t.label} <span className="num" style={{ opacity: 0.7 }}>{n}</span></button>
              );
            })}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugador o número…" style={{
            width: '100%', padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)',
            background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 'var(--t-sm)', outline: 'none',
          }} />
        </div>

        {/* Lista de secciones */}
        <div style={{ padding: '8px 12px 20px' }}>
          {visibleSections.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted-2)', padding: 40, fontSize: 'var(--t-sm)' }}>No hay figuritas en este filtro.</div>
          )}
          {visibleSections.map(({ sec, items }) => {
            const open = forceOpen || !collapsed[sec.key];
            const have = sec.items.reduce((s, it) => s + (col[it.n] >= 1 ? 1 : 0), 0);
            return (
              <div key={sec.key} style={{ marginBottom: 14 }}>
                <button onClick={() => !forceOpen && setCollapsed((c) => Object.assign({}, c, { [sec.key]: !c[sec.key] }))} className="mb-press"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 4px', background: 'none', border: 'none', cursor: forceOpen ? 'default' : 'pointer' }}>
                  {sec.flag && <img src={'https://flagcdn.com/h20/' + sec.flag + '.png'} alt="" style={{ height: 14, width: 'auto', borderRadius: 2 }} />}
                  <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-sm)', color: 'var(--text)', textAlign: 'left', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sec.title}</h3>
                  <span className="num" style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{have}/{sec.items.length}</span>
                  {!forceOpen && <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform var(--dur-base)' }}>▾</span>}
                </button>
                {open && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 2px 0' }}>
                    {items.map((it) => <Circle key={it.n} item={it} count={col[it.n] || 0} onTap={tap} onHold={hold} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {toast && (
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface-1)', border: '1px solid var(--border-2)', color: 'var(--text)', padding: '9px 16px', borderRadius: 'var(--r-pill)', fontSize: 'var(--t-2xs)', fontWeight: 700, boxShadow: 'var(--sh-3)', zIndex: 5 }}>{toast}</div>
        )}
      </div>
    );
    return modal;
  }

  // Pantalla del álbum (se enruta DENTRO del shell, conservando fondo + menú).
  window.MB_FiguritasScreen = Album;
  // Resumen para la tarjeta del Perfil (lee localStorage en vivo).
  window.MB_figuritasResumen = function () {
    const c = loadCol(); const tengo = Object.keys(c).filter((k) => c[k] >= 1).length;
    return { tengo: tengo, total: TOTAL, pct: TOTAL ? Math.round((tengo / TOTAL) * 100) : 0 };
  };
  // Navega a la pantalla del álbum (la tarjeta del Perfil llama a esto).
  window.MB_openFiguritas = function () { if (window.__mbNav) window.__mbNav('figuritas'); };
  window.MB_FiguritasLauncher = function () { return null; }; // ya no es overlay
})();
