import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    LEGACY_DISMISSED_NEWS_KEY,
    getVisibleNews,
    hideNews,
    markNewsRead,
    normalizeNewsList,
    sortNews,
    type NewsItem,
} from '../lib/news';
import { isNewsCardEnabled } from '../lib/news-preferences';
import { NEWS_STATE_EVENT, notifyNewsStateChanged } from '../lib/news-events';
import { sanitizeHtml } from '../lib/sanitize';
import { triggerHaptic } from '../lib/haptics';
import { CheckCircle2, ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
import NewsIcon from './NewsIcon';

export function CollapsedNewsWidget({ compact = false }: { compact?: boolean }) {
    const { user } = useAuth();
    const viewer = user?.id ?? null;
    const [items, setItems] = useState<NewsItem[]>([]);
    const [expanded, setExpanded] = useState(false); // Default collapsed as requested!
    const [, setRevision] = useState(0);

    const fetchLatestNews = useCallback(async () => {
        try {
            const { data, error } = await api.news.list();
            if (!error && data) {
                setItems(sortNews(normalizeNewsList(data)));
            }
        } catch {
            /* noop */
        }
    }, []);

    useEffect(() => {
        void fetchLatestNews();
    }, [fetchLatestNews]);

    useEffect(() => {
        const onNewsStateChanged = () => {
            setExpanded(false);
            setRevision((value) => value + 1);
        };
        const onStorage = (event: StorageEvent) => {
            if (
                event.key === null ||
                event.key.startsWith('fwg_news') ||
                event.key === LEGACY_DISMISSED_NEWS_KEY
            ) {
                onNewsStateChanged();
            }
        };
        window.addEventListener(NEWS_STATE_EVENT, onNewsStateChanged);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener(NEWS_STATE_EVENT, onNewsStateChanged);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    // Gelesene und ausgeblendete News werden hier nicht mehr angezeigt. Ohne
    // ungelesene News oder bei deaktivierter Karte verschwindet die Fläche
    // komplett aus dem ersten Viewport.
    const cardEnabled = isNewsCardEnabled(viewer);
    const visibleNews = getVisibleNews(items, viewer);
    const news = visibleNews[0];

    if (!cardEnabled || !news) {
        return null;
    }

    const handleMarkRead = () => {
        if (!user) return;
        if (!markNewsRead(news.id, viewer)) {
            triggerHaptic('error');
            toast.error('Neuigkeit konnte nicht als gelesen markiert werden.');
            return;
        }
        triggerHaptic('success');
        setExpanded(false);
        notifyNewsStateChanged();
    };

    const handleHide = () => {
        if (!user) return;
        if (!hideNews(news.id, viewer)) {
            triggerHaptic('error');
            toast.error('Neuigkeit konnte nicht ausgeblendet werden.');
            return;
        }
        triggerHaptic('success');
        setExpanded(false);
        notifyNewsStateChanged();
    };

    const actions = user ? (
        <div className="mt-3 flex flex-wrap gap-2">
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 min-h-11 gap-1.5 text-xs"
                onClick={handleMarkRead}
            >
                <CheckCircle2 size={14} aria-hidden /> Verstanden
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 min-h-11 gap-1.5 text-xs"
                onClick={handleHide}
            >
                <EyeOff size={14} aria-hidden /> Ausblenden
            </Button>
        </div>
    ) : null;

    if (compact) {
        return (
            <div className="relative max-w-full">
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/80 bg-card py-2 pl-3 pr-4 text-left shadow-soft transition-[box-shadow] duration-150 hover:shadow-card"
                    aria-expanded={expanded}
                    aria-controls="collapsed-news-popover"
                >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pastel-blue text-pastel-blue-foreground">
                        <NewsIcon value={news.icon} size={16} />
                    </span>
                    <span className="text-xs font-bold text-foreground">Neuigkeiten</span>
                    <span className="max-w-[15rem] truncate text-xs font-medium text-muted-foreground sm:max-w-xs">{news.title}</span>
                    {expanded ? <ChevronUp size={15} className="shrink-0" aria-hidden /> : <ChevronDown size={15} className="shrink-0" aria-hidden />}
                </button>
                {expanded && (
                    <div id="collapsed-news-popover" className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(88vw,26rem)] rounded-card border border-border bg-card p-4 shadow-overlay">
                        <p className="text-xs font-semibold text-muted-foreground">{new Date(news.created_at).toLocaleDateString('de-DE')}</p>
                        <h4 className="mt-1 text-sm font-bold text-foreground">{news.title}</h4>
                        <div
                            className="prose mt-2 max-w-none whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_a]:font-medium [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(news.body) }}
                        />
                        {actions}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Card className="w-full overflow-hidden rounded-xl border border-border bg-muted ring-0">
            {/* Kompakte Kopfzeile: eine Zeile, damit die erste Anzeige im Viewport bleibt. */}
            <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-muted"
                aria-expanded={expanded}
                aria-controls="collapsed-news-content"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <NewsIcon value={news.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="h-6 bg-muted px-2 text-xs font-bold text-foreground">
                                Neuigkeiten
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground">
                                {new Date(news.created_at).toLocaleDateString('de-DE')}
                            </span>
                        </div>
                        <h4 className="mt-0.5 truncate text-sm font-bold leading-snug text-foreground">
                            {news.title}
                        </h4>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-foreground">
                    <span className="hidden sm:inline">{expanded ? 'Einklappen' : 'Mehr lesen'}</span>
                    {expanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                </div>
            </Button>

            {/* Expandable Content */}
            {expanded && (
                <CardContent id="collapsed-news-content" padding="flush" className="border-t border-border px-5 pb-5 pt-4">
                    <div
                        className="prose max-w-none whitespace-pre-line break-words text-sm font-medium leading-relaxed text-muted-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_a]:font-medium [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(news.body) }}
                    />
                    {actions}
                </CardContent>
            )}
        </Card>
    );
}
