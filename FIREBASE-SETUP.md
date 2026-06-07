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
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email in ['ia.garcia.providel@gmail.com'];
    }
    // Perfiles de usuario
    match /users/{uid} {
      allow read:          if request.auth != null && (request.auth.uid == uid || isAdmin());
      allow create, update: if request.auth != null && request.auth.uid == uid;
      allow delete:        if isAdmin();
    }
    // Grupos: cualquier usuario autenticado puede leerlos (para auto-asignarse
    // a su grupo por correo); solo el ADMIN crea / edita / borra.
    match /groups/{gid} {
      allow read:                  if request.auth != null;
      allow create, update, delete: if isAdmin();
    }
    // Predicciones (ya existente)
    match /predictions/{pid} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

> Si agregas más admins, edítalos en **dos** lugares: la lista `request.auth.token.email in [...]`
> de estas reglas **y** `window.MB_ADMIN_EMAILS` en `firebase-config.js`.

## Cómo se usa
1. Inicia sesión con tu correo admin (`ia.garcia.providel@gmail.com`) → aparece el botón **🔐 Admin** (abajo a la izquierda).
2. En el panel: **crea equipos** (Familia, Amigos…). Cada equipo recibe un **código** que puedes copiar y compartir.
3. La persona entra con **su correo** (cualquier dominio) + enlace de confirmación. En su primer ingreso ve **"Elige tu equipo"**: pega el **código** que le diste, o lo elige de la **lista**.
4. Queda en ese equipo (uno solo). Tú (admin) ves quién se unió a cada equipo, y a cada usuario le aparece su equipo en el perfil.
