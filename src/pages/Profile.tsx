import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { User, Shield, BadgeCheck, Loader2, Mail, Phone, MessageSquare, Settings as SettingsIcon, Pen, Trash2, Users, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { SubjectChip, type Subject } from '../components/SubjectChip';
import { RefinedGradeSelector } from '../components/RefinedGradeSelector';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/image';
import { RichTextEditor } from '../components/RichTextEditor';
import { AvailabilityCalendar, emptyAvailability, type Availability } from '../components/AvailabilityCalendar';
import { sanitizeHtml } from '../lib/sanitize';
import ChildLinkModal from '../components/ChildLinkModal';
import { triggerHaptic } from '../lib/haptics';
import AvatarMakerModal from '../components/AvatarMakerModal';
import { extractDominantGradient, getRandomGradient } from '../lib/colorExtractor';

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
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
            <span className="sr-only">{label}</span>
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

export default function Profile() {
    const { user, profile: authProfile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(!authProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [availability, setAvailability] = useState<Availability>(emptyAvailability());
    const [privacyCalendar, setPrivacyCalendar] = useState(true);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isAvatarMakerOpen, setIsAvatarMakerOpen] = useState(false);
    const [bannerGradient, setBannerGradient] = useState<string>('linear-gradient(135deg, #f59e0b 0%, #eab308 100%)');

    const [profile, setProfile] = useState<{
        first_name: string;
        last_name: string;
        grade_level: string;
        class_letter: string;
        bio: string;
        is_verified: boolean;
        avatar_url: string;
        moodle_name: string;
        phone_number: string;
        contact_other: string;
        email: string;
        settings: {
            email_visible: boolean;
            phone_visible: boolean;
            contact_links: { type: string; value: string }[];
        };
        offered_subjects: Subject[];
    }>({
        first_name: authProfile?.first_name || '',
        last_name: authProfile?.last_name || '',
        grade_level: authProfile?.grade_level || '',
        class_letter: authProfile?.class_letter || '',
        bio: authProfile?.bio || '',
        is_verified: authProfile?.is_verified ?? false,
        avatar_url: authProfile?.avatar_url || '',

        moodle_name: authProfile?.moodle_name || '',
        phone_number: authProfile?.phone_number || '',
        contact_other: authProfile?.contact_other || '',
        email: user?.email || '', 

        settings: (authProfile?.settings as any) || {
            email_visible: false,
            phone_visible: false,
            contact_links: []
        },

        offered_subjects: []
    });

    useEffect(() => {
        if (!user) return;
        fetchProfile();
    }, [user]);

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
            setProfile({
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                grade_level: data.grade_level || '',
                class_letter: data.class_letter || '',
                bio: data.bio || '',
                is_verified: data.is_verified,
                avatar_url: data.avatar_url || '',
                moodle_name: data.moodle_name || '',
                phone_number: data.phone_number || '',
                contact_other: data.contact_other || '',
                email: data.email || user?.email || '',
                settings: {
                    email_visible: userSettings.email_visible ?? false,
                    phone_visible: userSettings.phone_visible ?? false,
                    contact_links: userSettings.contact_links || []
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
                setBannerGradient(getRandomGradient(user?.id));
            }
        }
        setLoading(false);
    }

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
            className="p-4 max-w-xl mx-auto pb-28 space-y-6"
        >
            {/* Header with Dynamic Banner & Avatar */}
            <motion.div variants={itemVariants} className="relative rounded-3xl overflow-hidden shadow-soft border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                {/* Banner */}
                <div className="h-32 transition-all duration-700 shadow-inner relative flex justify-end items-start p-3 gap-2" style={{ background: bannerGradient }}>
                    <button
                        type="button"
                        onClick={async () => {
                            triggerHaptic('selection');
                            const newGrad = getRandomGradient();
                            setBannerGradient(newGrad);
                            if (user) await supabase.from('profiles').update({ banner_color: newGrad }).eq('id', user.id);
                            toast.success("Zufällige Banner-Farbe gesetzt!");
                        }}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Zufällige Farbe wählen"
                    >
                        🎲 Random
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
                            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/70 hover:bg-white/90 text-black backdrop-blur-md transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Farbe automatisch an Profilbild anpassen"
                        >
                            ✨ Bild anpassen
                        </button>
                    )}
                </div>

                {/* Avatar & User Info */}
                <div className="flex flex-col items-center text-center px-6 pb-6 -mt-16">
                    <div className="relative group mb-2">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                        </motion.div>
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

                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        {profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'Profil einrichten'}
                    </h1>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {profile.grade_level 
                            ? ['EF', 'Q1', 'Q2'].includes(profile.grade_level)
                                ? `Jahrgangsstufe ${profile.grade_level}`
                                : `Klasse ${profile.grade_level}${profile.class_letter}` 
                            : 'Keine Klasse angegeben'}
                    </p>

                    <div className="flex flex-wrap justify-center items-center mt-3 gap-2">
                        {profile.is_verified ? (
                            <div className="flex items-center text-green-700 dark:text-green-300 text-xs font-bold gap-1 bg-green-100/80 dark:bg-green-950/60 px-3 py-1 rounded-full border border-green-200 dark:border-green-800/80 shadow-xs">
                                <BadgeCheck size={14} /> Verifiziert
                            </div>
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
                </motion.div>
            )}

            {/* Profile Data Card */}
            <motion.div variants={itemVariants}>
                <Card className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft">
                    <CardHeader className="bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800/80 px-6 py-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-extrabold">Persönliche Angaben</CardTitle>
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
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-1.5 block">Vorname</label>
                                <Input
                                    placeholder="Max"
                                    value={profile.first_name}
                                    disabled={!isEditing}
                                    onChange={e => setProfile({ ...profile, first_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-1.5 block">Nachname</label>
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
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2 block">Klasse / Jahrgangsstufe</label>
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
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-1.5 block">Über mich (Bio)</label>
                            {isEditing ? (
                                <RichTextEditor
                                    value={profile.bio}
                                    onChange={html => setProfile({ ...profile, bio: html })}
                                    placeholder="Schreib kurz etwas über deine Fächer & Erfahrung..."
                                />
                            ) : (
                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50/60 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(profile.bio || "<i>Keine Beschreibung hinterlegt.</i>") }} />
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
                                            <ToggleSwitch
                                                checked={profile.settings.email_visible}
                                                onChange={() => toggleSetting('email_visible')}
                                                label="Sichtbar"
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
                                            <ToggleSwitch
                                                checked={profile.settings.phone_visible}
                                                onChange={() => toggleSetting('phone_visible')}
                                                label="Sichtbar"
                                            />
                                            <span className="text-xs text-gray-400 font-semibold">Öffentlich</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 my-4" />

                        {/* Read Only Offered Subjects */}
                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2.5 block">Meine Angebote (aus aktiven Anzeigen)</label>
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
