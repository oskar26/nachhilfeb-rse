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

export function CollapsedNewsWidget() {
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

    return (
        <Card className="w-full overflow-hidden rounded-3xl border-primary/30 bg-primary/5 shadow-sm">
            {/* Collapsed Header Bar */}
            <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-primary/10"
                aria-expanded={expanded}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-amber-800 dark:text-primary">
                        <NewsIcon value={news.icon} size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-primary/20 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-primary">
                                Neuigkeiten
                            </Badge>
                            <span className="text-[10px] font-semibold text-gray-400">
                                {new Date(news.created_at).toLocaleDateString('de-DE')}
                            </span>
                        </div>
                        <h4 className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">
                            {news.title}
                        </h4>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-700 dark:text-primary">
                    <span>{expanded ? 'Einklappen' : 'Mehr lesen'}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </Button>

            {/* Expandable Content */}
            {expanded && (
                <CardContent className="border-t border-primary/20 px-5 pb-5 pt-4">
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {news.body}
                    </p>
                </CardContent>
            )}
        </Card>
    );
}
