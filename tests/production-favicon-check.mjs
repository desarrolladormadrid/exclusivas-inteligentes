const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const response = await fetch(`${baseUrl}/favicon.svg?v=2.0.13`);
const body = await response.text();
if (!response.ok) throw new Error(`El favicon no responde correctamente: HTTP ${response.status}`);
if (!response.headers.get("content-type")?.includes("image/svg+xml")) throw new Error(`El favicon no devuelve SVG: ${response.headers.get("content-type") || "sin tipo"}`);
if (!body.includes("#B91C1C") || !body.includes('fill="white"')) throw new Error("El favicon no contiene la identidad corporativa esperada");
console.log(`PASS favicon: ${response.status} · SVG corporativo servido`);
