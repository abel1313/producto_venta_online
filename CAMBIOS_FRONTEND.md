# Cambios Frontend — Registro de implementaciones

Documento de referencia de todos los cambios realizados en el frontend.
Cada sección indica qué se cambió, en qué archivos y qué endpoints consume.

---

## 1. Catálogo de palabras clave (nueva feature)

### Qué se hizo
CRUD completo para el catálogo de categorías. Se puede gestionar desde `/palabras-clave` (solo admin).
El autocomplete se integró en los formularios de producto y variante para asignar la categoría al guardar.

### Archivos nuevos
| Archivo | Descripción |
|---|---|
| `src/app/palabras-clave/models/palabra-clave.model.ts` | Interfaces: `IPalabraClave`, `IPalabraClaveRequest`, `IPalabrasClavePaginable` |
| `src/app/palabras-clave/service/palabra-clave.service.ts` | Servicio CRUD completo |
| `src/app/palabras-clave/gestion/gestion-palabras-clave.component.ts` | Componente admin: lista, agrega, edita, elimina palabras clave |
| `src/app/palabras-clave/gestion/gestion-palabras-clave.component.html` | Template del CRUD |
| `src/app/palabras-clave/gestion/gestion-palabras-clave.component.scss` | Estilos del CRUD |
| `src/app/palabras-clave/autocomplete/palabra-clave-autocomplete.component.ts` | Autocomplete reutilizable para formularios |
| `src/app/palabras-clave/autocomplete/palabra-clave-autocomplete.component.html` | Template del autocomplete |
| `src/app/palabras-clave/autocomplete/palabra-clave-autocomplete.component.scss` | Estilos del autocomplete |
| `src/app/palabras-clave/palabras-clave.module.ts` | Módulo lazy — ruta `/palabras-clave` |

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/app-routing.module.ts` | Ruta lazy `/palabras-clave` con guard admin |
| `src/app/shared/shared.module.ts` | Declara y exporta `PalabraClaveAutocompleteComponent` |
| `src/app/productos/producto/models/producto.model.ts` | `+palabraClaveId?: number | null` en `IProducto` |
| `src/app/productos/producto/models/producto.dto.model.ts` | `+palabraClave?` en `IProductoDTORec` para precarga al editar |
| `src/app/variante/models/variante.model.ts` | `+palabraClaveId?` en `IVarianteRequest` y `+palabraClave?` en `IVariante` |
| `src/app/productos/producto/add/add.component.ts` | `palabraClaveSeleccionada`, `onPalabraClaveSeleccionada()`, `palabraClaveId` en payload |
| `src/app/productos/producto/add/add.component.html` | `<app-palabra-clave-autocomplete>` después del campo Descripción |
| `src/app/variante/update-variante/update-variante.component.ts` | Mismo patrón + precarga al editar |
| `src/app/variante/update-variante/update-variante.component.html` | `<app-palabra-clave-autocomplete>` en el form |
| `src/app/variante/agregar/agregar.component.ts` | `palabraClaveId` en todos los payloads del lote, limpieza en `resetForm()` |
| `src/app/variante/agregar/agregar.component.html` | `<app-palabra-clave-autocomplete>` con nota "aplica a todas las variantes" |

### Endpoints que consume

| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `GET` | `/palabras-clave/buscar?nombre=&pagina=&size=` | `PalabraClaveService.buscar()` | Autocomplete mientras el admin escribe |
| `GET` | `/palabras-clave/getAll?page=&size=` | `PalabraClaveService.getAll()` | Cargar lista completa en la pantalla CRUD |
| `GET` | `/palabras-clave/getOne/{id}` | `PalabraClaveService.getOne()` | Obtener una por ID |
| `POST` | `/palabras-clave/save` | `PalabraClaveService.save()` | Crear nueva palabra clave |
| `PUT` | `/palabras-clave/update/{id}` | `PalabraClaveService.update()` | Editar nombre |
| `DELETE` | `/palabras-clave/delete` body: `id` | `PalabraClaveService.delete()` | Eliminar del catálogo |
| `POST` | `/productos/save` | `add.component.ts guardar()` | Ahora incluye `palabraClaveId` en el body |
| `PUT` | `/productos/update` | `add.component.ts guardar()` | Ahora incluye `palabraClaveId` en el body |
| `POST` | `/variantes/guardarConImagenes` | `update-variante.component.ts actualizar()` y `agregar.component.ts guardar()` | Ahora incluye `palabraClaveId` por variante |

---

## 2. Imágenes de productos — cambio a URL

### Qué se hizo
El backend dejó de devolver bytes (`imagen: string` en base64 en el JSON del listado).
Ahora devuelve solo la URL al microservicio de imágenes (`urlImagen`).
El frontend la consume vía `HttpClient` (con JWT) para que el interceptor agregue el token.

### Archivos nuevos
| Archivo | Descripción |
|---|---|
| `src/app/productos/producto/pipes/imagen-src.pipe.ts` | Pipe `imagenSrc` — llama al endpoint de imagen con JWT y devuelve `data:image/...;base64,...` |
| `src/app/shared/shared.module.ts` | Declara y exporta el pipe (compartido con variantes) |

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/productos/producto/models/producto.model.dto.ts` | `+urlImagen?` en `Imagen`, `imagen` → opcional, quitó `listImgs` |
| `src/app/productos/producto/all/all.component.ts` | Eliminó método `imageSrc()` que construía base64 manual |
| `src/app/productos/producto/all/all.component.html` | `<img>` ahora usa `item.imagen?.urlImagen | imagenSrc | async` |
| `src/app/productos/producto/producto.module.ts` | Importa/exporta `SharedModule` en vez del pipe directo |

### Endpoints que consume

| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `GET` | `/productos/buscarNombreOrCodigoBarra?size=&page=&nombre=` | `ProductoService.getDataNombreCodigoBarra()` | Listado de productos con `urlImagen` en el objeto `imagen` |
| `GET` | `{urlImagen}` (ej. `http://microservicio/buscarImagenProducto/265`) | `ImagenSrcPipe.transform()` | Obtiene el JSON `{ imagen, contentType }` del microservicio. Responde con base64 |

---

## 3. Imágenes de variantes — cambio a URL

### Qué se hizo
Mismo cambio que productos. `imagenBase64` en `IVarianteResumen` ahora viene `null`.
El backend agrega el campo nuevo `imagenUrl` con la URL al microservicio.

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/variante/models/variante.model.ts` | `+imagenUrl?` en `IVarianteResumen` |
| `src/app/variante/models/detalle-variante.model.ts` | `+imagenUrl?` en `IDetalleVariante` |
| `src/app/variante/service/carrito-variante.service.ts` | Propaga `imagenUrl` al agregar al carrito |
| `src/app/variante/buscar/buscar.component.ts` | Eliminó método `imageSrc()` |
| `src/app/variante/buscar/buscar.component.html` | `<img>` usa `v.imagenUrl | imagenSrc | async` |
| `src/app/variante/venta-variante/venta-variante.component.ts` | `verImagen()` usa `imagenUrl` |
| `src/app/variante/venta-variante/venta-variante.component.html` | Botón y visor usan `imagenUrl | imagenSrc | async` |
| `src/app/variante/venta-directa/venta-directa.component.ts` | `verImagen()` simplificado a URL directa |
| `src/app/variante/venta-directa/venta-directa.component.html` | Resultados y líneas usan `imagenUrl | imagenSrc | async` |
| `src/app/variante/agregar.module.ts` | Importa `SharedModule` para acceder al pipe |

### Endpoints que consume

| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `GET` | `/variantes/buscar?termino=&pagina=&size=` | `VarianteService.buscar()` | Devuelve `imagenUrl` por variante |
| `GET` | `{imagenUrl}` (ej. `http://microservicio/imagenes?ids=12345`) | `ImagenSrcPipe.transform()` | Obtiene el array `[{ imagen, contentType }]`. Responde con base64 del primer elemento |

---

## 4. Modal cliente sin registro — venta directa

### Qué se hizo
Rediseño del modal `modalClienteSinRegistro` en la pantalla de venta directa.
Nuevo diseño con header degradado, grid de 2 columnas, mismo estilo que el resto de la app.
Cuando se guarda, aparece un chip similar al del cliente registrado.

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/variante/venta-directa/venta-directa.component.html` | Modal rediseñado, chip de cliente sin registro, botón "o" entre buscador y modal |
| `src/app/variante/venta-directa/venta-directa.component.scss` | Clases `.vd-modal-*`, `.vd-client-chip--sinreg`, `.vd-client-divider`, `.vd-btn-sinreg` |
| `src/app/variante/venta-directa/venta-directa.component.ts` | `obtenerDatosClienteSinRegistro()` corregido, `limpiarClienteSinRegistro()` agregado |

### Endpoints que consume
| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `POST` | `/variantes/saveVentaDirecta` (o equivalente) | `cobrar()` | El body ya incluía `clienteSinRegistroDto` con los datos del modal |

---

## 5. Cancelar pedido — selector de motivo

### Qué se hizo
Al cancelar un pedido, ahora aparece un selector de radio con el motivo.
El motivo se manda como query param al endpoint.

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/pedidos/pedidos.service.ts` | Nuevo método `cancelarConMotivo(id, motivo)` |
| `src/app/pedidos/mis-pedidos/mis-pedidos.component.ts` | `cancelarPedido()` muestra radio con opciones antes de confirmar |

### Endpoints que consume
| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `DELETE` | `/pedidos/delete/{id}?motivo=NO_SE_PRESENTO` | `PedidosService.cancelarConMotivo()` | Motivos posibles: `NO_SE_PRESENTO`, `CLIENTE_AVISO`. Default backend: `NO_SE_PRESENTO` |

---

## 6. Importar clientes a la rifa — campo `mes` y `sinRegistro`

### Qué se hizo
El request de importar clientes ahora incluye el campo `mes` (requerido para calcular boletos).
`IClientePedido` ahora tiene `sinRegistro: boolean` que viene en el response de `clientesPorMes`.
`IConcursante` tiene `boletosBase` y `boletos` — se muestra `boletosBase` en la tabla.

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/rifas/models/concursante.model.ts` | `+sinRegistro` en `IClientePedido`, `+mes` en request, `+boletosBase`, `+boletos` en `IConcursante` |
| `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` | `importarClientes()` incluye `mes: this.mesSeleccionado` |
| `src/app/rifas/agregar-rifa/agregar-rifa.component.html` | Columna Boletos en tabla de participantes (muestra `boletosBase`) |
| `src/app/rifas/rifa-mes/rifa-mes.component.ts` | `crearRifaEImportar()` incluye `mes` en el request |

### Endpoints que consume
| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `GET` | `/concursante/clientesPorMes?mes=` | `RifaService.getClientesPorMes()` | Ahora el response incluye `sinRegistro: boolean` por cliente |
| `POST` | `/concursante/importarDePedidos` | `RifaService.importarDePedidos()` | Body ahora incluye `mes: "2026-05"` y `sinRegistro` por cliente |

---

## 7. Token interceptor — fix de requests colgados

### Qué se hizo
Cuando el refresh del token fallaba, los requests en cola esperaban indefinidamente.
Se agregó el sentinel `REFRESH_FAILED` para notificarles y que lancen error al componente.

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/token/TokenInterceptor .ts` | `handleRefresh()`: emite `REFRESH_FAILED` al BehaviorSubject cuando el refresh falla. Los requests en cola lo detectan y lanzan `HttpErrorResponse 401` |

### Endpoints que consume
| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `POST` | `/auth/refresh` | `TokenInterceptor.handleRefresh()` | Renueva el access token usando el refresh token en cookie |

---

## 8. Compartir imágenes (solo admin)

### Qué se hizo
Botón `📤 Imagen` visible solo para admin en las tarjetas de producto y variante.
Comparte solo la imagen (sin URL de la tienda para no exponer datos de admin).
- **Móvil**: Web Share API con el archivo de imagen
- **Desktop**: muestra la imagen en un Swal, admin copia/comparte

### Archivos nuevos
| Archivo | Descripción |
|---|---|
| `src/app/shared/compartir.service.ts` | Servicio de compartir: fetch imagen con JWT → Web Share API (móvil) o Swal con preview (desktop) |

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/variante/buscar/buscar.component.ts` | `compartirImagen(v)` — solo admin, solo imagen |
| `src/app/variante/buscar/buscar.component.html` | Botón `📤 Imagen` con `*ngIf="isAdminUser && v.imagenUrl"` |
| `src/app/productos/producto/all/all.component.ts` | `compartirImagen(item)` — mismo patrón |
| `src/app/productos/producto/all/all.component.html` | Botón `📤 Imagen` con `*ngIf="isAdminUser && item.imagen?.urlImagen"` |

### Endpoints que consume
| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| `GET` | `{imagenUrl}` del producto/variante | `CompartirService.fetchBlob()` | Obtiene la imagen con JWT → la convierte a File para compartir |

---

## 9. SEO básico

### Qué se hizo
Mejoras de SEO sin SSR: meta tags, Open Graph, sitemap y robots.txt.

### Archivos modificados / creados
| Archivo | Qué cambió |
|---|---|
| `src/index.html` | `lang="es"`, `<title>` descriptivo, `meta description/keywords`, Open Graph, Twitter Card, canonical |
| `src/robots.txt` | Nuevo — permite indexación, apunta al sitemap |
| `src/sitemap.xml` | Nuevo — rutas públicas del sitio |
| `angular.json` | `robots.txt` y `sitemap.xml` agregados a assets |

### Nota
Sin SSR, Google puede indexar SPAs pero con más lentitud.
Para previews en WhatsApp/Facebook se necesita SSR (`ng add @nguniversal/express-engine` para Angular 14).

---

## 10. Correcciones de caché en listas

### Qué se hizo
Las listas no refrescaban después de actualizar producto o variante.

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/productos/producto/add/add.component.ts` | Agrega `invalidarProdCache()` y mueve `navigate` dentro del `.then()` del Swal |
| `src/app/productos/producto/busca/busca.component.ts` | `ngOnInit` ahora carga la lista inicial (antes estaba vacío). `buscarPorNombreCodigoPostal` llama `setProdCache` |
| `src/app/variante/update-variante/update-variante.component.ts` | `next: (res)` usa la respuesta para actualizar el caché local antes de invalidar |

### Endpoints que consume
Los mismos de buscar — no cambian. Solo cambia cuándo se invalida el caché local del servicio.

---

## 11. Reorganización del menú (navbar)

### Qué se hizo
Menú reorganizado con lógica clara: público vs admin.

| Antes | Después |
|---|---|
| "Usuarios" standalone | Dentro de 🛠️ Admin |
| "QR" standalone dentro de Admin | Link público visible para todos |
| "Catalogos 🧩" mezclaba todo | Separado en "🛍️ Productos" (público) y "📦 Mis productos" (admin) |
| Sin palabras clave | 🏷️ Palabras clave en "📦 Mis productos" (admin) |
| Venta directa en Catálogos | Dentro de 💰 Ventas |

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `src/app/navbar/navbar.component.html` | Estructura completa reorganizada |

---

## 12. Fix carpetas `dist` fantasma dentro de `src/`

### Causa
Alguien ejecutó `tsc` directamente desde subdirectorios en vez de usar `ng serve`/`ng build`.
Como `tsconfig.json` tiene `"outDir": "./dist"`, se crearon carpetas `dist/` anidadas en cada componente.

### Solución aplicada
- Se eliminaron todas las carpetas `dist/` dentro de `src/` con PowerShell
- El `.gitignore` ya tenía `**/dist/` — no se subirán a git

### Regla
**Nunca correr `tsc` directo.** Siempre usar `ng serve` o `ng build`.
