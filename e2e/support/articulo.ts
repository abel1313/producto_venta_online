import { Page, expect } from '@playwright/test';
import { ModeloCreado } from './modelo';

export interface DatosArticulo {
  talla: string;
  color: string;
  stock: number;
}

/**
 * Da de alta un artículo sobre un modelo desde "Catálogo → Agregar artículo" (tienda/venta), igual
 * que una persona. El buscador de modelos reacciona a cada tecla, por eso se escribe con
 * pressSequentially y no con fill.
 */
export async function crearArticulo(page: Page, modelo: ModeloCreado, datos: DatosArticulo): Promise<void> {
  await page.goto('/tienda/venta');
  await elegirModelo(page, modelo);
  await page.locator('[formcontrolname="talla"]').fill(datos.talla);
  await page.locator('[formcontrolname="color"]').fill(datos.color);
  await page.locator('[formcontrolname="stock"]').fill(String(datos.stock));
  await page.getByRole('button', { name: /Guardar artículo/ }).click();
  await expect(page.locator('.swal2-title')).toHaveText('¡Artículo creado!');
  await expect(page.locator('.swal2-container')).toBeHidden();
}

/** En "Agregar artículo", busca el modelo por su código y lo elige. */
export async function elegirModelo(page: Page, modelo: ModeloCreado): Promise<void> {
  await page.getByPlaceholder('Buscar modelo por nombre o código…').pressSequentially(modelo.codigo);
  await page.locator('.vf-product-search__item', { hasText: modelo.nombre }).click();
}
