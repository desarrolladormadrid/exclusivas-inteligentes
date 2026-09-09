const { matchesPhone } = require("./phone.cjs");

function createCrmClient(config, fetchImpl = fetch) {
  const headers = {
    "Content-Type": "application/json",
    "X-Actor": config.crmActor,
    ...(config.crmApiKey ? { Authorization: `Bearer ${config.crmApiKey}` } : {}),
  };

  async function request(path, options = {}) {
    const response = await fetchImpl(`${config.crmApiBaseUrl}/${String(path).replace(/^\//, "")}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) throw new Error(body?.error || `El CRM respondió ${response.status}`);
    return body;
  }

  async function findClientByPhone(phone) {
    const clients = await request("clients");
    return (Array.isArray(clients) ? clients : []).find((client) => matchesPhone(client.phone, phone)) || null;
  }

  async function storeIncomingMessage(message) {
    const client = await findClientByPhone(message.waId);
    const response = await request("whatsapp_messages", {
      method: "POST",
      body: JSON.stringify({
        wa_id: message.waId,
        client_id: client?.id || null,
        direction: "Entrante",
        message_type: message.messageType,
        content: message.content,
        media_name: message.mediaName || null,
        media_mime: message.mediaMime || null,
        media_data: message.mediaData || null,
        status: "Pendiente de interpretación",
        human_review: 1,
        suggested_action: "Interpretar el mensaje y confirmar el pedido antes de guardarlo.",
      }),
    });
    return { client, record: response };
  }

  return { findClientByPhone, storeIncomingMessage };
}

module.exports = { createCrmClient };
