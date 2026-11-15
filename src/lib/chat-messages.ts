// ==============================================================================
// Chat-Nachrichten: stabiler Merge für das 2-Sekunden-Polling
// ==============================================================================

/**
 * Minimalform einer Chat-Nachricht. Die Felder entsprechen der Nutzung in der
 * Chat-Seite; `edited_at` und `is_deleted` sind optional, weil die API sie je
 * nach Datenbankstand nicht immer mitliefert.
 */
export interface ChatMessage {
    id: string;
    sender_id: string;
    content: string;
    is_deleted?: boolean;
    read_at: string | null;
    created_at: string;
    edited_at?: string | null;
}

/**
 * Vergleicht alle Felder, deren Änderung eine Neuzeichnung des Chats auslösen
 * muss. `undefined` und `false` bzw. `undefined` und `null` gelten dabei als
 * derselbe Zustand, damit fehlende API-Felder keinen künstlichen Wechsel
 * erzeugen.
 */
function hasSameTrackedFields(a: ChatMessage, b: ChatMessage): boolean {
    return a.id === b.id
        && a.content === b.content
        && a.read_at === b.read_at
        && Boolean(a.is_deleted) === Boolean(b.is_deleted)
        && (a.edited_at ?? null) === (b.edited_at ?? null)
        && a.created_at === b.created_at
        && a.sender_id === b.sender_id;
}

/**
 * Merged die eingehende Poll-Antwort in den bisherigen Verlauf.
 *
 * - Bestehende Nachrichten werden anhand ihrer `id` aktualisiert.
 * - Neue Nachrichten kommen hinzu; nichts wird entfernt.
 * - Das Ergebnis ist aufsteigend nach `created_at` sortiert (lexikografisch,
 *   weil MySQL-DATETIME-Werte ein Leerzeichen statt `T` enthalten und
 *   `new Date(...)` in Safari unzuverlässig parst).
 * - Hat sich keines der sichtbaren Felder geändert, wird exakt `prev`
 *   zurückgegeben. Dadurch rendert React bei reinen Poll-Wiederholungen nicht
 *   neu und der Chat springt nicht.
 */
export function mergeMessages<T extends ChatMessage>(prev: T[], incoming: T[]): T[] {
    if (incoming.length === 0) {
        return prev;
    }

    const merged = new Map<string, T>(prev.map((message) => [message.id, message]));
    let changed = false;

    for (const message of incoming) {
        const existing = merged.get(message.id);
        if (!existing) {
            merged.set(message.id, message);
            changed = true;
            continue;
        }

        if (hasSameTrackedFields(existing, message)) {
            continue;
        }

        merged.set(message.id, { ...existing, ...message });
        changed = true;
    }

    if (!changed) {
        return prev;
    }

    return Array.from(merged.values()).sort(
        (a, b) => String(a.created_at).replace(' ', 'T')
            .localeCompare(String(b.created_at).replace(' ', 'T'))
    );
}
