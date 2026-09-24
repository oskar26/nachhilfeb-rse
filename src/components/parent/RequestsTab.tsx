import { MessageSquare, ExternalLink, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { SubjectChip } from '../SubjectChip';
import { SectionTitle, EmptyState, RequestStatusChip, formatDateTime } from './shared';
import { useChildFetch } from './useChildFetch';
import type { ChildView } from './types';

interface RequestRow {
    id: string;
    ad_id: string;
    status: string;
    role: string;
    message: string | null;
    created_at: string;
    ad_title: string | null;
    ad_subjects: string[];
    ad_type: string;
    requester: { id: string; display_name: string | null; grade_level: string | null };
    owner: { id: string; display_name: string | null; grade_level: string | null };
}

/**
 * Anfragen des Kindes. Bewusst nur Metadaten: Der Chatverlauf bleibt den
 * Beteiligten vorbehalten – Eltern sehen Status, Gegenstelle und Anfragetext.
 */
export function RequestsTab({ child }: { child: ChildView }) {
    const childId = child.profile.id;
    const navigate = useNavigate();
    const { items, loading, error } = useChildFetch<RequestRow>(
        async (id) => {
            const res = await api.requests.list(id);
            return { data: res.data as RequestRow[] | null, error: res.error };
        },
        childId
    );

    return (
        <div className="space-y-6">
            <SectionTitle>Anfragen</SectionTitle>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1].map((i) => (
                        <div key={i} className="h-28 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
                    ))}
                </div>
            ) : error ? (
                <EmptyState icon={Inbox} title="Anfragen konnten nicht geladen werden" hint={error} />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={Inbox}
                    title="Noch keine Anfragen"
                    hint="Eingehende Anfragen auf die Anzeigen Ihres Kindes erscheinen hier inklusive Status und Gegenstelle."
                />
            ) : (
                <ul className="space-y-3">
                    {items.map((r) => {
                        const isIncoming = r.owner.id === childId;
                        const counterpart = isIncoming ? r.requester : r.owner;
                        const counterpartName = counterpart.display_name || 'Unbekannt';
                        return (
                            <li key={r.id} className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <RequestStatusChip status={r.status} />
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${isIncoming ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                                {isIncoming ? 'Eingehend' : 'Ausgehend'}
                                            </span>
                                            <span className="font-mono text-[10px] tabular-nums text-gray-400">{formatDateTime(r.created_at)}</span>
                                        </div>

                                        <p className="mt-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                                            {r.ad_title || 'Anzeige'}
                                            <span className="ml-2 font-normal text-gray-500">mit {counterpartName}</span>
                                        </p>

                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {(r.ad_subjects || []).slice(0, 4).map((s) => (
                                                <SubjectChip key={s} subject={s as never} />
                                            ))}
                                        </div>

                                        {r.message && (
                                            <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                                                <span className="font-bold text-gray-500 dark:text-gray-400">Anfragetext: </span>
                                                {r.message}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate(`/ad/${r.ad_id}`)}
                                        className="press inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-200"
                                    >
                                        <ExternalLink size={13} aria-hidden /> Anzeige
                                    </button>
                                </div>

                                {r.status === 'accepted' && (
                                    <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 dark:bg-green-950/30 dark:text-green-300">
                                        <MessageSquare size={13} aria-hidden />
                                        Die Kontaktaufnahme läuft direkt zwischen den Beteiligten.
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
