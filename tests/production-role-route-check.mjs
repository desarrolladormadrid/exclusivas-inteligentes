import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const cases = [
  ['Comercial', '/comercial', 'Pedidos'],
  ['Almacen', '/almacen', 'Preparación de pedidos'],
  ['Luis', '/crm', 'Panel principal'],
];
const browser = await chromium.launch({ headless: true });
try {
  for (const [username, route, heading] of cases) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    const password = page.locator('input[type="password"]').first();
    if (await password.count()) {
      await page.locator('select').first().selectOption(username);
      await password.fill('Temporal2026');
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      await page.waitForTimeout(3500);
    }
    await page.getByRole('heading', { name: heading, exact: true }).waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Actualizando datos') && !document.body.innerText.includes('Cargando datos desde la base de datos') && !document.body.innerText.includes('Cargando registros'), { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    const body = await page.locator('body').innerText();
    if (username !== 'Luis' && body.includes('Usuarios y permisos')) throw new Error(`${username} ve administración en ${route}`);
    await page.screenshot({ path: path.join(screenshotDir, `production-role-route-${username.toLowerCase()}.png`), fullPage: false });
    console.log(`PASS role ${username} ${route}: ${heading}`);
    await context.close();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
