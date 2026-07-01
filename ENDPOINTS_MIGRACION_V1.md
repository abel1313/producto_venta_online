# Migración de versionado de URLs a /v1/ — 2026-06-07

> Documento único con TODOS los endpoints (URL LOCAL COMPLETA, lista para que el front la use) donde se agregó/renombró a `/v1/`, tanto en **proyecto-key (puerto 9091)** como en **micro_imagenes (puerto 9096)**.

⚠️ **Importante:** estos cambios ya están en el código (commits en `dev` y `qa` de ambos repos, ya pusheados, ambos compilan sin errores). Si al probar todavía ves URLs con `/v2/` o sin versión, es porque el **servidor que estás consultando (Docker/QA en ejecución) todavía no se reinició/redesplegó** con el código nuevo — el cambio es de código fuente, no de configuración en caliente. Hay que reconstruir y reiniciar ambos microservicios para verlo reflejado.

Host base local de ambos servicios: `http://localhost:<puerto>/mis-productos/...`
- proyecto-key → `http://localhost:9091/mis-productos/...`
- micro_imagenes → `http://localhost:9096/mis-productos/...`

---

## 0. Resto de controladores de proyecto-key — prefijo `/v1/` agregado al path base — 2026-06-08

A diferencia de `ImageneController`/`ImagenPresentacionController`/`VarianteController` (que ya tenían pares `v2`/deprecado y se versionaron por método, ver sección 1), el resto de controladores **no tenía versión** en su `@RequestMapping` base. Se les agregó el prefijo `/v1/` directamente al path del controlador (sin crear una versión deprecada paralela, porque no existía nada que mantener compatible):

| Controlador | Antes | Ahora |
|---|---|---|
| `AdminController` | `/admin` | `/v1/admin` |
| `AdminReconciliacionController` | `/admin/reconciliacion/imagenes` | `/v1/admin/reconciliacion/imagenes` |
| `AuthController` | `/auth` | `/v1/auth` |
| `ChatbotController` | `/chatbot` | `/v1/chatbot` |
| `ClienteControllerImpl` | `clientes` | `/v1/clientes` |
| `ConcursanteControllerImpl` | `concursante` | `/v1/concursante` |
| `ConfigurarRifaControllerImpl` | `configurarRifa` | `/v1/configurarRifa` |
| `ConfigurarRifaVarianteController` | `/configurarRifaVariante` | `/v1/configurarRifaVariante` |
| `DopoMexController` | `dipomex` | `/v1/dipomex` |
| `GanadorRifaControllerImpl` | `ganadorRifa` | `/v1/ganadorRifa` |
| `GastosControllerImpl` | `gastos` | `/v1/gastos` |
| `MercadoPagoController` | `/mp` | `/v1/mp` |
| `NegocioController` | `/negocio` | `/v1/negocio` |
| `PagosCatalogoController` | `pagos` | `/v1/pagos` |
| `PalabraClaveController` | `palabras-clave` | `/v1/palabras-clave` |
| `PedidoController` | `pedidos` | `/v1/pedidos` |
| `ProductosControllerImpl` | `productos` | `/v1/productos` |
| `PruebaControllerImpl` | `productos-eje/` | `/v1/productos-eje/` |
| `RifaControllerImpl` | `rifa` | `/v1/rifa` |
| `SubirDocumentosController` | `/documentos` | `/v1/documentos` |
| `UsuarioController` | `usuarios` | `/v1/usuarios` |
| `VentaControllerImpl` | `ventas` | `/v1/ventas` |

⚠️ **No son rutas paralelas/compatibles**: el `@RequestMapping` se reemplazó, así que las URLs viejas (sin `/v1/`) dejan de existir (404). El front debe actualizar TODAS las llamadas a estos controladores agregando `/v1/` antes del segmento del recurso, ej: `http://localhost:9091/mis-productos/auth/login` → `http://localhost:9091/mis-productos/v1/auth/login`.

**Ajustes adicionales necesarios para que esto funcione (ya aplicados):**
- `SecurityConfig.java`: todos los `requestMatchers` que apuntaban a `/admin/**`, `/auth/**`, `/productos/**`, `/usuarios/**`, etc. se actualizaron a `/v1/admin/**`, `/v1/auth/**`, `/v1/productos/**`, `/v1/usuarios/**`, etc. (si no se actualizaban, las reglas de seguridad dejaban de coincidir con las URLs nuevas y todo caía en `anyRequest().authenticated()`, rompiendo tanto los endpoints públicos como los protegidos). De paso se agregó `/v1/configurarRifaVariante/**` al grupo de rifas (antes no calzaba con `/configurarRifa/**` y quedaba sin proteger explícitamente).
- `AuthController.java`: el path de la cookie `refreshToken` (`agregarRefreshCookie` / `limpiarRefreshCookie`) se actualizó de `${contextPath}/auth` a `${contextPath}/v1/auth`. Si no se actualizaba, el navegador no habría enviado la cookie en `/v1/auth/refresh` (el path de la cookie ya no coincidía con el path del endpoint) y el refresh del token habría fallado.
- `OpenApiConfig.java`: se corrigió la descripción del esquema de seguridad Bearer para referenciar `/v1/auth/login` en lugar de `/auth/login`.

`ImageneController`, `ImagenPresentacionController` y `VarianteController` **no se tocaron** en este paso: ya tienen su propio versionado por método (`/imagen/v1/...`, `/presentacion/v1/...`, `/variantes/...` con sub-rutas `v1`/`v3`, ver secciones 1 y siguientes), y agregarles `/v1/` al path base hubiera duplicado el prefijo (`/v1/imagen/v1/...`).

---

## 1. proyecto-key — `http://localhost:9091/mis-productos/...`

Estos endpoints YA EXISTÍAN como pares "antiguo sin versión" + "v2". Se renombraron así:
- El que el front usa hoy como **v2** → ahora es **`/v1/`** (versión activa/estable — ESTA es la que debe consumir el front)
- El antiguo sin versión (marcado `@Deprecated`) → ahora es **`/v3/`** (sigue vivo por compatibilidad, NO usar)

### Controlador `ImageneController` (`/imagen`)

| # | Método | URL ACTIVA (front debe usar) | URL deprecada (no usar) |
|---|---|---|---|
| 1 | GET | `http://localhost:9091/mis-productos/imagen/v1/{productoId}` | `http://localhost:9091/mis-productos/imagen/v3/{id}` |
| 2 | GET | `http://localhost:9091/mis-productos/imagen/v1/{productoId}/detalle` | `http://localhost:9091/mis-productos/imagen/v3/{id}/detalle` |
| 3 | GET | `http://localhost:9091/mis-productos/imagen/v1/file/{imagenId}` | `http://localhost:9091/mis-productos/imagen/v3/file/{imagenId}` |
| 4 | GET | `http://localhost:9091/mis-productos/imagen/v1/{idProducto}/imagenes` | `http://localhost:9091/mis-productos/imagen/v3/{idProducto}/imagenes` |
| 5 | DELETE | `http://localhost:9091/mis-productos/imagen/v1/{idImagen}` | `http://localhost:9091/mis-productos/imagen/v3/{idImagen}` |
| 6 | DELETE | `http://localhost:9091/mis-productos/imagen/v1/{productoId}/imagenes` | `http://localhost:9091/mis-productos/imagen/v3/{productoId}/imagenes` |
| 7 | DELETE | `http://localhost:9091/mis-productos/imagen/v1/producto` | `http://localhost:9091/mis-productos/imagen/v3/producto` |
| 8 | GET | `http://localhost:9091/mis-productos/imagen/v1/cache/limpiar` | `http://localhost:9091/mis-productos/imagen/v3/cache/imagen/limpiar` |

### Controlador `ImagenPresentacionController` (`/presentacion`)

| # | Método | URL ACTIVA (front debe usar) | URL deprecada (no usar) |
|---|---|---|---|
| 9 | GET | `http://localhost:9091/mis-productos/presentacion/v1/imagenes` | `http://localhost:9091/mis-productos/presentacion/v3/imagenes` |
| 10 | GET | `http://localhost:9091/mis-productos/presentacion/v1/imagenes/{id}/imagen` | `http://localhost:9091/mis-productos/presentacion/v3/imagenes/{id}/imagen` |
| 11 | GET | `http://localhost:9091/mis-productos/presentacion/v1/imagenes/todas` | `http://localhost:9091/mis-productos/presentacion/v3/imagenes/todas` |
| 12 | PUT | `http://localhost:9091/mis-productos/presentacion/v1/imagenes/{id}` | `http://localhost:9091/mis-productos/presentacion/v3/imagenes/{id}` |

### Controlador `VarianteController` (`/variantes`)

| # | Método | URL ACTIVA (front debe usar) | URL deprecada (no usar) |
|---|---|---|---|
| 13 | GET | `http://localhost:9091/mis-productos/variantes/v1/imagenes/{varianteId}` | `http://localhost:9091/mis-productos/variantes/v3/imagenes/{varianteId}` |
| 14 | DELETE | `http://localhost:9091/mis-productos/variantes/v1/imagenes` | `http://localhost:9091/mis-productos/variantes/v3/imagenes` |
| 15 | DELETE | `http://localhost:9091/mis-productos/variantes/v1/{varianteId}/imagenes` | `http://localhost:9091/mis-productos/variantes/v3/{varianteId}/imagenes` |

#### ⚠️ Pendientes detectados — `VarianteController` tenía endpoints SIN versionar (corregido 2026-06-08)

Al revisar el avance, estos endpoints de `VarianteController` **no tenían ninguna versión** (no formaban parte de un par v2/deprecado, simplemente nunca se les agregó `/v1/`). Quedaban "sueltos" mientras el resto del controlador ya usaba `v1`/`v3`. Se les agregó el prefijo `/v1/` directamente (renombrado, igual que en la sección 0 — **no son rutas paralelas, las viejas dejan de existir**):

| # | Método | URL VIEJA (ya NO existe, 404) | URL NUEVA (front debe usar) |
|---|---|---|---|
| 16 | GET | `.../variantes/buscar` | `.../variantes/v1/buscar` |
| 17 | GET | `.../variantes/porProducto/{productoId}` | `.../variantes/v1/porProducto/{productoId}` |
| 18 | GET | `.../variantes/porProducto/{productoId}/paginado` | `.../variantes/v1/porProducto/{productoId}/paginado` |
| 19 | GET | `.../variantes/porProducto/{productoId}/paginado/resumen` | `.../variantes/v1/porProducto/{productoId}/paginado/resumen` |
| 20 | POST | `.../variantes/guardarConImagenes` | `.../variantes/v1/guardarConImagenes` |
| 21 | POST | `.../variantes/inicializarDesdeProducto` | `.../variantes/v1/inicializarDesdeProducto` |
| 22 | GET | `.../variantes/imagenes/{varianteId}/paginado` | `.../variantes/v1/imagenes/{varianteId}/paginado` |
| 23 | PUT | `.../variantes/imagenes/{varianteImagenId}/principal` | `.../variantes/v1/imagenes/{varianteImagenId}/principal` |
| 24 | GET | `.../variantes/admin/sin-stock` | `.../variantes/v1/admin/sin-stock` |
| 25 | GET | `.../variantes/admin/diagnostico-imagenes/{varianteId}` | `.../variantes/v1/admin/diagnostico-imagenes/{varianteId}` |

(prefijo de host completo: `http://localhost:9091/mis-productos`)

Ajuste relacionado en `SecurityConfig.java`: el matcher `GET /variantes/admin/**` (ADMIN-only) se amplió a `GET /variantes/admin/**, /variantes/v1/admin/**` para seguir protegiendo `sin-stock` y `diagnostico-imagenes` ahora que viven bajo `/v1/admin/...` (si no se agregaba, esas rutas hubieran caído en el matcher público `GET /variantes/**`).

#### Controladores SIN endpoints — no requieren versionado

`LotesProductosControllerImpl` (`@RequestMapping(name = "lote-producto")`) está vacío, sin métodos HTTP — no expone ningún endpoint, por lo tanto no aplica agregarle `/v1/`. Se deja documentado para que quede claro que no es un pendiente, sino un controlador sin implementar.

---

## 2. micro_imagenes — `http://localhost:9096/mis-productos/...`

Este servicio **no tenía ninguna versión** en sus rutas. Se agregó el prefijo `/v1/` a TODOS sus endpoints:

### Controlador `CacheController`

| # | Método | URL NUEVA (front debe usar) |
|---|---|---|
| 1 | DELETE | `http://localhost:9096/mis-productos/v1/cache/limpiar` |

### Controlador `ImagenController`

| # | Método | URL NUEVA (front debe usar) |
|---|---|---|
| 2 | POST | `http://localhost:9096/mis-productos/v1/imagenes` (multipart, campo `files`) |
| 3 | GET | `http://localhost:9096/mis-productos/v1/imagenes?ids=1,2,3` |
| 4 | GET | `http://localhost:9096/mis-productos/v1/imagenes/{id}` |
| 5 | GET | `http://localhost:9096/mis-productos/v1/imagenes/file/{imagenId}` |
| 6 | GET | `http://localhost:9096/mis-productos/v1/imagenes/verificar?ids=1,2,3` |
| 7 | DELETE | `http://localhost:9096/mis-productos/v1/imagenes?ids=1,2,3` |
| 8 | DELETE | `http://localhost:9096/mis-productos/v1/imagenes/disco?ids=a,b,c` |

### Controlador `ProductoImagenController`

| # | Método | URL NUEVA (front debe usar) |
|---|---|---|
| 9 | POST | `http://localhost:9096/mis-productos/v1/producto-imagen` |
| 10 | POST | `http://localhost:9096/mis-productos/v1/producto-imagen/saveAll` |
| 11 | PUT | `http://localhost:9096/mis-productos/v1/producto-imagen` |
| 12 | DELETE | `http://localhost:9096/mis-productos/v1/producto-imagen/{id}` |
| 13 | GET | `http://localhost:9096/mis-productos/v1/producto-imagen/{id}` |
| 14 | GET | `http://localhost:9096/mis-productos/v1/producto-imagen/buscarImagenProducto/{id}` |
| 15 | GET | `http://localhost:9096/mis-productos/v1/producto-imagen/listar/{productoId}?pagina=1&size=8` |
| 16 | POST | `http://localhost:9096/mis-productos/v1/producto-imagen/admin/limpiar-duplicados` |
| 17 | PUT | `http://localhost:9096/mis-productos/v1/producto-imagen/{id}/principal` |

---

## 3. Ejemplo concreto (el que dio el equipo)

```
Antes: http://localhost:9096/mis-productos/imagenes/file/7305237692097776164
Ahora: http://localhost:9096/mis-productos/v1/imagenes/file/7305237692097776164
```

```
Antes: http://localhost:9091/mis-productos/imagen/v2/file/{imagenId}
Ahora: http://localhost:9091/mis-productos/imagen/v1/file/{imagenId}
```

---

## 4. Dónde está el código de cada cambio

| Repo | Archivos modificados |
|---|---|
| **proyecto-key** (`dev` → `qa`, commits `f5fcd7b`/`6cf8115`/merge `4d440f5`) | `ImageneController.java`, `ImagenPresentacionController.java`, `VarianteController.java`, `SecurityConfig.java`, `ImagenPresentacionService.java`, `ProductoImagenServiceImpl.java`, `ProductosServiceImpl.java`, `VarianteServiceImpl.java`, `ImagenProductoClienteVPS.java`, `ImageneClienteDisco.java`, `ImagenPresentacionDto.java`, `IProductoImagenService.java` |
| **micro_imagenes** (`dev` → `qa`, commits `9ab81d9`/`cda95dc`/merge `79ef11e`) | `CacheController.java`, `ImagenController.java`, `ProductoImagenController.java`, `SecurityConfig.java`, `ProductoImagenService.java` |

Todos los `urlImagen` / `imagenUrl` que devuelven los listados (productos, variantes, presentación) **ya se generan con `/v1/` desde el backend** — el front no construye esas URLs, solo las consume tal cual llegan.

---

## 5. AUDITORÍA COMPLETA — 2026-07-01 (los 29 controladores de proyecto-key, método por método)

> Esta sección es la respuesta a "¿está completo este documento?". Las secciones 0-4 de arriba son
> la foto del día de la migración (2026-06-09) — correctas pero **no cubrían controladores creados
> después** (créditos/abonos, chat en vivo) ni endpoints agregados más tarde. Esta sección audita
> **el estado real del código hoy**, controlador por controlador. Host base:
> `http://localhost:9091/mis-productos` (dev) / equivalente en QA/prod.
>
> ⚠️ **No cubre `micro_imagenes`** (repo aparte) — para ese microservicio, la sección 2 arriba
> sigue siendo la referencia; no se auditó de nuevo en esta pasada.
>
> Convención: los que extienden `AbstractController` heredan además el CRUD genérico
> `DELETE {base}/delete`, `GET {base}/getAll`, `GET {base}/getOne/{tipoDato}`,
> `POST {base}/save`, `PUT {base}/update/{tipoDato}` (algunos lo sobre-escriben con su propio
> `save`/`update` personalizado, indicado en cada tabla).

### `AbonoController` — `/v1/abonos` — ⚠️ NO estaba en este documento (creado después de la migración)

| Método | URL |
|---|---|
| POST | `/v1/abonos/{pedidoId}` — registrar abono |
| GET | `/v1/abonos/{pedidoId}` — historial de abonos del pedido |
| GET | `/v1/abonos/reporte/estado-cuenta` |
| GET | `/v1/abonos/reporte/pagados` |
| GET | `/v1/abonos/reporte/cancelados` |
| PUT | `/v1/abonos/{pedidoId}/cancelar` |
| POST | `/v1/abonos/{pedidoIdOrigen}/transferir` |

### `AdminController` — `/v1/admin`

| Método | URL |
|---|---|
| DELETE | `/v1/admin/cache` |

### `AdminReconciliacionController` — `/v1/admin/reconciliacion/imagenes`

| Método | URL |
|---|---|
| POST | `/v1/admin/reconciliacion/imagenes` |
| POST | `/v1/admin/reconciliacion/imagenes/limpiar-bd` |
| GET | `/v1/admin/reconciliacion/imagenes/resultado` |

### `AuthController` — `/v1/auth`

| Método | URL |
|---|---|
| POST | `/v1/auth/login` |
| POST | `/v1/auth/refresh` |
| POST | `/v1/auth/logout` |
| POST | `/v1/auth/registrar` |
| GET | `/v1/auth/validar` |

### `ChatAdminController` — `/v1/chat` — ⚠️ NO estaba en este documento (chat creado después)

| Método | URL |
|---|---|
| GET | `/v1/chat/admin/sesiones` |
| GET | `/v1/chat/admin/historial/{sesionId}` |
| GET | `/v1/chat/historial/usuario/{usuarioId}` |
| GET | `/v1/chat/historial/cliente/{clienteId}` |
| GET | `/v1/chat/historial/{sesionId}` |
| POST | `/v1/chat/admin/cerrar/{sesionId}` |
| GET | `/v1/chat/version` |

### `ChatWebSocketController` — WebSocket STOMP, no HTTP REST — ⚠️ NO estaba en este documento

Handshake: `ws://.../mis-productos/ws` (SockJS/STOMP). Prefijo de app: `/app` (`ConfigSocket.java`).

| Cliente envía a | Server transmite a |
|---|---|
| `/app/chat.conectar` | — |
| `/app/chat.mensaje` | `/topic/chat.admin` + destino por usuario |
| `/app/chat.admin.responder` | `/topic/chat.admin` + destino por usuario |
| `/app/chat.admin.conectado` | — |

Detalle completo de payloads en `CHAT_FRONT_DEVELOPER.md` / `CHAT_EN_VIVO_FRONT.md` (no duplicado aquí).

### `ChatbotController` — `/v1/chatbot`

| Método | URL |
|---|---|
| POST | `/v1/chatbot/mensaje` |
| GET | `/v1/chatbot/buscar?q=&offset=` — ⚠️ agregado después de la migración (paginación sin IA) |

### `ClienteControllerImpl` — `/v1/clientes` — extiende `AbstractController` (con `save` propio)

| Método | URL |
|---|---|
| POST | `/v1/clientes/save` — propio, sobre-escribe el genérico |
| GET | `/v1/clientes/buscarPorIdCliente/{idCliente}` |
| GET | `/v1/clientes/buscar` |
| + CRUD genérico | `/v1/clientes/getAll`, `/v1/clientes/getOne/{tipoDato}`, `/v1/clientes/update/{tipoDato}`, `/v1/clientes/delete` |

### `ConcursanteControllerImpl` — `/v1/concursante` — extiende `AbstractController`

| Método | URL |
|---|---|
| POST | `/v1/concursante/registrar` |
| GET | `/v1/concursante/porRifa/{configurarRifaId}` |
| GET | `/v1/concursante/elegibles/{configurarRifaId}` |
| GET | `/v1/concursante/clientesPorMes?mes=` |
| POST | `/v1/concursante/importarDePedidos` |
| DELETE | `/v1/concursante/{id}` |
| POST | `/v1/concursante/copiarDeRifa` |
| PUT | `/v1/concursante/{id}` |
| + CRUD genérico | `/v1/concursante/getAll`, `/getOne/{tipoDato}`, `/save`, `/update/{tipoDato}`, `/delete` |

### `ConfigurarRifaControllerImpl` — `/v1/configurarRifa` — extiende `AbstractController`

| Método | URL |
|---|---|
| GET | `/v1/configurarRifa/activas` |
| GET | `/v1/configurarRifa/activas/hoy` |
| GET | `/v1/configurarRifa/buscar?desde=&hasta=&tipo=&mesReferencia=` |
| PUT | `/v1/configurarRifa/{id}` |
| PUT | `/v1/configurarRifa/{id}/esPrueba` |
| + CRUD genérico | `/v1/configurarRifa/save` (crear), `/getAll`, `/getOne/{tipoDato}`, `/delete` |

### `ConfigurarRifaVarianteController` — `/v1/configurarRifaVariante` — NO extiende AbstractController

| Método | URL |
|---|---|
| POST | `/v1/configurarRifaVariante/save` |
| GET | `/v1/configurarRifaVariante/porRifa/{rifaId}` |
| GET | `/v1/configurarRifaVariante/palabrasClave/{rifaId}` |
| DELETE | `/v1/configurarRifaVariante/{id}` |
| PUT | `/v1/configurarRifaVariante/{id}/palabraClave` |

### `DopoMexController` — `/v1/dipomex`

| Método | URL |
|---|---|
| GET | `/v1/dipomex/getCodigoPostal/{codigoPostal}` |

### `GanadorRifaControllerImpl` — `/v1/ganadorRifa` — extiende `AbstractController`

| Método | URL |
|---|---|
| POST | `/v1/ganadorRifa/sortear/{configurarRifaId}` |
| POST | `/v1/ganadorRifa/continuarVariante/{configurarRifaId}?modo=RESTANTES` |
| GET | `/v1/ganadorRifa/estado/{configurarRifaId}` |
| POST | `/v1/ganadorRifa/reiniciar/{configurarRifaId}?completo=false` |
| + CRUD genérico | heredado, uso limitado en este módulo |

### `GastosControllerImpl` — `/v1/gastos` — NO extiende AbstractController

| Método | URL |
|---|---|
| POST | `/v1/gastos/save` |
| GET | `/v1/gastos/buscar` |
| PUT | `/v1/gastos/{id}` |
| DELETE | `/v1/gastos/{id}` |
| GET | `/v1/gastos/reporte` |

### `ImagenPresentacionController` / `ImageneController`

Ya cubiertos en la sección 1 de este documento — sin cambios adicionales.

### `VarianteController` — 🆕 hueco real encontrado y corregido 2026-07-01

`VarianteController` extiende `AbstractController`, pero su `@RequestMapping` de clase es
`"variantes"` (sin `/v1/`). Sus métodos propios sí llevan `/v1/` a mano, pero los 5 métodos
**heredados** de `AbstractController` (`getAll`, `getOne/{tipoDato}`, `save`, `update/{tipoDato}`,
`delete`) no estaban sobreescritos, así que quedaban expuestos sin versión:
`/variantes/getAll`, `/variantes/save`, `/variantes/getOne/{tipoDato}`,
`/variantes/update/{tipoDato}`, `/variantes/delete`.

Se agregaron 5 métodos nuevos en `VarianteController.java` que delegan al `super.*` correspondiente,
con `/v1/`, **sin quitar los viejos** (mismo patrón v1/v3 del resto del archivo — el front debe
migrar a estos, los viejos siguen vivos por compatibilidad):

| Antes (sigue vivo, migrar) | Ahora (usar este) |
|---|---|
| GET `/variantes/getAll?page=&size=` | GET `/variantes/v1/getAll?page=&size=` |
| GET `/variantes/getOne/{tipoDato}` | GET `/variantes/v1/getOne/{tipoDato}` |
| POST `/variantes/save` | POST `/variantes/v1/save` |
| PUT `/variantes/update/{tipoDato}` | PUT `/variantes/v1/update/{tipoDato}` |
| DELETE `/variantes/delete` | DELETE `/variantes/v1/delete` |

`SecurityConfig.java` no necesitó cambios — los matchers ya usan wildcard (`/variantes/**`), cubren
las rutas nuevas con el mismo nivel de protección que las viejas.

### `LotesProductosControllerImpl` — sin endpoints (confirmado, ver sección 1)

### `MercadoPagoController` — `/v1/mp`

| Método | URL |
|---|---|
| POST | `/v1/mp/iniciar` |
| GET | `/v1/mp/estado/{intentId}` |
| POST | `/v1/mp/webhook` — público, llamado por MercadoPago, sin auth |
| DELETE | `/v1/mp/cancelar/{intentId}` |
| GET | `/v1/mp/historial` |
| GET | `/v1/mp/historial/pedido/{pedidoId}` |
| GET | `/v1/mp/historial/estado/{estado}` |
| POST | `/v1/mp/test/simular-pago/{intentId}` — ⚠️ endpoint de prueba, no usar en prod |
| GET | `/v1/mp/historial/mp` |

### `NegocioController` — `/v1/negocio`

| Método | URL |
|---|---|
| GET | `/v1/negocio/estado` — público, oculta `whatsappUrl`/`facebookUrl` si el negocio está abierto |
| GET | `/v1/negocio/contactos` — 🆕 **agregado 2026-07-01**, público, siempre expone `whatsappUrl`/`facebookUrl` (para el QR del ticket) |
| GET | `/v1/negocio/config` — solo ADMIN |
| POST | `/v1/negocio/abrir` — solo ADMIN |
| POST | `/v1/negocio/cerrar` — solo ADMIN |
| PUT | `/v1/negocio/horario` — solo ADMIN |
| PUT | `/v1/negocio/contactos` — solo ADMIN |

### `PagosCatalogoController` — `/v1/pagos`

| Método | URL |
|---|---|
| GET | `/v1/pagos/tipos-pago` |
| GET | `/v1/pagos/tarifas` |
| GET | `/v1/pagos/iva` |
| GET | `/v1/pagos/opciones` |
| GET | `/v1/pagos/opciones-estructuradas` |
| GET | `/v1/pagos/opciones-por-tipo/{tipoPagoId}` |

### `PalabraClaveController` — `/v1/palabras-clave` — extiende `AbstractController`

| Método | URL |
|---|---|
| GET | `/v1/palabras-clave/buscar` |
| + CRUD genérico | `/v1/palabras-clave/save`, `/getAll`, `/getOne/{tipoDato}`, `/update/{tipoDato}`, `/delete` |

### `PedidoController` — `/v1/pedidos` — extiende `AbstractController`

| Método | URL |
|---|---|
| POST | `/v1/pedidos/savePedido` |
| PUT | `/v1/pedidos/confirmar/{id}` |
| GET | `/v1/pedidos/findPedido/{id}?size=&page=` |
| GET | `/v1/pedidos/findPedido/{idPedido}/{idCliente}?size=&page=` |
| GET | `/v1/pedidos/buscarClientePedido?buscar=&size=&page=` |
| GET | `/v1/pedidos/{id}/detalle` |
| DELETE | `/v1/pedidos/delete/{id}` |
| DELETE | `/v1/pedidos/{pedidoId}/detalle/{productoId}` |
| + CRUD genérico | `/v1/pedidos/save`, `/getAll`, `/getOne/{tipoDato}`, `/update/{tipoDato}` |

### `ProductosControllerImpl` — `/v1/productos` — NO extiende AbstractController

| Método | URL |
|---|---|
| GET | `/v1/productos/obtenerProductos?size=&page=` |
| GET | `/v1/productos/buscarNombreOrCodigoBarra?size=&page=&nombre=` |
| POST | `/v1/productos/save` |
| PUT | `/v1/productos/update` |
| GET | `/v1/productos/findById/{id}` |
| DELETE | `/v1/productos/deleteBy/{id}` |
| GET | `/v1/productos/admin/no-habilitados` |
| GET | `/v1/productos/admin/sin-stock` |
| PUT | `/v1/productos/{id}/habilitar` |
| GET | `/v1/productos/admin/diagnostico-imagenes/{productoId}` |
| GET | `/v1/productos/admin/sin-variantes/reporte` — devuelve bytes (reporte, no JSON) |
| POST | `/v1/productos/compartir-imagenes-variantes` |

### `PruebaControllerImpl` — `/v1/productos-eje/` — ⚠️ controlador de prueba, no usar en producción

| Método | URL |
|---|---|
| GET | `/v1/productos-eje/data` |

### `RifaControllerImpl` — `/v1/rifa` — extiende `AbstractController`; también expone WebSocket

| Método | URL |
|---|---|
| POST | `/v1/rifa/registrar` |
| GET | `/v1/rifa/listConcursantes/{configurarRifaId}` |
| GET | `/v1/rifa/getRifasPorHora` |
| WebSocket | cliente envía a `/app/actualizar` → server transmite a `/topic/ruleta` |
| + CRUD genérico | heredado |

### `SubirDocumentosController` — `/v1/documentos`

| Método | URL |
|---|---|
| POST | `/v1/documentos/productos` — multipart, campo `archivo` |

### `UsuarioController` — `/v1/usuarios`

| Método | URL |
|---|---|
| GET | `/v1/usuarios/getAllPage` |
| PUT | `/v1/usuarios/updateUsuario/{id}` |
| DELETE | `/v1/usuarios/eliminarUsuarioDto/{id}` |
| GET | `/v1/usuarios/buscarClientePorIdUsuario/{idUsuario}` |
| GET | `/v1/usuarios/roles` |
| GET | `/v1/usuarios/permisos` |
| PUT | `/v1/usuarios/{usuarioId}/rol/{rolId}` |
| POST | `/v1/usuarios/{usuarioId}/permisos/{permisoId}` |
| DELETE | `/v1/usuarios/{usuarioId}/permisos/{permisoId}` |

### `VentaControllerImpl` — `/v1/ventas` — NO extiende AbstractController

| Método | URL |
|---|---|
| POST | `/v1/ventas/save` — ⚠️ response SIN wrapper `ResponseGeneric` (devuelve `VentaDirectaResponse` directo) |
| POST | `/v1/ventas/getVentas?size=&page=` |
| GET | `/v1/ventas/getTotalVentas` |
| GET | `/v1/ventas/buscar` |

### Resumen de hallazgos de esta auditoría

1. **`VarianteController` sí tenía un hueco real:** los 5 métodos heredados de `AbstractController`
   (`getAll`, `getOne`, `save`, `update`, `delete`) no llevaban `/v1/` porque la clase no tiene el
   prefijo. Corregido 2026-07-01 (ver arriba) — ahora los 29 controladores tienen `/v1/` en
   TODOS sus endpoints activos, viejos y nuevos coexistiendo (viejos por compatibilidad).
2. **Faltaban del documento por completo:** `AbonoController`, `ChatAdminController`,
   `ChatWebSocketController` (creados después de 2026-06-09) — ya agregados arriba.
3. **Endpoint nuevo de hoy agregado:** `GET /v1/negocio/contactos`.
4. **Inconsistencia de estilo que sigue viva (no es bug, es deuda técnica):** `ImageneController`
   (`/imagen`), `ImagenPresentacionController` (`/presentacion`) y `VarianteController` (`variantes`)
   ponen el `/v1/` por método, no en la clase — a diferencia de los otros 26 controladores. Ver
   conversación 2026-07-01 para la decisión de si se unifica (implica cambiar URLs, requiere
   coordinación con front).
5. **`CLAUDE.md`** describe los endpoints de `VarianteController` sin el `/v1/` — desactualizado,
   pendiente de corregir.
