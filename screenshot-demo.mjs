import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium'
});

const context = await browser.createContext({ viewport: { width: 1280, height: 1600 } });
const page = await context.newPage();

try {
  console.log('Navegando a http://localhost:4200/demo-tablas...');
  await page.goto('http://localhost:4200/demo-tablas', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('Esperando renderizado de tablas...');
  await page.waitForTimeout(3000);
  
  console.log('Capturando screenshot...');
  await page.screenshot({ 
    path: '/tmp/demo-tablas-screenshot.png',
    fullPage: true 
  });
  
  console.log('✅ Screenshot guardado en /tmp/demo-tablas-screenshot.png');
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await browser.close();
}
