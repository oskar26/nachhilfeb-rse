import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import {
    Key,
    Plus,
    Trash2,
    Copy,
    Check,
    RefreshCw,
    X,
    Calendar,
    Users,
    Zap,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface InviteCode {
    id: string;
    code: string;
    is_used: boolean;
    role: 'student' | 'sv_admin' | 'parent';
    created_at: string;
    expires_at: string | null;
    used_by: string | null;
    used_at: string | null;
    used_by_profile?: {
        display_name: string | null;
    } | null;
}

export default function AdminCodes() {
    const [codes, setCodes] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // Generator Options
    const [generateRole, setGenerateRole] = useState<'student' | 'sv_admin' | 'parent'>('student');
    const [batchSize, setBatchSize] = useState<number>(1);
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

    useEffect(() => {
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invite_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // For used codes, resolve who used them
            const codesList = data || [];
            const resolvedCodes = await Promise.all(codesList.map(async (c) => {
                if (c.is_used && c.used_by) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name, first_name, last_name')
                        .eq('id', c.used_by)
                        .single();
                    return {
                        ...c,
                        used_by_profile: profile ? {
                            display_name: profile.display_name || `${profile.first_name} ${profile.last_name}`
                        } : null
                    };
                }
                return c;
            }));

            setCodes(resolvedCodes);
        } catch (error: any) {
            console.error('Error fetching invite codes:', error);
            toast.error('Registrierungscodes konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const generateCodes = async () => {
        setGenerating(true);
        try {
            const adminId = (await supabase.auth.getUser()).data.user?.id;
            const newCodes = [];
            
            for (let i = 0; i < batchSize; i++) {
                const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
                const prefix = generateRole === 'sv_admin' ? 'SV' : generateRole === 'parent' ? 'ELT' : 'SCH';
                const code = `${prefix}-${randomPart}`;
                
                // Expire in 30 days
                const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

                newCodes.push({
                    code,
                    role: generateRole,
                    created_by: adminId,
                    expires_at: expiresAt,
                    is_used: false
                });
            }

            const { error } = await supabase.from('invite_codes').insert(newCodes);
            if (error) throw error;

            toast.success(`${batchSize} Code(s) für die Rolle '${generateRole}' generiert`);
            fetchCodes();
            
            // Audit Log
            await supabase.from('admin_audit_log').insert({
                admin_id: adminId,
                action: 'generate_invite_codes',
                target_type: 'code',
                details: { role: generateRole, count: batchSize }
            });
        } catch (error: any) {
            toast.error('Code-Generierung fehlgeschlagen: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    const deleteCode = async (id: string, codeVal: string) => {
        if (!confirm(`Code ${codeVal} wirklich unwiderruflich löschen?`)) return;
        try {
            const { error } = await supabase
                .from('invite_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Code gelöscht');
            setCodes(codes.filter(c => c.id !== id));

            // Audit
            await supabase.from('admin_audit_log').insert({
                admin_id: (await supabase.auth.getUser()).data.user?.id,
                action: 'delete_invite_code',
                target_type: 'code',
                details: { code: codeVal }
            });
        } catch (error: any) {
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    const handleCopy = (id: string, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCodeId(id);
        toast.success('Code in die Zwischenablage kopiert');
        setTimeout(() => setCopiedCodeId(null), 2000);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Configurator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                {/* Generator settings card */}
                <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 col-span-2">
                    <CardContent className="p-6 space-y-4">
                        <h2 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                            <Key size={18} className="text-primary-hover" />
                            Neue Codes generieren
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Role select */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400">Rolle</label>
                                <select
                                    value={generateRole}
                                    onChange={e => setGenerateRole(e.target.value as any)}
                                    className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm focus:outline-none"
                                >
                                    <option value="student">Schüler / Nachhilfelehrer</option>
                                    <option value="parent">Elternteil</option>
                                    <option value="sv_admin">SV Admin (Vorsicht!)</option>
                                </select>
                            </div>

                            {/* Batch size */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400">Anzahl</label>
                                <select
                                    value={batchSize}
                                    onChange={e => setBatchSize(parseInt(e.target.value))}
                                    className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm focus:outline-none"
                                >
                                    <option value="1">1 Code</option>
                                    <option value="5">5er Batch</option>
                                    <option value="10">10er Batch</option>
                                    <option value="20">20er Batch</option>
                                </select>
                            </div>

                            {/* Submit button */}
                            <div className="flex items-end">
                                <Button
                                    onClick={generateCodes}
                                    disabled={generating}
                                    className="w-full bg-primary text-black font-bold h-10 rounded-xl gap-1.5 flex items-center justify-center"
                                >
                                    <Plus size={16} /> Generieren
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Promo-Codes Info Box */}
                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-yellow-50 to-amber-50/50 dark:from-yellow-950/10 dark:to-transparent border dark:border-yellow-900/30">
                    <CardContent className="p-6 space-y-3">
                        <h3 className="font-bold text-sm text-yellow-800 dark:text-yellow-400 flex items-center gap-1.5">
                            <Zap size={18} />
                            Aktive Promo-Codes
                        </h3>
                        <div className="space-y-2 text-xs text-yellow-900/80 dark:text-yellow-400/80 leading-relaxed">
                            <p>
                                Über Aktionscodes können Nutzer Sondereffekte freischalten.
                            </p>
                            <div className="p-2.5 bg-white dark:bg-gray-900/40 rounded-xl border border-yellow-200/50 dark:border-yellow-900/20">
                                <span className="font-extrabold text-sm block tracking-wider text-yellow-700 dark:text-yellow-500">BANANE</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                                    Boostet Anzeigen für 14 Tage. Geboostete Anzeigen werden im Feed ganz oben und mit einem dezenten goldenen Leuchten dargestellt.
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Codes List */}
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-5 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center shrink-0">
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                            Generierte Einladungscodes ({codes.length})
                        </span>
                        <Button onClick={fetchCodes} variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                        </Button>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center space-y-3">
                            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-xs text-gray-400 font-medium">Lade Codes...</p>
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 italic">
                            Es wurden bisher keine Codes generiert.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-800/20 border-b dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Code</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Rolle</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Ablaufdatum</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800 text-sm">
                                    {codes.map(c => {
                                        const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                                        return (
                                            <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold tracking-wider text-gray-900 dark:text-gray-100">
                                                    {c.code}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                                        c.role === 'sv_admin' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                                                        c.role === 'student' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                                        c.role === 'parent' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    )}>
                                                        {c.role === 'sv_admin' ? 'Admin' : c.role === 'parent' ? 'Elternteil' : 'Schüler'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 font-semibold text-xs">
                                                    {c.expires_at ? (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} className="text-gray-400" />
                                                            {new Date(c.expires_at).toLocaleDateString('de-DE')}
                                                        </span>
                                                    ) : '--'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {c.is_used ? (
                                                        <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">
                                                            Genutzt von <span className="font-bold text-gray-800 dark:text-gray-200">{c.used_by_profile?.display_name || 'Gelöschter User'}</span>
                                                        </span>
                                                    ) : isExpired ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase">Abgelaufen</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Aktiv / Frei</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 rounded-lg"
                                                            onClick={() => handleCopy(c.id, c.code)}
                                                            title="Kopieren"
                                                        >
                                                            {copiedCodeId === c.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                        </Button>
                                                        {!c.is_used && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                                                                onClick={() => deleteCode(c.id, c.code)}
                                                                title="Löschen"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
