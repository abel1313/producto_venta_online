# Mapa de endpoints → componentes Angular
**Generado:** 2026-06-05  
**Fuente:** BUGS_REPORT.md + CAMBIOS_FRONT.md  
**Regla:** solo nombres reales de componentes Angular del proyecto, sin inventar.

---

## PRODUCTOS

---

### `POST /productos/save`
**Bugs relacionados:** BUG-KEY-01, BUG-KEY-07, BUG-KEY-09, PERF-KEY-03  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AddComponent` | `src/app/productos/producto/add/add.component.ts` | Sidebar → **Mis productos** → **Agregar** → llenar formulario → botón Guardar |

---

### `PUT /productos/update`
**Bugs relacionados:** BUG-KEY-01, BUG-KEY-07, BUG-KEY-09, PERF-KEY-03  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AddComponent` (modo actualizar) | `src/app/productos/producto/add/add.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón ✏️ Actualizar en una card → llenar formulario → botón Actualizar |

> `AddComponent` se reutiliza tanto para agregar como para actualizar. En modo actualizar es cargado por `UpdateComponent`.

---

### `GET /productos/findById/{id}`
**Bugs relacionados:** PERF-KEY-01  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `UpdateComponent` | `src/app/productos/producto/update/update.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón ✏️ Actualizar → `ngOnInit` llama automáticamente para cargar `palabraClave` |

---

### `GET /productos/obtenerProductos?size=10&page=X`
**Bugs relacionados:** CAMBIO B  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AllComponent` | `src/app/productos/producto/all/all.component.ts` | Sidebar → **Mis productos** → **Ver todos** → carga automática al entrar |

---

### `GET /productos/buscarNombreOrCodigoBarra?nombre=X&page=X&size=10`
**Bugs relacionados:** CAMBIO B  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AllComponent` | `src/app/productos/producto/all/all.component.ts` | Sidebar → **Mis productos** → **Ver todos** → campo de búsqueda → escribir nombre o código de barras |
| `VentaDirectaComponent` | `src/app/variante/venta-directa/venta-directa.component.ts` | Sidebar → **Venta directa** → campo de búsqueda de producto |

---

### `POST /productos/compartir-imagenes-variantes`
**Bugs relacionados:** BUG-KEY-03  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AllComponent` | `src/app/productos/producto/all/all.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón **Variantes** en una card → modal → botón **Compartir imágenes a variantes** |

---

### `DELETE /productos/deleteBy/{id}`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AllComponent` | `src/app/productos/producto/all/all.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón 🗑️ Eliminar en una card → confirmar |

---

## IMÁGENES DE PRODUCTO

---

### `GET /imagen/{productoId}/detalle?page=X&size=X` ❌ Deprecated
### `GET /imagen/v2/{productoId}/detalle?page=X&size=X` ✅
**Bugs relacionados:** PERF-KEY-01, PERF-KEY-02  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleProductoComponent` | `src/app/productos/producto/detalle-producto/detalle-producto.component.ts` | Sidebar → **Mis productos** → **Ver todos** → clic en el nombre o ícono de detalle de un producto → carrusel de imágenes carga automáticamente |

---

### `GET /producto-imagen/listar/{productoId}?pagina=X&size=8` (micro 9096)
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `UpdateComponent` | `src/app/productos/producto/update/update.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón ✏️ Actualizar → sección de imágenes carga automáticamente |
| `DetalleProductoComponent` | `src/app/productos/producto/detalle-producto/detalle-producto.component.ts` | Sidebar → **Mis productos** → **Ver todos** → clic en detalle del producto → carrusel |

---

### `GET /imagenes/file/{imagenId}` (micro 9096)
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `UpdateComponent` | `src/app/productos/producto/update/update.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón ✏️ Actualizar → cada imagen del carrusel se carga individualmente |
| Pipe `ImagenSrcPipe` | `src/app/productos/producto/pipes/imagen-src.pipe.ts` | Usado en cualquier template que tenga `\| imagenSrc \| async` — `DetalleVarianteComponent`, `UpdateVarianteComponent`, `BuscarComponent` (variantes), `VentaDirectaComponent` |

---

### `DELETE /producto-imagen/{imagenId}` (micro 9096)
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `UpdateComponent` | `src/app/productos/producto/update/update.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón ✏️ Actualizar → sección imágenes → botón ✕ sobre una imagen → confirmar |
| `DetalleProductoComponent` | `src/app/productos/producto/detalle-producto/detalle-producto.component.ts` | Sidebar → **Mis productos** → **Ver todos** → detalle del producto → botón ✕ sobre una imagen → confirmar |

---

### `DELETE /imagen/{productoId}/imagenes` ❌ Deprecated
### `DELETE /imagen/v2/{productoId}/imagenes` ✅
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleProductoComponent` | `src/app/productos/producto/detalle-producto/detalle-producto.component.ts` | Sidebar → **Mis productos** → **Ver todos** → detalle del producto → marcar varias imágenes → botón **Eliminar seleccionadas** → confirmar |

---

### `PUT /producto-imagen/{id}/principal` (micro 9096)
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `UpdateComponent` | `src/app/productos/producto/update/update.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón ✏️ Actualizar → sección imágenes → botón ⭐ Marcar como principal sobre una imagen |

---

## VARIANTES

---

### `GET /variantes/buscar?termino=X&pagina=X&size=10`
**Bugs relacionados:** PERF-KEY-01, CAMBIO A  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `BuscarComponent` | `src/app/variante/buscar/buscar.component.ts` | Sidebar → **Variantes** → **Buscar** → carga automática al entrar, o campo de búsqueda |
| `DiagnosticoImagenesComponent` | `src/app/admin/diagnostico-imagenes/diagnostico-imagenes.component.ts` | Sidebar → **Admin** → **Diagnóstico de imágenes** → búsqueda de variante |
| `VentaDirectaComponent` | `src/app/variante/venta-directa/venta-directa.component.ts` | Sidebar → **Venta directa** → campo de búsqueda de variante |

---

### `POST /variantes/guardarConImagenes`
**Bugs relacionados:** BUG-KEY-07  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AgregarComponent` | `src/app/variante/agregar/agregar.component.ts` | Sidebar → **Variantes** → **Agregar** → llenar formulario + imágenes → botón Guardar |
| `UpdateVarianteComponent` | `src/app/variante/update-variante/update-variante.component.ts` | Sidebar → **Variantes** → **Buscar** → botón ✏️ Editar en una card → llenar campos → botón Actualizar |

---

### `POST /variantes/inicializarDesdeProducto`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AllComponent` | `src/app/productos/producto/all/all.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón **Variantes** en una card → modal → configurar cantidad y campos → botón Crear variantes |

---

### `GET /variantes/getOne/{id}`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `BuscarComponent` | `src/app/variante/buscar/buscar.component.ts` | Se llama automáticamente al hacer clic en botón ✏️ Editar — obtiene variante completa antes de navegar al formulario |
| `UpdateVarianteComponent` | `src/app/variante/update-variante/update-variante.component.ts` | Se llama automáticamente en `ngOnInit` para obtener `palabraClave` completa |

---

### `GET /variantes/porProducto/{productoId}`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleVarianteComponent` | `src/app/variante/detalle-variante/detalle-variante.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón **Variantes** en una card → lista de variantes |

---

### `GET /variantes/porProducto/{productoId}/paginado/resumen?pagina=X&size=10`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `BuscarComponent` | `src/app/variante/buscar/buscar.component.ts` | Sidebar → **Variantes** → **Buscar** → con `?productoId=X` en la URL (navegación desde AllComponent) |

---

## IMÁGENES DE VARIANTE

---

### `GET /variantes/imagenes/{varianteId}` ❌ Deprecated
### `GET /variantes/v2/imagenes/{varianteId}` ✅
**Bugs relacionados:** PERF-KEY-01  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleVarianteComponent` | `src/app/variante/detalle-variante/detalle-variante.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón **Variantes** → seleccionar una variante → carrusel de imágenes |
| `UpdateVarianteComponent` | `src/app/variante/update-variante/update-variante.component.ts` | Sidebar → **Variantes** → **Buscar** → botón ✏️ Editar → sección imágenes existentes al final |

---

### `GET /variantes/imagenes/{varianteId}/paginado?pagina=X&size=X`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleVarianteComponent` | `src/app/variante/detalle-variante/detalle-variante.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón **Variantes** → seleccionar variante → carrusel paginado |
| `UpdateVarianteComponent` | `src/app/variante/update-variante/update-variante.component.ts` | Sidebar → **Variantes** → **Buscar** → botón ✏️ Editar → carrusel de imágenes existentes |

---

### `DELETE /variantes/{varianteId}/imagenes` ❌ Deprecated
### `DELETE /variantes/v2/{varianteId}/imagenes` ✅
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleVarianteComponent` | `src/app/variante/detalle-variante/detalle-variante.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón **Variantes** → seleccionar variante → marcar imágenes → **Eliminar seleccionadas** → confirmar |
| `UpdateVarianteComponent` | `src/app/variante/update-variante/update-variante.component.ts` | Sidebar → **Variantes** → **Buscar** → botón ✏️ Editar → sección imágenes existentes → botón ✕ sobre una imagen |

---

### `PUT /variantes/imagenes/{imagenId}/principal`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleVarianteComponent` | `src/app/variante/detalle-variante/detalle-variante.component.ts` | Sidebar → **Mis productos** → **Ver todos** → botón **Variantes** → seleccionar variante → botón ⭐ sobre una imagen |
| `UpdateVarianteComponent` | `src/app/variante/update-variante/update-variante.component.ts` | Sidebar → **Variantes** → **Buscar** → botón ✏️ Editar → sección imágenes → botón ⭐ sobre una imagen |

---

## PEDIDOS

---

### `GET /pedidos/findPedido/{id}`
### `GET /pedidos/findPedido/{idPedido}/{idCliente}`
### `GET /pedidos/buscarClientePedido/{buscar}?size=10&page=0`
### `DELETE /pedidos/delete/{id}`
**Bugs relacionados:** BUG-KEY-02, BUG-KEY-06  
**Cómo llegar:** Sidebar → **Pedidos** → listado → campo de búsqueda por nombre de cliente / botón eliminar pedido

> El componente exacto de pedidos no fue leído en esta sesión. Confirmar nombre en `src/app/pedidos/`.

---

### `POST /pedidos/savePedido`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleProductosComponent` | `src/app/productos/producto/detalle-productos/detalle-productos.component.ts` | Sidebar → **Catálogo** → seleccionar producto → botón **Generar pedido** |

---

## PRESENTACIÓN (LOGIN / REGISTRO)

---

### `GET /presentacion/imagenes?tipo=LOGIN` ❌ Deprecated
### `GET /presentacion/v2/imagenes?tipo=LOGIN` ✅
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `LoginFormComponent` | `src/app/login/login-form/login-form.component.ts` | Ir a `/login` → panel izquierdo de imágenes carga automáticamente |
| `AddUsuariosComponent` | `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` | Ir a `/usuarios/registrar` → panel izquierdo de imágenes carga automáticamente |

---

### `GET /presentacion/imagenes/{id}/imagen` ❌ Deprecated
### `GET /presentacion/v2/imagenes/{id}/imagen` ✅
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `LoginFormComponent` | `src/app/login/login-form/login-form.component.ts` | `/login` → cada imagen del panel izquierdo |
| `AddUsuariosComponent` | `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` | `/usuarios/registrar` → cada imagen del panel izquierdo |

---

### `GET /presentacion/imagenes/todas` ❌ Deprecated
### `GET /presentacion/v2/imagenes/todas` ✅
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `PresentacionImagenesComponent` | `src/app/admin/presentacion-imagenes/presentacion-imagenes.component.ts` | Sidebar → **Admin** → **Imágenes de presentación** → carga automática al entrar |

---

### `PUT /presentacion/imagenes/{id}` ❌ Deprecated
### `PUT /presentacion/v2/imagenes/{id}` ✅
**Bugs relacionados:** BUG-KEY-08  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `PresentacionImagenesComponent` | `src/app/admin/presentacion-imagenes/presentacion-imagenes.component.ts` | Sidebar → **Admin** → **Imágenes de presentación** → seleccionar imagen → editar descripción o subir imagen nueva → botón **Guardar** |

---

## RECONCILIACIÓN DE IMÁGENES (ADMIN)

---

### `POST /admin/reconciliacion/imagenes`
### `POST /admin/reconciliacion/imagenes/limpiar-bd`
### `GET /admin/reconciliacion/imagenes/resultado`
**Bugs relacionados:** BUG-KEY-04  
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `ReconciliacionImagenesComponent` | `src/app/admin/reconciliacion-imagenes/reconciliacion-imagenes.component.ts` | Sidebar → **Admin** → **Reconciliación de imágenes** → botón **Iniciar reconciliación** |

---

## CLIENTES / USUARIOS

---

### `GET /usuarios/buscarClientePorIdUsuario/{idUsuario}`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `DetalleProductosComponent` | `src/app/productos/producto/detalle-productos/detalle-productos.component.ts` | Sidebar → **Catálogo** → seleccionar producto → botón **Generar pedido** |
| `VentaVarianteComponent` | `src/app/variante/venta-variante/venta-variante.component.ts` | Sidebar → **Variantes** → **Carrito** → botón **Confirmar** |
| `VentaDirectaComponent` | `src/app/variante/venta-directa/venta-directa.component.ts` | Sidebar → **Venta directa** → botón **Confirmar venta** (cuando no hay cliente seleccionado) |

---

### `GET /clientes/buscar?nombre=X&page=X&size=10`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `VentaDirectaComponent` | `src/app/variante/venta-directa/venta-directa.component.ts` | Sidebar → **Venta directa** → campo de búsqueda de cliente |
| `VentaVarianteComponent` | `src/app/variante/venta-variante/venta-variante.component.ts` | Sidebar → **Variantes** → **Carrito** → campo de búsqueda de cliente |
| `DetalleProductosComponent` | `src/app/productos/producto/detalle-productos/detalle-productos.component.ts` | Sidebar → **Catálogo** → seleccionar producto → campo de búsqueda de cliente |

---

## VENTAS

---

### `POST /ventas/save`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `VentaDirectaComponent` | `src/app/variante/venta-directa/venta-directa.component.ts` | Sidebar → **Venta directa** → agregar variantes al ticket → botón **Confirmar venta** |
| `VentaVarianteComponent` | `src/app/variante/venta-variante/venta-variante.component.ts` | Sidebar → **Variantes** → **Carrito** → botón **Confirmar venta** |

---

## PALABRAS CLAVE (CATEGORÍAS)

---

### `GET /palabras-clave/buscar?termino=X`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `PalabraClaveAutocompleteComponent` | `src/app/palabras-clave/autocomplete/palabra-clave-autocomplete.component.ts` | Aparece dentro de: **Agregar producto**, **Actualizar producto**, **Agregar variante**, **Editar variante** → campo **Categoría** → escribir al menos 2 caracteres |

---

## ADMIN — CACHÉ

---

### `DELETE /admin/cache`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `CacheComponent` | `src/app/admin/cache/cache.component.ts` | Sidebar → **Admin** → **Limpiar caché** → botón **Limpiar caché** |

---

## AUTENTICACIÓN

---

### `POST /auth/login`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `LoginFormComponent` | `src/app/login/login-form/login-form.component.ts` | `/login` → formulario → botón **Entrar** |

---

### `POST /auth/refresh`
**Quién lo invoca:**

| Clase | Archivo | Cuándo |
|---|---|---|
| `TokenInterceptor` | `src/app/token/TokenInterceptor .ts` | Automáticamente cuando cualquier request devuelve **401** — transparente para el usuario |

---

### `POST /auth/logout`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `NavbarComponent` | `src/app/navbar/navbar.component.ts` | Sidebar → pie del menú → botón **Salir** |

---

### `POST /auth/registrar`
**Componentes que lo invocan:**

| Componente Angular | Archivo | Cómo llegar |
|---|---|---|
| `AddUsuariosComponent` | `src/app/usuarios/usuarios/add-usuarios/add-usuarios.component.ts` | `/usuarios/registrar` → formulario → botón **Registrarse** |
