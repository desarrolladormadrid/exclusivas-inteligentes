import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
const db = new DatabaseSync(join(process.cwd(), "data", "excluvas.sqlite"));
const count = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
const add = (sql, ...v) => db.prepare(sql).run(...v);
if (!count("clients")) {
  add(
    "INSERT INTO clients(name,phone,email,address) VALUES(?,?,?,?)",
    "Restaurante La Viña",
    "612 345 678",
    "compras@lavina.es",
    "Calle Mayor 12",
  );
  add(
    "INSERT INTO clients(name,phone,email,address) VALUES(?,?,?,?)",
    "Hotel Mirador",
    "623 456 789",
    "compras@hotelmirador.es",
    "Av. del Puerto 8",
  );
  add(
    "INSERT INTO clients(name,phone,email,address) VALUES(?,?,?,?)",
    "Bar El Puerto",
    "634 567 890",
    "pedidos@elpuerto.es",
    "Paseo Marítimo 4",
  );
}
if (!count("products")) {
  add(
    "INSERT INTO products(name,unit_price,stock) VALUES(?,?,?)",
    "Coca-Cola 33cl · Caja 24",
    14.4,
    82,
  );
  add(
    "INSERT INTO products(name,unit_price,stock) VALUES(?,?,?)",
    "Agua mineral 1,5L · Pack 6",
    3.9,
    146,
  );
  add(
    "INSERT INTO products(name,unit_price,stock) VALUES(?,?,?)",
    "Cerveza Alhambra · Caja 24",
    22.8,
    38,
  );
  add(
    "INSERT INTO products(name,unit_price,stock) VALUES(?,?,?)",
    "Vino tinto Rioja · Caja 6",
    36,
    12,
  );
}
if (!count("suppliers")) {
  add(
    "INSERT INTO suppliers(name,phone,email,address) VALUES(?,?,?,?)",
    "Bebidas Iberia",
    "910 111 222",
    "ventas@iberia.local",
    "Polígono Norte 5",
  );
  add(
    "INSERT INTO suppliers(name,phone,email,address) VALUES(?,?,?,?)",
    "Aguas del Sur",
    "920 333 444",
    "comercial@aguasdelsur.local",
    "Carretera Nacional 2",
  );
}
if (!count("warehouses")) {
  add(
    "INSERT INTO warehouses(name,address) VALUES(?,?)",
    "Almacén principal",
    "Calle Logística 10",
  );
  add(
    "INSERT INTO warehouses(name,address) VALUES(?,?)",
    "Cámara de bebidas",
    "Calle Logística 12",
  );
}
const client = db
    .prepare("SELECT id FROM clients ORDER BY id LIMIT 1")
    .get()?.id,
  product = db.prepare("SELECT id FROM products ORDER BY id LIMIT 1").get()?.id;
if (!count("orders")) {
  add(
    "INSERT INTO orders(code,client_id,product_id,quantity,amount,status) VALUES(?,?,?,?,?,?)",
    "PED-1048",
    client,
    product,
    12,
    172.8,
    "Preparando",
  );
  add(
    "INSERT INTO orders(code,client_id,product_id,quantity,amount,status) VALUES(?,?,?,?,?,?)",
    "PED-1047",
    client,
    product,
    8,
    115.2,
    "En reparto",
  );
}
if (!count("quotes"))
  add(
    "INSERT INTO quotes(code,client_id,amount,status) VALUES(?,?,?,?)",
    "PRE-2026-018",
    client,
    486,
    "Enviada",
  );
if (!count("delivery_notes"))
  add(
    "INSERT INTO delivery_notes(code,order_id,client_id,status) VALUES(?,?,?,?)",
    "ALB-2026-032",
    1,
    client,
    "Pendiente",
  );
if (!count("invoices"))
  add(
    "INSERT INTO invoices(code,client_id,amount,status) VALUES(?,?,?,?)",
    "FAC-2026-021",
    client,
    486,
    "Pendiente",
  );
if (
  db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='shipments'",
    )
    .get() &&
  !count("shipments")
)
  add(
    "INSERT INTO shipments(code,order_id,client_id,carrier,status,prepared_at,expected_delivery_at,address,packages) VALUES(?,?,?,?,?,?,?,?,?)",
    "ENV-2026-001",
    1,
    client,
    "Repartos Excluvas",
    "Preparado",
    "2026-08-20 08:30",
    "2026-08-20 12:00",
    "Calle Mayor 12",
    3,
  );
if (
  db
    .prepare("PRAGMA table_info(products)")
    .all()
    .some((x) => x.name === "stock_reserved")
)
  db.exec(
    "UPDATE products SET stock_reserved=COALESCE((SELECT SUM(quantity) FROM orders WHERE orders.product_id=products.id AND orders.status NOT IN ('Enviado','Entregado','Cancelado')),0)",
  );
const invoice = db
  .prepare("SELECT id FROM invoices ORDER BY id LIMIT 1")
  .get()?.id;
if (!count("payments"))
  add(
    "INSERT INTO payments(invoice_id,amount,payment_date,method) VALUES(?,?,?,?)",
    invoice,
    243,
    "2026-08-18",
    "Transferencia",
  );
console.log("Datos dummy comprobados");
