// ==============================================================================
// Chatübersicht: reine Helfer für Suche, Vorschau und Zeitstempel
// ==============================================================================

import { parseAppointmentMessage } from './chat-appointments';
import { parseChatTimestamp } from './chat-grouping';

export interface ConversationSummary {
    request_id: string;
    status: string;
    ad_title?: string | null;
    ad_short_description?: string | null;
    ad_subjects?: string[] | null;
    other_user_id: string;
    display_name?: string | null;
    avatar_url?: string | null;
    avatar_type?: string | null;
    grade_level?: string | null;
    last_message?: string | null;
    last_message_at?: string | null;
    last_message_sender_id?: string | null;
    unread_count?: number;
    request_created_at?: string | null;
}

const UNEXPECTED_FORMAT = 'Unerwartetes Antwortformat der Chat-Übersicht.';

/**
 * Validiert die Antwort von `?conversations=1`. Eine 200-Antwort mit einem
 * Objekt (z. B. `{ success: true }`) oder einer Nachrichtenliste ist ein Fehler
 * und darf nicht als „keine Chats“ durchrutschen.
 */
export function parseConversationSummaries(value: unknown): ConversationSummary[] {
    if (!Array.isArray(value)) throw new Error(UNEXPECTED_FORMAT);
    for (const item of value) {
        if (!item || typeof item !== 'object') throw new Error(UNEXPECTED_FORMAT);
        const record = item as Record<string, unknown>;
        if (typeof record.request_id !== 'string' || typeof record.other_user_id !== 'string') {
            throw new Error(UNEXPECTED_FORMAT);
        }
    }
    return value as ConversationSummary[];
}

/** Header-Status der Anfrage; `rejected` ist der aktuelle Schema-Wert. */
export function requestStatusLabel(status?: string): string {
    switch (status) {
        case 'accepted': return 'Anfrage angenommen';
        case 'completed': return 'Anfrage abgeschlossen';
        case 'rejected':
        case 'declined': return 'Anfrage abgelehnt';
        case 'cancelled': return 'Anfrage abgebrochen';
        case 'pending': return 'Anfrage offen';
        default: return 'Nachhilfe-Chat';
    }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Kompakte Zeit wie in Messengern: Uhrzeit, Gestern, Wochentag, Datum. */
export function formatConversationTime(value: string | null | undefined, now: Date = new Date()): string {
    if (!value) return '';
    const date = parseChatTimestamp(value);
    if (!date) return '';
    const difference = Math.round(
        (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / MS_PER_DAY
    );
    if (difference === 0) {
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    if (difference === 1) return 'Gestern';
    if (difference > 1 && difference < 7) {
        return date.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function conversationPreview(
    conversation: ConversationSummary,
    currentUserId?: string | null
): string {
    const last = conversation.last_message?.trim();
    if (!last) return 'Noch keine Nachrichten';
    const appointment = parseAppointmentMessage(last);
    const base = appointment
        ? `Terminvorschlag: ${appointment.subject}`
        : last.replace(/\s+/g, ' ');
    const prefix = currentUserId && conversation.last_message_sender_id === currentUserId ? 'Du: ' : '';
    return `${prefix}${base}`;
}

function normalize(value: string): string {
    return value.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function filterConversations(
    conversations: ConversationSummary[],
    query: string,
    currentUserId?: string | null
): ConversationSummary[] {
    const needle = normalize(query.trim());
    if (!needle) return conversations;
    return conversations.filter((conversation) => {
        const haystack = [
            conversation.display_name ?? '',
            conversation.ad_title ?? '',
            conversation.ad_short_description ?? '',
            conversation.last_message ?? '',
            conversationPreview(conversation, currentUserId),
        ].join(' ');
        return normalize(haystack).includes(needle);
    });
}

/** Blendet lokal verborgene Chats aus, ohne die Serverdaten zu verändern. */
export function excludeHiddenConversations(
    conversations: ConversationSummary[],
    hiddenIds: string[]
): ConversationSummary[] {
    if (hiddenIds.length === 0) return conversations;
    const hidden = new Set(hiddenIds);
    return conversations.filter((conversation) => !hidden.has(conversation.request_id));
}
