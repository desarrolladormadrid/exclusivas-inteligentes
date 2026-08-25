import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const db = new DatabaseSync(join(process.cwd(), "data", "excluvas.sqlite"));
const now = new Date("2026-08-20T12:00:00.000Z");
const start = new Date("2026-03-01T08:00:00.000Z");
const iso = (month, day, hour = 10) => new Date(Date.UTC(2026, 2 + month, day, hour, 0, 0)).toISOString();
const add = (sql, ...values) => db.prepare(sql).run(...values);
const get = (sql, ...values) => db.prepare(sql).get(...values);
const existing = get("SELECT COUNT(*) n FROM clients WHERE name LIKE 'Histórico · %'").n;
if (existing) {
  console.log("El histórico de seis meses ya está cargado; no se han duplicado registros.");
  process.exit(0);
}

db.exec("BEGIN");
try {
  const clients = [
    ["Bodega La Encina", "911 204 381", "compras@bodegalaencina.es", "Calle Toledo 44", "Madrid", "Pago a 30 días", 4500, 40.408, -3.704],
    ["Café Central", "911 348 290", "pedidos@cafecentral.es", "Plaza Mayor 7", "Madrid", "Pago a 15 días", 2500, 40.416, -3.703],
    ["Grupo Eventos Sabor", "918 502 117", "operaciones@eventossabor.es", "Calle Arenal 18", "Madrid", "Pago a 30 días", 8000, 40.418, -3.710],
    ["Restaurante El Olivo", "916 772 145", "administracion@elolivo.es", "Av. de Europa 22", "Pozuelo", "Pago a 30 días", 5000, 40.435, -3.813],
    ["Hotel La Castellana", "915 441 883", "compras@hotelcastellana.es", "Paseo de la Castellana 91", "Madrid", "Pago a 45 días", 12000, 40.449, -3.691],
    ["Terraza La Plaza", "913 889 204", "pedidos@terrazalaplaza.es", "Calle Alcalá 126", "Madrid", "Pago a 15 días", 3000, 40.421, -3.675],
    ["Catering Horizonte", "916 214 778", "compras@cateringhorizonte.es", "Calle Río 8", "Getafe", "Pago a 30 días", 6500, 40.308, -3.732],
    ["Bar La Estación", "916 890 330", "barlaestacion@correo.es", "Av. de la Estación 3", "Leganés", "Contado", 1500, 40.327, -3.764],
    ["Club Deportivo Norte", "915 672 090", "gestion@clubnorte.es", "Calle del Deporte 12", "Alcobendas", "Pago a 30 días", 3500, 40.546, -3.642],
    ["Mercado San Isidro", "914 012 665", "hosteleria@mercadosanisidro.es", "Calle San Isidro 5", "Madrid", "Pago a 15 días", 2800, 40.394, -3.709],
  ];
  const clientIds = clients.map((c, i) => { const id = add("INSERT INTO clients(name,phone,email,address,created_at,tax_id,contact,city,payment_terms,credit_limit,latitude,longitude,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", ...c.slice(0, 4), iso(Math.floor(i / 2), 4 + i), `B${20260000 + i}`, "Responsable de compras", ...c.slice(4), iso(5, 18)); return Number(id.lastInsertRowid); });

  const suppliers = [
    ["Distribuciones Levante", "961 220 184", "comercial@levante.es", "Polígono La Ribera 4", "B46000111", "Marta Ruiz", "Pago a 30 días"],
    ["Cervezas del Centro", "913 440 218", "pedidos@cervezascentro.es", "Calle Industria 16", "B28000222", "Álvaro Sanz", "Pago a 45 días"],
    ["Vinos Selección Ibérica", "941 888 302", "ventas@seleccioniberica.es", "Carretera de Logroño 8", "B26000333", "Nuria Gil", "Pago a 30 días"],
    ["Refrescos y Zumos Nacionales", "934 721 990", "clientes@refrescosnacionales.es", "Av. del Vallès 18", "B08000444", "Pablo León", "Pago a 30 días"],
    ["Aguas de la Sierra", "927 331 109", "comercial@aguassierra.es", "Camino del Manantial 2", "B10000555", "Lucía Martín", "Pago a 15 días"],
  ];
  const supplierIds = suppliers.map((s, i) => Number(add("INSERT INTO suppliers(name,phone,email,address,tax_id,contact,payment_terms,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", ...s, iso(0, 3 + i), iso(5, 18)).lastInsertRowid));

  const warehouses = [
    ["Almacén Centro", "Calle Logística 10, Madrid", "MAD-CEN", "Luis"],
    ["Almacén Sur", "Calle Transporte 6, Getafe", "MAD-SUR", "Jose"],
    ["Cámara refrigerada", "Calle Frío 2, Madrid", "MAD-FRIO", "Luis"],
  ];
  const warehouseIds = warehouses.map((w, i) => Number(add("INSERT INTO warehouses(name,address,code,manager,created_at,updated_at) VALUES(?,?,?,?,?,?)", ...w, iso(0, 2 + i), iso(5, 18)).lastInsertRowid));

  const points = [
    ["HIST-REC-01", "Muelle Centro", "Calle Logística 10", "Madrid", "José Martín", "911 100 201", "muelle.centro@exclusivas.local", "L-V 07:00-15:00", "Recepción de mercancía seca"],
    ["HIST-REC-02", "Plataforma Sur", "Calle Transporte 6", "Getafe", "Ana López", "916 100 202", "plataforma.sur@exclusivas.local", "L-V 08:00-16:00", "Acceso por puerta 3"],
    ["HIST-REC-03", "Cámara refrigerada", "Calle Frío 2", "Madrid", "David Pérez", "911 100 203", "frio@exclusivas.local", "L-S 06:00-14:00", "Revisar temperatura al descargar"],
  ];
  const pointIds = points.map((p) => Number(add("INSERT INTO collection_points(code,name,address,city,contact,phone,email,opening_hours,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ...p, iso(0, 5), iso(5, 18)).lastInsertRowid));

  const families = [["Aguas", "Aguas del Sur"], ["Refrescos", "Refrescos Nacionales"], ["Cervezas", "Cervezas del Centro"], ["Vinos", "Vinos Ibéricos"], ["Zumos", "Zumos Naturales"], ["Tónicas", "Bebidas Premium"]];
  const productIds = [];
  for (let i = 0; i < 30; i++) {
    const [category, brand] = families[i % families.length];
    const cost = Number((1.25 + (i % 9) * 1.17).toFixed(2));
    const price = Number((cost * (1.28 + (i % 4) * 0.08)).toFixed(2));
    const stock = 20 + (i % 7) * 9;
    const id = add("INSERT INTO products(name,unit_price,stock,sku,category,brand,format,cost_price,vat,min_stock,supplier_id,barcode,supplier_ref,unit,units_per_case,stock_reserved,markup_percent,margin_percent,created_at,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", `Histórico · ${category} ${String(i + 1).padStart(2, "0")}`, price, stock, `HIST-${category.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`, category, brand, i % 2 ? "Botella 1L" : "Caja 24 unidades", cost, 21, 12 + (i % 5) * 6, supplierIds[i % supplierIds.length], `84${String(100000000 + i).slice(-9)}`, `REF-${2026000 + i}`, "caja", i % 2 ? 12 : 24, 0, Number(((price / cost - 1) * 100).toFixed(1)), Number(((price - cost) / price * 100).toFixed(1)), iso(Math.floor(i / 6), 2 + i % 7), i % 2 ? "Luis" : "Jose", iso(5, 18));
    productIds.push(Number(id.lastInsertRowid));
  }

  const addAudit = (actor, method, resource, action, details, created) => add("INSERT INTO audit_logs(actor,method,resource,action,details,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", actor, method, resource, action, details, created, created);
  const addMovement = (productId, warehouseId, type, quantity, reference, date, notes) => add("INSERT INTO inventory_movements(product_id,warehouse_id,movement_type,quantity,reference,movement_date,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", productId, warehouseId, type, quantity, reference, date.slice(0, 10), notes, date, date);

  for (let m = 0; m < 6; m++) {
    for (let j = 0; j < 3; j++) {
      const supplierId = supplierIds[(m + j) % supplierIds.length];
      const orderDate = iso(m, 3 + j * 7);
      const received = m < 5 || j === 0;
      const code = `HIST-COMP-${String(m + 1).padStart(2, "0")}-${j + 1}`;
      const lineProduct = productIds[(m * 5 + j * 3) % productIds.length];
      const lineProduct2 = productIds[(m * 5 + j * 3 + 1) % productIds.length];
      const qty = 32 + ((m + j) % 4) * 12;
      const qty2 = 18 + ((m + j) % 3) * 8;
      const cost = Number(get("SELECT cost_price FROM products WHERE id=?", lineProduct).cost_price);
      const amount = Number((qty * cost + qty2 * Number(get("SELECT cost_price FROM products WHERE id=?", lineProduct2).cost_price)).toFixed(2));
      const purchaseId = Number(add("INSERT INTO purchase_orders(code,supplier_id,status,order_date,expected_date,amount,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", code, supplierId, received ? "Recibida" : "En tránsito", orderDate.slice(0, 10), iso(m, 8).slice(0, 10), amount, "Reposición mensual de bebidas", orderDate, iso(5, 18)).lastInsertRowid);
      add("INSERT INTO purchase_order_lines(purchase_order_id,product_id,quantity,unit_cost,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", purchaseId, lineProduct, qty, cost, qty * cost, orderDate, orderDate);
      add("INSERT INTO purchase_order_lines(purchase_order_id,product_id,quantity,unit_cost,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", purchaseId, lineProduct2, qty2, Number(get("SELECT cost_price FROM products WHERE id=?", lineProduct2).cost_price), qty2 * Number(get("SELECT cost_price FROM products WHERE id=?", lineProduct2).cost_price), orderDate, orderDate);
      if (received) { addMovement(lineProduct, warehouseIds[j % warehouseIds.length], "Entrada", qty, code, orderDate, "Recepción de compra"); addMovement(lineProduct2, warehouseIds[j % warehouseIds.length], "Entrada", qty2, code, orderDate, "Recepción de compra"); }
      addAudit("Luis", "POST", `purchase_orders/${purchaseId}`, "Alta", `${code} · compra a proveedor`, orderDate);
    }
  }

  let invoiceNumber = 1, deliveryNumber = 1, shipmentNumber = 1;
  for (let m = 0; m < 6; m++) {
    for (let j = 0; j < 9; j++) {
      const created = iso(m, 5 + (j % 20), 9 + (j % 7));
      const clientId = clientIds[(m * 2 + j) % clientIds.length];
      const productId = productIds[(m * 4 + j * 2) % productIds.length];
      const product = get("SELECT unit_price,cost_price FROM products WHERE id=?", productId);
      const quantity = 4 + ((m + j) % 8) * 2;
      const amount = Number((quantity * Number(product.unit_price)).toFixed(2));
      const ageStatus = m <= 1 ? "Entregado" : m === 2 ? (j % 4 ? "Enviado" : "Entregado") : m === 3 ? (j % 3 ? "En reparto" : "Preparado") : m === 4 ? (j % 3 ? "Pendiente" : "Preparando") : (j % 4 ? "Pendiente" : "Confirmado");
      const code = `HIST-PED-${String(m + 3).padStart(2, "0")}${String(j + 1).padStart(2, "0")}`;
      const orderId = Number(add("INSERT INTO orders(code,client_id,amount,status,created_at,product_id,quantity,unit_price,discount,delivery_date,notes,updated_at,collection_point_id,prepared_by,shipped_by,delivered_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", code, clientId, amount, ageStatus, created, productId, quantity, product.unit_price, j % 5 === 0 ? 3 : 0, iso(m, 7).slice(0, 10), j % 4 === 0 ? "Entrega coordinada con el cliente" : "Pedido recurrente de hostelería", ageStatus === "Entregado" ? created : iso(5, 18), pointIds[j % pointIds.length], j % 2 ? "Luis" : "Jose", ["Enviado", "Entregado", "En reparto"].includes(ageStatus) ? (j % 2 ? "Luis" : "Jose") : null, ageStatus === "Entregado" ? "Luis" : null).lastInsertRowid);
      add("INSERT INTO order_lines(order_id,product_id,quantity,unit_price,discount,vat,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", orderId, productId, quantity, product.unit_price, j % 5 === 0 ? 3 : 0, 21, amount, created, created);
      if (j % 3 === 0) { const second = productIds[(m * 4 + j * 2 + 1) % productIds.length]; const secondProduct = get("SELECT unit_price FROM products WHERE id=?", second); add("INSERT INTO order_lines(order_id,product_id,quantity,unit_price,discount,vat,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", orderId, second, 3, secondProduct.unit_price, 0, 21, 3 * secondProduct.unit_price, created, created); }
      addAudit(j % 2 ? "Luis" : "Jose", "POST", `orders/${orderId}`, "Alta", `${code} · ${ageStatus}`, created);
      const hasDocument = ["Entregado", "Enviado", "En reparto", "Preparado"].includes(ageStatus);
      if (hasDocument) {
        const deliveryId = Number(add("INSERT INTO delivery_notes(code,order_id,client_id,status,created_at,delivery_date,carrier,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", `HIST-ALB-${String(m + 3).padStart(2, "0")}${String(deliveryNumber++).padStart(3, "0")}`, orderId, clientId, ageStatus === "Entregado" ? "Entregado" : "En reparto", created, iso(m, 7).slice(0, 10), "Repartos Exclusivas", "Comprobar firma y temperatura", ageStatus === "Entregado" ? created : iso(5, 18)).lastInsertRowid);
        add("INSERT INTO delivery_note_lines(delivery_note_id,product_id,quantity,created_at,updated_at) VALUES(?,?,?,?,?)", deliveryId, productId, quantity, created, created);
        if (["Enviado", "Entregado", "En reparto"].includes(ageStatus)) {
          add("INSERT INTO shipments(code,order_id,delivery_note_id,client_id,carrier,status,prepared_at,shipped_at,expected_delivery_at,delivered_at,address,tracking,packages,incidents,created_at,updated_at,origin_address,departure_at,delivery_window_start,delivery_window_end,notes,collection_point_id,prepared_by,shipped_by,delivered_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", `HIST-ENV-${String(m + 3).padStart(2, "0")}${String(shipmentNumber++).padStart(3, "0")}`, orderId, deliveryId, clientId, "Repartos Exclusivas", ageStatus, iso(m, 6, 7), ageStatus === "Preparado" ? null : iso(m, 7, 8), iso(m, 7, 12), ageStatus === "Entregado" ? iso(m, 7, 13) : null, clients[(m * 2 + j) % clients.length][3], `TRK-HIST-${m}${j}`, 1 + (j % 3), j === 5 && m === 2 ? "Entrega reprogramada por cliente" : null, created, ageStatus === "Entregado" ? created : iso(5, 18), "Almacén Centro", iso(m, 7, 7), iso(m, 7, 10), iso(m, 7, 14), "Llamar 30 minutos antes", pointIds[j % pointIds.length], j % 2 ? "Luis" : "Jose", "Luis", ageStatus === "Entregado" ? "Luis" : null);
        }
      }
      if (hasDocument && m < 5 || (m === 5 && j < 5)) {
        const invoiceId = Number(add("INSERT INTO invoices(code,client_id,amount,status,created_at,issue_date,due_date,vat,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)", `HIST-FAC-${String(m + 3).padStart(2, "0")}${String(invoiceNumber++).padStart(3, "0")}`, clientId, amount, m < 4 || j % 2 === 0 ? "Cobrada" : "Pendiente", created, created.slice(0, 10), iso(m, 25).slice(0, 10), 21, "Factura generada desde pedido", m < 4 || j % 2 === 0 ? created : iso(5, 18)).lastInsertRowid);
        add("INSERT INTO invoice_lines(invoice_id,product_id,quantity,unit_price,discount,vat,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", invoiceId, productId, quantity, product.unit_price, 0, 21, amount, created, created);
        const paid = m < 3 ? amount : j % 2 === 0 ? amount : Number((amount * .45).toFixed(2));
        if (paid > 0) add("INSERT INTO payments(invoice_id,amount,payment_date,method,reference,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", invoiceId, paid, iso(Math.min(5, m + 1), 4).slice(0, 10), j % 2 ? "Transferencia" : "Domiciliación", `COB-HIST-${m}${j}`, paid < amount ? "Cobro parcial pendiente" : "Cobro conciliado", iso(Math.min(5, m + 1), 4), iso(5, 18));
      }
      if (ageStatus === "Entregado" || ageStatus === "Enviado") { addMovement(productId, warehouseIds[j % warehouseIds.length], "Salida", quantity, code, created, "Salida asociada a pedido enviado"); db.prepare("UPDATE products SET stock=MAX(0,COALESCE(stock,0)-?),updated_at=? WHERE id=?").run(quantity, iso(5, 18), productId); }
    }
  }

  for (let m = 0; m < 6; m++) {
    for (let j = 0; j < 2; j++) {
      const clientId = clientIds[(m + j) % clientIds.length], productId = productIds[(m * 3 + j) % productIds.length], product = get("SELECT unit_price FROM products WHERE id=?", productId), created = iso(m, 12 + j * 7), qty = 8 + j * 4, amount = Number((qty * product.unit_price).toFixed(2));
      const quoteId = Number(add("INSERT INTO quotes(code,client_id,amount,status,created_at,valid_until,notes,updated_at) VALUES(?,?,?,?,?,?,?,?)", `HIST-PRE-${String(m + 3).padStart(2, "0")}${j + 1}`, clientId, amount, m < 4 ? "Aceptado" : j ? "Enviada" : "Borrador", created, iso(m, 27).slice(0, 10), "Presupuesto para servicio de bebidas", iso(5, 18)).lastInsertRowid);
      add("INSERT INTO quote_lines(quote_id,product_id,quantity,unit_price,discount,vat,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", quoteId, productId, qty, product.unit_price, 0, 21, amount, created, created);
      addAudit("Asistente", "POST", `quotes/${quoteId}`, "Alta", "Presupuesto preparado desde el CRM", created);
    }
  }

  for (let i = 0; i < 12; i++) {
    const created = iso(Math.floor(i / 2), 9 + (i % 2) * 8);
    add("INSERT INTO returns(code,client_id,product_id,quantity,reason,status,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,?)", `HIST-DEV-${String(i + 1).padStart(3, "0")}`, clientIds[i % clientIds.length], productIds[i % productIds.length], 1 + (i % 4), i % 3 ? "Envase dañado" : "Diferencia en entrega", i % 4 ? "Recibida" : "Pendiente", 12 + i * 3, created, iso(5, 18));
    addAudit("Luis", "POST", `returns/${i + 1}`, "Alta", "Devolución registrada", created);
  }

  const noteData = [
    ["Revisar vencimientos de abril", "Comprobar lotes de cervezas y aguas antes de la ruta del viernes.", "Alta", "Stock"],
    ["Renovar tarifa Hotel La Castellana", "Preparar propuesta de precios para el próximo trimestre.", "Normal", "Clientes"],
    ["Conciliar cobros pendientes", "Revisar facturas con cobro parcial y enviar recordatorio.", "Urgente", "Cobros"],
    ["Planificar compras de verano", "Aumentar previsión de refrescos y aguas para junio.", "Alta", "Compras"],
    ["Revisar incidencias de reparto", "Llamar a clientes con entregas reprogramadas.", "Normal", "Envíos"],
    ["Actualizar catálogo de vinos", "Añadir referencias de temporada y fotografías.", "Normal", "Productos"],
    ["Preparar inventario mensual", "Contar cámara refrigerada y comparar con stock del sistema.", "Alta", "Almacenes"],
    ["Confirmar pedidos de eventos", "Validar cantidades con Eventos Sabor y Catering Horizonte.", "Urgente", "Pedidos"],
  ];
  noteData.forEach((n, i) => add("INSERT INTO notes(title,content,priority,module,important,completed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", ...n, 1, i < 5 ? 0 : 1, iso(Math.floor(i / 2), 14), iso(5, 18)));
  for (let i = 0; i < 6; i++) add("INSERT INTO scheduled_tasks(title,action_text,schedule_type,recurrence,next_run,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", "Revisar stock crítico", "nota: revisar productos por debajo del mínimo", "Recurrente", "semanal", iso(5, 22), "Activa", "Asistente", iso(i, 18), iso(5, 18));
  for (let m = 0; m < 6; m++) for (let i = 0; i < 10; i++) addAudit(i % 3 === 0 ? "Asistente" : i % 2 ? "Luis" : "Jose", i % 4 === 0 ? "GET" : "POST", ["orders", "products", "invoices", "shipments", "stock"][i % 5], i % 4 === 0 ? "Consulta" : "Alta", "Actividad histórica de prueba", iso(m, 2 + i));

  db.prepare("UPDATE products SET stock_reserved=COALESCE((SELECT SUM(quantity) FROM orders WHERE orders.product_id=products.id AND orders.status NOT IN ('Enviado','Entregado','Cancelado')),0),updated_at=?").run(now.toISOString());
  db.exec("COMMIT");
  console.log(JSON.stringify({ ok: true, period: "2026-03-01 a 2026-08-20", clients: clients.length, suppliers: suppliers.length, products: productIds.length, orders: get("SELECT COUNT(*) n FROM orders WHERE code LIKE 'HIST-%'").n, invoices: get("SELECT COUNT(*) n FROM invoices WHERE code LIKE 'HIST-%'").n, payments: get("SELECT COUNT(*) n FROM payments WHERE reference LIKE 'COB-HIST-%'").n, shipments: get("SELECT COUNT(*) n FROM shipments WHERE code LIKE 'HIST-%'").n, notes: get("SELECT COUNT(*) n FROM notes WHERE title IN ('Revisar vencimientos de abril','Renovar tarifa Hotel La Castellana','Conciliar cobros pendientes','Planificar compras de verano','Revisar incidencias de reparto','Actualizar catálogo de vinos','Preparar inventario mensual','Confirmar pedidos de eventos')").n }));
} catch (error) {
  db.exec("ROLLBACK");
  console.error(error);
  process.exitCode = 1;
}
