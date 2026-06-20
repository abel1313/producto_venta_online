# Análisis Front — Módulo Rifas
## Para compartir con el equipo de backend

---

## 1. Fragmento exacto — Sección A de `agregar-rifa.component.html`

```html
<form [formGroup]="configForm" class="rf-body">
  <div class="rf-row">
    <div class="rf-field rf-field--flex1">
      <label class="rf-label">Tipo de rifa</label>
      <select class="rf-input" formControlName="tipo">
        <option value="MENSUAL">Mensual</option>
        <option value="DIARIA">Diaria</option>
      </select>
    </div>
    <div class="rf-field rf-field--flex1" *ngIf="configForm.value.tipo === 'MENSUAL'">
      <label class="rf-label">Mes de referencia</label>
      <input class="rf-input" type="month" formControlName="mesReferencia" />
    </div>
  </div>
  <div class="rf-field">
    <label class="rf-label">Fecha y hora límite de registro</label>
    <input class="rf-input" type="datetime-local" formControlName="fechaHoraLimite" />
  </div>

  <!-- esPrueba: SOLO visible antes de crear la rifa (*ngIf="!rifaConfig?.id") -->
  <!-- Una vez que se guarda (rifaConfig.id existe), este checkbox desaparece -->
  <label class="rf-switch-label" *ngIf="!rifaConfig?.id">
    <div class="rf-switch">
      <input type="checkbox" formControlName="esPrueba" />
      <span class="rf-switch__slider"></span>
    </div>
    Crear como rifa de prueba (demo antes del sorteo real)
  </label>

  <!-- Botón guardar: SOLO visible si la rifa aún no existe -->
  <button *ngIf="!rifaConfig?.id" class="rf-btn rf-btn--primary"
          (click)="guardarConfiguracion()"
          [disabled]="configForm.invalid || savingConfig">
    💾 Guardar configuración
  </button>

  <!-- Una vez guardada, el botón se reemplaza por un badge informativo -->
  <div *ngIf="rifaConfig?.id" class="rf-saved-badge">
    ✅ Configuración guardada — Rifa #{{ rifaConfig!.id }}
    <span class="rf-saved-badge__hint">Completa las secciones B y C</span>
  </div>
</form>
```

---

## 2. Método `guardarConfiguracion()` — solo POST, no existe PUT de config

```typescript
// ÚNICO método para guardar la configuración general.
// Siempre hace POST (crea). NO existe actualizarConfiguracion() ni PUT del objeto completo.
guardarConfiguracion(): void {
  if (this.configForm.invalid) return;
  this.savingConfig = true;

  const tipo: TipoRifa = this.configForm.value.tipo;
  this.rifaService.configurarRifa({
    fechaHoraLimite: this.configForm.value.fechaHoraLimite,
    activa: true,
    tipo,
    mesReferencia: tipo === 'MENSUAL' ? (this.configForm.value.mesReferencia || null) : null,
    esPrueba: !!this.configForm.value.esPrueba
  }).subscribe({
    next: res => {
      this.rifaConfig = res;
      this.savingConfig = false;
      this.cargarVariantesRifa();
      this.cargarConcursantes();
    },
    error: err => {
      this.errorConcursante = err?.error?.mensaje ?? 'No se pudo guardar la configuración.';
      this.savingConfig = false;
    }
  });
}

// El ÚNICO PUT disponible en el servicio relacionado a configurarRifa es:
//   PUT /v1/configurarRifa/{id}/esPrueba   →  body: { esPrueba: boolean }
// Solo cambia el flag prueba/real. No existe un PUT para fecha, tipo, mesReferencia, etc.
```

---

## 3. Endpoint usado para cambiar modo prueba

```
PUT /v1/configurarRifa/{rifaId}/esPrueba
Body: { "esPrueba": false }
Response: IConfigurarRifa actualizado
```

El back debe limpiar los giros de demo y reactivar los descartados cuando `esPrueba` cambia de `true` a `false`.
El front muestra un `confirm()` antes de llamarlo para advertir al usuario que el sorteo se reinicia.

---

## 4. Tabla completa de endpoints — Rifa Mensual (`RifaMesComponent`)

| # | Método | Endpoint | Body / Params | Para qué sirve en el front |
|---|--------|----------|---------------|---------------------------|
| 1 | POST | `/v1/configurarRifa/save` | `{ fechaHoraLimite, activa, tipo: 'MENSUAL', mesReferencia, esPrueba }` | Crear la rifa mensual |
| 2 | PUT  | `/v1/configurarRifa/{id}/esPrueba` | `{ esPrueba: boolean }` | Cambiar entre modo prueba y modo real |
| 3 | GET  | `/v1/concursante/clientesPorMes?mes=YYYY-MM` | — | Listar clientes que compraron ese mes |
| 4 | POST | `/v1/concursante/importarDePedidos` | `{ configurarRifaId, palabraClave, ordenDesde, mes, clientes[] }` | Importar participantes en batch desde pedidos del mes |
| 5 | POST | `/v1/concursante/registrar` | `{ nombre, apellidoPaterno, telefono, palabraClave, configurarRifaId }` | Agregar un participante manual (uno a uno) |
| 6 | DELETE | `/v1/concursante/{id}` | — | Eliminar participante. Back devuelve 400 si ya participó en un sorteo |
| 7 | GET  | `/v1/concursante/porRifa/{rifaId}` | — | Lista completa de participantes de la rifa |
| 8 | GET  | `/v1/concursante/elegibles/{rifaId}` | — | Solo los que aún pueden ganar (`descartado = false`) |
| 9 | POST | `/v1/configurarRifaVariante/save` | `{ configurarRifaId, varianteId, palabraClave, giroGanador, permitirNuevos }` | Guardar el premio a sortear (la variante elegida) |
| 10 | POST | `/v1/ganadorRifa/sortear/{rifaId}` | — | Ejecutar un giro de la ruleta → devuelve ganador o descartado |
| 11 | POST | `/v1/ganadorRifa/reiniciar/{rifaId}?completo=false` | — | Reiniciar el sorteo: limpia `descartado=true`, conserva participantes. `completo=true` borraría todo |
| 12 | GET  | `/v1/ganadorRifa/estado/{rifaId}` | — | Estado completo para retomar: `configurarRifa`, `elegibles`, `varianteActual`, `ganador`, `rifaTerminada` |
| 13 | GET  | `/variantes/v1/buscar?termino=&pagina=&size=` | — | Buscar variantes del catálogo para seleccionar el premio (paso 3) |

---

## 5. Shape de los responses más importantes

### `GET /v1/ganadorRifa/estado/{rifaId}` — IEstadoRifa
```json
{
  "configurarRifa": {
    "id": 38,
    "fechaHoraLimite": "2026-06-20T10:00:00",
    "tipo": "MENSUAL",
    "mesReferencia": "2026-05",
    "esPrueba": true,
    "activa": true
  },
  "totalConcursantes": 12,
  "totalVariantes": 1,
  "varianteNumeroActual": 1,
  "varianteActual": {
    "id": 5,
    "palabraClave": "RIFA",
    "giroGanador": 3,
    "permitirNuevos": false,
    "variante": { "id": 101, "nombreProducto": "...", "talla": "M", "color": "Rojo" }
  },
  "giroActual": 1,
  "giroGanador": 3,
  "elegibles": [ /* IConcursante[] */ ],
  "descartados": [ /* IConcursante[] */ ],
  "ganador": null,
  "rifaTerminada": false,
  "historial": []
}
```

### `POST /v1/concursante/importarDePedidos` — Response
```json
{
  "importados": [ /* IConcursante[] */ ],
  "omitidosYaRegistrados": [ { "clientePedidoId": 1, "nombre": "Juan Pérez" } ],
  "omitidosSinNombre": [ /* IClientePedido[] sin nombre */ ]
}
```

### `POST /v1/ganadorRifa/sortear/{rifaId}` — IGanadorRifa
```json
{
  "id": 12,
  "nombre": "María",
  "apellidoPaterno": "López",
  "telefono": "5512345678",
  "palabraClave": "RIFA",
  "descartado": false,
  "esGanador": true
}
```

---

## 6. Diagnóstico — qué falta en "Rifa variante" vs "Rifa mensual"

### Problema A — Control de modo prueba no visible durante el sorteo
En `RifaMesComponent` los pasos **Ruleta** y **Ganador** muestran un checkbox "🧪 Es de prueba"
que permite ver y cambiar el modo en cualquier momento del sorteo.

En `AgregarRifaComponent` el control de modo prueba está **solo en Sección A** (el form inicial).
Una vez que el usuario pasa a `paso = 'ruleta'`, no hay forma de ver ni cambiar el flag.
Si la rifa está en modo prueba y el usuario quiere reiniciarla, tiene que volver atrás manualmente.

**Lo que necesita el front (ya implementado en RifaMes, falta replicar en AgregarRifa):**
- Checkbox `[(ngModel)]/[checked]="rifaConfig?.esPrueba"` en el layout de la ruleta y en la pantalla del ganador
- Al desmarcarlo → `confirm()` + llamada a `PUT /v1/configurarRifa/{id}/esPrueba` con `false`
- Si hay `varianteRifa` configurada y se pasa a real → limpiar `elegibles`, llamar `getElegibles()`, reiniciar la ruleta

### Problema B — "Rifa variante" permite crear rifas MENSUAL (debería solo DIARIA)
El selector `tipo` en Sección A muestra "Mensual" y "Diaria".
La intención es que `AgregarRifaComponent` sea exclusivo para rifas de variantes (tipo `DIARIA` o multi-premio),
y que las rifas `MENSUAL` solo se creen desde `RifaMesComponent`.

**Fix necesario en el front:** quitar la opción `MENSUAL` del selector en `AgregarRifaComponent`
(o fijarlo a `DIARIA` sin mostrar el select).

---

## 7. Lo que el back necesita confirmar / implementar

Para poder actualizar la configuración de una rifa existente (fecha, mesReferencia, etc.) se necesita:

```
PUT /v1/configurarRifa/{id}
Body: { fechaHoraLimite?, tipo?, mesReferencia?, activa? }
Response: IConfigurarRifa actualizado
```

Actualmente **no existe** este endpoint. Solo existe:
- `POST /v1/configurarRifa/save` → crea (no actualiza)
- `PUT /v1/configurarRifa/{id}/esPrueba` → solo cambia el flag prueba

Si el back implementa `PUT /v1/configurarRifa/{id}`, el front puede mostrar el formulario prellenado
al retomar una rifa incompleta y permitir editar la fecha límite antes de continuar.

---

## 8. Diagnóstico de bugs reportados (2026-06-18)

### Bug 1 — Campos muestran "Mensual" al retomar aunque se cambió a "Diaria / variante"

**Flujo que reproduce el bug:**
1. Usuario crea rifa con tipo `MENSUAL` → se guarda en BD con `tipo = MENSUAL`
2. Retoma la rifa en `AgregarRifaComponent` → `_retomar()` parchea el form con `tipo = MENSUAL` (correcto, viene de BD)
3. Usuario cambia el select a `DIARIA` en la UI
4. **Problema**: el botón "Guardar configuración" tiene `*ngIf="!rifaConfig?.id"` — ya no existe porque la rifa ya tiene id. El cambio de tipo NO se envía al backend. La BD sigue con `MENSUAL`.
5. Usuario agrega variantes y concursantes, llega a ruleta, sale.
6. Retoma de nuevo → `_retomar()` vuelve a leer de BD → `tipo = MENSUAL` → siempre regresa al valor original.

**Causa raíz:** No existe endpoint `PUT /v1/configurarRifa/{id}` para persistir cambios de configuración. El form se puede editar visualmente pero los cambios se pierden al salir.

**Fix front (mientras no exista el PUT del back):**
Cuando `rifaConfig?.id` existe y la rifa está incompleta (sin variantes o sin concursantes), mostrar un botón "✏️ Editar configuración" que llame al PUT cuando esté disponible. Mientras tanto, documentar que el tipo no se puede cambiar una vez creada la rifa.

**Fix back necesario:** implementar `PUT /v1/configurarRifa/{id}` (ver sección 7).

---

### Bug 2 — "Rifa por variante" no muestra la opción de prueba

**Causa:** En `AgregarRifaComponent`, el checkbox `esPrueba` y el botón "Guardar configuración" tienen ambos `*ngIf="!rifaConfig?.id"`. Una vez que la rifa existe, desaparecen completamente.

Cuando el usuario retoma la rifa y llega al paso `ruleta`, no hay ningún control visible para ver o cambiar el modo prueba.

**Contraste con `RifaMesComponent`:** ese componente sí muestra el badge/toggle de prueba en los pasos de ruleta y ganador.

**Fix front — qué agregar en `AgregarRifaComponent`:**

En el layout del paso `ruleta` (y en `transicion`), agregar el mismo bloque que ya existe en `RifaMes`:

```html
<!-- Badge modo prueba — visible en ruleta y transición -->
<div *ngIf="rifaConfig?.esPrueba" class="rf-prueba-banner">
  🧪 Esta rifa es de prueba
  <button class="rf-btn rf-btn--sm" (click)="toggleModoPrueba()" [disabled]="cambiandoModoPrueba">
    Pasar a modo real
  </button>
</div>

<!-- Toggle también cuando NO está en prueba, para permitir activarla -->
<div *ngIf="!rifaConfig?.esPrueba && rifaConfig?.id" class="rf-prueba-off">
  <button class="rf-btn rf-btn--sm rf-btn--secondary" (click)="toggleModoPrueba()" [disabled]="cambiandoModoPrueba">
    🧪 Activar modo prueba
  </button>
</div>
```

El método `toggleModoPrueba()` ya existe en el componente (línea ~240) y ya llama a `PUT /v1/configurarRifa/{id}/esPrueba`. Solo falta que sea visible en el paso correcto.

---

### Checklist — Rifa mensual ya configurada: qué revisar antes de iniciar

Para una rifa `tipo = MENSUAL` que ya tiene configuración guardada:

| # | Qué verificar | Dónde |
|---|---------------|-------|
| 1 | ¿Tiene al menos 1 variante (premio) configurada? | Sección B → chips de variantes |
| 2 | ¿Tiene al menos 1 concursante? | Sección C → tabla de participantes |
| 3 | ¿`esPrueba = false`? Si es de prueba, decidir si se pasa a modo real antes de girar | Badge naranja en sección A (si está visible) o badge en la ruleta en RifaMes |
| 4 | ¿La `fechaHoraLimite` todavía no venció? (el scheduler la desactiva a las 2 AM si venció) | Revisar la fecha mostrada en el badge "Configuración guardada" |
| 5 | ¿`activa = true`? Si el scheduler la desactivó, hay que reactivarla manualmente | En `buscar-rifa`, si no aparece en "rifas activas", buscar por fecha en "buscar" |

Si los 5 están OK → botón "Iniciar sorteo" / `irARuleta()` está habilitado. El back tomará los elegibles y emitirá el primer giro.

---

## 9. Bug — "El plazo de registro cerró" cuando la hora límite debía ser medianoche

### Síntoma
```
POST /v1/concursante/registrar
→ 400 { "mensaje": "El plazo de registro cerró el 2026-06-18T12:13" }
```
El usuario dice que configuró medianoche, pero el back rechaza desde el mediodía.

### Causa raíz
El input HTML usa `type="datetime-local"` que opera en **formato 24 horas**.
- `12:13` en 24h = **mediodía** (12:13 PM)
- Medianoche en 24h = **`00:13`**

El usuario probablemente escribió `12:13` pensando en "las 12 de la noche" (formato 12h AM),
pero el browser lo guardó como `2026-06-18T12:13` (mediodía). El back almacena exactamente lo
que llega: la validación en `ConcursanteServiceImpl` línea 85 es correcta.

```java
// Línea 85 — correcto, el problema es el valor almacenado, no la comparación
if (!forzar && LocalDateTime.now().isAfter(config.getFechaHoraLimite())) {
    throw new Exception("El plazo de registro cerró el " + config.getFechaHoraLimite());
}
```

### Fix inmediato (sin tocar código)
Actualizar el `fechaHoraLimite` de la rifa afectada vía el endpoint que ya existe:

```
PUT /v1/configurarRifa/39
Body: { "fechaHoraLimite": "2026-06-19T00:00:00" }
```
> Usar `2026-06-19T00:00:00` para "medianoche al final del día 18" (inicio del 19).
> Si es medianoche al inicio del día 18, usar `2026-06-18T00:00:00` (ya pasó).

### Workaround temporal mientras se corrige la fecha
Llamar con `?forzar=true` en el endpoint de registro omite la validación de hora:
```
POST /v1/concursante/registrar?forzar=true
```

### Fix preventivo en el front
Mostrar una ayuda junto al campo `datetime-local` que indique:
> "Medianoche = 00:00 · Mediodía = 12:00"

O forzar en el front que si el usuario selecciona la hora, se guarde siempre `T23:59:59` del día
elegido para evitar la confusión (depende de si la intención es "hasta el final del día").

---

## 10. Tabla de errores por endpoint — qué puede esperar el front

Todos los errores devuelven:
```json
{ "mensaje": "...", "code": 400|404|409|422, "data": null, "lista": null }
```
El HTTP status también refleja el tipo de error (400, 404, 409, 422).

### `/v1/configurarRifa`

| Endpoint | HTTP | `mensaje` posible |
|----------|------|-------------------|
| `POST /save` | 400 | Errores de BD / duplicado |
| `PUT /{id}` | 400 | "Configuración de rifa no encontrada" |
| `PUT /{id}` | 400 | "No se puede cambiar el tipo de rifa porque ya tiene variantes configuradas. Elimina las variantes primero." |
| `PUT /{id}/esPrueba` | 400 | "Configuración de rifa no encontrada" |
| `GET /activas` | — | Sin errores (devuelve lista vacía si no hay) |
| `GET /activas/hoy` | — | Sin errores |
| `GET /buscar` | — | Sin errores |

### `/v1/concursante`

| Endpoint | HTTP | `mensaje` posible |
|----------|------|-------------------|
| `POST /registrar` | 400 | "El nombre es requerido" (validación @NotBlank) |
| `POST /registrar` | 400 | "Debe indicar la configuración de rifa" |
| `POST /registrar` | 400 | "Configuración de rifa no encontrada" |
| `POST /registrar` | 400 | "Esta rifa ya fue sorteada o está inactiva" |
| `POST /registrar` | 400 | "El plazo de registro cerró el {fechaHoraLimite}" — ver sección 9 |
| `POST /registrar?forzar=true` | — | Omite la validación de hora |
| `POST /importarDePedidos` | 400 | "Configuración de rifa no encontrada" |
| `POST /importarDePedidos` | 400 | "Esta rifa no está activa" |
| `DELETE /{id}` | 400 | "Concursante no encontrado" |
| `DELETE /{id}` | 400 | "No se puede eliminar: el concursante ya participó en un sorteo" |
| `PUT /{id}` | 400 | "Concursante no encontrado" |
| `GET /porRifa/{id}` | — | Sin errores (lista vacía si no hay) |
| `GET /elegibles/{id}` | — | Sin errores |
| `GET /clientesPorMes` | — | Sin errores |

### `/v1/ganadorRifa`

| Endpoint | HTTP | `mensaje` posible |
|----------|------|-------------------|
| `POST /sortear/{rifaId}` | 400 | "Configuración de rifa no encontrada" |
| `POST /sortear/{rifaId}` | 400 | "Esta rifa ya fue completada o está inactiva" |
| `POST /sortear/{rifaId}` | 400 | "La rifa no tiene variantes configuradas" |
| `POST /sortear/{rifaId}` | 400 | "Todas las variantes ya fueron sorteadas" |
| `POST /sortear/{rifaId}` | 400 | "No hay concursantes elegibles para la variante con palabraClave='...'" |
| `POST /continuarVariante/{rifaId}?modo=` | 400 | "Rifa no encontrada" |
| `POST /continuarVariante/{rifaId}?modo=` | 400 | "No hay siguiente variante" |
| `POST /continuarVariante/{rifaId}?modo=` | 400 | "Modo inválido: X. Usar RESTANTES, CERO o NUEVOS" |
| `GET /estado/{rifaId}` | 400 | "Rifa no encontrada" |
| `POST /reiniciar/{rifaId}` | 400 | "Rifa no encontrada" |
| `POST /reiniciar/{rifaId}?completo=false` | 200 | "Rifa reiniciada (concursantes conservados)" |
| `POST /reiniciar/{rifaId}?completo=true` | 200 | "Rifa reiniciada completamente (concursantes eliminados)" |

### `/v1/configurarRifaVariante` (heredado de AbstractController)

| Endpoint | HTTP | `mensaje` posible |
|----------|------|-------------------|
| `POST /save` | 409 | Duplicado en BD |
| `DELETE /deleteBy/{id}` | 400 | No encontrado |

---

## 11. Resumen de fixes necesarios (prioridad)

| Prioridad | Componente | Fix | Complejidad |
|-----------|-----------|-----|-------------|
| 🔴 Alta | `AgregarRifaComponent` (HTML) | Agregar badge/toggle de `esPrueba` en paso `ruleta` y `transicion` | Bajo — copiar bloque de RifaMes |
| 🔴 Alta | `AgregarRifaComponent` (HTML) | Quitar opción `MENSUAL` del selector de tipo (o hardcodear `DIARIA`) | Bajo — 1 línea HTML |
| 🟡 Media | Backend — `ConfigurarRifaControllerImpl` | Implementar `PUT /v1/configurarRifa/{id}` para editar fecha/tipo/mesReferencia | Medio — endpoint nuevo |
| 🟡 Media | `AgregarRifaComponent` (TS + HTML) | Cuando retoma y rifa incompleta: mostrar botón "✏️ Editar" que llame al PUT nuevo | Medio — depende del backend |
| 🟢 Baja | `buscar-rifa.component.ts` | Si rifa tiene `tipo = MENSUAL` pero fue creada en AgregarRifa → ya no aplica si se quita la opción MENSUAL del selector | Se resuelve solo con fix de Prioridad Alta |

---

## 10. Cambios realizados en el Backend (2026-06-18)

### Nuevo endpoint: `PUT /v1/configurarRifa/{id}`

**Archivo nuevo:** `src/main/java/com/ventas/key/mis/productos/models/ConfigurarRifaPatchDto.java`
- DTO con 3 campos opcionales: `fechaHoraLimite`, `tipo`, `mesReferencia`

**Modificado:** `ConfiguracionRifaServiceImpl.java` — método `actualizarConfiguracion(int id, ConfigurarRifaPatchDto patch)`
- Solo parchea los campos que vienen en el body (null = no cambia)
- Si `tipo` cambia y la rifa ya tiene variantes → lanza error 400 (no se puede cambiar tipo con variantes existentes)
- Si `tipo` cambia a algo distinto de MENSUAL → limpia `mesReferencia` automáticamente
- No toca `esPrueba` ni `activa` (esos tienen sus propios endpoints)

**Modificado:** `ConfigurarRifaControllerImpl.java` — endpoint `PUT /{id}`
- Devuelve `ConfigurarRifa` completa actualizada
- 400 si la rifa no existe o si se intenta cambiar tipo con variantes

**SecurityConfig:** sin cambios — el wildcard `/v1/configurarRifa/**` ya cubría la ruta.

### Contrato del endpoint para el front

```
PUT /v1/configurarRifa/{id}
Body (todos opcionales, solo enviar los que cambian):
{
  "fechaHoraLimite": "2026-07-05T11:00:00",
  "tipo": "DIARIA",
  "mesReferencia": "2026-06"
}
Response 200: IConfigurarRifa completa actualizada
Response 400: { "mensaje": "No se puede cambiar el tipo..." }
```

---

## 11. Cambios pendientes en el Front (para implementar)

### Fix 1 — Badge/toggle de `esPrueba` en paso `ruleta` (PRIORIDAD ALTA)
**Archivo:** `agregar-rifa.component.html`

Agregar este bloque dentro del layout del paso `ruleta` y del paso `transicion`.
El método `toggleModoPrueba()` ya existe en el `.ts`, solo falta que sea visible:

```html
<!-- Pegar en el paso ruleta y en transicion, junto al encabezado de la sección -->
<div class="rf-prueba-banner" *ngIf="rifaConfig?.esPrueba">
  🧪 Esta rifa es de prueba
  <button class="rf-btn rf-btn--sm" (click)="toggleModoPrueba()" [disabled]="cambiandoModoPrueba">
    Pasar a modo real
  </button>
</div>
<div *ngIf="!rifaConfig?.esPrueba && rifaConfig?.id" class="rf-prueba-off">
  <button class="rf-btn rf-btn--sm rf-btn--secondary" (click)="toggleModoPrueba()" [disabled]="cambiandoModoPrueba">
    🧪 Activar modo prueba
  </button>
</div>
```

---

### Fix 2 — Quitar MENSUAL del selector en `AgregarRifaComponent` (PRIORIDAD ALTA)
**Archivo:** `agregar-rifa.component.html`

Reemplazar el `<select>` de tipo por un campo fijo, o simplemente quitar la opción MENSUAL:

```html
<!-- ANTES (quitar): -->
<select class="rf-input" formControlName="tipo">
  <option value="MENSUAL">Mensual</option>
  <option value="DIARIA">Diaria</option>
</select>

<!-- DESPUÉS: -->
<select class="rf-input" formControlName="tipo">
  <option value="DIARIA">Por variante / Diaria</option>
</select>
```

También en el `.ts`, cambiar el valor por defecto del form:
```typescript
// ngOnInit — configForm:
tipo: ['DIARIA' as TipoRifa, Validators.required],   // antes era 'MENSUAL'
```

---

### Fix 3 — Permitir editar configuración al retomar una rifa incompleta (PRIORIDAD MEDIA)
**Archivos:** `agregar-rifa.component.html` + `agregar-rifa.component.ts`

El backend ya tiene el endpoint `PUT /v1/configurarRifa/{id}` (implementado hoy).
Falta el lado del front:

**HTML** — reemplazar el badge "Configuración guardada" por un bloque que permita editar:
```html
<!-- Reemplazar el div rf-saved-badge cuando la rifa está incompleta: -->
<div *ngIf="rifaConfig?.id" class="rf-saved-badge">
  ✅ Rifa #{{ rifaConfig!.id }}
  <button class="rf-btn rf-btn--sm rf-btn--secondary" (click)="editandoConfig = !editandoConfig">
    ✏️ Editar fecha / tipo
  </button>
</div>

<div *ngIf="rifaConfig?.id && editandoConfig" class="rf-edit-config">
  <!-- Mismo form de fecha y tipo, pero con botón que llama actualizarConfiguracion() -->
  <button (click)="actualizarConfiguracion()" [disabled]="configForm.invalid || savingConfig">
    💾 Guardar cambios
  </button>
</div>
```

**TS** — agregar en el servicio `rifa.service.ts`:
```typescript
actualizarConfiguracion(id: number, patch: Partial<IConfigurarRifa>): Observable<IConfigurarRifa> {
  return this.http.put<IConfigurarRifa>(`${this.url}/v1/configurarRifa/${id}`, patch);
}
```

**TS** — agregar en `agregar-rifa.component.ts`:
```typescript
editandoConfig = false;

actualizarConfiguracion(): void {
  if (!this.rifaConfig?.id || this.configForm.invalid) return;
  this.savingConfig = true;
  const tipo: TipoRifa = this.configForm.value.tipo;
  this.rifaService.actualizarConfiguracion(this.rifaConfig.id, {
    fechaHoraLimite: this.configForm.value.fechaHoraLimite,
    tipo,
    mesReferencia: tipo === 'MENSUAL' ? (this.configForm.value.mesReferencia || null) : null,
  }).subscribe({
    next: res => { this.rifaConfig = res; this.savingConfig = false; this.editandoConfig = false; },
    error: err => {
      this.errorConcursante = err?.error?.mensaje ?? 'No se pudo actualizar la configuración.';
      this.savingConfig = false;
    }
  });
}
```
