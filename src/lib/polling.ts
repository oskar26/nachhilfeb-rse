// ==============================================================================
// Live-Polling (übernommen von der Supabase-Attrappe, ersetzt die Realtime-Channels)
// Leitet die zyklischen Abfragen direkt an den nativen Client (./api) weiter.
// ==============================================================================

import { api } from './api';

const CHAT_INTERVAL_MS = 2000;
const NOTIFICATION_INTERVAL_MS = 12000;

// Chat: pollt neue Nachrichten einer Anfrage (nach `after`-Timestamp).
// Ruft onMessage für jede tatsächlich neue Nachricht auf.
export function startChatPoll(
    requestId: string,
    onMessage: (msg: any) => void
): () => void {
    let lastTimestamp: string | undefined = undefined;

    const intervalId = setInterval(async () => {
        try {
            const res = await api.messages.list(requestId, lastTimestamp);
            if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                for (const msg of res.data) {
                    lastTimestamp = msg.created_at;
                    onMessage(msg);
                }
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
