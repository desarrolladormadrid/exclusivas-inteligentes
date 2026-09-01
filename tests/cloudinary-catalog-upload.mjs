import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
const fixtureDir = join(root, "tests", "fixtures", "cloudinary", "catalog-optimized");
const credentialPath = "C:\\Users\\luis.vazquez\\Desktop\\cluidinary.txt";
const apiBase = process.env.CATALOG_API_BASE || "http://127.0.0.1:3001/api";
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "a3msu7ba";

const catalog = [
  ["Agua Exclusivas 01", "catalog-agua-exclusivas-01.webp"],
  ["Agua Exclusivas 06", "catalog-agua-exclusivas-06.webp"],
  ["Agua Fuente Alta 33 cl", "catalog-agua-fuente-alta-33cl.webp"],
  ["Agua Fuente Alta 5 L", "catalog-agua-fuente-alta-5l.webp"],
  ["Agua mineral 1,5L · Pack 6", "catalog-agua-mineral-pack-6.webp"],
  ["Agua Sierra Clara 1,5 L", "catalog-agua-sierra-clara-15l.webp"],
  ["Agua Sierra Clara 50 cl", "catalog-agua-sierra-clara-50cl.webp"],
  ["Agua Sierra Clara con gas", "catalog-agua-sierra-clara-con-gas.webp"],
  ["Agua Tónica Mediterránea", "catalog-agua-tonica-mediterranea.webp"],
  ["Bebida Isotónica Limón", "catalog-isotonica-limon.webp"],
  ["Bebida Isotónica Naranja", "catalog-isotonica-naranja.webp"],
  ["Cava Brut Nature", "catalog-cava-brut-nature.webp"],
  ["Cerveza Artesana Lager", "catalog-cerveza-artesana-lager.webp"],
  ["Cerveza lager · Caja 24", "catalog-cerveza-lager-caja-24.webp"],
  ["Cerveza Rubia 0,0%", "catalog-cerveza-rubia-00.webp"],
  ["Cerveza Rubia 33 cl", "catalog-cerveza-rubia-33cl.webp"],
  ["Cerveza Sin Filtrar 50 cl", "catalog-cerveza-sin-filtrar-50cl.webp"],
  ["Cerveza Tostada 33 cl", "catalog-cerveza-tostada-33cl.webp"],
  ["Cervezas Exclusivas 03", "catalog-cervezas-exclusivas-03.webp"],
  ["Cervezas Exclusivas 08", "catalog-cervezas-exclusivas-08.webp"],
  ["Cola Original 2 L", "catalog-cola-original-2l.webp"],
  ["Cola Original 33 cl", "catalog-cola-original-33cl.webp"],
  ["Ginger Ale Select 20 cl", "catalog-ginger-ale-select-20cl.webp"],
  ["Limón Refrescante 33 cl", "catalog-limon-refrescante-33cl.webp"],
  ["Naranja Refrescante 33 cl", "catalog-naranja-refrescante-33cl.webp"],
  ["Néctar Melocotón 1 L", "catalog-nectar-melocoton-1l.webp"],
  ["Refresco cola 33cl · Caja 24", "catalog-refresco-cola-caja-24.webp"],
  ["Refrescos Exclusivas 02", "catalog-refrescos-exclusivas-02.webp"],
  ["Refrescos Exclusivas 07", "catalog-refrescos-exclusivas-07.webp"],
  ["Sangría Selección 1 L", "catalog-sangria-seleccion-1l.webp"],
  ["Tónica premium · Caja 24", "catalog-tonica-premium-caja-24.webp"],
  ["Tónica Premium 1 L", "catalog-tonica-premium-1l.webp"],
  ["Tónica Premium 20 cl", "catalog-tonica-premium-20cl.webp"],
  ["Vermut Rojo Reserva", "catalog-vermut-rojo-reserva.webp"],
  ["Vino Blanco Verdejo", "catalog-vino-blanco-verdejo.webp"],
  ["Vino Rosado Navarra", "catalog-vino-rosado-navarra.webp"],
  ["Vino Tinto Crianza Rioja", "catalog-vino-tinto-crianza-rioja.webp"],
  ["Vino tinto Rioja · Caja 6", "catalog-vino-tinto-rioja-caja-6.webp"],
  ["Vino Tinto Roble Ribera", "catalog-vino-tinto-roble-ribera.webp"],
  ["Vinos Exclusivas 04", "catalog-vinos-exclusivas-04.webp"],
  ["Vinos Exclusivas 09", "catalog-vinos-exclusivas-09.webp"],
  ["Zumo de Naranja 1 L", "catalog-zumo-naranja-1l.webp"],
  ["Zumo de Piña 1 L", "catalog-zumo-pina-1l.webp"],
  ["Zumo naranja 1L · Caja 12", "catalog-zumo-naranja-caja-12.webp"],
  ["Zumos Exclusivas 05", "catalog-zumos-exclusivas-05.webp"],
  ["Zumos Exclusivas 10", "catalog-zumos-exclusivas-10.webp"],
];

function slugify(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function credentials() {
  const contents = readFileSync(credentialPath, "utf8");
  const key = contents.match(/API\s*Key\s*[:=]?\s*(\S+)/i)?.[1];
  const secret = contents.match(/API\s*Secret\s*[:=]?\s*(\S+)/i)?.[1];
  if (!key || !secret) throw new Error("No se han encontrado las credenciales de Cloudinary en el archivo configurado.");
  return { key, secret };
}
function transformed(url, transformation) {
  return String(url).replace("/image/upload/", `/image/upload/${transformation}/`);
}
async function upload(fileName, productName, key, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "exclusivas-inteligentes/productos";
  const publicId = `producto-${slugify(productName)}`;
  const params = { folder, public_id: publicId, timestamp };
  const signature = createHash("sha1").update(`${Object.keys(params).sort().map((name) => `${name}=${params[name]}`).join("&")}${secret}`).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([readFileSync(join(fixtureDir, fileName))], { type: "image/webp" }), basename(fileName));
  form.append("api_key", key);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.secure_url) throw new Error(body?.error?.message || `Falló la subida de ${productName}`);
  return {
    photo_url: body.secure_url,
    photo_public_id: body.public_id || publicId,
    photo_thumbnail_url: transformed(body.secure_url, "c_fill,w_320,h_320,f_auto,q_auto"),
    photo_web_url: transformed(body.secure_url, "c_limit,w_1600,f_auto,q_auto"),
    photo_bytes: Number(body.bytes || 0),
    photo_width: Number(body.width || 0),
    photo_height: Number(body.height || 0),
    photo_format: String(body.format || "webp"),
  };
}
async function main() {
  const { key, secret } = credentials();
  const productsResponse = await fetch(`${apiBase}/products?view=lookup&limit=1000`);
  if (!productsResponse.ok) throw new Error(`No se pudo consultar el catálogo (${productsResponse.status}).`);
  const products = await productsResponse.json();
  let linked = 0;
  for (const [name, fileName] of catalog) {
    const matches = products.filter((product) => normalized(product.name) === normalized(name));
    if (!matches.length) throw new Error(`No se encontró en la base de datos: ${name}`);
    const uploaded = await upload(fileName, name, key, secret);
    for (const product of matches) {
      const response = await fetch(`${apiBase}/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Actor": "Catalogo Cloudinary" },
        body: JSON.stringify({ ...uploaded, photo_name: fileName, photo_mime: "image/webp" }),
      });
      if (!response.ok) throw new Error(`No se pudo asociar la imagen a ${name} (#${product.id}).`);
      linked += 1;
    }
    console.log(`${name}: ${matches.length} registro(s) asociado(s)`);
  }
  console.log(`Catálogo completado: ${catalog.length} imágenes, ${linked} registros asociados.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
