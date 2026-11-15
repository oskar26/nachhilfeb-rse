// ==============================================================================
// Chat-Zeitleiste: Datumstrenner und Gruppierung aufeinanderfolgender Sender
// ==============================================================================

export interface ChatTimelineMessage {
    id: string;
    sender_id: string;
    created_at: string;
}

export interface ChatTimelineRow<T extends ChatTimelineMessage> {
    message: T;
    showDateSeparator: boolean;
    dateLabel: string | null;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parst API-Zeitstempel tolerant (MySQL liefert ein Leerzeichen statt "T"). */
export function parseChatTimestamp(value: string): Date | null {
    const normalized = String(value ?? '').trim().replace(' ', 'T');
    if (!normalized) return null;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/** Stabiler Tages-Schlüssel in lokaler Zeit. */
export function chatDayKey(value: string): string {
    const date = parseChatTimestamp(value);
    if (!date) return String(value ?? '').slice(0, 10);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatChatDateLabel(value: string, now: Date = new Date()): string {
    const date = parseChatTimestamp(value);
    if (!date) return '';
    const difference = Math.round(
        (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / MS_PER_DAY
    );
    if (difference === 0) return 'Heute';
    if (difference === 1) return 'Gestern';
    return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
    });
}

export function formatChatTime(value: string): string {
    const date = parseChatTimestamp(value);
    if (!date) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** Gültiger datetime-Wert für <time>, sonst der ursprüngliche String. */
export function chatTimestampISO(value: string): string {
    const date = parseChatTimestamp(value);
    return date ? date.toISOString() : String(value ?? '');
}

/**
 * Berechnet pro Nachricht Datumstrenner sowie erste/letzte Position in einer
 * Sender-Gruppe. Die Reihenfolge der Eingabe bleibt unverändert.
 */
export function buildChatTimeline<T extends ChatTimelineMessage>(
    messages: T[],
    now: Date = new Date()
): ChatTimelineRow<T>[] {
    return messages.map((message, index) => {
        const day = chatDayKey(message.created_at);
        const previous = index > 0 ? messages[index - 1] : null;
        const next = index < messages.length - 1 ? messages[index + 1] : null;
        const sameDayAsPrevious = previous !== null && chatDayKey(previous.created_at) === day;
        const sameDayAsNext = next !== null && chatDayKey(next.created_at) === day;
        const showDateSeparator = !sameDayAsPrevious;

        return {
            message,
            showDateSeparator,
            dateLabel: showDateSeparator ? formatChatDateLabel(message.created_at, now) : null,
            isFirstInGroup: !sameDayAsPrevious || previous?.sender_id !== message.sender_id,
            isLastInGroup: !sameDayAsNext || next?.sender_id !== message.sender_id,
        };
    });
}
