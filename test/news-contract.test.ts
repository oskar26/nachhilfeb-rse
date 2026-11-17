import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  getHiddenNewsIds,
  getReadNewsIds,
  getVisibleNews,
  hideNews,
  isNewsHidden,
  isNewsPopupEnabled,
  isNewsRead,
  markNewsRead,
  newsStorageKeys,
  normalizeNews,
  normalizeNewsList,
  setNewsPopupEnabled,
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

describe('reader payload contract', () => {
  it('normalizes a content-only API row and lets the popup open for it', () => {
    const item = normalizeNews(contentRow);
    expect(item).not.toBeNull();
    expect(item?.body).toBe(contentRow.content);
    expect(item?.content).toBe(contentRow.content);
    expect(item?.icon).toBe('megaphone');
    expect(showNewsPopup(item, 'user-a')).toBe(true);
  });

  it('normalizes the legacy body shape without losing the icon', () => {
    const item = normalizeNews(bodyRow);
    expect(item?.body).toBe(bodyRow.body);
    expect(item?.content).toBe(bodyRow.body);
    expect(item?.icon).toBe('star');
    expect(showNewsPopup(item, 'user-a')).toBe(true);
  });

  it('builds the popup candidate list from mixed payload shapes', () => {
    const items = normalizeNewsList([
      contentRow,
      { id: 'broken', title: '   ' },
      bodyRow,
    ]);

    expect(items.map((item) => item.id)).toEqual(['news-content', 'news-body']);
    expect(sortNews(items).map((item) => item.id)).toEqual(['news-body', 'news-content']);

    const candidates = sortNews(items).filter((item) => showNewsPopup(item, 'user-a'));
    expect(candidates.map((item) => item.id)).toEqual(['news-body', 'news-content']);
  });

  it('treats invalid JSON and non-array payloads as an empty news list', () => {
    expect(normalizeNewsList('{not-json')).toEqual([]);
    expect(normalizeNewsList({ rows: [contentRow] })).toEqual([]);
    expect(normalizeNews(null)).toBeNull();
  });
});

describe('read versus hide', () => {
  it('marks Verstanden as read but leaves the item available in the archive', () => {
    const item = normalizeNews(contentRow)!;
    expect(markNewsRead(item.id, 'user-a')).toBe(true);

    expect(isNewsRead(item.id, 'user-a')).toBe(true);
    expect(isNewsHidden(item.id, 'user-a')).toBe(false);
    expect(showNewsPopup(item, 'user-a')).toBe(false);
    expect(getVisibleNews([item], 'user-a')).toEqual([]);

    // Das Archiv liest den Lese-Status separat; die News bleibt vorhanden.
    const archive = normalizeNewsList([contentRow]).filter((row) => isNewsRead(row.id, 'user-a'));
    expect(archive.map((row) => row.id)).toEqual([item.id]);
  });

  it('hides an item without marking it read', () => {
    const item = normalizeNews(contentRow)!;
    expect(hideNews(item.id, 'user-a')).toBe(true);

    expect(isNewsHidden(item.id, 'user-a')).toBe(true);
    expect(isNewsRead(item.id, 'user-a')).toBe(false);
    expect(showNewsPopup(item, 'user-a')).toBe(false);
    expect(getHiddenNewsIds('user-a')).toEqual([item.id]);

    expect(unhideNews(item.id, 'user-a')).toBe(true);
    expect(showNewsPopup(item, 'user-a')).toBe(true);
  });

  it('persists read and hidden state separately per user', () => {
    const [first, second] = normalizeNewsList([contentRow, bodyRow]);

    markNewsRead(first.id, 'user-a');
    hideNews(second.id, 'user-a');

    expect(getReadNewsIds('user-a')).toEqual([first.id]);
    expect(getHiddenNewsIds('user-a')).toEqual([second.id]);
    expect(isNewsRead(first.id, 'user-b')).toBe(false);
    expect(isNewsHidden(second.id, 'user-b')).toBe(false);
  });
});

describe('popup-disabled setting', () => {
  it('prevents the popup for unread items and can be re-enabled', () => {
    const item = normalizeNews(contentRow)!;
    expect(setNewsPopupEnabled(false, 'user-a')).toBe(true);

    expect(isNewsPopupEnabled('user-a')).toBe(false);
    expect(showNewsPopup(item, 'user-a')).toBe(false);
    expect(showNewsPopup(undefined, 'user-a')).toBe(false);

    expect(setNewsPopupEnabled(true, 'user-a')).toBe(true);
    expect(showNewsPopup(item, 'user-a')).toBe(true);
  });

  it('keeps the popup enabled when the stored setting is invalid JSON', () => {
    storage.setItem(newsStorageKeys('user-a').popupEnabled, '{not-json');
    storage.setItem(newsStorageKeys('user-a').read, '{not-json');
    storage.setItem(newsStorageKeys('user-a').hidden, '{"not":"an-array"}');

    expect(isNewsPopupEnabled('user-a')).toBe(true);
    expect(getReadNewsIds('user-a')).toEqual([]);
    expect(getHiddenNewsIds('user-a')).toEqual([]);
  });
});

describe('cross-layer contract guards', () => {
  const readRepoFile = (relativePath: string) =>
    readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

  it('AdminNews writes the content field instead of the old body payload', () => {
    const adminSource = readRepoFile('src/pages/admin/AdminNews.tsx');
    expect(adminSource).toMatch(/content:\s*content\.trim\(\)/);
    expect(adminSource).not.toMatch(/body:\s*body\.trim\(\)/);
    expect(adminSource).toContain('sanitizeHtml');
  });

  it('api/news.php accepts content and preserves the German validation message', () => {
    const phpSource = readRepoFile('api/news.php');
    expect(phpSource).toMatch(/\$data\['content'\] \?\? \$data\['body'\]/);
    expect(phpSource).toContain("INSERT INTO news (id, title, content, author_id, is_pinned)");
    expect(phpSource).toContain('Titel und Inhalt sind erforderlich.');
    expect(phpSource).not.toMatch(/INSERT INTO news[^;]*icon/i);

    // Der gemeinsame JSON-Parser behält seine deutsche 400er-Meldung.
    const responsePhp = readRepoFile('api/response.php');
    expect(responsePhp).toContain('Ungültiges JSON-Format im Request Body');
  });

  it('keeps the news schema on content and does not invent an icon column', () => {
    const schema = readRepoFile('sql/allinkl_schema.sql');
    const start = schema.indexOf('CREATE TABLE IF NOT EXISTS `news`');
    expect(start).toBeGreaterThanOrEqual(0);
    const table = schema.slice(start, schema.indexOf('-- 16.', start));
    expect(table).toContain('`content` TEXT NOT NULL');
    expect(table).not.toContain('`icon`');
  });

  it('routes the remaining news readers through the shared normalizer and no legacy dismissal key', () => {
    const widgetSource = readRepoFile('src/components/CollapsedNewsWidget.tsx');
    const quickMenuSource = readRepoFile('src/components/MobileQuickMenu.tsx');

    expect(widgetSource).toContain('normalizeNewsList');
    expect(widgetSource).toContain('getVisibleNews');
    expect(widgetSource).not.toContain('dismissed_news_ids');

    expect(quickMenuSource).toContain('normalizeNewsList');
    expect(quickMenuSource).not.toContain('dismissed_news_ids');
  });

  it('keeps the news archive deep link, event module, card preference, and PHP plain-text cleanup wired', () => {
    const preferencesSource = readRepoFile('src/components/news/NewsPreferences.tsx');
    const phpSource = readRepoFile('api/news.php');
    const adminSource = readRepoFile('src/pages/admin/AdminNews.tsx');

    expect(readRepoFile('src/App.tsx')).not.toContain('NewsPopupModal');
    expect(preferencesSource).toContain('useSearchParams');
    expect(preferencesSource).toContain('isNewsCardEnabled');
    expect(preferencesSource).not.toContain('export const NEWS_STATE_EVENT');
    expect(readRepoFile('src/lib/news-events.ts')).toContain('fwg:news-state-changed');
    expect(phpSource).toContain('(script|style)');
    expect(adminSource).toContain('<code>news</code>');
  });
});
