function dataUrl(buffer, mime) {
  return `data:${mime || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
}

function isAudioMessage(message) {
  return ["audio", "ptt", "voice"].includes(String(message?.type || "").toLowerCase()) || Boolean(message?.mimetype?.startsWith("audio/"));
}

async function ingestMessage(client, message, { crm, maxAudioBytes, logger = console }) {
  if (!message || message.fromMe || message.isGroupMsg) return { ignored: true, reason: "message-not-supported" };
  const waId = String(message.from || "").trim();
  if (!waId) return { ignored: true, reason: "missing-sender" };

  if (!isAudioMessage(message)) {
    const stored = await crm.storeIncomingMessage({ waId, messageType: "Texto", content: String(message.body || "").trim() || "Mensaje recibido sin texto" });
    return { stored, messageType: "Texto" };
  }

  const mime = String(message.mimetype || "audio/ogg").split(";")[0];
  const extension = mime.split("/")[1] || "ogg";
  const audio = await client.decryptFile(message);
  const buffer = Buffer.from(audio || []);
  if (!buffer.length) throw new Error("OpenWA no devolvió contenido para el audio");
  if (buffer.length > maxAudioBytes) throw new Error(`El audio supera el límite local de ${Math.round(maxAudioBytes / 1024 / 1024)} MB`);
  const stored = await crm.storeIncomingMessage({ waId, messageType: "Audio", content: "Audio recibido", mediaName: `whatsapp-${Date.now()}.${extension}`, mediaMime: mime, mediaData: dataUrl(buffer, mime) });
  logger.info(`[WhatsApp] Audio recibido de ${waId} (${buffer.length} bytes)`);
  return { stored, messageType: "Audio" };
}

module.exports = { dataUrl, isAudioMessage, ingestMessage };
