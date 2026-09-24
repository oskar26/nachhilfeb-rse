import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Loader2, User, GraduationCap, BookOpen, Clock, Eye, Bell } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { SubjectChip, SUBJECT_CATEGORIES, type Subject } from '../SubjectChip';
import { RefinedGradeSelector } from '../RefinedGradeSelector';
import { AvailabilityCalendar, emptyAvailability, type Availability } from '../AvailabilityCalendar';
import { SectionTitle } from './shared';
import type { ChildView, ParentPermissions } from './types';

const DEFAULT_PERMISSIONS: ParentPermissions = {
    can_view_ads: true,
    can_view_ratings: true,
    can_view_activity: true,
    can_receive_notifications: true
};

/**
 * Kind-Einstellungen: Profil des Kindes bearbeiten (Name, Klasse, Fächer, Bio,
 * Verfügbarkeit), Sichtbarkeit steuern und die eigenen Eltern-Rechte setzen.
 */
export function ChildSettingsTab({ child, onSaved }: { child: ChildView; onSaved: () => void }) {
    const p = child.profile;

    const [firstName, setFirstName] = useState(p.first_name || '');
    const [lastName, setLastName] = useState(p.last_name || '');
    const [displayName, setDisplayName] = useState(p.display_name || '');
    const [grade, setGrade] = useState(p.grade_level || '');
    const [letter, setLetter] = useState(p.class_letter || '');
    const [subjects, setSubjects] = useState<Subject[]>((p.subjects as Subject[]) || []);
    const [bio, setBio] = useState(p.bio || '');
    const [availability, setAvailability] = useState<Availability>(() => {
        const a = p.availability as Availability | null | undefined;
        return a && typeof a === 'object' ? { ...emptyAvailability(), ...a } : emptyAvailability();
    });

    const [settings, setSettings] = useState({
        email_visible: Boolean(p.settings?.email_visible),
        phone_visible: Boolean(p.settings?.phone_visible),
        custom_contacts: Boolean(Array.isArray(p.settings?.custom_contacts) && p.settings.custom_contacts.length > 0)
    });

    const [permissions, setPermissions] = useState<ParentPermissions>({ ...DEFAULT_PERMISSIONS, ...child.permissions });

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingPerms, setSavingPerms] = useState(false);

    const toggleSubject = (s: Subject) => {
        setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    };

    const saveProfile = async () => {
        setSavingProfile(true);
        try {
            const { error } = await api.parentLinks.updateChild(p.id, {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                display_name: displayName.trim(),
                grade_level: grade,
                class_letter: letter,
                subjects,
                bio: bio.trim(),
                availability
            });
            if (error) throw error;
            toast.success('Profil des Kindes gespeichert');
            onSaved();
        } catch {
            toast.error('Profil konnte nicht gespeichert werden');
        } finally {
            setSavingProfile(false);
        }
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            const { error } = await api.parentLinks.updateChild(p.id, { settings });
            if (error) throw error;
            toast.success('Einstellungen gespeichert');
            onSaved();
        } catch {
            toast.error('Einstellungen konnten nicht gespeichert werden');
        } finally {
            setSavingSettings(false);
        }
    };

    const savePermissions = async (next: ParentPermissions) => {
        setSavingPerms(true);
        try {
            // Merge statt Überschreiben – so bleiben gesetzte Rechte erhalten.
            const merged = { ...permissions, ...next };
            const { error } = await api.parentLinks.update(child.linkId, { permissions: merged });
            if (error) throw error;
            setPermissions(merged);
            toast.success('Rechte aktualisiert');
            onSaved();
        } catch {
            toast.error('Rechte konnten nicht aktualisiert werden');
        } finally {
            setSavingPerms(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* ── Profil ───────────────────────────────────────────── */}
            <section>
                <SectionTitle
                    action={
                        <Button variant="primary" size="sm" className="rounded-xl font-bold" disabled={savingProfile} onClick={saveProfile}>
                            {savingProfile ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
                            Speichern
                        </Button>
                    }
                >
                    Profil des Kindes
                </SectionTitle>

                <div className="mt-4 space-y-5 rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            <User size={13} aria-hidden /> Name
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Input placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            <Input placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            <Input placeholder="Anzeigename" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                        <p className="mt-1.5 text-[11px] text-gray-400">Der Anzeigename wird im Feed und auf dem öffentlichen Profil angezeigt.</p>
                    </div>

                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            <GraduationCap size={13} aria-hidden /> Klasse / Jahrgangsstufe
                        </p>
                        <RefinedGradeSelector grade={grade} letter={letter} onChange={(g, l) => { setGrade(g); setLetter(l); }} />
                    </div>

                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            <BookOpen size={13} aria-hidden /> Fächer ({subjects.length} ausgewählt)
                        </p>
                        <div className="space-y-3">
                            {SUBJECT_CATEGORIES.map((cat) => (
                                <div key={cat.title}>
                                    <p className="mb-1.5 text-[11px] font-semibold text-gray-400">{cat.title}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cat.subjects.map((s) => (
                                            <SubjectChip
                                                key={s}
                                                subject={s}
                                                selected={subjects.includes(s)}
                                                onClick={() => toggleSubject(s)}
                                                className="cursor-pointer"
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">Kurzbeschreibung</p>
                        <textarea
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                            placeholder="Wenige Sätze zu Stärken, Fächern und Wünschen …"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </div>

                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            <Clock size={13} aria-hidden /> Verfügbarkeit
                        </p>
                        <AvailabilityCalendar availability={availability} onChange={setAvailability} compact />
                    </div>
                </div>
            </section>

            {/* ── Sichtbarkeit ─────────────────────────────────────── */}
            <section>
                <SectionTitle
                    action={
                        <Button variant="outline" size="sm" className="rounded-xl font-bold" disabled={savingSettings} onClick={saveSettings}>
                            {savingSettings ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
                            Speichern
                        </Button>
                    }
                >
                    <span className="flex items-center gap-2">
                        <Eye size={18} aria-hidden /> Sichtbarkeit
                    </span>
                </SectionTitle>

                <div className="mt-4 divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                    <SettingRow
                        label="E-Mail-Adresse anzeigen"
                        hint="Ist deaktiviert, bleibt die E-Mail im öffentlichen Profil verborgen."
                        checked={settings.email_visible}
                        onChange={(v) => setSettings({ ...settings, email_visible: v })}
                    />
                    <SettingRow
                        label="Telefonnummer anzeigen"
                        hint="Telefonnummern erscheinen nur, wenn dies aktiviert ist."
                        checked={settings.phone_visible}
                        onChange={(v) => setSettings({ ...settings, phone_visible: v })}
                    />
                    <SettingRow
                        label="Eigene Kontaktkanäle erlauben"
                        hint="z. B. Instagram, Discord oder WhatsApp als Kontaktmöglichkeit."
                        checked={settings.custom_contacts}
                        onChange={(v) => setSettings({ ...settings, custom_contacts: v })}
                    />
                </div>
            </section>

            {/* ── Eltern-Rechte ────────────────────────────────────── */}
            <section>
                <SectionTitle>
                    <span className="flex items-center gap-2">
                        <Bell size={18} aria-hidden /> Ihre Ansicht &amp; Benachrichtigungen
                    </span>
                </SectionTitle>

                <div className="mt-4 divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                    <SettingRow
                        label="Anzeigen des Kindes einsehen"
                        hint="Zeigt die aktuellen und pausierten Anzeigen im Tab „Anzeigen“."
                        checked={permissions.can_view_ads}
                        onChange={(v) => savePermissions({ ...permissions, can_view_ads: v })}
                    />
                    <SettingRow
                        label="Bewertungen einsehen"
                        hint="Zeigt die Bewertungen des Kindes inklusive Sternewertung."
                        checked={permissions.can_view_ratings}
                        onChange={(v) => savePermissions({ ...permissions, can_view_ratings: v })}
                    />
                    <SettingRow
                        label="Aktivitäts-Verlauf einsehen"
                        hint="Der Überblick zeigt Anzeigen-, Anfrage- und Bewertungsaktivitäten."
                        checked={permissions.can_view_activity}
                        onChange={(v) => savePermissions({ ...permissions, can_view_activity: v })}
                    />
                    <SettingRow
                        label="Benachrichtigungen erhalten"
                        hint="Sie werden informiert, wenn es neue Anfragen, Anzeigen oder Bewertungen gibt."
                        checked={permissions.can_receive_notifications}
                        onChange={(v) => savePermissions({ ...permissions, can_receive_notifications: v })}
                    />
                </div>

                {savingPerms && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                        <Loader2 size={12} className="animate-spin" aria-hidden /> Rechte werden gespeichert …
                    </p>
                )}

                <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                    Der Chatverlauf Ihres Kindes bleibt Ihnen aus Datenschutzgründen verborgen – Sie sehen lediglich Status und Gegenstelle der Anfragen.
                </p>
            </section>
        </div>
    );
}

function SettingRow({
    label,
    hint,
    checked,
    onChange
}: {
    label: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4">
            <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-950 dark:text-gray-50">{label}</span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
            </span>
            <span className="shrink-0 pt-0.5">
                <Switch checked={checked} onChange={() => onChange(!checked)} label={label} />
            </span>
        </label>
    );
}
