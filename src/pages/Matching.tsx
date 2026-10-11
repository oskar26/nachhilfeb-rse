import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Sparkles, Zap, X, MessageSquare, Frown,
    CalendarDays, CheckCircle2, RotateCcw,
    BookOpen, GraduationCap, MapPin, Search, Euro
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn, formatAdPrice, type PriceDetails } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { TabBar } from '../components/ui/TabBar';
import { Button } from '../components/ui/Button';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { EmptyState } from '../components/social/EmptyState';
import { MatchScoreBadge } from '../components/social/MatchScoreBadge';
import { subjectLabelMap, type Subject } from '../components/SubjectChip';
import {
    computeMatches,
    emptyAvailability,
    formatGradeLabel,
    normalizeSubject,
    type Availability,
    type Match,
    type MatchAd as Ad,
    type MatchProfile
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

type CardAd = Ad & { price_details?: PriceDetails | null };
type MyProfile = MatchProfile & { id?: string };

function subjectLabel(s: string): string {
    return subjectLabelMap[normalizeSubject(s) as Subject] ?? s;
}

/** Fächer-Chip: helle graue Pille; per `highlight` gelb (Score-/Treffer-Akzent). */
function SubjectPill({ label, highlight = false }: { label: string; highlight?: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                highlight
                    ? 'bg-primary text-amber-950'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            )}
        >
            {highlight && <CheckCircle2 size={11} aria-hidden />}
            {label}
        </span>
    );
}

// ── Match Card Component ─────────────────────────────────────────

function MatchCard({
    match,
    myAvail,
    mySubjects,
    onContact,
    onDismiss,
}: {
    match: Match;
    myAvail?: Availability;
    mySubjects?: string[];
    onContact: () => void;
    onDismiss: () => void;
}) {
    const { myAd, score, commonSubjects, availabilityMatches, gradeCompatibility, matchReasons } = match;
    const ad = match.ad as CardAd;
    const [showCalendar, setShowCalendar] = useState(false);
    const reduceMotion = useReducedMotion();

    const isOffer = ad.type === 'offer';
    const leftTitle = isOffer ? 'Du suchst' : 'Du bietest';
    const rightTitle = isOffer ? 'Er/sie bietet' : 'Er/sie sucht';
    const leftSubjects = (myAd?.subjects?.length ? myAd.subjects : (mySubjects ?? [])) as string[];
    const rightSubjects = (ad.subjects || []) as string[];

    return (
        <motion.article
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex min-w-0 flex-col rounded-3xl border border-gray-200 bg-white p-4 shadow-soft transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-5 lg:p-6"
        >
            {/* Kopf: Typ-Chip + großer Score */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                            isOffer
                                ? 'bg-primary text-black'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        )}
                    >
                        {isOffer ? <GraduationCap size={13} aria-hidden /> : <Search size={13} aria-hidden />}
                        {isOffer ? 'Bietet Nachhilfe' : 'Sucht Nachhilfe'}
                    </span>
                    {ad.profiles?.is_verified && <VerifiedPill />}
                </div>
                <MatchScoreBadge score={score} />
            </div>

            {/* Person */}
            <div className="mt-4 flex items-center gap-3">
                {ad.profiles?.avatar_url ? (
                    <img src={ad.profiles.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gray-100 text-base font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300" aria-hidden>
                        {ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'F'}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="truncate text-base font-bold text-gray-900 dark:text-white">
                        {ad.profiles?.display_name ?? 'FWG Schüler/in'}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono tabular-nums">{formatGradeLabel(ad.profiles?.grade_level || ad.grade_levels?.[0])}</span>
                        {gradeCompatibility && (
                            <span className="font-semibold text-amber-700 dark:text-primary">{gradeCompatibility}</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Bezug zur eigenen Anzeige */}
            {myAd && (
                <div className="mt-3 rounded-2xl border border-dashed border-gray-200 px-3.5 py-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    Passend zu deiner Anzeige: <span className="font-bold">„{myAd.title || myAd.subjects.join(', ')}“</span>
                </div>
            )}

            {/* Kurzbeschreibung */}
            <p className="mt-3 text-sm leading-relaxed text-gray-700 line-clamp-2 dark:text-gray-300">
                {ad.short_description || ad.long_description || 'Keine nähere Beschreibung angegeben.'}
            </p>

            {/* Gegenüberstellung: Du ↔ Gegenüber */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <BookOpen size={12} aria-hidden /> {leftTitle}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {leftSubjects.length > 0
                            ? leftSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} />)
                            : <span className="text-xs text-gray-400 dark:text-gray-500">Keine Fächer hinterlegt</span>}
                    </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <GraduationCap size={12} aria-hidden /> {rightTitle}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {rightSubjects.length > 0
                            ? rightSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} />)
                            : <span className="text-xs text-gray-400 dark:text-gray-500">Keine Fächer hinterlegt</span>}
                    </div>
                </div>
            </div>

            {/* Warum ihr zusammenpasst */}
            <div className="mt-2.5 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <Sparkles size={12} aria-hidden /> Warum ihr zusammenpasst
                </h4>
                {commonSubjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {commonSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} highlight />)}
                    </div>
                )}
                <ul className="mt-2 space-y-1">
                    {matchReasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-green-600 dark:text-green-500" aria-hidden />
                            <span>{reason}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Meta-Zeile: Klasse · Preis · Ort · Freistunden */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold dark:bg-gray-800">
                    <GraduationCap size={12} aria-hidden />
                    <span className="font-mono tabular-nums">{formatGradeLabel(ad.grade_levels?.[0])}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold dark:bg-gray-800">
                    <Euro size={12} aria-hidden />
                    <span className="font-mono tabular-nums">{formatAdPrice(ad.price_details)}</span>
                </span>
                {ad.locations && ad.locations.length > 0 && (
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold dark:bg-gray-800">
                        <MapPin size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{ad.locations.join(', ')}</span>
                    </span>
                )}
                {availabilityMatches > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        aria-expanded={showCalendar}
                        className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-bold text-amber-900 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-primary dark:hover:bg-primary/15 dark:focus-visible:ring-offset-gray-900"
                        title="Gemeinsame Freistunden ansehen"
                    >
                        <CalendarDays size={12} aria-hidden />
                        <span className="font-mono tabular-nums">{availabilityMatches}</span>
                        Freistunden
                        <span className="text-[10px] underline">{showCalendar ? 'ausblenden' : 'ansehen'}</span>
                    </button>
                )}
            </div>

            {/* Inline-Verfügbarkeitsvergleich */}
            {showCalendar && (
                <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                            <CalendarDays size={12} className="text-green-600" aria-hidden /> Gemeinsame Zeiten (grün markiert)
                        </span>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black tabular-nums text-green-800 dark:bg-green-950/40 dark:text-green-300">
                            {availabilityMatches} Treffer
                        </span>
                    </div>
                    <AvailabilityCalendar
                        availability={ad.profiles?.availability || emptyAvailability()}
                        matchWith={myAvail}
                        compact
                    />
                </div>
            )}

            {/* Aktionen */}
            <div className="mt-4 flex flex-wrap gap-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                    variant="outline"
                    onClick={() => {
                        triggerHaptic('light');
                        onDismiss();
                    }}
                    className="h-11 shrink-0 rounded-full border-gray-200 bg-white px-4 font-bold text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <X size={15} /> Übersehen
                </Button>
                <Button
                    onClick={() => {
                        triggerHaptic('success');
                        onContact();
                    }}
                    className="h-11 flex-1 rounded-full bg-primary font-bold text-black"
                >
                    <MessageSquare size={15} /> Kontakt aufnehmen
                </Button>
            </div>
        </motion.article>
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
    const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
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
            if (profileData) setMyProfile(profileData as MyProfile);

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
            const filteredCandidates = ((candidates ?? []) as Ad[]).filter(c => c.user_id !== user?.id && c.is_active !== false);
            setCandidateAds(filteredCandidates);
        } catch (e) {
            console.error('[Matching] fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Smart Multi-Factor Matching Algorithm (Starting at 20%) ──
    // Scoring steckt in src/lib/matching.ts (inkl. isYoungOfferOwner-Bonus).
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
        <div className="min-w-0 space-y-5">
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
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={handleResetDismissed}
                        className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-200 bg-white px-4 text-xs font-bold tabular-nums text-gray-500 transition-colors hover:border-primary hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100 dark:focus-visible:ring-offset-gray-950"
                        title="Ausgeblendete Matches zurücksetzen"
                    >
                        <RotateCcw size={13} />
                        <span>{dismissedIds.length} ausgeblendete wiederherstellen</span>
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="space-y-4" role="status" aria-label="Matches werden berechnet">
                    <p className="text-center text-xs font-bold uppercase tracking-wider text-gray-400">Matches werden berechnet…</p>
                    <MatchSkeleton />
                    <MatchSkeleton />
                </div>
            )}

            {/* Tipp: noch keine eigene Anzeige */}
            {!loading && userAds.length === 0 && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                                <Sparkles size={15} className="shrink-0 text-amber-600 dark:text-primary" aria-hidden /> Tipp für noch bessere Treffer
                            </p>
                            <p className="max-w-lg text-xs font-medium text-gray-600 dark:text-gray-300">
                                Wir zeigen dir Matches anhand deines Profils. Erstelle eine kostenlose Anzeige, um bis zu 100% präzise Vorschläge zu erhalten!
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/create-ad')}
                            className="h-11 shrink-0 rounded-full bg-primary px-5 font-bold text-black"
                        >
                            Anzeige schalten
                        </Button>
                    </div>
                </div>
            )}

            {/* Keine Matches */}
            {!loading && filteredMatches.length === 0 && (
                <EmptyState
                    icon={Frown}
                    title="Keine Matches in dieser Kategorie"
                    text={dismissedIds.length > 0
                        ? 'Du hast möglicherweise relevante Matches ausgeblendet.'
                        : 'Aktuell gibt es keine passenden Anzeigen mit einer Übereinstimmung ab 20%.'}
                    action={
                        <>
                            {dismissedIds.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={handleResetDismissed}
                                    className="h-11 rounded-full border-gray-200 bg-white font-bold dark:border-gray-700 dark:bg-gray-900"
                                >
                                    Ausgeblendete anzeigen
                                </Button>
                            )}
                            <Button onClick={() => navigate('/')} className="h-11 rounded-full bg-primary px-5 font-bold text-black">
                                Alle Anzeigen im Feed ansehen
                            </Button>
                        </>
                    }
                />
            )}

            {/* Treffer-Zusammenfassung */}
            {!loading && filteredMatches.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <Zap size={13} className="shrink-0 text-amber-600 dark:text-primary" aria-hidden />
                        <span><span className="tabular-nums">{filteredMatches.length}</span> Vorschläge ab 20% Übereinstimmung</span>
                    </p>
                    <span className="hidden text-xs text-gray-400 sm:inline">Sortiert nach Relevanz</span>
                </div>
            )}

            {/* Matches List */}
            {!loading && filteredMatches.length > 0 && (
                <div className="grid min-w-0 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredMatches.map(m => (
                            <MatchCard
                                key={m.ad.id}
                                match={m}
                                myAvail={myProfile?.availability || emptyAvailability()}
                                mySubjects={myProfile?.subjects}
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

/** Helle Karten-Skelette für die Match-Liste. */
function MatchSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
                <div className="h-7 w-32 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-14 w-20 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="h-4 w-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-2.5 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            <div className="mt-4 flex gap-2.5">
                <div className="h-11 w-28 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}
