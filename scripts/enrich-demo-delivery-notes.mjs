const base = process.env.CRM_BASE || "https://exclusivas-inteligentes.vercel.app";
async function get(path) {
  const response = await fetch(`${base}/api/${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
async function post(path, body) {
  const response = await fetch(`${base}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Actor": "Codex" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

const [notes, noteLines, orders, orderLines, products] = await Promise.all([
  get("delivery_notes"), get("delivery_note_lines"), get("orders"), get("order_lines"), get("products"),
]);
const catalog = products.filter((item) => Number(item.id) && Number(item.unit_price || 0) > 0).slice(0, 8);
let createdNotes = 0;
let createdOrders = 0;
for (const note of notes.filter((item) => String(item.code || "").startsWith("ALB-2026-"))) {
  const currentNoteLines = noteLines.filter((line) => Number(line.delivery_note_id) === Number(note.id));
  const order = orders.find((item) => Number(item.id) === Number(note.order_id));
  const currentOrderLines = orderLines.filter((line) => Number(line.order_id) === Number(note.order_id));
  if (catalog.length < 5) continue;
  const used = new Set(currentNoteLines.map((line) => Number(line.product_id)));
  for (const product of catalog) {
    if (currentNoteLines.length >= 5) break;
    if (used.has(Number(product.id))) continue;
    const quantity = 1 + (Number(note.id) + currentNoteLines.length) % 4;
    await post("delivery_note_lines", { delivery_note_id: note.id, product_id: product.id, quantity });
    currentNoteLines.push({ product_id: product.id });
    used.add(Number(product.id));
    createdNotes += 1;
  }
  if (order && currentOrderLines.length < 5) {
    const orderUsed = new Set(currentOrderLines.map((line) => Number(line.product_id)));
    for (const product of catalog) {
      if (currentOrderLines.length >= 5) break;
      if (orderUsed.has(Number(product.id))) continue;
      const quantity = 1 + (Number(note.id) + currentOrderLines.length) % 4;
      const unitPrice = Number(product.unit_price || 0);
      await post("order_lines", { order_id: order.id, product_id: product.id, quantity, unit_price: unitPrice, discount: 0, vat: 21, amount: Number((quantity * unitPrice).toFixed(2)) });
      currentOrderLines.push({ product_id: product.id });
      orderUsed.add(Number(product.id));
      createdOrders += 1;
    }
  }
}
console.log(`created_delivery_note_lines=${createdNotes} created_order_lines=${createdOrders}`);
