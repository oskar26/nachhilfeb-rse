import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
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
    Search,
    Edit,
    CheckCircle,
    ShieldCheck,
    Ban,
    LayoutGrid,
    List as ListIcon,
    Download,
    Users as UsersIcon,
    RefreshCw,
    UserMinus,
    Check,
    Trash2,
    MoreHorizontal,
    Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface Profile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string | null;
    grade_level: string | null;
    class_letter: string | null;
    role: 'student' | 'sv_admin' | 'coach_admin' | 'parent';
    is_verified: boolean;
    is_banned: boolean;
    avatar_url: string | null;
    created_at: string;
    bio: string | null;
}

interface ParentLink {
    id: string;
    parent_id: string;
    child_id: string;
    status: 'pending' | 'active' | 'revoked';
    parent_name?: string;
    child_name?: string;
}

const ROLE_LABELS: Record<Profile['role'], string> = {
    sv_admin: 'Admin',
    coach_admin: 'Coach',
    parent: 'Elternteil',
    student: 'Schüler',
};

function RoleBadge({ role }: { role: Profile['role'] }) {
    return (
        <Badge variant="outline" className="font-medium">
            {ROLE_LABELS[role]}
        </Badge>
    );
}

function StatusBadge({ user }: { user: Profile }) {
    if (user.is_banned) {
        return (
            <Badge variant="outline" className="gap-1.5 font-medium text-destructive">
                <span className="size-1.5 rounded-full bg-destructive" aria-hidden />
                Gesperrt
            </Badge>
        );
    }
    if (user.is_verified) {
        return (
            <Badge variant="outline" className="gap-1.5 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
                Verifiziert
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="gap-1.5 font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden />
            Basis
        </Badge>
    );
}

function SummaryTile({
    label,
    value,
    hint,
    emphasis,
    loading = false,
}: {
    label: string;
    value: number | null;
    hint: string;
    emphasis?: boolean;
    loading?: boolean;
}) {
    return (
        <div className="rounded-card border border-border bg-card p-3.5 shadow-soft">
            <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
            {loading ? (
                <Skeleton className="mt-1 h-7 w-12" aria-hidden />
            ) : (
                <p className={cn(
                    'mt-1 text-2xl font-semibold tabular-nums tracking-tight',
                    value === null && 'text-base font-medium text-muted-foreground',
                    emphasis && value !== null && value > 0 && 'text-destructive'
                )}>
                    {value === null ? 'Nicht verfügbar' : value}
                </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">{loading ? 'Wird geladen...' : hint}</p>
        </div>
    );
}

export default function AdminUsers() {
    const PAGE_SIZE = 25;
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    // Aggregat-Kennzahlen aus admin.php?action=overview (keine Volltabellen-Exporte).
    const [accountSummary, setAccountSummary] = useState<{
        total: number | null;
        verified: number | null;
        banned: number | null;
    }>({ total: null, verified: null, banned: null });
    const [accountSummaryLoading, setAccountSummaryLoading] = useState(true);

    // Dialog States
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [banUserObj, setBanUserObj] = useState<Profile | null>(null);
    const [banReason, setBanReason] = useState('');
    const [banType, setBanType] = useState<'temporary' | 'permanent'>('permanent');
    const [banDurationDays, setBanDurationDays] = useState('7');
    const [confirmAction, setConfirmAction] = useState<{
        type: 'role' | 'verify' | 'unban' | 'delete';
        user: Profile;
        title: string;
        message: string;
    } | null>(null);
    const [batchVerifyCount, setBatchVerifyCount] = useState<number | null>(null);

    // Parent details state
    const [selectedUserRelations, setSelectedUserRelations] = useState<{
        user: Profile;
        relations: ParentLink[];
    } | null>(null);

    // Suche entprellen (400ms), Seite bei Filterwechsel zurücksetzen
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(0);
            setDebouncedSearch(search.trim());
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // Suche/Filter/Pagination laufen serverseitig (admin.php?action=users → {data, total})
            const { data, error } = await api.admin.users(debouncedSearch || undefined, filterRole, {
                limit: PAGE_SIZE,
                offset: safePage * PAGE_SIZE,
                status: filterStatus,
            });
            if (error) throw error;
            interface UsersPayload { data?: Profile[]; total?: number }
            const payload = (data ?? {}) as UsersPayload;
            const list = (Array.isArray(data) ? (data as Profile[]) : payload.data ?? []).map((u) => ({
                ...u,
                email: u.email || (u as { auth_email?: string | null }).auth_email || null,
            }));
            setUsers(list);
            setTotal(Array.isArray(data) ? list.length : Number(payload.total) || 0);
        } catch {
            setLoadError('Nutzer konnten nicht geladen werden.');
            toast.error('Nutzer konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filterRole, filterStatus, safePage]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (page !== safePage) setPage(safePage);
    }, [page, safePage]);

    const fetchAccountSummary = useCallback(async () => {
        setAccountSummaryLoading(true);
        try {
            const { data, error } = await api.admin.overview();
            if (error) throw error;
            const stats = (data as any)?.stats ?? {};
            const num = (value: unknown) => (value === null || value === undefined || value === '' ? null : Number(value));
            setAccountSummary({
                total: num(stats.total_users),
                verified: num(stats.verified_users),
                banned: num(stats.banned_users),
            });
        } catch {
            // Kennzahlen sind optional; die Liste bleibt nutzbar.
            setAccountSummary({ total: null, verified: null, banned: null });
        } finally {
            setAccountSummaryLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchAccountSummary();
    }, [fetchAccountSummary]);

    const refreshAll = () => {
        void fetchUsers();
        void fetchAccountSummary();
    };

    const fetchUserRelations = async (user: Profile) => {
        try {
            const { data, error } = await api.admin.parentLinks(user.id);
            if (error) throw error;

            const links: ParentLink[] = (Array.isArray(data) ? data : []).map((link: any) => {
                const isParent = link.parent_id === user.id;
                return {
                    ...link,
                    parent_name: isParent
                        ? (user.display_name || 'Ich')
                        : (link.parent_name || 'Unbekannter Nutzer'),
                    child_name: isParent
                        ? (link.child_name || 'Unbekannter Nutzer')
                        : (user.display_name || 'Ich'),
                };
            });

            setSelectedUserRelations({ user, relations: links });
        } catch {
            toast.error('Verknüpfungen konnten nicht geladen werden.');
        }
    };

    const handleEditSave = async () => {
        if (!editingUser) return;
        try {
            // SV-Admin darf fremde Profile via profiles.php-PUT editieren (Backend mit Längen-Checks + Audit)
            const { error } = await api.profiles.update({
                first_name: editingUser.first_name,
                last_name: editingUser.last_name,
                display_name: `${editingUser.first_name} ${editingUser.last_name}`,
                grade_level: editingUser.grade_level,
                class_letter: editingUser.class_letter,
                bio: editingUser.bio,
            }, editingUser.id);
            if (error) throw error;

            toast.success('Nutzerdaten erfolgreich aktualisiert');
            setEditingUser(null);
            refreshAll();
        } catch {
            toast.error('Fehler beim Speichern.');
        }
    };

    const handleBanConfirm = async () => {
        if (!banUserObj) return;
        if (!banReason.trim()) {
            toast.error('Bitte gib einen Grund für die Sperre an.');
            return;
        }

        try {
            // Backend-Format: 'YYYY-MM-DD HH:MM:SS' (MySQL DATETIME)
            const expiresAt = banType === 'temporary'
                ? new Date(Date.now() + parseFloat(banDurationDays) * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
                : null;

            // Sperre + Audit übernimmt das Backend (admin.php?action=ban_user)
            const { error } = await api.admin.banUser({
                user_id: banUserObj.id,
                is_banned: true,
                ban_type: banType,
                ban_reason: banReason.trim(),
                banned_until: expiresAt,
            });
            if (error) throw error;

            toast.success(`Nutzer ${banUserObj.display_name} wurde gesperrt`);
            setBanUserObj(null);
            setBanReason('');
            refreshAll();
        } catch {
            toast.error('Sperre fehlgeschlagen.');
        }
    };

    const executeConfirmedAction = async () => {
        if (!confirmAction) return;
        const { type, user } = confirmAction;

        try {
            if (type === 'unban') {
                const { error } = await api.admin.banUser({ user_id: user.id, is_banned: false });
                if (error) throw error;

                toast.success('Nutzer entsperrt');
            } else if (type === 'verify') {
                const { error } = await api.admin.verifyUser(user.id, !user.is_verified);
                if (error) throw error;

                toast.success(user.is_verified ? 'Verifizierung aufgehoben' : 'Nutzer verifiziert');
            } else if (type === 'role') {
                const newRole = user.role === 'sv_admin' ? 'student' : 'sv_admin';
                const { error } = await api.admin.setRole(user.id, newRole);
                if (error) throw error;

                toast.success(`Rolle geändert zu ${newRole}`);
            } else if (type === 'delete') {
                const { error } = await api.admin.deleteUser(user.id);
                if (error) throw error;

                toast.success(`Nutzer ${user.display_name || 'Unbekannt'} endgültig gelöscht`);
            }

            setConfirmAction(null);
            refreshAll();
        } catch {
            toast.error('Aktion fehlgeschlagen.');
        }
    };

    const exportToCSV = () => {
        // Exportiert bewusst nur die aktuelle Seite (kein Voll-Dump aller Nutzerdaten)
        if (users.length === 0) return;

        // Einheitliches Quoting inkl. Schutz vor CSV-Formel-Injection (Excel/Sheets).
        const csvCell = (value: unknown): string => {
            let text = String(value ?? '');
            if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
            return `"${text.replace(/"/g, '""')}"`;
        };

        const headers = ['ID', 'Name', 'E-Mail', 'Rolle', 'Klasse/Stufe', 'Verifiziert', 'Gesperrt', 'Erstellt am'];
        const csvRows = [
            headers.map(csvCell).join(','), // Header row
            ...users.map(u => [
                csvCell(u.id),
                csvCell(u.display_name || `${u.first_name} ${u.last_name}`),
                csvCell(u.email || ''),
                csvCell(u.role),
                csvCell(`${u.grade_level || ''}${u.class_letter || ''}`),
                csvCell(u.is_verified ? 'Ja' : 'Nein'),
                csvCell(u.is_banned ? 'Ja' : 'Nein'),
                csvCell(new Date(u.created_at).toLocaleDateString('de-DE'))
            ].join(','))
        ];

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `fwg_nachhilfe_nutzer_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Suche/Rolle/Status filtert bereits das Backend – hier liegt die aktuelle Seite
    const filteredUsers = users;

    const handleBatchVerifyPage = () => {
        const unverifiedOnPage = filteredUsers.filter(u => !u.is_verified && !u.is_banned);
        if (unverifiedOnPage.length === 0) {
            toast.error('Keine unverifizierten Nutzer auf dieser Seite.');
            return;
        }

        setBatchVerifyCount(unverifiedOnPage.length);
    };

    const executeBatchVerify = async () => {
        const unverifiedOnPage = filteredUsers.filter(u => !u.is_verified && !u.is_banned);
        if (unverifiedOnPage.length === 0) return;

        try {
            const ids = unverifiedOnPage.map(u => u.id);
            // Backend hat keinen Batch-Endpoint; Einzelaufrufe (jeder wird auditiert)
            const results = await Promise.all(
                ids.map(id => api.admin.verifyUser(id, true))
            );
            const failed = results.filter(r => r.error).length;
            if (failed === ids.length) throw new Error('verify failed');

            toast.success(
                failed === 0
                    ? `${unverifiedOnPage.length} Nutzer erfolgreich verifiziert!`
                    : `${unverifiedOnPage.length - failed} verifiziert, ${failed} fehlgeschlagen.`
            );
            refreshAll();
        } catch {
            toast.error('Fehler bei der Stapelverifizierung.');
        }
    };

    const unverifiedCount = users.filter(u => !u.is_verified && !u.is_banned).length;
    const renderUserActions = (user: Profile) => (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        aria-label={`Aktionen für ${user.display_name || user.first_name || 'Nutzer'}`}
                    />
                }
            >
                <MoreHorizontal size={18} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                <DropdownMenuItem className="min-h-11" onClick={() => setEditingUser(user)}>
                    <Edit aria-hidden />
                    Bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="min-h-11"
                    onClick={() => setConfirmAction({
                        type: 'role',
                        user,
                        title: user.role === 'sv_admin' ? 'Admin-Rechte entziehen?' : 'Zum Admin machen?',
                        message: user.role === 'sv_admin'
                            ? `Möchtest du ${user.display_name} wirklich die SV-Admin-Berechtigungen entziehen?`
                            : `Möchtest du ${user.display_name} wirklich zum SV-Admin ernennen? Dieser Nutzer hat danach vollen Zugriff auf das Admin-Panel.`
                    })}
                >
                    <ShieldCheck aria-hidden />
                    {user.role === 'sv_admin' ? 'Admin-Rechte entziehen' : 'Zum Admin machen'}
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="min-h-11"
                    onClick={() => setConfirmAction({
                        type: 'verify',
                        user,
                        title: user.is_verified ? 'Verifizierung aufheben?' : 'Nutzer verifizieren?',
                        message: user.is_verified
                            ? `Möchtest du die Verifizierung von ${user.display_name} aufheben?`
                            : `Möchtest du ${user.display_name} verifizieren? Damit erhält der Nutzer die Erlaubnis, Nachhilfeanzeigen zu erstellen.`
                    })}
                >
                    {user.is_verified ? <CheckCircle aria-hidden /> : <Check aria-hidden />}
                    {user.is_verified ? 'Verifizierung aufheben' : 'Verifizieren'}
                </DropdownMenuItem>
                {user.role === 'parent' && (
                    <DropdownMenuItem className="min-h-11" onClick={() => fetchUserRelations(user)}>
                        <Link2 aria-hidden />
                        Verknüpfte Kinder
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {user.is_banned ? (
                    <DropdownMenuItem
                        className="min-h-11"
                        onClick={() => setConfirmAction({
                            type: 'unban',
                            user,
                            title: 'Nutzer entsperren?',
                            message: `Möchtest du den Account von ${user.display_name} wieder freigeben?`
                        })}
                    >
                        <UserMinus aria-hidden />
                        Entsperren
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem className="min-h-11" onClick={() => setBanUserObj(user)}>
                        <Ban aria-hidden />
                        Sperren
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    variant="destructive"
                    className="min-h-11"
                    onClick={() => setConfirmAction({
                        type: 'delete',
                        user,
                        title: 'Nutzer endgültig löschen?',
                        message: `Der Account von ${user.display_name || 'diesem Nutzer'} wird mit ALLEN Anzeigen, Nachrichten und Bewertungen unwiderruflich gelöscht (DSGVO-Löschung). Nur im Audit-Protokoll bleibt eine Spur. Fortfahren?`
                    })}
                >
                    <Trash2 aria-hidden />
                    Endgültig löschen
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="space-y-5">
            {/* Aggregat-Kennzahlen */}
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <SummaryTile label="Nutzer gesamt" value={accountSummary.total} hint="Alle registrierten Konten" loading={accountSummaryLoading} />
                <SummaryTile label="Verifiziert" value={accountSummary.verified} hint="Freigeschaltete Konten" loading={accountSummaryLoading} />
                <SummaryTile label="Gesperrt" value={accountSummary.banned} hint="Aktive Sperren" emphasis loading={accountSummaryLoading} />
                <SummaryTile label="Treffer" value={loadError ? null : total} hint="Aktuelle Suche und Filter" loading={loading} />
            </div>

            {/* Toolbar: Suche und Aktionen ab lg in einer Zeile */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full min-w-0 lg:max-w-md">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} aria-hidden />
                        <Input
                            placeholder="Nutzer suchen nach Name, E-Mail..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="h-11 pl-10 text-[13px]"
                            aria-label="Nutzer durchsuchen"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
                        <NativeSelect
                            value={filterRole}
                            onChange={e => { setFilterRole(e.target.value); setPage(0); }}
                            wrapperClassName="w-[calc(50%-0.25rem)] sm:w-40 lg:w-40"
                            className="w-full text-[13px]"
                            aria-label="Nach Rolle filtern"
                        >
                            <option value="all">Alle Rollen</option>
                            <option value="student">Schüler</option>
                            <option value="sv_admin">Admin</option>
                            <option value="coach_admin">Schüler-Coach</option>
                            <option value="parent">Elternteil</option>
                        </NativeSelect>

                        <NativeSelect
                            value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                            wrapperClassName="w-[calc(50%-0.25rem)] sm:w-40 lg:w-40"
                            className="w-full text-[13px]"
                            aria-label="Nach Status filtern"
                        >
                            <option value="all">Alle Status</option>
                            <option value="verified">Verifiziert</option>
                            <option value="unverified">Nicht verifiziert</option>
                            <option value="banned">Gesperrt</option>
                        </NativeSelect>

                        {unverifiedCount > 0 && (
                            <Button
                                onClick={handleBatchVerifyPage}
                                className="h-11 gap-1.5 px-3 text-[13px]"
                                title="Alle unverifizierten Nutzer auf dieser Seite freischalten"
                                aria-label={`Alle unverifizierten Nutzer auf dieser Seite verifizieren (${unverifiedCount})`}
                            >
                                <ShieldCheck size={16} aria-hidden />
                                <span className="hidden sm:inline">Alle verifizieren</span>
                                <span className="tabular-nums">({unverifiedCount})</span>
                            </Button>
                        )}

                        <Button
                            onClick={exportToCSV}
                            variant="outline"
                            className="h-11 w-11 gap-2 px-0 sm:w-auto sm:px-3.5"
                            title="Aktuelle Seite als CSV exportieren"
                            aria-label="Aktuelle Seite als CSV exportieren"
                        >
                            <Download size={16} aria-hidden />
                            <span className="hidden text-[13px] sm:inline">CSV</span>
                        </Button>

                        <Button onClick={refreshAll} variant="ghost" size="icon" className="h-11 w-11" title="Aktualisieren" aria-label="Liste aktualisieren">
                            <RefreshCw size={16} aria-hidden className={cn(loading && 'animate-spin')} />
                        </Button>

                        <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted p-1">
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                onClick={() => setViewMode('list')}
                                aria-pressed={viewMode === 'list'}
                                aria-label="Listenansicht"
                                className={cn(
                                    'grid h-11 w-11 place-items-center rounded-full transition-colors',
                                    viewMode === 'list' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <ListIcon size={16} aria-hidden />
                            </Button>
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                onClick={() => setViewMode('grid')}
                                aria-pressed={viewMode === 'grid'}
                                aria-label="Kachelansicht"
                                className={cn(
                                    'grid h-11 w-11 place-items-center rounded-full transition-colors',
                                    viewMode === 'grid' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <LayoutGrid size={16} aria-hidden />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Nutzerliste nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={refreshAll}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* List/Grid displays */}
            {loadError ? null : loading ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-border bg-card py-16 text-center">
                    <Spinner className="size-6 text-foreground" />
                    <p className="text-sm text-muted-foreground">Lade Benutzerdaten...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="rounded-card border border-border bg-card px-4 py-16 text-center">
                    <UsersIcon size={32} className="mx-auto text-muted-foreground" aria-hidden />
                    <p className="mt-3 text-base font-medium text-foreground">Keine Nutzer gefunden</p>
                    <p className="mt-1 text-xs text-muted-foreground">Passe deine Suchfilter an oder lade die Liste neu.</p>
                </div>
            ) : viewMode === 'list' ? (
                <Card className="rounded-card">
                    <CardContent padding="flush">
                        <Table className="text-[13px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-4">Nutzer</TableHead>
                                    <TableHead className="hidden md:table-cell">E-Mail</TableHead>
                                    <TableHead className="hidden sm:table-cell">Stufe</TableHead>
                                    <TableHead className="hidden lg:table-cell">Rolle</TableHead>
                                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                                    <TableHead className="pr-4 text-right">
                                        <span className="hidden sm:inline">Aktionen</span>
                                        <span className="sr-only sm:hidden">Aktionen</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map(u => {
                                    const name = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unbekannt';
                                    return (
                                        <TableRow key={u.id}>
                                            <TableCell className="py-3 pl-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted font-semibold text-foreground">
                                                        {u.avatar_url ? (
                                                            <img src={u.avatar_url} alt="" className="size-10 object-cover object-top" />
                                                        ) : (
                                                            name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="max-w-[16rem] truncate text-[13px] font-semibold text-foreground" title={name}>{name}</div>
                                                        <div className="mt-0.5 max-w-[10rem] truncate text-xs text-muted-foreground md:hidden">{u.email}</div>
                                                        <div className="mt-1 sm:hidden"><StatusBadge user={u} /></div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden max-w-[220px] md:table-cell">
                                                <span className="block truncate text-xs text-muted-foreground" title={u.email || ''}>{u.email || '—'}</span>
                                            </TableCell>
                                            <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                                                {u.grade_level ? `${u.grade_level}${u.class_letter || ''}` : '—'}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell"><RoleBadge role={u.role} /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><StatusBadge user={u} /></TableCell>
                                            <TableCell className="pr-4 text-right">{renderUserActions(u)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredUsers.map(u => {
                        const name = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unbekannt';
                        return (
                            <Card key={u.id} className="rounded-card">
                                <CardContent className="flex items-start gap-3 p-4">
                                    <div className="relative shrink-0">
                                        <div className="grid size-12 place-items-center overflow-hidden rounded-lg bg-muted text-base font-semibold text-foreground">
                                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="size-12 object-cover object-top" /> : name.charAt(0).toUpperCase()}
                                        </div>
                                        {u.is_verified && (
                                            <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-card bg-emerald-600 text-white" title="Verifiziert">
                                                <Check size={12} strokeWidth={2.5} aria-hidden />
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-[13px] font-semibold text-foreground" title={name}>{name}</div>
                                                <div className="mt-0.5 truncate text-xs text-muted-foreground" title={u.email || ''}>{u.email || '—'}</div>
                                            </div>
                                            {renderUserActions(u)}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                                Stufe {u.grade_level || '–'}{u.class_letter || ''}
                                            </span>
                                            <RoleBadge role={u.role} />
                                            <StatusBadge user={u} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && total > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                        variant="outline"
                        className="h-11"
                        disabled={safePage === 0}
                        onClick={() => setPage(Math.max(0, safePage - 1))}
                    >
                        Zurück
                    </Button>
                    <span className="text-[13px] font-medium text-muted-foreground" aria-live="polite">
                        Seite {safePage + 1} von {totalPages} · {total} Nutzer
                    </span>
                    <Button
                        variant="outline"
                        className="h-11"
                        disabled={safePage + 1 >= totalPages}
                        onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    >
                        Weiter
                    </Button>
                </div>
            )}

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent className="max-w-lg [&_[data-slot=dialog-close]]:size-11">
                    <DialogHeader>
                        <DialogTitle>Benutzer Details bearbeiten</DialogTitle>
                        <DialogDescription>Aktualisiere die Profildaten für dieses Mitglied.</DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-first-name" className="text-sm font-medium">Vorname</Label>
                                    <Input id="edit-first-name" value={editingUser.first_name || ''} onChange={e => setEditingUser({ ...editingUser, first_name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-last-name" className="text-sm font-medium">Nachname</Label>
                                    <Input id="edit-last-name" value={editingUser.last_name || ''} onChange={e => setEditingUser({ ...editingUser, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-grade" className="text-sm font-medium">Klassenstufe (z.B. 8, 10, Q1, Q2)</Label>
                                    <Input id="edit-grade" value={editingUser.grade_level || ''} onChange={e => setEditingUser({ ...editingUser, grade_level: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-class-letter" className="text-sm font-medium">Klassenbuchstabe (optional)</Label>
                                    <Input id="edit-class-letter" value={editingUser.class_letter || ''} onChange={e => setEditingUser({ ...editingUser, class_letter: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-bio" className="text-sm font-medium">Biografie / Beschreibung</Label>
                                <Textarea
                                    id="edit-bio"
                                    className="min-h-[100px]"
                                    value={editingUser.bio || ''}
                                    onChange={e => setEditingUser({ ...editingUser, bio: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingUser(null)} className="h-11">Abbrechen</Button>
                        <Button onClick={handleEditSave} className="h-11">Änderungen speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ban Dialog */}
            <Dialog open={!!banUserObj} onOpenChange={() => setBanUserObj(null)}>
                <DialogContent className="max-w-md [&_[data-slot=dialog-close]]:size-11">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Ban size={20} aria-hidden />
                            Nutzer sperren
                        </DialogTitle>
                        <DialogDescription>
                            Sperre den Zugang von {banUserObj?.display_name || 'diesem Nutzer'} zum Portal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Sperr-Typ</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={banType === 'permanent' ? 'primary' : 'outline'}
                                    aria-pressed={banType === 'permanent'}
                                    onClick={() => setBanType('permanent')}
                                    className="h-11 flex-1"
                                >
                                    Permanent
                                </Button>
                                <Button
                                    type="button"
                                    variant={banType === 'temporary' ? 'primary' : 'outline'}
                                    aria-pressed={banType === 'temporary'}
                                    onClick={() => setBanType('temporary')}
                                    className="h-11 flex-1"
                                >
                                    Temporär
                                </Button>
                            </div>
                        </div>

                        {banType === 'temporary' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="ban-duration" className="text-sm font-medium">Dauer der Sperre</Label>
                                <NativeSelect
                                    id="ban-duration"
                                    value={banDurationDays}
                                    onChange={e => setBanDurationDays(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="0.04167">1 Stunde (Test / Verwarnung)</option>
                                    <option value="0.25">6 Stunden</option>
                                    <option value="0.5">12 Stunden</option>
                                    <option value="1">1 Tag</option>
                                    <option value="3">3 Tage</option>
                                    <option value="7">7 Tage (1 Woche)</option>
                                    <option value="14">14 Tage (2 Wochen)</option>
                                    <option value="30">30 Tage (1 Monat)</option>
                                    <option value="90">90 Tage (3 Monate)</option>
                                </NativeSelect>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="ban-reason" className="text-sm font-medium">Begründung (Pflichtfeld)</Label>
                            <Textarea
                                id="ban-reason"
                                className="min-h-[80px]"
                                placeholder="z.B. Beleidigendes Verhalten im Chat, Spamming, falsche Angaben..."
                                value={banReason}
                                onChange={e => setBanReason(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setBanUserObj(null); setBanReason(''); }} className="h-11">Abbrechen</Button>
                        <Button onClick={handleBanConfirm} variant="destructive" className="h-11">Nutzer bannen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className={cn(confirmAction?.type === 'delete' && 'text-destructive')}>{confirmAction?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmAction?.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
                            onClick={executeConfirmedAction}
                        >
                            {confirmAction?.type === 'delete' ? 'Endgültig löschen' : 'Ausführen'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Parent relations view dialog */}
            <Dialog open={!!selectedUserRelations} onOpenChange={() => setSelectedUserRelations(null)}>
                <DialogContent className="max-w-md [&_[data-slot=dialog-close]]:size-11">
                    <DialogHeader>
                        <DialogTitle>Familien-Verknüpfungen</DialogTitle>
                        <DialogDescription>
                            Verknüpfte Kinder/Eltern von {selectedUserRelations?.user.display_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {selectedUserRelations?.relations.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">Keine aktiven Verknüpfungen gefunden.</p>
                        ) : (
                            selectedUserRelations?.relations.map(rel => (
                                <div key={rel.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                                    <div className="min-w-0">
                                        <div className="break-words font-medium">Kind: {rel.child_name}</div>
                                        <div className="break-words text-xs text-muted-foreground">Elternteil: {rel.parent_name}</div>
                                    </div>
                                    <Badge variant="outline" className="shrink-0 gap-1.5 font-medium">
                                        <span className={cn('size-1.5 rounded-full', rel.status === 'active' ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-muted-foreground')} aria-hidden />
                                        {rel.status}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setSelectedUserRelations(null)} className="h-11 w-full">Schließen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={batchVerifyCount !== null} onOpenChange={(open) => { if (!open) setBatchVerifyCount(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Nutzer verifizieren?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {batchVerifyCount} Nutzer auf dieser Seite werden auf einmal verifiziert.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setBatchVerifyCount(null);
                                void executeBatchVerify();
                            }}
                        >
                            Verifizieren
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
