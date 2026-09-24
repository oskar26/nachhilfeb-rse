import { useMemo, useState, useEffect, useCallback } from 'react';
import { Target, ExternalLink, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { computeMatches, type Match, type MatchAd } from '../../lib/matching';
import { SubjectChip } from '../SubjectChip';
import { Button } from '../ui/Button';
import { SectionTitle, EmptyState } from './shared';
import type { ChildView } from './types';

/**
 * Passende Anzeigen für das Kind: derselbe Multi-Factor-Scoring-Algorithmus
 * wie im Schüler-Matching, nur aus der Elternsicht berechnet.
 */
export function MatchesTab({ child }: { child: ChildView }) {
    const childId = child.profile.id;
    const navigate = useNavigate();
    const [myAds, setMyAds] = useState<MatchAd[]>([]);
    const [candidates, setCandidates] = useState<MatchAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [mine, all] = await Promise.all([
                api.ads.list({ user_id: childId, all: true }),
                api.ads.list({ all: true })
            ]);
            if (mine.error) throw mine.error;
            if (all.error) throw all.error;

            const active = (rows: MatchAd[]) => (rows || []).filter((a) => a.is_active !== false);
            setMyAds(active((mine.data || []) as MatchAd[]));
            setCandidates(active((all.data || []) as MatchAd[]).filter((a) => a.user_id !== childId));
        } catch (e) {
            setError(apiErrorMessage(e, 'Matches konnten nicht berechnet werden.'));
        } finally {
            setLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        load();
    }, [load]);

    const matches = useMemo<Match[]>(
        () =>
            computeMatches({
                myAds,
                candidateAds: candidates,
                profile: {
                    grade_level: child.profile.grade_level,
                    subjects: (child.profile.subjects as string[]) || [],
                    availability: child.profile.availability || null
                },
                userId: childId
            }),
        [myAds, candidates, child.profile, childId]
    );

    return (
        <div className="space-y-6">
            <SectionTitle
                action={
                    matches.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 font-mono text-xs font-bold tabular-nums text-yellow-800 dark:bg-primary/10 dark:text-yellow-300">
                            <TrendingUp size={13} aria-hidden /> {matches.length} Treffer
                        </span>
                    ) : undefined
                }
            >
                Matches
            </SectionTitle>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-32 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
                    ))}
                </div>
            ) : error ? (
                <EmptyState icon={Target} title="Matches konnten nicht geladen werden" hint={error} />
            ) : matches.length === 0 ? (
                <EmptyState
                    icon={Target}
                    title="Noch keine passenden Matches"
                    hint="Das Matching vergleicht Fächer, Klassenstufe und Verfügbarkeit. Sobald passende Anzeigen online sind oder Ihr Kind eine eigene Anzeige hat, erscheinen hier Vorschläge."
                    action={
                        <Button variant="primary" size="sm" className="rounded-xl font-bold" onClick={() => navigate('/create-ad', { state: { childId } })}>
                            <Sparkles size={16} aria-hidden /> Anzeige aufgeben
                        </Button>
                    }
                />
            ) : (
                <>
                    <p className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                        Vorschläge nach Fächern, Klassenstufe und Verfügbarkeit. Der Kontakt läuft anschließend direkt zwischen den Beteiligten.
                    </p>
                    <ul className="space-y-3">
                        {matches.slice(0, 12).map((m) => (
                            <MatchCard key={m.ad.id} match={m} onOpen={() => navigate(`/ad/${m.ad.id}`)} />
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

function MatchCard({ match, onOpen }: { match: Match; onOpen: () => void }) {
    const score = Math.round(match.score);
    const ad = match.ad;
    const ownerName = ad.profiles?.display_name || 'Nutzer:in';

    return (
        <li className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-mono text-lg font-bold tabular-nums leading-none ${
                        score >= 70
                            ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                            : score >= 45
                              ? 'bg-primary/25 text-yellow-800 dark:bg-primary/15 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                >
                    {score}
                    <span className="mt-0.5 text-[9px] font-semibold">%</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${ad.type === 'offer' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                            {ad.type === 'offer' ? 'Bietet Nachhilfe' : 'Sucht Nachhilfe'}
                        </span>
                        <span className="truncate text-xs font-semibold text-gray-500">
                            {ownerName}
                            {ad.profiles?.grade_level ? ` · Stufe ${ad.profiles.grade_level}` : ''}
                        </span>
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                        {ad.short_description || 'Ohne Beschreibung'}
                    </p>

                    {match.commonSubjects.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {match.commonSubjects.slice(0, 4).map((s) => (
                                <SubjectChip key={s} subject={s as never} />
                            ))}
                        </div>
                    )}

                    {match.matchReasons.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                            {match.matchReasons.slice(0, 2).map((reason, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <Sparkles size={11} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                                    {reason}
                                </li>
                            ))}
                        </ul>
                    )}

                    {match.gradeCompatibility && (
                        <p className="mt-1.5 text-[10px] font-semibold text-gray-400">{match.gradeCompatibility}</p>
                    )}
                </div>

                <Button variant="outline" size="sm" className="shrink-0 rounded-xl font-bold" onClick={onOpen}>
                    <ExternalLink size={14} aria-hidden /> Ansehen
                </Button>
            </div>
        </li>
    );
}
