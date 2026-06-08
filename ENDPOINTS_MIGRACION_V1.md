# Migración de versionado de URLs a /v1/ — 2026-06-07

> Documento único con TODOS los endpoints (URL LOCAL COMPLETA, lista para que el front la use) donde se agregó/renombró a `/v1/`, tanto en **proyecto-key (puerto 9091)** como en **micro_imagenes (puerto 9096)**.

⚠️ **Importante:** estos cambios ya están en el código (commits en `dev` y `qa` de ambos repos, ya pusheados, ambos compilan sin errores). Si al probar todavía ves URLs con `/v2/` o sin versión, es porque el **servidor que estás consultando (Docker/QA en ejecución) todavía no se reinició/redesplegó** con el código nuevo — el cambio es de código fuente, no de configuración en caliente. Hay que reconstruir y reiniciar ambos microservicios para verlo reflejado.

Host base local de ambos servicios: `http://localhost:<puerto>/mis-productos/...`
- proyecto-key → `http://localhost:9091/mis-productos/...`
- micro_imagenes → `http://localhost:9096/mis-productos/...`

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

#### Endpoints de `VarianteController` que NO cambiaron (sin versión, no formaban par v2/deprecado)

| Método | URL (sin cambios) |
|---|---|
| GET | `http://localhost:9091/mis-productos/variantes/buscar` |
| GET | `http://localhost:9091/mis-productos/variantes/porProducto/{productoId}` |
| POST | `http://localhost:9091/mis-productos/variantes/guardarConImagenes` |
| POST | `http://localhost:9091/mis-productos/variantes/inicializarDesdeProducto` |
| GET | `http://localhost:9091/mis-productos/variantes/imagenes/{varianteId}/paginado` |
| PUT | `http://localhost:9091/mis-productos/variantes/imagenes/{varianteImagenId}/principal` |
| GET | `http://localhost:9091/mis-productos/variantes/admin/diagnostico-imagenes/{varianteId}` |

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
