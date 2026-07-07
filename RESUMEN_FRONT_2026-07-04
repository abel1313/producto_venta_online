# Cambios para el front — 2026-07-04

Todo el detalle técnico (request/response completo) está en `CAMBIOS_FRONT.md`, secciones
finales (`[SEC-KEY-01]`, `[BUG-KEY-11]`, "Reseteo de contraseña por ADMIN"). Este es el resumen
ejecutable.

## 1. Login — manejar el nuevo 403 de "correo sin verificar"

`POST /v1/auth/login` ahora puede responder, además de lo que ya conocías:

- `403` con body `"Debes verificar tu correo antes de iniciar sesión"` → NO mostrar error
  genérico, NO guardar token. Ir a la pantalla de código (la misma de F-19/registro):
  1. Disparar `POST /v1/auth/enviar-codigo-verificacion { "userName": "..." }`
  2. Usuario escribe el código de 6 dígitos
  3. `POST /v1/auth/verificar-correo { "userName": "...", "codigo": "..." }`
  4. Si responde 200, volver a llamar `POST /v1/auth/login` con el mismo usuario/contraseña —
     recién ahí entra al sistema.
- `401` y `429` siguen igual que siempre, sin cambios de tu lado (antes tenían un bug donde a
  veces salía el 403 de arriba en vez del 401 correcto — ya está corregido en el back, no
  requiere nada de ti).
- Rol `ADMIN` nunca recibe este 403, entra directo sin verificar correo.

## 2. Login — nuevo campo `debeCambiarPassword`

La respuesta 200 del login ahora es:
```json
{ "accessToken": "...", "debeCambiarPassword": true }
```
Si viene `true`, no dejar navegar al sistema — forzar pantalla de "cambia tu contraseña" (usa
`PUT /v1/auth/cambiar-password`, pidiendo como "actual" la que el usuario acaba de usar para
loguearse). Esto pasa cuando un admin le reseteó la contraseña (ver punto 3).

## 3. Panel de Usuarios (admin) — botón nuevo "Resetear contraseña"

```
PUT /v1/usuarios/{id}/resetear-password
```
- Solo ADMIN. **`{id}` va en la URL (path variable), no en el body — no se manda body en esta
  petición**, tal cual ya lo estabas probando (`/v1/usuarios/46/resetear-password`).
- Responde `200` con `{ "data": "aB3dEfG9", "mensaje": "..." }` — `data` es la contraseña nueva
  generada al azar. **Hay que mostrarla en pantalla al admin** (no se puede volver a consultar
  después) para que se la dé al usuario.

> **[BUG-KEY-12] ✅ Fix (2026-07-04):** al probar este endpoint el response llegaba vacío
> (`{ mensaje: null, code: 0, data: null, lista: null }`) pese a responder `200`. Era un bug
> preexistente en `ResponseGeneric` (clase usada en todo el back): su constructor de 2 argumentos
> solo llenaba los campos en el caso de error, nunca en el de éxito con datos reales — nadie lo
> había notado porque hasta ahora todos los demás usos pasaban `null` a propósito. Ya corregido y
> subido a `dev`/`qa`. Cuando se redespliegue QA, este endpoint ya debe traer la contraseña en
> `data` correctamente.

## 4. Panel de Usuarios (admin) — verificar correo de un usuario

No es endpoint nuevo, ya existen y son públicos:
```
POST /v1/auth/enviar-codigo-verificacion   { "userName": "..." }
POST /v1/auth/verificar-correo             { "userName": "...", "codigo": "..." }
```
Se pueden usar desde la pantalla de detalle de un usuario en el panel: botón "reenviar código" +
input para capturar el código que el usuario dicte por teléfono.

## 5. Restricciones nuevas — revisar qué pantallas llaman esto

Antes bastaba con estar logueado; ahora requieren ser ADMIN (dan `403` si no):
- Cualquier endpoint bajo `/v1/usuarios/**` (listar usuarios, editar usuario, roles, permisos,
  resetear contraseña).
- `GET /v1/clientes/buscar` (búsqueda de clientes por nombre).

Si alguna pantalla que NO es del panel admin llegaba a llamar alguno de estos, hay que quitarle
esa llamada — ya no va a funcionar para usuarios normales.

## 6. Clientes — sin cambios si ya mandabas tu propio id

`POST /v1/clientes/save`, `PUT /v1/clientes/update/{id}` y
`GET /v1/clientes/buscarPorIdCliente/{id}` ahora rechazan con `403` si el `usuario.id`/`idCliente`
de la petición no es el del usuario logueado (antes se permitía por error). Si el front siempre
mandó el id propio, no hay nada que cambiar. El admin sigue pudiendo operar sobre cualquier
cliente sin restricción.
