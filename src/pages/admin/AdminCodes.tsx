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
    Calendar,
    Zap,
    Tag,
    ToggleLeft,
    ToggleRight,
    Edit2,
    Save,
    X
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

interface PromoCode {
    id: string;
    code: string;
    effect_type: 'ad_boost' | 'badge' | 'coach_verification' | 'special_discount' | 'custom';
    push_level?: 'standard' | 'super' | 'ultra';
    boost_days: number;
    max_uses: number | null;
    current_uses: number;
    target_group?: string;
    description?: string | null;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}

export default function AdminCodes() {
    const [activeTab, setActiveTab] = useState<'invite' | 'promo'>('promo');
    
    // Invite Codes State
    const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
    const [loadingInvite, setLoadingInvite] = useState(true);
    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [generateRole, setGenerateRole] = useState<'student' | 'sv_admin' | 'parent'>('student');
    const [batchSize, setBatchSize] = useState<number>(1);
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

    // Promo Codes State
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loadingPromo, setLoadingPromo] = useState(true);
    const [creatingPromo, setCreatingPromo] = useState(false);

    // Promo Code Form
    const [newPromoCode, setNewPromoCode] = useState('');
    const [effectType, setEffectType] = useState<'ad_boost' | 'badge' | 'coach_verification' | 'special_discount' | 'custom'>('ad_boost');
    const [pushLevel, setPushLevel] = useState<'standard' | 'super' | 'ultra'>('super');
    const [boostDays, setBoostDays] = useState<number>(14);
    const [maxUses, setMaxUses] = useState<string>('');
    const [targetGroup, setTargetGroup] = useState<string>('all');
    const [description, setDescription] = useState<string>('');
    const [expiryDays, setExpiryDays] = useState<string>('30');

    useEffect(() => {
        fetchInviteCodes();
        fetchPromoCodes();
    }, []);

    const fetchInviteCodes = async () => {
        setLoadingInvite(true);
        try {
            const { data, error } = await supabase
                .from('invite_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
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

            setInviteCodes(resolvedCodes);
        } catch (error: any) {
            console.error('Error fetching invite codes:', error);
        } finally {
            setLoadingInvite(false);
        }
    };

    const fetchPromoCodes = async () => {
        setLoadingPromo(true);
        try {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    setPromoCodes([]);
                    return;
                }
                throw error;
            }
            setPromoCodes(data || []);
        } catch (error: any) {
            console.error('Error fetching promo codes:', error);
            toast.error('Promo-Codes konnten nicht geladen werden.');
        } finally {
            setLoadingPromo(false);
        }
    };

    const generateInviteCodes = async () => {
        setGeneratingInvite(true);
        try {
            const adminId = (await supabase.auth.getUser()).data.user?.id;
            const newCodes = [];
            
            for (let i = 0; i < batchSize; i++) {
                const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
                const prefix = generateRole === 'sv_admin' ? 'SV' : generateRole === 'parent' ? 'ELT' : 'SCH';
                const code = `${prefix}-${randomPart}`;
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

            toast.success(`${batchSize} Einladungscode(s) generiert`);
            fetchInviteCodes();
        } catch (error: any) {
            toast.error('Code-Generierung fehlgeschlagen: ' + error.message);
        } finally {
            setGeneratingInvite(false);
        }
    };

    const handleCreatePromoCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const codeClean = newPromoCode.trim().toUpperCase();
        if (!codeClean) {
            toast.error('Bitte einen Code eingeben.');
            return;
        }

        setCreatingPromo(true);
        try {
            const expiresAt = expiryDays ? new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString() : null;
            const parsedMaxUses = maxUses ? parseInt(maxUses) : null;

            const { error } = await supabase.from('promo_codes').insert({
                code: codeClean,
                effect_type: effectType,
                push_level: pushLevel,
                boost_days: boostDays,
                max_uses: parsedMaxUses,
                target_group: targetGroup,
                description: description.trim() || null,
                expires_at: expiresAt,
                is_active: true
            });

            if (error) throw error;

            toast.success(`Promo-Code '${codeClean}' erfolgreich angelegt!`);
            setNewPromoCode('');
            setMaxUses('');
            setDescription('');
            fetchPromoCodes();
        } catch (error: any) {
            toast.error('Fehler beim Erstellen des Promo-Codes: ' + error.message);
        } finally {
            setCreatingPromo(false);
        }
    };

    const togglePromoActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('promo_codes')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
            toast.success(!currentStatus ? 'Promo-Code aktiviert' : 'Promo-Code deaktiviert');
        } catch (error: any) {
            toast.error('Änderung fehlgeschlagen: ' + error.message);
        }
    };

    const deletePromoCode = async (id: string, codeVal: string) => {
        if (!confirm(`Promo-Code "${codeVal}" wirklich löschen?`)) return;
        try {
            const { error } = await supabase
                .from('promo_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setPromoCodes(prev => prev.filter(p => p.id !== id));
            toast.success('Promo-Code gelöscht');
        } catch (error: any) {
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    const deleteInviteCode = async (id: string, codeVal: string) => {
        if (!confirm(`Einladungscode "${codeVal}" wirklich löschen?`)) return;
        try {
            const { error } = await supabase
                .from('invite_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setInviteCodes(prev => prev.filter(c => c.id !== id));
            toast.success('Code gelöscht');
        } catch (error: any) {
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    const handleCopy = (id: string, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCodeId(id);
        toast.success('Code kopiert!');
        setTimeout(() => setCopiedCodeId(null), 2000);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Navigation Tabs */}
            <div className="flex items-center justify-between border-b dark:border-gray-800 pb-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('promo')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all",
                            activeTab === 'promo'
                                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                    >
                        <Zap size={16} /> Aktions- & Promo-Codes
                    </button>
                    <button
                        onClick={() => setActiveTab('invite')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all",
                            activeTab === 'invite'
                                ? "bg-primary text-black shadow-md"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                    >
                        <Key size={16} /> Registrierungs-Einladungen
                    </button>
                </div>
            </div>

            {/* TAB 1: PROMO CODES */}
            {activeTab === 'promo' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Form */}
                        <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 col-span-2">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                        <Tag size={18} className="text-amber-500" />
                                        Neuen Promo-Code konfigurieren & erstellen
                                    </h2>
                                </div>

                                {/* Presets / Schnellvorlagen */}
                                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">Schnell-Vorlagen:</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewPromoCode('COACHING-AG');
                                            setEffectType('coach_verification');
                                            setPushLevel('super');
                                            setBoostDays(30);
                                            setMaxUses('');
                                            setTargetGroup('coach');
                                            setDescription('Schüler-Coaching AG: Verifizierung + Super-Boost');
                                            setExpiryDays('365');
                                            toast.success("Vorlage 'Schüler-Coaching AG' geladen!");
                                        }}
                                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-200/70 hover:bg-amber-200 text-amber-950 dark:bg-amber-900/50 dark:text-amber-200 transition-colors cursor-pointer"
                                    >
                                        Schüler-Coaching AG (COACHING-AG)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewPromoCode('banane');
                                            setEffectType('ad_boost');
                                            setPushLevel('standard');
                                            setBoostDays(14);
                                            setMaxUses('50');
                                            setTargetGroup('all');
                                            setDescription('FWG Empfehlungscode: 14 Tage Anzeigen-Push');
                                            setExpiryDays('365');
                                            toast.success("Vorlage 'banane' geladen!");
                                        }}
                                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-yellow-200/70 hover:bg-yellow-200 text-yellow-950 dark:bg-yellow-900/50 dark:text-yellow-200 transition-colors cursor-pointer"
                                    >
                                        Empfehlungscode (banane)
                                    </button>
                                </div>

                                <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Code-Name</label>
                                        <input
                                            type="text"
                                            placeholder="z.B. COACHING-AG, BANANE, FWGSPECIAL"
                                            value={newPromoCode}
                                            onChange={e => setNewPromoCode(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Effekt / Belohnung</label>
                                        <select
                                            value={effectType}
                                            onChange={e => setEffectType(e.target.value as any)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-medium focus:outline-none"
                                        >
                                            <option value="ad_boost">Anzeigen-Push (Highlights im Feed)</option>
                                            <option value="coach_verification">Schüler-Coaching Mitgliedschaft & Verifikation</option>
                                            <option value="badge">Exklusiver Profil-Badge & Verifiziert</option>
                                            <option value="special_discount">Sonderaktions-Rabatt</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Push-Intensität / Boost-Stufe</label>
                                        <select
                                            value={pushLevel}
                                            onChange={e => setPushLevel(e.target.value as any)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-medium focus:outline-none"
                                        >
                                            <option value="standard">Standard Push (+25% Sichtbarkeit)</option>
                                            <option value="super">Super Boost (Goldener Rahmen & Feed-Highlight)</option>
                                            <option value="ultra">Ultra Push (Ganz oben angepinnt & Sofort-Push)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Boost-Dauer (Tage)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={boostDays}
                                            onChange={e => setBoostDays(parseInt(e.target.value) || 14)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-medium focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Max. Nutzungen (Leer = Unbegrenzt)</label>
                                        <input
                                            type="number"
                                            placeholder="z.B. 50 (leer lassen für unbegrenzt)"
                                            value={maxUses}
                                            onChange={e => setMaxUses(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-medium focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Zielgruppe</label>
                                        <select
                                            value={targetGroup}
                                            onChange={e => setTargetGroup(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-medium focus:outline-none"
                                        >
                                            <option value="all">Alle Schüler (Standard)</option>
                                            <option value="coach">Schüler-Coaching AG (5./6. Klasse Tutoren)</option>
                                            <option value="tutor">Nur Nachhilfe-Anbieter</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Interne Notiz / Beschreibung</label>
                                        <input
                                            type="text"
                                            placeholder="z.B. Erstellt für Frau Balistreris Schüler-Coaches"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-medium focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Gültigkeitsdauer</label>
                                        <select
                                            value={expiryDays}
                                            onChange={e => setExpiryDays(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm font-medium focus:outline-none"
                                        >
                                            <option value="7">7 Tage gültig</option>
                                            <option value="14">14 Tage gültig</option>
                                            <option value="30">30 Tage gültig</option>
                                            <option value="90">90 Tage gültig</option>
                                            <option value="365">1 Jahr gültig</option>
                                            <option value="">Unbegrenzt gültig</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 pt-2">
                                        <Button
                                            type="submit"
                                            disabled={creatingPromo}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-10 rounded-xl gap-2 flex items-center justify-center shadow-md shadow-amber-500/10 cursor-pointer"
                                        >
                                            <Plus size={16} /> Promo-Code anlegen & aktivieren
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Info card */}
                        <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-transparent border dark:border-amber-900/30">
                            <CardContent className="p-6 space-y-3">
                                <h3 className="font-bold text-sm text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                                    <Zap size={18} />
                                    Promo-Code Steuerung
                                </h3>
                                <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                                    Aktionscodes ermöglichen es Nutzern, ihre Nachhilfeanzeigen hervorzuheben oder exklusive Vorteile freizuschalten.
                                </p>
                                <div className="p-3 bg-white/80 dark:bg-gray-900/60 rounded-2xl border border-amber-200/60 dark:border-amber-900/30 text-xs space-y-1">
                                    <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                        <Zap size={13} /> Konfigurierbare Parameter:
                                    </span>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                        • Frei wählbarer Push-Grad (Standard, Super, Ultra)<br />
                                        • Zielgruppen-Filterung (z.B. Coaching AG)<br />
                                        • Status jederzeit per Klick umschaltbar oder löschbar<br />
                                        • Automatische Limits & Verfallsdaten
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Table */}
                    <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-5 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                    Eingerichtete Promo-Codes ({promoCodes.length})
                                </span>
                                <Button onClick={fetchPromoCodes} variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                                    <RefreshCw size={14} className={cn(loadingPromo && 'animate-spin')} />
                                </Button>
                            </div>

                            {loadingPromo ? (
                                <div className="py-16 text-center">
                                    <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </div>
                            ) : promoCodes.length === 0 ? (
                                <div className="py-16 text-center text-gray-400 text-xs italic">
                                    Noch keine Promo-Codes vorhanden. Erstelle oben den ersten Code!
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-gray-50 dark:bg-gray-800/30 border-b dark:border-gray-800 font-bold uppercase text-gray-400">
                                            <tr>
                                                <th className="px-6 py-3.5">Code</th>
                                                <th className="px-6 py-3.5">Effekt & Push</th>
                                                <th className="px-6 py-3.5">Zielgruppe / Notiz</th>
                                                <th className="px-6 py-3.5">Nutzungen</th>
                                                <th className="px-6 py-3.5">Ablaufdatum</th>
                                                <th className="px-6 py-3.5">Status</th>
                                                <th className="px-6 py-3.5 text-right">Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {promoCodes.map(p => {
                                                const isExpired = p.expires_at ? new Date(p.expires_at) < new Date() : false;
                                                const isLimitReached = p.max_uses !== null && p.current_uses >= p.max_uses;

                                                return (
                                                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="px-6 py-4 font-mono font-extrabold tracking-wider text-sm text-gray-900 dark:text-white">
                                                            {p.code}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium space-y-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-bold text-[10px]">
                                                                    {p.boost_days} Tage Boost
                                                                </span>
                                                                {p.push_level && (
                                                                    <span className={cn(
                                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                                        p.push_level === 'ultra' ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" :
                                                                        p.push_level === 'super' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300" :
                                                                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                                    )}>
                                                                        {p.push_level}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 block font-semibold">
                                                                {p.effect_type === 'coach_verification' ? 'Schüler-Coaching AG' : p.effect_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium">
                                                            <div className="space-y-0.5">
                                                                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                                                                    {p.target_group === 'coach' ? 'Schüler-Coaching AG' : p.target_group === 'tutor' ? 'Nur Anbieter' : 'Alle'}
                                                                </span>
                                                                {p.description && (
                                                                    <p className="text-xs text-gray-500 italic line-clamp-1">{p.description}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">
                                                            {p.current_uses} {p.max_uses !== null ? `/ ${p.max_uses}` : '(Unbegrenzt)'}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                                            {p.expires_at ? new Date(p.expires_at).toLocaleDateString('de-DE') : 'Dauerhaft'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {!p.is_active ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold">Inaktiv</span>
                                                            ) : isExpired ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Abgelaufen</span>
                                                            ) : isLimitReached ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">Limit erreicht</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Aktiv</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 rounded-lg cursor-pointer"
                                                                    onClick={() => togglePromoActive(p.id, p.is_active)}
                                                                    title={p.is_active ? 'Deaktivieren' : 'Aktivieren'}
                                                                >
                                                                    {p.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-400" />}
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 rounded-lg cursor-pointer"
                                                                    onClick={() => handleCopy(p.id, p.code)}
                                                                    title="Kopieren"
                                                                >
                                                                    {copiedCodeId === p.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                                                    onClick={() => deletePromoCode(p.id, p.code)}
                                                                    title="Löschen"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </Button>
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
            )}

            {/* TAB 2: INVITE CODES */}
            {activeTab === 'invite' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 col-span-2">
                            <CardContent className="p-6 space-y-4">
                                <h2 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                    <Key size={18} className="text-primary-hover" />
                                    Neue Registrierungscodes generieren
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                                    <div className="flex items-end">
                                        <Button
                                            onClick={generateInviteCodes}
                                            disabled={generatingInvite}
                                            className="w-full bg-primary text-black font-bold h-10 rounded-xl gap-1.5 flex items-center justify-center"
                                        >
                                            <Plus size={16} /> Generieren
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Invite Codes Table */}
                    <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-5 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                    Einladungscodes ({inviteCodes.length})
                                </span>
                                <Button onClick={fetchInviteCodes} variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                                    <RefreshCw size={14} className={cn(loadingInvite && 'animate-spin')} />
                                </Button>
                            </div>

                            {loadingInvite ? (
                                <div className="py-16 text-center">
                                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                </div>
                            ) : inviteCodes.length === 0 ? (
                                <div className="py-16 text-center text-gray-400 text-xs italic">
                                    Es wurden bisher keine Einladungscodes generiert.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-gray-50 dark:bg-gray-800/30 border-b dark:border-gray-800 font-bold uppercase text-gray-400">
                                            <tr>
                                                <th className="px-6 py-3.5">Code</th>
                                                <th className="px-6 py-3.5">Rolle</th>
                                                <th className="px-6 py-3.5">Ablaufdatum</th>
                                                <th className="px-6 py-3.5">Status</th>
                                                <th className="px-6 py-3.5 text-right">Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {inviteCodes.map(c => {
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
                                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                                            {c.expires_at ? new Date(c.expires_at).toLocaleDateString('de-DE') : '--'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {c.is_used ? (
                                                                <span className="text-gray-500 font-medium">
                                                                    Genutzt von <span className="font-bold text-gray-800 dark:text-gray-200">{c.used_by_profile?.display_name || 'User'}</span>
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
                                                                        onClick={() => deleteInviteCode(c.id, c.code)}
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
            )}
        </div>
    );
}
