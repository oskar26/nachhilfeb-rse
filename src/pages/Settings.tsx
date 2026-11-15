import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTheme } from '../components/ThemeProvider';
import { DISTANCE, LIST_ITEM, m, PAGE_ENTER, STAGGER } from '../lib/motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Moon, Sun, Monitor, ChevronLeft, Shield, Trash2, Download, AlertTriangle, LifeBuoy, Share2, BookOpen, Check, KeyRound, Mail, UserX } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import SupportModal from '../components/SupportModal';
import ShareDialog from '../components/ShareDialog';
import { Logo } from '../components/ui/Logo';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { requestPushPermission } from '../lib/push';
import { Switch } from '../components/ui/switch';
import { SubjectChip, SUBJECT_CATEGORIES, type Subject } from '../components/SubjectChip';
import { NewsPreferences } from '../components/news/NewsPreferences';
import { avatarTone, initials } from '../lib/avatar';

interface BlockedUser {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
}

function extractBlockedRows(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    for (const key of ['blocks', 'blocked', 'blocked_users', 'data']) {
        if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
}

function normalizeBlockedUsers(payload: any): BlockedUser[] {
    return extractBlockedRows(payload)
        .map((row: any): BlockedUser => {
            const nested = [row?.blocked_profile, row?.blocked_user, row?.profile, row?.blocked, row?.user]
                .find((candidate) => candidate && typeof candidate === 'object');
            const source = nested ?? row;
            const rawId = source?.id ?? row?.blocked_id ?? row?.user_id;
            const displayName = typeof source?.display_name === 'string'
                ? source.display_name
                : typeof row?.display_name === 'string'
                    ? row.display_name
                    : null;
            const avatarUrl = typeof source?.avatar_url === 'string'
                ? source.avatar_url
                : typeof row?.avatar_url === 'string'
                    ? row.avatar_url
                    : null;
            return {
                id: rawId !== undefined && rawId !== null ? String(rawId) : '',
                display_name: displayName,
                avatar_url: avatarUrl,
            };
        })
        .filter((entry) => entry.id !== '');
}

export default function Settings() {
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [settings, setSettings] = useState<{
        email_visible: boolean;
        phone_visible: boolean;
        teaches_subjects: Subject[];
    }>({
        email_visible: false,
        phone_visible: false,
        teaches_subjects: []
    });
    const [tapCount, setTapCount] = useState(0);
    const [showSecretInput, setShowSecretInput] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

    // Konto & Anmeldung
    const [newEmail, setNewEmail] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [emailChangePending, setEmailChangePending] = useState(false);
    const [emailChangeLoading, setEmailChangeLoading] = useState(false);
    const [emailConfirmLoading, setEmailConfirmLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

    // Blockierte Nutzer
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [blocksLoading, setBlocksLoading] = useState(false);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }
        if (user) {
            fetchSettings();
            fetchBlockedUsers();
        } else {
            setBlockedUsers([]);
            setBlocksLoading(false);
        }
    }, [user]);

    const requestNotifications = async () => {
        triggerHaptic('medium');
        const permission = await requestPushPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
            triggerHaptic('success');
            toast.success('Benachrichtigungen aktiviert!');
        } else if (permission === 'denied') {
            setNotificationsEnabled(false);
            toast.error('Benachrichtigungen sind blockiert. Aktiviere sie in den Browser-Einstellungen dieser Seite.', { duration: 6000 });
        } else if (permission === 'unsupported') {
            toast.error('Dein Browser unterstützt keine Benachrichtigungen.');
        } else {
            setNotificationsEnabled(false);
            toast('Du kannst es später erneut versuchen.');
        }
    };

    const fetchSettings = async () => {
        const { data } = await api.profiles.get(user?.id);
        if (data?.settings) {
            const raw = data.settings as Record<string, unknown>;
            const teaches = raw.teaches_subjects;
            setSettings({
                ...raw,
                email_visible: !!raw.email_visible,
                phone_visible: !!raw.phone_visible,
                teaches_subjects: Array.isArray(teaches)
                    ? teaches.filter((s): s is Subject => typeof s === 'string')
                    : []
            });
        }
    };

    const fetchBlockedUsers = async () => {
        if (!user) {
            setBlockedUsers([]);
            setBlocksLoading(false);
            return;
        }
        setBlocksLoading(true);
        try {
            const { data, error } = await api.blocks.list();
            if (error) throw error;
            setBlockedUsers(normalizeBlockedUsers(data));
        } catch {
            // Blockliste ist eine Komfortfunktion und darf die Seite nicht blockieren.
            setBlockedUsers([]);
        } finally {
            setBlocksLoading(false);
        }
    };

    const updateSetting = async (key: 'email_visible' | 'phone_visible') => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        const { error } = await api.profiles.update({ settings: newSettings }, user?.id);
        if (error) {
            triggerHaptic('error');
            toast.error("Fehler beim Speichern");
        } else {
            triggerHaptic('success');
            toast.success("Einstellung gespeichert!");
        }
    };

    const updateTeachesSubjects = async (subjects: Subject[]) => {
        const newSettings = { ...settings, teaches_subjects: subjects };
        setSettings(newSettings);
        const { error } = await api.profiles.update({ settings: newSettings }, user?.id);
        if (error) {
            triggerHaptic('error');
            toast.error("Fächer konnten nicht gespeichert werden");
        }
    };

    const toggleTeachesSubject = (subject: Subject) => {
        triggerHaptic('selection');
        const current = settings.teaches_subjects || [];
        const next = current.includes(subject)
            ? current.filter(s => s !== subject)
            : [...current, subject];
        void updateTeachesSubjects(next);
    };

    const handleExportData = async () => {
        if (!user) return;
        triggerHaptic('medium');
        toast.loading("Exportiere deine Daten...", { id: "exportData" });
        try {
            let profile: any = null;
            try {
                const { data } = await api.profiles.get(user.id);
                profile = data;
            } catch {
                profile = null;
            }

            let ads: any[] = [];
            try {
                const { data } = await api.ads.list({ user_id: user.id, all: true });
                ads = Array.isArray(data) ? data : [];
            } catch {
                ads = [];
            }

            let reviews: any[] = [];
            try {
                const { data } = await api.reviews.list({ target_user_id: user.id });
                if (Array.isArray(data)) {
                    reviews = data;
                } else if (Array.isArray((data as any)?.data)) {
                    reviews = (data as any).data;
                }
            } catch {
                reviews = [];
            }

            let favorites: any[] = [];
            try {
                const { data } = await api.favorites.list();
                favorites = Array.isArray(data) ? data : [];
            } catch {
                favorites = [];
            }

            let requests: any[] = [];
            try {
                const { data } = await api.requests.list();
                requests = Array.isArray(data) ? data : [];
            } catch {
                requests = [];
            }

            let blockedUsersExport: any[] = [];
            try {
                const { data } = await api.blocks.list();
                blockedUsersExport = extractBlockedRows(data);
            } catch {
                blockedUsersExport = [];
            }

            const exportObj = {
                export_datum: new Date().toISOString(),
                profil: profile,
                meine_anzeigen: ads,
                meine_bewertungen: reviews,
                favoriten: favorites,
                anfragen: requests,
                blockierte_nutzer: blockedUsersExport
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `fwg_nachhilfe_datenexport_${user.id.slice(0, 8)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            triggerHaptic('success');
            toast.success("Datenexport heruntergeladen!", { id: "exportData" });
        } catch (err: any) {
            triggerHaptic('error');
            toast.error("Export-Fehler: " + err.message, { id: "exportData" });
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) {
            toast.error('Bitte melde dich erneut an.');
            return;
        }
        try {
            const { error } = await api.support.createTicket({
                title: 'Konto-Löschung angefordert (Art. 17 DSGVO)',
                description: `Nutzer ${user.email ?? 'unbekannt'} (ID ${user.id}) fordert die vollständige Löschung des Kontos an.`,
                type: 'support',
                priority: 'high'
            });

            if (error) throw error;
            triggerHaptic('success');
            toast.success("Löschanfrage eingereicht. Das SV-Team löscht dein Konto nach Prüfung (Bestätigung innerhalb von 14 Tagen).");
        } catch (err: any) {
            triggerHaptic('error');
            toast.error("Fehler: " + err.message);
        }
    };

    const handleRequestEmailChange = async () => {
        if (!user) {
            toast.error('Bitte melde dich erneut an.');
            return;
        }
        const email = newEmail.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            triggerHaptic('error');
            toast.error('Bitte gib eine gültige E-Mail-Adresse ein.');
            return;
        }
        if (user.email && email.toLowerCase() === user.email.toLowerCase()) {
            triggerHaptic('error');
            toast.error('Das ist bereits deine aktuelle E-Mail-Adresse.');
            return;
        }

        setEmailChangeLoading(true);
        try {
            const { error } = await api.auth.requestEmailChange(email);
            if (error) {
                triggerHaptic('error');
                toast.error(error.message || 'E-Mail-Adresse konnte nicht geändert werden.');
                return;
            }
            triggerHaptic('success');
            setEmailCode('');
            setEmailChangePending(true);
            toast.success('Bestätigungscode an die neue Adresse geschickt.');
        } catch (err: any) {
            triggerHaptic('error');
            toast.error(err?.message || 'E-Mail-Adresse konnte nicht geändert werden.');
        } finally {
            setEmailChangeLoading(false);
        }
    };

    const handleConfirmEmailChange = async () => {
        if (!user) {
            toast.error('Bitte melde dich erneut an.');
            return;
        }
        const code = emailCode.replace(/\D/g, '');
        if (code.length !== 6) {
            triggerHaptic('error');
            toast.error('Bitte gib den 6-stelligen Code aus der E-Mail ein.');
            return;
        }

        setEmailConfirmLoading(true);
        try {
            const { error } = await api.auth.confirmEmailChange(code);
            if (error) {
                triggerHaptic('error');
                const message = typeof error.message === 'string' ? error.message : '';
                if (/falsch|abgelaufen|ungültig|fehlversuch/i.test(message)) {
                    toast.error('Der Code stimmt nicht oder ist abgelaufen.');
                } else {
                    toast.error(message || 'Der Code stimmt nicht oder ist abgelaufen.');
                }
                return;
            }
            triggerHaptic('success');
            toast.success('E-Mail-Adresse geändert.');
            setEmailChangePending(false);
            setNewEmail('');
            setEmailCode('');
            window.setTimeout(() => window.location.reload(), 1200);
        } catch (err: any) {
            triggerHaptic('error');
            toast.error(err?.message || 'Der Code stimmt nicht oder ist abgelaufen.');
        } finally {
            setEmailConfirmLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!user) {
            toast.error('Bitte melde dich erneut an.');
            return;
        }
        if (!currentPassword) {
            triggerHaptic('error');
            toast.error('Bitte gib dein aktuelles Passwort ein.');
            return;
        }
        if (newPassword.length < 8) {
            triggerHaptic('error');
            toast.error('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
            return;
        }
        if (newPassword !== confirmPassword) {
            triggerHaptic('error');
            toast.error('Die neuen Passwörter stimmen nicht überein.');
            return;
        }

        setPasswordChangeLoading(true);
        try {
            const { error } = await api.auth.updatePassword(newPassword, undefined, currentPassword);
            if (error) {
                triggerHaptic('error');
                const message = typeof error.message === 'string' ? error.message : '';
                if (error.status === 401 || error.status === 403 || /aktuelles passwort|current password/i.test(message)) {
                    toast.error('Das aktuelle Passwort ist falsch.');
                } else {
                    toast.error(message || 'Passwort konnte nicht geändert werden.');
                }
                return;
            }
            triggerHaptic('success');
            toast.success('Passwort geändert.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            triggerHaptic('error');
            toast.error(err?.message || 'Passwort konnte nicht geändert werden.');
        } finally {
            setPasswordChangeLoading(false);
        }
    };

    const handleUnblock = async (userId: string) => {
        if (unblockingId) return;
        triggerHaptic('medium');
        setUnblockingId(userId);
        try {
            const { error } = await api.blocks.unblock(userId);
            if (error) throw error;
            setBlockedUsers((prev) => prev.filter((entry) => entry.id !== userId));
            triggerHaptic('success');
            toast.success('Blockierung aufgehoben.');
        } catch (err: any) {
            triggerHaptic('error');
            toast.error(err?.message || 'Blockierung konnte nicht aufgehoben werden.');
        } finally {
            setUnblockingId(null);
        }
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        triggerHaptic('selection');
        setTheme(newTheme);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { ...PAGE_ENTER, staggerChildren: STAGGER.step }
        }
    };

    const itemVariants = LIST_ITEM;

    return (
        <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto w-full max-w-3xl space-y-5 p-4 pb-28 sm:p-6"
        >
            <m.div variants={itemVariants} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            triggerHaptic('light');
                            navigate(-1);
                        }}
                        className="-ml-2 mb-1 h-11 gap-1 rounded-lg pl-2 font-semibold"
                    >
                        <ChevronLeft size={20} aria-hidden /> Zurück
                    </Button>
                    <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">Einstellungen</h1>
                </div>
            </m.div>

            {/* Appearance Theme Card */}
            <m.div variants={itemVariants}>
                <Card className="overflow-hidden border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-base font-semibold">Erscheinungsbild</CardTitle>
                        <CardDescription className="text-xs">Wähle deinen bevorzugten Design-Modus</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'light', label: 'Hell', icon: Sun },
                                { id: 'dark', label: 'Dunkel', icon: Moon },
                                { id: 'system', label: 'System', icon: Monitor }
                            ].map(item => {
                                const Icon = item.icon;
                                const isActive = theme === item.id;
                                return (
                                    <Button
                                        variant="unstyled"
                                        size="unstyled"
                                        hapticStyle={false}
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleThemeChange(item.id as any)}
                                        aria-pressed={isActive}
                                        className={cn(
                                            "relative flex min-h-[88px] cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-colors",
                                            isActive
                                                ? "border-primary bg-primary-soft font-semibold text-primary-soft-foreground"
                                                : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {isActive && (
                                            <Check size={16} className="absolute right-2.5 top-2.5" aria-hidden />
                                        )}
                                        <Icon size={22} aria-hidden />
                                        <span className="text-xs">{item.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </m.div>

            {/* Notifications Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-base font-semibold">Benachrichtigungen</CardTitle>
                        <CardDescription className="text-xs">Erhalte Neuigkeiten und Hinweise der Börse direkt im Browser</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground/80">
                            {notificationsEnabled ? 'Aktiviert' : 'Deaktiviert'}
                        </span>
                        <Button
                            variant={notificationsEnabled ? "outline" : "primary"}
                            size="sm"
                            onClick={requestNotifications}
                            className="h-11 rounded-lg px-4 text-xs font-semibold"
                        >
                            {notificationsEnabled ? 'Neu anfragen' : 'Aktivieren'}
                        </Button>
                    </CardContent>
                </Card>
            </m.div>

            {/* News & Announcements Card */}
            <m.div variants={itemVariants}>
                <NewsPreferences />
            </m.div>

            {/* Privacy & Visibility Settings Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-base font-semibold">Datenschutz & Sichtbarkeit</CardTitle>
                        <CardDescription className="text-xs">Steuere, welche Kontaktdaten nach einer angenommenen Anfrage sichtbar sind.</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y divide-border p-0">
                        <div className="flex items-center justify-between gap-4 p-4 sm:px-6">
                            <div>
                                <h4 className="font-semibold text-sm text-foreground">E-Mail-Adresse anzeigen</h4>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Zeigt deine E-Mail-Adresse nach Annahme einer Anfrage an. Standardmäßig aus.</p>
                            </div>
                            <Switch
                                checked={settings.email_visible}
                                onChange={() => updateSetting('email_visible')}
                                label="E-Mail-Adresse anzeigen"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 p-4 sm:px-6">
                            <div>
                                <h4 className="font-semibold text-sm text-foreground">Telefonnummer anzeigen</h4>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Zeigt deine Telefonnummer nach Annahme einer Anfrage an. Standardmäßig aus.</p>
                            </div>
                            <Switch
                                checked={settings.phone_visible}
                                onChange={() => updateSetting('phone_visible')}
                                label="Telefonnummer anzeigen"
                            />
                        </div>
                    </CardContent>
                </Card>
            </m.div>

            {/* Account & Login Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <KeyRound size={18} className="text-muted-foreground" aria-hidden /> Konto & Anmeldung
                        </CardTitle>
                        <CardDescription className="text-xs">
                            E-Mail-Adresse und Passwort deines Kontos verwalten
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                        <div className="space-y-3">
                            <div>
                                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Mail size={14} className="text-muted-foreground" aria-hidden /> E-Mail-Adresse ändern
                                </h4>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    Aktuell: <span className="font-medium text-foreground">{user?.email || 'Unbekannt'}</span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="new-email" className="text-xs font-semibold text-foreground/80">Neue E-Mail-Adresse</Label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        id="new-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="name@beispiel.de"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                void handleRequestEmailChange();
                                            }
                                        }}
                                        disabled={emailChangeLoading}
                                        className="w-full sm:flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => void handleRequestEmailChange()}
                                        isLoading={emailChangeLoading}
                                        disabled={!user}
                                        className="h-12 shrink-0 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                                    >
                                        <Mail size={14} aria-hidden /> E-Mail ändern
                                    </Button>
                                </div>
                            </div>

                            {emailChangePending && (
                                <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4">
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        Wir haben einen Code an die neue Adresse geschickt. Der Wechsel wird erst nach der Bestätigung wirksam.
                                    </p>
                                    <Label htmlFor="email-change-code" className="text-xs font-semibold text-foreground/80">Bestätigungscode</Label>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Input
                                            id="email-change-code"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            placeholder="6-stelliger Code"
                                            maxLength={6}
                                            value={emailCode}
                                            onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    void handleConfirmEmailChange();
                                                }
                                            }}
                                            disabled={emailConfirmLoading}
                                            className="w-full text-center text-base font-semibold tabular-nums tracking-[0.3em] sm:flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => void handleConfirmEmailChange()}
                                            isLoading={emailConfirmLoading}
                                            disabled={!user}
                                            className="h-12 shrink-0 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                                        >
                                            E-Mail bestätigen
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-3 border-t border-border pt-6">
                            <div>
                                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <KeyRound size={14} className="text-muted-foreground" aria-hidden /> Passwort ändern
                                </h4>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Verwende mindestens 8 Zeichen.</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="current-password" className="text-xs font-semibold text-foreground/80">Aktuelles Passwort</Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        disabled={passwordChangeLoading}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="new-password" className="text-xs font-semibold text-foreground/80">Neues Passwort</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={passwordChangeLoading}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground/80">Neues Passwort wiederholen</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                void handleChangePassword();
                                            }
                                        }}
                                        disabled={passwordChangeLoading}
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => void handleChangePassword()}
                                isLoading={passwordChangeLoading}
                                disabled={!user}
                                className="h-12 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                            >
                                <KeyRound size={14} aria-hidden /> Passwort ändern
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </m.div>

            {/* Blocked Users Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <UserX size={18} className="text-muted-foreground" aria-hidden /> Blockierte Nutzer
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Verwalte Personen, die dich nicht mehr kontaktieren können
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                        {blocksLoading ? (
                            <p className="text-xs text-muted-foreground">Wird geladen …</p>
                        ) : blockedUsers.length === 0 ? (
                            <div className="rounded-xl border border-border bg-muted/50 p-4">
                                <p className="text-sm font-semibold text-foreground">Du hast noch niemanden blockiert.</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    Blockierte Nutzer können dir keine Anfragen oder Nachrichten mehr senden.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {blockedUsers.map((blockedUser) => (
                                    <li
                                        key={blockedUser.id}
                                        className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className={cn(
                                                    'grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold',
                                                    blockedUser.avatar_url ? 'bg-muted' : avatarTone(blockedUser.display_name)
                                                )}
                                                aria-hidden
                                            >
                                                {blockedUser.avatar_url ? (
                                                    <img src={blockedUser.avatar_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    initials(blockedUser.display_name)
                                                )}
                                            </span>
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {blockedUser.display_name || 'Unbekannter Nutzer'}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => void handleUnblock(blockedUser.id)}
                                            isLoading={unblockingId === blockedUser.id}
                                            disabled={unblockingId !== null && unblockingId !== blockedUser.id}
                                            className="h-11 w-full shrink-0 gap-1.5 rounded-lg px-3 text-xs font-semibold sm:w-auto"
                                        >
                                            <UserX size={14} aria-hidden /> Blockierung aufheben
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </m.div>

            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <BookOpen size={18} className="text-muted-foreground" aria-hidden /> Ich biete Nachhilfe
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Wähle die Fächer, in denen du Nachhilfe geben kannst. Wer Fächer angibt, sieht im Feed passende Gesuche.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Gesuche sind privat und erscheinen nicht öffentlich. Trag hier deine Fächer ein, damit du passende Gesuche im Feed sehen kannst.
                            {settings.teaches_subjects.length > 0 ? ` Aktuell gewählt: ${settings.teaches_subjects.length}.` : ''}
                        </p>
                        <div className="space-y-4">
                            {SUBJECT_CATEGORIES.map(category => (
                                <div key={category.title}>
                                    <h4 className="mb-2 text-xs font-semibold text-muted-foreground">{category.title}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {category.subjects.map((s) => (
                                            <SubjectChip
                                                key={s}
                                                subject={s}
                                                size="compact"
                                                selected={settings.teaches_subjects.includes(s)}
                                                onClick={() => toggleTeachesSubject(s)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </m.div>

            {/* DSGVO Data Protection & Rights Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <Shield size={18} className="text-muted-foreground" aria-hidden /> Datenschutz und deine Rechte
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Auskunft, Datenübertragbarkeit und Löschung deiner Daten gemäß DSGVO
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 space-y-4">
                        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-muted/50 p-4 sm:flex-row sm:items-center">
                            <div className="min-w-0">
                                <h4 className="font-semibold text-sm text-foreground">Datenübertragbarkeit (Art. 20 DSGVO)</h4>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Lade eine Kopie all deiner gespeicherten Daten als JSON herunter.</p>
                            </div>
                            <Button
                                onClick={handleExportData}
                                variant="outline"
                                size="sm"
                                className="h-11 w-full shrink-0 gap-1.5 rounded-lg px-4 text-xs font-semibold sm:w-auto"
                            >
                                <Download size={14} /> Daten exportieren
                            </Button>
                        </div>

                        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center">
                            <div className="min-w-0">
                                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                                    <AlertTriangle size={14} /> Recht auf Löschung (Art. 17 DSGVO)
                                </h4>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Stellt eine Löschanfrage an das SV-Team (Bestätigung innerhalb von 14 Tagen).</p>
                            </div>
                            <Button
                                onClick={() => {
                                    triggerHaptic('warning');
                                    setDeleteAccountOpen(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-11 w-full shrink-0 gap-1 rounded-lg px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 sm:w-auto"
                            >
                                <Trash2 size={14} /> Konto löschen
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </m.div>

            {/* Support, Feedback & Bug Report Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <LifeBuoy size={18} className="text-muted-foreground" aria-hidden /> Hilfe, Feedback & Support
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Melde Fehler, wünsche dir eine Funktion oder schreibe direkt an das SV-Team
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 p-6 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                            Wir melden uns, sobald wir deine Anfrage bearbeitet haben.
                        </div>
                        <Button
                            onClick={() => {
                                triggerHaptic('light');
                                setIsSupportOpen(true);
                            }}
                            className="h-11 w-full shrink-0 rounded-lg px-4 text-xs font-semibold sm:w-auto"
                        >
                            Support-Center öffnen
                        </Button>
                    </CardContent>
                </Card>
            </m.div>

            {/* Documentation Help Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <BookOpen size={18} className="text-muted-foreground" aria-hidden /> Dokumentation
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Schritt-für-Schritt-Anleitungen für Anzeigen, Social, Vorschläge und Merkliste.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 p-6 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                            Öffne die Dokumentation, wenn du wissen möchtest, wie ein Bereich funktioniert.
                        </div>
                        <a
                            href="/docs"
                            onClick={() => triggerHaptic('light')}
                            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
                        >
                            <BookOpen size={14} aria-hidden /> Dokumentation öffnen
                        </a>
                    </CardContent>
                </Card>
            </m.div>

            {/* Share App Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <Share2 size={18} className="text-muted-foreground" aria-hidden /> App weiterempfehlen
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Teile die Nachhilfebörse mit Mitschülern & Freunden via WhatsApp, QR-Code oder Direktlink
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 p-6 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                            Wenn dir die Börse hilft, kannst du sie weitergeben.
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                triggerHaptic('light');
                                setIsShareOpen(true);
                            }}
                            className="h-11 w-full shrink-0 gap-1.5 rounded-lg text-xs font-semibold sm:w-auto"
                        >
                            <Share2 size={14} /> Teilen & QR-Code
                        </Button>
                    </CardContent>
                </Card>
            </m.div>

            {/* App Info & Secret Developer Mode Card */}
            <m.div variants={itemVariants}>
                <Card className="border-border bg-card text-center p-6 space-y-4">
                    <div className="flex justify-center">
                        <Logo className="size-12 text-primary" />
                    </div>
                    <div>
                        <h3
                            className="inline-flex min-h-11 cursor-pointer select-none items-center justify-center text-lg font-semibold text-foreground"
                            onClick={() => {
                                triggerHaptic('light');
                                const next = tapCount + 1;
                                setTapCount(next);
                                if (next >= 5) {
                                    setShowSecretInput(true);
                                    triggerHaptic('success');
                                    toast.success('Entwickler-Modus aktiviert!');
                                }
                            }}
                        >
                            Nachhilfebörse FWG Köln
                        </h3>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">Version 2.5.0</p>
                        <p className="text-xs text-muted-foreground mt-1">Entwickelt für das FWG Köln von Oskar H.</p>
                    </div>

                    {showSecretInput && (
                        <m.div
                            initial={{ opacity: 0, y: DISTANCE.enter }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={PAGE_ENTER}
                            className="pt-4 border-t border-border space-y-3 text-left"
                        >
                            <Label className="block text-xs font-semibold text-foreground/80">Code einlösen</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Code..."
                                    className="flex-1 tabular-nums uppercase"
                                    id="secretCodeInput"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (!val) return;
                                            triggerHaptic('medium');
                                            const { data: redeemData, error } = await api.codes.redeem(val);
                                            // Fehler -> 'invalid', Erfolg -> zugewiesene Rolle (Fallback 'student')
                                            const data = error ? 'invalid' : (redeemData?.role || 'student');
                                            if (error) {
                                                console.error(error);
                                                triggerHaptic('error');
                                                toast.error('Fehler beim Einlösen des Codes.');
                                            } else if (data === 'sv_admin' || data === 'coach_admin') {
                                                triggerHaptic('success');
                                                toast.success(data === 'sv_admin' ? 'Du bist jetzt SV-Admin. Bitte lade die Seite neu.' : 'Du bist jetzt Coach-Admin. Bitte lade die Seite neu.');
                                                (e.target as HTMLInputElement).value = '';
                                                setTimeout(() => window.location.reload(), 1200);
                                            } else if (data && data !== 'invalid') {
                                                triggerHaptic('success');
                                                toast.success('Konto verifiziert. Bitte lade die Seite neu.');
                                                (e.target as HTMLInputElement).value = '';
                                                setTimeout(() => window.location.reload(), 1200);
                                            } else {
                                                triggerHaptic('error');
                                                toast.error('Code ungültig oder bereits eingelöst.');
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">Wenn du einen Code erhalten hast, kannst du ihn hier einlösen und mit der Eingabetaste bestätigen.</p>
                        </m.div>
                    )}
                </Card>
            </m.div>

            <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konto löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="block">
                                Willst du dein Konto und all deine Anzeigen wirklich zur Löschung vormerken? Diese Aktion schickt eine Anfrage an die Administration.
                            </span>
                            <span className="mt-2 block">
                                Die Löschung wird innerhalb von 14 Tagen bestätigt. Dein Konto bleibt bis zur manuellen Löschung aktiv.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                setDeleteAccountOpen(false);
                                void handleDeleteAccount();
                            }}
                        >
                            Löschanfrage senden
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
            <ShareDialog type="app" isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
        </m.div>
    );
}
