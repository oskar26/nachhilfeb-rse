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
    if (parts.unit) return inline ? `/ ${parts.unit}` : `je ${parts.unit}`;
    if (parts.mode === 'free') return inline ? '· Ehrenamtlich' : 'Ehrenamtlich';
    if (parts.mode === 'vb') return inline ? '· Verhandelbar' : 'Verhandelbar';
    if (parts.label === 'Preis auf Anfrage') return inline ? '· Noch offen' : 'Noch offen';
    return inline ? '· Auf Anfrage' : 'Auf Anfrage';
}

const MODE_CLASS: Record<string, string> = {
    fixed: 'border-primary/45 bg-primary text-primary-foreground shadow-[0_3px_0_rgb(24_24_27_/_0.08)]',
    vb: 'border-border bg-card text-foreground shadow-[0_2px_0_rgb(24_24_27_/_0.04)]',
    free: 'border-pastel-mint/70 bg-pastel-mint text-pastel-mint-foreground',
    missing: 'border-border bg-muted text-muted-foreground',
};

/**
 * Preis-Baustein mit klarer linker Kante. Festpreise stehen als kräftige
 * gelbe Fahrkarte, Verhandlungsbasis als ruhige Karte und „Kostenlos“ als
 * mintfarbene Auszeichnung. Betrag und Einheit bleiben untereinander.
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
    const longLabel = parts.primary.length > 7;

    return (
        <span
            data-slot="price-tag"
            data-price-mode={parts.mode}
            data-layout={layout}
            className={cn(
                'inline-flex shrink-0 select-none overflow-hidden border text-left',
                MODE_CLASS[parts.mode] ?? MODE_CLASS.missing,
                isInline
                    ? 'items-baseline gap-1.5 rounded-lg px-2.5 py-1'
                    : 'min-w-[5.75rem] flex-col items-start gap-1.5 rounded-xl px-3 py-2',
                className
            )}
            {...props}
        >
            <span className="sr-only">{parts.label}</span>
            <span
                aria-hidden="true"
                className={cn(
                    'font-extrabold leading-none tracking-[-0.035em] tabular-nums',
                    isInline
                        ? 'text-[15px]'
                        : longLabel
                          ? 'text-[15px] leading-tight'
                          : 'text-[21px]'
                )}
            >
                {parts.primary}
            </span>
            <span
                aria-hidden="true"
                className={cn(
                    'font-medium leading-tight tabular-nums',
                    isInline ? 'text-xs' : 'text-[13px]',
                    parts.mode === 'fixed'
                        ? 'text-primary-foreground/80'
                        : 'opacity-80'
                )}
            >
                {secondary}
            </span>
        </span>
    );
}
