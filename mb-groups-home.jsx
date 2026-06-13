/* ============================================================
   MundialBet Club 2026 — "Equipos de apostadores" (Inicio) +
   vista de equipo (integrantes con fecha de ingreso y ganancias).
   Datos reales de Firestore. Expone:
     window.MB_GroupsHome           — lista de equipos en el Inicio
     window.MB_openTeamMembers(id)  — abre la ficha de un equipo (id
                                       opcional: sin id = tu equipo)
     window.MB_TeamMembersLauncher  — se monta global en el bootstrap
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};
  const SAL = 90000;
  // Patrimonio (disponible + en juego). Ver window.MB_worth en mb-bet.jsx.
  const saldoOf = (u) => window.MB_worth ? window.MB_worth(u) : ((u && typeof u.saldo === 'number') ? u.saldo : SAL);
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  function initials(name) {
    const p = String(name || '').trim().split(/\s+/);
    return (((p[0] || '')[0] || '?') + ((p[1] || '')[0] || '')).toUpperCase();
  }
  function fmtDate(ts) {
    try {
      const d = ts && typeof ts.toDate === 'function' ? ts.toDate() : (ts && ts.seconds ? new Date(ts.seconds * 1000) : null);
      return d ? d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
    } catch (e) { return '—'; }
  }
  // Enlace de invitación a un equipo y compartir (nativo / WhatsApp / copiar).
  function inviteUrl(teamId) { return location.origin + location.pathname + '?join=' + teamId; }
  function shareInvite(teamId, teamName) {
    const url = inviteUrl(teamId);
    const text = '¡Únete a mi equipo "' + teamName + '" en MundialBet Club! ' + url;
    if (navigator.share) { navigator.share({ title: 'MundialBet Club', text: text }).catch(function () {}); return 'share'; }
    try { if (navigator.clipboard) navigator.clipboard.writeText(url); } catch (e) {}
    try { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); } catch (e) {}
    return 'copied';
  }

  // ── Ficha de un equipo: solo sus integrantes, con fecha de ingreso y ganancias ──
  function TeamMembersModal({ teamId, onClose }) {
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [gid, setGid] = useState(teamId || null);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
      const u1 = FB().subscribeGroups ? FB().subscribeGroups(setGroups) : null;
      const u2 = FB().subscribeUsers ? FB().subscribeUsers(setUsers) : null;
      return () => { if (typeof u1 === 'function') u1(); if (typeof u2 === 'function') u2(); };
    }, []);
    useEffect(() => {
      if (!teamId && FB().getMyProfile) FB().getMyProfile().then(p => setGid((p && p.groupId) || null)).catch(() => {});
    }, [teamId]);

    const meUid = (FB().currentUser && FB().currentUser() || {}).uid;
    const group = groups.find(g => g.id === gid) || null;
    const closed = group && group.open === false;
    const members = users.filter(u => u.groupId === gid).sort((a, b) => saldoOf(b) - saldoOf(a) || ((a.creado && a.creado.seconds) || 0) - ((b.creado && b.creado.seconds) || 0));

    const modal = (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1150, background: 'rgba(6,8,15,0.78)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 22, width: 'min(460px, 94vw)', maxHeight: '86vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>{closed ? '🔒' : '👥'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* nombre del grupo arriba */}
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-xl)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group ? group.name : 'Equipo'}</h2>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{members.length} {members.length === 1 ? 'integrante' : 'integrantes'}{group ? ' · ' + (closed ? 'Cerrado' : 'Abierto') : ''}</div>
            </div>
            {gid && group && (
              <button onClick={() => { const r = shareInvite(gid, group.name); if (r === 'copied') { setCopied(true); setTimeout(() => setCopied(false), 2000); } }} className="mb-press" title="Invitar gente a este equipo" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(212,175,55,0.55)', background: 'var(--coin-bg)', color: 'var(--gold-light)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap' }}>🔗 {copied ? 'Copiado ✓' : 'Invitar'}</button>
            )}
            <button onClick={onClose} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>
          {copied && <div style={{ marginBottom: 12, padding: '8px 11px', borderRadius: 'var(--r-md)', background: 'var(--coin-bg)', border: '1px solid rgba(212,175,55,0.4)', fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 700, textAlign: 'center' }}>🔗 Enlace copiado. ¡Pégalo en WhatsApp para invitar!</div>}

          {!gid
            ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '18px 8px' }}>No perteneces a ningún equipo.<br /><span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>Únete a uno desde tu <strong style={{ color: 'var(--gold-light)' }}>Perfil</strong>.</span></div>
            : members.length === 0
              ? <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', textAlign: 'center', padding: '16px 0' }}>Aún no hay integrantes en este equipo.</div>
              : (
                <>
                  {/* encabezado de columnas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 84px', gap: 10, padding: '0 2px 6px', borderBottom: '1px solid var(--border)', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span />
                    <span>Jugador · ingreso</span>
                    <span style={{ textAlign: 'right' }}>Saldo</span>
                  </div>
                  {members.map((m, i) => {
                    const saldo = saldoOf(m), gan = saldo - SAL, mine = m.uid === meUid;
                    const enJuego = window.MB_staked ? window.MB_staked(m) : 0;
                    return (
                      <div key={m.uid || i} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 84px', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: mine ? 'rgba(212,175,55,0.10)' : 'transparent', borderRadius: 'var(--r-sm)' }}>
                        {window.MB_champAvatar ? window.MB_champAvatar(m.championCode, m.champion, m.nombre, 32) : <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', flexShrink: 0 }}>{initials(m.nombre)}</span>}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.nombre || 'Jugador'}{window.MB_champFlag && window.MB_champFlag(m.championCode, m.champion)}{mine && <span style={{ color: 'var(--info)', fontSize: 'var(--t-3xs)', marginLeft: 6 }}>· tú</span>}</div>
                          <div style={{ fontSize: 9, color: 'var(--muted-2)' }}>📅 Ingresó {fmtDate(m.creado)}{enJuego > 0 ? ' · 🎟️ ' + fmt(enJuego) + ' en juego' : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: 'var(--gold-light)' }}>{fmt(saldo)}</div>
                          <div className="num" style={{ fontSize: 9, fontWeight: 700, color: gan >= 0 ? 'var(--success)' : 'var(--danger)' }}>{gan >= 0 ? '+' : ''}{fmt(gan)}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
        </div>
      </div>
    );
    return ReactDOM.createPortal(modal, document.body);
  }

  function TeamMembersLauncher() {
    const [tid, setTid] = useState(undefined); // undefined = cerrado
    useEffect(() => {
      const on = (e) => setTid((e && e.detail) || null);
      window.addEventListener('mb-open-team', on);
      return () => window.removeEventListener('mb-open-team', on);
    }, []);
    return tid !== undefined ? <TeamMembersModal teamId={tid || null} onClose={() => setTid(undefined)} /> : null;
  }
  // id opcional: sin id abre TU equipo.
  window.MB_openTeamMembers = function (teamId) { try { window.dispatchEvent(new CustomEvent('mb-open-team', { detail: teamId || null })); } catch (e) {} };
  window.MB_TeamMembersLauncher = TeamMembersLauncher;

  function GroupsHome() {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [profile, setProfile] = useState(null);

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
    const groupsList = groups.filter(g => g && g.name && String(g.name).trim()); // oculta equipos sin nombre
    const myId = profile && profile.groupId;
    const countByGroup = {}, sumByGroup = {}, stakedByGroup = {};
    users.forEach(u => { if (u.groupId) { countByGroup[u.groupId] = (countByGroup[u.groupId] || 0) + 1; sumByGroup[u.groupId] = (sumByGroup[u.groupId] || 0) + saldoOf(u); stakedByGroup[u.groupId] = (stakedByGroup[u.groupId] || 0) + (u.staked || 0); } });
    const avgOf = (gid) => { const n = countByGroup[gid] || 0; return n ? Math.round(sumByGroup[gid] / n) : 0; };

    return (
      <div style={{ marginTop: 4, background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--sh-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>Liga de apostadores <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 400 }}>· {groupsList.length}</span></h3>
          <button onClick={() => window.MB_openMyTeams && window.MB_openMyTeams()} className="mb-press" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(212,175,55,0.55)', background: 'var(--coin-bg)', color: 'var(--gold-light)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap' }}>👥 Equipos</button>
        </div>
        {groupsList.length === 0
          ? <div style={{ padding: '12px', borderRadius: 'var(--r-md)', background: 'rgba(8,12,9,0.5)', border: '1px dashed var(--border-2)', textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>Aún no hay equipos. Crea el tuyo con <strong style={{ color: 'var(--gold-light)' }}>👥 Equipos</strong>.</div>
          : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 84px 56px', gap: 8, alignItems: 'center', padding: '0 4px 6px', borderBottom: '1px solid var(--border)', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span style={{ textAlign: 'center' }}>#</span>
                <span>Equipo</span>
                <span style={{ textAlign: 'center' }}>Jugadores</span>
                <span style={{ textAlign: 'right' }}>Pts</span>
              </div>
              {groupsList.map(g => ({ g: g, n: countByGroup[g.id] || 0, pts: avgOf(g.id) }))
                .sort((a, b) => b.pts - a.pts || b.n - a.n || (a.g.name || '').localeCompare(b.g.name || ''))
                .map((row, i) => {
                  const g = row.g, mine = g.id === myId, closed = g.open === false;
                  return (
                    <div key={g.id} onClick={() => window.MB_openTeamMembers && window.MB_openTeamMembers(g.id)} className="mb-press" title={`Ver integrantes de ${g.name}`} style={{
                      display: 'grid', gridTemplateColumns: '24px 1fr 84px 56px', gap: 8, alignItems: 'center', padding: '10px 4px', cursor: 'pointer',
                      borderRadius: 'var(--r-sm)', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: mine ? 'rgba(212,175,55,0.10)' : 'transparent',
                    }}>
                      <span className="num" style={{ textAlign: 'center', color: i < 3 ? 'var(--gold-light)' : 'var(--muted-2)', fontWeight: 700, fontSize: 'var(--t-sm)' }}>{i + 1}</span>
                      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{closed ? '🔒' : '👥'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}{mine && <span style={{ color: 'var(--gold-light)', fontSize: 'var(--t-3xs)', marginLeft: 6 }}>★ tu equipo</span>}</div>
                          <div style={{ fontSize: 9, color: 'var(--muted-2)' }}>{closed ? '🔒 Cerrado' : '🔓 Abierto'}{stakedByGroup[g.id] > 0 ? ' · 🎟️ ' + fmt(stakedByGroup[g.id]) : ''}</div>
                        </div>
                      </div>
                      <span style={{ textAlign: 'center', fontSize: 'var(--t-sm)', color: 'var(--muted)', fontWeight: 700 }}>{row.n}</span>
                      <span className="num" style={{ textAlign: 'right', color: 'var(--gold-light)', fontWeight: 700, fontSize: 'var(--t-2xs)' }}>{fmt(row.pts)}</span>
                    </div>
                  );
                })}
            </div>
          )}
      </div>
    );
  }

  window.MB_GroupsHome = GroupsHome;
})();
