// ==============================================================================
// Chat-Emojis: nur Text-Nachrichten, keine vorgetäuschten Reaktionen
// ==============================================================================

/** Reaktionen werden als eigenständige Textnachricht gesendet. */
export const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😊', '🙏', '🎉'] as const;

export const QUICK_REACTION_LABELS: Record<string, string> = {
    '👍': 'Daumen hoch',
    '❤️': 'Herz',
    '😂': 'Lachen',
    '😊': 'Lächeln',
    '🙏': 'Danke',
    '🎉': 'Feiern',
};

export const COMPOSER_EMOJIS = [
    '😊', '😂', '👍', '🙏', '❤️', '🎉',
    '😅', '😍', '🤔', '👋', '✅', '📚',
] as const;

/**
 * True, wenn die Nachricht ausschließlich aus Emojis (und Leerraum) besteht.
 * Buchstaben und Zahlen schließen große Emoji-Darstellung bewusst aus.
 */
export function isEmojiOnly(content: string): boolean {
    const trimmed = String(content ?? '').trim();
    if (!trimmed) return false;
    if (/[\p{L}\p{N}]/u.test(trimmed)) return false;
    const stripped = trimmed.replace(/\s|\u200D|\uFE0E|\uFE0F|[\u{1F3FB}-\u{1F3FF}]/gu, '');
    if (!stripped) return false;
    return /^\p{Extended_Pictographic}+$/u.test(stripped);
}

/**
 * Große Darstellung nur für kurze Emoji-Nachrichten. Lange Emoji-Ketten bleiben
 * normal groß, damit sie nicht die halbe Chatbreite füllen.
 */
export function isLargeEmojiMessage(content: string): boolean {
    if (!isEmojiOnly(content)) return false;
    return Array.from(String(content).trim()).length <= 8;
}

/** Fügt ein Emoji mit sinnvollem Abstand in den bestehenden Entwurf ein. */
export function appendEmoji(draft: string, emoji: string): string {
    const value = String(draft ?? '');
    if (!value) return emoji;
    return /[\s\n]$/.test(value) ? `${value}${emoji}` : `${value} ${emoji}`;
}
