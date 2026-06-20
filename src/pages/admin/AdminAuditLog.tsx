import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    ClipboardList,
    Clock,
    User,
    Eye,
    ChevronLeft,
    ChevronRight,
    Search,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/Dialog';

interface AuditLog {
    id: string;
    admin_id: string | null;
    action: string;
    target_type: string;
    target_id: string | null;
    details: any;
    created_at: string;
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
    resolve_report: 'Meldung gelöst',
    dismiss_report: 'Meldung abgewiesen',
    generate_invite_codes: 'Codes generiert',
    delete_invite_code: 'Code gelöscht',
    edit_user: 'Nutzerdaten editiert',
};

export default function AdminAuditLog() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchAction, setSearchAction] = useState('all');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        fetchLogs();
    }, [page, searchAction]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Count total
            let countQuery = supabase
                .from('admin_audit_log')
                .select('*', { count: 'exact', head: true });
            
            if (searchAction !== 'all') {
                countQuery = countQuery.eq('action', searchAction);
            }
            
            const { count } = await countQuery;
            setTotalCount(count || 0);

            // Fetch page logs
            let query = supabase
                .from('admin_audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (searchAction !== 'all') {
                query = query.eq('action', searchAction);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Resolve admin names
            const logsList = data || [];
            const resolvedLogs = await Promise.all(logsList.map(async (log) => {
                if (log.admin_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name, first_name, last_name')
                        .eq('id', log.admin_id)
                        .single();
                    return {
                        ...log,
                        admin_profile: profile ? {
                            display_name: profile.display_name || `${profile.first_name} ${profile.last_name}`
                        } : null
                    };
                }
                return log;
            }));

            setLogs(resolvedLogs);
        } catch (error: any) {
            console.error('Error fetching audit logs:', error);
            toast.error('Audit Log konnte nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Vollständiges Protokoll aller administrativen Eingriffe</p>
                </div>
                
                <div className="flex gap-2 items-center">
                    <select
                        value={searchAction}
                        onChange={e => { setSearchAction(e.target.value); setPage(0); }}
                        className="h-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none"
                    >
                        <option value="all">Alle Aktionen</option>
                        {Object.entries(ACTION_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>

                    <Button onClick={fetchLogs} variant="ghost" className="h-11 w-11 p-0 rounded-2xl" title="Aktualisieren">
                        <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* Logs List */}
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 font-medium">Lade Audit-Trail...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-20 text-center space-y-3 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl">
                            <ClipboardList size={48} className="mx-auto text-gray-300" />
                            <p className="text-gray-500 font-medium text-lg">Keine Log-Einträge vorhanden</p>
                            <p className="text-gray-400 text-xs">Es wurden bisher keine Aktionen protokolliert.</p>
                        </div>
                    ) : (
                        <div className="divide-y dark:divide-gray-800">
                            {logs.map(log => {
                                const actionText = ACTION_LABELS[log.action] || log.action;
                                return (
                                    <div
                                        key={log.id}
                                        className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                                    >
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn(
                                                    'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                                    log.action.includes('ban') && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                                    log.action.includes('verify') && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                                    log.action.includes('report') && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                                    log.action.includes('code') && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                )}>
                                                    {actionText}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                    {log.admin_profile?.display_name || 'System-Admin'}
                                                </span>
                                                <span className="text-gray-400 text-[10px] flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(log.created_at).toLocaleString('de-DE')}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 font-medium truncate max-w-2xl">
                                                Ziel: <span className="font-semibold text-gray-700 dark:text-gray-300">{log.target_type} ({log.target_id || '--'})</span>
                                                {log.details && log.details.reason && ` • Grund: "${log.details.reason}"`}
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <Button
                                                onClick={() => setSelectedLog(log)}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg gap-1.5 text-xs"
                                            >
                                                <Eye size={12} /> Details
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 shrink-0">
                    <span className="text-xs text-gray-500">
                        Seite {page + 1} von {totalPages} ({totalCount} Einträge)
                    </span>
                    <div className="flex gap-1">
                        <Button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            variant="outline"
                            className="h-9 w-9 p-0 rounded-xl"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            variant="outline"
                            className="h-9 w-9 p-0 rounded-xl"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Detail dialog */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="rounded-3xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Aktions-Details</DialogTitle>
                        <DialogDescription>
                            Zusätzliche Metadaten der administrativen Aktion.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                                    <span className="text-gray-400 font-bold block mb-1">Aktion</span>
                                    <span className="font-extrabold text-sm">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                                    <span className="text-gray-400 font-bold block mb-1">Ausgeführt von</span>
                                    <span className="font-bold flex items-center gap-1">
                                        <User size={12} className="text-gray-400" />
                                        {selectedLog.admin_profile?.display_name || 'System-Admin'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 text-xs">
                                <span className="text-gray-400 font-bold block">Zeitpunkt</span>
                                <span className="font-semibold">{new Date(selectedLog.created_at).toLocaleString('de-DE')}</span>
                            </div>

                            <div className="space-y-1 text-xs">
                                <span className="text-gray-400 font-bold block">Ziel-Objekt</span>
                                <span className="font-mono">{selectedLog.target_type} ({selectedLog.target_id || 'Keine ID'})</span>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Rohdaten / Details (JSON)</span>
                                <pre className="bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl border dark:border-gray-800 text-xs font-mono overflow-x-auto text-gray-700 dark:text-gray-300">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setSelectedLog(null)} className="rounded-xl w-full">Schließen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
