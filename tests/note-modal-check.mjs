import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const screenshotPath = path.join(process.cwd(), 'tests', 'screenshots', 'note-modal-home.png');
await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const title = `__TEST_NOTA_MODAL_${Date.now()}`;
let noteId = 0;
try {
  const created = await page.request.post(`${baseUrl}/api/notes`, {
    headers: { 'content-type': 'application/json', 'x-actor': 'QA' },
    data: { title, content: 'Nota de prueba para abrir el detalle completo.', priority: 'Urgente', module: 'General', important: 1, completed: 0 },
  });
  if (!created.ok()) throw new Error(`No se pudo crear la nota de prueba: ${created.status()}`);
  const createdBody = await created.json();
  noteId = Number(createdBody.data?.id || createdBody.id || 0);

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
  await page.getByText(title, { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByText(title, { exact: true }).click();
  await page.waitForTimeout(1000);
  if (!(await page.locator('.preview-overlay').count())) {
    await page.screenshot({ path: path.join(path.dirname(screenshotPath), 'note-modal-home-failed.png'), fullPage: true });
    console.log('DEBUG url:', page.url());
    console.log('DEBUG title count:', await page.getByText(title, { exact: true }).count());
    console.log('DEBUG pending event:', await page.evaluate(() => sessionStorage.getItem('excluvas.pending-note-preview')));
  }
  await page.locator('.preview-overlay').waitFor({ state: 'visible', timeout: 5000 });
  const modalText = await page.locator('.preview-overlay').innerText();
  if (!modalText.includes(title) || !modalText.includes('Nota de prueba para abrir el detalle completo.')) { console.log('DEBUG modal:', modalText); throw new Error('La modal no muestra los datos completos de la nota'); }
  if (!modalText.includes('Editar nota')) throw new Error('La modal no muestra sus acciones');
  if (new URL(page.url()).searchParams.get('section')) throw new Error('El clic cambió de sección');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('PASS note modal opens from Inicio without changing section');
} finally {
  if (noteId) await page.request.delete(`${baseUrl}/api/notes/${noteId}`, { headers: { 'x-actor': 'QA' } }).catch(() => undefined);
  await browser.close();
}
