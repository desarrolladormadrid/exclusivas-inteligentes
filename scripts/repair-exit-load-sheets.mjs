import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(new URL("../data/excluvas.sqlite", import.meta.url));
const exits = db.prepare("SELECT * FROM inventory_movements WHERE movement_type='Salida' AND (shipment_id IS NULL OR shipment_id='') ORDER BY movement_date, id").all();
const clients = db.prepare("SELECT id,name,address,city FROM clients WHERE name IS NOT NULL ORDER BY id").all();
const products = db.prepare("SELECT id,name FROM products WHERE name IS NOT NULL ORDER BY id").all();
if (!clients.length || !products.length) throw new Error("No hay clientes o productos para completar las hojas de carga");

const now = new Date().toISOString();
const insertShipment = db.prepare(`INSERT INTO shipments(code,client_id,status,prepared_at,shipped_at,expected_delivery_at,address,origin_address,carrier,packages,notes,prepared_by,shipped_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const updateExit = db.prepare("UPDATE inventory_movements SET shipment_id=?,client_id=?,created_by=?,notes=? WHERE id=?");
let created = 0;
for (let index = 0; index < exits.length; index += 1) {
  const exit = exits[index];
  const client = clients[index % clients.length];
  const product = products.find((item) => Number(item.id) === Number(exit.product_id)) || products[index % products.length];
  const date = String(exit.movement_date || now).slice(0, 10);
  const code = `CAR-${date.replaceAll("-", "")}-${String(exit.id).padStart(4, "0")}`;
  const address = client.address || `${client.name} · ${client.city || "Madrid"}`;
  const result = insertShipment.run(code, client.id, "Enviado", `${date}T07:30:00.000Z`, `${date}T08:15:00.000Z`, `${date}T12:00:00.000Z`, address, "Almacén Centro · Calle Logística 10, Madrid", "Repartos Exclusivas", Math.max(1, Math.ceil(Number(exit.quantity || 1) / 12)), `Hoja de carga generada para la salida ${exit.id}. Producto: ${product.name}.`, index % 2 ? "José Martín" : "Luis Vázquez", index % 2 ? "Luis Vázquez" : "José Martín", now, now);
  const shipmentId = Number(result.lastInsertRowid);
  updateExit.run(shipmentId, client.id, index % 2 ? "José Martín" : "Luis Vázquez", `Salida asociada a hoja de carga ${code} · ${product.name} · Cliente: ${client.name}`, exit.id);
  created += 1;
}
db.prepare("INSERT INTO audit_logs(actor,method,resource,action,details,created_at) VALUES(?,?,?,?,?,?)").run("Luis", "MIGRACIÓN", "inventory_movements", "Hojas de carga completadas", `Se han creado ${created} hojas de carga para salidas sin relación`, now);
console.log(JSON.stringify({ created, clients: clients.length, products: products.length }));
