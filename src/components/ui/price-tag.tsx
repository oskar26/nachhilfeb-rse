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

/**
 * Kompakter Preis-Baustein. Die sichtbaren Teile bleiben bewusst klein:
 * 15px/700 für den Betrag, 11px gedämpft für die Einheit. Für Screenreader
 * gilt der kanonische formatAdPrice-Text.
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

    return (
        <span
            data-slot="price-tag"
            data-price-mode={parts.mode}
            data-layout={layout}
            className={cn(
                'inline-flex shrink-0 select-none items-center rounded-lg bg-primary-soft text-primary-soft-foreground',
                isInline
                    ? 'gap-1 px-2 py-0.5'
                    : 'flex-col items-start gap-0.5 px-2.5 py-1',
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
            {parts.unit ? (
                <span
                    aria-hidden="true"
                    className="text-[11px] font-medium leading-none text-muted-foreground dark:text-primary-soft-foreground/75"
                >
                    {isInline ? `/ ${parts.unit}` : parts.unit}
                </span>
            ) : null}
        </span>
    );
}
