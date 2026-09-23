import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type PriceMode = 'fixed' | 'free' | 'vb';

export interface PriceDetails {
    mode?: PriceMode;
    value?: number;
    unit?: string;
}

/** Unit token -> human German label (45min -> 45 Min). */
export function unitLabel(unit?: string): string {
    if (!unit) return '45 Min';
    const m = unit.match(/^(\d+)\s*(min|Min|Std|h)?$/i);
    if (m) {
        const n = m[1];
        const u = (m[2] || 'min').toLowerCase();
        if (u === 'std' || u === 'h') return `${n} Std`;
        return `${n} Min`;
    }
    return unit;
}

/**
 * Single price dialect for the whole product:
 * fixed -> "12 € / 45 Min" | free -> "Kostenlos" | vb -> "VB"
 */
export function formatAdPrice(details?: PriceDetails | null): string {
    if (!details) return 'Preis auf Anfrage';
    if (details.mode === 'free') return 'Kostenlos';
    if (details.mode === 'vb') return 'VB';
    if (details.mode === 'fixed' && typeof details.value === 'number') {
        return `${details.value} € / ${unitLabel(details.unit)}`;
    }
    return 'Preis auf Anfrage';
}

/** Effective €/hour from unit minutes (45min unit => value/45*60). */
export function hourlyRate(details?: PriceDetails | null): number | null {
    if (!details || details.mode !== 'fixed' || typeof details.value !== 'number') return null;
    const unit = (details.unit || '45min').toLowerCase();
    const m = unit.match(/^(\d+)/);
    const mins = m ? parseInt(m[1], 10) : unit.includes('h') || unit.includes('std') ? 60 : 45;
    if (!mins || mins <= 0) return null;
    return Math.round((details.value / mins) * 60 * 10) / 10;
}

/** "16 €/h" from details, or null when not fixed. */
export function formatHourlyFromDetails(details?: PriceDetails | null): string | null {
    const h = hourlyRate(details);
    if (h === null) return null;
    const text = Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',');
    return `${text} €/h`;
}
