# Rifa por Día — Propuesta

> Basada en lo que ya quedó implementado para la rifa mensual (`RIFA_MENSUAL_PROPUESTA.md`,
> `RIFA_MENSUAL_FLUJO.md`). La buena noticia: casi todo el motor ya sirve tal cual.

---

## 1. Resumen

La diaria reutiliza el 100% del motor de variantes/sorteo/modo-prueba de la mensual. Lo único que
cambia es **de dónde salen los participantes**:

- **Mensual**: se importan en bloque desde los pedidos/ventas del mes (`importarDePedidos`), con
  `boletos` calculados por unidades compradas.
- **Diaria**: se agregan **uno por uno, manualmente**, ya sea:
  - (a) un cliente que **ya está registrado** en la app (lo buscas por nombre y usas sus datos), o
  - (b) alguien sin registro, capturando sus datos a mano.

En ambos casos se usa el mismo endpoint `POST /v1/concursante/registrar` — la única diferencia es si
el front pre-llena el formulario con datos de un cliente existente o no.

---

## 2. Qué se reutiliza tal cual (sin tocar código)

| Necesidad | Endpoint | Nota |
|---|---|---|
| Crear la sesión del día | `POST /v1/configurarRifa/save` | `tipo: "DIARIA"`, `mesReferencia: null` |
| Agregar premios/variantes | `POST /v1/configurarRifaVariante/save` | igual que mensual |
| Buscar cliente registrado | `GET /v1/clientes/buscar?nombre=...` | **ya existe**, no es de rifas — `ClienteBusquedaDto` |
| Agregar participante | `POST /v1/concursante/registrar` | igual que mensual, sin `clientePedidoId` |
| Editar / eliminar participante | `PUT` / `DELETE /v1/concursante/{id}` | igual que mensual |
| Modo prueba (banner en front) | `PUT /v1/configurarRifa/{id}/esPrueba` | igual que mensual |
| Traer la rifa de hoy | `GET /v1/configurarRifa/activas/hoy` | ya devuelve **cualquier `tipo`** activo hoy, sin filtrar |
| Buscar rifas diarias de otro día | `GET /v1/configurarRifa/buscar?tipo=DIARIA&desde=&hasta=` | ya soporta filtrar por `tipo` |
| Sorteo (multi-giro, descartes, ganador) | `sortear` / `continuarVariante` / `estado` | mismo motor |

---

## 3. Flujo

1. **Crear sesión**: `POST /v1/configurarRifa/save`
   ```json
   { "fechaHoraLimite": "2026-06-11T20:00:00", "activa": true, "tipo": "DIARIA", "esPrueba": false }
   ```
2. **Agregar premios**: igual que mensual.
3. **Agregar participantes** (repetir uno por uno):
   - Si es cliente conocido: `GET /v1/clientes/buscar?nombre=Maria` → el front toma
     `nombrePersona/apeidoPaterno/numeroTelefonico` del resultado y los manda en el paso siguiente.
   - `POST /v1/concursante/registrar`:
     ```json
     { "nombre": "Maria", "apellidoPaterno": "Lopez", "telefono": "555...",
       "palabraClave": "BOLSA", "configurarRifa": { "id": 12 } }
     ```
   - Sin `clientePedidoId` → `boletos = 1` para todos (oportunidades iguales).
4. **Editar/eliminar** errores de captura: igual que mensual (`PUT`/`DELETE /v1/concursante/{id}`).
5. **Modo prueba**: `PUT /v1/configurarRifa/{id}/esPrueba { "esPrueba": true|false }` — mismo banner
   "⚠️ Esta rifa es de prueba" y mismo comportamiento de limpieza al pasar a real.
6. **Sorteo**: igual que mensual.

---

## 4. Punto resuelto — boletos

- **Mensual**: `boletos` = cantidad total de productos comprados en el mes (`mesReferencia`).
- **Diaria**: `boletos = 1` para todos, siempre (1 boleto por día, sin importar compras).

Esto ya es el comportamiento por defecto si el front **no envía `clientePedidoId`** en `/registrar`
→ **no se necesita ningún cambio de código**, todo lo de la sección 2 ya funciona tal cual.
