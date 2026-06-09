# ENDPOINTS DEL PROYECTO

> **URLs base**
> - **Proyecto-Key (9091):** `http://localhost:9091/mis-productos`
> - **Micro Imágenes (9096):** `http://localhost:9096/mis-productos`
>
> Los endpoints con v1/v2 están sujetos al toggle `🧪 IMG v1/v2` del sidebar (solo admin).
> Los que están **SIN USO** aparecen al final de cada sección.
>
> ⚠️ **CAMBIO PLANEADO (pendiente — solo documentado, NO implementado todavía):** todas las URLs de
> este documento (Sección A y Sección B, sin excepción) van a llevar el segmento `/v1/` justo
> después de `/mis-productos`. Ver detalle completo en **"CAMBIO PLANEADO — VERSIONADO UNIFICADO `/v1/`"**
> al final de este archivo.

---

## SECCIÓN A — PROYECTO-KEY (puerto 9091)

---

### AUTENTICACIÓN
**Servicio:** `src/app/login/acceder.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| POST | `/auth/login` | Autentica usuario, devuelve JWT | `LoginFormComponent` | `onLogin()` | → `/login` |
| POST | `/auth/registrar` | Registra nuevo usuario | `AddUsuariosComponent` | `darAltaUser()` | → `/usuarios/registrar` |

---

### PRODUCTOS
**Servicio:** `src/app/productos/service/producto.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/productos/obtenerProductos?size=&page=` | Lista productos paginados | `AllComponent` | `cargarProductos()` | → Mis productos → Ver todos |
| GET | `/productos/findById/{id}` | Obtiene producto por ID | `DetalleProductoComponent`, `UpdateComponent` | `ngOnInit()` | → Ver todos → clic en producto |
| GET | `/productos/buscarNombreOrCodigoBarra?size=&page=&nombre=` | Busca productos por nombre o código | `UpdateVarianteComponent`, `AgregarComponent` | `buscarProducto()` | → Mis variantes → Agregar/Editar → campo búsqueda |
| POST | `/productos/save` | Crea producto nuevo | `AddComponent` | `save()` | → Mis productos → Agregar |
| GET | `/productos/admin/diagnostico-imagenes/{productoId}` | Diagnóstico de imágenes de un producto | `DiagnosticoImagenesComponent` | `diagnosticar()` | → Admin → Diagnóstico imágenes → tab Producto |
| POST | `/productos/compartir-imagenes-variantes` | Copia imágenes de producto a sus variantes | `DetalleProductoComponent` | `compartirImagenes()` | → Ver todos → Detalle producto → botón Compartir imágenes |

---

### IMÁGENES DE PRODUCTO (v1/v2 — toggle IMG)
**Servicio:** `src/app/productos/service/producto.service.ts` y `src/app/imagene/imagenes.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar | Toggle |
|--------|-----|----------|------------|---------|---------|--------|
| GET | `/imagen/{id}/detalle?page=&size=` | ⚠️ Deprecated — lista imágenes paginadas del producto (del disco local) | `DetalleProductoComponent` | `cargarPagina()` | → Ver todos → clic Detalle | v1 OFF |
| GET | `/imagen/v2/{id}/detalle?page=&size=` | Lista imágenes paginadas del producto (del micro de imágenes) | `DetalleProductoComponent` | `cargarPagina()` | → Ver todos → clic Detalle | v2 ON |
| GET | `/imagen/{productoId}/imagenes` | ⚠️ Deprecated — ya no se usa en front | — | — | migrado al micro |  |
| GET | `/imagen/file/{imagenId}` | ⚠️ Deprecated — ya no se usa en front | — | — | migrado al micro |  |
| DELETE | `/imagen/{imagenId}` | Elimina una imagen por ID | `UpdateComponent` | `eliminarImagen()` | → Ver todos → Editar producto → ✕ sobre imagen |  |
| DELETE | `/imagen/{productoId}/imagenes` | ⚠️ Deprecated — elimina lote de imágenes de un producto | `DetalleProductoComponent` | `confirmarEliminarBatch()` | → Detalle producto → marcar imágenes → Eliminar seleccionadas | **Migración 4 pendiente** |
| PUT | `/producto-imagen/{imagenId}/principal` | Marca imagen como principal de un producto | `UpdateComponent` | `setPrincipal()` | → Editar producto → clic Marcar como principal |  |

---

### VARIANTES
**Servicio:** `src/app/variante/service/variante.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/variantes/paginado?pagina=&size=` | Lista variantes paginadas | `BuscarVarianteComponent` | `cargar()` | → Mis variantes → Ver todas |
| GET | `/variantes/getOne/{id}` | Obtiene una variante por ID | `DetalleVarianteComponent` | `ngOnInit()` | → Mis variantes → clic Detalle |
| GET | `/variantes/porProducto/{productoId}` | Lista variantes de un producto | `DetalleVarianteComponent` | `cargarVariantes()` | → Mis variantes → seleccionar producto |
| GET | `/variantes/buscar?termino=&pagina=&size=` | Busca variantes por término | `BuscarVarianteComponent`, `RifaService` | `buscar()` | → Mis variantes → campo búsqueda |
| POST | `/variantes/guardarConImagenes` | Crea o actualiza variante con imágenes | `AgregarComponent`, `UpdateVarianteComponent` | `save()` / `update()` | → Mis variantes → Agregar o Editar → Guardar |
| GET | `/variantes/admin/diagnostico-imagenes/{varianteId}` | Diagnóstico de imágenes de una variante | `DiagnosticoImagenesComponent` | `diagnosticar()` | → Admin → Diagnóstico imágenes → tab Variante |
| POST | `/ventas/save` | Guarda una venta directa | `VentaVarianteComponent`, `VentaDirectaComponent` | `confirmar()` | → Mis variantes → Venta directa → Confirmar |

---

### IMÁGENES DE VARIANTE (v1/v2 — toggle IMG)
**Servicio:** `src/app/variante/service/variante.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar | Toggle |
|--------|-----|----------|------------|---------|---------|--------|
| GET | `/variantes/imagenes/{id}/paginado?pagina=&size=` | Lista imágenes paginadas de una variante | `DetalleVarianteComponent`, `UpdateVarianteComponent` | `cargarImagenes()` | → Mis variantes → Detalle o Editar | |
| DELETE | `/variantes/{varianteId}/imagenes` | ⚠️ Deprecated — elimina imágenes específicas de una variante | `DetalleVarianteComponent`, `UpdateVarianteComponent` | `confirmarEliminar()` / `eliminarImagen()` | → Detalle variante → marcar → Eliminar / Editar variante → ✕ imagen | v1 OFF |
| DELETE | `/variantes/v2/{varianteId}/imagenes` | Elimina imágenes específicas de una variante (v2) | `DetalleVarianteComponent`, `UpdateVarianteComponent` | `confirmarEliminar()` / `eliminarImagen()` | → misma ruta | v2 ON |
| PUT | `/variantes/imagenes/{imagenId}/principal` | Marca imagen como principal de una variante | `UpdateVarianteComponent` | `setPrincipalVariante()` | → Editar variante → sección imágenes → Marcar como principal |  |

---

### PRESENTACIÓN (imágenes login/registro, v1/v2 — toggle IMG)
**Servicio:** `src/app/presentacion/presentacion.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar | Toggle |
|--------|-----|----------|------------|---------|---------|--------|
| GET | `/presentacion/imagenes?tipo=LOGIN\|REGISTRO` | ⚠️ Deprecated — lista imágenes por tipo para panel izquierdo | `LoginFormComponent`, `AddUsuariosComponent` | `ngOnInit()` | → `/login` o `/usuarios/registrar` | v1 OFF |
| GET | `/presentacion/v2/imagenes?tipo=LOGIN\|REGISTRO` | Lista imágenes por tipo para panel izquierdo (v2) | `LoginFormComponent`, `AddUsuariosComponent` | `ngOnInit()` | → `/login` o `/usuarios/registrar` | v2 ON |
| GET | `/presentacion/imagenes/{id}/imagen` | ⚠️ Deprecated — bytes de una imagen de presentación | `LoginFormComponent`, `AddUsuariosComponent` | `imgSrc()` | → misma ruta | v1 OFF |
| GET | `/presentacion/v2/imagenes/{id}/imagen` | Bytes de una imagen de presentación (v2) | `LoginFormComponent`, `AddUsuariosComponent` | `imgSrc()` | → misma ruta | v2 ON |
| GET | `/presentacion/imagenes/todas` | ⚠️ Deprecated — lista todas las imágenes (admin) | `PresentacionImagenesComponent` | `cargar()` | → Admin → Imágenes de presentación | v1 OFF |
| GET | `/presentacion/v2/imagenes/todas` | Lista todas las imágenes (admin, v2) | `PresentacionImagenesComponent` | `cargar()` | → Admin → Imágenes de presentación | v2 ON |
| PUT | `/presentacion/imagenes/{id}` | ⚠️ Deprecated — actualiza descripción/archivo de imagen | `PresentacionImagenesComponent` | `guardar()` | → Admin → Imágenes de presentación → Guardar | v1 OFF |
| PUT | `/presentacion/v2/imagenes/{id}` | Actualiza descripción/archivo de imagen (v2) | `PresentacionImagenesComponent` | `guardar()` | → Admin → Imágenes de presentación → Guardar | v2 ON |

---

### PEDIDOS
**Servicio:** `src/app/pedidos/pedidos.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/pedidos/findPedido/{id}?size=&page=` | Obtiene pedidos de un usuario | `MisPedidosComponent` | `cargar()` | → Mis pedidos |
| GET | `/pedidos/buscarClientePedido/{buscar}?size=&page=` | Busca pedidos por cliente | `MisPedidosComponent` | `buscar()` | → Mis pedidos → campo búsqueda |
| PUT | `/pedidos/confirmar/{id}` | Confirma un pedido | `MisPedidosComponent` | `confirmar()` | → Mis pedidos → Confirmar |
| DELETE | `/pedidos/delete/{id}?motivo=` | Cancela un pedido con motivo | `MisPedidosComponent` | `cancelar()` | → Mis pedidos → Cancelar |

---

### PAGOS / MERCADO PAGO
**Servicio:** `src/app/pedidos/pago.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/pagos/opciones-estructuradas` | Lista opciones de pago (meses, contado, etc.) | `MisPedidosComponent` | `cargarOpciones()` | → Mis pedidos → sección pago |
| POST | `/mp/iniciar` | Inicia pago en terminal MP | `MisPedidosComponent` | `iniciarPago()` | → Mis pedidos → Pagar con terminal |
| GET | `/mp/estado/{intentId}` | Verifica estado de pago en terminal | `MisPedidosComponent` | `verificarEstado()` | → Mis pedidos → (polling automático tras iniciar pago) |
| DELETE | `/mp/cancelar/{intentId}` | Cancela pago en terminal | `MisPedidosComponent` | `cancelarPago()` | → Mis pedidos → Cancelar pago |
| GET | `/mp/historial?pagina=&size=` | Historial de pagos MP paginado | `HistorialMpComponent` | `cargar()` | → Pedidos → Historial MP |
| GET | `/mp/historial/estado/{estado}?pagina=&size=` | Historial de pagos MP filtrado por estado | `HistorialMpComponent` | `filtrar()` | → Pedidos → Historial MP → filtro estado |

---

### USUARIOS
**Servicio:** `src/app/shared/usuario.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/usuarios/getAllPage?buscar=&page=&size=` | Lista usuarios paginados con búsqueda | `BuscarUsuariosComponent` | `cargar()` | → Admin → Usuarios |
| PUT | `/usuarios/updateUsuario/{tipoDato}` | Actualiza datos o contraseña de usuario | `AddUsuariosComponent` | `updateUserDto()` | → Admin → Usuarios → Editar |

---

### CLIENTES
**Servicio:** `src/app/clietes/cliente.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/clientes/buscarPorIdCliente/{idCliente}` | Obtiene datos de un cliente por ID | `MisPedidosComponent` | `cargarCliente()` | → Mis pedidos → (automático al cargar) |
| GET | `/clientes/buscar?nombre=&page=&size=` | Busca clientes por nombre | `ClientesBuscarComponent` | `buscar()` | → Clientes → Buscar |
| GET | `/dipomex/getCodigoPostal/{codigoPostal}` | Valida código postal y obtiene colonia/municipio | `ClientesAddComponent` | `validarCP()` | → Clientes → Agregar → campo CP |

---

### RIFAS
**Servicio:** `src/app/rifas/service/rifa.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| POST | `/configurarRifa/save` | Crea configuración de rifa | `AgregarRifaComponent` | `guardarConfig()` | → Rifas → Agregar rifa |
| GET | `/configurarRifa/activas` | Lista rifas activas | `AgregarRifaComponent` | `cargarActivas()` | → Rifas → Agregar rifa → (automático) |
| GET | `/configurarRifa/activas/hoy` | Lista rifas activas para hoy | `RifaMesComponent` | `cargar()` | → Rifas → Rifa del mes |
| POST | `/configurarRifaVariante/save` | Agrega variante a una rifa | `AgregarRifaComponent` | `agregarVariante()` | → Rifas → Agregar rifa → Agregar variante |
| GET | `/configurarRifaVariante/porRifa/{rifaId}` | Lista variantes de una rifa | `AgregarRifaComponent` | `cargarVariantes()` | → Rifas → seleccionar rifa |
| GET | `/configurarRifaVariante/palabrasClave/{rifaId}` | Lista palabras clave de variantes en rifa | `AgregarRifaComponent` | `cargarPalabrasClave()` | → misma pantalla |
| DELETE | `/configurarRifaVariante/{id}` | Elimina variante de una rifa | `AgregarRifaComponent` | `eliminarVariante()` | → Rifas → ✕ sobre variante |
| PUT | `/configurarRifaVariante/{id}/palabraClave` | Actualiza palabra clave de variante en rifa | `AgregarRifaComponent` | `actualizarPalabraClave()` | → Rifas → editar palabra clave |
| POST | `/concursante/registrar` | Registra concursante en rifa | `AgregarRifaComponent` | `registrar()` | → Rifas → Registrar concursante |
| DELETE | `/concursante/delete` | Elimina concursante | `AgregarRifaComponent` | `eliminarConcursante()` | → Rifas → ✕ sobre concursante |
| GET | `/concursante/porRifa/{rifaId}` | Lista concursantes de una rifa | `AgregarRifaComponent` | `cargarConcursantes()` | → Rifas → ver lista |
| GET | `/concursante/elegibles/{rifaId}` | Lista concursantes elegibles para sortear | `AgregarRifaComponent` | `cargarElegibles()` | → Rifas → ver elegibles |
| GET | `/concursante/clientesPorMes?mes=` | Clientes con pedidos en el mes indicado | `AgregarRifaComponent` | `cargarPorMes()` | → Rifas → importar por mes |
| POST | `/concursante/importarDePedidos` | Importa concursantes desde pedidos del mes | `AgregarRifaComponent` | `importar()` | → Rifas → Importar de pedidos |
| GET | `/ganadorRifa/estado/{rifaId}` | Estado del sorteo de una rifa | `AgregarRifaComponent`, `RifaMesComponent` | `cargarEstado()` | → Rifas → estado sorteo |
| POST | `/ganadorRifa/sortear/{rifaId}` | Ejecuta el sorteo | `AgregarRifaComponent` | `sortear()` | → Rifas → Sortear |
| POST | `/ganadorRifa/continuarVariante/{rifaId}?modo=` | Continúa sorteo en siguiente variante | `AgregarRifaComponent` | `continuar()` | → Rifas → Continuar |
| POST | `/ganadorRifa/reiniciar/{rifaId}?completo=` | Reinicia el sorteo | `AgregarRifaComponent` | `reiniciar()` | → Rifas → Reiniciar |

---

### PALABRAS CLAVE
**Servicio:** `src/app/palabras-clave/service/palabra-clave.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/palabras-clave/buscar?nombre=&pagina=&size=` | Autocomplete de palabras clave | `PalabraClaveAutocompleteComponent` | `buscar()` | → cualquier campo de autocomplete de PC |
| GET | `/palabras-clave/getAll?page=&size=` | Lista todas las palabras clave | `GestionPalabrasClaveComponent` | `cargar()` | → Admin → Palabras clave |
| POST | `/palabras-clave/save` | Crea palabra clave | `GestionPalabrasClaveComponent` | `guardar()` | → Admin → Palabras clave → Nueva |
| PUT | `/palabras-clave/update/{id}` | Actualiza palabra clave | `GestionPalabrasClaveComponent` | `editar()` | → Admin → Palabras clave → Editar |
| DELETE | `/palabras-clave/delete` | Elimina palabra clave | `GestionPalabrasClaveComponent` | `eliminar()` | → Admin → Palabras clave → Eliminar |

---

### NEGOCIO
**Servicio:** `src/app/negocio/negocio.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/negocio/estado` | Estado actual del negocio (abierto/cerrado) | `ChatbotComponent` | `cargarEstado()` | → botón chatbot (sidebar) |
| GET | `/negocio/config` | Configuración completa del negocio | `ConfigNegocioComponent` | `cargar()` | → Admin → Config negocio |
| POST | `/negocio/abrir` | Abre el negocio | `ConfigNegocioComponent` | `abrir()` | → Admin → Config negocio → Abrir |
| POST | `/negocio/cerrar` | Cierra el negocio | `ConfigNegocioComponent` | `cerrar()` | → Admin → Config negocio → Cerrar |
| PUT | `/negocio/contactos` | Actualiza teléfono/email del negocio | `ConfigNegocioComponent` | `guardarContactos()` | → Admin → Config negocio → Contactos → Guardar |
| PUT | `/negocio/horario` | Actualiza horario del negocio | `ConfigNegocioComponent` | `guardarHorario()` | → Admin → Config negocio → Horario → Guardar |

---

### ADMIN
**Servicio:** `src/app/admin/admin.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| DELETE | `/admin/cache` | Limpia caché general de Spring Boot | `CacheComponent` | `limpiar()` | → Admin → Limpiar caché |
| POST | `/admin/reconciliacion/imagenes?productoId=` | Inicia reconciliación de imágenes de un producto | `ReconciliacionImagenesComponent` | `iniciar()` | → Admin → Reconciliación imágenes |
| GET | `/admin/reconciliacion/imagenes/resultado` | Ve el resultado de la última reconciliación | `ReconciliacionImagenesComponent` | `verResultado()` | → Admin → Reconciliación imágenes → Ver resultado |
| POST | `/admin/reconciliacion/imagenes/limpiar-bd` | Limpia registros huérfanos de BD | `ReconciliacionImagenesComponent` | `limpiarBD()` | → Admin → Reconciliación imágenes → Limpiar BD |

---

### DOCUMENTOS
**Servicio:** `src/app/documentos/documentos.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| POST | `/documentos/productos` | Sube Excel con lista de productos | `CargaArchivoComponent` | `subir()` | → Admin → Carga de archivo |

---

### CHATBOT
**Servicio:** `src/app/chatbot/chatbot.service.ts`

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| POST | `/chatbot/mensaje` | Envía mensaje al chatbot y recibe respuesta | `ChatbotComponent` | `enviar()` | → ícono chatbot en sidebar → escribir mensaje |

---

## SECCIÓN B — MICROSERVICIO DE IMÁGENES (puerto 9096)

**Servicio:** `src/app/productos/service/producto.service.ts` (`microImagenes`)

| Método | URL | Qué hace | Componente | Función | Navegar |
|--------|-----|----------|------------|---------|---------|
| GET | `/producto-imagen/listar/{productoId}` | Lista imágenes de un producto. Response: `{ productoId, listaImagenes: [{id, extension, nombreImagen, urlImagen, principal}] }` | `UpdateComponent` | `cargarImagenes()` | → Ver todos → Editar producto → sección imágenes |
| GET | `/imagenes/file/{imagenId}` | Descarga bytes de imagen como blob. 204 = sin imagen en disco → la tarjeta se elimina silenciosamente | `UpdateComponent` | `cargarImagenes()` | → Ver todos → Editar producto → (automático por cada imagen) |
| DELETE | `/producto-imagen/{id}` | Elimina imagen de producto. Response: `{ "response": {} }` | `DetalleProductoComponent`, `UpdateComponent` | `eliminarImagen()` | → Detalle producto → ✕ imagen / → Editar producto → ✕ imagen |

---

## ⚠️ CAMBIO PLANEADO — VERSIONADO UNIFICADO `/v1/` (pendiente — solo documentado, NO implementado)

> El back va a estandarizar TODAS las URLs (proyecto-key 9091 y micro-imágenes 9096) agregando
> el segmento `/v1/` justo después de `/mis-productos`. Esto reemplaza el esquema actual donde
> unos endpoints no tenían versión (los `@Deprecated`) y otros ya usaban `/v2/`.
> **Por ahora esto es solo para documentar — el front actualizará las URLs cuando el back confirme
> que ya está desplegado.**

### Regla general (aplica a TODO el inventario de este documento)

```
Antes:   http://localhost:9096/mis-productos/imagenes/file/{imagenId}
Después: http://localhost:9096/mis-productos/v1/imagenes/file/{imagenId}

Antes:   http://localhost:9091/mis-productos/productos/obtenerProductos
Después: http://localhost:9091/mis-productos/v1/productos/obtenerProductos
```

Es decir: a CADA URL listada en la Sección A y la Sección B (sin excepción, tengan o no
versión hoy) se le inserta `/v1/` inmediatamente después de `/mis-productos`.

### Qué pasa específicamente con los endpoints que HOY dicen `v2`

Los que actualmente tienen `/v2/` en su path **pierden el "v2"** — se convierten en la nueva
base `/v1/` (siguiendo la regla general de arriba). Su contraparte `@Deprecated` (la versión
sin número que hace lo mismo de forma vieja) **se elimina** — deja de existir.

| Endpoint actual `v2` | Pasa a ser (`/v1/` unificado) | Qué pasa con el `@Deprecated` equivalente |
|---|---|---|
| `GET /imagen/v2/{id}/detalle?page=&size=` | `GET /v1/imagen/{id}/detalle?page=&size=` | `GET /imagen/{id}/detalle` se elimina |
| `DELETE /variantes/v2/{varianteId}/imagenes` | `DELETE /v1/variantes/{varianteId}/imagenes` | `DELETE /variantes/{varianteId}/imagenes` se elimina |
| `GET /presentacion/v2/imagenes?tipo=` | `GET /v1/presentacion/imagenes?tipo=` | `GET /presentacion/imagenes?tipo=` se elimina |
| `GET /presentacion/v2/imagenes/{id}/imagen` | `GET /v1/presentacion/imagenes/{id}/imagen` | `GET /presentacion/imagenes/{id}/imagen` se elimina |
| `GET /presentacion/v2/imagenes/todas` | `GET /v1/presentacion/imagenes/todas` | `GET /presentacion/imagenes/todas` se elimina |
| `PUT /presentacion/v2/imagenes/{id}` | `PUT /v1/presentacion/imagenes/{id}` | `PUT /presentacion/imagenes/{id}` se elimina |
| `GET /imagen/v2/{productoId}` *(sin uso en front)* | `GET /v1/imagen/{productoId}` | — (no tiene deprecated equivalente) |
| `DELETE /variantes/v2/imagenes` *(sin uso en front)* | `DELETE /v1/variantes/imagenes` | — |
| `GET /variantes/v2/imagenes/{varianteId}` *(sin uso en front)* | `GET /v1/variantes/imagenes/{varianteId}` | — |

### Endpoints del micro de imágenes con migración `v2` PLANEADA (todavía ni siquiera conectados al front — ver CLAUDE.md "Migraciones 5/6")

Estos cuatro estaban anotados como "deprecated → v2 pendiente" en CLAUDE.md. Con el cambio
unificado, su destino final es directamente `/v1/...` (el paso intermedio por `v2` ya no aplica):

| Antes (`@Deprecated`) | Se planeaba | Destino final unificado |
|---|---|---|
| `DELETE /imagen/{idImagen}` | `DELETE /imagen/v2/{idImagen}` | `DELETE /v1/imagen/{idImagen}` |
| `DELETE /imagen/{productoId}/imagenes` | `DELETE /imagen/v2/{productoId}/imagenes` | `DELETE /v1/imagen/{productoId}/imagenes` |
| `DELETE /imagen/producto` | `DELETE /imagen/v2/producto` | `DELETE /v1/imagen/producto` |
| `GET /imagen/cache/imagen/limpiar` | `GET /imagen/v2/cache/limpiar` | `GET /v1/imagen/cache/limpiar` |

### Para TODOS los demás endpoints (los que hoy no tienen versión y no son parte de una migración)

Simplemente se les agrega `/v1/` después de `/mis-productos`, sin ningún otro cambio de
nombre ni de comportamiento. Ejemplos representativos (la regla aplica igual a cada fila
de la Sección A y la Sección B de este documento):

- `POST /auth/login` → `POST /v1/auth/login`
- `GET /productos/findById/{id}` → `GET /v1/productos/findById/{id}`
- `GET /variantes/paginado?pagina=&size=` → `GET /v1/variantes/paginado?pagina=&size=`
- `GET /pedidos/findPedido/{id}?size=&page=` → `GET /v1/pedidos/findPedido/{id}?size=&page=`
- `GET /producto-imagen/listar/{productoId}` → `GET /v1/producto-imagen/listar/{productoId}`
- `DELETE /admin/cache` → `DELETE /v1/admin/cache`

### Acción pendiente del front (cuando el back confirme el despliegue)

1. Agregar `/v1` a las constantes base de los `environment` (o a cada servicio que arma la URL)
2. Quitar el toggle `🧪 IMG v1/v2` del sidebar — deja de tener sentido porque ya no hay dos
   versiones convivientes, solo existe `/v1/`
3. Simplificar los servicios que hoy eligen entre URL v1/v2 según `ImagenVersionService.useV2`
   (`ProductoService`, `ImagenesService`, `PresentacionService`, `VarianteService`) — usan
   siempre la única URL `/v1/...`

---

## ENDPOINTS SIN USO EN EL FRONT

> Métodos creados en los servicios pero que ningún componente invoca actualmente.
> **Candidatos a eliminar** del back (y de los servicios del front) en una limpieza posterior —
> por ahora solo quedan anotados aquí para revisión, no se tocan todavía.

### Proyecto-Key

| Servicio | Método | URL | Notas |
|---------|--------|-----|-------|
| `AccederService` | `refresh()` | `POST /auth/refresh` | Token refresh no implementado en front |
| `AccederService` | `logout()` | `POST /auth/logout` | Logout solo limpia token local, no llama al back |
| `ProductoService` | `saveVenta()` | `POST /ventas/save` | Duplicado — `VarianteService.saveVentaDirecta()` usa el mismo endpoint |
| `ProductoService` | `getTotalVenta()` | `GET /ventas/getTotalVentas` | Sin pantalla de reportes implementada |
| `ProductoService` | `saveGasto()` | `POST /gastos/save` | Módulo de gastos sin UI activa |
| `ProductoService` | `getDataGastos()` | `GET /gastos/getGastos?size=&page=` | Módulo de gastos sin UI activa |
| `ProductoService` | `saveCliente()` | `POST /clientes/save` | Sin componente que lo invoque actualmente |
| `ProductoService` | `deleteProductoPorId()` | `DELETE /productos/deleteBy/{id}` | Sin botón de borrar en la UI |
| `ProductoService` | `getNoHabilitados()` | `GET /productos/admin/no-habilitados?size=&page=` | Sin pantalla de productos deshabilitados |
| `ProductoService` | `getSinStock()` | `GET /productos/admin/sin-stock?size=&page=` | Sin pantalla de sin stock de productos |
| `ProductoService` | `habilitarProducto()` | `PUT /productos/{id}/habilitar?habilitar=` | Sin botón en la UI |
| `ProductoService` | `descargarReporteExcel()` | `GET /productos/admin/sin-variantes/reporte` | Sin botón de descarga |
| `ImagenesService` | `getImagenV2()` | `GET /imagen/v2/{productoId}` | Creado pero sin componente que lo invoque — ver CLAUDE.md |
| `ImagenesService` | `setPrincipalProducto()` | `PUT /producto-imagen/{imagenId}/principal` | Sin conectar en ningún componente activo |
| `VarianteService` | `getPorProductoPaginadoResumen()` | `GET /variantes/porProducto/{productoId}/paginado/resumen?pagina=&size=` | Sin uso |
| `VarianteService` | `delete()` | `DELETE /variantes/delete` | Sin botón de borrar variante en UI |
| `VarianteService` | `eliminarTodasImagenesVariantes()` | `DELETE /variantes/imagenes` | Operación masiva admin — sin UI pendiente de back |
| `VarianteService` | `eliminarTodasImagenesVariantesV2()` | `DELETE /variantes/v2/imagenes` | Igual — ver CLAUDE.md endpoint 14 |
| `VarianteService` | `getImagenesVariante()` | `GET /variantes/imagenes/{varianteId}` | Endpoint no paginado — ver CLAUDE.md endpoint 13 |
| `VarianteService` | `getImagenesVarianteV2()` | `GET /variantes/v2/imagenes/{varianteId}` | Igual — sin componente que lo use |
| `VarianteService` | `getAll()` | `GET /variantes/getAll?page=&size=` | Sin pantalla de listado general admin |
| `VarianteService` | `getAdminSinStock()` | `GET /variantes/admin/sin-stock?pagina=&size=` | Sin pantalla de stock 0 |
| `VarianteService` | `inicializarDesdeProducto()` | `POST /variantes/inicializarDesdeProducto` | Sin UI que lo invoque |
| `VarianteService` | `guardarPedidoVariante()` | `POST /pedidos/savePedido` | Duplicado en `shared/pedidos.service.ts` |
| `PresentacionService` | `getTodasImagenesPorId()` | `GET /presentacion/imagenes/imagenes/{id}/imagen` | URL mal formada, sin uso |
| `PresentacionService` | `getImagenV2Bytes()` | `GET /presentacion/v2/imagenes/{id}/imagen` | Reemplazado por URL directa `getImagenUrlV2()` — ver CLAUDE.md |
| `UsuarioService` | `eliminarUsuarioDto()` | `DELETE /usuarios/eliminarUsuarioDto/{tipoDato}` | Sin botón de borrar en UI |
| `UsuarioService` | `buscarClientePorIdUsuario()` | `GET /usuarios/buscarClientePorIdUsuario/{idUsuario}` | Sin uso |
| `PedidosService (shared)` | `saveDataPedido()` | `POST /pedidos/savePedido` | Duplicado — `VarianteService.guardarPedidoVariante()` mismo endpoint |
| `PedidosService` | `getDataOnePedidoById()` | `GET /pedidos/findPedido/{idPedido}/{idCliente}?size=&page=` | Sin uso |
| `PedidosService` | `eliminarDetalle()` | `DELETE /pedidos/{pedidoId}/detalle/{productoId}?cantidad=` | Sin UI para editar detalle de pedido |
| `PagoService` | `getTiposPago()` | `GET /pagos/tipos-pago` | Sin uso |
| `PagoService` | `getTarifas()` | `GET /pagos/tarifas` | Sin uso |
| `PagoService` | `getIva()` | `GET /pagos/iva` | Sin uso |
| `PagoService` | `getOpciones()` | `GET /pagos/opciones` | Sin uso |
| `PagoService` | `getOpcionesPorTipo()` | `GET /pagos/opciones-por-tipo/{tipoPagoId}` | Sin uso |
| `PagoService` | `getHistorialPorPedido()` | `GET /mp/historial/pedido/{pedidoId}?pagina=&size=` | Sin uso |
| `PagoService` | `getHistorialDirectoMp()` | `GET /mp/historial/mp?desde=&hasta=` | Sin uso |
| `PalabraClaveService` | `getOne()` | `GET /palabras-clave/getOne/{id}` | Sin uso |
