/**
 * Browser-Helfer für den Aufruf des eigenen KI-API-Endpunkts /api/ai/generate
 */

/**
 * Sendet eine Anfrage an den eigenen KI-API-Endpunkt
 * @param {Object} payload - { feature: 'listing' | 'parent_briefing', input: Object }
 * @param {Object} [options] - Fetch-Optionen wie Headers
 * @returns {Promise<Object>} API-Antwort
 */
export async function requestAiDraft(payload, options = {}) {
  const endpoint = options.endpoint || '/api/ai/generate';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const errorMsg = data.error || `HTTP-Fehler ${response.status} bei der KI-Generierung`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error('[AI Client Error]:', err);
    throw err;
  }
}

/**
 * Erstellt einen Inseratsentwurf (Smart Inserat Assistant)
 * @param {Object} input - { intent, subject, grade, topic, availability, details }
 * @returns {Promise<Object>}
 */
export async function generateListingDraft(input) {
  return requestAiDraft({
    feature: 'listing',
    input,
  });
}

/**
 * Erstellt eine KI-Eltern-Fortschritts-Synthese
 * @param {Object} input - { student_first_name, duration_minutes, subject, topic, practiced, progress, next_step }
 * @returns {Promise<Object>}
 */
export async function generateParentBriefingDraft(input) {
  return requestAiDraft({
    feature: 'parent_briefing',
    input,
  });
}
