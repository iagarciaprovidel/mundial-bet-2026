/* ============================================================
   MundialBet Club 2026 — Componentes reutilizables
   Exporta a window para compartir entre archivos babel.
   ============================================================ */
const { useState, useEffect, useRef } = React;
const MBd = window.MB;
const M = MBd.MASCOTS;

// — CSS inyectado para confetti/partículas —
(function injectCSS() {
  if (document.getElementById('mb-comp-css')) return;
  const s = document.createElement('style');
  s.id = 'mb-comp-css';
  s.textContent = `
    @keyframes mb-confetti-fall { to { transform: translateY(720px) rotate(720deg); opacity: 0; } }
    @keyframes mb-particle { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; } }
    .mb-press { transition: transform var(--dur-fast) var(--ease-out); }
    .mb-press:active { transform: scale(0.96); }
    .mb-card-hover { transition: box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
    .mb-card-hover:hover { box-shadow: var(--glow-green); }
  `;
  document.head.appendChild(s);
})();

// ── Hook: conteo animado ──────────────────────────────────
function useCountUp(target, dur = 900, deps = []) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current, to = target;
    if (from === to) return;
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, deps.length ? deps : [target]);
  return val;
}

// ── Confetti ──────────────────────────────────────────────
function Confetti({ fire }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!fire) return;
    const colors = ['#00C85A', '#E84040', '#4A90E2', '#D4AF37'];
    const arr = Array.from({ length: 80 }, (_, i) => ({
      id: fire + '-' + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.4 + Math.random() * 1.2,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 7,
      rot: Math.random() * 360,
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [fire]);
  if (!pieces.length) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 80 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: -16, left: p.left + '%',
          width: p.size, height: p.size * 0.6, background: p.color,
          borderRadius: 1, transform: `rotate(${p.rot}deg)`,
          animation: `mb-confetti-fall ${p.dur}s var(--ease-out) ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Mascot image (con fallback emoji) ─────────────────────
function MascotImg({ mascot, size = 28 }) {
  const [err, setErr] = useState(false);
  if (mascot === 'all') return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>🏆</span>;
  const m = M[mascot];
  if (err) return <span style={{ fontSize: size * 0.74, lineHeight: 1 }}>{m.emoji}</span>;
  return (
    <img src={`mascots/${mascot}.png`} alt={m.name} onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}

// ── Mascot avatar (anillo de color) ───────────────────────
function MascotAvatar({ mascot, size = 40, ring = true, glow = false, jersey = false }) {
  const m = mascot === 'all' ? { color: '#D4AF37', light: '#F0CE5A' } : M[mascot];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 50% 35%, ${m.light}33, ${m.color}22)`,
      border: ring ? `2px solid ${m.light}` : 'none',
      boxShadow: glow ? `0 0 14px ${m.light}66` : 'none', flexShrink: 0,
    }}>
      <MascotImg mascot={mascot} size={size * 0.66} />
      {jersey && mascot !== 'all' && (
        <span className="num" style={{
          position: 'absolute', bottom: -3, right: -3, fontSize: size * 0.3,
          minWidth: size * 0.42, height: size * 0.42, padding: '0 3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: m.color, color: '#fff', borderRadius: 999,
          border: '2px solid var(--surface-1)',
        }}>{M[mascot].jersey}</span>
      )}
    </div>
  );
}

// ── Avatar de iniciales (revelado, color de mascota) ──────
function InitialAvatar({ user, size = 40 }) {
  const m = M[user.mascot];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: m.color, color: '#fff',
      border: `2px solid ${m.light}`, fontFamily: 'var(--font-display)',
      fontWeight: 700, fontSize: size * 0.34, letterSpacing: '-0.02em',
    }}>{user.initials}</div>
  );
}

// ── Coin badge (chip dorado con balón) ────────────────────
function CoinBadge({ amount, size = 'md', animate = false }) {
  const shown = animate ? useCountUp(amount) : amount;
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: sm ? 4 : 6,
      padding: sm ? '3px 8px' : '5px 11px', borderRadius: 'var(--r-pill)',
      background: 'var(--coin-bg)', border: '1px solid rgba(212,175,55,0.35)',
      color: 'var(--gold-light)', fontFamily: 'var(--font-mono)', fontWeight: 700,
      fontSize: sm ? 'var(--t-2xs)' : 'var(--t-sm)', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: sm ? 11 : 13 }}>⚽</span>{MBd.fmt(shown)}
    </span>
  );
}

// ── Chip de estado ────────────────────────────────────────
function Chip({ children, tone = 'neutral', live = false, icon }) {
  const tones = {
    neutral: { bg: 'rgba(255,255,255,0.06)', bd: 'var(--border-2)', fg: 'var(--muted)' },
    green:   { bg: 'var(--success-bg)', bd: 'rgba(0,200,90,0.4)', fg: 'var(--success)' },
    red:     { bg: 'var(--danger-bg)', bd: 'rgba(232,64,64,0.4)', fg: 'var(--danger)' },
    blue:    { bg: 'var(--info-bg)', bd: 'rgba(74,144,226,0.4)', fg: 'var(--info)' },
    gold:    { bg: 'var(--coin-bg)', bd: 'rgba(212,175,55,0.4)', fg: 'var(--gold-light)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 'var(--r-pill)',
      background: t.bg, border: `1px solid ${t.bd}`, color: t.fg,
      fontSize: 'var(--t-2xs)', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', animation: 'mb-pulse-live 1.2s var(--ease-out) infinite' }} />}
      {icon}{children}
    </span>
  );
}

// ── Result badge (Exacto / Ganador / Incorrecto) ──────────
function ResultBadge({ result, pts }) {
  if (result === 'exact')  return <Chip tone="green" icon={<span>✓</span>}>Exacto +{pts ?? 3} pts</Chip>;
  if (result === 'winner') return <Chip tone="blue" icon={<span>→</span>}>Ganador +{pts ?? 1} pt</Chip>;
  return <Chip tone="neutral" icon={<span>✕</span>}>Incorrecto</Chip>;
}

// ── Card primitivo ────────────────────────────────────────
// Si recibe `title`, lo dibuja DENTRO de la card (con su acción opcional).
// Borde azul y fondo opaco uniformes para todas las cards.
function Card({ children, style = {}, glow, onClick, hover, title, action, onAction }) {
  return (
    <div onClick={onClick} className={hover ? 'mb-card-hover' : ''} style={{
      background: 'rgba(13,20,15,0.92)',
      border: '1px solid rgba(74,144,226,0.45)',
      borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)',
      boxShadow: glow || 'var(--sh-1)', cursor: onClick ? 'pointer' : 'default', ...style,
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>{title}</h3>
          {action && <button onClick={onAction} style={{ background: 'none', border: 'none', color: 'var(--info)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)', cursor: 'pointer', padding: 0 }}>{action}</button>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Section header ────────────────────────────────────────
function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 10px' }}>
      <h3 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)' }}>{title}</h3>
      {action && <button onClick={onAction} style={{
        background: 'none', border: 'none', color: 'var(--info)', fontFamily: 'var(--font-body)',
        fontWeight: 700, fontSize: 'var(--t-2xs)', cursor: 'pointer', padding: 0,
      }}>{action}</button>}
    </div>
  );
}

// ── Segmented tabs ────────────────────────────────────────
function SegTabs({ options, value, onChange, accent = 'var(--info)' }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4, background: 'var(--surface-1)',
      border: '1px solid var(--border)', borderRadius: 'var(--r-pill)',
    }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.v;
        const label = typeof o === 'string' ? o : o.label;
        const active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} className="mb-press" style={{
            flex: 1, padding: '7px 6px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            background: active ? accent : 'transparent', color: active ? '#fff' : 'var(--muted)',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--t-2xs)',
            transition: 'all var(--dur-base) var(--ease-out)', whiteSpace: 'nowrap',
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ── Progress bar (blocky, estilo carga de pagos) ──────────
function ProgressBar({ value, total, tone = 'gold' }) {
  const colors = { gold: 'var(--gold)', green: 'var(--success)' };
  const blocks = Array.from({ length: total }, (_, i) => i < value);
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {blocks.map((on, i) => (
        <div key={i} style={{
          flex: 1, height: 9, borderRadius: 2,
          background: on ? colors[tone] : 'var(--surface-2)',
          boxShadow: on ? `0 0 8px ${tone === 'gold' ? 'rgba(212,175,55,0.5)' : 'rgba(0,200,90,0.5)'}` : 'none',
          transition: 'background var(--dur-base) var(--ease-out)',
        }} />
      ))}
    </div>
  );
}

// ── BetButton (cuota seleccionable) ───────────────────────
function BetButton({ label, odd, selected, onClick, sub }) {
  return (
    <button onClick={onClick} className="mb-press" style={{
      flex: 1, minWidth: 0, padding: '9px 6px', cursor: 'pointer',
      borderRadius: 'var(--r-md)', textAlign: 'center',
      background: selected ? 'var(--success-bg)' : 'var(--surface-2)',
      border: selected ? '1.5px solid var(--success)' : '1.5px solid var(--border-2)',
      boxShadow: selected ? 'var(--glow-green)' : 'none',
      transition: 'all var(--dur-base) var(--ease-spring)',
      display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
    }}>
      <span style={{ fontSize: 'var(--t-3xs)', color: selected ? 'var(--success)' : 'var(--muted)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</span>
      <span className="num" style={{ fontSize: 'var(--t-md)', color: selected ? 'var(--success)' : 'var(--text)' }}>{odd.toFixed(2)}</span>
      {sub && <span style={{ fontSize: 9, color: 'var(--muted-2)' }}>{sub}</span>}
    </button>
  );
}

// ── Countdown timer (en vivo) ─────────────────────────────
function CountdownTimer({ minutes = 134, compact = false }) {
  const [sec, setSec] = useState(minutes * 60);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => { setSec(s => Math.max(0, s - 1)); setTick(t => t + 1); }, 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <span className="mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700,
      fontSize: compact ? 'var(--t-sm)' : 'var(--t-xl)', color: 'var(--text)',
      key: tick,
    }}>
      <span style={{ display: 'inline-block', animation: 'mb-pulse-tick var(--dur-base) var(--ease-out)' }} key={tick}>
        {h > 0 ? `${h}h ` : ''}{pad(m)}<span style={{ color: 'var(--muted-2)' }}>:</span>{pad(s)}
      </span>
    </span>
  );
}

// ── Feed item ─────────────────────────────────────────────
function FeedItem({ item, delay = 0 }) {
  const m = M[item.mascot];
  return (
    <div style={{
      display: 'flex', gap: 11, padding: '12px 0',
      borderBottom: '1px solid var(--border)', animation: `mb-fade-up var(--dur-slow) var(--ease-out) ${delay}s both`,
    }}>
      <MascotAvatar mascot={item.mascot} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--t-sm)', lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, color: m.light }}>{m.name}</span>
          <span style={{ color: 'var(--text)' }}> {item.text} </span>
          <span>{item.emoji}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <span style={{ fontSize: 'var(--t-3xs)', color: 'var(--muted-2)' }}>{item.ago}</span>
          {Object.entries(item.reactions || {}).map(([e, n]) => (
            <span key={e} style={{
              fontSize: 'var(--t-3xs)', color: 'var(--muted)', display: 'inline-flex', gap: 3, alignItems: 'center',
              padding: '2px 7px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.04)',
            }}>{e} {n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mascot reaction popup ─────────────────────────────────
function MascotReaction({ result, onClose }) {
  const conf = {
    exact:  { mascot: 'zayu',   title: '¡Zayu lo sabía!', msg: '3 puntos para ti', emoji: '🔥', anim: 'mb-bounce 0.9s var(--ease-spring) 2', tone: 'var(--success)' },
    winner: { mascot: 'clutch', title: 'Clutch te respalda', msg: 'Eso también cuenta.', emoji: '👍', anim: 'mb-pop var(--dur-slow) var(--ease-spring)', tone: 'var(--info)' },
    wrong:  { mascot: 'maple',  title: 'Maple también falla a veces', msg: 'Será la próxima.', emoji: '🫂', anim: 'mb-sag 0.6s var(--ease-out) forwards', tone: 'var(--muted)' },
  }[result];
  const [fire, setFire] = useState(0);
  useEffect(() => { if (result === 'exact') setFire(Date.now()); }, [result]);
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(6,8,15,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)', animation: 'mb-fade-up var(--dur-base) var(--ease-out)',
    }}>
      {result === 'exact' && <Confetti fire={fire} />}
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface-1)', border: `1.5px solid ${conf.tone}`, borderRadius: 'var(--r-2xl)',
        padding: 28, textAlign: 'center', maxWidth: 280, boxShadow: 'var(--sh-4)',
        animation: 'mb-pop var(--dur-slow) var(--ease-spring)',
      }}>
        <div style={{ animation: conf.anim, display: 'inline-block', marginBottom: 8 }}>
          <MascotAvatar mascot={conf.mascot} size={84} glow jersey />
        </div>
        <h3 className="display" style={{ margin: '12px 0 4px', fontSize: 'var(--t-xl)', color: conf.tone }}>{conf.title} {conf.emoji}</h3>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 'var(--t-sm)' }}>{conf.msg}</p>
        <button onClick={onClose} className="mb-press" style={{
          marginTop: 18, width: '100%', padding: '11px', borderRadius: 'var(--r-pill)', border: 'none',
          background: conf.tone, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--t-sm)',
        }}>Entendido</button>
      </div>
    </div>
  );
}

// ── Empty state con mascota ───────────────────────────────
function EmptyState({ mascot, text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 20px', opacity: 0.95 }}>
      <MascotAvatar mascot={mascot} size={64} />
      <p style={{ margin: '14px 0 2px', fontWeight: 700, color: 'var(--text)' }}>{text}</p>
      {sub && <p style={{ margin: 0, fontSize: 'var(--t-sm)', color: 'var(--muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Primary / gold button ─────────────────────────────────
function GoldButton({ children, onClick, full = true, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="mb-press" style={{
      width: full ? '100%' : 'auto', padding: '13px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 'var(--r-pill)', border: 'none',
      background: disabled ? 'var(--surface-2)' : 'linear-gradient(135deg, #E6C04A, #C99B1F)',
      color: disabled ? 'var(--muted-2)' : '#1A1206', fontFamily: 'var(--font-body)', fontWeight: 800,
      fontSize: 'var(--t-md)', boxShadow: disabled ? 'none' : 'var(--glow-gold)',
      opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  );
}

Object.assign(window, {
  useCountUp, Confetti, MascotImg, MascotAvatar, InitialAvatar, CoinBadge, Chip,
  ResultBadge, Card, SectionHead, SegTabs, ProgressBar, BetButton, CountdownTimer,
  FeedItem, MascotReaction, EmptyState, GoldButton,
});
