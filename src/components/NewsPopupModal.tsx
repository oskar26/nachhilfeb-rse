import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Megaphone, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';

interface Announcement {
    id: string;
    title: string;
    body: string;
    icon: string;
    created_at: string;
}

const DISMISSED_NEWS_KEY = 'dismissed_news_ids';

function getDismissedNews(): string[] {
    try {
        return JSON.parse(localStorage.getItem(DISMISSED_NEWS_KEY) || '[]');
    } catch {
        return [];
    }
}

export function NewsPopupModal() {
    const [news, setNews] = useState<Announcement | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        fetchLatestUnseenNews();
    }, []);

    const fetchLatestUnseenNews = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error || !data || data.length === 0) return;

            const latest = data[0] as Announcement;
            const dismissedIds = getDismissedNews();

            // Only show if user has NOT dismissed this specific news item
            if (!dismissedIds.includes(latest.id)) {
                setNews(latest);
                setOpen(true);

                // Try browser push notification if permissions granted
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification(`${latest.icon || '📢'} ${latest.title}`, {
                            body: latest.body,
                            icon: '/favicon.ico'
                        });
                    } catch {
                        /* noop */
                    }
                }
            }
        } catch (e) {
            console.error('[NewsPopupModal] fetch error:', e);
        }
    };

    const handleDismiss = () => {
        if (!news) return;
        const dismissed = getDismissedNews();
        if (!dismissed.includes(news.id)) {
            dismissed.push(news.id);
            localStorage.setItem(DISMISSED_NEWS_KEY, JSON.stringify(dismissed));
        }
        setOpen(false);
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }
    };

    if (!open || !news) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header pattern banner */}
                <div className="h-20 bg-gradient-to-r from-primary/30 via-amber-400/20 to-primary/30 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-900/80 px-3 py-1.5 rounded-full shadow-sm">
                        <Megaphone size={14} className="text-primary-hover" />
                        <span>Neue Schul-Mitteilung</span>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Schließen"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 -mt-6">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-md border dark:border-gray-700 flex items-center justify-center text-3xl">
                        {news.icon || '📢'}
                    </div>

                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-snug">
                            {news.title}
                        </h3>
                        <p className="text-xs text-gray-400 font-semibold mt-1">
                            {new Date(news.created_at).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                            {news.body}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 space-y-2">
                        <Button
                            onClick={handleDismiss}
                            className="w-full h-11 bg-primary hover:bg-primary/95 text-black font-extrabold rounded-2xl shadow-md gap-2"
                        >
                            <CheckCircle2 size={16} /> Verstanden & dauerhaft ausblenden
                        </Button>

                        {'Notification' in window && Notification.permission === 'default' && (
                            <button
                                onClick={requestNotificationPermission}
                                className="w-full text-center text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1 py-1"
                            >
                                <Bell size={12} /> Push-Benachrichtigungen aktivieren
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
