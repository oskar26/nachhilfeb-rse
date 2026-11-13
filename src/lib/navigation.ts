export type DesktopSocialTab = 'requests' | 'matches' | 'watchlist';

export function getDesktopSocialTab(
  pathname: string,
  search: string,
): DesktopSocialTab | null {
  const tab = new URLSearchParams(search).get('tab');
  if (tab === 'alle' || tab === 'all') return null;
  if (tab === 'requests' || tab === 'anfragen') return 'requests';
  if (tab === 'matches' || tab === 'matching') return 'matches';
  if (tab === 'watchlist' || tab === 'merkliste' || tab === 'favorites') return 'watchlist';

  if (pathname === '/requests') return 'requests';
  if (pathname === '/matches' || pathname === '/matching') return 'matches';
  if (pathname === '/favorites' || pathname === '/watchlist') return 'watchlist';
  return null;
}
