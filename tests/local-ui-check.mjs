import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const screenshotDir = path.dirname(fileURLToPath(import.meta.url)) + path.sep + 'screenshots';
await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const failedRequests = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || 'failed'}`));

async function check(name, routePath, viewport) {
  await page.setViewportSize(viewport);
  const response = await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
  const title = await page.title();
  const body = await page.locator('body').innerText();
  if (!response || response.status() >= 400) throw new Error(`${routePath} returned ${response?.status()}`);
  if (!body.includes('Exclusivas')) throw new Error(`${routePath} did not render the CRM shell`);
  console.log(`PASS ${name}: ${response.status()} ${title || '(no title)'}`);
}

await check('v2-home-desktop', '/', { width: 1440, height: 900 });
await check('v2-home-tablet', '/', { width: 1024, height: 768 });
await check('v2-home-mobile', '/', { width: 390, height: 844 });
await check('v2-orders-desktop', '/?section=Pedidos', { width: 1440, height: 900 });

for (const endpoint of ['/api/products', '/api/stock', '/api/orders']) {
  const response = await page.request.get(`${baseUrl}${endpoint}`);
  if (!response.ok()) throw new Error(`${endpoint} returned ${response.status()}`);
  console.log(`PASS ${endpoint}: ${response.status()}`);
}

if (consoleErrors.length || failedRequests.length) {
  console.error('Console errors:', consoleErrors);
  console.error('Failed requests:', failedRequests);
  process.exitCode = 1;
} else {
  console.log('PASS browser console/request health: clean');
}
await browser.close();
