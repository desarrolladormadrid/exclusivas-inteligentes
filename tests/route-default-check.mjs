import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const prefix = process.env.SCREENSHOT_PREFIX || 'route-default';
const screenshotDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

async function loginIfNeeded() {
  const password = page.locator('input[type="password"]:visible').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.locator('input[type="password"]:visible').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

async function checkRoute(route, heading) {
  const screenshotPath = path.join(screenshotDir, `${prefix}-${route.slice(1)}.png`);
  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    throw error;
  }
  await page.waitForFunction(() => document.querySelector('input[type="password"]') || document.querySelector('.workspace') || !document.body.innerText.includes('Comprobando sesión'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  await loginIfNeeded();
  await page.waitForFunction(() => !document.body.innerText.includes('Cargando datos desde la base de datos…') && !document.body.innerText.includes('Cargando datos desde la base de datos...'), { timeout: 20000 }).catch(() => {});
  await page.screenshot({ path: screenshotPath, fullPage: true });
  if (!(await page.locator('body').innerText()).includes(heading)) throw new Error(`${route} no abre ${heading}; URL actual: ${page.url()}`);
  console.log(`PASS ${route}: ${heading}`);
}

await checkRoute('/almacen', 'Preparación de pedidos');
await checkRoute('/comercial', 'Hola, Luis');

await page.goto(`${baseUrl}/crm`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
await loginIfNeeded();
await page.waitForTimeout(1000);
const expensesSection = page.getByRole('button', { name: 'Gastos y tickets', exact: true }).first();
if (!(await expensesSection.count())) throw new Error('No aparece la sección Gastos y tickets');
await expensesSection.click();
await page.waitForFunction(() => !document.body.innerText.includes('Cargando datos desde la base de datos…') && !document.body.innerText.includes('Cargando datos desde la base de datos...') && !document.body.innerText.includes('Cargando registros…') && !document.body.innerText.includes('Cargando registros...'), { timeout: 20000 }).catch(() => {});
await page.getByRole('button', { name: 'Crear gasto', exact: true }).click();
await page.waitForTimeout(500);
const expenseDate = page.locator('input[type="date"]').first();
const expenseDateValue = await expenseDate.inputValue();
await page.screenshot({ path: path.join(screenshotDir, `${prefix}-expense.png`), fullPage: true });
if (!expenseDateValue) throw new Error('El formulario de gasto no precarga la fecha');
console.log(`PASS Gastos y tickets: fecha precargada ${expenseDateValue}`);

if (consoleErrors.length) {
  console.error('Console errors:', consoleErrors);
  process.exitCode = 1;
} else {
  console.log('PASS direct-route console: clean');
}
await browser.close();
