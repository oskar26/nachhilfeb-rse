import { useSearchParams } from 'react-router-dom';
import { Sparkles, MessageSquare, Heart, Zap } from 'lucide-react';
import Favorites from './Favorites';
import Requests from './Requests';
import Matching from './Matching';
import { cn } from '../lib/utils';

export default function Social() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'requests';

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
        setSearchParams({ tab: tabId });
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Social Hub</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Verwalte deine Kontakte, Merkliste und berechneten Matches.</p>
                </div>
            </div>

            {/* Tab Switched Header Menu */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 p-1.5 rounded-2xl flex w-full justify-between shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => selectTab(tab.id)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                                isActive
                                    ? "bg-primary text-black shadow-sm"
                                    : "text-gray-500 hover:text-gray-950 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850"
                            )}
                        >
                            <Icon size={16} className={cn(isActive ? "text-black" : "text-gray-400")} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Render selected component */}
            <div className="mt-4 animate-in fade-in duration-300">
                {currentTab.component}
            </div>
        </div>
    );
}
