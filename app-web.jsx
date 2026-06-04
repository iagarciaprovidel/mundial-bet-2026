/* ============================================================
   MundialBet Club 2026 — Versión WEB de escritorio
   Reutiliza data.js + todos los componentes/pantallas móviles
   dentro de un shell responsive (sidebar + topbar).
   ============================================================ */
const { useState: useStateW, useEffect: useEffectW, useRef: useRefW } = React;
const Dw = window.MB;
const Mw = Dw.MASCOTS;
const {
  MascotAvatar, CoinBadge, Chip, Card, SectionHead, ProgressBar, BetButton,
  CountdownTimer, FeedItem, GoldButton, PrizePotCard, useCountUp,
  Partidos, Quiniela, Ranking, Liga, Perfil, Feed, Admin, TournamentClose, Onboarding,
  useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakButton,
} = window;

const TWEAK_DEFAULTS_W = /*EDITMODE-BEGIN*/{
  "accent": "#4A90E2",
  "anim": "Normal",
  "role": "Jugador"
}/*EDITMODE-END*/;

const NAV_W = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'partidos', label: 'Partidos', icon: '⚽' },
  { id: 'quiniela', label: 'Quiniela', icon: '🔒' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'liga', label: 'Liga', icon: '💰' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
  { id: 'feed', label: 'Feed', icon: '📣' },
];

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({ tab, onTab, me, accent, role, onAdmin }) {
  return (
    <aside style={{
      width: 248, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column',
      background: 'rgba(8,15,10,0.92)', borderRight: '1px solid var(--border)', padding: '22px 16px',
    }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px 4px' }}>
        <span style={{ fontSize: 24 }}>🏆</span>
        <div>
          <div className="display" style={{ fontSize: 'var(--t-lg)' }}>MundialBet<span style={{ color: accent }}> Club</span></div>
          <div style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, letterSpacing: '0.12em' }}>USA · MEX · CAN · 2026</div>
        </div>
      </div>

      {/* nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 22 }}>
        {NAV_W.map(n => {
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => onTab(n.id)} className="mb-press" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', cursor: 'pointer',
              borderRadius: 'var(--r-md)', border: 'none', textAlign: 'left',
              background: active ? `${accent}1f` : 'transparent',
              boxShadow: active ? `inset 3px 0 0 ${accent}` : 'none',
              color: active ? '#fff' : 'var(--muted)', fontFamily: 'var(--font-body)',
              fontWeight: active ? 700 : 600, fontSize: 'var(--t-sm)', transition: 'all var(--dur-base) var(--ease-out)',
            }}>
              <span style={{ fontSize: 18, filter: active ? 'none' : 'grayscale(0.5) opacity(0.7)' }}>{n.icon}</span>
              {n.label}
            </button>
          );
        })}
        {role === 'Admin / Tesorero' && (
          <button onClick={onAdmin} className="mb-press" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', cursor: 'pointer', marginTop: 6,
            borderRadius: 'var(--r-md)', border: '1px solid rgba(74,144,226,0.3)',
            background: tab === 'admin' ? 'var(--info-bg)' : 'transparent',
            color: tab === 'admin' ? 'var(--info)' : 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)',
          }}>
            <span style={{ fontSize: 18 }}>🛡️</span> Panel Admin
          </button>
        )}
      </nav>

      <div style={{ flex: 1 }} />

      {/* user card */}
      <button onClick={() => onTab('perfil')} className="mb-press" style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: '11px', cursor: 'pointer', width: '100%',
        background: 'rgba(13,20,15,0.82)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
      }}>
        <MascotAvatar mascot={me.mascot} size={40} jersey />
        <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: 'var(--text)' }}>{me.name}</div>
          <div style={{ fontSize: 'var(--t-3xs)', color: Mw[me.mascot].light, fontWeight: 700 }}>Equipo {Mw[me.mascot].name} · #{me.rank}</div>
        </div>
      </button>
      <a href="index.html" style={{
        marginTop: 10, textAlign: 'center', textDecoration: 'none', fontSize: 'var(--t-2xs)', color: 'var(--muted-2)',
        padding: '8px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border)', fontWeight: 700,
      }}>📱 Ver versión móvil</a>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────
function Topbar({ tab, me }) {
  const titles = { inicio: 'Inicio', partidos: 'Partidos', quiniela: 'Quiniela anónima', ranking: 'Ranking', liga: 'Liga', perfil: 'Mi perfil', feed: 'Feed social', admin: 'Panel Admin' };
  return (
    <header style={{
      height: 68, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', borderBottom: '1px solid var(--border)', background: 'rgba(8,15,10,0.7)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 'var(--t-2xl)' }}>{titles[tab] || ''}</h1>
        <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted-2)' }}>{Dw.LEAGUE.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Chip tone="gold" icon={<span>🏆</span>}>Bote ${Dw.fmt(Dw.LEAGUE.pot)}</Chip>
        <CoinBadge amount={me.coins} />
        <MascotAvatar mascot={me.mascot} size={38} />
      </div>
    </header>
  );
}

// ── Dashboard desktop (2 columnas) ────────────────────────
function MetricW({ label, value, tone, icon }) {
  return (
    <Card style={{ padding: '16px 18px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div className="num" style={{ fontSize: 'var(--t-3xl)', color: tone }}>{value}</div>
    </Card>
  );
}

function DashboardWeb({ me, onNav, onPredict }) {
  const top3 = Dw.USERS.slice(0, 3);
  const next = Dw.UPCOMING.find(m => m.next);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.65fr) minmax(0,1fr)', gap: 20, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* columna principal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h2 className="display" style={{ fontSize: 'var(--t-3xl)', margin: '0 0 2px' }}>
            ¡Buenas noches, {me.name.split(' ')[0]}! <span style={{ fontSize: 26 }}>{Mw[me.mascot].emoji}</span>
          </h2>
          <p style={{ margin: 0, color: 'var(--gold-light)', fontSize: 'var(--t-md)', fontWeight: 600 }}>Llevas {me.streak} aciertos seguidos ⚡</p>
        </div>

        <PrizePotCard />

        <div style={{ display: 'flex', gap: 12 }}>
          <MetricW label="Mis monedas" value={Dw.fmt(me.coins)} tone="var(--gold-light)" icon="⚽" />
          <MetricW label="Posición" value={'#' + me.rank} tone="var(--info)" icon="📊" />
          <MetricW label="Aciertos" value={me.hits + '%'} tone="var(--success)" icon="🎯" />
          <MetricW label="ROI" value={'+' + me.roi + '%'} tone="var(--success)" icon="📈" />
        </div>

        {/* próximo partido */}
        <div>
          <SectionHead title="Próximo partido" action="Ver todos" onAction={() => onNav('partidos')} />
          <Card glow="var(--sh-2)">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Chip tone="green">Abierto</Chip>
              <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)' }}>{next.group} · {next.preds}/{next.total} pronósticos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 14 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 44 }}>{next.flagH}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{next.home}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginBottom: 2 }}>cierra en</div>
                <CountdownTimer minutes={next.kickoffInMin} />
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 44 }}>{next.flagA}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{next.away}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <BetButton label={next.home} odd={next.odds.home} />
              <BetButton label="Empate" odd={next.odds.draw} />
              <BetButton label={next.away} odd={next.odds.away} />
            </div>
            <GoldButton onClick={() => onPredict(next)}>Hacer pronóstico →</GoldButton>
          </Card>
        </div>
      </div>

      {/* columna lateral */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <SectionHead title="Top 3 del torneo" action="Ranking" onAction={() => onNav('ranking')} />
          <Card style={{ padding: '6px 16px' }}>
            {top3.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 20, width: 24 }}>{['🥇', '🥈', '🥉'][i]}</span>
                <MascotAvatar mascot={u.mascot} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{u.name}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--success)', fontWeight: 600 }}>{u.pts} pts · ROI +{u.roi}%</div>
                </div>
                <CoinBadge amount={u.coins} size="sm" />
              </div>
            ))}
          </Card>
        </div>
        <div>
          <SectionHead title="Actividad" action="Ver feed" onAction={() => onNav('feed')} />
          <Card style={{ padding: '0 16px' }}>
            {Dw.FEED.slice(0, 5).map((f, i) => <FeedItem key={i} item={f} delay={i * 0.05} />)}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── App web ───────────────────────────────────────────────
function AppWeb() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_W);
  const [tab, setTab] = useStateW('inicio');
  const [me, setMe] = useStateW(Dw.ME);
  const [closeScreen, setCloseScreen] = useStateW(false);
  const mainRef = useRefW(null);

  const accent = t.accent || '#4A90E2';
  useEffectW(() => { document.documentElement.style.setProperty('--accent', accent); }, [accent]);

  const goTab = (id) => { setTab(id); if (mainRef.current) mainRef.current.scrollTop = 0; };

  if (closeScreen) {
    return (
      <div className="mb-main-pitch" style={{ position: 'fixed', inset: 0, overflow: 'auto' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <TournamentClose onExit={() => setCloseScreen(false)} />
        </div>
        <WebTweaks t={t} setTweak={setTweak} setClose={setCloseScreen} />
      </div>
    );
  }

  // pantallas reutilizadas (móviles) centradas en columna
  const centered = {
    partidos: <Partidos />, quiniela: <Quiniela />, ranking: <Ranking />,
    liga: <Liga />, perfil: <Perfil user={me} />, feed: <Feed />,
    admin: <Admin onCloseTournament={() => setCloseScreen(true)} />,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', overflow: 'hidden', background: '#0c2114' }}>
      <Sidebar tab={tab} onTab={goTab} me={me} accent={accent} role={t.role} onAdmin={() => goTab('admin')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar tab={tab} me={me} />
        <main ref={mainRef} className="mb-main-pitch" style={{ flex: 1, overflow: 'auto', padding: '24px 28px 60px' }}>
          {tab === 'inicio'
            ? <div style={{ maxWidth: 1080, margin: '0 auto' }}><DashboardWeb me={me} onNav={goTab} onPredict={() => goTab('quiniela')} /></div>
            : <div style={{ maxWidth: 760, margin: '0 auto' }}>{centered[tab]}</div>}
        </main>
      </div>
      <WebTweaks t={t} setTweak={setTweak} setClose={setCloseScreen} />
    </div>
  );
}

function WebTweaks({ t, setTweak, setClose }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Marca" />
      <TweakColor label="Color de acento" value={t.accent} options={['#4A90E2', '#00C85A', '#E84040', '#D4AF37']} onChange={(v) => setTweak('accent', v)} />
      <TweakSection label="Experiencia" />
      <TweakRadio label="Animaciones" value={t.anim} options={['Sobrio', 'Normal', 'Festivo']} onChange={(v) => setTweak('anim', v)} />
      <TweakRadio label="Rol" value={t.role} options={['Jugador', 'Admin / Tesorero']} onChange={(v) => setTweak('role', v)} />
      <TweakSection label="Pantallas especiales" />
      <TweakButton label="Ver cierre del torneo" onClick={() => setClose(true)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('stage')).render(<AppWeb />);
