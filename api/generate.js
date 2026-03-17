import { GoogleGenAI } from "@google/genai";

export const config = {
  api: { bodyParser: { sizeLimit: "50mb" } },
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { prompt, images, model, modelType } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // IMAGEN models use generateImages (text-to-image, no reference images)
    if (modelType === "imagen" || model?.startsWith("imagen")) {
      const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const img = response.generatedImages[0];
        const b64 = img.image?.imageBytes;
        if (b64) {
          return res.status(200).json({ image: b64, mimeType: "image/png" });
        }
      }
      return res.status(400).json({ error: "No image generated" });
    }

    // GEMINI models use generateContent (supports reference images)
    const parts = [];

    // Add reference images as inline data
    if (images && images.length > 0) {
      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: img.base64,
          },
        });
      }
    }

    // Add the text prompt
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Extract generated image from response
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            return res.status(200).json({
              image: part.inlineData.data,
              mimeType: part.inlineData.mimeType || "image/png",
            });
          }
        }
      }
    }

    return res.status(400).json({ error: "No image in response" });
  } catch (e) {
    console.error("Generate error:", e.message);
    if (e.message?.includes("SAFETY") || e.message?.includes("content policy")) {
      return res.status(400).json({ error: "Content policy: prompt was blocked" });
    }
    return res.status(500).json({ error: e.message });
  }
}
