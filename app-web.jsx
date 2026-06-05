/* ============================================================
   MundialBet Club 2026 — Versión WEB de escritorio (responsive)
   Shell sidebar + topbar y pantallas anchas. Reutiliza data.js +
   componentes. Envuelto en IIFE; se expone como window.AppWeb y lo
   monta el bootstrap responsive de index.html.
   ============================================================ */
(function () {
const { useState: useStateW, useEffect: useEffectW, useRef: useRefW } = React;
const Dw = window.MB;
const Mw = Dw.MASCOTS;
const {
  MascotAvatar, InitialAvatar, CoinBadge, Chip, Card, SectionHead, SegTabs,
  ProgressBar, BetButton, CountdownTimer, FeedItem, GoldButton, PrizePotCard,
  ResultBadge, EmptyState, useCountUp,
  Quiniela, Admin, TournamentClose,
  useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakButton,
} = window;

const TWEAK_DEFAULTS_W = /*EDITMODE-BEGIN*/{
  "accent": "#4A90E2",
  "anim": "Normal",
  "role": "Jugador"
}/*EDITMODE-END*/;

const NAV_W = [
  { id: 'inicio',   label: 'Inicio',   icon: '🏠' },
  { id: 'partidos', label: 'Partidos', icon: '⚽' },
  { id: 'equipos',  label: 'Equipos',  icon: '🌍' },
  { id: 'ranking',  label: 'Ranking',  icon: '🏆' },
  { id: 'liga',     label: 'Liga',     icon: '💰' },
  { id: 'perfil',   label: 'Perfil',   icon: '👤' },
  { id: 'feed',     label: 'Feed',     icon: '📣' },
];

const TITLES = {
  inicio: 'Inicio', partidos: 'Partidos', equipos: 'Equipos y grupos',
  ranking: 'Ranking', liga: 'Liga', perfil: 'Mi perfil', feed: 'Feed social',
  quiniela: 'Quiniela anónima', admin: 'Panel Admin',
};

// Todas las banderas de los equipos del Mundial (tomadas de los grupos)
const ALL_FLAGS = (function () {
  const seen = {}, out = [];
  Object.values(Dw.GROUP_STANDINGS).forEach(g => g.forEach(t => {
    if (!seen[t.flag]) { seen[t.flag] = 1; out.push(t.flag); }
  }));
  return out;
})();

// Convierte un emoji de bandera (2 indicadores regionales) a su código ISO ("br")
function flagToCode(flag) {
  const cps = Array.from(flag).map(c => c.codePointAt(0));
  const A = 0x1F1E6;
  if (cps.length < 2) return null;
  const a = cps[0] - A, b = cps[1] - A;
  if (a < 0 || a > 25 || b < 0 || b > 25) return null;
  return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
}
const FLAG_CODES = ALL_FLAGS.map(flagToCode).filter(Boolean);

// Muro decorativo de banderas (imágenes reales, no emojis) — fondo topbar/sidebar
function FlagWall({ vertical = false, size = 34, opacity = 0.1, repeat = 4 }) {
  const codes = [];
  for (let i = 0; i < repeat; i++) codes.push(...FLAG_CODES);
  const mask = vertical
    ? 'linear-gradient(180deg, transparent, #000 14%, #000 86%, transparent)'
    : 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)';
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      display: 'flex', flexWrap: vertical ? 'wrap' : 'nowrap',
      alignContent: 'flex-start', alignItems: 'center',
      gap: vertical ? 9 : 8, padding: vertical ? '16px 10px' : '0 10px',
      opacity, whiteSpace: vertical ? 'normal' : 'nowrap',
      WebkitMaskImage: mask, maskImage: mask,
    }}>
      {codes.map((c, i) => (
        <img key={i} src={`https://flagcdn.com/h60/${c}.png`} alt="" draggable="false" loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ height: Math.round(size * 0.66), width: 'auto', borderRadius: 3, display: 'block', flexShrink: 0 }} />
      ))}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({ tab, onTab, me, accent, role, onAdmin }) {
  const [installable, setInstallable] = useStateW(!!window.__deferredPrompt);
  useEffectW(() => {
    const on = () => setInstallable(true), off = () => setInstallable(false);
    window.addEventListener('mb-installable', on);
    window.addEventListener('mb-installed', off);
    return () => { window.removeEventListener('mb-installable', on); window.removeEventListener('mb-installed', off); };
  }, []);

  return (
    <aside style={{
      width: 248, flexShrink: 0, height: '100%', position: 'relative', overflow: 'hidden',
      background: 'rgba(8,15,10,0.92)', borderRight: '1px solid var(--border)',
    }}>
      <FlagWall vertical size={34} opacity={0.24} repeat={6} />
      <div style={{
        position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column',
        padding: '22px 16px',
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

      {/* CTA: instalar app + descargar APK */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {installable && (
          <button onClick={() => window.__triggerInstall && window.__triggerInstall()} className="mb-press" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px',
            borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #E6C04A, #C99B1F)', color: '#1A1206',
            fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', boxShadow: 'var(--glow-gold)',
          }}>💻 Instalar app</button>
        )}
        <a href="mundialbet.apk" download className="mb-press" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px',
          borderRadius: 'var(--r-pill)', textDecoration: 'none',
          background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-2)',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)',
        }}>⬇️ Descargar APK (Android)</a>
      </div>
      </div>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────
function Topbar({ tab, me }) {
  return (
    <header style={{
      height: 68, flexShrink: 0, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', borderBottom: '1px solid var(--border)', background: 'rgba(8,15,10,0.7)',
    }}>
      <FlagWall size={46} opacity={0.34} repeat={3} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, position: 'relative', zIndex: 1 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 'var(--t-2xl)' }}>{TITLES[tab] || ''}</h1>
        <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted-2)' }}>{Dw.LEAGUE.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
        <Chip tone="gold" icon={<span>🏆</span>}>Bote ${Dw.fmt(Dw.LEAGUE.pot)}</Chip>
        <CoinBadge amount={me.coins} />
        <MascotAvatar mascot={me.mascot} size={38} />
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD (Inicio)
// ════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════
//  PARTIDOS
// ════════════════════════════════════════════════════════════
function MatchCardWeb({ m, onPredict }) {
  return (
    <Card glow="var(--sh-2)" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Chip tone={m.next ? 'green' : 'blue'}>{m.next ? 'Abierto' : 'Próximo'}</Chip>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{m.group}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 38 }}>{m.flagH}</div>
          <div style={{ fontWeight: 700, marginTop: 4, fontSize: 'var(--t-sm)' }}>{m.home}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 70 }}>
          {m.next
            ? (<><div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>cierra en</div><CountdownTimer minutes={m.kickoffInMin} compact /></>)
            : (<div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>{m.when}</div>)}
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 38 }}>{m.flagA}</div>
          <div style={{ fontWeight: 700, marginTop: 4, fontSize: 'var(--t-sm)' }}>{m.away}</div>
        </div>
      </div>
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center' }}>📍 {m.stadium}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <BetButton label={m.home} odd={m.odds.home} />
        <BetButton label="Empate" odd={m.odds.draw} />
        <BetButton label={m.away} odd={m.odds.away} />
      </div>
      <GoldButton onClick={() => onPredict(m)}>Hacer pronóstico →</GoldButton>
    </Card>
  );
}

function PartidosWeb({ onPredict }) {
  const groups = Dw.UPCOMING.filter(x => x.stage === 'Grupos');
  const ko = Dw.UPCOMING.filter(x => x.stage !== 'Grupos');
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <SectionHead title="Fase de grupos · próximos" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 26 }}>
        {groups.map(m => <MatchCardWeb key={m.id} m={m} onPredict={onPredict} />)}
      </div>

      <SectionHead title="Camino a la final" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 26 }}>
        {ko.map(m => (
          <Card key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Chip tone="gold">{m.stage}</Chip>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{m.when}</div>
              <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {m.stadium}</div>
            </div>
          </Card>
        ))}
      </div>

      <SectionHead title="Resultados recientes" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {Dw.PLAYED.map(p => (
          <Card key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 'var(--t-sm)' }}>{p.home} {p.flagH}</div>
            <div className="num" style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', fontSize: 'var(--t-md)' }}>{p.sh}–{p.sa}</div>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 'var(--t-sm)' }}>{p.flagA} {p.away}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  EQUIPOS (grupos)
// ════════════════════════════════════════════════════════════
function GroupTableWeb({ letter, rows }) {
  return (
    <Card style={{ padding: '14px 16px' }}>
      <h3 className="display" style={{ margin: '0 0 10px', fontSize: 'var(--t-md)' }}>Grupo {letter}</h3>
      <div style={{ display: 'flex', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700, padding: '0 0 6px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ width: 18 }}>#</span>
        <span style={{ flex: 1 }}>Equipo</span>
        <span style={{ width: 26, textAlign: 'center' }}>J</span>
        <span style={{ width: 44, textAlign: 'center' }}>DG</span>
        <span style={{ width: 30, textAlign: 'center' }}>Pts</span>
      </div>
      {rows.map(r => {
        const q = r.pos <= 2;
        return (
          <div key={r.name} style={{
            display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
            boxShadow: q ? 'inset 3px 0 0 var(--success)' : 'none', paddingLeft: q ? 6 : 0,
          }}>
            <span style={{ width: 18, color: q ? 'var(--success)' : 'var(--muted-2)', fontWeight: 700, fontSize: 'var(--t-2xs)' }}>{r.pos}</span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--t-sm)', fontWeight: 600 }}>
              <span style={{ fontSize: 17 }}>{r.flag}</span>{r.name}
            </span>
            <span style={{ width: 26, textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.j}</span>
            <span style={{ width: 44, textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.gf - r.gc > 0 ? '+' : ''}{r.gf - r.gc}</span>
            <span className="num" style={{ width: 30, textAlign: 'center', color: 'var(--gold-light)' }}>{r.pts}</span>
          </div>
        );
      })}
    </Card>
  );
}

function EquiposWeb() {
  const gs = Dw.GROUP_STANDINGS;
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>
        <span style={{ color: 'var(--success)', fontWeight: 700 }}>Verde</span> = clasifica a octavos (top 2 de cada grupo).
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
        {Object.keys(gs).map(letter => <GroupTableWeb key={letter} letter={letter} rows={gs[letter]} />)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  RANKING
// ════════════════════════════════════════════════════════════
function PodiumWeb({ top3 }) {
  const order = [top3[1], top3[0], top3[2]]; // 2 - 1 - 3
  const heights = [104, 138, 86];
  const medals = ['🥈', '🥇', '🥉'];
  const tones = ['var(--muted)', 'var(--gold)', 'var(--can-light)'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
      {order.map((u, i) => (
        <div key={u.id} style={{ flex: '0 0 168px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{medals[i]}</div>
          <MascotAvatar mascot={u.mascot} size={i === 1 ? 64 : 52} glow={i === 1} jersey />
          <div style={{ fontWeight: 700, marginTop: 8, fontSize: 'var(--t-sm)' }}>{u.name}</div>
          <div className="num" style={{ fontSize: 'var(--t-xl)', color: 'var(--gold-light)' }}>{u.pts}<span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}> pts</span></div>
          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--success)', fontWeight: 700 }}>ROI +{u.roi}%</div>
          <div style={{
            width: '100%', height: heights[i], marginTop: 10, borderRadius: '10px 10px 0 0',
            background: `linear-gradient(180deg, ${tones[i]}40, ${tones[i]}10)`, border: `1px solid ${tones[i]}55`, borderBottom: 'none',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8,
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--t-2xl)', color: tones[i],
          }}>{u.rank}</div>
        </div>
      ))}
    </div>
  );
}

function RankingWeb() {
  const users = Dw.USERS;
  const [period, setPeriod] = useStateW('Torneo completo');
  const cell = { fontSize: 'var(--t-sm)' };
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto 20px' }}>
        <SegTabs options={['Esta semana', 'Este mes', 'Torneo completo']} value={period} onChange={setPeriod} />
      </div>
      <PodiumWeb top3={users.slice(0, 3)} />
      <Card style={{ padding: '4px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span style={{ width: 34 }}>#</span>
          <span style={{ flex: 1 }}>Jugador</span>
          <span style={{ width: 110 }}>Equipo</span>
          <span style={{ width: 80, textAlign: 'center' }}>Aciertos</span>
          <span style={{ width: 70, textAlign: 'center' }}>ROI</span>
          <span style={{ width: 60, textAlign: 'center' }}>Pts</span>
          <span style={{ width: 110, textAlign: 'right' }}>Monedas</span>
        </div>
        {users.map(u => {
          const isMe = u.me;
          return (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: isMe ? 'var(--info-bg)' : 'transparent', borderRadius: isMe ? 'var(--r-sm)' : 0,
              boxShadow: isMe ? 'inset 3px 0 0 var(--info)' : 'none', paddingLeft: isMe ? 8 : 0,
            }}>
              <span className="num" style={{ width: 34, color: u.rank <= 3 ? 'var(--gold-light)' : 'var(--muted)', fontSize: 'var(--t-md)' }}>{u.rank}</span>
              <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <InitialAvatar user={u} size={34} />
                <span style={{ fontWeight: 700, ...cell }}>{u.name}{isMe && <span style={{ color: 'var(--info)', fontWeight: 700 }}> · tú</span>}</span>
              </span>
              <span style={{ width: 110, fontSize: 'var(--t-2xs)', color: Mw[u.mascot].light, fontWeight: 700 }}>{Mw[u.mascot].emoji} {Mw[u.mascot].name}</span>
              <span style={{ width: 80, textAlign: 'center', ...cell, color: 'var(--muted)' }}>{u.hits}%</span>
              <span style={{ width: 70, textAlign: 'center', ...cell, color: u.roi >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{u.roi >= 0 ? '+' : ''}{u.roi}%</span>
              <span className="num" style={{ width: 60, textAlign: 'center', color: 'var(--gold-light)' }}>{u.pts}</span>
              <span style={{ width: 110, display: 'flex', justifyContent: 'flex-end' }}><CoinBadge amount={u.coins} size="sm" /></span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  LIGA
// ════════════════════════════════════════════════════════════
function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 'var(--t-sm)', fontWeight: 700, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function LigaWeb() {
  const L = Dw.LEAGUE;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 20, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PrizePotCard />
        <div>
          <SectionHead title="Distribución del premio" />
          <Card style={{ padding: '6px 16px' }}>
            {L.distribution.map((d, i) => {
              const u = Dw.userById(d.userId);
              return (
                <div key={d.place} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 22 }}>{d.medal}</span>
                  <MascotAvatar mascot={u.mascot} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{u.name}</div>
                    <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{d.pct}% del bote</div>
                  </div>
                  <span className="num" style={{ color: 'var(--gold-light)', fontSize: 'var(--t-lg)' }}>{Dw.clp(d.amount)}</span>
                </div>
              );
            })}
          </Card>
        </div>
        <div>
          <SectionHead title="Información de la liga" />
          <Card>
            <InfoRow label="Nombre" value={L.name} />
            <InfoRow label="Código" value={L.code} />
            <InfoRow label="Entrada" value={Dw.clp(L.entry)} />
            <InfoRow label="Tesorero" value={L.treasurer} />
            <InfoRow label="Banco" value={L.bank} />
            <InfoRow label="Plazo de pago" value={L.deadline} />
          </Card>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <SectionHead title={`Pagos · ${L.paidCount}/${L.total}`} />
          <Card>
            <div style={{ marginBottom: 12 }}><ProgressBar value={L.paidCount} total={L.total} tone="green" /></div>
            {Dw.USERS.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <MascotAvatar mascot={u.mascot} size={30} />
                <span style={{ flex: 1, fontSize: 'var(--t-sm)', fontWeight: 600 }}>{u.name}</span>
                {u.paid
                  ? <Chip tone="green" icon={<span>✓</span>}>Pagado {u.paidDate}</Chip>
                  : <Chip tone="red">Pendiente</Chip>}
              </div>
            ))}
          </Card>
        </div>
        <div>
          <SectionHead title="Transparencia (log)" />
          <Card style={{ padding: '6px 16px', maxHeight: 280, overflow: 'auto' }}>
            {Dw.LOG.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < Dw.LOG.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span className="mono" style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', width: 38, flexShrink: 0 }}>{l.date}</span>
                <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{l.text}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PERFIL
// ════════════════════════════════════════════════════════════
function Sparkline({ data, w = 300, h = 70 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = data[data.length - 1], first = data[0];
  const up = last >= first;
  const color = up ? 'var(--success)' : 'var(--danger)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PerfilWeb({ me }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 20, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card style={{ textAlign: 'center', padding: '24px 18px' }}>
          <div style={{ display: 'inline-block' }}><MascotAvatar mascot={me.mascot} size={88} glow jersey /></div>
          <h2 className="display" style={{ margin: '14px 0 2px', fontSize: 'var(--t-2xl)' }}>{me.name}</h2>
          <div style={{ color: Mw[me.mascot].light, fontWeight: 700, fontSize: 'var(--t-sm)' }}>Equipo {Mw[me.mascot].name} · {Mw[me.mascot].role}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <MetricW label="Posición" value={'#' + me.rank} tone="var(--info)" icon="📊" />
            <MetricW label="Puntos" value={me.pts} tone="var(--gold-light)" icon="🏆" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <MetricW label="Aciertos" value={me.hits + '%'} tone="var(--success)" icon="🎯" />
            <MetricW label="ROI" value={'+' + me.roi + '%'} tone="var(--success)" icon="📈" />
          </div>
        </Card>
        <div>
          <SectionHead title="Logros" />
          <Card style={{ padding: '6px 16px' }}>
            {Dw.ACHIEVEMENTS.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: i < Dw.ACHIEVEMENTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: a.unlocked ? 1 : 0.45 }}>
                <MascotAvatar mascot={a.mascot} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{a.name}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{a.note}</div>
                </div>
                <span>{a.unlocked ? '✅' : '🔒'}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <SectionHead title="Evolución de monedas" />
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span className="num" style={{ fontSize: 'var(--t-3xl)', color: 'var(--gold-light)' }}>{Dw.fmt(me.coins)}</span>
              <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>monedas actuales</span>
            </div>
            <Sparkline data={Dw.COIN_HISTORY} />
          </Card>
        </div>
        <div>
          <SectionHead title="Mi historial de apuestas" />
          <Card style={{ padding: '4px 16px' }}>
            {Dw.MY_BETS.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < Dw.MY_BETS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{b.match}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{b.bet}</div>
                </div>
                <ResultBadge result={b.result} pts={b.pts} />
                <span className="num" style={{ width: 70, textAlign: 'right', color: b.delta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{b.delta >= 0 ? '+' : ''}{Dw.fmt(b.delta)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  FEED
// ════════════════════════════════════════════════════════════
function FeedWeb({ onNav }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 20, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div>
        <SectionHead title="Actividad reciente" />
        <Card style={{ padding: '0 18px' }}>
          {Dw.FEED.map((f, i) => <FeedItem key={i} item={f} delay={i * 0.05} />)}
        </Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <SectionHead title="Mercados especiales" />
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Dw.SPECIALS.map((s, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {s.options.slice(0, 4).map((o, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--r-sm)', background: 'var(--surface-1)' }}>
                      <span style={{ fontSize: 16 }}>{o.flag}</span>
                      <span style={{ flex: 1, fontSize: 'var(--t-sm)' }}>{o.name}</span>
                      <span className="num" style={{ color: 'var(--gold-light)', fontSize: 'var(--t-sm)' }}>{o.odd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  APP WEB
// ════════════════════════════════════════════════════════════
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

  // Pantallas de escritorio (anchas) + reuso de Quiniela/Admin centrados
  const desktop = {
    inicio:   <DashboardWeb me={me} onNav={goTab} onPredict={() => goTab('quiniela')} />,
    partidos: <PartidosWeb onPredict={() => goTab('quiniela')} />,
    equipos:  <EquiposWeb />,
    ranking:  <RankingWeb />,
    liga:     <LigaWeb />,
    perfil:   <PerfilWeb me={me} />,
    feed:     <FeedWeb onNav={goTab} />,
  };
  const centered = {
    quiniela: <Quiniela />,
    admin:    <Admin onCloseTournament={() => setCloseScreen(true)} />,
  };
  const isCentered = !!centered[tab];

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', overflow: 'hidden', background: '#0c2114' }}>
      <Sidebar tab={tab} onTab={goTab} me={me} accent={accent} role={t.role} onAdmin={() => goTab('admin')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar tab={tab} me={me} />
        <main ref={mainRef} className="mb-main-pitch" style={{ flex: 1, overflow: 'auto', padding: '24px 28px 60px' }}>
          <div style={{ maxWidth: isCentered ? 760 : 1180, margin: '0 auto' }}>
            {isCentered ? centered[tab] : desktop[tab]}
          </div>
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

// ── Export (lo monta el bootstrap responsive de index.html) ──
window.AppWeb = AppWeb;
})();
