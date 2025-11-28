// =========================================
// loveGenerator.js
// =========================================

import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// MODELOS opcionais
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

export async function generateLoveMessage(context = {}) {
  // Tenta usar Groq se configurado
  try {
    if (process.env.GROQ_API_KEY) {
      const prompt = `Gere uma mensagem romântica curta e carinhosa apropriada para envio diário. Contexto: ${JSON.stringify(context)}. Seja curto (1-3 linhas).`;
      const completion = await groq.chat.completions.create({
        model: MODELS[0],
        messages: [
          { role: "system", content: "Você é um gerador de mensagens românticas curtas." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });

      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  } catch (err) {
    console.warn("⚠️ Groq falhou no loveGenerator:", err.message);
  }

  // fallback simples
  const templates = [
    "Bom dia, meu amor! ❤️ Você é o sorriso que ilumina meu dia. Te amo!",
    "Só passando pra dizer que te amo e que você faz meus dias melhores. ❤️",
    "Você é minha melhor parte. Tenha um dia lindo, meu amor! 💖",
    "Meu amor por você cresce a cada amanhecer. Te amo hoje e sempre. ❤️",
    "Pensando em você e sorrindo — te amo infinitamente. 🌹"
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}
