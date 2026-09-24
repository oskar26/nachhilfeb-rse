import { Megaphone, MessageSquare, Star, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { SectionTitle, EmptyState, ACTIVITY_META, formatDateTime } from './shared';
import type { ChildView } from './types';

/**
 * Überblick: Aktivitäts-Verlauf des Kindes als kompakte Timeline plus
 * nächste sinnvolle Schritte, wenn noch wenig passiert ist.
 */
export function OverviewTab({ child }: { child: ChildView }) {
    const navigate = useNavigate();
    const activity = child.profile.recent_activity || [];
    const stats = child.profile.stats;

    return (
        <div className="space-y-8">
            <section>
                <SectionTitle
                    action={
                        activity.length > 0 ? (
                            <span className="text-xs font-semibold text-gray-400">
                                {activity.length} von {Math.max(activity.length, 5)} Aktionen
                            </span>
                        ) : undefined
                    }
                >
                    Letzte Aktionen
                </SectionTitle>

                <div className="mt-4">
                    {activity.length === 0 ? (
                        <EmptyState
                            icon={Sparkles}
                            title="Hier ist es noch ruhig"
                            hint="Sobald Ihr Kind eine Anzeige veröffentlicht, eine Anfrage erhält oder bewertet wird, erscheint hier der Verlauf."
                            action={
                                <Button variant="primary" size="sm" className="rounded-xl font-bold" onClick={() => navigate('/create-ad', { state: { childId: child.profile.id } })}>
                                    <Megaphone size={16} aria-hidden /> Erste Anzeige aufgeben
                                </Button>
                            }
                        />
                    ) : (
                        <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-gray-200 dark:before:bg-gray-800">
                            {activity.map((a) => {
                                const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.ad;
                                const Icon = meta.icon;
                                return (
                                    <li key={a.id} className="relative flex gap-3">
                                        <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.className}`}>
                                            <Icon size={16} aria-hidden />
                                        </span>
                                        <div className="min-w-0 flex-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                <p className="truncate text-sm font-bold text-gray-950 dark:text-gray-50">{a.title}</p>
                                                <time className="shrink-0 font-mono text-[10px] tabular-nums text-gray-400" dateTime={a.timestamp}>
                                                    {formatDateTime(a.timestamp)}
                                                </time>
                                            </div>
                                            {a.description && (
                                                <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </section>

            <section>
                <SectionTitle>Auf einen Blick</SectionTitle>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <QuickGlance
                        icon={Megaphone}
                        title="Anzeigen"
                        value={stats.ads_count}
                        hint={stats.ads_count === 0 ? 'Noch keine Anzeige online' : 'Aktiv im Feed sichtbar'}
                        onClick={() => navigate('/create-ad', { state: { childId: child.profile.id } })}
                    />
                    <QuickGlance
                        icon={MessageSquare}
                        title="Anfragen"
                        value={stats.requests_count}
                        hint={stats.requests_count === 0 ? 'Noch keine Anfragen' : 'Läuft – Details im Tab'}
                    />
                    <QuickGlance
                        icon={Star}
                        title="Bewertungen"
                        value={stats.reviews_count}
                        hint={stats.reviews_count === 0 ? 'Noch ohne Bewertung' : `Ø ${child.profile.average_rating.toFixed(1)} Sterne`}
                    />
                </div>
            </section>
        </div>
    );
}

function QuickGlance({
    icon: Icon,
    title,
    value,
    hint,
    onClick
}: {
    icon: typeof Megaphone;
    title: string;
    value: number;
    hint: string;
    onClick?: () => void;
}) {
    const content = (
        <>
            <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Icon size={17} aria-hidden />
                </div>
                <span className="font-mono tabular-nums text-3xl font-bold leading-none text-gray-950 dark:text-gray-50">{value}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-gray-950 dark:text-gray-50">{title}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
            {onClick && (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gray-950 dark:text-gray-100">
                    Anzeige aufgeben <ArrowRight size={13} aria-hidden />
                </span>
            )}
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="press rounded-3xl border border-gray-100 bg-white p-4 text-left dark:border-gray-800 dark:bg-gray-900"
            >
                {content}
            </button>
        );
    }

    return (
        <div className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            {content}
        </div>
    );
}
