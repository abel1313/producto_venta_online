# Bugs del Chatbot — Reporte para el Equipo Backend

**Fecha:** 2026-07-02  
**Contexto:** se encontraron durante pruebas en vivo del chatbot en `/variantes/chatbot` y revisión del CAMBIOS_FRONT.md.

**Estado 2026-07-02:** BUG-CB-02 corregido (causa raíz encontrada y arreglada). BUG-CB-03
implementado. BUG-CB-01 sigue siendo un problema de datos, no de código — ver detalle abajo.

---

## BUG-CB-01 — Imagen mostrada NO corresponde a la variante (imagen equivocada)

**Estado: NO es bug de código — confirmado que es dato incorrecto en BD.** El código lee
correctamente `vi.getImagen()` de la fila `variante_imagen` ligada a ese `varianteId` — si esa
fila apunta a la imagen de otro producto, es porque alguien subió/vinculó la imagen equivocada
a esa variante al momento de cargarla, no un error de lógica. No se puede corregir con código;
hay que revisar/corregir manualmente en el panel de admin cuál imagen está vinculada a cada
`varianteId`. Los 4 `varianteId` de prueba (117, 165, 213, 277) son parte del mismo problema de
datos duplicados ya reportado en `CAMBIOS_FRONT.md` ("Chatbot muestra el mismo producto repetido").

**Prioridad:** Alta

**Síntoma:**  
Al buscar un producto en el chatbot (ej. "Mochila"), las tarjetas cargan y muestran una imagen, pero **no es la imagen de ese producto** — es la imagen de otro producto distinto.

**Pasos para reproducir:**
1. Abrir el chatbot en el sistema
2. Escribir "Mochila" (o cualquier producto que tenga imagen subida)
3. Observar la imagen que aparece en la tarjeta
4. Comparar contra la imagen real de esa variante en el panel de admin (`/variantes/buscar` o `/variantes/editar`)

**Endpoint afectado:**
```
GET /mis-productos/variantes/v1/imagenes/{varianteId}
```

**Posibles causas (para que el back investigue):**
- El campo `principal: true` no está marcado en la imagen correcta para esas variantes — el front ahora lo usa como criterio de selección (fix del 2026-07-02), pero si el flag está en la imagen equivocada, seguirá mostrando mal
- Las imágenes en la BD están vinculadas al `varianteId` incorrecto (la foto de variante A quedó asociada a variante B)

**Lo que el front ya corrigió (2026-07-02):**  
El front ahora selecciona `imgs.find(i => i.principal) ?? imgs[0]` en vez de tomar siempre el primer elemento. Esta corrección está hecha. Si el problema persiste, la causa está en los datos del back.

**Datos de prueba reportados:**  
`varianteId` 117, 165, 213, 277 (variantes "Mochila Prada")

---

## BUG-CB-02 — Error 500 al pedir imágenes de ciertas variantes

**Estado: CORREGIDO 2026-07-02.** Causa raíz encontrada: cuando una fila de `variante_imagen`
apunta a una `Imagen` que ya no existe (o `imagen_id` es null), `vi.getImagen()` regresa `null`
y el código tronaba con `NullPointerException` al llamar `.getId()` sobre ese null — de ahí el
500. Se agregó un filtro (`filtrarRelacionesConImagen` en `VarianteServiceImpl.java`) que
descarta esas relaciones huérfanas antes de procesarlas (con un log de advertencia para poder
detectarlas), en vez de tronar. También se agregó try/catch en el controller como respaldo.
Ahora una variante sin imágenes válidas responde `200 { data: [] }` como se pedía.

**Prioridad:** Media

**Síntoma:**  
Para algunas variantes, el endpoint de imágenes devuelve HTTP 500 en vez de 200 con lista vacía o 200 con las imágenes.

**Endpoint afectado:**
```
GET /mis-productos/variantes/v1/imagenes/{varianteId}
```

**Comportamiento actual:** `500 Internal Server Error`

**Comportamiento esperado:**
- Si la variante tiene imágenes → `200 { data: [ { urlImagen, principal, ... } ] }`
- Si la variante **no** tiene imágenes → `200 { data: [] }` (lista vacía, no error)

**Impacto en el front:**  
El front ya captura el error con `catchError(() => of(null))` y muestra el placeholder 📦, así que no crashea. Pero el error 500 en consola es ruido y podría esconder otros problemas.

**Datos de prueba reportados:**  
Los mismos `varianteId` de BUG-CB-01 (117, 165, 213, 277) también presentaban 500 al pedir su imagen.

---

## BUG-CB-03 — Variantes con mismo código de barras aparecen indistinguibles en el chatbot

**Estado: IMPLEMENTADO 2026-07-02.** Se agregaron 2 campos nuevos al response de
`GET /v1/chatbot/buscar` (y también a `POST /v1/chatbot/mensaje` cuando dispara `##BUSCAR##`,
comparten el mismo método): `descripcion` y `codigoBarras` (este último solo si el producto
tiene código de barras registrado). Ver detalle completo en `CAMBIOS_FRONT.md`.

**Prioridad:** Baja / Mejora

**Síntoma:**  
Hay variantes que comparten el mismo código de barras y tienen el mismo nombre y precio, pero son variantes diferentes con stock propio. En el chatbot aparecen como tarjetas visualmente idénticas porque el response de `/v1/chatbot/buscar` no incluye ningún campo que las diferencie.

**El front muestra correctamente** lo que el back manda — si el back no manda `talla`, `color` ni ningún campo diferenciador, el front no puede distinguirlas.

**Petición:**  
¿Es posible agregar al response de `GET /v1/chatbot/buscar` algún campo adicional que diferencie estas variantes? Por ejemplo:
- `descripcion` (si existe en la entidad)
- `observaciones`
- `codigoBarras` (para que el admin pueda identificarla visualmente)
- O cualquier campo que las haga distinguibles

**Endpoint afectado:**
```
GET /mis-productos/v1/chatbot/buscar?q=Mochila&offset=0
```

**Response actual (ambas tarjetas idénticas):**
```json
{ "varianteId": 117, "nombre": "Mochila Prada", "precio": 400, "talla": null, "color": null, "stock": 1 }
{ "varianteId": 165, "nombre": "Mochila Prada", "precio": 400, "talla": null, "color": null, "stock": 1 }
```

**Response esperado (algo que las distinga):**
```json
{ "varianteId": 117, "nombre": "Mochila Prada", "precio": 400, "talla": null, "color": null, "stock": 1, "codigoBarras": "ABC123" }
{ "varianteId": 165, "nombre": "Mochila Prada", "precio": 400, "talla": null, "color": null, "stock": 1, "codigoBarras": "DEF456" }
```

---

## Resumen

| Bug | Endpoint | Prioridad | Estado |
|---|---|---|---|
| BUG-CB-01 — Imagen equivocada | `GET /variantes/v1/imagenes/{varianteId}` | Alta | ⏳ Es dato incorrecto en BD, no código — pendiente corrección manual en admin |
| BUG-CB-02 — Error 500 en imágenes | `GET /variantes/v1/imagenes/{varianteId}` | Media | ✅ Corregido — filtra relaciones huérfanas, ya no truena |
| BUG-CB-03 — Tarjetas indistinguibles | `GET /v1/chatbot/buscar` | Baja | ✅ Implementado — se agregaron `descripcion` y `codigoBarras` al response |

**Correcciones ya aplicadas en el front (2026-07-02):**
- URL corregida: `/v1/variantes/imagenes/` → `/variantes/v1/imagenes/` (ya estaba corregido de sesión anterior)
- Selección de imagen: ahora usa `principal: true` en vez de tomar siempre el primer elemento del array
