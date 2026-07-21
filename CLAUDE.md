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
