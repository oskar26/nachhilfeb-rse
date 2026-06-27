import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { User, Shield, BadgeCheck, Loader2, Mail, Phone, MessageSquare, Settings as SettingsIcon, Pen, Trash2, CalendarDays } from 'lucide-react';
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

export default function Profile() {
    const { user, profile: authProfile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(!authProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [availability, setAvailability] = useState<Availability>(emptyAvailability());
    const [privacyCalendar, setPrivacyCalendar] = useState(true); // true = private (matching only)

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

        // Contact
        moodle_name: authProfile?.moodle_name || '',
        phone_number: authProfile?.phone_number || '',
        contact_other: authProfile?.contact_other || '',
        email: user?.email || '', 

        // Settings
        settings: (authProfile?.settings as any) || {
            email_visible: false,
            phone_visible: false,
            contact_links: []
        },

        // Derived
        offered_subjects: []
    });

    useEffect(() => {
        if (!user) return;
        fetchProfile();
    }, [user]);

    async function fetchProfile() {
        if (!authProfile) setLoading(true);
        // Fetch Profile
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user?.id)
            .single();

        // Fetch user's Ads to derive subjects
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
        }
        setLoading(false);
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);

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
            console.error('Profil Speichern Fehler:', error);
            if (error.message.includes('schema cache')) {
                toast.error('Datenbank-Schema veraltet. Bitte führe die Migration (migration_phase8.sql) im SQL Editor aus.');
            } else {
                toast.error('Dein Profil konnte nicht gespeichert werden. Versuche es erneut.');
            }
        } else {
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

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-4 max-w-lg mx-auto pb-24 space-y-6">
            {/* Header / Avatar */}
            <div className="flex flex-col items-center text-center gap-2">
                <div className="relative group">
                    <div className="relative">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-soft" />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-gray-400 shadow-soft">
                                <User size={48} />
                            </div>
                        )}
                        {isEditing && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
                            >
                                <Pen size={14} />
                            </button>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                try {
                                    const compressed = await compressImage(file);
                                    setProfile(p => ({ ...p, avatar_url: compressed }));
                                    toast.success("Profilbild aktualisiert!");
                                } catch (err) {
                                    toast.error("Fehler beim Laden des Bildes.");
                                }
                            }
                        }}
                    />
                </div>

                <div>
                    <h1 className="text-2xl font-bold">
                        {profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'Profil einrichten'}
                    </h1>
                    <p className="text-gray-500 font-medium">
                        {profile.grade_level ? `Klasse ${profile.grade_level}${profile.class_letter}` : 'Keine Klasse'}
                    </p>

                    <div className="flex justify-center mt-2 gap-2">
                        {profile.is_verified ? (
                            <div className="flex items-center text-green-600 text-xs gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                                <BadgeCheck size={12} /> Verifiziert
                            </div>
                        ) : (
                            <div className="flex items-center text-amber-600 text-xs gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                <Shield size={12} /> Nicht Verifiziert
                            </div>
                        )}
                        <Link to="/settings" className="flex items-center text-gray-500 text-xs gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full hover:bg-gray-200">
                            <SettingsIcon size={12} /> Einstellungen
                        </Link>
                    </div>
                </div>
            </div>

            {!profile.is_verified && (
                <div className="bg-amber-50 border-1 border-amber-200 p-4 rounded-xl text-sm text-amber-800 dark:bg-warning-bgDark dark:text-warning-textDark border dark:border-amber-900/50 shadow-soft">
                    <p className="font-bold mb-1">Account eingeschränkt</p>
                    <p>Du musst dich im SV-Raum verifizieren lassen, um Anzeigen zu veröffentlichen.</p>
                </div>
            )}

            <Card className="overflow-hidden">
                <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Persönliche Daten</CardTitle>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            disabled={saving}
                            className={isEditing ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? 'Speichern' : 'Bearbeiten')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* Names */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Vorname</label>
                            <Input
                                placeholder="Max"
                                value={profile.first_name}
                                disabled={!isEditing}
                                onChange={e => setProfile({ ...profile, first_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Nachname</label>
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
                        <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Klasse</label>
                        {isEditing ? (
                            <RefinedGradeSelector
                                grade={profile.grade_level}
                                letter={profile.class_letter}
                                onChange={(g, l) => setProfile({ ...profile, grade_level: g, class_letter: l })}
                            />
                        ) : (
                            <div className="text-lg font-medium">{profile.grade_level}{profile.class_letter}</div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Über mich (Bio)</label>
                        {isEditing ? (
                            <RichTextEditor
                                value={profile.bio}
                                onChange={html => setProfile({ ...profile, bio: html })}
                                placeholder="Schreib kurz was über dich..."
                            />
                        ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-300 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: profile.bio || "<i>Keine Beschreibung</i>" }} />
                        )}
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800 my-4" />

                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-sm">Kontaktmöglichkeiten</h3>

                        <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                            <Mail size={16} className="text-gray-400" />
                            <div className="flex items-center gap-2">
                                <Input
                                    value={profile.email}
                                    className="h-9"
                                    disabled
                                />
                                {isEditing && (
                                    <ToggleSwitch
                                        checked={profile.settings.email_visible}
                                        onChange={() => toggleSetting('email_visible')}
                                        label="Sichtbar"
                                    />
                                )}
                            </div>

                            <Phone size={16} className="text-gray-400" />
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Handynummer (Optional)"
                                    value={profile.phone_number}
                                    onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
                                    className="h-9"
                                    disabled={!isEditing}
                                />
                                {isEditing && (
                                    <ToggleSwitch
                                        checked={profile.settings.phone_visible}
                                        onChange={() => toggleSetting('phone_visible')}
                                        label="Sichtbar"
                                    />
                                )}
                            </div>

                            <div className="w-4 h-4 text-xs font-bold text-gray-400 text-center">M</div>
                            <Input
                                placeholder="Moodle Name"
                                value={profile.moodle_name}
                                onChange={e => setProfile({ ...profile, moodle_name: e.target.value })}
                                className="h-9"
                                disabled={!isEditing}
                            />

                            <MessageSquare size={16} className="text-gray-400" />
                            <div className="space-y-2">
                                {(profile.settings.contact_links || []).map((link, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <Input 
                                            placeholder="Art (z.B. Discord)" 
                                            value={link.type} 
                                            onChange={e => {
                                                const newLinks = [...profile.settings.contact_links];
                                                newLinks[idx].type = e.target.value;
                                                setProfile({ ...profile, settings: { ...profile.settings, contact_links: newLinks } });
                                            }}
                                            className="h-9 w-1/3 shrink-0"
                                            disabled={!isEditing}
                                        />
                                        <Input 
                                            placeholder="Name/ID" 
                                            value={link.value} 
                                            onChange={e => {
                                                const newLinks = [...profile.settings.contact_links];
                                                newLinks[idx].value = e.target.value;
                                                setProfile({ ...profile, settings: { ...profile.settings, contact_links: newLinks } });
                                            }}
                                            className="h-9 flex-1"
                                            disabled={!isEditing}
                                        />
                                        {isEditing && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-9 w-9 text-red-500"
                                                onClick={() => {
                                                    const newLinks = profile.settings.contact_links.filter((_, i) => i !== idx);
                                                    setProfile({ ...profile, settings: { ...profile.settings, contact_links: newLinks } });
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {isEditing && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full h-8 text-xs border-dashed"
                                        onClick={() => {
                                            const newLinks = [...(profile.settings.contact_links || []), { type: '', value: '' }];
                                            setProfile({ ...profile, settings: { ...profile.settings, contact_links: newLinks } });
                                        }}
                                    >
                                        + Weiteren Kontakt hinzufügen
                                    </Button>
                                )}
                                {!isEditing && profile.settings.contact_links?.length === 0 && (
                                    <div className="text-gray-400 text-sm italic py-1">Keine weiteren Kontakte.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800 my-4" />

                    {/* Read Only Subjects */}
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Meine Angebote (aus Anzeigen)</label>
                        <div className="flex flex-wrap gap-2">
                            {profile.offered_subjects.length > 0 ? (
                                profile.offered_subjects.map(s => <SubjectChip key={s} subject={s} />)
                            ) : (
                                <span className="text-sm text-gray-400">Erstelle eine Anzeige, um hier Fächer zu sehen.</span>
                            )}
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Availability Calendar Card */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b pb-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={18} className="text-primary-hover" />
                            <CardTitle className="text-lg">Meine Verfügbarkeit</CardTitle>
                        </div>
                        {isEditing && (
                            <button
                                onClick={() => setPrivacyCalendar(!privacyCalendar)}
                                className={cn(
                                    "text-xs px-3 py-1 rounded-full border font-semibold transition-colors",
                                    privacyCalendar
                                        ? "border-gray-300 text-gray-500 bg-gray-50"
                                        : "border-green-400 text-green-700 bg-green-50"
                                )}
                            >
                                {privacyCalendar ? '🔒 Nur fürs Matching' : '👁️ Öffentlich sichtbar'}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        {privacyCalendar
                            ? 'Dein Kalender wird nur fürs Feed-Matching verwendet und ist für andere nicht einsehbar.'
                            : 'Dein Kalender ist öffentlich auf deinem Profil sichtbar.'}
                    </p>
                </CardHeader>
                <CardContent className="pt-6">
                    <AvailabilityCalendar
                        availability={availability}
                        onChange={isEditing ? setAvailability : undefined}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

// Simple Toggle Component
function ToggleSwitch({ checked, onChange, label }: { checked: boolean, onChange: () => void, label?: string }) {
    return (
        <label className="flex items-center cursor-pointer gap-2 select-none">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
                <div className={cn("w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors", checked && "bg-primary")}></div>
                <div className={cn("absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform", checked && "translate-x-4")}></div>
            </div>
            {label && <span className="text-[10px] uppercase font-bold text-gray-500">{label}</span>}
        </label>
    );
}
