# Documentación Backend — Ventas, Crédito y Abonos

**Fecha:** 2026-06-30  
**Módulos:** Venta Directa · Carrito · Pedidos · Abonos (Apartado / Ir pagando)  
**Backend:** `proyecto-key (9091)` · contexto `/mis-productos`

---

## 1. Visión general del sistema de ventas

Hay **tres formas** en que el admin puede cerrar una venta:

| Forma | Quién inicia | Endpoint principal | Resultado |
|---|---|---|---|
| **A — Pedido del cliente** | El cliente desde la app | `POST /v1/pedidos/savePedido` | Pedido en PENDIENTE; admin lo cierra después |
| **B — Venta directa** | El admin en el local | `POST /v1/ventas/save` | Venta o Pedido creado en el momento |
| **C — Carrito admin → Venta directa** | Admin desde el catálogo | Redirige al flujo B | Igual que B |

---

## 2. Flujo A — Cliente genera pedido (sin pago inmediato)

### Descripción
El cliente busca variantes desde la app, las agrega al carrito y genera el pedido. No paga en ese momento — va al local y el admin lo procesa.

### Pasos del front

```
1. Cliente va a /variantes/buscar
   → Busca variante por nombre o código
   → La agrega al carrito (CarritoVarianteService → localStorage)

2. Cliente va a /variantes/carrito
   → Ve sus artículos con cantidades y subtotales
   → Click en "📋 Generar pedido"
   → Swal de confirmación con el total

3. Front llama:
   POST /v1/pedidos/savePedido
   Body: {
     cliente: { id: clienteId },
     tipoPedido: "NORMAL",
     estadoPedido: "Pendiente",
     fechaPedido: "YYYY-MM-DD",
     observaciones: "",
     detalles: [
       { producto: { id: N }, varianteId: N, cantidad: N, precioUnitario: N, subTotal: N }
     ]
   }

4. Response esperado: { code: 200, data: { id: pedidoId, ... } }
   → El carrito se limpia
   → Swal "Pedido #X registrado" → navega a /variantes/buscar

5. Admin abre el pedido (pantalla de pedidos/mis-pedidos o similar)
   → Elige forma de pago
   PUT /v1/pedidos/{id} con pagosYMesesId
   → El back crea la Venta automáticamente
   → pedido pasa a "Entregado"
```

### Endpoints

| Método | URL | Cuándo |
|---|---|---|
| `POST` | `/v1/pedidos/savePedido` | Al confirmar el pedido desde el carrito |
| `PUT` | `/v1/pedidos/{id}` | Admin cierra el pedido con forma de pago |

### Regla de negocio
- Solo clientes registrados pueden generar pedidos. Si el usuario no tiene cliente asociado, el front muestra Swal con link a `/clientes/agregar`.
- Si el cliente no está logueado, el front pide que se registre.

---

## 3. Flujo B — Venta directa (admin en el local)

### Descripción
El admin busca las variantes directamente en la pantalla de venta, las agrega al ticket y cobra en el momento. Puede ser al contado o en parcialidades.

### Pasos del front

```
1. Admin va a /variantes/venta-directa

2. Panel izquierdo — Agregar artículos:
   Escribe nombre/código (mín. 3 chars, debounce 400ms)
   → GET /v1/variantes/buscar?...
   → Resultado aparece en dropdown
   → Click en variante → se agrega al ticket con cantidad 1

3. Panel derecho — Ticket:
   Muestra líneas con variante, cantidad, subtotal, total
   Botones: agregar/quitar unidades, eliminar línea

4. Forma de pago — OPCIONES:

   OPCIÓN CONTADO (muestra dropdown de métodos):
   ┌────────────────────────────────────────┐
   │ Efectivo           → pagosYMesesId = id del registro "EFECTIVO" │
   │ Transferencia      → pagosYMesesId = id del registro "TRANSFERENCIA" │
   │ Tarjeta débito     → pagosYMesesId = id correspondiente │
   │ 3 meses sin inter. → pagosYMesesId = id de meses │
   └────────────────────────────────────────┘
   → GET /v1/pagos/opciones (carga al inicio)

   OPCIÓN CRÉDITO (botones toggle debajo del dropdown):
   ┌────────────────────────────────────────┐
   │ 📦 Apartado   → tipoPedido = "APARTADO" │
   │ 💳 Ir pagando → tipoPedido = "FIADO"   │
   └────────────────────────────────────────┘
   → Al seleccionar crédito: dropdown de meses DESAPARECE
   → Aparece textarea de observaciones (opcional)

5. Cliente (opcional):
   Busca cliente registrado por nombre
   → GET /v1/clientes/buscar?nombre=X&page=0&size=10
   Si no se asigna cliente → se usa el clienteId del admin logueado

6. Click en "💰 Cobrar"
   POST /v1/ventas/save
```

### Request a `POST /v1/ventas/save`

```json
// CASO CONTADO
{
  "usuarioId": 1,
  "clienteId": 10,
  "pagosYMesesId": 3,
  "detalles": [
    { "productoId": 5, "varianteId": 12, "cantidad": 2, "precioVenta": 350.00, "subTotal": 700.00 }
  ]
}

// CASO CRÉDITO (APARTADO o IR PAGANDO)
{
  "usuarioId": 1,
  "clienteId": 10,
  "tipoPedido": "APARTADO",         ← o "FIADO"
  "observaciones": "Pantalón azul", ← opcional
  "detalles": [
    { "productoId": 5, "varianteId": 12, "cantidad": 2, "precioVenta": 350.00, "subTotal": 700.00 }
  ]
  ← pagosYMesesId NO se envía
}
```

### Response de `POST /v1/ventas/save`

```json
// CASO CONTADO → ventaId tiene valor, pedidoId es null
{
  "code": 200,
  "data": {
    "ventaId": 23,
    "pedidoId": null,
    "tipoPago": "EFECTIVO",
    "requiereTerminal": false,
    "totalVenta": 700.00,
    "meses": null,
    "descripcionPago": "Efectivo"
  }
}

// CASO CRÉDITO → pedidoId tiene valor, ventaId es null
{
  "code": 200,
  "data": {
    "ventaId": null,
    "pedidoId": 55,
    "tipoPago": null,
    "requiereTerminal": false,
    "totalVenta": 700.00,
    "meses": null,
    "descripcionPago": null
  }
}
```

### Lo que hace el front según el response

| Condición | Acción del front |
|---|---|
| `ventaId != null && requiereTerminal == false` | Swal "¡Venta #X registrada!" → ticket limpio |
| `ventaId != null && requiereTerminal == true` | Panel de terminal Mercado Pago → pollea estado |
| `pedidoId != null` | Swal "✅ Apartado/Ir pagando registrado" + botón "💳 Ir a Créditos/Abonos" → navega `/abonos` |

### Regla de negocio importante
- **APARTADO / IR PAGANDO:** el dropdown de meses (pagos a meses sin intereses) se oculta y **no se envía `pagosYMesesId`**. El admin no puede seleccionar ambas cosas a la vez — el crédito no admite meses.
- Los abonos posteriores SÍ pueden ser con EFECTIVO, TRANSFERENCIA o TARJETA (sin meses).

---

## 4. Flujo C — Admin desde catálogo → Venta directa

### Descripción
El admin navega el catálogo de variantes, agrega al carrito, y en vez de generar un pedido normal (que quedaría en PENDIENTE), puede cobrar directamente.

### Pasos del front

```
1. Admin va a /variantes/buscar
   → Agrega variantes al carrito con el botón 🛒

2. Admin va a /variantes/carrito
   → Ve los artículos en la tabla

3. Admin hace click en "💰 Cobrar ahora (Venta Directa)"
   (botón visible solo para ROLE_ADMIN)
   → router.navigate(['/variantes/venta-directa'])

4. VentaDirectaComponent.ngOnInit() detecta:
   - isAdminUser === true
   - lineas está vacío
   - CarritoVarianteService.obtener() tiene items
   → Pre-carga los items del carrito como líneas de venta

5. Sigue exactamente el mismo flujo que B (pago inmediato o crédito)
   → Al confirmar la venta → carrito se limpia automáticamente
```

### Endpoints
Ningún endpoint nuevo. Reutiliza exactamente el mismo `POST /v1/ventas/save` del Flujo B.

### Nota técnica
La pre-carga es **sin llamada HTTP** — los items ya están en `localStorage` via `CarritoVarianteService`. El admin puede agregar más artículos desde la venta directa antes de cobrar.

---

## 5. Flujo D — Registrar abonos hasta liquidar

### Descripción
Cuando un pedido quedó como APARTADO o IR PAGANDO, el admin va a `/abonos` para registrar los pagos parciales del cliente.

### Endpoints

| Método | URL | Para qué |
|---|---|---|
| `GET` | `/v1/abonos/reporte/estado-cuenta` | Lista de pedidos con saldo pendiente |
| `GET` | `/v1/abonos/reporte/pagados` | Lista de pedidos ya liquidados |
| `POST` | `/v1/abonos/{pedidoId}` | Registrar un pago parcial |
| `GET` | `/v1/abonos/{pedidoId}` | (disponible) Ver historial de abonos |

### Pantalla `/abonos`

```
Tab "Cuentas por cobrar" → GET /v1/abonos/reporte/estado-cuenta
  Muestra cards por pedido:
  - Badge tipo (📦 Apartado / 🤝 Ir pagando)
  - Número de pedido, cliente, teléfono
  - Total / Pagado / Saldo
  - Barra de progreso % pagado
  - Botón "▼ Historial" → expande abonos anteriores
  - Botón "+ Abono" → abre modal

Tab "Liquidados" → GET /v1/abonos/reporte/pagados
  Lista read-only de pedidos ya pagados con historial expandible
```

### Modal de abono

```
Pedido #55 — María López
Total: $700.00   Pagado: $200.00   Saldo: $500.00

Monto*:     [___________]
Método:     [💵 Efectivo] [🏦 Transferencia] [💳 Tarjeta]   ← botones toggle
              ← NO hay opción de meses aquí
Fecha:      [hoy]
Nota:       [________________________]
             (label cambia a "Número de referencia" cuando método = TRANSFERENCIA)

[Cancelar]                        [Registrar abono]
```

### Request a `POST /v1/abonos/{pedidoId}`

```json
{
  "monto": 200.00,
  "usuarioId": 1,
  "fechaPago": "2026-06-30",
  "metodoPago": "EFECTIVO",
  "nota": "segundo abono"
}
```

| Campo | Obligatorio | Valores posibles |
|---|---|---|
| `monto` | Sí | número > 0 |
| `usuarioId` | Sí | id del admin logueado (necesario para crear la Venta al liquidar) |
| `fechaPago` | No | `yyyy-MM-dd` — default: hoy |
| `metodoPago` | No | `EFECTIVO` `TRANSFERENCIA` `TARJETA` — default: `EFECTIVO` |
| `nota` | No | texto libre; usar para número de referencia en transferencias |

### Response de `POST /v1/abonos/{pedidoId}`

```json
{
  "code": 200,
  "data": {
    "id": 5,
    "monto": 200.00,
    "fechaPago": "30/06/2026",
    "metodoPago": "EFECTIVO",
    "nota": "segundo abono",
    "estadoPedido": "APARTADO",
    "saldoRestante": 300.00
  }
}
```

Cuando el abono liquida el pedido:
```json
{
  "code": 200,
  "data": {
    "id": 8,
    "monto": 300.00,
    "fechaPago": "15/07/2026",
    "estadoPedido": "PAGADO",
    "saldoRestante": 0.0
  }
}
```

### Lo que hace el front al recibir el response

| Condición | Acción |
|---|---|
| `estadoPedido !== 'PAGADO'` | Actualiza saldo localmente; agrega abono al historial; Swal "Abono registrado — Saldo: $X" |
| `estadoPedido === 'PAGADO'` | Swal "¡Pedido liquidado!"; quita el pedido de la lista local; el back ya creó la Venta |

---

## 6. Cambios realizados en el back (confirmados)

| Archivo Java | Cambio |
|---|---|
| `VentaDirectaRequest.java` | +`tipoPedido: String`, +`observaciones: String` |
| `VentaDirectaResponse.java` | +`pedidoId: Integer` (null en venta normal, con valor en crédito) |
| `VentaServiceImpl.java` | Si `tipoPedido = APARTADO/FIADO` → crea solo Pedido y devuelve `pedidoId`; si no → flujo normal |
| `AbonoServiceImpl.java` | Cuando `totalPagado >= totalPedido` → auto-cambia `estadoPedido = "PAGADO"` + crea `Venta` automáticamente en el mismo `@Transactional` |
| Tabla `pedidos` | Nuevos campos: `tipoPedido`, `totalPagado`, `fechaRecogida` |
| Tabla `abonos` | Nueva tabla: `id, pedido_id, usuario_id, monto, fecha_pago, metodo_pago, nota` |

> **DML:** si hay scripts de migración para los campos nuevos de la tabla `pedidos` y la tabla `abonos`, ejecutarlos en este orden:
> 1. ALTER TABLE pedidos ADD COLUMN tipoPedido, totalPagado, fechaRecogida
> 2. CREATE TABLE abonos (con la FK a pedidos y a usuarios)

---

## 7. Problemas encontrados y soluciones

### P1 — `usuarioId` no incluido en el request de abono
**Síntoma:** el back rechazaba el abono o no podía crear la Venta al liquidar.
**Causa:** el front no enviaba `usuarioId` en el body de `POST /v1/abonos/{id}`.
**Solución:** se inyectó `AuthService` en `AbonosComponent` y se obtiene `idUsuario` desde `userId$` (BehaviorSubject). Se agrega siempre al body del abono.

### P2 — `AbonoRegistrarResponse` incompleto
**Síntoma:** el historial de abonos mostraba ids falsos (`Date.now()`) en vez de los ids reales del server.
**Causa:** el tipo de respuesta solo tenía `estadoPedido` y `saldoRestante`. El back sí devuelve el objeto completo con `id`, `monto`, `fechaPago`, etc.
**Solución:** se eliminó `AbonoRegistrarResponse` y se agregaron `estadoPedido?` y `saldoRestante?` como campos opcionales directamente en `AbonoResponse`. El servicio ahora retorna `Observable<ResponseGeneric<AbonoResponse>>`.

### P3 — Abonos restringidos a solo EFECTIVO (error de una sesión anterior)
**Síntoma:** el modal de abono solo mostraba el botón "Efectivo" fijo y deshabilitado.
**Causa:** una sesión anterior aplicó esta restricción por error.
**Solución:** `metodos: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']` restaurado. La restricción de meses es SOLO para la selección de forma de pago en la venta (no para los abonos individuales).

### P4 — `pagosYMesesId` enviado en crédito causaba conflicto en el back
**Síntoma:** el back podía interpretar la venta como contado si recibía `pagosYMesesId` aunque `tipoPedido = APARTADO`.
**Causa:** el dropdown de meses seguía enviando su valor aunque se eligiera crédito.
**Solución:** cuando `tipoPedido === 'APARTADO' | 'FIADO'`, el front NO envía `pagosYMesesId` en el body. El dropdown de meses también se oculta visualmente.

### P5 — Items del carrito perdidos al navegar a venta directa
**Síntoma:** al llegar a `/variantes/venta-directa` desde el carrito, el ticket estaba vacío.
**Causa:** el componente iniciaba con `lineas = []` siempre.
**Solución:** en `ngOnInit()`, si `isAdminUser === true` y `lineas.length === 0`, se revisa `CarritoVarianteService.obtener()`. Si tiene items, se convierten a líneas de venta. El carrito se limpia solo cuando la venta se confirma.

---

## 8. Reglas de negocio que el back debe respetar

| Regla | Detalle |
|---|---|
| APARTADO/FIADO en venta directa | `POST /v1/ventas/save` con `tipoPedido` → crea solo Pedido, devuelve `pedidoId`, `ventaId = null` |
| Abonos solo en 3 métodos | EFECTIVO, TRANSFERENCIA, TARJETA — el back nunca debe aceptar `metodoPago = "MESES"` en `/v1/abonos/{id}` |
| Auto-cierre al liquidar | Cuando `totalPagado >= totalPedido` → `estadoPedido = "PAGADO"` + crear Venta automáticamente. El front no llama ningún endpoint adicional |
| `usuarioId` obligatorio en abono | El back necesita el id del admin para asociar la Venta creada al liquidar |
| Descuento de stock inmediato | Igual que en venta normal — al crear el Pedido de crédito el stock debe descontarse inmediatamente |

---

## 9. Requerimientos futuros (pendientes de implementar)

### RF-1 — APARTADO/FIADO desde el carrito del CLIENTE (no solo admin)
**Estado:** NO implementado para clientes regulares.
**Descripción:** actualmente el selector de tipo (APARTADO/IR PAGANDO) en el carrito solo aparece para `ROLE_ADMIN`. Un cliente normal no puede marcar su pedido como apartado desde la app.
**Si se requiere:** el back ya soporta `tipoPedido` en `POST /v1/pedidos/savePedido`. El front necesitaría mostrar las opciones también para clientes (con validación de que el cliente ya esté registrado antes de permitirlo).

### RF-2 — Notificación al cliente cuando su pedido de apartado es procesado
**Estado:** NO implementado.
**Descripción:** cuando el admin registra el último abono y el pedido queda en PAGADO, el cliente no recibe notificación.
**Si se requiere:** back podría enviar email/push; el front no necesita cambios salvo mostrar el estado actualizado.

### RF-3 — Historial de abonos para el cliente
**Estado:** NO implementado.
**Descripción:** el cliente podría ver desde su app cuánto ha pagado y cuánto le falta en su pedido de crédito.
**Si se requiere:** endpoint GET público (con token de cliente) para `/v1/abonos/mis-abonos` o similar.

### RF-4 — Cancelación de pedido de crédito
**Estado:** NO implementado.
**Descripción:** no hay forma en el front de cancelar un pedido APARTADO/FIADO que ya tiene abonos. ¿El back devuelve el stock? ¿Se devuelven los abonos?
**Preguntar al back** qué endpoint usar y cuál es la lógica de reversión.

### RF-5 — Reporte de abonos por rango de fecha
**Estado:** NO implementado.
**Descripción:** el admin podría querer ver todos los abonos recibidos en una semana/mes para cuadrar caja.
**Si se requiere:** endpoint `GET /v1/abonos/reporte/por-fecha?desde=X&hasta=Y`.

---

## 10. Resumen de endpoints del módulo completo

| Método | URL | Estado | Quién lo usa |
|---|---|---|---|
| `GET` | `/v1/variantes/buscar` | ✅ Existente | `VentaDirectaComponent`, `BuscarComponent` |
| `GET` | `/v1/pagos/opciones` | ✅ Existente | `VentaDirectaComponent` (carga formas de pago) |
| `GET` | `/v1/clientes/buscar` | ✅ Existente | `VentaDirectaComponent`, `VentaVarianteComponent` |
| `POST` | `/v1/ventas/save` | ✅ Modificado | `VentaDirectaComponent` — agrega `tipoPedido`, `observaciones` |
| `POST` | `/v1/pedidos/savePedido` | ✅ Existente + modificado | `VentaVarianteComponent` — ya soporta `tipoPedido` |
| `PUT` | `/v1/pedidos/{id}` | ✅ Existente | Admin cierra pedido del cliente con forma de pago |
| `POST` | `/v1/abonos/{pedidoId}` | ✅ Nuevo | `AbonosComponent` — registrar abono |
| `GET` | `/v1/abonos/{pedidoId}` | ✅ Nuevo | Disponible, sin usar en UI aún |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | ✅ Nuevo | `AbonosComponent` tab "Cuentas por cobrar" |
| `GET` | `/v1/abonos/reporte/pagados` | ✅ Nuevo | `AbonosComponent` tab "Liquidados" |

---

## 11. Script de migración de BD

El script que crea las columnas nuevas y la tabla de abonos está en:

```
src/main/resources/static/migration_abonos_pedido.sql
```

Ejecutar en este orden en cada ambiente (dev → qa → prod) **antes** de desplegar el código:

1. `ALTER TABLE pedidos` — agrega `tipo_pedido`, `total_pedido`, `total_pagado`, `fecha_recogida`
2. `CREATE TABLE abono_pedido` — `id, pedido_id, monto, fecha_pago, metodo_pago, nota`

Sin esta migración los endpoints de abonos fallan con "column/table not found".

---

## NOTA 2026-06-30

### Fix aplicado en el front — `AbonoRegistrarResponse`

**Problema:** el response de `POST /v1/abonos/{id}` devuelve 7 campos pero el tipo del front
solo tenía 2 (`estadoPedido`, `saldoRestante`). El historial usaba un objeto local construido
manualmente con ids falsos (`Date.now()`).

**Solución aplicada:** se eliminó `AbonoRegistrarResponse` como interfaz separada. Los campos
`estadoPedido?` y `saldoRestante?` se agregaron directamente a `AbonoResponse`. El servicio
retorna `Observable<ResponseGeneric<AbonoResponse>>`. Al registrar un abono se usa `res.data`
directo para agregar al historial — datos reales del server sin construir el objeto local.

**El back devuelve exactamente:**
```json
{
  "id": 5,
  "monto": 200.00,
  "fechaPago": "30/06/2026",
  "metodoPago": "EFECTIVO",
  "nota": null,
  "estadoPedido": "APARTADO",
  "saldoRestante": 300.00
}
```

**Al quedar PAGADO:** el front debe hacer `cargarEstadoCuenta()` (reload del server) en lugar
de quitar el pedido del array local, para evitar desincronización.

---

### Regla de rifas — ventas de crédito

Las rifas del mes solo deben incluir compras que estén **completamente pagadas** en ese mes.

| Caso | Regla |
|---|---|
| Venta directa al contado | Cuenta en el mes en que se realizó |
| APARTADO/FIADO liquidado | Cuenta en el **mes en que se hizo el último abono** (cuando `estadoPedido = "PAGADO"`) |
| APARTADO/FIADO con saldo pendiente | **No cuenta** hasta que se liquide |

**Ejemplo:** compra registrada en mayo, cliente termina de pagar en julio → la compra **aplica
para la rifa de julio**, no mayo.

**Impacto en el back:** implementado en `IPedidoRepository` — ver sección 12.

---

## NOTA 2026-06-30 — Implementación completa de cancelar, transferir y fix rifas

### 12. Cancelar pedido de crédito — implementado

**Endpoint:** `PUT /v1/abonos/{pedidoId}/cancelar`  
**Auth:** ADMIN  
**Body (opcional):** `{ "motivo": "texto libre" }`

Comportamiento según tipo:

| Tipo | Stock | Estado final | Saldo registrado |
|---|---|---|---|
| APARTADO | Se **devuelve** (producto no entregado) | `cancelado` | `totalPagado` queda como saldo a favor |
| FIADO | **No se devuelve** (producto ya entregado) | `cancelado` | `totalPedido - totalPagado` queda como deuda |

**Response:**
```json
{
  "pedidoId": 55,
  "tipoPedido": "APARTADO",
  "estadoPedido": "cancelado",
  "totalPagado": 150.00,
  "totalPendiente": 200.00,
  "stockDevuelto": true,
  "mensaje": "APARTADO cancelado. Stock devuelto. Saldo a favor del cliente: $150.00"
}
```

**Archivos modificados:**
- `models/abonos/CancelarAbonoRequest.java` — nuevo
- `models/abonos/CancelarAbonoResponse.java` — nuevo
- `IAbonoService.java` — método `cancelarPedido()`
- `AbonoServiceImpl.java` — implementación (restaura stock en variante + producto para APARTADO)
- `AbonoController.java` — endpoint `PUT /{pedidoId}/cancelar`

---

### 13. Transferir abono a nuevo producto — implementado

**Endpoint:** `POST /v1/abonos/{pedidoIdOrigen}/transferir`  
**Auth:** ADMIN  
**Prerequisito:** el pedido origen debe estar `cancelado` y ser de tipo `APARTADO`

**Body:**
```json
{
  "nuevaVarianteId": 20,
  "cantidad": 1,
  "precioUnitario": 280.00,
  "usuarioId": 1
}
```

**Flujo interno:**
1. Valida que el pedido origen sea APARTADO cancelado con saldo > 0
2. Valida stock de la nueva variante
3. Descuenta stock de la nueva variante y producto
4. Crea nuevo Pedido APARTADO con la variante nueva
5. Registra el monto ya pagado como primer AbonoPedido automático
6. Si `montoTransferido >= totalNuevo` → PAGADO inmediato + crea Venta

**Response:**
```json
{
  "nuevoPedidoId": 88,
  "totalNuevo": 280.00,
  "montoTransferido": 150.00,
  "saldoPendiente": 130.00,
  "estadoNuevoPedido": "APARTADO",
  "mensaje": "Nuevo pedido #88 creado. Saldo pendiente: $130.00"
}
```

**Archivos modificados:**
- `models/abonos/TransferirAbonoRequest.java` — nuevo
- `models/abonos/TransferirAbonoResponse.java` — nuevo
- `IAbonoService.java` — método `transferirAbono()`
- `AbonoServiceImpl.java` — implementación + añade `IVarianteRepository` y `IProductosRepository`
- `AbonoController.java` — endpoint `POST /{pedidoIdOrigen}/transferir`

---

### 14. Fix rifas — crédito cuenta en el mes de liquidación — implementado

**Archivos modificados:** `IPedidoRepository.java` — 3 queries actualizadas

| Query | Cambio |
|---|---|
| `findClientesUnicosPorMes` | Incluye créditos PAGADOS cuyo último `abono_pedido.fecha_pago` cae en el mes |
| `findTodosClientesConCompras` | Excluye créditos que NO están PAGADOS (pendientes no cuentan) |
| `calcularScore` | El conteo de artículos del mes usa la fecha del último abono para créditos, no la fecha del pedido |

**Regla aplicada:** si el pedido es APARTADO o FIADO, solo cuenta para la rifa del mes en que `MAX(abono_pedido.fecha_pago)` cae. Un crédito registrado en mayo y liquidado en julio → aparece en la lista de julio, no mayo.

---

### 15. Migration SQL actualizada

`src/main/resources/static/migration_abonos_pedido.sql` — el `ALTER TABLE pedidos` incluye los siguientes campos nuevos:

```sql
ADD COLUMN tipo_pedido         VARCHAR(10)    NOT NULL DEFAULT 'NORMAL',
ADD COLUMN total_pedido        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN total_pagado        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN fecha_recogida      DATE           NULL,   -- APARTADO liquidado
ADD COLUMN motivo_cancelacion  VARCHAR(30)    NULL,   -- requerido por PUT /cancelar
ADD COLUMN fecha_cancelacion   DATE           NULL    -- requerido por PUT /cancelar
```

> **Importante:** `motivo_cancelacion` y `fecha_cancelacion` son **necesarios para el endpoint cancelar**. Sin ellos el `PUT /v1/abonos/{id}/cancelar` falla con "column not found".

---

### 16. Endpoints totales del módulo (estado final)

| Método | URL | Estado | Descripción |
|---|---|---|---|
| `POST` | `/v1/abonos/{pedidoId}` | ✅ | Registrar abono |
| `GET` | `/v1/abonos/{pedidoId}` | ✅ | Historial de abonos |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | ✅ | Cuentas por cobrar |
| `GET` | `/v1/abonos/reporte/pagados` | ✅ | Pedidos liquidados |
| `GET` | `/v1/abonos/reporte/cancelados` | ✅ | Pedidos cancelados (tab Cancelados) |
| `PUT` | `/v1/abonos/{pedidoId}/cancelar` | ✅ | Cancelar APARTADO o FIADO |
| `POST` | `/v1/abonos/{pedidoIdOrigen}/transferir` | ✅ | Transferir saldo a nuevo producto |

---

## 17. Flujos del front — cancelar y transferir

### Flujo G — Cancelar APARTADO (cliente no terminó de pagar)

```
Admin va a /abonos → Tab "Cuentas por cobrar"
  → Ve el card del pedido con saldo pendiente
  → Clic en botón "✖ Cancelar apartado"

Swal de confirmación:
  "¿Cancelar el apartado de [cliente]?
   El cliente pagó $150 de $350. Se devolverá el stock."
  → [Sí, cancelar] / [No]

PUT /v1/abonos/55/cancelar
Body: { "motivo": "Cliente desistió" }   ← motivo opcional

Response: { stockDevuelto: true, totalPagado: 150, mensaje: "..." }
  → Swal "Apartado cancelado. Stock devuelto."
  → El card desaparece de "Cuentas por cobrar"
  → Aparece en nueva tab "Cancelados" con saldo a favor: $150
```

### Flujo H — Cancelar FIADO (cliente no pagó, producto ya entregado)

```
Admin va a /abonos → Tab "Cuentas por cobrar"
  → Ve el card del pedido FIADO con saldo pendiente
  → Clic en botón "✖ Cancelar fiado"

Swal de confirmación (mensaje distinto — producto entregado):
  "¿Cancelar el fiado de [cliente]?
   El producto ya fue entregado. La deuda de $200 quedará registrada."
  → [Sí, registrar como incobrable] / [No]

PUT /v1/abonos/56/cancelar
Body: { "motivo": "Deuda incobrable" }

Response: { stockDevuelto: false, totalPendiente: 200, mensaje: "..." }
  → Swal "Fiado cancelado. Deuda de $200 registrada."
  → El card desaparece de "Cuentas por cobrar"
  → Aparece en tab "Cancelados" con deuda pendiente: $200
```

### Flujo I — Transferir saldo a nuevo producto

```
Prerequisito: el pedido ya debe estar cancelado (Flujo G)

Admin va a /abonos → Tab "Cancelados"
  → Ve el card del pedido cancelado con saldo a favor: $150
  → Clic en botón "↪ Aplicar a otro producto"

Se abre modal de transferencia:
  ┌────────────────────────────────────────────┐
  │ Saldo disponible: $150.00                  │
  │                                            │
  │ Buscar variante: [____________]            │
  │ → autocomplete igual que en venta directa  │
  │                                            │
  │ Variante elegida: Pantalón Negro T-28      │
  │ Precio unitario: [280.00]                  │
  │ Cantidad:        [1]                       │
  │ Total nuevo:     $280.00                   │
  │ Saldo pendiente: $130.00                   │
  │                                            │
  │ [Cancelar]      [Aplicar transferencia]    │
  └────────────────────────────────────────────┘

POST /v1/abonos/55/transferir
Body: { nuevaVarianteId: 20, cantidad: 1, precioUnitario: 280.00, usuarioId: 1 }

Response: { nuevoPedidoId: 88, saldoPendiente: 130, estadoNuevoPedido: "APARTADO" }

SI estadoNuevoPedido === "PAGADO" (el saldo cubría todo el nuevo producto):
  → Swal "¡Transferencia completada! El nuevo pedido quedó liquidado."
  → Quitar de "Cancelados"

SI estadoNuevoPedido === "APARTADO" (queda saldo pendiente):
  → Swal "Transferencia aplicada. Saldo pendiente: $130.00"
  → Quitar de "Cancelados"
  → El nuevo pedido #88 aparece en "Cuentas por cobrar" con abono inicial ya registrado
```

### Tab nueva — "Cancelados" en /abonos

Se necesita una tercera tab en la pantalla de abonos:

```
[Cuentas por cobrar]  [Liquidados]  [Cancelados]
                                          ↑ nueva

Consume: GET /v1/abonos/reporte/estado-cuenta filtrado por estadoPedido = 'cancelado'
         (o un endpoint nuevo GET /v1/abonos/reporte/cancelados — a definir con back)
```

Cada card muestra:
- Badge tipo: 📦 Apartado cancelado / 🤝 Fiado cancelado
- Cliente y teléfono
- Total pedido / Lo que pagó / Deuda pendiente (FIADO) o Saldo a favor (APARTADO)
- Botón "↪ Aplicar a otro producto" — solo visible si es APARTADO y `totalPagado > 0`

> **Back listo:** `GET /v1/abonos/reporte/cancelados` — implementado. Devuelve la lista
> con `saldoAFavor`, `deudaPendiente`, `puedeTransferir` y el historial de abonos de cada pedido.

---

## 18. Cambios que el front debe hacer — cancelar y transferir

### Interfaces TypeScript nuevas

Agregar a `abono.model.ts` (o donde estén los tipos del módulo):

```typescript
export interface CancelarAbonoRequest {
  motivo?: string;
}

export interface CancelarAbonoResponse {
  pedidoId: number;
  tipoPedido: string;
  estadoPedido: string;      // siempre "cancelado"
  totalPagado: number;
  totalPendiente: number;
  stockDevuelto: boolean;
  mensaje: string;
}

export interface TransferirAbonoRequest {
  nuevaVarianteId: number;
  cantidad: number;
  precioUnitario: number;
  usuarioId: number;
}

export interface TransferirAbonoResponse {
  nuevoPedidoId: number;
  totalNuevo: number;
  montoTransferido: number;
  saldoPendiente: number;
  estadoNuevoPedido: string;   // "APARTADO" | "PAGADO"
  mensaje: string;
}

export interface ReporteCancelado {
  pedidoId: number;
  tipoPedido: string;            // "APARTADO" | "FIADO"
  cliente: string;
  telefono: string;
  totalPedido: number;
  totalPagado: number;
  saldoAFavor: number;           // > 0 solo en APARTADO cancelado
  deudaPendiente: number;        // > 0 solo en FIADO cancelado
  motivo: string | null;
  fechaPedido: string;
  fechaCancelacion: string | null;
  puedeTransferir: boolean;      // true si APARTADO y totalPagado > 0
  abonos: AbonoResponse[];
}
```

### Métodos a agregar en `abono.service.ts`

```typescript
reporteCancelados(): Observable<ResponseGeneric<ReporteCancelado[]>> {
  return this.http.get<ResponseGeneric<ReporteCancelado[]>>(`${this.base}/reporte/cancelados`);
}

cancelar(pedidoId: number, body: CancelarAbonoRequest): Observable<ResponseGeneric<CancelarAbonoResponse>> {
  return this.http.put<ResponseGeneric<CancelarAbonoResponse>>(`${this.base}/${pedidoId}/cancelar`, body);
}

transferir(pedidoIdOrigen: number, body: TransferirAbonoRequest): Observable<ResponseGeneric<TransferirAbonoResponse>> {
  return this.http.post<ResponseGeneric<TransferirAbonoResponse>>(`${this.base}/${pedidoIdOrigen}/transferir`, body);
}
```

### Lógica del componente — cancelar (Flujos G y H)

```typescript
cancelarPedido(pedido: EstadoCuenta) {
  const esFiado = pedido.tipoPedido === 'FIADO';
  const msg = esFiado
    ? 'El producto ya fue entregado. La deuda quedará registrada.'
    : `Pagó $${pedido.totalPagado} de $${pedido.totalPedido}. Se devolverá el stock.`;

  Swal.fire({
    title: `¿Cancelar el ${pedido.tipoPedido.toLowerCase()} de ${pedido.cliente}?`,
    text: msg,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: esFiado ? 'Sí, registrar como incobrable' : 'Sí, cancelar'
  }).then(result => {
    if (!result.isConfirmed) return;
    this.abonoService.cancelar(pedido.pedidoId, {}).subscribe(res => {
      Swal.fire('Cancelado', res.data.mensaje, 'success');
      this.cargarEstadoCuenta();
      this.cargarCancelados();
    });
  });
}
```

### Lógica del componente — transferir (Flujo I)

```typescript
// En el modal de transferencia, el saldo pendiente se calcula en tiempo real:
get saldoPendiente(): number {
  return Math.max(0, this.precioUnitario * this.cantidad - this.saldoDisponible);
}

aplicarTransferencia(pedidoIdOrigen: number) {
  const body: TransferirAbonoRequest = {
    nuevaVarianteId: this.varianteElegida.id,
    cantidad: this.cantidad,
    precioUnitario: this.precioUnitario,
    usuarioId: this.usuarioLogueado.id
  };

  this.abonoService.transferir(pedidoIdOrigen, body).subscribe(res => {
    const t = res.data;
    const msg = t.estadoNuevoPedido === 'PAGADO'
      ? `El nuevo pedido #${t.nuevoPedidoId} quedó liquidado.`
      : `Nuevo pedido #${t.nuevoPedidoId}. Saldo pendiente: $${t.saldoPendiente}`;

    Swal.fire('Transferencia aplicada', msg, 'success');
    this.cerrarModal();
    this.cargarCancelados();    // quitar de tab Cancelados
    this.cargarEstadoCuenta();  // el nuevo pedido aparece en Cuentas por cobrar
  });
}
```

### Modal de transferencia — estructura sugerida

```
┌──────────────────────────────────────────────────┐
│ Saldo disponible: $150.00                        │
│                                                  │
│ Buscar variante: [____________]                  │
│ → autocomplete: GET /v1/variantes/buscar?nombre=X│
│                                                  │
│ Variante elegida: Pantalón Negro T-28            │
│ Precio unitario: [280.00]                        │
│ Cantidad:        [1]                             │
│ Total nuevo:     $280.00   (calculado en front)  │
│ Saldo pendiente: $130.00   (calculado en front)  │
│                                                  │
│ [Cancelar]        [Aplicar transferencia]        │
└──────────────────────────────────────────────────┘
```

---

## DUDAS / PREGUNTAS ABIERTAS (front → back)

### D-1 — Flujos G/H/I y tab "Cancelados" aún NO están implementados en el front

El código actual de `abonos.component.ts` solo tiene 2 tabs (`cuenta` y `pagados`). La sección 18 documenta lo que **falta implementar**:

- `cancelarPedido()` con Swal diferenciado (APARTADO vs FIADO)
- `aplicarTransferencia()` con modal de búsqueda de variante
- Tab `cancelados` + `cargarCancelados()` en el componente
- 3 métodos nuevos en `abono.service.ts` (`cancelar`, `transferir`, `reporteCancelados`)
- 5 interfaces nuevas en `abono.model.ts` (`CancelarAbonoRequest/Response`, `TransferirAbonoRequest/Response`, `ReporteCancelado`)

¿Implementamos esto en la siguiente sesión, o hay algo del back que confirmar primero?

### D-2 — `GET /v1/abonos/reporte/cancelados` — ¿cuál es el shape exacto del response?

La sección 17 (tab Cancelados) dice "Back listo" y menciona `saldoAFavor`, `deudaPendiente`, `puedeTransferir`. La interfaz `ReporteCancelado` en la sección 18 tiene esos campos. **¿Confirmar con el back que el response de ese endpoint devuelve exactamente ese JSON?** Si el shape cambia, el front necesita ajustar la interfaz antes de conectar.

### D-3 — Contradicción entre RESUMEN sección 3 y RF-1

El RESUMEN tiene una sección "Carrito del cliente con crédito (Flujo B)" que describe el toggle APARTADO/FIADO en el carrito. Pero RF-1 del DOCUMENTO_BACK dice "NO implementado para clientes regulares." Lo que existe hoy es el selector en `venta-variante.component.html` pero **solo visible para admin** (`*ngIf="isAdminUser"`).

**¿Se necesita exponer esto también para clientes normales?** Si sí, el change es simple: quitar el `*ngIf="isAdminUser"` y ajustar el flujo de confirmación para navegar a `/abonos` cuando el cliente elige crédito.

### D-4 — Al liquidar un pedido (PAGADO), ¿recargamos desde el server o quitamos del array local?

La **NOTA 2026-06-30** del documento dice que cuando `estadoPedido === 'PAGADO'` el front debe llamar `cargarEstadoCuenta()` (reload del server) para evitar desincronización.

El código actual en `abonos.component.ts` línea 142 quita el pedido del array local:
```typescript
this.estadoCuenta = this.estadoCuenta.filter(e => e.pedidoId !== pedido.pedidoId);
```

¿Cambiamos a `this.cargarCuenta()` o el filtro local es suficiente? El filtro local es más rápido (sin HTTP) pero podría desincronizarse si el back calcula el saldo diferente al front.

### D-5 — Campo `totalPedido` en `EstadoCuenta` — ¿viene del back?

La interfaz `EstadoCuenta` tiene `totalPedido: number`. Esto es crítico para calcular `porcentajePagado()` y para el Swal de cancelación ("Pagó $X de $Y").

¿El endpoint `GET /v1/abonos/reporte/estado-cuenta` ya incluye `totalPedido` en cada item? ¿O viene como `totalVenta`/`total`/otro nombre? Si el campo viene con otro nombre, la barra de progreso siempre mostraría 0%.

### D-6 — Cancelar con motivo: ¿es String libre o tiene valores fijos?

El body de `PUT /v1/abonos/{pedidoId}/cancelar` tiene `motivo?: string`. La columna en la migración es `VARCHAR(30) NULL`. ¿El back valida el motivo contra una lista predefinida, o es texto libre con máx. 30 caracteres? Si tiene una lista fija, el front puede mostrar un `select` en vez de un `input` libre.

### D-7 — Transferir: ¿qué pasa si `precioUnitario` difiere del precio actual de la variante?

El modal de transferencia permite que el admin edite el `precioUnitario`. ¿El back toma el precio que manda el front, o lo sobreescribe con el precio actual de la variante en BD? Si el front puede pasar un precio diferente, debe estar bien claro en el UI (un hint "precio editado manualmente").

---

## 19. Respuestas del back a las dudas del front

### R-D1 — Cancelar/Transferir: back listo, front puede implementar ya

No hay nada que confirmar del back. Los 3 endpoints están operativos:
- `PUT /v1/abonos/{id}/cancelar` ✅
- `POST /v1/abonos/{id}/transferir` ✅
- `GET /v1/abonos/reporte/cancelados` ✅

Implementar en el front en la siguiente sesión siguiendo la sección 18.

---

### R-D2 — Shape exacto de `GET /v1/abonos/reporte/cancelados`

El response devuelve exactamente estos campos (confirmado del DTO `ReporteCanceladosDto`):

```json
{
  "code": 200,
  "data": [
    {
      "pedidoId": 55,
      "tipoPedido": "APARTADO",
      "cliente": "María López",
      "telefono": "5512345678",
      "totalPedido": 350.00,
      "totalPagado": 150.00,
      "saldoAFavor": 150.00,
      "deudaPendiente": 0.0,
      "motivo": "Cliente desistió",
      "fechaPedido": "10/05/2026",
      "fechaCancelacion": "30/06/2026",
      "puedeTransferir": true,
      "abonos": [
        { "id": 1, "monto": 150.00, "fechaPago": "20/05/2026", "metodoPago": "EFECTIVO", "nota": null }
      ]
    }
  ]
}
```

> Las fechas vienen en formato `dd/MM/yyyy`. La interfaz `ReporteCancelado` de la sección 18 coincide exactamente con este shape — no hay que ajustarla.

---

### R-D3 — APARTADO/FIADO en carrito: solo ADMIN, no cambiar aún

Confirmado: el selector de APARTADO/FIADO en el carrito es solo para `ROLE_ADMIN` (`*ngIf="isAdminUser"`). **No se expone a clientes regulares por ahora** (RF-1 pendiente). No tocar ese `*ngIf`.

---

### R-D4 — Al liquidar (PAGADO): usar reload del server, no filtro local

Usar `this.cargarEstadoCuenta()` (llamada HTTP) en lugar del filtro local. El back excluye automáticamente los pedidos PAGADOS del reporte `estado-cuenta`, así que el reload es la fuente de verdad. El filtro local puede quedar desfasado si hubiera otro abono registrado en paralelo.

**Cambio concreto en `abonos.component.ts`:**
```typescript
// Cambiar esto:
this.estadoCuenta = this.estadoCuenta.filter(e => e.pedidoId !== pedido.pedidoId);

// Por esto:
this.cargarEstadoCuenta();
```

---

### R-D5 — `totalPedido` en EstadoCuenta: sí viene del back

Confirmado. El endpoint `GET /v1/abonos/reporte/estado-cuenta` devuelve `totalPedido` con ese nombre exacto (campo del DTO `EstadoCuentaDto`). También viene `totalPagado` y `saldo` (= totalPedido - totalPagado calculado en el back). La barra de progreso puede usar cualquiera de los dos:

```typescript
porcentajePagado(item: EstadoCuenta): number {
  if (!item.totalPedido || item.totalPedido === 0) return 0;
  return Math.min(100, (item.totalPagado / item.totalPedido) * 100);
}
```

---

### R-D6 — Motivo de cancelación: texto libre, máx. 30 caracteres

El back **no valida contra lista fija** — acepta cualquier string hasta 30 chars. El front puede usar un `input` libre con `maxlength="30"`. No hay `select`. Si el admin no escribe nada, el back usa `"CANCELADO"` como default.

---

### R-D7 — Precio en transferir: el back usa lo que manda el front

El back toma `precioUnitario` exactamente como lo envía el front y lo usa para calcular `totalNuevo = precioUnitario * cantidad`. **No lo sobreescribe** con el precio de la variante en BD.

Implicación: el modal debe pre-llenar el campo con el precio actual de la variante (que viene en el objeto variante del autocomplete), pero el admin puede editarlo. Agregar un hint visible si el admin modifica el precio:

```
Precio unitario: [280.00]  ⚠ precio editado manualmente
```

Solo mostrar el warning si el valor difiere del `precioVenta` que vino en la búsqueda de variante.

---

## 20. Cambios implementados — 2026-06-30 (segunda sesión)

### 20.1 DN-1 — Rechazar TARJETA en abonos de crédito

**Implementado en:** `AbonoServiceImpl.registrarAbono()`

Los pedidos APARTADO y FIADO ahora rechazan `metodoPago = "TARJETA"` con HTTP 400:

```
"Los pedidos de crédito (APARTADO/FIADO) solo aceptan EFECTIVO o TRANSFERENCIA"
```

El front debe quitar TARJETA del selector de método de pago cuando el pedido es APARTADO o FIADO.

---

### 20.2 NF-3 — Monto dado y cambio en abonos (solo EFECTIVO)

**Archivos cambiados:**
- `AbonoPedido.java` — nuevo campo `montoDado`
- `AbonoRequest.java` — nuevo campo opcional `montoDado`
- `AbonoResponse.java` — nuevos campos `montoDado` y `cambio`
- `AbonoServiceImpl.java` — validación + cálculo de cambio

**DDL aplicado:** QA ✅ | Dev ✅ | Prod ⏳

#### Request POST /v1/abonos/{id}

```json
{
  "monto": 100.00,
  "metodoPago": "EFECTIVO",
  "montoDado": 200.00,
  "fechaPago": "2026-06-30",
  "usuarioId": 1,
  "nota": ""
}
```

- `montoDado` es **opcional** — solo aplica cuando `metodoPago = "EFECTIVO"`
- Si `montoDado < monto` → 400: `"El monto entregado $X es menor al monto del abono $Y"`
- Si `montoDado` viene con TRANSFERENCIA → se ignora (se guarda null)

#### Response

```json
{
  "response": {
    "id": 5,
    "monto": 100.00,
    "fechaPago": "30/06/2026",
    "metodoPago": "EFECTIVO",
    "nota": null,
    "montoDado": 200.00,
    "cambio": 100.00,
    "estadoPedido": "APARTADO",
    "saldoRestante": 150.00
  }
}
```

- `cambio` = `montoDado - monto` (solo EFECTIVO, solo si `montoDado > monto`; null si no aplica)
- `montoDado` y `cambio` también aparecen en `GET /v1/abonos/{id}` (historial)

---

### 20.3 NF-2 — Nuevo endpoint: detalle de pedido para pagar desde la pantalla de pedidos

**Endpoint:** `GET /v1/pedidos/{id}/detalle`  
**Acceso:** público (misma regla que `findPedido`)

#### Response

```json
{
  "response": {
    "pedidoId": 42,
    "tipoPedido": "APARTADO",
    "estadoPedido": "APARTADO",
    "totalPedido": 350.00,
    "totalPagado": 100.00,
    "saldoPendiente": 250.00,
    "fechaPedido": "2026-06-30",
    "fechaRecogida": null,
    "observaciones": "",
    "motivoCancelacion": null,
    "fechaCancelacion": null,
    "clienteNombre": "María López",
    "clienteTelefono": "5512345678",
    "detalles": [
      {
        "id": 10,
        "varianteId": 88,
        "productoNombre": "Pantalón clásico",
        "talla": "M",
        "color": "negro",
        "descripcion": "Tiro alto",
        "cantidad": 1,
        "precioUnitario": 350.00,
        "subTotal": 350.00
      }
    ]
  }
}
```

- Campos nulos se omiten del JSON (`@JsonInclude(NON_NULL)`)
- `saldoPendiente` = `totalPedido - totalPagado`, calculado en el back

#### Imagen de variante

El response incluye `varianteId` en cada detalle. Para mostrar **1 imagen** por producto:

```
GET /mis-productos/v1/variantes/imagenes/{varianteId}
```

El front toma el primer elemento del array devuelto. Si está vacío → mostrar placeholder.  
No hacer N llamadas en paralelo para N artículos: hacerlas secuencialmente o lazy al hacer scroll.

---

## 21. Cambios front pendientes — nuevos requerimientos (2026-06-30)

### 21.1 NF-1 — Nombre del comprador para rifas (venta directa sin cliente registrado)

**Pantalla:** Venta directa / Carrito admin  
**Cuándo:** el admin no selecciona ningún cliente del buscador  
**Cambio:** mostrar campo de texto "Nombre del comprador" que se envía en el body como `clienteSinRegistro`

**Campo en el request** de `POST /v1/ventas/save` (ya soportado en back):
```json
{
  "clienteSinRegistro": {
    "nombrePersona": "Juan Sin Apellido",
    "numeroTelefonico": ""
  }
}
```

Solo requerido `nombrePersona`. `numeroTelefonico` puede ser vacío.  
Si el admin seleccionó cliente registrado → `clienteSinRegistro` no se envía.

---

### 21.2 NF-2 — Pagar APARTADO/FIADO desde la pantalla de pedidos

**Pantalla:** Lista de pedidos (admin)  
**Cambio:** detectar `tipoPedido = "APARTADO" | "FIADO"` y mostrar botón "Registrar abono" en lugar del flujo normal de confirmación de entrega.

**Flujo sugerido:**
1. Admin abre pedido → `GET /v1/pedidos/{id}/detalle` (nuevo endpoint, sección 20.3)
2. Front detecta `tipoPedido !== "NORMAL"` → muestra panel de abono en lugar del botón "Confirmar entrega"
3. Admin ingresa monto, método y opcionalmente monto dado
4. Front llama `POST /v1/abonos/{id}` (sección 11)
5. Si `response.estadoPedido === "PAGADO"` → toast "¡Pedido liquidado!" y recargar lista
6. Si no → mostrar saldo restante actualizado

**Botones según estado:**
- `estadoPedido = "APARTADO" | "FIADO"` → botón "Registrar abono" (azul)
- `estadoPedido = "PAGADO"` → badge verde "Liquidado", sin botones
- `estadoPedido = "cancelado"` → badge rojo, botón "Transferir saldo" (solo si APARTADO y `totalPagado > 0`)

---

### 21.3 NF-3 — Campo "Monto recibido" en formulario de abono (solo EFECTIVO)

**Pantalla:** Modal / panel de registrar abono  
**Cambio:** cuando `metodoPago = "EFECTIVO"`, mostrar campo "Monto recibido" (`montoDado`)

```
Monto del abono:   [  100.00 ]
Método de pago:    [ EFECTIVO ▼ ]   ← sin TARJETA (DN-1)
Monto recibido:    [  200.00 ]      ← aparece solo con EFECTIVO
Cambio:            $  100.00        ← calculado en tiempo real: montoDado - monto
```

- Calcular cambio en tiempo real en el front (no esperar al back)
- Si `montoDado < monto` → mensaje de error inline, deshabilitar botón Guardar
- Si `montoDado` es vacío → no enviar el campo (el back lo ignora)
- Usar el `cambio` del response del back para confirmar en el toast: "Cambio: $100.00"

---

### 21.4 BUG 5 — Refrescar stock al cancelar APARTADO

Tras `PUT /v1/abonos/{id}/cancelar` con `stockDevuelto: true` en el response → invalidar caché de variantes:

```typescript
// Invalidar la variante del pedido cancelado para que el stock se actualice
this.varianteService.clearCache(); // o recargar la búsqueda activa
```

El back ya devuelve stock al cancelar APARTADO. El problema es solo de caché del front.


Del documento, 3 cosas pendientes de front:

1. NF-1 — En /variantes/venta-directa, cuando el admin no asigna cliente, mostrar campo "Nombre del comprador" → enviar clienteSinRegistro: { nombrePersona, numeroTelefonico } en el body. Back ya listo.

2. NF-2 — En la pantalla de pedidos (/pedidos), detectar si el pedido es APARTADO/FIADO y mostrar botón "💳 Registrar abono" en lugar del flujo normal. Usa el endpoint nuevo GET /v1/pedidos/{id}/detalle. Este es el más grande — implica tocar la pantalla de pedidos.

3. BUG 5 — Al cancelar APARTADO exitosamente, invalidar la caché de variantes para que el stock actualizado se vea en el buscador.

Y antes de arrancar necesito que me confirmes:

¿El response de POST /v1/abonos/{id} usa "data" o "response" como clave? El doc dice "response" pero el código actual lee res?.data. Si es "response", los campos montoDado y cambio del response no están llegando al front y hay que corregirlo primero.

---

**R — Respuesta back:** La clave es **`data`**. El código existente del front está correcto.

`ResponseGeneric<T>` devuelve:

```json
{ "data": { ... }, "code": 200, "mensaje": "La peticion fue exitosa" }
```

El patrón `res?.data` que usan pedidos/variantes/productos aplica **igual para todos los endpoints de abonos**. No hay nada que cambiar. Ver F-D1 (sección 23) para la respuesta completa.

---

## 22. Resumen para el front — tareas pendientes (2026-06-30)

> Entregar esta sección al desarrollador front. El back ya está completo y desplegado en dev/qa.

---

### PRIORIDAD 0 — Confirmar wrapper: `res.data` para TODOS los endpoints

El back usa `ResponseGeneric<T>` con el campo **`data`** (no `response`):

```json
{ "data": { ... }, "code": 200, "mensaje": "La peticion fue exitosa" }
```

El patrón `res?.data` que ya usan pedidos/variantes/productos es **correcto y aplica igual para abonos**. No hay que cambiar nada en el wrapper. Ver respuesta completa en F-D1 (sección 23).

---

### TAREA 1 — Quitar TARJETA del selector de método de pago en abonos

**Pantalla:** formulario de registrar abono  
El back ahora rechaza TARJETA con 400. Quitar esa opción del `<select>`:

```html
<option value="EFECTIVO">Efectivo</option>
<option value="TRANSFERENCIA">Transferencia</option>
<!-- Quitar TARJETA -->
```

---

### TAREA 2 — Campo "Monto recibido" y cambio (NF-3)

**Pantalla:** formulario de registrar abono  
Solo mostrar cuando `metodoPago === 'EFECTIVO'`.

```
Monto del abono:   [  100.00 ]
Método de pago:    [ EFECTIVO ▼ ]
Monto recibido:    [  200.00 ]      ← nuevo campo, opcional
Cambio:            $  100.00        ← calculado en tiempo real (montoDado - monto)
```

- Si `montoDado < monto` → error inline + deshabilitar botón Guardar
- Si `montoDado` está vacío → no enviar el campo en el body (el back lo trata como null)
- El response incluye `cambio` calculado por el back → mostrar en el toast de confirmación

**Campo en el request:**
```typescript
{
  monto: 100.00,
  metodoPago: 'EFECTIVO',
  montoDado: 200.00,   // opcional, solo EFECTIVO
  usuarioId: 1
}
```

**En el response:**
```typescript
res.response.cambio      // 100.00 — cambio a devolver
res.response.montoDado   // 200.00 — lo que entregó el cliente
res.response.saldoRestante
res.response.estadoPedido
```

---

### TAREA 3 — Nombre del comprador en venta directa sin cliente (NF-1)

**Pantalla:** `/variantes/venta-directa` o carrito admin  
Cuando el admin no selecciona cliente del buscador, mostrar un campo de texto:

```
[ Buscar cliente... ]   ← si no encuentra a nadie
[ Nombre del comprador: ____________ ]  ← mostrar este campo
```

Enviar en el body:
```typescript
clienteSinRegistro: {
  nombrePersona: 'Juan Pérez',
  numeroTelefonico: ''   // puede ir vacío
}
// NO enviar el campo cliente si no hay cliente registrado
```

Sirve para que la venta aparezca asignada a un nombre en rifas y reportes.

---

### TAREA 4 — Botón "Registrar abono" en pantalla de pedidos (NF-2)

**Pantalla:** lista/detalle de pedidos (`/pedidos`)

**Paso 1 — Detectar tipo de pedido:**
```
GET /mis-productos/v1/pedidos/{id}/detalle
```

Response clave:
```typescript
res.response.tipoPedido    // 'APARTADO' | 'FIADO' | 'NORMAL'
res.response.estadoPedido  // 'APARTADO' | 'FIADO' | 'PAGADO' | 'cancelado'
res.response.totalPedido
res.response.totalPagado
res.response.saldoPendiente
res.response.clienteNombre
res.response.detalles[]    // { varianteId, productoNombre, talla, color, cantidad, precioUnitario, subTotal }
```

**Paso 2 — Lógica de botones según estado:**

| tipoPedido | estadoPedido | Acción |
|---|---|---|
| NORMAL | cualquiera | flujo normal actual |
| APARTADO / FIADO | APARTADO / FIADO | botón "Registrar abono" |
| APARTADO / FIADO | PAGADO | badge verde "Liquidado", sin botones |
| APARTADO / FIADO | cancelado | badge rojo + botón "Transferir saldo" si `totalPagado > 0` |

**Paso 3 — Al registrar abono exitosamente:**
```typescript
if (res.response.estadoPedido === 'PAGADO') {
  // Toast: "¡Pedido liquidado!"
  this.cargarPedidos(); // recargar lista
} else {
  // Mostrar saldo restante actualizado
  pedido.saldoPendiente = res.response.saldoRestante;
}
```

**Paso 4 — Imagen de variante en el detalle:**
```
GET /mis-productos/v1/variantes/imagenes/{varianteId}
```
Tomar solo el primer elemento del array. Si está vacío → mostrar placeholder.

---

### TAREA 5 — Invalidar caché de variantes al cancelar APARTADO (BUG 5)

**Pantalla:** cualquier pantalla que llame a `PUT /mis-productos/v1/abonos/{id}/cancelar`

```typescript
.subscribe(res => {
  if (res.response.stockDevuelto) {
    this.varianteService.clearCache(); // o recargar búsqueda activa
  }
});
```

El back ya devolvió el stock. El problema era que el front no actualizaba la vista.

---

### Endpoints de referencia rápida

| Acción | Método | URL |
|---|---|---|
| Detalle de pedido | GET | `/mis-productos/v1/pedidos/{id}/detalle` |
| Registrar abono | POST | `/mis-productos/v1/abonos/{id}` |
| Historial de abonos | GET | `/mis-productos/v1/abonos/{id}` |
| Estado de cuenta | GET | `/mis-productos/v1/abonos/reporte/estado-cuenta` |
| Cancelar pedido crédito | PUT | `/mis-productos/v1/abonos/{id}/cancelar` |
| Transferir saldo | POST | `/mis-productos/v1/abonos/{id}/transferir` |
| Imagen de variante (1) | GET | `/mis-productos/v1/variantes/imagenes/{varianteId}` |

---

## 23. Dudas del front pendientes de respuesta (2026-07-01)

### F-D1 — ¿`response` o `data`? ¿Aplica solo a abonos o a todos los endpoints?

El proyecto tiene dos tipos de wrapper distintos:

- `ResponseGeneric<T>` (en `src/shared/generic-response.mode.ts`) → usa `data`
- `IResponseGeneric<T>` (en `src/shared/responseGeneric.model.ts`) → usa `response`

Los módulos de pedidos, variantes y productos leen `res?.data` y **funcionan correctamente**.  
Los endpoints de abonos según la sección 22 usan `res?.response`.

**Pregunta concreta:** ¿los endpoints de abonos (`/v1/abonos/*`) devuelven `response` mientras que el resto del proyecto devuelve `data`? ¿O es que todos los endpoints nuevos (a partir de cierta versión del back) pasaron a `response` y los viejos siguen con `data`?

Necesito saber exactamente qué endpoints del módulo de abonos usan `response` para cambiar solo esos y no romper el resto del proyecto.

---

### F-D2 — NF-2: ¿En qué pantalla de pedidos va el botón "Registrar abono"?

Hay dos componentes en el módulo de pedidos:
- `mis-pedidos.component.ts` → lista de pedidos (admin y cliente)
- `detalle-pedido.component.ts` → detalle de un pedido específico

¿El botón "💳 Registrar abono" va en la lista (`mis-pedidos`) o en el detalle (`detalle-pedido`)? ¿O en ambos?

---

### F-D3 — NF-1: ¿Se envían `clienteSinRegistro` Y `clienteId` juntos o son mutuamente excluyentes?

Según la sección 21.1, si el admin NO seleccionó cliente registrado se envía `clienteSinRegistro`. Pero el body actual siempre incluye un `clienteId` (el del admin logueado como fallback).

¿Qué espera el back?
- a) Si `clienteSinRegistro` viene → ignorar `clienteId`
- b) Si `clienteSinRegistro` viene → NO enviar `clienteId` (mutuamente excluyentes)
- c) Se envían ambos y el back decide cuál usar

---

### F-D4 — BUG 5: ¿`varianteService.clearCache()` existe o hay que hacer otra cosa?

La sección 21.4 sugiere `this.varianteService.clearCache()` al cancelar APARTADO para actualizar el stock en pantalla. Ese método NO existe en el `VarianteService` actual del front.

¿Hay un endpoint del back para invalidar el caché de variantes, o simplemente recargamos el buscador activo llamando de nuevo al `GET /v1/variantes/buscar`?


---

## 24. Respuestas back a dudas F-D1 — F-D4 (2026-06-30)

### R-F-D1 — El campo siempre es `data`, para todos los endpoints

Verificado en el código: `ResponseGeneric<T>` (único wrapper del proyecto) tiene el campo `private T data`.

```json
{ "data": { ... }, "code": 200, "mensaje": "La peticion fue exitosa" }
```

**No existe diferencia entre módulos.** Pedidos, variantes, productos Y abonos devuelven `data`. El front no tiene que cambiar nada en cómo lee las respuestas — `res?.data` es correcto en todos los casos.

> La nota del CLAUDE.md sobre "response.response.accessToken" en el JWT se refería al objeto Angular HttpResponse, no a un campo JSON llamado `response`.

---

### R-F-D2 — El botón "Registrar abono" va en el DETALLE del pedido

**Recomendación de UX:**

- `mis-pedidos` (lista) → mostrar solo un **badge** indicando el tipo:
  - `APARTADO` → badge naranja "Apartado"
  - `FIADO` → badge azul "Ir pagando"
  - `PAGADO` → badge verde "Liquidado"
- Al hacer click en el pedido → navegar a `detalle-pedido`
- `detalle-pedido` → aquí va el botón "💳 Registrar abono" y el formulario de pago

Esto evita abrir modales pesados desde la lista y mantiene la pantalla de lista limpia.

**Datos disponibles desde la lista** para mostrar el badge: el listado existente (`GET /v1/pedidos/buscarClientePedido`) ya incluye `tipoPedido` y `estadoPedido` en el JSON nativo que devuelve el repositorio.

**Para el detalle** usar el nuevo endpoint:
```
GET /mis-productos/v1/pedidos/{id}/detalle
```
Devuelve `tipoPedido`, `estadoPedido`, `saldoPendiente`, `clienteNombre`, imagen por `varianteId`, etc. (ver sección 20.3).

---

### R-F-D3 — `clienteSinRegistroDto` y `clienteId` son mutuamente excluyentes

Verificado en `VentaServiceImpl`:

```java
boolean esSinRegistro = request.getClienteSinRegistroDto() != null
    && !request.getClienteSinRegistroDto().getNombre_persona().isBlank();

if (esSinRegistro) {
    clienteSinRegistro = iClienteSinRegistroRepository.save(mapperClienteSinRegistroDto(request));
} else {
    cliente = iClienteRepository.findById(request.getClienteId())...;
}
```

**Regla:** si `clienteSinRegistroDto.nombre_persona` tiene valor → el back usa ese y **no lee `clienteId`**. Si está vacío/null → usa `clienteId`.

**Lo que debe hacer el front:**

```typescript
// CASO: cliente registrado seleccionado
body = {
  clienteId: cliente.id,
  clienteSinRegistroDto: null,   // o simplemente no enviar el campo
  ...
}

// CASO: sin cliente registrado (nombre manual)
body = {
  clienteId: 0,                  // o no importa, el back no lo lee
  clienteSinRegistroDto: {
    nombre_persona: 'Juan Pérez',
    numero_Telefonico: '',        // los demás campos pueden ir vacíos
    segundo_nombre: '',
    apeido_Paterno: '',
    apeido_Materno: '',
    fecha_Nacimiento: '',
    sexo: '',
    correo_Electronico: ''
  },
  ...
}
```

> Nota: los campos de `ClienteSinRegistroDto` usan **snake_case** (`nombre_persona`, `numero_Telefonico`, etc.) — así están definidos en el back. El front debe usar exactamente esos nombres en el JSON.

---

### R-F-D4 — No hay endpoint de caché: simplemente recargar la búsqueda

No existe un endpoint público para invalidar el caché de variantes. Lo que hace el back internamente es evictar Redis al guardar cambios de stock, así que una nueva llamada HTTP siempre trae datos frescos.

**Solución para el front** al cancelar APARTADO:

```typescript
// Después de cancelar exitosamente:
.subscribe(res => {
  if (res?.data?.stockDevuelto) {
    // Re-ejecutar la búsqueda activa de variantes con los mismos params
    this.buscarVariantes(this.terminoBusqueda);
    // O si estás en otra pantalla, solo mostrar mensaje:
    // "El stock fue devuelto. Recarga el buscador para ver el cambio."
  }
});
```

No necesitas `clearCache()` — eso era una sugerencia de pseudocódigo. Simplemente volver a llamar `GET /v1/variantes/buscar` con los mismos parámetros actuales es suficiente.

