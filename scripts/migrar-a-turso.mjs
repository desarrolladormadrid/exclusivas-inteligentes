import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

function loadEnv(path) {
  const result = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) result[match[1]] = match[2].trim();
  }
  return result;
}

const root = process.cwd();
const env = loadEnv(join(root, ".env.local"));
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error("Faltan las credenciales de Turso en .env.local");
const localPath = join(root, "data", "excluvas.sqlite");
if (!existsSync(localPath)) throw new Error(`No existe la base local: ${localPath}`);

const backupDir = join(root, "data", "backups");
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
const backupPath = join(backupDir, `excluvas-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`);
copyFileSync(localPath, backupPath);

const remote = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const local = new DatabaseSync(localPath);
const quote = (name) => `"${String(name).replaceAll('"', '""')}"`;
const remoteObjects = await remote.execute("SELECT name, type FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name");
if (remoteObjects.rows.length && !process.argv.includes("--forzar")) {
  throw new Error(`La base remota ya contiene ${remoteObjects.rows.length} objetos. Usa --forzar solo si quieres reemplazar datos.`);
}

if (process.argv.includes("--forzar") && remoteObjects.rows.length) {
  const objects = remoteObjects.rows
    .filter((row) => row.type === "table" || row.type === "view")
    .map((row) => `DROP ${row.type.toUpperCase()} IF EXISTS ${quote(row.name)}`);
  for (const sql of objects) await remote.execute(sql);
}

const schemas = local.prepare("SELECT name, type, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'index' THEN 2 WHEN 'trigger' THEN 3 ELSE 4 END, name").all();
const tables = schemas.filter((item) => item.type === "table");
const indexesAndTriggers = schemas.filter((item) => item.type !== "table");
for (const item of tables) await remote.execute(String(item.sql));

let totalRows = 0;
for (const table of tables) {
  const columns = local.prepare(`PRAGMA table_info(${quote(table.name)})`).all().map((column) => column.name);
  if (!columns.length) continue;
  const rows = local.prepare(`SELECT * FROM ${quote(table.name)}`).all();
  const sql = `INSERT INTO ${quote(table.name)} (${columns.map(quote).join(",")}) VALUES (${columns.map(() => "?").join(",")})`;
  console.log(`Migrando ${table.name}: ${rows.length} registros`);
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500).map((row) => ({ sql, args: columns.map((column) => row[column] ?? null) }));
    await remote.batch(batch, "write");
  }
  console.log(`Completada ${table.name}`);
  totalRows += rows.length;
}
for (const item of indexesAndTriggers) {
  try { await remote.execute(String(item.sql)); } catch (error) { console.warn(`Aviso: no se pudo crear ${item.type} ${item.name}: ${error.message}`); }
}

local.close();
console.log(JSON.stringify({ ok: true, tables: tables.length, rows: totalRows, backup: backupPath }));
