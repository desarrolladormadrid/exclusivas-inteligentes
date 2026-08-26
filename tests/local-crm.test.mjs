import test from "node:test";
import assert from "node:assert/strict";
const api = "http://127.0.0.1:3001/api";
async function call(path, options) {
  const r = await fetch(api + path, options);
  return { status: r.status, data: await r.json() };
}
test("login de usuarios locales", async () => {
  const r = await call("/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "Luis", password: "Temporal2026" }),
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.role, "admin");
});
test("todos los registros nuevos guardan fechas de auditoría", async () => {
  const created = await call("/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_AUDITORIA__" }) });
  assert.equal(created.status, 201);
  assert.ok(created.data.created_at);
  assert.ok(created.data.updated_at);
  const before = created.data.updated_at;
  await new Promise((resolve) => setTimeout(resolve, 5));
  const updated = await call(`/clients/${created.data.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...created.data, phone: "600000000" }) });
  assert.equal(updated.status, 200);
  assert.ok(updated.data.updated_at >= before);
  assert.equal(updated.data.phone, "600000000");
  await call(`/clients/${created.data.id}`, { method: "DELETE" });
});
for (const resource of [
  "suppliers",
  "warehouses",
  "delivery_notes",
  "payments",
  "clients",
  "products",
  "orders",
  "quotes",
  "invoices",
  "shipments",
  "inventory_movements",
  "purchase_orders",
  "purchase_order_lines",
  "notes",
  "returns",
])
  test(`endpoint ${resource}`, async () => {
    const r = await call("/" + resource);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.data));
  });
test("un pedido reserva y descuenta stock al enviarse", async () => {
  const product = (
    await call("/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "__test_stock__", unit_price: 1, stock: 4 }),
    })
  ).data;
  const order = (
    await call("/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: "__TEST_STOCK_" + Date.now(),
        product_id: product.id,
        quantity: 2,
        amount: 2,
        status: "Pendiente",
      }),
    })
  ).data;
  assert.equal(order.quantity, 2);
  let rows = (await call("/products")).data;
  assert.equal(rows.find((x) => x.id === product.id).stock, 4);
  let inventory = (await call("/stock")).data;
  assert.equal(
    inventory.find((x) => x.product_id === product.id).stock_reserved,
    2,
  );
  await call("/orders/" + order.id, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...order, status: "Enviado" }),
  });
  rows = (await call("/products")).data;
  assert.equal(rows.find((x) => x.id === product.id).stock, 2);
  inventory = (await call("/stock")).data;
  assert.equal(
    inventory.find((x) => x.product_id === product.id).stock_reserved,
    0,
  );
  await call("/orders/" + order.id, { method: "DELETE" });
  await call("/products/" + product.id, { method: "DELETE" });
});

test("borrar un pedido pendiente libera la reserva de stock", async () => {
  const product = (await call("/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_BORRADO_RESERVA__", unit_price: 1, stock: 4 }) })).data;
  const order = (await call("/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "__TEST_BORRADO_RESERVA_" + Date.now(), product_id: product.id, quantity: 2, amount: 2, status: "Pendiente" }) })).data;
  let stock = (await call("/stock")).data.find((row) => row.product_id === product.id);
  assert.equal(stock.stock_reserved, 2);
  const deleted = await call(`/orders/${order.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 200);
  stock = (await call("/stock")).data.find((row) => row.product_id === product.id);
  assert.equal(stock.stock_reserved, 0);
  await call(`/products/${product.id}`, { method: "DELETE" });
});

test("un pedido conserva sus líneas al convertirlo en albarán y factura", async () => {
  const client = (await call("/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_CLIENTE_DOCUMENTO__" }) })).data;
  const product = (await call("/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_PRODUCTO_DOCUMENTO__", unit_price: 3, stock: 20 }) })).data;
  const order = (await call("/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "__TEST_DOCUMENTO_" + Date.now(), client_id: client.id, product_id: product.id, quantity: 2, unit_price: 3, amount: 6, status: "Pendiente" }) })).data;
  const line = await call("/order_lines", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order_id: order.id, product_id: product.id, quantity: 2, unit_price: 3, amount: 6 }) });
  assert.equal(line.status, 201);
  const converted = await call(`/orders/convert-invoice/${order.id}`, { method: "POST" });
  assert.equal(converted.status, 201);
  const invoiceLines = (await call("/invoice_lines")).data;
  assert.ok(invoiceLines.some((x) => x.invoice_id === converted.data.id && x.product_id === product.id && x.quantity === 2));
  await call(`/invoices/${converted.data.id}`, { method: "DELETE" });
  await call(`/orders/${order.id}`, { method: "DELETE" });
  await call(`/products/${product.id}`, { method: "DELETE" });
  await call(`/clients/${client.id}`, { method: "DELETE" });
});

test("una entrada de almacén actualiza el stock real", async () => {
  const product = (await call("/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_ENTRADA__", stock: 1 }) })).data;
  const before = (await call("/products")).data.find((x) => x.id === product.id).stock;
  const movement = await call("/inventory_movements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: product.id, movement_type: "Entrada", quantity: 7, notes: "Recepción proveedor", reference: "__TEST__" }) });
  assert.equal(movement.status, 201);
  const after = (await call("/products")).data.find((x) => x.id === product.id).stock;
  assert.equal(after, before + 7);
  await call(`/inventory_movements/${movement.data.id}`, { method: "DELETE" });
  await call(`/products/${product.id}`, { method: "DELETE" });
});

test("recibir una compra crea entradas y aumenta el stock", async () => {
  const supplier = (await call("/suppliers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_PROVEEDOR_RECEPCION__" }) })).data;
  const product = (await call("/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_COMPRA__", stock: 2 }) })).data;
  const purchase = (await call("/purchase_orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "__TEST_COMPRA_" + Date.now(), supplier_id: supplier.id, status: "Pedido" }) })).data;
  assert.equal(purchase.stock_alerts, undefined);
  const line = await call("/purchase_order_lines", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purchase_order_id: purchase.id, product_id: product.id, quantity: 5, unit_cost: 2, amount: 10 }) });
  assert.equal(line.status, 201);
  const before = (await call("/products")).data.find((x) => x.id === product.id).stock;
  const received = await call(`/purchase_orders/${purchase.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...purchase, status: "Recibida" }) });
  assert.equal(received.status, 200);
  const after = (await call("/products")).data.find((x) => x.id === product.id).stock;
  assert.equal(after, before + 5);
  await call(`/purchase_orders/${purchase.id}`, { method: "DELETE" });
  await call(`/purchase_order_lines/${line.data.id}`, { method: "DELETE" });
  await call(`/products/${product.id}`, { method: "DELETE" });
  await call(`/suppliers/${supplier.id}`, { method: "DELETE" });
});

test("las notas rápidas se guardan y se pueden destacar", async () => {
  const created = await call("/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Preparar pedido urgente", content: "Comprobar cajas antes de cargar", priority: "Alta", module: "Envíos", important: 1 }) });
  assert.equal(created.status, 201);
  assert.equal(created.data.important, 1);
  const rows = (await call("/notes")).data;
  assert.ok(rows.some((x) => x.id === created.data.id && x.module === "Envíos"));
  const updated = await call(`/notes/${created.data.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...created.data, completed: 1 }) });
  assert.equal(updated.status, 200);
  await call(`/notes/${created.data.id}`, { method: "DELETE" });
});

test("una devolución aumenta stock y registra el movimiento", async () => {
  const product = (await call("/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "__TEST_DEVOLUCION__", stock: 3 }) })).data;
  const before = (await call("/products")).data.find((x) => x.id === product.id).stock;
  const ret = await call("/returns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "__TEST_DEV_" + Date.now(), product_id: product.id, quantity: 2, reason: "Producto rechazado" }) });
  assert.equal(ret.status, 201);
  const after = (await call("/products")).data.find((x) => x.id === product.id).stock;
  assert.equal(after, before + 2);
  await call(`/returns/${ret.data.id}`, { method: "DELETE" });
  await call(`/products/${product.id}`, { method: "DELETE" });
});

test("los cobros parciales actualizan el estado de la factura", async () => {
  const invoice = (await call("/invoices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "__TEST_COBRO_" + Date.now(), amount: 100, status: "Pendiente" }) })).data;
  const partial = await call("/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ invoice_id: invoice.id, amount: 40, method: "Transferencia" }) });
  assert.equal(partial.status, 201);
  let current = (await call("/invoices")).data.find((x) => x.id === invoice.id);
  assert.equal(current.status, "Parcial");
  const final = await call("/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ invoice_id: invoice.id, amount: 60, method: "Transferencia" }) });
  assert.equal(final.status, 201);
  current = (await call("/invoices")).data.find((x) => x.id === invoice.id);
  assert.equal(current.status, "Cobrada");
  await call(`/payments/${partial.data.id}`, { method: "DELETE" });
  await call(`/payments/${final.data.id}`, { method: "DELETE" });
  await call(`/invoices/${invoice.id}`, { method: "DELETE" });
});

test("la base de datos permite descargar una copia", async () => {
  const r = await fetch("http://127.0.0.1:3001/api/backup");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-disposition") || "", /excluvas-.*\.sqlite/);
  const bytes = await r.arrayBuffer();
  assert.ok(bytes.byteLength > 1000);
});
