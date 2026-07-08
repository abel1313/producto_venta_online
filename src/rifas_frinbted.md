# Módulo de Rifas — Especificación para Frontend

> **Backend:** `proyecto-key (9091)` — contexto `/mis-productos`  
> Todas las respuestas vienen envueltas en `{ response: <dato>, message: null }` (ResponseGeneric)

---

## 1. Visión general

El módulo tiene dos tipos de rifa con comportamiento distinto:

| | DIARIA | MENSUAL |
|---|---|---|
| **Boletos por concursante** | Siempre 1 | Calculado por historial de compras del mes |
| **Al vencer `fechaHoraLimite`** | Stock devuelto, inactiva, NO recuperable | Solo se desactiva |
| **Puede reiniciarse** | Solo si está activa (mid-prueba) | Sí |
| **Historial** | Solo lectura | Solo lectura |

Cada rifa tiene su propio switch "Es prueba", independiente de las demás.

---

## 2. Entidades clave (referencia rápida)

### ConfigurarRifa
```json
{
  "id": 1,
  "fechaHoraLimite": "2026-07-01T23:59:00",
  "activa": true,
  "tipo": "DIARIA",
  "mesReferencia": null,
  "esPrueba": false
}
```

### ConfigurarRifaResumenDto (lo que devuelven los listados)
```json
{
  "id": 1,
  "fechaHoraLimite": "2026-07-01T23:59:00",
  "activa": true,
  "totalVariantes": 3,
  "variantesSorteadas": 1,
  "tipo": "DIARIA",
  "mesReferencia": null,
  "esPrueba": false
}
```

### ConfigurarRifaVariante (premio de cada turno)
```json
{
  "id": 10,
  "palabraClave": "A",
  "giroGanador": 3,
  "orden": 1,
  "permitirNuevos": false,
  "stockReservado": 1,
  "variante": {
    "id": 55,
    "nombreProducto": "Pantalón slim fit",
    "descripcion": "Talla 28 azul marino",
    "talla": "28",
    "color": "Azul marino",
    "marca": "Levi's",
    "precio": 450.00,
    "stock": 5,
    "imagenBase64": "..."
  }
}
```

### Concursante
```json
{
  "id": 200,
  "nombre": "Juan",
  "apellidoPaterno": "Pérez",
  "telefono": "5512345678",
  "palabraClave": "A",
  "ordenDesde": 1,
  "boletosBase": 3,
  "boletos": 1,
  "descartado": false,
  "agregadoEnPrueba": false,
  "clientePedidoId": 88,
  "configurarRifa": { "id": 1 }
}
```

---

## 3. Pantalla de configuración — flujo paso a paso

> Las rifas existentes (historial, búsqueda) van en la pantalla de **Búsqueda de rifas** (sección 5). Esta pantalla es solo para crear y configurar rifas nuevas. NO mostrar lista de rifas activas aquí.

### Paso 1 — Abrir la pantalla

Muestra por defecto un bloque vacío para configurar la primera rifa. Si el usuario quiere retomar una rifa existente, debe ir a **Búsqueda de rifas** (sección 5).

---

### Paso 2 — Configurar la primera rifa

Cada bloque de rifa tiene esta estructura:

```
┌─────────────────────────────────────────────────────┐
│  [Switch: Es prueba]                                │
│                                                     │
│  Tipo: [DIARIA | MENSUAL]   Fecha límite: [____]   │
│  (si MENSUAL) Mes de referencia: [2026-06]          │
│                                                     │
│  ── Variantes (premios) ──────────────────────────  │
│  [Buscar variante]   palabraClave [__]              │
│  giroGanador [__]    orden [__]                     │
│  [+ Agregar variante]                               │
│                                                     │
│  ┌──────────┐  ┌──────────┐                         │
│  │ imagen   │  │ imagen   │                         │
│  │ nombre   │  │ nombre   │  ...                    │
│  │ precio   │  │ precio   │                         │
│  │ [quitar] │  │ [quitar] │                         │
│  └──────────┘  └──────────┘                         │
│                                                     │
│  ── Concursantes ─────────────────────────────────  │
│  [Registrar uno por uno]  [Importar del mes*]       │
│                                                     │
│  Juan Pérez   palabraClave=A  [editar] [quitar]     │
│  María López  palabraClave=A  [editar] [quitar]     │
│                                                     │
│                        [Guardar rifa]               │
└─────────────────────────────────────────────────────┘
  * Importar del mes solo aparece si tipo = MENSUAL
```

**Botón "Guardar rifa"** — crea la rifa en BD:
```
POST /v1/configurarRifa/save
{ "fechaHoraLimite": "2026-07-01T23:59:00", "tipo": "DIARIA", "esPrueba": false }
```
Guardar el `id` devuelto para usarlo al agregar variantes y concursantes.

**Agregar variante** (el stock se descuenta automáticamente):
```
POST /v1/configurarRifaVariante/save
{ configurarRifaId, varianteId, palabraClave, giroGanador, orden }
```
El response incluye `imagenBase64` — mostrar tarjeta con imagen, nombre y precio.

**Quitar variante** (el stock regresa automáticamente):
```
DELETE /v1/configurarRifaVariante/{id}
```

**Registrar concursante uno por uno:**
```
POST /v1/concursante/registrar
{ nombre, apellidoPaterno, telefono, palabraClave, ordenDesde, configurarRifa: { id } }
```
DIARIA → backend asigna `boletos=1` siempre. MENSUAL → calcula boletos por historial de compras.

**Importar del mes (solo MENSUAL):**
1. `GET /v1/concursante/clientesPorMes?mes=2026-06` → lista de clientes
2. Usuario selecciona cuáles y con qué `palabraClave`
3. `POST /v1/concursante/importarDePedidos` → backend calcula boletos, omite duplicados

**Editar concursante:** `PUT /v1/concursante/{id}`  
**Quitar concursante:** `DELETE /v1/concursante/{id}` (falla si ya participó en sorteo)

> Cada acción persiste en BD al momento. Si el usuario cierra y regresa, los datos ya están.

---

### Paso 3 — Agregar otra rifa (opcional)

Botón **"+ Agregar otra rifa"** al pie del bloque actual:

1. El bloque actual se **colapsa** mostrando solo su resumen:
   ```
   Rifa 1 — DIARIA  📅 19/jun  3 variantes  45 concursantes  [PRUEBA]  [▶ Expandir]
   ```
2. Aparece un **nuevo bloque vacío** para la siguiente rifa (misma estructura del Paso 2)

Desde el resumen colapsado se puede expandir para volver a editar en cualquier momento.

En el bloque de concursantes de la nueva rifa aparece:

**Botón "Copiar todos de la rifa anterior"** (solo cuando hay al menos una rifa configurada antes):
- Pide la `palabraClave` que tendrán los copiados en esta rifa
- Llama a:
```
POST /v1/concursante/copiarDeRifa
{ "rifaOrigenId": 1, "rifaDestinoId": 2, "palabraClave": "B" }
```
- **Aditivo y sin duplicados:** conserva los que ya estaban, solo agrega los que faltan
- **Se puede pulsar varias veces:** si se agregan más en la rifa origen, al pulsar de nuevo solo trae los nuevos
- Con más de dos rifas, el selector de origen puede apuntar a cualquiera de las anteriores
- Para rifas DIARIAS el backend asigna `boletos=1` a todos los copiados

---

### Paso 4 — Terminar configuración

Botón **"Terminar configuración"** — solo frontend. Las rifas ya están en BD. Lleva a ejecución o cierra el wizard.

---

## 4. Pantalla de ejecución — flujo paso a paso

### Paso 1 — Abrir la pantalla

```
GET /v1/configurarRifa/activas
```

Mostrar cada rifa como panel colapsable. La primera expandida por defecto:

```
┌──────────────────────────────────────────────────────┐
│  Rifa 1 — DIARIA  📅 19/jun  [🟢 Activa]  [▼]      │
│  ┌────────────────────────────────────────────────┐  │
│  │  ... contenido expandido ...                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Rifa 2 — DIARIA  📅 19/jun  [🟢 Activa]  [▶]      │
│  Rifa 3 — MENSUAL 📅 01/jul  [🟢 Activa]  [▶]      │
└──────────────────────────────────────────────────────┘
```

Para cada rifa que se expanda:
```
GET /v1/ganadorRifa/estado/{configurarRifaId}
```

El toggle `[▼]`/`[▶]` es solo lógica frontend. Los giros de cada rifa son independientes.

---

### Paso 2 — Vista de la rifa antes de girar

Con los datos del estado mostrar:

- Tipo + badge **"MODO PRUEBA"** si `esPrueba=true`
- **Card de la variante actual** (`varianteActual.variante`): imagen, nombre, descripción, talla, color, marca, precio
- **Al hacer clic en la imagen o en el card** → modal de detalle:
  - Imagen grande (`imagenBase64`)
  - Nombre, descripción, talla, color, marca, precio
  - Botón cerrar
- Progreso: `giroActual / giroGanador`
- Contador de elegibles
- Botón **"Girar"**

---

### Paso 3 — Girar

**Si `esPrueba=true`**, mostrar modal **antes** de llamar al backend:

> ⚠️ **Esta rifa es de PRUEBA**  
> Los resultados no son definitivos.  
> [Entendido — continuar]

Solo al confirmar se llama:
```
POST /v1/ganadorRifa/sortear/{configurarRifaId}
```

**Response `SorteoResultadoDto`:**
```json
{
  "response": {
    "descartado": true,
    "rifaTerminada": false,
    "concursante": { "nombre": "Juan", "apellidoPaterno": "Pérez", "boletos": 1 },
    "varianteActual": { ... }
  }
}
```

**Lógica de UI:**

| `descartado` | `rifaTerminada` | Qué mostrar |
|---|---|---|
| `true` | `false` | "No ganador — eliminado" → botón "Siguiente tirada" |
| `false` | `false` | "¡GANADOR! Juan Pérez" → botón "Continuar al siguiente premio" |
| `false` | `true` | "¡GANADOR! — Rifa completada" → sin más acciones |

> El resultado también llega por **WebSocket** a `/topic/ruleta` con el mismo DTO.

---

### Paso 4 — Pasar al siguiente premio

Cuando `descartado=false` y `rifaTerminada=false`:

```
POST /v1/ganadorRifa/continuarVariante/{configurarRifaId}?modo=RESTANTES
```

| Modo | Qué hace |
|---|---|
| `RESTANTES` | Los no eliminados pasan al siguiente premio |
| `CERO` | Todos se resetean y pasan al siguiente premio |
| `NUEVOS` | Solo los concursantes nuevos (nueva `palabraClave`) participan |

Response: `SorteoEstadoDto` actualizado → volver al Paso 2.

---

### Paso 5 — Rifa completada o vencida

**Completada** (`rifaTerminada=true`, `esPrueba=false`):
- Backend desactiva automáticamente (`activa=false`)
- Desaparece del panel de activas → opción "Ver historial"

**DIARIA vencida** (scheduler 2 AM):
- Desaparece del panel de activas
- Stock devuelto automáticamente
- No se puede reiniciar → crear nueva si se necesita

**MENSUAL vencida** (scheduler 2 AM):
- Desaparece del panel de activas
- Recuperable: `POST /v1/ganadorRifa/reiniciar/{rifaId}?completo=false`

---

### Regla de reiniciar para rifas DIARIAS

| Estado | `activa` | ¿Reiniciar? | Cuándo |
|---|---|---|---|
| Mid-prueba | `true` | ✅ Sí | Usuario resetea giros, cambia variante o agrega concursantes |
| Vencida por scheduler | `false` | ❌ No | Scheduler pasó sin terminar la rifa |
| Completada | `false` | ❌ No | Se declaró el último ganador |

**Ocultar el botón "Reiniciar" cuando `tipo=DIARIA && activa=false`.** El backend también lanza error si se intenta.

---

## 5. Pantalla de búsqueda de rifas

> Las rifas **no** se muestran en la pantalla de configuración. El listado/búsqueda de rifas existentes va aquí.

### Filtros

**Selector de tipo:** `DIARIA` | `MENSUAL`

- **DIARIA** → selector de día (default: hoy). Puede haber varias rifas DIARIAS el mismo día.
- **MENSUAL** → selector de mes (default: mes actual)

### Llamadas según filtro

```
// DIARIA — día específico (default: hoy)
GET /v1/configurarRifa/buscar?tipo=DIARIA&desde=2026-06-19&hasta=2026-06-19

// DIARIA — rango de fechas
GET /v1/configurarRifa/buscar?tipo=DIARIA&desde=2026-06-01&hasta=2026-06-30

// MENSUAL — mes específico (default: mes actual)
GET /v1/configurarRifa/buscar?tipo=MENSUAL&mesReferencia=2026-06

// MENSUAL — rango de fechas
GET /v1/configurarRifa/buscar?tipo=MENSUAL&desde=2026-01-01&hasta=2026-06-30
```

> No llamar `buscar` sin parámetros — devuelve solo activas de hoy, no sirve para búsqueda general.

### Resultado por rifa

Cada item es un `ConfigurarRifaResumenDto`. Mostrar:
- Fecha límite, tipo, badge "PRUEBA" si `esPrueba=true`
- Progreso: `variantesSorteadas / totalVariantes`
- Badge de estado:

| `activa` | `variantesSorteadas == totalVariantes` | Badge |
|---|---|---|
| `true` | `false` | 🟢 Activa |
| `false` | `true` | ⚫ Completada |
| `false` | `false` | 🔴 Vencida |

**Botones:**
- **"Ir a ejecución"** — solo si `activa=true`
- **"Ver detalle"** — siempre (historial en modo lectura)
- **"Recuperar"** — solo si `activa=false && tipo=MENSUAL`

### Ver detalle / historial

```
GET /v1/ganadorRifa/estado/{configurarRifaId}
```

El campo `historial` contiene cada variante sorteada con su ganador.

Para rifas **inactivas**: modo solo lectura, sin botones de girar ni reiniciar.

**Recuperar MENSUAL:**
```
POST /v1/ganadorRifa/reiniciar/{rifaId}?completo=false
```
- `completo=false` → resetea `descartado`, conserva concursantes
- `completo=true` → borra todos los concursantes

---

## 6. Ciclo de vida

```
CREADA (activa=true)
  │
  ├─ [configurar variantes y concursantes]
  ├─ [ejecutar ruleta]
  │
  ├─ DIARIA — vence (scheduler 2 AM):
  │     → activa=false, stock devuelto
  │     → NO reiniciable
  │     → solo lectura en búsqueda
  │     → para otro día: crear nueva
  │
  ├─ MENSUAL — vence (scheduler 2 AM):
  │     → activa=false (sin devolver stock)
  │     → reiniciable con /reiniciar
  │
  └─ Cualquier tipo — último ganador declarado (esPrueba=false):
        → activa=false automático
        → MENSUAL: reiniciable | DIARIA: NO
```

---

## 7. Referencia de endpoints

### ConfigurarRifa
| Método | URL | Descripción |
|---|---|---|
| `POST` | `/v1/configurarRifa/save` | Crear rifa |
| `PUT` | `/v1/configurarRifa/{id}` | Editar fecha/tipo/mesReferencia |
| `PUT` | `/v1/configurarRifa/{id}/esPrueba` | `{ "esPrueba": true }` |
| `GET` | `/v1/configurarRifa/activas` | Rifas con `activa=true` |
| `GET` | `/v1/configurarRifa/activas/hoy` | Activas cuya fecha límite es hoy |
| `GET` | `/v1/configurarRifa/buscar` | `?tipo=&desde=&hasta=&mesReferencia=` |
| `DELETE` | `/v1/configurarRifa/deleteBy/{id}` | Eliminar rifa |

### ConfigurarRifaVariante (premios)
| Método | URL | Descripción |
|---|---|---|
| `POST` | `/v1/configurarRifaVariante/save` | Agregar variante (descuenta stock) |
| `GET` | `/v1/configurarRifaVariante/porRifa/{rifaId}` | Listar variantes de una rifa |
| `GET` | `/v1/configurarRifaVariante/palabrasClave/{rifaId}` | Palabras clave en uso |
| `PUT` | `/v1/configurarRifaVariante/{id}/palabraClave` | `{ "palabraClave": "B" }` |
| `DELETE` | `/v1/configurarRifaVariante/{id}` | Eliminar variante (devuelve stock) |

### Concursante
| Método | URL | Descripción |
|---|---|---|
| `POST` | `/v1/concursante/registrar` | Registrar uno por uno |
| `POST` | `/v1/concursante/importarDePedidos` | Importar desde pedidos del mes (MENSUAL) |
| `POST` | `/v1/concursante/copiarDeRifa` | Copiar de una rifa a otra |
| `GET` | `/v1/concursante/clientesPorMes?mes=2026-06` | Clientes del mes |
| `GET` | `/v1/concursante/porRifa/{rifaId}` | Todos los concursantes de una rifa |
| `GET` | `/v1/concursante/elegibles/{rifaId}` | Solo los no descartados |
| `PUT` | `/v1/concursante/{id}` | Editar nombre/teléfono/palabraClave/ordenDesde |
| `DELETE` | `/v1/concursante/{id}` | Eliminar (falla si ya participó en sorteo) |

### Sorteo
| Método | URL | Descripción |
|---|---|---|
| `GET` | `/v1/ganadorRifa/estado/{rifaId}` | Estado actual + historial |
| `POST` | `/v1/ganadorRifa/sortear/{rifaId}` | Ejecutar un giro |
| `POST` | `/v1/ganadorRifa/continuarVariante/{rifaId}?modo=X` | Pasar al siguiente premio |
| `POST` | `/v1/ganadorRifa/reiniciar/{rifaId}?completo=false` | Reiniciar (MENSUAL o DIARIA activa) |

> `reiniciar` lanza error si `tipo=DIARIA && activa=false`. Ocultar el botón en ese caso.

---

## 8. Reglas de negocio

1. **`palabraClave`** — determina en qué variante compite cada concursante. `palabraClave="A"` → solo entra al sorteo de la variante con `palabraClave="A"`.

2. **`ordenDesde`** — concursante con `ordenDesde=2` no participa en la variante 1, solo desde la 2 en adelante.

3. **Boletos** — DIARIA: siempre 1 (todos igual). MENSUAL: calculado por historial; más boletos = más probabilidad.

4. **Stock** — al agregar variante se descuenta 1 del producto. Al quitar variante o al vencer una DIARIA, ese 1 regresa.

5. **DIARIA vencida** — `activa=false`, stock devuelto, no reiniciable, solo historial. Para otro día crear nueva.

6. **WebSocket** — `/topic/ruleta` para recibir `SorteoResultadoDto` en tiempo real (pantalla de espectadores).

---

## 9. Solo frontend (sin endpoint)

- Toggle `[▼]`/`[▶]` por rifa en ejecución
- Colapsar/expandir bloques en configuración
- Botón "Terminar configuración" (rifas ya en BD)
- Modal de detalle de variante (datos en `varianteActual.variante`)
- Modal advertencia prueba antes de girar (leer `esPrueba` del estado)
- Ocultar "Reiniciar" cuando `tipo=DIARIA && activa=false`
- Ocultar "Importar del mes" cuando `tipo=DIARIA`
- Ocultar "Ir a ejecución" cuando `activa=false`
- Ocultar "Recuperar" cuando `tipo=DIARIA && activa=false`

---

## 10. Scope confirmado

### ✅ Arrancar de inmediato
1. Quitar lista "Rifas activas — retomar" de `agregar-rifa` — va en búsqueda (sección 5)
2. Modal Swal antes de `sortear()` cuando `esPrueba=true` — ver sección 4 / Paso 3
3. Ocultar botones de reiniciar cuando `tipo=DIARIA && activa=false` — ver sección 4 / Regla reiniciar

### ✅ También en scope
4. **"+ Agregar otra rifa"** — botón que colapsa la rifa actual y abre un nuevo bloque. Backend listo (`POST /v1/concursante/copiarDeRifa` ya existe). Solo trabajo de UI — ver sección 3 / Pasos 3-4.
5. **Actualizar `buscar-rifa`** — selector DIARIA/MENSUAL + filtro fecha + badges 🟢⚫🔴 + botones condicionales — ver sección 5.
