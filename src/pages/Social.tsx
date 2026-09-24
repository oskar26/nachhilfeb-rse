import { useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { MessageSquare, Heart, Zap } from 'lucide-react';
import Favorites from './Favorites';
import Requests from './Requests';
import Matching from './Matching';
import { TabBar } from '../components/ui/TabBar';

export default function Social({ initialTab }: { initialTab?: 'requests' | 'matches' | 'watchlist' }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

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
        setVisitedTabs(prev => (prev.includes(tabId) ? prev : [...prev, tabId]));
        setSearchParams(params => {
            const nextParams = new URLSearchParams(params);
            nextParams.set('tab', tabId);
            return nextParams;
        });
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Anfragen & Matches</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        Kontakte, Merkliste und Vorschläge – alles an einem Ort.
                    </p>
                </div>
            </div>

            <TabBar
                ariaLabel="Anfragen & Matches"
                idPrefix="social"
                items={tabs.map(tab => ({ key: tab.id, label: tab.label, icon: tab.icon }))}
                value={activeTab}
                onChange={selectTab}
            />

            {/* Alle besuchten Tabs bleiben gemountet, nur das aktive ist sichtbar */}
            {visitedTabs.includes('requests') && (
                <div id="social-tabpanel-requests" role="tabpanel" aria-labelledby="social-tab-requests" tabIndex={0} hidden={activeTab !== 'requests'} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary">
                    <Requests />
                </div>
            )}
            {visitedTabs.includes('matches') && (
                <div id="social-tabpanel-matches" role="tabpanel" aria-labelledby="social-tab-matches" tabIndex={0} hidden={activeTab !== 'matches'} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary">
                    <Matching />
                </div>
            )}
            {visitedTabs.includes('watchlist') && (
                <div id="social-tabpanel-watchlist" role="tabpanel" aria-labelledby="social-tab-watchlist" tabIndex={0} hidden={activeTab !== 'watchlist'} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary">
                    <Favorites />
                </div>
            )}
        </div>
    );
}
