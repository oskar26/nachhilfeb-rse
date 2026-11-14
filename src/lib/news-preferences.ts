import { newsScope } from './news';

/**
 * Sichtbarkeit der kompakten News-Karte auf "Entdecken". Getrennt von
 * Popup-/Lese-/Ausblendestatus, weil die Karte selbst keine News markiert:
 * Sie blendet nur die Fläche ein oder aus.
 */
export const NEWS_CARD_STORAGE_KEY = 'fwg_news_card_enabled';

export function newsCardStorageKey(viewer: string | null): string {
    return `${NEWS_CARD_STORAGE_KEY}:${newsScope(viewer)}`;
}

function getStorage(): Storage | null {
    try {
        if (typeof globalThis === 'undefined') return null;
        return (globalThis as { localStorage?: Storage }).localStorage ?? null;
    } catch {
        return null;
    }
}

/** Standard ist sichtbar; kaputte oder fehlende Werte blockieren die Karte nicht. */
export function isNewsCardEnabled(viewer: string | null): boolean {
    const storage = getStorage();
    if (!storage) return true;

    try {
        const raw = storage.getItem(newsCardStorageKey(viewer));
        if (raw === null) return true;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === 'boolean') return parsed;
        return raw !== 'false' && raw !== '0';
    } catch {
        return true;
    }
}

/** true = Einstellung wurde lokal gespeichert. */
export function setNewsCardEnabled(enabled: boolean, viewer: string | null): boolean {
    const storage = getStorage();
    if (!storage) return false;

    try {
        storage.setItem(newsCardStorageKey(viewer), JSON.stringify(Boolean(enabled)));
        return true;
    } catch {
        return false;
    }
}
