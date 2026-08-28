import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const routeUrl = process.env.PAGE_URL || `${baseUrl}/ocr`;
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const headers = { 'content-type': 'application/json', 'x-actor': 'Playwright' };
let createdId = 0;

try {
  await page.goto(routeUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(2500);
  }
  await page.getByRole('heading', { name: 'OCR inteligente', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: `PW-OCR-${Date.now()}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from('Factura de prueba\nTotal: 123,45 €\ncorreo: pruebas@example.com', 'utf8'),
  });
  await page.getByText('Datos extraídos', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  if (!(await page.getByText('Factura', { exact: true }).count())) throw new Error('OCR no clasificó el documento como factura');
  await page.screenshot({ path: path.join(screenshotDir, 'production-ocr-review.png'), fullPage: false });
  const saveResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/ocr_documents') && response.request().method() === 'POST', { timeout: 30000 });
  await page.getByRole('button', { name: 'Guardar en el historial', exact: true }).click();
  const saveResponse = await saveResponsePromise;
  const saved = await saveResponse.json();
  if (!saved.id) throw new Error('OCR no devolvió el identificador guardado');
  createdId = Number(saved.id);
  await page.getByText('Documento guardado correctamente en el historial.', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  const savedDetailResponse = await page.request.get(`${baseUrl}/api/ocr_documents/${createdId}`);
  const savedDetail = await savedDetailResponse.json();
  if (!savedDetailResponse.ok() || savedDetail.document_type !== 'Factura' || savedDetail.status !== 'Revisado') throw new Error('El documento guardado no quedó persistido con sus datos OCR');
  await page.getByText(savedDetail.file_name, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: path.join(screenshotDir, 'production-ocr-saved.png'), fullPage: false });
  console.log(`PASS OCR ${saved.id}: clasificación, guardado, detalle e historial actualizado`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, 'production-ocr-failed.png'), fullPage: false }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (createdId) await page.request.fetch(`${baseUrl}/api/ocr_documents/${createdId}`, { method: 'DELETE', headers }).catch(() => {});
  await browser.close();
}
