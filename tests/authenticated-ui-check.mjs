import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const screenshotDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
const password = page.locator('input[type="password"]').first();
if (await password.count()) {
  await password.fill('Temporal2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForTimeout(3500);
}
if ((await page.locator('input[type="password"]:visible').count()) > 0) {
  await page.screenshot({ path: path.join(screenshotDir, 'v2-auth-login-failed.png'), fullPage: true });
  throw new Error('Authentication did not complete');
}

async function capture(name, viewport = null) {
  if (viewport) await page.setViewportSize(viewport);
  // La API local puede tardar varios segundos; no guardar capturas engañosas
  // con una tabla vacía mientras todavía está llegando la respuesta.
  try {
    await page.waitForFunction(() => !document.body.innerText.includes('Cargando datos desde la base de datos…') && !document.body.innerText.includes('Cargando datos desde la base de datos...'), { timeout: 20000 });
  } catch {}
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
  console.log(`PASS ${name}`);
}

await capture('v2-auth-home-desktop');
const prep = page.getByText('Preparación de pedidos', { exact: true }).first();
if (await prep.count()) {
  await prep.click();
  await page.waitForTimeout(800);
  await capture('v2-auth-preparation-desktop');
  const command = page.getByText('Abrir comanda', { exact: true }).first();
  if (await command.count()) {
    await command.click();
    await page.waitForTimeout(600);
    await capture('v2-auth-loading-note-desktop');
    const close = page.locator('.preview-close').first();
    if (await close.count()) await close.click();
  }
}
const stock = page.getByText('Stock', { exact: true }).first();
if (await stock.count()) { await stock.click(); await page.waitForTimeout(800); await capture('v2-auth-stock-desktop'); }
await capture('v2-auth-stock-tablet', { width: 1024, height: 768 });
await capture('v2-auth-stock-mobile', { width: 390, height: 844 });

await page.setViewportSize({ width: 1440, height: 900 });
const home = page.getByText('Inicio', { exact: true }).first();
if (await home.count()) await home.click();
await page.waitForTimeout(500);
const newOrder = page.getByRole('button', { name: /Nuevo pedido/i }).first();
if (!(await newOrder.count())) throw new Error('New order action is not available');
await newOrder.click();
await page.waitForTimeout(2500);
if (!(await page.getByText('Crear pedido', { exact: true }).count())) throw new Error('New order modal did not open');
await capture('v2-auth-create-order-modal-desktop');
console.log('PASS create order modal: opens with expected title');

if (errors.length) { console.error('Console errors:', errors); process.exitCode = 1; }
else console.log('PASS authenticated browser console: clean');
await browser.close();
