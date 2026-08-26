import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createRemoteDatabaseSync } from "../remote-db-sync.mjs";

const root = process.cwd();
const dataDir = join(root, "data");
const dbPath = join(dataDir, "excluvas.sqlite");
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}
const remoteMode = process.env.DATABASE_MODE === "remote";
if (!remoteMode && !existsSync(dbPath)) throw new Error(`No existe la base de datos: ${dbPath}`);

let backupPath = null;
if (!remoteMode) {
  const backupDir = join(dataDir, "backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  backupPath = join(backupDir, `excluvas-before-product-fields-${stamp}.sqlite`);
  copyFileSync(dbPath, backupPath);
}

const db = remoteMode
  ? createRemoteDatabaseSync({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
  : new DatabaseSync(dbPath);
db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
const locationHistorySql = "CREATE TABLE IF NOT EXISTS product_location_history(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER NOT NULL,previous_location TEXT,current_location TEXT,changed_by TEXT DEFAULT 'Usuario local',changed_at TEXT DEFAULT CURRENT_TIMESTAMP,source TEXT DEFAULT 'CRM')";
if (remoteMode) db.prepare(locationHistorySql).run();
else db.exec(locationHistorySql);
for (const noteColumn of ["created_by TEXT", "updated_at TEXT"]) {
  const noteSql = `ALTER TABLE notes ADD COLUMN ${noteColumn}`;
  try { if (remoteMode) db.prepare(noteSql).run(); else db.exec(noteSql); } catch {}
}
if (process.argv[2] === "--inspect") {
  console.log(JSON.stringify(db.prepare("PRAGMA table_info(products)").all(), null, 2));
  process.exit(0);
}
if (process.argv[2] === "--sample") {
  console.log(JSON.stringify(db.prepare("SELECT id,name,description,category_code,warehouse_id,preorder,product_tracking_code,inventory_valuation_method,last_direct_cost,accounting_product_group,accounting_vat_group,inventory_register_group,created_at FROM products ORDER BY id DESC LIMIT 2").all(), null, 2));
  process.exit(0);
}
if (process.argv[2] === "--stats") {
  console.log(JSON.stringify(db.prepare(`SELECT COUNT(*) AS total,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(sku,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_supplier_number,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(description,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_description,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(category,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_category,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(category_code,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_category_code,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(unit,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_unit,
    SUM(CASE WHEN warehouse_id IS NULL THEN 1 ELSE 0 END) AS missing_warehouse,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(warehouse_location,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_shelf,
    SUM(CASE WHEN cost_price IS NULL THEN 1 ELSE 0 END) AS missing_cost,
    SUM(CASE WHEN supplier_id IS NULL THEN 1 ELSE 0 END) AS missing_supplier
    FROM products`).get(), null, 2));
  process.exit(0);
}
if (process.argv[2] === "--edit-test") {
  const updated = db.prepare(`UPDATE products SET description=?,warehouse_location=?,markup_percent=?,cost_price=?,last_direct_cost=?,unit_price=?,product_tracking_code=?,lot_tracking=?,expiry_tracking=?,updated_at=? WHERE id=?`).run(
    "Producto editado en produccion - caja de 12 unidades",
    "TEST-B-02",
    30,
    8.5,
    8.5,
    11.05,
    "Lote y fecha de caducidad",
    1,
    1,
    new Date().toISOString(),
    299,
  );
  console.log(JSON.stringify({ changes: updated.changes, product: db.prepare("SELECT id,name,sku,description,warehouse_location,cost_price,last_direct_cost,markup_percent,unit_price,product_tracking_code,lot_tracking,expiry_tracking,updated_at FROM products WHERE id=?").get(299) }, null, 2));
  process.exit(0);
}

const columns = [
  ["description", "TEXT"],
  ["category_code", "TEXT"],
  ["warehouse_id", "INTEGER"],
  ["preorder", "INTEGER DEFAULT 1"],
  ["product_tracking_code", "TEXT DEFAULT 'Sin seguimiento'"],
  ["inventory_valuation_method", "TEXT DEFAULT 'FIFO'"],
  ["last_direct_cost", "REAL DEFAULT 0"],
  ["accounting_product_group", "TEXT DEFAULT 'Mercaderías'"],
  ["accounting_vat_group", "TEXT DEFAULT '21%'"],
  ["inventory_register_group", "TEXT DEFAULT 'Mercaderías'"],
  ["created_at", "TEXT"],
  ["created_by", "TEXT"],
];

if (!remoteMode) db.exec("BEGIN");
try {
  for (const [name, definition] of columns) {
    try {
      const statement = `ALTER TABLE products ADD COLUMN ${name} ${definition}`;
      if (remoteMode) db.prepare(statement).run();
      else db.exec(statement);
    } catch {}
  }

  const warehouse = db.prepare("SELECT id FROM warehouses ORDER BY id LIMIT 1").get();
  if (!warehouse) {
    db.prepare("INSERT INTO warehouses(name,address) VALUES(?,?)").run("Almacén principal", "Pendiente de completar");
  }
  const defaultWarehouse = db.prepare("SELECT id FROM warehouses ORDER BY id LIMIT 1").get();
  let placeholderSupplier = db.prepare("SELECT id FROM suppliers WHERE name=? LIMIT 1").get("Proveedor pendiente de completar");
  if (!placeholderSupplier) {
    const created = db.prepare("INSERT INTO suppliers(name,active) VALUES(?,1)").run("Proveedor pendiente de completar");
    placeholderSupplier = { id: Number(created.lastInsertRowid) };
  }

  db.exec(`
    UPDATE products SET
      sku = COALESCE(NULLIF(TRIM(sku), ''), 'AY-PENDIENTE-' || printf('%04d', id)),
      category = COALESCE(NULLIF(TRIM(category), ''), 'Sin clasificar'),
      description = COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(name), ''), 'Sin descripción'),
      warehouse_id = COALESCE(warehouse_id, ${Number(defaultWarehouse.id)}),
      supplier_id = COALESCE(supplier_id, ${Number(placeholderSupplier.id)}),
      primary_supplier_id = COALESCE(primary_supplier_id, supplier_id, ${Number(placeholderSupplier.id)}),
      preorder = COALESCE(preorder, 1),
      product_tracking_code = CASE
        WHEN NULLIF(TRIM(product_tracking_code), '') IS NOT NULL AND TRIM(product_tracking_code) <> 'Sin seguimiento' THEN product_tracking_code
        WHEN COALESCE(expiry_tracking, 0) = 1 THEN 'Lote y fecha de caducidad'
        WHEN COALESCE(lot_tracking, 0) = 1 THEN 'Seguimiento de lote'
        ELSE 'Sin seguimiento'
      END,
      inventory_valuation_method = COALESCE(NULLIF(TRIM(inventory_valuation_method), ''), 'FIFO'),
      last_direct_cost = CASE WHEN COALESCE(last_direct_cost, 0) = 0 THEN COALESCE(cost_price, 0) ELSE last_direct_cost END,
      accounting_product_group = COALESCE(NULLIF(TRIM(accounting_product_group), ''), 'Mercaderías'),
      accounting_vat_group = COALESCE(NULLIF(TRIM(accounting_vat_group), ''), CASE WHEN vat IS NOT NULL THEN printf('%g%%', vat) ELSE '21%' END),
      inventory_register_group = COALESCE(NULLIF(TRIM(inventory_register_group), ''), 'Mercaderías'),
      created_at = COALESCE(NULLIF(TRIM(created_at), ''), CURRENT_TIMESTAMP)
  `);

  const categories = db.prepare("SELECT id, category FROM products WHERE NULLIF(TRIM(COALESCE(category_code, '')), '') IS NULL AND NULLIF(TRIM(COALESCE(category, '')), '') IS NOT NULL ORDER BY LOWER(TRIM(category)), id").all();
  const categoryCodes = new Map();
  let nextCode = 1;
  for (const row of categories) {
    const key = String(row.category).trim().toLowerCase();
    if (!categoryCodes.has(key)) categoryCodes.set(key, String(nextCode++).padStart(3, "0"));
    db.prepare("UPDATE products SET category_code=? WHERE id=?").run(categoryCodes.get(key), row.id);
  }
  db.exec("UPDATE products SET category_code=COALESCE(NULLIF(TRIM(category_code), ''), '000')");
  if (!remoteMode) db.exec("COMMIT");
} catch (error) {
  if (!remoteMode) {
    try { db.exec("ROLLBACK"); } catch {}
  }
  throw error;
}

const result = db.prepare(`
  SELECT COUNT(*) AS total,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(description,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_description,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(category_code,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_category_code,
    SUM(CASE WHEN warehouse_id IS NULL THEN 1 ELSE 0 END) AS missing_warehouse,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(product_tracking_code,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_tracking,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(inventory_valuation_method,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_valuation,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(accounting_product_group,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_product_group,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(accounting_vat_group,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_vat_group,
    SUM(CASE WHEN NULLIF(TRIM(COALESCE(inventory_register_group,'')), '') IS NULL THEN 1 ELSE 0 END) AS missing_inventory_group,
    SUM(CASE WHEN created_at IS NULL THEN 1 ELSE 0 END) AS missing_created_at
  FROM products
`).get();
console.log(JSON.stringify({ dbPath, backupPath, result }, null, 2));
