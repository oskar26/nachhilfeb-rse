/**
 * Express-Router Adapter für den KI-Entwurfsdienst (NVIDIA API)
 */

export function createExpressAiRouter(options = {}) {
  const { aiService, requireAuthenticatedUser, limitAiFeature } = options;

  if (!aiService) {
    throw new Error('createExpressAiRouter benötigt eine aiService-Instanz');
  }

  // Erstelle Router dynamisch oder nutze geliefertes Express
  let RouterFactory;
  try {
    const express = options.express || (typeof require !== 'undefined' ? require('express') : null);
    if (express && express.Router) {
      RouterFactory = express.Router;
    }
  } catch (e) {
    // Falls express nicht direkt geladen werden kann
  }

  const routerHandler = async (req, res) => {
    try {
      const payload = req.body;

      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({
          ok: false,
          error: 'Ungültiger Request-Body. JSON-Payload erwartet.',
        });
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
    } catch (err) {
      console.error('[AI Express Router Error]:', err);
      const isUserError = err.message.includes('Ungültig') || err.message.includes('fehlt');
      const isRateLimit = err.message.includes('429') || err.message.includes('Rate limit');

      const statusCode = isUserError ? 400 : isRateLimit ? 429 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: err.message || 'Interner Fehler bei der KI-Generierung',
      });
    }
  };

  // Falls ein echtes Express Router Objekt erzeugt werden soll
  if (RouterFactory) {
    const router = RouterFactory();
    const middlewares = [];
    if (typeof requireAuthenticatedUser === 'function') middlewares.push(requireAuthenticatedUser);
    if (typeof limitAiFeature === 'function') middlewares.push(limitAiFeature);

    router.post('/ai/generate', ...middlewares, routerHandler);
    return router;
  }

  // Standalone Controller Handler für flexible Einbindung
  return {
    handleGenerateRequest: routerHandler,
  };
}
