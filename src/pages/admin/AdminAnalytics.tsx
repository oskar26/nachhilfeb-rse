import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
import { toast } from 'sonner';

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
    const [loadError, setLoadError] = useState<string | null>(null);

    // Raw datasets for CSV Export (Anzeigen als Stichprobe, Nutzer/Aufrufe als Aggregat)
    const [rawAds, setRawAds] = useState<any[]>([]);
    const [roleDistribution, setRoleDistribution] = useState<{ role: string; count: number }[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    useEffect(() => {
        // Beim Zeitraum-Wechsel alte Anfragen verwerfen (Race-Schutz)
        let cancelled = false;
        fetchPageStats(statsDays, () => cancelled);
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsDays]);

    // Seitenaufrufe separat laden (eigener Zeitraum, ohne den Rest neu zu laden)
    const fetchPageStats = async (days: StatsRange, isCancelled?: () => boolean) => {
        setPageStatsLoading(true);
        try {
            const { data: pageStats, error } = await api.analytics.stats(days);
            if (error) throw new Error(error.message);
            // Beim Zeitraum-Wechsel kann eine ältere Anfrage später antworten — dann verwerfen.
            if (isCancelled?.()) return;
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
            if (!isCancelled?.()) {
                toast.error('Seitenaufrufe konnten nicht geladen werden.');
            }
        } finally {
            if (!isCancelled?.()) {
                setPageStatsLoading(false);
            }
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // Alle Kennzahlen kommen aus dem PHP-Backend (keine direkten Tabellenzugriffe,
            // kein Volltabellen-Nutzerexport – Nutzerkennzahlen als Aggregate aus overview)
            const [
                { data: overview },
                { data: adsData },
                { data: reportsData },
            ] = await Promise.all([
                api.admin.overview(),
                api.ads.list({ all: true }),
                api.reports.list(),
            ]);

            const overviewRaw = overview ?? {};
            const overviewStats = overviewRaw.stats ?? {};

            const ads = Array.isArray(adsData) ? adsData : ((adsData as any)?.ads ?? []);
            setRawAds(ads);

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

            // Engagement stats (aus overview: früher zählten Anfragen nur die des Admins
            // und der Reviews-Abruf schlug mangels Filter mit 400 fehl)
            {
                const s = overviewStats as any;
                setEngagementStats({
                    totalRequests: Number(s.total_requests) || 0,
                    pendingRequests: Number(s.pending_requests) || 0,
                    acceptedRequests: Number(s.accepted_requests) || 0,
                    rejectedRequests: Number(s.rejected_requests) || 0,
                    totalReviews: Number(s.total_reviews) || 0,
                    avgRating: Number(s.avg_rating) || 0
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
            setLoadError('Analytics konnten nicht geladen werden.');
            toast.error('Analytics konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    // CSV Exporter Helper
    const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => {
                // Quoting inkl. Schutz vor CSV-Formel-Injection (Excel/Sheets)
                let text = String(val ?? '');
                if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
                return `"${text.replace(/"/g, '""')}"`;
            }).join(','))
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
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                <Spinner className="size-6 text-foreground" />
                <p className="text-sm text-muted-foreground">Lade Analytics...</p>
            </div>
        );
    }

    const rangeLabel = statsDays === 7 ? 'letzte 7 Tage' : statsDays === 90 ? 'letzte 90 Tage' : 'letzte 30 Tage';
    const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);
    const maxSubjectCount = Math.max(...subjectDistribution.map(s => s.count), 1);
    const maxPriceCount = Math.max(...priceDistribution.map(p => p.count), 1);
    const dailyChartData = dailyViews.map((entry) => ({
        day: new Date(entry.day + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        count: entry.count,
    }));
    const hourlyChartData = hourlyDistribution.map((entry) => ({
        hour: `${entry.hour}:00`,
        count: entry.count,
    }));
    const dailyChartConfig = {
        count: { label: 'Seitenaufrufe', color: 'var(--chart-1)' },
    } satisfies ChartConfig;
    const hourlyChartConfig = {
        count: { label: 'Aufrufe', color: 'var(--chart-1)' },
    } satisfies ChartConfig;

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header with CSV Export Dropdown */}
            <div className="flex flex-col gap-4">
                <header className="min-w-0">
                    <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        <BarChart3 className="shrink-0 text-foreground" size={24} aria-hidden /> Analytics & Statistik Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Ausführliche Live-Analysen, Besuchszeiten, Geräte-Statistiken & CSV-Export.</p>
                </header>

                <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Button onClick={exportUsersCSV} variant="outline" className="h-11 gap-1.5 text-xs">
                        <Download size={16} aria-hidden /> Nutzer CSV
                    </Button>
                    <Button onClick={exportAdsCSV} variant="outline" className="h-11 gap-1.5 text-xs">
                        <Download size={16} aria-hidden /> Anzeigen CSV
                    </Button>
                    <Button onClick={exportAnalyticsCSV} className="h-11 gap-1.5 text-xs">
                        <Download size={16} aria-hidden /> Aufrufe CSV
                    </Button>
                </div>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Analytics nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchAnalytics}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4 2xl:gap-4">
                <Card className="">
                    <CardContent className="space-y-1 p-4 sm:p-5">
                        <span className="block text-xs font-medium text-muted-foreground">Registrierte Nutzer</span>
                        <div className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{userStats.total}</div>
                        <span className="block text-xs text-muted-foreground">
                            {userStats.students} Schüler · {userStats.parents} Eltern
                        </span>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardContent className="space-y-1 p-4 sm:p-5">
                        <span className="block text-xs font-medium text-muted-foreground">Aktive Anzeigen</span>
                        <div className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{adStats.active}</div>
                        <span className="block text-xs text-muted-foreground">
                            {adStats.offers} Angebote · {adStats.searches} Gesuche
                        </span>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardContent className="space-y-1 p-4 sm:p-5">
                        <span className="block text-xs font-medium text-muted-foreground">Erfasste Aufrufe</span>
                        <div className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{totalPageViews}</div>
                        <span className="block text-xs text-muted-foreground">
                            {uniqueLoggedIn} eingeloggte Besucher · Gesamt
                        </span>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardContent className="space-y-1 p-4 sm:p-5">
                        <span className="block text-xs font-medium text-muted-foreground">Durchschn. Bewertung</span>
                        <div className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
                            <Star className="shrink-0 text-foreground" size={20} fill="currentColor" aria-hidden />
                            {engagementStats.avgRating > 0 ? engagementStats.avgRating.toFixed(1) : '--'}
                        </div>
                        <span className="block text-xs text-muted-foreground">
                            aus {engagementStats.totalReviews} Bewertungen
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 0: AUFRUFE-VERLAUF (hoster-artig) */}
            <Card className="">
                <CardHeader>
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <TrendingUp size={20} className="text-foreground" aria-hidden /> Aufrufe-Verlauf
                            </CardTitle>
                            <CardDescription>
                                Seitenaufrufe pro Tag ({rangeLabel}) · anonyme Server-Statistik (ohne IP)
                            </CardDescription>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted p-1" role="group" aria-label="Zeitraum wählen">
                            {([7, 30, 90] as StatsRange[]).map(d => (
                                <Button variant="unstyled" size="unstyled"
                                    key={d}
                                    type="button"
                                    onClick={() => setStatsDays(d)}
                                    aria-pressed={statsDays === d}
                                    className={d === statsDays
                                        ? "min-h-11 rounded-md bg-card px-3 text-xs font-medium text-foreground"
                                        : "min-h-11 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"}>
                                    {d} Tage
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {pageStatsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                            <Spinner className="size-4" /> Lade Verlauf…
                        </div>
                    ) : dailyViews.every(d => d.count === 0) ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Noch keine Aufrufdaten im Zeitraum. Sobald Nutzer Seiten aufrufen, erscheint hier der Verlauf.
                        </div>
                    ) : (
                        <ChartContainer config={dailyChartConfig} className="h-[220px] w-full">
                            <BarChart data={dailyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                                <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>

            {/* SECTION 1: BESUCHSZEITEN & GERÄTE-VERTEILUNG */}
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3 2xl:gap-6">
                {/* 24-Stunden Besuchszeiten Histogramm */}
                <Card className="2xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Clock size={20} className="text-foreground" aria-hidden /> Besuchszeiten-Verteilung (Spitzenzeiten 24h)
                        </CardTitle>
                        <CardDescription>Uhrzeiten, zu denen die Nachhilfebörse am häufigsten aufgerufen wird</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hourlyDistribution.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                Noch keine Aufrufdaten vorhanden. Sobald Nutzer Seiten aufrufen, erscheint hier ein Spitzenzeiten-Diagramm.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <ChartContainer config={hourlyChartConfig} className="h-[220px] w-full">
                                    <BarChart data={hourlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} interval={5} />
                                        <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                                <div className="flex flex-col gap-1 px-2 text-xs text-muted-foreground sm:flex-row sm:justify-between">
                                    <span>Nacht (00:00 - 06:00)</span>
                                    <span>Morgen / Schule (06:00 - 14:00)</span>
                                    <span>Nachmittag / Abend (14:00 - 23:00)</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Geräte-Verteilung */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Monitor size={20} className="text-foreground" aria-hidden /> Verwendete Geräte
                        </CardTitle>
                        <CardDescription>Aufteilung nach Gerätetypen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {deviceDistribution.map(d => {
                            const Icon = d.type === 'mobile' ? Smartphone : d.type === 'tablet' ? Tablet : Monitor;
                            const label = d.type === 'mobile' ? 'Smartphone / Mobile' : d.type === 'tablet' ? 'Tablet' : 'Desktop PC';
                            // Nenner = Summe der Gerätewerte: totalPageViews enthält auch (historische) Aufrufe
                            // ohne Gerätezuordnung, wodurch die Prozente zusammen unter 100 % lagen.
                            const deviceTotal = deviceDistribution.reduce((sum, x) => sum + x.count, 0);
                            const percentage = deviceTotal > 0 ? Math.round((d.count / deviceTotal) * 100) : 0;
                            return (
                                <div key={d.type} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2 text-xs font-medium">
                                        <span className="flex items-center gap-1.5"><Icon size={16} className="text-muted-foreground" aria-hidden /> {label}</span>
                                        <span className="text-muted-foreground tabular-nums">{d.count} ({percentage}%)</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-md bg-muted">
                                        <div className="h-full rounded-md bg-primary" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Top-Seiten List */}
                        <div className="space-y-2 border-t border-border pt-4">
                            <span className="mb-2 block text-xs font-medium text-muted-foreground">Beliebteste Seiten</span>
                            {topPages.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Noch keine Seitenaufrufe erfasst.</p>
                            ) : topPages.map(p => (
                                <div key={p.path} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="min-w-0 break-all tabular-nums text-foreground">{p.path}</span>
                                    <span className="shrink-0 text-muted-foreground">{p.count} Aufrufe</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 2: PLATTFORM-GRAPHE */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">

                {/* 1. Stufen-Verteilung */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Users size={20} className="text-foreground" aria-hidden /> Stufen-Verteilung
                        </CardTitle>
                        <CardDescription>Anzahl der verifizierten Schüler nach Klassenstufen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {gradeDistribution.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Keine Daten vorhanden.</p>
                        ) : gradeDistribution.map(g => {
                            const percentage = (g.count / maxGradeCount) * 100;
                            return (
                                <div key={g.grade} className="space-y-1">
                                    <div className="flex justify-between gap-2 text-xs font-medium">
                                        <span>{['EF', 'Q1', 'Q2'].includes(g.grade) ? `Stufe ${g.grade}` : `Klasse ${g.grade}`}</span>
                                        <span className="text-muted-foreground tabular-nums">{g.count} Schüler</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-md bg-muted">
                                        <div
                                            className="h-full rounded-md bg-primary transition-colors"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* 2. Beliebte Fächer */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <TrendingUp size={20} className="text-foreground" aria-hidden /> Beliebte Schulfächer
                        </CardTitle>
                        <CardDescription>Häufigkeit der Fächer in Angeboten und Gesuchen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {subjectDistribution.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Keine Daten vorhanden.</p>
                        ) : subjectDistribution.map(s => {
                            const percentage = (s.count / maxSubjectCount) * 100;
                            return (
                                <div key={s.subject} className="space-y-1">
                                    <div className="flex justify-between gap-2 text-xs font-medium">
                                        <span className="capitalize">{s.subject}</span>
                                        <span className="text-muted-foreground tabular-nums">{s.count} Anzeigen</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-md bg-muted">
                                        <div
                                            className="h-full rounded-md bg-primary transition-colors"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* 3. Preis-Verteilung */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Euro size={20} className="text-foreground" aria-hidden /> Preisstrukturen
                        </CardTitle>
                        <CardDescription>Aufteilung der angegebenen Stundensätze (€ / 45 Min)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {priceDistribution.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Keine Daten vorhanden.</p>
                        ) : priceDistribution.map(p => {
                            const percentage = (p.count / maxPriceCount) * 100;
                            return (
                                <div key={p.range} className="space-y-1">
                                    <div className="flex justify-between gap-2 text-xs font-medium">
                                        <span>{p.range}</span>
                                        <span className="text-muted-foreground tabular-nums">{p.count} Anzeigen</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-md bg-muted">
                                        <div
                                            className="h-full rounded-md bg-primary transition-colors"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* 4. Plattform-Status */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <CheckCircle size={20} className="text-foreground" aria-hidden /> Plattform-Status & Verifizierung
                        </CardTitle>
                        <CardDescription>Zustand von Verifizierungen und Raten</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y divide-border text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Verifizierungsrate:</span>
                            <span className="font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
                                {userStats.total > 0 ? Math.round((userStats.verified / userStats.total) * 100) : 0}% ({userStats.verified} von {userStats.total})
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Erfolgsquote (Anfragen angenommen):</span>
                            <span className="font-medium tabular-nums text-foreground">
                                {engagementStats.totalRequests > 0 ? Math.round((engagementStats.acceptedRequests / engagementStats.totalRequests) * 100) : 0}%
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Unbehandelte Meldungen:</span>
                            <span className={reportsCount.open > 0 ? 'font-medium text-destructive' : 'font-medium text-muted-foreground'}>
                                {reportsCount.open} offene Meldungen
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">SV-Admins im Dienst:</span>
                            <span className="font-medium tabular-nums text-foreground">{userStats.admins} SV-Admins</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Meistaufgerufene Anzeigen */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Eye size={20} className="text-foreground" aria-hidden /> Meistaufgerufene Anzeigen
                        </CardTitle>
                        <CardDescription>Anonyme Aufrufzählung pro Anzeigendetailseite</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {topAds.length === 0 || topAds.every(a => a.views === 0) ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                Noch keine Aufrufe gezählt. Sobald Anzeigen geöffnet werden, erscheinen sie hier.
                            </div>
                        ) : (
                            topAds.map((a, i) => (
                                <div key={a.id || i} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-foreground">
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-xs font-medium">{a.title}</p>
                                        <p className="text-xs text-muted-foreground">{a.type}</p>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
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
