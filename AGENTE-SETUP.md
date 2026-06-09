# Agente automático — cuotas + liquidación (API-Football)

El agente es un **GitHub Action** que corre solo cada ~15 min. En cada corrida:
1. Trae los partidos del Mundial desde **API-Football** y los empareja con los nuestros
   por **código de país** (no depende de los nombres exactos).
2. Para los **próximos** partidos sin cuota, carga la **cuota real 1·X·2** en `odds`.
3. Para los partidos **terminados**, **liquida** las apuestas abiertas: paga
   `monto × cuota` a los ganadores, actualiza el **saldo** y deja `prevSaldo`
   para las flechas ↑/↓.

> El agente usa el **Firebase Admin SDK**, así que escribe en Firestore sin pasar por
> las reglas. No tienes que volver a tocar las reglas para esto.

Hay que configurar **2 secretos** en GitHub (una sola vez). Sigue los pasos.

---

## 1) Clave de API-Football
1. Crea cuenta en 👉 **https://dashboard.api-football.com/register** (proveedor *API-Sports*).
2. Confirma el correo e inicia sesión en el **Dashboard**.
3. Copia tu **API Key** (en *"My Access" / "API Key"*). Es una cadena larga.
4. El plan **Free** da **100 peticiones/día**. El agente está hecho para **gastar API
   sólo cuando hay un partido en vivo o cuotas pendientes** (los demás minutos sale sin
   gastar), así que 100/día alcanza para un juego entre amigos.

## 2) Service Account de Firebase
1. Entra a 👉 **https://console.firebase.google.com/project/mundialbet-club/settings/serviceaccounts/adminsdk**
2. Botón **"Generate new private key"** → **Generate key**. Se descarga un archivo `.json`.
3. **Guárdalo bien** (es como una contraseña de administrador). No lo subas al repo.

## 3) Cargar los secretos en GitHub
En el repo 👉 **https://github.com/iagarciaprovidel/mundial-bet-2026/settings/secrets/actions**
→ botón **"New repository secret"**, crea estos dos:

| Name | Secret (valor) |
|------|----------------|
| `API_FOOTBALL_KEY` | la clave del paso 1 |
| `FIREBASE_SERVICE_ACCOUNT` | **todo el contenido del .json** del paso 2 (ábrelo con el Bloc de notas, copia y pega completo, desde `{` hasta `}`) |

*(Opcional)* En **Settings → Secrets and variables → Actions → Variables** puedes crear:
`WC_LEAGUE_ID` (por defecto `1` = Mundial) y `WC_SEASON` (por defecto `2026`).

## 4) Primera corrida: DESCUBRIR (calibrar nombres)
Antes de dejarlo automático, conviene una corrida de prueba que **sólo lista** (no escribe):
1. Ve a la pestaña **Actions** del repo → workflow **"Agente MundialBet"**.
2. Botón **"Run workflow"** → en *mode* escribe **`discover`** → **Run**.
3. Abre el log del paso *"Ejecutar agente"*. Verás cuántos partidos **mapeó** y, si hay
   alguno **"SIN MAPEAR"**, el nombre que usó la API. Si aparece alguno, me lo pasas y
   ajusto los alias en `agent/index.js` (campo `ALIASES`).

## 5) Listo — queda automático
Una vez mapea bien, no hay que hacer nada: corre **cada 15 min** y, cuando empiece el
Mundial, cargará cuotas y liquidará apuestas solo. También puedes dispararlo a mano
(Actions → Run workflow, *mode* vacío).

---

## Notas / límites
- **Cuota gratis (100/día):** el agente evita gastar API fuera de las ventanas de partido.
  Si algún día se agota, baja la frecuencia (cron `*/30`) o sube de plan. El cron está en
  `.github/workflows/agent.yml`.
- **Cuotas:** toma el mercado *Match Winner* (1·X·2) de la primera casa disponible (o la
  que fijes en la variable `ODDS_BOOKMAKER`). Se cargan para partidos que arrancan dentro
  de `ODDS_WINDOW_H` horas (def. 120) y que aún no tienen cuota.
- **Eliminatorias:** todavía no se mapean (no hay rivales definidos); el agente sólo
  trabaja la fase de grupos por ahora.
- **Pendiente (futuro):** notificación push por gol (requiere registrar tokens FCM en el
  navegador de cada jugador) y flecha por **posición** además de por saldo.
- **Seguridad:** cuando el agente ya cargue cuotas, puedes cerrar la escritura de `odds`
  en las reglas (cambiar `allow write: if signedIn();` por `allow write: if false;`),
  porque el agente escribe con el Admin SDK. Mientras pruebas con `MB_seedOdds()`, déjalo
  abierto.
