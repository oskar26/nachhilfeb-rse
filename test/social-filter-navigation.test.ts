import { describe, expect, it } from 'vitest';
import {
    SOCIAL_FILTER_PANEL_ID,
    nextFilterIndex,
    socialFilterTabId,
} from '../src/components/social/filterNavigation';

describe('social filter navigation', () => {
    it('wraps ArrowRight and ArrowLeft across the tab order', () => {
        expect(nextFilterIndex(0, 4, 'ArrowRight')).toBe(1);
        expect(nextFilterIndex(3, 4, 'ArrowRight')).toBe(0);
        expect(nextFilterIndex(0, 4, 'ArrowLeft')).toBe(3);
        expect(nextFilterIndex(2, 4, 'ArrowLeft')).toBe(1);
    });

    it('jumps to the first and last tab with Home and End', () => {
        expect(nextFilterIndex(2, 4, 'Home')).toBe(0);
        expect(nextFilterIndex(1, 4, 'End')).toBe(3);
    });

    it('ignores unrelated keys and invalid indexes', () => {
        expect(nextFilterIndex(1, 4, 'Enter')).toBeNull();
        expect(nextFilterIndex(1, 4, 'Tab')).toBeNull();
        expect(nextFilterIndex(0, 0, 'ArrowRight')).toBeNull();
        expect(nextFilterIndex(-1, 4, 'ArrowRight')).toBeNull();
        expect(nextFilterIndex(4, 4, 'ArrowRight')).toBeNull();
    });

    it('keeps tab and panel ids stable for aria wiring', () => {
        expect(SOCIAL_FILTER_PANEL_ID).toBe('social-filter-panel');
        expect(socialFilterTabId('alle')).toBe('social-filter-tab-alle');
        expect(socialFilterTabId('merkliste')).toBe('social-filter-tab-merkliste');
    });
});
