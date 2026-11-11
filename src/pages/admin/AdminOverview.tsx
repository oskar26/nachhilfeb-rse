import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
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
    investigating: { label: 'In Prüfung', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
    resolved: { label: 'Gelöst', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
    dismissed: { label: 'Abgewiesen', cls: 'bg-muted text-muted-foreground' },
};

const QUICK_ACTIONS = [
    { label: 'Codes & Verifikation', icon: ShieldCheck, tab: 'codes' },
    { label: 'Nutzerverwaltung', icon: Users, tab: 'users' },
    { label: 'Meldungen prüfen', icon: AlertTriangle, tab: 'reports' },
    { label: 'Audit Log', icon: Clock, tab: 'auditlog' },
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
}

function StatCard({ icon, label, value, subValue, onClick, emphasis }: StatCardProps) {
    return (
        <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={onClick}
            className="group flex min-h-[132px] w-full flex-col items-stretch justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    {icon}
                </span>
                <ArrowUpRight size={16} className="text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
            </div>
            <div className="space-y-1">
                <div className={cn('text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl', emphasis && value > 0 && 'text-destructive')}>{value}</div>
                <div className="text-sm font-medium text-foreground">{label}</div>
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

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Page title */}
            <header>
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Übersicht</h1>
                <p className="mt-1 text-sm text-muted-foreground">Zusammenfassung des aktuellen Systemstatus</p>
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
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4 2xl:gap-4">
                <StatCard
                    icon={<Users size={20} aria-hidden />}
                    label="Nutzer"
                    value={stats.users}
                    subValue={`${stats.verified} verifiziert`}
                    onClick={() => navTo('users')}
                />
                <StatCard
                    icon={<FileText size={20} aria-hidden />}
                    label="Anzeigen"
                    value={stats.ads}
                    subValue="Aktive Angebote"
                    onClick={() => navTo('ads')}
                />
                <StatCard
                    icon={<AlertTriangle size={20} aria-hidden />}
                    label="Offene Meldungen"
                    value={stats.reports}
                    subValue="Handlungsbedarf"
                    emphasis
                    onClick={() => navTo('reports')}
                />
                <StatCard
                    icon={<Ban size={20} aria-hidden />}
                    label="Gesperrt"
                    value={stats.banned}
                    subValue="Inaktive Accounts"
                    onClick={() => navTo('users')}
                />
            </div>
            )}

            {/* Seitenaufrufe-Trend (7 Tage) */}
            {!loadError && pageTrend.some(v => v > 0) && (
                <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => navTo('analytics')}
                    className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/40 sm:p-5"
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <TrendingUp size={16} className="text-brand-ink dark:text-primary" aria-hidden />
                            Seitenaufrufe · letzte 7 Tage
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            Details <ArrowUpRight size={16} aria-hidden />
                        </span>
                    </div>
                    <div className="flex h-16 items-end gap-1.5" aria-hidden>
                        {pageTrend.map((v, i) => {
                            const max = Math.max(...pageTrend, 1);
                            return (
                                <div
                                    key={i}
                                    className="min-h-[3px] flex-1 rounded-t-sm bg-primary/80"
                                    style={{ height: `${Math.max((v / max) * 100, 6)}%` }}
                                    title={`${v} Aufrufe`}
                                />
                            );
                        })}
                    </div>
                </Button>
            )}

            {/* Quick actions */}
            <section>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">Schnellzugriff</h2>
                <div className="grid grid-cols-2 gap-2 2xl:grid-cols-4 2xl:gap-3">
                    {QUICK_ACTIONS.map(({ label, icon: Icon, tab }) => (
                        <Button
                            variant="unstyled"
                            size="unstyled"
                            type="button"
                            key={tab}
                            onClick={() => navTo(tab)}
                            className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm font-medium text-foreground shadow-soft transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                            <Icon size={20} className="shrink-0 text-muted-foreground" aria-hidden />
                            <span className="min-w-0 break-words">{label}</span>
                        </Button>
                    ))}
                </div>
            </section>

            {/* Recent activity */}
            {!loadError && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
                {/* Recent reports */}
                <Card className="shadow-soft">
                    <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" aria-hidden />
                            Letzte Meldungen
                        </div>
                        <Button variant="ghost" size="sm" type="button" onClick={() => navTo('reports')} className="h-11 gap-1 px-3 text-xs">
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
                            <p className="p-6 text-center text-sm text-muted-foreground">Keine Meldungen vorhanden.</p>
                        ) : (
                            recentReports.map((r) => (
                                <div key={r.id} className="flex items-start justify-between gap-3 p-4">
                                    <div className="min-w-0">
                                        <div className="break-words text-sm font-medium text-foreground">{r.reason || r.category || 'Kein Grund angegeben'}</div>
                                        <div className="mt-0.5 break-words text-xs text-muted-foreground">
                                            {(r as any).reporter_name || 'Anonym'} → {(r as any).reported_user_name || (r as any).reported_ad_title || 'Unbekannt'}
                                        </div>
                                    </div>
                                    <span className={cn(
                                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                                        (REPORT_STATUS_STYLES[r.status] || REPORT_STATUS_STYLES.dismissed).cls
                                    )}>
                                        {REPORT_STATUS_STYLES[r.status]?.label || r.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Recent users */}
                <Card className="shadow-soft">
                    <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <UserPlus size={16} className="text-muted-foreground" aria-hidden />
                            Neue Nutzer
                        </div>
                        <Button variant="ghost" size="sm" type="button" onClick={() => navTo('users')} className="h-11 gap-1 px-3 text-xs">
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
                            <p className="p-6 text-center text-sm text-muted-foreground">Keine Nutzer gefunden.</p>
                        ) : (
                            recentUsers.map((u) => (
                                <div key={u.id} className="flex items-center gap-3 p-4">
                                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-semibold text-brand-ink dark:text-primary">
                                        {(u.display_name || u.first_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="break-words text-sm font-medium text-foreground">{u.display_name || `${u.first_name} ${u.last_name}`}</div>
                                        <div className="break-all text-xs text-muted-foreground">{u.email || u.auth_email}</div>
                                    </div>
                                    {u.role === 'sv_admin' && (
                                        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-brand-ink dark:text-primary">
                                            Admin
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
            )}
        </div>
    );
}
