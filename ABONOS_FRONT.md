# Módulo Abonos (Apartado / Fiado) — Guía Frontend

> **Backend:** `proyecto-key (9091)` — contexto `/mis-productos`  
> Acceso: solo **ADMIN** (token JWT en cookie)  
> Respuestas envueltas en `ResponseGeneric`: `{ mensaje, code, data, lista }`

---

## ESTADO DE IMPLEMENTACIÓN (2026-06-30)

| Ítem | Estado | Notas |
|---|---|---|
| Módulo `/abonos` (lazy, guards admin) | ✅ Implementado | `src/app/abonos/` |
| `AbonoService` con 4 endpoints | ✅ Implementado | `src/app/abonos/service/abono.service.ts` |
| Interfaces `AbonoRequest`, `AbonoResponse`, `EstadoCuenta`, `PedidoPagado` | ✅ Implementado | `src/app/abonos/models/abono.model.ts` |
| Tab "Cuentas por cobrar" | ✅ Implementado | |
| Tab "Liquidados" | ✅ Implementado | |
| Modal de abono (monto, método, fecha, nota) | ✅ Implementado | 3 métodos: EFECTIVO, TRANSFERENCIA, TARJETA |
| `usuarioId` en request de abono | ✅ Implementado | Se obtiene de `AuthService.userId$` |
| Opciones APARTADO / IR PAGANDO en venta directa | ✅ Implementado | `src/app/variante/venta-directa/` |
| Opciones APARTADO / IR PAGANDO en carrito | ✅ Implementado | `src/app/variante/venta-variante/` |
| Carrito admin → venta directa (Flujo C) | ✅ Implementado | Botón "💰 Cobrar ahora" en el carrito |
| Link a `/abonos` tras pedido crédito | ✅ Implementado | Swal post-confirmación |

### Aclaraciones implementadas (2026-06-30)

**Response de `POST /v1/abonos/{id}`:** el backend devuelve el objeto abono **completo**
(`id`, `monto`, `fechaPago`, `metodoPago`, `nota`, `estadoPedido`, `saldoRestante`).
Por eso `AbonoResponse` incluye `estadoPedido?` y `saldoRestante?` como campos opcionales
(presentes solo en POST, ausentes en GET del historial).

**Actualización del historial tras registrar abono:** el front usa directamente `res.data`
del backend para agregar al historial local — sin construir un objeto temporal con `Date.now()`
como id. El id real queda disponible en el historial.

**Al liquidar (PAGADO):** el front quita el pedido del array local (`estadoCuenta.filter(...)`)
en vez de hacer un reload completo del server. Esto es más eficiente y es correcto porque
`data.estadoPedido === 'PAGADO'` confirma el estado definitivo desde el back.

---

## RESUMEN — Qué tiene que hacer el front

### Cambios en requests existentes

| Endpoint | Campo nuevo | Tipo | Obligatorio | Notas |
|---|---|---|---|---|
| `POST /v1/ventas/save` | `tipoPedido` | `string` | No | `"APARTADO"` o `"FIADO"` activa flujo crédito; omitir = venta normal |
| `POST /v1/ventas/save` | `observaciones` | `string` | No | Texto libre; visible en el pedido |
| `POST /v1/ventas/save` | `pagosYMesesId` | `number` | **Solo si NO es crédito** | Omitir cuando `tipoPedido = APARTADO/FIADO` |
| `POST /v1/pedidos/savePedido` | `tipoPedido` | `string` | No | Igual que arriba, para el flujo de carrito |
| `POST /v1/abonos/{id}` | `usuarioId` | `number` | **Sí** | Id del admin logueado — necesario para crear la venta al liquidar |

### Cambios en responses

| Endpoint | Campo nuevo | Cuándo viene con valor |
|---|---|---|
| `POST /v1/ventas/save` | `pedidoId` | Solo cuando `tipoPedido = APARTADO/FIADO`; `ventaId` será `null` |
| `POST /v1/ventas/save` | `ventaId` | Solo en venta normal; `pedidoId` será `null` |
| `POST /v1/abonos/{id}` | `estadoPedido` | Siempre — indica si sigue pendiente o ya quedó `"PAGADO"` |
| `POST /v1/abonos/{id}` | `saldoRestante` | Siempre — cuánto falta por pagar (`0` cuando PAGADO) |

### Endpoints nuevos a consumir

| Método | URL | Para qué |
|---|---|---|
| `POST` | `/v1/abonos/{pedidoId}` | Registrar un pago parcial |
| `GET` | `/v1/abonos/{pedidoId}` | Ver historial de abonos de un pedido |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | Lista de pedidos que aún deben (cuentas por cobrar) |
| `GET` | `/v1/abonos/reporte/pagados` | Lista de pedidos ya liquidados |

### Archivos/piezas a crear o modificar

| Qué | Acción |
|---|---|
| Componente del carrito | Detectar si el usuario tiene rol ADMIN → redirigir a venta directa con los artículos ya cargados |
| `pedido.service.ts` — interface del request de savePedido | Agregar `tipoPedido?: string` y `estadoPedido?: string` para permitir APARTADO/FIADO desde el carrito (Flujo B) |
| `venta.service.ts` — interfaces `VentaDirectaRequest` y `VentaDirectaResponse` | Agregar `tipoPedido?`, `observaciones?` al request; agregar `pedidoId?` al response |
| Componente venta directa | Agregar opciones APARTADO / FIADO al selector de pago; leer `pedidoId` del response |
| `abono.service.ts` | Crear con los 4 métodos del módulo (ver sección 8.1) |
| Interfaces `AbonoRequest`, `AbonoResponse`, `EstadoCuenta`, `PedidoPagado` | Crear (ver sección 8.2) |
| Pantalla cuentas por cobrar | Crear — consume `GET /reporte/estado-cuenta`, botón `+ Abono` abre modal |
| Modal de abono | Crear — formulario con monto, método, nota/referencia; leer `estadoPedido` del response |
| Pantalla pedidos liquidados | Crear — consume `GET /reporte/pagados`, solo lectura |

### Flujos — resumen visual

**Flujo A — Carrito del cliente → pedido normal → admin cobra**
```
Cliente agrega variantes al carrito
  → POST /v1/pedidos/savePedido  (sin tipoPedido)
  → pedido queda "PENDIENTE"
Cliente va a recoger → admin elige forma de pago → PUT /v1/pedidos/{id}
  → Venta creada automáticamente ✅
```

**Flujo B — Carrito del cliente con crédito**
```
Cliente agrega variantes al carrito
  → selecciona APARTADO o FIADO
  → POST /v1/pedidos/savePedido  { tipoPedido: "APARTADO", estadoPedido: "APARTADO", ... }
  → pedido queda pendiente de abonos
Admin registra pagos parciales → POST /v1/abonos/{pedidoId}
  → cuando saldo = 0 → PAGADO + Venta creada automáticamente ✅
```

**Flujo C — Admin en carrito → redirige a venta directa (solo front)**
```
Admin agrega variantes al carrito
  → front detecta rol ADMIN
  → redirige a pantalla de venta directa con artículos pre-cargados
  → sigue Flujo D o Flujo E según lo que seleccione
```

**Flujo D — Venta directa al contado**
```
POST /v1/ventas/save  { pagosYMesesId: X, detalles: [...] }
Response: { ventaId: 23, pedidoId: null }  →  pedidoId null = venta cerrada ✅
```

**Flujo E — Venta directa con crédito (nuevo)**
```
POST /v1/ventas/save  { tipoPedido: "APARTADO", detalles: [...] }  (sin pagosYMesesId)
Response: { ventaId: null, pedidoId: 55 }  →  pedidoId con valor = redirigir a /abonos/55
```

**Flujo F — Registrar abonos hasta liquidar**
```
POST /v1/abonos/55  { monto: 100, metodoPago: "EFECTIVO", usuarioId: 1 }
  → Response: { estadoPedido: "APARTADO", saldoRestante: 250 }  → actualizar saldo

POST /v1/abonos/55  { monto: 250, metodoPago: "TRANSFERENCIA", nota: "REF-98765", usuarioId: 1 }
  → Response: { estadoPedido: "PAGADO", saldoRestante: 0 }  → Swal "¡Liquidado!" ✅
```

### Cuándo aparece la venta en reportes

| Flujo | Cuándo se contabiliza |
|---|---|
| Carrito del cliente → pedido normal (Flujo A) | Cuando el admin cierra con `PUT /v1/pedidos/{id}` |
| Carrito del cliente → APARTADO/FIADO (Flujo B) | Cuando el último abono llega a saldo 0 |
| Venta directa al contado (Flujo D) | Inmediato — al hacer `POST /v1/ventas/save` |
| Venta directa APARTADO/FIADO (Flujo E) | Cuando el último abono llega a saldo 0 |

---

## Flujo completo correcto

### Flujo A — Carrito del cliente → admin cierra y cobra (sin cambios en back)
```
Cliente agrega variantes al carrito
  → POST /v1/pedidos/savePedido  (sin tipoPedido = NORMAL por defecto)
  → pedido queda en "PENDIENTE"

Cliente va a recoger → admin abre el pedido
  → elige forma de pago: efectivo / tarjeta / meses / transferencia
  → PUT /v1/pedidos/{id}  con pagosYMesesId
  → se crea la Venta automáticamente ✅
  → pedido pasa a "Entregado"
```

### Flujo B — Carrito del cliente con crédito (nuevo — requiere cambio en front)
```
Cliente agrega variantes al carrito
  → selecciona APARTADO o FIADO antes de confirmar
  → POST /v1/pedidos/savePedido  { tipoPedido: "APARTADO", estadoPedido: "APARTADO", ... }
  → pedido queda pendiente de abonos

Admin ve el pedido en "Cuentas por cobrar"
  → cada vez que el cliente paga, admin registra abono
  → POST /v1/abonos/{pedidoId}
  → cuando saldo = 0 → PAGADO + Venta creada automáticamente ✅
```

### Flujo C — Admin en carrito → redirige a venta directa (solo front)
```
Admin agrega variantes al carrito
  → front detecta rol ADMIN
  → en lugar de ir a savePedido, redirige a pantalla de venta directa
    con los artículos ya cargados
  → sigue Flujo D o Flujo E según lo que elija
```

### Flujo D — Venta directa al contado (sin cambios en back)
```
Admin abre venta directa
  → agrega variantes
  → selecciona EFECTIVO o TARJETA
  → POST /v1/ventas/save  (sin tipoPedido, con pagosYMesesId)

Response: { ventaId: 23, pedidoId: null, ... }
  → pedidoId es null → flujo normal de siempre ✅
```

### Flujo E — Venta directa con crédito (nuevo)
```
Admin abre venta directa
  → agrega variantes
  → selecciona APARTADO o FIADO
  → POST /v1/ventas/save  { tipoPedido: "APARTADO", observaciones: "...", detalles: [...] }
    (sin pagosYMesesId)

Response: { ventaId: null, pedidoId: 55, totalVenta: 350.00 }
  → pedidoId tiene valor → mostrar Swal "Crédito registrado"
  → botón "Ir a abonos" navega a /abonos/55
```

### Flujo F — Registrar abonos hasta liquidar
```
Admin en pantalla /abonos (estado de cuenta)
  → ve pedido #55: Total $350 | Pagado $0 | Saldo $350
  → pulsa [+ Abono]

Modal de abono:
  Monto: $100
  Método: EFECTIVO
  Nota: (vacío)
  → POST /v1/abonos/55 { monto: 100, metodoPago: "EFECTIVO", usuarioId: 1 }

Response: { estadoPedido: "APARTADO", saldoRestante: 250 }
  → estadoPedido ≠ "PAGADO" → actualizar saldo en pantalla: $250

  Monto: $250
  Método: TRANSFERENCIA
  Nota: REF-98765          ← número de referencia aquí
  → POST /v1/abonos/55 { monto: 250, metodoPago: "TRANSFERENCIA", nota: "REF-98765", usuarioId: 1 }

Response: { estadoPedido: "PAGADO", saldoRestante: 0 }
  → estadoPedido = "PAGADO" → Swal "¡Pedido liquidado!"
  → quitar pedido de la lista de cuentas por cobrar
  → la venta ya quedó registrada automáticamente en el back ✅
    (aparece en reportes de ventas sin que el front haga nada)
```

### Lógica central en el componente de abonos

```typescript
registrarAbono() {
  const body: AbonoRequest = {
    monto: this.form.monto,
    metodoPago: this.form.metodoPago,
    nota: this.form.nota || null,
    usuarioId: this.usuarioLogueado.id,   // siempre requerido
    fechaPago: this.form.fechaPago || null
  };

  this.abonoService.registrarAbono(this.pedidoId, body).subscribe(res => {
    const abono = res.data;

    if (abono.estadoPedido === 'PAGADO') {
      Swal.fire('¡Liquidado!', 'El pedido quedó completamente pagado.', 'success');
      this.cerrarModal();
      this.cargarEstadoCuenta(); // refrescar lista — este pedido ya no aparecerá
    } else {
      this.saldoRestante = abono.saldoRestante;
      this.historial.push(abono);
      this.cerrarModal();
    }
  });
}
```

### Cuándo aparece la venta en reportes

| Flujo | Cuándo se contabiliza |
|---|---|
| Carrito del cliente → pedido normal | Cuando el admin hace `PUT /v1/pedidos/{id}` al cobrar (cierre del pedido) |
| Carrito del cliente → APARTADO/FIADO | Cuando el último abono llega a saldo 0 — el back crea la Venta automáticamente |
| Venta directa normal (efectivo/tarjeta) | Inmediato — al hacer `POST /v1/ventas/save` |
| Venta directa APARTADO | Cuando el último abono llega a saldo 0 — el back crea la Venta automáticamente |
| Venta directa FIADO | Igual que APARTADO — al liquidar |

---

## 1. Concepto del módulo

| Tipo | Cuándo usarlo |
|---|---|
| **APARTADO** | El cliente aparta el producto y va pagando. Se lo entregan cuando liquida. |
| **FIADO** | Se le entrega el producto de entrada y va pagando después. |
| **NORMAL** | Pedido estándar (flujo actual, no cambia). |

Ambas modalidades comparten la misma tabla de abonos y los mismos endpoints.

---

## Nota rápida — dos formas de crear un pedido de crédito

Hay dos puntos de entrada para crear un pedido APARTADO/FIADO. Cuál usar depende de dónde venga el flujo:

| Flujo | Endpoint | Cuándo usarlo |
|---|---|---|
| Venta directa (admin en el local) | `POST /v1/ventas/save` + `tipoPedido` | Admin busca variantes en la pantalla de venta directa y selecciona APARTADO o FIADO |
| Carrito web | `POST /v1/pedidos/savePedido` + `tipoPedido` | Admin genera un pedido desde el carrito |

Ambos descargan stock y devuelven un `pedidoId`. Los abonos funcionan igual en los dos casos.

---

## 2. Cambio en crear pedido (ya existente)

El endpoint `POST /v1/pedidos/savePedido` ahora acepta un campo adicional:

```
tipoPedido: "APARTADO" | "FIADO" | "NORMAL"
```

Si no se manda, el back usa `"NORMAL"` por defecto.

**Request completo para crear un pedido APARTADO:**
```json
{
  "cliente": { "id": 10 },
  "fechaPedido": "2026-06-27",
  "tipoPedido": "APARTADO",
  "estadoPedido": "APARTADO",
  "observaciones": "Pantalón azul talla M",
  "detalles": [
    {
      "productoId": 5,
      "varianteId": 12,
      "cantidad": 1,
      "precioUnitario": 350.00,
      "subTotal": 350.00
    }
  ]
}
```

**Response:** el objeto `Pedido` ahora incluye los nuevos campos:
```json
{
  "code": 200,
  "data": {
    "id": 45,
    "tipoPedido": "APARTADO",
    "estadoPedido": "APARTADO",
    "totalPedido": 350.00,
    "totalPagado": 0.00,
    "fechaPedido": "2026-06-27",
    ...
  }
}
```

---

## 2b. Venta directa con crédito — `POST /v1/ventas/save` (MODIFICADO)

> Este es el flujo nuevo. El admin está en la pantalla de venta directa y en vez de pagar al contado elige APARTADO o FIADO.

### Cambio en el request

Agregar `tipoPedido` (y opcionalmente `observaciones`) al objeto que ya se enviaba:

```typescript
// Antes (venta inmediata, sin cambios)
const body = {
  usuarioId: 1,
  clienteId: 10,
  pagosYMesesId: 1,          // siempre requerido aunque no se use en crédito
  detalles: [...]
};

// Ahora — crédito desde venta directa
const body = {
  usuarioId: 1,
  clienteId: 10,
  // pagosYMesesId: omitir — el back no lo requiere cuando tipoPedido = APARTADO | FIADO
  tipoPedido: 'APARTADO',    // o 'FIADO'
  observaciones: 'Pantalón azul talla M',
  detalles: [...]
};
```

### Cambio en la interfaz TypeScript de request

```typescript
// Agregar los dos campos nuevos a la interfaz que ya tenías
export interface VentaDirectaRequest {
  usuarioId: number;
  clienteId: number;
  pagosYMesesId: number;
  tipoPedido?: 'NORMAL' | 'APARTADO' | 'FIADO';   // null = NORMAL (comportamiento anterior)
  observaciones?: string;
  detalles: DetalleVentaDto[];
  clienteSinRegistroDto?: ClienteSinRegistroDto;
}
```

### Cambio en la interfaz TypeScript de response

```typescript
// Agregar pedidoId al response que ya tenías
export interface VentaDirectaResponse {
  ventaId: number | null;
  tipoPago: string | null;
  requiereTerminal: boolean;
  totalVenta: number;
  meses: string | null;
  descripcionPago: string | null;
  intentId: string | null;
  pedidoId: number | null;   // nuevo — tiene valor cuando es APARTADO/FIADO; null si es venta normal
}
```

### Cómo distinguir la respuesta en el front

```typescript
this.ventaService.saveVentaDirecta(body).subscribe(res => {
  const data = res.response; // o res.data según cómo lo tengas mapeado

  if (data.pedidoId) {
    // Flujo crédito — no se generó venta
    Swal.fire({
      title: 'Crédito registrado',
      text: `Pedido #${data.pedidoId} creado. Total: $${data.totalVenta}`,
      icon: 'success',
      confirmButtonText: 'Ir a abonos'
    }).then(() => this.router.navigate(['/abonos', data.pedidoId]));

  } else {
    // Flujo normal — igual que antes
    // data.ventaId está disponible
  }
});
```

### Cambio en la pantalla de venta directa

Agregar las opciones APARTADO y FIADO al selector de forma de pago. La lógica visual sugerida:

```
Forma de pago:
  ○ Efectivo          → tipoPedido = null (flujo normal)
  ○ Tarjeta / Meses   → tipoPedido = null (flujo normal)
  ○ Apartado          → tipoPedido = 'APARTADO'
  ○ Fiado             → tipoPedido = 'FIADO'
```

- Si elige Efectivo o Tarjeta: ocultar el campo `tipoPedido`, comportamiento igual al actual
- Si elige Apartado o Fiado: ocultar el selector de meses/pagos (no aplica), mostrar campo opcional de `observaciones`

---

## 3. Registrar un abono

```
POST /v1/abonos/{pedidoId}
Content-Type: application/json
```

**Request:**
```json
{
  "monto": 100.00,
  "fechaPago": "2026-06-27",
  "metodoPago": "EFECTIVO",
  "nota": "primer abono",
  "usuarioId": 1
}
```

| Campo | Obligatorio | Valores | Notas |
|---|---|---|---|
| `monto` | Sí | número > 0 | — |
| `usuarioId` | Sí | id del usuario admin | Se usa para registrar la Venta al liquidar |
| `fechaPago` | No | `yyyy-MM-dd` | Default: hoy |
| `metodoPago` | No | `EFECTIVO` `TRANSFERENCIA` `TARJETA` | Default: `EFECTIVO` |
| `nota` | No | texto libre | Para TRANSFERENCIA: poner aquí el número de referencia |

**¿Hay que pedir número de referencia cuando es TRANSFERENCIA?**
Sí, es buena práctica. Usar el campo `nota` para eso. El front puede cambiar el label dinámicamente:

```typescript
// Cambiar el label de "nota" según el método seleccionado
get labelNota(): string {
  return this.metodoPago === 'TRANSFERENCIA'
    ? 'Número de referencia (opcional)'
    : 'Nota (opcional)';
}
```

**Response 200:**
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "monto": 100.00,
    "fechaPago": "27/06/2026",
    "metodoPago": "EFECTIVO",
    "nota": "primer abono",
    "estadoPedido": "APARTADO",
    "saldoRestante": 250.00
  }
}
```

Cuando el abono liquida el pedido, `estadoPedido` cambia a `"PAGADO"` y `saldoRestante` llega en `0`:

```json
{
  "code": 200,
  "data": {
    "id": 3,
    "monto": 250.00,
    "fechaPago": "29/06/2026",
    "metodoPago": "TRANSFERENCIA",
    "nota": "REF-98765",
    "estadoPedido": "PAGADO",
    "saldoRestante": 0.0
  }
}
```

**Lógica del front al recibir el response:**
```typescript
this.abonoService.registrarAbono(pedidoId, body).subscribe(res => {
  const abono = res.data;
  if (abono.estadoPedido === 'PAGADO') {
    // pedido liquidado — quitar de la lista de cuentas por cobrar
    Swal.fire('¡Liquidado!', 'El pedido quedó completamente pagado.', 'success');
    this.cargarEstadoCuenta(); // refrescar lista
  } else {
    // abono parcial — actualizar saldo en pantalla
    this.saldoRestante = abono.saldoRestante;
  }
});
```

**Response 400** en estos casos:
- Pedido no encontrado
- El pedido es de tipo `NORMAL` (no admite abonos)
- El pedido ya está `PAGADO`
- El pedido está `cancelado`
- `usuarioId` no encontrado

> **Auto-cierre y contabilización:** cuando `totalPagado >= totalPedido`, el back:
> 1. Cambia `estadoPedido = "PAGADO"`
> 2. Crea automáticamente un registro `Venta` — el pedido **ya aparece en los reportes de ventas** sin que el front haga nada extra
> 3. Si era `APARTADO`: guarda `fechaRecogida = hoy`

---

## 4. Historial de abonos de un pedido

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

La lista viene ordenada por `fechaPago` ascendente (del más antiguo al más reciente).

---

## 5. Reporte: estado de cuenta (pedidos con saldo)

```
GET /v1/abonos/reporte/estado-cuenta
```

Devuelve todos los pedidos `APARTADO` o `FIADO` que aún **no están pagados**.

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

## 6. Reporte: pedidos liquidados

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

## 7. Resumen de endpoints

| Método | URL | Descripción |
|---|---|---|
| `POST` | `/v1/ventas/save` | **MODIFICADO** — acepta `tipoPedido`; si es APARTADO/FIADO no crea Venta y devuelve `pedidoId` |
| `POST` | `/v1/pedidos/savePedido` | Ya existía — ahora acepta `tipoPedido` (flujo carrito) |
| `POST` | `/v1/abonos/{pedidoId}` | Registrar un abono |
| `GET` | `/v1/abonos/{pedidoId}` | Historial de abonos del pedido |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | Pedidos con saldo pendiente |
| `GET` | `/v1/abonos/reporte/pagados` | Pedidos liquidados |

---

## 8. Dónde hacer los cambios en el frontend

### 8.1 Nuevo servicio: `abono.service.ts`

Crear un servicio dedicado para los 4 endpoints nuevos:

```typescript
// src/app/services/abono.service.ts
@Injectable({ providedIn: 'root' })
export class AbonoService {
  private base = '/v1/abonos';

  constructor(private http: HttpClient) {}

  registrarAbono(pedidoId: number, body: AbonoRequest): Observable<any> {
    return this.http.post(`${this.base}/${pedidoId}`, body);
  }

  obtenerAbonos(pedidoId: number): Observable<any> {
    return this.http.get(`${this.base}/${pedidoId}`);
  }

  reporteEstadoCuenta(): Observable<any> {
    return this.http.get(`${this.base}/reporte/estado-cuenta`);
  }

  reportePagados(): Observable<any> {
    return this.http.get(`${this.base}/reporte/pagados`);
  }
}
```

### 8.2 Interfaces TypeScript

```typescript
// src/app/models/abono.model.ts

export interface AbonoRequest {
  monto: number;
  usuarioId: number;        // requerido — id del admin logueado
  fechaPago?: string;       // 'yyyy-MM-dd' — default: hoy
  metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'; // default: EFECTIVO
  nota?: string;            // para TRANSFERENCIA usar aquí el número de referencia
}

export interface AbonoResponse {
  id: number;
  monto: number;
  fechaPago: string;        // 'dd/MM/yyyy'
  metodoPago: string;
  nota: string | null;
  // Solo presentes en POST (registrar abono); null en GET (historial)
  estadoPedido: string | null;   // "APARTADO" | "FIADO" | "PAGADO"
  saldoRestante: number | null;  // 0 cuando PAGADO
}

export interface EstadoCuenta {
  pedidoId: number;
  tipoPedido: string;
  estadoPedido: string;
  cliente: string;
  telefono: string;
  totalPedido: number;
  totalPagado: number;
  saldo: number;
  fechaPedido: string;
  abonos: AbonoResponse[];
}

export interface PedidoPagado {
  pedidoId: number;
  tipoPedido: string;
  cliente: string;
  telefono: string;
  totalPedido: number;
  fechaPedido: string;
  fechaUltimoPago: string;
  abonos: AbonoResponse[];
}
```

### 8.3 Modificar venta.service.ts — venta directa con crédito

Actualizar las interfaces y el método de venta directa (ver sección 2b para el detalle completo de request/response):

```typescript
// Agregar tipoPedido y observaciones a la request de ventaDirecta
// Agregar pedidoId al response de ventaDirecta
// Leer res.response.pedidoId: si tiene valor → crédito; si null → venta normal
```

### 8.4 Modificar pedido.service.ts (o donde esté crearPedido)

Agregar el campo `tipoPedido` al objeto que se envía al crear un pedido:

```typescript
// Antes
const body = {
  cliente: { id: clienteId },
  fechaPedido: fecha,
  estadoPedido: 'PENDIENTE',
  detalles: [...]
};

// Ahora — agregar tipoPedido
const body = {
  cliente: { id: clienteId },
  fechaPedido: fecha,
  tipoPedido: 'APARTADO',   // o 'FIADO' o 'NORMAL'
  estadoPedido: 'APARTADO', // igual al tipoPedido para los de crédito
  detalles: [...]
};
```

### 8.4 Pantallas nuevas sugeridas

#### Pantalla: Crear pedido — agregar selector de tipo

En el formulario de nuevo pedido, añadir un campo de selección antes de confirmar:

```
Tipo de pedido:  ○ Normal  ○ Apartado  ○ Fiado
```

- Si elige `Normal` → flujo existente, sin cambios
- Si elige `Apartado` o `Fiado` → enviar `tipoPedido` y `estadoPedido` con ese valor

#### Pantalla: Estado de cuenta (cuentas por cobrar)

Tab o sección nueva en el área de admin:

```
┌─────────────────────────────────────────────────────────┐
│  CUENTAS POR COBRAR                                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ #45  FIADO   María López   $350   Abonado $100   │   │
│  │             Saldo: $250                  [+ Abono]│   │
│  │                                                   │   │
│  │ #46  APARTADO  Juan Torres  $200  Abonado $50     │   │
│  │             Saldo: $150                  [+ Abono]│   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- Fuente: `GET /v1/abonos/reporte/estado-cuenta`
- Botón `[+ Abono]` abre un modal con el formulario de abono

#### Modal: Registrar abono

```
Pedido #45 — María López
Total: $350.00   Pagado: $100.00   Saldo: $250.00

Monto*:        [$_______]
Método:        [EFECTIVO ▼]          ← EFECTIVO | TRANSFERENCIA | TARJETA
Fecha:         [29/06/2026]
Nota/Ref:      [________________________]  ← label cambia a "Número de referencia"
                                             cuando método = TRANSFERENCIA
[Cancelar]                      [Registrar abono]
```

- Body al guardar incluye siempre `usuarioId` del admin logueado
- Si el response trae `estadoPedido = "PAGADO"` → mostrar "¡Pedido liquidado!" y quitar de la lista

#### Pantalla: Pedidos liquidados

```
┌─────────────────────────────────────────────────────────┐
│  PEDIDOS PAGADOS (APARTADO / FIADO)                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ #40  APARTADO  Ana García    $500  27/jun         │   │
│  │       Abonos: $200 (15/jun) + $300 (27/jun)      │   │
│  │                                                   │   │
│  │ #38  FIADO     Pedro Ruiz    $180  20/jun         │   │
│  │       Abonos: $180 (20/jun)                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- Fuente: `GET /v1/abonos/reporte/pagados`
- Solo lectura, sin acciones adicionales

---

## 9. Comportamiento esperado por flujo

### APARTADO

| Paso | Qué hace el admin | Qué hace el back |
|---|---|---|
| 1 | Crea pedido con `tipoPedido: "APARTADO"` | Descuenta stock, `totalPagado = 0` |
| 2 | Registra abonos parciales | Suma a `totalPagado` |
| 3 | Último abono que cubre el total | `estadoPedido = "PAGADO"`, `fechaRecogida = hoy` |
| 4 | Cliente recoge el producto | — (ya marcado como PAGADO) |

### FIADO

| Paso | Qué hace el admin | Qué hace el back |
|---|---|---|
| 1 | Crea pedido con `tipoPedido: "FIADO"` | Descuenta stock, cliente lleva el producto |
| 2 | Registra abonos conforme el cliente paga | Suma a `totalPagado` |
| 3 | Último abono que cubre el total | `estadoPedido = "PAGADO"` |

---

## 10. Nota importante sobre el response

El back envuelve todo en `ResponseGeneric`:

```typescript
// Leer la data así:
this.abonoService.registrarAbono(pedidoId, body).subscribe(res => {
  const abono = res.data;          // objeto AbonoResponse
});

this.abonoService.reporteEstadoCuenta().subscribe(res => {
  const lista = res.data;          // EstadoCuenta[]
});
```

Si `code === 400` o `data === null` → mostrar `res.mensaje` como mensaje de error.

---

## NOTA 2026-06-30 — Feedback del front + pendientes futuros

### Respuestas a dudas del front

**Duda 1: ¿Cuántos campos devuelve `POST /v1/abonos/{id}`?**

El back devuelve los **7 campos completos**, no solo 2:

```json
{
  "id": 1,
  "monto": 100.00,
  "fechaPago": "27/06/2026",
  "metodoPago": "EFECTIVO",
  "nota": null,
  "estadoPedido": "APARTADO",
  "saldoRestante": 250.00
}
```

Acción para el front: actualizar `AbonoRegistrarResponse` para tipar los 7 campos y usar los
datos del server directamente para el historial, en lugar de construir el objeto local.

```typescript
// Cambiar esto:
interface AbonoRegistrarResponse {
  estadoPedido: string;
  saldoRestante: number;
}

// Por esto:
interface AbonoRegistrarResponse {
  id: number;
  monto: number;
  fechaPago: string;
  metodoPago: string;
  nota: string | null;
  estadoPedido: string;
  saldoRestante: number;
}
```

Al registrar un abono, usar `res.data` directo para agregar al historial (ya trae todos los campos).

**Duda 2: Al quedar PAGADO, ¿reload del server o quitar local?**

Recomendado: hacer `this.cargarEstadoCuenta()` (reload del server) para evitar desincronización.
El pedido PAGADO ya no aparecerá en el reporte `estado-cuenta` porque el back solo devuelve
los que tienen saldo pendiente.

---

### Requerimientos pendientes — a implementar después

> Solo documentados. No requieren cambios por ahora.

#### Caso 1 — FIADO: cliente no paga (deuda incobrable)

El cliente recibió el producto (FIADO) y nunca pagó o dejó de pagar.

**Lo que debe pasar:**
- Admin marca el pedido como `cancelado` (o un estado nuevo `INCOBRABLE`)
- El back descuenta el stock de las variantes (porque el producto ya fue entregado y no regresa)
- Queda registro de: cliente, monto total, cuánto pagó, cuánto quedó pendiente

**Pendiente de definir:** ¿nuevo endpoint `PUT /v1/abonos/{pedidoId}/cancelar`?
¿O se reutiliza un endpoint de pedidos?

#### Caso 2 — APARTADO: cliente no termina de pagar (devuelve el producto)

El cliente apartó el producto, dio dinero parcial, pero al final no terminó de pagar
y devuelve el producto (o simplemente no lo recogió).

**Lo que debe pasar:**
- Admin cancela el apartado
- El back **devuelve el stock** a las variantes (el producto nunca fue entregado)
- Queda registro de: cliente, cuánto pagó, saldo que quedó a su favor

**Pendiente de definir:** ¿el dinero pagado se reembolsa, queda como crédito, o se usa para
el Caso 3 (transferir a otro producto)?

#### Caso 3 — Transferir abonos a un nuevo producto/variante

El cliente que no terminó de pagar (Caso 1 o Caso 2) quiere que lo que ya dio se aplique
a un producto diferente.

**Lo que debe pasar:**
- Admin selecciona el pedido cancelado del cliente
- Elige la nueva variante que el cliente quiere
- El sistema crea un nuevo pedido/apartado y toma el monto ya pagado como primer abono
- Si el nuevo producto cuesta menos → el resto queda a favor del cliente (o se reembolsa)
- Si el nuevo producto cuesta más → se indica el saldo faltante y el cliente sigue abonando

**Condición:** solo aplica si el nuevo producto tiene stock disponible.

**Impacto en el front:** se necesitaría un módulo nuevo o una pantalla dentro de `/abonos`
para seleccionar el pedido de origen y la variante destino.
