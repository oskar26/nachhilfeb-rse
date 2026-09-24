import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Zap, X, MessageSquare, Frown, Loader2, 
    CalendarDays, CheckCircle2, ArrowRight, RotateCcw,
    BookOpen, GraduationCap, MapPin, Search, Check 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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
                'relative rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border transition-all shadow-sm',
                isTopMatch
                    ? 'border-amber-400/50 dark:border-amber-500/40 shadow-amber-500/10'
                    : isGoodMatch
                    ? 'border-blue-300 dark:border-blue-800 shadow-blue-500/5'
                    : 'border-gray-200/80 dark:border-gray-800',
            )}
        >
            {/* Top Ribbon */}
            <div className="flex items-center justify-between px-5 pt-3.5 pb-1">
                <span className={cn(
                    'text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1.5',
                    ad.type === 'offer' 
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300' 
                        : 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                )}>
                    {ad.type === 'offer' ? (
                        <>
                            <GraduationCap size={13} className="text-amber-700 dark:text-amber-300" />
                            <span>Bietet Nachhilfe</span>
                        </>
                    ) : (
                        <>
                            <Search size={13} className="text-blue-700 dark:text-blue-300" />
                            <span>Sucht Nachhilfe</span>
                        </>
                    )}
                </span>

                <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shrink-0 border',
                    isTopMatch
                        ? 'bg-primary/20 text-amber-950 dark:text-primary border-primary/40 shadow-xs'
                        : isGoodMatch
                        ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-400/30'
                        : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                )}>
                    <Zap size={13} fill="currentColor" />
                    <span>{score}% Match</span>
                    <span className="text-[10px] font-normal opacity-80">
                        {isTopMatch ? '· Top Match' : isGoodMatch ? '· Guter Match' : '· Passend'}
                    </span>
                </div>
            </div>

            <div className="p-5 pt-2">
                {/* User Info Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-hover font-black text-xl shrink-0 overflow-hidden shadow-xs">
                            {ad.profiles?.avatar_url ? (
                                <img src={ad.profiles.avatar_url} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover" />
                            ) : (
                                ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'F'
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">
                                    {ad.profiles?.display_name ?? 'FWG Schüler/in'}
                                </p>
                                {ad.profiles?.is_verified && (
                                    <VerifiedPill />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium flex items-center gap-1.5">
                                <span>{formatGradeLabel(ad.profiles?.grade_level || ad.grade_levels?.[0])}</span>
                                {gradeCompatibility && (
                                    <>
                                        <span>•</span>
                                        <span className="text-primary-hover dark:text-primary font-semibold">{gradeCompatibility}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* My ad connection note if applicable */}
                {myAd && (
                    <div className="mb-3 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
                        Passend zu deiner Anzeige: <span className="font-bold">"{myAd.title || myAd.subjects.join(', ')}"</span>
                    </div>
                )}

                {/* Short Description */}
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium leading-relaxed line-clamp-2">
                    {ad.short_description || ad.long_description || 'Keine nähere Beschreibung angegeben.'}
                </p>

                {/* Analysis Indicators Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                    {/* Common / Relevant Subjects */}
                    <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-2.5 rounded-2xl">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <BookOpen size={11} /> Fächer
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {commonSubjects.length > 0 ? (
                                commonSubjects.map(s => (
                                    <span key={s} className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-primary/20 text-amber-950 dark:text-primary capitalize inline-flex items-center gap-1">
                                        <Check size={11} /> {s}
                                    </span>
                                ))
                            ) : (
                                (ad.subjects || []).map(s => (
                                    <span key={s} className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-gray-200/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 capitalize">
                                        {s}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Why it matches */}
                    <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-2.5 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <Zap size={11} /> Match-Highlights
                        </span>
                        <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            {matchReasons.slice(0, 3).map((reason, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                    <span className="truncate">{reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secondary Meta: Locations & Availability */}
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-gray-500 dark:text-gray-400">
                    {ad.locations && ad.locations.length > 0 && (
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                            <MapPin size={11} />
                            <span>{ad.locations.join(', ')}</span>
                        </div>
                    )}
                    {availabilityMatches > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800/60 shadow-2xs"
                            title="Gemeinsame Freistunden ansehen"
                        >
                            <CalendarDays size={12} className="text-emerald-600" />
                            <span>{availabilityMatches} Freistunden-Match</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 underline ml-0.5">
                                {showCalendar ? 'Kalender einklappen ▲' : 'Zeiten ansehen ▼'}
                            </span>
                        </button>
                    )}
                </div>

                {/* Inline Availability Calendar comparison */}
                {showCalendar && (
                    <div className="mb-4 p-3 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <CalendarDays size={12} className="text-emerald-500" /> Gemeinsame Zeiten (grün markiert):
                            </span>
                            <span className="text-[10px] text-emerald-600 font-extrabold">{availabilityMatches} Treffer</span>
                        </div>
                        <AvailabilityCalendar
                            availability={ad.profiles?.availability || emptyAvailability()}
                            matchWith={myAvail}
                            compact
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 border-t dark:border-gray-800/80 pt-3 mt-1">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            triggerHaptic('light');
                            onDismiss();
                        }}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer select-none"
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
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer select-none"
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
            const { data: candidates, error: candidatesError } = await supabase
                .from('ads')
                .select('*, profiles(id, display_name, avatar_url, grade_level, availability, is_verified)')
                .neq('user_id', user?.id)
                .eq('is_active', true);

            if (candidatesError) throw candidatesError;

            // Extra security: filter out any candidate ads created by the current user
            const filteredCandidates = ((candidates ?? []) as any[]).filter(c => c.user_id !== user?.id);
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
        <div className="space-y-6">
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
                    className="mx-auto flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-primary px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Ausgeblendete Matches zurücksetzen"
                >
                    <RotateCcw size={12} />
                    <span>{dismissedIds.length} ausgeblendete wiederherstellen</span>
                </button>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Matches werden berechnet...</p>
                </div>
            )}

            {/* User has no ads tip banner */}
            {!loading && userAds.length === 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                        <p className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <Sparkles size={14} /> Tipp für noch bessere Treffer
                        </p>
                        <p className="text-amber-800/80 dark:text-amber-400/80">
                            Wir zeigen dir Matches anhand deines Profils. Erstelle eine kostenlose Anzeige, um bis zu 100% präzise Vorschläge zu erhalten!
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/create-ad')}
                        className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-full shrink-0 shadow-xs transition-all cursor-pointer text-center"
                    >
                        Anzeige schalten
                    </button>
                </div>
            )}

            {/* No Matches Found */}
            {!loading && filteredMatches.length === 0 && (
                <div className="flex flex-col items-center text-center py-16 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                    <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                        <Frown size={32} />
                    </div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white mb-2">
                        Keine Matches in dieser Kategorie
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                        {dismissedIds.length > 0 
                            ? 'Du hast möglicherweise relevante Matches ausgeblendet.'
                            : 'Aktuell gibt es keine passenden Anzeigen mit einer Übereinstimmung ab 20%.'}
                    </p>
                    <div className="flex gap-2">
                        {dismissedIds.length > 0 && (
                            <button
                                onClick={handleResetDismissed}
                                className="px-4 py-2 border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                Ausgeblendete anzeigen
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold transition-all"
                        >
                            Alle Anzeigen im Feed ansehen
                        </button>
                    </div>
                </div>
            )}

            {/* Match Count Summary */}
            {!loading && filteredMatches.length > 0 && (
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                        <Zap size={14} className="text-primary" />
                        <span>{filteredMatches.length} Vorschläge ab 20% Übereinstimmung</span>
                    </div>
                    <span className="text-[11px] text-gray-400">
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
