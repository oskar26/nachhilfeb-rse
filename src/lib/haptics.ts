/**
 * Web Haptic Feedback Utility
 * Safe wrapper around navigator.vibrate for tactile mobile UX
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 18,
    heavy: 30,
    selection: 8,
    success: [10, 30, 20],
    warning: [25, 40, 25],
    error: [40, 60, 40, 60, 40],
};

/**
 * Triggers a haptic vibration pattern if supported by the client device.
 */
export function triggerHaptic(style: HapticStyle = 'light'): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }

    // Check if Vibration API is available
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        try {
            const pattern = HAPTIC_PATTERNS[style] ?? 10;
            return navigator.vibrate(pattern);
        } catch {
            // Ignore vibration failures (security or permission restrictions)
            return false;
        }
    }

    return false;
}
