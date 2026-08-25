# Propuesta — reorganización y renombrado del menú lateral (2026-08-25)

> Documento de propuesta, NO implementado todavía. Basado en leer completo
> `navbar.component.html`/`.ts` + lo que ya sabemos de qué hace cada pantalla (ver
> `AUDITORIA_ENDPOINTS_PANTALLAS*.md` en el repo compartido). Para revisar y ajustar antes de
> tocar código.

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

📦 Catálogo                                   (antes "Inventario" — solo producto/variante)
  Productos                     → productos/buscar        (antes "Modelos")
  Agregar producto              → productos/agregar        (antes "Agregar modelo")
  Agregar variante              → tienda/venta              (antes "Agregar producto")
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

👥 Clientes                                   (NUEVO top-level — sale de "Analítica")
  Buscar clientes               → clientes/buscar

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

### Notas sobre decisiones que quedaron abiertas (para que las ajustes)

- **Chat**: no lo fusioné 100% al estilo Flores (un solo grupo con sub-ítems condicionados) porque
  hoy son 2 pantallas distintas (`ChatUsuarioComponent` vs `ChatAdminComponent`) en vez de una sola
  con vista dual — fusionarlas de verdad sería un cambio de código más grande, no solo de menú. Se
  puede dejar como está (2 entradas) o hacer el cambio más grande si te interesa.
- **Clientes**: lo saqué de "Analítica" a su propio grupo top-level porque es una pantalla de
  búsqueda/CRM, no un reporte — pero si prefieres que viva dentro de otro grupo (ej. junto a
  Pedidos, ya que ahí es donde más se usa buscar un cliente), dímelo.
- **"Envíos" como grupo nuevo**: separé Lugares de entrega de Inventario y de Flores porque hoy es
  un catálogo compartido por TODO el checkout (no solo flores), así que un grupo propio refleja
  mejor su alcance real. Si en el futuro construimos ahí la configuración de anillos por zona
  (`DISENO_ZONAS_POR_ANILLO.md`), este sería el lugar natural para esa pantalla también.
- **Nombres "Productos"/"Agregar producto"/"Agregar variante"**: siguen exactamente la taxonomía ya
  documentada en `CLAUDE.md` (Producto = modelo/estilo, Variante = lo que se vende) — si prefieres
  otros nombres más "de negocio" (menos técnicos) en vez de alinearlos al código, dímelo y los
  ajusto.

## 4. Qué falta para implementarlo

Esto es solo el mapa — falta:
1. Que confirmes o ajustes la propuesta (grupos, nombres, qué se queda igual).
2. Reescribir `navbar.component.html` (agrupaciones nuevas) y `navbar.component.ts`
   (`GROUP_ROUTES`, para que el accordion recuerde el grupo activo con la nueva estructura).
3. Revisar si algún componente (`SelectorUbicacionComponent`, breadcrumbs, títulos de pantalla)
   referencia el nombre viejo del menú en algún texto visible, para no dejar nombres
   inconsistentes entre el menú y el título de la pantalla.
