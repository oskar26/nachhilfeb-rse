// Zentrale Push-/Benachrichtigungs-Logik (lokale Notifications, kein Server-Push/VAPID).
//
// Strategie: Einmal präsent fragen (Bottom-Sheet). Bei Ablehnung oder Wegklicken
// erinnern wir nach einer Karenzzeit erneut — der Browser zeigt seinen
// System-Dialog allerdings nur, solange die Entscheidung noch aussteht
// (permission === 'default'). Nach einem harten "Blockieren" verweisen wir
// auf die Browser-Einstellungen, weil die Seite nicht erneut fragen darf.

const DISMISS_KEY = 'fwg_push_prompt_dismissed_at';
const GRANTED_KEY = 'fwg_push_prompt_granted';
const REMIND_DISMISSED_DAYS = 14;
const REMIND_DENIED_DAYS = 30;

export type PushState = 'unsupported' | 'granted' | 'denied' | 'prompt';

export function pushSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function pushPermission(): NotificationPermission | 'unsupported' {
    if (!pushSupported()) return 'unsupported';
    return Notification.permission;
}

function daysSince(ts: number): number {
    return (Date.now() - ts) / (1000 * 60 * 60 * 24);
}

function readTimestamp(key: string): number | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const ts = Number(raw);
        return Number.isFinite(ts) ? ts : null;
    } catch {
        return null;
    }
}

/** Soll das Push-Bottom-Sheet aktuell angezeigt werden? */
export function shouldShowPushPrompt(): boolean {
    if (!pushSupported()) return false;
    const perm = Notification.permission;
    if (perm === 'granted') {
        try { localStorage.setItem(GRANTED_KEY, '1'); } catch { /* ignore */ }
        return false;
    }
    if (perm === 'denied') {
        // Nach hartem Block erinnern wir max. alle 30 Tage (mit Hinweis auf
        // Browser-Einstellungen, da der System-Dialog nicht erneut erscheint).
        const dismissed = readTimestamp(DISMISS_KEY);
        return dismissed === null || daysSince(dismissed) >= REMIND_DENIED_DAYS;
    }
    // 'default': noch nie entschieden — nach Wegklicken 14 Tage Pause.
    const dismissed = readTimestamp(DISMISS_KEY);
    return dismissed === null || daysSince(dismissed) >= REMIND_DISMISSED_DAYS;
}

export function recordPushPromptDismiss(): void {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
}

/** Fragt die Browser-Berechtigung an. Gibt den Endzustand zurück. */
export async function requestPushPermission(): Promise<NotificationPermission | 'unsupported' | 'error'> {
    if (!pushSupported()) return 'unsupported';
    try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            try { localStorage.setItem(GRANTED_KEY, '1'); } catch { /* ignore */ }
        } else {
            recordPushPromptDismiss();
        }
        return result;
    } catch {
        recordPushPromptDismiss();
        return 'error';
    }
}
