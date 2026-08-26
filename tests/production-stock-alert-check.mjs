import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const screenshotPath = path.join(process.cwd(), 'tests', 'screenshots', 'stock-alert-modal-production.png');
await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const code = `PW-STOCK-ALERT-${Date.now()}`;
let orderId = 0;
try {
  const created = await page.request.post(`${baseUrl}/api/orders`, {
    headers: { 'content-type': 'application/json', 'x-actor': 'Playwright' },
    data: { code, client_id: 78, status: 'Nuevo', amount: 4880, notes: 'Prueba controlada de alerta de stock', lines: [{ product_id: 292, quantity: 999, quantity_requested: 999, quantity_unit: 'unidad', unit_price: 4.88, discount: 0, vat: 21, amount: 4880 }] },
  });
  if (!created.ok()) throw new Error(`No se pudo crear el pedido: ${created.status()}`);
  const body = await created.json();
  orderId = Number(body.id || body.data?.id || 0);
  if (!orderId) throw new Error('El pedido no devolvió ID');

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
  await page.waitForTimeout(5000);
  await page.evaluate(() => { localStorage.removeItem('excluvas.notifications.seen'); localStorage.removeItem('excluvas.notifications.read'); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  const passwordAfterReload = page.locator('input[type="password"]').first();
  if (await passwordAfterReload.count()) {
    await passwordAfterReload.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(5000);
  }
  await page.getByRole('button', { name: 'Abrir notificaciones' }).click();
  const notification = page.getByText(new RegExp(`Alerta de stock.*${code}.*ID ${orderId}`)).first();
  await notification.waitFor({ state: 'visible', timeout: 15000 });
  await notification.click();
  await page.locator('.stock-alert-card').waitFor({ state: 'visible', timeout: 10000 });
  const modalText = await page.locator('.stock-alert-card').innerText();
  for (const expected of ['Déficit detectado', 'Stock físico', 'Reservado / pendiente', 'Déficit', code]) {
    if (!modalText.includes(expected)) throw new Error(`La modal de stock no muestra: ${expected}`);
  }
  if (modalText.includes('Disponible real')) throw new Error('La modal conserva el campo redundante Disponible real');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`PASS production stock alert modal: ${code} · ID ${orderId}`);
} catch (error) {
  await page.screenshot({ path: path.join(path.dirname(screenshotPath), 'stock-alert-modal-production-failed.png'), fullPage: false }).catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (orderId) await page.request.delete(`${baseUrl}/api/orders/${orderId}`, { headers: { 'x-actor': 'Playwright' } }).catch(() => undefined);
  await browser.close();
}
