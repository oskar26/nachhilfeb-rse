import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { X, Megaphone, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
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

function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(max-width: 639px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);
    return isMobile;
}

export function NewsPopupModal() {
    const [news, setNews] = useState<Announcement | null>(null);
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

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

    const header = (
        <div className="flex h-auto min-h-16 items-center justify-between gap-3 border-b border-border bg-primary/15 px-4 py-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft">
                <Megaphone size={16} className="text-brand-ink dark:text-primary" aria-hidden />
                <span>Neue Schul-Mitteilung</span>
            </span>
            <Button
                variant="unstyled"
                size="unstyled"
                hapticStyle={false}
                type="button"
                onClick={handleDismiss}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Schließen"
            >
                <X size={20} aria-hidden />
            </Button>
        </div>
    );

    const content = (Title: typeof DialogTitle | typeof SheetTitle, Description: typeof DialogDescription | typeof SheetDescription) => (
        <>
            {header}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-soft">
                    <NewsIcon value={news.icon} size={24} />
                </div>

                <div>
                    <Title className="text-lg font-semibold leading-snug text-foreground">
                        {news.title}
                    </Title>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {new Date(news.created_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                <Description className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm font-medium leading-relaxed text-muted-foreground">
                    {news.body}
                </Description>

                {/* Actions */}
                <div className="space-y-2 pb-[env(safe-area-inset-bottom,0px)] pt-2">
                    <Button
                        onClick={handleDismiss}
                        className="h-12 min-h-12 w-full gap-2 rounded-full text-sm font-bold"
                    >
                        <CheckCircle2 size={16} aria-hidden /> Verstanden &amp; dauerhaft ausblenden
                    </Button>

                    {'Notification' in window && Notification.permission === 'default' && (
                        <Button
                            variant="unstyled"
                            size="unstyled"
                            hapticStyle={false}
                            type="button"
                            onClick={requestNotificationPermission}
                            className="flex min-h-11 w-full items-center justify-center gap-1.5 text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                            <Bell size={16} aria-hidden /> Benachrichtigungen aktivieren
                        </Button>
                    )}
                </div>
            </div>
        </>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleDismiss(); }}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-3xl border-t border-border bg-card p-0 text-card-foreground"
                >
                    {content(SheetTitle, SheetDescription)}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleDismiss(); }}>
            <DialogContent showCloseButton={false} className="max-w-md gap-0 overflow-hidden rounded-3xl border border-border bg-card p-0 text-card-foreground">
                {content(DialogTitle, DialogDescription)}
            </DialogContent>
        </Dialog>
    );
}
