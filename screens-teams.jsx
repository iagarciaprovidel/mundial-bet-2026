/* ============================================================
   Pantalla: Equipos y Grupos del Mundial 2026
   ============================================================ */
const { useState: useStateT } = React;
const Dt = window.MB;
const Mt = Dt.MASCOTS;
const { MascotAvatar, Card, SectionHead } = window;

// Datos de grupos y equipos
const GROUPS = {
  'A': {
    name: 'Grupo A',
    color: '#4A90E2',
    teams: [
      { flag: '🇧🇷', name: 'Brasil', mascot: null, status: 'clasificado' },
      { flag: '🇦🇷', name: 'Argentina', mascot: null, status: 'clasificado' },
      { flag: '🇺🇾', name: 'Uruguay', mascot: null, status: 'clasificado' },
      { flag: '🇵🇦', name: 'Panamá', mascot: null, status: 'eliminado' },
    ]
  },
  'B': {
    name: 'Grupo B',
    color: '#00D466',
    teams: [
      { flag: '🇫🇷', name: 'Francia', mascot: null, status: 'clasificado' },
      { flag: '🇪🇸', name: 'España', mascot: null, status: 'clasificado' },
      { flag: '🇩🇪', name: 'Alemania', mascot: null, status: 'clasificado' },
      { flag: '🇯🇵', name: 'Japón', mascot: null, status: 'eliminado' },
    ]
  },
  'C': {
    name: 'Grupo C',
    color: '#FFB81C',
    teams: [
      { flag: '🇲🇽', name: 'México', mascot: 'zayu', status: 'clasificado' },
      { flag: '🇨🇦', name: 'Canadá', mascot: 'maple', status: 'clasificado' },
      { flag: '🇺🇸', name: 'Estados Unidos', mascot: 'clutch', status: 'clasificado' },
      { flag: '🇮🇸', name: 'Islandia', mascot: null, status: 'eliminado' },
    ]
  },
  'D': {
    name: 'Grupo D',
    color: '#F77F88',
    teams: [
      { flag: '🇬🇧', name: 'Inglaterra', mascot: null, status: 'clasificado' },
      { flag: '🇳🇱', name: 'Países Bajos', mascot: null, status: 'clasificado' },
      { flag: '🇧🇪', name: 'Bélgica', mascot: null, status: 'clasificado' },
      { flag: '🇸🇪', name: 'Suecia', mascot: null, status: 'eliminado' },
    ]
  },
  'E': {
    name: 'Grupo E',
    color: '#2E8BC0',
    teams: [
      { flag: '🇵🇹', name: 'Portugal', mascot: null, status: 'clasificado' },
      { flag: '🇮🇹', name: 'Italia', mascot: null, status: 'clasificado' },
      { flag: '🇨🇭', name: 'Suiza', mascot: null, status: 'clasificado' },
      { flag: '🇸🇦', name: 'Arabia Saudita', mascot: null, status: 'eliminado' },
    ]
  },
  'F': {
    name: 'Grupo F',
    color: '#00D466',
    teams: [
      { flag: '🇦🇺', name: 'Australia', mascot: null, status: 'clasificado' },
      { flag: '🇵🇪', name: 'Perú', mascot: null, status: 'clasificado' },
      { flag: '🇰🇷', name: 'Corea del Sur', mascot: null, status: 'clasificado' },
      { flag: '🇲🇦', name: 'Marruecos', mascot: null, status: 'eliminado' },
    ]
  },
};

function StandingRow({ team, groupColor }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '30px 1fr 30px 30px 30px 40px',
      gap: 8,
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      fontSize: 'var(--t-3xs)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--muted-2)', textAlign: 'center' }}>{team.pos}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 16 }}>{team.flag}</span>
        <span style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {team.name}
        </span>
      </div>
      <div style={{ textAlign: 'center', color: 'var(--muted-2)' }}>{team.j}</div>
      <div style={{ textAlign: 'center', color: 'var(--muted-2)' }}>{team.g}-{team.e}</div>
      <div style={{ textAlign: 'center', color: 'var(--muted-2)' }}>{team.gf}-{team.gc}</div>
      <div style={{ textAlign: 'center', fontWeight: 700, color: groupColor }}>{team.pts}</div>
    </div>
  );
}

function GroupCard({ groupId, group }) {
  const [expanded, setExpanded] = React.useState(true);
  const standings = Dt.GROUP_STANDINGS[groupId] || [];

  return (
    <Card style={{ padding: '0' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: expanded ? `1px solid var(--border)` : 'none',
        }}
      >
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: group.color,
        }} />
        <h3 style={{
          flex: 1,
          textAlign: 'left',
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-lg)',
          fontWeight: 700,
          color: 'var(--text)',
        }}>
          {group.name}
        </h3>
        <span style={{
          fontSize: 'var(--t-sm)',
          color: 'var(--muted-2)',
          transform: expanded ? 'rotate(0)' : 'rotate(-90deg)',
          transition: 'transform var(--dur-base) var(--ease-out)',
        }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '12px 14px' }}>
          {/* Encabezados tabla */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '30px 1fr 30px 30px 30px 40px',
            gap: 8,
            alignItems: 'center',
            paddingBottom: 8,
            marginBottom: 4,
            borderBottom: `2px solid ${group.color}`,
            fontSize: 'var(--t-3xs)',
            fontWeight: 700,
            color: 'var(--muted-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <div style={{ textAlign: 'center' }}>Pos</div>
            <div>Equipo</div>
            <div style={{ textAlign: 'center' }}>J</div>
            <div style={{ textAlign: 'center' }}>G-E</div>
            <div style={{ textAlign: 'center' }}>GF-GC</div>
            <div style={{ textAlign: 'center' }}>Pts</div>
          </div>

          {/* Filas de equipos */}
          <div>
            {standings.map((team, idx) => (
              <StandingRow key={idx} team={team} groupColor={group.color} />
            ))}
          </div>

          {/* Leyenda */}
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            fontSize: 'var(--t-3xs)',
            color: 'var(--muted-2)',
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '8px 16px',
            lineHeight: 1.4,
          }}>
            <div>J = Partidos Jugados</div>
            <div>Pts = Puntos</div>
            <div>G-E = Goles-Empates</div>
            <div>GF-GC = Goles a Favor - Contra</div>
          </div>
        </div>
      )}
    </Card>
  );
}

function TeamsScreen() {
  return (
    <div style={{
      padding: '0 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      animation: 'mb-fade-up var(--dur-slow) var(--ease-out)',
    }}>
      <div>
        <h2 className="display" style={{
          margin: '0 0 4px',
          fontSize: 'var(--t-2xl)',
          color: 'var(--text)',
        }}>
          Equipos y Grupos
        </h2>
        <p style={{
          margin: 0,
          fontSize: 'var(--t-sm)',
          color: 'var(--muted)',
        }}>
          Tabla de posiciones del Mundial 2026
        </p>
      </div>

      {Object.entries(GROUPS).map(([groupId, group]) => (
        <GroupCard key={groupId} groupId={groupId} group={group} />
      ))}
    </div>
  );
}

Object.assign(window, { TeamsScreen });
