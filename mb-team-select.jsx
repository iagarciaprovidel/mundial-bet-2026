/* ============================================================
   MundialBet Club 2026 — "Elige tu equipo" (gate de selección)
   Si el usuario está logueado pero aún no pertenece a un equipo,
   se le obliga a elegir uno: de la LISTA o pegando un CÓDIGO.
   Expone window.MB_TeamGate (se monta global en el bootstrap).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  function TeamSelectModal({ onDone }) {
    const [groups, setGroups] = useState([]);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
      const unsub = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);

    const fail = (e) => {
      const m = (e && e.message) || e;
      alert(m === 'codigo-invalido' ? 'Ese código no existe. Revísalo con quien te invitó.' : 'No se pudo unir: ' + m);
    };
    const joinById = (g) => { setBusy(true); FB().joinGroupById(g.id).then(onDone).catch(fail).finally(() => setBusy(false)); };
    const joinByCode = () => {
      const c = code.trim();
      if (!c) { alert('Escribe el código de tu equipo.'); return; }
      setBusy(true); FB().joinGroupByCode(c).then(onDone).catch(fail).finally(() => setBusy(false));
    };

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 24, width: 'min(440px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 30, marginBottom: 4 }}>👥</div>
            <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-2xl)' }}>Elige tu equipo</h2>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Únete con el código que te dieron, o elígelo de la lista.</p>
          </div>

          {/* Código */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') joinByCode(); }}
              placeholder="CÓDIGO (ej: FAMIL26)" maxLength={10}
              style={{ flex: 1, minWidth: 0, padding: '11px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.12em', fontSize: 'var(--t-md)', textAlign: 'center' }} />
            <button onClick={joinByCode} disabled={busy} className="mb-press" style={{ flexShrink: 0, padding: '11px 16px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', opacity: busy ? 0.6 : 1 }}>Unirme</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
            <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>o elige de la lista</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
          </div>

          {/* Lista de equipos */}
          {groups.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '12px 0' }}>Todavía no hay equipos creados. Pídele a tu organizador que cree uno.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groups.map(g => (
                  <button key={g.id} onClick={() => joinById(g)} disabled={busy} className="mb-press" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 18 }}>👥</span>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--t-md)' }}>{g.name}</span>
                    <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 700 }}>Unirme →</span>
                  </button>
                ))}
              </div>
            )}

          <button onClick={() => FB().signOut && FB().signOut()} style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', color: 'var(--muted-2)', fontSize: 'var(--t-2xs)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
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
    useEffect(() => {
      let alive = true;
      if (user && FB().getMyProfile) {
        FB().getMyProfile().then(p => { if (alive) setProfile(p || null); }).catch(() => { if (alive) setProfile(null); });
      } else { setProfile(undefined); }
      return () => { alive = false; };
    }, [user, refresh]);

    if (!user) return null;
    if (profile === undefined) return null;          // aún cargando perfil
    if (profile && profile.groupId) return null;     // ya tiene equipo
    return <TeamSelectModal onDone={() => setRefresh(r => r + 1)} />;
  }

  window.MB_TeamGate = TeamGate;
})();
