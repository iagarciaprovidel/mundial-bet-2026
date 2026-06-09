/* ============================================================
   MundialBet Club 2026 — "Elige tu equipo" (gate de selección)
   Si el usuario está logueado pero aún no pertenece a un equipo,
   se le obliga a elegir uno: de la LISTA o pegando un CÓDIGO.
   Expone window.MB_TeamGate (se monta global en el bootstrap).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  function TeamSelectModal({ onDone, onSkip }) {
    const [groups, setGroups] = useState([]);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
      const unsub = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);

    // Ignora equipos sin nombre (datos de prueba/incompletos): no se muestran para unirse.
    const validGroups = groups.filter(g => g && g.name && String(g.name).trim());

    const APODO_ERR = {
      'apodo-corto': 'El apodo debe tener al menos 3 caracteres.',
      'apodo-largo': 'El apodo no puede tener más de 20 caracteres.',
      'apodo-tomado': 'Ese apodo ya está en uso. Elige otro.',
      'apodo-fijo': 'Ya tienes un apodo y no se puede cambiar.',
      'nombre-vacio': 'Escribe tu nombre o apodo.',
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
    // Crear mi propio equipo (quedo como admin + miembro).
    const createTeam = () => {
      const n = ensureName(); if (!n) return;
      const teamName = window.prompt('Nombre de tu nuevo equipo:');
      if (!teamName || !teamName.trim()) return;
      const closed = window.confirm('¿El equipo será CERRADO (tú apruebas a cada uno)?\n\nAceptar = Cerrado 🔒\nCancelar = Abierto 🔓');
      setBusy(true);
      FB().setDisplayName(n).then(() => FB().createGroup(teamName.trim(), !closed)).then(() => onDone()).catch(fail).finally(() => setBusy(false));
    };
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
      </div>
    );
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

    if (!user) return null;
    if (skipped) return null;                        // entró sin equipo (esta sesión)
    if (profile === undefined) return null;          // aún cargando perfil
    // Se cierra solo cuando YA eligió su apodo Y decidió equipo (o individual).
    if (profile && profile.apodoSet && (profile.groupId || profile.noGroup)) return null;
    const skip = () => { try { sessionStorage.setItem('mb_team_skip', '1'); } catch (e) {} setSkipped(true); };
    return <TeamSelectModal onDone={() => setRefresh(r => r + 1)} onSkip={skip} />;
  }

  window.MB_TeamGate = TeamGate;
})();
