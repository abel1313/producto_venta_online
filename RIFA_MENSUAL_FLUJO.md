# Rifa Mensual — Flujo completo para el front (ya implementado)

> Esto es el flujo de punta a punta tal como quedó implementado (ver `RIFA_MENSUAL_PROPUESTA.md` para el
> diseño y `CAMBIOS_FRONT.md` para el detalle de cada endpoint). Revísalo y dime si falta algo antes de
> pasárselo al equipo de front.

---

## Paso 0 — Pantalla principal (lo que ya existe)

`GET /v1/configurarRifa/activas/hoy` → lista de rifas activas con `fechaHoraLimite` de hoy.
Cada item trae `tipo`, `mesReferencia`, `esPrueba`. Si `esPrueba=true` → mostrar banner
**"⚠️ Esta rifa es de prueba"**.

¿Necesitas otra rifa que no es de hoy (ej. la mensual programada para dentro de 2 semanas)?
`GET /v1/configurarRifa/buscar?tipo=MENSUAL&mesReferencia=2026-06` (o por rango de fechas
`?desde=&hasta=`).

---

## Paso 1 — Crear la sesión de la rifa mensual

`POST /v1/configurarRifa/save`
```json
{
  "fechaHoraLimite": "2026-07-05T11:00:00",
  "activa": true,
  "tipo": "MENSUAL",
  "mesReferencia": "2026-06",
  "esPrueba": false
}
```
- `fechaHoraLimite` = día/hora del **sorteo** (puede ser del mes siguiente a `mesReferencia`,
  pero siempre **antes de las 12:00** de ese día).
- `mesReferencia` = de qué mes salen los compradores (solo informativo).
- `esPrueba` puede empezar en `true` si el admin va a hacer una demo antes del sorteo real.

→ devuelve `{ id: 9, ... }`. Guardar ese `id`.

---

## Paso 2 — Agregar los premios (variantes a rifar)

Igual que hoy, una vez por premio:
`POST /v1/configurarRifaVariante/save` → `{ configurarRifaId, varianteId, palabraClave, giroGanador, orden, permitirNuevos }`

---

## Paso 3 — Traer compradores del mes (pedidos + ventas, ya unificado)

`GET /v1/concursante/clientesPorMes?mes=2026-06`

Devuelve `List<ClientePedidoDto>`: `clientePedidoId`, `nombre`, `apellidoPaterno`, `telefono`,
`sinRegistro`. Si `sinRegistro=true` y `nombre=""` → es una venta de mostrador sin datos del cliente;
el admin completa `nombre`/`telefono` en el front antes de importar (no se manda nada al back todavía).

---

## Paso 4 — Importar en bloque

`POST /v1/concursante/importarDePedidos`
```json
{
  "configurarRifaId": 9,
  "palabraClave": "BOLSA",
  "ordenDesde": 1,
  "mes": "2026-06",
  "clientes": [ /* lista del paso 3, con nombre/telefono completados si hacía falta */ ]
}
```

**Response:**
```json
{
  "importados": [ { "id": 201, "nombre": "María López", "palabraClave": "BOLSA", "agregadoEnPrueba": false } ],
  "omitidosYaRegistrados": [ { "clientePedidoId": 102, "nombre": "Carlos Ruiz" } ]
}
```
- `boletos`/`boletosBase` se calculan internamente (unidades compradas en `mesReferencia`, ajustadas
  por cumplimiento histórico). **No se muestran al público.**
- Si el admin da clic 2 veces, los que ya estaban no se duplican — aparecen en
  `omitidosYaRegistrados` para avisar "estos N ya estaban registrados".

---

## Paso 5 — Agregar manualmente a alguien que faltó

`POST /v1/concursante/registrar?forzar=`
```json
{ "nombre": "Pedro", "telefono": "555...", "palabraClave": "BOLSA", "configurarRifa": { "id": 9 } }
```
- Sin `clientePedidoId` → queda con `boletos=1` (peso normal).
- Si la rifa está en `esPrueba=true` en este momento, este concursante queda con
  `agregadoEnPrueba=true` automáticamente.

---

## Paso 6 — Ver la lista de participantes (2 listas)

`GET /v1/concursante/porRifa/9` → `List<Concursante>`, cada uno con `agregadoEnPrueba`.

El front separa en 2 listas con ese mismo response:
- **Participantes** (`agregadoEnPrueba=false`): importados + agregados fuera de modo prueba.
- **Agregados durante la prueba** (`agregadoEnPrueba=true`): los que se metieron durante la demo.

---

## Paso 7 — Corregir errores de captura

- `PUT /v1/concursante/{id}` → body parcial `{ nombre?, apellidoPaterno?, telefono?, palabraClave?, ordenDesde? }`. Solo manda los campos que cambian.
- `DELETE /v1/concursante/{id}` → lo quita. Si ya salió en algún giro (`ganador_rifa`), responde
  `400 { "mensaje": "No se puede eliminar: el concursante ya participó en un sorteo" }` — el front debe
  mostrar ese mensaje y no permitir el borrado (puede usar `descartar` si lo que quiere es excluirlo del
  resto del sorteo, eso no cambió).

---

## Paso 8 — (Opcional) Demo en vivo para el público

1. Activar modo prueba (si no se creó ya así): `PUT /v1/configurarRifa/9/esPrueba { "esPrueba": true }`
   → el front muestra el banner "⚠️ Esta rifa es de prueba".
2. `POST /v1/ganadorRifa/sortear/9` — funciona exactamente igual que el sorteo real (multi-giro,
   descartes, ganador, ponderado por boletos). Se guarda normal en `ganador_rifa`/historial para que
   el admin pueda mostrarle al público cómo se ve el resultado.
3. `GET /v1/ganadorRifa/estado/9` — para ver elegibles/descartados/ganador de la demo en cualquier
   momento.
4. Repetir 2-3 las veces que el admin quiera.

---

## Paso 9 — Pasar a sorteo real

`PUT /v1/configurarRifa/9/esPrueba { "esPrueba": false }`

Internamente (un solo llamado):
- Borra los giros de la demo (`ganador_rifa` + `historial_rifa_variante` de esa rifa).
- Todos los concursantes vuelven a `descartado=false` (elegibles), **incluidos** los agregados durante
  la demo (`agregadoEnPrueba=true` no se borra, solo se queda como dato histórico de quién se agregó
  cuándo).
- Reactiva la rifa (`activa=true`).

El front deja de mostrar el banner de prueba — para el público esta rifa ahora **es la real**.

---

## Paso 10 — Sorteo real

```
POST /v1/ganadorRifa/sortear/9                          (repetir hasta que salga ganador de la variante)
POST /v1/ganadorRifa/continuarVariante/9?modo=RESTANTES|CERO|NUEVOS   (si hay más premios)
GET  /v1/ganadorRifa/estado/9                            (ver estado/historial en cualquier momento)
```
Estos giros **sí quedan guardados como resultado oficial**.

---

## Paso 11 — Cierre

No hay nada que hacer manualmente: si `sortear` termina la última variante, `activa` pasa a `false`
automáticamente. Si nadie sorteó y pasó la `fechaHoraLimite`, el scheduler diario (2 AM) la desactiva
sola al día siguiente (`desactivarVencidas`).

---

## ¿Falta algo?

Cosas que **no** quedaron cubiertas porque no se mencionaron — dime si aplican:

1. **Reportes**: ¿necesitas un endpoint para ver el historial de ganadores de rifas mensuales pasadas
   (ej. "ganadores de mayo")? Hoy `GET /ganadorRifa/estado/{id}` es por rifa individual; no hay un
   listado agregado por mes.
2. **Notificación al ganador**: ¿se le avisa por algún canal (WhatsApp/SMS/correo) automáticamente, o
   es 100% manual (el admin lo contacta)?
3. **Validación de `palabraClave` al registrar manualmente** (paso 5): hoy no se valida contra las
   `palabraClave` de las variantes de esa rifa — si el admin escribe mal la palabra clave, el
   concursante queda "huérfano" (no aparece en ningún sorteo) sin error. ¿Vale la pena validarlo?
