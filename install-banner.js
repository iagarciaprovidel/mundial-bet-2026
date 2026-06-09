/* ============================================================
   MundialBet Club 2026 — Banner de instalación (solo móvil)
   - Android (Chrome): botón "Instalar" → instalación PWA nativa,
     SIN avisos de "fuentes desconocidas".
   - iPhone (Safari): instrucciones "Compartir → Añadir a inicio".
   - Enlace secundario al APK para quien lo prefiera.
   Se oculta si ya está instalada (standalone) o si el usuario lo
   cierra (reaparece en la próxima visita). Usa window.MB_T (i18n).
   ============================================================ */
(function () {
  var T = window.MB_T || function (s) { return s; };
  var ua = navigator.userAgent || '';
  var isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

  if (!isMobile || standalone) return;
  try { if (sessionStorage.getItem('mb_install_dismissed') === '1') return; } catch (e) {}

  var shown = false, installBtn = null;

  function build() {
    if (shown) return; shown = true;

    var wrap = document.createElement('div');
    wrap.id = 'mb-install-banner';
    wrap.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:160',
      'padding:12px 14px calc(12px + env(safe-area-inset-bottom,0px))',
      'background:rgba(13,20,15,0.97)', 'backdrop-filter:blur(12px)', '-webkit-backdrop-filter:blur(12px)',
      'border-top:1px solid rgba(212,175,55,0.45)', 'box-shadow:0 -8px 28px rgba(0,0,0,0.5)',
      'font-family:var(--font-body, system-ui, sans-serif)', 'color:#fff',
      'animation:mb-fade-up .35s ease-out'
    ].join(';');

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;max-width:560px;margin:0 auto;';

    var icon = document.createElement('img');
    icon.src = 'icon-192.png'; icon.alt = '';
    icon.style.cssText = 'width:46px;height:46px;border-radius:11px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.5);';

    var txt = document.createElement('div');
    txt.style.cssText = 'flex:1;min-width:0;';
    var title = document.createElement('div');
    title.textContent = T('Instala la app');
    title.style.cssText = 'font-weight:800;font-size:15px;line-height:1.2;';
    var sub = document.createElement('div');
    sub.textContent = isIOS
      ? T("Toca Compartir y elige 'Añadir a pantalla de inicio'.")
      : T('Un toque, sin barra del navegador y sin avisos.');
    sub.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.66);margin-top:2px;line-height:1.3;';
    txt.appendChild(title); txt.appendChild(sub);

    var close = document.createElement('button');
    close.innerHTML = '✕'; close.setAttribute('aria-label', T('Cerrar'));
    close.style.cssText = 'flex-shrink:0;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);font-size:13px;cursor:pointer;';
    close.onclick = function () { dismiss(); };

    row.appendChild(icon); row.appendChild(txt);

    if (isIOS) {
      // iPhone: glifo de "Compartir" como pista visual
      var ios = document.createElement('div');
      ios.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;color:var(--gold-light,#F0CE5A);font-weight:700;font-size:12px;';
      ios.innerHTML = '<span style="font-size:18px;">↑</span>';
      row.appendChild(ios);
    } else {
      installBtn = document.createElement('button');
      installBtn.textContent = T('📲 Instalar');
      installBtn.style.cssText = 'flex-shrink:0;padding:10px 16px;border-radius:999px;border:none;cursor:pointer;background:linear-gradient(135deg,#E6C04A,#C99B1F);color:#1A1206;font-family:inherit;font-weight:800;font-size:13px;box-shadow:0 2px 10px rgba(212,175,55,0.4);';
      installBtn.disabled = !window.__deferredPrompt;
      installBtn.style.opacity = window.__deferredPrompt ? '1' : '0.55';
      installBtn.onclick = function () {
        if (window.__triggerInstall && window.__deferredPrompt) window.__triggerInstall();
      };
      row.appendChild(installBtn);
    }
    row.appendChild(close);

    // Línea secundaria: APK
    var apk = document.createElement('div');
    apk.style.cssText = 'max-width:560px;margin:8px auto 0;font-size:11px;color:rgba(255,255,255,0.5);text-align:center;';
    var apkLink = document.createElement('a');
    // El APK se sirve desde GitHub Pages (Firebase Hosting plan Spark bloquea ejecutables).
    apkLink.href = 'https://iagarciaprovidel.github.io/mundial-bet-2026/mundialbet.apk'; apkLink.setAttribute('download', 'mundialbet.apk');
    apkLink.textContent = T('Descargar');
    apkLink.style.cssText = 'color:var(--gold-light,#F0CE5A);font-weight:700;text-decoration:none;';
    apk.appendChild(document.createTextNode(T('¿Prefieres el APK de Android?') + ' '));
    apk.appendChild(apkLink);

    wrap.appendChild(row); wrap.appendChild(apk);
    document.body.appendChild(wrap);
  }

  function dismiss() {
    try { sessionStorage.setItem('mb_install_dismissed', '1'); } catch (e) {}
    var el = document.getElementById('mb-install-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function hideInstalled() {
    var el = document.getElementById('mb-install-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Si el prompt llega tarde, habilita el botón
  window.addEventListener('mb-installable', function () {
    if (installBtn) { installBtn.disabled = false; installBtn.style.opacity = '1'; }
  });
  window.addEventListener('mb-installed', hideInstalled);
  window.addEventListener('appinstalled', hideInstalled);

  // Muestra el banner tras un breve respiro (deja cargar la app)
  var start = function () { setTimeout(build, 1400); };
  if (document.readyState === 'complete' || document.readyState === 'interactive') start();
  else window.addEventListener('DOMContentLoaded', start);
})();
