"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DeliverySignaturePanel } from "../page";

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value: string) {
  const match = String(value || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "Sin fecha";
}

function mapsUrl(item: any) {
  const lat = Number(item.latitude), lon = Number(item.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const query = [item.client_name, item.address, item.city].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function shipmentView(item: any, clients: any[], points: any[]) {
  const client = clients.find((row) => Number(row.id) === Number(item.client_id));
  const point = points.find((row) => Number(row.id) === Number(item.collection_point_id));
  return {
    ...item,
    client_name: client?.name || "Cliente sin nombre",
    address: item.address || point?.address || client?.address || "Dirección no indicada",
    city: item.delivery_city || point?.city || client?.city || "",
    opening_time: item.delivery_window_start || point?.opening_time || client?.opening_time || "",
    closing_time: item.delivery_window_end || point?.closing_time || client?.closing_time || "",
    latitude: item.latitude ?? point?.latitude ?? client?.latitude,
    longitude: item.longitude ?? point?.longitude ?? client?.longitude,
    shipping_date: item.shipping_date || String(item.expected_delivery_at || item.delivery_date || "").slice(0, 10),
  };
}

function parsePaymentAttachments(value: any): any[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function DeliveryPaymentPanel({ shipment, actor, onSaved }: { shipment: any; actor: string; onSaved: (shipment: any) => void }) {
  const [status, setStatus] = useState(String(shipment?.payment_received_status || "Pendiente"));
  const [amount, setAmount] = useState(String(shipment?.payment_received_amount ?? ""));
  const [method, setMethod] = useState(String(shipment?.payment_received_method || ""));
  const [reference, setReference] = useState(String(shipment?.payment_received_reference || ""));
  const [note, setNote] = useState(String(shipment?.payment_received_note || ""));
  const [attachments, setAttachments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const existingAttachments = parsePaymentAttachments(shipment?.payment_received_attachments_json);
  const trackingToken = String(shipment?.public_tracking_token || "").trim();
  const shareUrl = trackingToken && typeof window !== "undefined" ? `${window.location.origin}/seguimiento/${encodeURIComponent(trackingToken)}` : "";

  useEffect(() => {
    setStatus(String(shipment?.payment_received_status || "Pendiente"));
    setAmount(String(shipment?.payment_received_amount ?? ""));
    setMethod(String(shipment?.payment_received_method || ""));
    setReference(String(shipment?.payment_received_reference || ""));
    setNote(String(shipment?.payment_received_note || ""));
    setAttachments([]);
    setMessage("");
  }, [shipment?.id]);

  async function readAttachments(files: FileList | null) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (existingAttachments.length + attachments.length + selected.length > 4) return setMessage("Puedes guardar como máximo 4 justificantes.");
    if (selected.some((file) => file.size > 6 * 1024 * 1024)) return setMessage("Cada justificante no puede superar 6 MB.");
    try {
      const loaded = await Promise.all(selected.map((file) => new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, mime: file.type || "application/octet-stream", data: String(reader.result || "") });
        reader.onerror = () => reject(new Error("No se pudo leer uno de los justificantes."));
        reader.readAsDataURL(file);
      })));
      setAttachments((current) => [...current, ...loaded].slice(0, 4 - existingAttachments.length));
      setMessage("");
    } catch (error: any) { setMessage(error?.message || "No se pudieron añadir los justificantes."); }
  }

  async function savePayment() {
    const numericAmount = amount.trim() ? Number(amount) : 0;
    if (!Number.isFinite(numericAmount) || numericAmount < 0) return setMessage("Indica un importe válido.");
    if (status === "Recibido" && !method) return setMessage("Indica cómo se ha recibido el cobro.");
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/shipments/${shipment.id}/payment-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Actor": actor },
        body: JSON.stringify({ payment_status: status, amount: numericAmount, method, reference, note, attachments }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo guardar el cobro.");
      onSaved(body);
      setAttachments([]);
      setMessage(status === "Recibido" ? "Cobro y justificantes guardados." : "Estado del cobro guardado.");
    } catch (error: any) { setMessage(error?.message || "No se pudo guardar el cobro."); }
    finally { setSaving(false); }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setMessage("Enlace del albarán copiado."); }
    catch { setMessage("No se ha podido copiar. Mantén pulsado el enlace para copiarlo."); }
  }

  const allAttachments = [...existingAttachments, ...attachments];
  return <section className="reparto-payment-panel" aria-label="Talón y cobro recibido">
    <div className="reparto-payment-head"><div><p className="eyebrow">TALÓN Y COBRO</p><h3>Justificante de recepción</h3><span>Registra el importe, la forma de cobro y una foto o PDF del talón recibido. Si hay factura, también quedará reflejado en Cobros.</span></div><strong className={`reparto-payment-badge ${status === "Recibido" ? "received" : status === "No recibido" ? "missing" : "pending"}`}>{status}</strong></div>
    <div className="reparto-payment-fields">
      <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)} disabled={saving}><option>Pendiente</option><option>Recibido</option><option>No recibido</option></select></label>
      <label>Importe recibido<input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" disabled={saving} /></label>
      <label>Forma de cobro<select value={method} onChange={(event) => setMethod(event.target.value)} disabled={saving}><option value="">Seleccionar…</option><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option><option>Talón</option><option>Otro</option></select></label>
      <label>Referencia / nº de talón<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ej. TAL-00481" disabled={saving} /></label>
      <label className="reparto-payment-wide">Anotación<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Ej. talón entregado por el cliente, pendiente de ingresar…" disabled={saving} /></label>
    </div>
    <label className="reparto-payment-file">Añadir foto o PDF del talón / justificante<input type="file" accept="image/*,.pdf" capture="environment" multiple onChange={(event) => { void readAttachments(event.target.files); event.currentTarget.value = ""; }} disabled={saving || allAttachments.length >= 4} /><small>Hasta 4 archivos · máximo 6 MB cada uno</small></label>
    {allAttachments.length > 0 && <div className="reparto-payment-files"><b>Justificantes adjuntos</b><div>{allAttachments.map((file, index) => <article key={`${file.name || "justificante"}-${index}`}>{String(file.mime || "").includes("pdf") ? <a href={file.url || file.data} target="_blank" rel="noreferrer" className="reparto-payment-pdf">PDF</a> : <img src={file.thumbnail_url || file.url || file.data} alt={file.name || "Justificante del cobro"} />}<span>{file.name || `Justificante ${index + 1}`}</span>{index >= existingAttachments.length && <button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index - existingAttachments.length))}>Quitar</button>}</article>)}</div></div>}
    {message && <p className="reparto-payment-message" role="status">{message}</p>}
    <div className="reparto-payment-actions"><button type="button" className="button primary" onClick={() => void savePayment()} disabled={saving}>{saving ? "Guardando…" : "Guardar talón y cobro"}</button>{shareUrl && <div className="reparto-client-link"><div><b>Albarán para el cliente</b><small>Enlace seguro al seguimiento y albarán firmado</small></div><a href={shareUrl} target="_blank" rel="noreferrer">Abrir copia</a><button type="button" onClick={() => void copyShareUrl()}>Copiar enlace</button></div>}</div>
  </section>;
}

export default function RepartoPage() {
  const [date, setDate] = useState(todayInput);
  const [shipments, setShipments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [selectedLines, setSelectedLines] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [returnLine, setReturnLine] = useState<any>(null);
  const [returnQuantity, setReturnQuantity] = useState("1");
  const [returnReason, setReturnReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const actor = "Reparto móvil";

  async function load() {
    setLoading(true);
    try {
      const [shipmentResponse, clientResponse, pointResponse, productResponse, routeResponse] = await Promise.all([
        fetch("/api/shipments"),
        fetch("/api/clients?view=lookup&limit=2000"),
        fetch("/api/collection_points?view=lookup&limit=2000"),
        fetch("/api/products?view=lookup&limit=2000"),
        fetch(`/api/routes?date=${encodeURIComponent(date)}`),
      ]);
      const rawShipments = shipmentResponse.ok ? await shipmentResponse.json() : [];
      const nextClients = clientResponse.ok ? await clientResponse.json() : [];
      const nextPoints = pointResponse.ok ? await pointResponse.json() : [];
      setClients(Array.isArray(nextClients) ? nextClients : []);
      setPoints(Array.isArray(nextPoints) ? nextPoints : []);
      setProducts(productResponse.ok ? await productResponse.json() : []);
      const nextShipments = (Array.isArray(rawShipments) ? rawShipments : []).map((item) => shipmentView(item, nextClients, nextPoints));
      setShipments(nextShipments);
      const nextRoutes = routeResponse.ok ? await routeResponse.json() : [];
      setRoutes(Array.isArray(nextRoutes) ? nextRoutes : []);
      const firstRoute = Array.isArray(nextRoutes) && nextRoutes.length ? nextRoutes[0] : null;
      setActiveRouteId((current) => current && nextRoutes.some((route: any) => Number(route.id) === current) ? current : firstRoute?.id || null);
    } catch {
      setMessage("No se han podido cargar los datos del reparto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [date]);

  const dayShipments = useMemo(() => shipments
    .filter((item) => String(item.shipping_date || item.expected_delivery_at || "").slice(0, 10) === date)
    .sort((a, b) => String(a.opening_time || "99:99").localeCompare(String(b.opening_time || "99:99")) || String(a.client_name).localeCompare(String(b.client_name), "es")), [shipments, date]);
  const activeRoute = routes.find((route) => Number(route.id) === Number(activeRouteId)) || null;
  const routeStops = activeRoute?.stops?.length ? activeRoute.stops : dayShipments.map((item, index) => ({ ...item, id: `suggested-${item.id}`, shipment_id: item.id, position: index + 1, status: item.status === "Entregado" ? "Completada" : "Pendiente" }));
  const completed = routeStops.filter((stop: any) => ["Completada", "Entregado"].includes(String(stop.status || ""))).length;
  const pending = dayShipments.filter((item) => !["Entregado", "Cancelado"].includes(String(item.status || ""))).length;
  const incidents = dayShipments.filter((item) => String(item.incidents || "").trim()).length;

  async function openShipment(item: any) {
    setDetailLoading(true);
    setSelectedShipment(item);
    setMessage("");
    try {
      const response = await fetch(`/api/shipments/${item.id}`);
      const detail = response.ok ? await response.json() : item;
      const lineResponse = detail.order_id ? await fetch("/api/order_lines?limit=5000") : null;
      const rawLines = lineResponse?.ok ? await lineResponse.json() : [];
      const lines = (Array.isArray(rawLines) ? rawLines : []).filter((line: any) => Number(line.order_id) === Number(detail.order_id)).map((line: any) => ({ ...line, product_name: line.product_name || products.find((product) => Number(product.id) === Number(line.product_id))?.name || `Producto #${line.product_id}` }));
      setSelectedShipment(shipmentView({ ...item, ...detail }, clients, points));
      setSelectedLines(lines);
    } catch {
      setSelectedLines([]);
      setMessage("No se ha podido cargar el detalle del envío.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStop(stop: any, nextStatus: string) {
    if (!activeRoute || !stop.id || String(stop.id).startsWith("suggested-")) {
      setMessage("Esta vista es una sugerencia. Selecciona una ruta planificada para guardar el check.");
      return;
    }
    const response = await fetch(`/api/routes/${activeRoute.id}/stops/${stop.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Actor": actor }, body: JSON.stringify({ status: nextStatus }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.error || "No se pudo actualizar la parada.");
    setRoutes((current) => current.map((route) => Number(route.id) === Number(body.id) ? body : route));
  }

  async function moveStop(index: number, direction: -1 | 1) {
    if (!activeRoute) return;
    const next = [...(activeRoute.stops || [])];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const response = await fetch(`/api/routes/${activeRoute.id}/stops/reorder`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Actor": actor }, body: JSON.stringify({ stop_ids: next.map((stop) => stop.id) }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.error || "No se pudo ajustar el orden de la ruta.");
    setRoutes((current) => current.map((route) => Number(route.id) === Number(body.id) ? body : route));
  }

  async function saveReturn(event: FormEvent) {
    event.preventDefault();
    if (!selectedShipment || !returnLine || !returnReason.trim()) return setMessage("Indica cantidad y motivo de la devolución.");
    setSaving(true);
    try {
      const quantity = Number(returnQuantity);
      const product = products.find((item) => Number(item.id) === Number(returnLine.product_id));
      const response = await fetch("/api/returns", { method: "POST", headers: { "Content-Type": "application/json", "X-Actor": actor }, body: JSON.stringify({ code: `DEV-${Date.now()}`, client_id: selectedShipment.client_id || null, product_id: Number(returnLine.product_id), quantity, return_date: new Date().toISOString(), reason: `${returnReason.trim()} · Envío ${selectedShipment.code}`, status: "Pendiente", amount: quantity * Number(product?.unit_price || returnLine.unit_price || 0) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo registrar la devolución.");
      setReturnsOpen(false);
      setReturnReason("");
      setMessage(`Devolución ${body.code || "registrada"} enviada a revisión.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo registrar la devolución."); }
    finally { setSaving(false); }
  }

  return <main className="reparto-page">
    <header className="reparto-topbar"><a className="reparto-brand" href="/crm"><span>E</span><div><b>Exclusivas</b><small>INTELIGENTES</small></div></a><div className="reparto-topbar-actions"><span className="reparto-connection"><i /> Modo reparto</span><a href="/crm">Salir al CRM</a></div></header>
    <div className="reparto-shell">
      <section className="reparto-head"><div><p className="eyebrow">OPERATIVA DE REPARTO</p><h1>Reparto de hoy</h1><p>Consulta tu ruta, abre cada entrega y registra la recepción desde el móvil.</p></div><button type="button" className="reparto-refresh" onClick={() => void load()} disabled={loading}>↻ Actualizar</button></section>
      <section className="reparto-datebar"><button type="button" onClick={() => setDate(todayInput())} className={date === todayInput() ? "active" : ""}>Hoy <small>{dateLabel(todayInput())}</small></button><button type="button" onClick={() => setDate(offsetDate(1))} className={date === offsetDate(1) ? "active" : ""}>Mañana <small>{dateLabel(offsetDate(1))}</small></button><label>Otra fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></section>
      <section className="reparto-kpis"><article><strong>{dayShipments.length}</strong><span>entregas del día</span></article><article><strong>{pending}</strong><span>pendientes</span></article><article><strong>{completed}</strong><span>paradas completadas</span></article><article className={incidents ? "attention" : ""}><strong>{incidents}</strong><span>con incidencias</span></article></section>
      {message && <p className="reparto-message" role="status">{message}</p>}
      <div className="reparto-layout"><section className="reparto-stops panel"><div className="reparto-panel-head"><div><p className="eyebrow">{activeRoute ? activeRoute.code : "ORDEN SUGERIDO"}</p><h2>{activeRoute ? `Ruta de ${activeRoute.driver || "reparto"}` : "Entregas para hoy"}</h2><span>{activeRoute ? `${activeRoute.stops?.length || 0} paradas · ${activeRoute.vehicle || "Vehículo sin indicar"}` : "Ordenadas por horario de apertura"}</span></div>{activeRoute?.maps_url && <a className="button primary" href={activeRoute.maps_url} target="_blank" rel="noreferrer">Navegar toda la ruta</a>}</div>{loading ? <div className="reparto-loading" role="status">Cargando entregas…</div> : !routeStops.length ? <div className="reparto-empty"><b>No hay entregas para esta fecha.</b><span>Prueba otra fecha o vuelve al CRM para planificar la ruta.</span></div> : <ol className="reparto-stop-list">{routeStops.map((stop: any, index: number) => { const shipment = shipments.find((item) => Number(item.id) === Number(stop.shipment_id)) || stop; const done = ["Completada", "Entregado"].includes(String(stop.status || "")); const destination = mapsUrl({ ...shipment, ...stop }); return <li className={`reparto-stop${done ? " done" : ""}`} key={stop.id}><div className="reparto-stop-number">{done ? "✓" : stop.position || index + 1}</div><div className="reparto-stop-main"><div className="reparto-stop-title"><div><b>{stop.client_name || shipment.client_name}</b><small>{shipment.code || stop.shipment_code || "Envío"}</small></div><span className={`reparto-stop-status ${done ? "done" : "pending"}`}>{done ? "Completada" : stop.status || "Pendiente"}</span></div><p>{[stop.address || shipment.address, stop.city || shipment.city].filter(Boolean).join(" · ") || "Dirección no indicada"}</p><small className="reparto-stop-window">{stop.opening_time && stop.closing_time ? `Horario ${stop.opening_time}–${stop.closing_time}` : "Horario pendiente de indicar"}{stop.distance_km ? ` · ${stop.distance_km} km` : ""}</small><div className="reparto-stop-actions">{destination ? <a className="reparto-map-button" href={destination} target="_blank" rel="noreferrer">↗ Cómo llegar</a> : <span className="reparto-no-map">Ubicación sin dirección</span>}<button type="button" className="reparto-open-button" onClick={() => void openShipment(shipment)}>Abrir entrega</button><button type="button" className={`reparto-check-button${done ? " checked" : ""}`} onClick={() => void updateStop(stop, done ? "Pendiente" : "Completada")}>{done ? "Desmarcar" : "✓ Marcar parada"}</button>{activeRoute && <span className="reparto-reorder"><button type="button" aria-label="Subir parada" onClick={() => void moveStop(index, -1)} disabled={index === 0}>↑</button><button type="button" aria-label="Bajar parada" onClick={() => void moveStop(index, 1)} disabled={index === routeStops.length - 1}>↓</button></span>}</div></div></li>; })}</ol>}</section>
        <aside className="reparto-side"><section className="reparto-route-picker panel"><div className="reparto-panel-head compact"><div><p className="eyebrow">PLANIFICACIÓN</p><h2>Mis rutas</h2><span>Selecciona la ruta asignada</span></div></div>{routes.length ? routes.map((route) => <button type="button" key={route.id} className={`reparto-route-option${Number(route.id) === Number(activeRouteId) ? " active" : ""}`} onClick={() => setActiveRouteId(Number(route.id))}><span><b>{route.code}</b><small>{dateLabel(route.route_date)} · {route.driver || "Sin repartidor"}</small></span><strong>{route.stops?.length || 0}</strong></button>) : <p className="reparto-empty small">No hay una ruta planificada para esta fecha.</p>}<a className="reparto-plan-link" href="/crm">Planificar o editar rutas en el CRM →</a></section><section className="reparto-help panel"><p className="eyebrow">SECUENCIA RECOMENDADA</p><h2>Una entrega cada vez</h2><p>Abre Maps para llegar, entra en la entrega para enseñar el pedido al cliente y registra firma, fotos o incidencias antes de continuar.</p></section></aside></div>
    </div>
    {selectedShipment && <div className="reparto-detail-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedShipment(null)}><section className="reparto-detail-modal" role="dialog" aria-modal="true" aria-label={`Detalle del envío ${selectedShipment.code || ""}`}><header className="reparto-detail-head"><div><p className="eyebrow">ENTREGA · {selectedShipment.shipping_date ? dateLabel(selectedShipment.shipping_date) : ""}</p><h2>{selectedShipment.client_name}</h2><span>{selectedShipment.code} · {[selectedShipment.address, selectedShipment.city].filter(Boolean).join(" · ")}</span></div><button type="button" className="reparto-close" onClick={() => setSelectedShipment(null)} aria-label="Cerrar detalle">×</button></header>{detailLoading ? <div className="reparto-loading">Cargando contenido del pedido…</div> : <><div className="reparto-detail-facts"><span><b>HORARIO</b>{selectedShipment.opening_time && selectedShipment.closing_time ? `${selectedShipment.opening_time}–${selectedShipment.closing_time}` : "Pendiente"}</span><span><b>BULTOS</b>{selectedShipment.packages || "—"}</span><span><b>ESTADO</b>{selectedShipment.status || "Pendiente"}</span></div><div className="reparto-detail-actions">{mapsUrl(selectedShipment) ? <a className="button primary" href={mapsUrl(selectedShipment)} target="_blank" rel="noreferrer">Cómo llegar con Maps</a> : <span className="reparto-no-map">Ubicación sin dirección</span>}<button type="button" className="button secondary" onClick={() => { setReturnLine(selectedLines[0] || null); setReturnsOpen(true); }}>Tramitar devolución</button></div>{selectedShipment.incidents && <div className="reparto-incident"><b>Incidencias / indicaciones</b><p>{selectedShipment.incidents}</p></div>}<div className="reparto-lines"><h3>Contenido del pedido</h3>{selectedLines.length ? selectedLines.map((line) => <div key={line.id} className="reparto-line"><span>{line.quantity_requested || line.quantity} {line.quantity_unit || "uds."}</span><b>{line.product_name}</b><button type="button" onClick={() => { setReturnLine(line); setReturnsOpen(true); }}>Devolver</button></div>) : <p>No hay líneas cargadas para este pedido.</p>}</div><DeliverySignaturePanel shipment={selectedShipment} actor={actor} client={clients.find((client) => Number(client.id) === Number(selectedShipment.client_id))} lines={selectedLines} products={products} onSaved={(updated) => { setSelectedShipment((current: any) => ({ ...current, ...updated, status: updated.status || "Entregado" })); setShipments((current) => current.map((item) => Number(item.id) === Number(updated.id) ? { ...item, ...updated } : item)); const matchingStop = activeRoute && routeStops.find((stop: any) => Number(stop.shipment_id) === Number(updated.id)); if (matchingStop) void updateStop(matchingStop, "Completada"); }} /><DeliveryPaymentPanel shipment={selectedShipment} actor={actor} onSaved={(updated) => { setSelectedShipment((current: any) => ({ ...current, ...updated })); setShipments((current) => current.map((item) => Number(item.id) === Number(updated.id) ? { ...item, ...updated } : item)); }} /></>}</section></div>}
    {returnsOpen && selectedShipment && <div className="reparto-return-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setReturnsOpen(false)}><form className="reparto-return-modal" onSubmit={(event) => void saveReturn(event)}><header><div><p className="eyebrow">DEVOLUCIÓN</p><h2>Registrar devolución</h2><span>{selectedShipment.client_name} · {selectedShipment.code}</span></div><button type="button" className="reparto-close" onClick={() => setReturnsOpen(false)} aria-label="Cerrar devolución">×</button></header><label>Producto<select value={returnLine?.id || ""} onChange={(event) => setReturnLine(selectedLines.find((line) => String(line.id) === event.target.value) || null)}>{selectedLines.map((line) => <option key={line.id} value={line.id}>{line.product_name}</option>)}</select></label><label>Cantidad<input type="number" min="1" step="1" value={returnQuantity} onChange={(event) => setReturnQuantity(event.target.value)} /></label><label>Motivo<textarea required rows={4} value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Ej.: dos cajas dañadas al descargar…" /></label><p className="reparto-return-note">La devolución queda pendiente de revisión y se vincula al cliente y al envío.</p><footer><button type="button" className="button secondary" onClick={() => setReturnsOpen(false)}>Cancelar</button><button type="submit" className="button primary" disabled={saving}>{saving ? "Guardando…" : "Registrar devolución"}</button></footer></form></div>}
  </main>;
}
