import { test, expect } from '../support/sesion';
import { crearModelo } from '../support/modelo';

test('dar de alta un artículo le descuenta su stock al modelo', async ({ page }) => {
  const modelo = await crearModelo(page, 10);

  // Catálogo → Agregar producto (lo que se vende: modelo + talla + color)
  await page.goto('/tienda/venta');
  const elegirModelo = async () => {
    await page.getByPlaceholder('Buscar modelo por nombre o código…').pressSequentially(modelo.codigo);
    await page.locator('.vf-product-search__item', { hasText: modelo.nombre }).click();
  };

  await elegirModelo();
  await expect(page.locator('.vf-stock__num')).toHaveText(/Quedan 10 disponibles de 10/);

  await page.locator('[formcontrolname="talla"]').fill('M');
  await page.locator('[formcontrolname="color"]').fill('Negro');
  await page.locator('[formcontrolname="stock"]').fill('3');
  await page.getByRole('button', { name: /Guardar producto/ }).click();
  await expect(page.locator('.swal2-title')).toHaveText('¡Variante creada!');
  await expect(page.locator('.swal2-container')).toBeHidden();

  // La pantalla se limpia al guardar. Se vuelve a elegir el mismo modelo: de sus 10, 3 ya
  // quedaron en el artículo nuevo.
  await elegirModelo();
  await expect(page.locator('.vf-stock__num')).toHaveText(/Quedan 7 disponibles de 10/);
});
