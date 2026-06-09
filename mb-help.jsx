/* ============================================================
   MundialBet Club 2026 — Reglas / Ayuda
   Modal reutilizable con las reglas del juego. Se abre desde
   cualquier parte con window.MB_openHelp(). Expone MB_HelpLauncher
   (se monta global en el bootstrap).
   ============================================================ */
(function () {
  const { useState, useEffect } = React;

  const SECTIONS = [
    { icon: '🎯', title: 'El objetivo', body: 'Gana quien junte más puntos al final del Mundial. Compite con tus amigos y familia en el ranking.' },
    { icon: '💰', title: 'Empiezas con 90.000 puntos', body: 'Son tus puntos para apostar. No es dinero real: es el juego de pronósticos entre amigos.' },
    { icon: '⚽', title: 'Apuesta al ganador', body: 'En cada partido eliges: gana el Local, Empate o gana el Visitante (1 · X · 2). Pones el monto que quieras (mínimo 1.000).' },
    { icon: '📊', title: 'Las cuotas', body: 'Cada opción tiene una cuota. Si aciertas, ganas monto × cuota. Si fallas, pierdes lo apostado. Mientras más difícil (cuota más alta), más se paga.' },
    { icon: '✏️', title: 'Puedes cambiar o cancelar', body: 'Antes de que empiece el partido puedes cambiar tu elección o cancelar y recuperar tus puntos. Al empezar el partido, la apuesta se cierra.' },
    { icon: '🏁', title: 'Se liquida solo', body: 'Cuando el partido termina, el sistema paga automáticamente a los que acertaron y actualiza tu saldo y tu posición en el ranking.' },
    { icon: '👥', title: 'Equipos', body: 'Puedes jugar individual o en equipo (familia, amigos, trabajo). Puedes crear 1 equipo propio o unirte a uno existente desde tu Perfil. Hay ranking de jugadores y de equipos (por promedio).' },
    { icon: '🔄', title: 'Todo automático', body: 'Las cuotas y los resultados se cargan solos. No tienes que hacer nada más que apostar y disfrutar.' },
    { icon: '🏆', title: 'Próximamente', body: 'Más adelante: marcador exacto, apuesta al campeón del Mundial, recargas de puntos y premios por fase.' },
  ];

  function HelpModal({ onClose }) {
    const modal = (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(6,8,15,0.86)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)', padding: 22, width: 'min(460px, 94vw)', maxHeight: '88vh', overflow: 'auto', boxShadow: 'var(--sh-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>📖</span>
            <div style={{ flex: 1 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-xl)' }}>Cómo se juega</h2>
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Las reglas del juego</div>
            </div>
            <button onClick={onClose} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SECTIONS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, padding: '11px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 22, lineHeight: 1.1, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 'var(--t-sm)', color: 'var(--text)', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', lineHeight: 1.45 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="mb-press" style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)' }}>
            ¡Entendido!
          </button>
        </div>
      </div>
    );
    return ReactDOM.createPortal(modal, document.body);
  }

  function HelpLauncher() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
      const on = () => setOpen(true);
      window.addEventListener('mb-open-help', on);
      return () => window.removeEventListener('mb-open-help', on);
    }, []);
    return open ? <HelpModal onClose={() => setOpen(false)} /> : null;
  }

  window.MB_openHelp = function () { try { window.dispatchEvent(new Event('mb-open-help')); } catch (e) {} };
  window.MB_HelpLauncher = HelpLauncher;
})();
