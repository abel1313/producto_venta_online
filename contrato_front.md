# Contrato de Rifas — Frontend ↔ Backend

Base URL: `{host}/mis-productos`
Todos los endpoints requieren `Authorization: Bearer {jwt}` con rol ADMIN.

---

## 1. Buscar variante por código de barras

```
GET /variantes/buscar?termino={codigoBarras}&pagina=1&size=10
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "pagina": 1,
    "totalPaginas": 1,
    "totalRegistros": 2,
    "t": [
      {
        "id": 42,
        "talla": "M",
        "color": "Negro",
        "stock": 8,
        "marca": "Sin marca",
        "codigoBarras": "Su2287",
        "nombreProducto": "Jeans Short Brillo",
        "precio": 250.0,
        "imagenBase64": "base64..."
      }
    ]
  }
}
```

---

## 2. Crear sesión de rifa

```
POST /configurarRifa/save
Body: { "fechaHoraLimite": "2026-05-10T20:00:00", "activa": true }
```

**Response:**
```json
{ "code": 200, "data": { "id": 5, "fechaHoraLimite": "2026-05-10T20:00:00", "activa": true } }
```

---

## 3. Agregar variante a la rifa (descuenta 1 del stock)

```
POST /configurarRifaVariante/save
Body:
{
  "configurarRifaId": 5,
  "varianteId": 42,
  "palabraClave": "BOLSA",
  "giroGanador": 2,
  "orden": 1,
  "permitirNuevos": false
}
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "id": 10,
    "variante": { "id": 42, "talla": "M", "color": "Negro", "stock": 7 },
    "palabraClave": "BOLSA",
    "giroGanador": 2,
    "orden": 1,
    "permitirNuevos": false,
    "stockReservado": 1
  }
}
```

**Error (sin stock):**
```json
{ "code": 400, "mensaje": "La variante no tiene stock disponible" }
```

**Error (palabraClave duplicada):**
```json
{ "code": 400, "mensaje": "La palabraClave 'BOLSA' ya existe en esta rifa" }
```

---

## 4. Listar variantes de la rifa

```
GET /configurarRifaVariante/porRifa/{rifaId}
```

**Response:**
```json
{
  "code": 200,
  "data": [
    { "id": 10, "variante": { "id": 42, "talla": "M" }, "palabraClave": "BOLSA", "giroGanador": 2, "orden": 1 },
    { "id": 11, "variante": { "id": 55, "talla": "L" }, "palabraClave": "PANTALON", "giroGanador": 3, "orden": 2 }
  ]
}
```

---

## 5. Obtener palabrasClave disponibles (para el select al agregar participante)

```
GET /configurarRifaVariante/palabrasClave/{rifaId}
```

**Response:**
```json
{ "code": 200, "data": ["BOLSA", "PANTALON", "FALDA"] }
```

---

## 6. Eliminar variante de la rifa (regresa el stock)

```
DELETE /configurarRifaVariante/{id}
```

**Response:**
```json
{ "code": 200, "data": "Variante eliminada y stock restaurado" }
```

---

## 7. Actualizar palabraClave de una variante

```
PUT /configurarRifaVariante/{id}/palabraClave
Body: { "palabraClave": "NUEVA_PALABRA" }
```

**Response:**
```json
{ "code": 200, "data": { "id": 10, "palabraClave": "NUEVA_PALABRA" } }
```

---

## 8. Agregar participante

```
POST /concursante/registrar
Body:
{
  "nombre": "Juan",
  "apellidoPaterno": "García",
  "telefono": "5551234567",
  "palabraClave": "BOLSA",
  "ordenDesde": 1,
  "clientePedidoId": null,
  "configurarRifa": { "id": 5 }
}
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "id": 201,
    "nombre": "Juan",
    "apellidoPaterno": "García",
    "telefono": "5551234567",
    "palabraClave": "BOLSA",
    "ordenDesde": 1,
    "descartado": false
  }
}
```

---

## 9. Obtener clientes del mes para rifa mensual

```
GET /concursante/clientesPorMes?mes=2026-01
```

**Response:**
```json
{
  "code": 200,
  "data": [
    { "clientePedidoId": 101, "nombre": "María López", "apellido": "", "telefono": "5559876543" },
    { "clientePedidoId": 102, "nombre": "Carlos Ruiz", "apellido": "", "telefono": "5551112222" },
    { "clientePedidoId": null, "nombre": "", "apellido": "", "telefono": "" }
  ]
}
```

> Si `clientePedidoId = null`: el pedido no tenía cliente registrado. El admin puede editar el nombre antes de importar.

---

## 10. Importar participantes desde pedidos del mes

```
POST /concursante/importarDePedidos
Body:
{
  "configurarRifaId": 5,
  "palabraClave": "BOLSA",
  "ordenDesde": 1,
  "clientes": [
    { "clientePedidoId": 101, "nombre": "María López", "apellido": "", "telefono": "5559876543" },
    { "clientePedidoId": null, "nombre": "Sin Nombre", "apellido": "", "telefono": "" }
  ]
}
```

**Response:**
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

## 11. Ver estado del sorteo

```
GET /ganadorRifa/estado/{configurarRifaId}
```

**Response (en proceso):**
```json
{
  "code": 200,
  "data": {
    "configurarRifa": { "id": 5, "activa": true, "fechaHoraLimite": "2026-05-10T20:00:00" },
    "totalConcursantes": 10,
    "totalVariantes": 3,
    "varianteNumeroActual": 1,
    "varianteActual": {
      "id": 10, "palabraClave": "BOLSA", "giroGanador": 2, "orden": 1,
      "variante": { "id": 42, "talla": "M", "color": "Negro" }
    },
    "giroActual": 1,
    "giroGanador": 2,
    "elegibles": [
      { "id": 201, "nombre": "Juan García", "palabraClave": "BOLSA", "telefono": "5551234567" }
    ],
    "descartados": [],
    "historial": [],
    "rifaTerminada": false
  }
}
```

**Response (terminada):**
```json
{
  "code": 200,
  "data": {
    "rifaTerminada": true,
    "historial": [
      {
        "orden": 1,
        "configurarRifaVariante": { "palabraClave": "BOLSA", "variante": { "id": 42, "talla": "M" } },
        "concursanteGanador": { "id": 201, "nombre": "Juan García" },
        "modoContinuacion": "RESTANTES"
      }
    ]
  }
}
```

---

## 12. Girar la ruleta

```
POST /ganadorRifa/sortear/{configurarRifaId}
```

**Response descartado:**
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

**Response ganador:**
```json
{
  "code": 200,
  "data": {
    "descartado": false,
    "concursante": { "id": 201, "nombre": "Juan García", "palabraClave": "BOLSA" },
    "configurarRifaVariante": {
      "id": 10, "palabraClave": "BOLSA", "orden": 1, "giroGanador": 2,
      "variante": { "id": 42, "talla": "M", "color": "Negro" }
    }
  }
}
```

**Errores posibles:**
```json
{ "code": 400, "mensaje": "No hay concursantes elegibles para la variante con palabraClave='BOLSA'" }
{ "code": 400, "mensaje": "Todas las variantes ya fueron sorteadas" }
{ "code": 400, "mensaje": "Esta rifa ya fue completada o está inactiva" }
```

---

## 13. Continuar a la siguiente variante

Se llama cuando `descartado = false` (hay ganador) y el admin elige cómo continuar.

```
POST /ganadorRifa/continuarVariante/{configurarRifaId}?modo=RESTANTES
```

| Modo | Qué hace |
|------|----------|
| `RESTANTES` | Los no eliminados de la variante anterior pasan a la siguiente con su nueva palabraClave |
| `CERO` | Todos los de la variante anterior resetean y pasan a la siguiente |
| `NUEVOS` | Solo participantes nuevos irán a la siguiente variante |

**Response:** mismo formato que `GET /ganadorRifa/estado/{id}` con `varianteActual` actualizada.

---

## 14. Reiniciar rifa

```
POST /ganadorRifa/reiniciar/{configurarRifaId}?completo=false
```

- `completo=false` → conserva participantes, resetea todo el sorteo
- `completo=true` → borra participantes también

**Response:**
```json
{ "code": 200, "data": "Rifa reiniciada (concursantes conservados)" }
```

---

## 15. Rifas activas del día

```
GET /configurarRifa/activas/hoy
```

**Response:**
```json
{
  "code": 200,
  "data": [
    { "id": 5, "fechaHoraLimite": "2026-05-07T20:00:00", "activa": true }
  ]
}
```

---

## Resumen de endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/variantes/buscar?termino=` | GET | Buscar variante por código de barras |
| `/configurarRifa/save` | POST | Crear sesión de rifa |
| `/configurarRifa/activas/hoy` | GET | Rifas activas del día |
| `/configurarRifaVariante/save` | POST | Agregar variante (descuenta stock) |
| `/configurarRifaVariante/porRifa/{id}` | GET | Listar variantes de la rifa |
| `/configurarRifaVariante/palabrasClave/{id}` | GET | PalabrasClave para el select |
| `/configurarRifaVariante/{id}` | DELETE | Eliminar variante (regresa stock) |
| `/configurarRifaVariante/{id}/palabraClave` | PUT | Cambiar palabraClave |
| `/concursante/registrar` | POST | Agregar participante |
| `/concursante/porRifa/{id}` | GET | Listar participantes |
| `/concursante/elegibles/{id}` | GET | Solo elegibles |
| `/concursante/clientesPorMes?mes=` | GET | Clientes del mes para rifa mensual |
| `/concursante/importarDePedidos` | POST | Importar masivo desde pedidos |
| `/ganadorRifa/estado/{id}` | GET | Estado actual del sorteo |
| `/ganadorRifa/sortear/{id}` | POST | Girar la ruleta |
| `/ganadorRifa/continuarVariante/{id}?modo=` | POST | Continuar a siguiente variante |
| `/ganadorRifa/reiniciar/{id}?completo=` | POST | Reiniciar sorteo |