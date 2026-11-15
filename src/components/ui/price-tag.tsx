import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import {
    formatPriceParts,
    type PriceDuration,
    type PriceValue,
} from '@/lib/pricing';

export interface PriceTagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    price?: PriceValue;
    mode?: string | null;
    duration?: PriceDuration;
    /** Zwei Zeilen für Karten, eine Zeile für enge Meta-Zeilen. */
    layout?: 'stacked' | 'inline';
}

function secondaryLine(
    parts: ReturnType<typeof formatPriceParts>,
    inline: boolean,
): string | null {
    if (parts.unit) return inline ? `/ ${parts.unit}` : parts.unit;
    if (parts.mode === 'free') return inline ? '· Ehrenamtlich' : 'Ehrenamtlich';
    if (parts.mode === 'vb') return inline ? '· Verhandelbar' : 'Verhandelbar';
    if (parts.label === 'Preis auf Anfrage') return inline ? '· Noch offen' : 'Noch offen';
    return inline ? '· Auf Anfrage' : 'Auf Anfrage';
}

/**
 * Kompakter Preis-Baustein. Betrag und Einheit stehen untereinander, damit
 * „Kostenlos“, „VB“ und Festpreise dieselbe ruhige linke Kante behalten.
 * Die sichtbaren Teile bleiben bewusst klein: 15px/700 und 13px/500.
 * Für Screenreader gilt der kanonische formatAdPrice-Text.
 */
export function PriceTag({
    price,
    mode,
    duration,
    layout = 'stacked',
    className,
    ...props
}: PriceTagProps) {
    const parts = formatPriceParts({ price, mode, duration });
    const isInline = layout === 'inline';
    const secondary = secondaryLine(parts, isInline);

    return (
        <span
            data-slot="price-tag"
            data-price-mode={parts.mode}
            data-layout={layout}
            className={cn(
                'inline-flex shrink-0 select-none rounded-lg bg-primary-soft text-primary-soft-foreground',
                isInline
                    ? 'items-baseline gap-1.5 px-2 py-0.5'
                    : 'min-w-[5.25rem] flex-col items-start gap-1 px-2.5 py-1.5 text-left',
                className
            )}
            {...props}
        >
            <span className="sr-only">{parts.label}</span>
            <span
                aria-hidden="true"
                className="text-[15px] font-bold leading-none tracking-tight tabular-nums"
            >
                {parts.primary}
            </span>
            <span
                aria-hidden="true"
                className="text-xs font-medium leading-tight text-primary-soft-foreground/80 tabular-nums"
            >
                {secondary}
            </span>
        </span>
    );
}
