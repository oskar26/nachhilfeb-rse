import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  LEGACY_DISMISSED_NEWS_KEY,
  NEWS_ICON_FALLBACK,
  clearHiddenNews,
  getHiddenNewsIds,
  getReadNewsIds,
  getVisibleNews,
  hideNews,
  isNewsHidden,
  isNewsPopupEnabled,
  isNewsRead,
  markAllNewsRead,
  markNewsRead,
  markNewsUnread,
  newsStorageKeys,
  normalizeNews,
  normalizeNewsList,
  resetNewsPreferences,
  setNewsPopupEnabled,
  shouldShowNewsPopup,
  showNewsPopup,
  sortNews,
  unhideNews,
} from '../src/lib/news';

class MemoryStorage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
});

beforeEach(() => {
  storage.clear();
});

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

const contentRow = {
  id: 'news-content',
  title: 'Coaching-AG startet wieder',
  content: 'Anmeldung über die Coaching-Seite.',
  created_at: '2026-11-06T08:00:00.000Z',
};

const bodyRow = {
  id: 'news-body',
  title: 'Neue Sprechzeit im SV-Raum',
  body: 'Ab Montag ist das SV-Team in der ersten großen Pause da.',
  icon: 'star',
  created_at: '2026-11-10T08:00:00.000Z',
};

describe('normalizeNews', () => {
  it('accepts the content payload shape and falls back to the megaphone icon', () => {
    expect(normalizeNews(contentRow)).toEqual({
      id: 'news-content',
      title: 'Coaching-AG startet wieder',
      body: 'Anmeldung über die Coaching-Seite.',
      content: 'Anmeldung über die Coaching-Seite.',
      icon: NEWS_ICON_FALLBACK,
      created_at: '2026-11-06T08:00:00.000Z',
      is_pinned: false,
    });
  });

  it('accepts the legacy body payload shape and keeps a valid icon', () => {
    const item = normalizeNews(bodyRow);
    expect(item?.body).toBe(bodyRow.body);
    expect(item?.content).toBe(bodyRow.body);
    expect(item?.icon).toBe('star');
  });

  it('prefers body when both body and content exist', () => {
    const item = normalizeNews({ ...contentRow, body: 'Bevorzugt' });
    expect(item?.body).toBe('Bevorzugt');
    expect(item?.content).toBe('Bevorzugt');
  });

  it('rejects invalid rows without throwing', () => {
    expect(normalizeNews(null)).toBeNull();
    expect(normalizeNews(undefined)).toBeNull();
    expect(normalizeNews([])).toBeNull();
    expect(normalizeNews('news')).toBeNull();
    expect(normalizeNews({ ...contentRow, id: '' })).toBeNull();
    expect(normalizeNews({ ...contentRow, title: '   ' })).toBeNull();
    expect(normalizeNews({ ...contentRow, content: '' })).toBeNull();
    expect(normalizeNews({ ...contentRow, created_at: 'not-a-date' })).toBeNull();
    expect(normalizeNews({ ...contentRow, created_at: undefined })).toBeNull();
  });

  it('normalizes lists and silently drops broken entries', () => {
    const list = normalizeNewsList([contentRow, { id: 'broken' }, bodyRow]);
    expect(list.map((item) => item.id)).toEqual(['news-content', 'news-body']);
    expect(normalizeNewsList(null)).toEqual([]);
    expect(normalizeNewsList({})).toEqual([]);
  });

  it('sorts pinned news first and then newest first', () => {
    const items = normalizeNewsList([
      { ...contentRow, id: 'old', created_at: '2026-10-01T08:00:00.000Z' },
      { ...contentRow, id: 'new', created_at: '2026-11-12T08:00:00.000Z' },
      { ...contentRow, id: 'pinned', created_at: '2026-09-01T08:00:00.000Z', is_pinned: true },
    ]);
    expect(sortNews(items).map((item) => item.id)).toEqual(['pinned', 'new', 'old']);
  });
});

describe('read and hide state', () => {
  it('persists read state per user scope', () => {
    expect(isNewsRead('news-1', 'user-a')).toBe(false);
    expect(markNewsRead('news-1', 'user-a')).toBe(true);
    expect(isNewsRead('news-1', 'user-a')).toBe(true);
    expect(isNewsRead('news-1', 'user-b')).toBe(false);
    expect(getReadNewsIds('user-a')).toEqual(['news-1']);
    expect(getReadNewsIds('user-b')).toEqual([]);
  });

  it('reads the current user from the stored auth session', () => {
    storage.setItem('fwg_auth_user', JSON.stringify({ id: 'local-user' }));
    markNewsRead('news-2');
    expect(isNewsRead('news-2')).toBe(true);

    storage.setItem('fwg_auth_user', JSON.stringify({ id: 'other-user' }));
    expect(isNewsRead('news-2')).toBe(false);

    storage.removeItem('fwg_auth_user');
    expect(isNewsRead('news-2')).toBe(false);
    expect(isNewsRead('news-2', 'local-user')).toBe(true);
  });

  it('can unmark a single item and mark a batch', () => {
    markAllNewsRead(['news-1', 'news-2', 'news-2'], 'user-a');
    expect(getReadNewsIds('user-a')).toEqual(['news-1', 'news-2']);
    expect(markNewsUnread('news-1', 'user-a')).toBe(true);
    expect(getReadNewsIds('user-a')).toEqual(['news-2']);
  });

  it('persists hidden state separately from read state', () => {
    expect(hideNews('news-1', 'user-a')).toBe(true);
    expect(isNewsHidden('news-1', 'user-a')).toBe(true);
    expect(isNewsRead('news-1', 'user-a')).toBe(false);
    expect(getHiddenNewsIds('user-a')).toEqual(['news-1']);
    expect(unhideNews('news-1', 'user-a')).toBe(true);
    expect(isNewsHidden('news-1', 'user-a')).toBe(false);
    expect(clearHiddenNews('user-a')).toBe(true);
  });

  it('migrates the legacy global dismissed list into the personal scope once', () => {
    storage.setItem(LEGACY_DISMISSED_NEWS_KEY, JSON.stringify(['legacy-1']));
    expect(getHiddenNewsIds('user-a')).toEqual(['legacy-1']);
    expect(storage.getItem(LEGACY_DISMISSED_NEWS_KEY)).toBeNull();
    expect(getHiddenNewsIds('user-a')).toEqual(['legacy-1']);
    expect(getHiddenNewsIds('user-b')).toEqual([]);
  });
});

describe('popup preferences', () => {
  it('is enabled by default and can be turned off', () => {
    expect(isNewsPopupEnabled('user-a')).toBe(true);
    expect(setNewsPopupEnabled(false, 'user-a')).toBe(true);
    expect(isNewsPopupEnabled('user-a')).toBe(false);
    expect(isNewsPopupEnabled('user-b')).toBe(true);
    expect(setNewsPopupEnabled(true, 'user-a')).toBe(true);
    expect(isNewsPopupEnabled('user-a')).toBe(true);
  });

  it('does not open for read, hidden or disabled news', () => {
    expect(showNewsPopup('news-1', 'user-a')).toBe(true);
    expect(shouldShowNewsPopup('news-1', 'user-a')).toBe(true);

    markNewsRead('news-1', 'user-a');
    expect(showNewsPopup('news-1', 'user-a')).toBe(false);

    markNewsUnread('news-1', 'user-a');
    hideNews('news-1', 'user-a');
    expect(showNewsPopup('news-1', 'user-a')).toBe(false);

    unhideNews('news-1', 'user-a');
    setNewsPopupEnabled(false, 'user-a');
    expect(showNewsPopup('news-1', 'user-a')).toBe(false);
    expect(showNewsPopup(undefined, 'user-a')).toBe(false);
  });

  it('filters visible news for the archive and feed widget', () => {
    const items = normalizeNewsList([
      { ...contentRow, id: 'unread' },
      { ...contentRow, id: 'read' },
      { ...contentRow, id: 'hidden' },
    ]);
    markNewsRead('read', 'user-a');
    hideNews('hidden', 'user-a');
    expect(getVisibleNews(items, 'user-a').map((item) => item.id)).toEqual(['unread']);
  });

  it('resets all scoped preferences', () => {
    markNewsRead('news-1', 'user-a');
    hideNews('news-2', 'user-a');
    setNewsPopupEnabled(false, 'user-a');

    expect(resetNewsPreferences('user-a')).toBe(true);
    expect(getReadNewsIds('user-a')).toEqual([]);
    expect(getHiddenNewsIds('user-a')).toEqual([]);
    expect(isNewsPopupEnabled('user-a')).toBe(true);
  });
});

describe('storage failure safety', () => {
  it('treats malformed JSON as empty lists', () => {
    const keys = newsStorageKeys('user-a');
    storage.setItem(keys.read, '{not-json');
    storage.setItem(keys.hidden, '{"not":"an-array"}');

    expect(getReadNewsIds('user-a')).toEqual([]);
    expect(getHiddenNewsIds('user-a')).toEqual([]);
    expect(isNewsRead('news-1', 'user-a')).toBe(false);
    expect(isNewsHidden('news-1', 'user-a')).toBe(false);
  });

  it('keeps the popup enabled when the setting is malformed', () => {
    storage.setItem(newsStorageKeys('user-a').popupEnabled, '{not-json');
    expect(isNewsPopupEnabled('user-a')).toBe(true);
  });

  it('ignores invalid ids instead of corrupting storage', () => {
    expect(markNewsRead('', 'user-a')).toBe(false);
    expect(hideNews(null, 'user-a')).toBe(false);
    expect(getReadNewsIds('user-a')).toEqual([]);
    expect(getHiddenNewsIds('user-a')).toEqual([]);
  });
});
