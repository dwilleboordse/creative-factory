import { GoogleGenAI } from "@google/genai";
export const config = { api: { bodyParser: { sizeLimit: "50mb" } }, maxDuration: 300 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { prompt, images, model, modelType } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    if (modelType === "imagen" || model?.startsWith("imagen")) {
      const response = await ai.models.generateImages({ model, prompt, config: { numberOfImages: 1 } });
      if (response.generatedImages?.[0]?.image?.imageBytes) {
        return res.status(200).json({ image: response.generatedImages[0].image.imageBytes, mimeType: "image/png" });
      }
      return res.status(400).json({ error: "No image generated" });
    }

    const parts = [];
    if (images?.length > 0) { for (const img of images) { parts.push({ inlineData: { mimeType: img.mimeType || "image/jpeg", data: img.base64 } }); } }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model, contents: [{ role: "user", parts }],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) { return res.status(200).json({ image: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/png" }); }
      }
    }
    return res.status(400).json({ error: "No image in response" });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
