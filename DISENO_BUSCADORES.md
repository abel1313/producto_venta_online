# Diseño — Buscadores y Headers

> Estado: **en revisión de color**. El layout ya se ajustó en `AllComponent` (productos).
> Una vez que el usuario apruebe el color, aplicarlo a los demás componentes.

---

## Problema actual

| Componente | Problema |
|---|---|
| `productos/all` | Header ocupa 100% del ancho de la pantalla — se ve exagerado. Buscador full-width sin límite. Color morado (`#3730a3→#6366f1`) en light mode. |
| `variante/buscar` | Mismo problema de ancho. Mismo color morado en light. |
| `usuarios/buscar-usuarios` | Sin diseño: Bootstrap puro, sin título, buscador en `col-6` desalineado a la izquierda, sin ícono, sin placeholder consistente. |
| Todos (dark mode) | `--header-brand` dark es un degradado carmín oscuro `#1a0610→#3f0d2d` — se ve rojo/burdeos, indeseable. |

---

## Colores actuales

### Light mode — `--header-brand` (styles.scss línea 96)
```scss
linear-gradient(135deg, #3730a3 0%, #4f46e5 55%, #6366f1 100%)
```
**Problema:** morado/índigo muy saturado, se ve "genérico SaaS 2021".

### Dark mode — `--header-brand` (styles.scss línea 139)
```scss
linear-gradient(135deg, #1a0610 0%, #2d0a20 55%, #3f0d2d 100%)
```
**Problema:** carmín casi negro, se ve rojizo y apagado.

### Acento global — `--app-accent`
- Light: `#6366f1` (índigo)
- Dark: `#818cf8` (índigo claro)

---

## Opciones de color propuestas para el header

### Opción A — Slate/Carbon (APLICADA COMO PREVIEW en `AllComponent`)
> Neutro oscuro profesional. No es morado, no es rojo. Funciona perfecto en ambos modos.

| Modo | Valor |
|---|---|
| Light | `linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)` |
| Dark | `linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #293548 100%)` |
| Sombra light | `rgba(30,41,59,0.35)` |
| Sombra dark | `rgba(0,0,0,0.5)` |

---

### Opción B — Azul marino
> Clásico y confiable. Color de empresa, serio.

| Modo | Valor |
|---|---|
| Light | `linear-gradient(135deg, #0f2557 0%, #1d4ed8 55%, #2563eb 100%)` |
| Dark | `linear-gradient(135deg, #0c1a3a 0%, #0f2557 55%, #1a3a6e 100%)` |
| Sombra light | `rgba(29,78,216,0.35)` |
| Sombra dark | `rgba(0,0,0,0.5)` |

---

### Opción C — Verde esmeralda
> Fresco y moderno. Buen contraste con texto blanco. Diferencia este sistema de los típicos azules/morados.

| Modo | Valor |
|---|---|
| Light | `linear-gradient(135deg, #064e3b 0%, #059669 55%, #10b981 100%)` |
| Dark | `linear-gradient(135deg, #022c22 0%, #064e3b 55%, #065f46 100%)` |
| Sombra light | `rgba(5,150,105,0.35)` |
| Sombra dark | `rgba(0,0,0,0.5)` |

---

### Opción D — Gris antracita puro
> Minimalista, atemporal. El más neutro de todos.

| Modo | Valor |
|---|---|
| Light | `linear-gradient(135deg, #18181b 0%, #27272a 55%, #3f3f46 100%)` |
| Dark | `linear-gradient(135deg, #09090b 0%, #18181b 55%, #27272a 100%)` |
| Sombra light | `rgba(24,24,27,0.35)` |
| Sombra dark | `rgba(0,0,0,0.5)` |

---

## Fix de layout (independiente del color)

**Problema:** el header ocupa 100% de la pantalla incluso en monitores 4K.
**Fix aplicado en AllComponent:** se agrega `.pl-header__content` como wrapper interno con `max-width: 860px; margin: 0 auto`.

El mismo fix hay que aplicar a:
- `variante/buscar` → `.vb-header` → wrapper `.vb-header__content`
- `usuarios/buscar-usuarios` → componente completo (rediseño pendiente)

---

## Regla de espacio lateral — PARA TODOS LOS COMPONENTES

> Los lados izquierdo y derecho del header/buscador deben quedar **vacíos**.
> Esos espacios están reservados para **banners de promociones de productos** que el usuario
> verá al navegar. Por eso el contenido del header siempre va centrado con `max-width` y
> `margin: 0 auto` — nunca full-width.

---

## Estado de aprobación

| Componente | Layout fix | Color preview | Para aprobar |
|---|---|---|---|
| `productos/all` | ✅ Aplicado | ✅ **Opción A** (Slate/Carbon) | ⏳ en revisión |
| `variante/buscar` | ✅ Aplicado (`vb-header__content`) | ✅ **Opción B** (Azul marino) | ⏳ en revisión |
| `variante/agregar` | N/A (card centrada) | ✅ **Opción C** (Verde esmeralda) | ⏳ en revisión |
| `productos/add` | N/A (card centrada) | ✅ **Opción D** (Antracita) | ⏳ en revisión |
| `usuarios/buscar-usuarios` | ⏳ Rediseño completo pendiente | ⏳ Pendiente color aprobado | ⏳ |

> **Instrucción:** cuando el usuario apruebe la opción de color, cambiar `--header-brand` y
> `--header-brand-shadow` en `styles.scss` con los valores de esa opción, y eliminar todos
> los overrides `:host { --header-brand }` de los archivos `.scss` individuales.

