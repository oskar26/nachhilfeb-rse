import { describe, expect, it } from 'vitest';
import {
  CHAT_TOOL_SETTINGS_KEY,
  DEFAULT_CHAT_TOOL_SETTINGS,
  loadChatToolSettings,
  normalizeChatToolSettings,
  saveChatToolSettings,
} from '../src/lib/chat-settings';

function fakeStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(CHAT_TOOL_SETTINGS_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: () => null,
    get length() { return values.size; },
  } as Storage;
}

describe('chat tool settings', () => {
  it('defaults every module to on', () => {
    expect(normalizeChatToolSettings(null)).toEqual(DEFAULT_CHAT_TOOL_SETTINGS);
    expect(loadChatToolSettings(fakeStorage())).toEqual(DEFAULT_CHAT_TOOL_SETTINGS);
  });

  it('keeps only booleans and fills missing switches', () => {
    expect(normalizeChatToolSettings({ appointments: false, calendar: 'ja' })).toEqual({
      ...DEFAULT_CHAT_TOOL_SETTINGS,
      appointments: false,
    });
  });

  it('round-trips settings through storage', () => {
    const storage = fakeStorage();
    saveChatToolSettings({ ...DEFAULT_CHAT_TOOL_SETTINGS, emojiPicker: false }, storage);
    expect(loadChatToolSettings(storage).emojiPicker).toBe(false);
  });

  it('survives broken JSON', () => {
    expect(loadChatToolSettings(fakeStorage('{kaputt'))).toEqual(DEFAULT_CHAT_TOOL_SETTINGS);
  });
});
