"use client";

import { useEffect, useMemo, useState } from "react";

type TrackingLine = {
  product_name?: string;
  quantity?: number;
  quantity_requested?: number;
  prepared_quantity?: number;
  quantity_unit?: string;
  preparation_status?: string;
};

type TrackingData = {
  shipment: {
    code?: string;
    order_code?: string;
    status?: string;
    expected_delivery_at?: string;
    preparation_date?: string;
    address?: string;
    delivery_city?: string;
    packages?: number;
    incidents?: string;
    delivery_window_start?: string;
    delivery_window_end?: string;
    client_name?: string;
    location_name?: string;
  };
  lines: TrackingLine[];
};

const stages = ["Preparando", "Preparado", "Enviado", "En reparto", "Entregado"];

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatTime(value?: string) {
  return value ? String(value).slice(0, 5) : "";
}

function stageIndex(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("entreg")) return 4;
  if (normalized.includes("repart")) return 3;
  if (normalized.includes("enviado") || normalized.includes("salido")) return 2;
  if (normalized.includes("preparado") || normalized.includes("listo")) return 1;
  return 0;
}

function lineQuantity(line: TrackingLine) {
  const requested = Number(line.quantity_requested || line.quantity || 0);
  const prepared = Number(line.prepared_quantity);
  if (Number.isFinite(prepared) && prepared > 0 && prepared < requested) return `${prepared}/${requested}`;
  return String(requested);
}

export default function ShipmentTrackingPage() {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const token = segments[segments.length - 1] || "";
    if (!token) {
      setError("No se ha encontrado el enlace de seguimiento.");
      setLoading(false);
      return;
    }
    fetch(`/api/public/shipments/${encodeURIComponent(decodeURIComponent(token))}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "No se ha podido cargar el envío.");
        return body as TrackingData;
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se ha podido cargar el envío."))
      .finally(() => setLoading(false));
  }, []);

  const currentStage = useMemo(() => stageIndex(data?.shipment.status), [data?.shipment.status]);

  if (loading) {
    return <main className="tracking-page"><section className="tracking-modal tracking-loading"><div className="tracking-spinner" /><p>Consultando el seguimiento del envío…</p></section></main>;
  }

  if (error || !data) {
    return <main className="tracking-page"><section className="tracking-modal tracking-error"><div className="tracking-brand"><span>E</span><div><b>Exclusivas</b><small>INTELIGENTES</small></div></div><p className="tracking-eyebrow">SEGUIMIENTO DE ENVÍO</p><h1>No podemos mostrar este envío</h1><p>{error || "El enlace no está disponible."}</p><a className="tracking-button" href="/web">Ir a la web</a></section></main>;
  }

  const { shipment, lines } = data;
  const timeWindow = shipment.delivery_window_start && shipment.delivery_window_end
    ? `${formatTime(shipment.delivery_window_start)}–${formatTime(shipment.delivery_window_end)}`
    : "Horario pendiente de confirmar";

  return (
    <main className="tracking-page">
      <section className="tracking-modal" aria-label={`Seguimiento del envío ${shipment.code || ""}`}>
        <header className="tracking-header">
          <div className="tracking-brand"><span>E</span><div><b>Exclusivas</b><small>INTELIGENTES · DISTRIBUIDORA DE BEBIDAS</small></div></div>
          <div className="tracking-header-label"><p className="tracking-eyebrow">SEGUIMIENTO DE ENVÍO</p><strong>{shipment.code || "Envío"}</strong></div>
        </header>

        <div className="tracking-title-row"><div><p className="tracking-eyebrow">ESTADO ACTUAL</p><h1>{shipment.status || "Preparando"}</h1>{shipment.order_code && <p className="tracking-order">Pedido {shipment.order_code}</p>}</div><span className="tracking-status">{shipment.status || "Preparando"}</span></div>

        <ol className="tracking-stepper" aria-label="Progreso del envío">
          {stages.map((stage, index) => <li key={stage} className={index < currentStage ? "is-done" : index === currentStage ? "is-current" : ""}><span>{index < currentStage ? "✓" : String(index + 1).padStart(2, "0")}</span><b>{stage}</b></li>)}
        </ol>

        <div className="tracking-grid">
          <section className="tracking-panel"><p className="tracking-eyebrow">ENTREGA</p><h2>{shipment.client_name || "Cliente"}</h2>{shipment.location_name && <p className="tracking-location">{shipment.location_name}</p>}<p>{shipment.address || "Dirección pendiente de confirmar"}{shipment.delivery_city ? ` · ${shipment.delivery_city}` : ""}</p><div className="tracking-facts"><div><span>HORARIO</span><b>{timeWindow}</b></div><div><span>BULTOS</span><b>{Math.max(1, Number(shipment.packages || 1))}</b></div>{shipment.expected_delivery_at && <div><span>ENTREGA PREVISTA</span><b>{formatDate(shipment.expected_delivery_at)}</b></div>}</div></section>
          <section className="tracking-panel tracking-content-panel"><div className="tracking-panel-heading"><div><p className="tracking-eyebrow">CONTENIDO DEL ENVÍO</p><h2>{lines.length} referencias</h2></div><span className="tracking-content-mark">QR</span></div>{lines.length ? <ul className="tracking-lines">{lines.map((line, index) => <li key={`${line.product_name || "producto"}-${index}`}><b>{lineQuantity(line)} {line.quantity_unit || "unidades"}</b><span>{line.product_name || "Producto sin identificar"}</span>{line.preparation_status && <small>{line.preparation_status}</small>}</li>)}</ul> : <p className="tracking-muted">El contenido aún no está disponible.</p>}</section>
        </div>

        {shipment.incidents && <aside className="tracking-incident"><b>Incidencia comunicada</b><p>{shipment.incidents}</p></aside>}
        <footer className="tracking-footer"><span>Información operativa · Exclusivas Inteligentes</span><a href="/web">Visitar la web</a></footer>
      </section>
    </main>
  );
}
