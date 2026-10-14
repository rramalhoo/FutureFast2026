const { GoogleGenAI } = require("@google/genai");

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada no arquivo .env");
  }

  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function askGemini({ prompt, imageBase64, mimeType = "image/jpeg" }) {
  const ai = getClient();
  const parts = [{ text: prompt }];

  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: [{ role: "user", parts }]
  });

  return response.text || "";
}

module.exports = { askGemini };
