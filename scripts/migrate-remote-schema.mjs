import fs from "node:fs";
import { createClient } from "@libsql/client";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(String.fromCharCode(10))) {
  const separator = line.indexOf("=");
  if (separator > 0) env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error("Faltan las credenciales de Turso en .env.local");

const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const migrationsByTable = {
  goods_receipts: [
    ["table", "CREATE TABLE IF NOT EXISTS goods_receipts(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE NOT NULL,supplier_id INTEGER NOT NULL,purchase_order_id INTEGER,warehouse_id INTEGER,receipt_date TEXT NOT NULL,status TEXT DEFAULT 'Borrador',notes TEXT,created_by TEXT,received_by TEXT,created_at TEXT,updated_at TEXT,deleted TEXT DEFAULT '0',deleted_at TEXT,deleted_by TEXT)"],
  ],
  goods_receipt_lines: [
    ["table", "CREATE TABLE IF NOT EXISTS goods_receipt_lines(id INTEGER PRIMARY KEY AUTOINCREMENT,receipt_id INTEGER NOT NULL,product_id INTEGER NOT NULL,product_name_snapshot TEXT,expected_quantity REAL DEFAULT 0,received_quantity REAL DEFAULT 0,unit_cost REAL DEFAULT 0,status TEXT DEFAULT 'Correcta',notes TEXT,created_at TEXT,updated_at TEXT,deleted TEXT DEFAULT '0',deleted_at TEXT,deleted_by TEXT)"],
  ],
  goods_receipt_incidents: [
    ["table", "CREATE TABLE IF NOT EXISTS goods_receipt_incidents(id INTEGER PRIMARY KEY AUTOINCREMENT,receipt_id INTEGER NOT NULL,receipt_line_id INTEGER,supplier_id INTEGER,type TEXT DEFAULT 'Diferencia',description TEXT NOT NULL,expected_quantity REAL,received_quantity REAL,status TEXT DEFAULT 'Pendiente',attachment_name TEXT,attachment_mime TEXT,attachment_data TEXT,created_by TEXT,created_at TEXT,updated_at TEXT,deleted TEXT DEFAULT '0',deleted_at TEXT,deleted_by TEXT)"],
  ],
  ocr_documents: [
    ["table", "CREATE TABLE IF NOT EXISTS ocr_documents(id INTEGER PRIMARY KEY AUTOINCREMENT,file_name TEXT NOT NULL,mime_type TEXT,file_size INTEGER DEFAULT 0,document_type TEXT DEFAULT 'Otro',detected_email TEXT,detected_total TEXT,extracted_text TEXT,status TEXT DEFAULT 'Pendiente',created_by TEXT DEFAULT 'Usuario local',created_at TEXT,updated_at TEXT)"],
    ["deleted", "ALTER TABLE ocr_documents ADD COLUMN deleted TEXT DEFAULT '0'"],
    ["deleted_at", "ALTER TABLE ocr_documents ADD COLUMN deleted_at TEXT"],
    ["deleted_by", "ALTER TABLE ocr_documents ADD COLUMN deleted_by TEXT"],
  ],
  web_registrations: [
    ["table", "CREATE TABLE IF NOT EXISTS web_registrations(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL DEFAULT 'cliente',company_name TEXT NOT NULL,tax_id TEXT,contact_name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT,address TEXT,city TEXT,message TEXT,status TEXT NOT NULL DEFAULT 'Pendiente de validar',created_at TEXT,updated_at TEXT,reviewed_by TEXT,reviewed_at TEXT)"],
  ],
  purchase_requests: [
    ["table", "CREATE TABLE IF NOT EXISTS purchase_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE NOT NULL,request_type TEXT DEFAULT 'Solicitud de oferta',status TEXT DEFAULT 'Borrador',product_ids TEXT,supplier_ids TEXT,notes TEXT,created_by TEXT,validated_by TEXT,created_at TEXT,updated_at TEXT,public_token TEXT,channels TEXT,sent_at TEXT)"],
    ["public_token", "ALTER TABLE purchase_requests ADD COLUMN public_token TEXT"],
    ["channels", "ALTER TABLE purchase_requests ADD COLUMN channels TEXT"],
    ["sent_at", "ALTER TABLE purchase_requests ADD COLUMN sent_at TEXT"],
  ],
  purchase_request_offers: [
    ["table", "CREATE TABLE IF NOT EXISTS purchase_request_offers(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id INTEGER NOT NULL,supplier_id INTEGER,supplier_ref TEXT,contact_name TEXT,email TEXT,valid_until TEXT,delivery_days INTEGER DEFAULT 0,notes TEXT,lines_json TEXT NOT NULL,status TEXT DEFAULT 'Recibida',created_at TEXT,updated_at TEXT)"],
  ],
  order_lines: [
    ["incident_resolution", "ALTER TABLE order_lines ADD COLUMN incident_resolution TEXT"],
    ["incident_resolved_at", "ALTER TABLE order_lines ADD COLUMN incident_resolved_at TEXT"],
    ["incident_resolved_by", "ALTER TABLE order_lines ADD COLUMN incident_resolved_by TEXT"],
  ],
  notes: [
    ["status", "ALTER TABLE notes ADD COLUMN status TEXT DEFAULT 'Pendiente'"],
    ["resolution", "ALTER TABLE notes ADD COLUMN resolution TEXT"],
    ["resolved_at", "ALTER TABLE notes ADD COLUMN resolved_at TEXT"],
    ["resolved_by", "ALTER TABLE notes ADD COLUMN resolved_by TEXT"],
    ["created_by", "ALTER TABLE notes ADD COLUMN created_by TEXT"],
  ],
  orders: [
    ["source_order_id", "ALTER TABLE orders ADD COLUMN source_order_id INTEGER"],
  ],
  invoice_orders: [
    ["table", "CREATE TABLE IF NOT EXISTS invoice_orders(id INTEGER PRIMARY KEY AUTOINCREMENT,invoice_id INTEGER NOT NULL,order_id INTEGER NOT NULL,UNIQUE(invoice_id,order_id),UNIQUE(order_id))"],
  ],
  suppliers: [
    ["external_code", "ALTER TABLE suppliers ADD COLUMN external_code TEXT"],
    ["source_system", "ALTER TABLE suppliers ADD COLUMN source_system TEXT"],
    ["source_warehouse_code", "ALTER TABLE suppliers ADD COLUMN source_warehouse_code TEXT"],
    ["source_created_at", "ALTER TABLE suppliers ADD COLUMN source_created_at TEXT"],
    ["source_closed_at", "ALTER TABLE suppliers ADD COLUMN source_closed_at TEXT"],
    ["source_balance", "ALTER TABLE suppliers ADD COLUMN source_balance REAL DEFAULT 0"],
    ["source_overdue_balance", "ALTER TABLE suppliers ADD COLUMN source_overdue_balance REAL DEFAULT 0"],
    ["source_payments", "ALTER TABLE suppliers ADD COLUMN source_payments REAL DEFAULT 0"],
  ],
  clients: [
    ["external_code", "ALTER TABLE clients ADD COLUMN external_code TEXT"],
    ["source_system", "ALTER TABLE clients ADD COLUMN source_system TEXT"],
    ["active", "ALTER TABLE clients ADD COLUMN active INTEGER DEFAULT 1"],
    ["payment_method_code", "ALTER TABLE clients ADD COLUMN payment_method_code TEXT"],
    ["payment_terms_code", "ALTER TABLE clients ADD COLUMN payment_terms_code TEXT"],
    ["source_warehouse_code", "ALTER TABLE clients ADD COLUMN source_warehouse_code TEXT"],
    ["source_created_at", "ALTER TABLE clients ADD COLUMN source_created_at TEXT"],
    ["source_closed_at", "ALTER TABLE clients ADD COLUMN source_closed_at TEXT"],
    ["source_balance", "ALTER TABLE clients ADD COLUMN source_balance REAL DEFAULT 0"],
    ["source_overdue_balance", "ALTER TABLE clients ADD COLUMN source_overdue_balance REAL DEFAULT 0"],
    ["source_sales", "ALTER TABLE clients ADD COLUMN source_sales REAL DEFAULT 0"],
    ["source_payments", "ALTER TABLE clients ADD COLUMN source_payments REAL DEFAULT 0"],
  ],
  products: [
    ["external_code", "ALTER TABLE products ADD COLUMN external_code TEXT"],
    ["source_system", "ALTER TABLE products ADD COLUMN source_system TEXT"],
    ["active", "ALTER TABLE products ADD COLUMN active INTEGER DEFAULT 1"],
    ["source_type", "ALTER TABLE products ADD COLUMN source_type TEXT"],
    ["source_substitute", "ALTER TABLE products ADD COLUMN source_substitute TEXT"],
    ["assembly_item", "ALTER TABLE products ADD COLUMN assembly_item INTEGER DEFAULT 0"],
    ["cost_adjusted", "ALTER TABLE products ADD COLUMN cost_adjusted INTEGER DEFAULT 0"],
    ["default_split_template", "ALTER TABLE products ADD COLUMN default_split_template TEXT"],
    ["source_supplier_code", "ALTER TABLE products ADD COLUMN source_supplier_code TEXT"],
    ["source_created_at", "ALTER TABLE products ADD COLUMN source_created_at TEXT"],
    ["source_closed_at", "ALTER TABLE products ADD COLUMN source_closed_at TEXT"],
  ],
  inventory_movements: [
    ["created_by", "ALTER TABLE inventory_movements ADD COLUMN created_by TEXT"],
    ["receipt_id", "ALTER TABLE inventory_movements ADD COLUMN receipt_id INTEGER"],
  ],
  shipments: [
    ["collection_point_id", "ALTER TABLE shipments ADD COLUMN collection_point_id INTEGER"],
    ["origin_address", "ALTER TABLE shipments ADD COLUMN origin_address TEXT"],
    ["departure_at", "ALTER TABLE shipments ADD COLUMN departure_at TEXT"],
    ["delivery_window_start", "ALTER TABLE shipments ADD COLUMN delivery_window_start TEXT"],
    ["delivery_window_end", "ALTER TABLE shipments ADD COLUMN delivery_window_end TEXT"],
    ["notes", "ALTER TABLE shipments ADD COLUMN notes TEXT"],
    ["preparation_started_at", "ALTER TABLE shipments ADD COLUMN preparation_started_at TEXT"],
    ["preparation_started_by", "ALTER TABLE shipments ADD COLUMN preparation_started_by TEXT"],
    ["stock_released_at", "ALTER TABLE shipments ADD COLUMN stock_released_at TEXT"],
    ["stock_released_by", "ALTER TABLE shipments ADD COLUMN stock_released_by TEXT"],
    ["urgent", "ALTER TABLE shipments ADD COLUMN urgent INTEGER DEFAULT 0"],
  ],
  import_batches: [
    ["table", "CREATE TABLE IF NOT EXISTS import_batches(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE NOT NULL,source_system TEXT NOT NULL,source_file TEXT NOT NULL,entity TEXT NOT NULL,status TEXT DEFAULT 'Pendiente',rows_read INTEGER DEFAULT 0,rows_inserted INTEGER DEFAULT 0,rows_updated INTEGER DEFAULT 0,rows_skipped INTEGER DEFAULT 0,started_at TEXT,completed_at TEXT,notes TEXT,created_by TEXT DEFAULT 'Sistema',created_at TEXT)"],
    ["updated_at", "ALTER TABLE import_batches ADD COLUMN updated_at TEXT"],
    ["deleted", "ALTER TABLE import_batches ADD COLUMN deleted TEXT DEFAULT '0'"],
    ["deleted_at", "ALTER TABLE import_batches ADD COLUMN deleted_at TEXT"],
    ["deleted_by", "ALTER TABLE import_batches ADD COLUMN deleted_by TEXT"],
  ],
  import_records: [
    ["table", "CREATE TABLE IF NOT EXISTS import_records(id INTEGER PRIMARY KEY AUTOINCREMENT,batch_id INTEGER NOT NULL,entity TEXT NOT NULL,source_code TEXT,local_id INTEGER,action TEXT NOT NULL,payload_hash TEXT,source_file TEXT,notes TEXT,created_at TEXT)"],
    ["updated_at", "ALTER TABLE import_records ADD COLUMN updated_at TEXT"],
    ["deleted", "ALTER TABLE import_records ADD COLUMN deleted TEXT DEFAULT '0'"],
    ["deleted_at", "ALTER TABLE import_records ADD COLUMN deleted_at TEXT"],
    ["deleted_by", "ALTER TABLE import_records ADD COLUMN deleted_by TEXT"],
  ],
};
let applied = 0;
for (const [table, migrations] of Object.entries(migrationsByTable)) {
  const columns = new Set((await client.execute(`PRAGMA table_info(${table})`)).rows.map((row) => String(row.name)));
  for (const [column, sql] of migrations) {
    if (columns.has(column)) continue;
    await client.execute(sql);
    applied += 1;
  }
}
for (const sql of [
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_source_code ON suppliers(source_system, external_code)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_source_code ON clients(source_system, external_code)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_code ON products(source_system, external_code)",
  "CREATE INDEX IF NOT EXISTS idx_import_records_batch ON import_records(batch_id, entity, source_code)",
]) await client.execute(sql);
await client.execute("INSERT OR IGNORE INTO invoice_orders(invoice_id,order_id) SELECT id,order_id FROM invoices WHERE order_id IS NOT NULL");
await client.close();
console.log(`Remote schema ready: ${applied} migrations applied.`);
