import { useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { MessageSquare, Heart, Zap } from 'lucide-react';
import Favorites from './Favorites';
import Requests from './Requests';
import Matching from './Matching';
import { TabBar } from '../components/ui/TabBar';

type SocialTab = 'requests' | 'matches' | 'watchlist';

const TAB_META: Record<SocialTab, { title: string; subtitle: string }> = {
    requests: {
        title: 'Anfragen',
        subtitle: 'Kontakte zu deinen Anzeigen – annehmen, ablehnen, direkt chatten.',
    },
    matches: {
        title: 'Matches',
        subtitle: 'Vorschläge, die zu deinen Fächern, Klassen und Freistunden passen.',
    },
    watchlist: {
        title: 'Merkliste',
        subtitle: 'Deine gespeicherten Anzeigen – griffbereit für später.',
    },
};

export default function Social({ initialTab }: { initialTab?: SocialTab }) {
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

    // Auch Route-/Query-Wechsel (Sidebar, Deep-Link, ?tab=) aktivieren einen Tab:
    // dabei sofort als besucht markieren, damit der Panel gemountet wird und bleibt.
    if (!visitedTabs.includes(activeTab)) {
        setVisitedTabs(prev => (prev.includes(activeTab) ? prev : [...prev, activeTab]));
    }

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

    const meta = TAB_META[activeTab as SocialTab] ?? TAB_META.requests;

    return (
        <div className="mx-auto w-full min-w-0 max-w-5xl space-y-5 p-4 pb-24 sm:p-6 overflow-x-clip">
            {/* Seitenkopf im App-Stil: Display-Titel, gelber Akzentstreifen, kurzer Untertitel */}
            <header className="min-w-0">
                <h1 className="font-display text-2xl uppercase leading-none tracking-tight text-gray-900 dark:text-white">
                    {meta.title}
                </h1>
                <div className="mt-2 h-1 w-10 rounded-full bg-primary" aria-hidden />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{meta.subtitle}</p>
            </header>

            <TabBar
                ariaLabel="Anfragen & Matches"
                idPrefix="social"
                items={tabs.map(tab => ({ key: tab.id, label: tab.label, icon: tab.icon }))}
                value={activeTab}
                onChange={selectTab}
            />

            {/* Alle besuchten Tabs bleiben gemountet, nur das aktive ist sichtbar */}
            {visitedTabs.includes('requests') && (
                <div id="social-tabpanel-requests" role="tabpanel" aria-labelledby="social-tab-requests" tabIndex={0} hidden={activeTab !== 'requests'} className="min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary">
                    <Requests />
                </div>
            )}
            {visitedTabs.includes('matches') && (
                <div id="social-tabpanel-matches" role="tabpanel" aria-labelledby="social-tab-matches" tabIndex={0} hidden={activeTab !== 'matches'} className="min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary">
                    <Matching />
                </div>
            )}
            {visitedTabs.includes('watchlist') && (
                <div id="social-tabpanel-watchlist" role="tabpanel" aria-labelledby="social-tab-watchlist" tabIndex={0} hidden={activeTab !== 'watchlist'} className="min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary">
                    <Favorites />
                </div>
            )}
        </div>
    );
}
