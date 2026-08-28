"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "inicio" | "pedido" | "pedidos" | "clientes" | "visitas";
type User = { username?: string; role?: string };
type Line = { product_id: number; name: string; quantity: number; quantity_requested: number; quantity_unit: "unidad" | "caja" | "palet"; units_factor: number; unit_price: number };

const STATUS_DONE = ["Cancelado", "Entregado", "Enviado", "En reparto"];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: unknown) {
  const raw = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "—";
  const [year, month, day] = raw.split("-");
  return `${day}/${month}/${year}`;
}

function euro(value: number) {
  return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function unitLabel(value: Line["quantity_unit"], quantity: number) {
  if (quantity === 1) return value;
  if (value === "palet") return "palés";
  if (value === "caja") return "cajas";
  return "unidades";
}

function searchMatches(value: unknown, query: string) {
  return String(value || "").toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"));
}

async function readList(resource: string) {
  const response = await fetch(`/api/${resource}?view=lookup&limit=2000`, { cache: "no-store" });
  if (!response.ok) throw new Error(`No se ha podido cargar ${resource}.`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export default function ComercialPage() {
  const [view, setView] = useState<View>("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User>({ username: "Usuario", role: "comercial" });
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => today());
  const [address, setAddress] = useState("");
  const [pointId, setPointId] = useState("");
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityUnit, setQuantityUnit] = useState<Line["quantity_unit"]>("unidad");
  const [cart, setCart] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [clientListSearch, setClientListSearch] = useState("");
  const [orderListSearch, setOrderListSearch] = useState("");

  const actor = user.username || "Usuario local";
  const selectedClient = clients.find((client) => String(client.id) === selectedClientId);
  const clientPoints = points.filter((point) => Number(point.client_id) === Number(selectedClientId));
  const clientMatches = useMemo(() => clients.filter((client) => searchMatches(`${client.name} ${client.city} ${client.phone} ${client.email}`, clientSearch)).slice(0, 8), [clients, clientSearch]);
  const productMatches = useMemo(() => products.filter((product) => searchMatches(`${product.name} ${product.sku} ${product.barcode} ${product.brand} ${product.format}`, productSearch)).slice(0, 8), [products, productSearch]);
  const filteredClients = useMemo(() => clients.filter((client) => searchMatches(`${client.name} ${client.city} ${client.phone}`, clientListSearch)).slice(0, 40), [clients, clientListSearch]);
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const client = clients.find((item) => Number(item.id) === Number(order.client_id));
    return searchMatches(`${order.code} ${client?.name || ""} ${order.status || ""}`, orderListSearch);
  }), [clients, orders, orderListSearch]);
  const pendingOrders = orders.filter((order) => !STATUS_DONE.includes(String(order.status || "")));
  const todayOrders = orders.filter((order) => String(order.delivery_date || order.created_at || "").slice(0, 10) === today());
  const total = cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [clientRows, productRows, pointRows, orderRows] = await Promise.all([readList("clients"), readList("products"), readList("collection_points"), readList("orders")]);
      setClients(clientRows);
      setProducts(productRows);
      setPoints(pointRows);
      setOrders(orderRows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se han podido cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("excluvas.session") || sessionStorage.getItem("excluvas.session");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    void loadData();
  }, []);

  function openView(next: View) {
    setView(next);
    setMenuOpen(false);
    setMessage("");
    setError("");
  }

  function chooseClient(client: any) {
    setSelectedClientId(String(client.id));
    setClientSearch(client.name || "");
    setAddress(client.address || "");
    setPointId("");
  }

  function choosePoint(point: any) {
    if (!point) return;
    setPointId(String(point.id));
    setAddress(point.address || address);
  }

  function unitFactor(product: any, unit: Line["quantity_unit"]) {
    if (unit === "caja") return Math.max(1, Number(product?.units_per_case || 1));
    if (unit === "palet") return Math.max(1, Number(product?.units_per_pallet || Number(product?.units_per_case || 1) * 10));
    return 1;
  }

  function addLine() {
    if (!selectedProduct || quantity < 1) return;
    const factor = unitFactor(selectedProduct, quantityUnit);
    const requested = Math.max(1, Number(quantity));
    setCart((current) => {
      const existing = current.find((line) => line.product_id === selectedProduct.id && line.quantity_unit === quantityUnit);
      if (existing) return current.map((line) => line === existing ? { ...line, quantity_requested: line.quantity_requested + requested, quantity: line.quantity + requested * factor } : line);
      return [...current, { product_id: Number(selectedProduct.id), name: selectedProduct.name, quantity: requested * factor, quantity_requested: requested, quantity_unit: quantityUnit, units_factor: factor, unit_price: Number(selectedProduct.unit_price || 0) }];
    });
    setSelectedProduct(null);
    setProductSearch("");
    setQuantity(1);
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    if (!selectedClientId || !pointId || !deliveryDate || !cart.length) {
      setError("Completa cliente, lugar de entrega, fecha y al menos una línea de producto.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "X-Actor": actor }, body: JSON.stringify({ code: `COM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, client_id: Number(selectedClientId), collection_point_id: Number(pointId), address, delivery_date: deliveryDate, preparation_date: deliveryDate, status: "Nuevo", created_by: actor, notes, amount: total, lines: cart.map((line) => ({ product_id: line.product_id, quantity: line.quantity, quantity_requested: line.quantity_requested, quantity_unit: line.quantity_unit, units_factor: line.units_factor, unit_price: line.unit_price, amount: line.quantity * line.unit_price, vat: 21 })) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se ha podido guardar el pedido.");
      setMessage(`Pedido ${body.code || body.id || "nuevo"} creado correctamente.`);
      setCart([]);
      setNotes("");
      await loadData();
      setView("pedidos");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se ha podido guardar el pedido.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("excluvas.session");
    sessionStorage.removeItem("excluvas.session");
    window.location.reload();
  }

  return <main className="commercial-tablet-shell">
    <header className="commercial-tablet-topbar">
      <div className="commercial-tablet-brand"><span>E</span><div><b>Exclusivas</b><small>Ruta comercial</small></div></div>
      <span className="commercial-tablet-status"><i /> CRM conectado</span>
      <button type="button" className={`commercial-menu-button${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}><span /><span /><span /></button>
    </header>

    {menuOpen && <div className="commercial-tablet-menu" role="dialog" aria-label="Menú comercial">
      <div className="commercial-menu-user"><b>{user.username || "Usuario"}</b><small>{user.role === "admin" ? "Administrador" : "Comercial"}</small></div>
      <nav className="commercial-menu-links" aria-label="Secciones comerciales">
        {([["inicio", "Inicio", "Resumen de la ruta"], ["pedido", "Nuevo pedido", "Registrar una visita"], ["pedidos", "Mis pedidos", "Seguimiento y facturación"], ["clientes", "Clientes", "Ficha y contacto"], ["visitas", "Visitas", "Direcciones y actividad"]] as Array<[View, string, string]>).map(([key, label, hint]) => <button type="button" key={key} className={view === key ? "active" : ""} onClick={() => openView(key)}><b>{label}</b><small>{hint}</small><span>›</span></button>)}
      </nav>
      {user.role === "admin" && <button type="button" className="commercial-crm-link" onClick={() => { window.location.href = "/crm"; }}>Abrir CRM completo <span>↗</span></button>}
      <div className="commercial-menu-footer"><button type="button" onClick={logout}>Cerrar sesión</button><small>v2.0.21 · Producción</small></div>
    </div>}

    <section className="commercial-tablet-content">
      {loading && <div className="commercial-loading" role="status"><span className="loading-spinner" />Cargando datos de la ruta…</div>}
      {error && <div className="commercial-error" role="alert">{error}<button type="button" onClick={() => void loadData()}>Reintentar</button></div>}
      {message && <div className="commercial-message" role="status">{message}</div>}

      {view === "inicio" && <section className="commercial-dashboard">
        <div className="commercial-welcome"><div><p className="eyebrow">VISTA COMERCIAL · TABLET</p><h1>Hola, {user.username || "equipo"}</h1><p>Todo lo que necesitas para gestionar la ruta desde una sola pantalla.</p></div><button type="button" className="commercial-primary-action" onClick={() => openView("pedido")}>＋ Crear pedido</button></div>
        <div className="commercial-kpis"><article><small>PEDIDOS ABIERTOS</small><strong>{pendingOrders.length}</strong><span>pendientes de completar</span></article><article><small>ENTREGAS DE HOY</small><strong>{todayOrders.length}</strong><span>en la ruta de hoy</span></article><article><small>CLIENTES</small><strong>{clients.length}</strong><span>disponibles para visitar</span></article><article><small>PRODUCTOS</small><strong>{products.length}</strong><span>en el catálogo</span></article></div>
        <div className="commercial-dashboard-grid"><section className="commercial-panel"><div className="commercial-panel-head"><div><p className="eyebrow">SEGUIMIENTO</p><h2>Últimos pedidos</h2></div><button type="button" onClick={() => openView("pedidos")}>Ver todos</button></div>{orders.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} clients={clients} />)}{!orders.length && <p className="commercial-empty">Aún no hay pedidos para mostrar.</p>}</section><section className="commercial-panel commercial-quick-panel"><p className="eyebrow">ACCESOS RÁPIDOS</p><h2>¿Qué necesitas hacer?</h2><button type="button" onClick={() => openView("pedido")}><b>Crear un pedido</b><span>Cliente, productos y entrega <i>›</i></span></button><button type="button" onClick={() => openView("clientes")}><b>Buscar un cliente</b><span>Consulta sus datos y dirección <i>›</i></span></button><button type="button" onClick={() => openView("visitas")}><b>Preparar una visita</b><span>Revisa las direcciones de tu ruta <i>›</i></span></button></section></div>
      </section>}

      {view === "pedido" && <section className="commercial-order-view"><div className="commercial-section-head"><div><p className="eyebrow">NUEVO PEDIDO</p><h1>Registrar pedido</h1><p>Completa los datos de la visita y añade los productos solicitados.</p></div><button type="button" className="commercial-secondary-action" onClick={() => openView("inicio")}>← Volver</button></div><form className="commercial-order-form" onSubmit={submitOrder}><section className="commercial-form-card"><div className="commercial-form-title"><span>1</span><div><h2>Cliente y entrega</h2><p>Selecciona el cliente y el destino.</p></div></div><label>Cliente *<input value={clientSearch} onChange={(event) => { setClientSearch(event.target.value); setSelectedClientId(""); setPointId(""); }} placeholder="Buscar por nombre, ciudad o teléfono…" autoComplete="off" />{clientSearch && !selectedClient && <div className="commercial-suggestions">{clientMatches.length ? clientMatches.map((client) => <button type="button" key={client.id} onClick={() => chooseClient(client)}><b>{client.name}</b><small>{client.city || "Madrid"} · {client.phone || "Sin teléfono"}</small></button>) : <span>No hay clientes que coincidan.</span>}</div>}</label>{selectedClient && <div className="commercial-selected-client"><b>{selectedClient.name}</b><span>{selectedClient.city || "Madrid"} · {selectedClient.phone || "Sin teléfono"}</span><button type="button" onClick={() => { setSelectedClientId(""); setClientSearch(""); setPointId(""); }}>Cambiar</button></div>}{selectedClient && <label>Lugar de entrega *<select value={pointId} onChange={(event) => choosePoint(clientPoints.find((point) => String(point.id) === event.target.value))}><option value="">Selecciona una ubicación…</option>{clientPoints.map((point) => <option key={point.id} value={point.id}>{point.name || point.address || `Ubicación ${point.id}`}</option>)}</select></label>}<div className="commercial-form-grid"><label>Fecha de entrega *<input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></label><label>Dirección<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Se carga con la ubicación" /></label></div><label>Notas para reparto<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Horario o indicaciones para la entrega…" rows={3} /></label></section><section className="commercial-form-card"><div className="commercial-form-title"><span>2</span><div><h2>Productos</h2><p>Busca una referencia y añade las cantidades.</p></div></div><div className="commercial-product-add"><label>Producto<input value={productSearch} onChange={(event) => { setProductSearch(event.target.value); setSelectedProduct(null); }} placeholder="Nombre, referencia o código…" autoComplete="off" />{productSearch && !selectedProduct && <div className="commercial-suggestions">{productMatches.length ? productMatches.map((product) => <button type="button" key={product.id} onClick={() => { setSelectedProduct(product); setProductSearch(product.name || ""); }}><b>{product.name}</b><small>{product.sku || "Sin referencia"} · Stock {Number(product.stock || 0)}</small></button>) : <span>No hay productos que coincidan.</span>}</div>}</label><label className="commercial-quantity">Cantidad<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /></label><label>Formato<select value={quantityUnit} onChange={(event) => setQuantityUnit(event.target.value as Line["quantity_unit"])}><option value="unidad">Unidades</option><option value="caja">Cajas</option><option value="palet">Palés</option></select></label><button type="button" className="commercial-secondary-action" onClick={addLine} disabled={!selectedProduct}>Añadir</button></div><div className="commercial-cart">{cart.length ? cart.map((line, index) => <div className="commercial-cart-row" key={`${line.product_id}-${line.quantity_unit}`}><div><b>{line.name}</b><small>{line.quantity_requested} {unitLabel(line.quantity_unit, line.quantity_requested)}{line.units_factor > 1 ? ` · ${line.quantity} unidades` : ""}</small></div><strong>{euro(line.quantity * line.unit_price)}</strong><button type="button" aria-label={`Quitar ${line.name}`} onClick={() => setCart((current) => current.filter((_, lineIndex) => lineIndex !== index))}>×</button></div>) : <p className="commercial-empty">Añade al menos un producto para continuar.</p>}</div><div className="commercial-order-total"><span>Total previsto</span><strong>{euro(total)}</strong></div></section><div className="commercial-form-actions"><button type="button" className="commercial-secondary-action" onClick={() => openView("inicio")}>Cancelar</button><button type="submit" className="commercial-primary-action" disabled={saving}>{saving ? "Guardando pedido…" : "Guardar pedido"}</button></div></form></section>}

      {view === "pedidos" && <section className="commercial-list-view"><ListHead eyebrow="SEGUIMIENTO" title="Mis pedidos" description="Consulta el estado de los pedidos de tu cartera." search={orderListSearch} onSearch={setOrderListSearch} action="＋ Nuevo pedido" onAction={() => openView("pedido")} /><div className="commercial-list-card">{filteredOrders.map((order) => <OrderRow key={order.id} order={order} clients={clients} detailed />)}{!filteredOrders.length && <p className="commercial-empty">No hay pedidos que coincidan.</p>}</div></section>}

      {view === "clientes" && <section className="commercial-list-view"><ListHead eyebrow="CARTERA COMERCIAL" title="Clientes" description={`${clients.length} clientes disponibles para la ruta.`} search={clientListSearch} onSearch={setClientListSearch} action="Actualizar" onAction={() => void loadData()} /><div className="commercial-client-grid">{filteredClients.map((client) => <article className="commercial-client-card" key={client.id}><span className="commercial-avatar">{String(client.name || "?").slice(0, 1).toUpperCase()}</span><div><h2>{client.name || "Cliente sin nombre"}</h2><p>{client.city || "Ciudad no indicada"}</p><small>{client.phone || "Teléfono no indicado"}</small></div><button type="button" onClick={() => { chooseClient(client); openView("pedido"); }}>Crear pedido <span>›</span></button></article>)}{!filteredClients.length && <p className="commercial-empty">No hay clientes que coincidan.</p>}</div></section>}

      {view === "visitas" && <section className="commercial-list-view"><ListHead eyebrow="RUTA COMERCIAL" title="Visitas" description="Direcciones de tus clientes para preparar la jornada." search={clientListSearch} onSearch={setClientListSearch} action="Actualizar" onAction={() => void loadData()} /><div className="commercial-visits-list">{filteredClients.map((client, index) => <article key={client.id}><span className="commercial-visit-number">{index + 1}</span><div><h2>{client.name || "Cliente sin nombre"}</h2><p>{client.address || "Dirección no indicada"}</p><small>{client.city || "Ciudad no indicada"} · {client.phone || "Sin teléfono"}</small></div><button type="button" onClick={() => { chooseClient(client); openView("pedido"); }}>Pedido <span>›</span></button></article>)}{!filteredClients.length && <p className="commercial-empty">No hay visitas que mostrar.</p>}</div></section>}
    </section>
  </main>;
}

function OrderRow({ order, clients, detailed = false }: { order: any; clients: any[]; detailed?: boolean }) {
  const client = clients.find((item) => Number(item.id) === Number(order.client_id));
  const status = String(order.status || "Pendiente");
  const billing = String(order.billing_status || "").toLowerCase().includes("fact") ? "Facturado" : "Sin facturar";
  return <article className={`commercial-order-row${detailed ? " detailed" : ""}`}><span className="commercial-order-icon">▤</span><div><b>{order.code || `Pedido ${order.id}`}</b><h3>{client?.name || "Cliente no indicado"}</h3><small>Entrega {formatDate(order.delivery_date || order.created_at)} · {billing}</small></div><span className={`commercial-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span><strong>{euro(Number(order.amount || 0))}</strong></article>;
}

function ListHead({ eyebrow, title, description, search, onSearch, action, onAction }: { eyebrow: string; title: string; description: string; search: string; onSearch: (value: string) => void; action: string; onAction: () => void }) {
  return <div className="commercial-list-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><div className="commercial-list-tools"><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar…" aria-label={`Buscar en ${title}`} /><button type="button" className="commercial-secondary-action" onClick={onAction}>{action}</button></div></div>;
}
