import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const URL_FRONT = process.env.E2E_URL_FRONT ?? 'https://qa.shop.novedades-jade.com.mx';
const URL_API   = process.env.E2E_URL_API   ?? 'https://qa.backend.novedades-jade.com.mx/mis-productos';

// Las pruebas crean modelos y artículos de verdad: contra prod ensuciarían el catálogo real.
const HOSTS_PROD = ['shop.novedades-jade.com.mx', 'backend.novedades-jade.com.mx'];
for (const url of [URL_FRONT, URL_API]) {
  if (HOSTS_PROD.includes(new URL(url).hostname)) {
    throw new Error(`Las pruebas E2E no corren contra producción (${url}). Usa QA.`);
  }
}
process.env.E2E_URL_API = URL_API;

export default defineConfig({
  testDir: './tests',
  // Una a la vez: es más fácil seguirlas con la vista y no se pisan en la base de QA.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // En GitHub Actions además marca las fallas en el resumen de la corrida.
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: URL_FRONT,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    // Todo encendido para que el reporte muestre cada paso, no solo los que fallan.
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    launchOptions: process.env.E2E_CHROMIUM_PATH
      ? { executablePath: process.env.E2E_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } }],
});
