import { test, expect } from '../support/sesion';
import { Page } from '@playwright/test';
import { crearModelo } from '../support/modelo';
import { crearArticulo } from '../support/articulo';

// El modelo de prueba se vende a $350 (ver support/modelo.ts).

async function buscarEnTienda(page: Page, codigo: string) {
  await page.goto('/tienda/buscar');
  await page.getByPlaceholder('Buscar nombre o código…').pressSequentially(codigo);
  const card = page.locator('.vb-card', { hasText: codigo });
  await expect(card).toHaveCount(1, { timeout: 15_000 });
  return card;
}

/** 💲 de la card: elige "Precio venta" o "Precio descuento" (con su monto) y guarda. */
async function cambiarPrecio(page: Page, card: ReturnType<Page['locator']>, descuento: number | null) {
  await card.getByTitle('Cambiar el precio de este artículo (solo este)').click();
  await expect(page.locator('#sw-precio-normal')).toBeDisabled();
  if (descuento === null) {
    await page.locator('#sw-usar-venta').check();
  } else {
    await page.locator('#sw-usar-desc').check();
    await page.locator('#sw-precio-desc').fill(String(descuento));
  }
  await page.getByRole('button', { name: 'Guardar precio' }).click();
  await expect(page.locator('.swal2-icon-success')).toBeVisible();
  await expect(page.locator('.swal2-container')).toBeHidden();
}

async function llevarAlCarrito(page: Page, card: ReturnType<Page['locator']>) {
  await card.getByTitle('Agregar al carrito').click();
  await page.goto('/tienda/carrito');
  return page.locator('tbody tr').first();
}

test('con "Precio descuento" el artículo se vende con descuento; quitar "Usar" cobra el normal solo en esa venta', async ({ page }) => {
  const modelo = await crearModelo(page, 10);
  await crearArticulo(page, modelo, { talla: 'M', color: 'Negro', stock: 3 });

  const card = await buscarEnTienda(page, modelo.codigo);
  await expect(card).toContainText('$350.00');
  await cambiarPrecio(page, card, 250);
  await expect(card).toContainText('$250.00');

  const linea = await llevarAlCarrito(page, card);
  await expect(linea).toContainText('$250.00');
  await expect(linea.locator('.vv-otro__usar input')).toBeChecked();

  await linea.locator('.vv-otro__usar input').uncheck();
  await expect(linea).toContainText('$350.00');
  await expect(linea).not.toContainText('$250.00');
});

test('con "Precio venta" el descuento solo se aplica con "Usar", y 👁 lo muestra y lo vuelve a borrar', async ({ page }) => {
  const modelo = await crearModelo(page, 10);
  await crearArticulo(page, modelo, { talla: 'S', color: 'Rojo', stock: 3 });

  // Se le pone un descuento y luego se regresa a "Precio venta": el descuento queda guardado
  // para usarlo en una venta, pero el artículo se vende al normal.
  const card = await buscarEnTienda(page, modelo.codigo);
  await cambiarPrecio(page, card, 250);
  await cambiarPrecio(page, card, null);
  await expect(card).toContainText('$350.00');

  const linea = await llevarAlCarrito(page, card);
  await expect(linea).toContainText('$350.00');
  await expect(linea).toContainText('$ ••••');
  await expect(linea.locator('.vv-otro__usar input')).not.toBeChecked();

  // 👁 lo pide al back y lo muestra; 🙈 lo borra de la página.
  await linea.getByTitle('Ver', { exact: true }).click();
  await expect(linea).toContainText('$250.00');
  await linea.getByTitle('Tapar').click();
  await expect(linea).not.toContainText('$250.00');

  // Un descuento sin aplicar no queda guardado en el navegador.
  const guardado = await page.evaluate(() => localStorage.getItem('carritoVariante') ?? '');
  expect(guardado).not.toContain('250');

  // "Usar" lo aplica a esta venta.
  await linea.locator('.vv-otro__usar input').check();
  await expect(linea).toContainText('$250.00');
});
