"use client";
import { useEffect, useRef, useState } from "react";
const ASSISTANT_HEADERS = { "Content-Type": "application/json", "X-Actor": "Asistente" };
type AdminOperation = "consultar" | "crear" | "editar" | "eliminar" | "recuperar" | "convertir";
type AdminRequest = { operation: AdminOperation; resource: string; id?: number | string; payload?: Record<string, unknown>; endpoint?: string };
type VisualFormIntent = {
  action?: string;
  resource?: string;
  section?: string;
  data?: Record<string, unknown>;
  missing?: string[];
  confidence?: Record<string, number>;
  notes?: string[];
};
const ADMIN_RESOURCES: Record<string, string> = {
  clientes: "clients", contactos: "clients", productos: "products", pedidos: "orders", presupuestos: "quotes",
  facturas: "invoices", proformas: "invoices", albaranes: "delivery_notes", envios: "shipments", proveedores: "suppliers",
  compras: "purchase_orders", cobros: "payments", devoluciones: "returns", notas: "notes", gastos: "expenses", tickets: "expenses",
  almacenes: "warehouses", "lugares de recogida": "collection_points", "movimientos de stock": "inventory_movements",
  tareas: "scheduled_tasks", documentos: "document_templates", plantillas: "document_templates", usuarios: "users",
};
const ADMIN_SENSITIVE = new Set<AdminOperation>(["crear", "editar", "eliminar", "recuperar", "convertir"]);
function adminResource(value: string) { return ADMIN_RESOURCES[value.toLocaleLowerCase().trim()] || value.toLocaleLowerCase().trim(); }
function adminOperationNeedsConfirmation(operation: AdminOperation) { return ADMIN_SENSITIVE.has(operation); }
const VISUAL_RESOURCES: Record<string, string> = {
  invoices: "Facturas",
  expenses: "Gastos y tickets",
  orders: "Pedidos",
  products: "Productos",
  clients: "Clientes",
  quotes: "Presupuestos",
  notes: "Notas",
};
function parseVisualIntent(answer: string): VisualFormIntent {
  const cleaned = answer.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("El asistente no devolvió una acción estructurada.");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as VisualFormIntent;
  if (!parsed || parsed.action !== "open_form") throw new Error("La captura no se ha podido convertir en un formulario.");
  const resource = String(parsed.resource || "").toLowerCase();
  if (!VISUAL_RESOURCES[resource]) throw new Error("No he identificado si la captura corresponde a una factura, gasto, pedido o producto.");
  return { ...parsed, resource, section: VISUAL_RESOURCES[resource], data: parsed.data && typeof parsed.data === "object" ? parsed.data : {} };
}
function assistantResponseText(body: any) {
  return body.output_text || body.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || body.choices?.[0]?.message?.content || "";
}
const ASSISTANT_GREETINGS = [
  "¡Hola! 😊 ¿Qué necesitas consultar hoy?",
  "¡Buenas! Estoy listo para ayudarte con el CRM 😄",
  "¡Hola! Dime qué necesitas y lo buscamos juntos.",
  "¡Buenas! Luisito al aparato ☕ ¿Empezamos revisando pedidos, clientes o stock?",
  "¡Qué tal! Hoy estoy despejado y listo para echarte una mano 😌",
  "¡Hola! Cuéntame qué quieres consultar o preparar.",
  "Tranquilo, vamos paso a paso para consultar la información del CRM.",
  "¡Ey! Todo listo por aquí. ¿Qué revisamos?",
  "Puedo buscar información del CRM y ayudarte a encontrar lo que necesitas.",
  "¡Qué tal! Dime por dónde empezamos.",
];
function randomAssistantGreeting() {
  return ASSISTANT_GREETINGS[Math.floor(Math.random() * ASSISTANT_GREETINGS.length)];
}
export default function AssistantWidget() {
  const [publicPortal, setPublicPortal] = useState(false);
  const [open, setOpen] = useState(false);
  const [large, setLarge] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [messagesReady, setMessagesReady] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 380, height: 480 });
  const [greeting, setGreeting] = useState(ASSISTANT_GREETINGS[0]);
  const [messages, setMessages] = useState([ASSISTANT_GREETINGS[0]]);
  const [config, setConfig] = useState<any>(null);
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const session = localStorage.getItem("excluvas.session") || sessionStorage.getItem("excluvas.session");
      const currentUser = session ? JSON.parse(session) : null;
      setAdminAllowed(currentUser?.role === "admin");
    } catch { setAdminAllowed(false); }
    let restored = false;
    try {
      const savedMessages = JSON.parse(localStorage.getItem("excluvas.assistant.messages.v2") || "null");
      if (Array.isArray(savedMessages) && savedMessages.length) {
        setMessages(savedMessages.filter((message): message is string => typeof message === "string").slice(-80));
        restored = true;
      }
    } catch {}
    if (!restored) {
      const nextGreeting = randomAssistantGreeting();
      setGreeting(nextGreeting);
      setMessages([nextGreeting]);
    }
    setMessagesReady(true);
    setPublicPortal(window.location.pathname === "/portal-pedidos");
    function loadConfig(event?: Event) {
      try {
        const detail = (event as CustomEvent<any>)?.detail;
        setConfig(detail || JSON.parse(localStorage.getItem("excluvas.home") || "{}"));
      } catch {}
    }
    loadConfig();
    window.addEventListener("excluvas-config-changed", loadConfig);
    return () => window.removeEventListener("excluvas-config-changed", loadConfig);
  }, []);
  useEffect(() => {
    if (messagesReady) localStorage.setItem("excluvas.assistant.messages.v2", JSON.stringify(messages.slice(-80)));
  }, [messages, messagesReady]);
  /*
   * El micrófono usa el reconocimiento integrado del navegador: transcribe
   * el mensaje en español y lo envía por el mismo circuito que el teclado.
   */
  useEffect(() => {
    try {
      setConfig(JSON.parse(localStorage.getItem("excluvas.home") || "{}"));
    } catch {}
  }, []);
  function selectImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessages((m) => [...m, "Adjunta una captura de pantalla en formato de imagen."]);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessages((m) => [...m, "La captura no puede superar 8 MB."]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageFile(file);
      setImageDataUrl(String(reader.result || ""));
    };
    reader.onerror = () => setMessages((m) => [...m, "No he podido leer la captura. Prueba con otra imagen."]);
    reader.readAsDataURL(file);
  }
  async function analyzeImage() {
    if (!imageDataUrl || imageBusy || busy) return;
    let runtimeConfig = config;
    try { runtimeConfig = { ...config, ...JSON.parse(localStorage.getItem("excluvas.home") || "{}") }; } catch {}
    if (!runtimeConfig?.apiKey) {
      setMessages((m) => [...m, "Para analizar capturas, abre ⚙ y añade una API key y un modelo con visión."]);
      return;
    }
    const prompt = `Analiza esta captura de pantalla de un documento del CRM de Exclusivas Inteligentes. No guardes datos ni ejecutes cambios. Identifica una sola entidad entre invoices, expenses, orders, products, clients, quotes o notes y devuelve SOLO un JSON válido, sin markdown, con esta forma: {"action":"open_form","resource":"invoices|expenses|orders|products|clients|quotes|notes","data":{},"missing":[],"confidence":{},"notes":[]}. Usa estos nombres de campo cuando correspondan: invoices code, client_name, issue_date YYYY-MM-DD, due_date YYYY-MM-DD, amount, vat, status, notes; expenses code, vendor, expense_date YYYY-MM-DD, category, amount, vat, payment_method, notes; products name, sku, description, category, unit, cost_price, unit_price, stock; clients name, phone, email, address, city; quotes code, client_name, valid_until YYYY-MM-DD, amount, notes; orders code, client_name, delivery_date YYYY-MM-DD, notes; notes title, content, priority, module. No inventes valores dudosos: incluye los campos ausentes o inciertos en missing y asigna una confianza entre 0 y 1 por campo en confidence. Si no puedes identificar una entidad con seguridad, usa notes para explicarlo y elige la más probable.`;
    setImageBusy(true);
    setMessages((m) => [...m, `Captura: ${imageFile?.name || "imagen adjunta"}`]);
    try {
      const base = (runtimeConfig.endpoint || "https://api.openai.com/v1").replace(/\/$/, "");
      const isGemini = runtimeConfig.provider === "Gemini";
      const imageBase64 = imageDataUrl.split(",")[1] || "";
      const url = isGemini
        ? `${base}/models/${runtimeConfig.model || "gemini-2.5-flash"}:generateContent?key=${encodeURIComponent(runtimeConfig.apiKey)}`
        : base + (runtimeConfig.provider === "OpenAI" ? "/responses" : "/chat/completions");
      const body = isGemini
        ? { contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: imageFile?.type || "image/png", data: imageBase64 } }] }] }
        : runtimeConfig.provider === "OpenAI"
          ? { model: runtimeConfig.model || "gpt-5", input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: imageDataUrl, detail: "high" }] }] }
          : { model: runtimeConfig.model || "llama3.1", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageDataUrl } }] }] };
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(isGemini ? {} : { Authorization: `Bearer ${runtimeConfig.apiKey}` }) },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error?.message || result.error?.status || "El proveedor no ha podido analizar la captura.");
      const intent = parseVisualIntent(assistantResponseText(result));
      window.dispatchEvent(new CustomEvent("excluvas:assistant-form", { detail: intent }));
      const missing = intent.missing?.length ? ` Faltan por revisar: ${intent.missing.join(", ")}.` : "";
      setMessages((m) => [...m, `He preparado ${intent.section || "el formulario"} con los datos detectados. Revísalos en la modal antes de guardar.${missing}`]);
      setImageFile(null);
      setImageDataUrl("");
      if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (error: any) {
      setMessages((m) => [...m, error.message || "No he podido interpretar la captura. Puedes probar con una imagen más nítida."]);
    } finally {
      setImageBusy(false);
    }
  }
  async function send(value = text) {
    if (!value.trim() || busy) return;
    const q = value.trim();
    const normalized = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const api = async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`/api/${path}`, { ...options, headers: { ...ASSISTANT_HEADERS, ...(options.headers || {}) } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `No se pudo completar ${path}`);
        return body;
      };
      const executeAdminOperation = async (request: AdminRequest) => {
        const resource = adminResource(request.resource);
        if (!resource) throw new Error("No he identificado la sección del CRM");
        if (request.operation === "consultar") return api(resource);
        if (request.operation === "crear") return api(resource, { method: "POST", body: JSON.stringify(request.payload || {}) });
        if (request.operation === "editar") {
          if (request.id === undefined) throw new Error("Necesito identificar el registro que quieres editar");
          return api(`${resource}/${request.id}`, { method: "PUT", body: JSON.stringify(request.payload || {}) });
        }
        if (request.operation === "eliminar") {
          if (request.id === undefined) throw new Error("Necesito identificar el registro que quieres eliminar");
          return api(`${resource}/${request.id}`, { method: "DELETE" });
        }
        if (request.operation === "recuperar") return api("trash/restore", { method: "POST", body: JSON.stringify({ table: resource, id: request.id }) });
        if (request.endpoint) return api(request.endpoint, { method: "POST", body: JSON.stringify(request.payload || {}) });
        throw new Error("Esta operación todavía no está disponible para esa sección");
      };
    let runtimeConfig = config;
    try { runtimeConfig = { ...config, ...JSON.parse(localStorage.getItem("excluvas.home") || "{}") }; } catch {}
    setText("");
    setMessages((m) => [...m, `Tú: ${q}`]);
      const lower = normalized;
      const adjustLine = lower.match(/(?:quita|quitar|reduce|reducir|resta) (\d+(?:[.,]\d+)?)\u0020(unidades?|cajas?|packs?|palets?)?(?:\s+de\s+(?:las?\s+)?(?:\d+\s+)?(?:unidades?|cajas?|packs?|palets?)?\s*(?:del\s+producto\s+)?(.+?))?(?:\s+del\s+pedido(?:\s+([a-z0-9-]+))?)?[.!?]*$/i);
      if (adjustLine) {
        const amount = Number(String(adjustLine[1]).replace(",", "."));
        const unit = String(adjustLine[2] || "unidades").toLowerCase();
        const productQuery = String(adjustLine[3] || "").trim();
        const orderIdentifier = String(adjustLine[4] || "").trim();
        const deltaUnits = -amount;
        const requestAdjustment = async (confirm = false) => api("assistant/adjust-order-line", { method: "POST", body: JSON.stringify({ order_identifier: orderIdentifier, product_query: productQuery, delta_units: deltaUnits, requested_unit: unit, confirm }) });
        try {
          const result = await requestAdjustment(false);
          if (result.requires_confirmation) {
            const preview = result.preview;
            setMessages((m) => [...m, `He localizado ${preview.product} en el pedido ${preview.order_code}. Ahora tiene ${preview.current_quantity} ${preview.quantity_unit} y pasaría a ${preview.proposed_quantity} ${preview.quantity_unit}. Escribe “confirmar ajuste” para aplicarlo.`]);
          } else if (result.choices) {
            setMessages((m) => [...m, `Necesito que me indiques cuál de estas opciones quieres modificar: ${result.choices.map((choice: any) => `${choice.code || choice.product} (${choice.quantity || 0})`).join(", ")}.`]);
          }
        } catch (error: any) { setMessages((m) => [...m, error.message || "No he podido preparar el ajuste."]); }
        return;
      }
      if (/^confirmar\s+ajuste\b/i.test(lower)) {
        try {
          const previous = [...messages].reverse().find((message) => message.includes("Escribe “confirmar ajuste”"));
          if (!previous) { setMessages((m) => [...m, "No tengo un ajuste pendiente para confirmar."]); return; }
          const result = await api("assistant/adjust-order-line", { method: "POST", body: JSON.stringify({ delta_units: Number(previous.match(/pasaría a ([\d.,]+)/)?.[1]?.replace(".", "").replace(",", ".") || 0) - Number(previous.match(/Ahora tiene ([\d.,]+)/)?.[1]?.replace(".", "").replace(",", ".") || 0), product_query: previous.split("He localizado ")[1]?.split(" en el pedido")[0] || "", order_identifier: previous.match(/pedido ([A-Z0-9-]+)/i)?.[1] || "", confirm: true }) });
          setMessages((m) => [...m, result.ok ? `Hecho. ${result.preview.product} queda en ${result.preview.final_quantity} ${result.preview.quantity_unit}. La reserva y el importe del pedido se han actualizado.` : (result.error || "No se pudo aplicar el ajuste.")]);
        } catch (error: any) { setMessages((m) => [...m, error.message || "No he podido aplicar el ajuste."]); }
        return;
      }
      const genericDelete = lower.match(/^confirmar\s+(?:eliminar|borrar|borrado)\s+(cliente|producto|pedido|presupuesto|factura|proforma|albaran|albaranes|envio|proveedor|compra|cobro|devolucion|nota|gasto|almacen|tarea|documento|usuario)\s+(.+)$/i);
      if (genericDelete) {
        const resourceName = genericDelete[1];
        const resource = adminResource(resourceName);
        const needle = genericDelete[2].trim().replace(/[.!?]+$/, "");
        const records = await executeAdminOperation({ operation: "consultar", resource });
        const list = Array.isArray(records) ? records : [];
        const row = list.find((item: any) => String(item.id) === needle || String(item.code || "").toLowerCase() === needle.toLowerCase() || String(item.name || "").toLowerCase() === needle.toLowerCase() || String(item.title || "").toLowerCase() === needle.toLowerCase());
        if (!row) { setMessages((m) => [...m, `No encuentro ese registro en ${resourceName}.`]); return; }
        const deleted = await executeAdminOperation({ operation: "eliminar", resource, id: row.id });
        setMessages((m) => [...m, deleted?.ok === false ? "No se pudo eliminar el registro." : `Registro ${row.code || row.name || row.title || `#${row.id}`} eliminado correctamente. Puedes recuperarlo desde la papelera.`]);
        return;
      }
      const deleteRequest = lower.match(/^(?:elimina|eliminar|borra|borrar)\s+(cliente|producto|pedido|presupuesto|factura|proforma|albaran|albaranes|envio|proveedor|compra|cobro|devolucion|nota|gasto|almacen|tarea|documento|usuario)\s+(.+)$/i);
      if (deleteRequest) {
        setMessages((m) => [...m, `Esta acción eliminará el registro ${deleteRequest[2].trim()}. Para confirmarla escribe: confirmar eliminar ${deleteRequest[1]} ${deleteRequest[2].trim()}`]);
        return;
      }
      const genericEdit = lower.match(/^(?:editar|cambiar|actualizar)\s+(cliente|producto|pedido|presupuesto|factura|proforma|albaran|envio|proveedor|compra|cobro|devolucion|nota|gasto|almacen|tarea|documento|usuario)\s+(\S+)\s+(\w+)\s+(?:a|por)\s+(.+)$/i);
      const confirmedEdit = lower.match(/^confirmar\s+(?:editar|cambiar|actualizar)\s+(cliente|producto|pedido|presupuesto|factura|proforma|albaran|envio|proveedor|compra|cobro|devolucion|nota|gasto|almacen|tarea|documento|usuario)\s+(\S+)\s+(\w+)\s+(?:a|por)\s+(.+)$/i);
      if (genericEdit || confirmedEdit) {
        const match = confirmedEdit || genericEdit;
        const [, resourceName, identifier, field, value] = match!;
        const resource = adminResource(resourceName);
        const records = await executeAdminOperation({ operation: "consultar", resource });
        const list = Array.isArray(records) ? records : [];
        const row = list.find((item: any) => String(item.id) === identifier || String(item.code || "").toLowerCase() === identifier.toLowerCase() || String(item.name || "").toLowerCase() === identifier.toLowerCase());
        if (!row) { setMessages((m) => [...m, `No encuentro ese registro en ${resourceName}.`]); return; }
        if (!confirmedEdit) { setMessages((m) => [...m, `Voy a cambiar ${field} de ${row.code || row.name || `#${row.id}`} a “${value}”. Para confirmarlo escribe: confirmar editar ${resourceName} ${identifier} ${field} a ${value}`]); return; }
        const updated = await executeAdminOperation({ operation: "editar", resource, id: row.id, payload: { [field]: value } });
        setMessages((m) => [...m, updated?.id ? `Registro ${row.code || row.name || `#${row.id}`} actualizado correctamente.` : "No se pudo actualizar el registro."]);
        return;
      }
      const genericCreate = lower.match(/^(crear|crea|añadir|anadir)\s+(cliente|producto|pedido|presupuesto|factura|proforma|albaran|envio|proveedor|compra|cobro|devolucion|nota|gasto|almacen|tarea|documento)\s+(.+)$/i);
      const confirmedCreate = lower.match(/^confirmar\s+(crear|crea|añadir|anadir)\s+(cliente|producto|pedido|presupuesto|factura|proforma|albaran|envio|proveedor|compra|cobro|devolucion|nota|gasto|almacen|tarea|documento)\s+(.+)$/i);
      if (genericCreate || confirmedCreate) {
        const match = confirmedCreate || genericCreate;
        const resourceName = match![2];
        const resource = adminResource(resourceName);
        const rawFields = match![3].trim();
        const payload: Record<string, unknown> = {};
        rawFields.split(/\s+(?=[a-z_áéíóúñ]+\s*=)/i).forEach((part) => {
          const separator = part.indexOf("=");
          if (separator > 0) payload[part.slice(0, separator).trim().replace(/[áéíóúñ]/g, (char) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n" }[char] || char))] = part.slice(separator + 1).trim();
        });
        if (!Object.keys(payload).length) payload.name = rawFields;
        if (!confirmedCreate) {
          setMessages((m) => [...m, `Voy a crear un registro en ${resourceName} con ${Object.entries(payload).map(([key, value]) => `${key}=${value}`).join(", ")}. Para confirmarlo escribe: confirmar crear ${resourceName} ${rawFields}`]);
          return;
        }
        if (resource === "invoices" && resourceName.toLowerCase() === "proforma") payload.status = "Proforma";
        const created = await executeAdminOperation({ operation: "crear", resource, payload });
        setMessages((m) => [...m, created?.id ? `Registro creado correctamente en ${resourceName}: ${created.code || created.name || `#${created.id}`}.` : "No se pudo crear el registro."]);
        return;
      }
      const linesQuestion = lower.match(/(?:que contiene|lineas|líneas|productos de)\s+(?:la\s+)?(factura|proforma|presupuesto|pedido|albaran|albarán)\s+([a-z0-9-]+)/i);
      if (linesQuestion) {
        const typeMap: Record<string, { resource: string; lines: string; foreign: string }> = {
          factura: { resource: "invoices", lines: "invoice_lines", foreign: "invoice_id" },
          proforma: { resource: "invoices", lines: "invoice_lines", foreign: "invoice_id" },
          presupuesto: { resource: "quotes", lines: "quote_lines", foreign: "quote_id" },
          pedido: { resource: "orders", lines: "order_lines", foreign: "order_id" },
          albaran: { resource: "delivery_notes", lines: "delivery_note_lines", foreign: "delivery_note_id" },
          "albarán": { resource: "delivery_notes", lines: "delivery_note_lines", foreign: "delivery_note_id" },
        };
        const kind = typeMap[linesQuestion[1].toLowerCase()];
        const records = await executeAdminOperation({ operation: "consultar", resource: kind.resource });
        const identifier = linesQuestion[2].toLowerCase();
        const document = (Array.isArray(records) ? records : []).find((item: any) => String(item.id) === identifier || String(item.code || "").toLowerCase() === identifier);
        if (!document) { setMessages((m) => [...m, `No encuentro ese ${linesQuestion[1]}.`]); return; }
        const allLines = await executeAdminOperation({ operation: "consultar", resource: kind.lines });
        const lines = (Array.isArray(allLines) ? allLines : []).filter((line: any) => Number(line[kind.foreign]) === Number(document.id));
        const summary = lines.map((line: any) => `${line.product_name || `Producto #${line.product_id}`} · ${line.quantity || 0} × ${Number(line.unit_price || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`).join("; ");
        setMessages((m) => [...m, `${linesQuestion[1]} ${document.code || `#${document.id}`}: ${lines.length} líneas. ${summary || "No tiene líneas de productos."}`]); return;
      }
      const addLine = lower.match(/^(confirmar\s+)?(?:añadir|anadir|agregar)\s+linea\s+a\s+(factura|proforma|presupuesto|pedido|albaran|albarán)\s+([a-z0-9-]+)\s+producto\s+([^\s]+)\s+cantidad\s+(\d+(?:[.,]\d+)?)(?:\s+precio\s+(\d+(?:[.,]\d+)?))?$/i);
      if (addLine) {
        const confirmed = Boolean(addLine[1]);
        const kind = addLine[2].toLowerCase();
        const typeMap: Record<string, { resource: string; lines: string; foreign: string }> = {
          factura: { resource: "invoices", lines: "invoice_lines", foreign: "invoice_id" },
          proforma: { resource: "invoices", lines: "invoice_lines", foreign: "invoice_id" },
          presupuesto: { resource: "quotes", lines: "quote_lines", foreign: "quote_id" },
          pedido: { resource: "orders", lines: "order_lines", foreign: "order_id" },
          albaran: { resource: "delivery_notes", lines: "delivery_note_lines", foreign: "delivery_note_id" },
          "albarán": { resource: "delivery_notes", lines: "delivery_note_lines", foreign: "delivery_note_id" },
        };
        const documentType = typeMap[kind];
        const documents = await executeAdminOperation({ operation: "consultar", resource: documentType.resource });
        const document = (Array.isArray(documents) ? documents : []).find((item: any) => String(item.id) === addLine[3] || String(item.code || "").toLowerCase() === addLine[3].toLowerCase());
        const products = await executeAdminOperation({ operation: "consultar", resource: "products" });
        const product = (Array.isArray(products) ? products : []).find((item: any) => String(item.id) === addLine[4] || String(item.name || "").toLowerCase() === addLine[4].toLowerCase());
        if (!document || !product) { setMessages((m) => [...m, `No encuentro el ${!document ? kind : "producto"} indicado.`]); return; }
        const quantity = Number(addLine[5].replace(",", "."));
        const unitPrice = Number(String(addLine[6] || product.unit_price || 0).replace(",", "."));
        const endpointPayload = { [documentType.foreign]: document.id, product_id: product.id, quantity, unit_price: unitPrice, amount: quantity * unitPrice, vat: 21 };
        if (!confirmed) { setMessages((m) => [...m, `Voy a añadir ${quantity} unidades de ${product.name} al ${kind} ${document.code || `#${document.id}`} por ${unitPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}. Para confirmar escribe la misma orden comenzando por “confirmar”.`]); return; }
        const created = await executeAdminOperation({ operation: "crear", resource: documentType.lines, payload: endpointPayload });
        setMessages((m) => [...m, created?.id ? `Línea añadida correctamente al ${kind} ${document.code || `#${document.id}`}.` : "No se pudo añadir la línea."]); return;
      }
      const casualGreeting = /^(hola|buenas|buenos dias|buenas tardes|que tal|como estas|como te va|hey)\b/.test(lower);
      const generalQuestion = /(horoscopo|horóscopo|clima|tiempo|receta|musica|música|pelicula|película|deporte|deportes|historia|capital de|que significa|qué significa)/i.test(lower);
      if (casualGreeting && !generalQuestion && !/(pedido|cliente|producto|stock|factura|presupuesto|crm|tarea|nota|envio|contacto)/.test(lower)) {
        const replies = [
          "¡Hola! Muy bien, gracias 😊 ¿Qué necesitas consultar?",
          "¡Buenas! Todo en orden por aquí 😄 ¿En qué te ayudo?",
          "¡Hola! Estoy listo para echarte una mano. ¿Qué quieres revisar?",
        ];
        setMessages((m) => [...m, replies[Math.floor(Math.random() * replies.length)]]);
        return;
      }
      const scheduleMatch = lower.match(/(?:programa|programar|agenda|agendar|recuerdame|recuérdame)\s+(?:(?:para|dentro de)\s+)?(.+)/i);
      if (scheduleMatch) {
        const request = scheduleMatch[1].trim();
        const recurring = request.match(/cada\s+(dia|día|semana|lunes|martes|miercoles|miércoles|jueves|viernes|sábado|sabado|domingo)/i);
        const minutes = request.match(/(?:dentro de|en)\s+(\d+)\s+minutos?/i);
        const next = minutes ? new Date(Date.now() + Number(minutes[1]) * 60000) : request.includes("mañana") || request.includes("manana") ? new Date(Date.now() + 86400000) : new Date(Date.now() + 3600000);
        const cleanAction = request.replace(/^(?:mañana|manana|hoy|cada\s+\w+|dentro de\s+\d+\s+minutos?)\s*/i, "").trim();
        const actionText = /nota|recordatorio/i.test(cleanAction) ? cleanAction : `nota: ${cleanAction}`;
        const task = await fetch("/api/scheduled_tasks", { method: "POST", headers: ASSISTANT_HEADERS, body: JSON.stringify({ title: cleanAction.slice(0, 80) || "Tarea del asistente", action_text: actionText, schedule_type: recurring ? "Recurrente" : "Unica", recurrence: recurring ? recurring[1] : "", next_run: next.toISOString(), status: "Activa", created_by: "Asistente" }) }).then((r) => r.json());
        if (task.id) { setMessages((m) => [...m, `Tarea programada correctamente: ${task.title}. ${recurring ? `Se repetirá cada ${recurring[1]}.` : `Se ejecutará el ${next.toLocaleString("es-ES")}.`}`]); return; }
      }
      const historyQuestion = /(historial|auditoria|auditoría|movimientos|actividad registrada|que ha hecho|qué ha hecho)/i.test(lower);
      if (historyQuestion) {
        const actorQuery = lower.includes("asistente") ? "Asistente" : lower.includes("jose") ? "Jose" : lower.includes("luis") ? "Luis" : "";
        const history = await fetch(`/api/audit_logs?actor=${encodeURIComponent(actorQuery)}`, { headers: { "X-Audit-Query": "true", "X-Actor": "Asistente" } }).then((r) => r.json());
        const rows = (Array.isArray(history) ? history : []).slice(0, 8);
        const summary = rows.map((x: any) => `${new Date(x.created_at).toLocaleString("es-ES")} · ${x.actor} · ${x.action} · ${x.resource}`).join("; ");
        setMessages((m) => [...m, rows.length ? `Últimos movimientos${actorQuery ? ` de ${actorQuery}` : ""}: ${summary}` : `No hay movimientos registrados${actorQuery ? ` de ${actorQuery}` : ""}.`]); return;
      }
      const deleteRecentProducts = lower.match(/(?:elimina|eliminar|borra|borrar|quita|quitar)\s+(?:todos?\s+)?(?:los\s+)?productos?.*?(?:ultimos?|últimos?)\s+(\d+)\s+minutos?/i);
      if (deleteRecentProducts) {
        const minutes = Math.max(1, Math.min(1440, Number(deleteRecentProducts[1])));
        const products = await fetch("/api/products").then((r) => r.json());
        const cutoff = Date.now() - minutes * 60 * 1000;
        const candidates = (Array.isArray(products) ? products : []).filter((p: any) => p.created_by === "asistente" && p.created_at && new Date(p.created_at).getTime() >= cutoff);
        let removed = 0;
        for (const product of candidates) {
          try {
            const result = await fetch(`/api/products/${product.id}`, { method: "DELETE", headers: ASSISTANT_HEADERS }).then((r) => r.json());
            if (result.ok) removed++;
          } catch {}
        }
        setMessages((m) => [...m, removed ? `He eliminado ${removed} productos creados por el asistente en los últimos ${minutes} minutos.` : `No he encontrado productos creados por el asistente en los últimos ${minutes} minutos.`]); return;
      }
      const bulkProducts = lower.match(/(?:anade|añade|crea|crear|genera|generar)\s+(\d+)\s+productos?(?:\s+nuevos?)?(?:\s+de\s+ejemplo)?/i);
      if (bulkProducts) {
        const count = Math.max(1, Math.min(50, Number(bulkProducts[1])));
        const families = ["Agua", "Refrescos", "Cervezas", "Vinos", "Zumos"];
        const formats = ["Caja 6", "Caja 12", "Caja 24", "Pack 6", "Botella 1L"];
        const created: any[] = [];
        for (let i = 0; i < count; i++) {
          const family = families[i % families.length], name = `${family} Exclusivas ${String(i + 1).padStart(2, "0")}`;
          const cost = Number((1.5 + i * 0.37).toFixed(2)), price = Number((cost * 1.35).toFixed(2));
          const d = await fetch("/api/products", { method: "POST", headers: ASSISTANT_HEADERS, body: JSON.stringify({ name, sku: `EX-${Date.now().toString().slice(-5)}-${i + 1}`, barcode: `843700${Date.now().toString().slice(-6)}${i}`, supplier_ref: `PROV-${i + 1}`, category: family, brand: "Exclusivas", format: formats[i % formats.length], unit: "caja", units_per_case: 6, cost_price: cost, unit_price: price, markup_percent: 35, margin_percent: 35, vat: 21, stock: 20 + i * 5, stock_reserved: 0, min_stock: 5, created_at: new Date().toISOString(), created_by: "asistente" }) }).then((r) => r.json());
          if (d.id) created.push(d);
        }
        setMessages((m) => [...m, `He creado ${created.length} productos de ejemplo completos en la base de datos. Puedes verlos en Productos.`]); return;
      }
      // Enrutador local general: las consultas del CRM no dependen del modelo externo.
      const resourceDefinitions = [
        { words: ["pedido", "pedidos", "encargo", "encargos"], api: "orders", label: "pedidos" },
        { words: ["cliente", "clientes", "contacto", "contactos"], api: "clients", label: "clientes" },
        { words: ["producto", "productos", "articulo", "articulos", "artículo", "artículos"], api: "products", label: "productos" },
        { words: ["factura", "facturas"], api: "invoices", label: "facturas" },
        { words: ["presupuesto", "presupuestos"], api: "quotes", label: "presupuestos" },
        { words: ["albaran", "albaranes"], api: "delivery_notes", label: "albaranes" },
        { words: ["envio", "envios", "envío", "envíos"], api: "shipments", label: "envíos" },
        { words: ["proveedor", "proveedores"], api: "suppliers", label: "proveedores" },
        { words: ["compra", "compras"], api: "purchase_orders", label: "compras" },
        { words: ["cobro", "cobros", "pago", "pagos"], api: "payments", label: "cobros" },
        { words: ["devolucion", "devoluciones", "devolución"], api: "returns", label: "devoluciones" },
        { words: ["whatsapp", "mensaje", "mensajes", "conversacion", "conversaciones", "audio", "audios"], api: "whatsapp_messages", label: "mensajes de WhatsApp" },
        { words: ["nota", "notas"], api: "notes", label: "notas" },
        { words: ["almacen", "almacenes", "almacén", "almacenes"], api: "warehouses", label: "almacenes" },
        { words: ["recogida", "recogidas", "punto de recogida"], api: "collection_points", label: "lugares de recogida" },
        { words: ["gasto", "gastos", "ticket", "tickets"], api: "expenses", label: "gastos" },
        { words: ["movimiento de stock", "movimientos de stock", "movimiento de inventario", "movimientos de inventario"], api: "inventory_movements", label: "movimientos de stock" },
        { words: ["stock", "existencia", "existencias"], api: "stock", label: "stock" },
        { words: ["tarea", "tareas programadas", "recordatorio", "recordatorios"], api: "scheduled_tasks", label: "tareas programadas" },
        { words: ["usuario", "usuarios", "permisos"], api: "users", label: "usuarios" },
        { words: ["documento", "documentos", "plantilla", "plantillas"], api: "document_templates", label: "documentos y plantillas" },
      ];
      const definition = resourceDefinitions.find((item) => item.words.some((word) => lower.includes(word)));

      // Los informes descargables se resuelven dentro del CRM para que la acción
      // no dependa de que el modelo externo entienda la descarga de archivos.
      const wantsDownload = /(descarga|descárgame|descargar|genera|generar|exporta|exportar)/i.test(lower) && /(archivo|informe|excel|csv|listado)/i.test(lower);
      if (wantsDownload && definition?.api === "orders") {
        const orders = await api("orders");
        const clients = await api("clients");
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const selected = (Array.isArray(orders) ? orders : []).filter((order: any) => {
          const date = String(order.delivery_date || order.created_at || "");
          return date.slice(0, 7) === monthKey;
        });
        const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
        const headers = ["Código", "Cliente", "Estado", "Fecha de pedido", "Fecha de entrega", "Importe", "Responsable", "Notas"];
        const rows = selected.map((order: any) => {
          const client = (Array.isArray(clients) ? clients : []).find((item: any) => Number(item.id) === Number(order.client_id));
          return [order.code, client?.name || "", order.status || "Pendiente", order.created_at?.slice(0, 10) || "", order.delivery_date || "", order.total ?? order.amount ?? "", order.prepared_by || order.responsible || order.created_by || "", order.notes || ""].map(csvEscape).join(";");
        });
        const csv = [headers.map(csvEscape).join(";"), ...rows].join("\r\n");
        const filename = `pedidos-${monthKey}.csv`;
        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessages((m) => [...m, `He generado y descargado ${filename} con ${selected.length} pedidos. Incluye cliente, estado, fechas, importe, responsable y notas.`]); return;
      }
      if (wantsDownload && definition) {
        const records = await api(definition.api);
        const list = Array.isArray(records) ? records : [];
        const dateFrom = lower.match(/desde\s+(\d{4}-\d{2}-\d{2})/)?.[1] || "";
        const dateTo = lower.match(/hasta\s+(\d{4}-\d{2}-\d{2})/)?.[1] || "";
        const selected = list.filter((item: any) => {
          const date = String(item.created_at || item.issue_date || item.order_date || item.date || "").slice(0, 10);
          return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
        });
        const keys = Array.from(new Set(selected.flatMap((item: any) => Object.keys(item)))).filter((key) => !["deleted", "deleted_at", "deleted_by"].includes(key)).slice(0, 18);
        const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
        const csv = [keys.map(csvEscape).join(";"), ...selected.map((item: any) => keys.map((key) => csvEscape(item[key])).join(";"))].join("\r\n");
        const filename = `${definition.api}-${new Date().toISOString().slice(0, 10)}.csv`;
        const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessages((m) => [...m, `He generado ${filename} con ${selected.length} registros de ${definition.label}.`]); return;
      }
      const asksForList = definition && /(lista|listado|muestra|muestreme|muéstrame|ensename|enséñame|cuanto|cuantos|cuantas|que tenemos|como estan|estado|cuales|pendiente|pendientes|hoy|abiertos|abiertas)/i.test(lower);
      if (definition && asksForList) {
        const rows = await api(definition.api);
        let selected = Array.isArray(rows) ? rows : [];
        const today = new Date().toISOString().slice(0, 10);
        if (definition.api === "orders") {
          if (lower.includes("hoy")) selected = selected.filter((x: any) => String(x.delivery_date || x.created_at || "").slice(0, 10) === today);
          if (lower.includes("pendiente") || lower.includes("abierto")) selected = selected.filter((x: any) => ["Pendiente", "Confirmado", "Preparando", "Preparado", "En reparto"].includes(x.status));
        }
        if (definition.api === "shipments" && lower.includes("hoy")) selected = selected.filter((x: any) => String(x.shipped_at || x.expected_delivery_at || x.created_at || "").slice(0, 10) === today);
        const dateFrom = lower.match(/desde\s+(\d{4}-\d{2}-\d{2})/)?.[1] || "";
        const dateTo = lower.match(/hasta\s+(\d{4}-\d{2}-\d{2})/)?.[1] || "";
        if (dateFrom || dateTo) selected = selected.filter((x: any) => { const date = String(x.created_at || x.issue_date || x.order_date || x.date || "").slice(0, 10); return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo); });
        const clients = definition.api === "orders" ? await api("clients") : [];
        const summary = selected.slice(0, 15).map((x: any) => {
          const name = definition.api === "orders" ? clients.find((c: any) => Number(c.id) === Number(x.client_id))?.name || "cliente" : x.name || x.code || `Registro ${x.id}`;
          const detail = definition.api === "orders" ? `${name} · ${x.status || "Pendiente"}` : `${name}${x.status ? ` · ${x.status}` : ""}`;
          return `${x.code || x.name || `#${x.id}`} · ${detail}`;
        }).join("; ");
        setMessages((m) => [...m, `Listado de ${definition.label}${lower.includes("hoy") ? " para hoy" : ""}: ${selected.length}. ${summary || "No hay registros que coincidan."}`]); return;
      }
      const naturalClient = q.match(/(?:crea|crear|añade|anade|alta)\s+(?:un\s+)?cliente\b/i);
      if (naturalClient) {
        const nameMatch = q.match(/cliente\s+(.+?)(?=\s+(?:con\s+)?(?:telefono|teléfono|email|correo|direccion|dirección|ciudad)\b|$)/i);
        const phoneMatch = q.match(/(?:telefono|teléfono)\s+([^,]+?)(?=\s*,|\s+(?:email|correo|direccion|dirección|ciudad)\b|$)/i);
        const emailMatch = q.match(/(?:email|correo)\s+([^,]+?)(?=\s*,|\s+(?:telefono|teléfono|direccion|dirección|ciudad)\b|$)/i);
        const addressMatch = q.match(/(?:direccion|dirección)\s+([^,]+?)(?=\s*,|\s+(?:telefono|teléfono|email|correo|ciudad)\b|$)/i);
        const cityMatch = q.match(/(?:en\s+)?ciudad\s+(.+?)\s*$/i);
        const name = nameMatch?.[1]?.trim() || "";
        if (!name) { setMessages((m) => [...m, "Indícame el nombre del cliente para poder crearlo."]); return; }
        const created = await api("clients", { method: "POST", body: JSON.stringify({ name, phone: phoneMatch?.[1]?.trim() || "", email: emailMatch?.[1]?.trim() || "", address: addressMatch?.[1]?.trim() || "", city: cityMatch?.[1]?.trim() || "", created_at: new Date().toISOString() }) });
        setMessages((m) => [...m, created.id ? `Cliente creado en la base de datos: ${name}.` : "No se pudo crear el cliente."]); return;
      }
      const naturalProduct = q.match(/(?:crea|crear|añade|anade|alta)\s+(?:un\s+)?producto\b/i);
      if (naturalProduct) {
        const nameMatch = q.match(/producto\s+(.+?)(?=\s+(?:con\s+)?(?:precio|pvp|venta|coste|costo|compra|stock)\b|$)/i);
        const priceMatch = q.match(/(?:precio|pvp|venta)\s+([\d.,]+)/i);
        const costMatch = q.match(/(?:coste|costo|compra)\s+([\d.,]+)/i);
        const stockMatch = q.match(/stock\s+(\d+)/i);
        const name = nameMatch?.[1]?.trim() || "";
        if (!name) { setMessages((m) => [...m, "Indícame el nombre del producto para poder crearlo."]); return; }
        const price = Number((priceMatch?.[1] || "0").replace(",", ".")), cost = Number((costMatch?.[1] || "0").replace(",", "."));
        const created = await api("products", { method: "POST", body: JSON.stringify({ name, unit_price: price, cost_price: cost, stock: Number(stockMatch?.[1] || 0), stock_reserved: 0, min_stock: 5, vat: 21, created_at: new Date().toISOString(), created_by: "asistente" }) });
        setMessages((m) => [...m, created.id ? `Producto creado en la base de datos: ${name}.` : "No se pudo crear el producto."]); return;
      }
    try {
      const resource = lower.includes("producto") ? "products" : lower.includes("cliente") ? "clients" : "";
      if (resource && (lower.includes("lista") || lower.includes("listar") || lower.includes("cuántos") || lower.includes("cuantos"))) {
        const list = await fetch(`/api/${resource}`).then((r) => r.json());
        const names = (Array.isArray(list) ? list : []).slice(0, 12).map((x: any) => x.name).filter(Boolean);
        setMessages((m) => [...m, `${resource === "products" ? "Productos" : "Clientes"}: ${names.length ? names.join(", ") : "no hay registros"}. Total: ${Array.isArray(list) ? list.length : 0}.`]);
        return;
      }
      const create = lower.match(/crear\s+(?:un\s+)?(cliente|producto)\s+(?:llamado|llamada|con nombre|de nombre)?\s*(.+)$/i);
      if (create) {
        const target = create[1].toLowerCase() === "cliente" ? "clients" : "products";
        const name = create[2].replace(/[.!?]+$/, "").trim();
        const created = await fetch(`/api/${target}`, { method: "POST", headers: ASSISTANT_HEADERS, body: JSON.stringify({ name, ...(target === "products" ? { stock: 0, unit_price: 0 } : {}) }) }).then((r) => r.json());
        if (created.id) { setMessages((m) => [...m, `${target === "products" ? "Producto" : "Cliente"} creado correctamente: ${name} (ID ${created.id}).`]); return; }
      }
      const orderMatch = q.match(/(?:crear|crea|hacer|haz|preparar|prepara)\s+(?:un(?:os)?\s+)?pedidos?\s+(?:para|a)\s+(.+?)\s+(?:con|de)\s+(\d+(?:[.,]\d+)?)\s+(?:unidades?|uds?|cajas?|botellas?|packs?)\s+(?:de\s+)?(.+)/i);
      if (orderMatch) {
        const [, clientName, quantityText, productName] = orderMatch;
        const [clients, products] = await Promise.all([fetch("/api/clients").then((r) => r.json()), fetch("/api/products").then((r) => r.json())]);
        const client = clients.find((x: any) => String(x.name).toLowerCase().includes(clientName.trim().toLowerCase()));
        const product = products.find((x: any) => String(x.name).toLowerCase().includes(productName.trim().toLowerCase()));
        if (!client || !product) { setMessages((m) => [...m, `No encuentro ${!client ? `el cliente ${clientName}` : `el producto ${productName}`}.`]); return; }
        const quantity = Number(quantityText.replace(",", "."));
        const created = await fetch("/api/orders", { method: "POST", headers: ASSISTANT_HEADERS, body: JSON.stringify({ code: `PED-${Date.now().toString().slice(-7)}`, client_id: client.id, product_id: product.id, quantity, unit_price: Number(product.unit_price || 0), amount: quantity * Number(product.unit_price || 0), status: "Pendiente" }) }).then((r) => r.json());
        if (created.id) { setMessages((m) => [...m, `Pedido ${created.code} creado para ${client.name}: ${quantity} unidades de ${product.name}. Stock reservado.`]); return; }
      }
      if (/(crear|crea|hacer|haz|preparar|prepara).*pedid/.test(lower)) {
        setMessages((m) => [...m, "Para crear el pedido necesito: cliente, producto y cantidad. Por ejemplo: créame un pedido para Restaurante La Viña de 3 cajas de Agua mineral."]); return;
      }
      const asksStock = /(stock|existencia|existencias|genero|mercancia|producto|productos|queda|quedan|disponible)/.test(lower) && /(cuanto|cuanta|queda|quedan|tenemos|hay|disponible|falta|reponer)/.test(lower);
      if (asksStock) {
        const inventory = await fetch("/api/stock").then((r) => r.json());
        const lines = (Array.isArray(inventory) ? inventory : []).slice(0, 12).map((x: any) => `${x.product_name}: ${x.available_stock} disponibles`).join("; ");
        setMessages((m) => [...m, `Stock disponible: ${lines || "sin datos"}.`]); return;
      }
      // Las preguntas de seguimiento suelen decir "de estos..." o "muéstrame los enviados"
      // sin repetir la palabra pedido. Deben seguir resolviéndose contra la base local.
      const asksOrders = (
        (/(pedido|pedidos|encargo|encargos|ventas|trabajo|dia|jornada|semana)/.test(lower) && /(como|que tal|cuantos|cuantas|hay|tenemos|pendiente|pendientes|abierto|abiertos|hoy|semana|estado|situacion|situación|cuales|cuáles|muestra|muestreme|muéstrame|enviado|enviados|preparado|preparados)/.test(lower))
        || /(cuales|cuáles).*(pendiente|pendientes|enviado|enviados|preparado|preparados)/.test(lower)
        || /(muestra|muéstrame|muestreme|enséñame|ensename).*(pendiente|pendientes|enviado|enviados|preparado|preparados)/.test(lower)
      );
      if (asksOrders) {
        const [orders, clients, shipments] = await Promise.all([fetch("/api/orders").then((r) => r.json()), fetch("/api/clients").then((r) => r.json()), fetch("/api/shipments").then((r) => r.json())]);
        const all = Array.isArray(orders) ? orders : [];
        const sentQuestion = /(enviado|enviados|envio|envíos|salir|salida)/.test(lower);
        const pendingQuestion = /(pendiente|pendientes|preparar|preparados)/.test(lower) && !sentQuestion;
        const today = new Date().toISOString().slice(0, 10);
        const weekQuestion = /esta\s+semana|semana/.test(lower);
        const weekStart = new Date();
        weekStart.setHours(0, 0, 0, 0);
        const day = weekStart.getDay() || 7;
        weekStart.setDate(weekStart.getDate() - day + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const inCurrentWeek = (value: unknown) => {
          const date = new Date(String(value || ""));
          return !Number.isNaN(date.getTime()) && date >= weekStart && date < weekEnd;
        };
        const sentIds = new Set((Array.isArray(shipments) ? shipments : []).filter((s: any) => sentQuestion && (!lower.includes("hoy") || String(s.shipped_at || "").slice(0, 10) === today)).map((s: any) => Number(s.order_id)));
        const selected = sentQuestion
          ? all.filter((x: any) => sentIds.size ? sentIds.has(Number(x.id)) : ["Enviado", "Entregado"].includes(x.status))
          : pendingQuestion
            ? all.filter((x: any) => ["Pendiente", "Confirmado", "Preparando", "Preparado"].includes(x.status))
            : all.filter((x: any) => !["Entregado", "Cancelado"].includes(x.status));
        const scoped = weekQuestion
          ? selected.filter((x: any) => inCurrentWeek(x.created_at || x.delivery_date || x.order_date))
          : selected;
        const summary = scoped.slice(0, 10).map((x: any) => `${x.code} · ${clients.find((c: any) => c.id === x.client_id)?.name || "cliente"} · ${x.status}`).join("; ");
        setMessages((m) => [...m, `${sentQuestion ? "Pedidos enviados" : pendingQuestion ? "Pedidos pendientes de preparar o enviar" : "Pedidos abiertos"}${weekQuestion ? " esta semana" : ""}: ${scoped.length}. ${summary || "No hay pedidos que coincidan."}`]); return;
      }
      const documentAction = lower.match(/confirmar\s+(preparar|enviar|facturar|albarán|albaran)\s+(?:el\s+)?pedido\s+([a-z0-9-]+)/i);
      if (documentAction) {
        const action = documentAction[1].toLowerCase();
        const code = documentAction[2];
        const orders = await fetch("/api/orders").then((r) => r.json());
        const order = orders.find((x: any) => String(x.code).toLowerCase() === code.toLowerCase());
        if (!order) { setMessages((m) => [...m, `No encuentro el pedido ${code}.`]); return; }
        if (action === "preparar") {
          const d = await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: ASSISTANT_HEADERS, body: JSON.stringify({ ...order, status: "Preparado" }) }).then((r) => r.json());
          setMessages((m) => [...m, d.id ? `Pedido ${order.code} marcado como preparado.` : (d.error || "No se pudo preparar el pedido.")]); return;
        }
        if (action === "enviar") {
          const d = await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: ASSISTANT_HEADERS, body: JSON.stringify({ ...order, status: "Enviado" }) }).then((r) => r.json());
          setMessages((m) => [...m, d.id ? `Pedido ${order.code} enviado y stock descontado.` : (d.error || "No se pudo enviar el pedido.")]); return;
        }
        const type = action === "facturar" ? "invoice" : "delivery";
        const d = await fetch(`/api/orders/convert-${type}/${order.id}`, { method: "POST", headers: ASSISTANT_HEADERS }).then((r) => r.json());
        setMessages((m) => [...m, d.id ? `${type === "invoice" ? "Factura" : "Albarán"} ${d.code} creado para ${order.code}.` : (d.error || "No se pudo generar el documento.")]); return;
      }
      const requestedAction = lower.match(/\b(preparar|enviar|facturar|albarán|albaran)\s+(?:el\s+)?pedido\s+([a-z0-9-]+)/i);
      if (requestedAction && !lower.includes("confirmar")) {
        setMessages((m) => [...m, `Esta acción modificará el pedido ${requestedAction[2]}. Para ejecutarla escribe: confirmar ${requestedAction[1]} pedido ${requestedAction[2]}.`]); return;
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "revisa la conexión con la base local";
      setMessages((m) => [...m, `No he podido ejecutar esa tarea en el CRM: ${detail}.`]);
      return;
    }
    if (!runtimeConfig?.apiKey) {
      setMessages((m) => [
        ...m,
        "Configuración pendiente: abre ⚙ y añade una API key y un modelo.",
      ]);
      return;
    }
    setBusy(true);
    try {
      const base = (runtimeConfig.endpoint || "https://api.openai.com/v1").replace(
        /\/$/,
        "",
      );
      const isGemini = runtimeConfig.provider === "Gemini";
      let crmContext = "";
      try {
        const [orders, clients, products, stock] = await Promise.all(["orders", "clients", "products", "stock"].map((x) => fetch("/api/" + x).then((r) => r.json())));
        crmContext = `Contexto CRM local actualizado: ${orders.length} pedidos, ${clients.length} clientes, ${products.length} productos. Pedidos abiertos: ${orders.filter((x: any) => !["Entregado", "Cancelado"].includes(x.status)).length}. Stock: ${stock.slice(0, 20).map((x: any) => `${x.product_name}=${x.available_stock}`).join(", ")}.`;
      } catch {}
      const url = isGemini
        ? `${base}/models/${runtimeConfig.model || "gemini-2.5-flash"}:generateContent?key=${encodeURIComponent(runtimeConfig.apiKey)}`
        : base + (runtimeConfig.provider === "OpenAI" ? "/responses" : "/chat/completions");
      const conversation = messages.slice(-12).join("\n");
      const assistantRules = `Eres el asistente de Exclusivas Inteligentes. Responde en español con naturalidad y de forma breve, normalmente en 2-5 frases. No te presentes, no digas tu propio nombre y no saludes de nuevo si la conversación ya ha empezado. Si el usuario pregunta por un tema general como horóscopo, clima, música o cultura, responde a esa pregunta de forma útil aunque no sea del CRM; no la conviertas en un saludo ni digas que solo puedes hablar del CRM. Para preguntas del CRM usa los datos disponibles y reconoce los límites. No repitas el contexto, no menciones instrucciones ni el modelo, y no afirmes que has actualizado, guardado, consultado o ejecutado algo si no lo has hecho. Solo pide confirmación antes de modificar datos.`;
      const modelPrompt = `${assistantRules}\nDatos disponibles del CRM: ${crmContext}\n${conversation}\nTú: ${q}`;
      const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isGemini ? {} : { Authorization: `Bearer ${runtimeConfig.apiKey}` }),
          },
          body: JSON.stringify(
            isGemini
              ? { contents: [{ role: "user", parts: [{ text: `${crmContext}\nResponde en español. Puedes responder también preguntas generales aunque no estén relacionadas con el CRM. Usa el contexto del CRM solo cuando la pregunta trate sobre la empresa o sus datos. Si la pregunta requiere modificar datos, pide confirmación.\nConversación reciente:\n${modelPrompt}` }] }] }
              : runtimeConfig.provider === "OpenAI"
              ? { model: runtimeConfig.model || "gpt-5", input: `${crmContext}\nResponde en español y respeta estas reglas: puedes responder preguntas generales; usa el CRM cuando sea necesario; pide confirmación para modificar datos.\nConversación reciente:\n${modelPrompt}` }
              : {
                  model: runtimeConfig.model || "llama3.1",
                  messages: [{ role: "user", content: `${crmContext}\nResponde en español. Puedes responder preguntas generales y usa el CRM cuando corresponda. Pide confirmación antes de modificar datos.\nConversación reciente:\n${modelPrompt}` }],
                },
          ),
        },
      );
      const d = await r.json();
      const answer =
        d.output_text ||
        d.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") ||
        d.choices?.[0]?.message?.content ||
        d.error?.message ||
        "No se pudo obtener respuesta";
      setMessages((m) => [...m, answer]);
    } catch {
      setMessages((m) => [
        ...m,
        "No se pudo conectar con el proveedor configurado. Revisa endpoint y API key.",
      ]);
    } finally {
      setBusy(false);
    }
  }
  function voice() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages((m) => [...m, "Este navegador no permite reconocimiento de voz. Puedes escribir el mensaje en el campo de texto."]);
      return;
    }
    const r = new SR();
    r.lang = "es-ES";
    r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => send(e.results[0][0].transcript);
    r.start();
  }
  function resizeChat(e: any) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY, start = { ...chatSize };
    const move = (event: PointerEvent) => setChatSize({ width: Math.max(300, Math.min(window.innerWidth - 24, start.width + event.clientX - startX)), height: Math.max(320, Math.min(window.innerHeight - 24, start.height + event.clientY - startY)) });
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop);
  }
  function resizeChatTopLeft(e: any) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY, start = { ...chatSize };
    const move = (event: PointerEvent) => setChatSize({ width: Math.max(300, Math.min(window.innerWidth - 24, start.width - event.clientX + startX)), height: Math.max(320, Math.min(window.innerHeight - 24, start.height - event.clientY + startY)) });
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop);
  }
  if (publicPortal || !adminAllowed) return null;
  if (!open)
    return (
      <button
        className="assistant-ball"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente Exclusivas"
      >
        <AssistantIcon />
      </button>
    );
  return (
    <aside
      className={
        large ? "assistant-global assistant-large" : "assistant-global"
      }
      style={large ? undefined : { width: chatSize.width, height: chatSize.height }}
    >
      <div className="assistant-resize-handle assistant-resize-top-left" onPointerDown={resizeChatTopLeft} aria-label="Cambiar tamaño del asistente" />
      <div className="assistant-global-head">
        <div className="ai-orb">
          <AssistantIcon />
        </div>
        <div>
          <b>Asistente Exclusivas</b>
          <small>
            {busy ? "Consultando modelo..." : "Disponible en todo el CRM"}
          </small>
        </div>
        <div className="assistant-tools">
          <button
            onClick={() => setClearConfirmOpen(true)}
            aria-label="Limpiar conversación"
            title="Limpiar conversación"
          >
            ↺
          </button>
          <button
            onClick={() => setLarge((v) => !v)}
            aria-label={large ? "Reducir asistente" : "Ampliar asistente"}
          >
            {large ? "↙" : "↗"}
          </button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Minimizar asistente"
          >
            −
          </button>
        </div>
      </div>
      <div className="assistant-global-body">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.startsWith("Tú:") ? "assistant-user" : "assistant-ai"}
          >
            {m.startsWith("Tú:") ? <><small>Tú</small><span>{m.slice(3).trim()}</span></> : <AssistantMessage text={m} />}
          </div>
        ))}
        {busy && <div className="assistant-thinking" role="status" aria-live="polite"><span /><span /><span /> Pensando…</div>}
      </div>
      <div className="assistant-global-input">
        <input
          ref={imageInputRef}
          className="assistant-image-input"
          type="file"
          accept="image/*"
          onChange={(event) => selectImage(event.target.files?.[0])}
          aria-label="Seleccionar captura de pantalla"
        />
        <button
          type="button"
          className="assistant-attach-button"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Adjuntar captura de pantalla"
          title="Adjuntar captura de pantalla"
        >
          ▧
        </button>
        <button
          className={listening ? "mic listening" : "mic"}
          onClick={voice}
          aria-label="Grabar mensaje de voz"
        >
          {listening ? "●" : "🎙"}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(event) => {
            const pastedImage = Array.from(event.clipboardData.files || []).find((file) => file.type.startsWith("image/"));
            if (pastedImage) {
              event.preventDefault();
              selectImage(pastedImage);
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={
            listening ? "Escuchando..." : "Escribe o pulsa el micrófono..."
          }
        />
        <button onClick={() => send()} aria-label="Enviar">
          ↑
        </button>
      </div>
      {imageDataUrl && (
        <div className="assistant-attachment" role="status">
          <div className="assistant-attachment-preview">
            <img src={imageDataUrl} alt="Vista previa de la captura adjunta" />
            <span>{imageFile?.name || "Captura adjunta"}</span>
          </div>
          <div className="assistant-attachment-actions">
            <button type="button" className="button secondary" onClick={() => { setImageFile(null); setImageDataUrl(""); if (imageInputRef.current) imageInputRef.current.value = ""; }}>Quitar</button>
            <button type="button" className="button primary" disabled={imageBusy || busy} onClick={() => void analyzeImage()}>{imageBusy ? "Analizando…" : "Analizar captura"}</button>
          </div>
        </div>
      )}
      {clearConfirmOpen && (
        <div className="assistant-confirm-overlay" role="presentation" onClick={() => setClearConfirmOpen(false)}>
          <div className="assistant-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="assistant-confirm-title" onClick={(event) => event.stopPropagation()}>
            <b id="assistant-confirm-title">Limpiar conversación</b>
            <p>Se borrarán los mensajes visibles del asistente.</p>
            <div className="assistant-confirm-actions">
              <button type="button" className="button secondary" onClick={() => setClearConfirmOpen(false)}>Cancelar</button>
              <button type="button" className="button primary" onClick={() => { const nextGreeting = randomAssistantGreeting(); setGreeting(nextGreeting); setMessages([nextGreeting]); localStorage.removeItem("excluvas.assistant.messages"); setClearConfirmOpen(false); }}>Limpiar conversación</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function AssistantIcon() {
  return (
    <svg className="assistant-svg" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 8.5h18a3 3 0 0 1 3 3v8.8a3 3 0 0 1-3 3H16l-5.7 4v-4H7a3 3 0 0 1-3-3v-8.8a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M10 15.5h.01M16 15.5h.01M22 15.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M22.5 5.5v3M26 7.2l-2.1 2.1" stroke="#f4b942" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function AssistantMessage({ text }: { text: string }) {
  const genericList = text.match(/^Listado de (.+?):\s*(\d+)\.\s*(.*)$/);
  if (genericList) {
    const items = genericList[3] ? genericList[3].split(/;\s*/).filter(Boolean) : [];
    return <div className="assistant-result"><strong>Listado de {genericList[1]} · {genericList[2]}</strong><div className="assistant-result-list">{items.map((item, i) => { const parts = item.split(" · "); const detail = parts.slice(1).join(" · "); return <div className="assistant-result-row" key={i}><b>{parts[0]}</b><span>{detail || "—"}</span><em aria-hidden="true" /></div>; })}</div></div>;
  }
  const match = text.match(/^(Pedidos abiertos|Pedidos pendientes de preparar o enviar|Pedidos enviados)(?: esta semana)?:\s*(\d+)\.\s*(.*)$/);
  if (match) {
    const items = match[3] ? match[3].split(/;\s*/).filter(Boolean) : [];
    return <div className="assistant-result"><strong>{match[1]}{text.includes(" esta semana") ? " esta semana" : ""}: {match[2]}</strong><div className="assistant-result-list">{items.map((item, i) => { const parts = item.split(" · "); return <div className="assistant-result-row" key={i}><b>{parts[0]}</b><span>{parts[1] || "Cliente"}</span><em>{parts[2] || "Pendiente"}</em></div>; })}</div></div>;
  }
  const stock = text.match(/^Stock disponible:\s*(.*)$/);
  if (stock) {
    const items = stock[1].split(/;\s*/).filter(Boolean);
    return <div className="assistant-result"><strong>Stock disponible</strong><div className="assistant-result-list">{items.map((item, i) => { const p = item.split(":"); return <div className="assistant-result-row" key={i}><b>{p[0]}</b><span>{p.slice(1).join(":").trim()}</span></div>; })}</div></div>;
  }
  return <span>{text}</span>;
}
