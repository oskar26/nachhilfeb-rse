import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
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
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import {
    Key,
    Plus,
    Trash2,
    Copy,
    Check,
    RefreshCw,
    Zap,
    Tag,
    ToggleLeft,
    ToggleRight,
    Users,
    UserMinus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

interface InviteCode {
    id: string;
    code: string;
    is_used: boolean;
    role: 'student' | 'sv_admin' | 'coach_admin' | 'parent';
    max_uses: number | null;
    current_uses: number;
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
    const [activeTab, setActiveTab] = useState<'invite' | 'promo'>('invite');
    const rootRef = useRef<HTMLDivElement>(null);
    
    // Invite Codes State
    const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
    const [loadingInvite, setLoadingInvite] = useState(true);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [generateRole, setGenerateRole] = useState<'student' | 'sv_admin' | 'coach_admin' | 'parent'>('student');
    const [batchSize, setBatchSize] = useState<number>(1);
    const [inviteExpiryDays, setInviteExpiryDays] = useState<string>('14');
    const [inviteMaxUses, setInviteMaxUses] = useState<string>('1');
    const [generatedInviteCodes, setGeneratedInviteCodes] = useState<{ code: string; role: string; expires_at?: string }[]>([]);
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

    // Promo Codes State
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loadingPromo, setLoadingPromo] = useState(true);
    const [promoError, setPromoError] = useState<string | null>(null);
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

    // Promo Redemptions (User perks)
    const [redemptions, setRedemptions] = useState<any[]>([]);
    const [loadingRedemptions, setLoadingRedemptions] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        description: string;
        confirmLabel: string;
        onConfirm: () => void;
    } | null>(null);

    useEffect(() => {
        rootRef.current?.scrollIntoView({ block: 'start' });
    }, [activeTab]);

    useEffect(() => {
        fetchInviteCodes();
        fetchPromoCodes();
        fetchRedemptions();
    }, []);

    const fetchRedemptions = async () => {
        setLoadingRedemptions(true);
        try {
            const res = await api.promo_codes.listRedemptions();
            if (res.data) setRedemptions(res.data);
        } catch (e: any) {
            console.error('Error fetching redemptions', e);
        } finally {
            setLoadingRedemptions(false);
        }
    };

    const handleRevoke = (redemptionId: string, userName: string, codeName: string) => {
        setConfirmAction({
            title: 'Vorteil entziehen?',
            description: `Möchtest du ${userName} den Vorteil für Code "${codeName}" wirklich entziehen?`,
            confirmLabel: 'Entziehen',
            onConfirm: async () => {
                try {
                    await api.promo_codes.revoke({ redemption_id: redemptionId });
                    toast.success(`Promo-Vorteil für ${userName} wurde entzogen.`);
                    fetchRedemptions();
                } catch (e: any) {
                    toast.error('Fehler: ' + e.message);
                }
            },
        });
    };

    const fetchInviteCodes = async () => {
        setLoadingInvite(true);
        setInviteError(null);
        try {
            const { data, error } = await api.codes.list();

            if (error) throw error;
            
            const codesList = data || [];
            // Eingebettetes user_name aus codes.php nutzen statt N+1-Profilabfragen.
            const resolvedCodes = codesList.map((c: any) => {
                if (c.is_used && c.used_by) {
                    return {
                        ...c,
                        used_by_profile: c.user_name ? {
                            display_name: c.user_name
                        } : null
                    };
                }
                return c;
            });

            setInviteCodes(resolvedCodes);
        } catch (error: any) {
            console.error('Error fetching invite codes:', error);
            setInviteError('Einladungscodes konnten nicht geladen werden.');
        } finally {
            setLoadingInvite(false);
        }
    };

    const fetchPromoCodes = async () => {
        setLoadingPromo(true);
        setPromoError(null);
        try {
            const { data, error } = await api.promo_codes.list();

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
            setPromoError('Promo-Codes konnten nicht geladen werden.');
            toast.error('Promo-Codes konnten nicht geladen werden.');
        } finally {
            setLoadingPromo(false);
        }
    };

    const generateInviteCodes = async () => {
        setGeneratingInvite(true);
        setGeneratedInviteCodes([]);
        try {
            // Echte serverseitige Generierung (kryptografisch sichere Codes via
            // random_bytes, mit Ablaufdatum + Audit-Log) – siehe codes.php.
            const maxUses = inviteMaxUses === 'unlimited' ? null : parseInt(inviteMaxUses) || 1;
            const res = await api.codes.generate(batchSize, generateRole, undefined, parseInt(inviteExpiryDays) || 14, maxUses);
            if (res.error) throw new Error(res.error.message || 'Generierung fehlgeschlagen');
            const codes = res.data?.codes || [];
            setGeneratedInviteCodes(codes);
            toast.success(`${codes.length} Einladungscode(s) generiert – jetzt kopieren & verschicken!`);
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

            // Payload 1:1 wie bisher (inkl. is_active; codes.php setzt den Wert selbst auf 1).
            const { error } = await api.promo_codes.create({
                code: codeClean,
                effect_type: effectType,
                push_level: pushLevel,
                boost_days: boostDays,
                max_uses: parsedMaxUses,
                target_group: targetGroup,
                description: description.trim() || null,
                expires_at: expiresAt,
                is_active: true
            } as any);

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
            const { error } = await api.promo_codes.toggle(id, !currentStatus);

            if (error) throw error;

            setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
            toast.success(!currentStatus ? 'Promo-Code aktiviert' : 'Promo-Code deaktiviert');
        } catch (error: any) {
            toast.error('Änderung fehlgeschlagen: ' + error.message);
        }
    };

    const deletePromoCode = (id: string, codeVal: string) => {
        setConfirmAction({
            title: 'Promo-Code löschen?',
            description: `Promo-Code "${codeVal}" wird endgültig gelöscht.`,
            confirmLabel: 'Löschen',
            onConfirm: async () => {
                try {
                    const { error } = await api.promo_codes.delete(id);

                    if (error) throw error;

                    setPromoCodes(prev => prev.filter(p => p.id !== id));
                    toast.success('Promo-Code gelöscht');
                } catch (error: any) {
                    toast.error('Löschen fehlgeschlagen: ' + error.message);
                }
            },
        });
    };

    const deleteInviteCode = (id: string, codeVal: string) => {
        setConfirmAction({
            title: 'Einladungscode löschen?',
            description: `Einladungscode "${codeVal}" wird endgültig gelöscht.`,
            confirmLabel: 'Löschen',
            onConfirm: async () => {
                try {
                    const { error } = await api.codes.deleteInvite(id);

                    if (error) throw error;

                    setInviteCodes(prev => prev.filter(c => c.id !== id));
                    toast.success('Code gelöscht');
                } catch (error: any) {
                    toast.error('Löschen fehlgeschlagen: ' + error.message);
                }
            },
        });
    };

    const handleCopy = (id: string, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCodeId(id);
        toast.success('Code kopiert!');
        setTimeout(() => setCopiedCodeId(null), 2000);
    };

    return (
        <div ref={rootRef} className="scroll-mt-16 space-y-6">
            {/* Top Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'invite' | 'promo')}>
                <TabsList aria-label="Code-Bereich" className="!h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-fit">
                    <TabsTrigger value="invite" className="min-h-11 w-full flex-none justify-start whitespace-normal px-4 text-sm font-medium lg:w-auto">
                        <Key size={16} aria-hidden /> Registrierungs-Einladungen
                    </TabsTrigger>
                    <TabsTrigger value="promo" className="min-h-11 w-full flex-none justify-start whitespace-normal px-4 text-sm font-medium lg:w-auto">
                        <Zap size={16} aria-hidden /> Aktions- & Promo-Codes
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* TAB 1: PROMO CODES */}
            {activeTab === 'promo' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
                        {/* Form */}
                        <Card className="2xl:col-span-2">
                            <CardContent className="space-y-4 p-4 sm:p-6">
                                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Tag size={20} className="text-foreground" aria-hidden />
                                    Neuen Promo-Code konfigurieren & erstellen
                                </h2>

                                {/* Presets / Schnellvorlagen */}
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted p-3">
                                    <span className="text-xs font-medium text-foreground">Schnell-Vorlagen:</span>
                                    <Button variant="secondary" size="sm"
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
                                        className="h-11 px-3 text-xs"
                                    >
                                        Schüler-Coaching AG (COACHING-AG)
                                    </Button>
                                </div>

                                <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="promo-code" className="text-sm font-medium">Code-Name</Label>
                                        <Input
                                            id="promo-code"
                                            type="text"
                                            placeholder="z.B. COACHING-AG, FWGSPECIAL, HERBST26"
                                            value={newPromoCode}
                                            onChange={e => setNewPromoCode(e.target.value)}
                                            className="font-semibold tracking-normal"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5 lg:col-span-2">
                                        <Label htmlFor="promo-effect" className="text-sm font-medium">Effekt / Belohnung</Label>
                                        <NativeSelect
                                            id="promo-effect"
                                            value={effectType}
                                            onChange={e => setEffectType(e.target.value as any)}
                                            className="w-full"
                                        >
                                            <option value="ad_boost">Anzeigen-Push (Highlights im Feed)</option>
                                            <option value="coach_verification">Schüler-Coaching Mitgliedschaft & Verifikation</option>
                                            <option value="badge">Exklusiver Profil-Badge & Verifiziert</option>
                                            <option value="special_discount">Sonderaktions-Rabatt</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="space-y-1.5 lg:col-span-2">
                                        <Label htmlFor="promo-push" className="text-sm font-medium">Push-Intensität / Boost-Stufe</Label>
                                        <NativeSelect
                                            id="promo-push"
                                            value={pushLevel}
                                            onChange={e => setPushLevel(e.target.value as any)}
                                            className="w-full"
                                        >
                                            <option value="standard">Standard Push (+25% Sichtbarkeit)</option>
                                            <option value="super">Super Boost (Goldener Rahmen & Feed-Highlight)</option>
                                            <option value="ultra">Ultra Push (Ganz oben angepinnt & Sofort-Push)</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="promo-boost-days" className="text-sm font-medium">Boost-Dauer (Tage)</Label>
                                        <Input
                                            id="promo-boost-days"
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={boostDays}
                                            onChange={e => setBoostDays(parseInt(e.target.value) || 14)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="promo-max-uses" className="text-sm font-medium">Max. Nutzungen (Leer = Unbegrenzt)</Label>
                                        <Input
                                            id="promo-max-uses"
                                            type="number"
                                            placeholder="z.B. 50 (leer lassen für unbegrenzt)"
                                            value={maxUses}
                                            onChange={e => setMaxUses(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5 lg:col-span-2">
                                        <Label htmlFor="promo-target" className="text-sm font-medium">Zielgruppe</Label>
                                        <NativeSelect
                                            id="promo-target"
                                            value={targetGroup}
                                            onChange={e => setTargetGroup(e.target.value)}
                                            className="w-full"
                                        >
                                            <option value="all">Alle Schüler (Standard)</option>
                                            <option value="coach">Schüler-Coaching AG (5./6. Klasse Tutoren)</option>
                                            <option value="tutor">Nur Nachhilfe-Anbieter</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="promo-description" className="text-sm font-medium">Interne Notiz / Beschreibung</Label>
                                        <Input
                                            id="promo-description"
                                            type="text"
                                            placeholder="z.B. Erstellt für Frau Balistreris Schüler-Coaches"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="promo-expiry" className="text-sm font-medium">Gültigkeitsdauer</Label>
                                        <NativeSelect
                                            id="promo-expiry"
                                            value={expiryDays}
                                            onChange={e => setExpiryDays(e.target.value)}
                                            className="w-full"
                                        >
                                            <option value="7">7 Tage gültig</option>
                                            <option value="14">14 Tage gültig</option>
                                            <option value="30">30 Tage gültig</option>
                                            <option value="90">90 Tage gültig</option>
                                            <option value="365">1 Jahr gültig</option>
                                            <option value="">Unbegrenzt gültig</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="pt-2 md:col-span-2">
                                        <Button
                                            type="submit"
                                            disabled={creatingPromo}
                                            className="h-11 w-full gap-2"
                                        >
                                            <Plus size={16} aria-hidden /> Promo-Code anlegen & aktivieren
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Active Promo Users & Perk Revocation */}
                        <Card className="flex flex-col ">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-muted-foreground" aria-hidden />
                                    <span className="text-xs font-medium text-foreground">
                                        Promo-Nutzer ({redemptions.length})
                                    </span>
                                </div>
                                <Button onClick={fetchRedemptions} variant="ghost" size="icon" className="h-11 w-11" title="Aktualisieren" aria-label="Promo-Nutzer aktualisieren">
                                    <RefreshCw size={16} className={cn(loadingRedemptions && 'animate-spin')} aria-hidden />
                                </Button>
                            </div>
                            <CardContent className="max-h-[380px] flex-1 overflow-y-auto p-0">
                                {loadingRedemptions ? (
                                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                                        <Spinner className="size-4" /> Lade Nutzer...
                                    </div>
                                ) : redemptions.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        Noch keine eingelösten Promo-Codes vorhanden.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {redemptions.map((r) => (
                                            <div key={r.id} className="flex items-center justify-between gap-2 p-3.5">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="break-words text-xs font-semibold text-foreground">
                                                            {r.user_name || r.user_email || 'Nutzer'}
                                                        </span>
                                                        {r.user_grade && (
                                                            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                                                Kl. {r.user_grade}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                        <span className="rounded-md bg-muted px-2 py-1 tabular-nums text-xs font-medium text-foreground">
                                                            {r.code}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(r.redeemed_at).toLocaleDateString('de-DE')}
                                                        </span>
                                                        {r.is_revoked && (
                                                            <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                                                                Entzogen
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {!r.is_revoked ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRevoke(r.id, r.user_name || 'diesem Nutzer', r.code)}
                                                        className="h-11 shrink-0 px-2.5 text-xs text-destructive"
                                                        title="Promo-Vorteil entziehen"
                                                    >
                                                        <UserMinus size={16} aria-hidden />
                                                        Entziehen
                                                    </Button>
                                                ) : (
                                                    <span className="shrink-0 px-2 py-1 text-xs font-medium text-muted-foreground">Inaktiv</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Promo-Codes */}
                    <Card className="">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                                <span className="text-sm font-semibold text-foreground">
                                    Eingerichtete Promo-Codes ({promoCodes.length})
                                </span>
                                <Button onClick={fetchPromoCodes} variant="ghost" size="icon" className="h-11 w-11" aria-label="Promo-Codes aktualisieren">
                                    <RefreshCw size={16} className={cn(loadingPromo && 'animate-spin')} aria-hidden />
                                </Button>
                            </div>

                            {promoError && (
                                <div className="p-4">
                                    <Alert variant="destructive">
                                        <AlertTitle>Promo-Codes nicht verfügbar</AlertTitle>
                                        <AlertDescription className="flex flex-col items-start gap-3">
                                            <span>{promoError}</span>
                                            <Button type="button" variant="outline" className="h-11" onClick={fetchPromoCodes}>
                                                Erneut laden
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {promoError ? null : loadingPromo ? (
                                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                                    <Spinner className="size-5" /> Lade Promo-Codes...
                                </div>
                            ) : promoCodes.length === 0 ? (
                                <div className="py-16 text-center text-sm text-muted-foreground">
                                    Noch keine Promo-Codes vorhanden. Erstelle oben den ersten Code!
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {promoCodes.map(p => {
                                        const isExpired = p.expires_at ? new Date(p.expires_at) < new Date() : false;
                                        const isLimitReached = p.max_uses !== null && p.current_uses >= p.max_uses;

                                        return (
                                            <li key={p.id} className="space-y-2.5 p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="break-all tabular-nums text-sm font-semibold tracking-wider text-foreground">
                                                            {p.code}
                                                        </div>
                                                        <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                                                            {p.effect_type === 'coach_verification' ? 'Schüler-Coaching AG' : p.effect_type}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {!p.is_active ? (
                                                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Inaktiv</span>
                                                        ) : isExpired ? (
                                                            <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">Abgelaufen</span>
                                                        ) : isLimitReached ? (
                                                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">Limit erreicht</span>
                                                        ) : (
                                                            <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Aktiv</span>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-11 w-11"
                                                            onClick={() => togglePromoActive(p.id, p.is_active)}
                                                            title={p.is_active ? 'Deaktivieren' : 'Aktivieren'}
                                                            aria-label={p.is_active ? 'Promo-Code deaktivieren' : 'Promo-Code aktivieren'}
                                                        >
                                                            {p.is_active ? <ToggleRight size={20} className="text-emerald-700 dark:text-emerald-400" /> : <ToggleLeft size={20} className="text-muted-foreground" />}
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-11 w-11"
                                                            onClick={() => handleCopy(p.id, p.code)}
                                                            title="Kopieren"
                                                            aria-label="Promo-Code kopieren"
                                                        >
                                                            {copiedCodeId === p.id ? <Check size={16} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={16} />}
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            className="h-11 w-11"
                                                            onClick={() => deletePromoCode(p.id, p.code)}
                                                            title="Löschen"
                                                            aria-label="Promo-Code löschen"
                                                        >
                                                            <Trash2 size={16} aria-hidden />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                                                        {p.boost_days} Tage Boost
                                                    </span>
                                                    {p.push_level && (
                                                        <span className={cn(
                                                            'rounded-md px-2.5 py-1 text-xs font-medium capitalize',
                                                            p.push_level === 'ultra' ? 'bg-muted text-foreground' :
                                                            p.push_level === 'super' ? 'bg-muted text-foreground' :
                                                            'bg-muted text-muted-foreground'
                                                        )}>
                                                            {p.push_level}
                                                        </span>
                                                    )}
                                                    <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                        {p.target_group === 'coach' ? 'Schüler-Coaching AG' : p.target_group === 'tutor' ? 'Nur Anbieter' : 'Alle'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    <span className="font-medium tabular-nums text-foreground">
                                                        Nutzungen: {p.current_uses} {p.max_uses !== null ? `/ ${p.max_uses}` : '(Unbegrenzt)'}
                                                    </span>
                                                    <span>Ablaufdatum: {p.expires_at ? new Date(p.expires_at).toLocaleDateString('de-DE') : 'Dauerhaft'}</span>
                                                    {p.description && (
                                                        <span className="min-w-0 break-words italic">{p.description}</span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 2: INVITE CODES */}
            {activeTab === 'invite' && (
                <div className="space-y-6">
                    <Card className="w-full ">
                            <CardContent className="space-y-4 p-4 sm:p-6">
                                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Key size={20} className="text-foreground" aria-hidden />
                                    Neue Registrierungscodes generieren
                                </h2>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-role" className="text-sm font-medium">Rolle</Label>
                                        <NativeSelect
                                            id="invite-role"
                                            value={generateRole}
                                            onChange={e => setGenerateRole(e.target.value as any)}
                                            className="w-full"
                                        >
                                            <option value="student">Schüler / Nachhilfelehrer</option>
                                            <option value="parent">Elternteil</option>
                                            <option value="coach_admin">Coaching-Admin (z. B. Frau Balistreri)</option>
                                            <option value="sv_admin">SV Admin (Vorsicht!)</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-batch" className="text-sm font-medium">Anzahl</Label>
                                        <NativeSelect
                                            id="invite-batch"
                                            value={batchSize}
                                            onChange={e => setBatchSize(parseInt(e.target.value))}
                                            className="w-full"
                                        >
                                            <option value="1">1 Code</option>
                                            <option value="5">5er Batch</option>
                                            <option value="10">10er Batch</option>
                                            <option value="20">20er Batch</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-max-uses" className="text-sm font-medium">Einlösungen</Label>
                                        <NativeSelect
                                            id="invite-max-uses"
                                            value={inviteMaxUses}
                                            onChange={e => setInviteMaxUses(e.target.value)}
                                            className="w-full"
                                            title="Wie oft kann jeder Code eingelöst werden?"
                                        >
                                            <option value="1">1× einlösbar</option>
                                            <option value="2">2× einlösbar</option>
                                            <option value="5">5× einlösbar</option>
                                            <option value="10">10× einlösbar</option>
                                            <option value="unlimited">Unbegrenzt</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-expiry" className="text-sm font-medium">Gültigkeit</Label>
                                        <NativeSelect
                                            id="invite-expiry"
                                            value={inviteExpiryDays}
                                            onChange={e => setInviteExpiryDays(e.target.value)}
                                            className="w-full"
                                        >
                                            <option value="7">7 Tage</option>
                                            <option value="14">14 Tage</option>
                                            <option value="30">30 Tage</option>
                                            <option value="90">90 Tage</option>
                                        </NativeSelect>
                                    </div>

                                    <div className="md:col-span-2">
                                        <Button
                                            onClick={generateInviteCodes}
                                            disabled={generatingInvite}
                                            className="h-11 w-full gap-1.5"
                                        >
                                            <Plus size={16} aria-hidden /> Generieren
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    {/* Frisch generierte Codes – sofort kopieren & verschicken */}
                    {generatedInviteCodes.length > 0 && (
                        <Card className="border-border bg-muted/50 ">
                            <CardContent className="space-y-3 p-4 sm:p-6">
                                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Check size={20} className="text-foreground" aria-hidden />
                                    Neue Codes – jetzt per E-Mail/Chat verschicken
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {inviteMaxUses === 'unlimited'
                                        ? 'Jeder Code ist unbegrenzt einlösbar'
                                        : `Jeder Code ist ${inviteMaxUses}× einlösbar`} und läuft automatisch ab.
                                    Einlösen: bei der Registrierung im Feld „Einladungscode“ oder in den Einstellungen unter „Code einlösen“.
                                </p>
                                <div className="space-y-2">
                                    {generatedInviteCodes.map(c => (
                                        <div key={c.code} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                                            <div className="min-w-0">
                                                <span className="break-all tabular-nums text-sm font-semibold tracking-wider text-foreground">{c.code}</span>
                                                <span className="mt-0.5 block text-xs font-medium text-muted-foreground sm:ml-2 sm:mt-0 sm:inline">
                                                    {c.role === 'sv_admin' ? 'SV-Admin' : c.role === 'coach_admin' ? 'Coaching-Admin' : c.role === 'parent' ? 'Elternteil' : 'Schüler'}
                                                    {c.expires_at ? ` · gültig bis ${new Date(c.expires_at).toLocaleDateString('de-DE')}` : ''}
                                                </span>
                                            </div>
                                            <Button size="icon" variant="ghost" onClick={() => handleCopy(c.code, c.code)} className="h-11 w-11 shrink-0" title="Code kopieren" aria-label="Code kopieren">
                                                {copiedCodeId === c.code ? <Check size={16} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={16} />}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Einladungscodes */}
                    <Card className="">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                                <span className="text-sm font-semibold text-foreground">
                                    Einladungscodes ({inviteCodes.length})
                                </span>
                                <Button onClick={fetchInviteCodes} variant="ghost" size="icon" className="h-11 w-11" aria-label="Einladungscodes aktualisieren">
                                    <RefreshCw size={16} className={cn(loadingInvite && 'animate-spin')} aria-hidden />
                                </Button>
                            </div>

                            {inviteError && (
                                <div className="p-4">
                                    <Alert variant="destructive">
                                        <AlertTitle>Einladungscodes nicht verfügbar</AlertTitle>
                                        <AlertDescription className="flex flex-col items-start gap-3">
                                            <span>{inviteError}</span>
                                            <Button type="button" variant="outline" className="h-11" onClick={fetchInviteCodes}>
                                                Erneut laden
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {inviteError ? null : loadingInvite ? (
                                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                                    <Spinner className="size-5" /> Lade Einladungscodes...
                                </div>
                            ) : inviteCodes.length === 0 ? (
                                <div className="py-16 text-center text-sm text-muted-foreground">
                                    Es wurden bisher keine Einladungscodes generiert.
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {inviteCodes.map(c => {
                                        const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                                        const uses = c.current_uses ?? (c.is_used ? 1 : 0);
                                        const limit = c.max_uses ?? 1;
                                        const limitReached = c.max_uses === null ? false : uses >= limit;
                                        const showDelete = !limitReached && !isExpired;
                                        return (
                                            <li key={c.id} className="space-y-2.5 p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="break-all tabular-nums text-sm font-semibold tracking-wider text-foreground">
                                                            {c.code}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                            <span className={cn(
                                                                'rounded-md px-2.5 py-1 text-xs font-medium',
                                                                c.role === 'sv_admin' && 'bg-muted text-foreground',
                                                                c.role === 'coach_admin' && 'bg-muted text-foreground',
                                                                c.role === 'student' && 'bg-muted text-muted-foreground',
                                                                c.role === 'parent' && 'bg-muted text-foreground'
                                                            )}>
                                                                {c.role === 'sv_admin' ? 'Admin' : c.role === 'coach_admin' ? 'Coaching-Admin' : c.role === 'parent' ? 'Elternteil' : 'Schüler'}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                                Nutzungen: {c.max_uses === null ? `${uses} (unbegrenzt)` : `${uses} / ${limit}`}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                Ablaufdatum: {c.expires_at ? new Date(c.expires_at).toLocaleDateString('de-DE') : '--'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {limitReached ? (
                                                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                                Aufgebraucht
                                                            </span>
                                                        ) : c.is_used ? (
                                                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                                Genutzt
                                                            </span>
                                                        ) : isExpired ? (
                                                            <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">Abgelaufen</span>
                                                        ) : (
                                                            <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Aktiv / Frei</span>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-11 w-11"
                                                            onClick={() => handleCopy(c.id, c.code)}
                                                            title="Kopieren"
                                                            aria-label="Einladungscode kopieren"
                                                        >
                                                            {copiedCodeId === c.id ? <Check size={16} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={16} />}
                                                        </Button>
                                                        {showDelete && (
                                                            <Button
                                                                size="icon"
                                                                variant="destructive"
                                                                className="h-11 w-11"
                                                                onClick={() => deleteInviteCode(c.id, c.code)}
                                                                title="Löschen"
                                                                aria-label="Einladungscode löschen"
                                                            >
                                                                <Trash2 size={16} aria-hidden />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {(limitReached || c.is_used) && (
                                                    <p className="break-words text-xs text-muted-foreground">
                                                        {limitReached ? (
                                                            <>Aufgebraucht{c.used_by_profile?.display_name ? <> – zuletzt: <span className="font-medium text-foreground">{c.used_by_profile.display_name}</span></> : null}</>
                                                        ) : (
                                                            <>Genutzt von <span className="font-medium text-foreground">{c.used_by_profile?.display_name || 'User'}</span></>
                                                        )}
                                                    </p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                const action = confirmAction?.onConfirm;
                                setConfirmAction(null);
                                action?.();
                            }}
                        >
                            {confirmAction?.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
