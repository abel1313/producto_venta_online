# Plan de mejoras — Novedades Jade

**Fecha inicio:** 2026-06-30  
**Metodología:** una mejora a la vez, se marca ✅ al terminar back + doc front antes de pasar a la siguiente.

---

## Estado general

| # | Mejora | Back | Front | Fecha |
|---|---|---|---|---|
| 1 | Ticket (impresión HTML) | ✅ No requiere back | ⏳ Pendiente front | — |
| 2 | Envío por correo electrónico | ✅ Listo | ⏳ Pendiente front | 2026-07-01 |
| 3 | Envío por WhatsApp | 🚫 EN PAUSA — ver decisión 2026-07-01 | 🚫 No implementar | 2026-07-01 |
| 4 | Alertas stock bajo al admin | ⏳ Pendiente back | ⏳ Pendiente front | — |
| 5 | Reportes de ventas (día/mes/cliente) | ✅ Listo | ⏳ Pendiente front | 2026-07-02 |
| 6 | Dashboard con métricas | ✅ Listo (sin "clientes nuevos", ver nota) | ⏳ Pendiente front | 2026-07-02 |
| 7 | Devoluciones | ⏳ Pendiente back | ⏳ Pendiente front | — |
| 8 | Chatbot — tarjetas de productos | ✅ Listo | ⏳ Pendiente front | 2026-07-01 |
| 9 | Chatbot — código de barras | ✅ Listo | — | 2026-07-01 |
| 10 | Chatbot — flujo 2 pasos foto | ✅ Listo | — | 2026-07-01 |
| 11 | Filtros producto/variante por rol (cliente: stock+imagen; admin: sin-stock/con-stock/con-imágenes) | ✅ Listo | ⏳ Pendiente front | 2026-07-02 |
| 12 | Correo/teléfono obligatorios en cliente + verificación de correo (código de 6 dígitos) antes de pedidos/ticket por correo | ✅ Listo (migración corrida en dev/qa, falta en prod) | ⏳ Pendiente front | 2026-07-02 |
| 13 | Deshabilitar producto/variante en lote (para ocultar datos de prueba) + habilitado propio por variante | ✅ Listo (columna ya existía en dev/qa, falta confirmar en prod) | ⏳ Pendiente front | 2026-07-02 |
| 14 | Restablecer contraseña olvidada (código de 6 dígitos por correo) + cambiar contraseña logueado (con contraseña actual, sin código) | ✅ Listo (falta correr migración SQL) | ⏳ Pendiente front | 2026-07-03 |
| 15 | Unificar verificación de correo Usuario/Cliente + auto-crear Cliente al registrar | ✅ Código listo (falta compilar/probar + correr migraciones) | ⏳ Pendiente front | 2026-07-03 |

> **Orden:** el ticket (1) va primero porque correo (2) lo necesita.
> El stock bajo (4) necesita correo (2) ya listo en back.
> El dashboard (6) necesita los reportes (5).

> **Checkpoint 2026-07-03 (actualizado):**
> - ✅ Listos en back (falta front): 1 (ticket), 2 (correo), 5 (reportes), 6 (dashboard), 8/9/10 (chatbot),
>   11 (filtros por rol), 12 (correo/teléfono obligatorios + verificación), 13 (deshabilitar en
>   lote + habilitado por variante), 14 (reset de contraseña + cambiar contraseña logueado).
> - 🚫 En pausa: 3 (WhatsApp al cliente).
> - ⏳ Sin arrancar ni back ni front: 4 (stock bajo), 7 (devoluciones).
> - 📄 Documentado, sin implementar: uso de hilos/async para envío de correos — ver
>   `HILOS_Y_CONCURRENCIA.md` (guía completa + qué endpoints conviene tocar y cuáles no).
> - **Migraciones SQL pendientes de correr en prod** (dev/qa ya están al día): 
>   `migration_verificacion_correo.sql`, `migration_habilitado_variantes.sql` (columna ya existía
>   en dev/qa, confirmar en prod primero con `DESCRIBE variantes` — puede que tampoco haga falta),
>   `migration_reset_password.sql`.
> - Sueltos sin cerrar: confirmar migración `monto_dado` en BD de producción; respuesta del front
>   sobre si necesitan `tiendaUrl` desde el back (`GET /v1/negocio/contactos`) o usan `window.location.origin`;
>   decidir qué hacer con las 4 filas "Mochila Prada" duplicadas; BUG-CB-01 pendiente de corrección
>   manual en admin (imagen vinculada al varianteId equivocado).
> - **Dashboard (6) implementado 2026-07-02:** `GET /v1/dashboard/resumen` con ventas
>   hoy/mes, ganancia, gastos, pedidos pendientes de entregar, créditos activos, monto por cobrar,
>   productos con stock bajo. **Se excluyó "clientes nuevos este mes"** del plan original — `Cliente`
>   no tiene columna de fecha de registro, no hay forma de calcularlo sin agregarla (y solo contaría
>   desde que se agregue en adelante, no retroactivo). Avisar si se quiere agregar.
>   Detalle completo en `CAMBIOS_FRONT.md` → "Dashboard con métricas (2026-07-02)".
> - **Bug reportado 2026-07-02 — DIAGNOSTICADO, no es bug de código:** verificado en vivo contra
>   QA (`GET /v1/chatbot/buscar?q=Mochila`) — la búsqueda y paginación del chatbot funcionan bien,
>   devuelven `varianteId` distintos (117, 165, 213, 277 para "Mochila Prada"). El problema es que
>   esas 4 filas en la tabla `variantes` son **duplicados de datos**: mismo nombre, marca, precio,
>   sin talla/color que las distinga — por eso se ven como "el mismo producto". Además las 4 dan
>   error 500 al pedir sus imágenes (`variantes/v1/imagenes/{id}`), probablemente ninguna tiene
>   imagen real cargada. **Pendiente:** decidir qué hacer con las filas duplicadas (limpiar en admin
>   o pedir un script de limpieza) — no se tocó la BD, es una decisión del negocio, no técnica.
>   De paso se corrigieron 2 errores de documentación en `CAMBIOS_FRONT.md` (F-8): la URL tenía el
>   `/v1/` mal puesto, y decía "tomar el primer elemento" en vez de "el marcado como `principal`".
> - **BUG-CB-01 corregido 2026-07-02 (causa real encontrada, no era dato de BD):** el prompt del
>   chatbot le decía a la IA que usara el NOMBRE del producto para buscar la imagen, incluso cuando
>   el producto ya se había identificado por código de barras — como el nombre se repite entre
>   productos distintos ("Mochila para mostrar" vs "Mochila Prada"), la búsqueda traía cualquiera
>   de los dos. Se corrigió el prompt para que use el código de barras (único) cuando esté
>   disponible en la conversación. Ver `BUGS_CHATBOT_BACK.md` para el detalle completo.
> - **Filtros producto/variante por rol (2026-07-02):** cliente normal ahora ve solo productos y
>   variantes con stock>0 + habilitado + con al menos una imagen (antes solo se exigía stock +
>   habilitado, sin importar si tenía imagen). Admin ve todo el catálogo y tiene un endpoint nuevo
>   de filtro (`SIN_STOCK` / `CON_STOCK` / `CON_IMAGENES` / `CON_STOCK_Y_IMAGENES`). Ver
>   `CAMBIOS_FRONT.md` para el contrato completo. De paso se corrigió un bug de caché en
>   `VarianteServiceImpl` que exponía a clientes normales resultados sin filtrar cacheados
>   previamente por un admin.
> - **PENDIENTE (no bloquea nada, anotado para retomar):** definir fórmula de ganancia por
>   producto — se acordó usar markup sobre costo (`precioVenta = precioCosto × (1 + %ganancia)`).
>   Falta decidir: ¿se guarda el `%ganancia` como campo del producto (para poder mostrarlo/editarlo
>   directo), o se calcula al vuelo en un reporte (`(precioVenta - precioCosto) / precioCosto`) sin
>   guardar nada nuevo en BD? Ninguna de las dos está implementada todavía.
> - **Mejora 12 — Correo/teléfono obligatorios + verificación de correo (2026-07-02):**
>   `Cliente.correoElectronico`/`numeroTelefonico` ahora obligatorios; nuevo flujo de código de 6
>   dígitos por correo (`POST /v1/clientes/{id}/enviar-codigo-verificacion` y `verificar-correo`)
>   que bloquea generar pedido (`savePedido`) y el envío automático de ticket por correo si el
>   cliente no está verificado (no aplica al correo manual del modal post-venta ni a venta directa
>   sin cuenta). `POST /v1/auth/registrar` ahora exige `email` (DTO nuevo `RegistroRequest`, separado
>   de `AuthRequest` para no romper `/auth/login`). Se decidió **no** usar Twilio/WhatsApp para
>   verificar el teléfono — sale muy caro (~$1.13 MXN por verificación vs ~$0.35 MXN por ticket
>   suelto) y el correo (gratis, ya con SMTP) cubre la necesidad real. Migración
>   `migration_verificacion_correo.sql` **ya corrida en dev y qa** (2026-07-02), **pendiente en
>   prod** para cuando se suba esa rama. Detalle completo para el front en `CAMBIOS_FRONT.md` →
>   "Verificación de correo del cliente (2026-07-02)" (4 subsecciones: obligatoriedad, flujo de
>   verificación, estado visible en búsqueda de clientes, endpoint de reset para pruebas).
> - **Rate-limit configurable, desactivado en QA (2026-07-02):** nueva propiedad
>   `seguridad.rate-limit-habilitado` (default `true`) controla los 3 bloqueos por IP/usuario de
>   `/auth/login` y `/auth/registrar`. Se puso en `false` solo en `application-qa.yml` para no
>   trabarse en pruebas manuales repetidas — dev y prod siguen protegidos (no tienen la propiedad,
>   toman el default `true`). No aplica al bloqueo de IP del chatbot, que es un mecanismo aparte
>   (`ChatbotController`/`blockService`) y sigue activo en todos los ambientes.
> - **Bug reportado 2026-07-02 — carrito con datos de otra cuenta tras logout/login — ES DEL
>   FRONT, ya corregido por el front:** se confirmó que el back no tiene ningún concepto de
>   "carrito" (no hay entidad/tabla/controlador — el pedido se arma completo en un solo request a
>   `savePedido`). El carrito vivía en `localStorage`/`sessionStorage` del navegador sin limpiarse
>   al cerrar sesión (mismo patrón que el bug ya resuelto de `sesionId` del chat). El front ya lo
>   solucionó, no requirió cambios en este repo.
> - **PENDIENTE (2026-07-03, sin arrancar) — usar hilos para envíos de correo/notificaciones:**
>   se detectó que `EmailService` (tickets, códigos de verificación, reset de contraseña) corre
>   síncrono en el hilo del request — si el SMTP tarda, el usuario espera hasta el timeout (5s en
>   QA). Guía completa de cómo implementarlo (conceptos de hilos, `@Async`, `CompletableFuture`,
>   virtual threads) y auditoría de qué endpoints conviene tocar (y cuáles NO) en
>   `HILOS_Y_CONCURRENCIA.md`. Nada implementado todavía, solo documentado para retomar.

> **Decisión 2026-07-01 — WhatsApp EN PAUSA:** se descartó implementar el envío del ticket por
> WhatsApp al cliente. CallMeBot (gratis, ya programado en el back) solo le avisa al negocio, no
> al cliente; Twilio (que sí notificaría al cliente real) implica alta de cuenta de pago,
> verificación de número de WhatsApp Business y programar el caso `"twilio"` en
> `WhatsappService.java` — se consideró mucho esfuerzo para el beneficio. **Solo se implementa
> correo.** El código de WhatsApp en el back queda tal cual (no estorba, simplemente no se usa) y
> el front NO debe agregar el checkbox ni el campo de WhatsApp.

---

## Lo que se hizo — sesión 2026-07-01

### Back ✅ completado

| Qué | Archivo(s) |
|---|---|
| Chatbot busca por código de barras | `IVarianteRepository.java`, `ChatbotService.java` |
| Chatbot devuelve tarjetas `productos[]` cuando el AI usa `##BUSCAR[...]##` | `ChatbotController.java`, `ChatbotService.java` |
| Endpoint `GET /v1/chatbot/buscar?q=&offset=` para "ver más" sin IA | `ChatbotController.java` |
| System prompt: flujo 2 pasos — bot pregunta "¿quieres ver foto?" antes de mostrar | `ChatbotService.java` |
| `EmailService` — envía HTML por SMTP OVH (ya configurado) | `EmailService.java` |
| `WhatsappService` — envía texto por CallMeBot (apikey en yml) | `WhatsappService.java` |
| `NotificacionRequest` — DTO compartido con `enviarCorreo`, `enviarWhatsapp`, `ticketHtml`, `ticketTexto` | `NotificacionRequest.java` |
| `AbonoRequest` — campo `notificacion` opcional | `AbonoRequest.java` |
| `AbonoResponse` — campos `correoEnviado`, `whatsappEnviado`, `erroresEnvio` | `AbonoResponse.java` |
| `CancelarAbonoRequest` — campo `notificacion` opcional | `CancelarAbonoRequest.java` |
| `CancelarAbonoResponse` — campos de resultado de notificación | `CancelarAbonoResponse.java` |
| `VentaDirectaRequest` — campo `notificacion` opcional | `VentaDirectaRequest.java` |
| `VentaDirectaResponse` — campos de resultado de notificación | `VentaDirectaResponse.java` |
| `AbonoServiceImpl` — llama email/WhatsApp tras registrar abono o cancelar | `AbonoServiceImpl.java` |
| `VentaServiceImpl` — llama email/WhatsApp tras venta directa o registro crédito | `VentaServiceImpl.java` |
| `GET /v1/negocio/contactos` (público, nuevo) — siempre expone `whatsappUrl`/`facebookUrl` para el QR del ticket, a diferencia de `/estado` que los oculta con negocio abierto | `NegocioController.java`, `NegocioService.java`, `ContactosPublicosDto.java`, `SecurityConfig.java` |
| Reportes de ventas — diario, mensual (desglosado por día), por cliente, productos más vendidos (2026-07-02) | `ReporteVentasController.java`, `ReporteVentasServiceImpl.java`, `IReporteVentasService.java`, DTOs en `models/reportes/`, `IVentaRepository.java`, `IDetalleVentaVarianteRepository.java`, `SecurityConfig.java` |
| `GET /v1/dashboard/resumen` — ventas hoy/mes, ganancia, gastos, pendientes de entregar, créditos activos, monto por cobrar, stock bajo (2026-07-02) | `DashboardController.java`, `DashboardServiceImpl.java`, `IDashboardService.java`, `DashboardResumenDto.java`, `IPedidoRepository.java`, `IVarianteRepository.java`, `SecurityConfig.java` |
| Fix BUG-CB-02 (500 en imágenes huérfanas) + BUG-CB-03 (campos `descripcion`/`codigoBarras` en chatbot) (2026-07-02) | `VarianteServiceImpl.java`, `VarianteController.java`, `ChatbotService.java` |
| Fix BUG-CB-01 real: prompt del chatbot usaba nombre ambiguo en vez de código de barras para re-buscar imagen (2026-07-02) | `ChatbotService.java` |
| Fix bug de caché: varias búsquedas de variantes cacheaban sin incluir el rol, exponiendo a clientes normales resultados sin filtrar que un admin había cacheado antes (2026-07-02) | `VarianteServiceImpl.java` |
| Filtros producto/variante por rol: cliente normal solo ve stock>0 + habilitado + con imagen; nuevo endpoint admin `.../admin/filtrar?filtro=SIN_STOCK\|CON_STOCK\|CON_IMAGENES\|CON_STOCK_Y_IMAGENES` paginado, ve todo el catálogo (2026-07-02) | `IProductosRepository.java`, `IVarianteRepository.java`, `ProductosServiceImpl.java`, `VarianteServiceImpl.java`, `ProductosControllerImpl.java`, `VarianteController.java`, `FiltroCatalogoEnum.java` |

### Front ⏳ pendiente (ver `CAMBIOS_FRONT.md` para detalle completo)

| # | Tarea | Pantalla(s) | Sección en CAMBIOS_FRONT.md |
|---|---|---|---|
| F-1 | Generar HTML del ticket con `generarHtmlTicket()` | Todas | "Ticket / Comprobante — implementación FRONT" |
| F-2 | Botón 🖨️ imprimir con `window.print()` | Venta directa, abonos, cancelación | Misma sección |
| F-3 | Checkbox de correo (NO marcado por default; solo visible si cliente tiene correo. Sin correo → modal post-venta) | Venta directa, abonos, cancelación | Misma sección |
| F-4 | Agregar `notificacion: { enviarCorreo, ticketHtml }` al request (sin `enviarWhatsapp`/`ticketTexto`) | POST venta, POST abono, PUT cancelar | Misma sección |
| F-5 | Mostrar resultado: "Correo enviado ✅" | Toast/modal de confirmación | Misma sección |
| F-6 | Tarjetas de producto en el chatbot (render `productos[]`) | Chatbot | "Chatbot — Tarjetas de productos" |
| F-7 | Botón "Ver más" en chatbot (`GET /v1/chatbot/buscar?q=&offset=`) | Chatbot | Misma sección |
| F-8 | Imagen por tarjeta (`GET /variantes/v1/imagenes/{varianteId}`, elemento con `principal:true`) — ⚠️ URL y "primer elemento" corregidos 2026-07-02, ver CAMBIOS_FRONT.md | Chatbot | Misma sección |
| F-9 | QR al sitio de la tienda en el ticket (URL fija desde `environment.ts`) | Venta directa, abonos, cancelación | "QRs del ticket (2026-07-01)" |
| F-10 | QR WhatsApp del negocio — solo si `whatsappUrl` existe en `GET /v1/negocio/contactos` | Venta directa, abonos, cancelación | Misma sección |
| F-11 | QR Facebook del negocio — solo si `facebookUrl` existe en `GET /v1/negocio/contactos` | Venta directa, abonos, cancelación | Misma sección |
| F-12 | Pantalla de reportes (diario, mensual con gráfica por día, por cliente, productos más vendidos) | Nueva pantalla `/reportes`, solo ADMIN | "Reportes de ventas (2026-07-02)" |
| F-13 | Pantalla de dashboard (`GET /v1/dashboard/resumen`, 9 cards de métricas) | Nueva pantalla `/dashboard`, solo ADMIN | "Dashboard con métricas (2026-07-02)" |
| F-14 | Filtros de admin en catálogo de productos/variantes (dropdown: Sin stock / Con stock / Con imágenes / Con stock y con imágenes) usando `.../admin/filtrar?filtro=...`. Cliente normal NO necesita UI nueva — el listado normal ya viene filtrado por el back. | Panel admin — productos y variantes | "Filtros producto/variante por rol (2026-07-02)" |
| F-15 | Correo/teléfono obligatorios al crear/editar cliente + pantalla de verificación de correo (input de 6 dígitos, botón reenviar) antes de dejar generar un pedido | Alta de cliente / cuenta online, previo a carrito-pedido | "Verificación de correo del cliente (2026-07-02)" |
| F-16 | Selección múltiple (checkboxes) en la lista paginada de productos/variantes del panel admin + botón "deshabilitar seleccionados" que llame `admin/habilitar-lote` con los IDs marcados | Panel admin — productos y variantes | "Deshabilitar productos/variantes en lote (2026-07-02)" |
| F-17 | Pantalla "olvidé mi contraseña": input de correo → input de código de 6 dígitos + nueva contraseña (mismo formulario, se revela el segundo campo cuando terminan de escribir el código) | Login, link "olvidé mi contraseña" | "Restablecer contraseña olvidada (2026-07-03)" |
| F-18 | Formulario "cambiar contraseña" (contraseña actual + nueva) usando `PUT /v1/auth/cambiar-password` — requiere sesión, no pide código | Pantalla de perfil/mi cuenta | "Cambiar contraseña estando logueado (2026-07-03)" |
| F-19 | ⚠️ NO EMPEZAR TODAVÍA — back escrito pero sin compilar/probar/desplegar. Cuando esté en QA: pantalla de "ingresa el código" tras registrarse (bloquea login hasta verificar), pantalla de "completa tus datos" en el primer pedido, aviso de "revisa tu correo nuevo" al editar cliente y cambiar el correo, pantalla de verificación forzada en el próximo login de usuarios ya existentes, y opcional pantalla de soporte en panel admin (reenviar código / capturar código dictado — ya funciona con los endpoints existentes de Cliente) | Registro, primer pedido, editar cliente, login, panel admin | `CAMBIOS_FRONT.md` → "Unificar verificación de correo Usuario/Cliente (2026-07-03)" |

> **Decisión 2026-07-01 — F-10/F-11:** los QR de WhatsApp y Facebook se muestran en el ticket
> SOLO si el negocio tiene esos datos configurados en `GET /v1/negocio/contactos`. Si no hay URL
> configurada, el QR simplemente no aparece. F-9 (QR de la tienda) siempre aparece.
> F-9/F-10/F-11 **desbloqueadas** — proceder con la implementación.

> **Decisión 2026-07-01 — F-3 (correo):** checkbox NO se marca por default aunque el cliente
> tenga correo. Flujo:
> - Cliente **tiene correo** → aparece el checkbox desmarcado → admin lo puede marcar antes de cobrar.
> - Cliente **no tiene correo** → NO aparece el checkbox. Después de completar la venta/abono,
    >   se muestra un modal/Swal preguntando "¿Enviar ticket por correo?" con un input para escribir
    >   el correo; al confirmar se envía (POST separado o campo en el Swal).

> **Dudas anotadas — RESPONDIDAS 2026-07-01 (ver detalle al final del documento en
> "Respuestas a las dudas anotadas"):** D-01 (correo/teléfono obligatorios), D-02 (campo `correo`
> en `NotificacionRequest` — ✅ ya agregado al back), D-03 (QR F-10/F-11 — ya resuelto arriba).

### Configuración pendiente en servidor (QA y producción)

| Variable de entorno | Valor | Para qué | Estado |
|---|---|---|---|
| `WHATSAPP_PROVEEDOR` | `callmebot` | Activar envío WhatsApp | 🚫 No aplica — WhatsApp en pausa (ver decisión arriba) |
| `WHATSAPP_APIKEY` | (API key de CallMeBot) | Autenticación CallMeBot | 🚫 No aplica — no se va a usar |
| `MAIL_USERNAME` | `qa.boutique.bolsas@novedades-jade.com.mx` | Ya en dev, verificar en prod | ✅ Ya activo (lo usa el chat) |
| `MAIL_PASSWORD` | (contraseña OVH) | Ya en dev, verificar en prod | ✅ Ya activo (lo usa el chat) |

> **2026-07-01:** el bloque `whatsapp:` faltaba en `application-qa.yml` y `application-docker.yml`
> (solo estaba en dev) — ya se agregó por si algún día se retoma, pero **no hace falta setear
> `WHATSAPP_APIKEY` en k8s** porque se decidió no implementar el envío por WhatsApp al cliente
> (ver "Decisión 2026-07-01 — WhatsApp EN PAUSA" arriba). Con `MAIL_USERNAME`/`MAIL_PASSWORD` ya
> activos, el envío de tickets por correo debería funcionar en QA y prod sin más configuración.

#### Cómo obtener el `WHATSAPP_APIKEY` de CallMeBot (gratis, pero limitado)

CallMeBot no manda mensajes "a nombre del negocio" a cualquier número. La clave se genera
para UN número que primero se **auto-activa** para recibir mensajes de ese bot:

1. Desde el WhatsApp del número que va a **recibir** los mensajes (ej. el WhatsApp del negocio),
   agregar como contacto el número oficial de CallMeBot (verificar el número vigente en
   callmebot.com antes de usarlo, puede cambiar).
2. Mandarle un mensaje con el texto exacto: `I allow callmebot to send me messages`.
3. El bot responde en segundos/minutos con un mensaje tipo:
   `"API Activated for your phone number. Your APIKEY is 123456"`.
4. Ese número (`123456` en el ejemplo) es el valor de `WHATSAPP_APIKEY`.

> **Limitación importante:** ese apikey solo sirve para mandar mensajes A ESE número que se
> activó — no sirve para mandarle el ticket a un cliente distinto. Cada cliente tendría que
> activar el suyo. Por ahora esto solo es viable para que **el negocio reciba una copia** del
> ticket en su propio WhatsApp, no para notificar a clientes reales. Si se necesita mandar a
> clientes arbitrarios sin que se den de alta, hay que migrar a Twilio WhatsApp Business API
> (de pago, sin esta restricción) — el switch `whatsapp.proveedor` ya está pensado para eso,
> pero el caso `twilio` no está implementado todavía en `WhatsappService.java`.

#### ✅ RESUELTO 2026-07-01 — Se descartó WhatsApp al cliente, solo correo (ver decisión arriba)

Queda documentado abajo el análisis que se hizo para decidir, por si se retoma más adelante.

**CallMeBot (ya implementado, gratis, $0 código extra):**
1. Una sola vez: el negocio agrega el contacto de CallMeBot y le manda
   `I allow callmebot to send me messages` → CallMeBot devuelve un `apikey` ligado a **ese número**.
2. Ese `apikey` se guarda como `WHATSAPP_APIKEY`.
3. Cuando un cliente compra, el back llama a CallMeBot con `phone = número del negocio` (el que se
   activó) y ese mismo `apikey`.
4. El mensaje llega **al WhatsApp del negocio**, no al del cliente. El cliente nunca recibe nada
   por WhatsApp con este método — sirve como alerta interna de venta/abono, no como notificación
   al comprador.

**Twilio WhatsApp Business API (NO implementado, de pago, requiere código nuevo):**
1. Alta de cuenta en Twilio (con tarjeta de pago) y activar el producto WhatsApp.
2. Sandbox gratis para pruebas; para producción real hay que registrar un número de WhatsApp
   Business propio ante Meta (verificación que tarda días).
3. Regla de WhatsApp (no de Twilio): solo se puede mandar texto libre si el cliente escribió
   primero en las últimas 24h; si no, hay que usar una "plantilla" pre-aprobada por Meta
   (ej. `"Tu ticket de compra folio {{1}} por {{2}} está listo"`), y aprobar plantillas nuevas
   también tarda.
4. Con la cuenta lista, el back llama a Twilio con `to = número del cliente`,
   `from = número de WhatsApp Business del negocio` → **sí llega al cliente**, sin que el cliente
   tenga que activar nada antes.
5. Costo: centavos de dólar por mensaje, facturación mensual.
6. Esfuerzo: programar el caso `"twilio"` en `WhatsappService.java` (llamada a la API/SDK de
   Twilio) — no es complicado pero es código nuevo, hoy no existe.

**En una frase:** CallMeBot = alerta para el negocio, gratis, ya funciona. Twilio = mensaje real
al cliente, de pago, requiere alta de cuenta + verificación + código nuevo.

**Decisión final:** se quita WhatsApp por ahora, solo correo (que sí funciona para cualquier
destinatario sin activación previa). Ver "Decisión 2026-07-01 — WhatsApp EN PAUSA" al inicio del documento.

#### Comandos para setear las env vars (una vez que se tenga el apikey)

```bash
# QA
kubectl set env deployment/proyecto-key-deployment \
  WHATSAPP_PROVEEDOR=callmebot \
  WHATSAPP_APIKEY=<apikey_obtenido> \
  WHATSAPP_COUNTRY_CODE=52 \
  -n qa
kubectl rollout restart deployment/proyecto-key-deployment -n qa

# Prod
kubectl set env deployment/proyecto-key-deployment \
  WHATSAPP_PROVEEDOR=callmebot \
  WHATSAPP_APIKEY=<apikey_obtenido> \
  WHATSAPP_COUNTRY_CODE=52 \
  -n default
kubectl rollout restart deployment/proyecto-key-deployment -n default
```

---

## Flujo general de ticket + notificaciones

> Esta sección describe el flujo UX completo ANTES de implementar cualquier ítem.
> Los ítems 1, 2 y 3 comparten este diseño.

### ¿A quién se envía?
- **Al cliente** — el ticket de lo que hizo (compra, abono, cancelación, liquidación)
- **Al admin** — solo para alertas de stock bajo (mejora 4), no para tickets de venta

### ¿Cuándo se muestran los checkboxes?
En TODAS las pantallas donde el cliente o admin confirma una acción que genera comprobante:

| Pantalla | Evento | Checkboxes |
|---|---|---|
| Venta directa | Al hacer click en "Cobrar" | ✅ |
| Abonos | Al registrar un abono | ✅ |
| Pedidos (crédito liquidado) | Al registrar el último abono | ✅ |
| Pedidos (cancelación) | Al cancelar APARTADO o FIADO | ✅ |
| Carrito cliente | Al generar pedido | ✅ |

### ¿Qué checkboxes aparecen?

```
┌─────────────────────────────────────────────────┐
│  ¿Deseas recibir el comprobante?                │
│                                                 │
│  [ ] 📧 Por correo electrónico                  │
│         cliente@ejemplo.com  [editar]           │
│                                                 │
│  [ ] 💬 Por WhatsApp                            │
│         55 1234 5678  [editar]                  │
│                                                 │
│  Si ambos están marcados → se envía por los dos │
└─────────────────────────────────────────────────┘
```

### Reglas de los checkboxes (actualizado 2026-07-01)

- Si el cliente tiene **correo registrado** → aparece el checkbox **desmarcado** (el admin decide si enviarlo)
- Si el cliente **no tiene correo** → el checkbox NO aparece. Después de la venta/abono aparece un modal/Swal con input para escribir el correo manualmente
- Si es `clienteSinRegistro` (nombre manual sin cuenta) → sin checkbox antes de la venta; modal post-venta igual
- WhatsApp **EN PAUSA** — no hay checkbox de WhatsApp ni campo de teléfono para envío
- Si el checkbox está desmarcado → se genera el ticket de todas formas (para imprimir en pantalla), pero no se envía

### Campos que el front manda al back

```typescript
// Se agrega a todos los requests que generan comprobante
notificacion?: {
  enviarCorreo: boolean;
  correo?: string;          // puede diferir del correo registrado
  enviarWhatsapp: boolean;
  telefono?: string;        // puede diferir del teléfono registrado
}
```

### Lo que hace el back al recibir la notificación

```
1. Ejecuta la acción principal (guardar venta / registrar abono / cancelar)
2. Genera el ticket en memoria (texto o PDF)
3. Si notificacion.enviarCorreo === true  → envía email con el ticket
4. Si notificacion.enviarWhatsapp === true → envía WhatsApp con el ticket
5. Devuelve el response normal + ticketPdf (bytes en base64) para que el front lo muestre
```

### Lo que devuelve el back (añadido al response normal)

```json
{
  "data": {
    ...campos normales de la respuesta...,
    "ticket": {
      "pdf": "base64...",           // para abrir/imprimir en el front
      "correoEnviado": true,
      "whatsappEnviado": false,
      "errores": []                 // si falló algún envío, aquí va el motivo
    }
  }
}
```

### Flujo visual en el front (paso a paso)

```
1. Admin llena el formulario (venta directa / abono / etc.)

2. Antes del botón "Confirmar" aparecen los 2 checkboxes
   con los datos del cliente pre-llenados si los tiene

3. Admin hace click en "Confirmar"

4. Front manda el request con el objeto notificacion incluido

5. Back procesa y devuelve response + ticket.pdf en base64

6. Front muestra:
   a. Toast de éxito ("Venta registrada / Abono registrado")
   b. Si correoEnviado → "📧 Ticket enviado a correo@ejemplo.com"
   c. Si whatsappEnviado → "💬 Ticket enviado por WhatsApp"
   d. Botón "🖨️ Imprimir ticket" → abre el PDF en nueva pestaña
```

---

## 1. Ticket de venta / abono / cancelación

> Ver sección "Flujo general" arriba para el diseño UX completo.
> Este ítem es la base — sin el ticket no hay qué enviar por correo ni WhatsApp.

**Qué genera:** un comprobante con todo lo que hizo el cliente, listo para imprimir o enviar.

### Tipos de ticket

**A) Ticket de venta directa (contado)**
```
NOVEDADES JADE
Fecha: 01/07/2026  14:30
Cliente: María López
----------------------------
1x Pantalón negro M          $350.00
1x Blusa floral S            $180.00
----------------------------
TOTAL                        $530.00
MÉTODO: EFECTIVO
ENTREGÓ:                     $600.00
CAMBIO:                       $70.00
============================
[QR → link tienda]
```

**B) Ticket de abono (crédito)**
```
NOVEDADES JADE — COMPROBANTE DE ABONO
Fecha: 01/07/2026
Cliente: María López
APARTADO #42
----------------------------
Pantalón clásico negro M
Total apartado:              $350.00
Ya pagado:                   $100.00
Abono de hoy:                $150.00
Saldo pendiente:             $100.00
----------------------------
MÉTODO: EFECTIVO
ENTREGÓ:                     $200.00
CAMBIO:                       $50.00
============================
[QR → link tienda]
```

**C) Ticket de liquidación (PAGADO)**
```
NOVEDADES JADE — APARTADO LIQUIDADO
Fecha: 01/07/2026
Cliente: María López
----------------------------
Pantalón clásico negro M
Total:                       $350.00
✅ PAGADO COMPLETAMENTE
Fecha recogida: 01/07/2026
============================
[QR → link tienda]
```

**D) Ticket de cancelación**
```
NOVEDADES JADE — CANCELACIÓN
Fecha: 01/07/2026
Cliente: María López
APARTADO #42 — CANCELADO
Motivo: NO SE PRESENTÓ
----------------------------
Saldo a favor cliente:       $100.00
(abonos realizados)
============================
[QR → link tienda]
```

### Tecnología propuesta
- **Opción A (recomendada):** HTML optimizado para impresión → el front hace `window.print()`
    - Sin dependencias en el back, más flexible para el front
    - El back devuelve el HTML como string en el response
- **Opción B:** PDF con `iText 7` o `Apache PDFBox` → bytes en base64
    - Más robusto para guardar/compartir
    - Requiere dependencia en `pom.xml`
- **QR:** librería `ZXing` (Java) — genera el QR con la URL de la tienda

### Lo que necesita el back
- `TicketService.generarTicketVenta(ventaId, notificacion)` → String HTML o byte[]
- `TicketService.generarTicketAbono(abonoId, notificacion)` → String HTML o byte[]
- Config en `application.yml`: `tienda.nombre`, `tienda.url`, `tienda.telefono`
- El ticket se devuelve en `data.ticket.contenido` (base64 o HTML)

### Lo que necesita el front
- Checkboxes de notificación en: venta directa, abonos, cancelación (ver flujo general)
- Botón "🖨️ Imprimir ticket" en el toast de confirmación
- Leer `data.ticket.contenido` y abrir en nueva pestaña o `window.print()`

### Endpoints nuevos
- Ninguno obligatorio — el ticket viaja dentro del response normal de cada acción
- Opcional: `GET /v1/ticket/venta/{id}` y `GET /v1/ticket/abono/{id}` para regenerar un ticket anterior

---

## 2. Envío de ticket por correo electrónico

> Ver sección "Flujo general" arriba para el diseño UX completo.
> Depende de que el ítem 1 (ticket) esté implementado.

### Eventos que generan correo al cliente
- Venta directa confirmada
- Abono registrado
- Pedido liquidado (PAGADO)
- Pedido cancelado

### Eventos que generan correo al admin
- Stock bajo (mejora 4) — independiente del ticket del cliente

### Tecnología
- **Spring Boot Mail** + SMTP OVH (ya configurado en el proyecto)
- Plantilla HTML simple con el contenido del ticket + logo de la tienda

### Lo que necesita el back
- `EmailService.enviarTicket(correo, asunto, ticketHtml)`
- Llamado desde `VentaServiceImpl`, `AbonoServiceImpl` si `notificacion.enviarCorreo === true`
- Sin endpoints nuevos — va embebido en el flujo de cada acción

### Lo que necesita el front
- Los checkboxes de correo (ver flujo general)
- Mostrar `data.ticket.correoEnviado` en el toast

---

## 3. Envío de ticket por WhatsApp

> Ver sección "Flujo general" arriba para el diseño UX completo.
> Depende de que el ítem 1 (ticket) esté implementado.

### Qué se envía
- Texto plano con el resumen (WhatsApp no soporta PDF directo en la API básica)
- Al final: link de la tienda

### Eventos
- Los mismos que el correo (venta, abono, liquidación, cancelación)

### Tecnología propuesta
- **CallMeBot** (gratuito, solo notificaciones salientes) — requiere que el cliente active el número una vez
- **Twilio WhatsApp API** (de pago, más profesional, no requiere activación del cliente)
- **Recomendación:** empezar con CallMeBot para pruebas, migrar a Twilio en producción

### Lo que necesita el back
- `WhatsappService.enviarMensaje(telefono, texto)`
- Cliente HTTP (`WebClient`) hacia la API de CallMeBot o Twilio
- Config en `application.yml`: `whatsapp.apiKey`, `whatsapp.proveedor`

### Lo que necesita el front
- Los checkboxes de WhatsApp (ver flujo general)
- Mostrar `data.ticket.whatsappEnviado` en el toast

---

## 3. Reportes de ventas

**Qué hace:** endpoints para consultar ventas agrupadas por período y por cliente.

### Reportes a implementar
- `GET /v1/reportes/ventas/diario?fecha=YYYY-MM-DD` — total vendido en el día
- `GET /v1/reportes/ventas/mensual?mes=YYYY-MM` — total del mes, desglosado por día
- `GET /v1/reportes/ventas/cliente/{clienteId}` — historial de compras de un cliente
- `GET /v1/reportes/ventas/productos-mas-vendidos?desde=X&hasta=Y` — ranking de productos

### Lo que necesita el back
- `ReporteVentasController` nuevo
- Queries JPQL en `IVentaRepository` agrupando por fecha/cliente/producto
- DTOs para cada reporte

### Lo que necesita el front
- Pantalla de reportes con filtros de fecha
- Tabla + gráfica simple (Chart.js o similar)

---

## 4. Dashboard con métricas en tiempo real

**Qué hace:** pantalla de resumen para el admin con los números más importantes del negocio.

### Métricas propuestas
- Ventas de hoy (total $)
- Ventas de este mes (total $)
- Pedidos pendientes de entregar
- Créditos activos (APARTADO + FIADO) y monto total por cobrar
- Productos con stock bajo (< 5 unidades)
- Clientes nuevos este mes
- Ganancia del mes (ventas - gastos)

### Lo que necesita el back
- `GET /v1/dashboard/resumen` — un solo endpoint con todos los números
- Queries a ventas, pedidos, abonos, gastos, productos

### Lo que necesita el front
- Pantalla `/dashboard` visible solo para ROLE_ADMIN
- Cards con los números
- Actualización automática cada X minutos (o botón recargar)

---

## 5. Alertas de stock bajo

**Qué hace:** avisar al admin cuando el stock de una variante baja de un umbral configurado.

### Cuándo se dispara
- Al guardar una venta que descuenta stock
- Al confirmar un pedido
- Al registrar un abono que liquida un FIADO (el producto ya fue entregado)

### Canales de alerta
- Email al admin (depende de mejora 2)
- WhatsApp al admin (depende de mejora 1)
- Respuesta de la API incluye `alertasStock: [{ varianteId, nombre, stockActual }]`
  para que el front también pueda mostrar un banner

### Lo que necesita el back
- `StockAlertService` con método `verificarYNotificar(varianteId, stockActual)`
- Umbral configurable en `application.yml` (default: 5 unidades)
- Llamar al verificar en cada operación que descuente stock

### Lo que necesita el front
- Banner o notificación en la pantalla del admin al recibir `alertasStock` en el response
- Pantalla de "Alertas de inventario" (opcional, puede verse en Dashboard)

---

## 6. Devoluciones

**Qué hace:** registrar que un cliente devolvió un producto y gestionar el reembolso o crédito a favor.

### Casos de uso
- Cliente devuelve artículo de una venta ya entregada
- Se devuelve el stock a la variante
- Se registra el motivo y si se reembolsa (efectivo, transferencia) o queda como crédito para otra compra

### Reglas de negocio por definir
- ¿Cuántos días tiene el cliente para devolver?
- ¿Se devuelve el dinero o solo crédito en tienda?
- ¿Se puede devolver parte del pedido o todo completo?

### Lo que necesita el back
- Entidad `Devolucion` (ventaId, varianteId, cantidad, motivo, tipoReembolso, fecha)
- `POST /v1/devoluciones` — registra la devolución y devuelve stock
- `GET /v1/devoluciones/reporte` — listado de devoluciones
- DDL: tabla `devoluciones`

### Lo que necesita el front
- Botón "Registrar devolución" en el detalle de una venta entregada
- Formulario: artículo, cantidad, motivo, tipo de reembolso
- Listado de devoluciones para el admin

---

## Notas generales

- **Orden recomendado:** 1 → 2 → 5 (notificaciones primero porque el stock bajo las usa) → 3 → 4 → 6
- Cada mejora se termina completa (back + doc front) antes de pasar a la siguiente
- Los commits siguen el flujo: dev → qa → main
- Las dudas del front se anotan al final de este documento o en `DOCUMENTO_BACK_VENTAS_CREDITO.md` según corresponda

---

## 7. Ticket de venta (PDF / impresión térmica) con QR

**Qué hace:** generar un ticket listo para imprimir o mostrar en pantalla con el resumen
completo de la compra y un código QR con el link de la tienda al final.

### Contenido del ticket

```
============================
      NOVEDADES JADE
============================
Fecha: 30/06/2026  12:35 hrs
Vendedor: Admin
Cliente: María López
----------------------------
ARTÍCULOS
----------------------------
1x Pantalón clásico negro M    $350.00
1x Blusa floral talla S        $180.00
----------------------------
SUBTOTAL                       $530.00
----------------------------
MÉTODO DE PAGO: EFECTIVO
MONTO RECIBIDO:                $600.00
CAMBIO:                         $70.00
============================
   ¡Gracias por su compra!
   Vuelva pronto 😊

   [QR con link de la tienda]
   novedadesjadelink.com
============================
```

### Casos de uso
- Venta directa al contado → ticket inmediato al confirmar
- Abono de crédito → ticket del abono (monto pagado, saldo restante)
- Pedido liquidado (PAGADO) → ticket de liquidación

### Ticket de abono (crédito)
```
============================
      NOVEDADES JADE
============================
COMPROBANTE DE ABONO
Fecha: 30/06/2026
Cliente: María López
----------------------------
APARTADO #42
Pantalón clásico negro M
Total del apartado:    $350.00
Pagos anteriores:      $100.00
Abono de hoy:          $150.00
Saldo pendiente:       $100.00
----------------------------
MÉTODO: EFECTIVO
MONTO RECIBIDO:        $200.00
CAMBIO:                 $50.00
============================
   [QR con link de la tienda]
============================
```

### Tecnología propuesta
- **Back:** generar PDF con `iText` o `Apache PDFBox` (Java)
  → endpoint `GET /v1/ticket/venta/{ventaId}` devuelve PDF (bytes)
  → endpoint `GET /v1/ticket/abono/{abonoId}` devuelve PDF (bytes)
- **QR:** librería `ZXing` (ya muy común en Spring Boot) — genera el QR con la URL de la tienda
- **URL de la tienda:** configurable en `application.yml` (para cambiar sin recompilar)
- **Alternativa ligera:** generar HTML optimizado para impresión térmica (58mm o 80mm)
  → el front abre una ventana con `window.print()` — sin dependencias de PDF en el back

### Lo que necesita el back
- Dependencia iText o ZXing en `pom.xml`
- `TicketService` con métodos `generarTicketVenta(ventaId)` y `generarTicketAbono(abonoId)`
- `TicketController` con endpoints que devuelven `application/pdf`
- Config en yml: `tienda.url`, `tienda.nombre`, `tienda.telefono`

### Lo que necesita el front
- Botón "🧾 Imprimir ticket" en:
    - Pantalla de confirmación de venta directa
    - Pantalla de abonos tras registrar un pago
    - Detalle de pedido PAGADO
- Al hacer click → `GET /v1/ticket/venta/{id}` → abrir PDF en nueva pestaña o `window.print()`

### Notas
- El QR apunta a la URL pública de la tienda (no a un pedido específico por privacidad)
- Si se prefiere impresora térmica (ticket físico), el HTML es mejor que el PDF
- El `montoDado` y `cambio` ya están implementados en el back (NF-3) — el ticket los usa directamente

---

## Respuestas a las dudas anotadas (2026-07-01)

### D-01 — ¿Correo/teléfono obligatorios en el alta de usuario/cliente?

**Revisado el back para responder con datos reales, no opinión:**
- `AuthRequest` (alta de usuario, `/v1/auth/registrar`): el campo `email` tiene `@Email` (valida
  formato SI viene) pero **NO tiene `@NotBlank`** — el back no lo exige. No existe campo teléfono
  en el registro de usuario.
- `Cliente` (entidad): `correoElectronico` y `numeroTelefonico` son columnas simples, sin ninguna
  anotación de validación (`@NotBlank`/`@Email`/`@NotNull`) — el back tampoco los exige ahí.

**Recomendación: dejarlos como están (opcionales), no agregar `Validators.required` en el front.**
Razón: como ya se diseñó el modal post-venta para pedir el correo cuando falta, hacerlos
obligatorios en el alta sería redundante — obligarías a capturar un dato en un momento (alta de
cliente) que ya tiene una red de seguridad más adelante (el modal), y frenarías altas rápidas de
clientes sin correo/teléfono a mano (común en ventas de mostrador). Si más adelante se quiere
teléfono también capturado, hay que agregar el campo primero a `Usuario`/`AuthRequest` — hoy no
existe ni en el modelo de alta de usuario.

### D-02 — Campo `correo` en `NotificacionRequest` para el modal post-venta

**Ya implementado en el back (2026-07-01).** Se agregó el campo a
`NotificacionRequest.java`:

```json
{
  "notificacion": {
    "enviarCorreo": true,
    "ticketHtml": "<html>...</html>",
    "correo": "escrito-en-el-modal@ejemplo.com"
  }
}
```

- Si `correo` viene con valor → el back lo usa como destino del email en vez del correo
  registrado en BD (o en vez de "" si el cliente no tiene ninguno).
- Si `correo` viene vacío/null → se usa el correo registrado en BD, como antes (sin cambios de
  comportamiento para el flujo normal).
- Aplica en los 3 flujos: `POST /v1/ventas/save`, `POST /v1/abonos/{pedidoId}`,
  `PUT /v1/abonos/{pedidoId}/cancelar`.
- **No hizo falta el endpoint alternativo** `POST /v1/ventas/{id}/notificar` — se resuelve todo
  en el mismo request de la acción principal, más simple para el front (un solo request, no dos).
- Archivos tocados: `NotificacionRequest.java`, `AbonoServiceImpl.java`, `VentaServiceImpl.java`.

### D-03 — QR F-10/F-11, confirmación pendiente

Ya resuelto en la sección "Decisión 2026-07-01 — F-10/F-11" más arriba (línea ~76): los QR de
WhatsApp y Facebook se muestran solo si `GET /v1/negocio/contactos` trae esa URL; si no, el QR
simplemente no aparece. F-9/F-10/F-11 quedaron desbloqueadas — no hay nada más pendiente aquí.


### Análisis del front (2026-07-02) — qué es nuevo y dónde va cada cosa

Lo único nuevo real es **F-12**: pantalla de reportes de ventas (el back está listo desde
2026-07-02). Las demás cosas del plan (tickets, correo, QRs) ya estaban implementadas en
sesiones anteriores.

**Archivos que se van a crear/modificar:**

| Archivo | Qué |
|---|---|
| `src/app/reportes/service/reportes.service.ts` | Nuevo — 4 endpoints |
| `src/app/reportes/reportes.component.*` | Nuevo — UI con 4 pestañas (Diario / Mensual / Por cliente / Más vendidos) |
| `src/app/reportes/reportes.module.ts` + routing | Nuevos — módulo lazy |
| `src/app/app-routing.module.ts` | Agregar ruta `/reportes` con guard admin |
| `src/app/navbar/navbar.component.html` | Link "📊 Reportes" solo admin |

### Duda del front — Chart.js directo vs `ng2-charts` — RESPONDIDA 2026-07-02

**Contexto:** `chart.js` v4 ya está instalado, `ng2-charts` (wrapper Angular) no. Dos opciones
para la gráfica de barras del reporte mensual (ventas por día):
1. Chart.js directo con `@ViewChild` sobre un `<canvas>` — sin instalar nada nuevo.
2. Instalar `ng2-charts` — más declarativo en el template.

**Respuesta: instalar `ng2-charts`.**

**⚠️ Corrección 2026-07-02:** la razón original decía que el dashboard (ítem 6) iba a necesitar
"varias gráficas más" — eso no se cumplió. Ya se implementó el dashboard
(`GET /v1/dashboard/resumen`) y es solo números sueltos en cards (ventas hoy, stock bajo, etc.),
sin ninguna serie de datos que graficar. La única gráfica real que existe hoy en todo el plan es
la del reporte mensual (`porDia[]`).

**Razón real para instalar `ng2-charts`:** aunque sea una sola gráfica, es un wrapper delgado y
bien mantenido sobre el mismo `chart.js` que ya tienen instalado (compatible con v4,
`ng2-charts` v5+), más declarativo que manejar el `<canvas>` a mano con `@ViewChild`. Se decidió
dejarlo así (instalar `ng2-charts`) aunque la justificación de "más gráficas después" no aplicó —
no se rediseñó el dashboard para agregar una gráfica de tendencia solo para justificar la
dependencia.

---

## 15. Unificar verificación de correo Usuario/Cliente + auto-crear Cliente al registrar (SOLO DISEÑO, 2026-07-03)

> **Estado: idea anotada para retomar, nada implementado.** Nace de una sesión de dudas sobre por
> qué hoy existen DOS correos y DOS verificaciones separadas (`Usuario.email` para login/reset de
> password, sin verificar nunca vs. `Cliente.correoElectronico` con verificación de código,
> exigida solo en `savePedido`). Ver contexto completo del estado actual en el chat del
> 2026-07-03, resumen abajo.

### Estado actual (confirmado en código, sin ambigüedad)

- `Usuario` (login, tabla `usuario_modificacion`) y `Cliente` (tabla `clientes`) tienen **cada
  uno su propio campo de correo**, sin sincronizar nunca. `Cliente.usuario_id` es una FK 1-a-1
  opcional que se asigna manualmente al guardar un cliente (`ClienteControllerImpl.save`) — nunca
  se crea sola en `POST /v1/auth/registrar` (ese endpoint solo crea `Usuario`).
- La verificación por código (`correoVerificado`, `codigoVerificacion*`) **solo existe en
  `Cliente`**. `Usuario` no tiene ningún campo de verificación — el reset de contraseña
  (`PasswordResetService.solicitarReset`) manda el código a cualquier email de `Usuario` sin
  haberlo confirmado jamás.
- El bloqueo real de "debes verificar tu correo" solo está en `PedidoServiceImpl.savePedido`
  (línea ~104), y solo aplica cuando el `Cliente` **ya existe** — no cubre el caso de un usuario
  recién registrado que todavía no tiene `Cliente`.

### Propuesta del usuario (a diseñar en detalle antes de tocar código)

1. **Verificar una sola vez, no dos.** Al registrarse (`POST /v1/auth/registrar`), el `Usuario`
   verifica su correo con el mismo flujo de código de 6 dígitos que hoy tiene `Cliente`.
2. **Auto-crear el `Cliente` en ese momento**, vinculado por `usuario_id`, con el correo ya
   marcado como verificado (copiado del `Usuario`) — así no hay que volver a verificar cuando
   más adelante se genera un pedido.
3. **Problema que esto introduce:** hoy `PedidoServiceImpl.savePedido` asume que "si el `Cliente`
   existe, tiene sus datos completos" (nombre, apellido paterno, teléfono, etc.), porque
   actualmente el `Cliente` solo se creaba cuando alguien llenaba el formulario completo. Si ahora
   se auto-crea el `Cliente` desde el registro con SOLO el correo, existiría el registro pero
   con nombre/apellido/teléfono vacíos — la validación actual (que solo chequea
   `correoVerificado`) dejaría pasar pedidos con datos de cliente incompletos.
4. **Solución propuesta (a validar):** agregar un campo booleano nuevo a `Cliente` (ej.
   `datosCompletos`, nombre por definir) que:
   - Nace en `false` cuando el `Cliente` se auto-crea solo con correo (desde el registro).
   - Pasa a `true` cuando se capturan/actualizan los campos obligatorios: nombre, apellido
     paterno, teléfono (a definir la lista exacta y si aplica también dirección).
   - `PedidoServiceImpl.savePedido` valida **ambas cosas**: `correoVerificado == true` Y
     `datosCompletos == true` (mensaje de error distinto para cada caso, para que el front sepa
     si debe pedir "verifica tu correo" o "completa tus datos").

### Flujo detallado aclarado por el usuario (2026-07-03, segunda vuelta)

Esto reemplaza/precisa el punto 1-2 de la propuesta original — es el flujo exacto pensado:

1. **Registro (`/v1/auth/registrar`):** al registrarse, se pide verificar el correo ahí mismo
   (código de 6 dígitos, mismo mecanismo que ya existe para `Cliente`). El usuario **no accede al
   sistema hasta terminar la verificación** — primero se registra, luego verifica el código, y
   hasta entonces puede entrar (login) ya con el correo marcado como validado.
2. En ese momento se auto-crea el `Cliente` vinculado, con el campo nuevo (`datosCompletos` o
   como se llame) en `false` — porque solo se tiene el correo, faltan nombre/apellido/teléfono.
3. **Al generar un pedido:** si `datosCompletos == false`, se dispara la validación/formulario
   para completar los campos requeridos del cliente (nombre, apellido paterno, teléfono, etc.).
   El correo en ese formulario ya viene puesto (el del `Usuario`, ya verificado) — el cliente no
   lo tiene que volver a escribir ni verificar en este paso.
4. **REVISADO 2026-07-03, cuarta vuelta (versión definitiva, reemplaza la anterior) — si el
   cliente edita sus datos y cambia el correo:**
   - Los **demás campos del formulario** (nombre, apellido paterno, teléfono, etc.) se guardan/
     actualizan normalmente, sin condición — eso nunca se bloquea.
   - El **correo específicamente** no se aplica de inmediato: se dispara el flujo de verificación
     (enviar código al correo nuevo).
     - Si el cliente **completa la verificación** → el correo nuevo queda guardado en
       `Cliente.correoElectronico`, sigue verificado, y (por la sincronización decidida en el
       punto 2 de abajo) se actualiza también `Usuario.email` al mismo valor.
     - Si el cliente **no completa la verificación** (abandona/cancela) → el correo **regresa al
       valor anterior** (el mismo que ya tenía `Usuario`, sigue sincronizado y verificado) — el
       intento de correo nuevo se descarta, sin dejar a el cliente con un correo sin verificar ni
       bloquear nada más.
   - Con esto YA NO hace falta resetear `correoVerificado = false` ni depender del bloqueo de
     `savePedido` para este caso — el invariante "correo de Cliente = correo de Usuario, siempre
     verificado" nunca se rompe, porque el cambio de correo solo se confirma cuando ya está
     verificado.
   - **Sin cerrar:** el usuario mencionó una excepción — *"a menos que haya cambios del punto
     uno"* — no quedó claro a qué se refiere exactamente (¿el primer login forzado del punto 1?
     ¿otra cosa?). Preguntar de nuevo antes de implementar este paso.

### DDL ya preparado, sin correr todavía

`src/main/resources/static/migration_datos_completos_cliente.sql` — creado el 2026-07-03, agrega
`clientes.datos_completos` (`TINYINT(1) DEFAULT 0`) + backfill a `1` para clientes existentes con
los 4 campos obligatorios ya llenos. **No correr en ningún ambiente todavía** — faltan cerrar las
preguntas abiertas de esta sección antes de tocar el back que depende de esta columna. No hace
falta ALTER para `apeido_materno` (ver más abajo) porque la columna ya es `NULLABLE` en BD.

### ✅ DECIDIDO 2026-07-03 — cómo resolver el choque técnico

Se elige la opción de **método de guardado alterno**, no grupos de validación:

- Se crea un método nuevo (ej. `ClienteService.crearClienteDesdeRegistro(usuario, correo)`) que
  se llama SOLO desde el flujo de registro/auto-alta, hace bypass de las validaciones `@NotBlank`
  de nombre/apellidos/teléfono (guarda directo vía repositorio, no pasa por
  `AbstractController.save`) y arma el `Cliente` con: `usuario` (FK), `correoElectronico` (ya
  verificado), `datosCompletos = false`. El resto de campos quedan `null`.
- El guardado/actualización normal (`AbstractController.save/update`, el mismo endpoint de
  siempre `/v1/clientes`) sigue validando los campos obligatorios — **excepto `apeidoMaterno`,
  que deja de ser `@NotBlank`** (ver decisión abajo). Cuando el cliente completa su perfil (o el
  admin lo edita), pasa por ahí y ahí sí debe venir nombre/apellido paterno/teléfono/correo; ese
  es también el punto natural donde `datosCompletos` pasa a `true`.

### ✅ DECIDIDO 2026-07-03 — campos que entran en `datosCompletos` + apellido materno pasa a opcional

El usuario definió: solo **nombre, apellido paterno, teléfono y correo** son obligatorios para
que `datosCompletos = true`. El resto (segundo nombre, fecha de nacimiento, sexo, **apellido
materno**) queda opcional.

**Confirmado explícitamente 2026-07-03:** hay que relajar `Cliente.apeidoMaterno` en
`Cliente.java` (quitar el `@NotBlank`) — pasa a ser opcional en TODOS los guardados de cliente de
aquí en adelante (admin incluido), no solo en este flujo nuevo. Esto modifica el comportamiento
ya vigente de la mejora 12 (que hoy lo exige) — avisar en `CAMBIOS_FRONT.md` cuando se
implemente, porque el front pudo haber puesto `Validators.required` en ese campo del formulario
de cliente asumiendo que era obligatorio.

### ⚠️ Choque técnico confirmado en código — bloqueante, hay que resolverlo primero

`Cliente.java` (líneas 36-66) tiene **Bean Validation directo en la entidad** (no hay DTO
separado — `ClienteControllerImpl.save` recibe la entidad `Cliente` tal cual como body):
`nombrePersona`, `apeidoPaterno`, `apeidoMaterno`, `correoElectronico` y `numeroTelefonico` son
`@NotBlank` (mejora 12). `AbstractController.save/update` valida con `BindingResult` y devuelve
400 **antes** de llamar al service si hay errores — nunca llega a guardar. Esto significa que
**auto-crear el `Cliente` solo con el correo (sin nombre/apellidos/teléfono) fallaría hoy mismo**
con un 400 por los 4 campos faltantes. La idea del flag `datosCompletos` no resuelve esto por sí
sola — hace falta ADEMÁS una de estas dos cosas:
- Usar **grupos de validación** (`@NotBlank(groups = OnCompleto.class)` + `@Validated(OnCreate.class)`
  vs `@Validated(OnCompleto.class)` según el punto de entrada), para que el alta automática desde
  el registro use un grupo relajado y el guardado completo del perfil use el grupo estricto.
- O crear un método de guardado alterno para el auto-alta (bypass de `AbstractController.save`,
  llamando directo al repositorio) que no pase por esas validaciones — pero entonces to el mismo
  `PUT` genérico usado para completar el perfil sí debe exigirlas.

### Otros puntos sueltos identificados (2026-07-03) — no bloqueantes pero hay que definirlos

- **No afecta a `ClienteSinRegistro` ni venta directa sin cuenta** — eso ya quedó fuera desde la
  mejora 12 (el correo manual del modal post-venta es independiente). Esta mejora 15 solo aplica
  al flujo de cuenta con `Usuario` + pedidos online, no a venta de mostrador.
- **Front nuevo, no solo lo que ya está en la tabla F-XX:** la pantalla de registro necesita el
  paso de "ingresa el código" inline antes de dar acceso (hoy no existe esa pantalla, F-15 solo
  cubre la verificación de `Cliente` para pedidos, no la de `Usuario` en el registro). Con la
  revisión del punto 3 (abajo) YA NO hace falta el modal de "confirmar cambio de correo" al
  editar cliente — el guardado ya no se bloquea, solo se avisa que quedó pendiente de verificar.
- **Rate-limit del reenvío de código:** ya existe `seguridad.rate-limit-habilitado` para
  login/registro — decidir si el nuevo endpoint de verificación de `Usuario` (si es uno nuevo,
  separado del que ya tiene `Cliente`) reutiliza ese mismo mecanismo o necesita el suyo.

### ✅ RESPUESTAS DEL USUARIO 2026-07-03 (tercera vuelta)

**1. Login bloqueado hasta verificar — SÍ, forzarlo.** Razón del usuario: si no se fuerza la
verificación desde el registro, cuando el usuario después necesite recuperar su contraseña
olvidada no habría garantía de que el correo registrado sea real/suyo — forzar la verificación
en el registro resuelve ese problema de raíz. **Implica tocar el flujo de login**
(`AuthController`/`AuthServiceImpl`), no solo `RegistroService`: mientras `Usuario` no esté
verificado, no puede completar el login normal.

**2. Sincronizar `Usuario.email` y `Cliente.correoElectronico` — ✅ CONFIRMADO 2026-07-03 (cuarta
vuelta).** Sí, se sincronizan: el correo del `Usuario` se pone en el `Cliente` (al auto-crearlo),
y de ahí en adelante es un solo correo real por cuenta. La pregunta de seguimiento del usuario
fue: *"pero la cosa es si lo quiere modificar, ¿qué pasaría?"* — respondida en el punto 3
(reemplaza la versión anterior de este documento).

**3. Editar `Cliente` y cambiar el correo — ✅ REVISADO 2026-07-03, versión definitiva (reemplaza
la anterior), ver "Flujo detallado" punto 4 arriba.** Resumen: los demás campos (nombre,
apellidos, teléfono) se guardan siempre sin condición. El correo nuevo NO se aplica de inmediato
— se dispara verificación. Si se verifica, se guarda y se sincroniza también en `Usuario.email`
(punto 2). Si NO se verifica, el correo **regresa al valor anterior** (el de `Usuario`, que sigue
verificado) — se descarta el intento, sin dejar correos sin verificar colgados ni depender del
bloqueo de `savePedido` para este caso.

**✅ ACLARADO 2026-07-03 (quinta vuelta) — no era una excepción nueva, era el mismo escenario
explicado con más detalle.** El usuario confirmó con un ejemplo concreto: te registras y
verificas tu correo (queda en `Usuario` y copiado a `Cliente`); al generar tu primer pedido te
pide llenar los datos de `Cliente` (nombre, apellido, teléfono) porque `datosCompletos == false`;
en ese mismo formulario cambias también el correo (distinto al que ya tenías de `Usuario`); al
dar guardar, el back detecta que el correo ya no coincide y dispara el aviso/modal "has cambiado
el correo, hay que validarlo". Si el cliente acepta, sigue el flujo normal de verificación ya
descrito. **Si dice que no quiere validar → se guardan los demás datos del formulario (nombre,
apellido, teléfono) y el correo regresa al que tenía como `Usuario`** — exactamente el
comportamiento ya documentado arriba, sin ninguna excepción adicional. Punto 3 queda 100%
cerrado.

**4. Re-verificación solo aplica al propio cliente, el admin queda fuera —
CONFIRMADO.** Cuando un ADMIN edita los datos de un cliente desde el panel, NO se dispara este
flujo de re-verificación (eso es exclusivo de cuando el cliente edita su propia cuenta).
**Nuevo requerimiento anotado, pendiente de implementar:** el admin necesita poder **reenviar
manualmente el código de verificación a un cliente** (caso de soporte: el cliente llama porque
no le llegó o lo perdió). Y si el cliente le lee el código al admin por teléfono, el admin debe
poder introducirlo en el sistema y que el cliente quede verificado automáticamente con ese
código — es decir, el endpoint de "verificar-correo" existente necesita ser accesible también
por un admin actuando en nombre del cliente (hoy no está confirmado si ya lo permite o es
exclusivo de la sesión del propio cliente — **revisar el código de
`ClienteControllerImpl`/`SecurityConfig` antes de implementar** para ver si los endpoints
`enviar-codigo-verificacion`/`verificar-correo` ya aceptan rol ADMIN o solo el dueño de la cuenta).

**5. Usuarios ya existentes sin verificar — SÍ forzar verificación en el próximo login, NO
grandfathering.** Confirmado explícitamente: no se les da un pase automático. **El usuario pidió
que esto se anote para que el FRONT lo implemente tal cual** — al primer login después de
desplegar esta mejora, si el `Usuario` no tiene correo verificado, el front debe mostrar la
pantalla de verificación antes de dejarlo continuar, igual que a un usuario recién registrado.

**6. Patrón de llamadas para verificar el correo en el registro — ✅ CONFIRMADO 2026-07-03.** Sí,
replicar el mismo patrón de 3 llamadas que ya existe para `Cliente`: 1️⃣ `POST /v1/auth/registrar`
crea el `Usuario` sin verificar → 2️⃣ `POST enviar-codigo-verificacion` manda el correo con el
código → 3️⃣ `POST verificar-correo` con el código que el usuario escribió, ahí se marca
verificado (y recién ahí se le permite el login, punto 1).

---

## Explicación completa del flujo — versión limpia para front + back (2026-07-03)

> Esto NO va todavía en `CAMBIOS_FRONT.md` porque nada está implementado — ahí se documentará el
> contrato real (endpoints, request/response) cuando se escriba el código, siguiendo la
> convención del proyecto. Esto es la explicación de diseño ya cerrada, para que tanto front como
> back entiendan el flujo completo de punta a punta antes de que arranque la implementación.

### A) Registro de un usuario nuevo

1. El front manda el registro de siempre: `POST /v1/auth/registrar` (usuario, contraseña, correo).
   El `Usuario` se crea, pero **sin verificar** — todavía no puede loguearse.
2. El front debe pedir el código de verificación (nuevo endpoint, análogo al que ya existe para
   `Cliente`: `enviar-codigo-verificacion`) y mostrar una pantalla "ingresa el código de 6
   dígitos que te enviamos".
3. El usuario escribe el código → el front lo manda (nuevo endpoint análogo a `verificar-correo`
   de `Cliente`). Si es correcto, el `Usuario` queda verificado.
4. **Solo hasta ese momento** el back auto-crea el `Cliente` vinculado (correo copiado, ya
   verificado, `datosCompletos = false`) y **solo hasta ese momento** el login funciona. Si el
   front intenta loguear a alguien sin verificar, el back debe rechazarlo — el front necesita
   distinguir esa respuesta para mandarlo de vuelta a la pantalla de "ingresa el código" en vez
   de mostrar un error genérico de login.

### B) Primer pedido — completar los datos que faltan

5. Cuando el cliente intenta generar su primer pedido, el back debe detectar `datosCompletos ==
   false` y devolver una respuesta que el front pueda distinguir de "correo sin verificar" (son
   dos motivos de bloqueo distintos, mejora 12 vs mejora 15 — necesitan mensajes/códigos de error
   diferentes para que el front sepa qué pantalla mostrar).
6. El front muestra el formulario de "completa tus datos": nombre, apellido paterno, teléfono
   (apellido materno queda opcional). El correo aparece prellenado con el ya verificado.
7. Al guardar, se usa el mismo endpoint de actualizar cliente de siempre
   (`PUT`/`POST /v1/clientes`). Si el cliente **no tocó el correo**, se guarda tal cual, sin nada
   especial — `datosCompletos` pasa a `true` en el back automáticamente.

### C) Si en ese mismo formulario (o cualquier edición futura) el cliente cambia el correo

8. Los demás campos (nombre, apellido, teléfono) se guardan siempre, sin condición.
9. Si el correo que llega es distinto al que ya tenía, el back dispara el aviso de verificación —
   el front debe mostrar un modal tipo *"Has cambiado tu correo, es necesario validarlo. ¿Quieres
   verificarlo ahora?"*.
   - **Si acepta:** mismo flujo de código de 6 dígitos ya conocido (enviar código → escribir
     código → verificar). Al terminar, el correo nuevo queda guardado y verificado, y se
     sincroniza también en `Usuario.email`.
   - **Si dice que no:** no pasa nada malo — el resto del formulario ya se guardó (paso 8), y el
     campo correo en la respuesta del back **vuelve a traer el valor anterior** (el mismo que
     tiene `Usuario`). El front debe refrescar el campo correo en pantalla con ese valor
     devuelto, no dejar el que el usuario había escrito y canceló.

### D) Usuarios que ya existían antes de esta mejora

10. Nunca verificaron su correo (el concepto no existía). En su próximo login, el back debe
    tratarlos igual que a alguien recién registrado sin verificar: el front los manda a la
    pantalla de "ingresa el código" (pasos 2-3) antes de dejarlos entrar normalmente.

### E) Soporte — verificación asistida por un admin (aclarado 2026-07-03, sexta vuelta)

**Caso de uso real, tal como lo describió el usuario:** un cliente se presenta con el admin
(en persona o por teléfono) y le pide ayuda para validar su correo (típicamente porque no le
llegó el código, perdió acceso, o simplemente no supo hacerlo solo). El admin busca a ESE cliente
en el sistema, reenvía el código a su correo, el cliente lo revisa y se lo dicta al admin, y el
admin lo captura para verificarlo en su nombre.

11. Nueva pantalla/función en el panel admin: buscar un cliente y poder (a) reenviarle el código
    de verificación, y (b) capturar el código que el cliente le dicte para verificarlo en su
    nombre. Es una extensión pequeña de lo que ya existe — mismos dos endpoints de siempre
    (`enviar-codigo-verificacion`/`verificar-correo`), solo que quien los llama es el admin
    buscando a un cliente específico, en vez del propio cliente con su sesión. Depende de
    confirmar que el back ya permite rol ADMIN ahí (ver pendientes abajo) — si no, hay que
    agregarlo. **No hace falta restringir el caso de uso más que esto** (no hay que limitarlo
    solo a "cuando el cliente olvidó completamente sus datos" — aplica en general, cualquier vez
    que el cliente no pueda verificarse solo).
12. Importante para el front del panel admin: cuando un ADMIN edita los datos de un cliente
    (no el propio cliente logueado), el flujo de los pasos 8-9 **no aplica** — el admin puede
    cambiar el correo de un cliente sin que se dispare ningún modal de verificación.

## ✅ Detalles de implementación — CERRADOS 2026-07-03 (sexta vuelta)

1. **Recalcular `datosCompletos` — se hace automático, CONFIRMADO.** Cada vez que se guarda un
   `Cliente`, se revisa si `nombrePersona`, `apeidoPaterno`, `numeroTelefonico` y
   `correoElectronico` son válidos (no vacíos) — si sí, se pone `datosCompletos = true`. No hace
   falta que el front ni nadie lo envíe explícito, lo calcula el back solo en cada guardado
   (vía `@PrePersist`/`@PreUpdate` en la entidad, o una verificación equivalente en el service
   antes de persistir).
2. **Rate-limit del reenvío de código — independientes, CONFIRMADO.** El de `Usuario` (nuevo) y
   el de `Cliente` (ya existente) quedan cada uno con su propio límite, sin compartir el mismo
   contador ni la misma configuración.

## ✅ IMPLEMENTADO 2026-07-03 — back completo, pendiente compilar/probar + correr migraciones

Se escribió todo el código descrito en este documento. **No se corrió `mvn compile` en esta
sesión** (Maven no estaba disponible en el entorno) — revisar que compile y probar en vivo antes
de mergear a qa. Tampoco se corrieron las migraciones SQL contra ninguna base de datos.

### Punto E resuelto sin cambios — ya funcionaba

Se revisó el código: `enviar-codigo-verificacion`/`verificar-correo` de `Cliente` viven bajo
`.requestMatchers("/v1/clientes/**").authenticated()` en `SecurityConfig` — **cualquier usuario
autenticado (incluido ADMIN) ya puede llamarlos para cualquier `clienteId`**, no solo el dueño de
la cuenta. El caso de soporte del punto E funciona hoy tal cual, sin tocar nada.

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `service/UsuarioVerificacionService.java` | `enviarCodigoVerificacion(usernameOEmail)` / `verificarCorreo(usernameOEmail, codigo)` — mismo patrón que `Cliente`; al verificar por primera vez, auto-crea el `Cliente` vinculado |
| `models/EnviarCodigoVerificacionUsuarioRequest.java` | DTO body `{ userName }` |
| `models/VerificarCorreoUsuarioRequest.java` | DTO body `{ userName, codigo }` |
| `migration_usuario_verificacion_correo.sql` | Agrega `correo_verificado`/`codigo_verificacion`/`codigo_verificacion_expira` a `usuario_modificacion` |
| `migration_datos_completos_cliente.sql` | Actualizado — agrega `datos_completos` y `correo_pendiente` a `clientes` (antes solo tenía `datos_completos`) |

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `entity/Usuario.java` | + `correoVerificado`/`codigoVerificacion`/`codigoVerificacionExpira`; `isEnabled()` ahora exige `correoVerificado=true` — Spring Security bloquea el login solo (lanza `DisabledException`) |
| `entity/Cliente.java` | + `datosCompletos`/`correoPendiente`; `apeidoMaterno` ya NO es `@NotEmpty`/`@NotNull` (opcional); nuevo `@PrePersist`/`@PreUpdate` que recalcula `datosCompletos` en cada guardado |
| `service/ClienteServiceImpl.java` | + `crearClienteDesdeRegistro(usuario, correo)` — INSERT nativo vía `EntityManager` que hace bypass de Bean Validation (nombre/apellidos/teléfono aún no existen); `enviarCodigoVerificacionCorreo`/`verificarCorreo` ahora usan `correoPendiente` si existe (manda el código ahí, y al verificar promueve el valor a `correoElectronico` + sincroniza `Usuario.email`) |
| `controller/AuthController.java` | + `POST /v1/auth/enviar-codigo-verificacion` y `POST /v1/auth/verificar-correo` (para `Usuario`, rate-limit propio con key `verif-usr:`); `login()` captura `DisabledException` aparte → 403 "Debes verificar tu correo antes de iniciar sesión" |
| `controller/ClienteControllerImpl.java` | `save()` ahora: preserva `codigoVerificacion`/`correoVerificado`/`correoPendiente` existentes (el guardado genérico hace `merge()` completo y los pisaría con `false`/`null` si el front no los manda); si el correo cambia y quien edita NO es admin (`AuthenticationUtils.isAdminContext()`), lo manda a `correoPendiente` y dispara el envío del código — si es admin, se aplica directo y verificado |
| `security/SecurityConfig.java` | Los 2 endpoints nuevos de `/v1/auth/` agregados a `permitAll()` (el usuario aún no puede loguearse en ese punto) |
| `service/PedidoServiceImpl.java` | `savePedido` valida también `cliente.getDatosCompletos()`, con mensaje de error distinto al de correo sin verificar |

### Bug pre-existente encontrado y corregido de paso

`ClienteControllerImpl.save()` no preservaba explícitamente los campos administrados por el back
(`correoVerificado`, `codigoVerificacion`, etc.) antes de esta sesión. Como el guardado genérico
hace `repository.save()` con el objeto completo deserializado del JSON (sin DTO intermedio), si el
front no incluía esos campos en el request, un simple "actualizar mis datos" los reseteaba a
`false`/`null` — es decir, **cualquier cliente que ya había verificado su correo y luego editaba
su perfil (nombre, teléfono, etc.) perdía la verificación silenciosamente** y quedaba bloqueado en
su siguiente pedido sin haber tocado su correo. Se corrigió al mismo tiempo que se agregó la
lógica de `correoPendiente`, cargando el registro existente y preservando esos campos antes de
guardar.

### Sin disrupción a sesiones activas

El bloqueo de login por correo sin verificar solo aplica en `POST /v1/auth/login`
(`authManager.authenticate()`). Ni `JwtAuthenticationFilter` (valida tokens en cada request) ni
`POST /v1/auth/refresh` revisan `isEnabled()` — un usuario ya logueado con un refresh token válido
sigue funcionando sin interrupción hasta que cierre sesión y necesite loguearse de nuevo.

### Pendiente antes de mergear a qa

1. Compilar (`mvn compile`) y correr pruebas manuales del flujo completo — no se verificó en
   ejecución en esta sesión.
2. Correr `migration_usuario_verificacion_correo.sql` y `migration_datos_completos_cliente.sql`
   en dev primero, revisar, luego qa (comparten `inventario_key_qa`). Prod queda pendiente hasta
   que la rama llegue ahí.
3. Documentar el contrato real de los 2 endpoints nuevos en `CAMBIOS_FRONT.md` una vez probado.
4. Implementar las pantallas nuevas del front (ver F-19 en la tabla de arriba).

> **NOTA 2026-07-03 — código en working tree, sin commitear:** todos los archivos de esta mejora
> ya están escritos en local (rama `dev`), listos para revisar/compilar/probar, pero **sin git add
> ni commit** — se quedan así hasta que el usuario diga explícitamente "sube" o "haz commit"
> (regla de `CLAUDE.md`). Si se retoma esta sesión en otra conversación, correr `git status` para
> confirmar que siguen ahí antes de asumir que se perdieron.

### Dudas de front pegadas por el usuario (2026-07-03) — vienen de otra sesión/repo (Angular)

> Este análisis lo generó otra sesión trabajando sobre el proyecto Angular (front), no existe
> ningún `.component.ts` en este repo (`proyecto_key_new` es solo el back). Lo dejo aquí limpio,
> con verificación desde el lado del back, para que quien retome el front sepa qué es seguro
> proceder y qué NO todavía.

| # | Qué | Archivo (front) | Verificación desde el back |
|---|---|---|---|
| 1 | QR de Facebook no aparece — el código lee `res.whatsappUrl` en vez de `res.data.whatsappUrl`/`res.data.facebookUrl` | `negocio.service.ts` (o donde se consuma `NegocioService.getContactosPublicos()`) | ✅ Confirmado en el back: `NegocioController.getContactosPublicos()` devuelve `ResponseEntity<ResponseGeneric<ContactosPublicosDto>>` — el wrapper `.data` es obligatorio, como en el resto del proyecto. Es bug del front, seguro de corregir ya. |
| 2 | URL incorrecta del chatbot para imagen de variante: usa `/v1/variantes/imagenes/{id}` en vez de `/variantes/v1/imagenes/{id}`; además toma el primer elemento del array en vez del que trae `principal:true` | `chatbot.service.ts` | ✅ Ya documentado como corrección pendiente del front desde el 2026-07-02 (ver nota F-8 más arriba en este documento) — nada nuevo, seguro de proceder. |
| 3 | Falta mandar `montoDado` en `POST /v1/ventas/save` (solo si método = EFECTIVO) | `venta-directa.component.ts` | ✅ Correcto — el campo `montoDado` ya existe en el back (NF-3, `VentaDirectaRequest`) desde la sesión del módulo de crédito. Seguro de proceder. |
| 4 | Apellido materno ya no es obligatorio — quitar `Validators.required` | `clientes-add.component.ts` | 🔴 **NO PROCEDER TODAVÍA.** Esa validación se quitó en el back **en esta misma sesión** (mejora 15) y sigue **sin commitear, sin compilar, sin correr en ningún ambiente** (dev/qa/prod siguen exigiendo apellido materno hoy). Si el front quita el `required` antes de que el back esté desplegado, un formulario sin apellido materno se rechazaría igual con 400 contra dev/qa reales. Esperar a que se confirme que el back de la mejora 15 ya está arriba. |

**Respuesta a "¿Procedo con estos 4 cambios?":** sí a los puntos 1, 2 y 3 — son seguros e
independientes de la mejora 15. El punto 4 hay que dejarlo pendiente hasta que el back de la
mejora 15 esté compilado, probado y desplegado en el ambiente correspondiente (ver "Pendiente
antes de mergear a qa" arriba).

### Nueva idea sin desarrollar — Promociones por variante (2026-07-03, solo anotada, sin decidir)

Pregunta del usuario: quiere poder marcar promociones puntuales sobre variantes específicas (ej.
2 variantes en promoción) sin afectar el cálculo de ganancias que ya existe, y sin saber todavía
cómo manejarlo en el front.

**Contexto ya confirmado en el back:**
- La ganancia de cada venta se calcula con el precio real vendido (`subTotal` del item) menos
  `precioCosto` del producto — **no depende de un precio fijo**, así que vender más barato como
  promo ya recalcula bien la ganancia hoy, sin tocar nada.
- Ya existe un campo `Producto.precioRebaja` (get/set simple, sin lógica de negocio, sin fechas,
  sin activar/desactivar) — pero vive en `Producto`, no en `Variantes`, así que no sirve para
  promocionar una talla/color puntual sin afectar las demás variantes del mismo producto.

**Recomendación dada (sin implementar, el usuario no ha confirmado):** agregar 2-3 campos nuevos
directo en `Variantes` (ej. `precioPromocion`, `descripcionPromocion`, `enPromocion`) en vez de
tocar `Producto`. El catálogo público mostraría el precio de promo solo en esas variantes; al
vender, el front manda el precio como ya hace hoy (no hay que tocar `savePedido`/venta ni la
lógica de ganancia). Pendiente de decidir: ¿el back debe validar que el precio cobrado en la venta
coincida exactamente con `precioPromocion` (evita que el front mande cualquier precio), o queda
como hoy (el front es responsable del precio, sin validación de por medio)?

**Estado: pausado a petición del usuario para retomar después de cerrar la mejora 15.**