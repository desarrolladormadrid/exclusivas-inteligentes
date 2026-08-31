import { chromium } from "playwright";

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => localStorage.setItem("excluvas.session", JSON.stringify({ id: 0, username: "Luis", role: "admin", permissions: "*" })));
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  await page.getByText("Panel principal", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
  await page.getByRole("button", { name: "Pedidos", exact: true }).last().click();
  await page.getByRole("heading", { name: "Pedidos", exact: true }).waitFor({ state: "visible", timeout: 30000 });

  const shippingHeader = page.locator("th").filter({ hasText: "Envío" });
  if (await shippingHeader.count() !== 1) throw new Error("No aparece la columna Envío en el listado de pedidos");
  const shippingFilter = page.getByRole("combobox", { name: "Filtrar pedidos por envío" });
  if (await shippingFilter.count() !== 1) throw new Error("No aparece el filtro de pedidos por envío");
  await shippingFilter.selectOption("pendientes");
  await shippingFilter.selectOption("enviados");
  await shippingFilter.selectOption("todos");
  console.log("PASS orders shipping column: columna, estados derivados y filtro operativo");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
