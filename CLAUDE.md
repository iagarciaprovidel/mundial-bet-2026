## Instrucciones de trabajo
- Trabaja de forma autónoma: implementa los cambios directamente sin pedir confirmación
- Haz push a GitHub después de cada cambio sin preguntar
- Si algo es ambiguo, elige la opción más razonable y avísame qué elegiste al final
- Solo pregunta si hay riesgo real de perder datos o romper algo crítico

## GitHub (sin git instalado — usar API REST)
- Repo: `iagarciaprovidel/mundial-bet-2026`
- PAT: el usuario lo provee al inicio de sesión o está en memoria (`memory/`)
- Método push (PowerShell): GET SHA → base64 → `Invoke-RestMethod PUT`
- Archivos >70 KB: usar `curl.exe` con JSON en archivo temp UTF-8 (Invoke-RestMethod falla con "Problems parsing JSON")
- **Siempre** incrementar `CACHE = 'mundialbet-vN'` en `sw.js` junto con cualquier push

## Contexto técnico
- PWA sin build: archivos `.jsx` transpilados en el navegador con Babel standalone
- CSS variables `--surface-1` y `--surface-2` son AZULES (#1A3A5C / #2A5A7C), no oscuras
  - Para paneles oscuros usar `rgba(13,20,15,0.92)` directamente
- Mobile: componente `App` (app.jsx) — Desktop: componente `AppWeb` (app-web.jsx)
- Auth: Firebase compat SDK, `window.MBFirebase.onAuth(cb)`