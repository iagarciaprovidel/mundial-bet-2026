/* ============================================================
   Screens: Onboarding + Dashboard (Inicio)
   ============================================================ */
const { useState: useStateC, useEffect: useEffectC } = React;
const Dc = window.MB;
const Mc = Dc.MASCOTS;
const {
  MascotAvatar, MascotImg, CoinBadge, Chip, Card, SectionHead, ProgressBar,
  BetButton, CountdownTimer, FeedItem, GoldButton, useCountUp, Confetti, ResultBadge,
} = window;

// ─────────────────────────────────────────────────────────
// ONBOARDING (3 pasos)
// ─────────────────────────────────────────────────────────
function Onboarding({ onFinish }) {
  const [step, setStep] = useStateC(0);
  const [chosen, setChosen] = useStateC('zayu');

  const steps = [
    { mascot: 'zayu', title: '¡Bienvenido a MundialBet Club 2026!',
      body: 'Aquí vas a demostrar que sabes más de fútbol que todos tus amigos. 🔥', accent: 'var(--mex-light)' },
    { mascot: 'maple', title: 'El juego es justo',
      body: 'Todos ven los pronósticos pero nadie sabe quién apostó qué… hasta que el partido comienza. 🔒', accent: 'var(--can-light)' },
    { mascot: 'clutch', title: 'Elige tu mascota',
      body: 'Ella definirá tu estilo y tu color en el grupo.', accent: 'var(--usa-light)' },
  ];
  const cur = steps[step];

  return (
    <div className="mb-app-bg" style={{
      height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
      padding: '70px 24px 30px',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 70% at 50% 10%, ${cur.accent}26, transparent 58%)`, transition: 'background var(--dur-slow) var(--ease-out)', pointerEvents: 'none' }} />
      {/* logo */}
      <div style={{ textAlign: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          {['us', 'mx', 'ca'].map(c => (
            <img key={c} src={`https://flagcdn.com/h20/${c}.png`} alt="" style={{ height: 13, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
          ))}
          <span className="eyebrow" style={{ color: 'var(--gold-light)', marginLeft: 3, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>MUNDIAL 2026</span>
        </div>
      </div>

      <div key={step} style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <div style={{
            position: 'absolute', inset: -24, borderRadius: '50%',
            background: `radial-gradient(circle, ${cur.accent}33, transparent 70%)`,
          }} />
          <div style={{ position: 'relative', animation: step === 0 ? 'mb-bounce 1.4s var(--ease-spring) infinite' : 'none' }}>
            <MascotAvatar mascot={cur.mascot} size={140} glow jersey />
          </div>
        </div>
        <h1 className="display" style={{ fontSize: 'var(--t-3xl)', margin: '0 0 12px', color: cur.accent, maxWidth: 300, textWrap: 'balance', textShadow: '0 1px 3px rgba(0,0,0,0.92), 0 2px 16px rgba(0,0,0,0.55)' }}>{cur.title}</h1>
        <p style={{ fontSize: 'var(--t-md)', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, maxWidth: 290, margin: 0, textShadow: '0 1px 10px rgba(0,0,0,0.65)' }}>{cur.body}</p>

        {step === 2 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
            {['zayu', 'maple', 'clutch'].map(id => {
              const mm = Mc[id], active = chosen === id;
              return (
                <button key={id} onClick={() => setChosen(id)} className="mb-press" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '12px 8px', width: 86, borderRadius: 'var(--r-lg)',
                  background: active ? `${mm.color}22` : 'var(--surface-1)',
                  border: active ? `1.5px solid ${mm.light}` : '1.5px solid var(--border)',
                  boxShadow: active ? `0 0 16px ${mm.light}55` : 'none', transition: 'all var(--dur-base) var(--ease-out)',
                }}>
                  <MascotAvatar mascot={id} size={46} ring={active} />
                  <span style={{ fontSize: 'var(--t-2xs)', fontWeight: 700, color: active ? mm.light : 'var(--muted)' }}>Equipo {mm.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* indicadores */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, position: 'relative', zIndex: 1 }}>
        {steps.map((_, i) => (
          <span key={i} style={{
            width: i === step ? 22 : 8, height: 8, borderRadius: 999,
            background: i === step ? 'var(--gold)' : 'var(--surface-2)', transition: 'all var(--dur-base) var(--ease-out)',
          }} />
        ))}
      </div>

      {step < 2
        ? <button onClick={() => setStep(step + 1)} className="mb-press" style={{
            width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', position: 'relative', zIndex: 1,
            background: 'var(--surface-1)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-md)', cursor: 'pointer',
          }}>Continuar</button>
        : <div style={{ position: 'relative', zIndex: 1 }}><GoldButton onClick={() => onFinish(chosen)}>¡Empezar a jugar!</GoldButton></div>}
      <button onClick={() => onFinish('zayu')} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 'var(--t-2xs)', marginTop: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', position: 'relative', zIndex: 1, textShadow: '0 1px 8px rgba(0,0,0,0.6)',
      }}>Saltar introducción</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DASHBOARD (Inicio)
// ─────────────────────────────────────────────────────────
function Metric({ label, value, tone, icon }) {
  return (
    <Card style={{ padding: '14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div className="num" style={{ fontSize: 'var(--t-2xl)', color: tone }}>{value}</div>
    </Card>
  );
}

function PrizePotCard({ animate = true }) {
  const L = Dc.LEAGUE;
  const amount = useCountUp(animate ? L.pot : L.pot, 1200);
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-xl)', padding: 'var(--sp-5)',
      background: 'linear-gradient(150deg, rgba(212,175,55,0.14), rgba(17,24,39,0.6))',
      border: '1.5px solid rgba(212,175,55,0.45)', animation: 'mb-glow-breathe 3.5s var(--ease-out) infinite',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -20, fontSize: 120, opacity: 0.08 }}>🏆</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <span className="eyebrow" style={{ color: 'var(--gold-light)' }}>Bote del torneo</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-pill)', padding: '2px 7px' }}>Ejemplo</span>
      </div>
      <div className="num" style={{ fontSize: 'var(--t-5xl)', color: 'var(--gold-light)', lineHeight: 1 }}>
        ${Dc.fmt(amount)}<span style={{ fontSize: 'var(--t-lg)', color: 'var(--gold)', marginLeft: 6 }}>CLP</span>
      </div>
      <div style={{ margin: '16px 0 8px' }}><ProgressBar value={L.paidCount} total={L.total} tone="gold" /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-sm)', color: 'var(--success)', fontWeight: 700 }}>
        <span>✓</span> {L.paidCount}/{L.total} pagaron · ¡Todos listos para jugar!
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {L.distribution.map(d => (
          <div key={d.place} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14 }}>{d.medal}</div>
            <div className="num" style={{ fontSize: 'var(--t-sm)', color: 'var(--gold-light)', marginTop: 2 }}>${Dc.fmt(d.amount / 1000)}k</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextMatchCard({ m, featured, daysLeft, onPredict }) {
  const d = new Date(m.kickoff);
  const fecha = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const Side = ({ name, code }) => (
    <div onClick={() => { if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(name); }} className="mb-press" title={`Ver ${name}`} style={{ flex: 1, textAlign: 'center', minWidth: 0, cursor: 'pointer' }}>
      <img src={`https://flagcdn.com/h60/${code}.png`} alt="" style={{ height: 34, width: 'auto', borderRadius: 4, boxShadow: '0 1px 5px rgba(0,0,0,0.55)' }} />
      <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: 'var(--text)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
    </div>
  );
  return (
    <Card style={{
      background: featured ? 'linear-gradient(150deg, rgba(46,139,192,0.22), rgba(11,17,13,0.96))' : 'rgba(11,17,13,0.94)',
      borderColor: featured ? 'rgba(46,139,192,0.5)' : 'var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Chip tone="blue">Grupo {m.group} · J{m.md}</Chip>
        {featured && daysLeft > 0
          ? <Chip tone="gold" icon={<span>⏳</span>}>Faltan {daysLeft} días</Chip>
          : <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'capitalize' }}>{fecha} · {hora}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Side name={m.home} code={m.homeCode} />
        <span style={{ fontSize: 'var(--t-sm)', color: 'var(--muted-2)', fontWeight: 700 }}>vs</span>
        <Side name={m.away} code={m.awayCode} />
      </div>
      {featured && (
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', textAlign: 'center', fontWeight: 700, textTransform: 'capitalize', marginBottom: 4 }}>📅 {fecha} · {hora}</div>
      )}
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: featured ? 12 : 0 }}>📍 {m.stadium}</div>
      {featured && <GoldButton onClick={onPredict}>Hacer pronóstico →</GoldButton>}
    </Card>
  );
}

function Dashboard({ user, onNav, onPredict }) {
  const me = user;
  const top3 = Dc.USERS.slice(0, 3);
  const _now = Date.now();
  const _fx = ((window.MB.WC_FIXTURES) || []).slice().sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1));
  const upcoming = _fx.filter(m => new Date(m.kickoff).getTime() > _now).slice(0, 3);
  const fallback = upcoming.length ? upcoming : _fx.slice(0, 3);
  const daysLeft = fallback[0] ? Math.max(0, Math.ceil((new Date(fallback[0].kickoff).getTime() - _now) / 86400000)) : 0;
  const hr = new Date().getHours();
  const saludo = hr < 12 ? '¡Buenos días,' : hr < 19 ? '¡Buenas tardes,' : '¡Buenas noches,';
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const greetName = (authUser && authUser.displayName) ? authUser.displayName.split(' ')[0] : null;

  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* saludo */}
      <div>
        <h1 className="display" style={{ fontSize: 'var(--t-2xl)', margin: '4px 0 2px', color: 'var(--text)' }}>
          {greetName ? <>{saludo} {greetName}!</> : <>¡Hola! 👋</>} <span style={{ fontSize: 22 }}>{Mc[me.mascot].emoji}</span>
        </h1>
        <p style={{ margin: 0, color: daysLeft > 0 ? 'var(--gold-light)' : 'var(--muted)', fontSize: 'var(--t-sm)', fontWeight: 700 }}>
          {daysLeft > 0 ? <>Faltan {daysLeft} días para el Mundial 2026 🏆</> : <>Llevas {me.streak} aciertos seguidos ⚡</>}
        </p>
      </div>

      {/* métricas 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Metric label="Mis monedas" value={Dc.fmt(me.coins)} tone="var(--gold-light)" icon="⚽" />
        <Metric label="Posición" value={'#' + me.rank} tone="var(--usa-light)" icon="📊" />
        <Metric label="Aciertos" value={me.hits + '%'} tone="var(--success)" icon="🎯" />
        <Metric label="ROI" value={(me.roi >= 0 ? '+' : '') + me.roi + '%'} tone={me.roi >= 0 ? 'var(--success)' : 'var(--danger)'} icon="📈" />
      </div>
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center', marginTop: -8 }}>📊 Datos de ejemplo · el torneo aún no comienza</div>

      {/* Equipos de apostadores (creados por los usuarios) */}
      {window.MB_GroupsHome && React.createElement(window.MB_GroupsHome)}

      {/* próximos partidos */}
      <div>
        <SectionHead title="Próximos partidos" action="Ver todos" onAction={() => onNav('partidos')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fallback.map((m, idx) => (
            <NextMatchCard key={m.id} m={m} featured={idx === 0} daysLeft={daysLeft} onPredict={onPredict} />
          ))}
        </div>
      </div>

      {/* Botón a Equipos y Grupos */}
      <div>
        <button onClick={() => onNav('equipos')} style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 'var(--r-lg)',
          border: '1.5px solid var(--usa-light)',
          background: 'rgba(46,139,192,0.1)',
          color: 'var(--text)',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: 'var(--t-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all var(--dur-base) var(--ease-out)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(46,139,192,0.2)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(46,139,192,0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}>
          🌍 Ver Equipos y Grupos
        </button>
      </div>

      {/* jugadores registrados (real) */}
      <div>
        <SectionHead title="Jugadores" action="Ver ranking" onAction={() => onNav('ranking')} />
        <Card style={{ padding: '6px 14px' }}>
          {window.MB_RankingReal ? React.createElement(window.MB_RankingReal, { compact: true, limit: 5 }) : null}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding, Dashboard, PrizePotCard });
