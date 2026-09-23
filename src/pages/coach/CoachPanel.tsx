import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import {
    Award,
    Search,
    Copy,
    Check,
    RefreshCw,
    Plus,
    History,
    GraduationCap,
    Users,
    Key,
    Megaphone,
    LayoutTemplate
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import CoachingPageBuilder from './CoachingPageBuilder';

export default function CoachPanel() {
    const { isCoachAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'students' | 'codes' | 'info' | 'logs' | 'seite'>('students');

    // Students state
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCoach, setFilterCoach] = useState<'all' | 'coaches' | 'non_coaches'>('all');

    // Codes state
    const [coachCodes, setCoachCodes] = useState<any[]>([]);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Info-Box State
    const [infoForm, setInfoForm] = useState({
        title: 'Kostenloses Coaching für Klasse 5 & 6!',
        description: 'Wöchentlich einmal bieten wir für alle Schülerinnen und Schüler der Jahrgangsstufen 5 und 6 die Möglichkeit, Hilfen zu einzelnen Fächern oder zur Lern- und Arbeitsorganisation allgemein durch Schülerinnen und Schüler der 8. Klassen zu erhalten. Diese werden jeweils vor den Herbstferien für ihre Aufgabe geschult und stellen dann bis zum Ende des Schuljahres ehrenamtlich ihre Hilfe zur Verfügung. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schüler haben.',
        time: 'Dienstags, 13:45 - 14:30 Uhr',
        room: 'Raum H310',
        is_visible: true
    });
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // Logs state
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // SV Activity state
    useEffect(() => {
        loadStudents();
    }, []);

    useEffect(() => {
        if (activeTab === 'codes') loadCodes();
        if (activeTab === 'info') loadInfo();
        if (activeTab === 'logs') loadLogs();
    }, [activeTab]);

    const loadStudents = async () => {
        setLoadingStudents(true);
        try {
            const res = await api.coach.listStudents();
            if (res.data) setStudents(res.data);
        } catch {
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
        } catch (e: any) {
            toast.error('Codes konnten nicht geladen werden: ' + (e.message || 'Fehler'));
        } finally {
            setLoadingCodes(false);
        }
    };

    const loadLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await api.coach.listLogs();
            if (res.data) setLogs(res.data);
        } catch (e: any) {
            toast.error('Protokoll konnte nicht geladen werden: ' + (e.message || 'Fehler'));
        } finally {
            setLoadingLogs(false);
        }
    };

    const loadInfo = async () => {
        setLoadingInfo(true);
        try {
            const res = await api.coach.getCoachInfo();
            if (res.data) {
                setInfoForm({
                    title: res.data.title || '',
                    description: res.data.description || '',
                    time: res.data.time || '',
                    room: res.data.room || '',
                    is_visible: res.data.is_visible !== false
                });
            }
            await loadPageTexts();
        } catch (e) {
            console.error('Error loading coach info:', e);
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerHaptic('medium');
        setSavingInfo(true);
        try {
            await api.coach.updateCoachInfo(infoForm);
            toast.success('Startseiten-Infos erfolgreich aktualisiert!');
        } catch (e: any) {
            toast.error('Speichern fehlgeschlagen: ' + (e.message || 'Fehler'));
        } finally {
            setSavingInfo(false);
        }
    };

    // Coaching-Seiten-Texte (/coaching) — alle Abschnitte editierbar
    const PAGE_SECTIONS = [
        { key: 'hero', label: 'Seitenkopf (Titel + Einleitung)' },
        { key: 's_badge', label: 'Was bedeutet das Coach-Abzeichen?' },
        { key: 's_school', label: 'Das Coaching an unserer Schule' },
        { key: 's_who', label: 'Wer kann Coach werden?' },
        { key: 's_boost', label: 'Warum stehen manche Anzeigen oben?' },
        { key: 's_fair', label: 'Gleiche Chancen für alle' },
        { key: 's_conduct', label: 'Verhalten als Coach' },
        { key: 's_revoke', label: 'Entzug des Status & Widerspruch' },
    ];
    const [pageForm, setPageForm] = useState<Record<string, string>>({});
    const [savingPage, setSavingPage] = useState(false);

    const loadPageTexts = async () => {
        try {
            const res = await api.coach.getCoachingPage();
            if (res.data && typeof res.data === 'object') setPageForm(res.data);
        } catch (e) {
            console.error('Error loading coaching page texts:', e);
        }
    };

    const handleSavePage = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerHaptic('medium');
        setSavingPage(true);
        try {
            await api.coach.updateCoachingPage(pageForm);
            toast.success('Coaching-Seiten-Texte erfolgreich aktualisiert!');
        } catch (e: any) {
            toast.error('Speichern fehlgeschlagen: ' + (e.message || 'Fehler'));
        } finally {
            setSavingPage(false);
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
                        activeTab === 'students' ? "bg-primary text-primary-foreground shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <Users size={16} />
                    <span>Schülerliste</span>
                </button>
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('codes'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        activeTab === 'codes' ? "bg-primary text-primary-foreground shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <Key size={16} />
                    <span>Coaching-Codes</span>
                </button>
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('info'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        activeTab === 'info' ? "bg-primary text-primary-foreground shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <Megaphone size={16} />
                    <span>Startseiten-Info</span>
                </button>
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('logs'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]",
                        activeTab === 'logs' ? "bg-primary text-primary-foreground shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <History size={16} />
                    <span>Mein Protokoll</span>
                </button>
                <button
                    onClick={() => { triggerHaptic('selection'); setActiveTab('seite'); }}
                    className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]",
                        activeTab === 'seite' ? "bg-primary text-primary-foreground shadow-xs font-extrabold" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <LayoutTemplate size={16} />
                    <span>Seite</span>
                </button>
            </div>

            {/* TAB 1: SCHÜLERLISTE */}
            {activeTab === 'students' && (
                <div className="space-y-4 min-h-[480px]">
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
                                                    : "bg-primary hover:bg-primary-hover text-primary-foreground font-extrabold shadow-xs"
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
                <div className="space-y-4 min-h-[480px]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-xs">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Neue Schüler-Coaching Codes vergeben</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Diese Codes schalten den offiziellen Schüler-Coach-Haken und eine 30-tägige
                                Hervorhebung („Hervorgehobene Anzeige“) frei. <strong>Fairness:</strong> Codes nur
                                nach Schulung und nur an AG-Mitglieder vergeben – jede Vergabe und Einlösung wird
                                protokolliert. Die öffentlichen Regeln stehen auf der Coaching-Seite.
                            </p>
                        </div>
                        <Button
                            onClick={handleGenerateCoachCode}
                            disabled={generatingCode}
                            className="bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-full gap-2 shadow-xs cursor-pointer"
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
                                        <div key={code.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
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

            {/* TAB 3: STARTSEITEN-INFOS */}
            {activeTab === 'info' && (
                <div className="min-h-[480px]">
                <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                Startseiten-Infobox bearbeiten
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Hier kannst du die Termine, Räume und Infos anpassen, die allen Schülern auf der Startseite angezeigt werden.
                            </p>
                        </div>

                        {loadingInfo ? (
                            <div className="py-12 text-center text-gray-400 font-bold text-xs uppercase tracking-wider">
                                Lade aktuelle Infos...
                            </div>
                        ) : (
                            <form onSubmit={handleSaveInfo} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Titel der Info-Box</label>
                                    <Input
                                        value={infoForm.title}
                                        onChange={e => setInfoForm({ ...infoForm, title: e.target.value })}
                                        placeholder="z.B. Kostenloses Coaching für Klasse 5 & 6!"
                                        required
                                        className="rounded-xl font-bold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Beschreibungstext</label>
                                    <textarea
                                        value={infoForm.description}
                                        onChange={e => setInfoForm({ ...infoForm, description: e.target.value })}
                                        placeholder="Erkläre das Angebot, Zielgruppe und Ablauf..."
                                        rows={4}
                                        required
                                        className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-gray-500 ml-1">Uhrzeit & Wochentag</label>
                                        <Input
                                            value={infoForm.time}
                                            onChange={e => setInfoForm({ ...infoForm, time: e.target.value })}
                                            placeholder="z.B. Dienstags, 13:45 - 14:30 Uhr"
                                            required
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-gray-500 ml-1">Raum / Treffpunkt</label>
                                        <Input
                                            value={infoForm.room}
                                            onChange={e => setInfoForm({ ...infoForm, room: e.target.value })}
                                            placeholder="z.B. Raum H310"
                                            required
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <input
                                        type="checkbox"
                                        id="is_visible"
                                        checked={infoForm.is_visible}
                                        onChange={e => setInfoForm({ ...infoForm, is_visible: e.target.checked })}
                                        className="w-4 h-4 rounded accent-primary focus:ring-[hsl(var(--ring))] cursor-pointer"
                                    />
                                    <label htmlFor="is_visible" className="text-xs font-bold cursor-pointer text-gray-800 dark:text-gray-200">
                                        Infobox auf der Startseite einblenden (öffentlich aktiv)
                                    </label>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={savingInfo}
                                        className="bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-full px-6 shadow-md cursor-pointer"
                                    >
                                        {savingInfo ? 'Speichern...' : 'Änderungen speichern'}
                                    </Button>
                                </div>
                            </form>
                        )}

                        <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                Texte der Coaching-Seite bearbeiten
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Jeder Abschnitt der öffentlichen <span className="font-bold">/coaching-Seite</span> lässt sich hier anpassen.
                                Leerzeile = neuer Absatz, Zeilen mit • werden zu Aufzählungen. Die Adresse fwg-koeln.de wird automatisch verlinkt.
                            </p>
                        </div>

                        <form onSubmit={handleSavePage} className="space-y-4">
                            {PAGE_SECTIONS.map(sec => {
                                const bodyKey = sec.key === 'hero' ? 'hero_subtitle' : `${sec.key}_body`;
                                return (
                                <div key={sec.key} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 space-y-2.5">
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white">{sec.label}</h4>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase text-gray-500 ml-1">Überschrift</label>
                                        <Input
                                            value={pageForm[`${sec.key}_title`] ?? ''}
                                            onChange={e => setPageForm({ ...pageForm, [`${sec.key}_title`]: e.target.value })}
                                            className="rounded-xl font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase text-gray-500 ml-1">Text</label>
                                        <textarea
                                            value={pageForm[bodyKey] ?? ''}
                                            onChange={e => setPageForm({ ...pageForm, [bodyKey]: e.target.value })}
                                            rows={5}
                                            className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                );
                            })}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Kontaktzeile (unten auf der Seite)</label>
                                <Input
                                    value={pageForm.contact_text ?? ''}
                                    onChange={e => setPageForm({ ...pageForm, contact_text: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={savingPage}
                                    className="bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-full px-6 shadow-md cursor-pointer"
                                >
                                    {savingPage ? 'Speichern...' : 'Seiten-Texte speichern'}
                                </Button>
                            </div>
                        </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 4: LOGS */}
            {activeTab === 'logs' && (
                <div className="min-h-[480px]">
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
                </div>
            )}

            {/* TAB 5: SEITE (Builder mit Live-Preview) */}
            {activeTab === 'seite' && (
                <div className="min-h-[480px]">
                    <CoachingPageBuilder />
                </div>
            )}
        </div>
    );
}
