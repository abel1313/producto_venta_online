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

## CHAT EN VIVO — Panel Admin (acción requerida en el front) — 2026-06-17

### Problema actual
Cuando el admin selecciona una sesión en el panel, **solo ve los mensajes nuevos** que llegan en tiempo real (WebSocket). Los mensajes anteriores de esa sesión no aparecen porque el front no los está cargando.

### Endpoint de historial (ya existe en el backend)

**Request:**
```
GET /mis-productos/v1/chat/admin/historial/{sesionId}
Authorization: Bearer <token admin>
```

**Response:**
```json
[
  {
    "id": 1,
    "sesionId": "f1d0db6f-496f-4000-9dd1-234efdc51f06",
    "remitente": "USUARIO",
    "contenido": "Hola, tengo una pregunta",
    "timestamp": "2026-06-17T10:00:00"
  },
  {
    "id": 2,
    "sesionId": "f1d0db6f-496f-4000-9dd1-234efdc51f06",
    "remitente": "ADMIN",
    "contenido": "Claro, ¿en qué te ayudo?",
    "timestamp": "2026-06-17T10:00:05"
  }
]
```

- `remitente` es `"USUARIO"` o `"ADMIN"`
- Los mensajes vienen ordenados por timestamp ascendente
- 204 si la sesión no tiene mensajes aún

**Acción para el front — PENDIENTE:** Cuando el admin hace clic en una sesión del listado, llamar este endpoint y renderizar los mensajes antes de empezar a recibir los nuevos por WebSocket. Así el admin ve la conversación completa.

---

### Endpoint de sesiones activas (para el listado del panel)

**Request:**
```
GET /mis-productos/v1/chat/admin/sesiones
Authorization: Bearer <token admin>
```

**Response:**
```json
[
  {
    "sesionId": "f1d0db6f-496f-4000-9dd1-234efdc51f06",
    "nombreUsuario": "chat",
    "fechaInicio": "2026-06-17T10:00:00",
    "ultimaActividad": "2026-06-17T10:02:00",
    "ultimoMensaje": "Hola, tengo una pregunta"
  }
]
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

**Timeout de sesión:** 5 minutos de inactividad → la sesión se cierra y el cliente recibe `{ "tipo": "SESION_CERRADA" }` en `/topic/chat.usuario.{sesionId}`.

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
