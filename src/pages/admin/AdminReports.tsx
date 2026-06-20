import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/Dialog';
import {
    AlertTriangle,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    User,
    ChevronRight,
    MessageSquare,
    ArrowUpRight,
    Search,
    List as ListIcon,
    LayoutGrid,
    BookOpen,
    Image as ImageIcon,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

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
    status: 'open' | 'resolved' | 'dismissed';
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
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    
    // Filters
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Detail States
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [resolutionType, setResolutionType] = useState<'warn' | 'ban' | 'delete' | 'dismiss'>('dismiss');
    
    // Zoomed image modal state
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reports')
                .select(`
                    *,
                    reporter:reporter_id(id, first_name, last_name, display_name, avatar_url),
                    user:reported_user_id(id, first_name, last_name, display_name, avatar_url),
                    ad:reported_ad_id(id, short_description)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error: any) {
            console.error('Error fetching reports:', error);
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
            const { error } = await supabase
                .from('reports')
                .update({ admin_notes: adminNotes })
                .eq('id', selectedReport.id);

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
            const adminId = (await supabase.auth.getUser()).data.user?.id;
            
            const { error } = await supabase
                .from('reports')
                .update({
                    status: 'resolved',
                    resolution_type: resolutionType,
                    resolved_by: adminId,
                    resolved_at: new Date().toISOString(),
                    admin_notes: adminNotes,
                })
                .eq('id', selectedReport.id);

            if (error) throw error;

            toast.success(`Meldung als gelöst markiert (${resolutionType})`);
            setShowResolveDialog(false);
            fetchReports();
            setSelectedReport(null);

            // Audit
            await supabase.from('admin_audit_log').insert({
                admin_id: adminId,
                action: 'resolve_report',
                target_type: 'report',
                target_id: selectedReport.id,
                details: { resolution_type: resolutionType }
            });
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const handleDismiss = async () => {
        if (!selectedReport) return;
        try {
            const adminId = (await supabase.auth.getUser()).data.user?.id;
            
            const { error } = await supabase
                .from('reports')
                .update({
                    status: 'dismissed',
                    resolution_type: 'dismiss',
                    resolved_by: adminId,
                    resolved_at: new Date().toISOString(),
                    admin_notes: adminNotes,
                })
                .eq('id', selectedReport.id);

            if (error) throw error;

            toast.success('Meldung abgewiesen');
            fetchReports();
            setSelectedReport(null);

            // Audit
            await supabase.from('admin_audit_log').insert({
                admin_id: adminId,
                action: 'dismiss_report',
                target_type: 'report',
                target_id: selectedReport.id,
                details: {}
            });
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const handleEscalate = async () => {
        if (!selectedReport) return;
        try {
            const { error } = await supabase
                .from('reports')
                .update({ priority: 'kritisch' })
                .eq('id', selectedReport.id);

            if (error) throw error;

            toast.success('Priorität auf Kritisch eskaliert');
            setSelectedReport({ ...selectedReport, priority: 'kritisch' });
            fetchReports();
        } catch (error: any) {
            toast.error('Eskalation fehlgeschlagen: ' + error.message);
        }
    };

    // Filter Logic
    const filteredReports = reports.filter(r => {
        const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
        const matchesPriority = filterPriority === 'all' || r.priority === filterPriority;
        
        const reporterName = r.reporter?.display_name || '';
        const reportedName = r.user?.display_name || r.ad?.short_description || '';
        const descText = r.description || '';
        const reasonText = r.reason || '';

        const matchesSearch = 
            reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reportedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            descText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reasonText.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesPriority && matchesSearch;
    });

    // Grouping for Kanban columns
    const columns = {
        open: filteredReports.filter(r => r.status === 'open'),
        dismissed: filteredReports.filter(r => r.status === 'dismissed'),
        resolved: filteredReports.filter(r => r.status === 'resolved'),
    };

    return (
        <div className="space-y-6 h-full flex flex-col min-h-0 animate-in fade-in duration-300">
            {/* Header / Filter bar */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shrink-0">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Meldungen durchsuchen..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 pl-10 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="h-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none"
                    >
                        <option value="all">Alle Kategorien</option>
                        <option value="profil">Profil/Nutzer</option>
                        <option value="anzeige">Anzeige</option>
                        <option value="chat">Chat</option>
                        <option value="datenschutz">Datenschutz</option>
                        <option value="sonstiges">Sonstiges</option>
                    </select>

                    <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        className="h-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none"
                    >
                        <option value="all">Alle Prioritäten</option>
                        <option value="normal">Normal</option>
                        <option value="hoch">Hoch</option>
                        <option value="kritisch">Kritisch</option>
                    </select>

                    <Button onClick={fetchReports} variant="ghost" className="h-11 w-11 p-0 rounded-2xl" title="Aktualisieren">
                        <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
                    </Button>

                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border dark:border-gray-800 shrink-0">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={cn('p-2 rounded-xl transition-all', viewMode === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-900 dark:text-white' : 'text-gray-400')}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn('p-2 rounded-xl transition-all', viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-900 dark:text-white' : 'text-gray-400')}
                        >
                            <ListIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content grid */}
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                {/* Reports board/list */}
                <div className="flex-1 overflow-auto min-h-0 pr-1">
                    {loading ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 font-medium">Lade Meldungen...</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="py-20 text-center space-y-3 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl">
                            <AlertTriangle size={48} className="mx-auto text-green-500" />
                            <p className="text-gray-500 font-medium text-lg">Keine Meldungen</p>
                            <p className="text-gray-400 text-xs">Aktuell sind keine ungelösten Meldungen in dieser Ansicht vorhanden.</p>
                        </div>
                    ) : viewMode === 'kanban' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
                            {/* Open reports column */}
                            <KanbanColumn
                                title="Offen / Neu"
                                badgeColor="bg-red-500"
                                reports={columns.open}
                                selectedId={selectedReport?.id}
                                onSelect={handleSelectReport}
                            />
                            {/* Resolved reports column */}
                            <KanbanColumn
                                title="Gelöst / Erledigt"
                                badgeColor="bg-green-500"
                                reports={columns.resolved}
                                selectedId={selectedReport?.id}
                                onSelect={handleSelectReport}
                            />
                            {/* Dismissed column */}
                            <KanbanColumn
                                title="Abgewiesen"
                                badgeColor="bg-gray-400"
                                reports={columns.dismissed}
                                selectedId={selectedReport?.id}
                                onSelect={handleSelectReport}
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredReports.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => handleSelectReport(r)}
                                    className={cn(
                                        'p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-md cursor-pointer flex items-center justify-between gap-4 transition-all',
                                        selectedReport?.id === r.id && 'ring-2 ring-primary'
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                                            r.status === 'open' ? 'bg-red-50 text-red-500 dark:bg-red-950/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                        )}>
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold truncate text-sm">
                                                {r.reason} • <span className="text-gray-400 font-medium capitalize text-xs">{r.category}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5 truncate">
                                                Gemeldet von {(r.reporter as any)?.display_name} • {new Date(r.created_at).toLocaleDateString('de-DE')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                            r.priority === 'kritisch' ? 'bg-red-100 text-red-700 animate-pulse' : r.priority === 'hoch' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                                        )}>
                                            {r.priority}
                                        </span>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right detail panel */}
                {selectedReport && (
                    <div className="w-full md:w-[450px] bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl shadow-lg flex flex-col overflow-hidden shrink-0 animate-in slide-in-from-right duration-200">
                        {/* Detail Header */}
                        <div className="p-5 border-b dark:border-gray-800 flex justify-between items-center shrink-0">
                            <div>
                                <div className="font-bold text-base flex items-center gap-1.5">
                                    <AlertTriangle size={18} className="text-red-500" />
                                    Meldungsdetails
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5 font-semibold">
                                    ID: {selectedReport.id.slice(0, 8)} • Stufe: {selectedReport.priority.toUpperCase()}
                                </div>
                            </div>
                            <button onClick={() => setSelectedReport(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Detail Body */}
                        <div className="flex-1 p-5 overflow-y-auto space-y-6">
                            {/* Involved Users */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border dark:border-gray-800 text-xs">
                                    <span className="text-gray-400 font-bold block mb-1">Meldender (User)</span>
                                    <div className="font-bold flex items-center gap-1">
                                        <User size={12} className="text-gray-400" />
                                        {selectedReport.reporter?.display_name || 'System'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border dark:border-gray-800 text-xs">
                                    <span className="text-gray-400 font-bold block mb-1">Gegen (Ziel)</span>
                                    <div className="font-bold flex items-center gap-1 text-red-600 dark:text-red-400">
                                        <User size={12} />
                                        {selectedReport.user?.display_name || selectedReport.ad?.short_description || 'Unbekannt'}
                                    </div>
                                </div>
                            </div>

                            {/* Reason & Category */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kategorie / Grund</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold capitalize">
                                        {selectedReport.category}
                                    </span>
                                    {selectedReport.sub_reason && (
                                        <span className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-bold">
                                            {selectedReport.sub_reason}
                                        </span>
                                    )}
                                    <span className={cn(
                                        'px-2.5 py-1 rounded-xl text-xs font-bold uppercase',
                                        selectedReport.priority === 'kritisch' ? 'bg-red-500 text-white animate-pulse' : selectedReport.priority === 'hoch' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                    )}>
                                        Prio: {selectedReport.priority}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Meldungsbeschreibung</span>
                                <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl border dark:border-gray-800 text-sm italic shadow-inner text-gray-700 dark:text-gray-300">
                                    "{selectedReport.description || 'Keine Beschreibung angegeben.'}"
                                </div>
                            </div>

                            {/* Evidence Screenshots */}
                            {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Screenshots / Evidenz</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {selectedReport.evidence.map((imgUrl, i) => (
                                            <div
                                                key={i}
                                                className="aspect-video relative rounded-xl border dark:border-gray-800 overflow-hidden cursor-zoom-in group shrink-0"
                                                onClick={() => setZoomedImage(imgUrl)}
                                            >
                                                <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                                    <ImageIcon size={16} className="text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Chat insight helper */}
                            {selectedReport.category === 'chat' && (selectedReport.reported_user_id && selectedReport.reporter_id) && (
                                <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl space-y-2.5">
                                    <div className="flex gap-2 items-start text-xs text-primary-hover font-bold">
                                        <MessageSquare size={16} className="shrink-0 mt-0.5" />
                                        <span>Als Admin kannst du den Chatverlauf dieses Vorfalls zu Moderationszwecken einsehen.</span>
                                    </div>
                                    <Button
                                        onClick={() => onOpenChat(selectedReport.reporter_id, selectedReport.reported_user_id!, selectedReport.id)}
                                        className="w-full bg-primary hover:bg-primary/90 text-black font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1"
                                    >
                                        <Eye size={14} /> Chat-Einsicht öffnen
                                    </Button>
                                </div>
                            )}

                            {/* Internal notes */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">SV-Interne Notizen</label>
                                <textarea
                                    className="w-full border dark:border-gray-800 rounded-xl p-3 bg-transparent text-sm min-h-[90px] focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Notizen zu Gesprächen, Warnungen, etc. (nur für Admins sichtbar)..."
                                    value={adminNotes}
                                    onChange={e => setAdminNotes(e.target.value)}
                                />
                                <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl" onClick={saveAdminNotes}>Notizen speichern</Button>
                            </div>
                        </div>

                        {/* Action buttons footer */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-t dark:border-gray-800 shrink-0">
                            {selectedReport.status === 'open' ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleDismiss}
                                            variant="outline"
                                            className="flex-1 h-10 text-xs font-bold rounded-xl border-gray-200"
                                        >
                                            Abweisen
                                        </Button>
                                        <Button
                                            onClick={() => setShowResolveDialog(true)}
                                            className="flex-1 h-10 text-xs font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            Meldung Lösen
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedReport.priority !== 'kritisch' && (
                                            <Button
                                                onClick={handleEscalate}
                                                variant="ghost"
                                                className="flex-1 h-9 text-[10px] font-bold rounded-xl text-amber-600 hover:bg-amber-50"
                                            >
                                                Auf Kritisch eskalieren
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                                    Status: {selectedReport.status} ({selectedReport.resolution_type || 'Erledigt'})
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Zoomed evidence dialog */}
            <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
                <DialogContent className="max-w-3xl p-0 bg-transparent overflow-hidden">
                    {zoomedImage && (
                        <div className="relative aspect-auto max-h-[80vh] flex items-center justify-center bg-black/90">
                            <img src={zoomedImage} className="max-h-[80vh] max-w-full object-contain" />
                            <button
                                onClick={() => setZoomedImage(null)}
                                className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Resolve Modal Dialog */}
            <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle>Meldung auflösen</DialogTitle>
                        <DialogDescription>
                            Wähle die Konsequenz bzw. das Resultat für diese Meldung aus.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400">Aktionstyp</label>
                            <select
                                value={resolutionType}
                                onChange={e => setResolutionType(e.target.value as any)}
                                className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm focus:outline-none"
                            >
                                <option value="dismiss">Keine weitere Aktion (Nur schließen)</option>
                                <option value="warn">Nutzer verwarnt (Verwarnungsnachricht gesendet)</option>
                                <option value="ban">Nutzer gebannt (Temporär oder permanent)</option>
                                <option value="delete">Inhalt gelöscht (Anzeige/Nachrichten gelöscht)</option>
                            </select>
                        </div>
                        <p className="text-xs text-gray-500">
                            Hinweis: Für Bannen oder Löschen von Anzeigen navigiere bitte direkt in die jeweiligen Reiter 'Nutzer' bzw. 'Anzeigen' für eine detaillierte Ausführung.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowResolveDialog(false)} className="rounded-xl">Abbrechen</Button>
                        <Button onClick={handleResolve} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold">Lösen bestätigen</Button>
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
        <div className="flex flex-col bg-gray-100/60 dark:bg-gray-900/40 border dark:border-gray-800/80 rounded-3xl p-4 h-full min-h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4 shrink-0">
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{title}</span>
                <span className={cn('text-white text-xs px-2.5 py-0.5 rounded-full font-black', badgeColor)}>
                    {reports.length}
                </span>
            </div>
            
            {/* Cards container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                {reports.map(r => (
                    <div
                        key={r.id}
                        onClick={() => onSelect(r)}
                        className={cn(
                            'p-4 bg-white dark:bg-gray-900 border dark:border-gray-800/50 rounded-2xl shadow-sm hover:shadow transition-all cursor-pointer flex flex-col gap-2.5',
                            selectedId === r.id && 'ring-2 ring-primary border-transparent'
                        )}
                    >
                        <div className="flex justify-between items-start gap-2">
                            <span className={cn(
                                'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase',
                                r.category === 'chat' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                                r.category === 'anzeige' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                r.category === 'profil' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                r.category === 'datenschutz' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                r.category === 'sonstiges' && 'bg-gray-100 text-gray-700 dark:bg-gray-800'
                            )}>
                                {r.category}
                            </span>
                            <span className={cn(
                                'w-2 h-2 rounded-full',
                                r.priority === 'kritisch' ? 'bg-red-500 animate-ping' : r.priority === 'hoch' ? 'bg-amber-500' : 'bg-gray-300'
                            )} title={`Priorität: ${r.priority}`} />
                        </div>
                        
                        <div>
                            <div className="font-extrabold text-xs text-gray-900 dark:text-gray-100 leading-tight">
                                {r.reason}
                            </div>
                            {r.description && (
                                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 italic">
                                    "{r.description}"
                                </p>
                            )}
                        </div>

                        <div className="text-[10px] text-gray-400 border-t dark:border-gray-800 pt-2 mt-1">
                            Gegen: <span className="font-bold text-gray-500">{r.user?.display_name || r.ad?.short_description || 'Unbekannt'}</span>
                        </div>
                    </div>
                ))}
                {reports.length === 0 && (
                    <div className="text-center py-10 text-xs text-gray-400 italic">
                        Keine Meldungen vorhanden.
                    </div>
                )}
            </div>
        </div>
    );
}
