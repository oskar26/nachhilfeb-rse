import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
    hideNews,
    isNewsRead,
    getHiddenNewsIds,
    markNewsRead,
    normalizeNewsList,
    sortNews,
    type NewsItem,
} from '../lib/news';
import { NEWS_STATE_EVENT, notifyNewsStateChanged } from '../lib/news-events';
import { sanitizeHtml } from '../lib/sanitize';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { SidebarTrigger } from './ui/sidebar';
import NotificationCenter from './NotificationCenter';
import NewsIcon from './NewsIcon';
import { toast } from 'sonner';
import {
    Bell,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    EyeOff,
    Loader2,
    Newspaper,
    X,
} from 'lucide-react';

interface Props {
    unreadCount: number;
    onCountChange: (n: number) => void;
}

function badgeLabel(count: number) {
    return count > 99 ? '99+' : String(count);
}

function formatNewsDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

/**
 * Mobile Utility-Chrome: ersetzt die frühere Markenleiste. Öffnet Navigation,
 * Neuigkeiten und Meldungen als kompakte Overlays, ohne die Bottom-Navigation
 * um einen weiteren Eintrag zu erweitern.
 */
export default function MobileQuickMenu({ unreadCount, onCountChange }: Props) {
    const { user } = useAuth();
    const viewer = user?.id ?? null;

    const [quickOpen, setQuickOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [newsOpen, setNewsOpen] = useState(false);

    const [news, setNews] = useState<NewsItem[]>([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState(false);
    const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
    const [, setNewsRevision] = useState(0);
    const [hiddenIds, setHiddenIds] = useState<string[]>(() => getHiddenNewsIds(viewer));
    const newsRef = useRef<NewsItem[]>([]);

    useEffect(() => {
        newsRef.current = news;
    }, [news]);

    const fetchNews = useCallback(async (silent = false) => {
        if (!viewer) return;
        if (!silent) setNewsLoading(true);
        setNewsError(false);
        try {
            const { data, error } = await api.news.list();
            if (error) throw error;
            setNews(sortNews(normalizeNewsList(data)));
        } catch {
            if (!silent || newsRef.current.length === 0) setNewsError(true);
        } finally {
            if (!silent) setNewsLoading(false);
        }
    }, [viewer]);

    useEffect(() => {
        void fetchNews(false);
    }, [fetchNews]);

    useEffect(() => {
        const refresh = () => {
            void fetchNews(true);
            setNewsRevision(value => value + 1);
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === null || event.key.startsWith('fwg_news')) refresh();
        };
        window.addEventListener(NEWS_STATE_EVENT, refresh);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener(NEWS_STATE_EVENT, refresh);
            window.removeEventListener('storage', onStorage);
        };
    }, [fetchNews]);

    useEffect(() => {
        setHiddenIds(getHiddenNewsIds(viewer));
    }, [viewer, news]);

    const visibleNews = useMemo(
        () => news.filter(item => !hiddenIds.includes(item.id)),
        [hiddenIds, news]
    );
    const unreadNews = visibleNews.filter(item => !isNewsRead(item.id, viewer)).length;

    const totalUnread = unreadCount + unreadNews;
    const triggerLabel = totalUnread > 0
        ? `Schnellzugriff, ${totalUnread} ungelesen`
        : 'Schnellzugriff';

    const handleNewsOpenChange = (nextOpen: boolean) => {
        setNewsOpen(nextOpen);
        if (nextOpen) void fetchNews(newsRef.current.length > 0);
        if (!nextOpen) setExpandedNewsId(null);
    };

    const handleNotificationOpenChange = (nextOpen: boolean) => {
        setNotificationsOpen(nextOpen);
    };

    const handleMarkRead = (newsItem: NewsItem) => {
        if (!user) return;
        if (!markNewsRead(newsItem.id, viewer)) {
            triggerHaptic('error');
            toast.error('Neuigkeit konnte nicht als gelesen markiert werden.');
            return;
        }
        triggerHaptic('success');
        setExpandedNewsId(null);
        setNewsRevision(value => value + 1);
        notifyNewsStateChanged();
    };

    const handleHide = (newsItem: NewsItem) => {
        if (!user) return;
        if (!hideNews(newsItem.id, viewer)) {
            triggerHaptic('error');
            toast.error('Neuigkeit konnte nicht ausgeblendet werden.');
            return;
        }
        triggerHaptic('success');
        setExpandedNewsId(null);
        setHiddenIds(prev => prev.includes(newsItem.id) ? prev : [...prev, newsItem.id]);
        setNewsRevision(value => value + 1);
        notifyNewsStateChanged();
    };

    const openNews = () => {
        triggerHaptic('light');
        setQuickOpen(false);
        setNewsOpen(true);
        void fetchNews(newsRef.current.length > 0);
    };

    const openNotifications = () => {
        triggerHaptic('light');
        setQuickOpen(false);
        setNotificationsOpen(true);
    };

    const menuRowClass = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted';

    return (
        <>
            <Popover open={quickOpen} onOpenChange={setQuickOpen}>
                <div className="flex items-center gap-0.5 rounded-full border border-border/70 bg-card/95 p-1 shadow-soft backdrop-blur-xl md:hidden">
                    <SidebarTrigger
                        aria-label="Navigation öffnen"
                        className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    />
                    <PopoverTrigger
                        render={
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                hapticStyle={false}
                                type="button"
                                aria-label={triggerLabel}
                                className="relative grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            />
                        }
                    >
                        <Bell size={20} aria-hidden />
                        {totalUnread > 0 && (
                            <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-xs font-medium leading-none text-background ring-2 ring-card tabular-nums">
                                {badgeLabel(totalUnread)}
                            </span>
                        )}
                    </PopoverTrigger>
                </div>

                <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    aria-label="Schnellzugriff"
                    className="z-50 w-64 rounded-xl border border-border bg-card p-1.5 shadow-overlay md:hidden"
                >
                    <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">
                        Schnellzugriff
                    </p>
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        hapticStyle={false}
                        type="button"
                        onClick={openNews}
                        className={menuRowClass}
                    >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                            <Newspaper size={16} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate">Neuigkeiten</span>
                        {unreadNews > 0 && (
                            <span className="grid h-5 min-w-5 place-items-center rounded-md bg-muted px-1.5 text-xs font-semibold tabular-nums text-foreground">
                                {badgeLabel(unreadNews)}
                            </span>
                        )}
                    </Button>
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        hapticStyle={false}
                        type="button"
                        onClick={openNotifications}
                        className={menuRowClass}
                    >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Bell size={16} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate">Meldungen</span>
                        {unreadCount > 0 && (
                            <span className="grid h-5 min-w-5 place-items-center rounded-md bg-muted px-1.5 text-xs font-semibold tabular-nums text-foreground">
                                {badgeLabel(unreadCount)}
                            </span>
                        )}
                    </Button>
                </PopoverContent>
            </Popover>

            <NotificationCenter
                variant="sticker"
                unreadCount={unreadCount}
                onCountChange={onCountChange}
                open={notificationsOpen}
                onOpenChange={handleNotificationOpenChange}
                hideTrigger
            />

            <Sheet open={newsOpen} onOpenChange={handleNewsOpenChange}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-xl border-x border-t border-border bg-background p-0"
                >
                    <SheetTitle className="sr-only">Neuigkeiten</SheetTitle>
                    <SheetDescription className="sr-only">Ankündigungen der Schule</SheetDescription>

                    <div className="shrink-0 bg-background pt-3">
                        <div className="relative flex justify-center pb-1">
                            <span className="h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
                            <SheetClose className="absolute right-4 top-0 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                                <X size={18} aria-hidden />
                                <span className="sr-only">Schließen</span>
                            </SheetClose>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-border px-5 pb-4 pt-1">
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-base font-semibold leading-none">Neuigkeiten</h2>
                                {unreadNews > 0 && (
                                    <span className="grid h-5 min-w-5 place-items-center rounded-md bg-muted px-1.5 text-xs font-medium leading-none text-foreground tabular-nums">
                                        {badgeLabel(unreadNews)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
                        {newsLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={20} className="animate-spin text-muted-foreground" aria-hidden />
                            </div>
                        )}

                        {!newsLoading && newsError && (
                            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                                <div className="grid size-14 place-items-center rounded-xl bg-muted text-muted-foreground">
                                    <Newspaper size={24} aria-hidden />
                                </div>
                                <p className="text-sm font-semibold text-foreground">Neuigkeiten konnten nicht geladen werden.</p>
                                <Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs" onClick={() => void fetchNews(false)}>
                                    Erneut versuchen
                                </Button>
                            </div>
                        )}

                        {!newsLoading && !newsError && visibleNews.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                                <div className="grid size-14 place-items-center rounded-xl bg-muted text-muted-foreground">
                                    <Newspaper size={24} aria-hidden />
                                </div>
                                <p className="text-lg font-semibold leading-none text-foreground">Nichts Neues</p>
                                <p className="text-xs text-muted-foreground">Du bist auf dem aktuellen Stand.</p>
                            </div>
                        )}

                        {!newsLoading && !newsError && visibleNews.length > 0 && (
                            <div className="flex flex-col gap-2">
                                {visibleNews.map(item => {
                                    const isRead = isNewsRead(item.id, viewer);
                                    const expanded = expandedNewsId === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                'overflow-hidden rounded-xl border',
                                                isRead
                                                    ? 'border-border bg-card'
                                                    : 'border-foreground/20 bg-muted/50'
                                            )}
                                        >
                                            <Button
                                                variant="unstyled"
                                                size="unstyled"
                                                hapticStyle={false}
                                                type="button"
                                                onClick={() => {
                                                    triggerHaptic('light');
                                                    setExpandedNewsId(expanded ? null : item.id);
                                                }}
                                                aria-expanded={expanded}
                                                aria-controls={`quick-news-${item.id}`}
                                                className="flex min-h-14 w-full items-start gap-3 p-3.5 text-left"
                                            >
                                                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                                                    <NewsIcon value={item.icon} size={16} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-bold leading-snug text-foreground">
                                                        {item.title}
                                                    </span>
                                                    <span className="mt-1 block text-xs font-semibold tabular-nums text-muted-foreground">
                                                        {formatNewsDate(item.created_at)}
                                                    </span>
                                                </span>
                                                {!isRead ? (
                                                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground" aria-hidden />
                                                ) : null}
                                                {expanded
                                                    ? <ChevronUp size={16} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />
                                                    : <ChevronDown size={16} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />}
                                            </Button>

                                            {expanded && (
                                                <div id={`quick-news-${item.id}`} className="border-t border-border px-4 pb-4 pt-3">
                                                    <div
                                                        className="prose max-w-none whitespace-pre-line break-words text-sm font-medium leading-relaxed text-muted-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_a]:font-medium [&_a]:underline"
                                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body) }}
                                                    />
                                                    {!isRead && user && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-11 min-h-11 gap-1.5 text-xs"
                                                                onClick={() => handleMarkRead(item)}
                                                            >
                                                                <CheckCircle2 size={14} aria-hidden /> Verstanden
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-11 min-h-11 gap-1.5 text-xs"
                                                                onClick={() => handleHide(item)}
                                                            >
                                                                <EyeOff size={14} aria-hidden /> Ausblenden
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
