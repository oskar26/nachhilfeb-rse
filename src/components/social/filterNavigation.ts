/**
 * Shared ids and keyboard math for the mobile Social filter tabs. Kept
 * DOM-free so the wrapping/wrap-around behaviour can be unit tested.
 */

export const SOCIAL_FILTER_PANEL_ID = 'social-filter-panel';

export function socialFilterTabId(key: string): string {
    return `social-filter-tab-${key}`;
}

/**
 * Returns the next tab index for the standard horizontal tablist keys,
 * or null when the key is not a navigation key.
 */
export function nextFilterIndex(current: number, count: number, key: string): number | null {
    if (count <= 0 || current < 0 || current >= count) return null;
    switch (key) {
        case 'ArrowRight':
            return (current + 1) % count;
        case 'ArrowLeft':
            return (current - 1 + count) % count;
        case 'Home':
            return 0;
        case 'End':
            return count - 1;
        default:
            return null;
    }
}
