# Fixes pedidos/mis-pedidos — sesión 2026-07-07

## Análisis (antes de tocar código)

**1. Botón imprimir ticket no imprime nada (solo se ve una consulta de red)**
`imprimirTicketPedido()` en `mis-pedidos.component.ts` llama `window.open()` dentro del callback
asíncrono de `getDetallePedido()` (HTTP) y/o dentro de un `.then()` de SweetAlert que se dispara
después de esa respuesta. El navegador bloquea silenciosamente los popups que no son resultado
*directo y síncrono* de un clic del usuario. Por eso se ve la petición GET en la red pero la
ventana de impresión nunca aparece.

En **punto de venta** (`venta-directa.component.ts`) y en **abonos** (`abonos.component.ts`) SÍ
funciona: ahí se muestra un Swal con botón "🖨️ Imprimir ticket" y `imprimirTicket()` se llama en
el `.then()` inmediato de ese botón (gesto de usuario reciente), sin una llamada HTTP intermedia
antes de abrir la ventana. Ese es el patrón a replicar en `mis-pedidos`.

**2. Cards amontonadas en el listado**
Ya era CSS Grid responsive (1/2/3/4 columnas según ancho). El usuario pidió explícitamente 1
columna en celular y 3 en PC (sin los pasos intermedios de 2/4), y arreglar el padding/spacing
interno de los botones de cada card.

**3. Imagen no aparece en el detalle de pedido**
Causa raíz real (verificada en backend, no solo front): `detalle-pedido.component.ts` arma la URL
de imagen como `environment.api_Url + '/imagen/' + item.producto` — **le falta el prefijo `/v1/`**.
El endpoint real es `GET /imagen/v1/{productoId}` (`ImageneController.java`). Todas las demás
pantallas del front (`imagenes.service.ts`, `producto.service.ts`, `acceder.service.ts`) sí usan
`/imagen/v1/...`. Esto rompe la imagen para **todos** los productos del detalle, no solo
promociones (las promociones son donde más se nota porque casi siempre se prueban ahí).

Nota: se descartó la hipótesis inicial de que las líneas de promoción guardan `productoId: 0` —
se verificó en `PedidoServiceImpl.savePedido()` que cuando llega `varianteId`, el backend SIEMPRE
resuelve el producto real a partir de la variante (`variante.getProducto()`), nunca guarda 0.

**4. Reenviar ticket — falta confirmación previa**
Ya usa el correo del cliente como valor por defecto, pero siempre lo muestra en un input editable.
Falta: si el cliente ya tiene correo, preguntar primero "¿Enviar ticket al correo de {nombre}:
{correo}?" con Sí/No; si dice que no (o no hay correo registrado), ahí sí mostrar el input para
capturar/editar el correo.

**5. Hora de la compra — el backend NUNCA la guarda**
`pedidos.fecha_pedido` es columna `DATE` en la BD y `Pedido.fechaPedido` es `LocalDate` en la
entidad — no existe ninguna hora que "truncar" en el front, el dato de hora simplemente no se
guarda nunca. Esto requiere cambio de backend (ver plan abajo), no es solo un `toLocaleDateString`
mal puesto en el front (aunque también hay que corregir eso).

**6. Detalle de pedido no distingue promoción vs normal**
`detalle-pedido.component` usa el objeto ya cargado en la lista (`IPedidoGenerico` / `DetalleQuery`),
que NO trae `promocionId`, `promocionDescripcion`, `talla`, `color` ni `varianteId`. Esos campos
YA EXISTEN en `PedidoDetalleResponse.detalles` (`DetalleItemResponse`), el mismo endpoint que ya se
usa para imprimir/reenviar ticket (`GET /v1/pedidos/{id}/detalle`). Falta que el componente de
detalle llame a ese endpoint al abrirse y renderice esos campos.

## Plan de cambios

### Backend (`proyecto_key`, rama `qa`)
- [ ] Agregar columna `fecha_hora_registro DATETIME NULL` a `pedidos` (migración SQL, aditiva,
      no rompe nada existente) + campo en entidad `Pedido` + setearlo en los 4 puntos donde se
      crea un `Pedido` (`PedidoServiceImpl.savePedido`, `VentaServiceImpl` x2, `AbonoServiceImpl`).
- [ ] Exponer `fechaHoraRegistro` en `PedidoDetalleResponse` (para tickets/detalle).
- [ ] Los 4 queries nativos de `IPedidoRepository` (`findPedidoPorId2`, `pediodPorId`,
      `buscarPedidosPorCliente`, `buscarTodosLosPedidos`): cambiar el `DATE_FORMAT` de
      `fecha_pedido` para incluir hora, con `COALESCE` para pedidos viejos sin el dato.
- [ ] Agregar `productoId` a `DetalleItemResponse` (poblado desde `dp.getProducto().getId()`) para
      que el front pueda armar la URL de imagen correcta en la vista de detalle rica.
- [ ] Documentar los campos nuevos en `CAMBIOS_FRONT.md` (fuente de verdad de contratos).

### Front (`producto_venta_online`)
- [ ] Arreglar bug de imagen: agregar `/v1/` a la URL en `detalle-pedido.component.ts`.
- [ ] Arreglar impresión de ticket: refactor a patrón Swal-botón-imprimir (síncrono al clic) en
      `mis-pedidos.component.ts`, y agregar el mismo botón "Imprimir ticket" en
      `detalle-pedido.component` junto a "Reenviar ticket".
- [ ] Cards: 1 columna en móvil / 3 en PC, arreglar spacing de botones dentro de cada card.
- [ ] `detalle-pedido.component`: cargar el detalle rico (`getDetallePedido`) al abrir, mostrar
      badge de promoción, talla/color, imagen correcta, fecha+hora completa, total, estado
      entregado — para todos los tipos de pedido (aplica lo que corresponda según el tipo).
- [ ] Reenviar ticket: confirmación previa Sí/No con el correo del cliente antes de mostrar el
      input editable (`mis-pedidos.component.ts` y `detalle-pedido.component.ts`).
- [ ] Mostrar fecha+hora completa (no solo fecha) en card, detalle y ticket.

## Respaldo — lógica de impresión de ticket con QR que YA FUNCIONA (no tocar la esencia)

Vive en `src/app/shared/ticket.util.ts` (`generarHtmlTicket`, `imprimirTicket`,
`generarTextoWhatsapp`). Los QR se generan con el servicio público:
`https://api.qrserver.com/v1/create-qr-code/?size=80x80&ecc=L&data={url-codificada}`

Fuentes de las URLs de QR (`qrTienda`, `qrWhatsapp`, `qrFacebook`): se cargan una vez en
`ngOnInit` de cada componente consumidor vía `NegocioService.getContactosPublicos()` y se pasan
como parte de `ITicketData` a `generarHtmlTicket(...)`.

`imprimirTicket(htmlTicket)` abre `window.open('', '_blank', 'width=320,height=650')`, escribe un
documento con estilos térmicos 80mm y dispara `window.print()` cuando todas las imágenes (QRs)
terminan de cargar (`onload`/`onerror` de cada `<img>`). Esta función NO cambia — el fix es
solamente **desde dónde y cuándo se llama** (debe ser síncrono a un clic del usuario, ver punto 1).

## Progreso

- [x] Backend: `fecha_hora_registro` (migración + entidad + 4 puntos de creación de pedido).
- [x] Backend: `fechaHoraRegistro` y `productoId` expuestos en `PedidoDetalleResponse`/`DetalleItemResponse`;
      los 4 queries nativos ahora formatean `fecha_pedido` con hora (`COALESCE` para pedidos viejos).
- [x] Backend: documentado en `CAMBIOS_FRONT.md`. Backend compila (`mvn compile` OK).
- [x] Front: fix URL de imagen rota (`/imagen/v1/` en vez de `/imagen/`).
- [x] Front: fix popup bloqueado al imprimir ticket (Swal con botón "🖨️ Imprimir ticket",
      `imprimirTicket()` ahora siempre se llama en el `.then()` inmediato de ese botón).
- [x] Front: cards 1 columna en móvil / 3 en PC; botones de solo-ícono (ticket/correo) con
      tamaño fijo para no amontonarse junto a los botones de texto.
- [x] Front: `detalle-pedido` ahora carga el detalle rico (`getDetallePedido`) al abrir — muestra
      badge de promoción, talla/color, imagen correcta, fecha+hora completa, total y estado para
      todos los tipos de pedido. Se agregó botón "Imprimir ticket" junto a "Reenviar ticket".
- [x] Front: confirmación previa Sí/No con el correo del cliente antes de reenviar ticket (en
      lista y en detalle); si no hay correo o el usuario elige "Usar otro correo", se muestra el
      input editable de siempre.
- [x] Verificado: `mvn compile` (backend) y `ng build` + `tsc --noEmit` (front) sin errores nuevos.

## Pendiente — requiere acción del usuario

**Aplicar la migración SQL en la base de datos `inventario_key_qa`:**
```sql
ALTER TABLE pedidos ADD COLUMN fecha_hora_registro DATETIME NULL;
```
Archivo: `back/proyecto_key/src/main/resources/static/migration_pedido_fecha_hora.sql`.
Sin esto, el backend sigue arrancando bien (la columna es opcional/nullable a nivel de código
hasta que exista en la BD — pero Hibernate fallará al hacer SELECT/INSERT sobre `pedidos` si la
columna no existe físicamente). **Hay que correr este ALTER TABLE antes de desplegar el backend
nuevo.**
