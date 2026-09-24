import { Megaphone, Eye, EyeOff, ExternalLink, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { SubjectChip } from '../SubjectChip';
import { SectionTitle, EmptyState, formatDate } from './shared';
import { useChildFetch } from './useChildFetch';
import type { ChildView } from './types';

interface AdRow {
    id: string;
    type: string;
    subjects: string[];
    grade_levels: string[];
    short_description: string | null;
    is_active: boolean;
    is_archived?: boolean;
    created_at: string;
}

/** Anzeigen des Kindes: sichtbar/unsichtbar umschalten und ansehen. */
export function AdsTab({ child }: { child: ChildView }) {
    const childId = child.profile.id;
    const navigate = useNavigate();
    const { items, loading, error, reload } = useChildFetch<AdRow>(
        async (id) => {
            const res = await api.ads.list({ user_id: id, all: true });
            return { data: res.data as AdRow[] | null, error: res.error };
        },
        childId
    );
    const [busyId, setBusyId] = useState<string | null>(null);

    const toggleActive = async (ad: AdRow) => {
        setBusyId(ad.id);
        try {
            const { error: err } = await api.ads.update(ad.id, { is_active: !ad.is_active });
            if (err) throw err;
            toast.success(ad.is_active ? 'Anzeige pausiert' : 'Anzeige ist wieder online');
            reload();
        } catch {
            toast.error('Änderung fehlgeschlagen');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            <SectionTitle
                action={
                    <Button variant="primary" size="sm" className="rounded-xl font-bold" onClick={() => navigate('/create-ad', { state: { childId } })}>
                        <Plus size={16} aria-hidden /> Neue Anzeige
                    </Button>
                }
            >
                Anzeigen
            </SectionTitle>

            {loading ? (
                <LoadingRows />
            ) : error ? (
                <EmptyState icon={Megaphone} title="Anzeigen konnten nicht geladen werden" hint={error} />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={Megaphone}
                    title="Noch keine Anzeigen"
                    hint="Mit einer Anzeige wird Ihr Kind im Feed sichtbar – für Nachhilfe als auch für Nachhilfesuche."
                    action={
                        <Button variant="primary" size="sm" className="rounded-xl font-bold" onClick={() => navigate('/create-ad', { state: { childId } })}>
                            <Plus size={16} aria-hidden /> Anzeige aufgeben
                        </Button>
                    }
                />
            ) : (
                <ul className="space-y-3">
                    {items.map((ad) => (
                        <li key={ad.id} className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${ad.type === 'offer' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                                            {ad.type === 'offer' ? 'Bietet Nachhilfe' : 'Sucht Nachhilfe'}
                                        </span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${ad.is_active ? 'bg-primary/30 text-yellow-800 dark:bg-primary/15 dark:text-yellow-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            {ad.is_active ? 'Online' : 'Pausiert'}
                                        </span>
                                        <span className="font-mono text-[10px] tabular-nums text-gray-400">seit {formatDate(ad.created_at)}</span>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                                        {ad.short_description || 'Ohne Beschreibung'}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {(ad.subjects || []).slice(0, 5).map((s) => (
                                            <SubjectChip key={s} subject={s as never} />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => navigate(`/ad/${ad.id}`)}>
                                        <ExternalLink size={14} aria-hidden /> Ansehen
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="rounded-xl font-bold"
                                        disabled={busyId === ad.id}
                                        onClick={() => toggleActive(ad)}
                                    >
                                        {ad.is_active ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                                        {ad.is_active ? 'Pausieren' : 'Aktivieren'}
                                    </Button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function LoadingRows() {
    return (
        <div className="space-y-3">
            {[0, 1].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
            ))}
        </div>
    );
}
