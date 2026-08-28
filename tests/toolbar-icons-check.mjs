import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const screenshotDir = path.join(process.cwd(), "tests", "screenshots");
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  const password = page.locator('input[type="password"]').first();
  if (await password.count()) {
    await password.fill("Temporal2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  await page.getByText("Panel principal", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
  const quickActions = page.locator(".header-quick-actions .quick-icon-action");
  if (await quickActions.count() < 4) throw new Error(`Se esperaban al menos 4 accesos rápidos con icono y hay ${await quickActions.count()}`);
  for (const label of ["Preparación de pedidos", "Stock", "Nuevo pedido", "Subir gasto"]) {
    const action = page.locator(`.header-quick-actions .quick-icon-action[aria-label="${label}"]`);
    if (await action.count() !== 1) throw new Error(`Falta el acceso rápido accesible: ${label}`);
    if (await action.getAttribute("title") !== label) throw new Error(`Falta el tooltip del acceso rápido: ${label}`);
    if (!(await action.locator(".toolbar-action-icon").count())) throw new Error(`Falta el icono del acceso rápido: ${label}`);
  }
  await page.screenshot({ path: path.join(screenshotDir, "toolbar-icons-home-desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(screenshotDir, "toolbar-icons-home-tablet.png"), fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Envíos", exact: true }).last().click();
  await page.getByRole("heading", { name: "Envíos y entregas", exact: true }).waitFor({ state: "visible", timeout: 30000 });

  const actions = page.locator(".manager-head .icon-action");
  if (await actions.count() !== 3) throw new Error(`Se esperaban 3 acciones con icono y hay ${await actions.count()}`);
  for (const label of ["Descargar Excel/CSV", "Importar CSV", "Descargar plantilla"]) {
    const action = page.locator(`.manager-head .icon-action[aria-label="${label}"]`);
    if (await action.count() !== 1) throw new Error(`Falta la acción accesible: ${label}`);
    if (await action.getAttribute("title") !== label) throw new Error(`Falta el tooltip: ${label}`);
    if (!(await action.locator(".toolbar-action-icon").count())) throw new Error(`Falta el icono: ${label}`);
  }
  await page.screenshot({ path: path.join(screenshotDir, "toolbar-icons-desktop.png"), fullPage: false });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(screenshotDir, "toolbar-icons-tablet.png"), fullPage: false });
  if (errors.length) throw new Error(`Errores de consola: ${errors.join(" | ")}`);
  console.log(`PASS toolbar icons: ${await quickActions.count()} accesos rápidos + 3 acciones de gestión · escritorio · tablet · consola limpia`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, "toolbar-icons-failed.png"), fullPage: false }).catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
