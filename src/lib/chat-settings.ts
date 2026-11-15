// ==============================================================================
// Lokale Chat-Werkzeuge
// ==============================================================================
//
// Die Schalter sind reine UI-Präferenzen. Sie blenden Funktionen aus, ändern
// aber nie Backend-Daten. Standardmäßig ist alles an; gespeichert wird pro
// Browser in localStorage.

export interface ChatToolSettings {
    /** Terminvorschläge: Dialog, strukturierte Karten, Annehmen/Ablehnen. */
    appointments: boolean;
    /** Kalenderpanel und .ics-Download. */
    calendar: boolean;
    /** Starter-Chips, Reaktionen und Termin-Schnellantworten. */
    quickReplies: boolean;
    /** Emoji-Picker im Composer. */
    emojiPicker: boolean;
}

export const DEFAULT_CHAT_TOOL_SETTINGS: ChatToolSettings = {
    appointments: true,
    calendar: true,
    quickReplies: true,
    emojiPicker: true,
};

export const CHAT_TOOL_SETTINGS_KEY = 'fwg_chat_tools';

function asStorage(storage?: Storage | null): Storage | null {
    if (storage) return storage;
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

/** Macht aus beliebigem JSON immer einen vollständigen, typsicheren Zustand. */
export function normalizeChatToolSettings(value: unknown): ChatToolSettings {
    if (!value || typeof value !== 'object') return { ...DEFAULT_CHAT_TOOL_SETTINGS };
    const record = value as Record<string, unknown>;
    const next = { ...DEFAULT_CHAT_TOOL_SETTINGS };
    for (const key of Object.keys(next) as (keyof ChatToolSettings)[]) {
        if (typeof record[key] === 'boolean') next[key] = record[key] as boolean;
    }
    return next;
}

export function loadChatToolSettings(storage?: Storage | null): ChatToolSettings {
    const target = asStorage(storage);
    if (!target) return { ...DEFAULT_CHAT_TOOL_SETTINGS };
    try {
        const raw = target.getItem(CHAT_TOOL_SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_CHAT_TOOL_SETTINGS };
        return normalizeChatToolSettings(JSON.parse(raw));
    } catch {
        return { ...DEFAULT_CHAT_TOOL_SETTINGS };
    }
}

export function saveChatToolSettings(settings: ChatToolSettings, storage?: Storage | null): void {
    const target = asStorage(storage);
    if (!target) return;
    try {
        target.setItem(CHAT_TOOL_SETTINGS_KEY, JSON.stringify(normalizeChatToolSettings(settings)));
    } catch {
        /* Storage darf den Chat nie blockieren */
    }
}
