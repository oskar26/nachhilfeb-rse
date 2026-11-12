import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
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
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import CoachingPageBuilder from './CoachingPageBuilder';

export default function CoachPanel() {
    const { isCoachAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'students' | 'codes' | 'info' | 'logs' | 'seite'>('students');
    const rootRef = useRef<HTMLDivElement>(null);

    // Students state
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [studentsError, setStudentsError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCoach, setFilterCoach] = useState<'all' | 'coaches' | 'non_coaches'>('all');

    // Codes state
    const [coachCodes, setCoachCodes] = useState<any[]>([]);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [codesError, setCodesError] = useState<string | null>(null);
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
    const [infoError, setInfoError] = useState<string | null>(null);
    const [savingInfo, setSavingInfo] = useState(false);
    const [infoSaveError, setInfoSaveError] = useState<string | null>(null);

    // Logs state
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);

    // SV Activity state
    useEffect(() => {
        loadStudents();
    }, []);

    useEffect(() => {
        rootRef.current?.scrollIntoView({ block: 'start' });
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'codes') loadCodes();
        if (activeTab === 'info') loadInfo();
        if (activeTab === 'logs') loadLogs();
    }, [activeTab]);

    const loadStudents = async () => {
        setLoadingStudents(true);
        setStudentsError(null);
        try {
            const res = await api.coach.listStudents();
            if (res.data) setStudents(res.data);
        } catch {
            setStudentsError('Schülerliste konnte nicht geladen werden.');
            toast.error('Schülerliste konnte nicht geladen werden.');
        } finally {
            setLoadingStudents(false);
        }
    };

    const loadCodes = async () => {
        setLoadingCodes(true);
        setCodesError(null);
        try {
            const res = await api.promo_codes.list();
            const list = (res.data || []).filter((c: any) => c.effect_type === 'coach_verification' || c.target_group === 'coach');
            setCoachCodes(list);
        } catch (e: any) {
            setCodesError('Codes konnten nicht geladen werden: ' + (e.message || 'Fehler'));
            toast.error('Codes konnten nicht geladen werden: ' + (e.message || 'Fehler'));
        } finally {
            setLoadingCodes(false);
        }
    };

    const loadLogs = async () => {
        setLoadingLogs(true);
        setLogsError(null);
        try {
            const res = await api.coach.listLogs();
            if (res.data) setLogs(res.data);
        } catch (e: any) {
            setLogsError('Protokoll konnte nicht geladen werden: ' + (e.message || 'Fehler'));
            toast.error('Protokoll konnte nicht geladen werden: ' + (e.message || 'Fehler'));
        } finally {
            setLoadingLogs(false);
        }
    };

    const loadInfo = async () => {
        setLoadingInfo(true);
        setInfoError(null);
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
        } catch (e) {
            console.error('Error loading coach info:', e);
            setInfoError('Startseiten-Infos konnten nicht geladen werden.');
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerHaptic('medium');
        setSavingInfo(true);
        setInfoSaveError(null);
        try {
            const response = await api.coach.updateCoachInfo(infoForm);
            if (response.error) throw new Error(response.error.message || 'Fehler');
            toast.success('Startseiten-Infos erfolgreich aktualisiert!');
        } catch (e: any) {
            setInfoSaveError('Speichern fehlgeschlagen: ' + (e.message || 'Fehler'));
            toast.error('Speichern fehlgeschlagen: ' + (e.message || 'Fehler'));
        } finally {
            setSavingInfo(false);
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
            <Card className="mx-auto mt-8 max-w-xl p-8 text-center">
                <p className="text-sm font-medium text-destructive">
                    Zugriff verweigert. Dieser Bereich ist der Leitung der Schüler-Coaching AG vorbehalten.
                </p>
            </Card>
        );
    }

    return (
        <div ref={rootRef} className={cn('mx-auto w-full scroll-mt-16 space-y-6 p-4 pb-28 sm:p-6', activeTab === 'seite' ? 'max-w-[1800px]' : 'max-w-4xl')}>
            {/* Header Banner */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted p-4 lg:flex-row lg:items-center lg:justify-between sm:p-6">
                <div className="min-w-0 space-y-1">
                    <div className="flex items-start gap-2">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                            <Award size={20} aria-hidden />
                        </span>
                        <h1 className="min-w-0 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Coaching & Förderunterricht</h1>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground sm:pl-12">
                        Betreuung & Verwaltung durch <span className="font-semibold text-foreground">Frau Balistreri</span> • Coaching AG und Förderunterricht am FWG
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:pl-0">
                    <span className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {students.filter(s => s.is_coach).length} aktive Coaches
                    </span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={(value) => {
                    triggerHaptic('selection');
                    setActiveTab(value as typeof activeTab);
                }}
            >
                <TabsList
                    aria-label="Coach-Bereich"
                    className="!h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0"
                >
                    <TabsTrigger value="students" className="min-h-11 flex-none whitespace-normal rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground data-active:border-foreground data-active:bg-muted data-active:text-foreground">
                        <Users size={16} aria-hidden /> Schülerliste
                    </TabsTrigger>
                    <TabsTrigger value="codes" className="min-h-11 flex-none whitespace-normal rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground data-active:border-foreground data-active:bg-muted data-active:text-foreground">
                        <Key size={16} aria-hidden /> Coaching-Codes
                    </TabsTrigger>
                    <TabsTrigger value="info" className="min-h-11 flex-none whitespace-normal rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground data-active:border-foreground data-active:bg-muted data-active:text-foreground">
                        <Megaphone size={16} aria-hidden /> Startseiten-Info
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="min-h-11 flex-none whitespace-normal rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground data-active:border-foreground data-active:bg-muted data-active:text-foreground">
                        <History size={16} aria-hidden /> Mein Protokoll
                    </TabsTrigger>
                    <TabsTrigger value="seite" className="min-h-11 flex-none whitespace-normal rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground data-active:border-foreground data-active:bg-muted data-active:text-foreground">
                        <LayoutTemplate size={16} aria-hidden /> Seite
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* TAB 1: SCHÜLERLISTE */}
            {activeTab === 'students' && (
                <div className="min-h-[480px] space-y-4">
                    <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full sm:w-80">
                            <Search size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
                            <Input
                                placeholder="Schüler suchen (Name, Klasse)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-11 pl-11"
                                aria-label="Schüler durchsuchen"
                            />
                        </div>

                        <div className="flex w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-muted p-1 sm:w-auto">
                            <Button variant="unstyled" size="unstyled" type="button"
                                onClick={() => setFilterCoach('all')}
                                aria-pressed={filterCoach === 'all'}
                                className={cn('min-h-11 whitespace-normal rounded-lg px-3 text-xs font-medium transition-colors', filterCoach === 'all' ? 'bg-card text-foreground ' : 'text-muted-foreground hover:text-foreground')}
                            >
                                Alle ({students.length})
                            </Button>
                            <Button variant="unstyled" size="unstyled" type="button"
                                onClick={() => setFilterCoach('coaches')}
                                aria-pressed={filterCoach === 'coaches'}
                                className={cn('min-h-11 whitespace-normal rounded-lg px-3 text-xs font-medium transition-colors', filterCoach === 'coaches' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground')}
                            >
                                Coaches ({students.filter(s => s.is_coach).length})
                            </Button>
                            <Button variant="unstyled" size="unstyled" type="button"
                                onClick={() => setFilterCoach('non_coaches')}
                                aria-pressed={filterCoach === 'non_coaches'}
                                className={cn('min-h-11 whitespace-normal rounded-lg px-3 text-xs font-medium transition-colors', filterCoach === 'non_coaches' ? 'bg-card text-foreground ' : 'text-muted-foreground hover:text-foreground')}
                            >
                                Noch keine Coaches
                            </Button>
                        </div>
                    </div>

                    {studentsError && (
                        <Alert variant="destructive">
                            <AlertTitle>Schülerliste nicht verfügbar</AlertTitle>
                            <AlertDescription className="flex flex-col items-start gap-3">
                                <span>{studentsError}</span>
                                <Button type="button" variant="outline" className="h-11" onClick={loadStudents}>
                                    Erneut laden
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {studentsError ? null : loadingStudents ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                            <Spinner className="size-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Schülerliste wird geladen...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <Card className="border-border p-12 text-center text-sm text-muted-foreground">
                            Keine Schüler passend zu deinen Suchkriterien gefunden.
                        </Card>
                    ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {filteredStudents.map(student => (
                                <Card key={student.id} className=" transition-colors hover:border-foreground/30">
                                    <CardContent className="flex flex-col gap-3 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="grid size-11 shrink-0 place-items-center rounded-xl border bg-muted font-semibold text-muted-foreground">
                                                {student.display_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="break-words text-sm font-semibold text-foreground">
                                                        {student.display_name || `${student.first_name} ${student.last_name}`}
                                                    </span>
                                                    {student.is_coach && (
                                                        <span title="Schüler-Coach">
                                                            <Award size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground">
                                                    <GraduationCap size={16} aria-hidden />
                                                    {student.grade_level ? `Klasse ${student.grade_level}${student.class_letter || ''}` : 'Keine Klasse'}
                                                    {student.active_ads_count > 0 && (
                                                        <span className="ml-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium">
                                                            {student.active_ads_count} {student.active_ads_count === 1 ? 'Anzeige' : 'Anzeigen'}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant={student.is_coach ? 'outline' : 'primary'}
                                            onClick={() => handleToggleCoach(student)}
                                            className={cn(
                                                'h-11 w-full text-xs',
                                                student.is_coach && 'text-destructive hover:bg-destructive/10'
                                            )}
                                        >
                                            {student.is_coach ? 'Coach entziehen' : 'Zum Coach machen'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: COACHING CODES */}
            {activeTab === 'codes' && (
                <div className="min-h-[480px] space-y-4">
                    <Card className="">
                        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between sm:p-5">
                            <div className="min-w-0">
                                <h3 className="text-base font-semibold text-foreground">Neue Schüler-Coaching Codes vergeben</h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Diese Codes schalten den offiziellen Schüler-Coach-Haken und eine 30-tägige
                                    Hervorhebung („Hervorgehobene Anzeige“) frei. <strong className="font-semibold text-foreground">Fairness:</strong> Codes nur
                                    nach Schulung und nur an AG-Mitglieder vergeben – jede Vergabe und Einlösung wird
                                    protokolliert. Die öffentlichen Regeln stehen auf der Coaching-Seite.
                                </p>
                            </div>
                            <Button
                                onClick={handleGenerateCoachCode}
                                disabled={generatingCode}
                                className="h-11 shrink-0 gap-2 text-xs"
                            >
                                <Plus size={16} aria-hidden /> Neuen Coaching-Code erstellen
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                                <span className="text-xs font-medium text-foreground">
                                    Verfügbare Schüler-Coaching Codes ({coachCodes.length})
                                </span>
                                <Button onClick={loadCodes} variant="ghost" size="icon" className="h-11 w-11" aria-label="Coaching-Codes aktualisieren">
                                    <RefreshCw size={16} className={cn(loadingCodes && 'animate-spin')} aria-hidden />
                                </Button>
                            </div>

                            {codesError && (
                                <div className="p-4">
                                    <Alert variant="destructive">
                                        <AlertTitle>Codes nicht verfügbar</AlertTitle>
                                        <AlertDescription className="flex flex-col items-start gap-3">
                                            <span>{codesError}</span>
                                            <Button type="button" variant="outline" className="h-11" onClick={loadCodes}>
                                                Erneut laden
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {codesError ? null : loadingCodes ? (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                                    <Spinner className="size-4" /> Lade Codes...
                                </div>
                            ) : coachCodes.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    Noch keine spezifischen Coaching-Codes erstellt. Klicke oben auf „Neuen Coaching-Code erstellen“.
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {coachCodes.map(code => (
                                        <div key={code.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                            <div className="min-w-0 space-y-0.5">
                                                <span className="break-all tabular-nums text-sm font-semibold tracking-wider text-foreground">
                                                    {code.code}
                                                </span>
                                                <p className="break-words text-xs text-muted-foreground">
                                                    {code.description || 'Schüler-Coaching AG Mitgliedscode'} • {code.current_uses} Nutzungen
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    'rounded-lg px-2.5 py-1 text-xs font-medium',
                                                    code.is_active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                                                )}>
                                                    {code.is_active ? 'Aktiv' : 'Inaktiv'}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-11 w-11"
                                                    onClick={() => handleCopy(code.id, code.code)}
                                                    title="Kopieren"
                                                    aria-label="Coaching-Code kopieren"
                                                >
                                                    {copiedId === code.id ? <Check size={16} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={16} />}
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
                    <Card className="">
                        <CardContent className="space-y-6 p-4 sm:p-6">
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Startseiten-Infobox bearbeiten
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Hier kannst du die Termine, Räume und Infos anpassen, die allen Schülern auf der Startseite angezeigt werden.
                                </p>
                            </div>

                            {infoError && (
                                <Alert variant="destructive">
                                    <AlertTitle>Infobox nicht verfügbar</AlertTitle>
                                    <AlertDescription className="flex flex-col items-start gap-3">
                                        <span>{infoError}</span>
                                        <Button type="button" variant="outline" className="h-11" onClick={loadInfo}>
                                            Erneut laden
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {infoError ? null : loadingInfo ? (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                                    <Spinner className="size-4" /> Lade aktuelle Infos...
                                </div>
                            ) : (
                                <form onSubmit={handleSaveInfo} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="coach-info-title" className="text-sm font-medium">Titel der Info-Box</Label>
                                        <Input
                                            id="coach-info-title"
                                            value={infoForm.title}
                                            onChange={e => setInfoForm({ ...infoForm, title: e.target.value })}
                                            placeholder="z.B. Kostenloses Coaching für Klasse 5 & 6!"
                                            required
                                            className="font-semibold"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="coach-info-description" className="text-sm font-medium">Beschreibungstext</Label>
                                        <Textarea
                                            id="coach-info-description"
                                            value={infoForm.description}
                                            onChange={e => setInfoForm({ ...infoForm, description: e.target.value })}
                                            placeholder="Erkläre das Angebot, Zielgruppe und Ablauf..."
                                            rows={4}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="coach-info-time" className="text-sm font-medium">Uhrzeit & Wochentag</Label>
                                            <Input
                                                id="coach-info-time"
                                                value={infoForm.time}
                                                onChange={e => setInfoForm({ ...infoForm, time: e.target.value })}
                                                placeholder="z.B. Dienstags, 13:45 - 14:30 Uhr"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="coach-info-room" className="text-sm font-medium">Raum / Treffpunkt</Label>
                                            <Input
                                                id="coach-info-room"
                                                value={infoForm.room}
                                                onChange={e => setInfoForm({ ...infoForm, room: e.target.value })}
                                                placeholder="z.B. Raum H310"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
                                        <Checkbox
                                            id="is_visible"
                                            checked={infoForm.is_visible}
                                            onCheckedChange={checked => setInfoForm({ ...infoForm, is_visible: checked === true })}
                                            className="mt-0.5"
                                        />
                                        <Label htmlFor="is_visible" className="cursor-pointer text-sm font-medium text-foreground">
                                            Infobox auf der Startseite einblenden (öffentlich aktiv)
                                        </Label>
                                    </div>

                                    {infoSaveError && (
                                        <Alert variant="destructive">
                                            <AlertTitle>Speichern fehlgeschlagen</AlertTitle>
                                            <AlertDescription>{infoSaveError}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            type="submit"
                                            disabled={savingInfo}
                                            className="h-11 px-6"
                                        >
                                            {savingInfo ? 'Speichern...' : 'Änderungen speichern'}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 4: LOGS */}
            {activeTab === 'logs' && (
                <div className="min-h-[480px]">
                    <Card className="">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                                <span className="text-xs font-medium text-foreground">
                                    Protokollierte Coaching-Aktivitäten
                                </span>
                                <Button onClick={loadLogs} variant="ghost" size="icon" className="h-11 w-11" aria-label="Protokoll aktualisieren">
                                    <RefreshCw size={16} className={cn(loadingLogs && 'animate-spin')} aria-hidden />
                                </Button>
                            </div>

                            {logsError && (
                                <div className="p-4">
                                    <Alert variant="destructive">
                                        <AlertTitle>Protokoll nicht verfügbar</AlertTitle>
                                        <AlertDescription className="flex flex-col items-start gap-3">
                                            <span>{logsError}</span>
                                            <Button type="button" variant="outline" className="h-11" onClick={loadLogs}>
                                                Erneut laden
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {logsError ? null : loadingLogs ? (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                                    <Spinner className="size-4" /> Lade Protokoll...
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    Bisher noch keine dokumentierten Änderungen im Coaching-System.
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {logs.map(log => (
                                        <div key={log.id} className="space-y-1 p-4 text-xs">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="break-words font-semibold text-foreground">
                                                    {log.action === 'coach_assign' ? 'Schüler-Coach ernannt' :
                                                     log.action === 'coach_revoke' ? 'Coach-Status entzogen' : log.action}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(log.created_at).toLocaleString('de-DE')}
                                                </span>
                                            </div>
                                            <p className="break-words text-muted-foreground">
                                                Durchgeführt von: <span className="font-medium text-foreground">{log.admin_name || 'Leitung'}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className={cn('min-h-[480px]', activeTab !== 'seite' && 'hidden')}>
                <CoachingPageBuilder />
            </div>
        </div>
    );
}
