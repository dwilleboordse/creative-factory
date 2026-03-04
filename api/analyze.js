export const config = {
  api: { bodyParser: { sizeLimit: "50mb" } },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured. Add it in Vercel Environment Variables." });

  try {
    const bodyStr = JSON.stringify(req.body);
    console.log("Request size:", Math.round(bodyStr.length / 1024), "KB");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: bodyStr,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText.substring(0, 500));
      return res.status(response.status).json({ error: { message: "Anthropic API error: " + response.status + " — " + errText.substring(0, 200) } });
    }

    return res.status(200).json(await response.json());
  } catch (error) {
    console.error("Handler error:", error.message);
    return res.status(500).json({ error: { message: error.message } });
  }
}
