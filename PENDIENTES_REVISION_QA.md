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

**Si sigue sin funcionar:** revisar con el back si las 2 migraciones
(`migration_pedido_ubicacion_entrega.sql`) realmente corrieron en la base de QA — el código ya
desplegado sin la migración habría dado error 500 al guardar (columna inexistente), así que si
el pedido se guarda sin error pero el dato no vuelve, es la pista más probable.

### 1.2 Filtro por fecha de creación (productos/variantes)

Mismo caso — nunca se había fusionado, ya está corregido.

**Cómo probar:**
1. Ir a `/productos/buscar` o `/tienda/buscar` con sesión admin.
2. En la barra de filtros debe aparecer **"Creado desde"** / **"Creado hasta"** (2 pills con
   `<input type="date">`, junto a los checkboxes de con/sin stock, etc.).
3. Elegir una fecha — debe filtrar la lista al instante.
4. En cada card, si el producto/variante tiene el dato, debe aparecer una fila **"Creado"** con
   fecha y hora.

**Si sigue sin funcionar:** mismo caso — confirmar si
`migration_fecha_creacion_producto_variante.sql` corrió en QA.

---

## 🔴 2. Reportado hace días — sigue sin resolver en el código

### 2.1 Menú duplicado — "Lugares de entrega" aparece 2 veces

`src/app/navbar/navbar.component.html:70` y `:157` — el mismo componente
(`LugaresEntregaModule`) tiene 2 entradas de menú distintas:
- 📦 Inventario → "📍 Lugares de entrega" (`routerLink="lugares-entrega"`)
- 🌹 Flores eternas → "📍 Zonas y envío" (`routerLink="flores/zonas"`)

Es la misma pantalla con 2 rutas alias (se hizo así a propósito para que el acordeón del menú no
saltara de sección al entrar desde Flores — ver `CLAUDE.md`, sección "FIX MENÚ — 'Zonas y
envío'..."). **Sigue habiendo 2 links** — falta decidir si eso está bien así (cada uno tiene su
contexto) o si prefieres quitar uno de los dos.

### 2.2 `/ventas/buscar` — pantalla legacy que puede confundir

`src/app/ventas/venta-producto/venta-producto-routing.module.ts` — sigue existiendo y con link
en el menú (🛠️ Ventas → "🔍 Buscar ventas"). Es del **módulo viejo de venta por producto**
(`BuscarVentaComponent`), anterior al flujo actual de variantes (`tienda/venta-directa`). No se
ha quitado — pendiente de que confirmes si sigue haciendo falta o se puede sacar del menú.

### 2.3 `/abonos` — el número de pedido no es un link

`src/app/abonos/abonos.component.html` (líneas 50, 127, 193, 262, 347) — el pedido se muestra
como texto plano `#{{ pedidoId }}` en las 3 pestañas (Cuentas por cobrar, Liquidados,
Cancelados) y en los 2 modales. No hay forma de ir del pedido en `/abonos` a su detalle real.

**Por qué no es trivial:** `DetallePedidoComponent` no es una pantalla con ruta propia — vive
**embebido dentro de `MisPedidosComponent`** (`*ngIf="mostrarDetalle"`, recibe el pedido
completo por `@Input()`, no por id de la URL). Para linkear desde `/abonos` hace falta que
`MisPedidosComponent` sepa leer un `?pedidoId=` de la URL, buscar ese pedido y abrir el detalle
automáticamente — mismo patrón que ya existe al revés (`/abonos?pedidoId=93` ya funciona porque
`AbonosComponent` sí lee ese query param). Es una tarea concreta, no compleja, pero no está
hecha.

### 2.4 `/admin/diagnostico-imagenes` — sin texto explicativo

`src/app/admin/diagnostico-imagenes/diagnostico-imagenes.component.html:9-10` — solo tiene
título y un subtítulo genérico ("Solo administradores · Verifica BD ↔ Microservicio"). No explica
qué hace la herramienta ni cómo interpretar el resultado. Sigue pendiente agregar ese texto.

### 2.5 Vitrina de flores — "Ver detalle" no es un flujo de compra real

`src/app/flores/vitrina/vitrina-flores.component.ts` — el modal de detalle de un ramo armado:
- **Sigue mostrando el papel/envoltura al cliente** (línea ~112, `precioPapelTexto()`) — debería
  ir oculto o fundido en el precio, como ya se hace en "Arma tu ramo".
- El botón "Pedir" solo **abre WhatsApp** (`contactar()`, línea 128) — no pregunta
  envío-vs-recoger-en-tienda, no calcula precio con envío incluido, no genera un pedido real.

Esta es la pieza más grande de las 5 — es un flujo de compra completo, no un ajuste puntual.
Sigue sin empezar.

**Lo que sí está resuelto de la lista original de flores:**
- ✅ Espaciado del header ("Armar el mío" pegado al título) — corregido.
- ✅ Foto del ramo ya armado se muestra — corregido (usa la variante sombra si existe, cae a
  `imagenUrl` si no).

---

## 🟡 3. Debería estar resuelto por el fix global de modo oscuro — falta confirmar visualmente

El 30 de julio se encontró la causa raíz de "botones sin texto visible" en modo oscuro (una
regla global pintaba de blanco cualquier `<span>`, incluidos los de dentro de un botón — ver
`styles.scss:352-353` y `:539-540`, confirmado que sigue en el código). Esto debería haber
arreglado, sin tocarlas una por una:

- `rifas/agregar` y `rifas/buscar` — modales y botones ilegibles en oscuro.
- `admin/presentacion` — botones ilegibles.
- `admin/negocio` — botones y checks ilegibles (además de un fix aparte: el formulario no
  cargaba lo guardado por leer mal el `ResponseGeneric` — ese si está confirmado corregido).

**No se volvió a probar visualmente ninguna de las 3 después del fix global.** Si al entrar en
modo oscuro alguna todavía se ve mal, avisa con una captura — puede ser un caso que el fix
global no cubre (ej. un color hardcodeado en vez de heredar).

---

## ⏳ 4. Esperando respuesta del back

### 4.1 Lat/lng por zona en `LugarEntrega`

Consulta enviada el 22 de agosto (`CAMBIOS_FRONT.md`, sección "❓ CONSULTA AL BACK — lat/lng por
zona..."): el mapa siempre arranca centrado en Tejupilco, sin importar qué zona elija el cliente
en el select. Pedimos que `LugarEntrega` tenga su propio centroide (`latitud`/`longitud`
opcionales) para que el mapa se recentre solo. **Sin respuesta todavía** — no apareció en la
respuesta del 25 de agosto (esa fue específica del bug de coordenadas del pedido).

---

## ❓ 5. Necesito que lo aclares — no tengo contexto suficiente

Quedó anotado en una sesión anterior "flores/ramos-admin confirmation question" en la lista de
pendientes, sin el detalle de qué se preguntaba exactamente. Si sigue siendo relevante, cuéntame
de nuevo qué era para poder revisarlo — no quiero adivinar y corregir algo que no era.

---

## Resumen rápido

| # | Qué | Estado |
|---|---|---|
| 1.1 | Mapa/coordenadas de entrega | ✅ Código listo y desplegado — falta probar en vivo |
| 1.2 | Filtro por fecha de creación | ✅ Código listo y desplegado — falta probar en vivo |
| 2.1 | Menú duplicado (lugares-entrega) | 🔴 Sigue así — falta tu decisión |
| 2.2 | `/ventas/buscar` (legacy) | 🔴 Sigue en el menú — falta tu decisión |
| 2.3 | Abonos → link al pedido | 🔴 No implementado |
| 2.4 | Diagnóstico de imágenes — texto | 🔴 No implementado |
| 2.5 | Vitrina flores — flujo de compra real | 🔴 No implementado (pieza grande) |
| 3 | Dark mode: rifas / presentación / negocio | 🟡 Debería estar resuelto — falta confirmar |
| 4.1 | Lat/lng por zona (LugarEntrega) | ⏳ Esperando al back |
| 5 | "flores/ramos-admin confirmation" | ❓ Falta que me digas de qué se trataba |
