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
  ocr_documents: [
    ["table", "CREATE TABLE IF NOT EXISTS ocr_documents(id INTEGER PRIMARY KEY AUTOINCREMENT,file_name TEXT NOT NULL,mime_type TEXT,file_size INTEGER DEFAULT 0,document_type TEXT DEFAULT 'Otro',detected_email TEXT,detected_total TEXT,extracted_text TEXT,status TEXT DEFAULT 'Pendiente',created_by TEXT DEFAULT 'Usuario local',created_at TEXT,updated_at TEXT)"],
    ["deleted", "ALTER TABLE ocr_documents ADD COLUMN deleted TEXT DEFAULT '0'"],
    ["deleted_at", "ALTER TABLE ocr_documents ADD COLUMN deleted_at TEXT"],
    ["deleted_by", "ALTER TABLE ocr_documents ADD COLUMN deleted_by TEXT"],
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
  ],
  orders: [
    ["source_order_id", "ALTER TABLE orders ADD COLUMN source_order_id INTEGER"],
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
await client.close();
console.log(`Remote schema ready: ${applied} migrations applied.`);
