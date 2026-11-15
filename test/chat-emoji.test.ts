import { describe, expect, it } from 'vitest';
import { appendEmoji, isEmojiOnly, isLargeEmojiMessage } from '../src/lib/chat-emoji';

describe('isEmojiOnly', () => {
  it('accepts short emoji messages', () => {
    expect(isEmojiOnly('👍')).toBe(true);
    expect(isEmojiOnly(' 👍❤️ ')).toBe(true);
    expect(isEmojiOnly('👨‍👩‍👧‍👦')).toBe(true);
  });

  it('rejects mixed or textual messages', () => {
    expect(isEmojiOnly('')).toBe(false);
    expect(isEmojiOnly('Hallo 👍')).toBe(false);
    expect(isEmojiOnly('123')).toBe(false);
    expect(isEmojiOnly('👍?')).toBe(false);
  });
});

describe('isLargeEmojiMessage', () => {
  it('only enlarges short emoji runs', () => {
    expect(isLargeEmojiMessage('👍')).toBe(true);
    expect(isLargeEmojiMessage('👍❤️😂')).toBe(true);
    expect(isLargeEmojiMessage('👍❤️😂😊🙏🎉😅😍🤔')).toBe(false);
    expect(isLargeEmojiMessage('Hallo')).toBe(false);
  });
});

describe('appendEmoji', () => {
  it('adds a separator when needed', () => {
    expect(appendEmoji('', '👍')).toBe('👍');
    expect(appendEmoji('Hallo', '👋')).toBe('Hallo 👋');
    expect(appendEmoji('Hallo ', '👋')).toBe('Hallo 👋');
    expect(appendEmoji('Hallo\n', '👋')).toBe('Hallo\n👋');
  });
});
