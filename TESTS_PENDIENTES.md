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

### 2026-11-12 — Fletes: la pregunta «¿Actualizar también el viaje?» se cerraba sola
**Dónde:** `productos/producto/add/add.component.ts` — después de guardar el producto, el aviso «¡Producto actualizado!» (y la pregunta de artículos) esperan a que se conteste la pregunta del viaje; antes la tapaban y te sacaban a Productos → Buscar.
**Debe comprobar:** en Actualizar un producto que está en un viaje, cambiar «Transporte por pieza» → Usar este precio → Guardar: la pregunta se queda hasta que se responda; con «Sí» sale «Viaje actualizado» y luego «Producto actualizado»; con «No» sigue «Producto actualizado»; sin cambiar el transporte no pregunta nada; sin viaje el aviso de guardado sale igual que antes. Nuevo producto sin viaje: igual que antes.

### 2026-11-12 — Fletes: «Ver productos» de la card se desbordaba y «Piezas» no se entendía
**Dónde:** `fletes/fletes.component.*` (`.fl-tabla-wrap--card`, `renglonesVisibles`, `filtroDetalle`, encabezado «Piezas del viaje» y su ayuda)
**Debe comprobar:** en la card de un viaje con 150+ productos, «Ver productos» abre una tabla que NO se sale de la card, tiene su propio scroll (unos 20rem) con encabezado fijo y un buscador (con más de 8 productos) que filtra por nombre o código; al abrir otra card el buscador se limpia; a 400 px no hay scroll horizontal de la página. En Editar viaje la columna se llama «Piezas del viaje» y una nota explica que NO cambian el stock del producto. Comprobado en navegador con 186 productos; falta el uso real en QA.

### 2026-11-11 — Un solo flete entre el viaje y «Calcular precio»
**Dónde:** `shared/calculadora-precio/*` (`viajeVigente`, `ponerFleteDelViaje`, `difiereDelViaje`, `viaje` en `IResultadoCalculo`), `productos/producto/add/add.component.ts` (`preguntarActualizarViaje`)
**Debe comprobar:** un producto en un viaje con flete $20: al abrir «Calcular precio» el transporte sale en $20 con «Tomado del viaje X» y no pisa un valor que ya escribiste; con varios viajes se toma el más viejo que todavía tiene piezas del producto por vender (si ninguno tiene, el más reciente); al cambiar el transporte a $30 sale el aviso «el viaje dice $20 y aquí pusiste $30»; al «Usar este precio» y guardar el producto sale «¿Actualizar también el viaje?»: «Sí» deja el flete del producto en el viaje en $30 (sin tocar los otros productos del viaje ni las ventas ya ligadas), «No» lo deja en $20; si el transporte es igual al del viaje no pregunta nada; un producto sin viajes se comporta como antes; si el viaje ya no tiene el producto o falla el guardado, el producto y su cálculo ya quedaron guardados y solo se avisa. No se comprobó en pantalla (solo compila).

### 2026-11-11 — Fletes: la lista de productos del viaje se traba con muchos productos
**Dónde:** `fletes/fletes.component.*` (`productosDelViaje`, `productosDeLaPaginaViaje`, `filtroViaje`, `.fl-tabla-wrap--viaje`, `.fl-pie`)
**Debe comprobar:** con una campaña de 186 productos traída al viaje solo se pintan 25 renglones por página (8 páginas) y el scroll de la página ya no se traba; el buscador «entre los productos del viaje» (solo con más de 25) filtra por nombre o código sin acentos y vuelve a la página 1; quitar productos en la última página no deja una página vacía; la tabla tiene su propio scroll (unos 26rem) con el encabezado fijo; en pantallas de 900 px o más el resumen y «Guardar viaje / Cancelar» quedan pegados abajo (compactos) y en celular no; cambiar piezas o flete de un renglón actualiza el resumen al momento; las tablas de «Ligar ventas anteriores» y de ligas manuales también tienen su scroll. Comprobado en navegador con 186 productos (25 renglones y 75 campos en pantalla en vez de 186 y 558); falta el uso real en QA.

### 2026-11-11 — Fletes: deshacer ligas manuales
**Dónde:** `fletes/fletes.component.*` (tabla «Ligas hechas a mano en este viaje»), `FletesService.ligasManuales/quitarLiga`
**Debe comprobar:** tras ligar ventas anteriores aparece la liga en la tabla; «↩ Deshacer» pide confirmación, la quita, la venta vuelve a salir en «Buscar ventas» como pendiente y la barra de «recuperado» del viaje baja; las ligas automáticas (hechas al vender) NO aparecen ni se pueden deshacer; sin ligas manuales la tabla no se muestra.

### 2026-11-11 — Fletes: el flete por pieza sale de lo guardado en «Calcular precio» (reemplaza al cálculo automático)
**Dónde:** `fletes/fletes.component.*` (`incorporar`, `importarCampana`, `llenarFleteQueFalta`, `sinFleteIds`), `FletesService.productosParaViaje`, `admin/cache` (tipo CAMPANA)
**Debe comprobar:** al agregar productos (uno por uno, categoría o campaña) llegan con 1 pieza, su costo y su flete guardado; los sin flete guardado quedan en $0 con la marca y NO se llenan solos; «Llenar el flete que falta» reparte lo que falta (a cubrir − el flete de los demás) solo entre ellos y no toca a los otros; sin pulsarlo quedan en $0; volver a traer la misma campaña o categoría no duplica; cambiar piezas, gastos o flete total NO mueve ningún flete; editar un viaje guardado y agregar productos no cambia los que ya estaban; con más de 300 productos se parte en varias consultas; el recuadro 🧪 muestra «campaña de …» para el dato de la prueba F.

### 2026-11-11 — Fletes entrega 5: categoría, «Otros», agregar categoría completa e importar viaje en Campañas
**Dónde:** `fletes/fletes.component.*` (buscador del viaje), `campanas/campanas.component.*` (selector «Otros» e «Importar los productos de un viaje»), `ProductoService.adminFiltrar(sinCategoria)`
**Debe comprobar:** elegir una categoría en Nuevo viaje lista sus productos sin escribir; «Otros» lista solo los sin categoría; «Agregar los N de esta búsqueda» agrega todos los de todas las páginas, salta los ya agregados (sin duplicar) y muestra cuántos se agregaron/saltaron; en Campañas «Otros» filtra bien y «Importar viaje» no duplica productos que ya estaban ni rompe el precio de cada uno; celular 400 px sin scroll horizontal, día y noche.

### 2026-11-11 — Fletes entrega 4: botones ⬇ Excel y ⬇ PDF del viaje
**Dónde:** `fletes/*` (botones en cada tarjeta, `descargar`), `fletes.service.ts` (`descargarReporte`).
**Debe comprobar:**
- [ ] Cada tarjeta de Fletes tiene ⬇ Excel y ⬇ PDF; mientras se arma dice «Armando…» y los dos botones se bloquean; el archivo se descarga con nombre `reporte-viaje-<nombre>.xlsx|pdf`.
- [ ] Si falla, sale «No se pudo armar el archivo del viaje» y los botones vuelven a servir; día y noche, celular y escritorio.

### 2026-11-11 — Fletes entrega 3: ligar ventas anteriores, calculadora con viaje y bloque en el producto
**Dónde:** `fletes/*` (panel «Ligar ventas anteriores»), `shared/calculadora-precio/*`, `productos/producto/add/*`.
**Debe comprobar:**
- [ ] Fletes → «Ligar ventas anteriores» en un viaje: elegir producto, fechas opcionales, «Buscar ventas», cantidades por venta, «Llenar de la más vieja a la más nueva» (no pasa de lo que le queda al viaje), resumen «Se ligarán N pieza(s)» y avisos claros si algo no cuadra; «Ligar al viaje» guarda y refresca el avance del viaje.
- [ ] Calculadora: en un producto con viaje salen los botones «Usar el flete de un viaje» (llenan «Transporte por pieza»); el aviso de flete duplicado solo salta con «Poner también el costo total» marcada; sin viaje no cambia nada.
- [ ] Actualizar producto: bloque «🚚 Viajes de compra» (solo lectura) con fecha, viaje, piezas, costo y flete por pieza; no aparece en producto nuevo ni sin viajes.
- [ ] Día y noche, celular y escritorio.

### 2026-11-11 — Fletes entrega 2: avance de cada viaje y flete real en el reporte por categoría
**Dónde:** `fletes/*` (barra de recuperado, detalle de productos), `reportes/reporte-categoria/*`, `reportes/service/reportes.service.ts`.
**Debe comprobar:**
- [ ] Cada tarjeta de Fletes muestra su estado (Abierto / Flete cubierto / Vendido por completo), la barra «Recuperado $X de $Y», «falta», «ya es ganancia», piezas vendidas y quedan, y la fecha en que se cubrió; «Ver productos» abre el detalle por producto.
- [ ] Si el reporte de viajes falla, la lista se ve igual sin barras (nada se rompe); día y noche, celular y escritorio.
- [ ] Reportes → Por categoría: columnas «Flete real (viajes)» y «Piezas sin viaje» con su total; la tarjeta Flete dice «(real $X)»; la leyenda explica real vs estimado.

### 2026-11-11 — Fletes (Catálogo → Fletes) y aviso de flete duplicado en la calculadora
**Dónde:** `fletes/*` (servicio, módulo, componente), `app-routing.module.ts`, `navbar` (item + `GROUP_ROUTES`), `shared/calculadora-precio/*`.
**Debe comprobar:**
- [ ] Menú Catálogo → «🚚 Fletes» (solo administrador; hay que volver a entrar tras correr la migración). Lista de viajes en tarjetas con flete total, costo a cubrir, compra, productos/piezas y la etiqueta «Falta repartir $X» / «Flete repartido».
- [ ] Nuevo viaje: nombre, fecha (hoy por defecto), flete total, nota; gastos opcionales con «Cuenta para cubrir»; buscar producto por nombre o código y agregarlo (1 pieza, su costo de hoy); «Repartir el flete por igual» pone en todos costo a cubrir ÷ piezas.
- [ ] El resumen en vivo cambia al escribir: costo a cubrir, flete repartido, falta por repartir (color de aviso) y flete de más; sin nombre/fecha o con piezas inválidas no deja guardar y dice por qué.
- [ ] Guardar, editar (se ve lo guardado) y eliminar (con confirmación) un viaje; el mismo producto no se agrega dos veces.
- [ ] Calculadora de precio en un producto que está en un viaje: aviso «ya tiene su flete registrado en «viaje» (…por pieza)»; con transporte > 0 o con la casilla de costo total marcada dice que se contará dos veces; la casilla arranca desmarcada. En un producto sin viaje no cambia nada.
- [ ] Día y noche, escritorio y celular (≤560 px).

### 2026-11-11 — Buscadores en píldora: misma altura que un campo (44 px)
**Dónde:** `src/tema-jade.scss` (sección «Buscadores en píldora»).
**Debe comprobar:**
- [ ] Tienda → Buscar, Productos → Buscar, Venta directa, Usuarios y el buscador de Tienda → venta miden lo mismo que un campo de formulario (44 px), de día y de noche; ya no se ven «anchos».
- [ ] El botón de la cámara y el 📱 de Tienda → Buscar siguen cabiendo dentro de la píldora sin agrandarla; el texto y el placeholder se ven completos; el foco sigue mostrando el borde.
- [ ] Con el diseño «Clásico» (sin capa Jade) y en Login/Registro no cambia nada.

### 2026-11-11 — Campañas: precio de venta y de descuento (solo lectura) y filas sin descuento
**Dónde:** `campanas/campanas.component.{ts,html,scss}`, `campanas.service.ts`.
**Debe comprobar:**
- [ ] En «Juguetes y su precio de campaña» cada fila muestra «Precio de venta» y «Con descuento» deshabilitados (no se pueden editar) y «Precio de campaña» editable; un producto sin descuento muestra «—».
- [ ] Un juguete con precio de campaña **igual** al precio de venta: fila marcada con el color de aviso, sale al inicio de la lista y arriba aparece «⚠ N juguetes con el precio de campaña igual al de venta».
- [ ] Al escribir un precio la fila no se brinca de lugar; se reacomoda al salir del campo. Al agregar un juguete nuevo con precio igual al de venta, también sale marcado.
- [ ] Guardar la campaña no manda precioVenta ni precioRebaja; celular (≤560 px): los tres precios debajo del nombre; día y noche.

### 2026-11-11 — Reporte por categoría: un solo reporte con inversión, flete y tipo de precio
**Dónde:** `reportes/reporte-categoria/*`, `reportes/service/reportes.service.ts`.
**Debe comprobar:**
- [ ] No hay selector «Tipo de reporte». Tarjetas: productos, inversión, flete, total vendido, ganancia, a precio normal, a rebaja, a campaña.
- [ ] Tabla: columnas Inversión y Flete por producto; por cada tipo (normal, rebaja, campaña) piezas · precio · total, **vacío** si no se vendió así; «Otro» y «Piezas con tipo estimado»; «por vender» al final; fila de totales completa.
- [ ] Caso A/B/C: A vendió 2 normales → solo en Normal; B vendió 1 en campaña → solo en Campaña con su precio; C 1 normal + 1 campaña → en las dos; totales = suma.
- [ ] Excel y PDF salen con el mismo diseño; día y noche, escritorio y celular (scroll horizontal dentro de su caja).

### 2026-11-10 — Reportes → pestaña «🗂️ Por categoría» (solo administrador)
**Dónde:** `reportes/reporte-categoria/*` (componente nuevo), `reportes/service/reportes.service.ts` (`getPorCategoria`, `generarReporteCategoria`, `getReportesGenerados`, `getEstadoReporteGenerado`, `descargarReporteGenerado`), `reportes.component.{ts,html}` (pestaña), `reportes.module.ts`, `loading.interceptor.ts` (`/v1/reportes/ventas/por-categoria/generados` sin overlay).
**Tipo:** e2e (Playwright contra QA) · unitario de componente (HttpTestingController).
**Debe comprobar:**
- [ ] La pestaña solo la ve el administrador (los demás no la ven ni por URL: el back responde 401/403).
- [ ] Modo «Por categoría»: con fechas y categoría trae lo vendido; «Otros (sin categoría)» trae solo productos sin categoría; «Todas» trae todo, paginado; los totales de arriba y de la fila final son de TODAS las páginas.
- [ ] Un producto vendido 2 veces (cantidad 2 y 3) sale con 5 piezas; una venta cancelada («Devuelta») no cuenta; el último día de las fechas sí.
- [ ] «Solo lo vendido» / «Solo lo que no se ha vendido» / «Vendido y por vender» cambian las filas y la ganancia por vender.
- [ ] Modo «Productos elegidos»: buscar por nombre o código de barras, agregar/quitar, «Quitar todos»; el reporte suma solo esos productos; sin elegir ninguno no deja consultar.
- [ ] Columnas: precio de compra, venta, rebaja, rebaja de campaña, piezas, ventas, total, costo, ganancia, % calculado, % real, flete, «Sin flete», por vender, ganancia por vender, ganancia total.
- [ ] «⬇ Excel» y «⬇ PDF»: aparece «Armando tu reporte…», la pantalla sigue usable, y al estar listo se descarga solo; «Mis reportes» lista los últimos con «Descargar»; un reporte con error muestra el motivo. El Excel y el PDF traen los mismos números que la pantalla y la fila de totales al final.
- [ ] Pedir 4 reportes seguidos → aviso de que hay muchos armándose.
- [ ] Día y noche, 1360 y 400 px: sin scroll horizontal de la página (la tabla hace su propio scroll).
- [ ] Efecto en la base (back): el reporte generado guarda en el historial de cálculos los productos que no tenían (sin flete); la pantalla no guarda nada.

### 2026-11-10 — Cámara de los buscadores: mismo lector que el escáner del celular
**Dónde:** `shared/barcode-scanner.util.ts` (`iniciarEscanerConAutofoco`; lo usan Tienda → Buscar, Productos → Buscar, Nuevo producto, carga de imágenes y «Código del cliente»), `escaner-celular/escaner-celular-pagina.component.ts` (opción `soloZxing` en su respaldo).
**Debe comprobar (en el celular, Chrome y también Safari/iPhone):**
- [ ] Tienda → Buscar → 📷: la cámara abre en 1280×720, enfoca igual de rápido que el menú «Escáner» y al leer el código lo pone en el buscador y busca; la cámara se apaga sola.
- [ ] Lo mismo en Productos → Buscar, Nuevo producto (código de barras) y carga de imágenes.
- [ ] iPhone / Safari (sin lector nativo): sigue funcionando con zxing (puede tardar más; ahora también pide 1280×720).
- [ ] «Código del cliente» (QR en Venta directa): sigue leyendo el QR con la cámara.
- [ ] Menú «Escáner» y «Escáner QR» del celular: sin cambios (siguen mandando a la PC).
- [ ] Cerrar el cuadro de la cámara sin escanear apaga la luz de la cámara.
- [ ] Enfoque: al abrir la cámara pide autoenfoque continuo; al TOCAR la imagen reenfoca al instante en ese punto y vuelve al continuo (Chrome Android). En iPhone no hay control: enfoca solo.

### 2026-11-10 — Paquete de campaña para PRODUCCIÓN (hotfix/campana-prod-front, desde master)
**Dónde:** `campanas/**` (+ `codigo-publico`), `precio-cantidad/**`, `variante/venta-directa/**`, `variante/venta-variante/*`, `pedidos/detalle-pedido/*`, `pedidos/mis-pedidos/*`, `pedidos/cobro/liquidar-apartado/*`, `pedidos/aviso-ir-pagando-campana.ts`, `shared/entrada-codigo-qr/**`, `shared/escaner-celular/*`, `escaner-celular/*`, `assets/escaner/escaner.html`, `shared/ticket.util.ts`, `shared/ticket-correo.util.ts`, `shared/version-nueva.util.ts`, `shared/calculadora-precio/*`, `variante/buscar/*`, `productos/producto/all/*`, `legal/privacidad/*`, `legal/terminos/*`, `navbar/*`, `app-routing.module.ts`.
**Tipo:** e2e (Playwright contra producción con back simulado y después contra el back real) · unitario de componente/servicio (HttpTestingController)
**Debe comprobar:**
- [ ] Menú Catálogo: «🏷️ Grupos de precio por cantidad» y «🎁 Campañas» solo con la pantalla (`productos/grupos-precio`, `productos/campanas`; filas de submenu en la BD de producción). Sin la fila → `PantallaGuard` manda a Tienda.
- [ ] Campañas: alta, buscadores, precios, reporte con «Ver QR» y «Eliminar datos», duplicar / activar / apagar con confirmación, aviso de fechas encimadas. `/codigo-campana/:uuid` dibuja el QR sin sesión.
- [ ] Venta directa sin campaña vigente: igual que antes (sin bloque). Con campaña vigente: bloque «🎁 Campaña …» SIN marca de versión; ya pagado 800, meta 1,499, Contado con 1,600 en no-juguetes + juguetes → los juguetes bajan a precio de campaña; al quitar no-juguetes por debajo de la meta regresan a normal; Ir pagando → precio normal con aviso.
- [ ] «No registrar y cobrar» → aviso «Se cobra a precio normal» y el request sin `campana`; el modal «Cliente sin registro» exige la casilla de privacidad, tiene scroll y botones fijos en 400 px.
- [ ] Contado con correo: el `POST /v1/ventas/save` ya NO lleva `notificacion`; sale UN `POST /v1/pedidos/{pedidoId}/notificar` con el ticket de los `renglones` del back. Sin `pedidoId` en la respuesta → aviso «Reenvíalo desde Mis pedidos» (depende del back de producción).
- [ ] Doble clic en «Cobrar» → una sola venta. Pestaña abierta desde ayer después de `fechaFin` → no manda campaña. Versión nueva publicada con el carrito vacío → recarga sola; con venta a medias → aviso y no recarga.
- [ ] Carrito (venta-variante) y Venta directa: precio de grupo tachado; gana el más bajo entre normal, grupo y campaña.
- [ ] Detalle del pedido: «🎁 Enviar código de campaña» (admin, `tieneCodigoDeCampana`), aviso de Ir pagando; Liquidar Apartado → «Cámbialo a Ir pagando» abre el detalle ya en el cambio; tickets con precio normal tachado (`precioNormal`/`conPrecioDeCampana`).
- [ ] Escáner QR del celular (`/escaner-qr`, menú «🎁 Escáner QR» SIN versión): el UUID llega solo a «Código del cliente»; un código de barras sigue yendo al buscador; un UUID con solo el buscador abierto se descarta.
- [ ] Tienda → Buscar: **visitante anónimo y cliente (ROLE_USUARIO) arrancan en «Todas»** y ven todo el catálogo; ven el selector Categoría. Personal con sesión arranca en JUGUETES (si existe); «Limpiar» deja «Todas»; al recargar vuelve a JUGUETES; otra categoría guardada (BOLSAS) se recuerda. **Hotfix 2026-11-10:** el texto y la categoría se COMBINAN (antes con 3+ letras la categoría se ignoraba y «bolsa» con JUGUETES mostraba las bolsas): con JUGUETES elegido y «bolsa» escrito no sale ninguna bolsa; si nada coincide, «sin resultados»; «Limpiar» deja Todas.
- [ ] Productos → Buscar: el selector usa `GET /mis-productos/v1/productos/admin/categorias` y si falla `filtros-disponibles`; mismas reglas de JUGUETES/«Todas».
- [ ] Privacidad y Términos: «10 de noviembre de 2026», fin 5 de enero de 2027 (incluido), regla «lo ya pagado + artículos de la compra actual que no son juguetes», Ir pagando a precio normal, Apartado↔Ir pagando, sin datos no hay precio especial, datos solo se borran si lo pide.
- [ ] No hay «QR-4/QR-5/QR-6» ni «Versión:» en ninguna pantalla (`marca-version.ts` no existe en este paquete).

**Depende del back de producción:** endpoints `/v1/campanas/**`, `/v1/grupos-precio-cantidad/**` y `/v1/precio-cantidad/calcular`, `admin/categorias`, `categoria` en `buscar-filtrado`/`admin/filtrar`, `renglones` y `pedidoId` en `/v1/ventas/save` de contado, `acepta=…,uuid` en el canal del escáner, `precioNormal`/`conPrecioDeCampana`/`tieneJuguetesConPrecioDeCampana`/`tieneCodigoDeCampana` en el detalle del pedido, filas de submenu `productos/campanas` y `productos/grupos-precio`.

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

### 2026-11-10 — Campañas: pantalla acomodada y paginación en los dos lados
**Dónde:** `campanas/campanas.component.{ts,html,scss}`, `precio-cantidad/grupos-precio.component.{html,scss}`.
- [ ] «Volver» queda a la izquierda con el contenido y «＋ Nueva campaña» no se corta (1136, 1360 y 400 px; sin scroll horizontal), de día y de noche.
- [ ] Juguetes de la campaña: de 12 en 12 con «Página X de N · a–b de total», arriba y abajo; el buscador reinicia a la página 1; al quitar el último de la última página no queda en blanco.
- [ ] Catálogo: paginador arriba y abajo con la categoría JUGUETES y con «Todas las categorías».
- [ ] Grupos de precio por cantidad: «Volver» alineado y sin cortes (mismo arreglo).

### 2026-11-10 — Productos → Buscar: la categoría va dentro del panel de Filtros, antes de «Limpiar filtros»
**Dónde:** `productos/producto/all/all.component.{html,ts,scss}`.
- [ ] Con el panel de Filtros abierto, «JUGUETES» (selector de Categoría) sale justo antes de «✕ Limpiar filtros», como una celda más; con el panel cerrado ya no sale suelto arriba.
- [ ] El contador del botón Filtros cuenta también la categoría («2 activos» = JUGUETES + un filtro).
- [ ] Quien no tiene ningún permiso de filtros (no ve el panel) sigue viendo el selector de categoría suelto, como antes.
- [ ] Cambiar o quitar la categoría sigue filtrando igual; con texto en el buscador sigue buscando en todas.

### 2026-11-10 — Actualizar producto: quitar la categoría
**Dónde:** `productos/producto/add/add.component.ts` (manda `quitarPalabraClave: true` al actualizar sin categoría), `producto.model.ts`.
- [ ] Productos → Buscar → Actualizar: quitar la categoría (✕ del campo) y guardar; al volver a abrirlo no la trae. Si no se toca, la conserva.

### 2026-11-10 — Productos → Buscar: la categoría se respeta también cuando se escribe en el buscador
**Dónde:** `productos/producto/all/all.component.{ts,html}` (`categoriaParaBackend`; se quitó el aviso «Buscando en todas las categorías»).
- [ ] Con JUGUETES elegido, escribir «BOLS» muestra solo los productos JUGUETES que coincidan (si ninguno, «sin resultados»); con la categoría quitada (✕) busca en todas.
- [ ] Texto + categoría + con stock + habilitados + con imágenes se combinan con «Y»; el contador de Filtros cuenta la categoría.
- [ ] Sin categoría y sin texto, la lista sale igual que antes; el escáner (código de barras) sigue encontrando el producto.

### 2026-11-10 — Productos → Buscar: la lista no pasaba de la primera página
**Dónde:** `productos/producto/all/all.component.ts` (`onScroll`, `buscarProductoScroll`).
- [ ] Con JUGUETES/«Con stock»/«Habilitados» (o sin filtros) y más de 12 resultados, al bajar la lista se cargan las siguientes páginas hasta el final; en pantalla con zoom o alta densidad también.
- [ ] Al llegar al final no se piden dos veces la misma página (sin productos repetidos).

### Campañas · el nombre del juguete salía en vertical, letra por letra (2026-11-12, visto en producción)
Causa: la fila de cada juguete tenía el nombre y los tres precios en una sola fila (`1fr auto auto`); la columna de precios pedía todo su ancho en una línea y no dejaba ancho al nombre, y esa lista vive en una columna angosta del formulario.
Cambio: `campanas.component.scss` — el nombre y la ✕ van siempre arriba y los tres precios siempre en su propio renglón, a cualquier ancho.
Debe comprobar: Catálogo → Campañas → Editar una campaña con juguetes: el nombre y el código se leen completos (sin letras en vertical), los precios de venta, con descuento y de campaña salen debajo, la ✕ queda arriba a la derecha, con un juguete de nombre largo, a pantalla ancha y en celular (400 px), de día y de noche. La fila marcada «sin descuento» conserva su franja de aviso.
