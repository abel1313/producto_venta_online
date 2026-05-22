# Cambios de API para Frontend — Migración a micro_imagenes

## Regla general
- **proyecto-key (9091):** solo maneja lógica de negocio (productos, variantes, pedidos, etc.)
- **micro_imagenes (9096):** todo lo relacionado con archivos de imagen

Los endpoints deprecados en proyecto-key siguen funcionando pero el front debe apuntar a los nuevos.
Los endpoints que dicen `✅ micro_imagenes (9096)` el front los llama **directamente al micro**.
Los endpoints que dicen `✅ proyecto-key (9091)` no pudieron moverse al micro (mezclan datos de negocio).

---

## ENDPOINTS MIGRADOS

---

### 1. Imagen principal de un producto en el listado

> El front **no necesita llamar a este endpoint directamente**. El response de `GET /productos/obtenerProductos` ya incluye el campo `urlImagen` que apunta al micro. El front solo hace `<img [src]="producto.imagen.urlImagen">`.

**`urlImagen` que viene en el listado de productos:**
```
http://localhost:9096/mis-productos/producto-imagen/buscarImagenProducto/{productoId}
```

**Response al llamar esa URL (micro_imagenes 9096):**
```
Content-Type: image/jpeg
Body: <bytes binarios>
```

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

## GLOSARIO

- **@Deprecated**: el endpoint original, sin tocar, sigue funcionando
- **v2**: el endpoint nuevo que delega al microservicio de imágenes
- **204 No Content**: no hay imagen disponible, no es un error
- **RabbitMQ — No aplica**: lectura síncrona, no hay eventos
- **RabbitMQ — TODO**: hay una oportunidad de usar Rabbit aquí pero aún no está implementado
