// News vertical slice: eine Normalisierung für beide API-Payloads und
// per-user gespeicherter Lese-/Ausblendestatus.
//
// Die Komponenten (Popup, CollapsedNewsWidget, Admin-News) dürfen rohe
// API-Daten nicht selbst interpretieren. Diese Datei ist die einzige Quelle
// für `body ?? content`, Icon-Fallbacks und localStorage-Schlüssel.

export const NEWS_ICON_FALLBACK = 'megaphone';
export const NEWS_STORAGE_PREFIX = 'fwg_news';
export const NEWS_USER_STORAGE_KEY = 'fwg_auth_user';
export const LEGACY_DISMISSED_NEWS_KEY = 'dismissed_news_ids';

export interface NewsItem {
    id: string;
    title: string;
    /** Immer befüllt; bevorzugt `body`, sonst `content`. */
    body: string;
    /** Spiegel von body für Aufrufer, die den API-Namen `content` nutzen. */
    content: string;
    icon: string;
    created_at: string;
    is_pinned: boolean;
}

export interface NewsStorageKeys {
    read: string;
    hidden: string;
    popupEnabled: string;
}

type UnknownRecord = Record<string, unknown>;

function readText(value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function readBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function readRecord(value: unknown): UnknownRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as UnknownRecord;
}

/**
 * Normalisiert einen News-Datensatz aus der API. `body` und `content` sind
 * beide gültig; ungültige Zeilen liefern null statt "Invalid Date"-UI.
 */
export function normalizeNews(raw: unknown): NewsItem | null {
    const row = readRecord(raw);
    if (!row) return null;

    const id = readText(row.id);
    const title = readText(row.title);
    const body = readText(row.body) ?? readText(row.content);
    const createdAt = readText(row.created_at);
    if (!id || !title || !body || !createdAt) return null;
    if (Number.isNaN(new Date(createdAt).getTime())) return null;

    return {
        id,
        title,
        body,
        content: body,
        icon: readText(row.icon) ?? NEWS_ICON_FALLBACK,
        created_at: createdAt,
        is_pinned: readBoolean(row.is_pinned) || readBoolean(row.pinned),
    };
}

/** Normalisiert eine Liste und verwirft ungültige Zeilen still. */
export function normalizeNewsList(raw: unknown): NewsItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((row) => normalizeNews(row))
        .filter((item): item is NewsItem => item !== null);
}

/** Angepinnte zuerst, innerhalb der Gruppen neueste zuerst. */
export function sortNews(items: NewsItem[]): NewsItem[] {
    return [...items].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function getStorage(): Storage | null {
    try {
        if (typeof globalThis === 'undefined') return null;
        const storage = (globalThis as { localStorage?: Storage }).localStorage;
        return storage ?? null;
    } catch {
        return null;
    }
}

function sanitizeScope(value: string): string {
    const clean = value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    return clean || 'guest';
}

function readStoredUserId(): string | null {
    const storage = getStorage();
    if (!storage) return null;
    try {
        const raw = storage.getItem(NEWS_USER_STORAGE_KEY);
        if (!raw) return null;
        const user = readRecord(JSON.parse(raw));
        return readText(user?.id);
    } catch {
        return null;
    }
}

/**
 * Stabiler Storage-Scope je Person. Explicit viewer gewinnt; sonst wird die
 * lokal gespeicherte Session gelesen; Gäste teilen sich `guest`.
 */
export function newsScope(viewer?: string | null): string {
    const explicit = readText(viewer);
    if (explicit) return `u_${sanitizeScope(explicit)}`;
    const stored = readStoredUserId();
    return stored ? `u_${sanitizeScope(stored)}` : 'guest';
}

export function newsStorageKeys(viewer?: string | null): NewsStorageKeys {
    const scope = newsScope(viewer);
    return {
        read: `${NEWS_STORAGE_PREFIX}_read:${scope}`,
        hidden: `${NEWS_STORAGE_PREFIX}_hidden:${scope}`,
        popupEnabled: `${NEWS_STORAGE_PREFIX}_popup:${scope}`,
    };
}

function readIdList(key: string): string[] {
    const storage = getStorage();
    if (!storage) return [];
    try {
        const raw = storage.getItem(key);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((value) => readText(value))
            .filter((value): value is string => value !== null);
    } catch {
        return [];
    }
}

function writeIdList(key: string, ids: string[]): boolean {
    const storage = getStorage();
    if (!storage) return false;
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    try {
        storage.setItem(key, JSON.stringify(unique));
        return true;
    } catch {
        return false;
    }
}

function removeKey(key: string): boolean {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

function addId(key: string, id: string | null | undefined): boolean {
    const cleanId = readText(id);
    if (!cleanId) return false;
    return writeIdList(key, [...readIdList(key), cleanId]);
}

function removeId(key: string, id: string | null | undefined): boolean {
    const cleanId = readText(id);
    if (!cleanId) return false;
    return writeIdList(key, readIdList(key).filter((entry) => entry !== cleanId));
}

export function getReadNewsIds(viewer?: string | null): string[] {
    return readIdList(newsStorageKeys(viewer).read);
}

export function isNewsRead(id: string | null | undefined, viewer?: string | null): boolean {
    const cleanId = readText(id);
    return cleanId ? getReadNewsIds(viewer).includes(cleanId) : false;
}

/** Markiert eine News als gelesen. true = lokal gespeichert. */
export function markNewsRead(id: string | null | undefined, viewer?: string | null): boolean {
    return addId(newsStorageKeys(viewer).read, id);
}

/** Macht "gelesen" rückgängig (für "Gelesene Neuigkeiten anzeigen"). */
export function markNewsUnread(id: string | null | undefined, viewer?: string | null): boolean {
    return removeId(newsStorageKeys(viewer).read, id);
}

export function markAllNewsRead(ids: Array<string | null | undefined>, viewer?: string | null): boolean {
    const cleanIds = ids
        .map((id) => readText(id))
        .filter((id): id is string => id !== null);
    if (cleanIds.length === 0) return false;
    const key = newsStorageKeys(viewer).read;
    return writeIdList(key, [...readIdList(key), ...cleanIds]);
}

/**
 * Verborgene IDs der aktuellen Person. Der alte globale Schlüssel
 * `dismissed_news_ids` wird einmalig in den persönlichen Scope migriert,
 * damit frühere Ausblendungen erhalten bleiben.
 */
export function getHiddenNewsIds(viewer?: string | null): string[] {
    const keys = newsStorageKeys(viewer);
    const legacy = readIdList(LEGACY_DISMISSED_NEWS_KEY);
    if (legacy.length === 0) return readIdList(keys.hidden);

    const stored = readIdList(keys.hidden);
    const merged = [...new Set([...stored, ...legacy])];
    if (writeIdList(keys.hidden, merged)) {
        removeKey(LEGACY_DISMISSED_NEWS_KEY);
    }
    return merged;
}

export function isNewsHidden(id: string | null | undefined, viewer?: string | null): boolean {
    const cleanId = readText(id);
    return cleanId ? getHiddenNewsIds(viewer).includes(cleanId) : false;
}

/** Blendet eine News aus, ohne sie als gelesen zu markieren. */
export function hideNews(id: string | null | undefined, viewer?: string | null): boolean {
    return addId(newsStorageKeys(viewer).hidden, id);
}

/** Holt eine ausgeblendete News zurück. */
export function unhideNews(id: string | null | undefined, viewer?: string | null): boolean {
    return removeId(newsStorageKeys(viewer).hidden, id);
}

/** Leert nur die Ausblendeliste (nicht den Lesestatus). */
export function clearHiddenNews(viewer?: string | null): boolean {
    return writeIdList(newsStorageKeys(viewer).hidden, []);
}

export function isNewsPopupEnabled(viewer?: string | null): boolean {
    const storage = getStorage();
    if (!storage) return true;
    try {
        const raw = storage.getItem(newsStorageKeys(viewer).popupEnabled);
        if (raw === null) return true;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === 'boolean') return parsed;
        return raw !== 'false' && raw !== '0';
    } catch {
        // Kaputte Einstellung darf das Popup nicht dauerhaft blockieren.
        return true;
    }
}

export function setNewsPopupEnabled(enabled: boolean, viewer?: string | null): boolean {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.setItem(newsStorageKeys(viewer).popupEnabled, JSON.stringify(Boolean(enabled)));
        return true;
    } catch {
        return false;
    }
}

/**
 * Darf diese News als Popup erscheinen? Ohne ID wird nur die Einstellung
 * geprüft. Gelesene und ausgeblendete Einträge öffnen kein Popup mehr.
 */
export function showNewsPopup(
    news?: string | NewsItem | null,
    viewer?: string | null,
): boolean {
    if (!isNewsPopupEnabled(viewer)) return false;
    if (!news) return true;
    const cleanId = readText(typeof news === 'string' ? news : news.id);
    if (!cleanId) return true;
    return !isNewsRead(cleanId, viewer) && !isNewsHidden(cleanId, viewer);
}

/** Sprechender Alias für Aufrufer, die eine Prädikat-Funktion erwarten. */
export const shouldShowNewsPopup = showNewsPopup;

/** Nur ungelesene, nicht ausgeblendete Einträge. */
export function getVisibleNews(items: NewsItem[], viewer?: string | null): NewsItem[] {
    return items.filter((item) => !isNewsRead(item.id, viewer) && !isNewsHidden(item.id, viewer));
}

/** Entfernt alle News-Präferenzen der aktuellen Person (Settings-Reset). */
export function resetNewsPreferences(viewer?: string | null): boolean {
    const keys = newsStorageKeys(viewer);
    const results = [removeKey(keys.read), removeKey(keys.hidden), removeKey(keys.popupEnabled)];
    return results.every(Boolean);
}
