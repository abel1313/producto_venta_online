# Pendientes de revisión — QA (2026-08-25)

> Documento de trabajo para ir probando en QA, no para el repo compartido con el back. Cada
> punto dice **qué probar**, **qué esperar** si funciona, y el estado real del código a hoy
> (verificado leyendo el código, no de memoria).

---

## ✅ 1. Recién desplegado — listo para probar en vivo

### 1.1 Ubicación exacta de entrega (mapa)

El back confirmó que el código de `latitud`/`longitud`/`referencias` nunca se había fusionado a
`qa` — ya está corregido y desplegado.

**Cómo probar:**
1. Ir a `/tienda/venta` (checkout) o `/flores/configurar` ("Arma tu ramo") con sesión de cliente.
2. Elegir una zona de entrega — debe aparecer el mapa (Leaflet) debajo del selector.
3. Marcar un punto en el mapa (o usar "📡 Usar mi ubicación").
4. Confirmar el pedido/ramo.
5. Ir a `/pedidos/mis-pedidos` (o `/abonos` si quedó a crédito), abrir el detalle del pedido que
   se acaba de crear.
6. Debe aparecer el botón **"🧭 Cómo llegar"** — al abrirlo, debe llevar directo al punto marcado
   (`maps/dir/?api=1&destination=lat,lng`), **no** al buscador de texto con el nombre del pueblo
   completo (`maps/search/?api=1&query=...`).

**Actualización 2026-08-25:** el back confirmó que `migration_pedido_ubicacion_entrega.sql` ya
corrió en QA **y** en prod. Con el código fusionado + la migración corrida, ya no debería haber
ningún bloqueante técnico conocido — si sigue sin funcionar al probar, es un caso nuevo, no el
mismo de antes.

### 1.2 Filtro por fecha de creación (productos/variantes)

Mismo caso — nunca se había fusionado, ya está corregido.

**Cómo probar:**
1. Ir a `/productos/buscar` o `/tienda/buscar` con sesión admin.
2. En la barra de filtros debe aparecer **"Creado desde"** / **"Creado hasta"** (2 pills con
   `<input type="date">`, junto a los checkboxes de con/sin stock, etc.).
3. Elegir una fecha — debe filtrar la lista al instante.
4. En cada card, si el producto/variante tiene el dato, debe aparecer una fila **"Creado"** con
   fecha y hora.

**Actualización 2026-08-25:** el back confirmó que `migration_fecha_creacion_producto_variante.sql`
también ya corrió en QA y prod. Listo para probar.

---

## 🔴 2. Reportado hace días

### 2.1 Menú duplicado — "Lugares de entrega" aparece 2 veces — ⏳ sigue así, tu decisión

`src/app/navbar/navbar.component.html:70` y `:157` — el mismo componente
(`LugaresEntregaModule`) tiene 2 entradas de menú distintas:
- 📦 Inventario → "📍 Lugares de entrega" (`routerLink="lugares-entrega"`)
- 🌹 Flores eternas → "📍 Zonas y envío" (`routerLink="flores/zonas"`)

**Confirmado de nuevo el 25-ago (grep fresco): siguen los 2, ninguno se quitó.**

**Investigado — dónde se usa el catálogo de zonas** (no la pantalla de administrarlo, el dato en
sí): en el checkout del cliente (`tienda/venta`), en Venta directa (admin), en "Arma tu ramo"
(flores), y en Mis pedidos (filtrar/editar la zona de un pedido). **El catálogo no se puede
quitar** — es la fuente de zonas de TODO el checkout de la tienda, no solo de flores. Lo único
duplicado son los 2 accesos de menú a la pantalla de administrarlo (dar de alta/editar zonas), y
esa pantalla tiene 2 campos (costo de envío, horas extra) que **sí son exclusivos de flores** —
por eso se le puso también su propio acceso ahí. Recomendación: dejarlo así, pero es tu llamada.

### 2.2 `/ventas/buscar` — ✅ quitado del menú (25-ago)

Confirmaste que no se usa. Verificado que ningún otro lugar de la app lo referencia (ni la
pantalla hermana `/ventas/venta`) — se quitó el link del menú
(`navbar.component.html`/`.ts`). El módulo y la ruta siguen existiendo en el código por si hace
falta recuperarlos, solo dejó de ser accesible desde el menú.

### 2.3 `/abonos` — el número de pedido no era un link — ✅ hecho (25-ago)

El pedido en las 3 pestañas (`#{{ pedidoId }}`) ahora es un botón — clic y lleva directo a
`/pedidos/mis-pedidos?pedidoId=N`, que abre el detalle completo automáticamente (se agregó esa
lectura de `?pedidoId=` en `MisPedidosComponent`, tanto para admin como para cliente, buscando
por el número de pedido). Si el pedido no se encuentra, avisa en vez de dejar la pantalla en
silencio.

### 2.4 `/admin/diagnostico-imagenes` — sin texto explicativo — ✅ hecho (25-ago)

Se agregó un párrafo explicando qué hace la herramienta (compara la BD local contra el
microservicio de imágenes) y cuándo usarla (cuando una foto no aparece y no se sabe si nunca se
guardó o si el archivo se perdió).

### 2.5 Vitrina de flores — "Pedir" ya es un flujo de compra real — ✅ hecho (25-ago)

**No existe (ni existió nunca) un endpoint para confirmar un `RamoArmado` como pedido
directamente** — solo hay listados paginados. En vez de inventar un flujo de cobro paralelo sin
probar, "Pedir este ramo" ahora **lleva al configurador** (`/flores/configurar`) con las flores
y accesorios de ese ramo ya precargados — reutilizando el 100% del checkout que ya estaba
probado ahí (fecha/urgencia, mapa de entrega, verificación de correo, `savePedido`, etc.), en
vez de duplicar esa lógica en la vitrina.

- El papel ya **no se muestra** como línea aparte al cliente (se funde en la línea de flores,
  mismo criterio que "Arma tu ramo" — `subtotalFloresConPapel()`).
- El reparto/accesorios quedan **editables** a propósito una vez en el configurador — el precio
  final siempre se recalcula en vivo, así que nunca se cobra algo distinto de lo que se
  confirma, se ajuste o no lo que traía el ramo.
- `RamoArmado` no trae `tipoFlorId` directo (solo `colorFlorId`) — se resuelve probando cada
  especie del catálogo público hasta encontrar la que contiene ese color (catálogo chico,
  llamadas en paralelo — sin pedirle nada nuevo al back).
- Se pasa por `router.navigate(['/flores/configurar'], { state: { ramoArmado } })`, no por
  query param — no hay endpoint para pedir UN `RamoArmado` por id, y el objeto ya está completo
  en memoria en la vitrina al momento del clic. ⚠️ No sobrevive un refresh de página a medio
  armar (se pierde el `state`) — aceptable, no hay pedido ni cobro de por medio todavía.
- Se conservó un link secundario "¿Dudas antes de pedir? Escríbenos por WhatsApp" para quien
  prefiere solo preguntar.

**Verificado en pantalla con datos simulados** (Playwright, clic real en el botón de la card,
no llamada directa al método) — confirmado que el estado del configurador queda exactamente con
la especie, cantidad, reparto y accesorios del ramo elegido.

**Lo que sí ya estaba resuelto de la lista original de flores:**
- ✅ Espaciado del header ("Armar el mío" pegado al título) — corregido antes.
- ✅ Foto del ramo ya armado se muestra — corregido antes (usa la variante sombra si existe,
  cae a `imagenUrl` si no).

---

## ✅ 3. Modo oscuro — confirmado visualmente (25-ago)

El 30 de julio se encontró la causa raíz de "botones sin texto visible" en modo oscuro (una
regla global pintaba de blanco cualquier `<span>`, incluidos los de dentro de un botón). Se
había quedado sin volver a probar visualmente. **Ya se probó** — levanté el server, entré con
sesión admin simulada, forcé modo oscuro, y comparé capturas reales de las 4 pantallas
reportadas:

- `rifas/agregar` — "💾 Guardar configuración" y los botones de sección legibles (blanco con
  texto negro, o gris apagado en los que están deshabilitados por falta de datos — correcto).
- `rifas/buscar` — pestañas "Diaria"/"Mensual" legibles, la activa en blanco con texto negro.
- `admin/presentacion` — título, subtítulo y contadores legibles.
- `admin/negocio` — toggle de abierto/cerrado, hora, y los 2 botones "Guardar" perfectamente
  legibles, igual que los 4 campos de contacto (WhatsApp/Facebook/Instagram/TikTok).

**Las 4 se ven bien — el fix global de julio sí las cubrió.** Sin acción pendiente acá.

---

## ⏳ 4. Esperando respuesta del back

### 4.1 Lat/lng por zona en `LugarEntrega`

Consulta enviada el 22 de agosto (`CAMBIOS_FRONT.md`, sección "❓ CONSULTA AL BACK — lat/lng por
zona..."): el mapa siempre arranca centrado en Tejupilco, sin importar qué zona elija el cliente
en el select. Pedimos que `LugarEntrega` tenga su propio centroide (`latitud`/`longitud`
opcionales) para que el mapa se recentre solo.

**Sin respuesta en 3 días** — reenviada el 2026-08-25 marcada como 🚨 URGENTE en
`CAMBIOS_FRONT_2.md` (sección "🚨 URGENTE — reenviamos: lat/lng por zona..."), con opción B
propuesta por si prefieren no tocar su modelo (que el front resuelva el centroide con Nominatim
buscando el nombre de la zona, sin cambios de back). Esperando que contesten.

> ⚠️ **No confundir con el punto 1.1.** Son 2 cosas distintas con el mismo par de nombres de
> campo:
> - **1.1** = `latitud`/`longitud` **del pedido** (el punto exacto de la casa del cliente) — eso
>   ya lo confirmó el back, ya está desplegado, y es lo que hay que volver a probar.
> - **4.1** = `latitud`/`longitud` **de `LugarEntrega`** (el centro del pueblo/zona, para que el
>   mapa arranque ya centrado ahí en vez de siempre en Tejupilco) — esto es una consulta
>   DISTINTA, más nueva, y el back todavía no la contestó para nada.

---

## Resumen rápido

| # | Qué | Estado |
|---|---|---|
| 1.1 | Mapa/coordenadas de entrega | ✅ Código + migración confirmados — falta probar en vivo |
| 1.2 | Filtro por fecha de creación | ✅ Código + migración confirmados — falta probar en vivo |
| 2.1 | Menú duplicado (lugares-entrega) | ⏳ Sigue así — catálogo se usa en todo el checkout, recomendado dejarlo |
| 2.2 | `/ventas/buscar` (legacy) | ✅ Quitado del menú |
| 2.3 | Abonos → link al pedido | ✅ Hecho |
| 2.4 | Diagnóstico de imágenes — texto | ✅ Hecho |
| 2.5 | Vitrina flores — flujo de compra real | ✅ Hecho (reusa el configurador) |
| 3 | Dark mode: rifas / presentación / negocio | ✅ Confirmado con capturas — se ven bien |
| 4.1 | Lat/lng por zona (LugarEntrega) | 🚨 Reenviada urgente el 25-ago — distinta de la 1.1, ver nota abajo |
