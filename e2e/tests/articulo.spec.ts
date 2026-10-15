import { test, expect } from '../support/sesion';
import { crearModelo } from '../support/modelo';
import { crearArticulo, elegirModelo } from '../support/articulo';

test('dar de alta un artículo le descuenta su stock al modelo', async ({ page }) => {
  const modelo = await crearModelo(page, 10);

  await page.goto('/tienda/venta');
  await elegirModelo(page, modelo);
  await expect(page.locator('.vf-stock__num')).toHaveText(/Quedan 10 disponibles de 10/);

  await crearArticulo(page, modelo, { talla: 'M', color: 'Negro', stock: 3 });

  // La pantalla se limpia al guardar. Se vuelve a elegir el mismo modelo: de sus 10, 3 ya
  // quedaron en el artículo nuevo.
  await elegirModelo(page, modelo);
  await expect(page.locator('.vf-stock__num')).toHaveText(/Quedan 7 disponibles de 10/);
});

test('al elegir el modelo, el artículo nuevo arranca con sus datos', async ({ page }) => {
  const modelo = await crearModelo(page, 10);

  await page.goto('/tienda/venta');
  await elegirModelo(page, modelo);

  await expect(page.locator('[formcontrolname="marca"]')).toHaveValue('Prueba E2E');
  await expect(page.locator('[formcontrolname="descripcion"]')).toHaveValue('Creado por una prueba automática');
});
