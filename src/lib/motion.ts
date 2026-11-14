import type { Transition } from 'motion/react';

/**
 * Shared Motion tokens. Consumers must use these values instead of inline
 * transition objects so the app keeps one animation language.
 */
export { m } from 'motion/react';

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

export const DURATION = {
  instant: 0.09,
  fast: 0.14,
  base: 0.2,
  enter: 0.28,
  exit: 0.16,
  max: 0.36,
} as const;

export const SPRING = {
  press: { type: 'spring', stiffness: 600, damping: 40, mass: 0.8 },
  settle: { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 },
  gentle: { type: 'spring', stiffness: 260, damping: 28, mass: 1.0 },
} as const;

export const STAGGER = { step: 0.04, maxItems: 6 } as const;

export const DISTANCE = { state: 4, enter: 8 } as const;

export const APP_TRANSITION = {
  duration: DURATION.base,
  ease: EASE_OUT,
} as const satisfies Transition;
