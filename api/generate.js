import { GoogleGenAI } from "@google/genai";

export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "GEMINI_API_KEY not configured. Add it in Vercel Environment Variables." });

  try {
    const { prompt, images, aspectRatio, model } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    // Build parts: reference images first, then text prompt
    const parts = [];

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

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: model || "gemini-2.5-flash-image",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Extract image from response
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return res.status(500).json({ error: "No response from Gemini" });
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return res.status(200).json({
          image: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      }
    }

    // No image returned — likely a content policy refusal
    const textParts = candidate.content.parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");
    return res
      .status(500)
      .json({ error: "No image generated. " + textParts.substring(0, 300) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
