// Anzeigen-Lesepfad: eine Quelle für Preis-Normierung, Filtern, Sortieren und
// die zuletzt gespeicherte Suche. Bewusst ohne React- und API-Abhängigkeit,
// damit die Regeln direkt testbar sind (siehe test/anzeigen.test.ts).
// Die Logik ist 1:1 aus src/pages/Feed.tsx herausgezogen – Verhalten dort
// unverändert übernommen, inklusive der Sonderfälle („free“ zählt als 0 €/h,
// „VB“ passiert den Preisfilter immer).

import { SUBJECT_CATEGORIES, type Subject } from '../components/SubjectChip';
import type { PriceDetails } from './utils';
import { countMatches, emptyAvailability, type Availability } from './availability';

export const PRICE_SLIDER_MIN = 0;
export const PRICE_SLIDER_MAX = 30;
export const SAVED_SEARCH_KEY = 'fwg_saved_search';
export const GRADE_VALUES = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];

export type SortKey = 'newest' | 'oldest' | 'cheapest' | 'priciest' | 'popular' | 'saved';
export const SORT_KEYS: SortKey[] = ['newest', 'oldest', 'cheapest', 'priciest', 'popular', 'saved'];

export function isValidSortKey(value: unknown): value is SortKey {
    return typeof value === 'string' && (SORT_KEYS as string[]).includes(value);
}

/** Struktureller Minimal-Typ: Feed-Anzeigen (inkl. eingebettetem Profil) passen hinein. */
export interface AnzeigeLike {
    type: 'offer' | 'search';
    subjects: Subject[];
    grade_levels: string[];
    price_details: PriceDetails | null;
    short_description: string;
    created_at: string;
    view_count?: number | null;
    favorite_count?: number | null;
    boosted?: boolean;
    boosted_until?: string | null;
    profiles?: {
        display_name?: string;
        is_verified?: boolean;
        grade_level?: string;
        is_coach?: boolean;
    } | null;
    profiles_avail?: Availability;
}

export interface AnzeigenFilter {
    query: string;
    type: 'all' | 'offer' | 'search';
    subject: Subject | null;
    grades: string[];
    minPrice: number;
    maxPrice: number;
    onlyCoaches: boolean;
}

export interface SortierOptionen {
    sortKey: SortKey;
    filterByTime: boolean;
    myAvailability: Availability;
}

export interface SavedSearch {
    query: string;
    type: 'all' | 'offer' | 'search';
    subject: Subject | null;
    grades: string[];
    minPrice: number;
    maxPrice: number;
    onlyCoaches: boolean;
    filterByTime: boolean;
    sortKey: SortKey;
}

/** Normiert den Preis einer Anzeige auf Euro pro Stunde (60 Min). free → 0, vb/unbekannt → null. */
export function stundenpreis(ad: AnzeigeLike): number | null {
    const mode = ad.price_details?.mode;
    if (mode === 'free') return 0;
    if (mode !== 'fixed') return null;
    const val = Number(ad.price_details?.value);
    if (!Number.isFinite(val) || val < 0) return null;
    const unit = ad.price_details?.unit;
    const minutes = unit === '45min' ? 45 : unit === '90min' ? 90 : 60;
    return Math.round(((val / minutes) * 60) * 100) / 100;
}

/** Boost aktiv? (Flag gesetzt UND Zeitfenster noch nicht abgelaufen.) */
export function istGeboostet(ad: AnzeigeLike): boolean {
    return Boolean(ad?.boosted && ad?.boosted_until && new Date(ad.boosted_until) > new Date());
}

/** Angebot von Nachwuchs (Klasse 5/6)? Wird im Feed nach unten sortiert. */
export function istNachwuchsAngebot(ad: AnzeigeLike): boolean {
    if (ad.type !== 'offer') return false;
    const grade = String(ad.profiles?.grade_level || '').trim().toUpperCase();
    return grade === '5' || grade === '6';
}

export function isValidSubject(value: unknown): value is Subject {
    return SUBJECT_CATEGORIES.some(category => category.subjects.includes(value as Subject));
}

/** Filtert Anzeigen exakt nach der bisherigen Feed-Logik (Suche über Beschreibung/Fächer/Anzeigename). */
export function filtereAnzeigen<T extends AnzeigeLike>(ads: T[], filter: AnzeigenFilter): T[] {
    return ads.filter(ad => {
        // Search
        const searchLower = filter.query.toLowerCase();
        if (filter.query &&
            !(ad.short_description?.toLowerCase() || '').includes(searchLower) &&
            !(ad.subjects || []).some((s: Subject) => s.toLowerCase().includes(searchLower)) &&
            !(ad.profiles?.display_name?.toLowerCase() || '').includes(searchLower)
        ) {
            return false;
        }
        // Type
        if (filter.type !== 'all' && ad.type !== filter.type) return false;
        // Subject
        if (filter.subject && !ad.subjects.includes(filter.subject)) return false;
        // Grade
        if (filter.grades.length > 0) {
            const hasMatch = filter.grades.some(g => ad.grade_levels.includes(g));
            if (!hasMatch) return false;
        }
        // Preis (normiert auf Euro pro Stunde; VB passiert immer, da Preis unbekannt)
        const hourly = stundenpreis(ad);
        if (hourly !== null) {
            if (hourly < filter.minPrice || hourly > filter.maxPrice) return false;
        }

        // Coach filter
        if (filter.onlyCoaches && !ad.profiles?.is_coach) return false;

        return true;
    });
}

/**
 * Sortiert Anzeigen exakt nach der bisherigen Feed-Logik: Boost oben, Nachwuchs unten,
 * dann die gewählte Sortierung. Ranking-Vorteil für Coaches (bewusst & offengelegt,
 * siehe /coaching): verifizierte Coaches erhalten +0.5 Matching-Punkte bzw. +24h
 * Frische-Bonus – als Anerkennung fürs Ehrenamt. Kein Kauf möglich.
 */
export function sortiereAnzeigen<T extends AnzeigeLike>(ads: T[], options: SortierOptionen): T[] {
    return [...ads].sort((a, b) => {
        const aBoost = istGeboostet(a);
        const bBoost = istGeboostet(b);

        if (aBoost && !bBoost) return -1;
        if (!aBoost && bBoost) return 1;

        const aYoung = istNachwuchsAngebot(a);
        const bYoung = istNachwuchsAngebot(b);
        if (aYoung !== bYoung) return aYoung ? 1 : -1;

        const aCoach = Boolean(a.profiles?.is_coach);
        const bCoach = Boolean(b.profiles?.is_coach);

        switch (options.sortKey) {
            case 'oldest':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'cheapest':
            case 'priciest': {
                // Unbekannte Preise (VB) ans Ende sortieren
                const pa = stundenpreis(a);
                const pb = stundenpreis(b);
                if (pa === null && pb === null) break;
                if (pa === null) return 1;
                if (pb === null) return -1;
                return options.sortKey === 'cheapest' ? pa - pb : pb - pa;
            }
            case 'popular':
                return (b.view_count || 0) - (a.view_count || 0);
            case 'saved':
                return (b.favorite_count || 0) - (a.favorite_count || 0);
            case 'newest':
            default:
                break;
        }

        if (options.filterByTime) {
            const scoreA = countMatches(options.myAvailability, a.profiles_avail || emptyAvailability()) + (aCoach ? 0.5 : 0);
            const scoreB = countMatches(options.myAvailability, b.profiles_avail || emptyAvailability()) + (bCoach ? 0.5 : 0);
            return scoreB - scoreA;
        } else {
            const timeA = new Date(a.created_at).getTime() + (aCoach ? 24 * 60 * 60 * 1000 : 0);
            const timeB = new Date(b.created_at).getTime() + (bCoach ? 24 * 60 * 60 * 1000 : 0);
            return timeB - timeA;
        }
    });
}

/** Validiert einen gespeicherten Suchstand (z. B. aus localStorage oder vom Server). */
export function parseGespeicherteSuche(value: unknown): SavedSearch | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (
        typeof record.query !== 'string' ||
        !['all', 'offer', 'search'].includes(String(record.type)) ||
        (record.subject !== null && !isValidSubject(record.subject)) ||
        !Array.isArray(record.grades) ||
        !record.grades.every(g => typeof g === 'string' && GRADE_VALUES.includes(g)) ||
        typeof record.minPrice !== 'number' || !Number.isInteger(record.minPrice) ||
        typeof record.maxPrice !== 'number' || !Number.isInteger(record.maxPrice) ||
        record.minPrice < PRICE_SLIDER_MIN || record.maxPrice > PRICE_SLIDER_MAX ||
        record.minPrice >= record.maxPrice ||
        typeof record.onlyCoaches !== 'boolean' || typeof record.filterByTime !== 'boolean'
    ) return null;
    return {
        query: record.query,
        type: record.type as SavedSearch['type'],
        subject: record.subject as Subject | null,
        grades: [...new Set(record.grades as string[])],
        minPrice: record.minPrice,
        maxPrice: record.maxPrice,
        onlyCoaches: record.onlyCoaches,
        filterByTime: record.filterByTime,
        sortKey: isValidSortKey(record.sortKey) ? record.sortKey : 'newest',
    };
}

/** Liest die gemerkte Suche vom Gerät (Offline-Fallback; Server bleibt Quelle der Wahrheit). */
export function ladeGespeicherteSuche(): SavedSearch | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(SAVED_SEARCH_KEY);
        if (!raw) return null;
        return parseGespeicherteSuche(JSON.parse(raw));
    } catch {
        return null;
    }
}

/** Speichert die Suche auf dem Gerät. true = gespeichert (Fehler werden wie bisher geloggt). */
export function speichereGespeicherteSuche(entry: SavedSearch): boolean {
    try {
        localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(entry));
        return true;
    } catch (err) {
        console.error('Could not save search', err);
        return false;
    }
}

/** Entfernt die gemerkte Suche vom Gerät. true = entfernt. */
export function verwerfeGespeicherteSuche(): boolean {
    try {
        localStorage.removeItem(SAVED_SEARCH_KEY);
        return true;
    } catch {
        return false;
    }
}
