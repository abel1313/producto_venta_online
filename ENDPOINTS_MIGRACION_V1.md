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

## 5. Estado del front — revisión 2026-06-08 ✅ COMPLETO

Se revisó el front completo (todos los servicios que construyen URLs vía `environment.api_Url`/`environment.api_imagenes`) contra las secciones 0 y 1 (incluida la tabla de endpoints #16-25 de `VarianteController` agregada al final). **Ya no quedan llamadas sin `/v1/` hacia los controladores listados** — se actualizaron `AdminService`, `AccederService`, `AppComponent`, `TokenInterceptor`, `ChatbotService`, `ClienteService`, `RifaService`, `NegocioService`, `PagoService`, `PalabraClaveService`, `DocumentosService`, `ProductoService`, `VarianteService`, `UsuarioService` y ambos `PedidosService`. Detalle completo en `bugs/CAMBIOS_FRONT.md` → sección "SESIÓN 2026-06-08 — Fase 2: prefijo `/v1/` en TODOS los demás controladores".

`LotesProductosControllerImpl` y `PruebaControllerImpl` confirmados sin uso en el front — no requieren cambios.
