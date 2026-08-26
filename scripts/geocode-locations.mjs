import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const env = join(root, ".env.local");
if (existsSync(env)) for (const line of readFileSync(env, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const db = new DatabaseSync(join(root, "data", "excluvas.sqlite"));
for (const sql of ["ALTER TABLE collection_points ADD COLUMN latitude REAL", "ALTER TABLE collection_points ADD COLUMN longitude REAL", "ALTER TABLE collection_points ADD COLUMN geocoded_at TEXT", "ALTER TABLE collection_points ADD COLUMN geocoding_status TEXT DEFAULT 'Pendiente'"]) { try { db.exec(sql); } catch {} }
const rows = db.prepare("SELECT * FROM collection_points WHERE COALESCE(latitude,'')='' OR COALESCE(longitude,'')=''").all();
let ok = 0, failed = 0;
for (const row of rows) {
  const q = encodeURIComponent([row.address, row.city, "España"].filter(Boolean).join(", "));
  let result = [];
  try { const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${q}`, { headers: { "User-Agent": "Excluvas-CRM-geocoder/1.0" } }); result = await response.json(); } catch {}
  const now = new Date().toISOString();
  if (Array.isArray(result) && result[0]) {
    db.prepare("UPDATE collection_points SET latitude=?, longitude=?, geocoded_at=?, geocoding_status=? WHERE id=?").run(Number(result[0].lat), Number(result[0].lon), now, "Geolocalizada", row.id); ok++;
  } else { db.prepare("UPDATE collection_points SET geocoded_at=?, geocoding_status=? WHERE id=?").run(now, "Revisión manual", row.id); failed++; }
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
console.log(JSON.stringify({ total: rows.length, geolocalizadas: ok, revision_manual: failed }));
