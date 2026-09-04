import fs from "node:fs";
import { createClient } from "@libsql/client";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(String.fromCharCode(10))) {
  const separator = line.indexOf("=");
  if (separator > 0) env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error("Faltan las credenciales de Turso en .env.local");

const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const marker = "DEMO-SEMANA-2026-09";
const cloudinary = "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254234/exclusivas-inteligentes/productos/producto-cola-original-2-l.webp";
const cloudinaryThumb = "https://res.cloudinary.com/a3msu7ba/image/upload/c_fill,w_360,h_240,f_auto,q_auto/v1788254234/exclusivas-inteligentes/productos/producto-cola-original-2-l.webp";
const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const now = "2026-09-04T18:30:00.000Z";
const day = (number, hour = 9) => `2026-09-${String(number).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;
const date = (number) => `2026-09-${String(number).padStart(2, "0")}`;
const sum = (rows) => Number(rows.reduce((total, row) => total + Number(row.amount || 0), 0).toFixed(2));
const cache = new Map();
const columnsFor = async (table) => {
  if (!cache.has(table)) cache.set(table, new Set((await db.execute(`PRAGMA table_info(${table})`)).rows.map((row) => String(row.name))));
  return cache.get(table);
};
const insert = async (table, values) => {
  const columns = await columnsFor(table);
  const entries = Object.entries(values).filter(([key, value]) => columns.has(key) && value !== undefined);
  const sql = `INSERT INTO ${table}(${entries.map(([key]) => key).join(",")}) VALUES(${entries.map(() => "?").join(",")})`;
  const result = await db.execute({ sql, args: entries.map(([, value]) => value) });
  return Number(result.lastInsertRowid || 0);
};
const one = async (sql, args = []) => (await db.execute({ sql, args })).rows[0] || null;
const execute = (sql, args = []) => db.execute({ sql, args });

if (await one("SELECT id FROM clients WHERE external_code=?", [`${marker}-CLI-01`])) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: "La semana de demostración ya estaba cargada", marker }));
  await db.close();
  process.exit(0);
}

await execute("BEGIN");
try {
  const supplierId = await insert("suppliers", {
    name: "Demo Semana · Distribuciones Centro", phone: "910 700 101", email: "demo.proveedor@exclusivas.local", address: "Calle Logística 10", city: "Madrid", tax_id: "B-DEMO2601", contact: "Marta Ruiz", payment_terms: "Pago a 30 días", active: 1, external_code: `${marker}-PROV-01`, source_system: "Demostración operativa", created_at: day(1, 8), updated_at: now,
  });
  const warehouseIds = [
    await insert("warehouses", { name: "Demo Semana · Almacén Central", address: "Calle Logística 10, Madrid", code: `${marker}-ALM-01`, manager: "Luis", created_at: day(1, 7), updated_at: now }),
    await insert("warehouses", { name: "Demo Semana · Cámara Fría", address: "Calle Frío 2, Madrid", code: `${marker}-ALM-02`, manager: "Jose", created_at: day(1, 7), updated_at: now }),
  ];

  const clientData = [
    ["Restaurante El Patio", "Calle Alcalá 124", "Madrid", "07:00", "16:00", 40.421, -3.675, "compras.elpatio@demo.local"],
    ["Hotel Gran Vía", "Gran Vía 42", "Madrid", "08:00", "20:00", 40.420, -3.706, "compras.granvia@demo.local"],
    ["Bar Mercado", "Calle San Miguel 8", "Madrid", "10:00", "23:30", 40.415, -3.707, "pedidos.barm@demo.local"],
    ["Catering Horizonte", "Calle Río 8", "Getafe", "09:00", "14:00", 40.308, -3.732, "operaciones.horizonte@demo.local"],
    ["Terraza del Parque", "Avenida de América 18", "Madrid", "12:00", "01:00", 40.438, -3.676, "pedidos.terraza@demo.local"],
    ["Club Norte", "Calle del Deporte 12", "Alcobendas", "06:30", "15:00", 40.546, -3.642, "compras.clubnorte@demo.local"],
    ["Web · Taberna Sur", "Calle Embajadores 91", "Madrid", "11:00", "00:00", 40.402, -3.702, "web.tabernasur@demo.local"],
  ];
  const clientIds = [];
  const pointIds = [];
  for (let index = 0; index < clientData.length; index += 1) {
    const [name, address, city, opening, closing, latitude, longitude, email] = clientData[index];
    const clientId = await insert("clients", { name: `Demo Semana · ${name}`, phone: `600 700 ${String(index + 1).padStart(3, "0")}`, email, address, billing_address: address, city, billing_city: city, contact: "Responsable de compras", tax_id: `B-DEMO26${String(index + 1).padStart(2, "0")}`, payment_terms: "Pago a 30 días", payment_terms_code: "30D", credit_limit: 5000, latitude, longitude, opening_time: opening, closing_time: closing, active: 1, source_system: index === 6 ? "Web" : "Demostración operativa", external_code: `${marker}-CLI-${String(index + 1).padStart(2, "0")}`, created_at: day(1 + Math.min(index, 6), 8), updated_at: now });
    clientIds.push(clientId);
    pointIds.push(await insert("collection_points", { code: `${marker}-LOC-${String(index + 1).padStart(2, "0")}`, name: `Local principal · ${name}`, client_id: clientId, address, city, contact: "Responsable de compras", phone: `600 800 ${String(index + 1).padStart(3, "0")}`, email, opening_hours: `L-V ${opening}-${closing}`, opening_time: opening, closing_time: closing, latitude, longitude, geocoding_status: "Geolocalizada", notes: index === 3 ? "Acceso por muelle lateral" : "Confirmar recepción con el encargado", created_at: day(1 + Math.min(index, 6), 8), updated_at: now }));
  }

  const imageUrls = [
    "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254232/exclusivas-inteligentes/productos/producto-cerveza-sin-filtrar-50-cl.webp",
    cloudinary,
    "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254226/exclusivas-inteligentes/productos/producto-agua-sierra-clara-con-gas.webp",
    "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254227/exclusivas-inteligentes/productos/producto-agua-tonica-mediterranea.webp",
    "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254247/exclusivas-inteligentes/productos/producto-vino-tinto-roble-ribera.webp",
    "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254244/exclusivas-inteligentes/productos/producto-vermut-rojo-reserva.webp",
    "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254242/exclusivas-inteligentes/productos/producto-sangria-seleccion-1-l.webp",
    "https://res.cloudinary.com/a3msu7ba/image/upload/c_limit,w_1600,f_auto,q_auto/v1788254229/exclusivas-inteligentes/productos/producto-cava-brut-nature.webp",
  ];
  const productData = [
    ["Cerveza Lager 33 cl", "Cervezas", "Caja 24 unidades", 28.5, 18.5, 12, 40, "A-101"],
    ["Coca-Cola Original 2 L", "Refrescos", "Caja 6 unidades", 21.6, 13.2, 8, 30, "A-102"],
    ["Agua mineral con gas 1 L", "Aguas", "Caja 12 unidades", 12, 6.8, 72, 36, "C-201"],
    ["Tónica Mediterránea", "Mixers", "Caja 24 unidades", 18.4, 11.2, 48, 20, "C-202"],
    ["Vino Tinto Roble", "Vinos", "Caja 6 botellas", 39.9, 25.5, 24, 20, "B-110"],
    ["Vermut Rojo Reserva", "Vinos", "Caja 6 botellas", 42, 27, 18, 15, "B-111"],
    ["Sangría Selección 1 L", "Refrescos", "Caja 6 botellas", 16.8, 9.5, 35, 18, "C-203"],
    ["Cava Brut Nature", "Vinos", "Caja 6 botellas", 55, 36, 10, 12, "B-112"],
  ];
  const productIds = [];
  for (let index = 0; index < productData.length; index += 1) {
    const [name, category, format, price, cost, stock, minStock, location] = productData[index];
    productIds.push(await insert("products", { name: `Demo Semana · ${name}`, unit_price: price, cost_price: cost, real_cost: cost, stock, stock_reserved: 0, min_stock: minStock, stock_min: minStock, stock_target: minStock * 3, stock_safety: Math.ceil(minStock * 0.4), sku: `${marker}-SKU-${String(index + 1).padStart(2, "0")}`, barcode: `843700${String(260900 + index).padStart(6, "0")}`, category, family: category, brand: "Selección Exclusivas", format, unit: "caja", units_per_case: index === 2 ? 12 : 6, vat: 21, warehouse_id: warehouseIds[index % warehouseIds.length], warehouse_location: location, picking_order: index + 1, product_status: "Activo", active: 1, supplier_id: supplierId, primary_supplier_id: supplierId, source_system: "Demostración operativa", external_code: `${marker}-PROD-${String(index + 1).padStart(2, "0")}`, photo_url: imageUrls[index], photo_web_url: imageUrls[index], photo_thumbnail_url: imageUrls[index], photo_name: `${name}.webp`, photo_mime: "image/webp", photo_format: "webp", description: `Referencia de prueba operativa para ${category.toLowerCase()} con imagen Cloudinary.`, created_at: day(1, 8), created_by: "Codex", updated_at: now }));
  }

  const orderSpecs = [
    { code: "PED", day: 1, client: 0, status: "Entregado", urgent: 0, discount: 8, lines: [[0, 5], [1, 4], [2, 8], [4, 2]], note: "Entrega completada y firmada. Revisar retorno de envases en la próxima visita." },
    { code: "PED", day: 2, client: 1, status: "Entregado", urgent: 0, discount: 0, lines: [[2, 6], [3, 4], [5, 2]], note: "Pedido recurrente de desayuno y servicio de terraza." },
    { code: "PED", day: 3, client: 2, status: "En reparto", urgent: 1, discount: 5, lines: [[0, 6], [1, 8], [2, 10], [3, 5], [6, 3]], note: "URGENTE · La entrega debe llegar antes del servicio de noche. Llamar 30 minutos antes." },
    { code: "PED", day: 4, client: 3, status: "Preparado", urgent: 0, discount: 0, lines: [[1, 6], [2, 12], [6, 6], [7, 2]], note: "Preparado para ruta de mañana. Muelle lateral de recepción." },
    { code: "PED", day: 5, client: 4, status: "Preparando", urgent: 0, discount: 0, lines: [[1, 6], [3, 4], [4, 3]], note: "Incidencia de preparación: faltan 4 cajas de Coca-Cola; revisar reposición." },
    { code: "PED", day: 6, client: 5, status: "Confirmado", urgent: 1, discount: 12, lines: [[0, 8], [1, 10], [2, 12], [4, 4], [5, 3], [7, 2]], note: "Pedido de evento deportivo. Priorizar por horario de apertura temprano." },
    { code: "PED", day: 7, client: 6, status: "Nuevo", urgent: 0, discount: 0, lines: [[2, 8], [3, 3]], note: "Alta desde la web · primer pedido del cliente. Confirmar horario antes de preparar." },
    { code: "PED", day: 4, client: 6, status: "Pendiente", urgent: 0, discount: 10, lines: [[0, 3], [1, 4], [6, 2]], note: "Pedido web pendiente de confirmación comercial; aplicar cupón de bienvenida." },
  ];
  const orders = [];
  const orderLineRows = new Map();
  for (let index = 0; index < orderSpecs.length; index += 1) {
    const spec = orderSpecs[index];
    const code = `${marker}-PED-${String(index + 1).padStart(2, "0")}`;
    const lineData = spec.lines.map(([productIndex, quantity], lineIndex) => ({ productId: productIds[productIndex], quantity, unitPrice: productData[productIndex][3], discount: lineIndex === 0 ? spec.discount : 0, amount: Number((quantity * productData[productIndex][3] * (1 - (lineIndex === 0 ? spec.discount : 0) / 100)).toFixed(2)) }));
    const amount = sum(lineData);
    const orderId = await insert("orders", { code, client_id: clientIds[spec.client], collection_point_id: pointIds[spec.client], amount, status: spec.status, created_at: day(spec.day, 8 + (index % 3)), updated_at: now, product_id: lineData[0].productId, quantity: lineData[0].quantity, unit_price: lineData[0].unitPrice, discount: spec.discount, vat: 21, delivery_date: date(spec.day), preparation_date: date(spec.day), shipping_date: date(spec.day), address: clientData[spec.client][1], delivery_city: clientData[spec.client][2], urgent: spec.urgent, stock_alert: spec.code === "PED" && index === 4 ? 1 : 0, created_by: spec.client === 6 ? "Web" : "Luis", notes: spec.note });
    const lineIds = [];
    for (let lineIndex = 0; lineIndex < lineData.length; lineIndex += 1) {
      const line = lineData[lineIndex];
      const partial = index === 4 && lineIndex === 0;
      lineIds.push(await insert("order_lines", { order_id: orderId, product_id: line.productId, quantity: line.quantity, quantity_requested: line.quantity, quantity_unit: "caja", units_factor: productData[spec.lines[lineIndex][0]][2].includes("24") ? 24 : 6, unit_price: line.unitPrice, discount: line.discount, vat: 21, amount: line.amount, prepared: spec.status === "Entregado" || spec.status === "En reparto" || spec.status === "Preparado" ? (partial ? 0 : 1) : 0, prepared_quantity: partial ? 2 : (spec.status === "Entregado" || spec.status === "En reparto" || spec.status === "Preparado" ? line.quantity : 0), preparation_status: partial ? "Incidencia" : (spec.status === "Entregado" || spec.status === "En reparto" || spec.status === "Preparado" ? "Completo" : "Pendiente"), created_at: day(spec.day, 8), updated_at: now }));
    }
    orders.push({ ...spec, id: orderId, code, amount, lineIds, lineData });
    orderLineRows.set(orderId, lineIds);
  }

  const deliveryByOrder = new Map();
  const shipmentByOrder = new Map();
  for (const order of orders.filter((item) => ["Entregado", "En reparto", "Preparado", "Preparando"].includes(item.status))) {
    const noteStatus = order.status === "Entregado" ? "Entregado" : order.status === "En reparto" ? "En reparto" : "Pendiente";
    const deliveryNoteId = await insert("delivery_notes", { code: `${marker}-ALB-${String(order.id).padStart(4, "0")}`, order_id: order.id, client_id: clientIds[order.client], status: noteStatus, created_at: day(order.day, 10), delivery_date: date(order.day), carrier: "Repartos Exclusivas", notes: order.note, updated_at: order.status === "Entregado" ? day(order.day, 15) : now });
    deliveryByOrder.set(order.id, deliveryNoteId);
    for (const line of order.lineData) await insert("delivery_note_lines", { delivery_note_id: deliveryNoteId, product_id: line.productId, quantity: line.quantity, created_at: day(order.day, 10), updated_at: now });
    const delivered = order.status === "Entregado";
    const shipmentId = await insert("shipments", { code: `${marker}-ENV-${String(order.id).padStart(4, "0")}`, order_id: order.id, delivery_note_id: deliveryNoteId, client_id: clientIds[order.client], collection_point_id: pointIds[order.client], carrier: "Repartos Exclusivas", status: order.status, prepared_at: day(Math.max(1, order.day - 1), 13), prepared_by: "Luis", shipped_at: order.status === "Preparando" || order.status === "Preparado" ? null : day(order.day, 7), shipped_by: order.status === "Preparando" || order.status === "Preparado" ? null : "Jose", departure_at: order.status === "Preparando" || order.status === "Preparado" ? null : day(order.day, 7), expected_delivery_at: day(order.day, order.day === 5 ? 12 : 11), delivered_at: delivered ? day(order.day, 14) : null, delivered_by: delivered ? "Jose" : null, address: clientData[order.client][1], delivery_city: clientData[order.client][2], origin_address: "Almacén principal · Calle Logística 10, Madrid", delivery_window_start: `${clientData[order.client][3]}:00`, delivery_window_end: `${clientData[order.client][4]}:00`, packages: order.lines.length, incidents: order.status === "En reparto" ? "Avisar antes de descargar · cliente solicita acceso lateral" : order.status === "Preparando" ? "Falta mercancía de una línea" : null, notes: order.note, urgent: order.urgent, preparation_date: date(order.day), public_tracking_token: `${marker}-TRACK-${String(order.id).padStart(4, "0")}`, delivery_signature_status: delivered ? "Firmado" : "Pendiente", delivery_recipient_name: delivered ? (order.client === 0 ? "Laura González" : "Miguel Santos") : null, delivery_signature_at: delivered ? day(order.day, 14) : null, delivery_signature_by: delivered ? "Jose" : null, delivery_signature_note: delivered ? (order.client === 0 ? "Recibido conforme. Dos cajas de envase retornable pendientes." : "Recibido conforme, sin daños visibles.") : null, delivery_attachments_json: delivered ? JSON.stringify([{ name: `${order.code}-entrega.jpg`, mime: "image/webp", url: cloudinary, thumbnail_url: cloudinaryThumb, storage: "Cloudinary" }]) : null, created_at: day(order.day, 10), updated_at: now });
    shipmentByOrder.set(order.id, shipmentId);
  }

  const invoiceByOrder = new Map();
  for (const order of orders.filter((item) => ["Entregado", "En reparto", "Preparado"].includes(item.status))) {
    const due = order.id === orders[1].id ? "2026-09-02" : date(order.day + 15);
    const status = order.id === orders[0].id ? "Cobrada" : "Pendiente";
    const invoiceId = await insert("invoices", { code: `${marker}-FAC-${String(order.id).padStart(4, "0")}`, client_id: clientIds[order.client], order_id: order.id, delivery_note_id: deliveryByOrder.get(order.id) || null, amount: order.amount, status, created_at: day(order.day, 16), updated_at: now, issue_date: date(order.day), due_date: due, vat: 21, pdf_status: "Pendiente", notes: "Factura de demostración · generar PDF y compartir enlace desde el detalle." });
    invoiceByOrder.set(order.id, invoiceId);
    for (const line of order.lineData) await insert("invoice_lines", { invoice_id: invoiceId, product_id: line.productId, quantity: line.quantity, unit_price: line.unitPrice, discount: line.discount, vat: 21, amount: line.amount, created_at: day(order.day, 16), updated_at: now });
    if (status === "Cobrada") await insert("payments", { invoice_id: invoiceId, amount: order.amount, payment_date: date(order.day + 1), method: "Transferencia", reference: `${marker}-COB-${String(order.id).padStart(4, "0")}`, notes: "Cobro conciliado en la demostración", created_at: day(order.day + 1, 11), updated_at: now });
    else if (order.id === orders[1].id) await insert("payments", { invoice_id: invoiceId, amount: Number((order.amount * 0.45).toFixed(2)), payment_date: "2026-09-03", method: "Domiciliación", reference: `${marker}-COB-PARCIAL-${String(order.id).padStart(4, "0")}`, notes: "Cobro parcial · queda saldo pendiente", created_at: day(3, 11), updated_at: now });
  }

  for (let index = 0; index < 3; index += 1) {
    const sourceOrder = orders[index];
    const quoteId = await insert("quotes", { code: `${marker}-PRE-${String(index + 1).padStart(2, "0")}`, client_id: clientIds[index], amount: sourceOrder.amount * 1.08, status: index === 0 ? "Aceptado" : index === 1 ? "Enviada" : "Borrador", created_at: day(index + 1, 12), valid_until: date(index + 20), notes: "Presupuesto semanal de demostración con varias líneas.", updated_at: now, pdf_status: "Pendiente" });
    for (const line of sourceOrder.lineData.slice(0, 3)) await insert("quote_lines", { quote_id: quoteId, product_id: line.productId, quantity: line.quantity, unit_price: line.unitPrice, discount: 0, vat: 21, amount: line.amount, created_at: day(index + 1, 12), updated_at: now });
  }

  const purchaseData = [
    { day: 1, status: "Recibida", code: `${marker}-COMP-01`, lines: [[0, 40], [1, 30]], note: "Reposición de cervezas y refrescos · recepción completa." },
    { day: 3, status: "Recibida", code: `${marker}-COMP-02`, lines: [[2, 60], [3, 24], [4, 18]], note: "Recepción con incidencia: dos cajas de agua golpeadas y una diferencia de unidades." },
    { day: 5, status: "En tránsito", code: `${marker}-COMP-03`, lines: [[5, 20], [7, 12]], note: "Entrega prevista el lunes · revisar muelle y temperatura." },
  ];
  const receiptIds = [];
  for (let index = 0; index < purchaseData.length; index += 1) {
    const purchase = purchaseData[index];
    const purchaseAmount = sum(purchase.lines.map(([productIndex, quantity]) => ({ amount: quantity * productData[productIndex][4] })));
    const purchaseId = await insert("purchase_orders", { code: purchase.code, supplier_id: supplierId, status: purchase.status, order_date: date(purchase.day), expected_date: date(purchase.day + 2), amount: purchaseAmount, notes: purchase.note, validation_status: purchase.status === "Recibida" ? "Validado" : "Pendiente de validar", created_at: day(purchase.day, 7), updated_at: now });
    for (const [productIndex, quantity] of purchase.lines) await insert("purchase_order_lines", { purchase_order_id: purchaseId, product_id: productIds[productIndex], quantity, unit_cost: productData[productIndex][4], amount: quantity * productData[productIndex][4], created_at: day(purchase.day, 7), updated_at: now });
    if (purchase.status !== "Recibida") continue;
    const pending = index === 1;
    const receiptId = await insert("goods_receipts", { code: `${marker}-ENT-${String(index + 1).padStart(2, "0")}`, supplier_id: supplierId, purchase_order_id: purchaseId, warehouse_id: warehouseIds[index % warehouseIds.length], receipt_date: date(purchase.day), status: "Recibida", validation_status: pending ? "Pendiente" : "Validada", validated_by: pending ? null : "Luis", validated_at: pending ? null : day(purchase.day, 15), notes: purchase.note, created_by: "Luis", received_by: index === 1 ? "Jose" : "Luis", created_at: day(purchase.day, 9), updated_at: now });
    receiptIds.push(receiptId);
    for (let lineIndex = 0; lineIndex < purchase.lines.length; lineIndex += 1) {
      const [productIndex, expected] = purchase.lines[lineIndex];
      const damaged = pending && lineIndex === 0 ? 2 : 0;
      const received = pending && lineIndex === 0 ? expected - 2 : expected;
      const lineId = await insert("goods_receipt_lines", { receipt_id: receiptId, product_id: productIds[productIndex], product_name_snapshot: `Demo Semana · ${productData[productIndex][0]}`, expected_quantity: expected, received_quantity: received, damaged_quantity: damaged, substituted_quantity: 0, unit_cost: productData[productIndex][4], expected_value: expected * productData[productIndex][4], received_value: received * productData[productIndex][4], economic_difference: (received - expected) * productData[productIndex][4], status: damaged ? "Dañado" : "Correcta", notes: damaged ? "Dos cajas llegaron golpeadas; revisar fotografía." : "Recepción correcta", location_verified_status: pending ? "Pendiente" : "Validada manualmente", location_verified_code: pending ? null : productData[productIndex][7], location_verified_reason: pending ? null : "Comprobación inicial de la entrada", location_verified_by: pending ? null : "Luis", location_verified_at: pending ? null : day(purchase.day, 15), created_at: day(purchase.day, 9), updated_at: now });
      await insert("inventory_movements", { product_id: productIds[productIndex], warehouse_id: warehouseIds[index % warehouseIds.length], movement_type: "Entrada", quantity: received, reference: `${marker}-ENT-${String(index + 1).padStart(2, "0")}`, movement_date: date(purchase.day), notes: pending ? "Entrada parcial · pendiente de validar incidencia" : "Entrada validada de proveedor", receipt_id: receiptId, created_by: "Luis", created_at: day(purchase.day, 9), updated_at: now });
      if (damaged) await insert("goods_receipt_incidents", { receipt_id: receiptId, receipt_line_id: lineId, supplier_id: supplierId, type: "Dañado", description: "Dos cajas golpeadas durante el transporte; la diferencia debe reclamarse al proveedor.", expected_quantity: expected, received_quantity: received, damaged_quantity: damaged, substituted_quantity: 0, economic_difference: (received - expected) * productData[productIndex][4], status: "Abierta", attachment_name: "foto-incidencia-entrada.webp", attachment_mime: "image/webp", attachment_data: tinyPng, attachments_json: JSON.stringify([{ name: "foto-incidencia-entrada.webp", mime: "image/webp", url: cloudinary, thumbnail_url: cloudinaryThumb, storage: "Cloudinary" }]), claim_status: "No reclamada", created_by: "Jose", created_at: day(purchase.day, 10), updated_at: now });
    }
  }

  for (let index = 0; index < orders.length; index += 1) {
    const order = orders[index];
    if (!shipmentByOrder.has(order.id)) continue;
    for (const line of order.lineData) await insert("inventory_movements", { product_id: line.productId, warehouse_id: warehouseIds[index % warehouseIds.length], movement_type: "Salida", quantity: line.quantity, reference: order.code, movement_date: date(order.day), notes: `Salida para ${order.code}`, order_id: order.id, shipment_id: shipmentByOrder.get(order.id), client_id: clientIds[order.client], created_by: "Jose", created_at: day(order.day, 7), updated_at: now });
  }
  await insert("inventory_movements", { product_id: productIds[2], warehouse_id: warehouseIds[0], movement_type: "Ajuste", quantity: -3, reference: `${marker}-AJU-01`, movement_date: date(4), notes: "Ajuste por rotura detectada en inventario de cámara", created_by: "Luis", created_at: day(4, 17), updated_at: now });
  await insert("inventory_movements", { product_id: productIds[1], warehouse_id: warehouseIds[0], movement_type: "Devolución", quantity: 2, reference: `${marker}-DEV-01`, movement_date: date(3), notes: "Retorno de envases y producto no servido", created_by: "Jose", created_at: day(3, 16), updated_at: now });

  const routeId = await insert("delivery_routes", { code: `${marker}-RUTA-01`, route_date: date(3), driver: "Jose Martín", vehicle: "Furgón 04", status: "En curso", radius_meters: 150, origin_address: "Almacén principal · Calle Logística 10, Madrid", origin_latitude: 40.400, origin_longitude: -3.710, notes: "Ruta demo ordenada por hora de apertura y distancia.", created_by: "Luis", created_at: day(3, 6), updated_at: now });
  for (const [position, clientIndex] of [[1, 5], [2, 0], [3, 2], [4, 4]]) {
    const stopPoint = clientData[clientIndex];
    const shipment = orders.find((order) => order.client === clientIndex && shipmentByOrder.has(order.id));
    await insert("delivery_route_stops", { route_id: routeId, position, shipment_id: shipment ? shipmentByOrder.get(shipment.id) : null, client_id: clientIds[clientIndex], collection_point_id: pointIds[clientIndex], client_name: `Demo Semana · ${stopPoint[0]}`, address: stopPoint[1], city: stopPoint[2], latitude: stopPoint[5], longitude: stopPoint[6], distance_km: Number((1.2 + position * 1.35).toFixed(1)), status: position === 1 ? "En reparto" : "Pendiente", notes: `Horario ${stopPoint[3]}-${stopPoint[4]}`, opening_time: stopPoint[3], closing_time: stopPoint[4], created_at: day(3, 6), updated_at: now });
  }

  const expenseData = [[1, "Combustible", "Estación Centro", 86.4], [2, "Aparcamiento", "Parking Mercado", 18], [3, "Peajes", "Autopista A-42", 12.5], [4, "Representación", "Cafetería Ruta", 34.2], [5, "Mantenimiento", "Taller Furgón 04", 142]];
  for (let index = 0; index < expenseData.length; index += 1) {
    const [expenseDay, category, vendor, amount] = expenseData[index];
    await insert("expenses", { code: `${marker}-GAS-${String(index + 1).padStart(2, "0")}`, client_id: index < 3 ? clientIds[index] : null, expense_date: date(expenseDay), category, vendor, amount, vat: category === "Representación" ? 10 : 21, payment_method: index === 4 ? "Transferencia" : "Tarjeta", notes: `Gasto operativo de la semana demo · ${vendor}`, attachment_name: index === 0 ? "ticket-combustible-demo.png" : null, attachment_mime: index === 0 ? "image/png" : null, attachment_data: index === 0 ? tinyPng : null, created_at: day(expenseDay, 18), updated_at: now });
  }

  const notes = [
    ["Preparación incompleta · Coca-Cola", "El pedido DEMO-SEMANA-2026-09-PED-05 tiene 4 cajas pendientes. Revisar stock y generar incidencia.", "Urgente", "Preparación de pedidos", 1, 0],
    ["Entrada con mercancía dañada", "La entrada DEMO-SEMANA-2026-09-ENT-02 tiene una incidencia abierta con fotografía adjunta.", "Alta", "Entradas", 1, 0],
    ["Cobro vencido · Hotel Gran Vía", "Factura DEMO-SEMANA-2026-09-FAC-0002 con cobro parcial y vencimiento superado.", "Alta", "Cobros", 1, 0],
    ["Cliente nuevo desde la web", "Web · Taberna Sur requiere confirmación de horario antes de preparar el primer pedido.", "Normal", "Clientes", 1, 0],
    ["Ruta con parada prioritaria", "La parada de Club Norte abre a las 06:30; mantenerla como primera parada.", "Normal", "Rutas", 0, 0],
    ["Imagen de prueba Cloudinary", "La operativa demo incluye imágenes de producto, incidencia y justificante para validar su visualización.", "Normal", "Archivos", 0, 1],
  ];
  for (let index = 0; index < notes.length; index += 1) {
    const [title, content, priority, module, important, completed] = notes[index];
    await insert("notes", { title: `Demo Semana · ${title}`, content, priority, module, important, completed, status: completed ? "Resuelta" : "Pendiente", created_by: "Codex", created_at: day(index + 1, 17), updated_at: now });
  }
  await insert("scheduled_tasks", { title: "Demo Semana · Avisar facturas vencidas", action_text: "Revisar facturas pendientes y preparar recordatorio de cobro.", schedule_type: "Recurrente", recurrence: "diaria", next_run: day(5, 9), status: "Activa", created_by: "Asistente", created_at: day(1, 18), updated_at: now });
  await insert("scheduled_tasks", { title: "Demo Semana · Revisar stock crítico", action_text: "Revisar productos por debajo del mínimo y proponer compra.", schedule_type: "Recurrente", recurrence: "diaria", next_run: day(5, 9), status: "Activa", created_by: "Asistente", created_at: day(1, 18), updated_at: now });
  await insert("scheduled_tasks", { title: "Demo Semana · Confirmar entregas", action_text: "Comprobar envíos sin firma ni confirmación del cliente.", schedule_type: "Recurrente", recurrence: "diaria", next_run: day(5, 16), status: "Activa", created_by: "Asistente", created_at: day(1, 18), updated_at: now });

  const webClientId = clientIds[6];
  await insert("web_registrations", { kind: "cliente", company_name: "Web · Taberna Sur", tax_id: "B-DEMO2607", contact_name: "Sergio Martín", email: "web.tabernasur@demo.local", phone: "600 700 007", address: clientData[6][1], city: clientData[6][2], message: "Alta de prueba desde formulario web · desea consultar ofertas de la semana.", status: "Pendiente de validar", created_at: day(7, 10), updated_at: now, crm_record_id: webClientId, crm_record_type: "clients" });

  for (const order of orders) await insert("audit_logs", { actor: order.client === 6 ? "Web" : (order.id % 2 ? "Luis" : "Jose"), method: "POST", resource: `orders/${order.id}`, action: "Alta demo operativa", details: `${order.code} · ${order.status} · ${order.lineData.length} líneas · semana de prueba`, created_at: day(order.day, 8), updated_at: now });
  for (const receiptId of receiptIds) await insert("audit_logs", { actor: "Luis", method: "POST", resource: `goods_receipts/${receiptId}`, action: "Recepción demo operativa", details: `Entrada ${receiptId} · incluye líneas, movimiento de stock${receiptId === receiptIds[1] ? " e incidencia con imagen" : ""}`, created_at: now, updated_at: now });

  for (const productId of productIds) {
    await execute("UPDATE products SET stock_reserved=COALESCE((SELECT SUM(quantity) FROM order_lines JOIN orders ON orders.id=order_lines.order_id WHERE order_lines.product_id=? AND COALESCE(orders.status,'') NOT IN ('Enviado','Entregado','Cancelado') AND CAST(COALESCE(orders.deleted,0) AS INTEGER)=0 AND CAST(COALESCE(order_lines.deleted,0) AS INTEGER)=0),0),updated_at=? WHERE id=?", [productId, now, productId]);
  }
  await execute("COMMIT");
  const counts = {};
  for (const [table, condition] of [["orders", "code LIKE 'DEMO-SEMANA-2026-09-%'"], ["order_lines", "order_id IN (SELECT id FROM orders WHERE code LIKE 'DEMO-SEMANA-2026-09-%')"], ["shipments", "code LIKE 'DEMO-SEMANA-2026-09-%'"], ["invoices", "code LIKE 'DEMO-SEMANA-2026-09-%'"], ["goods_receipts", "code LIKE 'DEMO-SEMANA-2026-09-%'"], ["goods_receipt_incidents", "receipt_id IN (SELECT id FROM goods_receipts WHERE code LIKE 'DEMO-SEMANA-2026-09-%')"], ["inventory_movements", "reference LIKE 'DEMO-SEMANA-2026-09-%'"], ["expenses", "code LIKE 'DEMO-SEMANA-2026-09-%'"], ["notes", "title LIKE 'Demo Semana · %'"]]) counts[table] = Number((await one(`SELECT COUNT(*) n FROM ${table} WHERE ${condition}`))?.n || 0);
  console.log(JSON.stringify({ ok: true, marker, period: "01/09/2026–07/09/2026", clients: clientIds.length, products: productIds.length, warehouses: warehouseIds.length, counts }, null, 2));
} catch (error) {
  await execute("ROLLBACK").catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.close();
}
