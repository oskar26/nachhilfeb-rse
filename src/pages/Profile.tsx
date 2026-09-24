import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { User, Shield, BadgeCheck, Loader2, Mail, Phone, Settings as SettingsIcon, Pen, Users, Sparkles, CalendarDays, Award, Shuffle, Palette, X, Lock, Eye, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { SubjectChip, type Subject } from '../components/SubjectChip';
import { RefinedGradeSelector } from '../components/RefinedGradeSelector';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { RichTextEditor } from '../components/RichTextEditor';
import { AvailabilityCalendar, emptyAvailability, type Availability } from '../components/AvailabilityCalendar';
import { sanitizeHtml } from '../lib/sanitize';
import ChildLinkModal from '../components/ChildLinkModal';
import { triggerHaptic } from '../lib/haptics';
import AvatarMakerModal from '../components/AvatarMakerModal';
import { extractDominantGradient, getDefaultGradient, getRandomGradient, PRESET_GRADIENTS } from '../lib/colorExtractor';
import { Switch } from '../components/ui/Switch';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { CONTACT_TYPES, getContactType, newContactId, type CustomContact } from '../components/CustomContacts';

export default function Profile() {
    const { user, profile: authProfile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(!authProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availability, setAvailability] = useState<Availability>(emptyAvailability());
    const [privacyCalendar, setPrivacyCalendar] = useState(true);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isAvatarMakerOpen, setIsAvatarMakerOpen] = useState(false);
    const [bannerGradient, setBannerGradient] = useState<string>(getDefaultGradient());
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState('#f59e0b');

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
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user?.id)
            .single();

        const { data: ads } = await supabase
            .from('ads')
            .select('subjects')
            .eq('user_id', user?.id)
            .eq('type', 'offer')
            .eq('is_active', true);

        const subjectsSet = new Set<Subject>();
        ads?.forEach(ad => ad.subjects?.forEach((s: Subject) => subjectsSet.add(s)));

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
                    email_visible: userSettings.email_visible ?? false,
                    phone_visible: userSettings.phone_visible ?? false,
                    contact_links: userSettings.contact_links || [],
                    custom_contacts: hasCustomContacts ? userSettings.custom_contacts : migratedContacts
                },
                offered_subjects: Array.from(subjectsSet)
            });
            setAvailability(data.availability || emptyAvailability());
            setPrivacyCalendar(data.privacy_calendar ?? true);

            if (data.banner_color) {
                setBannerGradient(data.banner_color);
            } else if (data.avatar_url) {
                extractDominantGradient(data.avatar_url, user?.id).then(setBannerGradient);
            } else {
                setBannerGradient(getDefaultGradient());
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        if (!user) return;
        fetchProfile();
    }, [user]);

    const handleAvatarSaved = async (newUrl: string) => {
        setProfile(p => ({ ...p, avatar_url: newUrl }));
        const grad = await extractDominantGradient(newUrl, user?.id);
        setBannerGradient(grad);
        if (user) {
            await supabase.from('profiles').update({ avatar_url: newUrl, banner_color: grad }).eq('id', user.id);
            refreshProfile();
        }
    };

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        triggerHaptic('medium');

        const displayName = `${profile.first_name} ${profile.last_name?.charAt(0) || ''}.`;

        const { error } = await supabase.from('profiles').update({
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
            avatar_url: profile.avatar_url,
            availability: availability,
            privacy_calendar: privacyCalendar,
            onboarding_complete: true
        }).eq('id', user.id);

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

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Profil wird geladen...</p>
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
            className="p-4 max-w-3xl mx-auto pb-28 space-y-6"
        >
            {/* Header with Dynamic Banner & Avatar */}
            <motion.div variants={itemVariants} className="relative rounded-3xl overflow-hidden shadow-soft border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                {/* Banner */}
                <div className="h-36 transition-colors duration-700 shadow-inner relative flex justify-between items-start p-3.5 gap-2" style={{ background: bannerGradient }}>
                    <div className="flex items-center gap-1.5 flex-wrap relative z-10">
                        <button
                            type="button"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border",
                                showColorPicker
                                    ? "bg-white text-black border-white"
                                    : "bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border-white/20"
                            )}
                            title="Banner-Farbe anpassen"
                        >
                            <Palette size={13} />
                            <span>Farbe</span>
                        </button>
                        {profile.avatar_url && (
                            <button
                                type="button"
                                onClick={async () => {
                                    triggerHaptic('selection');
                                    const grad = await extractDominantGradient(profile.avatar_url);
                                    setBannerGradient(grad);
                                    if (user) await supabase.from('profiles').update({ banner_color: grad }).eq('id', user.id);
                                    toast.success("Farbe an Profilbild angepasst!");
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/80 hover:bg-white text-black backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                title="Farbe automatisch an Profilbild anpassen"
                            >
                                <Sparkles size={12} className="text-amber-500" />
                                <span>Bild anpassen</span>
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={async () => {
                            triggerHaptic('selection');
                            const newGrad = getRandomGradient();
                            setBannerGradient(newGrad);
                            if (user) await supabase.from('profiles').update({ banner_color: newGrad }).eq('id', user.id);
                            toast.success("Zufällige Farbe gewählt!");
                        }}
                        className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all flex items-center gap-1 shadow-sm cursor-pointer relative z-10"
                        title="Zufällige Farbe"
                    >
                        <Shuffle size={13} />
                        <span>Zufall</span>
                    </button>

                    {/* Floating Color Selection Overlay (Never collides with Avatar) */}
                    {showColorPicker && (
                        <div className="absolute top-12 left-3 right-3 z-30 p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                                <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Banner-Farbe wählen</span>
                                <button
                                    type="button"
                                    onClick={() => setShowColorPicker(false)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Presets:</span>
                                    {PRESET_GRADIENTS.map((p) => (
                                        <button
                                            key={p.name}
                                            type="button"
                                            onClick={async () => {
                                                triggerHaptic('selection');
                                                setBannerGradient(p.gradient);
                                                if (user) await supabase.from('profiles').update({ banner_color: p.gradient }).eq('id', user.id);
                                                toast.success(`${p.name} ausgewählt!`);
                                            }}
                                            className={cn(
                                                "w-6 h-6 rounded-full transition-transform hover:scale-125 shadow-xs border border-white/80 dark:border-gray-800 cursor-pointer relative",
                                                bannerGradient === p.gradient && "ring-2 ring-primary ring-offset-2 scale-110"
                                            )}
                                            style={{ background: p.gradient }}
                                            title={p.name}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Eigene:</span>
                                    <input
                                        type="color"
                                        value={customColor}
                                        onChange={async (e) => {
                                            const c = e.target.value;
                                            setCustomColor(c);
                                            const grad = `linear-gradient(135deg, ${c} 0%, ${c}dd 100%)`;
                                            setBannerGradient(grad);
                                            if (user) await supabase.from('profiles').update({ banner_color: grad }).eq('id', user.id);
                                        }}
                                        className="w-7 h-7 p-0 border-0 rounded-lg cursor-pointer shadow-sm"
                                        title="Color Picker für eigene Farbe"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Avatar & User Info */}
                <div className="flex flex-col items-center text-center px-6 pb-6 -mt-16">
                    <div className="relative group mb-2">
                        <div
                            className="relative p-1.5 rounded-full shadow-xl"
                            style={{ background: bannerGradient }}
                        >
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-950 shadow-inner" />
                            ) : (
                                <div className="w-28 h-28 rounded-full bg-white dark:bg-gray-900 border-4 border-white dark:border-gray-950 flex items-center justify-center text-gray-400 shadow-inner">
                                    <User size={48} />
                                </div>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerHaptic('light');
                                    setIsAvatarMakerOpen(true);
                                }}
                                className="absolute bottom-1 right-1 bg-black text-white p-2.5 rounded-full shadow-xl hover:bg-gray-800 transition-colors border-2 border-white dark:border-gray-950 cursor-pointer"
                                title="Avatar erstellen / ändern"
                            >
                                <Pen size={14} />
                            </motion.button>
                        </div>
                    </div>

                    <div className="mb-2">
                        <button
                            type="button"
                            onClick={() => {
                                triggerHaptic('light');
                                setIsAvatarMakerOpen(true);
                            }}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 hover:bg-primary/30 text-primary-hover dark:text-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                            <Sparkles size={13} />
                            <span>Avatar gestalten</span>
                        </button>
                    </div>

                    <h1 className="text-2xl font-display uppercase leading-none tracking-tight text-gray-900 dark:text-white">
                        {profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'Profil einrichten'}
                    </h1>
                    <div className="mt-2 h-1 w-10 rounded-full bg-primary mx-auto" aria-hidden />
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {profile.grade_level 
                            ? ['EF', 'Q1', 'Q2'].includes(profile.grade_level)
                                ? `Jahrgangsstufe ${profile.grade_level}`
                                : `Klasse ${profile.grade_level}${profile.class_letter}` 
                            : 'Keine Klasse angegeben'}
                    </p>

                    <div className="flex flex-wrap justify-center items-center mt-3 gap-2">
                        {profile.is_coach && (
                            <div className="flex items-center text-amber-900 dark:text-amber-200 text-xs font-extrabold gap-1.5 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300/80 dark:border-amber-700/60 shadow-xs">
                                <Award size={14} className="text-amber-600 dark:text-amber-400" /> Schüler-Coach (5./6. Klasse)
                            </div>
                        )}
                        {profile.is_verified ? (
                            <VerifiedPill size="md" />
                        ) : (
                            <div className="flex items-center text-amber-700 dark:text-amber-300 text-xs font-bold gap-1 bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/80 shadow-xs">
                                <Shield size={14} /> Nicht Verifiziert
                            </div>
                        )}
                        <Link to="/settings" onClick={() => triggerHaptic('light')} className="flex items-center text-gray-600 dark:text-gray-300 text-xs font-semibold gap-1 bg-gray-100/80 dark:bg-gray-800/80 px-3 py-1 rounded-full hover:bg-gray-200/80 transition-colors border border-gray-200/50 dark:border-gray-700/50">
                            <SettingsIcon size={13} /> Einstellungen
                        </Link>
                        {authProfile?.role === 'student' && (
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => {
                                    triggerHaptic('light');
                                    setIsLinkModalOpen(true);
                                }}
                                className="flex items-center text-yellow-900 dark:text-yellow-200 text-xs gap-1 bg-primary/20 font-bold px-3 py-1 rounded-full hover:bg-primary/30 transition-colors shadow-xs"
                            >
                                <Users size={13} /> Eltern verknüpfen
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {!profile.is_verified && (
                <motion.div variants={itemVariants} className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-sm text-amber-900 dark:text-amber-200 shadow-soft">
                    <p className="font-extrabold mb-0.5">Account eingeschränkt</p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">Du musst dich im SV-Raum verifizieren lassen, um eigene Nachhilfeanzeigen zu veröffentlichen.</p>
                    <Link
                        to="/welcome"
                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-primary bg-primary/30 dark:bg-primary/15 hover:bg-primary/50 dark:hover:bg-primary/25 px-3 py-1.5 rounded-full transition-colors"
                    >
                        So geht's in 3 Schritten →
                    </Link>
                </motion.div>
            )}

            {/* Goal gradient: head-start from signup (name+grade), never 0% */}
            {(() => {
                const checks = [
                    { label: 'Name & Klasse', done: Boolean(profile.first_name && profile.grade_level) },
                    { label: 'Kurz-Bio', done: Boolean((profile.bio || '').replace(/<[^>]+>/g, '').trim().length > 20) },
                    { label: 'Zeiten eintragen', done: Object.values(availability).some(d => d.length > 0) },
                    { label: 'Verifiziert', done: Boolean(profile.is_verified) },
                    { label: 'Erste Anzeige', done: (authProfile?.role === 'parent') || false },
                ];
                // Head start: account exists = always at least the first item when name present
                const doneCount = checks.filter(c => c.done).length + (profile.first_name ? 0 : 0);
                const pct = Math.max(20, Math.round((doneCount / checks.length) * 100));
                return (
                    <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-soft" aria-label={`Profil-Fortschritt: ${pct} Prozent`}>
                        <div className="flex items-center justify-between mb-2 gap-3">
                            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Profil-Stärke</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums">{pct}%</p>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-semibold">
                            {checks.map(c => (
                                <li key={c.label} className={cn('flex items-center gap-1', c.done ? 'text-green-700 dark:text-green-400' : 'text-gray-400')}>
                                    <span aria-hidden>{c.done ? '✓' : '○'}</span> {c.label}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                );
            })()}

            {/* Profile Data Card */}
            <motion.div variants={itemVariants}>
                <Card className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="bg-gray-950 dark:bg-black poster-grain text-white border-b border-white/5 px-6 py-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-base font-extrabold leading-tight tracking-tight text-white dark:text-gray-100">Persönliche Angaben</h2>
                            <Button
                                variant={isEditing ? "primary" : "secondary"}
                                size="sm"
                                onClick={() => {
                                    triggerHaptic('medium');
                                    if (isEditing) handleSave();
                                    else setIsEditing(true);
                                }}
                                disabled={saving}
                                className={cn("rounded-full font-extrabold", isEditing && "bg-green-500 hover:bg-green-600 text-white")}
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? 'Speichern' : 'Bearbeiten')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5 p-6">
                        {/* Names */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 block">Vorname</label>
                                <Input
                                    placeholder="Max"
                                    value={profile.first_name}
                                    disabled={!isEditing}
                                    onChange={e => setProfile({ ...profile, first_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 block">Nachname</label>
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
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">Klasse / Jahrgangsstufe</label>
                            {isEditing ? (
                                <RefinedGradeSelector
                                    grade={profile.grade_level}
                                    letter={profile.class_letter}
                                    onChange={(g, l) => setProfile({ ...profile, grade_level: g, class_letter: l })}
                                />
                            ) : (
                                <div className="text-base font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                    {profile.grade_level ? `${profile.grade_level}${profile.class_letter}` : 'Nicht angegeben'}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 block">Über mich (Bio)</label>
                            {isEditing ? (
                                <RichTextEditor
                                    value={profile.bio}
                                    onChange={html => setProfile({ ...profile, bio: html })}
                                    placeholder="Schreib kurz etwas über deine Fächer & Erfahrung..."
                                />
                            ) : (
                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50/60 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80 leading-relaxed max-w-[95ch]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(profile.bio || "<i>Keine Beschreibung hinterlegt.</i>") }} />
                            )}
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 my-4" />

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Kontaktmöglichkeiten</h3>

                            <div className="space-y-3">
                                {/* Email */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                        <Mail size={16} className="text-gray-500" />
                                    </div>
                                    <Input
                                        value={profile.email}
                                        className="h-10 text-xs"
                                        disabled
                                    />
                                    {isEditing && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Switch
                                                checked={profile.settings.email_visible}
                                                onChange={() => toggleSetting('email_visible')}
                                                label="E-Mail-Adresse öffentlich anzeigen"
                                            />
                                            <span className="text-xs text-gray-400 font-semibold">Öffentlich</span>
                                        </div>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                        <Phone size={16} className="text-gray-500" />
                                    </div>
                                    <Input
                                        placeholder="Handynummer (Optional)"
                                        value={profile.phone_number}
                                        onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
                                        className="h-10 text-xs"
                                        disabled={!isEditing}
                                    />
                                    {isEditing && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Switch
                                                checked={profile.settings.phone_visible}
                                                onChange={() => toggleSetting('phone_visible')}
                                                label="Telefonnummer öffentlich anzeigen"
                                            />
                                            <span className="text-xs text-gray-400 font-semibold">Öffentlich</span>
                                        </div>
                                    )}
                                </div>

                                {/* Weitere Kontaktmöglichkeiten (A4) */}
                                {(profile.settings.custom_contacts || []).map((contact, idx) => {
                                    const ContactIcon = getContactType(contact.type).icon;
                                    return (
                                        <div key={contact.id} className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                <ContactIcon size={16} className="text-gray-500" />
                                            </div>
                                            <select
                                                value={contact.type}
                                                disabled={!isEditing}
                                                onChange={e => updateCustomContact(idx, { type: e.target.value })}
                                                aria-label="Kontakt-Typ"
                                                className="h-10 shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-60"
                                            >
                                                {CONTACT_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                            <Input
                                                placeholder="z.B. @name oder Einladungslink"
                                                value={contact.value || ''}
                                                disabled={!isEditing}
                                                onChange={e => updateCustomContact(idx, { value: e.target.value })}
                                                className="h-10 text-xs"
                                            />
                                            {isEditing && (
                                                <>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Switch
                                                            checked={!!contact.is_public}
                                                            onChange={() => updateCustomContact(idx, { is_public: !contact.is_public })}
                                                            label={`${getContactType(contact.type).label}-Kontakt öffentlich anzeigen`}
                                                        />
                                                        <span className="text-xs text-gray-400 font-semibold">Öffentlich</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCustomContact(idx)}
                                                        aria-label="Kontakt entfernen"
                                                        className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={addCustomContact}
                                        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-700 px-4 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors hover:border-primary hover:text-amber-950 dark:hover:text-primary"
                                    >
                                        <Plus size={15} /> Kontakt hinzufügen
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 my-4" />

                        {/* Read Only Offered Subjects */}
                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2.5 block">Meine Angebote (aus aktiven Anzeigen)</label>
                            <div className="flex flex-wrap gap-2">
                                {profile.offered_subjects.length > 0 ? (
                                    profile.offered_subjects.map(s => <SubjectChip key={s} subject={s} />)
                                ) : (
                                    <span className="text-xs text-gray-400 italic">Erstelle eine Anzeige, um hier angebotene Fächer zu präsentieren.</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Availability Calendar (Wann hast du Zeit?) */}
            <motion.div variants={itemVariants}>
                <Card className="rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                    <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <CalendarDays size={20} className="text-primary" /> Wann hast du Zeit? (Verfügbarkeit)
                            </CardTitle>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setPrivacyCalendar(!privacyCalendar)}
                                    className={cn(
                                        "text-xs px-3 py-1.5 rounded-full border font-bold transition-all cursor-pointer shadow-2xs",
                                        privacyCalendar
                                            ? "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                            : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    )}
                                >
                                    {privacyCalendar ? (<span className="inline-flex items-center gap-1"><Lock size={12} /> Nur Matching (Privat)</span>) : (<span className="inline-flex items-center gap-1"><Eye size={12} /> Öffentlich sichtbar</span>)}
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-medium leading-relaxed">
                            {privacyCalendar
                                ? 'Dein Zeitplan wird für den Smart-Matching-Algorithmus verwendet (z.B. passende Freistunden mit Tutoren/Schülern).'
                                : 'Dein Kalender ist zusätzlich öffentlich auf deinem Profil sichtbar.'}
                            {isEditing ? ' Klicke auf die Zeiten unten, um deine freien Stunden einzutragen.' : ''}
                        </p>
                    </CardHeader>
                    <CardContent className="pt-2 pb-6">
                        <AvailabilityCalendar
                            availability={availability}
                            onChange={isEditing ? setAvailability : undefined}
                        />
                        {!isEditing && (
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setIsEditing(true);
                                    }}
                                    className="rounded-xl text-xs font-bold gap-1.5"
                                >
                                    <Pen size={13} /> Zeiten bearbeiten
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Child Link Modal */}
            <ChildLinkModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
            />

            {/* Avatar Maker Modal */}
            <AvatarMakerModal
                isOpen={isAvatarMakerOpen}
                onClose={() => setIsAvatarMakerOpen(false)}
                onSave={handleAvatarSaved}
                initialName={`${profile.first_name} ${profile.last_name}`}
            />
        </motion.div>
    );
}
