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
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
    Award,
    Search,
    Copy,
    Check,
    RefreshCw,
    Plus,
    History,
    Users,
    Key,
    Megaphone,
    LayoutTemplate,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import CoachingPageBuilder from './CoachingPageBuilder';

const DEFAULT_CODE_DESCRIPTION = 'Vergeben durch Schüler-Coaching Leitung (Frau Balistreri)';
const CODE_PREFIX_MAX_LENGTH = 16;
const CODE_SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROLE_LABELS: Record<string, string> = {
    sv_admin: 'SV-Admin',
    coach_admin: 'Coach-Leitung',
    parent: 'Elternteil',
};

function studentDisplayName(student: any): string {
    return student.display_name
        || [student.first_name, student.last_name].filter(Boolean).join(' ')
        || 'Unbekannt';
}

function studentInitials(student: any): string {
    const parts = studentDisplayName(student).split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map(part => part.charAt(0)).join('');
    return (initials || '?').toUpperCase();
}

function studentFunction(student: any): string {
    return ROLE_LABELS[student.role] ?? (student.is_coach ? 'Coach' : 'Schüler/in');
}

function normalizeCodePrefix(value: string): string {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, CODE_PREFIX_MAX_LENGTH);
}

function randomCodeSuffix(length: number): string {
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
        throw new Error('Der sichere Zufallsgenerator des Browsers ist nicht verfügbar.');
    }
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, value => CODE_SUFFIX_ALPHABET[value % CODE_SUFFIX_ALPHABET.length]).join('');
}

function createCoachCode(prefix: string, existingCodes: Set<string>): string {
    const cleanPrefix = normalizeCodePrefix(prefix) || 'COACH';
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = `${cleanPrefix}-${randomCodeSuffix(5)}`;
        if (!existingCodes.has(code.toUpperCase())) return code;
    }
    throw new Error('Es konnte kein freier Code erzeugt werden. Bitte erneut versuchen.');
}

function isDuplicateCodeError(error: any): boolean {
    const text = [
        error?.message,
        error?.rawText,
        error?.details?.message,
        typeof error?.details === 'string' ? error.details : '',
    ].filter(Boolean).join(' ');
    return error?.status === 409 || /duplicate|eindeutig|existiert|already exists|unique/i.test(text);
}

function formatCodeDate(value?: string | null): string | null {
    if (!value) return null;
    // MySQL DATETIME liefert "YYYY-MM-DD HH:MM:SS"; Safari scheitert daran.
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function StudentAvatar({ student, className }: { student: any; className?: string }) {
    const avatarUrl = typeof student.avatar_url === 'string' ? student.avatar_url.trim() : '';
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [avatarUrl]);

    return (
        <div className={cn('grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-sm font-semibold text-foreground', className)}>
            {avatarUrl && !failed ? (
                <img
                    src={avatarUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                <span aria-hidden>{studentInitials(student)}</span>
            )}
        </div>
    );
}

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
    const [creatingCode, setCreatingCode] = useState(false);
    const [codeCreateError, setCodeCreateError] = useState<string | null>(null);
    const [createdCode, setCreatedCode] = useState<{ id: string; code: string; expiresAt: string | null; maxUses: number | null } | null>(null);
    const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<any | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [codeForm, setCodeForm] = useState({
        prefix: 'COACH',
        maxUses: '1',
        expiryDays: '180',
        description: DEFAULT_CODE_DESCRIPTION,
    });

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
            if (res.error) throw new Error(res.error.message || 'Fehler beim Laden');
            if (res.data) setStudents(res.data);
        } catch (e: any) {
            const message = e?.message && e.message !== 'Fehler beim Laden'
                ? `Schülerliste konnte nicht geladen werden: ${e.message}`
                : 'Schülerliste konnte nicht geladen werden.';
            setStudentsError(message);
            toast.error(message);
        } finally {
            setLoadingStudents(false);
        }
    };

    const loadCodes = async () => {
        setLoadingCodes(true);
        setCodesError(null);
        try {
            const res = await api.promo_codes.list();
            if (res.error) throw new Error(res.error.message || 'Fehler beim Laden');
            const list = (res.data || []).filter((c: any) => c.effect_type === 'coach_verification' || c.target_group === 'coach');
            setCoachCodes(list);
        } catch (e: any) {
            const detail = e?.message && e.message !== 'Fehler beim Laden' ? `: ${e.message}` : '.';
            setCodesError(`Codes konnten nicht geladen werden${detail}`);
            toast.error(`Codes konnten nicht geladen werden${detail}`);
        } finally {
            setLoadingCodes(false);
        }
    };

    const loadLogs = async () => {
        setLoadingLogs(true);
        setLogsError(null);
        try {
            const res = await api.coach.listLogs();
            if (res.error) throw new Error(res.error.message || 'Fehler beim Laden');
            if (res.data) setLogs(res.data);
        } catch (e: any) {
            const detail = e?.message && e.message !== 'Fehler beim Laden' ? `: ${e.message}` : '.';
            setLogsError(`Protokoll konnte nicht geladen werden${detail}`);
            toast.error(`Protokoll konnte nicht geladen werden${detail}`);
        } finally {
            setLoadingLogs(false);
        }
    };

    const loadInfo = async () => {
        setLoadingInfo(true);
        setInfoError(null);
        try {
            const res = await api.coach.getCoachInfo();
            if (res.error) throw new Error(res.error.message || 'Fehler beim Laden');
            if (res.data) {
                setInfoForm({
                    title: res.data.title || '',
                    description: res.data.description || '',
                    time: res.data.time || '',
                    room: res.data.room || '',
                    is_visible: res.data.is_visible !== false
                });
            }
        } catch (e: any) {
            console.error('Error loading coach info:', e);
            const detail = e?.message && e.message !== 'Fehler beim Laden' ? `: ${e.message}` : '.';
            setInfoError(`Startseiten-Infos konnten nicht geladen werden${detail}`);
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
        const name = studentDisplayName(student);
        try {
            const response = await api.coach.setCoachStatus(student.id, nextStatus);
            if (response.error) throw new Error(response.error.message || 'Fehler');
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_coach: nextStatus } : s));
            toast.success(nextStatus ? `${name} ist jetzt Schüler-Coach!` : `Coach-Status für ${name} entfernt.`);
        } catch (e: any) {
            toast.error('Änderung fehlgeschlagen: ' + (e?.message || 'Unbekannter Fehler'));
        }
    };

    const handleCreateCoachCode = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (creatingCode) return;
        triggerHaptic('medium');
        setCodeCreateError(null);
        setCreatedCode(null);

        const prefix = normalizeCodePrefix(codeForm.prefix);
        if (!prefix) {
            setCodeCreateError('Bitte gib ein Präfix mit mindestens einem Buchstaben oder einer Zahl an.');
            return;
        }

        const maxUsesInput = codeForm.maxUses.trim();
        const maxUses = maxUsesInput ? Number(maxUsesInput) : null;
        if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
            setCodeCreateError('Nutzungen müssen eine ganze Zahl ab 1 sein – oder leer für unbegrenzt.');
            return;
        }

        const expiryInput = codeForm.expiryDays.trim();
        const expiryDays = expiryInput ? Number(expiryInput) : null;
        if (expiryDays !== null && (!Number.isInteger(expiryDays) || expiryDays < 1)) {
            setCodeCreateError('Die Gültigkeit muss eine ganze Zahl ab 1 Tag sein – oder leer für unbegrenzt.');
            return;
        }

        const expiresAt = expiryDays === null
            ? null
            : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
        const description = codeForm.description.trim();

        setCreatingCode(true);
        try {
            const existingCodes = new Set(coachCodes.map(item => String(item.code || '').toUpperCase()));
            let lastError: any = null;
            let retriedAfterServerError = false;

            for (let attempt = 0; attempt < 4; attempt += 1) {
                const code = createCoachCode(prefix, existingCodes);
                const response = await api.promo_codes.create({
                    code,
                    effect_type: 'coach_verification',
                    // Bestehende Coach-Code-Semantik: Coach-Haken plus 30 Tage Hervorhebung.
                    push_level: 'super',
                    boost_days: 30,
                    max_uses: maxUses,
                    target_group: 'coach',
                    description: description || undefined,
                    ...(expiryDays !== null ? { expiry_days: expiryDays } : {}),
                });

                if (!response.error) {
                    const created = {
                        id: String(response.data?.id || `local-${Date.now()}`),
                        code,
                        effect_type: 'coach_verification',
                        push_level: 'super',
                        boost_days: 30,
                        max_uses: maxUses,
                        current_uses: 0,
                        used_count: 0,
                        is_active: true,
                        target_group: 'coach',
                        description: description || DEFAULT_CODE_DESCRIPTION,
                        created_at: new Date().toISOString(),
                        expires_at: expiresAt,
                    };
                    setCoachCodes(previous => [created, ...previous.filter(item => item.code !== code)]);
                    setCreatedCode({ id: created.id, code, expiresAt, maxUses });
                    setCopiedId(null);
                    toast.success(`Coaching-Code „${code}“ erfolgreich erstellt!`);
                    return;
                }

                lastError = response.error;
                existingCodes.add(code.toUpperCase());

                // Das PHP-Backend fängt die Unique-Verletzung nicht ab und liefert
                // dafür HTTP 500 statt 409. Ein 500er wird deshalb genau einmal
                // mit einem frisch erzeugten Code wiederholt; ein zweiter Fehler
                // wird unverändert an die Oberfläche durchgereicht.
                if (retriedAfterServerError) break;
                if (response.error.status === 500) {
                    retriedAfterServerError = true;
                    continue;
                }
                if (!isDuplicateCodeError(response.error)) break;
            }

            throw new Error(lastError?.message || 'Code konnte nicht erstellt werden.');
        } catch (e: any) {
            const message = e?.message || 'Unbekannter Fehler';
            setCodeCreateError('Erstellung fehlgeschlagen: ' + message);
            toast.error('Erstellung fehlgeschlagen: ' + message);
        } finally {
            setCreatingCode(false);
        }
    };

    const handleDeleteCode = async () => {
        if (!pendingDelete || deletingCodeId) return;
        setDeletingCodeId(pendingDelete.id);
        try {
            const response = await api.promo_codes.delete(pendingDelete.id);
            if (response.error) throw new Error(response.error.message || 'Fehler');
            setCoachCodes(previous => previous.filter(item => item.id !== pendingDelete.id));
            if (createdCode?.id === pendingDelete.id) setCreatedCode(null);
            toast.success(`Coaching-Code „${pendingDelete.code}“ gelöscht.`);
            setPendingDelete(null);
        } catch (e: any) {
            toast.error('Löschen fehlgeschlagen: ' + (e?.message || 'Unbekannter Fehler'));
        } finally {
            setDeletingCodeId(null);
        }
    };

    const handleCopy = async (id: string, text: string) => {
        triggerHaptic('light');
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast.success('Code kopiert!');
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error('Kopieren nicht möglich. Bitte markiere den Code und kopiere ihn manuell.');
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesQuery = (
            (s.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.grade_level || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            studentFunction(s).toLowerCase().includes(searchQuery.toLowerCase())
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
                                placeholder="Schüler suchen (Name, Klasse, Funktion)"
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
                        <>
                            {/* Desktop: kompakte Tabelle */}
                            <Card className="hidden md:block">
                                <CardContent padding="flush">
                                    <Table className="text-[13px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="h-11 pl-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Schüler</TableHead>
                                                <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Klasse</TableHead>
                                                <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Funktion</TableHead>
                                                <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Anzeigen</TableHead>
                                                <TableHead className="h-11 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Aktion</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.map(student => {
                                                const activeAds = Number(student.active_ads_count) || 0;
                                                return (
                                                    <TableRow key={student.id}>
                                                        <TableCell className="max-w-[22rem] py-3 pl-4 whitespace-normal">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <StudentAvatar student={student} />
                                                                <div className="min-w-0">
                                                                    <div className="break-words text-[13px] font-semibold text-foreground">{studentDisplayName(student)}</div>
                                                                    {student.is_verified ? <span className="mt-0.5 block text-[13px] leading-4 font-medium text-muted-foreground">Verifiziert</span> : null}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3 text-[13px] text-muted-foreground">
                                                            {student.grade_level ? `Klasse ${student.grade_level}${student.class_letter || ''}` : '–'}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Badge variant={student.is_coach ? 'success' : 'outline'} className="font-medium">
                                                                {studentFunction(student)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-3 text-right text-[13px] tabular-nums text-muted-foreground">
                                                            {activeAds}
                                                        </TableCell>
                                                        <TableCell className="py-3 pr-4 text-right">
                                                            <Button
                                                                size="sm"
                                                                variant={student.is_coach ? 'outline' : 'primary'}
                                                                onClick={() => handleToggleCoach(student)}
                                                                className={cn(
                                                                    'h-11 min-h-11 px-3 text-[13px]',
                                                                    student.is_coach && 'text-destructive hover:bg-destructive/10'
                                                                )}
                                                                aria-label={`${studentDisplayName(student)} ${student.is_coach ? 'Coach-Status entziehen' : 'zum Coach machen'}`}
                                                            >
                                                                {student.is_coach ? 'Coach entziehen' : 'Zum Coach machen'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Mobil: Zeilenkarten mit Avatar links und kompakter Aktion rechts */}
                            <div className="space-y-2 md:hidden">
                                {filteredStudents.map(student => {
                                    const activeAds = Number(student.active_ads_count) || 0;
                                    return (
                                        <Card key={student.id}>
                                            <CardContent className="flex items-center gap-3 p-3">
                                                <StudentAvatar student={student} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="break-words text-[13px] font-semibold leading-tight text-foreground">
                                                        {studentDisplayName(student)}
                                                    </div>
                                                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-tight text-muted-foreground">
                                                        <span>{student.grade_level ? `Klasse ${student.grade_level}${student.class_letter || ''}` : 'Keine Klasse'}</span>
                                                        <span aria-hidden>·</span>
                                                        <span>{studentFunction(student)}</span>
                                                    </p>
                                                    <p className="mt-1 flex items-center gap-1 text-[13px] leading-tight text-muted-foreground">
                                                        <Megaphone size={14} aria-hidden />
                                                        {activeAds} {activeAds === 1 ? 'Anzeige' : 'Anzeigen'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={student.is_coach ? 'outline' : 'primary'}
                                                    onClick={() => handleToggleCoach(student)}
                                                    className={cn(
                                                        'h-11 min-h-11 shrink-0 px-3 text-[13px]',
                                                        student.is_coach && 'text-destructive hover:bg-destructive/10'
                                                    )}
                                                    aria-label={`${studentDisplayName(student)} ${student.is_coach ? 'Coach-Status entziehen' : 'zum Coach machen'}`}
                                                >
                                                    {student.is_coach ? 'Coach entziehen' : 'Zum Coach machen'}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* TAB 2: COACHING CODES */}
            {activeTab === 'codes' && (
                <div className="min-h-[480px] space-y-4">
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                                    <Key size={18} aria-hidden />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-base font-semibold text-foreground">Neuen Coaching-Code erstellen</h3>
                                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                                        Codes schalten den offiziellen Schüler-Coach-Haken frei. Nur nach Schulung und nur an
                                        AG-Mitglieder vergeben – jede Vergabe und Einlösung wird protokolliert.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateCoachCode} className="mt-4 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="min-w-0 space-y-1.5">
                                        <Label htmlFor="coach-code-prefix" className="text-[13px] font-medium">Präfix</Label>
                                        <Input
                                            id="coach-code-prefix"
                                            value={codeForm.prefix}
                                            onChange={event => setCodeForm({ ...codeForm, prefix: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                                            placeholder="COACH"
                                            maxLength={CODE_PREFIX_MAX_LENGTH}
                                            autoComplete="off"
                                            spellCheck={false}
                                            className="uppercase tracking-wider"
                                            required
                                        />
                                        <p className="text-[13px] leading-5 text-muted-foreground">Der Code wird als Präfix plus zufälligem Suffix erzeugt, z. B. COACH-7K2M9.</p>
                                    </div>
                                    <div className="min-w-0 space-y-1.5">
                                        <Label htmlFor="coach-code-uses" className="text-[13px] font-medium">Nutzungen</Label>
                                        <Input
                                            id="coach-code-uses"
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            step={1}
                                            value={codeForm.maxUses}
                                            onChange={event => setCodeForm({ ...codeForm, maxUses: event.target.value })}
                                            placeholder="1"
                                        />
                                        <p className="text-[13px] leading-5 text-muted-foreground">Leer lassen für unbegrenzte Einlösungen.</p>
                                    </div>
                                    <div className="min-w-0 space-y-1.5">
                                        <Label htmlFor="coach-code-expiry" className="text-[13px] font-medium">Gültigkeit (Tage)</Label>
                                        <Input
                                            id="coach-code-expiry"
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            step={1}
                                            value={codeForm.expiryDays}
                                            onChange={event => setCodeForm({ ...codeForm, expiryDays: event.target.value })}
                                            placeholder="180"
                                        />
                                        <p className="text-[13px] leading-5 text-muted-foreground">Leer lassen für unbegrenzt gültige Codes.</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="coach-code-description" className="text-[13px] font-medium">Beschreibung (optional)</Label>
                                    <Input
                                        id="coach-code-description"
                                        value={codeForm.description}
                                        onChange={event => setCodeForm({ ...codeForm, description: event.target.value })}
                                        placeholder={DEFAULT_CODE_DESCRIPTION}
                                        maxLength={255}
                                    />
                                    <p className="text-[13px] leading-5 text-muted-foreground">Maximal 255 Zeichen. Die Beschreibung erscheint in der Code-Liste.</p>
                                </div>

                                <div className="rounded-lg border border-border bg-muted/40 p-3 text-[13px] leading-5 text-muted-foreground">
                                    <strong className="font-semibold text-foreground">Coach-Semantik:</strong> Coach-Codes vergeben wie bisher
                                    den Coach-Haken und heben Anzeigen für 30 Tage hervor. Push-Stufe „super“ und 30 Boost-Tage
                                    sind fest an die Coach-Verifizierung gekoppelt und deshalb nicht separat einstellbar.
                                </div>

                                {codeCreateError && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Code konnte nicht erstellt werden</AlertTitle>
                                        <AlertDescription>{codeCreateError}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-[13px] leading-5 text-muted-foreground">
                                        Der Code wird im Browser kryptografisch zufällig erzeugt. Bei einer Kollision oder einem einmaligen Serverfehler wird automatisch genau ein neuer Code versucht.
                                    </p>
                                    <Button type="submit" isLoading={creatingCode} className="h-11 min-h-11 shrink-0 px-5 text-[13px]">
                                        {creatingCode ? 'Code wird erstellt …' : <><Plus size={16} aria-hidden /> Coaching-Code erstellen</>}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {createdCode && (
                        <div role="status" className="flex flex-col gap-3 rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">Coaching-Code erstellt</p>
                                <p className="mt-1 break-all text-base font-semibold tracking-wider text-foreground">{createdCode.code}</p>
                                <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                                    {createdCode.maxUses === null ? 'Unbegrenzt einlösbar' : `${createdCode.maxUses} ${createdCode.maxUses === 1 ? 'Einlösung' : 'Einlösungen'}`}
                                    {' · '}
                                    {createdCode.expiresAt ? `gültig bis ${formatCodeDate(createdCode.expiresAt)}` : 'ohne Ablaufdatum'}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCopy('created', createdCode.code)}
                                className="h-11 min-h-11 shrink-0 px-4 text-[13px]"
                            >
                                {copiedId === 'created' ? <><Check size={16} aria-hidden /> Kopiert</> : <><Copy size={16} aria-hidden /> Code kopieren</>}
                            </Button>
                        </div>
                    )}

                    <Card>
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                                <span className="text-[13px] font-medium text-foreground">
                                    Schüler-Coaching-Codes ({coachCodes.length})
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
                                    Noch keine Coaching-Codes erstellt. Erstelle oben den ersten Code.
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {coachCodes.map(code => {
                                        const uses = Number(code.current_uses ?? code.used_count) || 0;
                                        const maxUses = code.max_uses === null || code.max_uses === undefined ? null : Number(code.max_uses);
                                        const expiry = formatCodeDate(code.expires_at);
                                        return (
                                            <div key={code.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="break-all text-[13px] font-semibold tracking-wider text-foreground">
                                                            {code.code}
                                                        </span>
                                                        <Badge variant={code.is_active ? 'success' : 'outline'} className="font-medium">
                                                            {code.is_active ? 'Aktiv' : 'Inaktiv'}
                                                        </Badge>
                                                    </div>
                                                    <p className="break-words text-[13px] leading-5 text-muted-foreground">
                                                        {code.description || 'Schüler-Coaching AG Mitgliedscode'}
                                                    </p>
                                                    <p className="text-[13px] leading-5 text-muted-foreground">
                                                        {maxUses === null ? `${uses} Nutzungen · unbegrenzt` : `${uses} / ${maxUses} Nutzungen`}
                                                        {' · '}
                                                        {expiry ? `gültig bis ${expiry}` : 'ohne Ablaufdatum'}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-11 w-11"
                                                        onClick={() => handleCopy(code.id, code.code)}
                                                        title="Kopieren"
                                                        aria-label={`Coaching-Code ${code.code} kopieren`}
                                                    >
                                                        {copiedId === code.id ? <Check size={16} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={16} />}
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-11 w-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => setPendingDelete(code)}
                                                        title="Löschen"
                                                        aria-label={`Coaching-Code ${code.code} löschen`}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <p className="border-t border-border p-4 text-[13px] leading-5 text-muted-foreground">
                                Hinweis: Die API bietet keinen Endpunkt zum nachträglichen Bearbeiten eines Coaching-Codes.
                                Für andere Nutzungen, Laufzeiten oder Beschreibungen lösche den Code und erstelle einen neuen.
                            </p>
                        </CardContent>
                    </Card>

                    <AlertDialog open={!!pendingDelete} onOpenChange={open => { if (!open) setPendingDelete(null); }}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Coaching-Code löschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    „{pendingDelete?.code}“ wird endgültig gelöscht. Bereits eingelöste Coach-Status bleiben bestehen.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={!!deletingCodeId}>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" onClick={handleDeleteCode} disabled={!!deletingCodeId}>
                                    {deletingCodeId ? 'Wird gelöscht …' : 'Löschen'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
