# Plan — Permisos por pantalla (quién puede ver/hacer qué en el admin)

> Documento de **análisis**, no de implementación. Nada de esto está programado todavía —
> es la base para decidir el diseño antes de tocar código, tal como se pidió.

## 1. Lo que ya existe hoy (y no lo sabías que ya estaba)

Alguien —en otra sesión, antes de esta— ya dejó construida **media solución** a nivel de base de
datos y backend. Nunca se conectó a nada, pero está ahí:

### Tablas y entidades ya creadas
```
usuario_modificacion (Usuario)
  └─ rol_usuario ────────► roles (Roles)          -- 1 rol por usuario
  └─ usuario_permiso ────► permisos (Permiso)      -- permisos EXTRA, aparte del rol

roles ── rol_permiso ──► permisos                  -- permisos base de cada rol
```

- **`Permiso`** (`entity/Permiso.java`) — fila = un nombre de permiso (`PRODUCTOS_LEER`, etc.)
- **`Roles`** (`entity/Roles.java`) — cada rol tiene un set de permisos base
- **`Usuario.permisosExtra`** — permisos individuales, *encima* de los que ya da el rol (esto es
  clave: ya existe el mecanismo de "a este usuario en particular, además de su rol, dale esto
  extra" que es justo lo que pediste — "poder dar permisos si yo quisiera")

### Catálogo de permisos ya sembrado (`static/querys.sql`)
Ya hay **22 permisos** con nomenclatura `MODULO_ACCION`, y **4 roles** con un set distinto cada
uno:

| Permiso | ROLE_ADMIN | ROLE_EMPLEADO | ROLE_CAJERO | ROLE_USUARIO |
|---|:---:|:---:|:---:|:---:|
| PRODUCTOS_LEER/CREAR/EDITAR/ELIMINAR | ✅ | LEER/CREAR/EDITAR | — | LEER |
| VARIANTES_LEER/CREAR/EDITAR | ✅ | ✅ | — | — |
| PEDIDOS_LEER/CREAR/EDITAR/ELIMINAR | ✅ | ✅ | LEER | LEER/CREAR |
| VENTAS_LEER/CREAR | ✅ | ✅ | — | — |
| CLIENTES_LEER/CREAR/EDITAR/ELIMINAR | ✅ | LEER/CREAR/EDITAR | — | — |
| MP_COBRAR | ✅ | ✅ | ✅ | — |
| GASTOS_GESTIONAR | ✅ | — | — | — |
| RIFAS_GESTIONAR | ✅ | — | — | — |
| USUARIOS_GESTIONAR | ✅ | — | — | — |
| IMAGENES_GESTIONAR | ✅ | ✅ | — | — |
| PAGOS_LEER | ✅ | ✅ | ✅ | — |

### Backend ya expone el CRUD completo (`UsuarioController.java`)
```
GET    /v1/usuarios/roles                        -- listar roles
GET    /v1/usuarios/permisos                      -- listar permisos
PUT    /v1/usuarios/{id}/rol/{rolId}              -- cambiar el rol de un usuario
POST   /v1/usuarios/{id}/permisos/{permisoId}     -- darle un permiso extra
DELETE /v1/usuarios/{id}/permisos/{permisoId}     -- quitarle un permiso extra
```
Todo esto **ya funciona** si lo llamas con Postman/curl ahora mismo.

### Lo que NO existe — el 50% que falta
1. **Nada en el back revisa estos permisos.** Busqué `hasAuthority` en todo el proyecto — cero
   resultados. Cada endpoint hoy solo pregunta "¿es ADMIN?" (`hasRole("ADMIN")`) o "¿está
   logueado?" — nunca "¿tiene el permiso `PEDIDOS_EDITAR`?". Los permisos viajan en el JWT
   (`Usuario.getAuthorities()` ya los mete ahí) pero nadie los lee del otro lado.
2. **El front no tiene ninguna pantalla para esto.** No hay ningún botón "cambiar rol" ni
   "asignar permiso" en la pantalla de Usuarios — busqué las 4 llamadas del backend de arriba en
   todo el código Angular y no aparecen en ningún lado.
3. **No existe el concepto de "pantalla".** Lo que tienes son permisos de *acción sobre datos*
   (`PRODUCTOS_LEER`), no de *visibilidad de ruta*. Hoy qué pantallas aparecen en el menú lo
   decide un array fijo en el código (`GROUP_ROUTES` en `navbar.component.ts`) y cada ruta tiene
   un guard hardcodeado (`AuthGuard`, `AdminGuardGuard`) — binario: o eres ADMIN o no, nada más
   fino que eso.

## 2. El problema que señalaste, con un ejemplo real de tu propio catálogo

Dijiste: *"resulta que ese permiso también sirve para otra pantalla que a la mejor no quiero que
veas"*. Es un riesgo real y concreto con lo que ya existe. Ejemplo con tus propios permisos:

`PRODUCTOS_LEER` es un permiso de **acción sobre datos** ("puede leer productos"). Si mañana
decidieras usar ESE MISMO permiso para decidir qué pantallas mostrar, tendría que dárselo a
cualquier pantalla que necesite leer productos — y en tu sistema eso incluye la "Búsqueda de
productos" normal, pero también "Carga rápida de imágenes", "Reportes", el buscador dentro de
"Armar promoción", etc. Si le das `PRODUCTOS_LEER` a un cajero solo para que vea el buscador
simple, sin querer también le abrirías (si esas otras pantallas se gatean con el mismo permiso)
acceso a pantallas que nunca quisiste que tocara.

**La causa raíz:** estás mezclando dos preguntas distintas bajo un solo concepto:
- *"¿Puede este usuario **hacer** X sobre los datos?"* (leer/crear/editar/borrar — nivel API)
- *"¿Puede este usuario **ver** esta pantalla en su menú?"* (nivel ruta/UI)

Son cosas relacionadas pero no son la misma cosa, y una pantalla puede necesitar varios permisos
de acción por dentro (para distintas llamadas que hace), y un mismo permiso de acción puede ser
necesario en varias pantallas sin relación entre sí. Intentar resolver "visibilidad de pantalla"
reutilizando directamente el catálogo de permisos de acción es exactamente lo que te va a causar
el problema que describes.

## 3. Diseño propuesto — separar las dos cosas

**No tocar el sistema de `Permiso` que ya existe** (autorización de acciones). En vez de
reutilizarlo, se agrega un concepto **nuevo y paralelo**, mismo patrón exacto que ya usa el
proyecto para permisos — así que aplica igual a `Pantalla` (Fase 1, front) como a `Permiso`
(Fase 2, back — ver sección 6):

```
NUEVA: Pantalla (id, clave, nombre, ruta, grupo, orden)

NUEVA: rol_pantalla     (rol_id, pantalla_id)                       -- pantallas base del rol
NUEVA: usuario_pantalla (usuario_id, pantalla_id, concedido BOOLEAN) -- excepcion por usuario
```

Cada `Pantalla` es autocontenida: no depende de qué permisos de acción use por dentro, así que
asignarla a un usuario nunca "contamina" el acceso a otra pantalla sin relación.

### Excepciones por usuario — agregar Y quitar (decidido: sí hace falta quitar)

`usuario_pantalla` no es solo "extra" como `usuario_permiso` hoy — lleva una columna
`concedido` (true/false) para poder tanto **sumar** una pantalla que el rol no da, como
**restar** una que el rol sí daría por defecto:

```
pantallas_efectivas(usuario) =
    ( pantallas_del_rol(usuario)
      ∪ { p : usuario_pantalla(usuario, p, concedido=true)  } )
    − { p : usuario_pantalla(usuario, p, concedido=false) }
```

Ejemplo real de lo que pediste: "es EMPLEADO pero a este en particular no le den Reportes" → una
fila `usuario_pantalla(ese_usuario, Reportes, concedido=false)`, sin tocar el rol EMPLEADO para
nadie más.

### Gestión de roles — el admin va a poder crear roles nuevos, no solo asignar los 4 que ya existen

Aclaraste el punto 3: no es que cada usuario se configure 100% individual sin rol, sino que
**vas a poder crear tus propios roles desde una pantalla nueva de administración** (ej. crear
"ROL EMPLEADO" o cualquier otro nombre) y ahí marcar, con checkboxes, qué pantallas puede ver ese
rol y (en la Fase 2, ver abajo) qué acciones puede hacer. Los 4 roles ya sembrados
(ADMIN/EMPLEADO/CAJERO/USUARIO) dejan de ser una lista fija en el código — pasan a ser datos
editables en esa pantalla, igual que cualquier otro catálogo del sistema. **Corrección tras
revisar el código:** hoy el backend solo tiene `GET /v1/usuarios/roles` (listar) — no existe
todavía ningún endpoint para crear/editar/borrar un rol ni para asignarle pantallas/permisos, así
que esa pantalla de "Gestión de roles" necesita su propio controller nuevo (CRUD de `Roles` +
endpoints para marcar sus pantallas y permisos), no es algo que ya esté armado. Un usuario nuevo
se crea eligiendo uno de esos roles (los 4 actuales u otro que se haya creado después) y hereda
automáticamente su set de pantallas.

### De dónde sale el catálogo inicial de pantallas
No hay que inventarlo — ya existe, hardcodeado en `navbar.component.ts`
(`GROUP_ROUTES`), con ~30 rutas ya agrupadas en 8 categorías (misproductos, pedidos, ventas,
analitica, rifas, flores, imagenes, sistema). Ese array se convierte directo en las filas
semilla de la tabla `Pantalla` — es trabajo de trasladar un catálogo que ya está bien pensado,
no de diseñarlo desde cero.

### Cómo lo consume el front
- El JWT ya lleva roles y permisos (`Usuario.getAuthorities()`); se le agregan las claves de
  `Pantalla` que el usuario tiene, mismo mecanismo.
- Un guard genérico nuevo (`PantallaGuard`) reemplaza los guards hardcodeados por ruta — revisa
  "¿esta ruta está en las pantallas del usuario?" en vez de "¿es ADMIN?".
- El menú (`navbar.component.ts`) deja de usar el array fijo `GROUP_ROUTES` y arma los grupos
  dinámicamente a partir de las pantallas que sí tiene el usuario — un ítem sin permiso
  simplemente no se pinta, en vez de estar pero fallar al hacer clic.

## 4. Cómo migrar sin romper nada de golpe (lo que pediste explícitamente)

1. **ROLE_ADMIN recibe automáticamente TODAS las pantallas** — ya es su comportamiento actual (ve
   todo), solo hay que preservarlo al sembrar `rol_pantalla`.
2. **Los usuarios/roles que ya existen (EMPLEADO/CAJERO/USUARIO) heredan como línea base
   exactamente lo que hoy pueden ver** — antes de programar, hay que mapear "qué guard tiene cada
   ruta hoy" contra "qué rol debería tener esa pantalla", para que nadie pierda ni gane acceso el
   día que esto se active. Es un trabajo de mapeo 1 vez, no de diseño nuevo.
3. Un usuario nuevo se crea con su rol de siempre → hereda ese set base automáticamente, sin tener
   que configurar nada a mano cada vez (tal como pediste: *"que tenga los permisos solo lo que
   tiene actualmente"*).
4. El admin, desde la pantalla de Usuarios, podría agregar/quitar pantallas puntuales a un
   usuario individual sin tocar su rol — igual que ya existe hoy para `permisosExtra`.

## 5. Decisiones ya cerradas contigo

1. **Alcance: los dos, en 2 fases.** Primero pantallas/menú (front), después permisos de acción
   exigidos de verdad en el backend — pero el modelo de datos se diseña completo desde ahora para
   que la Fase 2 no obligue a rehacer nada de la Fase 1 (ver roadmap, sección 6).
2. **Excepciones: agregar Y quitar.** `usuario_pantalla` lleva la columna `concedido` (sección 3).
3. **Roles como plantilla, con gestión propia.** Los usuarios se crean con un rol; el admin va a
   poder crear/editar roles nuevos desde una pantalla dedicada (sección 3).
4. **Aplica en el próximo login**, igual que ya se comportan hoy los cambios de rol/permiso — sin
   trabajo extra de forzar cierre de sesión.

## 6. Roadmap en 2 fases

### Fase 1 — Pantallas (front) — la que se construye primero
1. Migración: tabla `pantallas` + `rol_pantalla` + `usuario_pantalla` (con `concedido`).
2. Semilla: volcar el catálogo de `GROUP_ROUTES` (navbar) a filas de `pantallas`, y armar
   `rol_pantalla` mapeando el guard actual de cada ruta contra cada rol existente (para que nadie
   pierda ni gane acceso al activarse).
3. Backend: controller nuevo para `Pantalla` (CRUD básico) + endpoints para asignar/quitar
   pantalla a un rol y a un usuario (mismo patrón que ya existe para `permisosExtra`, agregando
   el flag `concedido`) + endpoint de "gestión de roles" (crear/editar rol, marcarle pantallas).
4. JWT: agregar las claves de `Pantalla` efectivas del usuario (mismo lugar donde ya van roles y
   permisos).
5. Front: `PantallaGuard` genérico reemplazando `AuthGuard`/`AdminGuardGuard` ruta por ruta; menú
   dinámico en vez de `GROUP_ROUTES` fijo; pantalla nueva de "Gestión de roles" (crear rol,
   marcar sus pantallas) y ampliar la pantalla de Usuarios (cambiar rol, agregar/quitar pantallas
   extra a un usuario individual).

### Fase 2 — Permisos de acción (backend) — después, cuando la Fase 1 esté probada
1. Mismo mecanismo (`concedido` en `usuario_permiso`, hoy es solo "extra" — se le agrega la misma
   columna) para poder también quitarle a un usuario un permiso de acción que su rol daría.
2. Revisar controller por controller (son ~50, ver `AbstractController`) qué `Permiso` de los 22
   ya sembrados le corresponde a cada endpoint de escritura, y reemplazar los `hasRole("ADMIN")`
   genéricos por `hasAuthority("PRODUCTOS_EDITAR")` puntuales donde aplique — trabajo grande,
   controller por controller, no se hace de un tirón.
3. La misma pantalla de "Gestión de roles" del front se amplía para marcar también permisos de
   acción por rol (checkboxes de LEER/CREAR/EDITAR/ELIMINAR por módulo), reusando el catálogo de
   22 permisos que ya existe.

No se empieza la Fase 2 hasta que la Fase 1 esté funcionando y probada en QA — son dos entregas
separadas, no un solo cambio gigante.
