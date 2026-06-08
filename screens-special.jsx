/* ============================================================
   Screens: Admin · Cierre del torneo · Feed social
   ============================================================ */
const { useState: useStateS, useEffect: useEffectS } = React;
const Ds = window.MB;
const Ms = Ds.MASCOTS;
const {
  MascotAvatar, InitialAvatar, CoinBadge, Chip, Card, SectionHead, SegTabs,
  FeedItem, GoldButton, Confetti, ResultBadge,
} = window;

// ─────────────────────────────────────────────────────────
// FEED SOCIAL
// ─────────────────────────────────────────────────────────
function Feed() {
  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <Card style={{ padding: '6px 14px' }}>
        {window.MB_ActivityReal ? React.createElement(window.MB_ActivityReal, {}) : null}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PANEL ADMIN
// ─────────────────────────────────────────────────────────
function AdminPagos() {
  // demo: dos usuarios pendientes para mostrar el flujo de confirmación
  const base = Ds.USERS.map((u, i) => ({ ...u, confirmed: i < 6 }));
  const [rows, setRows] = useStateS(base);
  const [log, setLog] = useStateS([]);
  const confirm = (id) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, confirmed: true } : r));
    const u = Ds.userById(id);
    const d = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    setLog(l => [{ date: d, name: u.name }, ...l]);
  };
  const pending = rows.filter(r => !r.confirmed).length;
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>Marca los pagos recibidos por transferencia.</span>
        <Chip tone={pending ? 'red' : 'green'} icon={<span>{pending ? '⚠️' : '✓'}</span>}>{pending ? pending + ' pendientes' : 'Todos al día'}</Chip>
      </div>
      {rows.map(u => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, background: 'var(--surface-1)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <MascotAvatar mascot={u.mascot} size={30} ring={false} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: 'var(--t-sm)' }}>{u.name}</span>
          {u.confirmed
            ? <Chip tone="green" icon={<span>✓</span>}>Confirmado</Chip>
            : <button onClick={() => confirm(u.id)} className="mb-press" style={{
                padding: '7px 12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
                background: 'var(--success)', color: '#04210f', fontWeight: 800, fontSize: 'var(--t-2xs)', fontFamily: 'var(--font-body)',
              }}>✅ Confirmar pago</button>}
        </div>
      ))}
      {log.length > 0 && (
        <Card style={{ marginTop: 12, borderColor: 'rgba(0,200,90,0.3)' }}>
          <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 700, marginBottom: 8 }}>✓ Registrado en el historial</div>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)', padding: '3px 0' }}>
              <span className="mono">{l.date}</span> · {l.name} — Pago confirmado por Tesorero
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function AdminPartidos({ onClose }) {
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', marginBottom: 10 }}>Gestión de partidos</div>
        {['➕ Crear / editar partido', '🔒 Bloquear partido manualmente', '🏁 Ingresar resultado final'].map(a => (
          <button key={a} className="mb-press" style={adminAction}>{a}</button>
        ))}
      </Card>
      <Card style={{ borderColor: 'rgba(212,175,55,0.4)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', marginBottom: 4 }}>Cierre del torneo</div>
        <p style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)', margin: '0 0 12px' }}>Calcula el ranking final y distribuye el premio entre el podio.</p>
        <GoldButton onClick={onClose}>🏆 Declarar ganadores del torneo</GoldButton>
      </Card>
    </div>
  );
}

function AdminCuotas() {
  const markets = [
    { name: 'México vs Canadá', dist: [['México', 60, 'var(--success)'], ['Empate', 15, 'var(--muted)'], ['Canadá', 25, 'var(--info)']] },
    { name: 'Argentina vs Brasil', dist: [['Argentina', 45, 'var(--info)'], ['Empate', 20, 'var(--muted)'], ['Brasil', 35, 'var(--info)']] },
  ];
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-base) var(--ease-out)' }}>
      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', marginBottom: 4 }}>Ajuste manual de cuotas</div>
        <p style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)', margin: '0 0 10px' }}>Las cuotas se ajustan automáticamente por popularidad. Puedes sobrescribirlas.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['México 2.10', 'Empate 3.20', 'Canadá 3.80'].map(c => (
            <div key={c} className="mono" style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)', fontSize: 'var(--t-2xs)', fontWeight: 700 }}>{c}</div>
          ))}
        </div>
      </Card>
      {markets.map(m => (
        <Card key={m.name} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--t-sm)', marginBottom: 10 }}>{m.name}</div>
          {m.dist.map(([label, pct, c]) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-2xs)', marginBottom: 3 }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span><span className="num" style={{ color: c }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: c, transition: 'width var(--dur-slow) var(--ease-out)' }} />
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

const adminAction = {
  width: '100%', textAlign: 'left', padding: '11px 14px', marginBottom: 6, cursor: 'pointer',
  background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--t-sm)',
};

function Admin({ onCloseTournament }) {
  const [tab, setTab] = useStateS('Pagos');
  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', background: 'var(--info-bg)', borderRadius: 'var(--r-md)', border: '1px solid rgba(74,144,226,0.3)' }}>
        <span style={{ fontSize: 18 }}>🛡️</span>
        <div style={{ fontSize: 'var(--t-xs)', color: 'var(--text)' }}>Panel del <strong>Tesorero / Admin</strong> — solo visible para Sergio G.</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <SegTabs options={['Pagos', 'Partidos', 'Cuotas', 'Usuarios', 'Liga']} value={tab} onChange={setTab} accent="var(--info)" />
      </div>
      {tab === 'Pagos' && <AdminPagos />}
      {tab === 'Partidos' && <AdminPartidos onClose={onCloseTournament} />}
      {tab === 'Cuotas' && <AdminCuotas />}
      {(tab === 'Usuarios' || tab === 'Liga') && (
        <Card style={{ textAlign: 'center', padding: '28px 16px' }}>
          <MascotAvatar mascot="clutch" size={56} />
          <p style={{ color: 'var(--muted)', margin: '12px 0 0', fontSize: 'var(--t-sm)' }}>Gestión de {tab.toLowerCase()} — próximamente en esta fase.</p>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CIERRE DEL TORNEO
// ─────────────────────────────────────────────────────────
function TournamentClose({ onExit }) {
  const [declared, setDeclared] = useStateS(false);
  const [fire, setFire] = useStateS(0);
  useEffectS(() => { setFire(Date.now()); }, []);
  const podium = Ds.LEAGUE.distribution.map(d => ({ ...d, u: Ds.userById(d.userId) }));

  return (
    <div style={{ height: '100%', overflow: 'auto', position: 'relative', background: 'radial-gradient(120% 70% at 50% 0%, rgba(212,175,55,0.18), transparent 55%), var(--bg)' }}>
      <Confetti fire={fire} />
      <div style={{ padding: '64px 20px 30px', textAlign: 'center' }}>
        <div style={{ animation: 'mb-bounce 1.6s var(--ease-spring) infinite', display: 'inline-block', marginBottom: 8 }}>
          <MascotAvatar mascot="clutch" size={110} glow jersey />
        </div>
        <div style={{ fontSize: 30, letterSpacing: 6, margin: '6px 0' }}>🏆🏆🏆</div>
        <h1 className="display" style={{ fontSize: 'var(--t-3xl)', margin: '4px 0 6px', textWrap: 'balance' }}>¡MundialBet Club 2026 ha terminado!</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)', margin: '0 0 24px' }}>Ranking final definitivo · {Ds.LEAGUE.name}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {podium.map((p, i) => (
            <div key={p.place} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--r-lg)',
              background: i === 0 ? 'linear-gradient(150deg, rgba(212,175,55,0.18), var(--surface-1))' : 'var(--surface-1)',
              border: i === 0 ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid var(--border)',
              boxShadow: i === 0 ? 'var(--glow-gold)' : 'var(--sh-1)',
              animation: `mb-pop var(--dur-slow) var(--ease-spring) ${0.2 + i * 0.12}s both`,
            }}>
              <span style={{ fontSize: 24 }}>{p.medal}</span>
              <MascotAvatar mascot={p.u.mascot} size={46} glow={i === 0} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--t-md)' }}>{p.u.name}</div>
                <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{p.u.pts} pts · {Ms[p.u.mascot].emoji} {Ms[p.u.mascot].name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ color: 'var(--gold-light)', fontSize: 'var(--t-lg)' }}>${Ds.fmt(p.amount)}</div>
                <div style={{ fontSize: 9, color: 'var(--muted-2)' }}>CLP</div>
              </div>
            </div>
          ))}
        </div>

        {!declared ? (
          <div style={{ marginTop: 24 }}>
            <GoldButton onClick={() => { setDeclared(true); setFire(Date.now()); }}>✅ Declarar ganadores oficiales</GoldButton>
            <p style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 8 }}>Solo visible para el Admin · Sergio G.</p>
          </div>
        ) : (
          <div style={{ marginTop: 24, padding: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', textAlign: 'left', animation: 'mb-pop var(--dur-base) var(--ease-spring)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <MascotAvatar mascot="clutch" size={40} />
              <p style={{ margin: 0, fontSize: 'var(--t-sm)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--info)' }}>Clutch:</strong> ¡{podium[0].u.name} es el Profeta del Mundial! El Tesorero {Ds.LEAGUE.treasurer} realizará las transferencias en los próximos 3 días. 🫎 Maple lo estará vigilando 👀
              </p>
            </div>
          </div>
        )}

        <button onClick={onExit} className="mb-press" style={{
          marginTop: 18, background: 'none', border: '1px solid var(--border-2)', color: 'var(--muted)',
          padding: '10px 20px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-xs)',
        }}>← Volver a la app</button>
      </div>
    </div>
  );
}

Object.assign(window, { Feed, Admin, TournamentClose });
