import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.route('**/api/stock', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await route.continue();
});
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(3500);
  }
  const menu = page.getByText('Menú', { exact: true }).first();
  if (await menu.count()) await menu.tap();
  const stockButton = page.getByRole('button', { name: 'Stock', exact: true }).first();
  await stockButton.tap();
  await page.screenshot({ path: path.join(screenshotDir, 'production-touch-slow-loading.png'), fullPage: false });
  await page.getByRole('heading', { name: 'Stock y movimientos', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Cargando registros') && !document.body.innerText.includes('Actualizando datos'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, 'production-touch-slow-final.png'), fullPage: false });
  if (errors.length) throw new Error(`Errores de consola: ${errors.join('; ')}`);
  console.log('PASS production touch and slow response: Stock usable on touch viewport');
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, 'production-touch-slow-failed.png'), fullPage: false }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
