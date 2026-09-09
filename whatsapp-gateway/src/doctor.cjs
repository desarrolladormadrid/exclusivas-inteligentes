require("dotenv").config();

const config = require("./config.cjs");

async function main() {
  console.log(`Node: ${process.version}`);
  console.log(`Sesión OpenWA: ${config.sessionId}`);
  console.log(`CRM API: ${config.crmApiBaseUrl}`);
  const response = await fetch(`${config.crmApiBaseUrl}/clients`);
  if (!response.ok) throw new Error(`El CRM no responde correctamente: ${response.status}`);
  const clients = await response.json();
  console.log(`CRM OK · clientes disponibles: ${Array.isArray(clients) ? clients.length : 0}`);
}

main().catch((error) => { console.error(`Diagnóstico fallido: ${error.message}`); process.exitCode = 1; });
