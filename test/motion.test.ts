import { describe, expect, it, vi } from 'vitest';
import * as motionTokens from '../src/lib/motion';
import {
  APP_TRANSITION,
  DISTANCE,
  DURATION,
  EASE_IN,
  EASE_OUT,
  EASE_STANDARD,
  LIST_ITEM,
  PAGE_ENTER,
  prefersReducedMotion,
  SPRING,
  STAGGER,
} from '../src/lib/motion';

describe('motion tokens', () => {
  it('exposes the approved easing curves', () => {
    expect(EASE_OUT).toEqual([0.16, 1, 0.3, 1]);
    expect(EASE_STANDARD).toEqual([0.2, 0, 0, 1]);
    expect(EASE_IN).toEqual([0.4, 0, 1, 1]);
  });

  it('exposes the approved durations', () => {
    expect(DURATION).toEqual({
      instant: 0.09,
      fast: 0.14,
      base: 0.2,
      enter: 0.28,
      exit: 0.16,
      max: 0.36,
    });
  });

  it('exposes the approved springs', () => {
    expect(SPRING).toEqual({
      press: { type: 'spring', stiffness: 600, damping: 40, mass: 0.8 },
      settle: { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 },
      gentle: { type: 'spring', stiffness: 260, damping: 28, mass: 1.0 },
    });
  });

  it('uses a 40ms stagger capped at six items', () => {
    expect(STAGGER).toEqual({ step: 0.04, maxItems: 6 });
  });

  it('uses compact travel distances for state, page, and reveal entrances', () => {
    expect(DISTANCE).toEqual({ state: 4, enter: 8, page: 14, reveal: 20 });
  });

  it('builds the app transition from the base duration and ease-out', () => {
    expect(APP_TRANSITION).toEqual({ duration: 0.2, ease: [0.16, 1, 0.3, 1] });
    expect(APP_TRANSITION.duration).toBe(DURATION.base);
    expect(APP_TRANSITION.ease).toBe(EASE_OUT);
  });

  it('builds the page entrance from the shared duration and ease-out', () => {
    expect(PAGE_ENTER).toEqual({ duration: 0.2, ease: [0.16, 1, 0.3, 1] });
    expect(PAGE_ENTER.duration).toBe(DURATION.base);
    expect(PAGE_ENTER.ease).toBe(EASE_OUT);
  });

  it('builds list items from the enter distance and page entrance', () => {
    expect(LIST_ITEM.hidden).toEqual({ opacity: 0, y: DISTANCE.enter });
    expect(LIST_ITEM.visible).toEqual({ opacity: 1, y: 0, transition: PAGE_ENTER });
    expect(LIST_ITEM.visible.transition).toBe(PAGE_ENTER);
  });

  it('exposes prefersReducedMotion as a safe boolean helper', () => {
    // The test environment has no window.matchMedia; the helper must not throw.
    expect(typeof prefersReducedMotion()).toBe('boolean');
  });

  it('honours a reduced-motion match from window.matchMedia', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }),
    });
    try {
      expect(prefersReducedMotion()).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps every app transition value finite and the object stable', () => {
    expect(motionTokens.APP_TRANSITION).toBe(APP_TRANSITION);
    expect(Number.isFinite(APP_TRANSITION.duration)).toBe(true);
    for (const value of APP_TRANSITION.ease) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(JSON.parse(JSON.stringify(APP_TRANSITION))).toEqual(APP_TRANSITION);
  });
});
