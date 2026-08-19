require("dotenv").config();

const express = require("express");
const path = require("path");
const { askGemini } = require("./gemini");
const { registerRoutes } = require("./auth");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

registerRoutes(app);

const MEDICAL_INSTRUCTIONS = `
Você é o Genvity, um assistente informativo sobre medicamentos, em português do Brasil.

Responda dúvidas gerais e educativas sobre medicamentos: usos comuns, funcionamento em linguagem simples,
efeitos adversos comuns, cuidados, interações conhecidas e quando procurar ajuda.

Regras de segurança:
- Não diagnostique doenças.
- Não prescreva, não escolha tratamento e não altere dose, frequência ou duração.
- Nunca oriente alguém a iniciar, suspender, dobrar ou reduzir medicamento por conta própria.
- Não substitua médico, farmacêutico ou bula.
- Se houver possível overdose, reação alérgica grave, falta de ar, desmaio, convulsão,
  confusão intensa, dor no peito ou outro sinal de emergência, recomende atendimento de emergência imediatamente.
- Se o nome do medicamento for ambíguo, peça o nome exato, princípio ativo e concentração.
- Para crianças, gestantes, idosos, doença renal/hepática ou muitos medicamentos, seja especialmente conservador.
- Não invente doses, interações, contraindicações ou informações de bula.

Responda de forma clara e curta, usando tópicos quando ajudar.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Digite uma mensagem." });
    }

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-10)
          .map(item => `${item.role || "user"}: ${item.content || item.text || ""}`)
          .join("\n")
      : "";

    const prompt = `${MEDICAL_INSTRUCTIONS}

Histórico recente:
${recentHistory}

Usuário:
${message}`;

    const answer = await askGemini({ prompt });
    res.json({ answer, response: answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Erro ao consultar o Gemini." });
  }
});

app.post("/api/reader", async (req, res) => {
  try {
    const { image, mimeType = "image/jpeg" } = req.body || {};

    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Imagem inválida." });
    }

    const base64 = image.split(",")[1];
    const prompt = `
Analise esta imagem de uma receita médica.

Extraia SOMENTE informações visíveis. Não invente dados, não faça diagnóstico e não prescreva.
Se algo estiver ilegível, deixe vazio e indique confiança baixa.

Retorne SOMENTE JSON válido neste formato:
{
  "medicines": [
    {
      "name": "",
      "dose": "",
      "schedule": "",
      "duration": "",
      "instructions": "",
      "confidence": "alta|média|baixa"
    }
  ]
}
`;

    const raw = await askGemini({
      prompt,
      imageBase64: base64,
      mimeType
    });

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    } catch {
      return res.status(502).json({ error: "O Gemini retornou um formato inválido." });
    }

    res.json({ medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Erro ao analisar a receita." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Genvity rodando em http://localhost:${PORT}`);
});
