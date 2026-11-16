import { cn } from '@/lib/utils';

type DeviceKind = 'phone' | 'tablet' | 'laptop';

interface DeviceFrameProps {
    kind: DeviceKind;
    src: string;
    alt: string;
    className?: string;
    screenClassName?: string;
    priority?: boolean;
}

/* Reine CSS-Geräte: gerade, ohne Neigung, mit randlosem Screenshot.
   Die Bildfläche ist absichtlich oben ausgerichtet, damit App-Köpfe lesbar bleiben. */
export function DeviceFrame({ kind, src, alt, className, screenClassName, priority = false }: DeviceFrameProps) {
    const image = (
        <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
        />
    );

    if (kind === 'laptop') {
        return (
            <div className={cn('relative', className)}>
                <div className="relative rounded-[1.35rem] border-[7px] border-zinc-900 bg-zinc-900 shadow-[0_30px_60px_-24px_rgba(24,24,27,0.55)]">
                    <div className={cn('relative aspect-[16/10] overflow-hidden rounded-[0.7rem] bg-white', screenClassName)}>
                        {image}
                    </div>
                    <span aria-hidden className="absolute left-1/2 top-[3px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-700" />
                </div>
                <div aria-hidden className="mx-auto h-3 w-[112%] -translate-x-[5.35%] rounded-b-[1rem] border-x-[7px] border-b-[6px] border-zinc-900 bg-zinc-800 shadow-[0_18px_30px_-18px_rgba(24,24,27,0.5)]">
                    <span className="mx-auto block h-1 w-[14%] rounded-b-full bg-zinc-600" />
                </div>
            </div>
        );
    }

    if (kind === 'tablet') {
        return (
            <div className={cn('relative rounded-[2rem] border-[8px] border-zinc-900 bg-zinc-900 shadow-[0_30px_60px_-24px_rgba(24,24,27,0.55)]', className)}>
                <div className={cn('relative aspect-[820/1180] overflow-hidden rounded-[1.35rem] bg-white', screenClassName)}>
                    {image}
                </div>
                <span aria-hidden className="absolute left-1/2 top-[3px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-700" />
            </div>
        );
    }

    return (
        <div className={cn('relative rounded-[1.6rem] border-[4px] border-zinc-900 bg-zinc-900 shadow-[0_30px_60px_-24px_rgba(24,24,27,0.55)] sm:rounded-[2.6rem] sm:border-[7px]', className)}>
            <div className={cn('relative aspect-[390/844] overflow-hidden rounded-[1.25rem] bg-white sm:rounded-[2.05rem]', screenClassName)}>
                {image}
                <span aria-hidden className="absolute left-1/2 top-1 z-10 h-3 w-[30%] -translate-x-1/2 rounded-full bg-zinc-900 sm:top-2 sm:h-5 sm:w-[32%]" />
            </div>
            <span aria-hidden className="absolute bottom-[4px] left-1/2 h-1 w-[28%] -translate-x-1/2 rounded-full bg-zinc-900/50 sm:bottom-[6px]" />
        </div>
    );
}
