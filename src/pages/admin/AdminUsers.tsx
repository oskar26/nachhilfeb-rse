import { useState, useEffect, useCallback } from 'react';import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/Dialog';
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

// Getrennte Sperr-Typ-Farben: aktiv (weiß auf rot) und ruhig (grau auf transparent) teilen sich nie ein Element.
const BAN_TYPE_ACTIVE = 'bg-red-600 text-white border-red-600';
const BAN_TYPE_IDLE = 'bg-transparent text-gray-500 border-gray-200 dark:border-gray-800';

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

export default function AdminUsers() {
    const PAGE_SIZE = 25;
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            // Suche/Filter/Pagination laufen serverseitig (admin.php?action=users → {data, total})
            const { data, error } = await api.admin.users(debouncedSearch || undefined, filterRole, {
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
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
            toast.error('Nutzer konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filterRole, filterStatus, page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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
            fetchUsers();
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
            fetchUsers();
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
            fetchUsers();
        } catch {
            toast.error('Aktion fehlgeschlagen.');
        }
    };

    const exportToCSV = () => {
        // Exportiert bewusst nur die aktuelle Seite (kein Voll-Dump aller Nutzerdaten)
        if (users.length === 0) return;
        
        const headers = ['ID', 'Name', 'E-Mail', 'Rolle', 'Klasse/Stufe', 'Verifiziert', 'Gesperrt', 'Erstellt am'];
        const csvRows = [
            headers.join(','), // Header row
            ...users.map(u => [
                u.id,
                `"${u.display_name || `${u.first_name} ${u.last_name}`}"`,
                `"${u.email || ''}"`,
                u.role,
                `"${u.grade_level || ''}${u.class_letter || ''}"`,
                u.is_verified ? 'Ja' : 'Nein',
                u.is_banned ? 'Ja' : 'Nein',
                new Date(u.created_at).toLocaleDateString('de-DE')
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

    const handleBatchVerifyPage = async () => {
        const unverifiedOnPage = filteredUsers.filter(u => !u.is_verified && !u.is_banned);
        if (unverifiedOnPage.length === 0) {
            toast.error('Keine unverifizierten Nutzer auf dieser Seite.');
            return;
        }

        if (!confirm(`${unverifiedOnPage.length} Nutzer auf dieser Seite auf einmal verifizieren?`)) return;

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
            fetchUsers();
        } catch {
            toast.error('Fehler bei der Stapelverifizierung.');
        }
    };

    const unverifiedCount = users.filter(u => !u.is_verified && !u.is_banned).length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Nutzer suchen nach Name, E-Mail..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 rounded-2xl border-gray-200 dark:border-gray-800"
                    />
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Role filter */}
                    <select
                        value={filterRole}
                        onChange={e => { setFilterRole(e.target.value); setPage(0); }}
                        className="h-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">Alle Rollen</option>
                        <option value="student">Schüler</option>
                        <option value="sv_admin">Admin</option>
                        <option value="coach_admin">Schüler-Coach</option>
                        <option value="parent">Elternteil</option>
                    </select>

                    {/* Status filter */}
                    <select
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                        className="h-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">Alle Status</option>
                        <option value="verified">Verifiziert</option>
                        <option value="unverified">Nicht verifiziert</option>
                        <option value="banned">Gesperrt</option>
                    </select>

                    {/* Batch verify action */}
                    {unverifiedCount > 0 && (
                        <Button
                            onClick={handleBatchVerifyPage}
                            className="h-11 rounded-2xl gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            title="Alle unverifizierten Nutzer auf dieser Seite freischalten"
                        >
                            <ShieldCheck size={16} /> Alle verifizieren ({unverifiedCount})
                        </Button>
                    )}

                    {/* Actions */}
                    <Button onClick={exportToCSV} variant="outline" className="h-11 rounded-2xl gap-2 text-sm font-semibold" title="Exportiert die aktuelle Seite als CSV">
                        <Download size={16} /> CSV Export
                    </Button>

                    <Button onClick={fetchUsers} variant="ghost" className="h-11 w-11 p-0 rounded-2xl" title="Aktualisieren">
                        <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
                    </Button>

                    {/* View Switcher */}
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border dark:border-gray-800 shrink-0">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn('p-2 rounded-xl transition-all', viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-900 dark:text-white' : 'text-gray-400')}
                        >
                            <ListIcon size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn('p-2 rounded-xl transition-all', viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-900 dark:text-white' : 'text-gray-400')}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List/Grid displays */}
            {loading ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 font-medium">Lade Benutzerdaten...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="py-20 text-center space-y-3 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl">
                    <UsersIcon size={48} className="mx-auto text-gray-300" />
                    <p className="text-gray-500 font-medium text-lg">Keine Nutzer gefunden</p>
                    <p className="text-gray-400 text-xs">Passe deine Suchfilter an oder lade die Liste neu.</p>
                </div>
            ) : viewMode === 'list' ? (
                <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Nutzer</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Rolle</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Stufe</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary-hover shrink-0">
                                                        {u.avatar_url ? (
                                                            <img src={u.avatar_url} className="w-10 h-10 rounded-2xl object-cover" />
                                                        ) : (
                                                            (u.display_name || u.first_name || '?').charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold truncate">{u.display_name || `${u.first_name} ${u.last_name}`}</div>
                                                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                                    u.role === 'sv_admin' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                                                    u.role === 'student' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                                    u.role === 'parent' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                )}>
                                                    {u.role === 'sv_admin' ? 'Admin' : u.role === 'coach_admin' ? 'Coach' : u.role === 'parent' ? 'Elternteil' : 'Schüler'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-sm">
                                                {u.grade_level ? `${u.grade_level}${u.class_letter || ''}` : '--'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    {u.is_banned ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase border border-red-200">Gesperrt</span>
                                                    ) : u.is_verified ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase border border-green-200">Verifiziert</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase border border-gray-200">Basis</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={() => setEditingUser(u)} title="Bearbeiten">
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className={cn("h-9 w-9 rounded-xl", u.role === 'sv_admin' && "text-purple-500 bg-purple-50 dark:bg-purple-950/30")} 
                                                        onClick={() => setConfirmAction({
                                                            type: 'role',
                                                            user: u,
                                                            title: u.role === 'sv_admin' ? 'Admin-Rechte entziehen?' : 'Zum Admin machen?',
                                                            message: u.role === 'sv_admin' 
                                                                ? `Möchtest du ${u.display_name} wirklich die SV-Admin-Berechtigungen entziehen?`
                                                                : `Möchtest du ${u.display_name} wirklich zum SV-Admin ernennen? Dieser Nutzer hat danach vollen Zugriff auf das Admin-Panel.`
                                                        })} 
                                                        title="Admin Rechte umschalten"
                                                    >
                                                        <ShieldCheck size={14} />
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className={cn("h-9 w-9 rounded-xl", u.is_verified && "text-green-600 bg-green-50 dark:bg-green-950/30")} 
                                                        onClick={() => setConfirmAction({
                                                            type: 'verify',
                                                            user: u,
                                                            title: u.is_verified ? 'Verifizierung aufheben?' : 'Nutzer verifizieren?',
                                                            message: u.is_verified 
                                                                ? `Möchtest du die Verifizierung von ${u.display_name} aufheben?`
                                                                : `Möchtest du ${u.display_name} verifizieren? Damit erhält der Nutzer die Erlaubnis, Nachhilfeanzeigen zu erstellen.`
                                                        })} 
                                                        title="Verifizierung schalten"
                                                    >
                                                        {u.is_verified ? <Check size={14} className="text-green-600" /> : <CheckCircle size={14} />}
                                                    </Button>
                                                    {u.role === 'parent' && (
                                                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-green-600" onClick={() => fetchUserRelations(u)} title="Verknüpfte Kinder ansehen">
                                                            <UsersIcon size={14} />
                                                        </Button>
                                                    )}
                                                    {u.is_banned ? (
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-9 w-9 rounded-xl text-green-600 bg-green-50 dark:bg-green-950/20" 
                                                            onClick={() => setConfirmAction({
                                                                type: 'unban',
                                                                user: u,
                                                                title: 'Nutzer entsperren?',
                                                                message: `Möchtest du den Account von ${u.display_name} wieder freigeben?`
                                                            })}
                                                            title="Entsperren"
                                                        >
                                                            <UserMinus size={14} />
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" 
                                                            onClick={() => setBanUserObj(u)} 
                                                            title="Sperren"
                                                        >
                                                            <Ban size={14} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9 rounded-xl text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40"
                                                        onClick={() => setConfirmAction({
                                                            type: 'delete',
                                                            user: u,
                                                            title: 'Nutzer endgültig löschen?',
                                                            message: `Der Account von ${u.display_name || 'diesem Nutzer'} wird mit ALLEN Anzeigen, Nachrichten und Bewertungen unwiderruflich gelöscht (DSGVO-Löschung). Nur im Audit-Protokoll bleibt eine Spur. Fortfahren?`
                                                        })}
                                                        title="Nutzer endgültig löschen"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map(u => (
                        <div key={u.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border dark:border-gray-800 flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition-all">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary-hover text-xl shrink-0">
                                    {u.avatar_url ? <img src={u.avatar_url} className="w-16 h-16 rounded-2xl object-cover" /> : (u.display_name || '?').charAt(0).toUpperCase()}
                                </div>
                                {u.is_verified && (
                                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 text-white rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center" title="Verifiziert">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 w-full">
                                <div className="font-bold truncate text-base">{u.display_name || `${u.first_name} ${u.last_name}`}</div>
                                <div className="text-xs text-gray-400 truncate">{u.email}</div>
                                <div className="flex gap-2 justify-center mt-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                                        Stufe {u.grade_level || '--'}{u.class_letter || ''}
                                    </span>
                                    <span className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                        u.role === 'sv_admin' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                                        u.role === 'student' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                        u.role === 'parent' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    )}>
                                        {u.role === 'sv_admin' ? 'Admin' : u.role === 'coach_admin' ? 'Coach' : u.role === 'parent' ? 'Elternteil' : 'Schüler'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1.5 w-full mt-2 justify-center">
                                <Button size="sm" variant="outline" className="h-8 rounded-xl flex-1 text-xs" onClick={() => setEditingUser(u)}>Bearbeiten</Button>
                                {u.is_banned ? (
                                    <Button size="sm" variant="outline" className="h-8 rounded-xl flex-1 text-xs border-green-200 text-green-700 hover:bg-green-50" onClick={() => setConfirmAction({
                                        type: 'unban',
                                        user: u,
                                        title: 'Nutzer entsperren?',
                                        message: `Möchtest du den Account von ${u.display_name} wieder freigeben?`
                                    })}>Entsperren</Button>
                                ) : (
                                    <Button size="sm" variant="outline" className="h-8 rounded-xl flex-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-100" onClick={() => setBanUserObj(u)}>Sperren</Button>
                                )}
                                <Button size="sm" variant="outline" className="h-8 w-10 rounded-xl text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 px-0" onClick={() => setConfirmAction({
                                    type: 'delete',
                                    user: u,
                                    title: 'Nutzer endgültig löschen?',
                                    message: `Der Account von ${u.display_name || 'diesem Nutzer'} wird mit ALLEN Anzeigen, Nachrichten und Bewertungen unwiderruflich gelöscht (DSGVO-Löschung). Nur im Audit-Protokoll bleibt eine Spur. Fortfahren?`
                                })} title="Nutzer endgültig löschen"><Trash2 size={14} /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && total > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                        variant="outline"
                        className="h-10 rounded-2xl text-sm font-semibold"
                        disabled={page === 0}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                    >
                        Zurück
                    </Button>
                    <span className="text-sm text-gray-500 font-medium">
                        Seite {page + 1} von {totalPages} · {total} Nutzer
                    </span>
                    <Button
                        variant="outline"
                        className="h-10 rounded-2xl text-sm font-semibold"
                        disabled={page + 1 >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Weiter
                    </Button>
                </div>
            )}

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent className="rounded-3xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Benutzer Details bearbeiten</DialogTitle>
                        <DialogDescription>Aktualisiere die Profildaten für dieses Mitglied.</DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Vorname</label>
                                    <Input value={editingUser.first_name || ''} onChange={e => setEditingUser({ ...editingUser, first_name: e.target.value })} className="rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Nachname</label>
                                    <Input value={editingUser.last_name || ''} onChange={e => setEditingUser({ ...editingUser, last_name: e.target.value })} className="rounded-xl" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Klassenstufe (z.B. 8, 10, Q1, Q2)</label>
                                    <Input value={editingUser.grade_level || ''} onChange={e => setEditingUser({ ...editingUser, grade_level: e.target.value })} className="rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Klassenbuchstabe (optional)</label>
                                    <Input value={editingUser.class_letter || ''} onChange={e => setEditingUser({ ...editingUser, class_letter: e.target.value })} className="rounded-xl" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Biografie / Beschreibung</label>
                                <textarea
                                    className="w-full border dark:border-gray-800 rounded-xl p-3 bg-transparent text-sm min-h-[100px] focus:ring-2 focus:ring-primary outline-none"
                                    value={editingUser.bio || ''}
                                    onChange={e => setEditingUser({ ...editingUser, bio: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingUser(null)} className="rounded-xl">Abbrechen</Button>
                        <Button onClick={handleEditSave} className="rounded-xl bg-primary text-black font-bold">Änderungen speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ban Dialog */}
            <Dialog open={!!banUserObj} onOpenChange={() => setBanUserObj(null)}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Ban size={20} />
                            Nutzer sperren
                        </DialogTitle>
                        <DialogDescription>
                            Sperre den Zugang von {banUserObj?.display_name || 'diesem Nutzer'} zum Portal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400">Sperr-Typ</label>
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={() => setBanType('permanent')}
                                    className={cn('flex-1 py-2 px-3 text-xs rounded-xl border text-center font-bold transition-all', banType === 'permanent' ? BAN_TYPE_ACTIVE : BAN_TYPE_IDLE)}
                                >
                                    Permanent
                                </button>
                                <button
                                    onClick={() => setBanType('temporary')}
                                    className={cn('flex-1 py-2 px-3 text-xs rounded-xl border text-center font-bold transition-all', banType === 'temporary' ? BAN_TYPE_ACTIVE : BAN_TYPE_IDLE)}
                                >
                                    Temporär
                                </button>
                            </div>
                        </div>

                        {banType === 'temporary' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400">Dauer der Sperre</label>
                                <select
                                    value={banDurationDays}
                                    onChange={e => setBanDurationDays(e.target.value)}
                                    className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm focus:outline-none"
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
                                </select>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400">Begründung (Pflichtfeld)</label>
                            <textarea
                                className="w-full border dark:border-gray-800 rounded-xl p-3 bg-transparent text-sm min-h-[80px] focus:ring-2 focus:ring-primary outline-none mt-1"
                                placeholder="z.B. Beleidigendes Verhalten im Chat, Spamming, falsche Angaben..."
                                value={banReason}
                                onChange={e => setBanReason(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setBanUserObj(null); setBanReason(''); }} className="rounded-xl">Abbrechen</Button>
                        <Button onClick={handleBanConfirm} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">Nutzer bannen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className={cn(confirmAction?.type === 'delete' && "text-red-600")}>{confirmAction?.title}</DialogTitle>
                        <DialogDescription>{confirmAction?.message}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmAction(null)} className="rounded-xl">Abbrechen</Button>
                        <Button onClick={executeConfirmedAction} className={cn("rounded-xl font-bold", confirmAction?.type === 'delete' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary text-black")}>{confirmAction?.type === 'delete' ? 'Endgültig löschen' : 'Ausführen'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Parent relations view dialog */}
            <Dialog open={!!selectedUserRelations} onOpenChange={() => setSelectedUserRelations(null)}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle>Familien-Verknüpfungen</DialogTitle>
                        <DialogDescription>
                            Verknüpfte Kinder/Eltern von {selectedUserRelations?.user.display_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        {selectedUserRelations?.relations.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-6">Keine aktiven Verknüpfungen gefunden.</p>
                        ) : (
                            selectedUserRelations?.relations.map(rel => (
                                <div key={rel.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 flex justify-between items-center text-sm">
                                    <div>
                                        <div className="font-bold">Kind: {rel.child_name}</div>
                                        <div className="text-xs text-gray-400">Elternteil: {rel.parent_name}</div>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                        rel.status === 'active' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                    )}>
                                        {rel.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setSelectedUserRelations(null)} className="rounded-xl w-full">Schließen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
