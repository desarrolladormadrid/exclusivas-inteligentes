import http from "node:http";

// El lanzador de escritorio debe probar el mismo contrato que producción,
// pero contra la copia SQLite del equipo y nunca contra Turso.
process.env.DATABASE_MODE = "local";
const { crmApiHandler } = await import("./api/crm-api.mjs");

http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Actor",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    });
    return res.end();
  }
  return crmApiHandler(req, res);
}).listen(3001, "127.0.0.1", () => {
  console.log("Excluvas API local (SQLite, mismo contrato que producción) en http://localhost:3001");
});
