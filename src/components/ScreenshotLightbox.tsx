import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

export interface ScreenshotLightboxItem {
    src: string;
    alt: string;
    caption: string;
    index?: string;
}

interface ScreenshotLightboxProps {
    items: ScreenshotLightboxItem[];
    open: boolean;
    index: number;
    onIndexChange: (index: number) => void;
    onClose: () => void;
}

/* Lightbox für Screenshots: baut auf dem Dialog auf und ergänzt
   Pfeil-Navigation, Zähler und Bildunterschrift. */
export default function ScreenshotLightbox({ items, open, index, onIndexChange, onClose }: ScreenshotLightboxProps) {
    const count = items.length;
    const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
    const item = items[safeIndex];
    const closeRef = useRef<HTMLButtonElement>(null);

    const step = useCallback((delta: number) => {
        if (count < 2) return;
        onIndexChange((safeIndex + delta + count) % count);
    }, [count, safeIndex, onIndexChange]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') step(-1);
            if (e.key === 'ArrowRight') step(1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, step]);

    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        /* Nachbarbilder vorladen, damit die Pfeile ohne Ladepause springen. */
        [safeIndex - 1, safeIndex + 1].forEach((n) => {
            const neighbor = items[((n % count) + count) % count];
            if (neighbor) {
                const img = new Image();
                img.src = neighbor.src;
            }
        });
    }, [open, safeIndex, count, items]);

    if (!item) return null;

    const navButton = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent className="max-w-5xl border-border bg-background p-4 text-foreground sm:max-w-5xl sm:p-6" aria-label="Screenshot-Galerie">
                <DialogTitle className="sr-only">Screenshot-Galerie</DialogTitle>
                <DialogDescription className="sr-only">
                    Vergrößerte Ansicht der App-Screenshots mit Pfeiltasten-Navigation.
                </DialogDescription>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {String(safeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                    </span>
                    <Button variant="unstyled" size="unstyled"
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Galerie schließen"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X size={18} aria-hidden />
                    </Button>
                </div>

                <img
                    src={item.src}
                    alt={item.alt}
                    className="mx-auto mt-4 h-auto max-h-[68vh] w-auto max-w-full rounded-xl border border-border"
                />

                <div className="mt-4 flex items-center justify-between gap-3 sm:gap-4">
                    <Button variant="unstyled" size="unstyled" type="button" onClick={() => step(-1)} aria-label="Vorheriges Bild" disabled={count < 2} className={navButton}>
                        <ChevronLeft size={20} aria-hidden />
                    </Button>
                    <p className="flex min-w-0 flex-1 flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 text-center">
                        {item.index && <span className="text-xs font-medium tabular-nums text-muted-foreground">{item.index}</span>}
                        <span className="text-sm font-medium text-foreground">{item.caption}</span>
                    </p>
                    <Button variant="unstyled" size="unstyled" type="button" onClick={() => step(1)} aria-label="Nächstes Bild" disabled={count < 2} className={navButton}>
                        <ChevronRight size={20} aria-hidden />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
