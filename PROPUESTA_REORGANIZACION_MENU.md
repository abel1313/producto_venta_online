# Reorganización y renombrado del menú lateral (2026-08-25)

> ✅ **Implementado** en `navbar.component.html`/`.ts` (rama `dev`). Se dejó este documento como
> referencia de las decisiones tomadas — el punto 1 (menú anterior) y el punto 2 (problemas) son
> historia; el punto 3 (propuesta) es lo que hoy tiene el código, con un solo ajuste sobre lo
> propuesto originalmente: **el dueño confirmó "Modelo" (nivel estilo) / "Producto" (nivel
> talla+color) en vez de "Producto"/"Variante"** — evita exponer la palabra "variante" en
> cualquier pantalla, que es justo lo que ve el público. Con esa elección, "Modelos"/"Agregar
> modelo"/"Agregar producto" quedaron exactamente como ya estaban antes de este cambio; lo que
> cambió de verdad fue la agrupación (Envíos separado y sin duplicar, Marketing unificado,
> Imágenes fusionado a Sistema, Clientes fuera de Analítica, etc.) — ver punto 3.

## 1. Menú actual — inventario completo

```
🏠 Home
[🟢/🔴 Negocio abierto/cerrado]              admin, botón de acceso rápido
🛍️ Tienda                                    link directo, logueados

📦 Inventario                                 admin, accordion
  🔍 Modelos                    → productos/buscar
  ➕ Agregar modelo              → productos/agregar
  🧩 Agregar producto            → tienda/venta
  📸 Carga rápida de imágenes    → carga-imagenes
  📂 Cargar Excel                → tienda/cargar-excel
  🏷️ Categorías                  → palabras-clave
  📍 Lugares de entrega          → lugares-entrega

📋 Pedidos                                    logueados, accordion
  Mis pedidos                   → pedidos/mis-pedidos
  Historial MP                  → pedidos/historial-mp        (admin)

💰 Ventas                                     admin, accordion
  💰 Venta directa               → tienda/venta-directa
  💳 Créditos / Abonos           → abonos
  💸 Gastos y Ventas             → gastos/buscar

📊 Analítica                                  admin, accordion
  🏠 Dashboard                   → dashboard
  📈 Reportes                    → reportes
  👥 Clientes                    → clientes/buscar

🎰 Rifas                                      admin, accordion
  🎡 Rifa de productos           → rifas/agregar
  📅 Rifa mensual                → rifas/mes
  🔍 Ver rifas activas           → rifas/buscar

🌹 Flores eternas                             logueados (+ subitems admin), accordion
  🌹 Ramos de flores             → flores/ramos
  🌷 Arma tu ramo                → flores/configurar
  🌸 Catálogos                   → flores/catalogos            (admin)
  🚚 Entregas                    → flores/entregas             (admin)
  📍 Zonas y envío               → flores/zonas                (admin — MISMA pantalla que "Lugares de entrega")
  🎗️ Frases por aprobar          → flores/frases               (admin)
  🎁 Administrar ramos armados   → flores/ramos-admin          (admin)

🖼️ Imágenes                                   admin, accordion
  🖼️ Imágenes presentación       → admin/presentacion
  🔍 Diagnóstico imágenes        → admin/diagnostico-imagenes
  🔧 Reconciliación              → admin/reconciliacion-imagenes
  🗑️ Limpiar caché               → admin/cache

🛠️ Sistema                                    admin, accordion
  👥 Usuarios                    → usuarios/buscar
  🏪 Negocio & Contactos         → admin/negocio
  💬 Chat en vivo                → admin/chat
  🎁 Gestión Promociones         → admin/promociones
  📢 Cinta de promociones        → admin/cinta
  📘 Publicar en redes           → admin/facebook
  🏷️ Hashtags de redes           → admin/hashtags

🎁 Promociones                                link directo, logueados (vitrina cliente)
❤️ Favoritos                                  link directo, logueados
💬 Chat                                       link directo, logueados no-admin
📱 QR                                         link directo, todos (muestra QR fijo a la tienda)
🔑 Login                                      link directo, anónimos
🌙/☀️ Modo oscuro/claro
```

## 2. Problemas encontrados (por qué "se ve raro")

1. **Los nombres de "Inventario" están al revés de la taxonomía real del código.** En el back/front,
   `Producto` = el modelo/estilo (ej. "Blusa Zara") y `Variante` = lo que de verdad se vende
   (talla/color, ej. "Blusa Zara / M / Negro") — está documentado así en `CLAUDE.md` del proyecto.
   Pero el menú dice **"🔍 Modelos"** para la pantalla que administra `Producto`
   (`productos/buscar`), y **"🧩 Agregar producto"** para la pantalla que agrega una `Variante`
   (`tienda/venta`) — exactamente al revés de como se llaman las cosas en el código. Esto es
   probablemente la raíz de "los nombres están raros".

2. **"Lugares de entrega" está duplicado** — mismo componente, 2 entradas de menú con nombres
   distintos (`📍 Lugares de entrega` en Inventario, `📍 Zonas y envío` en Flores eternas). Ya se
   había detectado antes en la sesión (ver `PENDIENTES_REVISION_QA.md`) y quedó como "tu llamada,
   se puede dejar" — lo retomo aquí porque ahora se está revisando todo el menú de una vez.

3. **"Inventario" mezcla 3 cosas distintas:** catálogo de productos/variantes (Modelos, Agregar,
   Carga de imágenes, Excel), un catálogo de etiquetas de búsqueda (Categorías = palabras clave), y
   la configuración de zonas de entrega — que no es "inventario" en ningún sentido, es logística.

4. **Lo relacionado con ventas está partido en 2 grupos sin criterio claro:** "Ventas" tiene lo
   operativo del día a día (venta directa, créditos, gastos), pero "Analítica" tiene Reportes —
   que en el back es literalmente `/v1/reportes/ventas/*` (reportes de ventas) — separado del
   grupo que dice "Ventas". Y "Clientes" (una pantalla de búsqueda/CRM, no un reporte) vive dentro
   de "Analítica" sin relación clara con Dashboard/Reportes.

5. **"Promociones" es 3 cosas con 3 nombres distintos, repartidas en 2 lugares:** la vitrina que ve
   el cliente (`🎁 Promociones`, top-level), la gestión admin de esas promos (`🎁 Gestión
   Promociones`, dentro de Sistema), y la cinta/letrero corrido (`📢 Cinta de promociones`, también
   en Sistema, pero es un concepto distinto). Tres cosas relacionadas, sin agrupar.

6. **Chat está partido sin agruparse, a diferencia de Flores.** `💬 Chat` (cliente, top-level) y
   `💬 Chat en vivo` (admin, dentro de Sistema) son la misma función, vista desde 2 roles — Flores
   eternas ya resolvió este mismo patrón (un solo grupo, con los sub-ítems de admin condicionados
   con `*ngIf="isAdminUser"` adentro) y funciona bien ahí.

7. **"QR" no dice qué es.** Es un código QR fijo que apunta a la URL de la tienda pública (para
   imprimir/compartir) — el nombre no lo explica.

8. **"Imágenes" y "Sistema" son ambos "herramientas de administración del sistema"** sin una
   distinción clara de por qué están separados — se puede argumentar que "Imágenes" es un
   subconjunto de "Sistema".

## 3. Propuesta de reorganización

```
🏠 Home
[🟢/🔴 Negocio abierto/cerrado]

🛍️ Tienda

📦 Catálogo                                   (antes "Inventario" — solo modelo/producto, sin
                                                Categorías-lugares-entrega mezclados)
  Modelos                       → productos/buscar         (sin cambio de nombre — ver nota)
  Agregar modelo                → productos/agregar        (sin cambio de nombre)
  Agregar producto               → tienda/venta              (sin cambio de nombre)
  Carga rápida de imágenes      → carga-imagenes
  Cargar Excel                  → tienda/cargar-excel
  Categorías                    → palabras-clave

🚚 Envíos                                     (NUEVO — se saca de Inventario y de Flores)
  Zonas de entrega              → lugares-entrega           (1 sola entrada, no 2)

📋 Pedidos                                    (sin cambios)
  Mis pedidos
  Historial de pagos (MP)                                   (antes "Historial MP")

💰 Ventas                                     (sin Reportes/Clientes, solo operativo)
  Venta directa
  Créditos / Abonos
  Gastos                                                     (antes "Gastos y Ventas")

📊 Reportes                                   (antes "Analítica" — enfocado, sin Clientes)
  Dashboard
  Reportes de ventas                                         (antes "Reportes")

👥 Clientes                                   (NUEVO link top-level — sale de "Analítica",
                                                → clientes/buscar)

🎰 Rifas                                      (sin cambios)

🌹 Flores eternas                             (sin cambios — ya está bien unificado)

📣 Marketing                                  (NUEVO — junta lo disperso de Promociones/redes)
  Promociones activas           → promociones                (vista previa, lo que ve el cliente)
  Gestionar promociones         → admin/promociones           (admin)
  Cinta de anuncios             → admin/cinta                 (antes "Cinta de promociones")
  Publicar en redes             → admin/facebook
  Hashtags de redes             → admin/hashtags

🛠️ Sistema                                    (junta Imágenes + Sistema + Chat unificado)
  Usuarios
  Negocio & Contactos
  Chat en vivo                  → admin/chat
  Imágenes de presentación      → admin/presentacion
  Diagnóstico de imágenes       → admin/diagnostico-imagenes
  Reconciliación de imágenes    → admin/reconciliacion-imagenes
  Limpiar caché                 → admin/cache

❤️ Favoritos
💬 Chat                                       (mismo grupo lógico que "Chat en vivo" arriba, pero
                                                sigue siendo un link aparte porque vive fuera del
                                                accordion admin — ver nota abajo)
📱 Código QR de la tienda                     (antes "QR")
🔑 Login (anónimos)
🌙/☀️ Modo oscuro/claro
```

### Decisiones ya cerradas con el dueño (2026-08-25)

- **"Modelo"/"Producto" en vez de "Producto"/"Variante"**: confirmado — evita exponer la palabra
  "variante" en cualquier pantalla. Como el menú actual ya decía "Modelos"/"Agregar modelo"/
  "Agregar producto" para estos 3 puntos, el nombre visible **no cambió**; lo único que cambió es
  que ya no se movieron hacia la taxonomía interna del código como se había propuesto al inicio.
- **Chat**: se dejó como estaba (2 entradas — "Chat" cliente arriba, "Chat en vivo" dentro de
  Sistema), NO se fusionó al estilo Flores/Marketing — fusionarlas de verdad requiere unificar
  `ChatUsuarioComponent`/`ChatAdminComponent` en un solo componente, cambio de código más grande
  que un ajuste de menú. Queda pendiente si se quiere hacer después.
- **Clientes**: quedó como link top-level (no accordion, es una sola pantalla) fuera de
  "Analítica"/"Reportes".
- **"Envíos" como grupo nuevo**: implementado — es el lugar natural para la futura pantalla de
  configuración de anillos por zona (`DISENO_ZONAS_POR_ANILLO.md`) cuando se conecte al menú.

## 4. Implementación

Ya aplicado en `navbar.component.html` (estructura de grupos) y `navbar.component.ts`
(`GROUP_ROUTES`, actualizado para que el accordion recuerde el grupo activo con la nueva
estructura). Build de producción verificado limpio.
