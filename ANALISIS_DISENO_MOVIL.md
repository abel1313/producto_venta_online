# Análisis — Problemas de diseño en móvil (variantes/buscar)

> Screenshot de referencia: catálogo de variantes (`/variantes/buscar`) visto en Safari iOS,
> sesión admin. Problemas reportados: (1) hay que hacer scroll horizontal, (2) el placeholder
> del buscador se corta a media palabra, (3) la imagen del producto se ve recortada ("mocha").

Componente analizado: `src/app/variante/buscar/buscar.component.html` + `.scss`
(mismo patrón visual replicado por copy-paste en `src/app/productos/producto/all/`, ver sección 5).

---

## 1. Scroll horizontal (el problema principal)

**Causa raíz:** en toda la cadena de contenedores de esta pantalla —
`:host` → `.vb-header` → `.vb-header__content` → `.vb-search` → `.vb-search__input` —
**ningún elemento tiene `overflow-x: hidden`**. En HTML, si un solo descendiente se pasa del
ancho de la pantalla por la razón que sea (aunque sean 5px), el navegador no lo recorta: hace
scrolleable **toda la página** horizontalmente. No hay ningún "cinturón de seguridad".

Candidatos concretos que pueden estar empujando el ancho de más en pantallas angostas
(320–390px, iPhone SE/mini/12/13):

- `.vb-search__input` (`buscar.component.scss:65-73`) es un hijo `flex: 1` dentro de
  `.vb-search` (fila flex). Por spec, un elemento flex tiene por default
  `min-width: auto`, que para un `<input>` NO se calcula a partir del placeholder, pero sí
  tiene un ancho mínimo "de fábrica" del navegador (~170–190px). Sumado al ícono 🔍, el botón
  📷 y el padding lateral de `.vb-search` (`padding: 10px 20px`) y de `.vb-header__content`
  (`padding: 24px 24px 0`), en un iPhone de 320–375px de ancho el total puede superar el
  viewport disponible.
- Ningún contenedor de esta cadena tiene `overflow-x: hidden` que absorba ese sobrante — por
  eso se nota como "toda la pantalla se puede correr a la derecha", no solo el buscador.

**Nota:** el grid de cards (`vb-grid`, `minmax(260px, 1fr)`, `buscar.component.scss:327-331`)
**no** es el culpable aquí — es el bug clásico de "grid blowout" en móvil, pero ya está
mitigado porque `.vb-card` tiene `overflow: hidden` (`scss:340`), lo cual, por spec CSS,
fuerza su `min-width` automático a `0` y evita que la grilla se desborde por su contenido.

---

## 2. Placeholder del buscador cortado

`buscar.component.html:33`:
```html
placeholder="Buscar por nombre o código de barras (mín. 3 caracteres)…"
```
54 caracteres. `.vb-search__input` (`scss:65-73`) no tiene `text-overflow: ellipsis` ni
`overflow: hidden` ni `white-space: nowrap` — cuando el texto no cabe, el navegador deja de
dibujar letras justo donde se acaba el ancho disponible, sin ningún indicador visual (`…`) de
que el texto sigue. Por eso se ve cortado a medias, como si estuviera roto.

---

## 3. Imagen del producto recortada ("mocha")

`buscar.component.scss:347-361`:
```scss
&__img-wrap { height: 180px; overflow: hidden; }
&__img      { width: 100%; height: 100%; object-fit: cover; }
```
`height: 180px` fijo + `object-fit: cover` obliga a la foto a **rellenar** ese rectángulo
exacto — si la proporción real de la foto no es esa, el navegador recorta lo que sobre (lados
o arriba/abajo) para que no queden espacios vacíos. Con fotos de producto que vienen en
proporciones variadas (como el paquete de mascarillas del screenshot), el resultado es que se
ve la imagen "mochada".

---

## 4. Plan de arreglo — SOLO en `variante/buscar` por ahora

Tres cambios puntuales y acotados a este componente (sin tocar `productos/all` todavía):

| # | Archivo | Cambio |
|---|---|---|
| 1 | `buscar.component.scss` (`:host`, línea 169) | Agregar `overflow-x: hidden;` — contiene cualquier fuga de ancho sin tener que perseguir cada causa individual. Es el fix de mayor impacto para "ya no quiero scroll horizontal". |
| 2 | `buscar.component.scss` (`.vb-search__input`, línea 65) | Agregar `text-overflow: ellipsis; overflow: hidden; white-space: nowrap; min-width: 0;` + acortar el placeholder en el `@media (max-width: 576px)` existente (línea 769) a algo como `"Buscar producto…"`. El `min-width: 0` también ayuda a que el input SÍ pueda encogerse dentro del flex row en vez de forzar ancho. |
| 3 | `buscar.component.scss` (`.vb-card__img`, línea 357-361) | Cambiar `object-fit: cover` → `object-fit: contain` + un `background` neutro en `__img-wrap` para rellenar el espacio sobrante. Alternativa si se prefiere que la imagen llene todo el espacio: reemplazar el `height: 180px` fijo por `aspect-ratio: 4 / 3` (más flexible que un alto fijo, pero sigue recortando — solo `contain` muestra la foto completa siempre). |

Ninguno de los tres cambios afecta otras pantallas — son reglas dentro del `.scss` propio de
este componente (Angular encapsula los estilos por componente).

---

## 4.1 Plan B — si el CSS solo no resuelve alguno de los 3 bugs

Los 3 fixes de la tabla anterior deberían bastar en el 95% de los casos porque son bugs de CSS
puro. Pero por si al probar en el celular real alguno **no** queda bien, acá está el plan de
respaldo para cada uno — usando `BreakpointObserver` de `@angular/cdk` (sección 6.1), que ya
está instalado y es la herramienta correcta cuando el problema deja de ser "visual" y pasa a
ser "necesito una estructura distinta en móvil".

**Cómo saber si el CSS no fue suficiente** (checklist de verificación después de aplicar el
Plan A):
- Abrir `/variantes/buscar` en el celular real (o Chrome DevTools a 320px de ancho).
- Confirmar que la página **no** se desliza a los lados aunque muevas el dedo horizontalmente.
- Confirmar que el placeholder termina en `…` y no a media palabra.
- Confirmar que se ve la foto completa del producto, no recortada.

Si algo de esto sigue fallando, esto es lo que se haría distinto:

| Bug | Si el CSS no alcanza… | Plan B con `BreakpointObserver` |
|---|---|---|
| Scroll horizontal | `overflow-x: hidden` en el `:host` a veces solo **oculta** el síntoma (el contenido sigue calculando de más por dentro, aunque ya no se vea la barra de scroll) — si en el celular real igual "se siente" que algo empuja o el buscador se ve apachurrado | Inyectar `BreakpointObserver` en `buscar.component.ts`, exponer `esMovil$` (`<= 576px`), y en el template usar `[class.vb-search--compacta]="esMovil$ | async"` para que en móvil el buscador cambie de estructura (ej. icono 📷 se mueve fuera de la fila en vez de competir por espacio) en lugar de solo encogerse con CSS. |
| Placeholder cortado | Si acortar el placeholder no es aceptable (por ejemplo si el negocio insiste en mantener el texto largo "mín. 3 caracteres" visible) | Con `esMovil$` mostrar **dos placeholders distintos** vía `[attr.placeholder]="(esMovil$ | async) ? 'Buscar producto…' : 'Buscar por nombre o código de barras (mín. 3 caracteres)…'"` — texto corto en pantallas chicas, completo en desktop, sin depender de que el CSS "adivine" cuánto cabe. |
| Imagen recortada | Si `object-fit: contain` deja mucho espacio vacío feo alrededor de fotos muy angostas o muy anchas (se ve rara con letterboxing) | No es un problema de breakpoint — sería un problema de **datos**, no de layout: pedir al backend fotos de producto ya recortadas a una proporción estándar (ej. 4:3) al subirlas, en vez de intentar arreglarlo en el front con cada variante de proporción que llegue. Anotar como tarea de backend/carga de imágenes, no de este componente. |

**Nota importante:** el Plan B para scroll/placeholder no es "mejor" que el CSS — es más
código y más lógica para mantener. Solo se justifica si en la prueba real el CSS puro no
resuelve el problema. La regla es: primero CSS (sección 4), y solo si falla, se sube de nivel
a `BreakpointObserver` (esta sección).

---

## 5. Por qué esto probablemente también existe en `productos/all`

`src/app/productos/producto/all/all.component.html` tiene el **mismo header, mismo buscador,
mismos filtros** (confirmado por grep — mismos textos "No habilitados", "Con stock e imagen",
"Escanear código de barras…"). Es un copy-paste del mismo patrón visual con otro prefijo BEM
(`pl-` en vez de `vb-`). Muy probablemente tiene los mismos 3 problemas.

**No se toca ahora** — se deja para una segunda pasada una vez que se confirme en vivo que el
fix de `variante/buscar` funciona bien en el celular real. Cuando se confirme, replicar los
mismos 3 cambios en `all.component.scss` con el prefijo `pl-`.

---

## 6. Sobre "pantallas nativas" — ¿existe algo así en Angular?

Sí, existen dos herramientas concretas del ecosistema Angular para esto — y resulta que
**ambas ya están instaladas en este mismo proyecto** (`package.json`), aunque casi sin usar:

### 6.1 `@angular/cdk` — `BreakpointObserver` (ya instalado, sin usar todavía)

Ya tienes `"@angular/cdk": "^14.0.0"` en `package.json` (vino con Angular Material). Trae un
servicio, `BreakpointObserver` (`@angular/cdk/layout`), que es la forma **oficial de Angular**
de detectar el tamaño de pantalla **desde TypeScript**, no solo desde CSS:

```typescript
import { BreakpointObserver } from '@angular/cdk/layout';

constructor(private bo: BreakpointObserver) {
  this.bo.observe(['(max-width: 576px)']).subscribe(result => {
    this.esMovil = result.matches;
  });
}
```

Con `esMovil` en el `.ts`, en el template puedes hacer cosas que el CSS solo no puede — por
ejemplo, colapsar los 6 chips de filtro en un `<select>` o un botón "Filtros ▾" **solo en
móvil**, en vez de solo achicarlos visualmente. Búsqueda en el código: **cero usos actuales**
(`grep -r "BreakpointObserver" src/app` → nada) — la herramienta está disponible pero nadie la
está usando; todo el responsive del proyecto hoy es 100% `@media` en SCSS.

*(Existe también `@angular/flex-layout` con directivas `fxLayout`/`fxHide.lt-sm`, pero está
**oficialmente archivado/deprecado** desde 2022 — no lo instales, usa CDK.)*

### 6.2 Capacitor — ya está parcialmente configurado en ESTE repo desde 2025-05-03

Esto es lo más relevante: en `package.json` ya existen `@capacitor/core`, `@capacitor/android`,
`@capacitor/ios` y `@capacitor/camera`, y en la raíz del repo ya existen las carpetas
**`android/`** y **`ios/`** con proyectos nativos generados (Gradle/Xcode) + `capacitor.config.ts`.
Todo esto se agregó en un solo commit (`58b29fd`, 2025-05-03) y **no se volvió a tocar** —
quedó ahí, sin mantenimiento, probablemente como una prueba para usar la cámara nativa en el
escáner de código de barras (hoy el escáner usa `<video>` + `getUserMedia` del navegador,
`buscar.component.html:51-62`, no la cámara nativa).

**Qué es Capacitor, en concreto:** no reescribe nada — toma la misma build de Angular
(`ng build`) y la empaqueta dentro de un shell nativo Android/iOS (un WebView), dándole acceso
a APIs nativas (cámara, notificaciones push, etc.) y la posibilidad de subirla a Play
Store/App Store como app instalable. Es el camino real de Angular hacia "app nativa" sin
migrar a React Native/Flutter.

**Lo que implicaría revivirlo:** actualizar el `capacitor.config.ts` (el `appId`/`webDir`
actuales apuntan a un experimento viejo, `com.example.barcodescanner` / `dist/producto-scaner`,
no al proyecto real), instalar Xcode/Android Studio, mantener 2 pipelines de build (web + apps
nativas), y gestionar releases en las tiendas. Es una decisión de arquitectura grande — no algo
que resuelva los 3 bugs de hoy, que siguen siendo de CSS puro.

**Mi recomendación:** no revivir Capacitor solo por estos bugs — son de CSS y se arreglan con
CSS (sección 4). Sí vale la pena **empezar a usar `BreakpointObserver`** (6.1) cuando aparezca
un caso donde el CSS solo no alcance (como el ejemplo de colapsar filtros en un dropdown en
móvil). Capacitor queda como opción real y ya semi-lista si en algún momento decides publicar
esto como app instalable en Play Store/App Store — no es humo, hay trabajo real ya hecho, solo
desactualizado.

Lo que sí vale la pena adoptar ya, sin decisiones grandes, es una **disciplina "mobile-first"**
para que este tipo de bug no se repita cada vez que se crea un componente nuevo con
buscador/header (que en este proyecto ya es un patrón que se repite mucho: rifas, admin,
productos, variantes, etc.):

1. **Safety net global:** agregar `overflow-x: hidden;` a `html, body` en `src/styles.scss`
   (una sola línea, cubre TODA la app de una vez — no solo esta pantalla). *No incluido en el
   plan de la sección 4 porque pediste acotar el cambio a variantes por ahora, pero es la
   recomendación de más alto impacto para el resto del proyecto.*
2. **Regla de placeholders/textos largos:** cualquier `<input>`/texto de una sola línea dentro
   de un contenedor flexible lleva `min-width: 0` en el contenedor flex hijo + `text-overflow:
   ellipsis` — mismo patrón que ya existe para `.vb-card__product` (`scss:397-405`), que sí lo
   tiene bien hecho.
3. **Regla de imágenes de producto:** usar `object-fit: contain` (o `aspect-ratio` + `contain`)
   en vez de `cover` + alto fijo, salvo que sepas que TODAS las fotos vienen recortadas al
   mismo ratio de antemano.
4. **Probar en un viewport de 320–375px** (el más angosto común, iPhone SE/mini) antes de dar
   por terminado cualquier componente con buscador/header — en Chrome DevTools, modo
   responsive, ancho 320px.

Esto se puede formalizar como una regla nueva en `CLAUDE.md` (mismo estilo que la regla ya
existente de "ESPACIO LATERAL RESERVADO PARA PROMOCIONES") para que aplique automáticamente a
cualquier componente nuevo con buscador/header — decime si la quieres agregar ahí y la
redacto.

---

## Resumen ejecutivo

| Problema | Causa | Fix propuesto | Alcance |
|---|---|---|---|
| Scroll horizontal | Ningún contenedor tiene `overflow-x: hidden`; el input del buscador puede empujar el ancho | `overflow-x: hidden` en `:host` + `min-width: 0` en el input | Solo `variante/buscar` (por ahora) |
| Placeholder cortado | Texto muy largo (54 car.) sin `ellipsis` | Acortar placeholder en móvil + `text-overflow: ellipsis` | Solo `variante/buscar` (por ahora) |
| Imagen recortada | `object-fit: cover` + alto fijo 180px | `object-fit: contain` | Solo `variante/buscar` (por ahora) |
| Mismo patrón en `productos/all` | Copy-paste del mismo header/buscador | Replicar los 3 fixes con prefijo `pl-` | Pendiente, segunda pasada |
| ¿App nativa? | No es necesario | Disciplina mobile-first + safety net global `overflow-x:hidden` en `styles.scss` | Todo el proyecto, opcional |

**No se modificó ningún archivo de código en este análisis** — solo se creó este documento,
tal como pediste. Decime si aplico los 3 cambios de la sección 4 en `variante/buscar`.
