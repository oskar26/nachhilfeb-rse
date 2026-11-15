import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The project minimum is 13px for functional text (`text-xs` is 13px here).
// Decorative icon sizes are unaffected; these files must not reintroduce
// smaller text utilities for labels, hints, metadata, timestamps or badges.
const CHAT_FILES = [
  'src/components/chat/ChatEmptyState.tsx',
  'src/components/chat/AppointmentCard.tsx',
  'src/components/chat/AppointmentDialog.tsx',
  'src/components/chat/ChatComposer.tsx',
  'src/components/chat/MessageBubble.tsx',
  'src/components/chat/ChatToolsDialog.tsx',
  'src/components/chat/CalendarPanel.tsx',
  'src/pages/Chat.tsx',
  'src/pages/Chats.tsx',
];

const SUB_13_TEXT = /text-\[(?:0\.[0-9]+rem|[0-9]|1[0-2])(?:\.[0-9]+)?px\]/g;

describe('chat typography', () => {
  it.each(CHAT_FILES)('%s contains no text utility below 13px', (file) => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    expect(source.match(SUB_13_TEXT)).toBeNull();
  });
});
