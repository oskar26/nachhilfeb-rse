// Auf diesem Gerät verborgene Chats (Anfrage-IDs). Honest client-side hide:
// Die Anfrage und der Verlauf bleiben für die SV-Moderation gespeichert, nur
// die Liste wird aufgeräumt. Nach einem Neuladen bleibt die Auswahl bestehen.

const HIDDEN_CHATS_KEY = 'fwg_hidden_chats';

export function getHiddenChatIds(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(HIDDEN_CHATS_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function hideChatId(id: string): void {
    try {
        const next = new Set(getHiddenChatIds());
        next.add(id);
        localStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify([...next]));
    } catch { /* Storage darf den Flow nie stoppen */ }
}

export function unhideChatId(id: string): void {
    try {
        localStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify(getHiddenChatIds().filter(x => x !== id)));
    } catch { /* ignore */ }
}
