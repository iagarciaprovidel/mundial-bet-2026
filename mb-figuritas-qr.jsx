/* ============================================================
   MundialBet Club 2026 — Intercambio de figuritas por QR (offline)
   Pantalla embebida en "🙋 Mi álbum". Flujo:
     1) Mostrar mi código → QR con mi colección (+ compartir imagen).
     2) Escanear a un amigo → cámara · o subir foto del QR.
     3) Match al instante: "Tú le das" / "Él te da".
     4) Marcar lo intercambiado → ajusta el álbum personal (localStorage).
   Usa window.MB_FigCodec (codec) + qrcode-generator + jsQR (CDN).
   No toca Firestore: todo el cálculo es local.
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const DATA = window.MB_FIGURITAS || { total: 0, especiales: [], selecciones: [] };
  const CODEC = () => window.MB_FigCodec;

  // —— Mapa n → { num, nombre, flag } para pintar cada figurita ——
  const BY_N = (function () {
    const m = {};
    (DATA.especiales || []).forEach((e) => { m[e.n] = { num: e.num, nombre: e.nombre, flag: e.code || null }; });
    (DATA.selecciones || []).forEach((s) => (s.items || []).forEach((it) => { m[it.n] = { num: it.num, nombre: it.nombre, flag: s.code || null }; }));
    return m;
  })();

  // —— Fila de una figurita en las listas del match ——
  function FigRow({ n, selected, onToggle }) {
    const f = BY_N[n] || { num: n, nombre: 'Figurita ' + n, flag: null };
    return (
      <button onClick={() => onToggle(n)} className="mb-press" style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
        padding: '8px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer',
        border: '1px solid ' + (selected ? 'var(--gold)' : 'var(--border-2)'),
        background: selected ? 'var(--coin-bg)' : 'var(--surface-2)', marginBottom: 6,
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid ' + (selected ? 'var(--gold)' : 'var(--border-2)'), background: selected ? 'var(--gold)' : 'transparent',
          color: '#1A1206', fontWeight: 900, fontSize: 13,
        }}>{selected ? '✓' : ''}</span>
        {f.flag
          ? <img src={'https://flagcdn.com/h20/' + f.flag + '.png'} alt="" style={{ height: 14, width: 'auto', borderRadius: 2, flexShrink: 0 }} />
          : <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>🎴</span>}
        <span className="num" style={{ fontWeight: 800, color: 'var(--gold-light)', fontSize: 'var(--t-2xs)', minWidth: 26 }}>{f.num}</span>
        <span style={{ flex: 1, minWidth: 0, color: 'var(--text)', fontSize: 'var(--t-2xs)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nombre}</span>
      </button>
    );
  }

  // —— Componente principal del intercambio ——
  // props: col (mi álbum personal), apodo, onApply(nuevaCol), onClose()
  function Trade({ col, apodo, onApply, onClose }) {
    const [mode, setMode] = useState('home');   // home | show | scan | result
    const [qrUrl, setQrUrl] = useState('');
    const [error, setError] = useState('');
    const [other, setOther] = useState(null);   // decode() del amigo
    const [m, setM] = useState({ leDoy: [], meDa: [] });
    const [selDoy, setSelDoy] = useState({});   // {n:true} de lo que realmente di
    const [selDa, setSelDa] = useState({});     // {n:true} de lo que realmente recibí
    const [done, setDone] = useState('');

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const fileRef = useRef(null);

    // —— Generar mi QR ——
    useEffect(() => {
      if (mode !== 'show') return;
      setError('');
      try {
        const text = CODEC().encode(col, apodo);
        const qr = qrcode(0, 'L');
        qr.addData(text);
        qr.make();
        setQrUrl(qr.createDataURL(5, 12));
      } catch (e) {
        setError('No se pudo generar el código.');
      }
    }, [mode]);

    // —— Cámara + bucle de escaneo ——
    const stopCamera = useCallback(() => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    }, []);

    const handleDecoded = useCallback((text) => {
      const dec = CODEC().decode(text);
      if (!dec) { setError('Ese QR no es de un álbum MundialBet.'); return false; }
      stopCamera();
      const res = CODEC().match(col, dec);
      setOther(dec); setM(res);
      const d = {}; const g = {};
      res.leDoy.forEach((n) => { d[n] = true; });
      res.meDa.forEach((n) => { g[n] = true; });
      setSelDoy(d); setSelDa(g);
      setMode('result');
      return true;
    }, [col, stopCamera]);

    useEffect(() => {
      if (mode !== 'scan') { stopCamera(); return undefined; }
      setError('');
      let cancelled = false;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = stream;
          const v = videoRef.current;
          if (!v) return;
          v.srcObject = stream;
          v.setAttribute('playsinline', 'true');
          v.play().catch(() => {});
          const tick = () => {
            if (cancelled) return;
            if (v.readyState === v.HAVE_ENOUGH_DATA && window.jsQR) {
              canvas.width = v.videoWidth; canvas.height = v.videoHeight;
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
              if (code && code.data) { if (handleDecoded(code.data)) return; }
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        })
        .catch(() => { setError('cam'); });
      return () => { cancelled = true; stopCamera(); };
    }, [mode, handleDecoded, stopCamera]);

    // Limpieza al desmontar.
    useEffect(() => () => stopCamera(), [stopCamera]);

    // —— Subir foto del QR (respaldo) ——
    const onFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setError('');
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const cx = c.getContext('2d', { willReadFrequently: true });
        cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, c.width, c.height);
        const code = window.jsQR && window.jsQR(d.data, d.width, d.height);
        if (code && code.data) handleDecoded(code.data);
        else setError('No se encontró un QR en la foto.');
      };
      img.onerror = () => setError('No se pudo leer la imagen.');
      img.src = URL.createObjectURL(file);
      e.target.value = '';
    };

    // —— Compartir mi QR como imagen ——
    const shareQR = async () => {
      try {
        const blob = await (await fetch(qrUrl)).blob();
        const fileObj = new File([blob], 'mi-album-mundialbet.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
          await navigator.share({ files: [fileObj], title: 'Mi álbum MundialBet', text: 'Escanéame para intercambiar figuritas 🎴' });
        } else {
          const a = document.createElement('a'); a.href = qrUrl; a.download = 'mi-album-mundialbet.png'; a.click();
        }
      } catch (e) {}
    };

    // —— Aplicar el intercambio al álbum personal ——
    const aplicar = () => {
      const nc = Object.assign({}, col);
      Object.keys(selDoy).forEach((k) => { if (!selDoy[k]) return; const n = +k; const v = (nc[n] || 0) - 1; if (v <= 0) delete nc[n]; else nc[n] = v; });
      Object.keys(selDa).forEach((k) => { if (!selDa[k]) return; const n = +k; nc[n] = (nc[n] || 0) + 1; });
      onApply(nc);
      const di = Object.keys(selDoy).filter((k) => selDoy[k]).length;
      const re = Object.keys(selDa).filter((k) => selDa[k]).length;
      setDone('Listo · diste ' + di + ' · recibiste ' + re);
      setTimeout(() => onClose(), 1300);
    };

    const Header = ({ title, back }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
        <button onClick={back} className="mb-press" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontSize: 17, flexShrink: 0 }}>←</button>
        <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-lg)', color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
      </div>
    );

    const wrap = { position: 'relative', background: 'rgba(13,20,15,0.92)', border: '1px solid rgba(74,144,226,0.45)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--sh-1)', display: 'flex', flexDirection: 'column', animation: 'mb-fade-up var(--dur-base) var(--ease-out)' };
    const bigBtn = (bg) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '22px 16px', borderRadius: 'var(--r-lg)', cursor: 'pointer', border: '1px solid var(--border-2)', background: bg, color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--t-sm)' });

    // —— HOME: dos opciones ——
    if (mode === 'home') {
      return (
        <div style={wrap}>
          <Header title="🔄 Intercambiar figuritas" back={onClose} />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: '0 0 4px', color: 'var(--muted-2)', fontSize: 'var(--t-2xs)', lineHeight: 1.4 }}>
              En persona: uno muestra su código y el otro lo escanea. La app calcula al instante qué se conviene cambiar. Funciona sin internet.
            </p>
            <button onClick={() => setMode('show')} className="mb-press" style={bigBtn('var(--surface-2)')}>
              <span style={{ fontSize: 30 }}>📲</span> Mostrar mi código
            </button>
            <button onClick={() => setMode('scan')} className="mb-press" style={bigBtn('var(--coin-bg)')}>
              <span style={{ fontSize: 30 }}>📷</span> Escanear a un amigo
            </button>
          </div>
        </div>
      );
    }

    // —— SHOW: mi QR ——
    if (mode === 'show') {
      return (
        <div style={wrap}>
          <Header title="📲 Mi código" back={() => setMode('home')} />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {error ? <div style={{ color: 'var(--danger)', fontSize: 'var(--t-sm)' }}>{error}</div> : (
              <React.Fragment>
                <div style={{ padding: 12, background: '#fff', borderRadius: 'var(--r-md)' }}>
                  {qrUrl ? <img src={qrUrl} alt="Mi QR" style={{ display: 'block', width: 220, height: 220, imageRendering: 'pixelated' }} /> : <div style={{ width: 220, height: 220 }} />}
                </div>
                <div style={{ textAlign: 'center', color: 'var(--muted-2)', fontSize: 'var(--t-2xs)' }}>Que tu amigo lo escanee desde su álbum.</div>
                <button onClick={shareQR} className="mb-press" style={{ padding: '10px 18px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>📤 Compartir imagen</button>
              </React.Fragment>
            )}
          </div>
        </div>
      );
    }

    // —— SCAN: cámara + fallback foto ——
    if (mode === 'scan') {
      return (
        <div style={wrap}>
          <Header title="📷 Escanear a un amigo" back={() => setMode('home')} />
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {error === 'cam' ? (
              <div style={{ textAlign: 'center', color: 'var(--muted-2)', fontSize: 'var(--t-2xs)', lineHeight: 1.4 }}>No se pudo abrir la cámara. Usa la foto del QR.</div>
            ) : (
              <div style={{ position: 'relative', width: '100%', maxWidth: 300, aspectRatio: '1 / 1', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#000' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                <div style={{ position: 'absolute', inset: 18, border: '2px solid rgba(230,192,74,0.9)', borderRadius: 12, pointerEvents: 'none' }} />
              </div>
            )}
            {error && error !== 'cam' && <div style={{ color: 'var(--danger)', fontSize: 'var(--t-2xs)', textAlign: 'center' }}>{error}</div>}
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current && fileRef.current.click()} className="mb-press" style={{ padding: '10px 18px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontWeight: 800, fontSize: 'var(--t-2xs)' }}>🖼️ Subir foto del QR</button>
          </div>
        </div>
      );
    }

    // —— RESULT: match + marcar ——
    const toggleDoy = (n) => setSelDoy((s) => Object.assign({}, s, { [n]: !s[n] }));
    const toggleDa = (n) => setSelDa((s) => Object.assign({}, s, { [n]: !s[n] }));
    const nadie = m.leDoy.length === 0 && m.meDa.length === 0;
    return (
      <div style={wrap}>
        <Header title={'🤝 Con ' + ((other && other.apodo) || 'tu amigo')} back={() => setMode('home')} />
        <div style={{ padding: '12px 16px 18px' }}>
          {nadie ? (
            <div style={{ textAlign: 'center', color: 'var(--muted-2)', padding: 30, fontSize: 'var(--t-sm)', lineHeight: 1.5 }}>
              Por ahora no hay nada que intercambiar 🤷‍♂️<br />Ninguno tiene repetidas que al otro le falten.
            </div>
          ) : (
            <React.Fragment>
              <p style={{ margin: '0 0 12px', color: 'var(--muted-2)', fontSize: 'var(--t-3xs)', lineHeight: 1.4 }}>Toca para marcar las que <b>realmente</b> intercambiaron; luego confirma.</p>

              <div style={{ marginBottom: 16 }}>
                <h3 className="display" style={{ margin: '0 0 8px', fontSize: 'var(--t-sm)', color: 'var(--gold-light)' }}>👉 Tú le das <span className="num" style={{ opacity: 0.7 }}>{m.leDoy.length}</span></h3>
                {m.leDoy.length === 0 ? <div style={{ color: 'var(--muted-2)', fontSize: 'var(--t-2xs)', padding: '4px 2px' }}>Nada de tus repetidas le sirve.</div>
                  : m.leDoy.map((n) => <FigRow key={'d' + n} n={n} selected={!!selDoy[n]} onToggle={toggleDoy} />)}
              </div>

              <div style={{ marginBottom: 8 }}>
                <h3 className="display" style={{ margin: '0 0 8px', fontSize: 'var(--t-sm)', color: 'var(--info)' }}>👈 Él te da <span className="num" style={{ opacity: 0.7 }}>{m.meDa.length}</span></h3>
                {m.meDa.length === 0 ? <div style={{ color: 'var(--muted-2)', fontSize: 'var(--t-2xs)', padding: '4px 2px' }}>Nada de sus repetidas te falta.</div>
                  : m.meDa.map((n) => <FigRow key={'g' + n} n={n} selected={!!selDa[n]} onToggle={toggleDa} />)}
              </div>

              <button onClick={aplicar} className="mb-press" style={{ width: '100%', marginTop: 10, padding: '13px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--t-md)', color: '#1A1206', background: 'linear-gradient(135deg,#E6C04A,#C99B1F)' }}>✔ Marcar lo intercambiado</button>
            </React.Fragment>
          )}
        </div>
        {done && (
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface-1)', border: '1px solid var(--gold)', color: 'var(--gold-light)', padding: '10px 18px', borderRadius: 'var(--r-pill)', fontSize: 'var(--t-2xs)', fontWeight: 800, boxShadow: 'var(--sh-3)', zIndex: 5, whiteSpace: 'nowrap' }}>{done}</div>
        )}
      </div>
    );
  }

  window.MB_FigTrade = Trade;
})();
