import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  NEWS_CARD_STORAGE_KEY,
  isNewsCardEnabled,
  newsCardStorageKey,
  setNewsCardEnabled,
} from '../src/lib/news-preferences';

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

const memory = new MemoryStorage();
const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function useStorage(storage: Storage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
}

beforeEach(() => {
  useStorage(memory);
  memory.clear();
});

afterAll(() => {
  if (originalDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

describe('news card preference', () => {
  it('is enabled by default', () => {
    expect(isNewsCardEnabled('user-a')).toBe(true);
    expect(isNewsCardEnabled(null)).toBe(true);
  });

  it('can be disabled and re-enabled per viewer', () => {
    expect(setNewsCardEnabled(false, 'user-a')).toBe(true);
    expect(isNewsCardEnabled('user-a')).toBe(false);

    expect(setNewsCardEnabled(true, 'user-a')).toBe(true);
    expect(isNewsCardEnabled('user-a')).toBe(true);
  });

  it('scopes the stored value to the viewer', () => {
    expect(setNewsCardEnabled(false, 'user-a')).toBe(true);
    expect(isNewsCardEnabled('user-a')).toBe(false);

    expect(isNewsCardEnabled('user-b')).toBe(true);
    expect(isNewsCardEnabled(null)).toBe(true);

    expect(setNewsCardEnabled(false, null)).toBe(true);
    expect(isNewsCardEnabled(null)).toBe(false);
    expect(isNewsCardEnabled('user-a')).toBe(false);
    expect(isNewsCardEnabled('user-b')).toBe(true);

    expect(newsCardStorageKey('user-a')).toBe(`${NEWS_CARD_STORAGE_KEY}:u_user-a`);
    expect(newsCardStorageKey(null)).toBe(`${NEWS_CARD_STORAGE_KEY}:guest`);
  });

  it('keeps the card enabled when the stored value is invalid JSON', () => {
    memory.setItem(newsCardStorageKey('user-a'), '{not-json');
    expect(isNewsCardEnabled('user-a')).toBe(true);
  });

  it('fails safe when storage is unavailable or throws', () => {
    const failingStorage = {
      length: 0,
      clear() {},
      getItem() {
        throw new Error('storage unavailable');
      },
      key() {
        return null;
      },
      removeItem() {},
      setItem() {
        throw new Error('quota exceeded');
      },
    } as unknown as Storage;

    useStorage(failingStorage);
    expect(isNewsCardEnabled('user-a')).toBe(true);
    expect(setNewsCardEnabled(false, 'user-a')).toBe(false);

    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
      configurable: true,
    });
    expect(isNewsCardEnabled('user-a')).toBe(true);
    expect(setNewsCardEnabled(false, 'user-a')).toBe(false);
  });
});
