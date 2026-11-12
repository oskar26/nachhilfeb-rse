import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ChevronDown, ChevronUp } from 'lucide-react';
import NewsIcon from './NewsIcon';

interface Announcement {
    id: string;
    title: string;
    body: string;
    icon: string;
    created_at: string;
}

export function CollapsedNewsWidget({ compact = false }: { compact?: boolean }) {
    const [news, setNews] = useState<Announcement | null>(null);
    const [expanded, setExpanded] = useState(false); // Default collapsed as requested!

    const fetchLatestNews = async () => {
        try {
            const { data, error } = await api.news.list();

            if (!error && data && data.length > 0) {
                setNews(data[0] as Announcement);
            }
        } catch {
            /* noop */
        }
    };

    useEffect(() => {
        fetchLatestNews();
    }, []);

    if (!news) return null;

    if (compact) {
        return (
            <div className="relative max-w-full">
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/80 bg-card py-2 pl-3 pr-4 text-left shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card"
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
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{news.body}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Card className="w-full overflow-hidden rounded-xl border border-border bg-muted ring-0">
            {/* Collapsed Header Bar */}
            <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted"
                aria-expanded={expanded}
                aria-controls="collapsed-news-content"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <NewsIcon value={news.icon} size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-muted text-xs font-bold text-foreground">
                                Neuigkeiten
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground">
                                {new Date(news.created_at).toLocaleDateString('de-DE')}
                            </span>
                        </div>
                        <h4 className="mt-0.5 break-words text-sm font-bold leading-snug text-foreground">
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
                <CardContent id="collapsed-news-content" className="border-t border-border px-5 pb-5 pt-4">
                    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-muted-foreground">
                        {news.body}
                    </p>
                </CardContent>
            )}
        </Card>
    );
}
