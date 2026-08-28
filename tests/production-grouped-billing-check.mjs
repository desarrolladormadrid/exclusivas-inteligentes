import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const pageUrl = process.env.PAGE_URL || baseUrl;
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const headers = { 'content-type': 'application/json', 'x-actor': 'Playwright' };
const created = { suppliers: [], products: [], clients: [], collection_points: [], orders: [], invoices: [], invoice_lines: [] };
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
  const supplier = await create('suppliers', { name: `PW-BILLING-SUPPLIER-${suffix}`, tax_id: `B${String(suffix).slice(-8)}` });
  const product = await create('products', { name: `PW-BILLING-PRODUCT-${suffix}`, sku: `PW-BILLING-${suffix}`, supplier_id: supplier.id, primary_supplier_id: supplier.id, unit_price: 10, cost_price: 4, stock: 30, min_stock: 5, category: 'Pruebas funcionales' });
  const client = await create('clients', { name: `PW-BILLING-CLIENT-${suffix}`, phone: '600000000', address: 'Calle de facturación 1, Madrid' });
  const point = await create('collection_points', { code: `PW-BILLING-CP-${suffix}`, name: 'Dirección de facturación', client_id: client.id, address: 'Calle de facturación 1, Madrid', city: 'Madrid' });
  const orderData = (index) => ({ code: `PW-BILLING-ORDER-${suffix}-${index}`, client_id: client.id, collection_point_id: point.id, status: 'Nuevo', amount: 10, lines: [{ product_id: product.id, quantity: 1, quantity_requested: 1, quantity_unit: 'unidad', unit_price: 10, discount: 0, vat: 21, amount: 10 }] });
  const firstOrder = await create('orders', orderData(1));
  const secondOrder = await create('orders', orderData(2));
  await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(3500);
  }
  await page.getByRole('button', { name: 'Pedidos', exact: true }).last().click();
  await waitForData();
  const billingFilter = page.locator('select.billing-filter-select');
  if (!(await billingFilter.count())) throw new Error('El listado de pedidos no muestra el filtro de facturación');
  await billingFilter.selectOption('pendientes');
  for (const code of [firstOrder.code, secondOrder.code]) {
    const row = page.locator('.table-scroll tbody tr').filter({ hasText: code }).first();
    await row.waitFor({ state: 'visible', timeout: 30000 });
    if (!(await row.innerText()).includes('Sin facturar')) throw new Error(`El pedido ${code} no aparece como Sin facturar`);
  }
  await billingFilter.selectOption('todos');
  await page.getByRole('button', { name: 'Facturar pedidos', exact: true }).click();
  const billing = page.locator('.billing-modal');
  await billing.getByText('Facturar pedidos', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  for (const code of [firstOrder.code, secondOrder.code]) {
    await billing.locator('.billing-row').filter({ hasText: code }).locator('input[type="checkbox"]').check();
  }
  await page.screenshot({ path: path.join(screenshotDir, 'production-grouped-billing-selected.png'), fullPage: false });
  const billingResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/billing') && response.request().method() === 'POST', { timeout: 30000 });
  await billing.getByRole('button', { name: 'Crear factura agrupada', exact: true }).click();
  const billingResponse = await billingResponsePromise;
  const billingResult = await billingResponse.json();
  if (!billingResult.id) throw new Error('La facturación agrupada no devolvió factura');
  created.invoices.push(Number(billingResult.id));
  await billing.waitFor({ state: 'hidden', timeout: 30000 });
  const invoices = await call('invoices');
  const invoice = invoices.find((row) => Number(row.id) === Number(billingResult.id));
  const invoiceLines = await call('invoice_lines');
  const lines = invoiceLines.filter((row) => Number(row.invoice_id) === Number(billingResult.id));
  created.invoice_lines.push(...lines.map((row) => Number(row.id)));
  const orders = await call('orders');
  const billingRows = await call('billing');
  const duplicateAttempt = await page.request.post(api('orders', `${firstOrder.id}/convert-invoice`), { headers });
  if (duplicateAttempt.status() !== 409) throw new Error('Un pedido ya facturado permite intentar facturarlo de nuevo');
  if (!invoice || lines.length !== 2 || ![firstOrder.id, secondOrder.id].every((id) => orders.some((row) => Number(row.id) === Number(id) && row.status === 'Facturado' && row.billing_status === 'Facturado')) || ![firstOrder.id, secondOrder.id].every((id) => billingRows.some((row) => Number(row.id) === Number(id) && Number(row.billed) === 1))) throw new Error('La factura agrupada no conservó las dos líneas o no marcó los pedidos');
  await page.screenshot({ path: path.join(screenshotDir, 'production-grouped-billing-success.png'), fullPage: false });
  console.log(`PASS production grouped billing: ${billingResult.id} · 2 pedidos · 2 líneas`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, 'production-grouped-billing-failed.png'), fullPage: false }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const id of created.invoice_lines) await call('invoice_lines', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.invoices) await call('invoices', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.orders) await call('orders', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.collection_points) await call('collection_points', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.clients) await call('clients', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.products) await call('products', { method: 'DELETE', headers }, id).catch(() => {});
  for (const id of created.suppliers) await call('suppliers', { method: 'DELETE', headers }, id).catch(() => {});
  await browser.close();
}
