import { NativeSelect } from '@/components/ui/native-select';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import {
    ClipboardList,
    Clock,
    User,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';

interface AuditLog {
    id: string;
    admin_id: string | null;
    action: string;
    target_type: string;
    target_id: string | null;
    details: any;
    created_at: string;
    target_name?: string | null;
    admin_profile?: {
        display_name: string | null;
    } | null;
}

const ACTION_LABELS: Record<string, string> = {
    ban_user: 'Nutzer gebannt',
    unban_user: 'Nutzer entsperrt',
    verify_user: 'Nutzer verifiziert',
    unverify_user: 'Verifizierung entzogen',
    change_role: 'Rolle geändert',
    delete_ad: 'Anzeige gelöscht',
    show_ad: 'Anzeige eingeblendet',
    hide_ad: 'Anzeige ausgeblendet',
    resolve_report: 'Meldung gelöst',
    dismiss_report: 'Meldung abgewiesen',
    generate_invite_codes: 'Codes generiert',
    delete_invite_code: 'Code gelöscht',
    edit_user: 'Nutzerdaten editiert',
    create_announcement: 'News erstellt',
    delete_announcement: 'News gelöscht',
    promo_code_create: 'Promo-Code erstellt',
    coach_assign: 'Schüler-Coach ernannt',
    coach_revoke: 'Schüler-Coach Status entzogen',
    coach_code_create: 'Coaching-Code erstellt',
    coach_info_update: 'Coaching Startseiten-Infos geändert',
};

export default function AdminAuditLog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    // URL-synchron: ?filter=coach ist die Coaching-Gruppe, ein Aktionsname
    // (z. B. ban_user) filtert genau diese Aktion, fehlend = alle.
    const filterParam = searchParams.get('filter') || 'all';
    const searchAction = filterParam === 'coach' || Object.prototype.hasOwnProperty.call(ACTION_LABELS, filterParam)
        ? filterParam
        : 'all';
    const isCoachFilter = searchAction === 'coach';

    // Pagination state (Backend ohne Total-Count → Limit+1-Heuristik)
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const pageSize = 20;

    const setFilter = (nextFilter: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', 'auditlog');
        if (nextFilter === 'all') {
            next.delete('filter');
        } else {
            next.set('filter', nextFilter);
        }
        setPage(0);
        setSearchParams(next);
    };

    useEffect(() => {
        setPage(0);
    }, [searchAction]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // Backend liefert admin_name + paginierte Einträge; Details ggf. als JSON-String.
            // Limit+1-Trick: Ein überzähliger Eintrag zeigt an, dass eine weitere Seite existiert.
            // Der Coach-Filter läuft serverseitig als Aktionsgruppe ('coach').
            const fetchLimit = pageSize + 1;
            const { data, error } = await api.admin.auditLog(
                fetchLimit,
                page * pageSize,
                searchAction === 'all' ? undefined : searchAction
            );
            if (error) throw error;

            const logsList = Array.isArray(data) ? data : [];
            const resolvedLogs = logsList.map((log: any) => {
                let details = log.details;
                if (typeof details === 'string') {
                    try { details = JSON.parse(details); } catch { /* Rohstring behalten */ }
                }
                return {
                    ...log,
                    details,
                    admin_profile: log.admin_name
                        ? { display_name: log.admin_name }
                        : null,
                };
            });

            setTotalCount(page * pageSize + resolvedLogs.length);
            const visibleLogs = resolvedLogs.length > pageSize
                ? resolvedLogs.slice(0, pageSize)
                : resolvedLogs;
            // „Weiter“-Button nur aktiv, wenn sicher eine nächste Seite existiert
            setHasMore(resolvedLogs.length > pageSize);
            setLogs(visibleLogs);
        } catch {
            setLoadError('Audit Log konnte nicht geladen werden.');
            toast.error('Audit Log konnte nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    }, [page, searchAction, pageSize]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="space-y-6">
            {/* Header & Filters – eine Seite, der Coaching-Filter lebt in der URL. */}
            <div className="flex flex-col gap-3">
                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Audit &amp; Coaching</h1>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                            Protokoll aller administrativen Eingriffe · Coaching-Filter über <code className="rounded bg-muted px-1 py-0.5 text-xs">?filter=coach</code>
                        </p>
                    </div>
                    <Button onClick={fetchLogs} variant="ghost" size="icon" className="h-11 w-11 shrink-0" title="Aktualisieren" aria-label="Audit Log aktualisieren">
                        <RefreshCw size={16} className={cn(loading && 'animate-spin')} aria-hidden />
                    </Button>
                </header>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={() => setFilter(isCoachFilter ? 'all' : 'coach')}
                        variant={isCoachFilter ? 'primary' : 'outline'}
                        aria-pressed={isCoachFilter}
                        className="h-11 gap-2 text-[13px]"
                    >
                        <GraduationCap size={16} aria-hidden /> Schüler-Coaching
                    </Button>
                    <NativeSelect
                        value={isCoachFilter ? 'all' : searchAction}
                        onChange={e => setFilter(e.target.value)}
                        wrapperClassName="w-full sm:w-52"
                        className="w-full text-[13px]"
                        aria-label="Nach Aktion filtern"
                    >
                        <option value="all">Alle Aktionen</option>
                        {Object.entries(ACTION_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </NativeSelect>

                </div>
            </div>

            {isCoachFilter && (
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
                    Aktiv: <span className="font-medium text-foreground">Schüler-Coaching</span> · Coach-Zuweisungen, Entzug, Coaching-Codes und Startseiten-Infos
                </p>
            )}

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Audit Log nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchLogs}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Logs List */}
            <Card className="rounded-card">
                <CardContent padding="flush">
                    {loadError ? null : loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Spinner className="size-6 text-foreground" />
                            <p className="text-sm text-muted-foreground">Lade Audit-Trail...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="px-4 py-16 text-center">
                            <ClipboardList size={32} className="mx-auto text-muted-foreground" aria-hidden />
                            <p className="mt-3 text-base font-medium text-foreground">
                                {isCoachFilter ? 'Keine Coaching-Einträge vorhanden' : 'Keine Log-Einträge vorhanden'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isCoachFilter
                                    ? 'Für den Coaching-Filter wurden keine Aktionen protokolliert.'
                                    : 'Es wurden bisher keine Aktionen protokolliert.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {logs.map(log => {
                                const actionText = ACTION_LABELS[log.action] || log.action;
                                return (
                                    <div
                                        key={log.id}
                                        className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                                    >
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={cn(
                                                    'rounded-md px-2.5 py-1 text-xs font-medium',
                                                    log.action.includes('ban') && 'bg-destructive/10 text-destructive',
                                                    log.action.includes('verify') && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                                                    log.action.includes('report') && 'bg-muted text-foreground',
                                                    log.action.includes('code') && 'bg-muted text-foreground',
                                                    !log.action.includes('ban') && !log.action.includes('verify') && !log.action.includes('report') && !log.action.includes('code') && 'bg-muted text-muted-foreground'
                                                )}>
                                                    {actionText}
                                                </span>
                                                <span className="break-words text-xs font-medium text-foreground">
                                                    {log.admin_profile?.display_name || 'System-Admin'}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock size={16} aria-hidden />
                                                    {new Date(log.created_at).toLocaleString('de-DE')}
                                                </span>
                                            </div>
                                            <div className="break-words text-xs font-medium text-muted-foreground">
                                                Ziel:{' '}
                                                <span className="font-semibold text-foreground">
                                                    {log.target_name || log.target_type || 'Ohne Zielobjekt'}
                                                    {log.target_id ? ` (${log.target_id})` : ''}
                                                </span>
                                                {log.details && log.details.reason && ` • Grund: "${log.details.reason}"`}
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <Button
                                                onClick={() => setSelectedLog(log)}
                                                variant="outline"
                                                size="sm"
                                                className="h-11 gap-1.5 text-xs"
                                            >
                                                <Eye size={16} aria-hidden /> Details
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls (ohne Backend-Total: nur Zurück/Weiter) */}
            {(page > 0 || hasMore) && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-muted-foreground">
                        Seite {page + 1}{searchAction === 'all' && !hasMore && totalCount > 0 ? ` (${totalCount} Einträge)` : ''}
                    </span>
                    <div className="flex gap-1">
                        <Button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            variant="outline"
                            size="icon"
                            className="h-11 w-11"
                            aria-label="Vorherige Seite"
                        >
                            <ChevronLeft size={16} aria-hidden />
                        </Button>
                        <Button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!hasMore}
                            variant="outline"
                            size="icon"
                            className="h-11 w-11"
                            aria-label="Nächste Seite"
                        >
                            <ChevronRight size={16} aria-hidden />
                        </Button>
                    </div>
                </div>
            )}

            {/* Detail dialog */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-lg [&_[data-slot=dialog-close]]:size-11">
                    <DialogHeader>
                        <DialogTitle>Aktions-Details</DialogTitle>
                        <DialogDescription>
                            Zusätzliche Metadaten der administrativen Aktion.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                <div className="rounded-xl border border-border bg-muted/40 p-3">
                                    <span className="mb-1 block font-medium text-muted-foreground">Aktion</span>
                                    <span className="break-words text-sm font-semibold">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</span>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/40 p-3">
                                    <span className="mb-1 block font-medium text-muted-foreground">Ausgeführt von</span>
                                    <span className="flex items-center gap-1 break-words font-medium">
                                        <User size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                                        {selectedLog.admin_profile?.display_name || 'System-Admin'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 text-xs">
                                <span className="block font-medium text-muted-foreground">Zeitpunkt</span>
                                <span className="break-words font-medium">{new Date(selectedLog.created_at).toLocaleString('de-DE')}</span>
                            </div>

                            <div className="space-y-1 text-xs">
                                <span className="block font-medium text-muted-foreground">Ziel-Objekt</span>
                                <span className="break-all tabular-nums">
                                    {selectedLog.target_name || selectedLog.target_type || 'Ohne Zielobjekt'}
                                    {selectedLog.target_id ? ` (${selectedLog.target_id})` : ''}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <span className="block text-xs font-medium text-muted-foreground">Rohdaten / Details (JSON)</span>
                                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 tabular-nums text-xs text-foreground">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setSelectedLog(null)} className="h-11 w-full">Schließen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
