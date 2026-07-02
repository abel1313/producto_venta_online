# Cambios de API para Frontend — Migración a micro_imagenes

## Regla general
- **proyecto-key (9091):** solo maneja lógica de negocio (productos, variantes, pedidos, etc.)
- **micro_imagenes (9096):** todo lo relacionado con archivos de imagen

Los endpoints deprecados en proyecto-key siguen funcionando pero el front debe apuntar a los nuevos.
Los endpoints que dicen `✅ micro_imagenes (9096)` el front los llama **directamente al micro**.
Los endpoints que dicen `✅ proyecto-key (9091)` no pudieron moverse al micro (mezclan datos de negocio).

---

## ⚠️ MIGRACIÓN DE VERSIONES DE URL — 2026-06-07 (acción requerida en el front)

Se normalizó el versionado de URLs en **ambos** backends (proyecto-key 9091 y micro_imagenes 9096) para que todo use `/v1/` como versión estable. Resumen para el front:

- **Lo que el front ya está usando como "v2"** → se renombró a **`/v1/`**. Es la versión activa/estable. **El front solo necesita agregar `/v1/`** donde antes no había versión, o cambiar `/v2/` por `/v1/` donde ya tenía `/v2/`.
- **Lo que el front YA NO usa** (la versión vieja, marcada `@Deprecated`) → se renombró a **`/v3/`**. Sigue funcionando por compatibilidad pero no se debe usar para nada nuevo.
- **micro_imagenes (9096)** no tenía versión en sus URLs — ahora **todas** sus rutas llevan el prefijo `/v1/`.

### Tabla de cambios — proyecto-key (9091)

> ✅ `imagenes.service.ts` y `producto.service.ts` ya actualizados (2026-06-17)

| Antes (front lo usa) | Ahora | Estado |
|---|---|---|
| `imagen/v2/{productoId}` | `imagen/v1/{productoId}` | ✅ `imagenes.service.ts` |
| `imagen/v2/{productoId}/detalle` | `imagen/v1/{productoId}/detalle` | ✅ `producto.service.ts` |
| `imagen/v2/file/{imagenId}` | `imagen/v1/file/{imagenId}` |
| `imagen/v2/{idProducto}/imagenes` | `imagen/v1/{idProducto}/imagenes` |
| `imagen/v2/{idImagen}` (DELETE) | `imagen/v1/{idImagen}` (DELETE) |
| `imagen/v2/{productoId}/imagenes` (DELETE) | `imagen/v1/{productoId}/imagenes` (DELETE) |
| `imagen/v2/producto` (DELETE) | `imagen/v1/producto` (DELETE) |
| `imagen/v2/cache/limpiar` | `imagen/v1/cache/limpiar` |
| `presentacion/v2/imagenes` | `presentacion/v1/imagenes` |
| `presentacion/v2/imagenes/{id}/imagen` | `presentacion/v1/imagenes/{id}/imagen` |
| `presentacion/v2/imagenes/todas` | `presentacion/v1/imagenes/todas` |
| `presentacion/v2/imagenes/{id}` (PUT) | `presentacion/v1/imagenes/{id}` (PUT) |
| `variantes/v2/imagenes/{varianteId}` | `variantes/v1/imagenes/{varianteId}` |
| `variantes/v2/imagenes` (DELETE) | `variantes/v1/imagenes` (DELETE) |
| `variantes/v2/{varianteId}/imagenes` (DELETE) | `variantes/v1/{varianteId}/imagenes` (DELETE) |

> Las rutas viejas sin versión (`imagen/{id}`, `presentacion/imagenes`, `variantes/imagenes/{varianteId}`, etc.) ahora viven bajo `/v3/` y están `@Deprecated` — el front **no** debe usarlas.

### Tabla de cambios — micro_imagenes (9096) — antes no tenía versión, ahora todo lleva `/v1/`

| Antes | Ahora |
|---|---|
| `imagenes/file/{imagenId}` | `v1/imagenes/file/{imagenId}` |
| `imagenes/{id}` | `v1/imagenes/{id}` |
| `imagenes` (POST/GET/DELETE) | `v1/imagenes` |
| `imagenes/verificar` | `v1/imagenes/verificar` |
| `imagenes/disco` (DELETE) | `v1/imagenes/disco` |
| `producto-imagen/...` (todas las rutas) | `v1/producto-imagen/...` |
| `cache/limpiar` (DELETE) | `v1/cache/limpiar` |

**Ejemplo concreto que dio el equipo:**
```
Antes: http://localhost:9096/mis-productos/imagenes/file/7305237692097776164
Ahora: http://localhost:9096/mis-productos/v1/imagenes/file/7305237692097776164
```

Los `urlImagen` / `imagenUrl` que devuelven los listados (productos, variantes, presentación) **ya vienen actualizados con `/v1/` desde el backend** — el front no tiene que construir esas URLs manualmente, solo usarlas tal cual llegan en el response.

---

## BUGS CORREGIDOS — Cambios de comportamiento que el front debe conocer

---

### [BUG-KEY-02] ✅ Fix: búsqueda de pedidos — endpoint migrado a query param
**Fecha:** 2026-06-05  
**Archivos corregidos:** `PedidoController.java:92`, `PedidoServiceImpl.java:250`

**Endpoint ANTERIOR (deprecado):**
```
GET /pedidos/buscarClientePedido/{buscar}?size=10&page=0
```

**Endpoint NUEVO:**
```
GET /pedidos/buscarClientePedido?buscar=juan&size=10&page=0
GET /pedidos/buscarClientePedido?size=10&page=0            ← sin buscar = todos los pedidos
```

**El front DEBE cambiar la llamada:**
- Quitar el segmento `/{buscar}` de la URL
- Pasar `buscar` como query param (opcional)
- Cuando el campo está vacío → omitir el param o mandarlo vacío `buscar=`; ambos devuelven todos los pedidos

**Por qué cambia:** un path variable nunca puede ser vacío en HTTP — el router de Spring no matchea la ruta si el segmento falta. El front usaba `"vacio"` como centinela, lo que provocaba que la búsqueda buscara un cliente llamado "vacio" y no devolviera nada. Con query param opcional el problema desaparece.

**Comportamiento:**
- `buscar` ausente o vacío → devuelve **todos** los pedidos paginados
- `buscar=juan` → filtra pedidos cuyo cliente contiene "juan"

**Códigos de respuesta:** 200 con `PageableDto`, 500 si hay error interno.

---

### [BUG-KEY-01] ✅ Fix: guardar/actualizar producto ahora tiene rollback real si algo falla
**Fecha:** 2026-06-04  
**Archivo corregido:** `ProductosServiceImpl.java:365` — `private` → `protected` en `guardarProducto()`

**Endpoints afectados:**
```
POST /productos/save
PUT  /productos/update
```

**Dónde verlo en el panel:**
> Menú lateral → **Productos** → botón **Agregar producto** o **Editar producto** → llenar el formulario y guardar.

**Comportamiento ANTES del fix (incorrecto):**
- Si fallaba cualquier paso después de guardar el producto en BD (por ejemplo el guardado de imágenes), el producto quedaba guardado pero sin imágenes — estado inconsistente, datos a medias sin rollback

**Comportamiento DESPUÉS del fix (correcto):**
- Si algo falla durante el guardado completo (producto + imágenes + relaciones), Spring hace rollback de todo
- O se guarda todo completo, o no se guarda nada

**El front no necesita cambiar nada** — mismo endpoint, mismo request, mismo response. El cambio es interno de integridad de datos.

---

### [BUG-KEY-03] ✅ Fix: compartir imágenes a variantes ya no genera duplicados ni errores aleatorios
**Fecha:** 2026-06-05  
**Archivo corregido:** `ProductosServiceImpl.java:352` — eliminado `parallelStream`, reemplazado por `saveAll()` en un solo batch

**Endpoint afectado:**
```
POST /productos/compartir-imagenes-variantes
```

**Dónde verlo en el panel:**
> Menú lateral → **Productos** → abrir un producto → sección de variantes → botón **Compartir imágenes a variantes** (asigna las imágenes del producto a todas sus variantes de una vez).

**Comportamiento ANTES del fix (incorrecto):**
- Se usaban dos `parallelStream` anidados para guardar cada relación variante-imagen en paralelo
- JPA no soporta múltiples hilos simultáneos sobre el mismo contexto de BD
- Podía resultar en: duplicados silenciosos, errores aleatorios tipo `ConcurrentModificationException`, o imágenes asignadas incorrectamente a variantes equivocadas

**Comportamiento DESPUÉS del fix (correcto):**
- Se arma toda la lista de relaciones variante-imagen en memoria y se persiste en **una sola llamada** `saveAll()`
- Sin hilos paralelos, sin riesgo de corrupción, más rápido porque es un solo INSERT en lote

**El front no necesita cambiar nada** — mismo endpoint, mismo request, mismo response.

---

### [BUG-KEY-04] ✅ Fix: reconciliación de imágenes ya no se bloquea permanentemente si hay un error
**Fecha:** 2026-06-05  
**Archivo corregido:** `ReconciliacionImagenService.java:68` — envuelto en `try/catch/finally`

**Endpoints afectados:**
```
POST /admin/reconciliacion/imagenes
POST /admin/reconciliacion/imagenes/limpiar-bd
GET  /admin/reconciliacion/imagenes/resultado
```

**Dónde verlo en el panel:**
> Menú lateral → **Administración** → sección **Reconciliación de imágenes** → botón **Iniciar reconciliación**.

**Comportamiento ANTES del fix (incorrecto):**
- Si durante la reconciliación ocurría cualquier error (BD caída, NPE, timeout), la bandera interna `enProceso` quedaba en `true` para siempre
- Desde ese momento todos los intentos de volver a reconciliar eran rechazados con "ya hay un proceso en curso"
- La única solución era reiniciar el servidor

**Comportamiento DESPUÉS del fix (correcto):**
- Si ocurre un error, se loguea, se guarda el resultado parcial que se alcanzó a procesar, y `enProceso` se libera en el bloque `finally` — siempre, pase lo que pase
- Se puede volver a lanzar la reconciliación inmediatamente sin reiniciar

**El front no necesita cambiar nada** — mismos endpoints, mismo response.

---

### [BUG-KEY-06] ✅ Fix: errores en endpoints de pedidos ya no devuelven pantalla en blanco
**Fecha:** 2026-06-05 | **Archivo:** `PedidoController.java`

**Endpoints afectados:**
```
GET    /pedidos/findPedido/{id}
GET    /pedidos/findPedido/{idPedido}/{idCliente}
GET    /pedidos/buscarClientePedido/{buscar}
DELETE /pedidos/delete/{id}
```
**Dónde verlo:** Menú → **Pedidos** → cualquier acción de consulta o eliminación.

**Antes:** si el backend tenía un error interno, retornaba `null` → el front recibía un 500 genérico sin body, causando pantalla en blanco o comportamiento indefinido.

**Después:** retorna `500 Internal Server Error` con body de error controlado que el front puede leer y mostrar mensaje al usuario.

**El front puede mejorar:** si el front ya maneja el caso de `response == null`, ahora puede leer `response.mensaje` para mostrar el error específico.

---

### [BUG-KEY-07] ✅ Fix: subida de imágenes ya no falla silenciosamente por JWT
**Fecha:** 2026-06-05 | **Archivo:** `ImageneClienteDisco.java:54`

**Endpoints afectados (indirectamente — flujo interno):**
```
POST /variantes/guardarConImagenes
POST /productos/save
PUT  /productos/update
```
**Dónde verlo:** Menú → **Productos** o **Variantes** → subir imágenes al guardar/actualizar.

**Antes:** si el contexto de seguridad no tenía credenciales JWT (ej. token expirado en ciertos flujos), lanzaba `NullPointerException` → 500 genérico sin mensaje claro.

**Después:** lanza `IllegalStateException` con mensaje descriptivo "No hay credenciales JWT en el contexto de seguridad" → más fácil de diagnosticar en logs.

**El front no necesita cambiar nada** — si ocurre, el error ahora llega con mensaje legible.

---

### [BUG-KEY-08] ✅ Fix: actualizar imagen de presentación ahora refresca la caché
**Fecha:** 2026-06-05 | **Archivo:** `ImagenPresentacionService.java`

**Endpoints afectados:**
```
PUT /presentacion/imagenes/{id}
PUT /presentacion/v1/imagenes/{id}
```
**Dónde verlo:** Menú → **Presentación** o **Inicio/Banner** → editar una imagen → guardar.

**Antes:** después de actualizar una imagen de presentación, la caché seguía sirviendo la imagen anterior hasta que expirara sola (podía tardar minutos).

**Después:** al actualizar, la caché se invalida automáticamente y todos los usuarios ven la imagen nueva de inmediato.

**El front no necesita cambiar nada.**

---

### [BUG-KEY-09] ✅ Fix: IDs de imagen ahora usan 128 bits — sin riesgo de colisión
**Fecha:** 2026-06-05 | **Archivo:** `ProductosServiceImpl.java`

**Endpoints afectados:**
```
POST /productos/save
PUT  /productos/update
```
**Dónde verlo:** Menú → **Productos** → agregar o editar producto con imágenes.

**Antes:** el ID de cada imagen se generaba con solo 63 bits de un UUID → con muchas imágenes acumuladas había riesgo de duplicados silenciosos o error de BD.

**Después:** usa XOR de las dos mitades del UUID (128 bits efectivos) → probabilidad de colisión prácticamente cero.

**El front no necesita cambiar nada.**

---

### [BUG-KEY-10] ✅ Fix: contrato de saveAll() ahora es correcto (void)
**Fecha:** 2026-06-05 | **Archivo:** `ImagenProductoClienteVPS.java` + `ImagenProductoPort.java`

**Flujo afectado (interno — no es endpoint público):**
Cuando se guarda un producto con imágenes, internamente se publica a RabbitMQ la relación producto-imagen.

**Antes:** el método declaraba retorno `ResponseGeneric<ProductoImagen>` pero siempre devolvía `null`. Engañoso y potencial NPE si algún caller usaba el retorno.

**Después:** retorno cambiado a `void` — el contrato refleja la realidad (fire-and-forget por Rabbit).

**El front no necesita cambiar nada.**

---

### [PERF-KEY-01] ✅ Fix: timeouts en llamadas HTTP al micro de imágenes
**Fecha:** 2026-06-05 | **Archivos:** `ImageneClienteDisco.java`, `ImagenProductoClienteVPS.java`

**Endpoints que mejoran (los que consultan imágenes al micro):**
```
GET /imagen/{id}
GET /imagen/v1/{productoId}
GET /variantes/buscar
GET /variantes/imagenes/{varianteId}
GET /productos/findById/{id}
```
**Dónde verlo:** cualquier pantalla que muestre imágenes de productos o variantes.

**Antes:** si el micro de imágenes tardaba o no respondía, el hilo de Tomcat quedaba bloqueado indefinidamente → con varios usuarios concurrentes el servidor dejaba de responder.

**Después:** timeout de 5 segundos en todas las llamadas HTTP. Si el micro no responde en 5s, libera el hilo y devuelve error controlado.

**El front puede notar:** en casos donde el micro de imágenes esté lento, ahora recibirá un error a los 5s en vez de esperar indefinidamente. Recomendable mostrar imagen placeholder si el response de imagen viene vacío.

---

### [PERF-KEY-02] ✅ Fix: listado de imágenes por producto ya pagina en SQL
**Fecha:** 2026-06-05 | **Archivo:** `ImagenServiceImpl.java`

**Endpoints afectados:**
```
GET /imagen/{id}/detalle?page=1&size=10
GET /imagen/v1/{productoId}/detalle?page=1&size=10
```
**Dónde verlo:** Menú → **Productos** → detalle de producto → galería de imágenes paginada.

**Antes:** cargaba TODAS las imágenes del producto en memoria (incluyendo leer los archivos del disco), luego recortaba por página en Java. Con muchas imágenes: memoria alta, respuesta lenta.

**Después:** la paginación ocurre en SQL — solo carga del disco las imágenes de la página actual. Respuesta significativamente más rápida y sin presión de memoria.

**El front no necesita cambiar nada** — mismo endpoint, mismo response, mismos parámetros `page` y `size`.

---

### [PERF-KEY-03] ✅ Fix: marcar imagen principal ya no hace N queries individuales
**Fecha:** 2026-06-05 | **Archivos:** `ProductosServiceImpl.java`, `IProductoImagenRepository.java`

**Endpoints afectados:**
```
POST /productos/save      (cuando se envía imagenPrincipalId)
PUT  /productos/update    (cuando se envía imagenPrincipalId)
```
**Dónde verlo:** Menú → **Productos** → guardar producto → el campo "imagen principal" del formulario.

**Antes:** por cada imagen del producto hacía 1 SELECT + N UPDATEs individuales (un UPDATE por imagen). Producto con 10 imágenes = 11 queries.

**Después:** 2 queries fijas sin importar cuántas imágenes tenga el producto: 1 UPDATE que desmarca todas + 1 UPDATE que marca la principal.

**El front no necesita cambiar nada.**

---

## ENDPOINTS MIGRADOS

---

### 1. Imagen principal de un producto en el listado

> El front **no necesita llamar a ningún endpoint adicional**. El response de `GET /productos/obtenerProductos` ya incluye el campo `urlImagen` que apunta directo a los bytes. El front solo hace `<img [src]="producto.imagen.urlImagen">`.

**`urlImagen` que viene en el listado de productos (a partir de ahora):**
```
http://localhost:9096/mis-productos/v1/imagenes/file/{imagenId}
```

**Response al llamar esa URL (micro_imagenes 9096):**
```
Content-Type: image/jpeg   (o image/png, image/gif)
Body: <bytes binarios>
```

**Response 204:** sin body — imagen no encontrada en disco (no explota con 500).

**Cambio respecto a la versión anterior:** antes la `urlImagen` apuntaba a `buscarImagenProducto/{productoId}` que devolvía JSON (no bytes). Ahora apunta directamente a `/imagenes/file/{imagenId}` — se puede usar directo como `src` del `<img>` sin ningún procesamiento.

---

### 2. Detalle paginado de imágenes de un producto

#### Version anterior — `GET /imagen/v3/{productoId}/detalle` ❌ Deprecated

| | |
|---|---|
| **Controlador** | `ImageneController` — `proyecto-key` — método `getDetalle()` |
| **Path param** | `productoId` (Integer) |
| **Query params** | `page` (int), `size` (int) |
| **Response 200** | `PageableDto` → lista de items: `{ idProducto, idImagen, name, price, inventoryStatus, extencion, image (bytes) }` |
| **RabbitMQ** | No aplica — lectura síncrona |
| **Acción front** | Sin cambio — sigue funcionando igual |

**Flujo interno:**
```
Front → proyecto-key ImageneController.getDetalle()
            └─► IImagenService.findImagenPrincipalPorProductoIds()
                      └─► consulta BD local (nombre, precio, stock, imagenId)
                      └─► por cada imagen: lee bytes del DISCO LOCAL de proyecto-key
```

---

#### Version nueva — `GET /imagen/v1/{productoId}/detalle` ✅ Usar esta — **proyecto-key (9091)** — se queda aquí

> Este endpoint **no puede moverse al micro** porque mezcla datos del producto (nombre, precio, stock) con bytes de imagen.

| | |
|---|---|
| **Controlador** | `ImageneController` — `proyecto-key` — método `getDetalleV2()` |
| **Path param** | `productoId` (Integer) — mismo que antes |
| **Query params** | `page` (int), `size` (int) — mismos que antes |
| **Response 200** | Misma estructura: `PageableDto` → lista de `{ idProducto, idImagen, name, price, inventoryStatus, extencion, image (bytes) }` |
| **RabbitMQ** | No aplica — lectura síncrona |
| **Acción front** | Cambiar URL de `/imagen/{id}/detalle` a `/imagen/v1/{id}/detalle` |

**Diferencia clave con la versión anterior:**
- `name`, `price`, `inventoryStatus`, `extencion` → siguen saliendo de la **BD local de proyecto-key** (el micro no tiene datos del producto)
- `image` (bytes) → ahora vienen del **microservicio de imágenes** en vez del disco local
- Si una imagen no existe en el micro → ese item llega con `image: null` + log en servidor (antes también podía ser null pero sin aviso)

**Flujo interno:**
```
Front → proyecto-key ImageneController.getDetalleV2()
            └─► IImagenService.findImagenPrincipalPorProductoIdsV2()
                      └─► consulta BD local (nombre, precio, stock, imagenId) ← igual que antes
                      └─► por cada imagen: ImagenPort.getOne(imagenId)
                                └─► HTTP → microservicio de imágenes → bytes del DISCO DEL MICRO
```

---

### 3. Obtener bytes de imagen por ID de imagen

#### Version anterior — `GET /imagen/v3/file/{imagenId}` ❌ Deprecated

| | |
|---|---|
| **Controlador** | `ImageneController` — `proyecto-key` — método `getImagenByImagenId()` |
| **Path param** | `imagenId` (Long) — ID de la imagen |
| **Response 200** | `byte[]` con header `Content-Type` |
| **Response error** | HTTP 500 si el archivo no existe en disco local |
| **RabbitMQ** | No aplica |
| **Acción front** | Sin cambio — sigue funcionando si el archivo está en disco local |

**Flujo interno:**
```
Front → proyecto-key ImageneController.getImagenByImagenId()
            └─► IImagenService.findByImagenId()
                      └─► busca en imagenes_copy → lee bytes del DISCO LOCAL de proyecto-key
```

---

#### Version nueva — `GET /imagenes/file/{imagenId}` ✅ Usar esta — **micro_imagenes (9096)**

| | |
|---|---|
| **Micro** | `micro_imagenes` — `ImagenController.getImagenBytes()` |
| **Path param** | `imagenId` (Long) — mismo que antes |
| **Response 200** | `byte[]` con header `Content-Type` |
| **Response sin imagen** | HTTP 204 No Content (antes daba 500) |
| **Acción front** | Cambiar URL a `GET http://localhost:9096/mis-productos/v1/imagenes/file/{imagenId}` |

**Request:**
```
GET http://localhost:9096/mis-productos/v1/imagenes/file/123
```

**Response 200:**
```
Content-Type: image/jpeg   (o image/png, image/gif)
Body: <bytes binarios>
```

**Response 204:** sin body — imagen no encontrada en disco.

**Diferencia clave:** el front llama directo al micro — proyecto-key ya no intermedia. Los bytes vienen del disco del micro.

**Flujo:**
```
Front → GET /mis-productos/imagenes/file/{imagenId}   ← micro_imagenes directo
            └─► imagenes_copy (BD compartida) → obtiene nombre de archivo
            └─► lee bytes del DISCO DEL MICRO
            ← byte[] + Content-Type
```

---

### 4. Listado de imágenes de un producto (metadata + URLs)

#### Version anterior — `GET /imagen/v3/{idProducto}/imagenes` ❌ Deprecated

| | |
|---|---|
| **Controlador** | `ImageneController` — `proyecto-key` — método `getImagenesPorProductoId()` |
| **Path param** | `idProducto` (Integer) |
| **Response 200** | `ProductoImagenDto` → `{ productoId, listaImagenes: [{ id, extension, nombreImagen, urlImagen, principal }] }` |
| **urlImagen apunta a** | `GET /imagen/v3/file/{imagenId}` — disco local |
| **RabbitMQ** | No aplica |
| **Acción front** | Sin cambio — sigue funcionando |

---

#### Version nueva — `GET /producto-imagen/listar/{productoId}` ✅ Usar esta — **micro_imagenes (9096)**

| | |
|---|---|
| **Micro** | `micro_imagenes` — `ProductoImagenController.listarImagenesProducto()` |
| **Path param** | `productoId` (Integer) — mismo que antes |
| **Response 200** | Misma estructura — `{ productoId, listaImagenes: [{id, extension, nombreImagen, urlImagen, principal}] }` |
| **urlImagen apunta a** | `GET /mis-productos/imagenes/file/{imagenId}` — micro_imagenes |
| **Acción front** | Cambiar URL a `GET http://localhost:9096/mis-productos/producto-imagen/listar/{productoId}` |

**Request:**
```
GET http://localhost:9096/mis-productos/producto-imagen/listar/10
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "productoId": 10,
  "listaImagenes": [
    { "id": 123, "extension": "jpg", "nombreImagen": "foto.jpg", "urlImagen": "/mis-productos/imagenes/file/123", "principal": true },
    { "id": 124, "extension": "png", "nombreImagen": "foto2.png", "urlImagen": "/mis-productos/imagenes/file/124", "principal": false }
  ]
}
```

**Diferencia clave:** el front llama directo al micro. La `urlImagen` ya apunta al endpoint de bytes del micro — el front no cambia cómo procesa la respuesta, solo la URL del request.

**Flujo:**
```
Front → GET /mis-productos/producto-imagen/listar/{productoId}   ← micro_imagenes directo
            └─► JOIN producto_imagen_copy + imagenes_copy (BD compartida)
            └─► urlImagen = /mis-productos/imagenes/file/{id}
            ← { productoId, listaImagenes:[...] }
```

---

### 5. Eliminar imagen por ID

#### Versión anterior — `DELETE /imagen/v3/{idImagen}` ❌ Deprecated (proyecto-key)

Solo borraba de la BD local — el archivo quedaba en disco del micro.

#### Versión final — `DELETE /producto-imagen/{id}` ✅ Usar esta — **micro_imagenes (9096)**

> `{id}` = el ID de la imagen (Long) — el mismo valor que antes se mandaba a proyecto-key.

**Request:**
```
DELETE http://localhost:9096/mis-productos/producto-imagen/123
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "response": {} }
```

**Diferencia clave:** el front llama directo al micro. Borra el archivo del disco, el registro de `imagenes_copy` y la relación de `producto_imagen_copy` — todo en una sola llamada. Ya no pasa por proyecto-key.

**Flujo:**
```
Front → DELETE /mis-productos/producto-imagen/{imagenId}   ← micro_imagenes directo
            └─► busca relación por imagenId en producto_imagen_copy
            └─► borra archivo del disco del micro
            └─► borra registro de imagenes_copy
            └─► borra relación de producto_imagen_copy
            ← 200 OK
```

---

### 6. Eliminar imágenes específicas de un producto — **proyecto-key (9091)** — se queda aquí

> No puede moverse al micro porque necesita verificar `variante_imagen` que es tabla de proyecto-key.

| | `DELETE /imagen/v3/{productoId}/imagenes` ❌ Deprecated | `DELETE /imagen/v1/{productoId}/imagenes` ✅ Usar esta |
|---|---|---|
| **URL completa** | `http://localhost:9091/mis-productos/imagen/v3/{id}/imagenes` | `http://localhost:9091/mis-productos/imagen/v1/{id}/imagenes` |
| **Body** | `[imagenId1, imagenId2, ...]` (Long[]) | mismo |
| **Response** | HTTP 200 `{ message }` | HTTP 200 `{ message }` — mismo |

---

### 7. Eliminar todas las imágenes de varios productos — **proyecto-key (9091)** — se queda aquí

> Misma razón que el punto 6.

| | `DELETE /imagen/v3/producto` ❌ Deprecated | `DELETE /imagen/v1/producto` ✅ Usar esta |
|---|---|---|
| **URL completa** | `http://localhost:9091/mis-productos/imagen/v3/producto` | `http://localhost:9091/mis-productos/imagen/v1/producto` |
| **Body** | `[productoId1, productoId2, ...]` (Integer[]) | mismo |
| **Response** | HTTP 200 `{ message }` | HTTP 200 `{ message }` — mismo |

---

### 8. Limpiar caché de imágenes

| | `GET /imagen/v3/cache/imagen/limpiar` ❌ Deprecated | `GET /imagen/v1/cache/limpiar` ✅ Usar esta |
|---|---|---|
| **Controlador** | `ImageneController` — `limpiarTodaLaCacheDeImagenes()` | `ImageneController` — `limpiarCacheImagenesV2()` |
| **Response** | void | HTTP 204 No Content |
| **Diferencia** | Solo evicta caché `imagenes` | Evicta `imagenes`, `detalleImagen`, `detalle`, `detalle-v2`, `buscarImagenIdCache` |
| **RabbitMQ** | No aplica | TODO: publicar evento para invalidar caché en todos los nodos |
| **Acción front** | Sin cambio | Cambiar URL a `/imagen/v1/cache/limpiar` |

---

## ENDPOINTS MIGRADOS (continuación)

---

### 9. Imágenes activas de presentación por tipo (LOGIN / REGISTRO)

#### Versión anterior — `GET /presentacion/v3/imagenes?tipo=LOGIN` ❌ Deprecated

| | |
|---|---|
| **Controlador** | `ImagenPresentacionController` — `getImagenes()` |
| **Query param** | `tipo` (String: `LOGIN` \| `REGISTRO`) |
| **Response 200** | `ResponseGeneric<List<ImagenPresentacion>>` — entidad directa con `nombreArchivo` (ruta de disco interno) |
| **RabbitMQ** | No aplica |
| **Acción front** | Sin cambio — sigue funcionando |

**Request:**
```
GET /mis-productos/presentacion/v3/imagenes?tipo=LOGIN
```

**Response 200:**
```json
{
  "mensaje": "La peticion fue exitosa",
  "code": 200,
  "data": [
    {
      "id": 1,
      "tipo": "LOGIN",
      "orden": 1,
      "nombreArchivo": "uuid_banner.jpg",
      "extension": "jpg",
      "nombreOriginal": "banner.jpg",
      "descripcion": "Banner principal de login",
      "activo": true,
      "actualizadoEn": "2026-05-21T10:00:00"
    }
  ],
  "lista": null
}
```

**Flujo interno:**
```
Front → getImagenes()
    └─► ImagenPresentacionService.getImagenesPorTipo()
              └─► IImagenPresentacionRepository.findByTipoAndActivoOrderByOrden()
                        └─► BD local → devuelve entidad con nombreArchivo (disco local)
```

---

#### Versión nueva — `GET /presentacion/v1/imagenes?tipo=LOGIN` ✅ Usar esta

| | |
|---|---|
| **Controlador** | `ImagenPresentacionController` — `getImagenesV2()` |
| **Query param** | `tipo` (String: `LOGIN` \| `REGISTRO`) — mismo que antes |
| **Response 200** | `ResponseGeneric<List<ImagenPresentacionDto>>` — DTO con `urlImagen` calculada |
| **Response sin datos** | HTTP 200 con `data: []` (lista vacía) |
| **Cache** | `@Cacheable("presentacion-imagenes")` por `tipo` |
| **RabbitMQ** | **NO aplica** — lectura síncrona. TODO: cuando se implemente `PUT /presentacion/v1/imagenes/{id}`, publicar evento `cache.evict.presentacion` en `exchange.imagenes` para invalidar caché en todos los nodos |
| **Acción front** | Cambiar URL a `/presentacion/v1/imagenes?tipo=...` y usar `urlImagen` del DTO para cargar la imagen |

**Request:**
```
GET /mis-productos/presentacion/v1/imagenes?tipo=LOGIN
```

**Response 200:**
```json
{
  "mensaje": "La peticion fue exitosa",
  "code": 200,
  "data": [
    {
      "id": 1,
      "tipo": "LOGIN",
      "orden": 1,
      "extension": "jpg",
      "nombreOriginal": "banner.jpg",
      "descripcion": "Banner principal de login",
      "activo": true,
      "actualizadoEn": "2026-05-21T10:00:00",
      "urlImagen": "/presentacion/v1/imagenes/1/imagen"
    }
  ],
  "lista": null
}
```

**Diferencia clave con la versión anterior:**
- Ya **no expone** `nombreArchivo` (ruta de disco interno)
- Agrega `urlImagen` → apunta a `GET /presentacion/v1/imagenes/{id}/imagen` (bytes desde el micro)
- La respuesta se cachea — menor carga en BD en producción

**Flujo interno:**
```
Front → getImagenesV2()
    └─► ImagenPresentacionService.getImagenesPorTipoV2()   ← @Cacheable("presentacion-imagenes")
              └─► IImagenPresentacionRepository.findByTipoAndActivoOrderByOrden()
                        └─► BD local → mapea a ImagenPresentacionDto con urlImagen calculada
```

---

---

### 10. Bytes de imagen de presentación por ID

#### Versión anterior — `GET /presentacion/v3/imagenes/{id}/imagen` ❌ Deprecated

| | |
|---|---|
| **Controlador** | `ImagenPresentacionController` — `getImagen()` |
| **Path param** | `id` (Integer) — ID de la `ImagenPresentacion` |
| **Response 200** | `byte[]` con header `Content-Type: image/jpeg \| image/png \| ...` |
| **Response error** | HTTP 500 si el archivo no existe en disco |
| **RabbitMQ** | No aplica |
| **Acción front** | Sin cambio — sigue funcionando |

**Request:**
```
GET /mis-productos/presentacion/imagenes/1/imagen
```

**Response 200:**
```
Content-Type: image/jpeg   (o image/png, image/gif)
Body: <bytes binarios — usar directamente como src de <img> o blob>
```

**Response 500:** archivo no encontrado en disco.

---

#### Versión nueva — `GET /presentacion/v1/imagenes/{id}/imagen` ✅ Usar esta

| | |
|---|---|
| **Path param** | `id` (Integer) — mismo que antes |
| **Acción front** | Si ya usas `GET /presentacion/v1/imagenes?tipo=...`, el campo `urlImagen` de cada item ya apunta a esta URL — sin cambio adicional. Solo actualizar si tenías la URL hardcodeada. |

**Request:**
```
GET /mis-productos/presentacion/v1/imagenes/1/imagen
```

**Response 200:**
```
Content-Type: image/jpeg   (o image/png, image/gif según la imagen)
Body: <bytes binarios — usar directamente como src de <img> o blob>
```

**Response 204:** sin body — imagen no encontrada (ya no explota con 500).

**Diferencia clave:** igual que v1 pero devuelve **204** en vez de **500** cuando no existe el archivo.

---

---

### 11. Listar todas las imágenes de presentación (ADMIN)

#### Versión anterior — `GET /presentacion/v3/imagenes/todas` ❌ Deprecated

**Request:**
```
GET /mis-productos/presentacion/v3/imagenes/todas
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tipo": "LOGIN",
      "orden": 1,
      "nombreArchivo": "uuid_banner.jpg",
      "extension": "jpg",
      "nombreOriginal": "banner.jpg",
      "descripcion": "Banner principal",
      "activo": true,
      "actualizadoEn": "2026-05-21T10:00:00"
    }
  ]
}
```

---

#### Versión nueva — `GET /presentacion/v1/imagenes/todas` ✅ Usar esta

**Request:**
```
GET /mis-productos/presentacion/v1/imagenes/todas
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tipo": "LOGIN",
      "orden": 1,
      "extension": "jpg",
      "nombreOriginal": "banner.jpg",
      "descripcion": "Banner principal",
      "activo": true,
      "actualizadoEn": "2026-05-21T10:00:00",
      "urlImagen": "/presentacion/v1/imagenes/1/imagen"
    }
  ]
}
```

**Diferencia clave:** ya no expone `nombreArchivo` (ruta interna del servidor). Usar `urlImagen` para mostrar la imagen.

---

### 12. Actualizar imagen de presentación (ADMIN)

#### Versión anterior — `PUT /presentacion/v3/imagenes/{id}` ❌ Deprecated

**Request:**
```
PUT /mis-productos/presentacion/imagenes/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "base64": "<bytes[]>",
  "extension": "jpg",
  "nombreImagen": "banner.jpg",
  "descripcion": "Banner principal",
  "activo": true
}
```

> `base64` es opcional — si no se envía, solo se actualizan `descripcion` y `activo`.

**Response 200:**
```json
{
  "data": {
    "id": 1,
    "tipo": "LOGIN",
    "orden": 1,
    "nombreArchivo": "uuid_banner.jpg",
    "extension": "jpg",
    "nombreOriginal": "banner.jpg",
    "descripcion": "Banner principal",
    "activo": true,
    "actualizadoEn": "2026-05-21T10:00:00"
  }
}
```

---

#### Versión nueva — `PUT /presentacion/v1/imagenes/{id}` ✅ Usar esta

**Request:** igual que v1 — mismo body, mismo token ADMIN.

```
PUT /mis-productos/presentacion/v1/imagenes/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "base64": "<bytes[]>",
  "extension": "jpg",
  "nombreImagen": "banner.jpg",
  "descripcion": "Banner principal",
  "activo": true
}
```

**Response 200:**
```json
{
  "data": {
    "id": 1,
    "tipo": "LOGIN",
    "orden": 1,
    "extension": "jpg",
    "nombreOriginal": "banner.jpg",
    "descripcion": "Banner principal",
    "activo": true,
    "actualizadoEn": "2026-05-21T10:00:00",
    "urlImagen": "/presentacion/v1/imagenes/1/imagen"
  }
}
```

**Diferencia clave:**
- Ya no devuelve `nombreArchivo` (ruta interna del servidor)
- **Invalida automáticamente el caché** `presentacion-imagenes` — el próximo `GET /presentacion/v1/imagenes?tipo=...` devuelve datos frescos
- RabbitMQ: TODO para invalidar caché en multi-nodo (por ahora se invalida solo el nodo que recibe el PUT)

---

### 13. Imágenes de una variante por ID

#### Versión anterior — `GET /variantes/v3/imagenes/{varianteId}` ❌ Deprecated

**Request:**
```
GET /mis-productos/variantes/v3/imagenes/5
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "123",
      "extension": "jpg",
      "nombreImagen": "foto.jpg",
      "urlImagen": "http://micro-imagenes/imagenes/123",
      "principal": true
    }
  ]
}
```

> Puede devolver `urlImagen` con URLs rotas si el archivo ya no existe en el micro.

---

#### Versión nueva — `GET /variantes/v1/imagenes/{varianteId}` ✅ Usar esta

**Request:**
```
GET /mis-productos/variantes/v1/imagenes/5
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "123",
      "extension": "jpg",
      "nombreImagen": "foto.jpg",
      "urlImagen": "http://micro-imagenes/imagenes/123",
      "principal": true
    }
  ]
}
```

**Response 200 sin imágenes:** `{ "data": [] }`

**Diferencia clave:** antes de responder verifica en el micro cuáles archivos existen — solo devuelve imágenes con archivo real. Nunca devuelve URLs rotas.

---

### 14. Eliminar todas las imágenes de varias variantes (ADMIN)

| | `DELETE /variantes/v3/imagenes` ❌ Deprecated | `DELETE /variantes/v1/imagenes` ✅ Usar esta |
|---|---|---|
| **Auth** | Bearer token ADMIN | igual |
| **Body** | `[varianteId1, varianteId2, ...]` (Integer[]) | igual |
| **Response 200** | `{ "data": "Imágenes eliminadas correctamente" }` | igual |
| **Diferencia** | misma lógica | misma lógica — solo cambia la URL |

**Request:**
```
DELETE /mis-productos/variantes/v1/imagenes
Authorization: Bearer <token>
Content-Type: application/json

[1, 2, 3]
```

**Response 200:**
```json
{ "data": "Imágenes eliminadas correctamente" }
```

---

### 15. Eliminar imágenes específicas de una variante (ADMIN)

| | `DELETE /variantes/v3/{varianteId}/imagenes` ❌ Deprecated | `DELETE /variantes/v1/{varianteId}/imagenes` ✅ Usar esta |
|---|---|---|
| **Auth** | Bearer token ADMIN | igual |
| **Path param** | `varianteId` (Integer) | igual |
| **Body** | `[imagenId1, imagenId2, ...]` (Long[]) | igual |
| **Response 200** | `{ "data": "Imágenes eliminadas correctamente" }` | igual |
| **Diferencia** | misma lógica | misma lógica — solo cambia la URL |

**Request:**
```
DELETE /mis-productos/variantes/v1/5/imagenes
Authorization: Bearer <token>
Content-Type: application/json

[123, 456]
```

**Response 200:**
```json
{ "data": "Imágenes eliminadas correctamente" }
```

> Ambos DELETEs ya eliminaban de BD local **y** del micro en la versión anterior. El cambio es solo la URL.

## PENDIENTES DE MIGRAR

---

## CAMBIOS ADICIONALES EN MICRO_IMAGENES

---

### 16. Listar imágenes de un producto — ahora paginado

**Endpoint:** `GET /producto-imagen/listar/{productoId}` — **micro_imagenes (9096)**

> Este endpoint ya se documentó en el punto 4. Ahora se le agregó paginación.

**Request:**
```
GET http://localhost:9096/mis-productos/producto-imagen/listar/265?pagina=1&size=8
Authorization: Bearer <token>
```

| Param | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `pagina` | Integer | No | `1` | Número de página (empieza en 1) |
| `size` | Integer | No | `8` | Imágenes por página |

**Response 200:**
```json
{
  "productoId": 265,
  "listaImagenes": [
    {
      "id": 123,
      "extension": "image/jpeg",
      "nombreImagen": "foto.jpg",
      "urlImagen": "http://localhost:9096/mis-productos/v1/imagenes/file/123",
      "principal": true
    }
  ],
  "pagina": 1,
  "totalPaginas": 3,
  "totalImagenes": 20
}
```

**Cómo navegar páginas desde el front:**
```
Primera página:   GET .../listar/265?pagina=1&size=8
Segunda página:   GET .../listar/265?pagina=2&size=8
Última página:    GET .../listar/265?pagina={totalPaginas}&size=8
```

**Diferencia clave:** antes devolvía todas las imágenes sin límite. Ahora devuelve 8 por página. Usar `totalPaginas` para renderizar los botones de paginación. Si no se mandan params, devuelve la primera página con 8 imágenes.

---

### 17. DetalleProductoComponent — imágenes del producto con URL en lugar de bytes

#### Versión anterior — `GET /imagen/v3/{productoId}/detalle` ❌ Deprecated (proyecto-key 9091)

Devolvía bytes embebidos en el response (pesado, lento).

**Request:**
```
GET http://localhost:9091/mis-productos/imagen/265/detalle?size=4&page=0
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "list": [
    {
      "idProducto": 265,
      "idImagen": 123,
      "name": "prod",
      "price": 1.0,
      "inventoryStatus": "INSTOCK",
      "extencion": "jpg",
      "image": "/9j/4AAQSkZJRgAB..."
    }
  ],
  "totalPaginas": 3
}
```

---

#### Versión nueva — `GET /producto-imagen/listar/{productoId}` ✅ Usar esta — **micro_imagenes (9096)**

Devuelve URLs — el front carga cada imagen con `<img [src]="imagen.urlImagen">`.

**Request:**
```
GET http://localhost:9096/mis-productos/producto-imagen/listar/265?pagina=1&size=8
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "productoId": 265,
  "listaImagenes": [
    {
      "id": "3855830153700593542",
      "extension": "image/jpeg",
      "nombreImagen": "foto.jpg",
      "urlImagen": "http://localhost:9096/mis-productos/v1/imagenes/file/3855830153700593542",
      "principal": true
    },
    {
      "id": "7565125362907238017",
      "extension": "image/jpeg",
      "nombreImagen": "foto2.jpg",
      "urlImagen": "http://localhost:9096/mis-productos/v1/imagenes/file/7565125362907238017",
      "principal": false
    }
  ],
  "pagina": 1,
  "totalPaginas": 2,
  "totalImagenes": 10
}
```

**Cómo mostrar cada imagen en el front:**
```html
<img [src]="imagen.urlImagen" />
```

**Cómo navegar páginas:**
```
GET .../listar/265?pagina=1&size=8   ← primera página
GET .../listar/265?pagina=2&size=8   ← siguiente página
```

**Diferencia clave:**
- Ya no vienen bytes embebidos (`image: "base64..."`) — el front usa `urlImagen` directamente
- El campo `id` es **string** (no number) — JS no puede representar estos IDs como Number sin perder precisión
- `principal: true` indica cuál es la imagen principal del producto

---

### 18. DetalleProductoComponent — eliminar imágenes

#### Versión anterior — `DELETE /imagen/v3/{productoId}/imagenes` ❌ Deprecated (proyecto-key 9091)

**Request:**
```
DELETE http://localhost:9091/mis-productos/imagen/265/imagenes
Authorization: Bearer <token>
Content-Type: application/json

["3855830153700593542", "7565125362907238017"]
```

**Response 200:**
```json
{ "data": "Imágenes eliminadas correctamente" }
```

---

#### Versión nueva — `DELETE /imagen/v1/{productoId}/imagenes` ✅ Usar esta (proyecto-key 9091)

**Request:**
```
DELETE http://localhost:9091/mis-productos/imagen/v1/265/imagenes
Authorization: Bearer <token>
Content-Type: application/json

["3855830153700593542", "7565125362907238017"]
```

**Response 200:**
```json
{ "data": "Imágenes eliminadas correctamente" }
```

**Diferencia clave:** verifica si la imagen es compartida con otras variantes antes de borrarla del disco — si la comparte, solo borra la relación del producto sin borrar el archivo.

> **Nota:** los IDs se mandan como strings (igual que vienen del `listar`).

---

---

## LISTADO DE VARIANTES — `/variantes/buscar`

**Endpoint:** `GET http://localhost:9091/mis-productos/variantes/buscar?termino=&pagina=1&size=10`

**Response 200:**
```json
{
  "data": {
    "pagina": 1,
    "totalPaginas": 3,
    "totalRegistros": 25,
    "t": [
      {
        "id": 5,
        "talla": "M",
        "descripcion": "Pantalón slim",
        "color": "Azul",
        "presentacion": null,
        "stock": 10,
        "marca": "...",
        "contenidoNeto": null,
        "imagenBase64": null,
        "imagenUrl": "http://localhost:9096/mis-productos/v1/imagenes/file/7305237692097776164",
        "precio": 99.99,
        "codigoBarras": "...",
        "nombreProducto": "Jeans Slim"
      }
    ]
  }
}
```

**Claves para el front:**
- La imagen viene en `data.t[i].imagenUrl` — no en `imagenBase64` (siempre `null`)
- `imagenUrl` es una URL completa a bytes directos: usar `<img [src]="variante.imagenUrl">`
- Si `imagenUrl` es `null` → la variante no tiene imagen asignada
- La lista de variantes está en `data.t` (no `data.content`, no `data.items`)
- Paginación: `data.pagina`, `data.totalPaginas`, `data.totalRegistros`
- El back selecciona la imagen marcada como principal; si ninguna lo es, usa la primera disponible

---

## RESUMEN POR COMPONENTE

> Referencia rápida para el equipo de front — qué endpoint usa cada componente.

---

### UpdateComponent (editar producto)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar imágenes del producto | GET | `http://localhost:9096/mis-productos/v1/producto-imagen/listar/{productoId}?pagina=1&size=8` | — |
| Ver bytes de una imagen | GET | `http://localhost:9096/mis-productos/v1/imagenes/file/{imagenId}` | — |
| Eliminar una imagen | DELETE | `http://localhost:9096/mis-productos/v1/producto-imagen/{imagenId}` | — |
| Marcar imagen como principal | PUT | `http://localhost:9096/mis-productos/v1/producto-imagen/{id}/principal` | — |

> `imagenId` viene del campo `id` (string) del response de `listar`.

---

### DetalleProductoComponent (detalle y carrusel del producto)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar imágenes del producto | GET | `http://localhost:9096/mis-productos/v1/producto-imagen/listar/{productoId}?pagina=1&size=8` | — |
| Ver bytes de una imagen | GET | usar `urlImagen` del response de `listar` directamente en `<img [src]>` | — |
| Eliminar imágenes seleccionadas (batch) | DELETE | `http://localhost:9091/mis-productos/imagen/v1/{productoId}/imagenes` | `["imagenId1", "imagenId2"]` |

---

### LoginFormComponent / AddUsuariosComponent (imágenes de login/registro)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar imágenes por tipo | GET | `http://localhost:9091/mis-productos/presentacion/v1/imagenes?tipo=LOGIN` | — |
| Ver bytes de una imagen | GET | usar `urlImagen` del response directamente en `<img [src]>` | — |

---

### PresentacionImagenesComponent (admin — imágenes de presentación)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar todas (activas e inactivas) | GET | `http://localhost:9091/mis-productos/presentacion/v1/imagenes/todas` | Bearer token ADMIN |
| Actualizar imagen/descripción | PUT | `http://localhost:9091/mis-productos/presentacion/v1/imagenes/{id}` | `{ base64, extension, nombreImagen, descripcion, activo }` |

---

### DetalleVarianteComponent / UpdateVarianteComponent (imágenes de variante)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar imágenes de variante | GET | `http://localhost:9091/mis-productos/variantes/v1/imagenes/{varianteId}` | — |
| Eliminar imágenes específicas | DELETE | `http://localhost:9091/mis-productos/variantes/v1/{varianteId}/imagenes` | `[imagenId1, imagenId2]` |
| Marcar imagen como principal | PUT | `http://localhost:9091/mis-productos/variantes/imagenes/{imagenId}/principal` | — |

---

## GLOSARIO

- **@Deprecated**: el endpoint original, sin tocar, sigue funcionando
- **v1**: el endpoint activo/estable que delega al microservicio de imágenes (antes llamado "v2"; se renombró a `v1` el 2026-06-07 — ver sección "MIGRACIÓN DE VERSIONES DE URL")
- **v3**: el endpoint antiguo/deprecado (antes era la ruta sin versión, ahora vive bajo `/v3/` para no chocar con `/v1/`)
- **204 No Content**: no hay imagen disponible, no es un error
- **RabbitMQ — No aplica**: lectura síncrona, no hay eventos
- **RabbitMQ — TODO**: hay una oportunidad de usar Rabbit aquí pero aún no está implementado

---

---

## CAMBIOS DE BACKEND — 2026-05-22 — Acciones requeridas en el front

> Estos cambios ya están aplicados en el backend (rama `dev`). El front debe actualizar los componentes indicados.

---

### CAMBIO A — Listado de variantes: `imagenUrl` ahora siempre viene poblada

**Endpoint afectado:** `GET /mis-productos/variantes/buscar?termino=&pagina=1&size=10`

**Qué cambió en el back:**
Antes el back verificaba contra el microservicio de imágenes si el archivo existía en disco antes de incluir la URL. Si esa verificación fallaba (error de red, micro lento) la `imagenUrl` llegaba `null` aunque la variante tuviera imagen. Ahora el back asigna la URL directamente desde la base de datos, sin verificación extra.

**Comportamiento nuevo:**
- Si la variante tiene imágenes → `imagenUrl` siempre viene con valor
- Si la variante NO tiene ninguna imagen asignada → `imagenUrl` es `null`
- Si el archivo ya no existe en disco → el micro devuelve `204 No Content` al hacer `GET imagenes/file/{id}` (el `<img>` no muestra nada, no explota)
- La imagen seleccionada es la marcada como **principal**; si ninguna lo es, la de **id más bajo**

**Response (no cambia la estructura, cambia el valor):**
```json
{
  "data": {
    "pagina": 1,
    "totalPaginas": 3,
    "totalRegistros": 25,
    "t": [
      {
        "id": 5,
        "talla": "M",
        "descripcion": "Pantalón slim",
        "color": "Azul",
        "stock": 10,
        "marca": "Marca X",
        "imagenBase64": null,
        "imagenUrl": "http://localhost:9096/mis-productos/v1/imagenes/file/7305237692097776164",
        "precio": 99.99,
        "codigoBarras": "1234567890",
        "nombreProducto": "Jeans Slim"
      }
    ]
  }
}
```

**Acción requerida en el front:**
```html
<!-- Antes: el front no mostraba nada porque imagenUrl llegaba null -->
<!-- Ahora: usar directo como src -->
<img [src]="variante.imagenUrl" *ngIf="variante.imagenUrl" />
```

- **No usar** `imagenBase64` — siempre es `null`
- **No filtrar** por `principal` — el back ya eligió la imagen correcta
- La lista de variantes está en `response.data.t` (no `data.content` ni `data.items`)

**Componentes que deben actualizarse:**
- Cualquier componente que liste variantes con imagen (catálogo, búsqueda, etc.)

---

### CAMBIO B — Listado de productos: `urlImagen` ahora apunta directo a los bytes

**Endpoints afectados:**
- `GET /mis-productos/productos/obtenerProductos?page=1&size=10`
- `GET /mis-productos/productos/buscarNombreOrCodigoBarra?nombre=...&page=1&size=10`

**Qué cambió en el back:**
Antes `producto.imagen.urlImagen` apuntaba a `buscarImagenProducto/{productoId}` que devuelve un **JSON** (no bytes). El front tenía que llamar ese endpoint, extraer el `id` del JSON y luego llamar `/imagenes/file/{id}` para obtener los bytes.

Ahora `producto.imagen.urlImagen` apunta directamente a `/imagenes/file/{imagenId}` — **devuelve bytes**, se puede usar directo como `src` del `<img>`.

**Valor anterior de `urlImagen`:**
```
http://localhost:9096/mis-productos/producto-imagen/buscarImagenProducto/265
→ devolvía JSON: { id, imagen (base64), urlImagen (filename), contentType }
```

**Valor nuevo de `urlImagen`:**
```
http://localhost:9096/mis-productos/v1/imagenes/file/7305237692097776164
→ devuelve bytes directos (Content-Type: image/jpeg)
```

**Response de `obtenerProductos` (estructura no cambia, cambia el valor de `urlImagen`):**
```json
{
  "data": {
    "pagina": 1,
    "totalPaginas": 5,
    "totalRegistros": 48,
    "t": [
      {
        "idProducto": 265,
        "nombre": "Great Jeans",
        "color": "Azul",
        "precioVenta": 150.0,
        "descripcion": "...",
        "codigoBarras": "...",
        "stock": 10,
        "imagen": {
          "urlImagen": "http://localhost:9096/mis-productos/v1/imagenes/file/7305237692097776164"
        }
      }
    ]
  }
}
```

**Acción requerida en el front:**
```html
<!-- Antes: llamar buscarImagenProducto, extraer id, luego llamar /imagenes/file/{id} -->
<!-- Ahora: usar directo -->
<img [src]="producto.imagen?.urlImagen" *ngIf="producto.imagen?.urlImagen" />
```

- Si el producto **no tiene imagen asignada** → `imagen.urlImagen` es `null` (o `imagen` puede ser un objeto con `urlImagen: null`)
- Si el archivo no existe en disco → micro devuelve `204`, el `<img>` no muestra nada
- **Eliminar** toda lógica que llame `buscarImagenProducto` para obtener la imagen del listado

**Componentes que deben actualizarse:**
- Componente de listado/catálogo de productos
- Componente de búsqueda de productos
- Cualquier componente que use `obtenerProductos` o `buscarNombreOrCodigoBarra` y muestre imagen

---

### Resumen de acciones — tabla rápida

| Componente | Qué cambiar |
|---|---|
| Listado/catálogo de variantes | Usar `variante.imagenUrl` directo en `<img [src]>`. No filtrar por principal. |
| Listado/catálogo de productos | Usar `producto.imagen.urlImagen` directo en `<img [src]>`. Eliminar la llamada intermedia a `buscarImagenProducto`. |
| Búsqueda de productos (`buscarNombreOrCodigoBarra`) | Igual que listado de productos — misma estructura de response. |

---

### Lo que NO cambia

- Endpoints de detalle de imágenes de variante: `GET /variantes/v1/imagenes/{varianteId}` — sin cambios (renombrado de `v2` a `v1`, ver sección "MIGRACIÓN DE VERSIONES DE URL")
- Endpoints de imágenes de producto en detalle: `GET /producto-imagen/listar/{productoId}` — sin cambios
- Endpoints de eliminación y marcado de principal — sin cambios
- Estructura general del response (`data.t`, `data.pagina`, etc.) — sin cambios

---

## CAMBIOS INTERNOS — RabbitMQ + Caché (sin impacto en el contrato de API)

> **El front NO necesita cambiar nada.** Request, response y URLs son exactamente los mismos.
> Estos cambios son internos: ahora cualquier escritura invalida la caché en **todos los nodos** del back
> vía RabbitMQ, en lugar de solo en el nodo que procesó el request.

### Qué cambió internamente

Antes: cada método de escritura usaba `@CacheEvict` con una lista de caches específicas. Si el back corría en varios nodos, solo el nodo que recibía el request limpiaba su caché — los otros seguían sirviendo datos viejos.

Ahora: cualquier escritura hace dos cosas:
1. Llama a `CacheService.evictAll()` → limpia **todas** las caches del nodo actual
2. Publica un evento `cache.evict.all` a RabbitMQ → todos los demás nodos reciben el evento y también limpian sus caches

---

### Endpoints afectados (mismo contrato, nuevo comportamiento de caché)

#### Imágenes de producto

| Método | URL | Comportamiento visible para el front |
|--------|-----|--------------------------------------|
| `DELETE` | `/imagen/v1/{imagenId}` | Sin cambio — sigue eliminando la imagen y respondiendo 200 |
| `PUT` | `/presentacion/v1/imagenes/{id}` | Sin cambio — sigue actualizando y devolviendo `ImagenPresentacionDto` |
| `GET` | `/imagen/v1/cache/limpiar` | Sin cambio en response — ahora también notifica a los demás nodos vía Rabbit |

#### Productos

| Método | URL | Comportamiento visible para el front |
|--------|-----|--------------------------------------|
| `POST` | `/productos/save` | Sin cambio en request/response |
| `PUT` | `/productos/update` | Sin cambio en request/response |
| `DELETE` | `/productos/deleteBy/{id}` | Sin cambio en request/response |
| `PUT` | `/productos/{id}/habilitar?habilitar=` | Sin cambio en request/response |

#### Pedidos

| Método | URL | Comportamiento visible para el front |
|--------|-----|--------------------------------------|
| `POST` | `/pedidos/savePedido` | Sin cambio en request/response |
| `PUT` | `/pedidos/confirmar/{id}` | Sin cambio en request/response |
| `DELETE` | `/pedidos/delete/{id}?motivo=` | Sin cambio en request/response |
| `DELETE` | `/pedidos/{pedidoId}/detalle/{productoId}?cantidad=` | Sin cambio en request/response |

#### Ventas

| Método | URL | Comportamiento visible para el front |
|--------|-----|--------------------------------------|
| `POST` | `/ventas/save` | Sin cambio en request/response |

#### Palabras clave

| Método | URL | Comportamiento visible para el front |
|--------|-----|--------------------------------------|
| `POST` | `/palabras-clave/save` | Sin cambio en request/response |
| `PUT` | `/palabras-clave/update/{id}` | Sin cambio — el `save` del servicio base ahora evicta caché + Rabbit |
| `DELETE` | `/palabras-clave/delete` | Sin cambio — igual |

#### Admin — limpieza de caché

| Método | URL | Qué hace | Cambio |
|--------|-----|----------|--------|
| `DELETE` | `/admin/cache` | Limpia todas las caches de Spring | Ahora también notifica vía Rabbit a los demás nodos. Response sin cambio: devuelve lista de caches limpiadas. |

---

### Acción requerida por el front

**Ninguna.** Todos los endpoints mantienen el mismo método HTTP, URL, request body y response.

El único beneficio observable es que después de cualquier escritura, **todos los nodos** del back sirven datos actualizados — elimina el caso donde el front veía datos viejos al refrescar si era atendido por un nodo diferente.

---

## CAMBIOS INTERNOS — micro_imagenes ahora también evicta caché vía Rabbit

> **El front NO necesita cambiar nada.** Este cambio es interno a micro_imagenes (puerto 9096).

### Qué cambió

`micro_imagenes` ahora escucha el evento `cache.evict.all` de RabbitMQ.

Antes: cuando `proyecto-key` publicaba `cache.evict.all`, solo los nodos de `proyecto-key` limpiaban su caché. `micro_imagenes` no se enteraba y podía seguir sirviendo datos cacheados viejos (imágenes de productos que ya no existen, listas de imágenes desactualizadas).

Ahora: cuando se publica `cache.evict.all`:
1. Los nodos de `proyecto-key` limpian su caché (como antes)
2. Los nodos de `micro_imagenes` también limpian su caché (nuevo)

### Implementación

- **Cola nueva en micro_imagenes:** `queue.cache.evict.all.imagenes` — cola propia, separada de la de proyecto-key, vinculada al mismo `exchange.imagenes` con la misma routing key `cache.evict.all`. Esto garantiza que ambos servicios reciban el mismo mensaje (no compiten por él).
- **Listener:** `ImagenRabbitConsumer.evictAllCache()` — limpia todas las caches de Redis en el nodo de micro_imagenes que recibe el mensaje.

### Cuándo se dispara

Los mismos eventos que ya existían en proyecto-key (POST producto, PUT producto, DELETE producto, POST pedido, etc.) ahora también limpian la caché de micro_imagenes automáticamente.

---

## CAMBIOS INTERNOS — Guardar relaciones producto-imagen ahora es asíncrono vía Rabbit

> **El front NO necesita cambiar nada.** Request, response y URLs son exactamente los mismos.

### Qué cambió

Cuando se guarda o actualiza un producto con imágenes, el paso de registrar la relación `productoId → imagenId` en micro_imagenes ahora es **asíncrono vía RabbitMQ** en vez de una llamada HTTP síncrona.

**Flujo anterior:**
```
Front → POST /productos/save
    └─► sube bytes al micro (HTTP multipart) → obtiene imagenIds
    └─► POST producto-imagen/saveAll (HTTP síncrono) → micro_imagenes registra la relación
    ← 200 OK  (todo en la misma llamada)
```

**Flujo nuevo:**
```
Front → POST /productos/save
    └─► sube bytes al micro (HTTP multipart) → obtiene imagenIds
    └─► publica a queue.guardar.imagenes (Rabbit, fire-and-forget)
    ← 200 OK  (respuesta inmediata, sin esperar al micro)
              ...micro_imagenes recibe el mensaje y registra la relación en segundo plano
```

### Garantías
- Si micro_imagenes está caído cuando se guarda el producto, el mensaje **queda encolado** en Rabbit y se procesa cuando el micro levanta — no se pierde
- Si el procesamiento falla → NACK → va a `dlq.guardar.imagenes` (Dead Letter Queue) para inspección manual

### Dónde se ve el cambio en el front (cómo probarlo)

1. Ve al panel admin → crear nuevo producto → sube una imagen → guarda
2. El 200 OK llega **más rápido** que antes (ya no espera la confirmación del micro)
3. Espera 1-2 segundos → ve al listado de productos → la imagen ya aparece
4. **Caso de falla simulada:** si micro_imagenes está abajo al guardar, el producto se crea igual y la imagen aparece en cuanto micro_imagenes vuelve a estar activo

---

## CAMBIOS INTERNOS — Eliminar imágenes ahora es asíncrono vía Rabbit

> **El front NO necesita cambiar nada.** Mismos endpoints, mismo request, mismo response.

### Qué cambió

Las dos operaciones de eliminación de imágenes que antes hacían HTTP síncrono a micro_imagenes ahora publican a RabbitMQ:

| Operación | Queue | Qué hace micro_imagenes al recibirlo |
|---|---|---|
| Eliminar imágenes por ID | `queue.eliminar.imagenes` | Borra el archivo del disco + el registro de BD por cada ID |
| Eliminar archivos del disco | `queue.eliminar.imagenes.disco` | Borra solo los archivos del disco (sin tocar BD) |

Ambas colas tienen Dead Letter Queue (`dlq.eliminar.imagenes`, `dlq.eliminar.imagenes.disco`) — si el procesamiento falla, el mensaje va al DLQ en vez de perderse o reintentar infinitamente.

**Flujo anterior:**
```
Front → DELETE producto/variante
    └─► DELETE /imagenes?ids=... (HTTP síncrono a micro_imagenes)
    ← 200 OK  (espera a que el micro confirme la eliminación)
```

**Flujo nuevo:**
```
Front → DELETE producto/variante
    └─► publica ids a queue.eliminar.imagenes (Rabbit, fire-and-forget)
    ← 200 OK  (respuesta inmediata)
              ...micro_imagenes recibe el mensaje y elimina archivos + BD en segundo plano
```

### Dónde se ve el cambio en el front (cómo probarlo)

**Caso 1 — Eliminar imagen de un producto:**
1. Ve al panel admin → editar producto → elimina una imagen → guarda
2. El 200 OK llega más rápido que antes
3. Recarga el detalle del producto → la imagen ya no aparece

**Caso 2 — Eliminar un producto completo:**
1. Ve al panel admin → listado de productos → elimina un producto
2. El producto desaparece del listado inmediatamente
3. Las imágenes asociadas se eliminan del disco del micro en segundo plano — si entras al diagnóstico de imágenes del producto antes de que procese, puede que aún aparezcan brevemente

**Caso 3 — Eliminar imagen de una variante:**
1. Ve al panel admin → variantes → selecciona una variante → elimina imágenes → guarda
2. Las imágenes desaparecen del listado de esa variante en el siguiente request

### Dónde se ve el cambio en el front (cómo probarlo)

**Caso 1 — Imagen de producto:**
1. Ve al panel admin → editar producto → cambia o elimina la imagen principal → guarda
2. Ve al catálogo/listado de productos (sin recargar manualmente el front)
3. **Antes:** la imagen vieja seguía apareciendo hasta que expiraba el TTL de 30 min
4. **Ahora:** la imagen actualizada aparece de inmediato en el siguiente request al listado

**Caso 2 — Banner de login/registro:**
1. Ve al panel admin → Imágenes de presentación → selecciona el banner de LOGIN → cambia la imagen → guarda
2. Abre otra pestaña y ve a la pantalla de login
3. **Antes:** el banner viejo seguía apareciendo (caché de micro_imagenes no se limpiaba)
4. **Ahora:** el banner nuevo aparece de inmediato

**Caso 3 — Eliminar imagen de variante:**
1. Ve al panel admin → variantes → selecciona una variante → elimina una imagen → guarda
2. Ve al listado de variantes o al detalle de esa variante
3. **Antes:** la imagen eliminada podía seguir apareciendo en caché
4. **Ahora:** el listado ya no incluye esa imagen en el siguiente request

---

## Optimizaciones internas N+1 — 2026-06-09

### Qué se hizo
Se corrigieron problemas de N+1 en JPA/Hibernate en `proyecto_key_new`. Los contratos de API **no cambian** — mismo request, mismo response. Solo mejora el rendimiento y la estabilidad interna.

### Endpoints a probar (pruebas de regresión)

#### 1. Módulo Rifa — GanadorRifaController (`/v1/ganadorRifa`)

| Endpoint | Método | Qué probar |
|----------|--------|-----------|
| `/v1/ganadorRifa/sortear/{configurarRifaId}` | POST | Ejecutar un sorteo completo, verificar que devuelve ganador y variante |
| `/v1/ganadorRifa/continuarVariante/{configurarRifaId}?modo=RESTANTES` | POST | Continuar variante con modo RESTANTES/CERO/NUEVOS, verificar que el historial queda bien |
| `/v1/ganadorRifa/estado/{configurarRifaId}` | GET | Obtener estado de la rifa activa, verificar que trae variante actual, elegibles y descartados |
| `/v1/ganadorRifa/reiniciar/{configurarRifaId}` | POST | Reiniciar rifa con `completo=false` y `completo=true`, verificar que limpia ganadores e historial |

**Qué cambió internamente:**
- `sortear()` y `continuarVariante()`: las variantes de rifa ahora se cargan con sus variantes de producto y producto en una sola query (antes era 1+N+N)
- `continuarVariante()`: los ganadores anteriores se cargan con `concursante` y `configurarRifaVariante` en una sola query (antes era 1+N+N)
- `reiniciar()`: usa DELETE directo en BD en vez de cargar todos los registros y borrarlos uno a uno (antes era 1+N queries de SELECT + N de DELETE)

---

#### 2. Módulo Variantes de Rifa — ConfigurarRifaVarianteController (`/v1/configurarRifaVariante`)

| Endpoint | Método | Qué probar |
|----------|--------|-----------|
| `GET /v1/configurarRifaVariante/porRifa/{rifaId}` | GET | Listar variantes de una rifa, verificar que devuelve variante con nombre de producto incluido |

**Qué cambió internamente:**
- `listarPorRifa()`: carga variantes con su `Variante` y el `Producto` asociado en una sola query (antes era 1+N+N)

---

#### 3. Módulo Productos — ProductosController (`/v1/productos`)

| Endpoint | Método | Qué probar |
|----------|--------|-----------|
| `POST /v1/productos/compartir-imagenes-variantes` | POST | Compartir imágenes de un producto a todas sus variantes, verificar que todas las variantes reciben las imágenes |

**Qué cambió internamente:**
- `compartirImagenesVarianteDto()`: las imágenes del producto se cargan con JOIN FETCH incluyendo el objeto `Imagen` completo (antes era N queries extras en el loop doble)

---

### micro_imagenes — sin cambios
No se modificó ningún archivo de `micro_imagenes`. No requiere pruebas adicionales.

---

## Rifa Mensual — nuevos campos y endpoints (2026-06-11)

Diseño completo en `RIFA_MENSUAL_PROPUESTA.md`. Todos los endpoints son **ADMIN** (`/v1/configurarRifa/**`, `/v1/concursante/**`).

### 1. `ConfigurarRifa` — 3 campos nuevos (opcionales, no rompen lo existente)

Afecta a: `POST /v1/configurarRifa/save`, `PUT /v1/configurarRifa/update/{id}`, `GET /v1/configurarRifa/activas`, `GET /v1/configurarRifa/activas/hoy`, `GET /v1/configurarRifa/buscar`, `GET /v1/ganadorRifa/estado/{id}` (dentro de `configurarRifa`).

**Campos nuevos:**
- `tipo`: `"MENSUAL"` | `"DIARIA"` | `null` (rifas viejas quedan `null`)
- `mesReferencia`: `"YYYY-MM"` | `null` — solo informativo, de qué mes son los participantes
- `esPrueba`: `boolean`, default `false`

**Request** (`save`/`update`, campos nuevos opcionales):
```json
{
  "fechaHoraLimite": "2026-07-01T20:00:00",
  "activa": true,
  "tipo": "MENSUAL",
  "mesReferencia": "2026-06",
  "esPrueba": false
}
```

**Response** (`/activas`, `/activas/hoy`, `/buscar`) — 3 campos nuevos al final:
```json
{
  "id": 9,
  "fechaHoraLimite": "2026-07-01T20:00:00",
  "activa": true,
  "totalVariantes": 2,
  "variantesSorteadas": 0,
  "tipo": "MENSUAL",
  "mesReferencia": "2026-06",
  "esPrueba": false
}
```

Si `esPrueba: true`, el front debe mostrar un aviso tipo **"⚠️ Esta rifa es de prueba"**.

---

### 2. `PUT /v1/configurarRifa/{id}/esPrueba` — 🆕 toggle modo prueba

**Request:**
```json
{ "esPrueba": false }
```

**Response:** entidad `ConfigurarRifa` completa (incluye `id`, `esPrueba`, `activa`, `variantes`, etc.)

**⚠️ Efecto al pasar de `true` → `false`** (botón "Pasar a sorteo real"):
- Borra los giros de la demo (`ganador_rifa` + `historial_rifa_variante` de esa rifa)
- Todos los concursantes vuelven a estar elegibles (`descartado=false`), incluidos los agregados durante la prueba
- Reactiva la rifa (`activa=true`)

Al pasar de `false` → `true` (botón "Modo demo") solo cambia el flag, no borra nada.

**Error 400** si el `id` no existe: `{ "mensaje": "Configuración de rifa no encontrada" }`

---

### 3. `GET /v1/configurarRifa/buscar` — 🆕 nuevo endpoint

**Request:** `GET /v1/configurarRifa/buscar?desde=2026-06-25&hasta=2026-06-30` (rango de días por `fechaHoraLimite`)
o `GET /v1/configurarRifa/buscar?tipo=MENSUAL&mesReferencia=2026-06` (rifas mensuales de ese mes)
o combinaciones de `desde`, `hasta`, `tipo`, `mesReferencia`.

**Sin parámetros**: devuelve lo mismo que `/activas/hoy` (rifas activas con `fechaHoraLimite` de hoy).

**Response:** `List<ConfigurarRifaResumenDto>`, mismo formato que `/activas` (ver sección 1).

---

### 4. `Concursante` — campo nuevo `agregadoEnPrueba`

Afecta a: `GET /v1/concursante/porRifa/{id}`, `GET /v1/concursante/elegibles/{id}`, `GET /v1/ganadorRifa/estado/{id}` (dentro de `elegibles`/`descartados`).

**Campo nuevo:** `agregadoEnPrueba: boolean` — `true` si el concursante se registró mientras la rifa estaba en `esPrueba=true`.

Con esto el front puede mostrar **2 listas**:
- Participantes normales (`agregadoEnPrueba=false`)
- Agregados durante la prueba (`agregadoEnPrueba=true`)

Al pasar a sorteo real (toggle `esPrueba→false`, sección 2) estos concursantes **siguen participando** — el flag es solo informativo para el admin.

---

### 5. `POST /v1/concursante/importarDePedidos` — ⚠️ cambia el `response`

**Request:** sin cambios —
```json
{
  "configurarRifaId": 9,
  "palabraClave": "BOLSA",
  "ordenDesde": 1,
  "mes": "2026-06",
  "clientes": [
    { "clientePedidoId": 102, "nombre": "Carlos Ruiz", "telefono": "555...", "sinRegistro": false }
  ]
}
```

**Response — ANTES** era `List<Concursante>` directo. **AHORA:**
```json
{
  "importados": [
    { "id": 201, "nombre": "María López", "palabraClave": "BOLSA", "agregadoEnPrueba": false }
  ],
  "omitidosYaRegistrados": [
    { "clientePedidoId": 102, "nombre": "Carlos Ruiz", "telefono": "555...", "sinRegistro": false }
  ]
}
```

**Diferencia clave:** si un `clientePedidoId` ya estaba registrado como concursante en esa misma rifa
(ej. el admin dio clic 2 veces en "importar"), ya **no se duplica** — se omite y aparece en
`omitidosYaRegistrados` para que el front avise "estos N ya estaban registrados".

---

### 6. `DELETE /v1/concursante/{id}` — 🆕 nuevo endpoint

Reemplaza usar `DELETE /v1/concursante/delete` (genérico, requiere el id en el body) para este caso.

**Response OK (200):**
```json
{ "data": "Concursante eliminado" }
```

**Response error (400)** — si el concursante ya participó en algún giro (`ganador_rifa`):
```json
{ "mensaje": "No se puede eliminar: el concursante ya participó en un sorteo" }
```

---

### 7. `PUT /v1/concursante/{id}` — 🆕 nuevo endpoint (body parcial)

Reemplaza usar `PUT /v1/concursante/update/{id}` (genérico, exige el objeto `Concursante` completo) para este caso.

**Request** (todos los campos opcionales, solo se actualizan los que vengan):
```json
{
  "nombre": "Juan",
  "apellidoPaterno": "García",
  "telefono": "5551234567",
  "palabraClave": "BOLSA",
  "ordenDesde": 1
}
```

**Response (200):** entidad `Concursante` actualizada completa.

`boletos`, `boletosBase`, `descartado`, `agregadoEnPrueba`, `clientePedidoId` y `configurarRifa`
**no se pueden modificar** desde este endpoint.

---

### 8. Cambio interno — fórmula de "boletos" (sin cambio de contrato)

`boletosBase`/`boletos` (campos ya existentes en `Concursante`, visibles en `/porRifa`, `/elegibles`,
`/estado`) ahora se calculan por **cantidad de productos comprados** en el mes
(`SUM(detalle_pedidos.cantidad)` de pedidos `Entregado`), antes era por **número de pedidos**. No
cambia ningún endpoint ni nombre de campo — solo el valor numérico que puede llegar a tener un
concursante. No mostrar estos campos en pantallas proyectadas al público.

---

## Rifa por Día (`tipo="DIARIA"`) — reutiliza todo lo de arriba (2026-06-11)

Diseño en `RIFA_DIARIA_PROPUESTA.md`. **No hay endpoints nuevos.** La diaria usa el mismo backend que
la rifa mensual (sección anterior) — solo cambia el `tipo` y cómo se agregan los participantes.

### 1. Crear la sesión del día

`POST /v1/configurarRifa/save`
```json
{ "fechaHoraLimite": "2026-06-11T20:00:00", "activa": true, "tipo": "DIARIA", "esPrueba": false }
```
`mesReferencia` se deja `null` (no aplica para diaria).

---

### 2. Agregar participantes — uno por uno (no hay importación en bloque)

**Caso A — cliente ya registrado en la app:**
`GET /v1/clientes/buscar?nombre=Maria` (🟢 endpoint ya existente, no es de rifas) →
`ClienteBusquedaDto` con `nombrePersona`, `apeidoPaterno`, `numeroTelefonico`. El front toma esos
datos y los manda al paso siguiente.

**Caso B — persona sin registro:** el front captura los datos a mano.

En ambos casos:
`POST /v1/concursante/registrar`
```json
{ "nombre": "Maria", "apellidoPaterno": "Lopez", "telefono": "555...",
  "palabraClave": "BOLSA", "configurarRifa": { "id": 12 } }
```

**⚠️ Importante:** NO enviar `clientePedidoId` en la diaria → `boletos` queda en `1` para todos
(misma probabilidad para cada participante). Si se envía `clientePedidoId`, el back calculará
`boletos` por compras del mes (igual que en mensual) — no usar ese campo aquí salvo que se pida lo
contrario.

---

### 3. Resto del flujo — igual que mensual

- Editar / eliminar: `PUT` / `DELETE /v1/concursante/{id}` (sección 6 y 7 de arriba)
- Modo prueba: `PUT /v1/configurarRifa/{id}/esPrueba` (sección 2 de arriba) — mismo banner
  "⚠️ Esta rifa es de prueba"
- Ver participantes / separar en 2 listas: `GET /v1/concursante/porRifa/{id}` → `agregadoEnPrueba`
  (sección 4 de arriba)
- Traer la rifa de hoy: `GET /v1/configurarRifa/activas/hoy` — ya devuelve **cualquier** `tipo`
  activo hoy, incluida la diaria, sin que el front tenga que filtrar
- Buscar una rifa diaria de otro día: `GET /v1/configurarRifa/buscar?tipo=DIARIA&desde=&hasta=`
- Sorteo: `sortear` / `continuarVariante` / `estado` — mismo motor que mensual

---

## Rifa — modo prueba ya no se "cierra" tras el sorteo (2026-06-13)

### Qué cambió
- **Antes:** al sortear el ganador de la última variante, el backend ponía `activa=false` en la rifa
  **sin importar `esPrueba`**. Eso rompía el flujo de pruebas: para repetir la prueba había que
  `reiniciar` y, además, si se volvía a mandar `POST /configurarRifaVariante/save` con la misma
  `palabraClave`, daba error `"La palabraClave 'X' ya existe en esta rifa"`.
- **Ahora:**
  - Si `esPrueba: true`, la rifa **se mantiene `activa: true`** aunque ya se haya sorteado el
    ganador de la última variante. `rifaTerminada` (en `/sortear` y `/estado`) sigue marcando
    correctamente cuándo terminó el ciclo — no depende de `activa`.
  - `POST /v1/configurarRifaVariante/save`: si `esPrueba: true` y la `palabraClave` ya existe en
    esa rifa, **ya no rechaza** — actualiza la configuración existente (`giroGanador`, `orden`,
    `permitirNuevos`, y la variante/stock si se cambió de variante). Mismo `request`/`response`
    de siempre.
  - Si `esPrueba: false` (rifa real), el comportamiento **no cambia**: al terminar se pone
    `activa: false`, y reusar una `palabraClave` ya configurada en esa rifa sigue dando
    `"ya existe en esta rifa"`.

### Qué debe hacer el front
- **Nada obligatorio, es retrocompatible.** Mientras `esPrueba: true`, el admin puede:
  - Repetir `sortear` tras `POST /v1/ganadorRifa/reiniciar/{id}?completo=true|false` cuantas veces
    quiera, sin que la rifa se "cierre" (`activas`/`activas/hoy` la sigue listando).
  - Re-mandar `POST /configurarRifaVariante/save` con la misma `palabraClave` para "recargar" la
    config de la variante de prueba — ya no da error.
- Cuando el admin haga `PUT /v1/configurarRifa/{id}/esPrueba` con `{ "esPrueba": false }`
  ("Pasar a sorteo real"), la `ConfigurarRifaVariante` y su `palabraClave` configuradas durante las
  pruebas **se conservan** y se usan tal cual para el sorteo real (no hay que volver a crearlas).
  A partir de ahí aplica el comportamiento de rifa real descrito arriba.

---

## Catálogo de errores — endpoints de Rifas (2026-06-13)

### Formato de error
Todos los endpoints de Rifas que validan reglas de negocio (todos excepto los `GET` simples)
responden, cuando algo falla:

```
HTTP 400 Bad Request
{
  "mensaje": "<texto del error, mostrar tal cual al usuario>",
  "code": 404,
  "data": null,
  "lista": null
}
```

⚠️ **`code: 404` es un valor fijo** del helper `ResponseGeneric` (no significa "no encontrado" en
sentido HTTP). Para detectar error el front debe usar el **status HTTP 400** y/o `data === null`,
y mostrar el texto de `mensaje`.

### `POST /v1/configurarRifaVariante/save`
| `mensaje` | Causa |
|---|---|
| `Rifa no encontrada` | `configurarRifaId` no existe |
| `La rifa no está activa` | `activa=false` (rifa real ya cerrada) |
| `La palabraClave 'X' ya existe en esta rifa` | solo si `esPrueba=false` y otra variante de la rifa ya usa esa `palabraClave` |
| `Variante no encontrada` | `varianteId` no existe |
| `La variante no tiene stock disponible` | `stock < 1` en la variante |

### `DELETE /v1/configurarRifaVariante/{id}`
| `mensaje` | Causa |
|---|---|
| `Configuración de variante no encontrada` | `id` no existe |

### `PUT /v1/configurarRifaVariante/{id}/palabraClave`
| `mensaje` | Causa |
|---|---|
| `Configuración de variante no encontrada` | `id` no existe |
| `La palabraClave ya existe en esta rifa` | otra variante de la misma rifa ya usa esa `palabraClave` |

### `PUT /v1/configurarRifa/{id}/esPrueba`
| `mensaje` | Causa |
|---|---|
| `Configuración de rifa no encontrada` | `id` no existe |

### `POST /v1/concursante/registrar?forzar=`
| `mensaje` | Causa |
|---|---|
| `El nombre es requerido` | falta `nombre` (validación de campo) |
| `Debe indicar la configuración de rifa` | falta `configurarRifa.id` en el body |
| `Configuración de rifa no encontrada` | `configurarRifa.id` no existe |
| `Esta rifa ya fue sorteada o está inactiva` | `activa=false` |
| `El plazo de registro cerró el {fechaHoraLimite}` | ya pasó `fechaHoraLimite` y `forzar=false` (default) — reintentar con `?forzar=true` si el admin quiere forzar el registro |

### `POST /v1/concursante/importarDePedidos`
| `mensaje` | Causa |
|---|---|
| `Configuración de rifa no encontrada` | `configurarRifaId` no existe |
| `Esta rifa no está activa` | `activa=false` |

### `DELETE /v1/concursante/{id}`
| `mensaje` | Causa |
|---|---|
| `Concursante no encontrado` | `id` no existe |
| `No se puede eliminar: el concursante ya participó en un sorteo` | tiene un registro en `ganador_rifa` |

### `PUT /v1/concursante/{id}`
| `mensaje` | Causa |
|---|---|
| `Concursante no encontrado` | `id` no existe |

### `POST /v1/ganadorRifa/sortear/{configurarRifaId}`
| `mensaje` | Causa |
|---|---|
| `Configuración de rifa no encontrada` | `configurarRifaId` no existe |
| `Esta rifa ya fue completada o está inactiva` | `activa=false` |
| `La rifa no tiene variantes configuradas` | la rifa no tiene ninguna `configurarRifaVariante` |
| `Todas las variantes ya fueron sorteadas` | ya hay un ganador declarado por cada variante |
| `No hay concursantes elegibles para la variante con palabraClave='X'` | nadie con esa `palabraClave` y `descartado=false` |

### `POST /v1/ganadorRifa/continuarVariante/{configurarRifaId}?modo=`
| `mensaje` | Causa |
|---|---|
| `Rifa no encontrada` | `configurarRifaId` no existe |
| `No hay siguiente variante` | ya se sortearon todas las variantes |
| `Modo inválido: X. Usar RESTANTES, CERO o NUEVOS` | `modo` no es uno de los 3 valores válidos |

### `GET /v1/ganadorRifa/estado/{configurarRifaId}`
| `mensaje` | Causa |
|---|---|
| `Rifa no encontrada` | `configurarRifaId` no existe |

### `POST /v1/ganadorRifa/reiniciar/{configurarRifaId}?completo=`
| `mensaje` | Causa |
|---|---|
| `Rifa no encontrada` | `configurarRifaId` no existe |

**Response OK (200)** de `reiniciar`:
```json
{ "data": "Rifa reiniciada completamente (concursantes eliminados)" }
```
o, con `completo=false`:
```json
{ "data": "Rifa reiniciada (concursantes conservados)" }
```

---

## Autenticación — token expirado/ausente ahora responde 401 (antes 403) (2026-06-13)

**Causa del bug:** `SecurityConfig` no tenía configurado un `AuthenticationEntryPoint`, así que
Spring Security usaba el fallback por defecto (`Http403ForbiddenEntryPoint`). Esto hacía que
**cualquier request sin autenticación válida** (token ausente, corrupto o **expirado**) devolviera
**403 Forbidden** en vez de **401 Unauthorized**. Si el interceptor del front solo dispara el
refresh ante un **401**, nunca se enteraba de que el access token expiró — el request fallaba con
un 403 "seco" y ahí quedaba.

**Cambio:**
- **401 Unauthorized** → no autenticado: token ausente, inválido o **expirado**.
  Body: `{ "mensaje": "Token inválido o expirado", "code": 404, "data": null, "lista": null }`
  → el front debe intentar `/v1/auth/refresh` y reintentar el request original.
- **403 Forbidden** → autenticado correctamente pero sin el rol requerido (ej. usuario sin
  `ROLE_ADMIN` llamando a un endpoint de admin).
  Body: `{ "mensaje": "No tiene permisos para acceder a este recurso", "code": 404, "data": null, "lista": null }`
  → el front **no** debe reintentar con refresh aquí (el token es válido, solo falta permiso).

**Acción para el front:** revisar el interceptor — el flujo de `/v1/auth/refresh` debe dispararse
ante **401**, no ante 403. Si antes "funcionaba" reintentando en 403, eso era un parche al bug
descrito arriba; ahora la expiración de token llega correctamente como 401.

---

## `POST /v1/concursante/importarDePedidos` — nuevo campo `omitidosSinNombre` (2026-06-13)

**Causa del bug:** si `clientes[]` traía una entrada `sinRegistro: true` con `nombre: ""`
(vacío), el backend intentaba guardar el `Concursante` y la validación `@NotBlank` de Hibernate
lanzaba un `ConstraintViolationException` cuyo mensaje crudo (técnico) se devolvía tal cual en
`mensaje`, y **abortaba todo el batch** — ningún concursante se importaba, ni siquiera los
válidos.

**Cambio:** las entradas sin `nombre` (vacío o solo espacios) ya **no rompen el batch**: se omiten
y se devuelven en un nuevo arreglo `omitidosSinNombre`, igual que ya pasaba con
`omitidosYaRegistrados`.

**Response — ahora:**
```json
{
  "importados": [
    { "id": 201, "nombre": "María López", "palabraClave": "BOLSA", "agregadoEnPrueba": false }
  ],
  "omitidosYaRegistrados": [
    { "clientePedidoId": 102, "nombre": "Carlos Ruiz", "telefono": "555...", "sinRegistro": false }
  ],
  "omitidosSinNombre": [
    { "clientePedidoId": null, "nombre": "", "telefono": "", "sinRegistro": true }
  ]
}
```

**Acción para el front:** si `omitidosSinNombre` no viene vacío, avisar al admin algo como
"N participante(s) sin registro no se importaron porque no tienen nombre". Si la UI permite
agregar filas de "cliente sin registro" a mano, idealmente exigir `nombre` antes de enviar para
que no terminen en este arreglo.

---

## Pitfall técnico resuelto — @Query + Page<> con subquery JPQL (2026-06-18)

**Síntoma:** endpoint de historial devuelve `{ mensajes: [], totalMensajes: 0 }` aunque en BD hay filas con datos correctos.

**Causa:** cuando `@Query` usa una subconsulta JPQL (`IN (SELECT ...)`) y el tipo de retorno es `Page<T>`, Spring Data JPA no puede derivar el COUNT automáticamente. Sin `countQuery` explícito asume `totalElements = 0` y nunca ejecuta la query real.

**Regla:** siempre que haya un `@Query` que devuelva `Page<T>` y contenga subqueries, agregar `countQuery` sin el `ORDER BY`:
```java
@Query(
    value = "SELECT m FROM ... WHERE m.sesionId IN (SELECT s.sesionId FROM ...) ORDER BY m.timestamp DESC",
    countQuery = "SELECT COUNT(m) FROM ... WHERE m.sesionId IN (SELECT s.sesionId FROM ...)"
)
Page<ChatMensaje> findBy...(Pageable pageable);
```

---

## CHAT EN VIVO — Panel Admin (acción requerida en el front) — 2026-06-17

### Problema actual
Cuando el admin selecciona una sesión en el panel, **solo ve los mensajes nuevos** que llegan en tiempo real (WebSocket). Los mensajes anteriores de esa sesión no aparecen porque el front no los está cargando.

### Endpoints de historial — paginado tipo Messenger (scroll hacia arriba carga más)

Ambos endpoints (admin y cliente) aceptan `pagina` y `size`. La carga inicial trae los últimos 20 mensajes. Cuando el usuario hace scroll arriba se pide la siguiente página.

#### Admin
```
GET /mis-productos/v1/chat/admin/historial/{sesionId}?pagina=0&size=20
Authorization: Bearer <token admin>
```

#### Cliente (público)
```
GET /mis-productos/v1/chat/historial/{sesionId}?pagina=0&size=20
```

| Param | Default | Descripción |
|---|---|---|
| `pagina` | `0` | Página a cargar. `0` = mensajes más recientes |
| `size` | `20` | Mensajes por página |

**Response** — leer `response.data`:
```json
{
  "code": 200,
  "data": {
    "mensajes": [
      { "remitente": "USUARIO", "contenido": "Hola, tengo una pregunta", "timestamp": "2026-06-17T10:00:00" },
      { "remitente": "ADMIN",   "contenido": "Claro, ¿en qué te ayudo?", "timestamp": "2026-06-17T10:00:05" }
    ],
    "pagina": 0,
    "totalPaginas": 3,
    "totalMensajes": 45,
    "hayMasAntiguos": true
  }
}
```

- `mensajes` viene ordenado **cronológico ascendente** (el más antiguo primero) — listo para renderizar de arriba a abajo
- `hayMasAntiguos: true` → mostrar botón/spinner de "cargar más" al inicio del scroll
- `id` y `sesionId` no aparecen en cada mensaje (`@JsonIgnore`)
- `remitente` es exactamente `"USUARIO"` o `"ADMIN"`
- El endpoint de cliente devuelve **403** si el `sesionId` no existe en BD

**Flujo scroll tipo Messenger:**
```typescript
// Carga inicial (mensajes más recientes)
cargarHistorial(sesionId, pagina = 0) {
  GET .../historial/{sesionId}?pagina=0&size=20
  this.mensajes = res.data.mensajes;        // renderizar
  this.hayMasAntiguos = res.data.hayMasAntiguos;
}

// Usuario hace scroll arriba → cargar página siguiente
cargarMasAntiguos() {
  if (!this.hayMasAntiguos) return;
  GET .../historial/{sesionId}?pagina={paginaActual + 1}&size=20
  this.mensajes = [...res.data.mensajes, ...this.mensajes]; // prepend
  this.hayMasAntiguos = res.data.hayMasAntiguos;
}
```

**Acción para el front — PENDIENTE:** Llamar este endpoint en DOS lugares:
1. **Panel admin:** cuando el admin hace clic en una sesión, cargar `pagina=0` y renderizar antes de recibir eventos WebSocket.
2. **Chat del cliente:** al inicializar, usar el endpoint por `clienteId` (ver sección siguiente) para ver TODA la historia entre sesiones.

---

### Historial completo del cliente a través de sesiones — `clienteId` persistente

El `sesionId` cambia cada vez que la sesión expira (5 min de inactividad). Para que el cliente vea mensajes de sesiones anteriores, el front genera un `clienteId` fijo guardado en `localStorage`.

**Generar y guardar el `clienteId` una sola vez:**
```typescript
if (!localStorage.getItem('chat_cliente_id')) {
  localStorage.setItem('chat_cliente_id', crypto.randomUUID());
}
const clienteId = localStorage.getItem('chat_cliente_id');
```

**Enviarlo al conectar** — payload de `/app/chat.conectar`:
```json
{ "tempId": "uuid-temporal", "nombreUsuario": "Juan", "clienteId": "uuid-persistente" }
```

**Endpoint de historial completo** — todas las sesiones del cliente:
```
GET /mis-productos/v1/chat/historial/cliente/{clienteId}?pagina=0&size=20
```
Público, sin token. Devuelve mensajes de **todas las sesiones** vinculadas a ese `clienteId` ordenados cronológicamente. Mismo formato de response que el historial por `sesionId` (`{ mensajes, pagina, totalPaginas, totalMensajes, hayMasAntiguos }`).

**Flujo correcto al inicializar el chat del cliente:**
```typescript
ngOnInit() {
  // 1. clienteId persiste en localStorage entre sesiones y recargas
  if (!localStorage.getItem('chat_cliente_id'))
    localStorage.setItem('chat_cliente_id', crypto.randomUUID());
  this.clienteId = localStorage.getItem('chat_cliente_id');

  // 2. Cargar toda la historia del cliente (todas las sesiones pasadas)
  this.http.get(`/v1/chat/historial/cliente/${this.clienteId}?pagina=0&size=20`)
    .subscribe(res => {
      this.mensajes = res.data.mensajes ?? [];
      this.hayMasAntiguos = res.data.hayMasAntiguos;
    });

  // 3. Conectar WebSocket mandando clienteId para vincular la nueva sesión
  this.conectarWebSocket();
}
```

> **Resumen de storage:**
> - `clienteId` → **`localStorage`** — persiste aunque se cierre el navegador, une todas las sesiones (usuarios anónimos)
> - `sesionId` → **`sessionStorage`** — solo dura la pestaña, identifica la sesión WebSocket activa

---

### Historial por usuario registrado — `usuarioId` (vinculado a la cuenta)

Para usuarios que tienen cuenta en el sistema, se puede vincular la sesión de chat a su `usuarioId` real (Integer) en lugar de un UUID anónimo. Esto permite recuperar todos sus mensajes históricos de forma confiable.

**Enviar `usuarioId` al conectar** — payload de `\app\chat.conectar`:
```json
{
  "tempId": "uuid-temporal",
  "nombreUsuario": "Juan",
  "clienteId": "uuid-persistente-localStorage",
  "usuarioId": 42
}
```
- `usuarioId` es opcional (null si el usuario no está autenticado → solo se usa `clienteId`)
- `usuarioId` es el `id` (Integer) del usuario en `usuario_modificacion`

**Endpoint de historial por usuarioId** — todas las sesiones del usuario registrado:
```
GET /mis-productos/v1/chat/historial/usuario/{usuarioId}?pagina=0&size=20
```
Público, sin token. Devuelve mensajes de **todas las sesiones** vinculadas a ese `usuarioId`, mismo formato que historial por sesión.

**Response:** igual al historial paginado:
```json
{
  "mensaje": "La peticion fue exitosa",
  "code": 200,
  "data": {
    "mensajes": [ { "remitente": "USUARIO", "contenido": "Hola", "timestamp": "2026-06-17T10:00:00" } ],
    "pagina": 0,
    "totalPaginas": 3,
    "totalMensajes": 45,
    "hayMasAntiguos": true
  }
}
```

**Flujo recomendado para usuario autenticado:**
```typescript
ngOnInit() {
  // usuarioId viene del token decodificado o del perfil del usuario autenticado
  this.usuarioId = this.authService.getCurrentUser()?.id ?? null;

  // Cargar historial del usuario (todas sus sesiones pasadas)
  if (this.usuarioId) {
    this.http.get(`/v1/chat/historial/usuario/${this.usuarioId}?pagina=0&size=20`)
      .subscribe(res => {
        this.mensajes = (res as any).data?.mensajes ?? [];
        this.hayMasAntiguos = (res as any).data?.hayMasAntiguos ?? false;
      });
  } else {
    // usuario anónimo: usar clienteId de localStorage
    const clienteId = localStorage.getItem('chat_cliente_id');
    if (clienteId) {
      this.http.get(`/v1/chat/historial/cliente/${clienteId}?pagina=0&size=20`)
        .subscribe(res => {
          this.mensajes = (res as any).data?.mensajes ?? [];
          this.hayMasAntiguos = (res as any).data?.hayMasAntiguos ?? false;
        });
    }
  }

  // Conectar WebSocket
  this.conectarWebSocket();
}
```

**UX de expiración de sesión (SESION_CERRADA):**
1. Recibir `{ tipo: "SESION_CERRADA" }` en `/topic/chat.usuario.{sesionId}`
2. Limpiar `mensajes` del componente (y `sesionId` de sessionStorage)
3. Cuando el usuario envía el siguiente mensaje:
   - Llamar de nuevo a `\app\chat.conectar` con el `usuarioId` (o `clienteId`) → recibir nuevo `sesionId`
   - Llamar al endpoint de historial (`pagina=0, size=20`) para cargar los últimos mensajes
   - Renderizar esos mensajes — el scroll hacia arriba carga páginas anteriores (`pagina=1`, `pagina=2`...)

---

---

### Endpoint de sesiones activas (para el listado del panel)

**Request:**
```
GET /mis-productos/v1/chat/admin/sesiones
Authorization: Bearer <token admin>
```

**Response:** envuelto en `ResponseGeneric` — leer `response.data`:
```json
{
  "mensaje": "La peticion fue exitosa",
  "code": 200,
  "data": [
    {
      "sesionId": "f1d0db6f-496f-4000-9dd1-234efdc51f06",
      "nombreUsuario": "chat",
      "estado": "ACTIVA",
      "fechaInicio": "2026-06-17T10:00:00",
      "ultimaActividad": "2026-06-17T10:02:00",
      "ultimoMensaje": "Hola, tengo una pregunta"
    },
    {
      "sesionId": "37cb781e-f39f-4fa4-b825-52a7f0b9ab0c",
      "nombreUsuario": "Visitante",
      "estado": "CERRADA",
      "fechaInicio": "2026-06-17T09:00:00",
      "ultimaActividad": "2026-06-17T09:05:00",
      "ultimoMensaje": "Buen dia"
    }
  ],
  "lista": null
}
```

- Devuelve **todas las sesiones de las últimas 24 horas** (ACTIVA y CERRADA), ordenadas por `ultimaActividad` descendente
- Campo nuevo `estado`: `"ACTIVA"` o `"CERRADA"` — mostrar indicador visual (ej. punto verde / gris)
- `ultimoMensaje` puede ser `null` si el usuario conectó pero no envió ningún mensaje
- El admin puede hacer clic en cualquier sesión para ver el historial — incluso las cerradas
- `estado === 'CERRADA'` → solo lectura (no tiene sentido responder, la sesión ya expiró)

```typescript
// ✅ Correcto
this.sesiones = (response as any).data ?? [];
// Indicador visual sugerido:
// sesion.estado === 'ACTIVA'  → punto verde, puede responder
// sesion.estado === 'CERRADA' → punto gris, solo ver historial
```

---

### Endpoint para cerrar sesión manualmente

**Request:**
```
POST /mis-productos/v1/chat/admin/cerrar/{sesionId}
Authorization: Bearer <token admin>
```

**Response:** 204 No Content

---

### Comportamiento del email de notificación

El backend manda email al admin en el **primer mensaje de cada sesión**, sin importar si el admin está en el panel o no.

- Visitante se conecta → sin email
- Visitante manda primer mensaje → email con el contenido del mensaje
- Visitante manda más mensajes en la misma sesión → sin email (ya fue notificado)
- Sesión expira por inactividad (5 min) → visitante manda nuevo mensaje → nueva sesión → nuevo email

El front **no necesita hacer nada especial** para controlar los emails. Solo asegurarse de que el visitante llame `/chat.conectar` para crear sesión antes de mandar mensajes.

---

### Notificación en el panel cuando el admin ESTÁ en la app — ✅ IMPLEMENTADO (2026-06-17)

Cuando el admin está en el panel y llega un mensaje de un visitante, el backend publica el evento por WebSocket en `/topic/chat.admin`.

**Lo que se implementó:**
- Sonido beep via Web Audio API al llegar mensaje en sesión no activa (sin archivo externo)
- Highlight rojo en la sesión del listado con clase `ca-session-item--unread`, se quita al hacer clic
- Eliminada propiedad `env.buscarImagenProducto` (URL deprecada, no se usaba en templates)

El campo del mensaje en el evento es `contenido` (no `mensaje`):
```json
{
  "tipo": "MENSAJE",
  "sesionId": "f1d0db6f-...",
  "nombreUsuario": "Juan",
  "contenido": "Hola, tengo una pregunta",
  "timestamp": "2026-06-17T10:00:05"
}
```

**Para eventos `NUEVA_SESION`**, `contenido` viene `null` — es correcto, no hay mensaje aún.

---

### Protección anti-bot

El backend limita los emails a uno por sesión. Si un bot manda mensajes continuamente dentro de la misma sesión, solo llega 1 email. Si crea sesiones nuevas continuamente, puede generar emails repetidos — se puede agregar rate limiting por IP en una iteración futura si se detecta el problema.

**Timeout de sesión:** 5 minutos sin actividad de ninguno de los dos lados (ni usuario ni admin) → la sesión se cierra y el cliente recibe `{ "tipo": "SESION_CERRADA" }` en `/topic/chat.usuario.{sesionId}`. Cualquier mensaje de cualquiera de los dos reinicia el contador.

---

### Confirmado correcto por el front — sin cambios requeridos (2026-06-17)

Lo siguiente ya estaba bien implementado y no requiere ninguna acción:

| Ítem | Estado |
|---|---|
| `buscarClientePedido` con query params | ✅ correcto |
| micro_imagenes con prefijo `/v1/` | ✅ correcto |
| Imágenes de productos y variantes usando `urlImagen` directa del response | ✅ correcto |
| Interceptor maneja 401 (token expirado) y 403 (sin permiso) correctamente | ✅ correcto |
| `omitidosSinNombre?.` con optional chaining | ✅ correcto |

---

## CHAT EN VIVO — Referencia completa para el front (2026-06-18)

> **Por qué no aparecen los mensajes al recargar la página**
>
> Se confirmó en BD que los mensajes SÍ se guardan correctamente. El problema es que el componente del chat **no está llamando al endpoint de historial al inicializar (`ngOnInit`)**.
> Al recargar la página la conexión WebSocket se reinicia (nueva sesión) y si el front no consulta el historial antes de conectar, la pantalla arranca vacía aunque existan mensajes previos en la BD.
> La sesión más reciente en BD tiene `cliente_id = e8ea8611-ca0a-48e1-8619-d754923e2885` con mensajes de USUARIO y ADMIN guardados — el backend funciona. Solo falta que el front haga el `GET /historial/cliente/{clienteId}` al iniciar.

---

### Mapa completo de endpoints de chat

#### 1. WebSocket — conectar nueva sesión

**Cuándo usarlo:** al montar el componente de chat (ngOnInit), antes de enviar mensajes. Genera el `sesionId` que identifica esta sesión.

**Suscribirse primero en:**
```
/topic/chat.inicio.{tempId}
```

**Publicar en:**
```
/app/chat.conectar
```

**Payload:**
```json
{
  "tempId": "uuid-generado-en-el-front",
  "nombreUsuario": "Juan",
  "clienteId": "uuid-de-localStorage",
  "usuarioId": 42
}
```
- `tempId`: UUID que el front genera en el momento para recibir la respuesta (no se guarda)
- `clienteId`: UUID guardado en `localStorage` — se crea la primera vez y persiste siempre (usuarios anónimos o como fallback)
- `usuarioId`: el `id` del usuario autenticado (Integer) — enviar `null` si no está logueado

**Response que llega en `/topic/chat.inicio.{tempId}`:**
```json
{ "sesionId": "94bb63c0-a3fe-4d7c-b4a9-ecd2a72c871c" }
```
→ Guardar `sesionId` en `sessionStorage`. Se usa para enviar mensajes y recibir respuestas del admin.

---

#### 2. WebSocket — enviar mensaje del cliente

**Cuándo usarlo:** cuando el usuario escribe y presiona enviar.

**Publicar en:**
```
/app/chat.mensaje
```

**Payload:**
```json
{ "sesionId": "uuid-de-sessionStorage", "contenido": "Hola, tengo una pregunta" }
```

**No hay response directo.** El admin recibe el mensaje en `/topic/chat.admin`. Si la sesión está expirada el mensaje se descarta — el front debe reconectar primero.

---

#### 3. WebSocket — recibir eventos del backend (canal del cliente)

**Suscribirse en:**
```
/topic/chat.usuario.{sesionId}
```

**Evento: mensaje del admin**
```json
{ "tipo": "MENSAJE", "remitente": "ADMIN", "contenido": "Hola, ¿en qué te ayudo?", "timestamp": "2026-06-18T02:35:47" }
```

**Evento: sesión expirada** (5 min sin actividad)
```json
{ "tipo": "SESION_CERRADA" }
```
→ Al recibir `SESION_CERRADA`: limpiar `sesionId` de sessionStorage y limpiar la lista de mensajes del componente. La próxima vez que el usuario envíe un mensaje, reconectar (`/app/chat.conectar`) y luego cargar historial.

---

#### 4. REST — historial del cliente por `clienteId` (usuarios anónimos o fallback)

**Cuándo usarlo:** en `ngOnInit`, ANTES de conectar el WebSocket. Carga todos los mensajes de todas las sesiones anteriores.

**Request:**
```
GET /mis-productos/v1/chat/historial/cliente/{clienteId}?pagina=0&size=20
```
Sin token. `clienteId` viene de `localStorage.getItem('chat_cliente_id')`.

**Response:** `ResponseGeneric` — leer `response.data`:
```json
{
  "mensaje": "La peticion fue exitosa",
  "code": 200,
  "data": {
    "mensajes": [
      { "remitente": "USUARIO", "contenido": "Hola", "timestamp": "2026-06-18T02:35:16" },
      { "remitente": "ADMIN",   "contenido": "Como estas", "timestamp": "2026-06-18T02:35:47" }
    ],
    "pagina": 0,
    "totalPaginas": 1,
    "totalMensajes": 2,
    "hayMasAntiguos": false
  }
}
```
→ Leer: `(response as any).data.mensajes` — **NO** `response as any[]`.

**Scroll hacia arriba — cargar más antiguos:**
```
GET /mis-productos/v1/chat/historial/cliente/{clienteId}?pagina=1&size=20
```
Cuando `hayMasAntiguos === true`, al hacer scroll al tope cargar `pagina + 1` y **prepend** al array actual:
```typescript
this.mensajes = [...nuevosMensajes, ...this.mensajes];
```

---

#### 5. REST — historial del cliente por `usuarioId` (usuarios registrados)

**Cuándo usarlo:** igual que el anterior, pero cuando el usuario está autenticado. Tiene la ventaja de ser robusto aunque el `localStorage` se borre.

**Request:**
```
GET /mis-productos/v1/chat/historial/usuario/{usuarioId}?pagina=0&size=20
```
Sin token. `usuarioId` es el `id` Integer del usuario autenticado.

**Response:** mismo formato que el endpoint por `clienteId` (ver arriba).

---

#### 6. REST — historial de una sesión específica (para el panel admin)

**Cuándo usarlo:** en el panel admin, cuando el admin hace clic en una sesión del listado para ver su historial.

**Request:**
```
GET /mis-productos/v1/chat/admin/historial/{sesionId}?pagina=0&size=20
Authorization: Bearer <token admin>
```

**Response:** mismo formato paginado que los anteriores.

---

#### 7. REST — listado de sesiones para el panel admin

**Cuándo usarlo:** al cargar el panel de admin, para ver todas las sesiones de las últimas 24 h (activas y cerradas).

**Request:**
```
GET /mis-productos/v1/chat/admin/sesiones
Authorization: Bearer <token admin>
```

**Response:** `ResponseGeneric` — leer `response.data`:
```json
{
  "data": [
    {
      "sesionId": "94bb63c0-...",
      "nombreUsuario": "chat",
      "estado": "ACTIVA",
      "fechaInicio": "2026-06-18T02:35:07",
      "ultimaActividad": "2026-06-18T02:35:47",
      "ultimoMensaje": "Como estas"
    }
  ]
}
```
→ Leer: `(response as any).data` — **NO** `response as any[]`.
- `estado` puede ser `"ACTIVA"` o `"CERRADA"`

---

#### 8. REST — cerrar sesión manualmente (panel admin)

**Cuándo usarlo:** botón "Cerrar sesión" en el panel admin.

**Request:**
```
POST /mis-productos/v1/chat/admin/cerrar/{sesionId}
Authorization: Bearer <token admin>
```
**Response:** 204 No Content.

---

#### 9. WebSocket — panel admin (recibir eventos y responder)

**Suscribirse en** (para recibir mensajes de todos los clientes):
```
/topic/chat.admin
```

**Eventos posibles:**

Nueva sesión conectada:
```json
{ "tipo": "NUEVA_SESION", "sesionId": "...", "nombreUsuario": "Juan", "contenido": null, "timestamp": null }
```

Mensaje del cliente:
```json
{ "tipo": "MENSAJE", "sesionId": "...", "nombreUsuario": "Juan", "contenido": "Hola", "timestamp": "2026-06-18T02:35:16" }
```

**Publicar para responder al cliente:**
```
/app/chat.admin.responder
```
```json
{ "sesionId": "uuid-del-cliente", "contenido": "Hola, ¿en qué te ayudo?" }
```

**Publicar para marcar que el admin está en el panel** (suspende emails):
```
/app/chat.admin.conectado
```
Sin payload.

---

### Flujo completo del componente de chat del cliente — código de referencia

> **Decisión 2026-06-18:** el chat es solo para usuarios logueados. Se eliminó el `clienteId` (localStorage UUID). El único identificador es `usuarioId` (Integer del usuario autenticado).

```typescript
// usuarioId viene del usuario autenticado (Integer)
// Solo mostrar el chat si el usuario está logueado
const usuarioId = this.authService.getCurrentUser()?.id;

ngOnInit() {
  if (!usuarioId) return; // no mostrar chat a usuarios no autenticados

  // PASO 1: cargar historial ANTES de conectar el WebSocket
  this.http.get(`/v1/chat/historial/usuario/${usuarioId}?pagina=0&size=20`)
    .subscribe(res => {
      this.mensajes       = (res as any).data?.mensajes      ?? [];
      this.hayMasAntiguos = (res as any).data?.hayMasAntiguos ?? false;
      this.paginaActual   = 0;
    });

  // PASO 2: conectar WebSocket
  this.conectarWebSocket();
}

conectarWebSocket() {
  const tempId = crypto.randomUUID();

  // suscribirse ANTES de publicar
  this.stompClient.subscribe(`/topic/chat.inicio.${tempId}`, frame => {
    const data = JSON.parse(frame.body);
    this.sesionId = data.sesionId;
    sessionStorage.setItem('chat_sesion_id', this.sesionId);

    // suscribirse al canal de respuestas del admin
    this.stompClient.subscribe(`/topic/chat.usuario.${this.sesionId}`, frame2 => {
      const evento = JSON.parse(frame2.body);
      if (evento.tipo === 'MENSAJE') {
        this.mensajes = [...this.mensajes, evento];
      } else if (evento.tipo === 'SESION_CERRADA') {
        sessionStorage.removeItem('chat_sesion_id');
        this.sesionId = null;
        // NO limpiar mensajes — dejarlos visibles
        // Al siguiente envío reconectar y recargar historial
      }
    });
  });

  this.stompClient.publish({
    destination: '/app/chat.conectar',
    body: JSON.stringify({ tempId, nombreUsuario: this.nombre, usuarioId })
  });
}

cargarMasAntiguos() {
  if (!this.hayMasAntiguos) return;
  this.paginaActual++;
  this.http.get(`/v1/chat/historial/usuario/${usuarioId}?pagina=${this.paginaActual}&size=20`)
    .subscribe(res => {
      const antiguos = (res as any).data?.mensajes ?? [];
      this.mensajes       = [...antiguos, ...this.mensajes]; // prepend al inicio
      this.hayMasAntiguos = (res as any).data?.hayMasAntiguos ?? false;
    });
}

enviarMensaje(contenido: string) {
  if (!this.sesionId) {
    // sesión expirada → reconectar y recargar historial
    this.conectarWebSocket();
    this.http.get(`/v1/chat/historial/usuario/${usuarioId}?pagina=0&size=20`)
      .subscribe(res => {
        this.mensajes       = (res as any).data?.mensajes      ?? [];
        this.hayMasAntiguos = (res as any).data?.hayMasAntiguos ?? false;
        this.paginaActual   = 0;
      });
    return;
  }
  this.stompClient.publish({
    destination: '/app/chat.mensaje',
    body: JSON.stringify({ sesionId: this.sesionId, contenido })
  });
  // agregar optimistamente al array local
  this.mensajes = [...this.mensajes, { remitente: 'USUARIO', contenido, timestamp: new Date().toISOString() }];
}
```

---

## MÓDULO: Pagos parciales — Apartado y Fiado (2026-06-27)

> Backend: proyecto-key (9091) — todos los endpoints requieren `ROLE_ADMIN` (token JWT en cookie)

### Concepto

| Tipo | Flujo |
|---|---|
| `APARTADO` | Cliente aparta producto → va dando abonos → al liquidar se le entrega |
| `FIADO` | Se entrega producto de entrada → cliente va pagando → al liquidar cierra |

El tipo se define al crear el pedido. Una vez creado no cambia.

---

### 1. Crear pedido con tipo de crédito

Campo nuevo en el body de `POST /v1/pedidos/savePedido`:

```
tipoPedido: "APARTADO" | "FIADO" | "NORMAL"  (default: "NORMAL")
```

El back calcula `totalPedido` automáticamente sumando los `subTotal` del detalle.
`totalPagado` inicia en `0`.

**Request igual al existente + campo nuevo:**
```json
{
  "cliente": { "id": 10 },
  "fechaPedido": "2026-06-27",
  "tipoPedido": "APARTADO",
  "estadoPedido": "APARTADO",
  "observaciones": "Pantalón azul talla M",
  "detalles": [
    { "productoId": 5, "varianteId": 12, "cantidad": 1, "precioUnitario": 350.00, "subTotal": 350.00 }
  ]
}
```

**Response:** igual al response actual de pedido (incluye los nuevos campos `tipoPedido`, `totalPedido`, `totalPagado`).

---

### 1b. Venta directa con crédito — `POST /v1/ventas/save` (MODIFICADO)

El endpoint ya existía para venta inmediata. Ahora acepta el campo opcional `tipoPedido`.

**Diferencia clave vs v1 anterior:**
- Si `tipoPedido` es `"APARTADO"` o `"FIADO"` → **no se crea Venta**, solo se crea el Pedido con estado = `tipoPedido`. El response devuelve `pedidoId` y `ventaId` es `null`.
- Si `tipoPedido` es `null` / `"NORMAL"` → comportamiento igual al actual (Pedido + Venta cerrados en un shot).

**Request (campos relevantes, igual al existente + `tipoPedido` + `observaciones`):**
```json
{
  "usuarioId": 1,
  "clienteId": 10,
  "pagosYMesesId": 1,
  "tipoPedido": "APARTADO",
  "observaciones": "Pantaloneta negra talla M",
  "detalles": [
    { "varianteId": 42, "cantidad": 1, "precioVenta": 350.00, "subTotal": 350.00 }
  ]
}
```

> `pagosYMesesId` sigue siendo requerido en el request pero **no se usa** en el flujo crédito (no hay Venta ni cargos).

**Response 200 — flujo crédito (ventaId = null, pedidoId presente):**
```json
{
  "response": {
    "ventaId": null,
    "tipoPago": null,
    "requiereTerminal": false,
    "totalVenta": 350.00,
    "meses": null,
    "descripcionPago": null,
    "intentId": null,
    "pedidoId": 55
  }
}
```

**Response 200 — flujo normal (sin cambios):**
```json
{
  "response": {
    "ventaId": 23,
    "tipoPago": "Efectivo",
    "requiereTerminal": false,
    "totalVenta": 350.00,
    "meses": null,
    "descripcionPago": "Efectivo / Transferencia",
    "intentId": null,
    "pedidoId": null
  }
}
```

**Lógica para el front:**
```ts
if (response.pedidoId) {
  // crédito → redirigir a /abonos con el pedidoId
} else {
  // venta inmediata → flujo normal
}
```

---

### 2. Registrar un abono

```
POST /v1/abonos/{pedidoId}
```

**Request:**
```json
{
  "monto": 100.00,
  "fechaPago": "2026-06-27",
  "metodoPago": "EFECTIVO",
  "nota": "primer abono"
}
```
- `fechaPago`: opcional, default = hoy
- `metodoPago`: `"EFECTIVO"` | `"TRANSFERENCIA"` | `"TARJETA"` (default `"EFECTIVO"`)
- `nota`: opcional

**Response 200:**
```json
{
  "mensaje": "La peticion fue exitosa",
  "code": 200,
  "data": {
    "id": 1,
    "monto": 100.00,
    "fechaPago": "27/06/2026",
    "metodoPago": "EFECTIVO",
    "nota": "primer abono"
  }
}
```

**Response 400** si el pedido ya está `PAGADO`, `cancelado`, o es de tipo `NORMAL`.

> **Auto-cierre:** cuando `totalPagado >= totalPedido` el back cambia `estadoPedido` a `"PAGADO"` automáticamente.
> Para `APARTADO` además guarda `fechaRecogida = hoy` (fecha de entrega del producto).

---

### 3. Historial de abonos de un pedido

```
GET /v1/abonos/{pedidoId}
```

**Response 200:**
```json
{
  "code": 200,
  "data": [
    { "id": 1, "monto": 100.00, "fechaPago": "27/06/2026", "metodoPago": "EFECTIVO", "nota": "primer abono" },
    { "id": 2, "monto": 200.00, "fechaPago": "05/07/2026", "metodoPago": "TRANSFERENCIA", "nota": null }
  ]
}
```

---

### 4. Reporte: estado de cuenta (pedidos pendientes de liquidar)

```
GET /v1/abonos/reporte/estado-cuenta
```

Devuelve todos los pedidos `APARTADO` o `FIADO` que **aún no están pagados**.

**Response 200:**
```json
{
  "code": 200,
  "data": [
    {
      "pedidoId": 45,
      "tipoPedido": "FIADO",
      "estadoPedido": "FIADO",
      "cliente": "María López",
      "telefono": "5512345678",
      "totalPedido": 350.00,
      "totalPagado": 100.00,
      "saldo": 250.00,
      "fechaPedido": "27/06/2026",
      "abonos": [
        { "id": 1, "monto": 100.00, "fechaPago": "27/06/2026", "metodoPago": "EFECTIVO", "nota": null }
      ]
    }
  ]
}
```

---

### 5. Reporte: pedidos liquidados

```
GET /v1/abonos/reporte/pagados
```

Devuelve todos los pedidos `APARTADO` o `FIADO` con `estadoPedido = "PAGADO"`.

**Response 200:**
```json
{
  "code": 200,
  "data": [
    {
      "pedidoId": 40,
      "tipoPedido": "APARTADO",
      "cliente": "Ana García",
      "telefono": "5598765432",
      "totalPedido": 500.00,
      "fechaPedido": "10/06/2026",
      "fechaUltimoPago": "27/06/2026",
      "abonos": [
        { "id": 3, "monto": 200.00, "fechaPago": "15/06/2026", "metodoPago": "EFECTIVO", "nota": null },
        { "id": 7, "monto": 300.00, "fechaPago": "27/06/2026", "metodoPago": "TRANSFERENCIA", "nota": "liquidación" }
      ]
    }
  ]
}
```

---

### Resumen de endpoints nuevos

| Método | URL | Descripción |
|---|---|---|
| `POST` | `/v1/ventas/save` | **MODIFICADO** — acepta `tipoPedido`; si es APARTADO/FIADO devuelve `pedidoId` en vez de `ventaId` |
| `POST` | `/v1/pedidos/savePedido` | Ya existía — ahora acepta `tipoPedido` |
| `POST` | `/v1/abonos/{pedidoId}` | Registrar abono |
| `GET` | `/v1/abonos/{pedidoId}` | Historial de abonos |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | Pedidos con saldo pendiente |
| `GET` | `/v1/abonos/reporte/pagados` | Pedidos liquidados |

### Estados posibles de `estadoPedido`

| Estado | Significado |
|---|---|
| `PENDIENTE` | Pedido normal sin confirmar (flujo existente) |
| `APARTADO` | Reservado, abonando, sin entregar |
| `FIADO` | Entregado, abonando, sin liquidar |
| `PAGADO` | Liquidado (cierre de APARTADO o FIADO) |
| `Entregado` | Confirmado por flujo normal de venta (ya existía) |
| `cancelado` | Cancelado (ya existía) |

---

## Chatbot — Tarjetas de productos (2026-07-01)

### Qué cambia

El chatbot ahora puede mostrar productos como **tarjetas visuales** cuando el cliente pide ver
productos por categoría o marca. El response del chatbot incluye campos nuevos opcionales.
La paginación ("ver más") se hace con un endpoint separado **sin pasar por la IA** (0 tokens extra).

---

### 1. POST /v1/chatbot/mensaje — response extendido

**Sin cambio en el request** — sigue igual que antes.

**Response cuando el bot quiere mostrar productos:**
```json
{
  "respuesta": "¡Claro, aquí te muestro! 👜",
  "bloqueado": false,
  "segundosEspera": 0,
  "productos": [
    {
      "varianteId": 12,
      "nombre": "Bolsa Coach Café",
      "marca": "Coach",
      "talla": "única",
      "color": "café",
      "precio": 850.0,
      "stock": 5
    },
    {
      "varianteId": 13,
      "nombre": "Bolsa Coach Negra",
      "marca": "Coach",
      "talla": "única",
      "color": "negra",
      "precio": 900.0,
      "stock": 3
    }
  ],
  "hayMas": true,
  "busquedaQuery": "Coach",
  "busquedaOffset": 2
}
```

**Response cuando el bot responde texto normal (sin productos):**
```json
{
  "respuesta": "Hola, ¿en qué te puedo ayudar? 😊",
  "bloqueado": false,
  "segundosEspera": 0
}
```
Los campos `productos`, `hayMas`, `busquedaQuery` y `busquedaOffset` **solo aparecen** cuando
el bot quiere mostrar tarjetas. Si no están en el response, simplemente no renderizar tarjetas.

---

### 2. GET /v1/chatbot/buscar — "Ver más" sin IA

Llamar este endpoint cuando el usuario hace clic en el botón **"Ver más"**.
No llama a OpenAI, solo consulta la BD. Muy rápido y sin costo de tokens.

**Request:**
```
GET /mis-productos/v1/chatbot/buscar?q=Coach&offset=2
```
| Param | Tipo | Descripción |
|---|---|---|
| `q` | string | La misma búsqueda del response anterior (`busquedaQuery`) |
| `offset` | number | El valor de `busquedaOffset` del response anterior |

**Response:**
```json
{
  "productos": [ ... ],
  "hayMas": false,
  "busquedaQuery": "Coach",
  "busquedaOffset": 4
}
```

---

### 3. Cómo obtener la imagen de cada tarjeta

Cada producto tiene `varianteId`. Usar el endpoint ya existente:

```
GET /mis-productos/v1/variantes/imagenes/{varianteId}
```
Tomar el **primer elemento** del array que devuelve. Si el array está vacío, mostrar imagen placeholder.

---

### 4. Flujo completo para el front

```
1. Usuario escribe "tienes bolsas?"
2. Front → POST /v1/chatbot/mensaje
3. Response tiene productos[] y hayMas=true
4. Front muestra:
   - Burbuja de chat con respuesta.respuesta
   - 2 tarjetas de producto debajo (con imagen de /variantes/imagenes/{id})
   - Botón "Ver más" si hayMas=true

5. Usuario hace clic en "Ver más"
6. Front → GET /v1/chatbot/buscar?q={busquedaQuery}&offset={busquedaOffset}
7. Response trae 2 productos más
8. Front AGREGA las tarjetas nuevas debajo de las anteriores (no reemplaza)
9. Si el nuevo hayMas=false, ocultar el botón "Ver más"

10. Usuario escoge un producto → lo puede agregar al carrito normalmente
```

---

### 5. Diseño sugerido de tarjeta

```
┌─────────────────────┐
│   [imagen 150x150]  │
├─────────────────────┤
│ Bolsa Coach Café    │
│ Marca: Coach        │
│ Color: café         │
│ Talla: única        │
│ $850.00             │
│ Stock: 5 pzas       │
│  [Ver detalle]      │
└─────────────────────┘
```

El botón "Ver detalle" puede abrir el modal/página de producto existente
usando `varianteId` para hacer el fetch de detalle.

---

### 6. Notas importantes

- `marca`, `talla`, `color` pueden ser `null` — mostrar solo los que tengan valor.
- `hayMas` es `false` cuando ya no hay más resultados — ocultar el botón.
- El botón "Ver más" siempre usa `busquedaQuery` y `busquedaOffset` del **último response**.
- Si el usuario hace una nueva pregunta después de ver tarjetas, el historial del chat continúa normalmente.

---

## Ticket / Comprobante — implementación FRONT (2026-07-01)

> El back solo manda datos. El front genera el HTML, aplica estilos de impresión y llama `window.print()`.
> El correo se implementó en el back (ver sección "Correo — cómo lo hace el front" más abajo).
> WhatsApp automático al cliente quedó descartado (ver `PLAN_MEJORAS.md`) — en su lugar el ticket
> lleva un QR de "contáctanos por WhatsApp" (ver siguiente sección).

---

### QRs del ticket (2026-07-01)

La generación del QR es **100% front** (librería JS, ej. `npm install qrcode` o `angularx-qrcode`).
Los *datos* que van dentro de cada QR salen de dos fuentes distintas: la URL de la tienda es fija
(`environment.ts`) y los links de WhatsApp/Facebook del negocio salen de un endpoint nuevo del back
(`GET /v1/negocio/contactos`), **no se arman a mano ni se hardcodea ningún número**.

#### Endpoint nuevo — `GET /v1/negocio/contactos` (público, 2026-07-01)

```
GET /mis-productos/v1/negocio/contactos
```

Response:
```json
{
  "data": {
    "whatsappUrl": "https://wa.me/52XXXXXXXXXX",
    "facebookUrl": "https://facebook.com/novedadesjade"
  }
}
```

- Público, no requiere login.
- **Diferencia con `GET /v1/negocio/estado`:** ese endpoint también trae `whatsappUrl`/`facebookUrl`,
  pero los devuelve en `null` mientras el negocio está **abierto** (a propósito, para otro caso de
  uso). Este endpoint nuevo (`/contactos`) siempre los devuelve, sin importar si está abierto o
  cerrado — por eso es el que hay que usar para el ticket, que se genera justo durante la venta
  (negocio abierto).
- Cualquiera de los dos campos puede venir `null`/vacío si el admin no los configuró — en ese caso
  no mostrar ese QR (ver "Cuántos QRs mostrar" abajo).
- Los valores ya son URLs completas y listas para usar (`https://wa.me/...`, `https://facebook.com/...`)
  — el front solo las mete en el QR, no arma nada.

#### QR 1 — Link a la tienda

Apunta a la URL pública de la tienda, sacada de `environment.ts` (`environment.tiendaUrl` o la que
ya exista para CORS/base de la app), NO de este endpoint:
- Prod: `https://shop.novedades-jade.com.mx`
- QA: `https://qa.shop.novedades-jade.com.mx`

#### QR 2 — "Contáctanos por WhatsApp" (click-to-chat)

Usa directo el `whatsappUrl` que regresa `GET /v1/negocio/contactos` (ya es un link `wa.me/...`
armado por el admin desde el panel — no hay que construirlo ni pedir el número por separado).

- Al escanear/tocar, abre el WhatsApp de quien escanea con un chat ya armado **hacia el negocio**
  (es al revés de "el negocio le manda algo al cliente" — aquí el cliente es quien envía, con un
  solo tap en "Enviar").
- El número no aparece como texto en el ticket, solo va codificado dentro del QR.
- Si se quiere texto precargado (ej. `"Hola, tengo una duda sobre mi compra folio #42"`), se le
  agrega `?text=<mensaje url-encoded>` al final del `whatsappUrl` recibido antes de generar el QR.

#### QR 3 — Facebook del negocio

Usa directo el `facebookUrl` que regresa el mismo endpoint. Mismo tratamiento que el de WhatsApp.

#### ⚠️ Cuántos QRs mostrar — DECISIÓN PENDIENTE, aún sin confirmar por el dueño del negocio

Con los 3 QRs disponibles (tienda, WhatsApp, Facebook), falta decidir si el ticket muestra
**los 3 fijos siempre**, o solo 1-2 (por espacio, sobre todo en impresión térmica 58mm/80mm).
**No implementar los 3 todavía** hasta que se confirme esto — si el ticket es térmico angosto,
el diseño final puede cambiar.

Recomendación sugerida (pendiente de que el usuario la confirme): mostrar los 3 fijos siempre,
sin rotación aleatoria — un ticket se lee una sola vez y se descarta, rotar cuál QR aparece no le
suma nada al cliente y sí le agrega complejidad de código (lógica de selección) sin beneficio
claro. Si el espacio es el problema real (ticket térmico angosto), la solución es recortar a 1-2
QRs fijos (ej. tienda + WhatsApp), no rotar.

---

### Tipos de ticket y de dónde salen los datos

#### A) Ticket de Venta Directa (NORMAL)

**Cuándo mostrarlo:** después del éxito de `POST /mis-productos/v1/ventas/save`
cuando `tipoPedido = "NORMAL"` (o cuando el pedido no es crédito).

**De dónde salen los datos:**

| Campo del ticket | Fuente |
|---|---|
| Nombre cliente | Estado local del form (el front ya lo tiene seleccionado) |
| Artículos, cantidades, precios | Estado local del carrito |
| Total | `res.data.totalVenta` |
| Método de pago | Estado local del form |
| Monto entregado (dado) | Estado local del form |
| Cambio | Calculado en el front: `montoDado - totalVenta` |
| Fecha | `new Date()` en el momento de la venta |
| # Venta | `res.data.ventaId` |

**Ticket generado:**
```
╔══════════════════════════════╗
║       NOVEDADES JADE         ║
╠══════════════════════════════╣
║ Venta #1042   01/07/2026     ║
║ Cliente: María López         ║
╠══════════════════════════════╣
║ 1x Pantalón Negro M  $350.00 ║
║ 1x Blusa Floral S    $180.00 ║
╠══════════════════════════════╣
║ TOTAL              $530.00   ║
║ MÉTODO: EFECTIVO             ║
║ ENTREGÓ:           $600.00   ║
║ CAMBIO:             $70.00   ║
╚══════════════════════════════╝
```

---

#### B) Ticket de Abono

**Cuándo mostrarlo:** después del éxito de `POST /mis-productos/v1/abonos/{pedidoId}`

**De dónde salen los datos:**

Primero el front ya tiene el pedido en pantalla. Al registrar el abono, el response trae:

```json
{
  "data": {
    "id": 5,
    "monto": 150.00,
    "fechaPago": "01/07/2026",
    "metodoPago": "EFECTIVO",
    "nota": "segundo abono",
    "montoDado": 200.00,
    "cambio": 50.00,
    "estadoPedido": "APARTADO",
    "saldoRestante": 100.00
  }
}
```

Para completar el ticket (nombre cliente, artículos, total del apartado) el front hace:

```
GET /mis-productos/v1/pedidos/{pedidoId}/detalle
```

Response que necesitas:
```json
{
  "data": {
    "pedidoId": 42,
    "tipoPedido": "APARTADO",
    "estadoPedido": "APARTADO",
    "totalPedido": 350.00,
    "totalPagado": 250.00,
    "saldoPendiente": 100.00,
    "fechaPedido": "2026-06-15",
    "clienteNombre": "María López",
    "clienteTelefono": "7221234567",
    "detalles": [
      {
        "varianteId": 12,
        "productoNombre": "Pantalón Negro",
        "talla": "M",
        "color": "negro",
        "cantidad": 1,
        "precioUnitario": 350.00,
        "subTotal": 350.00
      }
    ]
  }
}
```

**Ticket generado:**
```
╔══════════════════════════════╗
║  NOVEDADES JADE — ABONO      ║
╠══════════════════════════════╣
║ Apartado #42  01/07/2026     ║
║ Cliente: María López         ║
╠══════════════════════════════╣
║ Pantalón Negro M     $350.00 ║
╠══════════════════════════════╣
║ Total apartado:      $350.00 ║
║ Ya pagado:           $250.00 ║
║ Abono de hoy:        $150.00 ║
║ Saldo pendiente:     $100.00 ║
╠══════════════════════════════╣
║ MÉTODO: EFECTIVO             ║
║ ENTREGÓ:             $200.00 ║
║ CAMBIO:               $50.00 ║
╚══════════════════════════════╝
```

> Si `metodoPago = "TRANSFERENCIA"`, no mostrar las filas ENTREGÓ y CAMBIO (serán `null`).

---

#### C) Ticket de Liquidación (pedido PAGADO)

**Cuándo mostrarlo:** cuando el response del abono trae `estadoPedido = "PAGADO"`.
Mismo flujo que el ticket de abono — solo cambia el encabezado y no hay saldo pendiente.

**Ticket generado:**
```
╔══════════════════════════════╗
║ NOVEDADES JADE — ¡LIQUIDADO! ║
╠══════════════════════════════╣
║ Apartado #42  01/07/2026     ║
║ Cliente: María López         ║
╠══════════════════════════════╣
║ Pantalón Negro M     $350.00 ║
╠══════════════════════════════╣
║ Total pagado:        $350.00 ║
║ ✅ PAGADO COMPLETAMENTE      ║
╚══════════════════════════════╝
```

---

#### D) Ticket de Cancelación

**Cuándo mostrarlo:** después del éxito de `PUT /mis-productos/v1/abonos/{pedidoId}/cancelar`

Response de cancelación:
```json
{
  "data": {
    "pedidoId": 42,
    "tipoPedido": "APARTADO",
    "estadoPedido": "cancelado",
    "totalPagado": 100.00,
    "totalPendiente": 250.00,
    "stockDevuelto": true,
    "mensaje": "Pedido cancelado correctamente"
  }
}
```

El front también necesita llamar `GET /mis-productos/v1/pedidos/{id}/detalle` para obtener
`clienteNombre`, `motivoCancelacion` y los artículos.

**Ticket generado:**
```
╔══════════════════════════════╗
║  NOVEDADES JADE — CANCELADO  ║
╠══════════════════════════════╣
║ Apartado #42  01/07/2026     ║
║ Cliente: María López         ║
╠══════════════════════════════╣
║ Pantalón Negro M     $350.00 ║
╠══════════════════════════════╣
║ Motivo: NO SE PRESENTÓ       ║
║ Abonos realizados:   $100.00 ║
║ (saldo a favor del cliente)  ║
╚══════════════════════════════╝
```

---

### Dónde aparece el botón de imprimir

| Pantalla | Cuándo mostrar el botón |
|---|---|
| Venta directa | Al cerrar el modal/toast de "Venta exitosa" — mostrar botón **🖨️ Imprimir ticket** |
| Registrar abono | En el toast/modal de confirmación del abono |
| Liquidación (PAGADO) | En el toast/modal — ticket distinto al de abono normal |
| Cancelación | En el modal de confirmación de cancelación |

---

### Cómo imprimir

```javascript
function imprimirTicket(htmlTicket) {
  const ventana = window.open('', '_blank', 'width=400,height=600');
  ventana.document.write(`
    <html>
      <head>
        <title>Ticket</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 280px;
            margin: 0 auto;
            padding: 8px;
          }
          .titulo    { text-align: center; font-weight: bold; font-size: 14px; }
          .linea     { border-top: 1px dashed #000; margin: 4px 0; }
          .fila      { display: flex; justify-content: space-between; }
          .total     { font-weight: bold; }
          .centro    { text-align: center; }
          @media print {
            body { width: 100%; }
          }
        </style>
      </head>
      <body>
        ${htmlTicket}
        <script>window.print(); window.close();<\/script>
      </body>
    </html>
  `);
  ventana.document.close();
}
```

---

### Estructura HTML sugerida del ticket

```javascript
function generarHtmlTicket({ tipo, numero, fecha, cliente, articulos,
                              total, totalPagado, saldoPendiente, abonoHoy,
                              metodoPago, montoDado, cambio, motivo }) {
  const formatPeso = (n) => n != null ? `$${n.toFixed(2)}` : '';
  const hoy = fecha || new Date().toLocaleDateString('es-MX');

  let encabezado = '';
  if (tipo === 'venta')        encabezado = 'COMPROBANTE DE VENTA';
  if (tipo === 'abono')        encabezado = 'COMPROBANTE DE ABONO';
  if (tipo === 'liquidado')    encabezado = '¡APARTADO LIQUIDADO!';
  if (tipo === 'cancelacion')  encabezado = 'CANCELACIÓN DE PEDIDO';

  const filasArticulos = articulos.map(a => `
    <div class="fila">
      <span>${a.cantidad}x ${a.productoNombre}${a.talla ? ' ' + a.talla : ''}</span>
      <span>${formatPeso(a.subTotal)}</span>
    </div>
  `).join('');

  const filaPago = metodoPago === 'EFECTIVO' ? `
    <div class="fila"><span>ENTREGÓ:</span><span>${formatPeso(montoDado)}</span></div>
    <div class="fila"><span>CAMBIO:</span><span>${formatPeso(cambio)}</span></div>
  ` : `<div class="fila"><span>MÉTODO:</span><span>TRANSFERENCIA</span></div>`;

  return `
    <div class="titulo">NOVEDADES JADE</div>
    <div class="titulo">${encabezado}</div>
    <div class="linea"></div>
    <div class="fila"><span>Folio #${numero}</span><span>${hoy}</span></div>
    <div>Cliente: ${cliente}</div>
    <div class="linea"></div>
    ${filasArticulos}
    <div class="linea"></div>
    ${total        ? `<div class="fila total"><span>TOTAL:</span><span>${formatPeso(total)}</span></div>` : ''}
    ${totalPagado  ? `<div class="fila"><span>Ya pagado:</span><span>${formatPeso(totalPagado)}</span></div>` : ''}
    ${abonoHoy     ? `<div class="fila"><span>Abono de hoy:</span><span>${formatPeso(abonoHoy)}</span></div>` : ''}
    ${saldoPendiente != null && saldoPendiente > 0
        ? `<div class="fila"><span>Saldo pendiente:</span><span>${formatPeso(saldoPendiente)}</span></div>` : ''}
    ${tipo === 'liquidado' ? `<div class="centro">✅ PAGADO COMPLETAMENTE</div>` : ''}
    ${motivo ? `<div>Motivo: ${motivo}</div>` : ''}
    <div class="linea"></div>
    ${filaPago}
    <div class="linea"></div>
    <div class="centro">¡Gracias por tu compra!</div>
  `;
}
```

---

### Correo (y WhatsApp EN PAUSA) — cómo lo hace el front

> **DECISIÓN 2026-07-01:** por ahora solo se implementa el envío por **correo**. WhatsApp queda
> en pausa (ver "DECISIÓN PENDIENTE" en `PLAN_MEJORAS.md`) — CallMeBot (gratis) solo le avisa al
> negocio, no al cliente, y Twilio (que sí notificaría al cliente) es de pago y requiere alta de
> cuenta + código nuevo que no se justifica por ahora. **El front NO debe mostrar el checkbox de
> WhatsApp.** El campo `notificacion.enviarWhatsapp` se puede omitir/mandar `false` siempre; el
> back lo soporta pero no hay forma de que le llegue nada real al cliente todavía.

El front genera el ticket (ya lo hace para imprimir). Si el usuario marcó el checkbox de correo,
**incluye el ticket en el mismo request** que registra la acción. El back lo recibe y lo envía.

#### Checkbox en el UI

Mostrar en el form de abono, venta directa y cancelación:

```html
<label>
  <input type="checkbox" [(ngModel)]="enviarCorreo" />
  Enviar ticket al correo del cliente
</label>
```

- Pre-marcar correo si el cliente tiene email registrado.
- Si el cliente no tiene correo → deshabilitar el checkbox.

---

#### (Referencia, no implementar por ahora) Cómo armar el ticketTexto para WhatsApp

Queda documentado por si más adelante se retoma con Twilio — no construir esto en el front hoy.
WhatsApp no soporta HTML — mandar texto plano. Generar con una función separada:

```javascript
function generarTextoWhatsapp({ tipo, numero, fecha, cliente, articulos,
                                 total, abonoHoy, saldoPendiente, metodoPago,
                                 montoDado, cambio, motivo }) {
  const fmt = (n) => n != null ? `$${n.toFixed(2)}` : '';
  const hoy = fecha || new Date().toLocaleDateString('es-MX');

  let lineas = [
    '🛍️ NOVEDADES JADE',
    tipo === 'venta'       ? 'Comprobante de venta' :
    tipo === 'abono'       ? 'Comprobante de abono' :
    tipo === 'liquidado'   ? '✅ Apartado liquidado' :
                             '❌ Cancelación de pedido',
    `Folio #${numero} — ${hoy}`,
    `Cliente: ${cliente}`,
    '─────────────────────',
    ...articulos.map(a =>
      `• ${a.cantidad}x ${a.productoNombre}${a.talla ? ' ' + a.talla : ''} — ${fmt(a.subTotal)}`
    ),
    '─────────────────────',
  ];

  if (total)          lineas.push(`Total: ${fmt(total)}`);
  if (abonoHoy)       lineas.push(`Abono de hoy: ${fmt(abonoHoy)}`);
  if (saldoPendiente) lineas.push(`Saldo pendiente: ${fmt(saldoPendiente)}`);
  if (tipo === 'liquidado') lineas.push('✅ PAGADO COMPLETAMENTE');
  if (motivo)         lineas.push(`Motivo cancelación: ${motivo}`);

  lineas.push('─────────────────────');
  lineas.push(`Método: ${metodoPago}`);
  if (metodoPago === 'EFECTIVO' && montoDado) {
    lineas.push(`Entregó: ${fmt(montoDado)}`);
    lineas.push(`Cambio: ${fmt(cambio)}`);
  }
  lineas.push('¡Gracias por tu compra! 🙏');

  return lineas.join('\n');
}
```

---

#### Campos que se agregan al request cuando hay correo/WhatsApp

Aplicar en: `POST /v1/abonos/{pedidoId}`, `POST /v1/ventas/save`,
`PUT /v1/abonos/{pedidoId}/cancelar`.

**IMPORTANTE — implementación final:** los campos van anidados dentro de un objeto
`"notificacion"`, no planos en la raíz del body (`NotificacionRequest.java`):

```json
{
  "monto": 150.00,
  "metodoPago": "EFECTIVO",
  "montoDado": 200.00,

  "notificacion": {
    "enviarCorreo":   true,
    "enviarWhatsapp": false,
    "ticketHtml":     "<html>...ticket generado por el front...</html>",
    "correo":         "escrito-en-el-modal@ejemplo.com"
  }
}
```

- **Por ahora el front solo maneja `enviarCorreo`, `ticketHtml` y `correo`.** `enviarWhatsapp` se
  manda siempre `false` (o se omite) y `ticketTexto` no hace falta construirlo — ver nota de
  "WhatsApp EN PAUSA" arriba.
- **`correo` (nuevo, 2026-07-01) — para el modal post-venta:** si el cliente no tiene correo
  registrado, se muestra un modal pidiéndolo manualmente; ese valor va en este campo. Si viene con
  valor, el back lo usa como destino en vez del correo de la BD. Si se omite o va vacío, se usa el
  correo registrado (comportamiento normal, sin cambios).
- Si no se quiere enviar nada → no mandar el campo `notificacion` (o mandar `null`). El back solo intenta notificar si `notificacion != null`.
- Si `enviarCorreo = false` → no hace falta mandar `ticketHtml`.

---

#### Qué devuelve el back (campos nuevos en el response)

El back agrega al response normal tres campos extra: `correoEnviado`, `whatsappEnviado`, `erroresEnvio`
(todos `null`/omitidos si no se pidió notificación — `@JsonInclude(NON_NULL)`).

- **Abono** (`POST /v1/abonos/{pedidoId}`) y **cancelación** (`PUT /v1/abonos/{pedidoId}/cancelar`)
  devuelven envuelto en `ResponseGeneric` (campo `data`):

```json
{
  "data": {
    "id": 5,
    "monto": 150.00,
    "estadoPedido": "APARTADO",
    "saldoRestante": 100.00,

    "correoEnviado":    true,
    "whatsappEnviado":  false,
    "erroresEnvio":     []
  }
}
```

- **Venta directa** (`POST /v1/ventas/save`) **NO** usa `ResponseGeneric` — el back devuelve
  `VentaDirectaResponse` directo, sin envolver en `data`:

```json
{
  "ventaId": 10,
  "tipoPago": "EFECTIVO",
  "requiereTerminal": false,
  "total": 350.00,
  "correoEnviado":   true,
  "whatsappEnviado": false,
  "erroresEnvio":    []
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `correoEnviado` | boolean | `true` si el correo se envió con éxito |
| `whatsappEnviado` | boolean | `true` si el WhatsApp se envió con éxito |
| `erroresEnvio` | string[] | Lista de errores si algún envío falló (puede estar vacío) |

#### Cómo mostrar el resultado en el UI

```
✅ Abono registrado correctamente
✅ Correo enviado a maria@gmail.com
❌ WhatsApp no se pudo enviar — intentar después
```

- Si `correoEnviado = false` y el usuario lo pidió → mostrar aviso (no es error fatal).
- El abono/venta ya quedó guardado aunque falle el envío — no bloquear el flujo.

---

### Resumen de endpoints que usa el ticket (todos ya existen)

| Tipo de ticket | Endpoints necesarios |
|---|---|
| Venta directa | Estado local del carrito + `res` (sin wrapper) del `POST /v1/ventas/save` |
| Abono | `res.data` del `POST /v1/abonos/{pedidoId}` + `GET /v1/pedidos/{id}/detalle` |
| Liquidado | Igual que abono |
| Cancelación | `res.data` del `PUT /v1/abonos/{pedidoId}/cancelar` + `GET /v1/pedidos/{id}/detalle` |

**El ticket HTML/texto lo genera el front. El back solo lo recibe y lo transporta por correo/WhatsApp.**

---

## EP-T1 y EP-T2 — Detalle de pedido enriquecido + reenviar comprobante (2026-07-02)

### EP-T1 — `GET /v1/pedidos/{id}/detalle` (endpoint que ya usabas — mismo path, mismo auth)

**Qué cambia:** se agregaron 4 campos nuevos a la respuesta. Nada de lo que ya consumías cambió.

**Response — campos nuevos (además de los que ya recibías):**
```json
{
  "data": {
    "clienteCorreo": "juan@email.com",
    "metodoPago": "EFECTIVO",
    "montoDado": 350.00,
    "abonos": [
      { "id": 10, "monto": 200.00, "fechaPago": "2026-07-01", "metodoPago": "EFECTIVO", "nota": "Enganche", "montoDado": 220.00 }
    ]
  }
}
```

| Campo | Tipo | Cuándo viene |
|---|---|---|
| `clienteCorreo` | string \| null | Si el cliente tiene correo registrado |
| `metodoPago` | string \| null | **Solo en ventas NORMAL al contado.** `null` en créditos (APARTADO/FIADO) — ver `abonos[]` |
| `montoDado` | number \| null | Solo ventas NORMAL, y **solo si el front lo mandó** al crear la venta (ver acción requerida abajo). En pedidos vendidos antes de este cambio siempre es `null` |
| `abonos` | array | Historial de pagos del crédito. Lista vacía `[]` en ventas NORMAL |

**⚠️ Acción requerida — sin esto `montoDado` nunca llega:** `montoDado` no se guardaba antes en el back para ventas de contado (solo existía para abonos). Para que el ticket pueda mostrar "ENTREGÓ / CAMBIO" en ventas nuevas, el front debe **agregar el campo `montoDado` al body de `POST /v1/ventas/save`**:
```json
{
  "usuarioId": 1,
  "clienteId": 5,
  "detalles": [ ... ],
  "montoDado": 350.00
}
```
- Mandarlo solo cuando el método de pago sea EFECTIVO (igual que ya calculas el cambio localmente hoy, nada más ahora también se lo mandas al back).
- Los pedidos vendidos **antes** de que el front implemente esto se quedan con `montoDado: null` para siempre — no hay forma de recuperarlo, el ticket de esos pedidos viejos simplemente no muestra esa línea.

---

### EP-T2 — `POST /v1/pedidos/{id}/notificar` (endpoint nuevo)

**Request:** `POST /mis-productos/v1/pedidos/{id}/notificar` — requiere rol ADMIN (Bearer token).
```json
{
  "correo": "cliente@email.com",
  "ticketHtml": "<html>...ticket generado por el front...</html>"
}
```

**Response 200:**
```json
{ "data": "Comprobante enviado correctamente a cliente@email.com" }
```
(va envuelto en `ResponseGeneric` como el resto del proyecto — el mensaje de éxito queda en `data`, no en `mensaje` como en el ejemplo original que se pidió)

**Response 400:**
```json
{ "mensaje": "No se pudo enviar el correo. Verifica la dirección." }
```

**Qué hace:** reenvía tal cual el `ticketHtml` recibido por correo (asunto `"Comprobante de tu pedido #{id} — Novedades Jade"`). No genera nada nuevo — el HTML ya lo arma el front (con sus QR de tienda/WhatsApp/Facebook incluidos, como en el resto de tickets).

**Uso:** botón "reenviar por correo" en cualquier pantalla de detalle de pedido, sin depender de que sea justo al momento de la venta/abono.
