import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CollapsedNewsWidget } from '../components/CollapsedNewsWidget';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/Card';
import { SubjectChip, SUBJECT_CATEGORIES, type Subject } from '../components/SubjectChip';
import { GraduationCap, MapPin, Clock, Filter, Search, CalendarDays, ShieldCheck, ChevronDown, ChevronUp, Share2, Sparkles, Bookmark, X, SearchX, Award, Users } from 'lucide-react';
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
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { api } from '../lib/api';

interface Ad {
    id: string;
    user_id: string;
    type: 'offer' | 'search';
    subjects: Subject[];
    grade_levels: string[];
    locations: string[];
    price_details: { mode?: string; value?: string | number } | null;
    duration_minutes?: number[];
    session_format?: 'single' | 'group' | 'any' | string;
    view_count?: number;
    short_description: string;
    is_active: boolean;
    created_at: string;
    boosted?: boolean;
    boosted_until?: string | null;
    profiles?: { display_name: string; is_verified: boolean; grade_level: string; is_coach?: boolean };
    profiles_avail?: Availability;
}

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 100;
const SAVED_SEARCH_KEY = 'fwg_saved_search';
const GRADE_VALUES = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];

interface SavedSearch {
    query: string;
    type: 'all' | 'offer' | 'search';
    subject: Subject | null;
    grades: string[];
    minPrice: number;
    maxPrice: number;
    onlyCoaches: boolean;
    filterByTime: boolean;
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
        // `{profil.is_coach && <Badge>}` würde sonst eine sichtbare „0" rendern.
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
            return localStorage.getItem('feed_show_banners') !== 'false';
        } catch {
            return true;
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
        filterOnlyCoaches || filterByTime
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
        // Price
        if (ad.price_details?.mode === 'fixed') {
            const val = Number(ad.price_details.value);
            if (val < minPrice || val > maxPrice) return false;
        }
        // Free logic (included if minPrice is 0)
        if (ad.price_details?.mode === 'free' && minPrice > 0) return false;

        // Coach filter
        if (filterOnlyCoaches && !ad.profiles?.is_coach) return false;

        return true;
    });

    const isAdBoosted = (ad: Ad): boolean => {
        return Boolean(ad?.boosted && ad?.boosted_until && new Date(ad.boosted_until) > new Date());
    };

    // Sort: Boosted ads always on top, then matching score or created date.
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
        <div className="p-4 space-y-4 max-w-3xl mx-auto pb-24">
            {/* Eingeklappte News-Sektion auf der Startseite */}
            <CollapsedNewsWidget />
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">Aktuelle Anzeigen</h1>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {user && (
                            <button
                                onClick={() => { setFilterByTime(!filterByTime); triggerHaptic('selection'); }}
                                aria-pressed={filterByTime}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border font-semibold transition-all cursor-pointer ${
                                    filterByTime
                                        ? 'bg-green-100 border-green-400 text-green-700'
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
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border font-semibold transition-all cursor-pointer ${
                                filterOnlyCoaches
                                    ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
                            }`}
                            title="Nur Schüler-Coaches der AG anzeigen"
                        >
                            <Award size={13} className={filterOnlyCoaches ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'} />
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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                    <span className="text-gray-400 font-bold shrink-0 text-[10px] uppercase mr-1">Beliebt:</span>
                    {(['mathe', 'deutsch', 'englisch', 'physik', 'latein', 'französisch', 'chemie', 'informatik'] as Subject[]).map((subj) => (
                        <button
                            key={subj}
                            onClick={() => {
                                setFilterSubject(filterSubject === subj ? null : subj);
                                if ('vibrate' in navigator) navigator.vibrate([15]);
                            }}
                            aria-pressed={filterSubject === subj}
                            className={cn(
                                "px-3 py-1 rounded-full border transition-all shrink-0 capitalize font-medium",
                                filterSubject === subj
                                    ? "bg-primary text-black font-bold border-primary shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300"
                            )}
                        >
                            {subj}
                        </button>
                    ))}
                    {filterSubject && (
                        <button
                            onClick={() => setFilterSubject(null)}
                            aria-label="Fachfilter zurücksetzen"
                            className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-xs font-bold shrink-0 inline-flex items-center gap-1"
                        >
                            <X size={12} /> Filter zurücksetzen
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-gray-400" aria-live="polite">
                        {loading
                            ? 'Ergebnisse werden geladen…'
                            : fetchError
                                ? 'Ergebnisse konnten nicht geladen werden'
                                : `${sortedAds.length} ${sortedAds.length === 1 ? 'Anzeige' : 'Anzeigen'}`}
                    </p>
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
                            className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft space-y-6"
                        >

                            {/* Type & Price */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2 block">Typ</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => { triggerHaptic('selection'); setFilterType('all'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterType === 'all' ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Alle</button>
                                        <button onClick={() => { triggerHaptic('selection'); setFilterType('offer'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterType === 'offer' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Angebote</button>
                                        <button onClick={() => { triggerHaptic('selection'); setFilterType('search'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterType === 'search' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Gesuche</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2 block">Preis (€)</label>
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
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2 block">Klassenstufe</label>
                                <GradeSelector selectedGrades={filterGrade} onChange={setFilterGrade} className="justify-start" />
                            </div>

                            {/* Subjects */}
                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2 block">Fach</label>
                                <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2">
                                    {SUBJECT_CATEGORIES.map(category => (
                                        <div key={category.title}>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">{category.title}</h4>
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
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5">
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

            {/* Banner Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Aktuelles & Infos</h2>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn(
                            "h-8 text-xs rounded-full font-bold transition-all shadow-sm flex items-center gap-1",
                            showBanners 
                                ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-200" 
                                : "bg-primary border-primary text-black hover:bg-primary/95"
                        )}
                        onClick={() => { const next = !showBanners; setShowBanners(next); localStorage.setItem('feed_show_banners', String(next)); }}
                    >
                        {showBanners ? (
                            <><span>Infos ausblenden</span><ChevronUp size={14} /></>
                        ) : (
                            <><span>Infos anzeigen</span><ChevronDown size={14} /></>
                        )}
                    </Button>
                </div>

                {showBanners && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        {/* Info Block für Schüler-Coaching (editierbar im Coach-Panel) */}
                        {coachInfo.is_visible && (
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-950/40 border border-blue-200 dark:border-blue-900/50 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <GraduationCap size={120} />
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
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white/60 dark:bg-black/20 p-3 rounded-xl inline-flex text-sm font-semibold text-blue-800 dark:text-blue-300">
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

                        {/* Förderunterricht Info Block */}
                        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden relative">
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
                                </div>

                                <div className="overflow-x-auto mt-4 bg-white dark:bg-gray-950 rounded-xl p-2 border border-indigo-100 dark:border-indigo-900/50">
                                    <table className="w-full text-center text-xs md:text-sm border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="border p-2 border-gray-200 dark:border-gray-800">Montag</th>
                                                <th className="border p-2 border-gray-200 dark:border-gray-800">Dienstag</th>
                                                <th className="border p-2 border-gray-200 dark:border-gray-800">Mittwoch</th>
                                                <th className="border p-2 border-gray-200 dark:border-gray-800">Donnerstag</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D</td>
                                                <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D</td>
                                                <td className="border p-2 bg-green-200/50 dark:bg-green-900/50 border-gray-200 dark:border-gray-800 text-green-800 dark:text-green-200 font-bold">M</td>
                                                <td className="border p-2 bg-green-200/50 dark:bg-green-900/50 border-gray-200 dark:border-gray-800 text-green-800 dark:text-green-200 font-bold">M</td>
                                            </tr>
                                            <tr>
                                                <td className="border p-2 bg-blue-200/50 dark:bg-blue-900/50 border-gray-200 dark:border-gray-800 text-blue-800 dark:text-blue-200 font-bold">E</td>
                                                <td className="border p-2 bg-pink-200/50 dark:bg-pink-900/50 border-gray-200 dark:border-gray-800 text-pink-800 dark:text-pink-200 font-bold">L</td>
                                                <td className="border p-2 bg-pink-200/50 dark:bg-pink-900/50 border-gray-200 dark:border-gray-800 text-pink-800 dark:text-pink-200 font-bold">L</td>
                                                <td className="border p-2 bg-blue-200/50 dark:bg-blue-900/50 border-gray-200 dark:border-gray-800 text-blue-800 dark:text-blue-200 font-bold">E</td>
                                            </tr>
                                            <tr>
                                                <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D/LRS</td>
                                                <td className="border p-2 border-gray-200 dark:border-gray-800"></td>
                                                <td className="border p-2 border-gray-200 dark:border-gray-800"></td>
                                                <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D/LRS</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="text-[10px] md:text-xs text-center mt-3 text-gray-500">
                                        Terminabsprachen für ein Lerncoaching trefft ihr gerne individuell persönlich oder per Mail mit Herr Gampp, Frau Hallerbach, Frau Trottmann oder Frau Weyers:<br/>
                                        <a href="mailto:lerncoaching@fwg-koeln.nrw.schule" className="underline font-bold">lerncoaching@fwg-koeln.nrw.schule</a>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Eltern-Leitfaden Info Block */}
                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/50 shadow-sm overflow-hidden relative">
                            <CardContent className="p-6 relative z-10 space-y-4">
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                                        <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h2 className="text-lg font-bold">Leitfaden für Eltern & Sicherheit</h2>
                                </div>
                                <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                                    Sicherheit und Jugendschutz haben oberste Priorität. Alle Accounts werden persönlich durch die Schülervertretung verifiziert. Erfahren Sie mehr über unsere Maßnahmen, Verhaltensregeln und Kontaktaufnahme in unserem ausführlichen Leitfaden.
                                </p>
                                <div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => navigate('/eltern-leitfaden')}
                                        className="rounded-full border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-850 dark:text-emerald-300 font-semibold"
                                    >
                                        Eltern-Leitfaden lesen
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">Lade Anzeigen...</div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                        <div className="w-24 h-24 mb-6 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                            <SearchX size={40} className="text-red-400 dark:text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Anzeigen konnten nicht geladen werden</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">Prüfe deine Internetverbindung und versuche es erneut.</p>
                        <Button onClick={() => fetchAds()} className="rounded-full shadow-md">Erneut versuchen</Button>
                    </div>
                ) : sortedAds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
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
                                "overflow-hidden hover:shadow-md transition-all cursor-pointer",
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
                                "p-4 border-b border-gray-100 dark:border-gray-800 flex flex-row justify-between items-start",
                                boosted
                                    ? "bg-yellow-50/60 dark:bg-yellow-900/10"
                                    : "bg-gray-50/50 dark:bg-gray-800/50"
                            )}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{ad.profiles?.display_name || 'Unbekannt'}</h3>
                                        {ad.profiles?.is_verified && (
                                            <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full border border-green-200">Verifiziert</span>
                                        )}
                                        {ad.profiles?.is_coach && (
                                            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 font-semibold flex items-center gap-1" title="Mitglied der Schüler-Coaching AG">
                                                <Award size={11} className="text-amber-600 dark:text-amber-400" />
                                                Coach
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                        <GraduationCap size={14} /> {ad.profiles?.grade_level || '?'}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className={cn(
                                        "px-2 py-1 rounded text-sm font-semibold shadow-sm border",
                                        boosted
                                            ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300"
                                            : "bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600"
                                    )}>
                                        {ad.price_details?.mode === 'free' ? 'Kostenlos' : (ad.price_details?.mode === 'vb' ? 'VB' : (ad.price_details?.value !== null && ad.price_details?.value !== undefined && ad.price_details.value !== '' ? `${ad.price_details.value}€` : 'Preis auf Anfrage'))}
                                    </div>
                                    {filterByTime && matchScore > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                            <CalendarDays size={10} /> {matchScore} Übereinstimmung{matchScore !== 1 ? 'en' : ''}
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
                                "p-3 text-xs text-gray-400 flex justify-between items-center",
                                boosted ? "bg-yellow-50/40 dark:bg-yellow-900/5" : "bg-gray-50 dark:bg-gray-900/40"
                            )}>
                                <div className="flex gap-3">
                                    {ad.locations && ad.locations[0] && (
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {ad.locations[0]} {ad.locations.length > 1 ? `+${ad.locations.length - 1}` : ''}</span>
                                    )}
                                    <span className="flex items-center gap-1"><Clock size={12} /> {Array.isArray(ad.duration_minutes) && ad.duration_minutes.length > 0 ? ad.duration_minutes.map((d: number) => d === 0 ? 'Egal' : `${d} Min.`).join(' • ') : 'Flexibel'}</span>
                                    {ad.session_format && ad.session_format !== 'any' && (
                                        <span className="flex items-center gap-1"><Users size={12} /> {ad.session_format === 'single' ? 'Einzeln' : 'Kleingruppe'}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {ad.profiles?.is_coach && (
                                        <span className="text-amber-700 dark:text-amber-400 font-semibold text-[10px] flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40">
                                            <Award size={10} /> Schüler-Coach AG
                                        </span>
                                    )}
                                    {boosted && (
                                        <span className="text-yellow-600 dark:text-yellow-500 font-semibold text-[10px] flex items-center gap-0.5" title="Hervorgehoben (z. B. Coach-Status oder Aktion)">
                                            <Sparkles size={10} /> Hervorgehoben
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic('light');
                                            setShareAd({ id: ad.id, title: `${ad.subjects?.[0]?.toUpperCase() || 'Nachhilfe'}: ${ad.profiles?.display_name || ''}` });
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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
