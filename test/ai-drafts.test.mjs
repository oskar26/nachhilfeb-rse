import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import generate, { config } from '../netlify/functions/generate.js';

describe('Stillgelegte KI-Generierung', () => {
  it('behält den bisherigen API-Pfad bei', () => {
    assert.equal(config.path, '/api/ai/generate');
  });

  it('antwortet mit 410 und einer verständlichen JSON-Fehlermeldung', async () => {
    const response = await generate();
    assert.equal(response.status, 410);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'Die KI-Generierung ist nicht mehr verfügbar.',
    });
  });

  it('liefert sichere, nicht cachebare JSON-Antworten', async () => {
    const response = await generate();
    assert.equal(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  });

  it('erzeugt für jeden Aufruf eine unabhängig lesbare Antwort', async () => {
    const first = await generate();
    const second = await generate();
    assert.notEqual(first, second);
    assert.deepEqual(await first.json(), await second.json());
  });
});
