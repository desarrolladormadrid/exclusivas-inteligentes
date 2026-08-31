import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const screenshotDir = path.join(process.cwd(), "tests", "screenshots");
const screenshotPrefix = baseUrl.includes("localhost") ? "local" : "production";
await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

function localDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function waitForData() {
  await page.waitForFunction(
    () => !document.body.innerText.includes("Actualizando datos") && !document.body.innerText.includes("Cargando datos desde la base de datos"),
    { timeout: 30000 },
  ).catch(() => undefined);
  await page.waitForTimeout(400);
}

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('input[type="password"]') || document.querySelector(".workspace"), { timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill("Temporal2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByText("Panel principal", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
  }
  await waitForData();

  await page.getByRole("button", { name: "Contactos", exact: true }).last().click();
  await page.locator(".contacts-page h2").filter({ hasText: "Contactos" }).waitFor({ state: "visible", timeout: 15000 });
  await waitForData();
  await page.locator(".contacts-table .data-loading").waitFor({ state: "detached", timeout: 30000 }).catch(() => undefined);
  await page.locator(".contacts-table tbody tr").first().waitFor({ state: "visible", timeout: 30000 });
  const contactRow = page.locator(".contacts-table tbody tr").first();
  if (!(await contactRow.count())) throw new Error("No hay contactos para comprobar la edición modal");
  await contactRow.click();
  const contactModal = page.locator('.contact-edit-overlay[role="dialog"]');
  await contactModal.waitFor({ state: "visible", timeout: 10000 });
  for (const label of ["Empresa / nombre", "Código externo", "NIF / CIF", "Persona de contacto", "Estado"]) {
    if (!(await contactModal.getByText(new RegExp(`^${label}`)).count())) throw new Error(`La modal de contactos no muestra ${label}`);
  }
  await page.screenshot({ path: path.join(screenshotDir, `contact-modal-${screenshotPrefix}.png`), fullPage: false });
  await contactModal.getByRole("button", { name: "Cancelar", exact: true }).click();
  console.log("PASS Contactos: fila abre modal completa y editable");

  await page.getByRole("button", { name: "Clientes", exact: true }).last().click();
  await page.locator(".manager-head h2").filter({ hasText: "Clientes" }).waitFor({ state: "visible", timeout: 15000 });
  await waitForData();
  await page.locator(".table-panel .data-loading").waitFor({ state: "detached", timeout: 30000 }).catch(() => undefined);
  await page.locator(".table-panel table tbody tr").first().waitFor({ state: "visible", timeout: 30000 });
  const clientRow = page.locator(".table-panel table tbody tr").first();
  if (!(await clientRow.count())) throw new Error("No hay clientes para comprobar la ficha modal");
  await clientRow.click();
  const clientModal = page.locator(".form-accordion[open]").first();
  await clientModal.waitFor({ state: "visible", timeout: 10000 });
  if (!(await clientModal.getByText(/Editar cliente/i).count())) throw new Error("La ficha de cliente no se abre como modal");
  await clientModal.getByRole("button", { name: "Cancelar", exact: true }).click();
  console.log("PASS Clientes: fila abre ficha modal completa");

  await page.getByRole("button", { name: "Preparación de pedidos", exact: true }).last().click();
  await page.locator(".prep-command-board").waitFor({ state: "visible", timeout: 15000 });
  await waitForData();
  const tomorrowButton = page.locator(".prep-command-filters").getByRole("button", { name: "Mañana", exact: true });
  if (!(await tomorrowButton.count())) throw new Error("No aparece el botón Mañana en preparación");
  await tomorrowButton.click();
  const tomorrow = localDateOffset(1);
  const dateInput = page.locator(".prep-command-filters input[type=date]").first();
  if (await dateInput.inputValue() !== tomorrow) throw new Error(`El filtro Mañana no selecciona ${tomorrow}`);
  if (await tomorrowButton.getAttribute("aria-pressed") !== "true" || await tomorrowButton.getAttribute("class")?.then((value) => !value.includes("primary"))) throw new Error("Mañana no queda marcado como selección activa");
  if (await page.locator(".prep-command-filters").getByRole("button", { name: "Hoy", exact: true }).getAttribute("aria-pressed") !== "false") throw new Error("Hoy sigue marcado al seleccionar Mañana");
  await page.screenshot({ path: path.join(screenshotDir, `preparation-tomorrow-${screenshotPrefix}.png`), fullPage: false });
  console.log(`PASS Preparación: botón Mañana selecciona ${tomorrow}`);

  const allCommandButton = page.locator(".prep-command-filters").getByRole("button", { name: "Todos", exact: true });
  await allCommandButton.click();
  if (await allCommandButton.getAttribute("aria-pressed") !== "true" || await allCommandButton.getAttribute("class")?.then((value) => !value.includes("primary"))) throw new Error("Todos no queda marcado como selección activa");
  const tableFilters = page.locator(".prep-date-filter");
  await page.waitForSelector(".prep-date-filter button", { state: "attached", timeout: 10000 }).catch(() => undefined);
  const tableButtons = tableFilters.locator("button");
  if (await tableButtons.count() >= 3 && await tableFilters.isVisible()) {
    await tableFilters.scrollIntoViewIfNeeded();
    const tableToday = tableButtons.nth(0);
    const tableTomorrow = tableButtons.nth(1);
    const tableAll = tableButtons.nth(2);
    if (await tableAll.getAttribute("aria-pressed") !== "true") throw new Error("Todos no aparece activo en el filtro de tabla");
    await tableToday.click();
    if (await tableToday.getAttribute("aria-pressed") !== "true" || await tableAll.getAttribute("aria-pressed") !== "false") throw new Error("El filtro de tabla no mueve la selección a Hoy");
    await tableTomorrow.click();
    if (await tableTomorrow.getAttribute("aria-pressed") !== "true" || await tableToday.getAttribute("aria-pressed") !== "false") throw new Error("El filtro de tabla no mueve la selección a Mañana");
    await tableAll.click();
    if (await tableAll.getAttribute("aria-pressed") !== "true") throw new Error("Todos no aparece activo en el filtro de tabla");
  }
  await page.locator(".prep-order-card").first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator(".prep-order-card").first().click();
  const loadNote = page.locator(".document-preview");
  await loadNote.waitFor({ state: "visible", timeout: 15000 });
  if (!(await loadNote.getByText("Preparado por:", { exact: false }).count())) throw new Error("La nota de carga no muestra el responsable de preparación");
  if (!(await loadNote.getByRole("textbox", { name: "Anotación de preparación", exact: true }).count())) throw new Error("La nota de carga no muestra el campo de anotaciones");
  if (!(await loadNote.getByRole("textbox", { name: "Dirección de entrega", exact: true }).count())) throw new Error("La nota de carga no permite editar la dirección de entrega");
  if (!(await loadNote.getByRole("textbox", { name: "Ciudad de entrega", exact: true }).count())) throw new Error("La nota de carga no permite editar la ciudad de entrega");
  if (!(await loadNote.getByRole("checkbox", { name: "Actualizar también la ficha del cliente", exact: true }).count())) throw new Error("La nota de carga no ofrece confirmación para actualizar la ficha del cliente");
  if (!(await loadNote.getByRole("button", { name: "Guardar anotación", exact: true }).count()) || !(await loadNote.getByRole("button", { name: "Generar incidencia", exact: true }).count())) throw new Error("La nota de carga no muestra las acciones de anotación e incidencia");
  await loadNote.locator(".preview-loading-state").waitFor({ state: "detached", timeout: 30000 }).catch(() => undefined);
  await page.screenshot({ path: path.join(screenshotDir, `preparation-responsible-${screenshotPrefix}.png`), fullPage: false });
  const measureLoadNote = async () => loadNote.evaluate((element) => {
    const table = element.querySelector(".preview-lines");
    const rect = element.getBoundingClientRect();
    return {
      modalOverflow: element.scrollWidth > element.clientWidth + 1,
      modalInsideViewport: rect.left >= -1 && rect.right <= innerWidth + 1,
      tableOverflow: table ? table.scrollWidth > table.clientWidth + 1 : false,
      tableDisplay: table ? getComputedStyle(table).display : "",
    };
  });
  await page.setViewportSize({ width: 762, height: 665 });
  await page.waitForTimeout(250);
  const loadNoteTabletMetrics = await measureLoadNote();
  if (loadNoteTabletMetrics.modalOverflow || loadNoteTabletMetrics.tableOverflow || !loadNoteTabletMetrics.modalInsideViewport || loadNoteTabletMetrics.tableDisplay !== "block") throw new Error("La nota de carga mantiene scroll horizontal o se sale del viewport en tablet");
  await page.screenshot({ path: path.join(screenshotDir, `preparation-load-note-tablet-${screenshotPrefix}.png`), fullPage: false });
  console.log("PASS Nota de carga: modal adaptable sin scroll horizontal en tablet");
  await page.setViewportSize({ width: 441, height: 820 });
  await page.waitForTimeout(250);
  const loadNoteMetrics = await measureLoadNote();
  if (loadNoteMetrics.modalOverflow || loadNoteMetrics.tableOverflow || loadNoteMetrics.tableDisplay !== "block") throw new Error("La nota de carga mantiene scroll horizontal o no adopta el formato responsive");
  await page.screenshot({ path: path.join(screenshotDir, `preparation-load-note-mobile-${screenshotPrefix}.png`), fullPage: false });
  await loadNote.locator(".preview-close").click();
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log("PASS Nota de carga: modal responsive sin scroll horizontal en móvil");

  await page.locator(".prep-order-card").first().click();
  await page.locator(".document-preview").waitFor({ state: "visible", timeout: 15000 });
  await page.locator(".document-preview .preview-loading-state").waitFor({ state: "detached", timeout: 30000 }).catch(() => undefined);
  await page.emulateMedia({ media: "print" });
  const printState = await page.locator(".document-preview-overlay").evaluate((overlay) => ({
    display: getComputedStyle(overlay).display,
    visibility: getComputedStyle(overlay).visibility,
    documentVisibility: getComputedStyle(overlay.querySelector(".document-preview")).visibility,
  }));
  if (printState.display === "none" || printState.visibility === "hidden" || printState.documentVisibility === "hidden") throw new Error("La nota de carga queda oculta al imprimir");
  const printPdfPath = path.join(screenshotDir, `preparation-load-note-print-${screenshotPrefix}.pdf`);
  await page.pdf({ path: printPdfPath, format: "A4", printBackground: true, preferCSSPageSize: true });
  const printPdf = await fs.stat(printPdfPath);
  if (printPdf.size < 1000) throw new Error("El PDF de la nota de carga se ha generado vacío");
  await page.emulateMedia({ media: "screen" });
  await page.locator(".document-preview .preview-close").click();
  console.log("PASS Nota de carga: impresión y PDF muestran la modal");

  if (errors.length) throw new Error(`Errores de consola: ${errors.join(" | ")}`);
  console.log("PASS browser health: clean");
} finally {
  await browser.close();
}
