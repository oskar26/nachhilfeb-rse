import { useTheme } from '../components/ThemeProvider';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Moon, Sun, Monitor, ChevronLeft, Shield, Users, Trash2, Download, AlertTriangle, LifeBuoy, Share2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import ChildLinkModal from '../components/ChildLinkModal';
import SupportModal from '../components/SupportModal';
import ShareDialog from '../components/ShareDialog';
import { Logo } from '../components/ui/Logo';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            type="button"
            onClick={() => {
                triggerHaptic('selection');
                onChange();
            }}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 select-none",
                checked ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
            )}
        >
            <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}

export default function Settings() {
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [settings, setSettings] = useState({
        email_visible: false,
        phone_visible: false
    });
    const [loading, setLoading] = useState(true);
    const [tapCount, setTapCount] = useState(0);
    const [showSecretInput, setShowSecretInput] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [parentLinks, setParentLinks] = useState<any[]>([]);
    const [copiedCode, setCopiedCode] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }
        if (user) {
            fetchSettings();
            fetchParentLinks();
        }
    }, [user]);

    const requestNotifications = async () => {
        triggerHaptic('medium');
        if (!('Notification' in window)) {
            toast.error('Dein Browser unterstützt keine Benachrichtigungen.');
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
            triggerHaptic('success');
            toast.success('Benachrichtigungen aktiviert!');
        } else {
            setNotificationsEnabled(false);
            toast.error('Benachrichtigungen abgelehnt.');
        }
    };

    const fetchSettings = async () => {
        const { data } = await supabase.from('profiles').select('settings').eq('id', user?.id).single();
        if (data?.settings) {
            setSettings(data.settings);
        }
        setLoading(false);
    };

    const fetchParentLinks = async () => {
        try {
            const { data, error } = await supabase
                .from('parent_links')
                .select('id, status, parent:parent_id(display_name, first_name, last_name)')
                .eq('child_id', user?.id)
                .eq('status', 'active');
            if (error) throw error;
            setParentLinks(data || []);
        } catch (err) {
            console.error('Error fetching parent links:', err);
        }
    };

    const handleRemoveParentLink = async (linkId: string) => {
        triggerHaptic('medium');
        if (!confirm('Möchtest du diese Eltern-Verknüpfung wirklich aufheben?')) return;
        try {
            const { error } = await supabase.from('parent_links').delete().eq('id', linkId);
            if (error) throw error;
            triggerHaptic('success');
            toast.success('Verknüpfung aufgehoben');
            setParentLinks(parentLinks.filter(p => p.id !== linkId));
        } catch (err: any) {
            toast.error('Fehler: ' + err.message);
        }
    };

    const updateSetting = async (key: 'email_visible' | 'phone_visible') => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        const { error } = await supabase.from('profiles').update({ settings: newSettings }).eq('id', user?.id);
        if (error) {
            triggerHaptic('error');
            toast.error("Fehler beim Speichern");
        } else {
            triggerHaptic('success');
            toast.success("Einstellung gespeichert!");
        }
    };

    const handleExportData = async () => {
        if (!user) return;
        triggerHaptic('medium');
        toast.loading("Exportiere deine Daten...", { id: "exportData" });
        try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            const { data: ads } = await supabase.from('ads').select('*').eq('user_id', user.id);
            const { data: reviews } = await supabase.from('reviews').select('*').eq('author_id', user.id);
            const { data: favorites } = await supabase.from('favorites').select('*').eq('user_id', user.id);
            const { data: requests } = await supabase.from('ad_requests').select('*').or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`);

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
        triggerHaptic('warning');
        if (!confirm("⚠️ Willst du deinen Account und all deine Anzeigen wirklich zur Löschung vormerken? Diese Aktion schickt eine Anfrage an die Administration.")) return;

        try {
            const { error } = await supabase.from('support_tickets').insert({
                user_id: user?.id,
                subject: 'Account-Löschung angefordert (Art. 17 DSGVO)',
                message: `Nutzer ${user?.email} fordert die vollständige Löschung seines Accounts an.`
            });

            if (error) throw error;
            triggerHaptic('success');
            toast.success("Löschanfrage eingereicht. Ein Admin wird dein Konto innerhalb der Frist prüfen.");
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
            className="p-4 max-w-xl mx-auto pb-28 space-y-6"
        >
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            triggerHaptic('light');
                            navigate(-1);
                        }}
                        className="pl-0 hover:bg-transparent -ml-2 rounded-full font-bold"
                    >
                        <ChevronLeft className="mr-1" size={20} /> Zurück
                    </Button>
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Einstellungen</h1>
                <div className="w-16" />
            </motion.div>

            {/* Appearance Theme Card */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-base font-extrabold">Erscheinungsbild</CardTitle>
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
                                    <motion.button
                                        key={item.id}
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.94 }}
                                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                        onClick={() => handleThemeChange(item.id as any)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer select-none gap-2",
                                            isActive
                                                ? "bg-amber-400/20 border-amber-400 text-amber-950 dark:text-yellow-200 font-extrabold shadow-xs"
                                                : "bg-gray-50/60 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                                        )}
                                    >
                                        <Icon size={22} className={isActive ? "text-yellow-600 dark:text-yellow-400" : ""} />
                                        <span className="text-xs">{item.label}</span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Notifications Card */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-base font-extrabold">Push-Benachrichtigungen</CardTitle>
                        <CardDescription className="text-xs">Erhalte Push-Mitteilungen bei neuen Anfragen und Nachrichten</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {notificationsEnabled ? 'Aktiviert' : 'Deaktiviert'}
                        </span>
                        <Button
                            variant={notificationsEnabled ? "outline" : "primary"}
                            size="sm"
                            onClick={requestNotifications}
                            className="rounded-full font-bold text-xs"
                        >
                            {notificationsEnabled ? 'Neu anfragen' : 'Aktivieren'}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Privacy & Visibility Settings Card */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-base font-extrabold">Datenschutz & Sichtbarkeit</CardTitle>
                        <CardDescription className="text-xs">Steuere, welche Kontaktdaten in deinen Anzeigen öffentlich zu sehen sind</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div>
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white">E-Mail-Adresse anzeigen</h4>
                                <p className="text-[11px] text-gray-500">Zeigt deine E-Mail-Adresse öffentlich im Profil/Anzeigen an</p>
                            </div>
                            <ToggleSwitch
                                checked={settings.email_visible}
                                onChange={() => updateSetting('email_visible')}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div>
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white">Telefonnummer anzeigen</h4>
                                <p className="text-[11px] text-gray-500">Zeigt deine Telefonnummer öffentlich für Anfragen an</p>
                            </div>
                            <ToggleSwitch
                                checked={settings.phone_visible}
                                onChange={() => updateSetting('phone_visible')}
                            />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Parent Links Section */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-extrabold">Verknüpfte Eltern-Accounts</CardTitle>
                            <CardDescription className="text-xs">Elternteile mit Lesezugriff auf deine Nachhilfeanzeigen</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                triggerHaptic('light');
                                setIsLinkModalOpen(true);
                            }}
                            className="rounded-full text-xs font-bold shrink-0"
                        >
                            + Verknüpfen
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 space-y-3">
                        {parentLinks.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-1">Aktuell keine Eltern-Accounts verknüpft.</p>
                        ) : (
                            parentLinks.map((link: any) => (
                                <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-yellow-900 dark:text-yellow-200 font-extrabold text-xs">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                {link.parent?.display_name || `${link.parent?.first_name} ${link.parent?.last_name}`}
                                            </p>
                                            <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase">Aktiv</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveParentLink(link.id)}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* DSGVO Data Protection & Rights Card */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-extrabold text-gray-900 dark:text-white">
                            <Shield size={18} className="text-primary" /> Datenschutz & Ihre Rechte (DSGVO)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Auskunft, Datenübertragbarkeit und Löschung deiner Daten gemäß DSGVO
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div>
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white">Datenübertragbarkeit (Art. 20 DSGVO)</h4>
                                <p className="text-[11px] text-gray-500">Lade eine Kopie all deiner gespeicherten Daten als JSON herunter.</p>
                            </div>
                            <Button
                                onClick={handleExportData}
                                variant="outline"
                                size="sm"
                                className="rounded-full font-bold gap-1.5 text-xs shrink-0"
                            >
                                <Download size={14} /> Daten exportieren
                            </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                            <div>
                                <h4 className="font-bold text-xs text-red-900 dark:text-red-300 flex items-center gap-1.5">
                                    <AlertTriangle size={14} /> Recht auf Löschung (Art. 17 DSGVO)
                                </h4>
                                <p className="text-[11px] text-red-700 dark:text-red-400">Account und Daten zur Löschung vormerken (30 Tage Frist).</p>
                            </div>
                            <Button
                                onClick={handleDeleteAccount}
                                variant="ghost"
                                size="sm"
                                className="rounded-full font-bold gap-1 text-xs text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 shrink-0"
                            >
                                <Trash2 size={14} /> Account löschen
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Support, Feedback & Bug Report Card */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-extrabold text-gray-900 dark:text-white">
                            <LifeBuoy size={18} className="text-primary" /> Hilfe, Feedback & Support
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Melde Bugs, schlage neue Funktionen vor oder chatte direkt mit den SV-Admins
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 flex items-center justify-between gap-4">
                        <div className="text-xs text-gray-500">
                            Wir antworten in der Regel innerhalb kurzer Zeit auf deine Anfragen.
                        </div>
                        <Button
                            onClick={() => {
                                triggerHaptic('light');
                                setIsSupportOpen(true);
                            }}
                            className="rounded-full font-bold text-xs bg-primary hover:bg-primary-hover text-primary-foreground shrink-0 shadow-xs"
                        >
                            Support-Center öffnen
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Share App Card */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-extrabold text-gray-900 dark:text-white">
                            <Share2 size={18} className="text-primary" /> App weiterempfehlen
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Teile die Nachhilfebörse mit Mitschülern & Freunden via WhatsApp, QR-Code oder Direktlink
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-3 flex items-center justify-between gap-4">
                        <div className="text-xs text-gray-500">
                            Hilf mit, die FWG-Community zu vergrößern!
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                triggerHaptic('light');
                                setIsShareOpen(true);
                            }}
                            className="rounded-full font-bold text-xs shrink-0 gap-1.5"
                        >
                            <Share2 size={14} /> Teilen & QR-Code
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* App Info & Secret Developer Mode Card */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft text-center p-6 space-y-4">
                    <div className="flex justify-center">
                        <Logo className="w-12 h-12 text-black dark:text-white" />
                    </div>
                    <div>
                        <h3 
                            className="font-black text-lg text-gray-900 dark:text-white cursor-pointer select-none"
                            onClick={() => {
                                triggerHaptic('light');
                                const next = tapCount + 1;
                                setTapCount(next);
                                if (next >= 5) {
                                    setShowSecretInput(true);
                                    triggerHaptic('success');
                                    toast('Entwickler-Modus aktiviert!', { icon: '🔓' });
                                }
                            }}
                        >
                            Nachhilfebörse FWG Köln
                        </h3>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">Version 2.5.0 (Autumn Edition)</p>
                        <p className="text-xs text-gray-500 mt-1">Entwickelt für das FWG Köln von Oskar H.</p>
                    </div>

                    {showSecretInput && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-left"
                        >
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">SV-Code Einlösen</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="SV-Einladungscode..." 
                                    className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-mono uppercase text-gray-900 dark:text-white"
                                    id="secretCodeInput"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (!val) return;
                                            triggerHaptic('medium');
                                            const { data, error } = await supabase.rpc('redeem_code', { secret_code: val });
                                            if (error) {
                                                console.error(error);
                                                triggerHaptic('error');
                                                toast.error('Fehler beim Einlösen des Codes.');
                                            } else if (data === 'admin') {
                                                triggerHaptic('success');
                                                toast.success('Admin-Rechte freigeschaltet! Lade neu...');
                                                (e.target as HTMLInputElement).value = '';
                                                setTimeout(() => window.location.reload(), 1200);
                                            } else if (data === 'verified') {
                                                triggerHaptic('success');
                                                toast.success('Account verifiziert! Lade neu...');
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
                            <p className="text-[10px] text-gray-400">Gib hier deinen offiziellen SV-Einladungscode ein und bestätige mit Enter.</p>
                        </motion.div>
                    )}
                </Card>
            </motion.div>

            <ChildLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} />
            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
            <ShareDialog type="app" isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
        </motion.div>
    );
}
