const base = process.env.CRM_BASE || "https://exclusivas-inteligentes.vercel.app";
async function get(path) {
  const response = await fetch(`${base}/api/${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
async function post(path, body) {
  const response = await fetch(`${base}/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Actor": "Codex" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}
const [invoices, lines, products] = await Promise.all([get("invoices"), get("invoice_lines"), get("products")]);
const catalog = Array.isArray(products) ? products.filter((item) => Number(item.unit_price || 0) > 0).slice(0, 8) : [];
console.log(`invoices=${invoices.length} lines=${lines.length} demo=${invoices.filter((item) => String(item.code || "").startsWith("DEMO-")).length} catalog=${catalog.length}`);
console.log(invoices.filter((item) => String(item.code || "").startsWith("DEMO-")).slice(0, 3).map((item) => `${item.code}:${item.id}:${lines.filter((line) => Number(line.invoice_id) === Number(item.id)).length}`).join(" | "));
let created = 0;
for (const invoice of (Array.isArray(invoices) ? invoices : []).filter((item) => String(item.code || "").startsWith("DEMO-"))) {
  const existingCount = lines.filter((line) => Number(line.invoice_id) === Number(invoice.id)).length;
  if (existingCount >= 5 || catalog.length < 5) continue;
  const target = Number(invoice.amount || 0);
  const quantity = 1;
  const each = target / 5;
  for (let index = existingCount; index < 5; index += 1) {
    const product = catalog[index % catalog.length];
    await post("invoice_lines", { invoice_id: invoice.id, product_id: product.id, quantity, unit_price: Number(each.toFixed(2)), amount: Number(each.toFixed(2)), vat: Number(invoice.vat || 21), discount: 0 });
    created += 1;
  }
}
console.log(`created_invoice_lines=${created}`);
