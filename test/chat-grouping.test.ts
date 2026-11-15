import { describe, expect, it } from 'vitest';
import {
  buildChatTimeline,
  chatDayKey,
  formatChatDateLabel,
  formatChatTime,
  parseChatTimestamp,
} from '../src/lib/chat-grouping';

interface Message {
  id: string;
  sender_id: string;
  created_at: string;
}

function message(id: string, sender: string, createdAt: string): Message {
  return { id, sender_id: sender, created_at: createdAt };
}

const now = new Date(2026, 10, 15, 12, 0);

describe('parseChatTimestamp', () => {
  it('accepts ISO and MySQL date strings', () => {
    expect(parseChatTimestamp('2026-11-15T10:00:00.000Z')?.toISOString()).toBe('2026-11-15T10:00:00.000Z');
    expect(parseChatTimestamp('2026-11-15 10:00:00')).not.toBeNull();
    expect(parseChatTimestamp('kaputt')).toBeNull();
  });
});

describe('formatChatDateLabel', () => {
  it('labels today and yesterday', () => {
    expect(formatChatDateLabel('2026-11-15T10:00:00', now)).toBe('Heute');
    expect(formatChatDateLabel('2026-11-14T10:00:00', now)).toBe('Gestern');
  });

  it('uses weekday and date for older messages', () => {
    expect(formatChatDateLabel('2026-11-10T10:00:00', now)).toBe('Dienstag, 10. November');
  });

  it('adds the year for messages from another year', () => {
    expect(formatChatDateLabel('2025-12-24T10:00:00', now)).toBe('Mittwoch, 24. Dezember 2025');
  });
});

describe('buildChatTimeline', () => {
  it('separates days and groups consecutive senders', () => {
    const rows = buildChatTimeline([
      message('m1', 'a', '2026-11-14T10:00:00'),
      message('m2', 'a', '2026-11-14T10:01:00'),
      message('m3', 'b', '2026-11-14T10:02:00'),
      message('m4', 'b', '2026-11-15T09:00:00'),
      message('m5', 'a', '2026-11-15T09:01:00'),
    ], now);

    expect(rows.map(row => row.showDateSeparator)).toEqual([true, false, false, true, false]);
    expect(rows.map(row => row.isFirstInGroup)).toEqual([true, false, true, true, true]);
    expect(rows.map(row => row.isLastInGroup)).toEqual([false, true, true, true, true]);
    expect(rows[0].dateLabel).toBe('Gestern');
    expect(rows[3].dateLabel).toBe('Heute');
  });

  it('groups the same sender across a date boundary by day', () => {
    const rows = buildChatTimeline([
      message('m1', 'a', '2026-11-14T23:59:00'),
      message('m2', 'a', '2026-11-15T00:01:00'),
    ], now);

    expect(rows[0].isLastInGroup).toBe(true);
    expect(rows[1].isFirstInGroup).toBe(true);
    expect(rows[1].showDateSeparator).toBe(true);
  });

  it('handles an empty timeline', () => {
    expect(buildChatTimeline([], now)).toEqual([]);
  });
});

describe('chat helpers', () => {
  it('creates local day keys', () => {
    expect(chatDayKey('2026-11-15T23:30:00')).toBe('2026-11-15');
  });

  it('formats a readable time', () => {
    expect(formatChatTime('2026-11-15T14:05:00')).toBe('14:05');
    expect(formatChatTime('kaputt')).toBe('');
  });
});
