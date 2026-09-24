import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Mail, Save, Loader2, ShieldCheck, Users, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, apiErrorMessage } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VerifiedPill } from '../ui/VerifiedPill';
import AvatarMakerModal from '../AvatarMakerModal';
import { Avatar } from './ChildSwitcher';
import { SectionTitle } from './shared';

/**
 * Reduziertes Eltern-Profil: Name, Anzeigename, Avatar und E-Mail-Adresse.
 * Alles Weitere (Kind-Profil, Anzeigen) gehört ins Eltern-Dashboard.
 */
export function ParentProfileCard() {
    const { user, profile, refreshProfile } = useAuth();

    const [firstName, setFirstName] = useState(profile?.first_name || '');
    const [lastName, setLastName] = useState(profile?.last_name || '');
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Elternteil';

    const saveProfile = async () => {
        setSaving(true);
        try {
            const { error } = await api.profiles.update({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                display_name: displayName.trim(),
                avatar_url: avatarUrl,
                avatar_type: avatarUrl ? 'upload' : null
            });
            if (error) throw error;
            toast.success('Profil gespeichert');
            await refreshProfile();
        } catch {
            toast.error('Profil konnte nicht gespeichert werden');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* ── Kopf ─────────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="h-24 bg-gradient-to-r from-primary/70 via-primary to-yellow-400" />
                <div className="px-6 pb-6">
                    <div className="-mt-10 flex items-end gap-4">
                        <button
                            type="button"
                            onClick={() => setIsAvatarOpen(true)}
                            className="press rounded-full ring-4 ring-white dark:ring-gray-900"
                            aria-label="Avatar ändern"
                        >
                            <Avatar url={avatarUrl} name={fullName} size="lg" />
                        </button>
                        <div className="min-w-0 flex-1 pb-1">
                            <h1 className="truncate font-display text-2xl uppercase tracking-tight text-gray-950 dark:text-gray-50">
                                {displayName || fullName}
                            </h1>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    <Users size={12} aria-hidden /> Eltern-Account
                                </span>
                                {profile?.is_verified ? <VerifiedPill size="sm" /> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Name ─────────────────────────────────────────────── */}
            <section>
                <SectionTitle
                    action={
                        <Button variant="primary" size="sm" className="rounded-xl font-bold" disabled={saving} onClick={saveProfile}>
                            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
                            Speichern
                        </Button>
                    }
                >
                    Ihre Angaben
                </SectionTitle>

                <div className="mt-4 space-y-4 rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Vorname
                            </label>
                            <Input placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Nachname
                            </label>
                            <Input placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            Anzeigename
                        </label>
                        <Input placeholder="z. B. Familie Hansen" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        <p className="mt-1.5 text-[11px] text-gray-400">
                            Wird verwendet, wenn Sie Ihr Kind verknüpfen oder Anzeigen für es aufgeben.
                        </p>
                    </div>

                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => setIsAvatarOpen(true)}>
                        Avatar ändern
                    </Button>
                </div>
            </section>

            {/* ── E-Mail ───────────────────────────────────────────── */}
            <section>
                <SectionTitle>
                    <span className="flex items-center gap-2">
                        <Mail size={18} aria-hidden /> E-Mail-Adresse
                    </span>
                </SectionTitle>
                <EmailChangeCard currentEmail={user?.email || ''} />
            </section>

            {/* ── Hinweis aufs Dashboard ───────────────────────────── */}
            <div className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-yellow-800 dark:bg-primary/15 dark:text-yellow-300">
                        <ShieldCheck size={18} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-950 dark:text-gray-50">Angaben zu Ihren Kindern</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            Name, Klasse, Fächer, Verfügbarkeit und Sichtbarkeit Ihrer Kinder bearbeiten Sie
                            direkt im Eltern-Dashboard unter „Kind-Einstellungen“.
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 rounded-xl font-bold" onClick={() => { window.location.hash = '#/parent-dashboard'; }}>
                        Öffnen <ArrowRight size={14} aria-hidden />
                    </Button>
                </div>
            </div>

            <AvatarMakerModal
                isOpen={isAvatarOpen}
                onClose={() => setIsAvatarOpen(false)}
                onSave={(url) => setAvatarUrl(url)}
                initialName={displayName || fullName}
            />
        </div>
    );
}

/** E-Mail-Wechsel in zwei Schritten: neue Adresse → 6-stelliger Bestätigungscode. */
function EmailChangeCard({ currentEmail }: { currentEmail: string }) {
    const [step, setStep] = useState<'idle' | 'code'>('idle');
    const [newEmail, setNewEmail] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);

    const requestChange = async () => {
        setBusy(true);
        try {
            const { error } = await api.auth.requestEmailChange(newEmail.trim());
            if (error) throw error;
            toast.success('Bestätigungscode wurde gesendet');
            setStep('code');
        } catch (e) {
            toast.error(apiErrorMessage(e, 'Code konnte nicht gesendet werden'));
        } finally {
            setBusy(false);
        }
    };

    const confirmChange = async () => {
        setBusy(true);
        try {
            const { error } = await api.auth.confirmEmailChange(code.trim());
            if (error) throw error;
            toast.success('E-Mail-Adresse wurde geändert');
            setStep('idle');
            setCode('');
            setNewEmail('');
            setTimeout(() => window.location.reload(), 800);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'Code konnte nicht bestätigt werden'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-4 rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Aktuell</p>
                    <p className="mt-1 truncate font-mono text-sm text-gray-950 dark:text-gray-50">{currentEmail || '—'}</p>
                </div>
                {step === 'idle' && (
                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => setStep('code')}>
                        E-Mail ändern
                    </Button>
                )}
            </div>

            {step === 'code' && (
                <div className="mt-4 space-y-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-0 flex-1">
                            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Neue E-Mail-Adresse
                            </label>
                            <Input
                                type="email"
                                placeholder="name@beispiel.de"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            className="rounded-xl font-bold"
                            disabled={busy || !newEmail.trim()}
                            onClick={requestChange}
                        >
                            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
                            Code senden
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-0 flex-1">
                            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                6-stelliger Bestätigungscode
                            </label>
                            <Input
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="123456"
                                className="font-mono tracking-[0.3em]"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            />
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            className="rounded-xl font-bold"
                            disabled={busy || code.length !== 6}
                            onClick={confirmChange}
                        >
                            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
                            Bestätigen
                        </Button>
                    </div>

                    <button
                        type="button"
                        className="press text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => { setStep('idle'); setCode(''); }}
                    >
                        Abbrechen
                    </button>
                </div>
            )}
        </div>
    );
}
