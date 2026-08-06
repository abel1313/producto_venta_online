# Revisión de bugs de UI reportados en QA — 2026-08-01

> Lista tal cual la reportó el usuario en una sola sesión, ya separada por punto, con la causa
> raíz encontrada, si es 100% front o si necesita algo del back, y el estado (✅ ya corregido y
> subido a `dev`/`qa`, ⏳ documentado para el back, ❓ necesita una captura para diagnosticar).

## ✅ 1. Modal de "descartar" en Carga de imágenes sale morado

**Dónde:** `/carga-imagenes`, botón "✕" sobre una tarjeta → Swal de confirmación.

**Causa raíz:** SweetAlert2 trae su propio color morado por defecto para el botón de confirmar
(`#7066e0`, variable `--swal2-confirm-button-background-color`). El proyecto YA tenía overrides
completos de jade para el fondo/texto/inputs del popup (`styles.scss`), pero **nunca se había
tocado el color del botón de confirmar** — cualquier `Swal.fire()` que no mande
`confirmButtonColor` explícito (la mayoría de los del proyecto) salía morado.

**Alcance real:** no era solo Carga de imágenes — es un bug **global**, afecta a cualquier Swal
del proyecto sin color explícito. Incluye el modal "Info entrega" de `mis-pedidos` que también
reportaste morado — misma causa, mismo fix.

**Fix (100% front):** override global en `styles.scss` —
`--swal2-confirm-button-background-color: var(--app-accent)` + texto con
`var(--app-accent-ink)` (blanco en claro, oscuro en oscuro, mismo patrón ya usado para botones
sobre el acento). Los Swal que SÍ mandan color explícito (ej. "Cancelar pedido" en rojo) no se
ven afectados — ese valor sigue ganando porque se aplica inline.

**Estado:** ✅ corregido, `src/styles.scss`.

---

## ✅ 2. "Tomar foto" ilegible en Carga de imágenes

**Dónde:** `/carga-imagenes`, botón "📷 Tomar foto".

**Causa raíz:** mismo bug ya documentado en CLAUDE.md como "Bug 3.2" de la migración a paleta
jade (texto blanco fijo sobre el acento, que en modo oscuro es jade brillante `#00D97E` — texto
blanco ahí es casi ilegible) — pero ese fix nunca se aplicó a este componente en particular.
`.ci-btn` tenía `color: #fff` fijo en vez de la variable `--app-accent-ink` que ya existe para
esto.

**⚠️ Hallazgo colateral — no es solo este archivo:** al buscar el mismo patrón
(`background: var(--app-accent)` + `color: #fff`/`white` en el mismo bloque) aparecieron
**18 archivos más** con el mismo riesgo de contraste en modo oscuro:

```
abonos.component.scss, buscar-venta.component.scss, promociones.component.scss,
reportes.component.scss, favoritos.component.scss, chat-admin.component.scss,
presentacion-imagenes.component.scss, cambiar-password.component.scss,
update-variante.component.scss, agregar.component.scss (variantes),
venta-directa.component.scss, buscar.component.scss (variantes), all.component.scss (productos),
add.component.scss (productos), detalle-productos.component.scss,
agregar-rifa.component.scss, olvide-password.component.scss
```

**No se tocaron los 18** en esta pasada — cada uno hay que revisarlo con cuidado (no todo
`color:#fff` cercano a `background: var(--app-accent)` está necesariamente en el mismo botón).
Si quieres, la siguiente sesión hace el barrido completo — es mecánico pero hay que confirmar
cada caso.

**Fix aplicado (100% front):** `carga-imagenes.component.scss` → `.ci-btn` y
`.ci-btn--completar` usan `var(--app-accent-ink)`.

**Estado:** ✅ corregido el reportado. ⏳ pendiente el barrido de los otros 18 archivos.

---

## ✅ 3. `palabras-clave` sin paginación

**Dónde:** Inventario → Categorías (`/palabras-clave`).

**Causa raíz:** `getAll(page=0, size=100)` traía hasta 100 de un jalón, sin controles de
página — si hay más de 100 categorías, las de más allá simplemente no se ven, sin ningún aviso.

**Fix (100% front, sin backend nuevo):** el endpoint YA soporta `page`/`size` (es el mismo CRUD
genérico que ya se usó para "Lugares de entrega" el 24 de julio, con paginación real). Se clonó
exactamente ese patrón: `page`, `size=10`, `haySiguiente` (se infiere con `length === size`,
porque el CRUD genérico no devuelve total), botones "← Anterior" / "Siguiente →". Guardar y
eliminar ahora recargan la página actual en vez de parchear el arreglo local (con paginación
real un alta puede caer en otra página).

**Estado:** ✅ corregido — `gestion-palabras-clave.component.ts/html/scss`.

---

## ✅ 4. Modal "Info entrega" en `mis-pedidos` sale morado

Ver punto 1 — es el mismo bug global de SweetAlert2, ya corregido con el fix de `styles.scss`.
El modal en sí (`mostrarModalEntrega()`) ya tenía su propio `<style>` embebido para labels/
inputs con los colores correctos — solo le faltaba el color del botón de confirmar, que ahora
toma el fix global.

**Estado:** ✅ corregido (mismo fix del punto 1, sin tocar `mis-pedidos.component.ts`).

---

## ✅ 5. Inputs de precio/monto: hay que "atinarle" o borrar el 0 a mano

**Dónde:** "todos los montos que se tenga que poner precio o dinero o número" — venta directa,
abonos, gastos, precios de producto/variante, etc.

**Causa raíz:** al dar clic en un `<input type="number">` con un valor ya puesto (típicamente
`0`), el navegador solo posiciona el cursor donde se hizo clic — no selecciona el contenido. Para
reemplazar el valor hay que borrar a mano o dar doble-clic. Es el comportamiento nativo del
navegador, no algo que el proyecto haya roto — pero es mala UX para un sistema donde se captura
dinero todo el día.

**Fix (100% front, un solo cambio global):** en vez de tocar cada template de precio/monto uno
por uno (docenas de archivos), se agregó **un solo listener global** en `app.component.ts`
(`document.addEventListener('focusin', ...)`) que selecciona todo el contenido de cualquier
`input[type="number"]` de la app al enfocarlo — así el primer número que se teclea reemplaza el
valor completo, sin tener que borrar nada. Cubre venta directa, abonos, gastos, precios de
producto/variante y cualquier campo numérico nuevo que se agregue después, automáticamente.

**Estado:** ✅ corregido — `src/app/app.component.ts`.

---

## ✅ 6. Botón azul en `gastos/buscar`

**Dónde:** pantalla de Gastos (`gastos/all`), botón principal.

**Causa raíz:** `.ga-btn--primary` tenía un gradiente azul fijo (`#1e40af, #3b82f6`) que quedó
fuera de TODAS las migraciones de paleta anteriores (ni siquiera era el azul de Aether —
`#007AFF`/`#4A9EFF` — es un azul distinto, probablemente de antes de esa migración). Nadie lo
grepeó porque los barridos anteriores buscaban los hex específicos de Aether/ámbar, no este.

**⚠️ Hallazgo colateral, no tocado:** en el mismo archivo, `.ga-badge--inventario` sigue con
índigo (`rgba(99, 102, 241, ...)`) en modo oscuro — es otra familia de color (índigo, no este
azul), tampoco reportada explícitamente. Anotado para revisar después si quieres.

**Fix (100% front):** `.ga-btn--primary` → `background: var(--app-accent)` +
`color: var(--app-accent-ink)`.

**Estado:** ✅ corregido — `gastos/all/all.component.scss`.

---

## ❓ 7. `clientes/buscar` — "cuadrito verde" junto a "Clientes", resto blanco

**Dónde:** header de "Clientes" (`clientes-buscar.component`).

**Revisé el código completo del header** (`.cb-header`, `.cb-header__title`, `.cb-search`) y no
encontré ningún elemento que debería verse como un "cuadrito verde" aislado — el header usa el
patrón "glass" estándar del proyecto (`var(--header-brand)`, semi-transparente) con overrides de
texto para ambos temas ya aplicados correctamente en el código. No es descartable que sea un bug
real, pero no lo pude reproducir solo leyendo el código — necesito una captura de pantalla
(o el nombre exacto de qué elemento se ve verde: ¿el ícono 👥, el buscador, un badge de un
cliente en la lista?) para ubicarlo con precisión en vez de adivinar un fix que capaz no es el
correcto.

**Estado:** ❓ pendiente — necesito una captura para diagnosticar bien.

---

## ✅ 8. Ticket de abono: "saldo pendiente" no cuadraba con lo pagado

**Dónde:** ticket impreso al registrar un abono en `/abonos`.

**Ejemplo reportado:** Total $300, "Ya pagado" $100, "Abono de hoy" $100 → mostraba
"Saldo pendiente $200" (debería ser $100, porque 100+100=200 ya pagado de 300).

**Causa raíz encontrada:** `registrarAbono()` (`abonos.component.ts`) usaba
`data?.saldoRestante` (el campo que devuelve el backend en la respuesta del abono) para
actualizar el saldo mostrado en el ticket — **si ese campo del back refleja el saldo de ANTES
del abono en vez de DESPUÉS**, el ticket queda exactamente como describes: "ya pagado" y "saldo
pendiente" ambos con los valores viejos, aunque "abono de hoy" sí esté bien.

**No estoy 100% seguro de que el bug esté del lado del back** — también cabe la posibilidad de
que hayas probado contra una versión vieja cacheada del front (ya pasó varias veces en este
proyecto, documentado en CLAUDE.md). Por eso el fix de front no depende de resolver esa duda:

**Fix (100% front, defensivo — funciona sin importar de quién era el bug):** el saldo y el
"ya pagado" del ticket ahora se calculan **siempre en local** (saldo que ya se tenía cargado al
abrir el modal, menos el monto que se acaba de abonar) — ya no se confía en el número que manda
el back para esto, solo se usa su `estadoPedido` (categórico) para saber si quedó liquidado.
Mismo fix aplicado en el mensaje de abono de `detalle-pedido.component.ts` (no imprime ticket
pero mostraba el mismo tipo de mensaje con el mismo riesgo).

**Extra de claridad (pedido tuyo):** la etiqueta "Ya pagado" en el ticket de abono ahora dice
**"Abonos previos"** — deja explícito que es lo pagado ANTES de hoy, no el total acumulado
(en otros tipos de ticket, venta/liquidado, sigue diciendo "Ya pagado" porque ahí no aplica la
misma ambigüedad).

**⏳ Pendiente de confirmar con el back** (documentado en el repo compartido): que
`POST /v1/abonos/{pedidoId}` devuelva `saldoRestante` reflejando el estado DESPUÉS de aplicar
el abono que se acaba de registrar, no antes — por si el bug real estaba ahí y afecta otras
pantallas que si confían en ese campo.

**Estado:** ✅ corregido en front (defensivo) + ⏳ pregunta mandada al back.

---

## ⏳ 9. Filtros que faltan en `mis-pedidos`: "Pagados" y "Cancelados"

**Dónde:** `/pedidos/mis-pedidos`, junto a los filtros ya existentes (Normal / Apartados /
Ir pagando).

**Confirmaste que los filtros actuales (tipo de pedido + lugar + búsqueda por número) ya se ven
bien** — lo que falta es un filtro por **estado** (Pagado / Cancelado), que es una dimensión
distinta a "tipo de pedido" (`NORMAL`/`APARTADO`/`FIADO`).

**Por qué no lo implementé ya:** `GET /v1/pedidos/buscarClientePedido` hoy solo acepta filtrar
por `tipoPedido` (repetido) — no hay ningún parámetro para filtrar por `estado_pedido`. Con
paginación real del lado del servidor, un filtro "de mentiras" hecho en el front (filtrando
solo lo que ya llegó en la página actual) mostraría resultados incompletos/engañosos página por
página — no es una solución real.

**Necesita del back:** un parámetro nuevo, ej. `&estadoPedido=PAGADO` / `&estadoPedido=Cancelado`
(mismo patrón `@RequestParam` que ya se usa para `tipoPedido`). En cuanto exista, agregarlo al
front es trivial — mismo patrón de botones toggle que ya está armado
(`toggleFiltroTipo()`/`tiposPedidoFiltro`).

**Sobre tu pregunta de qué más filtrar:** confirmaste que prefieres que la búsqueda de texto siga
siendo principalmente "por número de pedido" (ya funciona así, el back ya agregó soporte para
eso el 24 de julio) — no urge agregar más dimensiones de filtro aparte de Pagados/Cancelados por
ahora.

**Estado:** ⏳ pregunta mandada al back — no se puede resolver 100% desde el front.

---

## Resumen — qué quedó y qué falta

| # | Punto | Front | Back | Estado |
|---|---|---|---|---|
| 1 | Modal morado (carga-imágenes) | ✅ | — | Hecho |
| 2 | "Tomar foto" ilegible | ✅ | — | Hecho (+ 18 archivos más por revisar, no urgente) |
| 3 | Paginación en palabras-clave | ✅ | — | Hecho |
| 4 | Modal "Info entrega" morado | ✅ | — | Hecho (mismo fix que #1) |
| 5 | Inputs de precio — atinarle al 0 | ✅ | — | Hecho, global |
| 6 | Botón azul en gastos/buscar | ✅ | — | Hecho |
| 7 | Cuadrito verde en clientes/buscar | ❓ | — | Necesito captura |
| 8 | Saldo pendiente mal en ticket abono | ✅ | ⏳ | Front defensivo hecho, pregunta al back |
| 9 | Filtros Pagados/Cancelados | — | ⏳ | Depende 100% del back |

**Todo lo marcado ✅ ya está en `dev` y `qa`, verificado con `ng build`.**
