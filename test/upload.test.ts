import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadAdImage } from '../src/lib/api';

// Node-Testumgebung: minimaler localStorage-Ersatz für Token/User.
const storage = new Map<string, string>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeImageFile(name = 'bild.jpg'): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  storage.clear();
  storage.set('fwg_auth_token', 'test-token');
  storage.set('fwg_auth_user', JSON.stringify({ id: 'user-1' }));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('uploadAdImage', () => {
  it('sendet multipart mit Authorization und ohne JSON-Content-Type', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ url: 'https://nachhilfe-sv.de/uploads/ads/abc.jpg' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadAdImage(makeImageFile());

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ url: 'https://nachhilfe-sv.de/uploads/ads/abc.jpg' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/upload.php');
    expect(options.method).toBe('POST');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    expect((options.headers as Record<string, string>)['Content-Type']).toBeUndefined();

    expect(options.body).toBeInstanceOf(FormData);
    const uploaded = (options.body as FormData).get('file');
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe('bild.jpg');
  });

  it('hebt relative Serverpfade auf eine absolute URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ url: '/uploads/ads/relativ.webp' })));

    const result = await uploadAdImage(makeImageFile('relativ.webp'));

    expect(result.error).toBeNull();
    // Außerhalb des Browsers ist der Fallback-Origin https://localhost.
    expect(result.data?.url).toBe('https://localhost/uploads/ads/relativ.webp');
  });

  it('gibt die deutsche Serverfehlermeldung unverändert weiter', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Das Bild ist zu groß (max. 5 MB).' }, 413)));

    const result = await uploadAdImage(makeImageFile());

    expect(result.data).toBeNull();
    expect(result.error.status).toBe(413);
    expect(result.error.message).toBe('Das Bild ist zu groß (max. 5 MB).');
  });

  it('verwirft eine Antwort ohne gültige Bild-URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true })));

    const result = await uploadAdImage(makeImageFile());

    expect(result.data).toBeNull();
    expect(result.error.message).toContain('keine gültige Bild-URL');
  });

  it('verlangt eine Anmeldung, bevor etwas hochgeladen wird', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    storage.delete('fwg_auth_token');

    const result = await uploadAdImage(makeImageFile());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error.status).toBe(401);
  });
});
