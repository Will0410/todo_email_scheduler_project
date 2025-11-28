// =========================================
// aiChatbot.js - IA + Envio direto de WhatsApp e Email + Agendador
// =========================================

import express from "express";
import Groq from "groq-sdk";
import nodemailer from "nodemailer";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ===========================
// MODELOS GROQ ATIVOS
// ===========================
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ================================
// EMAIL TRANSPORTER
// ================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ================================
// PATHS LOCAIS (subscriptions)
// ================================
const DATA_DIR = path.resolve(process.cwd(), "data");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) fs.writeFileSync(SUBSCRIPTIONS_FILE, "[]");
}

function readSubscriptions() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeSubscriptions(list) {
  ensureDataDir();
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), "utf8");
}

// ================================
// FUNÇÃO UNIVERSAL DE ENVIO WHATSAPP
// Aceita texto, objetos (convertidos), e também suporta envio de mídia se informado
// ================================
async function sendWhatsApp(to, message) {
  if (!process.env.WHAPI_TOKEN) {
    throw new Error("WHAPI_TOKEN não configurado.");
  }

  const formatted = String(to || "").replace(/\D/g, "");
  if (!formatted) throw new Error("Número WhatsApp inválido.");

  // Se message for objeto com { mediaUrl, mediaType, caption }, tentamos enviar como mídia
  if (message && typeof message === "object" && message.mediaUrl) {
    // Ex.: { mediaUrl: "...", mediaType: "image"|"audio"|"document", caption: "..." }
    const payload = {
      to: formatted,
      type: message.mediaType || "image",
      url: message.mediaUrl,
      caption: message.caption || undefined
    };

    console.log("📡 Enviando WhatsApp (mídia):", payload);

    try {
      // endpoint 'media' - depende do gateway; usamos tentativa padrão
      const response = await axios.post(
        "https://gate.whapi.cloud/messages/media",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.WHAPI_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
      console.log("✅ WhatsApp (mídia) enviado:", response.data);
      return response.data;
    } catch (err) {
      console.error("❌ Erro WHAPI (mídia) fallback:", err.response?.data || err.message);
      // fallback: tentar enviar texto com JSON do objeto
    }
  }

  // Caso normal/texto: converte qualquer tipo de valor para string
  let body;
  if (typeof message === "string") body = message;
  else if (message === undefined) body = "undefined";
  else if (message === null) body = "null";
  else {
    try { body = JSON.stringify(message, null, 2); }
    catch { body = String(message); }
  }

  const payload = { to: formatted, body };

  console.log("📡 Enviando WhatsApp (texto):", payload);

  try {
    const response = await axios.post(
      "https://gate.whapi.cloud/messages/text",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHAPI_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("✅ WhatsApp (texto) enviado:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao enviar WhatsApp:", err.response?.data || err.message);
    throw new Error("Falha ao enviar WhatsApp");
  }
}

// ================================
// JSON SEGURO
// ================================
function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// ================================
// GERADOR DE MENSAGEM ROMÂNTICA (fallback simples se Groq não estiver disponível)
// ================================
async function generateLoveMessage(context = {}) {
  // Tenta usar Groq (se configurado), caso falhe usa fallback local
  try {
    if (groq && process.env.GROQ_API_KEY) {
      const prompt = `Gere uma mensagem curta e romântica para enviar por WhatsApp e por email. Contexto: ${JSON.stringify(context)}. Deve ser carinhosa, não muito longa, e adequada para envio diário.`;
      const completion = await groq.chat.completions.create({
        model: MODELS[0],
        messages: [
          { role: "system", content: "Você é um assistente gerador de mensagens românticas curtas." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  } catch (err) {
    console.warn("⚠️ Gerador Groq falhou, usando fallback local:", err.message);
  }

  // Fallback local simples - variações
  const templates = [
    "Bom dia, meu amor! ❤️ Você é o sorriso que ilumina meu dia. Te amo!",
    "Só passando pra dizer que te amo e que você faz meus dias melhores. ❤️",
    "Você é minha melhor parte. Tenha um dia lindo, meu amor! 💖",
    "Meu amor por você cresce a cada amanhecer. Te amo hoje e sempre. ❤️",
    "Pensando em você e sorrindo — te amo infinitamente. 🌹"
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ================================
// PROMPT DO SISTEMA
// ================================
const SYSTEM_PROMPT = `
Você é um assistente inteligente.
Se o usuário pedir para enviar WhatsApp ou email → responda SOMENTE em JSON.

### WhatsApp (envio imediato)
{
  "action": "send_whatsapp",
  "to": "5511999999999",
  "body": "mensagem"        // pode ser string ou objeto (ex: { mediaUrl, mediaType, caption })
}

### Email (envio imediato)
{
  "action": "send_email",
  "to": "email@dominio.com",
  "subject": "assunto",
  "text": "conteudo"
}

### Agendar envio diário (adiciona à lista de subscriptions)
{
  "action": "schedule_daily",
  "whatsapp": "5511999999999",   // opcional
  "email": "exemplo@dominio.com",// opcional
  "time": "09:00",               // opcional - formato HH:MM 24h (padrão 09:00)
  "name": "nome do destinatário" // opcional - para identificar
}

### Cancelar agendamento (remove da lista)
{
  "action": "unschedule",
  "whatsapp": "5511999999999",   // ou email
  "email": "exemplo@dominio.com"
}

### Listar agendamentos
{
  "action": "list_subscriptions"
}

Se NÃO for pedido de envio/agendamento → responda normalmente (texto).
`;

// ================================
// ROTA PRINCIPAL DA IA (recebe mensagens do frontend)
// ================================
router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Mensagem não enviada." });

  for (const model of MODELS) {
    try {
      console.log(`🔍 Tentando modelo: ${model}`);

      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      });

      const reply = completion.choices?.[0]?.message?.content?.trim() || "";
      const json = safeJsonParse(reply);

      // ---------- ACTION: LIST SUBSCRIPTIONS ----------
      if (json?.action === "list_subscriptions") {
        const subs = readSubscriptions();
        return res.json({ reply: "Lista de agendamentos", subscriptions: subs });
      }

      // ---------- ACTION: UNSCHEDULE ----------
      if (json?.action === "unschedule") {
        const subs = readSubscriptions();
        const filtered = subs.filter(s => {
          if (json.whatsapp && s.whatsapp && s.whatsapp.replace(/\D/g,"") === String(json.whatsapp).replace(/\D/g,"")) return false;
          if (json.email && s.email && s.email.toLowerCase() === String(json.email).toLowerCase()) return false;
          return true;
        });
        writeSubscriptions(filtered);
        return res.json({ reply: "Agendamento removido." , subscriptions: filtered});
      }

      // ---------- ACTION: SCHEDULE DAILY ----------
      if (json?.action === "schedule_daily") {
        // precisa de pelo menos whatsapp ou email
        if (!json.whatsapp && !json.email) throw new Error("Informe whatsapp e/ou email para agendar.");

        const time = json.time || "09:00";
        const name = json.name || "";
        const subs = readSubscriptions();

        // normaliza
        const entry = {
          id: Date.now().toString(),
          name,
          whatsapp: json.whatsapp ? String(json.whatsapp).replace(/\D/g, "") : null,
          email: json.email ? String(json.email).toLowerCase() : null,
          time, // "HH:MM"
          lastSent: null
        };

        subs.push(entry);
        writeSubscriptions(subs);

        return res.json({ reply: `Agendado diariamente às ${time}.`, subscription: entry });
      }

      // ---------- ACTION: SEND EMAIL ----------
      if (json?.action === "send_email") {
        if (!json.to || !json.subject || !json.text) throw new Error("Campos obrigatórios do email ausentes.");
        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to: json.to,
          subject: json.subject,
          text: json.text,
        });
        return res.json({ reply: `📧 Email enviado para ${json.to}!` });
      }

      // ---------- ACTION: SEND WHATSAPP ----------
      if (json?.action === "send_whatsapp") {
        if (!json.to || json.body === undefined) throw new Error("Campos obrigatórios do WhatsApp ausentes.");
        const result = await sendWhatsApp(json.to, json.body);
        return res.json({
          reply: `📱 WhatsApp enviado para ${json.to}!`,
          provider: result,
        });
      }

      // ---------- RESPOSTA NORMAL ----------
      return res.json({ reply });

    } catch (err) {
      console.error(`❌ Erro modelo (${model}):`, err.message);
      continue;
    }
  }

  return res.status(500).json({ error: "Nenhum modelo respondeu corretamente." });
});

export default router;
