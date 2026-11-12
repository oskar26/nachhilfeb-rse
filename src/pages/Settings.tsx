import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTheme } from '../components/ThemeProvider';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Moon, Sun, Monitor, ChevronLeft, Shield, Trash2, Download, AlertTriangle, LifeBuoy, Share2, BookOpen } from 'lucide-react';
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

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }
        if (user) {
            fetchSettings();
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
            const { data: profile } = await api.profiles.get(user.id);
            const { data: ads } = await api.ads.list({ user_id: user.id, all: true });
            const { data: reviews } = await api.reviews.list({});
            const { data: favorites } = await api.favorites.list();
            const { data: requests } = await api.requests.list();

            const exportObj = {
                export_datum: new Date().toISOString(),
                profil: profile,
                meine_anzeigen: ads || [],
                meine_bewertungen: reviews || [],
                favoriten: favorites || [],
                anfragen: requests || []
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
        try {
            const { error } = await api.support.createTicket({
                user_id: user?.id,
                subject: 'Konto-Löschung angefordert (Art. 17 DSGVO)',
                message: `Nutzer ${user?.email} fordert die vollständige Löschung seines Kontos an.`
            } as any);

            if (error) throw error;
            triggerHaptic('success');
            toast.success("Löschanfrage eingereicht. Das SV-Team löscht dein Konto nach Prüfung (Bestätigung innerhalb von 14 Tagen).");
        } catch (err: any) {
            triggerHaptic('error');
            toast.error("Fehler: " + err.message);
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
            transition: { staggerChildren: 0.08 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 25 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto w-full max-w-3xl space-y-5 p-4 pb-28 sm:p-6"
        >
            <motion.div variants={itemVariants} className="flex items-start justify-between gap-3">
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
            </motion.div>

            {/* Appearance Theme Card */}
            <motion.div variants={itemVariants}>
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
                                        className={cn(
                                            "flex min-h-[88px] cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-colors",
                                            isActive
                                                ? "border-foreground bg-muted font-semibold text-foreground"
                                                : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Icon size={22} aria-hidden />
                                        <span className="text-xs">{item.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Notifications Card */}
            <motion.div variants={itemVariants}>
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
            </motion.div>

            {/* Privacy & Visibility Settings Card */}
            <motion.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-base font-semibold">Datenschutz & Sichtbarkeit</CardTitle>
                        <CardDescription className="text-xs">Steuere, welche Kontaktdaten in deinen Anzeigen öffentlich zu sehen sind</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y divide-border p-0">
                        <div className="flex items-center justify-between gap-4 p-4 sm:px-6">
                            <div>
                                <h4 className="font-semibold text-sm text-foreground">E-Mail-Adresse anzeigen</h4>
                                <p className="mt-0.5 text-xs text-muted-foreground">Zeigt deine E-Mail-Adresse öffentlich im Profil/Anzeigen an</p>
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
                                <p className="mt-0.5 text-xs text-muted-foreground">Zeigt deine Telefonnummer öffentlich für Anfragen an</p>
                            </div>
                            <Switch
                                checked={settings.phone_visible}
                                onChange={() => updateSetting('phone_visible')}
                                label="Telefonnummer anzeigen"
                            />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
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
            </motion.div>

            {/* DSGVO Data Protection & Rights Card */}
            <motion.div variants={itemVariants}>
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
                            <div>
                                <h4 className="font-semibold text-sm text-foreground">Datenübertragbarkeit (Art. 20 DSGVO)</h4>
                                <p className="mt-0.5 text-xs text-muted-foreground">Lade eine Kopie all deiner gespeicherten Daten als JSON herunter.</p>
                            </div>
                            <Button
                                onClick={handleExportData}
                                variant="outline"
                                size="sm"
                                className="h-11 shrink-0 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                            >
                                <Download size={14} /> Daten exportieren
                            </Button>
                        </div>

                        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center">
                            <div>
                                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                                    <AlertTriangle size={14} /> Recht auf Löschung (Art. 17 DSGVO)
                                </h4>
                                <p className="mt-0.5 text-xs text-muted-foreground">Stellt eine Löschanfrage an das SV-Team (Bestätigung innerhalb von 14 Tagen).</p>
                            </div>
                            <Button
                                onClick={() => {
                                    triggerHaptic('warning');
                                    setDeleteAccountOpen(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-11 shrink-0 gap-1 rounded-lg px-4 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 size={14} /> Konto löschen
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Support, Feedback & Bug Report Card */}
            <motion.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <LifeBuoy size={18} className="text-muted-foreground" aria-hidden /> Hilfe, Feedback & Support
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Melde Fehler, schlage Verbesserungen vor oder schreibe direkt an das SV-Team
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 flex items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground">
                            Wir melden uns, sobald wir deine Anfrage bearbeitet haben.
                        </div>
                        <Button
                            onClick={() => {
                                triggerHaptic('light');
                                setIsSupportOpen(true);
                            }}
                            className="h-11 shrink-0 rounded-lg px-4 text-xs font-semibold"
                        >
                            Support-Center öffnen
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Share App Card */}
            <motion.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <Share2 size={18} className="text-muted-foreground" aria-hidden /> App weiterempfehlen
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Teile die Nachhilfebörse mit Mitschülern & Freunden via WhatsApp, QR-Code oder Direktlink
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 flex items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground">
                            Wenn dir die Börse hilft, kannst du sie weitergeben.
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                triggerHaptic('light');
                                setIsShareOpen(true);
                            }}
                            className="rounded-lg font-semibold text-xs shrink-0 gap-1.5"
                        >
                            <Share2 size={14} /> Teilen & QR-Code
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* App Info & Secret Developer Mode Card */}
            <motion.div variants={itemVariants}>
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
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
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
                            <p className="text-xs text-muted-foreground">Wenn du einen Code erhalten hast, kannst du ihn hier einlösen und mit der Eingabetaste bestätigen.</p>
                        </motion.div>
                    )}
                </Card>
            </motion.div>

            <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konto löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Willst du dein Konto und all deine Anzeigen wirklich zur Löschung vormerken? Diese Aktion schickt eine Anfrage an die Administration.
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
        </motion.div>
    );
}
