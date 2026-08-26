import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "https://exclusivas-inteligentes.vercel.app";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const code = `PW-DELETE-RESERVATION-${Date.now()}`;
let orderId = 0;
try {
  const beforeRows = await (await page.request.get(`${baseUrl}/api/products`)).json();
  const before = beforeRows.find((row) => Number(row.id) === 292);
  if (!before) throw new Error("No se encontró el producto de control");
  const created = await page.request.post(`${baseUrl}/api/orders`, { headers: { "content-type": "application/json", "x-actor": "Playwright" }, data: { code, client_id: 78, status: "Nuevo", amount: 4.88, lines: [{ product_id: 292, quantity: 1, quantity_requested: 1, quantity_unit: "unidad", unit_price: 4.88, discount: 0, vat: 21, amount: 4.88 }] } });
  if (!created.ok()) throw new Error(`No se pudo crear el pedido: ${created.status()}`);
  orderId = Number((await created.json()).id);
  const afterCreate = (await (await page.request.get(`${baseUrl}/api/products`)).json()).find((row) => Number(row.id) === 292);
  if (Number(afterCreate.stock_reserved) !== Number(before.stock_reserved) + 1) throw new Error(`La reserva no aumentó correctamente: ${before.stock_reserved} -> ${afterCreate.stock_reserved}`);
  const deleted = await page.request.delete(`${baseUrl}/api/orders/${orderId}`, { headers: { "x-actor": "Playwright" } });
  if (!deleted.ok()) throw new Error(`No se pudo eliminar el pedido: ${deleted.status()}`);
  const afterDelete = (await (await page.request.get(`${baseUrl}/api/products`)).json()).find((row) => Number(row.id) === 292);
  if (Number(afterDelete.stock_reserved) !== Number(before.stock_reserved)) throw new Error(`La reserva no se liberó: esperaba ${before.stock_reserved}, quedó ${afterDelete.stock_reserved}`);
  console.log(`PASS production delete reservation: ${code} · ID ${orderId}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (orderId) await page.request.delete(`${baseUrl}/api/orders/${orderId}`, { headers: { "x-actor": "Playwright" } }).catch(() => undefined);
  await browser.close();
}
