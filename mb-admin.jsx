/* ============================================================
   MundialBet Club 2026 — Panel de ADMIN de grupos (solo admin)
   - Crear grupos (Familia, Amigos, etc.)
   - Agregar/quitar correos a cada grupo
   Cuando una persona inicia sesión con un correo que está en un
   grupo, queda asignada a ese grupo automáticamente (mb-firebase).
   Solo se muestra a los correos de window.MB_ADMIN_EMAILS.
   Expone window.MB_AdminLauncher (botón flotante + panel).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  // ── Fila de un equipo ─────────────────────────────────────
  function GroupRow({ g }) {
    const [members, setMembers] = useState([]);
    const [reqs, setReqs] = useState([]);
    const [copied, setCopied] = useState(false);
    const isOpen = g.open !== false;
    useEffect(() => {
      const u1 = FB().subscribeGroupMembers ? FB().subscribeGroupMembers(g.id, setMembers) : null;
      const u2 = FB().subscribeJoinRequests ? FB().subscribeJoinRequests(g.id, setReqs) : null;
      return () => { if (typeof u1 === 'function') u1(); if (typeof u2 === 'function') u2(); };
    }, [g.id]);

    const copy = () => {
      try { if (navigator.clipboard) navigator.clipboard.writeText(g.code || ''); } catch (e) {}
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    };
    const rename = () => {
      const v = window.prompt('Nuevo nombre del equipo:', g.name);
      if (v && v.trim()) FB().renameGroup(g.id, v.trim()).catch(e => alert('Error: ' + (e && e.message || e)));
    };
    const del = () => {
      if (window.confirm('¿Eliminar el equipo "' + g.name + '"? Los usuarios quedarán sin equipo.')) {
        FB().deleteGroup(g.id).catch(e => alert('Error: ' + (e && e.message || e)));
      }
    };
    const toggleOpen = () => FB().setGroupOpen(g.id, !isOpen).catch(e => alert('Error: ' + (e && e.message || e)));
    const approve = (r) => FB().approveRequest(r).catch(e => alert('Error: ' + (e && e.message || e)));
    const reject = (r) => FB().rejectRequest(r.id).catch(e => alert('Error: ' + (e && e.message || e)));

    return (
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <strong style={{ flex: 1, fontSize: 'var(--t-md)' }}>{g.name}</strong>
          <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{members.length} {members.length === 1 ? 'miembro' : 'miembros'}</span>
          <button onClick={rename} title="Renombrar" style={iconBtn}>✏️</button>
          <button onClick={del} title="Eliminar equipo" style={iconBtn}>🗑️</button>
        </div>

        {/* Abierto / Cerrado */}
        <button onClick={toggleOpen} className="mb-press" title="Cambiar acceso" style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', marginBottom: 8, padding: '7px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--t-2xs)', textAlign: 'left' }}>
          <span style={{ fontSize: 14 }}>{isOpen ? '🔓' : '🔒'}</span>
          <span style={{ flex: 1, fontWeight: 700 }}>{isOpen ? 'Abierto' : 'Cerrado'}</span>
          <span style={{ color: 'var(--muted-2)' }}>{isOpen ? 'cualquiera entra directo' : 'tú apruebas a cada uno'}</span>
          <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>cambiar</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', background: 'var(--surface-1)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Código:</span>
          <code className="mono" style={{ flex: 1, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--gold-light)', fontSize: 'var(--t-md)' }}>{g.code || '—'}</code>
          <button onClick={copy} className="mb-press" style={{ ...addBtn, padding: '6px 12px', color: copied ? 'var(--success)' : 'var(--text)' }}>{copied ? '✓ Copiado' : '📋 Copiar'}</button>
        </div>

        {/* Solicitudes pendientes (equipos cerrados) */}
        {reqs.length > 0 && (
          <div style={{ marginBottom: 8, padding: '8px 10px', background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Solicitudes de ingreso ({reqs.length})</div>
            {reqs.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <span style={{ flex: 1, fontSize: 'var(--t-2xs)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre || r.email || 'Jugador'}{r.email ? <span style={{ color: 'var(--muted-2)' }}> · {r.email}</span> : null}</span>
                <button onClick={() => approve(r)} className="mb-press" title="Aceptar" style={{ border: 'none', borderRadius: 'var(--r-pill)', padding: '5px 10px', background: 'var(--success)', color: '#04210f', fontWeight: 800, fontSize: 'var(--t-3xs)', cursor: 'pointer' }}>✓ Aceptar</button>
                <button onClick={() => reject(r)} className="mb-press" title="Rechazar" style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-pill)', padding: '5px 9px', background: 'none', color: 'var(--danger)', fontWeight: 700, fontSize: 'var(--t-3xs)', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {members.length === 0
            ? <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>Aún nadie se ha unido. Comparte el código de arriba.</span>
            : members.map((m, i) => (
              <span key={i} style={{ fontSize: 'var(--t-2xs)', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '3px 10px' }}>
                {m.nombre || m.email || 'Jugador'}
              </span>
            ))}
        </div>
      </div>
    );
  }

  // ── Panel ─────────────────────────────────────────────────
  function AdminGroupsPanel({ onClose }) {
    const [groups, setGroups] = useState([]);
    const [name, setName] = useState('');
    useEffect(() => {
      const unsub = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);
    const create = () => {
      const v = name.trim();
      if (!v) return;
      FB().createGroup(v).then(() => setName('')).catch(e => alert('Error: ' + (e && e.message || e)));
    };
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(6,8,15,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 22, width: 'min(560px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>🔐</span>
            <div style={{ flex: 1 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-xl)' }}>Admin · Equipos</h2>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Crea equipos y comparte su código. La gente se une sola.</div>
            </div>
            <button onClick={onClose} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create(); }}
              placeholder="Nombre del grupo (ej: Familia García, Amigos del barrio)" style={inp} />
            <button onClick={create} className="mb-press" style={{ ...addBtn, background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontWeight: 800 }}>＋ Crear grupo</button>
          </div>

          {groups.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '20px 0' }}>Aún no hay equipos. Crea el primero arriba.</div>
            : groups.map(g => <GroupRow key={g.id} g={g} />)}

          <div style={{ marginTop: 12, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', lineHeight: 1.5 }}>
            ℹ️ Cada equipo tiene un código único. Las personas entran con su correo y se unen eligiendo el equipo de la lista o pegando su código.
          </div>
        </div>
      </div>
    );
  }

  // ── Botón flotante (solo admin) ───────────────────────────
  function AdminLauncher() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [open, setOpen] = useState(false);
    const isAdmin = !!(user && FB().isAdmin && FB().isAdmin(user));
    if (!isAdmin) return null;
    return (
      <React.Fragment>
        <button onClick={() => setOpen(true)} className="mb-press" title="Panel de admin (grupos)"
          style={{ position: 'fixed', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom,0px))', zIndex: 950, display: 'flex', alignItems: 'center', gap: 7, padding: '11px 16px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(212,175,55,0.6)', background: 'rgba(13,20,15,0.95)', color: 'var(--gold-light)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', boxShadow: '0 6px 22px rgba(0,0,0,0.55)' }}>
          🔐 Admin
        </button>
        {open && <AdminGroupsPanel onClose={() => setOpen(false)} />}
      </React.Fragment>
    );
  }

  const inp = { flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 'var(--t-sm)' };
  const addBtn = { flexShrink: 0, padding: '9px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)' };
  const iconBtn = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-1)', cursor: 'pointer', fontSize: 13 };

  window.MB_AdminGroups = AdminGroupsPanel;
  window.MB_AdminLauncher = AdminLauncher;
})();
