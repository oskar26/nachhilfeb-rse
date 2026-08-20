import { createAiDraftService } from '../../src/ai/ai-drafts.mjs';

const aiService = createAiDraftService({
  apiKey: process.env.NVIDIA_API_KEY,
  models: {
    listing: process.env.NVIDIA_LISTING_MODEL,
    parentBriefing: process.env.NVIDIA_PARENT_BRIEFING_MODEL,
  },
});

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Methode nicht erlaubt. Bitte POST verwenden.' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload = await req.json();

    if (!payload || typeof payload !== 'object') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Ungültiger Body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { feature } = payload;
    if (!['listing', 'parent_briefing'].includes(feature)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Ungültiges Feature '${feature}'. Erlaubt sind 'listing' und 'parent_briefing'.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await aiService.generateDraft(payload);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Netlify Function /api/ai/generate Error]:', err);
    const isUserError = err.message?.includes('Ungültig') || err.message?.includes('fehlt');
    const isRateLimit = err.message?.includes('429') || err.message?.includes('Rate limit');

    const status = isUserError ? 400 : isRateLimit ? 429 : 500;
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message || 'Interner Serverfehler bei der KI-Generierung',
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = {
  path: '/api/ai/generate',
};
