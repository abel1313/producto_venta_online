# Flores eternas — qué endpoint usa cada pantalla y por qué

Documento de referencia del **front**. Para cada pantalla: qué endpoints llama, en qué momento,
por qué, y qué manda y recibe.

Base de todas las URLs: `{api_Url}` = `.../mis-productos`.
**Todas las respuestas van envueltas** en `ResponseGeneric`:

```json
{ "mensaje": "La peticion fue exitosa", "code": 200, "data": { … }, "lista": null }
```

⚠️ **Y no siempre en el mismo campo.** La mayoría contesta en `data`, pero
`GET /v1/colores-flor/por-tipo-flor/{id}` contesta en **`lista`**. Leer el campo equivocado
devuelve `undefined` **sin ningún error** — ya costó una sesión entera (el configurador decía
"esta especie no tiene colores" teniendo colores). El servicio lee `lista ?? data` por eso.

---

## Mapa rápido — pantalla → endpoints

| Pantalla | Ruta | Quién entra | Endpoints |
|---|---|---|---|
| Ramos de flores | `/flores/ramos` | Cualquiera con sesión | `ramos-armados/activos`, `negocio/contactos` |
| Arma tu ramo | `/flores/configurar` | **Pública** | 6 de catálogo + 3 de cálculo + `savePedido` + `pedidos/{id}/detalle` |
| Catálogos | `/flores/catalogos` | Admin | CRUD de los 5 catálogos + fotos |
| Ramos armados (admin) | `/flores/ramos-admin` | Admin | `ramos-armados/admin`, crear/editar/activo + catálogos |
| Entregas | `/flores/entregas` | Admin | `cantidades-flor` (getAll + update) |
| Frases por aprobar | `/flores/frases` | Admin | `flores/pedidos/frases-pendientes`, `validar-frase` |
| Zonas y envío | `/flores/zonas` | Admin | `lugares-entrega` (catálogo compartido, no es de flores) |

---

## 1. Ramos de flores — `/flores/ramos`

La vitrina: ramos que el dueño ya dejó armados con precio fijo. El cliente solo elige uno.

### `GET /v1/ramos-armados/activos?pagina=1&size=12`

**Por qué:** es lo único que se muestra en la pantalla. Solo los activos — un ramo apagado sigue
existiendo para el admin, pero no debe verse aquí.

**Respuesta** (`data`):
```json
{ "t": [ { "id": 3, "nombre": "Ramo 12 rosas rojas", "colorFlorId": 1, "cantidad": 12,
           "precioTotal": 465.0, "precioPapel": 15.0, "pliegosPapel": 3,
           "precioUnitarioPapel": 5.0, "imagenUrl": null, "activo": true,
           "accesorios": [ { "accesorioId": 5, "nombre": "Corona", "cantidad": 1, "precio": 50.0 } ] } ],
  "pagina": 1, "totalPaginas": 1, "totalRegistros": 1 }
```

⚠️ `imagenUrl` es un **link plano** que el dueño pega a mano: la foto del ramo armado NO pasa por
el micro de imágenes, a diferencia de las fotos de los artículos sueltos (ver §3).

### `GET /v1/negocio/contactos`

**Por qué:** el botón "💬 Pedir" abre el WhatsApp del negocio. **No hay compra directa del ramo
armado** — ver la limitación al final.

---

## 2. Arma tu ramo — `/flores/configurar`

La pieza grande. El cliente arma su ramo desde cero y ve el precio actualizarse.

⚠️ **La ruta es pública**: el cliente arma y cotiza sin cuenta, y solo se le pide sesión al
confirmar. Por eso ningún endpoint del armado puede exigir token — cuando `lugares-entrega`
todavía lo exigía, un visitante entraba y salía disparado al login sin entender por qué.

### Al abrir — catálogo (5 llamadas en paralelo)

| Endpoint | Para qué |
|---|---|
| `GET /v1/tipos-flor/getAll?page=0&size=200` | Las especies del paso 1, con su precio por flor |
| `GET /v1/accesorios-ramo/getAll` | Las casillas del paso 4 |
| `GET /v1/frases-liston/getAll` | El desplegable de frases del paso 5 |
| `GET /v1/cantidades-flor/getAll` | **Los pliegos de papel.** Sin esto la casilla del papel decía "$5.00" cuando el cobro real de un ramo de 20 son $15 (3 pliegos) |
| `GET /v1/lugares-entrega/getAll?size=200` | Las zonas del paso 6 |

### Al elegir la especie

**`GET /v1/colores-flor/por-tipo-flor/{tipoFlorId}`** → responde en **`lista`**, no en `data`.

**Por qué:** los colores cuelgan de la especie y solo trae los activos.

```json
{ "lista": [ { "id": 1, "tipoFlor": { "id": 1, "nombre": "Rosa eterna" }, "nombre": "Roja",
               "stock": 90, "activo": true,
               "variante": { "id": 619, "producto": { "id": 376 }, "stock": 90 } } ] }
```

⚠️ Ese `variante` es el **producto interno** del color — es donde viven su foto y su stock real.
Ver §3.

### Al confirmar la cantidad

**`POST /v1/flores/validar-cantidad`** → `{ "tipoFlorId": 1, "cantidad": 22 }`

**Por qué:** no cualquier número "cierra bien el círculo" del ramo.

```json
{ "data": { "valida": false, "mensaje": "Con 22 flores el circulo puede no quedar bien formado",
            "alternativaMenor": { "cantidad": 20, "precio": 500.0 },
            "alternativaMayor": { "cantidad": 48, "precio": 1200.0 } } }
```

⚠️ **Avisa, no prohíbe.** El back acepta y cobra 22 sin problema — por eso la pantalla ofrece
"Seguir con 22" además de las dos alternativas. Y ojo: una cantidad **por debajo de la más chica
registrada** se acepta como "venta por unidad"; el `mensaje` lo dice y hay que mostrarlo tal cual,
porque los tres casos se ven iguales si se escribe un texto propio.

### Con cada cambio — el precio (debounce 450 ms)

**`POST /v1/flores/calcular-precio`**

```json
{ "colores": [ { "colorFlorId": 1, "cantidad": 12 }, { "colorFlorId": 2, "cantidad": 8 } ],
  "accesorios": [ { "accesorioId": 5, "cantidad": 1 } ],
  "fraseListonId": 1, "fraseListonPersonalizada": null,
  "lugarEntregaId": 2, "fechaHoraEntrega": "2026-08-25T16:00:00", "urgente": false }
```

**Por qué:** **el front nunca calcula precios.** Devuelve además el `varianteId` de cada línea,
que es lo que después se manda al pedido.

```json
{ "data": { "total": 565.0, "precioBase": 500.0, "precioPapel": 15.0, "pliegosPapel": 3,
            "precioUnitarioPapel": 5.0, "precioUrgencia": 50.0,
            "papelObligatorioAplicado": true, "requiereAnticipo": true,
            "montoAnticipoSugerido": 282.5, "tieneListonPendienteValidacion": false,
            "avisoFrasePendiente": null,
            "coloresCalculados": [ { "colorFlorId": 1, "cantidad": 12, "varianteId": 619, "subtotal": 300.0 } ],
            "accesoriosCalculados": [ { "accesorioId": 5, "cantidad": 1, "varianteId": 627,
                                        "agregadoAutomaticoPorRegla": false } ],
            "listonesCalculados": [] } }
```

⚠️ **Tres reglas que salen de aquí y no son obvias:**
1. **El papel no se le muestra al cliente** — ni como opción ni como línea. Su costo se funde en
   la línea de flores (`precioBase + precioPapel`), porque quitarlo dejaría las líneas sin sumar
   el total. Quién decide si va incluido es `papelObligatorioAplicado`, **no** un cálculo del
   front.
2. **La urgencia SÍ lleva línea propia**, al revés que el papel: el cliente la eligió a
   propósito en un botón que ya le decía el precio.
3. **`requiereAnticipo`** hace que el pedido nazca `APARTADO` con `estadoPedido: 'APARTADO'` (no
   `'Pendiente'`), y el anticipo es **la mitad del total**, no un cargo extra.

### Al elegir fecha o zona

**`POST /v1/flores/fechas-disponibles`** → `{ "tipoFlorId": 1, "cantidad": 20, "lugarEntregaId": 2, "urgente": false }`

**Por qué:** el taller tarda en armar el ramo, así que el calendario **solo debe ofrecer fechas
que se puedan cumplir** — el error se vuelve imposible en vez de rechazarse después.

```json
{ "data": { "primeraFechaValida": "2026-08-25", "horasDisponibles": ["16:00"],
            "cantidadAplicada": 20, "cargoUrgencia": 300.0, "ofreceUrgente": true,
            "mensaje": null } }
```

⚠️ Pide `tipoFlorId` **además** de la cantidad: el plazo se configura por (especie, cantidad).
Y `primeraFechaValida: null` = no se puede en ninguna fecha → se muestra el `mensaje` del back y
se bloquea el pedido.

### Al confirmar — dos llamadas, en este orden

**1. `POST /v1/pedidos/savePedido`** — el mismo endpoint de cualquier compra del cliente, no uno
de flores. Una línea de detalle por cada `varianteId` que devolvió `calcular-precio`.

⚠️ **La línea del papel va con `cantidad = pliegosPapel` y `precioUnitario = precioUnitarioPapel`**
— nunca el total ya multiplicado. El back valida el precio unitario contra el catálogo (que es el
precio *por pliego*) y rechaza el pedido si no coincide.

**2. `POST /v1/flores/pedidos/{pedidoId}/detalle`** — guarda la frase del listón, la zona, la
fecha y el contacto.

⚠️ **Esta segunda llamada no puede fallar en silencio si hay frase personalizada.** El texto de
la frase **solo vive aquí**: si falla, el ramo se arma sin listón, el cliente ya pagó, y nadie se
entera. Por eso la pantalla ofrece reintentar mostrando el texto. Sin frase, sí puede fallar
callada (la zona y la fecha las completa el admin después).

⚠️ Se manda `correoContacto` **solo cuando hay frase**: es a donde el back avisa cuando ya le
puso precio. Sin eso, ese correo nunca sale.

### Modo edición — `/flores/configurar?pedidoId=42` (admin)

`GET /v1/flores/pedidos/{id}/detalle` para precargar, y **`PUT /v1/flores/pedidos/{id}/editar-ramo`**
para guardar.

⚠️ **Solo cambia flores, accesorios y fecha/urgencia.** El listón y la zona **no**, así que la
pantalla oculta el paso del listón y bloquea la zona — dejarlos editables haría creer que se
guardaron.

⚠️ Un color desactivado después de la venta **no aparece** en `colores-flor` (solo trae activos).
Su nombre se saca de `colorNombre`, que viene en el **detalle del pedido**. Regla general: para
mostrar algo ya vendido, usar lo que trae el pedido, no el catálogo — el catálogo dice qué se
puede vender *hoy*.

---

## 3. Catálogos — `/flores/catalogos` (admin)

Las 5 pestañas. Los cinco catálogos usan el **CRUD genérico**, con las mismas rarezas:

| | |
|---|---|
| `GET .../getAll?page=0&size=200` | `page` y `size` son **obligatorios**, no tienen valor por defecto |
| `POST .../save` | crea |
| `PUT .../update/{id}` | **reemplaza el registro completo** |
| `DELETE .../delete` | el id **crudo** en el body (`1`), NO `{ "id": 1 }` |

⚠️ **`update` reemplaza todo**, así que hay que reenviar los campos que no se están tocando. Ya
mordió una vez: editar los pliegos desde Catálogos borraba la configuración de entrega hecha en
la otra pantalla. Los 4 puntos que llaman `cantidadUpdate` reenvían los 6 campos de entrega por eso.

Rutas: `/v1/tipos-flor`, `/v1/colores-flor`, `/v1/cantidades-flor`, `/v1/accesorios-ramo`,
`/v1/frases-liston`.

### Las fotos de los artículos

⚠️ **No hay endpoints de imagen propios de flores.** Un color o un accesorio **no tiene campo de
foto**: lo que tiene es un **producto interno** (`variante`), y la foto se guarda ahí con los
endpoints normales de producto.

| Acción | Endpoint |
|---|---|
| Leer las fotos | `GET /tienda/v1/imagenes/{varianteId}` → `data: [{ id, urlImagen, principal }]` |
| Subir una foto | `POST /tienda/v1/guardarConImagenes` con `[{ id, productoId, …, listImagenes: [{ base64, extension, nombreImagen }] }]` |

⚠️ **Al subir hay que reenviar los campos que la variante ya tenía** (stock, color, descripción).
Ese endpoint guarda la variante completa: mandar solo `{ id, listImagenes }` la dejaría con el
resto en blanco — y en un color de flor ese `stock` **es el inventario real de ese color**.

⚠️ **La foto se comprime antes de mandarla** (1280 px, JPEG 0.8). Una foto de cámara pesa 3-8 MB
y en base64 crece ~33%: sin comprimir da **413 Request Entity Too Large**.

⚠️ **Los tipos de flor (la especie) no pueden llevar foto**: no tienen producto interno ni campo
de imagen. Haría falta pedírselo al back.

---

## 4. Ramos armados (admin) — `/flores/ramos-admin`

| Endpoint | Para qué |
|---|---|
| `GET /v1/ramos-armados/admin?pagina=1&size=20` | La lista, **incluidos los apagados** |
| `POST /v1/ramos-armados` | Crear |
| `PUT /v1/ramos-armados/{id}` | Editar |
| `PUT /v1/ramos-armados/{id}/activo` | `{ "activo": false }` — **no hay borrado**, ocultar es la única salida |

Además carga `tipos-flor`, `colores-flor` y `cantidades-flor` para los desplegables.

⚠️ Al editar, la respuesta **no trae `tipoFlorId` ni `cantidadFlorValidaId`** — solo `colorFlorId`
y `cantidad`. La especie se deduce del color, y la cantidad se busca por coincidencia; si esa
cantidad ya no está activa, el desplegable queda sin preseleccionar a propósito.

---

## 5. Entregas — `/flores/entregas` (admin)

**No tiene endpoints propios.** Los plazos de entrega son 6 campos **dentro de
`CantidadFlorValida`**, así que usa `GET /v1/cantidades-flor/getAll` y
`PUT /v1/cantidades-flor/update/{id}`.

Se propuso así para que el dueño no registre el mismo tamaño de ramo en dos lugares distintos y
se le desalineen.

Campos: `diasNormal`, `horaEntregaNormal`, `diasUrgente`, `horaEntregaUrgente`,
`horaLimitePedido`, `cargoUrgente`.

⚠️ **Las horas viajan como `HH:mm:ss`** ("16:00:00") pero un `<input type="time">` solo entiende
`HH:mm` — si se le pasa con segundos, **el campo se queda vacío sin avisar**. Se recorta al leer
y se completa al guardar.

⚠️ **`horasMinimasAnticipacion` y `precioUrgencia` no son lo mismo:** la primera decide si **se
puede**; la segunda, si **se cobra extra**. Un ramo que no da tiempo se rechaza, no se cobra más caro.

---

## 6. Frases por aprobar — `/flores/frases` (admin)

Cuando el cliente escribe **su propia frase**, no hay precio de catálogo: el ramo se vende con un
total provisional y la frase queda esperando precio.

| Endpoint | Para qué |
|---|---|
| `GET /v1/flores/pedidos/frases-pendientes?pagina=1&size=20` | La bandeja |
| `PUT /v1/flores/pedidos/detalle/{detalleId}/validar-frase` | `{ "aprobar": true, "precioAsignado": 120 }` |

⚠️ Aprobar **no toca el pedido original**: crea un pedido `APARTADO` aparte solo con esa frase, y
devuelve `pedidoAnticipoId`. Por eso la pantalla ofrece ir a cobrarlo de una vez — si el dueño
tiene que buscarlo a mano después, se queda sin cobrar.

⚠️ **`anticipoPagado` del request no hace lo que parece**: hoy es informativo y `validar-frase`
crea el pedido del anticipo de todos modos. Mandarlo en `true` generaría un cobro duplicado contra
un pago en efectivo. El front no lo manda.

---

## 7. Cobrar y cancelar — desde otras pantallas

| Endpoint | Dónde se llama | Por qué |
|---|---|---|
| `POST /v1/flores/pedidos/{id}/revalidar-antes-de-pagar` | `/abonos` y el detalle del pedido, **antes** de cobrar | Si el pago se pasó de la hora límite, agrega el cargo urgente. Devuelve `totalActual` y `cargoRecienAplicado` |
| `DELETE /v1/flores/pedidos/{id}/cancelar` | `mis-pedidos`, botón del **cliente** | El cliente cancela lo suyo mientras no haya ningún pago. Sin body |

⚠️ `revalidar-antes-de-pagar` **responde 200 en pedidos que no son de flores** (con
`cargoRecienAplicado: false`), y por eso se llama **siempre** — `/abonos` no sabe distinguir un
ramo de una venta de blusas.

---

## Lo que NO existe

- **Comprar un ramo armado desde la vitrina.** `RamoArmado` no expone los `varianteId` resueltos;
  solo salen llamando a `calcular-precio`. Hoy el botón manda a WhatsApp.
- **Validación de fecha y cargo de urgencia en los ramos armados.** Solo el configurador libre los
  maneja: si alguien pide un ramo ya armado "para mañana", no hay bloqueo ni cargo.
- **Foto en los tipos de flor.** Ver §3.
- **Aviso al cliente de que su ramo está listo.** No hay endpoint de notificación de flores.
