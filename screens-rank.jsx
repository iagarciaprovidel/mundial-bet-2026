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
      <Card title="🏅 Ranking de apostadores" style={{ padding: '12px 14px' }}>
        {window.MB_RankingReal ? React.createElement(window.MB_RankingReal, {}) : null}
      </Card>
      <Card title="👥 Ranking de equipos" style={{ padding: '12px 14px' }}>
        {window.MB_TeamsReal ? React.createElement(window.MB_TeamsReal, {}) : null}
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
  const users = (store && store.users) || [];

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
  // Patrimonio (disponible + en juego) para el ranking. Ver window.MB_worth en mb-bet.jsx.
  const saldoOf = (u) => window.MB_worth ? window.MB_worth(u) : ((u && typeof u.saldo === 'number') ? u.saldo : SAL);
  const meRec = users.find(u => u.uid === authUser.uid) || null;
  const saldo = meRec ? saldoOf(meRec) : (store && typeof store.saldo === 'number' ? store.saldo : SAL);
  const avail = meRec ? (window.MB_avail ? window.MB_avail(meRec) : meRec.saldo) : (store && typeof store.saldo === 'number' ? store.saldo : SAL);
  const enJuego = meRec ? (window.MB_staked ? window.MB_staked(meRec) : 0) : 0;
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
  // Medallas por volumen de apuestas (🥉 10 · 🥈 25 · 🥇 50). Mismo umbral que la insignia.
  const medals = (bets.length >= 10 ? 1 : 0) + (bets.length >= 25 ? 1 : 0) + (bets.length >= 50 ? 1 : 0);
  const PICK = (b) => (b.pick === 'home' ? b.home : b.pick === 'away' ? b.away : 'Empate');
  const FX = (window.MB_WC && window.MB_WC.FIXTURES) || [];
  const koOf = (id) => { const f = FX.find(x => x.id === id); return f ? new Date(f.kickoff).getTime() : 0; };
  // Mejor racha de aciertos seguidos (apuestas liquidadas en orden cronológico de partido).
  const bestStreak = (() => {
    const chron = settled.slice().sort((a, b) => koOf(a.matchId) - koOf(b.matchId) || ms(a.creado) - ms(b.creado));
    let best = 0, cur = 0;
    chron.forEach(b => { if (b.status === 'won') { cur++; if (cur > best) best = cur; } else { cur = 0; } });
    return best;
  })();
  // Stats para el desglose de premios (recarga + precisión + racha).
  const bonusStats = { bets: bets.length, settled: settled.length, accuracy: aciertos, bestStreak: bestStreak };

  return (
    <div style={{ padding: '0 16px 16px', animation: 'mb-fade-up var(--dur-slow) var(--ease-out)' }}>
      {/* ── Tarjeta de perfil ── */}
      <div style={{ background: 'rgba(13,20,15,0.95)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 'var(--r-xl)', marginBottom: 12, boxShadow: '0 6px 28px rgba(0,0,0,0.45)' }}>
        {/* Banner degradado */}
        <div style={{ height: 60, borderRadius: 'calc(var(--r-xl) - 1px) calc(var(--r-xl) - 1px) 0 0', background: 'linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(46,100,50,0.12) 60%, rgba(13,20,15,0) 100%)' }} />

        {/* Avatar superpuesto al banner */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -44 }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(6,11,10,0.9)', border: '3px solid var(--gold)', boxShadow: '0 0 0 4px rgba(13,20,15,0.95), var(--glow-gold)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(meRec && meRec.championCode)
              ? <img src={`https://flagcdn.com/h120/${meRec.championCode}.png`} alt="" title={'Ver ficha de ' + (meRec.champion || '')} onClick={() => { if (window.__mbOpenTeamByCode) window.__mbOpenTeamByCode(meRec.championCode); else if (window.__mbOpenTeamByName) window.__mbOpenTeamByName(meRec.champion); }} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
              : <span style={{ fontWeight: 800, fontSize: 26, color: 'var(--gold-light)' }}>{ini}</span>}
          </div>
        </div>

        {/* Info del usuario */}
        <div style={{ padding: '10px 16px 16px', textAlign: 'center' }}>
          <h2 className="display" style={{ margin: '0 0 3px', fontSize: 'var(--t-xl)', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {dispName}{window.MB_champFlag && window.MB_champFlag(meRec && meRec.championCode, meRec && meRec.champion, 16)}
          </h2>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{authUser.email || ''}</div>

          {teamName ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--r-pill)', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', marginBottom: 10 }}>
              <span style={{ fontSize: 13 }}>👥</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-light)' }}>{teamName}</span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, fontStyle: 'italic' }}>Sin equipo</div>
          )}

          {(() => {
            const nb = bets.length;
            if (nb < 10) return null;
            const icons = nb >= 50 ? '🥇' : nb >= 25 ? '🥈' : '🥉';
            const label = nb >= 50 ? 'Apostador experto' : nb >= 25 ? 'Apostador frecuente' : 'Apostador activo';
            return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 12, padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{icons} {label} · <span className="num" style={{ color: 'var(--text)' }}>{nb}</span> apuestas</div>;
          })()}

          {/* Separador */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0 12px' }} />

          {/* Botones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {window.MB_openTeamPicker && (
              <button onClick={() => window.MB_openTeamPicker()} className="mb-press" style={{ width: '100%', padding: '11px', borderRadius: 'var(--r-pill)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <span>👥</span>{(meRec && meRec.groupName) ? 'Cambiar de equipo' : 'Unirme a un equipo'}
              </button>
            )}
            {window.MB_NotifButton && React.createElement(window.MB_NotifButton)}
          </div>
        </div>
      </div>

      {/* Métricas compactas en una sola tarjeta (4 columnas) */}
      <div style={{ background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-1)', overflow: 'hidden', marginBottom: enJuego > 0 ? 6 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {[
            ['⚽', 'Puntos', fmt(saldo), 'var(--gold-light)'],
            ['📊', 'Posición', pos ? '#' + pos : '—', 'var(--info)'],
            ['🎟️', 'Apuestas', String(bets.length), 'var(--text)'],
            ['🎯', 'Aciertos', settled.length ? aciertos + '%' : '—', 'var(--success)'],
          ].map(([icon, k, v, c], i) => (
            <div key={k} style={{ flex: 1, textAlign: 'center', padding: '11px 4px', borderLeft: i ? '1px solid var(--border)' : 'none' }}>
              <div className="num" style={{ fontSize: 'var(--t-md)', fontWeight: 800, color: c, lineHeight: 1.1 }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4, whiteSpace: 'nowrap' }}>{icon} {k}</div>
            </div>
          ))}
        </div>
        {/* Mi campeón (línea compacta) */}
        {window.MB_ChampionPick && React.createElement(window.MB_ChampionPick, { compact: true })}

      </div>
      {enJuego > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14, padding: '8px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-1)', border: '1px solid var(--border)', fontSize: 'var(--t-2xs)' }}>
          <span style={{ color: 'var(--muted)' }}>💰 Disponible <span className="num" style={{ color: 'var(--text)', fontWeight: 800 }}>{fmt(avail)}</span></span>
          <span style={{ color: 'var(--muted-2)' }}>·</span>
          <span style={{ color: 'var(--muted)' }}>🎟️ En juego <span className="num" style={{ color: 'var(--info)', fontWeight: 800 }}>{fmt(enJuego)}</span></span>
        </div>
      )}

      {/* Gráfico evolución del saldo */}
      {window.MB_SaldoSparkline && settled.length >= 2 && (
        <div style={{ marginBottom: 12 }}>{React.createElement(window.MB_SaldoSparkline, { bets })}</div>
      )}

      {/* Premios al terminar la 3ª fecha: campeón (2ª fase) + recarga + precisión + racha */}
      {window.MB_ChampLadder && <div style={{ marginBottom: 12 }}>{React.createElement(window.MB_ChampLadder, { stats: bonusStats, me: meRec })}</div>}

      {/* Stats personales del torneo */}
      {settled.length >= 2 && (() => {
        const totalGanado = settled.filter(b => b.status === 'won').reduce((s, b) => s + Math.round((b.stake || 0) * (b.odd || 1)) - (b.stake || 0), 0);
        const mayorGanancia = settled.filter(b => b.status === 'won').reduce((mx, b) => {
          const g = Math.round((b.stake || 0) * (b.odd || 1)) - (b.stake || 0); return g > mx.g ? { g, m: b } : mx;
        }, { g: 0, m: null });
        // Equipo más apostado
        const countByTeam = {};
        bets.forEach(b => { if (b.pick === 'home' && b.home) countByTeam[b.home] = (countByTeam[b.home] || 0) + 1; else if (b.pick === 'away' && b.away) countByTeam[b.away] = (countByTeam[b.away] || 0) + 1; });
        const fav = Object.keys(countByTeam).sort((a, b) => countByTeam[b] - countByTeam[a])[0];
        // Racha activa actual
        const activeStreak = (() => {
          const ch = settled.slice().sort((a, b) => koOf(b.matchId) - koOf(a.matchId));
          let s = 0; for (const b of ch) { if (b.status === 'won') s++; else break; } return s;
        })();
        const items = [
          { icon: '🏆', label: 'Mejor racha', value: bestStreak + ' seguidos', color: 'var(--gold-light)', show: bestStreak >= 2 },
          { icon: '🔥', label: 'Racha activa', value: activeStreak + ' seguidos', color: '#FF8C42', show: activeStreak >= 2 },
          { icon: '📈', label: 'Ganancia neta', value: (totalGanado >= 0 ? '+' : '') + fmt(totalGanado), color: totalGanado >= 0 ? 'var(--success)' : 'var(--danger)', show: true },
          { icon: '⚡', label: 'Mayor ganancia', value: mayorGanancia.m ? '+' + fmt(mayorGanancia.g) + ' (' + (mayorGanancia.m.pick === 'home' ? mayorGanancia.m.home : mayorGanancia.m.away) + ')' : '—', color: 'var(--gold-light)', show: mayorGanancia.g > 0 },
          { icon: '❤️', label: 'Favorito', value: fav || '—', color: 'var(--text)', show: !!fav },
        ].filter(x => x.show);
        if (!items.length) return null;
        return (
          <Card title="Mis estadísticas del torneo" style={{ padding: '13px 14px', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
              {items.map((it) => (
                <div key={it.label} style={{ padding: '9px 10px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{it.icon} {it.label}</div>
                  <div className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 800, color: it.color, lineHeight: 1.2 }}>{it.value}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Mi grupo: CTA para crear/unirse + tabla de equipos (lo mismo que la pestaña "Mi grupo") */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {window.MB_TeamCTA ? React.createElement(window.MB_TeamCTA) : null}
        {window.MB_GroupsHome ? React.createElement(window.MB_GroupsHome) : null}
      </div>

      {window.MB_openFiguritas && (() => {
        const r = window.MB_figuritasResumen ? window.MB_figuritasResumen() : { tengo: 0, total: 0, pct: 0 };
        return (
          <Card hover onClick={() => window.MB_openFiguritas()} style={{ padding: '13px 14px', marginBottom: 12, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>🎴</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>Mi álbum de figuritas</h3>
                <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)' }}>Colecciona el Mundial · {r.tengo}/{r.total} · {r.pct}%</div>
              </div>
              <span style={{ color: 'var(--gold-light)', fontSize: 18 }}>→</span>
            </div>
            <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: r.pct + '%', height: '100%', background: 'linear-gradient(90deg,#E6C04A,#C99B1F)' }} />
            </div>
          </Card>
        );
      })()}

      <Card title="Mi historial de apuestas" style={{ padding: '13px 14px', marginBottom: 12 }}>
        {bets.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--t-sm)', padding: '16px 8px' }}>Aún no has hecho apuestas.<br /><span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)' }}>Ve a <strong style={{ color: 'var(--gold-light)' }}>Partidos</strong> y apuesta al ganador.</span></div>
          : bets.map((b, i) => {
            const open = b.status === 'open';
            const won = b.status === 'won';
            const delta = won ? Math.round((b.stake || 0) * (b.odd || 0)) : (b.status === 'lost' ? -(b.stake || 0) : 0);
            const od = (store && store.odds) ? store.odds[b.matchId] : null;
            const started = (od && (od.live || od.finished)) || (koOf(b.matchId) && koOf(b.matchId) <= Date.now());
            const badge = open
              ? (od && od.live && !od.finished
                  ? { txt: '🔴 En vivo', col: '#ff6b6b', bg: 'rgba(220,80,80,0.12)' }
                  : started
                    ? { txt: '🔒 Cerrada', col: 'var(--text)', bg: 'var(--surface-2)' }
                    : { txt: 'Abierta', col: 'var(--info)', bg: 'rgba(74,144,226,0.12)' })
              : won ? { txt: '✓ Ganaste', col: 'var(--success)', bg: 'var(--success-bg)' } : { txt: '✕ Perdiste', col: '#e98b8b', bg: 'rgba(220,80,80,0.10)' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < bets.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--t-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.home} vs {b.away}</div>
                  <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 2 }}>{fmt(b.stake)} a <strong style={{ color: 'var(--text)' }}>{PICK(b)}</strong> @ {Number(b.odd).toFixed(2)}</div>
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
