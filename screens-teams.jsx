/* ============================================================
   Pantalla MÓVIL: Equipos y Grupos — Mundial 2026 (datos reales)
   Lee window.MB.GROUP_STANDINGS (12 grupos, 48 equipos con DT)
   y window.MB.REFEREES. Banderas como imagen (flagcdn por código).
   ============================================================ */
const Dt = window.MB;
const { Card, SectionHead } = window;

const GROUP_COLORS = ['#4A90E2', '#00D466', '#FFB81C', '#F77F88', '#2E8BC0', '#9B6DFF',
  '#00C2A8', '#FF8A4A', '#E84393', '#5AD1FF', '#A0D911', '#FF6B6B'];

// Columnas de la tabla: #, bandera, equipo·DT, PJ, G, E, P, GF, GC, DG, Pts.
// Header y filas comparten esta grilla para mantenerse alineados.
const STANDING_COLS = '15px 18px minmax(0,1fr) 15px 14px 14px 14px 16px 16px 20px 22px';
const STANDING_GAP = 4;

function Num({ children, color, bold }) {
  return <div style={{ textAlign: 'center', color: color || 'var(--muted-2)', fontSize: 'var(--t-3xs)', fontWeight: bold ? 700 : 600 }}>{children}</div>;
}

function StandingRow({ team }) {
  const open = () => { if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(team.name); };
  const dg = team.dg || 0;
  return (
    <div onClick={open} className="mb-press" title={`Ver ${team.name}`} style={{
      display: 'grid', gridTemplateColumns: STANDING_COLS, gap: STANDING_GAP,
      alignItems: 'center', padding: '9px 2px', margin: '0 -2px', borderRadius: 'var(--r-sm)',
      cursor: 'pointer', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--muted-2)', textAlign: 'center', fontSize: 'var(--t-2xs)' }}>{team.pos}</div>
      <img src={`https://flagcdn.com/h24/${team.code || ''}.png`} alt="" style={{ height: 14, width: 'auto', borderRadius: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 'var(--t-2xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}{team.live && <span title="En vivo" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ff5252', marginLeft: 5, verticalAlign: 'middle', animation: 'mb-pulse-live 1s var(--ease-out) infinite' }} />}</div>
        {team.coach && (
          <div style={{ fontSize: 9, color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span>🎽</span>
            {team.coachCode && <img src={`https://flagcdn.com/h20/${team.coachCode}.png`} alt="" title={team.coachCountry} style={{ height: 8, width: 'auto', borderRadius: 1 }} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.coach}</span>
          </div>
        )}
      </div>
      <Num>{team.j}</Num>
      <Num color={team.g ? 'var(--success)' : 'var(--muted-2)'}>{team.g}</Num>
      <Num>{team.e}</Num>
      <Num color={team.p ? '#e98b8b' : 'var(--muted-2)'}>{team.p}</Num>
      <Num>{team.gf}</Num>
      <Num>{team.gc}</Num>
      <Num color={dg > 0 ? 'var(--success)' : dg < 0 ? '#e98b8b' : 'var(--muted-2)'}>{dg > 0 ? '+' + dg : dg}</Num>
      <Num color="var(--gold-light)" bold>{team.pts}</Num>
    </div>
  );
}

function GroupCard({ groupId, color }) {
  const [expanded, setExpanded] = React.useState(true);
  const store = window.MB_useBetStore ? window.MB_useBetStore() : null;
  const standings = (window.MB_standings ? window.MB_standings(store ? store.odds : {})[groupId] : Dt.GROUP_STANDINGS[groupId]) || [];
  return (
    <Card style={{ padding: 0 }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10, borderBottom: expanded ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <h3 className="display" style={{ flex: 1, textAlign: 'left', margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>Grupo {groupId}</h3>
        <span style={{ fontSize: 'var(--t-sm)', color: 'var(--muted-2)', transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform var(--dur-base) var(--ease-out)' }}>▼</span>
      </button>
      {expanded && (
        <div style={{ padding: '8px 14px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: STANDING_COLS, gap: STANDING_GAP, alignItems: 'center', paddingBottom: 6, borderBottom: `2px solid ${color}`, fontSize: 9, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase' }}>
            <div style={{ textAlign: 'center' }}>#</div>
            <div />
            <div>Equipo · DT</div>
            <div style={{ textAlign: 'center' }} title="Partidos jugados">PJ</div>
            <div style={{ textAlign: 'center' }} title="Ganados">G</div>
            <div style={{ textAlign: 'center' }} title="Empatados">E</div>
            <div style={{ textAlign: 'center' }} title="Perdidos">P</div>
            <div style={{ textAlign: 'center' }} title="Goles a favor">GF</div>
            <div style={{ textAlign: 'center' }} title="Goles en contra">GC</div>
            <div style={{ textAlign: 'center' }} title="Diferencia de gol">DG</div>
            <div style={{ textAlign: 'center' }} title="Puntos">Pts</div>
          </div>
          {standings.map((team, idx) => <StandingRow key={idx} team={team} />)}
        </div>
      )}
    </Card>
  );
}

function RefereesMobile() {
  const refs = Dt.REFEREES || [];
  if (!refs.length) return null;
  return (
    <div>
      <SectionHead title={`Árbitros (${refs.length})`} />
      <Card style={{ padding: '6px 14px', maxHeight: 320, overflow: 'auto' }}>
        {refs.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: i < refs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <img src={`https://flagcdn.com/h24/${r.code}.png`} alt="" style={{ height: 13, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 'var(--t-sm)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{r.country}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function TeamsScreen() {
  const groups = Object.keys(Dt.GROUP_STANDINGS || {});
  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* El título "Equipos" ya lo pone el shell (app.jsx); aquí solo el subtítulo. */}
      <p style={{ margin: '-4px 0 0', fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>Los 12 grupos del Mundial 2026 · 48 selecciones con su DT</p>
      {groups.map((g, i) => <GroupCard key={g} groupId={g} color={GROUP_COLORS[i % GROUP_COLORS.length]} />)}
      <RefereesMobile />
    </div>
  );
}

Object.assign(window, { TeamsScreen });
