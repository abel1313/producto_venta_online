# Cambios y endpoints — Palabras clave

Referencia para el frontend. Incluye todos los endpoints afectados con su request y response exactos.

---

## Resumen de cambios

| Qué cambió | Detalle |
|---|---|
| **Nueva tabla** | `palabra_clave` — catálogo de categorías |
| **Columna nueva en `producto`** | `palabra_clave_id` (FK nullable) — reemplaza la tabla intermedia |
| **Columna nueva en `variantes`** | `palabra_clave_id` (FK nullable) |
| **Request `POST /productos/save`** | Nuevo campo `palabraClaveId` |
| **Request `PUT /productos/update`** | Nuevo campo `palabraClaveId` |
| **Request `POST /variantes/guardarConImagenes`** | Nuevo campo `palabraClaveId` por cada variante |
| **Búsqueda productos** | Ahora usa prioridad: código exacto → palabra clave → nombre LIKE |
| **Búsqueda variantes** | Ahora usa prioridad: código exacto → palabra clave → nombre LIKE |
| **Nuevo endpoint** | `GET /palabras-clave/buscar` — buscar del catálogo por nombre |
| **Eliminados** | `PUT /productos/{id}/palabras-clave` y `GET /productos/{id}/palabras-clave` |

---

## 1. Catálogo de palabras clave

Base URL: `/palabras-clave`

---

### `GET /palabras-clave/getAll`

Lista todas las palabras clave (sin paginación).

**Acceso:** Público

**Query params:**

| Param | Tipo | Ejemplo |
|---|---|---|
| `page` | int | `0` |
| `size` | int | `10` |

**Response `200`:**
```json
{
  "data": [
    { "id": 1, "nombre": "bolsa" },
    { "id": 2, "nombre": "pantalon" },
    { "id": 3, "nombre": "falda" }
  ],
  "mensaje": null
}
```

---

### `GET /palabras-clave/buscar` ⭐ Nuevo

Busca palabras clave por nombre parcial. Usar para el **autocomplete/dropdown** al asignar categoría a un producto o variante.

**Acceso:** Público

**Query params:**

| Param | Tipo | Requerido | Ejemplo |
|---|---|---|---|
| `nombre` | String | Sí | `bol` |
| `pagina` | int | No (default 1) | `1` |
| `size` | int | No (default 10) | `10` |

**Request:** `GET /palabras-clave/buscar?nombre=bol&pagina=1&size=10`

**Response `200`:**
```json
{
  "pagina": 1,
  "totalPaginas": 1,
  "totalRegistros": 1,
  "t": [
    { "id": 1, "nombre": "bolsa" }
  ]
}
```

---

### `GET /palabras-clave/getOne/{id}`

Obtiene una palabra clave por su ID.

**Acceso:** Público

**Response `200`:**
```json
{
  "data": { "id": 1, "nombre": "bolsa" },
  "mensaje": null
}
```

---

### `POST /palabras-clave/save`

Crea una nueva palabra clave en el catálogo.

**Acceso:** ADMIN

**Request body:**
```json
{
  "nombre": "perfume"
}
```

**Response `200`:**
```json
{
  "data": { "id": 5, "nombre": "perfume" },
  "mensaje": null
}
```

**Error `400` (nombre duplicado):**
```json
{
  "data": null,
  "mensaje": "El codigo postal ya existe, ingrese uno diferente"
}
```

---

### `PUT /palabras-clave/update/{id}`

Actualiza el nombre de una palabra clave.

**Acceso:** ADMIN

**URL:** `PUT /palabras-clave/update/1`

**Request body:**
```json
{
  "id": 1,
  "nombre": "bolsa de mano"
}
```

**Response `200`:**
```json
{
  "data": { "id": 1, "nombre": "bolsa de mano" },
  "mensaje": null
}
```

---

### `DELETE /palabras-clave/delete`

Elimina una palabra clave del catálogo.

**Acceso:** ADMIN

**Request body:**
```json
1
```

**Response `200`:**
```json
{
  "data": null,
  "mensaje": null
}
```

---

## 2. Productos — endpoints con cambios

---

### `POST /productos/save` ⭐ Campo nuevo

Crea un producto. Ahora acepta `palabraClaveId` para asignar categoría.

**Acceso:** ADMIN

**Request body — campos completos:**
```json
{
  "id": null,
  "nombre": "Bolsa de cuero negra",
  "precioCosto": 180.00,
  "piezas": 1.0,
  "color": "negro",
  "precioVenta": 350.00,
  "precioRebaja": 300.00,
  "descripcion": "Bolsa artesanal piel genuina",
  "stock": 10,
  "marca": "Jade",
  "contenido": null,
  "actualizarStock": 0,
  "eliminarStock": 0,
  "palabraClaveId": 1,
  "codigoBarras": {
    "id": null,
    "codigoBarras": "7501055300235"
  },
  "listImagenes": []
}
```

> **`palabraClaveId`**: ID de la palabra clave del catálogo. Mandar `null` si no se asigna categoría.
>
> **`actualizarStock` / `eliminarStock`**: usar solo en actualización. En creación mandar `0`.
>
> **`listImagenes`**: lista de imágenes en base64 (puede ir vacía en creación).

**Response `200` — entidad producto guardada:**
```json
{
  "id": 42,
  "nombre": "Bolsa de cuero negra",
  "precioCosto": 180.00,
  "piezas": 1.0,
  "color": "negro",
  "precioVenta": 350.00,
  "precioRebaja": 300.00,
  "descripcion": "Bolsa artesanal piel genuina",
  "stock": 10,
  "marca": "Jade",
  "contenido": null,
  "habilitado": "1",
  "codigoBarras": {
    "id": 15,
    "codigoBarras": "7501055300235"
  },
  "palabraClave": {
    "id": 1,
    "nombre": "bolsa"
  }
}
```

---

### `PUT /productos/update` ⭐ Campo nuevo

Actualiza un producto existente. Mismo body que save pero con `id` del producto.

**Acceso:** ADMIN

**Request body — ejemplo de actualización de stock y cambio de categoría:**
```json
{
  "id": 42,
  "nombre": "Bolsa de cuero negra",
  "precioCosto": 180.00,
  "piezas": 1.0,
  "color": "negro",
  "precioVenta": 350.00,
  "precioRebaja": 300.00,
  "descripcion": "Bolsa artesanal piel genuina",
  "stock": 0,
  "marca": "Jade",
  "contenido": null,
  "actualizarStock": 5,
  "eliminarStock": 0,
  "palabraClaveId": 2,
  "codigoBarras": {
    "id": 15,
    "codigoBarras": "7501055300235"
  },
  "listImagenes": []
}
```

> **`actualizarStock`**: suma este valor al stock actual en BD. Usar cuando llega mercancía.
>
> **`eliminarStock`**: resta este valor al stock actual en BD. Usar cuando se ajusta inventario.
>
> Si ambos son `0`, el stock que manda `stock` reemplaza directamente al de la BD.

**Response `200`:** misma estructura que save.

---

### `GET /productos/buscarNombreOrCodigoBarra` ⭐ Lógica nueva

Búsqueda de productos con prioridad de 3 pasos. El frontend sigue llamando al mismo endpoint con el mismo parámetro `nombre`; la prioridad es transparente.

**Acceso:** Público (admin ve más campos; usuario ve campos reducidos y solo con stock y habilitado)

**Query params:**

| Param | Tipo | Requerido | Ejemplo |
|---|---|---|---|
| `nombre` | String | Sí | `bolsa` |
| `page` | int | Sí | `1` |
| `size` | int | Sí | `10` |

**Lógica interna (no cambia la llamada del front):**
1. Busca código de barras exacto → si encuentra, devuelve ese producto y termina
2. Busca nombre de palabra clave exacto (ej. `bolsa`) → si encuentra, devuelve todos los productos con esa categoría y termina
3. Busca nombre con LIKE `%bolsa%` → devuelve lo que encuentre

**Response `200` — vista ADMIN:**
```json
{
  "pagina": 1,
  "totalPaginas": 2,
  "totalRegistros": 14,
  "t": [
    {
      "idProducto": 42,
      "nombre": "Bolsa de cuero negra",
      "color": "negro",
      "precioVenta": 350.00,
      "precioCosto": 180.00,
      "piezas": 1.0,
      "precioRebaja": 300.00,
      "descripcion": "Bolsa artesanal piel genuina",
      "stock": 10,
      "marca": "Jade",
      "contenido": null,
      "codigoBarras": "7501055300235",
      "habilitado": "1",
      "imagen": { "urlImagen": "https://api.../buscarImagenProducto/42" }
    }
  ]
}
```

**Response `200` — vista USUARIO (campos reducidos):**
```json
{
  "pagina": 1,
  "totalPaginas": 2,
  "totalRegistros": 14,
  "t": [
    {
      "idProducto": 42,
      "nombre": "Bolsa de cuero negra",
      "color": "negro",
      "precioVenta": 350.00,
      "descripcion": "Bolsa artesanal piel genuina",
      "stock": 10,
      "codigoBarras": "7501055300235",
      "imagen": { "urlImagen": "https://api.../buscarImagenProducto/42" }
    }
  ]
}
```

**Response `404` — sin resultados:**
```json
{
  "mensaje": "No se encontraron productos con la búsqueda: \"xyz\""
}
```

---

### Endpoints de producto sin cambios en req/res (referencia rápida)

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/productos/obtenerProductos?size=10&page=1` | Público | Listado paginado general |
| GET | `/productos/findById/{id}` | Público | Detalle de un producto |
| DELETE | `/productos/deleteBy/{id}` | ADMIN | Elimina producto, variantes e imágenes |
| PUT | `/productos/{id}/habilitar?habilitar=true` | ADMIN | Habilita o deshabilita |
| GET | `/productos/admin/no-habilitados?size=10&page=1` | ADMIN | Productos deshabilitados |
| GET | `/productos/admin/sin-stock?size=10&page=1` | ADMIN | Productos sin stock |
| GET | `/productos/admin/diagnostico-imagenes/{id}` | ADMIN | Diagnóstico de imagen |
| GET | `/productos/admin/sin-variantes/reporte` | ADMIN | Excel con productos sin variantes |
| POST | `/productos/compartir-imagenes-variantes` | ADMIN | Copia imágenes del producto a sus variantes |

---

## 3. Variantes — endpoints con cambios

---

### `POST /variantes/guardarConImagenes` ⭐ Campo nuevo

Crea o actualiza variantes. Ahora acepta `palabraClaveId` por cada variante del array.

**Acceso:** ADMIN

**Request body — array de variantes:**
```json
[
  {
    "id": null,
    "productoId": 42,
    "palabraClaveId": 1,
    "talla": "CH",
    "descripcion": "Bolsa cuero negra talla chica",
    "color": "negro",
    "presentacion": "unidad",
    "stock": 3,
    "marca": "Jade",
    "contenidoNeto": null,
    "listImagenes": []
  },
  {
    "id": null,
    "productoId": 42,
    "palabraClaveId": 1,
    "talla": "M",
    "descripcion": "Bolsa cuero negra talla mediana",
    "color": "negro",
    "presentacion": "unidad",
    "stock": 4,
    "marca": "Jade",
    "contenidoNeto": null,
    "listImagenes": []
  }
]
```

> Para **actualizar** una variante existente: mandar el `id` de la variante.
> Para **crear** una variante nueva: mandar `"id": null`.
> `palabraClaveId` puede ser `null` si no se asigna categoría a la variante.

**Response `200`:**
```json
{
  "data": [
    {
      "id": 101,
      "producto": { "id": 42 },
      "talla": "CH",
      "descripcion": "Bolsa cuero negra talla chica",
      "color": "negro",
      "presentacion": "unidad",
      "stock": 3,
      "marca": "Jade",
      "contenidoNeto": null,
      "palabraClave": { "id": 1, "nombre": "bolsa" }
    },
    {
      "id": 102,
      "producto": { "id": 42 },
      "talla": "M",
      "descripcion": "Bolsa cuero negra talla mediana",
      "color": "negro",
      "presentacion": "unidad",
      "stock": 4,
      "marca": "Jade",
      "contenidoNeto": null,
      "palabraClave": { "id": 1, "nombre": "bolsa" }
    }
  ],
  "mensaje": null
}
```

**Error `400` — stock insuficiente:**
```json
{
  "data": null,
  "mensaje": "Stock insuficiente para el producto 'Bolsa de cuero negra' (id=42). Disponible: 10, Solicitado: 15"
}
```

---

### `GET /variantes/buscar` ⭐ Lógica nueva

Búsqueda de variantes con prioridad. Mismo endpoint, mismos params; la prioridad es transparente para el front.

**Acceso:** Público (admin ve todo; usuario ve solo variantes con stock y producto habilitado)

**Query params:**

| Param | Tipo | Requerido | Ejemplo |
|---|---|---|---|
| `termino` | String | No | `bolsa` |
| `pagina` | int | No (default 1) | `1` |
| `size` | int | No (default 10) | `10` |

> Si `termino` está vacío o no se manda, devuelve todas las variantes.

**Lógica interna (3 pasos, el front no cambia nada):**
1. Busca código de barras exacto del producto padre → si encuentra, devuelve y termina
2. Busca nombre de palabra clave exacto de la variante → si encuentra, devuelve y termina
3. Busca nombre del producto padre con LIKE → devuelve lo que encuentre

**Diferencia por rol:**
- **ADMIN**: los 3 pasos devuelven variantes sin filtro (con o sin stock, habilitadas o no)
- **Usuario**: los 3 pasos filtran: `variante.stock > 0` y `producto.habilitado = '1'`

**Response `200`:**
```json
{
  "data": {
    "pagina": 1,
    "totalPaginas": 3,
    "totalRegistros": 25,
    "t": [
      {
        "id": 101,
        "talla": "CH",
        "descripcion": "Bolsa cuero negra talla chica",
        "color": "negro",
        "presentacion": "unidad",
        "stock": 3,
        "marca": "Jade",
        "contenidoNeto": null,
        "imagenBase64": null,
        "imagenUrl": "https://api.../variante/101",
        "precio": 350.00,
        "codigoBarras": "7501055300235",
        "nombreProducto": "Bolsa de cuero negra"
      }
    ]
  },
  "mensaje": null
}
```

**Response `404` — sin resultados:**
```json
{
  "mensaje": "No se encontraron variantes con la búsqueda: \"xyz\""
}
```

---

### Endpoints de variante sin cambios en req/res (referencia rápida)

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/variantes/porProducto/{productoId}` | Público | Lista variantes de un producto |
| GET | `/variantes/porProducto/{productoId}/paginado` | Público | Lista variantes paginadas |
| GET | `/variantes/porProducto/{productoId}/paginado/resumen` | Público | Lista variantes con imagen paginadas |
| GET | `/variantes/imagenes/{varianteId}` | Público | Imágenes de una variante |
| GET | `/variantes/imagenes/{varianteId}/paginado` | Público | Imágenes paginadas de una variante |
| DELETE | `/variantes/imagenes` | ADMIN | Elimina imágenes de una lista de variantes |
| DELETE | `/variantes/{varianteId}/imagenes` | ADMIN | Elimina imágenes específicas de una variante |
| GET | `/variantes/admin/sin-stock` | ADMIN | Variantes sin stock y deshabilitadas |
| GET | `/variantes/admin/diagnostico-imagenes/{id}` | ADMIN | Diagnóstico de imagen de variante |
| POST | `/variantes/inicializarDesdeProducto` | ADMIN | Crea variantes en lote desde un producto |

---

## 4. Flujo recomendado para el frontend

### Asignar categoría al crear/editar producto o variante

1. Mostrar un campo selector (autocomplete o dropdown)
2. Mientras el usuario escribe, llamar:
   ```
   GET /palabras-clave/buscar?nombre=bol
   ```
3. El usuario elige una opción → guardar el `id` devuelto
4. Al guardar el producto enviar ese `id` en `palabraClaveId`

### Cargar el catálogo completo al iniciar formulario

```
GET /palabras-clave/getAll?page=0&size=100
```

Útil para un `<select>` fijo si el catálogo es pequeño (menos de 50 palabras).

---

## 5. SQL — qué se ejecuta en base de datos

Ver archivo `palabras_clave_migracion.sql`. Pasos:

1. Crear tabla `palabra_clave` si no existe
2. Eliminar tabla intermedia `producto_palabra_clave` (ya no se usa)
3. `ALTER TABLE producto ADD COLUMN palabra_clave_id INT NULL` + FK
4. `ALTER TABLE variantes ADD COLUMN palabra_clave_id INT NULL` + FK
5. Insertar palabras clave iniciales de ejemplo (opcional)