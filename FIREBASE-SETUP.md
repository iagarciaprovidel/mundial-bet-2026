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
2. En el panel: **crea grupos** (Familia, Amigos…) y **agrega los correos** de cada persona.
3. Cuando esa persona entre (con Google o con su correo + enlace de confirmación), queda **asignada a su grupo** automáticamente. Su grupo aparece junto a su nombre.
