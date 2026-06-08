/* ============================================================
   MundialBet Club 2026 — Ranking real + Liga sin datos
   Muestra los JUGADORES REALES registrados (Firestore), todos
   en 0 (el torneo no ha comenzado). La Liga queda "sin datos"
   hasta que haya información real.
   Expone window.MB_RankingReal y window.MB_LigaReal.
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};
  function initials(name) {
    const p = String(name || '').trim().split(/\s+/);
    return (((p[0] || '')[0] || '?') + ((p[1] || '')[0] || '')).toUpperCase();
  }

  function RankingReal({ compact, limit }) {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [users, setUsers] = useState(undefined);
    useEffect(() => {
      if (!user) { setUsers([]); return; }
      const unsub = FB().subscribeUsers ? FB().subscribeUsers(setUsers) : null;
      return () => { if (typeof unsub === 'function') unsub(); };
    }, [user]);

    const note = (txt) => <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '22px 16px' }}>{txt}</div>;
    if (!user) return note('Inicia sesión para ver a los jugadores registrados.');
    if (users === undefined) return note('Cargando…');
    if (!users.length) return note('Aún no hay jugadores registrados. ¡Sé el primero!');

    const list = users.slice().sort((a, b) => (a.nombre || a.email || '').localeCompare(b.nombre || b.email || ''));
    const shown = limit ? list.slice(0, limit) : list;

    return (
      <div>
        {!compact && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', textAlign: 'center', marginBottom: 10 }}>El torneo aún no comienza · todos en 0 pts</div>}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map((u, i) => {
            const isMe = u.uid === user.uid;
            return (
              <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 'var(--r-sm)', background: isMe ? 'rgba(212,175,55,0.14)' : 'transparent', borderBottom: i < shown.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ width: 20, textAlign: 'center', color: 'var(--muted-2)', fontWeight: 700, fontSize: 'var(--t-2xs)' }}>{i + 1}</span>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', flexShrink: 0 }}>{initials(u.nombre || u.email)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre || u.email || 'Jugador'}{isMe && <span style={{ color: 'var(--info)', fontSize: 'var(--t-3xs)', marginLeft: 6 }}>· tú</span>}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.groupName ? '👥 ' + u.groupName : (u.noGroup ? 'Individual' : 'Sin equipo')}</div>
                </div>
                <span className="num" style={{ color: 'var(--gold-light)', fontWeight: 700, fontSize: 'var(--t-sm)' }}>0 pts</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function LigaReal() {
    return (
      <div style={{ animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
        <div style={{ background: 'rgba(13,20,15,0.82)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '28px 20px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🏆</div>
          <h3 className="display" style={{ margin: '0 0 6px', fontSize: 'var(--t-lg)' }}>Sin datos todavía</h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 'var(--t-sm)', lineHeight: 1.5 }}>El torneo aún no ha comenzado. Cuando arranque, aquí verás el <strong>bote, los premios y los pagos reales</strong> de tu liga.</p>
        </div>
      </div>
    );
  }

  window.MB_RankingReal = RankingReal;
  window.MB_LigaReal = LigaReal;
})();
