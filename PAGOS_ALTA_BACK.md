# Formas de pago vacías en QA — para el equipo de BACK

**Fecha:** 2026-07-16
**De:** Front
**Para:** Back
**Acción requerida:** ✅ Dar de alta datos en BD de QA. No requiere cambios de código (los endpoints ya existen).

---

## Por qué es de back

El front solo **lee** las formas de pago. Los 6 endpoints relacionados son todos `GET`:

```
GET /v1/pagos/tipos-pago
GET /v1/pagos/tarifas
GET /v1/pagos/iva
GET /v1/pagos/opciones
GET /v1/pagos/opciones-estructuradas
GET /v1/pagos/opciones-por-tipo/{tipoPagoId}
```

No hay ningún `POST`/`PUT` para crear `TipoPago`, `DetallePago` o `PagosYMeses`, ni pantalla en el
sistema para darlos de alta. El front depende 100% de que esas filas ya existan en la base de
datos.

---

## Cómo confirmarlo en 10 segundos

Pídeles correr esto con un token válido:

```
GET https://qa.backend.novedades-jade.com.mx/mis-productos/v1/pagos/opciones-estructuradas
```

- Si responde `"data": []` (vacío) → confirmado: falta insertar las formas de pago (Efectivo,
  Transferencia, Tarjeta, etc.) en la BD de QA.
- Si responde `"data": [ ... ]` con opciones → no es esto, avísenme para revisar otra cosa.

**Importante:** revisar también la tabla `pagos_y_meses`, no solo `tipo_pago`. Si `tipo_pago` tiene
filas pero `pagos_y_meses` está vacía, el endpoint puede devolver tipos de pago listados con
`mostrarMeses: false` y sin opciones útiles — no un array vacío limpio. Ese caso también hay que
resolverlo del lado de datos.

---

## Pregunta que sí necesito que respondan

¿Cómo se supone que se dan de alta las formas de pago? No hay pantalla para eso en el sistema.
Es o un `INSERT` manual en BD, o un seed que debió correr al montar QA y no corrió. Eso lo saben
ellos.

---

## Qué filas hacen que aparezca el dropdown (sacado de los DTOs del front)

> ⚠️ La ACCIÓN concreta que resuelve el bug es **insertar estas filas en la BD de QA** — NO es
> commitear ningún archivo. Guardar esta nota en git no da de alta nada.

El endpoint `GET /v1/pagos/opciones-estructuradas` arma **una opción del dropdown por cada
`TipoPago`**. Para que "Efectivo" y "Transferencia" aparezcan (pago de contado, sin meses), el
front necesita, como mínimo:

1. **`tipo_pago`** → una fila por forma de pago:
   - `formaPago = "Efectivo"`
   - `formaPago = "Transferencia"`
   - (Tarjeta solo si van a cobrar con terminal — esa sí usa `mostrarMeses`/meses)

2. **`pagos_y_meses`** → al menos una fila por cada `tipo_pago` de contado, apuntando a un
   `meses_intereses` de "1 pago / de contado". **Este es el `pagosYMesesId` que el front manda
   al cobrar** (`POST /v1/ventas/save`). Sin esta fila, el tipo de pago aparece pero **no se
   puede cobrar** (el front no tiene un `pagosYMesesId` que enviar).

Shape que el front espera de vuelta (por si quieren validar el resultado):
```jsonc
// GET /v1/pagos/opciones-estructuradas  →  data: IOpcionPagoDto[]
[
  {
    "tipoPagoId": 1,
    "formaPago": "Efectivo",
    "mostrarMeses": false,      // contado → false
    "pagosYMesesId": 10,        // ⬅️ imprescindible, es lo que se envía al cobrar
    "requiereTerminal": false,
    "opciones": []              // vacío en contado; solo se llena para tarjeta/meses
  },
  {
    "tipoPagoId": 2,
    "formaPago": "Transferencia",
    "mostrarMeses": false,
    "pagosYMesesId": 11,
    "requiereTerminal": false,
    "opciones": []
  }
]
```

**Los nombres de tabla/columna (`tipo_pago`, `pagos_y_meses`, `meses_intereses`) son inferidos
de los modelos del front** (`ITipoPago`, `IPagosYMeses`, `IMesesIntereses` en
`IPago.model.ts`). El back debe mapearlos a su esquema real — la estructura lógica
(TipoPago → PagosYMeses → MesesIntereses) sí es la correcta.

**Criterio de éxito:** tras insertar los datos, `opciones-estructuradas` deja de devolver `[]` y
en `/variantes/venta-directa` el dropdown "💳 Forma de pago" muestra al menos Efectivo y
Transferencia → el botón "Cobrar" se habilita al seleccionar una.
