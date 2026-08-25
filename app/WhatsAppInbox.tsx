"use client";
import { useEffect, useMemo, useState } from "react";

const API = "/api";

export default function WhatsAppInbox() {
  const [publicPortal, setPublicPortal] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [messageRows, clientRows] = await Promise.all([
        fetch(`${API}/whatsapp_messages`).then((r) => r.json()),
        fetch(`${API}/clients`).then((r) => r.json()),
      ]);
      setMessages(Array.isArray(messageRows) ? messageRows : []);
      setClients(Array.isArray(clientRows) ? clientRows : []);
    } catch {
      setError("No se ha podido cargar la bandeja de WhatsApp.");
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { setPublicPortal(window.location.pathname === "/portal-pedidos"); }, []);
  if (publicPortal) return null;

  const conversations = useMemo(() => {
    const grouped = new Map<string, any>();
    for (const message of messages) {
      const key = String(message.wa_id || message.client_id || "sin-identificar");
      const current = grouped.get(key);
      const client = clients.find((item) => String(item.id) === String(message.client_id));
      if (!current || String(message.created_at) > String(current.created_at)) grouped.set(key, { ...message, key, clientName: client?.name || "Contacto sin asociar" });
    }
    return Array.from(grouped.values()).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [messages, clients]);
  const active = conversations.find((conversation) => conversation.key === selectedId) || conversations[0];
  const activeMessages = active ? messages.filter((message) => String(message.wa_id || message.client_id || "sin-identificar") === active.key).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) : [];
  const pendingReview = messages.filter((message) => Number(message.human_review) === 1 && message.status !== "Revisado").length;

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`${API}/whatsapp_messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Actor": "Usuario local" },
        body: JSON.stringify({ wa_id: active?.wa_id || "simulacion", client_id: active?.client_id || null, direction: "Saliente", message_type: "Texto", content: text.trim(), status: "Enviado", human_review: 0 }),
      });
      if (!response.ok) throw new Error("No se ha podido enviar el mensaje.");
      setText("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se ha podido enviar el mensaje.");
    } finally { setSending(false); }
  }
  async function receiveAudio(file: File) {
    if (file.size > 8 * 1024 * 1024) { setError("El audio no puede superar 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      await fetch(`${API}/whatsapp_messages`, { method: "POST", headers: { "Content-Type": "application/json", "X-Actor": "WhatsApp" }, body: JSON.stringify({ wa_id: active?.wa_id || "simulacion", client_id: active?.client_id || null, direction: "Entrante", message_type: "Audio", content: "Audio recibido", media_name: file.name, media_mime: file.type || "audio/webm", media_data: String(reader.result || ""), status: "Pendiente de transcripción", human_review: 1, suggested_action: "Transcribir y confirmar el pedido con una persona antes de guardarlo." }) });
      await load();
    };
    reader.readAsDataURL(file);
  }
  async function markReviewed(message: any) {
    await fetch(`${API}/whatsapp_messages/${message.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Actor": "Usuario local" }, body: JSON.stringify({ status: "Revisado", human_review: 0 }) });
    await load();
  }
  return <>
    <button type="button" className="whatsapp-float" onClick={() => { setOpen(true); load(); }} aria-label="Abrir bandeja de WhatsApp">
      <span aria-hidden="true">◔</span>{pendingReview > 0 && <b>{pendingReview}</b>}
    </button>
    {open && <div className="whatsapp-overlay">
      <section className="whatsapp-window" role="dialog" aria-modal="true" aria-label="Bandeja de WhatsApp">
        <header className="whatsapp-head"><div><b>WhatsApp del CRM</b><small>Conversaciones, audios y pedidos para revisar</small></div><div className="whatsapp-head-actions"><span className="whatsapp-connection"><i /> Conexión local preparada</span><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></div></header>
        <div className="whatsapp-layout">
          <aside className="whatsapp-conversations"><div className="whatsapp-pane-title"><b>Conversaciones</b><span>{conversations.length}</span></div>{conversations.length ? conversations.map((conversation) => <button type="button" key={conversation.key} className={`whatsapp-conversation ${active?.key === conversation.key ? "active" : ""}`} onClick={() => setSelectedId(conversation.key)}><span className="whatsapp-avatar">{String(conversation.clientName || "C").slice(0, 1).toUpperCase()}</span><span><b>{conversation.clientName}</b><small>{conversation.content || conversation.message_type || "Mensaje recibido"}</small></span><time>{conversation.created_at ? new Date(conversation.created_at).toLocaleDateString("es-ES") : ""}</time></button>) : <p className="whatsapp-empty">Todavía no hay conversaciones recibidas.</p>}</aside>
          <main className="whatsapp-chat"><div className="whatsapp-chat-head"><div><b>{active?.clientName || "Bandeja de entrada"}</b><small>{active ? "Conversación asociada al CRM" : "Cuando llegue un mensaje aparecerá aquí"}</small></div>{pendingReview > 0 && <span className="whatsapp-review-count">{pendingReview} por revisar</span>}</div><div className="whatsapp-messages">{activeMessages.length ? activeMessages.map((message) => <article key={message.id} className={`whatsapp-message ${message.direction === "Saliente" ? "outgoing" : ""}`}><p>{message.message_type === "Audio" ? `🎙 Audio${message.transcription ? `: ${message.transcription}` : " pendiente de transcribir"}` : message.content || "Mensaje sin texto"}</p><small>{message.direction} · {message.created_at ? new Date(message.created_at).toLocaleString("es-ES") : ""}</small>{Number(message.human_review) === 1 && <div className="whatsapp-review"><b>Revisión humana recomendada</b><span>{message.suggested_action || "Confirmar antes de crear o modificar datos."}</span><button type="button" onClick={() => markReviewed(message)}>Marcar revisado</button></div>}</article>) : <p className="whatsapp-empty">Selecciona una conversación para ver sus mensajes.</p>}</div><div className="whatsapp-compose"><label className="whatsapp-audio-button">🎙<input type="file" accept="audio/*" capture="user" onChange={(event) => { const file = event.target.files?.[0]; if (file) receiveAudio(file); event.currentTarget.value = ""; }} /></label><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="Responder desde el CRM…" /><button type="button" onClick={sendMessage} disabled={sending}>{sending ? "…" : "Enviar"}</button></div>{error && <p className="whatsapp-error">{error}</p>}</main>
        </div>
        <footer className="whatsapp-footer">La conexión real con WhatsApp Business necesita un número verificado, token y webhook. Los mensajes entrantes podrán ser analizados por el asistente y pasar a revisión humana antes de crear pedidos.</footer>
      </section>
    </div>}
  </>;
}
