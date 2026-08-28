import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator > 0) env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error("Faltan las credenciales de Turso en .env.local");

const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const tables = ["suppliers", "clients", "products", "product_suppliers", "product_price_history", "inventory_movements", "orders", "order_lines", "shipments", "notes", "audit_logs", "collection_points"];
const backup = { captured_at: new Date().toISOString(), base_url: "https://exclusivas-inteligentes.vercel.app", purpose: "Restore point before importing real master data", tables: {} };
for (const table of tables) {
  const exists = await client.execute({ sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?", args: [table] });
  if (!exists.rows.length) continue;
  const columns = (await client.execute(`PRAGMA table_info(${table})`)).rows.map((row) => String(row.name));
  const excluded = new Set(["photo_data", "attachment_data", "media_data"]);
  const selected = columns.filter((column) => !excluded.has(column)).map((column) => `"${column.replaceAll('"', '""')}"`).join(",");
  backup.tables[table] = (await client.execute(`SELECT ${selected} FROM ${table}`)).rows;
}
await client.close();
const backupDir = path.join(process.cwd(), "data", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = backup.captured_at.replace(/[:.]/g, "-");
const outputPath = path.join(backupDir, `production-before-real-master-data-${stamp}.json`);
fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, outputPath, counts: Object.fromEntries(Object.entries(backup.tables).map(([table, rows]) => [table, rows.length])) }, null, 2));
