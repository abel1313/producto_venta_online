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

> **Orden:** el ticket (1) va primero porque correo (2) lo necesita.
> El stock bajo (4) necesita correo (2) ya listo en back.
> El dashboard (6) necesita los reportes (5).

> **Checkpoint 2026-07-02 (actualizado):**
> - ✅ Listos en back (falta front): 1 (ticket), 2 (correo), 5 (reportes), 6 (dashboard), 8/9/10 (chatbot).
> - 🚫 En pausa: 3 (WhatsApp al cliente).
> - ⏳ Sin arrancar ni back ni front: 4 (stock bajo), 7 (devoluciones).
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