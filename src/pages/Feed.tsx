import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CollapsedNewsWidget } from '../components/CollapsedNewsWidget';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/Card';
import { SubjectChip, SUBJECT_CATEGORIES, subjectLabelMap, type Subject } from '../components/SubjectChip';
import { GraduationCap, MapPin, Clock, Filter, Search, CalendarDays, ShieldCheck, ChevronDown, ChevronUp, Share2, Sparkles, Bookmark, X, SearchX, Award, Users, ArrowUpDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GradeSelector } from '../components/GradeSelector';
import { Input } from '../components/ui/Input';
import { PriceRangeSlider } from '../components/PriceRangeSlider';
import { useAuth } from '../context/AuthContext';
import { emptyAvailability, countMatches, type Availability } from '../components/AvailabilityCalendar';
import { toast } from 'react-hot-toast';
import ShareDialog from '../components/ShareDialog';
import { cn, formatAdPrice, hourlyRate, type PriceDetails } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { api } from '../lib/api';

interface Ad {
    id: string;
    user_id: string;
    type: 'offer' | 'search';
    subjects: Subject[];
    grade_levels: string[];
    locations: string[];
    price_details: PriceDetails | null;
    duration_minutes?: number[];
    session_format?: 'single' | 'group' | 'any' | string;
    view_count?: number;
    favorite_count?: number;
    short_description: string;
    is_active: boolean;
    created_at: string;
    boosted?: boolean;
    boosted_until?: string | null;
    profiles?: { display_name: string; is_verified: boolean; grade_level: string; is_coach?: boolean };
    profiles_avail?: Availability;
}

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 30;
// Getrennte Konstanten: aktive (weiß auf Farbe) und inaktive (grau auf grau) States teilen sich nie ein Element.
const GESUCHE_PILL_ACTIVE = 'bg-blue-600 text-white shadow-sm';
const GESUCHE_PILL_IDLE = 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
const SAVED_SEARCH_KEY = 'fwg_saved_search';
const GRADE_VALUES = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];

type SortKey = 'newest' | 'oldest' | 'cheapest' | 'priciest' | 'popular' | 'saved';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'newest', label: 'Neueste zuerst' },
    { value: 'oldest', label: 'Älteste zuerst' },
    { value: 'cheapest', label: 'Günstigste zuerst' },
    { value: 'priciest', label: 'Teuerste zuerst' },
    { value: 'popular', label: 'Beliebteste zuerst' },
    { value: 'saved', label: 'Meistgespeichertste zuerst' },
];
const SORT_KEYS: SortKey[] = ['newest', 'oldest', 'cheapest', 'priciest', 'popular', 'saved'];

function isValidSortKey(value: unknown): value is SortKey {
    return typeof value === 'string' && (SORT_KEYS as string[]).includes(value);
}

/** Normiert den Preis einer Anzeige auf Euro pro Stunde (60 Min). free → 0, vb/unbekannt → null. */
function getHourlyRate(ad: Ad): number | null {
    const mode = ad.price_details?.mode;
    if (mode === 'free') return 0;
    if (mode !== 'fixed') return null;
    const val = Number(ad.price_details?.value);
    if (!Number.isFinite(val) || val < 0) return null;
    const unit = ad.price_details?.unit;
    const minutes = unit === '45min' ? 45 : unit === '90min' ? 90 : 60;
    return Math.round(((val / minutes) * 60) * 100) / 100;
}

function formatPrice(ad: Ad): string {
    return formatAdPrice(ad.price_details);
}

function priceSecondary(ad: Ad): string | null {
    const h = hourlyRate(ad.price_details);
    if (h === null || h === 0) return null;
    const text = Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',');
    return `≈ ${text} €/h`;
}

interface SavedSearch {
    query: string;
    type: 'all' | 'offer' | 'search';
    subject: Subject | null;
    grades: string[];
    minPrice: number;
    maxPrice: number;
    onlyCoaches: boolean;
    filterByTime: boolean;
    sortKey: SortKey;
}

const FILTER_DEFAULTS = {
    query: '',
    type: 'all' as const,
    subject: null,
    grades: [] as string[],
    minPrice: PRICE_SLIDER_MIN,
    maxPrice: PRICE_SLIDER_MAX,
    onlyCoaches: false,
    filterByTime: false,
    sortKey: 'newest' as SortKey,
};

function isValidSubject(value: unknown): value is Subject {
    return SUBJECT_CATEGORIES.some(category => category.subjects.includes(value as Subject));
}

function loadSavedSearch(): SavedSearch | null {
    try {
        const raw = localStorage.getItem(SAVED_SEARCH_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const record = parsed as Record<string, unknown>;
        if (
            typeof record.query !== 'string' ||
            !['all', 'offer', 'search'].includes(String(record.type)) ||
            (record.subject !== null && !isValidSubject(record.subject)) ||
            !Array.isArray(record.grades) ||
            !record.grades.every(g => typeof g === 'string' && GRADE_VALUES.includes(g)) ||
            typeof record.minPrice !== 'number' || !Number.isInteger(record.minPrice) ||
            typeof record.maxPrice !== 'number' || !Number.isInteger(record.maxPrice) ||
            record.minPrice < PRICE_SLIDER_MIN || record.maxPrice > PRICE_SLIDER_MAX ||
            record.minPrice >= record.maxPrice ||
            typeof record.onlyCoaches !== 'boolean' || typeof record.filterByTime !== 'boolean'
        ) return null;
        return {
            query: record.query,
            type: record.type as SavedSearch['type'],
            subject: record.subject as Subject | null,
            grades: [...new Set(record.grades as string[])],
            minPrice: record.minPrice,
            maxPrice: record.maxPrice,
            onlyCoaches: record.onlyCoaches,
            filterByTime: record.filterByTime,
            sortKey: isValidSortKey(record.sortKey) ? record.sortKey : 'newest',
        };
    } catch {
        return null;
    }
}

async function loadAds(): Promise<Ad[]> {
    const { data: adsData, error } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!adsData) throw new Error('Missing ads response');
    if (adsData.length === 0) return [];
    const userIds = Array.from(new Set(adsData.map(a => a.user_id)));
    const { data: profiles, error: profileError } = await supabase.from('profiles')
        .select('id, display_name, is_verified, grade_level, availability, is_coach').in('id', userIds);
    if (profileError) throw profileError;
    if (!profiles) throw new Error('Missing profiles response');
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    return adsData.map(ad => {
        const prof = profileMap.get(ad.user_id);
        // Booleans normalisieren: MySQL liefert TINYINT (0/1) – ein rohes
        // `{profil.is_coach && <Badge>}` würde sonst eine sichtbare „0“ rendern.
        const safeProfile = prof ? {
            ...prof,
            is_coach: Boolean(prof.is_coach),
            is_verified: Boolean(prof.is_verified),
        } : prof;
        return {
            ...ad,
            profiles: safeProfile,
            profiles_avail: prof?.availability || emptyAvailability()
        };
    });
}

export default function Feed() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showBanners, setShowBanners] = useState(() => {
        try {
            // Zugeklappt als Standard (distill): eine schlanke Infos-Zeile genügt, Details erst auf Wunsch.
            return localStorage.getItem('feed_show_banners') === 'true';
        } catch {
            return false;
        }
    });
    const [myAvailability, setMyAvailability] = useState<Availability>(emptyAvailability());
    const [filterByTime, setFilterByTime] = useState(false);
    const [shareAd, setShareAd] = useState<{ id: string; title: string } | null>(null);
    const [savedSearch, setSavedSearch] = useState<SavedSearch | null>(() => loadSavedSearch());

    // Coaching Startseiten-Info
    const [coachInfo, setCoachInfo] = useState<{
        title: string;
        description: string;
        time: string;
        room: string;
        is_visible: boolean;
    }>({
        title: 'Kostenloses Coaching für Klasse 5 & 6!',
        description: 'Wöchentlich einmal bieten wir für alle Schülerinnen und Schüler der Jahrgangsstufen 5 und 6 die Möglichkeit, Hilfen zu einzelnen Fächern oder zur Lern- und Arbeitsorganisation allgemein durch Schülerinnen und Schüler der 8. Klassen zu erhalten. Diese werden jeweils vor den Herbstferien für ihre Aufgabe geschult und stellen dann bis zum Ende des Schuljahres ehrenamtlich ihre Hilfe zur Verfügung. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schüler haben.',
        time: 'Dienstags, 13:45 - 14:30 Uhr',
        room: 'Raum H310',
        is_visible: true
    });

    // Filter State
    const [filterSubject, setFilterSubject] = useState<Subject | null>(null);
    const [filterGrade, setFilterGrade] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<'all' | 'offer' | 'search'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [minPrice, setMinPrice] = useState(PRICE_SLIDER_MIN);
    const [maxPrice, setMaxPrice] = useState(PRICE_SLIDER_MAX);
    const [filterOnlyCoaches, setFilterOnlyCoaches] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('newest');

    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        loadAds().then(data => {
            if (!cancelled) setAds(data);
        }).catch(() => {
            if (!cancelled) setFetchError(true);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [loadAttempt]);

    useEffect(() => {
        api.coach.getCoachInfo().then(res => {
            if (res.data) {
                setCoachInfo(prev => ({
                    ...prev,
                    ...res.data,
                    is_visible: res.data.is_visible !== false
                }));
            }
        }).catch(err => console.error('Coach info load error:', err));
    }, []);

    useEffect(() => {
        if (user) {
            supabase.from('profiles').select('availability').eq('id', user.id).single().then(({ data }) => {
                if (data?.availability) setMyAvailability(data.availability);
            });
        }
    }, [user]);

    const fetchAds = () => {
        setLoading(true);
        setFetchError(false);
        setLoadAttempt(attempt => attempt + 1);
    };

    const hasActiveFilters = Boolean(
        searchQuery ||
        filterSubject ||
        filterGrade.length > 0 ||
        filterType !== 'all' ||
        minPrice !== PRICE_SLIDER_MIN ||
        maxPrice !== PRICE_SLIDER_MAX ||
        filterOnlyCoaches || filterByTime ||
        sortKey !== 'newest'
    );

    const resetAllFilters = () => {
        setSearchQuery(FILTER_DEFAULTS.query);
        setFilterType(FILTER_DEFAULTS.type);
        setFilterSubject(FILTER_DEFAULTS.subject);
        setFilterGrade([]);
        setMinPrice(FILTER_DEFAULTS.minPrice);
        setMaxPrice(FILTER_DEFAULTS.maxPrice);
        setFilterOnlyCoaches(FILTER_DEFAULTS.onlyCoaches);
        setFilterByTime(FILTER_DEFAULTS.filterByTime);
        setSortKey(FILTER_DEFAULTS.sortKey);
    };

    const applySavedSearch = () => {
        if (!savedSearch) return;
        setSearchQuery(savedSearch.query);
        setFilterType(savedSearch.type);
        setFilterSubject(savedSearch.subject);
        setFilterGrade(savedSearch.grades);
        setMinPrice(savedSearch.minPrice);
        setMaxPrice(savedSearch.maxPrice);
        setFilterOnlyCoaches(savedSearch.onlyCoaches);
        setFilterByTime(savedSearch.filterByTime);
        setSortKey(savedSearch.sortKey);
        triggerHaptic('light');
        toast.success('Gespeicherte Suche angewendet.');
    };

    const discardSavedSearch = () => {
        try {
            localStorage.removeItem(SAVED_SEARCH_KEY);
        } catch {
            toast.error('Gespeicherte Suche konnte nicht gelöscht werden. Bitte erneut versuchen.');
            return;
        }
        setSavedSearch(null);
        triggerHaptic('light');
    };

    const saveCurrentSearch = () => {
        const entry: SavedSearch = {
            query: searchQuery,
            type: filterType,
            subject: filterSubject,
            grades: filterGrade,
            minPrice,
            maxPrice,
            onlyCoaches: filterOnlyCoaches,
            filterByTime,
            sortKey,
        };
        try {
            localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(entry));
            setSavedSearch(entry);
            triggerHaptic('light');
            toast.success('Suche gespeichert. Du kannst sie hier jederzeit wieder anwenden.');
        } catch (err) {
            console.error('Could not save search', err);
            toast.error('Suche konnte nicht gespeichert werden.');
        }
    };

    const filteredAds = ads.filter(ad => {
        // Search
        const searchLower = searchQuery.toLowerCase();
        if (searchQuery &&
            !(ad.short_description?.toLowerCase() || '').includes(searchLower) &&
            !(ad.subjects || []).some((s: Subject) => s.toLowerCase().includes(searchLower)) &&
            !(ad.profiles?.display_name?.toLowerCase() || '').includes(searchLower)
        ) {
            return false;
        }
        // Type
        if (filterType !== 'all' && ad.type !== filterType) return false;
        // Subject
        if (filterSubject && !ad.subjects.includes(filterSubject)) return false;
        // Grade
        if (filterGrade.length > 0) {
            const hasMatch = filterGrade.some(g => ad.grade_levels.includes(g));
            if (!hasMatch) return false;
        }
        // Preis (normiert auf Euro pro Stunde; VB passiert immer, da Preis unbekannt)
        const hourly = getHourlyRate(ad);
        if (hourly !== null) {
            if (hourly < minPrice || hourly > maxPrice) return false;
        }

        // Coach filter
        if (filterOnlyCoaches && !ad.profiles?.is_coach) return false;

        return true;
    });

    const isAdBoosted = (ad: Ad): boolean => {
        return Boolean(ad?.boosted && ad?.boosted_until && new Date(ad.boosted_until) > new Date());
    };

    // Sort: Boosted ads always on top, then the selected sort order.
    // Ranking-Vorteil für Coaches (bewusst & offengelegt, siehe /coaching):
    // Anzeigen verifizierter Coaches (is_coach) erhalten +0.5 Matching-Punkte
    // bzw. +24h Frische-Bonus – als Anerkennung fürs Ehrenamt. Kein Kauf möglich.
    const sortedAds = [...filteredAds].sort((a, b) => {
        const aBoost = isAdBoosted(a);
        const bBoost = isAdBoosted(b);

        if (aBoost && !bBoost) return -1;
        if (!aBoost && bBoost) return 1;

        const aCoach = Boolean(a.profiles?.is_coach);
        const bCoach = Boolean(b.profiles?.is_coach);

        switch (sortKey) {
            case 'oldest':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'cheapest':
            case 'priciest': {
                // Unbekannte Preise (VB) ans Ende sortieren
                const pa = getHourlyRate(a);
                const pb = getHourlyRate(b);
                if (pa === null && pb === null) break;
                if (pa === null) return 1;
                if (pb === null) return -1;
                return sortKey === 'cheapest' ? pa - pb : pb - pa;
            }
            case 'popular':
                return (b.view_count || 0) - (a.view_count || 0);
            case 'saved':
                return (b.favorite_count || 0) - (a.favorite_count || 0);
            case 'newest':
            default:
                break;
        }

        if (filterByTime) {
            const scoreA = countMatches(myAvailability, a.profiles_avail || emptyAvailability()) + (aCoach ? 0.5 : 0);
            const scoreB = countMatches(myAvailability, b.profiles_avail || emptyAvailability()) + (bCoach ? 0.5 : 0);
            return scoreB - scoreA;
        } else {
            const timeA = new Date(a.created_at).getTime() + (aCoach ? 24 * 60 * 60 * 1000 : 0);
            const timeB = new Date(b.created_at).getTime() + (bCoach ? 24 * 60 * 60 * 1000 : 0);
            return timeB - timeA;
        }
    });

    return (
        <div className="w-full min-w-0 max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 overflow-x-clip">
            {/* Eingeklappte News-Sektion auf der Startseite */}
            <CollapsedNewsWidget />
            <div className="flex flex-col gap-4 mb-6 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="min-w-0">
                        <h1 className="font-display uppercase text-xl sm:text-2xl leading-none tracking-tight min-w-0">Aktuelle Anzeigen</h1>
                        <div className="mt-1.5 h-1 w-10 rounded-full bg-primary" aria-hidden />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {user && (
                            <button
                                onClick={() => { setFilterByTime(!filterByTime); triggerHaptic('selection'); }}
                                aria-pressed={filterByTime}
                                className={`flex items-center gap-1 text-xs px-3 min-h-[40px] py-1.5 rounded-full border font-semibold transition-all cursor-pointer ${
                                    filterByTime
                                        ? 'bg-primary text-black border-primary shadow-sm dark:bg-primary dark:text-black'
                                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
                                }`}
                                title="Passende Zeiten oben anzeigen"
                            >
                                <CalendarDays size={13} />
                                <span className="hidden sm:inline">Zeitlich passend</span>
                            </button>
                        )}
                        <button
                            onClick={() => { setFilterOnlyCoaches(!filterOnlyCoaches); triggerHaptic('selection'); }}
                            aria-pressed={filterOnlyCoaches}
                            className={`flex items-center gap-1 text-xs px-3 min-h-[40px] py-1.5 rounded-full border font-semibold transition-all cursor-pointer ${
                                filterOnlyCoaches
                                    ? 'bg-primary text-black border-primary shadow-sm dark:bg-primary dark:text-black'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
                            }`}
                            title="Nur Schüler-Coaches der AG anzeigen"
                        >
                            <Award size={13} className={filterOnlyCoaches ? 'text-black dark:text-black' : 'text-gray-400'} />
                            <span className="hidden sm:inline">Schüler-Coaches</span>
                            <span className="sm:hidden">Coaches</span>
                        </button>
                        <Button variant="outline" size="sm" className="h-8 px-3 rounded-full text-xs font-bold gap-1 border-gray-200 dark:border-gray-800 shadow-2xs" onClick={() => setShowFilters(!showFilters)}>
                            <Filter size={13} /> Filter
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={saveCurrentSearch}
                            className="h-8 px-2.5 text-xs text-primary-hover dark:text-primary font-bold rounded-full border border-primary/20 bg-primary/10 hover:bg-primary/20 shadow-2xs"
                            title="Aktuelle Filter nur in diesem Browser speichern; ersetzt die bisherige Suche"
                        >
                            {savedSearch ? <><Bookmark size={13} className="fill-current" /> Gemerkt</> : <><Bookmark size={13} /> Merken</>}
                        </Button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                        type="search"
                        aria-label="Anzeigen nach Fach oder Name durchsuchen"
                        placeholder="Suchen nach Fächern, Namen..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Quick Subject Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar text-xs min-w-0">
                    <span className="text-gray-900 dark:text-white font-extrabold shrink-0 text-xs uppercase mr-1">Beliebt:</span>
                    {(['mathematik', 'deutsch', 'englisch', 'physik', 'latein', 'franzoesisch', 'chemie', 'informatik'] as Subject[]).map((subj) => (
                        <button
                            key={subj}
                            onClick={() => {
                                setFilterSubject(filterSubject === subj ? null : subj);
                                if ('vibrate' in navigator) navigator.vibrate([15]);
                            }}
                            aria-pressed={filterSubject === subj}
                            className={cn(
                                "px-3 min-h-[40px] py-2 rounded-full border transition-all shrink-0 font-medium",
                                filterSubject === subj
                                    ? "bg-primary text-black font-bold border-primary shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300"
                            )}
                        >
                            {subjectLabelMap[subj] || subj}
                        </button>
                    ))}
                    {filterSubject && (
                        <button
                            onClick={() => setFilterSubject(null)}
                            aria-label="Fachfilter zurücksetzen"
                            className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-xs font-bold shrink-0 inline-flex items-center gap-1"
                        >
                            <X size={12} /> Zurücksetzen
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <p className="text-xs font-bold text-gray-400" aria-live="polite">
                        {loading
                            ? 'Ergebnisse werden geladen…'
                            : fetchError
                                ? 'Ergebnisse konnten nicht geladen werden'
                                : `${sortedAds.length} ${sortedAds.length === 1 ? 'Anzeige' : 'Anzeigen'}`}
                    </p>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                        <ArrowUpDown size={13} className="shrink-0" />
                        <span className="sr-only">Sortierung</span>
                        <select
                            value={sortKey}
                            onChange={e => { if (isValidSortKey(e.target.value)) { setSortKey(e.target.value); triggerHaptic('selection'); } }}
                            className="bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 border border-transparent focus:border-primary focus:outline-none cursor-pointer max-w-[11rem] truncate"
                            aria-label="Anzeigen sortieren"
                        >
                            {SORT_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </label>
                    {hasActiveFilters && !loading && (
                        <button
                            type="button"
                            onClick={() => { resetAllFilters(); triggerHaptic('light'); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0 cursor-pointer"
                        >
                            <X size={12} /> Filter zurücksetzen
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft space-y-6 min-w-0 overflow-x-clip"
                        >

                            {/* Type & Price */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white mb-2 block">Typ</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => { triggerHaptic('selection'); setFilterType('all'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterType === 'all' ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Alle</button>
                                        <button onClick={() => { triggerHaptic('selection'); setFilterType('offer'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterType === 'offer' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Angebote</button>
                                        <button onClick={() => { triggerHaptic('selection'); setFilterType('search'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterType === 'search' ? GESUCHE_PILL_ACTIVE : GESUCHE_PILL_IDLE}`}>Gesuche</button>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 px-3.5 pt-2.5 pb-8">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <label className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">Preis pro Stunde</label>
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{minPrice}€ – {maxPrice}€</span>
                                    </div>
                                    <PriceRangeSlider
                                        min={PRICE_SLIDER_MIN}
                                        max={PRICE_SLIDER_MAX}
                                        value={{ min: minPrice, max: maxPrice }}
                                        onChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }}
                                    />
                                </div>
                            </div>

                            {/* Grade */}
                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white mb-2 block">Klassenstufe</label>
                                <GradeSelector selectedGrades={filterGrade} onChange={setFilterGrade} className="justify-start" />
                            </div>

                            {/* Subjects */}
                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white mb-2 block">Fach</label>
                                <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2">
                                    {SUBJECT_CATEGORIES.map(category => (
                                        <div key={category.title}>
                                            <h3 className="inline-block rounded-md bg-gray-950 dark:bg-black px-2 py-1 text-xs font-bold text-white uppercase tracking-wide mb-2">{category.title}</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {category.subjects.map((s: Subject) => (
                                                    <SubjectChip
                                                        key={s}
                                                        subject={s}
                                                        selected={filterSubject === s}
                                                        onClick={() => setFilterSubject(filterSubject === s ? null : s)}
                                                        className="cursor-pointer"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {savedSearch && !loading && !fetchError && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 min-w-0 overflow-x-clip">
                    <div className="flex items-center gap-2 min-w-0 text-sm">
                        <Bookmark size={15} className="text-primary-hover dark:text-primary shrink-0 fill-current" />
                        <span className="font-bold text-gray-700 dark:text-gray-200 shrink-0">Gemerkte Suche:</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">
                            {savedSearch.query ? `„${savedSearch.query}“` : 'Alle Anzeigen'}
                            {savedSearch.subject ? ` · ${savedSearch.subject}` : ''}
                            {savedSearch.grades.length > 0 ? ` · Kl. ${savedSearch.grades.join(', ')}` : ''}
                            {savedSearch.minPrice > PRICE_SLIDER_MIN || savedSearch.maxPrice < PRICE_SLIDER_MAX
                                ? ` · ${savedSearch.minPrice}–${savedSearch.maxPrice}€`
                                : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={applySavedSearch}
                            className="h-8 px-3 text-xs font-bold rounded-full border-primary/30"
                        >
                            Suchen
                        </Button>
                        <button
                            type="button"
                            onClick={discardSavedSearch}
                            aria-label="Gemerkte Suche verwerfen"
                            title="Gemerkte Suche verwerfen"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* Infos: eine schlanke Zeile mit den drei Zielen, Details erst auf Wunsch */}
            <div className="mb-6">
            <div className="flex items-center gap-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 pl-3 pr-1.5 py-1.5 shadow-sm overflow-x-auto">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 shrink-0">Infos</span>
                <button
                    type="button"
                    onClick={() => navigate('/coaching')}
                    className="shrink-0 inline-flex items-center min-h-[40px] px-3 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    Coaching · Di 13:45 H310
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/coaching', { state: { section: 'foerderung' } })}
                    className="shrink-0 inline-flex items-center min-h-[40px] px-3 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    Förderunterricht
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/eltern-leitfaden')}
                    className="shrink-0 inline-flex items-center min-h-[40px] px-3 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    Eltern
                </button>
                <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={showBanners}
                    className={cn(
                        "ml-auto h-8 text-xs rounded-full font-bold transition-all shadow-sm flex items-center gap-1 shrink-0",
                        showBanners
                            ? "bg-primary text-black border-primary hover:bg-primary-hover dark:bg-primary dark:text-black"
                            : "bg-primary border-primary text-black hover:bg-primary/95"
                    )}
                    onClick={() => { const next = !showBanners; setShowBanners(next); try { localStorage.setItem('feed_show_banners', String(next)); } catch { /* ignore */ } }}
                >
                    {showBanners ? (
                        <><span>Details verbergen</span><ChevronUp size={14} /></>
                    ) : (
                        <><span>Details</span><ChevronDown size={14} /></>
                    )}
                </Button>
            </div>

                {showBanners && (
                    <div className="mt-3 space-y-4 animate-in slide-in-from-top-2">
                            {/* Info Block für Schüler-Coaching (editierbar im Coach-Panel) */}
                        {coachInfo.is_visible && (
                            <Card className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none" aria-hidden="true">
                                    <GraduationCap size={96} />
                                </div>
                                <CardContent className="p-6 relative z-10 space-y-4">
                                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                                            <GraduationCap size={20} />
                                        </div>
                                        <h2 className="text-lg font-bold">{coachInfo.title}</h2>
                                    </div>
                                    <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed whitespace-pre-line">
                                        {coachInfo.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white/60 dark:bg-black/20 p-3 rounded-xl text-sm font-semibold text-blue-800 dark:text-blue-300 min-w-0">
                                        {coachInfo.time && (
                                            <span className="flex items-center gap-1.5"><Clock size={16} /> {coachInfo.time}</span>
                                        )}
                                        {coachInfo.room && (
                                            <span className="flex items-center gap-1.5"><MapPin size={16} /> {coachInfo.room}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Förderunterricht Info Block (Stundenplan steht auf der Coaching-Seite) */}
                        <Card className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden relative">
                            <CardContent className="p-6 relative z-10 space-y-4">
                                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                                        <GraduationCap size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold">Förderunterricht Sek. I (2. HJ)</h2>
                                </div>
                                <div className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed space-y-2">
                                    <p>Förderunterricht wird in den Jahrgangsstufen 5-10 in den Fächern Deutsch, Mathematik, Englisch und Latein erteilt. Die Entscheidung über eine Anmeldung liegt bei den Eltern.</p>
                                    <p><strong>Start:</strong> Mittwoch, 18.02. in der 7. Stunde (Kick-off in H408). Danach regulär in H402.</p>
                                    <p>Anmeldung verbindlich über: <a href="mailto:foerderunterricht@fwg-koeln.nrw.schule" className="underline font-bold">foerderunterricht@fwg-koeln.nrw.schule</a></p>
                                    <p>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/coaching', { state: { section: 'foerderung' } })}
                                            className="underline font-bold"
                                        >
                                            Stundenplan auf der Coaching-Seite ansehen
                                        </button>
                                    </p>
                                </div>

                                <div className="mt-4 text-xs text-center text-gray-500">
                                    Terminabsprachen für ein Lerncoaching trefft ihr gerne individuell persönlich oder per Mail mit Herr Gampp, Frau Hallerbach, Frau Trottmann oder Frau Weyers:<br />
                                    <a href="mailto:lerncoaching@fwg-koeln.nrw.schule" className="underline font-bold">lerncoaching@fwg-koeln.nrw.schule</a>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Eltern-Leitfaden Info Block */}
                        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 shadow-sm overflow-hidden relative">
                            <CardContent className="p-6 relative z-10 space-y-4">
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                                        <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h2 className="text-lg font-bold">Leitfaden für Eltern & Sicherheit</h2>
                                </div>
                                <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                                    Sicherheit und Jugendschutz haben oberste Priorität. Alle Accounts werden persönlich durch die Schülervertretung verifiziert. Mehr zu Maßnahmen, Verhaltensregeln und Kontakt steht im ausführlichen Leitfaden.
                                </p>
                                <div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => navigate('/eltern-leitfaden')}
                                        className="rounded-full border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold"
                                    >
                                        Eltern-Leitfaden lesen
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <div className="grid gap-4 min-w-0">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">Lade Anzeigen...</div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8 min-w-0 overflow-hidden">
                        <div className="w-24 h-24 mb-6 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                            <SearchX size={40} className="text-red-400 dark:text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Anzeigen konnten nicht geladen werden</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">Prüfe deine Internetverbindung und versuche es erneut.</p>
                        <Button onClick={() => fetchAds()} className="rounded-full shadow-md">Erneut versuchen</Button>
                    </div>
                ) : sortedAds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8 min-w-0 overflow-hidden">
                        <div className="w-24 h-24 mb-6 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                            <Search size={40} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        {hasActiveFilters ? (
                            <>
                                <h3 className="text-xl font-bold mb-2">Keine Treffer für diese Filter</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">Keine Anzeige passt zu deiner aktuellen Suche. Setze die Filter zurück oder erstelle selbst eine Anzeige!</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button variant="outline" onClick={() => { resetAllFilters(); triggerHaptic('light'); }} className="rounded-full shadow-sm">Filter zurücksetzen</Button>
                                    <Button onClick={() => navigate('/create-ad')} className="rounded-full shadow-md">Anzeige erstellen</Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold mb-2">Der Feed ist leer</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">Aktuell gibt es keine aktiven Anzeigen. Erstelle selbst etwas!</p>
                                <Button onClick={() => navigate('/create-ad')} className="rounded-full shadow-md">Anzeige erstellen</Button>
                            </>
                        )}
                    </div>
                ) : (
                    sortedAds.map((ad) => {
                        const matchScore = countMatches(myAvailability, ad.profiles_avail || emptyAvailability());
                        const boosted = isAdBoosted(ad);
                        return (
                        <Card
                            key={ad.id}
                            className={cn(
                                "overflow-hidden hover:shadow-md transition-all cursor-pointer min-w-0 w-full",
                                boosted && "ring-1 ring-yellow-400/60 boosted-glow"
                            )}
                            onClick={() => navigate(`/ad/${ad.id}`)}
                        >
                            {boosted && (
                                <div className="bg-gradient-to-r from-yellow-400/20 via-amber-400/15 to-yellow-400/20 border-b border-yellow-400/30 px-4 py-1.5 flex items-center gap-1.5" title="Diese Anzeige wird hervorgehoben (z. B. Coach-Status oder Aktion). Warum? Siehe Seite „Schüler-Coaching“.">
                                    <Sparkles size={12} className="text-yellow-600 dark:text-yellow-400" />
                                    <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 tracking-wide uppercase">Hervorgehobene Anzeige</span>
                                </div>
                            )}
                            <CardHeader className={cn(
                                "p-4 pb-3 border-b flex flex-row justify-between items-start gap-3 min-w-0",
                                boosted
                                    ? "bg-yellow-50/70 dark:bg-yellow-950/20 border-yellow-300/50"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                            )}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-base sm:text-lg truncate text-gray-950 dark:text-white">{ad.profiles?.display_name || 'Unbekannt'}</h3>
                                        <span className={cn(
                                            "text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                                            ad.type === 'search'
                                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                        )}>
                                            {ad.type === 'search' ? 'Suche' : 'Bietet'}
                                        </span>
                                        {ad.profiles?.is_verified && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-500/12 text-green-700 dark:text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full shrink-0">
                                                <ShieldCheck size={12} aria-hidden="true" /> Verifiziert
                                            </span>
                                        )}
                                        {ad.profiles?.is_coach && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full shrink-0" title="Mitglied der Schüler-Coaching AG">
                                                <Award size={12} className="text-amber-600 dark:text-amber-400" />
                                                Coach
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1.5">
                                        <GraduationCap size={13} /> Klasse {ad.profiles?.grade_level || '?'}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="text-right">
                                        <div className="text-sm sm:text-base font-bold tabular-nums text-gray-950 dark:text-white whitespace-nowrap">
                                            {formatPrice(ad)}
                                        </div>
                                        {priceSecondary(ad) && (
                                            <div className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400 mt-0.5">
                                                {priceSecondary(ad)}
                                            </div>
                                        )}
                                    </div>
                                    {filterByTime && matchScore > 0 && (
                                        <div className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                            <CalendarDays size={12} /> {matchScore} Übereinstimmung{matchScore !== 1 ? 'en' : ''}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {ad.subjects.map(s => <SubjectChip key={s} subject={s} />)}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                    {ad.short_description}
                                </p>
                            </CardContent>
                            <CardFooter className={cn(
                                "p-3 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap justify-between items-center gap-2 border-t border-gray-100 dark:border-gray-800",
                                boosted ? "bg-yellow-50/40 dark:bg-yellow-950/10" : "bg-gray-50/80 dark:bg-gray-900/40"
                            )}>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-0">
                                    {ad.locations && ad.locations[0] && (
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {ad.locations[0]} {ad.locations.length > 1 ? `+${ad.locations.length - 1}` : ''}</span>
                                    )}
                                    <span className="flex items-center gap-1"><Clock size={12} /> {Array.isArray(ad.duration_minutes) && ad.duration_minutes.length > 0 ? ad.duration_minutes.map((d: number) => d === 0 ? 'Egal' : `${d} Min.`).join(' • ') : 'Flexibel'}</span>
                                    {ad.session_format && ad.session_format !== 'any' && (
                                        <span className="flex items-center gap-1"><Users size={12} /> {ad.session_format === 'single' ? 'Einzeln' : 'Kleingruppe'}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic('light');
                                            setShareAd({ id: ad.id, title: `${ad.subjects?.[0]?.toUpperCase() || 'Nachhilfe'}: ${ad.profiles?.display_name || ''}` });
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors min-h-[36px] min-w-[36px]"
                                        title="Anzeige teilen"
                                    >
                                        <Share2 size={13} />
                                    </button>
                                </div>
                            </CardFooter>
                        </Card>
                        );
                    })
                )}
            </div>

            {/* Share Dialog */}
            {shareAd && (
                <ShareDialog
                    type="ad"
                    adId={shareAd.id}
                    title={shareAd.title}
                    isOpen={shareAd !== null}
                    onClose={() => setShareAd(null)}
                />
            )}
        </div>
    );
}
