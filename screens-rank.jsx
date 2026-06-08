/* ============================================================
   Screens: Ranking + Liga + Perfil
   ============================================================ */
const { useState: useStateR } = React;
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
  const [period, setPeriod] = useStateR('Torneo completo');
  const users = Dr.USERS;
  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ marginBottom: 18 }}>
        <SegTabs options={['Esta semana', 'Este mes', 'Torneo completo']} value={period} onChange={setPeriod} accent="var(--gold)" />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 18 }}>
        <PodiumCard u={users[1]} place={2} />
        <PodiumCard u={users[0]} place={1} />
        <PodiumCard u={users[2]} place={3} />
      </div>
      <Card style={{ padding: '8px' }}>
        {users.map(u => <RankRow key={u.id} u={u} highlight={u.me} />)}
      </Card>
      <p style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
        🔒 Los nombres solo son visibles en partidos ya jugados o en curso.
      </p>
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
  const [tab, setTab] = useStateR('Bote y pagos');
  const [copied, setCopied] = useStateR(false);
  const L = Dr.LEAGUE;

  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* header liga */}
      <Card style={{ marginBottom: 14, background: 'linear-gradient(150deg, rgba(74,144,226,0.12), var(--surface-1))' }}>
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tu liga</div>
        <h2 className="display" style={{ margin: '4px 0 12px', fontSize: 'var(--t-xl)' }}>{L.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Código:</span>
          <span className="mono" style={{ fontWeight: 700, color: 'var(--info)', letterSpacing: '0.05em' }}>{L.code}</span>
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mb-press" style={{
            marginLeft: 'auto', padding: '5px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)',
            background: 'var(--surface-2)', color: copied ? 'var(--success)' : 'var(--text)', fontSize: 'var(--t-2xs)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>{copied ? '✓ Copiado' : '📋 Copiar'}</button>
        </div>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <SegTabs options={['Bote y pagos', 'Reglamento', 'Historial']} value={tab} onChange={setTab} accent="var(--info)" />
      </div>

      {tab === 'Bote y pagos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
          <PrizePotCard animate={false} />

          {/* distribución */}
          <Card>
            <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', marginBottom: 10 }}>Distribución del premio</div>
            {L.distribution.map(d => {
              const u = Dr.userById(d.userId);
              return (
                <div key={d.place} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: d.place < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 18 }}>{d.medal}</span>
                  <MascotAvatar mascot={u.mascot} size={28} ring={false} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 'var(--t-sm)' }}>{u.name}</span>
                  <span className="num" style={{ color: 'var(--gold-light)' }}>${Dr.fmt(d.amount)}</span>
                </div>
              );
            })}
          </Card>

          {/* tesorero */}
          <Card>
            <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', marginBottom: 12 }}>Datos del Tesorero</div>
            {[
              ['👤', 'Tesorero', L.treasurer + ' 🐆'],
              ['🏦', 'Banco', L.bank],
              ['📋', 'RUT', L.rut],
              ['💬', 'Asunto', '"' + L.subject + '"'],
              ['📅', 'Fecha límite', L.deadline],
            ].map(([ic, k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                <span style={{ width: 20 }}>{ic}</span>
                <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)', width: 92 }}>{k}</span>
                <span style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </Card>

          {/* estado de pagos */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>Estado de pagos</span>
              <Chip tone="green" icon={<span>✓</span>}>8/8 confirmados</Chip>
            </div>
            {Dr.USERS.map((u, i) => <PaymentRow key={u.id} u={u} last={i === Dr.USERS.length - 1} />)}
            <p style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
              Solo el Tesorero puede marcar pagos. Transparente y público para todos los miembros.
            </p>
          </Card>
        </div>
      )}

      {tab === 'Reglamento' && (
        <Card style={{ animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--t-md)', marginBottom: 12 }}>Reglamento de la liga</div>
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Dr.RULES.map((r, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, fontSize: 'var(--t-sm)', lineHeight: 1.45 }}>
                <span className="num" style={{ color: 'var(--info)', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ color: 'var(--text)' }}>{r}</span>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--success)', fontWeight: 700, fontSize: 'var(--t-sm)' }}>
            8/8 miembros aceptaron el reglamento ✅
          </div>
        </Card>
      )}

      {tab === 'Historial' && (
        <div style={{ animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
          <p style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)', marginTop: 0, marginBottom: 12 }}>
            Registro inmutable. Nadie puede editar ni eliminar estas acciones.
          </p>
          {Dr.LOG.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 14px', marginBottom: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <span className="mono" style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', flexShrink: 0, paddingTop: 1 }}>{l.date}</span>
              <span style={{ flex: 1, fontSize: 'var(--t-sm)', color: 'var(--text)', lineHeight: 1.4 }}>{l.text}</span>
              <Chip tone="green" icon={<span>🔒</span>}>Verificado</Chip>
            </div>
          ))}
        </div>
      )}
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

function Perfil({ user }) {
  const me = user;
  const m = Mr[me.mascot];
  const best = Dr.MY_BETS.find(b => b.result === 'exact');
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const dispName = authUser ? (authUser.displayName || 'Jugador') : me.name;
  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* header perfil */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ display: 'inline-block', marginBottom: 8 }}><MascotAvatar mascot={me.mascot} size={92} glow jersey /></div>
        <h2 className="display" style={{ margin: '4px 0 6px', fontSize: 'var(--t-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {dispName}
          {authUser && window.MB_editName && <button onClick={() => window.MB_editName()} title="Cambiar mi apodo" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--gold-light)' }}>✏️</button>}
        </h2>
        {authUser
          ? <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{authUser.email || ''}</div>
          : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip tone="green" icon={<span>{m.emoji}</span>}>Equipo {m.name}</Chip>
            </div>
          )}
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[
          ['Monedas', Dr.fmt(me.coins), 'var(--gold-light)'],
          ['Posición', '#' + me.rank, 'var(--info)'],
          ['Racha', me.streak, 'var(--success)'],
          ['Aciertos', me.hits + '%', 'var(--success)'],
          ['ROI', '+' + me.roi + '%', 'var(--success)'],
          ['Pronósticos', me.preds, 'var(--text)'],
        ].map(([k, v, c]) => (
          <Card key={k} style={{ padding: '12px 8px', textAlign: 'center' }}>
            <div className="num" style={{ fontSize: 'var(--t-lg)', color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{k}</div>
          </Card>
        ))}
      </div>

      {/* gráfico evolución */}
      <SectionHead title="Evolución de monedas" />
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>
          <span>Inicio: <span className="mono" style={{ color: 'var(--text)' }}>10.000</span></span>
          <span>Actual: <span className="mono" style={{ color: 'var(--gold-light)' }}>{Dr.fmt(me.coins)}</span></span>
        </div>
        <CoinChart data={Dr.COIN_HISTORY} />
      </Card>

      {/* mejor / peor */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <Card style={{ flex: 1, borderColor: 'rgba(0,200,90,0.3)' }}>
          <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>🔥 Mejor apuesta</div>
          <div style={{ fontSize: 'var(--t-xs)', color: 'var(--text)' }}>Brasil 2-0 Suiza</div>
          <div className="num" style={{ color: 'var(--success)', fontSize: 'var(--t-md)', marginTop: 4 }}>+1.750 ·×3.5</div>
        </Card>
        <Card style={{ flex: 1, borderColor: 'rgba(232,64,64,0.3)' }}>
          <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--danger)', fontWeight: 700, marginBottom: 4 }}>🫎 Peor apuesta</div>
          <div style={{ fontSize: 'var(--t-xs)', color: 'var(--text)' }}>Chile 1-2 Perú</div>
          <div className="num" style={{ color: 'var(--danger)', fontSize: 'var(--t-md)', marginTop: 4 }}>−500</div>
        </Card>
      </div>

      {/* historial */}
      <SectionHead title="Últimas apuestas" />
      <Card style={{ padding: '6px 14px', marginBottom: 18 }}>
        {Dr.MY_BETS.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < Dr.MY_BETS.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{b.match}</div>
              <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>{b.bet}</div>
            </div>
            <ResultBadge result={b.result} pts={b.pts} />
            <span className="num" style={{ minWidth: 52, textAlign: 'right', fontSize: 'var(--t-sm)', color: b.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>{b.delta >= 0 ? '+' : ''}{Dr.fmt(b.delta)}</span>
          </div>
        ))}
      </Card>

      {/* logros */}
      <SectionHead title="Logros" />
      {Dr.ACHIEVEMENTS.map(a => <AchievementBadge key={a.id} a={a} />)}
    </div>
  );
}

Object.assign(window, { Ranking, Liga, Perfil });
