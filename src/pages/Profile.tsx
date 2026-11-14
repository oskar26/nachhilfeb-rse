import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button, buttonVariants } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { User, Shield, Loader2, Mail, Phone, Settings as SettingsIcon, Pen, Sparkles, CalendarDays, Award, X, Eye, Plus, Trash2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { SubjectChip, SUBJECT_CATEGORIES, subjectLabelMap, type Subject } from '../components/SubjectChip';
import { RefinedGradeSelector } from '../components/RefinedGradeSelector';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { RichTextEditor } from '../components/RichTextEditor';
import { AvailabilityCalendar, emptyAvailability, type Availability } from '../components/AvailabilityCalendar';
import { sanitizeHtml } from '../lib/sanitize';
import { triggerHaptic } from '../lib/haptics';
import AvatarMakerModal from '../components/AvatarMakerModal';
import SubjectPickerDialog from '../components/SubjectPickerDialog';
import { Switch } from '../components/ui/switch';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { CONTACT_TYPES, getContactType, newContactId, type CustomContact } from '../components/CustomContacts';

// Kanonische Fächer-Keys aus SubjectChip (Single Source of Truth).
const CANONICAL_SUBJECTS = new Set<Subject>(SUBJECT_CATEGORIES.flatMap(category => category.subjects));

// Der Avatar-Gestalter erzeugt data:-URLs (PNG/JPEG/WebP) oder SVG-Data-URLs;
// das Backend erwartet dazu den passenden avatar_type.
function getAvatarType(url: string): 'svg' | 'upload' | 'url' | undefined {
    if (!url) return undefined;
    if (url.startsWith('data:image/svg+xml')) return 'svg';
    if (url.startsWith('data:')) return 'upload';
    if (url.startsWith('https://')) return 'url';
    return undefined;
}

export default function Profile() {
    const { user, profile: authProfile, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!authProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availability, setAvailability] = useState<Availability>(emptyAvailability());
    const [isSubjectPickerOpen, setIsSubjectPickerOpen] = useState(false);
    const [isAvatarMakerOpen, setIsAvatarMakerOpen] = useState(false);
    const subjectsSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

    const [profile, setProfile] = useState<{
        first_name: string;
        last_name: string;
        grade_level: string;
        class_letter: string;
        bio: string;
        is_verified: boolean;
        is_coach?: boolean;
        avatar_url: string;
        moodle_name: string;
        phone_number: string;
        contact_other: string;
        email: string;
        settings: {
            email_visible: boolean;
            phone_visible: boolean;
            contact_links: { type: string; value: string }[];
            custom_contacts: CustomContact[];
            teaches_subjects?: Subject[];
        };
        offered_subjects: Subject[];
    }>({
        first_name: authProfile?.first_name || '',
        last_name: authProfile?.last_name || '',
        grade_level: authProfile?.grade_level || '',
        class_letter: authProfile?.class_letter || '',
        bio: authProfile?.bio || '',
        is_verified: authProfile?.is_verified ?? false,
        is_coach: !!authProfile?.is_coach,
        avatar_url: authProfile?.avatar_url || '',

        moodle_name: authProfile?.moodle_name || '',
        phone_number: authProfile?.phone_number || '',
        contact_other: authProfile?.contact_other || '',
        email: user?.email || '', 

        settings: (authProfile?.settings as any) || {
            email_visible: false,
            phone_visible: false,
            contact_links: [],
            custom_contacts: []
        },

        offered_subjects: []
    });

    async function fetchProfile() {
        if (!authProfile) setLoading(true);
        const { data } = await api.profiles.get(user?.id);

        const { data: ads } = await api.ads.list({ user_id: user?.id, type: 'offer', all: true });

        const subjectsSet = new Set<Subject>();
        ads?.forEach((ad: any) => ad.subjects?.forEach((s: Subject) => subjectsSet.add(s)));

        if (data) {
            const userSettings = (data.settings as any) || {};
            const hasCustomContacts = Array.isArray(userSettings.custom_contacts) && userSettings.custom_contacts.length > 0;
            const migratedContacts: CustomContact[] = !hasCustomContacts && data.contact_other
                ? [{ id: newContactId(), type: 'other', value: data.contact_other, is_public: false }]
                : [];
            setProfile({
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                grade_level: data.grade_level || '',
                class_letter: data.class_letter || '',
                bio: data.bio || '',
                is_verified: data.is_verified,
                is_coach: !!data.is_coach,
                avatar_url: data.avatar_url || '',
                moodle_name: data.moodle_name || '',
                phone_number: data.phone_number || '',
                contact_other: migratedContacts.length > 0 ? '' : (data.contact_other || ''),
                email: data.email || user?.email || '',
                settings: {
                    // Unbekannte Keys bewusst erhalten (wie in Settings.tsx).
                    ...userSettings,
                    email_visible: userSettings.email_visible ?? false,
                    phone_visible: userSettings.phone_visible ?? false,
                    contact_links: userSettings.contact_links || [],
                    custom_contacts: hasCustomContacts ? userSettings.custom_contacts : migratedContacts,
                    teaches_subjects: Array.isArray(userSettings.teaches_subjects)
                        ? userSettings.teaches_subjects.filter((s: string) => CANONICAL_SUBJECTS.has(s as Subject))
                        : []
                },
                offered_subjects: Array.from(subjectsSet)
            });
            setAvailability(data.availability || emptyAvailability());
        }
        setLoading(false);
    }

    useEffect(() => {
        if (!user) return;
        fetchProfile();
    }, [user]);

    const handleAvatarSaved = async (newUrl: string) => {
        setProfile(p => ({ ...p, avatar_url: newUrl }));
        if (!user) return false;
        // Der Maker erzeugt data:-URLs (PNG/JPEG/WebP) oder https-URLs. Das
        // Backend akzeptiert beides; avatar_type beschreibt die Art der URL.
        const avatarType = getAvatarType(newUrl);
        const { error } = await api.profiles.update({
            avatar_url: newUrl,
            avatar_type: avatarType
        }, user.id);
        if (error) {
            toast.error('Avatar konnte nicht gespeichert werden. Bitte versuche es erneut.');
            return false;
        }
        await refreshProfile();
        return true;
    };

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        triggerHaptic('medium');

        const displayName = `${profile.first_name} ${profile.last_name?.charAt(0) || ''}.`;
        const avatarUrl = profile.avatar_url?.trim() || '';

        const { error } = await api.profiles.update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            display_name: displayName,
            grade_level: profile.grade_level,
            class_letter: profile.class_letter,
            bio: profile.bio,
            moodle_name: profile.moodle_name,
            phone_number: profile.phone_number,
            contact_other: profile.contact_other,
            settings: profile.settings,
            // data:-URLs aus dem Avatar-Gestalter müssen erhalten bleiben.
            avatar_url: avatarUrl || undefined,
            avatar_type: getAvatarType(avatarUrl),
            availability: availability,
            // privacy_calendar steht nicht auf der API-Whitelist; die Anzeige
            // wird deshalb nur beschrieben, nicht als gespeicherte Einstellung
            // vorgetäuscht (siehe Availability-Karte).
            onboarding_complete: true
        }, user.id);

        if (error) {
            triggerHaptic('error');
            console.error('Profil Speichern Fehler:', error);
            toast.error('Dein Profil konnte nicht gespeichert werden.');
        } else {
            triggerHaptic('success');
            toast.success("Profil gespeichert!");
            setIsEditing(false);
            await refreshProfile();
        }
        setSaving(false);
    }

    const toggleSetting = (key: 'email_visible' | 'phone_visible') => {
        setProfile(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [key]: !prev.settings[key]
            }
        }));
    };

    const updateCustomContact = (idx: number, patch: Partial<CustomContact>) => {
        setProfile(prev => {
            const next = [...(prev.settings.custom_contacts || [])];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, settings: { ...prev.settings, custom_contacts: next } };
        });
    };

    const removeCustomContact = (idx: number) => {
        triggerHaptic('selection');
        setProfile(prev => ({
            ...prev,
            settings: { ...prev.settings, custom_contacts: (prev.settings.custom_contacts || []).filter((_, i) => i !== idx) }
        }));
    };

    const addCustomContact = () => {
        triggerHaptic('selection');
        setProfile(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                custom_contacts: [...(prev.settings.custom_contacts || []), { id: newContactId(), type: 'discord', value: '', is_public: false }]
            }
        }));
    };

    // Fächer: lokal sofort optimistisch setzen, dann das komplette settings-Objekt
    // frisch laden, teaches_subjects mergen (unbekannte Keys bleiben erhalten) und
    // zurückschreiben. Schreibvorgänge werden serialisiert, damit schnelle Taps
    // sich nicht gegenseitig überschreiben.
    const saveTeachesSubjects = (subjects: Subject[]) => {
        if (!user) return;
        setProfile(prev => ({
            ...prev,
            settings: { ...prev.settings, teaches_subjects: subjects }
        }));
        subjectsSaveQueueRef.current = subjectsSaveQueueRef.current.then(async () => {
            const { data } = await api.profiles.get(user.id);
            const raw = (data?.settings as Record<string, unknown>) || {};
            const { error } = await api.profiles.update({ settings: { ...raw, teaches_subjects: subjects } }, user.id);
            if (error) {
                triggerHaptic('error');
                toast.error('Fächer konnten nicht gespeichert werden');
            }
        });
    };

    const toggleTeachesSubject = (subject: Subject) => {
        triggerHaptic('selection');
        const current = profile.settings.teaches_subjects || [];
        const next = current.includes(subject)
            ? current.filter(s => s !== subject)
            : [...current, subject];
        saveTeachesSubjects(next);
    };

    // Editierbare Fächer aus dem Profil vs. schreibgeschützte Fächer, die nur
    // über aktive Angebots-Anzeigen kommen ("über Anzeigen verwaltet").
    const editableSubjects: Subject[] = profile.settings.teaches_subjects || [];
    const adManagedSubjects = profile.offered_subjects.filter(s => !editableSubjects.includes(s));
    const teachingSubjects = Array.from(new Set<Subject>([...editableSubjects, ...profile.offered_subjects]));

    // Profil-Stärke (unveränderter Score) – wird bei 100 % ausgeblendet.
    const strengthChecks = [
        { label: 'Name & Klasse', done: Boolean(profile.first_name && profile.grade_level) },
        { label: 'Kurz-Bio', done: Boolean((profile.bio || '').replace(/<[^>]+>/g, '').trim().length > 20) },
        { label: 'Zeiten eintragen', done: Object.values(availability).some(d => d.length > 0) },
        { label: 'Verifiziert', done: Boolean(profile.is_verified) },
        { label: 'Erste Anzeige', done: teachingSubjects.length > 0 },
    ];
    const strengthDoneCount = strengthChecks.filter(c => c.done).length + (profile.first_name ? 0 : 0);
    const strengthPct = Math.max(20, Math.round((strengthDoneCount / strengthChecks.length) * 100));


    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-xs font-semibold text-muted-foreground">Profil wird geladen…</p>
        </div>
    );

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
            {/* Header with Dynamic Banner & Avatar */}
            <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl border border-border bg-card">
                <div
                    className="h-28 bg-[linear-gradient(135deg,var(--primary-soft),var(--pastel-blue))]"
                    aria-hidden
                />
                {/* Avatar & User Info */}
                <div className="flex flex-col items-center text-center px-4 pb-6 -mt-16 sm:px-6">
                    <div className="relative group mb-2">
                        <div className="relative rounded-full border border-border bg-card p-1.5">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="size-28 rounded-full border-4 border-card object-cover" />
                            ) : (
                                <div className="grid size-28 place-items-center rounded-full border-4 border-card bg-muted text-muted-foreground">
                                    <User size={48} />
                                </div>
                            )}
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                hapticStyle={false}
                                type="button"
                                onClick={() => {
                                    triggerHaptic('light');
                                    setIsAvatarMakerOpen(true);
                                }}
                                className="absolute bottom-0 right-0 grid size-11 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
                                title="Avatar erstellen / ändern"
                            >
                                <Pen size={14} />
                            </Button>
                        </div>
                    </div>

                    <div className="mb-2">
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={() => {
                                triggerHaptic('light');
                                setIsAvatarMakerOpen(true);
                            }}
                            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                            <Sparkles size={13} />
                            <span>Avatar gestalten</span>
                        </Button>
                    </div>

                    <h1 className="max-w-full break-words text-2xl font-semibold leading-tight tracking-tight text-foreground">
                        {profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'Profil einrichten'}
                    </h1>
                    <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                        {profile.grade_level 
                            ? ['EF', 'Q1', 'Q2'].includes(profile.grade_level)
                                ? `Jahrgangsstufe ${profile.grade_level}`
                                : `Klasse ${profile.grade_level}${profile.class_letter}` 
                            : 'Keine Klasse angegeben'}
                    </p>

                    <div className="flex flex-wrap justify-center items-center mt-3 gap-2">
                        {profile.is_coach && (
                            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                                <Award size={14} aria-hidden /> Schüler-Coach (5./6. Klasse)
                            </div>
                        )}
                        {profile.is_verified ? (
                            <VerifiedPill size="md" />
                        ) : (
                            <div className="flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                <Shield size={14} aria-hidden /> Nicht Verifiziert
                            </div>
                        )}
                        <Link to="/settings" onClick={() => triggerHaptic('light')} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "gap-1.5")}>
                            <SettingsIcon size={14} /> Einstellungen
                        </Link>
                    </div>
                </div>
            </motion.div>

            {!profile.is_verified && (
                <motion.div variants={itemVariants} className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground">
                    <p className="font-semibold">Konto noch nicht verifiziert</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Du musst dich im SV-Raum verifizieren lassen, um eigene Nachhilfeanzeigen zu veröffentlichen.</p>
                    <Link
                        to="/welcome"
                        className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        So geht's in 3 Schritten →
                    </Link>
                </motion.div>
            )}

            {/* Goal gradient: head-start from signup (name+grade), never 0%.
                Bei 100 % verschwindet das Widget; der Übergang wird oben gefeiert. */}
            {strengthPct < 100 && (
                <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card p-4" aria-label={`Profil-Fortschritt: ${strengthPct} Prozent`}>
                    <div className="flex items-center justify-between mb-2 gap-3">
                        <p className="text-xs font-semibold text-muted-foreground">Profil vervollständigen</p>
                        <p className="text-sm font-semibold tabular-nums text-foreground">{strengthPct}%</p>
                    </div>
                    <div className="mb-3 h-2 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-valuenow={strengthPct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-sm bg-primary transition-[width] duration-500" style={{ width: `${strengthPct}%` }} />
                    </div>
                    <ul className="grid grid-cols-1 gap-1.5 text-xs font-semibold sm:grid-cols-3">
                        {strengthChecks.map(c => (
                            <li key={c.label} className={cn('flex items-center gap-1.5', c.done ? 'text-foreground' : 'text-muted-foreground')}>
                                {c.done ? <Check size={12} aria-hidden /> : <span className="size-3 rounded-full border border-current" aria-hidden />} {c.label}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            )}

            {/* Profile Data Card */}
            <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-border bg-card">
                    <CardHeader className="border-b border-border bg-card px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold leading-tight tracking-tight text-foreground">Persönliche Angaben</h2>
                            <Button
                                variant={isEditing ? "primary" : "secondary"}
                                size="sm"
                                onClick={() => {
                                    triggerHaptic('medium');
                                    if (isEditing) handleSave();
                                    else setIsEditing(true);
                                }}
                                disabled={saving}
                                isLoading={saving}
                                className="h-11 rounded-lg px-5 font-semibold"
                            >
                                {isEditing ? 'Speichern' : 'Bearbeiten'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5 p-4 sm:p-6">
                        {/* Names */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Vorname</Label>
                                <Input
                                    placeholder="Max"
                                    value={profile.first_name}
                                    disabled={!isEditing}
                                    onChange={e => setProfile({ ...profile, first_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Nachname</Label>
                                <Input
                                    placeholder="Mustermann"
                                    value={profile.last_name}
                                    disabled={!isEditing}
                                    onChange={e => setProfile({ ...profile, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Grade & Bio */}
                        <div>
                            <Label className="text-xs font-semibold text-foreground/80 mb-2 block">Klasse</Label>
                            {isEditing ? (
                                <RefinedGradeSelector
                                    grade={profile.grade_level}
                                    letter={profile.class_letter}
                                    onChange={(g, l) => setProfile({ ...profile, grade_level: g, class_letter: l })}
                                />
                            ) : (
                                <Input value={profile.grade_level ? `${profile.grade_level}${profile.class_letter}` : 'Nicht angegeben'} disabled />
                            )}
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Über mich (Bio)</Label>
                            {isEditing ? (
                                <RichTextEditor
                                    value={profile.bio}
                                    onChange={html => setProfile({ ...profile, bio: html })}
                                    placeholder="Schreib kurz etwas über deine Fächer & Erfahrung..."
                                />
                            ) : (
                                <div className="max-w-[95ch] rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed text-foreground/80" dangerouslySetInnerHTML={{ __html: sanitizeHtml(profile.bio || "<i>Keine Beschreibung hinterlegt.</i>") }} />
                            )}
                        </div>

                        <div className="border-t border-border my-4" />

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground">Kontaktmöglichkeiten</h3>

                            <div className="space-y-3">
                                {/* Email */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <Mail size={16} className="text-muted-foreground" />
                                    </div>
                                    <Input
                                        value={profile.email}
                                        className="h-11 min-w-0 flex-1 basis-40 text-sm"
                                        disabled
                                    />
                                    {isEditing && (
                                        <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
                                            <Switch
                                                checked={profile.settings.email_visible}
                                                onChange={() => toggleSetting('email_visible')}
                                                label="E-Mail-Adresse öffentlich anzeigen"
                                            />
                                            <span className="text-xs text-muted-foreground font-semibold">Sichtbar</span>
                                        </div>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <Phone size={16} className="text-muted-foreground" />
                                    </div>
                                    <Input
                                        placeholder="Handynummer (Optional)"
                                        value={profile.phone_number}
                                        onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
                                        className="h-11 min-w-0 flex-1 basis-40 text-sm"
                                        disabled={!isEditing}
                                    />
                                    {isEditing && (
                                        <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
                                            <Switch
                                                checked={profile.settings.phone_visible}
                                                onChange={() => toggleSetting('phone_visible')}
                                                label="Telefonnummer öffentlich anzeigen"
                                            />
                                            <span className="text-xs text-muted-foreground font-semibold">Sichtbar</span>
                                        </div>
                                    )}
                                </div>

                                {/* Weitere Kontaktmöglichkeiten (A4) */}
                                {(profile.settings.custom_contacts || []).map((contact, idx) => {
                                    const ContactIcon = getContactType(contact.type).icon;
                                    return (
                                        <div key={contact.id} className="flex flex-wrap items-center gap-2">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                <ContactIcon size={16} className="text-muted-foreground" />
                                            </div>
                                            <NativeSelect
                                                value={contact.type}
                                                disabled={!isEditing}
                                                onChange={e => updateCustomContact(idx, { type: e.target.value })}
                                                aria-label="Kontakt-Typ"
                                                className="h-11 shrink-0 px-3 text-xs font-semibold disabled:opacity-60"
                                            >
                                                {CONTACT_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </NativeSelect>
                                            <Input
                                                placeholder="z.B. @name oder Einladungslink"
                                                value={contact.value || ''}
                                                disabled={!isEditing}
                                                onChange={e => updateCustomContact(idx, { value: e.target.value })}
                                                className="h-11 min-w-0 flex-1 basis-32 text-sm"
                                            />
                                            {isEditing && (
                                                <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:shrink-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Switch
                                                            checked={!!contact.is_public}
                                                            onChange={() => updateCustomContact(idx, { is_public: !contact.is_public })}
                                                            label={`${getContactType(contact.type).label}-Kontakt öffentlich anzeigen`}
                                                        />
                                                        <span className="text-xs text-muted-foreground font-semibold">Sichtbar</span>
                                                    </div>
                                                    <Button variant="unstyled" size="unstyled"
                                                        type="button"
                                                        onClick={() => removeCustomContact(idx)}
                                                        aria-label="Kontakt entfernen"
                                                        className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {isEditing && (
                                    <Button variant="unstyled" size="unstyled"
                                        type="button"
                                        onClick={addCustomContact}
                                        className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        <Plus size={15} /> Kontakt hinzufügen
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-border my-4" />

                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                <Label className="text-xs font-semibold text-foreground/80 block">Ich biete Nachhilfe</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        triggerHaptic('light');
                                        navigate('/create-ad');
                                    }}
                                    className="h-11 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                                >
                                    <Plus size={14} /> Anzeige erstellen
                                </Button>
                            </div>

                            {/* Editierbare Fächer (teaches_subjects): Tap auf × entfernt */}
                            <div className="flex flex-wrap items-center gap-2">
                                {editableSubjects.map(s => (
                                    <span key={s} className="relative inline-flex">
                                        <SubjectChip subject={s} className="pr-12" />
                                        <Button variant="unstyled" size="unstyled"
                                            type="button"
                                            onClick={() => toggleTeachesSubject(s)}
                                            aria-label={`${subjectLabelMap[s]} entfernen`}
                                            className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
                                        >
                                            <X size={12} strokeWidth={3} />
                                        </Button>
                                    </span>
                                ))}
                                <Button variant="unstyled" size="unstyled"
                                    type="button"
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setIsSubjectPickerOpen(true);
                                    }}
                                    className="inline-flex h-11 items-center gap-1 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <Plus size={14} /> Fach hinzufügen
                                </Button>
                            </div>
                            {editableSubjects.length === 0 && (
                                <p className="text-xs leading-relaxed text-muted-foreground italic mt-2">Noch keine Fächer gewählt.</p>
                            )}

                            {/* Read-only: nur über aktive Angebots-Anzeigen */}
                            {adManagedSubjects.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                                        Aus deinen aktiven Anzeigen · über Anzeigen verwaltet
                                    </p>
                                    <div className="flex flex-wrap gap-2 opacity-80">
                                        {adManagedSubjects.map(s => <SubjectChip key={s} subject={s} />)}
                                    </div>
                                </div>
                            )}

                            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                                Deine gewählten Fächer steuern, welche privaten Gesuche du im Feed siehst. Tippe auf ×, um ein Fach zu entfernen.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Availability Calendar (Wann hast du Zeit?) */}
            <motion.div variants={itemVariants}>
                <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                <CalendarDays size={20} className="text-primary shrink-0" /> Wann hast du Zeit? (Verfügbarkeit)
                            </CardTitle>
                            <span className="inline-flex items-center gap-1.5 py-2 text-xs font-medium text-muted-foreground">
                                <Eye size={12} aria-hidden /> Anzeige: Profil & Vorschläge
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">
                            Dein Zeitplan wird für passende Vorschläge genutzt und ist auf deinem Profil sichtbar. In Anzeigen sehen ihn andere erst nach einer bestätigten Anfrage.
                            {isEditing ? ' Klicke auf die Zeiten unten, um deine freien Stunden einzutragen.' : ''}
                        </p>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 pt-2 sm:px-6">
                        {/* Size-Containment: Der Kalender scrollt intern horizontal
                            (overflow-x-auto), darf aber die Profilseite auf schmalen
                            Viewports nicht aufziehen. */}
                        <div className="[contain:inline-size]">
                            <AvailabilityCalendar
                                availability={availability}
                                onChange={isEditing ? setAvailability : undefined}
                            />
                        </div>
                        {!isEditing && (
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setIsEditing(true);
                                    }}
                                    className="h-11 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                                >
                                    <Pen size={13} /> Zeiten bearbeiten
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Fach-Auswahl (teaches_subjects) */}
            <SubjectPickerDialog
                open={isSubjectPickerOpen}
                onClose={() => setIsSubjectPickerOpen(false)}
                selected={editableSubjects}
                onToggle={toggleTeachesSubject}
            />

            {/* Avatar Maker Modal */}
            <AvatarMakerModal
                isOpen={isAvatarMakerOpen}
                onClose={() => setIsAvatarMakerOpen(false)}
                onSave={handleAvatarSaved}
                initialName={`${profile.first_name} ${profile.last_name}`}
            />

            {/* Konfetti beim Übergang auf 100 % Profil-Stärke */}
        </motion.div>
    );
}
