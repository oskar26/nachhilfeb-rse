import { describe, expect, it } from 'vitest';
import { getDesktopSocialTab } from '../src/lib/navigation';

describe('getDesktopSocialTab', () => {
  it('leaves all desktop social items inactive on /social', () => {
    expect(getDesktopSocialTab('/social', '')).toBeNull();
  });

  it('maps the explicit desktop routes', () => {
    expect(getDesktopSocialTab('/requests', '')).toBe('requests');
    expect(getDesktopSocialTab('/matches', '')).toBe('matches');
    expect(getDesktopSocialTab('/matching', '')).toBe('matches');
    expect(getDesktopSocialTab('/favorites', '')).toBe('watchlist');
    expect(getDesktopSocialTab('/watchlist', '')).toBe('watchlist');
  });

  it('prefers a valid tab query parameter', () => {
    expect(getDesktopSocialTab('/social', '?tab=matches')).toBe('matches');
    expect(getDesktopSocialTab('/social', '?tab=merkliste')).toBe('watchlist');
    expect(getDesktopSocialTab('/requests', '?tab=anfragen')).toBe('requests');
    expect(getDesktopSocialTab('/requests', '?tab=favorites')).toBe('watchlist');
  });

  it('leaves all desktop social items inactive for the alle alias', () => {
    expect(getDesktopSocialTab('/social', '?tab=alle')).toBeNull();
    expect(getDesktopSocialTab('/requests', '?tab=alle')).toBeNull();
    expect(getDesktopSocialTab('/requests', '?tab=all')).toBeNull();
  });
});
