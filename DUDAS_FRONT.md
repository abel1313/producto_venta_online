# BUGS / INCONSISTENCIAS FRONT — CARRITO → VENTA DIRECTA

> Documento de trabajo. Anotar aquí errores y dudas antes de tocar código.
> Fecha: 2026-06-30

---

## Pantallas involucradas

| Ruta | Componente | Quién la usa |
|---|---|---|
| `/variantes/buscar` | `BuscarComponent` | Admin y user |
| `/variantes/carrito` | `VentaVarianteComponent` | Admin y user |
| `/variantes/venta-directa` | `VentaDirectaComponent` | Solo admin |

---

## BUG 1 — Cliente no se transfiere al ir a Venta Directa

**Pantalla:** `/variantes/carrito`
**Pasos para reproducir:**
1. Admin agrega productos al carrito
2. En carrito asigna un cliente (campo de búsqueda de cliente)
3. Hace clic en "💰 Cobrar ahora (Venta Directa)"
4. Llega a `/variantes/venta-directa`

**Comportamiento actual:** el campo de cliente aparece vacío — hay que llenarlo de nuevo.
**Comportamiento esperado:** el cliente seleccionado en el carrito debe viajar a venta directa precargado.

---

## BUG 2 — Tipo de pedido no se transfiere al ir a Venta Directa

**Pantalla:** `/variantes/carrito`
**Pasos para reproducir:**
1. Admin selecciona "Apartado" o "Ir pagando" en el carrito
2. Hace clic en "💰 Cobrar ahora (Venta Directa)"
3. Llega a `/variantes/venta-directa`

**Comportamiento actual:** el tipo de pedido vuelve a "Venta total" — hay que seleccionarlo de nuevo.
**Comportamiento esperado:** el tipo elegido en el carrito debe precargarse en venta directa.

---

## BUG 3 — "Pagar a meses" disponible cuando se eligió crédito

**Pantalla:** `/variantes/venta-directa` (y posiblemente carrito)
**Problema:** si el admin selecciona "Apartado" o "Ir pagando", el dropdown de "Pagar a meses"
sigue visible/activo. No tiene sentido — el crédito ya define la forma de pago.

**Comportamiento esperado:** si `tipoPedido === APARTADO || FIADO`, ocultar o deshabilitar completamente
el selector de meses/plan de pago. Solo aplica para venta al contado.

---

## DUDA 1 — ¿El botón "Generar pedido" debe desaparecer para admin?

**Contexto:** en `/variantes/carrito`, el admin ve:
- "🗑 Limpiar carrito"
- "📋 Generar pedido"
- "💰 Cobrar ahora (Venta Directa)"

El usuario señala: si soy admin y tengo "Cobrar ahora (Venta Directa)", ya no necesito "Generar pedido"
porque termino haciendo todo en venta directa de todas formas.

**Preguntas abiertas:**
- ¿Se oculta "Generar pedido" cuando el usuario es admin?
- ¿O se conserva para el caso de que el admin quiera generar un pedido normal (sin cobrar en el momento)?

---

## DUDA 2 — Campo de cliente en carrito vs. venta directa

**Carrito actual:** tiene campo para asignar cliente (búsqueda por nombre/teléfono)
**Venta directa:** tiene campo de cliente con opción "sin registro" (cliente nuevo que no está en BD)

Son dos campos distintos. Si el cliente en el carrito solo busca clientes registrados,
¿debería el carrito eliminar ese campo y dejar todo el manejo del cliente en venta directa?

O bien: ¿el carrito solo necesita el cliente para "Generar pedido" (flujo de usuario regular)
y para el flujo admin (venta directa) el cliente se maneja solo en `/variantes/venta-directa`?

---

---

## DISEÑO DEFINITIVO — DOS FLUJOS SEPARADOS

### Flujo CLIENTE (rol: user)

```
/variantes/buscar → agrega al carrito → /variantes/carrito

El carrito para cliente muestra SOLO:
  - Lista de productos seleccionados
  - Botón "📋 Generar pedido"

NO debe ver:
  - "💰 Cobrar ahora (Venta Directa)"
  - Selector de tipo de pedido (APARTADO / IR PAGANDO)
  - Campo de asignación de cliente
  - Opciones de pago / meses

Cuando genera el pedido → queda registrado → el admin lo retoma desde /pedidos cuando el cliente va a recoger.
```

### Flujo ADMIN (rol: admin)

```
/variantes/buscar → agrega al carrito → /variantes/carrito

El carrito para admin muestra:
  - Lista de productos seleccionados
  - Botón "💰 Cobrar ahora (Venta Directa)"  ← CTA principal
  - Botón "🗑 Limpiar carrito"

NO debe ver:
  - "📋 Generar pedido"  ← el admin NO genera pedidos desde aquí
  - Selector de tipo de pedido (va en venta directa)
  - Campo de cliente (va en venta directa)

Al hacer clic en "Cobrar ahora" → va a /variantes/venta-directa con los productos ya cargados.
En venta directa el admin puede:
  ✔ Buscar y asignar cliente (con opción "sin registro" para clientes nuevos)
  ✔ Elegir tipo: Venta total / Apartado / Ir pagando
  ✔ Elegir forma de pago (solo EFECTIVO o TRANSFERENCIA en crédito)
  ✔ Si elige Apartado o Ir pagando → se oculta/deshabilita el selector de meses
```

---

## CAMBIOS PENDIENTES DE IMPLEMENTAR

### C-1 — Carrito: ocultar opciones según rol
**Archivo:** `src/app/variante/venta-variante/venta-variante.component.html`

| Elemento | Cliente | Admin |
|---|---|---|
| "📋 Generar pedido" | ✅ visible | ❌ oculto |
| "💰 Cobrar ahora (Venta Directa)" | ❌ oculto | ✅ visible |
| Selector NORMAL/APARTADO/IR PAGANDO | ❌ oculto | ❌ oculto (va en venta directa) |
| Campo asignar cliente | ❌ oculto | ❌ oculto (va en venta directa) |
| "🗑 Limpiar carrito" | ✅ visible | ✅ visible |

### C-2 — Venta directa: ocultar meses cuando es crédito
**Archivo:** `src/app/variante/venta-directa/venta-directa.component.html`
Si `tipoPedido === 'APARTADO' || tipoPedido === 'FIADO'` → ocultar completamente el selector de plan/meses.
El back tampoco espera `pagosYMesesId` en ese caso.

---

---

## BUG 4 — Forma de pago desaparece al elegir crédito

**Pantalla:** `/variantes/venta-directa`

**Causa técnica:** `venta-directa.component.html` línea 115:
```html
<p-dropdown *ngIf="!cargandoPagos && !esCredito" ...>
```
Cuando `esCredito = true` (APARTADO o IR PAGANDO), el dropdown de forma de pago desaparece por completo.
Solo queda el texto informativo "El pago de cada abono puede ser en efectivo, transferencia o tarjeta".

**Comportamiento actual:** al elegir APARTADO o IR PAGANDO, el selector de forma de pago desaparece.
El admin no puede registrar cómo se está pagando el enganche/primer abono.

**Comportamiento esperado:**
- Cuando es crédito: el selector de forma de pago (EFECTIVO / TRANSFERENCIA) debe **permanecer visible**
- Lo único que debe desaparecer es el selector de **meses/plan de pago** (ya desaparece — correcto)
- El admin necesita seleccionar cómo se hizo el primer pago (efectivo o transferencia)

> *Nota del usuario:* "cuando estoy en la venta directa puedo seleccionar ir pagando o apartado cuando eso se selecciona ya no aparece la forma de pago si con esas opciones se puede pagar de la misma manera excepto pagos a meses es decir pueda dar un tanto en esa vez y se debe de agregar pero no aparece que voy a hacer un pago de las opciones que te menciono"

---

## ERRORES A NO REPETIR

1. **No duplicar selección de cliente** — el cliente se elige UNA sola vez, en venta directa, no en el carrito. El carrito no debe tener ese campo para el flujo admin.
2. **No duplicar tipo de pedido** — el tipo (APARTADO/IR PAGANDO/NORMAL) se elige UNA sola vez, en venta directa.
3. **Meses y crédito son mutuamente excluyentes** — si el admin elige crédito, ocultar SOLO el selector de meses. La forma de pago base sigue visible.
4. **`!esCredito` en el dropdown de forma de pago es incorrecto** — ese guard oculta algo que sí se necesita en crédito. Solo el selector de meses merece ese guard.

---

## ACLARACIÓN — respuesta a las dudas de arriba (2026-06-30)

### Bug 1 → queda OBSOLETO, lo absorbe BUG 4

Tenías razón en marcarlo: tal como quedó en el **Flujo CLIENTE** más arriba, el cliente (rol user)
NUNCA ve selector de cliente ni de tipo de pedido en el carrito — ese campo ni existe para su rol.
Entonces "el cliente no se transfiere del carrito a venta directa" no aplica: el cliente jamás llega
a venta directa, solo genera el pedido y se va.

Lo que sí describes es para el **admin**, cuando el cliente regresa al local a recoger:
1. Admin retoma el pedido (desde `/pedidos`) y entra a venta directa con esos productos
2. Ahí debe poder elegir: pagar **de una** (transferencia o efectivo) **o** elegir **"ir pagando"**
3. Si elige "ir pagando", el pago que está dando en ese momento puede ser con cualquier forma de pago
   **excepto "meses sin intereses"** y **excepto tarjeta** (genera comisión)

Esto es **el mismo fix que BUG 4** (más abajo) — no es un bug aparte, es la misma causa.

### Bug 2 → queda OBSOLETO

Era "el tipo de pedido no se transfiere del carrito a venta directa". Ya no aplica porque, según el
**Flujo ADMIN** (arriba, sección DISEÑO DEFINITIVO), el carrito del admin ya NO tiene selector de tipo
de pedido — esa elección se hace una sola vez, directo en venta directa (cuando crea la venta o cuando
retoma un pedido). Al no existir el campo en el carrito, no hay nada que "transferir".

### Bug 3 → confirmado, entendido correctamente

Tu ejemplo es la regla exacta: total $1000, eliges "ir pagando", das un abono de $100 → ese abono se
puede pagar con **efectivo o transferencia** — nunca con "3 meses sin intereses" ni con tarjeta (comisión).
"Meses sin intereses" solo aplica cuando se paga el total de una sola vez (venta de contado).

### Bug 4 → explicado otra vez, sin tecnicismos

Hoy en `/variantes/venta-directa`, al elegir "📦 Apartado" o "💳 Ir pagando", el selector de **forma de
pago** (Efectivo / Transferencia) **desaparece de la pantalla por completo**. Solo queda un
texto fijo informativo que no sirve para registrar nada.

Lo que debe pasar: ese selector de forma de pago **debe seguir apareciendo y debe poder usarse** cuando
eliges Apartado o Ir pagando — para que el admin marque con qué forma de pago se dio ESE abono
(efectivo o transferencia). Lo único que debe desaparecer es el selector de **meses sin
intereses**, porque ese NUNCA aplica a un abono parcial — solo a la venta de contado.

**Conclusión:** BUG 1, BUG 3 y BUG 4 se resuelven con el mismo cambio: en
`venta-directa.component.html`, el dropdown de forma de pago deja de ocultarse con crédito; solo el
dropdown de meses sigue ocultándose con crédito.

---

## DUDAS PENDIENTES ANTES DE CODIFICAR (2026-06-30)

> Las siguientes preguntas deben responderse antes de implementar cualquier cambio.
> Contéstalas aquí o en chat y luego continúo.

### D-1 — ¿Los abonos posteriores (pantalla `/abonos`) también aceptan tarjeta/transferencia o siguen siendo solo efectivo?

Hoy la pantalla `/abonos` (donde el admin registra un abono después de haberlo creado)
tiene el método de pago **fijo a Efectivo** — tarjeta y transferencia se eliminaron por decisión del 2026-06-28.

Tú dices que el abono se puede pagar con tarjeta, débito, transferencia o efectivo (todo excepto meses).

**¿Aplica ese cambio solo al primer pago/enganche en `/variantes/venta-directa` al crear el crédito,
o también a los abonos posteriores en `/abonos`?**

Opciones:
- (a) En AMBAS pantallas — venta-directa y /abonos — permitir Efectivo / Transferencia / Tarjeta
- (b) Solo en venta-directa (primer enganche). En /abonos seguir forzando Efectivo

---

### D-2 — ¿El backend acepta `pagosYMesesId` cuando `tipoPedido = APARTADO | FIADO`?

Hoy cuando es crédito (APARTADO o IR PAGANDO), el front NO envía `pagosYMesesId` al backend
— solo envía `tipoPedido` y `observaciones`.

Si mostramos el selector de forma de pago en modo crédito, para que el dato no se pierda tendría
que enviarse también al backend (`POST /v1/ventas/save`).

**¿El backend ya acepta este campo en el request cuando `tipoPedido` es crédito?
¿O de momento ignorarlo y solo mostrarlo visualmente sin enviarlo?**

---

### D-3 — ¿La forma de pago en modo crédito cancela el modo crédito al elegirla?

Hoy si el admin elige "Ir pagando" y después selecciona "Efectivo" en el dropdown de forma de pago,
el código llama `this.tipoPedido = 'NORMAL'` automáticamente (se "cancela" el modo crédito).

Si queremos mostrar el dropdown de forma de pago SIN cancelar el crédito, hay que cambiar esa lógica.

**¿Confirmas que elegir la forma de pago mientras se está en modo crédito NO debe cancelar Apartado/Ir pagando?**

---

### D-4 — ¿Es necesario elegir forma de pago para poder cobrar en modo crédito?

Hoy `puedeCobrar` acepta el botón Cobrar si `esCredito = true`, aunque no se haya seleccionado
ninguna forma de pago. Si ahora ponemos forma de pago visible en crédito, ¿debe ser obligatoria?

Opciones:
- (a) Sí obligatoria — el admin DEBE elegir Efectivo/Transferencia antes de poder cobrar
- (b) No obligatoria — se puede cobrar sin elegir forma de pago (queda como "sin especificar")

---

### D-5 — Carrito: ¿el cliente (usuario rol user) puede ver el precio total y la lista de productos?

El Flujo CLIENTE en el DISEÑO DEFINITIVO dice que el carrito del cliente solo muestra la lista de
productos y el botón "Generar pedido". ¿El cliente también ve el total en pesos? ¿Puede cambiar
cantidades o quitar productos desde el carrito?

---

## RESPUESTAS DEL BACK (2026-06-30)

### R-D1 — Abonos posteriores en /abonos: ✅ EFECTIVO y TRANSFERENCIA (no TARJETA)

Inicialmente se respondió opción (a) — 3 métodos. Pero luego se decidió excluir TARJETA (ver DN-1).
Resultado final: tanto venta-directa como `/abonos` aceptan **solo EFECTIVO y TRANSFERENCIA**.

---

### R-D2 — ¿El back acepta `pagosYMesesId` en crédito? No lo necesita — usar abono inmediato

**NO hay que enviar `pagosYMesesId`** cuando `tipoPedido = APARTADO | FIADO`. El back lo ignora
en ese caso y no falla, pero tampoco lo usa.

La forma de pago del enganche se registra así (sin cambiar el back):

```
1. POST /v1/ventas/save  { tipoPedido: "APARTADO", detalles: [...] }
   → Response: { pedidoId: 55, totalVenta: 1000 }

2. Si el admin seleccionó forma de pago y monto inicial > 0:
   POST /v1/abonos/55  { monto: 100, metodoPago: "EFECTIVO", usuarioId: 1 }
   → El enganche queda registrado como primer abono

3. Si monto inicial = 0 (no dio nada de entrada): no llamar /abonos
   → El pedido queda con totalPagado = 0, saldo = 1000
```

El front necesita agregar un campo **"Monto inicial (opcional)"** en la pantalla de venta directa
cuando es crédito. El back no requiere cambios.

---

### R-D3 — Elegir forma de pago en modo crédito: NO cancela el crédito ✅ confirmado

Correcto. Elegir Efectivo/Transferencia mientras está en APARTADO o IR PAGANDO **NO debe
cancelar el modo crédito**. Son selecciones independientes.

La lógica actual `this.tipoPedido = 'NORMAL'` cuando se selecciona forma de pago está mal — hay
que quitarla para el flujo crédito.

---

### R-D4 — ¿Forma de pago obligatoria en crédito?

Depende del monto inicial:
- Si el admin NO ingresa monto inicial (campo vacío o 0) → no se valida forma de pago, se puede cobrar
- Si el admin SÍ ingresa monto inicial > 0 → la forma de pago **sí es obligatoria** antes de cobrar

Regla concreta para `puedeCobrar`:
```typescript
if (esCredito) {
  const tieneMontoInicial = this.montoInicial > 0;
  return tieneMontoInicial ? this.metodoPagoSeleccionado != null : true;
}
```

---

### R-D5 — Carrito del cliente: sí ve total, sí puede cambiar cantidades

El cliente en el carrito:
- ✅ Ve la lista de productos con cantidad, precio unitario y subtotal
- ✅ Ve el total en pesos
- ✅ Puede cambiar cantidades y quitar productos
- ✅ Solo botón "📋 Generar pedido"
- ❌ No ve forma de pago, ni tipo de crédito, ni campo de cliente

---

## RESUMEN — IMPLEMENTADO ✅ (2026-06-30)

| # | Cambio | Archivo | Estado |
|---|---|---|---|
| 1 | C-1: ocultar "Generar pedido" para admin (`*ngIf="!isAdminUser"`) | `venta-variante.component.html` | ✅ |
| 2 | C-1: ocultar selector APARTADO/IR PAGANDO y campo cliente (`*ngIf="false"`) | `venta-variante.component.html` | ✅ |
| 3 | BUG 4: sección crédito con 2 botones EFECTIVO/TRANSFERENCIA + campo monto inicial | `venta-directa.component.html` | ✅ |
| 4 | BUG 4: R-D2: si montoInicial > 0, llamar POST /v1/abonos/{pedidoId} tras el save | `venta-directa.component.ts` | ✅ |
| 5 | DN-1: quitar TARJETA de `metodosCredito` en venta directa | `venta-directa.component.ts` | ✅ |
| 6 | DN-1: quitar TARJETA de `metodos` en abonos | `abonos.component.ts` | ✅ |
| 7 | DN-2: campo motivo al cancelar en modal `/abonos` (`maxlength="30"`) | `abonos.component.html/.ts` | ⏳ pendiente |
| 8 | BUG 5: invalidar cache de variantes tras cancelar APARTADO | `abonos.component.ts` | ⏳ pendiente |
| 9 | BUG 6: mostrar error del back cuando monto > saldo pendiente | `abonos.component.html` | ⏳ pendiente |

**Verificado con `ng build --configuration=development` sin errores.**

---

## DECISIONES DE NEGOCIO (2026-06-30)

### DN-1 — Métodos de pago en crédito (APARTADO / IR PAGANDO): solo EFECTIVO y TRANSFERENCIA

**Decisión:** cuando el pedido es APARTADO o FIADO, los únicos métodos aceptados son:
- ✅ EFECTIVO
- ✅ TRANSFERENCIA
- ❌ TARJETA — se excluye porque cada cobro con tarjeta genera comisión al negocio

Esto aplica tanto al enganche inicial (en venta directa) como a los abonos posteriores (en `/abonos`).

**Impacto front (✅ implementado):** `metodosCredito` y `metodos` reducidos a `['EFECTIVO', 'TRANSFERENCIA']`.

**Impacto back (⏳ pendiente):** `AbonoServiceImpl.registrarAbono()` debe rechazar `metodoPago = "TARJETA"` cuando el pedido sea APARTADO o FIADO.

---

### DN-2 — Campo de motivo/observaciones al cancelar: BACK ✅ / FRONT ⏳

Confirmado — el campo ya existe en todos los niveles del back:

| Nivel | Detalle |
|---|---|
| BD | `pedidos.motivo_cancelacion VARCHAR(30)` |
| Back request | `CancelarAbonoRequest.motivo?: string` — opcional, máx. 30 chars |
| Back default | Si no se envía motivo, el back guarda `"CANCELADO"` |
| Front ⏳ pendiente | El modal de cancelación debe incluir un `input` o `textarea` para que el admin escriba el motivo |

El motivo es texto libre (no lista fija). El front puede mostrar un campo opcional con `maxlength="30"`.

---

## BUGS NUEVOS (2026-06-30)

### BUG 5 — Stock no se refresca en pantalla al cancelar un APARTADO (front)

**Pantalla:** `/variantes/buscar`
**Pasos:** cancelar un APARTADO desde `/abonos` → ir a buscar la variante → el stock sigue mostrando el valor anterior.
**Causa:** el back devuelve el stock correctamente al cancelar, pero el front no recarga los datos de variantes tras la cancelación.
**Fix front:** después de recibir el response de `PUT /v1/abonos/{id}/cancelar` con `stockDevuelto: true`, invalidar el cache local de variantes o forzar un reload si el usuario navega a `/variantes/buscar`.
**El back está correcto** — el stock se devuelve en `AbonoServiceImpl.cancelarPedido()`.

---

### BUG 6 — Se podía registrar un abono mayor al saldo pendiente (back) ✅ CORREGIDO EN BACK

**Síntoma:** pedido con saldo de $100, el admin registraba un abono de $200 y el sistema lo aceptaba. `totalPagado` quedaba en $300 siendo que `totalPedido = $200`.
**Causa:** `AbonoServiceImpl.registrarAbono()` no validaba que `monto <= saldoPendiente`.
**Fix aplicado en `AbonoServiceImpl`:** se agregó validación antes de guardar:
- Si `monto <= 0` → error "El monto del abono debe ser mayor a cero"
- Si `monto > saldoPendiente` → error "El monto $X excede el saldo pendiente de $Y"

**Response 400 que recibirá el front:**
```json
{ "code": 400, "mensaje": "El monto $200.00 excede el saldo pendiente de $100.00", "data": null }
```

**Fix front ⏳ pendiente:** mostrar `res.mensaje` en el modal de abono cuando el back devuelve 400.

---

## NUEVOS REQUERIMIENTOS (2026-06-30)

### NF-1 — Cliente sin registro: campo nombre para rifas

**Contexto:** cuando el admin registra una venta directa a alguien que no está en la BD (cliente sin registro), quiere poder anotar el nombre del comprador para que aparezca en las rifas.

**Comportamiento esperado:**
- En la pantalla de venta directa, si no se selecciona un cliente registrado, mostrar un campo de texto "Nombre del comprador" (opcional)
- Ese nombre se envía en el request como `clienteSinRegistroDto.nombrePersona`
- El back guarda el registro en `clientes_sin_registro` y lo vincula al pedido/venta
- Ese nombre aparece en los reportes de rifas igual que un cliente registrado

**Request actual de `POST /v1/ventas/save` (ya soportado en el back):**
```json
{
  "usuarioId": 1,
  "clienteSinRegistroDto": {
    "nombrePersona": "Juan Pérez",
    "numeroTelefonico": "5512345678"   ← opcional
  },
  "detalles": [...]
}
```

**Lo que falta:** el front mostrar el campo de texto en la UI cuando no hay cliente seleccionado. El back ya acepta `clienteSinRegistroDto`. No requiere cambios en el back.

---

### NF-2 — Pagar APARTADO/FIADO desde la pantalla de pedidos

**Problema actual:** el admin abre un pedido APARTADO/FIADO desde `/pedidos` e intenta procesarlo como si fuera una venta normal → el back da error porque ese pedido no se paga con `PUT /v1/pedidos/{id}`, se paga con `POST /v1/abonos/{id}`.

**Solución (solo front, sin cambiar el back):**
Cuando el admin abre un pedido desde la pantalla de pedidos y el `tipoPedido` es `APARTADO` o `FIADO`:
- No mostrar el selector de forma de pago normal
- Mostrar un botón "💳 Registrar abono" que navegue a `/abonos` con el `pedidoId` resaltado
- O bien abrir directamente el modal de abono desde la pantalla de pedidos llamando a `POST /v1/abonos/{id}`

**Comportamiento esperado:**
```
Admin en /pedidos → ve pedido #55 APARTADO — saldo $350
  → hace clic en "💳 Registrar abono"
  → se abre modal de abono (igual al de /abonos)
  → POST /v1/abonos/55  { monto, metodoPago, usuarioId }
  → si PAGADO → pedido cambia a PAGADO en pantalla
  → si parcial → actualiza saldo mostrado
```

El back ya maneja todo en `AbonoServiceImpl` — cuando `totalPagado >= totalPedido` cambia `estadoPedido = "PAGADO"` automáticamente. No requiere cambios en el back.

---

### NF-3 — Registrar monto dado por el cliente (billete / cambio)

**Caso de uso:** el cliente debe $100. Da un billete de $200. El admin quiere registrar:
- Monto del abono: $100 (lo que se aplica a la deuda)
- Monto dado: $200 (lo que entregó el cliente)
- Cambio: $100 (lo que se le regresa)

También aplica para pago exacto: debe $100, da $100 → cambio $0.

**Campos nuevos necesarios:**

| Campo | Dónde | Detalle |
|---|---|---|
| `montoDado` | `AbonoRequest` | Cuánto entregó el cliente — opcional, solo aplica a EFECTIVO |
| `montoDado` | `abono_pedido` (BD) | Guardar para historial |
| `cambio` | `AbonoResponse` | Calculado: `montoDado - monto` (0 si no se envió montoDado) |

**DDL requerido — ejecutar en dev, qa y prod:**
```sql
ALTER TABLE abono_pedido
    ADD COLUMN monto_dado DECIMAL(10,2) NULL
        COMMENT 'Monto entregado por el cliente (para calcular cambio en efectivo)';
```
> **Archivo:** `src/main/resources/static/migration_abonos_pedido.sql` — agregar al BLOQUE 2 (delta).

**Cambios en el back:**
- `AbonoPedido.java` → agregar campo `montoDado`
- `AbonoRequest.java` → agregar `montoDado?: Double` (opcional)
- `AbonoResponse.java` → agregar `montoDado` y `cambio`
- `AbonoServiceImpl.registrarAbono()` → calcular `cambio = montoDado != null ? montoDado - monto : 0`; validar que `montoDado >= monto` si se envía

**Cambios en el front:**
- Modal de abono: agregar campo "Monto recibido" — visible solo cuando `metodoPago = EFECTIVO`
- Mostrar "Cambio: $X" en tiempo real mientras el admin escribe el monto recibido
- Enviar `montoDado` en el body del abono solo si `metodoPago = EFECTIVO`
