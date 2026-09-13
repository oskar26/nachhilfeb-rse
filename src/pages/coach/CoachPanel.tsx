import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import {
    Award,
    Search,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Copy,
    Check,
    RefreshCw,
    Plus,
    History,
    Activity,
    GraduationCap,
    Users,
    Key
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';

export default function CoachPanel() {
    const { user, profile, isCoachAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'students' | 'codes' | 'logs' | 'sv_activity'>('students');

    // Students state
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCoach, setFilterCoach] = useState<'all' | 'coaches' | 'non_coaches'>('all');

    // Codes state
    const [coachCodes, setCoachCodes] = useState<any[]>([]);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [codeCount, setCodeCount] = useState(1);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Logs state
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // SV Activity state
    const [svLogs, setSvLogs] = useState<any[]>([]);
    const [loadingSvLogs, setLoadingSvLogs] = useState(false);

    useEffect(() => {
        loadStudents();
    }, []);

    useEffect(() => {
        if (activeTab === 'codes') loadCodes();
        if (activeTab === 'logs') loadLogs();
        if (activeTab === 'sv_activity') loadSvActivity();
    }, [activeTab]);

    const loadStudents = async () => {
        setLoadingStudents(true);
        try {
            const res = await api.coach.listStudents();
            if (res.data) setStudents(res.data);
        } catch (e: any) {
            toast.error('Schülerliste konnte nicht geladen werden.');
        } finally {
            setLoadingStudents(false);
        }
    };

    const loadCodes = async () => {
        setLoadingCodes(true);
        try {
            const res = await api.promo_codes.list();
            const list = (res.data || []).filter((c: any) => c.effect_type === 'coach_verification' || c.target_group === 'coach');
            setCoachCodes(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingCodes(false);
        }
    };

    const loadLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await api.coach.listLogs();
            if (res.data) setLogs(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingLogs(false);
        }
    };

    const loadSvActivity = async () => {
        setLoadingSvLogs(true);
        try {
            const res = await api.admin.overview();
            if (res.data?.audit_log) {
                setSvLogs(res.data.audit_log);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSvLogs(false);
        }
    };

    const handleToggleCoach = async (student: any) => {
        triggerHaptic('selection');
        const nextStatus = !student.is_coach;
        try {
            await api.coach.setCoachStatus(student.id, nextStatus);
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_coach: nextStatus } : s));
            toast.success(nextStatus ? `${student.display_name} ist jetzt Schüler-Coach!` : `Coach-Status für ${student.display_name} entfernt.`);
        } catch (e: any) {
            toast.error('Änderung fehlgeschlagen: ' + e.message);
        }
    };

    const handleGenerateCoachCode = async () => {
        triggerHaptic('medium');
        setGeneratingCode(true);
        try {
            const randomCode = 'COACH-' + Math.random().toString(36).substring(2, 7).toUpperCase();
            await api.promo_codes.create({
                code: randomCode,
                effect_type: 'coach_verification',
                push_level: 'super',
                boost_days: 30,
                max_uses: 1,
                target_group: 'coach',
                description: 'Vergeben durch Schüler-Coaching Leitung (Frau Balistreri)',
                expiry_days: 180
            });
            toast.success(`Coaching-Code „${randomCode}“ erfolgreich erstellt!`);
            loadCodes();
        } catch (e: any) {
            toast.error('Erstellung fehlgeschlagen: ' + e.message);
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleCopy = (id: string, text: string) => {
        triggerHaptic('light');
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Code kopiert!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredStudents = students.filter(s => {
        const matchesQuery = (
            (s.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.grade_level || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (!matchesQuery) return false;
        if (filterCoach === 'coaches') return s.is_coach;
        if (filterCoach === 'non_coaches') return !s.is_coach;
        return true;
    });

    if (!isCoachAdmin) {
        return (
            <div className="p-8 text-center text-red-500 font-bold">
                Zugriff verweigert. Dieser Bereich ist der Leitung der Schüler-Coaching AG vorbehalten.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-28 space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-yellow-950/20 dark:to-transparent p-6 rounded-3xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-300">
                            <Award size={20} className="text-amber-600 dark:text-amber-400" />
                        </span>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Schüler-Coaching AG</h1>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Betreuung & Verwaltung durch <span className="font-bold text-gray-900 dark:text-gray-200">Frau Balistreri</span> • Förderung der Tutoren für Klasse 5 & 6
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/30">
                        {students.filter(s => s.is_coach).length} aktive Coaches
                    </span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-1.5 rounded-2xl gap-1 shadow-xs">
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('students'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        activeTab === 'students' ? "bg-amber-400 text-amber-950 shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <Users size={16} />
                    <span>Schülerliste</span>
                </button>
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('codes'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        activeTab === 'codes' ? "bg-amber-400 text-amber-950 shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <Key size={16} />
                    <span>Coaching-Codes</span>
                </button>
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('logs'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        activeTab === 'logs' ? "bg-amber-400 text-amber-950 shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <History size={16} />
                    <span>Mein Protokoll</span>
                </button>
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('sv_activity'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        activeTab === 'sv_activity' ? "bg-amber-400 text-amber-950 shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <Activity size={16} />
                    <span>SV-Aktivitäten</span>
                </button>
            </div>

            {/* TAB 1: SCHÜLERLISTE */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:w-80">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Schüler suchen (Name, Klasse)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-2xl bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl">
                            <button
                                onClick={() => setFilterCoach('all')}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterCoach === 'all' ? "bg-white dark:bg-gray-900 shadow-xs text-gray-900 dark:text-white" : "text-gray-500")}
                            >
                                Alle ({students.length})
                            </button>
                            <button
                                onClick={() => setFilterCoach('coaches')}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterCoach === 'coaches' ? "bg-white dark:bg-gray-900 shadow-xs text-amber-700 dark:text-amber-300" : "text-gray-500")}
                            >
                                Coaches ({students.filter(s => s.is_coach).length})
                            </button>
                            <button
                                onClick={() => setFilterCoach('non_coaches')}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterCoach === 'non_coaches' ? "bg-white dark:bg-gray-900 shadow-xs text-gray-700 dark:text-gray-300" : "text-gray-500")}
                            >
                                Noch keine Coaches
                            </button>
                        </div>
                    </div>

                    {loadingStudents ? (
                        <div className="py-20 text-center">
                            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Schülerliste wird geladen...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <Card className="rounded-3xl p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border-dashed">
                            Keine Schüler passend zu deinen Suchkriterien gefunden.
                        </Card>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {filteredStudents.map(student => (
                                <Card key={student.id} className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs hover:border-amber-400/60 transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-2xl bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-black flex items-center justify-center shrink-0 border border-amber-200/50">
                                                {student.display_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                                                        {student.display_name || `${student.first_name} ${student.last_name}`}
                                                    </span>
                                                    {student.is_coach && (
                                                        <span title="Schüler-Coach">
                                                            <Award size={14} className="text-amber-500 shrink-0" />
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                                                    <GraduationCap size={13} />
                                                    {student.grade_level ? `Klasse ${student.grade_level}${student.class_letter || ''}` : 'Keine Klasse'}
                                                    {student.active_ads_count > 0 && (
                                                        <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-gray-100 dark:bg-gray-800 rounded-md font-bold">
                                                            {student.active_ads_count} {student.active_ads_count === 1 ? 'Anzeige' : 'Anzeigen'}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant={student.is_coach ? "outline" : "primary"}
                                            onClick={() => handleToggleCoach(student)}
                                            className={cn(
                                                "rounded-xl text-xs font-bold shrink-0 cursor-pointer",
                                                student.is_coach
                                                    ? "border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    : "bg-amber-500 hover:bg-amber-600 text-amber-950 font-extrabold shadow-xs"
                                            )}
                                        >
                                            {student.is_coach ? "Coach entziehen" : "Zum Coach machen"}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: COACHING CODES */}
            {activeTab === 'codes' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-xs">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Neue Schüler-Coaching Codes vergeben</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Diese Codes schalten automatisch den offiziellen Schüler-Coach Haken und 30 Tage Super-Boost frei.
                            </p>
                        </div>
                        <Button
                            onClick={handleGenerateCoachCode}
                            disabled={generatingCode}
                            className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-black rounded-xl gap-2 shadow-xs cursor-pointer"
                        >
                            <Plus size={16} /> Neuen Coaching-Code erstellen
                        </Button>
                    </div>

                    <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
                        <CardContent className="p-0">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Verfügbare Schüler-Coaching Codes ({coachCodes.length})
                                </span>
                                <Button onClick={loadCodes} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                    <RefreshCw size={14} className={cn(loadingCodes && "animate-spin")} />
                                </Button>
                            </div>

                            {loadingCodes ? (
                                <div className="py-12 text-center text-xs text-gray-400 font-bold uppercase">Lade Codes...</div>
                            ) : coachCodes.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs italic">
                                    Noch keine spezifischen Coaching-Codes erstellt. Klicke oben auf „Neuen Coaching-Code erstellen“.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {coachCodes.map(code => (
                                        <div key={code.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-850/40 transition-colors">
                                            <div className="space-y-0.5">
                                                <span className="font-mono font-black text-sm text-gray-900 dark:text-white tracking-wider">
                                                    {code.code}
                                                </span>
                                                <p className="text-[11px] text-gray-500">
                                                    {code.description || 'Schüler-Coaching AG Mitgliedscode'} • {code.current_uses} Nutzungen
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                    code.is_active ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-gray-100 text-gray-600"
                                                )}>
                                                    {code.is_active ? "Aktiv" : "Inaktiv"}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-lg cursor-pointer"
                                                    onClick={() => handleCopy(code.id, code.code)}
                                                    title="Kopieren"
                                                >
                                                    {copiedId === code.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 3: LOGS */}
            {activeTab === 'logs' && (
                <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
                    <CardContent className="p-0">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                Protokollierte Coaching-Aktivitäten
                            </span>
                            <Button onClick={loadLogs} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                <RefreshCw size={14} className={cn(loadingLogs && "animate-spin")} />
                            </Button>
                        </div>

                        {loadingLogs ? (
                            <div className="py-12 text-center text-xs text-gray-400 font-bold uppercase">Lade Protokoll...</div>
                        ) : logs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs italic">
                                Bisher noch keine dokumentierten Änderungen im Coaching-System.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {logs.map(log => (
                                    <div key={log.id} className="p-4 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {log.action === 'coach_assign' ? 'Schüler-Coach ernannt' :
                                                 log.action === 'coach_revoke' ? 'Coach-Status entzogen' : log.action}
                                            </span>
                                            <span className="text-gray-400 text-[11px]">
                                                {new Date(log.created_at).toLocaleString('de-DE')}
                                            </span>
                                        </div>
                                        <p className="text-gray-500">
                                            Durchgeführt von: <span className="font-semibold">{log.admin_name || 'Leitung'}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 4: SV ACTIVITY MONITOR */}
            {activeTab === 'sv_activity' && (
                <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
                    <CardContent className="p-0">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                            <div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                                    SV-Aktivitäten-Monitor (Übersicht)
                                </span>
                                <span className="text-[11px] text-gray-400">
                                    Mitverfolgung allgemeiner Moderationsschritte der Schülervertretung
                                </span>
                            </div>
                            <Button onClick={loadSvActivity} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                <RefreshCw size={14} className={cn(loadingSvLogs && "animate-spin")} />
                            </Button>
                        </div>

                        {loadingSvLogs ? (
                            <div className="py-12 text-center text-xs text-gray-400 font-bold uppercase">Lade Aktivitäten...</div>
                        ) : svLogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs italic">
                                Keine aktuellen SV-Aktivitäten protokolliert.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {svLogs.map((log: any) => (
                                    <div key={log.id} className="p-4 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                Aktion: {log.action}
                                            </span>
                                            <span className="text-gray-400 text-[11px]">
                                                {new Date(log.created_at).toLocaleString('de-DE')}
                                            </span>
                                        </div>
                                        <p className="text-gray-500">
                                            SV-Administrator: <span className="font-semibold">{log.admin_name || 'SV'}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
