/* ============================================================
   MundialBet Club 2026 — UI de autenticación (Google)
   Expone window.MB_useAuth (hook) y window.MB_LoginButton (componente),
   reutilizables en app.jsx (móvil) y app-web.jsx (escritorio).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;

  function useAuth() {
    const [user, setUser] = useState(window.MBFirebase ? window.MBFirebase.currentUser() : null);
    useEffect(() => {
      if (!window.MBFirebase) return;
      const unsub = window.MBFirebase.onAuth((u) => setUser(u));
      return () => { if (typeof unsub === 'function') unsub(); };
    }, []);
    return user;
  }

  function signIn() {
    window.MBFirebase.signInGoogle().catch((e) => {
      const code = (e && e.code) || e;
      if (code === 'no-config') return;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      alert('No se pudo iniciar sesión: ' + ((e && e.message) || code));
    });
  }

  function LoginButton({ compact }) {
    const user = useAuth();
    if (user) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: compact ? 0 : '8px 10px',
          background: compact ? 'none' : 'rgba(13,20,15,0.6)',
          border: compact ? 'none' : '1px solid var(--border)', borderRadius: 'var(--r-pill)',
        }}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
            : <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</span>}
          {!compact && <span style={{ fontSize: 'var(--t-2xs)', fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName || 'Jugador'}</span>}
          <button onClick={() => window.MBFirebase.signOut()} className="mb-press" title="Cerrar sesión" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
            fontSize: 'var(--t-2xs)', fontWeight: 700, padding: compact ? '0 0 0 4px' : 0,
          }}>Salir</button>
        </div>
      );
    }
    return (
      <button onClick={signIn} className="mb-press" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: compact ? '7px 10px' : '10px 12px', width: compact ? 'auto' : '100%',
        borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
        background: '#fff', color: '#1f2328',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)',
      }}>
        <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.6 40.6 16.2 45 24 45z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 35.7 45 30.4 45 24c0-1.2-.1-2.3-.4-3.5z"/>
        </svg>
        {compact ? 'Entrar' : 'Iniciar sesión con Google'}
      </button>
    );
  }

  Object.assign(window, { MB_useAuth: useAuth, MB_LoginButton: LoginButton });
})();
