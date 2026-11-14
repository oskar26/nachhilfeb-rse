import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Newspaper, RotateCcw, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
    LEGACY_DISMISSED_NEWS_KEY,
    hideNews,
    isNewsHidden,
    isNewsPopupEnabled,
    isNewsRead,
    markNewsUnread,
    normalizeNewsList,
    setNewsPopupEnabled,
    sortNews,
    unhideNews,
    type NewsItem,
} from '../../lib/news';
import { sanitizeHtml } from '../../lib/sanitize';
import { triggerHaptic } from '../../lib/haptics';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import NewsIcon from '../NewsIcon';

/**
 * Wird nach jeder Änderung am Lese-/Ausblendestatus gefeuert, damit bereits
 * gemountete News-Flächen (Popup, Entdecken-Karte, Einstellungen) sofort
 * neu filtern. localStorage-Events feuern im selben Tab nicht.
 */
export const NEWS_STATE_EVENT = 'fwg:news-state-changed';

export function notifyNewsStateChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(NEWS_STATE_EVENT));
}

function formatNewsDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function NewsPreferences() {
    const { user } = useAuth();
    const viewer = user?.id ?? null;

    const [popupEnabled, setPopupEnabledState] = useState(() => isNewsPopupEnabled(viewer));
    const [showRead, setShowRead] = useState(false);
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [, bumpLocalRevision] = useState(0);

    const refreshList = useCallback(() => {
        setReloadKey((value) => value + 1);
    }, []);

    const bumpLocal = useCallback(() => {
        bumpLocalRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        setPopupEnabledState(isNewsPopupEnabled(viewer));
    }, [viewer]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const { data, error } = await api.news.list();
                if (cancelled) return;
                if (error) {
                    setLoadError('Neuigkeiten konnten nicht geladen werden.');
                    return;
                }
                setItems(sortNews(normalizeNewsList(data)));
            } catch {
                if (!cancelled) setLoadError('Neuigkeiten konnten nicht geladen werden.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    useEffect(() => {
        const onNewsStateChanged = () => bumpLocal();
        const onStorage = (event: StorageEvent) => {
            if (
                event.key === null ||
                event.key.startsWith('fwg_news') ||
                event.key === LEGACY_DISMISSED_NEWS_KEY
            ) {
                bumpLocal();
            }
        };
        window.addEventListener(NEWS_STATE_EVENT, onNewsStateChanged);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener(NEWS_STATE_EVENT, onNewsStateChanged);
            window.removeEventListener('storage', onStorage);
        };
    }, [bumpLocal]);

    const handlePopupToggle = (checked: boolean) => {
        if (!setNewsPopupEnabled(checked, viewer)) {
            triggerHaptic('error');
            toast.error('Einstellung konnte nicht gespeichert werden.');
            return;
        }
        setPopupEnabledState(checked);
        triggerHaptic(checked ? 'success' : 'selection');
        toast.success(checked ? 'News-Popup aktiviert.' : 'News-Popup deaktiviert.');
    };

    const handleMarkUnread = (item: NewsItem) => {
        if (!markNewsUnread(item.id, viewer)) {
            triggerHaptic('error');
            toast.error('Neuigkeit konnte nicht aktualisiert werden.');
            return;
        }
        triggerHaptic('success');
        toast.success('Wieder als ungelesen markiert.');
        notifyNewsStateChanged();
    };

    const handleHide = (item: NewsItem) => {
        if (!hideNews(item.id, viewer)) {
            triggerHaptic('error');
            toast.error('Neuigkeit konnte nicht ausgeblendet werden.');
            return;
        }
        triggerHaptic('success');
        toast.success('Neuigkeit ausgeblendet.');
        notifyNewsStateChanged();
    };

    const handleUnhide = (item: NewsItem) => {
        if (!unhideNews(item.id, viewer)) {
            triggerHaptic('error');
            toast.error('Neuigkeit konnte nicht eingeblendet werden.');
            return;
        }
        triggerHaptic('success');
        toast.success('Neuigkeit wieder eingeblendet.');
        notifyNewsStateChanged();
    };

    const readItems = items.filter(
        (item) => isNewsRead(item.id, viewer) && !isNewsHidden(item.id, viewer),
    );
    const hiddenItems = items.filter((item) => isNewsHidden(item.id, viewer));
    const unreadCount = items.filter(
        (item) => !isNewsRead(item.id, viewer) && !isNewsHidden(item.id, viewer),
    ).length;

    return (
        <Card className="border-border bg-card">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Newspaper size={18} className="text-muted-foreground" aria-hidden /> Neuigkeiten
                </CardTitle>
                <CardDescription className="text-xs">
                    Steuere das News-Popup und sieh dir gelesene oder ausgeblendete Mitteilungen an.
                </CardDescription>
            </CardHeader>
            <CardContent padding="flush" className="divide-y divide-border">
                <div className="flex items-center justify-between gap-4 p-4 sm:px-6">
                    <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">News-Popup anzeigen</h4>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            Öffnet neue Mitteilungen einmalig als Fenster. Gelesene News bleiben in dieser Liste.
                        </p>
                    </div>
                    <Switch
                        checked={popupEnabled}
                        onCheckedChange={handlePopupToggle}
                        label="News-Popup beim Öffnen anzeigen"
                    />
                </div>

                <div className="p-4 sm:px-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                Gelesene Neuigkeiten anzeigen
                                {readItems.length > 0 && (
                                    <Badge variant="default" className="h-5 px-2 text-[11px] tabular-nums">
                                        {readItems.length}
                                    </Badge>
                                )}
                            </h4>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {loading
                                    ? 'Neuigkeiten werden geladen...'
                                    : loadError
                                        ? loadError
                                        : `Dein Archiv: ${unreadCount > 0
                                            ? `${unreadCount} ungelesene ${unreadCount === 1 ? 'Mitteilung' : 'Mitteilungen'} warten noch.`
                                            : 'Du bist auf dem aktuellen Stand.'}`}
                            </p>
                        </div>
                        <Switch
                            checked={showRead}
                            onCheckedChange={(checked) => {
                                setShowRead(checked);
                                triggerHaptic('selection');
                            }}
                            label="Gelesene Neuigkeiten anzeigen"
                        />
                    </div>

                    {showRead && (
                        <div className="mt-4 space-y-3">
                            {loading ? (
                                <p className="rounded-xl border border-border bg-muted/40 px-3 py-4 text-xs font-medium text-muted-foreground">
                                    Lade Neuigkeiten...
                                </p>
                            ) : loadError ? (
                                <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-4">
                                    <p className="text-xs font-medium text-muted-foreground">{loadError}</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10"
                                        onClick={refreshList}
                                    >
                                        Erneut laden
                                    </Button>
                                </div>
                            ) : readItems.length === 0 ? (
                                <p className="rounded-xl border border-border bg-muted/40 px-3 py-4 text-xs font-medium text-muted-foreground">
                                    Du hast noch keine Neuigkeit als gelesen markiert.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {readItems.map((item) => (
                                        <li key={item.id}>
                                            <details className="group rounded-xl border border-border bg-card">
                                                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                                                        <NewsIcon value={item.icon} size={16} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-semibold text-foreground">
                                                            {item.title}
                                                        </span>
                                                        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                                                            Gelesen · {formatNewsDate(item.created_at)}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 text-xs font-semibold text-muted-foreground group-open:hidden">
                                                        Ansehen
                                                    </span>
                                                    <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground group-open:inline">
                                                        Zuklappen
                                                    </span>
                                                </summary>
                                                <div className="border-t border-border px-3 pb-3 pt-3">
                                                    <div
                                                        className="prose max-w-none whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                                                    />
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-10 gap-1.5 text-xs"
                                                            onClick={() => handleMarkUnread(item)}
                                                        >
                                                            <RotateCcw size={14} aria-hidden /> Wieder ungelesen
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-10 gap-1.5 text-xs"
                                                            onClick={() => handleHide(item)}
                                                        >
                                                            <EyeOff size={14} aria-hidden /> Ausblenden
                                                        </Button>
                                                    </div>
                                                </div>
                                            </details>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {hiddenItems.length > 0 && (
                                <div className="rounded-xl border border-border bg-muted/40 p-3">
                                    <h5 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <Megaphone size={14} aria-hidden /> Ausgeblendete Neuigkeiten
                                    </h5>
                                    <ul className="mt-2 space-y-2">
                                        {hiddenItems.map((item) => (
                                            <li key={item.id} className="flex items-center gap-3">
                                                <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                                                    {item.title}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-10 shrink-0 gap-1.5 text-xs"
                                                    onClick={() => handleUnhide(item)}
                                                >
                                                    <Eye size={14} aria-hidden /> Einblenden
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
