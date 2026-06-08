/* ============================================================
   MundialBet Club 2026 — Lista de equipos en el Inicio
   Muestra los equipos creados (Firestore). Resalta el tuyo y
   permite unirte (abierto) o pedir ingreso (cerrado).
   Expone window.MB_GroupsHome (se inserta en los dashboards).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  function GroupsHome() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [groups, setGroups] = useState([]);
    const [myGroupId, setMyGroupId] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
      const unsub = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);
    useEffect(() => {
      let alive = true;
      if (user && FB().getMyProfile) FB().getMyProfile().then(p => { if (alive) setMyGroupId(p && p.groupId); }).catch(() => {});
      else setMyGroupId(null);
      return () => { alive = false; };
    }, [user]);

    const join = (g) => {
      if (!user) { alert('Inicia sesión para unirte a un equipo.'); return; }
      setBusy(true);
      FB().joinGroupById(g.id).then(res => {
        if (res && res.pending) alert('✅ Solicitud enviada a "' + g.name + '". Un administrador debe aceptarte.');
        else setMyGroupId(g.id);
      }).catch(e => alert('No se pudo: ' + (e && e.message || e))).finally(() => setBusy(false));
    };

    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 10px' }}>
          <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>Equipos de apostadores</h3>
          <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{groups.length} {groups.length === 1 ? 'equipo' : 'equipos'}</span>
        </div>
        {groups.length === 0 && (
          <div style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'rgba(13,20,15,0.82)', border: '1px dashed var(--border-2)', textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>
            Aún no hay equipos de apostadores. Crea el tuyo con el botón <strong style={{ color: 'var(--gold-light)' }}>👥 Mis equipos</strong> (abajo a la derecha).
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map(g => {
            const mine = g.id === myGroupId;
            const closed = g.open === false;
            return (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: mine ? 'rgba(212,175,55,0.14)' : 'rgba(13,20,15,0.82)',
                border: mine ? '1px solid rgba(212,175,55,0.55)' : '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 18 }}>{closed ? '🔒' : '👥'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{closed ? '🔒 Cerrado' : '🔓 Abierto'}</div>
                </div>
                {mine
                  ? <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 800 }}>★ Tu equipo</span>
                  : (myGroupId ? null : (
                    <button onClick={() => join(g)} disabled={busy} className="mb-press" style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>
                      {closed ? 'Pedir' : 'Unirme'}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  window.MB_GroupsHome = GroupsHome;
})();
