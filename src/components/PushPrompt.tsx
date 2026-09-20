import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    pushPermission,
    pushSupported,
    recordPushPromptDismiss,
    requestPushPermission,
    shouldShowPushPrompt,
} from '../lib/push';
import { triggerHaptic } from '../lib/haptics';

// Präsent-ansprechendes Push-Bottom-Sheet (mobil optimiert).
// Erscheint nur für eingeloggte Nutzer, mit Verzögerung, und erinnert nach
// Ablehnung erneut (siehe src/lib/push.ts für die Karenzzeiten).
export function PushPrompt() {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const denied = pushSupported() && pushPermission() === 'denied';

    useEffect(() => {
        if (!user) return;
        if (!shouldShowPushPrompt()) return;
        const t = window.setTimeout(() => setVisible(true), 12000);
        return () => window.clearTimeout(t);
    }, [user]);

    if (!visible || !user) return null;

    const handleDismiss = () => {
        triggerHaptic('light');
        recordPushPromptDismiss();
        setVisible(false);
    };

    const handleEnable = async () => {
        triggerHaptic('medium');
        setBusy(true);
        await requestPushPermission();
        setBusy(false);
        setVisible(false);
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-[70] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
            <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-start gap-3">
                    <span className="rounded-2xl bg-primary/15 p-2.5 text-primary-hover">
                        {denied ? <BellOff size={20} /> : <Bell size={20} />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {denied ? 'Benachrichtigungen sind blockiert' : 'Keine Neuigkeit mehr verpassen?'}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            {denied
                                ? 'Du hast Benachrichtigungen abgelehnt. Aktiviere sie in den Browser-Einstellungen dieser Seite, um z. B. bei neuen Anfragen informiert zu werden.'
                                : 'Aktiviere Mitteilungen, damit du z. B. bei neuen Anfragen, Antworten und Schul-Mitteilungen sofort Bescheid weißt.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Hinweis schließen"
                        className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="mt-3 flex gap-2">
                    {!denied && (
                        <button
                            type="button"
                            onClick={handleEnable}
                            disabled={busy}
                            className="h-11 flex-1 rounded-full bg-primary text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-60"
                        >
                            {busy ? 'Einen Moment …' : 'Aktivieren'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="h-11 flex-1 rounded-full border border-gray-200 text-sm font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    >
                        {denied ? 'Später erinnern' : 'Jetzt nicht'}
                    </button>
                </div>
            </div>
        </div>
    );
}
