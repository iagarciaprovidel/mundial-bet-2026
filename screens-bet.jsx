/* ============================================================
   Screens: Partidos (cuotas + apuesta) + Quiniela (anonimato)
   ============================================================ */
const { useState: useStateB, useEffect: useEffectB } = React;
const Db = window.MB;
const Mb = Db.MASCOTS;
const {
  MascotAvatar, InitialAvatar, CoinBadge, Chip, Card, SectionHead, SegTabs,
  BetButton, CountdownTimer, GoldButton, ResultBadge,
} = window;

// ─────────────────────────────────────────────────────────
// PARTIDOS
// ─────────────────────────────────────────────────────────
function MatchBetCard({ match }) {
  // Si es de fase de grupos (tiene home/away) mostrar detalles completos
  const isGroupMatch = !!match.home;
  
  if (!isGroupMatch) {
    // Mostrar solo fecha y estadio para octavos, cuartos, semis, final
    return (
      <Card hover style={{ marginBottom: 12, padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: 'var(--text)', marginBottom: 4 }}>
              📅 {match.when}
            </div>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>
              🏟️ {match.stadium}
            </div>
          </div>
          <Chip tone="blue">{match.stage}</Chip>
        </div>
      </Card>
    );
  }

  // Partidos de grupos con apuestas
  const [sel, setSel] = useStateB(null);
  const [amount, setAmount] = useStateB(200);
  const [done, setDone] = useStateB(false);
  const odds = match.odds;
  const buttons = [
    { k: 'home', label: match.home, odd: odds.home },
    { k: 'draw', label: 'Empate', odd: odds.draw },
    { k: 'away', label: match.away, odd: odds.away },
    { k: 'over', label: '+2.5 goles', odd: odds.over },
    { k: 'under', label: '-2.5 goles', odd: odds.under },
  ];
  const selOdd = buttons.find(b => b.k === sel)?.odd;
  const win = selOdd ? Math.round(amount * selOdd) : 0;

  return (
    <Card hover style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Chip tone={match.live ? 'red' : 'green'} live={match.live}>{match.live ? 'En vivo' : 'Abierto'}</Chip>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{match.group} · {match.when}</span>
      </div>
      
      {/* Información del estadio */}
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginBottom: 10, fontWeight: 600 }}>
        🏟️ {match.stadium}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 28 }}>{match.flagH}</span>
          <span style={{ fontWeight: 700, fontSize: 'var(--t-md)' }}>{match.home}</span>
        </div>
        {match.next
          ? <div style={{ textAlign: 'center' }}><CountdownTimer minutes={match.kickoffInMin} compact /></div>
          : <span style={{ color: 'var(--muted-2)', fontWeight: 700 }}>vs</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--t-md)' }}>{match.away}</span>
          <span style={{ fontSize: 28 }}>{match.flagA}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {buttons.slice(0, 3).map(b => <BetButton key={b.k} {...b} selected={sel === b.k} onClick={() => { setSel(b.k); setDone(false); }} />)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {buttons.slice(3).map(b => <BetButton key={b.k} {...b} selected={sel === b.k} onClick={() => { setSel(b.k); setDone(false); }} />)}
        <div style={{ flex: 1 }} />
      </div>

      {sel && !done && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)' }}>Monedas a apostar</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setAmount(a => Math.max(50, a - 50))} className="mb-press" style={stepBtn}>−</button>
              <span className="mono" style={{ minWidth: 56, textAlign: 'center', fontWeight: 700, color: 'var(--gold-light)' }}>{Db.fmt(amount)}</span>
              <button onClick={() => setAmount(a => a + 50)} className="mb-press" style={stepBtn}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)', marginBottom: 10 }}>
            <span style={{ fontSize: 'var(--t-xs)', color: 'var(--success)' }}>Posible ganancia</span>
            <CoinBadge amount={win} />
          </div>
          <GoldButton onClick={() => setDone(true)}>Confirmar apuesta</GoldButton>
        </div>
      )}
      {done && (
        <div style={{ marginTop: 14, padding: '12px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 10, animation: 'mb-pop var(--dur-base) var(--ease-spring)' }}>
          <MascotAvatar mascot="zayu" size={36} />
          <div style={{ fontSize: 'var(--t-sm)', color: 'var(--success)', fontWeight: 700 }}>¡Apuesta registrada! Zayu confía en ti 🔥</div>
        </div>
      )}
    </Card>
  );
}
const stepBtn = {
  width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
};

function PlayedCard({ m }) {
  return (
    <Card style={{ marginBottom: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Chip tone="neutral" icon={<span>✓</span>}>Finalizado</Chip>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>{m.group}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 24 }}>{m.flagH}</span><span style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{m.home}</span>
        </div>
        <span className="num" style={{ fontSize: 'var(--t-xl)', padding: '0 12px' }}>{m.sh} <span style={{ color: 'var(--muted-2)' }}>—</span> {m.sa}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{m.away}</span><span style={{ fontSize: 24 }}>{m.flagA}</span>
        </div>
      </div>
    </Card>
  );
}

function SpecialMarket({ market }) {
  const [sel, setSel] = useStateB(null);
  return (
    <Card style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', marginBottom: 10, color: 'var(--gold-light)' }}>🏆 {market.label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {market.options.map(o => {
          const active = sel === o.name;
          return (
            <button key={o.name} onClick={() => setSel(active ? null : o.name)} className="mb-press" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', cursor: 'pointer',
              borderRadius: 'var(--r-md)', background: active ? 'var(--coin-bg)' : 'var(--surface-2)',
              border: active ? '1.5px solid var(--gold)' : '1px solid var(--border-2)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text)' }}>
                <span style={{ fontSize: 18 }}>{o.flag}</span>{o.name}
              </span>
              <span className="num" style={{ color: active ? 'var(--gold-light)' : 'var(--text)' }}>{o.odd.toFixed(2)}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// Tarjeta de partido real (móvil) — datos del Mundial 2026
function MobileFixtureCard({ m }) {
  const d = new Date(m.kickoff);
  const fecha = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const openTeam = (name, code) => { if (code && window.MB_openTeamByCode) { window.MB_openTeamByCode(code); return; } if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(name); };
  const r = window.MB.refForMatch && window.MB.refForMatch(m);
  // Lee el store para mostrar marcador directamente en la cabecera del partido
  const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
  const odds = store && store.odds && store.odds[m.id];
  const gh = odds && odds.gh != null ? odds.gh : null;
  const ga = odds && odds.ga != null ? odds.ga : null;
  const hasScore = gh !== null && ga !== null;
  const isFinished = !!(odds && odds.finished);
  const ko = new Date(m.kickoff).getTime();
  const isLiveNow = !!(odds && odds.live && !odds.finished) || (Date.now() >= ko + 5 * 60000 && Date.now() < ko + 150 * 60000);
  const showScore = hasScore && (isFinished || isLiveNow || Date.now() >= ko + 5 * 60000);
  return (
    <Card style={{ marginBottom: 10, padding: '11px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Chip tone="blue">
          {m.group
            ? `Grupo ${m.group} · J${m.md}`
            : m.stage === 'r32' ? 'Dieciseisavos' : m.stage === 'r16' ? 'Octavos' : m.stage === 'qf' ? 'Cuartos' : m.stage === 'sf' ? 'Semifinales' : 'Final'}
        </Chip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {window.MB_WatchBell ? <window.MB_WatchBell matchId={m.id} compact /> : null}
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'capitalize' }}>{fecha} · {hora}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div onClick={() => openTeam(m.home, m.homeCode)} className="mb-press" title={`Ver ${m.home}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <img src={`https://flagcdn.com/h40/${m.homeCode}.png`} alt="" style={{ height: 22, width: 'auto', borderRadius: 3, flexShrink: 0 }} />
          <span style={{ fontWeight: showScore ? 900 : 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: showScore && gh > ga ? 'var(--gold-light)' : 'var(--text)' }}>{m.home}</span>
        </div>
        {showScore ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 6px', flexShrink: 0 }}>
            <span className="num" style={{ fontSize: 'var(--t-xl)', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{gh} <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}>–</span> {ga}</span>
            {isFinished && <span style={{ fontSize: 7, color: 'var(--muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>Final{odds.penWinner ? ' · Pen.' : odds.extraTime ? ' · Prórr.' : ''}</span>}
            {isLiveNow && !isFinished && <span style={{ fontSize: 7, color: '#ff6b6b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1, animation: 'mb-pulse-live 1.5s ease infinite' }}>En vivo</span>}
          </div>
        ) : (
          <span style={{ color: 'var(--muted-2)', fontWeight: 700, padding: '0 8px' }}>vs</span>
        )}
        <div onClick={() => openTeam(m.away, m.awayCode)} className="mb-press" title={`Ver ${m.away}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, justifyContent: 'flex-end', cursor: 'pointer' }}>
          <span style={{ fontWeight: showScore ? 900 : 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: showScore && ga > gh ? 'var(--gold-light)' : 'var(--text)' }}>{m.away}</span>
          <img src={`https://flagcdn.com/h40/${m.awayCode}.png`} alt="" style={{ height: 22, width: 'auto', borderRadius: 3, flexShrink: 0 }} />
        </div>
      </div>
      {/* Estadio + árbitro en una sola línea (compacto) */}
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏟️ {m.stadium}</span>
        {r && <span style={{ opacity: 0.5 }}>·</span>}
        {r && <img src={`https://flagcdn.com/h20/${r.code}.png`} alt="" title={r.country} style={{ height: 9, width: 'auto', borderRadius: 1, flexShrink: 0 }} />}
        {r && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.name}</span>}
      </div>
      {window.MB_BetBoxOrParlay ? <window.MB_BetBoxOrParlay m={m} /> : (window.MB_BetBox ? <window.MB_BetBox m={m} /> : null)}
      {window.MB_MatchChallenges ? <window.MB_MatchChallenges match={m} /> : null}
    </Card>
  );
}

// Mini-guía "¿Cómo funciona?" para apostadores primerizos. Plegable y recuerda
// si el usuario la cerró (mb_bet_howto_collapsed), pero queda siempre disponible.
function BetHowTo() {
  const KEY = 'mb_bet_howto_collapsed';
  const [open, setOpen] = useStateB(() => { try { return localStorage.getItem(KEY) !== '1'; } catch (e) { return true; } });
  const toggle = () => setOpen((o) => { const n = !o; try { localStorage.setItem(KEY, n ? '0' : '1'); } catch (e) {} return n; });
  const steps = [
    { ic: '🎯', t: 'Elige quién gana', d: 'Toca el equipo —o Empate— que crees que ganará. La cuota (ej. x2.40) es cuánto multiplica tu apuesta.' },
    { ic: '💰', t: 'Elige cuánto apostar', d: 'Apuestas puntos virtuales (mínimo 1.000). Empiezas con 90.000 gratis.' },
    { ic: '🏆', t: 'Si aciertas, ganas', d: 'Tu apuesta × la cuota vuelve a tu saldo. Si fallas, pierdes lo apostado.' },
  ];
  return (
    <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-1)', marginBottom: 16, overflow: 'hidden' }}>
      <button onClick={toggle} className="mb-press" style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', cursor: 'pointer',
        background: 'none', border: 'none', color: 'var(--text)', textAlign: 'left',
      }}>
        <span style={{ fontSize: 16 }}>💡</span>
        <span className="display" style={{ flex: 1, fontSize: 'var(--t-md)', color: 'var(--gold-light)' }}>¿Cómo funciona apostar?</span>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', fontWeight: 700 }}>{open ? 'Ocultar' : 'Ver'}</span>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform var(--dur-base)' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', background: 'var(--coin-bg)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{s.ic}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 'var(--t-sm)', color: 'var(--text)' }}><span className="num" style={{ color: 'var(--gold-light)' }}>{i + 1}.</span> {s.t}</div>
                  <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', lineHeight: 1.4, marginTop: 1 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 11, padding: '8px 11px', borderRadius: 'var(--r-md)', background: 'var(--info-bg)', border: '1px solid rgba(74,144,226,0.3)', fontSize: 'var(--t-3xs)', color: 'var(--muted)', lineHeight: 1.4 }}>
            🔒 Son <strong style={{ color: 'var(--text)' }}>puntos virtuales</strong>, no dinero real. Juegas por diversión y compites en el ranking con tus amigos.
          </div>
        </div>
      )}
    </div>
  );
}

// Ticker horizontal con las últimas apuestas — se desplaza automáticamente (RAF).
function ActivityTicker() {
  const [items, setItems] = useStateB([]);
  useEffectB(() => {
    const fb = window.MBFirebase;
    if (!fb || !fb.subscribeActivity) return undefined;
    const un = fb.subscribeActivity(setItems);
    return () => { if (typeof un === 'function') un(); };
  }, []);

  const wrapRef = React.useRef(null);
  const posRef = React.useRef(0);
  const rafRef = React.useRef(null);
  const pausedRef = React.useRef(false);

  useEffectB(() => {
    if (!items.length) return;
    const SPEED = 32; // px/s
    let last = null;
    function tick(ts) {
      const el = wrapRef.current;
      if (el && !pausedRef.current) {
        if (last !== null) {
          posRef.current -= SPEED * (ts - last) / 1000;
          const half = el.scrollWidth / 2;
          if (half > 0 && posRef.current <= -half) posRef.current += half;
          el.style.transform = 'translateX(' + posRef.current + 'px)';
        }
        last = ts;
      } else {
        last = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    posRef.current = 0;
    if (wrapRef.current) wrapRef.current.style.transform = 'translateX(0)';
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [items.length]);

  if (!items.length) return null;
  const ago = (ts) => {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'recién';
    if (m < 60) return `hace ${m}m`;
    return `hace ${Math.round(m / 60)}h`;
  };
  const teamFor = (it) => it.pick === 'home' ? it.home : it.pick === 'away' ? it.away : 'Empate/Pen.';
  const doubled = items.concat(items); // duplicar para bucle sin salto
  const mask = 'linear-gradient(90deg, transparent, white 4%, white 96%, transparent)';
  return (
    <div
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      style={{ overflow: 'hidden', marginBottom: 12, WebkitMaskImage: mask, maskImage: mask }}>
      <div ref={wrapRef} style={{
        display: 'flex', gap: 7, paddingBottom: 4, flexShrink: 0, willChange: 'transform',
      }}>
        {doubled.map((it, i) => (
          <div key={i} style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px',
            borderRadius: 'var(--r-pill)', background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            fontSize: 'var(--t-3xs)', color: 'var(--muted)', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{it.nombre}</span> apostó <span className="num" style={{ color: 'var(--gold-light)', fontWeight: 700 }}>{Db.fmt(it.stake)}</span> a <span style={{ fontWeight: 700 }}>{teamFor(it)}</span>
            <span style={{ color: 'var(--muted-2)' }}>· {ago(it.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Partidos() {
  const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
  const odds = (store && store.odds) || {};
  const bets = (store && store.bets) || {};
  const myParlays = (store && store.parlays) || [];
  const dynFx = (store && store.dynFixtures) || [];
  const fx = [...((window.MB && window.MB.WC_FIXTURES) || []), ...dynFx.filter((d) => !((window.MB && window.MB.WC_FIXTURES) || []).some((s) => s.id === d.id))];
  const ko = (window.MB.WC_KNOCKOUTS) || [];
  const mdMap = { J1: 1, J2: 2, J3: 3 };
  const now = Date.now();

  // Estado de cada jornada: terminada / con partido en vivo. Usa las cuotas del
  // agente (finished/live) y, como respaldo si aún no hay cuota, la hora de inicio.
  const matchDone = (m) => { const o = odds[m.id]; if (o && o.finished) return true; if (o && o.live) return false; return new Date(m.kickoff).getTime() + 2.5 * 3600e3 < now; };
  const matchLive = (m) => { const o = odds[m.id]; return !!(o && o.live && !o.finished); };
  const jState = (md) => { const ms = fx.filter(m => m.md === md); return { done: ms.length > 0 && ms.every(matchDone), live: ms.some(matchLive) }; };
  const st = { 1: jState(1), 2: jState(2), 3: jState(3) };
  // Jornada actual = primera que aún no termina (si todas terminaron → eliminatorias).
  const curTab = !st[1].done ? 'J1' : !st[2].done ? 'J2' : !st[3].done ? 'J3' : 'KO';

  const [tab, setTab] = useStateB(curTab); // abre por defecto en la jornada actual
  const [filter, setFilter] = useStateB('all'); // 'all' | 'hoy' | 'parlay' | 'mine'

  const BET_GRACE_MS_S = 5 * 60 * 1000;
  const MATCH_MS_S = 150 * 60 * 1000; // 2.5h — duración máxima estimada
  // Live: flag del agente O reloj (empieza tras la gracia, termina a las 2.5h)
  const isLiveS = (m) => { const o = odds[m.id]; const k = new Date(m.kickoff).getTime(); return !!(o && o.live && !o.finished) || (now >= k + BET_GRACE_MS_S && now < k + MATCH_MS_S); };
  // Done: flag finished del agente O más de 2.5h desde kickoff
  const isDoneS = (m) => { const o = odds[m.id]; if (o && o.finished) return true; return new Date(m.kickoff).getTime() + MATCH_MS_S < now; };
  // Hoy: cualquier partido cuyo kickoff (local) es el día de hoy
  const todayMs = (() => { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
  const isToday = (m) => { const k = new Date(m.kickoff).getTime(); return k >= todayMs && k < todayMs + 86400e3; };
  const hoyAll = fx.filter(isToday).slice().sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const hoyLive     = hoyAll.filter((m) => isLiveS(m));
  const hoyDone     = hoyAll.filter((m) => isDoneS(m) && !isLiveS(m));
  const hoyUpcoming = hoyAll.filter((m) => !isLiveS(m) && !isDoneS(m));
  // Partidos de hoy apostables (para la sección combinada — solo mismo día)
  const hoyOpen = hoyUpcoming;
  // Para el chip legacy
  const liveMatches = fx.filter((m) => { const o = odds[m.id]; const k = new Date(m.kickoff).getTime(); return !!(o && o.live && !o.finished) || (now >= k + BET_GRACE_MS_S && now < k + MATCH_MS_S); });
  const mineMatches = fx.filter((m) => bets[m.id]);
  const byKickoffAsc = (a, b) => new Date(a.kickoff) - new Date(b.kickoff);

  // Sync chip ↔ modo combinada
  const parlaySlip = window.MB_useParlaySlip ? window.MB_useParlaySlip() : null;
  const prevFilter = React.useRef(filter);
  // Al montar: resetear modo combinada por si quedó pegado de una sesión anterior
  React.useEffect(() => {
    if (window.MB_setParlayMode) window.MB_setParlayMode(false);
    return () => { if (window.MB_setParlayMode) window.MB_setParlayMode(false); };
  }, []);
  React.useEffect(() => {
    if (filter === 'parlay' && prevFilter.current !== 'parlay') {
      if (window.MB_setParlayMode) window.MB_setParlayMode(true);
    } else if (filter !== 'parlay' && prevFilter.current === 'parlay') {
      if (window.MB_setParlayMode) window.MB_setParlayMode(false);
    }
    prevFilter.current = filter;
  }, [filter]);

  const openBets = Object.values(bets).filter((b) => b && b.status === 'open');
  const openParlays = myParlays.filter((p) => p && p.status === 'open');
  const openTotal = openBets.reduce((s, b) => s + (b.stake || 0), 0) + openParlays.reduce((s, p) => s + (p.stake || 0), 0);
  const openCount = openBets.length + openParlays.length;
  const _getTs = (obj) => obj && obj.creado && obj.creado.seconds ? obj.creado.seconds : 0;
  const sortedBetItems = [
    ...myParlays.map((p) => ({ type: 'parlay', data: p, ts: _getTs(p) })),
    ...mineMatches.map((m) => ({ type: 'bet', data: m, ts: _getTs(bets[m.id]) })),
  ].sort((a, b) => b.ts - a.ts);
  const _todayStr = new Date(now).toLocaleDateString('sv');
  const todayParlays = (() => {
    const seenIds = new Set();
    const seenFp = new Set();
    return myParlays
      .slice().sort((a, b) => _getTs(b) - _getTs(a))
      .filter((p) => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        const fp = (p.legs || []).map((l) => l.matchId + ':' + l.pick).sort().join('|');
        if (seenFp.has(fp)) return false;
        seenFp.add(fp);
        return (p.legs || []).some((l) => new Date(l.kickoff).toLocaleDateString('sv') === _todayStr);
      });
  })();

  const dotEl = (color, pulse) => <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginLeft: 5, verticalAlign: 'middle', animation: pulse ? 'mb-pulse-live 1s var(--ease-out) infinite' : 'none' }} />;
  const jLabel = (md) => {
    const s = st[md], key = 'J' + md, isActive = tab === key;
    return (
      <span style={{ opacity: s.done && !isActive ? 0.55 : 1 }}>
        Jor. {md}
        {s.done && <span style={{ color: isActive ? '#fff' : 'var(--success)', marginLeft: 4, fontWeight: 800 }}>✓</span>}
        {s.live ? dotEl('#ff5252', true) : (key === curTab && !s.done && !isActive ? dotEl('var(--info)', false) : null)}
      </span>
    );
  };

  const parlayLegs = (parlaySlip && parlaySlip.legs) ? parlaySlip.legs.length : 0;
  const chips = [
    { k: 'all',    label: 'Todos' },
    { k: 'hoy',    label: liveMatches.length > 0 ? '🔴 Hoy' : '🗓 Hoy', count: hoyAll.length },
    { k: 'parlay', label: '🎰 Combinada', count: parlayLegs, accent: true },
    { k: 'mine',   label: '🎟 Mis apuestas', count: mineMatches.length + myParlays.length },
  ];

  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <ActivityTicker />
      {/* Filtros rápidos: buscan en todo el torneo, no solo en la jornada activa */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        {chips.map((c) => {
          const active = filter === c.k;
          const isParlay = c.k === 'parlay';
          return (
            <button key={c.k} onClick={() => setFilter(c.k)} className="mb-press" style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
              background: active ? (isParlay ? 'linear-gradient(135deg,#61DAFB,#4A90E2)' : 'var(--coin-bg)') : 'var(--surface-2)',
              border: active ? (isParlay ? '1.5px solid #61DAFB' : '1.5px solid var(--gold)') : '1px solid var(--border-2)',
              color: active ? (isParlay ? '#06141f' : 'var(--gold-light)') : 'var(--muted)',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap',
            }}>
              {c.label}{c.count != null && c.count > 0 ? ' · ' + c.count : ''}
            </button>
          );
        })}
      </div>

      {filter !== 'all' ? (
        <>
          {filter === 'hoy' && (
            <>
              {todayParlays.length > 0 && (
                <>
                  <SectionHead title="🎰 Tu combinada de hoy" />
                  {todayParlays.map((p) => window.MB_ParlayCard ? <window.MB_ParlayCard key={p.id} p={p} /> : null)}
                </>
              )}
              {hoyAll.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                  <div style={{ fontSize: 'var(--t-sm)', color: 'var(--text)', fontWeight: 800, marginBottom: 4 }}>Hoy no se juegan partidos del Mundial</div>
                  <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', lineHeight: 1.5 }}>Revisa la pestaña <strong>Todos</strong> para ver el calendario completo y apostar con anticipación.</div>
                </div>
              ) : (
                <>
                  {hoyLive.length > 0 && <SectionHead title="🔴 En vivo" />}
                  {hoyLive.map((m) => <MobileFixtureCard key={m.id} m={m} />)}
                  {hoyUpcoming.length > 0 && <SectionHead title="⏳ Por jugar" />}
                  {hoyUpcoming.map((m) => <MobileFixtureCard key={m.id} m={m} />)}
                  {hoyDone.length > 0 && <SectionHead title="✓ Jugados hoy" />}
                  {hoyDone.map((m) => <MobileFixtureCard key={m.id} m={m} />)}
                </>
              )}
            </>
          )}
          {filter === 'parlay' && (
            <>
              {/* Combinada(s) de hoy ya registradas */}
              {todayParlays.length > 0 && (
                <>
                  <SectionHead title="🎰 Tu combinada de hoy" />
                  {todayParlays.map((p) => window.MB_ParlayCard ? <window.MB_ParlayCard key={p.id} p={p} /> : null)}
                </>
              )}

              {/* Banner + partidos disponibles */}
              {hoyOpen.length === 0 ? (
                todayParlays.length === 0 && (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎰</div>
                    <div style={{ fontSize: 'var(--t-sm)', color: 'var(--text)', fontWeight: 800, marginBottom: 4 }}>No hay partidos disponibles hoy para combinada</div>
                    <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', lineHeight: 1.5 }}>Las combinadas solo incluyen partidos del mismo día que aún no comenzaron.<br />Vuelve cuando haya partidos por jugar.</div>
                  </div>
                )
              ) : (
                <>
                  {/* Banner rediseñado */}
                  <div style={{ marginBottom: 12, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid rgba(97,218,251,0.35)', background: 'rgba(13,20,15,0.92)' }}>
                    <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg, rgba(97,218,251,0.15), rgba(74,144,226,0.10))', borderBottom: '1px solid rgba(97,218,251,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🎰</span>
                      <span style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: '#61DAFB' }}>Modo combinada activo</span>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--text)', lineHeight: 1.5, marginBottom: 8 }}>
                        Elige el resultado de cada partido de hoy y confírmalos en un solo ticket.
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <div style={{ padding: '7px 10px', borderRadius: 'var(--r-md)', background: 'rgba(97,218,251,0.08)', border: '1px solid rgba(97,218,251,0.25)', textAlign: 'center', minWidth: 60 }}>
                          <div className="num" style={{ fontSize: 'var(--t-md)', fontWeight: 800, color: '#61DAFB', lineHeight: 1 }}>2–6</div>
                          <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>Partidos</div>
                        </div>
                        <div style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--r-md)', background: 'rgba(233,139,139,0.08)', border: '1px solid rgba(233,139,139,0.3)' }}>
                          <div style={{ fontSize: 'var(--t-xs)', fontWeight: 800, color: '#e98b8b' }}>⚠ Debes acertar TODOS</div>
                          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>Si fallas uno solo, pierdes toda la combinada</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--muted-2)', lineHeight: 1.4 }}>
                        Las cuotas se <strong style={{ color: '#61DAFB' }}>multiplican entre sí</strong> · Solo partidos de hoy que aún no empezaron
                      </div>
                    </div>
                  </div>
                  <SectionHead title={`Partidos disponibles hoy · ${hoyOpen.length}`} />
                  {hoyOpen.map((m) => <MobileFixtureCard key={m.id} m={m} />)}
                </>
              )}
            </>
          )}
          {filter === 'mine' && (
            <>
              {mineMatches.length === 0 && myParlays.length === 0 && (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--muted-2)', fontSize: 'var(--t-2xs)', fontStyle: 'italic' }}>Todavía no tienes apuestas. ¡Elige un partido y arranca!</div>
              )}
              {sortedBetItems.map((item) => item.type === 'parlay'
                ? (window.MB_ParlayCard ? <window.MB_ParlayCard key={'p_' + item.data.id} p={item.data} /> : null)
                : <MobileFixtureCard key={'b_' + item.data.id} m={item.data} />
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <SegTabs accent="var(--info)" value={tab} onChange={setTab}
              options={[{ v: 'J1', label: jLabel(1) }, { v: 'J2', label: jLabel(2) }, { v: 'J3', label: jLabel(3) }, { v: 'KO', label: 'Elim.' }]} />
          </div>
          {tab !== 'KO' ? (
            (() => {
              const bettable = fx.filter((m) => m.md === mdMap[tab] && new Date(m.kickoff).getTime() + BET_GRACE_MS_S > now && !isDoneS(m));
              return bettable.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 'var(--t-sm)', color: 'var(--text)', fontWeight: 800, marginBottom: 4 }}>Jornada {mdMap[tab]} completada</div>
                  <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', lineHeight: 1.5 }}>Todos los partidos de esta jornada ya se jugaron.<br />Revisa <strong>Hoy</strong> para ver los resultados o cambia de jornada para apostar.</div>
                </div>
              ) : (
                <>
                  <SectionHead title={`Fase de grupos · Jornada ${mdMap[tab]}`} />
                  {bettable.map((m) => <MobileFixtureCard key={m.id} m={m} />)}
                </>
              );
            })()
          ) : (
            <>
              {/* Partidos de eliminatorias ya conocidos (tienen equipos definidos) */}
              {(() => {
                const stageOrder = ['r32', 'r16', 'qf', 'sf', 'final'];
                const stageLabel = { r32: 'Dieciseisavos', r16: 'Octavos de final', qf: 'Cuartos de final', sf: 'Semifinales', final: 'Final' };
                const koFx = fx.filter((m) => m.stage && m.stage !== 'Grupos' && new Date(m.kickoff).getTime() + BET_GRACE_MS_S > now && !isDoneS(m));
                const byStage = {};
                koFx.forEach((m) => { (byStage[m.stage] = byStage[m.stage] || []).push(m); });
                const hasKoFx = koFx.length > 0;
                return (
                  <>
                    {hasKoFx && stageOrder.filter((s) => byStage[s]).map((s) => (
                      <React.Fragment key={s}>
                        <SectionHead title={stageLabel[s] || s} />
                        {byStage[s].map((m) => <MobileFixtureCard key={m.id} m={m} />)}
                      </React.Fragment>
                    ))}
                    {/* Rondas aún sin equipos definidos */}
                    {ko.filter((k) => {
                      const key = k.stage === 'Dieciseisavos (R32)' ? 'r32' : k.stage === 'Octavos de final' ? 'r16' : k.stage === 'Cuartos de final' ? 'qf' : k.stage === 'Semifinales' ? 'sf' : k.stage === 'FINAL' ? 'final' : null;
                      return !key || !byStage[key];
                    }).map((k, i) => (
                      <Card key={i} style={{ marginBottom: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Chip tone="gold">{k.stage}</Chip>
                          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>{k.fechas}</span>
                        </div>
                        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{k.partidos} {k.partidos === 1 ? 'partido' : 'partidos'} · {k.sedes}</div>
                      </Card>
                    ))}
                  </>
                );
              })()}
            </>
          )}
        </>
      )}

      {/* Ticket flotante de apuestas abiertas (excepto en "Mis apuestas") */}
      {openCount > 0 && filter !== 'mine' && filter !== 'parlay' && (
        <div onClick={() => setFilter('mine')} className="mb-press" style={{
          position: 'sticky', bottom: 10, marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-pill)',
          background: 'linear-gradient(135deg, var(--gold-light), var(--gold))', color: '#1a1206',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          boxShadow: 'var(--sh-3)', fontWeight: 800, fontSize: 'var(--t-2xs)', zIndex: 5,
        }}>
          <span>🎟 {openCount} apuesta{openCount === 1 ? '' : 's'} abierta{openCount === 1 ? '' : 's'}</span>
          <span className="num">{Db.fmt(openTotal)} en juego ›</span>
        </div>
      )}
      {/* Slip de combinada: solo visible en modo combinada */}
      {filter === 'parlay' && window.MB_ParlaySlip ? <window.MB_ParlaySlip /> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// QUINIELA — anonimato anónimo / revelado
// ─────────────────────────────────────────────────────────
// entradas del partido abierto con identidad oculta (para demo de revelación)
const OPEN_ENTRIES = [
  { mascot: 'zayu',   score: '2—1', coins: 500, me: false, real: { name: 'Rodrigo M.', initials: 'RM' } },
  { mascot: 'maple',  score: '1—0', coins: 200, me: false, real: { name: 'Pedro A.', initials: 'PA' } },
  { mascot: 'clutch', score: '1—1', coins: 350, me: true,  real: { name: 'Tú · Sergio G.', initials: 'SG' } },
];

function AnonRowOpen({ e, revealed }) {
  const m = Mb[e.mascot];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderRadius: 'var(--r-md)', marginBottom: 8,
      background: e.me ? 'var(--info-bg)' : 'var(--surface-2)',
      border: e.me ? '1.5px solid var(--info)' : '1px solid var(--border)',
    }}>
      <div style={{ perspective: 600 }}>
        <div style={{
          transition: 'transform 0.6s var(--ease-spring)', transformStyle: 'preserve-3d',
          animation: revealed ? 'mb-spin360 0.6s var(--ease-spring)' : 'none',
        }}>
          {revealed ? <InitialAvatar user={{ initials: e.real.initials, mascot: e.mascot }} size={40} /> : <MascotAvatar mascot={e.mascot} size={40} />}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: e.me ? 'var(--info)' : 'var(--text)' }}>
          {revealed ? e.real.name : (e.me ? 'Tú · ' : '') + 'Apostador ' + m.name}
        </div>
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>
          {revealed ? `era ${m.emoji} ${m.name}` : 'pronóstico anónimo'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontSize: 'var(--t-lg)', color: 'var(--text)' }}>{e.score}</div>
        <CoinBadge amount={e.coins} size="sm" />
      </div>
    </div>
  );
}

function AnonRowLocked({ e }) {
  const u = Db.userById(e.userId);
  const m = Mb[e.wasMascot];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <InitialAvatar user={{ initials: u.initials, mascot: e.wasMascot }} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{u.name}</div>
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>era {m.emoji} {m.name} · pronosticó {e.score}</div>
      </div>
      <ResultBadge result={e.result} pts={e.pts} />
    </div>
  );
}

function Quiniela() {
  const [revealed, setRevealed] = useStateB(false);
  const open = Db.ANON_OPEN, locked = Db.ANON_LOCKED;

  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* banner */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--info-bg)', border: '1px solid rgba(74,144,226,0.3)', borderRadius: 'var(--r-md)', marginBottom: 18 }}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <p style={{ margin: 0, fontSize: 'var(--t-xs)', color: 'var(--text)', lineHeight: 1.45 }}>
          Los nombres se revelan cuando el partido inicia. Todos ven todos los pronósticos — <strong>nadie sabe de quién</strong>.
        </p>
      </div>

      {/* ABIERTO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>{open.title}</h3>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Chip tone={revealed ? 'neutral' : 'green'} live={false}>
          {revealed ? '🔓 Bloqueado · Nombres revelados' : 'Abierto · cierra en 2h 14min'}
        </Chip>
      </div>

      {OPEN_ENTRIES.map((e, i) => <AnonRowOpen key={i} e={e} revealed={revealed} />)}

      {!revealed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 12, background: 'var(--surface-1)', border: '1px dashed var(--border-2)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontSize: 18, color: 'var(--muted-2)' }}>?</div>
          <span style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>{open.missing} participantes sin pronosticar</span>
        </div>
      )}

      {/* demo botón revelar */}
      <button onClick={() => setRevealed(r => !r)} className="mb-press" style={{
        width: '100%', padding: '12px', borderRadius: 'var(--r-pill)', cursor: 'pointer', marginBottom: 26,
        background: revealed ? 'var(--surface-1)' : 'var(--info)', color: revealed ? 'var(--muted)' : '#fff',
        border: revealed ? '1px solid var(--border-2)' : 'none', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)',
      }}>
        {revealed ? '↺ Volver a estado anónimo' : '▶ Simular inicio del partido (revelar nombres)'}
      </button>

      {/* BLOQUEADO ejemplo */}
      <SectionHead title="Partido bloqueado" />
      <div style={{ marginBottom: 10 }}>
        <h3 className="display" style={{ margin: '0 0 8px', fontSize: 'var(--t-lg)', color: 'var(--text)' }}>{locked.title}</h3>
        <Chip tone="neutral">Bloqueado · Resultado {locked.result}</Chip>
      </div>
      <div style={{ marginTop: 10 }}>
        {locked.entries.map((e, i) => <AnonRowLocked key={i} e={e} />)}
      </div>
    </div>
  );
}

Object.assign(window, { Partidos, Quiniela, MobileFixtureCard, BetHowTo });
