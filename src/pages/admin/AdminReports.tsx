import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import {
    AlertTriangle,
    Eye,
    XCircle,
    User,
    ChevronRight,
    MessageSquare,
    Search,
    List as ListIcon,
    LayoutGrid,
    Image as ImageIcon,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { api, getStoredUser } from '../../lib/api';

// Status-Farben: Rot/Grün/Amber tragen nur Bedeutung (offen/gelöst/Warnung), neutrale Flächen bleiben Papier.
const REPORT_ICON_OPEN = 'bg-destructive/10 text-destructive';
const REPORT_ICON_CLOSED = 'bg-muted text-muted-foreground';
const PRIO_BADGE_KRITISCH = 'bg-destructive/10 text-destructive';
const PRIO_BADGE_HOCH = 'bg-muted text-foreground';
const PRIO_BADGE_NORMAL = 'bg-muted text-muted-foreground';
const PRIO_BAR_KRITISCH = 'bg-destructive text-white';
const PRIO_BAR_HOCH = 'bg-foreground text-background';
const PRIO_BAR_NORMAL = 'bg-muted text-foreground';
const REPORT_STATUS_LABELS: Record<string, string> = {
    open: 'Offen',
    investigating: 'In Prüfung',
    resolved: 'Gelöst',
    dismissed: 'Abgewiesen',
};
const RESOLUTION_LABELS: Record<string, string> = {
    warn: 'Verwarnung',
    ban: 'Bann',
    delete: 'Inhalt gelöscht',
    dismiss: 'Abgewiesen',
    escalate: 'Eskaliert',
};

/** Evidenz einer automatischen Filtermeldung (Profanity 2.0, Quelle 'auto_filter'). */
interface AutoFilterEvidence {
    source: string;
    severity?: string;
    hits?: string[];
    excerpt?: string;
}

function getAutoEvidence(r: { evidence: unknown }): AutoFilterEvidence | null {
    const ev = r.evidence as AutoFilterEvidence | string[] | null;
    if (ev && typeof ev === 'object' && !Array.isArray(ev) && (ev as AutoFilterEvidence).source === 'auto_filter') {
        return ev as AutoFilterEvidence;
    }
    return null;
}

interface Profile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
}

interface Ad {
    id: string;
    short_description: string;
}

interface Report {
    id: string;
    reporter_id: string;
    reported_ad_id: string | null;
    reported_user_id: string | null;
    reason: string;
    description: string | null;
    status: 'open' | 'investigating' | 'resolved' | 'dismissed';
    created_at: string;
    category: 'profil' | 'anzeige' | 'chat' | 'datenschutz' | 'sonstiges';
    sub_reason: string | null;
    priority: 'normal' | 'hoch' | 'kritisch';
    evidence: string[] | null;
    related_message_ids: string[] | null;
    resolution_type: 'warn' | 'ban' | 'delete' | 'dismiss' | 'escalate' | null;
    resolved_by: string | null;
    resolved_at: string | null;
    admin_notes: string | null;
    reporter: Profile | null;
    user: Profile | null;
    ad: Ad | null;
}

export default function AdminReports({ onOpenChat }: { onOpenChat: (userId1: string, userId2: string, reportId: string) => void }) {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    
    // Filters
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<'all' | 'auto' | 'manual'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Detail States
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [resolutionType, setResolutionType] = useState<'warn' | 'ban' | 'delete' | 'dismiss'>('dismiss');
    const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
    const [banDays, setBanDays] = useState(7);
    
    // Zoomed image modal state
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // reports.php liefert flache *_name-Felder; die Zuordnung unten nutzt die bestehenden Fallbacks.
            const { data, error } = await api.reports.list();

            if (error) throw error;
            const rows = (data || []) as any[];
            setReports(rows.map((r) => ({
                ...r,
                reporter: r.reporter ?? (r.reporter_id ? { id: r.reporter_id, first_name: null, last_name: null, display_name: r.reporter_name || null, avatar_url: null } : null),
                user: r.user ?? (r.reported_user_id ? { id: r.reported_user_id, first_name: null, last_name: null, display_name: r.reported_user_name || null, avatar_url: null } : null),
                ad: r.ad ?? (r.reported_ad_id ? { id: r.reported_ad_id, short_description: r.reported_ad_title || '' } : null),
            })));
        } catch (error: any) {
            console.error('Error fetching reports:', error);
            setLoadError('Meldungen konnten nicht geladen werden.');
            toast.error('Meldungen konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectReport = (report: Report) => {
        setSelectedReport(report);
        setAdminNotes(report.admin_notes || '');
    };

    const saveAdminNotes = async () => {
        if (!selectedReport) return;
        try {
            const { error } = await api.reports.resolve(selectedReport.id, { admin_notes: adminNotes });

            if (error) throw error;

            toast.success('Admin-Notizen gespeichert');
            // Update local state
            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, admin_notes: adminNotes } : r));
            setSelectedReport({ ...selectedReport, admin_notes: adminNotes });
        } catch (error: any) {
            toast.error('Speichern fehlgeschlagen: ' + error.message);
        }
    };

    const handleResolve = async () => {
        if (!selectedReport) return;
        try {
            const adminId = getStoredUser()?.id;
            
            const payload: Record<string, unknown> = {
                status: 'resolved',
                resolution_type: resolutionType,
                resolved_by: adminId,
                resolved_at: new Date().toISOString(),
                admin_notes: adminNotes,
            };
            if (resolutionType === 'ban') {
                payload.ban_type = banType;
                if (banType === 'temporary') payload.ban_days = banDays;
            }

            const { data, error } = await api.reports.resolve(selectedReport.id, payload);

            if (error) throw error;

            if (resolutionType === 'warn') {
                const mailSent = Boolean((data as any)?.warning_email_sent);
                toast.success(mailSent
                    ? 'Verwarnung ausgesprochen und per E-Mail zugestellt.'
                    : 'Verwarnung gespeichert. Die E-Mail konnte nicht zugestellt werden.');
            } else if (resolutionType === 'ban') {
                toast.success(banType === 'permanent'
                    ? 'Nutzer dauerhaft gesperrt.'
                    : `Nutzer für ${banDays} Tage gesperrt.`);
            } else if (resolutionType === 'delete') {
                const action = (data as any)?.action;
                const deletedAd = action?.deleted_ad ? 'Anzeige gelöscht.' : '';
                const deletedMessages = Number(action?.deleted_messages || 0);
                toast.success(deletedMessages > 0
                    ? `${deletedAd} ${deletedMessages} Nachricht(en) gelöscht.`.trim()
                    : (deletedAd || 'Meldung als gelöst markiert.'));
            } else {
                toast.success('Meldung ohne weitere Aktion geschlossen.');
            }
            setShowResolveDialog(false);
            fetchReports();
            setSelectedReport(null);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const handleDismiss = async () => {
        if (!selectedReport) return;
        try {
            const adminId = getStoredUser()?.id;
            
            const { error } = await api.reports.resolve(selectedReport.id, {
                status: 'dismissed',
                resolution_type: 'dismiss',
                resolved_by: adminId,
                resolved_at: new Date().toISOString(),
                admin_notes: adminNotes,
            });

            if (error) throw error;

            toast.success('Meldung abgewiesen');
            fetchReports();
            setSelectedReport(null);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const handleInvestigate = async () => {
        if (!selectedReport) return;
        try {
            const { error } = await api.reports.resolve(selectedReport.id, { status: 'investigating' });

            if (error) throw error;

            toast.success('Meldung in Prüfung gesetzt');
            fetchReports();
            setSelectedReport(null);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const handleEscalate = async () => {
        if (!selectedReport) return;
        try {
            // reports.php übernimmt `priority` im PATCH nicht – wie zuvor im Shim
            // aktualisiert der Aufruf serverseitig nur resolved_by/resolved_at.
            const { error } = await api.reports.resolve(selectedReport.id, { priority: 'kritisch' });

            if (error) throw error;

            toast.success('Priorität auf Kritisch eskaliert');
            setSelectedReport({ ...selectedReport, priority: 'kritisch' });
            fetchReports();
        } catch (error: any) {
            toast.error('Eskalation fehlgeschlagen: ' + error.message);
        }
    };

    // --- Filter-Review (Profanity 2.0 Training) ---
    // „Zutreffend": Verstoß bestätigen (lösen als Verwarnung).
    const handleConfirmViolation = async () => {
        if (!selectedReport) return;
        try {
            const adminId = getStoredUser()?.id;
            const { error } = await api.reports.resolve(selectedReport.id, {
                status: 'resolved',
                resolution_type: 'warn',
                resolved_by: adminId,
                resolved_at: new Date().toISOString(),
                admin_notes: (adminNotes ? adminNotes + '\n' : '') + '[Filter-Review] Treffer bestätigt.',
            });
            if (error) throw error;
            toast.success('Filter-Treffer bestätigt (Verwarnung).');
            fetchReports();
            setSelectedReport(null);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    // „Fehlalarm": Meldung abweisen UND getroffene Wörter für den Filter freigeben (Training).
    const handleFalsePositive = async () => {
        if (!selectedReport) return;
        const auto = getAutoEvidence(selectedReport);
        const hits = auto?.hits ?? [];
        try {
            for (const word of hits) {
                try {
                    await api.moderation.setOverride({ word, effect: 'allow' });
                } catch {
                    /* Einzelnes Wort darf den Review nicht abbrechen. */
                }
            }
            const adminId = getStoredUser()?.id;
            const { error } = await api.reports.resolve(selectedReport.id, {
                status: 'dismissed',
                resolution_type: 'dismiss',
                resolved_by: adminId,
                resolved_at: new Date().toISOString(),
                admin_notes: (adminNotes ? adminNotes + '\n' : '') + `[Filter-Review] Fehlalarm – freigegeben: ${hits.join(', ') || '–'}.`,
            });
            if (error) throw error;
            toast.success(hits.length > 0 ? `Fehlalarm – ${hits.length} Wort/Wörter für den Filter freigegeben.` : 'Als Fehlalarm abgewiesen.');
            fetchReports();
            setSelectedReport(null);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    // Filter Logic
    const filteredReports = reports.filter(r => {
        const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
        const matchesPriority = filterPriority === 'all' || r.priority === filterPriority;
        const isAuto = getAutoEvidence(r) !== null;
        const matchesSource = filterSource === 'all' || (filterSource === 'auto' ? isAuto : !isAuto);
        
        const reporterName = r.reporter?.display_name || '';
        const reportedName = r.user?.display_name || r.ad?.short_description || '';
        const descText = r.description || '';
        const reasonText = r.reason || '';

        const matchesSearch = 
            reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reportedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            descText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reasonText.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesPriority && matchesSource && matchesSearch;
    });

    // Grouping for Kanban columns
    const columns = {
        open: filteredReports.filter(r => r.status === 'open'),
        investigating: filteredReports.filter(r => r.status === 'investigating'),
        dismissed: filteredReports.filter(r => r.status === 'dismissed'),
        resolved: filteredReports.filter(r => r.status === 'resolved'),
    };

    return (
        <div className="space-y-6">
            {/* Header / Filter bar */}
            <div className="flex flex-col gap-3">
                <div className="relative w-full 2xl:max-w-md">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} aria-hidden />
                    <Input
                        type="text"
                        placeholder="Meldungen durchsuchen..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-11 pl-11"
                        aria-label="Meldungen durchsuchen"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <NativeSelect
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        wrapperClassName="w-full sm:w-44"
                        className="w-full"
                        aria-label="Nach Kategorie filtern"
                    >
                        <option value="all">Alle Kategorien</option>
                        <option value="profil">Profil/Nutzer</option>
                        <option value="anzeige">Anzeige</option>
                        <option value="chat">Chat</option>
                        <option value="datenschutz">Datenschutz</option>
                        <option value="sonstiges">Sonstiges</option>
                    </NativeSelect>

                    <NativeSelect
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        wrapperClassName="w-full sm:w-44"
                        className="w-full"
                        aria-label="Nach Priorität filtern"
                    >
                        <option value="all">Alle Prioritäten</option>
                        <option value="normal">Normal</option>
                        <option value="hoch">Hoch</option>
                        <option value="kritisch">Kritisch</option>
                    </NativeSelect>

                    <NativeSelect
                        value={filterSource}
                        onChange={e => setFilterSource(e.target.value as 'all' | 'auto' | 'manual')}
                        wrapperClassName="w-full sm:w-52"
                        className="w-full"
                        aria-label="Nach Quelle filtern"
                        title="Quelle der Meldung"
                    >
                        <option value="all">Alle Quellen</option>
                        <option value="auto">Filter-Meldungen (Review)</option>
                        <option value="manual">Manuelle Meldungen</option>
                    </NativeSelect>

                    <Button onClick={fetchReports} variant="ghost" size="icon" className="h-11 w-11" title="Aktualisieren" aria-label="Meldungen aktualisieren">
                        <RefreshCw size={16} aria-hidden className={cn(loading && 'animate-spin')} />
                    </Button>

                    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted p-1">
                        <Button
                            variant="unstyled"
                            size="unstyled"
                            type="button"
                            onClick={() => setViewMode('kanban')}
                            aria-pressed={viewMode === 'kanban'}
                            aria-label="Board-Ansicht"
                            className={cn(
                                'grid h-11 w-11 place-items-center rounded-lg transition-colors',
                                viewMode === 'kanban' ? 'bg-card text-foreground ' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <LayoutGrid size={16} aria-hidden />
                        </Button>
                        <Button
                            variant="unstyled"
                            size="unstyled"
                            type="button"
                            onClick={() => setViewMode('list')}
                            aria-pressed={viewMode === 'list'}
                            aria-label="Listenansicht"
                            className={cn(
                                'grid h-11 w-11 place-items-center rounded-lg transition-colors',
                                viewMode === 'list' ? 'bg-card text-foreground ' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <ListIcon size={16} aria-hidden />
                        </Button>
                    </div>
                </div>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Meldungen nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchReports}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Main content: board/list + detail */}
            <div className="flex min-h-0 flex-col gap-4 2xl:flex-row 2xl:gap-6">
                {/* Reports board/list */}
                <div className={cn('min-w-0 flex-1', selectedReport && 'hidden 2xl:block')}>
                    {loadError ? null : loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
                            <Spinner className="size-6 text-foreground" />
                            <p className="text-sm text-muted-foreground">Lade Meldungen...</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center">
                            <AlertTriangle size={32} className="mx-auto text-muted-foreground" aria-hidden />
                            <p className="mt-3 text-base font-medium text-foreground">Keine Meldungen</p>
                            <p className="mt-1 text-xs text-muted-foreground">Aktuell sind keine Meldungen in dieser Ansicht vorhanden.</p>
                        </div>
                    ) : viewMode === 'kanban' ? (
                        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
                            {/* Open reports column */}
                            <KanbanColumn
                                title="Offen / Neu"
                                badgeColor="bg-destructive"
                                reports={columns.open}
                                selectedId={selectedReport?.id}
                                onSelect={handleSelectReport}
                            />
                            {/* Investigating column */}
                            <KanbanColumn
                                title="In Prüfung"
                                badgeColor="bg-foreground"
                                reports={columns.investigating}
                                selectedId={selectedReport?.id}
                                onSelect={handleSelectReport}
                            />
                            {/* Resolved reports column */}
                            <KanbanColumn
                                title="Gelöst / Erledigt"
                                badgeColor="bg-emerald-600"
                                reports={columns.resolved}
                                selectedId={selectedReport?.id}
                                onSelect={handleSelectReport}
                            />
                            {/* Dismissed column */}
                            <KanbanColumn
                                title="Abgewiesen"
                                badgeColor="bg-muted-foreground"
                                reports={columns.dismissed}
                                selectedId={selectedReport?.id}
                                onSelect={handleSelectReport}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredReports.map(r => (
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    type="button"
                                    key={r.id}
                                    onClick={() => handleSelectReport(r)}
                                    className={cn(
                                        'flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-border',
                                        selectedReport?.id === r.id && 'ring-2 ring-ring'
                                    )}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className={cn(
                                            'grid size-10 shrink-0 place-items-center rounded-xl',
                                            r.status === 'open' || r.status === 'investigating' ? REPORT_ICON_OPEN : REPORT_ICON_CLOSED
                                        )}>
                                            <AlertTriangle size={20} aria-hidden />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="break-words text-sm font-medium text-foreground">
                                                {r.reason} • <span className="text-xs font-normal capitalize text-muted-foreground">{r.category}</span>
                                            </div>
                                            <div className="mt-0.5 break-words text-xs text-muted-foreground">
                                                Gemeldet von {(r.reporter as any)?.display_name || 'Anonym'} • {new Date(r.created_at).toLocaleDateString('de-DE')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className={cn(
                                            'rounded-md px-2.5 py-1 text-xs font-medium',
                                            r.priority === 'kritisch' ? PRIO_BADGE_KRITISCH : r.priority === 'hoch' ? PRIO_BADGE_HOCH : PRIO_BADGE_NORMAL
                                        )}>
                                            {r.priority}
                                        </span>
                                        <ChevronRight size={16} className="text-muted-foreground" aria-hidden />
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right detail panel (mobil ersetzt sie die Liste) */}
                {selectedReport && (
                    <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-overlay 2xl:w-[440px]">
                        {/* Detail Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-base font-semibold">
                                    <AlertTriangle size={20} className="shrink-0 text-destructive" aria-hidden />
                                    Meldungsdetails
                                </div>
                                <div className="mt-0.5 break-words text-xs font-medium text-muted-foreground">
                                    ID: {selectedReport.id.slice(0, 8)} • Stufe: {selectedReport.priority.toUpperCase()} • {REPORT_STATUS_LABELS[selectedReport.status] || selectedReport.status}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" type="button" onClick={() => setSelectedReport(null)} className="h-11 w-11 shrink-0" aria-label="Meldungsdetails schließen">
                                <XCircle size={20} aria-hidden />
                            </Button>
                        </div>

                        {/* Detail Body */}
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5">
                            {/* Involved Users */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
                                    <span className="mb-1 block font-medium text-muted-foreground">Meldender (User)</span>
                                    <div className="flex items-center gap-1 break-words font-medium">
                                        <User size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                                        {selectedReport.reporter?.display_name || 'System'}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
                                    <span className="mb-1 block font-medium text-muted-foreground">Gegen (Ziel)</span>
                                    <div className="flex items-center gap-1 break-words font-medium text-destructive">
                                        <User size={16} className="shrink-0" aria-hidden />
                                        {selectedReport.user?.display_name || selectedReport.ad?.short_description || 'Unbekannt'}
                                    </div>
                                </div>
                            </div>

                            {/* Reason & Category */}
                            <div className="space-y-1.5">
                                <span className="block text-xs font-medium text-muted-foreground">Kategorie / Grund</span>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                                        {selectedReport.category}
                                    </span>
                                    {selectedReport.sub_reason && (
                                        <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                                            {selectedReport.sub_reason}
                                        </span>
                                    )}
                                    <span className={cn(
                                        'rounded-md px-2.5 py-1 text-xs font-medium',
                                        selectedReport.priority === 'kritisch' ? PRIO_BAR_KRITISCH : selectedReport.priority === 'hoch' ? PRIO_BAR_HOCH : PRIO_BAR_NORMAL
                                    )}>
                                        Prio: {selectedReport.priority}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <span className="block text-xs font-medium text-muted-foreground">Meldungsbeschreibung</span>
                                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm italic text-foreground/80">
                                    "{selectedReport.description || 'Keine Beschreibung angegeben.'}"
                                </div>
                            </div>

                            {/* Filter-Treffer (automatische Meldung, Profanity 2.0 Training) */}
                            {(() => {
                                const auto = getAutoEvidence(selectedReport);
                                if (!auto) return null;
                                return (
                                    <div className="space-y-2 rounded-xl border border-border bg-muted p-4">
                                        <span className="block text-xs font-medium text-foreground">
                                            Automatische Filtermeldung • Schwere: {auto.severity ?? '–'}
                                        </span>
                                        {auto.hits && auto.hits.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {auto.hits.map((h, i) => (
                                                    <span key={i} className="rounded-md bg-muted px-2.5 py-1 tabular-nums text-xs font-medium text-foreground">
                                                        {h}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {auto.excerpt && (
                                            <div className="rounded-xl border border-border bg-card p-3 text-sm italic text-foreground/80">
                                                "{auto.excerpt}"
                                            </div>
                                        )}
                                        <p className="text-xs font-medium text-foreground">
                                            Wahr oder falsch? Mit „Zutreffend" bestätigst du den Verstoß, mit „Fehlalarm" wird die Meldung abgewiesen und die getroffenen Wörter werden für den Filter freigegeben (Training).
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Evidence Screenshots */}
                            {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                                <div className="space-y-2">
                                    <span className="block text-xs font-medium text-muted-foreground">Screenshots / Evidenz</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {selectedReport.evidence.map((imgUrl, i) => (
                                            <Button
                                                variant="unstyled"
                                                size="unstyled"
                                                type="button"
                                                key={i}
                                                className="group relative aspect-video shrink-0 overflow-hidden rounded-xl border border-border  "
                                                onClick={() => setZoomedImage(imgUrl)}
                                                aria-label={`Screenshot ${i + 1} vergrößern`}
                                            >
                                                <img src={imgUrl} alt="" className="size-full object-cover" />
                                                <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
                                                    <ImageIcon size={20} className="text-white" aria-hidden />
                                                </span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Chat insight helper */}
                            {selectedReport.category === 'chat' && (selectedReport.reported_user_id && selectedReport.reporter_id) && (
                                <div className="space-y-2.5 rounded-xl border border-border bg-muted p-4">
                                    <div className="flex items-start gap-2 text-xs font-medium text-foreground">
                                        <MessageSquare size={16} className="mt-0.5 shrink-0" aria-hidden />
                                        <span>Als Admin kannst du den Chatverlauf dieses Vorfalls zu Moderationszwecken einsehen.</span>
                                    </div>
                                    <Button
                                        onClick={() => onOpenChat(selectedReport.reporter_id, selectedReport.reported_user_id!, selectedReport.id)}
                                        className="h-11 w-full gap-1.5 text-xs"
                                    >
                                        <Eye size={16} aria-hidden /> Chat-Einsicht öffnen
                                    </Button>
                                </div>
                            )}

                            {/* Internal notes */}
                            <div className="space-y-1.5">
                                <Label htmlFor="report-admin-notes" className="block text-xs font-medium text-muted-foreground">SV-Interne Notizen</Label>
                                <Textarea
                                    id="report-admin-notes"
                                    className="min-h-[90px]"
                                    placeholder="Notizen zu Gesprächen, Warnungen, etc. (nur für Admins sichtbar)..."
                                    value={adminNotes}
                                    onChange={e => setAdminNotes(e.target.value)}
                                />
                                <Button size="sm" variant="outline" className="h-11 text-xs" onClick={saveAdminNotes}>Notizen speichern</Button>
                            </div>
                        </div>

                        {/* Action buttons footer */}
                        <div className="shrink-0 border-t border-border bg-muted/40 p-4">
                            {selectedReport.status === 'open' || selectedReport.status === 'investigating' ? (
                                <div className="flex flex-col gap-2">
                                    {getAutoEvidence(selectedReport) && (
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Button
                                                onClick={handleFalsePositive}
                                                variant="outline"
                                                className="h-11 flex-1 text-xs"
                                            >
                                                Fehlalarm – Wörter freigeben
                                            </Button>
                                            <Button
                                                onClick={handleConfirmViolation}
                                                className="h-11 flex-1 text-xs"
                                            >
                                                Zutreffend – Verstoß bestätigen
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            onClick={handleDismiss}
                                            variant="outline"
                                            className="h-11 flex-1 text-xs"
                                        >
                                            Abweisen
                                        </Button>
                                        <Button
                                            onClick={() => setShowResolveDialog(true)}
                                            className="h-11 flex-1 text-xs"
                                        >
                                            Meldung Lösen
                                        </Button>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        {selectedReport.status === 'open' && (
                                            <Button
                                                onClick={handleInvestigate}
                                                variant="ghost"
                                                className="h-11 flex-1 text-xs"
                                            >
                                                In Prüfung setzen
                                            </Button>
                                        )}
                                        {selectedReport.priority !== 'kritisch' && (
                                            <Button
                                                onClick={handleEscalate}
                                                variant="ghost"
                                                className="h-11 flex-1 text-xs text-foreground hover:bg-muted"
                                            >
                                                Auf Kritisch eskalieren
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-2 text-center text-xs font-medium text-muted-foreground">
                                    Status: {REPORT_STATUS_LABELS[selectedReport.status] || selectedReport.status} ({selectedReport.resolution_type ? RESOLUTION_LABELS[selectedReport.resolution_type] || selectedReport.resolution_type : 'Erledigt'})
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Zoomed evidence dialog */}
            <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
                <DialogContent className="max-w-3xl overflow-hidden bg-transparent p-0 [&_[data-slot=dialog-close]]:size-11">
                    {zoomedImage && (
                        <div className="relative flex max-h-[80vh] items-center justify-center bg-black/90">
                            <img src={zoomedImage} alt="Vergrößerte Evidenz" className="max-h-[80vh] max-w-full object-contain" />
                            <Button variant="secondary" size="icon"
                                onClick={() => setZoomedImage(null)}
                                className="absolute top-4 right-4 h-11 w-11"
                                aria-label="Vergrößerung schließen"
                            >
                                <XCircle size={20} aria-hidden />
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Resolve Modal Dialog */}
            <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
                <DialogContent className="max-w-md [&_[data-slot=dialog-close]]:size-11">
                    <DialogHeader>
                        <DialogTitle>Meldung auflösen</DialogTitle>
                        <DialogDescription>
                            Wähle die Konsequenz bzw. das Resultat für diese Meldung aus.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="resolve-type" className="text-sm font-medium">Aktionstyp</Label>
                            <NativeSelect
                                id="resolve-type"
                                value={resolutionType}
                                onChange={e => setResolutionType(e.target.value as any)}
                                className="w-full"
                            >
                                <option value="dismiss">Keine weitere Aktion (Nur schließen)</option>
                                <option value="warn">Nutzer verwarnt (Mitteilung und E-Mail)</option>
                                <option value="ban">Nutzer sperren (temporär oder dauerhaft)</option>
                                <option value="delete">Gemeldeten Inhalt löschen</option>
                            </NativeSelect>
                        </div>
                        {resolutionType === 'ban' && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="ban-type" className="text-sm font-medium">Sperre</Label>
                                    <NativeSelect
                                        id="ban-type"
                                        value={banType}
                                        onChange={e => setBanType(e.target.value as 'temporary' | 'permanent')}
                                        className="w-full"
                                    >
                                        <option value="temporary">Vorübergehend</option>
                                        <option value="permanent">Dauerhaft</option>
                                    </NativeSelect>
                                </div>
                                {banType === 'temporary' && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="ban-days" className="text-sm font-medium">Dauer in Tagen</Label>
                                        <Input
                                            id="ban-days"
                                            type="number"
                                            min={1}
                                            max={3650}
                                            value={banDays}
                                            onChange={e => setBanDays(Math.max(1, Math.min(3650, Number(e.target.value) || 1)))}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {resolutionType === 'warn' && 'Der Nutzer erhält eine In-App-Mitteilung und, falls eine E-Mail-Adresse hinterlegt ist, eine E-Mail mit dem Grund.'}
                            {resolutionType === 'ban' && 'Die Sperre wird sofort aktiv. Der Nutzer sieht beim nächsten Login Grund und Dauer.'}
                            {resolutionType === 'delete' && 'Die gemeldete Anzeige und die in der Meldung verknüpften Nachrichten werden dauerhaft gelöscht.'}
                            {resolutionType === 'dismiss' && 'Die Meldung wird ohne weitere Konsequenz geschlossen.'}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowResolveDialog(false)} className="h-11">Abbrechen</Button>
                        <Button onClick={handleResolve} className="h-11">Lösen bestätigen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Kanban Column Subcomponent
interface KanbanColumnProps {
    title: string;
    badgeColor: string;
    reports: Report[];
    selectedId?: string;
    onSelect: (report: Report) => void;
}

function KanbanColumn({ title, badgeColor, reports, selectedId, onSelect }: KanbanColumnProps) {
    return (
        <div className="flex min-h-[200px] flex-col rounded-2xl border border-border bg-muted/40 p-3">
            {/* Header */}
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
                <span className="text-sm font-semibold text-foreground">{title}</span>
                <span className={cn('rounded-md px-2.5 py-1 text-xs font-semibold text-white tabular-nums', badgeColor)}>
                    {reports.length}
                </span>
            </div>

            {/* Cards container */}
            <div className="space-y-2">
                {reports.map(r => (
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        key={r.id}
                        onClick={() => onSelect(r)}
                        className={cn(
                            'flex w-full flex-col gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-border',
                            selectedId === r.id && 'ring-2 ring-ring'
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                                {r.category}
                            </span>
                            <span className={cn(
                                'mt-1.5 size-2 shrink-0 rounded-full',
                                r.priority === 'kritisch' ? 'bg-destructive' : r.priority === 'hoch' ? 'bg-foreground' : 'bg-muted-foreground/40'
                            )} title={`Priorität: ${r.priority}`} />
                        </div>

                        <div>
                            <div className="text-xs font-semibold leading-tight text-foreground">
                                {r.reason}
                            </div>
                            {r.description && (
                                <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                                    "{r.description}"
                                </p>
                            )}
                        </div>

                        <div className="mt-1 border-t border-border pt-2 text-xs text-muted-foreground">
                            Gegen: <span className="font-medium text-foreground">{r.user?.display_name || r.ad?.short_description || 'Unbekannt'}</span>
                        </div>
                    </Button>
                ))}
                {reports.length === 0 && (
                    <div className="py-10 text-center text-xs italic text-muted-foreground">
                        Keine Meldungen vorhanden.
                    </div>
                )}
            </div>
        </div>
    );
}
