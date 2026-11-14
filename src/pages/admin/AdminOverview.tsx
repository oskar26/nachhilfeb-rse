import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import {
    Users,
    FileText,
    AlertTriangle,
    Ban,
    ArrowUpRight,
    ShieldCheck,
    Clock,
    UserPlus,
    TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const REPORT_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    open: { label: 'Offen', cls: 'bg-destructive/10 text-destructive' },
    investigating: { label: 'In Prüfung', cls: 'bg-muted text-foreground' },
    resolved: { label: 'Gelöst', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
    dismissed: { label: 'Abgewiesen', cls: 'bg-muted text-muted-foreground' },
};

const QUICK_ACTIONS = [
    { label: 'Codes & Verifikation', icon: ShieldCheck, tab: 'codes' },
    { label: 'Nutzerverwaltung', icon: Users, tab: 'users' },
    { label: 'Meldungen prüfen', icon: AlertTriangle, tab: 'reports' },
    { label: 'Audit & Coaching', icon: Clock, tab: 'auditlog' },
];

interface Stats {
    users: number;
    ads: number;
    reports: number;
    banned: number;
    verified: number;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    subValue: string;
    onClick: () => void;
    emphasis?: boolean;
    loading: boolean;
}

function StatCard({ icon, label, value, subValue, onClick, emphasis, loading }: StatCardProps) {
    return (
        <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={onClick}
            className="group flex min-h-[116px] w-full flex-col items-stretch justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-foreground/20 hover:bg-muted/20"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                    {icon}
                </span>
                <ArrowUpRight size={16} className="text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {loading ? (
                        <Skeleton className="h-7 w-10" />
                    ) : (
                        <span className={cn('text-2xl font-semibold tracking-tight tabular-nums', emphasis && value > 0 && 'text-destructive')}>
                            {value}
                        </span>
                    )}
                    <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
                <div className="text-xs text-muted-foreground">{subValue}</div>
            </div>
        </Button>
    );
}

export default function AdminOverview() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats>({ users: 0, ads: 0, reports: 0, banned: 0, verified: 0 });
    const [recentReports, setRecentReports] = useState<any[]>([]);
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [pageTrend, setPageTrend] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [{ data: overview, error: overviewError }, { data: reportsData }] = await Promise.all([
                api.admin.overview(),
                api.reports.list(),
            ]);
            if (overviewError) throw overviewError;

            const statsRaw = (overview as any)?.stats ?? {};
            setStats({
                users: Number(statsRaw.total_users) || 0,
                verified: Number(statsRaw.verified_users) || 0,
                banned: Number(statsRaw.banned_users) || 0,
                ads: Number(statsRaw.active_ads) || 0,
                reports: Number(statsRaw.open_reports) || 0,
            });
            // Neueste Nutzer liefert das Backend direkt (kein Volltabellen-Fetch mehr)
            const recentUsersRaw = overview?.recent_users;
            const usersList = Array.isArray(recentUsersRaw) ? recentUsersRaw : [];
            setRecentUsers(usersList.slice(0, 5));
            const reportsList = Array.isArray(reportsData) ? reportsData : ((reportsData as any)?.reports ?? []);
            setRecentReports(reportsList.slice(0, 5));
            // Mini-Verlauf der Seitenaufrufe (7 Tage, best-effort fürs Dashboard)
            try {
                const { data: pageStats } = await api.analytics.stats(7);
                const byDay = Array.isArray((pageStats as any)?.by_day) ? (pageStats as any).by_day : [];
                const dayMap: Record<string, number> = {};
                byDay.forEach((r: any) => {
                    if (r.day) dayMap[String(r.day).slice(0, 10)] = Number(r.views) || 0;
                });
                const trend: number[] = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    trend.push(dayMap[key] || 0);
                }
                setPageTrend(trend);
            } catch { /* Verlauf ist optional – Dashboard bleibt nutzbar */ }
        } catch {
            setLoadError('Übersicht konnte nicht geladen werden.');
            toast.error('Übersicht konnte nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const navTo = (tab: string) => navigate(`?tab=${tab}`);

    const trendData = pageTrend.map((views, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (pageTrend.length - 1 - index));
        return {
            day: date.toLocaleDateString('de-DE', { weekday: 'short' }),
            views,
        };
    });

    const trendConfig = {
        views: {
            label: 'Seitenaufrufe',
            color: 'var(--chart-1)',
        },
    } satisfies ChartConfig;

    return (
        <div className="space-y-5 sm:space-y-6">
            <header>
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Übersicht</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Zusammenfassung des aktuellen Systemstatus</p>
            </header>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Übersicht nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchAll}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Stat cards */}
            {!loadError && (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatCard
                        icon={<Users size={18} aria-hidden />}
                        label="Nutzer"
                        value={stats.users}
                        subValue={`${stats.verified} verifiziert`}
                        onClick={() => navTo('users')}
                        loading={loading}
                    />
                    <StatCard
                        icon={<FileText size={18} aria-hidden />}
                        label="Anzeigen"
                        value={stats.ads}
                        subValue="Aktive Angebote"
                        onClick={() => navTo('ads')}
                        loading={loading}
                    />
                    <StatCard
                        icon={<AlertTriangle size={18} aria-hidden />}
                        label="Offene Meldungen"
                        value={stats.reports}
                        subValue="Handlungsbedarf"
                        emphasis
                        onClick={() => navTo('reports')}
                        loading={loading}
                    />
                    <StatCard
                        icon={<Ban size={18} aria-hidden />}
                        label="Gesperrt"
                        value={stats.banned}
                        subValue="Inaktive Accounts"
                        onClick={() => navTo('users')}
                        loading={loading}
                    />
                </div>
            )}

            {/* Quick actions */}
            <section aria-labelledby="admin-quick-access">
                <h2 id="admin-quick-access" className="mb-2 text-sm font-medium text-muted-foreground">Schnellzugriff</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {QUICK_ACTIONS.map(({ label, icon: Icon, tab }) => (
                        <Button
                            variant="unstyled"
                            size="unstyled"
                            type="button"
                            key={tab}
                            onClick={() => navTo(tab)}
                            className="flex min-h-11 items-center justify-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left text-[13px] font-medium leading-tight text-foreground transition-colors hover:border-foreground/20 hover:bg-muted/20 sm:text-sm"
                        >
                            <Icon size={18} className="shrink-0 text-muted-foreground" aria-hidden />
                            <span className="min-w-0">{label}</span>
                        </Button>
                    ))}
                </div>
            </section>

            {!loadError && (
                <div className="space-y-4">
                    {/* Seitenaufrufe-Trend (7 Tage) */}
                    <Card>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <TrendingUp size={16} className="text-muted-foreground" aria-hidden />
                                Seitenaufrufe · letzte 7 Tage
                            </div>
                            <Button variant="ghost" size="sm" type="button" onClick={() => navTo('analytics')} className="h-11 gap-1 px-2.5 text-xs">
                                Details <ArrowUpRight size={16} aria-hidden />
                            </Button>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <div className="space-y-3" aria-label="Diagramm wird geladen">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-[200px] w-full" />
                                </div>
                            ) : pageTrend.every(v => v === 0) ? (
                                <div className="flex min-h-[200px] flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/20 px-4 text-center">
                                    <p className="text-sm font-medium text-foreground">Keine Seitenaufrufe in den letzten 7 Tagen</p>
                                    <p className="text-xs text-muted-foreground">Sobald Daten vorliegen, erscheint hier der Verlauf.</p>
                                </div>
                            ) : (
                                <ChartContainer config={trendConfig} className="h-[220px] w-full">
                                    <BarChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} allowDecimals={false} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="views" fill="var(--color-views)" radius={[4, 4, 0, 0]} maxBarSize={56} />
                                    </BarChart>
                                </ChartContainer>
                            )}
                        </div>
                    </Card>

                    <div className="grid items-start gap-4 lg:grid-cols-2">
                        {/* Recent reports */}
                        <Card className="overflow-hidden">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-3.5">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                                    <AlertTriangle size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                                    <span className="truncate">Letzte Meldungen</span>
                                </div>
                                <Button variant="ghost" size="sm" type="button" onClick={() => navTo('reports')} className="h-11 shrink-0 gap-1 px-2.5 text-xs">
                                    Alle <ArrowUpRight size={16} aria-hidden />
                                </Button>
                            </div>
                            <div className="divide-y divide-border">
                                {loading ? (
                                    <div className="space-y-3 p-4">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ) : recentReports.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">Keine Meldungen vorhanden.</p>
                                ) : (
                                    recentReports.map((r, index) => (
                                        <div key={`${r.id}-${index}`} className="flex items-start justify-between gap-2 p-3.5">
                                            <div className="min-w-0">
                                                <div className="break-words text-sm font-medium text-foreground">{r.reason || r.category || 'Kein Grund angegeben'}</div>
                                                <div className="mt-0.5 break-words text-xs text-muted-foreground">
                                                    {(r as any).reporter_name || 'Anonym'} → {(r as any).reported_user_name || (r as any).reported_ad_title || 'Unbekannt'}
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn('shrink-0 font-medium', (REPORT_STATUS_STYLES[r.status] || REPORT_STATUS_STYLES.dismissed).cls)}>
                                                {REPORT_STATUS_STYLES[r.status]?.label || r.status}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

                        {/* Recent users */}
                        <Card className="overflow-hidden">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-3.5">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                                    <UserPlus size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                                    <span className="truncate">Neue Nutzer</span>
                                </div>
                                <Button variant="ghost" size="sm" type="button" onClick={() => navTo('users')} className="h-11 shrink-0 gap-1 px-2.5 text-xs">
                                    Alle <ArrowUpRight size={16} aria-hidden />
                                </Button>
                            </div>
                            <div className="divide-y divide-border">
                                {loading ? (
                                    <div className="space-y-3 p-4">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ) : recentUsers.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">Keine Nutzer gefunden.</p>
                                ) : (
                                    recentUsers.map((u, index) => (
                                        <div key={`${u.id}-${index}`} className="flex items-center gap-2.5 p-3.5">
                                            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-foreground">
                                                {(u.display_name || u.first_name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="break-words text-sm font-medium text-foreground">{u.display_name || `${u.first_name} ${u.last_name}`}</div>
                                                <div className="break-all text-xs text-muted-foreground">{u.email || u.auth_email}</div>
                                            </div>
                                            {u.role === 'sv_admin' && (
                                                <Badge variant="outline" className="shrink-0 font-medium">Admin</Badge>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
