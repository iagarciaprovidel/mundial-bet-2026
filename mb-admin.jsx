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

  // ── Fila de un grupo ──────────────────────────────────────
  function GroupRow({ g }) {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const emails = g.emails || [];

    const add = () => {
      const v = email.trim().toLowerCase();
      if (!v || v.indexOf('@') === -1) { alert('Escribe un correo válido.'); return; }
      setBusy(true);
      FB().addEmailToGroup(g.id, v).then(() => setEmail('')).catch(e => alert('Error: ' + (e && e.message || e))).finally(() => setBusy(false));
    };
    const rm = (m) => FB().removeEmailFromGroup(g.id, m).catch(e => alert('Error: ' + (e && e.message || e)));
    const rename = () => {
      const v = window.prompt('Nuevo nombre del grupo:', g.name);
      if (v && v.trim()) FB().renameGroup(g.id, v.trim()).catch(e => alert('Error: ' + (e && e.message || e)));
    };
    const del = () => {
      if (window.confirm('¿Eliminar el grupo "' + g.name + '"? Esto no borra a los usuarios, solo el grupo.')) {
        FB().deleteGroup(g.id).catch(e => alert('Error: ' + (e && e.message || e)));
      }
    };

    return (
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <strong style={{ flex: 1, fontSize: 'var(--t-md)' }}>{g.name}</strong>
          <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{emails.length} {emails.length === 1 ? 'correo' : 'correos'}</span>
          <button onClick={rename} title="Renombrar" style={iconBtn}>✏️</button>
          <button onClick={del} title="Eliminar grupo" style={iconBtn}>🗑️</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {emails.length === 0 && <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>Sin correos aún. Agrega los de tu familia/amigos abajo.</span>}
          {emails.map(m => (
            <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--t-2xs)', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '3px 6px 3px 10px' }}>
              {m}
              <button onClick={() => rm(m)} title="Quitar" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }}
            placeholder="correo@ejemplo.com" type="email" style={inp} />
          <button onClick={add} disabled={busy} className="mb-press" style={addBtn}>＋ Agregar</button>
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
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-xl)' }}>Admin · Grupos</h2>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Crea grupos y agrega los correos de cada persona.</div>
            </div>
            <button onClick={onClose} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create(); }}
              placeholder="Nombre del grupo (ej: Familia García, Amigos del barrio)" style={inp} />
            <button onClick={create} className="mb-press" style={{ ...addBtn, background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontWeight: 800 }}>＋ Crear grupo</button>
          </div>

          {groups.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '20px 0' }}>Aún no hay grupos. Crea el primero arriba.</div>
            : groups.map(g => <GroupRow key={g.id} g={g} />)}

          <div style={{ marginTop: 12, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', lineHeight: 1.5 }}>
            ℹ️ Cuando una persona inicie sesión con un correo que agregaste aquí, quedará en ese grupo automáticamente.
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
          style={{ position: 'fixed', left: 14, bottom: 'calc(14px + env(safe-area-inset-bottom,0px))', zIndex: 900, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(212,175,55,0.5)', background: 'rgba(13,20,15,0.92)', color: 'var(--gold-light)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
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
