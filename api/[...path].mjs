import { crmApiHandler } from "./crm-api.mjs";

// Vercel necesita una función catch-all para conservar las rutas /api/*
// (por ejemplo /api/orders) y no enviarlas al render de la aplicación.
export default function apiCatchAll(req, res) {
  return crmApiHandler(req, res);
}
