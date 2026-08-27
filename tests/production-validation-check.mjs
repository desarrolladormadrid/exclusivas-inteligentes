const baseUrl = process.env.BASE_URL || "https://exclusivas-inteligentes.vercel.app";
const headers = { "content-type": "application/json", "x-actor": "Playwright" };

const empty = await fetch(`${baseUrl}/api/products`, {
  method: "POST",
  headers,
  body: JSON.stringify({ name: "", sku: `PW-EMPTY-${Date.now()}` }),
});
if (empty.status !== 400) throw new Error(`Producto sin nombre aceptado: ${empty.status}`);

const suffix = Date.now();
const created = await fetch(`${baseUrl}/api/products`, {
  method: "POST",
  headers,
  body: JSON.stringify({ name: `PW-VALIDATION-${suffix}`, sku: `PW-VALIDATION-${suffix}`, stock: 1.25, cost_price: 2.5, markup_percent: 10 }),
});
if (!created.ok) throw new Error(`Producto válido rechazado: ${created.status}`);
const product = await created.json();
try {
  const duplicate = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: `PW-VALIDATION-DUP-${suffix}`, sku: product.sku, stock: 1 }),
  });
  if (duplicate.status === 201) throw new Error("El SKU duplicado se aceptó; revisar si el catálogo debe imponer unicidad");
  console.log(`PASS production validation: empty name rejected · valid decimal product ${product.id} · duplicate response ${duplicate.status}`);
} finally {
  await fetch(`${baseUrl}/api/products/${product.id}`, { method: "DELETE", headers });
}
