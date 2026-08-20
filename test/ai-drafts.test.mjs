/**
 * Lokale Tests für ai-drafts.mjs – ohne echten NVIDIA-Key
 * Verwendet node:test und einen simulierten NVIDIA-Endpunkt.
 *
 * Ausführen: node --test test/ai-drafts.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAiDraftService,
  parseCleanJson,
  splitIntoSentences,
  ensureThreeSentences,
} from '../src/ai/ai-drafts.mjs';

// ─── Helper: Simulierter NVIDIA-Fetch ───

function createMockFetch(responseBody, { status = 200, delay = 0, failCount = 0 } = {}) {
  let callCount = 0;
  return async (_url, _opts) => {
    callCount++;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    if (callCount <= failCount) {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Mock 500 error',
        json: async () => ({ error: 'Mock error' }),
      };
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: async () => JSON.stringify(responseBody),
      json: async () => responseBody,
    };
  };
}

function nvidiaResponse(content, model = 'test-model') {
  return {
    id: 'mock-id',
    object: 'chat.completion',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    model,
    usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 },
  };
}

// ─── parseCleanJson ───

describe('parseCleanJson', () => {
  it('parst reines JSON', () => {
    const result = parseCleanJson('{"title":"Test"}');
    assert.deepStrictEqual(result, { title: 'Test' });
  });

  it('entfernt Markdown-Codeblock', () => {
    const result = parseCleanJson('```json\n{"title":"Test"}\n```');
    assert.deepStrictEqual(result, { title: 'Test' });
  });

  it('extrahiert JSON aus umgebendem Text', () => {
    const result = parseCleanJson('Hier ist das JSON: {"title":"Test"} fertig.');
    assert.deepStrictEqual(result, { title: 'Test' });
  });

  it('wirft bei leerem Input', () => {
    assert.throws(() => parseCleanJson(''), /Leere Antwort/);
  });

  it('wirft bei ungültigem JSON', () => {
    assert.throws(() => parseCleanJson('nicht json'), /Fehler beim Parsen/);
  });
});

// ─── splitIntoSentences ───

describe('splitIntoSentences', () => {
  it('teilt Standardsätze korrekt', () => {
    const result = splitIntoSentences('Satz eins. Satz zwei. Satz drei.');
    assert.strictEqual(result.length, 3);
  });

  it('behandelt leeren String', () => {
    assert.deepStrictEqual(splitIntoSentences(''), []);
  });

  it('behandelt null', () => {
    assert.deepStrictEqual(splitIntoSentences(null), []);
  });
});

// ─── ensureThreeSentences ───

describe('ensureThreeSentences', () => {
  it('lässt genau drei Sätze unverändert', () => {
    const input = 'Satz eins. Satz zwei. Satz drei.';
    const result = ensureThreeSentences(input);
    assert.strictEqual(splitIntoSentences(result).length, 3);
  });

  it('kürzt mehr als drei Sätze', () => {
    const input = 'Eins. Zwei. Drei. Vier. Fünf.';
    const result = ensureThreeSentences(input);
    assert.strictEqual(splitIntoSentences(result).length, 3);
  });

  it('lässt weniger als drei Sätze in sauberer Form', () => {
    const input = 'Nur ein Satz. Und ein zweiter.';
    const result = ensureThreeSentences(input);
    assert.ok(result.length > 0, 'Ergebnis sollte nicht leer sein');
  });

  it('behandelt leeren String', () => {
    assert.strictEqual(ensureThreeSentences(''), '');
  });
});

// ─── generateDraft – listing ───

describe('generateDraft – listing', () => {
  it('gibt korrekten Inseratentwurf zurück', async () => {
    const mockContent = JSON.stringify({
      title: 'Mathe-Nachhilfe für Klasse 8',
      tags: ['Mathematik', 'Klasse 8'],
      description: 'Ich biete Nachhilfe in Mathe an.',
      clarifying_questions: [],
    });

    const service = createAiDraftService({
      apiKey: 'nvapi-test-key',
      customFetch: createMockFetch(nvidiaResponse(mockContent)),
    });

    const result = await service.generateDraft({
      feature: 'listing',
      input: { intent: 'offering', subject: 'Mathematik', grade: '8', topic: 'Algebra' },
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.feature, 'listing');
    assert.strictEqual(result.data.title, 'Mathe-Nachhilfe für Klasse 8');
    assert.ok(Array.isArray(result.data.tags));
    assert.ok(result.usage.total_tokens > 0);
  });

  it('parst JSON auch wenn in Codeblock verpackt', async () => {
    const mockContent = '```json\n{"title":"Test","tags":[],"description":"ok","clarifying_questions":[]}\n```';

    const service = createAiDraftService({
      apiKey: 'nvapi-test-key',
      customFetch: createMockFetch(nvidiaResponse(mockContent)),
    });

    const result = await service.generateDraft({
      feature: 'listing',
      input: { subject: 'Deutsch' },
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.data.title, 'Test');
  });
});

// ─── generateDraft – parent_briefing ───

describe('generateDraft – parent_briefing', () => {
  it('gibt korrektes 3-Satz-Briefing zurück', async () => {
    const mockContent = JSON.stringify({
      summary:
        'Heute wurde 45 Minuten am Bruchrechnen gearbeitet. Lena hat Kürzen und Erweitern geübt. Bis nächste Woche sollen zwei Aufgaben wiederholt werden.',
    });

    const service = createAiDraftService({
      apiKey: 'nvapi-test-key',
      customFetch: createMockFetch(nvidiaResponse(mockContent)),
    });

    const result = await service.generateDraft({
      feature: 'parent_briefing',
      input: {
        student_first_name: 'Lena',
        duration_minutes: 45,
        subject: 'Mathematik',
        topic: 'Bruchrechnen',
        practiced: 'Kürzen und Erweitern',
        progress: 'Gute Fortschritte',
        next_step: 'Zwei Aufgaben wiederholen',
      },
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.feature, 'parent_briefing');
    const sentenceCount = splitIntoSentences(result.data.summary).length;
    assert.ok(sentenceCount <= 3, `Erwartet maximal 3 Sätze, erhalten: ${sentenceCount}`);
  });

  it('kürzt mehr als 3 Sätze vom Modell', async () => {
    const mockContent = JSON.stringify({
      summary: 'Satz eins. Satz zwei. Satz drei. Satz vier. Satz fünf.',
    });

    const service = createAiDraftService({
      apiKey: 'nvapi-test-key',
      customFetch: createMockFetch(nvidiaResponse(mockContent)),
    });

    const result = await service.generateDraft({
      feature: 'parent_briefing',
      input: { student_first_name: 'Max', subject: 'Deutsch' },
    });

    const sentenceCount = splitIntoSentences(result.data.summary).length;
    assert.ok(sentenceCount <= 3, `Erwartet maximal 3 Sätze, erhalten: ${sentenceCount}`);
  });
});

// ─── Error Handling ───

describe('Error Handling', () => {
  it('wirft bei fehlendem API Key', async () => {
    const service = createAiDraftService({ apiKey: undefined });

    await assert.rejects(
      () => service.generateDraft({ feature: 'listing', input: { subject: 'X' } }),
      /API Key fehlt/
    );
  });

  it('wirft bei unbekanntem Feature', async () => {
    const service = createAiDraftService({ apiKey: 'test' });

    await assert.rejects(
      () => service.generateDraft({ feature: 'unknown', input: {} }),
      /Unbekanntes KI-Feature/
    );
  });

  it('retried bei transientem 500-Fehler und gibt dann Ergebnis', async () => {
    const mockContent = JSON.stringify({
      title: 'OK nach Retry',
      tags: [],
      description: 'Funktioniert.',
      clarifying_questions: [],
    });

    const service = createAiDraftService({
      apiKey: 'nvapi-test-key',
      customFetch: createMockFetch(nvidiaResponse(mockContent), { failCount: 1 }),
    });

    const result = await service.generateDraft({
      feature: 'listing',
      input: { subject: 'Physik' },
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.data.title, 'OK nach Retry');
  });

  it('wirft nach maximal 1 Retry bei permanentem 500', async () => {
    const service = createAiDraftService({
      apiKey: 'nvapi-test-key',
      customFetch: createMockFetch({}, { failCount: 999 }),
    });

    await assert.rejects(
      () => service.generateDraft({ feature: 'listing', input: { subject: 'Bio' } }),
      /NVIDIA API Fehler/
    );
  });

  it('behandelt Timeout korrekt', async () => {
    // Custom fetch that respects AbortSignal
    const slowFetch = async (_url, opts) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => nvidiaResponse('{}'),
          });
        }, 500);
        if (opts?.signal) {
          opts.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    };

    const service = createAiDraftService({
      apiKey: 'nvapi-test-key',
      timeoutMs: 50,
      maxRetries: 0,
      customFetch: slowFetch,
    });

    await assert.rejects(
      () => service.generateDraft({ feature: 'listing', input: { subject: 'X' } }),
      (err) => err.name === 'AbortError' || err.message.includes('abort')
    );
  });
});
