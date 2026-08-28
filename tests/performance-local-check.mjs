import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const screenshotDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });

async function measure(endpoint) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${endpoint}`);
  const body = await response.text();
  return { endpoint, status: response.status, ms: Math.round(performance.now() - started), bytes: Buffer.byteLength(body), body };
}

const fullProducts = await measure('/api/products?limit=5000');
const compactProducts = await measure('/api/products?view=lookup&limit=5000');
const summary = await measure('/api/summary?from=2026-08-28&to=2026-08-28');
if (fullProducts.status !== 200 || compactProducts.status !== 200 || summary.status !== 200) {
  throw new Error(`API local no disponible: ${fullProducts.status}/${compactProducts.status}/${summary.status}`);
}
const summaryPayload = JSON.parse(summary.body);
for (const key of ['summary', 'orders', 'shipments', 'clients', 'importantNotes']) {
  if (!(key in summaryPayload)) throw new Error(`Falta ${key} en /api/summary`);
}
if (compactProducts.bytes >= fullProducts.bytes) {
  throw new Error(`La vista compacta no reduce el tamaño: ${compactProducts.bytes} frente a ${fullProducts.bytes}`);
}
console.log(`PASS compact products: ${compactProducts.bytes} bytes frente a ${fullProducts.bytes} bytes (${Math.round((1 - compactProducts.bytes / fullProducts.bytes) * 100)}% menos)`);
console.log(`PASS summary: ${summary.bytes} bytes en ${summary.ms} ms`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const apiRequests = [];
page.on('request', (request) => {
  if (request.url().includes('/api/')) apiRequests.push(request.url());
});
await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
const password = page.locator('input[type="password"]').first();
if (await password.count()) {
  await password.fill('Temporal2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(screenshotDir, baseUrl.includes('localhost') ? 'performance-local-home.png' : 'performance-production-home.png'), fullPage: true });
const summaryRequests = apiRequests.filter((url) => url.includes('/api/summary?')).length;
const fullProductRequests = apiRequests.filter((url) => /\/api\/products(?:\?|$)/.test(url) && !url.includes('view=lookup')).length;
if (summaryRequests < 1) throw new Error(`Inicio no ha usado el resumen: ${apiRequests.join('\n')}`);
if (fullProductRequests > 0) throw new Error(`Inicio sigue descargando Productos completo: ${apiRequests.join('\n')}`);
console.log(`PASS Home requests: ${summaryRequests} resumen, ${fullProductRequests} productos completos`);
await browser.close();
