# Configuración Firebase — Admin, grupos y login por correo

La parte de código ya está lista. Falta **activar 3 cosas en la consola de Firebase**
(proyecto `mundialbet-club`). Hazlo una sola vez.

## 1) Activar el login por correo (email link)
Firebase Console → **Authentication** → **Sign-in method**:
- **Email/Password**: actívalo y, dentro, **activa "Email link (passwordless sign-in)"**.
- **Google**: ya está activo (déjalo).

## 2) Autorizar los dominios
Authentication → **Settings** → **Authorized domains** → agrega (si no están):
- `iagarciaprovidel.github.io`
- `localhost`

(El correo de confirmación solo funciona desde dominios autorizados.)

## 3) Reglas de Firestore

**⚠️ El deploy automático de reglas vía GitHub Actions está roto** (el service
account de `FIREBASE_SERVICE_ACCOUNT` no tiene permiso IAM para consultar
`serviceusage.googleapis.com`, así que `firebase deploy --only firestore:rules`
falla con 403 en cada push — el workflow lo esconde con `|| true` y el deploy
del *hosting* sigue reportando éxito igual). Esto viene pasando desde antes,
no es nuevo. Hasta que se arregle el permiso IAM (ver abajo), **cualquier
cambio a `firestore.rules` hay que publicarlo a mano**:

Firestore Database → **Rules** → pega el contenido de `firestore.rules` (la
fuente única del repo) y publica.

### Arreglo permanente del deploy automático
En Google Cloud Console → IAM del proyecto `mundialbet-club`, busca el
service account usado en el secreto `FIREBASE_SERVICE_ACCOUNT` (el email
termina en `.iam.gserviceaccount.com`) y agrégale el rol **Service Usage
Consumer** (`roles/serviceusage.serviceUsageConsumer`) — o si prefieres no
andar afinando roles uno por uno, dale **Firebase Admin** directamente.

### Reglas actuales (copia de `firestore.rules`)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    // ¿El usuario es admin de ESE equipo? (su correo está en adminEmails del grupo)
    function isTeamAdmin(gid) {
      return signedIn() &&
        request.auth.token.email.lower() in
        get(/databases/$(database)/documents/groups/$(gid)).data.adminEmails;
    }
    // Álbum de figuritas compartido: ¿soy miembro / dueño de ESE equipo?
    function albumMember(gid) {
      return signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.groupId == gid;
    }
    // bestStreak/currentStreak los mantiene SOLO el agente (recomputeAllStreaks).
    // Si el cliente pudiera escribirlos directo, cualquiera podría inflar su
    // racha y reclamar premios de racha que nunca ganó (claimStreakTier).
    function streakFieldsUnchanged() {
      return request.resource.data.get('bestStreak', null) == resource.data.get('bestStreak', null)
          && request.resource.data.get('currentStreak', null) == resource.data.get('currentStreak', null);
    }
    // scorerBet.status/payout los pone SOLO el agente al liquidar (settleScorerBets).
    // El cliente puede crear/reemplazar su apuesta mientras siga 'open' (elegir
    // o cambiar jugador), o marcarla 'claimed' sin tocar status/payout — pero
    // nunca fabricar un 'won' con premio directo vía Firestore.
    function scorerBetOk() {
      return !('scorerBet' in request.resource.data.diff(resource.data).affectedKeys())
        || request.resource.data.scorerBet == null
        || request.resource.data.scorerBet.status == 'open'
        || (resource.data.get('scorerBet', null) != null
            && resource.data.scorerBet.status == 'won'
            && resource.data.scorerBet.claimed == false
            && request.resource.data.scorerBet.claimed == true
            && request.resource.data.scorerBet.status == resource.data.scorerBet.status
            && request.resource.data.scorerBet.payout == resource.data.scorerBet.payout);
    }
    // champClaim_{stage} (r32/r16/qf/sf/final): el agente deja {pts, claimed:false}
    // al pagar el premio "campeón por ronda"; el cliente SOLO puede voltear
    // claimed a true sin tocar pts, igual que scorerBetOk.
    function champClaimOk(field) {
      return !(field in request.resource.data.diff(resource.data).affectedKeys())
        || (resource.data.get(field, null) != null
            && resource.data[field].claimed == false
            && request.resource.data[field].claimed == true
            && request.resource.data[field].pts == resource.data[field].pts);
    }
    match /users/{uid} {
      allow read:   if signedIn();
      allow create: if signedIn() && request.auth.uid == uid;
      // el dueño edita su perfil (sin poder fabricar racha, goleador o premio
      // de campeón directo); un admin de un equipo puede asignar a alguien a ESE equipo (aprobar)
      allow update: if signedIn() && (
                      (request.auth.uid == uid && streakFieldsUnchanged() && scorerBetOk()
                        && champClaimOk('champClaim_r32') && champClaimOk('champClaim_r16')
                        && champClaimOk('champClaim_qf') && champClaimOk('champClaim_sf')
                        && champClaimOk('champClaim_final'))
                      || (request.resource.data.groupId != null && isTeamAdmin(request.resource.data.groupId)));
      allow delete: if signedIn() && request.auth.uid == uid;
    }
    match /groups/{gid} {
      allow read:   if signedIn();
      // cualquiera crea un equipo, pero debe incluirse a sí mismo como admin
      allow create: if signedIn() && request.auth.token.email.lower() in request.resource.data.adminEmails;
      allow update, delete: if isTeamAdmin(gid);
    }
    match /joinRequests/{rid} {
      allow read:   if signedIn() && (resource.data.uid == request.auth.uid || isTeamAdmin(resource.data.groupId));
      allow create: if signedIn() && request.resource.data.uid == request.auth.uid;
      allow delete: if signedIn() && (resource.data.uid == request.auth.uid || isTeamAdmin(resource.data.groupId));
    }
    // Cuotas por partido (las carga el agente). Lectura libre para apostar.
    // TEMP: escritura abierta a logueados para pruebas; con el agente se
    // restringe solo al service account.
    match /odds/{mid} {
      allow read:  if signedIn();
      allow write: if signedIn();
    }
    // Fixtures dinámicos (octavos, cuartos, semis, final) descubiertos por el
    // agente. Solo lectura para usuarios autenticados.
    match /fixtures/{fid} {
      allow read: if signedIn();
    }
    // Apuestas: cada quien crea/edita/borra las suyas. El agente liquida.
    // (resource == null permite leer un doc que aún no existe: necesario para
    //  la transacción de placeBet al apostar por primera vez en un partido.)
    match /bets/{bid} {
      allow read:                   if signedIn() && (resource == null || resource.data.uid == request.auth.uid);
      allow create, update:         if signedIn() && request.resource.data.uid == request.auth.uid;
      allow delete:                 if signedIn() && resource.data.uid == request.auth.uid;
    }
    // Metadatos públicos calculados por el agente (consenso de apuestas,
    // actividad reciente). Solo lectura: el agente escribe con el service
    // account, que se salta las reglas.
    match /meta/{id} {
      allow read: if signedIn();
    }
    match /parlays/{id} {
      allow read:   if signedIn() && resource.data.uid == request.auth.uid;
      allow create: if signedIn() && request.resource.data.uid == request.auth.uid;
      allow delete: if signedIn() && resource.data.uid == request.auth.uid;
    }
    match /predictions/{pid} {
      allow read:  if signedIn();
      allow write: if signedIn() && request.resource.data.uid == request.auth.uid;
    }
    // Desafíos por partido (challenge_picks). ID = uid_matchId_q1|q2|...
    // El agente (Admin SDK, se salta las reglas) es el único que puede poner
    // status:'won'/'lost' + payout al liquidar. El cliente solo puede:
    //  · crear/reemplazar su respuesta mientras el doc no exista o siga 'open'
    //  · marcar 'claimed' en un doc ya 'won', sin tocar status ni payout
    // Así nadie puede escribirse un desafío ganado directo por Firestore.
    match /challenge_picks/{id} {
      allow read:   if signedIn() && (resource == null || resource.data.uid == request.auth.uid);
      allow create: if signedIn() && request.resource.data.uid == request.auth.uid
                      && request.resource.data.status == 'open'
                      && request.resource.data.claimed == false;
      allow update: if signedIn() && resource.data.uid == request.auth.uid
                      && ((resource.data.status == 'open'
                           && request.resource.data.uid == request.auth.uid
                           && request.resource.data.status == 'open')
                          || (resource.data.status == 'won'
                              && resource.data.claimed == false
                              && request.resource.data.claimed == true
                              && request.resource.data.status == resource.data.status
                              && request.resource.data.payout == resource.data.payout));
    }
    // Pronóstico de semifinalistas (histórico — el pick real vive en
    // users/{uid}.semiPick desde v269; esta regla queda por si se usa a futuro).
    match /semi_picks/{uid} {
      allow read:           if signedIn() && request.auth.uid == uid;
      allow create, update: if signedIn() && request.auth.uid == uid;
    }
    // Álbum de figuritas COMPARTIDO por equipo (co-op). Aparte de las apuestas.
    // Desbloqueado: cualquier integrante edita o pone candado.
    // Bloqueado: nadie edita; SOLO quien lo puso (lockedBy) puede quitar el candado.
    match /figuritasAlbums/{gid} {
      allow read:   if albumMember(gid);
      allow create: if albumMember(gid);
      allow update: if albumMember(gid) && (
                       resource.data.get('locked', false) == false
                       || (resource.data.lockedBy == request.auth.uid
                           && request.resource.data.get('locked', false) == false)
                     );
    }
  }
}
```

**⚠️ Este cambio de reglas es importante para la equidad del juego** (cierra un
hueco donde cualquiera podía inflar su racha o fabricar un desafío/goleador
"ganado" escribiendo directo a Firestore desde la consola del navegador) —
hay que publicarlo a mano en cuanto puedas, con el mismo paso de arriba.

> Modelo nuevo: **no hay un admin global**. Cada equipo tiene su lista `adminEmails`
> (el creador entra ahí, y puede agregar más correos como admins desde "Mis equipos").

## Cómo se usa
1. Inicia sesión con tu correo admin (`ia.garcia.providel@gmail.com`) → aparece el botón **🔐 Admin** (abajo a la izquierda).
2. En el panel: **crea equipos** (Familia, Amigos…). Cada equipo recibe un **código** que puedes copiar y compartir.
3. La persona entra con **su correo** (cualquier dominio) + enlace de confirmación. En su primer ingreso ve **"Elige tu equipo"**: pega el **código** que le diste, o lo elige de la **lista**.
4. Queda en ese equipo (uno solo). Tú (admin) ves quién se unió a cada equipo, y a cada usuario le aparece su equipo en el perfil.
