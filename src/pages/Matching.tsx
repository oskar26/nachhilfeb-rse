import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Zap, X, MessageSquare, Frown, 
    CalendarDays, CheckCircle2, ArrowRight, RotateCcw,
    BookOpen, GraduationCap, MapPin, Search, Check 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { TabBar } from '../components/ui/TabBar';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import {
    computeMatches,
    emptyAvailability,
    formatGradeLabel,
    type Availability,
    type Match,
    type MatchAd as Ad
} from '../lib/matching';

const DISMISSED_KEY = 'matchingDismissed_v2';

function getDismissed(): string[] {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'); }
    catch { return []; }
}

function setDismissed(ids: string[]) {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); }
    catch { /* noop */ }
}

// ── Match Card Component ─────────────────────────────────────────

function MatchCard({
    match,
    myAvail,
    onContact,
    onDismiss,
}: {
    match: Match;
    myAvail?: Availability;
    onContact: () => void;
    onDismiss: () => void;
}) {
    const { ad, myAd, score, commonSubjects, availabilityMatches, gradeCompatibility, matchReasons } = match;
    const [showCalendar, setShowCalendar] = useState(false);
    
    // Tier classification
    const isTopMatch = score >= 70;
    const isGoodMatch = score >= 40 && score < 70;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={cn(
                'relative overflow-hidden rounded-3xl border bg-white shadow-soft transition-shadow dark:bg-gray-900',
                isTopMatch
                    ? 'border-primary/70 shadow-glow dark:border-primary/50'
                    : isGoodMatch
                    ? 'border-blue-300 hover:shadow-lg dark:border-blue-800'
                    : 'border-gray-200/80 hover:shadow-lg dark:border-gray-800',
            )}
        >
            {/* Kopf: Typ-Chip + Score */}
            <div className="flex items-center justify-between gap-2 px-5 pt-4">
                <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
                    ad.type === 'offer'
                        ? 'bg-gray-950 text-primary dark:bg-black'
                        : 'bg-blue-700 text-white'
                )}>
                    {ad.type === 'offer' ? (
                        <>
                            <GraduationCap size={13} aria-hidden />
                            <span>Bietet Nachhilfe</span>
                        </>
                    ) : (
                        <>
                            <Search size={13} aria-hidden />
                            <span>Sucht Nachhilfe</span>
                        </>
                    )}
                </span>

                <span className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-black tabular-nums',
                    isTopMatch
                        ? 'bg-primary text-gray-950'
                        : 'bg-gray-950 text-white ring-1 ring-white/10 dark:bg-black'
                )}>
                    <Zap size={13} fill="currentColor" className={isTopMatch ? 'text-gray-950' : 'text-primary'} aria-hidden />
                    <span>{score}% Match</span>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-80">
                        {isTopMatch ? '· Top Match' : isGoodMatch ? '· Guter Match' : '· Passend'}
                    </span>
                </span>
            </div>

            <div className="px-5 pb-5 pt-3">
                {/* User Info Header */}
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl font-display text-xl',
                            isTopMatch ? 'bg-primary text-gray-950' : 'bg-gray-950 text-primary dark:bg-black'
                        )}>
                            {ad.profiles?.avatar_url ? (
                                <img src={ad.profiles.avatar_url} alt="Avatar" className="h-12 w-12 object-cover" />
                            ) : (
                                ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'F'
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="truncate text-base font-extrabold leading-tight text-gray-950 dark:text-white">
                                    {ad.profiles?.display_name ?? 'FWG Schüler/in'}
                                </p>
                                {ad.profiles?.is_verified && (
                                    <VerifiedPill />
                                )}
                            </div>
                            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                <span className="font-mono tabular-nums">{formatGradeLabel(ad.profiles?.grade_level || ad.grade_levels?.[0])}</span>
                                {gradeCompatibility && (
                                    <>
                                        <span aria-hidden>•</span>
                                        <span className="font-semibold text-amber-700 dark:text-primary">{gradeCompatibility}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* My ad connection note if applicable */}
                {myAd && (
                    <div className="mb-3 rounded-2xl border border-dashed border-gray-300 px-3.5 py-2 text-[11px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        Passend zu deiner Anzeige: <span className="font-bold">"{myAd.title || myAd.subjects.join(', ')}"</span>
                    </div>
                )}

                {/* Short Description */}
                <p className="mb-4 text-sm font-medium leading-relaxed text-gray-700 line-clamp-2 dark:text-gray-300">
                    {ad.short_description || ad.long_description || 'Keine nähere Beschreibung angegeben.'}
                </p>

                {/* Analysis Indicators Grid */}
                <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {/* Common / Relevant Subjects */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                        <span className="mb-1.5 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            <BookOpen size={11} aria-hidden /> Fächer
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {commonSubjects.length > 0 ? (
                                commonSubjects.map(s => (
                                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-black capitalize text-gray-950">
                                        <Check size={11} aria-hidden /> {s}
                                    </span>
                                ))
                            ) : (
                                (ad.subjects || []).map(s => (
                                    <span key={s} className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-700 dark:bg-gray-700/60 dark:text-gray-300">
                                        {s}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Why it matches */}
                    <div className="flex flex-col justify-center rounded-2xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                        <span className="mb-1.5 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            <Zap size={11} aria-hidden /> Match-Highlights
                        </span>
                        <div className="space-y-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                            {matchReasons.slice(0, 3).map((reason, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                    <CheckCircle2 size={12} className="shrink-0 text-green-600 dark:text-green-500" aria-hidden />
                                    <span className="truncate">{reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secondary Meta: Locations & Availability */}
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {ad.locations && ad.locations.length > 0 && (
                        <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-semibold dark:bg-gray-800">
                            <MapPin size={11} aria-hidden />
                            <span>{ad.locations.join(', ')}</span>
                        </div>
                    )}
                    {availabilityMatches > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-950 px-3 py-1 font-bold text-white transition-colors hover:bg-gray-800 dark:bg-black dark:hover:bg-gray-900"
                            title="Gemeinsame Freistunden ansehen"
                        >
                            <CalendarDays size={12} className="text-primary" aria-hidden />
                            <span className="font-mono tabular-nums">{availabilityMatches}</span>
                            <span>Freistunden-Match</span>
                            <span className="ml-0.5 text-[10px] text-primary underline">
                                {showCalendar ? 'Kalender einklappen ▲' : 'Zeiten ansehen ▼'}
                            </span>
                        </button>
                    )}
                </div>

                {/* Inline Availability Calendar comparison */}
                {showCalendar && (
                    <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                                <CalendarDays size={12} className="text-green-600" aria-hidden /> Gemeinsame Zeiten (grün markiert):
                            </span>
                            <span className="font-mono text-[10px] font-black tabular-nums text-green-700 dark:text-green-400">{availabilityMatches} Treffer</span>
                        </div>
                        <AvailabilityCalendar
                            availability={ad.profiles?.availability || emptyAvailability()}
                            matchWith={myAvail}
                            compact
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="mt-1 flex gap-2.5 border-t border-dashed border-gray-200 pt-3 dark:border-gray-800/80">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            triggerHaptic('light');
                            onDismiss();
                        }}
                        className="flex min-h-[44px] cursor-pointer select-none items-center justify-center gap-1.5 rounded-full border border-gray-200 px-4 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                        <X size={14} /> Ausblenden
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                            triggerHaptic('success');
                            onContact();
                        }}
                        className="flex min-h-[44px] flex-1 cursor-pointer select-none items-center justify-center gap-2 rounded-full bg-primary px-4 text-xs font-black text-gray-950 shadow-soft transition-colors hover:bg-primary-hover"
                    >
                        <MessageSquare size={14} /> Anzeige öffnen & Anfragen <ArrowRight size={14} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Page Component ───────────────────────────────────────────────

type FilterMode = 'all' | 'seeking' | 'offering';

export default function Matching() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [userAds, setUserAds] = useState<Ad[]>([]);
    const [candidateAds, setCandidateAds] = useState<Ad[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissed);
    const [myProfile, setMyProfile] = useState<any>(null);
    const [filterMode, setFilterMode] = useState<FilterMode>('all');

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch user profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            if (profileData) setMyProfile(profileData);

            // 2. Fetch my active ads
            const { data: myAds } = await supabase
                .from('ads')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_active', true);

            setUserAds((myAds ?? []) as Ad[]);

            // 3. Fetch candidate ads (active ads from all other students)
            const { data: candidates, error: candidatesError } = await api.ads.list({ match_context: true, all: true });

            if (candidatesError) throw candidatesError;

            // Extra security: filter out any candidate ads created by the current user
            const filteredCandidates = ((candidates ?? []) as any[]).filter(c => c.user_id !== user?.id && c.is_active !== false);
            setCandidateAds(filteredCandidates);
        } catch (e) {
            console.error('[Matching] fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Smart Multi-Factor Matching Algorithm (Starting at 20%) ──
    // Scoring steckt in src/lib/matching.ts und wird auch vom Eltern-Dashboard genutzt.
    const allMatches = useMemo<Match[]>(() => computeMatches({
        myAds: userAds,
        candidateAds,
        profile: myProfile,
        userId: user?.id,
        dismissedIds
    }), [userAds, candidateAds, dismissedIds, myProfile, user?.id]);

    // Filter by mode
    const filteredMatches = useMemo(() => {
        if (filterMode === 'all') return allMatches;
        if (filterMode === 'seeking') {
            // User is seeking tutoring -> show candidate offers
            return allMatches.filter(m => m.ad.type === 'offer');
        }
        if (filterMode === 'offering') {
            // User offers tutoring -> show candidate searches
            return allMatches.filter(m => m.ad.type === 'search');
        }
        return allMatches;
    }, [allMatches, filterMode]);

    const handleDismiss = (id: string) => {
        const next = [...dismissedIds, id];
        setDismissedIds(next);
        setDismissed(next);
    };

    const handleResetDismissed = () => {
        triggerHaptic('success');
        setDismissedIds([]);
        setDismissed([]);
    };

    return (
        <div className="space-y-5">
            {/* Filter – eine Leiste statt zwei gestapelter Bars (B5) */}
            <TabBar
                ariaLabel="Match-Filter"
                items={[
                    { key: 'all', label: 'Alle', count: allMatches.length },
                    { key: 'seeking', label: 'Ich suche', icon: GraduationCap },
                    { key: 'offering', label: 'Ich biete', icon: Search }
                ]}
                value={filterMode}
                onChange={setFilterMode}
            />

            {dismissedIds.length > 0 && (
                <button
                    onClick={handleResetDismissed}
                    className="mx-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-3 py-1.5 font-mono text-[11px] font-bold tabular-nums text-gray-500 transition-colors hover:border-primary hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
                    title="Ausgeblendete Matches zurücksetzen"
                >
                    <RotateCcw size={12} />
                    <span>{dismissedIds.length} ausgeblendete wiederherstellen</span>
                </button>
            )}

            {/* Loading */}
            {loading && (
                <div className="space-y-4" role="status" aria-label="Matches werden berechnet">
                    <p className="text-center font-mono text-[11px] font-bold uppercase tracking-wider text-gray-400">Matches werden berechnet…</p>
                    <MatchSkeleton />
                    <MatchSkeleton />
                </div>
            )}

            {/* User has no ads tip banner */}
            {!loading && userAds.length === 0 && (
                <div className="relative overflow-hidden rounded-3xl border border-gray-950/10 bg-primary p-5 text-gray-950 shadow-soft">
                    <span className="poster-grain-dark pointer-events-none absolute inset-0" aria-hidden />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="flex items-center gap-1.5 font-display text-sm uppercase tracking-tight">
                                <Sparkles size={14} aria-hidden /> Tipp für noch bessere Treffer
                            </p>
                            <p className="max-w-lg text-xs font-medium text-gray-950/80">
                                Wir zeigen dir Matches anhand deines Profils. Erstelle eine kostenlose Anzeige, um bis zu 100% präzise Vorschläge zu erhalten!
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/create-ad')}
                            className="shrink-0 cursor-pointer rounded-full bg-gray-950 px-4 py-2.5 text-center text-xs font-black text-primary transition-colors hover:bg-gray-800"
                        >
                            Anzeige schalten
                        </button>
                    </div>
                </div>
            )}

            {/* No Matches Found */}
            {!loading && filteredMatches.length === 0 && (
                <div className="relative overflow-hidden rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-12 text-center shadow-soft dark:border-gray-700 dark:bg-gray-900/70 sm:py-14">
                    <span className="stamp-ring mx-auto grid h-16 w-16 -rotate-6 place-items-center rounded-full text-gray-400 dark:text-gray-500" aria-hidden>
                        <Frown size={26} />
                    </span>
                    <span className="mt-5 inline-block -rotate-3 rounded-lg border-2 border-dashed border-gray-300 px-3 py-1 font-display text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:border-gray-700 dark:text-gray-500">
                        Leer
                    </span>
                    <h3 className="mt-4 font-display text-xl uppercase tracking-tight text-gray-950 dark:text-gray-50">
                        Keine Matches in dieser Kategorie
                    </h3>
                    <span className="mx-auto mt-3 block h-1 w-10 rounded-full bg-primary" aria-hidden />
                    <p className="mx-auto mt-3 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                        {dismissedIds.length > 0 
                            ? 'Du hast möglicherweise relevante Matches ausgeblendet.'
                            : 'Aktuell gibt es keine passenden Anzeigen mit einer Übereinstimmung ab 20%.'}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {dismissedIds.length > 0 && (
                            <button
                                onClick={handleResetDismissed}
                                className="rounded-full border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Ausgeblendete anzeigen
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/')}
                            className="rounded-full bg-primary px-5 py-2.5 text-xs font-black text-gray-950 transition-colors hover:bg-primary-hover"
                        >
                            Alle Anzeigen im Feed ansehen
                        </button>
                    </div>
                </div>
            )}

            {/* Match Count Summary */}
            {!loading && filteredMatches.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <Zap size={14} className="text-amber-600 dark:text-primary" aria-hidden />
                        <span><span className="tabular-nums">{filteredMatches.length}</span> Vorschläge ab 20% Übereinstimmung</span>
                    </div>
                    <span className="hidden font-mono text-[10px] uppercase tracking-wider text-gray-400 sm:inline">
                        Sortiert nach Relevanz
                    </span>
                </div>
            )}

            {/* Matches List */}
            {!loading && filteredMatches.length > 0 && (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredMatches.map(m => (
                            <MatchCard
                                key={m.ad.id}
                                match={m}
                                myAvail={myProfile?.availability || emptyAvailability()}
                                onContact={() => navigate(`/ad/${m.ad.id}`)}
                                onDismiss={() => handleDismiss(m.ad.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

/** Skelett in Kartuschen-Form für die Match-Liste. */
function MatchSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200/80 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
                <div className="h-6 w-32 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-6 w-28 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="h-4 w-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex gap-2.5">
                <div className="h-11 w-28 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}
