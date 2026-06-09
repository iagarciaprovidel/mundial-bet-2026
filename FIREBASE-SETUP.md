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
Firestore Database → **Rules** → pega esto y publica:

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
    match /users/{uid} {
      allow read:   if signedIn();
      allow create: if signedIn() && request.auth.uid == uid;
      // el dueño edita su perfil; un admin de un equipo puede asignar a alguien a ESE equipo (aprobar)
      allow update: if signedIn() && (request.auth.uid == uid
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
    // Apuestas: cada quien crea/edita/borra las suyas. El agente liquida.
    // (resource == null permite leer un doc que aún no existe: necesario para
    //  la transacción de placeBet al apostar por primera vez en un partido.)
    match /bets/{bid} {
      allow read:                   if signedIn() && (resource == null || resource.data.uid == request.auth.uid);
      allow create, update:         if signedIn() && request.resource.data.uid == request.auth.uid;
      allow delete:                 if signedIn() && resource.data.uid == request.auth.uid;
    }
    match /predictions/{pid} {
      allow read:  if signedIn();
      allow write: if signedIn() && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

> Modelo nuevo: **no hay un admin global**. Cada equipo tiene su lista `adminEmails`
> (el creador entra ahí, y puede agregar más correos como admins desde "Mis equipos").

## Cómo se usa
1. Inicia sesión con tu correo admin (`ia.garcia.providel@gmail.com`) → aparece el botón **🔐 Admin** (abajo a la izquierda).
2. En el panel: **crea equipos** (Familia, Amigos…). Cada equipo recibe un **código** que puedes copiar y compartir.
3. La persona entra con **su correo** (cualquier dominio) + enlace de confirmación. En su primer ingreso ve **"Elige tu equipo"**: pega el **código** que le diste, o lo elige de la **lista**.
4. Queda en ese equipo (uno solo). Tú (admin) ves quién se unió a cada equipo, y a cada usuario le aparece su equipo en el perfil.
