import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const screenshotDir = path.join(process.cwd(), "tests", "screenshots");
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('input[type="password"]') || document.querySelector(".workspace"), { timeout: 30000 });
  const password = page.locator('input[type="password"]:visible').first();
  if (await password.count()) {
    await password.fill("Temporal2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  await page.getByText("Panel principal", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
  await page.getByRole("button", { name: "Presupuestos", exact: true }).last().click();
  await page.getByRole("heading", { name: "Presupuestos", exact: true }).waitFor({ state: "visible", timeout: 30000 });
  const row = page.locator(".table-scroll table tbody tr").first();
  await row.waitFor({ state: "visible", timeout: 30000 });
  const metrics = await row.locator("td").first().evaluate((element) => {
    const style = getComputedStyle(element);
    const rowRect = element.parentElement.getBoundingClientRect();
    return { fontSize: Number.parseFloat(style.fontSize), paddingTop: Number.parseFloat(style.paddingTop), paddingBottom: Number.parseFloat(style.paddingBottom), rowHeight: Math.round(rowRect.height) };
  });
  if (metrics.fontSize < 12 || metrics.paddingTop > 8 || metrics.paddingBottom > 8 || metrics.rowHeight > 48) throw new Error(`La densidad del listado no cumple: ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: path.join(screenshotDir, "list-density-desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(screenshotDir, "list-density-tablet.png"), fullPage: false });
  console.log(`PASS list density: ${metrics.fontSize}px · ${metrics.paddingTop}px/${metrics.paddingBottom}px · fila ${metrics.rowHeight}px`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, "list-density-failed.png"), fullPage: false }).catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
