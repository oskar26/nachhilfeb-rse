import { Heart, ExternalLink, MapPin, Euro } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { SubjectChip } from '../SubjectChip';
import { SectionTitle, EmptyState } from './shared';
import { useChildFetch } from './useChildFetch';
import type { ChildView } from './types';

interface FavoriteRow {
    ad_id: string;
    favorited_at: string;
    type: string;
    subjects: string[];
    locations: string[];
    short_description: string | null;
    price_details?: { min?: number | string; max?: number | string; note?: string };
    profiles?: { display_name: string | null; grade_level: string | null };
}

/** Gemerkte Anzeigen des Kindes – synchronisierte Merkliste. */
export function FavoritesTab({ child }: { child: ChildView }) {
    const childId = child.profile.id;
    const navigate = useNavigate();
    const { items, loading, error } = useChildFetch<FavoriteRow>(
        async (id) => {
            const res = await api.favorites.list(id);
            return { data: res.data as FavoriteRow[] | null, error: res.error };
        },
        childId
    );

    return (
        <div className="space-y-6">
            <SectionTitle>Merkliste</SectionTitle>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1].map((i) => (
                        <div key={i} className="h-28 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
                    ))}
                </div>
            ) : error ? (
                <EmptyState icon={Heart} title="Merkliste konnte nicht geladen werden" hint={error} />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={Heart}
                    title="Merkliste ist noch leer"
                    hint="Was Ihr Kind sich im Feed merkt, landet hier – Sie sehen dieselbe Auswahl synchron mit."
                />
            ) : (
                <ul className="space-y-3">
                    {items.map((f) => {
                        const price = describePrice(f.price_details);
                        return (
                            <li key={f.ad_id} className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${f.type === 'offer' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                                                {f.type === 'offer' ? 'Bietet Nachhilfe' : 'Sucht Nachhilfe'}
                                            </span>
                                            {f.profiles?.display_name && (
                                                <span className="text-[10px] font-semibold text-gray-500">
                                                    von {f.profiles.display_name}
                                                    {f.profiles.grade_level ? ` · Stufe ${f.profiles.grade_level}` : ''}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-2 line-clamp-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                                            {f.short_description || 'Ohne Beschreibung'}
                                        </p>

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            {(f.subjects || []).slice(0, 5).map((s) => (
                                                <SubjectChip key={s} subject={s as never} />
                                            ))}
                                            {(f.locations || []).slice(0, 2).map((l) => (
                                                <span key={l} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                    <MapPin size={10} aria-hidden /> {l}
                                                </span>
                                            ))}
                                            {price && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                    <Euro size={10} aria-hidden /> {price}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate(`/ad/${f.ad_id}`)}
                                        className="press inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-200"
                                    >
                                        <ExternalLink size={13} aria-hidden /> Anzeige
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function describePrice(p?: FavoriteRow['price_details']): string | null {
    if (!p) return null;
    const min = p.min !== undefined && p.min !== null && p.min !== '' ? String(p.min) : null;
    const max = p.max !== undefined && p.max !== null && p.max !== '' ? String(p.max) : null;
    if (min && max && min !== max) return `${min}–${max} €`;
    if (min || max) return `${min || max} €`;
    return p.note ? p.note : null;
}
