// ================================
// server.js - Backend principal
// VERSÃO FINAL PARA RENDER + VITE + IA + EMAIL + WHATSAPP
// ================================

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cron from "node-cron";
import nodemailer from "nodemailer";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

// Corrigir __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================
// IMPORTS DO PROJETO
// ================================
import Todo from "./models/Todo.js";
import aiChatbot from "./routes/aiChatbot.js";
import authRoutes from "./routes/auth.js";
import subsRoutes from "./routes/subscriptions.js";
import historyRoutes from "./routes/history.js";
import statsRoutes from "./routes/stats.js";

import DeliveryLog from "./models/DeliveryLog.js";
import { sendWithRetry } from "./services/deliveryService.js";

// ================================
// EXPRESS
// ================================
const app = express();
app.use(cors());
app.use(express.json());

// ================================
// ROTAS API
// ================================
app.use("/api/ai", aiChatbot);
app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/stats", statsRoutes);

// ================================
// FRONTEND (VITE build /dist)
// ================================
if (process.env.NODE_ENV === "production") {
  console.log("📦 Servindo frontend da pasta /frontend/dist");

  const frontendPath = path.join(__dirname, "..", "frontend", "dist");

  // Arquivos estáticos
  app.use(express.static(frontendPath));

  // Enviar index.html em rotas não-API
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// ================================
// MONGODB
// ================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Erro MongoDB:", err.message);
    process.exit(1);
  });

// ================================
// EMAIL TRANSPORT
// ================================
export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

// ================================
// WHATSAPP LEGACY
// ================================
async function sendWhatsAppLegacy(to, body) {
  if (!process.env.WHAPI_TOKEN)
    throw new Error("WHAPI_TOKEN não definido.");

  const formatted = String(to).replace(/\D/g, "");
  const payload = { to: formatted, body };

  try {
    const response = await axios.post(
      "https://gate.whapi.cloud/messages/text",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHAPI_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("❌ Erro WhatsApp:", err.response?.data || err.message);
    throw new Error("Falha ao enviar WhatsApp");
  }
}

// ================================
// ROTA MANUAL WHATSAPP
// ================================
app.post("/api/send-whatsapp", async (req, res) => {
  const { to, text } = req.body;

  if (!to || !text)
    return res.status(400).json({ error: "Campos 'to' e 'text' obrigatórios." });

  try {
    const log = await DeliveryLog.create({
      channel: "whatsapp",
      to: String(to).replace(/\D/g, ""),
      payload: { body: text },
      status: "pending",
      attempts: 0,
    });

    sendWithRetry(log._id).catch(console.error);

    return res.json({ ok: true, logId: log._id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================================
// CRUD TODO
// ================================
app.get("/todos", async (req, res) => {
  const todos = await Todo.find().sort({ createdAt: -1 });
  res.json(todos);
});

app.post("/todos", async (req, res) => {
  const todo = await Todo.create(req.body);
  res.status(201).json(todo);
});

app.put("/todos/:id", async (req, res) => {
  const todo = await Todo.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(todo);
});

app.delete("/todos/:id", async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ================================
// SCHEDULER — roda a cada minuto
// ================================
cron.schedule("* * * * *", async () => {
  console.log("⏰ Scheduler executando...");

  try {
    const now = new Date();
    const tasks = await Todo.find({
      notified: false,
      due: { $lte: now },
    });

    for (const t of tasks) {
      const msg = t.description || `Lembrete: ${t.title}`;

      // EMAIL
      if (t.email) {
        const log = await DeliveryLog.create({
          channel: "email",
          to: t.email,
          payload: {
            subject: `Lembrete: ${t.title}`,
            body: msg,
          },
          status: "pending",
          attempts: 0,
        });

        sendWithRetry(log._id);
      }

      // WHATSAPP
      if (t.whatsapp && process.env.WHAPI_TOKEN) {
        const log = await DeliveryLog.create({
          channel: "whatsapp",
          to: String(t.whatsapp).replace(/\D/g, ""),
          payload: { body: msg },
          status: "pending",
          attempts: 0,
        });

        sendWithRetry(log._id);
      }

      t.notified = true;
      await t.save();
    }
  } catch (err) {
    console.error("❌ Scheduler erro:", err.message);
  }
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
);

