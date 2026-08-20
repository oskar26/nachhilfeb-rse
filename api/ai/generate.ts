import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { createAiDraftService } from '../../src/ai/ai-drafts.mjs';

const aiService = createAiDraftService({
  apiKey: process.env.NVIDIA_API_KEY,
  models: {
    listing: process.env.NVIDIA_LISTING_MODEL,
    parentBriefing: process.env.NVIDIA_PARENT_BRIEFING_MODEL,
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Methode nicht erlaubt. Bitte POST verwenden.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, error: 'Ungültiger Body' });
    }

    const { feature } = payload;
    if (!['listing', 'parent_briefing'].includes(feature)) {
      return res.status(400).json({
        ok: false,
        error: `Ungültiges Feature '${feature}'. Erlaubt sind 'listing' und 'parent_briefing'.`,
      });
    }

    const result = await aiService.generateDraft(payload);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[API /api/ai/generate Error]:', err);
    const isUserError = err.message?.includes('Ungültig') || err.message?.includes('fehlt');
    const isRateLimit = err.message?.includes('429') || err.message?.includes('Rate limit');

    const status = isUserError ? 400 : isRateLimit ? 429 : 500;
    return res.status(status).json({
      ok: false,
      error: err.message || 'Interner Serverfehler bei der KI-Generierung',
    });
  }
}
