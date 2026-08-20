import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Megaphone, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface Announcement {
    id: string;
    title: string;
    body: string;
    icon: string;
    created_at: string;
}

export function CollapsedNewsWidget() {
    const [news, setNews] = useState<Announcement | null>(null);
    const [expanded, setExpanded] = useState(false); // Default collapsed as requested!

    useEffect(() => {
        fetchLatestNews();
    }, []);

    const fetchLatestNews = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            if (!error && data && data.length > 0) {
                setNews(data[0] as Announcement);
            }
        } catch {
            /* noop */
        }
    };

    if (!news) return null;

    return (
        <div className="w-full bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-300/60 dark:border-amber-900/40 rounded-3xl overflow-hidden transition-all duration-300 shadow-sm">
            {/* Collapsed Header Bar */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-amber-500/5 transition-colors gap-3"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center text-xl shrink-0">
                        {news.icon || '📢'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/60 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                Neuigkeiten
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">
                                {new Date(news.created_at).toLocaleDateString('de-DE')}
                            </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate mt-0.5">
                            {news.title}
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                    <span>{expanded ? 'Einklappen' : 'Mehr lesen'}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </button>

            {/* Expandable Content */}
            {expanded && (
                <div className="px-5 pb-5 pt-1 border-t border-amber-200/50 dark:border-amber-900/30 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                        {news.body}
                    </p>
                </div>
            )}
        </div>
    );
}
