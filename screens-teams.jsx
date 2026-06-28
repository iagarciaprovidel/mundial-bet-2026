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

function StandingRow({ team, qualified, eliminated }) {
  const open = () => { if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(team.name); };
  const dg = team.dg || 0;
  return (
    <div onClick={open} className="mb-press" title={`Ver ${team.name}`} style={{
      display: 'grid', gridTemplateColumns: STANDING_COLS, gap: STANDING_GAP,
      alignItems: 'center', padding: '9px 2px', margin: '0 -2px', borderRadius: 'var(--r-sm)',
      cursor: 'pointer', borderBottom: '1px solid var(--border)',
      borderLeft: qualified ? '3px solid var(--success)' : '3px solid transparent',
      paddingLeft: qualified || eliminated ? 4 : 2,
      opacity: eliminated ? 0.45 : 1,
      background: qualified ? 'rgba(0,200,90,0.05)' : 'transparent',
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
  const allFx = (window.MB && window.MB.WC_FIXTURES) || [];
  const r32Codes = new Set(allFx.filter(f => f.stage === 'r32').flatMap(f => [f.homeCode, f.awayCode]).filter(Boolean));
  const groupFx = allFx.filter(f => !f.stage || f.stage === 'Grupos');
  const lastGroupKO = groupFx.length ? Math.max.apply(null, groupFx.map(f => new Date(f.kickoff).getTime())) : Infinity;
  const groupsClosed = isFinite(lastGroupKO) && Date.now() >= lastGroupKO + 2 * 60 * 60 * 1000;
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
          {standings.map((team, idx) => <StandingRow key={idx} team={team} qualified={groupsClosed && r32Codes.size > 0 && r32Codes.has(team.code)} eliminated={groupsClosed && r32Codes.size > 0 && !r32Codes.has(team.code)} />)}
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

function GroupClassificationMap({ onTeam }) {
  const allFx = (window.MB && window.MB.WC_FIXTURES) || [];
  const r32Codes = new Set(allFx.filter(f => f.stage === 'r32').flatMap(f => [f.homeCode, f.awayCode]).filter(Boolean));
  const groupFx = allFx.filter(f => !f.stage || f.stage === 'Grupos');
  const lastKO = groupFx.length ? Math.max.apply(null, groupFx.map(f => new Date(f.kickoff).getTime())) : Infinity;
  const groupsClosed = r32Codes.size > 0 && isFinite(lastKO) && Date.now() >= lastKO + 2 * 60 * 60 * 1000;
  if (!groupsClosed) return null;

  const gs = (window.MB_standings ? window.MB_standings({}) : (window.MB && window.MB.GROUP_STANDINGS)) || {};
  const groups = Object.keys(gs).sort();

  const openTeam = (team) => {
    if (onTeam) { const allT = window.MB_ALL_TEAMS || []; const t = allT.find(x => x.name === team.name); if (t) { onTeam(t); return; } }
    if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(team.name);
  };

  return (
    <Card style={{ padding: '12px 12px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 'var(--t-sm)', fontWeight: 800 }}>Clasificación fase de grupos</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 'var(--t-3xs)', color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--success)', display: 'inline-block' }} /> Clasificado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0.55 }}>
            <span style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--danger)', display: 'inline-block' }} /> Eliminado
          </span>
        </div>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
        <div style={{ display: 'flex', gap: 4, width: 'max-content' }}>
          {groups.map(g => {
            const teams = gs[g] || [];
            return (
              <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', width: 52 }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gold-light)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2, alignSelf: 'stretch', textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 3 }}>G.{g}</div>
                {/* separator: dotted line after 2nd team */}
                {teams.map((team, idx) => {
                  const classified = r32Codes.has(team.code);
                  return (
                    <React.Fragment key={team.name || idx}>
                      {idx === 2 && (
                        <div style={{ width: '100%', borderTop: '1px dashed rgba(255,255,255,0.12)', margin: '1px 0' }} />
                      )}
                      <div onClick={() => openTeam(team)} className="mb-press" title={`${team.name}${classified ? ' — Clasificado ✅' : ' — Eliminado ❌'}`} style={{
                        cursor: 'pointer', padding: '3px 4px 4px', borderRadius: 5, width: '100%',
                        background: classified ? 'rgba(0,200,90,0.1)' : 'rgba(232,64,64,0.05)',
                        borderLeft: `2px solid ${classified ? 'var(--success)' : 'rgba(232,64,64,0.35)'}`,
                        opacity: classified ? 1 : 0.5,
                        filter: classified ? 'none' : 'grayscale(0.65)',
                      }}>
                        <img src={`https://flagcdn.com/h20/${team.code || ''}.png`} alt={team.name} style={{ height: 13, width: 'auto', borderRadius: 2, display: 'block', maxWidth: 44 }} />
                        <div style={{ fontSize: '8px', color: classified ? 'var(--success)' : 'var(--muted-2)', fontWeight: 700, marginTop: 2, lineHeight: 1, maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(team.name || '').substring(0, 8)}
                        </div>
                        <div style={{ fontSize: '7px', color: 'var(--muted-2)', fontWeight: 600, lineHeight: 1, marginTop: 1 }}>{team.pts}pts</div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
window.MB_GroupClassificationMap = GroupClassificationMap;

function TeamsScreen() {
  const groups = Object.keys(Dt.GROUP_STANDINGS || {});
  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* El título "Equipos" ya lo pone el shell (app.jsx); aquí solo el subtítulo. */}
      <p style={{ margin: '-4px 0 0', fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>Los 12 grupos del Mundial 2026 · 48 selecciones con su DT</p>
      {window.MB_GroupClassificationMap && React.createElement(window.MB_GroupClassificationMap)}
      {groups.map((g, i) => <GroupCard key={g} groupId={g} color={GROUP_COLORS[i % GROUP_COLORS.length]} />)}
      <RefereesMobile />
    </div>
  );
}

Object.assign(window, { TeamsScreen });
