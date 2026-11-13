import { describe, expect, it } from 'vitest';
import { formatGradeRange } from '../src/lib/matching';

describe('formatGradeRange', () => {
  it('returns an empty string for no grades', () => {
    expect(formatGradeRange([])).toBe('');
    expect(formatGradeRange(null)).toBe('');
  });

  it('formats a contiguous lower-stage range', () => {
    expect(formatGradeRange(['5', '6', '7'])).toBe('Klasse 5–7');
  });

  it('formats a single grade', () => {
    expect(formatGradeRange(['7'])).toBe('Klasse 7');
  });

  it('keeps non-contiguous grades explicit', () => {
    expect(formatGradeRange(['5', '7'])).toBe('Klasse 5, 7');
  });

  it('formats an upper-stage range', () => {
    expect(formatGradeRange(['EF', 'Q1', 'Q2'])).toBe('Stufe EF–Q2');
  });

  it('formats mixed lower and upper stages', () => {
    expect(formatGradeRange(['5', '6', 'EF', 'Q1'])).toBe(
      'Klasse 5–6, Stufe EF–Q1',
    );
  });
});
