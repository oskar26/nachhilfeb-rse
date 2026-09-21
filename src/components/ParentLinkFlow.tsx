import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Users, ArrowRight, Loader2, KeyRound, Search, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface ParentLinkFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ChildProfile {
    id: string;
    full_name: string | null;
    grade_level: string | null;
    class_letter?: string | null;
}

interface SearchResult extends ChildProfile {
    birth_date?: string | null;
    display_name?: string | null;
}

interface Permissions {
    can_view_ads: boolean;
    can_view_ratings: boolean;
    can_view_activity: boolean;
    can_receive_notifications: boolean;
}

type Step = 1 | 2 | 3;
type Method = 'code' | 'search';

const DEFAULT_PERMISSIONS: Permissions = {
    can_view_ads: true,
    can_view_ratings: true,
    can_view_activity: true,
    can_receive_notifications: true,
};

export default function ParentLinkFlow({ isOpen, onClose, onSuccess }: ParentLinkFlowProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>(1);
    const [method, setMethod] = useState<Method>('code');
    const [code, setCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchGrade, setSearchGrade] = useState('');
    const [searchBirth, setSearchBirth] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
    const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);

    const reset = () => {
        setStep(1);
        setCode('');
        setSearchQuery('');
        setSearchGrade('');
        setSearchBirth('');
        setSearchResults(null);
        setChildProfile(null);
        setPermissions({ ...DEFAULT_PERMISSIONS });
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleCodeLookup = async () => {
        if (code.trim().length < 4) {
            toast.error('Bitte gib einen gültigen Code ein.');
            return;
        }
        setLoading(true);
        try {
            const upperCode = code.trim().toUpperCase();
            const { data, error } = await api.parentLinks.lookupCode(upperCode);
            if (error) {
                const msg = (error as { message?: string } | null)?.message || 'Kein Kind mit diesem Code gefunden.';
                toast.error(msg.includes('Kein Schülerprofil') ? 'Kein Kind mit diesem Code gefunden.' : 'Suche fehlgeschlagen.');
                setLoading(false);
                return;
            }
            const child = data as ChildProfile | null;
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

    const handleSearch = async () => {
        if (searchQuery.trim() === '' && searchGrade.trim() === '' && searchBirth.trim() === '') {
            toast.error('Bitte gib einen Namen oder eine Klasse ein.');
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await api.parentLinks.searchChildren({
                q: searchQuery.trim() || undefined,
                grade_level: searchGrade.trim() || undefined,
                birth_date: searchBirth.trim() || undefined,
            });
            if (error) {
                toast.error((error as { message?: string } | null)?.message || 'Suche fehlgeschlagen.');
                setSearchResults(null);
                setLoading(false);
                return;
            }
            const results = (data as SearchResult[]) || [];
            if (results.length === 0) {
                toast.error('Kein passendes Profil gefunden. Bitte prüfe die Eingaben.');
            }
            setSearchResults(results);
        } catch {
            toast.error('Fehler bei der Suche. Bitte versuche es erneut.');
        }
        setLoading(false);
    };

    const selectResult = (result: SearchResult) => {
        if (result.id === user?.id) {
            toast.error('Du kannst dein eigenes Konto nicht verknüpfen.');
            return;
        }
        setChildProfile(result);
        setStep(2);
    };

    const handleConfirmLink = async () => {
        if (!childProfile || !user) return;
        setLoading(true);
        try {
            const { error } = await api.parentLinks.create({
                child_id: childProfile.id,
                permissions: { ...permissions },
            });
            if (error) {
                const errObj = (error as { message?: string; status?: number } | null) || {};
                const msg = errObj.message || 'Verknüpfung fehlgeschlagen.';
                if (String(errObj.status) === '409') {
                    toast.error('Dieses Kind ist bereits mit deinem Account verknüpft.');
                } else {
                    toast.error(msg);
                }
                return;
            }
            setStep(3);
        } catch (err) {
            toast.error('Verknüpfung fehlgeschlagen. Bitte versuche es erneut.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getInitial = (name: string | null) =>
        name ? name.charAt(0).toUpperCase() : '?';

    const togglePermission = (key: keyof Permissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            onOpenChange={(open) => { if (!open) handleClose(); }}
        >
            <DialogContent className="max-w-md w-full">
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

                {/* STEP 1: Code oder Direktsuche */}
                {step === 1 && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Users size={20} className="text-primary" /> Kind verknüpfen
                            </DialogTitle>
                            <DialogDescription>
                                Finde das Konto deines Kindes per Code oder über die Schulsuche.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Method tabs */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => setMethod('code')}
                                className={cn(
                                    'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors border',
                                    method === 'code'
                                        ? 'bg-primary text-black border-primary'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                )}
                            >
                                <KeyRound size={16} /> Mit Code
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('search')}
                                className={cn(
                                    'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors border',
                                    method === 'search'
                                        ? 'bg-primary text-black border-primary'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                )}
                            >
                                <Search size={16} /> Direktsuche
                            </button>
                        </div>

                        {method === 'code' ? (
                            <div className="space-y-4 mt-4">
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
                        ) : (
                            <div className="space-y-3 mt-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Name des Kindes
                                    </label>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Z.B. Anna M."
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Klasse
                                        </label>
                                        <input
                                            type="text"
                                            value={searchGrade}
                                            onChange={e => setSearchGrade(e.target.value)}
                                            placeholder="Z.B. 7b"
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Geburtsdatum
                                        </label>
                                        <input
                                            type="date"
                                            value={searchBirth}
                                            onChange={e => setSearchBirth(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    Je genauer die Angaben, desto sicherer wird das richtige Kind gefunden.
                                </p>
                            </div>
                        )}

                        {/* Search results */}
                        {method === 'search' && searchResults && searchResults.length > 0 && (
                            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                                {searchResults.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => selectResult(r)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                            {getInitial(r.full_name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm truncate">{r.full_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {[r.grade_level, r.class_letter].filter(Boolean).join(' · ') || 'Klasse unbekannt'}
                                            </p>
                                        </div>
                                        <ArrowRight size={16} className="text-gray-400 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {method === 'search' && searchResults && searchResults.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-3 italic">Keine Profile gefunden.</p>
                        )}

                        <div className="flex gap-3 mt-4">
                            <Button variant="ghost" onClick={handleClose} className="flex-1">
                                Abbrechen
                            </Button>
                            {method === 'code' ? (
                                <Button onClick={handleCodeLookup} disabled={loading || code.trim().length < 4} className="flex-1">
                                    {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                    Weiter <ArrowRight size={16} className="ml-2" />
                                </Button>
                            ) : (
                                <Button onClick={handleSearch} disabled={loading} className="flex-1">
                                    {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <UserPlus size={16} className="mr-2" />}
                                    Suchen
                                </Button>
                            )}
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

                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl mt-2">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                {getInitial(childProfile.full_name)}
                            </div>
                            <div>
                                <p className="font-bold text-lg">{childProfile.full_name ?? 'Unbekannter Nutzer'}</p>
                                {childProfile.grade_level && (
                                    <p className="text-sm text-gray-500">
                                        {[childProfile.grade_level, childProfile.class_letter].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                        </div>

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
                                Du bist jetzt mit <span className="font-semibold text-gray-800 dark:text-gray-200">{childProfile?.full_name}</span> verknüpft und kannst die Aktivitäten im Dashboard verfolgen.
                            </p>
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => {
                                reset();
                                onClose();
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