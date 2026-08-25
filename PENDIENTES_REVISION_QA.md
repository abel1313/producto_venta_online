# Pendientes de revisión — QA (2026-08-25)

> Documento de trabajo para ir probando en QA, no para el repo compartido con el back. Cada
> punto dice **qué probar**, **qué esperar** si funciona, y el estado real del código a hoy
> (verificado leyendo el código, no de memoria).

---

## ✅ 1. Recién desplegado — listo para probar en vivo

### 1.1 Ubicación exacta de entrega (mapa)

El back confirmó que el código de `latitud`/`longitud`/`referencias` nunca se había fusionado a
`qa` — ya está corregido y desplegado. Confirmado que el punto marcado en el mapa sí se guarda.

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
corrió en QA **y** en prod.

#### 🚨 Bug crítico encontrado probando esto — ✅ RESUELTO (25-ago, hoy)

Al abrir "Info de entrega" del pedido #99 y darle guardar como cliente (cambiando ubicación),
el back respondía **403 "No tiene permisos para acceder a este recurso"** — confirmado con curl
real (`PUT /v1/pedidos/99/entrega` con una cuenta `ROLE_USUARIO`). Causa: esa ruta exigía
`ROLE_ADMIN` en el backend, así que **ningún cliente real podía guardar su propia ubicación**,
aunque el front ya tenía el flujo completo armado para eso. El back ya lo corrigió — ahora
cualquier usuario logueado puede editar la entrega de **su propio** pedido (con validación de
dueño del lado del back, un admin sigue pudiendo editar cualquiera). Ya está en `dev`/`qa`/`main`
del back. **Volver a probar el flujo de guardar ubicación como cliente — ya no debería dar 403.**

#### Otros 3 puntos que salieron probando esto — ✅ resueltos (25-ago, hoy)

- **Coordenadas visibles al cliente en "Info de entrega"** — corregido, ahora `latitud`/`longitud`
  numéricas solo se muestran si el usuario es admin. El cliente sigue viendo el mapa y pudiendo
  marcar su punto, solo no ve los números.
- **Duda: ¿el cliente puede corregir la zona si se equivocó?** — confirmado que **ya podía**, el
  selector de zona en ese mismo modal nunca estuvo restringido a admin. Con el fix del 403 de
  arriba, ahora sí se puede guardar el cambio.
- **Orden de "Mis pedidos"** — corregido, ahora se ordena por número de pedido de mayor a menor
  (más reciente primero).

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

#### CSS reportado probando esto — ✅ resuelto (25-ago, hoy)

- **(Urgente) Checkboxes de filtro admin muy juntos, no se leía qué decía cada uno** — corregido,
  más separación entre cada checkbox/etiqueta y entre grupos.
- **Filtro de fecha invisible en móvil** — causa raíz encontrada: un `overflow-x: hidden` del
  contenedor recortaba el input de fecha cuando el label empujaba el ancho. Corregido.

---

## 🆕 1.3 Escáner de código de barras + fix de lista — ✅ hecho (25-ago, hoy)

Reportado probando "Carga rápida de imágenes": solo generaba código al azar, sin poder escanear
uno existente con la cámara; y al completar un producto, no desaparecía de la lista de pendientes
hasta recargar la página. Mismo problema de "falta escanear" en Productos (alta/edición).

- Se agregó botón de escaneo (reusando el mismo componente `BrowserMultiFormatReader` que ya
  usaba el buscador) en **Carga rápida de imágenes** y en **Productos** (alta y edición) — al
  detectar el código, se llena solo el campo.
- La tarjeta ahora se quita de la lista de pendientes apenas se confirma la publicación, sin
  esperar a un refresh de la pantalla.

**Cómo probar:** en Carga rápida de imágenes, usar el botón de escanear con un código de barras
real; confirmar que la tarjeta desaparece de la lista al completar el producto. En Productos >
agregar/editar, confirmar que también aparece la opción de escanear.

---

## 🔴 2. Reportado hace días

### 2.1 Menú duplicado — "Lugares de entrega" aparece 2 veces — ⏳ sigue así, tu decisión

`src/app/navbar/navbar.component.html:70` y `:157` — el mismo componente
(`LugaresEntregaModule`) tiene 2 entradas de menú distintas:
- 📦 Inventario → "📍 Lugares de entrega" (`routerLink="lugares-entrega"`)
- 🌹 Flores eternas → "📍 Zonas y envío" (`routerLink="flores/zonas"`)

**El catálogo no se puede quitar** — es la fuente de zonas de TODO el checkout de la tienda, no
solo de flores. Lo único duplicado son los 2 accesos de menú a la pantalla de administrarlo, y
esa pantalla tiene 2 campos (costo de envío, horas extra) exclusivos de flores. Recomendación:
dejarlo así, pero es tu llamada.

### 2.2 `/ventas/buscar` — ✅ quitado del menú (25-ago)

Confirmaste que no se usa. Se quitó el link del menú. El módulo y la ruta siguen existiendo en
el código por si hace falta recuperarlos.

### 2.3 `/abonos` — el número de pedido no era un link — ✅ hecho (25-ago)

El pedido en las 3 pestañas (`#{{ pedidoId }}`) ahora es un botón — clic y lleva directo a
`/pedidos/mis-pedidos?pedidoId=N`, que abre el detalle completo automáticamente.

### 2.4 `/admin/diagnostico-imagenes` — sin texto explicativo — ✅ hecho (25-ago)

Se agregó un párrafo explicando qué hace la herramienta y cuándo usarla.

### 2.5 Vitrina de flores — "Pedir" ya es un flujo de compra real — ✅ hecho (25-ago)

"Pedir este ramo" lleva al configurador (`/flores/configurar`) con las flores y accesorios de ese
ramo ya precargados, reutilizando el 100% del checkout ya probado.

- El papel ya **no se muestra** como línea aparte al cliente (se funde en la línea de flores).
- El reparto/accesorios quedan **editables** una vez en el configurador — el precio final siempre
  se recalcula en vivo.
- Se pasa por `router.navigate(['/flores/configurar'], { state: { ramoArmado } })` — no sobrevive
  un refresh a medio armar (aceptable, no hay pedido ni cobro de por medio todavía).

#### 2 dudas que salieron probando esto — ✅ resueltas (25-ago, hoy)

- **"El papel se cobra" seguía apareciendo** — encontrado: el configurador ya estaba corregido,
  pero la **card de la vitrina** (`vitrina-flores.component.html`) todavía tenía un badge
  "📄 papel incluido" suelto. Quitado, mismo criterio que el configurador (invisible por default).
- **Duda: ¿la foto del ramo se pasa al configurador al pedir desde la vitrina?** — no se pasaba,
  confirmado como bug real. Se agregó la foto en el header del configurador cuando se llega desde
  "Pedir este ramo".

---

## ✅ 3. Modo oscuro — confirmado visualmente (25-ago)

Las 4 pantallas reportadas (`rifas/agregar`, `rifas/buscar`, `admin/presentacion`,
`admin/negocio`) se ven bien en modo oscuro — el fix global de julio sí las cubrió. Sin acción
pendiente acá.

---

## ✅ 4. Lat/lng por zona en `LugarEntrega` — resuelto de punta a punta (25-ago, hoy)

El mapa siempre arrancaba centrado en Tejupilco sin importar la zona elegida.

- **Back:** `LugarEntrega` ya trae `latitud`/`longitud` (nullable) en sus 4 endpoints existentes.
  Migración ya corrida en QA y prod. Ver `CAMBIOS_FRONT_2.md` para el detalle completo.
- **Front:** conectado — al elegir una zona (en checkout y "Arma tu ramo"), el mapa ahora se
  recentra con el `latitud`/`longitud` real de esa zona. Si la zona no tiene el dato configurado
  (`null`), se mantiene el fallback genérico de siempre.

**Cómo probar:** elegir "Zacazonapan" (o cualquier zona con centroide ya cargado) en el checkout
o en "Arma tu ramo" — el mapa debe recentrarse solo ahí, sin tener que buscar manualmente.

---

## Resumen rápido

| # | Qué | Estado |
|---|---|---|
| 1.1 | Mapa/coordenadas de entrega del pedido | ✅ Listo — probar de nuevo, incluido el fix del 403 |
| 1.2 | Filtro por fecha de creación | ✅ Listo para probar |
| 1.3 | Escáner de código de barras + fix lista | ✅ Hecho |
| 2.1 | Menú duplicado (lugares-entrega) | ⏳ Sigue así — recomendado dejarlo |
| 2.2 | `/ventas/buscar` (legacy) | ✅ Quitado del menú |
| 2.3 | Abonos → link al pedido | ✅ Hecho |
| 2.4 | Diagnóstico de imágenes — texto | ✅ Hecho |
| 2.5 | Vitrina flores — flujo de compra real + foto + badge papel | ✅ Hecho |
| 3 | Dark mode: rifas / presentación / negocio | ✅ Confirmado — se ven bien |
| 4 | Lat/lng por zona (LugarEntrega) | ✅ Resuelto de punta a punta |

**Todo lo de arriba está en `dev` y `qa` del front — falta tu confirmación probando en QA antes
de promover a `master`/producción.**
