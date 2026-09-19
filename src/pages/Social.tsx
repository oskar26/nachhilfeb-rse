import { useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { MessageSquare, Heart, Zap } from 'lucide-react';
import Favorites from './Favorites';
import Requests from './Requests';
import Matching from './Matching';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

export default function Social({ initialTab }: { initialTab?: 'requests' | 'matches' | 'watchlist' }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const pathTab = pathname === '/matches' || pathname === '/matching' ? 'matches'
        : pathname === '/favorites' || pathname === '/watchlist' ? 'watchlist'
        : pathname === '/requests' ? 'requests'
        : null;
    const requestedTab = searchParams.get('tab');
    const activeTab = requestedTab === 'requests' || requestedTab === 'matches' || requestedTab === 'watchlist'
        ? requestedTab
        : pathTab || initialTab || 'requests';

    // Bereits besuchte Tabs bleiben gemountet (kein erneutes Laden beim Zurückspringen,
    // keine AnimatePresence-Unmounts -> butterweiches, sofortiges Umschalten).
    const [visitedTabs, setVisitedTabs] = useState<string[]>([activeTab]);

    const tabs = [
        { id: 'requests', label: 'Anfragen', icon: MessageSquare },
        { id: 'matches', label: 'Matches', icon: Zap },
        { id: 'watchlist', label: 'Merkliste', icon: Heart }
    ] as const;

    const selectTab = (tabId: string) => {
        triggerHaptic('selection');
        setVisitedTabs(prev => (prev.includes(tabId) ? prev : [...prev, tabId]));
        setSearchParams(params => {
            const nextParams = new URLSearchParams(params);
            nextParams.set('tab', tabId);
            return nextParams;
        });
    };

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number;
        switch (event.key) {
            case 'ArrowRight':
                nextIndex = (index + 1) % tabs.length;
                break;
            case 'ArrowLeft':
                nextIndex = (index - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        tabRefs.current[nextIndex]?.focus();
        selectTab(tabs[nextIndex].id);
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Social Hub</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        Verwalte deine Kontakte, Merkliste und berechneten Matches.
                    </p>
                </div>
            </div>

            {/* Tab Bar (reines CSS, keine Layout-Animationen -> kein Ruckeln) */}
            <div role="tablist" aria-label="Social" className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-1 sm:p-1.5 rounded-2xl flex w-full justify-between shadow-xs">
                {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            ref={element => { tabRefs.current[index] = element; }}
                            type="button"
                            role="tab"
                            id={`social-tab-${tab.id}`}
                            aria-selected={isActive}
                            aria-controls={`social-tabpanel-${tab.id}`}
                            tabIndex={isActive ? 0 : -1}
                            onKeyDown={event => handleTabKeyDown(event, index)}
                            onClick={() => selectTab(tab.id)}
                            className={cn(
                                "min-w-0 flex-1 flex items-center justify-center py-3 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-yellow-300",
                                isActive
                                    ? "bg-primary text-amber-950 shadow-xs"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60"
                            )}
                        >
                            <span className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                                <Icon aria-hidden="true" size={16} className={cn("shrink-0", !isActive && "text-gray-400")} />
                                <span>{tab.label}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Alle besuchten Tabs bleiben gemountet, nur das aktive ist sichtbar */}
            {visitedTabs.includes('requests') && (
                <div id="social-tabpanel-requests" role="tabpanel" aria-labelledby="social-tab-requests" tabIndex={0} hidden={activeTab !== 'requests'} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-yellow-300">
                    <Requests />
                </div>
            )}
            {visitedTabs.includes('matches') && (
                <div id="social-tabpanel-matches" role="tabpanel" aria-labelledby="social-tab-matches" tabIndex={0} hidden={activeTab !== 'matches'} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-yellow-300">
                    <Matching />
                </div>
            )}
            {visitedTabs.includes('watchlist') && (
                <div id="social-tabpanel-watchlist" role="tabpanel" aria-labelledby="social-tab-watchlist" tabIndex={0} hidden={activeTab !== 'watchlist'} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-yellow-300">
                    <Favorites />
                </div>
            )}
        </div>
    );
}
