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

## CAMBIOS DE BACK — IMPACTO EN FRONT (2026-05-26)

### CAMBIO C — Paginación limitada a máximo 10 registros por página

**Endpoints afectados:**
- `GET /mis-productos/productos/obtenerProductos?size=X&page=X`
- `GET /mis-productos/productos/buscarNombreOrCodigoBarra?size=X&page=X&nombre=X`
- `GET /mis-productos/variantes/buscar?size=X&pagina=X`
- `GET /mis-productos/variantes/porProducto/{id}/paginado/resumen?size=X&pagina=X`
- `GET /mis-productos/clientes/buscar?size=X&page=X&nombre=X`

**Qué cambió:** el backend capea `size` en 10 automáticamente.

**Estado front:** ✅ Corregido. `venta-directa.component.ts` tenía `size: 20` → cambiado a `size: 10`. El resto ya usaba `size=10`.

**Cómo llegar (venta-directa):** Sidebar → Venta directa → campo de búsqueda de variante.

---

### CAMBIO D — Validación de imágenes en uploads (400 Bad Request)

**Endpoints afectados:**
- `POST /mis-productos/variantes/guardarConImagenes`
- `POST /mis-productos/variantes/inicializarDesdeProducto`

**Reglas del back:** tamaño máximo 10 MB por imagen. Tipos permitidos: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.

**Response 400:** `{ "mensaje": "Archivo 'foto.bmp' supera 10 MB" }` o `{ "mensaje": "Tipo no permitido: image/bmp" }`

**Estado front:** ✅ Corregido.
- `agregar.component.ts`, `update-variante.component.ts`, `add.component.ts` (productos): agregado `image/webp` a `TIPOS_PERMITIDOS`. Si la imagen supera 10 MB, se comprime automáticamente con Canvas API (reduce dimensiones a máx 1920px y baja calidad JPEG desde 0.85 hasta 0.2 hasta caber). PNG se convierte a JPEG para poder comprimir. El usuario no recibe error — la imagen se sube reducida.
- `all.component.ts` (inicializarDesdeProducto): corregido `err?.error?.message` → `err?.error?.mensaje ?? err?.error?.message`.
- Los demás componentes (`agregar`, `update-variante`) ya leían `err?.error?.mensaje` correctamente.

**Cómo llegar:**
- Agregar variante: Sidebar → Variantes → Agregar → sección imágenes
- Editar variante: Sidebar → Variantes → Buscar → Editar → sección imágenes
- Agregar producto: Sidebar → Mis productos → Agregar → sección imágenes
- Crear variantes desde producto: Sidebar → Mis productos → Ver todos → botón "Variantes" en una card

---

### CAMBIO E — buscarClientePorIdUsuario requiere autenticación

**Endpoint afectado:** `GET /mis-productos/usuarios/buscarClientePorIdUsuario/{idUsuario}`

**Qué cambió:** era público, ahora requiere JWT. El usuario solo puede consultar su propio ID; otro ID devuelve 403.

**Estado front:** ✅ Sin cambios necesarios. El `TokenInterceptor` ya agrega el Bearer token a todos los requests no-auth automáticamente.

**Componentes que lo usan:**
- `detalle-productos.component.ts` → `generarPedido()` — al generar pedido desde el catálogo
- `venta-variante.component.ts` → al confirmar venta de variantes
- `venta-directa.component.ts` → al ejecutar venta directa sin cliente seleccionado

**Cómo llegar:**
- Detalle productos: Sidebar → Catálogo → seleccionar producto → botón Generar Pedido
- Venta variante: Sidebar → Variantes → Carrito → Confirmar
- Venta directa: Sidebar → Venta directa → Confirmar venta

---

## SKILLS QUE SE USAN EN ESTE PROYECTO

| Skill | Cuándo usarla |
|---|---|
| `angular-developer` | Refactor, mejores prácticas Angular, componentes, servicios, routing |
| `code-quality` | Revisión de calidad, clean code, API contracts, performance |

Para invocar: escribir `/angular-developer` o `/code-quality` en el chat.

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
**Archivo:** `src/app/variante/buscar/buscar.component.html` + `.scss` + `.ts`

- **Fix buscador espacios (2026-06-03):** `onBuscar()` hacía `.trim()` antes de asignar a `terminoBusqueda` — esto eliminaba el espacio al final mientras el usuario escribía, impidiendo buscar con 2 palabras. Fix: se guarda el valor original en `terminoBusqueda` y solo se trimea para enviar al servicio.
- **Fix imágenes (2026-06-03):** el `<img>` usaba `[src]="v.imagenUrl"` directo. Cambiado a `v.imagenUrl | imagenSrc | async` para hacer el fetch HTTP igual que los demás componentes de variantes.
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


Ncesito que preguntes todas tus dudas para que tengas las cosas claras y cuando tengas las cosas claras y lanses agentes o hagas cambios ya no estes pregunte y pregunte