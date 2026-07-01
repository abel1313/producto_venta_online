# Módulo Gastos y Ventas — Especificación para Frontend

> **Backend:** `proyecto-key (9091)` — contexto `/mis-productos`  
> Acceso: solo **ADMIN**  
> Respuestas envueltas en `{ response: <dato>, message: null }` (ResponseGeneric)

---

## 1. Entidades

### Gasto
```json
{
  "id": 1,
  "descripcion": "Surtido proveedor Martínez",
  "monto": 5000.00,
  "fecha": "2026-06-19",
  "categoria": "INVENTARIO",
  "proveedor": "Martínez e hijos",
  "comprobante": "FAC-2026-001",
  "notas": "Pantalones talla 28 y 30"
}
```

**Categorías válidas:**
| Valor | Descripción |
|---|---|
| `INVENTARIO` | Compra de mercancía / surtido |
| `OPERATIVO` | Renta, luz, agua, internet |
| `SERVICIOS` | Empaque, transporte, comisiones |
| `OTROS` | Cualquier gasto que no encaje |

### PginaDto (paginación)
```json
{
  "response": {
    "t": [ ...lista de gastos... ],
    "totalRegistros": 45,
    "totalPaginas": 3,
    "pagina": 0
  }
}
```

---

## 2. Endpoints — Gastos

### Crear gasto
```
POST /v1/gastos/save
Content-Type: application/json

{
  "descripcion": "Surtido proveedor Martínez",
  "monto": 5000.00,
  "fecha": "2026-06-19",
  "categoria": "INVENTARIO",
  "proveedor": "Martínez e hijos",
  "comprobante": "FAC-2026-001",
  "notas": "Opcional"
}
```
- `descripcion`, `monto`, `fecha`, `categoria` → obligatorios
- `proveedor`, `comprobante`, `notas` → opcionales
- Si no se manda `fecha` → usa fecha de hoy
- Si no se manda `categoria` → usa `OTROS`

**Response 200:**
```json
{ "response": { "id": 5, "descripcion": "...", "monto": 5000.0, ... } }
```

---

### Buscar gastos (con filtros)
```
GET /v1/gastos/buscar?fecha=2026-06-19&page=0&size=20
GET /v1/gastos/buscar?fechaInicio=2026-06-01&fechaFin=2026-06-30&page=0&size=20
GET /v1/gastos/buscar?fechaInicio=2026-06-01&fechaFin=2026-06-30&categoria=INVENTARIO&page=0&size=20
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `fecha` | `yyyy-MM-dd` | Día exacto (equivale a fechaInicio=fechaFin=fecha) |
| `fechaInicio` | `yyyy-MM-dd` | Inicio del rango |
| `fechaFin` | `yyyy-MM-dd` | Fin del rango |
| `categoria` | `INVENTARIO\|OPERATIVO\|SERVICIOS\|OTROS` | Filtro opcional |
| `page` | int | Página base 0 (default: 0) |
| `size` | int | Registros por página (default: 20) |

- Sin parámetros → devuelve gastos de hoy
- Los resultados vienen ordenados por `fecha DESC`

**Response 200:**
```json
{
  "response": {
    "t": [ { "id": 1, "descripcion": "...", "monto": 500.0, "fecha": "2026-06-19", "categoria": "OPERATIVO", ... } ],
    "totalRegistros": 12,
    "totalPaginas": 1,
    "pagina": 0
  }
}
```

---

### Editar gasto
```
PUT /v1/gastos/{id}
Content-Type: application/json

{
  "descripcion": "Surtido actualizado",
  "monto": 5500.00,
  "categoria": "INVENTARIO"
}
```
- Solo enviar los campos que cambian — los demás se conservan

**Response 200:** gasto actualizado  
**Response 400:** `{ "response": null, "message": "Gasto no encontrado" }`

---

### Eliminar gasto
```
DELETE /v1/gastos/{id}
```
**Response 200:** `{ "response": "Gasto eliminado" }`  
**Response 400:** `{ "response": null, "message": "Gasto no encontrado" }`

---

## 3. Endpoints — Ventas

### Buscar ventas por fecha
```
GET /v1/ventas/buscar?fecha=2026-06-19&page=0&size=20
GET /v1/ventas/buscar?fechaInicio=2026-06-01&fechaFin=2026-06-30&page=0&size=20
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `fecha` | `yyyy-MM-dd` | Día exacto |
| `fechaInicio` | `yyyy-MM-dd` | Inicio del rango |
| `fechaFin` | `yyyy-MM-dd` | Fin del rango |
| `page` | int | Página base 0 (default: 0) |
| `size` | int | Registros por página (default: 20) |

- Sin parámetros → devuelve ventas de hoy
- Ordenadas por `fechaVenta DESC`

**Response:** `PginaDto<List<Venta>>` igual al de gastos, campo `t` con el listado

Campos útiles de cada `Venta`:
```json
{
  "id": 10,
  "totalVenta": 450.00,
  "gananciaTotal": 180.00,
  "estadoVenta": "Entregado",
  "fechaVenta": "2026-06-19T14:30:00",
  "cliente": { "nombrePersona": "Juan", "apellidoPaterno": "Pérez" },
  "detalles": [
    {
      "cantidad": 1,
      "precioUnitario": 450.00,
      "precioCosto": 270.00,
      "subTotal": 450.00,
      "ganancia": 180.00
    }
  ]
}
```

---

## 4. Endpoint — Reporte de rentabilidad

```
GET /v1/gastos/reporte?fechaInicio=2026-06-01&fechaFin=2026-06-30
```

- Sin parámetros → devuelve el mes actual (del día 1 a hoy)

**Response 200:**
```json
{
  "response": {
    "fechaInicio": "2026-06-01",
    "fechaFin": "2026-06-30",

    "totalVentas": 15400.00,
    "totalGananciaProductos": 4200.00,
    "totalTransacciones": 34,

    "totalGastos": 7700.00,
    "gastosPorCategoria": {
      "INVENTARIO": 5000.00,
      "OPERATIVO": 2400.00,
      "SERVICIOS": 300.00
    },

    "gananciaNeta": -3500.00
  }
}
```

> **Importante:** `gananciaNeta` puede ser negativa en meses de surtido fuerte — es normal.
> La cifra confiable de ganancia por unidad vendida es `totalGananciaProductos`,
> porque ya descuenta el costo de cada pieza en el momento de la venta.

---

## 5. Pantalla sugerida

### Tab "Gastos"

```
┌─────────────────────────────────────────────────────────┐
│  [+ Agregar gasto]                                      │
│                                                         │
│  Filtros:                                               │
│  Fecha: [19/06/2026]   Categoría: [Todas ▼]            │
│  [Buscar]                                               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 19/jun  OPERATIVO   Renta local    $2,400  [✏][🗑]│   │
│  │ 18/jun  INVENTARIO  Surtido Mtz    $5,000  [✏][🗑]│   │
│  │ 15/jun  SERVICIOS   Empaque        $300    [✏][🗑]│   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tab "Ventas"
```
┌─────────────────────────────────────────────────────────┐
│  Fecha: [19/06/2026]   [Buscar]                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ #10  Juan Pérez   $450  Entregado  14:30         │   │
│  │ #9   María López  $900  Entregado  12:15         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tab "Reporte"
```
┌─────────────────────────────────────────────────────────┐
│  Periodo: [01/06/2026] al [30/06/2026]  [Ver reporte]   │
│                                                         │
│  Ventas brutas (ingresos):      $15,400                 │
│  Ganancia por producto:          $4,200                 │
│  ──────────────────────────────────────────────────     │
│  Gastos del periodo:                                    │
│    INVENTARIO  (surtido):        $5,000                 │
│    OPERATIVO   (renta + luz):    $2,400                 │
│    SERVICIOS   (empaque):          $300                 │
│    Total gastos:                 $7,700                 │
│  ──────────────────────────────────────────────────     │
│  Ganancia estimada neta:        -$3,500  ⚠️ negativa   │
│                                                         │
│  * Negativa porque se surtió este mes pero              │
│    las piezas aún están por venderse.                   │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Formulario agregar/editar gasto

```
Descripción*: [________________________]
Monto*:       [$_______]
Fecha*:       [19/06/2026]
Categoría*:   [INVENTARIO ▼]
Proveedor:    [________________________]  (opcional)
Comprobante:  [________________________]  (opcional, núm. factura)
Notas:        [________________________]  (opcional)

[Cancelar]                      [Guardar]
```

- Al editar: precargar todos los campos con los valores actuales
- `PUT /v1/gastos/{id}` — enviar solo los campos que el usuario modificó

---

## 7. Resumen de endpoints

| Método | URL | Descripción |
|---|---|---|
| `POST` | `/v1/gastos/save` | Crear gasto |
| `GET` | `/v1/gastos/buscar` | Listar con filtros fecha/categoria |
| `PUT` | `/v1/gastos/{id}` | Editar gasto |
| `DELETE` | `/v1/gastos/{id}` | Eliminar gasto |
| `GET` | `/v1/gastos/reporte` | Reporte ventas + gastos del periodo |
| `GET` | `/v1/ventas/buscar` | Buscar ventas por fecha |
