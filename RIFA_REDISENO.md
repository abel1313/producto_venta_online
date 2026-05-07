# Rediseño del módulo de rifa — Para revisión

---

## 1. Configuración inicial — qué se rifa

Se seleccionan **variantes** (no productos directamente).  
Pueden ser 1, 2, 3 o 4 variantes.

### Cards de variantes seleccionadas
- Se muestran como cards pequeñas y responsivas.
- Cada card muestra: **nombre · stock · código de barras**
- Al pasar el mouse (hover) → modal pequeño con:
  - Imagen de la variante
  - Nombre
  - Stock
  - Código de barras
- Cada card tiene un botón **✕ eliminar** por si te equivocaste.
- Las variantes se buscan igual que en el buscador actual (nombre o código).

### Por cada variante configurada

| Campo | Descripción |
|---|---|
| **Palabra clave** | Opcional. Identifica a qué variante pertenecen los participantes que se registren con esa palabra. |
| **Giro ganador** | En qué número de giro sale el ganador. Ejemplo: giro 2 = el primero es descartado, el segundo es ganador. |

---

## 2. Participantes

### Cómo se agregan
- Se pueden agregar participantes **globalmente** o **por variante específica**.
- Un participante se registra con la **palabra clave de la variante** → eso lo liga a esa variante.
- La palabra clave es **opcional**. Si no hay palabra, el participante va al pool general.

### Regla de participación por variante
- Cuando empieza el sorteo de la **Variante 1** (palabra: "BOLSA"):
  - Participan los que registraron la palabra "BOLSA" **+** el pool que venga de rondas anteriores (si aplica).
- Cuando termina la Variante 1 y empieza la **Variante 2** (palabra: "PANTALON"):
  - El pool base = elegibles de Variante 1 **menos** descartados **menos** ganador.
  - Se suman los participantes que registraron la palabra "PANTALON".
  - Los participantes de la Variante 1 **ya no cambian** su palabra, solo se arrastran al pool.

### Cuándo se pueden agregar participantes nuevos
- Siempre en la fase de configuración.
- Durante el sorteo, solo si la variante tiene activada la opción **"permitir nuevos"**.

---

## 3. Flujo del sorteo

```
[Variante 1 — "BOLSA" — giro ganador: 2]
  Giro 1 → descartado → se elimina del pool
  Giro 2 → GANADOR ✅
    → Pantalla: "¡Nombre ganó Variante 1!"
    → Botón: Continuar con Variante 2

[Variante 2 — "PANTALON" — giro ganador: 3]
  Pool = elegibles restantes de Variante 1 + participantes de "PANTALON"
  Giro 1 → descartado
  Giro 2 → descartado
  Giro 3 → GANADOR ✅
    → Pantalla: "¡Nombre ganó Variante 2!"
    → Si hay más variantes → Continuar
    → Si era la última → Ir al Resumen Final

[Resumen final]
  Por cada variante:
    Variante 1 — Bolsa tipo shopping
      🏆 Ganador: María López
      ❌ Descartados: Juan, Pedro

  Botones: Reiniciar (con participantes) | Reiniciar desde cero | Nueva rifa
```

---

## 4. Pantalla de la ruleta

### Header
- Chips de progreso: `[✓ Bolsa] [🎯 Pantalón] [⏳ Camisa]`
- Badge de giro: `Giro 2 de 3`
- Si `giroActual === giroGanador` → resaltar en amarillo: ⭐ ¡Este es el giro del ganador!

### Panel lateral/inferior
- Lista de elegibles (los que aún participan)
- Lista de descartados del producto actual

### Botón "+ Agregar participante"
- Solo visible si la variante actual tiene `permitirNuevos = true`
- Al registrar, el `ordenDesde` = número de orden de la variante actual

---

## 5. Listado de rifas (buscar-rifa)

- Tab **"Rifas de hoy"** → GET `/configurarRifa/activas/hoy`
- Tab **"Todas las activas"** → GET `/configurarRifa/activas`
- Cada card muestra cuántas variantes tiene y cuántas ya fueron sorteadas.
- Botón "Retomar" → lleva a la rifa en el estado en que estaba.

---

## Preguntas para confirmar antes de implementar

1. ¿La búsqueda de variantes en la configuración es igual al buscador existente (nombre, color, talla, código de barras)?
2. ¿El hover con la imagen de la variante aparece en desktop solamente, o también en móvil (tap)?
3. ¿La palabra clave puede repetirse entre variantes o debe ser única por rifa?
4. Si un participante no tiene palabra clave, ¿participa en TODAS las variantes o solo en la primera?
5. ¿El orden de las variantes importa para el sorteo (se rifa 1→2→3→4 en ese orden)?
6. ¿Se necesita guardar el estado de la rifa en el backend entre sesiones (ya se hace con `getEstado`)?

---

## 6. Aclaraciones recibidas (segunda vuelta)

### 6.1 Variantes y cards

- Solo se pueden agregar variantes que tengan **stock > 0**.
- El hover/tap funciona tanto en **desktop como en móvil** (tap = toca la card).
- **Flujo para agregar una variante a la rifa:**
  1. Buscas la variante (nombre, color, talla, código de barras — igual que el buscador existente).
  2. La seleccionas.
  3. Aparece una card con: nombre · stock · código de barras + **campo de texto para la palabra clave**.
  4. Botón "Guardar" en esa card → la variante queda confirmada en la lista.
  5. Repites para las demás variantes.
  6. Puedes eliminar cualquier card con el botón ✕.

### 6.2 Palabra clave — OBLIGATORIA

- La palabra clave **es obligatoria** (no opcional como se escribió antes).
- Cada variante tiene su propia palabra clave única dentro de la rifa.
- Al agregar participantes:
  - Hay un **selector/dropdown** que solo muestra las palabras ya asignadas a las variantes configuradas → el admin elige a qué variante se registra ese participante.
  - Si el admin quiere cambiar la palabra activa (para la siguiente ronda), hay un **input editable** que permite cambiarla. La nueva palabra aplica a los participantes que se registren de ahí en adelante; los anteriores ya quedan con su palabra original.

### 6.3 Opciones al terminar una variante

Cuando termina el sorteo de una variante (se encontró el ganador), antes de pasar a la siguiente el admin elige UNA de estas tres opciones:

| Opción | Descripción |
|---|---|
| **A — Usar participantes restantes** | El pool del siguiente sorteo = los que sobrevivieron (sin descartados ni ganador). Default. |
| **B — Todos desde cero** | El pool del siguiente sorteo = TODOS los participantes originales vuelven, como si nadie hubiera sido descartado. |
| **C — Agregar participantes nuevos** | Los restantes de la variante anterior siguen participando Y además se habilita el formulario para agregar participantes nuevos antes de continuar. |

Estas opciones se configuran/eligen en la **pantalla de transición** que aparece entre variantes.

### 6.4 Estado persistido en backend

- Todo el estado se guarda en el backend (ya existe `getEstado`).
- El front no depende de localStorage; siempre puede recargar desde el servidor.
- El backend necesita guardar: pool actual, descartados por variante, ganadores por variante, historial completo.

### 6.5 Rifa de fin de mes — participantes desde clientes

- Caso de uso: al 1° de febrero se hace la rifa de todos los clientes que compraron en enero.
- El front debe poder **importar participantes desde el listado de clientes** (ya existe el módulo de clientes).
- Flujo propuesto:
  1. En la sección de participantes → botón **"Importar clientes"**.
  2. Se abre un buscador/listado de clientes (por nombre, teléfono o fecha de compra).
  3. Se seleccionan los clientes a incluir → se registran como participantes automáticamente con la palabra clave del momento.
- Siempre existe también el **formulario manual** para agregar participantes que no están en el sistema.

---

## 7. Lo que necesito confirmar del backend antes de implementar

Para no inventar endpoints, necesito saber si ya existen o hay que crearlos:

| Funcionalidad | Endpoint necesario |
|---|---|
| Listar variantes de una rifa configurada | `GET /configurarRifaProducto/porRifa/{rifaId}` ✅ ya existe |
| Guardar variante con palabra clave | `POST /configurarRifaProducto/save` — ¿ya acepta `palabraClave`? |
| Cambiar palabra clave activa de una variante | ¿`PUT /configurarRifaProducto/{id}`? |
| Selector de palabras clave disponibles | ¿Las devuelve `getProductosDeRifa`? |
| Opción A/B/C al pasar de variante | ¿`POST /ganadorRifa/reiniciar/{id}?modo=A|B|C`? ¿o ya cubre el `?completo=true/false`? |
| Importar clientes como participantes | ¿`POST /concursante/importarClientes`? ¿o se hace uno por uno? |
| Pool del siguiente sorteo tras elegir opción | ¿Lo calcula el backend al llamar a `getEstado` después de reiniciar? |

**Confirma cuáles ya existen y cuáles hay que crear, y arrancamos.**

---

*Versión 2 — pendiente de confirmación del backend antes de tocar código.*

---

## 8. Aclaración final — participantes desde pedidos

- **No se importa desde clientes directamente**, sino desde el **módulo de pedidos**.
- Flujo: el admin filtra pedidos de un mes (ej. enero) → aparecen los clientes únicos que compraron ese mes → los selecciona → se registran como participantes de la rifa.
- Si un cliente hizo una compra pero no está registrado en el sistema, el admin puede agregarlo manualmente con el formulario de la rifa (no en el módulo de clientes).
- Los datos del participante que vienen de un pedido: `nombreCliente`, `numeroTelefonico` (de `IClienteQuery`). Apellido y correo si están disponibles.

---

## 9. Contrato completo front ↔ backend — lo que hay que crear

> Este es el contrato que el front necesita. El backend debe implementar exactamente estas formas de request y response para que el front funcione sin cambios.

---

### 9.1 Tablas nuevas / campos nuevos que necesita el backend

#### Tabla: `configurar_rifa_variante` (reemplaza o extiende `configurar_rifa_producto`)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | Long | PK autoincremental |
| `configurar_rifa_id` | Long FK | Rifa a la que pertenece |
| `variante_id` | Long FK | Variante que se rifa |
| `palabraClave` | String | **Obligatoria.** Identifica a qué variante pertenece cada participante |
| `giroGanador` | Int | En qué número de giro sale el ganador (mínimo 1) |
| `orden` | Int | Posición dentro de la rifa (1, 2, 3…) |
| `permitirNuevos` | Boolean | Si se pueden agregar participantes nuevos durante este sorteo |

#### Tabla: `concursante` — campos nuevos/modificados

| Campo | Tipo | Descripción |
|---|---|---|
| `palabraClave` | String | Palabra con la que se registró → liga al participante a una variante |
| `ordenDesde` | Int | Ya existe. Desde qué posición de variante puede participar |
| `clientePedidoId` | Long nullable | ID del cliente en el módulo de pedidos (si vino de ahí) |

#### Tabla: `historial_rifa_variante` (nueva, para el resumen final)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | Long | PK |
| `configurar_rifa_id` | Long FK | Rifa |
| `variante_id` | Long FK | Variante sorteada |
| `concursante_ganador_id` | Long FK | Quién ganó |
| `descartados` | JSON / relación | Lista de concursantes descartados en esa variante |
| `orden` | Int | En qué posición de la rifa fue sorteada |

---

### 9.2 Endpoints — configuración de variantes en la rifa

#### `POST /configurarRifaVariante/save`
**Front envía:**
```json
{
  "configurarRifaId": 5,
  "varianteId": 42,
  "palabraClave": "BOLSA",
  "giroGanador": 2,
  "orden": 1,
  "permitirNuevos": false
}
```
**Front espera recibir:**
```json
{
  "data": {
    "id": 10,
    "variante": {
      "id": 42,
      "nombre": "Bolsa tipo shopping",
      "stock": 8,
      "codigoBarras": "1234567890",
      "imagenBase64": "base64string..."
    },
    "palabraClave": "BOLSA",
    "giroGanador": 2,
    "orden": 1,
    "permitirNuevos": false
  }
}
```

#### `GET /configurarRifaVariante/porRifa/{rifaId}`
**Front espera recibir:**
```json
{
  "data": [
    {
      "id": 10,
      "variante": { "id": 42, "nombre": "Bolsa tipo shopping", "stock": 8, "codigoBarras": "1234567890", "imagenBase64": "..." },
      "palabraClave": "BOLSA",
      "giroGanador": 2,
      "orden": 1,
      "permitirNuevos": false
    },
    {
      "id": 11,
      "variante": { "id": 55, "nombre": "Pantalón negro S", "stock": 3, "codigoBarras": "9876543210", "imagenBase64": "..." },
      "palabraClave": "PANTALON",
      "giroGanador": 3,
      "orden": 2,
      "permitirNuevos": true
    }
  ]
}
```

#### `DELETE /configurarRifaVariante/{id}`
**Front espera:** `{ "data": "eliminado" }` o status 200.

#### `PUT /configurarRifaVariante/{id}/palabraClave`
**Front envía:**
```json
{ "palabraClave": "NUEVA_PALABRA" }
```
**Front espera:** `{ "data": { "id": 10, "palabraClave": "NUEVA_PALABRA" } }`

---

### 9.3 Endpoints — participantes

#### `POST /concursante/registrar` (ya existe, añadir campos)
**Front envía:**
```json
{
  "nombre": "Juan",
  "apellidoPaterno": "García",
  "telefono": "5551234567",
  "palabraClave": "BOLSA",
  "configurarRifa": { "id": 5 },
  "ordenDesde": 1,
  "clientePedidoId": null
}
```
**Front espera:**
```json
{
  "data": {
    "id": 201,
    "nombre": "Juan",
    "apellidoPaterno": "García",
    "telefono": "5551234567",
    "palabraClave": "BOLSA",
    "ordenDesde": 1
  }
}
```

#### `GET /pedidos/clientesPorMes?mes=2025-01` — NUEVO
El front usa el mes seleccionado por el admin para traer clientes únicos de ese mes.
**Front espera:**
```json
{
  "data": [
    { "id": 101, "nombre": "María López", "apellido": "López", "telefono": "5559876543" },
    { "id": 102, "nombre": "Carlos Ruiz", "apellido": "Ruiz",  "telefono": "5551112222" }
  ]
}
```

#### `POST /concursante/importarDePedidos` — NUEVO
El admin selecciona clientes del mes y los importa masivamente.
**Front envía:**
```json
{
  "configurarRifaId": 5,
  "palabraClave": "BOLSA",
  "ordenDesde": 1,
  "clientes": [
    { "clientePedidoId": 101, "nombre": "María López", "apellido": "López", "telefono": "5559876543" },
    { "clientePedidoId": 102, "nombre": "Carlos Ruiz", "apellido": "Ruiz",  "telefono": "5551112222" }
  ]
}
```
**Front espera:**
```json
{
  "data": {
    "importados": 2,
    "concursantes": [
      { "id": 201, "nombre": "María López", "palabraClave": "BOLSA" },
      { "id": 202, "nombre": "Carlos Ruiz", "palabraClave": "BOLSA" }
    ]
  }
}
```

---

### 9.4 Endpoints — sorteo (modificaciones a los existentes)

#### `GET /ganadorRifa/estado/{rifaId}` — MODIFICAR RESPONSE
**Front espera ahora:**
```json
{
  "data": {
    "configurarRifa": { "id": 5, "fechaHoraLimite": "2026-02-01T20:00:00" },
    "varianteActual": {
      "id": 10,
      "palabraClave": "BOLSA",
      "giroGanador": 2,
      "orden": 1,
      "permitirNuevos": false,
      "variante": { "id": 42, "nombre": "Bolsa tipo shopping", "stock": 8, "codigoBarras": "1234567890", "imagenBase64": "..." }
    },
    "giroActual": 1,
    "totalVariantes": 3,
    "varianteNumeroActual": 1,
    "elegibles": [
      { "id": 201, "nombre": "Juan García", "palabraClave": "BOLSA", "telefono": "5551234567" }
    ],
    "descartados": [],
    "ganador": null,
    "rifaTerminada": false,
    "historial": []
  }
}
```

Cuando `rifaTerminada = true`, el `historial` viene con datos:
```json
"historial": [
  {
    "orden": 1,
    "variante": { "id": 42, "nombre": "Bolsa tipo shopping" },
    "ganador": { "id": 201, "nombre": "Juan García", "telefono": "5551234567" },
    "descartados": [
      { "id": 205, "nombre": "Pedro Sánchez" }
    ]
  }
]
```

#### `POST /ganadorRifa/sortear/{rifaId}` — MODIFICAR RESPONSE
Ya no lleva params. Response:
```json
{
  "data": {
    "descartado": true,
    "concursante": { "id": 205, "nombre": "Pedro Sánchez", "palabraClave": "BOLSA" },
    "variante": { "id": 42, "nombre": "Bolsa tipo shopping" },
    "rifaTerminada": false
  }
}
```

#### `POST /ganadorRifa/continuarVariante/{rifaId}?modo=RESTANTES` — NUEVO
Se llama en la pantalla de transición cuando el admin elige cómo continuar.
`modo` puede ser:
- `RESTANTES` — pool = elegibles que sobran (sin descartados ni ganador)
- `CERO` — pool = todos los participantes originales regresan
- `NUEVOS` — solo abre la puerta a agregar nuevos; los restantes siguen igual

**Front envía:** solo el query param `?modo=RESTANTES` (sin body).
**Front espera:** mismo formato que `getEstado`, con `varianteActual` ya apuntando a la siguiente variante.

---

### 9.5 Endpoints — listado de rifas (modificar response)

#### `GET /configurarRifa/activas` y `GET /configurarRifa/activas/hoy`
**Front espera añadir estos campos a cada rifa:**
```json
{
  "data": [
    {
      "id": 5,
      "fechaHoraLimite": "2026-02-01T20:00:00",
      "activa": true,
      "totalVariantes": 3,
      "variantesSorteadas": 1
    }
  ]
}
```

---

### 9.6 Resumen — qué hay que crear vs qué ya existe

| Endpoint | Estado |
|---|---|
| `POST /configurarRifa/save` | ✅ Existe |
| `GET /configurarRifa/activas` | ✅ Existe — agregar `totalVariantes` y `variantesSorteadas` |
| `GET /configurarRifa/activas/hoy` | ✅ Existe — mismo cambio |
| `POST /configurarRifaVariante/save` | 🆕 Nuevo (o renombrar `configurarRifaProducto`) |
| `GET /configurarRifaVariante/porRifa/{id}` | 🆕 Nuevo |
| `DELETE /configurarRifaVariante/{id}` | 🆕 Nuevo |
| `PUT /configurarRifaVariante/{id}/palabraClave` | 🆕 Nuevo |
| `POST /concursante/registrar` | ✅ Existe — agregar `palabraClave` y `clientePedidoId` |
| `GET /concursante/porRifa/{rifaId}` | ✅ Existe |
| `GET /concursante/elegibles/{rifaId}` | ✅ Existe |
| `POST /concursante/importarDePedidos` | 🆕 Nuevo |
| `GET /pedidos/clientesPorMes?mes=YYYY-MM` | 🆕 Nuevo |
| `POST /ganadorRifa/sortear/{rifaId}` | ✅ Existe — quitar params, modificar response |
| `GET /ganadorRifa/estado/{rifaId}` | ✅ Existe — ampliar response |
| `POST /ganadorRifa/continuarVariante/{id}?modo=` | 🆕 Nuevo |
| `POST /ganadorRifa/reiniciar/{id}?completo=` | ✅ Existe |

---

*Versión 3 — contrato listo. Cuando el backend confirme que implementó los endpoints marcados como 🆕, arrancamos con el front.*

---

## 10. Contrato oficial confirmado por el backend — `contrato_front.md`

> Este es el contrato definitivo que el backend entregó. Reemplaza cualquier estimación anterior de la sección 9.
> Base URL: `{host}/mis-productos` · Todos los endpoints requieren `Authorization: Bearer {jwt}` con rol ADMIN.

---

### Endpoint 1 — Buscar variante por código de barras o nombre

```
GET /variantes/buscar?termino={valor}&pagina=1&size=10
```

Response:
```json
{
  "code": 200,
  "data": {
    "pagina": 1, "totalPaginas": 1, "totalRegistros": 2,
    "t": [
      {
        "id": 42, "talla": "M", "color": "Negro", "stock": 8,
        "marca": "Sin marca", "codigoBarras": "Su2287",
        "nombreProducto": "Jeans Short Brillo", "precio": 250.0,
        "imagenBase64": "base64..."
      }
    ]
  }
}
```

---

### Endpoint 2 — Crear sesión de rifa

```
POST /configurarRifa/save
Body: { "fechaHoraLimite": "2026-05-10T20:00:00", "activa": true }
```

Response: `{ "code": 200, "data": { "id": 5, "fechaHoraLimite": "...", "activa": true } }`

---

### Endpoint 3 — Agregar variante a la rifa (descuenta 1 del stock)

```
POST /configurarRifaVariante/save
Body: { "configurarRifaId": 5, "varianteId": 42, "palabraClave": "BOLSA", "giroGanador": 2, "orden": 1, "permitirNuevos": false }
```

Response:
```json
{
  "code": 200,
  "data": {
    "id": 10,
    "variante": { "id": 42, "talla": "M", "color": "Negro", "stock": 7 },
    "palabraClave": "BOLSA", "giroGanador": 2, "orden": 1,
    "permitirNuevos": false, "stockReservado": 1
  }
}
```

Errores: `400 "La variante no tiene stock disponible"` · `400 "La palabraClave 'BOLSA' ya existe en esta rifa"`

> ⚠️ DUDA: el front necesita `codigoBarras` e `imagenBase64` de la variante para la card y el hover-modal. ¿El backend los puede incluir en esta respuesta?

---

### Endpoint 4 — Listar variantes de la rifa

```
GET /configurarRifaVariante/porRifa/{rifaId}
```

Response:
```json
{
  "code": 200,
  "data": [
    { "id": 10, "variante": { "id": 42, "talla": "M" }, "palabraClave": "BOLSA", "giroGanador": 2, "orden": 1 },
    { "id": 11, "variante": { "id": 55, "talla": "L" }, "palabraClave": "PANTALON", "giroGanador": 3, "orden": 2 }
  ]
}
```

> ⚠️ Misma duda: necesito `codigoBarras` e `imagenBase64` en cada `variante`.

---

### Endpoint 5 — Palabras clave disponibles (para el select al agregar participante)

```
GET /configurarRifaVariante/palabrasClave/{rifaId}
```

Response: `{ "code": 200, "data": ["BOLSA", "PANTALON", "FALDA"] }`

---

### Endpoint 6 — Eliminar variante de la rifa (regresa el stock)

```
DELETE /configurarRifaVariante/{id}
```

Response: `{ "code": 200, "data": "Variante eliminada y stock restaurado" }`

---

### Endpoint 7 — Actualizar palabraClave de una variante

```
PUT /configurarRifaVariante/{id}/palabraClave
Body: { "palabraClave": "NUEVA_PALABRA" }
```

Response: `{ "code": 200, "data": { "id": 10, "palabraClave": "NUEVA_PALABRA" } }`

---

### Endpoint 8 — Agregar participante

```
POST /concursante/registrar
Body:
{
  "nombre": "Juan", "apellidoPaterno": "García", "telefono": "5551234567",
  "palabraClave": "BOLSA", "ordenDesde": 1, "clientePedidoId": null,
  "configurarRifa": { "id": 5 }
}
```

Response:
```json
{
  "code": 200,
  "data": { "id": 201, "nombre": "Juan", "apellidoPaterno": "García", "telefono": "5551234567", "palabraClave": "BOLSA", "ordenDesde": 1, "descartado": false }
}
```

> ⚠️ DUDA: en endpoint 9/10 el campo se llama `apellido`, aquí se llama `apellidoPaterno`. ¿Cuál es el correcto para el body del importar?

---

### Endpoint 9 — Clientes del mes para rifa mensual

```
GET /concursante/clientesPorMes?mes=2026-01
```

Response:
```json
{
  "code": 200,
  "data": [
    { "clientePedidoId": 101, "nombre": "María López", "apellido": "", "telefono": "5559876543" },
    { "clientePedidoId": null, "nombre": "", "apellido": "", "telefono": "" }
  ]
}
```

> Si `clientePedidoId = null`: pedido sin cliente registrado. El admin puede editar el nombre antes de importar.
> ⚠️ DUDA: ¿`apellido` siempre vendrá vacío o el backend extrae algo?

---

### Endpoint 10 — Importar participantes desde pedidos del mes

```
POST /concursante/importarDePedidos
Body:
{
  "configurarRifaId": 5, "palabraClave": "BOLSA", "ordenDesde": 1,
  "clientes": [
    { "clientePedidoId": 101, "nombre": "María López", "apellido": "", "telefono": "5559876543" },
    { "clientePedidoId": null, "nombre": "Sin Nombre", "apellido": "", "telefono": "" }
  ]
}
```

Response:
```json
{
  "code": 200,
  "data": [
    { "id": 201, "nombre": "María López", "palabraClave": "BOLSA" },
    { "id": 202, "nombre": "Sin Nombre",  "palabraClave": "BOLSA" }
  ]
}
```

---

### Endpoint 11 — Estado del sorteo

```
GET /ganadorRifa/estado/{configurarRifaId}
```

Response (en proceso):
```json
{
  "code": 200,
  "data": {
    "configurarRifa": { "id": 5, "activa": true, "fechaHoraLimite": "2026-05-10T20:00:00" },
    "totalConcursantes": 10, "totalVariantes": 3, "varianteNumeroActual": 1,
    "varianteActual": {
      "id": 10, "palabraClave": "BOLSA", "giroGanador": 2, "orden": 1,
      "variante": { "id": 42, "talla": "M", "color": "Negro" }
    },
    "giroActual": 1, "giroGanador": 2,
    "elegibles": [ { "id": 201, "nombre": "Juan García", "palabraClave": "BOLSA", "telefono": "5551234567" } ],
    "descartados": [], "historial": [], "rifaTerminada": false
  }
}
```

Response (terminada): `rifaTerminada: true` + historial completo con `configurarRifaVariante`, `concursanteGanador` y `modoContinuacion` por cada entrada.

---

### Endpoint 12 — Girar la ruleta

```
POST /ganadorRifa/sortear/{configurarRifaId}
```

Response descartado:
```json
{
  "code": 200,
  "data": {
    "descartado": true,
    "concursante": { "id": 205, "nombre": "Pedro Sánchez", "palabraClave": "BOLSA" },
    "configurarRifaVariante": { "id": 10, "palabraClave": "BOLSA", "orden": 1, "giroGanador": 2 }
  }
}
```

Response ganador:
```json
{
  "code": 200,
  "data": {
    "descartado": false,
    "concursante": { "id": 201, "nombre": "Juan García", "palabraClave": "BOLSA" },
    "configurarRifaVariante": { "id": 10, "palabraClave": "BOLSA", "orden": 1, "giroGanador": 2, "variante": { "id": 42 } }
  }
}
```

> ⚠️ DUDA: la respuesta del ganador no incluye `rifaTerminada`. ¿Lo agrega el backend, o el front llama a `getEstado` después de cada ganador?

Errores: `400` sin elegibles · `400` todas sorteadas · `400` rifa inactiva.

---

### Endpoint 13 — Continuar a la siguiente variante

```
POST /ganadorRifa/continuarVariante/{configurarRifaId}?modo=RESTANTES
```

| Modo | Qué hace |
|---|---|
| `RESTANTES` | Los no eliminados pasan a la siguiente variante |
| `CERO` | Todos los participantes originales regresan desde cero |
| `NUEVOS` | Los restantes de la variante anterior siguen + se habilita agregar participantes nuevos antes de continuar |

> ✅ Confirmado: NUEVOS = restantes + nuevos que el admin agregue.

Response: mismo formato que `getEstado` con `varianteActual` ya actualizada.

---

### Endpoint 14 — Reiniciar rifa

```
POST /ganadorRifa/reiniciar/{configurarRifaId}?completo=false
```

- `completo=false` → conserva participantes, resetea el sorteo
- `completo=true` → borra participantes también

Response: `{ "code": 200, "data": "Rifa reiniciada (concursantes conservados)" }`

---

### Endpoint 15 — Rifas activas del día

```
GET /configurarRifa/activas/hoy
```

Response: `{ "code": 200, "data": [ { "id": 5, "fechaHoraLimite": "...", "activa": true } ] }`

> ⚠️ DUDA: para las cards del listado necesito `totalVariantes` y `variantesSorteadas`. ¿El backend los puede incluir?

---

### Tabla resumen de endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/variantes/buscar?termino=` | GET | Buscar variante |
| `/configurarRifa/save` | POST | Crear sesión de rifa |
| `/configurarRifa/activas/hoy` | GET | Rifas activas del día |
| `/configurarRifaVariante/save` | POST | Agregar variante (descuenta stock) |
| `/configurarRifaVariante/porRifa/{id}` | GET | Listar variantes de la rifa |
| `/configurarRifaVariante/palabrasClave/{id}` | GET | Keywords para el select |
| `/configurarRifaVariante/{id}` | DELETE | Eliminar variante (regresa stock) |
| `/configurarRifaVariante/{id}/palabraClave` | PUT | Cambiar palabraClave |
| `/concursante/registrar` | POST | Agregar participante |
| `/concursante/porRifa/{id}` | GET | Listar participantes |
| `/concursante/elegibles/{id}` | GET | Solo elegibles |
| `/concursante/clientesPorMes?mes=` | GET | Clientes del mes |
| `/concursante/importarDePedidos` | POST | Importar masivo desde pedidos |
| `/ganadorRifa/estado/{id}` | GET | Estado actual del sorteo |
| `/ganadorRifa/sortear/{id}` | POST | Girar la ruleta |
| `/ganadorRifa/continuarVariante/{id}?modo=` | POST | Continuar a siguiente variante |
| `/ganadorRifa/reiniciar/{id}?completo=` | POST | Reiniciar sorteo |

---

*Versión 4 — contrato oficial integrado. Pendiente respuesta a las 5 dudas marcadas con ⚠️ antes de codificar.*
