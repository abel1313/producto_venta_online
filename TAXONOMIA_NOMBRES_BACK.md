# Taxonomía de nombres — para el equipo de BACK

**Fecha:** 2026-07-16
**De:** Front
**Para:** Back
**Acción requerida:** ❌ **NINGUNA de código.** Solo anotar/documentar. Ver "Qué te pido" abajo.

---

## 🚦 Lo primero: NO cambies nada

**No estoy pidiendo un rename ni un endpoint nuevo.** Los contratos siguen **exactamente igual**:

- `GET /variantes/v1/buscar` → sigue llamándose así ✅
- `GET /variantes/v1/admin/filtrar` → sigue igual ✅
- `POST /v1/promociones`, `/v1/ventas/save`, etc. → sin cambios ✅
- Los campos JSON (`varianteId`, `productoId`, `nombreProducto`…) → **sin cambios** ✅

**Este documento es solo para que entiendas por qué la app le dice "Producto" a lo que tu API
llama `variante`** — y para que puedas dejarlo anotado en el back y no haya confusión cuando
alguien reporte un bug diciendo "el producto no aparece" refiriéndose a una variante.

---

## El problema

El negocio tiene **dos entidades** y las dos se llamaban "producto" en algún lado:

| Entidad en BD/API | Qué es realmente | Ejemplo |
|---|---|---|
| `Producto` | El **agrupador**. Solo nombre, precios base y categoría. **No tiene stock ni código de barras.** | "Blusa Zara" |
| `Variante` | Lo que **de verdad se vende**. Tiene talla, color, marca, **stock, precio y código de barras**. | "Blusa Zara / M / Negro" |

El cliente final **nunca ve un `Producto`** — las pantallas de productos son admin-only. El
cliente solo navega variantes. O sea: **lo que el cliente llama "producto", la API lo llama
`variante`.**

Eso hacía que la app tuviera un menú "Productos" (que apuntaba a `/variantes/buscar`) y otro
"Mis productos" (que apuntaba a `/productos/buscar`) — dos cosas distintas con el mismo nombre.
Y la palabra "variante" se filtraba a la pantalla, donde no le dice nada al usuario.

---

## La decisión (solo afecta el texto en pantalla)

| Entidad en tu API | Ahora se le dice al usuario | Regla |
|---|---|---|
| `Variante` | **"Producto"** | *Si tiene stock y código de barras, es un Producto.* |
| `Producto` | **"Modelo"** | *El Modelo agrupa; el Producto se vende.* |
| `palabraClave` | **"Categoría"** | (ya se mostraba así en los formularios) |

**La regla de oro:** *Modelo agrupa, Producto se vende.*

### Traducción rápida cuando leas un reporte

| Si el usuario dice… | Se refiere a… (en tu API) |
|---|---|
| "el producto no tiene stock" | `Variante` |
| "no encuentro el producto en el buscador" | `Variante` |
| "el modelo tiene 5 productos" | Un `Producto` con 5 `Variante` |
| "agregar producto" | `POST` de una **variante** |
| "agregar modelo" | `POST` de un **producto** |

---

## Por qué NO se renombró el código

Se evaluó renombrar `variante` → `producto` en el front (clases, servicios, rutas) y se
**descartó**, por dos razones:

1. Es un refactor de ~60 archivos **sin ningún beneficio para el usuario** (nadie ve los
   nombres de las clases).
2. **No eliminaría la inconsistencia de todos modos**, porque tu API expone
   `/variantes/v1/...` y campos como `varianteId`. El front seguiría teniendo que traducir en
   la frontera.

Conclusión: **la traducción vive solo en la capa de presentación.** El código del front sigue
hablando tu mismo idioma (`variante`), así que al depurar juntos seguimos entendiéndonos.

---

## ✅ Qué te pido (lo único)

**Anotar en el código del back**, donde tengas las entidades, un comentario del estilo:

```java
/**
 * Variante = lo que el usuario final ve como "PRODUCTO" en la app.
 * Es la unidad vendible: tiene stock, precio y código de barras.
 * Su padre (Producto) se muestra como "MODELO".
 * Ver TAXONOMIA_NOMBRES_BACK.md en el repo del front.
 */
@Entity
public class Variante { ... }
```

```java
/**
 * Producto = lo que el usuario final ve como "MODELO" en la app.
 * Es solo el agrupador (nombre, precios base, categoría) — NO se vende
 * directamente, no tiene stock ni código de barras: eso vive en Variante.
 */
@Entity
public class Producto { ... }
```

Con eso, si alguien del equipo lee "el producto no tiene stock" en un ticket, sabe de inmediato
que se está hablando de una `Variante`.

---

## 📋 Cambios del front en esta tanda (informativo)

Ninguno requiere acción tuya:

| Cambio | Impacto en back |
|---|---|
| Paleta de color ámbar → azul/morado (todo el sistema) | Ninguno (CSS) |
| Rediseño del login + fondo animado WebGL | Ninguno (CSS/JS local) |
| Renombrado de etiquetas (Tienda, Inventario, Modelos, Producto…) | Ninguno (texto) |
| Carrito: se quitó el botón del carrito de *productos* del menú | Ninguno (el carrito vive en localStorage del front) |
| Venta directa: ahora sí se muestran las promos del carrito | Ninguno (bug de template) |
| **Promociones: el buscador de variantes ahora filtra por stock** | **Ninguno — usa `GET /variantes/v1/admin/filtrar?nombreOCodigo=…&conStock=true`, que ya existía** |

### Sobre el filtro de stock en promociones

Antes, al armar un combo, el buscador usaba `GET /variantes/v1/buscar` y listaba **también
variantes con `stock: 0`**, dejando armar combos que nacían con `instanciasDisponibles = 0`
(el bug de la promo "ropa"). Ahora usa `admin/filtrar` con `conStock=true`.

**Criterio de negocio confirmado con el dueño:** al **armar** la promoción solo deben aparecer
variantes con stock. Que el stock se agote después **no es problema de esa pantalla** — tu back
ya recalcula `instanciasDisponibles` con el stock vivo (la promo se muestra sola como "Sin
disponibilidad") y la validación real ocurre **al cobrar**. No se pide ninguna revalidación
extra.

---

## ❓ Dudas

Si algo de la traducción de nombres no te cuadra o ves un caso donde se rompe (por ejemplo, un
endpoint cuyo nombre le llegue al usuario tal cual), avísale al front antes de cambiar nada.
