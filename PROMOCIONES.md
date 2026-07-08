# Promociones por variante (combos) — diseño

> ✅ **Back implementado en `dev` el 2026-07-05** (commit `fda094b`): entidades `Promocion`/
> `PromocionDetalle`, repositorio, service, controller y migración SQL.
>
> ✅ **Front implementado en `qa` el 2026-07-05** (commit en rama `qa`):
> - Módulo lazy `/promociones` (`PromocionesModule`) — catálogo de combos activos con countdown, modal detalle, carrito
> - Componente `/admin/promociones` (`GestionPromocionesComponent`) — crear/editar promos + toggle activo/inactivo
> - `CarritoVarianteService` extendido con `promos$` in-memory (sin localStorage, precios de promo pueden vencer)
> - Flujos de carrito y venta directa actualizados: si hay promos → `tipoPedido = NORMAL` forzado, crédito bloqueado
> - Link "🎁 Promociones" en sidebar para todos los logueados; "🎁 Gestión Promociones" en accordion Admin
> - **Importante:** la `cantidad` de cada línea con `promocionId` DEBE ser el número real de piezas, no puede ser `null` — el back valida `cantidad % detalle.getCantidad() == 0` para permitir múltiplos (ej. 2 combos)
>
> ⏳ **Pendiente para cerrar:** correr `migration_promociones.sql` en QA y hacer pruebas end-to-end
> (back en dev, migración pendiente). Una vez confirmado en QA, documentar contrato final en `CAMBIOS_FRONT.md`.
> Ver "Preguntas frecuentes" al final de este documento para bugs encontrados en pruebas de 2026-07-06.

## Qué es una promoción aquí

No es "una variante con precio de descuento" (idea original, descartada). Es un **combo**: se
eligen 1, 2, 3 o más variantes que ya existen de forma independiente (pueden ser completamente
distintas entre sí — ej. un jean + una blusa) y se venden juntas bajo la misma promoción. Al
agregarse al carrito/venta, se agrega como **una sola línea de "promoción"** desde el punto de
vista visual, aunque internamente cada pieza mantiene su propio precio (ver decisión de precio).

## Decisiones confirmadas con el usuario (2026-07-05)

1. Lleva fecha/hora de vencimiento (no solo fecha — puede vencer "hoy a las 6pm").
2. Si el stock de **cualquiera** de las variantes que componen la promo se agota, la promoción deja
   de estar disponible (aunque las otras variantes de esa misma promo sí tengan stock).
3. Una variante puede repetirse en varias promociones activas a la vez, pero la cantidad de veces
   que se puede vender una promoción está limitada por el stock disponible de sus variantes.
4. Un ADMIN puede editar una promoción ya creada (variantes, precios, fecha) — no hay que crear una
   nueva si algo cambia.
5. Visibilidad solo para usuarios logueados.
6. Sin límite artificial de cuántos combos lleva un cliente en un pedido — el límite natural ya es
   la disponibilidad calculada por stock.
8. **Solo venta de contado** — una promoción NO se puede apartar (APARTADO) ni dar a crédito
   (FIADO). Si el carrito trae al menos una promoción, **todo el pedido se fuerza a
   `tipoPedido = NORMAL`** (contado), incluidos los productos normales que traiga ese mismo
   pedido — no se permite apartar nada de ese pedido, aunque los productos normales por sí solos
   sí calificarían para apartado. Motivo: las promociones no reservan stock (ver sección
   "Disponibilidad" más abajo) — permitir crédito dejaría al cliente "pagando" un combo que puede
   vencerse o quedarse sin stock antes de terminar de pagarlo. Los métodos de pago en sí (efectivo,
   tarjeta, transferencia) no cambian, solo se bloquea la modalidad de pago diferido.
9. **Precio: Opción B** — cada variante dentro del combo tiene su propio precio rebajado, no un
   precio único para todo el paquete. Ejemplo: Jean normal $300 → en promo $220; Blusa normal $200
   → en promo $130; el cliente paga $350 en total, pero el sistema registra cada pieza por
   separado a su precio de oferta — igual que una venta normal, solo que a precio distinto. Así el
   cálculo de ganancia y los reportes de venta por producto **no requieren ningún cambio**.

## Flujo de selección y venta en el front (UX)

1. **Catálogo:** la promoción aparece como una tarjeta especial, distinta a un producto normal —
   badge "PROMOCIÓN", countdown de vencimiento (calculado en el front desde `fechaVencimiento`),
   precio total tachado (suma de precios normales de sus piezas) vs precio promo total, preview de
   las piezas incluidas.
2. **Al seleccionarla:** se abre el detalle mostrando las piezas **fijas** (variante + talla +
   color + precio normal tachado + precio promo) — el cliente **no elige nada** (talla/color ya
   quedaron definidos cuando el admin armó la promo), a diferencia de una variante normal. Solo
   hay un selector de "cuántos combos llevar" (1 hasta `instanciasDisponibles`) y el botón
   "Agregar al carrito".
3. **Al agregarla al carrito:** entra como una sola tarjeta agrupada (ver punto 6 del contrato más
   abajo), no como piezas sueltas — el cliente ve "Combo Jean + Blusa — $350" con las piezas
   debajo, no 2 productos separados.
4. **Checkout — solo contado:** si el carrito tiene al menos una promoción, el front debe
   deshabilitar/ocultar la opción de "Apartar" o "Fiado" para **todo el pedido**, aunque también
   traiga productos normales que por sí solos sí calificarían para crédito — se fuerza
   `tipoPedido = NORMAL` completo. Mostrar un aviso claro (ej. *"Este pedido incluye una
   promoción, se debe pagar completo"*). Los métodos de pago (efectivo/tarjeta/transferencia) no
   cambian.
5. **Venta directa (mostrador):** mismo criterio — si el vendedor agrega una promoción al ticket,
   la UI del POS debe bloquear las opciones de apartado/fiado para ese ticket completo.

### Navegación / rutas (definido con el front, 2026-07-05)

- **Admin (crear/gestionar promos):** sidebar → accordion "Admin" → "🎁 Gestión Promociones" →
  `/admin/promociones` → botón "+ Nueva promoción" abre el formulario (buscar variantes, definir
  precio y fecha de vencimiento) → guardar. Guard de ruta: **ADMIN** (coincide con
  `hasRole("ADMIN")` en `POST/PUT /v1/promociones/**`).
- **Catálogo (ver y agregar al carrito):** sidebar → "🎁 Promociones" (visible para cualquier
  logueado) → `/promociones` → cards con los combos → botón "🛒 Agregar". Guard de ruta:
  **autenticado**, no público, no exclusivo de ADMIN (coincide con `authenticated()` en
  `GET /v1/promociones/activas`).
- **Checkout:** el carrito unificado muestra promociones junto a variantes normales; el cliente
  genera pedido o el admin cobra en venta directa, con la restricción de solo-contado ya descrita.
- **Descubribilidad:** se agrega un banner fijo arriba del buscador en `/variantes/buscar` que
  invite a `/promociones` — sin esto, un usuario que no revisa el sidebar nunca se entera de que
  existen promociones activas.

### Pendiente de definir con el front (no bloquea el backend, sí el armado de las pantallas)

1. **¿El botón "🛒 Agregar" en `/promociones` agrega 1 combo directo, o abre primero el detalle
   con el selector de cantidad (punto 2 arriba)?** Si es directo, "llevar 2 combos" sería repetir
   el clic (el carrito ya acumula cantidad) — funcionalmente equivalente, solo hay que decidir cuál.
2. **Estado agotado:** cuando `instanciasDisponibles = 0`, ¿la card se sigue mostrando con el
   botón deshabilitado, o se oculta del listado? (La recomendación es mostrarla deshabilitada —
   así el cliente ve que existió/existirá la promo en vez de que desaparezca sin explicación.)
3. **Estado vacío:** si no hay ninguna promoción activa, ¿`/promociones` muestra un mensaje tipo
   "no hay promociones por ahora" o queda en blanco?

## Modelo de datos — 2 tablas nuevas

### `promocion` (cabecera)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | PK | |
| `descripcion` | VARCHAR | Ej. "Combo Jean + Blusa" |
| `fecha_vencimiento` | DATETIME | Fecha **y hora** — permite "vence hoy a las 6pm" |
| `activo` | TINYINT(1) | Apagado manual por el admin, independiente del vencimiento |

### `promocion_detalle` (una fila por cada variante que compone la promo)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | PK | |
| `promocion_id` | FK → `promocion` | |
| `variante_id` | FK → `variantes` | |
| `cantidad` | INT, default 1 | Unidades de esa variante que consume **una** venta de la promo |
| `precio_en_promocion` | DECIMAL(10,2) | Precio rebajado de esa pieza específica dentro del combo |

Mismo patrón cabecera-detalle que ya usas en pedidos (`Pedido` → `PedidoDetalle`).

### DDL

```sql
CREATE TABLE promocion (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    descripcion       VARCHAR(255) NOT NULL,
    fecha_vencimiento DATETIME NOT NULL,
    activo            TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE promocion_detalle (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    promocion_id         BIGINT NOT NULL,
    variante_id          INT NOT NULL,
    cantidad             INT NOT NULL DEFAULT 1,
    precio_en_promocion  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (promocion_id) REFERENCES promocion(id) ON DELETE CASCADE,
    FOREIGN KEY (variante_id) REFERENCES variantes(id)
);
```

---

## Disponibilidad — sin stock aparte para la promoción

No se necesita un contador de stock independiente. Se calcula al vuelo, cada vez que se consulta:

```
disponible = activo == true
             AND ahora <= fecha_vencimiento
             AND MIN( sobre cada detalle: piso(variante.stock / detalle.cantidad) ) > 0

instanciasDisponibles = MIN( sobre cada detalle: piso(variante.stock / detalle.cantidad) )
```

Ejemplo: promo de 3 artículos, cantidad=1 cada uno; si las 3 variantes tienen stock ≥ 2, entonces
`instanciasDisponibles = 2` — el sistema no deja llevar una tercera.

**Por qué no reservar/descontar stock al solo mostrar la promo:** el stock de las variantes nunca
se toca hasta que hay una venta REAL (igual que con las variantes sueltas hoy). Si la promo vence
sin venderse, no hay nada que "regresar" porque nunca se le quitó nada al stock.

## Stock compartido — la variante se puede seguir vendiendo suelta

Como no hay stock reservado aparte para la promoción, una variante que forma parte de una promo
activa **se puede seguir vendiendo de forma independiente, a su precio normal, al mismo tiempo** —
quien compre primero (por la promo o suelta) consume ese stock compartido.

**Liberar stock si se cancela:** ya existe este comportamiento hoy para pedidos normales —
`PedidoServiceImpl` regresa el stock de las variantes cuando se cancela un pedido ya creado. Para
promociones aplica igual: si un pedido con una línea de promoción se cancela, se regresa el stock
de cada variante de esa promoción según su `cantidad` — es extender la lógica de cancelación ya
existente, no una lógica nueva.

## Vencimiento — sin job/scheduler necesario

Filtrar por `fecha_vencimiento` directamente en la consulta que lista promociones activas
(`WHERE activo = 1 AND fecha_vencimiento > NOW()`). Una promoción vencida deja de aparecer en el
próximo query, sin tocar la fila en BD ni necesitar un cron job. `activo` queda aparte para que el
admin la pueda apagar manualmente antes de que venza si quiere.

## El countdown en el front — no requiere nada especial del back

El back solo expone `fechaVencimiento`. El countdown visual es cálculo del front en JS comparando
esa fecha contra la hora actual del navegador.

---

## Contrato para el front

### 1. Crear promoción (ADMIN)

```
POST /v1/promociones
Authorization: Bearer {token ADMIN}
Content-Type: application/json

{
  "descripcion": "Combo Jean + Blusa",
  "fechaVencimiento": "2026-07-05T18:00:00",
  "detalles": [
    { "varianteId": 12, "cantidad": 1, "precioEnPromocion": 220.00 },
    { "varianteId": 45, "cantidad": 1, "precioEnPromocion": 130.00 }
  ]
}
```

**Response 200:**
```json
{ "data": { "id": 7, "descripcion": "Combo Jean + Blusa", "fechaVencimiento": "2026-07-05T18:00:00", "activo": true } }
```

**Response 400:** `"La promocion debe incluir al menos una variante"`, `"La variante {id} no existe"`.

### 2. Editar promoción (ADMIN)

```
PUT /v1/promociones/{id}
```
Mismo body que crear. Reemplaza los `detalles` existentes por los que se manden (no hace merge
parcial — si quitaste una variante de la lista, se elimina de la promo).

### 3. Activar/desactivar (ADMIN)

```
PUT /v1/promociones/{id}/activo
Body: { "activo": false }
```

### 4. Listar promociones — panel admin (todas, incluidas vencidas/inactivas)

```
GET /v1/promociones/admin?pagina=1&size=10
```

### 5. Listar promociones activas — catálogo del cliente (requiere login)

```
GET /v1/promociones/activas?pagina=1&size=10
Authorization: Bearer {token de cualquier usuario logueado}
```

**Response 200:**
```json
{
  "data": {
    "pagina": 1,
    "totalPaginas": 1,
    "t": [
      {
        "id": 7,
        "descripcion": "Combo Jean + Blusa",
        "fechaVencimiento": "2026-07-05T18:00:00",
        "instanciasDisponibles": 2,
        "detalles": [
          { "varianteId": 12, "nombreProducto": "Jean Slim", "talla": "M", "color": "Azul", "precioNormal": 300.00, "precioEnPromocion": 220.00, "imagenUrl": "..." },
          { "varianteId": 45, "nombreProducto": "Blusa Casual", "talla": "S", "color": "Blanco", "precioNormal": 200.00, "precioEnPromocion": 130.00, "imagenUrl": "..." }
        ]
      }
    ]
  }
}
```
`instanciasDisponibles` ya viene calculado — úsalo para deshabilitar el botón "agregar" si es 0, y
para el countdown usa `fechaVencimiento` directamente.

### 6. Carrito (front, sin llamada al back)

El carrito sigue siendo 100% del front, igual que hoy — no hay endpoint de "agregar al carrito".
Cuando el cliente agrega una promoción, el front la guarda localmente como una sola tarjeta visual,
pero por dentro puede quedarse con el desglose que ya recibió en el punto 5 (`detalles` de la
promoción) para saber qué mandar al confirmar. Sugerido (estructura libre, es solo front):
```js
{
  tipo: 'promocion',
  promocionId: 7,
  descripcion: 'Combo Jean + Blusa',
  cantidadCombos: 1,       // cuántas veces se lleva el combo completo
  precioTotal: 350.00,     // suma de precioEnPromocion de sus piezas, solo para mostrar
  detalles: [ /* lo que vino en el punto 5 */ ]
}
```

### 7. Cómo se cobra — clave: cada pieza de la promo viaja como una línea normal, solo con el precio de oferta

Como la Opción B le pone precio a cada variante por separado, **no hace falta un concepto nuevo de
"detalle de promoción" en el pedido/venta** — cada pieza de la promo se manda exactamente como ya
mandas hoy una variante normal, solo que con `precioUnitario`/`precioVenta` = el precio de oferta,
y se le agrega un campo nuevo `promocionId` para que el back sepa que esa línea pertenece a un
combo (y pueda validar/agrupar/reportar).

**`POST /pedidos/savePedido`** — el objeto de cada detalle (`DetallePedidosDTOPedido`) gana un
campo opcional:
```json
{
  ...
  "detalles": [
    { "varianteId": 12, "cantidad": 1, "precioUnitario": 220.00, "subTotal": 220.00, "promocionId": 7 },
    { "varianteId": 45, "cantidad": 1, "precioUnitario": 130.00, "subTotal": 130.00, "promocionId": 7 },
    { "varianteId": 99, "cantidad": 2, "precioUnitario": 350.00, "subTotal": 700.00 }
  ]
}
```
La tercera línea es un ejemplo de variante normal (sin promo) en el mismo pedido, para que se vea
que conviven sin problema. Si el cliente lleva 2 combos, se duplica `cantidad` en cada línea de ese
`promocionId` (ej. `cantidad: 2` en ambas líneas del combo) — no se manda dos veces la línea.

**Venta directa (`VentaDirectaRequest.detalles`, tipo `DetalleVentaDto`)** — mismo campo nuevo:
```json
{ "varianteId": 12, "cantidad": 1, "precioVenta": 220.00, "subTotal": 220.00, "promocionId": 7 }
```

**Validación del back al confirmar (pedido o venta):** por cada `promocionId` presente, agrupa las
líneas que lo comparten y verifica: la promo sigue `activo` y no venció, el conjunto de
`varianteId`+`precioUnitario` mandado coincide exactamente con lo definido en `promocion_detalle`
(evita que el front mande cualquier precio con el pretexto de ser promo), y hay `instanciasDisponibles`
suficientes para la cantidad pedida. **Además, si hay alguna línea con `promocionId` y
`tipoPedido` no es `NORMAL`/nulo (es `APARTADO` o `FIADO`), rechaza todo el pedido/venta con `400`
y mensaje `"Las promociones solo se pueden comprar de contado, no se pueden apartar ni dar a
credito"`** — el front debería evitar llegar a este caso deshabilitando la opción en el checkout
(punto 4 del flujo UX arriba), pero el back valida igual por seguridad. Si algo no cuadra, responde
`400` con `"La promocion '{descripcion}' ya no esta disponible"` y no crea el pedido/venta — el
front debe
quitarla del carrito y avisar al cliente.

### 8. Cómo se ve ya en el pedido confirmado / detalle de pedido

`GET /pedidos/findPedido/{id}` (`DetalleItemResponse`, dentro de `PedidoDetalleResponse.detalles`)
gana los mismos campos, para que el front pueda agrupar visualmente las líneas del mismo combo:
```json
{ "id": 501, "varianteId": 12, "productoNombre": "Jean Slim", "talla": "M", "color": "Azul",
  "cantidad": 1, "precioUnitario": 220.00, "subTotal": 220.00,
  "promocionId": 7, "promocionDescripcion": "Combo Jean + Blusa" }
```
`promocionId`/`promocionDescripcion` vienen `null` en líneas normales (el DTO ya omite nulls). El
front agrupa por `promocionId` para mostrar "Combo Jean + Blusa — $350.00" con sus piezas debajo,
en vez de 2 líneas sueltas sin relación visible.

### 9. Ticket / comprobante

Mismo criterio que el punto 8 — agrupar por `promocionId` al armar el ticket (ya documentado en
`CAMBIOS_FRONT.md`, sección "Ticket / Comprobante"). No cambia el formato del ticket en sí, solo
cómo se agrupan visualmente las líneas que comparten `promocionId`.

### 10. Cancelación

Sin cambios de contrato para el front — se cancela el pedido completo igual que hoy
(`DELETE /pedidos/delete/{id}` o el endpoint de cancelación que ya uses). El back internamente
regresa el stock de cada variante de las líneas con `promocionId`, igual que ya hace con las
líneas normales — es transparente para el front.

---

## Pantalla de armado de la promoción (admin) — flujo sugerido para el front

1. Buscar variantes existentes — reutiliza `GET /variantes/buscar`, no hace falta endpoint nuevo.
2. Seleccionar N variantes (selector izquierda/derecha).
3. Por cada variante seleccionada: capturar `cantidad` (default 1) y `precioEnPromocion`.
4. Capturar `descripcion` y `fechaVencimiento` de la promoción completa.
5. Guardar → `POST /v1/promociones` (o `PUT` si es edición).

## Pendiente al implementar (detalles técnicos, no de negocio)

Gracias a la Opción B, la integración con pedidos/ventas es más simple de lo que parece: cada
pieza de una promo ya es una variante real con su propio precio, así que **no hace falta duplicar
la lógica de ventas** — solo "etiquetar" las líneas que pertenecen a una promo.

- Entidad `Promocion` + `PromocionDetalle`, repositorios, service, controller — CRUD nuevo,
  parecido al resto del proyecto (probablemente con métodos propios por la lógica de
  disponibilidad calculada, no un `AbstractController` genérico).
- Agregar columna nullable `promocion_id` (FK) a `detalle_pedidos` y a `detalle_venta` — sin tocar
  el resto de esas tablas.
- Agregar campo opcional `promocionId` a `DetallePedidosDTOPedido` y a `DetalleVentaDto` (request),
  y a `DetalleItemResponse` (response de pedido) — más `promocionDescripcion` en el response para
  que el front no tenga que ir a buscarla aparte.
- En `PedidoServiceImpl.savePedido()` y `VentaServiceImpl` (guardado): antes de persistir, si hay
  líneas con `promocionId`, agruparlas y correr la validación descrita en el punto 7 (activo, no
  vencida, precios coinciden con `promocion_detalle`, stock suficiente) — si falla, rechazar todo
  el pedido/venta con `400`, no solo esa línea.
- Cancelación: **no requiere cambio** — ya itera sobre `detalles`/`variante` para regresar stock,
  sin importar si la línea tiene `promocion_id` o no.
- Ganancia y reportes: **no requieren cambio** — cada línea ya trae su propio `precioCosto`/
  `ganancia` calculado igual que cualquier venta normal.
- Migración `migration_promociones.sql` con el DDL de las 2 tablas nuevas + los 2 `ALTER TABLE`
  para las columnas `promocion_id` nullable.
- Documentar el contrato final (una vez probado) en `CAMBIOS_FRONT.md`, siguiendo el checklist de
  `CLAUDE.md`.

---

## Preguntas frecuentes (resueltas, 2026-07-05)

### 1. ¿`GET /v1/promociones/admin` devuelve las variantes de la promoción?

Sí, pero solo desde el fix de hoy. `PromocionResponseDto` (usado por `crear`, `editar` y
`listarAdmin`) no traía el campo `detalles` — el panel admin nunca recibía las variantes de
ninguna promoción (vencida o no) y por eso al editar tocaba volver a agregarlas manualmente. Se
agregó `PromocionDetalleResponseDto` (varianteId, nombreProducto, talla, color, cantidad,
precioEnPromocion, imagenUrl) como campo `detalles` en `PromocionResponseDto`. Ya viene poblado en
`POST /v1/promociones`, `PUT /v1/promociones/{id}` y `GET /v1/promociones/admin`.

### 2. ¿Una promoción vencida se puede seguir editando (por ejemplo, para extenderle la fecha)?

Sí, sin restricción. `PromocionServiceImpl.editar()` no valida vigencia antes de permitir el
update — solo reemplaza `descripcion`/`fechaVencimiento`/`detalles` y guarda. Extender la
`fechaVencimiento` a futuro la vuelve a hacer aparecer en `GET /v1/promociones/activas`
inmediatamente (ese endpoint filtra `activo=1 AND fechaVencimiento > NOW()` en cada consulta).

### 3. ¿Al vencer una promoción se regresa el stock a las variantes? ¿Al reactivarla se vuelve a apartar?

Ninguna de las dos cosas ocurre, porque nunca hay nada reservado. `instanciasDisponibles` es un
cálculo al vuelo (`stock de la variante / cantidad`, ver `calcularInstanciasDisponibles()`), no un
contador guardado en BD. El stock de las variantes solo se mueve cuando hay una venta/pedido real
confirmado — vencer, apagar o reactivar una promoción no toca el stock para nada.

### 4. Si 2 promociones comparten variantes con poco stock, y se venden por separado (sueltas o cada promo a distintos clientes), ¿el sistema bloquea la venta cuando ya no alcanza el stock?

Sí. No hay validación "al agregar al carrito" porque el carrito es 100% del front (no existe
endpoint de agregar al carrito) — la única validación real ocurre al confirmar
`POST /pedidos/savePedido` o la venta directa. Ahí, **cada línea del pedido (sea de una promoción o
suelta) pasa por el mismo chequeo de stock en tiempo real**
(`PedidoServiceImpl.savePedido()`, `variante.getStock() < cantidad` → `RuntimeException "Stock
insuficiente..."`), usando `findByIdWithLock` (lock pesimista) para serializar transacciones
concurrentes sobre la misma variante. Es decir: aunque las 2 promociones sigan apareciendo como
`activo=true` y sin vencer, si su stock compartido ya se agotó (por ventas sueltas, por la otra
promo, o por varios clientes comprando la misma promo en paralelo), la venta se rechaza en el
momento de confirmar — el sistema no vende de más. `instanciasDisponibles` que ve el front es solo
una estimación para deshabilitar el botón preventivamente (UX); la fuente de verdad y el bloqueo
real están en el guardado del pedido/venta.

### 5. Bug real encontrado en QA (2026-07-06): `POST /v1/ventas/save` con línea de promoción daba 500

**No era un bug de promociones en sí** — el request de prueba mandaba `"cantidad": null` en las
líneas con `promocionId`, y ni `VentaServiceImpl` ni `PedidoServiceImpl` validaban que `cantidad`
no fuera nula antes de usarla en comparaciones numéricas (`variante.getStock() < cantidad`), lo
que tronaba con `NullPointerException` sin control.

**El front debe mandar `cantidad` con el número real de piezas en cada línea, incluidas las de
promoción** — no puede ir `null` (aunque la "cantidad" de una promo esté implícita en el combo, el
backend valida `cantidad % detalle.getCantidad() == 0` para permitir múltiplos, ej. llevar 2
combos, así que necesita el número real, no nulo).

**De paso se encontró y arregló algo más importante:** el manejador global de excepciones no tenía
caso para `RuntimeException` simple — así están escritas casi todas las validaciones de negocio de
promociones (`"La promocion ya no esta disponible"`, `"Las promociones solo se pueden comprar de
contado..."`, etc.), así que **todas esas validaciones devolvían siempre `500` con el mensaje
genérico**, ocultando el motivo real. Ya se corrigió — ahora esas validaciones devuelven `400` con
el mensaje específico. Detalle completo en `CAMBIOS_FRONT.md` → "Cambio de comportamiento
(2026-07-06): errores de validación ya NO regresan 500".

