import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });
const attachmentPath = path.join(screenshotDir, 'production-expense-created.png');
const vendor = `PW-ATTACH-VENDOR-${Date.now()}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let createdId = 0;
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(3500);
  }
  await page.getByRole('button', { name: 'Gastos y tickets', exact: true }).first().click();
  await page.waitForFunction(() => !document.body.innerText.includes('Cargando datos desde la base de datos') && !document.body.innerText.includes('Cargando registros'), { timeout: 30000 }).catch(() => {});
  await page.getByRole('button', { name: 'Crear gasto', exact: true }).click();
  const form = page.locator('form').last();
  const clientSelect = form.locator('label').filter({ hasText: 'Cliente' }).locator('select').first();
  await clientSelect.selectOption('78');
  await form.locator('label').filter({ hasText: 'Proveedor' }).locator('input').first().fill(vendor);
  await form.locator('label').filter({ hasText: 'Importe' }).locator('input').first().fill('12.50');
  await form.locator('input[type="file"]').setInputFiles(attachmentPath);
  await page.getByRole('button', { name: 'Crear gasto', exact: true }).last().click();
  await page.waitForTimeout(2500);
  const expenses = await page.request.get(`${baseUrl}/api/expenses`).then((response) => response.json());
  const saved = (Array.isArray(expenses) ? expenses : []).find((row) => row.vendor === vendor);
  if (!saved) throw new Error('El gasto con justificante no apareció tras guardarlo');
  createdId = Number(saved.id);
  const detail = await page.request.get(`${baseUrl}/api/expenses/${createdId}`).then((response) => response.json());
  if (detail.attachment_name !== path.basename(attachmentPath)) throw new Error(`El justificante no persistió su nombre: ${detail.attachment_name}`);
  if (!detail.attachment_mime || !detail.attachment_data) throw new Error('El justificante no persistió MIME y contenido binario');
  await page.screenshot({ path: path.join(screenshotDir, 'production-expense-attachment-saved.png'), fullPage: true });
  console.log(`PASS production expense attachment: ${detail.id} · ${detail.attachment_name} · ${detail.attachment_mime}`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, 'production-expense-attachment-failed.png'), fullPage: false }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  const headers = { 'content-type': 'application/json', 'x-actor': 'Playwright' };
  if (!createdId) {
    const expenses = await fetch(`${baseUrl}/api/expenses`).then((response) => response.json()).catch(() => []);
    createdId = Number((Array.isArray(expenses) ? expenses : []).find((row) => row.vendor === vendor)?.id || 0);
  }
  if (createdId) await fetch(`${baseUrl}/api/expenses/${createdId}`, { method: 'DELETE', headers }).catch(() => {});
  await browser.close();
}
