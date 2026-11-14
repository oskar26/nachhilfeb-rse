import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadAdImage } from '../src/lib/api';
import { AD_IMAGE_MAX_BYTES, adImageFileProblem } from '../src/lib/image';

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
    expect(result.error?.status).toBe(413);
    expect(result.error?.message).toBe('Das Bild ist zu groß (max. 5 MB).');
  });

  it('verwirft eine Antwort ohne gültige Bild-URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true })));

    const result = await uploadAdImage(makeImageFile());

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('keine gültige Bild-URL');
  });

  it('verlangt eine Anmeldung, bevor etwas hochgeladen wird', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    storage.delete('fwg_auth_token');

    const result = await uploadAdImage(makeImageFile());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it('liest den Fehlercode auch aus details.code und räumt bei 401 die Session auf', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      error: 'Nicht autorisiert. Bitte melde dich an.',
      details: { code: 'unauthorized' },
    }, 401)));

    const result = await uploadAdImage(makeImageFile());

    expect(result.data).toBeNull();
    expect(result.error?.status).toBe(401);
    expect(result.error?.code).toBe('unauthorized');
    expect(storage.has('fwg_auth_token')).toBe(false);
    expect(storage.has('fwg_auth_user')).toBe(false);
  });

  it('dispatcht bei 403 fwg:access-denied mit details.code', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent, location: { origin: 'https://app.example' } });
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      error: 'Du musst dich erst verifizieren.',
      details: { code: 'not_verified' },
    }, 403)));

    const result = await uploadAdImage(makeImageFile());

    expect(result.data).toBeNull();
    expect(result.error?.status).toBe(403);
    expect(result.error?.code).toBe('not_verified');
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<{ code?: string }>;
    expect(event.type).toBe('fwg:access-denied');
    expect(event.detail.code).toBe('not_verified');
  });

  it('dispatcht bei anderen 403-Codes kein Access-Gate-Event', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent, location: { origin: 'https://app.example' } });
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      error: 'Zugriff verweigert.',
      details: { code: 'forbidden' },
    }, 403)));

    const result = await uploadAdImage(makeImageFile());

    expect(result.error?.status).toBe(403);
    expect(result.error?.code).toBe('forbidden');
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});

describe('adImageFileProblem', () => {
  it('akzeptiert image/jpg als JPEG-Schreibweise', () => {
    expect(adImageFileProblem(new File(['x'], 'bild.jpg', { type: 'image/jpg' }))).toBeNull();
  });

  it('akzeptiert JPEG, PNG und WebP', () => {
    expect(adImageFileProblem(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBeNull();
    expect(adImageFileProblem(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(adImageFileProblem(new File(['x'], 'a.webp', { type: 'image/webp' }))).toBeNull();
  });

  it('lehnt SVG und Dateien über 5 MB ab', () => {
    expect(adImageFileProblem(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))).toContain('JPEG, PNG oder WebP');
    const tooLarge = { name: 'gross.jpg', type: 'image/jpeg', size: AD_IMAGE_MAX_BYTES + 1 } as File;
    expect(adImageFileProblem(tooLarge)).toContain('max. 5 MB');
  });

  it('lehnt leere Dateien ab', () => {
    expect(adImageFileProblem(new File([], 'leer.jpg', { type: 'image/jpeg' }))).toContain('leer');
  });
});
