import { kv } from '@vercel/kv';

export const config = { api: { bodyParser: { sizeLimit: "50mb" } } };

// Key: cf-history-{clientId} -> [{id, date, title, format, size, image (base64), mimeType, prompt}]
// We store up to 200 images per client. Each image ~100-300KB base64.

export default async function handler(req, res) {
  const clientId = req.query.clientId;
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const key = 'cf-history-' + clientId;

  if (req.method === 'GET') {
    try {
      // Return metadata only (no base64) for listing
      const full = req.query.full === 'true';
      const items = (await kv.get(key)) || [];
      if (full) return res.status(200).json({ items });
      // Strip base64 for listing performance
      const meta = items.map(({ image, ...rest }) => ({ ...rest, hasImage: !!image }));
      return res.status(200).json({ items: meta, total: items.length });
    } catch (e) { return res.status(200).json({ items: [], total: 0 }); }
  }

  if (req.method === 'POST') {
    const { action, items: newItems, deleteId } = req.body;

    try {
      if (action === 'add' && newItems) {
        const existing = (await kv.get(key)) || [];
        const updated = [...existing, ...newItems].slice(-200); // keep last 200
        await kv.set(key, updated);
        return res.status(200).json({ ok: true, total: updated.length });
      }

      if (action === 'delete' && deleteId) {
        const existing = (await kv.get(key)) || [];
        const updated = existing.filter(item => item.id !== deleteId);
        await kv.set(key, updated);
        return res.status(200).json({ ok: true, total: updated.length });
      }

      if (action === 'get_image') {
        const existing = (await kv.get(key)) || [];
        const item = existing.find(i => i.id === deleteId); // reuse deleteId as itemId
        if (item) return res.status(200).json({ image: item.image, mimeType: item.mimeType });
        return res.status(404).json({ error: 'Image not found' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
