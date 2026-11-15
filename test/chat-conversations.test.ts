import { describe, expect, it } from 'vitest';
import {
  conversationPreview,
  excludeHiddenConversations,
  filterConversations,
  formatConversationTime,
  parseConversationSummaries,
  requestStatusLabel,
  type ConversationSummary,
} from '../src/lib/chat-conversations';

const now = new Date(2026, 10, 15, 12, 0);

function conversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    request_id: 'req-1',
    status: 'accepted',
    other_user_id: 'u-mia',
    display_name: 'Mia S.',
    last_message: 'Bis Dienstag!',
    last_message_at: '2026-11-15T10:05:00',
    last_message_sender_id: 'u-mia',
    unread_count: 0,
    ...overrides,
  };
}

describe('formatConversationTime', () => {
  it('shows the time for today, Gestern for yesterday and a date for older chats', () => {
    expect(formatConversationTime('2026-11-15T10:05:00', now)).toBe('10:05');
    expect(formatConversationTime('2026-11-14T10:05:00', now)).toBe('Gestern');
    expect(formatConversationTime('2026-11-10T10:05:00', now)).toBe('Di');
    expect(formatConversationTime('2026-10-01T10:05:00', now)).toBe('01.10.');
  });

  it('handles empty and invalid values', () => {
    expect(formatConversationTime(null, now)).toBe('');
    expect(formatConversationTime('kaputt', now)).toBe('');
  });
});

describe('conversationPreview', () => {
  it('prefixes own messages and shortens whitespace', () => {
    expect(conversationPreview(conversation({ last_message_sender_id: 'u-lena', last_message: 'Hallo\n\nMia' }), 'u-lena'))
      .toBe('Du: Hallo Mia');
  });

  it('labels appointment messages and empty chats', () => {
    expect(conversationPreview(conversation({
      last_message: 'TERMIN-VEREINBARUNG\nFach: Mathematik\nDatum: 2026-11-18\nUhrzeit: 14:00 Uhr (45 Min)',
    }))).toBe('Terminvorschlag: Mathematik');
    expect(conversationPreview(conversation({ last_message: null }))).toBe('Noch keine Nachrichten');
  });
});

describe('filterConversations', () => {
  it('matches names and message contents case-insensitively', () => {
    const items = [
      conversation({ request_id: '1', display_name: 'Mia S.', last_message: 'Bis Dienstag!' }),
      conversation({ request_id: '2', display_name: 'Jonas T.', last_message: 'Mathe klingt gut.' }),
    ];
    expect(filterConversations(items, 'mia').map((item) => item.request_id)).toEqual(['1']);
    expect(filterConversations(items, 'MATHE').map((item) => item.request_id)).toEqual(['2']);
    expect(filterConversations(items, '   ')).toHaveLength(2);
  });

  it('normalizes umlauts for search', () => {
    const items = [conversation({ display_name: 'Jürgen M.' })];
    expect(filterConversations(items, 'jurgen')).toHaveLength(1);
  });
});

describe('excludeHiddenConversations', () => {
  it('removes locally hidden request ids', () => {
    const items = [
      conversation({ request_id: 'req-1' }),
      conversation({ request_id: 'req-2' }),
    ];
    expect(excludeHiddenConversations(items, ['req-2']).map((item) => item.request_id)).toEqual(['req-1']);
    expect(excludeHiddenConversations(items, [])).toBe(items);
  });
});

describe('parseConversationSummaries', () => {
  it('accepts a valid conversation array', () => {
    const items = [conversation()];
    expect(parseConversationSummaries(items)).toBe(items);
  });

  it('treats non-array 200 responses as an error', () => {
    expect(() => parseConversationSummaries({ success: true })).toThrow('Antwortformat');
    expect(() => parseConversationSummaries(null)).toThrow('Antwortformat');
  });

  it('rejects message-shaped arrays', () => {
    expect(() => parseConversationSummaries([{ id: 'm1', sender_id: 'u-mia', content: 'Hallo' }]))
      .toThrow('Antwortformat');
  });
});

describe('requestStatusLabel', () => {
  it('handles the schema status rejected and legacy values', () => {
    expect(requestStatusLabel('accepted')).toBe('Anfrage angenommen');
    expect(requestStatusLabel('completed')).toBe('Anfrage abgeschlossen');
    expect(requestStatusLabel('rejected')).toBe('Anfrage abgelehnt');
    expect(requestStatusLabel('declined')).toBe('Anfrage abgelehnt');
    expect(requestStatusLabel('cancelled')).toBe('Anfrage abgebrochen');
    expect(requestStatusLabel('pending')).toBe('Anfrage offen');
    expect(requestStatusLabel(undefined)).toBe('Nachhilfe-Chat');
  });
});
