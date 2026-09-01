import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const credentialFile = "C:\\Users\\luis.vazquez\\Desktop\\cluidinary.txt";
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "a3msu7ba";
const folder = process.env.CLOUDINARY_TEST_FOLDER || "exclusivas-inteligentes/test/productos-optimizados";
const files = ["beer-test.webp", "vermouth-test.webp", "gin-test.webp"].map((name) => path.join(projectRoot, "tests", "fixtures", "cloudinary", "optimized", name));

if (!fs.existsSync(credentialFile)) throw new Error(`No existe el archivo ${credentialFile}`);
const credentialText = fs.readFileSync(credentialFile, "utf8");
const apiKey = process.env.CLOUDINARY_API_KEY || credentialText.match(/^\s*API\s+Key\s+(\S+)\s*$/im)?.[1];
const apiSecret = process.env.CLOUDINARY_API_SECRET || credentialText.match(/^\s*API\s+Secret\s+(\S+)\s*$/im)?.[1];
if (!cloudName || !apiKey || !apiSecret) throw new Error("Faltan CLOUDINARY_CLOUD_NAME, API Key o API Secret");

async function checkDelivery(publicId, transformation) {
  const url = `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}.webp`;
  const response = await fetch(url, { method: "HEAD" });
  return { url, status: response.status, ok: response.ok };
}

const uploaded = [];
for (const filePath of files) {
  if (!fs.existsSync(filePath)) throw new Error(`No existe ${filePath}`);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(filePath)], { type: "image/webp" }), path.basename(filePath));
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path.basename(filePath)}: ${body.error?.message || response.status}`);

  const thumbnail = await checkDelivery(body.public_id, "c_fill,w_320,h_320,f_auto,q_auto");
  const web = await checkDelivery(body.public_id, "c_limit,w_1600,f_auto,q_auto");
  if (!thumbnail.ok || !web.ok) throw new Error(`${path.basename(filePath)}: la entrega optimizada no responde correctamente`);
  uploaded.push({
    file: path.basename(filePath),
    public_id: body.public_id,
    secure_url: body.secure_url,
    bytes: body.bytes,
    width: body.width,
    height: body.height,
    format: body.format,
    thumbnail,
    web,
  });
}

console.log(JSON.stringify({ ok: true, cloud_name: cloudName, folder, uploaded }, null, 2));
