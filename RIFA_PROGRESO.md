# Progreso — Implementación del módulo de rifas

Contrato de referencia: `contrato_front.md` · Diseño: `RIFA_REDISENO.md`

---

## Estado general

| Capa | Estado |
|---|---|
| Modelos (interfaces) | ⬜ Pendiente |
| Servicio (`rifa.service.ts`) | ⬜ Pendiente |
| Pantalla configurar rifa | ⬜ Pendiente |
| Pantalla ruleta | ⬜ Pendiente |
| Pantalla transición entre variantes | ⬜ Pendiente |
| Pantalla resumen final | ⬜ Pendiente |
| Listado de rifas (`buscar-rifa`) | ⬜ Pendiente |

---

## Detalle por tarea

### ✅ Completado

- [x] **Modelos** — todos los interfaces actualizados al contrato confirmado
  - `configurar-rifa.model.ts` → `IConfigurarRifa` (+ totalVariantes/variantesSorteadas), `IVarianteRifaResumen` (con codigoBarras, imagenBase64, nombreProducto), `IConfigurarRifaVariante`, `IConfigurarRifaVarianteRequest`
  - `concursante.model.ts` → `IConcursante` (apellidoPaterno, palabraClave, clientePedidoId), `IClientePedido`, `IImportarDePedidosRequest`
  - `ganador-rifa.model.ts` → `IGanadorRifa` con `rifaTerminada` y `configurarRifaVariante`
  - `estado-rifa.model.ts` → `IEstadoRifa` completo con `varianteActual`, `totalVariantes`, `historial` tipado

- [x] **Servicio** — `rifa.service.ts` con los 15 endpoints del contrato, todos devuelven el tipo correcto via `map(r => r.data)`

### 🔄 En progreso

*(nada)*

### ✅ Completado (continuación)

- [x] **Pantalla configurar** completa — Sección A (fecha/guardar), B (buscar variante → card con imagen/nombre/stock/código/palabra/giro + hover-modal + reordenar + eliminar), C (form participante con select de palabras clave + importar desde pedidos del mes con tabla editable), botón "Iniciar rifa"
- [x] **Pantalla ruleta** — header con chips de progreso + badge giro, canvas ruleta, panel elegibles/descartados, botón "Agregar participante" si `permitirNuevos`, modal participante
- [x] **Pantalla transición** — nombre ganador + variante ganada, tres botones de modo (RESTANTES / CERO / NUEVOS), form inline para agregar nuevos en modo NUEVOS
- [x] **Pantalla resumen** — historial por variante con ganador, botones reiniciar/nueva rifa
- [x] **SCSS** — todas las clases nuevas: `rf-variantes-grid`, `rf-var-card`, `rf-hover-modal`, `rf-importar`, `rf-cliente-row`, `rf-tabla`, `rf-modos`, `rf-modo-btn`, `rf-nuevos-form`, etc.
- [x] **`IVarianteResumen`** — añadido campo `nombreProducto` (viene del endpoint de búsqueda)

- [x] **Listado buscar-rifa** — tabs hoy/todas, cards con progreso barra `variantesSorteadas/totalVariantes`, botón retomar

### ⬜ Pendiente

*(todo completado — pendiente prueba en navegador con backend real)*

---

## Log de cambios

| Fecha | Archivo | Cambio |
|---|---|---|
| 2026-05-07 | `models/configurar-rifa.model.ts` | Reescrito con contrato confirmado |
| 2026-05-07 | `models/concursante.model.ts` | Añadido `apellidoPaterno`, `palabraClave`, `IClientePedido`, `IImportarDePedidosRequest` |
| 2026-05-07 | `models/ganador-rifa.model.ts` | Añadido `rifaTerminada`, `configurarRifaVariante` |
| 2026-05-07 | `models/estado-rifa.model.ts` | Reescrito con `varianteActual`, `historial`, `totalVariantes` |
| 2026-05-07 | `service/rifa.service.ts` | Reescrito con los 15 endpoints del contrato |
| 2026-05-07 | `variante/models/variante.model.ts` | Añadido `nombreProducto` a `IVarianteResumen` |
| 2026-05-07 | `agregar-rifa.component.ts` | Reescrito completo con todos los pasos |
| 2026-05-07 | `agregar-rifa.component.html` | Reescrito con Sec.A/B/C + ruleta + transición + resumen |
| 2026-05-07 | `agregar-rifa.component.scss` | Añadidas todas las clases nuevas |
| 2026-05-07 | `buscar-rifa.component.ts` | Implementado con tabs + progreso |
| 2026-05-07 | `buscar-rifa.component.html` | Cards con barra de progreso |
| 2026-05-07 | `buscar-rifa.component.scss` | `.br-progress` añadido |
