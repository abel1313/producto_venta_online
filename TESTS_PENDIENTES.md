# Tests pendientes — front (producto_venta_online)

Regla en `CLAUDE.md` (2026-10-06): ya no se escriben tests automáticos (Jasmine/Karma ni Playwright
`e2e/`) mientras las pantallas cambian tanto. Cada cambio nuevo deja aquí **qué test le falta y qué
tiene que comprobar**. Lo más nuevo va arriba.

Formato de cada entrada:

```
### AAAA-MM-DD — Qué se hizo
**Dónde:** componente / servicio / método
**Tipo:** unitario (componente o servicio con HttpTestingController) · e2e (Playwright contra QA)
**Debe comprobar:**
- [ ] acción → resultado esperado
```

---

### 2026-10-06 — Cobro a crédito desde la card de Mis pedidos (rama `feature/cobro-desde-card`)
**Dónde:** `pedidos/cobro/` (`FormularioCobroBase`, `CobroPedidoBase`, `CobroGrupoBase`, `LiquidarApartadoComponent`, `DarAbonoComponent`, `LiquidarGrupoComponent`, `AbonarGrupoComponent`, `CampoPagoComponent`) · `MisPedidosComponent.formaCobroCredito()`, `textoBotonCobro()`, `puedeCobrarCard()`, `cobrarAdmin()`
**Tipo:** unitario de cada formulario (servicios simulados) + componente de la lista + e2e
**Debe comprobar:**
- [ ] Botón de la card: Apartado suelto → "Liquidar"; Ir pagando suelto → "Dar abono"; Apartados unidos → "Liquidar"; Ir pagando unidos → "Abonar al grupo"; contado (suelto o unido) → "Cobrar" y abre el diálogo de siempre.
- [ ] Un miembro de grupo abierto por su número cobra contra el grupo (no como pedido suelto).
- [ ] Contado pide la acción `cobrar`; crédito pide `abonar`. Sin la acción, no sale el botón.
- [ ] Liquidar Apartado: monto = saldo del detalle y no se puede escribir; manda `POST /v1/abonos/{id}` con ese monto.
- [ ] Dar abono: monto 0 al abrir; 600 con saldo 500 → aviso "Es más de lo que se debe" y botón apagado; "Liquidar todo" pone 500.
- [ ] Efectivo con monto recibido 200 y monto 100 → cambio $100 y `montoDado: 200` en el request; recibido 50 → aviso y no deja guardar. Transferencia → no manda `montoDado`.
- [ ] Ramo urgente: si `revalidar-antes-de-pagar` dice `cargoRecienAplicado`, no cobra, avisa el total nuevo y recarga el saldo. Si esa llamada falla, cobra igual.
- [ ] Con correo del cliente y la casilla marcada → manda `notificacion.ticketHtml`. Sin correo → al terminar pregunta a qué correo.
- [ ] Liquidar grupo: monto = `saldoGrupo` fresco (leído de `/por-pedido`), fijo; manda `POST /v1/grupos-pedido/{grupoId}/abonos`.
- [ ] Abonar al grupo: monto libre hasta `saldoGrupo`; el resumen dice "Pagado del grupo" y "Falta".
- [ ] Grupo ya deshecho al abrir → "Este pedido ya no está unido" y se cierra.
- [ ] Al cobrar, la lista se vuelve a pedir en la misma página (`buscarPedidoAdmin(false)`).
- [ ] "¿Dejó solo una parte?" en Liquidar abre el detalle del pedido.
- [ ] A 360 px el formulario cabe sin mover la página de lado y queda encima del chat flotante (z-index 12000) y debajo de los avisos.

### 2026-10-06 — Detalle del pedido en celular
**Dónde:** `detalle-pedido.component.scss` (`@media (max-width: 575px)`), `DetallePedidoComponent.abrirBuscadorArticulo()`, `grupo-pedido.component.scss` (`.gp__tabla--miembros`)
**Tipo:** e2e (Playwright con viewport 320 y 360) + unitario para el scroll
**Debe comprobar:**
- [ ] A 320 y 360 px, `document.documentElement.scrollWidth` = ancho de la ventana en el detalle, con el formulario de abono, el de forma de cobro y el buscador abiertos.
- [ ] Tabla del grupo a 360 px: se ven número, cliente, estado y total de cada pedido sin deslizar de lado (sin encabezado de tabla).
- [ ] Resultado del buscador a 360 px: el nombre completo se ve (no "B."); precio, "Otro precio" y "Elegir" quedan abajo de los datos sin encimarse.
- [ ] Al tocar "➕ Agregar artículo" o "⇄", el campo del buscador queda en pantalla y con el cursor puesto.
- [ ] A 1280 px el detalle y la tabla del grupo se ven igual que antes (tabla con encabezado).

### 2026-10-06 — Card de un pedido unido muestra el estado del grupo
**Dónde:** `MisPedidosComponent.estadoBadge()` y `esperaEntrega()` (vía `textoEntrega()` / `diasAtraso()`)
**Tipo:** unitario del componente
**Debe comprobar:**
- [ ] Titular de grupo de Ir pagando con `saldoGrupo` 100 y estado propio `PAGADO` → "Por cobrar".
- [ ] Mismo grupo con `saldoGrupo` 0 → "Pagado". Grupo de contado con saldo → "Pendiente"; sin saldo → "Entregado".
- [ ] `totalGrupo` 0 (todos cancelados) → "Cancelado".
- [ ] Card de un miembro abierto por número (`esTitular=false`) → usa su propio estado, como antes.
- [ ] `textoEntrega()` del titular pagado con `saldoGrupo` > 0 y fecha → devuelve el texto; con `saldoGrupo` 0 → `null`.
- [ ] Pedido sin grupo → mismo resultado que antes en los 5 estados.

### 2026-10-06 — Buscador de Mis pedidos: flechas/Tab no vuelven a buscar
**Dónde:** `MisPedidosComponent.prepararBusquedaAdmin()` / `ultimoTextoAdmin`
**Tipo:** unitario con `fakeAsync`
**Debe comprobar:**
- [ ] Escribir "maria", esperar 400 ms → 1 llamada a `buscarPedidosAdmin`.
- [ ] Estando en la página 2, un keyup sin cambiar el texto → 0 llamadas nuevas y `page` sigue en 1 (página 2).
- [ ] Cambiar a "marian" → 1 llamada nueva con página 0.
- [ ] `abrirOtroPedido(905)` y luego escribir el mismo texto que había antes → sí busca (el último texto ya era "905").

### 2026-10-06 — Datos del cliente escapados en los avisos
**Dónde:** `MisPedidosComponent.escaparHtml()` (modal Entrega, Reenviar ticket) · `escaparHtml()` en `detalle-pedido.component.ts`
**Tipo:** unitario
**Debe comprobar:**
- [ ] `Ana "La Güera" López` → `Ana &quot;La Güera&quot; López`, y en el modal el input muestra el texto completo.
- [ ] `<img src=x onerror=alert(1)>` → se ve como texto, no se crea ningún `<img>` dentro del aviso.
- [ ] `null` / `undefined` → `''`.

### 2026-10-06 — Botón "−" manda la línea exacta
**Dónde:** `PedidosService.eliminarDetalle(pedidoId, productoId, detalleId?, cantidad)` · `DetallePedidoComponent.reducirCantidad()`
**Tipo:** unitario del servicio (HttpTestingController) + componente
**Debe comprobar:**
- [ ] Con `detalleId` 11 → URL `.../detalle/{productoId}?cantidad=1&detalleId=11`.
- [ ] Sin `detalleId` → URL sin `detalleId` (como antes).
- [ ] `reducirCantidad(item)` manda `item.id` como `detalleId`.

### 2026-10-06 — ⇄ con varias piezas pregunta cuántas (R10)
**Dónde:** `DetallePedidoComponent.elegirArticulo()` / `guardarArticulo()` / `reintentarCambio()`
**Tipo:** unitario del componente (Swal simulado) + e2e
**Debe comprobar:**
- [ ] Línea con 1 pieza → no pregunta; manda `cantidad: 1`.
- [ ] Línea con 3 piezas → pregunta; el validador rechaza 0, 4 y 1.5; con 2 manda `cantidad: 2`.
- [ ] Línea de promoción con 2 piezas → no pregunta; manda `cantidad: 2`.
- [ ] Cancelar la pregunta → no hay llamada al back.
- [ ] Respuesta 409 (combo) → `reintentarCambio` manda la misma `cantidad` elegida y el `modo`.
- [ ] Mensaje de éxito "Se cambiaron 1 pieza(s); quedan 2 del artículo de antes." solo cuando quedan piezas.

---

## Tests existentes que quedaron viejos

| Test | Desde | Por qué falla |
|---|---|---|
| — | — | — |
