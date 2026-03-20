export const config = { api: { bodyParser: { sizeLimit: "50mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) { const err = await response.text(); return res.status(response.status).json({ error: err }); }
    return res.status(200).json(await response.json());
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
