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

## FIXES DE ESTILOS — PENDIENTES Y REALIZADOS

### ✅ Ya corregidos
- `--header-brand` en light mode → cambiado de rojo/rosa a índigo (`#3730a3 → #4f46e5 → #6366f1`) en `src/styles.scss`
- `$primary` (#8b1a4a rojo) → `var(--app-accent)` en todos los SCSS de variantes, productos, admin, chatbot, palabras-clave
- Scroll containers con rojo → `var(--card-border)`
- Botón "quitar" → `#ef4444` (rojo semántico correcto)

### ⏳ Pendientes de fix (identificados, aún con rojo/problema)

| Componente | Clase Angular | Archivo SCSS | Problema |
|---|---|---|---|
| Buscar productos | `AllComponent` | `productos/producto/all/all.component.scss` | Header/buscador full-width — agregar `max-width: 1120px; margin: 0 auto` al contenido del header |
| Buscar variantes | `BuscarComponent` | `variante/buscar/buscar.component.scss` | Mismo problema de ancho que AllComponent |
| Agregar producto | `AddComponent` | `productos/producto/add/add.component.scss` | Ya usa `var(--header-brand)` — verificar en browser si sigue rojo |
| Agregar variante | `AgregarComponent` | `variante/agregar/agregar.component.scss` | Ya usa `var(--header-brand)` — verificar en browser |
| Carga archivo | `CargaArchivoComponent` | `documentos/carga-archivo/carga-archivo.component.scss` | 6 problemas: página rosa, card blanca, header ROJO hardcodeado, botón upload rojo, drop zone rosa, resultados blancos — NADA usa variables CSS aún |

### Detalle CargaArchivoComponent (documentos/carga-archivo)
- `.ca-page` → `linear-gradient(#fff5f7, #fde8f0)` rosa fijo → necesita `var(--page-bg)`
- `.ca-card` → `background: #fff` → necesita `var(--card-bg)` + `border: 1px solid var(--card-border)`
- `.ca-card__header` → `linear-gradient(#5c0f31, $primary, $primary-d)` ROJO → necesita `var(--header-brand)`
- `.ca-btn--upload` → `linear-gradient($primary, $primary-d)` rojo → necesita `var(--app-accent)` estilo índigo
- `.ca-drop` → border `#fbcfe8` rosa, background `#fdf2f8` → necesita `var(--card-border)` / `var(--form-section-bg)`
- `.ca-resultado`, `.ca-errores` → blancos fijos → necesita `var(--form-section-bg)` / `var(--card-bg)`

### Detalle AllComponent + BuscarComponent (ancho del header)
El `.pl-header` y `.vb-header` son full-width. El grid está centrado con `max-width: 1120px` pero el header no.
Fix: envolver el contenido interior del header en un `<div class="header-inner">` con `max-width: 1120px; margin: 0 auto; width: 100%`.
Esto requiere cambio en HTML + SCSS.

> **Instrucción:** Al arreglar cada uno, mover de "Pendientes" a "Ya corregidos" en este mismo archivo.

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