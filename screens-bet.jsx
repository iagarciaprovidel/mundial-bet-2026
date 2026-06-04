/* ============================================================
   Screens: Partidos (cuotas + apuesta) + Quiniela (anonimato)
   ============================================================ */
const { useState: useStateB } = React;
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

function Partidos({ onLoading }) {
  const [phase, setPhase] = useStateB('Grupos');
  
  // Filtrar partidos según la fase seleccionada
  const filteredMatches = Db.UPCOMING.filter(m => {
    if (phase === 'Grupos') return m.stage === 'Grupos';
    if (phase === 'Octavos') return m.stage === 'Octavos';
    if (phase === 'Cuartos') return m.stage === 'Cuartos';
    if (phase === 'Semis') return m.stage === 'Semifinal';
    if (phase === 'Final') return m.stage === 'Final';
    return false;
  });
  
  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ marginBottom: 16 }}>
        <SegTabs options={['Grupos', 'Octavos', 'Cuartos', 'Semis', 'Final']} value={phase} onChange={setPhase} accent="var(--info)" />
      </div>
      <SectionHead title={phase === 'Grupos' ? 'Próximos partidos' : `${phase} de final`} />
      {filteredMatches.length > 0 ? (
        filteredMatches.map(m => <MatchBetCard key={m.id} match={m} />)
      ) : (
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>No hay partidos en esta fase</div>
        </Card>
      )}

      {phase === 'Grupos' && (
        <>
          <div style={{ marginTop: 8 }}><SectionHead title="Mercados especiales" /></div>
          {Db.SPECIALS.map((m, i) => <SpecialMarket key={i} market={m} />)}

          <div style={{ marginTop: 8 }}><SectionHead title="Finalizados" /></div>
          {Db.PLAYED.map(m => <PlayedCard key={m.id} m={m} />)}
        </>
      )}
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
        <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)' }}>{open.title}</h3>
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
        <h3 className="display" style={{ margin: '0 0 8px', fontSize: 'var(--t-lg)' }}>{locked.title}</h3>
        <Chip tone="neutral">Bloqueado · Resultado {locked.result}</Chip>
      </div>
      <div style={{ marginTop: 10 }}>
        {locked.entries.map((e, i) => <AnonRowLocked key={i} e={e} />)}
      </div>
    </div>
  );
}

Object.assign(window, { Partidos, Quiniela });
