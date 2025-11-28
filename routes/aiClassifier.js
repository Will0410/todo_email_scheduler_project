import express from "express";
import OpenAI from "openai";

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/classify-task", async (req, res) => {
  const { title, description } = req.body;

  const prompt = `
    Classifique a tarefa abaixo em Categoria e Prioridade.

    Título: ${title}
    Descrição: ${description}

    Categorias possíveis:
    - Trabalho
    - Estudo
    - Pessoal
    - Casa
    - Saúde
    - Financeiro
    - Outros

    Prioridades possíveis:
    - Alta
    - Média
    - Baixa

    Responda APENAS em JSON, assim:
    {
      "categoria": "...",
      "prioridade": "..."
    }
  `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const json = JSON.parse(response.choices[0].message.content);

    res.json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao classificar tarefa" });
  }
});

export default router;
