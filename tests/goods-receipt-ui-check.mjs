import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:3310";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => localStorage.setItem("excluvas.session", JSON.stringify({ id: 0, username: "Luis", role: "admin", permissions: "*" })));
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  await page.getByText("Entradas", { exact: true }).first().click();
  await page.getByRole("heading", { name: "Entradas de mercancía", exact: true }).waitFor({ state: "visible", timeout: 30000 });
  await page.getByRole("button", { name: "Crear entrada", exact: true }).click();
  await page.getByText("Recepción de mercancía", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
  if (await page.locator(".goods-receipt-header-grid select").count() < 3) throw new Error("No aparecen los selectores de proveedor, pedido y almacén");
  if (await page.getByRole("textbox", { name: "Buscar producto para la entrada", exact: true }).count() !== 1) throw new Error("No aparece el buscador de productos");
  if (await page.getByRole("button", { name: "Registrar entrada y actualizar stock", exact: true }).count() !== 1) throw new Error("No aparece la acción de registrar entrada");
  await page.screenshot({ path: "C:/Users/luis.vazquez/AppData/Local/Temp/goods-receipt-form-local.png", fullPage: true });
  console.log("PASS goods receipt UI: cabecera, buscador, alta de entrada y acciones de incidencia visibles");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
