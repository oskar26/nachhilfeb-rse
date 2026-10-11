import { useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { MessageSquare, Heart, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Favorites from './Favorites';
import Requests from './Requests';
import Matching from './Matching';
import { TabBar } from '../components/ui/TabBar';

type SocialTab = 'requests' | 'matches' | 'watchlist';

const TAB_META: Record<SocialTab, { index: string; title: string; subtitle: string }> = {
    requests: {
        index: '01',
        title: 'Anfragen',
        subtitle: 'Kontakte zu deinen Anzeigen – annehmen, ablehnen, direkt chatten.',
    },
    matches: {
        index: '02',
        title: 'Matches',
        subtitle: 'Vorschläge, die zu deinen Fächern, Klassen und Freistunden passen.',
    },
    watchlist: {
        index: '03',
        title: 'Merkliste',
        subtitle: 'Deine gespeicherten Anzeigen – griffbereit für später.',
    },
};

export default function Social({ initialTab }: { initialTab?: SocialTab }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const reduceMotion = useReducedMotion();

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

    const meta = TAB_META[activeTab as SocialTab] ?? TAB_META.requests;

    return (
        <div className="mx-auto w-full min-w-0 max-w-3xl space-y-5 p-4 pb-24 md:p-6">
            {/* Poster-Kopf: Anton-Titel + Spec-Zeile je Tab, gelbe Dienstleiste */}
            <header className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900">
                <motion.div
                    key={activeTab}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="p-5 sm:p-6"
                >
                    <p className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-300 dark:bg-black">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                        Social · {meta.index} / 03
                    </p>
                    <h1 className="mt-4 font-display text-3xl uppercase leading-[0.95] tracking-tight text-gray-950 dark:text-gray-50 sm:text-4xl">
                        {meta.title}
                    </h1>
                    <span className="mt-3 block h-1 w-10 rounded-full bg-primary" aria-hidden />
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        {meta.subtitle}
                    </p>
                </motion.div>
                <div className="flex items-center justify-between gap-3 bg-primary px-5 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-gray-950 sm:px-6">
                    <span>SV-geprüft · Nur FWG Köln</span>
                    <span className="tabular-nums">{meta.index} / 03</span>
                </div>
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
