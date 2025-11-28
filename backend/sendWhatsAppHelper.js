// =========================================
// sendWhatsAppHelper.js
// =========================================

import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function sendWhatsApp(to, message) {
  if (!process.env.WHAPI_TOKEN) {
    throw new Error("WHAPI_TOKEN não configurado.");
  }

  const formatted = String(to || "").replace(/\D/g, "");
  if (!formatted) throw new Error("Número WhatsApp inválido.");

  // media branch
  if (message && typeof message === "object" && message.mediaUrl) {
    const payload = {
      to: formatted,
      type: message.mediaType || "image",
      url: message.mediaUrl,
      caption: message.caption || undefined
    };

    try {
      const response = await axios.post("https://gate.whapi.cloud/messages/media", payload, {
        headers: { Authorization: `Bearer ${process.env.WHAPI_TOKEN}`, "Content-Type": "application/json" }
      });
      return response.data;
    } catch (err) {
      console.warn("❗ Falha ao enviar mídia, tentando como texto:", err.response?.data || err.message);
      // fallback to text
    }
  }

  // text branch
  let body;
  if (typeof message === "string") body = message;
  else if (message === undefined) body = "undefined";
  else if (message === null) body = "null";
  else {
    try { body = JSON.stringify(message, null, 2); } catch { body = String(message); }
  }

  const payload = { to: formatted, body };

  const response = await axios.post("https://gate.whapi.cloud/messages/text", payload, {
    headers: { Authorization: `Bearer ${process.env.WHAPI_TOKEN}`, "Content-Type": "application/json" }
  });

  return response.data;
}
