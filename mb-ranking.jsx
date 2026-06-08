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
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', flexShrink: 0 }}>{initials(u.nombre)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre || 'Jugador'}{isMe && <span style={{ color: 'var(--info)', fontSize: 'var(--t-3xs)', marginLeft: 6 }}>· tú</span>}</div>
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
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    useEffect(() => {
      if (!user) return undefined;
      const u1 = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      const u2 = FB().subscribeUsers ? FB().subscribeUsers(setUsers) : null;
      return () => { if (typeof u1 === 'function') u1(); if (typeof u2 === 'function') u2(); };
    }, [user]);

    const note = (txt) => <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '22px 16px' }}>{txt}</div>;
    if (!user) return note('Inicia sesión para ver la liga.');

    const countByGroup = {};
    users.forEach(u => { if (u.groupId) countByGroup[u.groupId] = (countByGroup[u.groupId] || 0) + 1; });
    // pts en 0 → desempate por orden de ingreso (creado asc)
    const teams = groups.map(g => ({ g: g, n: countByGroup[g.id] || 0, pts: 0 }))
      .sort((a, b) => b.pts - a.pts || tsMillis(a.g.creado) - tsMillis(b.g.creado)).slice(0, 20);
    const players = users.slice()
      .sort((a, b) => 0 - 0 || tsMillis(a.creado) - tsMillis(b.creado)).slice(0, 20);

    const card = { background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--sh-1)' };
    const head = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 };
    const rankNum = (i) => <span className="num" style={{ width: 22, textAlign: 'center', color: i < 3 ? 'var(--gold-light)' : 'var(--muted-2)', fontWeight: 700, fontSize: 'var(--t-sm)', flexShrink: 0 }}>{i + 1}</span>;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
        {/* Equipos */}
        <div style={card}>
          <div style={head}>
            <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)' }}>Mejores equipos</h3>
            <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>top 20</span>
          </div>
          {teams.length === 0 ? note('Aún no hay equipos.') : teams.map((t, i) => {
            const closed = t.g.open === false;
            return (
              <div key={t.g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: i < teams.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {rankNum(i)}
                <span style={{ fontSize: 15, flexShrink: 0 }}>{closed ? '🔒' : '👥'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.g.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted-2)' }}>{t.n} {t.n === 1 ? 'jugador' : 'jugadores'}</div>
                </div>
                <span className="num" style={{ color: 'var(--gold-light)', fontWeight: 700, flexShrink: 0 }}>{t.pts} pts</span>
              </div>
            );
          })}
        </div>

        {/* Jugadores */}
        <div style={card}>
          <div style={head}>
            <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)' }}>Mejores jugadores</h3>
            <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>top 20</span>
          </div>
          {players.length === 0 ? note('Aún no hay jugadores.') : players.map((u, i) => {
            const isMe = u.uid === user.uid;
            return (
              <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderRadius: 'var(--r-sm)', background: isMe ? 'rgba(212,175,55,0.10)' : 'transparent', borderBottom: i < players.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {rankNum(i)}
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', flexShrink: 0 }}>{initials(u.nombre)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nombre || 'Jugador'}{isMe && <span style={{ color: 'var(--info)', fontSize: 'var(--t-3xs)', marginLeft: 6 }}>· tú</span>}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted-2)' }}>{u.groupName ? '👥 ' + u.groupName : (u.noGroup ? 'Individual' : 'Sin equipo')}</div>
                </div>
                <span className="num" style={{ color: 'var(--gold-light)', fontWeight: 700, flexShrink: 0 }}>0 pts</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Actividad real (equipos creados + usuarios registrados) ──
  function tsMillis(t) { return t && typeof t.toMillis === 'function' ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0); }
  function ago(ms) {
    if (!ms) return '';
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return 'ahora'; if (m < 60) return 'hace ' + m + ' min';
    const h = Math.floor(m / 60); if (h < 24) return 'hace ' + h + ' h';
    return 'hace ' + Math.floor(h / 24) + ' d';
  }
  function ActivityReal({ limit }) {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    useEffect(() => {
      if (!user) return undefined;
      const u1 = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      const u2 = FB().subscribeUsers ? FB().subscribeUsers(setUsers) : null;
      return () => { if (typeof u1 === 'function') u1(); if (typeof u2 === 'function') u2(); };
    }, [user]);

    const note = (txt) => <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '18px 12px' }}>{txt}</div>;
    if (!user) return note('Inicia sesión para ver la actividad.');

    const events = [];
    groups.forEach(g => events.push({ ms: tsMillis(g.creado), icon: '🆕', text: 'Se creó el equipo «' + (g.name || '') + '»' + (g.ownerName && String(g.ownerName).indexOf('@') === -1 ? ' · por ' + g.ownerName : '') }));
    users.forEach(u => { const nm = u.nombre && String(u.nombre).indexOf('@') === -1 ? u.nombre : null; if (nm) events.push({ ms: tsMillis(u.creado), icon: '👤', text: nm + ' se registró' }); });
    events.sort((a, b) => b.ms - a.ms);
    const shown = limit ? events.slice(0, limit) : events;
    if (!shown.length) return note('Aún no hay actividad. Crea un equipo o invita gente. 👥');

    return (
      <div>
        {shown.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < shown.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{e.icon}</span>
            <div style={{ flex: 1, fontSize: 'var(--t-sm)', minWidth: 0 }}>{e.text}</div>
            <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', flexShrink: 0 }}>{ago(e.ms)}</span>
          </div>
        ))}
      </div>
    );
  }

  window.MB_RankingReal = RankingReal;
  window.MB_LigaReal = LigaReal;
  window.MB_ActivityReal = ActivityReal;
})();
