import { useTheme } from '../components/ThemeProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Moon, Sun, Monitor, ChevronLeft, Shield, Users, Copy, Check, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

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
        if (!('Notification' in window)) {
            toast.error('Dein Browser unterstützt keine Benachrichtigungen.');
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
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
        if (!confirm('Möchtest du diese Eltern-Verknüpfung wirklich aufheben?')) return;
        try {
            const { error } = await supabase.from('parent_links').delete().eq('id', linkId);
            if (error) throw error;
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
        if (error) toast.error("Fehler beim Speichern");
        else toast.success("Einstellung gespeichert!");
    };

    const childCode = user?.id ? user.id.slice(0, 6).toUpperCase() : '';

    return (
        <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="pl-0">
                    <ChevronLeft className="mr-2" size={20} /> Zurück
                </Button>
                <h1 className="text-2xl font-bold">Einstellungen</h1>
            </div>

            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900">
                <CardHeader>
                    <CardTitle>Erscheinungsbild</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <ThemeBtn
                            active={theme === 'light'}
                            onClick={() => setTheme('light')}
                            icon={<Sun size={24} />}
                            label="Hell"
                        />
                        <ThemeBtn
                            active={theme === 'dark'}
                            onClick={() => setTheme('dark')}
                            icon={<Moon size={24} />}
                            label="Dunkel"
                        />
                        <ThemeBtn
                            active={theme === 'system'}
                            onClick={() => setTheme('system')}
                            icon={<Monitor size={24} />}
                            label="System"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield size={20} className="text-primary"/> Privatsphäre</CardTitle>
                    <CardDescription>Steuere, wer deine direkten Kontaktinformationen auf deinem Profil sehen darf.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? <div className="text-sm text-gray-400">Lade...</div> : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm">E-Mail Adresse zeigen</h4>
                                    <p className="text-xs text-gray-500">Andere FWG-Nutzer sehen deine hinterlegte Mail.</p>
                                </div>
                                <ToggleSwitch checked={settings.email_visible} onChange={() => updateSetting('email_visible')} />
                            </div>
                            <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm">Handynummer zeigen</h4>
                                    <p className="text-xs text-gray-500">Andere FWG-Nutzer sehen deine Nummer.</p>
                                </div>
                                <ToggleSwitch checked={settings.phone_visible} onChange={() => updateSetting('phone_visible')} />
                            </div>
                            <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm">Push-Benachrichtigungen</h4>
                                    <p className="text-xs text-gray-500">Erhalte Infos zu neuen Anfragen.</p>
                                </div>
                                <ToggleSwitch checked={notificationsEnabled} onChange={requestNotifications} />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Parent linking card */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users size={20} className="text-primary" /> Eltern-Verknüpfung
                    </CardTitle>
                    <CardDescription>Teile diesen Code mit deinen Eltern, damit sie dein Profil einsehen können.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border dark:border-gray-800">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Dein Freigabe-Code</span>
                            <span className="font-mono font-bold text-lg tracking-wider">{childCode}</span>
                        </div>
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(childCode);
                                setCopiedCode(true);
                                toast.success("Code kopiert!");
                                setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-9"
                        >
                            {copiedCode ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </Button>
                    </div>

                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Verknüpfte Elternteil-Konten</h4>
                        {parentLinks.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">Keine Elternteile verknüpft.</p>
                        ) : (
                            <div className="space-y-2">
                                {parentLinks.map((link: any) => (
                                    <div key={link.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl text-xs animate-in fade-in">
                                        <div>
                                            <span className="font-bold">{link.parent?.display_name || 'Elternteil'}</span>
                                            <span className="text-gray-400 block text-[10px] mt-0.5">Status: {link.status}</span>
                                        </div>
                                        <Button
                                            onClick={() => handleRemoveParentLink(link.id)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 rounded-lg"
                                        >
                                            <Trash2 size={12} /> Entziehen
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900">
                <CardHeader>
                    <CardTitle 
                        className="cursor-default select-none"
                        onClick={() => {
                            const next = tapCount + 1;
                            setTapCount(next);
                            if (next >= 5) {
                                setShowSecretInput(true);
                                toast('Entwickler-Modus aktiviert!', { icon: '🔓' });
                            }
                        }}
                    >Über die App</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <p>Nachhilfebörse Version 2</p>
                        <p>Entwickelt für das FWG Köln von Oskar H.</p>
                    </div>

                    {showSecretInput && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code-Aktivierung</label>
                            <div className="flex gap-2">
                                <input 
                                    type="password" 
                                    placeholder="Geheimcode eingeben..." 
                                    className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    id="secretCodeInput"
                                    onKeyDown={async (e) => {
                                        if(e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            if(!val) return;
                                            const { data, error } = await supabase.rpc('redeem_code', { secret_code: val });
                                            if(error) {
                                                console.error(error);
                                                toast.error('Fehler beim Aktivieren. Wurde die Migration ausgeführt?');
                                            } else if (data === 'admin') {
                                                toast.success('Admin-Rechte aktiviert! Lade die Seite neu.');
                                                (e.target as HTMLInputElement).value = '';
                                            } else if (data === 'verified') {
                                                toast.success('Account verifiziert! Lade die Seite neu.');
                                                (e.target as HTMLInputElement).value = '';
                                            } else if (data === 'dev') {
                                                toast.success('Entwickler-Features freigeschaltet! (Beta)');
                                                (e.target as HTMLInputElement).value = '';
                                            } else {
                                                toast.error('Code ungültig.');
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400">Bestätige mit Enter.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ThemeBtn({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                active
                    ? "border-primary bg-primary/10 text-primary-hover font-bold"
                    : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
        >
            {icon}
            <span className="text-sm">{label}</span>
        </button>
    );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean, onChange: () => void }) {
    return (
        <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
                <div className={cn("w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors", checked && "bg-primary")}></div>
                <div className={cn("absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform", checked && "translate-x-4")}></div>
            </div>
        </label>
    );
}
