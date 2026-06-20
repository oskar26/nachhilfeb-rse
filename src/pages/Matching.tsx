import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, X, MessageCircle, PlusCircle, Frown, Loader2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

// ── Types ────────────────────────────────────────────────────────

interface Ad {
    id: string;
    user_id: string;
    type: 'offer' | 'request';
    subjects: string[];
    title: string;
    description: string;
    grade?: string;
    price_per_hour?: number;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url?: string;
    };
}

interface Match {
    ad: Ad;
    score: number; // 0–100
    commonSubjects: string[];
}

// ── Helpers ──────────────────────────────────────────────────────

const DISMISSED_KEY = 'matchingDismissed';

function getDismissed(): string[] {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'); }
    catch { return []; }
}

function setDismissed(ids: string[]) {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); }
    catch { /* noop */ }
}

function computeScore(userSubjects: string[], adSubjects: string[]): number {
    const common = userSubjects.filter(s => adSubjects.includes(s));
    if (!common.length) return 0;
    const total = new Set([...userSubjects, ...adSubjects]).size;
    return Math.round((common.length / total) * 100);
}

function subjectColor(subject: string) {
    const colors = [
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// ── Match Card ───────────────────────────────────────────────────

function MatchCard({
    match,
    onContact,
    onDismiss,
}: {
    match: Match;
    onContact: () => void;
    onDismiss: () => void;
}) {
    const { ad, score, commonSubjects } = match;
    const isHighMatch = score >= 80;
    const isMediumMatch = score >= 50 && score < 80;

    return (
        <div
            className={cn(
                'relative rounded-3xl overflow-hidden bg-white dark:bg-gray-900',
                'shadow-sm ring-1',
                isHighMatch
                    ? 'ring-0 shadow-lg shadow-primary/20'
                    : 'ring-gray-200/80 dark:ring-gray-800',
            )}
        >
            {/* Gradient border for high-match cards */}
            {isHighMatch && (
                <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-br from-primary via-purple-500 to-pink-500 -z-0 pointer-events-none">
                    <div className="w-full h-full rounded-[calc(1.5rem-2px)] bg-white dark:bg-gray-900" />
                </div>
            )}

            <div className="relative p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {ad.profiles?.full_name?.[0]?.toUpperCase() ?? 'N'}
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                                {ad.profiles?.full_name ?? 'Anonym'}
                            </p>
                            <p className="text-xs text-gray-400">
                                {ad.type === 'offer' ? 'Bietet Nachhilfe an' : 'Sucht Nachhilfe'}
                            </p>
                        </div>
                    </div>

                    {/* Score badge */}
                    <div className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0',
                        isHighMatch  ? 'bg-primary text-white shadow-md shadow-primary/30' :
                        isMediumMatch ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}>
                        <Zap size={11} />
                        {score}% Match
                    </div>
                </div>

                {/* Title */}
                <p className="font-semibold text-base text-gray-900 dark:text-white mb-1 line-clamp-1">
                    {ad.title}
                </p>

                {/* Description */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                    {ad.description}
                </p>

                {/* Common subjects */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {ad.subjects.map(s => (
                        <span
                            key={s}
                            className={cn(
                                'px-2.5 py-1 rounded-full text-[11px] font-medium',
                                commonSubjects.includes(s)
                                    ? 'ring-1 ring-primary/30 ' + subjectColor(s)
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            )}
                        >
                            {commonSubjects.includes(s) && <span className="mr-1">✓</span>}
                            {s}
                        </span>
                    ))}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    {ad.grade && <span>Klasse {ad.grade}</span>}
                    {ad.price_per_hour != null && (
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                            {ad.price_per_hour === 0 ? 'Kostenlos' : `${ad.price_per_hour} €/Std`}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onDismiss}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={13} /> Ablehnen
                    </button>
                    <button
                        onClick={onContact}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                    >
                        <MessageCircle size={13} /> Kontaktieren
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────

export default function Matching() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [userAds, setUserAds] = useState<Ad[]>([]);
    const [candidateAds, setCandidateAds] = useState<Ad[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissed);

    useEffect(() => {
        if (!user) return;
        (async () => {
            setLoading(true);
            try {
                // Fetch user's own ads
                const { data: myAds } = await supabase
                    .from('ads')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'active');

                const ads = (myAds ?? []) as Ad[];
                setUserAds(ads);

                if (!ads.length) { setLoading(false); return; }

                // Collect all subjects the user has across all ads
                const userSubjects = [...new Set(ads.flatMap(a => a.subjects ?? []))];
                // Find opposite type ads with overlapping subjects
                const userTypes = [...new Set(ads.map(a => a.type))];
                // We want ads of the opposite type(s)
                const oppositeTypes = userTypes.includes('offer') && userTypes.includes('request')
                    ? ['offer', 'request']
                    : userTypes.includes('offer') ? ['request'] : ['offer'];

                const { data: candidates } = await supabase
                    .from('ads')
                    .select('*, profiles(full_name, avatar_url)')
                    .neq('user_id', user.id)
                    .in('type', oppositeTypes)
                    .eq('status', 'active')
                    .contains('subjects', userSubjects.slice(0, 1)); // at least 1 common

                setCandidateAds((candidates ?? []) as Ad[]);
            } catch (e) {
                console.error('[Matching] error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    // Compute matches with scores, deduplicated & sorted
    const matches = useMemo<Match[]>(() => {
        if (!userAds.length || !candidateAds.length) return [];

        const allUserSubjects = [...new Set(userAds.flatMap(a => a.subjects ?? []))];

        return candidateAds
            .filter(ad => !dismissedIds.includes(ad.id))
            .map(ad => {
                const adSubjects = ad.subjects ?? [];
                const common = allUserSubjects.filter(s => adSubjects.includes(s));
                const score = computeScore(allUserSubjects, adSubjects);
                return { ad, score, commonSubjects: common };
            })
            .filter(m => m.score > 0)
            .sort((a, b) => b.score - a.score);
    }, [userAds, candidateAds, dismissedIds]);

    const handleDismiss = (id: string) => {
        const next = [...dismissedIds, id];
        setDismissedIds(next);
        setDismissed(next);
    };

    // ── Render ─────────────────────────────────────────────────────

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-10">
            {/* Page header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={22} className="text-primary" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deine Matches</h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Wir haben passende Anzeigen für dich gefunden
                </p>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <p className="text-sm text-gray-400">Matches werden berechnet…</p>
                </div>
            )}

            {/* No ads → CTA */}
            {!loading && !userAds.length && (
                <div className="flex flex-col items-center text-center py-20 gap-5 px-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <Users size={36} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                            Erstelle zuerst eine Anzeige
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                            Um Matches zu sehen, benötigst du eine aktive Anzeige. Wir finden dann passende Gegenparts für dich.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/create-ad')}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-semibold text-sm hover:opacity-90 shadow-md shadow-primary/30 transition-all"
                    >
                        <PlusCircle size={16} /> Anzeige erstellen
                    </button>
                </div>
            )}

            {/* No matches (but has ads) */}
            {!loading && userAds.length > 0 && !matches.length && (
                <div className="flex flex-col items-center text-center py-20 gap-5 px-6">
                    <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Frown size={36} className="text-gray-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                            Noch keine Matches
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                            Momentan gibt es keine passenden Anzeigen. Schau später nochmal vorbei!
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Alle Anzeigen ansehen
                    </button>
                </div>
            )}

            {/* Match stats banner */}
            {!loading && matches.length > 0 && (
                <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-primary/5 dark:bg-primary/10 rounded-2xl">
                    <Zap size={16} className="text-primary flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong className="text-primary">{matches.length}</strong>{' '}
                        {matches.length === 1 ? 'Match gefunden' : 'Matches gefunden'} –
                        sortiert nach Übereinstimmung
                    </p>
                </div>
            )}

            {/* Match cards */}
            {!loading && matches.length > 0 && (
                <div className="flex flex-col gap-4">
                    {matches.map(m => (
                        <MatchCard
                            key={m.ad.id}
                            match={m}
                            onContact={() => navigate(`/ad/${m.ad.id}`)}
                            onDismiss={() => handleDismiss(m.ad.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
