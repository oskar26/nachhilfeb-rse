// Preis-Sprache der Plattform: eine Quelle für Richtwert, Formate und Modi.
// Bewusst ohne React- und API-Abhängigkeit, damit die Regeln direkt testbar
// sind (siehe test/pricing.test.ts).
//
// Semantik bleibt deckungsgleich mit formatAdPrice() aus utils.ts:
//   fixed -> "12 € / 45 Min" | vb -> "VB" | free -> "Kostenlos"

import { unitLabel } from './utils';

export type PriceMode = 'fixed' | 'vb' | 'free';

/** Preis kann aus JSON als Zahl oder (defensiv) als String kommen. */
export type PriceValue = number | string | null | undefined;

/** Dauer als Minuten-Zahl oder als API-Unit-Token ("45min", "60", "1h"). */
export type PriceDuration = number | string | null | undefined;

/**
 * Verbindlicher Preis-Richtwert für die Oberfläche. Die Zahlen sind die
 * abgestimmten Produktwerte, keine erfundenen Marktdaten.
 */
export const PRICE_GUIDELINE = {
    sessionMinutes: 45,
    sessionPrice: 12,
    hourlyPrice: 16,
    studentHourlyMin: 10,
    studentHourlyMax: 20,
    studentRangeLabel: '10–20 € pro Stunde',
    /** Volle Copy für CreateAd und Erklärtexte. */
    copy: 'Richtwert: 12 € pro 45 Minuten (16 € pro Stunde). Schüler:innen als Nachhilfelehrkräfte liegen meist bei 10–20 € pro Stunde; du legst den Preis selbst fest.',
    /** Kurzform für enge Karten und Inline-Hinweise. */
    shortCopy: '12 € pro 45 Minuten = 16 € pro Stunde',
} as const;

/** Deutsche Labels für die drei erlaubten Modi (z. B. CreateAd-Auswahl). */
export const PRICE_MODE_LABELS: Record<PriceMode, string> = {
    fixed: 'Festpreis',
    vb: 'Verhandlungsbasis',
    free: 'Kostenlos',
};

export interface PriceParts {
    mode: PriceMode;
    /** Große Zeile, z. B. "12 €", "VB" oder "Kostenlos". */
    primary: string;
    /** Kleine Einheit, z. B. "45 Min"; null bei vb/free. */
    unit: string | null;
    /** Vollständiger, kanonischer Text wie formatAdPrice(). */
    label: string;
}

export interface PriceInput {
    price?: PriceValue;
    mode?: unknown;
    duration?: PriceDuration;
}

/** Akzeptiert beliebige API-/Formularwerte und fällt sicher auf "fixed" zurück. */
export function normalizePriceMode(mode: unknown): PriceMode {
    if (typeof mode !== 'string') return 'fixed';
    const normalized = mode.trim().toLowerCase();
    if (normalized === 'free' || normalized === 'kostenlos' || normalized === 'gratis') {
        return 'free';
    }
    if (normalized === 'vb' || normalized === 'negotiable' || normalized === 'verhandlungsbasis') {
        return 'vb';
    }
    return 'fixed';
}

/** Normalisiert eine Dauer auf ein Unit-Token, das unitLabel() versteht. */
export function normalizePriceDuration(duration?: PriceDuration): string {
    if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        return `${Math.round(duration)}min`;
    }
    if (typeof duration === 'string' && duration.trim()) {
        const token = duration.trim();
        if (/^\d+$/.test(token)) return `${token}min`;
        if (/^(h|std|stunde|stunden)$/i.test(token)) return '1h';
        return token;
    }
    return `${PRICE_GUIDELINE.sessionMinutes}min`;
}

function normalizePriceValue(price: PriceValue): number | null {
    if (typeof price === 'number') {
        return Number.isFinite(price) && price >= 0 ? price : null;
    }
    if (typeof price === 'string' && price.trim()) {
        const parsed = Number(price.replace(',', '.'));
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }
    return null;
}

function isPriceInput(value: PriceInput | PriceValue): value is PriceInput {
    return typeof value === 'object' && value !== null;
}

function buildPriceParts(input: PriceInput): PriceParts {
    const mode = normalizePriceMode(input.mode);

    if (mode === 'free') {
        return { mode, primary: 'Kostenlos', unit: null, label: 'Kostenlos' };
    }
    if (mode === 'vb') {
        return { mode, primary: 'VB', unit: null, label: 'VB' };
    }

    const value = normalizePriceValue(input.price);
    if (value === null) {
        return { mode, primary: 'Preis auf Anfrage', unit: null, label: 'Preis auf Anfrage' };
    }

    const duration = normalizePriceDuration(input.duration);
    const unit = unitLabel(duration);
    return {
        mode,
        primary: `${value} €`,
        unit,
        label: `${value} € / ${unit}`,
    };
}

/**
 * Zerlegt einen Preis in Anzeige-Teile. Unterstützt Objekt-Aufruf
 * (PriceTag-Props) und die kompakte Positionsform.
 */
export function formatPriceParts(input: PriceInput): PriceParts;
export function formatPriceParts(price?: PriceValue, mode?: unknown, duration?: PriceDuration): PriceParts;
export function formatPriceParts(
    inputOrPrice?: PriceInput | PriceValue,
    mode?: unknown,
    duration?: PriceDuration,
): PriceParts {
    if (isPriceInput(inputOrPrice)) return buildPriceParts(inputOrPrice);
    return buildPriceParts({ price: inputOrPrice, mode, duration });
}

/** Kanonischer Preistext (identisch zu formatAdPrice für dieselben Werte). */
export function formatPriceLabel(input: PriceInput): string {
    return formatPriceParts(input).label;
}
