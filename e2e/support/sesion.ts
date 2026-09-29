import { test as base, expect } from '@playwright/test';

/**
 * `test` con sesión de admin ya iniciada.
 *
 * El login se hace por API y no por pantalla porque es 10 veces más rápido; la pantalla de
 * login tiene su propia prueba en login.spec.ts.
 *
 * Cada prueba inicia SU PROPIA sesión, a propósito: el back rota la cookie de sesión cada vez
 * que se usa, y si detecta una cookie vieja cierra la sesión completa (protección contra robo).
 * Guardar un login y reusarlo en varias pruebas dispararía esa protección.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const usuario  = process.env.E2E_USUARIO;
    const password = process.env.E2E_PASSWORD;
    if (!usuario || !password) {
      throw new Error('Falta E2E_USUARIO / E2E_PASSWORD en e2e/.env (copia .env.example).');
    }

    // page.request comparte las cookies con el navegador: la cookie de sesión que devuelve el
    // login queda guardada y el front la usa al cargar para pedir su token.
    const respuesta = await page.request.post(`${process.env.E2E_URL_API}/v1/auth/login`, {
      data: { userName: usuario, password },
    });
    expect(respuesta.ok(), `El login por API falló (${respuesta.status()}): ${await respuesta.text()}`).toBeTruthy();

    await use(page);
  },
});

export { expect };
