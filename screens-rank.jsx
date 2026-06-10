/* ============================================================
   Screens: Ranking + Liga + Perfil
   ============================================================ */
const { useState: useStateR, useEffect: useEffectR } = React;
const Dr = window.MB;
const Mr = Dr.MASCOTS;
const {
  MascotAvatar, InitialAvatar, CoinBadge, Chip, Card, SectionHead, SegTabs,
  ProgressBar, ResultBadge, PrizePotCard,
} = window;

// ─────────────────────────────────────────────────────────
// RANKING
// ─────────────────────────────────────────────────────────
function PodiumCard({ u, place }) {
  const m = Mr[u.mascot];
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const heights = { 1: 0, 2: 14, 3: 22 };
  return (
    <div style={{
      flex: 1, marginTop: heights[place], textAlign: 'center', padding: '14px 8px 12px',
      background: place === 1 ? 'linear-gradient(160deg, rgba(212,175,55,0.16), var(--surface-1))' : 'var(--surface-1)',
      border: place === 1 ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', boxShadow: place === 1 ? 'var(--glow-gold)' : 'var(--sh-1)',
      animation: `mb-pop var(--dur-slow) var(--ease-spring) ${place * 0.08}s both`,
    }}>
      <div style={{ fontSize: place === 1 ? 26 : 20, marginBottom: 4 }}>{medals[place]}</div>
      <div style={{ display: 'inline-block', marginBottom: 6 }}><MascotAvatar mascot={u.mascot} size={place === 1 ? 52 : 44} glow={place === 1} /></div>
      <div style={{ fontWeight: 700, fontSize: 'var(--t-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
      <div className="num" style={{ fontSize: 'var(--t-xl)', color: 'var(--gold-light)', marginTop: 2 }}>{u.pts}<span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginLeft: 2 }}>pts</span></div>
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--success)', fontWeight: 700, marginTop: 2 }}>ROI +{u.roi}%</div>
    </div>
  );
}

function RankRow({ u, highlight }) {
  const m = Mr[u.mascot];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 'var(--r-md)', marginBottom: 6,
      background: highlight ? 'var(--info-bg)' : 'transparent', border: highlight ? '1px solid var(--info)' : '1px solid transparent',
    }}>
      <span className="num" style={{ width: 20, textAlign: 'center', color: highlight ? 'var(--info)' : 'var(--muted)', fontSize: 'var(--t-md)' }}>{u.rank}</span>
      <MascotAvatar mascot={u.mascot} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{u.name}{highlight && <span style={{ color: 'var(--info)', fontSize: 'var(--t-3xs)', marginLeft: 6 }}>· tú</span>}</div>
        <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>{u.hits}% aciertos</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontSize: 'var(--t-md)', color: 'var(--gold-light)' }}>{u.pts} pts</div>
        <div style={{ fontSize: 'var(--t-3xs)', color: u.roi >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{u.roi >= 0 ? '+' : ''}{u.roi}% ROI</div>
      </div>
    </div>
  );
}

function Ranking() {
  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="🏅 Ranking de jugadores" style={{ padding: '12px 14px' }}>
        {window.MB_RankingReal ? React.createElement(window.MB_RankingReal, {}) : null}
      </Card>
      <Card title="👥 Ranking de equipos" style={{ padding: '12px 14px' }}>
        {window.MB_TeamsReal ? React.createElement(window.MB_TeamsReal, {}) : null}
      </Card>
      <Card title="❓ Preguntas frecuentes" style={{ padding: '14px 14px' }}>
        {window.MB_FAQ ? React.createElement(window.MB_FAQ, {}) : null}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// LIGA
// ─────────────────────────────────────────────────────────
function PaymentRow({ u, last }) {
  const m = Mr[u.mascot];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span style={{ color: 'var(--success)', fontSize: 16 }}>✅</span>
      <span style={{ fontWeight: 600, fontSize: 'var(--t-sm)', flex: 1 }}>{u.name}</span>
      <MascotAvatar mascot={u.mascot} size={24} ring={false} />
      <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{u.paidDate}</span>
      <span className="mono" style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 700, minWidth: 48, textAlign: 'right' }}>$5.000</span>
    </div>
  );
}

function Liga() {
  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {window.MB_LigaReal ? React.createElement(window.MB_LigaReal, {}) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────────────────
function CoinChart({ data }) {
  const w = 300, h = 90, pad = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(212,175,55,0.35)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#coinGrad)" />
      <path d={path} fill="none" stroke="var(--gold-light)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4.5" fill="var(--gold-light)" stroke="var(--bg)" strokeWidth="2" />
    </svg>
  );
}

function AchievementBadge({ a }) {
  const m = a.mascot === 'all' ? { color: '#D4AF37', light: '#F0CE5A', name: 'los tres' } : Mr[a.mascot];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8,
      background: 'var(--surface-1)', borderRadius: 'var(--r-md)',
      border: a.unlocked ? `1px solid ${m.light}55` : '1px solid var(--border)', opacity: a.unlocked ? 1 : 0.6,
    }}>
      <div style={{ position: 'relative', filter: a.unlocked ? 'none' : 'grayscale(0.8)' }}>
        <MascotAvatar mascot={a.mascot} size={42} ring glow={a.unlocked} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: a.unlocked ? 'var(--text)' : 'var(--muted)' }}>{a.name}</span>
          {a.unlocked ? <span style={{ color: 'var(--success)' }}>✓</span> : <span style={{ color: 'var(--muted-2)' }}>🔒</span>}
        </div>
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 1 }}>{a.note} · firma {m.name}</div>
      </div>
    </div>
  );
}

function Perfil() {
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
  const [users, setUsers] = useStateR([]);
  useEffectR(() => {
    if (!authUser || !window.MBFirebase || !window.MBFirebase.subscribeUsers) { setUsers([]); return undefined; }
    const un = window.MBFirebase.subscribeUsers(setUsers);
    return () => { if (typeof un === 'function') un(); };
  }, [authUser]);

  if (!authUser) {
    return (
      <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
        {window.MB_SignInNote ? React.createElement(window.MB_SignInNote, { text: 'Inicia sesión para ver tu perfil', card: true }) : null}
      </div>
    );
  }

  const SAL = 90000;
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  const ms = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0);
  const saldoOf = (u) => (u && typeof u.saldo === 'number') ? u.saldo : SAL;
  const meRec = users.find(u => u.uid === authUser.uid) || null;
  const saldo = meRec ? saldoOf(meRec) : (store && typeof store.saldo === 'number' ? store.saldo : SAL);
  const dispName = authUser.displayName || (meRec && meRec.nombre) || 'Jugador';
  const teamName = (meRec && meRec.groupName) ? '👥 ' + meRec.groupName : ((meRec && meRec.noGroup) ? '🙋 Individual' : 'Sin equipo');
  const ini = (() => { const p = String(dispName).trim().split(/\s+/); return (((p[0] || '')[0] || '?') + ((p[1] || '')[0] || '')).toUpperCase(); })();
  const sorted = users.slice().sort((a, b) => saldoOf(b) - saldoOf(a) || ms(a.creado) - ms(b.creado));
  const pos = meRec ? (sorted.findIndex(u => u.uid === authUser.uid) + 1) : 0;
  const bets = store ? Object.keys(store.bets).map(k => store.bets[k]) : [];
  bets.sort((a, b) => ms(b.creado) - ms(a.creado));
  const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
  const wonN = settled.filter(b => b.status === 'won').length;
  const aciertos = settled.length ? Math.round((wonN / settled.length) * 100) : 0;
  const PICK = (b) => (b.pick === 'home' ? b.home : b.pick === 'away' ? b.away : 'Empate');

  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ width: 92, height: 92, borderRadius: '50%', margin: '0 auto 8px', background: 'var(--surface-2)', border: '2px solid var(--gold)', boxShadow: 'var(--glow-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 32, color: 'var(--gold-light)' }}>{ini}</div>
        <h2 className="display" style={{ margin: '4px 0 6px', fontSize: 'var(--t-2xl)' }}>{dispName}{window.MB_champFlag && window.MB_champFlag(meRec && meRec.championCode, meRec && meRec.champion, 16)}</h2>
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{authUser.email || ''}</div>
        <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700, marginTop: 3 }}>{teamName}</div>
        {window.MB_openTeamPicker && (
          <button onClick={() => window.MB_openTeamPicker()} className="mb-press" style={{ marginTop: 10, padding: '8px 16px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(74,144,226,0.5)', background: 'rgba(74,144,226,0.12)', color: 'var(--info)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>
            {(meRec && meRec.groupName) ? '👥 Cambiar de equipo' : '👥 Unirme a un equipo'}
          </button>
        )}
        {window.MB_NotifButton && <div style={{ marginTop: 10, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>{React.createElement(window.MB_NotifButton)}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[
          ['Saldo', fmt(saldo), 'var(--gold-light)'],
          ['Posición', pos ? '#' + pos : '—', 'var(--info)'],
          ['Apuestas', String(bets.length), 'var(--text)'],
          ['Aciertos', settled.length ? aciertos + '%' : '—', 'var(--success)'],
        ].map(([k, v, c]) => (
          <Card key={k} style={{ padding: '12px 8px', textAlign: 'center' }}>
            <div className="num" style={{ fontSize: 'var(--t-lg)', color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{k}</div>
          </Card>
        ))}
      </div>

      <Card title="Mi historial de apuestas" style={{ padding: '14px 14px', marginBottom: 18 }}>
        {bets.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--t-sm)', padding: '16px 8px' }}>Aún no has hecho apuestas.<br /><span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>Ve a <strong style={{ color: 'var(--gold-light)' }}>Partidos</strong> y apuesta al ganador.</span></div>
          : bets.map((b, i) => {
            const open = b.status === 'open';
            const won = b.status === 'won';
            const delta = won ? Math.round((b.stake || 0) * (b.odd || 0)) : (b.status === 'lost' ? -(b.stake || 0) : 0);
            const badge = open ? { txt: 'Abierta', col: 'var(--info)', bg: 'rgba(74,144,226,0.12)' } : won ? { txt: '✓ Ganaste', col: 'var(--success)', bg: 'var(--success-bg)' } : { txt: '✕ Perdiste', col: '#e98b8b', bg: 'rgba(220,80,80,0.10)' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < bets.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.home} vs {b.away}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>{fmt(b.stake)} a {PICK(b)} @ {Number(b.odd).toFixed(2)}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: badge.col, background: badge.bg, padding: '3px 8px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap' }}>{badge.txt}</span>
                <span className="num" style={{ minWidth: 52, textAlign: 'right', fontSize: 'var(--t-sm)', color: open ? 'var(--muted)' : (delta >= 0 ? 'var(--success)' : 'var(--danger)') }}>{open ? '—' : (delta >= 0 ? '+' : '') + fmt(delta)}</span>
              </div>
            );
          })}
      </Card>
    </div>
  );
}

Object.assign(window, { Ranking, Liga, Perfil });
