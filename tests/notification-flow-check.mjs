import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const code = `PW-NOTIFICATION-FLOW-${Date.now()}`;
let orderId = 0;
try {
  const created = await page.request.post(`${baseUrl}/api/orders`, {
    headers: { 'content-type': 'application/json', 'x-actor': 'Playwright' },
    data: { code, client_id: 78, status: 'Nuevo', amount: 4.88, notes: 'Prueba de ciclo de notificaciones', lines: [{ product_id: 292, quantity: 1, quantity_requested: 1, quantity_unit: 'unidad', unit_price: 4.88, discount: 0, vat: 21, amount: 4.88 }] },
  });
  if (!created.ok()) throw new Error(`No se pudo crear el pedido: ${created.status()}`);
  const createdBody = await created.json();
  orderId = Number(createdBody.id || createdBody.data?.id || 0);
  if (!orderId) throw new Error('El pedido de prueba no devolvió ID');

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
  await page.waitForTimeout(1800);
  await page.evaluate(() => { localStorage.removeItem('excluvas.notifications.seen'); localStorage.removeItem('excluvas.notifications.read'); });
  await page.reload({ waitUntil: 'networkidle' });
  const passwordAfterReload = page.locator('input[type="password"]').first();
  if (await passwordAfterReload.count()) {
    await passwordAfterReload.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: 'Abrir notificaciones' }).click();
  const notification = page.getByText(new RegExp(`Nuevo pedido.*${code}.*ID ${orderId}`)).first();
  await notification.waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotDir, 'notification-flow-open.png'), fullPage: false });
  await notification.click();
  await page.locator('.preview-overlay').waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('.preview-overlay').getByText(code, { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotDir, 'notification-flow-order-modal.png'), fullPage: false });
  if (!(await page.locator('.preview-overlay').innerText()).includes(code)) throw new Error('El aviso no abrió el pedido concreto');
  await page.locator('.preview-close').first().click();
  await page.getByRole('button', { name: 'Abrir notificaciones' }).click();
  await page.getByRole('button', { name: 'Ver historial' }).click();
  await page.getByText(new RegExp(`Nuevo pedido.*${code}.*ID ${orderId}`)).first().waitFor({ state: 'visible', timeout: 5000 });
  if (!(await page.getByText('Leída', { exact: true }).count())) throw new Error('El aviso leído no aparece como Leída en historial');
  await page.screenshot({ path: path.join(screenshotDir, 'notification-flow-history.png'), fullPage: false });
  console.log(`PASS notification flow: ${code} · ID ${orderId}`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, 'notification-flow-failed.png'), fullPage: false }).catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (orderId) await page.request.delete(`${baseUrl}/api/orders/${orderId}`, { headers: { 'x-actor': 'Playwright' } }).catch(() => undefined);
  await browser.close();
}
