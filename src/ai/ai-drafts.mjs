/**
 * Framework-unabhängiger Kern für KI-Entwürfe über die NVIDIA API (OpenAI-kompatibel).
 *
 * Modellentscheidungen:
 * - Smart Inserat Assistant: nvidia/nemotron-3.5-lightning-30b-a3b (temp: 0.35, max_tokens: 420)
 * - KI-Eltern-Fortschritts-Synthese: nvidia/nemotron-3-nano-30b-a3b (temp: 0.25, max_tokens: 260, 3 Sätze)
 */

export const DEFAULT_MODELS = {
  listing: 'nvidia/nemotron-3.5-lightning-30b-a3b',
  parentBriefing: 'nvidia/nemotron-3-nano-30b-a3b',
};

export const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

/**
 * Hilfsfunktion zum Teilen von Text in Sätze
 */
export function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') return [];
  // Teilt bei Satzendezeichen (. ! ?), gefolgt von Leerzeichen oder Ende, ignoriert Abkürzungen wie z.B.
  const rawSentences = text
    .replace(/([.?!])\s+/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return rawSentences;
}

/**
 * Erzwingt serverseitig genau drei Sätze für das Eltern-Briefing
 */
export function ensureThreeSentences(text) {
  if (!text) return '';
  const sentences = splitIntoSentences(text);

  if (sentences.length === 3) {
    return sentences.join(' ');
  }

  if (sentences.length > 3) {
    return sentences.slice(0, 3).join(' ');
  }

  // Wenn weniger als 3 Sätze geliefert wurden: versuche Kommasätze oder Teilsätze zu trennen
  if (sentences.length < 3) {
    const clauseSplit = text
      .split(/;\s*|\s+und\s+|\s+wobei\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (clauseSplit.length >= 3) {
      return clauseSplit
        .slice(0, 3)
        .map((s) => (/[.?!]$/.test(s) ? s : s + '.'))
        .join(' ');
    }

    // Fallback: Wenn nur 1 oder 2 Sätze vorhanden sind, belasse die Sätze sauber
    return sentences.map((s) => (/[.?!]$/.test(s) ? s : s + '.')).join(' ');
  }

  return text;
}

/**
 * Reinigt und parst JSON aus KI-Antworten (behandelt auch ```json ... ```)
 */
export function parseCleanJson(content) {
  if (!content) throw new Error('Leere Antwort erhalten');

  let cleaned = content.trim();
  // Entferne Markdown Codeblocks falls vorhanden
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Falls zusätzlicher Freitext vor/nach dem JSON steht: versuche JSON-Objekt zu extrahieren
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Fehler beim Parsen der KI-Antwort als JSON: ${err.message}`);
  }
}

/**
 * Erstellt den AI Draft Service
 */
export function createAiDraftService(options = {}) {
  const apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env.NVIDIA_API_KEY : undefined);
  const baseUrl = options.baseUrl || (typeof process !== 'undefined' && process.env.NVIDIA_BASE_URL) || DEFAULT_NVIDIA_BASE_URL;
  const timeoutMs = options.timeoutMs || 18000;
  const maxRetries = options.maxRetries ?? 1;

  const models = {
    listing: options.models?.listing || (typeof process !== 'undefined' ? process.env.NVIDIA_LISTING_MODEL : undefined) || DEFAULT_MODELS.listing,
    parentBriefing: options.models?.parentBriefing || (typeof process !== 'undefined' ? process.env.NVIDIA_PARENT_BRIEFING_MODEL : undefined) || DEFAULT_MODELS.parentBriefing,
  };

  const fetchWithTimeout = async (url, fetchOpts, retryCount = 0) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await (options.customFetch || fetch)(url, {
        ...fetchOpts,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Bei transienten Fehlern (429, 500, 502, 503, 504) genau 1 Retry
      if (!response.ok) {
        const isTransient = [429, 500, 502, 503, 504].includes(response.status);
        if (isTransient && retryCount < maxRetries) {
          const delay = 600 + Math.floor(Math.random() * 400);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchWithTimeout(url, fetchOpts, retryCount + 1);
        }

        const errText = await response.text().catch(() => '');
        throw new Error(`NVIDIA API Fehler (HTTP ${response.status}): ${errText || response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      const isTimeoutOrNetwork = err.name === 'AbortError' || err.message.includes('fetch failed') || err.message.includes('network');

      if (isTimeoutOrNetwork && retryCount < maxRetries) {
        const delay = 600 + Math.floor(Math.random() * 400);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithTimeout(url, fetchOpts, retryCount + 1);
      }

      throw err;
    }
  };

  /**
   * Generiert Inserat-Entwurf (Smart Inserat Assistant)
   */
  const generateListingDraft = async (input) => {
    if (!input || typeof input !== 'object') {
      throw new Error('Ungültige Eingabe für Inserat-Entwurf');
    }

    const { intent = 'searching', subject = '', grade = '', topic = '', availability = '', details = '' } = input;

    const systemPrompt = `Du bist ein hochqualifizierter Assistent für die FWG-Nachhilfebörse des Friedrich-Wilhelms-Gymnasiums Köln.
Deine Aufgabe ist es, aus den stichpunktartigen Eingaben einen gut formulierten, ansprechenden Inseratentwurf zu erstellen.
WICHTIGE REGELN:
1. Antworte AUSSCHLIESSLICH im validen JSON-Format. Kein Markdown, kein einleitender Text, keine Erklärungen.
2. Das JSON MUSS genau diese Struktur haben:
{
  "title": "Ein prägnanter, ansprechender Titel (max. 70 Zeichen)",
  "tags": ["Fach", "Klasse", "Stichwort1", "Stichwort2"],
  "description": "Eine freundliche, gut formulierte Beschreibung (2-4 Sätze)",
  "clarifying_questions": []
}`;

    const intentText = intent === 'offering' ? 'Ich biete Nachhilfe an' : 'Ich suche Nachhilfe';
    const userPrompt = `Erstelle ein Inserat mit folgenden Daten:
- Art: ${intentText}
- Fach: ${subject || 'Allgemein'}
- Klassenstufe: ${grade ? `Klasse ${grade}` : 'Nicht angegeben'}
- Thema/Schwerpunkt: ${topic || 'Allgemeine Hilfe'}
- Verfügbarkeit/Zeiten: ${availability || 'Nach Absprache'}
- Zusätzliche Details: ${details || 'Keine'}
    `.trim();

    const requestBody = {
      model: models.listing,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 420,
      top_p: 1,
      stream: false,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    const data = await fetchWithTimeout(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const content = data?.choices?.[0]?.message?.content;
    const parsedData = parseCleanJson(content);

    return {
      ok: true,
      feature: 'listing',
      model: models.listing,
      data: {
        title: parsedData.title || `Nachhilfe ${subject} - Klasse ${grade}`,
        tags: Array.isArray(parsedData.tags) ? parsedData.tags : [subject, grade ? `Klasse ${grade}` : ''].filter(Boolean),
        description: parsedData.description || 'Keine Beschreibung generiert.',
        clarifying_questions: Array.isArray(parsedData.clarifying_questions) ? parsedData.clarifying_questions : [],
      },
      usage: {
        prompt_tokens: data?.usage?.prompt_tokens || 0,
        completion_tokens: data?.usage?.completion_tokens || 0,
        total_tokens: data?.usage?.total_tokens || 0,
      },
    };
  };

  /**
   * Generiert KI-Eltern-Fortschritts-Synthese (Eltern-Briefing)
   */
  const generateParentBriefingDraft = async (input) => {
    if (!input || typeof input !== 'object') {
      throw new Error('Ungültige Eingabe für Eltern-Briefing');
    }

    const {
      student_first_name = 'Schüler/in',
      duration_minutes = 45,
      subject = '',
      topic = '',
      practiced = '',
      progress = '',
      next_step = '',
    } = input;

    const systemPrompt = `Du bist ein pädagogischer Assistent für die FWG-Nachhilfebörse.
Erstelle aus den Angaben zum Nachhilfe-Fortschritt eine sachliche, ermutigende und streng faktengebundene Zusammenfassung für die Eltern.
STRENGSTE REGELN:
1. Der Text MUSS AUSSCHLIESSLICH aus genau drei Sätzen bestehen. Nicht zwei, nicht vier, genau drei Sätze!
2. Füge KEINE erfundenen Fakten hinzu, sondern beziehe dich rein auf die gelieferten Angaben.
3. Antworte AUSSCHLIESSLICH als valides JSON-Objekt ohne Markdown.
JSON-Struktur:
{
  "summary": "Satz 1 über Dauer, Fach und Thema. Satz 2 über Geübtes und Fortschritt. Satz 3 über nächste Schritte oder Übungen."
}`;

    const userPrompt = `Erstelle ein Eltern-Briefing (EXAKT DREI SÄTZE):
- Name des Kindes: ${student_first_name}
- Dauer: ${duration_minutes} Minuten
- Fach: ${subject}
- Thema: ${topic}
- Geübt: ${practiced}
- Fortschritt/Erkenntnis: ${progress}
- Nächste Schritte/Hausaufgabe: ${next_step}
    `.trim();

    const requestBody = {
      model: models.parentBriefing,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.25,
      max_tokens: 260,
      top_p: 1,
      stream: false,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    const data = await fetchWithTimeout(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const content = data?.choices?.[0]?.message?.content;
    const parsedData = parseCleanJson(content);

    const validatedSummary = ensureThreeSentences(parsedData.summary || '');

    return {
      ok: true,
      feature: 'parent_briefing',
      model: models.parentBriefing,
      data: {
        summary: validatedSummary,
      },
      usage: {
        prompt_tokens: data?.usage?.prompt_tokens || 0,
        completion_tokens: data?.usage?.completion_tokens || 0,
        total_tokens: data?.usage?.total_tokens || 0,
      },
    };
  };

  /**
   * Hauptfunktion generateDraft
   */
  const generateDraft = async (payload) => {
    if (!apiKey) {
      throw new Error('NVIDIA API Key fehlt. Bitte NVIDIA_API_KEY in der Serverumgebung setzen.');
    }

    if (!payload || typeof payload !== 'object') {
      throw new Error('Ungültiger Request-Body');
    }

    const { feature, input } = payload;

    if (feature === 'listing') {
      return await generateListingDraft(input);
    } else if (feature === 'parent_briefing') {
      return await generateParentBriefingDraft(input);
    } else {
      throw new Error(`Unbekanntes KI-Feature '${feature}'. Unterstützt werden: 'listing', 'parent_briefing'.`);
    }
  };

  return {
    generateDraft,
    generateListingDraft,
    generateParentBriefingDraft,
  };
}
