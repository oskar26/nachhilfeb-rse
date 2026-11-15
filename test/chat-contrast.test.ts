import { describe, expect, it } from 'vitest';

// Functional text in the chat slice must reach WCAG AA (4.5:1) on its actual
// warm/light or dark surface. These are the measured token pairs used by the
// appointment cards, calendar panel, composer placeholders and bubbles.
function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA = 4.5;

describe('chat contrast', () => {
  it.each([
    ['appointment hints', '#6b614c', '#fffdf4'],
    ['appointment labels', '#7a6400', '#fffdf4'],
    ['open status chip', '#6b5c1a', '#f6edc9'],
    ['light placeholder', '#6b6452', '#fefefc'],
    ['light muted month label', '#7a6400', '#f7f6f5'],
    ['dark placeholder', '#a1a1aa', '#1d1f24'],
    ['dark muted month label', '#e8d48a', '#282a2f'],
    ['own bubble metadata', '#5a4a00', '#facc15'],
    ['received bubble metadata', '#5f636b', '#ffffff'],
    ['empty-state legal text', '#5f636b', '#faf7ee'],
  ])('%s reaches AA', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(AA);
  });
});
