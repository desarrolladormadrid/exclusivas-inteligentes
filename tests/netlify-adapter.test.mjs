import assert from "node:assert/strict";
import test from "node:test";
import api from "../netlify/functions/api.mjs";
import app from "../netlify/functions/app.mjs";

test("el adaptador de Netlify conserva la preflight de la API", async () => {
  const response = await api(new Request("https://example.net/api/health", { method: "OPTIONS" }));
  assert.equal(response.status, 204);
  assert.match(response.headers.get("access-control-allow-methods") || "", /GET/);
});

test("la función de aplicación renderiza una ruta del CRM", async () => {
  const response = await app(new Request("https://example.net/crm"), {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
});
