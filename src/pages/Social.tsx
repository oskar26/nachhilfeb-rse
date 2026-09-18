import { useRef, type KeyboardEvent } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { MessageSquare, Heart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

    const tabs = [
        {
            id: 'requests',
            label: 'Anfragen',
            icon: MessageSquare,
            component: <Requests />
        },
        {
            id: 'matches',
            label: 'Matches',
            icon: Zap,
            component: <Matching />
        },
        {
            id: 'watchlist',
            label: 'Merkliste',
            icon: Heart,
            component: <Favorites />
        }
    ];

    const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

    const selectTab = (tabId: string) => {
        triggerHaptic('selection');
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

            {/* Sliding Yellow Tab Bar */}
            <div role="tablist" aria-label="Social" className="relative bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-1 sm:p-1.5 rounded-2xl flex w-full justify-between shadow-xs">
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
                            aria-controls="social-tabpanel"
                            tabIndex={isActive ? 0 : -1}
                            onKeyDown={event => handleTabKeyDown(event, index)}
                            onClick={() => selectTab(tab.id)}
                            className={cn(
                                "relative min-w-0 flex-1 flex items-center justify-center py-3 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-colors z-10 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-yellow-300",
                                isActive ? "text-amber-950" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="socialActiveIndicator"
                                    className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                                <Icon aria-hidden="true" size={16} className={cn("shrink-0", isActive ? "text-amber-950" : "text-gray-400")} />
                                <span>{tab.label}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Render selected component with smooth transition */}
            <div
                id="social-tabpanel"
                role="tabpanel"
                aria-labelledby={`social-tab-${activeTab}`}
                tabIndex={0}
                className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-yellow-300"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                        {currentTab.component}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
