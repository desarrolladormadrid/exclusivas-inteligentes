import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const db = new DatabaseSync(join(process.cwd(), "data", "excluvas.sqlite"));
const run = (sql, ...values) => db.prepare(sql).run(...values);
const all = (sql, ...values) => db.prepare(sql).all(...values);
const isoDate = (month, day) => `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const now = "2026-08-20T19:30:00.000Z";

if (Number(db.prepare("SELECT COUNT(*) n FROM expenses WHERE code LIKE 'GAS-H6-%'").get().n)) {
  console.log("Los gastos de seis meses ya están cargados; no se han duplicado registros.");
  process.exit(0);
}

const clients = all("SELECT id,name FROM clients ORDER BY id");
const vendors = [
  ["Estación Repsol Vallecas", "Combustible", "Tarjeta"],
  ["Parking Centro Madrid", "Aparcamiento", "Tarjeta"],
  ["Restaurante La Plaza", "Gastos de representación", "Tarjeta"],
  ["Papelería Central", "Material", "Transferencia"],
  ["Área de Servicio La Mancha", "Combustible", "Tarjeta"],
  ["Cafetería El Mercado", "Comida", "Efectivo"],
];

db.exec("BEGIN");
try {
  let created = 0;
  for (let month = 3; month <= 8; month++) {
    for (let index = 0; index < 6; index++) {
      const [vendor, category, paymentMethod] = vendors[(month + index) % vendors.length];
      const date = isoDate(month, Math.min(26, 3 + index * 4));
      const amount = Number((24 + ((month * 13 + index * 17) % 145) + (index % 2 ? 0.5 : 0)).toFixed(2));
      const client = index === 5 ? null : clients[(month + index * 2) % clients.length];
      const code = `GAS-H6-${month}${String(index + 1).padStart(2, "0")}`;
      const notes = client
        ? `Gasto operativo relacionado con la visita y servicio a ${client.name}.`
        : "Gasto general de funcionamiento de la empresa.";
      run(
        "INSERT INTO expenses(code,client_id,expense_date,category,vendor,amount,vat,payment_method,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        code,
        client?.id || null,
        date,
        category,
        vendor,
        amount,
        category === "Combustible" ? 21 : 10,
        paymentMethod,
        notes,
        `${date}T18:00:00.000Z`,
        now,
      );
      created += 1;
    }
  }
  run(
    "INSERT INTO audit_logs(actor,method,resource,action,details,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
    "Luis",
    "POST",
    "expenses",
    "Carga histórica",
    `${created} gastos operativos generados para el periodo marzo-agosto de 2026`,
    now,
    now,
  );
  db.exec("COMMIT");
  console.log(JSON.stringify({ ok: true, gastos_creados: created, periodo: "2026-03-01 a 2026-08-20", vinculados_a_cliente: created - 6, generales: 6 }));
} catch (error) {
  db.exec("ROLLBACK");
  console.error(error);
  process.exitCode = 1;
}
