import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Users, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface ParentLinkFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ChildProfile {
    id: string;
    full_name: string | null;
    grade_level: string | null;
    parent_link_code: string | null;
}

interface Permissions {
    can_view_ads: boolean;
    can_view_ratings: boolean;
    can_view_activity: boolean;
    can_receive_notifications: boolean;
}

type Step = 1 | 2 | 3;

export default function ParentLinkFlow({ isOpen, onClose, onSuccess }: ParentLinkFlowProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>(1);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
    const [permissions, setPermissions] = useState<Permissions>({
        can_view_ads: true,
        can_view_ratings: true,
        can_view_activity: true,
        can_receive_notifications: true,
    });

    const handleClose = () => {
        setStep(1);
        setCode('');
        setChildProfile(null);
        setPermissions({
            can_view_ads: true,
            can_view_ratings: true,
            can_view_activity: true,
            can_receive_notifications: true,
        });
        onClose();
    };

    const handleCodeLookup = async () => {
        if (code.trim().length < 4) {
            toast.error('Bitte gib einen gültigen Code ein.');
            return;
        }
        setLoading(true);
        try {
            // Try to look up the child by parent_link_code field
            const upperCode = code.trim().toUpperCase();
            let child: ChildProfile | null = null;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, grade_level, parent_link_code')
                .eq('parent_link_code', upperCode)
                .maybeSingle();

            if (error) {
                // Column might not exist; try matching by id prefix
                const { data: fallback } = await supabase
                    .from('profiles')
                    .select('id, full_name, grade_level, parent_link_code')
                    .ilike('id', `${upperCode.toLowerCase()}%`)
                    .limit(1)
                    .maybeSingle();
                child = fallback ?? null;
            } else {
                child = data ?? null;
            }

            if (!child) {
                toast.error('Kein Kind mit diesem Code gefunden.');
                setLoading(false);
                return;
            }

            if (child.id === user?.id) {
                toast.error('Du kannst dein eigenes Konto nicht verknüpfen.');
                setLoading(false);
                return;
            }

            setChildProfile(child);
            setStep(2);
        } catch {
            toast.error('Fehler bei der Suche. Bitte versuche es erneut.');
        }
        setLoading(false);
    };

    const handleConfirmLink = async () => {
        if (!childProfile || !user) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('parent_links').insert({
                parent_id: user.id,
                child_id: childProfile.id,
                status: 'active',
                notify_new_ads: permissions.can_receive_notifications,
                notify_requests: permissions.can_receive_notifications,
                notify_ratings: permissions.can_receive_notifications,
                can_view_ads: permissions.can_view_ads,
                can_view_ratings: permissions.can_view_ratings,
                can_view_activity: permissions.can_view_activity,
                can_receive_notifications: permissions.can_receive_notifications,
            });
            if (error) throw error;
            setStep(3);
        } catch (err: any) {
            if (err?.code === '23505') {
                toast.error('Dieses Kind ist bereits mit deinem Account verknüpft.');
            } else {
                toast.error('Verknüpfung fehlgeschlagen. Bitte versuche es erneut.');
                console.error(err);
            }
        }
        setLoading(false);
    };

    const getInitial = (name: string | null) =>
        name ? name.charAt(0).toUpperCase() : '?';

    const togglePermission = (key: keyof Permissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md w-full">
                {/* Step indicator */}
                {step < 3 && (
                    <div className="flex items-center gap-2 mb-2">
                        {([1, 2] as Step[]).map(s => (
                            <div key={s} className={cn(
                                'flex-1 h-1 rounded-full transition-colors',
                                step >= s ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                            )} />
                        ))}
                    </div>
                )}

                {/* STEP 1: Enter code */}
                {step === 1 && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <KeyRound size={20} className="text-primary" /> Kind verknüpfen
                            </DialogTitle>
                            <DialogDescription>
                                Gib den 6-stelligen Code deines Kindes ein.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-2">
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-xl p-4">
                                <p className="font-semibold mb-1">Wo findet mein Kind den Code?</p>
                                <p className="text-xs leading-relaxed">
                                    Dein Kind findet seinen persönlichen Code unter<br />
                                    <span className="font-mono font-bold">Einstellungen → Eltern-Verknüpfung</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Kind-Code
                                </label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                    placeholder="Z.B. A1B2C3"
                                    maxLength={6}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] focus:ring-2 focus:ring-primary outline-none transition"
                                    onKeyDown={e => e.key === 'Enter' && handleCodeLookup()}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <Button variant="ghost" onClick={handleClose} className="flex-1">
                                Abbrechen
                            </Button>
                            <Button onClick={handleCodeLookup} disabled={loading || code.trim().length < 4} className="flex-1">
                                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                Weiter <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>
                    </>
                )}

                {/* STEP 2: Confirm child details + permissions */}
                {step === 2 && childProfile && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Users size={20} className="text-primary" /> Verknüpfung bestätigen
                            </DialogTitle>
                            <DialogDescription>
                                Überprüfe die Daten und wähle die Berechtigungen.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Child Profile Card */}
                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl mt-2">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                {getInitial(childProfile.full_name)}
                            </div>
                            <div>
                                <p className="font-bold text-lg">{childProfile.full_name ?? 'Unbekannter Nutzer'}</p>
                                {childProfile.grade_level && (
                                    <p className="text-sm text-gray-500">{childProfile.grade_level}</p>
                                )}
                            </div>
                        </div>

                        {/* Permissions */}
                        <div className="space-y-1 mt-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mb-2">
                                Berechtigungen
                            </p>
                            {([
                                { key: 'can_view_ads', label: 'Anzeigen einsehen' },
                                { key: 'can_view_ratings', label: 'Bewertungen einsehen' },
                                { key: 'can_view_activity', label: 'Aktivitäts-Feed einsehen' },
                                { key: 'can_receive_notifications', label: 'Benachrichtigungen erhalten' },
                            ] as { key: keyof Permissions; label: string }[]).map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={permissions[key]}
                                        onChange={() => togglePermission(key)}
                                        className="w-4 h-4 accent-primary rounded"
                                    />
                                    <span className="text-sm font-medium">{label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-2">
                            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                                Zurück
                            </Button>
                            <Button onClick={handleConfirmLink} disabled={loading} className="flex-1">
                                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                Verknüpfung bestätigen
                            </Button>
                        </div>
                    </>
                )}

                {/* STEP 3: Success */}
                {step === 3 && (
                    <div className="text-center py-6 space-y-6">
                        <div className="flex justify-center">
                            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-in zoom-in duration-500">
                                <CheckCircle2 size={52} className="text-green-500 animate-in zoom-in duration-700 delay-100" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Verknüpfung erfolgreich!
                            </h3>
                            <p className="text-gray-500 mt-2 text-sm">
                                Du bist jetzt mit <span className="font-semibold text-gray-800 dark:text-gray-200">{childProfile?.full_name}</span> verknüpft und kannst ihre Aktivitäten im Dashboard verfolgen.
                            </p>
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => {
                                handleClose();
                                onSuccess();
                            }}
                        >
                            Zum Eltern-Dashboard
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
