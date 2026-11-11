import { Button } from '@/components/ui/button';
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
        <div className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-30 p-3 sm:bottom-4 sm:p-4">
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-overlay">
                <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-brand-ink dark:text-primary">
                        {denied ? <BellOff size={20} /> : <Bell size={20} />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                            {denied ? 'Benachrichtigungen sind blockiert' : 'Benachrichtigungen aktivieren?'}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {denied
                                ? 'Du hast Benachrichtigungen abgelehnt. Aktiviere sie in den Browser-Einstellungen dieser Seite, um Neuigkeiten und Hinweise der Börse zu erhalten.'
                                : 'Aktiviere Mitteilungen, damit Neuigkeiten und Hinweise der Börse bei dir ankommen.'}
                        </p>
                    </div>
                    <Button variant="unstyled" size="unstyled"
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Hinweis schließen"
                        className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </Button>
                </div>
                <div className="mt-3 flex gap-2">
                    {!denied && (
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={handleEnable}
                            disabled={busy}
                            className="h-11 flex-1 rounded-full text-sm font-semibold"
                        >
                            {busy ? 'Einen Moment …' : 'Aktivieren'}
                        </Button>
                    )}
                    <Button variant="unstyled" size="unstyled"
                        type="button"
                        onClick={handleDismiss}
                        className="h-11 flex-1 rounded-full border border-border text-sm font-semibold text-muted-foreground"
                    >
                        {denied ? 'Später erinnern' : 'Jetzt nicht'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
