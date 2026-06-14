/* ============================================================
   MundialBet Club 2026 — UI de autenticación
   - Google (popup)
   - Correo con confirmación (email link / passwordless)
   Expone window.MB_useAuth (hook) y window.MB_LoginButton (componente).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;

  function useAuth() {
    const [user, setUser] = useState(window.MBFirebase ? window.MBFirebase.currentUser() : null);
    const [, force] = useState(0);
    useEffect(() => {
      if (!window.MBFirebase) return;
      const unsub = window.MBFirebase.onAuth((u) => setUser(u));
      const onRefresh = () => force((x) => x + 1); // re-render al cambiar el apodo
      window.addEventListener('mb-auth-refresh', onRefresh);
      return () => { if (typeof unsub === 'function') unsub(); window.removeEventListener('mb-auth-refresh', onRefresh); };
    }, []);
    return user;
  }

  function signInGoogle() {
    window.MBFirebase.signInGoogle().catch((e) => {
      const code = (e && e.code) || e;
      if (code === 'no-config') return;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      alert('No se pudo iniciar sesión: ' + ((e && e.message) || code));
    });
  }

  const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.6 40.6 16.2 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 35.7 45 30.4 45 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );

  // ── Modal de ingreso (Google o correo) ────────────────────
  function LoginModal({ onClose }) {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [safe, setSafe] = useState(false); // desplegable "¿Es seguro?"
    const send = () => {
      const v = email.trim();
      if (!v || v.indexOf('@') === -1) { alert('Escribe un correo válido.'); return; }
      setBusy(true);
      window.MBFirebase.sendEmailLink(v)
        .then(() => setSent(true))
        .catch((e) => alert('No se pudo enviar el enlace: ' + ((e && e.message) || e)))
        .finally(() => setBusy(false));
    };
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(6,8,15,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 24, width: 'min(380px, 92vw)', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <h2 className="display" style={{ margin: 0, flex: 1, fontSize: 'var(--t-xl)' }}>Entrar a MundialBet</h2>
            <button onClick={onClose} className="mb-press" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>

          {!sent && (
            <div style={{ marginBottom: 16, padding: '13px 15px', borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, rgba(212,175,55,0.20), rgba(201,155,31,0.07))', border: '1px solid var(--gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                <span style={{ fontSize: 24 }}>🎁</span>
                <span className="num" style={{ fontSize: 'var(--t-xl)', fontWeight: 800, color: 'var(--gold-light)' }}>90.000 puntos GRATIS</span>
              </div>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--text)', lineHeight: 1.45 }}>
                Te los regalamos al entrar, para apostar a los partidos del Mundial 2026 y competir con tus amigos. <strong style={{ color: 'var(--gold-light)' }}>Son puntos virtuales, sin dinero real.</strong>
              </div>
            </div>
          )}

          {sent ? (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>📧</div>
              <p style={{ margin: 0, fontSize: 'var(--t-sm)', color: 'var(--text)', lineHeight: 1.5 }}>
                Te enviamos un enlace a <strong>{email}</strong>. Ábrelo <strong>en este mismo dispositivo</strong> para entrar.
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>Revisa también la carpeta de spam.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>Entra con tu correo (cualquiera: Gmail, Hotmail, Outlook…)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                type="email" placeholder="tucorreo@ejemplo.com" autoFocus
                style={{ padding: '11px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 'var(--t-sm)' }} />
              <button onClick={send} disabled={busy} className="mb-press" style={{ padding: '11px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Enviando…' : '✉️ Enviarme el enlace'}
              </button>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center', lineHeight: 1.5 }}>
                Te llegará un correo para confirmar y entrar. Sin contraseña.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 2px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
                <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>o</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
              </div>
              <button onClick={signInGoogle} className="mb-press" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '11px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', cursor: 'pointer', background: '#fff', color: '#1f2328', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)' }}>
                <GoogleIcon /> Continuar con Google
              </button>
            </div>
          )}

          {!sent && (
            <div style={{ marginTop: 14 }}>
              {/* Nota de privacidad */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 'var(--t-3xs)', color: 'var(--muted)', lineHeight: 1.45 }}>
                <span style={{ flexShrink: 0 }}>🔒</span>
                <span>Solo usamos tu correo para guardar tu progreso. <strong style={{ color: 'var(--muted)' }}>Sin contraseña, sin spam, y no compartimos tus datos.</strong></span>
              </div>
              {/* Sello de confianza */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', marginTop: 9, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700 }}>
                <span>✅ 100% gratis</span>
                <span>✅ Sin dinero real</span>
                <span>✅ Entre amigos</span>
              </div>
              {/* ¿Es seguro? desplegable */}
              <button onClick={() => setSafe((v) => !v)} className="mb-press" style={{ marginTop: 11, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)' }}>
                <span>🛡️ ¿Es seguro? ¿Tiene algún costo?</span>
                <span style={{ color: 'var(--muted-2)', transform: safe ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform var(--dur-base)' }}>▾</span>
              </button>
              {safe && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 9, padding: '4px 2px', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
                  {[
                    ['¿Cuesta algo?', 'No. Es 100% gratis y siempre lo será.'],
                    ['¿Me van a cobrar o pedir tarjeta?', 'Nunca. No se usa dinero real: juegas con puntos virtuales.'],
                    ['¿Qué hacen con mi correo?', 'Solo guardar tu progreso (saldo, apuestas, equipo). No lo compartimos ni te llega spam.'],
                    ['¿Puedo borrar mi cuenta?', 'Sí, cuando quieras. Nos escribes y la eliminamos.'],
                  ].map((q, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 'var(--t-2xs)', fontWeight: 800, color: 'var(--text)' }}>{q[0]}</div>
                      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', lineHeight: 1.4, marginTop: 1 }}>{q[1]}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function LoginButton({ compact }) {
    const user = useAuth();
    const [open, setOpen] = useState(false);
    const [group, setGroup] = useState(null);

    useEffect(() => {
      let alive = true;
      if (user && window.MBFirebase && window.MBFirebase.getMyProfile) {
        window.MBFirebase.getMyProfile().then((p) => { if (alive) setGroup(p && p.groupName ? p.groupName : null); });
      } else setGroup(null);
      return () => { alive = false; };
    }, [user]);

    if (user) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: compact ? 0 : '8px 10px', background: compact ? 'none' : 'rgba(13,20,15,0.6)', border: compact ? 'none' : '1px solid var(--border)', borderRadius: 'var(--r-pill)' }}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
            : <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</span>}
          {!compact && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 'var(--t-2xs)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName || user.email || 'Jugador'}</div>
              {group && <div style={{ fontSize: 9, color: 'var(--gold-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👥 {group}</div>}
            </div>
          )}
          <button onClick={() => window.MBFirebase.signOut()} className="mb-press" title="Cerrar sesión" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 'var(--t-2xs)', fontWeight: 700, padding: compact ? '0 0 0 4px' : 0 }}>Salir</button>
        </div>
      );
    }

    return (
      <React.Fragment>
        <button onClick={() => setOpen(true)} className="mb-press" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: compact ? '7px 12px' : '10px 12px', width: compact ? 'auto' : '100%', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: '#fff', color: '#1f2328', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)' }}>
          <GoogleIcon />{compact ? 'Entrar' : 'Iniciar sesión'}
        </button>
        {open && <LoginModal onClose={() => setOpen(false)} />}
      </React.Fragment>
    );
  }

  // Mensaje uniforme de "inicia sesión": mismo candado y mismo tamaño en todas partes.
  // card=true → recuadro propio (fondo opaco + borde azul); card=false → contenido
  // centrado para colocar dentro de una Card existente.
  function SignInNote({ text, card }) {
    const inner = (
      <React.Fragment>
        <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 'var(--t-sm)', fontWeight: 700, color: 'var(--text)' }}>{text || 'Inicia sesión para continuar.'}</div>
      </React.Fragment>
    );
    if (card) {
      return <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-1)', textAlign: 'center', padding: '26px 18px' }}>{inner}</div>;
    }
    return <div style={{ textAlign: 'center', padding: '22px 16px' }}>{inner}</div>;
  }

  // Hero de bienvenida para VISITANTES no logueados: vende el regalo de 90.000
  // y los invita a entrar. Devuelve null si ya hay sesión (no estorba).
  function WelcomeHero() {
    const user = useAuth();
    const [open, setOpen] = useState(false);
    if (user) return null;
    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(13,20,15,0.96), rgba(22,30,18,0.96))', border: '1px solid var(--gold)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-2)', padding: '20px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>🏆 MundialBet Club · Mundial 2026</div>
        <h2 className="display" style={{ margin: '0 0 12px', fontSize: 'var(--t-2xl)', color: 'var(--text)' }}>Apuesta con tus amigos. Gratis.</h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11, padding: '10px 18px', borderRadius: 'var(--r-pill)', background: 'var(--coin-bg)', border: '1px solid var(--gold)', marginBottom: 13 }}>
          <span style={{ fontSize: 28 }}>🎁</span>
          <div style={{ textAlign: 'left' }}>
            <div className="num" style={{ fontSize: 'var(--t-2xl)', fontWeight: 800, color: 'var(--gold-light)', lineHeight: 1 }}>90.000</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>puntos gratis al entrar</div>
          </div>
        </div>
        <p style={{ margin: '0 auto 16px', maxWidth: 440, fontSize: 'var(--t-sm)', color: 'var(--muted)', lineHeight: 1.5 }}>
          Apuesta al ganador de cada partido del Mundial 2026, pronostica al campeón y sube en el ranking con tu familia y amigos. <strong style={{ color: 'var(--text)' }}>Son puntos virtuales, sin dinero real.</strong>
        </p>
        <button onClick={() => setOpen(true)} className="mb-press" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 26px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-md)', boxShadow: 'var(--glow-gold)' }}>
          🚀 Entrar y reclamar mis 90.000
        </button>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '4px 14px', fontSize: 'var(--t-3xs)', color: 'var(--muted)', fontWeight: 700 }}>
          <span>✅ 100% gratis</span>
          <span>✅ Sin tarjeta ni dinero real</span>
          <span>✅ Solo para jugar entre amigos</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>Con tu correo o Google · sin contraseña · toma 20 segundos</div>
        {open && <LoginModal onClose={() => setOpen(false)} />}
      </div>
    );
  }

  Object.assign(window, { MB_useAuth: useAuth, MB_LoginButton: LoginButton, MB_SignInNote: SignInNote, MB_WelcomeHero: WelcomeHero });
})();
