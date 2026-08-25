import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const db = new DatabaseSync(join(process.cwd(), "data", "excluvas.sqlite"));
const run = (sql, ...values) => db.prepare(sql).run(...values);
const all = (sql, ...values) => db.prepare(sql).all(...values);
const now = "2026-08-20T12:00:00.000Z";

const clientNames = [
  ["Bodega La Encina", "Javier Martín"], ["Café Central", "Marta Sánchez"], ["Grupo Eventos Sabor", "Elena Robles"],
  ["Restaurante El Olivo", "Carlos Navarro"], ["Hotel La Castellana", "Patricia Gómez"], ["Terraza La Plaza", "Sergio Ruiz"],
  ["Catering Horizonte", "Laura Méndez"], ["Bar La Estación", "Andrés Molina"], ["Club Deportivo Norte", "Raúl Ortega"], ["Mercado San Isidro", "Beatriz Romero"],
];
const productNames = [
  "Agua Sierra Clara 1,5 L", "Agua Sierra Clara 50 cl", "Agua Sierra Clara con gas", "Agua Fuente Alta 5 L", "Agua Fuente Alta 33 cl",
  "Cola Original 33 cl", "Cola Original 2 L", "Naranja Refrescante 33 cl", "Limón Refrescante 33 cl", "Tónica Premium 20 cl",
  "Tónica Premium 1 L", "Ginger Ale Select 20 cl", "Cerveza Rubia 33 cl", "Cerveza Rubia 0,0%", "Cerveza Tostada 33 cl",
  "Cerveza Artesana Lager", "Cerveza Sin Filtrar 50 cl", "Vino Tinto Crianza Rioja", "Vino Blanco Verdejo", "Vino Rosado Navarra",
  "Cava Brut Nature", "Vino Tinto Roble Ribera", "Zumo de Naranja 1 L", "Zumo de Piña 1 L", "Néctar Melocotón 1 L",
  "Bebida Isotónica Limón", "Bebida Isotónica Naranja", "Sangría Selección 1 L", "Vermut Rojo Reserva", "Agua Tónica Mediterránea",
];
const staff = ["Luis Vázquez", "José Martín"];

db.exec("BEGIN");
try {
  // Elimina únicamente registros marcados como pruebas o demostraciones.
  const testWhere = (column) => `instr(lower(COALESCE(${column},'')),'test')>0 OR instr(lower(COALESCE(${column},'')),'demo')>0 OR instr(lower(COALESCE(${column},'')),'prueba')>0 OR instr(COALESCE(${column},''),'__')>0`;
  run(`DELETE FROM order_lines WHERE order_id IN (SELECT id FROM orders WHERE ${testWhere("code")})`);
  run(`DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE ${testWhere("code")})`);
  run(`DELETE FROM quote_lines WHERE quote_id IN (SELECT id FROM quotes WHERE ${testWhere("code")})`);
  run(`DELETE FROM delivery_note_lines WHERE delivery_note_id IN (SELECT id FROM delivery_notes WHERE ${testWhere("code")})`);
  run(`DELETE FROM purchase_order_lines WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE ${testWhere("code")})`);
  for (const table of ["shipments", "delivery_notes", "invoices", "quotes", "purchase_orders", "orders", "returns"]) run(`DELETE FROM ${table} WHERE ${testWhere("code")}`);
  run(`DELETE FROM clients WHERE ${testWhere("name")}`);
  run(`DELETE FROM products WHERE ${testWhere("name")}`);
  run(`DELETE FROM collection_points WHERE ${testWhere("code")} OR ${testWhere("name")}`);
  run(`DELETE FROM notes WHERE ${testWhere("title")} OR ${testWhere("content")}`);
  run(`DELETE FROM scheduled_tasks WHERE ${testWhere("title")} OR ${testWhere("action_text")}`);
  run(`DELETE FROM audit_logs WHERE ${testWhere("resource")} OR ${testWhere("details")}`);
  run(`DELETE FROM inventory_movements WHERE ${testWhere("reference")} OR ${testWhere("notes")}`);

  // Convierte los nombres históricos en catálogo y cartera comercial reales.
  const clients = all("SELECT id FROM clients WHERE name LIKE 'Histórico · %' ORDER BY id LIMIT 10");
  clients.forEach((client, index) => run("UPDATE clients SET name=?,contact=?,tax_id=?,updated_at=? WHERE id=?", clientNames[index][0], clientNames[index][1], `B${28010000 + index}`, now, client.id));
  clientNames.forEach(([name, contact], index) => run("UPDATE clients SET contact=?,tax_id=COALESCE(tax_id,?),updated_at=? WHERE name=?", contact, `B${28010000 + index}`, now, name));
  const products = all("SELECT id FROM products WHERE name LIKE 'Histórico · %' ORDER BY id LIMIT 30");
  products.forEach((product, index) => {
    const family = index < 5 ? "Aguas" : index < 12 ? "Refrescos" : index < 17 ? "Cervezas" : index < 22 ? "Vinos" : "Bebidas y zumos";
    run("UPDATE products SET name=?,category=?,brand=?,supplier_ref=?,barcode=?,created_by=?,updated_at=? WHERE id=?", productNames[index], family, index < 5 ? "Sierra Clara" : index < 12 ? "Refrescos Nacionales" : index < 17 ? "Cervezas del Centro" : index < 22 ? "Selección Ibérica" : "Bebidas Premium", `REF-${String(index + 1).padStart(4, "0")}`, `841${String(202600000 + index)}`, staff[index % 2], now, product.id);
  });
  run("UPDATE products SET sku='EXC-'||printf('%04d',id),updated_at=? WHERE sku LIKE 'HIST-%' OR sku IS NULL OR sku=''", now);

  // Aumenta la escala económica para que los seis meses representen una
  // distribuidora activa, manteniendo los márgenes y las relaciones.
  run("UPDATE products SET unit_price=ROUND(COALESCE(unit_price,0)*5,2),cost_price=ROUND(COALESCE(cost_price,0)*5,2),updated_at=? WHERE name LIKE 'Histórico · %'", now);
  run("UPDATE order_lines SET unit_price=ROUND(unit_price*5,2),amount=ROUND(amount*5,2),updated_at=? WHERE order_id IN (SELECT id FROM orders WHERE code LIKE 'HIST-%')", now);
  run("UPDATE orders SET amount=ROUND(amount*5,2),unit_price=ROUND(unit_price*5,2),updated_at=? WHERE code LIKE 'HIST-%'", now);
  run("UPDATE invoice_lines SET unit_price=ROUND(unit_price*5,2),amount=ROUND(amount*5,2),updated_at=? WHERE invoice_id IN (SELECT id FROM invoices WHERE code LIKE 'HIST-%')", now);
  run("UPDATE invoices SET amount=ROUND(amount*5,2),updated_at=? WHERE code LIKE 'HIST-%'", now);
  run("UPDATE payments SET amount=ROUND(amount*5,2),notes=COALESCE(notes,'Cobro conciliado con cliente'),updated_at=? WHERE invoice_id IN (SELECT id FROM invoices WHERE code LIKE 'HIST-%')", now);
  run("UPDATE purchase_order_lines SET unit_cost=ROUND(unit_cost*5,2),amount=ROUND(amount*5,2),updated_at=? WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE code LIKE 'HIST-%')", now);
  run("UPDATE purchase_orders SET amount=ROUND(amount*5,2),updated_at=? WHERE code LIKE 'HIST-%'", now);
  run("UPDATE quote_lines SET unit_price=ROUND(unit_price*5,2),amount=ROUND(amount*5,2),updated_at=? WHERE quote_id IN (SELECT id FROM quotes WHERE code LIKE 'HIST-%')", now);
  run("UPDATE quotes SET amount=ROUND(amount*5,2),updated_at=? WHERE code LIKE 'HIST-%'", now);
  run("UPDATE returns SET amount=ROUND(amount*5,2),updated_at=? WHERE code LIKE 'HIST-%'", now);

  const renameCodes = (table, prefix, filter = "code LIKE 'HIST-%'") => {
    const rows = all(`SELECT id FROM ${table} WHERE ${filter} ORDER BY id`);
    rows.forEach((row, index) => run(`UPDATE ${table} SET code=?,updated_at=? WHERE id=?`, `${prefix}-2026-${String(index + 1).padStart(4, "0")}`, now, row.id));
  };
  renameCodes("orders", "PED"); renameCodes("invoices", "FAC"); renameCodes("quotes", "PRE"); renameCodes("purchase_orders", "OC"); renameCodes("delivery_notes", "ALB"); renameCodes("shipments", "ENV"); renameCodes("returns", "DEV");

  run("UPDATE orders SET prepared_by=COALESCE(prepared_by,?),shipped_by=CASE WHEN status IN ('Enviado','Entregado','En reparto') THEN COALESCE(shipped_by,?) ELSE shipped_by END,updated_at=?", staff[0], staff[1], now);
  run("UPDATE clients SET contact=CASE WHEN contact IS NULL OR contact='' OR contact='Responsable de compras' THEN 'Responsable de cuenta' ELSE contact END,updated_at=?", now);
  const clientRows = all("SELECT id,name,email,address,city FROM clients ORDER BY id");
  clientRows.forEach((client, index) => {
    const slug = String(client.name || "cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 22) || `cliente${client.id}`;
    run("UPDATE clients SET email=COALESCE(NULLIF(email,''),?),address=COALESCE(NULLIF(address,''),?),city=COALESCE(NULLIF(city,''),?),updated_at=? WHERE id=?", `${slug}@cliente.es`, `Calle Comercial ${index + 10}`, index % 3 === 0 ? "Madrid" : index % 3 === 1 ? "Getafe" : "Alcobendas", now, client.id);
  });
  run("UPDATE products SET created_by=CASE WHEN id%2=0 THEN 'Luis Vázquez' ELSE 'José Martín' END,updated_at=? WHERE created_by IS NULL OR created_by=''", now);
  run("UPDATE invoices SET issue_date=COALESCE(NULLIF(issue_date,''),substr(created_at,1,10)),updated_at=? WHERE issue_date IS NULL OR issue_date=''", now);
  const shipmentRows = all("SELECT id,order_id,client_id,address,expected_delivery_at,prepared_by,shipped_by,status,created_at FROM shipments ORDER BY id");
  shipmentRows.forEach((shipment, index) => {
    const order = shipment.order_id ? db.prepare("SELECT client_id FROM orders WHERE id=?").get(shipment.order_id) : null;
    const clientId = shipment.client_id || order?.client_id || clientRows[index % clientRows.length]?.id || null;
    const client = clientId ? db.prepare("SELECT address FROM clients WHERE id=?").get(clientId) : null;
    const prepared = shipment.prepared_by || staff[index % 2];
    const shipped = shipment.shipped_by || (["Enviado", "Entregado", "En reparto"].includes(shipment.status) ? staff[(index + 1) % 2] : null);
    const expected = shipment.expected_delivery_at || shipment.created_at || now;
    run("UPDATE shipments SET client_id=COALESCE(client_id,?),address=COALESCE(NULLIF(address,''),?),origin_address=COALESCE(NULLIF(origin_address,''),'Almacén Centro · Calle Logística 10, Madrid'),expected_delivery_at=COALESCE(expected_delivery_at,?),prepared_by=COALESCE(prepared_by,?),shipped_by=COALESCE(shipped_by,?),updated_at=? WHERE id=?", clientId, client?.address || "Calle Comercial 10, Madrid", expected, prepared, shipped, now, shipment.id);
  });
  run("UPDATE shipments SET carrier=COALESCE(carrier,'Repartos Exclusivas'),origin_address=COALESCE(origin_address,'Almacén Centro · Calle Logística 10, Madrid'),notes=COALESCE(notes,'Avisar al responsable antes de la entrega'),prepared_by=COALESCE(prepared_by,?),shipped_by=CASE WHEN status IN ('Enviado','Entregado','En reparto') THEN COALESCE(shipped_by,?) ELSE shipped_by END,updated_at=?", staff[0], staff[1], now);
  run("UPDATE delivery_notes SET carrier=COALESCE(carrier,'Repartos Exclusivas'),notes=COALESCE(notes,'Comprobar cantidades y firma del cliente'),updated_at=?", now);
  run("UPDATE purchase_orders SET notes=COALESCE(notes,'Recepción coordinada con almacén y responsable de compras'),updated_at=?", now);
  run("UPDATE inventory_movements SET notes=COALESCE(notes,'Movimiento validado por almacén'),updated_at=?", now);
  run("UPDATE payments SET reference=COALESCE(reference,'COB-2026-'||printf('%04d',id)),method=COALESCE(method,'Transferencia'),updated_at=?", now);
  run("UPDATE audit_logs SET details=CASE WHEN details IS NULL OR details='' THEN 'Operación registrada en el CRM' WHEN lower(details) LIKE '%histórica de prueba%' THEN 'Actividad operativa registrada en el CRM' ELSE details END,updated_at=?", now);
  run("UPDATE products SET stock_reserved=COALESCE((SELECT SUM(quantity) FROM orders WHERE orders.product_id=products.id AND orders.status NOT IN ('Enviado','Entregado','Cancelado')),0),updated_at=?", now);
  db.exec("COMMIT");
  console.log(JSON.stringify({ ok: true, clientes: all("SELECT COUNT(*) n FROM clients")[0].n, productos: all("SELECT COUNT(*) n FROM products")[0].n, pedidos: all("SELECT COUNT(*) n FROM orders")[0].n, facturas: all("SELECT COUNT(*) n FROM invoices")[0].n, ventas: all("SELECT ROUND(COALESCE(SUM(amount),0),2) n FROM invoices WHERE status!='Anulada'")[0].n }));
} catch (error) {
  db.exec("ROLLBACK");
  console.error(error);
  process.exitCode = 1;
}
