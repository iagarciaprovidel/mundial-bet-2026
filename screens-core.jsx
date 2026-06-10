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

  const steps = [
    { emoji: '🏆', title: '¡Bienvenido a MundialBet Club 2026!',
      body: 'Demuestra que sabes más de fútbol que todos tus amigos y tu familia. 🔥', accent: 'var(--gold-light)' },
    { emoji: '💰', title: 'Tienes 90.000 puntos',
      body: 'Apuesta al ganador de cada partido. Si aciertas, ganas según la cuota: mientras más arriesgas, más ganas.', accent: 'var(--mex-light)' },
    { emoji: '📈', title: 'Sube en el ranking',
      body: 'El que más puntos junte, manda. Crea tu equipo, invita a tu gente y a competir. ¡Mucha suerte!', accent: 'var(--usa-light)' },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;

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
        <div style={{ position: 'relative', marginBottom: 22 }}>
          <div style={{ position: 'absolute', inset: -30, borderRadius: '50%', background: `radial-gradient(circle, ${cur.accent}33, transparent 70%)` }} />
          <div style={{ position: 'relative', fontSize: 96, lineHeight: 1, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.55))', animation: step === 0 ? 'mb-bounce 1.4s var(--ease-spring) infinite' : 'none' }}>{cur.emoji}</div>
        </div>
        <h1 className="display" style={{ fontSize: 'var(--t-3xl)', margin: '0 0 12px', color: cur.accent, maxWidth: 300, textWrap: 'balance', textShadow: '0 1px 3px rgba(0,0,0,0.92), 0 2px 16px rgba(0,0,0,0.55)' }}>{cur.title}</h1>
        <p style={{ fontSize: 'var(--t-md)', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, maxWidth: 290, margin: 0, textShadow: '0 1px 10px rgba(0,0,0,0.65)' }}>{cur.body}</p>
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

      {!last
        ? <button onClick={() => setStep(step + 1)} className="mb-press" style={{
            width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', position: 'relative', zIndex: 1,
            background: 'var(--surface-1)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-md)', cursor: 'pointer',
          }}>Continuar</button>
        : <div style={{ position: 'relative', zIndex: 1 }}><GoldButton onClick={() => onFinish('zayu')}>¡Empezar a jugar!</GoldButton></div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DASHBOARD (Inicio)
// ─────────────────────────────────────────────────────────
function Metric({ label, value, tone, icon }) {
  return (
    <Card style={{ padding: '9px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
      <div className="num" style={{ fontSize: 'var(--t-xl)', color: tone, lineHeight: 1.1 }}>{value}</div>
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
  const _msNext = fallback[0] ? (new Date(fallback[0].kickoff).getTime() - _now) : -1;
  const daysLeft = Math.max(0, Math.floor(_msNext / 86400000)); // mismo redondeo que la cuenta regresiva
  const hr = new Date().getHours();
  const saludo = hr < 12 ? '¡Buenos días,' : hr < 19 ? '¡Buenas tardes,' : '¡Buenas noches,';
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const greetName = (authUser && authUser.displayName) ? authUser.displayName : null;
  // Datos reales del jugador
  const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
  const [hdrUsers, setHdrUsers] = useStateC([]);
  useEffectC(() => {
    if (!authUser || !window.MBFirebase || !window.MBFirebase.subscribeUsers) { setHdrUsers([]); return undefined; }
    const un = window.MBFirebase.subscribeUsers(setHdrUsers);
    return () => { if (typeof un === 'function') un(); };
  }, [authUser]);
  const SAL = 90000;
  const fmtN = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  const saldoOfU = (u) => (u && typeof u.saldo === 'number') ? u.saldo : SAL;
  const meRec = authUser ? hdrUsers.find(u => u.uid === authUser.uid) : null;
  const myPts = meRec ? saldoOfU(meRec) : (store && typeof store.saldo === 'number' ? store.saldo : SAL);
  const myPos = meRec ? (hdrUsers.slice().sort((a, b) => saldoOfU(b) - saldoOfU(a)).findIndex(u => u.uid === authUser.uid) + 1) : 0;
  const myBets = (store && authUser) ? Object.keys(store.bets).map(k => store.bets[k]) : [];
  const mySettled = myBets.filter(b => b.status === 'won' || b.status === 'lost');
  const myAcc = mySettled.length ? Math.round((mySettled.filter(b => b.status === 'won').length / mySettled.length) * 100) : 0;

  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* saludo */}
      <div>
        <h1 className="display" style={{ fontSize: 'var(--t-2xl)', margin: '4px 0 2px', color: 'var(--text)' }}>
          {greetName ? <>{saludo} {greetName}!</> : <>¡Hola! 👋</>} <span style={{ fontSize: 22 }}>{Mc[me.mascot].emoji}</span>{greetName && window.MB_champFlag && window.MB_champFlag(meRec && meRec.championCode, meRec && meRec.champion, 16)}
        </h1>
        {authUser && (meRec && meRec.groupName
          ? <button onClick={() => window.MB_openTeamMembers && window.MB_openTeamMembers()} className="mb-press" title="Ver integrantes de tu equipo" style={{ background: 'none', border: 'none', padding: 0, margin: '0 0 3px', cursor: 'pointer', fontSize: 'var(--t-xs)', fontWeight: 800, color: 'var(--gold-light)' }}>👥 {meRec.groupName}</button>
          : <div style={{ margin: '0 0 3px', fontSize: 'var(--t-xs)', fontWeight: 700, color: 'var(--muted-2)' }}>{meRec && meRec.noGroup ? '🙋 Juegas individual' : 'Sin equipo'}</div>)}
        <p style={{ margin: 0, color: _msNext > 0 ? 'var(--gold-light)' : 'var(--muted)', fontSize: 'var(--t-sm)', fontWeight: 700 }}>
          {_msNext <= 0 ? <>¡El Mundial 2026 ya comenzó! ⚡</> : daysLeft === 0 ? <>¡El Mundial 2026 empieza hoy! 🔥</> : daysLeft === 1 ? <>Falta 1 día para el Mundial 2026 🏆</> : <>Faltan {daysLeft} días para el Mundial 2026 🏆</>}
        </p>
      </div>

      {/* métricas 2x2 (reales) */}
      {authUser ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Metric label="Mis monedas" value={fmtN(myPts)} tone="var(--gold-light)" icon="⚽" />
          <Metric label="Posición" value={myPos ? '#' + myPos : '—'} tone="var(--usa-light)" icon="📊" />
          <Metric label="Apuestas" value={String(myBets.length)} tone="var(--text)" icon="🎟️" />
          <Metric label="Aciertos" value={mySettled.length ? myAcc + '%' : '—'} tone="var(--success)" icon="🎯" />
        </div>
      ) : (
        window.MB_SignInNote ? React.createElement(window.MB_SignInNote, { text: 'Inicia sesión para ver tus monedas, posición y apuestas.', card: true }) : null
      )}

      {/* Cuenta regresiva al próximo partido */}
      {window.MB_NextMatchCountdown && React.createElement(window.MB_NextMatchCountdown)}

      {/* Pronóstico del campeón (gratis) */}
      {window.MB_ChampionPick && React.createElement(window.MB_ChampionPick)}

      {/* partidos del día: apostables; los terminados aparecen al final con el marcador */}
      {(() => {
        const day = window.MB_dayFixtures ? window.MB_dayFixtures(store ? store.odds : {}) : { list: [], today: false };
        const list = day.list.length ? day.list : fallback;
        if (!list.length) return null;
        return (
          <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', padding: '14px 14px', boxShadow: 'var(--sh-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>{day.today ? 'Partidos de hoy' : 'Próximos partidos'} <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 400 }}>· {list.length}</span></h3>
              <button onClick={() => onNav('partidos')} className="mb-press" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(212,175,55,0.55)', background: 'var(--coin-bg)', color: 'var(--gold-light)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap' }}>Ver todos →</button>
            </div>
            <div>
              {window.MobileFixtureCard
                ? list.map(m => React.createElement(window.MobileFixtureCard, { key: m.id, m: m }))
                : fallback.map((m, idx) => <NextMatchCard key={m.id} m={m} featured={idx === 0} daysLeft={daysLeft} onPredict={onPredict} />)}
            </div>
          </div>
        );
      })()}

      {/* Equipos de apostadores (abajo) */}
      {window.MB_GroupsHome && React.createElement(window.MB_GroupsHome)}

      {/* jugadores registrados (real) — título dentro de la card */}
      <Card title="Apostadores" action="Ver ranking" onAction={() => onNav('ranking')} style={{ padding: '14px 14px' }}>
        {window.MB_RankingReal ? React.createElement(window.MB_RankingReal, { compact: true, limit: 5 }) : null}
      </Card>
    </div>
  );
}

Object.assign(window, { Onboarding, Dashboard, PrizePotCard });
