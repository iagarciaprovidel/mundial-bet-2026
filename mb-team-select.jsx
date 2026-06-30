/* ============================================================
   MundialBet Club 2026 — "Elige tu equipo" (gate de selección)
   Si el usuario está logueado pero aún no pertenece a un equipo,
   se le obliga a elegir uno: de la LISTA o pegando un CÓDIGO.
   Expone window.MB_TeamGate (se monta global en el bootstrap).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  // Captura el equipo de un enlace de invitación (?join=<id>) y lo recuerda
  // mientras dura la sesión (sobrevive al login por correo). Limpia la URL.
  (function () {
    try {
      var jm = (location.search.match(/[?&]join=([^&#]+)/) || [])[1];
      if (jm) {
        sessionStorage.setItem('mb_pending_join', decodeURIComponent(jm));
        var clean = location.pathname + location.search.replace(/([?&])join=[^&#]*(&|$)/, '$1').replace(/[?&]$/, '');
        history.replaceState(null, '', clean || location.pathname);
      }
    } catch (e) {}
  })();
  const getPendingJoin = () => { try { return sessionStorage.getItem('mb_pending_join') || null; } catch (e) { return null; } };
  const clearPendingJoin = () => { try { sessionStorage.removeItem('mb_pending_join'); } catch (e) {} };

  // Modal propio para nombrar el grupo (reemplaza el window.prompt). onCreate(nombre, abierto).
  function GroupNameModal({ onClose, onCreate }) {
    const [gname, setGname] = useState('');
    const [open, setOpen] = useState(true);
    const [busy, setBusy] = useState(false);
    const submit = () => {
      const v = gname.trim();
      if (v.length < 3) { alert('El nombre del grupo debe tener al menos 3 caracteres.'); return; }
      setBusy(true);
      Promise.resolve(onCreate(v, open)).catch(() => {}).finally(() => setBusy(false));
    };
    return ReactDOM.createPortal(
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 22, width: 'min(400px, 94vw)', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <h2 className="display" style={{ margin: 0, flex: 1, fontSize: 'var(--t-xl)' }}>Crea tu grupo</h2>
            <button onClick={onClose} className="mb-press" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <label style={{ display: 'block', fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, marginBottom: 5 }}>Nombre del grupo (familia, curso, amigos…)</label>
          <input value={gname} onChange={e => setGname(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} maxLength={24} autoFocus placeholder="ej: 8°B, Los Cracks…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 'var(--t-md)', fontWeight: 700 }} />
          <div style={{ fontSize: 9, color: 'var(--muted-2)', margin: '4px 0 16px', textAlign: 'right' }}><span className="num">{gname.trim().length}/24</span></div>
          <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>¿Quién puede entrar?</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {[[true, '🔓 Abierto', 'Cualquiera entra'], [false, '🔒 Cerrado', 'Tú apruebas']].map(([val, t, d]) => (
              <button key={String(val)} onClick={() => setOpen(val)} className="mb-press" style={{ flex: 1, padding: '10px 8px', borderRadius: 'var(--r-md)', cursor: 'pointer', background: open === val ? 'var(--coin-bg)' : 'var(--surface-2)', border: open === val ? '1.5px solid var(--gold)' : '1px solid var(--border-2)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--t-2xs)' }}>{t}</div>
                <div style={{ fontSize: 9, color: 'var(--muted-2)', marginTop: 2 }}>{d}</div>
              </button>
            ))}
          </div>
          <button onClick={submit} disabled={busy} className="mb-press" style={{ width: '100%', padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', opacity: busy ? 0.6 : 1 }}>{busy ? 'Creando…' : '➕ Crear grupo'}</button>
        </div>
      </div>, document.body);
  }

  function TeamSelectModal({ onDone, onSkip }) {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    // Paso 0: confirma que el registro/login YA se completó (con qué cuenta entró
    // y el regalo de 90.000), antes de pedir apodo. Sin esto, alguien con sesión
    // restaurada de otra visita ve el formulario de apodo "de la nada", sin saber
    // que ya está adentro. Una vez confirmado en esta sesión, no se repite.
    const [confirmed, setConfirmed] = useState(false);
    const [groups, setGroups] = useState([]);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [naming, setNaming] = useState(false);

    useEffect(() => {
      const unsub = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);

    if (!confirmed) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--gold)', borderRadius: 'var(--r-2xl)', padding: 26, width: 'min(400px, 94vw)', boxShadow: 'var(--sh-4)', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <h2 className="display" style={{ margin: '0 0 6px', fontSize: 'var(--t-2xl)' }}>¡Ya estás dentro!</h2>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '10px 0 14px' }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  : <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</span>}
                <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{user.email || user.displayName || 'tu cuenta'}</span>
              </div>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderRadius: 'var(--r-pill)', background: 'var(--coin-bg)', border: '1px solid var(--gold)', marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🎁</span>
              <span className="num" style={{ fontSize: 'var(--t-lg)', fontWeight: 800, color: 'var(--gold-light)' }}>90.000 puntos</span>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: 'var(--t-2xs)', color: 'var(--muted)', lineHeight: 1.5 }}>Tu cuenta y tus puntos ya están guardados. Ahora elige tu apodo para que te reconozcan en el ranking.</p>
            <button onClick={() => setConfirmed(true)} className="mb-press" style={{ width: '100%', padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)' }}>
              Elegir mi apodo →
            </button>
          </div>
        </div>
      );
    }

    // Ignora equipos sin nombre (datos de prueba/incompletos): no se muestran para unirse.
    const validGroups = groups.filter(g => g && g.name && String(g.name).trim());

    const APODO_ERR = {
      'apodo-corto': 'El apodo debe tener al menos 3 caracteres.',
      'apodo-largo': 'El apodo no puede tener más de 20 caracteres.',
      'apodo-tomado': 'Ese apodo ya está en uso. Elige otro.',
      'apodo-fijo': 'Ya tienes un apodo y no se puede cambiar.',
      'nombre-vacio': 'Escribe tu nombre o apodo.',
      'ya-tienes-equipo': 'Ya creaste un equipo. Solo puedes tener uno.',
      'nombre-equipo-tomado': 'Ya existe un equipo con ese nombre. Elige otro.',
      'nombre-equipo-corto': 'El nombre del equipo debe tener al menos 3 caracteres.',
    };
    const fail = (e) => { const c = (e && e.message) || e; alert(APODO_ERR[c] || ('No se pudo: ' + c)); };
    const ensureName = () => {
      const n = name.trim();
      if (n.length < 3) { alert('Escribe tu nombre o apodo (mínimo 3 caracteres).'); return null; }
      if (n.length > 20) { alert('El apodo no puede tener más de 20 caracteres.'); return null; }
      return n;
    };
    const onJoined = (res) => {
      if (res && res.pending) {
        alert('✅ Solicitud enviada a "' + res.name + '". Es un equipo cerrado: un administrador debe aceptarte. Por ahora entras, y cuando te acepten aparecerás en el equipo.');
        onSkip();
      } else { onDone(); }
    };
    const joinById = (g) => {
      const n = ensureName(); if (!n) return;
      setBusy(true);
      FB().setDisplayName(n).then(() => FB().joinGroupById(g.id)).then(onJoined).catch(fail).finally(() => setBusy(false));
    };
    // Crear mi propio equipo (quedo como admin + miembro). Abre el modal de nombre.
    const createTeam = () => { if (!ensureName()) return; setNaming(true); };
    // Jugar sin equipo (individual). Si no se puede guardar (reglas), entra igual esta sesión.
    const playSolo = () => {
      const n = ensureName(); if (!n) return;
      setBusy(true);
      FB().setDisplayName(n).then(() => FB().chooseNoGroup()).then(onDone)
        .catch(() => { onSkip(); })
        .finally(() => setBusy(false));
    };

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 24, width: 'min(440px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 30, marginBottom: 4 }}>👋</div>
            <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-2xl)' }}>¡Bienvenido!</h2>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Elige tu nombre y únete a tu equipo.</p>
          </div>

          {/* Nombre / apodo */}
          <label style={{ display: 'block', fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, marginBottom: 5 }}>Tu nombre o apodo (como te verán los demás)</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="ej: Sergio, El Profeta…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', marginBottom: 4, borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 'var(--t-md)', fontWeight: 700 }} />
          <div style={{ fontSize: 9, color: 'var(--muted-2)', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}><span>⚠️ 3 a 20 caracteres · único · no se podrá cambiar</span><span className="num">{name.trim().length}/20</span></div>

          {/* Lista de equipos (solo equipos con nombre válido) */}
          {validGroups.length > 0 && (
            <>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>Únete a un equipo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {validGroups.map(g => {
                  const closed = g.open === false;
                  return (
                    <button key={g.id} onClick={() => joinById(g)} disabled={busy} className="mb-press" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 16 }}>{closed ? '🔒' : '👥'}</span>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--t-md)' }}>{g.name}</span>
                      <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 700 }}>{closed ? 'Pedir unirme →' : 'Unirme →'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button onClick={createTeam} disabled={busy} className="mb-press" style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)' }}>
            ➕ Crear un equipo nuevo
          </button>
          <button onClick={playSolo} disabled={busy} className="mb-press" style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)' }}>
            🙋 Jugar sin equipo (individual)
          </button>
          <button onClick={() => FB().signOut && FB().signOut()} style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: 'var(--muted-2)', fontSize: 'var(--t-2xs)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cerrar sesión
          </button>
        </div>
        {naming && <GroupNameModal onClose={() => setNaming(false)}
          onCreate={(gn, open) => FB().setDisplayName(name.trim()).then(() => FB().createGroup(gn, open)).then(() => { setNaming(false); onDone(); }).catch(fail)} />}
      </div>
    );
  }

  // ── Selector de equipo reutilizable (unirse / cambiar / crear / individual) ──
  // Se abre desde cualquier parte con window.MB_openTeamPicker(). NO pide apodo
  // (eso ya se eligió). Sirve para que un "individual" se pase a un equipo.
  function TeamPicker({ onClose }) {
    const [groups, setGroups] = useState([]);
    const [profile, setProfile] = useState(null);
    const [owns, setOwns] = useState(false);
    const [busy, setBusy] = useState(false);
    const [naming, setNaming] = useState(false);
    useEffect(() => { const u = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null; return () => { if (typeof u === 'function') u(); }; }, []);
    const refresh = () => { if (FB().getMyProfile) FB().getMyProfile().then(p => setProfile(p || null)).catch(() => {}); if (FB().ownsGroup) FB().ownsGroup().then(setOwns).catch(() => {}); };
    useEffect(() => { refresh(); }, []);

    const valid = groups.filter(g => g && g.name && String(g.name).trim());
    const myGid = profile && profile.groupId;
    const ERR = {
      'ya-tienes-equipo': 'Ya creaste un equipo. Solo puedes tener uno.',
      'nombre-equipo-tomado': 'Ya existe un equipo con ese nombre. Elige otro.',
      'nombre-equipo-corto': 'El nombre del equipo debe tener al menos 3 caracteres.',
    };
    const fail = (e) => { const c = (e && e.message) || e; alert(ERR[c] || ('No se pudo: ' + c)); };
    const join = (g) => {
      if (g.id === myGid) return;
      setBusy(true);
      FB().joinGroupById(g.id).then(res => {
        if (res && res.pending) alert('✅ Solicitud enviada a "' + res.name + '". Es un equipo cerrado: un administrador debe aceptarte.');
        onClose();
      }).catch(fail).finally(() => setBusy(false));
    };
    const create = () => setNaming(true);
    const solo = () => { setBusy(true); FB().chooseNoGroup().then(() => onClose()).catch(fail).finally(() => setBusy(false)); };

    const modal = (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 24, width: 'min(440px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>👥</span>
            <div style={{ flex: 1 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-xl)' }}>Tu equipo</h2>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{profile && profile.groupName ? 'Actual: ' + profile.groupName : (profile && profile.noGroup ? 'Juegas individual' : 'Sin equipo')}</div>
            </div>
            <button onClick={onClose} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>

          {valid.length > 0 && (
            <>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>Únete a un equipo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {valid.map(g => {
                  const closed = g.open === false, mine = g.id === myGid;
                  return (
                    <button key={g.id} onClick={() => join(g)} disabled={busy || mine} className="mb-press" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', border: mine ? '1px solid var(--gold)' : '1px solid var(--border-2)', background: mine ? 'rgba(212,175,55,0.12)' : 'var(--surface-2)', color: 'var(--text)', cursor: mine ? 'default' : 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 16 }}>{closed ? '🔒' : '👥'}</span>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--t-md)' }}>{g.name}</span>
                      <span style={{ fontSize: 'var(--t-2xs)', color: mine ? 'var(--gold-light)' : 'var(--gold-light)', fontWeight: 700 }}>{mine ? '★ tu equipo' : (closed ? 'Pedir unirme →' : 'Unirme →')}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button onClick={create} disabled={busy || owns} title={owns ? 'Ya creaste un equipo' : ''} className="mb-press" style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: owns ? 'not-allowed' : 'pointer', opacity: owns ? 0.5 : 1, background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)' }}>
            ➕ Crear un equipo nuevo
          </button>
          {owns && <div style={{ fontSize: 9, color: 'var(--muted-2)', textAlign: 'center', marginTop: 4 }}>Solo puedes tener un equipo propio.</div>}
          {!(profile && profile.noGroup) && (
            <button onClick={solo} disabled={busy} className="mb-press" style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)' }}>
              🙋 Jugar sin equipo (individual)
            </button>
          )}
        </div>
      </div>
    );
    return (
      <React.Fragment>
        {ReactDOM.createPortal(modal, document.body)}
        {naming && <GroupNameModal onClose={() => setNaming(false)}
          onCreate={(gn, open) => FB().createGroup(gn, open).then(() => { setNaming(false); onClose(); }).catch(fail)} />}
      </React.Fragment>
    );
  }

  function TeamPickerLauncher() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
      const on = () => setOpen(true);
      window.addEventListener('mb-open-teampicker', on);
      return () => window.removeEventListener('mb-open-teampicker', on);
    }, []);
    return open ? <TeamPicker onClose={() => setOpen(false)} /> : null;
  }
  // Abrir el selector desde cualquier parte (perfil, inicio, etc.).
  window.MB_openTeamPicker = function () { try { window.dispatchEvent(new Event('mb-open-teampicker')); } catch (e) {} };

  // Si hay una invitación pendiente (?join=...), ofrece unirse a ese equipo.
  function JoinInviteHandler() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [profile, setProfile] = useState(undefined);
    const [groups, setGroups] = useState([]);
    const [pending, setPending] = useState(getPendingJoin());
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      if (!user) return undefined;
      const un = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof un === 'function') un(); };
    }, [user]);
    useEffect(() => {
      let alive = true;
      if (user && FB().getMyProfile) FB().getMyProfile().then(p => { if (alive) setProfile(p || null); }).catch(() => { if (alive) setProfile(null); });
      else setProfile(undefined);
      return () => { alive = false; };
    }, [user]);

    if (!user || !pending) return null;
    if (profile === undefined) return null;
    if (!(profile && profile.apodoSet)) return null;          // primero el apodo (lo pide el gate)
    const done = () => { clearPendingJoin(); setPending(null); };
    if (profile.groupId === pending) { done(); return null; } // ya está en ese equipo
    const g = groups.find(x => x.id === pending);
    if (groups.length && !g) { done(); return null; }         // el equipo ya no existe
    if (!g) return null;                                       // aún cargando

    const closed = g.open === false;
    const accept = () => {
      setBusy(true);
      FB().joinGroupById(pending).then(res => {
        if (res && res.pending) alert('✅ Solicitud enviada a "' + (res.name || g.name) + '". Es un equipo cerrado: un administrador debe aceptarte.');
        done();
      }).catch(e => alert('No se pudo unir: ' + ((e && e.message) || e))).finally(() => setBusy(false));
    };
    return ReactDOM.createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 24, width: 'min(400px, 94vw)', boxShadow: 'var(--sh-4)', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>Te invitaron al equipo</div>
          <h2 className="display" style={{ margin: '2px 0 6px', fontSize: 'var(--t-2xl)' }}>{g.name}</h2>
          <p style={{ margin: '0 0 18px', fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>{closed ? 'Es un equipo cerrado: enviaremos tu solicitud para que un admin te acepte.' : '¿Quieres unirte a este equipo?'}</p>
          <button onClick={accept} disabled={busy} className="mb-press" style={{ width: '100%', padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)' }}>👥 {closed ? 'Pedir unirme' : 'Unirme'}</button>
          <button onClick={done} disabled={busy} className="mb-press" style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)' }}>Ahora no</button>
        </div>
      </div>, document.body);
  }

  function TeamGate() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [profile, setProfile] = useState(undefined); // undefined = cargando
    const [refresh, setRefresh] = useState(0);
    const [skipped, setSkipped] = useState(function () { try { return sessionStorage.getItem('mb_team_skip') === '1'; } catch (e) { return false; } });
    useEffect(() => {
      let alive = true;
      if (user && FB().getMyProfile) {
        FB().getMyProfile().then(p => { if (alive) setProfile(p || null); }).catch(() => { if (alive) setProfile(null); });
      } else { setProfile(undefined); }
      return () => { alive = false; };
    }, [user, refresh]);

    const skip = () => { try { sessionStorage.setItem('mb_team_skip', '1'); } catch (e) {} setSkipped(true); };
    // El gate (bienvenida) solo aparece si falta apodo o decisión de equipo.
    let gate = null;
    if (user && !skipped && profile !== undefined && !(profile && profile.apodoSet && (profile.groupId || profile.noGroup))) {
      gate = <TeamSelectModal onDone={() => setRefresh(r => r + 1)} onSkip={skip} />;
    }
    // El launcher (selector reutilizable) y el handler de invitación siempre montados si hay sesión.
    return <React.Fragment>{gate}{user ? <TeamPickerLauncher /> : null}{user ? <JoinInviteHandler /> : null}</React.Fragment>;
  }

  window.MB_TeamGate = TeamGate;
})();
