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
    if (inline) {
        if (parts.unit) return `/ ${parts.unit}`;
        if (parts.mode === 'vb') return '· Verhandelbar';
        // Kostenlos und fehlende Preise sind in der engen Zeile selbsterklärend.
        return null;
    }
    if (parts.unit) return `je ${parts.unit}`;
    if (parts.mode === 'free') return 'Ehrenamtlich';
    if (parts.mode === 'vb') return 'Verhandelbar';
    if (parts.label === 'Preis auf Anfrage') return 'Noch offen';
    return 'Auf Anfrage';
}

/** Farbe der großen Zeile; Flächen und Rahmen gibt es bewusst keine. */
const PRIMARY_CLASS: Record<string, string> = {
    fixed: 'text-foreground',
    vb: 'text-pastel-orange-foreground',
    free: 'text-pastel-mint-foreground',
    missing: 'text-muted-foreground',
};

/** Die zweite Zeile bleibt kleiner; Orange und Mint tragen den Ton mit. */
const SECONDARY_CLASS: Record<string, string> = {
    fixed: 'text-muted-foreground',
    vb: 'text-pastel-orange-foreground',
    free: 'text-pastel-mint-foreground',
    missing: 'text-muted-foreground',
};

/**
 * Preis-Baustein ohne Karte, Rahmen oder Schatten: Der Betrag steht frei und
 * groß rechtsbündig, die Einheit darunter. Festpreise in kräftiger
 * Vordergrundfarbe, Verhandlungsbasis in Orange, „Kostenlos“ in Mint und
 * fehlende Preise gedämpft. Für Screenreader gilt der kanonische
 * formatAdPrice-Text.
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
    const isMissing = parts.mode === 'fixed' && parts.unit === null;
    const tone = isMissing ? 'missing' : parts.mode;

    return (
        <span
            data-slot="price-tag"
            data-price-mode={tone}
            data-layout={layout}
            className={cn(
                'inline-flex min-w-0 shrink-0 select-none',
                isInline
                    ? 'items-baseline gap-1.5 text-left'
                    : 'flex-col items-end gap-1 text-right',
                className
            )}
            {...props}
        >
            <span className="sr-only">{parts.label}</span>
            <span
                aria-hidden="true"
                className={cn(
                    'whitespace-nowrap font-extrabold leading-none tracking-[-0.04em] tabular-nums',
                    isInline
                        ? 'text-[16px]'
                        : isMissing
                          ? 'text-[17px] leading-tight'
                          : 'text-[24px]',
                    PRIMARY_CLASS[tone] ?? PRIMARY_CLASS.missing
                )}
            >
                {parts.primary}
            </span>
            {secondary && (
                <span
                    aria-hidden="true"
                    className={cn(
                        'whitespace-nowrap text-[13px] font-medium leading-tight tabular-nums',
                        SECONDARY_CLASS[tone] ?? SECONDARY_CLASS.missing
                    )}
                >
                    {secondary}
                </span>
            )}
        </span>
    );
}
