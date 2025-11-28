import DeliveryLog from "../models/DeliveryLog.js";
import nodemailer from "nodemailer";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 4;

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

async function sendToWhatsApp(payload) {
  // payload expected: { to: "...", body: "..." }
  return axios.post("https://gate.whapi.cloud/messages/text", payload, {
    headers: { Authorization: `Bearer ${process.env.WHAPI_TOKEN}`, "Content-Type": "application/json" }
  });
}

async function sendToEmail({ to, subject, text }) {
  const transporter = createTransporter();
  return transporter.sendMail({ from: process.env.MAIL_USER, to, subject, text });
}

async function notifyAdmin(subject, text) {
  try {
    const transporter = createTransporter();
    const admin = process.env.ALERT_EMAIL || process.env.MAIL_USER;
    await transporter.sendMail({ from: process.env.MAIL_USER, to: admin, subject, text });
  } catch (err) {
    console.error("Failed to notify admin:", err.message);
  }
}

export async function sendWithRetry(logId) {
  const log = await DeliveryLog.findById(logId);
  if (!log) throw new Error("DeliveryLog not found");

  try {
    log.attempts += 1;
    await log.save();

    let resp;
    if (log.channel === "whatsapp") {
      resp = await sendToWhatsApp({ to: log.to, ...log.payload });
    } else if (log.channel === "email") {
      resp = await sendToEmail({ to: log.to, subject: log.payload.subject || "Mensagem", text: log.payload.body });
    } else {
      throw new Error("Channel not supported");
    }

    log.status = "sent";
    log.response = resp?.data || resp;
    log.updatedAt = new Date();
    await log.save();
    return log;
  } catch (err) {
    log.status = "retrying";
    log.lastError = err.response?.data || err.message;
    log.updatedAt = new Date();
    await log.save();

    if (log.attempts >= MAX_RETRIES) {
      log.status = "failed";
      await log.save();

      // notify admin / user
      await notifyAdmin(`Falha de envio para ${log.to}`, `Tentativas: ${log.attempts}\nErro: ${log.lastError}\nPayload: ${JSON.stringify(log.payload, null,2)}`);
      return log;
    }

    // exponential backoff (seconds)
    const delaySec = Math.pow(2, log.attempts) * 60;
    setTimeout(() => {
      sendWithRetry(logId).catch(e => console.error("Retry failed:", e.message));
    }, delaySec * 1000);

    return log;
  }
}
