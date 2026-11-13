export type DesktopSocialTab = 'requests' | 'matches' | 'watchlist';

export function getDesktopSocialTab(
  pathname: string,
  search: string,
): DesktopSocialTab | null {
  const tab = new URLSearchParams(search).get('tab');
  if (tab === 'requests' || tab === 'matches' || tab === 'watchlist') return tab;

  if (pathname === '/requests') return 'requests';
  if (pathname === '/matches' || pathname === '/matching') return 'matches';
  if (pathname === '/favorites' || pathname === '/watchlist') return 'watchlist';
  return null;
}
