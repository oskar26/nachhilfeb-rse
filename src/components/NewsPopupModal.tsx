import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Bell, CheckCircle2, EyeOff, Megaphone, Newspaper, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import NewsIcon from './NewsIcon';
import { useAuth } from '../context/AuthContext';
import {
    hideNews,
    markNewsRead,
    normalizeNewsList,
    showNewsPopup,
    sortNews,
    type NewsItem,
} from '../lib/news';
import { sanitizeHtml } from '../lib/sanitize';
import { notifyNewsStateChanged } from '../lib/news-events';

function plainText(value: string): string {
    const withoutBlocks = value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

    try {
        if (typeof DOMParser === 'undefined') throw new Error('DOMParser unavailable');
        const doc = new DOMParser().parseFromString(withoutBlocks, 'text/html');
        return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
    } catch {
        return withoutBlocks
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/\s+/g, ' ')
            .trim();
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
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [news, setNews] = useState<NewsItem | null>(null);
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();
    const viewer = user?.id ?? null;

    const fetchLatestUnseenNews = useCallback(async () => {
        try {
            const { data, error } = await api.news.list();

            if (error || !data) return;

            // Eine Normalisierung für beide API-Payloads: `body` (Altbestand)
            // und `content` (aktuelles Schema). Ungültige Zeilen werden verworfen.
            const candidates = sortNews(normalizeNewsList(data)).filter((item) =>
                showNewsPopup(item, viewer),
            );
            const latest = candidates[0];
            if (!latest) return;

            setNews(latest);
            setOpen(true);

            // Try browser push notification if permissions granted
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(latest.title, {
                        body: plainText(latest.body),
                        icon: '/favicon.ico',
                    });
                } catch {
                    /* noop */
                }
            }
        } catch (e) {
            console.error('[NewsPopupModal] fetch error:', e);
        }
    }, [viewer]);

    useEffect(() => {
        // Erst nach der Session-Wiederherstellung laden, damit nicht zuerst der
        // Gast-Scope und danach der persönliche Scope ein Popup öffnet.
        if (authLoading) return;
        // Fetch-on-Mount: idiomatische Initial-Datenladung, kein kaskadierendes Render-Problem
        void fetchLatestUnseenNews();
    }, [authLoading, fetchLatestUnseenNews]);

    const close = () => setOpen(false);

    const handleUnderstood = () => {
        if (!news || !user) return;
        if (!markNewsRead(news.id, viewer)) {
            toast.error('Neuigkeit konnte nicht als gelesen markiert werden.');
            return;
        }
        notifyNewsStateChanged();
        close();
    };

    const handleHide = () => {
        if (!news || !user) return;
        if (!hideNews(news.id, viewer)) {
            toast.error('Neuigkeit konnte nicht ausgeblendet werden.');
            return;
        }
        notifyNewsStateChanged();
        close();
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }
    };

    if (!news) return null;

    const header = (
        <div className="flex h-auto min-h-16 items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3">
            <span className="inline-flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground">
                <Megaphone size={16} className="text-foreground" aria-hidden />
                <span>Neue Schul-Mitteilung</span>
            </span>
            <Button
                variant="unstyled"
                size="unstyled"
                hapticStyle={false}
                type="button"
                onClick={close}
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
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card text-foreground">
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
                            minute: '2-digit',
                        })}
                    </p>
                </div>

                <Description className="sr-only">Neue Schul-Mitteilung.</Description>
                <div
                    className="prose max-w-none whitespace-pre-line break-words border-l-2 border-border pl-4 text-sm font-medium leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(news.body) }}
                />

                {/* Actions: Lesen und Ausblenden sind bewusst getrennt. Gäste
                    können den Status nicht verwalten und bekommen nur Schließen. */}
                <div className="space-y-2 pb-[env(safe-area-inset-bottom,0px)] pt-2">
                    {user ? (
                        <>
                            <Button
                                onClick={handleUnderstood}
                                className="h-12 min-h-12 w-full gap-2 rounded-full text-sm font-bold"
                            >
                                <CheckCircle2 size={16} aria-hidden /> Verstanden
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleHide}
                                className="h-11 min-h-11 w-full gap-2 rounded-full text-sm font-semibold"
                            >
                                <EyeOff size={16} aria-hidden /> Ausblenden
                            </Button>

                            <Button
                                variant="unstyled"
                                size="unstyled"
                                hapticStyle={false}
                                type="button"
                                onClick={() => {
                                    close();
                                    navigate('/settings?news=read');
                                }}
                                className="flex min-h-11 w-full items-center justify-center gap-1.5 text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                                <Newspaper size={16} aria-hidden /> Gelesene Neuigkeiten anzeigen
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
                        </>
                    ) : (
                        <Button
                            onClick={close}
                            className="h-12 min-h-12 w-full gap-2 rounded-full text-sm font-bold"
                        >
                            Schließen
                        </Button>
                    )}
                </div>
            </div>
        </>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
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
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
            <DialogContent showCloseButton={false} className="max-w-md gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 text-card-foreground">
                {content(DialogTitle, DialogDescription)}
            </DialogContent>
        </Dialog>
    );
}
