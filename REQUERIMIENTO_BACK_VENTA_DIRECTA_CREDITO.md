# REQUERIMIENTO BACK — VENTA DIRECTA CON CRÉDITO (APARTADO / IR PAGANDO)

**Fecha:** 2026-06-28
**Módulo afectado:** Venta directa + Abonos
**Prioridad:** Alta

---

## Contexto

Actualmente existen dos flujos de venta para variantes:

1. **`POST /v1/ventas/save`** — usado en venta directa. Crea el pedido Y la venta en un solo shot. El cliente paga en el momento (efectivo, tarjeta, meses). ✅ Funciona bien.

2. **`POST /v1/pedidos/savePedido`** — usado desde el carrito web. Crea solo el pedido en estado "pendiente", sin venta. El cliente lo recoge después. ✅ Funciona bien. Ya soporta `tipoPedido: APARTADO | FIADO`.

---

## El problema

Cuando el admin atiende a un cliente que está físicamente en el local y ese cliente quiere pagar en parcialidades (APARTADO o IR PAGANDO), el flujo debe ser:

- Admin usa la **venta directa** (busca variantes, las agrega)
- Selecciona forma de pago: **APARTADO** o **IR PAGANDO**
- El pedido queda registrado pero **NO cerrado como venta** — queda pendiente de abonos
- Desde `/abonos` el admin va registrando los pagos parciales hasta liquidar

Hoy eso **no es posible** porque `POST /v1/ventas/save` no tiene soporte para `tipoPedido` y siempre cierra la venta de inmediato.

---

## Flujos completos (lo que necesita el front)

### Flujo 1 — Venta inmediata (sin cambios en back)
```
Admin en venta directa
  → agrega variantes
  → selecciona EFECTIVO o TARJETA (con o sin meses)
  → POST /v1/ventas/save   ← igual que hoy, no cambia
  → pedido + venta cerrados en un shot ✅
```

### Flujo 2 — Crédito desde venta directa (NUEVO — requiere cambio en back)
```
Admin en venta directa
  → agrega variantes
  → selecciona APARTADO o IR PAGANDO
  → POST /v1/ventas/save con tipoPedido  ← cambio implementado
  → pedido queda con estado APARTADO o FIADO
  → admin va a /abonos y registra pagos parciales
  → cuando saldo = 0 → pedido se cierra como PAGADO automáticamente
```

### Flujo 3 — Admin desde catálogo (solo front, sin cambio en back)
```
Admin navega catálogo /variantes/buscar
  → agrega variantes al carrito
  → va al carrito
  → el front detecta que es admin
  → redirige a venta directa con los artículos ya pre-cargados
  → sigue el Flujo 1 o Flujo 2 según lo que seleccione
```
> Este flujo 3 es un cambio solo de front — redirigir al admin a venta directa en vez
> de generar un pedido normal. No requiere cambio de back.

---

## Preguntas para el backend

### Pregunta 1 (la más importante)
¿El endpoint `POST /v1/ventas/save` puede recibir un campo adicional `tipoPedido: 'APARTADO' | 'FIADO'` para que cuando se envíe ese valor:
- **NO** cierre la venta de inmediato
- Cree el pedido con `estadoPedido = 'APARTADO'` o `estadoPedido = 'FIADO'`
- Devuelva el `pedidoId` para que el front redirija a `/abonos`

Si sí puede → el front solo necesita agregar ese campo al request y manejar la respuesta diferente.

### Pregunta 2 (alternativa)
Si no es viable modificar `POST /v1/ventas/save`, ¿`POST /v1/pedidos/savePedido` puede recibir el mismo formato de detalles que ya recibe venta directa?

Es decir, ¿puede aceptar algo como esto?

```json
{
  "cliente": { "id": 123 },
  "tipoPedido": "APARTADO",
  "estadoPedido": "APARTADO",
  "fechaPedido": "2026-06-28",
  "observaciones": "",
  "detalles": [
    {
      "producto": { "id": 5 },
      "varianteId": 42,
      "cantidad": 2,
      "precioUnitario": 350.00,
      "subTotal": 700.00
    }
  ]
}
```

> Esto ya es casi idéntico a lo que `/savePedido` recibe hoy — solo necesitaría confirmar
> que `varianteId` en el detalle es suficiente para que el back descuente el stock
> de la variante correctamente (igual que lo hace venta directa).

### Pregunta 3
Cuando un pedido APARTADO o FIADO se liquida completamente desde `/abonos` (saldo = 0),
¿el backend cambia automáticamente el `estadoPedido` a "Pagado" o "Completado"?
¿O el front necesita llamar a algún endpoint adicional para cerrarlo?

---

## Resumen de lo que necesita el back

| Cambio | Endpoint | Tipo |
|---|---|---|
| Soporte para `tipoPedido: APARTADO/FIADO` en venta directa | `POST /v1/ventas/save` ó `POST /v1/pedidos/savePedido` | **Nuevo campo o confirmación** |
| Confirmar que al liquidar en `/abonos` el pedido cierra solo | `POST /v1/abonos/{pedidoId}` | **Confirmación de comportamiento** |

---

## Lo que el front implementará (una vez confirmado el back)

1. **Carrito → venta directa para admin**: cuando el admin está en el carrito de variantes, el botón de pago redirige a venta directa con los artículos ya cargados en vez de generar un pedido normal.

2. **Nuevas opciones en venta directa**: agregar APARTADO e IR PAGANDO al selector de forma de pago (junto a efectivo/tarjeta que ya existen).

3. **Post-venta crédito**: cuando se confirma APARTADO o IR PAGANDO, mostrar Swal con acceso directo a `/abonos` para empezar a registrar pagos.

---

## ✅ RESUELTO — 2026-06-29

### Respuestas

**Pregunta 1 — SÍ.** Se modificó `POST /v1/ventas/save`. Si el request incluye `tipoPedido: "APARTADO"` o `"FIADO"`, el back crea solo el Pedido (sin Venta), descuenta el stock, y devuelve `pedidoId` en el response. Si `tipoPedido` es `null` o `"NORMAL"`, el comportamiento es exactamente igual al actual.

**Pregunta 2 — No fue necesaria.** La Pregunta 1 es viable y más limpia porque ya tiene toda la lógica de stock y cliente dentro de `VentaServiceImpl`.

**Pregunta 3 — Auto-cierre ya implementado.** Cuando `totalPagado >= totalPedido`, el back cambia `estadoPedido = "PAGADO"` automáticamente en el mismo `@Transactional` de `AbonoServiceImpl.registrarAbono`. El front no necesita llamar a ningún endpoint adicional.

### Archivos modificados en el back

| Archivo | Cambio |
|---|---|
| `VentaDirectaRequest.java` | +`tipoPedido: String`, +`observaciones: String` |
| `VentaDirectaResponse.java` | +`pedidoId: Integer` (null en venta normal, con valor en crédito) |
| `VentaServiceImpl.java` | Bifurcación: si `APARTADO`/`FIADO` → solo Pedido + devuelve `pedidoId`; si no → flujo normal sin cambios |

### Cómo distingue el front la respuesta

```
response.pedidoId != null  →  crédito → redirigir a /abonos/{pedidoId}
response.ventaId != null   →  venta normal → flujo de siempre
```

### Documentación front
Ver `ABONOS_FRONT.md` sección 2b para el detalle completo: interfaces TypeScript, cambios en el formulario y manejo del response.
