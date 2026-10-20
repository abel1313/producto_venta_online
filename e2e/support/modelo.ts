import { Page, expect } from '@playwright/test';
import { codigoE2E } from './datos';

export interface ModeloCreado {
  codigo: string;
  nombre: string;
  stock: number;
}

/**
 * Da de alta un modelo desde "Catálogo → Agregar producto" (productos/agregar), igual que una
 * persona. Lo usan las pruebas que necesitan un modelo propio para trabajar.
 *
 * Los campos se ubican por su formControlName: las etiquetas de esa pantalla no están ligadas
 * a su campo, así que "buscar por etiqueta" no los encuentra.
 */
export async function crearModelo(page: Page, stock = 10): Promise<ModeloCreado> {
  const codigo = codigoE2E();
  const nombre = `E2E Bolsa ${codigo}`;
  const campo = (nombreControl: string) => page.locator(`[formcontrolname="${nombreControl}"]`);

  await page.goto('/productos/agregar');
  await campo('nombre').fill(nombre);
  await campo('marca').fill('Prueba E2E');
  await campo('precioCosto').fill('150');
  await campo('precioVenta').fill('350');
  await campo('stock').fill(String(stock));
  await campo('descripcion').fill('Creado por una prueba automática');
  await campo('codigoBarras').fill(codigo);

  await page.getByRole('button', { name: /Guardar producto/ }).click();
  // Desde el flujo A (2026-10-08) al guardar no sale un aviso: sale la ventana 🧩 con la pregunta
  // "¿Cuántos artículos quieres hacer?". Las pruebas hacen sus artículos aparte: "Ahora no".
  await expect(page.locator('app-alta-articulos #aaTitulo')).toHaveText('✅ Producto guardado');
  await page.locator('app-alta-articulos').getByRole('button', { name: 'Ahora no' }).click();
  await expect(page.locator('app-alta-articulos')).toBeHidden();

  return { codigo, nombre, stock };
}
