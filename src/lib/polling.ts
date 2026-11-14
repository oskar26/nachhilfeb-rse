// ==============================================================================
// Live-Polling (übernommen von der Supabase-Attrappe, ersetzt die Realtime-Channels)
// Leitet die zyklischen Abfragen direkt an den nativen Client (./api) weiter.
// ==============================================================================

import { api } from './api';

const CHAT_INTERVAL_MS = 2000;
const NOTIFICATION_INTERVAL_MS = 12000;

// Chat: pollt bei jedem Tick die vollständige Nachrichtenliste einer Anfrage.
// So kommen auch Lesebestätigungen (read_at) für ältere Nachrichten an.
export function startChatPoll(
    requestId: string,
    onMessages: (msgs: any[]) => void
): () => void {
    const intervalId = setInterval(async () => {
        try {
            const res = await api.messages.list(requestId);
            if (res.data && Array.isArray(res.data)) {
                onMessages(res.data);
            }
        } catch (e) {
            console.error('Chat polling error:', e);
        }
    }, CHAT_INTERVAL_MS);

    return () => clearInterval(intervalId);
}

// Benachrichtigungen: stößt im festen Takt einen Tick an, der Consumer lädt selbst nach.
export function startNotificationPoll(onTick: () => void): () => void {
    const intervalId = setInterval(onTick, NOTIFICATION_INTERVAL_MS);
    return () => clearInterval(intervalId);
}
