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

---
---

# 📝 ANEXO — Antes / Después de CADA texto (2026-07-16)

> Bitácora exacta de lo que cambió en pantalla. **Las URLs NO cambiaron**: siguen siendo
> `/variantes/...` y `/productos/...` igual que antes. Solo cambió el texto.

## 1. Menú lateral (`navbar`)

| # | Antes | Ahora | A dónde va (sin cambio) |
|---|---|---|---|
| 1 | 🛍️ **Productos** | 🛍️ **Tienda** | `/variantes/buscar` |
| 2 | 📦 **Mis productos** | 📦 **Inventario** | *(accordion)* |
| 3 | ↳ 🔍 Ver todos | ↳ 🔍 **Modelos** | `/productos/buscar` |
| 4 | ↳ ➕ Agregar producto | ↳ ➕ **Agregar modelo** | `/productos/agregar` |
| 5 | ↳ 🧩 Gestionar variantes | ↳ 🧩 **Agregar producto** | `/variantes/venta` |
| 6 | ↳ 🏷️ Palabras clave | ↳ 🏷️ **Categorías** | `/palabras-clave` |
| 7 | 🎡 Rifa de variantes | 🎡 **Rifa de productos** | `/rifas/agregar` |

### Footer del menú (botones del carrito)

| Antes | Ahora | Nota |
|---|---|---|
| **Productos** | **Tienda** | Decía "Productos" pero navegaba a `/variantes/buscar` — engañaba |
| **Carrito** (badge del carrito de *productos*) | *(eliminado del menú)* | Sigue accesible desde `/productos/buscar`, que tiene su propio botón |
| **Variantes** 🏷️ | **Carrito** 🛒 | `/variantes/carrito` — este es EL carrito del sistema |
| **Limpiar** | **Limpiar** | Antes limpiaba el carrito de *productos*; ahora limpia el de variantes+promos (el que se ve) |

## 2. Pantalla por pantalla

### `/variantes/buscar` — el catálogo del cliente

| Antes | Ahora |
|---|---|
| Título: **"Catalogos"** *(sic: sin acento y en plural)* | **"Tienda"** |
| Subtítulo: "Catálogo de productos" | "Todos nuestros productos" |
| Ícono: 🏷️ | 🛍️ |
| "No se encontraron **variantes**" | "No se encontraron **productos**" |

> Los 3 puntos que llevan aquí (menú, botón del footer y título) ahora dicen **Tienda** — antes
> decían "Tienda", "Catálogo" y "Catalogos" respectivamente.

### `/variantes/venta` — alta (admin)

| Antes | Ahora |
|---|---|
| **"Nueva Variante"** | **"Nuevo Producto"** |
| placeholder "Descripción de la **variante**…" | "Descripción del **producto**…" |
| "(opcional — aplica a todas las **variantes**)" | "(opcional — aplica a todos los **productos**)" |
| title "…a todas las **variantes** extra" | "…a todos los **productos** extra" |

### `/variantes/update` — edición (admin)

| Antes | Ahora |
|---|---|
| "🖼️ Imágenes de la **variante**" | "🖼️ Imágenes del **producto**" |

### `/variantes/detalle/:id` — ficha

| Antes | Ahora |
|---|---|
| "**Independizar variante**" | "**Convertir en modelo propio**" |

> Es la función que gradúa un producto (SKU) para que sea su propio modelo. El nombre nuevo
> describe qué hace en el vocabulario nuevo.

### `/variantes/carrito` — carrito

| Antes | Ahora |
|---|---|
| "🏷️ Carrito de **variantes**" | "🛒 **Carrito**" |

### `/variantes/venta-directa` — cobrar

| Antes | Ahora |
|---|---|
| Subtítulo "Busca **variantes**, selecciona el pago y cobra" | "Busca **productos**, …" |
| "🔍 Buscar **variante**" | "🔍 Buscar **producto**" |
| Estado vacío "Agrega **variantes** desde el buscador" | "Agrega **productos** desde el buscador" |

### `/productos/buscar` — inventario / modelos (admin)

| Antes | Ahora |
|---|---|
| Botón "📥 Excel sin **variantes**" | "📥 Excel sin **productos**" |
| Botón por card: "**Variantes**" | "**Productos**" |

### `/admin/promociones` — armar combos

| Antes | Ahora |
|---|---|
| "Agregar **variante** al combo" | "Agregar **producto** al combo" |
| placeholder "Buscar **variante** por nombre, talla o color…" | "Buscar **producto** por…" |
| Encabezado de tabla: "**Variante**" | "**Producto**" |
| "Busca y agrega **variantes** para armar el combo." | "…agrega **productos**…" |
| Fallback "**Variante** #123" | "**Producto** #123" |
| "Si ves varias **variantes** idénticas… del mismo **producto**… entre ellas" | "Si ves varios **productos** idénticos… del mismo **modelo**… entre ellos" |

### `/abonos` — créditos

| Antes | Ahora |
|---|---|
| "Buscar **variante**" | "Buscar **producto**" |

### `/favoritos`

| Antes | Ahora |
|---|---|
| "**Variantes** que guardaste para después" | "**Productos** que guardaste…" |
| "Toca el corazón de cualquier **variante**… para guardar**la** aquí." | "…cualquier **producto**… para guardar**lo** aquí." |

### `/dashboard`

| Antes | Ahora |
|---|---|
| "**Variantes** con 1–4 piezas" | "**Productos** con 1–4 piezas" |

### `/palabras-clave` — categorías

| Antes | Ahora |
|---|---|
| "Categorías usadas para mejorar la búsqueda de **productos y variantes**" | "…de **modelos y productos**" |

### `/rifas/agregar` y `/rifas/mes`

| Antes | Ahora |
|---|---|
| "**Variantes** a rifar" | "**Productos** a rifar" |
| "¿Con qué participantes continúa la siguiente **variante**?" | "…el siguiente **producto**?" |
| "➕ Agregar participante para la siguiente **variante**" | "…para el siguiente **producto**" |
| "Selecciona qué **variante** se lleva el ganador." | "Selecciona qué **producto** se lleva el ganador." |
| placeholder "Buscar **variante** por…" | "Buscar **producto** por…" |

### `/rifas/buscar`

| Antes | Ahora |
|---|---|
| Etiqueta "**Variantes**" (card y detalle) | "**Productos**" |

### `/admin/cache`

| Antes | Ahora |
|---|---|
| "…(imágenes, **productos, variantes**, clientes…)" | "…(imágenes, **modelos, productos**, clientes…)" |

### `/admin/diagnostico-imagenes` y `/admin/reconciliacion-imagenes`

| Antes | Ahora |
|---|---|
| "No se encontraron **variantes** con…" | "No se encontraron **productos** con…" |
| "**Variante** seleccionada:" | "**Producto** seleccionado:" |
| "**Variantes** revisadas" | "**Productos** revisados" |

## 3. Lo que NO se tocó (a propósito)

| Qué | Por qué |
|---|---|
| **Las URLs** (`/variantes/...`, `/productos/...`) | Pendiente de decidir. Hoy la URL sigue diciendo `variante`. |
| Nombres de clases, servicios, modelos (`VarianteService`, `IVarianteResumen`…) | Refactor sin beneficio visible; además la API expone `/variantes/v1/...` |
| Comentarios de código (`<!-- Buscador de variante -->`) | No los ve el usuario; describen la entidad real |
| `avatarColor()` en `all-usuarios` | Es una paleta de 8 colores para distinguir usuarios, no es marca |
| `map[color]` en `productos/all` | Traduce el **color real del producto** (rosa, morado…). Un producto rosa debe verse rosa. Solo cambió el color de *fallback*. |
| Colores semánticos (rojo/verde, badges de stock) | Significado, no marca |




es de otra cosa 
Quiero que actúes como en una conversación previa donde me explicaste, con un enfoque 
práctico y con ejemplos de código en Java/Spring Boot, lo siguiente:

1. Configuración de Mockito con JUnit 5 (por qué falla MockitoAnnotations.initMocks(), 
   diferencia con openMocks() y con @ExtendWith(MockitoExtension.class))
2. Una guía completa de testing en Spring Boot: JUnit 5, Mockito, @WebMvcTest, 
   @DataJpaTest, @SpringBootTest, buenas y malas prácticas, con ejemplos correctos 
   e incorrectos (✔/✘)
3. Una explicación conceptual de PARA QUÉ sirven los tests (no solo cómo se escriben), 
   incluyendo estos puntos que discutimos:
   - Los tests no "adivinan" bugs que nadie pensó, solo cubren lo que tú decides probar
   - La diferencia real entre validar manualmente y tener un test es que el test 
     detecta regresiones futuras (cuando alguien más rompe algo sin querer)
   - Un test puede pasar aunque un campo del resultado quede null, si tu assertion 
     no lo valida explícitamente (ejemplo del campo "usuario" que quedó null)
   - Checklist de qué validar en las assertions (assertAll, campos anidados, 
     colecciones, valores calculados)
   - Diferencia entre mockear dependencias (@Mock en repositorios/servicios) vs 
     crear datos con "new" (DTOs/entidades no se mockean)
   - Cómo saber qué datos necesita un mock: leyendo el código bajo prueba, no adivinando

Dame las mismas explicaciones con el mismo nivel de detalle y los mismos ejemplos 
de código.

IMPORTANTE: si en algún momento te pido "dame el PDF", quiero que me des exactamente 
el mismo PDF completo de 22 páginas con todas las secciones (introducción, JUnit 5, 
Mockito, configuración de mocks, errores comunes, integración Spring Boot, ejemplo 
completo en 3 niveles, buenas/malas prácticas, tabla resumen, checklist). Si no te 
pido el PDF explícitamente, solo menciona que existe un PDF con esta guía completa, 
sin generarlo.