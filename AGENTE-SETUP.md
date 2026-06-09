# Agente automático — resultados (football-data.org) + cuotas por modelo

El agente es un **GitHub Action** que corre solo cada ~15 min. En cada corrida:
1. **Genera las cuotas 1·X·2** de los próximos partidos según la **fuerza de cada
   selección** (modelo tipo ranking) y las escribe en `odds`. No depende de nadie y es gratis.
   Quedan **editables** (si pones una cuota a mano, el agente no la pisa).
2. Trae los **resultados** desde **football-data.org** (plan gratis, incluye el Mundial)
   y **liquida** las apuestas de los partidos terminados: paga `monto × cuota` a los
   ganadores, actualiza el **saldo** y deja `prevSaldo` para las flechas ↑/↓.

> El agente usa el **Firebase Admin SDK**, así que escribe en Firestore sin pasar por las
> reglas. No tienes que volver a tocar las reglas para esto.

Necesitas **2 secretos** en GitHub. El de Firebase ya lo cargaste; falta el token gratis
de football-data.org.

---

## 1) Token gratis de football-data.org
1. Entra a 👉 **https://www.football-data.org/client/register**
2. Regístrate con tu correo (plan **Free**). Te llega un correo con tu **API Token**
   (una cadena larga). El plan gratis incluye la competición **World Cup** y permite
   **10 consultas/minuto** (de sobra: el agente hace 1 por corrida).
3. Copia ese **token**.

## 2) Cargar el secreto en GitHub
👉 **https://github.com/iagarciaprovidel/mundial-bet-2026/settings/secrets/actions**
→ **New repository secret**
- **Name:** `FOOTBALL_DATA_TOKEN`
- **Secret:** *(pega el token del paso 1)*
→ **Add secret**

*(El secreto `FIREBASE_SERVICE_ACCOUNT` ya lo tienes. El viejo `API_FOOTBALL_KEY` ya no se
usa; puedes dejarlo o borrarlo.)*

## 3) Primera corrida: DESCUBRIR (calibrar nombres)
1. Pestaña **Actions** del repo → workflow **"Agente MundialBet"** → **Run workflow**.
2. En *mode* escribe **`discover`** → **Run**.
3. Abre el log del paso **"Ejecutar agente"**. Verás:
   - `football-data.org devolvió N partidos.`  → si **N > 0**, ¡el Mundial está disponible!
   - `Mapeados: X · sin mapear: Y` → idealmente todos mapeados.
   - Si hay líneas **`SIN MAPEAR: ...`**, pásamelas y ajusto los nombres (`ALIASES`).

## 4) Listo — queda automático
Cuando mapee bien, corre **cada 15 min** solo: genera cuotas y, cuando empiece el Mundial,
liquida apuestas. También puedes dispararlo a mano (Actions → Run workflow, *mode* vacío).

---

## Notas / ajustes
- **Cuotas por modelo:** se calculan con la fuerza estimada de cada selección
  (`RATING` en `agent/index.js`) y un margen `ODDS_MARGIN` (def. 1.06 ≈ 6%). Se generan
  para partidos que arrancan dentro de `ODDS_WINDOW_H` horas (def. 120) y que aún no tienen
  cuota. Si quieres ajustar el nivel de algún equipo, edita `RATING`.
- **Cuotas a mano:** si en Firestore pones una cuota manual en `odds/<id>`, el agente la
  respeta (solo genera las que faltan).
- **Si football-data.org no trae el Mundial 2026** (N = 0 en discover): pásame el dato y lo
  resolvemos con **scraping** de una página pública (plan B que ya acordamos).
- **Eliminatorias:** todavía no se mapean (sin rivales definidos); por ahora fase de grupos.
- **Pendiente futuro:** notificación push por gol (FCM), flecha por **posición** además de
  por saldo, y un **panel de admin** para ingresar/corregir un marcador a mano (respaldo).
- **Variables opcionales** (Settings → Variables): `WC_COMP` (def `WC`).
