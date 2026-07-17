/* ============================================================
   MundialBet Club 2026 — Desafíos por partido (Bonus Questions)
   Expone: window.MB_MatchChallenges
   Reglas:
     · Solo desde OCTAVOS de final (r16, qf, sf, final) — los bonus arrancaron
       en octavos; no se muestran en fase de grupos ni dieciseisavos (r32).
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

  const PTS = { r32: 1500, r16: 1500, qf: 2500, sf: 2500, third: 2500, final: 4000 };
  const fmt = (n) => Number(n || 0).toLocaleString('es-CL').replace(/,/g, '.');
  // Los desafíos existen recién desde octavos de final (r16): en grupos y r32
  // no hubo bonus, así que no deben mostrarse en esos partidos. 'third' (3er
  // y 4to puesto) sí cuenta — es un cruce eliminatorio real, mismas reglas.
  const BONUS_STAGES = new Set(['r16', 'qf', 'sf', 'third', 'final']);

  const STAKE_MULTS = [1, 5, 10, 25, 50];

  // Estado de una respuesta a una pregunta. `doc` es el challenge_pick completo
  // ({pick, stake, status, payout, claimed}) o null si no respondió todavía.
  // status: 'open' (pendiente) | 'won' | 'lost' — lo pone el agente al liquidar.
  function QuestionChip({ label, opts, doc, pts, onPick, onClaim, claiming, locked, disabledReason }) {
    const [mult, setMult] = useState(1);
    const pick = doc && doc.pick;
    const status = doc && doc.status;
    const isWon = status === 'won';
    const isLost = status === 'lost';
    const resolved = isWon || isLost;
    const canClaim = isWon && doc && !doc.claimed;
    const closedNoAnswer0 = locked && !pick;
    const canEdit = !locked && !resolved;
    // Mientras se puede editar, el costo lo manda SIEMPRE el multiplicador
    // seleccionado (×1…×50) — antes mostraba el stake guardado y parecía que
    // los botones ×N "no hacían nada". Congelado (locked/resuelto): stake real.
    const myStake = canEdit ? pts * mult : (doc ? (doc.stake || pts) : pts * mult);
    // Si ya había una respuesta guardada (de una sesión anterior), arranca el
    // selector en el multiplicador que usó — si no, se resetea a x1 cada vez
    // que este chip vuelve a montarse aunque el usuario ya hubiera elegido x25.
    useEffect(() => {
      if (doc && doc.stake) setMult(Math.max(1, Math.round(doc.stake / pts)));
    }, [doc && doc.id]);
    // "locked" = ya no se puede responder (partido empezó y nunca respondiste).
    const closedNoAnswer = closedNoAnswer0;
    return (
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--r-md)', padding: '10px 12px', border: '1px solid var(--border)', opacity: closedNoAnswer ? 0.55 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--gold-light)', fontWeight: 800 }}>Cuesta {fmt(myStake)} · gana {fmt(myStake)} más</span>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
            {STAKE_MULTS.map((m) => (
              <button key={m} onClick={() => { setMult(m); if (pick) onPick(pick, pts * m); }} className="mb-press"
                style={{ flex: 1, padding: '4px 2px', borderRadius: 'var(--r-pill)', border: mult === m ? '1px solid var(--gold-light)' : '1px solid var(--border)', background: mult === m ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.03)', color: mult === m ? 'var(--gold-light)' : 'var(--muted)', fontSize: 8.5, fontWeight: 800, cursor: 'pointer' }}>
                ×{m}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 7 }}>
          {opts.map((opt) => {
            const active = pick === opt.value;
            const won = isWon && active;
            const lost = isLost && active;
            const disabled = !canEdit;
            return (
              <button key={opt.value} onClick={() => canEdit && onPick(opt.value, pts * mult)}
                disabled={disabled}
                className={canEdit ? 'mb-press' : ''}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 'var(--r-md)', border: won ? '2px solid var(--success)' : lost ? '2px solid var(--danger)' : active ? '2px solid rgba(97,218,251,0.7)' : '1px solid var(--border)', background: won ? 'rgba(0,200,90,0.15)' : lost ? 'rgba(255,60,60,0.12)' : active ? 'rgba(97,218,251,0.1)' : disabled ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'center', fontSize: 'var(--t-xs)', fontWeight: 700, color: won ? 'var(--success)' : lost ? 'var(--danger)' : active ? '#61DAFB' : disabled ? 'var(--muted-2)' : 'var(--text)', transition: 'all 0.15s' }}>
                {opt.label}
                {won && ' ✓'}
                {lost && ' ✗'}
              </button>
            );
          })}
        </div>
        {canClaim && (
          <button onClick={onClaim} disabled={claiming} className="mb-press" style={{ width: '100%', marginTop: 7, padding: '8px 0', borderRadius: 'var(--r-md)', border: 'none', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)', color: '#1A1206', cursor: claiming ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 'var(--t-2xs)', opacity: claiming ? 0.7 : 1 }}>
            {claiming ? 'Reclamando…' : `🎁 Reclamar +${fmt(doc.payout)} pts`}
          </button>
        )}
        {isWon && doc && doc.claimed && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--success)', fontWeight: 700, marginTop: 6, textAlign: 'center' }}>✓ +{fmt(doc.payout)} puntos reclamados</div>}
        {isLost && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--danger)', marginTop: 6, textAlign: 'center' }}>Perdiste los {fmt(myStake)} pts apostados</div>}
        {!resolved && pick && !closedNoAnswer && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', marginTop: 6, textAlign: 'center' }}>Apostaste {fmt(myStake)} pts · puedes cambiar hasta que arranque</div>}
        {closedNoAnswer && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted-2)', marginTop: 6, textAlign: 'center' }}>🔒 Cerrado — el partido ya empezó</div>}
        {disabledReason && !locked && <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--danger)', marginTop: 6, textAlign: 'center' }}>{disabledReason}</div>}
      </div>
    );
  }

  function MatchChallenges({ match }) {
    const user = window.MB_useAuth ? window.MB_useAuth() : null;
    const store = window.MB_useBetStore ? window.MB_useBetStore() : {};
    const [picks, setPicks] = useState({}); // { qkey: {id, pick, stake, status, payout, claimed} }
    const [saving, setSaving] = useState(null);
    const [claiming, setClaiming] = useState(null);
    const [err, setErr] = useState(null);

    // Los hooks deben llamarse siempre en el mismo orden (Rules of Hooks): el
    // return temprano va DESPUÉS de todos los hooks, nunca antes de un useEffect.
    useEffect(() => {
      if (!user || !match || !FB().getChallengePicks) return;
      FB().getChallengePicks(match.id).then((p) => { if (p) setPicks(p); }).catch(() => {});
    }, [user && user.uid, match && match.id]);

    if (!user || !match) return null;
    // Los bonus/desafíos arrancaron recién en octavos de final: no se muestran
    // en fase de grupos ni en dieciseisavos (r32) — ni siquiera en partidos ya jugados.
    if (!match.stage || !BONUS_STAGES.has(match.stage)) return null;

    const kickoff = new Date(match.kickoff).getTime();
    const now = Date.now();
    const started = kickoff <= now;

    const ptsKO = PTS[match.stage] || 1500;
    const ptsExtra = Math.round(ptsKO * 0.5);
    const saldo = window.MB_avail ? window.MB_avail(store) : 90000;

    const savePick = async (qkey, value, cost) => {
      if (saving || started) return;
      setErr(null);
      if (!(picks[qkey] && picks[qkey].pick) && saldo < cost) { setErr({ qkey: qkey, msg: 'No te alcanzan los puntos' }); return; }
      setSaving(qkey);
      try {
        await FB().saveChallengePick(match.id, qkey, value, cost);
        setPicks((prev) => ({ ...prev, [qkey]: { id: user.uid + '_' + match.id + '_' + qkey, pick: value, stake: cost, status: 'open', claimed: false } }));
      } catch (e) {
        console.error('[MatchChallenges] saveChallengePick error:', e);
        const code = (e && e.code) || (typeof e === 'string' ? e : null);
        const msg = code === 'saldo-insuficiente' ? 'No te alcanzan los puntos'
          : code === 'permission-denied' ? 'Sin permiso para guardar (avísale al admin)'
          : code ? `No se pudo guardar (${code})` : 'No se pudo guardar';
        setErr({ qkey: qkey, msg: msg });
      }
      setSaving(null);
    };

    const claimPick = async (qkey) => {
      const doc = picks[qkey];
      if (!doc || claiming || !FB().claimChallengeWin) return;
      setClaiming(qkey);
      try {
        await FB().claimChallengeWin(doc.id);
        setPicks((prev) => ({ ...prev, [qkey]: Object.assign({}, prev[qkey], { claimed: true }) }));
      } catch (e) {}
      setClaiming(null);
    };

    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11 }}>⚡</span>
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus · Desafíos del partido</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {/* Q3: Tarjetas amarillas — todos los partidos */}
          <QuestionChip
            label="🟨 ¿Más de 3 tarjetas amarillas?"
            opts={[{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }]}
            doc={picks.q3}
            pts={ptsExtra}
            onPick={(v, cost) => savePick('q3', v, cost)}
            onClaim={() => claimPick('q3')}
            claiming={claiming === 'q3'}
            locked={started}
            disabledReason={err && err.qkey === 'q3' ? err.msg : null}
          />
          {/* Q4: Primer gol — todos los partidos */}
          <QuestionChip
            label="⚽ ¿Quién marca primero?"
            opts={[{ label: match.home, value: 'home' }, { label: 'Sin goles', value: 'none' }, { label: match.away, value: 'away' }]}
            doc={picks.q4}
            pts={ptsExtra}
            onPick={(v, cost) => savePick('q4', v, cost)}
            onClaim={() => claimPick('q4')}
            claiming={claiming === 'q4'}
            locked={started}
            disabledReason={err && err.qkey === 'q4' ? err.msg : null}
          />
          <QuestionChip
              label="🕐 ¿Habrá gol en el primer tiempo?"
              opts={[{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }]}
              doc={picks.q1}
              pts={ptsKO}
              onPick={(v, cost) => savePick('q1', v, cost)}
              onClaim={() => claimPick('q1')}
              claiming={claiming === 'q1'}
              locked={started}
              disabledReason={err && err.qkey === 'q1' ? err.msg : null}
            />
          <QuestionChip
              label="🕑 ¿Habrá gol en el segundo tiempo?"
              opts={[{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }]}
              doc={picks.q5}
              pts={ptsKO}
              onPick={(v, cost) => savePick('q5', v, cost)}
              onClaim={() => claimPick('q5')}
              claiming={claiming === 'q5'}
              locked={started}
              disabledReason={err && err.qkey === 'q5' ? err.msg : null}
            />
          <QuestionChip
              label="⚠️ ¿Irá a penales?"
              opts={[{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }]}
              doc={picks.q2}
              pts={ptsKO}
              onPick={(v, cost) => savePick('q2', v, cost)}
              onClaim={() => claimPick('q2')}
              claiming={claiming === 'q2'}
              locked={started}
              disabledReason={err && err.qkey === 'q2' ? err.msg : null}
            />
        </div>
      </div>
    );
  }

  window.MB_MatchChallenges = MatchChallenges;
})();
