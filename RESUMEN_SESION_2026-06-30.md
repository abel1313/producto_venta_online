# Resumen de cambios — Sesión 2026-06-30

> Módulos afectados: **Venta Directa**, **Abonos/Créditos**, **Carrito → Venta Directa**

---

## ⚠️ Prerequisito — Migración de base de datos

Antes de probar cualquier endpoint de abonos hay que correr el script SQL:

```
src/main/resources/static/migration_abonos_pedido.sql
```

Qué hace:
- `ALTER TABLE pedidos` — agrega columnas `tipo_pedido`, `total_pedido`, `total_pagado`
- `CREATE TABLE abono_pedido` — tabla donde se guardan todos los abonos

Sin esta migración los endpoints `/v1/abonos/*` y `POST /v1/ventas/save` con crédito
fallarán con error de columna/tabla no encontrada.

---

## 1. Crédito en Venta Directa (APARTADO / IR PAGANDO)

### Qué se hizo

Se agregaron dos opciones de crédito ("📦 Apartado" e "💳 Ir pagando") como botones toggle
dentro de la pantalla de Venta Directa (`/variantes/venta-directa`). Anteriormente solo
existían los pagos al contado (dropdown de efectivo / tarjeta / transferencia / meses).

### Endpoint utilizado

| Método | URL | Cambios en el request | Cambios en el response |
|---|---|---|---|
| `POST` | `/v1/ventas/save` | Se agrega `tipoPedido: "APARTADO"\|"FIADO"` y `observaciones: string` opcionales. Cuando van estos campos **NO se envía** `pagosYMesesId` | Se agrega `pedidoId: number\|null`. Si es crédito: `pedidoId` tiene valor y `ventaId` es null. Si es venta normal: `ventaId` tiene valor y `pedidoId` es null |

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/variante/service/variante.service.ts` | `IVentaDirectaRequest`: agrega `tipoPedido?`, `observaciones?`, hace `pagosYMesesId` opcional. `IVentaDirectaResponse`: agrega `pedidoId: number\|null`, hace `ventaId`, `tipoPago`, `descripcionPago` nullables |
| `src/app/variante/venta-directa/venta-directa.component.ts` | Inyecta `Router`; campos `tipoPedido` y `observaciones`; getter `esCredito`; `puedeCobrar` acepta crédito sin `pagosYMesesId`; `seleccionarCredito()` toggle; `ejecutarVenta()` bifurca por `pedidoId` |
| `src/app/variante/venta-directa/venta-directa.component.html` | Botones "📦 Apartado" / "💳 Ir pagando"; textarea de observaciones; aviso informativo; dropdown de meses oculto cuando hay crédito |
| `src/app/variante/venta-directa/venta-directa.component.scss` | `.vd-credit-divider`, `.vd-credit-btns`, `.vd-btn-credit`, `.vd-btn-credit--active`, `.vd-observaciones`, `.vd-credit-info` |

### Flujo completo — Venta Directa con Crédito

```
Admin va a /variantes/venta-directa

PASO 1 — Agregar artículos
  Busca variante por nombre o código de barras (mín. 3 chars)
  → GET /v1/variantes/buscar (servicio existente)
  Hace clic en ➕ para agregar al ticket
  Repite para todos los artículos

PASO 2 — Seleccionar forma de pago
  OPCIÓN A (contado): selecciona del dropdown (EFECTIVO / TRANSFERENCIA / TARJETA + meses)
  OPCIÓN B (crédito): clic en "📦 Apartado" o "💳 Ir pagando" (toggle)
    → El dropdown de meses se oculta
    → Aparece textarea de observaciones (opcional)
    → Aparece aviso: "Los abonos pueden ser efectivo, transferencia o tarjeta — sin meses"

PASO 3 — Cliente (opcional)
  Busca cliente registrado ó agrega cliente sin registro
  Si no se asigna → se usa el cliente del admin logueado

PASO 4 — Cobrar
  Clic en "💰 Cobrar"
  → POST /v1/ventas/save

  SI respuesta.pedidoId tiene valor (crédito):
    → Swal "✅ Apartado/Ir pagando registrado"
    → Botón "💳 Ir a Créditos / Abonos" → navega a /abonos
    → El ticket se limpia

  SI respuesta.ventaId tiene valor y requiereTerminal = false (efectivo/transferencia):
    → Swal "¡Venta #X registrada!"
    → El ticket se limpia

  SI respuesta.requiereTerminal = true (tarjeta):
    → Aparece panel de terminal Mercado Pago
    → Admin envía a terminal → pollea estado → aprobado/cancelado
```

---

## 2. Actualización del módulo Abonos

### Qué se hizo

Se actualizaron tres cosas en el módulo de créditos/abonos (`/abonos`):

1. El request de registrar abono ahora requiere `usuarioId` (id del admin logueado), necesario para que el backend cree la venta cuando se liquida el pedido.
2. La respuesta del registro cambió de shape: antes devolvía el objeto abono, ahora devuelve `{ estadoPedido, saldoRestante }`.
3. Los métodos de pago en el modal de abono se restauraron a los 3 originales (EFECTIVO, TRANSFERENCIA, TARJETA). Se había reducido a solo EFECTIVO por error — los abonos sí pueden ser en cualquier método, solo no tienen planes de meses.

### Endpoint utilizado

| Método | URL | Cambios en el request | Cambios en el response |
|---|---|---|---|
| `POST` | `/v1/abonos/{pedidoId}` | Se agrega `usuarioId: number` (obligatorio) | Response cambia de `AbonoResponse` a `{ estadoPedido: string, saldoRestante: number }` |

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/abonos/models/abono.model.ts` | `AbonoRequest` agrega `usuarioId?: number`; nueva interfaz `AbonoRegistrarResponse { estadoPedido, saldoRestante }` |
| `src/app/abonos/service/abono.service.ts` | `registrarAbono()` retorna `Observable<ResponseGeneric<AbonoRegistrarResponse>>` |
| `src/app/abonos/abonos.component.ts` | Inyecta `AuthService`; obtiene `idUsuario`; envía `usuarioId` en el body; usa `res.data.estadoPedido` y `res.data.saldoRestante` para actualizar estado local; `metodos` restaurado a `['EFECTIVO','TRANSFERENCIA','TARJETA']` |
| `src/app/abonos/abonos.component.html` | Modal de abono restaura los 3 botones de método de pago (antes estaba fijo en Efectivo disabled) |
| `src/app/variante/venta-variante/venta-variante.component.html` | Aviso de "solo efectivo" → cambiado a "abonos pueden ser efectivo, transferencia o tarjeta — sin meses" |
| `src/app/variante/venta-directa/venta-directa.component.html` | Mismo aviso corregido |

### Flujo completo — Registrar Abono

```
Admin va a /abonos → Tab "Cuentas por cobrar"
  → GET /v1/abonos/reporte/estado-cuenta → lista de pedidos con saldo pendiente

Por cada pedido pendiente se muestra:
  - Tipo (Apartado / Ir pagando)
  - Cliente y teléfono
  - Total pedido / Pagado / Saldo restante
  - Barra de progreso (% pagado)
  - Historial de abonos (expandible)

Admin hace clic en "+ Abono" en el pedido deseado
  → Se abre modal con:
    - Monto (número, obligatorio)
    - Método de pago (toggle: EFECTIVO / TRANSFERENCIA / TARJETA)
    - Fecha de pago (default: hoy)
    - Nota (opcional)

Admin ingresa monto y clic en "Registrar abono"
  → POST /v1/abonos/{pedidoId}
    Body: { monto, usuarioId, fechaPago?, metodoPago?, nota? }

  SI estadoPedido === 'PAGADO':
    → Swal "¡Pedido liquidado!" (3 seg)
    → Pedido se quita de la lista de pendientes
    → (En el backend: se crea la Venta automáticamente al liquidar)

  SI aún hay saldo:
    → Swal "Abono registrado — Saldo restante: $X"
    → El card del pedido actualiza los montos localmente
```

---

## 3. Carrito del cliente con crédito (Flujo B)

### Qué se hizo

Se agregó la opción de que el cliente (o el admin registrando en nombre del cliente) pueda elegir
APARTADO o FIADO directamente desde el flujo del carrito, sin tener que pasar por Venta Directa.
El backend ya soportaba `tipoPedido` en `savePedido` desde antes. Solo requirió cambio de front.

### Endpoint utilizado

| Método | URL | Cambios en el request | Cambios en el response |
|---|---|---|---|
| `POST` | `/v1/pedidos/savePedido` | Se agrega `tipoPedido?: string` y `estadoPedido?: string` opcionales. Valores posibles: `"APARTADO"` o `"FIADO"`. Sin ellos = pedido NORMAL | Sin cambios — devuelve el pedido creado como siempre |

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/pedidos/models/pedido.model.ts` (o donde esté la interfaz del request) | Agrega `tipoPedido?: string` y `estadoPedido?: string` a la interfaz de `savePedido` |
| Componente del carrito (checkout) | Agrega toggle APARTADO / FIADO antes de confirmar; si se selecciona uno envía los campos en el body; tras confirmar → redirige a `/abonos` en lugar de la pantalla de confirmación normal |

### Flujo completo — Carrito del cliente con crédito

```
Cliente agrega variantes al carrito desde /variantes/buscar

Admin va al carrito del cliente (/variantes/carrito o equivalente)
  Ve la lista de artículos

Admin selecciona "📦 Apartado" o "💳 Ir pagando" (toggle, igual que en Venta Directa)
  → Se oculta el selector de meses (no aplica en crédito)
  → Aparece aviso: "Se generará un pedido pendiente de pago"

Admin hace clic en "📋 Generar pedido con crédito"
  → POST /v1/pedidos/savePedido
    Body: { tipoPedido: "APARTADO", estadoPedido: "APARTADO", detalles: [...], ... }

Response: pedido creado con estadoPedido = "APARTADO"
  → Swal "Pedido creado — el cliente irá pagando"
  → Botón "💳 Ir a Créditos / Abonos" → navega a /abonos

A partir de aquí el flujo es IDÉNTICO al Flujo F (registrar abonos hasta liquidar)
```

> **Diferencia entre Flujo B y Flujo E:**
> Flujo B viene del carrito normal del cliente → usa `POST /v1/pedidos/savePedido`
> Flujo E viene de Venta Directa del admin → usa `POST /v1/ventas/save`
> El resultado en BD y el flujo de abonos es exactamente el mismo.

---

## 4. Carrito → Venta Directa para Admin (Flujo C) — solo admin

### Qué se hizo

El admin puede agregar variantes al carrito desde `/variantes/buscar` y luego ir al carrito
(`/variantes/carrito`). Antes solo tenía "📋 Generar pedido" (que usa `savePedido`). Ahora
también tiene "💰 Cobrar ahora (Venta Directa)" que lo lleva a la venta directa con todos
los artículos del carrito ya pre-cargados.

### Endpoint utilizado

Ninguno nuevo. Reutiliza `POST /v1/ventas/save` (mismo endpoint de Venta Directa, sección 1).

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/variante/venta-variante/venta-variante.component.ts` | Agrega método `irAVentaDirecta()` → `router.navigate(['/variantes/venta-directa'])` |
| `src/app/variante/venta-variante/venta-variante.component.html` | Botón "💰 Cobrar ahora (Venta Directa)" solo visible para admin, junto al botón "Generar pedido" |
| `src/app/variante/venta-directa/venta-directa.component.ts` | Inyecta `CarritoVarianteService`; en `ngOnInit` si admin y carrito tiene items → pre-carga como `lineas[]`; en `limpiarTodo()` si vinieron del carrito → limpia el carrito también |

### Flujo completo — Carrito a Venta Directa

```
Admin navega al catálogo /variantes/buscar
  Agrega variantes al carrito con el botón 🛒
  El badge del carrito en el sidebar se actualiza

Admin va a /variantes/carrito
  Ve la tabla con todos los artículos del carrito

Admin hace clic en "💰 Cobrar ahora (Venta Directa)"
  → Navega a /variantes/venta-directa
  → El componente detecta automáticamente que hay items en el carrito
  → Pre-carga los artículos como líneas de venta (sin llamada HTTP adicional)

A partir de aquí el flujo es IDÉNTICO al de Venta Directa normal:
  → Admin puede agregar más artículos si quiere
  → Selecciona forma de pago (todas las opciones disponibles)
  → Selecciona cliente (opcional)
  → Clic en "💰 Cobrar"
  → POST /v1/ventas/save (mismo endpoint)
  → Al confirmar la venta → el carrito se limpia automáticamente

NOTA: si el admin navega a /variantes/venta-directa directamente (sin pasar por el carrito),
el comportamiento es el mismo que siempre — las líneas están vacías y el admin busca manualmente.
```

---

## Resumen de todos los endpoints tocados en esta sesión

| Método | URL | Servicio | Quién lo usa |
|---|---|---|---|
| `POST` | `/v1/ventas/save` | `VarianteService.saveVentaDirecta()` | `VentaDirectaComponent` (con crédito o contado) |
| `POST` | `/v1/pedidos/savePedido` | `PedidoService.savePedido()` | Carrito del cliente con APARTADO/FIADO (Flujo B) |
| `POST` | `/v1/abonos/{pedidoId}` | `AbonoService.registrarAbono()` | `AbonosComponent` modal de abono |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | `AbonoService.reporteEstadoCuenta()` | `AbonosComponent` tab "Cuentas por cobrar" |
| `GET` | `/v1/abonos/reporte/pagados` | `AbonoService.reportePagados()` | `AbonosComponent` tab "Liquidados" |
| `GET` | `/v1/abonos/{pedidoId}` | `AbonoService.obtenerAbonos()` | Sin usar directamente en UI aún (disponible) |

---

## Decisiones importantes

| Decisión | Motivo |
|---|---|
| Los abonos aceptan EFECTIVO, TRANSFERENCIA y TARJETA | El tipo de crédito (APARTADO/FIADO) no restringe el método de cada abono individual — solo los meses no aplican |
| `pagosYMesesId` no se envía cuando hay crédito | El backend lo ignora y crea solo Pedido (no Venta) cuando recibe `tipoPedido: APARTADO\|FIADO` |
| El carrito NO se limpia al navegar a Venta Directa | Solo se limpia cuando la venta se confirma exitosamente (en `limpiarTodo()`). Si el admin cancela, puede volver al carrito |
| `usuarioId` en AbonoRequest | Necesario para que el backend sepa qué admin liquidó el pedido y pueda crear la Venta correspondiente al completarse |
