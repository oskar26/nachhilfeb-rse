import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, X, MessageSquare, PlusCircle, Frown, Loader2, Users, CalendarDays, Award, CheckCircle2, ArrowRight } from 'lucide-react';
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
        id?: string;
        display_name: string | null;
        avatar_url: string | null;
        grade_level: string | null;
        availability?: Availability;
        is_verified?: boolean;
    };
}

interface Match {
    ad: Ad;
    myAd?: Ad;
    score: number; // 0–100
    commonSubjects: string[];
    availabilityMatches: number;
    gradeCompatibility: string;
    matchReasons: string[];
}

// ── Subject Normalization & Aliases ──────────────────────────────

const SUBJECT_ALIASES: Record<string, string> = {
    'mathe': 'mathematik',
    'mathematik': 'mathematik',
    'm': 'mathematik',
    'englisch': 'englisch',
    'english': 'englisch',
    'eng': 'englisch',
    'e': 'englisch',
    'deutsch': 'deutsch',
    'deu': 'deutsch',
    'd': 'deutsch',
    'französisch': 'französisch',
    'franz': 'französisch',
    'french': 'französisch',
    'f': 'französisch',
    'latein': 'latein',
    'lat': 'latein',
    'l': 'latein',
    'physik': 'physik',
    'phy': 'physik',
    'chemie': 'chemie',
    'chem': 'chemie',
    'biologie': 'biologie',
    'bio': 'biologie',
    'informatik': 'informatik',
    'info': 'informatik',
    'inf': 'informatik',
    'geschichte': 'geschichte',
    'gesch': 'geschichte',
    'erdkunde': 'geographie',
    'geo': 'geographie',
    'geographie': 'geographie',
    'politik': 'politik',
    'sowi': 'politik',
    'sozialwissenschaften': 'politik'
};

function normalizeSubject(s: string): string {
    const clean = s.trim().toLowerCase();
    return SUBJECT_ALIASES[clean] || clean;
}

function findCommonSubjects(arr1: string[], arr2: string[]): string[] {
    const norm1 = arr1.map(normalizeSubject);
    const result: string[] = [];

    arr2.forEach((s) => {
        const norm2 = normalizeSubject(s);
        if (norm1.includes(norm2) && !result.includes(s)) {
            result.push(s);
        }
    });

    return result;
}

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
        'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-100 dark:border-amber-800/40',
        'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 border-pink-100 dark:border-pink-800/40',
        'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border-teal-100 dark:border-teal-800/40',
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// ── Match Card Component ─────────────────────────────────────────

function MatchCard({
    match,
    onContact,
    onDismiss,
}: {
    match: Match;
    onContact: () => void;
    onDismiss: () => void;
}) {
    const { ad, myAd, score, commonSubjects, availabilityMatches, gradeCompatibility, matchReasons } = match;
    const isHighMatch = score >= 70;

    return (
        <div
            className={cn(
                'relative rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border transition-all hover:shadow-md duration-300',
                isHighMatch
                    ? 'border-primary/50 shadow-sm shadow-primary/10 dark:border-primary/30'
                    : 'border-gray-200 dark:border-gray-800',
            )}
        >
            {isHighMatch && (
                <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-black uppercase px-3 py-1 rounded-bl-2xl tracking-wider shadow-sm">
                    ✨ Top Empfehlung ({score}%)
                </div>
            )}

            <div className="p-6">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-hover font-black text-xl shrink-0">
                            {ad.profiles?.avatar_url ? (
                                <img src={ad.profiles.avatar_url} className="w-12 h-12 rounded-2xl object-cover" />
                            ) : (
                                ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'N'
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">
                                    {ad.profiles?.display_name ?? 'FWG Schüler/in'}
                                </p>
                                <span className={cn(
                                    'text-[9px] px-2 py-0.5 rounded-full font-bold uppercase',
                                    ad.type === 'offer' ? 'bg-primary/20 text-primary-hover' : 'bg-secondary/20 text-secondary'
                                )}>
                                    {ad.type === 'offer' ? 'Biete Nachhilfe' : 'Suche Nachhilfe'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                Stufe {ad.profiles?.grade_level || '?'} {myAd ? `· Passend zu deiner Anzeige "${myAd.title || myAd.subjects.join(', ')}"` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Match Score Badge */}
                    <div className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black shrink-0 border',
                        isHighMatch 
                            ? 'bg-primary/20 text-primary-hover border-primary/30 shadow-inner' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                    )}>
                        <Zap size={13} fill="currentColor" />
                        {score}% Match
                    </div>
                </div>

                {/* Short Description */}
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium leading-relaxed">
                    {ad.short_description || 'Keine Kurzbeschreibung vorhanden.'}
                </p>

                {/* Analysis Indicators Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {/* Common Subjects */}
                    <div className="bg-gray-50 dark:bg-gray-800/40 border dark:border-gray-800 p-3 rounded-2xl">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Gemeinsame Fächer</span>
                        <div className="flex flex-wrap gap-1">
                            {commonSubjects.length > 0 ? (
                                commonSubjects.map(s => (
                                    <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/20 text-primary-hover capitalize">
                                        {s}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-gray-400 italic">Keine direkten Fächer-Match</span>
                            )}
                        </div>
                    </div>

                    {/* Match Reasons */}
                    <div className="bg-gray-50 dark:bg-gray-800/40 border dark:border-gray-800 p-3 rounded-2xl flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Warum es passt</span>
                            <div className="space-y-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {matchReasons.map((reason, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                        <span>{reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

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
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/95 text-black rounded-2xl text-xs font-black transition-all shadow-md active:scale-[0.98]"
                    >
                        <MessageSquare size={14} /> Anzeige ansehen & Anfragen <ArrowRight size={14} />
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
    const [myProfile, setMyProfile] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch my profile
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

            const myAdsList = (myAds ?? []) as Ad[];
            setUserAds(myAdsList);

            // 3. Fetch candidate ads (all active ads from other users)
            const { data: candidates, error: candidatesError } = await supabase
                .from('ads')
                .select('*, profiles(id, display_name, avatar_url, grade_level, availability, is_verified)')
                .neq('user_id', user?.id)
                .eq('is_active', true);

            if (candidatesError) throw candidatesError;

            setCandidateAds((candidates ?? []) as any[]);
        } catch (e) {
            console.error('[Matching] error:', e);
        } finally {
            setLoading(false);
        }
    };

    // Smart Match Algorithm with Fallbacks
    const matches = useMemo<Match[]>(() => {
        if (!candidateAds.length) return [];

        const list: Match[] = [];
        const myAvail = myProfile?.availability || emptyAvailability();
        const myGrade = myProfile?.grade_level || '10';

        // CASE A: User has active ads -> Match user ads against candidate ads
        if (userAds.length > 0) {
            userAds.forEach(myAd => {
                candidateAds.forEach(candAd => {
                    if (dismissedIds.includes(candAd.id)) return;
                    if (myAd.type === candAd.type) return; // Seeker matches Provider

                    const common = findCommonSubjects(myAd.subjects, candAd.subjects);
                    const reasons: string[] = [];

                    // 1. Subject match score (up to 45 pts)
                    let subjectScore = 0;
                    if (common.length > 0) {
                        subjectScore = Math.min(45, Math.round((common.length / Math.max(1, myAd.subjects.length)) * 45));
                        reasons.push(`${common.length} passende(s) Fach (${common.join(', ')})`);
                    }

                    // 2. Grade level compatibility (up to 30 pts)
                    let gradeScore = 10;
                    let gradeCompat = 'Standard';
                    const candGrade = candAd.profiles?.grade_level || candAd.grade_levels[0] || 'EF';
                    
                    const myGradeNum = parseInt(myGrade) || 10;
                    const candGradeNum = parseInt(candGrade) || 10;

                    if (myAd.type === 'search' && candGradeNum > myGradeNum) {
                        gradeScore = 30;
                        gradeCompat = `Nachhilfelehrer aus höherer Stufe (${candGrade})`;
                        reasons.push(`Erfahrener Nachhilfelehrer aus Stufe ${candGrade}`);
                    } else if (myAd.type === 'offer' && candGradeNum <= myGradeNum) {
                        gradeScore = 30;
                        gradeCompat = `Schüler aus passender Stufe (${candGrade})`;
                        reasons.push(`Nachhilfesuchender aus Klasse ${candGrade}`);
                    } else {
                        gradeScore = 15;
                        reasons.push(`Klassenstufe ${candGrade}`);
                    }

                    // 3. Availability time overlap (up to 15 pts)
                    const availMatches = countMatches(myAvail, candAd.profiles?.availability || emptyAvailability());
                    let availScore = Math.min(15, availMatches * 5);
                    if (availMatches > 0) {
                        reasons.push(`${availMatches} freie Termin-Übereinstimmung(en)`);
                    }

                    // 4. Verification Bonus (10 pts)
                    const verifScore = candAd.profiles?.is_verified ? 10 : 0;
                    if (candAd.profiles?.is_verified) {
                        reasons.push('Verifizierter FWG Account');
                    }

                    const finalScore = Math.min(100, subjectScore + gradeScore + availScore + verifScore);

                    // Threshold: require at least 1 common subject OR score >= 50
                    if (common.length > 0 || finalScore >= 50) {
                        list.push({
                            ad: candAd,
                            myAd: myAd,
                            score: finalScore,
                            commonSubjects: common,
                            availabilityMatches: availMatches,
                            gradeCompatibility: gradeCompat,
                            matchReasons: reasons
                        });
                    }
                });
            });
        } 
        // CASE B: User has NO active ads -> Fallback profile matching
        else {
            candidateAds.forEach(candAd => {
                if (dismissedIds.includes(candAd.id)) return;

                const candSubjects = candAd.subjects || [];
                const reasons: string[] = [];

                let subjectScore = candSubjects.length > 0 ? 35 : 15;
                if (candSubjects.length > 0) {
                    reasons.push(`Angebote in Fächern: ${candSubjects.slice(0, 3).join(', ')}`);
                }

                const candGrade = candAd.profiles?.grade_level || candAd.grade_levels[0] || '10';
                let gradeScore = 25;
                reasons.push(`Partner aus Stufe ${candGrade}`);

                const availMatches = countMatches(myAvail, candAd.profiles?.availability || emptyAvailability());
                let availScore = Math.min(20, availMatches * 5);
                if (availMatches > 0) {
                    reasons.push(`${availMatches} Freistunden-Match`);
                }

                const verifScore = candAd.profiles?.is_verified ? 20 : 0;
                if (candAd.profiles?.is_verified) {
                    reasons.push('Verifizierter FWG Nutzer');
                }

                const finalScore = Math.min(95, subjectScore + gradeScore + availScore + verifScore);

                list.push({
                    ad: candAd,
                    score: finalScore,
                    commonSubjects: candSubjects,
                    availabilityMatches: availMatches,
                    gradeCompatibility: `Stufe ${candGrade}`,
                    matchReasons: reasons
                });
            });
        }

        // Deduplicate by candidate ad ID (keep best score)
        const uniqueMatches: Record<string, Match> = {};
        list.forEach(m => {
            if (!uniqueMatches[m.ad.id] || uniqueMatches[m.ad.id].score < m.score) {
                uniqueMatches[m.ad.id] = m;
            }
        });

        return Object.values(uniqueMatches).sort((a, b) => b.score - a.score);
    }, [userAds, candidateAds, dismissedIds, myProfile]);

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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automatische Matches</h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Der intelligente Algorithmus vergleicht deine Angaben mit passenden Nachhilfeangeboten und Gesuchen anderer FWG Schüler.
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Matches werden berechnet...</p>
                </div>
            )}

            {/* User has no ads banner */}
            {!loading && userAds.length === 0 && matches.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-3xl flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                        <p className="font-bold text-amber-900 dark:text-amber-300">Tipp: Erstelle eine eigene Anzeige!</p>
                        <p className="text-amber-800/80 dark:text-amber-400/80">Mit einer eigenen Anzeige berechnen wir dir noch präzisere Fächer-Matches.</p>
                    </div>
                    <button
                        onClick={() => navigate('/create-ad')}
                        className="px-3 py-1.5 bg-amber-500 text-black font-extrabold rounded-xl shrink-0 shadow-sm"
                    >
                        Anzeige erstellen
                    </button>
                </div>
            )}

            {/* No Matches found */}
            {!loading && matches.length === 0 && (
                <div className="flex flex-col items-center text-center py-16 bg-white dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800 p-8 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                        <Frown size={32} />
                    </div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white mb-2">
                        Aktuell keine neuen Matches
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                        Es gibt zurzeit leider keine anderen Anzeigen, die zu deinen Kriterien passen.
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary-hover dark:text-primary rounded-full text-xs font-extrabold">
                        <Zap size={14} fill="currentColor" />
                        <span>{matches.length} passende Gegenparts gefunden!</span>
                    </div>
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
