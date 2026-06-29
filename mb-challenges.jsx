/* ============================================================
   MundialBet Club 2026 — Desafíos por partido (Bonus Questions)
   Expone: window.MB_MatchChallenges
   Reglas:
     · Solo partidos KO (r32, r16, qf, sf, final).
     · Pregunta 1 pre-partido: "¿Gol en el primer tiempo?" (Sí/No)
       Resuelve: el agente escribe odds/{matchId}.htGoal = true|false al detectar
       el resultado de primer tiempo (ht_gh + ht_ga > 0).
     · Pregunta 2 pre-partido: "¿Irá a penales?" (Sí/No) — solo KO donde aplica.
       Resuelve: el agente escribe odds/{matchId}.penalties = true|false al terminar.
     · Puntos: KO normal +1500, qf/sf +2500, final +4000 por pregunta.
     · Respuestas guardadas en: challenge_picks/{uid_matchId_q1|q2}
   Colección Firestore: challenge_picks/{uid + '_' + matchId + '_' + qkey}
     → { uid, matchId, qkey, pick, ts }
   ============================================================ */
(function () {
  'use strict';
  const { useState, useEffect } = React;
  const FB = () => window.MBFirebase || {};

  const PTS = { r32: 1500, r16: 1500, qf: 2500, sf: 2500, final: 4000 };
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  const KO_STAGES = new Set(['r32', 'r16', 'qf', 'sf', 'final']);

  // Estado de una respuesta a una pregunta
  // result: null (pendiente) | 'won' | 'lost'
  function QuestionChip({ label, opts, pick, result, pts, onPick, locked }) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--r-md)', padding: '10px 12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 800 }}>+{fmt(pts)} pts</span>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {opts.map((opt) => {
            const active = pick === opt.value;
            const isWon = result === 'won' && active;
            const isLost = result === 'lost' && active;
            const isCorrect = result === 'won' && !active; // the correct answer (not mine)
            return (
              <button key={opt.value} onClick={() => !locked && !result && onPick(opt.value)}
                disabled={!!locked || !!result}
                className={!locked && !result ? 'mb-press' : ''}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 'var(--r-md)', border: isWon ? '2px solid var(--success)' : isLost ? '2px solid var(--danger)' : active ? '2px solid rgba(97,218,251,0.7)' : '1px solid var(--border)', background: isWon ? 'rgba(0,200,90,0.15)' : isLost ? 'rgba(255,60,60,0.12)' : active ? 'rgba(97,218,251,0.1)' : 'rgba(255,255,255,0.03)', cursor: locked || result ? 'default' : 'pointer', textAlign: 'center', fontSize: 'var(--t-xs)', fontWeight: 700, color: isWon ? 'var(--success)' : isLost ? 'var(--danger)' : active ? '#61DAFB' : 'var(--text)', transition: 'all 0.15s' }}>
                {opt.label}
                {isWon && ' ✓'}
                {isLost && ' ✗'}
              </button>
            );
          })}
        </div>
        {result === 'won' && pick && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 700, marginTop: 6, textAlign: 'center' }}>+{fmt(pts)} puntos ganados</div>}
        {result === 'lost' && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', marginTop: 6, textAlign: 'center' }}>Sin puntos esta vez</div>}
        {!result && pick && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', marginTop: 6, textAlign: 'center' }}>Respuesta guardada · espera el resultado</div>}
      </div>
    );
  }

  function MatchChallenges({ match }) {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const store = window.MB_useBetStore ? window.MB_useBetStore() : {};
    const [picks, setPicks] = useState({}); // { q1: 'yes'|'no', q2: 'yes'|'no' }
    const [saving, setSaving] = useState(null);

    const isKO = match && match.stage && KO_STAGES.has(match.stage);
    if (!isKO || !user) return null;

    const kickoff = match && new Date(match.kickoff).getTime();
    const now = Date.now();
    const started = kickoff && kickoff <= now;
    const odds = store.odds && store.odds[match.id];
    const finished = odds && odds.finished;

    // Resultados del agente
    const htGoal = odds && odds.htGoal; // true | false | undefined (pendiente)
    const htGoalResolved = odds && typeof odds.htGoal === 'boolean';
    const penalties = odds && odds.penalties; // true | false
    const penResolved = finished && typeof odds.penalties === 'boolean';

    const pts = PTS[match.stage] || 1500;

    // Cargar mis picks desde Firestore
    useEffect(() => {
      if (!user || !FB().getChallengePicks) return;
      FB().getChallengePicks(match.id).then((p) => { if (p) setPicks(p); }).catch(() => {});
    }, [user && user.uid, match.id]);

    const savePick = async (qkey, value) => {
      if (saving || started) return;
      setSaving(qkey);
      const newPicks = { ...picks, [qkey]: value };
      try {
        await FB().saveChallengePick(match.id, qkey, value);
        setPicks(newPicks);
      } catch (e) {}
      setSaving(null);
    };

    // Evaluar resultado de q1 (gol en 1T)
    const q1Result = htGoalResolved
      ? ((picks.q1 === 'yes') === htGoal ? 'won' : picks.q1 ? 'lost' : null)
      : null;
    // Evaluar resultado de q2 (penales)
    const q2Result = penResolved
      ? ((picks.q2 === 'yes') === penalties ? 'won' : picks.q2 ? 'lost' : null)
      : null;

    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11 }}>⚡</span>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus · Desafíos del partido</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <QuestionChip
            label="¿Habrá gol en el primer tiempo?"
            opts={[{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }]}
            pick={picks.q1}
            result={q1Result}
            pts={pts}
            onPick={(v) => savePick('q1', v)}
            locked={started}
          />
          <QuestionChip
            label="¿Irá a penales?"
            opts={[{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }]}
            pick={picks.q2}
            result={q2Result}
            pts={pts}
            onPick={(v) => savePick('q2', v)}
            locked={started}
          />
        </div>
      </div>
    );
  }

  window.MB_MatchChallenges = MatchChallenges;
})();
