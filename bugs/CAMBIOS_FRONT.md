# Cambios de API para Frontend — Migración a micro_imagenes

## Regla general
- **proyecto-key (9091):** solo maneja lógica de negocio (productos, variantes, pedidos, etc.)
- **micro_imagenes (9096):** todo lo relacionado con archivos de imagen

Los endpoints deprecados en proyecto-key siguen funcionando pero el front debe apuntar a los nuevos.
Los endpoints que dicen `✅ micro_imagenes (9096)` el front los llama **directamente al micro**.
Los endpoints que dicen `✅ proyecto-key (9091)` no pudieron moverse al micro (mezclan datos de negocio).

---

## BUGS CORREGIDOS — Cambios de comportamiento que el front debe conocer

---

### [BUG-KEY-02] ✅ Fix: búsqueda de pedidos por cliente ahora funciona correctamente
**Fecha:** 2026-06-04  
**Archivo corregido:** `PedidoServiceImpl.java:250`

**Endpoint:**
```
GET /pedidos/buscarClientePedido/{buscar}?size=10&page=0
```

**Dónde verlo en el panel:**
> Menú lateral → **Pedidos** → campo de búsqueda por nombre de cliente → escribir un nombre y dar Enter (o limpiar el campo para ver todos).

**Comportamiento ANTES del fix (incorrecto):**
- Campo de búsqueda **vacío** → el backend buscaba por texto vacío (resultados inconsistentes)
- Campo con **texto escrito** → el backend ignoraba el texto y devolvía **todos los pedidos**
- Resultado: el filtro del panel funcionaba al revés

**Comportamiento DESPUÉS del fix (correcto):**
- Campo **vacío** → devuelve todos los pedidos paginados
- Campo con **texto** → filtra y devuelve solo los pedidos del cliente cuyo nombre contiene ese texto

**El front no necesita cambiar nada** — mismo endpoint, mismo contrato. Solo cambia el comportamiento del backend.

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

**Cómo llegar en el panel:**
1. Menú lateral → **Mis productos** → **Ver todos** → ruta `/productos/buscar`
2. En la lista de productos, dar clic en el **ícono de detalle** de cualquier producto (o clic en la imagen de la card) → navega a `/productos/detalle/{id}`
3. En esa pantalla verás: nombre + precio + stock arriba, luego el **carrusel de imágenes** del producto
4. Debajo del carrusel, junto a los botones de carrito, aparece el botón **"Compartir imágenes"**
   - ⚠️ El botón **solo es visible** si eres **admin** Y el producto tiene **al menos una imagen cargada**
   - Si el producto no tiene imágenes, el botón no aparece
5. Al dar clic → Swal de confirmación: *"¿Deseas compartir las imágenes de este producto con sus variantes?"*
6. Confirmar → asigna todas las imágenes del producto a **todas sus variantes** de una vez

**Componente Angular:** `DetalleProductoComponent` — `src/app/productos/producto/detalle-producto/`

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
PUT /presentacion/v2/imagenes/{id}
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
GET /imagen/v2/{productoId}
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
GET /imagen/v2/{productoId}/detalle?page=1&size=10
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
http://localhost:9096/mis-productos/imagenes/file/{imagenId}
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

#### Version anterior — `GET /imagen/{productoId}/detalle` ❌ Deprecated

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

#### Version nueva — `GET /imagen/v2/{productoId}/detalle` ✅ Usar esta — **proyecto-key (9091)** — se queda aquí

> Este endpoint **no puede moverse al micro** porque mezcla datos del producto (nombre, precio, stock) con bytes de imagen.

| | |
|---|---|
| **Controlador** | `ImageneController` — `proyecto-key` — método `getDetalleV2()` |
| **Path param** | `productoId` (Integer) — mismo que antes |
| **Query params** | `page` (int), `size` (int) — mismos que antes |
| **Response 200** | Misma estructura: `PageableDto` → lista de `{ idProducto, idImagen, name, price, inventoryStatus, extencion, image (bytes) }` |
| **RabbitMQ** | No aplica — lectura síncrona |
| **Acción front** | Cambiar URL de `/imagen/{id}/detalle` a `/imagen/v2/{id}/detalle` |

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

#### Version anterior — `GET /imagen/file/{imagenId}` ❌ Deprecated

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
| **Acción front** | Cambiar URL a `GET http://localhost:9096/mis-productos/imagenes/file/{imagenId}` |

**Request:**
```
GET http://localhost:9096/mis-productos/imagenes/file/123
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

#### Version anterior — `GET /imagen/{idProducto}/imagenes` ❌ Deprecated

| | |
|---|---|
| **Controlador** | `ImageneController` — `proyecto-key` — método `getImagenesPorProductoId()` |
| **Path param** | `idProducto` (Integer) |
| **Response 200** | `ProductoImagenDto` → `{ productoId, listaImagenes: [{ id, extension, nombreImagen, urlImagen, principal }] }` |
| **urlImagen apunta a** | `GET /imagen/file/{imagenId}` — disco local |
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

#### Versión anterior — `DELETE /imagen/{idImagen}` ❌ Deprecated (proyecto-key)

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

| | `DELETE /imagen/{productoId}/imagenes` ❌ Deprecated | `DELETE /imagen/v2/{productoId}/imagenes` ✅ Usar esta |
|---|---|---|
| **URL completa** | `http://localhost:9091/mis-productos/imagen/{id}/imagenes` | `http://localhost:9091/mis-productos/imagen/v2/{id}/imagenes` |
| **Body** | `[imagenId1, imagenId2, ...]` (Long[]) | mismo |
| **Response** | HTTP 200 `{ message }` | HTTP 200 `{ message }` — mismo |

---

### 7. Eliminar todas las imágenes de varios productos — **proyecto-key (9091)** — se queda aquí

> Misma razón que el punto 6.

| | `DELETE /imagen/producto` ❌ Deprecated | `DELETE /imagen/v2/producto` ✅ Usar esta |
|---|---|---|
| **URL completa** | `http://localhost:9091/mis-productos/imagen/producto` | `http://localhost:9091/mis-productos/imagen/v2/producto` |
| **Body** | `[productoId1, productoId2, ...]` (Integer[]) | mismo |
| **Response** | HTTP 200 `{ message }` | HTTP 200 `{ message }` — mismo |

---

### 8. Limpiar caché de imágenes

| | `GET /imagen/cache/imagen/limpiar` ❌ Deprecated | `GET /imagen/v2/cache/limpiar` ✅ Usar esta |
|---|---|---|
| **Controlador** | `ImageneController` — `limpiarTodaLaCacheDeImagenes()` | `ImageneController` — `limpiarCacheImagenesV2()` |
| **Response** | void | HTTP 204 No Content |
| **Diferencia** | Solo evicta caché `imagenes` | Evicta `imagenes`, `detalleImagen`, `detalle`, `detalle-v2`, `buscarImagenIdCache` |
| **RabbitMQ** | No aplica | TODO: publicar evento para invalidar caché en todos los nodos |
| **Acción front** | Sin cambio | Cambiar URL a `/imagen/v2/cache/limpiar` |

---

## ENDPOINTS MIGRADOS (continuación)

---

### 9. Imágenes activas de presentación por tipo (LOGIN / REGISTRO)

#### Versión anterior — `GET /presentacion/imagenes?tipo=LOGIN` ❌ Deprecated

| | |
|---|---|
| **Controlador** | `ImagenPresentacionController` — `getImagenes()` |
| **Query param** | `tipo` (String: `LOGIN` \| `REGISTRO`) |
| **Response 200** | `ResponseGeneric<List<ImagenPresentacion>>` — entidad directa con `nombreArchivo` (ruta de disco interno) |
| **RabbitMQ** | No aplica |
| **Acción front** | Sin cambio — sigue funcionando |

**Request:**
```
GET /mis-productos/presentacion/imagenes?tipo=LOGIN
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

#### Versión nueva — `GET /presentacion/v2/imagenes?tipo=LOGIN` ✅ Usar esta

| | |
|---|---|
| **Controlador** | `ImagenPresentacionController` — `getImagenesV2()` |
| **Query param** | `tipo` (String: `LOGIN` \| `REGISTRO`) — mismo que antes |
| **Response 200** | `ResponseGeneric<List<ImagenPresentacionDto>>` — DTO con `urlImagen` calculada |
| **Response sin datos** | HTTP 200 con `data: []` (lista vacía) |
| **Cache** | `@Cacheable("presentacion-imagenes")` por `tipo` |
| **RabbitMQ** | **NO aplica** — lectura síncrona. TODO: cuando se implemente `PUT /presentacion/v2/imagenes/{id}`, publicar evento `cache.evict.presentacion` en `exchange.imagenes` para invalidar caché en todos los nodos |
| **Acción front** | Cambiar URL a `/presentacion/v2/imagenes?tipo=...` y usar `urlImagen` del DTO para cargar la imagen |

**Request:**
```
GET /mis-productos/presentacion/v2/imagenes?tipo=LOGIN
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
      "urlImagen": "/presentacion/v2/imagenes/1/imagen"
    }
  ],
  "lista": null
}
```

**Diferencia clave con la versión anterior:**
- Ya **no expone** `nombreArchivo` (ruta de disco interno)
- Agrega `urlImagen` → apunta a `GET /presentacion/v2/imagenes/{id}/imagen` (bytes desde el micro)
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

#### Versión anterior — `GET /presentacion/imagenes/{id}/imagen` ❌ Deprecated

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

#### Versión nueva — `GET /presentacion/v2/imagenes/{id}/imagen` ✅ Usar esta

| | |
|---|---|
| **Path param** | `id` (Integer) — mismo que antes |
| **Acción front** | Si ya usas `GET /presentacion/v2/imagenes?tipo=...`, el campo `urlImagen` de cada item ya apunta a esta URL — sin cambio adicional. Solo actualizar si tenías la URL hardcodeada. |

**Request:**
```
GET /mis-productos/presentacion/v2/imagenes/1/imagen
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

#### Versión anterior — `GET /presentacion/imagenes/todas` ❌ Deprecated

**Request:**
```
GET /mis-productos/presentacion/imagenes/todas
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

#### Versión nueva — `GET /presentacion/v2/imagenes/todas` ✅ Usar esta

**Request:**
```
GET /mis-productos/presentacion/v2/imagenes/todas
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
      "urlImagen": "/presentacion/v2/imagenes/1/imagen"
    }
  ]
}
```

**Diferencia clave:** ya no expone `nombreArchivo` (ruta interna del servidor). Usar `urlImagen` para mostrar la imagen.

---

### 12. Actualizar imagen de presentación (ADMIN)

#### Versión anterior — `PUT /presentacion/imagenes/{id}` ❌ Deprecated

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

#### Versión nueva — `PUT /presentacion/v2/imagenes/{id}` ✅ Usar esta

**Request:** igual que v1 — mismo body, mismo token ADMIN.

```
PUT /mis-productos/presentacion/v2/imagenes/1
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
    "urlImagen": "/presentacion/v2/imagenes/1/imagen"
  }
}
```

**Diferencia clave:**
- Ya no devuelve `nombreArchivo` (ruta interna del servidor)
- **Invalida automáticamente el caché** `presentacion-imagenes` — el próximo `GET /presentacion/v2/imagenes?tipo=...` devuelve datos frescos
- RabbitMQ: TODO para invalidar caché en multi-nodo (por ahora se invalida solo el nodo que recibe el PUT)

---

### 13. Imágenes de una variante por ID

#### Versión anterior — `GET /variantes/imagenes/{varianteId}` ❌ Deprecated

**Request:**
```
GET /mis-productos/variantes/imagenes/5
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

#### Versión nueva — `GET /variantes/v2/imagenes/{varianteId}` ✅ Usar esta

**Request:**
```
GET /mis-productos/variantes/v2/imagenes/5
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

| | `DELETE /variantes/imagenes` ❌ Deprecated | `DELETE /variantes/v2/imagenes` ✅ Usar esta |
|---|---|---|
| **Auth** | Bearer token ADMIN | igual |
| **Body** | `[varianteId1, varianteId2, ...]` (Integer[]) | igual |
| **Response 200** | `{ "data": "Imágenes eliminadas correctamente" }` | igual |
| **Diferencia** | misma lógica | misma lógica — solo cambia la URL |

**Request:**
```
DELETE /mis-productos/variantes/v2/imagenes
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

| | `DELETE /variantes/{varianteId}/imagenes` ❌ Deprecated | `DELETE /variantes/v2/{varianteId}/imagenes` ✅ Usar esta |
|---|---|---|
| **Auth** | Bearer token ADMIN | igual |
| **Path param** | `varianteId` (Integer) | igual |
| **Body** | `[imagenId1, imagenId2, ...]` (Long[]) | igual |
| **Response 200** | `{ "data": "Imágenes eliminadas correctamente" }` | igual |
| **Diferencia** | misma lógica | misma lógica — solo cambia la URL |

**Request:**
```
DELETE /mis-productos/variantes/v2/5/imagenes
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
      "urlImagen": "http://localhost:9096/mis-productos/imagenes/file/123",
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

#### Versión anterior — `GET /imagen/{productoId}/detalle` ❌ Deprecated (proyecto-key 9091)

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
      "urlImagen": "http://localhost:9096/mis-productos/imagenes/file/3855830153700593542",
      "principal": true
    },
    {
      "id": "7565125362907238017",
      "extension": "image/jpeg",
      "nombreImagen": "foto2.jpg",
      "urlImagen": "http://localhost:9096/mis-productos/imagenes/file/7565125362907238017",
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

#### Versión anterior — `DELETE /imagen/{productoId}/imagenes` ❌ Deprecated (proyecto-key 9091)

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

#### Versión nueva — `DELETE /imagen/v2/{productoId}/imagenes` ✅ Usar esta (proyecto-key 9091)

**Request:**
```
DELETE http://localhost:9091/mis-productos/imagen/v2/265/imagenes
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
        "imagenUrl": "http://localhost:9096/mis-productos/imagenes/file/7305237692097776164",
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
| Listar imágenes del producto | GET | `http://localhost:9096/mis-productos/producto-imagen/listar/{productoId}?pagina=1&size=8` | — |
| Ver bytes de una imagen | GET | `http://localhost:9096/mis-productos/imagenes/file/{imagenId}` | — |
| Eliminar una imagen | DELETE | `http://localhost:9096/mis-productos/producto-imagen/{imagenId}` | — |
| Marcar imagen como principal | PUT | `http://localhost:9096/mis-productos/producto-imagen/{id}/principal` | — |

> `imagenId` viene del campo `id` (string) del response de `listar`.

---

### DetalleProductoComponent (detalle y carrusel del producto)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar imágenes del producto | GET | `http://localhost:9096/mis-productos/producto-imagen/listar/{productoId}?pagina=1&size=8` | — |
| Ver bytes de una imagen | GET | usar `urlImagen` del response de `listar` directamente en `<img [src]>` | — |
| Eliminar imágenes seleccionadas (batch) | DELETE | `http://localhost:9091/mis-productos/imagen/v2/{productoId}/imagenes` | `["imagenId1", "imagenId2"]` |

---

### LoginFormComponent / AddUsuariosComponent (imágenes de login/registro)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar imágenes por tipo | GET | `http://localhost:9091/mis-productos/presentacion/v2/imagenes?tipo=LOGIN` | — |
| Ver bytes de una imagen | GET | usar `urlImagen` del response directamente en `<img [src]>` | — |

---

### PresentacionImagenesComponent (admin — imágenes de presentación)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar todas (activas e inactivas) | GET | `http://localhost:9091/mis-productos/presentacion/v2/imagenes/todas` | Bearer token ADMIN |
| Actualizar imagen/descripción | PUT | `http://localhost:9091/mis-productos/presentacion/v2/imagenes/{id}` | `{ base64, extension, nombreImagen, descripcion, activo }` |

---

### DetalleVarianteComponent / UpdateVarianteComponent (imágenes de variante)

| Acción | Método | URL | Body / Params |
|---|---|---|---|
| Listar imágenes de variante | GET | `http://localhost:9091/mis-productos/variantes/v2/imagenes/{varianteId}` | — |
| Eliminar imágenes específicas | DELETE | `http://localhost:9091/mis-productos/variantes/v2/{varianteId}/imagenes` | `[imagenId1, imagenId2]` |
| Marcar imagen como principal | PUT | `http://localhost:9091/mis-productos/variantes/imagenes/{imagenId}/principal` | — |

---

## SESIÓN 2026-06-07 — Limpieza de spinners duplicados + fix 413 al guardar imágenes

### 1. Spinners locales duplicados eliminados

**Síntoma reportado:** al abrir `/productos/detalle-producto/266` se ven DOS spinners al mismo tiempo: el overlay global de pantalla completa (`LoadingService` / `LoadingInterceptor`, se activa en CADA request HTTP) y un segundo spinner pequeño propio del componente con texto tipo "Cargando producto…", "Cargando variante…", etc.

**Causa:** varios componentes tenían su propio `*ngIf="cargando"` con spinner + texto que se muestra exactamente en el mismo momento que el overlay global (porque el overlay también se activa por las mismas llamadas HTTP). Quedaban dos indicadores de carga superpuestos — uno cubre toda la pantalla y el otro aparece encima/debajo, generando sensación de "doble carga".

**Fix:** se eliminó el bloque de spinner local + su clase SCSS en cada componente afectado (el overlay global ya cubre la espera). Donde la bandera `cargando` también controlaba la visibilidad de otro bloque (ej. "sin resultados"), se dejó la bandera y solo se quitó el `<div>` del spinner.

| Componente | Texto que se quitó | Cómo llegar para revisar |
|---|---|---|
| `DetalleProductoComponent` | "Cargando producto…" (`.dp-loading`) | Mis productos → Ver todos → clic en ícono de detalle de cualquier producto → `/productos/detalle/{id}` |
| `DetalleVarianteComponent` | "Cargando variante…" (`.dv-loading`) | Gestionar variantes → seleccionar cualquier variante → `/variantes/detalle/{id}` |
| `HistorialMpComponent` | "Cargando historial…" (`.hmp-loading`) | Pedidos → Historial Mercado Pago |
| `BuscarRifaComponent` | "Cargando…" (`.br-loading`) | Rifas → Buscar rifa |
| `GestionPalabrasClaveComponent` | "Cargando…" (`.pk-hint`) | Admin → Palabras clave / categorías |
| `UpdateComponent` (productos) | "Cargando imágenes…" (`.ui-imgs__loading`) | Mis productos → Ver todos → Editar producto → sección de imágenes |
| `UpdateVarianteComponent` | "Cargando imágenes…" (`.vf-imgs__loading`) | Mis variantes → Editar variante → sección "Imágenes actuales" |
| `VentaDirectaComponent` | "Cargando…" (`.vd-hint` sobre el dropdown de forma de pago) | Variantes → Venta directa → seleccionar forma de pago |

**Archivos modificados:** `.html`, `.ts` (solo donde la bandera quedó sin uso) y `.scss` de cada componente listado arriba.

---

### 1b. Ronda 2 — spinners adicionales encontrados tras revisión ("¿ya quitaste todos los spinner chiquitos?")

Se volvió a correr una búsqueda de `spinner-border` + `*ngIf="cargando"` / `else loader` en todos los `.html` y aparecieron 3 más que se habían pasado en la ronda 1 (todos del mismo patrón: spinner de página completa que duplica el overlay global):

| Componente | Texto/patrón que se quitó | Cómo llegar para revisar |
|---|---|---|
| `ConfigNegocioComponent` | `*ngIf="!cargando; else loader"` + `<ng-template #loader>` con spinner (`.cn-loader`) — gateaba TODO el cuerpo de la card | Admin → Configuración del negocio (`/admin/config-negocio`) |
| `PresentacionImagenesComponent` | `*ngIf="!cargando; else loader"` + `<ng-template #loader>` con spinner (`.pi-loader`) — gateaba TODO el cuerpo de la card | Admin → Imágenes de presentación (`/admin/presentacion-imagenes`) |
| `DiagnosticoImagenesComponent` | "Consultando diagnóstico…" (`.di-loading`) | Admin → Diagnóstico de imágenes — buscar un producto o variante por ID/nombre y ver el resultado |

En `ConfigNegocioComponent` y `PresentacionImagenesComponent` la bandera `cargando` SOLO se usaba para ese gate — se eliminó por completo del `.ts` (junto con la simplificación de `cargarConfig()` / `cargar()` que ya no necesitan tocarla). En `DiagnosticoImagenesComponent` la bandera `cargando` se conservó porque sigue controlando el estado interno de `consultarProducto()` / `consultarVariante()` — solo se quitó el `<div>` del spinner y su clase `.di-loading`.

**Verificación final:** se revisaron TODOS los `*ngIf` que envuelven un `spinner-border` en el proyecto — los que quedan son spinners de botón/acción legítimos (`guardando`, `eliminando`, `buscando`, `procesando`, `sorteando`, `importando`, `cambiandoPrincipal`, `estaEliminando`, skeleton de carrusel `item.cargando`, miniatura `cargandoImagen`, etc.), todos atados a una acción puntual del usuario y NO al request inicial de carga de página — esos se dejan intactos.

---

### 2. Fix — 413 Request Entity Too Large al guardar producto/variante con varias imágenes

**Síntoma reportado:**
```
POST https://qa.backend.novedades-jade.com.mx/mis-productos/productos/save
413 Request Entity Too Large
```
ocurre al subir 3 imágenes al guardar/actualizar un producto (o variante).

**Causa raíz (front, NO es bug del back):** `procesarImagen()` en `AddComponent`, `AgregarComponent` (variantes) y `UpdateVarianteComponent` leía cada foto con `FileReader.readAsDataURL()` SIN comprimir ni redimensionar, y mandaba el base64 crudo dentro del JSON (`listImagenes` / `imagenesCargadas`) en el `POST /productos/save` (o el guardado de variante). Una foto de cámara puede pesar 3-8 MB; en base64 eso crece ~33%. Con 3 fotos el body fácilmente supera el límite del servidor/proxy (`client_max_body_size` de nginx o `max-request-size` de Spring) → 413.

**Fix aplicado:** se agregó `comprimirImagen()` — redimensiona la imagen a un máximo de 1280px en el lado más largo (manteniendo proporción) y la reencoda como JPEG calidad 0.8 usando un `<canvas>` offscreen, ANTES de convertirla a base64 y guardarla en el arreglo que se manda al back. Esto reduce el tamaño del payload drásticamente (una foto de varios MB queda en cientos de KB) sin tocar nada del servidor.

**Archivos modificados:**
- `src/app/productos/producto/add/add.component.ts` → `procesarImagen()` + nuevo método `comprimirImagen()`
- `src/app/variante/agregar/agregar.component.ts` → mismo patrón
- `src/app/variante/update-variante/update-variante.component.ts` → mismo patrón

**Cómo llegar para revisar:**
1. Mis productos → Agregar producto (o Editar) → arrastrar/seleccionar 3+ fotos de cámara → Guardar → ya no debe dar 413
2. Mis variantes → Agregar variante (o Editar) → mismo flujo

**Nota:** las imágenes ahora siempre se mandan como JPEG (antes se respetaba el formato original PNG/GIF/JPG). Para fotos de producto esto no debería notarse — JPEG no soporta transparencia, así que si en algún momento se necesitan PNGs con fondo transparente habría que excluir ese tipo de la compresión.

---

## GLOSARIO

- **@Deprecated**: el endpoint original, sin tocar, sigue funcionando
- **v2**: el endpoint nuevo que delega al microservicio de imágenes
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
        "imagenUrl": "http://localhost:9096/mis-productos/imagenes/file/7305237692097776164",
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
http://localhost:9096/mis-productos/imagenes/file/7305237692097776164
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
          "urlImagen": "http://localhost:9096/mis-productos/imagenes/file/7305237692097776164"
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

- Endpoints de detalle de imágenes de variante: `GET /variantes/v2/imagenes/{varianteId}` — sin cambios
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
| `DELETE` | `/imagen/v2/{imagenId}` | Sin cambio — sigue eliminando la imagen y respondiendo 200 |
| `PUT` | `/presentacion/v2/imagenes/{id}` | Sin cambio — sigue actualizando y devolviendo `ImagenPresentacionDto` |
| `GET` | `/imagen/v2/cache/limpiar` | Sin cambio en response — ahora también notifica a los demás nodos vía Rabbit |

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

## SEGUIMIENTO DE REVISIÓN — 2026-06-05

> Estado de cada ítem del documento revisado con el equipo front.

---

### ✅ YA APLICADOS EN FRONT (dev + qa)

| Ítem | Descripción | Commit qa |
|---|---|---|
| BUG-KEY-02 | `buscarClientePedido`: path variable → query param en servicio | `d60d2a0` |
| BUG-KEY-02 | Componente enviaba literal `'vacio'` cuando campo vacío — corregido a `''` | `0c4afbf` |
| CAMBIO A | Catálogo variantes usa `imagenUrl` directo con pipe `imagenSrc` | sesión anterior |
| Buscar variantes | `onBuscar`: trim solo al API, no al modelo — espacios ya no desaparecen | `45b7acc` |
| Buscar variantes | Texto header "Catálogo de productos 1" → "Catálogo de productos" | `45b7acc` |
| Detalle producto | Selección de imágenes: nuevo Set en cada toggle para que Angular detecte cambio | `11fc2b7` |
| Detalle producto | Tras eliminar: filtra localmente + carga siguiente página disponible (borrado es async vía Rabbit) | `a6ef065` |

---

### ⏳ PENDIENTE DE APLICAR EN FRONT

| Ítem | Descripción | Componente | Prioridad |
|---|---|---|---|
| CAMBIO B | `urlImagen` en listado de productos apunta directo a bytes — eliminar llamada intermedia a `buscarImagenProducto` | `AllComponent` (`productos/producto/all/`) | Alta |
| BUG-KEY-06 | Errores en pedidos ahora traen `response.mensaje` legible — mostrar al usuario en lugar de pantalla en blanco | `MisPedidosComponent` | Media |
| PERF-KEY-01 | Si el micro de imágenes tarda >5s devuelve error — mostrar placeholder en imagen | Todos los componentes con imagen | Baja |

---

### ❓ PENDIENTE DE CONFIRMAR CON BACK

| Ítem | Pregunta |
|---|---|
| Detalle producto — eliminar imágenes | El borrado es async vía Rabbit. El front filtra localmente pero si el usuario sale y vuelve las imágenes pueden reaparecer hasta que Rabbit las procese. ¿Se puede hacer el DELETE síncrono o que el `listar` excluya las imágenes en cola de borrado? |

---

## SESIÓN 2026-06-07 (cont.) — Fix urgente: mismatch de URLs por migración de versionado a `/v1/`

**Síntoma reportado en QA (errores en vivo):**
```
GET https://qa.backend.novedades-jade.com.mx/mis-productos/presentacion/imagenes?tipo=LOGIN  → 500 Internal Server Error
GET https://qa.backend-imagenes.novedades-jade.com.mx/mis-productos/imagenes/file/{id}        → 403 Forbidden
```

**Causa raíz:** el equipo de back ya desplegó (en `dev` y `qa` de `proyecto-key` y `micro_imagenes`) una reestructuración de versionado de URLs documentada en `ENDPOINTS_MIGRACION_V1.md`:
- En **proyecto-key**: los pares "endpoint viejo sin versión (`@Deprecated`) + `v2`" se renombraron — el que el front usaba como **v2 → ahora es la versión activa `/v1/`**, y el viejo deprecado pasó a **`/v3/`** (sigue vivo solo por compatibilidad, no usar)
- En **micro_imagenes**: NO tenía versionado; se le agregó el prefijo `/v1/` a TODOS sus endpoints

El front seguía llamando las URLs viejas (`/v2/...` que ya no existe, o las rutas sin versión que ahora apuntan al `/v3/` deprecado/roto) → de ahí los 500/403 en vivo.

**Fix aplicado — repuntar todas las URLs afectadas a `/v1/`:**

| Servicio | Cambio |
|---|---|
| `ImagenesService` (`src/app/imagene/imagenes.service.ts`) | `eliminarImagenesBatch` → `${urlImg}/v1/{productoId}/imagenes`; `setPrincipalProducto` → `${api_imagenes}/v1/producto-imagen/{id}/principal` |
| `ProductoService` (`src/app/productos/service/producto.service.ts`) | `microImagenes` base → `${api_imagenes}/v1/producto-imagen` (afecta `deleteImagen` y `getImagenesProducto`) |
| `PresentacionService` (`src/app/presentacion/presentacion.service.ts`) | `urlV2` → `${api_Url}/presentacion/v1/imagenes` (antes apuntaba a `/v2/` que ya no existe) |
| `VarianteService` (`src/app/variante/service/variante.service.ts`) | `eliminarImagenesV2`, `eliminarTodasImagenesVariantesV2`, `getImagenesVarianteV2` → `${url}/v1/...` (antes `/v2/...`) |

**Eliminado: toggle `🧪 IMG v1/v2` y `ImagenVersionService`**

Como el back colapsó la dualidad v1(deprecated)/v2 en una sola versión activa `/v1/`, **ambos estados del toggle quedaron rotos** (la rama "v1" apuntaba al ahora-deprecado `/v3/`, la rama "v2" apuntaba al ahora-inexistente `/v2/`). El toggle ya no tenía sentido — se eliminó por completo:
- Borrado `src/app/services/imagen-version/imagen-version.service.ts`
- Quitado el botón del sidebar (`navbar.component.html`/`.ts` — `toggleImagenVersion()`, inyección `ImagenVersionService`)
- Quitado el branching `if (useV2) {...} else {...}` en los 5 componentes que lo usaban — ahora siempre llaman al método que apunta a `/v1/` (la versión activa):
  - `LoginFormComponent` / `AddUsuariosComponent` → siempre `getImagenesPorTipoV2()` + `getImagenUrlV2()`
  - `PresentacionImagenesComponent` → siempre `getTodasImagenesV2()` + `actualizarImagenV2()` + `getImagenUrlV2()` (tipo de `imagenes` cambiado a `IImagenPresentacionV2Dto[]`)
  - `DetalleVarianteComponent` → siempre `eliminarImagenesV2()`
  - `UpdateVarianteComponent` → siempre `eliminarImagenesV2()`

**Compilación verificada:** `npx tsc --noEmit -p tsconfig.app.json` sin errores.

**Nota:** `ImagenesService.getImagenV2()` y `ProductoService.getDataImgV2()` quedan como código muerto (sin invocadores) apuntando a `/imagen/v2/...` — siguen documentados como "sin uso" desde antes; no se tocaron porque no afectan en runtime.
