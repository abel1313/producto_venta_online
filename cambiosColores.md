# Guía de colores y modo claro/oscuro

Este documento define la paleta oficial de la marca y cómo debe implementarse en el proyecto para que todos los componentes queden homologados (mismo color, mismo significado, en toda la página).

## 1. Variables de color (copiar y pegar)

Agregar esto al archivo CSS principal (por ejemplo `globals.css` o `variables.css`):

```css
:root {
  /* Modo claro (por defecto) */
  --color-bg: #F5F1EA;
  --color-surface: #FFFFFF;
  --color-surface-alt: #EDE3D3;
  --color-text: #1C1B19;
  --color-text-secondary: #7A6A58;
  --color-accent: #B08A4E;
  --color-border: #E3DCCC;

  --color-success-bg: #E4E9E4;
  --color-success-text: #3A4A3D;
  --color-warning-bg: #F1E1E1;
  --color-warning-text: #8A3A3A;
}

[data-theme="dark"] {
  --color-bg: #1C1B19;
  --color-surface: #26241F;
  --color-surface-alt: #3A331F;
  --color-text: #F5F1EA;
  --color-text-secondary: #B8AE9C;
  --color-accent: #C9A063;
  --color-border: #3A372F;

  --color-success-bg: #233326;
  --color-success-text: #8FB894;
  --color-warning-bg: #3A2323;
  --color-warning-text: #D48B8B;
}
```

## 2. Cómo se activa el modo oscuro

Se agrega el atributo `data-theme="dark"` en la etiqueta `<html>` o `<body>` cuando el usuario active el modo oscuro (con un botón/switch):

```javascript
// Al hacer clic en el botón de modo oscuro
document.documentElement.setAttribute('data-theme', 'dark');

// Al volver a modo claro
document.documentElement.removeAttribute('data-theme');

// Para recordar la preferencia del usuario
localStorage.setItem('theme', 'dark'); // o 'light'
```

Al cargar la página, revisar si ya había una preferencia guardada:

```javascript
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}
```

## 3. Regla de oro para el desarrollador

**Nunca escribir un color directo (hex) dentro de un componente.** Siempre usar la variable:

```css
/* ❌ Mal — color fijo, no cambia con el tema */
.boton {
  background: #1C1B19;
  color: #F5F1EA;
}

/* ✅ Bien — usa las variables, cambia automático */
.boton {
  background: var(--color-text);
  color: var(--color-bg);
}
```

Si cada componente respeta las variables en lugar de tener su propio color, el cambio de claro a oscuro es automático en toda la página, y cualquier ajuste de color a futuro se hace en un solo lugar (el bloque de variables) en vez de buscar componente por componente.

## 4. Qué variable usar en cada caso

| Elemento | Variable |
|---|---|
| Fondo general de la página | `--color-bg` |
| Fondo de tarjetas / navbar / inputs | `--color-surface` |
| Fondo de imágenes placeholder / iconos destacados | `--color-surface-alt` |
| Texto principal (títulos, precios) | `--color-text` |
| Texto secundario (descripciones) | `--color-text-secondary` |
| Botón principal, íconos activos, precios destacados | `--color-accent` |
| Bordes de tarjetas, inputs, botones secundarios | `--color-border` |
| Etiqueta "En stock" | `--color-success-bg` / `--color-success-text` |
| Etiqueta "Agotado" | `--color-warning-bg` / `--color-warning-text` |

## 5. Ejemplo de un botón ya homologado

```css
.boton-principal {
  background: var(--color-text);
  color: var(--color-bg);
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
}

.boton-secundario {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
}
```

Con este mismo patrón (variable en vez de color fijo) se arma cualquier componente nuevo: cards, badges, formularios, navbar, etc. — y todos quedan parejos entre sí y funcionan en ambos modos sin código extra.