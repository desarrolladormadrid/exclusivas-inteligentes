import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
const db = new DatabaseSync(join(process.cwd(), "data", "excluvas.sqlite"));
const cols = (t) =>
  new Set(
    db
      .prepare(`PRAGMA table_info(${t})`)
      .all()
      .map((x) => x.name),
  );
const definitions = {
  products: {
    sku: "TEXT",
    barcode: "TEXT",
    supplier_ref: "TEXT",
    category: "TEXT",
    brand: "TEXT",
    format: "TEXT",
    unit: "TEXT DEFAULT 'unidad'",
    units_per_case: "REAL DEFAULT 1",
    cost_price: "REAL DEFAULT 0",
    stock_reserved: "REAL DEFAULT 0",
    markup_percent: "REAL DEFAULT 0",
    margin_percent: "REAL DEFAULT 0",
    vat: "REAL DEFAULT 21",
    min_stock: "REAL DEFAULT 0",
    supplier_id: "INTEGER",
  },
  clients: {
    tax_id: "TEXT",
    contact: "TEXT",
    city: "TEXT",
    latitude: "REAL",
    longitude: "REAL",
    payment_terms: "TEXT",
    credit_limit: "REAL DEFAULT 0",
  },
  suppliers: { tax_id: "TEXT", contact: "TEXT", payment_terms: "TEXT" },
  warehouses: { code: "TEXT", manager: "TEXT" },
  orders: {
    product_id: "INTEGER",
    quantity: "REAL DEFAULT 0",
    unit_price: "REAL DEFAULT 0",
    discount: "REAL DEFAULT 0",
    delivery_date: "TEXT",
    notes: "TEXT",
  },
  quotes: { valid_until: "TEXT", notes: "TEXT" },
  delivery_notes: {
    order_id: "INTEGER",
    client_id: "INTEGER",
    delivery_date: "TEXT",
    carrier: "TEXT",
    notes: "TEXT",
  },
  invoices: {
    issue_date: "TEXT",
    due_date: "TEXT",
    vat: "REAL DEFAULT 21",
    notes: "TEXT",
  },
  payments: { reference: "TEXT", notes: "TEXT" },
  users: { role: "TEXT DEFAULT 'user'", must_change: "INTEGER DEFAULT 1" },
};
for (const [t, defs] of Object.entries(definitions)) {
  const have = cols(t);
  for (const [name, type] of Object.entries(defs))
    if (!have.has(name)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${name} ${type}`);
}
console.log("SQLite migrada correctamente");
