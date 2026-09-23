import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    BarChart3,
    TrendingUp,
    Users,
    Download,
    Clock,
    Smartphone,
    Monitor,
    Tablet,
    Euro,
    Star,
    CheckCircle,
    Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GradeDist {
    grade: string;
    count: number;
}

interface SubjectDist {
    subject: string;
    count: number;
}

interface PriceDist {
    range: string;
    count: number;
}

interface DeviceDist {
    type: string;
    count: number;
}

interface HourlyDist {
    hour: number;
    count: number;
}

interface PathDist {
    path: string;
    count: number;
}

interface TopAd {
    id: string;
    title: string;
    type: string;
    views: number;
}

interface DailyDist {
    day: string;
    count: number;
}

type StatsRange = 7 | 30 | 90;

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState({
        total: 0,
        students: 0,
        parents: 0,
        admins: 0,
        verified: 0,
        banned: 0
    });
    const [adStats, setAdStats] = useState({
        total: 0,
        offers: 0,
        searches: 0,
        active: 0,
        boosted: 0
    });
    const [engagementStats, setEngagementStats] = useState({
        totalRequests: 0,
        pendingRequests: 0,
        acceptedRequests: 0,
        rejectedRequests: 0,
        totalReviews: 0,
        avgRating: 0
    });
    const [reportsCount, setReportsCount] = useState({
        total: 0,
        open: 0,
        resolved: 0
    });

    const [totalPageViews, setTotalPageViews] = useState(0);
    const [gradeDistribution, setGradeDistribution] = useState<GradeDist[]>([]);
    const [subjectDistribution, setSubjectDistribution] = useState<SubjectDist[]>([]);
    const [priceDistribution, setPriceDistribution] = useState<PriceDist[]>([]);
    const [deviceDistribution, setDeviceDistribution] = useState<DeviceDist[]>([]);
    const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDist[]>([]);
    const [topPages, setTopPages] = useState<PathDist[]>([]);
    const [topAds, setTopAds] = useState<TopAd[]>([]);
    // Seitenaufrufe-Verlauf (eigener Zeitraum, hoster-artig umschaltbar)
    const [statsDays, setStatsDays] = useState<StatsRange>(30);
    const [dailyViews, setDailyViews] = useState<DailyDist[]>([]);
    const [uniqueLoggedIn, setUniqueLoggedIn] = useState(0);
    const [pageStatsLoading, setPageStatsLoading] = useState(false);

    // Raw datasets for CSV Export (Anzeigen als Stichprobe, Nutzer/Aufrufe als Aggregat)
    const [rawAds, setRawAds] = useState<any[]>([]);
    const [roleDistribution, setRoleDistribution] = useState<{ role: string; count: number }[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    useEffect(() => {
        fetchPageStats(statsDays);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsDays]);

    // Seitenaufrufe separat laden (eigener Zeitraum, ohne den Rest neu zu laden)
    const fetchPageStats = async (days: StatsRange) => {
        setPageStatsLoading(true);
        try {
            const { data: pageStats, error } = await api.analytics.stats(days);
            if (error) throw new Error(error.message);
            const statsRaw = (pageStats as any) ?? {};
            const totalViews = Number(statsRaw.total_views) || 0;
            setTotalPageViews(totalViews);
            const byPath = Array.isArray(statsRaw.by_path) ? statsRaw.by_path : [];
            const byDevice = Array.isArray(statsRaw.by_device) ? statsRaw.by_device : [];
            setTopPages(byPath.slice(0, 6).map((r: any) => ({ path: String(r.path), count: Number(r.views) || 0 })));
            const deviceMap: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
            byDevice.forEach((r: any) => {
                if (r.device_type && deviceMap[r.device_type] !== undefined) {
                    deviceMap[r.device_type] = Number(r.views) || 0;
                }
            });
            setDeviceDistribution(Object.entries(deviceMap).map(([type, count]) => ({ type, count })));
            if (totalViews > 0) {
                const hourlyMap: Record<number, number> = {};
                for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
                const byHour = Array.isArray(statsRaw.by_hour) ? statsRaw.by_hour : [];
                byHour.forEach((r: any) => {
                    const h = Number(r.hour);
                    if (Number.isInteger(h) && h >= 0 && h < 24) hourlyMap[h] = Number(r.views) || 0;
                });
                setHourlyDistribution(Object.entries(hourlyMap).map(([h, count]) => ({ hour: parseInt(h), count })));
            } else {
                setHourlyDistribution([]);
            }
            // Verlauf: fehlende Tage mit 0 auffüllen (durchgehende Kurve)
            const dayMap: Record<string, number> = {};
            const byDay = Array.isArray(statsRaw.by_day) ? statsRaw.by_day : [];
            byDay.forEach((r: any) => {
                if (r.day) dayMap[String(r.day).slice(0, 10)] = Number(r.views) || 0;
            });
            const filled: DailyDist[] = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                filled.push({ day: key, count: dayMap[key] || 0 });
            }
            setDailyViews(filled);
            setUniqueLoggedIn(Number(statsRaw.unique_logged_in) || 0);
        } catch {
            toast.error('Seitenaufrufe konnten nicht geladen werden.');
        } finally {
            setPageStatsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Alle Kennzahlen kommen aus dem PHP-Backend (keine direkten Tabellenzugriffe,
            // kein Volltabellen-Nutzerexport – Nutzerkennzahlen als Aggregate aus overview)
            const [
                { data: overview },
                { data: adsData },
                { data: requestsData },
                { data: reviewsData },
                { data: reportsData },
            ] = await Promise.all([
                api.admin.overview(),
                api.ads.list({ all: true }),
                api.requests.list(),
                api.reviews.list({}),
                api.reports.list(),
            ]);

            const overviewRaw = overview ?? {};
            const overviewStats = overviewRaw.stats ?? {};

            const ads = Array.isArray(adsData) ? adsData : ((adsData as any)?.ads ?? []);
            setRawAds(ads);

            const requests = Array.isArray(requestsData) ? requestsData : ((requestsData as any)?.requests ?? []);
            const reviews = Array.isArray(reviewsData) ? reviewsData : ((reviewsData as any)?.reviews ?? []);
            const reports = Array.isArray(reportsData) ? reportsData : ((reportsData as any)?.reports ?? []);

            // Page-Views laufen separat über fetchPageStats (eigener Zeitraum)
            // Calculate profile metrics (Totals + Rollen aus Overview, Stufen aus Backend-Aggregat)
            {
                const total = Number(overviewStats.total_users) || 0;
                const verified = Number(overviewStats.verified_users) || 0;
                const banned = Number(overviewStats.banned_users) || 0;
                const byRole = (overviewRaw.by_role ?? {}) as Record<string, number>;
                const students = Number(byRole.student) || 0;
                const parents = Number(byRole.parent) || 0;
                const admins = (Number(byRole.sv_admin) || 0) + (Number(byRole.coach_admin) || 0);
                setRoleDistribution(Object.entries(byRole).map(([role, count]) => ({ role, count: Number(count) || 0 })));

                setUserStats({ total, students, parents, admins, verified, banned });

                const gradeRows = Array.isArray(overviewRaw.grade_distribution) ? overviewRaw.grade_distribution : [];
                const order = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];
                const sortedGrades = gradeRows
                    .map((g: { grade: string; c: number }) => ({ grade: String(g.grade), count: Number(g.c) || 0 }))
                    .sort((a: { grade: string; count: number }, b: { grade: string; count: number }) => {
                        const idxA = order.indexOf(a.grade);
                        const idxB = order.indexOf(b.grade);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a.grade.localeCompare(b.grade);
                    });
                setGradeDistribution(sortedGrades);
            }

            // Calculate ad metrics & price range
            {
                const total = ads.length;
                let offers = 0;
                let searches = 0;
                let active = 0;
                let boosted = 0;
                const subjectsMap: Record<string, number> = {};
                const priceRanges = {
                    'Kostenlos': 0,
                    'Unter 10€': 0,
                    '10€ - 15€': 0,
                    'Über 15€': 0,
                    'Verhandlungsbasis (VB)': 0
                };

                const now = new Date();

                ads.forEach((ad: any) => {
                    if (ad.type === 'offer') offers++;
                    if (ad.type === 'search') searches++;
                    if (ad.is_active) active++;
                    
                    const isBoostActive = ad.boosted && ad.boosted_until && new Date(ad.boosted_until) > now;
                    if (isBoostActive) boosted++;

                    if (Array.isArray(ad.subjects)) {
                        ad.subjects.forEach((subj: string) => {
                            subjectsMap[subj] = (subjectsMap[subj] || 0) + 1;
                        });
                    }

                    const mode = ad.price_details?.mode;
                    const value = Number(ad.price_details?.value || 0);

                    if (mode === 'free') {
                        priceRanges['Kostenlos']++;
                    } else if (mode === 'vb') {
                        priceRanges['Verhandlungsbasis (VB)']++;
                    } else if (mode === 'fixed') {
                        if (value < 10) priceRanges['Unter 10€']++;
                        else if (value >= 10 && value <= 15) priceRanges['10€ - 15€']++;
                        else priceRanges['Über 15€']++;
                    }
                });

                setAdStats({ total, offers, searches, active, boosted });
                setPriceDistribution(Object.entries(priceRanges).map(([range, count]) => ({ range, count })));
                const sortedSubjects = Object.entries(subjectsMap)
                    .map(([subject, count]) => ({ subject, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);
                setSubjectDistribution(sortedSubjects);
                // Meistaufgerufene Anzeigen (anonymes View-Tracking, Details-Seite zählt +1)
                const sortedByViews = [...ads]
                    .map((ad: any) => ({
                        id: String(ad.id ?? ''),
                        title: String(ad.short_description || ad.title || 'Anzeige ohne Titel'),
                        type: ad.type === 'search' ? 'Gesuch' : 'Angebot',
                        views: Number(ad.view_count) || 0
                    }))
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 6);
                setTopAds(sortedByViews);
            }

            // Engagement stats
            {
                const totalRequests = requests.length;
                const pendingRequests = requests.filter((r: any) => r.status === 'pending').length;
                const acceptedRequests = requests.filter((r: any) => r.status === 'accepted').length;
                const rejectedRequests = requests.filter((r: any) => r.status === 'rejected').length;

                let totalReviews = 0;
                let avgRating = 0;

                if (reviews && reviews.length > 0) {
                    totalReviews = reviews.length;
                    const sum = reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
                    avgRating = sum / totalReviews;
                }

                setEngagementStats({
                    totalRequests,
                    pendingRequests,
                    acceptedRequests,
                    rejectedRequests,
                    totalReviews,
                    avgRating
                });
            }

            // Reports stats
            {
                const total = reports.length;
                const open = reports.filter((r: any) => r.status === 'open').length;
                const resolved = reports.filter((r: any) => r.status === 'resolved').length;
                setReportsCount({ total, open, resolved });
            }

        } catch {
            toast.error('Analytics konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    // CSV Exporter Helper
    const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Datei "${filename}" heruntergeladen!`);
    };

    const exportUsersCSV = () => {
        // Aggregat-Export (kein E-Mail-Dump): Rollen- + Stufenverteilung
        const headers = ['Bereich', 'Schlüssel', 'Anzahl'];
        const rows: (string | number)[][] = [
            ...roleDistribution.map(r => ['Rolle', r.role, r.count] as (string | number)[]),
            ...gradeDistribution.map(g => ['Klassenstufe', g.grade, g.count] as (string | number)[]),
        ];
        exportToCSV(`fwg_nutzer_aggregat_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    const exportAdsCSV = () => {
        const headers = ['ID', 'Typ', 'Titel', 'Fächer', 'Klassenstufen', 'Preis-Modus', 'Preis-Wert', 'Aktiv', 'Geboostet', 'Erstellt am'];
        const rows = rawAds.map(a => [
            a.id,
            a.type === 'offer' ? 'Angebot' : 'Gesuch',
            a.short_description || '',
            Array.isArray(a.subjects) ? a.subjects.join('; ') : '',
            Array.isArray(a.grade_levels) ? a.grade_levels.join('; ') : '',
            a.price_details?.mode || '',
            a.price_details?.value || 0,
            a.is_active ? 'Ja' : 'Nein',
            a.boosted ? 'Ja' : 'Nein',
            a.created_at ? new Date(a.created_at).toLocaleString('de-DE') : ''
        ]);
        exportToCSV(`fwg_anzeigen_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    const exportAnalyticsCSV = () => {
        // Backend liefert Aggregate (keine Einzelaufrufe) – Seiten + Geräte als zwei Blöcke
        const headers = ['Bereich', 'Schlüssel', 'Aufrufe'];
        const rows: (string | number)[][] = [
            ...topPages.map(p => ['Top-Seite', p.path, p.count] as (string | number)[]),
            ...deviceDistribution.map(d => ['Gerät', d.type, d.count] as (string | number)[]),
            ...dailyViews.map(d => ['Tag', d.day, d.count] as (string | number)[]),
            ...topAds.map(a => ['Top-Anzeige', `${a.type}: ${a.title}`, a.views] as (string | number)[]),
        ];
        exportToCSV(`fwg_analytics_aggregat_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);
    const maxSubjectCount = Math.max(...subjectDistribution.map(s => s.count), 1);
    const maxPriceCount = Math.max(...priceDistribution.map(p => p.count), 1);
    const maxHourlyCount = Math.max(...hourlyDistribution.map(h => h.count), 1);
    const maxDailyCount = Math.max(...dailyViews.map(d => d.count), 1);
    const rangeLabel = statsDays === 7 ? 'letzte 7 Tage' : statsDays === 90 ? 'letzte 90 Tage' : 'letzte 30 Tage';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header with CSV Export Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="text-primary-hover" size={24} /> Analytics & Statistik Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Ausführliche Live-Analysen, Besuchszeiten, Geräte-Statistiken & CSV-Export.</p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                    <Button onClick={exportUsersCSV} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 font-bold">
                        <Download size={14} /> Nutzer CSV
                    </Button>
                    <Button onClick={exportAdsCSV} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 font-bold">
                        <Download size={14} /> Anzeigen CSV
                    </Button>
                    <Button onClick={exportAnalyticsCSV} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 font-bold bg-primary/10 border-primary/20 text-primary-hover">
                        <Download size={14} /> Aufrufe CSV
                    </Button>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-3xl border-none shadow-sm bg-blue-50/60 dark:bg-indigo-950/20">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Registrierte Nutzer</span>
                        <div className="text-3xl font-black">{userStats.total}</div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            {userStats.students} Schüler · {userStats.parents} Eltern
                        </span>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm bg-emerald-50/60 dark:bg-emerald-950/20">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Aktive Anzeigen</span>
                        <div className="text-3xl font-black">{adStats.active}</div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            {adStats.offers} Angebote · {adStats.searches} Gesuche
                        </span>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm bg-purple-50/60 dark:bg-purple-950/20">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Erfasste Aufrufe</span>
                        <div className="text-3xl font-black">{totalPageViews}</div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            {uniqueLoggedIn} eingeloggte Besucher · Gesamt
                        </span>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm bg-amber-50/60 dark:bg-amber-950/20">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Durchschn. Bewertung</span>
                        <div className="text-3xl font-black flex items-center gap-1.5">
                            <Star className="text-yellow-500 shrink-0" size={20} fill="currentColor" />
                            {engagementStats.avgRating > 0 ? engagementStats.avgRating.toFixed(1) : '--'}
                        </div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            aus {engagementStats.totalReviews} Bewertungen
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 0: AUFRUFE-VERLAUF (hoster-artig) */}
            <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <TrendingUp size={18} className="text-primary-hover" /> Aufrufe-Verlauf
                            </CardTitle>
                            <CardDescription>
                                Seitenaufrufe pro Tag ({rangeLabel}) · anonyme Server-Statistik (ohne IP)
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0" role="group" aria-label="Zeitraum wählen">
                            {([7, 30, 90] as StatsRange[]).map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setStatsDays(d)}
                                    aria-pressed={statsDays === d}
                                    className={d === statsDays
                                        ? "px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-gray-900 shadow-xs text-gray-900 dark:text-white"
                                        : "px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"}>
                                    {d} Tage
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {pageStatsLoading ? (
                        <div className="py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">Lade Verlauf…</div>
                    ) : dailyViews.every(d => d.count === 0) ? (
                        <div className="text-center py-12 text-gray-400 text-xs italic">
                            Noch keine Aufrufdaten im Zeitraum. Sobald Nutzer Seiten aufrufen, erscheint hier der Verlauf.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="flex items-end gap-1 h-36 pt-4 px-2 border-b dark:border-gray-800" style={{ minWidth: `${Math.max(dailyViews.length * 14, 280)}px` }}>
                                {dailyViews.map(d => {
                                    const pct = (d.count / maxDailyCount) * 100;
                                    const label = new Date(d.day + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                    return (
                                        <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative min-w-[10px]">
                                            <div
                                                className="w-full bg-emerald-500/70 group-hover:bg-emerald-500 rounded-t transition-all duration-300 min-h-[2px]"
                                                style={{ height: `${pct}%` }}
                                            />
                                            {(statsDays === 7 || d.count === maxDailyCount) && (
                                                <span className="text-[9px] text-gray-400 font-mono">{label}</span>
                                            )}
                                            <div className="absolute -top-8 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                                {d.count} Aufrufe ({label})
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase px-2 pt-2">
                                <span>{dailyViews.length > 0 ? new Date(dailyViews[0].day + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                                <span>Heute</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SECTION 1: BESUCHSZEITEN & GERÄTE-VERTEILUNG */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 24-Stunden Besuchszeiten Histogramm */}
                <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Clock size={18} className="text-primary-hover" /> Besuchszeiten-Verteilung (Spitzenzeiten 24h)
                        </CardTitle>
                        <CardDescription>Uhrzeiten, zu denen die Nachhilfebörse am häufigsten aufgerufen wird</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hourlyDistribution.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-xs italic">
                                Noch keine Aufrufdaten vorhanden. Sobald Nutzer Seiten aufrufen, erscheint hier ein Spitzenzeiten-Diagramm.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-end gap-1 h-36 pt-4 px-2 border-b dark:border-gray-800">
                                    {hourlyDistribution.map(h => {
                                        const pct = (h.count / maxHourlyCount) * 100;
                                        return (
                                            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                <div 
                                                    className="w-full bg-primary/70 group-hover:bg-primary-hover rounded-t transition-all duration-300 min-h-[2px]" 
                                                    style={{ height: `${pct}%` }} 
                                                />
                                                <span className="text-[9px] text-gray-400 font-mono">{h.hour}h</span>
                                                
                                                {/* Tooltip */}
                                                <div className="absolute -top-8 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                                    {h.count} Aufrufe ({h.hour}:00)
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase px-2">
                                    <span>Nacht (00:00 - 06:00)</span>
                                    <span>Morgen / Schule (06:00 - 14:00)</span>
                                    <span>Nachmittag / Abend (14:00 - 23:00)</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Geräte-Verteilung */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Monitor size={18} className="text-primary-hover" /> Verwendete Geräte
                        </CardTitle>
                        <CardDescription>Aufteilung nach Gerätetypen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {deviceDistribution.map(d => {
                            const Icon = d.type === 'mobile' ? Smartphone : d.type === 'tablet' ? Tablet : Monitor;
                            const label = d.type === 'mobile' ? 'Smartphone / Mobile' : d.type === 'tablet' ? 'Tablet' : 'Desktop PC';
                            const percentage = totalPageViews > 0 ? Math.round((d.count / totalPageViews) * 100) : 0;
                            return (
                                <div key={d.type} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="flex items-center gap-1.5"><Icon size={14} className="text-primary-hover" /> {label}</span>
                                        <span className="text-gray-500">{d.count} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Top-Seiten List */}
                        <div className="pt-4 border-t dark:border-gray-800 space-y-2">
                            <span className="text-xs font-bold uppercase text-gray-400 block mb-2">Beliebteste Seiten</span>
                            {topPages.map(p => (
                                <div key={p.path} className="flex justify-between items-center text-xs">
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{p.path}</span>
                                    <span className="font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{p.count} Aufrufe</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 2: PLATTFORM-GRAPHE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Stufen-Verteilung */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Users size={18} className="text-primary-hover" /> Stufen-Verteilung
                        </CardTitle>
                        <CardDescription>Anzahl der verifizierten Schüler nach Klassenstufen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {gradeDistribution.map(g => {
                            const percentage = (g.count / maxGradeCount) * 100;
                            return (
                                <div key={g.grade} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span>{['EF', 'Q1', 'Q2'].includes(g.grade) ? `Stufe ${g.grade}` : `Klasse ${g.grade}`}</span>
                                        <span className="text-gray-500">{g.count} Schüler</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-primary/70 to-primary-hover rounded-full transition-all duration-500" 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* 2. Beliebte Fächer */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-hover" /> Beliebte Schulfächer
                        </CardTitle>
                        <CardDescription>Häufigkeit der Fächer in Angeboten und Gesuchen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {subjectDistribution.map(s => {
                            const percentage = (s.count / maxSubjectCount) * 100;
                            return (
                                <div key={s.subject} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="capitalize">{s.subject}</span>
                                        <span className="text-gray-500">{s.count} Anzeigen</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* 3. Preis-Verteilung */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Euro size={18} className="text-primary-hover" /> Preisstrukturen
                        </CardTitle>
                        <CardDescription>Aufteilung der angegebenen Stundensätze (€ / 45 Min)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {priceDistribution.map(p => {
                            const percentage = (p.count / maxPriceCount) * 100;
                            return (
                                <div key={p.range} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span>{p.range}</span>
                                        <span className="text-gray-500">{p.count} Anzeigen</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-500" 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* 4. Plattform-Status */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <CheckCircle size={18} className="text-primary-hover" /> Plattform-Status & Verifizierung
                        </CardTitle>
                        <CardDescription>Zustand von Verifizierungen und Raten</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm font-semibold">
                        <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
                            <span className="text-gray-500">Verifizierungsrate:</span>
                            <span className="text-green-600 dark:text-green-400">
                                {userStats.total > 0 ? Math.round((userStats.verified / userStats.total) * 100) : 0}% ({userStats.verified} von {userStats.total})
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
                            <span className="text-gray-500">Erfolgsquote (Anfragen angenommen):</span>
                            <span className="text-blue-600 dark:text-blue-400">
                                {engagementStats.totalRequests > 0 ? Math.round((engagementStats.acceptedRequests / engagementStats.totalRequests) * 100) : 0}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
                            <span className="text-gray-500">Unbehandelte Meldungen:</span>
                            <span className={reportsCount.open > 0 ? 'text-red-500' : 'text-gray-500'}>
                                {reportsCount.open} offene Meldungen
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-500">SV-Admins im Dienst:</span>
                            <span>{userStats.admins} SV-Admins</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Meistaufgerufene Anzeigen */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Eye size={18} className="text-primary-hover" /> Meistaufgerufene Anzeigen
                        </CardTitle>
                        <CardDescription>Anonyme Aufrufzählung pro Anzeigendetailseite</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {topAds.length === 0 || topAds.every(a => a.views === 0) ? (
                            <div className="text-center py-8 text-gray-400 text-xs italic">
                                Noch keine Aufrufe gezählt. Sobald Anzeigen geöffnet werden, erscheinen sie hier.
                            </div>
                        ) : (
                            topAds.map((a, i) => (
                                <div key={a.id || i} className="flex items-center gap-3 py-2 border-b dark:border-gray-800 last:border-0">
                                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary-hover text-xs font-black flex items-center justify-center shrink-0">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{a.title}</p>
                                        <p className="text-[10px] text-gray-400 font-semibold">{a.type}</p>
                                    </div>
                                    <span className="font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs shrink-0">
                                        {a.views} {a.views === 1 ? 'Aufruf' : 'Aufrufe'}
                                    </span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
