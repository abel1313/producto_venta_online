# Tests pendientes — front (producto_venta_online)

Regla en `CLAUDE.md` (2026-10-06): ya no se escriben tests automáticos (Jasmine/Karma ni Playwright
`e2e/`) mientras las pantallas cambian tanto. Cada cambio nuevo deja aquí **qué test le falta y qué
tiene que comprobar**. Lo más nuevo va arriba.

Formato de cada entrada:

```

### AAAA-MM-DD — Qué se hizo
**Dónde:** componente / servicio / método
**Tipo:** unitario (componente o servicio con HttpTestingController) · e2e (Playwright contra QA)
**Debe comprobar:**
- [ ] acción → resultado esperado
```

---

### 2026-11-09 — Modal «Cliente sin registro»: ya no se corta arriba ni abajo (alto máximo, scroll interno, botones fijos)
**Dónde:** `variante/venta-directa/venta-directa.component.scss` (`.vd-modal-overlay`, `.vd-modal`, `.vd-modal__form`, `.vd-modal__actions`)
**Tipo:** e2e manual (varios tamaños de pantalla)
**Debe comprobar:**
- [ ] a 1360×700, 1280×560 y 400×700 el cuadro no toca el borde de arriba, el encabezado se ve, el formulario hace scroll adentro y «Cancelar / No registrar y cobrar / Guardar cliente» siempre se ven abajo
- [ ] con y sin campaña vigente (con la casilla del Aviso de privacidad), de día y de noche; los pasos «verificar correo» y «código» también caben
- [ ] clic en el fondo / ✕ se comportan igual que antes (con campaña no se cierra con clic fuera)

### 2026-11-08 — Venta directa: aviso que distingue «a mano» de «llegó a la meta», marca de versión y recarga cuando hay versión nueva
**Dónde:** `variante/venta-directa/venta-directa.component.{ts,html}` (`marcaVersion`, `hayVersionNueva`, `revisarVersion`, aviso del bloque de campaña)
**Tipo:** unitario (componente con `hayVersionNueva` simulado) · e2e manual en QA
**Debe comprobar:**
- [ ] casilla «Cliente recurrente» marcada → el aviso dice «recurrente a mano (casilla marcada)»; desmarcada y con $1,000 de $1,499 → «le faltan $499 pagados…»; con lo pagado ≥ meta → «ya es recurrente (llegó a la meta)»
- [ ] el título del bloque «🎁 Campaña» muestra la versión («· QR-6»)
- [ ] con una versión nueva publicada y el carrito vacío, al volver a la pestaña (o en ≤ 10 min) Venta directa se recarga sola; con artículos en el carrito o cobrando NO se recarga y muestra «Hay una versión nueva: recarga la página…»
- [ ] **QUITAR AL TERMINAR:** la marca (`marcaVersion` y su span); la recarga puede quedarse

### 2026-11-08 — Ticket por correo con diseño (estilos en línea) y QR de «Síguenos» incrustados
**Dónde:** `shared/ticket-correo.util.ts` (`htmlTicketParaCorreo`) · `pedidos/pedidos.service.ts` (`reenviarComprobante`) · `venta-directa`, `abonos` y `cobro-pedido.base` (`notificacion.ticketHtml`) · back `EmailService.enviarTicket` (`incrustarQrRemotos`)
**Tipo:** unitario (`htmlTicketParaCorreo` con un ticket de ejemplo; `enviarTicket` con `JavaMailSender` simulado) · e2e manual en QA (correo real)
**Debe comprobar:**
- [ ] el correo del ticket se ve con tabla: artículo a la izquierda e importe a la derecha, línea verde «🎁 Precio de campaña» con el normal tachado, TOTAL grande sobre fondo verde suave, Entregó/Cambio o Método, «¡Gracias por tu compra!», garantía y «Síguenos»; sin clases CSS (todo en línea)
- [ ] los QR de Tienda / WhatsApp / Facebook / Instagram / TikTok se ven **sin** pulsar «cargar imágenes» (van dentro del correo)
- [ ] abono, liquidado, saldo pendiente, cancelación y reenvío de comprobante (Mis pedidos, Detalle, Abonos, Cobro) también salen con diseño
- [ ] el ticket que se IMPRIME (térmico) y el texto de WhatsApp quedan idénticos a antes
- [ ] si el HTML ya viene sin clases de ticket, `htmlTicketParaCorreo` lo deja igual; si falla, manda el original

### 2026-11-08 — Meta: el ticket de la venta en curso ya no cuenta para calificar (`esRecurrente`)
**Dónde:** `variante/venta-directa/venta-directa.component.{ts,html}` (`esRecurrente`, aviso «le faltan $X pagados»)
**Tipo:** unitario (componente) · e2e manual en QA
**Debe comprobar:**
- [ ] cliente con código verificado que lleva $1,000 de $1,499: el bloque dice «le faltan $499 pagados para el precio de campaña» y los juguetes NO bajan, aunque el carrito pase de $1,499
- [ ] con lo ya pagado ≥ la meta dice «ya es recurrente» y los juguetes bajan; con la casilla «Cliente recurrente» también

### 2026-11-08 — Marca de versión temporal (QR-4) y recarga automática de la página del escáner del celular
**Dónde:** `shared/marca-version.ts` (`MARCA_VERSION_PRUEBA`, `hayVersionNueva`) · `escaner-celular-pagina.component.{ts,html}` · `navbar.component.{ts,html}`
**Tipo:** unitario (`hayVersionNueva` con `fetch` simulado) · e2e manual en QA
**Debe comprobar:**
- [ ] la página del escáner muestra «Versión: QR-4» y el menú «Escáner QR» muestra «QR-4» (si no sale, el navegador tiene la versión vieja: recargar)
- [ ] con la página del celular abierta, se publica una versión nueva → al volver a primer plano o en ≤ 10 min la página se recarga sola y sigue conectada
- [ ] `hayVersionNueva()` devuelve false sin red, sin hash en el nombre (desarrollo) o si es la misma versión; no recarga mientras hay una foto en vista previa
- [ ] **QUITAR AL TERMINAR:** `MARCA_VERSION_PRUEBA` y sus usos (cambiarla en cada subida: QR-5, QR-6…); la recarga automática puede quedarse

### 2026-11-08 — «Escáner QR» del celular (menú aparte): QR de cliente con cámara o foto → campo «Código del cliente» de Venta directa
**Dónde:** `escaner-celular/escaner-celular-pagina.component.{ts,html}` (`modoQr`, `alLeer`, `alElegirFotoQr`) · ruta `escaner-qr` (`app-routing.module.ts`, `data: { modo: 'qr' }`) · `navbar.component.html` («Escáner QR»)
**Tipo:** unitario (componente con `ActivatedRoute` simulado y `EscanerCelularService` simulado) · e2e manual en QA con celular real
**Debe comprobar:**
- [ ] `/escaner-qr` muestra «Escáner de QR de clientes» y SOLO los botones «📸 Foto del QR» y «🖼️ Elegir de la galería» (no «Tomar foto» ni «Cámara del celular»); `/escaner-celular` queda como antes
- [ ] cámara: un QR con un UUID (solo o dentro de `…/codigo-campana/<uuid>`) se manda con `canalEnviar(uuid)`; un código de barras u otro QR se ignora con «Ese QR no es un código de cliente»
- [ ] foto del QR (cámara nativa o galería): se lee con `leerQrDeImagen` y se manda como CÓDIGO (no como foto); sin QR legible → «No encontré un QR en esa foto…»
- [ ] sin Venta directa abierta en la PC → «La computadora no tiene abierta Venta directa con una campaña vigente»; con ella abierta, el UUID llena el campo y el cliente
- [ ] los códigos de barras del «Escáner» de siempre siguen yendo al buscador (con y sin campaña)
- [ ] el menú «Escáner QR» sale con sesión, igual que «Escáner»

### 2026-11-08 — Reporte de Campañas: botón «Ver QR» por persona
**Dónde:** `campanas/campanas.component.html` (`.cp-acciones-fila`)
**Tipo:** e2e manual en QA
**Debe comprobar:**
- [ ] Campañas → Reporte → «Ver QR» abre en pestaña nueva `/codigo-campana/<uuid>` con el QR de esa persona (sin iniciar sesión); «Eliminar datos» sigue funcionando

### 2026-11-08 — Campañas: scroll propio en la tarjeta de cada campaña y en el reporte
**Dónde:** `campanas/campanas.component.scss` (`.cp-card__productos`, `.cp-tabla`)
**Tipo:** e2e manual en QA (solo estilos)
**Debe comprobar:**
- [ ] campaña con 60+ juguetes → la tarjeta de la lista no se alarga: la lista de juguetes (alto ~16rem) hace scroll adentro y el scroll de la página no se mueve
- [ ] reporte con 30+ personas → la tabla hace scroll adentro (alto ~28rem) con el encabezado fijo
- [ ] celular (≤ 900px) y escritorio, de día y de noche: se ve igual de ordenado

### 2026-11-08 — Campañas: el QR llena al cliente, modal que no se cierra, 📱 con QR, imagen del QR, ticket con descuento
**Dónde:** `variante/venta-directa` (`cobrar()`, `alHacerClicEnElFondo`, `noRegistrarYCobrar`, `alCambiarCodigo`, `buscarCodigo`, `aplicarCodigo`, `ticketQueSuma`, `articulosDelTicket`) ·
`campanas/campanas.service.ts` (`buscarPorCodigo`) · `shared/entrada-codigo-qr/*` (`leerQrDeImagen`, `esUuid`, Enter, receptor) · `shared/escaner-celular/escaner-receptor.service.ts` (`destinoDelCodigo`) ·
`escaner-celular/escaner-celular-pagina.component.ts` y `assets/escaner/escaner.html` (`qr_code`) · `campanas/codigo-publico/*` (Descargar / Compartir) · `shared/ticket.util.ts` (`articuloDeDetalle`, `subTotalNormal`, `etiqueta`)
**Tipo:** unitario (componentes y utilidades; se probaron a mano en Karma temporal el 2026-11-08 y se borraron) · e2e manual en QA
**Debe comprobar:**
- [ ] Cobrar sin cliente con campaña vigente: la ventana «¿Registrar los datos del cliente?» NO se cierra con clic fuera ni Esc; «No registrar» cobra a nombre del administrador; sin campaña, clic fuera/Esc cierra y YA NO cobra
- [ ] Modal de datos del cliente con campaña: clic en el fondo no lo cierra; la ✕ sí; «No registrar y cobrar» solo sale si se abrió desde «Cobrar»; casilla de privacidad desmarcada → se guarda el cliente pero no se crea QR
- [ ] Pegar/escribir/escanear un UUID completo → llama a `buscar-por-codigo` solo; válido con `clienteId` → selecciona al cliente (`clienteSeleccionado`) y limpia el sin registro; con `clienteSinRegistroId` → llena el modal y el id; sin ids → pide elegir al cliente y valida por correo/teléfono
- [ ] UUID de otro cliente con la venta ya con cliente → pregunta «¿Cambiarlo?»; «No» limpia el código
- [ ] Código inexistente → «Ese código no existe», precio normal
- [ ] Meta en pantalla: Contado suma todo el ticket (1000 + 1000 ≥ 1500 → recurrente); Apartado no suma el ticket de hoy
- [ ] 📱: un UUID del celular entra al campo de campaña; un código de barras sigue entrando al buscador (con y sin campo de campaña, en cualquier orden de registro); en Android con `BarcodeDetector` sin `qr_code` se usa zxing o el detector sin `qr_code` sin fallar
- [ ] Imagen del QR: PNG normal, JPEG comprimido, QR de 120 px, 2400 px y captura grande con margen → se leen; imagen sin QR → aviso (ya probado en Chrome 141 el 2026-11-08)
- [ ] Lector USB: el UUID termina con Enter → busca; con teclado en otro idioma (`'` por `-`) se corrige
- [ ] Página `/codigo-campana/:uuid`: QR 600 px margen 4; «Descargar imagen» baja un PNG con el UUID escrito; «Compartir» solo sale si el navegador lo soporta; liga con texto que no es UUID → «no trae un código válido»
- [ ] Ticket: sin descuento sale idéntico a antes; con campaña muestra el normal tachado y «Precio de campaña»; impreso tras guardar usa `renglones[]` del back; en Mis pedidos / detalle / abonos usa `precioNormal` + `conPrecioDeCampana`
- [ ] Línea de Venta directa muestra «$X c/u» con el descuento aplicado

---

### 2026-11-09 — Campañas: buscador en «Juguetes y su precio de campaña»
**Dónde:** `CampanasComponent.productosFiltrados` / `alEscribirEnCampana` (Catálogo → Campañas, formulario)
**Tipo:** unitario (componente con el buscador de catálogo simulado) · e2e manual en QA
**Debe comprobar:**
- [ ] escribir parte de un nombre (sin importar mayúsculas ni acentos) deja solo esos juguetes y el contador dice «Mostrando X de N»
- [ ] escribir el código de barras de un juguete que está en la campaña → aparece (se halla por el buscador del catálogo)
- [ ] código de un producto que existe pero no está en la campaña → «Ese producto está en el catálogo, pero todavía no está en la campaña»; texto que no coincide con nada → «Ningún juguete de la campaña coincide…»
- [ ] «✕ Limpiar» regresa todos; entrar a otra campaña o cancelar limpia el filtro
- [ ] cambiar el precio o quitar un juguete con el filtro puesto conserva los demás; al guardar se guardan todos los juguetes (no solo los visibles)
- [ ] Enter dentro del buscador no guarda la campaña
- [ ] el buscador de catálogo falla o responde 404 → no sale error y sigue filtrando por nombre

---


### 2026-11-09 — Reportes → «Precios calculados» y el indicador de cálculo en Actualizar producto
**Dónde:** `PreciosCalculadosComponent` (pestaña nueva de Reportes, solo administrador), `CalculoPrecioService.listar/historial`, bloque «Cálculo de precio» de `AddComponent`
**Tipo:** unitario (componentes con el servicio simulado) · e2e manual en QA
**Debe comprobar:**
- [ ] la pestaña «💲 Precios calculados» solo la ve el administrador y lista el último cálculo de cada producto (calculó, se cobra, ganancia real, costo total, fecha y quién)
- [ ] filtros por nombre y por fechas (incluye los dos extremos); «Limpiar» regresa todo; fechas al revés muestran aviso y no buscan; páginas Anterior/Siguiente
- [ ] «Ver cálculos anteriores» abre el historial del producto (del más nuevo al más viejo) y «Ocultar» lo cierra
- [ ] producto cuyo precio de venta de hoy ya no es el del cálculo → aviso ⚠️ con el precio de hoy
- [ ] sin la migración o con error del back → mensaje claro y no se rompe la pantalla
- [ ] Actualizar producto: producto sin cálculo → «Todavía no se ha calculado el precio de este producto»; con cálculo → bloque con lo calculado, aviso si el precio del formulario ya no coincide, y «Ver cálculos anteriores»; al guardar un cálculo nuevo el bloque se actualiza
- [ ] en Nuevo producto no aparece ningún bloque de cálculo
- [ ] día y noche, escritorio y celular (400 px)

---


### 2026-11-09 — Campañas: el juguete llega con el precio que ya tiene en otra campaña
**Dónde:** `CampanasComponent.agregarProducto` / `precioPrevio` (Catálogo → Campañas)
**Tipo:** unitario (componente con campañas simuladas) · e2e manual en QA
**Debe comprobar:**
- [ ] juguete A con $100 en la campaña «Reyes 2026» → agregarlo a otra campaña llega en $100 y la fila dice «precio de «Reyes 2026»»
- [ ] juguete B que nunca estuvo en una campaña → llega con su precio de venta y sin etiqueta
- [ ] si el juguete está en varias campañas, toma la de fecha de fin más reciente (y, a igual fecha, la de id mayor)
- [ ] al editar una campaña, no toma su propio precio guardado como «previo»
- [ ] «Agregar los N de esta página» mezcla bien los dos casos; el precio se puede cambiar y se guarda el que se ve
- [ ] el cuerpo que se manda al guardar solo trae `productoId` y `precio` (sin `origen`)

---


### 2026-11-09 — Calculadora de precio: comisión de la terminal, precio de campaña, costo total y guardado del cálculo
**Dónde:** `CalculadoraPrecioComponent`, `calculo-precio.ts`, `CalculoPrecioService`, `AddComponent` (`usarPrecioCalculado`, `guardarCalculoPrecio`, bloque «Último cálculo de precio»)
**Tipo:** unitario (funciones puras y componente) · e2e manual en QA
**Debe comprobar:**
- [ ] costo $115, margen 30 %, comisión 3.6 % → exacto $173.19; sin comisión → $164.29 / $165
- [ ] el selector «Comisión de tarjeta» lista las comisiones de la terminal ya dadas de alta (tarifa + IVA); si no se pueden leer, solo «Sin comisión»
- [ ] con un producto que está en la campaña vigente aparece su precio de campaña y cuánto se gana (o pérdida); en Nuevo producto y sin campaña no aparece
- [ ] casilla «Poner también el costo total real en Precio de compra»: solo sale si hay transporte u otros gastos; marcada, «Usar este precio» pone el costo total en «Precio de compra»; desmarcada, no lo toca
- [ ] «Usar este precio» + Guardar producto → se guarda el cálculo con el precio de venta que quedó (aunque se haya editado a mano) y en Actualizar aparece «Último cálculo de precio» (calculó vs. se cobra)
- [ ] «Cerrar» no cambia ni el precio ni el costo, y no guarda ningún cálculo
- [ ] si falla el guardado del cálculo (por ejemplo, sin la migración) el producto sí queda guardado y sale el aviso
- [ ] el bloque «Gasto total del viaje / Piezas que trajiste» solo hace la división y no se guarda
(Comprobado a mano con una página temporal que se borró: el evento `usar` entrega precio, costo total y el cálculo; el modal se ve bien a 1360 y 400 px.)

---


### 2026-10-28 — Cobro con tarjeta: terminal (admin) y pago en línea (cliente) con el módulo nuevo
**Dónde:** `pedidos/pago-tarjeta.service.ts` y `pedidos/models/pago-tarjeta.model.ts` (nuevos); `pedidos/mis-pedidos` (`enviarATerminalNuevo`, `aplicarEstadoTarjeta`, `startPollingTarjeta`, `cancelarTerminal`, `opcionesMesesVisibles`, `motivoSinMeses`, `puedePagarEnLinea`); `pedidos/cobro/cobro-tarjeta` (componente nuevo)
**Tipo:** unitario (componente y servicio con HttpTestingController) · e2e (Playwright contra QA, pasarela simulada)
**Debe comprobar:**
- [ ] **Terminal, admin, pedido de contado:** Cobrar → Tarjeta → «Enviar a terminal» manda `POST /v1/pagos-tarjeta` con `{pedidoId, canal:'TERMINAL', cuotas}` (nunca monto) y pregunta `GET /{id}` cada 3 s; al `APROBADO` **no** llama a `updateService` (el back ya dejó el pedido Pagado y Entregado) y solo refresca la lista
- [ ] Por los centavos del total en QA: `.00` aprueba a los ~4 s · `.01` rechaza («La tarjeta fue rechazada…») · `.02` nunca contesta (queda «Esperando respuesta…») · `.03` cancela
- [ ] **Meses:** el «Plan de pago» solo ofrece los plazos de `GET /pedido/{id}/meses`; sin meses se lee «Solo de contado: <motivo>» (artículo que no acepta, mínimo $300…)
- [ ] **Grupo** de pedidos y ambientes donde el módulo está apagado (404 en `/meses`) siguen por el camino viejo `/v1/mp` sin cambios
- [ ] 5xx al iniciar → estado «bloqueado» (no se puede reintentar a ciegas); 5 errores seguidos al preguntar → «bloqueado» con aviso; un error al preguntar **no** cuenta como rechazo
- [ ] Cerrar el diálogo con el cobro «procesando» lo cancela; `Cancelar` si el back dice que «ya se aprobó» pregunta el estado y muestra el pago aprobado
- [ ] `COBRADO_SIN_APLICAR` → mensaje «Hay que devolver el dinero al cliente (cobro #N)»
- [ ] **Cliente, pedido de contado «Pendiente»:** card con «Pagar con tarjeta» (no aparece en Apartado, Ir pagando, grupos, cancelados ni para el admin); elegir contado o meses; `.00` aprueba y la lista queda «Pagado, falta entregar»; rechazo permite «Intentar de nuevo»; cerrar con el cobro en proceso lo cancela
- [ ] Un cliente que abre el pago de un pedido ajeno recibe «no está disponible» (404 del back)
- [ ] **Venta directa** (`variante/venta-directa`) **no cambia**: sigue por `/v1/mp`
- [ ] Con un cobro del camino viejo (`/v1/mp`) todavía en la terminal, iniciar el nuevo responde 400 «…por el camino anterior»; y al revés

### 2026-10-28 — Casilla «Acepta meses sin intereses» (producto, artículo y chip en la Tienda)
**Dónde:** `shared/acepta-msi.service.ts` (nuevo), `productos/producto/add` (control `aceptaMsi`, `cargarAceptaMsi`, `guardarAceptaMsi`), `shared/alta-articulos` (campo por artículo, `msiDisponible`), `variante/update-variante` (select tri-estado), `variante/buscar` (setter de `variantes`, `msiEfectivo`, chip «MSI»)
**Tipo:** unitario (componentes y servicio con HttpTestingController) · e2e (Playwright contra QA)
**Debe comprobar:**
- [ ] Admin abre **Actualizar producto** → la casilla refleja `GET /v1/acepta-msi/producto/{id}`; la cambia y guarda → se manda `PUT` solo si cambió; en **producto nuevo** solo se manda si la marcó
- [ ] Si el `PUT` responde 409 (ambiente sin migración) → el producto SÍ se guardó y sale el aviso «El producto se guardó, pero…»
- [ ] Si el `GET` responde 404/409 → la casilla **no aparece** (en producto, en alta de artículos y en editar artículo) y nada se rompe
- [ ] Alta de artículos: «Igual al producto (sí acepta / no acepta)» por defecto = no se manda nada; «Sí acepta» / «No acepta» → se manda `PUT` al artículo **correcto** (los artículos vuelven en el mismo orden que se mandan); si falla alguno, el aviso dice cuántos
- [ ] Editar artículo: pasar de «Sí acepta» a «Igual al producto» manda `aceptaMsi: null`
- [ ] Tienda (admin): artículos que aceptan meses muestran el chip **MSI**; un usuario sin rol ADMIN no ve chips ni hace llamadas que fallen en pantalla
- [ ] Producto con casilla apagada y un artículo con «Sí acepta» → el artículo muestra MSI y los demás del producto no
- [ ] El guardado normal de producto/artículo (`/productos/save`, `/variantes/guardarConImagenes`, update) **no cambia** de contrato

---

### 2026-10-14 — Card de Tienda → Buscar: «Deshabilitado» en franja propia
**Dónde:** `variante/buscar/buscar.component.html` / `.scss` (`.vb-badge-disabled`, `.vb-card__header--con-check`, `.vb-card__header--con-baja`)
**Tipo:** unitario (componente) · e2e visual (Playwright)
**Debe comprobar:**
- [ ] Artículo deshabilitado visto por admin → hay una franja «⛔ Deshabilitado» debajo del encabezado; habilitado → no hay franja
- [ ] Con permiso `tienda/buscar:habilitar` y `tienda/buscar:eliminar`, las cajas de la casilla, el puntito de color, el precio, «Agotado», la ✕ y la franja **no se intersectan** (a 1100 y a 400 px, día y noche)
- [ ] Sin esos permisos el encabezado no deja el espacio extra a la izquierda ni a la derecha

### 2026-10-14 — Tarjeta del chat de la tienda: "Disponible" en vez de piezas, sin código de barras
**Dónde:** `chatbot/chatbot.component.html` (tarjeta `cb-card`)
**Tipo:** unitario (componente)
**Debe comprobar:**
- [ ] Producto con `stock: 3` → la tarjeta dice "✅ Disponible" y no aparece "3"
- [ ] `stock: 0` → "Agotado" y el botón 🛒 Agregar deshabilitado (como antes)
- [ ] Producto sin talla ni color y con `codigoBarras` → la tarjeta **no** pinta el código
- [ ] Agregar al carrito desde el chat sigue respetando el tope de `stock`

### 2026-10-14 — Calendario por año y mes, modo nacimiento y Mis datos (nombres, teléfono, código postal)
**Dónde:** `shared/selector-fecha` (`verMeses`, `verAnios`, `elegirAnio`, `elegirMes`, `anterior`/`siguiente`, `alEscribir`, `confirmarEscrito`, `@Input() modo`), `clietes/validaciones-cliente.ts` (`PATRON_NOMBRE`, `limpiarNombre`, `soloDigitos`, `soloTelefono`), `ClienteService.buscarCodigoPostal()`, `mis-datos` (`alEscribirTelefono`, `alEscribirCodigoPostal`, `buscarCodigoPostal`, `camposConError`, `guardarCliente`), `clientes-mostrar.getCodigoPostal()`
**Tipo:** unitario (componente y servicio con HttpTestingController) · e2e (Playwright contra QA)
**Debe comprobar:**
- [ ] Calendario normal: tocar el mes del título → 12 meses; tocar el año → lista de años con el de la vista centrado; año → meses → día escribe `aaaa-mm-dd` igual que antes; en la vista de meses ‹ › mueven un año; respeta `min`/`max` (meses y días fuera, deshabilitados)
- [ ] Modo `nacimiento` vacío → abre en años (centrado en hoy − 30); no hay botón **Hoy**; no deja días después de hoy ni antes de 1900
- [ ] Escribir `15031985` → «15/03/1985» y guarda `1985-03-15`; `31021990` → «Esa fecha no existe. Revisa el día y el mes.»; mañana → «La fecha de nacimiento no puede ser después de hoy.»
- [ ] `PATRON_NOMBRE`: acepta «María José», «De la Cruz», «O'Neil», «Ñuñez», «Müller»; rechaza «Ana1», «@na», «  » (vacío lo marca `required`)
- [ ] `soloTelefono`: «55 1234-56789» → `5512345678`; «+52 55 1234 5678» → `5512345678`; «521 55 1234 5678» → `5512345678`; «abc» → «»
- [ ] Mis datos: con el foco en un campo vacío, **un** clic en **Guardar cambios** abre el aviso (el botón no se mueve); el aviso lista los campos («Calle · Colonia»; uno solo → «Revisa este campo (está en rojo): Calle»); Referencias vacío no bloquea
- [ ] `buscarCodigoPostal`: 200 con municipio → `encontrado: true` y colonias; 200 con `error: true` o 404 → «No encontramos ese código postal…»; 502 o sin red → «No pudimos buscar el código postal en este momento…»; nunca lanza error
- [ ] Mis datos: al 5.º dígito del código postal pide una sola vez; llena Municipio; con una colonia la llena; con varias las pone en el `datalist`
- [ ] Ver cliente (admin): código postal no encontrado → ventana informativa, no error

### 2026-10-14 — Agregar stock al modelo desde el artículo, pregunta al actualizar y checks por artículo
**Dónde:** `update-variante` (`ofrecerStockAlModelo`, `actualizar`, `faltaEnElModelo`), `add.component` (Actualizar modelo → `stockDisponible`, `alCerrarAltaArticulos`), `alta-articulos` (`continuar`, `alMarcar`, `sinLlenar`, `igualAlModelo`, `guardar`)
**Tipo:** unitario (componente con HttpTestingController) · e2e (Playwright contra QA)
**Debe comprobar:**
- [ ] Editar artículo con modelo en 0 y "Actualizar stock" = 1 → 💾 no manda `guardarConImagenes`; abre la ventana con 1 escrito
- [ ] En la ventana, 0 o 1.5 → mensaje de validación y no llama al back; 10 → `PUT /v1/stock/producto/{id}/ajuste` `{ ajuste: 10 }`; el stock del artículo sigue igual y "Actualizar stock" conserva lo escrito
- [ ] Después del ajuste, 💾 manda `guardarConImagenes` con `stock = actual + 1`
- [ ] `guardarConImagenes` responde 422 → pide `GET /v1/stock/producto/{id}` y abre la ventana (no el error)
- [ ] Sin permiso (no admin, sin escritura en productos/buscar, productos/agregar ni tienda/venta) → aviso informativo, sin campo ni `PUT`
- [ ] Actualizar modelo con `articulosQueAunCaben` ≥ 1 → abre `app-alta-articulos` con título "✅ Modelo actualizado"; con 0 o si el `GET` falla → "¡Modelo actualizado!" y navega a `/productos/buscar`; "Ahora no" también navega
- [ ] Pregunta: 0, 1.5 o más que lo libre → Continuar apagado; 2 → dos formularios
- [ ] Ningún check marcado → el request lleva `color/marca/descripcion/contenidoNeto` vacíos, `palabraClaveId: null`, `listImagenes: []` y `usarImagenDelModelo` = el modelo tiene foto
- [ ] Marcar Descripción → el campo aparece con la del modelo; el request lleva el texto cambiado solo en ese artículo
- [ ] Marcar Foto sin subir, o Color vacío → Guardar apagado; con foto → `listImagenes` con 1 y `usarImagenDelModelo: false`
- [ ] 2 o 3 artículos → todos abiertos; 20 → solo el 1 abierto; pasar de 2 a 9 → el 1 y el 2 conservan lo llenado y su estado, del 3 al 9 plegados
- [ ] Plegado: el resumen dice "Talla S · Stock 1 · Cambia: Descripción" / "Igual al modelo" y "⚠️ Falta: stock" mientras no tenga stock
- [ ] "Cerrar todos" / "Abrir todos" / "Abrir solo esos" (abre solo los incompletos); el texto de abajo: "Al artículo 1…", "A los artículos 2, 5 y 7…", "…y 13 más", "A todos los artículos…"
- [ ] Plegar un artículo con categoría o foto elegida y volver a abrirlo → siguen ahí y se mandan al guardar
- [ ] e2e: `crearModelo()` (support/modelo.ts) pasa con la ventana y "Ahora no"

### 2026-10-13 — Carrito → Mis datos, grupo completo y Mis pedidos sin lo terminado
**Dónde:** `venta-variante` (`pedirCompletarRegistro`, `irAMisDatos`), `mis-datos` (`volver`, teléfono obligatorio), `detalle-productos`, `variante/buscar`, `mis-pedidos` (link y `vistaSinTerminados`), `configurar-ramo`, `favoritos`, `detalle-pedido` (`cambiarTipoDelGrupo`, `tieneDinero` del grupo), `grupo-pedido.service` (`cambiarFormaDeCobro`), `design-system.scss` (`.pk-aviso`)
**Tipo:** unitario (componente con HttpTestingController) · e2e (Playwright contra QA)
**Debe comprobar:**
- [ ] Carrito con cliente incompleto → navega a `/clientes/mis-datos?volver=/tienda/carrito`; el aviso "Completar datos" ya no va a `/mis-datos`
- [ ] `volver`: acepta `/tienda/carrito`; ignora `//sitio.com` y `https://…`; al guardar con `datosCompletos` regresa, sin `datosCompletos` se queda
- [ ] Mis datos sin teléfono → no guarda (campo en rojo)
- [ ] Detalle de un pedido unido → 🔁 manda `PUT /v1/grupos-pedido/{id}/tipo` (no `/v1/pedidos/{id}/tipo`); "De contado" deshabilitado; Apartado bloqueado si `pagadoGrupo > 0`
- [ ] Mis pedidos admin sin filtros ni texto → la petición lleva `estado=SIN_TERMINAR` y sale el aviso; con un filtro o texto no lo lleva

### 2026-10-08 — 404 de verdad (`/no-encontrada`), Home y página 404 nuevas
**Dónde:** `app-routing` (`no-encontrada`), `pagina-no-disponible` (redirección en la primera carga, `noindex`), `default.conf` (`location = /no-encontrada` con 404 y `Cache-Control … always`), `home`, `detalle-variante` (404 → "ya no está disponible" + `noindex`), `ruleta-publica`, `a.pk-btn` en `design-system.scss`
**Tipo:** e2e (Playwright) · prueba de nginx
**Debe comprobar:**
- [ ] Primera carga de una ruta inexistente → termina en `/no-encontrada` y el documento responde **404** (probado a mano con nginx local el 2026-10-08)
- [ ] Navegando dentro de la app a una ruta inexistente → misma pantalla, sin recargar
- [ ] Home y 404 de día y de noche, 1280 y 390 px: textos legibles y botón principal del color del tema (no azul)
- [ ] Ficha de artículo inexistente → "Este producto ya no está disponible." y `<meta name="robots" content="noindex">`
### 2026-10-08 — Pantallas que usan los endpoints de artículos dicen "artículo" (rama `rename/variante-a-articulo`)
**Dónde:** `update-variante`, `venta-directa`, `detalle-pedido`, `abonos`, `gestion-promociones`, `publicar-facebook`, `agregar-rifa`, `rifa-mes`, `buscar-rifa`, `boletos-rifa`, `reportes`, `dashboard`, `config-negocio`, `buscar` (avisos de admin), `detalle-variante` (independizar), `navbar`, `ayuda-pantallas.catalog.ts`
**Tipo:** e2e (textos visibles)
**Debe comprobar:**
- [ ] Editar artículo: título "Editar artículo #N", botón "💾 Actualizar artículo".
- [ ] Menú Rifas: "🎡 Rifa de artículos"; Reportes: "Top N artículos más vendidos"; Dashboard: "Artículos con 1–4 piezas".
- [ ] Tienda → Buscar (admin): dar de baja un artículo sin nombre pregunta "¿Dar de baja este artículo?"; 💲 tiene el botón "Usar el del modelo".
- [ ] Tienda → Buscar sin sesión, ficha, Favoritos y carrito siguen diciendo "producto".

### 2026-10-07 — Datos legales: de dónde sale cada campo
**Dónde:** `admin/config-negocio` (recuadro `.cn-legal-origen` y un `.cn-hint` por campo)
**Tipo:** e2e (captura día/noche, 1360 y 400 px)
**Debe comprobar:**
- [ ] Los 6 campos tienen su "De dónde" y "Se ve en"; a 400 px los textos bajan de línea sin scroll lateral

### 2026-10-07 — 🕓 Pendiente en filtros y card, 🔁 desde Pendiente, íconos ⓘ
**Dónde:** `filtros-pedidos.model.ts` (`PENDIENTE`, campo `ayuda`), `mis-pedidos` (`esPedidoEnLinea`, badge, ⓘ por bloque, `opcionesUnidosConAyuda`), `detalle-pedido` (`esPedidoEnLinea` en el form 🔁), `shared/ayuda-opciones` (nuevo), `entregas-zona` (ⓘ del título)
**Tipo:** unitario (componente) · e2e
**Debe comprobar:**
- [ ] `esPedidoEnLinea`: NORMAL/null + 'Pendiente' (cualquier mayúscula) → true; APARTADO + 'Pendiente' → false; NORMAL + 'Entregado' → false
- [ ] Filtro guardado con `PENDIENTE` se vuelve a pintar marcado al cargar
- [ ] `app-ayuda-opciones`: sin `ayuda-contextual` y sin admin → no se pinta; opciones sin `ayuda` no salen; si ninguna tiene, no hay ícono
- [ ] Popover: abre/cierra con clic, Esc y clic afuera; el clic no alterna el filtro de abajo; a 400 px cabe sin scroll lateral
- [ ] Form 🔁 de un Pendiente: "Ahora está como 🕓 Pendiente…"; el botón Normal deshabilitado dice "Para cobrarlo completo usa Cobrar en la card"

### 2026-10-07 — Agregar producto: la categoría del modelo se precarga en el artículo
**Dónde:** `variante/agregar` (`precargarDelModelo` / `quitarPrecargados` con `categoriaPrecargada`), `palabra-clave-autocomplete` (`valorInicial = null` ahora limpia el texto), `IProductoDTO.palabraClave`
**Tipo:** unitario (componente) · e2e
**Debe comprobar:**
- [ ] Modelo con `palabraClave` → `palabraClaveSeleccionada` = esa; el autocomplete muestra su nombre
- [ ] Modelo sin `palabraClave` → queda `null`
- [ ] Ya había una categoría elegida a mano → no se pisa
- [ ] ✕ del modelo (o elegir otro): se quita la precargada solo si nadie la cambió
- [ ] Autocomplete: `valorInicial` pasa de X a `null` → texto vacío; en Agregar modelo, actualizar artículo, detalle de artículo y Carga de imágenes nada cambia al elegir / limpiar
- [ ] Al guardar, `palabraClaveId` del payload = el id precargado

### 2026-10-07 — Agregar artículo con código de barras; interruptor y recuadro en Lugares / Entregas por zona
**Dónde:** `variante/agregar` (resultados y chip con `codigoBarras`), `design-system.scss` (`.pk-switch`), `lugares-entrega/gestion` (interruptor "Recoger en tienda", `.pk-wrap` con `--filtros-panel-bg`), `entregas-zona` (`.ez-wrap` igual)
**Tipo:** unitario (plantilla) · e2e (captura día/noche, 1360 y 400 px)
**Debe comprobar:**
- [ ] Resultado con `codigoBarras` → "NOMBRE · CODIGO"; sin código → solo el nombre
- [ ] `.pk-switch`: clic y tecla espacio cambian `esRecogerEnTienda`; foco visible con Tab
- [ ] Recuadro de Lugares y Entregas por zona con fondo `--filtros-panel-bg`; a 400 px sin scroll horizontal
- [ ] Botón Volver de Entregas por zona alineado con el borde izquierdo del recuadro
- [ ] Zonas de entrega: recuadro `.pk-explica` (`<details open>`) visible al entrar; `summary` lo cierra/abre; día y noche
- [ ] Interruptor "Recoger en tienda" prendido → sin Envío/Horas/Día/anillos, nota visible; el body manda esos tres en `null`
- [ ] Segunda fila de recoger en tienda → Swal con el `mensaje` del back (400)
- [ ] Zonas de entrega sin select de día; el body manda `diaEntregaSemanal: null` (al editar se borra el viejo)
- [ ] Entregas por zona: la fecha del viaje no se prellena con `fechaSugerida`
- [ ] `.pk-wrap` y `.ez-wrap` con `--card-bg` (mismo fondo que Agregar Modelo); la tabla de zonas sigue con su borde

### 2026-10-07 — HOTFIX prod: 🧩 Productos del modelo con el stock disponible real
**Dónde:** `productos/producto/all/all.component.ts` (`inicializarVariantes`), `variante.model.ts` (`IVarianteDto.habilitado`)
**Tipo:** unitario (componente con `VarianteService` y `Swal` simulados)
**Debe comprobar:**
- [ ] Modelo 3, artículos `[{stock:1,habilitado:'1'},{stock:2,habilitado:'1'}]` → no abre el formulario; Swal "No queda stock para artículos nuevos" con 3 y 3
- [ ] Artículos deshabilitados (`'0'`) o con stock 0 no cuentan
- [ ] Modelo 5, artículos con 3 → muestra "Puedes crear: 2"; cantidad 3 → "Puedes crear hasta 2"
- [ ] Fotos elegidas sin "Misma imagen para todas" → no envía y avisa
- [ ] Si `getPorProducto` falla → abre con disponible = stock del modelo (valida el back)

### 2026-10-07 — Recuadro de búsqueda y filtros con fondo, configurable desde Personalización
**Dónde:** `styles.scss` (regla `[class*="-header__content"]` sin `vb-`/`pl-`; tokens `--filtros-panel-bg` y `--filtro-bg` en día y noche), `variante/buscar/buscar.component.scss` y `.html` (`vb-header__content`, pills, subtítulo sin `text-white-50`), `productos/producto/all/all.component.scss` y `.html` (lo mismo con `pl-`), `tema-admin/models/presets-diseno.ts` (los 5 diseños traen las 2 claves)
**Tipo:** e2e (captura de día y de noche, 1360 y 400 px) · unitario (presets)
**Debe comprobar:**
- [ ] Tienda y Catálogo → Modelos, de día: `getComputedStyle(.vb-header__content).backgroundColor` = `rgba(255, 255, 255, 0.7)`; de noche `rgb(28, 30, 44)` (con los valores de fábrica)
- [ ] Créditos / Abonos, Clientes, Reportes, Gastos: su `*-header__content` sigue `transparent` (no cambió)
- [ ] El subtítulo de Tienda ("Todos nuestros productos") y de Modelos ("Catálogo de productos") tiene color `--app-text-muted`, no blanco
- [ ] Casillas, fechas, `$ mín` / `$ máx` y "✕ Limpiar filtros" con `--filtro-bg`; Talla / Color / Marca con `--input-bg` (regla global de selects)
- [ ] Cambiar `filtros-panel-bg` en Personalización (inline en `body`) cambia el recuadro sin recargar
- [ ] Cada uno de los 5 `PRESETS_DISENO` tiene `filtros-panel-bg` y `filtro-bg` en `claro` y `oscuro`; los 3 de paleta: de día = `sb-body-bg`, de noche = `form-section-bg` de su paleta
- [ ] A 400 px el recuadro no provoca scroll horizontal (`scrollWidth` = ancho de la ventana)

### 2026-10-07 — Encabezados de seguridad en el nginx de la tienda
**Dónde:** `default.conf` (las dos `location`: archivos y `/`)
**Tipo:** e2e contra QA (o `curl -sI`)
**Debe comprobar:**
- [ ] `/`, una ruta de Angular (`/tienda/buscar`) y un `.js` responden 200 y traen `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy: frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), geolocation=(self), microphone=()`, `Strict-Transport-Security: max-age=31536000`
- [ ] `Server: nginx` sin versión
- [ ] Los `.js` siguen con `Cache-Control: public, max-age=31536000, immutable` y `/` con `no-cache`
- [ ] Escanear código de barras (cámara) y "📡 Usar mi ubicación" siguen pidiendo permiso y funcionan
- [ ] Una página de otro dominio con `<iframe src="https://qa.shop…">` no la muestra

### 2026-10-07 — Datos legales: pie de página, Términos, Aviso de privacidad y Configuración
**Dónde:** `legal/datos-legales.service.ts`, `AppComponent` (pie), `TerminosComponent`, `PrivacidadComponent`, `ConfigNegocioComponent` (`guardarDatosLegales`), `loading.interceptor.ts`
**Tipo:** unitario (servicio y componentes con HttpTestingController) · e2e
**Debe comprobar:**
- [ ] Una sola petición a `/v1/datos-legales` por carga de la app (shareReplay) y sin spinner global
- [ ] El back falla → pie y páginas legales muestran `contacto@novedades-jade.com.mx`, sin error en pantalla
- [ ] Pie: con nombre, domicilio, teléfono y correo los muestra; sin domicilio no pinta esa parte; teléfono `5512345678` → "Tel. 55 1234 5678" y `href="tel:+525512345678"`
- [ ] Configuración → Datos legales: carga lo guardado; "⚠️ Falta: …" con lo que falte; RFC inválido → mensaje y no envía; 400 del back → Swal con el `mensaje`
- [ ] Términos: muestran 90 días, 5 días hábiles, Apartado, Ir pagando sin intereses (CAT 0%), PROFECO
- [ ] Aviso de privacidad: responsable, finalidades separadas, OVHcloud/Google/OpenAI/Mercado Pago, plazos ARCO 5 + 15 días hábiles

### 2026-10-07 — Registro: aviso corto y casilla de Términos
**Dónde:** `AddUsuariosComponent` (`aceptoTerminos`, `darAltaUser`)
**Tipo:** unitario (componente)
**Debe comprobar:**
- [ ] Sin marcar Términos → botón Registrarse deshabilitado y mensaje al tocar la casilla
- [ ] Con las dos casillas → manda `aceptoPrivacidad: true` y `aceptoTerminos: true`
- [ ] "Actualizar usuario" (admin) no pide ninguna de las dos

### 2026-10-07 — Ir pagando / Apartado: precio de contado y sin intereses, y ticket
**Dónde:** `VentaDirectaComponent` (`.vd-nota-legal`), `VentaVarianteComponent` (`.venta-nota-legal`), `shared/ticket.util.ts` (`fijarDatosNegocioTicket`, `encabezadoNegocio`, `filaSinIntereses`)
**Tipo:** unitario
**Debe comprobar:**
- [ ] Ir pagando con total $350 → "Precio de contado $350.00 · Total a pagar $350.00 (CAT 0%)"
- [ ] Apartado → "Se paga completo ($350.00) al recogerlo"; Contado → ninguna nota
- [ ] `generarHtmlTicket` con datos del negocio → los imprime arriba, escapando `<` y `&`; sin datos → ticket igual que antes
- [ ] Ticket de abono y de liquidado → "Abonos sin intereses (CAT 0%)"; de venta de contado → no
- [ ] Todos los tickets → "Garantía de 90 días desde que lo recibes"

### 2026-10-07 — SEO: título por artículo, datos de producto, noindex y sitemap
**Dónde:** `shared/seo/seo.service.ts`, `DetalleVarianteComponent.seleccionar()`, `PaginaNoDisponibleComponent`, `src/sitemap.xml`, `src/robots.txt`, `index.html`
**Tipo:** unitario · e2e
**Debe comprobar:**
- [ ] Detalle de un artículo → `document.title` = "<nombre talla color> — Novedades Jade" y un `<script type="application/ld+json">` con `@type: Product`, precio en MXN y `InStock`/`OutOfStock`
- [ ] Cambiar de artículo en el detalle → hay un solo script JSON-LD (no se acumulan)
- [ ] Salir del detalle → título y descripción vuelven a los de index.html y se quita el JSON-LD
- [ ] Ruta inexistente → `<meta name="robots" content="noindex">`; al salir vuelve a `index, follow`
- [ ] Fotos de la tienda y de Favoritos con `alt` = nombre del artículo (no "Imagen variante")

### 2026-10-07 — Card de pedido: Pagado / Falta pagar y Entregado / Falta entregar, 📦 Entregar y ↺
**Dónde:** `pedidos/entrega/entrega.ts` (`etiquetaPago`, `etiquetaEntrega`, `preguntarSiSeLoLlevo`, `preguntarYEntregar`), `MisPedidosComponent` (`pagoDeCard`, `entregadoDeCard`, `puedeEntregar`, `entregar`, `regresarEntrega`), `PedidosService.entregar/regresarEntrega`
**Tipo:** unitario (funciones y componente con HttpTestingController) · e2e
**Debe comprobar:**
- [ ] Contado cobrado + entregado → "✅ Pagado" verde y "🤝 Entregado" verde; Apartado abierto → "Falta pagar" rojo y "Falta entregar" rojo
- [ ] Cancelado → solo "Cancelado", sin etiqueta de entrega ni botón 📦
- [ ] Grupo: usa `grupo.entregadoGrupo`, no el `entregado` del titular
- [ ] 📦 Entregar sale solo con la acción `entregar`, si falta entregar y (pagado o Ir pagando); ↺ solo con `regresar-entrega` y entregado
- [ ] 📦 → `POST /v1/pedidos/{id}/entrega`; 400 → Swal con el `mensaje` del back; 200 → la card se recarga en Entregado
- [ ] ↺ pide confirmación y manda `DELETE`; "Cancelar" en la confirmación no llama al back
- [ ] `preguntarSiSeLoLlevo`: "Sí" → true; "Todavía no" o cerrar con Esc → false (queda Falta entregar con 📦 en la card); clic fuera no la cierra

### 2026-10-07 — "¿Ya se lo llevó?" al terminar de pagar o al vender
**Dónde:** `DetallePedidoComponent` (liquidar abono), `GrupoPedidoComponent` (grupo pagado), `AbonosComponent` (Créditos / Abonos), `MisPedidosComponent` (`alCobrarCredito`, `confirmarCobro`, `confirmarCobroGrupo`), `VentaDirectaComponent` (manda `entregado`), `VentaVarianteComponent` (Ir pagando)
**Tipo:** unitario (componente) · e2e
**Debe comprobar:**
- [ ] Abono que liquida un Apartado → pregunta; "Sí" → `POST …/entrega`; "Todavía no" → no llama
- [ ] Abono que **no** liquida → no pregunta
- [ ] Liquidar un pedido que ya está entregado (`detalle.entregado === true`) → no pregunta
- [ ] Cobro de contado desde la card → pregunta y la card se **recarga** (ya no desaparece de la lista)
- [ ] Grupo pagado completo → pregunta una vez y entrega a todos
- [ ] Venta directa contado: pregunta **antes** de guardar y manda `entregado: true|false`; Apartado no pregunta
- [ ] Venta Ir pagando (venta por artículo) → pregunta después de crear el pedido

### 2026-10-07 — ⚙️ Filtros de Mis pedidos: bloque Pago y bloque Entrega
**Dónde:** `filtros-pedidos.model.ts` (`OPCIONES_ESTADO_PAGO`, `OPCIONES_ESTADO_ENTREGA`, `ESTADOS_ANTERIORES`), `MisPedidosComponent` (panel de filtros, carga de filtros guardados)
**Tipo:** unitario
**Debe comprobar:**
- [ ] Marcar "Pagado" + "Falta entregar" → `estado=PAGADO&estado=FALTA_ENTREGAR`
- [ ] Filtro guardado viejo con `PENDIENTE` o `POR_COBRAR` → se carga como "Falta pagar" (una sola vez, sin duplicar)
- [ ] Cada opción se esconde sin su acción (`filtro-por-cobrar`, `filtro-pagados`, `filtro-cancelados`, `filtro-pendientes`, `filtro-entregados`)

### 2026-10-07 — Agregar artículo: stock total del modelo bloqueado + agregar / quitar stock
**Dónde:** `AgregarComponent` de artículo (`ajusteStockModelo`, `stockModeloQuedaria`, `disponibleConAjuste`, `ajusteInvalido`, `puedeAjustarStockModelo`)
**Tipo:** unitario (componente)
**Debe comprobar:**
- [ ] Modelo 10, repartido 10, ajuste +3 → "Repartido: 10 · Libre: 3 · El modelo quedaría en 13"; artículo con 3 se deja guardar
- [ ] Ajuste −3 con modelo 10 y repartido 8 → "No se puede dejar el modelo en 7: ya tiene 8 repartidos." y Guardar no envía
- [ ] Sin permiso de editar modelos → el campo de ajuste no sale (solo se ve el stock bloqueado)
- [ ] El ajuste viaja **solo** en el primer detalle (`ajusteStockModelo`) y después de guardar se recarga el stock del modelo
- [ ] El campo "Stock total del modelo" no se puede editar

### 2026-10-07 — Homologación de pantallas: ancho, encabezados, selects, tablas y "Volver"
**Dónde:** `styles.scss` (regla de encabezados por token, `--form-ancho`, `--lista-ancho`, `select` global), `design-system.scss` (`.pk-tabla`), Clientes, Palabras clave (tablas), Gastos, Cambiar contraseña, `app-boton-volver` en todas las pantallas
**Tipo:** e2e (captura de día y de noche)
**Debe comprobar:**
- [ ] Formularios (Agregar modelo, Nuevo producto, Carga rápida, Lugares, Entregas por zona, Cinta, Hashtags, Configuración, Diagnóstico, Reconciliación, Caché, Agregar mi compra, Mi perfil, Mis datos, Cambiar contraseña, Publicar en redes) miden 820px y quedan centrados
- [ ] Encabezado de cada card con el color de **Personalización** (`--card-header-bg`), sin "un div dentro de otro div"
- [ ] Las etiquetas y botones dentro del encabezado conservan su color
- [ ] Clientes y Palabras clave: tabla diseño A de día y colores Jade oscuros de noche
- [ ] Todos los selects iguales (alto, borde, flecha) de día y de noche
- [ ] Todos los botones de regresar dicen "Volver"; Cambiar contraseña no lo tiene y el formulario queda arriba
- [ ] Gastos sin permiso de agregar → no dice "agrega uno"

### 2026-10-06 — HOTFIX prod: Mis datos se quedaba con el spinner encima
**Dónde:** `MisDatosComponent.cargarCliente()` / `aFechaIso()` y `SelectorFechaComponent.writeValue()`
**Tipo:** unitario (componente)
**Contexto:** Mis datos le pasaba un `Date` al campo de fecha, que solo entiende texto `yyyy-MM-dd`; el campo tronaba (`iso.split is not a function`) en cada ciclo y el spinner global nunca se quitaba.
**Debe comprobar:**
- [ ] El back manda `fechaNacimiento: "1990-05-12"` → el campo muestra "12 de mayo de 1990" y el spinner se quita
- [ ] `fechaNacimiento: null` → campo vacío, sin error
- [ ] `writeValue(new Date(1990, 4, 12))` → `valor = "1990-05-12"`; `writeValue(new Date("x"))` → `valor = ""`
- [ ] Guardar sin tocar la fecha → manda la misma fecha (no un día antes)


### 2026-10-06 — Cada bloque de ⚙️ Filtros de Mis pedidos pide su acción de Gestión de roles
**Dónde:** `MisPedidosComponent.puedeFiltro()`, `algunaVisible()`, `puedeVerOpcion()`, `aplicarFiltrosGuardados()` · `models/filtros-pedidos.model.ts` (campo `accion` de cada opción) · plantilla del panel
**Tipo:** unitario del componente (`AuthService.tieneAccion` simulado) + e2e con un rol recortado
**Debe comprobar:**
- [ ] Con todas las acciones: salen los 8 bloques y todas sus opciones (igual que antes).
- [ ] Sin `filtro-dinero`: no sale el bloque Dinero; los demás sí.
- [ ] Sin `filtro-pendientes`: en Estado no sale ⏳ Pendiente, las otras 4 sí.
- [ ] Sin ninguna de las 5 de Estado: no sale el bloque ni su título.
- [ ] Sin `filtro-registrado` pero con `filtro-total`: sale solo el rango de montos.
- [ ] Filtros guardados con `dinero: ['CON_SALDO']`, `lugarEntregaId: 3`, `soloRamos: true`, `totalDesde: 100` y sin esas acciones → se cargan vacíos (null / false / []); con las acciones → se cargan tal cual.
- [ ] `entrega: 'HOY'` guardado sin `filtro-fecha-entrega` → `null`.
- [ ] El orden (Ordenar) no depende de ninguna acción.
- [ ] Ayuda "?" de `pedidos/mis-pedidos` y `abonos`: textos nuevos (`ayuda-pantallas.catalog.ts`).

### 2026-10-06 — Cobro a crédito desde la card de Mis pedidos (rama `feature/cobro-desde-card`)
**Dónde:** `pedidos/cobro/` (`FormularioCobroBase`, `CobroPedidoBase`, `CobroGrupoBase`, `LiquidarApartadoComponent`, `DarAbonoComponent`, `LiquidarGrupoComponent`, `AbonarGrupoComponent`, `CampoPagoComponent`) · `MisPedidosComponent.formaCobroCredito()`, `textoBotonCobro()`, `puedeCobrarCard()`, `cobrarAdmin()`
**Tipo:** unitario de cada formulario (servicios simulados) + componente de la lista + e2e
**Debe comprobar:**
- [ ] Botón de la card: Apartado suelto → "Liquidar"; Ir pagando suelto → "Dar abono"; Apartados unidos → "Liquidar"; Ir pagando unidos → "Abonar al grupo"; contado (suelto o unido) → "Cobrar" y abre el diálogo de siempre.
- [ ] Un miembro de grupo abierto por su número cobra contra el grupo (no como pedido suelto).
- [ ] Contado pide la acción `cobrar`; crédito pide `abonar`. Sin la acción, no sale el botón.
- [ ] Liquidar Apartado: monto = saldo del detalle y no se puede escribir; manda `POST /v1/abonos/{id}` con ese monto.
- [ ] Dar abono: monto 0 al abrir; 600 con saldo 500 → aviso "Es más de lo que se debe" y botón apagado; "Liquidar todo" pone 500.
- [ ] Efectivo con monto recibido 200 y monto 100 → cambio $100 y `montoDado: 200` en el request; recibido 50 → aviso y no deja guardar. Transferencia → no manda `montoDado`.
- [ ] Ramo urgente: si `revalidar-antes-de-pagar` dice `cargoRecienAplicado`, no cobra, avisa el total nuevo y recarga el saldo. Si esa llamada falla, cobra igual.
- [ ] Con correo del cliente y la casilla marcada → manda `notificacion.ticketHtml`. Sin correo → al terminar pregunta a qué correo.
- [ ] Liquidar grupo: monto = `saldoGrupo` fresco (leído de `/por-pedido`), fijo; manda `POST /v1/grupos-pedido/{grupoId}/abonos`.
- [ ] Abonar al grupo: monto libre hasta `saldoGrupo`; el resumen dice "Pagado del grupo" y "Falta".
- [ ] Grupo ya deshecho al abrir → "Este pedido ya no está unido" y se cierra.
- [ ] Al cobrar, la lista se vuelve a pedir en la misma página (`buscarPedidoAdmin(false)`).
- [ ] "¿Dejó solo una parte?" en Liquidar abre el detalle del pedido.
- [ ] A 360 px el formulario cabe sin mover la página de lado y queda encima del chat flotante (z-index 12000) y debajo de los avisos.

### 2026-10-06 — Detalle del pedido en celular
**Dónde:** `detalle-pedido.component.scss` (`@media (max-width: 575px)`), `DetallePedidoComponent.abrirBuscadorArticulo()`, `grupo-pedido.component.scss` (`.gp__tabla--miembros`)
**Tipo:** e2e (Playwright con viewport 320 y 360) + unitario para el scroll
**Debe comprobar:**
- [ ] A 320 y 360 px, `document.documentElement.scrollWidth` = ancho de la ventana en el detalle, con el formulario de abono, el de forma de cobro y el buscador abiertos.
- [ ] Tabla del grupo a 360 px: se ven número, cliente, estado y total de cada pedido sin deslizar de lado (sin encabezado de tabla).
- [ ] Resultado del buscador a 360 px: el nombre completo se ve (no "B."); precio, "Otro precio" y "Elegir" quedan abajo de los datos sin encimarse.
- [ ] Al tocar "➕ Agregar artículo" o "⇄", el campo del buscador queda en pantalla y con el cursor puesto.
- [ ] A 1280 px el detalle y la tabla del grupo se ven igual que antes (tabla con encabezado).

### 2026-10-06 — Card de un pedido unido muestra el estado del grupo
**Dónde:** `MisPedidosComponent.estadoBadge()` y `esperaEntrega()` (vía `textoEntrega()` / `diasAtraso()`)
**Tipo:** unitario del componente
**Debe comprobar:**
- [ ] Titular de grupo de Ir pagando con `saldoGrupo` 100 y estado propio `PAGADO` → "Por cobrar".
- [ ] Mismo grupo con `saldoGrupo` 0 → "Pagado". Grupo de contado con saldo → "Pendiente"; sin saldo → "Entregado".
- [ ] `totalGrupo` 0 (todos cancelados) → "Cancelado".
- [ ] Card de un miembro abierto por número (`esTitular=false`) → usa su propio estado, como antes.
- [ ] `textoEntrega()` del titular pagado con `saldoGrupo` > 0 y fecha → devuelve el texto; con `saldoGrupo` 0 → `null`.
- [ ] Pedido sin grupo → mismo resultado que antes en los 5 estados.

### 2026-10-06 — Buscador de Mis pedidos: flechas/Tab no vuelven a buscar
**Dónde:** `MisPedidosComponent.prepararBusquedaAdmin()` / `ultimoTextoAdmin`
**Tipo:** unitario con `fakeAsync`
**Debe comprobar:**
- [ ] Escribir "maria", esperar 400 ms → 1 llamada a `buscarPedidosAdmin`.
- [ ] Estando en la página 2, un keyup sin cambiar el texto → 0 llamadas nuevas y `page` sigue en 1 (página 2).
- [ ] Cambiar a "marian" → 1 llamada nueva con página 0.
- [ ] `abrirOtroPedido(905)` y luego escribir el mismo texto que había antes → sí busca (el último texto ya era "905").

### 2026-10-06 — Datos del cliente escapados en los avisos
**Dónde:** `MisPedidosComponent.escaparHtml()` (modal Entrega, Reenviar ticket) · `escaparHtml()` en `detalle-pedido.component.ts`
**Tipo:** unitario
**Debe comprobar:**
- [ ] `Ana "La Güera" López` → `Ana &quot;La Güera&quot; López`, y en el modal el input muestra el texto completo.
- [ ] `<img src=x onerror=alert(1)>` → se ve como texto, no se crea ningún `<img>` dentro del aviso.
- [ ] `null` / `undefined` → `''`.

### 2026-10-06 — Botón "−" manda la línea exacta
**Dónde:** `PedidosService.eliminarDetalle(pedidoId, productoId, detalleId?, cantidad)` · `DetallePedidoComponent.reducirCantidad()`
**Tipo:** unitario del servicio (HttpTestingController) + componente
**Debe comprobar:**
- [ ] Con `detalleId` 11 → URL `.../detalle/{productoId}?cantidad=1&detalleId=11`.
- [ ] Sin `detalleId` → URL sin `detalleId` (como antes).
- [ ] `reducirCantidad(item)` manda `item.id` como `detalleId`.

### 2026-10-06 — ⇄ con varias piezas pregunta cuántas (R10)
**Dónde:** `DetallePedidoComponent.elegirArticulo()` / `guardarArticulo()` / `reintentarCambio()`
**Tipo:** unitario del componente (Swal simulado) + e2e
**Debe comprobar:**
- [ ] Línea con 1 pieza → no pregunta; manda `cantidad: 1`.
- [ ] Línea con 3 piezas → pregunta; el validador rechaza 0, 4 y 1.5; con 2 manda `cantidad: 2`.
- [ ] Línea de promoción con 2 piezas → no pregunta; manda `cantidad: 2`.
- [ ] Cancelar la pregunta → no hay llamada al back.
- [ ] Respuesta 409 (combo) → `reintentarCambio` manda la misma `cantidad` elegida y el `modo`.
- [ ] Mensaje de éxito "Se cambiaron 1 pieza(s); quedan 2 del artículo de antes." solo cuando quedan piezas.

---

### 2026-11-09 — Aviso de privacidad y Términos con la campaña de Reyes
**Dónde:** `privacidad.component.html`, `terminos.component.html` (rutas públicas `/privacidad` y `/termConditions`)
**Tipo:** revisión de texto · e2e manual
**Debe comprobar:**
- [ ] `/privacidad` muestra la sección «Campaña de temporada (Día de Reyes 2026–2027)», los dos puntos nuevos en «Qué datos recabamos» y «Para lo que tú decides», y el párrafo en «Cuánto tiempo los conservamos»; fecha al pie «9 de noviembre de 2026»
- [ ] `/termConditions` muestra la sección de la campaña y su liga «Aviso de privacidad» abre `/privacidad`
- [ ] los dos textos se leen bien de día y de noche y en celular, y siguen abriendo sin iniciar sesión
- [ ] el contenido coincide con lo que hace el sistema (lo pagado, canceladas y devueltas se descuentan, apartados, «Ir pagando» sin precio especial)

---

### 2026-11-09 — Reportes → «Precios calculados» y el indicador de cálculo en Actualizar producto
**Dónde:** `PreciosCalculadosComponent` (pestaña nueva de Reportes, solo administrador), `CalculoPrecioService.listar/historial`, bloque «Cálculo de precio» de `AddComponent`
**Tipo:** unitario (componentes con el servicio simulado) · e2e manual en QA
**Debe comprobar:**
- [ ] la pestaña «💲 Precios calculados» solo la ve el administrador y lista el último cálculo de cada producto (calculó, se cobra, ganancia real, costo total, fecha y quién)
- [ ] filtros por nombre y por fechas (incluye los dos extremos); «Limpiar» regresa todo; fechas al revés muestran aviso y no buscan; páginas Anterior/Siguiente
- [ ] «Ver cálculos anteriores» abre el historial del producto (del más nuevo al más viejo) y «Ocultar» lo cierra
- [ ] producto cuyo precio de venta de hoy ya no es el del cálculo → aviso ⚠️ con el precio de hoy
- [ ] sin la migración o con error del back → mensaje claro y no se rompe la pantalla
- [ ] Actualizar producto: producto sin cálculo → «Todavía no se ha calculado el precio de este producto»; con cálculo → bloque con lo calculado, aviso si el precio del formulario ya no coincide, y «Ver cálculos anteriores»; al guardar un cálculo nuevo el bloque se actualiza
- [ ] en Nuevo producto no aparece ningún bloque de cálculo
- [ ] día y noche, escritorio y celular (400 px)

---

### 2026-11-09 — Calculadora de precio: comisión de la terminal, costo total y guardado del cálculo
**Dónde:** `CalculadoraPrecioComponent`, `calculo-precio.ts`, `CalculoPrecioService`, `AddComponent` (`usarPrecioCalculado`, `guardarCalculoPrecio`, bloque «Último cálculo de precio»)
**Tipo:** unitario (funciones puras y componente) · e2e manual en QA
**Debe comprobar:**
- [ ] costo $115, margen 30 %, comisión 3.6 % → exacto $173.19; sin comisión → $164.29 / $165
- [ ] el selector «Comisión de tarjeta» lista las comisiones de la terminal ya dadas de alta (tarifa + IVA); si no se pueden leer, solo «Sin comisión»
- [ ] casilla «Poner también el costo total real en Precio de compra»: solo sale si hay transporte u otros gastos; marcada, «Usar este precio» pone el costo total en «Precio de compra»; desmarcada, no lo toca
- [ ] «Usar este precio» + Guardar producto → se guarda el cálculo con el precio de venta que quedó (aunque se haya editado a mano) y en Actualizar aparece «Último cálculo de precio» (calculó vs. se cobra)
- [ ] «Cerrar» no cambia ni el precio ni el costo, y no guarda ningún cálculo
- [ ] si falla el guardado del cálculo (por ejemplo, sin la migración) el producto sí queda guardado y sale el aviso
- [ ] el bloque «Gasto total del viaje / Piezas que trajiste» solo hace la división y no se guarda
(Comprobado a mano con una página temporal que se borró: el evento `usar` entrega precio, costo total y el cálculo; el modal se ve bien a 1360 y 400 px.)

---


## Tests existentes que quedaron viejos

| Test | Desde | Por qué falla |
|---|---|---|
| `e2e/tests/login.spec.ts`, `e2e/tests/modelo.spec.ts` | 2026-10-08 (rama `rename/variante-a-articulo`) | Buscan el buscador de Modelos por `'Buscar nombre o código…'`; en la rama dice `'Buscar modelo por nombre o código…'`. |
| `e2e/support/articulo.ts` → `crearArticulo()` (lo usa `descuento.spec.ts`) | 2026-10-08 (rama `rename/variante-a-articulo`) | Busca el botón `/Guardar producto/`; en la rama dice "💾 Guardar artículo". **Ojo:** el workflow de e2e corre solo después del deploy de QA, así que cuando la rama llegue a `qa` estas 3 pruebas van a salir en rojo hasta que se ajusten. |

## 2026-10-28 · Pagar con tarjeta al generar el pedido
- Cliente (no admin): carrito → Generar pedido → Confirmar → ventana «¿Quieres pagar ahora con tarjeta?». «No» deja el pedido Pendiente y vuelve a la tienda; «Pagar ahora» abre el cobro (contado/meses) y al terminar lleva a Mis pedidos. Admin: no sale la ventana.

## 2026-10-29 · Venta directa con tarjeta por el módulo nuevo
- Admin: Venta directa → forma de pago tarjeta → Cobrar: se abre «Cobrar con la terminal» (meses solo si el pedido cumple). Total .00 aprueba (ticket, venta pagada y entregada); .01 rechaza; .02 no contesta; .03 cancela. Tras rechazo/cancelación: Intentar de nuevo / Cancelar la venta (regresa stock) / Dejarla pendiente (queda en Mis pedidos). Efectivo, Apartado e Ir pagando: igual que antes.

## 2026-10-29 · Pago en línea con Mercado Pago (Checkout Pro)
- Cliente: Generar pedido → Pagar ahora → llega a Mercado Pago (prueba), paga con tarjeta de prueba → regresa a «Confirmando tu pago…» → «¡Pago aprobado!». Tarjeta rechazada → «No se pudo cobrar». Cerrar la pestaña de pago y volver → el pedido sigue Pendiente. Entrar a `pedidos/pago-resultado` sin parámetros o con un id ajeno → «No encontramos ese pago». Con la pasarela simulada el flujo es el de siempre.

## 2026-11-01 · Revisión de ventas (pestaña nueva en Reportes)
- Admin: Reportes → «🔎 Revisión» (si no aparece: correr `migration_accion_reporte_revision.sql` en la base y volver a iniciar sesión). Debe cargar sola al abrir la pestaña y mostrar «Todo en orden» o «N cosa(s) por revisar».
- Lo grave sale abierto con sus casos; lo que está bien sale en «Sin problemas». Cambiar «Desde/Hasta» y pulsar «Revisar» recalcula; fechas al revés → mensaje de error.
- Caso conocido para ver una alerta real en QA: «Great Jeans talla 14 AZUL MARINO» (artículo con stock y modelo en 0) debe salir en «Se ve con stock en la tienda pero el pedido lo rechaza».
- Un empleado (sin la acción) NO debe ver la pestaña; llamar el endpoint sin ser admin → 403.
- Noche y día: leerse bien, sin colores fijos; celular: sin scroll horizontal.

## 2026-11-01 · Gráficas del Dashboard
- Admin: Dashboard → debajo de las tarjetas deben salir «Cómo te pagan» y «Ventas, gastos y ganancia — últimos 12 meses». Con ventas: dona con colores del diseño y la tabla al lado (Forma de pago, Ventas, Total, %, Comisión); con tarjeta, la comisión sale en pesos; la fila Total coincide con «Ventas del mes» de la tarjeta de arriba cuando el periodo es «Este mes».
- Cambiar «Este mes / Mes anterior / 90 días» redibuja la dona y la tabla. Sin ventas en el periodo: mensaje «No hubo ventas …» (no gráfica vacía).
- Mes a mes: 12 barras de ventas y gastos + línea de ganancia neta; el mes actual coincide con las tarjetas «Ventas del mes», «Gastos mes» y «Ganancia neta». Mes sin movimiento = barra en cero (no hueco).
- Noche y día: textos y colores se leen bien; celular: tabla con scroll horizontal dentro de su caja, sin scroll horizontal de toda la página.
- Una venta «Devuelta» NO debe sumar en ninguna de las dos.

## 2026-11-01 · Más paneles del Dashboard (por cobrar, mercancía parada, pedidos)
- Admin: Dashboard → después de las dos gráficas anteriores deben salir «Lo que te deben, por antigüedad», «Mercancía que no se mueve» y «En qué punto están los pedidos».
- Por cobrar: el total que dice arriba a la derecha coincide con la tarjeta «Por cobrar»; las 3 barras suman ese total; la tabla «A quién cobrarle primero» va del más viejo al más nuevo y los días salen en verde (≤7), ámbar (≤30) o rojo.
- Mercancía parada: cambiar 30/60/90 días recarga; un artículo vendido hace poco NO debe salir; uno recién dado de alta (menos de esos días) NO debe salir; pasar el mouse/dedo sobre una barra dice cuántas piezas, a cuánto y hace cuántos días no se vende (o «Nunca se ha vendido»).
- Pedidos: salen las 6 categorías; «Pagado, falta entregar» y los «atrasados» deben coincidir con lo que se ve en Mis pedidos. ⚠️ Si salen muchos «falta entregar»/«atrasados» de pedidos viejos que ya se entregaron, son pedidos anteriores a la columna `entregado` (ver README de `graficasventas`).
- Noche y día; celular (las tablas con scroll dentro de su caja, sin scroll horizontal de toda la página).

## 2026-11-02 · Paneles para conocer el negocio (cuándo se vende, clientes, zonas)
- Admin: Dashboard → al final deben salir «Cuándo se vende», «Quién te compra» y «A dónde van los pedidos».
- Cuándo se vende: mapa con 7 filas (Lun–Dom) y columnas de hora; los cuadros más oscuros son donde más se vendió; el número del cuadro es cuántas ventas; pasar el mouse/dedo dice «Lunes a las 10 a. m.: 2 venta(s), $300». «El día que más vendes» y «la hora que más vendes» deben coincidir con lo que se ve oscuro. Cambiar 30/90/180 días recarga. En celular el mapa se desplaza dentro de su caja (sin scroll de toda la página). El número debe leerse también en los cuadros más oscuros, de día y de noche.
- Quién te compra: «clientes compraron» no cuenta ventas sin cliente ni las de mostrador (si vendes sin cliente, esa venta NO suma aquí); un cliente que compra por primera vez este mes sale en «Nuevos» y el mes siguiente en «Recurrentes». Los totales de la tabla «Los que más compraron» deben coincidir con lo que ves en Reportes → Por cliente.
- Entregas: la suma de pedidos coincide con Mis pedidos del periodo sin contar cancelados; «Recoger en tienda» sale con otro color.
- Una venta/pedido cancelado o devuelto NO debe sumar en ninguno.

## Dashboard: comparativo del mes y ganancia por producto (2026-11-02)
- Admin: Dashboard → debe salir «Este mes contra el mes anterior» y «Qué productos dejan más ganancia».
- Comparativo: si hoy es día N, las dos columnas dicen «1 al N». Ventas y ganancia del mes actual deben coincidir con las tarjetas «Ventas del mes» / «Ganancia» del Dashboard; el mes anterior, con el reporte Mensual de Reportes para esos mismos días.
- Gastos: si bajan contra el mes anterior el cambio sale en verde (▼); si suben, en rojo (▲). Si el mes anterior fue 0 sale «sin dato del mes anterior», no un porcentaje.
- Ganancia por producto: el producto que más ganancia deja va arriba; la suma de «Piezas» de un producto incluye todos sus artículos (tallas/colores). El % de arriba dice qué parte de toda la ganancia dejan esos 10.
- Una venta devuelta NO debe sumar en ninguno de los dos paneles.

## Mis pedidos: Cobrar con el componente compartido (2026-11-02)
- Admin, QA (pasarela simulada): Mis pedidos → pedido de contado sin pagar → Cobrar → forma de pago con tarjeta → debe salir «Continuar con la tarjeta» (ya NO el panel «Terminal Mercado Pago» ni el selector de plan en este diálogo).
- Continuar → se abre «Cobrar con la terminal» con los meses permitidos de ESE pedido (si no hay, dice «Solo de contado: …»). Total con centavos .00 → aprobado: sale «Pedido cobrado correctamente» y la card queda Pagado y Entregado.
- Centavos .01 → rechazado con «Reintentar»; .03 → cancelado; cerrar el cobro sin pagar deja el pedido igual que antes.
- Cobro de un GRUPO de pedidos: debe seguir saliendo el panel anterior «Terminal Mercado Pago» (sin cambios).
- Efectivo / transferencia: igual que antes («Confirmar cobro»).

## Escanear el código de barras con el celular (2026-11-02, versión rápida)
Necesitas la PC y el celular (con cámara). QA es https, así que la cámara del celular funciona.
- **Primera vez (QR):** en la PC abre Tienda → Buscar → pulsa «📱» junto al buscador. Sale un QR. Con la cámara del celular ábrelo, toca el enlace y permite la cámara. Debe abrir **al instante** una página oscura con la cámara y «Listo: apunta al código de barras». En la PC el cuadro cambia solo de «QR» a «📱 Escanea ahora».
- **Escanear:** apunta el celular a un código de barras de producto. En la PC debe aparecer «✔ Recibido: …» casi al instante, el cuadro se cierra y el buscador muestra ese código con el artículo. El celular dice «✔ Enviado» y vibra.
- **Segunda vez (sin QR):** deja el celular abierto en esa página y vuelve a pulsar «📱» en la PC (puede ser otro campo: Buscar producto, Nuevo producto, Venta directa…). Debe abrir **sin QR**, directo en «Escanea ahora»; apuntas el celular a otro producto y llega.
- **Otras pantallas:** Productos → Agregar (campo «Código de barras»: llena el campo y apaga «generar automático»), Carga de imágenes, Venta directa, detalle del pedido → Agregar artículo, detalle del artículo → «Código de barras nuevo» (los códigos entran en MAYÚSCULAS).
- **Usar otro celular:** en el cuadro «📱 Escanea ahora» pulsa «Usar otro celular»: la próxima vez sale el QR.
- ⛔ No puede pasar: que llegue el mismo código dos veces seguidas a la PC; que la PC pida QR cada vez teniendo el celular conectado; que el celular muestre «La conexión terminó» si la PC sigue pidiendo (solo debe pasar si la PC cerró/olvidó la conexión o pasaron 5 minutos sin actividad).
- Si cierras la página del celular o se apaga la pantalla más de 45 s, la PC vuelve a mostrar el QR (el celular se reconecta abriendo el mismo enlace o escaneando el QR otra vez).
- Sin permiso de cámara: la página debe decir «No se pudo abrir la cámara» con «Intentar de nuevo».
- Venta directa: escanear dos veces seguidas el mismo artículo (con ✕ entre las dos) debe buscarlo las dos veces.
- Un solo escaneo por código: deja el celular apuntando a un producto: a la PC debe llegar UNA vez (no se repite). Retíralo (1 s) y vuelve a acercarlo: llega otra vez (así puedes agregar dos piezas iguales).
- Escanear sin haber pulsado «📱» en la PC: el celular dice «La computadora no lo está pidiendo: pulsa «📱» y vuelve a escanear» (no «Enviado»), y ese código NO debe aparecer luego en la PC.
- Bloquea el celular 10 segundos y desbloquéalo: la cámara debe volver a funcionar sola (si se ve negra, avísame con el modelo del celular).
- Si el celular apunta al QR de la pantalla de la PC (el de enlace), no debe mandarlo como código.

## Escáner por CUENTA: el celular escanea y llega a la pantalla de la PC (2026-11-02) — LA PRUEBA PRINCIPAL
Necesitas la PC y el celular, los dos con **el mismo usuario** (administrador) en QA.
1. En la PC abre **Productos → Agregar** (el campo «Código de barras» vacío). Junto al campo hay un «📱» con un puntito gris (celular no conectado).
2. En el celular entra a la tienda con tu usuario y abre el menú → **📱 Escáner**. Permite la cámara. Debe decir «Listo: apunta al código de barras».
3. En la PC el puntito del «📱» debe ponerse **verde** (celular conectado).
4. Apunta el celular a un código de barras de producto. En la PC el código debe aparecer **solo** en el campo «Código de barras» (sale un aviso «Código recibido»), sin pulsar nada. El celular dice «✔ Enviado» y vibra.
5. Cambia la PC a **Productos → Buscar** (o la tienda → Buscar): escanea otro producto con el celular (sin tocar nada en él): se llena el buscador y busca.
6. Prueba también Carga de imágenes, Venta directa, detalle del pedido → Agregar artículo, detalle del artículo → «Código de barras nuevo».
7. Cambia la PC a una pantalla SIN campo de código (Dashboard) y escanea: el celular debe avisar «La computadora no tiene abierta una pantalla con código de barras» (y no pasa nada en la PC).
8. Cierra el escáner del celular unos minutos y vuelve a abrirlo: debe reconectarse SOLO (sin QR) y el punto de la PC volver a verde.
- ⛔ No puede pasar: que el código llegue dos veces; que llegue a otra cuenta; que pida QR teniendo sesión; que con la PC en otra pestaña oculta se llene un campo.
- Pruebas aparte: dos PCs con la misma cuenta (solo debe recibir la que tengas a la vista), y un visitante sin sesión en la tienda (sigue usando el QR de «📱»).


## Foto del celular → PC (2026-11-03) 🔴 PRUEBA PENDIENTE (con celular real)
**Antes de empezar:** celular con tu usuario abierto en **📱 Escáner**; PC con tu mismo usuario en **Productos → Agregar** (o Agregar artículo / Actualizar artículo).
1. En la PC pulsa **📱 Foto del celular**: debe decir «El celular está conectado…».
2. En el celular pulsa **📷 Tomar foto** → aparece la vista previa → **Enviar a la computadora**. ✅ La foto aparece en las imágenes de la PC y sale aviso «Foto recibida del celular».
3. Repite: se **agrega** otra (no reemplaza). Prueba también **📸 Cámara del celular** (cámara nativa del iPhone/Android).
4. Guarda el producto/artículo: ✅ la imagen se guarda como las demás.
5. En la PC cambia a una pantalla sin imágenes (Dashboard) y manda otra: ✅ el celular dice «La computadora no tiene abierta una pantalla que reciba fotos».
⛔ No puede pasar: foto duplicada en la PC, error 413, la foto llega a otra cuenta.


## Agregar foto desde Buscar (2026-11-03) 🔴 PRUEBA PENDIENTE
**Antes de empezar:** un artículo sin imagen (Tienda → Buscar, filtro «sin imágenes») y tu usuario con permiso de actualizar artículos.
1. En su tarjeta pulsa **📷 Agregar foto**. ✅ Sale el cuadro con el nombre del artículo.
2. Elige una foto de la computadora. ✅ Aviso «Foto agregada», se cierra y la tarjeta ya muestra la imagen.
3. Con otro artículo sin imagen: deja el cuadro abierto y toma la foto con el celular (📱 Escáner → 📷 Tomar foto). ✅ Se sube sola al artículo.
4. Revisa el artículo: stock, precio y demás datos **iguales** que antes (solo cambió la imagen).
⛔ No puede pasar: botón visible para quien no puede actualizar artículos; la foto llegando a otro artículo; el cuadro quedando abierto tras subir.


## Seguridad, segunda tanda (2026-11-03 noche) 🔴 PRUEBA PENDIENTE (QA)
1. **Token solo a lo nuestro:** usa el mapa de ubicación (Nominatim) y la tienda normal; en F12 → Red, las llamadas a otros sitios NO llevan `Authorization`.
2. **CSP en modo reporte:** abre la tienda y recorre Tienda, Carrito, Pedidos, Chat, Escáner; en F12 → Consola busca avisos «[Report Only] Refused to…». Pásamelos para ajustar la CSP antes de activarla.
3. **Cerrar sesión borra el enlace del escáner:** después de salir, en F12 → Aplicación → Almacenamiento local no debe estar `escaner.sesion`.
4. **Refresh/logout con header obligatorio (solo QA):** iniciar sesión, esperar >15 min o forzar un refresh: la sesión se renueva sola; cerrar sesión funciona.
5. **Swagger apagado en QA:** `/swagger-ui.html` ya no abre.


## Agregar artículos con stock 1 (2026-11-03) 🔴 PRUEBA PENDIENTE
1. Un modelo con **1** de stock y sin artículos → «🧩 Agregar artículos». ✅ El Artículo 1 ya trae **Stock 1** y «Guardar 1 artículo» está activo, sin pulsar Aplicar.
2. Un modelo con 5 de stock → el stock del artículo sigue **vacío** (hay que elegirlo).
3. Guarda el de stock 1: el artículo queda con stock 1 y al modelo le quedan 0 libres.
