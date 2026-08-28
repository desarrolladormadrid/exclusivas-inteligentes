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
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('input[type="password"]') || document.querySelector(".workspace"), { timeout: 30000 });
  const password = page.locator('input[type="password"]:visible').first();
  if (await password.count()) {
    await password.fill("Temporal2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  await page.getByText("Panel principal", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
  const products = page.getByRole("button", { name: "Productos", exact: true }).last();
  if (!(await products.isVisible())) await page.locator(".sidebar-group-title").last().click();
  await products.click();
  await page.getByRole("heading", { name: "Productos y stock", exact: true }).waitFor({ state: "visible", timeout: 30000 });
  await page.locator(".table-scroll tbody tr").first().waitFor({ state: "visible", timeout: 30000 });

  const headers = await page.locator(".table-scroll thead th").allTextContents();
  const primaryIndex = headers.findIndex((text) => text.toLowerCase().includes("proveedor principal"));
  if (primaryIndex < 0) throw new Error("No aparece la columna Proveedor principal");
  const rows = page.locator(".table-scroll tbody tr");
  let checked = 0;
  for (let index = 0; index < await rows.count(); index += 1) {
    const value = (await rows.nth(index).locator("td").nth(primaryIndex).innerText()).trim();
    if (!value || value === "—") continue;
    checked += 1;
    if (/^\d+$/.test(value)) throw new Error(`Proveedor principal muestra el ID ${value} en vez del nombre`);
  }
  if (!checked && !baseUrl.includes("localhost")) throw new Error("No hay proveedores principales visibles para comprobar el nombre");
  await page.screenshot({ path: path.join(screenshotDir, `primary-supplier-${baseUrl.includes("localhost") ? "local" : "production"}.png`), fullPage: false });
  if (errors.length) throw new Error(`Errores de consola: ${errors.join(" | ")}`);
  console.log(checked ? `PASS Proveedor principal: ${checked} nombres visibles, sin IDs crudos` : "PASS Proveedor principal: sin relaciones informadas en los datos locales; no se muestran IDs crudos");
} finally {
  await browser.close();
}
