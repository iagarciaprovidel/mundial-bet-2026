## Instrucciones de trabajo — LEER PRIMERO
- **Actúa directamente. Nunca narres lo que vas a hacer antes de hacerlo.**
- **Nunca pidas confirmación antes de ningún cambio de código, diseño o push.**
- Si algo es ambiguo: elige la opción más razonable y menciónala en UNA línea al final, solo si es relevante.
- Solo pregunta si hay riesgo irreversible real (borrar datos de producción, etc.).

## Decisiones que tomas solo — NUNCA preguntar sobre esto
- Qué archivo editar o crear
- Nombre de archivos, clases, IDs o variables
- Qué diseño/estilo elegir (elige el que más encaje con el proyecto)
- Si hacer push o no (siempre hacer push después de cada cambio)
- Si actualizar también `todio/index.html` cuando editas `todio.html` (sí, siempre)
- Si bumpar `sw.js` (sí, siempre con cualquier push)
- Si los cambios son "suficientes" o si agregar algo más

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