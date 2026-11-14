import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
    Eye,
    Globe,
    UserCheck,
    UserX,
    FileWarning,
    CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

type StatsRange = 7 | 30 | 90;

const NA = 'Nicht verfügbar';
const numberFormat = new Intl.NumberFormat('de-DE');
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const BROWSER_LABELS: Record<string, string> = {
    chrome: 'Chrome',
    safari: 'Safari',
    firefox: 'Firefox',
    edge: 'Edge',
    opera: 'Opera',
    samsung: 'Samsung Internet',
    ie: 'Internet Explorer',
    other: 'Sonstige',
    unknown: 'Unbekannt',
};

const REPORT_CATEGORY_LABELS: Record<string, string> = {
    profil: 'Profil / Nutzer',
    anzeige: 'Anzeige',
    chat: 'Chat',
    datenschutz: 'Datenschutz',
    sonstiges: 'Sonstiges',
};

const ROLE_LABELS: Record<string, string> = {
    student: 'Schüler',
    parent: 'Elternteil',
    sv_admin: 'SV-Admin',
    coach_admin: 'Coaching-Admin',
};

const DEVICE_LABELS: Record<string, string> = {
    desktop: 'Desktop',
    mobile: 'Smartphone / Mobile',
    tablet: 'Tablet',
};

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null): string {
    return value === null ? NA : numberFormat.format(value);
}

function percent(part: number | null, total: number | null): number | null {
    if (part === null || total === null || total <= 0) return null;
    return Math.round((part / total) * 100);
}

interface PageStatsState {
    totalViews: number | null;
    uniqueLoggedIn: number | null;
    anonymousHits: number | null;
    byPath: { path: string; views: number }[] | null;
    byDevice: { type: string; views: number }[] | null;
    byBrowser: { browser: string; views: number }[] | null;
    byDay: { day: string; views: number }[] | null;
    byHour: { hour: number; views: number }[] | null;
}

interface OverviewState {
    totalUsers: number | null;
    verifiedUsers: number | null;
    bannedUsers: number | null;
    activeAds: number | null;
    openReports: number | null;
    openTickets: number | null;
    totalRequests: number | null;
    pendingRequests: number | null;
    acceptedRequests: number | null;
    rejectedRequests: number | null;
    totalReviews: number | null;
    avgRating: number | null;
    byRole: { role: string; count: number }[] | null;
    gradeDistribution: { grade: string; count: number }[] | null;
}

interface AdRow {
    id?: string;
    title?: string;
    short_description?: string;
    type?: string;
    subjects?: string[] | null;
    is_active?: boolean;
    is_archived?: boolean;
    boosted?: boolean;
    boosted_until?: string | null;
    is_boosted?: boolean;
    view_count?: number | null;
    price_details?: { mode?: string; value?: number | null } | null;
    created_at?: string;
}

interface ReportRow {
    id?: string;
    status?: string;
    category?: string;
    priority?: string;
    created_at?: string;
}

function adIsArchived(ad: AdRow): boolean {
    return ad.is_archived === true || (ad.is_archived as unknown) === 1;
}

function adIsActive(ad: AdRow): boolean {
    if (adIsArchived(ad)) return false;
    if (ad.is_active === undefined || ad.is_active === null) return true;
    return ad.is_active === true || (ad.is_active as unknown) === 1;
}

function isBoosted(ad: AdRow): boolean {
    if (ad.is_boosted !== undefined && ad.is_boosted !== null) {
        return ad.is_boosted === true || (ad.is_boosted as unknown) === 1;
    }
    if (!ad.boosted) return false;
    if (!ad.boosted_until) return true;
    return new Date(ad.boosted_until).getTime() > Date.now();
}

function buildDailySeries(byDay: { day: string; views: number }[], days: number) {
    const map = new Map(byDay.map(row => [row.day.slice(0, 10), row.views]));
    const series: { day: string; views: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        series.push({ day: key, views: map.get(key) ?? 0 });
    }
    return series;
}

function weekdaySeries(byDay: { day: string; views: number }[]) {
    // Montag = 0, Sonntag = 6 (deutsche Lesereihenfolge).
    const totals = [0, 0, 0, 0, 0, 0, 0];
    byDay.forEach(row => {
        const date = new Date(`${row.day.slice(0, 10)}T12:00:00`);
        if (Number.isNaN(date.getTime())) return;
        const index = (date.getDay() + 6) % 7;
        totals[index] += row.views;
    });
    return WEEKDAYS.map((label, index) => ({ label, views: totals[index] }));
}

function StatTile({ label, value, hint }: { label: string; value: number | null; hint: string }) {
    return (
        <div className="rounded-card border border-border bg-card p-3.5 shadow-soft sm:p-4">
            <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
            <p className={cn(
                'mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground',
                value === null && 'text-base font-medium text-muted-foreground'
            )}>
                {formatNumber(value)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

function MiniMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="min-w-0 rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function BarRow({ label, value, total, tone = 'primary' }: { label: string; value: number; total: number; tone?: 'primary' | 'muted' | 'emerald' | 'destructive' }) {
    const width = total > 0 ? Math.round((value / total) * 100) : 0;
    const toneClass = tone === 'emerald'
        ? 'bg-emerald-600 dark:bg-emerald-500'
        : tone === 'destructive'
            ? 'bg-destructive'
            : tone === 'muted'
                ? 'bg-muted-foreground/40'
                : 'bg-primary';
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="min-w-0 break-words text-foreground">{label}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{numberFormat.format(value)} · {width}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', toneClass)} style={{ width: `${width}%` }} />
            </div>
        </div>
    );
}

function Unavailable({ hint }: { hint?: string }) {
    return (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">{NA}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [overview, setOverview] = useState<OverviewState | null>(null);
    const [ads, setAds] = useState<AdRow[] | null>(null);
    const [reports, setReports] = useState<ReportRow[] | null>(null);

    const [statsDays, setStatsDays] = useState<StatsRange>(30);
    const [pageStats, setPageStats] = useState<PageStatsState | null>(null);
    const [pageStatsLoading, setPageStatsLoading] = useState(true);
    const [pageStatsError, setPageStatsError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchPageStats(statsDays, () => cancelled);
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsDays]);

    const fetchPageStats = async (days: StatsRange, isCancelled?: () => boolean) => {
        setPageStatsLoading(true);
        setPageStatsError(null);
        // Keine alten Zeitraumwerte unter neuem Range-Label weiterzeigen.
        setPageStats(null);
        try {
            const { data, error } = await api.analytics.stats(days);
            if (error) throw error;
            if (isCancelled?.()) return;
            const raw = (data ?? {}) as Record<string, unknown>;
            const mapRows = (value: unknown, mapper: (row: any) => any) =>
                Array.isArray(value) ? value.map(mapper) : null;
            setPageStats({
                totalViews: toNumber(raw.total_views),
                uniqueLoggedIn: toNumber(raw.unique_logged_in),
                anonymousHits: toNumber(raw.anonymous_hits),
                byPath: mapRows(raw.by_path, row => ({
                    path: String(row.path ?? ''),
                    views: toNumber(row.views) ?? 0,
                })),
                byDevice: mapRows(raw.by_device, row => ({
                    type: String(row.device_type ?? row.type ?? 'unknown'),
                    views: toNumber(row.views) ?? 0,
                })),
                byBrowser: mapRows(raw.by_browser, row => ({
                    browser: String(row.browser ?? 'unknown'),
                    views: toNumber(row.views) ?? 0,
                })),
                byDay: mapRows(raw.by_day, row => ({
                    day: String(row.day ?? '').slice(0, 10),
                    views: toNumber(row.views) ?? 0,
                })),
                byHour: mapRows(raw.by_hour, row => ({
                    hour: toNumber(row.hour) ?? 0,
                    views: toNumber(row.views) ?? 0,
                })),
            });
        } catch {
            if (!isCancelled?.()) {
                setPageStats(null);
                setPageStatsError('Seitenaufrufe und Publikumsdaten konnten nicht geladen werden.');
                toast.error('Seitenaufrufe konnten nicht geladen werden.');
            }
        } finally {
            if (!isCancelled?.()) setPageStatsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        setLoadError(null);
        const unavailable: string[] = [];
        try {
            const [overviewResult, adsResult, reportsResult] = await Promise.all([
                api.admin.overview(),
                api.ads.list({ all: true }),
                api.reports.list(),
            ]);

            if (overviewResult.error) {
                unavailable.push('Admin-Kennzahlen');
                setOverview(null);
            } else {
                const raw = (overviewResult.data ?? {}) as Record<string, unknown>;
                const stats = (raw.stats && typeof raw.stats === 'object') ? raw.stats as Record<string, unknown> : {};
                const gradeRows = Array.isArray(raw.grade_distribution) ? raw.grade_distribution : null;
                const roleRaw = (raw.by_role && typeof raw.by_role === 'object') ? raw.by_role as Record<string, unknown> : null;
                setOverview({
                    totalUsers: toNumber(stats.total_users),
                    verifiedUsers: toNumber(stats.verified_users),
                    bannedUsers: toNumber(stats.banned_users),
                    activeAds: toNumber(stats.active_ads),
                    openReports: toNumber(stats.open_reports),
                    openTickets: toNumber(stats.open_tickets),
                    totalRequests: toNumber(stats.total_requests),
                    pendingRequests: toNumber(stats.pending_requests),
                    acceptedRequests: toNumber(stats.accepted_requests),
                    rejectedRequests: toNumber(stats.rejected_requests),
                    totalReviews: toNumber(stats.total_reviews),
                    avgRating: toNumber(stats.avg_rating),
                    byRole: roleRaw
                        ? Object.entries(roleRaw).map(([role, count]) => ({ role, count: toNumber(count) ?? 0 }))
                        : null,
                    gradeDistribution: gradeRows
                        ? gradeRows.map((row: any) => ({
                            grade: String(row.grade ?? row.grade_level ?? ''),
                            count: toNumber(row.count ?? row.c) ?? 0,
                        })).filter(row => row.grade !== '')
                        : null,
                });
            }

            if (adsResult.error) {
                unavailable.push('Anzeigen');
                setAds(null);
            } else {
                const adsPayload = adsResult.data as any;
                setAds(Array.isArray(adsResult.data)
                    ? (adsResult.data as AdRow[])
                    : (Array.isArray(adsPayload?.ads) ? adsPayload.ads as AdRow[] : []));
            }

            if (reportsResult.error) {
                unavailable.push('Meldungen');
                setReports(null);
            } else {
                const reportsPayload = reportsResult.data as any;
                setReports(Array.isArray(reportsResult.data)
                    ? (reportsResult.data as ReportRow[])
                    : (Array.isArray(reportsPayload?.reports) ? reportsPayload.reports as ReportRow[] : []));
            }

            setLoadError(unavailable.length > 0
                ? `${unavailable.join(' / ')} ${unavailable.length === 1 ? 'ist' : 'sind'} nicht verfügbar.`
                : null);
        } catch {
            setLoadError('Analytics konnten nicht geladen werden.');
            toast.error('Analytics konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const rangeLabel = statsDays === 7 ? 'letzte 7 Tage' : statsDays === 90 ? 'letzte 90 Tage' : 'letzte 30 Tage';
    const dailyViews = pageStats?.byDay ? buildDailySeries(pageStats.byDay, statsDays) : null;
    const rangeViews = dailyViews ? dailyViews.reduce((sum, row) => sum + row.views, 0) : null;
    const topPages = pageStats?.byPath
        ? [...pageStats.byPath].sort((a, b) => b.views - a.views)
        : null;
    const deviceRows = pageStats?.byDevice
        ? [...pageStats.byDevice].sort((a, b) => b.views - a.views)
        : null;
    const browserRows = pageStats?.byBrowser
        ? [...pageStats.byBrowser].sort((a, b) => b.views - a.views)
        : null;
    const deviceTotal = deviceRows ? deviceRows.reduce((sum, row) => sum + row.views, 0) : null;
    const browserTotal = browserRows ? browserRows.reduce((sum, row) => sum + row.views, 0) : null;
    const weekdayRows = dailyViews ? weekdaySeries(dailyViews) : null;
    const peakWeekday = weekdayRows && weekdayRows.some(row => row.views > 0)
        ? weekdayRows.reduce((best, row) => row.views > best.views ? row : best, weekdayRows[0])
        : null;
    const peakHour = pageStats?.byHour && pageStats.byHour.length > 0
        ? pageStats.byHour.reduce((best, row) => row.views > best.views ? row : best, pageStats.byHour[0])
        : null;
    const anonymousShare = percent(pageStats?.anonymousHits ?? null, rangeViews);

    // Anzeigen-Snapshot
    const adStats = ads ? {
        total: ads.length,
        offers: ads.filter(ad => ad.type === 'offer').length,
        searches: ads.filter(ad => ad.type === 'search').length,
        active: ads.filter(ad => adIsActive(ad)).length,
        inactive: ads.filter(ad => !adIsActive(ad) && !adIsArchived(ad)).length,
        archived: ads.filter(ad => adIsArchived(ad)).length,
        boosted: ads.filter(isBoosted).length,
    } : null;

    const subjectRows = ads ? (() => {
        const map = new Map<string, { subject: string; offers: number; searches: number }>();
        ads.forEach(ad => {
            if (!Array.isArray(ad.subjects)) return;
            ad.subjects.forEach(subject => {
                const key = String(subject || '').trim();
                if (!key) return;
                const row = map.get(key) ?? { subject: key, offers: 0, searches: 0 };
                if (ad.type === 'search') row.searches += 1;
                else row.offers += 1;
                map.set(key, row);
            });
        });
        return [...map.values()].sort((a, b) => (b.offers + b.searches) - (a.offers + a.searches));
    })() : null;

    const priceRows = ads ? (() => {
        const ranges = [
            { range: 'Kostenlos', count: 0 },
            { range: 'Unter 10 €', count: 0 },
            { range: '10–15 €', count: 0 },
            { range: 'Über 15 €', count: 0 },
            { range: 'Verhandlungsbasis', count: 0 },
        ];
        ads.forEach(ad => {
            const mode = ad.price_details?.mode;
            const value = Number(ad.price_details?.value || 0);
            if (mode === 'free') ranges[0].count++;
            else if (mode === 'vb') ranges[4].count++;
            else if (mode === 'fixed') {
                if (value < 10) ranges[1].count++;
                else if (value <= 15) ranges[2].count++;
                else ranges[3].count++;
            }
        });
        return ranges;
    })() : null;

    const ageRows = ads ? (() => {
        const buckets = [
            { label: 'Bis 7 Tage', count: 0 },
            { label: '8–30 Tage', count: 0 },
            { label: 'Älter als 30 Tage', count: 0 },
        ];
        ads.forEach(ad => {
            if (!ad.created_at) return;
            const time = new Date(ad.created_at).getTime();
            if (!Number.isFinite(time)) return;
            const days = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
            if (days <= 7) buckets[0].count++;
            else if (days <= 30) buckets[1].count++;
            else buckets[2].count++;
        });
        return buckets;
    })() : null;

    const hasViewCounts = ads !== null && ads.some(ad => ad.view_count !== undefined && ad.view_count !== null);
    const topAds = ads && hasViewCounts
        ? [...ads]
            .map(ad => ({
                id: String(ad.id ?? ''),
                title: String(ad.title || ad.short_description || 'Anzeige ohne Titel'),
                type: ad.type === 'search' ? 'Gesuch' : 'Angebot',
                views: Number(ad.view_count) || 0,
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 6)
        : null;

    // Meldungs-Snapshot
    const reportStats = reports ? {
        total: reports.length,
        open: reports.filter(report => report.status === 'open').length,
        investigating: reports.filter(report => report.status === 'investigating').length,
        resolved: reports.filter(report => report.status === 'resolved').length,
        dismissed: reports.filter(report => report.status === 'dismissed').length,
        categories: (() => {
            const map = new Map<string, number>();
            reports.forEach(report => {
                const key = String(report.category || 'sonstiges');
                map.set(key, (map.get(key) ?? 0) + 1);
            });
            return [...map.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
        })(),
        aging: (() => {
            const buckets = [
                { label: '0–3 Tage', count: 0 },
                { label: '4–7 Tage', count: 0 },
                { label: 'Über 7 Tage', count: 0 },
            ];
            reports
                .filter(report => report.status === 'open' || report.status === 'investigating')
                .forEach(report => {
                    if (!report.created_at) return;
                    const time = new Date(report.created_at).getTime();
                    if (!Number.isFinite(time)) return;
                    const days = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
                    if (days <= 3) buckets[0].count++;
                    else if (days <= 7) buckets[1].count++;
                    else buckets[2].count++;
                });
            return buckets;
        })(),
    } : null;

    const verificationRate = percent(overview?.verifiedUsers ?? null, overview?.totalUsers ?? null);
    const requestConversion = percent(overview?.acceptedRequests ?? null, overview?.totalRequests ?? null);
    const gradeRows = overview?.gradeDistribution ? [...overview.gradeDistribution].sort((a, b) => a.grade.localeCompare(b.grade, 'de', { numeric: true })) : null;
    const maxGrade = gradeRows && gradeRows.length > 0 ? Math.max(...gradeRows.map(row => row.count), 1) : 1;
    const maxPrice = priceRows && priceRows.length > 0 ? Math.max(...priceRows.map(row => row.count), 1) : 1;
    const maxSubject = subjectRows && subjectRows.length > 0 ? Math.max(...subjectRows.map(row => row.offers + row.searches), 1) : 1;

    const dailyChartData = dailyViews?.map(row => ({
        day: new Date(`${row.day}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        views: row.views,
    })) ?? [];
    const dailyChartConfig = {
        views: { label: 'Seitenaufrufe', color: 'var(--chart-1)' },
    } satisfies ChartConfig;

    const hourlyRows = pageStats?.byHour
        ? Array.from({ length: 24 }, (_, hour) => ({
            hour,
            views: pageStats.byHour?.find(row => Number(row.hour) === hour)?.views ?? 0,
        }))
        : null;
    const hourlyChartData = hourlyRows?.map(row => ({ hour: `${row.hour}:00`, views: row.views })) ?? [];
    const hourlyChartConfig = {
        views: { label: 'Aufrufe', color: 'var(--chart-1)' },
    } satisfies ChartConfig;

    const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
        const escape = (value: string | number) => {
            let text = String(value ?? '');
            if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
            return `"${text.replace(/"/g, '""')}"`;
        };
        const csv = [headers.map(escape).join(','), ...rows.map(row => row.map(escape).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Datei "${filename}" heruntergeladen.`);
    };

    const exportUsersCSV = () => {
        if (!overview) {
            toast.error('Nutzer-Aggregat ist nicht verfügbar.');
            return;
        }
        const rows: (string | number)[][] = [
            ...(overview.byRole ?? []).map(row => ['Rolle', row.role, row.count] as (string | number)[]),
            ...(overview.gradeDistribution ?? []).map(row => ['Klassenstufe', row.grade, row.count] as (string | number)[]),
        ];
        if (rows.length === 0) {
            toast.error('Keine Nutzer-Aggregate vorhanden.');
            return;
        }
        exportToCSV(`fwg_nutzer_aggregat_${new Date().toISOString().slice(0, 10)}.csv`, ['Bereich', 'Schlüssel', 'Anzahl'], rows);
    };

    const exportAdsCSV = () => {
        if (!ads) {
            toast.error('Anzeigen sind nicht verfügbar.');
            return;
        }
        const rows = ads.map(ad => [
            ad.id ?? '',
            ad.type === 'offer' ? 'Angebot' : 'Gesuch',
            ad.title || ad.short_description || '',
            Array.isArray(ad.subjects) ? ad.subjects.join('; ') : '',
            ad.price_details?.mode || '',
            ad.price_details?.value || 0,
            adIsActive(ad) ? 'Ja' : 'Nein',
            adIsArchived(ad) ? 'Ja' : 'Nein',
            isBoosted(ad) ? 'Ja' : 'Nein',
            ad.created_at ? new Date(ad.created_at).toLocaleString('de-DE') : '',
        ] as (string | number)[]);
        exportToCSV(`fwg_anzeigen_export_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Typ', 'Titel', 'Fächer', 'Preis-Modus', 'Preis-Wert', 'Aktiv', 'Archiviert', 'Geboostet', 'Erstellt am'], rows);
    };

    const exportAnalyticsCSV = () => {
        if (!pageStats) {
            toast.error('Seitenaufrufe sind nicht verfügbar.');
            return;
        }
        const rows: (string | number)[][] = [
            ...(topPages ?? []).map(row => ['Top-Seite', row.path, row.views] as (string | number)[]),
            ...(deviceRows ?? []).map(row => ['Gerät', DEVICE_LABELS[row.type] || row.type, row.views] as (string | number)[]),
            ...(browserRows ?? []).map(row => ['Browser', BROWSER_LABELS[row.browser] || row.browser, row.views] as (string | number)[]),
            ...(dailyViews ?? []).map(row => ['Tag', row.day, row.views] as (string | number)[]),
            ...(topAds ?? []).map(row => ['Top-Anzeige', `${row.type}: ${row.title}`, row.views] as (string | number)[]),
        ];
        if (rows.length === 0) {
            toast.error('Keine Analytics-Daten zum Export vorhanden.');
            return;
        }
        exportToCSV(`fwg_analytics_${statsDays}_tage_${new Date().toISOString().slice(0, 10)}.csv`, ['Bereich', 'Schlüssel', 'Aufrufe'], rows);
    };

    const exportTopPagesCSV = () => {
        if (!topPages || topPages.length === 0) {
            toast.error('Keine Seitenaufrufe im Zeitraum.');
            return;
        }
        exportToCSV(
            `fwg_top_seiten_${statsDays}_tage_${new Date().toISOString().slice(0, 10)}.csv`,
            ['Seite', 'Aufrufe'],
            topPages.map(row => [row.path, row.views])
        );
    };

    if (loading) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                <Spinner className="size-6 text-foreground" />
                <p className="text-sm text-muted-foreground">Lade Analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <header className="min-w-0">
                    <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        <BarChart3 className="shrink-0" size={24} aria-hidden /> Analytics &amp; Statistik
                    </h1>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        Seitenaufrufe und Publikum im gewählten Zeitraum · Nutzer, Anzeigen und Meldungen als aktueller Gesamtstand
                    </p>
                </header>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1" role="group" aria-label="Zeitraum der Seitenaufrufe">
                        {([7, 30, 90] as StatsRange[]).map(days => (
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                key={days}
                                type="button"
                                onClick={() => setStatsDays(days)}
                                aria-pressed={statsDays === days}
                                className={cn(
                                    'min-h-11 rounded-full px-3 text-xs font-medium transition-colors',
                                    statsDays === days ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {days} Tage
                            </Button>
                        ))}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    variant="outline"
                                    className="h-11 gap-1.5 px-3 text-xs"
                                    aria-label="CSV-Exporte öffnen"
                                />
                            }
                        >
                            <Download size={16} aria-hidden /> Export
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuLabel>CSV-Export</DropdownMenuLabel>
                            <DropdownMenuItem className="min-h-11" onClick={exportUsersCSV}>
                                Nutzer-Aggregat
                            </DropdownMenuItem>
                            <DropdownMenuItem className="min-h-11" onClick={exportAdsCSV}>
                                Anzeigen (alle)
                            </DropdownMenuItem>
                            <DropdownMenuItem className="min-h-11" onClick={exportAnalyticsCSV}>
                                Aufrufe ({rangeLabel})
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Einige Kennzahlen nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchAnalytics}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Gesamtstand */}
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <StatTile
                    label="Registrierte Nutzer"
                    value={overview?.totalUsers ?? null}
                    hint={overview?.verifiedUsers !== null && overview?.verifiedUsers !== undefined
                        ? `${formatNumber(overview.verifiedUsers)} verifiziert · alle Zeit`
                        : 'Alle Zeit'}
                />
                <StatTile
                    label="Seitenaufrufe gesamt"
                    value={pageStats?.totalViews ?? null}
                    hint={rangeViews !== null ? `${formatNumber(rangeViews)} im Zeitraum (${rangeLabel})` : 'Server-Gesamtzähler · alle Zeit'}
                />
                <StatTile
                    label="Aktive Anzeigen"
                    value={adStats?.active ?? overview?.activeAds ?? null}
                    hint={adStats ? `${adStats.offers} Angebote · ${adStats.searches} Gesuche` : 'Momentaufnahme aller Anzeigen'}
                />
                <StatTile
                    label="Offene Meldungen"
                    value={overview?.openReports ?? reportStats?.open ?? null}
                    hint={reportStats ? `${reportStats.total} Meldungen gesamt` : 'Momentaufnahme aller Meldungen'}
                />
            </div>

            {/* Aufrufe im Zeitraum */}
            <Card className="rounded-card">
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <TrendingUp size={20} className="text-foreground" aria-hidden /> Aufrufe-Verlauf
                            </CardTitle>
                            <CardDescription>
                                Seitenaufrufe pro Tag ({rangeLabel}) · anonyme Server-Statistik ohne IP
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-md border border-border bg-muted/40 px-2 py-1">Zeitraum: {rangeLabel}</span>
                            <span className="rounded-md border border-border bg-muted/40 px-2 py-1">Gesamt alle Zeit: {formatNumber(pageStats?.totalViews ?? null)}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pageStatsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                            <Spinner className="size-4" /> Lade Verlauf...
                        </div>
                    ) : pageStatsError ? (
                        <div className="space-y-3">
                            <Alert variant="destructive">
                                <AlertTitle>Seitenaufrufe nicht verfügbar</AlertTitle>
                                <AlertDescription className="flex flex-col items-start gap-3">
                                    <span>{pageStatsError}</span>
                                    <Button type="button" variant="outline" className="h-11" onClick={() => fetchPageStats(statsDays)}>
                                        Erneut laden
                                    </Button>
                                </AlertDescription>
                            </Alert>
                            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                                <MiniMetric label="Aufrufe im Zeitraum" value={NA} />
                                <MiniMetric label="Eingeloggte Besucher" value={NA} />
                                <MiniMetric label="Anonyme Aufrufe" value={NA} />
                                <MiniMetric label="Ø Aufrufe pro Tag" value={NA} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                                <MiniMetric
                                    label="Aufrufe im Zeitraum"
                                    value={formatNumber(rangeViews)}
                                    hint={`Summe der Tageswerte · ${rangeLabel}`}
                                />
                                <MiniMetric
                                    label="Eingeloggte Besucher"
                                    value={formatNumber(pageStats?.uniqueLoggedIn ?? null)}
                                    hint="Eindeutige Personen im Zeitraum"
                                />
                                <MiniMetric
                                    label="Anonyme Aufrufe"
                                    value={formatNumber(pageStats?.anonymousHits ?? null)}
                                    hint={anonymousShare !== null ? `${anonymousShare}% aller Aufrufe im Zeitraum` : 'Aufrufe ohne Login im Zeitraum'}
                                />
                                <MiniMetric
                                    label="Ø Aufrufe pro Tag"
                                    value={rangeViews === null ? NA : numberFormat.format(Math.round(rangeViews / statsDays))}
                                    hint={`${rangeLabel} · gerundet`}
                                />
                            </div>

                            {dailyViews === null ? (
                                <Unavailable hint="Die Statistik-Antwort enthält keine Tageswerte." />
                            ) : dailyViews.every(row => row.views === 0) ? (
                                <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center">
                                    <p className="text-[13px] font-medium text-foreground">Keine Aufrufe im gewählten Zeitraum</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Sobald Nutzer Seiten aufrufen, erscheint hier der Verlauf.</p>
                                </div>
                            ) : (
                                <ChartContainer
                                    config={dailyChartConfig}
                                    className="h-[220px] w-full"
                                    role="img"
                                    aria-label={`Seitenaufrufe pro Tag, ${rangeLabel}`}
                                >
                                    <BarChart data={dailyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                                        <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                        <Bar dataKey="views" fill="var(--color-views)" radius={[4, 4, 0, 0]} maxBarSize={56} />
                                    </BarChart>
                                </ChartContainer>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Publikum: Browser, Geräte, anonym vs. eingeloggt */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Globe size={20} className="text-foreground" aria-hidden /> Browser-Anteil
                        </CardTitle>
                        <CardDescription>Seitenaufrufe nach Browser · {rangeLabel}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {browserRows === null ? (
                            <Unavailable hint="Die Statistik-Antwort enthält keine Browser-Daten." />
                        ) : browserRows.length === 0 ? (
                            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine Browser-Daten im Zeitraum.</p>
                        ) : browserRows.map(row => (
                            <BarRow
                                key={row.browser}
                                label={BROWSER_LABELS[String(row.browser).toLowerCase()] || String(row.browser)}
                                value={row.views}
                                total={browserTotal ?? 0}
                            />
                        ))}
                    </CardContent>
                </Card>

                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Monitor size={20} className="text-foreground" aria-hidden /> Verwendete Geräte
                        </CardTitle>
                        <CardDescription>Seitenaufrufe nach Gerätetyp · {rangeLabel}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {deviceRows === null ? (
                            <Unavailable hint="Die Statistik-Antwort enthält keine Geräte-Daten." />
                        ) : deviceRows.length === 0 ? (
                            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine Geräte-Daten im Zeitraum.</p>
                        ) : deviceRows.map(row => {
                            const Icon = row.type === 'mobile' ? Smartphone : row.type === 'tablet' ? Tablet : Monitor;
                            return (
                                <div key={row.type} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2 text-[13px]">
                                        <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                                            <Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                                            {DEVICE_LABELS[row.type] || row.type}
                                        </span>
                                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                            {numberFormat.format(row.views)} · {percent(row.views, deviceTotal) ?? 0}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent(row.views, deviceTotal) ?? 0}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Users size={20} className="text-foreground" aria-hidden /> Anonym vs. eingeloggt
                        </CardTitle>
                        <CardDescription>Personen und Aufrufe getrennt ausgewiesen · {rangeLabel}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pageStats === null || (pageStats.uniqueLoggedIn === null && pageStats.anonymousHits === null) ? (
                            <Unavailable hint="Die Statistik-Antwort enthält keine Besucherzahlen." />
                        ) : (
                            <>
                                <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
                                    <UserCheck size={18} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground">Eingeloggte Besucher</p>
                                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{formatNumber(pageStats?.uniqueLoggedIn ?? null)}</p>
                                        <p className="text-xs text-muted-foreground">eindeutige Personen im Zeitraum</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
                                    <UserX size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground">Anonyme Aufrufe</p>
                                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{formatNumber(pageStats?.anonymousHits ?? null)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {anonymousShare !== null ? `${anonymousShare}% aller Aufrufe im Zeitraum` : 'Aufrufe ohne Login im Zeitraum'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Hinweis: Besucher sind Personen, anonyme Aufrufe sind Seitenaufrufe – die Werte sind nicht direkt vergleichbar.
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top-Seiten */}
            <Card className="rounded-card">
                <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <Eye size={20} className="text-foreground" aria-hidden /> Meistbesuchte Seiten
                            </CardTitle>
                            <CardDescription>
                                {topPages === null
                                    ? `Seitenaufrufe im Zeitraum (${rangeLabel}) · Daten nicht verfügbar`
                                    : `Seitenaufrufe im Zeitraum (${rangeLabel}) · Top 10 von ${topPages.length}`}
                            </CardDescription>
                        </div>
                        <Button onClick={exportTopPagesCSV} variant="outline" className="h-11 w-fit gap-1.5 px-3 text-xs">
                            <Download size={16} aria-hidden /> Seiten-CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent padding="flush">
                    {topPages === null ? (
                        <div className="p-4"><Unavailable hint="Die Statistik-Antwort enthält keine Seitenpfade." /></div>
                    ) : topPages.length === 0 ? (
                        <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">Keine Seitenaufrufe im Zeitraum.</p>
                    ) : (
                        <Table className="text-[13px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-4 sm:pl-6">Seite</TableHead>
                                    <TableHead className="text-right">Aufrufe</TableHead>
                                    <TableHead className="hidden pr-4 text-right sm:table-cell sm:pr-6">Anteil</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topPages.slice(0, 10).map(row => (
                                    <TableRow key={row.path}>
                                        <TableCell className="max-w-0 pl-4 sm:pl-6">
                                            <span className="block truncate text-[13px] font-medium text-foreground" title={row.path}>{row.path}</span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{numberFormat.format(row.views)}</TableCell>
                                        <TableCell className="hidden pr-4 text-right text-xs tabular-nums text-muted-foreground sm:table-cell sm:pr-6">
                                            {rangeViews !== null && rangeViews > 0 ? `${Math.round((row.views / rangeViews) * 100)}%` : NA}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Fächer: Nachfrage vs. Angebot */}
            <Card className="rounded-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <BarChart3 size={20} className="text-foreground" aria-hidden /> Fächer: Nachfrage vs. Angebot
                    </CardTitle>
                    <CardDescription>Alle Anzeigen · Angebote und Gesuche je Fach (Mehrfachnennungen möglich) · Balken: Angebote gelb, Gesuche grau</CardDescription>
                </CardHeader>
                <CardContent padding="flush">
                    {subjectRows === null ? (
                        <div className="p-4"><Unavailable hint="Anzeigen konnten nicht geladen werden." /></div>
                    ) : subjectRows.length === 0 ? (
                        <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">Keine Fächer in Anzeigen vorhanden.</p>
                    ) : (
                        <Table className="text-[13px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-4 sm:pl-6">Fach</TableHead>
                                    <TableHead className="text-right">Angebote</TableHead>
                                    <TableHead className="text-right">Gesuche</TableHead>
                                    <TableHead className="hidden pr-4 text-right sm:table-cell sm:pr-6">Gesamt</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjectRows.slice(0, 10).map(row => (
                                    <TableRow key={row.subject}>
                                        <TableCell className="max-w-0 pl-4 sm:pl-6">
                                            <div className="min-w-0">
                                                <span className="block truncate text-[13px] font-medium capitalize text-foreground" title={row.subject}>{row.subject}</span>
                                                <div className="mt-1 flex h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
                                                    <div className="h-full bg-primary" style={{ width: `${(row.offers / maxSubject) * 100}%` }} />
                                                    <div className="h-full bg-muted-foreground/40" style={{ width: `${(row.searches / maxSubject) * 100}%` }} />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{row.offers}</TableCell>
                                        <TableCell className="text-right tabular-nums">{row.searches}</TableCell>
                                        <TableCell className="hidden pr-4 text-right font-medium tabular-nums sm:table-cell sm:pr-6">{row.offers + row.searches}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Anzeigen-Lebenszyklus + Meldungen */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <FileWarning size={20} className="text-foreground" aria-hidden /> Anzeigen-Lebenszyklus
                        </CardTitle>
                        <CardDescription>Alle Anzeigen · Status und Alter zum Abfragezeitpunkt</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {adStats === null ? (
                            <Unavailable hint="Anzeigen konnten nicht geladen werden." />
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <MiniMetric label="Aktiv" value={numberFormat.format(adStats.active)} />
                                    <MiniMetric label="Versteckt" value={numberFormat.format(adStats.inactive)} hint="inaktiv" />
                                    <MiniMetric label="Archiviert" value={numberFormat.format(adStats.archived)} />
                                    <MiniMetric label="Geboostet" value={numberFormat.format(adStats.boosted)} />
                                </div>
                                <div className="space-y-2 border-t border-border pt-3">
                                    <p className="text-xs font-medium text-muted-foreground">Anzeigenalter</p>
                                    {ageRows?.every(row => row.count === 0) ? (
                                        <p className="text-[13px] text-muted-foreground">Keine verwertbaren Erstellungsdaten.</p>
                                    ) : ageRows?.map(row => (
                                        <BarRow key={row.label} label={row.label} value={row.count} total={adStats.total} tone="muted" />
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <FileWarning size={20} className="text-foreground" aria-hidden /> Meldungen: Kategorien &amp; Alter
                        </CardTitle>
                        <CardDescription>Alle Meldungen · Kategorien und Alter offener Fälle</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {reportStats === null ? (
                            <Unavailable hint="Meldungen konnten nicht geladen werden." />
                        ) : reportStats.total === 0 ? (
                            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine Meldungen vorhanden.</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <MiniMetric label="Offen" value={numberFormat.format(reportStats.open)} />
                                    <MiniMetric label="In Prüfung" value={numberFormat.format(reportStats.investigating)} />
                                    <MiniMetric label="Gelöst" value={numberFormat.format(reportStats.resolved)} />
                                    <MiniMetric label="Abgewiesen" value={numberFormat.format(reportStats.dismissed)} />
                                </div>
                                <div className="space-y-2 border-t border-border pt-3">
                                    <p className="text-xs font-medium text-muted-foreground">Kategorien</p>
                                    {reportStats.categories.map(row => (
                                        <BarRow key={row.category} label={REPORT_CATEGORY_LABELS[row.category] || row.category} value={row.count} total={reportStats.total} tone="muted" />
                                    ))}
                                </div>
                                <div className="space-y-2 border-t border-border pt-3">
                                    <p className="text-xs font-medium text-muted-foreground">Alter offener / in Prüfung befindlicher Meldungen</p>
                                    {reportStats.aging.every(row => row.count === 0) ? (
                                        <p className="text-[13px] text-muted-foreground">Keine offenen Meldungen mit Datum.</p>
                                    ) : reportStats.aging.map(row => (
                                        <BarRow key={row.label} label={row.label} value={row.count} total={Math.max(1, reportStats.open + reportStats.investigating)} tone="destructive" />
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Anfragen-Funnel + Peak/Wochentag */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <CheckCircle size={20} className="text-foreground" aria-hidden /> Anfragen-Funnel
                        </CardTitle>
                        <CardDescription>Alle Anfragen der Plattform · Momentaufnahme</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {overview === null || (overview.totalRequests === null && overview.pendingRequests === null && overview.acceptedRequests === null && overview.rejectedRequests === null) ? (
                            <Unavailable hint="Die Admin-Kennzahlen enthalten keine Anfragewerte." />
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <MiniMetric label="Gesamt" value={formatNumber(overview?.totalRequests ?? null)} />
                                    <MiniMetric label="Offen" value={formatNumber(overview?.pendingRequests ?? null)} hint="ausstehend" />
                                    <MiniMetric label="Angenommen" value={formatNumber(overview?.acceptedRequests ?? null)} />
                                    <MiniMetric label="Abgelehnt" value={formatNumber(overview?.rejectedRequests ?? null)} />
                                </div>
                                <div className="space-y-2 border-t border-border pt-3">
                                    <BarRow label="Angenommen" value={overview?.acceptedRequests ?? 0} total={overview?.totalRequests ?? 0} tone="emerald" />
                                    <BarRow label="Offen" value={overview?.pendingRequests ?? 0} total={overview?.totalRequests ?? 0} tone="muted" />
                                    <BarRow label="Abgelehnt" value={overview?.rejectedRequests ?? 0} total={overview?.totalRequests ?? 0} tone="destructive" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Annahmequote: {requestConversion === null ? NA : `${requestConversion}%`} (angenommen / gesamt)
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Clock size={20} className="text-foreground" aria-hidden /> Spitzenzeiten &amp; Wochentage
                        </CardTitle>
                        <CardDescription>Aufrufe im Zeitraum ({rangeLabel})</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <MiniMetric
                                label="Spitzenstunde"
                                value={peakHour ? `${peakHour.hour}:00–${peakHour.hour + 1}:00` : NA}
                                hint={peakHour ? `${numberFormat.format(peakHour.views)} Aufrufe` : 'keine Stundendaten'}
                            />
                            <MiniMetric
                                label="Stärkster Wochentag"
                                value={peakWeekday ? peakWeekday.label : NA}
                                hint={peakWeekday ? `${numberFormat.format(peakWeekday.views)} Aufrufe` : 'keine Tagesdaten'}
                            />
                        </div>

                        {hourlyRows === null ? (
                            <Unavailable hint="Die Statistik-Antwort enthält keine Stundendaten." />
                        ) : hourlyRows.every(row => row.views === 0) ? (
                            <p className="py-4 text-center text-[13px] text-muted-foreground">Keine Aufrufe im Zeitraum.</p>
                        ) : (
                            <>
                                <ChartContainer
                                    config={hourlyChartConfig}
                                    className="h-[170px] w-full"
                                    role="img"
                                    aria-label={`Seitenaufrufe nach Stunde, ${rangeLabel}`}
                                >
                                    <BarChart data={hourlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} interval={5} />
                                        <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                        <Bar dataKey="views" fill="var(--color-views)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                                <div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
                                    <span>Nacht (0–6)</span>
                                    <span>Schule (6–14)</span>
                                    <span>Nachmittag / Abend (14–23)</span>
                                </div>
                            </>
                        )}

                        <div className="space-y-2 border-t border-border pt-3">
                            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <CalendarDays size={16} aria-hidden /> Wochentage
                            </p>
                            {weekdayRows === null ? (
                                <p className="text-[13px] text-muted-foreground">{NA}</p>
                            ) : weekdayRows.every(row => row.views === 0) ? (
                                <p className="text-[13px] text-muted-foreground">Keine Tagesdaten im Zeitraum.</p>
                            ) : (
                                <div className="grid grid-cols-7 items-end gap-1">
                                    {weekdayRows.map(row => {
                                        const max = Math.max(...weekdayRows.map(item => item.views), 1);
                                        return (
                                            <div
                                                key={row.label}
                                                className="flex min-w-0 flex-col items-center gap-1"
                                                role="img"
                                                aria-label={`${row.label}: ${numberFormat.format(row.views)} Aufrufe`}
                                            >
                                                <div className="flex h-16 w-full items-end rounded-sm bg-muted/50">
                                                    <div
                                                        className="w-full rounded-sm bg-primary"
                                                        style={{ height: `${Math.max(2, Math.round((row.views / max) * 100))}%` }}
                                                        title={`${row.label}: ${numberFormat.format(row.views)} Aufrufe`}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{row.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Plattform: Stufen, Preise, Status */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Users size={20} className="text-foreground" aria-hidden /> Stufen-Verteilung
                        </CardTitle>
                        <CardDescription>Alle Nutzer mit Klassenstufe · Momentaufnahme</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {gradeRows === null ? (
                            <Unavailable hint="Die Admin-Kennzahlen enthalten keine Stufenverteilung." />
                        ) : gradeRows.length === 0 ? (
                            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine Stufen-Daten vorhanden.</p>
                        ) : gradeRows.map(row => (
                            <div key={row.grade} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-[13px]">
                                    <span className="text-foreground">{['EF', 'Q1', 'Q2'].includes(row.grade) ? `Stufe ${row.grade}` : `Klasse ${row.grade}`}</span>
                                    <span className="text-xs tabular-nums text-muted-foreground">{numberFormat.format(row.count)} Nutzer</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((row.count / maxGrade) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Euro size={20} className="text-foreground" aria-hidden /> Preisstrukturen
                        </CardTitle>
                        <CardDescription>Alle Anzeigen · angegebene Stundensätze (€ / 45 Min)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {priceRows === null ? (
                            <Unavailable hint="Anzeigen konnten nicht geladen werden." />
                        ) : priceRows.every(row => row.count === 0) ? (
                            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine Preisangaben in Anzeigen.</p>
                        ) : priceRows.map(row => (
                            <div key={row.range} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-[13px]">
                                    <span className="text-foreground">{row.range}</span>
                                    <span className="text-xs tabular-nums text-muted-foreground">{numberFormat.format(row.count)} Anzeigen</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((row.count / maxPrice) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <CheckCircle size={20} className="text-foreground" aria-hidden /> Plattform-Status
                        </CardTitle>
                        <CardDescription>Verifizierung, Bewertungen und offene Fälle · Momentaufnahme</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y divide-border text-[13px]">
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Verifizierungsrate</span>
                            <span className="font-medium tabular-nums text-foreground">
                                {verificationRate === null ? NA : `${verificationRate}%`}
                                {overview?.verifiedUsers != null && overview?.totalUsers != null
                                    ? ` (${numberFormat.format(overview.verifiedUsers)} von ${numberFormat.format(overview.totalUsers)})`
                                    : ''}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Durchschnittsbewertung</span>
                            <span className="flex items-center gap-1.5 font-medium tabular-nums text-foreground">
                                <Star size={16} className="text-foreground" fill="currentColor" aria-hidden />
                                {overview?.avgRating == null
                                    ? NA
                                    : (overview.totalReviews ?? 0) > 0
                                        ? overview.avgRating.toFixed(1)
                                        : 'Noch keine Bewertungen'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Bewertungen gesamt</span>
                            <span className="font-medium tabular-nums text-foreground">{formatNumber(overview?.totalReviews ?? null)}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Offene Meldungen</span>
                            <span className={cn('font-medium tabular-nums', (overview?.openReports ?? 0) > 0 ? 'text-destructive' : 'text-foreground')}>
                                {formatNumber(overview?.openReports ?? null)}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Offene Support-Tickets</span>
                            <span className="font-medium tabular-nums text-foreground">{formatNumber(overview?.openTickets ?? null)}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="text-muted-foreground">Gesperrte Konten</span>
                            <span className="font-medium tabular-nums text-foreground">{formatNumber(overview?.bannedUsers ?? null)}</span>
                        </div>
                        {overview?.byRole && (
                            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                                <span className="text-muted-foreground">Rollen</span>
                                <span className="text-right text-xs text-muted-foreground">
                                    {overview.byRole.map(row => `${ROLE_LABELS[row.role] || row.role}: ${numberFormat.format(row.count)}`).join(' · ')}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Eye size={20} className="text-foreground" aria-hidden /> Meistaufgerufene Anzeigen
                        </CardTitle>
                        <CardDescription>Anonyme Aufrufzählung pro Anzeigendetailseite · alle Zeit</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {topAds === null ? (
                            <Unavailable hint="Anzeigen oder Aufrufzahlen sind nicht verfügbar." />
                        ) : topAds.length === 0 || topAds.every(ad => ad.views === 0) ? (
                            <div className="py-8 text-center">
                                <p className="text-[13px] font-medium text-foreground">Noch keine Anzeigenaufrufe gezählt</p>
                                <p className="mt-1 text-xs text-muted-foreground">Sobald Anzeigen geöffnet werden, erscheinen sie hier.</p>
                            </div>
                        ) : (
                            topAds.map((ad, index) => (
                                <div key={`${ad.id || 'ad'}-${index}`} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-foreground">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-foreground" title={ad.title}>{ad.title}</p>
                                        <p className="text-xs text-muted-foreground">{ad.type}</p>
                                    </div>
                                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                        {numberFormat.format(ad.views)} Aufrufe
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
