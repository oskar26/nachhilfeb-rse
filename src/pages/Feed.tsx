import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/Card';
import { SubjectChip, SUBJECT_CATEGORIES, type Subject } from '../components/SubjectChip';
import { GraduationCap, MapPin, Clock, Filter, Search, CalendarDays, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GradeSelector } from '../components/GradeSelector';
import { Input } from '../components/ui/Input';
import { PriceRangeSlider } from '../components/PriceRangeSlider';
import { useAuth } from '../context/AuthContext';
import { emptyAvailability, countMatches, type Availability } from '../components/AvailabilityCalendar';
import { cn } from '../lib/utils';

interface Ad {
    id: string;
    user_id: string;
    type: 'offer' | 'search';
    subjects: Subject[];
    grade_levels: string[];
    locations: string[];
    price_details: any;
    short_description: string;
    is_active: boolean;
    created_at: string;
    boosted?: boolean;
    boosted_until?: string | null;
    profiles?: { display_name: string; is_verified: boolean; grade_level: string };
    profiles_avail?: Availability;
}



export default function Feed() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [showBanners, setShowBanners] = useState(true);
    const [myAvailability, setMyAvailability] = useState<Availability>(emptyAvailability());
    const [filterByTime, setFilterByTime] = useState(false);

    // Filter State
    const [filterSubject, setFilterSubject] = useState<Subject | null>(null);
    const [filterGrade, setFilterGrade] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<'all' | 'offer' | 'search'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(100);

    useEffect(() => {
        fetchAds();
    }, []);

    useEffect(() => {
        if (user) {
            supabase.from('profiles').select('availability').eq('id', user.id).single().then(({ data }) => {
                if (data?.availability) setMyAvailability(data.availability);
            });
        }
    }, [user]);

    const fetchAds = async () => {
        setLoading(true);
        const { data: adsData, error } = await supabase
            .from('ads')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching ads', error);
        } else if (adsData) {
            const userIds = Array.from(new Set(adsData.map(a => a.user_id)));
            const { data: profiles } = await supabase.from('profiles').select('id, display_name, is_verified, grade_level, availability').in('id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]));

            const joinedAds = adsData.map(ad => ({
                ...ad,
                profiles: profileMap.get(ad.user_id),
                profiles_avail: (profileMap.get(ad.user_id) as any)?.availability || emptyAvailability()
            }));
            setAds(joinedAds);
        }
        setLoading(false);
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

        return true;
    });

    const isAdBoosted = (ad: any) => {
        return ad.boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
    };

    // Sort: Boosted ads always on top, then sort by matching score or created date
    const sortedAds = [...filteredAds].sort((a, b) => {
        const aBoost = isAdBoosted(a);
        const bBoost = isAdBoosted(b);

        if (aBoost && !bBoost) return -1;
        if (!aBoost && bBoost) return 1;

        if (filterByTime) {
            const scoreA = countMatches(myAvailability, a.profiles_avail || emptyAvailability());
            const scoreB = countMatches(myAvailability, b.profiles_avail || emptyAvailability());
            return scoreB - scoreA;
        } else {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
    });


    return (
        <div className="p-4 space-y-4 max-w-3xl mx-auto pb-24">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Aktuelle Anzeigen</h1>
                    <div className="flex gap-2">
                        {user && (
                            <button
                                onClick={() => { setFilterByTime(!filterByTime); if ('vibrate' in navigator) navigator.vibrate([20]); }}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                                    filterByTime
                                        ? 'bg-green-100 border-green-400 text-green-700'
                                        : 'bg-white dark:bg-gray-900 border-gray-200 text-gray-500'
                                }`}
                                title="Passende Zeiten oben anzeigen"
                            >
                                <CalendarDays size={14} />
                                <span className="hidden sm:inline">Zeitlich passend</span>
                            </button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                            <Filter size={16} className="mr-2" /> Filter
                        </Button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                        placeholder="Suchen nach Fächern, Namen..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {showFilters && (
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-sm space-y-6 animate-in slide-in-from-top-2">

                        {/* Type & Price */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Typ</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setFilterType('all')} className={`px-3 py-1 rounded-full text-sm ${filterType === 'all' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800'}`}>Alle</button>
                                    <button onClick={() => setFilterType('offer')} className={`px-3 py-1 rounded-full text-sm ${filterType === 'offer' ? 'bg-primary text-black' : 'bg-gray-100 dark:bg-gray-800'}`}>Angebote</button>
                                    <button onClick={() => setFilterType('search')} className={`px-3 py-1 rounded-full text-sm ${filterType === 'search' ? 'bg-secondary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>Gesuche</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Preis (€)</label>
                                <PriceRangeSlider min={0} max={100} onChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }} />
                            </div>
                        </div>

                        {/* Grade */}
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Klassenstufe</label>
                            <GradeSelector selectedGrades={filterGrade} onChange={setFilterGrade} className="justify-start" />
                        </div>

                        {/* Subjects */}
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Fach</label>
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
                    </div>
                )}
            </div>

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
                        onClick={() => setShowBanners(!showBanners)}
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
                        {/* Werbung / Info Block für das 8er Coaching */}
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-950/40 border border-blue-200 dark:border-blue-900/50 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <GraduationCap size={120} />
                            </div>
                            <CardContent className="p-6 relative z-10 space-y-4">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                                        <GraduationCap size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold">Kostenloses Coaching für Klasse 5 & 6!</h2>
                                </div>
                                <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                                    Wöchentlich einmal bieten wir für alle Schülerinnen und Schüler der Jahrgangsstufen 5 und 6 die Möglichkeit, Hilfen zu einzelnen Fächern oder zur Lern- und Arbeitsorganisation allgemein durch Schülerinnen und Schüler der 8. Klassen zu erhalten. Diese werden jeweils vor den Herbstferien für ihre Aufgabe geschult und stellen dann bis zum Ende des Schuljahres ehrenamtlich ihre Hilfe zur Verfügung. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schüler haben.
                                </p>
                                <div className="flex items-center gap-4 bg-white/60 dark:bg-black/20 p-3 rounded-xl inline-flex text-sm font-semibold text-blue-800 dark:text-blue-300">
                                    <span className="flex items-center gap-1.5"><Clock size={16} /> Dienstags, 13:45 - 14:30 Uhr</span>
                                    <span className="flex items-center gap-1.5"><MapPin size={16} /> Raum H310</span>
                                </div>
                            </CardContent>
                        </Card>

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
                ) : sortedAds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                        <div className="w-24 h-24 mb-6 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                            <Search size={40} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Der Feed ist leer</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">Wir konnten leider keine passenden Anzeigen zu deinen Suchkriterien finden. Ändere die Filter oder erstelle selbst etwas!</p>
                        <Button onClick={() => navigate('/create-ad')} className="rounded-full shadow-md">Anzeige erstellen</Button>
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
                                <div className="bg-gradient-to-r from-yellow-400/20 via-amber-400/15 to-yellow-400/20 border-b border-yellow-400/30 px-4 py-1.5 flex items-center gap-1.5">
                                    <span className="text-xs">🍌</span>
                                    <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 tracking-wide uppercase">Empfohlene Anzeige</span>
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
                                        {ad.price_details?.mode === 'free' ? 'Kostenlos' : (ad.price_details?.mode === 'vb' ? 'VB' : `${ad.price_details?.value}€`)}
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
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {ad.locations[0]} {ad.locations.length > 1 && `+${ad.locations.length - 1}`}</span>
                                    )}
                                    <span className="flex items-center gap-1"><Clock size={12} /> Flexibel</span>
                                </div>
                                {boosted && (
                                    <span className="text-yellow-600 dark:text-yellow-500 font-semibold text-[10px] flex items-center gap-0.5">
                                        ✨ Empfohlen
                                    </span>
                                )}
                            </CardFooter>
                        </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
