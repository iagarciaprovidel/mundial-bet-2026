/* ============================================================
   MundialBet Club 2026 — App raíz MÓVIL: nav, header, tweaks, flujos
   (envuelto en IIFE; se expone como window.App. El render lo hace
   el bootstrap responsive en index.html)
   ============================================================ */
(function () {
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;
const Da = window.MB;
const Ma = Da.MASCOTS;
const {
  IOSDevice, MascotAvatar, CoinBadge, Onboarding, Dashboard, Partidos, Quiniela,
  Ranking, Liga, Perfil, Feed, Admin, TournamentClose, TeamsScreen,
  useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle, TweakButton,
} = window;

const ACCENTS = {
  Trionda: '#4A90E2', Zayu: '#00C85A', Maple: '#E84040', Clutch: '#4A90E2', Trofeo: '#D4AF37',
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4A90E2",
  "anim": "Normal",
  "role": "Jugador",
  "liveCountdown": true
}/*EDITMODE-END*/;

// ── Loader por sección ────────────────────────────────────
function SectionLoader({ mascot, label }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ animation: 'mb-bounce 0.9s var(--ease-spring) infinite' }}>
        <MascotAvatar mascot={mascot} size={72} glow jersey />
      </div>
      <div style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)', fontWeight: 700 }}>{label}</div>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', animation: `mb-pulse-live 1s var(--ease-out) ${i * 0.15}s infinite` }} />)}
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────
function Header({ me, accent, role, onAdmin }) {
  return (
    <div style={{
      paddingTop: 52, paddingLeft: 16, paddingRight: 16, paddingBottom: 12,
      background: 'linear-gradient(180deg, #08160d 68%, transparent)',
      position: 'relative', zIndex: 6, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <span className="display" style={{ fontSize: 'var(--t-lg)', letterSpacing: '-0.02em' }}>MundialBet<span style={{ color: accent }}> Club</span></span>
          </div>
          <span style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, letterSpacing: '0.12em' }}>USA · MEX · CAN · 2026</span>
        </div>
        <CoinBadge amount={me.coins} />
        {role === 'Admin / Tesorero' && (
          <button onClick={onAdmin} className="mb-press" style={{
            width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--info-bg)',
            cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>🛡️</button>
        )}
        <div style={{ flexShrink: 0 }}><MascotAvatar mascot={me.mascot} size={38} /></div>
      </div>
    </div>
  );
}

// ── Bottom nav ────────────────────────────────────────────
const NAV = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'partidos', label: 'Partidos', icon: '⚽' },
  { id: 'equipos', label: 'Equipos', icon: '🌍' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'liga', label: 'Liga', icon: '💰' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
];
function BottomNav({ tab, onTab, accent }) {
  return (
    <div style={{
      flexShrink: 0, display: 'flex', padding: '8px 6px 24px',
      background: 'rgba(7,20,12,0.92)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)', position: 'relative', zIndex: 6,
    }}>
      {NAV.map(n => {
        const active = tab === n.id;
        return (
          <button key={n.id} onClick={() => onTab(n.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <span style={{ fontSize: 20, filter: active ? 'none' : 'grayscale(0.7) opacity(0.6)', transform: active ? 'scale(1.12)' : 'scale(1)', transition: 'transform var(--dur-base) var(--ease-spring)' }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: active ? accent : 'var(--muted-2)' }}>{n.label}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? accent : 'transparent' }} />
          </button>
        );
      })}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [onboard, setOnboard] = useStateA(true);
  const [closeScreen, setCloseScreen] = useStateA(false);
  const [tab, setTab] = useStateA('inicio');
  const [me, setMe] = useStateA(Da.ME);
  const [loading, setLoading] = useStateA(null);
  const visited = useRefA(new Set());
  const scrollRef = useRefA(null);

  const accent = t.accent || '#4A90E2';
  useEffectA(() => { document.documentElement.style.setProperty('--accent', accent); }, [accent]);

  // intensidad de animación
  useEffectA(() => {
    const root = document.getElementById('stage');
    if (!root) return;
    root.dataset.anim = t.anim;
  }, [t.anim]);

  // loaders por sección (primera visita)
  const LOAD = { partidos: ['zayu', 'Cargando partidos'], ranking: ['clutch', 'Cargando ranking'], quiniela: ['maple', 'Cargando quiniela'], liga: ['clutch', 'Cargando liga'] };
  const goTab = (id) => {
    setTab(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (LOAD[id] && !visited.current.has(id) && t.anim !== 'Sobrio') {
      visited.current.add(id);
      setLoading(LOAD[id]);
      setTimeout(() => setLoading(null), 600);
    }
  };

  const finishOnboarding = (mascot) => {
    setMe(m => ({ ...m, mascot }));
    setOnboard(false);
  };

  // — Onboarding takeover —
  if (onboard) {
    return (
      <IOSDevice dark width={390} height={844}>
        <Onboarding onFinish={finishOnboarding} />
      </IOSDevice>
    );
  }

  // — Cierre del torneo takeover —
  if (closeScreen) {
    return (
      <IOSDevice dark width={390} height={844}>
        <TournamentClose onExit={() => setCloseScreen(false)} />
        <TweaksUI t={t} setTweak={setTweak} setOnboard={setOnboard} setClose={setCloseScreen} />
      </IOSDevice>
    );
  }

  const screens = {
    inicio: <Dashboard user={me} onNav={goTab} onPredict={() => goTab('quiniela')} />,
    partidos: <Partidos />,
    equipos: <TeamsScreen />,
    quiniela: <Quiniela />,
    ranking: <Ranking />,
    liga: <Liga />,
    perfil: <Perfil user={me} />,
    feed: <Feed />,
    admin: <Admin onCloseTournament={() => setCloseScreen(true)} />,
  };

  return (
    <IOSDevice dark width={390} height={844}>
      <div className="mb-app-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Header me={me} accent={accent} role={t.role} onAdmin={() => setTab('admin')} />
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {/* título de sección para tabs no-inicio */}
          {tab !== 'inicio' && (
            <div style={{ padding: '4px 16px 10px' }}>
              <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-2xl)', textTransform: 'capitalize' }}>
                {tab === 'feed' ? 'Feed social' : tab === 'admin' ? 'Panel Admin' : NAV.find(n => n.id === tab)?.label}
              </h2>
            </div>
          )}
          {screens[tab]}
          {loading && <SectionLoader mascot={loading[0]} label={loading[1]} />}
        </div>
        {tab !== 'feed' && tab !== 'admin' && <BottomNav tab={tab} onTab={goTab} accent={accent} />}
        {(tab === 'feed' || tab === 'admin') && (
          <button onClick={() => goTab('inicio')} className="mb-press" style={{
            flexShrink: 0, margin: '8px 16px 26px', padding: '12px', borderRadius: 'var(--r-pill)',
            border: '1px solid var(--border-2)', background: 'var(--surface-1)', color: 'var(--text)',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)', cursor: 'pointer',
          }}>← Volver al inicio</button>
        )}
      </div>
      <TweaksUI t={t} setTweak={setTweak} setOnboard={setOnboard} setClose={setCloseScreen} />
    </IOSDevice>
  );
}

// ── Panel de Tweaks ───────────────────────────────────────
function TweaksUI({ t, setTweak, setOnboard, setClose }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Marca" />
      <TweakColor label="Color de acento" value={t.accent}
        options={['#4A90E2', '#00C85A', '#E84040', '#D4AF37']}
        onChange={(v) => setTweak('accent', v)} />
      <TweakSection label="Experiencia" />
      <TweakRadio label="Animaciones" value={t.anim} options={['Sobrio', 'Normal', 'Festivo']} onChange={(v) => setTweak('anim', v)} />
      <TweakRadio label="Rol" value={t.role} options={['Jugador', 'Admin / Tesorero']} onChange={(v) => setTweak('role', v)} />
      <TweakSection label="Pantallas especiales" />
      <TweakButton label="Ver onboarding" onClick={() => setOnboard(true)} />
      <TweakButton label="Ver cierre del torneo" onClick={() => setClose(true)} />
    </TweaksPanel>
  );
}

// ── Export (lo monta el bootstrap responsive de index.html) ──
window.App = App;
})();
