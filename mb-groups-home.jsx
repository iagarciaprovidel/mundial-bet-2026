/* ============================================================
   MundialBet Club 2026 — "Tu equipo" en el Inicio
   Muestra SOLO el equipo al que pertenece el usuario (o un aviso
   para unirse/crear si aún no tiene). Datos reales de Firestore.
   Expone window.MB_GroupsHome (se inserta en los dashboards).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  function GroupsHome() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [groups, setGroups] = useState([]);
    const [profile, setProfile] = useState(undefined);

    useEffect(() => {
      const unsub = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);
    useEffect(() => {
      let alive = true;
      if (user && FB().getMyProfile) FB().getMyProfile().then(p => { if (alive) setProfile(p || null); }).catch(() => { if (alive) setProfile(null); });
      else setProfile(null);
      return () => { alive = false; };
    }, [user]);

    if (!user) return null;
    const myId = profile && profile.groupId;
    const myGroup = myId ? groups.find(g => g.id === myId) : null;

    const header = (
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 10px' }}>
        <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>Tu equipo</h3>
        {window.MB_AdminLauncher && <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>Gestiona en 👥 Mis equipos</span>}
      </div>
    );

    let body;
    if (myGroup) {
      const closed = myGroup.open === false;
      body = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.55)' }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>{closed ? '🔒' : '👥'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--t-md)', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myGroup.name}</div>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{closed ? '🔒 Cerrado' : '🔓 Abierto'}</div>
          </div>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 800, flexShrink: 0 }}>★ Tu equipo</span>
        </div>
      );
    } else if (profile && profile.noGroup) {
      body = <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'rgba(13,20,15,0.82)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>🙋 Juegas de forma <strong style={{ color: 'var(--text)' }}>individual</strong> (sin equipo).</div>;
    } else if (profile === undefined) {
      return null;
    } else {
      body = <div style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'rgba(13,20,15,0.82)', border: '1px dashed var(--border-2)', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>Aún no perteneces a un equipo. Únete o crea el tuyo con <strong style={{ color: 'var(--gold-light)' }}>👥 Mis equipos</strong> (abajo a la derecha).</div>;
    }

    return <div style={{ marginTop: 4 }}>{header}{body}</div>;
  }

  window.MB_GroupsHome = GroupsHome;
})();
