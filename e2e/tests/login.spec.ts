import { test, expect } from '@playwright/test';

// Sin prueba de "contraseña incorrecta" a propósito: el back bloquea la IP 15 minutos después
// de 5 intentos fallidos, y correr esa prueba varias veces seguidas te dejaría sin poder entrar
// a QA desde tu Mac.

test('entrar con usuario y contraseña lleva a la lista de modelos', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Usuario').fill(process.env.E2E_USUARIO ?? '');
  await page.getByLabel('Contraseña').fill(process.env.E2E_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/productos\/buscar/);
  await expect(page.getByPlaceholder('Buscar modelo por nombre o código…')).toBeVisible();
});
