/* ============================================================
   MundialBet Club 2026 — Versión WEB de escritorio (responsive)
   Shell sidebar + topbar y pantallas anchas. Reutiliza data.js +
   componentes. Envuelto en IIFE; se expone como window.AppWeb y lo
   monta el bootstrap responsive de index.html.
   ============================================================ */
(function () {
const { useState: useStateW, useEffect: useEffectW, useRef: useRefW } = React;
const Dw = window.MB;
const Mw = Dw.MASCOTS;
const {
  MascotAvatar, InitialAvatar, CoinBadge, Chip, Card, SectionHead, SegTabs,
  ProgressBar, BetButton, CountdownTimer, FeedItem, GoldButton, PrizePotCard,
  ResultBadge, EmptyState, useCountUp,
  Quiniela, Admin, TournamentClose,
  useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakButton,
} = window;

const TWEAK_DEFAULTS_W = /*EDITMODE-BEGIN*/{
  "accent": "#4A90E2",
  "anim": "Normal",
  "role": "Jugador"
}/*EDITMODE-END*/;

const NAV_W = [
  { id: 'inicio',   label: 'Inicio',   icon: '🏠' },
  { id: 'partidos', label: 'Partidos', icon: '⚽' },
  { id: 'equipos',  label: 'Equipos',  icon: '🌍' },
  { id: 'ranking',  label: 'Ranking',  icon: '🏆' },
  { id: 'liga',     label: 'Liga',     icon: '💰' },
  { id: 'perfil',   label: 'Perfil',   icon: '👤' },
  { id: 'feed',     label: 'Feed',     icon: '📣' },
];

const TITLES = {
  inicio: 'Inicio', partidos: 'Partidos', equipos: 'Equipos y grupos',
  ranking: 'Ranking', liga: 'Liga', perfil: 'Mi perfil', feed: 'Feed social',
  quiniela: 'Quiniela anónima', admin: 'Panel Admin',
};

// Todas las banderas de los equipos del Mundial (tomadas de los grupos)
const ALL_FLAGS = (function () {
  const seen = {}, out = [];
  Object.values(Dw.GROUP_STANDINGS).forEach(g => g.forEach(t => {
    if (!seen[t.flag]) { seen[t.flag] = 1; out.push(t.flag); }
  }));
  return out;
})();

// Convierte un emoji de bandera (2 indicadores regionales) a su código ISO ("br")
function flagToCode(flag) {
  const cps = Array.from(flag).map(c => c.codePointAt(0));
  const A = 0x1F1E6;
  if (cps.length < 2) return null;
  const a = cps[0] - A, b = cps[1] - A;
  if (a < 0 || a > 25 || b < 0 || b > 25) return null;
  return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
}
const FLAG_CODES = (function () {
  const seen = {}, out = [];
  Object.values(Dw.GROUP_STANDINGS).forEach(g => g.forEach(t => {
    const c = t.code || flagToCode(t.flag);
    if (c && !seen[c]) { seen[c] = 1; out.push(c); }
  }));
  return out;
})();
// Código de bandera de un equipo (prefiere el ISO real)
const teamCode = (t) => t.code || flagToCode(t.flag) || 'xx';

// Muro decorativo de banderas (imágenes reales, no emojis) — fondo topbar/sidebar
function FlagWall({ vertical = false, size = 34, opacity = 0.1, repeat = 4 }) {
  const codes = [];
  for (let i = 0; i < repeat; i++) codes.push(...FLAG_CODES);
  const mask = vertical
    ? 'linear-gradient(180deg, transparent, #000 14%, #000 86%, transparent)'
    : 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)';
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      display: 'flex', flexWrap: vertical ? 'wrap' : 'nowrap',
      alignContent: 'flex-start', alignItems: 'center',
      gap: vertical ? 9 : 8, padding: vertical ? '16px 10px' : '0 10px',
      opacity, whiteSpace: vertical ? 'normal' : 'nowrap',
      WebkitMaskImage: mask, maskImage: mask,
    }}>
      {codes.map((c, i) => (
        <img key={i} src={`https://flagcdn.com/h60/${c}.png`} alt="" draggable="false" loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ height: Math.round(size * 0.66), width: 'auto', borderRadius: 3, display: 'block', flexShrink: 0 }} />
      ))}
    </div>
  );
}

// Todos los equipos del Mundial con su grupo (para el ticker y el modal)
const ALL_TEAMS = (function () {
  const out = [];
  Object.keys(Dw.GROUP_STANDINGS).forEach(letter => {
    Dw.GROUP_STANDINGS[letter].forEach(t => out.push(Object.assign({}, t, { group: letter })));
  });
  return out;
})();
// Busca la ficha completa de una selección por nombre (para abrir el modal desde partidos)
const teamByName = (name) => ALL_TEAMS.find(t => t.name === name) || null;

// CSS para el marquee y el hover de banderas
(function injectWebCSS() {
  if (document.getElementById('mb-web-css')) return;
  const s = document.createElement('style');
  s.id = 'mb-web-css';
  s.textContent = `
    @keyframes mb-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .mb-ticker { animation: mb-marquee 55s linear infinite; }
    .mb-ticker-wrap:hover .mb-ticker, .mb-ticker:hover { animation-play-state: paused !important; }
    .mb-flagbtn img { transition: transform .15s var(--ease-out), box-shadow .15s; }
    .mb-flagbtn:hover img { transform: scale(1.22) translateY(-1px); box-shadow: 0 0 0 2px var(--gold), 0 3px 10px rgba(0,0,0,0.55); }
    .mb-team-row { transition: background .15s var(--ease-out); }
    .mb-team-row:hover { background: rgba(212,175,55,0.10); }
    .mb-flag-zoom { transition: transform .15s var(--ease-out), box-shadow .15s; }
    *:hover > .mb-flag-zoom { transform: scale(1.12) translateY(-1px); box-shadow: 0 0 0 2px var(--gold), 0 3px 10px rgba(0,0,0,0.5) !important; }
  `;
  document.head.appendChild(s);
})();

// Ticker de banderas en movimiento, clickeable, con popover al hover
function FlagTicker({ onSelect, onGroup }) {
  const items = ALL_TEAMS.concat(ALL_TEAMS); // duplicado para bucle continuo
  const mask = 'linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent)';
  const [hov, setHov] = useStateW(null);
  const timer = useRefW(null);
  const cancelClose = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const open = (team, e) => {
    cancelClose();
    const r = e.currentTarget.getBoundingClientRect();
    setHov({ team, x: r.left + r.width / 2, y: r.bottom });
  };
  const scheduleClose = () => { cancelClose(); timer.current = setTimeout(() => setHov(null), 180); };
  // Próximo partido del equipo (el más cercano a futuro; si no, el primero del fixture)
  const nextMatch = (name) => {
    const fx = (window.MB.WC_FIXTURES) || [];
    const mine = fx.filter(m => m.home === name || m.away === name)
      .sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1));
    const now = Date.now();
    return mine.find(m => new Date(m.kickoff).getTime() > now) || mine[0] || null;
  };

  return (
    <div className="mb-ticker-wrap" style={{
      flex: 1, minWidth: 0, alignSelf: 'stretch', overflow: 'hidden',
      display: 'flex', alignItems: 'center',
      WebkitMaskImage: mask, maskImage: mask,
    }}>
      <div className="mb-ticker" style={{
        display: 'flex', alignItems: 'center', gap: 16, width: 'max-content',
      }}>
        {items.map((t, i) => (
          <button key={i} className="mb-flagbtn" title={t.name}
            onMouseEnter={(e) => open(t, e)} onMouseLeave={scheduleClose} onClick={() => onSelect(t)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, lineHeight: 0 }}>
            <img src={`https://flagcdn.com/h40/${teamCode(t)}.png`} alt={t.name}
              style={{ height: 22, width: 'auto', borderRadius: 3, display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,0.45)' }} />
          </button>
        ))}
      </div>

      {hov && ReactDOM.createPortal(
        <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose}
          onClick={() => { const team = hov.team; setHov(null); onSelect(team); }}
          title={`Ver ficha de ${hov.team.name}`} className="mb-press" style={{
          position: 'fixed', left: hov.x, top: hov.y + 7, transform: 'translateX(-50%)', zIndex: 150, width: 220, cursor: 'pointer',
          background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)',
          padding: '12px 14px', boxShadow: 'var(--sh-3)', animation: 'mb-fade-up var(--dur-fast) var(--ease-out)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
            <img src={`https://flagcdn.com/h40/${teamCode(hov.team)}.png`} alt=""
              style={{ height: 20, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{hov.team.name}</div>
              {hov.team.coach && (
                <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>🎽</span>
                  {hov.team.coachCode && <img src={`https://flagcdn.com/h20/${hov.team.coachCode}.png`} alt="" title={hov.team.coachCountry} style={{ height: 9, width: 'auto', borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />}
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hov.team.coach}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {hov.team.j > 0
              ? (hov.team.pos <= 2
                ? <Chip tone="green" icon={<span>✓</span>}>Clasifica</Chip>
                : <Chip tone="neutral">Eliminado</Chip>)
              : <Chip tone="blue">Fase de grupos</Chip>}
            <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>Grupo {hov.team.group} · #{hov.team.pos}{hov.team.j > 0 ? ` · ${hov.team.pts} pts` : ''}</span>
          </div>
          {(() => {
            const nm = nextMatch(hov.team.name);
            if (!nm) return null;
            const home = nm.home === hov.team.name;
            const rivalName = home ? nm.away : nm.home;
            const rivalCode = home ? nm.awayCode : nm.homeCode;
            const d = new Date(nm.kickoff);
            const fecha = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });
            const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            return (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 9 }}>
                <div style={{ fontSize: 9, color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Próximo partido</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{home ? 'vs' : '@'}</span>
                  <img src={`https://flagcdn.com/h20/${rivalCode}.png`} alt="" style={{ height: 13, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
                  <span style={{ fontSize: 'var(--t-2xs)', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rivalName}</span>
                </div>
                <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', textTransform: 'capitalize' }}>📅 {fecha} · {hora}</div>
                <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {nm.stadium}</div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}

// Modal con todos los datos de un equipo
const POS_TONE = {
  POR: ['var(--gold-light)', 'rgba(212,175,55,0.14)'],
  DEF: ['var(--info)', 'rgba(74,144,226,0.14)'],
  MED: ['var(--success)', 'rgba(0,200,90,0.14)'],
  DEL: ['var(--danger)', 'rgba(232,64,64,0.14)'],
};
function PlayerRow({ p, starter }) {
  const tone = POS_TONE[p.pos] || ['var(--muted)', 'rgba(255,255,255,0.06)'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="num" style={{ width: 22, textAlign: 'center', color: starter ? 'var(--gold-light)' : 'var(--muted-2)', fontSize: 'var(--t-2xs)', flexShrink: 0 }}>{p.n}</span>
      <span style={{ flex: 1, fontSize: 'var(--t-sm)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: starter ? 700 : 400 }}>
        {starter && <span style={{ color: 'var(--gold)', marginRight: 4 }}>★</span>}{p.name}
      </span>
      <span style={{ fontSize: 9, fontWeight: 800, color: tone[0], background: tone[1], padding: '2px 6px', borderRadius: 'var(--r-pill)', flexShrink: 0 }}>{p.pos}</span>
    </div>
  );
}
function TeamModal({ team, onClose }) {
  if (!team) return null;
  const code = teamCode(team);
  const standings = (window.MB.GROUP_STANDINGS && window.MB.GROUP_STANDINGS[team.group]) || [];
  const fmtKO = (iso) => new Date(iso).toLocaleString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const teamFixtures = ((window.MB.WC_FIXTURES) || [])
    .filter(m => m.home === team.name || m.away === team.name)
    .sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1));
  const squad = (window.MB.PLAYERS && window.MB.PLAYERS[team.name]) || [];
  const titulares = squad.filter(p => p.t);
  const suplentes = squad.filter(p => !p.t);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,8,15,0.72)',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      animation: 'mb-fade-up var(--dur-base) var(--ease-out)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-2xl)',
        padding: 24, width: 'min(480px, 92vw)', maxHeight: '88vh', overflow: 'auto',
        boxShadow: 'var(--sh-4)', animation: 'mb-pop var(--dur-slow) var(--ease-spring)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <img src={`https://flagcdn.com/h80/${code}.png`} alt={team.name}
            style={{ height: 50, width: 'auto', borderRadius: 5, boxShadow: 'var(--sh-2)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-2xl)' }}>{team.name}</h2>
            {team.coach && (
              <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>🎽 DT:</span>
                {team.coachCode && <img src={`https://flagcdn.com/h20/${team.coachCode}.png`} alt="" title={team.coachCountry} style={{ height: 11, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />}
                <strong>{team.coach}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <Chip tone="blue">Grupo {team.group}</Chip>
            </div>
          </div>
          <button onClick={onClose} className="mb-press" style={{
            width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)',
            background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, flexShrink: 0,
          }}>✕</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <SectionHead title={`Tabla · Grupo ${team.group}`} />
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '10px 6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 22px 18px 18px 18px 30px 30px', gap: 5, alignItems: 'center', padding: '0 6px 7px', borderBottom: '1px solid var(--border)', fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700 }}>
              <span style={{ textAlign: 'center' }}>#</span>
              <span>Equipo</span>
              <span style={{ textAlign: 'center' }}>PJ</span>
              <span style={{ textAlign: 'center' }}>G</span>
              <span style={{ textAlign: 'center' }}>E</span>
              <span style={{ textAlign: 'center' }}>P</span>
              <span style={{ textAlign: 'center' }}>DG</span>
              <span style={{ textAlign: 'center' }}>Pts</span>
            </div>
            {standings.map(r => {
              const isMe = r.name === team.name;
              const d = r.gf - r.gc;
              return (
                <div key={r.name} style={{
                  display: 'grid', gridTemplateColumns: '18px 1fr 22px 18px 18px 18px 30px 30px', gap: 5, alignItems: 'center', padding: '7px 6px',
                  borderRadius: 'var(--r-sm)', marginTop: 2,
                  background: isMe ? 'rgba(212,175,55,0.16)' : 'transparent',
                  border: isMe ? '1px solid rgba(212,175,55,0.55)' : '1px solid transparent',
                }}>
                  <span style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', fontWeight: 700, color: r.pos <= 2 ? 'var(--success)' : 'var(--muted-2)' }}>{r.pos}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <img src={`https://flagcdn.com/h20/${r.code || ''}.png`} alt="" style={{ height: 13, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--t-2xs)', fontWeight: isMe ? 800 : 600, color: isMe ? 'var(--gold-light)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  </span>
                  <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.j}</span>
                  <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.g}</span>
                  <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.e}</span>
                  <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.p}</span>
                  <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', color: d >= 0 ? 'var(--success)' : 'var(--danger)' }}>{(d > 0 ? '+' : '') + d}</span>
                  <span className="num" style={{ textAlign: 'center', fontSize: 'var(--t-sm)', fontWeight: 800, color: 'var(--gold-light)' }}>{r.pts}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: 6, paddingLeft: 2 }}>Los 2 primeros avanzan de fase.</div>
        </div>

        <SectionHead title="Partidos en el grupo" />
        {teamFixtures.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>Sin partidos registrados.</div>
        )}
        {teamFixtures.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < teamFixtures.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <Chip tone="blue">J{m.md}</Chip>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--t-sm)', fontWeight: 700 }}>{m.home} vs {m.away}</div>
              <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {m.stadium}</div>
              {(() => {
                const r = window.MB.refForMatch && window.MB.refForMatch(m);
                return r ? (
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <span>🧑‍⚖️</span>
                    <img src={`https://flagcdn.com/h20/${r.code}.png`} alt="" title={r.country} style={{ height: 8, width: 'auto', borderRadius: 1 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  </div>
                ) : null;
              })()}
            </div>
            <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{fmtKO(m.kickoff)}</span>
          </div>
        ))}

        <div style={{ marginTop: 18 }}>
          <SectionHead title={`Jugadores convocados (${squad.length})`} />
        </div>
        {team.coach && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--t-2xs)', color: 'var(--muted)', margin: '-4px 0 10px' }}>
            <span>🎽 DT:</span>
            {team.coachCode && <img src={`https://flagcdn.com/h20/${team.coachCode}.png`} alt="" title={team.coachCountry} style={{ height: 11, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />}
            <strong>{team.coach}</strong>
          </div>
        )}
        {squad.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>Plantilla no disponible.</div>
        ) : (
          <div>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '2px 0 4px' }}>★ Once titular ({titulares.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px', marginBottom: 12 }}>
              {titulares.map((p, i) => <PlayerRow key={'t' + i} p={p} starter />)}
            </div>
            <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '2px 0 4px' }}>Suplentes ({suplentes.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
              {suplentes.map((p, i) => <PlayerRow key={'s' + i} p={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({ tab, onTab, me, accent, role, onAdmin }) {
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const [installable, setInstallable] = useStateW(!!window.__deferredPrompt);
  useEffectW(() => {
    const on = () => setInstallable(true), off = () => setInstallable(false);
    window.addEventListener('mb-installable', on);
    window.addEventListener('mb-installed', off);
    return () => { window.removeEventListener('mb-installable', on); window.removeEventListener('mb-installed', off); };
  }, []);

  return (
    <aside style={{
      width: 248, flexShrink: 0, height: '100%', position: 'relative', overflow: 'hidden',
      background: 'rgba(8,15,10,0.92)', borderRight: '1px solid var(--border)',
    }}>
      <FlagWall vertical size={34} opacity={0.24} repeat={6} />
      <div style={{
        position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column',
        padding: '22px 16px',
      }}>
      {/* logo (→ Inicio) */}
      <button onClick={() => onTab('inicio')} className="mb-press" title="Ir al inicio" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
        <span style={{ fontSize: 24 }}>🏆</span>
        <div>
          <div className="display" style={{ fontSize: 'var(--t-lg)', color: 'var(--text)' }}>MundialBet<span style={{ color: accent }}> Club</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            {['us', 'mx', 'ca'].map(c => (
              <img key={c} src={`https://flagcdn.com/h20/${c}.png`} alt="" style={{ height: 12, width: 'auto', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
            ))}
            <span style={{ fontSize: 9, color: 'var(--muted-2)', fontWeight: 800, letterSpacing: '0.1em', marginLeft: 3 }}>MUNDIAL 2026</span>
          </div>
        </div>
      </button>

      {/* nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 22 }}>
        {NAV_W.map(n => {
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => onTab(n.id)} className="mb-press" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', cursor: 'pointer',
              borderRadius: 'var(--r-md)', border: 'none', textAlign: 'left',
              background: active ? `${accent}1f` : 'transparent',
              boxShadow: active ? `inset 3px 0 0 ${accent}` : 'none',
              color: active ? '#fff' : 'var(--muted)', fontFamily: 'var(--font-body)',
              fontWeight: active ? 700 : 600, fontSize: 'var(--t-sm)', transition: 'all var(--dur-base) var(--ease-out)',
            }}>
              <span style={{ fontSize: 18, filter: active ? 'none' : 'grayscale(0.5) opacity(0.7)' }}>{n.icon}</span>
              {n.label}
            </button>
          );
        })}
        {role === 'Admin / Tesorero' && (
          <button onClick={onAdmin} className="mb-press" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', cursor: 'pointer', marginTop: 6,
            borderRadius: 'var(--r-md)', border: '1px solid rgba(74,144,226,0.3)',
            background: tab === 'admin' ? 'var(--info-bg)' : 'transparent',
            color: tab === 'admin' ? 'var(--info)' : 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-sm)',
          }}>
            <span style={{ fontSize: 18 }}>🛡️</span> Panel Admin
          </button>
        )}
      </nav>

      <div style={{ flex: 1 }} />

      {/* identidad / login */}
      {authUser ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 11px', background: 'rgba(13,20,15,0.82)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
          <button onClick={() => onTab('perfil')} className="mb-press" title="Ver mi perfil" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <MascotAvatar mascot={me.mascot} size={38} jersey />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser.displayName || 'Jugador'}</div>
              <div style={{ fontSize: 9, color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser.email || ''}</div>
            </div>
          </button>
          {window.MB_editName && <button onClick={() => window.MB_editName()} title="Cambiar mi apodo" className="mb-press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold-light)', fontSize: 14, padding: '0 2px' }}>✏️</button>}
          <button onClick={() => window.MBFirebase && window.MBFirebase.signOut()} title="Cerrar sesión" className="mb-press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 'var(--t-2xs)', fontWeight: 700 }}>Salir</button>
        </div>
      ) : (
        <div>{window.MB_LoginButton ? React.createElement(window.MB_LoginButton, {}) : null}</div>
      )}

      {/* CTA: instalar app + descargar APK */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {installable && (
          <button onClick={() => window.__triggerInstall && window.__triggerInstall()} className="mb-press" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px',
            borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #E6C04A, #C99B1F)', color: '#1A1206',
            fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)', boxShadow: 'var(--glow-gold)',
          }}>💻 Instalar app</button>
        )}
        <a href="mundialbet.apk" download className="mb-press" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px',
          borderRadius: 'var(--r-pill)', textDecoration: 'none',
          background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-2)',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)',
        }}>⬇️ Descargar APK (Android)</a>
      </div>
      </div>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────
function Topbar({ tab, me, onFlagClick, onGroup, onNav }) {
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const [group, setGroup] = useStateW(null);
  useEffectW(() => {
    let alive = true;
    if (authUser && window.MBFirebase && window.MBFirebase.getMyProfile) {
      window.MBFirebase.getMyProfile().then(p => { if (alive) setGroup(p && p.groupName ? p.groupName : null); }).catch(() => {});
    } else setGroup(null);
    return () => { alive = false; };
  }, [authUser]);
  return (
    <header style={{
      flexShrink: 0, height: 68, display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'rgba(8,15,10,0.7)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {group && <button onClick={() => onNav && onNav('ranking')} className="mb-press" title="Ver los jugadores" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--t-md)', color: 'var(--gold-light)', fontWeight: 800, whiteSpace: 'nowrap', padding: 0 }}>👥 {group}</button>}
      </div>
      <FlagTicker onSelect={onFlagClick} onGroup={onGroup} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <CoinBadge amount={me.coins} />
        <MascotAvatar mascot={me.mascot} size={38} />
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD (Inicio)
// ════════════════════════════════════════════════════════════
function MetricW({ label, value, tone, icon }) {
  return (
    <Card style={{ padding: '16px 18px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div className="num" style={{ fontSize: 'var(--t-3xl)', color: tone }}>{value}</div>
    </Card>
  );
}

function DashboardWeb({ me, onNav, onPredict, onTeam }) {
  const top3 = Dw.USERS.slice(0, 3);
  const openTeam = (name) => { const t = teamByName(name); if (t && onTeam) onTeam(t); };
  const _now = Date.now();
  const _fx = (window.MB.WC_FIXTURES) || [];
  const next = _fx.filter(m => new Date(m.kickoff).getTime() > _now).sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1))[0] || _fx[0];
  const daysLeft = next ? Math.max(0, Math.ceil((new Date(next.kickoff).getTime() - _now) / 86400000)) : 0;
  const hr = new Date().getHours();
  const saludo = hr < 12 ? '¡Buenos días,' : hr < 19 ? '¡Buenas tardes,' : '¡Buenas noches,';
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const greetName = (authUser && authUser.displayName) ? authUser.displayName : null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.65fr) minmax(0,1fr)', gap: 20, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h2 className="display" style={{ fontSize: 'var(--t-3xl)', margin: '0 0 2px' }}>
            {greetName ? <>{saludo} {greetName}!</> : <>¡Hola! 👋</>} <span style={{ fontSize: 26 }}>{Mw[me.mascot].emoji}</span>
          </h2>
          <p style={{ margin: 0, color: 'var(--gold-light)', fontSize: 'var(--t-md)', fontWeight: 600 }}>
            {daysLeft > 0 ? <>Faltan {daysLeft} días para el Mundial 2026 🏆</> : <>Llevas {me.streak} aciertos seguidos ⚡</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <MetricW label="Mis monedas" value={Dw.fmt(me.coins)} tone="var(--gold-light)" icon="⚽" />
          <MetricW label="Posición" value={'#' + me.rank} tone="var(--info)" icon="📊" />
          <MetricW label="Aciertos" value={me.hits + '%'} tone="var(--success)" icon="🎯" />
          <MetricW label="ROI" value={'+' + me.roi + '%'} tone="var(--success)" icon="📈" />
        </div>
        <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', marginTop: -8 }}>📊 Datos de ejemplo · el torneo aún no comienza</div>
        {window.MB_GroupsHome && React.createElement(window.MB_GroupsHome)}
        {next && (
          <Card glow="var(--sh-2)" title="Próximo partido" action="Ver todos" onAction={() => onNav('partidos')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Chip tone="blue">Grupo {next.group} · J{next.md}</Chip>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {daysLeft > 0 && <Chip tone="gold" icon={<span>⏳</span>}>Faltan {daysLeft} días</Chip>}
                <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'capitalize' }}>
                  {new Date(next.kickoff).toLocaleString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 14 }}>
              <div onClick={() => openTeam(next.home)} className={onTeam ? 'mb-press' : ''} title={onTeam ? `Ver ficha de ${next.home}` : undefined} style={{ textAlign: 'center', flex: 1, cursor: onTeam ? 'pointer' : 'default' }}>
                <img src={`https://flagcdn.com/h60/${next.homeCode}.png`} alt="" className={onTeam ? 'mb-flag-zoom' : ''} style={{ height: 40, width: 'auto', borderRadius: 4, boxShadow: 'var(--sh-2)' }} />
                <div style={{ fontWeight: 700, marginTop: 6 }}>{next.home}</div>
              </div>
              <span style={{ fontSize: 'var(--t-lg)', color: 'var(--muted-2)', fontWeight: 700 }}>vs</span>
              <div onClick={() => openTeam(next.away)} className={onTeam ? 'mb-press' : ''} title={onTeam ? `Ver ficha de ${next.away}` : undefined} style={{ textAlign: 'center', flex: 1, cursor: onTeam ? 'pointer' : 'default' }}>
                <img src={`https://flagcdn.com/h60/${next.awayCode}.png`} alt="" className={onTeam ? 'mb-flag-zoom' : ''} style={{ height: 40, width: 'auto', borderRadius: 4, boxShadow: 'var(--sh-2)' }} />
                <div style={{ fontWeight: 700, marginTop: 6 }}>{next.away}</div>
              </div>
            </div>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', textAlign: 'center' }}>📍 {next.stadium}</div>
            <div style={{ marginTop: 4 }}><RefLineWeb m={next} /></div>
          </Card>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card title="Jugadores" action="Ver ranking" onAction={() => onNav('ranking')} style={{ padding: '14px 16px' }}>
          {window.MB_RankingReal ? React.createElement(window.MB_RankingReal, { compact: true, limit: 6 }) : null}
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PARTIDOS
// ════════════════════════════════════════════════════════════
function MatchCardWeb({ m, onPredict }) {
  return (
    <Card glow="var(--sh-2)" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Chip tone={m.next ? 'green' : 'blue'}>{m.next ? 'Abierto' : 'Próximo'}</Chip>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{m.group}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 38 }}>{m.flagH}</div>
          <div style={{ fontWeight: 700, marginTop: 4, fontSize: 'var(--t-sm)' }}>{m.home}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 70 }}>
          {m.next
            ? (<><div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>cierra en</div><CountdownTimer minutes={m.kickoffInMin} compact /></>)
            : (<div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>{m.when}</div>)}
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 38 }}>{m.flagA}</div>
          <div style={{ fontWeight: 700, marginTop: 4, fontSize: 'var(--t-sm)' }}>{m.away}</div>
        </div>
      </div>
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center' }}>📍 {m.stadium}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <BetButton label={m.home} odd={m.odds.home} />
        <BetButton label="Empate" odd={m.odds.draw} />
        <BetButton label={m.away} odd={m.odds.away} />
      </div>
      <GoldButton onClick={() => onPredict(m)}>Hacer pronóstico →</GoldButton>
    </Card>
  );
}

function FixtureCardWeb({ m, onTeam }) {
  const d = new Date(m.kickoff);
  const fecha = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const openTeam = (name) => { const t = teamByName(name); if (t && onTeam) onTeam(t); };
  const Team = ({ name, code }) => (
    <div onClick={() => openTeam(name)} className={onTeam ? 'mb-press' : ''}
      title={onTeam ? `Ver ficha de ${name}` : undefined}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', cursor: onTeam ? 'pointer' : 'default' }}>
      <img src={`https://flagcdn.com/h40/${code}.png`} alt="" className={onTeam ? 'mb-flag-zoom' : ''} style={{ height: 30, width: 'auto', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
      <span style={{ fontWeight: 700, fontSize: 'var(--t-sm)', lineHeight: 1.1 }}>{name}</span>
    </div>
  );
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Chip tone="blue">Grupo {m.group}</Chip>
        <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700, textTransform: 'capitalize' }}>{fecha} · {hora}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Team name={m.home} code={m.homeCode} />
        <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted-2)', fontWeight: 700 }}>vs</span>
        <Team name={m.away} code={m.awayCode} />
      </div>
      <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', textAlign: 'center' }}>📍 {m.stadium}</div>
      <RefLineWeb m={m} />
      {window.MB_BetBox ? <window.MB_BetBox m={m} /> : null}
    </Card>
  );
}

// Árbitro asignado al partido (designación tentativa hasta confirmación FIFA)
function RefLineWeb({ m }) {
  const ref = window.MB.refForMatch && window.MB.refForMatch(m);
  if (!ref) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>
      <span>🧑‍⚖️</span>
      <img src={`https://flagcdn.com/h20/${ref.code}.png`} alt="" title={ref.country} style={{ height: 9, width: 'auto', borderRadius: 1 }} />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ref.name}</span>
    </div>
  );
}

function PartidosWeb({ onTeam }) {
  const fx = (window.MB.WC_FIXTURES) || [];
  const ko = (window.MB.WC_KNOCKOUTS) || [];
  const byMd = { 1: [], 2: [], 3: [] };
  fx.forEach(m => { if (byMd[m.md]) byMd[m.md].push(m); });
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {[1, 2, 3].map(md => (
        <div key={md} style={{ marginBottom: 26 }}>
          <SectionHead title={`Fase de grupos · Jornada ${md}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {byMd[md].map(m => <FixtureCardWeb key={m.id} m={m} onTeam={onTeam} />)}
          </div>
        </div>
      ))}

      <SectionHead title="Fase eliminatoria" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {ko.map((k, i) => (
          <Card key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip tone="gold">{k.stage}</Chip>
              <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>{k.fechas}</span>
            </div>
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{k.partidos} {k.partidos === 1 ? 'partido' : 'partidos'} · {k.sedes}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  EQUIPOS (grupos)
// ════════════════════════════════════════════════════════════
function GroupTableWeb({ letter, rows, highlighted, onTeam }) {
  const ref = useRefW(null);
  useEffectW(() => {
    if (highlighted && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);
  const hlStyle = highlighted ? { boxShadow: 'var(--glow-gold)', border: '1px solid var(--gold)' } : {};
  return (
    <div ref={ref}>
    <Card style={{ padding: '14px 16px', transition: 'box-shadow var(--dur-base) var(--ease-out)', ...hlStyle }}>
      <h3 className="display" style={{ margin: '0 0 10px', fontSize: 'var(--t-md)' }}>Grupo {letter}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--t-3xs)', color: 'var(--muted-2)', fontWeight: 700, padding: '0 0 6px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ width: 14 }}>#</span>
        <span style={{ width: 15 }} />
        <span style={{ flex: 1 }}>Equipo · DT</span>
        <span style={{ width: 24, textAlign: 'center' }}>J</span>
        <span style={{ width: 28, textAlign: 'center' }}>Pts</span>
      </div>
      {rows.map(r => (
        <div key={r.name} onClick={() => onTeam && onTeam(Object.assign({}, r, { group: letter }))} className={onTeam ? 'mb-press mb-team-row' : ''}
          title={onTeam ? `Ver ficha de ${r.name}` : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 4px', margin: '0 -4px', borderRadius: 'var(--r-sm)', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: onTeam ? 'pointer' : 'default' }}>
          <span style={{ width: 14, color: 'var(--muted-2)', fontWeight: 700, fontSize: 'var(--t-2xs)', flexShrink: 0 }}>{r.pos}</span>
          <img src={`https://flagcdn.com/h24/${r.code || ''}.png`} alt="" style={{ height: 15, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 'var(--t-sm)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            {r.coach && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--muted-2)', minWidth: 0 }}>
                <span>🎽</span>
                {r.coachCode && <img src={`https://flagcdn.com/h20/${r.coachCode}.png`} alt="" title={r.coachCountry} style={{ height: 8, width: 'auto', borderRadius: 1 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.coach}</span>
              </span>
            )}
          </span>
          <span style={{ width: 24, textAlign: 'center', fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{r.j}</span>
          <span className="num" style={{ width: 28, textAlign: 'center', color: 'var(--gold-light)' }}>{r.pts}</span>
        </div>
      ))}
    </Card>
    </div>
  );
}

function RefereesPanel() {
  const refs = Dw.REFEREES || [];
  if (!refs.length) return null;
  const confs = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];
  return (
    <div style={{ marginTop: 30 }}>
      <SectionHead title={`Árbitros designados (${refs.length})`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {confs.map(conf => {
          const list = refs.filter(r => r.conf === conf);
          if (!list.length) return null;
          return (
            <Card key={conf} style={{ padding: '14px 16px' }}>
              <h3 className="display" style={{ margin: '0 0 8px', fontSize: 'var(--t-md)' }}>{conf} <span style={{ color: 'var(--muted-2)', fontSize: 'var(--t-2xs)' }}>· {list.length}</span></h3>
              {list.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <img src={`https://flagcdn.com/h24/${r.code}.png`} alt="" style={{ height: 14, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 'var(--t-sm)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{r.country}</span>
                </div>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function EquiposWeb({ highlight, onTeam }) {
  const gs = Dw.GROUP_STANDINGS;
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>
        Los <strong>12 grupos</strong> del Mundial 2026 · 48 selecciones con su <strong>DT</strong>. Toca una bandera (arriba) o cualquier selección para ver su ficha completa.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
        {Object.keys(gs).map(letter => <GroupTableWeb key={letter} letter={letter} rows={gs[letter]} highlighted={letter === highlight} onTeam={onTeam} />)}
      </div>
      <RefereesPanel />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  RANKING
// ════════════════════════════════════════════════════════════
function PodiumWeb({ top3 }) {
  const order = [top3[1], top3[0], top3[2]]; // 2 - 1 - 3
  const heights = [104, 138, 86];
  const medals = ['🥈', '🥇', '🥉'];
  const tones = ['var(--muted)', 'var(--gold)', 'var(--can-light)'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
      {order.map((u, i) => (
        <div key={u.id} style={{ flex: '0 0 168px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{medals[i]}</div>
          <MascotAvatar mascot={u.mascot} size={i === 1 ? 64 : 52} glow={i === 1} jersey />
          <div style={{ fontWeight: 700, marginTop: 8, fontSize: 'var(--t-sm)' }}>{u.name}</div>
          <div className="num" style={{ fontSize: 'var(--t-xl)', color: 'var(--gold-light)' }}>{u.pts}<span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}> pts</span></div>
          <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--success)', fontWeight: 700 }}>ROI +{u.roi}%</div>
          <div style={{
            width: '100%', height: heights[i], marginTop: 10, borderRadius: '10px 10px 0 0',
            background: `linear-gradient(180deg, ${tones[i]}40, ${tones[i]}10)`, border: `1px solid ${tones[i]}55`, borderBottom: 'none',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8,
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--t-2xl)', color: tones[i],
          }}>{u.rank}</div>
        </div>
      ))}
    </div>
  );
}

function RankingWeb() {
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-slow) var(--ease-out)', maxWidth: 680, margin: '0 auto' }}>
      <Card style={{ padding: '8px 16px' }}>
        {window.MB_RankingReal ? React.createElement(window.MB_RankingReal, {}) : null}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  LIGA
// ════════════════════════════════════════════════════════════
function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 'var(--t-sm)', fontWeight: 700, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function LigaWeb() {
  return (
    <div style={{ animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {window.MB_LigaReal ? React.createElement(window.MB_LigaReal, {}) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PERFIL
// ════════════════════════════════════════════════════════════
function Sparkline({ data, w = 300, h = 70 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = data[data.length - 1], first = data[0];
  const up = last >= first;
  const color = up ? 'var(--success)' : 'var(--danger)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PerfilWeb({ me }) {
  const authUser = window.MB_useAuth ? window.MB_useAuth() : null;
  const dispName = authUser ? (authUser.displayName || 'Jugador') : me.name;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 20, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card style={{ textAlign: 'center', padding: '24px 18px' }}>
          <div style={{ display: 'inline-block' }}><MascotAvatar mascot={me.mascot} size={88} glow jersey /></div>
          <h2 className="display" style={{ margin: '14px 0 2px', fontSize: 'var(--t-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {dispName}
            {authUser && window.MB_editName && <button onClick={() => window.MB_editName()} title="Cambiar mi apodo" className="mb-press" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--gold-light)' }}>✏️</button>}
          </h2>
          <div style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 'var(--t-sm)' }}>{authUser ? (authUser.email || '') : 'Inicia sesión para tu perfil'}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <MetricW label="Posición" value={me.rank ? '#' + me.rank : '—'} tone="var(--info)" icon="📊" />
            <MetricW label="Puntos" value={me.pts} tone="var(--gold-light)" icon="🏆" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <MetricW label="Aciertos" value={me.hits + '%'} tone="var(--success)" icon="🎯" />
            <MetricW label="ROI" value={me.roi + '%'} tone="var(--success)" icon="📈" />
          </div>
        </Card>
        <div>
          <SectionHead title="Logros" />
          <Card style={{ padding: '6px 16px' }}>
            {Dw.ACHIEVEMENTS.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: i < Dw.ACHIEVEMENTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: a.unlocked ? 1 : 0.45 }}>
                <MascotAvatar mascot={a.mascot} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{a.name}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{a.note}</div>
                </div>
                <span>{a.unlocked ? '✅' : '🔒'}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <SectionHead title="Evolución de monedas" />
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span className="num" style={{ fontSize: 'var(--t-3xl)', color: 'var(--gold-light)' }}>{Dw.fmt(me.coins)}</span>
              <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>monedas actuales</span>
            </div>
            <Sparkline data={Dw.COIN_HISTORY} />
          </Card>
        </div>
        <div>
          <SectionHead title="Mi historial de apuestas" />
          <Card style={{ padding: '4px 16px' }}>
            {Dw.MY_BETS.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < Dw.MY_BETS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)' }}>{b.match}</div>
                  <div style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{b.bet}</div>
                </div>
                <ResultBadge result={b.result} pts={b.pts} />
                <span className="num" style={{ width: 70, textAlign: 'right', color: b.delta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{b.delta >= 0 ? '+' : ''}{Dw.fmt(b.delta)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  FEED
// ════════════════════════════════════════════════════════════
function FeedWeb({ onNav }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 20, animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      <div>
        <SectionHead title="Actividad reciente" />
        <Card style={{ padding: '6px 18px' }}>
          {window.MB_ActivityReal ? React.createElement(window.MB_ActivityReal, {}) : null}
        </Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <SectionHead title="Mercados especiales" />
          <Card style={{ textAlign: 'center', padding: '24px 18px', color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>
            🎯 Próximamente. Las cuotas se publicarán cuando comience el torneo.
          </Card>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  APP WEB
// ════════════════════════════════════════════════════════════
function AppWeb() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_W);
  const [tab, setTab] = useStateW('inicio');
  const [me, setMe] = useStateW(Dw.ME);
  const [closeScreen, setCloseScreen] = useStateW(false);
  const [team, setTeam] = useStateW(null);
  const [hlGroup, setHlGroup] = useStateW(null);
  const mainRef = useRefW(null);

  const accent = t.accent || '#4A90E2';
  useEffectW(() => { document.documentElement.style.setProperty('--accent', accent); }, [accent]);

  // Puente: abrir la ficha de una selección tocada en el splash
  useEffectW(() => {
    window.__mbOpenTeamByName = (name) => {
      const found = (window.MB_ALL_TEAMS || []).find(x => x.name === name);
      if (found) { setTeam(found); window.__mbPendingTeam = null; if (window.__mbHideSplash) window.__mbHideSplash(); }
    };
    if (window.__mbPendingTeam) window.__mbOpenTeamByName(window.__mbPendingTeam);
    return () => { window.__mbOpenTeamByName = null; };
  }, []);

  const goTab = (id) => { setTab(id); if (mainRef.current) mainRef.current.scrollTop = 0; };

  if (closeScreen) {
    return (
      <div className="mb-main-pitch" style={{ position: 'fixed', inset: 0, overflow: 'auto' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <TournamentClose onExit={() => setCloseScreen(false)} />
        </div>
        <WebTweaks t={t} setTweak={setTweak} setClose={setCloseScreen} />
      </div>
    );
  }

  // Pantallas de escritorio (anchas) + reuso de Quiniela/Admin centrados
  const desktop = {
    inicio:   <DashboardWeb me={me} onNav={goTab} onPredict={() => goTab('quiniela')} onTeam={setTeam} />,
    partidos: <PartidosWeb onPredict={() => goTab('quiniela')} onTeam={setTeam} />,
    equipos:  <EquiposWeb highlight={hlGroup} onTeam={setTeam} />,
    ranking:  <RankingWeb />,
    liga:     <LigaWeb />,
    perfil:   <PerfilWeb me={me} />,
    feed:     <FeedWeb onNav={goTab} />,
  };
  const centered = {
    quiniela: <Quiniela />,
    admin:    <Admin onCloseTournament={() => setCloseScreen(true)} />,
  };
  const isCentered = !!centered[tab];

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', overflow: 'hidden', background: '#0c2114' }}>
      <Sidebar tab={tab} onTab={goTab} me={me} accent={accent} role={t.role} onAdmin={() => goTab('admin')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar tab={tab} me={me} onFlagClick={setTeam} onGroup={(g) => { setHlGroup(g); goTab('equipos'); }} onNav={goTab} />
        <main ref={mainRef} className="mb-main-pitch" style={{ flex: 1, overflow: 'auto', padding: '24px 28px 60px' }}>
          <div style={{ maxWidth: isCentered ? 760 : 1180, margin: '0 auto' }}>
            {isCentered ? centered[tab] : desktop[tab]}
          </div>
        </main>
      </div>
      <WebTweaks t={t} setTweak={setTweak} setClose={setCloseScreen} />
      <TeamModal team={team} onClose={() => setTeam(null)} />
    </div>
  );
}

function WebTweaks({ t, setTweak, setClose }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Marca" />
      <TweakColor label="Color de acento" value={t.accent} options={['#4A90E2', '#00C85A', '#E84040', '#D4AF37']} onChange={(v) => setTweak('accent', v)} />
      <TweakSection label="Experiencia" />
      <TweakRadio label="Animaciones" value={t.anim} options={['Sobrio', 'Normal', 'Festivo']} onChange={(v) => setTweak('anim', v)} />
      <TweakRadio label="Rol" value={t.role} options={['Jugador', 'Admin / Tesorero']} onChange={(v) => setTweak('role', v)} />
      <TweakSection label="Pantallas especiales" />
      <TweakButton label="Ver cierre del torneo" onClick={() => setClose(true)} />
    </TweaksPanel>
  );
}

// ── Export (lo monta el bootstrap responsive de index.html) ──
// Se exponen para reutilizar en la versión móvil (app.jsx)
window.MB_TeamModal = TeamModal;
window.MB_ALL_TEAMS = ALL_TEAMS;
window.MB_flagToCode = flagToCode;
window.AppWeb = AppWeb;
})();
