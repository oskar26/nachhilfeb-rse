import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, X, MessageSquare, PlusCircle, Frown, Loader2, Users, CalendarDays, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { emptyAvailability, countMatches, type Availability } from '../components/AvailabilityCalendar';

// ── Types ────────────────────────────────────────────────────────

interface Ad {
    id: string;
    user_id: string;
    type: 'offer' | 'search';
    title?: string | null;
    subjects: string[];
    grade_levels: string[];
    locations: string[];
    price_details: any;
    short_description: string | null;
    long_description: string | null;
    is_active: boolean;
    created_at: string;
    profiles?: {
        display_name: string | null;
        avatar_url: string | null;
        grade_level: string | null;
        availability?: Availability;
    };
}

interface Match {
    ad: Ad;
    myAd: Ad;
    score: number; // 0–100
    commonSubjects: string[];
    availabilityMatches: number;
    gradeMatch: boolean;
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

function subjectColor(subject: string) {
    const colors = [
        'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-100 dark:border-blue-800/40',
        'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-100 dark:border-green-800/40',
        'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-100 dark:border-purple-800/40',
        'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-orange-100 dark:border-orange-800/40',
        'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 border-pink-100 dark:border-pink-800/40',
        'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border-teal-100 dark:border-teal-800/40',
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
    const { ad, myAd, score, commonSubjects, availabilityMatches, gradeMatch } = match;
    const isHighMatch = score >= 75;

    return (
        <div
            className={cn(
                'relative rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border transition-all hover:shadow-md duration-300',
                isHighMatch
                    ? 'border-primary/40 shadow-sm shadow-primary/10 dark:border-primary/30'
                    : 'border-gray-200 dark:border-gray-800',
            )}
        >
            {isHighMatch && (
                <div className="absolute top-0 right-0 bg-primary/20 text-primary-hover dark:text-primary text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-2xl tracking-wider">
                    Beste Empfehlung ✨
                </div>
            )}

            <div className="p-6">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/35 to-amber-500/20 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                            {ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'N'}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">
                                    {ad.profiles?.display_name ?? 'Anonym'}
                                </p>
                                <span className={cn(
                                    'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                                    ad.type === 'offer' ? 'bg-primary/15 text-primary-hover' : 'bg-secondary/15 text-secondary'
                                )}>
                                    {ad.type === 'offer' ? 'Biete' : 'Suche'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Für deine Anzeige: <span className="font-semibold text-gray-500 dark:text-gray-300">"{myAd.title || myAd.subjects.join(', ')}"</span>
                            </p>
                        </div>
                    </div>

                    {/* Match Score Badge */}
                    <div className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black flex-shrink-0 border',
                        isHighMatch 
                            ? 'bg-primary/20 text-primary-hover border-primary/20 shadow-inner' 
                            : 'bg-gray-50 border-gray-150 text-gray-500 dark:bg-gray-850 dark:border-gray-800'
                    )}>
                        <Zap size={12} fill="currentColor" />
                        {score}% Match
                    </div>
                </div>

                {/* Short Description */}
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium leading-relaxed">
                    {ad.short_description || 'Keine Beschreibung vorhanden.'}
                </p>

                {/* Analysis Indicators Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Common Subjects */}
                    <div className="bg-gray-50/50 dark:bg-gray-850/50 border dark:border-gray-800 p-3 rounded-2xl">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Gemeinsame Fächer</span>
                        <div className="flex flex-wrap gap-1">
                            {commonSubjects.map(s => (
                                <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary-hover">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Extra indicators */}
                    <div className="bg-gray-50/50 dark:bg-gray-850/50 border dark:border-gray-800 p-3 rounded-2xl flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Übereinstimmung</span>
                            <div className="flex flex-col gap-1 mt-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                {gradeMatch ? (
                                    <span className="text-green-650 dark:text-green-450 flex items-center gap-1"><Award size={12} /> Stufe passt</span>
                                ) : (
                                    <span className="text-gray-400 flex items-center gap-1"><Award size={12} /> Stufe abweichend</span>
                                )}
                                {availabilityMatches > 0 ? (
                                    <span className="text-green-650 dark:text-green-450 flex items-center gap-1"><CalendarDays size={12} /> {availabilityMatches} freie Zeiten</span>
                                ) : (
                                    <span className="text-amber-600 dark:text-amber-450 flex items-center gap-1"><CalendarDays size={12} /> Keine Zeiten-Übereinstimmung</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Other subjects */}
                {ad.subjects.some(s => !commonSubjects.includes(s)) && (
                    <div className="mb-4">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Weitere Fächer des Nutzers</span>
                        <div className="flex flex-wrap gap-1">
                            {ad.subjects.filter(s => !commonSubjects.includes(s)).map(s => (
                                <span key={s} className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-semibold border', subjectColor(s))}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 border-t dark:border-gray-800 pt-4 mt-2">
                    <button
                        onClick={onDismiss}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={14} /> Ausblenden
                    </button>
                    <button
                        onClick={onContact}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/95 text-black rounded-2xl text-xs font-black transition-all shadow-sm active:scale-[0.98]"
                    >
                        <MessageSquare size={14} /> Anzeige ansehen & kontaktieren
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
    const [myAvailability, setMyAvailability] = useState<Availability>(emptyAvailability());

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch my profile's calendar first
            const { data: profileData } = await supabase
                .from('profiles')
                .select('availability')
                .eq('id', user?.id)
                .single();
            if (profileData?.availability) {
                setMyAvailability(profileData.availability);
            }

            // Fetch my active ads
            const { data: myAds, error: myAdsError } = await supabase
                .from('ads')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_active', true);

            if (myAdsError) throw myAdsError;

            const ads = (myAds ?? []) as Ad[];
            setUserAds(ads);

            if (!ads.length) {
                setLoading(false);
                return;
            }

            // Gather all user's active ad subject names
            const userSubjects = [...new Set(ads.flatMap(a => a.subjects ?? []))];
            const userTypes = [...new Set(ads.map(a => a.type))];

            // Opposite types logic: search matches offer, offer matches search
            const oppositeTypes = userTypes.includes('offer') && userTypes.includes('search')
                ? ['offer', 'search']
                : userTypes.includes('offer') ? ['search'] : ['offer'];

            // Fetch candidate ads of opposite type
            const { data: candidates, error: candidatesError } = await supabase
                .from('ads')
                .select('*, profiles(display_name, avatar_url, grade_level, availability)')
                .neq('user_id', user?.id)
                .in('type', oppositeTypes)
                .eq('is_active', true);

            if (candidatesError) throw candidatesError;

            setCandidateAds((candidates ?? []) as any[]);
        } catch (e) {
            console.error('[Matching] error:', e);
        } finally {
            setLoading(false);
        }
    };

    // Advanced score matching algorithm
    const matches = useMemo<Match[]>(() => {
        if (!userAds.length || !candidateAds.length) return [];

        const list: Match[] = [];

        userAds.forEach(myAd => {
            candidateAds.forEach(candAd => {
                // Check if already dismissed
                if (dismissedIds.includes(candAd.id)) return;

                // Validate opposing types
                if (myAd.type === candAd.type) return;

                // 1. Calculate common subjects
                const common = myAd.subjects.filter(s => candAd.subjects.includes(s));
                if (common.length === 0) return; // Must have at least 1 common subject

                // 2. Grade level compatibility checking
                // If I offer tutoring for grades ['5', '6', '7'] and they search for grade '6', it's a match!
                // If I search tutoring for grade '8' and they offer tutoring for grades ['8', '9'], it's a match!
                const gradeMatch = myAd.grade_levels.some(g => candAd.grade_levels.includes(g)) ||
                                   (myAd.profiles?.grade_level && candAd.grade_levels.includes(myAd.profiles.grade_level)) ||
                                   (candAd.profiles?.grade_level && myAd.grade_levels.includes(candAd.profiles.grade_level));

                // 3. Availability time overlaps
                const availMatches = countMatches(myAvailability, candAd.profiles?.availability || emptyAvailability());

                // 4. Calculate weighted score (0 - 100)
                // - Subject Match: up to 50 pts
                // - Grade Level Match: 25 pts
                // - Availability Match: up to 25 pts (5 pts per overlap slot, max 25)
                const subjectScore = Math.min(50, Math.round((common.length / Math.max(1, myAd.subjects.length)) * 50));
                const gradeScore = gradeMatch ? 25 : 5;
                const availabilityScore = Math.min(25, availMatches * 5);

                const finalScore = Math.min(100, subjectScore + gradeScore + availabilityScore);

                list.push({
                    ad: candAd,
                    myAd: myAd,
                    score: finalScore,
                    commonSubjects: common,
                    availabilityMatches: availMatches,
                    gradeMatch: !!gradeMatch
                });
            });
        });

        // Deduplicate matches by candidate ad ID (keeping the highest score if multiple ads match)
        const uniqueMatches: Record<string, Match> = {};
        list.forEach(m => {
            if (!uniqueMatches[m.ad.id] || uniqueMatches[m.ad.id].score < m.score) {
                uniqueMatches[m.ad.id] = m;
            }
        });

        return Object.values(uniqueMatches).sort((a, b) => b.score - a.score);
    }, [userAds, candidateAds, dismissedIds, myAvailability]);

    const handleDismiss = (id: string) => {
        const next = [...dismissedIds, id];
        setDismissedIds(next);
        setDismissed(next);
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
            {/* Page Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={24} className="text-primary-hover" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deine Matches</h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Wir vergleichen deine Anzeigen automatisch mit passenden Nachhilfeangeboten und -gesuchen anderer Schüler.
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <p className="text-sm text-gray-400">Matches werden berechnet...</p>
                </div>
            )}

            {/* No Ads created */}
            {!loading && userAds.length === 0 && (
                <div className="flex flex-col items-center text-center py-16 bg-white dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800 p-8 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary-hover mb-4">
                        <Users size={32} />
                    </div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white mb-2">
                        Erstelle zuerst eine Anzeige
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                        Damit wir passende Partner für dich finden können, erstelle bitte ein Nachhilfeangebot oder ein Gesuch mit deinen Fächern und Zeiten.
                    </p>
                    <button
                        onClick={() => navigate('/create-ad')}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/95 text-black font-extrabold rounded-2xl text-sm shadow-md transition-all active:scale-[0.98]"
                    >
                        <PlusCircle size={16} /> Anzeige erstellen
                    </button>
                </div>
            )}

            {/* Has Ads but no Matches */}
            {!loading && userAds.length > 0 && matches.length === 0 && (
                <div className="flex flex-col items-center text-center py-16 bg-white dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800 p-8 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                        <Frown size={32} />
                    </div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white mb-2">
                        Aktuell keine neuen Matches
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                        Es gibt zurzeit leider keine anderen Anzeigen, die zu deinen angebotenen oder gesuchten Fächern passen.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-5 py-2.5 border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                    >
                        Feed durchstöbern
                    </button>
                </div>
            )}

            {/* Matches stats */}
            {!loading && matches.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary-hover dark:text-primary rounded-2xl text-xs font-bold w-fit">
                    <Zap size={14} fill="currentColor" />
                    <span>{matches.length} passende Gegenparts gefunden!</span>
                </div>
            )}

            {/* Matches list */}
            {!loading && matches.length > 0 && (
                <div className="grid gap-5">
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
