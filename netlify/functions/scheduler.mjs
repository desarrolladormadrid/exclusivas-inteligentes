import api from "./api.mjs";

// Netlify ejecuta esta función una vez al día en lugar de mantener un proceso
// residente consumiendo CPU en cada instancia de la aplicación.
export const config = { schedule: "0 0 * * *" };

export default async function scheduler() {
  const secret = String(process.env.CRON_SECRET || "");
  const response = await api(new Request("https://netlify.local/api/scheduler/run", {
    method: "GET",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  }));
  if (!response.ok) throw new Error(`No se pudo ejecutar el planificador (${response.status})`);
  return { ok: true };
}
