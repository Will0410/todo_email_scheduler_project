// =========================================
// cronLove.js - Agendador diário (verifica a cada minuto)
// =========================================

import cron from "node-cron";
import path from "path";
import fs from "fs";
import { sendWhatsApp as sendWA } from "./sendWhatsAppHelper.js"; // veremos helper em seguida
import { generateLoveMessage } from "./loveGenerator.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), "data");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");

function readSubscriptions() {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  return transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    text,
  });
}

// função utilitária para comparar HH:MM
function nowHHMM() {
  const d = new Date();
  return d.toTimeString().slice(0,5); // "HH:MM"
}

function todayDateString() {
  const d = new Date();
  return d.toISOString().slice(0,10); // "YYYY-MM-DD"
}

// Executa a cada minuto e verifica se deve enviar
cron.schedule("* * * * *", async () => {
  try {
    const subs = readSubscriptions();
    if (!subs.length) return;

    const now = nowHHMM();
    const today = todayDateString();

    for (const s of subs) {
      try {
        const targetTime = s.time || "09:00";
        // se já enviou hoje, pular
        if (s.lastSent === today) continue;
        // somente enviar quando o relógio bater a hora exata (HH:MM)
        if (targetTime !== now) continue;

        // gerar mensagem
        const message = await generateLoveMessage({ name: s.name || "", email: s.email || "", whatsapp: s.whatsapp || "" });

        // enviar whatsapp (se houver)
        if (s.whatsapp) {
          try {
            await sendWA(s.whatsapp, message);
            console.log(`✅ WhatsApp enviado para ${s.whatsapp}`);
          } catch (err) {
            console.error(`❌ Falha WhatsApp ${s.whatsapp}:`, err.message);
          }
        }

        // enviar email (se houver)
        if (s.email) {
          try {
            await sendEmail(s.email, "Mensagem de amor diária ❤️", message);
            console.log(`✅ Email enviado para ${s.email}`);
          } catch (err) {
            console.error(`❌ Falha email ${s.email}:`, err.message);
          }
        }

        // atualiza lastSent
        s.lastSent = today;
      } catch (err) {
        console.error("❌ Erro ao processar inscrição:", err.message);
      }
    }

    // grava mudanças no arquivo
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf8");
  } catch (err) {
    console.error("❌ CronLove geral falhou:", err.message);
  }
});
