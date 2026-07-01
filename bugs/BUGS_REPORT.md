# BUGS REPORT — proyecto_key_new
**Fecha análisis:** 2026-06-04  
**Estado:** en progreso — ver tabla al final para seguimiento

| ID | Descripción corta | Estado | Fecha fix |
|----|-------------------|--------|-----------|
| BUG-KEY-01 | @Transactional en private guardarProducto | ✅ Corregido | 2026-06-04 |
| BUG-KEY-02 | Lógica invertida búsqueda de pedidos | ✅ Corregido | 2026-06-04 |
| BUG-KEY-03 | parallelStream + JPA no thread-safe | ✅ Corregido | 2026-06-05 |
| BUG-KEY-04 | enProceso sin try/finally | ✅ Corregido | 2026-06-05 |
| BUG-KEY-05 | update() hace DELETE, URI sin id | ✅ Corregido | 2026-06-05 |
| BUG-KEY-06 | return null en catch de PedidoController | ✅ Corregido | 2026-06-05 |
| BUG-KEY-07 | NPE en getCredentials() sin null-check | ✅ Corregido | 2026-06-05 |
| BUG-KEY-08 | PUT presentacion no invalida caché | ✅ Corregido | 2026-06-05 |
| BUG-KEY-09 | UUID 63 bits — posible colisión de IDs | ✅ Corregido | 2026-06-05 |
| BUG-KEY-10 | saveAll() siempre retorna null | ✅ Corregido | 2026-06-05 |
| PERF-KEY-01 | .block() sin timeout en WebClient | ✅ Corregido | 2026-06-05 |
| PERF-KEY-02 | Paginación en memoria con lectura de disco | ✅ Corregido | 2026-06-05 |
| PERF-KEY-03 | N+1 queries en aplicarPrincipalProducto | ✅ Corregido | 2026-06-05 |

---

## RESUMEN DE AVANCE

### Sesión 2026-06-04 / 2026-06-05 — COMPLETADO ✅
- ✅ BUG-KEY-01 — `@Transactional` en método `private` → cambiado a `protected`
- ✅ BUG-KEY-02 — Lógica invertida en búsqueda de pedidos → condicional invertido
- ✅ BUG-KEY-03 — `parallelStream` + JPA → reemplazado por `saveAll()` en batch
- ✅ BUG-KEY-04 — `enProceso` sin `try/finally` → envuelto en try/catch/finally
- ✅ BUG-KEY-05 — `update()` hacía DELETE → lanza `UnsupportedOperationException` (código muerto protegido)
- ✅ BUG-KEY-06 — `return null` en 4 catches de `PedidoController` → `ResponseEntity` de error controlado
- ✅ BUG-KEY-07 — NPE en `getCredentials()` → null-check con `IllegalStateException`
- ✅ BUG-KEY-08 — `PUT /presentacion/imagenes` no invalidaba caché → agregado `cacheService.evictAll()`
- ✅ BUG-KEY-09 — UUID 63 bits → XOR de las dos mitades del UUID (128 bits efectivos)
- ✅ BUG-KEY-10 — `saveAll()` retornaba null → cambiado a `void` en interfaz e implementación
- ✅ PERF-KEY-01 — `.block()` sin timeout → `.timeout(Duration.ofSeconds(5))` en todos los WebClient
- ✅ PERF-KEY-02 — Paginación en memoria → paginación SQL con `Pageable`, eliminado `paginarEnMemoria()`
- ✅ PERF-KEY-03 — N+1 en `aplicarPrincipalProducto` → 2 queries `@Modifying` en el repositorio

### Pendiente — micro_imagenes
Todo el `BUGS_REPORT.md` de micro_imagenes está pendiente (BUG-IMG-01 al BUG-IMG-12 + PERF-IMG-01 al PERF-IMG-05)

---

## NOTA TÉCNICA — Cuándo usar `parallelStream` y cuándo NO

### ¿Para qué sirve `parallelStream`?
Divide una lista en partes y las procesa en varios hilos del CPU al mismo tiempo.
Funciona bien cuando cada operación es **independiente** y **no comparte estado** con las demás.

### ✅ Casos donde SÍ funciona bien

```java
// 1. Cálculos en memoria — cada hilo trabaja con su propio dato
lista.parallelStream()
     .map(precio -> precio * 1.16)
     .toList();

// 2. Llamadas HTTP independientes a servicios externos
// (cada hilo llama a una API diferente, no comparten nada)
listaDeIds.parallelStream()
          .forEach(id -> servicioExterno.consultar(id));

// 3. Procesamiento de archivos independientes
archivos.parallelStream()
        .forEach(archivo -> comprimir(archivo));
```

### ❌ Casos donde NO funciona — JPA / base de datos

```java
// MAL: todos los hilos comparten el mismo EntityManager de JPA
// JPA fue diseñado para UN solo hilo por transacción
lista.parallelStream()
     .forEach(item -> repository.save(item)); // bomba de tiempo
```

**¿Por qué falla con JPA?**
Spring le asigna un `EntityManager` a cada request HTTP. Ese `EntityManager` lleva un "cuaderno interno" de todos los objetos que está manejando en la transacción actual. Si dos hilos escriben en ese cuaderno al mismo tiempo, las páginas se revuelven y puede resultar en:
- Duplicados silenciosos en la BD
- `ConcurrentModificationException` aleatorio
- Estado inconsistente sin mensaje de error claro

**¿Y es siquiera más rápido?**
No. El tiempo lo domina la BD, no el CPU. Hacer 12 `save()` en paralelo sigue siendo 12 round-trips a MySQL. Un solo `saveAll()` en batch es **más rápido** porque es 1 round-trip con todos los INSERTs juntos.

### Regla práctica
| Operación | ¿Usar parallel? |
|-----------|----------------|
| Cálculos en memoria (sin BD, sin IO) | ✅ Sí |
| Llamadas HTTP a APIs externas independientes | ✅ Sí (con cuidado) |
| `repository.save()` / `repository.findById()` | ❌ No |
| Cualquier cosa con `@Transactional` activo | ❌ No |
| Escritura a archivos compartidos | ❌ No |

---

## BUGS CRÍTICOS

### BUG-KEY-01 ✅ CORREGIDO 2026-06-04 — `@Transactional` en método `private` no tiene efecto
- **Archivo:** `ProductosServiceImpl.java:364`
- **Método:** `private Producto guardarProducto(ProductoDetalle productoDetalle)`
- **Controlador:** `ProductosControllerImpl`
- **Endpoints afectados:**
  - `POST /productos/save`
  - `PUT /productos/update`
- **Qué pasa:** Spring AOP no puede interceptar métodos privados, así que la anotación `@Transactional` es ignorada. Si falla cualquier operación después de que `iProductosRepository.save()` ya persistió (por ejemplo, el guardado de imágenes), **no hay rollback** y el producto queda en estado inconsistente con imágenes huérfanas en disco.
- **Fix:** cambiar visibilidad de `private` a `protected` en `guardarProducto()`.

---

### BUG-KEY-02 ✅ CORREGIDO 2026-06-04 — Lógica invertida en búsqueda de pedidos por cliente
- **Archivo:** `PedidoServiceImpl.java:247`
- **Método:** `buscarClientePorPedido(String buscar, int size, int page)`
- **Controlador:** `PedidoController`
- **Endpoint afectado:** `GET /pedidos/buscarClientePedido/{buscar}`
- **Qué pasa:** el condicional está al revés:
  - Si `buscar` está **vacío** → llama a `buscarPedidosPorCliente("")` (busca con cadena vacía)
  - Si `buscar` tiene texto → llama a `buscarTodosLosPedidos()` (ignora el parámetro)
  - Resultado: cuando el usuario escribe un nombre **obtiene todos los pedidos**; cuando manda vacío hace búsqueda por texto vacío.
- **Fix:** invertir el `if/else`.

---

### BUG-KEY-03 ✅ CORREGIDO 2026-06-05 — `parallelStream` + JPA `EntityManager` no es thread-safe
- **Archivo:** `ProductosServiceImpl.java:352`
- **Método:** `compartirImagenesVarianteDto(CompartirImagenesVarianteDto)`
- **Controlador:** `ProductosControllerImpl`
- **Endpoint afectado:** `POST /productos/compartir-imagenes-variantes`
- **Qué pasa:** se usa `parallelStream` anidado para llamar a `iVarianteImagenRepository.save()` desde múltiples hilos. El `EntityManager` de JPA **no es thread-safe**; esto puede corromper el `PersistenceContext`, insertar duplicados silenciosos o lanzar `ConcurrentModificationException`.
- **Fix:** usar stream secuencial + `saveAll(List)` en una sola llamada.

---

### BUG-KEY-04 ✅ CORREGIDO 2026-06-05 — `enProceso` queda `true` para siempre si hay excepción
- **Archivo:** `ReconciliacionImagenService.java:68`
- **Método:** `reconciliar(Integer soloProductoId)` (privado, llamado por `reconciliarTodos()` y `reconciliarProducto()`)
- **Controlador:** `AdminReconciliacionController`
- **Endpoints afectados:**
  - `POST /admin/reconciliacion/imagenes` → reconcilia todos
  - `POST /admin/reconciliacion/imagenes/limpiar-bd`
- **Qué pasa:** `enProceso = true` al inicio, pero no hay `try/finally`. Si se lanza cualquier excepción (error de BD, NPE, etc.), `enProceso` queda `true` permanentemente hasta reiniciar el servidor. Todos los intentos posteriores son rechazados.
- **Fix:** envolver el cuerpo en `try { ... } finally { enProceso = false; }`.

---

### BUG-KEY-05 ✅ CORREGIDO 2026-06-05 — `update()` ejecuta DELETE en vez de actualizar, URI sin path variable
- **Archivo:** `ImagenProductoClienteVPS.java:87`
- **Método:** `update(Integer id)`
- **Callers actuales:** ninguno (código muerto, no se llama desde ningún servicio)
- **Endpoint que lo activaría si se llamara:** llamada interna hacia `PUT /producto-imagen` del micro_imagenes
- **Qué pasa:** el método usa `.delete()` en el WebClient en vez de `.put()`, y la URI `"/imagenes/"` nunca inserta el `id` como path variable. Si alguien conecta este método, ejecuta un DELETE a una URL incorrecta.
- **Fix:** cambiar `.delete()` por `.put()` o `.patch()` y corregir la URI a `"/imagenes/" + id`.

---

## BUGS MENORES

### BUG-KEY-06 ✅ CORREGIDO 2026-06-05 — `return null` en bloques `catch` del controlador
- **Archivo:** `PedidoController.java`
- **Controlador:** `PedidoController`
- **Endpoints afectados (con `return null` en su catch):**
  - `GET /pedidos/findPedido/{id}` (línea 80)
  - `GET /pedidos/findPedido/{idPedido}/{idCliente}` (línea 89)
  - `GET /pedidos/buscarClientePedido/{buscar}` (línea 98)
  - `DELETE /pedidos/delete/{id}` (línea 110)
- **Qué pasa:** retornar `null` desde un `ResponseEntity` causa `NullPointerException` en el `DispatcherServlet` de Spring, lo que resulta en un error 500 genérico sin mensaje útil para el cliente.
- **Fix:** reemplazar `return null` por `ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()` o con cuerpo de error.

---

### BUG-KEY-07 ✅ CORREGIDO 2026-06-05 — NPE en `getCredentials().toString()` sin null-check
- **Archivo:** `ImageneClienteDisco.java:54`
- **Método:** `save(MultiValueMap multipartData)`
- **Controlador:** cualquier flujo que suba imágenes hacia el micro
- **Endpoints afectados:** `POST /variantes/guardarConImagenes`, `POST /productos/save`, `PUT /productos/update`
- **Qué pasa:** `authentication.getCredentials()` puede devolver `null` en ciertos contextos de Spring Security (por ejemplo, después de que el token se consume). `toString()` sobre `null` → `NullPointerException` → 500 sin mensaje controlado.
- **Fix:** agregar null-check: `Object creds = authentication.getCredentials(); if (creds == null) throw new ...`.

---

### BUG-KEY-08 ✅ CORREGIDO 2026-06-05 — `PUT /presentacion/imagenes/{id}` no invalida la caché
- **Archivo:** `ImagenPresentacionService.java:80`
- **Método:** `actualizar(Long id, ...)`
- **Controlador:** `ImagenPresentacionController`
- **Endpoints afectados:**
  - `PUT /presentacion/imagenes/{id}`
  - `PUT /presentacion/v2/imagenes/{id}`
- **Qué pasa:** el método guarda la imagen actualizada en disco y en BD pero no llama a `cacheService.evictAll()`. La caché de `presentacion-imagenes` sigue sirviendo la imagen anterior hasta que expire naturalmente.
- **Fix:** agregar `cacheService.evictAll()` al final del método, igual que en otros métodos de escritura.

---

### BUG-KEY-09 ✅ CORREGIDO 2026-06-05 — IDs de imagen generados con UUID truncado a 63 bits (posible colisión)
- **Archivo:** `ProductosServiceImpl.java:579`
- **Método:** `mappImagenes(List<ImagenDTO>)`
- **Controlador:** `ProductosControllerImpl`
- **Endpoints afectados:** `POST /productos/save`, `PUT /productos/update`
- **Qué pasa:** `UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE` usa solo 63 bits de un UUID de 128 bits. Con un catálogo grande el riesgo de colisión aumenta. Si hay constraint `UNIQUE` en BD → error; si no → duplicados silenciosos.
- **Fix:** dejar que la BD autogenere el ID con autoincrement, o usar un contador atómico.

---

### BUG-KEY-10 ✅ CORREGIDO 2026-06-05 — `saveAll()` siempre retorna `null`
- **Archivo:** `ImagenProductoClienteVPS.java:64`
- **Método:** `saveAll(List<RequestProductoImagen>)`
- **Callers:**
  - `ProductosServiceImpl.java:556` → endpoints `POST /productos/save`, `PUT /productos/update`
  - `ReconciliacionImagenService.java:120` y `:151` → endpoint `POST /admin/reconciliacion/imagenes`
- **Qué pasa:** el método declara `ResponseGeneric<ProductoImagen>` como retorno pero siempre devuelve `null`. Actualmente ningún caller usa el retorno, pero si alguno lo hiciera tendría NPE. El contrato es engañoso.
- **Fix:** cambiar el tipo de retorno a `void` para que refleje la realidad (fire-and-forget vía Rabbit).

---

## RENDIMIENTO

### PERF-KEY-01 ✅ CORREGIDO 2026-06-05 — `.block()` en WebClient sin timeout — hilos de Tomcat bloqueados indefinidamente
- **Archivos:** `ImageneClienteDisco.java`, `ImagenProductoClienteVPS.java`
- **Métodos afectados:** `getAll()`, `getOne()`, `verificarExistentes()`, `save()`, `buscarImagenProducto()`
- **Endpoints que los usan:** `GET /imagen/{id}`, `GET /imagen/v2/{productoId}`, `GET /variantes/buscar`, `GET /variantes/imagenes/{varianteId}`, `GET /productos/findById/{id}`
- **Qué pasa:** cada `.block()` sin timeout ocupa un hilo de Tomcat mientras espera respuesta del micro_imagenes. Si el micro tarda o no responde, los hilos se agotan y el servidor deja de responder.
- **Fix mínimo:** configurar timeout en el WebClient: `.timeout(Duration.ofSeconds(5))` antes de `.block()`.

---

### PERF-KEY-02 ✅ CORREGIDO 2026-06-05 — Paginación en memoria con lectura de disco
- **Archivo:** `ImagenServiceImpl.java:72`
- **Método:** `findImagenPrincipalPorProductoIds(int id, int page, int size)`
- **Controlador:** `ImageneController`
- **Endpoints afectados:** `GET /imagen/{id}/detalle`, `GET /imagen/v2/{productoId}/detalle`
- **Qué pasa:** carga la lista completa desde BD (`findImagenPrincipalPorProductoIds55`), lee cada archivo de disco a bytes en memoria, y luego recorta por página en Java. Para un producto con muchas imágenes, todo entra en heap.
- **Fix:** mover la paginación a la query SQL con `Pageable`.

---

### PERF-KEY-03 ✅ CORREGIDO 2026-06-05 — N+1 queries en `aplicarPrincipalProducto`
- **Archivo:** `ProductosServiceImpl.java:600`
- **Método:** `aplicarPrincipalProducto(Integer productoId, Long imagenId)`
- **Controlador:** `ProductosControllerImpl`
- **Endpoints afectados:** `POST /productos/save`, `PUT /productos/update` (cuando se envía `imagenPrincipalId` en el body)
- **Qué pasa:** hace 1 SELECT para obtener todas las imágenes y luego N UPDATEs individuales (uno por imagen). Para un producto con 10 imágenes: 11 queries.
- **Fix:** reemplazar con 2 queries: `UPDATE SET principal=false WHERE productoId=?` + `UPDATE SET principal=true WHERE imagenId=?`.
