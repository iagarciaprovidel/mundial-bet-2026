/* ============================================================
   MundialBet Club 2026 — "Equipos de apostadores" en el Inicio
   Lista TODOS los equipos con su cantidad de jugadores. Al tocar
   un equipo, muestra sus jugadores (solo el apodo). Datos reales
   de Firestore. Expone window.MB_GroupsHome.
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};
  function initials(name) {
    const p = String(name || '').trim().split(/\s+/);
    return (((p[0] || '')[0] || '?') + ((p[1] || '')[0] || '')).toUpperCase();
  }

  function MembersModal({ group, members, onClose }) {
    const closed = group.open === false;
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(6,8,15,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 22, width: 'min(420px, 94vw)', maxHeight: '85vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>{closed ? '🔒' : '👥'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-xl)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</h2>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{members.length} {members.length === 1 ? 'jugador' : 'jugadores'} · {closed ? 'Cerrado' : 'Abierto'}</div>
            </div>
            <button onClick={onClose} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>
          {members.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '16px 0' }}>Aún no hay jugadores en este equipo.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {members.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', flexShrink: 0 }}>{initials(m.nombre)}</span>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.nombre || 'Jugador'}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    );
  }

  function GroupsHome() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [profile, setProfile] = useState(null);
    const [openGroup, setOpenGroup] = useState(null);

    useEffect(() => {
      const u1 = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof u1 === 'function') u1(); };
    }, []);
    useEffect(() => {
      if (!user) return undefined;
      const u2 = FB().subscribeUsers ? FB().subscribeUsers(setUsers) : null;
      return () => { if (typeof u2 === 'function') u2(); };
    }, [user]);
    useEffect(() => {
      let alive = true;
      if (user && FB().getMyProfile) FB().getMyProfile().then(p => { if (alive) setProfile(p || null); }).catch(() => {});
      else setProfile(null);
      return () => { alive = false; };
    }, [user]);

    if (!user) return null;
    const myId = profile && profile.groupId;
    const countByGroup = {};
    users.forEach(u => { if (u.groupId) countByGroup[u.groupId] = (countByGroup[u.groupId] || 0) + 1; });
    const membersOf = (gid) => users.filter(u => u.groupId === gid);

    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 10px' }}>
          <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>Equipos de apostadores</h3>
          <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{groups.length} {groups.length === 1 ? 'equipo' : 'equipos'}</span>
        </div>
        {groups.length === 0
          ? <div style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'rgba(13,20,15,0.82)', border: '1px dashed var(--border-2)', textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>Aún no hay equipos. Crea el tuyo con <strong style={{ color: 'var(--gold-light)' }}>👥 Mis equipos</strong> (abajo a la derecha).</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
              {groups.map(g => {
                const mine = g.id === myId;
                const closed = g.open === false;
                const n = countByGroup[g.id] || 0;
                return (
                  <button key={g.id} onClick={() => setOpenGroup(g)} className="mb-press" title={`Ver jugadores de ${g.name}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
                    background: 'rgba(11,17,13,0.95)',
                    border: mine ? '1.5px solid rgba(212,175,55,0.7)' : '1px solid var(--border)',
                    boxShadow: mine ? '0 0 0 1px rgba(212,175,55,0.2)' : 'var(--sh-1)',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{closed ? '🔒' : '👥'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}{mine && <span style={{ color: 'var(--gold-light)', fontSize: 'var(--t-3xs)', marginLeft: 6 }}>★</span>}</div>
                      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{n} {n === 1 ? 'jugador' : 'jugadores'} · {closed ? '🔒 Cerrado' : '🔓 Abierto'}</div>
                    </div>
                    <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 700, flexShrink: 0 }}>Ver →</span>
                  </button>
                );
              })}
            </div>
          )}
        {openGroup && ReactDOM.createPortal(<MembersModal group={openGroup} members={membersOf(openGroup.id)} onClose={() => setOpenGroup(null)} />, document.body)}
      </div>
    );
  }

  window.MB_GroupsHome = GroupsHome;
})();
