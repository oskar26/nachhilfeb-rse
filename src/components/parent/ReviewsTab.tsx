import { Star, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { SectionTitle, EmptyState, formatDate } from './shared';
import { useChildFetch } from './useChildFetch';
import type { ChildView } from './types';

interface ReviewRow {
    id: string;
    rating: number | string;
    comment: string | null;
    created_at: string;
    author_name: string | null;
}

/** Bewertungen des Kindes. Autoren sind Schüler – deshalb nur Name, nie Kontakt. */
export function ReviewsTab({ child }: { child: ChildView }) {
    const childId = child.profile.id;
    const { items, loading, error } = useChildFetch<ReviewRow>(
        async (id) => {
            const res = await api.reviews.list({ target_user_id: id });
            return { data: res.data as ReviewRow[] | null, error: res.error };
        },
        childId
    );

    const avg = items.length
        ? items.reduce((sum, r) => sum + Number(r.rating || 0), 0) / items.length
        : child.profile.average_rating;

    return (
        <div className="space-y-6">
            <SectionTitle
                action={
                    items.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 font-mono text-xs font-bold tabular-nums text-yellow-800 dark:bg-primary/10 dark:text-yellow-300">
                            <Star size={13} className="fill-current" aria-hidden />
                            {avg.toFixed(1)} Ø
                        </span>
                    ) : undefined
                }
            >
                Bewertungen
            </SectionTitle>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1].map((i) => (
                        <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
                    ))}
                </div>
            ) : error ? (
                <EmptyState icon={Star} title="Bewertungen konnten nicht geladen werden" hint={error} />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={Star}
                    title="Noch keine Bewertungen"
                    hint="Nach abgeschlossener Nachhilfe können Bewertungen abgegeben werden – sie erscheinen hier und auf dem öffentlichen Profil."
                />
            ) : (
                <ul className="space-y-3">
                    {items.map((r) => {
                        const rating = Math.round(Number(r.rating || 0));
                        return (
                            <li key={r.id} className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/25 font-bold text-yellow-800 dark:bg-primary/15 dark:text-yellow-300">
                                        {(r.author_name || '?').slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                            <p className="text-sm font-bold text-gray-950 dark:text-gray-50">
                                                {r.author_name || 'Nutzer:in'}
                                            </p>
                                            <span className="font-mono text-[10px] tabular-nums text-gray-400">{formatDate(r.created_at)}</span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-0.5" aria-label={`${rating} von 5 Sternen`}>
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <Star
                                                    key={n}
                                                    size={14}
                                                    className={n <= rating ? 'fill-primary text-primary' : 'text-gray-300 dark:text-gray-600'}
                                                    aria-hidden
                                                />
                                            ))}
                                        </div>
                                        {r.comment && (
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <p className="flex items-start gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden />
                Bewertungen stammen von Schülerinnen und Schülern der FWG. Kontaktdaten der Bewertenden werden aus Datenschutzgründen nicht angezeigt.
            </p>
        </div>
    );
}
