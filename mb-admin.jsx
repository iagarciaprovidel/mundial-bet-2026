/* ============================================================
   MundialBet Club 2026 — "Mis equipos" (crear y administrar)
   - Cualquier persona logueada puede crear un equipo (queda como
     admin y miembro). Abierto (entran directo) o Cerrado (aprueba).
   - Varios admins por equipo (por correo). Sin código.
   Expone window.MB_AdminLauncher (botón flotante + panel).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  function GroupRow({ g, myEmail }) {
    const [members, setMembers] = useState([]);
    const [reqs, setReqs] = useState([]);
    const [adminEmail, setAdminEmail] = useState('');
    const isOpen = g.open !== false;
    const admins = g.adminEmails || [];
    useEffect(() => {
      const u1 = FB().subscribeGroupMembers ? FB().subscribeGroupMembers(g.id, setMembers) : null;
      const u2 = FB().subscribeJoinRequests ? FB().subscribeJoinRequests(g.id, setReqs) : null;
      return () => { if (typeof u1 === 'function') u1(); if (typeof u2 === 'function') u2(); };
    }, [g.id]);

    const err = (e) => alert('Error: ' + (e && e.message || e));
    const rename = () => { const v = window.prompt('Nuevo nombre del equipo:', g.name); if (v && v.trim()) FB().renameGroup(g.id, v.trim()).catch(err); };
    const del = () => { if (window.confirm('¿Eliminar el equipo "' + g.name + '"? Los miembros quedarán sin equipo.')) FB().deleteGroup(g.id).catch(err); };
    const toggleOpen = () => FB().setGroupOpen(g.id, !isOpen).catch(err);
    const approve = (r) => FB().approveRequest(r).catch(err);
    const reject = (r) => FB().rejectRequest(r.id).catch(err);
    const addAdmin = () => {
      const v = adminEmail.trim().toLowerCase();
      if (!v || v.indexOf('@') === -1) { alert('Escribe un correo válido.'); return; }
      FB().addAdmin(g.id, v).then(() => setAdminEmail('')).catch(err);
    };
    const removeAdmin = (em) => {
      if (admins.length <= 1) { alert('Debe quedar al menos un administrador.'); return; }
      FB().removeAdmin(g.id, em).catch(err);
    };

    return (
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <strong style={{ flex: 1, fontSize: 'var(--t-md)' }}>{g.name}</strong>
          <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{members.length} {members.length === 1 ? 'miembro' : 'miembros'}</span>
          <button onClick={rename} title="Renombrar" style={iconBtn}>✏️</button>
          <button onClick={del} title="Eliminar equipo" style={iconBtn}>🗑️</button>
        </div>

        <button onClick={toggleOpen} className="mb-press" title="Cambiar acceso" style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', marginBottom: 8, padding: '7px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--t-2xs)', textAlign: 'left' }}>
          <span style={{ fontSize: 14 }}>{isOpen ? '🔓' : '🔒'}</span>
          <span style={{ flex: 1, fontWeight: 700 }}>{isOpen ? 'Abierto' : 'Cerrado'}</span>
          <span style={{ color: 'var(--muted-2)' }}>{isOpen ? 'cualquiera entra directo' : 'apruebas a cada uno'}</span>
          <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>cambiar</span>
        </button>

        {/* Solicitudes pendientes */}
        {reqs.length > 0 && (
          <div style={{ marginBottom: 8, padding: '8px 10px', background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Solicitudes de ingreso ({reqs.length})</div>
            {reqs.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <span style={{ flex: 1, fontSize: 'var(--t-2xs)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre || 'Jugador'}</span>
                <button onClick={() => approve(r)} className="mb-press" style={{ border: 'none', borderRadius: 'var(--r-pill)', padding: '5px 10px', background: 'var(--success)', color: '#04210f', fontWeight: 800, fontSize: 'var(--t-3xs)', cursor: 'pointer' }}>✓ Aceptar</button>
                <button onClick={() => reject(r)} className="mb-press" style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-pill)', padding: '5px 9px', background: 'none', color: 'var(--danger)', fontWeight: 700, fontSize: 'var(--t-3xs)', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Administradores del equipo */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', fontWeight: 700, marginBottom: 5 }}>Administradores</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {admins.map(em => (
              <span key={em} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--t-2xs)', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '3px 6px 3px 10px' }}>
                {em === (myEmail || '').toLowerCase() ? '⭐ ' : ''}{em}
                {admins.length > 1 && <button onClick={() => removeAdmin(em)} title="Quitar admin" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addAdmin(); }} type="email" placeholder="correo para hacer admin" style={inp} />
            <button onClick={addAdmin} className="mb-press" style={addBtn}>＋ Admin</button>
          </div>
        </div>

        {/* Miembros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {members.length === 0
            ? <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>Aún nadie se ha unido. Comparte el nombre del equipo.</span>
            : members.map((m, i) => (
              <span key={i} style={{ fontSize: 'var(--t-2xs)', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '3px 10px' }}>{m.nombre || 'Jugador'}</span>
            ))}
        </div>
      </div>
    );
  }

  function AdminGroupsPanel({ onClose, user }) {
    const [groups, setGroups] = useState([]);
    const [name, setName] = useState('');
    const [closed, setClosed] = useState(false);
    const myEmail = (user && user.email) ? user.email.toLowerCase() : '';
    useEffect(() => {
      const unsub = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);
    const mine = groups.filter(g => (g.adminEmails || []).indexOf(myEmail) !== -1);
    const create = () => {
      const v = name.trim(); if (!v) return;
      FB().createGroup(v, !closed).then(() => setName('')).catch(e => alert('Error: ' + (e && e.message || e)));
    };
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(6,8,15,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 22, width: 'min(560px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>👥</span>
            <div style={{ flex: 1 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-xl)' }}>Mis equipos</h2>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Crea un equipo y administra los tuyos.</div>
            </div>
            <button onClick={onClose} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>

          {/* Crear equipo */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create(); }} placeholder="Nombre del equipo (ej: Familia García)" style={inp} />
              <button onClick={create} className="mb-press" style={{ ...addBtn, background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontWeight: 800 }}>＋ Crear</button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--t-2xs)', color: 'var(--muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} />
              🔒 Cerrado (apruebas a cada uno). Si lo dejas sin marcar, queda 🔓 abierto.
            </label>
          </div>

          {mine.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '16px 0' }}>Aún no administras equipos. Crea el primero arriba. 👆</div>
            : mine.map(g => <GroupRow key={g.id} g={g} myEmail={myEmail} />)}
        </div>
      </div>
    );
  }

  function AdminLauncher() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [open, setOpen] = useState(false);
    if (!user) return null;
    return (
      <React.Fragment>
        <button onClick={() => setOpen(true)} className="mb-press" title="Crear / administrar equipos"
          style={{ position: 'fixed', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom,0px))', zIndex: 950, display: 'flex', alignItems: 'center', gap: 7, padding: '11px 16px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(212,175,55,0.6)', background: 'rgba(13,20,15,0.95)', color: 'var(--gold-light)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', boxShadow: '0 6px 22px rgba(0,0,0,0.55)' }}>
          👥 Mis equipos
        </button>
        {open && <AdminGroupsPanel onClose={() => setOpen(false)} user={user} />}
      </React.Fragment>
    );
  }

  const inp = { flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 'var(--t-sm)' };
  const addBtn = { flexShrink: 0, padding: '9px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)' };
  const iconBtn = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-1)', cursor: 'pointer', fontSize: 13 };

  window.MB_AdminGroups = AdminGroupsPanel;
  window.MB_AdminLauncher = AdminLauncher;
})();
