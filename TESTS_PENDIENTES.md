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

## Tests existentes que quedaron viejos

| Test | Desde | Por qué falla |
|---|---|---|
| `e2e/tests/login.spec.ts`, `e2e/tests/modelo.spec.ts` | 2026-10-08 (rama `rename/variante-a-articulo`) | Buscan el buscador de Modelos por `'Buscar nombre o código…'`; en la rama dice `'Buscar modelo por nombre o código…'`. |
| `e2e/support/articulo.ts` → `crearArticulo()` (lo usa `descuento.spec.ts`) | 2026-10-08 (rama `rename/variante-a-articulo`) | Busca el botón `/Guardar producto/`; en la rama dice "💾 Guardar artículo". **Ojo:** el workflow de e2e corre solo después del deploy de QA, así que cuando la rama llegue a `qa` estas 3 pruebas van a salir en rojo hasta que se ajusten. |
