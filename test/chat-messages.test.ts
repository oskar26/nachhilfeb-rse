import { describe, expect, it } from 'vitest';
import { mergeMessages, type ChatMessage } from '../src/lib/chat-messages';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    sender_id: 'user-a',
    content: 'Hallo',
    is_deleted: false,
    read_at: null,
    created_at: '2026-11-14T10:00:00.000Z',
    edited_at: null,
    ...overrides,
  };
}

describe('mergeMessages', () => {
  it('returns the exact previous reference when nothing changed', () => {
    const prev = [
      message({ id: 'm1', created_at: '2026-11-14T10:00:00.000Z' }),
      message({ id: 'm2', sender_id: 'user-b', created_at: '2026-11-14T10:01:00.000Z' }),
    ];
    // Polling liefert neue Objekte, ggf. in anderer Reihenfolge, aber gleiche Werte.
    const incoming = [
      message({ id: 'm2', sender_id: 'user-b', created_at: '2026-11-14T10:01:00.000Z' }),
      message({ id: 'm1', created_at: '2026-11-14T10:00:00.000Z' }),
    ];

    expect(mergeMessages(prev, incoming)).toBe(prev);
    expect(mergeMessages(prev, [])).toBe(prev);
  });

  it('adds a new message and keeps the existing ones', () => {
    const prev = [message({ id: 'm1' })];
    const added = message({ id: 'm2', created_at: '2026-11-14T10:05:00.000Z' });

    const result = mergeMessages(prev, [added]);

    expect(result).not.toBe(prev);
    expect(result.map((entry) => entry.id)).toEqual(['m1', 'm2']);
  });

  it('updates edited content', () => {
    const prev = [message({ content: 'Alter Text' })];
    const incoming = [message({ content: 'Neuer Text', edited_at: '2026-11-14T10:02:00.000Z' })];

    const result = mergeMessages(prev, incoming);

    expect(result).not.toBe(prev);
    expect(result[0].content).toBe('Neuer Text');
    expect(result[0].edited_at).toBe('2026-11-14T10:02:00.000Z');
  });

  it('updates read_at changes from the poll', () => {
    const prev = [message({ read_at: null })];
    const incoming = [message({ read_at: '2026-11-14T10:03:00.000Z' })];

    const result = mergeMessages(prev, incoming);

    expect(result).not.toBe(prev);
    expect(result[0].read_at).toBe('2026-11-14T10:03:00.000Z');
  });

  it('updates a deleted state', () => {
    const prev = [message({ is_deleted: false })];
    const incoming = [message({ is_deleted: true })];

    const result = mergeMessages(prev, incoming);

    expect(result).not.toBe(prev);
    expect(result[0].is_deleted).toBe(true);
  });

  it('sorts the merged history ascending by created_at', () => {
    // MySQL liefert DATETIME mit Leerzeichen; die Sortierung darf nicht von
    // der Date-Parsing-Toleranz des Browsers abhängen.
    const prev = [message({ id: 'm2', created_at: '2026-11-14 10:01:00' })];
    const incoming = [
      message({ id: 'm3', created_at: '2026-11-14 10:02:00' }),
      message({ id: 'm1', created_at: '2026-11-14 10:00:00' }),
    ];

    const result = mergeMessages(prev, incoming);

    expect(result.map((entry) => entry.id)).toEqual(['m1', 'm2', 'm3']);
  });
});
