# Pruebas de punta a punta (Playwright)

Abren un Chrome de verdad, entran al admin de **QA** y hacen lo que haría una persona. Si algo no
pasa como se espera, la prueba sale en rojo con captura, video y el paso exacto donde falló.

**Solo corren contra QA.** Crean modelos y artículos de verdad (todos con `E2E` en el código de
barras y en el nombre); la configuración se niega a correr contra prod.

## Primera vez (en tu Mac)

```bash
cd e2e
npm install
npx playwright install chromium
cp .env.example .env      # y llena E2E_USUARIO / E2E_PASSWORD
```

El usuario de pruebas tiene que ser admin (o tener el correo verificado) y ver las pantallas
Agregar modelo, Modelos y Agregar producto.

## Correrlas

| Comando | Qué hace |
|---|---|
| `npm run test:ui` | Ventana con la lista de pruebas: das clic y ves cada paso, con línea de tiempo |
| `npm run test:ver` | Corre todas y ves el Chrome moviéndose solo |
| `npm test` | Corre todas sin mostrar el navegador |
| `npm run reporte` | Abre el reporte de la última corrida (capturas, video, pasos) |
| `npm run grabar` | Abre Chrome en QA y escribe el código de lo que tú hagas a mano |

## Qué prueba cada archivo

- `tests/login.spec.ts`: entrar con usuario y contraseña lleva a la lista de modelos.
- `tests/modelo.spec.ts`: dar de alta un modelo y encontrarlo en la lista por su código.
- `tests/articulo.spec.ts`: un artículo de 3 piezas sobre un modelo de 10 deja "Quedan 7
  disponibles de 10", y al elegir el modelo el artículo nuevo arranca con su marca y descripción.
- `tests/descuento.spec.ts`: el 💲 de la card con "Precio descuento" hace que el artículo se venda
  con descuento y entre al carrito con "Usar" marcado; con "Precio venta" el descuento solo se
  aplica con "Usar", el 👁 lo pide y 🙈 lo borra, y nunca queda en el navegador.

## No corren solas

Se quitaron del deploy de QA (2026-09-30): en GitHub corren sin ventana y solo dejan la grabación
al final. Se corren a mano desde tu máquina con `npm run test:ver` o `npm run test:ui`, que sí se
ven en vivo.

## Limpiar lo que crean

Todo lleva un código de barras `E2E` + 13 dígitos. `limpiar_datos_e2e_qa.sql` (repo del back) los
da de baja en `inventario_key_qa`; se puede correr cuando se quiera.

## Cosas que hay que saber

- **Cada prueba inicia su propia sesión.** El back rota la cookie de sesión en cada uso y, si ve
  una vieja, cierra la sesión completa. Por eso no se guarda un login para reusarlo.
- **No hay prueba de "contraseña incorrecta".** El back bloquea la IP 15 minutos tras 5 intentos
  fallidos; correrla varias veces te dejaría sin poder entrar a QA.
- **Los buscadores reaccionan a cada tecla**, así que en las pruebas se escribe con
  `pressSequentially`, no con `fill` (que pega el texto sin teclear y la búsqueda nunca sale).
