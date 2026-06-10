# MundialBet Club 2026 — Contexto del proyecto

Documento maestro para retomar el proyecto con todo el contexto (sirve para
cualquier sesión de Claude o para otra persona). Última actualización: jun 2026.

## ¿Qué es?
Juego de **pronósticos/apuestas** del **Mundial 2026** para amigos y familia.
Cada jugador parte con **90.000 puntos** (dinero virtual, NO real) y apuesta al
**ganador** de cada partido (1·X·2). Hay ranking de apostadores y de equipos.

- **App principal:** https://mundialbet-club.web.app (Firebase Hosting)
- **Respaldo:** https://iagarciaprovidel.github.io/mundial-bet-2026/ (GitHub Pages)
- **Repo:** https://github.com/iagarciaprovidel/mundial-bet-2026
- **Proyecto Firebase:** `mundialbet-club`

## Stack técnico
- **PWA** React 18 + ReactDOM + **Babel standalone** desde CDN. **SIN paso de build**:
  los `.jsx` se transpilan en el navegador (`type="text/babel"`).
- **Firebase** (compat SDK): Auth (Google + email link) + Firestore + Messaging (FCM).
- **i18n automático** (ES/PT/EN) interceptando `React.createElement` (`i18n.js`).
- **Service worker** `sw.js` (network-first; versión `mundialbet-vNN`, se sube a mano).
- **Agente** = GitHub Action (`.github/workflows/agent.yml`, cron */5) que corre
  `agent/index.js` (Node + firebase-admin) con datos de **football-data.org**.
- **Deploy** automático a Firebase Hosting (`.github/workflows/deploy.yml`) en cada push.

## Archivos clave
- `index.html` — carga todo + splash + bootstrap responsive (AppWeb ≥1024px / App móvil).
- `app.jsx` (móvil) / `app-web.jsx` (escritorio) — shells, nav, dashboard.
- `screens-core.jsx` (onboarding, dashboard móvil), `screens-bet.jsx` (Partidos móvil),
  `screens-rank.jsx` (Ranking/Liga/Perfil móvil), `screens-teams.jsx`, `screens-special.jsx`.
- `components.jsx` — Card, Chip, etc. `mb-auth-ui.jsx` — login + MB_SignInNote.
- `mb-firebase.js` — toda la capa Firebase (auth, grupos, apuestas, campeón, notif).
- `mb-bet.jsx` — caja de apuestas (MB_BetBox), store compartido (MB_useBetStore),
  saldo (MB_SaldoBadge), cuenta regresiva, pronóstico campeón, banderas/avatares.
- `mb-ranking.jsx` — ranking de apostadores, equipos, Liga, FAQ.
- `mb-groups-home.jsx` — "Liga de apostadores" + ficha de equipo (integrantes) + invitar.
- `mb-team-select.jsx` — bienvenida (apodo+equipo), selector de equipo, link `?join=`.
- `mb-help.jsx` — modal "Cómo se juega". `mb-admin.jsx` — panel "Mis equipos".
- `wc2026.js` — datos reales del Mundial (grupos, fixtures, estadios, árbitros).
- `firebase-config.js` — config pública + `MB_VAPID_KEY` + `MB_ADMIN_EMAILS`.
- `agent/` — `index.js` (agente), `gen-fixtures.js` (genera our-fixtures.json desde wc2026.js).

## Modelo de datos (Firestore)
- `users/{uid}`: nombre, nombreLower (único), email, foto, **saldo**, **staked** (monto
  apostado = suma de apuestas abiertas), prevSaldo (flechas), groupId/groupName/noGroup,
  apodoSet, **champion**/championCode (pronóstico campeón), fcmTokens (push), creado.
- `groups/{id}`: name, nameLower (único), open (abierto/cerrado), adminEmails[], **ownerUid**
  (1 equipo por persona), ownerName, creado.
- `bets/{uid_matchId}`: uid, matchId, md, pick (home/draw/away), stake, odd, home, away,
  status (open/won/lost), payout, creado, settledAt.
- `odds/{matchId}`: home/draw/away (cuotas), fuente ('modelo'), **finished/gh/ga/result**
  (resultado final), **live/minute** (marcador en vivo).
- `joinRequests/{uid_gid}`: solicitudes a equipos cerrados.
- Reglas en `FIREBASE-SETUP.md` (clave: `bets` read con `resource == null` para placeBet).

## Cómo funciona el agente (`agent/index.js`)
Cada 5 min (GitHub Action): trae partidos de **football-data.org** (competición `WC`),
los mapea con los nuestros por **código ISO** (alias en `ALIASES`), y:
1. **Genera cuotas** 1·X·2 por **modelo** (tabla `RATING` por selección) en `odds`.
2. **Recalcula `staked`** (monto apostado) de todos desde las apuestas abiertas.
3. **Marcador en vivo** (IN_PLAY) → guarda goles/minuto en `odds`.
4. **Liquida** partidos terminados: paga stake×cuota, actualiza saldo, manda push.
> NOTA: el plan gratis de **API-Football NO tenía 2026** → se usa **football-data.org**.
> Las cuotas reales de casas son de pago → se generan por modelo.

## Configuración / secretos (lo que hace falta)
- **firebase-config.js**: config pública + `MB_VAPID_KEY` (Web Push, ya cargada).
- **GitHub repo secrets**: `FOOTBALL_DATA_TOKEN`, `FIREBASE_SERVICE_ACCOUNT` (agente + deploy).
- Guías: `FIREBASE-SETUP.md` (reglas) y `AGENTE-SETUP.md` (token + service account).

## Decisiones de diseño acordadas
- Apodo: 3–20 chars, **único**, **no editable**. Equipo: **1 propio por persona**,
  nombre único. Ranking equipos = **promedio** de saldo. Mín apuesta 1.000.
- Pronóstico **campeón** gratis (cierra al 1er partido; +30.000 pts si acierta, premio TBD).
- Apuestas **privadas** (cada quien ve solo las suyas) — decisión pendiente de revisar.
- Marca: **"MundialBet Club"** (se descartó "Polla").

## Flujo de validación al programar
`npm install --no-save @babel/standalone@7.29.0` → `Babel.transform(...,{presets:['react']})`
para chequear que los .jsx compilan → `node --check` para los .js → limpiar node_modules →
**subir la versión del SW** (`mundialbet-vNN`) → commit + push.

## Pendientes / ideas futuras
- Activar premio al **campeón** (requiere mapear eliminatorias, sin rivales aún).
- Notificación **"tu partido empieza pronto"**. Logros reales. Apuesta marcador exacto.
- **Seguridad**: hoy saldo/odds editables por reglas (modelo de confianza entre amigos);
  blindar con Cloud Functions si se abre a desconocidos.
- Recarga de puntos en 2ª fase. Decidir si "Liga" (menú) se mantiene o se quita.
