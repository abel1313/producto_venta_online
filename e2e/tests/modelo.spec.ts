import { test, expect } from '../support/sesion';
import { crearModelo } from '../support/modelo';

test('dar de alta un modelo y encontrarlo en la lista de modelos', async ({ page }) => {
  const modelo = await crearModelo(page);

  await page.goto('/productos/buscar');
  // pressSequentially y no fill: el buscador reacciona a cada tecla (keyup), y fill pega el
  // texto de golpe sin teclear, así que la búsqueda nunca saldría.
  await page.getByPlaceholder('Buscar nombre o código…').pressSequentially(modelo.codigo);

  // La búsqueda espera 1.5 s después de la última tecla antes de salir al back.
  await expect(page.getByText(modelo.nombre)).toBeVisible({ timeout: 15_000 });
});
