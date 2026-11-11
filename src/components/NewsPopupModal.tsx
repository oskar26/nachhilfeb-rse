import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { X, Megaphone, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import NewsIcon from './NewsIcon';

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

    const fetchLatestUnseenNews = useCallback(async () => {
        try {
            const { data, error } = await api.news.list();

            if (error || !data || data.length === 0) return;

            const latest = data[0] as Announcement;
            // Defensive Validierung: Kaputte/ungültige Datensätze (z. B. leere Antwort,
            // Proxy-Fehlerseite) dürfen niemals ein leeres "Invalid Date"-Modal erzeugen.
            const hasValidDate = !!latest.created_at && !Number.isNaN(new Date(latest.created_at).getTime());
            if (
                !latest.id ||
                typeof latest.title !== 'string' || !latest.title.trim() ||
                typeof latest.body !== 'string' || !latest.body.trim() ||
                !hasValidDate
            ) {
                return;
            }
            const dismissedIds = getDismissedNews();

            // Only show if user has NOT dismissed this specific news item
            if (!dismissedIds.includes(latest.id)) {
                setNews(latest);
                setOpen(true);

                // Try browser push notification if permissions granted
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification(latest.title, {
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
    }, []);

    useEffect(() => {
        // Fetch-on-Mount: idiomatischer Initial-Datenladung, kein kaskadierendes Render-Problem
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLatestUnseenNews();
    }, [fetchLatestUnseenNews]);

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

    if (!news) return null;

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleDismiss(); }}>
            <DialogContent showCloseButton={false} className="max-w-md gap-0 overflow-hidden rounded-3xl p-0">
                {/* Header pattern banner */}
                <div className="flex h-20 items-center justify-between bg-primary/20 p-4">
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-gray-800 shadow-sm dark:bg-gray-900/80 dark:text-gray-200">
                        <Megaphone size={14} className="text-primary-hover" />
                        <span>Neue Schul-Mitteilung</span>
                    </div>
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        hapticStyle={false}
                        type="button"
                        onClick={handleDismiss}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-500 transition-colors hover:text-gray-900 dark:bg-gray-800/80 dark:hover:text-white"
                        aria-label="Schließen"
                    >
                        <X size={16} />
                    </Button>
                </div>

                {/* Content */}
                <div className="-mt-6 space-y-4 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-white text-gray-700 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        <NewsIcon value={news.icon} size={28} />
                    </div>

                    <div>
                        <DialogTitle className="text-lg font-black leading-snug text-gray-900 dark:text-white">
                            {news.title}
                        </DialogTitle>
                        <p className="mt-1 text-xs font-semibold text-gray-400">
                            {new Date(news.created_at).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>

                    <DialogDescription className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium leading-relaxed whitespace-pre-wrap text-gray-700 dark:border-gray-800/80 dark:bg-gray-800/50 dark:text-gray-300">
                        {news.body}
                    </DialogDescription>

                    {/* Actions */}
                    <div className="space-y-2 pt-2">
                        <Button
                            onClick={handleDismiss}
                            className="h-11 w-full gap-2 rounded-2xl bg-primary font-extrabold text-black shadow-md hover:bg-primary/95"
                        >
                            <CheckCircle2 size={16} /> Verstanden & dauerhaft ausblenden
                        </Button>

                        {'Notification' in window && Notification.permission === 'default' && (
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                hapticStyle={false}
                                type="button"
                                onClick={requestNotificationPermission}
                                className="flex w-full items-center justify-center gap-1 py-1 text-center text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <Bell size={12} /> Benachrichtigungen aktivieren
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
