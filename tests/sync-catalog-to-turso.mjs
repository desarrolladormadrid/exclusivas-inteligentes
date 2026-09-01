import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

function readEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}
function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
async function main() {
  const env = readEnv();
  const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  for (const column of [
    "photo_url TEXT", "photo_public_id TEXT", "photo_thumbnail_url TEXT", "photo_web_url TEXT",
    "photo_bytes INTEGER DEFAULT 0", "photo_width INTEGER DEFAULT 0", "photo_height INTEGER DEFAULT 0", "photo_format TEXT",
  ]) {
    try { await client.execute(`ALTER TABLE products ADD COLUMN ${column}`); } catch {}
  }
  const localRows = await (await fetch("http://127.0.0.1:3001/api/products?view=lookup&limit=1000")).json();
  const remoteRows = (await client.execute("SELECT id,name FROM products WHERE COALESCE(deleted,0)=0")).rows;
  const localByName = new Map(localRows.filter((row) => row.photo_url).map((row) => [normalized(row.name), row]));
  let linked = 0;
  for (const row of remoteRows) {
    const source = localByName.get(normalized(row.name));
    if (!source) continue;
    await client.execute({
      sql: "UPDATE products SET photo_url=?,photo_public_id=?,photo_thumbnail_url=?,photo_web_url=?,photo_bytes=?,photo_width=?,photo_height=?,photo_format=? WHERE id=?",
      args: [source.photo_url, source.photo_public_id, source.photo_thumbnail_url, source.photo_web_url, source.photo_bytes || 0, source.photo_width || 0, source.photo_height || 0, source.photo_format || "webp", row.id],
    });
    linked += 1;
  }
  const result = await client.execute("SELECT COUNT(*) total, SUM(CASE WHEN photo_thumbnail_url IS NOT NULL AND photo_thumbnail_url<>'' THEN 1 ELSE 0 END) with_images FROM products WHERE COALESCE(deleted,0)=0");
  console.log(JSON.stringify({ linked, total: Number(result.rows[0].total), with_images: Number(result.rows[0].with_images || 0) }));
  client.close();
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
