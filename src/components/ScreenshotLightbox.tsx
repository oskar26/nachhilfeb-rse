import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/Dialog';

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

/* Lightbox für die Desktop-Prints an der Plakatwand: baut auf dem vorhandenen
   Dialog auf (Portal, ESC, Scroll-Lock, aria-modal) und ergänzt Pfeil-Navigation,
   Zähler und Bildunterschrift im board-caption-Look. */
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

    const navButton = 'press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-gray-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40';

    return (
        <Dialog open={open} onClose={onClose} panelClassName="max-w-5xl" ariaLabel="Screenshot-Galerie">
            <DialogContent className="border-white/10 bg-gray-950 p-4 text-white sm:p-6">
                <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs font-bold tabular-nums text-gray-400">
                        {String(safeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                    </span>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Galerie schließen"
                        className="press inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <X size={18} aria-hidden />
                    </button>
                </div>

                <img
                    src={item.src}
                    alt={item.alt}
                    className="mx-auto mt-4 h-auto max-h-[68vh] w-auto max-w-full rounded-2xl"
                />

                <div className="mt-4 flex items-center justify-between gap-3 sm:gap-4">
                    <button type="button" onClick={() => step(-1)} aria-label="Vorheriges Bild" disabled={count < 2} className={navButton}>
                        <ChevronLeft size={20} aria-hidden />
                    </button>
                    <p className="flex min-w-0 flex-1 flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 text-center">
                        {item.index && <span className="font-mono text-xs font-bold tabular-nums text-primary">{item.index}</span>}
                        <span className="board-caption text-sm font-bold">{item.caption}</span>
                    </p>
                    <button type="button" onClick={() => step(1)} aria-label="Nächstes Bild" disabled={count < 2} className={navButton}>
                        <ChevronRight size={20} aria-hidden />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
