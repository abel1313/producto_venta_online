Aplicacion web
Venta de bolsas
Venta de pantalones de mujer
Venta de blusas para mujer
Venta de perfumes originales de y 10 mililitros
Permite buscar, agregar y generar pedidos de productos

Se tiene una configuracion por roles
Actualmente solo existe rol admin y rols user.
1.- Login
Muestra imagenes de los productos que tenemos pueden ser promociones o solo de exivision
Solo los usuarios registrados pueden acceder al sistema en caso de que intenten mas de 3 veces se bloquea el accesos a esa pc durante 6 hrs me parece cualquiera puede acceder al login.
2.- Registro permite dar de alta a un usuario para acceder al sistema es necesario ingresar el usuario que usara en el sistema un correo valido y una contrasena con carcacteres especificos y mas de 8 caracteres, se cuenta con imagenes de los productos que tambien pueden ser de exclusivo o en promocion



9042779881600142480, 2863084736116312637, 5097247218726683628, 1004335801459821237, 4833957497959039949, 5629925814154839930, 3377729816569530421, 7805720719229797235, 4446335152059665510


# Instrucciones de comportamiento

- No pidas confirmación antes de hacer cambios
- No preguntes si puedes proceder
- Ejecuta directamente y muestra el resultado
- Solo pregunta si hay ambigüedad real en el requerimiento

---

## REGLA — DOCUMENTAR CADA CAMBIO
Cada vez que se haga un cambio de código, anotarlo en este CLAUDE.md en la sección correspondiente:
- Si es un fix de color/estilo → anotarlo en "FIXES PENDIENTES / REALIZADOS"
- Si es un endpoint nuevo → anotarlo en "RESUMEN DE MIGRACIÓN"
- Si es un cambio de layout → anotarlo en la sección del componente afectado

## REGLA — `DOCUMENTO_BACK_VENTAS_CREDITO.md`

Los cambios del módulo de crédito/abonos (ventas, pedidos, abonos, cancelar, transferir) se documentan **al final** de `DOCUMENTO_BACK_VENTAS_CREDITO.md` como secciones numeradas.

**Antes de escribir en ese archivo**, listar primero al usuario qué secciones se van a agregar y esperar confirmación. No hacer cambios directos sin anunciar primero el contenido.

---

## REGLA — SINCRONIZACIÓN `CAMBIOS_FRONT.md` CON REPO COMPARTIDO FRONT/BACK (2026-07-21)

> Existe un repositorio **aparte**, fuera de este proyecto, que sirve de punto de encuentro entre
> front y back: `D:\proyectos\documentos_front_back_nodevedaades_jade` (repo git propio, remoto
> `github.com:abel1313/documentos_front_back_nodevedaades_jade.git`). Tiene su propia copia de
> `CAMBIOS_FRONT.md` — ahí el back sube los cambios de API que le tocan al front, y ahí también
> debe quedar reflejado lo que el front (yo) necesita preguntarle al back (dudas, consultas,
> notas de bugs). Es el canal de ida y vuelta entre los dos equipos.

### ⚠️ Corrección del flujo (mismo día, 2026-07-21) — el repo compartido es ahora la fuente primaria

El usuario aclaró el flujo: **de aquí en adelante, cualquier duda/consulta mía para el back sobre
`CAMBIOS_FRONT.md` se escribe directamente en la copia del repo compartido**
(`D:\proyectos\documentos_front_back_nodevedaades_jade\CAMBIOS_FRONT.md`), no en la de este
proyecto. La copia de este proyecto (`d:\proyectos\producto_venta_online\CAMBIOS_FRONT.md`) se
actualiza **solo al final**, cuando el usuario diga que ya se terminó de revisar/discutir — momento
en el que se pasa (sincroniza) todo lo nuevo del repo compartido hacia acá.

### Flujo de trabajo (vigente)

1. **Cuando el usuario diga "baja/revisa los cambios" (o equivalente)** → ir a
   `D:\proyectos\documentos_front_back_nodevedaades_jade`, `git pull`, y diffear su
   `CAMBIOS_FRONT.md` contra el de este proyecto (mismo método de diff-contra-HEAD que se usa para
   deduplicar — ver `project_cambios_front_duplication` en memoria) para ver qué puso el back de
   nuevo. **Solo revisar y reportar en el chat — todavía NO tocar el archivo de este proyecto.**
2. **Cualquier duda/consulta nueva que yo tenga para el back** → escribirla directo en
   `D:\proyectos\documentos_front_back_nodevedaades_jade\CAMBIOS_FRONT.md` (no en la copia de este
   proyecto), dejar el commit listo en ese repo aparte (avisando antes de hacer `git push`, es un
   repo con remoto propio en GitHub).
   - ⚠️ **Esto NO es solo para dudas — aplica también a cualquier fix/cambio que termine de
     implementar que sea relevante para el back**, aunque haya sido 100% front y no haya
     necesitado ningún cambio de su lado (ej. un bug causado por cómo el back manda un campo,
     aunque la solución haya sido solo del front). Regla general: **cada vez que termine de
     implementar algo en esta sesión de trabajo con el back, anotarlo ahí de una vez** —
     no esperar a que el usuario lo pida cada vez.
3. **Cuando el usuario diga que ya se terminó** (la ronda de revisión/discusión) → recién ahí
   sincronizar todo lo nuevo del repo compartido hacia `CAMBIOS_FRONT.md` de este proyecto, con el
   mismo método de diff para no perder ni duplicar nada.
4. Son dos repos git independientes (`producto_venta_online` vs
   `documentos_front_back_nodevedaades_jade`) — la sincronización es copiar/mezclar contenido del
   archivo, **no** un merge de git entre ambos.

### 📡 Radar — pendiente de sincronizar a este proyecto (actualizado 2026-07-21)

El repo compartido tiene contenido nuevo que **todavía no está en la copia de este proyecto**
(no sincronizar hasta que el usuario diga "ya terminamos"):

- **Respuesta completa del back a la "CONSULTA AL BACK" de carga rápida de imágenes** (sección
  `## ✅ RESPUESTA DEL BACK a la consulta de arriba`, al final del archivo compartido). Resumen:
  1. Nuevo endpoint **`DELETE /v1/carga-imagenes/{productoId}`** — borra el borrador de verdad
     (producto + variante + imagen local + intenta borrar en el micro de imágenes). Responde
     **400** si el producto ya tiene código real asignado (protección para no borrar algo ya
     completado por accidente).
  2. **No hace falta endpoint nuevo** para recuperar los pendientes (`EXITOSO` sin completar +
     `FALLIDO`) al recargar la pantalla: combinar
     `GET /v1/productos/admin/filtrar?codigoGenerado=true&habilitado=false` (pagina) +
     `GET /v1/carga-imagenes/estado?productoIds=...` para clasificar por `estadoImagen`. El back
     **recomienda migrar y dejar de usar `GET /fallidas`** (que no pagina y solo trae los
     `FALLIDO`, no los `EXITOSO` sin completar).
  3. `/fallidas` se queda sin paginar por ahora — recomendación es migrar al punto 2 en vez de
     pedir paginación ahí.
  4. El `DELETE` del punto 1 sí intenta borrar la imagen en el micro (9096) — best-effort, si falla
     solo queda un warning en el log del back.
  5. Sin límite de reintentos en `reintentar-imagen` — confirmado, no se agregó tope.
  6. Sin limpieza automática/TTL todavía — backlog, no bloquea nada.
- **✅ Ya implementado en el front (2026-07-22)** — ver sección
  "FIX CARGA RÁPIDA DE IMÁGENES — DELETE REAL + RECUPERACIÓN DE EXITOSO SIN COMPLETAR" más abajo.
  Pendiente solo sincronizar esta respuesta del back hacia el `CAMBIOS_FRONT.md` de este proyecto
  (cuando el usuario diga que ya terminamos la ronda de revisión).

---

## FIX — ELIMINACIÓN DE SPINNERS LOCALES EN COMPONENTES (2026-06-14)

**Criterio:** solo debe existir el spinner global del `LoadingInterceptor` (overlay pantalla completa, `app-loading`). Todos los `spinner-border` locales dentro de componentes fueron eliminados.

**Qué se quitó y dónde:**

| Archivo HTML | Qué se eliminó |
|---|---|
| `productos/producto/add/add.component.html` | spinner "Guardando…" en botón guardar |
| `variante/agregar/agregar.component.html` | spinner "Guardando…" en botón guardar |
| `variante/update-variante/update-variante.component.html` | spinner "Actualizando…" + spinners por imagen (⭐ principal y ✕ eliminar) |
| `palabras-clave/gestion/gestion-palabras-clave.component.html` | spinner "Guardando…" en botón |
| `palabras-clave/autocomplete/palabra-clave-autocomplete.component.html` | spinner inline de búsqueda mientras escribe |
| `admin/cache/cache.component.html` | spinner "Limpiando…" en botón |
| `admin/config-negocio/config-negocio.component.html` | spinners "Guardando…" en botones de horario y contactos |
| `admin/presentacion-imagenes/presentacion-imagenes.component.html` | spinner por imagen al guardar |
| `admin/reconciliacion-imagenes/reconciliacion-imagenes.component.html` | spinners "Iniciando…", "Limpiando…", "Consultando…" |
| `admin/diagnostico-imagenes/diagnostico-imagenes.component.html` | spinners inline de búsqueda (producto y variante) |
| `documentos/carga-archivo/carga-archivo.component.html` | spinner "Procesando…" en botón subir |
| `pedidos/mis-pedidos/mis-pedidos.component.html` | spinner de estado terminal "procesando" |
| `productos/producto/detalle-producto/detalle-producto.component.html` | spinner "Eliminando…" en botón |
| `productos/producto/detalle-productos/detalle-productos.component.html` | spinner en botón "Ver imagen" |
| `productos/producto/update/update.component.html` | skeleton cargando blob de imagen + spinner ✕ eliminar por imagen |
| `variante/detalle-variante/detalle-variante.component.html` | spinner "Eliminando…" en botón |
| `variante/venta-directa/venta-directa.component.html` | spinners de búsqueda variante/cliente + "Procesando…" cobrar + estado terminal |

**Patrón que se usaba (ya NO existe en los archivos anteriores):**
```html
<span *ngIf="!flag">Texto botón</span>
<span *ngIf="flag"><span class="spinner-border spinner-border-sm"></span> Cargando…</span>
```
**Patrón que quedó (simplificado):**
```html
Texto botón
```
Los botones conservan `[disabled]="flag"` para evitar doble clic — el feedback visual viene del overlay global.

**EXCEPCIÓN — módulo rifas (`src/app/rifas/`):** los `spinner-border-sm` dentro de botones de acción de rifas (`guardandoVariante`, `creandoRifa`, `cambiandoModoPrueba`) se conservan intencionalmente. El flujo de rifas tiene pasos donde el overlay global ya no está visible (el usuario está en un paso posterior del wizard) y el spinner del botón es la única indicación de que algo está en curso.

**Verificado con `ng build --configuration=development` — sin errores.**

---

## BUG FIX — CATEGORÍA (palabraClave) NO PRECARGADA AL EDITAR VARIANTE (2026-05-23)

**Síntoma:** al abrir `variantes/update`, el campo de categoría (autocomplete) aparece vacío aunque la variante tenía categoría asignada. Ocurre cuando `editarVariante()` en `BuscarComponent` entra al bloque `error` y manda un objeto manual sin `palabraClave`, o cuando el objeto de la grilla no la incluye.

**Causa raíz:**
`UpdateVarianteComponent.ngOnInit()` leía el snapshot del BehaviorSubject con `varianteParaEditar` (getter) — solo una vez. Si el objeto venía incompleto (sin `palabraClave`), el autocomplete se quedaba vacío para siempre.

**Fix:**
`UpdateVarianteComponent.ngOnInit()`: se suscribe al observable `varianteUpdate$` en vez de leer el snapshot. Cuando detecta un ID nuevo, llama a `getOne(id)` para obtener la variante completa con `palabraClave`. Con la respuesta, actualiza `this.variante` (spread) y asigna `palabraClaveSeleccionada`. Angular propaga el cambio al `[valorInicial]` del autocomplete hijo → setter del hijo ejecuta → campo precargado.

Se agregaron `idVarianteCargado` y `destroy$` para evitar re-inicializaciones duplicadas y limpiar suscripciones al destruir.

**Archivos modificados:**
- `src/app/variante/update-variante/update-variante.component.ts` → `ngOnInit()` suscripción al observable + llamada a `getOne`, `ngOnDestroy()` completa `destroy$`

---

## BUG FIX — CATEGORÍA (palabraClave) NO PRECARGADA AL EDITAR PRODUCTO (2026-05-23)

**Síntoma:** al abrir `productos/update`, el campo de categoría (autocomplete) aparece vacío aunque el producto tenía categoría asignada.

**Causa raíz (dos partes):**
1. `AllComponent.updateProducto(item)` pasa un `IProductoDTO` de la grilla al BehaviorSubject — ese tipo NO tiene `palabraClave`.
2. `AddComponent.ngAfterViewInit()` solo se ejecuta UNA VEZ. Si `productoActualizar` cambia después (por llamada async), el form ya no se recarga.

**Fix:**
- `UpdateComponent.ngOnInit()`: después de recibir el ID del producto via BehaviorSubject, llama a `getDataGeneric(id)` para obtener el producto completo incluyendo `palabraClave`. Actualiza `productoActualizar` con un nuevo objeto (spread) para disparar el change detection del hijo.
- `AddComponent`: agrega `ngOnChanges` para reaccionar a cambios en `[productoUpdate]` cuando el formulario ya está construido (`formReady`). La carga inicial ahora se hace en `ngOnInit` (cuando form está listo) en vez de `ngAfterViewInit`.

**Archivos modificados:**
- `src/app/productos/producto/update/update.component.ts` → `ngOnInit()` agrega llamada a `getDataGeneric`
- `src/app/productos/producto/add/add.component.ts` → agrega `ngOnChanges`, `formReady`, mueve lógica de `ngAfterViewInit` a `ngOnInit`

---

## REGLA — ESPACIO LATERAL RESERVADO PARA PROMOCIONES

**En TODOS los componentes**, los lados izquierdo y derecho del header/buscador deben quedar
**completamente vacíos**. Esos espacios están reservados para **banners de promociones de
productos** que el usuario verá al navegar por el sistema.

**Implementación obligatoria:**
- El contenido del header siempre va dentro de un wrapper interno con `max-width: 1120px` y
  `margin: 0 auto` — mismo ancho que el grid de cards para que queden alineados.
- Nombre del wrapper: `.<prefijo>-header__content` (ej. `pl-header__content`, `vb-header__content`).
- No agregar `padding` lateral al `.vb-header` / `.pl-header` externo más allá del necesario
  para el color de fondo — el espacio libre en los laterales es intencional.

**Estado actual:**
- `productos/all` → ✅ `.pl-header__content` (max-width: 1120px — alineado con grid de cards)
- `variante/buscar` → ✅ `.vb-header__content` (max-width: 1120px — alineado con grid de cards)
- Formularios centrados (`variante/agregar`, `productos/add`) → ✅ ya tienen `max-width` en su card

**Verificar este patrón** al agregar cualquier componente nuevo con buscador o header de pantalla completa.

### REGLA — TIRA DE COLOR EN CARDS (`.xx-card__header`)

La tira donde aparece el precio/stock en las cards de catálogo **NO debe cambiar de color por producto**.
Todas las cards deben tener el **mismo color azul marino semi-transparente**:

```scss
/* Pegar en .<prefix>-card__header dentro del componente buscador */
background: linear-gradient(135deg, rgba(15, 37, 87, 0.88) 0%, rgba(29, 78, 216, 0.72) 100%);
backdrop-filter: blur(6px);
```

- **No usar** `[style.background]="colorHeader(item.color)"` ni ningún binding dinámico de color
- El texto y chips dentro deben ser blancos (`color: white`)
- Aplica a: `productos/all` ✅, `variante/buscar` ✅ (pendiente aplicar si tiene tira de color)

---

## DISEÑO DEFINITIVO — HEADER EN DARK/LIGHT MODE (✅ aprobado)

### Light mode — glassmorphism
```scss
:host-context(body.theme-light) {
  .<prefix>-header {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(18px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
  // Texto oscuro
  .<prefix>-header__title h4    { color: #1e293b; }
  .<prefix>-header__title small { color: #64748b; }
  .<prefix>-header__inner       { color: #1e293b; }
  // Botón carrito
  .<prefix>-btn--cart { background: rgba(0,0,0,0.06); color: #1e293b; }
  // Buscador
  .<prefix>-search { background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.12); }
  .<prefix>-search__input::placeholder { color: rgba(0,0,0,0.42); }
  // Filtros admin
  .<prefix>-filtro-btn { border: 1px solid rgba(0,0,0,0.14); background: rgba(0,0,0,0.05); color: #475569; }
  .<prefix>-filtro-btn--active { background: rgba(99,102,241,0.12); color: var(--app-accent); }
  // Botón scan móvil
  .<prefix>-scan-mobile { background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.12); color: #1e293b; }
}
```

### Dark mode — antracita
```scss
:host-context(body.theme-dark) {
  --header-brand:        linear-gradient(135deg, #18181b 0%, #27272a 55%, #3f3f46 100%);
  --header-brand-shadow: rgba(0, 0, 0, 0.55);
}
```

### Componentes donde ya está aplicado
- `productos/all` → `all.component.scss` ✅
- `variante/buscar` → `buscar.component.scss` ✅

### Para CADA componente nuevo que tenga header/buscador
1. Agregar los dos bloques `:host-context` al final de su SCSS
2. Ajustar el prefijo de clase (ej. `rf-` para rifas, `ca-` para carga-archivo, etc.)
3. Si tiene formulario interno (no buscador), el header usa `var(--header-brand)` directamente — solo agregar el bloque `theme-dark` con antracita

---

## HOMOLOGACIÓN DE PALETA — ÁMBAR/CREMA (2026-07-03) ✅ COMPLETO

**Cambio de marca:** la paleta índigo (`#6366f1`/`#4f46e5`/`#818cf8`) fue reemplazada globalmente por ámbar/crema:
- Accent claro: `#B08A4E` | Accent oscuro: `#C9A063` | Hover: `#8A6A38`
- Gradiente principal: `linear-gradient(135deg, #8A6A38, #B08A4E)`
- Tira de cards: `linear-gradient(135deg, rgba(61,44,12,0.88) 0%, rgba(176,138,78,0.72) 100%)`
- Shadows: `rgba(176,138,78,...)` reemplaza `rgba(99,102,241,...)`
- Regla: NUNCA hardcodear hex — usar siempre `var(--app-accent)`, `var(--header-brand)`, etc.

**Archivos modificados (todos los SCSS de la app):**
`loading`, `gastos/all`, `palabras-clave/autocomplete`, `palabras-clave/gestion`, `usuarios/all-usuarios`, `clientes-add`, `add-usuarios`, `detalle-productos`, `chat-usuario`, `chat-admin`, `buscar-rifa`, `diagnostico-imagenes`, `config-negocio`, `presentacion-imagenes`, `carga-archivo`, `productos/add`, `productos/all`, `venta-variante`, `add-venta`, `variante/buscar`, `detalle-variante`, `update-variante`, `update-producto`

**Estado verificado:** `ng build --configuration=development` sin errores. Grep de `#6366f1|#4f46e5|99,102,241` en todos los SCSS → cero resultados.

## FIXES DE ESTILOS — PENDIENTES Y REALIZADOS

### ✅ Ya corregidos
- `--header-brand` en light mode → ámbar `linear-gradient(135deg, #8A6A38, #B08A4E)` en `src/styles.scss`
- Toda la paleta índigo → ámbar en TODOS los SCSS del proyecto (ver sección HOMOLOGACIÓN)
- `$primary` (#8b1a4a rojo) → `var(--app-accent)` en todos los SCSS de variantes, productos, admin, chatbot, palabras-clave
- Scroll containers con rojo → `var(--card-border)`
- Botón "quitar" → `#ef4444` (rojo semántico correcto)

> **Instrucción:** Al arreglar cada SCSS nuevo, verificar que NO use `#6366f1`, `#4f46e5`, `#818cf8`, `rgba(99,102,241,...)` — solo `var(--app-accent)` y `rgba(176,138,78,...)`.

---

## FIX ESTILOS — TEXTO BLANCO INVISIBLE EN HEADERS/BOTONES EN MODO CLARO (2026-07-07)

**Síntoma:** en modo claro, varias pantallas mostraban el botón o el header "vacío" — el
fondo se veía pero el texto no. Reportado puntualmente en `/promociones` (botón "🛒 Agregar"
sin texto visible).

**Causa raíz:** `--header-brand` cambia de valor por tema — en modo oscuro es un color oscuro
(`rgba(28,27,25,0.80)`), pero en modo claro es un **glass casi blanco**
(`rgba(255,250,242,0.82)`), pensado únicamente para el fondo del header con glassmorphism
(que SIEMPRE lleva su propio override de color de texto oscuro para modo claro, ver sección
"DISEÑO DEFINITIVO — HEADER EN DARK/LIGHT MODE"). Varios componentes usaron esa misma
variable para fondos de **botones** o headers de página, con `color:#fff`/`color:white`
hardcodeado, **sin agregar el override de texto para modo claro** — en modo claro queda texto
blanco sobre fondo casi blanco = invisible.

**Fix — dos patrones distintos:**
1. **Botón/banner puntual** (no es el header principal de la página): cambiar el fondo de
   `var(--header-brand)` a `var(--app-accent)` (color sólido ámbar, igual de visible en ambos
   temas) o al gradiente fijo `linear-gradient(135deg, #8A6A38, #B08A4E)` — nunca depende del
   tema.
2. **Header de página** (usa `var(--header-brand)` a propósito, por el efecto glass): agregar
   `:host-context(body.theme-light) { .xx-header__title { color: #1e293b; } .xx-header__subtitle { color: rgba(0,0,0,.55); } }`
   — mismo patrón ya usado en `productos/all` y `variante/buscar`.

**Archivos corregidos:**
| Archivo | Qué se corrigió |
|---|---|
| `promociones/promociones.component.scss` | `.pm-btn--agregar` → `var(--app-accent)` (patrón 1) |
| `variante/venta-directa/venta-directa.component.scss` | `.vd-modal__header` → gradiente fijo (patrón 1) |
| `reportes/reportes.component.scss` | `.rp-header__title` (patrón 2) |
| `admin/cache/cache.component.scss` | `.ac-card__title`/`__subtitle` (patrón 2, sin bloque `theme-light` previo) |
| `admin/reconciliacion-imagenes/reconciliacion-imagenes.component.scss` | `.rc-card__title`/`__subtitle` (patrón 2) |
| `admin/config-negocio/config-negocio.component.scss` | `.cn-card__title`/`__subtitle` (patrón 2) |
| `admin/presentacion-imagenes/presentacion-imagenes.component.scss` | `.pi-card__title`/`__subtitle` (patrón 2) |
| `clietes/clientes-buscar/clientes-buscar.component.scss` | `.cb-header__title` + buscador `.cb-search` (título Y buscador estaban en blanco) |
| `productos/producto/detalle-producto/detalle-producto.component.scss` | `.dp-header__name`/`__desc` (patrón 2) |
| `documentos/carga-archivo/carga-archivo.component.scss` | `.ca-card__title`/`__subtitle` (patrón 2) |
| `abonos/abonos.component.scss` | `.ab-header__title` (patrón 2, ya tenía bloque `theme-light` para el input) |

**Verificados como YA correctos (no tocados):** `productos/all`, `variante/buscar`,
`variante/agregar` y `productos/producto/add` (redefinen `--header-brand` localmente con un
gradiente fijo, a propósito — ver "DISEÑO DEFINITIVO"), `dashboard`, `gastos/all`, `gastos/add`
(ya tenían su override de modo claro completo).

**Pendiente relacionado (no tocado en este fix):** el rediseño completo dark/light de varios
de estos mismos componentes (bordes, cards, inputs) sigue abierto — ver sección "PENDIENTE —
MIGRACIÓN DE COMPONENTES A DARK/LIGHT THEME". Este fix solo resuelve la invisibilidad de
texto, no el rediseño completo de esos componentes.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX ESTILOS — CHECKBOX CUSTOM EN FILTROS ADMIN (2026-07-07)

**Motivo:** los checkboxes de los filtros admin (Con stock / Sin stock / Con imágenes / Sin
imágenes / Habilitados / No habilitados) en `productos/buscar` y `variantes/buscar` usaban el
checkbox nativo del navegador (cuadradito diminuto con `accent-color`) — se veía "muy básico"
dentro de la pill.

**Fix:** checkbox propio (caja redondeada 16×16, borde sutil, palomita blanca dibujada con CSS
que aparece con animación de escala al marcar, fondo `var(--app-accent)` cuando está activo).
El input nativo se oculta visualmente (clip-path, sigue siendo accesible/focuseable) y un
`<span class="…__box">` hermano dibuja la caja + la palomita vía `:checked + &__box`.

**Archivos modificados:**
- `src/app/productos/producto/all/all.component.html` → 6 checkboxes de `.pl-filtros` con `<span class="pl-filtro-check__box">`
- `src/app/productos/producto/all/all.component.scss` → `.pl-filtro-check__input`, `.pl-filtro-check__box` (dark + light mode)
- `src/app/variante/buscar/buscar.component.html` → 6 checkboxes de `.vb-filtros` con `<span class="vb-filtro-check__box">`
- `src/app/variante/buscar/buscar.component.scss` → `.vb-filtro-check__input`, `.vb-filtro-check__box` (dark + light mode)

**Hallazgo colateral corregido:** `.vb-filtro-btn--active` en light mode (`buscar.component.scss`)
todavía tenía `rgba(99, 102, 241, 0.14)` (índigo viejo) en vez de `rgba(176, 138, 78, 0.14)`
(ámbar) — quedó fuera de la migración de paleta de la sección HOMOLOGACIÓN. Corregido de paso.

**Verificado con `ng build --configuration=development` sin errores.**

---

## BUG CONOCIDO — LOADING OVERLAY SE ESCONDE ANTES DE TIEMPO

**Síntoma:** al guardar un producto/variante, el overlay de carga de pantalla completa desaparece mientras el botón sigue mostrando spinner. El usuario puede volver a dar clic antes de que termine la operación.

**Causa raíz:** `LoadingService` (`src/app/loading.service.ts`) usa un `BehaviorSubject<boolean>` simple. Cuando hay múltiples requests simultáneos (ej: guardar producto + subir 3 imágenes), el interceptor (`LoadingInterceptor`) llama `show()` y `hide()` por CADA request. El primero que termina llama `hide()` → el overlay se esconde aunque los demás requests sigan en vuelo.

**Flujo roto:**
```
Request A empieza → show() → overlay visible
Request B empieza → show() → sin cambio (ya es true)
Request A termina → hide() → overlay OCULTO ← bug: B sigue corriendo
Request B termina → hide() → sin cambio (ya es false)
```

**Solución:** cambiar `LoadingService` a un **contador** en vez de boolean. El overlay solo se oculta cuando el contador llega a 0 (todos los requests terminaron).

**Fix:**
```typescript
private count = 0;
show() { this.count++; this.loadingSubject.next(true); }
hide() { if (this.count > 0) this.count--; if (this.count === 0) this.loadingSubject.next(false); }
```

**Estado:** ✅ Corregido (2026-05-21) — ver `src/app/loading.service.ts`

**Archivos involucrados:**
- `src/app/loading.service.ts` → fix del contador
- `src/app/loading.interceptor.ts` → sin cambio, ya usa `finalize()`

---

## PROBLEMA CONOCIDO — TOKEN JWT EXPIRA EN FORMULARIOS

**Síntoma:** usuario llena un formulario largo (producto, variante, etc.), tarda más de X minutos sin guardar, intenta guardar y recibe error "no se puede sacar el nombre del JWT" o 401. Pierde todos los cambios escritos.

**Causa:** el access token expira en memoria (`AuthenticateService`) y el request llega al back con token vencido.

**Solución pendiente:** crear un `HttpInterceptor` que:
1. Capture respuestas 401
2. Llame a `AccederService.refresh()` → `POST /auth/refresh` (ya existe, usa cookie HTTP-only con el refresh token)
3. Actualice el token en `AuthenticateService` + roles en `AuthService`
4. Reintente la request original

**Estado:** ✅ Corregido (2026-05-21)

**Bug encontrado:** `TokenInterceptor` (`src/app/token/TokenInterceptor .ts`) ya tenía el refresh implementado, pero `handleRefresh()` extraía el token como `response.accessToken` directo. El backend devuelve `{ response: { accessToken } }` (formato envuelto), así que `response.accessToken` era `undefined` → se guardaba `undefined` → el retry fallaba con "no se puede sacar el nombre del JWT".

**Fix:** alinear el parsing del refresh con el mismo patrón que usa `bootstrapAuth` en `app.module.ts`:
```typescript
const token = response?.response?.accessToken ?? response?.accessToken ?? response?.data?.accessToken ?? response?.token ?? '';
```

**Archivos modificados:** `src/app/token/TokenInterceptor .ts` → `handleRefresh()`

---

## MAPA DE ENDPOINTS — ENDPOINTS.md

Existe el archivo `ENDPOINTS.md` en la raíz del proyecto con el inventario completo de todos los endpoints HTTP del proyecto:
- **Sección A:** todos los endpoints de proyecto-key (puerto 9091) organizados por módulo — qué hace, qué componente lo usa, en qué función y cómo llegar navegando
- **Sección B:** endpoints del micro de imágenes (puerto 9096)
- **Sin uso:** tabla de métodos creados en servicios pero sin componente que los invoque

Actualizar ese archivo cuando se agregue o conecte un endpoint nuevo.

---

## SKILLS QUE SE USAN EN ESTE PROYECTO

| Skill | Cuándo usarla |
|---|---|
| `angular-developer` | Refactor, mejores prácticas Angular, componentes, servicios, routing |
| `code-quality` | Revisión de calidad, clean code, API contracts, performance |

Para invocar: escribir `/angular-developer` o `/code-quality` en el chat.

---

## MÓDULO RIFAS — RIFA MENSUAL/DIARIA + MODO PRUEBA + EDICIÓN DE CONCURSANTES (2026-06-12)

> Integración de los cambios de back descritos en `RIFA_MENSUAL_FLUJO.md` y `RIFA_DIARIA_PROPUESTA.md`,
> incorporados a los componentes existentes (`AgregarRifaComponent`, `RifaMesComponent`, `BuscarRifaComponent`)
> sin crear componentes nuevos, tal como se acordó.

### Modelos (`src/app/rifas/models/`)
- `configurar-rifa.model.ts`: nuevo `export type TipoRifa = 'MENSUAL' | 'DIARIA'`. `IConfigurarRifa` e `IConfigurarRifaRequest` ahora incluyen `tipo?`, `mesReferencia?: string | null` (formato `YYYY-MM`), `esPrueba?: boolean`.
- `concursante.model.ts`: `IConcursante` agrega `agregadoEnPrueba?: boolean`. Nuevas interfaces `IOmitidoYaRegistrado { clientePedidoId, nombre }` e `IImportarDePedidosResponse { importados: IConcursante[], omitidosYaRegistrados: IOmitidoYaRegistrado[] }`.

### Servicio (`src/app/rifas/service/rifa.service.ts`)
- `configurarRifa()`: el body ahora incluye `tipo`, `mesReferencia`, `esPrueba`.
- Nuevo `setEsPrueba(rifaId, esPrueba)` → `PUT /v1/configurarRifa/{id}/esPrueba`.
- Nuevo `buscarConfiguraciones({ tipo?, mesReferencia?, desde?, hasta? })` → `GET /v1/configurarRifa/buscar?...`.
- `eliminarConcursante(id)`: cambió de `DELETE /v1/concursante/delete` (body=id) a `DELETE /v1/concursante/{id}` (path param). Puede devolver `400 { mensaje }` si el concursante ya participó en un sorteo.
- Nuevo `actualizarConcursante(id, data: Partial<IConcursante>)` → `PUT /v1/concursante/{id}` (campos parciales: nombre, apellidoPaterno, telefono, palabraClave, ordenDesde).
- `importarDePedidos()`: el response cambió de `IConcursante[]` a `{ importados, omitidosYaRegistrados }`.

### AgregarRifaComponent (`src/app/rifas/agregar-rifa/`)
- **Sección A (Datos generales):** `configForm` agrega selector `tipo` (Mensual/Diaria) y campo `mesReferencia` (input `month`, solo visible si `tipo === 'MENSUAL'`). Checkbox "Crear como rifa de prueba" (`esPrueba`, solo visible antes de guardar).
- **Banner modo prueba:** si `rifaConfig.esPrueba === true`, se muestra banner ⚠️ con botón "Pasar a sorteo real" → llama `toggleModoPrueba()` → `setEsPrueba()`. El backend limpia sorteos demo y des-descarta participantes al desactivar.
- **Importar del mes:** oculto cuando `tipo === 'DIARIA'` (getter `esRifaDiaria`).
- **Import de pedidos:** ahora usa `res.importados` y `res.omitidosYaRegistrados`. Si hay omitidos, se muestra alerta ℹ️ con los nombres (getter `omitidosNombres`), dismissable con `cerrarOmitidosImport()`.
- **Eliminar concursante:** si el back devuelve `400 { mensaje: "...ya participó en un sorteo" }`, se muestra en alerta ⚠️ (`errorConcursante`), dismissable.
- **Editar concursante inline:** nuevo `editConcursanteForm` + `editandoConcursanteId`. Botón ✏️ por fila abre un mini-form (nombre, apellido, teléfono, palabra clave) con "💾 Guardar" / "Cancelar" → `actualizarConcursante()`.
- **Listas de participantes:** se separaron en dos tablas usando getters `concursantesParticipantes` (≡ `!agregadoEnPrueba`) y `concursantesEnPrueba` (≡ `agregadoEnPrueba`, header "🧪 Agregados durante la prueba").
- **Rifa Diaria (`tipo === 'DIARIA'`):** dentro del form "Agregar participante" se agrega un buscador de clientes registrados (`onBuscarCliente()` → `ClienteService.buscarClientes()`, debounce 400ms). Al seleccionar un cliente (`seleccionarCliente()`) se precargan nombre/apellido/teléfono en `concursanteForm` para registrar uno por uno vía `registrarConcursante()` (sin `clientePedidoId` → backend asigna `boletos = 1`).

### RifaMesComponent (`src/app/rifas/rifa-mes/`)
- `crearRifaEImportar()`: `configurarRifa()` ahora envía `tipo: 'MENSUAL'`, `mesReferencia: this.mesSeleccionado`, `esPrueba: false`.
- Consume el nuevo shape de `importarDePedidos()`: `concursantes = res.importados`, `omitidosImport = res.omitidosYaRegistrados`.
- Nueva alerta ℹ️ en "Paso 2: Participantes" (clase `.rm-alert--warn`, agregada en `rifa-mes.component.scss`) mostrando `omitidosImport` con `cerrarOmitidosImport()`. `nueva()` resetea `omitidosImport`.

### BuscarRifaComponent (`src/app/rifas/buscar-rifa/`)
- Cada `br-card` muestra badges de `tipo` (☀️ Diaria / 📅 Mensual + `mesReferencia`) y 🧪 Prueba si `esPrueba`.
- Nueva pestaña "🔎 Buscar" (`tab === 'buscar'`) con filtro `tipo` / `mesReferencia` (solo si tipo=MENSUAL) / `desde` / `hasta` → botón "Buscar" llama `buscarConfiguraciones()` y llena `rifasBuscadas`. Mensajes vacíos diferenciados por pestaña.
- Nuevos estilos en `buscar-rifa.component.scss`: `.br-filtro`, `.br-field`, `.br-label`, `.br-input`, `.br-btn--filtro`, `.br-card__badges`, `.br-card__badge--prueba`.

### Notas
- Verificado con `ng build --configuration=development` sin errores (incluye chequeo estricto de templates).
- Nota técnica: los templates de Angular NO permiten arrow functions (`=>`) dentro de interpolaciones `{{ }}` — por eso `omitidosImport.map(...).join(...)` se expuso como getter `omitidosNombres` en TS en vez de inline en el HTML (afecta a `AgregarRifaComponent` y `RifaMesComponent`).
- Pendiente (fuera de alcance de esta integración, preguntas abiertas al equipo de back en `RIFA_MENSUAL_FLUJO.md`): reportes, notificación al ganador, validación de `palabraClave`.

---

## FIXES MÓDULO RIFAS — TRAS PRUEBAS EN VIVO (2026-06-12)

> 3 bugs/gaps reportados al probar "📅 Rifa mensual" (`RifaMesComponent`, ruta `rifas/mes`)
> y "🎡 Rifa de variantes" (`AgregarRifaComponent`, ruta `rifas/agregar`).

### 1. Error silencioso al agregar concursante (ej. fecha límite ya pasó)
**Síntoma:** si `fechaHoraLimite` de la rifa ya pasó, el backend rechaza el alta de concursante
pero el front no mostraba ningún mensaje — el botón "Agregar" simplemente no hacía nada.

**Fix:** se reutilizó/extendió el patrón `errorConcursante` (ya usado en `eliminarConcursante()`)
para mostrar `err?.error?.mensaje` en una alerta `rf-alert--warn` / `rm-alert--warn` dismissable:
- `AgregarRifaComponent.agregarConcursante()` → captura error y limpia `errorConcursante` antes de llamar.
- `AgregarRifaComponent.importarClientes()` → mismo manejo de error.
- `RifaMesComponent.agregarManual()`, `eliminarConcursante()`, `crearRifaEImportar()`
  (tanto `configurarRifa` como `importarDePedidos`) → mismo manejo, nuevo campo
  `errorConcursante: string | null` + alerta `.rm-alert--warn` en "Paso 2: Participantes".

**Archivos modificados:**
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts`
- `src/app/rifas/rifa-mes/rifa-mes.component.ts`
- `src/app/rifas/rifa-mes/rifa-mes.component.html`

### 2. Solo se veía UN "premio" (variante) en la grilla, los demás desaparecían
**Causa raíz:** `IConfigurarRifaVariante.variante` estaba tipado como NO-opcional
(`variante: IVarianteRifaResumen`), pero el backend puede devolver un item sin `variante`
(p. ej. variante eliminada). El template accedía directo a `v.variante.nombreProducto` sin
chequeo — si UN item de `variantesRifa` venía con `variante` nulo, Angular lanzaba
`TypeError` durante el `*ngFor` y el change detection se interrumpía a medio renderizar
→ solo quedaba pintado el primer card y el resto nunca se renderizaba.

**Fix:**
- `IConfigurarRifaVariante.variante` ahora es opcional (`variante?: IVarianteRifaResumen`).
- Todos los accesos en el template (`rf-var-card`, hover modal, chips de progreso en la ruleta,
  pantalla de transición del ganador) ahora usan optional chaining: `v.variante?.nombreProducto`,
  `v.variante?.talla`, `v.variante?.color`, `v.variante?.stock`, `v.variante?.codigoBarras`.

**Archivos modificados:**
- `src/app/rifas/models/configurar-rifa.model.ts` → `variante?:`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → `?.` en grid (Sección B), hover modal,
  chips de progreso (paso ruleta) y pantalla de transición del ganador.

### 3. "Rifa mensual" sin indicador de modo prueba
**Síntoma:** `RifaMesComponent` no tenía ningún checkbox/banner para saber si la rifa creada
es de prueba o la real, y `crearRifaEImportar()` enviaba `esPrueba: false` fijo.

**Fix:**
- "Paso 1: Mes" → nuevo checkbox **"Crear como rifa de prueba"** (`esPrueba`, se envía en
  `configurarRifa()`).
- "Paso 2: Participantes" → header muestra badge **✅ Sorteo real** o **🧪 Prueba** según
  `rifaConfig.esPrueba`.
- Si `esPrueba === true` → banner amarillo "⚠️ Esta rifa es de prueba..." con botón
  **"Pasar a sorteo real"** → `toggleModoPrueba()` → `RifaService.setEsPrueba(id, false)` →
  recarga `concursantes` (mismo patrón que `AgregarRifaComponent`).
- `nueva()` resetea `esPrueba`, `cambiandoModoPrueba` y `errorConcursante`.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → campos `esPrueba`, `cambiandoModoPrueba`,
  `errorConcursante`; `toggleModoPrueba()`; `crearRifaEImportar()` envía `esPrueba: this.esPrueba`.
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → checkbox (Paso 1), badges + banner (Paso 2).
- `src/app/rifas/rifa-mes/rifa-mes.component.scss` → `.rm-checkbox-label`, `.rm-badge-real`,
  `.rm-badge-prueba`.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO RIFAS — NAVEGACIÓN PASO 4/5 SIN VOLVER A PARTICIPANTES (2026-06-12)

**Síntoma:** en `RifaMesComponent`, al llegar a "Paso 4: Sorteo" (ruleta) y "Paso 5: Ganador",
no había forma de regresar a "Paso 2: Participantes" para ver la lista de concursantes. Las
únicas acciones en la pantalla de ganador eran "🔄 Reiniciar (mismos participantes)" → vuelve
a `paso='ruleta'` (no a participantes) y "➕ Nueva rifa mensual" → `nueva()`, que **resetea todo
el estado** (rifaConfig, concursantes, etc.) para crear una rifa distinta — por eso "al
regresar" parecía que los concursantes habían desaparecido.

**Causa raíz:** faltaba un botón de navegación hacia atrás. `concursantes` y `rifaConfig`
NUNCA se borran durante `sortear()`/`reiniciar()` — solo no había manera de volver a la vista
que los muestra.

**Fix:**
- "Paso 4: Ruleta" → nuevo botón **"← Ver participantes"** arriba del layout → `paso = 'participantes'`.
- "Paso 5: Ganador" → nuevo botón **"👥 Ver participantes"** entre "Reiniciar" y "Nueva rifa mensual"
  → `paso = 'participantes'`.
- Ninguno de los dos botones limpia estado — al volver, `concursantes` sigue poblado.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.html`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO RIFAS — ERRORES SILENCIOSOS EN GIRAR/REINICIAR + MODO PRUEBA EN SORTEO + VOLVER AL SORTEO (2026-06-12)

> 3 problemas reportados tras nueva prueba en vivo de "📅 Rifa mensual" (Paso 4/5).

### 1. Error silencioso en "🎡 Girar" y "🔄 Reiniciar (mismos participantes)"
`sortear()` y `reiniciar()` no capturaban `err?.error?.mensaje` (mismo problema de la Lección #1,
pero en otros métodos) — si el backend rechazaba el giro/reinicio, no pasaba nada visible.

**Fix:** ambos limpian `errorConcursante = null` al iniciar y, en `error`, capturan
`err?.error?.mensaje`. La alerta `.rm-alert--warn` (`errorConcursante`) ahora también se
renderiza en "Paso 4: Ruleta" y "Paso 5: Ganador" (antes solo existía en "Paso 2: Participantes").

### 2. No se podía volver al sorteo desde "Participantes" sin re-configurar el premio
Desde el botón "👥/← Ver participantes" (fix anterior), la única forma de "avanzar" era
"Siguiente: elegir premio →" (Paso 3), que llama `guardarVariante()` →
`POST /v1/configurarRifaVariante/save` de nuevo → **hubiera creado un premio duplicado**.

**Fix:** nuevo botón **"🎡 Volver al sorteo →"** en "Paso 2: Participantes" (solo si
`varianteRifa` ya existe) → `volverASorteo()` → recarga `getElegibles()` y regresa a
`paso = 'ruleta'` sin volver a guardar el premio.

### 3. Modo prueba sin control visible durante el sorteo
Durante los giros de demo (Paso 4) y en la pantalla de ganador (Paso 5) no había forma de ver
ni cambiar el modo prueba — solo existía en "Paso 2: Participantes".

**Fix:**
- Nuevo checkbox **"🧪 Es de prueba"** en Paso 4 (junto a "← Ver participantes") y Paso 5
  (antes de los botones de acción), ligado a `rifaConfig?.esPrueba` vía
  `(change)="toggleModoPrueba()"`. Al desmarcarlo llama a `setEsPrueba(id, false)` (pasa a
  sorteo real); como refleja el valor persistido en `rifaConfig`, el estado **no se resetea**
  en los siguientes giros — queda como el admin lo dejó.
- El checkbox **"Crear como rifa de prueba"** de "Paso 1: Mes" ahora viene **marcado por
  defecto** (`esPrueba = true`), para que toda rifa nueva empiece en modo prueba y el admin
  decida explícitamente cuándo pasar a real (Pasos 8-9 de `RIFA_MENSUAL_FLUJO.md`).

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `esPrueba = true` (default y en `nueva()`),
  `sortear()`/`reiniciar()` con manejo de error, nuevo `volverASorteo()`.
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → botón "Volver al sorteo" (Paso 2),
  checkbox "Es de prueba" + alerta de error (Paso 4 y Paso 5).

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO RIFAS — PALABRACLAVE DUPLICADA SIN MENSAJE + LISTA DE DESCARTADOS + RULETA TRAS REINICIAR (2026-06-12)

> 3 problemas reportados tras nueva prueba en vivo, esta vez detectando que el patrón de la
> Lección #1/#6 (errores silenciosos) seguía sin aplicarse en `AgregarRifaComponent`
> (componente hermano de `RifaMesComponent`), más 2 bugs nuevos en "Paso 4: Ruleta" de
> `RifaMesComponent`.

### 1. "Confirmar variante" (Sección B, AgregarRifaComponent) tragaba el error de palabraClave duplicada
**Síntoma:** backend responde `404 { mensaje: "La palabraClave 'RIFA' ya existe en esta rifa" }`
al intentar agregar un premio con una palabra clave ya usada en la misma rifa — el front no
mostraba nada, el botón "✅ Confirmar variante" simplemente no hacía nada visible.

**Causa raíz:** `guardarVarianteRifa()` tenía `error: () => { this.guardandoVariante = false; }`
— exactamente el patrón de la Lección #1, pero en `AgregarRifaComponent`, no en
`RifaMesComponent` (que ya se había corregido).

**Fix:** limpia `errorConcursante = null` al iniciar; en `error`, captura
`err?.error?.mensaje ?? 'No se pudo agregar el premio.'`. Se agregó una alerta
`.rf-alert--warn` dentro del propio formulario "Agregar variante" (Sección B), además de la
alerta ya existente en Sección C (que comparte el mismo campo `errorConcursante`).
`eliminarVarianteRifa()` recibió el mismo manejo (`'No se pudo eliminar el premio.'`).

### 2. `reiniciar()` no actualizaba la ruleta/elegibles visualmente
**Síntoma:** tras "🔄 Reiniciar (mismos participantes)" desde "Paso 5: Ganador", el panel
"🟢 Elegibles (N)" y la ruleta quedaban como recién inicializados (sin dibujar), aunque el
backend sí devolvía los elegibles correctos (`GET /v1/concursante/elegibles/{id}` con 200 y
la lista completa). Al dar "🎡 Girar" una vez, sí se mostraban — pero solo la primera vez.

**Causa raíz:** `reiniciar()` hacía `this.paso = 'ruleta'` y luego `this.actualizarRuleta()`
**en el mismo tick**, antes de que Angular renderizara el `<canvas #ruletaCanvas>` del nuevo
`*ngIf="paso === 'ruleta'"` (venía de `*ngIf="paso === 'ganador'"`) → `this.ruletaCanvas` aún
`undefined` → `actualizarRuleta()` salía temprano (`if (!this.ruletaCanvas) return;`) → nunca
llamaba `generarRuleta()`. Mismo problema que ya se había resuelto en `volverASorteo()` (fix
anterior, sección 11 de `RIFA_CAMBIOS_IMPLEMENTADOS.md`) con un `setTimeout(..., 200)`, pero
NO se replicó en `reiniciar()`.

**Fix:** `reiniciar()` ahora usa `setTimeout(() => this.actualizarRuleta(), 200)`, igual que
`volverASorteo()`.

### 3. No existía lista de "Descartados"
**Síntoma:** al descartar un concursante durante el sorteo, solo se veía un aviso temporal
("❌ Descartado: NOMBRE") por 2.5s y luego desaparecía de toda la pantalla — sin quedar
registro visible de quién ya fue descartado.

**Fix:** se replicó el patrón que `AgregarRifaComponent` ya tenía
(`descartados: IConcursante[]` + panel `❌ Descartados (N)`):
- Nuevo campo `descartados: IConcursante[] = []` en `RifaMesComponent`.
- En `sortear()`, al filtrar al descartado de `elegibles` también se agrega a `descartados`.
- Se resetea en `reiniciar()`, `nueva()` y al cargar elegibles por primera vez
  (`guardarVariante()`).
- Nuevo panel `.rm-panel` "❌ Descartados (N)" debajo de "🟢 Elegibles" en "Paso 4: Ruleta",
  con clase `.rm-panel__item--elim` (texto rojo + line-through) — agregada al SCSS.

### 4. (hallazgo colateral) `HttpClientModule` duplicado en `ProductoModule` + `VentaProductoModule`
Mientras se investigaba un reporte de "cada servicio hace 2 peticiones", se encontró que
`HttpClientModule` se importaba en `ProductoModule` Y `VentaProductoModule` (ambos cargados
eager en `AppModule`), en vez de una sola vez en `AppModule` — anti-patrón conocido de Angular.
Se consolidó: ahora solo `AppModule` lo importa. **Esto no necesariamente explica el "2
peticiones"** — si en el Network tab una de las dos es `OPTIONS` (preflight CORS, normal por
`Authorization` + `withCredentials` en `TokenInterceptor`), no es un bug. Si tras este fix
sigue viéndose el mismo método duplicado dos veces, reportar con el componente/acción exacto
para buscar una doble suscripción puntual.

**Archivos modificados:**
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `guardarVarianteRifa()`,
  `eliminarVarianteRifa()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → alerta de error en Sección B
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `descartados`, `sortear()`, `reiniciar()`,
  `nueva()`, `guardarVariante()`
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → panel "❌ Descartados"
- `src/app/rifas/rifa-mes/rifa-mes.component.scss` → `.rm-panel__item--elim`
- `src/app/app.module.ts`, `src/app/productos/producto/producto.module.ts`,
  `src/app/ventas/venta-producto/venta-producto.module.ts` → consolida `HttpClientModule`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO RIFAS — PALABRACLAVE DUPLICADA EN RIFA MENSUAL + PREMIO ÚNICO EN RESUMEN + "null" EN NOMBRES (2026-06-13)

> Continuación directa del fix anterior: el usuario reportó por SEGUNDA vez que el mensaje de
> palabraClave duplicada no aparecía — esta vez en "📅 Rifa mensual" (`RifaMesComponent`), no en
> "🎡 Rifa de variantes" (`AgregarRifaComponent`, ya corregido). Más 2 bugs nuevos.

### 1. `RifaMesComponent.guardarVariante()` tragaba el error de palabraClave duplicada
Mismo patrón roto de la Lección #1/#6/#7 (`error: () => { this.guardandoVariante = false; }`
sin leer `err?.error?.mensaje`), pero en el método hermano de
`AgregarRifaComponent.guardarVarianteRifa()` que sí se había corregido. "Paso 3:
Variante/Premio" tampoco tenía alerta de error.

**Fix:** `guardarVariante()` limpia `errorConcursante = null` al iniciar y, en `error`, captura
`err?.error?.mensaje ?? 'No se pudo guardar el premio.'`. Nueva alerta `.rm-alert--warn` al
inicio de "Paso 3".

### 2. "PASO: RESUMEN" (AgregarRifaComponent) solo mostraba 1 premio cuando había varios
Mismo mecanismo de la Lección #2, en una pantalla distinta a la ya corregida (sección 9.2 de
`RIFA_CAMBIOS_IMPLEMENTADOS.md`): `h.configurarRifaVariante.variante.nombreProducto` sin `?.`
en `*ngFor="let h of historial"` — un `variante` nulo en cualquier item rompía el render del
resto.

**Fix:** `IHistorialVariante.configurarRifaVariante.variante` ahora es opcional
(`estado-rifa.model.ts`) + `?.` en el template, con fallback a `palabraClave` si no hay
`nombreProducto`.

### 3. "null" en nombres (ruleta, tablas, paneles, ganador)
`apellidoPaterno` puede ser `null` — `{{ c.nombre }} {{ c.apellidoPaterno }}` y los template
literals de los labels de la ruleta (`${c.nombre} ${c.apellidoPaterno}`) renderizaban/generaban
literalmente la palabra **"null"**.

**Fix:** nuevo helper `nombreCompleto(c)` en AMBOS componentes
(`[c.nombre, c.apellidoPaterno].filter(p => !!p).join(' ')`), usado en TODAS las
interpolaciones de nombre + labels de la ruleta (`generarRuleta()`) — tablas de
participantes, alertas de descartado, paneles elegibles/descartados, pantalla de ganador,
historial del resumen.

### 4. "2 peticiones de la misma solicitud" — SIGUE SIN RESOLVERSE
Repetida la investigación con ángulo distinto: `rifa.service.ts` completo (15 métodos, todos
`http.xxx().pipe(map(...))` simple, sin subscribes anidados), `TokenInterceptor`,
`app.module.ts` (interceptores/HttpClientModule únicos), `WebSocketServiceService`
(deshabilitado/no-op, no puede ser la causa), todos los `.subscribe()` de navegación, y uso de
`| async` (ninguno). **No se encontró la causa a nivel de código.** Pendiente: reproducir en
vivo con DevTools → Network y reportar pantalla/acción + URL/método exactos de las 2
peticiones.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `guardarVariante()`, `nombreCompleto()`,
  label de `generarRuleta()`
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → alerta de error "Paso 3", interpolaciones
  de nombre
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `nombreCompleto()`, label de
  `generarRuleta()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → historial del resumen +
  interpolaciones de nombre
- `src/app/rifas/models/estado-rifa.model.ts` → `configurarRifaVariante.variante` opcional

**Verificado con `ng build --configuration=development` sin errores ni warnings.** Detalle
completo en `RIFA_CAMBIOS_IMPLEMENTADOS.md` sección 13.

---

## FIX MÓDULO RIFAS — DROPDOWN RECORTADO + DOBLE POST AL CONFIRMAR PREMIO + ÚLTIMO PASE LECCIÓN #8 (2026-06-13)

> Reporte en `/rifas/mes`, Paso 3 "🎁 Premio a rifar": el dropdown de búsqueda de variante
> solo mostraba 1 resultado (recortado, con scroll inútil); al dar "Ir al sorteo →" se
> disparaban 2 POST a `/v1/configurarRifaVariante/save` (uno OK, el otro sin efecto visible);
> y el error `404 { "mensaje": "La palabraClave 'RIFA4' ya existe en esta rifa" }` no se
> mostraba al usuario.

### 1. Dropdown de búsqueda recortado (solo 1 resultado visible)
**Causa raíz:** `.rm-dropdown`/`.rf-dropdown` son `position: absolute` dentro de
`.rm-search-wrap`/`.rf-search-wrap`, pero el contenedor padre `.rm-card`/`.rf-card` tiene
`overflow: hidden` → el dropdown se recorta a la altura visible del card.

**Fix:** nuevo getter `dropdownStyleVariante` (y `dropdownStyleCliente` en
`AgregarRifaComponent`) que calcula `getBoundingClientRect()` del `<div #searchWrapXxx>` y
devuelve `{ position: 'fixed', 'top.px', 'left.px', 'width.px' }` vía `[ngStyle]`.
`position: fixed` escapa del `overflow: hidden` del ancestro y se recalcula en cada ciclo de
change detection mientras el dropdown está visible.

Aplicado a `RifaMesComponent` (Paso 3, búsqueda de variante) y `AgregarRifaComponent`
(Sección B búsqueda de variante, Sección C búsqueda de cliente en rifa diaria).

### 2. Doble POST a `/v1/configurarRifaVariante/save`
**Causa raíz:** sin guard de re-entrada, un doble clic disparaba `guardarVariante()` /
`guardarVarianteRifa()` dos veces antes de que `[disabled]` se reflejara en el DOM — el
segundo POST llegaba con la palabraClave ya guardada por el primero → `404` de duplicado.

**Fix:** se agregó `|| this.guardandoVariante` a la guarda de entrada de ambos métodos.

### 3. Error de palabraClave duplicada sin mostrar — pase exhaustivo Lección #8
Grep literal de `error:\s*\(` en AMBOS archivos `.ts` completos. Se corrigieron 11 métodos en
`AgregarRifaComponent` (`guardarConfiguracion`, `toggleModoPrueba`, `guardarEdicionConcursante`,
`verElegibles`, `cargarClientesMes`, `sortear`, `verResumenFinal`, `confirmarContinuar`,
`agregarParticipanteTransicion`, `guardarParticipanteRuleta`, `reiniciar`) y 2 en
`RifaMesComponent` (`cargarClientes`, `toggleModoPrueba`) — todos ahora capturan
`err?.error?.mensaje` en `errorConcursante` con mensaje de fallback específico.

Se dejó sin cambio `AgregarRifaComponent.cargarRifasActivas()` (privado, fallback silencioso
a `[]` — carga de fondo no bloqueante, UX correcta).

Se agregaron alertas `errorConcursante` nuevas donde no existían:
- `AgregarRifaComponent.html`: `paso === 'ruleta'`, `paso === 'transicion'`,
  `paso === 'resumen'`, y el modal "➕ Agregar participante".
- `RifaMesComponent.html`: Paso 1 "Mes" (cubre `crearRifaEImportar()` y `cargarClientes()`,
  que ya capturaban el error pero no tenían dónde mostrarlo).

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `@ViewChild('searchWrapVariante')`,
  `dropdownStyleVariante`, guard en `guardarVariante()`, fix en `cargarClientes()` y
  `toggleModoPrueba()`
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → `#searchWrapVariante` +
  `[ngStyle]="dropdownStyleVariante"`, alerta Paso 1
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `@ViewChild('searchWrapVariante')`,
  `@ViewChild('searchWrapCliente')`, `dropdownStyleVariante`, `dropdownStyleCliente`,
  `dropdownStyleFor()`, guard en `guardarVarianteRifa()`, + 11 métodos del pase Lección #8
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → `#searchWrapVariante` /
  `#searchWrapCliente` + `[ngStyle]`, alertas en `paso === 'ruleta'`/`'transicion'`/`'resumen'`
  y modal de participante

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
Detalle completo en `RIFA_CAMBIOS_IMPLEMENTADOS.md` sección 14.

---

## FIX MÓDULO RIFAS — GUARD DE DOBLE-SUBMIT INSUFICIENTE EN CADENAS ASYNC (2026-06-13)

> El usuario reportó que `POST /v1/configurarRifaVariante/save` SEGUÍA llegando 2 veces
> (200 + 400 "La palabraClave 'RIFA4' ya existe en esta rifa") **después** del fix de la
> sección 14.2 (`|| this.guardandoVariante`). Los pares `configurarRifa/save`+`OPTIONS`,
> `importarDePedidos`+`OPTIONS` y `variantes/v1/buscar` (2 GET) reportados en el mismo
> Network tab son **preflight CORS normal** (ver sección 12) — NO son el bug.

### Causa raíz real
El guard `|| this.guardandoVariante` solo cubre el doble-clic SÍNCRONO (antes de que
`[disabled]` se refleje en el DOM). Pero `RifaMesComponent.guardarVariante()` reseteaba
`guardandoVariante = false` en el `next` del PRIMER POST (`configurarRifaVariante/save`),
ANTES de que el segundo POST encadenado (`getElegibles()`) terminara. Durante esa ventana,
el botón "🎡 Ir al sorteo →" vuelve a estar habilitado — un re-clic reenvía el MISMO
`palabraClave`/`varianteId` (los campos del form NO se limpian en `RifaMesComponent`, a
diferencia de `AgregarRifaComponent.guardarVarianteRifa()` que sí llama
`resetFormVariante()`) → el backend ya lo guardó con el primer POST → segundo POST = 400
"ya existe".

### Fix — mantener el flag `true` durante TODA la cadena
`RifaMesComponent.guardarVariante()`: `guardandoVariante` ahora solo se pone en `false` en
el `next`/`error` TERMINAL de `getElegibles()` (la última llamada de la cadena), no en el
`next` de `guardarVarianteRifa()`.

```typescript
this.rifaService.guardarVarianteRifa(req).subscribe({
  next: res => {
    this.varianteRifa = res;
    // guardandoVariante sigue en true hasta que termine TODO el flujo (incluye
    // getElegibles) — evita que un segundo clic reenvíe la misma palabraClave
    // (ya guardada) mientras esta llamada sigue en vuelo.
    this.rifaService.getElegibles(this.rifaConfig!.id!).subscribe({
      next: elegibles => {
        this.elegibles = elegibles;
        this.descartados = [];
        this.guardandoVariante = false;
        this.paso = 'ruleta';
        setTimeout(() => this.generarRuleta(), 200);
      },
      error: err => {
        this.guardandoVariante = false;
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudieron cargar los elegibles.';
      }
    });
  },
  error: err => {
    this.errorConcursante = err?.error?.mensaje ?? 'No se pudo guardar el premio.';
    this.guardandoVariante = false;
  }
});
```

### Mismo patrón aplicado a `crearRifaEImportar()` (Paso 1: Mes)
`configurarRifa()` → `importarDePedidos()` es la MISMA forma de cadena (crear → import
encadenado), y el botón "✅ Crear rifa e importar..." no tenía ningún flag de
re-entrada — `[disabled]` solo dependía de `clientesSeleccionados.size`/`fechaHoraLimite`/
`palabraClave`, ninguno de los cuales cambia tras el primer `next`. Nuevo campo
`creandoRifa`, puesto en `true` al entrar y en `false` solo en el `next`/`error` de
`importarDePedidos()` y en el `error` de `configurarRifa()`. Botón con
`[disabled]="... || creandoRifa"` + spinner "Creando…" (mismo patrón visual que "Ir al
sorteo →").

### Sibling check (`AgregarRifaComponent`)
- `guardarVarianteRifa()` → ya inmune (resetea el form en `next`, confirmado en la sección 14).
- `guardarConfiguracion()` (equivalente a `crearRifaEImportar()`: `configurarRifa()` +
  cascada `cargarVariantesRifa()`/`cargarConcursantes()`) → **NO necesita fix**: el botón usa
  `[disabled]="... || !!rifaConfig?.id"`, y `rifaConfig.id` se asigna de forma síncrona en el
  mismo `next` que pone `savingConfig = false` → el botón queda deshabilitado
  permanentemente apenas se guarda, sin ventana de re-clic posible.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `guardarVariante()` (flag al final de la
  cadena), nuevo campo `creandoRifa`, `crearRifaEImportar()` (mismo patrón)
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → botón "✅ Crear rifa e importar..." con
  `creandoRifa` + spinner

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
Detalle completo en `RIFA_CAMBIOS_IMPLEMENTADOS.md` sección 15.

---

## FIX MÓDULO RIFAS — `omitidosSinNombre` EN IMPORTAR DE PEDIDOS (2026-06-14)

> Según `CAMBIOS_FRONT.md`: si `clientes[]` en `POST /v1/concursante/importarDePedidos` traía
> una entrada `sinRegistro: true` con `nombre` vacío, el backend abortaba TODO el batch. Ahora
> esas entradas se omiten y vuelven en un nuevo arreglo `omitidosSinNombre` (mismo shape que
> `omitidosYaRegistrados`, pero con `IClientePedido`).

**Fix:**
- `IImportarDePedidosResponse` (`concursante.model.ts`) → + `omitidosSinNombre: IClientePedido[]`.
- `RifaService.importarDePedidos()` → default incluye `omitidosSinNombre: []`.
- `RifaMesComponent` y `AgregarRifaComponent`: nuevo campo `omitidosSinNombre`, poblado junto a
  `omitidosImport` en el `next` de `importarDePedidos`/`importarClientes`, reseteado en
  `nueva()`/`nuevaRifa()`. Nuevo `cerrarOmitidosSinNombre()` + alerta
  `.rm-alert--warn`/`.rf-alert--warn`: "ℹ️ N participante(s) sin registro no se importaron
  porque no tienen nombre."

**Revisado (sin cambios):** `CAMBIOS_FRONT.md` también pide confirmar que el refresh de token
solo se dispare en 401 (no en 403, ahora "sin permisos"). `TokenInterceptor` ya solo intercepta
`error.status === 401` — correcto, no requiere cambios.

**Archivos modificados:**
- `src/app/rifas/models/concursante.model.ts`
- `src/app/rifas/service/rifa.service.ts`
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` + `.html`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` + `.html`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
Detalle completo en `RIFA_CAMBIOS_IMPLEMENTADOS.md` sección 16.

---

## FIX MÓDULO RIFAS — REPETIR SORTEO EN MODO PRUEBA SIN "RESETEAR" MANUAL (2026-06-14)

**Síntoma reportado:** en `RifaMesComponent`, tras terminar el sorteo (Paso 5: Ganador, rifa
`esPrueba=true`), el flujo "👥 Ver participantes" → "Siguiente: elegir premio →" → "🎡 Ir al
sorteo →" (mismo premio/palabraClave, sin pasar por "🔄 Reiniciar") mostraba en "Paso 4: Ruleta"
solo **1 concursante elegible** en vez de todos. Repetir el mismo camino seguía mostrando 1.
Si en cambio se hacía clic en "🔄 Reiniciar (mismos participantes)" antes, sí aparecían todos.

**Diagnóstico (front vs. back):** se confirmó con el usuario en vivo que "Reiniciar" SÍ
restaura la lista completa — es decir, **no es un bug del backend**. `getElegibles()` es un
pass-through directo (`this.elegibles = elegibles`, sin filtrar en el front); lo que devuelve
es exactamente lo que hay en BD. La causa real: el concursante ganador de la ronda anterior
queda con `descartado=true` en BD (así funciona el sorteo — no puede volver a salir elegible),
y ese flag **solo se limpia con `POST /v1/ganadorRifa/reiniciar/{id}?completo=false`**. El
botón "👥 Ver participantes" es pura navegación (no llama `reiniciar`), así que al volver a
"Ir al sorteo →" con el mismo premio, `getElegibles()` legítimamente devuelve solo los
concursantes que NO han ganado/sido descartados todavía.

**Fix:** dado que el propósito de `esPrueba=true` es justamente poder repetir la prueba las
veces que se quiera con los mismos participantes, `RifaMesComponent.guardarVariante()` ahora
detecta `this.rifaConfig?.esPrueba === true` y, antes de `getElegibles()`, llama
`reiniciar(rifaId, false)` (no destructivo — conserva concursantes, limpia `descartado` y
sorteos demo). Si `esPrueba === false` (rifa real), el comportamiento NO cambia — el flag
`descartado` se preserva como debe ser en producción.

```typescript
if (this.rifaConfig?.esPrueba) {
  this.ganador = null;
  this.descartadoActual = null;
  this.rifaService.reiniciar(rifaId, false).subscribe({
    next: () => cargarElegibles(),
    error: err => { this.guardandoVariante = false; this.errorConcursante = err?.error?.mensaje ?? 'No se pudo reiniciar el sorteo.'; }
  });
} else {
  cargarElegibles();
}
```

`guardandoVariante` sigue en `true` durante toda la cadena (incluyendo el `reiniciar` extra),
mismo patrón de la Lección #10.

**`AgregarRifaComponent` (sibling check, Lección #7):** revisado — NO aplica el mismo fix.
Su arquitectura de sorteo es distinta: maneja MÚLTIPLES premios/variantes por rifa en
secuencia (`getEstado()` + websocket + `irARuleta()`/`_retomar()`), donde excluir a los
ganadores de variantes previas al pasar a la siguiente variante **es el comportamiento
correcto** — auto-reiniciar ahí rompería esa exclusión. `AgregarRifaComponent.reiniciar()`
ya hace un reset completo distinto (`nuevaRifa()`). Si en el futuro se reporta un caso
análogo en `AgregarRifaComponent` (repetir sorteo de UN solo premio en modo prueba sin
participantes), revisar puntualmente — no es el mismo flujo.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `guardarVariante()`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX MÓDULO RIFAS — CONFIRMACIÓN + RESET AL PASAR DE PRUEBA A REAL A MITAD DEL SORTEO (2026-06-14)

**Pregunta del usuario:** en `RifaMesComponent`, si ya se dio el primer giro (de un
`giroGanador` configurado en 3, por ejemplo) y luego se desmarca "🧪 Es de prueba" (pasa la
rifa a real), ¿qué pasa del lado del front con el giro/descarte ya hecho?

**Diagnóstico:** `toggleModoPrueba()` solo hacía `PUT .../esPrueba` + refrescaba
`concursantes` — NO tocaba `elegibles`/`descartados`/`ganador`/`paso`. Por el comentario ya
existente en `AgregarRifaComponent.toggleModoPrueba()` ("Al pasar a real, el back limpia giros
de demo y reactiva descartados"), el backend SÍ reactiva (des-descarta) a quien salió
descartado en el giro de prueba — pero el front seguía mostrando esa lista vieja
(`elegibles` sin esa persona, `descartados` con ella). Si el sorteo seguía (giros 2 y 3), el
back podía volver a sortear a esa persona ya reactivada, pero `this.elegibles.findIndex(...)`
no la encontraría (`idx = -1` → animación de la ruleta cae en la posición 0, incorrecta) y
podía aparecer DUPLICADA en "❌ Descartados".

**Fix acordado con el usuario:** al desmarcar "Es de prueba", mostrar un `confirm()` explicando
la consecuencia y, si confirma, reiniciar el sorteo desde cero con los mismos participantes
(arranca en "Paso 4: Ruleta" lista para el sorteo real).

`RifaMesComponent.toggleModoPrueba()`:
- Si `nuevoValor === false` → `confirm('¿Deseas pasar esta rifa al modo REAL? ... El sorteo
  comenzará desde cero con los mismos participantes.')`. Si cancela → no hace nada (el
  checkbox revierte solo porque `rifaConfig.esPrueba` no cambió).
- Si confirma → `setEsPrueba(rifaId, false)` → refresca `concursantes` (igual que antes) y,
  si ya había un `varianteRifa` configurado: limpia `ganador`, `descartadoActual`,
  `descartados`, vuelve a pedir `getElegibles(rifaId)` (ya resincronizado por el back),
  `paso = 'ruleta'` y regenera la ruleta (`setTimeout(actualizarRuleta, 200)`).
- Si `nuevoValor === true` (real → prueba) o no hay `varianteRifa` aún: comportamiento
  simple de antes (solo `setEsPrueba` + refrescar `concursantes`), sin confirm.

**`AgregarRifaComponent` (sibling check, Lección #7):** se agregó el MISMO `confirm()` antes
de `setEsPrueba(false)` por consistencia de UX. NO se replicó el resync de
`elegibles`/ruleta — su arquitectura (websocket + `getEstado()`) es distinta y ya hace
`cargarConcursantes()`; si se reporta el mismo problema visual ahí, revisar puntualmente.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `toggleModoPrueba()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `toggleModoPrueba()` (solo el `confirm()`)

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX MÓDULO RIFAS — EDITAR CONFIGURACIÓN AL RETOMAR (2026-06-19)

> El backend implementó `PUT /v1/configurarRifa/{id}` (campos opcionales: `fechaHoraLimite`, `tipo`, `mesReferencia`).
> El front ahora permite actualizar la fecha límite de una rifa ya creada, sin crear un duplicado.

### Problema resuelto

**`AgregarRifaComponent`:** al retomar una rifa con `_retomar()`, el form se precargaba con `fechaHoraLimite` pero el usuario no tenía forma de guardar cambios — el botón "Guardar configuración" solo existe cuando `!rifaConfig?.id`. El valor modificado en el UI se perdía al salir.

**`RifaMesComponent`:** si el usuario volvía al "Paso 1: Mes" (botón "← Volver") con `rifaConfig` ya cargada, el botón "Crear rifa e importar" seguía visible y podía crear una rifa DUPLICADA.

### Fix

**`rifa.service.ts`:** nuevo método `actualizarConfiguracion(id, patch)` → `PUT /v1/configurarRifa/{id}`.

**`agregar-rifa.component.ts`:**
- Nuevo campo `editandoConfig = false`
- Nuevo método `actualizarConfiguracion()` que llama el PUT con `fechaHoraLimite`

**`agregar-rifa.component.html`:** el `rf-saved-badge` ahora tiene botón "✏️ Editar fecha". Al abrirse, muestra campo de fecha + botón "💾 Guardar cambios" + error alert.

**`agregar-rifa.component.scss`:** nueva clase `.rf-edit-config` (panel índigo sutil).

**`rifa-mes.component.ts`:**
- Nuevos campos `editandoConfig = false`, `savingConfigEdit = false`
- Nuevo método `actualizarConfiguracion()` — actualiza `fechaHoraLimite` y `mesReferencia`
- `nueva()` resetea ambos campos

**`rifa-mes.component.html`:** Paso 1 ahora tiene dos modos:
- Sin `rifaConfig?.id`: flujo de creación normal (sin cambio)
- Con `rifaConfig?.id`: badge "Rifa #X" + botón "✏️ Editar fecha / mes" + botón "→ Continuar". El form de creación y el botón "Crear rifa e importar" están ocultos — previene crear duplicados al volver al Paso 1.

**`rifa-mes.component.scss`:** nuevas clases `.rm-saved-badge` y `.rm-edit-config` con variantes dark mode.

**Archivos modificados:**
- `src/app/rifas/service/rifa.service.ts` → `actualizarConfiguracion()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `editandoConfig`, `actualizarConfiguracion()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → edit badge en Sección A
- `src/app/rifas/agregar-rifa/agregar-rifa.component.scss` → `.rf-edit-config`
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `editandoConfig`, `savingConfigEdit`, `actualizarConfiguracion()`, `nueva()`
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → Paso 1 con modo crear/editar
- `src/app/rifas/rifa-mes/rifa-mes.component.scss` → `.rm-saved-badge`, `.rm-edit-config`, dark mode

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX MÓDULO RIFAS — CHECKBOX "ES DE PRUEBA" + SWAL EN LUGAR DE `confirm()` (2026-06-19)

**Síntoma:** al llegar al Paso 4 (Ruleta) o Paso 5 (Ganador) con una rifa `esPrueba=true`, el checkbox "🧪 Es de prueba" ya venía marcado (correcto). Pero al dar clic para desmarcarlo (pasar a sorteo real), el browser mostraba el diálogo nativo `confirm()` con la leyenda "localhost:4200 dice: ..." — visualmente feo y fuera de lugar.

**Causa secundaria:** con Swal asíncrono, el checkbox podía parpadear brevemente (el browser lo desmarca visualmente antes de que Swal responda) porque el binding era `(change)`. Usando `(click)` + `$event.preventDefault()` el browser no cambia el estado visual del checkbox; solo lo cambia Angular cuando `rifaConfig.esPrueba` efectivamente cambia.

**Fix:**
- `agregar-rifa.component.ts` y `rifa-mes.component.ts`: `import Swal from 'sweetalert2'`; en `toggleModoPrueba()`, se reemplazó el `confirm()` sincrónico por `Swal.fire({ icon: 'warning', title: '¿Pasar a sorteo real?', ... }).then(result => { if (result.isConfirmed) ejecutar(); })`. La lógica del API call se extrajo a una función `ejecutar()` interna.
- `agregar-rifa.component.html`: 3 checkboxes `(change)` → `(click)="$event.preventDefault(); toggleModoPrueba()"`.
- `rifa-mes.component.html`: 2 checkboxes `(change)` → `(click)="$event.preventDefault(); toggleModoPrueba()"`.

**UX resultante:** checkbox siempre refleja `rifaConfig.esPrueba` (checked = prueba, unchecked = real). Al intentar desmarcarlo, aparece Swal de confirmación sin que el checkbox cambie. Si confirma → API → `rifaConfig.esPrueba = false` → Angular re-renderiza el checkbox como unchecked.

**Archivos modificados:**
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → import Swal, `toggleModoPrueba()` con Swal
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → import Swal, `toggleModoPrueba()` con Swal
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → 3 checkboxes `(click)` + preventDefault
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → 2 checkboxes `(click)` + preventDefault

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO RIFAS — SELECT `palabraClave` VACÍO EN SECCIÓN C (2026-06-19)

**Síntoma:** en `/rifas/agregar`, Sección C "Participantes", al hacer clic en "+ Agregar" el select de "Palabra clave" aparecía vacío (solo el placeholder deshabilitado "Selecciona palabra…").

**Causa:** `palabrasClave: string[]` se puebla desde `variantesRifa.map(v => v.palabraClave)`. Si el usuario no ha configurado ningún premio en Sección B (rifa nueva o retomada sin premios), el array es `[]` y el select no tiene opciones. El usuario no tenía forma de saber POR QUÉ estaba vacío.

**Fix:** en `agregar-rifa.component.html`, cuando `mostrarFormParticipante && palabrasClave.length === 0` se muestra un aviso `⚠️ Primero configura al menos un premio en la Sección B...` en vez del formulario. El formulario solo se muestra cuando `palabrasClave.length > 0`.

**Archivos modificados:**
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → guard `palabrasClave.length > 0` en el `<form>` de participantes

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX GLOBAL — MANEJADORES DE ERROR SIN MENSAJE DEL BACKEND (2026-06-19)

**Problema:** múltiples componentes tenían manejadores `error` que:
- (a) Solo llamaban `console.error` — el usuario no veía ningún feedback
- (b) Llamaban `Swal.fire` pero sin leer `err?.error?.mensaje` del backend — el mensaje de regla de negocio se perdía

**Patrón aplicado en todos los casos:**
```typescript
error: (err) => {
  Swal.fire({ icon: 'error', title: 'Título', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Fallback.' });
}
```
- `err?.error?.mensaje` → Proyecto-Key (9091) usa `mensaje` en español
- `err?.error?.message` → Spring Boot `BasicErrorController` (404s) y Micro Imágenes (9096) usan `message` en inglés

**Archivos modificados:**

| Archivo | Cambio |
|---|---|
| `src/app/gastos/all/all.component.ts` | + import Swal; `console.error` → Swal en `getData()` y `buscarProductoSinKey()` |
| `src/app/productos/producto/busca/busca.component.ts` | + import Swal; `console.error` → Swal en `buscarPorNombreCodigoPostal()` |
| `src/app/usuarios/usuarios/buscar-usuarios/buscar-usuarios.component.ts` | + import Swal; `console.error` → Swal en `buscarProductoSinKey()` |
| `src/app/usuarios/usuarios/all-usuarios/all-usuarios.component.ts` | `console.error` → Swal (ya tenía import) |
| `src/app/productos/producto/all/all.component.ts` | `console.error` → Swal en reload después de eliminar + infinite scroll |
| `src/app/productos/producto/detalle-producto/detalle-producto.component.ts` | `console.error` → Swal en `eliminarImagen()` |
| `src/app/ventas/venta-producto/add-venta/add-venta.component.ts` | `console.error` → Swal en `getDataBuscador()` y `buscarProductos()` |
| `src/app/pedidos/historial-mp/historial-mp.component.ts` | + import Swal; `error: () => { this.cargando = false; }` → + Swal en los 4 casos del switch |
| `src/app/admin/cache/cache.component.ts` | Swal sin `text` → + `text: err?.error?.mensaje` |
| `src/app/admin/config-negocio/config-negocio.component.ts` | `error: () => {}` → Swal en carga inicial; + `text: err?.error?.mensaje` en toggle/horario/contactos |
| `src/app/documentos/carga-archivo/carga-archivo.component.ts` | Swal sin `text` → + `text: err?.error?.mensaje` en `subir()` |
| `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` | `error: ()` → `error: (err)` + backend msg en `eliminarDetalle()` |
| `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` | `error: ()` → `error: (err)` + backend msg en `cancelarConMotivo()` |
| `src/app/variante/venta-directa/venta-directa.component.ts` | `error: ()` → `error: (err)` + backend msg en `cobrar()` |
| `src/app/clietes/clientes-add/clientes-add.component.ts` | `error: ()` → `error: (err)` + backend msg en `saveCliente()` |
| `src/app/productos/producto/add/add.component.ts` | `error: ()` → `error: (err)` + backend msg en `guardar()` |
| `src/app/palabras-clave/gestion/gestion-palabras-clave.component.ts` | `error: () => { this.cargando = false; }` → + Swal en `cargar()` |

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX GLOBAL — `throwError` EN RXJS 6 + NORMALIZACIÓN DE BODY EN `TokenInterceptor` (2026-06-19)

**Causa raíz 1 — RxJS 6 no acepta factory functions en `throwError`:**
El proyecto usa RxJS **6.6.7**. En RxJS 6, `throwError(() => valor)` tira LA FUNCIÓN misma como error — no llama la factory. En RxJS 7+ sí la llama. El `TokenInterceptor` usaba `throwError(() => error)` (sintaxis de RxJS 7), así que TODOS los componentes del proyecto recibían una función vacía como `err` en vez del `HttpErrorResponse`. Resultado: `err.status`, `err.error`, `err.error.mensaje` — todos `undefined` — siempre se mostraba el mensaje de fallback.

**Fix 1:** cambiar todos los `throwError(() => x)` → `throwError(x)` (valor directo, RxJS 6 API).

**Causa raíz 2 — body de error como string si backend omite Content-Type:**
Si el backend no envía `Content-Type: application/json` en respuestas de error, Angular no parsea el body — `err.error` llega como string `'{"mensaje":"..."}'` y `err.error.mensaje` es `undefined`.

**Fix 2:** `TokenInterceptor.intercept()` — si `err.error` es string y parsea como JSON válido, se crea un nuevo `HttpErrorResponse` con el body ya como objeto:
```typescript
if (error.error && typeof error.error === 'string') {
  try {
    const parsed = JSON.parse(error.error);
    normalizedError = new HttpErrorResponse({ error: parsed, headers, status, statusText, url });
  } catch { /* no es JSON válido — dejar como estaba */ }
}
```

**Nota sobre `requests.js:1 POST ... 400 (Bad Request)` en consola:** es comportamiento automático del navegador para cualquier respuesta 4xx/5xx — no es código nuestro, no se puede suprimir, es normal.

**Archivo modificado:** `src/app/token/TokenInterceptor .ts` → todos los `throwError(() => x)` → `throwError(x)` + normalización de body antes del check 401.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO RIFAS — RIFA DIARIA: WIZARD MULTI-RIFA + SWAL PRUEBA + BUSCAR REDISEÑADO (2026-06-19)

> Solo para rifa DIARIA (`AgregarRifaComponent`). `RifaMesComponent` sin tocar.

### 1. Quitar "Rifas activas — retomar" de `AgregarRifaComponent`
Lista de retomar eliminada del componente — ese flujo queda centralizado en `buscar-rifa`. El campo `rifasActivas` y el método `cargarRifasActivas()` fueron removidos. `retomarRifa()` también eliminado (ya no era necesario).

### 2. Wizard multi-rifa (+ Agregar otra rifa)
Cuando el admin termina de configurar premios y participantes de una rifa (Secciones B y C completas), aparece el botón **"➕ Agregar otra rifa"** encima del botón "🎡 Iniciar rifa". Al pulsarlo:
- La rifa actual queda guardada en `rifasAnteriores[]` (colapsada como un resumen al tope de la página)
- Los formularios se limpian para la siguiente rifa
- Cada entrada colapsada tiene un botón **"✏️ Editar"** → `editarRifaAnterior(idx)` → recarga esa rifa con `_retomar()`, swapeando si había una activa
- Botón **"📋 Copiar de otra rifa"** en el header de Sección C → `copiarDeRifaAnterior()` → `POST /v1/concursante/copiarDeRifa` (nuevo método en `RifaService`)

### 3. Swal antes de `sortear()` cuando `esPrueba=true`
`sortear()` ahora extrae la lógica HTTP a `ejecutar()`. Si `rifaConfig.esPrueba === true`, primero muestra un Swal de advertencia ("⚠️ Esta rifa es de PRUEBA — Los resultados no son definitivos"). Solo llama `ejecutar()` si el usuario confirma.

### 4. Ocultar reiniciar en DIARIA vencida
Getter `puedeReiniciar`: devuelve `false` si `tipo === 'DIARIA' && !activa`. Los dos botones de reiniciar en el paso resumen llevan `*ngIf="puedeReiniciar"`.

### 5. `buscar-rifa` — rediseño completo
- Reemplaza sistema de 3 tabs (hoy/todas/buscar) por selector **☀️ Diaria / 📅 Mensual**
- DIARIA: filtro por día (default: hoy) → `buscar?tipo=DIARIA&desde=X&hasta=X`
- MENSUAL: filtro por mes (default: mes actual) → `buscar?tipo=MENSUAL&mesReferencia=X`
- Badges dinámicos: `badgeEstado()` → 🟢 Activa / ⚫ Completada / 🔴 Vencida + colores de header de card
- Botones condicionales: **"🎡 Ir a ejecución"** solo si `activa=true`; **"📋 Ver detalle"** siempre; **"🔄 Recuperar"** solo si `tipo=MENSUAL && !activa`
- Panel de detalle (overlay modal) con historial de ganadores → `getEstado(id)`

**Archivos modificados:**
- `src/app/rifas/service/rifa.service.ts` → `copiarDeRifa()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → remove `rifasActivas`/`cargarRifasActivas`/`retomarRifa`; add multi-rifa wizard; Swal en `sortear()`; `puedeReiniciar` + `puedeAgregarOtraRifa`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → multi-rifa UI; `*ngIf="puedeReiniciar"` en botones resumen
- `src/app/rifas/buscar-rifa/buscar-rifa.component.ts` → reescritura completa
- `src/app/rifas/buscar-rifa/buscar-rifa.component.html` → reescritura completa
- `src/app/rifas/buscar-rifa/buscar-rifa.component.scss` → nuevas clases de badges, botones, detalle overlay, historial

**Verificado con `ng build --configuration=development` sin errores.**

---

## REFACTOR MÓDULO RIFAS — ACORDEÓN UNIFICADO EN `AgregarRifaComponent` (2026-06-19)

> `RifaMesComponent` sin tocar en ningún momento.

### Arquitectura anterior vs nueva

**Antes:** tab-bar (`rf-tabs`) con 4 pestañas — Configurar / Ruleta / Transición / Resumen. Configurar estaba FUERA del acordeón. Al retomar, los datos cargaban en el form superior.

**Ahora:** acordeón único (`rf-acordeon`) que engloba TODO el contenido — configuración Y sorteo. El panel activo siempre está expandido; los demás (`rifasAnteriores`) aparecen colapsados debajo.

### Flujo 1 — Crear rifas nuevas
1. Form activo arriba (Sección A: tipo/fecha/palabra/prueba, Sección B: premios, Sección C: participantes)
2. "Guardar configuración" → guarda en backend
3. "➕ Agregar otra rifa" → rifa actual colapsa a acordeón; form se limpia
4. Repetir para más rifas
5. "🎡 Ir al sorteo" → modo sorteo; `modoSorteo = true`

### Flujo 2 — Modo sorteo
- Panel activo muestra la ruleta canvas + premio + elegibles
- Rifas anteriores colapsadas con CTA "🎡 Ver sorteo ►"
- Clic en colapsada → carga esa rifa con `_retomar()` → va directo a `paso='ruleta'` (porque `modoSorteo=true`)

### Flujo 3 — Retomar (desde `buscar-rifa`)
- Rifas existentes cargan en el acordeón (panel activo = la primera)
- `modoSorteo = false` → `_retomar()` fuerza `paso='configurar'` aunque la rifa esté completa
- Config precompletada editable antes de ir al sorteo
- CTA de colapsadas: "📋 Ver config ►" mientras `modoSorteo=false`

### Flag `modoSorteo`
| Valor | Quién lo establece | Efecto en `_retomar()` |
|---|---|---|
| `false` (default) | `nuevaRifa()`, `agregarOtraRifa()` | fuerza `paso='configurar'` siempre |
| `true` | `irARuleta()` | permite `paso='ruleta'` si rifa completa |

### Estructura HTML (acordeón)
```
<div class="rf-acordeon">
  <div class="rf-acord-item rf-acord-item--open">   ← panel activo (siempre abierto)
    <div class="rf-acord-hdr rf-acord-hdr--active">
      [título: "✨ Nueva rifa" o "Rifa #ID" + badge prueba + pill estado]
    </div>
    <div class="rf-acord-body">
      <div *ngIf="paso === 'configurar'">     ← Secciones A, B, C + botones
      <div *ngIf="paso === 'ruleta'">         ← canvas + elegibles + descartados
      <div *ngIf="paso === 'transicion'">     ← pantalla ganador en vivo
      <div *ngIf="paso === 'resumen'">        ← resumen final
    </div>
  </div>
  <div *ngFor="let a of rifasAnteriores">    ← colapsadas, clic → editarRifaAnterior(i)
</div>
```

### SCSS nuevo (reemplaza `rf-tabs`)
- `.rf-acordeon`: contenedor con `border-radius: 14px`, `overflow: hidden`, `border: 1.5px solid var(--card-border)`
- `.rf-acord-item`: fila colapsada; hover suave con `var(--form-section-bg)`
- `.rf-acord-item--open`: panel activo, `cursor: default`
- `.rf-acord-hdr`: flex con pill de estado y CTA condicional por `modoSorteo`
- `.rf-acord-hdr--active`: fondo índigo sutil, `border-bottom: 1px solid rgba(99,102,241,0.2)`
- `.rf-btn--secondary` / `.rf-btn--add-rifa`: botón "Agregar otra rifa"

**Archivos modificados:**
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → elimina `rf-tabs`, todo dentro de `rf-acordeon`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `modoSorteo` field; `irARuleta()` lo activa; `_retomar()` lo respeta; `nuevaRifa()` + `agregarOtraRifa()` lo resetean a `false`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.scss` → reemplaza bloque `rf-tabs` con clases `rf-acordeon`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX CARRITO — FLUJOS SEPARADOS CLIENTE vs ADMIN (2026-06-30)

> Complemento al "FEAT CARRITO → VENTA DIRECTA" de sesiones anteriores.
> Detalle completo de decisiones en `BUGS_FRONT_CARRITO_VENTA.md`.

**Reglas de negocio definitivas:**

- **Cliente (rol user):** solo puede generar el pedido desde el carrito. No ve selector de tipo de
  pedido ni campo de cliente. Cuando va al local a recoger, el admin retoma el pedido desde `/pedidos`
  y procesa la venta directa desde ahí.
- **Admin (rol admin):** el carrito tiene solo "💰 Cobrar ahora (Venta Directa)" como CTA principal.
  "📋 Generar pedido" queda oculto para admin. Selector de tipo y campo de cliente van exclusivamente
  en `/variantes/venta-directa`.

**Cambios en `venta-variante.component.html`:**
- "📋 Generar pedido" → `*ngIf="!isAdminUser"` (solo usuario)
- Card "Tipo de pedido" → `*ngIf="false"` (oculto para todos — va en venta directa)
- Card "Asignar cliente" → `*ngIf="false"` (oculto para todos — va en venta directa)
- Fix previo: `clienteSeleccionado?.campo` con optional chaining en la card oculta

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT CARRITO → VENTA DIRECTA PARA ADMIN (2026-06-30)

> Flujo 3 de `REQUERIMIENTO_BACK_VENTA_DIRECTA_CREDITO.md` — cambio solo de front, sin tocar back.

**Comportamiento:** cuando el admin está en `/variantes/carrito`, aparece un nuevo botón
**"💰 Cobrar ahora (Venta Directa)"** junto a "📋 Generar pedido". Al pulsarlo navega a
`/variantes/venta-directa` y los items del carrito se pre-cargan automáticamente como líneas
de venta. Al confirmar la venta, el carrito se limpia solo.

**Regla:** la pre-carga solo ocurre si `isAdminUser === true` y `lineas` está vacío — no
sobrescribe una venta directa que el admin ya esté armando manualmente.

**Archivos modificados:**
- `src/app/variante/venta-variante/venta-variante.component.ts` → `irAVentaDirecta()`
- `src/app/variante/venta-variante/venta-variante.component.html` → botón "💰 Cobrar ahora"
- `src/app/variante/venta-directa/venta-directa.component.ts` → inyecta `CarritoVarianteService`;
  `ngOnInit` pre-carga items del carrito; `limpiarTodo()` limpia el carrito si vino de ahí.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX VENTA DIRECTA — FORMA DE PAGO EN MODO CRÉDITO + ENGANCHE INICIAL (2026-06-30)

> BUG 4 de `BUGS_FRONT_CARRITO_VENTA.md`. Respuestas R-D1..R-D5 del usuario.

**Problema:** al seleccionar "Apartado" o "Ir pagando" en `/variantes/venta-directa`, el dropdown de
forma de pago desaparecía porque estaba dentro de `*ngIf="!esCredito"`. El admin no podía indicar
si el cliente dejaba un enganche (pago inicial parcial).

**Decisión de diseño:** en modo crédito se usan 2 botones simples (EFECTIVO / TRANSFERENCIA) en vez
del `p-dropdown` estructurado con cuotas/meses. TARJETA se excluye porque cada cobro con tarjeta
genera comisión al negocio — no aplica a crédito. El dropdown contado se conserva solo para `!esCredito`.

**Métodos aceptados en crédito:** EFECTIVO y TRANSFERENCIA únicamente. TARJETA excluida en ambas pantallas
(venta-directa al crear el crédito y `/abonos` al registrar abonos posteriores).

**Pendiente back:** `AbonoServiceImpl.registrarAbono()` debe validar que `metodoPago != TARJETA` cuando
el pedido sea APARTADO o FIADO (el front ya lo filtra, pero el back aún no rechaza TARJETA si llegara).

**Flujo de enganche (dos pasos):**
1. `POST /v1/ventas/save` con `tipoPedido: APARTADO|FIADO` → devuelve `pedidoId`
2. Si `montoInicial > 0` → `POST /v1/abonos/{pedidoId}` con `{ monto, metodoPago, usuarioId, fechaPago }`
3. Swal con texto del monto y botón "💳 Ir a Créditos / Abonos" → navega a `/abonos`

**Si `montoInicial === 0`:** solo el paso 1, Swal sin monto, mismo link a `/abonos`.

**Campo de motivo al cancelar:** ya implementado en back (BD `motivo_cancelacion VARCHAR(30)`,
`CancelarAbonoRequest.motivo?: string`). Pendiente: agregar `input[maxlength=30]` al modal de
cancelación en `/abonos` para que el admin escriba el motivo. Ver DN-2 en `BUGS_FRONT_CARRITO_VENTA.md`.

**Archivos modificados:**
- `src/app/variante/venta-directa/venta-directa.component.html` → sección crédito con 2 botones de método + input `montoInicial`
- `src/app/variante/venta-directa/venta-directa.component.ts` → `metodosCredito: ['EFECTIVO','TRANSFERENCIA']`; inyecta `AbonoService`; `ejecutarVenta()` registra abono si `monto > 0`; `limpiarTodo()` resetea campos de crédito
- `src/app/variante/venta-directa/venta-directa.component.scss` → `.vd-metodo-btns`, `.vd-metodo-btn`, `.vd-monto-input`
- `src/app/abonos/abonos.component.ts` → `metodos: ['EFECTIVO','TRANSFERENCIA']` (TARJETA eliminada)

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT VENTA DIRECTA — CRÉDITO (APARTADO / IR PAGANDO) EN TODOS LOS PAGOS (2026-06-30)

> Backend ya implementado (ver `REQUERIMIENTO_BACK_VENTA_DIRECTA_CREDITO.md`).
> `POST /v1/ventas/save` acepta `tipoPedido: APARTADO|FIADO` → crea solo Pedido y devuelve `pedidoId`.

**Cambios realizados:**

1. **`abono.model.ts`** → `AbonoRequest.usuarioId?: number` (requerido por back al liquidar); nueva interfaz `AbonoRegistrarResponse { estadoPedido, saldoRestante }`.
2. **`abono.service.ts`** → `registrarAbono()` ahora retorna `Observable<ResponseGeneric<AbonoRegistrarResponse>>`.
3. **`abonos.component.ts`** → inyecta `AuthService` para obtener `idUsuario`; envía `usuarioId` en el body; usa `res.data.estadoPedido === 'PAGADO'` y `res.data.saldoRestante` para actualizar el estado local.
4. **`variante.service.ts`** → `IVentaDirectaRequest`: `pagosYMesesId?` (opcional), `tipoPedido?`, `observaciones?`. `IVentaDirectaResponse`: `pedidoId: number | null`, `ventaId: number | null`, `tipoPago/descripcionPago` nullable.
5. **`venta-directa.component.ts`** → inyecta `Router`; campo `tipoPedido: 'NORMAL'|'APARTADO'|'FIADO'`; getter `esCredito`; `puedeCobrar` acepta crédito sin `pagosYMesesId`; `seleccionarCredito()` activa/desactiva; `ejecutarVenta()` envía `tipoPedido`/`observaciones` (sin `pagosYMesesId` en crédito), maneja `res.pedidoId` → Swal + navigate `/abonos`.
6. **`venta-directa.component.html`** → botones "📦 Apartado" / "💳 Ir pagando" debajo del dropdown de pago; textarea observaciones; aviso "solo efectivo"; dropdown meses oculto cuando crédito.
7. **`venta-directa.component.scss`** → `.vd-credit-divider`, `.vd-credit-btns`, `.vd-btn-credit`, `.vd-btn-credit--active`, `.vd-observaciones`, `.vd-credit-info`.

**Flujo crédito:** Admin selecciona APARTADO o IR PAGANDO (botones toggle) → `pagosYMesesId` no se envía → back crea Pedido y devuelve `pedidoId` → Swal "✅ Apartado/Ir pagando registrado" con botón "💳 Ir a Créditos / Abonos" → navega a `/abonos`.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT MÓDULO ABONOS — CANCELAR, TRANSFERIR Y TAB CANCELADOS (2026-06-30)

> Flujos G, H e I documentados en `DOCUMENTO_BACK_VENTAS_CREDITO.md` secciones 12-17.
> Backend implementó 3 endpoints nuevos. El front los conecta aquí.

### Flujo completo de crédito (APARTADO / IR PAGANDO)

**Hay 3 formas de registrar un pedido en crédito:**
1. **Venta Directa** (`/variantes/venta-directa`) — admin busca variantes, elige "📦 Apartado" o "💳 Ir pagando" → `POST /v1/ventas/save` con `tipoPedido` → devuelve `pedidoId` → Swal con link a `/abonos`
2. **Carrito → Venta Directa** (`/variantes/carrito` → "💰 Cobrar ahora") — mismo endpoint, el carrito se pre-carga automáticamente
3. **Carrito normal** (`/variantes/venta`) — admin elige APARTADO/FIADO → `POST /v1/pedidos/savePedido` con `tipoPedido` → devuelve pedido

**A partir de aquí todos convergen en `/abonos`:**

| Tab | Endpoint | Qué muestra |
|---|---|---|
| 📋 Cuentas por cobrar | `GET /v1/abonos/reporte/estado-cuenta` | Pedidos con saldo pendiente |
| ✅ Liquidados | `GET /v1/abonos/reporte/pagados` | Pedidos ya pagados |
| ✖ Cancelados | `GET /v1/abonos/reporte/cancelados` | Pedidos cancelados |

**Flujo G — Cancelar APARTADO** (cliente no terminó de pagar):
- Botón "✖ Cancelar" en cada card de "Cuentas por cobrar"
- Swal diferenciado: APARTADO → "Se devolverá el stock" / FIADO → "La deuda quedará registrada"
- `PUT /v1/abonos/{pedidoId}/cancelar` con `{ motivo?: string }` (texto libre, máx. 30 chars)
- APARTADO: stock se devuelve + saldo a favor visible en tab "Cancelados"
- FIADO: stock NO se devuelve + deuda pendiente visible en tab "Cancelados"

**Flujo I — Transferir saldo** (solo APARTADO cancelado con `saldoAFavor > 0`):
- Botón "↪ Aplicar a otro producto" en tab Cancelados (solo si `puedeTransferir === true`)
- Modal con buscador de variantes (debounce 400ms, mismo `GET /v1/variantes/buscar`)
- Precio precargado del buscador pero editable; muestra "⚠ precio editado manualmente" si cambia
- Calcula `totalNuevo` y `saldoPendiente` en tiempo real
- `POST /v1/abonos/{pedidoIdOrigen}/transferir` → crea nuevo pedido APARTADO con el saldo ya aplicado
- Si `estadoNuevoPedido === 'PAGADO'` → el pedido queda liquidado en el mismo call

### Interfaces nuevas (`abono.model.ts`)
`CancelarAbonoRequest`, `CancelarAbonoResponse`, `TransferirAbonoRequest`, `TransferirAbonoResponse`, `ReporteCancelado`

### Métodos nuevos (`abono.service.ts`)
`cancelar(pedidoId, body)`, `transferir(pedidoIdOrigen, body)`, `reporteCancelados()`

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/abonos/models/abono.model.ts` | +5 interfaces; `AbonoResponse` ahora tiene `estadoPedido?` y `saldoRestante?` opcionales |
| `src/app/abonos/service/abono.service.ts` | +3 métodos: `cancelar`, `transferir`, `reporteCancelados` |
| `src/app/abonos/abonos.component.ts` | Tab `cancelados`; `cancelarPedido()`; modal transferencia con `abrirModalTransferencia()`, `seleccionarVarianteTransferencia()`, `aplicarTransferencia()`; inyecta `VarianteService` para búsqueda debounce |
| `src/app/abonos/abonos.component.html` | Tab "✖ Cancelados" con cards de cancelados; botón "✖ Cancelar" en cuentas por cobrar; modal de transferencia completo |
| `src/app/abonos/abonos.component.scss` | `.ab-badge--cancelado`, `.ab-card--cancelado`, `.ab-btn--cancelar`, `.ab-btn--transferir`, `.ab-monto__val--favor`, `.ab-transfer-search`, `.ab-transfer-dropdown`, `.ab-transfer-resumen`, `.ab-hint--warn` |

### Fix en registrarAbono (D-4)
Al liquidar un pedido (`estadoPedido === 'PAGADO'`) ahora se hace `cargarCuenta()` (reload del server) en vez de filtrar el array local — evita desfase si otro abono llegó en paralelo.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX BUSCADOR PRODUCTOS — MÍNIMO 3 CARACTERES (2026-06-30)

**Síntoma:** en `/productos/buscar`, escribir exactamente 3 caracteres no disparaba la búsqueda. Requería 4+.

**Causa:** `all.component.ts` line 75 usaba `filter(texto => texto.length > 3)` (estrictamente mayor).

**Fix:** cambiado a `filter(texto => texto.length >= 3)` — consistente con todos los demás buscadores del proyecto (`/variantes/buscar` usa `termino.length < 3` como guard).

**Archivo modificado:** `src/app/productos/producto/all/all.component.ts` → pipe del `keyUpSubject`

---

## FIX VENTA DIRECTA — MONTO RECIBIDO + CAMBIO EN VENTA AL CONTADO Y ENGANCHE (2026-07-01)

**Síntoma:** en `/variantes/venta-directa`, al cobrar en efectivo no había campo para indicar
el billete que da el cliente ni se calculaba el cambio a devolver.

**Cambios en `venta-directa.component.ts`:**
- Campos nuevos: `montoDadoContado = 0` (venta normal efectivo), `montoDadoEnganche = 0` (crédito)
- Getter `esEfectivoContado` → detecta `tipoPagoActivo.formaPago.toUpperCase() === 'EFECTIVO'`
- Getter `cambioContado` → `montoDadoContado - totalVenta` (cuando mayor)
- Getter `cambioEnganche` → `montoDadoEnganche - montoInicial` (cuando mayor y monto > 0)
- Ambos campos se resetean en `limpiarTodo()` y `seleccionarTipoPago()`

**Cambios en `venta-directa.component.html`:**
- **Venta al contado:** debajo del dropdown de forma de pago, cuando `esEfectivoContado && !esCredito && lineas.length > 0` → campo "💵 Monto recibido" + cuadro verde "Cambio a devolver: $X" o rojo "monto insuficiente"
- **Enganche de crédito:** debajo del input de monto del enganche, cuando `metodoPagoCredito === 'EFECTIVO' && montoInicial > 0` → mismo patrón

**Cambios en `venta-directa.component.scss`:**
- `.vd-cambio` (verde) y `.vd-cambio--warn` (rojo) + variantes dark mode

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO ABONOS — NF-1, NF-2, BUG 5 (2026-07-01)

### NF-1 — Bug en `cobrar()` cuando hay cliente sin registro

**Síntoma:** al agregar un cliente sin registro con el modal y luego cobrar, el front ignoraba
el `clienteSinRegistroModal` y llamaba a `buscarClientePorIdUsuario()` — enviaba el `clienteId`
del admin junto a `clienteSinRegistroDto`, cuando el back los trata como mutuamente excluyentes.

**Fix en `venta-directa.component.ts`:**
- `cobrar()`: ahora verifica `clienteSinRegistroModal` PRIMERO — si existe, llama
  `ejecutarVenta(0)` directamente sin buscar el cliente del admin. `clienteId=0` +
  `clienteSinRegistroDto` → back usa el DTO.
- `limpiarTodo()`: ahora resetea `clienteSinRegistroModal = null` y `clienteForm.reset()`.

### NF-2 — Badges APARTADO/FIADO en mis-pedidos

**Cambios:**
- `IPedidoQuery.model.ts` → campo `tipoPedido?: string` agregado al modelo
- `mis-pedidos.component.html` → `card-head-right` con badges condicionales:
  - `tipo-badge--apartado` (naranja) cuando `tipoPedido === 'APARTADO'`
  - `tipo-badge--fiado` (índigo) cuando `tipoPedido === 'FIADO'`
- `mis-pedidos.component.scss` → `.card-head-right`, `.tipo-badge`, `&--apartado`, `&--fiado`

### NF-2 — Botón "Registrar abono" + formulario en detalle-pedido

**Contexto:** el admin puede ver el detalle de un pedido APARTADO/FIADO y registrar un abono
directamente sin tener que navegar a `/abonos`.

**Cambios en `detalle-pedido.component.ts`:**
- Inyecta `AbonoService` y `AuthService`
- Getter `esCredito` → `tipoPedido === 'APARTADO' || 'FIADO'`
- Campos: `mostrarFormAbono`, `registrandoAbono`, `abonoForm`, `montoDado`, getter `cambio`
- Métodos: `abrirFormAbono()`, `cancelarFormAbono()`, `registrarAbono()` (mismo patrón que
  `/abonos` — incluye `montoDado` para cambio, muestra saldo restante en Swal)
- Implementa `OnDestroy` con `destroy$` para `takeUntil` en `authService.userId$`

**Cambios en `detalle-pedido.component.html`:**
- Badge `dp-tipo-badge--apartado` / `dp-tipo-badge--fiado` en el header
- Bloque `dp-abono-wrap` visible cuando `esCredito`:
  - Botón "💳 Registrar abono" → despliega form inline
  - Form: Monto, Método (EFECTIVO/TRANSFERENCIA), Monto recibido + cambio (solo EFECTIVO), Fecha, Nota
  - Botones Cancelar / Guardar abono

**Cambios en `detalle-pedido.component.scss`:**
- `.dp-tipo-badge`, `.dp-abono-wrap`, `.dp-btn-abono`, `.dp-abono-form`, `.dp-metodo-btns`,
  `.dp-cambio`, `.dp-btn-cancelar`, `.dp-btn-guardar`, `:host-context(body.theme-dark)`

### BUG 5 — Stock devuelto al cancelar APARTADO

`abonos.component.ts → cancelarPedido()`: el `next` handler lee `res?.data?.stockDevuelto` y
agrega al mensaje de éxito " El stock fue devuelto — el buscador de variantes mostrará el
dato actualizado." cuando es `true`.

**Archivos modificados (esta sección):**
- `src/app/variante/venta-directa/venta-directa.component.ts` → `cobrar()`, `limpiarTodo()`
- `src/app/pedidos/mis-pedidos/models/IPedidoQuery.model.ts` → `tipoPedido?: string`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → badges tipo pedido
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.scss` → `.card-head-right`, `.tipo-badge`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → form abono inline
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` → badge + form abono
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.scss` → estilos form abono
- `src/app/abonos/abonos.component.ts` → `cancelarPedido()` con `stockDevuelto`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX MÓDULO ABONOS — RENOMBRAR FIADO + SOLO EFECTIVO/TRANSFERENCIA + SWAL CON LINK + MOTIVO CANCELACIÓN + MONTO DADO (2026-06-28 / 2026-07-01)

**Cambios tras prueba en vivo:**

1. **"Fiado" → "Ir pagando"** en `venta-variante.component.html` — label más claro para el cliente
2. **"Normal" → "Venta total"** — idem
3. **EFECTIVO + TRANSFERENCIA para crédito (sin TARJETA — cobra comisión):**
   - `venta-directa.component.ts`: `metodosCredito: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA']`
   - `abonos.component.ts`: `metodos: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA']`
   - Botones toggle en ambas pantallas para seleccionar método
4. **Swal post-pedido con link a `/abonos`:**
   - Cuando se guarda un pedido APARTADO o IR PAGANDO, se muestra Swal con botón "💳 Ir a Créditos / Abonos"
5. **DN-2 — Motivo de cancelación en Swal (maxlength 30):**
   - `abonos.component.ts → cancelarPedido()`: Swal usa `html:` con `<input id="swal-motivo">` para capturar el motivo; se lee con `document.getElementById` y se envía como `{ motivo }` al endpoint
6. **NF-3 — Monto dado por cliente + cambio en tiempo real (solo EFECTIVO):**
   - `abono.model.ts`: `AbonoRequest.montoDado?: number`
   - `abonos.component.ts`: campo `montoDado = 0`, getter `cambio` (diferencia), se resetea en `abrirModal()`, se envía en el body si `metodoPago === 'EFECTIVO'`; Swal de éxito muestra "Cambio al cliente: $X.XX" cuando aplica
   - `abonos.component.html`: campo "💵 Monto recibido (opcional)" visible solo cuando EFECTIVO, con alerta verde (cambio) o roja (monto insuficiente)
   - `abonos.component.scss`: `.ab-optional`, `.ab-cambio`, `.ab-cambio--warn` con variantes dark mode

**Pendiente de back (para NF-3):**
- `ALTER TABLE abono_pedido ADD COLUMN monto_dado DECIMAL(10,2) NULL` — hasta que se haga, el campo se envía pero no se persiste en BD

**Archivos modificados:**
- `src/app/variante/venta-variante/venta-variante.component.html` → labels, aviso efectivo
- `src/app/variante/venta-variante/venta-variante.component.ts` → Swal diferenciado para crédito
- `src/app/variante/venta-directa/venta-directa.component.ts` → `metodosCredito = ['EFECTIVO', 'TRANSFERENCIA']`
- `src/app/abonos/models/abono.model.ts` → `AbonoRequest.montoDado`
- `src/app/abonos/abonos.component.ts` → `metodos`, `montoDado`, `cambio`, `cancelarPedido()` con Swal html input, `registrarAbono()` con montoDado + txt cambio en Swal
- `src/app/abonos/abonos.component.html` → botones EFECTIVO/TRANSFERENCIA; campo monto recibido + alerta cambio (NF-3)
- `src/app/abonos/abonos.component.scss` → `.ab-hint`, `.ab-optional`, `.ab-cambio`, `.ab-cambio--warn`

**Verificado con `ng build --configuration=development` sin errores.**

---

## MÓDULO ABONOS — CRÉDITOS (APARTADO / FIADO) (2026-06-27)

> Implementación según `ABONOS_FRONT.md`. Backend: `proyecto-key (9091)`. Solo admin.

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `src/app/abonos/models/abono.model.ts` | Interfaces: `AbonoRequest`, `AbonoResponse`, `EstadoCuenta`, `PedidoPagado`, `MetodoPago`, `TipoPedidoAbono` |
| `src/app/abonos/service/abono.service.ts` | 4 endpoints: `registrarAbono()`, `obtenerAbonos()`, `reporteEstadoCuenta()`, `reportePagados()` |
| `src/app/abonos/abonos.component.ts` | Componente principal con dos tabs + modal de abono |
| `src/app/abonos/abonos.component.html` | UI: cards de cuentas por cobrar, modal, historial expandible, tab de liquidados |
| `src/app/abonos/abonos.component.scss` | Estilos con variables CSS (`--card-bg`, `--app-text`, etc.) + dark/light mode |
| `src/app/abonos/abonos.module.ts` | Módulo lazy (`CommonModule` + `FormsModule`) |
| `src/app/abonos/abonos-routing.module.ts` | Ruta raíz `''` → `AbonosComponent`, guards: `AuthGuard` + `AdminGuardGuard` |

### Archivos modificados

| Archivo | Qué se agregó |
|---|---|
| `src/app/app-routing.module.ts` | Ruta lazy `{ path: 'abonos', loadChildren: AbonosModule }` con guards admin |
| `src/app/navbar/navbar.component.html` | Link "💳 Créditos / Abonos" → `/abonos` dentro del accordion "Pedidos" (solo `*ngIf="isAdminUser"`) |
| `src/app/variante/models/pedido-variante.model.ts` | Campo opcional `tipoPedido?: 'NORMAL' \| 'APARTADO' \| 'FIADO'` en `IPedidoVarianteDTO` |
| `src/app/variante/venta-variante/venta-variante.component.ts` | Campo `tipoPedido = 'NORMAL'`; `armarYConfirmar()` ahora incluye `tipoPedido` y ajusta `estadoPedido` si es crédito |
| `src/app/variante/venta-variante/venta-variante.component.html` | Selector radio NORMAL/APARTADO/FIADO visible solo para admin, con aviso de link a `/abonos` |

### Endpoints conectados

| Método | URL | Método servicio |
|---|---|---|
| `POST` | `/v1/abonos/{pedidoId}` | `registrarAbono()` |
| `GET` | `/v1/abonos/{pedidoId}` | `obtenerAbonos()` |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | `reporteEstadoCuenta()` |
| `GET` | `/v1/abonos/reporte/pagados` | `reportePagados()` |
| `POST` | `/v1/pedidos/savePedido` | ya existía — ahora envía `tipoPedido` |

### Flujo de uso

1. Admin va a **"Venta de variantes"** (`/variantes/venta`) → elige tipo APARTADO o FIADO → genera el pedido
2. Admin va a **"💳 Créditos / Abonos"** (`/abonos`) desde el sidebar (accordion Pedidos)
3. Tab "Cuentas por cobrar": lista de pedidos APARTADO/FIADO con saldo pendiente
4. Botón "+ Abono" → modal (monto, método, fecha, nota) → `POST /v1/abonos/{id}`
5. Si `saldo <= 0` tras el abono → mensaje "¡Pedido liquidado!" + se quita de la lista automáticamente
6. Tab "Liquidados": lista read-only de pedidos ya pagados con historial de abonos expandible

### Comportamiento del modal de abono

- Validación local: `monto > 0` obligatorio
- Métodos de pago: botones toggle (EFECTIVO / TRANSFERENCIA / TARJETA)
- Al guardar: actualiza locales `totalPagado` y `saldo` sin recargar toda la lista
- Si el backend responde `400` (`err?.error?.mensaje`) → Swal de error con el mensaje del back
- Botón deshabilitado mientras `registrando = true` (guard de doble submit, patrón Lección #9)

### Lecciones / errores a no repetir

- **`FormsModule` en el módulo**: `abonos.module.ts` importa `FormsModule` porque el modal usa `[(ngModel)]`. Sin él, los inputs del modal no funcionan.
- **Guard de admin en la ruta**: `abonos-routing.module.ts` usa `canActivate: [AuthGuard, AdminGuardGuard]`. Sin ambos guards cualquier usuario podría acceder a `/abonos`.
- **`tipoPedido` en `estadoPedido`**: para APARTADO/FIADO el backend espera que `estadoPedido` tenga el MISMO valor que `tipoPedido` (no `'Pendiente'`). El código en `armarYConfirmar()` usa `esCreditoPedido ? this.tipoPedido : 'Pendiente'`.
- **Actualización local vs recarga**: el abono actualiza `totalPagado`/`saldo` localmente en el objeto del array. Si el backend cambia la lógica de cálculo de saldo, podría haber divergencia — en ese caso cambiar a recargar la lista completa con `cargarCuenta()`.

**Verificado con `ng build --configuration=development` sin errores.**

---

## MÓDULO CHAT EN VIVO (2026-06-16)

> Implementación de chat en tiempo real STOMP/WebSocket según `CHAT_FRONT_DEVELOPER.md`.

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `src/app/chat/models/chat.models.ts` | Interfaces TypeScript de todos los payloads |
| `src/app/chat/service/chat-live.service.ts` | Servicio visitante — gestiona conexión STOMP/SockJS, publica mensajes, expone `mensajes$`, `conectado$`, `sesionCerrada$`, `error$` |
| `src/app/chat/service/chat-admin.service.ts` | Servicio admin — gestiona conexión con JWT, lista de `SesionUI[]`, carga de historial REST, respuesta y cierre de sesiones |
| `src/app/chat/chat-usuario/chat-usuario.component.*` | Pantalla de chat para usuarios logueados, ruta `/chat` |
| `src/app/chat/chat-routing.module.ts` | Routing del módulo chat |
| `src/app/chat/chat.module.ts` | Módulo lazy-loaded del chat visitante |
| `src/app/admin/chat-admin/chat-admin.component.*` | Panel admin de chats activos, ruta `/admin/chat` |

### Archivos modificados

| Archivo | Qué se agregó |
|---|---|
| `src/app/app-routing.module.ts` | Ruta lazy `{ path: 'chat', loadChildren: ChatModule, canActivate: [AuthGuard] }` |
| `src/app/admin/admin-routing.module.ts` | `{ path: 'chat', component: ChatAdminComponent }` |
| `src/app/admin/admin.module.ts` | Declaración de `ChatAdminComponent` |
| `src/app/navbar/navbar.component.html` | Link "💬 Chat" para usuarios no-admin; link "💬 Chat en vivo" en submenu Admin |

### Arquitectura

- **Visitante:** ruta `/chat` → `ChatUsuarioComponent` → `ChatLiveService` (singleton). El nombre de usuario viene de `AuthService.userName$` (JWT `sub`). La sesión existe solo en memoria, no en localStorage.
- **Admin:** ruta `/admin/chat` → `ChatAdminComponent` → `ChatAdminService`. Conecta con JWT en `connectHeaders`. Panel split: lista de sesiones activas a la izquierda, historial del chat seleccionado a la derecha. Badge de mensajes no leídos se maneja 100% en el front.
- **WebSocket:** `${environment.api_Url}/ws` vía SockJS. Biblioteca `@stomp/stompjs` (ya instalada como `@stomp/ng2-stompjs` v8).

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX CHAT ADMIN — HISTORIAL Y SESIONES NO CARGABAN (2026-06-17)

**Síntoma:** al entrar al panel `/admin/chat`, el listado de sesiones activas aparecía vacío aunque
hubiera sesiones abiertas. Al seleccionar una sesión, el historial no se cargaba.

**Causa raíz:** `ChatAdminService.cargarSesiones()` y `cargarHistorial()` tipaban la respuesta como
`ApiResponse<T>` y hacían `map(r => r.data)`. Pero `GET /v1/chat/admin/sesiones` y
`GET /v1/chat/admin/historial/{sesionId}` devuelven un **array plano**, no envuelto. Por eso
`r.data` era `undefined` → `sesiones$.next([])` → panel vacío.

**Fix en `src/app/chat/service/chat-admin.service.ts`:**
- `cargarSesiones()`: tipo cambiado a `SesionActiva[]`, eliminado `map(r => r.data)`.
- `cargarHistorial()`: tipo cambiado a `MensajeHistorial[]`, usa `observe: 'response'` para
  manejar 204 (sesión sin mensajes → array vacío en vez de error).
- Eliminados imports de `ApiResponse` y `map` que quedaron sin uso.

**Archivos modificados:** `src/app/chat/service/chat-admin.service.ts`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX CHAT ADMIN — HISTORIAL NO CARGA + SOCKJS IFRAME + MERGE RT (2026-06-17)

> Segunda ronda de fixes tras comprobar en vivo que el historial seguía sin mostrarse.

### 1. Historial bloqueado por guard incorrecto
`ChatAdminComponent.seleccionarSesion()` tenía `if (!sesion.mensajes.length) cargarHistorial()`.
Si el usuario envió mensajes antes de que el admin hiciera clic, `mensajes.length > 0` y el
historial nunca se cargaba. Fix: quitar el guard — siempre llamar `cargarHistorial()` al seleccionar.

### 2. SockJS intentaba transport iframe — bloqueado por servidor
El servidor devuelve `X-Frame-Options: deny` y `404` en `/ws/iframe.html`. SockJS intentaba ese
fallback causando errores en consola y posibles fallos de conexión.
Fix: configurar SockJS con `{ transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }` en
ambos servicios para omitir los transportes basados en iframe.

### 3. Historial sobrescribía mensajes en tiempo real
`cargarHistorial()` reemplazaba el array `mensajes` con solo el snapshot histórico, perdiendo
mensajes WebSocket que ya habían llegado mientras se hacía el GET.
Fix: merge inteligente — historial forma la base; se conservan mensajes RT (`m.timestamp > ultimoTs`).

### 4. Fallback para `contenido` nulo
`cargarHistorial()` ahora mapea `h.contenido ?? (h as any).mensaje ?? ''` por si el back envía
el campo con nombre distinto (`mensaje` en vez de `contenido`).

**Archivos modificados:**
- `src/app/admin/chat-admin/chat-admin.component.ts` → quita guard en `seleccionarSesion()`
- `src/app/chat/service/chat-admin.service.ts` → `cargarHistorial()` merge + fallback + error handler; SockJS transports
- `src/app/chat/service/chat-live.service.ts` → SockJS transports

**Verificado con `ng build --configuration=development` sin errores.**

---

## LECCIONES APRENDIDAS — GLOBALES

### L-G1 — `throwError(() => valor)` no funciona en RxJS 6 (2026-06-19)

**Síntoma:** todos los manejadores `error: (err) => { ... }` en el proyecto reciben una **función** como `err` en vez de un `HttpErrorResponse`. `err.status`, `err.error`, `err.error.mensaje` son todos `undefined`. Siempre se muestra el mensaje de fallback aunque el backend mande un error específico.

**Causa:** el proyecto usa **RxJS 6.6.7**. En RxJS 6, `throwError(valor)` tira el valor directamente. Si se pasa una arrow function (`throwError(() => valor)`), tira LA FUNCIÓN como error — nunca la llama. En RxJS 7+ sí se llama la factory.

**Cómo detectarlo:** `console.log(err)` en cualquier error handler muestra algo como `() => normalizedError` (la representación string de la función).

**Fix:** usar siempre `throwError(valor)` sin factory wrapper. Aplica a TODO el código del proyecto, especialmente en interceptores.

```typescript
// ❌ RxJS 7 (no funciona en RxJS 6)
return throwError(() => error);

// ✅ RxJS 6 correcto
return throwError(error);
```

**Dónde aplica:** `src/app/token/TokenInterceptor .ts` — ya corregido. Si se agrega un interceptor nuevo o un `throwError` en cualquier servicio, usar la sintaxis de RxJS 6.

---

### L-G2 — un `Swal.fire()` puede crearse en el DOM y quedar completamente invisible por z-index (2026-07-08)

**Síntoma:** `Swal.fire()` se ejecuta sin ningún error en consola, el modal SÍ se crea en el DOM
(`document.querySelectorAll('.swal2-container').length` devuelve `1`), pero el usuario no ve
nada en pantalla — parece que "no pasa nada" al hacer una acción que debería mostrar un popup.

**Causa:** SweetAlert2 usa `z-index: 1060` por defecto para `.swal2-container`. Varios
componentes del proyecto usan `position: fixed` con z-index más alto que eso — `.split-page`
(login) en `1100`, `navbar` en `1100`, y `chatbot`/`add-venta`/`venta-variante`/
`detalle-productos` entre `10000` y `10002`. Si un `Swal.fire()` se abre mientras alguno de
esos elementos está visible, el modal se crea en el DOM pero queda **dibujado detrás** de esa
pantalla — invisible e inaccesible, sin ningún error, porque técnicamente no hay ningún fallo:
solo perdió la pelea de stacking. Encontrado en vivo en el login: `debeCambiarPassword: true`
hacía que `forzarCambioPassword()` llamara a `Swal.fire()` correctamente, pero `.split-page`
(z-index 1100) lo tapaba por completo.

**Cómo detectarlo:** en la consola del navegador, después de disparar la acción que debería
abrir el Swal, correr `document.querySelectorAll('.swal2-container').length`. Si devuelve `1`
(o más), el modal SÍ se creó — es un problema de z-index, no de lógica JS. Si devuelve `0`, el
código nunca llegó a llamar `Swal.fire()` (ahí sí hay que revisar la lógica/el bundle
desplegado).

**Fix — NO bajar el z-index de cada componente uno por uno.** Se agregó una regla global en
`src/styles.scss`, justo antes del bloque de estilos de SweetAlert2 existente:
```scss
.swal2-container {
  z-index: 20000 !important;
}
```
Un modal de este tipo debe **siempre** ganar, sin importar qué z-index tenga la pantalla
debajo — por eso la regla es global y con `!important`, no un fix puntual por componente.

**Regla a futuro:** si se agrega un componente nuevo con `position: fixed` y z-index alto
(headers, overlays, banners), no hace falta preocuparse por SweetAlert2 — ya está cubierto
globalmente. Si en el futuro se usa OTRA librería de modales/toasts, aplicar el mismo criterio:
verificar su z-index por defecto contra los z-index más altos del proyecto (hoy el tope es
`10002`, en `chatbot.component.scss`) y forzarlo por arriba en `styles.scss` si hace falta.

---

## LECCIONES APRENDIDAS — MÓDULO RIFAS (errores recurrentes a evitar)

> Registro de patrones que ya causaron bugs en este módulo. Antes de tocar `AgregarRifaComponent`
> o `RifaMesComponent` de nuevo, revisar esta lista para no repetirlos.

1. **No usar `error: () => { flag = false; }` sin capturar el mensaje del backend.**
   El backend devuelve `400 { mensaje: "..." }` para reglas de negocio (fecha límite pasada,
   concursante ya participó en sorteo, etc.). Si el `error` callback no lee `err?.error?.mensaje`
   y lo muestra en una alerta (`errorConcursante` + `.rf-alert--warn`/`.rm-alert--warn`), el
   usuario ve que "no pasa nada" al hacer clic y no sabe por qué. Patrón correcto ya
   establecido en `eliminarConcursante()` — replicar en cualquier subscribe nuevo que pueda
   fallar por reglas de negocio.

2. **Campos anidados que vienen de otra tabla/microservicio (`variante`, `producto`, etc.)
   declarar como opcionales (`campo?: Tipo`) y acceder siempre con `?.` en el template.**
   Un solo item de un array con esa propiedad en `null`/`undefined` puede tirar un `TypeError`
   en medio de un `*ngFor` y cortar el render del resto de la lista — el bug se ve como
   "solo se muestra el primero y los demás desaparecen", que es engañoso (parece problema de
   CSS/grid cuando es un error de binding).

3. **Templates de Angular NO permiten arrow functions (`=>`) dentro de `{{ }}`** (error
   `NG5002: Bindings cannot contain assignments`). Exponer un getter en el `.ts`
   (ej. `omitidosNombres`) y usar `{{ getter }}`.

4. **En wizards multi-paso (`paso: 'a' | 'b' | 'c'...`), cada pantalla "final" (ganador,
   confirmación, etc.) necesita un botón explícito para volver a un paso anterior SIN
   resetear el estado.** No asumir que "Reiniciar"/"Nueva" cubre la necesidad de "solo quiero
   ver la lista de participantes otra vez" — son acciones destructivas/de reinicio, no de
   navegación. Si se agrega un paso nuevo, agregar también su botón de regreso.

5. **Antes de afirmar "ya quedó listo"**, recordar que `ng build` solo valida tipos/templates —
   NO valida el flujo funcional contra el backend real (mensajes de error 400, shape de
   respuestas, IDs). Los bugs reportados en esta sesión (fecha límite, variante nula, falta
   de navegación) NO los detecta el build — solo aparecen probando en vivo.

6. **El patrón de la Lección #1 (capturar `err?.error?.mensaje`) hay que aplicarlo a TODOS los
   `.subscribe()` que disparan una acción del usuario, no solo al que reportó el bug original.**
   `sortear()` y `reiniciar()` (Paso 4/5) tenían el mismo `error: () => { flag = false; }` sin
   mensaje que ya se había corregido en `agregarManual()`/`eliminarConcursante()` (Paso 2) — el
   error silencioso no desapareció, solo "se movió" a otra pantalla. Al corregir este patrón,
   revisar TODOS los `subscribe()` del componente (grep por `error:` en el `.ts`), no solo el
   método mencionado en el reporte.

7. **`AgregarRifaComponent` y `RifaMesComponent` son hermanos que comparten el mismo motor
   (variantes/sorteo/modo-prueba) — un bug corregido en uno casi siempre existe también en el
   otro.** El fix de la Lección #6 (`err?.error?.mensaje` en `sortear`/`reiniciar`) se hizo en
   `RifaMesComponent`, pero `AgregarRifaComponent.guardarVarianteRifa()` tenía el MISMO patrón
   roto (`error: () => { this.guardandoVariante = false; }`) y nadie lo revisó hasta que el
   usuario chocó con él en vivo (palabraClave duplicada). Mismo caso con `descartados`: existía
   en `AgregarRifaComponent` pero no en `RifaMesComponent`. **Regla:** cuando se corrija un bug
   de este tipo en uno de los dos componentes, hacer el mismo grep (`error:`, nombre del campo
   nuevo, etc.) en el componente hermano ANTES de cerrar la tarea — no esperar a que el usuario
   lo reporte por separado en la otra pantalla.

8. **La Lección #7 ("revisar el hermano") se aplicó de nuevo de forma incompleta — y el usuario
   volvió a chocar con el MISMO bug por TERCERA vez, ahora en `RifaMesComponent.guardarVariante()`.**
   El fix de la sección 12 corrigió `AgregarRifaComponent.guardarVarianteRifa()` (palabraClave
   duplicada), pero su método hermano directo `RifaMesComponent.guardarVariante()` ("Paso 3:
   Variante/Premio") tenía exactamente el mismo `error: () => { this.guardandoVariante = false; }`
   sin leer `err?.error?.mensaje`, y nadie lo revisó. **Regla más fuerte:** cuando se corrija el
   patrón de error silencioso (Lección #1/#6/#7) en CUALQUIER método de uno de los dos
   componentes, hacer un grep de `error: () =>` (y variantes con espacios) en AMBOS archivos
   `.ts` completos de `agregar-rifa` y `rifa-mes` ANTES de cerrar la tarea — no solo revisar el
   método "equivalente" más obvio. Una revisión puntual del hermano no es suficiente; tiene que
   ser un grep exhaustivo de TODO el archivo.

9. **Dropdowns de búsqueda (`.rm-dropdown`/`.rf-dropdown`) dentro de `.rm-card`/`.rf-card`
   (`overflow: hidden`) se recortan visualmente aunque tengan más resultados — el bug se ve
   como "solo aparece 1 resultado, el scroll no sirve", que es engañoso (parece problema de
   altura/scroll cuando es recorte por `overflow:hidden` del ancestro).** Fix establecido:
   getter `dropdownStyleXxx` con `getBoundingClientRect()` del wrapper (`#searchWrapXxx`) →
   `{ position: 'fixed', 'top.px', 'left.px', 'width.px' }` vía `[ngStyle]` — `position: fixed`
   escapa el `overflow: hidden` sin tocar el SCSS del card. Si se agrega un dropdown nuevo en
   este módulo (o en otro con cards `overflow: hidden`), replicar este patrón en vez de tocar
   `overflow`.

   **Y, en la misma sesión, doble-submit por falta de guard de re-entrada**: un doble clic
   antes de que `[disabled]` se refleje en el DOM puede disparar el mismo método de guardado
   dos veces → el segundo POST llega con datos ya guardados por el primero y el backend
   responde 400/404 de "ya existe" (que a su vez solo se ve si la Lección #1 está aplicada).
   Fix: agregar `|| this.guardandoX` a la guarda de entrada (primer `return` síncrono) de
   cualquier método de guardado nuevo — no asumir que `[disabled]` por sí solo previene la
   doble invocación.

10. **El flag `guardandoX`/`creandoX` debe permanecer `true` durante TODA la cadena de
    llamadas encadenadas, no solo la primera.** La Lección #9 agregó el guard
    `|| this.guardandoVariante`, pero `guardarVariante()` ponía `guardandoVariante = false`
    en el `next` del PRIMER POST (`configurarRifaVariante/save`), antes de que el SEGUNDO
    POST encadenado (`getElegibles()`) terminara. Durante esa ventana el botón se
    rehabilita y, como `RifaMesComponent` NO limpia los campos del form al guardar (a
    diferencia de `AgregarRifaComponent.guardarVarianteRifa()` → `resetFormVariante()`), un
    re-clic reenvía el MISMO `palabraClave`/`varianteId` ya guardado → 400 "ya existe". El
    guard de la Lección #9 solo cubre el doble-clic síncrono; esto es un re-clic
    ASÍNCRONO con datos obsoletos. **Regla:** en cualquier método con 2+ llamadas HTTP
    encadenadas donde el form NO se limpia en el `next` intermedio, el flag de
    re-entrada debe resetearse a `false` SOLO en el `next`/`error` TERMINAL de la última
    llamada de la cadena (y en el `error` de cada llamada intermedia). Aplica a
    `guardarVariante()` y `crearRifaEImportar()` en `RifaMesComponent` — revisar cualquier
    otro método con `.subscribe()` anidado en ambos componentes con el mismo criterio.

11. **`descartado=true` en un concursante NO se limpia navegando entre pasos — solo con
    `POST /v1/ganadorRifa/reiniciar/{id}`.** Si una pantalla permite "volver a sortear con
    los mismos participantes" (típicamente en `esPrueba=true`, donde el usuario espera poder
    repetir la prueba indefinidamente), y esa pantalla re-llama a `getElegibles()` sin haber
    llamado antes a `reiniciar(id, false)`, el resultado excluirá a quien ya ganó/fue
    descartado en la ronda anterior — se ve como "ahora solo aparece 1 concursante menos"
    (engañoso: parece que el back perdió participantes, pero solo están marcados
    `descartado=true`). Antes de reportar esto como bug del back, probar manualmente
    "🔄 Reiniciar (mismos participantes)" — si eso restaura la lista completa, el fix es
    encadenar `reiniciar(id, false)` ANTES de `getElegibles()` en el flujo de re-confirmación
    (solo cuando `esPrueba === true`; en rifas reales el flag debe persistir).

---

## RESUMEN DE MIGRACIÓN v1 → v2 (estado actual)

> **Toggle:** botón `🧪 IMG v1/v2` en el sidebar (solo admin).  
> Cuando está **amarillo = v2 activo**. Cuando está gris = v1 (deprecated).  
> **Servicio del toggle:** `src/app/services/imagen-version/imagen-version.service.ts` → `ImagenVersionService.useV2`

---

### ✅ MIGRACIÓN 1 — GET imágenes de detalle de producto (2026-05-22: migrado a micro, listar permanente)

| | v1 (deprecated) | final (✅ permanente) |
|---|---|---|
| **Endpoint** | `GET /imagen/{id}/detalle` (proyecto-key) ❌ | `GET /producto-imagen/listar/{id}?pagina=&size=` (micro 9096) |
| **Servicio** | `ProductoService.getDataImg()` / `getDataImgV2()` — sin uso | `ProductoService.getImagenesProducto()` |
| **Response** | `{ list: [], totalPaginas }` con base64 embebido | `{ listaImagenes: [], totalPaginas, pagina, totalImagenes }` con `urlImagen` |
| **Imagen** | `getImgSrc(img)` convertía base64 | `<img [src]="img.urlImagen">` — browser carga directo |

**Estado:** `DetalleProductoComponent` usa `getImagenesProducto()` (mismo que `UpdateComponent`). `ImagenVersionService` eliminado del componente. `getDataImgV2` ya no se invoca desde ningún componente.

**Cómo llegar:**
- `Mis productos` → `Ver todos` → clic en el ícono de detalle de cualquier producto
- Angular navega a `/productos/detalle/{id}` → `ngOnInit` llama `getImagenesProducto(id, 1, 8)`

**Archivos involucrados:**
- `src/app/productos/producto/detalle-producto/detalle-producto.component.ts` → `ngOnInit()` y `cargarPagina()`
- `src/app/productos/service/producto.service.ts` → `getImagenesProducto()`

---

### ✅ MIGRACIÓN 2 — GET imágenes de presentación (login/registro)

| | v1 (deprecated) | v2 (✅ conectado) |
|---|---|---|
| **Endpoint** | `GET /presentacion/imagenes?tipo=LOGIN\|REGISTRO` | `GET /presentacion/v2/imagenes?tipo=LOGIN\|REGISTRO` |
| **Servicio** | `PresentacionService.getImagenesPorTipo()` | `PresentacionService.getImagenesPorTipoV2()` |
| **Diferencia** | Devuelve `nombreArchivo` (ruta disco interno) | Devuelve `urlImagen` (URL del micro) + cacheable |

**Para que se ejecute el v2:**
1. Activar toggle `🧪 IMG v2` en sidebar
2. **Para LOGIN:** ir a la ruta `/login` → `ngOnInit` de `LoginFormComponent` carga las imágenes del panel izquierdo automáticamente
3. **Para REGISTRO:** ir a `/usuarios/registrar` → `ngOnInit` de `AddUsuariosComponent` carga las imágenes automáticamente

**Archivos involucrados:**
- `src/app/presentacion/presentacion.service.ts` → `getImagenesPorTipo()` / `getImagenesPorTipoV2()` / `getImagenV2Bytes()`
- `src/app/login/login-form/login-form.component.ts` → usa tipo `LOGIN`
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` → usa tipo `REGISTRO`

---

### ✅ MIGRACIÓN 3 — DELETE imagen por ID

| | deprecated | ✅ final |
|---|---|---|
| **Endpoint** | `DELETE /imagen/{idImagen}` (proyecto-key 9091) | `DELETE /producto-imagen/{imagenId}` (micro 9096) |
| **Servicio** | `ImagenesService.deleteById()` | `ProductoService.deleteImagen()` |

**Estado por componente:**
- `UpdateComponent.eliminarImagen()` → ✅ migrado a `ProductoService.deleteImagen()` (2026-05-21)
- `DetalleProductoComponent.eliminarImagen()` → ✅ ya usaba `ProductoService.deleteImagen()` desde antes

**Cómo llegar:**
- Update: `Mis productos` → `Ver todos` → Editar → sección imágenes → ✕ sobre imagen
- Detalle: `Mis productos` → `Ver todos` → clic en producto → ✕ sobre imagen

---

### ✅ MIGRACIÓN 4 — DELETE lote de imágenes de producto (2026-05-22)

| | v1 (deprecated) | v2 (✅ final) |
|---|---|---|
| **Endpoint** | `DELETE /imagen/{productoId}/imagenes` | `DELETE /imagen/v2/{productoId}/imagenes` |
| **Servicio** | `ImagenesService.eliminarImagenesBatch()` | mismo servicio, URL actualizada |

**Cómo llegar:** `Mis productos` → `Ver todos` → clic en nombre del producto → marcar imágenes con `✕` → "Eliminar seleccionadas" → confirmar

**Archivo modificado:** `src/app/imagene/imagenes.service.ts` → `eliminarImagenesBatch()`

---

### ✅ MIGRACIÓN 4b — PUT marcar imagen principal de producto (2026-05-22)

| | antes | final (✅) |
|---|---|---|
| **Endpoint** | `PUT /producto-imagen/{id}/principal` (proyecto-key 9091) | mismo path → **micro 9096** |
| **Servicio** | `ImagenesService.setPrincipalProducto()` — URL corregida a `api_imagenes` | ✅ |
| **UpdateComponent** | `setPrincipal()` solo actualizaba estado local | ✅ ahora llama la API + revierte si falla |

**Archivos modificados:**
- `src/app/imagene/imagenes.service.ts` → URL de `api_Url` → `api_imagenes`
- `src/app/productos/producto/update/update.component.ts` → `setPrincipal()` agrega llamada HTTP

---

### ⏳ MIGRACIÓN 5 — DELETE todas las imágenes de varios productos (pendiente)

| | v1 | v2 (pendiente) |
|---|---|---|
| **Endpoint** | `DELETE /imagen/producto` (body: productoIds[]) | `DELETE /imagen/v2/producto` |
| **Estado front** | ⚠️ NO implementado en ningún componente todavía |

---

### ⏳ MIGRACIÓN 6 — GET limpiar caché de imágenes (pendiente)

| | v1 | v2 (pendiente) |
|---|---|---|
| **Endpoint** | `GET /imagen/cache/imagen/limpiar` | `GET /imagen/v2/cache/limpiar` |
| **Estado front** | ⚠️ NO implementado. El `/admin/cache` usa `DELETE /admin/cache` (caché general de Spring) que es DISTINTO |

**Para que se ejecute (CUANDO SE IMPLEMENTE):**
1. Activar toggle `🧪 IMG v2`
2. `Admin` → `Limpiar caché` → botón de limpiar caché de imágenes (botón a agregar)

**Archivo a modificar:** `src/app/admin/admin.service.ts` → agregar `limpiarCacheImagenesV2()`

---

### ⚠️ MÉTODO EXISTENTE SIN CONECTAR

`ImagenesService.getImagenV2(productoId)` → llama a `GET /imagen/v2/{productoId}` (micro de imágenes).
**Estado:** método creado en el servicio pero NINGÚN componente lo invoca. No tocar hasta confirmar path exacto del backend.

---

## REGLA — CRITERIO DE ORGANIZACIÓN DEL SIDEBAR (2026-07-07)

> Reorganización aplicada sobre `src/app/navbar/navbar.component.html` (Opción B de
> `navbar-rutas-opciones` — reagrupar por función, cambio mínimo sobre el orden ya
> existente). **Usar este criterio para decidir dónde va cualquier ruta/link nuevo que se
> agregue al sidebar de aquí en adelante.**

### Los 9 grupos y su criterio

| # | Grupo | Criterio — qué entra aquí | Ítems actuales |
|---|---|---|---|
| 1 | 🏠 Home | Link directo, todos | — |
| 2 | 🛍️ Productos | Link directo, catálogo cliente | `variantes/buscar` |
| 3 | 📦 Mis productos | Alta/edición del catálogo (admin) | Ver todos, Agregar producto, Gestionar variantes, Cargar Excel, Palabras clave |
| 4 | 📋 Pedidos | Solo lo que es "un pedido" — **NO** analítica ni dinero | Mis pedidos, Historial MP |
| 5 | 💰 Ventas | Todo lo que mueve dinero: cobrar, créditos, gastos | Venta directa, Buscar ventas, Créditos/Abonos, Gastos y Ventas |
| 6 | 📊 Analítica | Métricas/reportes del negocio — nunca operación del día a día | Dashboard, Reportes, Clientes |
| 7 | 🎰 Rifas | Todo el módulo de rifas | Rifa de variantes, Rifa mensual, Ver rifas activas |
| 8 | 🖼️ Imágenes | Herramientas de imágenes — separado de Sistema a propósito | Imágenes presentación, Diagnóstico, Reconciliación, Limpiar caché |
| 9 | 🛠️ Sistema | Configuración del sistema en sí (antes se llamaba "Admin") | Usuarios, Negocio & Contactos, Chat en vivo, Gestión Promociones |

Fuera de accordions, quedan como **link directo** (sin submenú): Promociones, Chat (no-admin),
QR, Login (anónimo), toggle de tema. Regla para decidir link directo vs. accordion: si hoy
tiene o es previsible que tenga 2+ sub-rutas relacionadas → accordion; si es una sola pantalla
→ link directo.

### Qué NO hacer (para no repetir el desorden anterior)

- **No meter analítica/reportes dentro de "Pedidos".** Antes vivían ahí Dashboard, Reportes y
  Créditos/Abonos — se sentía mezclado porque "Pedidos" es algo que un cliente reconoce, y esos
  3 ítems son herramientas de admin sin relación con "ver mi pedido". Cualquier métrica/reporte
  nuevo va a **Analítica**.
- **No agregar ítems sueltos como link directo si son admin-only y temáticos** (ej. "Clientes" y
  "Gastos y Ventas" vivían así antes) — si el ítem nuevo tiene relación clara con un grupo
  existente (Ventas, Analítica, Sistema), métanlo ahí en vez de crear un link nuevo a nivel raíz.
- **No volver a cargar "Sistema"/"Admin" con herramientas de imágenes.** Ese grupo llegó a tener
  8 ítems sin relación entre sí. Cualquier herramienta nueva de imágenes va a **Imágenes**;
  cualquier cosa de configuración/usuarios/negocio va a **Sistema**.
- **Antes de crear un grupo nuevo**, revisar si encaja en uno de los 9 de la tabla — solo crear
  uno nuevo si de verdad no hay match temático (ej. no forzar "Rifas" dentro de "Ventas" aunque
  ambos generen dinero, porque son operativamente un módulo aparte).

### Claves internas del accordion (`openGroup` en `navbar.component.ts`)

`'misproductos'`, `'pedidos'`, `'ventas'`, `'analitica'`, `'rifas'`, `'imagenes'`, `'sistema'`
— el nombre interno no necesita coincidir con la etiqueta visible, solo ser único.

---

## SIDEBAR (navbar rediseñado)


### Archivos
- `src/app/navbar/navbar.component.html` — HTML del sidebar
- `src/app/navbar/navbar.component.ts` — lógica: hover expand, accordion, mobile, theme toggle
- `src/app/navbar/navbar.component.scss` — estilos con `:host-context` para dark/light
- `src/app/app.component.html` — layout sin `nb-layout-header`
- `src/app/app.component.scss` — `margin-left: 70px` desktop, `0` móvil, variables de tema en Nebular

### Comportamiento
- **Desktop:** sidebar fijo a 70px (solo iconos). Hover → expande a 262px. Mouse fuera → colapsa y cierra accordions.
- **Accordion:** clic en item con hijos → despliega hacia abajo. Otro clic → cierra.
- **Móvil (< 768px):** sidebar oculto. Hamburger (top-left) lo abre como overlay. Clic fuera o en link → cierra.
- **Footer:** botones de carrito + avatar con inicial + nombre + "Mis datos" + "Salir".

### Estilos por tema
| | Dark mode | Light mode |
|---|---|---|
| Fondo sidebar | `rgba(0,0,0,0.82)` semitransparente | `rgba(255,255,255,0.97)` blanco |
| Texto | `#ffffff` blanco | `#1e293b` oscuro |
| Subitems | `#e2e8f0` | `#475569` gris oscuro |
| Hover item | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.05)` |
| Acento activo | `rgba(99,102,241,0.22)` | `rgba(99,102,241,0.10)` índigo suave |
| Hamburger | índigo | índigo |

Implementado con `:host-context(body.theme-dark)` y `:host-context(body.theme-light)` en navbar.component.scss.

### Sistema de temas (dark/light automático por hora)
- **Servicio:** `src/app/services/theme/theme.service.ts`
- **Lógica:** 6:00–18:59 → light | 19:00–5:59 → dark
- **Init:** en constructor de `AppComponent` (antes de pintar la vista)
- **Mecanismo:** agrega clase `theme-dark` o `theme-light` a `document.body`
- **Toggle manual:** botón `🌙/☀️` en el sidebar (disponible para todos los usuarios)
- **CSS global:** variables `--app-bg`, `--app-surface`, `--app-text`, `--app-border`, `--app-accent` definidas en `styles.scss` para `body.theme-dark` y `body.theme-light`
- **Componentes que responden al tema:** Nebular layout, Bootstrap cards/tables/forms/modals, PrimeNG, AG Grid, login, registro

### Páginas login y registro
- Usan `:host-context(body.theme-dark / theme-light)` en sus propios SCSS
- **Dark:** panel de formulario `rgba(13,17,23,0.97)`, inputs glassmorphism, texto blanco
- **Light:** panel blanco, inputs `#f9fafb`, texto oscuro — diseño pink/rosa original conservado
- Archivos: `login-form.component.scss` y `add-usuarios.component.scss`

### Carrusel de imágenes — DetalleProductoComponent
**Archivo:** `src/app/productos/producto/detalle-producto/detalle-producto.component.ts`

- **Carga inicial:** `page=0, size=4` — primeras 4 imágenes
- **Paginación lazy:** `handlePageChange(event)` sigue el mismo patrón que `detalle-variante`:
  - Si `event.page` no está en `paginasCargadas` y hay más páginas → carga esa página
  - For loop como fallback para la primera página no cargada
  - Cuando `paginasCargadas.size >= totalPaginas` → no más llamadas, carrusel llega a su fin natural
- **Sin filtro por idImagen:** el filtro anti-duplicados fue eliminado porque el back puede devolver el mismo `idImagen` en múltiples items — se agregan todos sin filtrar
- **`totalPaginas`** en la respuesta = número de páginas (ej: 96 páginas × 4 items = 384 imágenes)

### UpdateComponent — Mis productos → Editar
**Archivo:** `src/app/productos/producto/update/update.component.ts` + `.html`

- **Botón "Mis productos"** agregado arriba del formulario → navega a `/productos/buscar`
- **Imágenes:** carga via `GET /producto-imagen/listar/{id}` (micro 9096), luego por cada imagen `GET {urlImagen}` como blob → ObjectURL → `<img [src]>`
- **Carrusel:** `p-carousel` debajo del formulario — lazy loading paginado (8 por página), botones ⭐ principal y ✕ eliminar por slide

### UpdateVarianteComponent — Variantes → Editar
**Archivo:** `src/app/variante/update-variante/update-variante.component.ts` + `.html`

- **Carrusel de imágenes existentes** (2026-05-22): sección "Imágenes actuales" movida AL FINAL, fuera del card del formulario, como `p-carousel` igual al patrón de `UpdateComponent`
- **Orden de la página:** producto → campos → categoría → subir nuevas imágenes → botón Actualizar → **carrusel imágenes existentes**
- **Carrusel:** `p-carousel` con `numVisible=3`, responsive (2 en tablet, 1 en móvil), cada slide tiene botón ⭐ principal y ✕ eliminar
- **Imágenes:** se muestran con `img.urlImagen | imagenSrc | async` (mismo patrón que buscar variantes)
- **Categoría:** selector `app-palabra-clave-autocomplete` ya presente en el form

### BuscarComponent — Variantes → Buscar
**Archivo:** `src/app/variante/buscar/buscar.component.html` + `.scss`

- **Botón compartir 📤** (2026-05-22): ya estaba en el template pero `vb-btn-card--share` sin estilos y footer con grid fijo de 4 columnas. Correcciones:
  - Footer cambiado a `display: flex` para adaptarse a cualquier número de botones
  - Agregado `&--share { color: #0891b2 }` en SCSS
  - Botón visible solo para **admin** cuando la variante tiene `imagenUrl`
  - Funciona igual que `AllComponent` (productos/buscar): llama a `CompartirService` con título, precio e imagen

### ⚠️ CONTEXTO ARQUITECTURA — MUY IMPORTANTE
- **`ImagenesService.urlImg`** apunta a `environment.api_Url/imagen` = **proyecto-key** (puerto 9091)
- **`ProductoService.microImagenes`** apunta a `environment.api_imagenes/producto-imagen` = **micro de imágenes** (puerto 9096)
- Los endpoints de DELETE (/imagen/{id}, /imagen/{productoId}/imagenes, /imagen/producto) y caché (/imagen/cache/imagen/limpiar) son del **microservicio de imágenes separado**
- **El front NO toca el micro de imágenes directamente por ahora** — la migración se está haciendo primero en `proyecto-key`
- Cuando el back confirme que proyecto-key está listo para v2, ENTONCES el front migra las URLs
- **No hacer cambios en código de imagen sin esta confirmación**

### Toggle IMG v2 — ✅ YA CONECTADO
- Botón `🧪 IMG v1/v2` en sidebar, visible solo para admin
- Controlado por `ImagenVersionService` (`src/app/services/imagen-version/imagen-version.service.ts`)
- **Cuando activo (amarillo):** `DetalleProductoComponent` llama a `ProductoService.getDataImgV2()` → `GET /imagen/v2/{productoId}/detalle?page=&size=`
- **Controlador back:** `ImageneController.getDetalleV2()` — proyecto-key
- **Response:** misma estructura `PageableDto` — `{ idProducto, idImagen, name, price, inventoryStatus, extencion, image }`
- **Diferencia clave:** `image` viene del microservicio de imágenes (no del disco local); si no existe → `image: null` + log en servidor, front no crashea
- **Cuando inactivo:** usa el deprecated `GET /imagen/{id}/detalle`

---

## PENDIENTE — MIGRACIÓN DE COMPONENTES A DARK/LIGHT THEME

> Revisión completa por agentes (2025-05-20). Ningún componente tiene `:host-context` excepto login y registro (parcial).
> Todos necesitan agregar `:host-context(body.theme-dark)` y `:host-context(body.theme-light)` en su SCSS.

### CRÍTICO — se ven muy mal en dark mode
| Componente | Archivo SCSS | Problema principal |
|---|---|---|
| Agregar rifa | `rifas/agregar-rifa/agregar-rifa.component.scss` | 50+ colores hardcodeados, fondo blanco |
| Diagnóstico imágenes | `admin/diagnostico-imagenes/diagnostico-imagenes.component.scss` | 40+ colores, fondo púrpura claro |

### ALTO — claramente rotos en dark mode
| Componente | Archivo SCSS | Problema principal |
|---|---|---|
| Agregar producto | `productos/producto/add/add.component.scss` | Gradiente rosa `#fff5f7`, fondo blanco |
| Detalle producto | `productos/producto/detalle-producto/detalle-producto.component.scss` | Gradiente rosa, bordes grises |
| Visor imágenes (all) | `productos/producto/all/all.component.scss` | Modal blanco, hover rosa/rojo |
| Venta directa | `variante/venta-directa/venta-directa.component.scss` | Split blanco, panels fijos |
| Visor variante | `variante/venta-variante/venta-variante.component.scss` | Modal blanco |
| Actualizar variante | `variante/update-variante/update-variante.component.scss` | Gradiente morado/teal hardcodeado |
| Detalle pedido | `pedidos/detalle-pedido/detalle-pedido.component.scss` | 23 colores, fondo blanco |
| Historial MP | `pedidos/historial-mp/historial-mp.component.scss` | 18 colores, badges fijos |
| Add venta | `ventas/venta-producto/add-venta/add-venta.component.scss` | 15 colores, cards blancas |
| Buscar rifa | `rifas/buscar-rifa/buscar-rifa.component.scss` | Fondo púrpura fijo |
| Rifa mes | `rifas/rifa-mes/rifa-mes.component.scss` | 10 colores |
| Config negocio | `admin/config-negocio/config-negocio.component.scss` | Fondo rosa gradiente |
| Presentación imágenes | `admin/presentacion-imagenes/presentacion-imagenes.component.scss` | Fondo rosa/rojo |
| Chatbot | `chatbot/chatbot.component.scss` | Header gradiente rosa/púrpura |

### MEDIO — se notan pero siguen legibles
| Componente | Archivo SCSS | Problema |
|---|---|---|
| Detalle productos | `productos/producto/detalle-productos/detalle-productos.component.scss` | Fondos rosa pálido |
| Update producto | `productos/producto/update/update.component.scss` | Cards blancas |
| Detalle variante | `variante/detalle-variante/detalle-variante.component.scss` | Cards blancas, bordes grises |
| Cache admin | `admin/cache/cache.component.scss` | Fondo oscuro fijo (roto en light) |
| Reconciliación imágenes | `admin/reconciliacion-imagenes/reconciliacion-imagenes.component.scss` | Header naranja fijo |

### BAJO — menor impacto
| Componente | Problema |
|---|---|
| `mis-datos.component.scss` | 2 colores hardcodeados |
| `loading.component.scss` | Spinner azul fijo |
| `buscar.component.scss` (variante) | Bordes y texto |
| `home.component.scss` | Texto blanco fijo (funciona en ambos) |

### Estrategia de fix
Para cada componente: agregar al final de su SCSS:
```scss
:host-context(body.theme-dark) {
  // fondo del wrapper → var(--app-bg) o glassmorphism
  // cards → rgba(255,255,255,0.05) + backdrop-filter
  // texto → #e2e8f0
  // bordes → rgba(255,255,255,0.08)
  // gradientes de header → versión oscura del mismo color
}
:host-context(body.theme-light) {
  // fondo → var(--app-bg) = #f1f5f9
  // cards → #ffffff con sombra
  // texto → #1e293b
}
```

---

## MANUAL DE ENDPOINTS — IMÁGENES

> Para cada endpoint: qué hace, desde qué componente/servicio se llama, y el flujo de pantallas
> que el usuario debe recorrer para dispararlo.

---

### ⚠️ ENDPOINTS DE MIGRACIÓN (los dos más importantes)

#### GET /imagen/{id}/detalle — @Deprecated
**Estado:** deprecated, sigue funcionando, el front NO migra aún.  
**Cuándo se llama:** `DetalleProductoComponent` al abrir el detalle de un producto (`/productos/detalle/{id}`) — cuando el toggle `IMG v2` está **inactivo**.  
**Servicio:** `ProductoService.getDataImg(id, page, size)`  
**Comportamiento:** lanza error si el producto no tiene imagen (no devuelve 204).  
**Acción pendiente:** reemplazar por v2 cuando el back lo confirme — el toggle ya hace el switch.

#### GET /imagen/v2/{productoId}
**Estado:** nuevo — **en pruebas con toggle admin**.  
**Diferencia clave:** si el producto no tiene imagen en disco devuelve **HTTP 204** (sin body) en vez de error. El front no crashea — muestra lista vacía y loguea `[imagen-v2] productoId=X — sin imágenes en disco`.  
**Servicio front:** `ImagenesService.getImagenV2(productoId)` → `src/app/imagene/imagenes.service.ts`  
**⚠️ NO se usa en ningún componente todavía.** El método existe listo para cuando se migre, pero ninguna pantalla lo invoca actualmente. No tocar hasta confirmar el path exacto del backend.

---

### 1. GET /imagen/{productoId}/imagenes
**Estado:** activo  
**Servicio:** `ImagenesService.getDataGeneric(idProducto)` → `src/app/imagene/imagenes.service.ts`  
**Devuelve:** `{ listaImagenes: ImagenUpdateDto[] }` con los metadatos de cada imagen (id, nombreImagen, principal)  
**Lo usa:** `UpdateComponent` (`src/app/productos/producto/update/update.component.ts`)  

**Flujo para llegar:**
1. Ir a `Mis productos` → `Ver todos` (ruta `/productos/buscar`)
2. En la tabla de productos, hacer clic en el botón Editar de un producto
3. El `UpdateComponent` recibe el producto por `BehaviorSubject` y llama automáticamente a este endpoint al detectar un `idProducto` válido

---

### 2. GET /imagen/file/{imagenId}
**Estado:** activo  
**Servicio:** `ImagenesService.getImagenFile(imagenId)` → `src/app/imagene/imagenes.service.ts`  
**Devuelve:** blob (bytes de la imagen); el front convierte a `ObjectURL` para `<img [src]>`  
**Lo usa:** `UpdateComponent` — se llama UNA VEZ POR CADA imagen listada en el endpoint anterior  

**Flujo para llegar:** mismo que endpoint 1. Después de obtener la lista, por cada imagen se hace una segunda llamada para traer los bytes.

---

### 3. GET /
/{id}/detalle?size=&page=
**Estado:** @Deprecated (sigue funcionando, el front NO migra aún)  
**Servicio:** `ProductoService.getDataImg(id, page, size)` → `src/app/productos/service/producto.service.ts`  
**Devuelve:** `{ list: ProductImagenDto[], totalPaginas: number }` — imágenes con base64 incluido  
**Lo usa:** `DetalleProductoComponent` (`src/app/productos/producto/detalle-producto/detalle-producto.component.ts`)  

**Flujo para llegar:**
1. Ir a `Mis productos` → `Ver todos` (ruta `/productos/buscar`)
2. Hacer clic en el nombre o ícono de detalle de un producto
3. Angular navega a `/productos/detalle/{id}`
4. `ngOnInit` dispara la llamada con `page=0, size=4` automáticamente
5. Al cambiar de página en el carrusel → llama a `cargarPagina(n)` que dispara el mismo endpoint con `page=n`

---

### 4. GET /imagen/v2/{productoId}/detalle?size=&page= ✅ USAR ESTA
**Estado:** versión nueva — **migrar a esta, reemplaza el deprecated**  
**Controlador back:** `ImageneController` (proyecto-key) → método `getDetalleV2()`  
**Servicio front:** `ProductoService.getDataImgV2(id, page, size)` → `src/app/productos/service/producto.service.ts`  
**Acción pendiente front:** cambiar URL de `/imagen/{id}/detalle` → `/imagen/v2/{id}/detalle`

**Params:** iguales a v1 — `productoId` (path), `page` + `size` (query)

**Response 200:** misma estructura `PageableDto`:
```json
{ idProducto, idImagen, name, price, inventoryStatus, extencion, image }
```

**Diferencia clave vs v1:**
- `name`, `price`, `inventoryStatus`, `extencion` → siguen saliendo de la **BD local de proyecto-key**
- `image` (bytes) → ahora vienen del **microservicio de imágenes** (antes era del disco local del mono)
- Si la imagen no existe en el micro → `image: null` + log en servidor (el front ya maneja null sin crash)

**Flujo interno (back):**
```
Front → ImageneController.getDetalleV2()
          └─► IImagenService.findImagenPrincipalPorProductoIdsV2()
                  ├─► consulta BD local (nombre, precio, stock, imagenId)
                  └─► por cada imagen: ImagenPort.getOne(imagenId)
                              └─► HTTP → microservicio de imágenes → bytes del disco del micro
```

**Cómo probar en front:**
1. Login como admin → activar toggle `🧪 IMG v2` en sidebar (se pone amarillo)
2. Ir a `Mis productos` → `Ver todos` → clic en Detalle de cualquier producto
3. Las imágenes ahora las sirve el microservicio, no el disco local
4. Si `image` llega null → el front muestra el item sin imagen, sin crash

---

---

### ⚠️ ENDPOINTS 5–8 — MICROSERVICIO DE IMÁGENES (pendientes de migrar en front)

> Estos endpoints pertenecen al **microservicio de imágenes** (puerto 9096, `environment.api_imagenes`).
> El front actualmente NO los cambia — la migración se está haciendo primero en `proyecto-key`.
> Cuando proyecto-key confirme que v2 está listo, ENTONCES migrar el front.
> El toggle `🧪 IMG v2` del sidebar deberá activar también estos endpoints cuando llegue el momento.

---

### 5. DELETE /imagen/{idImagen} ❌ Deprecated → DELETE /imagen/v2/{idImagen} ✅
**Micro:** microservicio de imágenes (`environment.api_imagenes`)  
**Controlador back:** `ImageneController.deleteById()` → v2: `ImageneController.deleteByIdV2()`  
**Diferencia:** v1 solo borra de BD local | v2 borra de BD local **+ archivo en el micro**  
**Response:** HTTP 202 `{ message }` — igual en ambos  
**Servicio front actual:** `ImagenesService.deleteById(idImagen)` y `ProductoService.deleteImagen(id)`  
**Lo usa:** `DetalleProductoComponent.eliminarImagen()` y `UpdateComponent.eliminarImagen()`  
**Acción pendiente front:** cuando se migre, cambiar URL a `/imagen/v2/{id}` y conectar al toggle v2  
**RabbitMQ:** TODO — candidato para evento `imagen.eliminada`

**Flujo actual:** Detalle de producto / Editar producto → clic en ✕ sobre una imagen → confirmar → se llama el endpoint.

---

### 6. DELETE /imagen/{productoId}/imagenes ❌ Deprecated → DELETE /imagen/v2/{productoId}/imagenes ✅
**Micro:** microservicio de imágenes (`environment.api_imagenes`)  
**Controlador back:** `eliminarImagenesEspecificas()` → v2: `eliminarImagenesEspecificasV2()`  
**Body:** `[imagenId1, imagenId2, ...]` (Long[])  
**Response:** HTTP 200 `{ message }` — igual  
**Servicio front actual:** `ImagenesService.eliminarImagenesBatch(productoId, ids)`  
**Lo usa:** `DetalleProductoComponent.confirmarEliminarBatch()`  
**Acción pendiente front:** cambiar URL a `/imagen/v2/{productoId}/imagenes` y conectar al toggle v2  

**Flujo actual:** Detalle de producto → marcar varias imágenes con ✕ → "Eliminar seleccionadas" → confirmar.

---

### 7. DELETE /imagen/producto ❌ Deprecated → DELETE /imagen/v2/producto ✅
**Micro:** microservicio de imágenes (`environment.api_imagenes`)  
**Controlador back:** `eliminarImagenesDeProductos()` → v2: `eliminarImagenesDeProductosV2()`  
**Body:** `[productoId1, productoId2, ...]` (Integer[])  
**Response:** HTTP 200 `{ message }` — igual  
**Servicio front actual:** ⚠️ NO implementado en el front todavía — ningún componente usa este endpoint  
**Acción pendiente front:** agregar método en `ImagenesService` y conectar al componente que lo necesite  

---

### 8. GET /imagen/cache/imagen/limpiar ❌ Deprecated → GET /imagen/v2/cache/limpiar ✅
**Micro:** microservicio de imágenes (`environment.api_imagenes`)  
**Controlador back:** `limpiarTodaLaCacheDeImagenes()` → v2: `limpiarCacheImagenesV2()`  
**Diferencia:** v2 evicta más cachés (`imagenes`, `detalleImagen`, `detalle`, `detalle-v2`, `buscarImagenIdCache`)  
**Response:** v1 void | v2 HTTP 204 No Content  
**Servicio front actual:** ⚠️ NO implementado — `AdminService.limpiarCache()` llama a `DELETE /admin/cache` que es la caché GENERAL de Spring Boot, NO este endpoint  
**Acción pendiente front:** agregar método en `ImagenesService` o `AdminService`, agregar botón en `/admin/cache`  
**RabbitMQ:** TODO — publicar evento para invalidar caché en todos los nodos

---

### 6. DELETE /imagen/{productoId}/imagenes (body: string[])
**Estado:** activo  
**Servicio:** `ImagenesService.eliminarImagenesBatch(productoId, ids)`  
**Lo usa:** `DetalleProductoComponent.confirmarEliminarBatch()`  

**Flujo:** Ir a detalle de producto (admin) → marcar varias imágenes con checkbox → clic en "Eliminar seleccionadas" → confirmar.

---

### 7. PUT /producto-imagen/{imagenId}/principal
**Estado:** activo  
**Servicio:** `ImagenesService.setPrincipalProducto(imagenId)`  
**Lo usa:** `UpdateComponent.setPrincipal()`  

**Flujo:** Ir a editar producto → en la sección de imágenes, clic en "Marcar como principal" sobre una imagen.

---

### 8. GET /variantes/imagenes/{varianteId}/paginado?pagina=&size=
**Estado:** activo  
**Servicio:** `VarianteService.getImagenesPaginado(id, pagina, size)` → `src/app/variante/service/variante.service.ts`  
**Lo usa:** componentes de edición de variantes  

**Flujo:** `Mis productos` → `Gestionar variantes` → seleccionar variante → sección de imágenes.

---

### 9. PUT /variantes/imagenes/{imagenId}/principal
**Estado:** activo  
**Servicio:** `VarianteService.setPrincipalVariante(imagenId)`  

**Flujo:** igual que endpoint 8, clic en "Marcar como principal" en la variante.

---

### 10. DELETE /variantes/{varianteId}/imagenes (body: string[])
**Estado:** activo  
**Servicio:** `VarianteService.eliminarImagenes(varianteId, imageIds)`  

**Flujo:** editar variante → marcar imágenes → eliminar lote.

---

### 9. GET /presentacion/imagenes?tipo= — @Deprecated → GET /presentacion/v2/imagenes?tipo= ✅
**Usado en:** login (`login-form.component.ts`) y registro (`add-usuarios.component.ts`)
**Servicio:** `PresentacionService` → `src/app/presentacion/presentacion.service.ts`
**v1:** devuelve `nombreArchivo` (ruta de disco interno) — deprecated
**v2:** devuelve `urlImagen` → apunta a GET /presentacion/v2/imagenes/{id}/imagen (bytes del micro)
**Toggle:** cuando `IMG v2` activo → usa `getImagenesPorTipoV2()` + bytes via `getImagenV2Bytes(id)`
**Cache back:** @Cacheable("presentacion-imagenes") — menor carga en BD

---

### 10. GET /presentacion/imagenes/{id}/imagen — @Deprecated → GET /presentacion/v2/imagenes/{id}/imagen ✅

| | v1 (deprecated) | v2 (✅ conectado) |
|---|---|---|
| **Endpoint** | `GET /presentacion/imagenes/{id}/imagen` | `GET /presentacion/v2/imagenes/{id}/imagen` |
| **Servicio** | `PresentacionService.getImagenUrl(id)` → devuelve URL string | `PresentacionService.getImagenV2Bytes(id)` → devuelve `Observable<string>` (ObjectURL blob) |
| **Response OK** | `byte[]` con `Content-Type: image/*` | igual |
| **Response error** | HTTP 500 si archivo no existe en disco | HTTP 204 sin body — no explota |
| **Toggle** | Se llama cuando `IMG v2` está **inactivo** (v1 path en `imgSrc()`) | Se llama cuando `IMG v2` está **activo** (v2 path en `imgSrc()`) |

**Estado front:** ✅ Ya conectado.

**Fix aplicado (2026-05-21):** El enfoque blob (HttpClient → ObjectURL → SafeUrl) fallaba silenciosamente en todos los componentes. Se reemplazó por URL directa igual que v1. `getImagenUrlV2(id)` devuelve `${urlV2}/${id}/imagen` como string — el browser hace el GET igual que en v1.

**Flujo v1:** `imgSrc(orden)` → `getImagenUrl(img.id)` → string URL directa en `<img [src]>`
**Flujo v2:** `imgSrc(orden)` → `getImagenUrlV2(img.id)` → string URL directa en `<img [src]>`

**Componentes que lo usan:**
- `src/app/login/login-form/login-form.component.ts` → tipo `LOGIN`
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` → tipo `REGISTRO`

**Cómo llegar (login):** ir a `/login` → las imágenes del panel izquierdo usan este endpoint.
**Cómo llegar (registro):** ir a `/usuarios/registrar` → mismo panel izquierdo.

---

### 11. GET /presentacion/imagenes/todas — @Deprecated → GET /presentacion/v2/imagenes/todas ✅ (ADMIN)

| | v1 (deprecated) | v2 (✅ conectado) |
|---|---|---|
| **Endpoint** | `GET /presentacion/imagenes/todas` | `GET /presentacion/v2/imagenes/todas` |
| **Servicio** | `PresentacionService.getTodasImagenes()` | `PresentacionService.getTodasImagenesV2()` |
| **Response** | `{ data: IImagenPresentacion[] }` con `nombreArchivo` | `{ data: IImagenPresentacionV2Dto[] }` con `urlImagen` |
| **Auth** | Bearer token requerido | igual |
| **Toggle** | Inactivo → v1 | Activo → v2 |

**Estado front:** ✅ Conectado. `PresentacionImagenesComponent` chequea toggle en `cargar()`.

**Flujo v2:** `cargar()` llama `getTodasImagenesV2()` → puebla `imagenes` → `imagenSrc()` llama `getImagenUrlV2(img.id)` → URL directa en `<img [src]>` (mismo patrón que v1).

**Componente:** `src/app/admin/presentacion-imagenes/presentacion-imagenes.component.ts`  
**Cómo llegar:** Login como admin → sidebar → `Admin` → `Imágenes de presentación`.

---

### 12. PUT /presentacion/imagenes/{id} — @Deprecated → PUT /presentacion/v2/imagenes/{id} ✅ (ADMIN)

| | v1 (deprecated) | v2 (✅ conectado) |
|---|---|---|
| **Endpoint** | `PUT /presentacion/imagenes/{id}` | `PUT /presentacion/v2/imagenes/{id}` |
| **Servicio** | `PresentacionService.actualizarImagen()` | `PresentacionService.actualizarImagenV2()` |
| **Body** | igual en ambas versiones | igual |
| **Response** | `{ data: IImagenPresentacion }` con `nombreArchivo` | `{ data: IImagenPresentacionV2Dto }` con `urlImagen` |
| **Toggle** | Inactivo → v1 | Activo → v2 |

**Estado front:** ✅ Conectado. `PresentacionImagenesComponent.guardar()` elige el método según toggle.

**Componente:** `src/app/admin/presentacion-imagenes/presentacion-imagenes.component.ts`  
**Cómo llegar:** Admin → Imágenes de presentación → editar descripción / subir imagen → botón Guardar.

---

### 13. GET /variantes/imagenes/{varianteId} — @Deprecated → GET /variantes/v2/imagenes/{varianteId} ✅

| | v1 (deprecated) | v2 (✅ en servicio) |
|---|---|---|
| **Endpoint** | `GET /variantes/imagenes/{varianteId}` | `GET /variantes/v2/imagenes/{varianteId}` |
| **Servicio** | `VarianteService.getImagenesVariante(id)` | `VarianteService.getImagenesVarianteV2(id)` |
| **Response OK** | `{ data: IVarianteImagenDto[] }` — puede traer `urlImagen` rotas | `{ data: IVarianteImagenDto[] }` — retorna `[]` en lugar de URLs rotas |
| **Sin imágenes** | puede lanzar error | `{ data: [] }` — nunca explota |

**Estado front:** ⚠️ MÉTODOS CREADOS PERO SIN USAR — ningún componente los llama.

**Importante — no confundir con el endpoint paginado:**
- Este endpoint 13 (`/variantes/imagenes/{id}`) → NO paginado, devuelve todas las imágenes de una vez. **No está en uso.**
- El endpoint paginado (`/variantes/imagenes/{id}/paginado`) → es un endpoint DISTINTO, usado por `detalle-variante` y `update-variante` via `getImagenesPaginado()`. Ese tiene su propia migración pendiente.

**Pendiente:** cuando el back confirme quién debe usar este no-paginado, conectar con toggle en el componente correspondiente.

---

### 14. DELETE /variantes/imagenes — @Deprecated → DELETE /variantes/v2/imagenes ✅ (ADMIN)

| | v1 (deprecated) | v2 (✅ en servicio) |
|---|---|---|
| **Endpoint** | `DELETE /variantes/imagenes` | `DELETE /variantes/v2/imagenes` |
| **Servicio** | `VarianteService.eliminarTodasImagenesVariantes(ids[])` | `VarianteService.eliminarTodasImagenesVariantesV2(ids[])` |
| **Body** | `[varianteId1, varianteId2, ...]` (Integer[]) | igual |
| **Response 200** | `{ data: "Imágenes eliminadas correctamente" }` | igual |
| **Diferencia** | misma lógica | solo cambia la URL |

**⚠️ NO confundir con `eliminarImagenes(varianteId, imageIds[])`** → ese es `DELETE /variantes/{varianteId}/imagenes` (body: imageIds string[]) — borra imágenes específicas de UNA variante. Ya usado en `detalle-variante` y `update-variante`.

**Estado front:** ⚠️ MÉTODOS CREADOS PERO SIN USAR — ningún componente llama a este endpoint aún. Es una operación masiva admin (borrar TODAS las imágenes de varias variantes a la vez). Pendiente de UI y confirmación del back.

---

### 15. DELETE /variantes/{varianteId}/imagenes — @Deprecated → DELETE /variantes/v2/{varianteId}/imagenes ✅

| | v1 (deprecated) | v2 (✅ conectado) |
|---|---|---|
| **Endpoint** | `DELETE /variantes/{varianteId}/imagenes` | `DELETE /variantes/v2/{varianteId}/imagenes` |
| **Servicio** | `VarianteService.eliminarImagenes(id, imageIds[])` | `VarianteService.eliminarImagenesV2(id, imageIds[])` |
| **Body** | `[imagenId1, imagenId2, ...]` (Long[]) | igual |
| **Response 200** | `{ data: "Imágenes eliminadas correctamente" }` | igual |
| **Toggle** | Inactivo → v1 | Activo → v2 |

**⚠️ No confundir con endpoint 14** (`DELETE /variantes/imagenes` body: varianteIds[]) — ese borra TODAS las imágenes de varias variantes y no está en uso.

**Componentes que lo usan:**
- `src/app/variante/detalle-variante/detalle-variante.component.ts` → `confirmarEliminar()` — selección múltiple de imágenes
- `src/app/variante/update-variante/update-variante.component.ts` → botón ✕ por imagen individual

**Cómo llegar (detalle):** Gestionar variantes → seleccionar variante → marcar imágenes → Eliminar seleccionadas.
**Cómo llegar (update):** Mis variantes → Editar → sección imágenes → ✕ sobre una imagen.

---

### Servicio de toggle de versión
**Archivo:** `src/app/services/imagen-version/imagen-version.service.ts`  
`ImagenVersionService.useV2` → `boolean` — indica si se usa v2  
`ImagenVersionService.toggle()` → cambia entre v1 y v2  
El estado es en memoria (se resetea al recargar la página), diseñado solo para pruebas en sesión.

---

## FIX CHAT ADMIN — NOTIFICACIONES + REFINAMIENTO `contenido` (2026-06-17)

> Segunda y tercera ronda de fixes en el módulo chat, tras comprobar en vivo que historial no
> cargaba y que el panel admin no daba feedback de mensajes nuevos.

### 1. Sonido de notificación al recibir mensaje nuevo
`ChatAdminComponent.ngOnInit()` ahora trackea el array `sesiones` anterior. Cuando detecta que
alguna sesión aumentó su `noLeidos`, llama `playNotificationSound()` — Web Audio API (oscilador
880 Hz, 300ms, decaimiento exponencial). Sin archivo externo, wrapped en `try/catch` para no
crashear si el navegador bloquea autoplay.

```typescript
private playNotificationSound(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch { /* autoplay bloqueado — sin sonido, sin crash */ }
}
```

### 2. Highlight de sesiones con mensajes no leídos
`chat-admin.component.html`: clase `.ca-session-item--unread` cuando `s.noLeidos > 0` y la
sesión no está activa. `chat-admin.component.scss`: borde rojo + nombre en bold/rojo, en dark
y light mode.

### 3. Refactoring del campo `contenido` — eliminar fallback especulativo
En la sesión anterior se agregó `h.contenido ?? (h as any).mensaje ?? ''` asumiendo que el
back podría mandar el campo con el nombre `mensaje`. **El back confirmó que el campo siempre
es `contenido`** (`ChatEventoAdmin.builder().tipo("MENSAJE").contenido(request.getContenido())`).
Los eventos `NUEVA_SESION` tienen `contenido: null` por diseño — no tienen mensaje aún.

Fix: `cargarHistorial()` filtra con `!!h.contenido` antes de mapear; el STOMP handler de
mensajes RT usa `evento.contenido` directo (sin fallback). El template usa `msg.contenido || '…'`
solo como guard visual para el caso `NUEVA_SESION` que llega al front sin mensaje.

**Archivos modificados:**
- `src/app/admin/chat-admin/chat-admin.component.ts` → `playNotificationSound()`, tracking de `anterior` en `sesiones$`
- `src/app/admin/chat-admin/chat-admin.component.html` → `[class.ca-session-item--unread]`, `|| '…'`
- `src/app/admin/chat-admin/chat-admin.component.scss` → `.ca-session-item--unread` light/dark
- `src/app/chat/service/chat-admin.service.ts` → `cargarHistorial()` filter `!!h.contenido`, STOMP handler `evento.contenido` directo

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX CHAT ADMIN — MIGRACIÓN v2→v1 EN SERVICIOS DE IMÁGENES (2026-06-17)

**Contexto:** el backend renombró todas las rutas `/v2/` a `/v1/` (nueva versión estable).
Las rutas viejas pasaron a `/v3/` (deprecated). El front tenía dos servicios con URLs
hardcodeadas con `/v2/` que devolvían 404.

**Fix:**
- `src/app/imagene/imagenes.service.ts` → `getImagenV2()`: `${urlImg}/v2/${productoId}` → `${urlImg}/v1/${productoId}`
- `src/app/productos/service/producto.service.ts` → `getDataImgV2()`: `${urlImg}/v2/${id}/detalle` → `${urlImg}/v1/${id}/detalle`

**Nota:** otros servicios (`VarianteService`, `PresentacionService`) ya usaban `/v1/` correctamente
desde sesiones anteriores — no requirieron cambios.

**Dead code eliminado:**
- `src/app/productos/producto/all/all.component.ts` → `public env: string = environment.api_imagenes + "/imagenes/buscarImagenProducto/"` (propiedad legacy de AG Grid renderer, never used) + import `environment` que quedó sin uso. El template ya usaba `item.imagen?.urlImagen | imagenSrc`.

**Archivos modificados:**
- `src/app/imagene/imagenes.service.ts`
- `src/app/productos/service/producto.service.ts`
- `src/app/productos/producto/all/all.component.ts`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX CHAT — SESIONES VACÍAS + HISTORIAL CLIENTE + PERSISTENCIA sesionId (2026-06-17)

> Dos bugs confirmados tras revisar `CAMBIOS_FRONT.md` actualizado por el backend.

### 1. Panel admin mostraba 0 sesiones aunque hubiera chats activos
`ChatAdminService.cargarSesiones()` tipaba el response de `GET /v1/chat/admin/sesiones` como
`SesionActiva[]` (array plano). El backend devuelve `ResponseGeneric<List<SesionActiva>>`
envuelto: `{ code, mensaje, data: [...] }`. Como `SesionActiva[]` no tiene campo `data`,
`sesiones.map(...)` operaba sobre `undefined` y el `BehaviorSubject` quedaba en `[]`.

**Fix:** cambiar a `ApiResponse<SesionActiva[]>` y leer `res?.data ?? []`.

### 2. Historial del cliente no persistía al recargar la página
`ChatLiveService` guardaba `sesionId` solo en memoria — al recargar se perdía y el usuario
iniciaba una sesión nueva sin ver la conversación anterior.

**Fix:**
- Guardar `sesionId` en `sessionStorage` cuando se recibe por primera vez en `onConnect()`
- En `conectar()`, recuperar `sesionId` de `sessionStorage` si existe
- En `onConnect()`, si hay `sesionId`, llamar `cargarHistorial(sesionId)` antes de re-suscribir
  al canal WebSocket → `GET /v1/chat/historial/{sesionId}` (nuevo endpoint público sin token)
- Al desconectar (`desconectar()`), limpiar `sessionStorage.removeItem(SESION_KEY)`
- `cargarHistorial()` hace merge por timestamp igual que el admin — conserva mensajes RT
  que llegaron antes de que el REST respondiera

**Archivos modificados:**
- `src/app/chat/service/chat-admin.service.ts` → `cargarSesiones()` usa `ApiResponse<SesionActiva[]>`
- `src/app/chat/service/chat-live.service.ts` → `sessionStorage`, `cargarHistorial()`, inyecta `HttpClient`

**Verificado con `ng build --configuration=development` sin errores.**

---

## ~~FIX CHAT — `clienteId` COMO FUENTE PRIMARIA DE HISTORIAL (2026-06-18)~~

> **⚠️ OBSOLETO — reemplazado por la sección "REESCRITURA `chat-live.service.ts`" más abajo.**
> El `clienteId` ya no existe en el código. Este registro se conserva solo para entender la cadena de decisiones.

**Síntoma:** al abrir `/chat` en QA con un usuario autenticado, el historial no cargaba aunque
hubiera mensajes en la BD. El backend veía la request al endpoint `/historial/usuario/{id}` pero
devolvía vacío.

**Causa raíz:** cuando `usuarioId` estaba disponible, el front llamaba `/historial/usuario/{id}`.
Pero las sesiones anteriores se crearon ANTES de que incluyéramos `usuarioId` en el payload de
`/app/chat.conectar`, así que el backend no las tenía vinculadas a ese `usuarioId` — el endpoint
devolvía array vacío aunque hubiera mensajes bajo el mismo `clienteId`.

**Fix:** `chat-live.service.ts` → `conectar()` y `cargarMasAntiguos()`:
- Antes: `usuarioId` era el criterio primario (si logueado → `/historial/usuario/{id}`)
- Ahora: `clienteId` es siempre el criterio primario (cubre todas las sesiones del browser,
  incluyendo las previas a la implementación de `usuarioId`)
- `usuarioId` queda como fallback solo si localStorage fue borrado y `clienteId` es null

**Nota importante — `clienteId` y cross-browser:** `clienteId` es un UUID generado una sola vez
por browser (`localStorage['chat_cliente_id']`). Si el usuario abre el chat en otro browser,
modo incógnito, o limpia el localStorage, el nuevo UUID no tiene historial en la BD — no hay
forma de recuperar los mensajes del UUID anterior sin conocerlo. Esta es la limitante del
enfoque `clienteId`-first. Para el futuro, cuando todos los mensajes nuevos ya tengan `usuarioId`
vinculado, se puede plantear migrar la prioridad a `usuarioId` (más robusto cross-browser).

**URL QA — sin duplicación de path:**
- `environment.qa.ts` → `api_Url: 'https://qa.backend.novedades-jade.com.mx/mis-productos'`
- `historialBase` = `${api_Url}/v1/chat/historial` → solo UN `/mis-productos/v1/` en la URL
- El path duplicado `/mis-productos/v1/mis-productos/v1/` no lo genera nuestro código — si el
  backend lo observa en Network tab, el build del QA server no está usando el código actual
  (necesita rebuild de la rama `qa`).

**Archivos modificados:**
- `src/app/chat/service/chat-live.service.ts` → `conectar()` y `cargarMasAntiguos()`, prioridad `clienteId`

**Verificado con `ng build --configuration=development` sin errores.**

---

## LECCIONES APRENDIDAS — MÓDULO CHAT

> Patrones que causaron bugs en este módulo. Revisar antes de tocar `chat-admin.service.ts`,
> `chat-live.service.ts`, `ChatAdminComponent` o `ChatUsuarioComponent`.

1. **No asumir el nombre del campo de un evento WebSocket — confirmarlo con el backend antes
   de escribir fallbacks.** Se agregó `h.contenido ?? (h as any).mensaje ?? ''` porque no
   había certeza del nombre. El backend tenía `contenido` desde siempre
   (`ChatEventoAdmin.contenido`). El fallback solo añadía ruido y enmascaraba otros bugs.
   Regla: pedir el modelo Java/Kotlin del evento antes de mapear en TypeScript, no después.

2. **No usar guards de `if (!array.length)` para decidir si cargar datos remotos** — puede
   haber datos en memoria de otra fuente (WebSocket) y el guard cortocircuita la carga REST.
   `seleccionarSesion()` tenía `if (!sesion.mensajes.length) cargarHistorial()`: si el usuario
   mandó mensajes antes de que el admin hiciera clic, `mensajes.length > 0` y el historial
   NUNCA se cargaba. Fix: siempre llamar `cargarHistorial()` al seleccionar una sesión — el
   merge por timestamp se encarga de no duplicar mensajes.

3. **SockJS intenta transporte iframe por defecto — bloqueado en servidores con `X-Frame-Options: deny`.**
   El servidor devuelve 404 en `/ws/iframe.html` y SockJS lanzaba errores de consola que podían
   interferir con la conexión. Fix estándar para cualquier conexión SockJS nueva en este proyecto:
   ```typescript
   webSocketFactory: () => new (SockJS as any)(url, null, {
     transports: ['websocket', 'xhr-streaming', 'xhr-polling']
   })
   ```
   Aplicar en ambos servicios (`chat-admin.service.ts` y `chat-live.service.ts`) y en cualquier
   otro cliente SockJS que se agregue.

4. **Al reemplazar datos de REST que se solapan con datos en tiempo real (WebSocket), siempre
   hacer merge por timestamp, no reemplazar el array completo.** `cargarHistorial()` hacía
   `s.mensajes = historialDelRest` — borraba mensajes WebSocket que ya habían llegado mientras
   el GET estaba en vuelo. Patrón correcto:
   ```typescript
   const ultimoTs = base[base.length - 1]?.timestamp ?? null;
   const rt = ultimoTs ? s.mensajes.filter(m => m.timestamp > ultimoTs) : [];
   return { ...s, mensajes: [...base, ...rt] };
   ```
   Aplica a cualquier componente donde REST + WebSocket alimentan la misma lista.

5. **Cuando el backend renombra rutas versionadas (`/v2/` → `/v1/`), hacer grep de la versión
   vieja en TODOS los servicios del proyecto** — no solo en el servicio más obvio. En esta sesión
   había DOS servicios con `/v2/` hardcodeado (`imagenes.service.ts` y `producto.service.ts`).
   Comando de búsqueda: grep por `/v2/` en `src/app/**/*.ts`.

6. **Los eventos `NUEVA_SESION` llegan con `contenido: null` por diseño** — no son un bug. El
   campo `contenido` solo tiene valor en eventos de tipo `MENSAJE`. El handler STOMP debe
   filtrar por `evento.tipo === 'MENSAJE' && evento.contenido` antes de procesar. El template
   puede usar `|| '…'` como fallback visual, pero el servicio no debe agregar ese mensaje al
   array si `contenido` es null/vacío.

7. **TODOS los endpoints REST del módulo chat usan `ResponseGeneric` — leer siempre `res?.data ?? []`.**
   Tanto `GET /v1/chat/admin/historial/{sesionId}` como `GET /v1/chat/admin/sesiones` devuelven
   `{ code, mensaje, data: [...], lista }`. Al tiparlo como el array directamente (`http.get<SesionActiva[]>`)
   el campo `data` no existe en `SesionActiva[]`, así que el guard `if (!sesiones)` o el `map()` opera
   sobre `undefined` → panel vacío. Regla: ante cualquier endpoint nuevo del chat (o del proyecto en
   general), asumir `ApiResponse<T>` y leer `res?.data ?? []` salvo confirmación explícita de que el
   back devuelve el array/objeto raíz directamente.

8. **No mantener fallbacks de identificadores viejos (`clienteId`) una vez que el backend publica un spec definitivo con el identificador canónico (`usuarioId`).** La sección "clienteId como fuente primaria" fue un parche temporal para cubrir sesiones pre-`usuarioId`. Pero el backend nunca tuvo un endpoint de historial por `clienteId` — esas sesiones antiguas simplemente no son recuperables por `usuarioId` porque no estaban vinculadas en BD. La solución correcta no es mantener el fallback sino aceptar que las sesiones anteriores a la migración se pierden (comportamiento esperado) y adoptar el identificador nuevo de forma limpia. **Regla:** cuando el backend publica un spec (`CHAT_EN_VIVO.md`), adoptarlo completo sin capas de compatibilidad que no tienen soporte en el back.

9. **Cuando el servidor QA no refleja los cambios del front, el problema casi siempre es que el bundle no se ha reconstruido — no que el código esté mal.** El backend reportó "no recibo `usuarioId` en el WS payload" cuando el código nuevo ya lo incluía incondicionalmente. El bundle del servidor QA era el antiguo. Diagnóstico rápido: cambiar un texto visible en la UI (ej. el título del chat) o agregar `version` al `environment.qa.ts` → si el browser no muestra el cambio, el servidor sigue con el bundle viejo. No invertir tiempo en depuración de código cuando la causa puede ser un deploy pendiente.

10. **`sessionStorage` puede quedar con un `sesionId` muerto si la sesión WS expiró mientras el tab estaba cerrado.** El evento `SESION_CERRADA` que limpia sessionStorage nunca llega si el front no estaba conectado. Al arrancar el componente, el código cargaba ese `sesionId` muerto en `this.sesionId`, y `onConnect()` lo reutilizaba brincando `iniciarNuevaSesion()` — por eso `/app/chat.conectar` nunca se publicaba y todos los mensajes se descartaban en el back. Fix: limpiar sessionStorage y `this.sesionId` al inicio de `conectar()`, no depender de que `SESION_CERRADA` siempre llega a tiempo.

---

## FIX CHAT — REESCRITURA `chat-live.service.ts` + REFACTOR `ChatUsuarioComponent` (2026-06-18)

> El backend publicó su spec definitivo en `CHAT_EN_VIVO.md`. La lógica de `clienteId`/localStorage
> que se había agregado en sesiones anteriores no tenía soporte en el back (no hay endpoint
> `/historial/clienteId/{id}`). Se reescribió el servicio del cliente alineado al spec.

**⚠️ NOTA:** La sección anterior "FIX CHAT — `clienteId` COMO FUENTE PRIMARIA DE HISTORIAL" quedó
**obsoleta y reemplazada** por esta reescritura. El `clienteId` ya no existe en ningún archivo.

### `chat-live.service.ts` — reescritura completa

- `clienteId` eliminado por completo. Sin `localStorage`. El chat es **exclusivo para usuarios autenticados** — si `usuarioId` es null/undefined, `conectar()` no hace nada.
- Flujo en `conectar()`: **primero** `cargarHistorial(0)` → REST devuelve mensajes previos → **después** `activarStomp()` → WebSocket listo. Así el historial aparece antes de que el WS esté conectado.
- `historialBase = ${environment.api_Url}/v1/chat/historial/usuario` → `GET /{usuarioId}?pagina=N&size=20`
- Response: `ApiResponse<HistorialPaginado>` — siempre leer `res?.data`.
- `iniciarNuevaSesion()` publica `{ tempId, nombreUsuario, usuarioId }` incondicionalmente — `usuarioId` siempre está porque `conectar()` ya validó que existe.
- `sesionId` persiste en `sessionStorage` (se pierde al cerrar pestaña — correcto por diseño, la sesión WS expira de todos modos en 5 min de inactividad).
- `cargarMasAntiguos()` llama al mismo endpoint con `pagina + 1` y hace prepend.
- `desconectar()` limpia `sessionStorage` (no hay `localStorage` que limpiar).

### `chat-usuario.component.ts` — simplificado

- `sesionCerrada` renombrado a `sesionExpirada` — aviso informativo, **NO bloquea el input**.
- `reiniciar()` eliminado — cuando la sesión expira, el siguiente `enviarMensaje()` detecta `!sesionId` y reconecta solo (`cargarHistorial(0)` + `iniciarNuevaSesion()`).
- `enviar()` solo bloquea en `estadoConexion === 'sin-internet' | 'reconectando'`.
- Al enviar: `sesionExpirada = false` se limpia automáticamente.

### `chat-usuario.component.html`

- Eliminado botón "Iniciar nuevo chat".
- Banner de sesión cerrada → aviso no bloqueante: "⏱ La sesión expiró por inactividad. Escribe un mensaje para continuar."
- Input y botón solo `[disabled]` en `sin-internet` o `reconectando`.
- Título cambiado a **"Chat con soporte v2"** como indicador visual de deploy (saber si el bundle nuevo está activo en QA).

### `environment.qa.ts`

- Agregado `version: '2026-06-18'` como smoke change para forzar rebuild del bundle en el servidor QA.

**Archivos modificados:**
- `src/app/chat/service/chat-live.service.ts` → reescritura completa
- `src/app/chat/chat-usuario/chat-usuario.component.ts` → `sesionExpirada`, sin `reiniciar()`
- `src/app/chat/chat-usuario/chat-usuario.component.html` → sin botón reiniciar, aviso no bloqueante, título "v2"
- `src/environments/environment.qa.ts` → `version: '2026-06-18'`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX CHAT — `sesionId` DE SESSIONSTORAGE BLOQUEABA `chat.conectar` (2026-06-18)

**Síntoma confirmado en logs de QA:**
```
[WS] /chat.mensaje recibido — sesionId=2e46efe3-..., contenido=...
[WS] Sesión inactiva o inexistente: 2e46efe3-... — mensaje descartado
```
`/chat.conectar` nunca aparecía en los logs. El front enviaba mensajes con un `sesionId` de una sesión CERRADA — llegaban al back pero se descartaban silenciosamente.

**Causa raíz:** `conectar()` leía `sesionId` de `sessionStorage` y lo asignaba a `this.sesionId`. En `onConnect()`, al ver `this.sesionId !== null`, brincaba directo a `suscribirseAlCanal()` sin llamar nunca `iniciarNuevaSesion()`. La sesión en sessionStorage estaba CERRADA en el back (expiró por inactividad mientras el tab estaba cerrado), pero el front no lo sabía y nunca publicaba `/app/chat.conectar`.

**Fix en `conectar()`:**
```typescript
// Siempre arrancar con sesión limpia
sessionStorage.removeItem(SESION_KEY);
this.sesionId = null;
```
Para reconexiones mid-session (caída de red), `this.sesionId` ya está en memoria → `onConnect()` lo reutiliza correctamente sin necesitar sessionStorage.

**Archivos modificados:**
- `src/app/chat/service/chat-live.service.ts` → `conectar()` limpia sessionStorage al inicio

**Verificado en QA:** tras redespliegue + hard refresh, el back mostró:
```
[WS] /chat.conectar recibido — tempId=..., nombreUsuario=..., usuarioId=66
```

---

## CI/CD — ESTADO Y CONFIGURACIÓN DEL PIPELINE QA (2026-06-18)

### Archivos de workflow

| Archivo | Dispara en | Qué hace |
|---|---|---|
| `.github/workflows/producto-actions-qa.yml` | `push` a rama `qa` | Build Docker `--configuration=qa` → push a Docker Hub como `front-jade-service:qa` → SSH al VPS → `kubectl rollout restart ... -n qa` |
| `.github/workflows/proyecto-front-actions.yml` | `push` a rama `master` | Build Docker `--configuration=production` → push como `front-jade-service:latest` → SSH → restart en namespace `default` |

### Secrets requeridos en GitHub

**Settings → Secrets and variables → Actions** del repositorio:

| Secret | Qué es |
|---|---|
| `DOCKER_USERNAME` | Usuario de Docker Hub |
| `DOCKER_PASSWORD` | Token de acceso de Docker Hub (no la contraseña) |
| `VPS_HOST` | IP o hostname del servidor VPS de QA |
| `VPS_USER` | Usuario SSH del VPS (probablemente `ubuntu`) |
| `VPS_SSH_KEY` | Clave privada SSH completa (el VPS debe tener la pública en `~/.ssh/authorized_keys`) |

### Cómo verificar qué falló

1. Ir a **GitHub → repositorio → pestaña Actions**
2. Filtrar por rama `qa` o buscar el workflow "Build and Push Docker QA"
3. Clic en el último run → ver qué step falló (Build, Login, Push o Deploy SSH)
4. El log de cada step muestra el error exacto

### Causas más comunes de fallo

- **SSH falla:** el secret `VPS_SSH_KEY` expiró o el IP del VPS cambió → actualizar el secret
- **Docker push falla:** `DOCKER_PASSWORD` es la contraseña de cuenta en vez de un Access Token — Docker Hub requiere un token generado en hub.docker.com → Account Settings → Security → New Access Token
- **`sudo kubectl` falla:** el usuario SSH no tiene passwordless sudo → en el VPS: `echo "ubuntu ALL=(ALL) NOPASSWD: /usr/bin/kubectl" | sudo tee /etc/sudoers.d/kubectl-access`
- **Build Docker falla por memoria:** `ng build` con `--configuration=qa` puede requerir más RAM de la disponible en el runner — poco probable con GitHub-hosted runners (7GB), más común en self-hosted

### ⏳ PENDIENTE — Diagnosticar por qué el workflow no corre automáticamente

El workflow está bien configurado pero no dispara el deploy al hacer push a `qa`.
Para investigar: **GitHub → repositorio → pestaña Actions → "Build and Push Docker QA"** → ver el último run y en qué step falló. Verificar también que los 5 secrets estén configurados en Settings → Secrets and variables → Actions.

### Workaround mientras no hay CI/CD automático

Después de hacer `git push origin qa`, entrar al VPS y correr:
```bash
kubectl rollout restart deployment proyecto-key-front-deployment -n qa
```

---

## FIX VENTA DIRECTA — SWAL "¿AGREGAR CLIENTE?" ANTES DE COBRAR SIN CLIENTE (2026-07-01)

**Requerimiento:** cuando el admin pulsa "Cobrar" sin haber seleccionado ningún cliente, en vez de
registrar la venta directamente con el admin como cliente, mostrar un Swal preguntando si quiere
agregar un cliente para la rifa.

**Flujo implementado:**
- Sin cliente seleccionado → Swal `question` "¿Agregar cliente para la rifa?" con dos botones:
  - **"Sí, agregar cliente"** → `cobrarPendiente = true` + `openModalSinRegistro()` — abre el modal de cliente sin registro. Al confirmar el formulario, `obtenerDatosClienteSinRegistro()` detecta `cobrarPendiente = true`, cierra el modal, resetea el flag y llama `ejecutarVenta(0)` directamente (sin Swal de "cliente agregado").
  - **"No, cobrar sin cliente"** → `ejecutarVentaConAdmin()` — extrae la lógica de buscar el cliente del admin (antes estaba inline en `cobrar()`). Si el admin no tiene perfil de cliente, muestra Swal de advertencia.
- Si ya hay `clienteSinRegistroModal` o `clienteSeleccionado` → flujo normal sin Swal (sin cambios).

**Campo `cobrarPendiente`:** `private cobrarPendiente = false`. Se resetea en `closeModalModalSinRegistro()` y `limpiarTodo()`.

**Archivos modificados:**
- `src/app/variante/venta-directa/venta-directa.component.ts` → `cobrar()` con Swal; nuevo `ejecutarVentaConAdmin()`; `obtenerDatosClienteSinRegistro()` con rama `cobrarPendiente`; `closeModalModalSinRegistro()` y `limpiarTodo()` resetean el flag

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT CHATBOT — TARJETAS DE PRODUCTOS + CARRITO (2026-07-01)

> Implementación del spec en `CAMBIOS_FRONT.md` sección "Chatbot — Tarjetas de productos".
> Cuando el backend devuelve `productos[]` en la respuesta del chatbot, se muestran cards
> debajo de la burbuja del bot con imagen, datos y acciones de carrito.

### Flujo completo

1. `POST /v1/chatbot/mensaje` puede devolver campos opcionales: `productos[]`, `hayMas`, `busquedaQuery`, `busquedaOffset`.
2. Si `productos.length > 0` → se renderizan cards en grid 2 columnas bajo la burbuja.
3. Imágenes: `GET /v1/variantes/imagenes/{varianteId}` → toma `data[0].urlImagen`. Placeholder 📦 si vacío o error.
4. "Ver más": `GET /v1/chatbot/buscar?q={busquedaQuery}&offset={busquedaOffset}` — APPENDE cards nuevas, no reemplaza.
5. Botón "🛒 Agregar" → `CarritoVarianteService.agregar()` con los datos de la variante.
6. Botón "✕" (solo visible cuando ya está en carrito) → `CarritoVarianteService.eliminar(varianteId)`.

### Campos opcionales en `IChatbotProducto`

`marca`, `talla`, `color` se muestran solo si no son `null`.

### Nuevos campos en `IBurbuja`

`productos?`, `hayMas?`, `busquedaQuery?`, `busquedaOffset?`, `cargandoMas?`

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/chatbot/chatbot.service.ts` | +`IChatbotProducto`, `IChatbotBuscarResponse`; extendido `IChatbotResponse`; +`buscar()`, `getImagenVariante()` |
| `src/app/chatbot/chatbot.component.ts` | +`imagenesVariante: Map<number, string>`; inyecta `CarritoVarianteService`; +`cargarImagenesProductos()`, `verMas()`, `agregarAlCarrito()`, `quitarDelCarrito()`; `enviar()` puebla productos en burbuja |
| `src/app/chatbot/chatbot.component.html` | `*ngFor` → `ng-container`; +bloque de tarjetas `.cb-cards-row` con grid 2 columnas y botón "Ver más" |
| `src/app/chatbot/chatbot.component.scss` | +`.cb-cards-row`, `.cb-cards-spacer`, `.cb-cards-wrap`, `.cb-cards-grid`, `.cb-card` (BEM), `.cb-btn-add`, `.cb-btn-remove`, `.cb-btn-mas`; dark mode al final |

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT TICKETS / COMPROBANTES — IMPRIMIR + ENVIAR CORREO/WHATSAPP (2026-07-01)

> Spec en `CAMBIOS_FRONT.md`. Aplica a Venta Directa y Abonos (abono parcial, liquidación, cancelación).

### Flujo

1. **Antes de cobrar:** checkboxes "📧 Correo" y "📱 WhatsApp" visibles si el cliente tiene los datos registrados. Si no los tiene, el checkbox aparece deshabilitado con hint "(sin correo registrado)".
2. **Al cobrar:** si algún checkbox está marcado, se incluye `enviarCorreo`/`enviarWhatsapp` + `ticketHtml`/`ticketTexto` en el request al backend. El backend maneja el envío real.
3. **Después de cobrar:** Swal de éxito tiene botón "🖨️ Imprimir ticket" (confirmButton) + "Cerrar" (cancelButton). Al confirmar, se abre popup con el ticket y se auto-imprime.

### Tipos de ticket

| Tipo | Cuándo |
|---|---|
| `venta` | Venta directa al contado (EFECTIVO/TRANSFERENCIA/TARJETA) |
| `abono` | Pago parcial en `/abonos` — muestra saldo restante |
| `liquidado` | Abono que liquida totalmente — muestra "LIQUIDADO" |
| `cancelacion` | Cancelación de APARTADO/FIADO en `/abonos` |

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `src/app/shared/ticket.util.ts` | `ITicketData`, `ITicketArticulo`, `generarHtmlTicket()`, `generarTextoWhatsapp()`, `imprimirTicket()` |

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/abonos/models/abono.model.ts` | `AbonoRequest` + campos ticket; `AbonoResponse` + `correoEnviado/whatsappEnviado/erroresEnvio`; nuevas interfaces `PedidoDetalleResponse`, `PedidoDetalleItem` |
| `src/app/pedidos/pedidos.service.ts` | + `getDetallePedido(pedidoId)` → `GET /v1/pedidos/{id}/detalle` |
| `src/app/abonos/abonos.component.ts` | `abrirModal()` pre-carga `detalleActual`; `registrarAbono()` genera ticket y muestra Swal con 🖨️; `cancelarPedido()` muestra Swal con 🖨️; `correoDisponible`/`whatsappDisponible` de `EstadoCuenta.telefono` (correo siempre false — sin campo en modelo) |
| `src/app/abonos/abonos.component.html` | Checkboxes correo/WhatsApp en el modal, antes del footer |
| `src/app/abonos/abonos.component.scss` | `.ab-ticket-checks`, `.ab-check-label`, `.ab-check-hint` |
| `src/app/variante/venta-directa/venta-directa.component.ts` | `enviarCorreo/enviarWhatsapp`; getters `correoDisponible`, `whatsappDisponible`, `nombreClienteTicket`; `actualizarCheckboxesTicket()`; `ejecutarVenta()` genera ticket antes de `limpiarTodo()` y muestra Swal con 🖨️ |
| `src/app/variante/venta-directa/venta-directa.component.html` | Sección `.vd-ticket-checks` con checkboxes correo/WhatsApp, visible cuando `lineas.length > 0` |
| `src/app/variante/venta-directa/venta-directa.component.scss` | `.vd-ticket-checks`, `.vd-check-label`, `.vd-check-hint` |

### Dudas anotadas en `CAMBIOS_FRONT.md`

- `EstadoCuenta` no tiene `correoElectronico` — correo siempre deshabilitado en modal de abono hasta que el back lo incluya en ese modelo
- `GET /v1/pedidos/{id}/detalle` — se llama al abrir el modal; si falla, el abono sigue funcionando pero sin botón de impresión
- Crédito (APARTADO/IR PAGANDO) en venta directa: cuando `res.pedidoId` existe y no hay `res.ventaId`, no se genera ticket de venta — solo se muestra el Swal normal de "Apartado registrado". Ticket de abono se genera en `/abonos` cuando se registra el primer pago.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX TICKETS — CORREO MANUAL + QR DINÁMICOS + WHATSAPP EN PAUSA (2026-07-01)

> Refinamiento del FEAT TICKETS de la sesión anterior, según spec de usuario y `PLAN_MEJORAS.md`.

### Decisiones implementadas

**WhatsApp EN PAUSA:** `enviarWhatsapp`, `ticketTexto`, eliminados de todos los flujos de envío. La función `generarTextoWhatsapp()` sigue en `ticket.util.ts` como utilidad futura, pero nada la llama.

**`enviarCorreo` nunca auto-marcado:** `actualizarCheckboxesTicket()` siempre pone `this.enviarCorreo = false`. El admin activa manualmente si quiere enviar.

**Correo manual (cliente sin correo):** en Venta Directa, Swal `input: 'email'` antes del POST cuando el cliente no tiene correo registrado. En `/abonos`, campo `<input type="email">` inline en el modal. El correo va en `notificacion.correo` del request.

**QR dinámicos desde negocio:** `GET /v1/negocio/contactos` → `{ whatsappUrl, facebookUrl }` en `ngOnInit()`. `qrWhatsapp` y `qrFacebook` solo si la URL existe. `qrTienda` siempre (`window.location.origin`).

**`notificacion.correo` en el request:** campo opcional que el back usa como destino en lugar del correo registrado del cliente (D-02 de `PLAN_MEJORAS.md` confirmado ✅).

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/negocio/negocio.service.ts` | +`IContactosPublicos`; +`getContactosPublicos()` → `GET /v1/negocio/contactos` |
| `src/app/abonos/models/abono.model.ts` | `INotificacionRequest.correo?: string`; eliminado `enviarWhatsapp`/`ticketTexto` |
| `src/app/variante/service/variante.service.ts` | `IVentaDirectaRequest.notificacion` solo tiene `enviarCorreo`, `correo?`, `ticketHtml`; quitados `enviarWhatsapp`/`ticketTexto` |
| `src/app/shared/ticket.util.ts` | `ITicketData` + campos `qrTienda?`, `qrWhatsapp?`, `qrFacebook?`; `generarHtmlTicket()` con sección QR via `api.qrserver.com`; CSS en `imprimirTicket()` |
| `src/app/variante/venta-directa/venta-directa.component.ts` | `correoManual`, `qrX` fields, `NegocioService`; nuevo `pedirCorreoManualYCobrar()`; QR en ticket; `limpiarTodo()` resetea `correoManual` |
| `src/app/abonos/abonos.component.ts` | `correoManual`, `qrX` fields, `NegocioService`; QR en tickets; `abrirModal()` resetea `correoManual`; eliminados `enviarWhatsapp`/`whatsappDisponible` |
| `src/app/abonos/abonos.component.html` | Si cliente tiene correo → checkbox `enviarCorreo`; si no → `<input email>` manual `.ab-input-correo` |
| `src/app/abonos/abonos.component.scss` | +`.ab-correo-manual`, `.ab-input-correo` |

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT MÓDULO REPORTES — PANTALLA DE REPORTES DE VENTAS F-12 (2026-07-02)

> Backend listo desde 2026-07-02. Módulo lazy `/reportes`, solo admin.

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `src/app/reportes/service/reportes.service.ts` | 4 endpoints + interfaces: `getDiario`, `getMensual`, `getCliente`, `getMasVendidos` |
| `src/app/reportes/reportes.component.ts` | 4 tabs, gráfica Chart.js nativo via `ViewChild` |
| `src/app/reportes/reportes.component.html` | UI: tabs + filtros + stat cards + canvas + tablas |
| `src/app/reportes/reportes.component.scss` | Variables CSS + dark/light mode |
| `src/app/reportes/reportes-routing.module.ts` | Ruta raíz `''` → `ReportesComponent` |
| `src/app/reportes/reportes.module.ts` | Módulo lazy (`CommonModule` + `FormsModule`) |

### Archivos modificados

| Archivo | Qué se agregó |
|---|---|
| `src/app/app-routing.module.ts` | Ruta lazy `/reportes` con guards `AuthGuard + AdminGuardGuard + CarritoGuard` |
| `src/app/navbar/navbar.component.html` | Link "📊 Reportes" → `/reportes` en accordion Pedidos (solo admin) |

### Endpoints conectados

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/v1/reportes/ventas/diario?fecha=YYYY-MM-DD` | Resumen de un día |
| `GET` | `/v1/reportes/ventas/mensual?mes=YYYY-MM` | Totales del mes + `porDia[]` para la gráfica |
| `GET` | `/v1/reportes/ventas/cliente/{id}` | Historial de compras de un cliente |
| `GET` | `/v1/reportes/ventas/productos-mas-vendidos?desde=&hasta=&limite=` | Ranking de variantes más vendidas |

### Nota técnica — `ng2-charts` eliminado

`ng2-charts` v5 (instalado en sesión anterior) es incompatible con Angular 14. Se usa **Chart.js v4 directamente** vía `ViewChild('barCanvas')` + `new Chart(canvas, config)`. La gráfica mensual llena días sin ventas con 0 construyendo un `Map<string, number>` de `porDia` y luego iterando todos los días del mes.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT DASHBOARD — PANTALLA DE MÉTRICAS DEL NEGOCIO F-13 (2026-07-02)

> Backend: `GET /v1/dashboard/resumen`. Módulo lazy en `/dashboard`, solo admin.

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `src/app/dashboard/service/dashboard.service.ts` | `DashboardResumen` interface + `getResumen()` → `GET /v1/dashboard/resumen` |
| `src/app/dashboard/dashboard.component.ts` | 9 metric cards + auto-refresh cada 5 min |
| `src/app/dashboard/dashboard.component.html` | Grid de cards con `ngIf` y clases de color por tipo |
| `src/app/dashboard/dashboard.component.scss` | Grid auto-fill, dark/light mode, tira de color por card |
| `src/app/dashboard/dashboard-routing.module.ts` | Ruta raíz `''` → `DashboardComponent` |
| `src/app/dashboard/dashboard.module.ts` | Módulo lazy (solo `CommonModule`) |

### Archivos modificados

| Archivo | Qué se agregó |
|---|---|
| `src/app/app-routing.module.ts` | Ruta lazy `/dashboard` con guards `AuthGuard + AdminGuardGuard + CarritoGuard` |
| `src/app/navbar/navbar.component.html` | Link "🏠 Dashboard" → `/dashboard` en accordion Pedidos (solo admin), antes de "📊 Reportes" |

### Métricas mostradas

| Campo backend | Card | Color |
|---|---|---|
| `ventasHoy` | 💰 Ventas hoy | Verde |
| `ventasMes` | 📆 Ventas del mes | Azul |
| `gananciaMes` | 📈 Ganancia mes | Teal |
| `gastosMes` | 💸 Gastos mes | Naranja |
| `gananciaNetaMes` | 🏦 Ganancia neta | Verde/Rojo (positivo/negativo) |
| `pedidosPendientesEntregar` | 📦 Pedidos por entregar | Amarillo |
| `creditosActivos` | 💳 Créditos activos | Índigo |
| `montoPorCobrar` | 🗂️ Por cobrar | Púrpura |
| `productosStockBajo` | ⚠️ Stock bajo | Rojo/Verde (0 ok / >0 alerta) |

**"Clientes nuevos este mes" NO incluido:** `Cliente` no tiene columna de fecha de registro en BD — no hay forma de calcularlo retroactivamente.

**Verificado con `ng build --configuration=development` sin errores.**

---

## EP-T2 — BOTÓN "REENVIAR TICKET" EN DETALLE PEDIDO (2026-07-02)

> Backend: `POST /v1/pedidos/{id}/notificar` → requiere ROLE_ADMIN. Método ya existía en `pedidos.service.ts`.

**Flujo:** botón "📧 Reenviar ticket" en el header del `DetallePedidoComponent`, visible solo para admin.
Al pulsar → Swal con input `email` (pre-relleno con `correoElectronico` del cliente si existe) → si confirma:
1. `GET /v1/pedidos/{id}/detalle` para obtener artículos y datos del pedido
2. `generarHtmlTicket()` con tipo detectado (`venta`/`abono`/`liquidado`)
3. `POST /v1/pedidos/{id}/notificar` con `{ correo, ticketHtml }` → Swal de confirmación/error

**Archivos modificados:**
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → getter `isAdmin`, método `reenviarComprobanteManual()`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` → botón `dp-btn-reenviar` en el header
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.scss` → `.dp-btn-reenviar` + dark mode

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT REPORTES — GRÁFICAS COMBINADAS (2026-07-02)

> Mejoras según "Guía de gráficas para reportes" en `PLAN_MEJORAS.md`.

- **Tab Mensual:** gráfica combinada — barras (índigo) = `totalVenta` + línea (verde) = `totalGanancia` por día. Leyenda habilitada.
- **Tab Por cliente:** línea de tendencia con `ventas[].fechaVenta` + `ventas[].totalVenta`, visible cuando `ventas.length > 1`.
- **Tab Más vendidos:** barras horizontales (`indexAxis: 'y'`), top 10, paleta multicolor.
- Los 3 charts usan `@ViewChild`, `pendingXxx`, `ngAfterViewInit` y `ngOnDestroy` para lifecycle correcto.
- `setTab()` re-renderiza el chart activo con `setTimeout(..., 50)` al cambiar de pestaña.

**Archivos modificados:**
- `src/app/reportes/reportes.component.ts` → reescritura con 3 charts
- `src/app/reportes/reportes.component.html` → +canvas en mensual, cliente y masVendidos

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT REPORTES — TAB "🎁 PROMOCIONES" (2026-07-13)

> Primera de las 4 features nuevas documentadas en `CAMBIOS_FRONT.md` (2026-07-13). Endpoint
> `GET /v1/reportes/ventas/promociones?desde=&hasta=` — combos vendidos, transacciones, venta y
> ganancia total por promoción, ordenado ya por el back (más vendidas primero). Incluye promos
> sin ninguna venta (todo en 0, `ultimaVenta: null`).

**Nuevo 5º tab en `/reportes`**, mismo patrón que los otros 4 (tabla, sin chart — el doc del back
solo pidió tabla + filtro de fechas opcional):
- Fechas `desde`/`hasta` **opcionales** — sin ellas trae el histórico completo. Se auto-carga la
  primera vez que se abre el tab (`promocionesCargadas` guard en `setTab()`, mismo patrón que evita
  refetch innecesario del resto de tabs).
- Tabla: Promoción, Combos vendidos, Transacciones, Total ($), Ganancia ($), Última venta —
  filas con `combosVendidos === 0` se muestran atenuadas (`.rp-tr--sin-ventas`) para diferenciarlas
  de las promos que sí se han vendido, sin ocultarlas (el back las manda a propósito).

**⚠️ Backend en `dev`, todavía NO subido a `qa`** — el endpoint no va a responder en QA hasta que
el back haga el push. Verificar con el back antes de probar en vivo.

**Archivos modificados:**
- `src/app/reportes/service/reportes.service.ts` → `PromocionReporte`, `getPromociones()`
- `src/app/reportes/reportes.component.ts` → tab `'promociones'`, `buscarPromociones()`
- `src/app/reportes/reportes.component.html` → tab button + panel con tabla
- `src/app/reportes/reportes.component.scss` → `.rp-hint`, `.rp-tr--sin-ventas`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT CATÁLOGO — FILTROS PÚBLICOS (TALLA/COLOR/MARCA/PRECIO) (2026-07-13)

> Segunda de las 4 features nuevas de `CAMBIOS_FRONT.md` (2026-07-13). Endpoints
> `GET /variantes/v1/buscar-filtrado` (público, combina termino+precioMin+precioMax+talla+color+marca
> con AND, nunca 404 — `t: []` si no hay resultados) y `GET /variantes/v1/filtros-disponibles`
> (público, valores reales del catálogo visible para armar los dropdowns + límites del precio).

**Dónde:** `/variantes/buscar` (`BuscarComponent`) — visible para **cualquier usuario**, no solo
admin (a diferencia de los checkboxes `mostrarConStock`/`mostrarSinStock`/etc. que siguen siendo
admin-only y usan un endpoint distinto, `/admin/filtrar`).

**Comportamiento:**
- Al entrar al catálogo (modo general, `productoId === 0`) se llama `filtrosDisponibles()` una vez
  para pintar los 3 `<select>` (talla/color/marca) y los límites del rango de precio.
- Cualquier cambio en talla/color/marca/precio (`onFiltroPublicoChange()`) dispara
  `buscarFiltrado()` con página 1. Se combina con `terminoBusqueda` si el usuario también escribió
  texto — pero el buscador de texto simple (`/buscar`, cascada código→palabra clave→nombre) **sigue
  intacto** cuando NO hay filtros públicos activos, tal como pide el contrato del back.
- Precedencia cuando hay varios tipos de filtro a la vez: filtros admin (`/admin/filtrar`) >
  filtros públicos (`/buscar-filtrado`) > buscador de texto simple (`/buscar`) — son 3 endpoints
  distintos que el back no combina entre sí, así que el front tampoco los mezcla.
- Barra de filtros públicos oculta cuando se navega "por producto" (`modoPorProducto`, viendo las
  variantes de un producto específico) — no aplica en ese contexto.

**Archivos modificados:**
- `src/app/variante/models/variante.model.ts` → `IFiltrosDisponibles`
- `src/app/variante/service/variante.service.ts` → `buscarFiltrado()`, `filtrosDisponibles()`
- `src/app/variante/buscar/buscar.component.ts` → estado de filtros públicos, `aplicarFiltrosPublicos()`,
  `limpiarFiltrosPublicos()`, `hayFiltrosPublicosActivos`, precedencia en `onBuscar()`/paginación/escáner
- `src/app/variante/buscar/buscar.component.html` → `.vb-pub-filtros` (selects + rango de precio)
- `src/app/variante/buscar/buscar.component.scss` → `.vb-pub-filtros`, `.vb-pub-select`, `.vb-pub-input`, `.vb-pub-precio` (dark + light)

**⚠️ Backend en `dev`, todavía NO subido a `qa`** — no va a responder en QA hasta que el back haga el push.

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT FAVORITOS (2026-07-13)

> Tercera de las 4 features nuevas de `CAMBIOS_FRONT.md` (2026-07-13). Requiere estar logueado
> **con perfil de Cliente completo** — si no, el back responde `400` con
> `"Tu cuenta todavia no tiene un perfil de cliente completo"` (mismo patrón ya usado en otros
> flujos de "datosCompletos"). Migración `migration_favoritos_resenas.sql` ya ejecutada.

### Archivos nuevos — módulo lazy `/favoritos`

| Archivo | Qué hace |
|---|---|
| `src/app/favoritos/service/favorito.service.ts` | 4 endpoints: `agregar()`, `quitar()` (ambos idempotentes), `listar()` (paginado, mismo shape que `/variantes/buscar`), `listarIds()` |
| `src/app/favoritos/favoritos.component.ts/.html/.scss` | Pantalla "❤️ Mis favoritos" — grid de cards con imagen, precio, stock, botón agregar/quitar carrito y botón quitar de favoritos. Prefijo BEM `fv-`, dark/light completo |
| `src/app/favoritos/favoritos.module.ts` | Módulo lazy — importa `SharedModule` (para el pipe `imagenSrc`) |
| `src/app/favoritos/favoritos-routing.module.ts` | Ruta raíz `''` → `FavoritosComponent` |

### Archivos modificados

| Archivo | Qué se agregó |
|---|---|
| `src/app/app-routing.module.ts` | Ruta lazy `/favoritos`, guards `AuthGuard + CarritoGuard` (mismo criterio que `/promociones` — cualquier logueado, no exclusivo admin) |
| `src/app/navbar/navbar.component.html` | Link "❤️ Favoritos" para `!isAnonymous`, junto a "🎁 Promociones" |
| `src/app/variante/buscar/buscar.component.ts` | `roles`, `isAnonymous`, `favoritosIds: Set<number>` (poblado con `listarIds()` al detectar sesión no-anónima), `esFavorito()`, `toggleFavorito()` (optimista: cambia el Set de inmediato, revierte solo si el back falla) |
| `src/app/variante/buscar/buscar.component.html` | Botón corazón (❤️/🤍) sobre la imagen de cada card, solo si `!isAnonymous` |
| `src/app/variante/buscar/buscar.component.scss` | `.vb-card__heart` (esquina inferior derecha de la imagen — evita chocar con el checkbox de selección admin en la esquina superior izquierda y el badge "Deshabilitado" en la superior derecha) + animación `vb-heart-pop` |

**Dónde se puede marcar/quitar favorito:** por ahora solo desde `/variantes/buscar` (el catálogo
principal). No se agregó a `detalle-productos` ni a otras pantallas de variantes — si se necesita
ahí también, es una extensión puntual del mismo patrón (`FavoritoService` ya es reusable).

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT RESEÑAS Y CALIFICACIONES (2026-07-13)

> Última de las 4 features nuevas de `CAMBIOS_FRONT.md` (2026-07-13). Regla de negocio clave:
> solo se puede reseñar lo que ya se compró (el back lo valida, el front no filtra nada de
> antemano); una reseña por cliente por variante (usar editar, no crear otra); publicación
> inmediata sin moderación previa; owner o ADMIN pueden borrar. Misma migración SQL que
> favoritos, ya ejecutada.

**Dónde:** integrado directo en `DetalleVarianteComponent` (`/variantes/detalle/...`), la ficha
de producto que ya usan tanto clientes como admin — no se creó una pantalla nueva.

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `src/app/resenas/models/resena.model.ts` | `IResena`, `IResenaPaginable`, `IResenaResumen` |
| `src/app/resenas/service/resena.service.ts` | `crear()`, `editar()`, `eliminar()`, `listarPorVariante()`, `resumen()`, `misResenas()` |

### Comportamiento en `DetalleVarianteComponent`

- **Al seleccionar una variante** (`seleccionar()`): siempre se pide `resumen(varianteId)`
  (promedio + conteo por estrella) — se muestra como estrellitas clicables junto al precio en el
  header. El listado completo de comentarios **NO se pide de entrada** — solo cuando el usuario
  abre la sección "⭐ Reseñas" (`toggleSeccionResenas()`), tal como sugiere el contrato del back
  (evita traer todos los comentarios si solo se va a mostrar el promedio).
- **Sección "⭐ Reseñas"** (colapsable): distribución por estrella (5★...1★), lista paginada de
  reseñas con autor, fecha, estrellas y comentario. Cada reseña propia se resalta
  (`.dv-resena-item--propia`) y muestra botón "✏️ Editar"; owner o admin ven "🗑️ Eliminar".
- **Formulario crear/editar** (`abrirFormResena()`): selector de 1-5 estrellas clicables +
  textarea opcional (máx. 500). Si el usuario ya tiene una reseña propia en la lista cargada
  (`miResena` getter, busca `esPropia` en el array ya traído), el botón dice "Editar mi reseña" y
  precarga el form con `PUT`; si no, "Escribir una reseña" crea con `POST`. Al guardar, recarga
  la página 1 del listado y el resumen (para que el promedio se actualice al instante).
- **Errores de negocio** (no compró / ya tiene reseña / calificación inválida) se muestran tal
  cual vienen del back en un Swal — el front no intenta adivinar de antemano si el usuario puede
  reseñar o no.
- Botón "Escribir/Editar reseña" solo visible para usuarios logueados (`!isAnonymous`, mismo
  patrón `roles` que ya se usa en `BuscarComponent` para favoritos).

**Archivos modificados:**
- `src/app/variante/detalle-variante/detalle-variante.component.ts` → estado y métodos de reseñas
- `src/app/variante/detalle-variante/detalle-variante.component.html` → estrellitas junto al precio + sección "⭐ Reseñas" completa
- `src/app/variante/detalle-variante/detalle-variante.component.scss` → `.dv-resumen-resenas`, `.dv-star`, `.dv-resenas`, `.dv-resena-form`, `.dv-resena-item` (dark + light)

**No implementado en este alcance (opcional, mencionado en el doc del back pero no pedido):**
pantalla dedicada "Mis reseñas" en el perfil del cliente — `ResenaService.misResenas()` ya existe
y está lista para eso si se pide después.

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

> ### ⚠️ REVISADO 2026-07-16 — este diseño se va a cambiar (ver `PLAN_MEJORAS.md` §18)
>
> La decisión de arriba de *"el front no intenta adivinar de antemano si el usuario puede
> reseñar o no"* resultó ser **un error de UX**: el botón "Escribir una reseña" aparece en
> CUALQUIER producto para cualquier logueado, el usuario elige estrellas y escribe el
> comentario, y **solo al guardar** el back le dice "no compraste este producto".
>
> **Acordado con el dueño:** el punto de entrada se mueve al **pedido** (donde por definición
> todo es reseñable) y `/variantes/detalle/:id` queda **solo lectura** (promedio + reseñas de
> la gente, sin botón de escribir). Así el error se vuelve inalcanzable por diseño.
>
> Viable sin backend nuevo: `GET /v1/pedidos/{id}/detalle` ya trae `varianteId`.
> ⚠️ `mis-pedidos` (la lista) NO lo trae — por eso el botón iría en `detalle-pedido`.
>
> Pendiente aparte: recordatorio por correo para dejar reseña (5 preguntas abiertas en §18.5).

---

## FIX VENTA DIRECTA — "COBRAR" NO SE HABILITA: DROPDOWN DE PAGO VACÍO SIN AVISO (2026-07-16)

**Síntoma reportado (QA):** admin agrega una promoción + un cliente, y el botón "💰 Cobrar"
nunca se habilita. El usuario lo atribuyó al correo sin verificar del cliente.

**Diagnóstico — no era el correo.** `puedeCobrar` **nunca** revisa el correo:
```ts
tieneItems (lineas o promos) && tieneFormaPago (esCredito || pagosYMesesId !== null) && !procesando
```
Con promo, `esCredito` es false (las promos son solo contado), así que el botón exige
`pagosYMesesId` → hay que **seleccionar una forma de pago**. Pero el usuario dijo *"no aparece
ninguna opción"*: el dropdown estaba **vacío**.

**Causa raíz:** el dropdown se llena de `GET /v1/pagos/opciones-estructuradas` en `cargarPagos()`
(corre siempre en `ngOnInit`, NO depende de la promo — el dropdown vacío afecta a TODA venta
directa, solo se notó con la promo). El handler de error era **silencioso**
(`error: () => { this.cargandoPagos = false; }`) — mismo antipatrón de la Lección #1 de rifas:
si el endpoint devuelve `data: []` o falla, el usuario ve un dropdown vacío y un botón gris
permanente **sin ninguna explicación**.

**Causa raíz de fondo (BACK/DATOS, no front):** en QA el endpoint devuelve vacío — **no hay
formas de pago dadas de alta**. ⚠️ **No existe pantalla en el front para configurarlas**: no hay
endpoints de escritura de `pagos` ni componente admin. Se dan de alta directo en la BD del
backend. Hay que pedirle al back/DBA que seed-ee las formas de pago en QA.

**Fix del front (surface del error, esto sí es nuestro):**
- `cargarPagos()`: nuevo campo `errorPagos`. Si el back responde OK pero con `[]` → mensaje "No
  hay formas de pago configuradas… pídele al administrador que las dé de alta". Si el request
  falla → captura `err?.error?.mensaje`. Nuevo `reintentarPagos()`.
- Template: aviso `.vd-pay-error` (rojo, con botón "Reintentar") + `.vd-pay-loading`, debajo del
  título de forma de pago. El `p-dropdown` de contado ahora solo se muestra si
  `opcionesEstructuradas.length > 0`.
- SCSS: `.vd-pay-error`, `.vd-pay-retry`, `.vd-pay-loading` + variante dark.

**⚠️ El flujo de verificación de correo al cobrar (commit `0f026a7`) NO tiene relación con este
bug** y ya estaba bien: solo corre al hacer clic en Cobrar (dentro de `cobrar()`), y el botón
tiene que habilitarse primero — cosa que no pasaba por el dropdown vacío. Una vez configuradas
las formas de pago en QA, el flujo esperado (botón habilitado → clic → modal de correo si no
está verificado → "No, solo cobrar" cobra igual) funcionará como se acordó.

**Archivos modificados:**
- `src/app/variante/venta-directa/venta-directa.component.ts` → `errorPagos`, `cargarPagos()`, `reintentarPagos()`
- `src/app/variante/venta-directa/venta-directa.component.html` → aviso `.vd-pay-error` + guard del dropdown
- `src/app/variante/venta-directa/venta-directa.component.scss` → estilos del aviso

**Verificado con `ng build` sin errores.** ⚠️ La causa de fondo (formas de pago vacías en QA)
es de backend/datos — el front ahora solo lo hace visible en vez de fallar en silencio.

---

## FIX BUSCADORES — `.toLowerCase()` PISABA EL `appUppercase` (2026-07-13)

**Síntoma reportado:** en "Buscar producto" (`/productos/buscar`), el texto escrito en el
buscador se veía en minúsculas aunque el proyecto usa mayúsculas en todos los inputs
(`appUppercase`).

**Causa raíz:** `UppercaseInputDirective` mutaba el DOM a mayúsculas correctamente, pero
`AllComponent.buscarProductos()` hacía `(event.target as HTMLInputElement).value.toLowerCase()`
y guardaba ese texto en minúsculas en `this.buscarProd`, que está bindeado con `[(ngModel)]` al
mismo input — en el siguiente ciclo de detección de cambios, Angular reescribe el DOM con el
valor del modelo (minúsculas), revirtiendo visualmente lo que el directive acababa de poner en
mayúsculas. No era un bug del directive.

**Grep de `.toLowerCase()` en manejadores de buscador — se encontró el mismo patrón en 5
archivos** (mismo criterio que las lecciones del módulo rifas: cuando se corrige un patrón así,
revisar TODOS los archivos con el mismo método antes de cerrar la tarea):

| Archivo | Buscador |
|---|---|
| `productos/producto/all/all.component.ts` | Productos → Ver todos (el reportado) |
| `productos/producto/busca/busca.component.ts` | Buscador secundario de productos |
| `pedidos/mis-pedidos/mis-pedidos.component.ts` | Buscador de pedidos |
| `usuarios/usuarios/buscar-usuarios/buscar-usuarios.component.ts` | Buscador de usuarios |
| `ventas/venta-producto/add-venta/add-venta.component.ts` | Buscador de venta de producto |

**Fix:** se quitó `.toLowerCase()` en los 5 — ahora se guarda el valor tal cual llega del DOM
(ya en mayúsculas gracias al directive).

**Revisado y confirmado limpio (no tenían el bug):** `variante/buscar/buscar.component.ts`
(`onBuscar`), `variante/agregar/agregar.component.ts` y `variante/update-variante/*.ts`
(`onBuscarProducto`), `admin/promociones/gestion-promociones.component.ts` (`buscarVariante`).

**Efecto colateral positivo:** como el backend en algunos casos comparaba el término tal cual
contra `codigoBarras` (ver siguiente sección — bug de coincidencia exacta), mandar el término en
minúsculas también contribuía a que búsquedas como "glpd" no encontraran `GLPD-066`. Este fix
por sí solo ya ayuda en el buscador de Productos; el bug de fondo (coincidencia exacta vs.
parcial) lo corrigió el back — ver siguiente sección.

**Archivos modificados:**
- `src/app/productos/producto/all/all.component.ts`
- `src/app/productos/producto/busca/busca.component.ts`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts`
- `src/app/usuarios/usuarios/buscar-usuarios/buscar-usuarios.component.ts`
- `src/app/ventas/venta-producto/add-venta/add-venta.component.ts`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX BACK — BÚSQUEDA POR CÓDIGO DE BARRAS ERA EXACTA, NO PARCIAL (2026-07-13)

> Sin cambios de contrato para el front — documentado aquí porque explica por completo el
> síntoma "busco `glpd` y no aparece nada" reportado por el usuario, investigado en esta misma
> sesión (se había descartado ya el bug de mayúsculas/minúsculas de la sección anterior, y se
> había planteado como hipótesis alterna que las variantes sin imagen no aparecían en el
> buscador — **esa hipótesis era incorrecta**, la causa real es esta).

**Causa raíz (back, ya corregida):** el "paso 1" (código de barras) tanto de
`ProductosServiceImpl.findNombreOrCodigoBarra` como de
`VarianteServiceImpl.buscarPorCodigoBarrasPaginado` usaba coincidencia **exacta**
(`= :codigoBarras`) en vez de `LIKE %texto%`. Escribir "glpd" nunca iba a encontrar "GLPD-066"
porque no son iguales, solo uno contiene al otro. El filtro admin "con stock" nunca tuvo este
bug (usa una query distinta, siempre fue `LIKE`) — por eso una variante con stock real aparecía
ahí pero no en el buscador normal ni en el buscador de variantes de "Gestión Promociones" (que
reutiliza `/variantes/v1/buscar`).

**Fix del back:** paso 1 (código) ahora usa `LIKE %texto%`, igual que el paso 3 (nombre) y que
los filtros admin. No cambia el contrato (mismos endpoints, mismo shape) — cambia el
comportamiento: estos 2 endpoints ahora pueden regresar **más de un resultado** por código de
barras cuando antes solo podían regresar 0 o exactamente 1.

**Revisado en el front (sin cambios necesarios):** ningún componente que llama
`getDataNombreCodigoBarra()` o `/variantes/v1/buscar` asume "si encontró por código, es un solo
resultado" — todos pintan una lista/grid paginada normal (`all.component.ts`, `busca.component.ts`,
`buscar.component.ts`, `agregar.component.ts`, `update-variante.component.ts`,
`gestion-promociones.component.ts`, `add-venta.component.ts`), así que el cambio de "0 o 1" a
"0 o N" no rompe nada existente.

**⚠️ Antes de volver a probar:** estos buscadores están cacheados en el back (`@Cacheable`). Si
se buscó "glpd" antes del fix del back, puede seguir devolviendo "sin resultados" hasta limpiar
la caché — usar el botón "🗑️ Limpiar caché" en `/admin/cache`, o `DELETE /v1/admin/cache`.

**Verificado con `ng build --configuration=development` sin errores** (no hubo cambios de código
front en esta sección, solo el hallazgo documentado).

---

## FEAT F-14 — FILTROS ADMIN EN CATÁLOGO DE PRODUCTOS Y VARIANTES (2026-07-02)

> Backend: endpoints nuevos `GET /v1/productos/admin/filtrar?filtro=...` y `GET /variantes/v1/admin/filtrar?filtro=...`.
> Los endpoints públicos ya filtraron automáticamente por rol (sin acción front) — solo admin ve todo el catálogo sin restricción de imagen.

### Cambios

- `ProductoService.adminFiltrar(filtro, page, size)` → `GET /v1/productos/admin/filtrar?filtro=SIN_STOCK|CON_STOCK|CON_IMAGENES&size=...&page=...`
- `VarianteService.adminFiltrar(filtro, pagina, size)` → `GET /variantes/v1/admin/filtrar?filtro=...&pagina=...&size=...`
- `AllComponent` (`/productos/buscar`): `filtroActivo` extendido con `'con-stock' | 'con-imagenes'`; método `cargarAdminFiltrar()`; 2 botones nuevos "Con stock" y "Con imágenes" en la barra de filtros admin; paginación actualizada.
- `BuscarComponent` (`/variantes/buscar`): `filtroAdmin` extendido con `'con-stock' | 'con-imagenes'`; método `cargarAdminFiltrar()`; 2 botones nuevos; paginación actualizada; condición `[disabled]` del buscador/escáner corregida de `filtroAdmin === 'sin-stock'` a `filtroAdmin !== 'todos'` (cubre todos los filtros activos).

**Archivos modificados:**
- `src/app/productos/service/producto.service.ts` → +`adminFiltrar()`
- `src/app/variante/service/variante.service.ts` → +`adminFiltrar()`
- `src/app/productos/producto/all/all.component.ts` → tipo extendido, +`cargarAdminFiltrar()`, `cambiarFiltro()`, `conOSinBuscar()` actualizados
- `src/app/productos/producto/all/all.component.html` → +2 botones filtro
- `src/app/variante/buscar/buscar.component.ts` → tipo extendido, +`cargarAdminFiltrar()`, `cambiarFiltroAdmin()`, paginación actualizada
- `src/app/variante/buscar/buscar.component.html` → +2 botones filtro, fix disabled

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
---

## FEAT CLIENTES — VERIFICACIÓN DE CORREO + REDISEÑO FORMULARIO (2026-07-03)

### Rediseño `/clientes/agregar`

- Formulario completamente rediseñado con design system BEM + dark/light mode
- Header con gradiente índigo + icono `pi-user-plus`
- Tres secciones: Nombre, Apellidos, Contacto — grid 2 columnas responsive
- Select de sexo con `appearance: none` + chevron overlay (soluciona texto invisible en dark mode)
- Validaciones: `correoElectronico` requerido + `Validators.email`; `numeroTelefonico` requerido + `pattern(/^[0-9]{10}$/)`
- Mensajes de error diferenciados por tipo (`required` vs `email`/`pattern`)
- `FormsModule` agregado a `ClietesModule` (necesario para `[(ngModel)]` del código de verificación)

### Verificación de correo — Opción A (inline en `/clientes/agregar`)

**Flujo:** Al guardar exitosamente el cliente, la página pasa a un **Paso 2** (sin navegar):
1. Se envía automáticamente el código de 6 dígitos al correo del cliente
2. Input numérico centrado + botón "Verificar y continuar"
3. Botón "Reenviar código" con cooldown de 60s y countdown visible
4. Botón "Verificar más tarde" (omitir) que navega sin bloquear

### Verificación de correo — Opción B (en pedido de variantes)

**Flujo:** Si `guardarPedidoVariante` devuelve 400 con mensaje que contenga "verificar":
1. `flujoVerificacion(clienteId)` → llama `enviarCodigoVerificacion` automáticamente
2. Swal con input de 6 dígitos + botón "Reenviar código" inline en el modal
3. `verificarCorreo(clienteId, codigo)` → si OK, muestra Swal "¡Verificado!" y reintenta el pedido

### Nuevos métodos en `ClienteService`

```typescript
enviarCodigoVerificacion(clienteId: number): Observable<ResponseGeneric<string>>
  // POST /v1/clientes/{id}/enviar-codigo-verificacion

verificarCorreo(clienteId: number, codigo: string): Observable<ResponseGeneric<string>>
  // POST /v1/clientes/{id}/verificar-correo { codigo }
```

### `ICliente` model

`correoVerificado?: boolean` agregado en:
- `src/app/clietes/models/cliente.model.ts`
- `src/app/clietes/mis-datos/models/cliente.model.ts`

**Archivos modificados:**
- `src/app/clietes/clientes-add/clientes-add.component.ts` → reescritura completa con paso 2
- `src/app/clietes/clientes-add/clientes-add.component.html` → rediseño + sección verificación
- `src/app/clietes/clientes-add/clientes-add.component.scss` → design system BEM + dark/light mode
- `src/app/clietes/cliente.service.ts` → +`enviarCodigoVerificacion()`, +`verificarCorreo()`
- `src/app/clietes/models/cliente.model.ts` → +`correoVerificado?`
- `src/app/clietes/mis-datos/models/cliente.model.ts` → +`correoVerificado?`
- `src/app/clietes/clietes.module.ts` → +`FormsModule`
- `src/app/variante/venta-variante/venta-variante.component.ts` → Opción B: `flujoVerificacion()`, `mostrarSwalCodigo()`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT AUTH — FORZAR CAMBIO CONTRASEÑA + ACCIONES ADMIN EN UPDATE USER + VERIFICACIÓN CORREO CLIENTE (2026-07-04)

> Implementación de todos los puntos de `RESUMEN_FRONT_2026-07-04` / `CAMBIOS_FRONT.md`.

### 1. `debeCambiarPassword` en login (forzar cambio tras reseteo de admin)

`POST /v1/auth/login` ahora devuelve `{ accessToken, debeCambiarPassword: boolean }`.
Si `true` → no navegar al sistema — Swal forzado (`allowOutsideClick: false`, `allowEscapeKey: false`)
con 2 inputs (nueva + confirmar), llama `PUT /v1/auth/cambiar-password`. Implementado en
`login-form.component.ts` y `verificar-correo.component.ts` (ambos puntos de auto-login).

### 2. Mover acciones admin de lista → pantalla de edición de usuario

**Antes:** botones "🔑 Resetear contraseña" y "✉️ Verificar correo" en cada card de la lista.
**Ahora:** solo en `add-usuarios` cuando `textoCard === 'Actualizar usuario' && authService.isAdminService`.
El botón viejo "Restablecer contraseña" (ponía `username123`) fue reemplazado.

- `resetearPasswordAdmin()` → `PUT /v1/usuarios/{id}/resetear-password` (sin body) → muestra contraseña temporal en Swal
- `verificarCorreoAdmin()` → envía código → `mostrarSwalCodigoAdmin()` (Swal con input de 6 dígitos para que admin capture lo que el usuario le dicte por teléfono/voz) → `POST /v1/auth/verificar-correo`

**Archivos modificados:**
- `src/app/usuarios/usuarios/all-usuarios/all-usuarios.component.html` → quitados los 2 botones de la lista
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` → +`resetearPasswordAdmin()`, +`verificarCorreoAdmin()`, +`mostrarSwalCodigoAdmin()`
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.html` → sección `.admin-actions` con los 2 botones, reemplaza btn-reset viejo
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.scss` → `.admin-actions`, `.btn-admin-reset`, `.btn-admin-verify`

### 3. Verificar correo de cliente — admin (clientes-buscar)

Admin puede verificar el correo de cualquier cliente desde `/clientes/buscar`.
Botón "✉️ Verificar correo" visible por card cuando `correoVerificado !== true`.
Flujo: envía código → Swal captura los 6 dígitos → `POST /v1/clientes/{id}/verificar-correo`.
Al éxito: `c.correoVerificado = true` (actualización local del array).

**Archivos modificados:**
- `src/app/clietes/clientes-buscar/clientes-buscar.component.ts` → +`verificarCorreoCliente()`, +`mostrarSwalCodigo()`
- `src/app/clietes/clientes-buscar/clientes-buscar.component.html` → botón `cb-btn--verify` por card
- `src/app/clietes/clientes-buscar/clientes-buscar.component.scss` → `&--verify` style + dark mode

### 4. Verificar correo de cliente — el propio usuario (mis-datos)

El usuario verifica su propio correo de cliente desde `/clientes/mis-datos`.
Badge "✅ Verificado" / "⚠️ Sin verificar" junto al label del correo.
Botón "✉️ Verificar mi correo" visible cuando `correoVerificado !== true && clienteId > 0`.

**Archivos modificados:**
- `src/app/clietes/mis-datos/mis-datos.component.ts` → +`clienteId`, +`correoVerificado`, +`verificarCorreoPropio()`, +`mostrarSwalVerificacion()`; `ngOnInit` guarda ambos campos de la respuesta
- `src/app/clietes/mis-datos/mis-datos.component.html` → badge `md-badge--ok/warn` + botón `md-btn-verify`
- `src/app/clietes/mis-datos/mis-datos.component.scss` → `.md-badge`, `.md-btn-verify` + dark mode

### 5. Restricciones confirmadas (`GET /v1/clientes/buscar` → solo ADMIN)

Todos los usos de `buscarClientes()` verificados — ninguno accesible para usuario no-admin:
- `clientes-buscar`, `detalle-productos`, `reportes`, `venta-directa`, `agregar-rifa` → todos bajo `AdminGuardGuard`
- `venta-variante` → bloque en `*ngIf="false"`, nunca se ejecuta

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX LOGIN — NO REDIRIGÍA COMO USUARIO NORMAL + MODAL DE CAMBIO DE CONTRASEÑA MEZCLADO ENTRE SESIONES (2026-07-08)

**Síntoma 1:** al iniciar sesión con un usuario normal (no admin), no pasaba nada — se quedaba
en `/login`. Al recargar la página manualmente, ahí sí redirigía a `/variantes/buscar`.

**Causa raíz:** `AdminGuardGuard` y `AuthGuard` redirigían con el patrón
`this.router.navigate([...]); return false;` **desde dentro del propio guard**. Cuando este
guard se dispara como consecuencia de OTRA navegación ya en curso (la que lanza
`login-form.component.ts` con `this.router.navigate(['/productos/buscar'])` justo después del
login), llamar a `.navigate()` de nuevo desde el guard entra en conflicto con esa navegación
que ya está en vuelo y la redirección se pierde — patrón conocido de Angular, poco confiable.
Al recargar la página no hay navegación "en curso" compitiendo (el token ya se hidrata antes
vía `APP_INITIALIZER`/`bootstrapAuth` en `app.module.ts`), por eso ahí sí funcionaba.

**Fix:** ambos guards ahora devuelven un `UrlTree` (`this.router.parseUrl(...)`) en vez de
llamar `.navigate()` + `return false`. Es el patrón recomendado por Angular para redirecciones
desde guards — le dice al Router "redirige ESTA navegación" en lugar de disparar una segunda
navegación en paralelo.

**Síntoma 2 (relacionado, mismo hallazgo en vivo):** con un usuario cuya contraseña había sido
reseteada por un admin (`debeCambiarPassword: true`), el login "no reaccionaba" (síntoma 1).
El usuario, sin recargar, sobrescribió los campos del formulario con credenciales de admin y
volvió a dar "Entrar" — el segundo intento sí entró, pero mostrando el modal de cambio de
contraseña **del usuario normal** encima de la sesión de admin ya cargada.

**Causa raíz:** el botón "Entrar" solo se deshabilita si el formulario es inválido
(`[disabled]="loginForm.invalid"`) — nada bloqueaba un segundo envío mientras el primer
`POST /v1/auth/login` (o el flujo de `forzarCambioPassword()` que dispara) seguía sin resolver.
Se pudieron disparar dos `onLogin()` superpuestos con credenciales distintas, y el Swal del
primer intento (usuario normal, closure con SU contraseña) quedó abierto en el DOM por encima
de la sesión de admin que sí navegó.

**Fix:** nuevo campo `cargando` en `LoginFormComponent`. Se pone en `true` al entrar a
`onLogin()` (con guard de re-entrada `if (this.cargando) return;`) y solo se libera en el
`next`/`error` terminal — si `debeCambiarPassword` es `true`, sigue en `true` hasta que el
Swal de `forzarCambioPassword()` se resuelve (`.then()`). El botón usa
`[disabled]="loginForm.invalid || cargando"` — mismo patrón de guard de doble-submit ya usado
en el resto del proyecto (sin spinner local, solo `[disabled]`, según la regla de
"ELIMINACIÓN DE SPINNERS LOCALES").

**Archivos modificados:**
- `src/app/guard/admin-guard.guard.ts` → `canActivate(): boolean | UrlTree`, todas las
  redirecciones devuelven `this.router.parseUrl(...)`
- `src/app/auth.guard.ts` → mismo cambio
- `src/app/login/login-form/login-form.component.ts` → campo `cargando`, guard de re-entrada
  en `onLogin()`, se libera en los 3 puntos de salida (`next` sin `debeCambiar`, `next` sin
  token, `error`, y `.then()` de `forzarCambioPassword`)
- `src/app/login/login-form/login-form.component.html` → botón "Entrar"
  `[disabled]="loginForm.invalid || cargando"`

**Verificado con `ng build --configuration=development` sin errores.**

**⚠️ ACTUALIZACIÓN — el fix de arriba era necesario pero NO era la causa completa (mismo día,
después de probar en vivo):** con Pedro (usuario cuya cuenta seguía con `debeCambiarPassword:
true` de una prueba anterior), el login seguía sin mostrar ningún cambio en pantalla — ni el
modal de cambio de contraseña, ni redirección, ni error. Se comprobó con
`document.querySelectorAll('.swal2-container').length` (→ `1`) que el modal **sí se estaba
creando** correctamente, pero era invisible: `.split-page` (el wrapper de toda la pantalla de
login) tiene `z-index: 1100`, más alto que el `z-index: 1060` por defecto de SweetAlert2 — el
login tapaba su propio modal. Causa raíz completa y fix (global, no solo login) documentados en
**[[L-G2]]** ("LECCIONES APRENDIDAS — GLOBALES"). Este bug es el que en realidad explicaba el
síntoma 2 de arriba (el modal del usuario normal "reapareciendo" mezclado con la sesión admin
no era una condición de carrera activa — era el mismo Swal invisible que había quedado abierto
todo el tiempo, tapado, hasta que algo con menor z-index dejaba de estar encima).

**⚠️ SEGUNDA ACTUALIZACIÓN — el modal ya se veía, pero le faltaba el checklist de requisitos
(mismo día):** una vez visible, el modal de `forzarCambioPassword()` solo tenía 2 inputs planos
con un placeholder de texto — a diferencia del formulario de registro/edición de usuario
(`add-usuarios.component.html`), que muestra un checklist en vivo (✓/○ por cada regla: mínimo 8
caracteres, mayúscula, minúscula, número, carácter especial) + una barra de fortaleza. Además,
`preConfirm` solo validaba longitud ≥ 8 y que coincidieran — **no** las mismas reglas que exige
`passwordFuerte` (`src/app/validador/validador.ts`), dejando pasar al backend contraseñas que
igual iban a ser rechazadas ahí, sin que el usuario supiera por qué hasta el rechazo.

**Fix:** el `html` del Swal ahora incluye el mismo checklist (con un `<style>` embebido en el
propio string del modal, ya que los estilos de un componente Angular NO llegan al DOM que
SweetAlert2 inyecta directo en `document.body` — mismo motivo por el que otros Swal del proyecto
como `mostrarSwalCambioCorreo` ya usan estilos inline). Un listener `input` agregado en
`didOpen` recalcula los 5 requisitos en cada tecleo y actualiza clases/ícono/barra — mismas
reglas exactas que `passwordFuerte`, extraídas a un método privado `cumpleRequisitos()` para no
duplicar los 4 regex sueltos. `preConfirm` ahora llama `cumpleRequisitos()` en vez de solo
chequear longitud, así el front rechaza una contraseña débil ANTES de mandarla al backend.

**Archivos modificados (ambas actualizaciones de esta sesión):**
- `src/styles.scss` → regla global `.swal2-container { z-index: 20000 !important; }`
- `src/app/login/login-form/login-form.component.ts` → `forzarCambioPassword()` reescrito con
  checklist + barra de fortaleza + `didOpen` + `cumpleRequisitos()`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT VARIANTES — INDEPENDIZAR VARIANTE EN SU PROPIO PRODUCTO (2026-07-08)

> Diseño en `PLAN_MEJORAS.md` sección 16. El back implementó `POST /variantes/v1/{varianteId}/independizar`.

**Qué hace:** Permite al admin "graduar" una variante para que sea su propio producto independiente.
La variante NO se borra — se reasigna a un producto nuevo. Las imágenes se copian y el stock se transfiere. Todo en una sola transacción.

**Flujo front:**
1. Admin en `/variantes/detalle/{productoId}/{id}` → botón **"Independizar variante"** (solo admin, abajo de los botones de carrito)
2. Modal con formulario prellenado desde variante (descripcion, marca, color, contenido, precio) + producto origen (nombre, precioCosto, precioRebaja, palabraClave)
3. Campo obligatorio: nuevo `codigoBarras` (diferente al actual)
4. Stock mostrado informacionalmente (no editable — el back lo calcula automáticamente)
5. Al confirmar → `POST /variantes/v1/{varianteId}/independizar` → Swal con nuevo ID + botón "Ver variantes"
6. Error 400/409 (código duplicado) → mensaje del back en la alerta del modal, el form sigue abierto para corregir

**Archivos modificados:**
- `src/app/variante/service/variante.service.ts` → `independizar(varianteId, body)`, interfaces `IIndependizarRequest`, `IIndependizarResponse`
- `src/app/variante/detalle-variante/detalle-variante.component.ts` → inyecta `ProductoService`; campos del modal; `abrirIndependizar()`, `cerrarIndependizar()`, `confirmarIndependizar()`
- `src/app/variante/detalle-variante/detalle-variante.component.html` → botón `.dv-btn--independizar` + modal overlay `.dv-indep-overlay`
- `src/app/variante/detalle-variante/detalle-variante.component.scss` → `.dv-admin-actions`, `.dv-btn--independizar`, `.dv-indep-*` con dark/light mode

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT USUARIOS/PERFIL — ADMIN EDIT FLOW + COMPONENTE MI PERFIL F-19 (2026-07-08)

### 1. `add-usuarios` — flujo especial cuando admin edita usuario

- **Contraseña/confirmar:** ocultos con `*ngIf="!(textoCard === 'Actualizar usuario' && authService.isAdminService)"` (admin no toca la contraseña de otro usuario)
- **Username:** `[attr.readonly]="true"` cuando admin edita — campo visible pero no editable
- **Email:** `(blur)="onEmailBlur()"` — si el valor cambió, muestra Swal de confirmación → `cambiarEmailAdmin()` (PUT updateUsuario con nuevo correo) → `enviarCodigoVerificacionUsuario()` → `mostrarSwalCodigoEmail()` con input de 6 dígitos → `verificarCorreoUsuario()`. Si cancela el Swal → revierte el campo al valor original (`emailOriginal`)
- **Botón submit:** oculto para admin en modo edición (`*ngIf` igual que contraseñas)
- **Botón "💾 Guardar permisos":** en `.admin-section`, guarda `enabled`/`rol` independientemente via `PUT /v1/usuarios/updateUsuario/{id}` (mismo endpoint que ya existía, backend ignora la contraseña)
- `emailOriginal` se asigna en `ngOnInit()` cuando `textoCard === 'Actualizar usuario'`

### 2. `AccederService.miPerfil(username, email)`

Nuevo método → `PUT /v1/auth/mi-perfil` con body `{ username, email }`.

### 3. `MiPerfilComponent` — ruta `/clientes/mi-perfil`

**Sección "Datos de cuenta":**
- `usernameCtrl` precargado desde `authService.userName$`
- `emailCtrl` precargado desde `clienteService.getDataOneCliente(userId)` → `data.data.correoElectronico`
- "Guardar cambios": si email no cambió → `acceder.miPerfil()` directo; si cambió → `flujoEmailChange()`: PUT mi-perfil → enviar código → Swal con input 6 dígitos → `verificarCorreoUsuario()`; si cancela verificación → correo guardado sin verificar (aviso `info`)

**Sección "Cambiar contraseña":**
- 3 campos (actual + nueva + confirmar) con toggles de visibilidad
- Panel de requisitos en vivo (longitud, mayúscula, minúscula, número, especial) + barra de fortaleza
- Botón habilitado solo cuando todos los requisitos se cumplen y las contraseñas coinciden
- Llama `acceder.cambiarPassword(actual, nueva)`

**Navbar:** link "Mi perfil" → `clientes/mi-perfil` en `.sb-user-links` (debajo de "Cambiar contraseña")

### Archivos modificados/creados

| Archivo | Cambio |
|---|---|
| `src/app/login/acceder.service.ts` | + `miPerfil()` |
| `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` | `emailOriginal`, `onEmailBlur()`, `cambiarEmailAdmin()`, `mostrarSwalCodigoEmail()`, `guardarPermisos()` |
| `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.html` | `*ngIf` en password/confirm/submit; `readonly` en username; `blur` en email; botón guardar permisos |
| `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.scss` | `.btn-admin-permisos`, `.field-input--readonly` |
| `src/app/clietes/mi-perfil/mi-perfil.component.ts` | Nuevo componente |
| `src/app/clietes/mi-perfil/mi-perfil.component.html` | Nuevo template |
| `src/app/clietes/mi-perfil/mi-perfil.component.scss` | Nuevos estilos BEM + dark/light mode |
| `src/app/clietes/clietes.module.ts` | + `MiPerfilComponent` en declarations |
| `src/app/clietes/clietes-routing.module.ts` | + ruta `mi-perfil` con `AuthGuard` |
| `src/app/navbar/navbar.component.html` | + link "Mi perfil" en user links |

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT MÓDULO PROMOCIONES — COMBOS DE VARIANTES (2026-07-05)

> Implementación completa del módulo de promociones según `PROMOCIONES.md`.
> Una "promoción" es un combo: N variantes vendidas juntas a precios individuales con descuento.

### Arquitectura

- **Catálogo cliente:** ruta lazy `/promociones` → `PromocionesModule` → `PromocionesComponent`
- **Panel admin:** `GestionPromocionesComponent` en módulo eager `AdminModule`, ruta `/admin/promociones`
- **Carrito:** extendido en `CarritoVarianteService` — variantes conservan localStorage, promos son in-memory únicamente (los precios de promo pueden vencer)

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `src/app/promociones/models/promocion.model.ts` | `IPromocionDetalle`, `IPromocion`, `IPromocionRequest`, `IPromocionPaginable`, `IItemPromoCarrito` |
| `src/app/promociones/service/promocion.service.ts` | 5 endpoints: `crear`, `editar`, `toggleActivo`, `getAdmin`, `getActivas` |
| `src/app/promociones/promociones.component.ts` | Catálogo cliente: grid de cards, countdown timers, modal detalle, selector de cantidad |
| `src/app/promociones/promociones.component.html` + `.scss` | BEM prefix `pm-`; cards con badge "🏷️ PROMO", precio tachado vs promo, piezas, countdown |
| `src/app/promociones/promociones-routing.module.ts` | Ruta raíz `''` → `PromocionesComponent` |
| `src/app/promociones/promociones.module.ts` | Lazy module (`CommonModule`, `FormsModule`) |
| `src/app/admin/promociones/gestion-promociones.component.ts` | Panel admin: listar/crear/editar promos + toggle activo/inactivo |
| `src/app/admin/promociones/gestion-promociones.component.html` + `.scss` | BEM prefix `gp-`; dark/light mode |

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/variante/service/carrito-variante.service.ts` | `_promos: BehaviorSubject<IItemPromoCarrito[]>`; `promos$`; `total` incluye promos; `agregarPromo()`, `eliminarPromo()`, `quitarPromo()`, `obtenerPromos()`, `tienePromos()`, `cantidadPromoEnCarrito()`, `limpiarPromos()`; `limpiar()` también limpia promos |
| `src/app/variante/models/pedido-variante.model.ts` | `IPedidoVarianteDetalleDTO.promocionId?: number` |
| `src/app/variante/service/variante.service.ts` | `IVentaDirectaRequest.detalles[].promocionId?: number` |
| `src/app/variante/venta-variante/venta-variante.component.ts` | `promos: IItemPromoCarrito[]`; `tienePromos` getter; suscripción a `promos$`; `recalcularTotales()`; `armarYConfirmar()` añade detalles de promo + fuerza `NORMAL` si `tienePromos`; `quitarPromo()` |
| `src/app/variante/venta-variante/venta-variante.component.html` | Sección de promos en el carrito (listado + aviso "solo contado") |
| `src/app/variante/venta-directa/venta-directa.component.ts` | `promosCarrito: IItemPromoCarrito[]`; `tienePromos` getter; pre-carga desde `carritoService.obtenerPromos()`; `totalVenta`/`totalUnidades` incluyen promos; `puedeCobrar` acepta solo-promos; `ejecutarVenta()` concatena detalles de promo + bloquea crédito si `tienePromos`; `limpiarTodo()` resetea `promosCarrito` |
| `src/app/admin/admin-routing.module.ts` | `{ path: 'promociones', component: GestionPromocionesComponent }` |
| `src/app/admin/admin.module.ts` | `GestionPromocionesComponent` en declarations |
| `src/app/app-routing.module.ts` | Ruta lazy `/promociones` con `AuthGuard + CarritoGuard` (sin AdminGuard — visible a todos) |
| `src/app/navbar/navbar.component.ts` | Badge de carrito ahora suma `countCarritoVariante` = variantes + promos |
| `src/app/navbar/navbar.component.html` | Link "🎁 Promociones" (todos los usuarios logueados); "🎁 Gestión Promociones" en accordion Admin |

### Endpoints conectados

| Método | URL | Descripción |
|---|---|---|
| `POST` | `/v1/promociones` | Crear promoción |
| `PUT` | `/v1/promociones/{id}` | Editar promoción |
| `PUT` | `/v1/promociones/{id}/activo?activo=bool` | Toggle activo/inactivo |
| `GET` | `/v1/promociones/admin?pagina=&size=` | Listar todas (admin) |
| `GET` | `/v1/promociones/activas?pagina=&size=` | Listar activas (cliente) |

### Reglas de negocio en front

- `instanciasDisponibles` = calculado por back (MIN de floor(stock/cantidad) por pieza)
- Promos son **solo de contado** — si hay promos en el carrito, `tipoPedido` se fuerza a `NORMAL` en ambos flujos (savePedido y venta directa)
- `promocionId` se envía en cada línea de detalle que pertenece a un combo
- Cada combo expande a: por cada `IPromocionDetalle`: `cantidad × cantidadCombos`, `precioUnitario = precioEnPromocion`
- Promos **no** usan localStorage (precios pueden vencer). Variantes conservan localStorage sin cambios.

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX PROMOCIONES — BOTÓN "AGREGAR" ILEGIBLE EN DISABLED + BUG DE DISPONIBILIDAD REPORTADO AL BACK (2026-07-13)

**Síntoma 1 (front, corregido):** en `/promociones`, el botón "🛒 Agregar" deshabilitado no se
veía en modo claro — parecía "sin letras". Causa: `.pm-btn:disabled` usaba `opacity: .45`, que
desvanece fondo Y texto blanco casi hasta el blanco puro sobre la card blanca del modo claro.

**Fix:** `.pm-btn:disabled` ahora usa colores explícitos en vez de `opacity` —
`background: var(--card-border)`, `color: var(--app-text-muted)` — legible en ambos modos.

**Síntoma 2 (no era bug — confirmado con curl a QA):** la promoción "ropa" (id 1) aparecía como
"❌ Sin disponibilidad" aunque el producto "Mochila Prada" mostraba stock 5. Diagnóstico con
`GET /variantes/v1/porProducto/326`: el producto tiene 7 variantes (mismo `codigoBarras`, talla y
color — confirmado con el usuario que esto es diseño esperado, un producto puede tener varias
variantes), con el stock repartido entre ellas (0,1,1,0,1,1,1 = 5). La promo apuntaba a
`varianteId 277` y `117` — justo las dos que tienen `stock: 0` de las 7. `instanciasDisponibles = 0`
es matemáticamente correcto para esa combinación; no hay nada que corregir en el back. El problema
fue de UX al armar la promo: variantes hermanas indistinguibles en el buscador (mismo
nombre/talla/color) hacían fácil elegir por accidente una sin stock. Detalle completo en
`PROMOCIONES.md`, sección 6.

**Mitigación de front aplicada (2026-07-13):** en "Gestión Promociones", el buscador de variantes
del formulario ahora muestra **stock** e **ID** por resultado (antes solo nombre/talla/color/precio
— indistinguibles entre duplicados) + aviso cuando hay resultados que se ven idénticos, para que el
admin no vuelva a elegir por accidente una variante-fantasma con 0 stock al armar un combo.

**Extra (2026-07-13):** en el modal "Ver detalle" de `/promociones` (catálogo cliente), cada pieza
ahora muestra `ID #{varianteId}` cuando el usuario logueado es ADMIN, para poder ir a revisar el
stock real de esa variante exacta. Se dejó preparado también `codigoBarras` en el modelo, pero
**el back todavía no lo manda** en `GET /v1/promociones/activas` — por ahora cae en el fallback
"código de barras no disponible aún" (ver `PROMOCIONES.md` para el detalle de qué falta agregar).

**Archivos modificados:**
- `src/app/promociones/promociones.component.scss` → `.pm-btn:disabled`, `.pm-modal__pieza-admin`
- `src/app/promociones/promociones.component.ts` → `isAdminUser` vía `AuthService.userRoles$`
- `src/app/promociones/promociones.component.html` → línea admin-only con ID/código de barras en el modal
- `src/app/promociones/models/promocion.model.ts` → `IPromocionDetalle.codigoBarras?` (pendiente del back)
- `src/app/admin/promociones/gestion-promociones.component.html` → dropdown con stock/ID + aviso
- `src/app/admin/promociones/gestion-promociones.component.scss` → `.gp-dropdown__stock`, `.gp-dropdown__id`, `.gp-dropdown__item--sinstock`, `.gp-hint-duplicados`
- `PROMOCIONES.md` → sección 6 (causa raíz confirmada — no era bug de back) y 7 (fix de contraste)

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX USUARIOS/MI-PERFIL — CORREO PENDIENTE VIA GET ENDPOINT + BOTÓN REENVIAR (2026-07-08)

> Eliminación total de `sessionStorage`/`localStorage` para persistir el estado de cambio de correo
> pendiente. Reemplazado por consulta directa al backend, que ya guardaba ese estado en BD.

### Problema resuelto

**Bug de user-bleeding con sessionStorage:** la clave `cambio_correo_self` no distinguía usuario.
Si el usuario A pedía un cambio de correo y cerraba sesión sin confirmar, el usuario B que iniciaba
sesión en la misma pestaña veía el banner con el correo pendiente de A. Mismo riesgo en la pantalla
admin de edición de usuario (clave `cambio_correo_admin_{id}` era más segura pero seguía usando
sessionStorage sin necesidad).

**Refresh de página perdía el estado:** si el usuario cerraba el modal de verificación de código y
refrescaba la página antes de que los 15 min expiraran, el front olvidaba que había un código vigente.

### Nuevos endpoints conectados

| Método | URL | Quién lo llama |
|---|---|---|
| `GET` | `/v1/auth/cambio-correo-pendiente` | `mi-perfil` al cargar (`ngOnInit`) |
| `GET` | `/v1/usuarios/{id}/cambio-correo-pendiente` | `add-usuarios` al cargar en modo edición |

**Response:** `{ data: { pendiente: boolean, correoPendiente: string\|null, expiraEn: string\|null } }`
Si `pendiente: true` → mostrar banner con `correoPendiente`; si `false` → no mostrar nada.

### Botón "Reenviar código"

Cuando el correo no llega, el usuario puede reenviar sin tener que cancelar y volver a editar el
campo. Cooldown de 60s para evitar spam.

- Campos nuevos: `cooldownReenvio = 0`, `private cooldownTimer`
- Método `reenviarCodigo()` / `reenviarCodigoCambioCorreo()`: llama `solicitarCambioCorreo()` /
  `solicitarCambioCorreoAdmin()` y arranca el countdown
- `iniciarCooldown()`: setInterval de 1s decrementa hasta 0
- `ngOnDestroy()`: limpia el timer en ambos componentes

**Nota back:** si ya hay un código vigente para ese mismo correo nuevo, el back **no reenvía uno
nuevo** — reutiliza el existente y responde `data: "Ya tienes un codigo vigente enviado a ese
correo, revisa tu bandeja"`. El front lo trata igual que el envío normal (muestra el modal del
código de todas formas). Esto evita que múltiples clics en "Reenviar" generen códigos que
invalidan al anterior.

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/login/acceder.service.ts` | + `cambioCorreoPendiente()` → `GET /v1/auth/cambio-correo-pendiente` |
| `src/app/shared/usuario.service.ts` | + `cambioCorreoPendienteAdmin(id)` → `GET /v1/usuarios/{id}/cambio-correo-pendiente` |
| `src/app/clietes/mi-perfil/mi-perfil.component.ts` | Elimina `SK_SELF` y todo `sessionStorage.*`; `ngOnInit` llama `verificarCambioCorreoPendiente()`; + `reenviarCodigo()` con cooldown; + `ngOnDestroy` |
| `src/app/clietes/mi-perfil/mi-perfil.component.html` | + botón `mp-btn--reenviar` con contador en `mp-codigo-pendiente` |
| `src/app/clietes/mi-perfil/mi-perfil.component.scss` | + `.mp-btn--reenviar` light + dark mode |
| `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` | Elimina `skAdmin()` y todo `sessionStorage.*`; `ngOnInit` llama `cambioCorreoPendienteAdmin(id)`; + `reenviarCodigoCambioCorreo()` con cooldown; + `ngOnDestroy` |
| `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.html` | + botón `au-btn-reenviar` con contador en `au-codigo-pendiente` |
| `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.scss` | + `.au-btn-reenviar` light + dark mode |

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX USUARIOS/ADD-USUARIOS — CAMPO DE CORREO NO DEBE MOSTRAR EL PENDIENTE SIN VERIFICAR (2026-07-08)

> Reporte en vivo (QA): admin entra a `/usuarios/buscar` → selecciona a Pedro (que ya tenía un
> código de cambio de correo pendiente, enviado antes de recargar la página) → el botón
> "Ingresar código" **no aparecía** — solo aparecía si el admin volvía a editar el campo de
> correo (disparando `onEmailBlur()` de nuevo).

### Diagnóstico — esto NO era un bug de código

El chequeo de "¿hay un cambio de correo pendiente?" al abrir la pantalla de edición
(`ngOnInit()` → `usuario.cambioCorreoPendienteAdmin(id)` → si `pendiente:true` pone
`codigoPendiente = true` y el botón "Ingresar código" aparece) **ya existía y funcionaba
correctamente** — se implementó en el mismo commit de la sección anterior
(`b7b5881`, 2026-07-08), y ese commit ya estaba empujado a `origin/qa` en el momento del reporte
(confirmado con `git branch -r --contains b7b5881` → `origin/dev`, `origin/qa`).

**Conclusión:** lo que el admin vio en `qa.shop.novedades-jade.com.mx` era casi seguro un
**bundle desactualizado** — el código ya estaba en la rama `qa` pero el pipeline de CI/CD hacia
el servidor QA es conocido por no dispararse solo (ver sección "CI/CD — ESTADO Y CONFIGURACIÓN
DEL PIPELINE QA", pendiente sin resolver desde 2026-06-18). Mismo patrón que la Lección #9 del
módulo chat: *"cuando el servidor QA no refleja los cambios del front, el problema casi siempre
es que el bundle no se ha reconstruido — no que el código esté mal."* Antes de asumir que hay
que tocar código, verificar con el admin: ¿el server QA ya corrió el `kubectl rollout restart`
manual después del último push a `qa`? Si no, ese es el primer paso, no una nueva corrección.

### Hallazgo real (sí era un bug) — el campo de correo mostraba el valor SIN VERIFICAR

Al revisar el código para confirmar el diagnóstico de arriba, sí apareció un problema de diseño
real: cuando había un cambio de correo pendiente, el campo del formulario **mostraba el correo
NUEVO (sin verificar)** como si ya fuera el correo real guardado — tanto al detectar un pendiente
existente en `ngOnInit()` (`this.formRegistro.get('email')?.setValue(data.correoPendiente)`)
como justo después de solicitar un cambio nuevo en `onEmailBlur()`. Esto es engañoso (el campo
aparenta tener ya guardado un correo que en realidad nadie confirmó) y frágil a futuro: si algún
día se agrega un botón de "Guardar cambios" que envíe el valor del campo `email` del formulario,
se guardaría el correo sin verificar saltándose todo el flujo de confirmación por código. Hoy no
pasa (el único guardado disponible para admin, "💾 Guardar permisos", usa `this.updateUser.email`
— el valor original — no el del form), pero es una trampa fácil de pisar después.

**Fix:** el campo de correo ahora **siempre** muestra el correo actual/real (`emailOriginal`) —
nunca el pendiente sin verificar. El banner "Se envió un código a **X**..." (ya existente) es la
única fuente visual de "a qué correo va a cambiar". Además, el campo se vuelve `readonly`
mientras `codigoPendiente` es `true` (mismo patrón visual que el campo `userName` en modo
edición admin) — evita que el admin escriba un tercer correo encima de una solicitud sin
resolver sin antes darle "Cancelar cambio" explícitamente.

**Archivos modificados:**
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` → `ngOnInit()` ya no
  hace `setValue(data.correoPendiente)`; `onEmailBlur()` revierte el campo a `emailOriginal`
  justo después de solicitar el cambio
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.html` → campo de correo
  `[attr.readonly]`/`[class.field-input--readonly]` cuando `codigoPendiente` es `true`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT "AGREGAR MI COMPRA" — RECLAMAR VENTA DE MOSTRADOR PARA RIFAS (2026-07-14)

> Documentado por el back en `CAMBIOS_FRONT.md`, sección "🆕 Reclamo de venta de mostrador —
> para que el cliente aparezca en la rifa". **Endpoints ya existían en el back antes de esta
> sesión** — lo que faltaba era la pantalla del cliente, que no estaba construida.

**Problema que resuelve:** si un cliente compra en mostrador y la venta queda registrada con
`ClienteSinRegistro` (nombre suelto) en vez de con su cuenta real, ese cliente no puede después
ser considerado para una rifa armada desde compras reales (`GET /v1/concursante/clientesPorMes`
lee de `pedidos`, que solo tienen dueño real si la venta está vinculada a un `Cliente`).

**Flujo:**
1. Al guardar la venta directa (`POST /v1/ventas/save`) con `clienteSinRegistroDto.correo_Electronico`,
   el back genera un código y lo envía por correo automáticamente (asunto "Reclama tu compra —
   Novedades Jade") — esto ya pasaba antes de esta sesión, no se tocó nada aquí.
2. **Nuevo en esta sesión:** el cliente entra a su cuenta → sidebar → "Agregar mi compra"
   (`/clientes/agregar-compra`) → escribe el código → `POST /v1/ventas/reclamar` con
   `{ codigo }` → si es válido, el back vincula `Venta.cliente` y `Pedido.cliente` a su cuenta.

**⚠️ Regla de naming respetada:** el back llama al endpoint/campo "reclamar" internamente, pero
esa palabra **no aparece en ningún texto visible al cliente** — la pantalla, el botón y los
mensajes usan "Agregar mi compra" / "Agregar compra" / "Código de tu compra", tal como pidió el
back explícitamente en su documento (en español "reclamo" se lee como queja, no como "esto es
mío"). Los mensajes de error también siguen el texto sugerido por el back:

| Mensaje crudo del back | Texto mostrado al cliente |
|---|---|
| `Este código ya fue utilizado` | "Este código ya fue usado." |
| `Código inválido` | "No encontramos ese código, revisa que esté bien copiado." |
| `El correo de tu cuenta no coincide con el de esta compra` | "Este código pertenece a otra cuenta." |
| (cualquier otro, ej. perfil de cliente incompleto) | se muestra tal cual viene del back |

**Pantalla:** un solo campo de texto + botón "Agregar compra", sin mostrar monto ni productos
(el endpoint no expone el detalle de la venta, solo confirma o rechaza) — exactamente como
sugirió el back. Tras éxito: mensaje "Tu compra quedó agregada a tu cuenta" + botones para
agregar otro código o ir a "Mis datos".

**No implementado (fuera de alcance, es una idea a evaluar a futuro según el propio doc del
back):** notificación/banner dentro de la app cuando el cliente tiene un código pendiente sin
capturar — el cliente debe ir manualmente a la opción del menú.

**⚠️ Corrección importante de esta sesión:** en la conversación se llegó a asumir por error que
también existía un endpoint de fallback para que el ADMIN asignara manualmente una venta a un
cliente (ej. `POST /v1/ventas/{id}/asignarCliente`) — **ese endpoint no existe**, no está en
`CAMBIOS_FRONT.md` ni se implementó. Si se necesita ese fallback (para cuando el cliente nunca
reclama el código), hay que pedirlo formalmente al back — no está construido en ningún lado
todavía.

**Archivos nuevos:**
- `src/app/clietes/agregar-compra/agregar-compra.component.ts/.html/.scss` → pantalla completa,
  prefijo BEM `amc-`, dark/light

**Archivos modificados:**
- `src/app/variante/service/variante.service.ts` → `reclamarVenta(codigo)` → `POST /v1/ventas/reclamar`
- `src/app/clietes/clietes.module.ts` → declara `AgregarCompraComponent`
- `src/app/clietes/clietes-routing.module.ts` → ruta `agregar-compra`, guard `AuthGuard` (cualquier
  usuario logueado, no admin-only)
- `src/app/navbar/navbar.component.html` → link "Agregar mi compra" en `.sb-user-links`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT ESTILO "AETHER" — TOKENS GLASS GLOBALES + REDISEÑO LOGIN (2026-07-14)

> Origen: MPC "Aether Premium Motion System" generado en Stitch (Google), pegado por el
> usuario como referencia de diseño. **No se conectó ningún MCP** — Stitch no tiene una
> función técnica para "exportar" el sistema a Claude; el propio Stitch aclaró que ese texto
> ES el entregable (no hay tecnología de por medio). El servidor MCP `stitch` registrado en una
> sesión anterior (`claude mcp add-json`, scope local) quedó sin uso para este propósito — su
> endpoint además está roto del lado de Google (`$ref` sin resolver en su schema de tools).

**Decisión de color confirmada con el usuario:** mantener la paleta ámbar/crema ya homologada
(`#B08A4E`/`#C9A063`) — el spec original de Aether traía azul/morado estilo Apple
(`#007AFF`/`#5856D6`), pero eso hubiera deshecho el rebrand de julio (ver "HOMOLOGACIÓN DE
PALETA — ÁMBAR/CREMA"). Tampoco se adoptó Tailwind ni Three.js/shaders del spec original — el
proyecto es Angular 14 + SCSS puro, sin esas dependencias, y no se agregaron.

### 1. Tokens globales (`src/styles.scss`) — aplican a TODO el proyecto

- `--radius-premium: 24px` — variable nueva para radios "premium" en tarjetas flotantes.
- `.glass-panel` — clase de utilidad opcional que reutiliza `--header-brand` /
  `--header-brand-filter` / `--header-brand-border` / `--header-brand-shadow` (ya ámbar, ya con
  blur, definidos por tema) en vez de inventar color nuevo.
- **Micro-interacción de botones (todo el proyecto, automático):** cualquier `button`, `.btn`
  (Bootstrap), `.p-button` (PrimeNG) o clase BEM `*-btn` de cualquier componente
  (`.pm-btn`, `.rf-btn`, `.ab-btn`, `.vd-btn`, etc.) se encoge levemente al presionar
  (`transform: scale(0.96)` en `:active`) — mismo micro-feedback que el `.btn-primary:active`
  de Aether. Los componentes que ya definían su propio `:active` (ej. `.btn-login` con
  `translateY`) lo siguen ganando por especificidad — esto es solo el comportamiento por
  defecto para los que no tenían nada propio.

### 2. Rediseño de Login (`src/app/login/login-form/login-form.component.scss`)

Pantalla piloto del look completo Aether-lite:
- `.split-form` → de panel sólido opaco a **gradiente ámbar suave** (`--app-bg` → `--app-surface-2`).
- `.form-inner` → se convierte en **tarjeta de cristal flotante**: `background: var(--header-brand)`
  + `backdrop-filter: blur(20px)` + borde sutil + `border-radius: var(--radius-premium)` (24px)
  + sombra difusa. Mismo token que ya usan los headers/buscadores de todo el sistema — cero
  color nuevo.
- `.field-input` → de caja completa con borde 2px a **borde inferior minimalista** (sin caja,
  fondo transparente, solo `border-bottom`), foco cambia el color del borde a `--app-accent`
  sin glow.
- `.btn-login` → radio de 10px → 16px (más "premium", sigue usando el degradado ámbar +
  hover/active propios que ya tenía).
- `.brand-icon` → radio 16px → 20px. `.error-msg` → radio 8px → 12px.
- Overrides `:host-context(theme-dark)`/`:host-context(theme-light)` actualizados para el nuevo
  fondo en gradiente y el borde inferior transparente (antes seteaban `background`/`border-color`
  para la caja completa que ya no existe).

**Verificado:** `ng build --configuration=development` sin errores + captura visual con
Playwright headless en `/login` (modo claro, oscuro y viewport móvil 390×844) — tarjeta de
cristal, inputs y botón se ven correctos y legibles en los tres casos, sin errores de consola
atribuibles al cambio (los `ERR_CONNECTION_REFUSED` vistos son por backend no corriendo en
local, no por CSS).

**Pendiente/no aplicado en esta sesión:** el resto de pantallas del proyecto (buscadores,
formularios admin, modales) siguen con su estilo actual — solo el login se llevó al look
completo de tarjeta de cristal + inputs minimalistas. Si se quiere extender el mismo
tratamiento a otras pantallas, es trabajo puntual por componente (no un cambio global
automático), dado que la mayoría de componentes tienen sus propios estilos de input/card
hardcodeados por archivo.

### Corrección — LOGIN pasa a azul/morado (color local, NO global) (2026-07-15)

Tras ver la referencia real de Stitch (capturas de la app "AETHER" con fondo/tarjeta azul-morado
y botón "SIGN IN"/"INICIAR SESIÓN"), el usuario aclaró: **el layout está bien** (mantener el
split-screen con fotos de producto + tarjeta de cristal), lo que quería cambiar eran **los
colores** — de ámbar a azul/morado (`#007AFF` → `#5856D6`, mismos valores del MPC original de
Aether). Confirmado explícitamente que es **solo para el login** — el resto del proyecto (todo
lo demás: buscadores, cards, botones, admin) se queda en ámbar/crema tal cual.

**Cómo se implementó sin tocar el resto del proyecto:** `login-form.component.scss` ya NO usa
las variables CSS globales `--app-accent`/`--header-brand` (que son ámbar y las usa toda la
app) — se reemplazaron por una variable SCSS local `$accent: #007AFF` / `$accent-d: #5856D6` y
valores hardcodeados de azul/morado directamente en este archivo, con sus propios overrides de
`:host-context(theme-dark)`/`:host-context(theme-light)` (fondo navy profundo en oscuro, blanco
azulado en claro). Cero cambios en `styles.scss` ni en ninguna variable global — el resto de la
app sigue leyendo `--app-accent` ámbar sin verse afectado.

**Archivos modificados:**
- `src/app/login/login-form/login-form.component.scss` → reescritura completa de colores (azul/morado local, layout intacto)

**Verificado:** `ng build` sin errores + capturas Playwright en claro, oscuro y con el formulario
lleno (para ver el botón en su gradiente activo, no solo el estado disabled) — coincide con la
referencia de Stitch.

### Fondo animado de partículas (modo oscuro) + botón de prueba día/noche (2026-07-15)

El usuario pidió replicar el efecto de "red de partículas" (puntos conectados por líneas que se
mueven) visible en la captura de referencia de Stitch ("Galería de Productos Premium - Modo
Oscuro"). **No se pudo abrir el link de Stitch** (`stitch.withgoogle.com/projects/...`) con
`WebFetch` — es una SPA autenticada con Google, solo devuelve el cascarón vacío ("Stitch -
Design with AI") sin contenido real; se implementó a partir de las capturas que el usuario ya
había compartido en el chat.

**Implementación — canvas 2D nativo, sin Three.js ni librerías nuevas:**
- `login-form.component.ts`: `iniciarParticulas()`/`detenerParticulas()` — 55 partículas con
  velocidad aleatoria, rebotan en los bordes del canvas, se dibujan líneas entre pares a menos
  de 130px de distancia (opacidad proporcional a la distancia). Loop con `requestAnimationFrame`,
  cancelado en `ngOnDestroy` y al pasar a modo claro. Reacciona a `ThemeService.isDark$`
  (inyectado) — no duplica lógica de tema, reusa el servicio que ya usa el sidebar.
- `login-form.component.html`: `<canvas #particlesCanvas class="particles-bg" *ngIf="(isDark$ | async)">`
  dentro de `.split-form`, detrás de `.form-inner` (que ahora tiene `z-index:1` para quedar
  encima). Solo existe en el DOM en modo oscuro — en claro se destruye solo (Angular `*ngIf`),
  sin necesidad de ocultarlo manualmente.
- `login-form.component.scss`: `.particles-bg` (`position:absolute; inset:0; z-index:0;
  pointer-events:none`), `.split-form` con `position:relative` para contenerlo.

**Botón de prueba temporal (`.theme-test-btn`, ☀️/🌙):** se agregó para poder comparar
claro/oscuro en el login sin esperar a que cambiara la hora del sistema. **Ya se eliminó**
(2026-07-16) al confirmarse el diseño — el toggle de tema normal del sidebar sigue existiendo.

**Verificado:** `ng build` sin errores + capturas Playwright con el botón de prueba real
(no manipulación directa de clases) confirmando: partículas visibles y en movimiento entre dos
capturas consecutivas en oscuro, canvas ausente en claro, sin errores de consola atribuibles al
cambio.

**Archivos modificados:**
- `src/app/login/login-form/login-form.component.ts` → `ThemeService` inyectado, partículas, `toggleThemeTest()`
- `src/app/login/login-form/login-form.component.html` → `<canvas>` + botón de prueba
- `src/app/login/login-form/login-form.component.scss` → `.particles-bg`, `.theme-test-btn`

**Ajuste — malla de puntos de fondo (2026-07-15):** con una segunda captura de referencia
("Galería de Productos Premium - Modo Oscuro") se confirmó que el efecto real tiene DOS capas:
una malla de puntitos fijos estilo papel cuadriculado (estática) + la red de líneas azules
animada encima. Se agregó la malla como textura CSS pura (`radial-gradient` repetido cada 22px,
sin JS) en el fondo de `.split-form` solo en modo oscuro, y se subió un poco la opacidad de las
líneas/nodos del canvas (`0.18→0.26` líneas, `0.6→0.85` nodos) para que se vean más nítidos
sobre el fondo casi negro (`#05060F→#0E1330`, antes era azul marino más claro).

### Reemplazo — malla técnica con shader WebGL en vez de canvas 2D (2026-07-15)

El usuario pasó el código completo de un shader WebGL (fragment shader GLSL, generado por la
IA de Stitch) como "referencia definitiva" de cómo debían verse y moverse las líneas, pidiendo
aplicarlo **tal cual**. Se integró reemplazando por completo el canvas 2D de partículas
(`iniciarParticulas`/`detenerParticulas`) por un pipeline WebGL real: compila un vertex +
fragment shader, dibuja un quad de pantalla completa, y anima una malla de 9 puntos por celda
(retícula tipo Voronoi) con conexiones entre puntos cercanos — cian sobre negro, exactamente el
algoritmo que mandó el usuario (`hash()`, `get_point()`, mismas constantes `0.05/0.03`, `1.2`,
`0.015`, `0.6`).

**⚠️ El código del usuario NO compilaba tal cual — bug real, no de nuestro lado.** El shader
original indexaba un arreglo (`vec2 p[9]`) con variables no-constantes: `p[idx]` (incrementada
manualmente con `idx++`) y `p[j]` (índice de un loop interno `for (int j=i+1; ...)`, inicializado
con una expresión no-constante `i+1`). **WebGL1 (GLSL ES 1.00) prohíbe esto en tiempo de
compilación** — es una restricción real del estándar, no específica de este navegador; se
confirmó con `gl.getShaderInfoLog()` (ver método de diagnóstico abajo). Se probó primero
`canvas.getContext('webgl2')` esperando que relajara la regla — **no ayudó**: sin un pragma
`#version 300 es` explícito, ANGLE compila el shader como GLSL ES 1.00 de todas formas, con la
misma restricción, sin importar si el contexto es WebGL1 o WebGL2.

**Fix aplicado:** se "desenrolló" el arreglo dinámico a 9 variables fijas `p0`..`p8` (cada una
con su propio offset `vec2` literal) y las 36 comparaciones de pares (`i<j` de 9 puntos) a
llamadas explícitas `lineMask(gv, pX, pY)` con índices literales — **misma matemática exacta,
mismo resultado visual**, solo reescrito para que el compilador lo acepte. Es el patrón estándar
para portar shaders generados por IA (que suelen probarse contra compiladores más permisivos,
como GLSL de escritorio o Shadertoy) a WebGL1, que es mucho más estricto con indexado dinámico
de arreglos.

**Método de diagnóstico agregado (queda permanente, no es debug temporal):** `iniciarParticulas()`
ahora valida `gl.getShaderParameter(shader, gl.COMPILE_STATUS)` y
`gl.getProgramParameter(program, gl.LINK_STATUS)`, con `console.warn(gl.getShaderInfoLog(...))` si
falla — WebGL falla en silencio (no lanza excepción JS), así que sin esto un shader roto se ve
simplemente como "no aparece nada" sin ninguna pista. Si en el futuro se toca este shader y dejan
de verse las líneas, revisar la consola del navegador primero.

**Verificado:** `ng build` sin errores + capturas Playwright confirmando: sin warnings de
compilación de shader en consola, malla cian nítida sobre negro puro visible, y los nodos
cambian de posición entre dos capturas consecutivas (confirma que la animación corre, no es una
imagen estática).

**Archivos modificados:**
- `src/app/login/login-form/login-form.component.ts` → reemplaza el canvas 2D por WebGL
  (`MESH_VERTEX_SRC`, `MESH_FRAGMENT_SRC`, `iniciarParticulas()`/`detenerParticulas()` reescritos)
- `src/app/login/login-form/login-form.component.scss` → `.split-form` en oscuro vuelve a fondo
  sólido simple (la malla de puntos CSS quedó redundante — el shader ya pinta su propio negro +
  líneas, cubre todo el panel de forma opaca)

---

## HOMOLOGACIÓN DE PALETA — AETHER AZUL/MORADO (2026-07-16) ✅ COMPLETO

> **⚠️ Esta sección REEMPLAZA a "HOMOLOGACIÓN DE PALETA — ÁMBAR/CREMA (2026-07-03)".**
> El ámbar ya NO existe en el proyecto. Aquella sección se conserva solo como historial.

**Cambio de marca:** tras aprobar el rediseño Aether del login, el usuario pidió la misma
paleta y estilo para TODO el sistema ("los mismos colores que tenemos en el login para todo lo
demás: ventas, usuarios, clientes, etc."). La paleta ámbar/crema (`#B08A4E`/`#C9A063`) fue
reemplazada globalmente por azul/morado Aether.

### Paleta canónica

| | Claro | Oscuro |
|---|---|---|
| Accent | `#007AFF` | `#4A9EFF` (más brillante, para contraste sobre navy) |
| Accent partner (gradientes) | `#5856D6` (morado) | `#5856D6` |
| Fondo | `#F5F8FF` | `#0B0F24` |
| Surface / cards | `#FFFFFF` | `#161B3A` |
| Surface-alt | `#E8EDFB` | `#242B52` |
| Texto | `#1C1E2E` | `#F1F4FF` |
| Texto secundario | `#5A6285` | `#8890B8` |
| Borde | `#DCE3F2` | `#2A3050` |
| Placeholder | `#A3ABC9` | `#6C7499` |
| Gradiente de marca | `linear-gradient(135deg, #007AFF, #5856D6)` | igual |

**Regla (sin cambio):** NUNCA hardcodear hex — usar `var(--app-accent)`, `var(--card-bg)`,
`var(--header-brand)`, etc. Ver [[project_variables_css]].

### Enfoque: genérico, no componente por componente

A petición explícita del usuario, el cambio se hizo **a nivel de variables globales**
(`src/styles.scss`) en vez de rediseñar cada pantalla: todas las cards, inputs, buscadores,
tablas y tipografía toman el color de ahí. Los 44 SCSS de componentes que tenían el ámbar
hardcodeado se migraron con un **mapeo de paleta 1:1** (mismo método que el índigo→ámbar de
julio), no reescribiéndolos.

- `styles.scss` → bloques `body.theme-light` / `body.theme-dark` reescritos a mano (los valores
  precisos por modo; ahí es donde importa la distinción de rol).
- 44 SCSS de componentes + estilos inline de Swal en `.ts` → mapeo mecánico hex→hex.
- **832 ocurrencias de ámbar → 0.** Verificado con grep.

### ⚠️ Trampas encontradas (importante si se vuelve a cambiar la paleta)

1. **4 hex tienen DOBLE ROL** — el mismo color se usa para cosas distintas según el tema:
   `#1C1B19` (texto en claro / fondo en oscuro), `#F5F1EA` (fondo en claro / texto en oscuro),
   `#7A6A58` y `#B8AE9C` (secundario ↔ placeholder). Un `sed` ciego los rompe. Se resolvió así:
   en `styles.scss` se escribieron a mano los valores correctos por modo; en los componentes se
   mapearon a un valor único válido para ambos roles — es seguro **porque ahí casi siempre son
   solo el *fallback*** de `var(--app-text, #1C1B19)`, y la variable gana en tiempo de ejecución.

2. **Sobrevivía una paleta ROSA/VINO anterior al ámbar** (`#8b1a4a` + `#c2255c`), que la
   migración de julio no alcanzó: registro (`add-usuarios`), `palabras-clave`, `venta-directa`,
   `detalle-producto`. También migrada a azul/morado (`#007AFF` + `#5856D6`, mismo par que el
   gradiente del login).

3. **NO todo color rosa/naranja/verde es "paleta"** — hay dos listas de colores que se dejaron
   intactas a propósito:
   - `all.component.ts` → `map[color]` traduce el **color REAL del producto**
     (`rosa`, `morado`, `naranja`…) a un gradiente. Un producto rosa debe verse rosa.
     Solo se cambió el **fallback** de marca.
   - `all-usuarios.component.ts` → `avatarColor()` es una paleta de 8 gradientes distintos para
     que cada usuario tenga un avatar de color diferente. No es marca, es variedad.
   - Colores semánticos (`#ef4444` rojo, `#10b981` verde, badges de stock) — sin cambio.

4. **Los Swal llevan sus colores inline en el `.ts`**, no en el SCSS del componente (SweetAlert2
   inyecta su HTML en `document.body`, fuera del scope de estilos de Angular). Al migrar la
   paleta hay que grepear también `--include="*.ts"`, no solo los SCSS.

### Animación de fondo — SOLO en el login

Decisión explícita del usuario: la malla técnica WebGL animada se queda **únicamente en el
login**. El resto de las pantallas llevan la paleta azul pero **sin animación** (el shader
consume GPU de forma continua y en pantallas de trabajo —tablas, formularios— distrae).

**Verificado:** `ng build` sin errores + capturas Playwright de login y registro (las únicas
pantallas alcanzables sin backend) en claro y oscuro, más una página de prueba que carga el
`styles.css` compilado real para revisar los componentes genéricos (cards, inputs, tablas,
botones, badges, alertas) en ambos temas — todo legible, sin texto invisible.

### 💡 Nota de entorno — `ng serve` escucha en IPv6

`ng serve` bindea a `[::1]:4200` (IPv6), NO a `127.0.0.1`. Verificar con
`curl http://[::1]:4200` — usar `127.0.0.1` da "Connection refused" aunque `netstat` muestre el
puerto LISTENING, lo que parece un problema de red pero no lo es.

---

## FIX PROMOCIONES — EL BUSCADOR DE VARIANTES SOLO MUESTRA LAS QUE TIENEN STOCK (2026-07-16)

**Cierra definitivamente el bug de la promo "ropa"** documentado en "FIX PROMOCIONES — BOTÓN
'AGREGAR' ILEGIBLE EN DISABLED…" (2026-07-13) y en `PROMOCIONES.md` sección 6.

**Contexto:** al armar un combo, el buscador usaba `VarianteService.buscar()` — el buscador
general, sin filtro de stock. Mostraba TODAS las variantes, incluidas las de 0 piezas. El fix
de julio solo agregó señalización visual (stock, `#ID`, atenuado, aviso de duplicados) pero
**seguía permitiendo seleccionar una variante sin stock** → el combo nacía con
`instanciasDisponibles = 0` y se veía "❌ Sin disponibilidad" en el catálogo, sin que el admin
entendiera por qué. Fue exactamente lo que pasó con "ropa" (id 1): de 7 variantes hermanas
indistinguibles del mismo producto, se eligieron las 2 que tenían `stock: 0`.

**Criterio de negocio (definido por el usuario):** al **armar** la promoción solo deben
aparecer variantes con stock — eliges sobre lo que existe hoy. Que el stock se agote después
NO es problema de esta pantalla: el back recalcula `instanciasDisponibles` con el stock vivo
(la promo se muestra sola como "Sin disponibilidad" en el catálogo) y **la validación real de
stock ocurre al agregar a la venta / cobrar**. Por eso no hace falta ningún filtro extra ni
revalidación aquí.

**Fix:** `buscarVariante()` cambia de `buscar({ termino })` a
`adminFiltrar({ nombreOCodigo: termino, conStock: true }, 1, 8)`. **No requiere backend nuevo** —
`adminFiltrar` ya existía (ver "FEAT F-14") y combina `nombreOCodigo` + `conStock` con AND,
devolviendo el mismo `IVarianteResumenPaginable`.

Cambios de UI derivados:
- Se eliminó el estado "❌ sin stock" del dropdown y sus estilos (`--sinstock`, `--cero`) —
  código muerto: ya nunca llega una variante con 0.
- Nuevo aviso `.gp-hint-sinresultados` cuando la búsqueda no arroja nada: aclara que **solo se
  listan variantes con stock**, para que no parezca que el producto no existe.
- Se conservan el stock por resultado, el `#ID` y el aviso de duplicados — siguen siendo útiles
  para distinguir variantes hermanas con el stock repartido.
- `buscarVariante()` ahora captura `err?.error?.mensaje` en un Swal (antes tragaba el error en
  silencio — mismo patrón de la Lección #1 del módulo rifas).

**Archivos modificados:**
- `src/app/admin/promociones/gestion-promociones.component.ts` → `buscarVariante()`
- `src/app/admin/promociones/gestion-promociones.component.html` → dropdown sin estado
  "sin stock" + `.gp-hint-sinresultados`
- `src/app/admin/promociones/gestion-promociones.component.scss` → limpia estilos muertos

**Verificado con `ng build --configuration=development` sin errores.** ⚠️ No se probó en vivo:
`/admin/promociones` requiere sesión de admin y backend corriendo.

---

## FIX VENTA DIRECTA — LAS PROMOS DEL CARRITO NO SE MOSTRABAN (2026-07-16)

**Síntoma reportado:** admin crea una promoción → la agrega al carrito → `/variantes/carrito` →
"💰 Cobrar ahora" → `/variantes/venta-directa` → **la promoción no aparece por ningún lado.**

**Causa raíz — el template nunca renderizó las promos.** El `.ts` estaba completo desde el
FEAT original (`promosCarrito` se pre-carga en `ngOnInit`, cuenta en `totalVenta`/`totalUnidades`,
`puedeCobrar` acepta solo-promos, `ejecutarVenta()` las envía), pero
`venta-directa.component.html` **solo usaba `tienePromos` para OCULTAR la sección de crédito** —
nunca hubo un `*ngFor` que las listara. Confirmado con
`git log -S "promosCarrito" -- venta-directa.component.html` → **cero commits**.

⚠️ **No fue una regresión: nunca se implementó.** El commit `287f9dd` ("ocultar apartado/
ir-pagando cuando hay promos en carrito") es el que introdujo `tienePromos` en ese HTML, pero
solo para el `*ngIf` del crédito. Es fácil confundirlo con "ya se había arreglado".

**Agravante — carrito con SOLO promos:** la condición del panel era
`*ngIf="lineas.length > 0; else ventaVacia"`. Si el carrito traía únicamente combos (sin
variantes sueltas), `lineas.length === 0` → se mostraba el estado vacío ("Agrega variantes desde
el buscador") **y ni siquiera se pintaban los totales**, mientras el botón Cobrar sí estaba
habilitado (porque `puedeCobrar` usa `lineas.length > 0 || tienePromos`). Pantalla vacía que sí
cobra.

**Fix:**
- Condición del panel → `*ngIf="lineas.length > 0 || tienePromos; else ventaVacia"`.
- Nueva sección `.vd-promo` que lista cada combo (descripción, `× N combo(s)`, el desglose de
  piezas y el subtotal), destacada con `--app-accent` para distinguirla de una variante suelta.
- Nuevo `quitarPromo(i)` en el `.ts` — hace `splice` solo del array local, **igual que
  `quitarLinea()`**: el carrito real se limpia hasta el final en `limpiarTodo()` si
  `cargadoDesdeCarrito`.

**Revisado y descartado (no era bug):** `ngOnInit` lee `this.isAdminUser` de forma síncrona justo
después de suscribirse a `authService.userRoles$`, lo que parecía una condición de carrera —
pero `userRoles` es un `BehaviorSubject`, así que emite síncronamente al suscribir y el flag ya
está listo. No tocar.

**Archivos modificados:**
- `src/app/variante/venta-directa/venta-directa.component.html` → condición del panel + sección de promos
- `src/app/variante/venta-directa/venta-directa.component.ts` → `quitarPromo()`
- `src/app/variante/venta-directa/venta-directa.component.scss` → `.vd-promo`

**Verificado con `ng build` sin errores.** ⚠️ No probado en vivo (requiere backend, sesión admin
y una promo con stock).

---

## 📖 TAXONOMÍA DE NOMBRES — CÓMO SE LLAMAN LAS COSAS (2026-07-16)

> **Regla obligatoria para cualquier texto nuevo visible al usuario.** Antes de escribir una
> etiqueta, título, botón o mensaje, revisar esta tabla.
>
> 📄 **Versión para el equipo de back: `TAXONOMIA_NOMBRES_BACK.md`** (raíz del repo) — explica
> la traducción y les pide anotar las entidades. **No les pide ningún cambio de código.**

### ⚠️ Impacto en backend: CERO (verificado)

En toda esta tanda (`c412b0e`..`69a5941`: paleta Aether, login, taxonomía, carrito, promos)
**no se tocó ningún `.service.ts`** — confirmado con
`git diff --stat c412b0e~1..HEAD -- 'src/**/*.service.ts'` → vacío.

El **único** cambio de llamada HTTP fue en `gestion-promociones.component.ts`:
`GET /variantes/v1/buscar` → `GET /variantes/v1/admin/filtrar?nombreOCodigo=…&conStock=true`.
Ese endpoint **ya existía desde F-14 (2026-07-02)** y ya lo usaban `productos/all` y
`variante/buscar` — no requiere nada del back. Todo lo demás fue CSS y texto.

### El problema que resuelve — POR QUÉ se hizo este cambio

El sistema creció por capas y los nombres se desincronizaron del negocio:

1. **"Producto" significaba dos cosas.** El menú tenía "Productos" (que iba a
   `/variantes/buscar`, el catálogo del cliente) y "Mis productos" (que iba a
   `/productos/buscar`, el alta de admin) — **dos entidades distintas con el mismo nombre**.
   Nadie podía saber cuál era cuál sin abrirlas.
2. **"Variante" se filtraba a la pantalla** ("Rifa de variantes", "Gestionar variantes",
   "Carrito de variantes"). Es un término técnico interno: al dueño del negocio y al cliente
   no les dice nada. El usuario lo reportó textualmente: *"variantes se escucha feo"*.
3. **Había dos carritos en el footer** compitiendo — uno de productos y otro de variantes — y
   el cliente **nunca ve productos** (esas pantallas son admin-only), así que el carrito de
   productos solo estorbaba en el menú.

La causa de fondo: el dueño nombró primero "productos" al agrupador, y cuando después
aparecieron las variantes (talla/color), ya no quedaba una palabra libre para lo que
realmente se vende. Este cambio libera la palabra "Producto" para el SKU vendible —que es lo
que el cliente entiende por producto— y le da un nombre propio al agrupador: **Modelo**.

### Vocabulario oficial

| Entidad (código) | Nombre visible | Qué es | Quién lo ve |
|---|---|---|---|
| `Producto` (padre) | **Modelo** | El agrupador: "Blusa Zara". Tiene nombre, precios base y categoría. | Solo admin |
| `Variante` (SKU) | **Producto** | Lo que de verdad se vende: "Blusa Zara / M / Negro". Tiene **stock, precio y código de barras**. | Cliente y admin |
| `palabraClave` | **Categoría** | — | Ambos |

**La regla de oro:** *Modelo agrupa, Producto se vende.* Si tiene código de barras y stock, es
un **Producto**.

### ⚠️ El código NO se renombró — y es a propósito

En el código, las rutas y la API, la entidad **sigue llamándose `variante`**
(`/variantes/buscar`, `VarianteService`, `IVarianteResumen`, `GET /variantes/v1/...`).
Solo se tradujo el **texto visible**. Renombrar el código sería un refactor de ~60 archivos
que además **no eliminaría la inconsistencia**, porque el backend expone `/variantes/v1/...`
de todos modos. Decisión explícita del usuario: solo lo visible.

**Traducción mental al leer código:** `variante` → "producto"; `producto` → "modelo".

### Menú (estado actual)

| Etiqueta | Ruta | Nota |
|---|---|---|
| 🛍️ **Tienda** | `variantes/buscar` | Catálogo del cliente |
| 📦 **Inventario** | *(accordion admin)* | Antes "Mis productos" |
| ↳ 🔍 **Modelos** | `productos/buscar` | Antes "Ver todos" |
| ↳ ➕ **Agregar modelo** | `productos/agregar` | |
| ↳ 🧩 **Agregar producto** | `variantes/venta` | ⚠️ La ruta dice `venta` pero el componente es `AgregarComponent` — nombre heredado, no confiar en la ruta |
| ↳ 🏷️ **Categorías** | `palabras-clave` | Antes "Palabras clave" — el form ya decía "Categoría" |
| 🎡 **Rifa de productos** | `rifas/agregar` | |

### Footer del sidebar — carrito

Antes había **dos** carritos en el footer y confundían:

| Botón | Antes | Ahora |
|---|---|---|
| Catálogo | "Productos" (pero navegaba a `/variantes/buscar` — engañoso) | **"Catálogo"** |
| Limpiar | Limpiaba solo el carrito de **productos** | Limpia el carrito de **variantes + promos** (el que se ve) |
| Carrito | Carrito de productos (`/productos/detalle-productos`) | **Eliminado del menú** |
| Variantes | "Variantes" 🏷️ | **"Carrito"** 🛒 (`/variantes/carrito`) |

**⚠️ El carrito viejo de productos NO se borró — sigue funcionando.** Se quitó solo del
sidebar. Es seguro porque `/productos/buscar` **tiene su propio botón de carrito** con badge
que lleva a `/productos/detalle-productos`: no queda huérfano, solo deja de competir en el
menú. `limpiarSesionLocal()` (logout) sigue limpiando **ambos** carritos.

Código muerto eliminado de `navbar.component.ts`: `countCarrito`, su suscripción a
`carritoDetalle$`, y `revisarProductosCarrito()`.

### 💡 Trampa de encoding al renombrar en lote

Un script Perl que reemplace frases con acentos (`ó`, `—`, `…`) **debe llevar `use utf8;`** y
leer/escribir con `:encoding(UTF-8)`. Sin `use utf8`, el patrón del script va en bytes y el
archivo se lee decodificado → las frases con acentos **no coinciden y fallan en silencio**
(pasó en la primera pasada: se aplicaron solo las frases ASCII).

**Regla para renombrar etiquetas:** usar **frases completas**, nunca la palabra suelta —
reemplazar `variante` a secas rompe bindings (`varianteSeleccionada`), rutas
(`routerLink="variantes/..."`) y clases CSS. Verificar después con
`git diff | grep -oE 'routerLink="[^"]*"'` que ninguna ruta haya cambiado.

**Archivos modificados:** `navbar.component.html` + `.ts`, y ~20 templates con texto visible.
**Verificado con `ng build` sin errores** y confirmando que ninguna ruta cambió.

---

## FEAT CARGA RÁPIDA DE IMÁGENES — PRODUCTO BORRADOR POR FOTO (2026-07-21)

> Spec del back en `CAMBIOS_FRONT.md` § "🆕 Carga rápida de imágenes". Módulo lazy
> `/carga-imagenes`, **solo admin**.

**Qué resuelve:** antes había que llenar TODO el formulario de producto y subir la imagen en el
mismo guardado — si el token expiraba a media captura, se perdía todo, incluida la foto. Ahora
la foto va primero: cada imagen crea al instante un producto+variante borrador (stock 1,
deshabilitado, código de barras temporal `BRD-XXXXXXXXXXXX`), y los datos se llenan después,
campo por campo, sin volver a tocar la imagen.

### Flujo

1. **Capturar:** botón "📷 Tomar foto" (`capture="environment"` → cámara trasera en móvil) o
   "🖼️ Elegir de galería o PC" (`multiple`). Cada archivo dispara su propio
   `POST /v1/carga-imagenes/subir-imagen` — **una imagen por request**, sin esperar entre una y
   otra (el back encola las subidas, máx. 6 en paralelo).
2. **Polling:** los `productoId` que vuelven en `PENDIENTE` entran a un `Set`; `setInterval` de
   2.5s consulta `GET /estado?productoIds=...` **solo con los pendientes** y saca cada uno que
   deje de estar `PENDIENTE`. Cuando el Set queda vacío, `clearInterval` — no hay polling de
   fondo indefinido.
3. **Reintentar:** botón visible **solo** en tarjetas `FALLIDO` →
   `POST /{productoId}/reintentar-imagen` (reutiliza el mismo producto, no crea un borrador
   duplicado).
4. **Completar:** clic en una tarjeta `EXITOSO` → modal con los campos →
   `PUT /{productoId}/completar`. Dos botones: "💾 Guardar avance" (persiste lo que haya) y
   "🚀 Guardar y publicar" (agrega `habilitar: true`).

### Seleccionar → revisar → subir (la selección NO sube nada)

Elegir archivos **no dispara ninguna petición**. Van a una *bandeja* (`seleccionadas`) donde se
ven **miniatura, nombre y peso** de cada uno, más el peso total. El usuario puede quitar los que
no quiera (`✕` por fila, o "Quitar todas") y recién entonces pulsa **"⬆️ Subir N imagen(es)"**.

Esto se cambió a propósito después de una primera versión que subía al instante al seleccionar:
sin paso intermedio no había forma de ver qué se eligió ni de arrepentirse, y cada equivocación
dejaba un producto borrador basura en la base.

**La bandeja se vacía sola, y solo si TODAS subieron.** Cada archivo que entra bien se saca de
`seleccionadas` y pasa a la grilla de borradores; el que falla **se queda en la bandeja** con su
error en rojo, conservando miniatura/nombre/peso. Así:

- Bandeja vacía ⇒ todas subieron. No hace falta un flag aparte que pueda desincronizarse.
- Si fallan algunas, el botón cambia a **"🔄 Reintentar las que fallaron"** (`reintentarFallidas()`),
  que solo reenvía las que tienen `error` — nunca duplica las que ya entraron.
- No hay que volver a buscar los archivos en el disco: el `File` sigue vivo en la bandeja.

Un archivo que falla en el POST **no deja borrador** en el back — por eso es seguro reintentarlo.

**`enVuelo` es un contador, no un booleano.** Con un `subiendo = true/false` compartido, la
primera respuesta apagaba el indicador aunque quedaran 9 peticiones vivas. También es el guard
que impide subir dos veces o mutar la bandeja a media subida (`subirTodas()`,
`limpiarSeleccion()` y los botones salen temprano si `enVuelo > 0`).

**Detalle de memoria:** el `ObjectURL` del preview **no se revoca** al subir con éxito — se lo
queda la tarjeta del borrador, que lo sigue mostrando. Solo se revoca al quitar un archivo de la
bandeja, al quitar una tarjeta, o en `ngOnDestroy`. Revocarlo en el `next` dejaría la miniatura
rota.

### ⚠️ Dos motivos por los que una miniatura sale rota aquí (ambos ya corregidos)

**1. Angular 14 BLOQUEA las URLs `blob:`.** Su lista blanca de sanitización de URLs
(`SAFE_URL_PATTERN` en `@angular/core`) es:

```
/^(?:(?:https?|mailto|data|ftp|tel|file|sms):|[^&:/?#]*(?:[/?#]|$))/gi
```

`blob:` **no está**. Un `[src]="objectUrl"` crudo se reescribe a `unsafe:blob:...` y el navegador
no lo carga — la imagen sale rota **sin ningún error en consola**, que es lo que lo hace difícil
de diagnosticar. Verificado corriendo el regex a mano contra `blob:http://localhost:4200/abc`
→ no matchea.

Fix: `sanitizer.bypassSecurityTrustUrl(objectUrl)` **al crear el objeto**, no en el template.
Llamarlo desde un binding devuelve una instancia nueva en cada ciclo de detección de cambios y
Angular no deja de repintar. Por eso cada item guarda **dos** campos: `preview`/`previewLocal`
(el `SafeUrl`, para el `[src]`) y `previewUrl` (el string crudo, único que sirve para
`URL.revokeObjectURL`).

**2. `urlImagen` del back es un endpoint protegido.** Un `<img src>` nativo no pasa por
`TokenInterceptor` — no manda el JWT y responde 401. Por eso **todo el proyecto** carga imágenes
del servidor con `| imagenSrc | async`, que las baja por `HttpClient` (con token) y devuelve un
`data:` URL. Aquí se usa el pipe solo cuando NO hay miniatura local: las fotos de la sesión ya
tienen su blob saneado, y solo las que vienen de `GET /fallidas` al entrar necesitan el pipe.

**Regla general:** en este proyecto, una imagen que viene del back **siempre** va con
`| imagenSrc | async`; un archivo local **siempre** va con `bypassSecurityTrustUrl`. Nunca un
`[src]` crudo con ninguno de los dos.

### Regla — una foto ya subida no se vuelve a subir

Cada archivo se identifica por una **firma** `nombre|size|lastModified`. Si ya existe una tarjeta
con esa firma, se omite y sale un Swal informativo. Evita crear un producto borrador duplicado
por cada intento accidental (el back **no** detecta imágenes repetidas — esta barrera es
únicamente del front, y solo dentro de la sesión de captura).

Complemento de la misma regla: **el botón de reintentar solo aparece si la imagen falló.** Una
tarjeta `EXITOSO` no ofrece re-subir — para cambiar la imagen de un producto ya cargado se usa
el flujo normal de edición de producto.

### Admin-only en DOS capas

- Ruta: `canActivate: [AuthGuard, AdminGuardGuard, CarritoGuard]` en `app-routing.module.ts` +
  el mismo par de guards dentro de `carga-imagenes-routing.module.ts`.
- Menú: el link vive dentro del accordion **📦 Inventario**, que ya es `*ngIf="isAdminUser"`.

El back responde 403 a no-admin, pero el spec pide explícitamente que eso **no sea la única
barrera** — si un cliente llega a ver el botón, es bug de UX aunque el request falle.

### Detalles a no romper

- **El código de barras autogenerado (`BRD-...`) NUNCA se muestra ni se precarga.** El campo
  "Código de barras real" arranca vacío; al mandarlo, el back crea el código real y borra el
  placeholder solo.
- `limpiar()` quita del body los campos vacíos/null antes del PUT — el back interpreta ausente
  como "no tocar este campo", así que mandar `''` pisaría un valor bueno con vacío.
- `ngOnInit` llama `GET /fallidas` como red de seguridad: si el usuario recargó la página a
  media carga y perdió los `productoId` en memoria, ahí aparecen los que quedaron rotos. Falla
  en silencio a propósito — es un extra, no debe bloquear la captura.
- `quitarTarjeta()` solo saca la tarjeta de la vista; **el borrador sigue existiendo en el back**
  y se retoma desde `GET /v1/productos/admin/no-habilitados`.

**⚠️ Requiere que el back corra `migration_carga_imagenes.sql`** (columnas `codigo_barras_generado`,
`estado_imagen`, `mensaje_error_imagen` en `producto`). No corre sola (`ddl-auto: none`). Hasta
entonces los endpoints no responden en dev/qa.

**Archivos nuevos:** `src/app/carga-imagenes/` — `models/carga-imagen.model.ts`,
`service/carga-imagenes.service.ts`, `carga-imagenes.component.ts/.html/.scss`,
`carga-imagenes.module.ts`, `carga-imagenes-routing.module.ts` (prefijo BEM `ci-`, dark/light
vía variables globales).

**Archivos modificados:** `src/app/app-routing.module.ts` (ruta lazy),
`src/app/navbar/navbar.component.html` (link en Inventario).

**Aparte:** `CAMBIOS_FRONT.md` estaba duplicado (12 320 líneas = dos copias casi idénticas). Se
conservó la **segunda** (la más nueva: incluye `codigoBarras` en promos, la expiración mensual
del código de reclamo, y `POST /v1/ventas/{ventaId}/asignarCliente` — que la primera copia no
tenía). Quedó en 6 320 líneas.

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo: requiere la migración SQL corrida en el back.

### Extra — botón "generar código automático" en "Completar datos" (2026-07-21)

No todos los borradores tienen un código de barras legible a la mano (foto suelta de una prenda
sin etiqueta/empaque, por ejemplo) — el admin necesitaba la misma opción que ya existe en
"Agregar producto" para inventarle uno. Se agregó el botón 🎲 junto al campo "Código de barras
real" del modal de completar → `generarCodigoBarras()`, mismo formato que
`AddComponent.generarCodigoBarras()` (`MMDDAAAA` + 5 dígitos aleatorios, 13 caracteres) — solo
llena el campo, el admin sigue pudiendo editarlo antes de guardar. A diferencia del formulario de
"Agregar producto" (que tiene un toggle "Generar código automático" con lógica de
validadores/auto-regeneración), aquí es un botón puntual y nada más — no hay riesgo de
duplicar nada porque este formulario siempre guarda con `PUT /completar` (matchea por `id`).

**Archivos modificados:**
- `src/app/carga-imagenes/carga-imagenes.component.ts` → `generarCodigoBarras()`
- `src/app/carga-imagenes/carga-imagenes.component.html` → botón junto al campo
- `src/app/carga-imagenes/carga-imagenes.component.scss` → `.ci-field__con-btn`, `.ci-btn-generar`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FEAT FILTROS ADMIN — `codigoGenerado` EN PRODUCTOS Y VARIANTES + LAYOUT 2 COLUMNAS (2026-07-21)

> Cierra el pendiente de la sección "FEAT CARGA RÁPIDA DE IMÁGENES" — encontrar los borradores
> que todavía tienen el código de barras autogenerado (`BRD-XXXXXXXXXXXX`) sin completar.

### Filtro nuevo

6.º checkbox-pareja (mismo patrón tri-estado que `conStock`/`conImagenes`/`habilitado`: ambos
marcados o ninguno = no filtra por esa dimensión; exactamente uno marcado = filtra por ese valor)
en los filtros admin de `productos/buscar` y `variantes/buscar`:
- **"Código generado"** → `codigoGenerado=true` — solo borradores de carga rápida sin código real.
- **"Código real"** → `codigoGenerado=false` — todo lo demás (incluye productos normales, que
  nunca pasaron por carga rápida — el back los cuenta como "código real", no como caso aparte).

Combina con AND con el resto de filtros — caso de uso típico para encontrar "pendientes de
completar": marcar "Código generado" + "No habilitados" a la vez.

### Layout — filtros en 2 columnas en vez de una fila

`.pl-filtros` (`all.component.scss`) y `.vb-filtros` (`buscar.component.scss`) pasaron de
`display: flex; flex-wrap: wrap;` a `display: grid; grid-template-columns: repeat(2, 1fr);` —
los checkboxes (y los botones "Limpiar filtros"/"Excel" que viven en el mismo contenedor)
quedan acomodados de 2 en 2 en vez de una fila larga que se envolvía de forma despareja.

### Nota — reconciliación con trabajo ya iniciado en `dev`

Al ir a implementar esto se encontró que ya existía un commit en `dev` (sin subir a `qa`) que
traía la documentación del backend (`CAMBIOS_FRONT.md`) y el cambio en
`variante.service.ts#adminFiltrar()` — pero **no** la parte de `producto.service.ts`, los
`.ts`/`.html` con los checkboxes, ni el cambio de layout. Se hizo merge de `dev` a `qa` primero
(conflicto trivial en `variante.service.ts`, misma línea agregada dos veces con distinto
formato) y luego se completó lo que faltaba encima.

**Archivos modificados:**
- `src/app/productos/service/producto.service.ts` → `adminFiltrar()` + param `codigoGenerado`
- `src/app/variante/service/variante.service.ts` → mismo cambio (ya venía de `dev`)
- `src/app/productos/producto/all/all.component.ts` → `mostrarCodigoGenerado`/`mostrarCodigoReal`,
  `paramCodigoGenerado`, extendido `hayFiltrosAdminActivos`/`toggleFiltroAdmin`/`limpiarFiltrosAdmin`
- `src/app/variante/buscar/buscar.component.ts` → mismo cambio
- `src/app/productos/producto/all/all.component.html` → 2 checkboxes nuevos
- `src/app/variante/buscar/buscar.component.html` → 2 checkboxes nuevos
- `src/app/productos/producto/all/all.component.scss` → `.pl-filtros` a grid 2 columnas
- `src/app/variante/buscar/buscar.component.scss` → `.vb-filtros` a grid 2 columnas

**Verificado con `ng build --configuration=development` sin errores.**

### FIX — el grid de 2 columnas se desbordaba en móvil y ocultaba filtros (mismo día)

**Reportado:** con las 8 opciones ya en grid de 2 columnas, en el celular "ya no se ven todos
los filtros".

**Causa raíz:** `.pl-filtro-check`/`.vb-filtro-check` (y `.pl-filtro-btn`/`.vb-filtro-btn`) tienen
`white-space: nowrap`. Un label largo como **"Código generado"** no cabe en el 50% de ancho de
una columna en una pantalla de 320-375px — y como los ítems de un grid tienen por default
`min-width: auto` (que con `nowrap` equivale al ancho completo del texto sin cortar), el
navegador agranda esa columna más allá de su `1fr` para no partir el texto. Resultado: el grid
completo se desborda del contenedor y las columnas/filtros que quedan más a la derecha salen del
viewport — mismo mecanismo de "grid blowout" ya documentado en `ANALISIS_DISENO_MOVIL.md`.

**Fix — dos partes:**
1. `min-width: 0;` en los ítems del grid (`.pl-filtro-check`, `.pl-filtro-btn`, `.pl-excel-btn` /
   `.vb-filtro-check`, `.vb-filtro-btn`) — permite que el navegador SÍ los encoja por debajo de su
   ancho de contenido, en vez de forzar el desborde. Aplica siempre, no solo en móvil.
2. Dentro del `@media (max-width: 576px)` ya existente en ambos componentes: se baja el
   `font-size`/`padding` y se cambia `white-space: nowrap` → `white-space: normal` — un label que
   de plano no entrena en una sola línea se envuelve a 2 líneas **dentro de su propia pastilla**,
   en vez de desbordar el layout. Así las 8 opciones siempre son visibles y completas, sin scroll
   lateral ni texto cortado, aunque alguna quede en 2 renglones dentro de su pill.

**Archivos modificados:**
- `src/app/productos/producto/all/all.component.scss`
- `src/app/variante/buscar/buscar.component.scss`

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX FILTROS ADMIN — 4 COLUMNAS EN PC, 1 COLUMNA EN MÓVIL (2026-07-21)

**Síntoma:** tras el fix anterior (min-width:0 + wrap en móvil), los 8 filtros admin
(`productos/buscar` y `variantes/buscar`) quedaban en **2 columnas siempre** — en PC se veían
4 filas muy estiradas y separadas en vez de agruparse.

**Fix:**
- **PC (por defecto, `.pl-filtros`/`.vb-filtros`):** `grid-template-columns: repeat(2, 1fr)` →
  `repeat(4, 1fr)`. Con los 8 filtros (con/sin stock, con/sin imágenes, habilitados/no
  habilitados, código generado/real) quedan exactas **2 filas de 4**.
- **Móvil (`@media max-width: 576px`):** `repeat(2, 1fr)` → `1fr` (una sola columna) — cada
  filtro ocupa toda la fila, texto alineado a la izquierda (`text-align: left`,
  `justify-content: flex-start`) en vez de centrado, como una lista. Ya no hace falta apretar
  el texto a 2 líneas dentro de una pill angosta — con el ancho completo el label cabe en una
  línea sin problema.

**Archivos modificados:**
- `src/app/productos/producto/all/all.component.scss` → `.pl-filtros` (base + media 576px)
- `src/app/variante/buscar/buscar.component.scss` → `.vb-filtros` (base + media 576px)

**Verificado con `ng build --configuration=development` sin errores.**

---

## FIX DOC — CAMBIOS_FRONT.md: SECCIONES 2026-07-21 FUERA DE ORDEN CRONOLÓGICO (2026-07-21)

**Síntoma:** dos secciones nuevas (`Fix habilitado` + `Nuevo codigoGenerado`, ambas 2026-07-21)
habían quedado insertadas **en medio** del documento, intercaladas entre contenido de 2026-07-07,
en vez de al final donde ya vivía el resto de "Carga rápida de imágenes" (2026-07-20) y sus 3
bugs corregidos (también 2026-07-21). No era duplicación literal (0 encabezados repetidos,
verificado con grep) — era desorden: alguien pegó el bloque nuevo a mitad del archivo en vez de
al final.

**Fix:** se movieron esas 2 secciones (antes en la línea ~5036) al final del documento, justo
después de los 3 "Bug corregido" de carga rápida de imágenes — mismo día, mismo tema (el filtro
`codigoGenerado` es directamente para encontrar los borradores de carga rápida). Sin pérdida de
contenido: mismo total de 6428 líneas, solo reordenado.

**Verificado:** `grep -c "^## "` antes y después da el mismo número de encabezados, ninguno
duplicado ni faltante.

---

## NOTA BACK — NUNCA USAR `save`/`update` SOBRE UN BORRADOR DE CARGA RÁPIDA (2026-07-21)

**Confirmado por el back tras probar en QA:** `POST /v1/productos/save` y `PUT /v1/productos/update`
localizan el producto a tocar **por coincidencia exacta de código de barras**, nunca por `id` — es
un upsert pensado para alta/edición manual (donde el producto ya nace con su código real). Si se le
manda el código real de un borrador de carga rápida (que todavía no existe en la BD, porque el
borrador sigue con el `BRD-XXXXXXXXXXXX` autogenerado), el backend concluye "código nuevo" y
**crea un producto duplicado**, dejando el borrador original intacto y huérfano.

**Ya cumplido en el front:** `carga-imagenes.component.ts` / `carga-imagenes.service.ts` solo usan
`PUT /v1/carga-imagenes/{productoId}/completar` para guardar — nunca `save`/`update`. Verificado
con grep, no hace falta ningún cambio de código.

**Regla a futuro:** si se construye OTRA pantalla que edite un producto y ese producto puede venir
de carga rápida (`codigoBarrasGenerado: true`), esa pantalla debe seguir usando `/completar` hasta
que el código ya sea real. Nunca asumir que "editar producto" siempre es `save`/`update` sin antes
revisar ese flag.

---

## FIX PRODUCTOS/EDITAR — DUPLICABA EL PRODUCTO EN VEZ DE ACTUALIZARLO (2026-07-21)

**Síntoma reportado:** al editar un producto normal (no un borrador de carga rápida) y guardar,
en vez de actualizarlo se creaba un producto NUEVO con los datos editados — el producto original
se quedaba intacto, sin los cambios.

**Causa raíz (confirmada por el back en `CAMBIOS_FRONT.md`):** `AddComponent.guardar()` se usa
tanto para crear como para editar (`esActualizar` solo cambia el mensaje/navegación) y **siempre**
llama a `POST /v1/productos/save` — nunca a `PUT /v1/productos/update`. Pero además el back
confirmó que **ambos endpoints comparten la misma lógica interna** (`saveProductoLote()`): buscan
el producto a tocar **por código de barras exacto, nunca por `id`**. Si el código que se envía no
coincide con el guardado en BD, el backend concluye "esto es nuevo" y crea un producto duplicado.

**Bug concreto encontrado en el front que podía disparar esto:** `cargarProductoUpdate()` hace
un solo `patchValue()` con todos los campos, incluido `sinCodigoBarra`. Angular emite
`valueChanges` en **cada** `patchValue`, incluso si el valor no cambia. El listener de
`sinCodigoBarra` (`initCodigoBarra()`) generaba un código de barras **aleatorio nuevo** cada vez
que `sinCodigoBarra` quedaba en `true` — y eso pasaba automáticamente si el producto cargado no
traía código, sin que el admin tocara nada. Al guardar, ese código recién inventado nunca existe
en BD → producto duplicado garantizado para cualquier producto sin código de barras que se
edite.

**Fix aplicado — dos capas, `add.component.ts`:**
1. **Cerrar el mecanismo de auto-generación en carga:** nuevo flag `cargandoDesdeUpdate`, en
   `true` solo durante el `patchValue()` de `cargarProductoUpdate()`. El listener de
   `sinCodigoBarra` ya NO genera un código nuevo mientras ese flag está activo — sigue
   gestionando los validadores igual que antes (para que el form no quede en estado inválido),
   solo deja de inventar un código. La auto-generación real (toggle "Generar código automático")
   sigue funcionando igual cuando el admin lo activa a propósito.
2. **Guarda genérica antes de guardar (cubre cualquier otra causa, no solo la de arriba):** se
   captura `codigoBarrasOriginal` al cargar el producto para editar. En `guardar()`, si el código
   que se va a enviar es distinto al original, se muestra un Swal explicando el riesgo ("esto crea
   un producto duplicado, el original se queda igual") y pide confirmación explícita antes de
   llamar al backend. La lógica de armar el request y llamar `saveProducto()` se extrajo a
   `ejecutarGuardar()`, invocada directo si el código no cambió, o tras confirmar el Swal si sí
   cambió.
3. Se agregó `extraerCodigo()` — helper defensivo que lee el código de barras sea que llegue como
   string plano (lo que realmente manda la grilla, `IProductoDTO.codigoBarras: string`) o como
   objeto anidado (lo que declara el tipo `IProductoDTORec.codigoBarras: ICodigoBarra` — hay un
   mismatch de tipos entre ambos DTOs que el cast `as IProductoDTORec` en `UpdateComponent` no
   corrige en tiempo de ejecución). Evita quedar con `[object Object]` en el campo si algún día
   cambia la forma del DTO.

**Revisado — variantes NO tienen este riesgo:** `update-variante.component.ts` no usa
`save`/`update` por código de barras para nada — actualiza por `id` con un endpoint distinto.
Confirmado con grep, sin cambios necesarios ahí.

**Pendiente de fondo, es del backend:** mientras `/productos/save` y `/productos/update` sigan
matcheando por código de barras y no por `id`, el riesgo no desaparece del todo — la guarda del
front avisa y bloquea el caso obvio, pero no puede saber si el código en BD cambió por otra vía
mientras el admin tenía el formulario abierto. Ver nota completa en `CAMBIOS_FRONT.md`.

**Verificado con `ng build --configuration=development` sin errores.** ⚠️ No probado en vivo
contra el backend real — no se pudo reproducir el escenario exacto sin sesión de admin y datos
de prueba; la corrección se basa en el análisis del código y en lo que el back confirmó por
escrito.

---

## ACTUALIZACIÓN — EL BACK CORRIGIÓ LA CAUSA RAÍZ (2026-07-21, mismo día)

> Continuación directa de la sección anterior. El back no solo confirmó el bug — lo arregló.

**Qué cambió el back:** `guardarProducto()` (usado por `/productos/save` y `/productos/update`)
ahora busca el producto **por `id` primero**, si el front lo manda en el body. Si lo encuentra y
el código de barras viene distinto, crea el código nuevo, lo asigna a ESE producto y elimina el
código anterior (relación 1 a 1, no se pierde nada). Si el front **no manda `id`**, se mantiene
el comportamiento viejo (busca por código de barras) — para no romper la carga por Excel, que no
tiene ids.

**⚠️ Con una condición:** esto NO aplica a los borradores de carga rápida. `save`/`update` no
resetean `codigoBarrasGenerado` ni validan el estado de la imagen — completar un borrador por
esta vía lo deja en un estado inconsistente aunque técnicamente ya no se duplique. Para
borradores sigue siendo obligatorio `PUT /v1/carga-imagenes/{productoId}/completar`.

**Cambios aplicados en el front (`add.component.ts`), en respuesta al fix del back:**
1. **`ejecutarGuardar()` ahora manda `id`** en el body cuando `esActualizar === true`
   (`this.productoUpdate?.idProducto`) — es el requisito nuevo del back. En modo "Agregar" no se
   manda, el producto todavía no existe.
2. **`IProductoDTORec` ganó `idProducto?: number`** — en runtime siempre venía poblado (mismo
   campo que ya usa la grilla, `IProductoDTO.idProducto`), solo faltaba declararlo en el tipo
   para poder leerlo sin `any`.
3. **Se quitó la alerta de "esto crea un duplicado"** para productos normales — con `id` en el
   body ya no es cierto, y dejarla habría sido una alarma falsa cada vez que alguien corrige un
   código de barras a propósito (caso legítimo).
4. **Se agregó un bloqueo específico para borradores** (`esBorradorCargaRapida`, detecta el
   prefijo `BRD-`): si el código actual es autogenerado, la pantalla de editar producto **no deja
   guardar en absoluto** — muestra un aviso con botón directo a `/carga-imagenes`. No se ofrece
   "continuar de todas formas" porque, aunque no duplicaría, sí dejaría el producto en estado
   inconsistente (punto ⚠️ de arriba) — no hay ningún escenario válido para guardar un borrador
   desde esta pantalla.

**Archivos modificados:**
- `src/app/productos/producto/add/add.component.ts` → `guardar()`, `ejecutarGuardar()`,
  nuevo getter `esBorradorCargaRapida`
- `src/app/productos/producto/models/producto.dto.model.ts` → `IProductoDTORec.idProducto?`

**Verificado con `ng build --configuration=development` sin errores.** ⚠️ Sigue sin probarse en
vivo — depende de que el fix del back ya esté desplegado en el ambiente donde se pruebe.

---

## FIX CARGA RÁPIDA DE IMÁGENES — DELETE REAL + RECUPERACIÓN DE `EXITOSO` SIN COMPLETAR (2026-07-22)

> Respuesta del back a la "CONSULTA AL BACK" del 2026-07-21 (repo compartido
> `documentos_front_back_nodevedaades_jade/CAMBIOS_FRONT.md`, sección
> "✅ RESPUESTA DEL BACK a la consulta de arriba"). Cierra los 2 problemas reportados en vivo:
> el "✕" no borraba nada de verdad, y las tarjetas `EXITOSO` (listas para completar) se perdían
> de la vista al recargar o navegar fuera de `/carga-imagenes`.

### 1. `quitarTarjeta()` ahora borra de verdad, con confirmación

**Antes:** solo hacía `this.tarjetas = this.tarjetas.filter(...)` — sacaba la tarjeta de la
vista pero el producto+variante+imagen seguían vivos en la base con `estadoImagen: FALLIDO`. La
siguiente vez que se recargaba la pantalla, `GET /fallidas` la volvía a traer — "resucitaba".

**Ahora:** llama al nuevo `DELETE /v1/carga-imagenes/{productoId}`
(`CargaImagenesService.descartar()`), que sí borra producto + variante + imagen (local + intenta
borrar también en el micro 9096, best-effort). Como pasó de ser una acción cosmética a una
permanente, se agregó un `Swal` de confirmación antes de llamar al endpoint. Si el back responde
`400` (el producto ya tiene código de barras real — protección para no borrar algo ya
completado), se muestra el mensaje del back en un Swal de error y la tarjeta se queda tal cual.

### 2. `ngOnInit()` ya no pierde los `EXITOSO` sin completar

**Antes:** solo llamaba `GET /fallidas` — únicamente traía los borradores con imagen `FALLIDO`.
Un borrador `EXITOSO` (imagen subida, esperando "Completar datos") solo vivía en el estado del
componente Angular; al salir de la pantalla o recargar, desaparecía de la vista aunque el
producto siguiera en la base, deshabilitado, con su imagen ya lista — exactamente el caso real
confirmado en QA que motivó la consulta al back.

**Ahora:** `ngOnInit()` llama a `cargarPendientes()`, que combina las dos llamadas que el back
confirmó que ya alcanzan (no hizo falta ningún endpoint nuevo para esto):
1. `ProductoService.adminFiltrar({ codigoGenerado: true, habilitado: false }, 1, 100)` — trae
   TODOS los productos que siguen siendo borrador de carga rápida, sin importar el estado de su
   imagen.
2. Con los `idProducto` de esa respuesta, `CargaImagenesService.estado(ids)` — clasifica cada uno
   por `estadoImagen` (`PENDIENTE`/`EXITOSO`/`FALLIDO`) y arranca el polling si alguno sigue
   `PENDIENTE`.

`CargaImagenesService.fallidas()` se eliminó del servicio — quedó sin ningún componente que lo
llamara (confirmado con grep) y el back recomendó explícitamente dejar de usarlo a favor del
combo de arriba.

**Archivos modificados:**
- `src/app/carga-imagenes/service/carga-imagenes.service.ts` → quita `fallidas()`, agrega
  `descartar(productoId)` (`DELETE`)
- `src/app/carga-imagenes/carga-imagenes.component.ts` → inyecta `ProductoService`;
  `ngOnInit()` → `cargarPendientes()` (combo `adminFiltrar` + `estado`); `quitarTarjeta()` con
  `Swal` de confirmación + llamada real al backend

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — requiere sesión de admin y borradores reales en el ambiente donde se
pruebe. Pendiente: sincronizar esta respuesta del back hacia el `CAMBIOS_FRONT.md` de este
proyecto cuando el usuario confirme que ya se terminó la ronda de revisión (ver regla de
sincronización más arriba).

---

## FIX MIS-PEDIDOS — COBRAR CRÉDITO REDIRIGE A ABONO + HISTORIAL DE PAGOS EN DETALLE (2026-07-22)

> De la ronda de revisión de `/pedidos` y `/pedidos/mis-pedidos` documentada en el repo compartido
> (`documentos_front_back_nodevedaades_jade/CAMBIOS_FRONT.md`, sección "❓ CONSULTA AL BACK —
> mis-pedidos..."). Estos 2 puntos no dependían del back — se implementaron directo; los otros 3
> (cancelar sin afectar rifa, cliente sin registro duplicado, detalle vacío sin imagen) siguen
> pendientes de respuesta del back.

### 1. "Cobrar" en un pedido APARTADO/FIADO ya no manda el 404 de "se liquida por abonos"

**Síntoma reportado:** el botón "Cobrar" de la card en `mis-pedidos` abría el diálogo de
"Confirmar cobro" para CUALQUIER pedido, sin importar su tipo. Al confirmar un pedido FIADO, el
back rechazaba con `PUT /v1/pedidos/confirmar/{id}` → 404
`"Los pedidos de tipo FIADO se liquidan mediante abonos, no por esta vía"`.

**Causa:** `cobrarAdmin()` nunca revisaba `item.pedido.tipoPedido` antes de abrir el diálogo — ese
diálogo (dropdown de forma de pago + terminal MP) es exclusivamente para ventas `NORMAL`.

**Fix:** `cobrarAdmin()` ahora revisa el tipo primero. Si es `APARTADO`/`FIADO`, en vez de abrir el
diálogo muestra un Swal informativo ("Este pedido se cobra registrando un abono, no desde este
botón") con un botón "Ir al detalle para registrar abono" → llama `irDetalle(item)`, que ya
muestra `detalle-pedido` con su formulario de abono (`registrarAbono()`, mismo endpoint
`POST /v1/abonos/{pedidoId}` que usa `/abonos`). Ningún endpoint nuevo — es el mismo flujo que ya
existía, solo se dejó de esconder detrás de un botón que no aplicaba.

### 2. Historial de pagos visible en el Detalle del pedido (crédito)

**Antes:** `detalle-pedido` solo tenía el formulario para registrar un abono NUEVO — no había
forma de ver los pagos que ya se habían hecho sin ir a `/abonos` a buscar el pedido.

**Fix:** se agregó una sección "📋 Pagos registrados" arriba del formulario, dentro de
`.dp-abono-wrap` (visible solo si `esCredito` y hay al menos un abono). **No hizo falta ninguna
llamada nueva** — `PedidoDetalleResponse.abonos?: AbonoDetalleItem[]`
(`GET /v1/pedidos/{id}/detalle`, ya usado por esta pantalla) ya traía el arreglo completo de
abonos, solo no se estaba pintando.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `cobrarAdmin()`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` → sección
  `.dp-abono-historial` dentro de `.dp-abono-wrap`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.scss` → `.dp-abono-historial` +
  variantes

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo.

---

## FEAT — MOTIVO `ERROR_ADMIN` AL CANCELAR + VERIFICACIÓN DE CORREO EN CLIENTE SIN REGISTRO (2026-07-22)

> Respuesta del back a la consulta de la sesión anterior, revisada en el repo compartido
> (`documentos_front_back_nodevedaades_jade/CAMBIOS_FRONT.md`). Cierra las 3 preguntas abiertas
> de la consulta "mis-pedidos: cancelar sin afectar rifa, cobrar créditos, cliente sin registro
> duplicado" — más un feature nuevo completo que salió de esa misma conversación.

### 1. Motivo `ERROR_ADMIN` al cancelar un pedido — sin cambios de back

El back confirmó: `motivo` es texto libre, y el score de la rifa **solo** penaliza cuando el
valor es `TIMEOUT` o `NO_SE_PRESENTO`. Cualquier otro texto (como `ERROR_ADMIN`) ya no penaliza
al cliente, sin que el back tuviera que agregar nada. Se agregó la tercera opción al `input:
'radio'` de `cancelarPedido()` en `mis-pedidos.component.ts`.

### 2. Cliente sin registro duplicado — confirmado que NO hay riesgo

El back revisó el código: el import de participantes de rifa usa el **id de la fila** en
`clientes_sin_registro`, no el nombre — dos personas con el mismo nombre generan filas
independientes, sin fusión ni descarte por duplicado. No requirió ningún cambio.

### 3. Detalle de pedido sin imagen — confirmado que no puede fallar por eso

`GET /v1/pedidos/{id}/detalle` no llama a ningún servicio de imágenes — el DTO no tiene ese
campo. Si en vivo se ve "sin productos", es por otra causa (recordar: ya se mejoró el manejo de
error silencioso en esa pantalla en la sesión anterior).

### 4. 🆕 Verificación de correo para "cliente sin registro" + elegibilidad de rifa

De la pregunta 2 salió un feature bastante más grande: el back detectó que, para que un cliente
sin registro cuente para la rifa del mes, ahora exige que su **correo esté verificado** (con
código de 6 dígitos, mismo patrón que `Cliente`) **o** que haya dado **teléfono** (no verificable
— no hay SMS/OTP en el proyecto, así que ahí basta con que no venga vacío). Si no cumple ninguna
de las dos, el pedido se guarda igual (para reportes) pero no participa en esa rifa.

**Antes:** el modal "Agregar cliente sin registro" en `venta-directa` solo guardaba el
formulario en memoria — nunca llamaba al back hasta el final, junto con el `POST /v1/ventas/save`
de la venta completa. No había forma de verificar nada antes de cobrar.

**Ahora — 3 endpoints nuevos, flujo de 2 pasos dentro del mismo modal:**

| Endpoint | Método | Cuándo |
|---|---|---|
| `/v1/clientes-sin-registro` | POST | Al confirmar el formulario (antes solo quedaba en memoria) |
| `/v1/clientes-sin-registro/{id}/enviar-codigo` | POST | Botón "✉️ Enviar código de verificación" |
| `/v1/clientes-sin-registro/{id}/verificar-codigo` | POST `{codigo}` | Botón "Verificar" |

**Paso 1 (formulario, sin cambio visual):** al enviar, ahora sí crea el registro real en el back
(antes era solo `this.clienteSinRegistroModal = this.clienteForm.value`). Si el cliente dio
correo y no viene ya verificado → pasa al Paso 2 dentro del mismo modal. Si no dio correo → cierra
directo, como antes.

**Paso 2 (nuevo, solo si hay correo sin verificar):** botón para enviar el código, campo para
capturarlo + "Verificar", badge "✅ Correo verificado" al lograrlo. El admin puede omitir este
paso en cualquier momento (botón "Omitir y continuar", o cerrando el modal con ✕) — el registro
ya existe en el back con `correoVerificado=false`, la venta se genera igual, solo que ese cliente
no contará para la rifa salvo que haya dado teléfono.

**`POST /v1/ventas/save`:** ahora manda `clienteSinRegistroId` (el `id` ya creado en el paso 1)
en vez de `clienteSinRegistroDto` embebido. El campo DTO se queda en el modelo por compatibilidad
del back, pero este componente ya no lo usa.

**Chip del cliente en pantalla:** ahora muestra el mismo badge ✅/⚠️ que ya usaba el cliente
registrado, según `clienteSinRegistroCorreoVerificado`.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → tercera opción `ERROR_ADMIN` en
  `cancelarPedido()`
- `src/app/variante/service/variante.service.ts` → `crearClienteSinRegistro()`,
  `enviarCodigoClienteSinRegistro()`, `verificarCodigoClienteSinRegistro()`,
  `IClienteSinRegistroCreado`, `IVentaDirectaRequest.clienteSinRegistroId?`
- `src/app/variante/venta-directa/venta-directa.component.ts` → estado de los 2 pasos,
  `guardarClienteSinRegistro()` (reemplaza `obtenerDatosClienteSinRegistro()`),
  `enviarCodigoCSR()`, `verificarCodigoCSR()`, `finalizarModalClienteSinRegistro()`,
  `closeModalModalSinRegistro()` con lógica de "ya se creó, cerrar = omitir", `ejecutarVenta()`
  manda `clienteSinRegistroId`
- `src/app/variante/venta-directa/venta-directa.component.html` → modal en 2 pasos, badge de
  verificación en el chip
- `src/app/variante/venta-directa/venta-directa.component.scss` → `.vd-error`, `.vd-verif-texto`,
  `.vd-verif-ok`, `.vd-modal__hint`, `.vd-modal__input--codigo`

**⚠️ Estado del back al momento de implementar esto:** el back reportó los endpoints
"implementados en dev, compila OK" y la migración SQL **ya corrida en dev, qa y prod** — pero no
confirmó explícitamente que el código ya esté commiteado/pusheado/desplegado. Si al probar en QA
estos 3 endpoints nuevos dan 404, es cuestión de desplegar el back, no un bug del front.

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — depende de que el back esté desplegado en el ambiente de prueba.

---

## FIX — "COBRAR" CRÉDITO MANDA A `/ABONOS` (NO AL DETALLE) + "FIADO" → "IR PAGANDO" EN /ABONOS + TICKET SOLO CON PAGO (2026-07-22)

> Reportado en vivo tras probar el fix anterior de "Cobrar crédito redirige a abono": el redirect
> a `detalle-pedido` no era lo que se pedía — se esperaba ir directo a **Créditos / Abonos**
> (`/abonos`), a la card exacta. Además `/abonos` seguía diciendo "Fiado" en 3 lugares (la
> renombrada a "Ir pagando" de julio solo tocó `venta-variante`, no `abonos.component.html`), y
> se pidió que imprimir/enviar ticket no esté disponible hasta que el pedido tenga algún pago.

### 1. "Cobrar" en `mis-pedidos` ahora manda a `/abonos?pedidoId=N`, no al detalle

`cobrarAdmin()` en `mis-pedidos.component.ts`: el botón "Ir a Créditos / Abonos" del Swal ahora
navega con `router.navigate(['/abonos'], { queryParams: { pedidoId } })` en vez de
`irDetalle(item)`.

**`AbonosComponent`** lee ese query param una sola vez al iniciar (`route.queryParams.pipe(take(1))`)
y se lo pasa a `cargarCuenta(pedidoIdAbrir)`: en cuanto llega la lista de `estadoCuenta`, busca el
pedido por `pedidoId` y llama `abrirModal()` automáticamente — el admin llega y ya tiene el
formulario de abono abierto, sin tener que buscar la card a mano. Si el pedido no aparece ahí
(ya liquidado o cancelado), muestra un aviso en vez de fallar en silencio.

### 2. "Fiado" → "Ir pagando" en `/abonos` (se había quedado fuera del rename de julio)

3 badges (`ec.tipoPedido`/`p.tipoPedido`/`c.tipoPedido` === 'FIADO') decían "🤝 Fiado" — ahora
dicen "💳 Ir pagando" (mismo ícono que ya se usa en `mis-pedidos`/`detalle-pedido`). El subtítulo
del header ("Gestión de apartados y fiados") y el título del Swal de cancelar
("¿Cancelar el fiado de X?") también se corrigieron. Las clases CSS (`ab-badge--fiado`,
variable `esFiado`) se dejaron igual — son identificadores internos, no texto visible.

### 3. Imprimir/enviar ticket ya no se puede antes de que haya algún pago

**Antes:** en `mis-pedidos` y `detalle-pedido`, los botones 🖨️/📧 estaban siempre habilitados,
sin importar si el pedido normal seguía "Pendiente" (nadie ha cobrado/recogido) o si un crédito
todavía no tenía ni un abono.

**`detalle-pedido`** (tiene el detalle completo cargado, `this.detalle.abonos` incluido): nuevo
getter `puedeGenerarTicket` — para NORMAL exige `estado_pedido === 'Entregado'`; para crédito
exige `estadoPedido === 'PAGADO'` **o** al menos un abono en `detalle.abonos`. Los 2 botones usan
`[disabled]="!puedeGenerarTicket"` + `title` explicando por qué.

**`mis-pedidos`** (la card de la lista NO trae info de abonos — solo `tipoPedido`/`estado_pedido`):
- Para NORMAL sí se puede pre-deshabilitar con lo que ya hay en la lista → `puedeGenerarTicket(item)`
  usa `estado_pedido === 'Entregado'`.
- Para crédito **no hay forma de saber si ya tiene abonos sin pedir el detalle** — se deja el botón
  habilitado, pero `imprimirTicketPedido()`/`enviarCorreoPedido()` ahora piden el detalle primero
  (ya lo hacían) y, antes de continuar, llaman `puedeImprimir(d)` — si el crédito no tiene ni un
  abono, corta con un aviso ("Todavía no hay ningún pago") en vez de generar el ticket.

**Limitación conocida (anotada en el repo compartido):** el botón de un crédito sin abonos se ve
igual de habilitado que uno con abonos en `mis-pedidos` — la protección real ocurre al hacer clic,
no antes. Para que se vea deshabilitado de entrada (como en `detalle-pedido`) haría falta que el
endpoint de lista incluya algo como `tienePagos`/`totalPagado` — se dejó como pregunta al back, no
bloqueante.

### 🔎 Investigado y no reproducido: "se agregó 2 veces Apartado"

Se revisó `mis-pedidos.component.html`, `.ts`, y `abonos.component.html`/`.ts` completos — un solo
badge `📦 Apartado` por card en cada pantalla, sin ningún `content:`/duplicado en el SCSS que lo
repita. No se encontró la causa en el código. Si se sigue viendo, hace falta una captura o decir
en qué pantalla exacta aparece duplicado — podría ser un problema de datos (el mismo pedido
llegando 2 veces en la respuesta del back, o un doble `push` por scroll) más que de plantilla.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `cobrarAdmin()` navega a `/abonos`;
  `puedeGenerarTicket()`, `puedeImprimir()`, guard en `imprimirTicketPedido()`/`enviarCorreoPedido()`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → `[disabled]`/`[title]` en los 2 botones
- `src/app/abonos/abonos.component.ts` → `ActivatedRoute`, `cargarCuenta(pedidoIdAbrir?)`, texto
  del Swal de cancelar
- `src/app/abonos/abonos.component.html` → "Ir pagando" en vez de "Fiado" (3 badges + subtítulo)
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → getter `puedeGenerarTicket`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` → `[disabled]`/`[title]` en los
  2 botones

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo.

---

## FIX INFRA — NGINX SIN `Cache-Control` → EXPLICA TODOS LOS "NO SE VE EL CAMBIO EN QA" (2026-07-22)

> Causa raíz real, encontrada al investigar por qué "Cobrar" en un pedido APARTADO seguía
> mostrando el diálogo viejo en `qa.shop.novedades-jade.com.mx` aunque se verificó con evidencia
> que: (a) el código estaba bien y committeado en `dev`/`qa`, (b) el pipeline CI/CD había
> desplegado con éxito, y (c) el bundle real servido por el dominio (`647.fe48259a21561074.js`,
> descargado directo con `curl` y grepeado) SÍ contenía el texto nuevo ("registrando un abono",
> "Ir pagando", "Todavía no hay ningún pago"). Con el código, el deploy y el bundle en el
> servidor confirmados correctos, lo único que quedaba era el navegador — y ahí apareció el bug
> real, no en nuestro código.

**Causa raíz:** `default.conf` (nginx dentro del contenedor, copiado por el `Dockerfile` tanto
para `qa` como para `master`/producción — mismo archivo, un solo `server{}` sin distinción de
rutas) no mandaba **ningún** header `Cache-Control` — ni en `index.html` ni en los bundles
hasheados (`main.*.js`, `647.*.js`, etc.). Confirmado con `curl -D -` contra el dominio real: cero
líneas `Cache-Control` en la respuesta.

Sin ese header, el navegador aplica **cacheo heurístico** (RFC 7234) basado en `Last-Modified` —
Chrome/Firefox pueden decidir que `index.html` sigue "fresco" por horas **sin hacer ninguna
petición de red**, ni siquiera una condicional. Un F5 normal puede servir 100% desde el disco
local sin tocar el servidor — solo un hard-refresh (Ctrl+Shift+R) o "Disable cache" en DevTools
fuerza la revalidación. Esto explica, retroactivamente, **todas** las veces en el historial de
este proyecto que se reportó "ya subiste el cambio pero en QA no se ve" y la causa terminaba
siendo "hard refresh" — no era casualidad ni un capricho del navegador del usuario, era que el
servidor nunca le decía al navegador que dejara de confiar en su copia vieja.

**Fix — separar la política de caché por tipo de archivo:**
```nginx
location ~* \.(?:js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp)$ {
  try_files $uri =404;
  add_header Cache-Control "public, max-age=31536000, immutable";
}

location / {
  try_files $uri /index.html;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
}
```
- **Assets hasheados** (`main.<hash>.js`, `647.<hash>.js`, `styles.<hash>.css`, etc.) → caché
  agresivo de 1 año + `immutable`. Es seguro: Angular cambia el hash del nombre de archivo cada
  vez que el contenido cambia, así que un archivo con un nombre dado NUNCA cambia de contenido —
  cachearlo para siempre no tiene downside y acelera cargas repetidas.
- **`index.html`** (y cualquier ruta que caiga al fallback SPA, ej. `/pedidos/mis-pedidos`) →
  `no-cache, no-store, must-revalidate`. Es el único archivo que DEBE revisarse en cada carga,
  porque es el que apunta a los nombres de archivo hasheados — si se cachea, el navegador puede
  quedarse pidiendo bundles viejos indefinidamente aunque esos bundles viejos ya ni siquiera
  sigan en el servidor.

**Aplica a QA y a producción por igual** — un solo `default.conf`, un solo `Dockerfile` para
ambos workflows (`producto-actions-qa.yml` y `proyecto-front-actions.yml`).

**Regla a futuro:** si se vuelve a reportar "ya subí el cambio pero no se ve", el primer paso ya
NO es asumir hard-refresh del usuario — con este fix, index.html ya fuerza revalidación en cada
carga. Si el síntoma reaparece, sospechar primero de: CDN/proxy externo que sí cachee (Cloudflare
u otro, si se agrega en el futuro) antes que del navegador.

**Archivos modificados:**
- `default.conf` → 2 bloques `location` con `Cache-Control` diferenciado

**Verificación pendiente:** este cambio no pasa por `ng build` (es config de nginx, no de
Angular) — se valida en el próximo deploy revisando con `curl -D -` que las respuestas ya
incluyan `Cache-Control`. No requiere nada del backend.

**⚠️ PENDIENTE DE CONFIRMAR — desplegado pero el usuario sigue sin ver el cambio en su navegador
(2026-07-22, mismo día).** Confirmado con `curl -D -` en vivo que el servidor YA manda los
headers nuevos (`index.html` → `no-cache, no-store, must-revalidate`; `main.<hash>.js` →
`public, max-age=31536000, immutable`) — el deploy en sí está bien. Pero el usuario probó pedido
#89 después de esto y "sigue igual" (el diálogo viejo de cobro, sin el Swal de redirección a
`/abonos`).

**Explicación más probable:** el fix de `Cache-Control` evita que el problema se repita **hacia
adelante**, pero NO invalida retroactivamente lo que el navegador ya tenía guardado en caché
**antes** de que el header existiera — esa copia vieja de `index.html` fue guardada sin ninguna
instrucción de `Cache-Control` (el estado de antes del fix), así que el navegador la sigue
tratando como "fresca" por su propia cuenta (heurística) durante un rato más, sin saber que el
servidor ya cambió de política. Un solo hard-refresh (Ctrl+Shift+R) o probar en incógnito debería
saltarse esa copia vieja una vez — de ahí en adelante, con el header ya puesto, no debería volver
a pasar.

**No confirmado todavía si el usuario ya probó con hard-refresh/incógnito DESPUÉS de este deploy
específico** (sí lo había probado antes, contra el deploy anterior sin el fix de nginx). El
usuario decidió dejarlo reposar un tiempo antes de volver a probar, en vez de seguir
diagnosticando en el momento — retomar cuando lo pida.

**Si al reintentar con hard-refresh sigue sin verse:** ahí sí buscar otra causa (CDN externo,
Service Worker instalado en su navegador que Angular no debería tener pero conviene descartar
con `chrome://serviceworker-internals` o Application → Service Workers en DevTools, o que esté
probando contra una URL/pestaña distinta a la que cree).

**Más síntomas reportados el mismo día, misma sospecha (2026-07-22):** el usuario también
reporta que en el **detalle** del pedido sigue apareciendo "Apartado" dos veces, y que al pasar
el mouse sobre los íconos de imprimir ticket / enviar correo no aparece el tooltip de aviso
("Primero hay que cobrar/recoger el pedido..."). Revisado el código de nuevo
(`detalle-pedido.component.ts` líneas 52-79) — **la lógica ya está bien**: `estadoPedidoLabel`
devuelve "Por cobrar"/"Pagado" en vez del `estadoPedido` crudo cuando `esCredito`, y los botones
de imprimir/reenviar en `detalle-pedido.component.html` (líneas 25-34) ya tienen `[title]`
condicional con ese texto. No hay nada que arreglar en el código — es el mismo síntoma que
"Cobrar" no redirige: consistente con que sigue viendo la copia vieja cacheada por el navegador
de antes del fix de nginx. No se toca código de nuevo hasta que el usuario confirme si persiste
después de un hard-refresh real.

---

## FIX — ENCONTRADO EL "2 VECES APARTADO" (badge de tipo + badge de estado repetidos) (2026-07-22)

> Resuelve la sección de arriba "🔎 Investigado y no reproducido" — el usuario mandó el texto
> exacto que veía en `detalle-pedido`: `📦 Apartado` seguido, en la misma cabecera, de `APARTADO`
> en mayúsculas. Ahí estaba: no era un pedido duplicado, era el badge de tipo Y el badge de
> **estado** mostrando prácticamente lo mismo.

**Causa:** para pedidos a crédito, el back guarda `estado_pedido`/`estadoPedido` = `'APARTADO'` o
`'FIADO'` (el mismo valor que `tipoPedido`) hasta que se liquidan — recién ahí cambia a
`'PAGADO'`. El badge de **estado** (`detalle-header__estado` en detalle, `estado-badge` en la
card de `mis-pedidos`) simplemente interpolaba ese valor crudo — para un Apartado sin pagar,
mostraba literal "APARTADO" justo debajo/al lado del badge de **tipo** que ya dice "📦 Apartado".
Mismo bug en las dos pantallas.

**Fix:** para crédito, el badge de estado ya NO muestra el valor crudo — muestra el estado de
pago real: **"Por cobrar"** (aún no hay nada pagado) o **"Pagado"** (`estadoPedido === 'PAGADO'`).
NORMAL/Cancelado no cambian, siguen mostrando `estado_pedido` tal cual.

- `detalle-pedido.component.ts` → nuevo getter `estadoPedidoLabel`
- `mis-pedidos.component.ts` → nuevo método `estadoBadge(item)` (devuelve ícono + texto juntos,
  reemplaza el `[ngClass]` inline que tenía el HTML)

**Archivos modificados:**
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → `estadoPedidoLabel`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` → usa `estadoPedidoLabel`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `estadoBadge()`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → usa `estadoBadge(item)`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo.

---

## FIX — MOTIVO DE CANCELACIÓN: BOTONES EN VEZ DE RADIO/TEXTO LIBRE (2026-07-22)

> El usuario reportó que el motivo de cancelación en `/abonos` era un `<input>` de texto libre
> (opcional), mientras que en `mis-pedidos` era un `input:'radio'` nativo de SweetAlert2 (se ve
> como checklist feo) — pidió unificar ambas pantallas con la misma lista de motivos, pero sin
> que sea un radio/checkbox ni un `<select>` nativo — "algo más elegante".

**Fix:** nuevo util compartido `src/app/shared/motivo-cancelacion.util.ts` —
`motivoCancelacionSwalFragment()` genera un grupo de botones tipo "pill" (mismo lenguaje visual
que ya usa el proyecto para método de pago EFECTIVO/TRANSFERENCIA) para inyectar dentro de un
`Swal.fire({ html, didOpen, preConfirm })`. Usa variables CSS globales (`--app-accent`,
`--card-bg`, `--card-border`, `--app-accent-soft`) en vez de colores fijos — sí cascadean hasta
el DOM que SweetAlert2 inyecta en `document.body` (a diferencia de los estilos scoped de un
componente Angular), así que respeta dark/light automáticamente sin código extra.

**3 motivos, iguales en ambas pantallas:** "No se presentó" / "El cliente avisó" / "Error al
capturar (fue el admin, no el cliente)" — mismos valores literales `NO_SE_PRESENTO` /
`CLIENTE_AVISO` / `ERROR_ADMIN` que ya usaba `mis-pedidos`.

- `mis-pedidos.component.ts` → `cancelarPedido()` reemplaza `input:'radio'` + `inputOptions` por
  `motivoCancelacionSwalFragment()`. Mismo endpoint de siempre (`DELETE /v1/pedidos/delete/{id}
  ?motivo=...`), mismo comportamiento — solo cambió la UI.
- `abonos.component.ts` → `cancelarPedido()` reemplaza el `<input maxlength="30">` de texto libre
  por el mismo grupo de botones. **Cambio de comportamiento:** antes el motivo era opcional
  (podía dejarse vacío), ahora es una selección obligatoria de las 3 opciones — se perdió la
  posibilidad de escribir un motivo custom. Si se necesita, se puede agregar una 4ª opción "Otro"
  con texto libre condicional, pero no se hizo sin que el usuario lo pida.

**⚠️ Pendiente de confirmar con el back:** la nota de la Lección global sobre `motivo` (texto
libre, solo `TIMEOUT`/`NO_SE_PRESENTO` penalizan el score de rifa) se confirmó específicamente
para `DELETE /v1/pedidos/delete/{id}` (usado por `mis-pedidos`). El endpoint que usa `abonos`
(`PUT /v1/abonos/{pedidoId}/cancelar`) es **distinto** — no está confirmado si tiene la misma
semántica de scoring para `motivo`, o si siquiera usa ese campo para algo más que guardarlo como
texto. Anotado como pregunta en el repo compartido para que el back confirme.

**Archivos modificados:**
- `src/app/shared/motivo-cancelacion.util.ts` (nuevo)
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `cancelarPedido()`
- `src/app/abonos/abonos.component.ts` → `cancelarPedido()`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — pendiente además del hard-refresh por el bug de caché de nginx.

---

## FIX — "COBRAR" EN CRÉDITO SEGUÍA ABRIENDO EL DIÁLOGO NORMAL Y ERROREABA (2026-07-22)

> Confirmado en vivo en QA (con hard-refresh, así que no era el bug de caché de nginx): al dar
> "Cobrar" en un pedido APARTADO/FIADO desde `/pedidos`, seguía abriendo el diálogo normal de
> forma de pago — al confirmar, el back lo rechazaba (`PUT /v1/pedidos/confirmar/{id}` no acepta
> crédito) y el Swal de "Ir a Créditos / Abonos" nunca aparecía. Verifiqué antes que el bundle
> desplegado en QA sí traía el código de la sección anterior ("Cobrar" crédito redirige a
> abonos) — el código estaba bien, el problema era de **datos**, no de deploy.

**Causa raíz:** `cobrarAdmin()` decide el redirect según `item.pedido.tipoPedido`, que viene de
la **lista** (`GET /v1/pedidos/buscarClientePedido`). Revisando `CAMBIOS_FRONT.md`, el spec
original del módulo de crédito (2026-06-27) solo confirma `tipoPedido` en la respuesta de
`POST /savePedido`, `POST /ventas/save` y los reportes de `/abonos/reporte/*` — **nunca** en
`buscarClientePedido`/`findPedido` (la lista que arma `mis-pedidos`). Lo más probable es que ese
endpoint nunca lo haya mandado, así que `item.pedido.tipoPedido` llega `undefined` para pedidos
de crédito y la condición `=== 'APARTADO' || === 'FIADO'` nunca se cumple.

**Fix — dos capas, sin esperar confirmación del back:**

1. **Chequeo real contra el detalle, no la lista.** `cobrarAdmin()` ya no confía ciegamente en
   `item.pedido.tipoPedido` — solo lo usa como atajo optimista (si YA viene con el valor
   correcto, evita una llamada extra). Si no, pide `GET /v1/pedidos/{id}/detalle` primero
   (mismo endpoint que ya usan de forma confiable `imprimirTicketPedido()`/
   `enviarCorreoPedido()` para lo mismo) y decide con `PedidoDetalleResponse.tipoPedido`, que sí
   está confirmado en el spec. Solo si ese detalle falla (error de red) cae al diálogo normal
   como antes — para no bloquear el cobro de un pedido NORMAL por un problema de conectividad.
   Se extrajeron `irACobrarCredito()` y `abrirDialogoCobroNormal()` como métodos separados,
   reutilizados por las dos rutas (atajo optimista y confirmación por detalle).

2. **Red de seguridad en `confirmarCobro()`.** Si aun así el back rechaza el cobro (`error`
   callback de `updateService()`), y el mensaje de error contiene "abono"/"apartado"/"fiado"
   (case-insensitive), en vez del error genérico se ofrece el mismo Swal de "Ir a Créditos /
   Abonos" — cubre cualquier caso donde ni el atajo ni el detalle lo hayan detectado a tiempo.
   El error genérico ahora también muestra el mensaje real del back (antes era texto fijo sin
   `err?.error?.mensaje`).

**Pendiente de verificar con el back:** confirmar si `GET /v1/pedidos/buscarClientePedido` (y
`findPedido`) realmente no manda `tipoPedido`, o si el campo llega con otro nombre/formato — el
fix de arriba hace que el front funcione correctamente de cualquier forma, pero si el back lo
agrega ahí también se ahorra la llamada extra a `/detalle` en el caso más común.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `cobrarAdmin()` reescrito,
  `irACobrarCredito()`, `abrirDialogoCobroNormal()`, `confirmarCobro()` con fallback

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT — CANCELAR PEDIDOS YA ENTREGADOS/PAGADOS = DEVOLUCIÓN (2026-07-24)

> Respuesta del back del 2026-07-23 (repo compartido): ambos endpoints de cancelar
> (`DELETE /v1/pedidos/delete/{id}` y `PUT /v1/abonos/{pedidoId}/cancelar`) ya permiten cancelar
> un pedido en estado `Entregado`/`PAGADO` — antes lo bloqueaban por completo. Reglas nuevas:
> solo ADMIN puede hacerlo, el motivo no puede ser `NO_SE_PRESENTO`/`TIMEOUT` (el cliente sí
> cumplió, solo se devuelve el producto), el stock se regresa igual que una cancelación normal,
> y la venta asociada se marca `"Devuelta"` (se excluye de reportes de ingresos). Mismas URLs y
> shape de siempre — solo cambió qué estados aceptan y quién los puede llamar.

**No es solo "un botón" — son 2 pantallas distintas:**

1. **`mis-pedidos` (pedidos NORMAL entregados):** el botón "Cancelar" ya existía, solo estaba
   `[disabled]` cuando `estado_pedido === 'Entregado'`, sin importar el rol. Ahora:
   `[disabled]="!isAdminUser && estado_pedido === 'Entregado'"` — un cliente normal lo sigue
   viendo deshabilitado (con `[title]` explicando por qué), un admin lo puede usar.
   `cancelarPedido()`: si `estado_pedido === 'Entregado'`, arma el título como
   "¿Cancelar (devolución)...?" y filtra `NO_SE_PRESENTO` de las opciones de motivo.

2. **`/abonos` → pestaña "✅ Liquidados" (créditos ya PAGADOS):** acá **no existía ningún botón
   de cancelar** — se agregó de cero (`.ab-card__actions` con "✖ Cancelar" junto a "▼ Abonos").
   Como toda la ruta `/abonos` ya es admin-only (`AuthGuard + AdminGuardGuard`), no hace falta
   chequear el rol otra vez ahí. Nuevo método `cancelarPedidoPagado(pedido: PedidoPagado)` —
   mensaje "Ya se pagó por completo... Se devolverá el stock." (sin la rama "queda como deuda"
   que sí aplica en `EstadoCuenta`, porque un `PAGADO` no tiene deuda), mismo filtro sin
   `NO_SE_PRESENTO`.

**Refactor:** `abonos.component.ts` — la lógica común de `cancelarPedido()` (Swal, llamada al
back, ticket, refresco de listas) se extrajo a un privado `ejecutarCancelacion(opts)` con
`opcionesMotivo?` y `onListaRefrescar()` parametrizables, para no duplicarla entre
`cancelarPedido()` (Cuentas por cobrar) y `cancelarPedidoPagado()` (Liquidados).

**Decisión de UX (confirmada con el usuario):** para el motivo de esta "devolución" se reusan
las 2 opciones que ya existían (`CLIENTE_AVISO`/`ERROR_ADMIN`) — no se agregó una 3ª etiqueta
tipo "Devolución de producto".

**`motivo-cancelacion.util.ts`:** ya soportaba un parámetro `opciones` desde que se creó — no
necesitó cambios, solo se le empezó a pasar una lista filtrada en estos 2 casos nuevos.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `cancelarPedido()` con filtro de
  motivo + título condicional
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → `[disabled]`/`[title]` del botón
  Cancelar ahora considera `isAdminUser`
- `src/app/abonos/abonos.component.ts` → `ejecutarCancelacion()` (nuevo, privado),
  `cancelarPedido()` refactorizado para usarlo, nuevo `cancelarPedidoPagado()`
- `src/app/abonos/abonos.component.html` → botón "✖ Cancelar" en tab "Liquidados"

**Pendiente (fuera de este cambio, anotado para después):** revisando esto se encontró que
`detalle-pedido.component.ts` → `totalGeneral` lee `this.detalle.totalPedido`, un valor que se
trae UNA vez al cargar la pantalla y nunca se refresca tras `reducirCantidad()` — aunque el back
ya corrigió que `totalPedido` se recalcule bien server-side al quitar una línea
(`DELETE /v1/pedidos/{id}/detalle/{productoId}`), el front lo sigue mostrando desactualizado
hasta recargar. No corregido en este cambio — el usuario no lo pidió todavía.

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo.

---

## FIX + FEAT — TOTAL DESACTUALIZADO EN DETALLE + DATOS DE ENTREGA (nombreReceptor/dirección/fecha) (2026-07-24)

> Cierra los 3 puntos pendientes de la respuesta grande del back del 2026-07-23 (ver sección
> "FEAT — CANCELAR PEDIDOS YA ENTREGADOS/PAGADOS" arriba, apartado "Pendiente").

### 1. Fix — total desactualizado en `detalle-pedido` tras quitar una línea

`reducirCantidad()` solo actualizaba el `item` individual (`item.subTotal`) pero nunca
`this.detalle.totalPedido` — el total mostrado en el header (`totalGeneral`) se quedaba con el
valor de la carga inicial. El back ya corrigió su cálculo server-side, pero no sirve de nada si
el front no lo vuelve a pedir. En vez de recargar todo el detalle (perdería el estado de
`eliminando`, scroll, etc.), se recalcula localmente sumando los subtotales que quedan:

```typescript
if (this.detalle) {
  this.detalle.totalPedido = this.detalle.detalles.reduce((sum, d) => sum + d.subTotal, 0);
}
```

### 2. Feat — botón "📍 Entrega" en la card de `mis-pedidos` (no en el detalle)

Decisión del usuario: el punto de entrada para capturar/editar `nombreReceptor`,
`direccionEntrega`, `fechaEntrega` y `observaciones` va en la **card de la lista** (`mis-pedidos`),
no dentro de `detalle-pedido`. Nuevo botón "📍 Entrega" en el footer de cada card → abre un Swal
(mismo patrón ya usado en el proyecto para formularios cortos — motivo de cancelación, código de
verificación, etc.) con 4 campos, precargados desde `GET /{id}/detalle` si ya había algo
capturado. Al guardar, llama al endpoint nuevo del back:

```typescript
actualizarEntrega(pedidoId, body): Observable<ResponseGeneric<PedidoDetalleResponse>> {
  return this.http.put(`${this.url}/v1/pedidos/${pedidoId}/entrega`, body);
}
```

Deshabilitado (con `[title]` explicando por qué) cuando `estado_pedido === 'Cancelado'` — mismo
límite que impone el back. No requiere admin (cualquiera puede editar su propio pedido, según
confirmó el back).

### 3. Feat — campos de entrega en `venta-directa` al crear la venta

`nombreReceptor`, `direccionEntrega`, `fechaEntrega` — 3 campos nuevos opcionales, visibles
siempre que haya algo que cobrar (`lineas.length > 0 || tienePromos`), **no solo en crédito**.
Se mandan siempre en `POST /v1/ventas/save` junto con `observaciones`.

**Bonus del bug que el back arregló:** `observaciones` antes solo se mostraba/enviaba en la
sección de crédito del formulario — el back confirmó que antes ignoraba ese campo en venta al
**contado** sin importar lo que mandara el front, y ya lo arregló. Se movió el textarea de
"Observaciones" fuera del bloque `*ngIf="esCredito"` a la nueva sección de datos de entrega,
visible siempre, para aprovechar el fix.

### 4. Mostrar los datos de entrega en `detalle-pedido` (solo lectura)

El back ya los devuelve en `GET /v1/pedidos/{id}/detalle` — se agregó un panel "📍 Datos de
entrega" (solo si hay al menos un dato capturado) arriba del bloque de abonos. Sin botón de
editar ahí — la edición vive únicamente en la card de `mis-pedidos` (punto 2), por decisión
explícita del usuario.

**Nota técnica Angular:** dentro de un `*ngIf` con condición OR de accesos opcionales
(`detalle?.a || detalle?.b`), el compilador de Ivy NO narrowea `detalle` a non-null para los
`*ngIf` hijos — sigue pidiendo `?.`/chequeo explícito y tira `TS2531: Object is possibly 'null'`
si se usa `.` a secas. Hubo que escribir la condición como `detalle && (detalle.a || detalle.b)`
(con `&&` en vez de solo el OR de opcionales) para que el narrowing sí se propague a los `*ngIf`
internos sin necesitar `?.` en cada uno.

**Archivos modificados:**
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → `reducirCantidad()` recalcula
  `totalPedido`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` / `.scss` → panel `.dp-entrega`
  de solo lectura
- `src/app/pedidos/pedidos.service.ts` → `actualizarEntrega()`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `abrirInfoEntrega()`,
  `mostrarModalEntrega()` (privado)
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` / `.scss` → botón `.btn-entrega`
- `src/app/abonos/models/abono.model.ts` → `PedidoDetalleResponse` + `observaciones`,
  `nombreReceptor`, `direccionEntrega`, `fechaRecogida`
- `src/app/variante/service/variante.service.ts` → `IVentaDirectaRequest` + 3 campos
- `src/app/variante/venta-directa/venta-directa.component.ts` → campos `nombreReceptor`,
  `direccionEntrega`, `fechaEntrega`; `ejecutarVenta()` los manda siempre (no solo crédito)
- `src/app/variante/venta-directa/venta-directa.component.html` / `.scss` → sección
  `.vd-entrega`, observaciones movido fuera de `esCredito`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — depende de que el back haya corrido
`migration_pedido_datos_entrega.sql` en el ambiente donde se pruebe (según su propio doc,
pendiente al momento de escribir esto).

---

## FIX — STOCK VISIBLE NO BAJABA AL AGREGAR AL CARRITO (2026-07-24)

**Síntoma:** en `productos/buscar` y `variantes/buscar`, si un producto tiene 10 de stock y se
agrega 1 al carrito, el badge grande sigue diciendo "10 unidades" — solo un chip aparte
("🛒 1 en carrito") indica lo agregado, y el botón "Agregar" se deshabilita correctamente al
llegar al máximo, pero sin que el usuario entienda por qué (el número visible nunca bajó).

**No era una diferencia entre las 2 pantallas** — ambas ya tenían exactamente la misma lógica
(`cantidadEnCarrito(item) >= item.stock` para deshabilitar el botón), solo que el badge de
"unidades" siempre mostraba el stock crudo de la BD sin restar lo ya agregado.

**Fix:** nuevo método `stockDisponible(item)` en ambos componentes —
`Math.max(0, stock - cantidadEnCarrito(item))` — y el badge grande ahora usa ese valor en vez
del stock crudo. El chip "🛒 N en carrito (máx. X)" se deja igual (sigue mostrando el stock
total real como referencia, es información complementaria, no contradictoria).

**Archivos modificados:**
- `src/app/variante/buscar/buscar.component.ts` → `stockDisponible(v)`
- `src/app/variante/buscar/buscar.component.html` → badge usa `stockDisponible(v)`
- `src/app/productos/producto/all/all.component.ts` → `stockDisponible(producto)`
- `src/app/productos/producto/all/all.component.html` → badge usa `stockDisponible(item)`

---

## FEAT — CATÁLOGO "LUGARES DE ENTREGA" + LINK DE FACEBOOK POR PEDIDO (2026-07-24)

> Respuesta del back del 2026-07-24 (repo compartido). Nuevo catálogo CRUD `/v1/lugares-entrega`
> + campos `lugarEntregaId`/`urlFacebook` en `Pedido`, pensado para filtrar pedidos por zona en
> vez de texto libre, y para ubicar/contactar al cliente (sobre todo `ClienteSinRegistro`) vía
> Facebook. Van en el pedido, no en el cliente, mismo criterio que `nombreReceptor`/
> `direccionEntrega` (pueden variar de una compra a otra).

### 1. Catálogo nuevo — `src/app/lugares-entrega/`

Clon exacto del patrón ya usado para `palabras-clave` (mismo `pk-*` SCSS, mismo flujo
agregar/editar/eliminar inline): `LugarEntregaService` (`getAll`, `getOne`, `save`, `update`,
`delete`) + `GestionLugaresComponent`, módulo lazy en `/lugares-entrega` (`AdminGuardGuard`).
Link nuevo "📍 Lugares de entrega" en el navbar, junto a "🏷️ Categorías" dentro de Inventario.

⚠️ Único endpoint con shape distinto a `palabras-clave`: `getAll` de lugares devuelve
`{ data: { t: [...], pagina, totalPaginas, totalRegistros } }` (paginado, con `t`), mientras que
`palabras-clave/getAll` devuelve `{ data: [...] }` (array plano) — ajustado en el `pipe(map())`
del servicio.

### 2. Decisión de UX (confirmada con el usuario) — dos estilos de selector distintos

- **Elegir un lugar al crear/editar un pedido** (venta-directa, checkout del cliente, modal de
  "Entrega" en mis-pedidos): `<select>` simple poblado con `GET /getAll` — es elegir de un
  catálogo chico, no buscar.
- **Filtrar la lista de pedidos por lugar** (`mis-pedidos`, búsqueda): autocomplete tipo
  buscador — campo de texto que filtra localmente el catálogo ya cargado en memoria (no hay
  endpoint de búsqueda de lugares, y el catálogo es chico, así que filtrar client-side es
  suficiente) y despliega un dropdown con las coincidencias.

### 3. `venta-directa` — select "Lugar de entrega" + input "Link de Facebook"

Agregados a la sección `.vd-entrega` ya existente (junto a nombreReceptor/direccionEntrega/
fechaEntrega/observaciones de la sesión anterior). Se cargan los lugares en `ngOnInit()` y se
mandan siempre en `POST /v1/ventas/save` (`lugarEntregaId`, `urlFacebook`).

### 4. `mis-pedidos` — 3 cambios

- **Card:** nueva fila "📍 Recibe: {{ nombreReceptor }}" (si el pedido lo tiene) — antes ese
  dato solo se veía abriendo el modal de "Entrega".
- **Filtro por lugar:** input con dropdown autocomplete debajo del buscador de texto (solo
  admin) → `onBuscarLugar()`/`seleccionarLugar()`/`limpiarFiltroLugar()`. Al elegir un lugar,
  llama `buscarPedidoPorCliente(buscar, size, page, lugarEntregaId)` (nuevo 4º parámetro,
  query `&lugarEntregaId=`).
- **🐛 Bug encontrado de paso (no era de esta feature):** `buscarPedidoAdmin()` hacía
  `this.pedidoGenerico.push(...)` **sin limpiar la lista primero** — cada tecla escrita en el
  buscador iba ACUMULANDO resultados viejos en vez de reemplazarlos. Se agregó
  `this.pedidoGenerico = []` al inicio del método. Se nota más ahora porque el filtro de lugar
  vive en el mismo método, pero el bug ya afectaba la búsqueda de texto normal antes de este
  cambio.
- **Modal "Entrega":** se agregó `<select>` de lugar + input de link de Facebook, junto a los
  campos que ya existían. `actualizarEntrega()` en `pedidos.service.ts` acepta los 2 campos
  nuevos en el body.

### 5. `detalle-pedido` — mostrar `lugarEntregaNombre` + `urlFacebook`

En el panel `.dp-entrega` (solo lectura) ya existente: `lugarEntregaNombre` como texto, y
`urlFacebook` como link `target="_blank"`.

### 6. `venta-variante` (checkout del cliente, `POST /v1/pedidos/savePedido`)

Select "Lugar de entrega" (opcional), visible solo para `!isAdminUser` — el admin sigue
capturando estos datos en Venta Directa. **Sin campo de Facebook aquí** — el back dijo
explícitamente que no aplica en el checkout público (el cliente compra para sí mismo), se omite
del formulario aunque el campo exista en el DTO.

⚠️ **Solo se agregó `lugarEntregaId` a `IPedidoVarianteDTO`, NO `nombreReceptor`/
`direccionEntrega`/`fechaEntrega`** — la respuesta de la sesión anterior (2026-07-23) solo
confirmó esos 3 campos para `VentaDirectaRequest`, nunca para `PedidosDTOPedido`/`savePedido`.
La respuesta de hoy sí confirma `lugarEntregaId`/`urlFacebook` para ambos DTOs explícitamente,
por eso solo esos 2 se agregaron acá.

**Archivos nuevos:**
- `src/app/lugares-entrega/models/lugar-entrega.model.ts`
- `src/app/lugares-entrega/service/lugar-entrega.service.ts`
- `src/app/lugares-entrega/gestion/gestion-lugares.component.ts/.html/.scss`
- `src/app/lugares-entrega/lugares-entrega.module.ts`

**Archivos modificados:**
- `src/app/app-routing.module.ts` → ruta lazy `/lugares-entrega`
- `src/app/navbar/navbar.component.html` → link en Inventario
- `src/app/variante/service/variante.service.ts` → `IVentaDirectaRequest` + `lugarEntregaId`/`urlFacebook`
- `src/app/variante/venta-directa/venta-directa.component.ts` → campos + carga de catálogo
- `src/app/variante/venta-directa/venta-directa.component.html` → select + input
- `src/app/pedidos/mis-pedidos/models/IPedidoQuery.model.ts` → `totalPagado?`, `nombreReceptor?`,
  `lugarEntregaId?`, `lugarEntregaNombre?`, `urlFacebook?`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → filtro autocomplete, fix de
  `buscarPedidoAdmin()`, modal extendido
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html/.scss` → fila "Recibe", filtro, estilos
- `src/app/pedidos/pedidos.service.ts` → `buscarPedidoPorCliente()` + 4º parámetro,
  `actualizarEntrega()` + 2 campos
- `src/app/abonos/models/abono.model.ts` → `PedidoDetalleResponse` + `lugarEntregaId`/
  `lugarEntregaNombre`/`urlFacebook`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` → panel de entrega ampliado
- `src/app/variante/models/pedido-variante.model.ts` → `IPedidoVarianteDTO.lugarEntregaId?`
- `src/app/variante/venta-variante/venta-variante.component.ts/.html` → select de lugar (cliente)

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — la migración `migration_lugar_entrega.sql` seguía pendiente de correr
en dev/qa/prod según el propio doc del back al momento de escribir esto.

---

## FIX ESTILOS — MODAL "ENTREGA" EN MIS-PEDIDOS SIN DISEÑO (2026-07-24)

**Síntoma reportado:** el modal de "📍 Entrega" (agregado en la sección anterior) sí mostraba
los 6 campos (receptor, dirección, fecha, lugar, Facebook, observaciones), pero visualmente era
puro SweetAlert2 sin estilo — labels con `style` inline sueltos, inputs con la clase por defecto
`swal2-input`/`swal2-select`/`swal2-textarea` apiladas una debajo de otra sin agrupación.

**Fix:** se armó un `<style>` embebido dentro del propio `html` del Swal (necesario — los
estilos scoped de un componente Angular no llegan al DOM que SweetAlert2 inyecta en
`document.body`, mismo patrón ya usado en `motivo-cancelacion.util.ts` y
`forzarCambioPassword()` del login) con clases propias `.mp-entrega-*`:
- Cada campo con su label (con emoji identificador) arriba y el input/select/textarea abajo,
  bordes redondeados y foco con el acento del tema (`var(--app-accent)`, `var(--card-bg)`,
  `var(--card-border)` — dark/light automático, mismas variables globales de siempre).
- Fecha y Lugar de entrega van en una fila de 2 columnas (`.mp-entrega-row`) para que el modal
  no quede tan largo — el resto sigue en una sola columna.
- `width: 480` explícito en el `Swal.fire()` para que el modal no se vea angosto con 2 columnas
  adentro.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `mostrarModalEntrega()`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX — BODY DE DELETE LUGARES-ENTREGA + puedeGenerarTicket() CON totalPagado REAL (2026-07-24)

> Correcciones del back tras revisar la respuesta de "lugares de entrega" del mismo día.

### 1. `DELETE /v1/lugares-entrega/delete` — body incorrecto

El back documentó primero `Body: { "id": 1 }`, y así lo implementé — pero corrigieron: el CRUD
genérico espera el id **crudo** como valor JSON (`1`), no envuelto en objeto. Con `{ id }`
truena con `JSON parse error: Cannot deserialize value of type 'java.lang.Integer' from Object
value`. Mismo patrón que usan los demás catálogos genéricos del proyecto
(`palabras-clave/delete`, que ya mandaba el id crudo). De paso el back corrigió un bug propio:
el `delete()` genérico no borraba nada de verdad aunque respondiera 200 — ya arreglado de su
lado, sin cambios adicionales necesarios acá.

```typescript
// ❌ antes
delete(id: number): Observable<void> {
  return this.http.delete<void>(`${this.url}/delete`, { body: { id } });
}
// ✅ ahora
delete(id: number): Observable<void> {
  return this.http.delete<void>(`${this.url}/delete`, { body: id });
}
```

### 2. `nombreReceptor` confirmado en la lista de pedidos + `puedeGenerarTicket()` ya no asume `true`

El back confirmó que `GET /v1/pedidos/buscarClientePedido` (y `buscarTodosLosPedidos`) ya
incluye `nombreReceptor`, `tipoPedido`, `totalPagado`, `lugarEntregaId`, `lugarEntregaNombre` y
`urlFacebook` en el objeto `pedido` de cada resultado — cierra dos preguntas que llevaban abiertas
varias sesiones (`tipoPedido`/`totalPagado` en la lista).

`nombreReceptor` en la card ya funcionaba sin cambios (el binding ya usaba `*ngIf`, simplemente
antes no había dato — ahora sí lo hay). Lo que sí se aprovechó: `puedeGenerarTicket(item)` para
crédito ya no asume `true` siempre (el compromiso que se había dejado porque antes no se sabía
de antemano si el pedido tenía abonos) — ahora usa `(item.pedido.totalPagado ?? 0) > 0`, mismo
criterio que ya usaba `puedeImprimir()` con el detalle completo (que se deja igual, como red de
seguridad al hacer clic).

**Archivos modificados:**
- `src/app/lugares-entrega/service/lugar-entrega.service.ts` → `delete()` body corregido
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `puedeGenerarTicket()` usa `totalPagado`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX — SHAPE REAL DE `getAll` LUGARES-ENTREGA + CATÁLOGO CON PAGINACIÓN REAL EN TABLA (2026-07-24)

> Cierra la consulta de la sección anterior. El back confirmó que documentaron mal el shape la
> primera vez (confundieron el patrón `PginaDto` con el del CRUD genérico) — la migración sí
> corrió en QA y el endpoint sí respondía bien desde el principio; el bug era 100% de lectura
> en el front.

### 1. Shape real — `{ "data": [...] }`, no `{ "data": { "t": [...] } }`

`GET /v1/lugares-entrega/getAll` (CRUD genérico) pagina de verdad con `page`/`size`, pero
devuelve el arreglo **plano** de esa página — sin envolver en `PginaDto` (`t`/`pagina`/
`totalPaginas`), a diferencia de otros endpoints como `palabras-clave/buscar`. Como el código
original leía `res.data?.t ?? []` y `data` nunca tuvo esa forma, siempre caía al fallback
`[]` — **sin ningún error HTTP ni de consola**, por eso el select se veía vacío sin ninguna
pista visible. `LugarEntregaService.getAll()` ahora lee `res.data` directo.

### 2. Dos usos distintos del mismo endpoint, con paginación distinta (aclarado por el back y
### pedido explícito del usuario)

- **Selects/autocomplete** (venta-directa, editar-entrega en mis-pedidos, checkout del
  cliente, filtro de búsqueda de pedidos): necesitan **todas** las opciones de un jalón, sin
  paginar — `getAll()` ahora tiene `size = 200` por default (antes 50), suficiente para un
  catálogo de zonas/pueblos que no va a crecer a cientos de registros pronto.
- **Catálogo admin** (`/lugares-entrega`, `GestionLugaresComponent`): rediseñado con
  **paginación real** — tabla (`<table>`, columnas Nombre/Acciones) + controles "← Anterior" /
  "Siguiente →", pidiendo su propio `page`/`size=10` en cada carga. Como el CRUD genérico no
  devuelve total de registros, "hay página siguiente" se infiere con `length === size` (si la
  página vino completa, probablemente hay más — mismo criterio que otros catálogos sin total
  en este proyecto).
- Antes de este cambio, `guardar()`/`eliminar()` parcheaban el arreglo local (`push`/`filter`)
  en vez de recargar — con paginación real eso ya no tiene sentido (un alta puede caer en otra
  página, una edición no cambia el orden) → ahora ambos llaman `cargar()` para refrescar la
  página actual desde el servidor.

**Archivos modificados:**
- `src/app/lugares-entrega/models/lugar-entrega.model.ts` → elimina `ILugaresEntregaPaginable` (sin uso)
- `src/app/lugares-entrega/service/lugar-entrega.service.ts` → `getAll()` lee `res.data` directo, default `size=200`
- `src/app/lugares-entrega/gestion/gestion-lugares.component.ts` → paginación real (`page`, `size=10`, `haySiguiente`)
- `src/app/lugares-entrega/gestion/gestion-lugares.component.html` → tabla + controles de página
- `src/app/lugares-entrega/gestion/gestion-lugares.component.scss` → `.pk-table`, `.pk-pagination`, `.pk-btn--page` (reemplaza `.pk-list`/`.pk-item`)

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT — PAGINACIÓN REAL EN MIS-PEDIDOS (ADMIN) + FILTRO POR TIPO (APARTADOS/IR PAGANDO) (2026-07-24)

> El pedido original era confuso ("filtro de pedidos abiertos") — tras aclarar con el usuario,
> lo que en realidad se necesitaba era: (1) la vista admin de `mis-pedidos` nunca tuvo
> paginación real (cargaba una sola página de 10 y ya, sin forma de ver más), y (2) un filtro
> por **tipo de pedido** (Apartados/Ir pagando), independiente del filtro de lugar, que se
> combinan con AND cuando ambos están activos.

### 1. Bug encontrado — admin nunca podía ver más de 10 pedidos

`onScroll()` solo dispara `cargarMasPedidos()` (infinite scroll) para `!isAdminUser` — el admin
nunca tuvo forma de pedir la página 2. `buscarPedidoAdmin()` además **reseteaba `page=0` en
cada llamada**, así que ni siquiera el `page++` que hacía después servía para nada.

**Fix:** paginación real tipo Anterior/Siguiente, mismo patrón que `variante/buscar` y el
catálogo de `lugares-entrega`. `buscarPedidoAdmin(reset = true)`: `reset=true` (default, usado
por cualquier búsqueda/filtro nuevo) vuelve a `page=0`; `reset=false` lo usan
`paginaAnteriorAdmin()`/`paginaSiguienteAdmin()` para navegar sin perder los filtros activos.
`totalPaginas` ya venía en la respuesta (`IPageable.totalPaginas`) — no hizo falta nada nuevo
del back para esto.

### 2. Filtro por tipo de pedido — 2 botones toggle, independientes del filtro de lugar

"📦 Apartados" / "💳 Ir pagando" — mismo patrón visual pill que el filtro de lugar. Se combinan
con AND: lugar=Zacazonapan + Apartados → apartados de Zacazonapan; solo Apartados (sin lugar) →
todos los apartados; solo lugar (sin tipo) → todos los pedidos de ese lugar sin importar tipo.

**⚠️ Requiere un query param nuevo que el back todavía no ha confirmado** —
`buscarPedidoPorCliente()` ahora manda `&tipoPedido=APARTADO&tipoPedido=FIADO` (repetido, uno
por cada checkbox activo — convención Spring `@RequestParam List<String>`) a
`GET /v1/pedidos/buscarClientePedido`, pero **no está confirmado que el endpoint lo soporte
todavía**. El front ya está listo — funcionará en cuanto el back lo agregue. Pregunta anotada
en el repo compartido, con inventario completo de los endpoints que usa esta pantalla.

**Archivos modificados:**
- `src/app/pedidos/pedidos.service.ts` → `buscarPedidoPorCliente()` + parámetro `tiposPedido`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `filtroApartado`/`filtroIrPagando`,
  `toggleFiltroTipo()`, `buscarPedidoAdmin(reset)` reescrito, `paginaAnteriorAdmin()`,
  `paginaSiguienteAdmin()`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → botones de tipo, controles de
  paginación
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.scss` → `.tipo-filtro-*`, `.mp-pagination`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ El filtro por tipo no tendrá efecto real hasta que el back confirme/agregue el parámetro —
mientras tanto no rompe nada, el backend simplemente ignoraría un query param que no reconoce.

---

## FEAT — RESUMEN VISIBLE DE FILTROS ACTIVOS EN MIS-PEDIDOS (2026-07-24)

**Pedido del usuario:** con 3 filtros combinables ahora (texto, lugar, tipo), no quedaba claro
a simple vista qué combinación estaba aplicada. Se agregó un getter `descripcionBusqueda`
que arma un resumen tipo `"Buscando: texto "123" + lugar "Zacazonapan" + Apartados"` con lo
que esté activo, mostrado como chip debajo de los filtros (solo admin, solo si hay al menos un
filtro activo — si no hay ninguno, no se muestra nada).

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → getter `descripcionBusqueda`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → chip `.mp-descripcion-busqueda`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.scss` → estilos del chip

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX — 3ER CHECKBOX "NORMAL" EN FILTRO DE TIPO + BÚSQUEDA POR ID CONFIRMADA (2026-07-24)

> Respuesta del back a la consulta de la sección anterior: `tipoPedido` en
> `buscarClientePedido` ya está implementado tal cual lo mandaba el front (sin cambios acá).
> Encontraron 2 cosas al probar en vivo:

### 1. Faltaba el checkbox "NORMAL"

El back soporta los 3 valores (`NORMAL`/`APARTADO`/`FIADO`) pero el front solo tenía 2
checkboxes ("Apartados"/"Ir pagando"). Se agregó "🛒 Normal" como tercera opción —
`toggleFiltroTipo()` ahora acepta los 3 valores, `tiposPedidoFiltro` y `descripcionBusqueda`
los incluyen. Ninguno marcado sigue significando "sin filtro de tipo" (no hay que mandar los 3
explícitos para ese caso).

### 2. `buscar` ahora también encuentra por id de pedido — sin cambios en el front

El back confirmó que el "número de pedido" que ve el admin **es** `pedido.id` (no hay folio
aparte) y agregó: si `buscar` es puramente numérico, además de la búsqueda de texto ya
existente (nombre/correo/teléfono del cliente) también compara contra `pedido.id` exacto. Como
el admin ya mandaba `buscarProd` tal cual al parámetro `buscar` (sin lógica especial para
números), esto "ya funciona" sin tocar nada del front — antes `buscar=1` solo encontraba
resultados por coincidencia casual (ej. un teléfono que contenía "1"), ahora además compara
contra el id real.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `filtroNormal`, `toggleFiltroTipo()`
  acepta `'NORMAL'`, `tiposPedidoFiltro`/`descripcionBusqueda` actualizados
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → 3er botón "🛒 Normal"

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## RENOMBRAR RUTA — `/variantes` → `/tienda` (SOLO LA URL) (2026-07-24)

> El usuario ya no quería que la URL del catálogo público dijera "variantes" — extensión del
> mismo criterio de la sección "TAXONOMÍA DE NOMBRES" (2026-07-16): renombrar solo lo visible
> al usuario, sin tocar código interno. Ahí ya se había dicho explícitamente "solo lo visible",
> pero esa decisión nunca se planteó para la URL del navegador — el usuario la reabrió ahora
> puntualmente para este caso.

**Por qué esto NO es lo mismo que el refactor de ~60 archivos que se descartó en julio:** ese
descarte era sobre renombrar el **código interno** (carpetas, clases, `VarianteService`, los
endpoints que llaman al back `/variantes/v1/...`) — un cambio inútil porque el backend sigue
exponiendo `/variantes/v1/...` de todos modos. La URL del **router de Angular** (`app-routing.module.ts`
→ `path: 'variantes'`) es 100% independiente de eso — es solo cómo se ve la URL en el navegador,
no toca ninguna llamada al backend. Por eso este cambio sí se hizo, sin pedirle nada al back.

**Qué cambió:** `path: 'variantes'` → `path: 'tienda'` en `app-routing.module.ts` (coincide con
la etiqueta "🛍️ Tienda" que ya tenía el menú). Todas las sub-rutas (`buscar`, `venta`, `carrito`,
`detalle/:id`, `update`, `cargar-excel`, `venta-directa`) son relativas a ese path padre —
`agregar-routing.module.ts` no necesitó ningún cambio.

**Qué NO cambió (a propósito):** carpeta `src/app/variante/`, nombres de componentes/servicios
(`VarianteService`, `BuscarComponent`, etc.), y ninguna llamada al backend (`/variantes/v1/...`
sigue igual — confirmado que ninguno de los archivos tocados mezclaba rutas de front con
llamadas al back antes de hacer el reemplazo, para no romper ninguna por accidente).

**Archivos con `routerLink`/`router.navigate()` actualizados de `/variantes/...` → `/tienda/...`
(13 archivos, ~25 ocurrencias):**
- `src/app/app-routing.module.ts` → `path: 'tienda'`
- `src/app/navbar/navbar.component.html` / `.ts`
- `src/app/favoritos/favoritos.component.html` / `.ts`
- `src/app/auth/usuarios.guard.ts`
- `src/app/guard/admin-guard.guard.ts`
- `src/app/clietes/clientes-add/clientes-add.component.ts`
- `src/app/variante/buscar/buscar.component.ts`
- `src/app/variante/detalle-variante/detalle-variante.component.ts`
- `src/app/variante/update-variante/update-variante.component.ts`
- `src/app/variante/venta-directa/venta-directa.component.ts`
- `src/app/variante/venta-variante/venta-variante.component.ts` / `.html`

**Verificado:** grep exhaustivo de `/variantes/` como ruta de front (excluyendo `/variantes/v1/`
del back) → cero resultados restantes. `ng build --configuration=development` sin errores ni
warnings nuevos.

⚠️ **No se agregó redirect de `/variantes/*` → `/tienda/*`** para links/bookmarks viejos — no se
pidió y este es un sistema interno sin URLs indexadas públicamente. Si hace falta después, es un
único `{ path: 'variantes', redirectTo: 'tienda', pathMatch: 'prefix' }` — trivial de agregar.

---

## ⚠️ RENOMBRAR ENDPOINT DEL BACKEND `/variantes` → `/tienda` — SOLO EN `dev`, NO EN `qa` (2026-07-24)

> Continuación directa de la sección anterior. El usuario aclaró que no solo quería la URL del
> navegador — también quiere que el endpoint REAL del backend cambie de `/variantes/...` a
> `/tienda/...`. A diferencia del rename de arriba, **esto sí requiere que el back haga el mismo
> cambio de su lado** — sin eso, este cambio del front rompería TODO lo relacionado a variantes
> (buscar, guardar, imágenes, independizar, etc.) en cualquier ambiente donde se despliegue.

**Por eso, instrucción explícita del usuario: este cambio se sube a `dev` pero NO se hace merge
a `qa` todavía** — se queda esperando a que el back confirme que ya renombró y desplegó su lado
antes de promoverlo. Mientras tanto, `qa` sigue apuntando a `variante.service.ts` con `/variantes`
(el commit anterior), y funciona con normalidad.

### Alcance real — solo 3 archivos en todo el front

A diferencia de lo que parecía al principio, **no** es un refactor grande: casi todos los
endpoints de variantes cuelgan de una sola constante base en `variante.service.ts` (25
métodos la usan vía `${this.url}/...`), así que cambiar esa única línea repropaga el rename a
absolutamente todos ellos. Solo 2 archivos más tenían la URL del backend escrita aparte:

| Archivo | Antes | Ahora |
|---|---|---|
| `src/app/variante/service/variante.service.ts:11` | `${environment.api_Url}/variantes` | `${environment.api_Url}/tienda` |
| `src/app/chatbot/chatbot.service.ts:45` | `${environment.api_Url}/variantes/v1/imagenes` | `${environment.api_Url}/tienda/v1/imagenes` |
| `src/app/rifas/service/rifa.service.ts:34` | `${this.url}/variantes/v1/buscar?...` | `${this.url}/tienda/v1/buscar?...` |

Ejemplo concreto de lo que cambia en cualquiera de los ~25 métodos de `VarianteService` (todos
siguen el mismo patrón, solo cambia la constante base):
```typescript
// Antes: GET /variantes/1  (buscaba/traía la variante con id 1)
// Ahora: GET /tienda/1     (misma función, mismo id, prefijo nuevo)
getOne(id: number): Observable<...> {
  return this.http.get(`${this.url}/${id}`); // this.url ya trae el prefijo nuevo
}
```

**También actualizado (cosmético, sin llamada HTTP real):**
`admin/diagnostico-imagenes/diagnostico-imagenes.component.html` — el texto de referencia que
muestra en pantalla `/variantes/admin/diagnostico-imagenes/{varianteId}` ahora dice
`/tienda/admin/diagnostico-imagenes/{varianteId}` para que coincida con la llamada real.

**Confirmado que NO hay que tocar (son otro dominio, solo comparten la palabra "variantes"):**
`producto.service.ts` → `/admin/sin-variantes/reporte` y `/compartir-imagenes-variantes` — son
sub-rutas del controlador de **productos** (Modelo), no del prefijo `/variantes` que se está
renombrando. Cambiarlas no tendría sentido semántico ("sin-variantes" = "sin combinaciones",
no es parte del prefijo de la API de variantes).

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos** — el
build no valida que el backend responda, así que compila igual sin importar si el back ya hizo
su parte o no.

**Pregunta precisa mandada al back** (repo compartido) con el mapeo completo de qué prefijo
esperar y ejemplos antes/después — ver `CAMBIOS_FRONT.md`.

---

## FIX MÓVIL — FILTROS TRASLAPADOS EN TABLET/CELULAR GRANDE + CARDS DE 2 EN 2 (2026-07-24)

> Reportado con 2 capturas: en PC (`productos/buscar`) se veía bien, pero en móvil los 8
> checkboxes de filtro aparecían con el texto encimado/ilegible ("Con sto ck Sin stock Con
> im ágesnimágenes...") y las cards de producto se veían de 1 en 1 en vez de 2 en 2.

### Causa raíz — hueco entre breakpoints, no un bug del código nuevo

Ya existían 2 fixes previos para `.pl-filtros`/`.vb-filtros` (sección "FIX FILTROS ADMIN — 4
COLUMNAS EN PC, 1 COLUMNA EN MÓVIL", 2026-07-21): `≤576px` → 1 columna con texto que envuelve
(`white-space: normal`), `>576px` (cualquier ancho, incluido tablet/celular grande en
horizontal) → `repeat(4, 1fr)` con `white-space: nowrap`. **El bug real**: no había ningún
nivel intermedio. Un viewport de, digamos, 650px (tablet chica, celular grande, o el propio
DevTools en modo responsive con un ancho no exactamente "móvil") caía en la rama de 4 columnas
— 4 columnas de ~150px cada una son demasiado angostas para un label como "Código generado" con
`nowrap`, y el texto se desborda visualmente encima de la pill vecina. Mismo mecanismo ya
documentado como "grid blowout" en la sesión de julio, pero esta vez por falta de un breakpoint
intermedio, no por `min-width` faltante (eso ya estaba corregido).

**Fix — 3 niveles en vez de 2**, en ambos archivos (`all.component.scss` para "Productos"
admin, `buscar.component.scss` para "Tienda" pública — mismo patrón clonado en las dos):
```scss
@media (max-width: 576px)                      { .pl-filtros { grid-template-columns: 1fr; } }
@media (min-width: 577px) and (max-width: 899px) { .pl-filtros { grid-template-columns: repeat(2, 1fr); } }
// (sin media query = desktop, ya existía) .pl-filtros { grid-template-columns: repeat(4, 1fr); }
```
El nivel de 2 columnas (577–899px) usa el mismo tamaño de fuente que desktop — con 2 columnas
en vez de 4, cada pill tiene el doble de ancho disponible, suficiente para casi cualquier label
sin necesitar `white-space: normal` ahí. Nunca hay un punto intermedio sin cubrir.

### Cards de producto — 2 por fila en vez de 1

`.pl-grid`/`.vb-grid` usaban `grid-template-columns: repeat(auto-fill, minmax(270px, 1fr))` —
por diseño, con `minmax(270px,...)`, cualquier viewport bajo ~560px (270×2 + gap) colapsa a 1
sola columna automáticamente. Pedido explícito del usuario: en móvil deben verse de 2 en 2.
Fix — dentro del `@media (max-width: 576px)` ya existente:
```scss
.pl-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
```
**Por qué esto no rompe el contenido de la card:** el footer de botones (`.pl-btn-card`, 6
acciones: Agregar/Quitar/Carrito/Detalle/Actualizar/Productos) ya usa
`flex-wrap: wrap` + `flex: 1 0 50px` — con la card a la mitad de ancho, los botones simplemente
envuelven a 2-3 filas en vez de una, en lugar de desbordar o cortarse. `&__detail-val` (los
valores de nombre/código/marca) ya tiene `text-overflow: ellipsis` — un valor largo se trunca
con "…" en vez de desbordar. No hizo falta ningún ajuste adicional de tipografía.

### 📖 Lección para no repetir este patrón

**Regla a futuro para cualquier grid de filtros/cards con columnas fijas (`repeat(N, 1fr)`) que
cambie de N a 1 en un solo breakpoint:** si el contenido de cada celda tiene `white-space:
nowrap` (pills, badges, botones con texto fijo), **nunca** saltar directo de "1 columna" a "N
columnas" en un solo punto de quiebre — casi siempre hay un rango de anchos intermedios
(tablet, celular grande en horizontal, ventana de navegador redimensionada a mano) donde N
columnas ya no caben cómodas pero el CSS no sabe que debe bajar a menos. Agregar SIEMPRE un
nivel intermedio (2 columnas) entre "móvil" y "desktop" para grids de 3+ columnas, o usar
`repeat(auto-fit, minmax(...))` en vez de un número fijo cuando el contenido lo permita (mejor
aún, porque se adapta solo sin necesitar breakpoints manuales — no se usó acá porque los
labels de los filtros no tienen un ancho mínimo natural cómodo con `minmax()`, pero si se
rediseña este componente de nuevo, considerarlo primero).

**Archivos modificados:**
- `src/app/productos/producto/all/all.component.scss` → breakpoint intermedio en `.pl-filtros`, `.pl-grid` a 2 columnas en móvil
- `src/app/variante/buscar/buscar.component.scss` → mismo fix en `.vb-filtros`/`.vb-grid`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en dispositivo real — verificar con DevTools en varios anchos (375px, 650px,
768px, 900px+) antes de dar por cerrado.

---

## FIX — CONFIRMACIÓN DE CANCELAR PEDIDO: 400+MENSAJE + DESHABILITAR SI YA CANCELADO (2026-07-27)

> Respuesta del back en el repo compartido (preguntas hechas por otra sesión/agente, no en esta
> conversación) sobre `DELETE /v1/pedidos/delete/{id}`: antes devolvía 500 vacío al rechazar la
> cancelación, ahora devuelve 400 con `{ mensaje }`. También corrigieron que cancelar un FIADO
> activo desde `mis-pedidos` devolvía stock indebido (esa regla ya existía en `/abonos`, no en
> este endpoint) — 100% backend, sin acción del front.

**Revisado — ya funcionaba sin cambios:** `cancelarPedido()` en `mis-pedidos.component.ts` ya
leía `err?.error?.mensaje ?? err?.error?.message` en el `error` callback (patrón establecido
desde las lecciones del módulo rifas) — el mensaje nuevo del 400 ya se muestra automático, sin
tocar código. `cancelarConMotivo()` está tipado `Observable<any>`, así que el nuevo body de
éxito (`{ response: "..." }`, antes vacío) tampoco rompe nada.

**Mejora aplicada** (recomendación opcional del back, no bloqueante): el botón "Cancelar" en la
card de `mis-pedidos` solo se deshabilitaba para `estado_pedido === 'Entregado'` + no-admin —
un pedido **ya cancelado** seguía mostrando el botón activo (antes de este fix, el back
devolvía 500 vacío al intentarlo; ahora al menos muestra el mensaje claro). Se agregó
`estado_pedido === 'Cancelado'` a la condición de `[disabled]`, con su propio `[title]`.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → `[disabled]`/`[title]` del botón
  Cancelar incluye `estado_pedido === 'Cancelado'`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## HOMOLOGACIÓN DE PALETA — JADE (SOLO MODO OSCURO) — EN PROGRESO (2026-07-30)

> Tras varias rondas de exploración visual en un artifact (ver conversación — se probaron paletas
> "boutique tranquilas" y una versión bold fucsia/tinta con movimiento real: marquee, glow en
> hover, paginador con resplandor). El usuario confirmó: **le gustó el diseño con movimiento**,
> **no le gustó el fucsia**, y eligió **verde jade** con un selector de color interactivo en el
> propio artifact (probó Jade/Cobalto/Ámbar/Carmín/Cian en vivo). Aplica **solo a `body.theme-dark`**
> — el modo claro sigue pendiente de decisión, no se tocó.

### Color elegido
`--app-accent` en modo oscuro: `#4A9EFF` (azul Aether) → **`#00D97E`** (jade eléctrico — literal
al nombre de la tienda, nunca antes probado: fue ámbar → azul/morado Aether → jade).

### Rampa de tonos jade usada en gradientes de 2-3 stops
| Rol | Hex | Reemplaza a |
|---|---|---|
| Jade brillante (= `--app-accent`) | `#00D97E` | `#4A9EFF` |
| Jade medio (stop oscuro de gradientes 2 colores) | `#009A5C` | `#007AFF` |
| Jade profundo (stop extra en gradientes de 3 colores) | `#00693F` | `#5856D6` (morado) |
| Texto/chip claro sobre fondo oscuro | `#6EEBB0` | `#7FBFFF` |

### Archivos modificados — núcleo global (`styles.scss`)
Bloque `body.theme-dark, [data-theme="dark"]` — variables canónicas (`--color-accent`,
`--app-accent`, `--app-accent-soft`, `--input-focus-border`, `--input-focus-shadow`,
`--header-brand-border`) + los overrides puntuales ya existentes de Bootstrap forms/SweetAlert2/
PrimeNG dropdown/glassmorphism global que tenían el azul **hardcodeado dentro del propio bloque
`body.theme-dark`** (mayor especificidad que el bloque genérico de PrimeNG agregado en la sesión
anterior — por eso ganaban sobre `var(--app-accent)` y había que tocarlos aparte).

### Archivos modificados — componentes con el gradiente Aether hardcodeado (14 archivos)
Mismo patrón en todos: `background: linear-gradient(135deg, #007AFF, #4A9EFF)` (o variantes de
ángulo/orden) → `linear-gradient(135deg, #009A5C, #00D97E)`.

- `src/app/admin/chat-admin/chat-admin.component.scss`
- `src/app/chat/chat-usuario/chat-usuario.component.scss`
- `src/app/chatbot/chatbot.component.scss` (+ `.cb-card__precio` color)
- `src/app/clietes/clientes-add/clientes-add.component.scss`
- `src/app/clietes/mi-perfil/mi-perfil.component.scss`
- `src/app/clietes/mis-datos/mis-datos.component.scss`
- `src/app/login/verificar-correo/verificar-correo.component.scss`
- `src/app/navbar/navbar.component.scss` (`--sb-accent` local + 2 usos más)
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.scss` (`.dp-btn-reenviar`/`.dp-tipo-badge--fiado`)
- `src/app/rifas/agregar-rifa/agregar-rifa.component.scss`
- `src/app/rifas/buscar-rifa/buscar-rifa.component.scss` (2 gradientes, 135deg y 90deg)
- `src/app/rifas/rifa-mes/rifa-mes.component.scss`
- `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.scss`
- `src/app/variante/agregar/agregar.component.scss` (gradiente de 3 stops, incluía el morado `#5856D6`)

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

### ⚠️ PENDIENTE — segunda capa: morado `#5856D6` suelto en ~20 archivos más

Al terminar el barrido de arriba, un grep de `#5856D6` (el "accent-2" morado de la vieja pareja
Aether azul+morado) encontró que sigue presente en **~20 archivos adicionales** no cubiertos por
esta pasada — probablemente usado como color secundario de gradiente en botones/badges puntuales,
independiente del `#4A9EFF` que ya se migró. **No se tocó todavía** — es un barrido más grande y
no se quería hacer a ciegas sin confirmar antes con el usuario si:
1. Se migra igual a jade (consistencia total), o
2. Se deja como detalle secundario (algunos usos podrían ser intencionales, no todos ligados al
   acento principal).

**Excepción confirmada que NO se debe tocar:** `src/app/login/login-form/login-form.component.scss`
usa su propia paleta azul/morado local (`$accent`/`$accent-d`) **a propósito, solo para el login**
— ver sección "Corrección — LOGIN pasa a azul/morado (color local, NO global)" más arriba. Verificar
cada archivo del grep antes de tocarlo, no asumir que todos aplican.

### Pendiente — modo claro (`body.theme-light`)
Sin decisión todavía. El usuario pidió primero ver claro el análisis del oscuro antes de decidir
si el modo claro lleva la misma energía, una versión más tranquila, o casi no se usa por ahora.

### Pendiente — ticker de promociones (el elemento "marquee" del artifact)

> ⚠️ Reconfirmado con el usuario el 2026-08-01 — la sesión donde se discutió esto por primera
> vez quedó documentada arriba con un plan más elaborado (entidad `TickerPromocion` con
> enlace/orden/activo, CRUD admin) que el usuario, al preguntarle de nuevo, **no reconoció** —
> ese nivel de detalle no fue lo que se acordó con él directamente, probablemente se sobre-
> diseñó en esa sesión sin su confirmación explícita. **No asumir ese plan como válido.**

**Lo confirmado directamente con el usuario:** una barra fija arriba de la pantalla con texto
que se desliza de derecha a izquierda sin parar (estilo noticiero de TV), y una pantalla para
que el admin escriba/edite ese texto (ej. "🎉 Promo perfumes esta semana"). Nada de enlaces,
orden ni catálogo de múltiples entradas — solo el texto deslizante y dónde editarlo. Esto es
lo único confirmado; cualquier detalle adicional (¿un solo texto o varios rotando?, ¿el
componente vive en `styles.scss`/`app.component` o es condicional por pantalla?) no se ha
preguntado todavía.

**Nunca se implementó — verificado con grep de "ticker"/"marquee" en todo `src/app`, cero
resultados.** El elemento que el usuario vio "moverse arriba para perfumes, promociones, etc."
solo existió como maqueta visual dentro de un artifact de exploración de diseño (la misma
sesión donde se decidió la paleta jade) — nunca se llevó al código real de la app.

**Estado:** dejado pendiente a petición explícita del usuario (2026-08-01) — no implementar
hasta que lo pida. Cuando se retome, empezar simple (texto fijo editable + animación CSS) y
preguntar el resto de los detalles antes de diseñar de más otra vez.

---

## HOMOLOGACIÓN JADE — COMPLETADA EN AMBOS TEMAS + 3 BUGS QUE SOLO SE VIERON EN CAPTURA (2026-07-30)

> Continuación directa de la sección anterior (que había quedado a medias: solo el bloque
> `theme-dark` de `styles.scss` y 14 componentes). Esta pasada cierra la migración completa y
> corrige 3 problemas reales que **el `ng build` no detecta** — solo aparecieron al levantar
> `ng serve` y tomar capturas con Playwright.

### 1. Barrido completo de la pareja Aether (54 archivos)

Quedaban **123 usos de `#007AFF` + ~80 de `#5856D6`** escritos a mano en los componentes (no
leían la variable), así que la app se veía mezclada: acento jade con botones/headers azules.
Mapeo mecánico 1:1 (mismo método que la migración ámbar→azul):

| Antes | Ahora | Rol |
|---|---|---|
| `#007AFF` | `#00875A` | acento principal claro — **contraste 4.55:1 sobre blanco, mejor que el azul (4.02:1)** |
| `#5856D6` | `#005C3D` | jade profundo (stop oscuro de gradientes) |
| `#4A9EFF` | `#00D97E` | jade brillante (acento oscuro) |
| `#7FBFFF` | `#6EEBB0` | texto/chip claro sobre fondo oscuro |
| `#4FC3F7` / `#34309A` | `#4FE0A8` / `#00432C` | extremos de gradientes del registro |
| `#3D2C0C` / `#5c0f31` | `#00301F` / `#003D28` | restos de ámbar/vino dentro de gradientes de marca |

### 2. Neutros: de azul marino a sesgo jade (13 archivos)

**El paso que hace que se vea "diseñado" y no solo recoloreado.** Los grises/fondos seguían
siendo azul marino heredado de Aether (`#0B0F24`, `#161B3A`, `#F5F8FF`, `#DCE3F2`, `#12172E`…):
un neutro azulado junto a un acento verde se ve turbio. Se inclinaron hacia jade **manteniendo
la misma luminosidad** para no romper contrastes ya validados:

| Rol | Antes (azul) | Ahora (jade) |
|---|---|---|
| Fondo oscuro | `#0B0F24` | `#081410` |
| Superficie oscura | `#161B3A` | `#0F2119` |
| Borde oscuro | `#2A3050` | `#1E3A2D` |
| Texto claro | `#F1F4FF` | `#EDF7F1` |
| Fondo claro | `#F5F8FF` | `#F3FAF6` |
| Superficie-2 clara | `#E8EDFB` | `#E3F2EA` |
| Borde claro | `#DCE3F2` | `#D5E8DD` |
| Texto oscuro | `#12172E` | `#12241D` |

**Se dejó intacto a propósito:** la familia slate de Tailwind (`#1E293B`, `#64748B`, `#94A3B8`,
`#E2E8F0`, `#F1F5F9`) — lee como gris neutro, no como azul, y tocarla eran ~280 ocurrencias de
riesgo sin beneficio visible.

### 3. 🐛 Los 3 bugs que el build NO detecta (encontrados en captura)

#### 3.1 — Los botones de Bootstrap seguían AZULES en todas las pantallas
**Causa raíz:** en `angular.json`, `bootstrap.min.css` está listado **DESPUÉS** de
`src/styles.scss`. Con la misma especificidad, Bootstrap siempre gana — por eso el proyecto
arrastra tantos `!important`. `.btn-primary` de BS 5.3 hardcodea `--bs-btn-bg:#0d6efd`.

**Fix (sin `!important` y sin cambiar el orden de carga):** ganar por **especificidad**, que es
determinista e independiente del orden — `.btn.btn-primary` = (0,2,0) > `.btn-primary` = (0,1,0).
Se redefinen las custom properties `--bs-btn-*` apuntando a `--app-accent` (así respeta
hover/active/disabled en vez de pisarlos). Para las utilidades (`.text-primary`, `.bg-primary`,
`.link-primary`) basta redefinir `--bs-primary-rgb`/`--bs-link-color` **dentro de los bloques
`body.theme-*`** — `body.theme-light` = (0,1,1) es más específico que el `:root` = (0,1,0) donde
Bootstrap las declara.

> ⚠️ **NO se movió `src/styles.scss` al final del array de `angular.json`.** Es el arreglo
> arquitectónicamente correcto, pero haría que decenas de reglas sin `!important` empiecen a
> ganar donde hoy pierden, cambiando pantallas de forma impredecible sin poder probarlas todas
> (no hay backend local). Si algún día se hace, verificar pantalla por pantalla.

#### 3.2 — Texto blanco sobre jade brillante = ilegible
El paginador activo (`.p-paginator-page.p-highlight`) usaba `color: #fff` sobre el acento. En
claro el acento es oscuro (`#00875A`) y funcionaba; en oscuro es brillante (`#00D97E`) y el
blanco encima quedaba ilegible. **Fix:** nueva variable **`--app-accent-ink`** = el color del
texto que va ENCIMA del acento (`#FFFFFF` en claro, `#062015` en oscuro). Usarla siempre en vez
de `#fff` hardcodeado sobre `var(--app-accent)`.

También nuevas: `--app-accent-hover` y `--app-accent-rgb` (para los anillos de foco de Bootstrap).

#### 3.3 — Dos verdes distintos significando cosas distintas
Con la marca en jade, los badges chocaron: "Apartado"/"Ir pagando" usaban `var(--app-accent)`
(verde) y "Pagado" usaba verde de éxito (`#16a34a`) — indistinguibles de un vistazo.

**Regla nueva: el color semántico es independiente del acento de marca.** Como el azul salió de
la paleta, quedó libre para significar "en curso":

| Estado | Claro | Oscuro | Significado |
|---|---|---|---|
| Apartado | `#b45309` ámbar | `#fbbf24` | esperando |
| Ir pagando | `#2563eb` azul | `#60a5fa` | en curso |
| Pagado | `#16a34a` verde | `#4ade80` | éxito |
| Cancelado | `#dc2626` rojo | `#f87171` | error |

Archivos: `abonos.component.scss`, `pedidos/mis-pedidos/*.scss`, `pedidos/detalle-pedido/*.scss`.

### 📖 Lección — `ng build` no valida diseño

Los 3 bugs de arriba compilaban perfecto. **Al terminar una migración de paleta, levantar
`ng serve` y tomar capturas en claro Y oscuro antes de dar por cerrado.** Receta que funcionó
(sin backend, sin sesión):
1. `ng serve` → escucha en **`[::1]:4200` (IPv6)**, no en `127.0.0.1` (ver nota de entorno).
2. Playwright instalado **en el scratchpad**, no en el proyecto (`npm i playwright` en el repo
   falla con ERESOLVE por conflicto de peer deps).
3. Navegar a una pantalla pública (`/usuarios/registrar`), forzar el tema con
   `document.body.className = 'theme-dark'`, y capturar.
4. Para revisar los componentes genéricos sin necesitar login, inyectar una vitrina de HTML en
   el `body` de la app ya cargada — hereda los estilos compilados reales.

**Excepción confirmada, NO tocar:** `src/app/login/login-form/login-form.component.scss` conserva
su paleta azul/morado local a propósito (ver sección del login más arriba).

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos**, y con
capturas en claro y oscuro de `/usuarios/registrar` + vitrina de componentes.

---

## RONDA DE FIXES DE UI REPORTADOS EN QA (2026-08-01)

> Detalle completo, causa raíz y estado de cada punto en `REVISION_UI_2026-08-01.md` (creado en
> la raíz del repo). Resumen aquí; 2 puntos se anotaron en el repo compartido para el back
> (`documentos_front_back_nodevedaades_jade/CAMBIOS_FRONT.md`).

**Corregidos (100% front):**
1. **Modales de SweetAlert2 salían con el botón de confirmar morado** — la librería trae su
   propio `#7066e0` por defecto y nunca se había sobreescrito ese color específico (sí estaban
   ya en jade el fondo/texto/inputs del popup). Fix global en `styles.scss`:
   `--swal2-confirm-button-background-color: var(--app-accent)` + `var(--app-accent-ink)` para
   el texto. Resuelve de un jalón el morado en carga-imágenes (botón "✕" descartar) Y el modal
   "Info entrega" de `mis-pedidos` — mismo bug, mismo fix, sin tocar ninguno de esos dos
   componentes directamente.
2. **"Tomar foto" (carga-imágenes) ilegible en modo oscuro** — `.ci-btn` tenía `color: #fff`
   fijo en vez de `var(--app-accent-ink)` (mismo bug "3.2" ya documentado en la migración jade,
   que no se había aplicado aquí). ⚠️ Grep de `background: var(--app-accent)` + `color: #fff`
   encontró **18 archivos más** con el mismo riesgo, sin tocar — ver detalle en
   `REVISION_UI_2026-08-01.md` punto 2.
3. **`palabras-clave` sin paginación** — clonado el patrón de paginación real ya usado en
   `lugares-entrega` (mismo endpoint CRUD genérico, `page`/`size=10`,
   `haySiguiente = length === size`). `gestion-palabras-clave.component.ts/html/scss`.
4. **Inputs de precio/monto — había que borrar el "0" a mano para escribir.** Un solo listener
   global en `app.component.ts` (`focusin` sobre `document`) selecciona el contenido de
   cualquier `input[type="number"]` de la app al enfocarlo — cubre venta directa, abonos,
   gastos, precios de producto/variante, y cualquier campo numérico nuevo, sin tocar templates
   uno por uno.
5. **Botón azul suelto en `gastos/buscar`** — `.ga-btn--primary` tenía un gradiente azul
   (`#1e40af, #3b82f6`) que no era ni siquiera el azul de Aether, quedó fuera de todas las
   migraciones anteriores. → `var(--app-accent)` + `var(--app-accent-ink)`.
6. **Saldo pendiente incorrecto en el ticket de abono** — `registrarAbono()` en
   `abonos.component.ts` confiaba en `data.saldoRestante` (respuesta del back) para el número
   mostrado; si ese campo refleja el saldo de ANTES del abono en vez de después, el ticket sale
   con "ya pagado"/"saldo pendiente" desfasados (ejemplo real: total 300, ya pagado 100, abono
   hoy 100 → mostraba saldo 200 en vez de 100). Fix defensivo: el saldo se calcula SIEMPRE en
   local (saldo previo cargado al abrir el modal, menos el monto que se acaba de abonar) —
   `data.saldoRestante` ya no se usa para el número, solo `data.estadoPedido` para el flag de
   liquidado. Mismo fix en el mensaje de `detalle-pedido.component.ts` (no imprime ticket pero
   tenía el mismo riesgo). Además, la etiqueta "Ya pagado" en tickets tipo `abono` ahora dice
   **"Abonos previos"** (pedido explícito del usuario — menos ambiguo, deja claro que es antes
   de hoy) — otros tipos de ticket (venta/liquidado) no cambian.

**Sin resolver, necesitan algo externo:**
7. **`clientes/buscar` — "cuadrito verde" junto a "Clientes"** — revisé el código completo del
   header (`.cb-header`, patrón glass estándar del proyecto) y no encontré ningún elemento
   que calce con la descripción. Anotado como ❓ pendiente de una captura para diagnosticar bien
   en vez de adivinar un fix.
8. **Filtro por estado (Pagado/Cancelado) en `mis-pedidos`** — pedido del usuario, junto a los
   filtros de tipo (Normal/Apartado/Ir pagando) que ya funcionan bien. `buscarClientePedido` no
   tiene ningún parámetro para filtrar por `estado_pedido` hoy — con paginación real de
   servidor, filtrarlo en el front sobre lo que ya llegó daría resultados incompletos. Pregunta
   mandada al back pidiendo un parámetro nuevo tipo `&estadoPedido=`, mismo patrón que
   `tipoPedido`. El front ya está listo para conectarlo en cuanto exista.

**Archivos modificados:**
- `src/styles.scss` → fix global de color de botón Swal
- `src/app/carga-imagenes/carga-imagenes.component.scss` → `.ci-btn`/`.ci-btn--completar`
- `src/app/palabras-clave/gestion/gestion-palabras-clave.component.ts/.html/.scss` → paginación
- `src/app/app.component.ts` → listener global `focusin` select-on-focus
- `src/app/gastos/all/all.component.scss` → `.ga-btn--primary`
- `src/app/abonos/abonos.component.ts` → `registrarAbono()` cálculo local de saldo
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → `registrarAbono()` mismo fix
- `src/app/shared/ticket.util.ts` → label "Abonos previos" en tickets tipo `abono`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — pendiente que el usuario confirme en QA tras el deploy.

---

## FEAT NAVBAR — LA SECCIÓN ACTIVA DEL MENÚ SE RECUERDA ENTRE NAVEGACIONES (2026-08-01)

> Pedido del usuario: al entrar a, por ejemplo, Pedidos → Mis pedidos, navegar a otra pantalla y
> volver a mostrar el sidebar, quería seguir viendo "Pedidos" expandido/marcado — no que el
> accordion se resetee a cerrado cada vez. Elegir otra sección debe reemplazar cuál está
> "activa" (un solo grupo a la vez, como ya funcionaba), solo que ahora persiste.

**Antes:** `openGroup` (qué grupo del accordion está expandido) solo cambiaba por clic manual
(`toggleGroup()`) y se reseteaba a `null` en `onMouseLeave()` (desktop) y `closeMobile()`
(móvil) — es decir, cada vez que el mouse salía del sidebar o se cerraba en móvil (típicamente
justo después de hacer clic en un link y navegar), la sección quedaba completamente cerrada sin
importar en qué pantalla estuviera parado el usuario.

**Fix:** nuevo campo privado `activeGroup`, recalculado en cada navegación
(`router.events.pipe(filter(e => e instanceof NavigationEnd))`) contra un mapa
`GROUP_ROUTES` (ruta → nombre de grupo, mismo criterio de agrupación ya documentado en
"REGLA — CRITERIO DE ORGANIZACIÓN DEL SIDEBAR"). `onMouseEnter()`, `onMouseLeave()` y
`closeMobile()` ya no ponen `openGroup` en `null` — lo sincronizan con `activeGroup`, así que la
sección de la ruta en la que el usuario está siempre es la que se muestra abierta la próxima vez
que se expanda el sidebar. `toggleGroup()` (clic manual) no cambió — el usuario sigue pudiendo
explorar otra sección sin navegar durante el hover actual; al salir del sidebar o navegar,
vuelve a sincronizarse con la ruta real.

**Extra:** cada `<a class="sb-subitem">` ganó `routerLinkActive="sb-subitem--active"` (mismo
patrón que ya usaban los links directos fuera del accordion — Promociones, Favoritos, etc.) para
que el sub-item exacto de la página donde está el usuario quede resaltado, no solo el grupo.
Nueva clase `.sb-subitem--active` en el SCSS, mismo estilo que `.sb-item--active`.

**Cuidado con prefijos de ruta ambiguos:** `tienda/venta` (Agregar producto, grupo Inventario) es
prefijo literal de `tienda/venta-directa` (grupo Ventas) — un `startsWith` ingenuo los
confundiría. `computeActiveGroup()` usa `clean === path || clean.startsWith(path + '/')`
(con el `/` como límite) para no matchear un prefijo suelto como si fuera hijo de otra ruta.
`routerLinkActive` de Angular no tiene este problema (compara segmentos de ruta, no substrings).

**Archivos modificados:**
- `src/app/navbar/navbar.component.ts` → `GROUP_ROUTES`, `activeGroup`,
  `computeActiveGroup()`, `ngOnInit()` suscrito a `NavigationEnd`, `onMouseEnter()`/
  `onMouseLeave()`/`closeMobile()` sincronizan con `activeGroup` en vez de resetear a `null`
- `src/app/navbar/navbar.component.html` → `routerLinkActive="sb-subitem--active"` en los 27
  `<a class="sb-subitem">`
- `src/app/navbar/navbar.component.scss` → `.sb-subitem--active`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — necesita sesión real navegando entre pantallas para confirmar.

---

## FEAT — FILTRO PAGADOS/CANCELADOS EN MIS-PEDIDOS + REORGANIZACIÓN DE FILTROS (2026-08-01)

> Respuesta del back (repo compartido, commit `c0c0e44`) a las 2 consultas de la sección
> anterior: (1) `saldoRestante` en `POST /v1/abonos/{pedidoId}` SÍ es posterior al abono — el
> fix de front (calcular en local) se queda igual, no hay que revertirlo, solo no confiar el
> número en pantalla mostrado si viene de OTRA sesión (el de `data.saldoRestante` sí es
> confiable si se quiere usar). El $200 raro del ticket reportado se explica por front cacheado
> o un dato desfasado puntual — el back corrió un script de diagnóstico de su lado, sin acción
> nuestra. (2) El filtro por estado **ya está implementado y compilando en `dev` del back**
> (todavía no en `qa`) — contrato confirmado:

```
GET /v1/pedidos/buscarClientePedido?...&estadoPedido=PAGADO&estadoPedido=CANCELADO
```
- Repetible — varios valores del mismo parámetro se combinan con **OR** entre ellos.
- Se combina con **AND** contra `tipoPedido`/`lugarEntregaId` (igual que ya funciona hoy entre
  esos dos).
- Comparación case-insensitive del lado del back — el front puede mandar `PAGADO`/`CANCELADO`
  como sea.
- Si se omite, no filtra por estado — retrocompatible.

**Fix conectado (100% front, ya listo para cuando el back despliegue a `qa`):**
- `pedidos.service.ts` → `buscarPedidoPorCliente()` gana un 6º parámetro `estadosPedido?: string[]`,
  arma `&estadoPedido=` repetido.
- `mis-pedidos.component.ts` → `filtroPagados`/`filtroCancelados`, `toggleFiltroEstado()`,
  `estadosPedidoFiltro` getter (mismo patrón que `tiposPedidoFiltro`) — dimensión separada, no
  se mezcla con `toggleFiltroTipo()`. `descripcionBusqueda` incluye Pagados/Cancelados.
- Botones "✅ Pagados" / "❌ Cancelados" en `mis-pedidos.component.html`.

**Reorganización de los bloques de filtro (pedido del usuario):** cada grupo de filtro ahora
vive en su propio bloque separado, en vez de mezclar los botones nuevos dentro del grupo de
tipo. Orden final: buscador de texto → grupo "tipo" (Normal/Apartados/Ir pagando) → grupo
"estado" (Pagados/Cancelados, nuevo) → filtro de lugar (autocomplete, es "el otro buscador") →
resumen de filtros activos. `.tipo-filtro-wrap` ya usa `flex-wrap: wrap`, así que en móvil cada
grupo envuelve sus propios botones de forma independiente sin mezclarse con el grupo vecino.

**⚠️ No probado en vivo — ni el filtro (el back no lo ha desplegado a `qa` todavía) ni el
reordenamiento visual en un celular real.** Si el orden/agrupación no es exactamente lo que se
pidió, ajustar con una captura de referencia en vez de otra ronda de descripción en texto — ya
pasó dos veces en esta sesión que una descripción sola no bastó para acertar a la primera.

**Archivos modificados:**
- `src/app/pedidos/pedidos.service.ts` → `buscarPedidoPorCliente()` + `estadosPedido`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → filtro de estado
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → botones + reordenamiento de bloques

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

### Corrección — agrupación real, no solo separación (mismo día)

El usuario aclaró: el reordenamiento de arriba (grupos separados en bloques distintos, uno
debajo del otro) no era lo pedido — cada buscador va **emparejado** con su filtro
correspondiente, en la misma fila en PC:

- **Grupo 1:** buscador de texto (número de pedido) + botones "✅ Pagados"/"❌ Cancelados".
- **Grupo 2:** buscador de lugar de entrega ("el otro buscador") + botones
  "🛒 Normal"/"📦 Apartados"/"💳 Ir pagando".

**PC:** cada grupo en una fila — buscador a la izquierda, sus botones a la derecha, en el mismo
renglón. **Móvil (`≤575px`):** cada grupo se apila — buscador arriba, sus botones justo debajo,
después el siguiente grupo completo.

**Fix:** nueva clase `.mp-filtro-grupo` (`display:flex; align-items:center; gap:14px;
flex-wrap:wrap`, con `flex-direction:column` en `≤575px`) envolviendo cada par
buscador+filtro. Se quitó el `margin-bottom` individual de `.search-bar`/`.lugar-filtro-wrap`/
`.tipo-filtro-wrap` (ahora lo maneja el grupo, para no duplicar espacio).

**Verificado con capturas reales** (Playwright + el `dist/styles.css` recién compilado, 1200px
y 375px de ancho) — la primera vez en esta sesión que se confirma un layout así ANTES de subirlo,
en vez de después de que el usuario lo viera mal.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → estructura por grupo
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.scss` → `.mp-filtro-grupo`, márgenes

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX — `clientes/buscar`: HEADER SE VEÍA COMO UN CUADRO BLANCO DISTINTO AL FONDO (2026-08-01)

> Cierra el punto 7 pendiente de "RONDA DE FIXES DE UI REPORTADOS EN QA" — el usuario mandó una
> captura real de QA que sí confirmó el bug (mi vitrina anterior con datos de prueba no lo
> reprodujo porque usaba `--header-brand`, la misma variable, pero sin comparar visualmente
> contra el cuerpo real de la página con tarjetas).

**Causa raíz:** `.cb-header` usaba `background: var(--header-brand)` — el glass semi-transparente
(blanco al 78% de opacidad en modo claro) que ya se documentó como patrón de diseño intencional
("DISEÑO DEFINITIVO — HEADER EN DARK/LIGHT MODE"), usado también en `productos/all` y
`variante/buscar`. El efecto es sutil pero real: blanco translúcido sobre el fondo sólido mint
de la página (`--page-bg`) se ve perceptiblemente más claro/blanco que el mint puro del cuerpo
— exactamente el "cuadro blanco" que describió el usuario.

**Decisión de alcance (confirmada con el usuario):** arreglar **solo `clientes/buscar`**, no
tocar `productos/all`/`variante/buscar` ni la variable global `--header-brand` — son pantallas
que nadie ha reportado con este problema y usan el mismo patrón a propósito en otro contexto
(headers con banners laterales reservados para promociones).

**Fix:** `.cb-header` cambia de `background: var(--header-brand)` (glass) a
`background: var(--page-bg)` (sólido, mismo tono exacto que el cuerpo de la página) — el header
deja de tener ningún contraste con el resto, se ve como un solo color continuo.

**Verificado con capturas reales** (Playwright, claro y oscuro) — confirmado que el header y el
cuerpo ya blanquean/oscurecen exactamente igual, sin ningún cuadro perceptible.

**Archivo modificado:** `src/app/clietes/clientes-buscar/clientes-buscar.component.scss`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## SEGUNDA RONDA — 4 FIXES TRAS PROBAR EN VIVO LO DE HOY (2026-08-01)

> El usuario probó todo lo de la ronda anterior en QA y reportó 4 puntos concretos más.

### 1. Buscador de `mis-pedidos` se veía muy corto, texto cortado (solo PC)

**Causa raíz — bug clásico de flexbox:** al meter el buscador dentro de `.mp-filtro-grupo`
(`display:flex`) en la sesión anterior, `.search-bar`/`.lugar-filtro-wrap` (los flex items
directos) no tenían ningún `flex-basis` propio — solo su HIJO (`.search-input-wrap`) tenía
`max-width:420px`. `max-width` es un TOPE, no un ancho — sin una base de la que partir, el
navegador colapsaba el flex item al tamaño mínimo por defecto de un `<input>` (~180px),
cortando el placeholder "Buscar por número de pedido…" a la mitad. Confirmado reproduciendo
con Playwright + la fuente Poppins real antes de aplicar el fix (se veía "Buscar por número de
p" cortado exactamente como reportó el usuario).

**Fix:** `.search-bar`/`.lugar-filtro-wrap` ganan `flex: 0 1 420px` (basis 420px, no crece, sí
puede encoger) — con eso `width:100%` del input hijo ya tiene de dónde resolver su ancho.

**Segundo bug encontrado al verificar en móvil:** con `flex-direction:column` (el override de
`@media max-width:575px`), el eje principal pasa a ser VERTICAL — un `flex-basis` en px pensado
para ANCHO en PC se interpreta como ALTO en móvil, dejando un hueco de ~420px de alto debajo del
buscador. Fix: dentro del media query, `.mp-filtro-grupo > .search-bar, > .lugar-filtro-wrap { flex: 0 1 auto; }` resetea la base a automática en columna.

**Verificado con capturas reales** (Playwright + Poppins + `dist/styles.css`, 1200px y 375px)
antes de subir — texto completo visible en PC, sin hueco en móvil.

### 2. `mis-pedidos` — "Cobrar" seguía clickeable en un pedido ya pagado

**Síntoma:** un pedido a crédito ya liquidado (`estado_pedido = 'PAGADO'`) seguía mostrando el
botón "Cobrar" habilitado → mandaba a `/abonos`, que a su vez decía "este pedido ya está
pagado". El `[disabled]` del botón solo comparaba contra `estado_pedido === 'Entregado'`
(venta normal) — nunca contempló el estado `PAGADO` de un crédito.

**Fix:** nuevo método `pedidoYaCobrado(item)` — cubre `PAGADO` (crédito liquidado),
`Entregado` (venta normal ya cobrada) y `Cancelado` (que tampoco se cubría antes). El botón
ahora se deshabilita en los 3 casos, con `[title]` explicando por qué.

### 3. Ticket de abono — falta historial con fecha por cada abono

**Pedido del usuario:** en vez de solo "Abonos previos: $X", mostrar cada abono por separado
con su fecha — "Abono 1 (15/06/2026): $100", "Abono 2 (27/06/2026): $100"... hasta liquidar.

**Fix:** `ticket.util.ts` → nueva interfaz `ITicketAbonoItem { monto, fecha }` +
`ITicketData.abonos?: ITicketAbonoItem[]`. Si se manda, `generarHtmlTicket()` imprime un
renglón numerado por abono (con fecha) en vez de las líneas agregadas "Abonos previos"/"Abono
de hoy" (que se conservan como fallback si no se manda el array — no rompe nada donde no se
conecte). Conectado en los 3 lugares que arman tickets de abono:
- `abonos.component.ts` → `buildTicketDataFromDetalle()`: `detalle.abonos` (previos, ya
  cargados al abrir el modal) + el de hoy (`body.monto`, fecha de hoy) al final.
- `mis-pedidos.component.ts` → `buildAndPrintTicket()`/`enviarComprobanteConDatos()`: usa
  `PedidoDetalleResponse.abonos` directo (ya viene completo del back en cualquier reimpresión).
- `detalle-pedido.component.ts` → mismo patrón en sus 2 puntos de armado de ticket.

### 4. Confirmado — el header de `clientes/buscar` sigue con el fix aplicado

Se verificó que el cambio de la sección anterior (`background: var(--page-bg)`) sigue en el
código y ya está pusheado — no se revirtió ni se perdió. Pendiente aclarar con el usuario si lo
que reporta como "sigue igual, en PC no se ve nada" es sobre ESTA pantalla o sobre el ticker de
promociones ("la línea que se movía arriba") que se discutió en una sesión anterior y nunca se
llegó a implementar — quedó como duda abierta, ver conversación.

**Archivos modificados:**
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.scss` → `.mp-filtro-grupo`,
  `.search-bar`, `.lugar-filtro-wrap`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` → `pedidoYaCobrado()`,
  `abonos` en `buildAndPrintTicket()`/`enviarComprobanteConDatos()`
- `src/app/pedidos/mis-pedidos/mis-pedidos.component.html` → `[disabled]`/`[title]` de Cobrar
- `src/app/shared/ticket.util.ts` → `ITicketAbonoItem`, `ITicketData.abonos`,
  `generarHtmlTicket()` con renglón por abono
- `src/app/abonos/abonos.component.ts` → `buildTicketDataFromDetalle()` arma `abonos`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → `abonos` en sus 2 tickets

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FIX — `detalle-pedido`: "REGISTRAR ABONO" SEGUÍA CLICKEABLE EN UN CRÉDITO YA LIQUIDADO (2026-08-01)

> El usuario confirmó que en `mis-pedidos` (lista) y en el detalle, imprimir/enviar ticket ya
> funcionan bien (gatilla correctamente contra "no cancelado + ya tiene pagos"). El único bug
> real reportado en esta ronda: en el detalle de un pedido a crédito **ya pagado por completo**,
> el botón "💳 Registrar abono" seguía apareciendo y era clickeable.

**Causa raíz:** `.dp-abono-wrap` (todo el bloque de abonos) se muestra con `*ngIf="esCredito"`,
y `esCredito` solo mira `tipoPedido` (`APARTADO`/`FIADO`) — ese valor NO cambia cuando el
crédito se liquida, así que el bloque completo (incluido el botón de registrar) seguía
visible para siempre, sin importar el estado real de pago.

**Fix:** nuevo getter `yaLiquidado` (`esCredito && estadoPedido === 'PAGADO'`). El botón
"Registrar abono" ahora lleva `*ngIf="!mostrarFormAbono && !yaLiquidado"`, y en su lugar se
muestra un aviso "✅ Este pedido ya está pagado por completo — no se pueden registrar más
abonos." El **historial de pagos sigue mostrándose igual** (útil de consultar) — solo se oculta
la acción de registrar uno nuevo, no todo el bloque.

**Archivos modificados:**
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.ts` → getter `yaLiquidado`
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.html` → `*ngIf` del botón + aviso
- `src/app/pedidos/detalle-pedido/detalle-pedido.component.scss` → `.dp-abono-liquidado`
  (claro + oscuro)

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## ❓ SIN RESOLVER — "Tomar foto" (carga-imágenes) sigue sin verse bien tras 2 rondas de fix (2026-08-01)

El usuario reportó por tercera vez que el botón "📷 Tomar foto" no se ve como debería. Ya se
corrigió el contraste (`color: #fff` fijo → `var(--app-accent-ink)`) hace 2 sesiones — confirmado
en el código que el fix sigue ahí, no se revirtió. Revisado el HTML completo: es un `<label>`
con un `<input type="file" hidden>` adentro, sin `*ngIf` ni dependencia de ningún dato del
servidor — no hay ninguna razón por la que esto dependa del back.

**Anotado en el repo compartido** (`documentos_front_back_nodevedaades_jade/CAMBIOS_FRONT.md`)
por transparencia, a petición del usuario — sin ninguna pista concreta de que sea un tema de
backend, se les preguntó si ven algo que se nos esté escapando.

**Sigue bloqueado por falta de una captura de pantalla del usuario** — sin eso no se puede
diagnosticar con precisión si el problema real es de contraste (¿todavía?), el emoji 📷 sin
renderizar en su navegador/SO, o algo funcional (en escritorio ese input abre el selector de
archivos normal, no una cámara — `capture="environment"` es soporte de navegador/dispositivo).
**No inventar un tercer fix a ciegas sin la captura** — mismo patrón que ya pasó 2 veces en esta
sesión (Clientes, buscador de mis-pedidos): una descripción en texto sola no bastó para acertar.

### Actualización — captura recibida, el texto SÍ se ve en la imagen (mismo día)

El usuario mandó la captura pedida. **En la imagen el texto "Tomar foto" se ve blanco y
legible**, mismo peso/tamaño que "Elegir de galería o PC" — sin ningún problema visible de
contraste ahí. Se le preguntó si el reporte era sobre la función de cámara (en escritorio
`capture="environment"` no abre cámara real, es comportamiento normal del navegador, no un bug)
— confirmó que no, que es específicamente que "no se ve el texto".

**Contradicción sin resolver:** contraste calculado a mano (blanco sobre `#00875A`, acento en
modo claro) da ~4.6:1 — pasa AA incluso para texto normal, y el texto se ve bien en la captura
que el usuario mismo mandó. Hipótesis más probable: la pestaña donde lo prueba en vivo sigue
con una versión vieja en caché (aunque la captura que mandó sí muestre la versión nueva) — no
se puede descartar sin que confirme después de un hard-refresh real.

**Reforzado de todos modos, sin esperar confirmación de la causa:** `.ci-btn` sube de
`font-weight: 600` a `700` + `text-shadow: 0 1px 2px rgba(0,0,0,.25)` — no hace daño en ningún
tema, y cubre el caso de que el contraste real percibido sea más débil que lo calculado (brillo
de pantalla, iluminación ambiente, etc.).

**Archivo modificado:** `src/app/carga-imagenes/carga-imagenes.component.scss` → `.ci-btn`

---

## FEAT REDES SOCIALES — PUBLICAR PRODUCTO EN FACEBOOK (FOTO Y VIDEO) (2026-08-05)

> Contrato documentado por el back en el repo compartido (`CAMBIOS_FRONT.md`, secciones
> "📘 Endpoint nuevo — Publicar variante en Facebook" y "— Publicar VIDEO..."). Primer paso de
> la integración con redes: solo **Facebook feed**, solo **ADMIN**. Instagram y TikTok quedan
> para después; Historias y Reels **no existen** todavía (son flujos distintos de la Graph API).

### Endpoints conectados

| Método | URL | Archivo |
|---|---|---|
| `POST` | `/v1/redes-sociales/facebook/publicar` | opcional (cae a la imagen principal de la variante) |
| `POST` | `/v1/redes-sociales/facebook/publicar-video` | **obligatorio** (el catálogo no guarda video) |

Ambos son **`multipart/form-data`**, no JSON. Campos: `varianteId`, `descripcion` (texto libre,
sale tal cual como caption), `scheduledPublishTime` opcional (ISO LocalDateTime, mín. 10 min y
máx. 6 meses a futuro). El de foto acepta además `imagenId` (otra imagen ya guardada) o
`imagenNueva` (archivo suelto que **no** se guarda en la galería del producto; gana sobre
`imagenId`). Tope de 200 MB por archivo. Respuesta: `data.estado` es `PUBLICADA` o `PROGRAMADA`,
y `data.postIdFacebook` arma el link `https://www.facebook.com/{postIdFacebook}`.

### ⚠️ No setear `Content-Type` a mano

El body es un `FormData` — el browser pone `multipart/form-data` con su propio `boundary`.
Verificado que `TokenInterceptor` solo agrega `Authorization` y `withCredentials`, no toca el
`Content-Type`, así que no hizo falta ninguna excepción ahí.

### Subida con barra de progreso — y por qué NO usa el overlay global

`RedesSocialesService.enviar()` usa `reportProgress: true` + `observe: 'events'` y traduce los
eventos a `{ tipo: 'subiendo' | 'procesando' | 'listo', porcentaje }`. Dos detalles que importan:

1. **Se filtran los eventos que no son `UploadProgress` ni `HttpResponse`.** Si se mapearan
   todos, el evento `ResponseHeader` (que llega DESPUÉS de terminar la subida) regresaría la
   barra a 0 justo al final.
2. **`procesando` es una fase real, no cosmética.** Cuando la subida llega al 100%, el archivo
   apenas llegó al back — que ahora lo manda a Facebook y **puede tardar hasta 5 minutos** (ese
   es el timeout que el back declaró). No hay nada que medir ahí, así que la barra se queda al
   100% con una animación de pulso y el texto cambia a "Enviándolo a Facebook…". Sin esa
   distinción, un video pesado se ve como una pantalla congelada.

Se agregó `/redes-sociales/` a `LoadingInterceptor.skipUrls` (junto a `/chatbot/`): el overlay
global de pantalla completa taparía TODA la app durante esos minutos sin decir nada. La pantalla
muestra su propia barra en su lugar.

### Previews locales — dos trampas ya conocidas, aplicadas aquí

- **Archivo local** (`imagenNueva` / `video`) → `URL.createObjectURL()` + `bypassSecurityTrustUrl`
  **al crear**, nunca desde el binding (llamarlo en el template devuelve una instancia nueva por
  ciclo de detección y Angular repinta sin parar). Angular 14 **bloquea** las URLs `blob:` crudas
  — sin el bypass la imagen sale rota **sin ningún error en consola**.
- **Imagen que viene del back** (`imagenUrl` de la variante o de la galería) → `| imagenSrc | async`,
  porque un `<img src>` nativo no pasa por `TokenInterceptor` y el endpoint responde 401.

Se guardan los dos: el `SafeUrl` para el `[src]` y el string crudo aparte, porque
`URL.revokeObjectURL` solo acepta el string. Se revoca al quitar el archivo y en `ngOnDestroy`.

### Decisiones de UX

- **Los opcionales se OMITEN, no se mandan vacíos.** Si se manda `imagenId: ''`, el back lo toma
  como valor y descarta la imagen principal — por eso el servicio solo hace `append` cuando hay
  algo real que mandar.
- **El código de barras va en la descripción sugerida por defecto** (es lo que le permite a un
  cliente pedir ese producto exacto), pero la pantalla avisa que queda visible en un post público
  y el texto es totalmente editable para borrarlo.
- **"La principal" queda deshabilitada si el producto no tiene imagen** — el back respondería 400.
  Se muestra el aviso en vez de dejar mandar una petición que ya se sabe que falla.
- **La fecha se valida en el front** con los mismos límites que el back (10 min / 6 meses), por lo
  mismo. `datetime-local` entrega `2026-08-05T18:30`; se le agrega `:00` para el LocalDateTime.
- **La galería de imágenes guardadas falla en silencio** a propósito: sin esa lista el admin
  igual puede publicar con la principal o subiendo una nueva, no vale bloquear la pantalla.

### Lo que NO existe (por si se da por hecho)

No hay endpoint para listar publicaciones ya hechas de un producto, ni para editar o borrar un
post desde acá — cada llamada crea una publicación nueva. Tampoco Historia ni Reel.

### Archivos nuevos
- `src/app/redes-sociales/models/publicacion.model.ts`
- `src/app/redes-sociales/service/redes-sociales.service.ts`
- `src/app/admin/redes-sociales/publicar-facebook.component.ts` / `.html` / `.scss` (prefijo BEM
  `fb-`, todo el color por variables globales + matices `:host-context` por tema)

### Archivos modificados
- `src/app/loading.interceptor.ts` → `/redes-sociales/` en `skipUrls`
- `src/app/admin/admin-routing.module.ts` → ruta `admin/facebook`
- `src/app/admin/admin.module.ts` → declara el componente
- `src/app/navbar/navbar.component.html` → link "📘 Publicar en Facebook" en 🛠️ Sistema

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ **No probado en vivo.** Además del backend desplegado, depende de que la app de Meta tenga
aprobado `pages_manage_posts`: mientras esté en modo desarrollo, Facebook solo acepta publicar en
páginas donde el dueño del token esté agregado como Admin/Developer/Tester de la app — si no,
responde 400 y la pantalla mostrará ese mensaje del back tal cual.

---

## FIX SEGURIDAD AUTH — LOS 6 PUNTOS DEL CHECKLIST DEL BACK (2026-08-05)

> Cierra la sección "🔐 CORRECCIONES DE SEGURIDAD EN AUTENTICACIÓN — 2026-07-31 (acción
> requerida en el front)" del repo compartido, que llevaba una semana sin atender. **Nada de
> esto se rompe hoy** — el back todavía tiene esos cambios sin desplegar — pero el día que
> desplieguen, 4 de los 6 puntos rompen la app de golpe.

### 1. `passwordTemporal` vs `debeCambiarPassword` — se leen LOS DOS

El back documentó `debeCambiarPassword` el 2026-07-04 y `passwordTemporal` el 2026-07-31, sin
aclarar si es un rename o dos campos distintos. Con el campo equivocado el front nunca detecta
la contraseña temporal y el usuario recibe **403 en TODOS los endpoints** salvo cuatro de auth
— la app se ve completamente rota sin ninguna pista de por qué.

Se lee `res?.passwordTemporal ?? res?.debeCambiarPassword ?? false` en `login-form` y en
`verificar-correo`. Funciona con cualquiera de los dos nombres. **Pregunta abierta al back**
para poder quitar el que sobre.

### 2. Cambiar la contraseña ahora MATA la sesión — hay que volver al login

El back invalida el refresh token en el instante (los 3 caminos: cambiar, restablecer y el
reseteo de un admin). Quedarse dentro de la app deja al usuario con una sesión muerta que
revienta en el siguiente refresh.

Estaban mal **3 de los 4 lugares**:

| Dónde | Antes | Ahora |
|---|---|---|
| Modal forzado del login (`forzarCambioPassword`) | entraba a `/productos/buscar` ❌ | cierra sesión → `/login` |
| Mismo modal en `verificar-correo` | igual ❌ | cierra sesión → `/login` |
| `/clientes/cambiar-password` | se quedaba en la pantalla ❌ | cierra sesión → `/login` |
| `/clientes/mi-perfil` | se quedaba en la pantalla ❌ | cierra sesión → `/login` |
| `/olvide-password` | ya iba a `/login` ✅ | sin cambio |

**Nuevo `SesionService`** (`src/app/shared/sesion.service.ts`) con `cerrarSesionLocal(destino)`:
limpia el access token, los roles y **ambos** carritos, y navega. Existe para tener un solo
lugar donde se define "cerrar sesión localmente" — `NavbarComponent.limpiarSesionLocal()` se
refactorizó para usarlo también (antes tenía su propia copia, y con 5 copias iban a divergir).
**No** llama a `POST /v1/auth/logout`: en un cambio de contraseña el back ya mató la sesión.

### 3. El 401 del primer refresh tras el despliegue → login sin error feo

Al desplegar, **todos** los refresh tokens viejos dejan de servir de golpe (les faltan `jti` y
`sessionId`), así que el primer refresh de cada usuario responde 401. El interceptor ya
redirigía al login, pero **además propagaba el error** → cada componente mostraba su
`Swal.fire({icon:'error'})` encima de la redirección.

Ahora devuelve **`EMPTY`** en vez de propagar. Trade-off consciente: un `.subscribe({ next })`
en vuelo no se entera de nada — aceptable, porque el componente se destruye al navegar. El
overlay global sí se apaga bien: `LoadingInterceptor` usa `finalize()`, que corre también al
completar, no solo al fallar.

### 4. No reintentar el refresh con un token ya rotado

El back rota el refresh token de verdad; si le llega uno ya usado lo interpreta como **token
robado y cierra la sesión completa**. El guard `isRefreshing` solo cubría refreshes
*simultáneos* — pero después de un refresh fallido, `isRefreshing` volvía a `false` y el
siguiente 401 disparaba otro intento.

Nuevo flag **`sesionMuerta`**: se enciende cuando un refresh falla y corta cualquier intento
posterior (navega al login y devuelve `EMPTY`). Se apaga solo cuando vuelve a haber access
token, o sea cuando el usuario se logueó de nuevo — se detecta en `intercept()`, sin acoplar
el interceptor al flujo de login.

### 5. Header `X-Requested-With: XMLHttpRequest` en refresh y logout

Nueva constante `CSRF_ENDPOINTS = ['/auth/refresh', '/auth/logout']` en el interceptor. Se
manda siempre; hoy el back lo tiene **apagado** (`seguridad.exigir-header-refresh: false`), así
que mandarlo de más no molesta.

⚠️ **El orden importa y no se puede invertir:** primero se despliega esto, después se le avisa
al back, y **recién ahí** ellos lo encienden. Si lo encienden antes, todos los usuarios pierden
la sesión a los 15 minutos (cuando expira su access token).

### 6. Contraseña mínima de 8 caracteres — ya estaba

Verificado en los 5 formularios: `cambiar-password`, `olvide-password`, `add-usuarios` (registro
y edición), `mi-perfil` (`reqLongitud`) y el modal forzado del login (`cumpleRequisitos`, que
sí valida `length >= 8`). **Ojo:** el validador `passwordFuerte` de `src/app/validador/validador.ts`
**no** valida longitud — solo mayúscula/minúscula/número/especial. La longitud siempre viene de
un `Validators.minLength(8)` aparte. Si se agrega un formulario de contraseña nuevo, hay que
poner los dos.

**Archivos nuevos:** `src/app/shared/sesion.service.ts`

**Archivos modificados:** `src/app/token/TokenInterceptor .ts`,
`src/app/login/login-form/login-form.component.ts`,
`src/app/login/verificar-correo/verificar-correo.component.ts`,
`src/app/clietes/cambiar-password/cambiar-password.component.ts`,
`src/app/clietes/mi-perfil/mi-perfil.component.ts`,
`src/app/navbar/navbar.component.ts` (usa `SesionService` + `admin/facebook` en `GROUP_ROUTES`)

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo — el back todavía no despliega su lado, así que hoy no hay forma de
reproducir ninguno de los escenarios (403 por contraseña temporal, 401 masivo del refresh).

---

## FEAT LEGAL — PÁGINA PÚBLICA DE POLÍTICA DE PRIVACIDAD `/privacidad` (2026-08-05)

**Por qué existe:** Meta la exige en **Configuración → Básico** de la app de Facebook. Sin una
URL de política de privacidad **accesible sin iniciar sesión**, Meta no deja ni siquiera generar
el token de prueba en el Graph API Explorer — o sea, bloquea por completo la configuración de
credenciales y, con ella, toda la función de "Publicar en Facebook". El back lo reportó como su
bloqueo actual en el repo compartido (2026-08-05) y no existía ninguna página de este tipo en
todo el proyecto (verificado con grep).

**⚠️ La ruta NO lleva guards, a propósito.** Ni `AuthGuard` ni `CarritoGuard`. Meta abre la URL
con un bot anónimo; si se topa con un redirect al login la da por inválida. Si alguna vez se
agrega un guard global, hay que exceptuar esta ruta.

**⚠️ Antes de publicar hay que confirmar `correoContacto`** en `privacidad.component.ts` —
está en `contacto@novedades-jade.com.mx` como valor por defecto y tiene que ser una cuenta que
alguien realmente lea: es a donde van a escribir los clientes que quieran consultar, corregir o
eliminar sus datos.

**Contenido:** redactado a partir de lo que el sistema realmente recaba (cuenta, contacto,
pedidos, datos de entrega, chat), no genérico de plantilla. Incluye una sección explícita de
redes sociales aclarando que solo se publican productos del catálogo y **nunca datos de
clientes** — relevante porque es justo lo que Meta va a revisar.

**Archivos nuevos:** `src/app/legal/privacidad/privacidad.component.ts` / `.html` / `.scss`
(prefijo BEM `pv-`, color por variables globales, dark/light automático)

**Archivos modificados:** `src/app/app-routing.module.ts` (ruta pública `privacidad`),
`src/app/app.module.ts` (declara el componente)

**Verificado con `ng build --configuration=development` sin errores.**

---

## RESPUESTAS DEL BACK — 2026-08-05 (cierran 3 preguntas abiertas)

1. **`scheduledPublishTime`:** el servidor corre en `America/Mexico_City` (`ENV TZ` en su
   Dockerfile, aplica a qa y prod). Como el admin está en esa misma zona, **no hay que convertir
   nada** — se manda el `LocalDateTime` tal cual sale del date-time picker. La implementación
   actual ya lo hace así; sin cambios.

2. **Omitir el part vacío era correcto y es obligatorio.** Si se mandara `imagenId` como string
   vacío, el back intenta convertir `""` a `Long`, falla, y cae en el manejador genérico →
   **500 feo**, no un 400 claro. Ellos lo anotaron como mejora pendiente de su lado; mientras
   tanto el front NO debe mandar el part cuando no aplique.

3. **El campo del login es `debeCambiarPassword`, no `passwordTemporal`.** `AuthResponse.java`
   solo expone `accessToken` y `debeCambiarPassword`; `passwordTemporal` es un campo interno de
   la entidad `Usuario` que nunca viaja al front. **Se quitó el fallback** que se había puesto
   por precaución en `login-form.component.ts` y `verificar-correo.component.ts`.

4. **`seguridad.exigir-header-refresh` sigue en `false`** en todos los ambientes. El front ya
   manda `X-Requested-With`, así que pueden encenderlo cuando quieran — pero recordar que
   conviene hacerlo **después** de que esto llegue a producción.

---

## ⏸️ PAUSADO — PUBLICAR EN FACEBOOK: SACADO DE `dev` Y `qa` (2026-08-05)

> **Nota:** en un primer momento solo se ocultó el link del menú (commit `2b57b12`). Poco después
> se decidió sacar el feature completo de `dev`/`qa`, igual que hizo el back — ver
> "ACTUALIZACIÓN" al final de esta sección. El resto de la sección describe el contexto, que
> sigue siendo válido.

El back **sacó de `dev` y `qa`** los endpoints `POST /v1/redes-sociales/facebook/publicar` y
`/publicar-video` (repo compartido, commit `c834e85`), mientras se resuelve la configuración de
la app de Meta. Su código quedó respaldado en la rama `backup/facebook-redes-sociales` de
`proyecto_key`.

**Problema que esto creaba del lado del front:** la pantalla ya estaba mergeada a `qa` y su link
visible en el menú 🛠️ Sistema. Cualquier admin que entrara iba a recibir **404 al publicar**, sin
ninguna pista de por qué.

**Qué se hizo:** se comentó **solo el link del navbar**. La ruta `/admin/facebook`, el componente,
el servicio y los modelos **siguen intactos en el código** — no tiene sentido borrar trabajo que
está documentado y listo, y que el back también conservó en una rama. Para reactivar: descomentar
una línea en `navbar.component.html`.

**Se dejó tal cual (no se tocó):** la página pública `/privacidad`. Sigue siendo necesaria para
la app de Meta cuando se retome, y de todas formas es buena práctica tenerla.

**Estado de la configuración de Meta al momento de pausar** (por si se retoma y hay que recordar
dónde se quedó):
- App `novedadesJade`, ID `1017171384561253`, en modo **Publicada**.
- Caso de uso **"Administrar todos los aspectos de tu página"** ya agregado, con
  `pages_manage_posts` y `pages_read_engagement` en "Listo para la prueba".
- **Bloqueo real:** no se pudo generar el Page Access Token — el popup de consentimiento de
  Facebook (`facebook.com/privacy/consent/?flow=user_cookie_choice_v2`) entra en bucle infinito
  (`ERR_TOO_MANY_REDIRECTS`), tanto en Brave como en Chrome. Se descartó: cookies de terceros
  (ya permitidas globalmente), cookies viejas (borradas). **Sospecha principal sin confirmar:**
  alguna extensión del navegador (bloqueador de anuncios/rastreo) rompiendo ese flujo.
- El aviso "Currently ineligible for submission — Ícono de la app (1024×1024)" **NO era el
  bloqueo** — solo impide mandar la app a revisión, trámite que no hace falta para publicar en
  la página propia siendo admin de la app.

**Archivo modificado:** `src/app/navbar/navbar.component.html`

**Verificado con `ng build --configuration=development` sin errores.**

### ACTUALIZACIÓN (mismo día) — se sacó el feature completo, no solo el link

Ocultar el link dejaba ~1300 líneas de código muerto en `dev`/`qa` apuntando a endpoints que ya
no existen. Se sacó todo, replicando lo que hizo el back.

**Respaldo primero:** rama **`backup/facebook-redes-sociales`** (pusheada al remoto), creada
desde `dev` con el feature todavía dentro. Mismo nombre que usó el back en `proyecto_key`, a
propósito, para que las dos ramas se encuentren juntas al retomar.

> ⚠️ **No se usó `git stash`** aunque así se pidió: el código ya estaba commiteado y pusheado a
> `dev` y `qa`, así que no había nada en el árbol de trabajo que guardar. Y un stash vive solo en
> la máquina local, no viaja al remoto — se habría perdido con cualquier `git clean` o al cambiar
> de equipo. Una rama publicada cumple lo mismo y es recuperable desde cualquier lado.

**Qué se eliminó:**

| Archivo | Qué se hizo |
|---|---|
| `src/app/redes-sociales/` (modelo + servicio) | borrado |
| `src/app/admin/redes-sociales/` (componente `.ts`/`.html`/`.scss`) | borrado |
| `src/app/admin/admin-routing.module.ts` | quitada la ruta `facebook` + import |
| `src/app/admin/admin.module.ts` | quitada la declaración + import |
| `src/app/navbar/navbar.component.html` | quitado el link (queda solo un comentario) |
| `src/app/navbar/navbar.component.ts` | quitado `admin/facebook` de `GROUP_ROUTES` |
| `src/app/loading.interceptor.ts` | quitado `/redes-sociales/` de `skipUrls` |

**⚠️ Al reactivar, no olvidar `skipUrls`.** Es lo más fácil de pasar por alto porque no truena
nada: sin `/redes-sociales/` ahí, el overlay global de carga tapa la app entera durante los
minutos que tarda la subida de un video, sin decir nada. Es un archivo aparte del feature.

**Qué NO se tocó:** la página pública `/privacidad` — sigue haciendo falta para la app de Meta al
retomar, y de todos modos conviene tenerla publicada.

**Verificado:** grep de `redes-sociales|PublicarFacebook|admin/facebook` en `src/app` → sin
resultados fuera de los comentarios. `ng build --configuration=development` sin errores.

---

## FEAT — CINTA DE PROMOCIONES — FASE DUMMY (2026-08-05)

> Cierra el pendiente que arrastraba la sección "Pendiente — ticker de promociones". El usuario
> mostró el artifact de exploración de diseño donde la cinta corre arriba y pidió: **hacerlo
> primero en dummy y después ir perfeccionándolo**, con una pantalla donde él mismo configure
> las frases.

### Alcance de esta fase — SIN BACKEND, a propósito

`CintaService` guarda todo en **`localStorage`** (clave `cinta_promos`). **Lo que edite el admin
vive solo en su navegador**: otro usuario, otra computadora o modo incógnito ven los valores por
defecto. No es un bug — es el alcance acordado para poder afinar diseño y comportamiento antes de
pedirle un endpoint al back.

La pantalla de administración lo dice en un aviso visible, para que nadie lo descubra por las malas.

**Para conectar el backend después:** reemplazar el cuerpo de los 5 métodos públicos de
`CintaService` por llamadas HTTP y borrar `leer()`/`guardar()`. Ni la cinta ni la pantalla de
administración se enteran — ambas solo consumen `items$` / `activos$`.

### Cómo está hecha la cinta

- **El truco del bucle sin salto:** la lista se renderiza **dos veces** dentro del track y la
  animación desplaza exactamente `translateX(-50%)`. Cuando la primera copia termina de salir, la
  segunda está justo donde arrancó la primera → reinicio invisible. Con una sola copia se ve un
  hueco al final de cada vuelta. La segunda copia lleva `aria-hidden` para que un lector de
  pantalla no lea todo dos veces.
- **Velocidad constante:** la duración la calcula el componente (`items.length * 6s`, mínimo 18s).
  Si fuera fija, más frases = texto más veloz e ilegible.
- **Pausa al pasar el mouse** (`animation-play-state: paused`) para poder leerla.
- **`prefers-reduced-motion`:** no se anima nada; la cinta se queda quieta y con scroll horizontal.
- **Full-bleed:** `margin: -16px -20px 16px` se come el padding de `.page-content` para ir de borde
  a borde. ⚠️ En móvil el margen superior es **0, no negativo** — `.page-content` reserva 60px
  arriba para el botón hamburguesa, que es `position: fixed`; con margen negativo la cinta le
  quedaría encima y lo taparía.

### Dónde NO se muestra

`RUTAS_OCULTAS` en `cinta.component.ts`: `/login`, `/usuarios/registrar`, `/privacidad`,
`/verificar-correo`, `/olvide-password`. Son pantallas a página completa con diseño propio (el
login incluso pinta su malla WebGL); una cinta comercial encima se ve fuera de lugar.

### Pantalla de administración — `/admin/cinta`

Link "📢 Cinta de promociones" en 🛠️ Sistema. Agregar, editar en línea, subir/bajar el orden,
ocultar sin borrar (👁️/🚫), eliminar con confirmación, y restaurar las frases originales. Los
cambios se ven en la cinta **al instante**, sin recargar (BehaviorSubject).

### Archivos nuevos
- `src/app/cinta/models/cinta.model.ts` (+ `CINTA_DEFAULTS`)
- `src/app/cinta/service/cinta.service.ts`
- `src/app/cinta/cinta.component.ts` / `.html` / `.scss` (BEM `cta-`)
- `src/app/admin/cinta/gestion-cinta.component.ts` / `.html` / `.scss` (BEM `gca-`)

### Archivos modificados
- `src/app/app.component.html` → `<app-cinta>` arriba del `router-outlet`
- `src/app/app.module.ts` → declara `CintaComponent`
- `src/app/admin/admin.module.ts` + `admin-routing.module.ts` → pantalla `/admin/cinta`
- `src/app/navbar/navbar.component.html` + `.ts` → link y `GROUP_ROUTES`

**Verificado con `ng build` sin errores, y además EN VIVO con `ng serve` + Playwright**
(recordar la lección: `ng build` no valida diseño). Capturas en claro y oscuro sobre `/home`, y se
confirmó que **de verdad se mueve** comparando el `transform` computado del track en dos momentos
(`-106px` → `-131px`), no solo que el elemento exista.

### Pendiente de decidir con el usuario (fase 2)
- ¿Las frases llevan enlace? (ej. "Promo en bolsas" que lleve al catálogo filtrado). Hoy son solo
  texto — **se preguntó antes y el usuario no reconoció ese plan**, así que no se implementó nada
  de enlaces/orden avanzado sin confirmarlo.
- Velocidad, tamaño y colores: ajustables, es lo que toca afinar en las siguientes vueltas.

---

## RENOMBRAR — "TICKER" → "CINTA" (antes de que existiera el backend) (2026-08-10)

**Por qué:** el dueño vio "Cinta de promociones" en el menú, entró y la dirección decía
`/admin/ticker` — y preguntó de una *"¿por qué le pusiste ticket si ya tenemos algo que se llama
ticket, no se vaya a confundir?"*. Tiene razón: **"ticker" se lee prácticamente igual que
"ticket"**, y en este sistema `ticket` ya significa otra cosa muy concreta y muy usada — el
comprobante de venta (`src/app/shared/ticket.util.ts`, "🖨️ Imprimir ticket",
`POST /v1/pedidos/{id}/notificar`). *Ticker* es el término correcto en inglés para un letrero
corredizo, pero acá solo estorbaba.

**Se renombró TODO, no solo la etiqueta visible** — al revés de lo que se decidió con
`variante`/`producto` en la "TAXONOMÍA DE NOMBRES" (2026-07-16), donde solo se tradujo el texto
visible porque renombrar el código eran ~60 archivos y el backend seguía exponiendo `/variantes`
de todos modos. Acá la situación es la opuesta y por eso la decisión también:

- Es una feature **nueva**, de 7 archivos, con 5 días de vida.
- **El backend todavía no había construido nada.** La consulta pidiendo los endpoints estaba
  commiteada pero **sin pushear** — se alcanzó a corregir antes de que ellos vieran `/v1/ticker/`.
  Si se dejaba pasar, ese nombre quedaba en su tabla y en sus rutas para siempre.

| Antes | Ahora |
|---|---|
| `src/app/ticker/` | `src/app/cinta/` |
| `TickerComponent` / `app-ticker` | `CintaComponent` / `app-cinta` |
| `TickerService` | `CintaService` |
| `ITickerItem` / `TICKER_DEFAULTS` | `ICintaItem` / `CINTA_DEFAULTS` |
| `src/app/admin/ticker/gestion-ticker.component.*` | `src/app/admin/cinta/gestion-cinta.component.*` |
| `GestionTickerComponent` | `GestionCintaComponent` |
| ruta `/admin/ticker` | ruta `/admin/cinta` |
| BEM `tk-` / `gt-` | BEM `cta-` / `gca-` |
| `localStorage['ticker_promos']` | `localStorage['cinta_promos']` |

**Prefijos BEM — se verificaron las colisiones antes de elegir**, no se eligieron a ojo:
`cp-` ya lo usa `cambiar-password` y `cn-` ya lo usa `config-negocio`. Quedaron libres `cta-`
(cinta) y `gca-` (gestión cinta). Comando: `for p in cta gca cn gc; do grep -rl "\b$p-[a-z]" src/ | wc -l; done`.

**⚠️ Efecto colateral aceptado:** al cambiar la clave de `localStorage`, lo que el admin hubiera
guardado bajo `ticker_promos` deja de leerse y reaparecen las frases de fábrica. Es irrelevante
en fase dummy (esos datos no salían de un navegador de todos modos), pero **si esto se hiciera
después de conectar el backend, sí habría que migrar**.

### 🐛 Trampa al renombrar en lote: `grep -rl` alcanza los binarios de `src/assets/`

El primer intento hizo `sed -i` sobre la salida de `grep -rl "...\btk\b..."` en todo `src/` — y
**7 imágenes de `src/assets/imagenes/` entraron en la lista** (un `.jpg` contiene por casualidad
bytes que matchean patrones cortos como `tk` o `gt-`). `sed` las reescribió y las dejó
corruptas. Se detectó con `git status --porcelain src/assets/` y se revirtió con
`git checkout -- src/assets/imagenes/` antes de commitear nada.

**Regla:** al renombrar en lote con `sed`, restringir SIEMPRE por extensión
(`grep -rl --include="*.ts" --include="*.html" --include="*.scss"`) o excluir `assets/`. Y
revisar `git status` **antes** de `git add`, especialmente si el patrón tiene menos de 4
caracteres.

**Otra trampa (Windows):** `git mv src/app/ticker src/app/cinta` falló con *"Permission denied"*
porque un proceso `node` tenía tomada la carpeta (un `ng serve` de una sesión anterior). Renombrar
la carpeta pide lock exclusivo; mover **los archivos uno por uno** a un directorio nuevo sí
funcionó, sin tener que matar el proceso.

### Consulta al back (commit `96aad86` del repo compartido, sin pushear todavía)

Se pide el CRUD del catálogo (`texto`, `activo`, `orden`) — mismo patrón que `lugares-entrega` —
más dos campos de destino (`destinoTipo`, `destinoValor`) para que cada frase lleve a algún lado
al hacerle clic. **Se les pide explícitamente que NO guarden la ruta del front**: guardan *qué*
mostrar (`PROMOCIONES` / `BUSQUEDA` / `PRODUCTO` / `EXTERNO` / `NINGUNO`) y el front sabe *dónde*
vive — precedente directo del rename `/variantes` → `/tienda`, que habría roto en silencio
cualquier URL guardada como texto en la base.

Dos puntos del contrato que importan:
- **`GET /v1/cinta/activos` NO puede ser admin-only** — la cinta se pinta para el cliente; con
  rol ADMIN le saldría vacía y con un 403 en consola en cada carga.
- **`BUSQUEDA` no necesita endpoint nuevo**: el buscador del catálogo ya hace cascada
  código de barras → palabra clave → nombre, y las categorías son justo "BLUSAS"/"BOLSAS", así
  que mandar el texto tal cual devuelve la categoría completa.

**⏳ Pendiente del lado del front, para cuando exista el endpoint:** el catálogo
(`buscar.component.ts:128`) hoy solo lee `?productoId=` de los query params — hay que agregarle
el parámetro del término de búsqueda para que `destinoTipo: BUSQUEDA` funcione. Y en la pantalla
de administración, un botón **"probar"** junto al destino que corra la búsqueda y diga cuántos
resultados da, para no publicar una frase que lleve a un catálogo vacío.

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

---

## FEAT — CINTA DE PROMOCIONES CONECTADA AL BACKEND `/v1/cinta` (2026-08-10)

> Cierra la fase dummy (`localStorage`) documentada arriba. El back entregó el catálogo en su
> `dev`/`qa`; el contrato completo está en el repo compartido (`CAMBIOS_FRONT.md`).

### ⚠️ El back recortó el alcance: v1 SIN destino clickeable

La consulta pedía además `destinoTipo`/`destinoValor` para que cada frase llevara a algún lado al
hacerle clic. **El back decidió no incluirlo en esta primera entrega** — solo texto, activo y
orden. Avisan que agregarlo después será una migración aditiva (columnas nuevas), no un cambio de
contrato. **No implementar nada de destinos hasta que existan esos campos**: hoy las frases se
pintan como texto no clickeable, que es exactamente lo que devuelve el backend.

### Endpoints

| Método | URL | Quién |
|---|---|---|
| `GET` | `/v1/cinta/activos` | **público, sin auth ni login** — solo activas, ya ordenadas, cacheado 1h |
| `GET` | `/v1/cinta/getAll?page=0&size=200` | ADMIN — `page`/`size` **obligatorios**, el CRUD genérico no tiene defaults |
| `GET` | `/v1/cinta/getOne/{id}` | ADMIN |
| `POST` | `/v1/cinta/save` | ADMIN — `{ texto, activo, orden }` |
| `PUT` | `/v1/cinta/update/{id}` | ADMIN — objeto completo **con `id` en el body** |
| `DELETE` | `/v1/cinta/delete` | ADMIN — body: el id crudo (`1`), **NO** `{ id: 1 }` (igual que `lugares-entrega`) |

`texto` es requerido y máx. 120 — fuera de rango responde 400 con el motivo en `mensaje`.

### ⚠️ DOS listas separadas — no unificarlas nunca

`CintaService` mantiene **dos** `BehaviorSubject`, y es por permisos, no por descuido:

- `activos$` ← `GET /activos` (público) → lo consume **la cinta**, que se pinta también para el
  cliente y hasta para el visitante sin sesión.
- `items$` ← `GET /getAll` (ADMIN) → lo consume **la pantalla de administración**, única que
  necesita ver también las frases apagadas.

Colgar la cinta de `items$` "para ahorrarse una llamada" le daría **403 en cada carga a cualquier
usuario que no sea admin**, y la vería vacía.

### `/activos` falla en silencio a propósito

`cargarActivos()` lleva `catchError(() => of([]))`. Se pide en el arranque de la app, en TODAS las
pantallas y para cualquier visitante: si el endpoint no está arriba, lo peor que puede pasar es
que la cinta no aparezca (`*ngIf="items.length > 0"`). **Nunca un Swal ni un throw** — es un
adorno, no puede ensuciar la consola de un cliente ni bloquear nada. En la pantalla de admin es al
revés: ahí el error SÍ se propaga y se muestra, con botón de reintentar.

También se agregó `/v1/cinta/activos` a `LoadingInterceptor.skipUrls` — corre en cada carga y no
tiene por qué tapar la pantalla con el overlay global. Las rutas de admin de `/v1/cinta` **no** se
saltan: ahí sí es una acción del usuario y el overlay es correcto.

### Reordenar: renumerar por posición, NO intercambiar los dos `orden`

El back no armó endpoint de reordenamiento en lote, así que hay que mandar un `update` por fila
que cambia de lugar. `CintaService.mover()` **renumera la lista completa por índice** y manda solo
las filas cuyo `orden` realmente cambió (normalmente dos, vía `forkJoin`).

Intercambiar los dos `orden` entre sí parece más directo pero **se rompe si dos filas comparten el
mismo `orden`** — fácil de provocar si un reordenamiento anterior quedó a medias (el propio back
advirtió de ese riesgo al no dar endpoint en lote). Con valores iguales, el "intercambio" no
movería nada y el botón se vería muerto sin ningún error. Renumerar por índice siempre deja la
lista consistente.

### La tabla nace VACÍA — el botón de sugeridas solo aparece si no hay nada

El back dejó `cinta_promocion` vacía a propósito y pidió que las frases las diéramos de alta
nosotros. La pantalla tiene **"✨ Cargar frases sugeridas"** (`CINTA_SUGERIDAS`, los 6 textos que
antes eran los defaults del dummy), pero **visible solo cuando la lista está vacía**
(getter `puedeSembrar`): cada carga hace `POST`, no reemplaza nada, así que un clic de más las
duplicaría. Por lo mismo desapareció el viejo "↺ Restaurar originales" — con backend real ya no
significa restaurar, significa duplicar.

### Guard de doble-submit en toda la cadena (Lección #10)

`GestionCintaComponent.ejecutar()` corre mutación → recarga. `guardando` se libera **solo al
terminar la recarga**, no en el `next` de la mutación: entre una y otra el botón se rehabilitaría
y un segundo clic mandaría la misma alta/edición con datos ya guardados.

Se recarga del servidor en vez de parchar el arreglo local porque `orden` e `id` los decide el
back — parchando a mano se desincroniza en cuanto un reordenamiento toca más filas de las
esperadas. Tras cada mutación se llama también `cargarActivos()` para que la cinta de arriba se
refresque sin recargar la página.

### 💡 `[maxlength]` no es bindeable en un `<input>` de Angular

`[maxlength]="maxLargo"` truena con *"Can't bind to 'maxlength' since it isn't a known property of
'input'"* — no existe como propiedad del DOM, solo como atributo. Va `[attr.maxlength]="maxLargo"`.

**Archivos modificados:**
- `src/app/cinta/models/cinta.model.ts` → `ICintaItem` gana `orden`; nuevo `ICintaRequest`;
  `CINTA_DEFAULTS` → `CINTA_SUGERIDAS` (`string[]`, ya no son "de fábrica")
- `src/app/cinta/service/cinta.service.ts` → reescrito sobre `HttpClient`, sin `localStorage`
- `src/app/cinta/cinta.component.ts` → `cargarActivos()` en `ngOnInit`
- `src/app/admin/cinta/gestion-cinta.component.ts` → CRUD contra el backend, `ejecutar()`,
  `sembrarSugeridas()`, estados `cargando`/`guardando`/`error`
- `src/app/admin/cinta/gestion-cinta.component.html` → aviso de error con reintentar, botón de
  sugeridas condicionado, `[disabled]` por `guardando`, `[attr.maxlength]`
- `src/app/admin/cinta/gestion-cinta.component.scss` → `.gca-aviso--error` (claro + oscuro)
- `src/app/loading.interceptor.ts` → `/v1/cinta/activos` en `skipUrls`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ **No probado en vivo:** el back todavía no corre `migration_cinta_promocion.sql` en QA, así que
los endpoints no responden. Hasta entonces la cinta no se va a ver — que es el comportamiento
esperado (falla en silencio), no un bug.

---

## FIX — LA FICHA DE PRODUCTO LLAMABA A `getOne`, QUE PASÓ A SER ADMIN-ONLY (2026-08-12)

**Reportado por el back** (repo compartido, 2026-08-11): cerraron `/tienda/getAll`,
`/tienda/v1/getAll`, `/tienda/getOne/{id}` y `/tienda/v1/getOne/{id}` — antes eran públicos y
devolvían la entidad `Variantes` cruda, que arrastra el `Producto` completo **incluidos
`precioCosto` y `precioRebaja`**. Con `getAll?size=1000` y sin login se podía sacar el margen
completo de la tienda. Pidieron avisar si alguna pantalla los usaba sin login.

### Sí los usaba — y era la ficha de producto, que es pública

`DetalleVarianteComponent` (`/tienda/detalle/:id`, **sin guard**) llamaba
`GET /tienda/v1/getOne/{varianteId}` con un solo fin: averiguar a qué producto pertenece la
variante, para después pedir `getPorProducto(productoId)` (que sigue público y es de donde sale
todo lo que se pinta). Ni un precio, ni ningún otro campo de esa respuesta.

Con el endpoint cerrado, a un cliente le devuelve 401/403 → sin `productoId` → **ficha vacía**.
Y como el `subscribe` tenía `error: () => {}`, no se veía ni un mensaje: pantalla en blanco.

**Verificado en vivo:** `QA → 401`, `PROD → 200` (el cierre todavía no estaba desplegado en
producción). El back confirmó por escrito que **no promueve `qa → main` hasta que este fix esté
arriba**.

### Fix

1. **El `productoId` viaja en la URL.** `BuscarComponent.irDetalle()` y
   `FavoritosComponent.irDetalle()` navegan con `queryParams: { productoId }` — ya lo tienen en
   `IVarianteResumen.productoId`, no cuesta nada. `DetalleVarianteComponent` lo lee
   (`paramMap` primero, luego `queryParamMap`) y **solo llama a `getOne` si no lo tiene**.
2. **El error se ve.** Nuevo campo `errorCarga` + bloque `.dv-error` en el template. Iba
   obligado: **todo el contenido de esa pantalla cuelga de `*ngIf="varianteSeleccionada"`**, así
   que cualquier fallo la dejaba literalmente en blanco. Con 401/403 el mensaje es específico
   ("no pudimos abrir este producto desde un enlace directo, búscalo en la tienda").

### ⏳ Lo que este fix NO cubre

**El link directo o marcador** — entrar a `/tienda/detalle/{varianteId}` sin pasar por el
catálogo, que es justo el caso de un link compartido por WhatsApp o Facebook. Ahí no hay de dónde
sacar el `productoId` y sigue cayendo en `getOne` (funciona para admin, falla para cliente — ahora
con mensaje en vez de pantalla blanca).

El back ya está construyendo un endpoint público para eso; quedaron en pasar el request/response
antes de que lo usemos. **Cuando exista, cambiar el fallback de `getOne` por ese endpoint** en
`DetalleVarianteComponent.ngOnInit()` y este caso queda cerrado.

### Sin riesgo en el resto

`VarianteService.getAll()` no lo llama ningún componente (método muerto) y `/actuator` no se toca
desde el front — confirmado con grep.

**Archivos modificados:**
- `src/app/variante/detalle-variante/detalle-variante.component.ts` → lee `productoId` de query
  param, `getOne` solo como fallback, `errorCarga`
- `src/app/variante/detalle-variante/detalle-variante.component.html` → bloque `.dv-error`
- `src/app/variante/detalle-variante/detalle-variante.component.scss` → `.dv-error`
- `src/app/variante/buscar/buscar.component.ts` → `irDetalle()` manda `productoId`
- `src/app/favoritos/favoritos.component.ts` → `irDetalle()` manda `productoId`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ No probado en vivo contra QA.

---

## FIX — COMPARTIR POR WHATSAPP/FACEBOOK: LA VISTA PREVIA NO MOSTRABA NINGUNA IMAGEN (2026-08-12)

**Hay que separar dos cosas que se confunden**, porque solo una estaba rota:

| | Qué es | Estado |
|---|---|---|
| **Botón 📤 de la app** (`CompartirService`) | Manda **el archivo de la foto** por el menú del sistema | ✅ Ya funcionaba |
| **Pegar el link** de un producto en WhatsApp | WhatsApp arma su tarjetita leyendo los meta tags de `index.html` | ❌ Sin imagen |

### La vista previa del link nunca mostró foto — ni la genérica

`og:image` apuntaba a `/assets/og-image.jpg`, y **ese archivo no existía**. Verificado contra
producción: `GET https://shop.novedades-jade.com.mx/assets/og-image.jpg` → **404**.

Dos problemas más en el mismo bloque:
1. **La URL era relativa.** WhatsApp y Facebook piden la página desde SUS servidores, así que una
   ruta como `/assets/...` no la resuelven — `og:image` tiene que ser absoluta (`https://...`).
   Aunque el archivo hubiera existido, la tarjeta habría salido igual sin foto.
2. **Faltaba `og:url`** (y `og:site_name`), que es lo que usan para canonicalizar la tarjeta.

**Fix:** se creó `src/assets/og-image.jpg` (copia de `venta-bolsas.jpg`, 360 KB — por debajo del
límite de ~600 KB que WhatsApp tolera para la vista previa) y se pasaron `og:image`/`twitter:image`
a URL absoluta, más `og:url`, `og:site_name`, `og:image:type` y `og:image:alt`.

⚠️ **Es una imagen FIJA, la misma para toda la tienda.** Compartir el link de una blusa muestra
esa foto genérica, no la blusa. Que salga la foto del producto compartido **requiere render en
servidor (SSR) o un servicio que sirva meta tags por producto**: los bots de WhatsApp/Facebook
**no ejecutan JavaScript**, y este build es 100% cliente
(`@angular-devkit/build-angular:browser`, sin `@angular/ssr` ni `@nguniversal`) — solo leen el
`index.html` tal cual. El back lo confirmó por su lado y ofreció planearlo si se pide.

### Bug del botón compartir en computadora

`puedeCompartirArchivo()` preguntaba solo `navigator.share && navigator.canShare`, sin verificar
**este archivo en concreto**. En Windows, Chrome y Edge sí exponen esas APIs pero varios no
aceptan archivos → se entraba por la rama de móvil, `navigator.share({ files })` fallaba, y el
`catch` terminaba **descargando la imagen sin avisar**: el admin daba clic en compartir y le
aparecía un archivo en Descargas en vez del cuadro con la imagen para copiarla.

**Fix:** `navigator.canShare({ files: [archivo] })`, que es la pregunta correcta.

### Conectado el resolver público `varianteId → productoId`

El back entregó `GET /tienda/v1/variante/{varianteId}/producto-id` → `{ data: { productoId } }`,
público. `DetalleVarianteComponent` ya lo usa cuando el `productoId` no viene en la URL (link
directo), con **`catchError` que cae a `getOne` como respaldo** mientras el endpoint termina de
desplegarse en todos los ambientes — así funciona antes y después del deploy del back. Cuando
esté en QA y prod, ese `catchError` se puede quitar.

**Archivos modificados:**
- `src/index.html` → bloque Open Graph corregido
- `src/assets/og-image.jpg` → **archivo nuevo** (antes se referenciaba sin existir)
- `src/app/shared/compartir.service.ts` → `puedeCompartirArchivo(archivo)`
- `src/app/variante/service/variante.service.ts` → `resolverProductoId()`
- `src/app/variante/detalle-variante/detalle-variante.component.ts` → usa el resolver

**Verificado:** `ng build --configuration=production` sin errores, y confirmado que el build de
salida trae `dist/assets/og-image.jpg` y la URL absoluta en `dist/index.html`.

### Compartir en computadora: botón "📋 Copiar imagen" (2026-08-12)

**Por qué no puede ser automático:** una página web **no puede** meterle la imagen a WhatsApp Web
— son sitios distintos y el navegador lo prohíbe. No hay forma de saltarse eso. Lo más cerca es
dejar la imagen en el portapapeles de un clic, para que el admin solo pegue con `Ctrl + V`.

Antes el diálogo de escritorio solo decía "clic derecho → copiar imagen". Ahora, si el navegador
lo soporta (`navigator.clipboard.write` + `ClipboardItem`), aparece un botón que la copia directo;
si no, cae al texto de siempre.

**Dos detalles que hacen que funcione, y sin los cuales falla en silencio:**

1. **La copia va dentro del listener del clic del botón.** El navegador exige un gesto *reciente*
   del usuario para escribir en el portapapeles, y el clic original del botón de compartir ya
   expiró después de esperar la descarga de la imagen. Copiar fuera de ese listener tira
   `NotAllowedError`.
2. **Hay que convertir el JPEG a PNG** (`aPng()`, vía canvas). El portapapeles solo acepta
   `image/png` para imágenes: pasarle el JPEG tal cual también tira `NotAllowedError`. Por eso el
   helper existe aunque parezca un rodeo innecesario.

**Archivo modificado:** `src/app/shared/compartir.service.ts` → `didOpen` con el botón, `aPng()`.

**Verificado con `ng build --configuration=development` sin errores.**
⚠️ No probado en un navegador real — el comportamiento del portapapeles varía por navegador y el
botón está protegido con `try/catch` que cae al mensaje de clic derecho si falla.

---

## FEAT MÓDULO FLORES ETERNAS — CATÁLOGOS DE ADMINISTRACIÓN (2026-08-13)

> Primera etapa del módulo nuevo del back (`CAMBIOS_FRONT.md`, 2026-08-12): ramos de rosas
> eternas configurables. Es una **línea de producto aparte**, no tiene relación con el catálogo
> de bolsas/blusas/perfumes.

### ⚠️ Alcance — solo administración, y por qué

Se hicieron **únicamente los catálogos de admin**. La pantalla del cliente (configurador del ramo
con precio en vivo) **NO se hizo a propósito**: el back no entregó todavía el endpoint para
confirmar un ramo cotizado como pedido real (falta decidir cómo se engancha con
`Pedido`/`DetallePedido`). Construirla ahora dejaría una pantalla que calcula un precio bonito y
termina en un botón que no puede hacer nada.

Además, sin catálogos cargados no hay nada que cotizar ni que probar — así que este era el orden
obligado de todos modos.

### Endpoints conectados (`FloresService`)

| Catálogo | Base URL | Paginación |
|---|---|---|
| Tipos de flor | `/v1/tipos-flor` | `page` **base-0** + `size` |
| Cantidades válidas | `/v1/cantidades-flor` | `page` **base-0** + `size` |
| Accesorios | `/v1/accesorios-ramo` | `page` **base-0** + `size` |
| Frases de listón | `/v1/frases-liston` | `page` **base-0** + `size` |
| Ramos preconfigurados | `/v1/ramos-armados` | `pagina` **base-1** + `size` |
| Motor de cálculo | `/v1/flores/validar-cantidad`, `/v1/flores/calcular-precio` | — |

⚠️ **Las dos convenciones de paginación conviven a propósito** y el back lo advirtió: los 4
catálogos usan el CRUD genérico (base-0) y ramos-armados usa rutas propias estilo
`/v1/promociones` (base-1). No "corregir" una por la otra.

Reglas ya conocidas del CRUD genérico, iguales que en `lugares-entrega` y `cinta`: `getAll` exige
`page`/`size` (sin default), `delete` recibe el id **crudo** en el body (`1`, no `{ id: 1 }`), y
`save`/`update` reciben la entidad completa.

### Reglas de negocio que la UI tiene que respetar

- **El papel se cobra solo** cuando el ramo lleva **más de 10 flores** — el back lo agrega, el
  front no lo manda ni se lo pregunta al cliente. Con 10 o menos es un accesorio opcional más.
  Por eso el accesorio marcado `esPapel` es especial: **debe haber máximo uno activo**, y la
  pantalla ya bloquea marcar un segundo (`yaHayPapel`).
- **Frase de listón personalizada** → el precio no existe todavía: el total es **provisional**,
  se pide **50% de anticipo** y hay que mostrar el `avisoNoReembolso` **tal cual viene del back**.
  Es política de negocio, no redacción libre del front.
- **Cantidades válidas** son las que "cierran bien el círculo". Si el cliente pide otra, el back
  ofrece la más cercana hacia abajo y hacia arriba.

### Decisiones de diseño

- **Una sola pantalla con 4 pestañas**, no 4 entradas de menú. Son catálogos diminutos; cuatro
  links separados serían ruido en el sidebar (ver "REGLA — CRITERIO DE ORGANIZACIÓN DEL SIDEBAR").
- **Grupo propio en el menú (🌹 Flores eternas)**, no dentro de Inventario: es una línea de
  producto aparte con sus propios catálogos — mismo criterio por el que Rifas es un grupo aparte
  aunque también genere dinero.
- **Los 4 catálogos se cargan juntos** con un `forkJoin` aunque solo se vea una pestaña: son
  listas chicas y el alta de cantidades necesita los tipos de flor para su selector. Cargarlos por
  separado obligaría a recargar al cambiar de pestaña.
- **`ICantidadFlor.tipoFlor` es opcional** (`tipoFlor?:`) aunque el back siempre lo mande — es un
  objeto anidado de otra tabla. Lección #2 del módulo rifas: si un solo renglón llega con eso en
  `null`, un acceso directo tira `TypeError` a media `*ngFor` y **desaparece el resto de la
  lista** (se ve como "solo aparece el primero", que despista muchísimo).
- **Guard de doble-submit en toda la cadena** (Lección #10): `ejecutar()` corre mutación →
  recarga, y `guardando` se libera **solo al terminar la recarga**.

### ⚠️ VERIFICADO EN QA: los GET "públicos" responden 401

El back documentó que los GET de los 4 catálogos y los 2 de cálculo son **públicos, sin login**
(el cliente configura su ramo sin sesión). Comprobado hoy contra QA sin token:

```
/v1/tipos-flor/getAll        → 401
/v1/flores/validar-cantidad  → 401
/v1/cinta/activos            → 200   ← este sí es público y sí está desplegado
```

⚠️ **El 401 no prueba por sí solo que falte el `permitAll`**: una ruta inventada
(`/v1/no-existe-nada/getAll`) también responde 401, así que ese código es la respuesta genérica
para todo lo no permitido — o sea, no distingue "no desplegado" de "requiere token". Lo que sí
dice algo es la comparación con `cinta/activos`: público y desplegado, responde 200.

**Conclusión: o el módulo no está en QA todavía, o le falta el `permitAll`.** Reportado al back.
No bloquea esta entrega (las pantallas son admin y mandan token), pero **sí bloquearía la pantalla
del cliente** cuando se haga.

**Archivos nuevos:** `src/app/flores/models/flores.model.ts`,
`src/app/flores/service/flores.service.ts`,
`src/app/flores/catalogos/catalogos-flores.component.ts/.html/.scss` (BEM `fl-`),
`src/app/flores/flores.module.ts`, `src/app/flores/flores-routing.module.ts`

**Archivos modificados:** `src/app/app-routing.module.ts` (ruta lazy `/flores`),
`src/app/navbar/navbar.component.html` + `.ts` (grupo 🌹 + `GROUP_ROUTES`)

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ **No probado en vivo** — depende de que el back confirme el estado del módulo en QA.

---

## FLORES ETERNAS — MULTICOLOR: CATÁLOGO DE COLORES + UMBRAL CONFIGURABLE (2026-08-13)

> Segunda ronda del módulo. El back rehízo el modelo para soportar ramos de varios colores y
> respondió las 5 dudas abiertas. Esto actualiza lo que ya estaba y agrega lo que faltaba.

### ⚠️ Cambio de modelo: la especie y el color se separaron

Antes "Rosa roja" y "Rosa blanca" tenían que ser dos `TipoFlor` distintos, lo que obligaba a
duplicar precio y cantidades válidas por cada color. Ahora:

| | Qué es | Tiene |
|---|---|---|
| `TipoFlor` | La **especie** ("Rosa eterna") | Precio por flor + tabla de cantidades válidas |
| `ColorFlor` (nuevo) | Un **color vendible** de esa especie | Stock propio + variante interna |

`ColorFlor` **hereda** precio y cantidades de la especie — no los duplica. **`TipoFlor` ya no
tiene stock ni variante propia**; lo vendible es el color.

Confirmado por el back: **la validación del círculo es por el total de la especie**, sin importar
cómo se reparta entre colores — que era nuestra sospecha, pero no la asumimos.

### Contrato de cálculo — cambió la forma del request

`calcular-precio` ya no recibe `tipoFlorId` + `cantidadFinal`, sino una lista:

```json
{ "colores": [ { "colorFlorId": 1, "cantidad": 6 }, { "colorFlorId": 2, "cantidad": 6 } ], ... }
```

Un ramo de un solo color es una lista de una entrada. **Todos los colores deben ser de la misma
especie**, si no responde 400. La respuesta trae `coloresCalculados[]` — **una línea por color,
cada una con su `varianteId`** — y al armar `savePedido` va una línea de detalle por cada una
(mismo patrón que ya se usaba para accesorios).

`validar-cantidad` **no cambió**: sigue siendo por especie.

### El umbral del papel ahora lo mueve el dueño

Antes estaba fijo en el código del back (>10 flores), así que cambiarlo exigía un despliegue.
Ahora `AccesorioRamo.umbralActivacion` es un campo editable desde la pantalla de accesorios:
el accesorio marcado `esPapel` se agrega solo cuando `cantidadFinal > umbralActivacion`.
**`null` = nunca se agrega solo** (queda opcional siempre).

⚠️ **El dueño todavía no ha definido el número.** Describió el comportamiento ("con 1 flor se
pregunta, con 2 o 3 ya va incluido") pero no confirmó si el corte es 2, 3 o 4. Hasta que lo
diga, el campo se queda vacío y el papel nunca se agrega automático.

### El anticipo: el back eliminó un número que era falso

`calcular-precio` devolvía `montoAnticipoSugerido` = 50% del total del ramo completo. **No
representaba nada real** — el anticipo es sobre el precio de la frase personalizada, que en ese
momento todavía no existe. El back lo quitó; ahora solo devuelve `avisoFrasePendiente` (texto,
sin monto).

El monto real nace **solo** al aprobar la frase (`validar-frase`), que crea un pedido `APARTADO`
separado y devuelve `pedidoAnticipoId` + `montoAnticipo`. El cobro se registra con el módulo de
abonos que ya existe: `POST /v1/abonos/{pedidoAnticipoId}`.

**Regla para la pantalla:** el texto que se le muestra al cliente al cotizar **no debe mencionar
ningún número**. Usar `avisoFrasePendiente` tal cual viene.

### Variantes sombra — el back las excluyó de todos lados

Cada color de flor crea por dentro un producto/variante real (así `savePedido` funciona sin
cambios). Se reportó el riesgo de que aparecieran en la tienda y el back agregó
`Producto.esCatalogoInterno`, aplicado en: buscador público, filtros de admin, listados generales,
**chatbot** y **reporte de más vendidos** (estos dos los encontraron ellos, no estaban en el
reporte). Los selectores de promoción y rifa quedan cubiertos porque reusan el buscador general.

**Decisión del dueño registrada:** flores en sección aparte, y **no se venden flores por unidad**.

⚠️ **Riesgo residual que dejaron abierto:** si un admin edita el stock de una variante interna
desde la pantalla normal de variantes (sabiéndose el id), se desincroniza con lo que muestra el
catálogo de colores — no hay sincronización en ese sentido. Ahora es improbable porque ya no
aparecen en ningún buscador, pero no es imposible.

### Lo implementado en esta ronda

- **Modelos:** `IColorFlor`/`IColorFlorRequest`, `umbralActivacion` en accesorios, `colorFlorId` +
  `imagenUrl` en ramos armados, `colores[]`/`coloresCalculados[]` en el cálculo,
  `avisoFrasePendiente` (fuera `montoAnticipoSugerido`), y las interfaces del ticket de producción
  y de la bandeja de frases.
- **Servicio:** CRUD de colores + `coloresPorTipoFlor()`, `guardarDetalleRamo()`,
  `obtenerDetalleRamo()`, `frasesPendientes()`, `validarFrase()`.
- **Pantalla de catálogos:** pestaña nueva **🎨 Colores** (especie + color + existencias) y el
  campo **«desde»** en accesorios para el umbral.

### Lo que sigue faltando (pantallas, no contrato)

El contrato ya está completo — no quedan dudas abiertas con el back. Falta construir:
1. **Configurador del cliente** (elegir especie → cantidad → repartir entre colores → accesorios →
   listón → total en vivo → `savePedido` + ticket de producción).
2. **Bandeja de frases pendientes** (admin): listar, aprobar con precio, y enlazar el anticipo con
   `/abonos`.
3. **Ramos preconfigurados** (admin + catálogo público) — decisión de negocio pendiente: el dueño
   dijo "solo ramos configurables" y falta confirmar si eso excluye los preconfigurados.

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**
⚠️ **No probado contra QA:** al terminar, el backend de QA estaba respondiendo 502 (desplegando,
presumiblemente la migración `migration_flores_eternas_multicolor.sql`, que el back reportó como
pendiente). Sin esa migración no existen `ColorFlor`, `umbralActivacion` ni `esCatalogoInterno`.

### FIX — los formularios se veían como casillas con "0" sin decir qué eran (2026-08-13)

**Reportado al probar en QA:** *"dice tipo flor bien, después dice 0 pero no dice qué… en color
lo mismo, cantidad dice 0 0 que no sé qué"*.

**Causa:** cada campo se apoyaba únicamente en su `placeholder` para identificarse, pero los
numéricos arrancaban con valor `0` — y **el placeholder solo se ve cuando el campo está vacío**.
Resultado: filas de casillas con "0" y ninguna pista de qué era cada una.

**Fix, dos partes:**
1. **Etiqueta visible por campo** (`.fl-field` + `.fl-lbl`) — no desaparece al escribir, que es
   justo lo que fallaba del placeholder.
2. **Los numéricos arrancan vacíos** (`null`, no `0`), así el ejemplo en gris (`0.00`, `Ej. 12`,
   `Vacío = nunca`) sí se ve. Las guardas de validación pasaron a `!campo` en vez de `campo <= 0`,
   y al guardar se manda `?? 0` donde el 0 es un valor legítimo (stock, precio de accesorio).

**Lección aplicable a cualquier formulario nuevo:** un `placeholder` NO sirve como etiqueta en un
campo numérico inicializado en 0 — nunca se llega a ver. O se deja el campo vacío, o se pone
etiqueta aparte. Lo ideal, ambas.

**Verificado visualmente** con Playwright sobre una vitrina estática del template real
(`ng build` compila igual con o sin etiquetas — esto no lo detecta el build, es la misma lección
de "ng build no valida diseño").

---

## FLORES ETERNAS — PRECIO DEL PAPEL POR PLIEGO EN EL CATÁLOGO DE ACCESORIOS (2026-08-13)

> Conecta el contrato del back documentado en `## 🟡 BACK — el precio del papel ahora escala con
> la cantidad de flores...` del repo compartido. Migración `migration_flores_eternas_papel_pliego.sql`
> ya corrida en QA y prod (confirmado por el dueño).

**Qué cambió:** `AccesorioRamo` gana `floresPorPliego: number | null` — solo aplica al accesorio
marcado `esPapel=true`. Configurado, `precio` deja de ser un monto fijo y pasa a significar
**precio por pliego**: el costo real es `ceil(cantidadFlores / floresPorPliego) × precio` (un
pliego empezado se cobra completo). `null` = comportamiento de antes, precio fijo único sin
importar la cantidad — 100% retrocompatible.

**Front — pestaña 🎀 Accesorios de `catalogos-flores` (`/flores/catalogos`):**
- Nuevo campo "Flores por pliego" en el form de alta y en la edición inline, **visible solo
  cuando `esPapel` está marcado** (no aplica a ningún otro accesorio).
- Badge `{{ floresPorPliego }} flores/pliego` + sufijo `/pliego` en el precio de la fila, cuando
  aplica.
- `ICalcularPrecioResponse` e `IRamoArmado` (`flores.model.ts`) ganan `pliegosPapel` y
  `precioUnitarioPapel` — todavía sin consumir en ninguna pantalla porque el configurador del
  cliente y la pantalla de Ramos armados no existen aún (ver pendientes más abajo).

**⚠️ Advertencia dejada documentada en el modelo, para cuando se arme el configurador del
cliente:** al mandar la línea del papel en `POST /v1/pedidos/savePedido`, hay que usar
`cantidad = pliegosPapel ?? 1` y `precioUnitario = precioUnitarioPapel ?? precioPapel` — **nunca**
`precioUnitario = precioPapel` (el total ya multiplicado) cuando `pliegosPapel` no es `null`. El
back valida que `precioUnitario` coincida exacto con el precio de catálogo del producto interno
(que ahora es el precio *por pliego*), y rechaza el pedido si no coincide.

**Acción pendiente del dueño en QA/prod** (no es del front): editar el accesorio marcado como
papel y ponerle `floresPorPliego`; y volver a guardar (sin cambios) cualquier `RamoArmado` que ya
existiera antes de este cambio, porque quedó con `precioPapel`/`precioTotal` congelados con la
fórmula vieja.

**Archivos modificados:**
- `src/app/flores/models/flores.model.ts` → `IAccesorioRamo.floresPorPliego`,
  `ICalcularPrecioResponse`/`IRamoArmado` con `pliegosPapel`/`precioUnitarioPapel`
- `src/app/flores/catalogos/catalogos-flores.component.ts` → `nuevoAccesorio.floresPorPliego`
- `src/app/flores/catalogos/catalogos-flores.component.html` → campo condicional + badge

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.**

### Aclaración pendiente — modelo de configuración vs. flujo del cliente

El dueño preguntó si el flujo va a ser: él configura las flores que lleva, los accesorios y el
precio de cada flor y de las demás cosas que puede llevar el ramo — **confirmado que sí**, así
es como ya está: `Tipos de flor` (especie + precio por flor), `Colores` (stock por color, hereda
precio de la especie), `Accesorios` (cada uno con su propio precio, uno puede ser "el papel"),
`Frases de listón` (precio por frase). Eso es **Flujo A** — el cliente arma su propio ramo desde
esos catálogos, con el total calculado en vivo por `POST /v1/flores/calcular-precio`.

Aparte existe **Flujo B**: el dueño también puede preconfigurar `RamoArmado`, ramos completos ya
armados con precio fijo, para que el cliente simplemente elija uno sin armar nada — el dueño
confirmó que YA corrió las migraciones y puede dar de alta ramos armados, pero preguntó **dónde
se le muestran al cliente esos ramos ya armados** (en la tienda, o dentro del propio configurador
como una opción rápida). El dueño eligió empezar por esta pieza (Flujo B) — ver sección siguiente,
ya construida. El configurador del cliente (Flujo A, "arma tu propio ramo") sigue sin construirse.

---

## FLORES ETERNAS — VITRINA PÚBLICA DE RAMOS ARMADOS (Flujo B) (2026-08-13)

**Ruta pública nueva:** `/flores/ramos` → `VitrinaFloresComponent`. Lista los `RamoArmado`
activos (`GET /v1/ramos-armados/activos`, paginado) en un grid de cards — imagen (o placeholder
🌹 si `imagenUrl` es `null`), nombre, especie+color+cantidad, precio total, badges de "papel
incluido" y "N accesorio(s)". Clic en "Ver detalle" abre un modal con el desglose línea por línea
(flores, papel —con el desglose de pliegos si `pliegosPapel`/`precioUnitarioPapel` vienen, ver
sección de arriba—, cada accesorio, total).

**⚠️ Sin botón de compra/carrito todavía, a propósito.** `RamoArmado` no expone ningún
`varianteId` resuelto (ni del color, ni del papel, ni de los accesorios) — esos solo se obtienen
llamando `POST /v1/flores/calcular-precio` en el momento. Conectar esto al carrito/checkout real
es una pieza aparte y más riesgosa (toca `savePedido`, dinero real) — se dejó fuera de esta
entrega para no adivinar la arquitectura de cobro sin confirmarla primero. Lo que hay hoy en su
lugar: botón **"💬 Pedir"** que abre WhatsApp del negocio (mismo dato — `whatsappUrl` — que ya
alimenta el QR de los tickets, vía `NegocioService.getContactosPublicos()`) o, si no está
configurado, un aviso genérico con el nombre y precio del ramo.

**Guards — cambio de estructura:** antes `/flores` completo (módulo `FloresModule`) tenía
`AdminGuardGuard` en `app-routing.module.ts`, porque solo existía la pantalla de catálogos. Con
la vitrina pública agregada, el guard de admin se movió **adentro** de
`flores-routing.module.ts`, solo en la ruta `catalogos` — el módulo en sí ahora solo lleva
`CarritoGuard` (mismo nivel que "Tienda": ni admin ni login son requisito, un visitante anónimo
también puede ver los ramos armados). El default `'' → redirectTo` cambió de `'catalogos'` a
`'ramos'`, porque ahora el tráfico mayoritario de esa ruta es del cliente, no del admin (el link
del sidebar admin sigue apuntando directo a `flores/catalogos`, así que esto no le afecta).

**Menú:** nuevo link directo "🌹 Ramos de flores" (`flores/ramos`), visible para
`!isAnonymous` — mismo patrón que Promociones/Favoritos, fuera del accordion admin "Flores
eternas" (que se queda con un solo ítem, "🌸 Catálogos", intacto).

**Archivos nuevos:**
- `src/app/flores/vitrina/vitrina-flores.component.ts/.html/.scss` (BEM `vr-`)

**Archivos modificados:**
- `src/app/app-routing.module.ts` → guard de `/flores` bajado a `[CarritoGuard]`
- `src/app/flores/flores-routing.module.ts` → ruta `ramos` pública, `AdminGuardGuard` movido a
  `catalogos`, default `'' → 'ramos'`
- `src/app/flores/flores.module.ts` → declara `VitrinaFloresComponent`
- `src/app/navbar/navbar.component.html` → link "🌹 Ramos de flores"

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos**, y con
capturas Playwright (mock de `GET /v1/ramos-armados/activos` + `GET /v1/negocio/contactos`) en
claro y oscuro — grid, badges, y el modal de detalle con el desglose de pliegos se ven correctos
en ambos temas, sin errores de consola atribuibles al cambio.

**Pendiente:** el configurador del cliente (Flujo A) y la integración de compra real de un
`RamoArmado` (Flujo B, "Pedir" → carrito/checkout en vez de WhatsApp) — ambas quedaron fuera de
esta entrega, son decisiones de arquitectura de cobro que hay que confirmar con el dueño antes de
construir.

---

## FLORES ETERNAS — PANTALLA ADMIN "RAMOS ARMADOS" (Flujo B, la mitad que faltaba) (2026-08-13)

> El dueño ya había cargado el catálogo base (tipos/colores/accesorios/cantidades) y reportó que
> la vitrina `/flores/ramos` seguía diciendo "no hay". Causa: `FloresService` ya tenía los métodos
> (`ramoCrear`, `ramosAdmin`, `ramoEditar`, `ramoToggleActivo`) desde que se escribió el modelo,
> pero **ninguna pantalla los llamaba** — no existía forma de armar un `RamoArmado` de verdad.
> Confirmado con grep: cero componentes usaban esos métodos antes de este cambio.

**Ruta nueva:** `/flores/ramos-admin` → `GestionRamosFloresComponent`, admin-only
(`AuthGuard + AdminGuardGuard`, mismo patrón que `catalogos`). Link "🎁 Ramos armados" agregado
como segundo ítem del accordion "🌹 Flores eternas" (junto a "🌸 Catálogos").

**Flujo del formulario:** el admin elige **Especie** primero (`tipos`) — eso filtra los selects
de **Color** y **Cuántas flores** a solo las opciones activas de esa especie (`coloresDeLaEspecie`
/`cantidadesDeLaEspecie`, filtrando client-side por `tipoFlor?.id`, mismos catálogos ya cargados
para `catalogos-flores`). Cambiar de especie limpia color/cantidad (`onCambiarEspecie()`) para no
dejar una combinación inválida sin que se note. Debajo, checkboxes de **accesorios** — el marcado
`esPapel` no pide cantidad (el back la calcula sola según las flores del ramo), el resto sí.
`imagenUrl` es un input de texto plano (mismo criterio que `RamoArmado.imagenUrl` — el admin sube
la imagen por fuera, no pasa por micro_imagenes todavía).

**Al editar:** `RamoArmado` (la respuesta) no expone `tipoFlorId` ni `cantidadFlorValidaId`
directos — solo `colorFlorId` y `cantidad` (el total de flores ya calculado). Se reconstruyen así:
la especie sale de `colores.find(c => c.id === r.colorFlorId)?.tipoFlor?.id`; la cantidad exacta
se busca por coincidencia (`cantidades.find(c => c.tipoFlor?.id === especie && c.cantidad ===
r.cantidad)`) — si no calza con ninguna cantidad válida activa (por ejemplo si se desactivó
después de crear el ramo), el select de cantidad queda sin preseleccionar y el admin debe
elegirla de nuevo antes de guardar.

**Sin `delete`, solo ocultar:** igual que Promociones, `RamoArmado` no tiene endpoint de borrado
— `toggleActivo()` (🟢 Visible / ⚫ Oculto) es la única forma de retirarlo de la vitrina.

**Archivos nuevos:**
- `src/app/flores/ramos-admin/gestion-ramos-flores.component.ts/.html/.scss` (BEM `ra-`)

**Archivos modificados:**
- `src/app/flores/flores-routing.module.ts` → ruta `ramos-admin`
- `src/app/flores/flores.module.ts` → declara `GestionRamosFloresComponent`
- `src/app/navbar/navbar.component.html` + `.ts` → link + `GROUP_ROUTES`

**Verificado con `ng build` sin errores**, y con Playwright contra la app real (`ng serve`,
sesión admin inyectada vía el injector de Angular en modo dev — `window.ng.getComponent()` sobre
`app-navbar` para llamar `AuthenticateService.setAccessToken()` +
`AuthService.setRolesFromToken()` con un JWT de prueba, sin tocar ningún backend) con las 4
llamadas de catálogo y `ramos-admin` mockeadas — lista, badges, y el formulario de edición con los
selects ya poblados y los accesorios preseleccionados se ven correctos en claro y oscuro.
**Esta vez sí verificado el CSS propio del componente** (a diferencia del primer intento con una
vitrina estática contra `dist/styles.css`, que solo refleja variables/estilos GLOBALES — el SCSS
scoped de un componente Angular se inyecta en runtime, nunca aparece en ese archivo; para
componentes admin nuevos, verificar contra la app real corriendo, no contra un HTML suelto).

---

## FLORES ETERNAS — CONFIGURADOR DEL CLIENTE (Flujo A, la pieza que faltaba) (2026-08-13)

> El dueño explicó paso a paso, con mucho detalle, cómo esperaba que funcionara el armado libre
> del cliente — confirmando que coincide con el Flujo A ya documentado (especie → cantidad →
> colores → accesorios → listón, con el papel incluido solo cuando cruza el umbral). Esta es esa
> pantalla. La vitrina de ramos ya armados (Flujo B) y esta pantalla son **independientes** — un
> ramo armado con "Ramos armados" no aparece aquí ni viceversa, cada una alimenta su propia parte
> del negocio.

**Ruta nueva:** `/flores/configurar` → `ConfigurarRamoComponent`, **pública** (mismo nivel que
`/flores/ramos` — ni admin ni login hacen falta para *armar* el ramo y ver el precio; el login
solo se exige al *confirmar* el pedido, igual que en `venta-variante`). Link "🌷 Arma tu ramo" en
el sidebar junto a "🌹 Ramos de flores", y botón "🌷 Armar el mío" en el header de la vitrina.

### El flujo, en 6 pasos (cada uno solo aparece cuando el anterior está resuelto)

1. **Especie** — select de `tipos-flor` activos, con su precio por flor visible.
2. **Cantidad** — el cliente escribe cuántas flores quiere y da "Validar" →
   `POST /v1/flores/validar-cantidad`. Si no "cierra el círculo", aparecen botones **"Usar N
   ($precio)"** con las alternativas que manda el back (`alternativaMenor`/`alternativaMayor`) —
   un clic ahí confirma esa cantidad directo, sin que el cliente tenga que volver a escribirla.
3. **Repartir entre colores** — `GET /v1/colores-flor/por-tipo-flor/{id}` (el endpoint que el
   back construyó justo para esto, ya filtra activos). Un input por color con su stock visible;
   un contador de "faltan N" / "te pasaste por N" hasta que la suma cierre exacto.
4. **Accesorios** — checkbox + cantidad por cada uno. El marcado `esPapel` es especial: si
   `cantidadConfirmada > umbralActivacion` del accesorio, el checkbox se **fuerza marcado y se
   deshabilita** con el badge "incluido por la cantidad de flores" — el cliente no puede
   desmarcarlo. Por debajo del umbral, es opcional como cualquier otro.
5. **Listón** (opcional) — sin listón / frase predefinida con precio / frase propia. La frase
   personalizada no tiene precio todavía — se muestra el aviso del back tal cual
   (`avisoFrasePendiente`), sin inventar ningún monto.
6. **Entrega** (opcional) — lugar de entrega o "recoger en tienda", mutuamente excluyentes (mismo
   patrón ya usado en `venta-variante`).

**Resumen en vivo:** cada cambio relevante (reparto, accesorios, listón, entrega) dispara —
debounced 450ms — `POST /v1/flores/calcular-precio`, que trae ya resueltos los `varianteId` de
cada línea (colores, papel, accesorios, listón). El resumen se pinta línea por línea con el mismo
lenguaje visual que el detalle de la vitrina — incluye el desglose de pliegos del papel
(`pliegosPapel × precioUnitarioPapel`) cuando aplica.

### Checkout — se reutilizó el flujo real, no se inventó uno nuevo

Confirmar el pedido arma las líneas desde la ÚLTIMA respuesta de `calcular-precio` (nunca se
recalculan los precios a mano en el front) y llama `VarianteService.guardarPedidoVariante()` —
el mismo endpoint (`POST /v1/pedidos/savePedido`) que usa `venta-variante` para cualquier compra
normal del cliente. Se copió **tal cual** su manejo ya probado de:
- Resolver el cliente (`idUsuario` → `buscarClientePorIdUsuario` → si no está registrado, manda a
  `/clientes/agregar`; si no hay sesión, manda a `/usuarios/registrar`).
- Verificación de correo (`enviarCodigoVerificacion` + Swal con reenviar, igual que
  `venta-variante`).
- Los 3 mensajes de error ya conocidos del back: "verificar", "completar tus datos", "no es
  válido" (precio desactualizado).

**⚠️ Detalle importante replicado del papel-por-pliego (ver sección de arriba):** la línea del
papel se arma con `cantidad = pliegosPapel ?? 1` y `precioUnitario = precioUnitarioPapel ??
precioPapel` — nunca el total ya multiplicado, porque el back valida el precio unitario contra
el catálogo (que es el precio *por pliego*).

**Después de guardar el pedido:** si hubo listón (de cualquier tipo) o se eligió
lugar/recoger-en-tienda, se llama `POST /v1/flores/pedidos/{pedidoId}/detalle` para dejar esa
info en el ticket de producción — si esa llamada falla, el pedido YA quedó bien guardado y
cobrado, así que se muestra éxito igual (no se bloquea al cliente por un detalle que el admin
puede completar después a mano).

### Lección de esta sesión — `router.navigateByUrl()` fuera de la zona de Angular no dispara las llamadas HTTP de `ngOnInit`

Para probar pantallas **admin** (guardadas) en sesiones anteriores, se venía usando el truco de
`window.ng.getComponent(navbarEl)` + `nav.router.navigateByUrl(...)` desde `page.evaluate()` para
saltarse el login real. Con esta pantalla **pública** (sin guard), el mismo truco hizo que
`ngOnInit()` nunca disparara ninguna llamada HTTP — ni una — aunque el componente sí se
renderizaba (comprobado leyendo el estado real del componente vía `ng.getComponent()`:
`cargandoCatalogo`/`errorCatalogo`/`tipos` se quedaban en sus valores iniciales, como si
`ngOnInit` jamás hubiera corrido). La consola marcaba la pista: *"Navigation triggered outside
Angular zone, did you forget to call 'ngZone.run()'?"*.

**Diagnóstico:** en las pantallas admin, `AdminGuardGuard`/`AuthGuard` corren antes de activar la
ruta — ese paso sí re-entra a la zona de Angular correctamente. Sin ningún guard de por medio
(como esta pantalla pública), la navegación completa —incluida la construcción del componente—
queda fuera de zona, y ahí las peticiones de `ngOnInit` no llegan a dispararse.

**Fix del método de prueba (no del componente — el componente está bien):** para pantallas
**públicas**, verificar con un `page.goto()` directo a la URL (carga de página completa, dentro
del bootstrap normal de Angular) en vez del truco de inyección + `navigateByUrl`. Ese truco sigue
sirviendo, pero solo para pantallas detrás de un guard.

**Segunda trampa del mismo lote:** `page.selectOption(selector, '1')` fallaba con "did not find
some options" contra un `<select>` con `*ngFor` + `[ngValue]` — Angular renderiza esos `<option>`
con `value="idx: valor"` internamente (no el valor plano), así que Playwright nunca encuentra un
`<option value="1">` literal. Fix: `page.selectOption(selector, { index: N })` (posición, no
value) — ya lo eran los mismos `<option>` que en `ramos-admin` y `catalogos-flores`, esto no se
había topado antes en esta sesión simplemente porque nunca se había hecho `selectOption()` contra
uno de ellos (las pruebas anteriores solo abrían formularios ya precargados vía "Editar").

**Archivos nuevos:**
- `src/app/flores/configurar/configurar-ramo.component.ts/.html/.scss` (BEM `cr-`)

**Archivos modificados:**
- `src/app/flores/flores-routing.module.ts` → ruta pública `configurar`
- `src/app/flores/flores.module.ts` → declara `ConfigurarRamoComponent`
- `src/app/navbar/navbar.component.html` → link "🌷 Arma tu ramo"
- `src/app/flores/vitrina/vitrina-flores.component.html` → botón "🌷 Armar el mío" en el header

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos**, y con
Playwright contra la app real (`page.goto` directo, sin inyección de sesión — la pantalla es
pública) mockeando los 6 endpoints que usa (`tipos-flor`, `accesorios-ramo`, `frases-liston`,
`colores-flor/por-tipo-flor`, `lugares-entrega`, `validar-cantidad`, `calcular-precio`): probado
el camino completo (especie → cantidad no válida → sugerencia → repartir colores → accesorios →
listón → resumen) y, por separado, el caso del **papel forzado** (cantidad por encima del
umbral: checkbox marcado y deshabilitado con el badge, precio con el desglose de pliegos) — los
dos en claro y oscuro, sin errores de consola atribuibles al cambio. **No probado el checkout
real** (`guardarPedidoVariante`/verificación de correo) contra un backend de verdad — depende de
que el back tenga corrido `migration_flores_eternas_multicolor.sql` y
`migration_flores_eternas_papel_pliego.sql` en el ambiente donde se pruebe.

---

## FLORES ETERNAS — UN SOLO ACORDEÓN EN EL MENÚ PARA TODO (2026-08-13)

> El dueño, tras ver las pantallas repartidas en el sidebar: "todo lo que tenga que ver con
> rosas eternas hay que tenerlas juntas".

**Antes:** "Flores eternas" existían en el sidebar como **3 lugares distintos**: un acordeón
admin-only con "🌸 Catálogos" + "🎁 Ramos armados", y dos links sueltos fuera de cualquier
acordeón ("🌹 Ramos de flores" y "🌷 Arma tu ramo", visibles a cualquier logueado) — mezclados
entre Favoritos y Chat, sin relación visual con el resto de lo que era "flores".

**Ahora:** un único acordeón **"🌹 Flores eternas"**, visible a **cualquier usuario logueado**
(antes el acordeón completo era `*ngIf="isAdminUser"`) con los 4 ítems juntos, en este orden:
1. 🌹 Ramos de flores (`flores/ramos`) — todos
2. 🌷 Arma tu ramo (`flores/configurar`) — todos
3. 🌸 Catálogos (`flores/catalogos`) — **solo admin**, dentro de un `<ng-container
   *ngIf="isAdminUser">` adentro del mismo `<div class="sb-submenu">`
4. 🎁 Administrar ramos armados (`flores/ramos-admin`, antes decía solo "Ramos armados" — se
   renombró para no confundirse con el ítem 1 "Ramos de flores") — **solo admin**

Las rutas de admin NO cambiaron — siguen protegidas por `AdminGuardGuard` en
`flores-routing.module.ts` exactamente igual que antes. Este cambio es solo de **presentación en
el menú**: quién ve cada link, y que estén agrupados. Un cliente sin rol admin ve el acordeón con
solo los primeros 2 ítems; un admin ve los 4.

**Archivos modificados:**
- `src/app/navbar/navbar.component.html` → un solo `<div class="sb-group">` para `flores` en vez
  de 3 bloques separados
- `src/app/navbar/navbar.component.ts` → `GROUP_ROUTES['flores']` ahora incluye las 4 rutas
  (antes solo las 2 de admin) — así el acordeón "recuerda" quedar abierto sin importar en cuál de
  las 4 pantallas esté parado el usuario

**Verificado con `ng build` sin errores**, y con Playwright contra la app real (inyección de
sesión vía `ng.getComponent()`, hover + click reales sobre el sidebar — no el truco de
`router.navigateByUrl()` fuera de zona, que aquí no hacía falta porque no se navega a ningún
lado, solo se abre el acordeón) confirmando: como admin aparecen los 4 ítems juntos; como cliente
logueado (sin rol admin) aparecen solo los 2 primeros, sin ver "Catálogos" ni "Administrar ramos
armados".

---

## FLORES ETERNAS — "SE COBRA SOLO DESDE" SOLO TENÍA EFECTO EN EL PAPEL, PERO SE PODÍA CONFIGURAR EN CUALQUIER ACCESORIO (2026-08-13)

> El dueño mandó una captura de "Catálogos → Accesorios" con "corona" marcada a la vez como
> `PAPEL` y `AUTOMÁTICO DESDE 10`, y "pasta" con `AUTOMÁTICO DESDE 1` pero sin la marca de papel.
> Confirmó por escrito con el back
> (`CAMBIOS_FRONT.md`, sección "🟢 Umbral del papel"): *"El accesorio marcado `esPapel` se agrega
> solo cuando `cantidadFinal > umbralActivacion`"* — **solo ese accesorio**, ninguno más. El campo
> nunca fue genérico por diseño del back.

**Causa raíz — el formulario dejaba configurar el umbral en CUALQUIER accesorio, sin avisar que
no serviría de nada ahí.** El dueño puso `umbralActivacion=1` en "pasta" (sin marcar `esPapel`)
esperando que se auto-agregara — nunca iba a pasar, el campo se guarda pero el back lo ignora
para cualquier accesorio que no sea el marcado papel. Y para lograr que "corona" sí se
auto-agregara, terminó marcándola como `esPapel=true` — lo cual tiene un efecto colateral real,
no solo de nombre: el sistema empieza a tratar a "corona" como si fuera el envoltorio en todos
lados (resumen del cliente, ticket, reportes dirían "📄 Papel" en vez de "Corona").

**Aclarado con el dueño:** el auto-agregado por cantidad de flores **no va en Catálogos** — va
en el momento de armar el ramo (ya sea "Ramos armados" admin o "Arma tu ramo" del cliente), que
es exactamente donde ya está implementado (`papelForzado` en ambos componentes, fuerza el
checkbox del papel cuando la cantidad cruza el umbral). Catálogos → Accesorios es solo para dar
de alta accesorios sueltos con su precio — el resto (corona, luces, etc.) se eligen a mano al
armar el ramo, sin umbral propio, salvo que el back agregue esa función más adelante (se anotó
como consulta al back — ver `CAMBIOS_FRONT.md` del repo compartido).

**Fix — los 2 campos que solo sirven para el papel («Se cobra solo desde» y «Flores por
pliego») ahora solo aparecen cuando la casilla «Es el papel» está marcada** (antes «Se cobra
solo desde» estaba siempre visible, aunque solo «Flores por pliego» ya tenía esa protección) —
tanto en el formulario de alta como en el de edición en línea. Si se desmarca «Es el papel», el
front limpia esos 2 valores antes de guardar (`agregarAccesorio()`/`guardarEdicion()`), para no
dejar un número guardado sin efecto que confunda después. El badge «automático desde N» de la
lista también se corrigió para solo mostrarse en el accesorio que de verdad tiene ese
comportamiento (`*ngIf="a.esPapel && a.umbralActivacion"`, antes era `*ngIf="a.umbralActivacion"`
a secas — por eso "pasta" mostraba el badge aunque no hiciera nada).

**Bug adicional encontrado de paso — el formulario de EDICIÓN no tenía forma de cambiar «Es el
papel».** Ese checkbox solo existía en el formulario de ALTA — una vez creado el accesorio, no
había manera de corregir el dato desde la UI (habría que borrar y crear de nuevo). Se agregó el
checkbox también al formulario de edición — es lo que le permite al dueño ahora desmarcar
"corona" sin perder el resto de sus datos.

**Pendiente — el dueño no confirmó todavía si corrige el dato de "corona"/"pasta" ya cargado en
QA** (se le explicó el problema y quedó en verlo, no se tocó ningún dato desde aquí).

**Consulta aparte al back, ya escrita en el repo compartido pero sin subir (pendiente de que el
dueño confirme el push):** por qué `POST /v1/flores/validar-cantidad` devolvió `valida: true`
para una cantidad (10) que no estaba entre las únicas 2 registradas en `/v1/cantidades-flor`
para esa especie (48 y 62) — no se pudo determinar desde el front si es un bug o si esa pantalla
no es realmente la fuente de verdad de la validación.

**Archivos modificados:**
- `src/app/flores/catalogos/catalogos-flores.component.html` → hint reescrito; "Se cobra solo
  desde" ahora condicional a `esPapel` (alta y edición); checkbox "Es el papel" agregado a
  edición; badge de la lista corregido
- `src/app/flores/catalogos/catalogos-flores.component.ts` → `agregarAccesorio()` y la rama de
  accesorio en `guardarEdicion()` limpian `umbralActivacion`/`floresPorPliego` cuando `!esPapel`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.** No se
pudo verificar visualmente con Playwright esta vez — el truco de inyección de sesión + navegación
fuera de zona (que sí funcionó para otras pantallas admin esta semana) esta vez dejó el
componente en un estado donde `setTab()` no actualizaba la vista de forma confiable al
interactuar por script (aun cuando los datos sí cargaban) — parece un artefacto propio del método
de prueba, no del código (el patrón `*ngIf="condición" `usado es idéntico al que ya funcionaba
para "Flores por pliego" en el mismo formulario). Revisado el diff a mano con cuidado en su
lugar. Pendiente confirmar visualmente la próxima vez que se toque esta pantalla.
---

## FIX FLORES — EL CONFIGURADOR NO VEÍA LOS COLORES: `lista` vs `data` (2026-08-14)

> Dos bugs distintos que se reportaron juntos como "colores y cantidades no aparecen bien aunque
> están registrados". Solo uno era un bug de verdad; el otro era un mensaje mal mostrado que hizo
> parecer bug algo que no lo era.

### 1. 🔴 `colores-flor/por-tipo-flor` devuelve el arreglo en `lista`, no en `data`

El configurador decía **"esta especie todavía no tiene colores disponibles"** aunque el catálogo
sí tuviera colores dados de alta. `FloresService.coloresPorTipoFlor()` leía `r?.data`, y ese
endpoint deja `data` en `null`.

**Verificado contra QA antes de tocar nada:**
```
GET /v1/colores-flor/por-tipo-flor/1  → { "data": null,  "lista": [ {...}, {...} ] }
GET /v1/colores-flor/getAll           → { "data": [...], "lista": null }
```

⚠️ **Es el único endpoint del módulo que lo hace así.** Se auditaron los demás uno por uno
(`tipos-flor/getAll`, `cantidades-flor/getAll`, `accesorios-ramo/getAll`, `frases-liston/getAll`,
`ramos-armados/activos`, `validar-cantidad`): **todos devuelven en `data`, con `lista: null`**.
No hace falta cambiar ningún otro.

Lo insidioso del bug: la petición respondía **200 correctamente**, así que no había ningún error
en consola ni en la red — solo una lista vacía. Por eso se investigó primero del lado del back.

**Fix:** leer `r?.lista ?? r?.data ?? []` — los dos campos, por si algún día lo normalizan; así
funciona antes y después del cambio.

### 2. 🟠 El front pisaba el mensaje del back y borraba una distinción importante

El dueño reportó que `validar-cantidad` daba por buena una cantidad (10) que no estaba
registrada. **No era un bug del back:** la regla es que las cantidades **por debajo de la más
chica registrada** se aceptan como "venta por unidad" (para vender 1 o 2 flores sueltas sin tener
que registrar cada número). Todo lo demás sí valida estricto.

El back ya distingue los tres casos en el campo `mensaje`:
- `"Cantidad aceptada tal cual, se cobra por unidad."`
- `"Esta cantidad forma bien el circulo."`
- `"Con 55 flores el circulo puede no quedar bien formado."`

Pero el template mostraba un genérico **"— cantidad válida"** hardcodeado, ignorando ese campo.
Con eso, un "se cobra por unidad" se veía idéntico a un "forma bien el círculo" — de ahí la
confusión y toda la ronda de consultas.

**Fix:** nuevo getter `mensajeCantidad` que muestra el `mensaje` del back tal cual. Solo aplica
cuando la cantidad confirmada es la que se validó: si el cliente eligió una de las alternativas
sugeridas, ese mensaje hablaba de la cantidad rechazada y ya no corresponde.

**Regla general que deja esto:** cuando el back manda un `mensaje` pensado para el usuario final,
mostrarlo tal cual en vez de escribir uno propio — si no, se pierden distinciones que el back sí
está haciendo, y se investiga como bug algo que solo estaba mal presentado.

### ⚠️ Decisión de negocio pendiente (el back la dejó abierta)

¿La venta "por unidad" para cantidades chicas se mantiene, o **cualquier** cantidad no registrada
debe rechazarse y sugerir la alternativa más cercana? El back dice que quitarlo es un cambio de
una línea de su lado. Falta que lo decida el dueño.

**Archivos modificados:**
- `src/app/flores/service/flores.service.ts` → `coloresPorTipoFlor()` lee `lista`
- `src/app/flores/configurar/configurar-ramo.component.ts` → getter `mensajeCantidad`
- `src/app/flores/configurar/configurar-ramo.component.html` → usa el mensaje del back

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos**, y con
la forma real de la respuesta comprobada en QA con `curl` (no asumida del documento).

### Pliegos de papel por ramo — configurable desde Cantidades (2026-08-14)

**El dueño lo pidió así:** *"cuántos pliegos necesito para cada ramo, es decir para el de 48
flores, eso se debe configurar"*, y remarcó que **no lo sabe todavía** — *"cuando lo sepa lo puedo
configurar"*.

**Por qué NO es una fórmula:** ya existía `AccesorioRamo.floresPorPliego`, que calcula
`ceil(cantidad / floresPorPliego)`. No le sirve: el papel que lleva un ramo no es proporcional al
número de flores — depende de cómo se arma y del tamaño del pliego que compran. Él sabe que el de
48 lleva 4 y el de 62 lleva 5, y eso no sigue una proporción.

**Lo que entregó el back:** campo `pliegos: number | null` en `CantidadFlorValida`, por el mismo
CRUD de siempre (`/v1/cantidades-flor`). Migración ya corrida en **QA y producción**.

**Prioridad (implementada por el back):** `pliegos` explícito **gana** sobre la fórmula. Si es
`null` → cae a `floresPorPliego`; si tampoco hay → precio fijo de siempre. Ninguna combinación
rompe ni cobra distinto a lo de antes. `RamoArmado` lo hereda solo (ya referencia
`cantidadFlorValidaId`), y el configurador libre lo usa cuando la cantidad final coincide exacto
con una `CantidadFlorValida` que lo tenga configurado.

**⚠️ `AccesorioRamo.precio` del papel es el precio de UN pliego** — confirmado por el back en su
código. Hoy está en `$5.00` funcionando como precio fijo único porque no hay pliegos configurados
en ningún lado. **Pendiente del dueño:** confirmar si ese $5 es lo que cuesta un pliego o si lo
puso pensando en un total.

**Front — lo agregado:**
- `ICantidadFlor`/`ICantidadFlorRequest` → campo `pliegos`
- Pestaña **Cantidades**: input "Pliegos de papel" (placeholder *"Aún no lo sé"*) al agregar y al
  editar, más un badge por renglón que distingue **"N pliego(s)"** de **"pliegos sin configurar"**
  — el dueño va a llenar esto poco a poco, así que necesita ver de un vistazo cuáles le faltan.
  El badge de pendiente es gris neutro, NO rojo: estar vacío es el estado esperado, no un error.
- Configurador y ramos armados: **sin cambios**, ya leían `pliegosPapel`/`precioPapel` del back.

### El papel desaparece de las opciones cuando ya va incluido

Antes se mostraba en la lista de accesorios como casilla marcada y bloqueada, con un badge
"incluido por la cantidad". Generaba la duda de *"¿por qué no la puedo quitar?"*. Ahora, cuando
`papelForzado` es true, se saca de la lista (getter `accesoriosSeleccionables`) y se muestra un
aviso — el cobro sigue visible en el resumen con su desglose de pliegos.

**Verificado contra QA que NO se cobra doble** cuando el front igual lo manda en `accesorios`: el
back deduplica (48 flores con y sin mandarlo → mismo total, $1,205). Por eso no se tocó la lógica
del request.

### FIX — el umbral del papel es ESTRICTAMENTE MAYOR, y la etiqueta decía lo contrario (2026-08-14)

**Reportado:** *"eligió el de 20, ya lleva configurado el papel, no debería aparecer"* — pero el
papel seguía saliendo en «¿Quieres algún accesorio?».

**No era el filtro** (`accesoriosSeleccionables` funciona). Era la semántica del umbral.
Comprobado contra QA con el umbral en 20:

```
ramo de 19 → papel automático: NO
ramo de 20 → papel automático: NO   ← el caso reportado
ramo de 21 → papel automático: SÍ
```

El back compara `cantidadFinal > umbralActivacion` (**estrictamente mayor**), pero la etiqueta
del catálogo decía **«Se cobra solo desde»**, que se lee inclusivo. El dueño puso 20 esperando
"de 20 en adelante" y obtuvo "a partir de 21".

**Fix (solo texto, sin tocar la lógica):** la etiqueta pasa a **«Obligatorio con más de»**, el
badge del listado a "automático con más de N", y el hint explica el caso borde: *"si pones 20, el
papel entra a partir de 21; para que un ramo de 20 ya lo incluya, pon 19"*.

⚠️ **Pendiente de decidir:** si conviene pedirle al back que sea `>=` en vez de `>`. Es más
natural de leer ("desde 20" = 20 incluido) pero cambia el comportamiento de lo ya configurado.
No se pidió todavía.

### FIX — el papel mostraba $5 cuando el cobro real eran $15

**Reportado:** *"cuando no sea un ramo seleccionado sí aparece que si quiere papel, pero no
aparece el precio"*.

La casilla mostraba `accesorio.precio` = **$5.00**, pero ese precio es **por pliego**. Con el
dueño ya configurando `pliegos` por cantidad (20→3, 48→5, 62→7), un ramo de 20 cobra **$15**.
Verificado en QA: marcar el papel con 20 flores devuelve `accesoriosCalculados: ["Papel $15"]`.
O sea el cliente veía $5, marcaba, y el total le subía $15.

**Fix:** el configurador ahora carga también `cantidades-flor` (público) y calcula lo que se va a
cobrar **antes** de que el cliente marque la casilla:

```
Papel — 3 pliego(s) × $5.00 = $15.00     ← cuando la cantidad tiene pliegos configurados
Papel — $5.00 por pliego                 ← cuando no (venta por unidad o sin configurar)
```

Getters nuevos: `pliegosDelRamo` (busca la cantidad confirmada en el catálogo) y
`precioPapelEstimado`. Los demás accesorios siguen mostrando su precio plano — solo el papel se
cobra por pliego.

### ⚠️ Select-on-focus en inputs numéricos — arreglo aplicado pero SIN verificar

El listener global de `app.component.ts` usaba solo `focusin` + `select()`. Con **clic** eso no
alcanza: la secuencia es `mousedown → focusin (seleccionamos) → mouseup`, y ese mouseup coloca el
cursor y **borra la selección**. Funcionaba con Tab, no con clic — que es como se usa siempre.

Se agregó cancelar ese primer `mouseup` (con detección de arrastre, para no romper la selección
manual de un pedazo del texto).

⚠️ **La verificación automática no fue concluyente:** el test con Playwright dio el mismo
resultado con y sin el arreglo (el clic sintético no reproduce el borrado de selección del clic
real). **Falta comprobarlo a mano en un navegador**: dar clic en un campo con "0", escribir, y
confirmar que reemplaza en vez de quedar "025".

### FIX — el aviso de "no cierra el círculo" bloqueaba en vez de avisar (2026-08-14)

**Reportado:** *"puse 22 y me dijo que 20 se armaba, pero yo había elegido 22"*.

**El back solo ADVIERTE, no prohíbe.** Su mensaje literal es *"Con 22 flores el circulo **puede**
no quedar bien formado"*, y `calcular-precio` acepta y cobra esa cantidad sin chistar —
verificado en QA: 22 flores → 200, total $555.

Pero la pantalla solo ofrecía las dos alternativas ("Usar 20" / "Usar 48"): **no había forma de
seguir con lo pedido**. Quien quería 22 terminaba llevándose 20 sin haberlo decidido.

**Fix:** tercer botón **"Seguir con N"** con su precio, visualmente distinto de las alternativas
(borde, no relleno) para que no parezca la opción recomendada ni quede escondida. Nuevo método
`continuarDeTodosModos()`.

Y como al continuar la cantidad NO es una de las válidas, el recuadro de confirmación deja de ser
un ✅ verde: pasa a ⚠️ ámbar (`cantidadConAviso`) mostrando el mensaje real del back, para que el
cliente no crea que su ramo va a quedar como los de tamaño estándar. `mensajeCantidad` ya no
exige `valida` para mostrar el mensaje del back — así el aviso viaja tal cual en los dos casos.

**Lección (segunda vez en este módulo):** cuando el back manda un mensaje con "puede", es una
advertencia, no un bloqueo. Antes se había perdido la distinción entre sus tres mensajes por
mostrar un texto genérico; ahora se perdía la distinción entre "avisar" y "prohibir". El criterio
es el mismo: **la decisión es del usuario, el sistema informa.**

### FIX — el papel se oculta POR COMPLETO al cliente (2026-08-14)

**Corrección del dueño**, tras el fix anterior: *"el papel no se muestra en el armado del ramo
para el cliente, ese va por default si está en el rango pero **se cobra internamente**, y lo
sigues mostrando como 3 × 15"*.

El fix previo solo lo sacaba de la lista **cuando era automático**, y además le había puesto el
desglose "3 pliego(s) × $5.00 = $15.00". Seguía visible en dos lados:
1. La lista de accesorios, cuando NO era automático (el caso del ramo de 20 con umbral 20).
2. El resumen, como renglón propio `📄 Papel (3 pliego(s) × $5.00) — $15.00`.

**Ahora:** el papel **nunca** aparece — ni como opción, ni como línea, ni como aviso. No es una
decisión del cliente en ningún caso: si el ramo está en rango, el back lo agrega y se cobra por
dentro; si no lo está, no se cobra.

⚠️ **El costo NO se esconde del total, se funde en la línea de flores** (`subtotalFlores` =
`precioBase + precioPapel`). Quitar el renglón sin sumarlo ahí habría dejado un descuadre visible:
las líneas no darían el total y el cliente lo notaría. **Verificado contra QA** (48 flores +
Corona): línea de flores $1,225 + accesorios $50 = **$1,275**, igual al `total` del back.

También se dejó de mandar el papel en `accesorios` (antes se auto-marcaba). El back lo agrega
solo; mandarlo era inofensivo porque deduplica —probado: 48 flores con y sin mandarlo dan el
mismo total— pero es más limpio no depender de eso.

**Conflicto con una instrucción anterior, pendiente de aclarar:** al describir el flujo, el dueño
había dicho que con 1 o 2 flores *"se le pregunta si quiere papel"*. Con este cambio ya no se
pregunta nunca. Si quiere recuperar esa pregunta para ramos chicos, es volver a listarlo solo
cuando `!papelForzado` — pero entonces vuelve a ser visible, que es justo lo que pidió quitar.

### Campos de configuración de urgencia + costo del material (2026-08-14)

Tres cosas que el back confirmó y ya se pueden llenar desde las pantallas. **No conectan ningún
cobro por sí solas** — por eso se agregaron sin esperar al redespliegue de QA.

| Pantalla | Campo | Para qué |
|---|---|---|
| Tipos de flor | **Costo del material ($)** (`precioCosto`) | Lo que a él le cuesta la flor. No se le muestra al cliente: el back lo sincroniza al producto sombra y de ahí sale el margen en los reportes de ganancia, igual que cualquier producto |
| Cantidades | **Mínimo de horas** (`horasMinimasAnticipacion`) | Por debajo de eso el pedido **se rechaza** (un ramo de 100 para mañana no se puede) |
| Cantidades | **Extra de un día para otro ($)** (`precioUrgencia`) | Lo que se cobra de más cuando sí se puede pero es con prisa |
| Lugares de entrega | **Envío ($)** y **Horas extra** | Solo los usa flores eternas — marcados con 🌹 en la pantalla para que no se lean como algo que afecte a todos los pedidos |

⚠️ **`horasMinimasAnticipacion` y `precioUrgencia` NO son lo mismo, y confundirlos cuesta dinero:**
la primera decide si **se puede**; la segunda, si **se cobra extra**. Un ramo que no da tiempo se
rechaza, no se cobra más caro.

**El campo de mano de obra en Cantidades se dejó pero en desuso** (placeholder "Va en el precio
por flor"). La mano de obra terminó yendo dentro de `TipoFlor.precioPorFlor` — decisión del dueño,
y además escala sola con el tamaño del ramo. No se quitó de la pantalla por si cambia de opinión;
el back lo ignora mientras esté en `null`.

### El contrato de urgencia — lo que falta conectar y por qué está en pausa

El back entregó el flujo completo, **pero QA todavía corre un build anterior al fix** (lo
confirmaron probando en vivo: llega `precioUrgencia` pero no `entregaValida` ni `requiereAnticipo`).
Hasta que redesplieguen, ese build **todavía tiene el bug del 150%**.

Contrato ya acordado, para cuando se conecte:

```
calcular-precio  → entregaValida:false + mensajeEntrega   → NO se puede pedir, corregir fecha
                 → requiereAnticipo:true                   → savePedido con tipoPedido:'APARTADO'
                 → montoAnticipoSugerido (50% del total)   → POST /v1/abonos/{pedidoId}
```

**El 50% es enganche del total, no dinero extra** — ramo de $960 → $480 ahora, $480 al entregar.
Lo confirmó el dueño con números después de que la primera redacción del back sugería cobrar 150%.

`precioUrgencia`, igual que `precioManoDeObra`: **sumado en `total`, sin línea aparte** para el
cliente.

**Archivos modificados:** `flores.model.ts` (`precioCosto`, `horasMinimasAnticipacion`,
`precioUrgencia`, `fechaHoraEntrega`, y los 4 campos nuevos del response),
`lugar-entrega.model.ts` (`costoEnvio`, `horasExtraAnticipacion`),
`catalogos-flores.component.ts/.html`, `gestion-lugares.component.ts/.html/.scss`.

**Verificado con `ng build` sin errores.** ⚠️ No probado contra QA: estaba en 502 (redesplegando)
durante todo el cambio.

## FEAT FLORES — PANTALLA DE CONFIGURACIÓN DE ENTREGAS (2026-08-14)

> ⚠️ **Construida contra un contrato que el back todavía NO implementó.** Es deliberado: el dueño
> llevaba varias vueltas de diseño hablado y necesitaba ver la pantalla para corregirla antes de
> que nadie construyera la tabla. La pantalla carga, se puede revisar y criticar; **guardar no
> funciona** hasta que existan los endpoints, y lo dice con un aviso visible.

### La regla de negocio que implementa

El dueño da de alta, **por tamaño de ramo**, cuánto tarda en armarlo y a qué hora lo entrega:

```
Ramo de 48
  Normal:   3 días, entrego a las 16:00
  Urgente:  1 día, entrego a las 18:00, pedir antes de las 12:00, +$300
```

Con eso, la pantalla del cliente podrá ofrecerle **solo fechas que el taller sí puede cumplir**
(un calendario que deshabilita lo imposible) en vez de dejarlo pedir cualquier cosa y rechazarla
después. Fue propuesta del dueño y es mejor que lo que se venía diseñando: **el error no puede
ocurrir**, así que se cae la necesidad de rechazar y recotizar.

### Reglas que hay que respetar al tocar esto

- **El redondeo es HACIA ARRIBA.** Una cantidad sin configuración propia usa la del tamaño
  configurado **inmediato superior** — 37 flores se maneja con las reglas del 48. Confirmado
  explícitamente por el dueño. El porqué, para que no se "optimice" después: un ramo de 30 da más
  trabajo que uno de 24; tomar las reglas del 24 comprometería al taller a un plazo que no puede
  cumplir. Redondear hacia arriba siempre juega a favor del taller.
- **Si piden más que el tamaño más grande configurado, se bloquea** y se le pide al cliente que
  contacte al admin. Es el único caso sin salida.
- **El bloque urgente es opcional.** Hay tamaños que no se pueden apurar por ningún motivo (el de
  100 para mañana). Sin `diasUrgente`, al cliente no se le muestra el botón de urgente.
- **La hora límite no es cosmética.** Vale para pedir *y para pagar*: si el pago se pasa de esa
  hora, el pedido se recotiza con el cargo urgente. Esa validación **tiene que vivir en el
  servidor** — si queda solo en el front, el cliente deja la pantalla abierta y paga después con
  el precio viejo.

### Por qué NO se guardó en `localStorage` mientras llega el back

Se consideró y se descartó: es exactamente el error que ya se cometió con la cinta de promociones
(fase dummy), donde los datos vivían en un solo navegador y el dueño no lo notaba hasta que abría
la app en otro lado. Mejor una pantalla que dice claramente "todavía no se puede guardar".

### Decisión de modelo todavía abierta

Se le propuso al back que esta configuración **cuelgue de `CantidadFlorValida`** (el 48 ya está
dado de alta ahí con sus pliegos) en vez de ser una tabla nueva — para que el dueño no registre el
mismo tamaño en dos lugares y se le desalineen. Si aceptan, esto deja de ser una pantalla aparte y
se vuelve una pestaña más de Catálogos. **Por eso el servicio está aislado en su propio archivo:**
si cambia el modelo, se toca `ConfigEntregaService` y la pantalla queda igual.

**Archivos nuevos:** `src/app/flores/models/config-entrega.model.ts`,
`src/app/flores/service/config-entrega.service.ts`,
`src/app/flores/entregas/config-entregas.component.ts/.html/.scss` (BEM `ce-`).

**Archivos modificados:** `flores.module.ts`, `flores-routing.module.ts` (ruta `flores/entregas`),
`navbar.component.html` + `.ts` (link "🚚 Entregas" en el grupo 🌹).

**Verificado con `ng build` sin errores**, y revisado visualmente con una vitrina estática del
template real (Playwright) — el build no valida diseño.

### La configuración de entregas cuelga de `CantidadFlorValida` (2026-08-14)

El back aceptó la propuesta: **no hay tabla ni endpoints propios.** Los 6 campos
(`diasNormal`, `horaEntregaNormal`, `diasUrgente`, `horaEntregaUrgente`, `horaLimitePedido`,
`cargoUrgente`) se agregaron a `CantidadFlorValida` y se guardan con `/v1/cantidades-flor` de
siempre. Migración ya corrida en QA y prod; verificado con curl que los 6 llegan en el `getAll`.

Se borraron `config-entrega.model.ts` y `config-entrega.service.ts`, que se habían escrito como
contrato provisional mientras el back decidía.

**🐛 Bug que atajó el compilador — y que habría borrado datos:** el CRUD genérico **reemplaza el
registro completo**. Los 3 puntos donde `catalogos-flores` guarda una cantidad (alta, edición
inline y toggle de activo) no mandaban los campos nuevos, así que **editar los pliegos desde
Catálogos habría borrado la configuración de entrega** hecha en la otra pantalla. Ahora los tres
reenvían los 6 campos tal cual venían.

⚠️ **Regla para cualquier campo que se agregue a `CantidadFlorValida` de aquí en adelante:** hay
que reenviarlo en TODOS los puntos que llaman `cantidadUpdate`, no solo en la pantalla que lo
edita. Son 4 hoy (3 en catálogos + 1 en entregas).

### Endpoints nuevos del back, ya operativos en QA

| Endpoint | Para qué |
|---|---|
| `POST /v1/flores/fechas-disponibles` | **Público.** Devuelve `primeraFechaValida`, `horasDisponibles`, `cantidadAplicada`, `cargoUrgencia`, `ofreceUrgente`, `mensaje`. Es lo que va a alimentar el calendario del cliente |
| `POST /v1/flores/pedidos/{pedidoId}/revalidar-antes-de-pagar` | Se llama **antes** de `POST /v1/abonos/{pedidoId}`. Si el pago se pasó de la hora límite, agrega el cargo urgente y devuelve `totalActual` — hay que abonar **ese** monto, no el calculado antes. Es idempotente |

⚠️ `fechas-disponibles` pide **`tipoFlorId`** además de la cantidad — el back lo agregó a la
propuesta original y tiene razón: `CantidadFlorValida` es por (especie, cantidad), y sin la especie
no se sabe contra qué catálogo hacer el redondeo hacia arriba.

⚠️ **Las horas viajan como `HH:mm:ss`** ("16:00:00") pero un `<input type="time">` solo entiende
`HH:mm` — si se le pasa el valor con segundos **el campo se queda vacío sin avisar**. Por eso
`ConfigEntregasComponent` recorta al leer (`aInput`) y completa al guardar (`aBack`).

**Verificado con `ng build` sin errores.** ⚠️ La pantalla no se ha probado guardando contra QA.

---

## FIX FLORES — EL PAPEL SALÍA COMO CASILLA OPCIONAL EN UN RAMO QUE YA TENÍA PLIEGOS (2026-08-14)

**Reportado con captura:** en «Arma tu ramo», con 20 flores, el paso 4 mostraba
`☐ Papel (tiene costo)` como opción. El dueño: *"ya habíamos quedado que entre 1 y 5 flores
entonces sí se ponía el papel, porque cuando configuro los ramos ya puse cuántos pliegos usaría"*.

**No era un bug de código — eran dos configuraciones sin coordinar.** Verificado en QA:

| Dónde se configura | Valor |
|---|---|
| Accesorios → Papel → «Obligatorio con más de» | **20** |
| Cantidades → 20 flores → pliegos | 3 |
| Cantidades → 48 flores → pliegos | 5 |
| Cantidades → 62 flores → pliegos | 7 |

El corte estaba en 20 y la comparación del back es **estrictamente mayor**, así que un ramo de
exactamente 20 cae del lado "opcional" — aunque tenga sus 3 pliegos ya registrados. Los de 48 y
62 sí entraban solos. El dueño configuró los pliegos por tamaño esperando que eso bastara; el
umbral es un segundo número, en otra pestaña, que nadie cruzaba con el primero.

### Lo que se hizo

1. **Alerta en Catálogos → Accesorios** que detecta la incoherencia: lista los tamaños que tienen
   pliegos configurados pero quedan **por debajo o igual** al umbral (`<=`, porque el back usa
   `>`), y dice qué número poner. Getters `papel`, `tamanosSinPapelAutomatico`,
   `menorTamanoConPliegos`.
2. **`papelForzado` en el configurador ahora obedece al back.** Antes calculaba el umbral por su
   cuenta; ahora, en cuanto hay cálculo, usa `calculo.papelObligatorioAplicado`. La cuenta local
   queda solo como anticipo mientras el request viaja (evita que la casilla parpadee).

   ⚠️ **Esto importa más de lo que parece:** quien agrega y cobra el papel es el back. Si el front
   lo escondiera por su cuenta creyendo que va incluido y el back no lo agregara, **el ramo saldría
   sin papel y sin cobro** — el cliente nunca lo eligió y nadie lo facturó. Esconder ≠ incluir.

### Acción del dueño (es dato, no código)

Poner «Obligatorio con más de» en **5** para que el papel se pregunte solo en ramos de 1 a 5
flores y vaya incluido de 6 en adelante. Con el umbral en 20 el ramo de 20 seguirá saliendo como
opcional por más que tenga pliegos.

### Propuesta anotada al back

Que el papel se derive de **`CantidadFlorValida.pliegos`**: si el tamaño tiene pliegos
configurados, lleva papel; si no, se pregunta. Un solo lugar donde configurarlo, imposible de
desalinear — hoy son dos números en dos pestañas distintas que tienen que concordar a mano.
Es sugerencia, la decisión es suya.

**Archivos modificados:**
- `src/app/flores/catalogos/catalogos-flores.component.ts` → 3 getters nuevos
- `src/app/flores/catalogos/catalogos-flores.component.html` → alerta de incoherencia
- `src/app/flores/configurar/configurar-ramo.component.ts` → `papelForzado`

**Verificado con `ng build --configuration=development` sin errores ni warnings nuevos**, y el
estado real de QA comprobado con curl antes de tocar nada (no se asumió del documento).
