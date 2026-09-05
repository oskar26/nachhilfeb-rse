import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Zap, X, MessageSquare, Frown, Loader2, 
    CalendarDays, Award, CheckCircle2, ArrowRight, RotateCcw, 
    Filter, BookOpen, GraduationCap, MapPin 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { emptyAvailability, countMatches, type Availability } from '../components/AvailabilityCalendar';
import { triggerHaptic } from '../lib/haptics';

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
    score: number; // 20–100
    commonSubjects: string[];
    availabilityMatches: number;
    gradeCompatibility: string;
    matchReasons: string[];
    locationMatch?: string;
}

// ── Grade Helper Functions ───────────────────────────────────────

export function gradeToNumber(g: string | number | null | undefined): number {
    if (!g) return 10;
    const str = String(g).trim().toUpperCase();
    if (str === 'EF') return 11;
    if (str === 'Q1') return 12;
    if (str === 'Q2') return 13;
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? 10 : parsed;
}

export function formatGradeLabel(g: string | number | null | undefined): string {
    if (!g) return '?';
    const str = String(g).trim().toUpperCase();
    if (['EF', 'Q1', 'Q2'].includes(str)) return `Stufe ${str}`;
    return `Klasse ${str}`;
}

// ── Expanded Subject Normalization & Aliases ─────────────────────

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
    'spanisch': 'spanisch',
    'span': 'spanisch',
    'es': 'spanisch',
    's': 'spanisch',
    'physik': 'physik',
    'phy': 'physik',
    'ph': 'physik',
    'chemie': 'chemie',
    'chem': 'chemie',
    'ch': 'chemie',
    'biologie': 'biologie',
    'bio': 'biologie',
    'b': 'biologie',
    'informatik': 'informatik',
    'info': 'informatik',
    'inf': 'informatik',
    'geschichte': 'geschichte',
    'gesch': 'geschichte',
    'ge': 'geschichte',
    'erdkunde': 'geographie',
    'geo': 'geographie',
    'geographie': 'geographie',
    'politik': 'politik',
    'sowi': 'politik',
    'sozialwissenschaften': 'politik',
    'philosophie': 'philosophie',
    'phil': 'philosophie',
    'pl': 'philosophie',
    'religion': 'religion',
    'reli': 'religion',
    'er': 'religion',
    'kr': 'religion',
    'kunst': 'kunst',
    'ku': 'kunst',
    'musik': 'musik',
    'mu': 'musik',
    'wirtschaft': 'wirtschaft',
    'wi': 'wirtschaft',
};

function normalizeSubject(s: string): string {
    const clean = s.trim().toLowerCase();
    return SUBJECT_ALIASES[clean] || clean;
}

function findCommonSubjects(arr1: string[], arr2: string[]): string[] {
    const norm1 = (arr1 || []).map(normalizeSubject);
    const result: string[] = [];

    (arr2 || []).forEach((s) => {
        const norm2 = normalizeSubject(s);
        if (norm1.includes(norm2) && !result.includes(s)) {
            result.push(s);
        }
    });

    return result;
}

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
    onContact,
    onDismiss,
}: {
    match: Match;
    onContact: () => void;
    onDismiss: () => void;
}) {
    const { ad, myAd, score, commonSubjects, availabilityMatches, gradeCompatibility, matchReasons, locationMatch } = match;
    
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
                    'text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1',
                    ad.type === 'offer' 
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300' 
                        : 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                )}>
                    {ad.type === 'offer' ? '🎓 Bietet Nachhilfe' : '🔍 Sucht Nachhilfe'}
                </span>

                <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shrink-0 border',
                    isTopMatch
                        ? 'bg-amber-400/20 text-amber-900 dark:text-amber-200 border-amber-400/40 shadow-xs'
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
                                    <span title="Verifizierter Account">
                                        <Award size={14} className="text-amber-500 shrink-0" />
                                    </span>
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
                                    <span key={s} className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-400/20 text-amber-900 dark:text-amber-200 capitalize">
                                        ✓ {s}
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
                <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-gray-500 dark:text-gray-400">
                    {ad.locations && ad.locations.length > 0 && (
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                            <MapPin size={11} />
                            <span>{ad.locations.join(', ')}</span>
                        </div>
                    )}
                    {availabilityMatches > 0 && (
                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                            <CalendarDays size={11} />
                            <span>{availabilityMatches} Freistunden-Match</span>
                        </div>
                    )}
                </div>

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

            setCandidateAds((candidates ?? []) as any[]);
        } catch (e) {
            console.error('[Matching] fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Smart Multi-Factor Matching Algorithm (Starting at 20%) ──
    const allMatches = useMemo<Match[]>(() => {
        if (!candidateAds.length) return [];

        const list: Match[] = [];
        const myAvail = myProfile?.availability || emptyAvailability();
        const myGrade = myProfile?.grade_level || '10';
        const myGradeNum = gradeToNumber(myGrade);
        const myProfileSubjects = Array.isArray(myProfile?.subjects) ? myProfile.subjects : [];

        // Pre-aggregate user's search and offer ads
        const searchAds = userAds.filter(a => a.type === 'search');
        const offerAds = userAds.filter(a => a.type === 'offer');

        candidateAds.forEach(candAd => {
            if (dismissedIds.includes(candAd.id)) return;

            const candGrade = candAd.profiles?.grade_level || (candAd.grade_levels && candAd.grade_levels[0]) || '10';
            const candGradeNum = gradeToNumber(candGrade);
            const candTargetGrades = (candAd.grade_levels || []).map(g => gradeToNumber(g));
            const candSubjects = candAd.subjects || [];

            // Let's determine matching against user's specific ads OR profile
            let bestScore = 0;
            let bestCommonSubjects: string[] = [];
            let bestReasons: string[] = [];
            let bestGradeCompat = '';
            let bestMyAd: Ad | undefined = undefined;

            // Scenario 1: Match against user's active ads
            if (userAds.length > 0) {
                userAds.forEach(myAd => {
                    let score = 0;
                    const reasons: string[] = [];
                    const common = findCommonSubjects(myAd.subjects, candSubjects);

                    // 1. Subject match (up to 45 pts)
                    if (common.length > 0) {
                        const ratio = common.length / Math.max(1, myAd.subjects.length);
                        const subScore = Math.min(45, Math.round(ratio * 35) + (common.length >= 2 ? 10 : 0));
                        score += subScore;
                        reasons.push(`${common.length} Fach/Fächer: ${common.join(', ')}`);
                    } else {
                        // Check profile subjects
                        const profileCommon = findCommonSubjects(myProfileSubjects, candSubjects);
                        if (profileCommon.length > 0) {
                            score += 15;
                            reasons.push(`Übereinstimmung mit deinem Profilfach (${profileCommon[0]})`);
                        }
                    }

                    // 2. Ad Type & Grade Compatibility (up to 35 pts)
                    let gradeCompat = '';
                    const isComplementary = myAd.type !== candAd.type;

                    if (isComplementary) {
                        // Bonus for opposite type: seeker <-> provider
                        score += 10;

                        if (myAd.type === 'search' && candAd.type === 'offer') {
                            // I need tutoring, candidate offers tutoring
                            const offersMyGrade = candTargetGrades.length === 0 || candTargetGrades.includes(myGradeNum);
                            if (offersMyGrade) {
                                score += 25;
                                gradeCompat = `Unterrichtet deine Stufe (${formatGradeLabel(myGrade)})`;
                                reasons.push(`Bietet Nachhilfe gezielt für ${formatGradeLabel(myGrade)}`);
                            } else if (candGradeNum > myGradeNum) {
                                score += 18;
                                gradeCompat = `Tutor aus höherer Stufe (${formatGradeLabel(candGrade)})`;
                                reasons.push(`Erfahrener Tutor aus ${formatGradeLabel(candGrade)}`);
                            } else {
                                score += 10;
                                gradeCompat = `${formatGradeLabel(candGrade)}`;
                            }
                        } else if (myAd.type === 'offer' && candAd.type === 'search') {
                            // I offer tutoring, candidate is searching
                            const myTargetGrades = (myAd.grade_levels || []).map(g => gradeToNumber(g));
                            const inMyTarget = myTargetGrades.length === 0 || myTargetGrades.includes(candGradeNum);
                            if (inMyTarget) {
                                score += 25;
                                gradeCompat = `Schüler aus deiner Zielstufe (${formatGradeLabel(candGrade)})`;
                                reasons.push(`Gesuch aus passender Stufe ${formatGradeLabel(candGrade)}`);
                            } else if (myGradeNum >= candGradeNum) {
                                score += 18;
                                gradeCompat = `Schüler aus Stufe ${formatGradeLabel(candGrade)}`;
                                reasons.push(`Klassenstufe ${formatGradeLabel(candGrade)}`);
                            } else {
                                score += 10;
                            }
                        }
                    } else {
                        // Same type: maybe two learners searching together (study buddy) or exchange
                        if (candGradeNum === myGradeNum) {
                            score += 15;
                            gradeCompat = `Gleiche Stufe (${formatGradeLabel(myGrade)}) - Lernpartner`;
                            reasons.push(`Möglicher Lernpartner in Stufe ${formatGradeLabel(myGrade)}`);
                        } else {
                            score += 8;
                            gradeCompat = `${formatGradeLabel(candGrade)}`;
                        }
                    }

                    // 3. Availability time overlap (up to 15 pts)
                    const candAvail = candAd.profiles?.availability || emptyAvailability();
                    const availMatches = countMatches(myAvail, candAvail);
                    if (availMatches > 0) {
                        const availScore = Math.min(15, availMatches * 5);
                        score += availScore;
                        reasons.push(`${availMatches} übereinstimmende Freistunde(n)`);
                    }

                    // 4. Common locations (up to 10 pts)
                    const myLocs = myAd.locations || [];
                    const candLocs = candAd.locations || [];
                    const commonLocs = myLocs.filter(l => candLocs.includes(l));
                    if (commonLocs.length > 0) {
                        score += 8;
                        reasons.push(`Ort: ${commonLocs.join(', ')}`);
                    }

                    // 5. Verification Bonus (5 pts)
                    if (candAd.profiles?.is_verified) {
                        score += 5;
                        reasons.push('Verifizierter FWG Schüler');
                    }

                    const clampedScore = Math.min(100, Math.max(20, score));

                    if (clampedScore > bestScore) {
                        bestScore = clampedScore;
                        bestCommonSubjects = common.length > 0 ? common : candSubjects.slice(0, 2);
                        bestReasons = reasons;
                        bestGradeCompat = gradeCompat;
                        bestMyAd = myAd;
                    }
                });
            }

            // Scenario 2: Fallback matching against user's profile (when user has no ads or ads didn't match well)
            if (bestScore < 30) {
                let fallbackScore = 20; // Base baseline score
                const reasons: string[] = [];

                // Check profile subjects
                const profCommon = findCommonSubjects(myProfileSubjects, candSubjects);
                if (profCommon.length > 0) {
                    fallbackScore += 25;
                    reasons.push(`Fach passt zu deinem Profil: ${profCommon.join(', ')}`);
                } else if (candSubjects.length > 0) {
                    fallbackScore += 10;
                    reasons.push(`Fachangebot: ${candSubjects.slice(0, 2).join(', ')}`);
                }

                // Grade fit
                if (candAd.type === 'offer') {
                    const offersMyGrade = candTargetGrades.length === 0 || candTargetGrades.includes(myGradeNum);
                    if (offersMyGrade || candGradeNum > myGradeNum) {
                        fallbackScore += 20;
                        reasons.push(`Unterrichtet deine Stufe ${formatGradeLabel(myGrade)}`);
                    } else {
                        fallbackScore += 10;
                    }
                } else {
                    if (myGradeNum >= candGradeNum) {
                        fallbackScore += 20;
                        reasons.push(`Sucht Unterstützung in Stufe ${formatGradeLabel(candGrade)}`);
                    } else {
                        fallbackScore += 10;
                    }
                }

                // Availability
                const candAvail = candAd.profiles?.availability || emptyAvailability();
                const availMatches = countMatches(myAvail, candAvail);
                if (availMatches > 0) {
                    fallbackScore += Math.min(15, availMatches * 5);
                    reasons.push(`${availMatches} freie Stunde(n) gemeinsam`);
                }

                // Verified
                if (candAd.profiles?.is_verified) {
                    fallbackScore += 5;
                    reasons.push('Verifizierter Account');
                }

                const clampedFallback = Math.min(100, Math.max(20, fallbackScore));
                if (clampedFallback > bestScore) {
                    bestScore = clampedFallback;
                    bestCommonSubjects = profCommon.length > 0 ? profCommon : candSubjects.slice(0, 2);
                    bestReasons = reasons;
                    bestGradeCompat = formatGradeLabel(candGrade);
                }
            }

            // Lower boundary threshold is 20%!
            if (bestScore >= 20) {
                const availMatches = countMatches(myAvail, candAd.profiles?.availability || emptyAvailability());
                list.push({
                    ad: candAd,
                    myAd: bestMyAd,
                    score: bestScore,
                    commonSubjects: bestCommonSubjects,
                    availabilityMatches: availMatches,
                    gradeCompatibility: bestGradeCompat,
                    matchReasons: bestReasons.length > 0 ? bestReasons : ['Allgemeines Match basierend auf Klassenstufe'],
                    locationMatch: candAd.locations?.[0]
                });
            }
        });

        // Deduplicate and sort descending by score
        const unique: Record<string, Match> = {};
        list.forEach(m => {
            if (!unique[m.ad.id] || unique[m.ad.id].score < m.score) {
                unique[m.ad.id] = m;
            }
        });

        return Object.values(unique).sort((a, b) => b.score - a.score);
    }, [userAds, candidateAds, dismissedIds, myProfile]);

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
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
            {/* Page Header */}
            <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold">
                        <Sparkles size={22} className="text-primary-hover dark:text-primary animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            Smart Matches
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Finde automatisch passende Partner nach Fach, Stufe (inkl. Oberstufe EF/Q1/Q2) & Zeitplan
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-2xl border dark:border-gray-700/50">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            setFilterMode('all');
                        }}
                        className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                            filterMode === 'all'
                                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        )}
                    >
                        Alle ({allMatches.length})
                    </button>
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            setFilterMode('seeking');
                        }}
                        className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                            filterMode === 'seeking'
                                ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        )}
                    >
                        🎓 Ich suche Nachhilfe
                    </button>
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            setFilterMode('offering');
                        }}
                        className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                            filterMode === 'offering'
                                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        )}
                    >
                        🔍 Ich biete Nachhilfe
                    </button>
                </div>

                {dismissedIds.length > 0 && (
                    <button
                        onClick={handleResetDismissed}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-primary px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Ausgeblendete Matches zurücksetzen"
                    >
                        <RotateCcw size={12} />
                        <span>{dismissedIds.length} ausgeblendete wiederherstellen</span>
                    </button>
                )}
            </div>

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
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl shrink-0 shadow-xs transition-all cursor-pointer text-center"
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
