import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const pageUrl = process.env.PAGE_URL || baseUrl;
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const suffix = Date.now();
const sku = `PW-FORM-${suffix}`;
const name = `PW-FORM-PRODUCT-${suffix}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('dialog', async (dialog) => { await dialog.accept(); });
let createdId = 0;
async function fillField(form, text, value) {
  const label = form.locator('label').filter({ hasText: text }).first();
  const control = label.locator('input,textarea,select').first();
  if (!(await control.count())) throw new Error(`No se encontró el campo ${text}`);
  if ((await control.getAttribute('tagName')) === 'SELECT') await control.selectOption({ index: 1 });
  else await control.fill(value);
}
try {
  await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(3500);
  }
  await page.getByRole('button', { name: 'Productos', exact: true }).last().click();
  await page.waitForFunction(() => !document.body.innerText.includes('Cargando datos desde la base de datos') && !document.body.innerText.includes('Cargando registros'), { timeout: 30000 }).catch(() => {});
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  const form = page.locator('form').last();
  const suppliersResponse = await page.request.get(`${baseUrl}/api/suppliers`);
  const suppliers = await suppliersResponse.json();
  const supplierName = (Array.isArray(suppliers) ? suppliers : []).find((item) => item.name)?.name;
  if (!supplierName) throw new Error('No hay proveedores disponibles para completar el producto');
  const warehousesResponse = await page.request.get(`${baseUrl}/api/warehouses`);
  const warehouses = await warehousesResponse.json();
  const warehouseId = (Array.isArray(warehouses) ? warehouses : []).find((item) => item.id)?.id;
  if (!warehouseId) throw new Error('No hay almacenes disponibles para completar el producto');
  await fillField(form, 'Producto', name);
  await fillField(form, 'Número proveedor', sku);
  await fillField(form, 'Descripción', 'Producto completo de validación funcional');
  await fillField(form, 'Categoría', 'Pruebas funcionales');
  await fillField(form, 'Ubicación en almacén', 'Z-999');
  const costsSection = form.locator('details').filter({ hasText: 'Costes y márgenes' }).first();
  await costsSection.locator('summary').click();
  await fillField(form, 'Coste', '4.25');
  await fillField(form, 'Coste último directo', '4.25');
  await fillField(form, 'Incremento %', '20');
  await fillField(form, 'Precio venta', '5.10');
  await fillField(form, 'Margen objetivo %', '30');
  await fillField(form, 'Margen mínimo %', '10');
  await fillField(form, 'Coste transporte', '0.75');
  await fillField(form, 'Coste manipulación', '0.25');
  await fillField(form, 'Coste real', '5.25');
  const warehouse = form.locator('label').filter({ hasText: 'Código de almacén' }).locator('select').first();
  await page.waitForFunction(() => Boolean(document.querySelector('select[aria-label="Código de almacén"] option[value]:not([value=""])')), { timeout: 30000 });
  await warehouse.selectOption(String(warehouseId));
  const supplier = form.getByLabel('Buscar proveedor');
  await supplier.fill(supplierName);
  await form.locator('.supplier-suggestions button').filter({ hasText: supplierName }).first().click();
  await page.screenshot({ path: path.join(screenshotDir, 'production-product-form-complete.png'), fullPage: false });
  await form.getByRole('button', { name: 'Crear producto', exact: true }).click();
  const confirmation = page.locator('[aria-label="Confirmar producto"]');
  await confirmation.waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: path.join(screenshotDir, 'production-product-form-confirmation.png'), fullPage: false });
  await confirmation.getByRole('button', { name: 'Confirmar y guardar producto', exact: true }).click();
  await page.waitForTimeout(7000);
  const visibleErrors = await page.locator('[role="alert"], .error-message').allTextContents();
  if (visibleErrors.length) console.log(`UI ERRORS: ${visibleErrors.join(' | ')}`);
  const rows = await page.request.get(`${baseUrl}/api/products`).then((response) => response.json());
  const saved = (Array.isArray(rows) ? rows : []).find((row) => row.sku === sku);
  if (!saved) throw new Error('El producto completo no apareció tras guardar');
  createdId = Number(saved.id);
  const detail = await page.request.get(`${baseUrl}/api/products/${createdId}`).then((response) => response.json());
  if (detail.name !== name || detail.warehouse_location !== 'Z-999' || Number(detail.freight_cost) !== 0.75 || Number(detail.handling_cost) !== 0.25 || Number(detail.real_cost) !== 5.25 || Number(detail.target_margin_percent) !== 30 || Number(detail.min_margin_percent) !== 10) throw new Error('El producto completo no persistió costes avanzados, márgenes o ubicación');
  await page.screenshot({ path: path.join(screenshotDir, 'production-product-form-saved.png'), fullPage: false });
  console.log(`PASS production product full form: ${createdId} · ${sku}`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, 'production-product-form-failed.png'), fullPage: false }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  const headers = { 'content-type': 'application/json', 'x-actor': 'Playwright' };
  if (!createdId) {
    const rows = await fetch(`${baseUrl}/api/products`).then((response) => response.json()).catch(() => []);
    createdId = Number((Array.isArray(rows) ? rows : []).find((row) => row.sku === sku)?.id || 0);
  }
  if (createdId) await fetch(`${baseUrl}/api/products/${createdId}`, { method: 'DELETE', headers }).catch(() => {});
  await browser.close();
}
