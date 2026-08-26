import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'https://exclusivas-inteligentes.vercel.app';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
const missing = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', (response) => { if (response.status() === 404) missing.push(response.url()); });
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill('Temporal2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
  await page.locator('.note-card').first().waitFor({ state: 'visible', timeout: 20000 });
  const noteTitle = await page.locator('.note-card b').first().innerText();
  await page.locator('.note-card').first().click();
  await page.locator('.preview-overlay').waitFor({ state: 'visible', timeout: 10000 });
  const modalText = await page.locator('.preview-overlay').innerText();
  if (!modalText.includes(noteTitle) || modalText.includes('\nNota\n')) throw new Error('La modal de nota no muestra el detalle correcto');
  if (!modalText.includes('Editar nota') || !modalText.includes('Cerrar')) throw new Error('La modal no muestra sus acciones');
  if (new URL(page.url()).searchParams.get('section')) throw new Error('El clic de la nota cambió de sección');
  const functionalErrors = errors.filter((error) => !error.includes('favicon') && !(missing.length === 1 && error.includes('Failed to load resource')));
  if (functionalErrors.length) throw new Error(`Errores de consola: ${functionalErrors.join(' | ')}`);
  if (missing.length) console.log(`INFO recursos 404 no funcionales: ${missing.join(' | ')}`);
  await page.screenshot({ path: 'tests/screenshots/production-note-modal-mobile.png', fullPage: true });
  console.log('PASS production note modal opens in mobile without navigation');
} finally { await browser.close(); }
