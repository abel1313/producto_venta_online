# 🌹 Flores eternas — estado del módulo

> Documento vivo. Resume **qué existe, qué se decidió y por qué, y qué falta**.
> Última actualización: **2026-08-15**.
>
> El detalle cronológico de cada cambio está en `CLAUDE.md`. Aquí solo el estado actual, para no
> tener que reconstruirlo leyendo 20 secciones.

---

## 1. Qué es este módulo

Una línea de producto **aparte** del catálogo normal (bolsas, blusas, perfumes): ramos de rosas
eternas que **se arman por pedido**, no se tienen hechos.

Dos formas de vender:

| | Qué es | Pantalla |
|---|---|---|
| **Flujo A — Arma tu ramo** | El cliente lo configura desde cero: especie, cantidad, colores, accesorios, listón | `/flores/configurar` (pública) |
| **Flujo B — Ramos armados** | El dueño preconfigura ramos completos con precio fijo; el cliente solo elige uno | `/flores/ramos` (pública) |

Son **independientes**: un ramo armado no aparece en el configurador ni al revés.

---

## 2. Pantallas construidas

| Ruta | Quién | Qué hace |
|---|---|---|
| `/flores/ramos` | Todos | Vitrina de ramos ya armados, con su desglose |
| `/flores/configurar` | Todos | El configurador completo (6 pasos + fecha + urgencia) |
| `/flores/catalogos` | Admin | Tipos de flor, colores, cantidades válidas, accesorios, frases |
| `/flores/entregas` | Admin | Plazos de entrega por tamaño (normal y urgente) |
| `/flores/zonas` | Admin | Zonas de entrega y costo de envío |
| `/flores/ramos-admin` | Admin | Alta y edición de ramos preconfigurados |
| `/flores/frases` | Admin | Bandeja de frases de listón esperando precio |

⚠️ `/flores/zonas` es **la misma pantalla** que `/lugares-entrega` de Inventario, con ruta propia
para que el menú no salte de sección. No está duplicada.

---

## 3. Cómo se arma el precio

```
  precio por flor × cantidad          ← TipoFlor.precioPorFlor (incluye mano de obra)
+ papel                               ← pliegos del tamaño × precio por pliego   [OCULTO]
+ accesorios elegidos                 ← Corona, luces, etc.
+ listón                              ← frase del catálogo, o pendiente de precio
+ envío                               ← LugarEntrega.costoEnvio
+ cargo urgente                       ← solo si eligió entrega apurada          [VISIBLE]
```

### Decisiones tomadas sobre qué ve el cliente

- **El papel NO se le muestra**, ni como opción ni como renglón. Va incluido y se cobra por
  dentro, sumado a la línea de flores. *Decisión del dueño.* Solo se le pregunta en ramos muy
  chicos (por debajo del umbral configurado).
- **El cargo urgente SÍ lleva renglón propio.** El cliente lo eligió en un botón que ya le decía
  el precio; esconderlo después sería raro.
- **Las líneas visibles siempre suman el total exacto.** Si algo se esconde, se funde en otra
  línea — nunca se deja un descuadre.

---

## 4. Reglas de negocio vigentes

1. **Las cantidades válidas son las que "cierran el círculo".** Si el cliente pide otra, se le
   sugieren la de arriba y la de abajo — pero **puede seguir con la suya**: el sistema avisa, no
   prohíbe.
2. **Los plazos se redondean hacia arriba.** Un ramo de 37 se maneja con las reglas del de 48.
   Nunca hacia abajo: comprometería al taller a un plazo que no puede cumplir.
3. ⚠️ **Los pliegos y la mano de obra NO redondean** — buscan coincidencia exacta con la cantidad.
   Solo los plazos de entrega heredan del tamaño superior.
4. **La fecha se cuenta desde que el cliente confirma**, no desde que armó el ramo.
5. **La zona de entrega es obligatoria** (o marcar "voy a recoger en la tienda").
6. **Un ramo urgente nace APARTADO**, con el 50% de anticipo. No de contado.
7. **El stock no se aparta hasta confirmar** — el ramo se hace por pedido.
8. **Una frase personalizada siempre termina en el catálogo**, tenga o no un ramo detrás. Sirve
   para el próximo cliente. El dueño puede deshabilitarla.

---

## 5. Qué pasa con una frase que no existe

1. El cliente la escribe → **su ramo se vende igual**, con total **provisional**.
2. Le llega **un correo al dueño** avisando.
3. El dueño le pone precio en `/flores/frases`.
4. Le llega **un correo al cliente** diciéndole cuánto es.
5. Se genera un pedido aparte para cobrar ese extra.

⚠️ **Los pasos 1 y 5 van a cambiar** cuando el back entregue el "armado guardado" (ver §7).

---

## 6. Lo que se descartó, y por qué

**Guardar el pedido cuando el cliente no verifica su correo.** Se planteó, se respondieron las 5
preguntas de negocio, y **el dueño lo canceló** — con razón: si el cliente vuelve días después, la
fecha ya se pasó y hay que recotizar stock, fecha y precio de todos modos. Guardar el pedido no
ahorraba nada y traía estados nuevos, caducidad y una bandeja que mantener.

**Comportamiento actual:** si no verifica, **no se guarda nada**, y se le dice claramente.

---

## 7. En curso — el back lo está diseñando

**Armado guardado.** Distinto del pedido pendiente que se canceló: **no es una venta**, es el ramo
a medias esperando a que el dueño cotice la frase. No aparta stock ni entra en reportes.

Decidido con el dueño:

- Caduca a **1 semana**
- **Uno solo** por cliente — el nuevo reemplaza al anterior
- Al borrarse, **solo se borra el armado**; la frase sigue su camino
- Al retomarlo, **fecha y precio se recalculan** contra ese momento
- ⚠️ En este flujo, aprobar una frase **ya no debe generar el pedido de anticipo aparte** — el
  precio entra como una línea más del pedido normal

---

## 8. Qué falta

### Del dueño
- [ ] **Bajar el umbral del papel a 5** en Catálogos → Accesorios. Mientras esté en 20, un ramo de
      exactamente 20 le sale al cliente con el papel como casilla opcional.

### Antes de publicar
- [ ] **En producción los GET de flores piden sesión.** Como `/flores/ramos` y `/flores/configurar`
      son públicas, un visitante sin cuenta vería la pantalla rota. En QA ya son públicas.
- [ ] **Los ramos armados (Flujo B) no validan ni cobran urgencia.** Si alguien pide uno
      preconfigurado "para mañana", no hay bloqueo de fecha ni cargo. Solo el Flujo A lo maneja.

### Opcional, decisión del dueño
- [ ] Casilla **"ya me lo pagó en efectivo"** en la bandeja de frases. El campo existe pero hoy no
      funciona: generaría un cobro duplicado. Requiere cambio del back.

### Sin probar nunca
- [ ] **El camino completo con datos reales**: armar un ramo → confirmarlo → cobrarlo en `/abonos`.
- [ ] **La recotización del pago tardío.** Está conectada en los dos puntos de cobro, pero hace
      falta un ramo urgente cuyo pago se pase de la hora límite.

### Infraestructura
- [ ] **El backend de QA se cae seguido.** Todo el 2026-08-14 estuvo intermitente (502). El front
      responde bien; es el servicio. **Bloquea cualquier prueba en vivo.**

---

## 9. Verificado en vivo contra QA (2026-08-14)

- Zonas sin sesión → **200**, y el visitante anónimo ya **no sale expulsado** al login
- Ramo de 20 urgente → `500 flores + 15 papel + 50 urgencia = 565`, anticipo `282.50`
- Frente desplegado en QA **al día**, hasta el último commit
