import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { NativeSelect } from '@/components/ui/native-select';
import { useEffect, useState } from 'react';
import { CollapsedNewsWidget } from '../components/CollapsedNewsWidget';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card';
import { SubjectChip, SUBJECT_CATEGORIES, subjectLabelMap, type Subject } from '../components/SubjectChip';
import { GraduationCap, MapPin, Clock, Filter, Search, CalendarDays, ShieldCheck, ChevronDown, ChevronUp, Share2, Sparkles, Bookmark, X, SearchX, Award, Users, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet';
import { Skeleton } from '../components/ui/skeleton';
import { GradeSelector } from '../components/GradeSelector';
import { Input } from '../components/ui/input';
import { PriceRangeSlider } from '../components/PriceRangeSlider';
import { useAuth } from '../context/AuthContext';
import { emptyAvailability, countMatches, type Availability } from '../lib/availability';
import { toast } from 'sonner';
import ShareDialog from '../components/ShareDialog';
import { cn, formatAdPrice, hourlyRate, type PriceDetails } from '../lib/utils';
import {
    PRICE_SLIDER_MIN,
    PRICE_SLIDER_MAX,
    SAVED_SEARCH_KEY,
    filtereAnzeigen,
    istGeboostet,
    isValidSortKey,
    ladeGespeicherteSuche,
    parseGespeicherteSuche,
    speichereGespeicherteSuche,
    sortiereAnzeigen,
    verwerfeGespeicherteSuche,
    type SavedSearch,
    type SortKey,
} from '../lib/anzeigen';
import { triggerHaptic } from '../lib/haptics';
import { api, apiErrorMessage } from '../lib/api';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import {
    createDefaultCoachingDocument,
    parseCoachingDocument,
    scheduleCellClass,
    type CoachingDocument,
    type CoachingPosterBlock,
    type CoachingSupportBlock,
} from './Coaching';

const DEFAULT_COACHING_DOC = createDefaultCoachingDocument();

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

// Aktive Filterpille und Ruhezustand nutzen dieselbe Markenfläche.
const GESUCHE_PILL_ACTIVE = 'bg-muted text-foreground';
const GESUCHE_PILL_IDLE = 'bg-muted text-muted-foreground';
// „Beliebt:“-Fächer (B2): Standardliste, bis echte Klicks ein Ranking liefern
const POPULAR_FALLBACK: Subject[] = ['mathematik', 'deutsch', 'englisch', 'physik', 'latein', 'franzoesisch', 'chemie', 'informatik'];
let popularSubjectsMemory: Subject[] | null = null;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'newest', label: 'Neueste zuerst' },
    { value: 'oldest', label: 'Älteste zuerst' },
    { value: 'cheapest', label: 'Günstigste zuerst' },
    { value: 'priciest', label: 'Teuerste zuerst' },
    { value: 'popular', label: 'Beliebteste zuerst' },
    { value: 'saved', label: 'Meistgespeichertste zuerst' },
];

function formatPrice(ad: Ad): string {
    return formatAdPrice(ad.price_details);
}

function priceSecondary(ad: Ad): string | null {
    const h = hourlyRate(ad.price_details);
    if (h === null || h === 0) return null;
    const text = Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',');
    return `≈ ${text} €/h`;
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

async function loadAds(): Promise<Ad[]> {
    const { data: adsData, error } = await api.ads.list({ all: true });
    if (error) throw error;
    if (!adsData) throw new Error('Missing ads response');
    if (adsData.length === 0) return [];
    // Profil-Daten kommen direkt aus der Anzeigen-Antwort (ads.php bettet `profiles` je Zeile ein);
    // der frühere Sammel-Lookup lief über einen admin-only Endpunkt und ist entfernt.
    return (adsData as any[]).map(ad => {
        const prof = ad.profiles;
        // Booleans normalisieren: MySQL liefert TINYINT (0/1) – ein rohes
        // `{profil.is_coach && <Badge>}` würde sonst eine sichtbare „0“ rendern.
        const safeProfile = prof ? {
            ...prof,
            is_coach: Boolean(prof.is_coach),
            is_verified: Boolean(prof.is_verified),
        } : prof;
        return {
            ...ad,
            subjects: Array.isArray(ad.subjects) ? ad.subjects : [],
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
    const [fetchError, setFetchError] = useState<unknown>(null);
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
    const [savedSearch, setSavedSearch] = useState<SavedSearch | null>(() => ladeGespeicherteSuche());
    const [savedSearchId, setSavedSearchId] = useState<string | null>(null);
    const [popularSubjects, setPopularSubjects] = useState<Subject[]>(POPULAR_FALLBACK);

    // „Beliebt:“-Fächer: 1 Fetch pro Session (Memory-Cache), Fallback bleibt die Standardliste
    useEffect(() => {
        if (popularSubjectsMemory) {
            setPopularSubjects(popularSubjectsMemory);
            return;
        }
        api.analytics.popularSubjects()
            .then(({ data, error }) => {
                if (error || !data) return;
                const list = (((data as any)?.subjects ?? []) as string[]).filter((s): s is Subject => s in subjectLabelMap);
                if (list.length === 0) return;
                popularSubjectsMemory = list;
                setPopularSubjects(list);
            })
            .catch(() => { /* Fallback-Liste bleibt */ });
    }, []);

    // Gemerkte Suche: Server als Quelle der Wahrheit, localStorage als Offline-Fallback (B4)
    useEffect(() => {
        let cancelled = false;
        api.savedSearches.list()
            .then(({ data, error }) => {
                if (cancelled) return;
                if (error || !data) return;
                const first = ((data as any)?.searches ?? [])[0];
                const parsed = first ? parseGespeicherteSuche(first.query) : null;
                if (parsed) {
                    setSavedSearchId(first?.id ?? null);
                    setSavedSearch(parsed);
                    try { localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(parsed)); } catch { /* ignore */ }
                } else {
                    setSavedSearchId(null);
                    setSavedSearch((current) => {
                        if (current) void api.savedSearches.save(current).catch(() => { /* offline */ });
                        return current;
                    });
                }
            })
            .catch(() => { /* offline: localStorage-Stand bleibt */ });
        return () => { cancelled = true; };
    }, []);

    // Coaching Startseiten-Info
    const [coachInfo, setCoachInfo] = useState<{
        title: string;
        description: string;
        time: string;
        room: string;
        is_visible: boolean;
    }>({
        title: 'Coaching-AG für Klasse 5 und 6',
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
        }).catch((err: unknown) => {
            if (!cancelled) setFetchError(err);
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

    // Förderunterricht & Coaching-Inhalte: eine Quelle im Coach-Panel (Tab „Seite“)
    const [coachingDoc, setCoachingDoc] = useState<CoachingDocument>(() => createDefaultCoachingDocument());

    useEffect(() => {
        api.coach.getCoachingPage().then(res => {
            if (res.data) setCoachingDoc(parseCoachingDocument(res.data as Record<string, unknown>));
        }).catch(err => console.error('Coaching page load error:', err));
    }, []);

    const supportBlock = (coachingDoc.blocks.find((b): b is CoachingSupportBlock => b.type === 'support')
        ?? DEFAULT_COACHING_DOC.blocks.find((b): b is CoachingSupportBlock => b.type === 'support')) as CoachingSupportBlock;

    const posterBlock = (coachingDoc.blocks.find((b): b is CoachingPosterBlock => b.type === 'poster')
        ?? DEFAULT_COACHING_DOC.blocks.find((b): b is CoachingPosterBlock => b.type === 'poster')) as CoachingPosterBlock;

    useEffect(() => {
        if (user) {
            api.profiles.get(user.id).then(({ data }) => {
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

    const activeFilterCount = [
        Boolean(searchQuery),
        Boolean(filterSubject),
        filterGrade.length > 0,
        filterType !== 'all',
        minPrice !== PRICE_SLIDER_MIN || maxPrice !== PRICE_SLIDER_MAX,
        filterOnlyCoaches,
        filterByTime,
    ].filter(Boolean).length;

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
        if (!verwerfeGespeicherteSuche()) {
            toast.error('Gespeicherte Suche konnte nicht gelöscht werden. Bitte erneut versuchen.');
            return;
        }
        if (savedSearchId) {
            const id = savedSearchId;
            setSavedSearchId(null);
            void api.savedSearches.remove(id).catch(() => { /* offline: wird beim nächsten Speichern ersetzt */ });
        }
        setSavedSearch(null);
        triggerHaptic('light');
        toast.success('Gespeicherte Suche entfernt.');
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
        if (!speichereGespeicherteSuche(entry)) {
            toast.error('Suche konnte nicht gespeichert werden.');
            return;
        }
        setSavedSearch(entry);
        triggerHaptic('light');
        toast.success('Suche gespeichert. Du kannst sie hier jederzeit wieder anwenden.');
        setSavedSearchId(null);
        void api.savedSearches.save(entry)
            .then(({ data, error }) => {
                const saved = (data as any)?.search;
                if (!error && saved?.id) setSavedSearchId(saved.id);
            })
            .catch(() => { /* offline: localStorage-Fallback greift */ });
    };

    // Filter (Suche, Typ, Fach, Klasse, Preis, Coaches) liegt in lib/anzeigen.ts.
    const filteredAds = filtereAnzeigen(ads, {
        query: searchQuery,
        type: filterType,
        subject: filterSubject,
        grades: filterGrade,
        minPrice,
        maxPrice,
        onlyCoaches: filterOnlyCoaches,
    });

    // Sortierung (Boost oben, Nachwuchs unten, Coach-Bonus) liegt in lib/anzeigen.ts.
    const sortedAds = sortiereAnzeigen(filteredAds, { sortKey, filterByTime, myAvailability });

    return (
        <div className="w-full min-w-0 max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 overflow-x-clip">
            {/* Eingeklappte News-Sektion auf der Startseite */}
            <CollapsedNewsWidget />
            <div className="relative flex flex-col gap-4 mb-6 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="min-w-0">
                        <h1 className="min-w-0 text-xl font-semibold leading-tight tracking-tight sm:text-2xl">Aktuelle Anzeigen</h1>
                    </div>
                    <div className="grid w-full grid-cols-2 items-center gap-2 min-w-0 sm:flex sm:w-auto sm:flex-wrap sm:gap-1.5">
                        {user && (
                            <Button variant="unstyled" size="unstyled" type="button"
                                onClick={() => { setFilterByTime(!filterByTime); triggerHaptic('selection'); }}
                                aria-pressed={filterByTime}
                                className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors ${
                                    filterByTime
                                        ? 'border-border bg-muted text-foreground'
                                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                                title="Passende Zeiten oben anzeigen"
                            >
                                <CalendarDays size={13} />
                                <span className="hidden sm:inline">Zeitlich passend</span>
                            </Button>
                        )}
                        <Button variant="unstyled" size="unstyled" type="button"
                            onClick={() => { setFilterOnlyCoaches(!filterOnlyCoaches); triggerHaptic('selection'); }}
                            aria-pressed={filterOnlyCoaches}
                            className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors ${
                                filterOnlyCoaches
                                    ? 'border-border bg-muted text-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                            }`}
                            title="Nur Coaches der Coaching-AG anzeigen"
                        >
                            <Award size={14} className="shrink-0" aria-hidden />
                            <span className="hidden sm:inline">Schüler-Coaches</span>
                            <span className="sm:hidden">Coaches</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-11 gap-1.5 rounded-md border-border px-4 text-sm font-semibold" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-haspopup="dialog">
                            <Filter size={15} aria-hidden /> Filter
                            {activeFilterCount > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-primary px-1.5 py-0.5 text-xs font-semibold leading-none text-primary-foreground tabular-nums">{activeFilterCount}</span>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={savedSearch ? discardSavedSearch : saveCurrentSearch}
                            className="h-11 gap-1.5 rounded-md border border-border bg-muted px-3.5 text-sm font-semibold text-foreground hover:bg-muted text-foreground"
                            title={savedSearch ? 'Gespeicherte Suche entfernen' : 'Aktuelle Filter speichern (ersetzt die bisherige Suche)'}
                            aria-pressed={!!savedSearch}
                        >
                            {savedSearch ? <><Bookmark size={15} className="fill-current" aria-hidden /> Gemerkt</> : <><Bookmark size={15} aria-hidden /> Merken</>}
                        </Button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden />
                    <Input
                        type="search"
                        aria-label="Anzeigen nach Fach oder Name durchsuchen"
                        placeholder="Nach Fach oder Name suchen"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Quick Subject Filter Chips */}
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-1 text-xs">
                    <span className="mr-1 shrink-0 text-xs font-semibold text-muted-foreground">Beliebt:</span>
                    {popularSubjects.map((subj) => (
                        <Button variant="unstyled" size="unstyled" type="button"
                            key={subj}
                            onClick={() => {
                                setFilterSubject(filterSubject === subj ? null : subj);
                                void api.analytics.trackCategory(subj).catch(() => { /* fire-and-forget */ });
                                if ('vibrate' in navigator) navigator.vibrate([15]);
                            }}
                            aria-pressed={filterSubject === subj}
                            className={cn(
                                "min-h-11 shrink-0 rounded-md border px-3 py-2 font-medium transition-colors",
                                filterSubject === subj
                                    ? "border-border bg-muted font-semibold text-foreground"
                                    : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground"
                            )}
                        >
                            {subjectLabelMap[subj] || subj}
                        </Button>
                    ))}
                    {filterSubject && (
                        <Button variant="unstyled" size="unstyled" type="button"
                            onClick={() => setFilterSubject(null)}
                            aria-label="Fachfilter zurücksetzen"
                            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md bg-destructive/10 px-3 text-xs font-semibold text-destructive"
                        >
                            <X size={12} aria-hidden /> Zurücksetzen
                        </Button>
                    )}
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                    <p className="shrink-0 text-xs font-semibold text-muted-foreground" aria-live="polite">
                        {loading
                            ? 'Ergebnisse werden geladen…'
                            : fetchError
                                ? 'Die Anzeigen konnten nicht geladen werden'
                                : `${sortedAds.length} ${sortedAds.length === 1 ? 'Anzeige' : 'Anzeigen'}`}
                    </p>
                    <Button variant="unstyled" size="unstyled"
                        type="button"
                        onClick={() => { resetAllFilters(); triggerHaptic('light'); }}
                        aria-hidden={!hasActiveFilters || loading}
                        tabIndex={hasActiveFilters && !loading ? 0 : -1}
                        className={cn(
                            "flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-md bg-muted px-3 text-xs font-semibold text-muted-foreground transition-opacity duration-200 hover:text-foreground",
                            hasActiveFilters && !loading ? 'opacity-100' : 'pointer-events-none opacity-0'
                        )}
                    >
                        <X size={12} aria-hidden /> Filter zurücksetzen
                    </Button>
                    <Label className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <ArrowUpDown size={13} className="shrink-0" aria-hidden />
                        <span className="sr-only">Sortierung</span>
                        <NativeSelect
                            value={sortKey}
                            onChange={e => { if (isValidSortKey(e.target.value)) { setSortKey(e.target.value); triggerHaptic('selection'); } }}
                            className="max-w-[11rem] cursor-pointer truncate rounded-md border-transparent bg-muted px-3 text-xs font-semibold text-foreground"
                            aria-label="Anzeigen sortieren"
                        >
                            {SORT_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </NativeSelect>
                    </Label>
                </div>

                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetContent
                        side="bottom"
                        showCloseButton={false}
                        className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-t-3xl border-t border-border bg-card p-0 shadow-overlay md:inset-x-auto md:right-4 md:bottom-4 md:left-auto md:top-auto md:max-h-[75dvh] md:w-[420px] md:rounded-3xl md:border"
                    >
                        <SheetTitle className="sr-only">Filter</SheetTitle>
                        <SheetDescription className="sr-only">Anzeigen nach Typ, Preis, Klassenstufe und Fach filtern.</SheetDescription>
                        <div className="shrink-0 border-b border-border bg-card px-5 pb-2 pt-3">
                            <div className="mb-1 flex justify-center md:hidden">
                                <div className="h-1.5 w-10 rounded-md bg-border" aria-hidden />
                            </div>
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Filter</h2>
                                <SheetClose
                                    aria-label="Filter schließen"
                                    className="-mr-2 grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none "
                                >
                                    <X size={20} aria-hidden />
                                </SheetClose>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            <div className="min-w-0 space-y-6 overflow-x-clip p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-5 md:pb-5">

                            {/* Type & Price */}
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <Label className="mb-2 block text-xs font-semibold text-foreground">Typ</Label>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="unstyled" size="unstyled" type="button" onClick={() => { triggerHaptic('selection'); setFilterType('all'); }} className={`min-h-11 rounded-md px-4 text-xs font-semibold transition-colors ${filterType === 'all' ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Alle</Button>
                                        <Button variant="unstyled" size="unstyled" type="button" onClick={() => { triggerHaptic('selection'); setFilterType('offer'); }} className={`min-h-11 rounded-md px-4 text-xs font-semibold transition-colors ${filterType === 'offer' ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Angebote</Button>
                                        <Button variant="unstyled" size="unstyled" type="button" onClick={() => { triggerHaptic('selection'); setFilterType('search'); }} className={`min-h-11 rounded-md px-4 text-xs font-semibold transition-colors ${filterType === 'search' ? GESUCHE_PILL_ACTIVE : GESUCHE_PILL_IDLE}`}>Gesuche</Button>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/50 px-3.5 pb-8 pt-2.5">
                                    <div className="mb-1 flex items-baseline justify-between gap-2">
                                        <Label className="text-xs font-semibold text-foreground">Preis pro Stunde</Label>
                                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{minPrice}€ – {maxPrice}€</span>
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
                                <Label className="mb-2 block text-xs font-semibold text-foreground">Klassenstufe</Label>
                                <GradeSelector selectedGrades={filterGrade} onChange={setFilterGrade} className="justify-start" />
                            </div>

                            {/* Subjects */}
                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-foreground">Fach</Label>
                                <div className="flex max-h-64 flex-col gap-4 overflow-y-auto pr-2">
                                    {SUBJECT_CATEGORIES.map(category => (
                                        <div key={category.title}>
                                            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{category.title}</h3>
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
                            </div>

                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {savedSearch && !loading && !fetchError && (
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 overflow-x-clip rounded-xl border border-border bg-muted px-4 py-3 dark:bg-muted">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                        <Bookmark size={15} className="shrink-0 fill-current text-foreground" aria-hidden />
                        <span className="shrink-0 font-semibold text-foreground">Gemerkte Suche:</span>
                        <span className="truncate text-muted-foreground">
                            {savedSearch.query ? `„${savedSearch.query}“` : 'Alle Anzeigen'}
                            {savedSearch.subject ? ` · ${savedSearch.subject}` : ''}
                            {savedSearch.grades.length > 0 ? ` · Kl. ${savedSearch.grades.join(', ')}` : ''}
                            {savedSearch.minPrice > PRICE_SLIDER_MIN || savedSearch.maxPrice < PRICE_SLIDER_MAX
                                ? ` · ${savedSearch.minPrice}–${savedSearch.maxPrice}€`
                                : ''}
                        </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={applySavedSearch}
                            className="h-11 rounded-md border-border px-4 text-xs font-semibold"
                        >
                            Suchen
                        </Button>
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={discardSavedSearch}
                            aria-label="Gemerkte Suche verwerfen"
                            title="Gemerkte Suche verwerfen"
                            className="grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <X size={15} aria-hidden />
                        </Button>
                    </div>
                </div>
            )}

            {/* Infos: zweizeilig auf Mobile, Details bleiben immer sichtbar */}
            <div className="mb-6">
            <div className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:flex sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <span className="block text-xs font-semibold text-muted-foreground">Infos</span>
                    <div className="mt-1 grid grid-cols-1 divide-y divide-border sm:flex sm:flex-wrap sm:items-center sm:divide-x sm:divide-y-0">
                        <Button variant="ghost" size="sm"
                            type="button"
                            onClick={() => navigate('/coaching')}
                            className="min-h-11 justify-start rounded-md px-2 text-xs font-medium text-foreground sm:justify-center"
                        >
                            Coaching · {posterBlock.time} · {posterBlock.room}
                        </Button>
                        <Button variant="ghost" size="sm"
                            type="button"
                            onClick={() => navigate('/coaching', { state: { section: 'foerderung' } })}
                            className="min-h-11 justify-start rounded-md px-2 text-xs font-medium text-foreground sm:justify-center"
                        >
                            Förderunterricht
                        </Button>
                        <Button variant="ghost" size="sm"
                            type="button"
                            onClick={() => navigate('/eltern-leitfaden')}
                            className="min-h-11 justify-start rounded-md px-2 text-xs font-medium text-foreground sm:justify-center"
                        >
                            Eltern
                        </Button>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={showBanners}
                    className="h-11 w-full shrink-0 rounded-md text-xs font-semibold sm:w-auto"
                    onClick={() => { const next = !showBanners; setShowBanners(next); try { localStorage.setItem('feed_show_banners', String(next)); } catch { /* ignore */ } }}
                >
                    {showBanners ? (
                        <><span>Details verbergen</span><ChevronUp size={14} aria-hidden /></>
                    ) : (
                        <><span>Details</span><ChevronDown size={14} aria-hidden /></>
                    )}
                </Button>
            </div>

                {showBanners && (
                    <div className="mt-3 space-y-4 animate-in slide-in-from-top-2">
                        {/* Info Block für Schüler-Coaching (editierbar im Coach-Panel) */}
                        {coachInfo.is_visible && (
                            <Card className="relative overflow-hidden border-border bg-card ">
                                <CardContent className="relative z-10 space-y-4 p-5 sm:p-6">
                                    <div className="flex items-center gap-2.5">
                                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                            <GraduationCap size={20} aria-hidden />
                                        </div>
                                        <h2 className="min-w-0 text-lg font-semibold text-foreground">{coachInfo.title}</h2>
                                    </div>
                                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                        {coachInfo.description}
                                    </p>
                                    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3 text-sm font-semibold text-foreground/80 sm:gap-4">
                                        {coachInfo.time && (
                                            <span className="flex items-center gap-1.5"><Clock size={16} aria-hidden /> {coachInfo.time}</span>
                                        )}
                                        {coachInfo.room && (
                                            <span className="flex items-center gap-1.5"><MapPin size={16} aria-hidden /> {coachInfo.room}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Förderunterricht – Inhalte direkt aus dem Coach-Panel (Tab „Seite“) */}
                        <Card className="border-border bg-card ">
                            <CardContent className="space-y-4 p-5 sm:p-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                        <GraduationCap size={20} aria-hidden />
                                    </div>
                                    <h2 className="min-w-0 text-lg font-semibold text-foreground">{supportBlock.title}</h2>
                                </div>
                                <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                                    {supportBlock.paragraphs.map((paragraph, index) => (
                                        <p key={index}>{paragraph}</p>
                                    ))}
                                    {supportBlock.registrationEmail && (
                                        <p>
                                            {supportBlock.registrationText || 'Anmeldung verbindlich über:'}{' '}
                                            <a href={`mailto:${supportBlock.registrationEmail}`} className="font-semibold text-foreground underline underline-offset-4 dark:text-primary">{supportBlock.registrationEmail}</a>
                                        </p>
                                    )}
                                </div>

                                {supportBlock.days.length > 0 && supportBlock.rows.length > 0 && (
                                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                                        <Table className="w-full min-w-[28rem] text-center text-xs">
                                            <TableHeader>
                                                <TableRow>
                                                    {supportBlock.days.map(day => (
                                                        <TableHead key={day.id} className="border border-border p-2 font-semibold text-foreground">{day.label}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {supportBlock.rows.map(row => (
                                                    <TableRow key={row.id}>
                                                        {row.cells.map(cell => <TableCell key={cell.id} className={scheduleCellClass(cell.text)}>{cell.text}</TableCell>)}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                <p>
                                    <Button variant="unstyled" size="unstyled"
                                        type="button"
                                        onClick={() => navigate('/coaching', { state: { section: 'foerderung' } })}
                                        className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline underline-offset-4 dark:text-primary"
                                    >
                                        Zur Coaching-Seite
                                    </Button>
                                </p>

                                {supportBlock.learnCoachingText && (
                                    <div className="mt-4 text-center text-xs text-muted-foreground">
                                        {supportBlock.learnCoachingText}<br />
                                        <a href={`mailto:${supportBlock.learnCoachingEmail}`} className="font-semibold text-foreground underline underline-offset-4 dark:text-primary">{supportBlock.learnCoachingEmail}</a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Eltern-Leitfaden Info Block */}
                        <Card className="border-border bg-card ">
                            <CardContent className="space-y-4 p-5 sm:p-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                        <ShieldCheck size={20} aria-hidden />
                                    </div>
                                    <h2 className="min-w-0 text-lg font-semibold text-foreground">Leitfaden für Eltern & Sicherheit</h2>
                                </div>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Nur verifizierte Konten können Anzeigen erstellen, Kontakt aufnehmen oder Anzeigen ansehen. Im Profil ist sichtbar, ob jemand verifiziert ist. Mehr zu Maßnahmen, Verhaltensregeln und Kontakt steht im ausführlichen Leitfaden.
                                </p>
                                <div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate('/eltern-leitfaden')}
                                        className="h-11 rounded-md border-border px-4 font-semibold"
                                    >
                                        Eltern-Leitfaden lesen
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <div className="grid min-w-0 gap-4">
                {loading ? (
                    <div className="space-y-4" role="status" aria-label="Anzeigen werden geladen">
                        {[0, 1, 2].map((i) => (
                            <Card key={i} className="overflow-hidden border-border bg-card">
                                <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Skeleton className="h-5 w-40 rounded-md" />
                                        <Skeleton className="h-3 w-24 rounded-md" />
                                    </div>
                                    <Skeleton className="h-5 w-16 rounded-md" />
                                </CardHeader>
                                <CardContent className="space-y-3 p-4">
                                    <div className="flex gap-2">
                                        <Skeleton className="h-7 w-20 rounded-md" />
                                        <Skeleton className="h-7 w-24 rounded-md" />
                                    </div>
                                    <Skeleton className="h-4 w-full rounded-md" />
                                    <Skeleton className="h-4 w-3/4 rounded-md" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : fetchError ? (
                    <div className="mt-8 flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-destructive/25 bg-card p-6 text-center sm:p-12" role="alert">
                        <div className="mb-5 grid size-16 place-items-center rounded-md bg-destructive/10 text-destructive">
                            <SearchX size={28} aria-hidden />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-foreground">Die Anzeigen konnten nicht geladen werden</h2>
                        <p className="mb-6 max-w-sm text-sm text-muted-foreground">{apiErrorMessage(fetchError, 'Prüfe deine Internetverbindung und versuche es erneut.')}</p>
                        <Button onClick={() => fetchAds()} className="h-11 rounded-md">Erneut versuchen</Button>
                    </div>
                ) : sortedAds.length === 0 ? (
                    <div className="mt-8 flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-6 text-center sm:p-12">
                        <div className="mb-5 grid size-16 place-items-center rounded-md bg-muted text-muted-foreground">
                            <Search size={28} aria-hidden />
                        </div>
                        {filterType === 'search' ? (
                            <>
                                <h3 className="mb-2 text-xl font-semibold text-foreground">Gesuche sind privat</h3>
                                <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                                    Gesuche erscheinen nicht öffentlich im Feed. Stelle in deinen Profil-Einstellungen ein, welche Fächer du anbietest, um passende Gesuche zu sehen.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button onClick={() => navigate('/settings')} className="h-11 rounded-md">Zu den Einstellungen</Button>
                                    {hasActiveFilters && (
                                        <Button variant="outline" onClick={() => { resetAllFilters(); triggerHaptic('light'); }} className="h-11 rounded-md">Filter zurücksetzen</Button>
                                    )}
                                </div>
                            </>
                        ) : hasActiveFilters ? (
                            <>
                                <h3 className="mb-2 text-xl font-semibold text-foreground">Keine Anzeigen für diese Filter</h3>
                                <p className="mb-6 max-w-sm text-sm text-muted-foreground">Keine Anzeige passt zu deiner aktuellen Suche. Setze die Filter zurück oder erstelle selbst eine Anzeige!</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button variant="outline" onClick={() => { resetAllFilters(); triggerHaptic('light'); }} className="h-11 rounded-md">Filter zurücksetzen</Button>
                                    <Button onClick={() => navigate('/create-ad')} className="h-11 rounded-md">Anzeige erstellen</Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="mb-2 text-xl font-semibold text-foreground">Noch keine Anzeigen</h3>
                                <p className="mb-6 max-w-sm text-sm text-muted-foreground">Aktuell gibt es keine aktiven Anzeigen. Erstelle selbst etwas!</p>
                                <Button onClick={() => navigate('/create-ad')} className="h-11 rounded-md">Anzeige erstellen</Button>
                            </>
                        )}
                    </div>
                ) : (
                    sortedAds.map((ad) => {
                        const matchScore = countMatches(myAvailability, ad.profiles_avail || emptyAvailability());
                        const boosted = istGeboostet(ad);
                        const openAd = () => navigate(`/ad/${ad.id}`);
                        return (
                        <Card
                            key={ad.id}
                            role="link"
                            tabIndex={0}
                            aria-label={`Anzeige von ${ad.profiles?.display_name || 'Unbekannt'} öffnen`}
                            className={cn(
                                "w-full min-w-0 cursor-pointer overflow-hidden border-border bg-card transition-shadow hover:shadow-card focus-visible:outline-none ",
                                boosted && "ring-1 ring-primary/40"
                            )}
                            onClick={openAd}
                            onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openAd();
                                }
                            }}
                        >
                            {boosted && (
                                <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-1.5" title="Diese Anzeige wird hervorgehoben (z. B. Coach-Status oder Aktion). Warum? Siehe Seite „Coaching-AG“.">
                                    <Sparkles size={12} className="text-foreground" aria-hidden />
                                    <span className="text-xs font-semibold text-foreground">Hervorgehobene Anzeige</span>
                                </div>
                            )}
                            <CardHeader className={cn(
                                "flex min-w-0 flex-row items-start justify-between gap-3 border-b p-4 pb-3",
                                boosted ? "border-border bg-muted" : "border-border bg-card"
                            )}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">{ad.profiles?.display_name || 'Unbekannt'}</h3>
                                        <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                            {ad.type === 'search' ? 'Suche' : 'Bietet'}
                                        </span>
                                        {ad.profiles?.is_verified && (
                                            <VerifiedPill />
                                        )}
                                        {ad.profiles?.is_coach && (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-foreground" title="Mitglied der Coaching-AG">
                                                <Award size={12} aria-hidden />
                                                Coach
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                                        <GraduationCap size={13} aria-hidden /> Klasse {ad.profiles?.grade_level || '?'}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <div className="text-right">
                                        <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground sm:text-base">
                                            {formatPrice(ad)}
                                        </div>
                                        {priceSecondary(ad) && (
                                            <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                                                {priceSecondary(ad)}
                                            </div>
                                        )}
                                    </div>
                                    {filterByTime && matchScore > 0 && (
                                        <div className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
                                            <CalendarDays size={12} aria-hidden /> {matchScore} Übereinstimmung{matchScore !== 1 ? 'en' : ''}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {ad.subjects.map(s => <SubjectChip key={s} subject={s} />)}
                                </div>
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {ad.short_description}
                                </p>
                            </CardContent>
                            <CardFooter className={cn(
                                "flex flex-wrap items-center justify-between gap-2 border-t border-border p-3 text-xs text-muted-foreground",
                                boosted ? "bg-muted" : "bg-muted/40"
                            )}>
                                <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                                    {ad.locations && ad.locations[0] && (
                                        <span className="flex items-center gap-1"><MapPin size={12} aria-hidden /> {ad.locations[0]} {ad.locations.length > 1 ? `+${ad.locations.length - 1}` : ''}</span>
                                    )}
                                    <span className="flex items-center gap-1"><Clock size={12} aria-hidden /> {Array.isArray(ad.duration_minutes) && ad.duration_minutes.length > 0 ? ad.duration_minutes.map((d: number) => d === 0 ? 'Egal' : `${d} Min.`).join(' • ') : 'Flexibel'}</span>
                                    {ad.session_format && ad.session_format !== 'any' && (
                                        <span className="flex items-center gap-1"><Users size={12} aria-hidden /> {ad.session_format === 'single' ? 'Einzeln' : 'Kleingruppe'}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="unstyled" size="unstyled"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic('light');
                                            setShareAd({ id: ad.id, title: `${ad.subjects?.[0]?.toUpperCase() || 'Nachhilfe'}: ${ad.profiles?.display_name || ''}` });
                                        }}
                                        className="grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        title="Anzeige teilen"
                                        aria-label="Anzeige teilen"
                                    >
                                        <Share2 size={15} aria-hidden />
                                    </Button>
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
