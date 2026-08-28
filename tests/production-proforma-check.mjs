import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const pageUrl = process.env.PAGE_URL || baseUrl;
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('dialog', async (dialog) => { await dialog.accept(); });
const headers = { 'content-type': 'application/json', 'x-actor': 'Playwright' };
const created = { products: [], clients: [], invoices: [], invoice_lines: [] };
const api = (resource, id = '') => `${baseUrl}/api/${resource}${id ? `/${id}` : ''}`;
async function call(resource, options = {}, id = '') {
  const response = await page.request.fetch(api(resource, id), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok()) throw new Error(`${options.method || 'GET'} ${resource}: ${response.status()} ${JSON.stringify(data)}`);
  return data;
}
async function create(resource, data) {
  const row = await call(resource, { method: 'POST', headers, data });
  if (created[resource]) created[resource].push(Number(row.id));
  return row;
}
async function waitForData() {
  await page.waitForFunction(() => !document.body.innerText.includes('Cargando datos desde la base de datos') && !document.body.innerText.includes('Cargando registros'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(700);
}
try {
  const suffix = Date.now();
  const product = await create('products', { name: `PW-PROFORMA-PRODUCT-${suffix}`, sku: `PW-PROFORMA-${suffix}`, unit_price: 12, cost_price: 5, stock: 20, category: 'Pruebas funcionales' });
  const client = await create('clients', { name: `PW-PROFORMA-CLIENT-${suffix}`, phone: '600000000', address: 'Calle de proforma 1, Madrid' });
  const proforma = await create('invoices', { code: `PRO-PW-${suffix}`, client_id: client.id, amount: 12, status: 'Proforma', issue_date: '2026-08-27' });
  const line = await create('invoice_lines', { invoice_id: proforma.id, product_id: product.id, quantity: 1, unit_price: 12, discount: 0, vat: 21, amount: 12 });
  await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(3500);
  }
  await page.getByRole('button', { name: 'Facturas', exact: true }).last().click();
  await waitForData();
  const row = page.getByRole('row').filter({ hasText: proforma.code }).first();
  await row.getByRole('button', { name: 'Convertir en factura', exact: true }).click();
  await page.waitForTimeout(2500);
  const invoices = await call('invoices');
  const updated = invoices.find((item) => Number(item.id) === Number(proforma.id));
  const lines = await call('invoice_lines');
  if (!updated || updated.status !== 'Pendiente' || !String(updated.code).startsWith('FAC-') || !lines.some((item) => Number(item.id) === Number(line.id) && Number(item.invoice_id) === Number(proforma.id))) throw new Error('La conversión de proforma no conservó código, estado o línea');
  await page.screenshot({ path: path.join(screenshotDir, 'production-proforma-converted.png'), fullPage: false });
  console.log(`PASS production proforma: ${proforma.id} · ${updated.code} · línea conservada`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, 'production-proforma-failed.png'), fullPage: false }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const id of created.invoice_lines) await call('invoice_lines', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.invoices) await call('invoices', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.clients) await call('clients', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.products) await call('products', { method: 'DELETE', headers }, id).catch(() => {});
  await browser.close();
}
