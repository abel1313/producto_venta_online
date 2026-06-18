# Rifa Mensual/Diaria + Modo Prueba — Cambios implementados en el front (2026-06-12)

> Resumen de la integración de los cambios de back descritos en `RIFA_MENSUAL_FLUJO.md` y
> `RIFA_DIARIA_PROPUESTA.md` (ver también `CAMBIOS_FRONT.md`). Se integraron **sobre los
> componentes existentes** (`AgregarRifaComponent`, `RifaMesComponent`, `BuscarRifaComponent`),
> sin crear pantallas nuevas, tal como se acordó. Verificado con `ng build --configuration=development`
> sin errores (incluye chequeo estricto de templates Angular).

---

## 1. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/rifas/models/configurar-rifa.model.ts` | + `TipoRifa`, `tipo`, `mesReferencia`, `esPrueba` |
| `src/app/rifas/models/concursante.model.ts` | + `agregadoEnPrueba`, `IOmitidoYaRegistrado`, `IImportarDePedidosResponse` |
| `src/app/rifas/service/rifa.service.ts` | + `setEsPrueba`, `buscarConfiguraciones`, `actualizarConcursante`; cambios en `configurarRifa`, `eliminarConcursante`, `importarDePedidos` |
| `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` | form tipo/mesReferencia/esPrueba, modo prueba, edición de concursantes, flujo rifa diaria |
| `src/app/rifas/agregar-rifa/agregar-rifa.component.html` | banner modo prueba, alertas, 2 tablas participantes, edición inline, buscador de cliente |
| `src/app/rifas/rifa-mes/rifa-mes.component.ts` | `configurarRifa` con tipo MENSUAL + `mesReferencia`, nuevo shape de `importarDePedidos` |
| `src/app/rifas/rifa-mes/rifa-mes.component.html` | alerta de clientes omitidos al importar |
| `src/app/rifas/rifa-mes/rifa-mes.component.scss` | clase `.rm-alert` / `.rm-alert--warn` |
| `src/app/rifas/buscar-rifa/buscar-rifa.component.ts` | badges tipo/prueba, pestaña "Buscar" con `buscarConfiguraciones` |
| `src/app/rifas/buscar-rifa/buscar-rifa.component.html` | badges por card, formulario de filtro |
| `src/app/rifas/buscar-rifa/buscar-rifa.component.scss` | estilos del filtro y badges |
| `CLAUDE.md` | nueva sección "MÓDULO RIFAS — RIFA MENSUAL/DIARIA + MODO PRUEBA..." |

---

## 2. Modelos

### `configurar-rifa.model.ts`
```typescript
export type TipoRifa = 'MENSUAL' | 'DIARIA';

export interface IConfigurarRifa {
  id?: number;
  fechaHoraLimite: string;
  activa: boolean;
  totalVariantes?: number;
  variantesSorteadas?: number;
  tipo?: TipoRifa;
  mesReferencia?: string | null;   // 'YYYY-MM'
  esPrueba?: boolean;
}

export interface IConfigurarRifaRequest {
  fechaHoraLimite: string;
  activa: boolean;
  tipo?: TipoRifa;
  mesReferencia?: string | null;
  esPrueba?: boolean;
}
```

### `concursante.model.ts`
```typescript
export interface IConcursante {
  // ...campos existentes
  agregadoEnPrueba?: boolean;
}

export interface IOmitidoYaRegistrado {
  clientePedidoId: number | null;
  nombre: string;
}

export interface IImportarDePedidosResponse {
  importados: IConcursante[];
  omitidosYaRegistrados: IOmitidoYaRegistrado[];
}
```

---

## 3. RifaService — cambios

| Método | Antes | Ahora |
|---|---|---|
| `configurarRifa(data)` | body sin tipo/mesReferencia/esPrueba | body incluye `tipo`, `mesReferencia`, `esPrueba` |
| `setEsPrueba(rifaId, esPrueba)` | no existía | `PUT /v1/configurarRifa/{id}/esPrueba` → `{ esPrueba }` |
| `buscarConfiguraciones({tipo?, mesReferencia?, desde?, hasta?})` | no existía | `GET /v1/configurarRifa/buscar?...` |
| `eliminarConcursante(id)` | `DELETE /v1/concursante/delete` (body=id) | `DELETE /v1/concursante/{id}` (path param) — puede responder `400 { mensaje }` |
| `actualizarConcursante(id, data)` | no existía | `PUT /v1/concursante/{id}` (campos parciales) |
| `importarDePedidos(data)` | devolvía `IConcursante[]` | devuelve `{ importados, omitidosYaRegistrados }` |

---

## 4. AgregarRifaComponent — cómo quedó

### 4.1 Sección A — Datos generales
- Selector **Tipo de rifa**: `Mensual` / `Diaria` (`configForm.tipo`).
- Campo **Mes de referencia** (`type="month"`) — solo visible si `tipo === 'MENSUAL'`.
- Checkbox **"Crear como rifa de prueba"** (`esPrueba`) — solo visible antes de guardar (mientras `!rifaConfig?.id`).
- Subtítulo de la card, una vez guardada: `Rifa #{{id}} guardada ✅ — Mensual` o `— Diaria`.

### 4.2 Banner "Modo prueba"
- Si `rifaConfig.esPrueba === true`, aparece un banner amarillo:
  > ⚠️ Esta rifa es de prueba — [Pasar a sorteo real]
- El botón llama `toggleModoPrueba()` → `RifaService.setEsPrueba(id, false)`. El backend limpia los
  sorteos demo y restaura (un-descarta) a los participantes. Al responder, se recarga la lista de
  concursantes (`cargarConcursantes()`).

### 4.3 Importar del mes
- El botón **"📅 Importar del mes"** ahora tiene `*ngIf="!esRifaDiaria"` — oculto en rifas diarias
  (no tiene sentido importar pedidos de un mes en una rifa del día).
- `importarClientes()` ahora consume `{ importados, omitidosYaRegistrados }`:
  - `concursantes` se llena con `res.importados`.
  - Si `omitidosYaRegistrados.length > 0`, aparece alerta ℹ️:
    > {{n}} cliente(s) ya estaban registrados y no se importaron de nuevo: Juan Pérez, María López...
    (texto armado con el getter `omitidosNombres`, dismissable con `cerrarOmitidosImport()`).

### 4.4 Eliminar participante — manejo de error 400
- `eliminarConcursante(c)` ahora limpia `errorConcursante` antes de llamar al servicio.
- Si el backend responde `400 { mensaje: "No se puede eliminar: el concursante ya participó en un sorteo" }`,
  se muestra una alerta ⚠️ con ese mensaje (dismissable con ✕).

### 4.5 Editar participante inline
- Nuevo `editConcursanteForm` (mismos campos/validadores que `concursanteForm`: nombre, apellidoPaterno,
  telefono, palabraClave).
- Cada fila de la tabla tiene un botón **✏️** → `iniciarEdicion(c)` carga los valores del concursante
  en `editConcursanteForm` y muestra el mini-form en lugar de la fila.
- **💾 Guardar** → `guardarEdicionConcursante(c)` → `PUT /v1/concursante/{id}` (palabraClave se normaliza
  a mayúsculas) y actualiza la fila localmente (spread).
- **Cancelar** → `cancelarEdicion()` cierra el form sin guardar.

### 4.6 Listas de participantes — split por `agregadoEnPrueba`
Se reemplazó la tabla única de "Participantes activos" por **dos tablas**, usando getters:
```typescript
get concursantesParticipantes(): IConcursante[] {
  return this.concursantesActivos.filter(c => !c.agregadoEnPrueba);
}
get concursantesEnPrueba(): IConcursante[] {
  return this.concursantesActivos.filter(c => c.agregadoEnPrueba);
}
```
- **Tabla "Participantes"** → `concursantesParticipantes` (la real, normal).
- **Tabla "🧪 Agregados durante la prueba ({{n}})"** → `concursantesEnPrueba` — solo aparece si hay
  al menos uno. Ambas tablas tienen las mismas columnas (#, nombre, teléfono, palabra clave, boletos)
  y los mismos botones ✏️ / ✕, con su propio bloque de edición inline.
- La sección "❌ Descartados" (colapsable, `<details>`) no cambió.

### 4.7 Rifa Diaria (`tipo === 'DIARIA'`)
```typescript
get esRifaDiaria(): boolean {
  return (this.rifaConfig?.tipo ?? this.configForm?.value?.tipo) === 'DIARIA';
}
```
- Dentro del form **"Agregar participante"** (sección C), si `esRifaDiaria` se muestra un buscador:
  > 🔍 Buscar cliente registrado por nombre…
- `onBuscarCliente(event)` → debounce 400ms → `ClienteService.buscarClientes(termino, 0, 10)` →
  `clientesBusqueda: IClienteBusquedaDto[]`.
- Al hacer clic en un resultado, `seleccionarCliente(c)` precarga `nombre`, `apellidoPaterno` y
  `telefono` en `concursanteForm` (el usuario solo elige la `palabraClave` y registra).
- El registro sigue usando `registrarConcursante()` (mismo endpoint que el alta manual mensual).
  Como no se envía `clientePedidoId`, el backend asigna `boletos = 1` automáticamente — no requirió
  cambios adicionales en el front.

---

## 5. RifaMesComponent — cómo quedó

### 5.1 `crearRifaEImportar()`
```typescript
this.rifaService.configurarRifa({
  fechaHoraLimite: this.fechaHoraLimite,
  activa: true,
  tipo: 'MENSUAL',
  mesReferencia: this.mesSeleccionado,
  esPrueba: false
}).subscribe({
  next: rifa => {
    this.rifaConfig = rifa;
    this.rifaService.importarDePedidos({ ... }).subscribe({
      next: res => {
        this.concursantes = res.importados;
        this.omitidosImport = res.omitidosYaRegistrados ?? [];
        this.paso = 'participantes';
      }
    });
  }
});
```

### 5.2 Alerta de omitidos
- En "Paso 2: Participantes", si `omitidosImport.length > 0` se muestra (clase nueva `.rm-alert--warn`):
  > ℹ️ {{n}} cliente(s) ya estaban registrados y no se importaron de nuevo: Juan Pérez, María López...
  (texto armado con el getter `omitidosNombres`), dismissable con `cerrarOmitidosImport()`.
- `nueva()` resetea `omitidosImport = []` junto con el resto del estado.

---

## 6. BuscarRifaComponent — cómo quedó

### 6.1 Badges por card
Cada `br-card` ahora muestra, junto al badge "Activa":
- ☀️ **Diaria**, o
- 📅 **Mensual · 2026-06** (si tiene `mesReferencia`)
- 🧪 **Prueba** (si `r.esPrueba === true`)

### 6.2 Nueva pestaña "🔎 Buscar"
- Tercera pestaña junto a "📅 Rifas de hoy" y "📋 Todas las activas".
- Formulario de filtro:
  - **Tipo**: Todos / Mensual / Diaria
  - **Mes de referencia** (solo si tipo = Mensual)
  - **Desde** / **Hasta** (fechas)
  - Botón **Buscar** → `buscarConfiguraciones({tipo, mesReferencia, desde, hasta})` → llena `rifasBuscadas`
- Mensajes de "vacío" diferenciados por pestaña:
  - hoy: "No hay rifas programadas para hoy"
  - todas: "No hay rifas activas"
  - buscar (sin buscar aún): "Define un filtro y presiona Buscar"
  - buscar (sin resultados): "No se encontraron rifas con esos filtros"

---

## 7. Notas técnicas

- **Arrow functions en templates**: Angular no permite `=>` dentro de `{{ }}` (error `NG5002:
  Bindings cannot contain assignments`). Por eso `omitidosImport.map(o => o.nombre).join(', ')`
  se expuso como getter `omitidosNombres` en TS, tanto en `AgregarRifaComponent` como en
  `RifaMesComponent`, y se usa `{{ omitidosNombres }}` en el HTML.
- Verificado con `ng build --configuration=development` (incluye `strictTemplates: true`) — sin
  errores ni warnings nuevos.

---

## 8. Pendiente / fuera de alcance

Preguntas abiertas al equipo de back (de `RIFA_MENSUAL_FLUJO.md`, sección "¿Falta algo?"), no
abordadas en esta integración:
- Reportes de la rifa.
- Notificación al ganador.
- Validación de `palabraClave` en el backend.

---

## 9. Fixes posteriores — pruebas en vivo (2026-06-12)

Tras probar el flujo "📅 Rifa mensual" se reportaron 3 problemas, ya corregidos:

### 9.1 Error silencioso al agregar concursante
Si la `fechaHoraLimite` de la rifa ya pasó, el backend rechaza el alta de concursante con
`400 { mensaje }`, pero el front no mostraba nada. Ahora se reutiliza el patrón
`errorConcursante` (alerta `--warn` dismissable) en:
- `AgregarRifaComponent.agregarConcursante()` e `importarClientes()`.
- `RifaMesComponent.agregarManual()`, `eliminarConcursante()` y `crearRifaEImportar()`
  (nuevo campo `errorConcursante` + alerta en "Paso 2: Participantes").

### 9.2 Solo se veía un "premio" (variante) en la grilla
Causa: `IConfigurarRifaVariante.variante` no era opcional; si el backend devolvía un item sin
`variante`, el template lanzaba error al acceder a `v.variante.nombreProducto` y el
`*ngFor` dejaba de renderizar el resto de las cards.

Fix: `variante?: IVarianteRifaResumen` (opcional) + optional chaining (`v.variante?.xxx`) en
todos los accesos del template (grid de variantes, hover modal, chips de progreso de la
ruleta, pantalla de transición del ganador).

### 9.3 "Rifa mensual" sin indicador de modo prueba
`RifaMesComponent` ahora tiene:
- Checkbox **"Crear como rifa de prueba"** en "Paso 1: Mes" (`esPrueba`, se envía a
  `configurarRifa()`).
- Badge **✅ Sorteo real** / **🧪 Prueba** en el header de "Paso 2: Participantes".
- Banner "⚠️ Esta rifa es de prueba..." con botón **"Pasar a sorteo real"** →
  `toggleModoPrueba()` → `setEsPrueba()` (mismo patrón que `AgregarRifaComponent`).

Verificado con `ng build --configuration=development` sin errores.

---

## 10. Fix posterior — navegación Paso 4/5 sin volver a participantes (2026-06-12)

**Síntoma:** al llegar a "Paso 4: Sorteo" o "Paso 5: Ganador" no había forma de regresar a
"Paso 2: Participantes" para ver la lista de concursantes. "🔄 Reiniciar (mismos participantes)"
vuelve a la ruleta (no a participantes) y "➕ Nueva rifa mensual" resetea TODO el estado
(rifaConfig, concursantes, etc.) — por eso parecía que los concursantes "desaparecían".

**Fix:** nuevos botones que solo cambian `paso = 'participantes'` (sin tocar estado):
- "Paso 4: Ruleta" → **"← Ver participantes"** arriba del layout de la ruleta.
- "Paso 5: Ganador" → **"👥 Ver participantes"** entre "Reiniciar" y "Nueva rifa mensual".

**Archivo modificado:** `src/app/rifas/rifa-mes/rifa-mes.component.html`

Verificado con `ng build --configuration=development` sin errores.

---

## 11. Fix posterior — errores silenciosos en girar/reiniciar + modo prueba en sorteo + volver al sorteo (2026-06-12)

1. **"🎡 Girar" y "🔄 Reiniciar (mismos participantes)" fallaban sin avisar.** `sortear()` y
   `reiniciar()` no capturaban `err?.error?.mensaje`. Ahora limpian `errorConcursante` al iniciar
   y lo llenan en `error`; la alerta correspondiente ahora se muestra también en "Paso 4: Ruleta"
   y "Paso 5: Ganador" (antes solo en "Paso 2").

2. **No había forma de volver al sorteo desde "Participantes" sin re-configurar el premio**
   (la única opción reusaba `guardarVariante()`, que habría duplicado el premio). Nuevo botón
   **"🎡 Volver al sorteo →"** (visible si `varianteRifa` ya existe) → `volverASorteo()` →
   `getElegibles()` + `paso = 'ruleta'`, sin volver a guardar el premio.

3. **Modo prueba sin control visible durante el sorteo.** Nuevo checkbox **"🧪 Es de prueba"**
   en Paso 4 y Paso 5, ligado a `rifaConfig?.esPrueba` vía `toggleModoPrueba()` — al desmarcarlo
   pasa a sorteo real y queda así en los siguientes giros (no se resetea). Además, el checkbox
   "Crear como rifa de prueba" de "Paso 1: Mes" ahora viene **marcado por defecto**
   (`esPrueba = true`).

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts`
- `src/app/rifas/rifa-mes/rifa-mes.component.html`

Verificado con `ng build --configuration=development` sin errores.

---

## 12. Fix posterior — palabraClave duplicada sin mensaje + lista de Descartados + ruleta no renderizaba tras "Reiniciar" + HttpClientModule duplicado (2026-06-12)

1. **`AgregarRifaComponent.guardarVarianteRifa()` ("Confirmar variante", Sección B) tragaba el
   error 404 `{ mensaje: "La palabraClave 'X' ya existe en esta rifa" }`.** El admin no veía nada
   al chocar con una palabra clave repetida. Ahora limpia `errorConcursante` al iniciar y, en
   `error`, captura `err?.error?.mensaje ?? 'No se pudo agregar el premio.'`. Se agregó una alerta
   `.rf-alert--warn` dentro del propio formulario "Agregar variante" (además de la que ya existía
   en Sección C). `eliminarVarianteRifa()` recibió el mismo manejo de error
   (`'No se pudo eliminar el premio.'`).

2. **`RifaMesComponent.reiniciar()` no actualizaba la ruleta/elegibles visualmente** — tras
   reiniciar desde "Paso 5: Ganador", `this.paso = 'ruleta'` y `this.actualizarRuleta()` se
   ejecutaban en el mismo tick, antes de que Angular renderizara el `<canvas #ruletaCanvas>` del
   nuevo `*ngIf="paso === 'ruleta'"` → `this.ruletaCanvas` aún era `undefined` →
   `actualizarRuleta()` salía temprano y nunca llamaba `generarRuleta()`. Mismo patrón que ya se
   había resuelto en `volverASorteo()` (sección 11) con un `setTimeout(..., 200)`. Se aplicó el
   mismo `setTimeout(() => this.actualizarRuleta(), 200)` en `reiniciar()`.

3. **No existía una lista de "Descartados"** — al descartar un concursante en `sortear()`, se
   quitaba de `elegibles` (con un aviso temporal de 2.5s) pero no quedaba registro visible.
   `AgregarRifaComponent` ya tenía este patrón (`descartados: IConcursante[]` + panel
   `❌ Descartados (N)`). Se replicó en `RifaMesComponent`:
   - Nuevo campo `descartados: IConcursante[] = []`.
   - En `sortear()`, al filtrar al descartado de `elegibles` también se agrega a `descartados`.
   - Se resetea en `reiniciar()`, `nueva()` y al cargar elegibles por primera vez en
     `guardarVariante()`.
   - Nuevo panel `.rm-panel` "❌ Descartados (N)" debajo de "🟢 Elegibles" en "Paso 4: Ruleta",
     con estilo `.rm-panel__item--elim` (texto rojo + line-through), igual que en
     `AgregarRifaComponent`.

4. **`HttpClientModule` estaba importado por duplicado** (`ProductoModule` y
   `VentaProductoModule`, ambos cargados de forma eager en `AppModule`), en vez de una sola vez
   en `AppModule`. Es un anti-patrón conocido de Angular (los providers de `HttpClientModule` —
   y potencialmente la cadena de interceptores — pueden registrarse más de una vez). Se movió el
   import a `AppModule` (única instancia) y se quitó de `ProductoModule` y `VentaProductoModule`.

**Archivos modificados:**
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `guardarVarianteRifa()`,
  `eliminarVarianteRifa()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → alerta de error en Sección B
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `descartados`, `sortear()`, `reiniciar()`,
  `nueva()`, `guardarVariante()`
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → panel "❌ Descartados"
- `src/app/rifas/rifa-mes/rifa-mes.component.scss` → `.rm-panel__item--elim`
- `src/app/app.module.ts` → agrega `HttpClientModule`
- `src/app/productos/producto/producto.module.ts` → quita `HttpClientModule`
- `src/app/ventas/venta-producto/venta-producto.module.ts` → quita `HttpClientModule`

Verificado con `ng build --configuration=development` sin errores.

> **Nota sobre "2 peticiones por servicio":** si en el Network tab cada llamada aparece dos veces,
> revisar primero si una de ellas es un `OPTIONS` (preflight CORS) — es normal cuando se manda
> `Authorization` + `withCredentials` (lo hace `TokenInterceptor` en cada request) y NO es un bug.
> Si en cambio son dos requests **idénticas** (mismo método, mismo body), el duplicado de
> `HttpClientModule` corregido en este fix era el candidato más probable; si persiste tras este
> fix, reportar con el nombre exacto del componente/acción para localizar una doble suscripción.

---

## 13. Fix posterior — palabraClave duplicada AÚN sin mensaje (RifaMesComponent) + "premio" único en resumen + "null" en nombres de ruleta (2026-06-13)

> El fix #1 de la sección 12 solo cubrió `AgregarRifaComponent.guardarVarianteRifa()`. El
> mismo patrón roto seguía existiendo en `RifaMesComponent.guardarVariante()` ("Paso 3:
> Variante/Premio" del flujo "📅 Rifa mensual") — exactamente el caso que advierte la
> Lección #7 (bug corregido en un componente hermano, pendiente en el otro).

### 13.1 `RifaMesComponent.guardarVariante()` tragaba el error de palabraClave duplicada
**Síntoma:** en "Rifa mensual", al confirmar el premio con una palabra clave repetida, el
backend responde `404 { mensaje: "La palabraClave 'X' ya existe en esta rifa" }` pero el
botón "Confirmar" no mostraba nada.

**Fix:** `guardarVariante()` ahora limpia `errorConcursante = null` al iniciar y, en
`error`, captura `err?.error?.mensaje ?? 'No se pudo guardar el premio.'`. Se agregó la
alerta `.rm-alert--warn` (dismissable) al inicio de "Paso 3: Variante/Premio" — antes esa
pantalla no tenía ninguna alerta de error.

### 13.2 Resumen final: solo se veía 1 premio cuando había varios
**Síntoma:** en "PASO: RESUMEN" (`AgregarRifaComponent`, pantalla "🎉 Rifa completada"), si
la rifa tenía 2+ premios y alguna variante fue eliminada del catálogo, solo se renderizaba
el primer item de `historial` — los demás desaparecían.

**Causa:** el mismo mecanismo de la Lección #2 (bug original), pero en una pantalla
distinta a la ya corregida en la sección 9.2: `h.configurarRifaVariante.variante.nombreProducto`
sin `?.` — un `variante` nulo en CUALQUIER item del `*ngFor="let h of historial"` rompía el
render del resto.

**Fix:**
- `IHistorialVariante.configurarRifaVariante.variante` ahora es opcional
  (`variante?: IVarianteRifaResumen`) en `estado-rifa.model.ts`.
- Template: `h.configurarRifaVariante.variante?.nombreProducto ?? h.configurarRifaVariante.palabraClave`
  (fallback a la palabra clave si no hay nombre de producto), `h.configurarRifaVariante.palabraClave`
  y `nombreCompleto(h.concursanteGanador)`.

### 13.3 "null" en nombres (ruleta, tablas, paneles, ganador)
**Síntoma:** cuando `apellidoPaterno` de un concursante es `null` (dato real del backend),
cualquier interpolación tipo `{{ c.nombre }} {{ c.apellidoPaterno }}` o template literal
`` `${c.nombre} ${c.apellidoPaterno}` `` renderiza literalmente la palabra **"null"** — se
veía en las etiquetas de la ruleta, tablas de participantes, paneles de elegibles/descartados
y en la pantalla de ganador.

**Fix:** nuevo helper `nombreCompleto()` agregado a **ambos** componentes
(`AgregarRifaComponent` y `RifaMesComponent`):
```typescript
nombreCompleto(c?: { nombre?: string | null; apellidoPaterno?: string | null } | null): string {
  if (!c) return '';
  return [c.nombre, c.apellidoPaterno].filter(p => !!p).join(' ');
}
```
Reemplazó todas las interpolaciones `{{ x.nombre }} {{ x.apellidoPaterno }}` por
`{{ nombreCompleto(x) }}`, y los `labels` del chart de la ruleta
(`this.elegibles.map(c => \`${c.nombre} ${c.apellidoPaterno}\`)` →
`this.elegibles.map(c => this.nombreCompleto(c))`), en:
- `RifaMesComponent`: tabla de participantes, alerta de descartado, paneles
  elegibles/descartados (Paso 4), nombre del ganador (Paso 5), labels de la ruleta.
- `AgregarRifaComponent`: vista previa de elegibles cargados, tablas "Participantes" y
  "Agregados durante la prueba", lista de "Descartados", alerta de descartado (Paso ruleta),
  paneles elegibles/descartados (Paso ruleta), nombre del ganador (Paso transición), labels
  de la ruleta, y el ganador en el historial del resumen (sección 13.2).

### 13.4 Limpieza de warning NG8107 colateral
Tras hacer `variante?: IVarianteRifaResumen` (13.2), el `?.` que YA existía sobre
`h.configurarRifaVariante?.xxx` (agregado en la sección 9.2 de este documento, para OTRA
propiedad del historial) quedó marcado por el compilador como innecesario
(`h.configurarRifaVariante` nunca es `null`/`undefined` en `IHistorialVariante`). Se quitó
ese `?.` redundante mantenido solo en `.variante?.` (que sí puede ser `undefined`).

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `guardarVariante()`, `nombreCompleto()`,
  label de `generarRuleta()`
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → alerta de error en "Paso 3", todas las
  interpolaciones de nombre
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `nombreCompleto()`, label de
  `generarRuleta()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → bloque de historial (resumen) +
  todas las interpolaciones de nombre
- `src/app/rifas/models/estado-rifa.model.ts` → `configurarRifaVariante.variante` opcional

Verificado con `ng build --configuration=development` sin errores ni warnings nuevos.

### 13.5 "2 peticiones de la misma solicitud" — sigue sin reproducirse a nivel de código
Se repitió la investigación de la sección 12 con un ángulo distinto, revisando además:
- `rifa.service.ts` completo (los 15 métodos: cada uno hace un único `http.get/post/put/delete`
  con `.pipe(map(...))`, sin `tap`/subscribe anidados).
- `TokenInterceptor` (un único `next.handle()` por rama — normal o refresh-401).
- `app.module.ts` (`HTTP_INTERCEPTORS` y `HttpClientModule` registrados una sola vez,
  `multi: true` correcto).
- `WebSocketServiceService.suscribirRuleta()` — está **deshabilitado/no-op** (todo el cuerpo
  comentado, retorna `() => {}`), no puede ser el origen.
- Todos los `.subscribe()` de navegación en ambos componentes (`cargarConcursantes`,
  `cargarVariantesRifa`, `cargarRifasActivas`, `volverASorteo`, `sortear`, `reiniciar`,
  `guardarVariante`) — cada uno con una sola llamada.
- Uso de `| async` en los templates — no se encontró ninguno (descarta doble-suscripción por
  pipe `async` repetido).

**Sigue sin identificarse la causa.** Pendiente: reproducir en vivo con DevTools → pestaña
Red, anotar pantalla/acción exacta + URL/método de las 2 peticiones, y retomar desde ahí.

---

## 14. Dropdown recortado al buscar variante + doble POST en "Confirmar variante" + pase exhaustivo Lección #8 (2026-06-13)

> Reporte en `/rifas/mes`, Paso 3 "🎁 Premio a rifar": el dropdown de resultados de búsqueda
> de variantes solo mostraba 1 resultado (recortado, con scroll inútil); al dar "Ir al
> sorteo →" se disparaban 2 POST a `/v1/configurarRifaVariante/save` — uno funcionaba, el
> segundo no mostraba nada; y el error `404 { "mensaje": "La palabraClave 'RIFA4' ya existe
> en esta rifa", "code": 404, "data": null, "lista": null }` no se mostraba al usuario.

### 14.1 Dropdown de búsqueda recortado (solo 1 resultado visible)
**Causa raíz:** `.rm-dropdown`/`.rf-dropdown` son `position: absolute` dentro de
`.rm-search-wrap`/`.rf-search-wrap` (`position: relative`), pero el contenedor padre
`.rm-card`/`.rf-card` tiene `overflow: hidden` — el dropdown se recortaba a la altura visible
del card, dejando ~1 fila visible aunque hubiera más resultados.

**Fix:** nuevo getter `dropdownStyleVariante` (y `dropdownStyleCliente` en
`AgregarRifaComponent`, vía helper privado `dropdownStyleFor()`) que calcula
`getBoundingClientRect()` del `<div #searchWrapXxx>` y devuelve:
```typescript
{ position: 'fixed', 'top.px': r.bottom + 4, 'left.px': r.left, 'width.px': r.width }
```
vía `[ngStyle]="dropdownStyleVariante"` en el `.rm-dropdown`/`.rf-dropdown`. `position: fixed`
escapa del `overflow: hidden` del ancestro (el card no establece *containing block* via
`transform`/`filter`/etc.) y se recalcula en cada ciclo de change detection mientras el
dropdown está visible (`*ngIf="...length > 0"`).

Aplicado a:
- `RifaMesComponent` Paso 3 — `#searchWrapVariante` / `.rm-dropdown` (búsqueda de variante)
- `AgregarRifaComponent` Sección B — `#searchWrapVariante` / `.rf-dropdown` (búsqueda de variante)
- `AgregarRifaComponent` Sección C — `#searchWrapCliente` / `.rf-dropdown` (búsqueda de cliente, rifa diaria)

No se agregaron listeners de scroll/resize para reposicionar — el dropdown es transitorio y
se cierra al seleccionar (`(mousedown)="$event.preventDefault(); seleccionarX(v)"`).

### 14.2 Doble POST a `/v1/configurarRifaVariante/save`
**Causa raíz:** ni `guardarVariante()` (`RifaMesComponent`) ni `guardarVarianteRifa()`
(`AgregarRifaComponent`) tenían guard de re-entrada. Un doble clic — o un primer clic que
tarda en reflejar `[disabled]` en el DOM — disparaba el método dos veces: dos POST en vuelo,
el primero respondía OK (guardaba la palabraClave), el segundo llegaba con la misma
palabraClave ya guardada por el primero → backend respondía `404 { mensaje: "La palabraClave
'X' ya existe en esta rifa" }`. Como ese 404 no se mostraba (ver 14.3), el usuario solo veía
"una petición sí, la otra no hace nada".

**Fix:** se agregó `|| this.guardandoVariante` a la guarda de entrada de ambos métodos:
```typescript
if (!this.varianteSeleccionada || !this.rifaConfig?.id || this.giroGanador < 1 || this.guardandoVariante) return;
```
(análogo en `guardarVarianteRifa()` con `this.varianteParaAgregar`/`this.palabraClaveInput`/
`this.giroGanadorInput`). Con el guard, una sola invocación entra a la vez — resuelve tanto
el "2 peticiones" como (indirectamente) el error 404 espurio del segundo POST.

### 14.3 Error de palabraClave duplicada sin mostrar — pase exhaustivo Lección #8
Aun con 14.2, el 404 de duplicado puede ocurrir por otras causas (ej. el usuario reintenta
con una palabra ya usada por otro premio de la misma rifa) y debe mostrarse. Se aplicó la
Lección #8 de forma literal: grep de `error:\s*\(` en AMBOS archivos `.ts` completos.

**`AgregarRifaComponent` — 11 métodos corregidos** (limpian `errorConcursante = null` al
iniciar y, en `error`, capturan `err?.error?.mensaje ?? '<mensaje de fallback>'`):

| Método | Mensaje de fallback |
|---|---|
| `guardarConfiguracion` | "No se pudo guardar la configuración de la rifa." |
| `toggleModoPrueba` | "No se pudo cambiar el modo de prueba." |
| `guardarEdicionConcursante` | "No se pudo actualizar el participante." |
| `verElegibles` | "No se pudieron cargar los elegibles." |
| `cargarClientesMes` | "No se pudieron cargar los clientes del mes." |
| `sortear` | "No se pudo realizar el sorteo." |
| `verResumenFinal` | "No se pudo cargar el resumen." |
| `confirmarContinuar` | "No se pudo continuar con la siguiente variante." |
| `agregarParticipanteTransicion` | "No se pudo agregar el participante." |
| `guardarParticipanteRuleta` | "No se pudo agregar el participante." |
| `reiniciar` | "No se pudo reiniciar el sorteo." |

**`RifaMesComponent` — 2 métodos corregidos** (mismo patrón):

| Método | Mensaje de fallback |
|---|---|
| `cargarClientes` | "No se pudieron cargar los clientes del mes." |
| `toggleModoPrueba` | "No se pudo cambiar el modo de prueba." |

**Dejado intencionalmente sin cambio**: `AgregarRifaComponent.cargarRifasActivas()` (privado,
`error: () => { this.rifasActivas = []; }`) — fallback silencioso a lista vacía es UX
correcta para una carga de fondo no bloqueante (no dispara por acción directa del usuario).

### 14.4 Nuevas alertas `errorConcursante` agregadas (cobertura por paso)

`agregar-rifa.component.html`:
- `paso === 'ruleta'` — alerta arriba de `.rf-ruleta__layout` (cubre `sortear` y, si el modal
  está abierto desde aquí, `guardarParticipanteRuleta`)
- `paso === 'transicion'` — alerta al inicio de `.rf-transicion__card` (cubre
  `confirmarContinuar`, `agregarParticipanteTransicion`, `verResumenFinal`)
- `paso === 'resumen'` — alerta al inicio de `.rf-resumen__card` (cubre `reiniciar`)
- Modal "➕ Agregar participante" (`*ngIf="mostrarModalParticipante"`) — alerta dentro del
  `<form>`, antes del botón "Registrar" (cubre `guardarParticipanteRuleta`)

`rifa-mes.component.html`:
- Paso 1 "Mes" — alerta al inicio de `.rm-card__body` (cubre `crearRifaEImportar()` y
  `cargarClientes()`, que YA capturaban `err?.error?.mensaje` desde antes pero no tenían
  ninguna alerta donde mostrarlo en este paso)

Todas las alertas siguen el mismo patrón ya establecido: `.rm-alert--warn`/`.rf-alert--warn`
con `⚠️ {{ errorConcursante }}` + botón `✕` que hace `errorConcursante = null`.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `@ViewChild('searchWrapVariante')`,
  `dropdownStyleVariante`, guard en `guardarVariante()`, fix en `cargarClientes()` y
  `toggleModoPrueba()`
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → `#searchWrapVariante` +
  `[ngStyle]="dropdownStyleVariante"` en `.rm-dropdown`, alerta `errorConcursante` en Paso 1
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `@ViewChild('searchWrapVariante')`,
  `@ViewChild('searchWrapCliente')`, `dropdownStyleVariante`, `dropdownStyleCliente`,
  `dropdownStyleFor()`, guard en `guardarVarianteRifa()`, + 11 métodos del pase Lección #8
- `src/app/rifas/agregar-rifa/agregar-rifa.component.html` → `#searchWrapVariante` /
  `#searchWrapCliente` + `[ngStyle]` en ambos `.rf-dropdown`, alertas `errorConcursante` en
  `paso === 'ruleta'` / `'transicion'` / `'resumen'` y modal de participante

**Verificado con `ng build --configuration=development` — sin errores ni warnings nuevos**
(solo los 3 warnings preexistentes de dependencias CommonJS, no relacionados con este cambio).

---

## 15. Guard de doble-submit insuficiente en cadenas async — `configurarRifaVariante/save` seguía 2 veces (2026-06-13)

> Tras el fix de la sección 14.2, el usuario reportó que `POST /v1/configurarRifaVariante/save`
> SEGUÍA llegando 2 veces (200 OK + 400 Bad Request "ya existe") y el mensaje seguía sin
> mostrarse. El mismo Network tab mostraba pares `configurarRifa/save`+`OPTIONS`,
> `importarDePedidos`+`OPTIONS` y 2x `GET variantes/v1/buscar` — esos pares son **preflight
> CORS normal** (ver sección 12), no son el bug.

### 15.1 Causa raíz: el flag se libera ANTES de terminar la cadena
`RifaMesComponent.guardarVariante()` hace `guardarVarianteRifa()` → (éxito) → `getElegibles()`.
El guard `|| this.guardandoVariante` de la sección 14.2 solo cubre el doble-clic SÍNCRONO. El
código ponía `guardandoVariante` en su valor final dentro del `next` del PRIMER POST — el
botón "🎡 Ir al sorteo →" volvía a estar habilitado MIENTRAS `getElegibles()` seguía en vuelo.
`RifaMesComponent` no limpia `varianteSeleccionada`/`palabraClave`/`giroGanador` al guardar (a
diferencia de `AgregarRifaComponent.guardarVarianteRifa()`, que sí llama
`resetFormVariante()`) → un re-clic en esa ventana reenvía el MISMO `palabraClave` ya guardado
por el primer POST → backend responde `400 "La palabraClave ... ya existe en esta rifa"`.

### 15.2 Fix: el flag solo se libera en el último eslabón de la cadena
`guardarVariante()`:
```typescript
this.rifaService.guardarVarianteRifa(req).subscribe({
  next: res => {
    this.varianteRifa = res;
    // guardandoVariante sigue en true hasta terminar getElegibles()
    this.rifaService.getElegibles(this.rifaConfig!.id!).subscribe({
      next: elegibles => {
        this.elegibles = elegibles;
        this.descartados = [];
        this.guardandoVariante = false;
        this.paso = 'ruleta';
        setTimeout(() => this.generarRuleta(), 200);
      },
      error: err => {
        this.guardandoVariante = false;
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudieron cargar los elegibles.';
      }
    });
  },
  error: err => {
    this.errorConcursante = err?.error?.mensaje ?? 'No se pudo guardar el premio.';
    this.guardandoVariante = false;
  }
});
```

### 15.3 Mismo patrón aplicado a `crearRifaEImportar()` (Paso 1: Mes)
`configurarRifa()` → `importarDePedidos()` es la misma forma de cadena. El botón "✅ Crear
rifa e importar..." no tenía ningún flag de re-entrada (`[disabled]` solo dependía de
`clientesSeleccionados.size`/`fechaHoraLimite`/`palabraClave`, que no cambian tras el primer
`next`). Nuevo campo `creandoRifa = false`:
- Entrada: `if (!this.mesSeleccionado || !this.fechaHoraLimite || !this.palabraClave.trim() || this.creandoRifa) return;` + `this.creandoRifa = true;`
- `false` solo en: `next`/`error` de `importarDePedidos()` y en el `error` de `configurarRifa()`.

Botón actualizado con `[disabled]="... || creandoRifa"` + spinner "Creando…" (mismo patrón
visual que "🎡 Ir al sorteo →").

### 15.4 Sibling check (`AgregarRifaComponent`)
- `guardarVarianteRifa()` → ya inmune (resetea el form completo en `next` vía
  `resetFormVariante()`, confirmado en sección 14).
- `guardarConfiguracion()` (equivalente a `crearRifaEImportar()`) → **no necesita fix**: su
  botón usa `[disabled]="configForm.invalid || savingConfig || !!rifaConfig?.id"`, y
  `rifaConfig.id` se asigna de forma síncrona en el mismo `next` donde `savingConfig` pasa a
  `false` → el botón queda deshabilitado permanentemente apenas se guarda, sin ventana de
  re-clic.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `guardarVariante()` (flag movido al final
  de la cadena), nuevo campo `creandoRifa`, `crearRifaEImportar()` (mismo patrón)
- `src/app/rifas/rifa-mes/rifa-mes.component.html` → botón "✅ Crear rifa e importar..." con
  `creandoRifa` + spinner "Creando…"

**Verificado con `ng build --configuration=development` — sin errores ni warnings nuevos**
(solo los 3 warnings preexistentes de dependencias CommonJS, no relacionados con este cambio).

Ver también **Lección #10** en `CLAUDE.md`.

---

## 16. `importarDePedidos` — nuevo arreglo `omitidosSinNombre` (2026-06-14)

> Backend: si `clientes[]` traía una entrada `sinRegistro: true` con `nombre` vacío, antes
> abortaba TODO el batch (`ConstraintViolationException`). Ahora esas entradas se omiten y se
> devuelven en `omitidosSinNombre`, igual que `omitidosYaRegistrados`.

### Cambios
- `IImportarDePedidosResponse` (`concursante.model.ts`) → + `omitidosSinNombre: IClientePedido[]`.
- `RifaService.importarDePedidos()` → default `{ importados: [], omitidosYaRegistrados: [], omitidosSinNombre: [] }`.
- `RifaMesComponent` y `AgregarRifaComponent`:
  - Nuevo campo `omitidosSinNombre: IClientePedido[] = []`, poblado en el `next` de
    `importarDePedidos()` junto con `omitidosImport`.
  - Nuevo `cerrarOmitidosSinNombre()`, reseteado en `nueva()` / `nuevaRifa()`.
  - Nueva alerta `.rm-alert--warn` / `.rf-alert--warn` (debajo de la de `omitidosImport`):
    "ℹ️ N participante(s) sin registro no se importaron porque no tienen nombre."

### Nota — Autenticación 401/403 (2026-06-13, `CAMBIOS_FRONT.md`)
El doc pide confirmar que el refresh de token solo se dispara en **401** (no en 403, que ahora
es "sin permisos"). Revisado `TokenInterceptor`: ya solo intercepta `error.status === 401`
(`src/app/token/TokenInterceptor .ts:41`) — **sin cambios necesarios**.

**Archivos modificados:**
- `src/app/rifas/models/concursante.model.ts`
- `src/app/rifas/service/rifa.service.ts`
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` + `.html`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` + `.html`

**Verificado con `ng build --configuration=development` — sin errores ni warnings nuevos.**

---

## 17. Repetir sorteo en modo prueba sin pasar por "Reiniciar" (2026-06-14)

> Reporte en vivo: en "Rifa mensual" (`RifaMesComponent`), tras llegar al ganador (Paso 5,
> `esPrueba=true`), el camino "👥 Ver participantes" → "Siguiente: elegir premio →" → "🎡 Ir al
> sorteo →" (mismo premio, sin tocar "🔄 Reiniciar") mostraba solo **1 elegible** en Paso 4 —
> el usuario esperaba ver TODOS los concursantes de la rifa otra vez.

### Diagnóstico (front vs. back) — confirmado en vivo con el usuario
- El front es un pass-through directo: `getElegibles()` → `this.elegibles = elegibles`, sin
  filtrar ni cachear nada.
- El usuario probó "🔄 Reiniciar (mismos participantes)" antes de repetir el camino → SÍ
  aparecieron todos los concursantes. **Conclusión: no es bug del back.**
- Causa: el concursante ganador de la ronda anterior queda `descartado=true` en BD (no puede
  volver a salir elegible). Ese flag solo se limpia con
  `POST /v1/ganadorRifa/reiniciar/{id}?completo=false`. "👥 Ver participantes" es pura
  navegación — no llama `reiniciar` — así que `getElegibles()` en la 2ª vuelta legítimamente
  devuelve menos elegibles.

### Fix
`RifaMesComponent.guardarVariante()`: si `rifaConfig.esPrueba === true`, antes de
`getElegibles()` se llama `reiniciar(rifaId, false)` (no destructivo: conserva concursantes,
limpia `descartado` y sorteos demo). Si `esPrueba === false`, sin cambios — el flag
`descartado` se preserva como debe ser en una rifa real.

```typescript
if (this.rifaConfig?.esPrueba) {
  this.ganador = null;
  this.descartadoActual = null;
  this.rifaService.reiniciar(rifaId, false).subscribe({
    next: () => cargarElegibles(),
    error: err => {
      this.guardandoVariante = false;
      this.errorConcursante = err?.error?.mensaje ?? 'No se pudo reiniciar el sorteo.';
    }
  });
} else {
  cargarElegibles();
}
```

`guardandoVariante` sigue en `true` durante toda la cadena (incluye el `reiniciar` extra),
mismo patrón de la sección 15 (Lección #10).

### Sibling check (`AgregarRifaComponent`, Lección #7)
Revisado — **no aplica el mismo fix**. Su sorteo maneja MÚLTIPLES premios/variantes en
secuencia (`getEstado()` + websocket + `irARuleta()`/`_retomar()`), donde excluir a los
ganadores de variantes previas al avanzar a la siguiente **es el comportamiento correcto**.
`AgregarRifaComponent.reiniciar()` ya hace un reset distinto y completo (`nuevaRifa()`). Si
aparece un reporte análogo ahí (repetir sorteo de UN premio sin participantes en modo
prueba), revisar puntualmente — no es el mismo flujo.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `guardarVariante()`

**Verificado con `ng build --configuration=development` — sin errores ni warnings nuevos.**

---

## 18. Confirmación + reset al pasar de prueba a real a mitad del sorteo (2026-06-14)

> Pregunta: si ya se dio el giro #1 (de un `giroGanador=3`, por ejemplo) y luego se desmarca
> "🧪 Es de prueba", ¿qué pasa de este lado con ese descarte ya hecho?

### Diagnóstico
`toggleModoPrueba()` solo hacía `PUT .../esPrueba` + refrescaba `concursantes` — no tocaba
`elegibles`/`descartados`/`ganador`/`paso`. Según el comentario ya existente en
`AgregarRifaComponent.toggleModoPrueba()` ("Al pasar a real, el back limpia giros de demo y
reactiva descartados"), el back SÍ reactiva al concursante descartado en el giro de prueba —
pero el front seguía con la lista vieja. Si el sorteo seguía (giros 2/3), el back podía volver
a sortear a esa persona ya reactivada y el front no la encontraría en `elegibles`
(`idx = -1` → animación de la ruleta cae en posición 0, incorrecta) + aparecería duplicada en
"❌ Descartados".

### Fix
`RifaMesComponent.toggleModoPrueba()`: al pasar `esPrueba: true → false` se muestra un
`confirm()` explicando la consecuencia ("se restablecen los descartes... el sorteo comenzará
desde cero con los mismos participantes"). Si el usuario confirma:
1. `setEsPrueba(rifaId, false)`.
2. Refresca `concursantes` (igual que antes).
3. Si ya había `varianteRifa` configurado: limpia `ganador`, `descartadoActual`,
   `descartados`, vuelve a pedir `getElegibles(rifaId)` (ya resincronizado por el back) y
   navega a `paso = 'ruleta'` (regenera la ruleta con `setTimeout(actualizarRuleta, 200)`).

Si el usuario cancela el `confirm`, no se hace nada — el checkbox revierte solo porque
`rifaConfig.esPrueba` no cambió. Si `nuevoValor === true` (real → prueba) o aún no hay
`varianteRifa`, se mantiene el comportamiento simple anterior (sin confirm ni reset).

### Sibling check (`AgregarRifaComponent`, Lección #7)
Se agregó el MISMO `confirm()` antes de `setEsPrueba(false)` por consistencia de UX. NO se
replicó el resync de `elegibles`/ruleta — su arquitectura (websocket + `getEstado()`) es
distinta y ya hace `cargarConcursantes()`. Si se reporta el mismo problema visual ahí,
revisar puntualmente.

**Archivos modificados:**
- `src/app/rifas/rifa-mes/rifa-mes.component.ts` → `toggleModoPrueba()`
- `src/app/rifas/agregar-rifa/agregar-rifa.component.ts` → `toggleModoPrueba()` (solo el `confirm()`)

**Verificado con `ng build --configuration=development` — sin errores ni warnings nuevos.**
